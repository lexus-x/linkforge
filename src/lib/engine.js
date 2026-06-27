/**
 * Core shortener engine.
 *
 * Manages link creation, resolution, deletion, and deduplication.
 * Uses dual in-memory indexes (code→link, url→link) for O(1) operations.
 */

import { URL } from 'node:url';
import { Snowflake } from './snowflake.js';
import { Base62Encoder } from './encoder.js';

const RESERVED_CODES = new Set([
  'api', 'admin', 'health', 'static', 'dashboard', 'qr',
  'login', 'logout', 'register', 'settings', 'about',
  'help', 'faq', 'terms', 'privacy', 'contact',
]);

export class Engine {
  #snowflake;
  #encoder;
  #codeIndex = new Map();  // code → link
  #urlIndex = new Map();   // url → link
  #maxUrlLen;

  constructor({ datacenterId = 1, workerId = 1, encoder = null, maxUrlLen = 2048 } = {}) {
    this.#snowflake = new Snowflake(datacenterId, workerId);
    this.#encoder = encoder || new Base62Encoder();
    this.#maxUrlLen = maxUrlLen;
  }

  /**
   * Creates a short code for the given URL.
   * Returns existing link if URL was already shortened (dedup).
   */
  shorten(longUrl, customCode = '') {
    longUrl = longUrl.trim();
    if (!longUrl) throw new Error('URL cannot be empty');
    if (longUrl.length > this.#maxUrlLen) throw new Error('URL exceeds maximum length');

    // Normalize
    if (!longUrl.startsWith('http://') && !longUrl.startsWith('https://')) {
      longUrl = 'https://' + longUrl;
    }

    let parsed;
    try {
      parsed = new URL(longUrl);
    } catch {
      throw new Error('Invalid URL');
    }
    if (!parsed.hostname) throw new Error('Invalid URL');

    // Dedup check
    const existing = this.#urlIndex.get(longUrl);
    if (existing) return existing;

    let code;
    if (customCode) {
      if (RESERVED_CODES.has(customCode)) {
        throw new Error('Short code is reserved');
      }
      if (this.#codeIndex.has(customCode)) {
        throw new Error('Custom code already taken');
      }
      code = customCode;
    } else {
      const id = this.#snowflake.nextId();
      code = this.#encoder.encode(id);
    }

    const link = {
      shortCode: code,
      longUrl,
      createdAt: Date.now(),
      clicks: 0,
      domain: parsed.hostname,
    };

    this.#codeIndex.set(code, link);
    this.#urlIndex.set(longUrl, link);
    return link;
  }

  /** Resolves a short code to its link. */
  resolve(code) {
    return this.#codeIndex.get(code) || null;
  }

  /** Loads a link from external source (e.g., database). */
  loadLink(link) {
    this.#codeIndex.set(link.shortCode, link);
    this.#urlIndex.set(link.longUrl, link);
  }

  /** Increments click count for a code. */
  incrementClicks(code) {
    const link = this.#codeIndex.get(code);
    if (link) link.clicks++;
  }

  /** Deletes a short code. Returns true if found. */
  delete(code) {
    const link = this.#codeIndex.get(code);
    if (!link) return false;
    this.#codeIndex.delete(code);
    this.#urlIndex.delete(link.longUrl);
    return true;
  }

  /** Returns all stored links. */
  allLinks() {
    return [...this.#codeIndex.values()];
  }

  /** Returns engine statistics. */
  stats() {
    return {
      total_links: this.#codeIndex.size,
      unique_urls: this.#urlIndex.size,
      encoder: this.#encoder.name,
      max_url_length: this.#maxUrlLen,
    };
  }
}
