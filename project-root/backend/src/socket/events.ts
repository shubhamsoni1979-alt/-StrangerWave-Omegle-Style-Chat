import type { Server, Socket } from "socket.io";
import { Matchmaker } from "../matchmaking/matcher";
import { RateLimiter } from "../middleware/rateLimit";
import { registerSignalingHandlers } from "./signaling";
import { registerChatHandlers } from "./chat";
import { registerGroupHandlers } from "./group";
import type { ClientToServerEvents, ServerToClientEvents, SessionUser } from "../types";
import { logger } from "../utils/logger";

function generateUniqueUserId(users: Map<string, SessionUser>): string {
  let attempts = 0;
  while (attempts < 1000) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    let exists = false;
    for (const u of users.values()) {
      if (u.userId === code) {
        exists = true;
        break;
      }
    }
    if (!exists) return code;
    attempts++;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const FIND_PARTNER_LIMIT = Number(process.env.MAX_FIND_PARTNER_PER_10S ?? 10);
const MESSAGE_LIMIT = Number(process.env.MAX_MESSAGES_PER_10S ?? 15);
const QUEUE_MATCH_INTERVAL_MS = Number(process.env.QUEUE_MATCH_INTERVAL_MS ?? 300);
const STALE_SOCKET_TIMEOUT_MS = Number(process.env.STALE_SOCKET_TIMEOUT_MS ?? 15000);

let activeUserCount = 0;
let matchmakerInstance: Matchmaker | null = null;
let usersMap: Map<string, SessionUser> | null = null;

export function getActiveUserCount(): number {
  return activeUserCount;
}

export function getQueueSize(): number {
  return matchmakerInstance?.queueSize() ?? 0;
}

export function getActiveRoomsCount(): number {
  return matchmakerInstance?.activeRoomsCount() ?? 0;
}

export function getDebugInfo() {
  return {
    connectedSockets: usersMap?.size ?? 0,
    queued: matchmakerInstance?.queueSize() ?? 0,
    inRooms: (matchmakerInstance?.activeRoomsCount() ?? 0) * 2,
    matcherRunning: true,
  };
}

export function registerSocketServer(io: AppServer): void {
  const matchmaker = new Matchmaker();
  matchmakerInstance = matchmaker;
  const users = new Map<string, SessionUser>();
  usersMap = users;
  const groupRooms = new Map<string, { code: string; memberIds: string[] }>();
  const userIdToSocketId = new Map<string, string>();

  // Add connection error logging
  io.on("connection_error", (err) => {
    logger.error("Socket.io connection error:", {
      message: err.message,
      context: err.context,
    });
  });

  function updateActiveUserCount(): void {
    activeUserCount = users.size;
    io.emit("online-count", { count: activeUserCount });
  }

  const findPartnerLimiter = new RateLimiter(FIND_PARTNER_LIMIT, 10_000);
  const messageLimiter = new RateLimiter(MESSAGE_LIMIT, 10_000);
  const typingLimiter = new RateLimiter(20, 10_000);

  const isSocketLive = (socketId: string): boolean => io.sockets.sockets.has(socketId);

  const touch = (socketId: string): void => {
    const user = users.get(socketId);
    if (user) user.lastSeenAt = Date.now();
  };

  function tryMatchFor(socket: AppSocket): void {
    const result = matchmaker.attemptMatch(
      socket.id,
      (id) => users.get(id),
      isSocketLive
    );
    if (!result) return;

    const { room, initiatorId, receiverId } = result;
    const initiatorUser = users.get(initiatorId);
    const receiverUser = users.get(receiverId);
    if (initiatorUser) initiatorUser.roomId = room.id;
    if (receiverUser) receiverUser.roomId = room.id;

    io.to(initiatorId).emit("partner-found", {
      roomId: room.id,
      initiator: true,
      partner: {
        name: receiverUser?.name || "Stranger",
        country: receiverUser?.country || "Unknown",
        flag: receiverUser?.countryFlag || "🏳️",
      }
    });
    io.to(receiverId).emit("partner-found", {
      roomId: room.id,
      initiator: false,
      partner: {
        name: initiatorUser?.name || "Stranger",
        country: initiatorUser?.country || "Unknown",
        flag: initiatorUser?.countryFlag || "🏳️",
      }
    });

    // Also emit 'matched' event to both sockets as expected by manual DevTools/diagnostic tests
    io.to(initiatorId).emit("matched", {
      roomId: room.id,
      partnerId: receiverId,
      initiator: true,
      timestamp: Date.now()
    });
    io.to(receiverId).emit("matched", {
      roomId: room.id,
      partnerId: initiatorId,
      initiator: false,
      timestamp: Date.now()
    });
  }

  /** Backstop sweep: in case a queued partner only becomes matchable later
   *  (e.g. the only other waiting user was their immediate last partner). */
  const matchSweep = setInterval(() => {
    logger.debug(`Matcher sweep: ${matchmaker.queueSize()} in queue, attempting match`);
    const queuedIds = matchmaker.getQueueSnapshot();
    for (const socketId of queuedIds) {
      const socket = io.sockets.sockets.get(socketId) as AppSocket | undefined;
      if (socket) tryMatchFor(socket);
    }

    // Emit queue position updates to all users still in the queue
    const remainingQueuedIds = matchmaker.getQueueSnapshot();
    for (let i = 0; i < remainingQueuedIds.length; i++) {
      const socketId = remainingQueuedIds[i];
      io.to(socketId).emit("queue-status", {
        size: remainingQueuedIds.length,
        myPosition: i + 1,
      });
    }
  }, QUEUE_MATCH_INTERVAL_MS);

  /** Evicts sockets that stopped responding without a clean disconnect event. */
  const staleSweep = setInterval(() => {
    const now = Date.now();
    for (const [socketId, user] of users.entries()) {
      if (now - user.lastSeenAt > STALE_SOCKET_TIMEOUT_MS && !isSocketLive(socketId)) {
        cleanupUser(socketId);
        continue;
      }

      // Emit 'no-match-available' to sockets that have been queued for >30 seconds
      if (user.queuedAt && now - user.queuedAt > 30000) {
        if (matchmaker.isQueued(socketId)) {
          matchmaker.removeFromQueue(socketId);
          user.queuedAt = null;
          io.to(socketId).emit("no-match-available");
          logger.info("match timeout reached - emitted no-match-available", { socketId });
        }
      }
    }
  }, STALE_SOCKET_TIMEOUT_MS);

  function cleanupUser(socketId: string): void {
    const user = users.get(socketId);
    if (user) {
      userIdToSocketId.delete(user.userId);
    }
    matchmaker.removeFromQueue(socketId);
    const partnerId = matchmaker.leaveRoom(socketId);
    if (partnerId) {
      const partnerUser = users.get(partnerId);
      if (partnerUser) partnerUser.roomId = null;
      io.to(partnerId).emit("partner-left", { reason: "disconnect" });
    }
    users.delete(socketId);
    findPartnerLimiter.clear(socketId);
    messageLimiter.clear(socketId);
    typingLimiter.clear(socketId);
    updateActiveUserCount();
  }

  io.on("connection", (socket: AppSocket) => {
    const userId = generateUniqueUserId(users);
    users.set(socket.id, {
      socketId: socket.id,
      userId,
      roomId: null,
      queuedAt: null,
      lastSeenAt: Date.now(),
      recentPartnerIds: new Set(),
    });
    userIdToSocketId.set(userId, socket.id);
    logger.info("connected", {
      socketId: socket.id,
      userId,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers["user-agent"],
      time: new Date().toISOString(),
      total: users.size
    });

    socket.emit("user-id", { userId });
    updateActiveUserCount();

    registerSignalingHandlers(socket, io, matchmaker);
    registerChatHandlers(socket, io, matchmaker, messageLimiter, typingLimiter);
    registerGroupHandlers(socket, io, users, groupRooms, userIdToSocketId);

    socket.on("find-partner", (payload?: { name: string; country: string; flag: string }) => {
      touch(socket.id);
      if (!findPartnerLimiter.consume(socket.id, "find-partner")) {
        socket.emit("rate-limited", { event: "find-partner", retryAfterMs: 2000 });
        return;
      }
      // Already in a room or already queued - ignore duplicate requests.
      if (matchmaker.getRoomForSocket(socket.id) || matchmaker.isQueued(socket.id)) return;

      const user = users.get(socket.id);
      if (user) {
        user.queuedAt = Date.now();
        user.name = payload?.name?.trim() || "Stranger";
        user.country = payload?.country?.trim() || "Unknown";
        user.countryFlag = payload?.flag || "🏳️";
      }
      matchmaker.enqueue(socket.id);
      logger.info("find-partner requested", { socketId: socket.id, name: payload?.name, queueSize: matchmaker.queueSize() });
      socket.emit("queue-joined");
      tryMatchFor(socket);
      if (!matchmaker.getRoomForSocket(socket.id)) {
        logger.info("no match found", { socketId: socket.id, queueSize: matchmaker.queueSize() });
      }
    });

    socket.on("next-partner", () => {
      touch(socket.id);
      logger.info("next-partner requested", { socketId: socket.id });
      const partnerId = matchmaker.leaveRoom(socket.id);
      if (partnerId) {
        const partnerUser = users.get(partnerId);
        if (partnerUser) partnerUser.roomId = null;
        io.to(partnerId).emit("partner-left", { reason: "next" });
      }
      const user = users.get(socket.id);
      if (user) {
        user.roomId = null;
        user.queuedAt = Date.now();
      }
      matchmaker.enqueue(socket.id);
      socket.emit("queue-joined");
      tryMatchFor(socket);
    });

    socket.on("leave-chat", () => {
      touch(socket.id);
      logger.info("leave-chat requested", { socketId: socket.id });
      matchmaker.removeFromQueue(socket.id);
      const partnerId = matchmaker.leaveRoom(socket.id);
      if (partnerId) {
        const partnerUser = users.get(partnerId);
        if (partnerUser) partnerUser.roomId = null;
        io.to(partnerId).emit("partner-left", { reason: "left" });
      }
      const user = users.get(socket.id);
      if (user) {
        user.roomId = null;
        user.queuedAt = null;
      }
    });

    // Lets a user flag the stranger they were just paired with. There is no
    // moderation backend wired up here - this only ends the chat safely and
    // logs the report. A real deployment must connect this to a human
    // review/moderation pipeline before going live publicly.
    socket.on("report-partner", (payload: { reason: string }) => {
      touch(socket.id);
      const partnerId = matchmaker.leaveRoom(socket.id);
      logger.warn("partner reported", { reporter: socket.id, reported: partnerId, reason: payload?.reason });
      if (partnerId) {
        const partnerUser = users.get(partnerId);
        if (partnerUser) partnerUser.roomId = null;
        io.to(partnerId).emit("partner-left", { reason: "report" });
      }
      const user = users.get(socket.id);
      if (user) user.roomId = null;
    });

    socket.on("disconnect", (reason) => {
      logger.info("disconnected", { socketId: socket.id, reason });
      cleanupUser(socket.id);
    });
  });

  process.on("SIGTERM", () => {
    clearInterval(matchSweep);
    clearInterval(staleSweep);
  });
}
