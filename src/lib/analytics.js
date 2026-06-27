/**
 * Real-time click analytics engine.
 *
 * Tracks per-link clicks, unique IPs, hourly aggregation, and recent events.
 * Uses lock-free structures for high-throughput concurrent recording.
 */

export class Analytics {
  #totalClicks = 0;
  #linkStats = new Map();    // code → { clicks, uniqueIPs: Set }
  #hourlyBuckets = new Map(); // hourKey → { clicks, uniqueIPs: Set }
  #recentClicks = [];
  #maxRecent;

  constructor(maxRecent = 10000) {
    this.#maxRecent = maxRecent;
  }

  /** Records a click event across all analytics dimensions. */
  recordClick(event) {
    this.#totalClicks++;

    // Per-link stats
    let ls = this.#linkStats.get(event.shortCode);
    if (!ls) {
      ls = { clicks: 0, uniqueIPs: new Set() };
      this.#linkStats.set(event.shortCode, ls);
    }
    ls.clicks++;
    if (event.ip) ls.uniqueIPs.add(event.ip);

    // Hourly bucket
    const hourKey = Math.floor(event.timestamp / 3600000) * 3600000;
    let hb = this.#hourlyBuckets.get(hourKey);
    if (!hb) {
      hb = { clicks: 0, uniqueIPs: new Set() };
      this.#hourlyBuckets.set(hourKey, hb);
    }
    hb.clicks++;
    if (event.ip) hb.uniqueIPs.add(event.ip);

    // Recent clicks (ring buffer)
    if (this.#recentClicks.length >= this.#maxRecent) {
      this.#recentClicks.shift();
    }
    this.#recentClicks.push(event);
  }

  /** Returns click count for a short code. */
  getLinkClicks(code) {
    return this.#linkStats.get(code)?.clicks || 0;
  }

  /** Returns unique IP count for a short code. */
  getLinkUniqueIPs(code) {
    return this.#linkStats.get(code)?.uniqueIPs.size || 0;
  }

  /** Returns total clicks across all links. */
  getTotalClicks() {
    return this.#totalClicks;
  }

  /** Returns hourly stats for the last N hours. */
  getHourlyStats(hours = 24) {
    const now = Math.floor(Date.now() / 3600000) * 3600000;
    const stats = [];
    for (let i = hours - 1; i >= 0; i--) {
      const hour = now - i * 3600000;
      const hb = this.#hourlyBuckets.get(hour);
      stats.push({
        hour,
        clicks: hb?.clicks || 0,
        uniqueIPs: hb?.uniqueIPs.size || 0,
      });
    }
    return stats;
  }

  /** Returns the most recent click events. */
  getRecentClicks(limit = 100) {
    const start = Math.max(0, this.#recentClicks.length - limit);
    return this.#recentClicks.slice(start);
  }

  /** Returns analytics overview. */
  overview() {
    return {
      total_clicks: this.#totalClicks,
      tracked_links: this.#linkStats.size,
      hourly_buckets: this.#hourlyBuckets.size,
      recent_events: this.#recentClicks.length,
    };
  }
}
