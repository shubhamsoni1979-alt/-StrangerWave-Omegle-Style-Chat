import type { Server, Socket } from "socket.io";
import type { Matchmaker } from "../matchmaking/matcher";
import type { ClientToServerEvents, ServerToClientEvents } from "../types";
import { RateLimiter } from "../middleware/rateLimit";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH ?? 500);

/**
 * Strips control/markup characters defensively. The frontend renders
 * messages as text (never innerHTML), so this is belt-and-suspenders against
 * any future rendering change, plus protection for any other consumer of
 * this event (logging, moderation tooling, etc).
 */
function sanitizeText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // strip control chars
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

export function registerChatHandlers(
  socket: AppSocket,
  io: AppServer,
  matchmaker: Matchmaker,
  messageLimiter: RateLimiter,
  typingLimiter: RateLimiter
): void {
  socket.on("send-message", (payload: { text: string }) => {
    if (!messageLimiter.consume(socket.id, "send-message")) {
      socket.emit("rate-limited", { event: "send-message", retryAfterMs: 2000 });
      return;
    }

    if (typeof payload?.text !== "string") return;
    const trimmed = payload.text.slice(0, MAX_MESSAGE_LENGTH);
    const clean = sanitizeText(trimmed);
    if (clean.length === 0) return;

    const room = matchmaker.getRoomForSocket(socket.id);
    if (!room) {
      socket.emit("error-message", { message: "You are not currently connected to a stranger." });
      return;
    }
    const partnerId = room.memberIds.find((id) => id !== socket.id);
    if (!partnerId) return;

    const out = { text: clean, at: Date.now() };
    io.to(partnerId).emit("receive-message", out);
  });

  socket.on("typing", (payload: { isTyping: boolean }) => {
    if (!typingLimiter.consume(socket.id, "typing")) return;
    const room = matchmaker.getRoomForSocket(socket.id);
    if (!room) return;
    const partnerId = room.memberIds.find((id) => id !== socket.id);
    if (!partnerId) return;
    io.to(partnerId).emit("typing", { isTyping: Boolean(payload?.isTyping) });
  });
}
