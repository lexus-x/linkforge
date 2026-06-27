/**
 * LinkForge — High-performance URL shortener
 *
 * Main entry point. Sets up HTTP server with all routes and middleware.
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Engine } from './lib/engine.js';
import { Analytics } from './lib/analytics.js';
import { Store } from './lib/storage.js';
import { Limiter, Strategy } from './lib/limiter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ──────────────────────────────────────────────────────────

const config = {
  port: parseInt(process.env.PORT || '8080'),
  host: process.env.HOST || '0.0.0.0',
  baseUrl: process.env.BASE_URL || '',
  dbPath: process.env.DB_PATH || 'linkforge.db',
  workerId: parseInt(process.env.WORKER_ID || '1'),
  datacenterId: parseInt(process.env.DATACENTER_ID || '1'),
  rateLimit: parseInt(process.env.RATE_LIMIT || '100'),
  rateWindow: parseInt(process.env.RATE_WINDOW_SEC || '60') * 1000,
  maxUrlLength: parseInt(process.env.MAX_URL_LENGTH || '2048'),
};

if (!config.baseUrl) {
  config.baseUrl = `http://${config.host}:${config.port}`;
}

// ── Core Components ────────────────────────────────────────────────────────

const engine = new Engine({
  datacenterId: config.datacenterId,
  workerId: config.workerId,
  maxUrlLen: config.maxUrlLength,
});

const analytics = new Analytics(10000);
const store = new Store(config.dbPath);
const limiter = new Limiter(Strategy.TOKEN_BUCKET, config.rateLimit, config.rateWindow);
const startTime = Date.now();

// Load existing links from DB
const existingLinks = store.getAllLinks();
for (const link of existingLinks) {
  engine.loadLink(link);
}
console.log(`Loaded ${existingLinks.length} links from database`);

// ── Template ───────────────────────────────────────────────────────────────

const dashboardHTML = buildDashboard();

function buildDashboard() {
  const templatePath = join(__dirname, '..', 'public', 'dashboard.html');
  if (existsSync(templatePath)) {
    return readFileSync(templatePath, 'utf-8');
  }
  return getEmbeddedDashboard();
}

function getEmbeddedDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LinkForge — Dashboard</title>
<style>
:root{--bg:#0a0a0f;--surface:#12121a;--border:#1e1e2e;--text:#e0e0e0;--muted:#888;--accent:#6c5ce7;--accent-h:#7c6cf7;--success:#00b894;--danger:#e74c3c;--r:12px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
.container{max-width:960px;margin:0 auto;padding:2rem 1.5rem}
header{text-align:center;margin-bottom:2.5rem}
header h1{font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,var(--accent),#a29bfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.subtitle{color:var(--muted);font-size:1.1rem;margin-top:.5rem}
.form-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:1.5rem;margin-bottom:2rem}
.form-box form{display:flex;gap:.75rem}
.form-box input{padding:.75rem 1rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:1rem}
.form-box input[type=url]{flex:1}
.form-box input[type=text]{width:180px}
.form-box input:focus{outline:none;border-color:var(--accent)}
.form-box button{padding:.75rem 1.5rem;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;transition:background .2s}
.form-box button:hover{background:var(--accent-h)}
.result{margin-top:1rem;padding:1rem;background:var(--bg);border:1px solid var(--success);border-radius:8px;word-break:break-all;display:none}
.result.show{display:block}
.result a{color:var(--accent);font-weight:600;text-decoration:none}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:1.5rem;text-align:center}
.stat-value{font-size:2rem;font-weight:800;color:var(--accent)}
.stat-label{color:var(--muted);font-size:.9rem;margin-top:.25rem}
.section{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:1.5rem;margin-bottom:2rem;overflow-x:auto}
.section h2{margin-bottom:1rem;font-size:1.3rem}
table{width:100%;border-collapse:collapse}
th,td{padding:.75rem;text-align:left;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:600;font-size:.85rem;text-transform:uppercase;letter-spacing:.05em}
.url-cell{max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
td a{color:var(--accent);text-decoration:none;font-weight:500}
.btn-del{padding:.4rem .8rem;background:transparent;color:var(--danger);border:1px solid var(--danger);border-radius:6px;cursor:pointer;font-size:.8rem;transition:all .2s}
.btn-del:hover{background:var(--danger);color:#fff}
.api-card{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:1rem;margin-bottom:.75rem}
.api-card h3{color:var(--accent);font-size:.95rem;margin-bottom:.5rem}
.api-card pre{color:var(--muted);font-size:.85rem;white-space:pre-wrap}
.copy-btn{margin-left:1rem;padding:.3rem .6rem;background:var(--accent);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.85rem}
@media(max-width:640px){.form-box form{flex-direction:column}.form-box input[type=text]{width:100%}header h1{font-size:2rem}}
</style>
</head>
<body>
<div class="container">
<header><h1>🔗 LinkForge</h1><p class="subtitle">High-Performance URL Shortener</p></header>
<section class="form-box">
<form id="f"><input type="url" id="url" placeholder="Enter URL to shorten..." required><input type="text" id="code" placeholder="Custom code (optional)"><button type="submit">Shorten</button></form>
<div id="result" class="result"></div>
</section>
<section class="stats-grid">
<div class="stat-card"><div class="stat-value" id="s-links">-</div><div class="stat-label">Total Links</div></div>
<div class="stat-card"><div class="stat-value" id="s-clicks">-</div><div class="stat-label">Total Clicks</div></div>
<div class="stat-card"><div class="stat-value" id="s-unique">-</div><div class="stat-label">Unique URLs</div></div>
<div class="stat-card"><div class="stat-value" id="s-uptime">-</div><div class="stat-label">Uptime</div></div>
</section>
<section class="section"><h2>Recent Links</h2><table><thead><tr><th>Short Code</th><th>Long URL</th><th>Clicks</th><th>Actions</th></tr></thead><tbody id="links"></tbody></table></section>
<section class="section"><h2>API Reference</h2>
<div class="api-card"><h3>POST /api/shorten</h3><pre>{"url": "https://example.com", "custom_code": "mycode"}</pre></div>
<div class="api-card"><h3>GET /api/stats</h3><pre>Returns engine, analytics, and system statistics</pre></div>
<div class="api-card"><h3>GET /:code</h3><pre>Redirects to the original URL</pre></div>
</section>
</div>
<script>
const BASE='${config.baseUrl}';
document.getElementById('f').addEventListener('submit',async e=>{
  e.preventDefault();
  const url=document.getElementById('url').value;
  const code=document.getElementById('code').value.trim();
  const r=await fetch('/api/shorten',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,custom_code:code||undefined})});
  const d=await r.json();
  const el=document.getElementById('result');
  if(r.ok){el.innerHTML='✅ <a href="'+d.short_url+'" target="_blank">'+d.short_url+'</a> <button class="copy-btn" onclick="navigator.clipboard.writeText(\\''+d.short_url+'\\')">Copy</button>';el.classList.add('show');setTimeout(()=>location.reload(),1500);}
  else{el.innerHTML='❌ '+d.error;el.classList.add('show');}
});
async function loadStats(){
  try{const r=await fetch('/api/stats');const d=await r.json();
  document.getElementById('s-links').textContent=d.engine?.total_links??0;
  document.getElementById('s-clicks').textContent=d.analytics?.total_clicks??0;
  document.getElementById('s-unique').textContent=d.engine?.unique_urls??0;
  document.getElementById('s-uptime').textContent=d.uptime??'-';
  }catch(e){}
}
async function loadLinks(){
  try{const r=await fetch('/api/links');const d=await r.json();
  const tb=document.getElementById('links');tb.innerHTML='';
  (d.links||[]).slice(0,50).forEach(l=>{
    tb.innerHTML+='<tr><td><a href="/'+l.shortCode+'" target="_blank">'+l.shortCode+'</a></td><td class="url-cell">'+l.longUrl+'</td><td>'+l.clicks+'</td><td><button class="btn-del" onclick="del(\\''+l.shortCode+'\\')">Delete</button></td></tr>';
  });}catch(e){}
}
window.del=async function(c){if(!confirm('Delete '+c+'?'))return;await fetch('/api/links/'+c,{method:'DELETE'});location.reload();};
loadStats();loadLinks();setInterval(loadStats,30000);
</script>
</body></html>`;
}

// ── HTTP Server ────────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function jsonError(res, message, status = 400) {
  json(res, { error: message }, status);
}

function extractIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${m}m${sec}s`;
  if (m > 0) return `${m}m${sec}s`;
  return `${sec}s`;
}

const server = createServer(async (req, res) => {
  const start = Date.now();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Rate limit
  const ip = extractIP(req);
  if (!limiter.allow(ip)) {
    jsonError(res, 'Rate limit exceeded', 429);
    return;
  }

  try {
    // ── API Routes ─────────────────────────────────────────────

    // POST /api/shorten
    if (method === 'POST' && path === '/api/shorten') {
      const body = await parseBody(req);
      if (!body.url) return jsonError(res, 'Missing url field');

      const link = engine.shorten(body.url, body.custom_code || '');
      store.saveLink(link);
      if (link.domain) analytics.recordClick({ shortCode: '__domain_' + link.domain, timestamp: Date.now(), ip: '' });

      const shortUrl = `${config.baseUrl}/${link.shortCode}`;
      return json(res, {
        short_url: shortUrl,
        short_code: link.shortCode,
        long_url: link.longUrl,
        created_at: link.createdAt,
        domain: link.domain,
      }, 201);
    }

    // GET /api/links
    if (method === 'GET' && path === '/api/links') {
      const links = engine.allLinks();
      return json(res, { links, total: links.length });
    }

    // DELETE /api/links/:code
    if (method === 'DELETE' && path.startsWith('/api/links/')) {
      const code = path.slice('/api/links/'.length);
      if (!engine.delete(code)) return jsonError(res, 'Link not found', 404);
      store.deleteLink(code);
      return json(res, { status: 'deleted' });
    }

    // GET /api/stats
    if (method === 'GET' && path === '/api/stats') {
      return json(res, {
        engine: engine.stats(),
        analytics: analytics.overview(),
        limiter: limiter.stats(),
        storage: store.stats(),
        uptime: formatUptime(Date.now() - startTime),
        version: '1.0.0',
      });
    }

    // GET /api/analytics/:code
    if (method === 'GET' && path.startsWith('/api/analytics/')) {
      const code = path.slice('/api/analytics/'.length);
      const clicks = analytics.getLinkClicks(code);
      const uniqueIPs = analytics.getLinkUniqueIPs(code);
      const recent = analytics.getRecentClicks(100).filter(c => c.shortCode === code);
      return json(res, { short_code: code, total_clicks: clicks, unique_ips: uniqueIPs, recent });
    }

    // GET /api/health
    if (method === 'GET' && path === '/api/health') {
      return json(res, { status: 'healthy', uptime: formatUptime(Date.now() - startTime), version: '1.0.0' });
    }

    // GET /api/export
    if (method === 'GET' && path === '/api/export') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename=linkforge-export.json',
      });
      res.end(store.exportJSON());
      return;
    }

    // ── Dashboard ──────────────────────────────────────────────

    if (method === 'GET' && (path === '/dashboard' || path === '/')) {
      if (path === '/') {
        res.writeHead(302, { Location: '/dashboard' });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboardHTML);
      return;
    }

    // ── Static Files ───────────────────────────────────────────

    if (path.startsWith('/static/')) {
      const filePath = join(__dirname, '..', 'public', path.slice('/static/'.length));
      if (existsSync(filePath)) {
        const ext = filePath.split('.').pop();
        const types = { css: 'text/css', js: 'application/javascript', png: 'image/png', svg: 'image/svg+xml' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(readFileSync(filePath));
        return;
      }
    }

    // ── QR Code ────────────────────────────────────────────────

    if (method === 'GET' && path.startsWith('/qr/')) {
      const code = path.slice('/qr/'.length);
      const shortUrl = `${config.baseUrl}/${code}`;
      res.writeHead(307, { Location: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}` });
      res.end();
      return;
    }

    // ── Redirect ───────────────────────────────────────────────

    if (method === 'GET' && path.length > 1) {
      const code = path.slice(1);
      const link = engine.resolve(code);
      if (!link) {
        // Try DB fallback
        const dbLink = store.getLink(code);
        if (!dbLink) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 — Link not found</h1>');
          return;
        }
        engine.loadLink(dbLink);
        // Fall through to redirect with dbLink
        engine.incrementClicks(code);
        analytics.recordClick({ shortCode: code, timestamp: Date.now(), ip, userAgent: req.headers['user-agent'] || '', referer: req.headers.referer || '' });
        setImmediate(() => {
          store.updateClicks(code, analytics.getLinkClicks(code));
          store.logClick(code, ip, req.headers['user-agent'] || '', req.headers.referer || '');
        });
        res.writeHead(301, { Location: dbLink.longUrl });
        res.end();
        return;
      }

      engine.incrementClicks(code);
      analytics.recordClick({ shortCode: code, timestamp: Date.now(), ip, userAgent: req.headers['user-agent'] || '', referer: req.headers.referer || '' });

      // Async DB update
      setImmediate(() => {
        store.updateClicks(code, analytics.getLinkClicks(code));
        store.logClick(code, ip, req.headers['user-agent'] || '', req.headers.referer || '');
      });

      res.writeHead(301, { Location: link.longUrl });
      res.end();
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (err) {
    const status = err.message.includes('reserved') || err.message.includes('empty') || err.message.includes('Invalid') || err.message.includes('taken') || err.message.includes('exceeds')
      ? 400 : 500;
    jsonError(res, err.message, status);
  } finally {
    const elapsed = Date.now() - start;
    if (elapsed > 100) {
      console.log(`${method} ${path} ${elapsed}ms`);
    }
  }
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\n⏳ Received ${signal}, shutting down gracefully...`);
  limiter.destroy();
  store.close();
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Start ──────────────────────────────────────────────────────────────────

server.listen(config.port, config.host, () => {
  console.log('🔗 LinkForge v1.0.0 — High-Performance URL Shortener');
  console.log(`🚀 Server listening on ${config.host}:${config.port}`);
  console.log(`📊 Dashboard: ${config.baseUrl}/dashboard`);
  console.log(`🔗 API: ${config.baseUrl}/api/shorten`);
});

export { server, engine, analytics, store, limiter, config };
