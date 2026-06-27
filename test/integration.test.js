import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Engine } from '../src/lib/engine.js';
import { Analytics } from '../src/lib/analytics.js';
import { Store } from '../src/lib/storage.js';
import { Limiter, Strategy } from '../src/lib/limiter.js';

// Minimal integration test using direct fetch against a test server
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Integration', () => {
  let server, baseUrl, store;
  const tmpDir = mkdtempSync(join(tmpdir(), 'linkforge-test-'));

  before(async () => {
    const engine = new Engine();
    const analytics = new Analytics(1000);
    store = new Store(join(tmpDir, 'test.db'));
    const limiter = new Limiter(Strategy.TOKEN_BUCKET, 1000, 60000);

    // Load existing
    for (const link of store.getAllLinks()) engine.loadLink(link);

    server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost`);
      const path = url.pathname;

      try {
        if (req.method === 'POST' && path === '/api/shorten') {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const link = engine.shorten(body.url, body.custom_code || '');
          store.saveLink(link);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ short_code: link.shortCode, long_url: link.longUrl }));
          return;
        }

        if (req.method === 'GET' && path === '/api/stats') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ engine: engine.stats() }));
          return;
        }

        if (req.method === 'GET' && path.length > 1) {
          const code = path.slice(1);
          const link = engine.resolve(code);
          if (!link) { res.writeHead(404); res.end('Not found'); return; }
          engine.incrementClicks(code);
          analytics.recordClick({ shortCode: code, timestamp: Date.now(), ip: '127.0.0.1' });
          res.writeHead(301, { Location: link.longUrl });
          res.end();
          return;
        }

        res.writeHead(404); res.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    await new Promise(resolve => server.listen(0, resolve));
    const addr = server.address();
    baseUrl = `http://localhost:${addr.port}`;
  });

  after(() => {
    server.close();
    store.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shortens and redirects', async () => {
    // Shorten
    const shortenRes = await fetch(`${baseUrl}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/integration-test' }),
    });
    assert.equal(shortenRes.status, 201);
    const { short_code } = await shortenRes.json();
    assert.ok(short_code);

    // Redirect
    const redirectRes = await fetch(`${baseUrl}/${short_code}`, { redirect: 'manual' });
    assert.equal(redirectRes.status, 301);
    assert.equal(redirectRes.headers.get('location'), 'https://example.com/integration-test');
  });

  it('returns stats', async () => {
    const res = await fetch(`${baseUrl}/api/stats`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.engine);
    assert.ok(data.engine.total_links >= 0);
  });

  it('persists to database', () => {
    const links = store.getAllLinks();
    assert.ok(links.length > 0);
    assert.ok(links[0].shortCode);
  });
});
