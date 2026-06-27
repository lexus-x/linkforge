/**
 * SQLite persistence layer for links and click logs.
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 * WAL journal mode for concurrent read performance.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  #db;

  constructor(dbPath = 'linkforge.db') {
    // Ensure directory exists
    try { mkdirSync(dirname(dbPath), { recursive: true }); } catch {}

    this.#db = new Database(dbPath);
    this.#db.pragma('journal_mode = WAL');
    this.#db.pragma('synchronous = NORMAL');
    this.#db.pragma('busy_timeout = 5000');
    this.#initSchema();
  }

  #initSchema() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY,
        short_code TEXT UNIQUE NOT NULL,
        long_url TEXT NOT NULL,
        domain TEXT,
        created_at INTEGER NOT NULL,
        clicks INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
      CREATE INDEX IF NOT EXISTS idx_links_long_url ON links(long_url);
      CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);

      CREATE TABLE IF NOT EXISTS click_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        short_code TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ip TEXT,
        user_agent TEXT,
        referer TEXT,
        country TEXT,
        device TEXT,
        browser TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_click_log_code ON click_log(short_code);
      CREATE INDEX IF NOT EXISTS idx_click_log_time ON click_log(timestamp);
    `);
  }

  /** Persists a link to the database. */
  saveLink(link) {
    const stmt = this.#db.prepare(`
      INSERT OR REPLACE INTO links (id, short_code, long_url, domain, created_at, clicks)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(link.id || 0, link.shortCode, link.longUrl, link.domain || '', link.createdAt, link.clicks || 0);
  }

  /** Retrieves a link by short code. */
  getLink(code) {
    const stmt = this.#db.prepare('SELECT id, short_code, long_url, domain, created_at, clicks FROM links WHERE short_code = ?');
    const row = stmt.get(code);
    if (!row) return null;
    return {
      id: row.id,
      shortCode: row.short_code,
      longUrl: row.long_url,
      domain: row.domain,
      createdAt: row.created_at,
      clicks: row.clicks,
    };
  }

  /** Retrieves all links. */
  getAllLinks() {
    const stmt = this.#db.prepare('SELECT id, short_code, long_url, domain, created_at, clicks FROM links ORDER BY created_at DESC');
    return stmt.all().map(row => ({
      id: row.id,
      shortCode: row.short_code,
      longUrl: row.long_url,
      domain: row.domain,
      createdAt: row.created_at,
      clicks: row.clicks,
    }));
  }

  /** Deletes a link by short code. */
  deleteLink(code) {
    this.#db.prepare('DELETE FROM links WHERE short_code = ?').run(code);
  }

  /** Updates click count for a link. */
  updateClicks(code, clicks) {
    this.#db.prepare('UPDATE links SET clicks = ? WHERE short_code = ?').run(clicks, code);
  }

  /** Records a click event. */
  logClick(code, ip, userAgent, referer, country = '', device = '', browser = '') {
    this.#db.prepare(`
      INSERT INTO click_log (short_code, timestamp, ip, user_agent, referer, country, device, browser)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, Date.now(), ip, userAgent, referer, country, device, browser);
  }

  /** Returns click logs for a short code. */
  getClickLog(code, limit = 100) {
    const stmt = this.#db.prepare(
      'SELECT short_code, timestamp, ip, user_agent, referer, country, device, browser FROM click_log WHERE short_code = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(code, limit).map(row => ({
      shortCode: row.short_code,
      timestamp: row.timestamp,
      ip: row.ip,
      userAgent: row.user_agent,
      referer: row.referer,
      country: row.country,
      device: row.device,
      browser: row.browser,
    }));
  }

  /** Returns storage statistics. */
  stats() {
    const links = this.#db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(clicks), 0) as total_clicks FROM links').get();
    const logs = this.#db.prepare('SELECT COUNT(*) as cnt FROM click_log').get();
    return {
      total_links: links.cnt,
      total_clicks: links.total_clicks,
      total_logs: logs.cnt,
      backend: 'sqlite',
    };
  }

  /** Exports all links as JSON. */
  exportJSON() {
    return JSON.stringify(this.getAllLinks(), null, 2);
  }

  /** Closes the database connection. */
  close() {
    this.#db.close();
  }
}
