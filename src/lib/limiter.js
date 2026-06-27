/**
 * Rate limiter with multiple strategies.
 *
 * - Token Bucket: smooth rate limiting with burst capacity
 * - Sliding Window: precise request counting within a rolling window
 * - Fixed Window: simple counting within fixed time intervals
 */

export const Strategy = {
  TOKEN_BUCKET: 'token_bucket',
  SLIDING_WINDOW: 'sliding_window',
  FIXED_WINDOW: 'fixed_window',
};

export class Limiter {
  #strategy;
  #limit;
  #windowMs;
  #buckets = new Map();   // key → bucket state
  #cleanupTimer;

  constructor(strategy = Strategy.TOKEN_BUCKET, limit = 100, windowMs = 60000) {
    this.#strategy = strategy;
    this.#limit = limit;
    this.#windowMs = windowMs;

    // Periodic cleanup every 5 minutes
    this.#cleanupTimer = setInterval(() => this.#cleanup(), 300000);
    if (this.#cleanupTimer.unref) this.#cleanupTimer.unref();
  }

  /** Checks if a request from the given key should be allowed. */
  allow(key) {
    switch (this.#strategy) {
      case Strategy.TOKEN_BUCKET: return this.#allowTokenBucket(key);
      case Strategy.SLIDING_WINDOW: return this.#allowSlidingWindow(key);
      case Strategy.FIXED_WINDOW: return this.#allowFixedWindow(key);
      default: return this.#allowTokenBucket(key);
    }
  }

  #allowTokenBucket(key) {
    const now = Date.now();
    let b = this.#buckets.get(key);

    if (!b) {
      b = {
        tokens: this.#limit,
        maxTokens: this.#limit,
        refillRate: this.#limit / (this.#windowMs / 1000),
        lastRefill: now,
      };
      this.#buckets.set(key, b);
    }

    // Refill tokens
    const elapsed = (now - b.lastRefill) / 1000;
    b.tokens = Math.min(b.maxTokens, b.tokens + elapsed * b.refillRate);
    b.lastRefill = now;

    if (b.tokens >= 1) {
      b.tokens--;
      return true;
    }
    return false;
  }

  #allowSlidingWindow(key) {
    const now = Date.now();
    const windowStart = now - this.#windowMs;

    let v = this.#buckets.get(key);
    if (!v) {
      v = { timestamps: [] };
      this.#buckets.set(key, v);
    }

    // Remove expired entries
    v.timestamps = v.timestamps.filter(t => t > windowStart);

    if (v.timestamps.length >= this.#limit) {
      return false;
    }

    v.timestamps.push(now);
    return true;
  }

  #allowFixedWindow(key) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.#windowMs) * this.#windowMs;

    let v = this.#buckets.get(key);
    if (!v || v.windowStart !== windowStart) {
      v = { windowStart, count: 0 };
      this.#buckets.set(key, v);
    }

    if (v.count >= this.#limit) {
      return false;
    }

    v.count++;
    return true;
  }

  #cleanup() {
    const now = Date.now();
    for (const [key, val] of this.#buckets) {
      if (val.lastRefill && now - val.lastRefill > this.#windowMs * 2) {
        this.#buckets.delete(key);
      }
      if (val.timestamps && val.timestamps.length === 0) {
        this.#buckets.delete(key);
      }
    }
  }

  /** Returns limiter statistics. */
  stats() {
    return {
      strategy: this.#strategy,
      limit: this.#limit,
      window_ms: this.#windowMs,
      active_keys: this.#buckets.size,
    };
  }

  /** Returns an Express-compatible middleware. */
  middleware() {
    return (req, res, next) => {
      const key = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
      if (!this.allow(key)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
        return;
      }
      next();
    };
  }

  destroy() {
    if (this.#cleanupTimer) clearInterval(this.#cleanupTimer);
  }
}
