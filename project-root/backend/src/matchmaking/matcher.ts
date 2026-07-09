import { randomUUID } from "crypto";
import { WaitingQueue } from "./queue";
import type { ChatRoom, SessionUser } from "../types";
import { logger } from "../utils/logger";

const RECENT_PARTNER_MEMORY = 5;

export interface MatchResult {
  room: ChatRoom;
  initiatorId: string; // who creates the WebRTC offer
  receiverId: string;
}

/**
 * Owns the waiting queue plus the bookkeeping needed to avoid:
 *  - self-matching (impossible by construction - a socket never matches itself)
 *  - duplicate/back-to-back matching with the same partner
 *  - matching a socket that has already disconnected (stale entries)
 */
export class Matchmaker {
  private readonly queue = new WaitingQueue();
  private readonly rooms = new Map<string, ChatRoom>();
  private readonly roomBySocket = new Map<string, string>();

  enqueue(socketId: string): void {
    this.queue.enqueue(socketId);
  }

  removeFromQueue(socketId: string): void {
    this.queue.remove(socketId);
  }

  isQueued(socketId: string): boolean {
    return this.queue.has(socketId);
  }

  queueSize(): number {
    return this.queue.size();
  }

  activeRoomsCount(): number {
    return this.rooms.size;
  }

  getQueueSnapshot(): readonly string[] {
    return this.queue.snapshot();
  }

  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomForSocket(socketId: string): ChatRoom | undefined {
    const roomId = this.roomBySocket.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Attempts to pair `socketId` with the longest-waiting compatible partner
   * currently in the queue. `getUser` lets the caller resolve full session
   * state (e.g. recentPartnerIds, liveness) without this module owning it.
   */
  attemptMatch(
    socketId: string,
    getUser: (id: string) => SessionUser | undefined,
    isSocketLive: (id: string) => boolean
  ): MatchResult | null {
    if (!this.queue.has(socketId)) return null;

    const candidates = this.queue.snapshot().filter((id) => id !== socketId);
    if (candidates.length === 0) return null;

    const self = getUser(socketId);

    // Prefer a candidate we haven't *just* talked to; fall back to anyone
    // live if every candidate happens to be a recent partner (avoids
    // starvation when the pool of online strangers is small).
    let chosen: string | undefined;
    for (const candidateId of candidates) {
      if (!isSocketLive(candidateId)) {
        this.queue.remove(candidateId);
        continue; // skip stale/disconnected entries and clean them up
      }
      const candidateUser = getUser(candidateId);
      const wasRecentPartner = self?.recentPartnerIds.has(candidateId) ?? false;
      if (!wasRecentPartner) {
        chosen = candidateId;
        break;
      }
      if (!chosen && candidateUser) chosen = candidateId; // fallback candidate
    }

    if (!chosen) return null;

    // Pull both out of the queue atomically.
    this.queue.remove(socketId);
    this.queue.remove(chosen);

    const roomId = randomUUID();
    const room: ChatRoom = {
      id: roomId,
      memberIds: [socketId, chosen],
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.roomBySocket.set(socketId, roomId);
    this.roomBySocket.set(chosen, roomId);

    // Record both directions so neither side gets immediately re-matched.
    self?.recentPartnerIds.add(chosen);
    const otherUser = getUser(chosen);
    otherUser?.recentPartnerIds.add(socketId);
    trimRecentPartners(self);
    trimRecentPartners(otherUser);

    logger.info("matched", { roomId, a: socketId, b: chosen });

    // Deterministic-but-arbitrary initiator choice: lower socket id offers first.
    const initiatorId = socketId < chosen ? socketId : chosen;
    const receiverId = initiatorId === socketId ? chosen : socketId;

    return { room, initiatorId, receiverId };
  }

  /** Tears down a room and returns the partner id of `socketId`, if any. */
  leaveRoom(socketId: string): string | undefined {
    const roomId = this.roomBySocket.get(socketId);
    if (!roomId) return undefined;
    const room = this.rooms.get(roomId);
    this.rooms.delete(roomId);
    if (!room) return undefined;

    const [a, b] = room.memberIds;
    this.roomBySocket.delete(a);
    this.roomBySocket.delete(b);

    return a === socketId ? b : a;
  }
}

function trimRecentPartners(user: SessionUser | undefined): void {
  if (!user) return;
  if (user.recentPartnerIds.size <= RECENT_PARTNER_MEMORY) return;
  const overflow = user.recentPartnerIds.size - RECENT_PARTNER_MEMORY;
  const it = user.recentPartnerIds.values();
  for (let i = 0; i < overflow; i++) {
    const value = it.next().value;
    if (value !== undefined) user.recentPartnerIds.delete(value);
  }
}
