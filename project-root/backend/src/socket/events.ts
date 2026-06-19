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
const QUEUE_MATCH_INTERVAL_MS = Number(process.env.QUEUE_MATCH_INTERVAL_MS ?? 500);
const STALE_SOCKET_TIMEOUT_MS = Number(process.env.STALE_SOCKET_TIMEOUT_MS ?? 30000);

export function registerSocketServer(io: AppServer): void {
  const matchmaker = new Matchmaker();
  const users = new Map<string, SessionUser>();
  const groupRooms = new Map<string, { code: string; memberIds: string[] }>();
  const userIdToSocketId = new Map<string, string>();

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

    io.to(initiatorId).emit("partner-found", { roomId: room.id, initiator: true });
    io.to(receiverId).emit("partner-found", { roomId: room.id, initiator: false });
  }

  /** Backstop sweep: in case a queued partner only becomes matchable later
   *  (e.g. the only other waiting user was their immediate last partner). */
  const matchSweep = setInterval(() => {
    const queuedIds = matchmaker.getQueueSnapshot();
    for (const socketId of queuedIds) {
      const socket = io.sockets.sockets.get(socketId) as AppSocket | undefined;
      if (socket) tryMatchFor(socket);
    }
  }, QUEUE_MATCH_INTERVAL_MS);

  /** Evicts sockets that stopped responding without a clean disconnect event. */
  const staleSweep = setInterval(() => {
    const now = Date.now();
    for (const [socketId, user] of users.entries()) {
      if (now - user.lastSeenAt > STALE_SOCKET_TIMEOUT_MS && !isSocketLive(socketId)) {
        cleanupUser(socketId);
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
    logger.info("connected", { socketId: socket.id, userId, total: users.size });

    socket.emit("user-id", { userId });

    registerSignalingHandlers(socket, io, matchmaker);
    registerChatHandlers(socket, io, matchmaker, messageLimiter, typingLimiter);
    registerGroupHandlers(socket, io, users, groupRooms, userIdToSocketId);

    socket.on("find-partner", () => {
      touch(socket.id);
      if (!findPartnerLimiter.consume(socket.id, "find-partner")) {
        socket.emit("rate-limited", { event: "find-partner", retryAfterMs: 2000 });
        return;
      }
      // Already in a room or already queued - ignore duplicate requests.
      if (matchmaker.getRoomForSocket(socket.id) || matchmaker.isQueued(socket.id)) return;

      const user = users.get(socket.id);
      if (user) user.queuedAt = Date.now();
      matchmaker.enqueue(socket.id);
      socket.emit("queue-joined");
      tryMatchFor(socket);
    });

    socket.on("next-partner", () => {
      touch(socket.id);
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
