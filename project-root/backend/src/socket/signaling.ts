import type { Server, Socket } from "socket.io";
import type { Matchmaker } from "../matchmaking/matcher";
import type {
  ClientToServerEvents,
  RTCIceCandidateLike,
  RTCSessionDescriptionLike,
  ServerToClientEvents,
} from "../types";
import { logger } from "../utils/logger";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * The server never inspects or stores SDP/ICE payloads - it is a dumb relay
 * between exactly the two members of a room. All actual media stays
 * peer-to-peer once ICE negotiation completes.
 */
export function registerSignalingHandlers(
  socket: AppSocket,
  io: AppServer,
  matchmaker: Matchmaker
): void {
  const relay = <T>(eventName: "offer" | "answer" | "ice-candidate", payload: T): void => {
    const room = matchmaker.getRoomForSocket(socket.id);
    if (!room) {
      logger.debug("signaling event with no active room, dropping", { event: eventName, socketId: socket.id });
      return;
    }
    const partnerId = room.memberIds.find((id) => id !== socket.id);
    if (!partnerId) return;
    io.to(partnerId).emit(eventName, payload as never);
  };

  socket.on("offer", (payload: { sdp: RTCSessionDescriptionLike }) => {
    if (!payload?.sdp || typeof payload.sdp.type !== "string") return;
    relay("offer", payload);
  });

  socket.on("answer", (payload: { sdp: RTCSessionDescriptionLike }) => {
    if (!payload?.sdp || typeof payload.sdp.type !== "string") return;
    relay("answer", payload);
  });

  socket.on("ice-candidate", (payload: { candidate: RTCIceCandidateLike }) => {
    if (!payload?.candidate || typeof payload.candidate.candidate !== "string") return;
    relay("ice-candidate", payload);
  });
}
