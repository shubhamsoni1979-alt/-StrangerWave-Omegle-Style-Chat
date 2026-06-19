import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, SessionUser, RTCSessionDescriptionLike, RTCIceCandidateLike } from "../types";
import { logger } from "../utils/logger";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerGroupHandlers(
  socket: AppSocket,
  io: AppServer,
  users: Map<string, SessionUser>,
  groupRooms: Map<string, { code: string; memberIds: string[] }>
): void {
  
  socket.on("join-group-room", (payload: { roomCode: string }) => {
    const rawCode = payload?.roomCode?.trim();
    if (!rawCode) {
      socket.emit("error-message", { message: "Invalid room code." });
      return;
    }

    // A room code can be a 6-digit User ID of a friend, OR a custom room code.
    const roomCode = rawCode;

    let room = groupRooms.get(roomCode);
    if (!room) {
      room = { code: roomCode, memberIds: [] };
      groupRooms.set(roomCode, room);
    }

    if (room.memberIds.includes(socket.id)) {
      // Already in this room, no-op
      return;
    }

    if (room.memberIds.length >= 4) {
      socket.emit("error-message", { message: "This room is full (maximum 4 participants)." });
      return;
    }

    // Leave any other group rooms they might be in
    leaveAllGroupRooms(socket, io, groupRooms);

    // Join this group room
    room.memberIds.push(socket.id);
    socket.join(roomCode);

    // Notify other members
    const selfUser = users.get(socket.id);
    const selfUserId = selfUser?.userId ?? "";
    socket.to(roomCode).emit("user-joined-group", { socketId: socket.id, userId: selfUserId });

    // Send the list of current members in this room to the joining member
    const membersList = room.memberIds
      .filter(id => id !== socket.id)
      .map(id => ({
        socketId: id,
        userId: users.get(id)?.userId ?? ""
      }));
    
    socket.emit("group-room-members", { members: membersList });
    logger.info("user joined group room", { roomCode, socketId: socket.id, totalMembers: room.memberIds.length });
  });

  socket.on("leave-group-room", () => {
    leaveAllGroupRooms(socket, io, groupRooms);
  });

  // Mesh signaling events - relaying to a specific target peer socket in the room
  socket.on("group-offer", (payload: { to: string; sdp: RTCSessionDescriptionLike }) => {
    io.to(payload.to).emit("group-offer", { from: socket.id, sdp: payload.sdp });
  });

  socket.on("group-answer", (payload: { to: string; sdp: RTCSessionDescriptionLike }) => {
    io.to(payload.to).emit("group-answer", { from: socket.id, sdp: payload.sdp });
  });

  socket.on("group-ice-candidate", (payload: { to: string; candidate: RTCIceCandidateLike }) => {
    io.to(payload.to).emit("group-ice-candidate", { from: socket.id, candidate: payload.candidate });
  });

  socket.on("send-group-message", (payload: { text: string }) => {
    if (typeof payload?.text !== "string" || payload.text.trim().length === 0) return;
    
    // Find which room this socket is in
    let currentRoomCode: string | null = null;
    for (const [code, room] of groupRooms.entries()) {
      if (room.memberIds.includes(socket.id)) {
        currentRoomCode = code;
        break;
      }
    }

    if (!currentRoomCode) {
      socket.emit("error-message", { message: "You are not in a group room." });
      return;
    }

    const selfUser = users.get(socket.id);
    const selfUserId = selfUser?.userId ?? "";
    
    // Broadcast to everyone in the room (including sender)
    io.to(currentRoomCode).emit("receive-group-message", {
      fromSocketId: socket.id,
      fromUserId: selfUserId,
      text: payload.text.trim(),
      at: Date.now()
    });
  });

  // Handle cleanups on disconnect
  socket.on("disconnect", () => {
    leaveAllGroupRooms(socket, io, groupRooms);
  });
}

function leaveAllGroupRooms(
  socket: AppSocket,
  io: AppServer,
  groupRooms: Map<string, { code: string; memberIds: string[] }>
): void {
  for (const [code, room] of groupRooms.entries()) {
    if (room.memberIds.includes(socket.id)) {
      // Remove from room
      room.memberIds = room.memberIds.filter(id => id !== socket.id);
      socket.leave(code);
      
      // Notify remaining members
      io.to(code).emit("user-left-group", { socketId: socket.id });
      logger.info("user left group room", { roomCode: code, socketId: socket.id });

      // Clean up empty rooms
      if (room.memberIds.length === 0) {
        groupRooms.delete(code);
      }
    }
  }
}
