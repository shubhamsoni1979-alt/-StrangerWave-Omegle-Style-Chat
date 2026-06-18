/**
 * In-memory matchmaking queue.
 *
 * Deliberately just an array + a Set for O(1) membership checks. There is no
 * persistence by design (per spec: no database, no Redis) - if the process
 * restarts, everyone simply re-queues, which is a fine tradeoff for an
 * anonymous, sessionless chat app.
 */

export class WaitingQueue {
  private readonly order: string[] = [];
  private readonly membership = new Set<string>();

  /** Adds a socket id to the back of the queue. No-op if already queued. */
  enqueue(socketId: string): void {
    if (this.membership.has(socketId)) return;
    this.order.push(socketId);
    this.membership.add(socketId);
  }

  /** Removes a socket id from the queue, wherever it is. No-op if absent. */
  remove(socketId: string): void {
    if (!this.membership.has(socketId)) return;
    this.membership.delete(socketId);
    const idx = this.order.indexOf(socketId);
    if (idx !== -1) this.order.splice(idx, 1);
  }

  has(socketId: string): boolean {
    return this.membership.has(socketId);
  }

  size(): number {
    return this.order.length;
  }

  /** Returns a snapshot of the current queue order (oldest first). */
  snapshot(): readonly string[] {
    return [...this.order];
  }

  /** Pops the longest-waiting socket id off the front. Returns undefined if empty. */
  dequeue(): string | undefined {
    const next = this.order.shift();
    if (next !== undefined) this.membership.delete(next);
    return next;
  }
}
