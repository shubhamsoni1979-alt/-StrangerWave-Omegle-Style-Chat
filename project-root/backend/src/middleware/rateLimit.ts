/**
 * Simple in-memory sliding-window rate limiter, keyed by socket id + event
 * name. No external store - state is small (a handful of timestamps per
 * active socket) and naturally garbage collected when sockets disconnect.
 */

interface Bucket {
  timestamps: number[];
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number
  ) {}

  private key(socketId: string, event: string): string {
    return `${socketId}::${event}`;
  }

  /** Returns true if the call is allowed, false if it should be dropped/limited. */
  consume(socketId: string, event: string): boolean {
    const k = this.key(socketId, event);
    const now = Date.now();
    const bucket = this.buckets.get(k) ?? { timestamps: [] };

    bucket.timestamps = bucket.timestamps.filter((t) => now - t < this.windowMs);

    if (bucket.timestamps.length >= this.maxEvents) {
      this.buckets.set(k, bucket);
      return false;
    }

    bucket.timestamps.push(now);
    this.buckets.set(k, bucket);
    return true;
  }

  /** Call on disconnect to avoid unbounded growth of the bucket map. */
  clear(socketId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${socketId}::`)) this.buckets.delete(key);
    }
  }
}
