# 🔗 LinkForge

**High-performance, production-ready URL shortener built in Node.js.**

LinkForge is a distributed URL shortening service featuring Snowflake-based ID generation, multiple encoding strategies, real-time analytics, rate limiting, SQLite persistence, and a web dashboard — all designed for sub-millisecond redirect performance.

---

## ✨ Features

- **Distributed ID Generation** — Snowflake algorithm: 64-bit unique IDs, 1024 nodes, 4096 IDs/ms/node
- **Multiple Encoding Strategies** — Base62, MD5, SHA256, FNV-1a
- **Sub-millisecond Redirects** — In-memory hash map lookup, O(1) time complexity
- **URL Deduplication** — Same URL always produces the same short code
- **Real-time Analytics** — Click tracking, unique IPs, hourly stats, recent events
- **Rate Limiting** — Token bucket, sliding window, fixed window strategies
- **SQLite Persistence** — WAL mode, auto-save, full export
- **Web Dashboard** — Built-in dark-themed UI with live stats
- **REST API** — Full CRUD, analytics, health checks, JSON export
- **Docker Ready** — Multi-stage build, health checks, non-root user
- **Custom Short Codes** — User-defined aliases with reserved word protection

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Install & Run

```bash
# Clone
git clone https://github.com/linkforge/linkforge.git
cd linkforge

# Install dependencies
npm install

# Start
npm start
```

The server starts at `http://localhost:8080` with the dashboard at `/dashboard`.

### Development

```bash
npm run dev  # Auto-reload on changes
```

### Docker

```bash
docker build -t linkforge .
docker run -p 8080:8080 -v linkforge-data:/app/data linkforge
```

Or with Docker Compose:

```bash
docker-compose up -d
```

---

## 📡 API Reference

### Shorten URL

```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'
```

Response:
```json
{
  "short_url": "http://localhost:8080/aB3dEf",
  "short_code": "aB3dEf",
  "long_url": "https://example.com/very/long/path",
  "created_at": 1719475200000,
  "domain": "example.com"
}
```

### Custom Short Code

```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "custom_code": "mylink"}'
```

### Redirect

```
GET /{short_code} → 301 Redirect to long URL
```

### List All Links

```bash
curl http://localhost:8080/api/links
```

### Delete Link

```bash
curl -X DELETE http://localhost:8080/api/links/{short_code}
```

### Statistics

```bash
curl http://localhost:8080/api/stats
```

### Link Analytics

```bash
curl http://localhost:8080/api/analytics/{short_code}
```

### Health Check

```bash
curl http://localhost:8080/api/health
```

### Export Data

```bash
curl http://localhost:8080/api/export -o backup.json
```

---

## ⚙️ Configuration

All configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Listen address |
| `BASE_URL` | `http://{HOST}:{PORT}` | Base URL for short links |
| `DB_PATH` | `linkforge.db` | SQLite database path |
| `WORKER_ID` | `1` | Snowflake worker ID (0-31) |
| `DATACENTER_ID` | `1` | Snowflake datacenter ID (0-31) |
| `RATE_LIMIT` | `100` | Requests per window |
| `RATE_WINDOW_SEC` | `60` | Rate limit window (seconds) |
| `MAX_URL_LENGTH` | `2048` | Maximum URL length |

---

## 🏗️ Architecture

```
linkforge/
├── src/
│   ├── index.js            # HTTP server, routes, middleware
│   └── lib/
│       ├── snowflake.js    # Distributed ID generator
│       ├── encoder.js      # Short code encoding strategies
│       ├── engine.js       # Core shortener engine
│       ├── analytics.js    # Click analytics engine
│       ├── storage.js      # SQLite persistence
│       └── limiter.js      # Rate limiter
├── public/                 # Dashboard HTML/CSS/JS
├── test/                   # Unit, integration, benchmarks
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose setup
└── .github/workflows/      # CI/CD pipeline
```

### Core Components

1. **Snowflake ID Generator** — Generates 64-bit unique IDs with datacenter/worker/sequence decomposition. Monotonic, 4096 IDs/ms capacity.

2. **Encoder Suite** — Pluggable encoding strategies: Base62 (default, reversible), MD5/SHA256 (hash-based), FNV-1a (fast hash).

3. **Shortener Engine** — Core link management with in-memory dual-index (code→link, url→link) for O(1) lookup and deduplication.

4. **Analytics Engine** — Per-link, per-hour aggregation. Ring buffer for recent events. Unique IP tracking via Set.

5. **Rate Limiter** — Three strategies: token bucket (smooth), sliding window (precise), fixed window (simple). Per-IP tracking with automatic cleanup.

6. **Storage Layer** — SQLite with WAL journal mode, async click logging, full export capability.

---

## 🧪 Testing

```bash
# All tests
npm test

# Benchmarks
npm run bench
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Built with ❤️ in Node.js
