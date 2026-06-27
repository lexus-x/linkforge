/**
 * LinkForge Benchmark Suite
 *
 * Measures throughput of all core components:
 * - Snowflake ID generation
 * - Encoding strategies
 * - Engine shorten/resolve
 * - Analytics recording
 * - Rate limiter
 */

import { Snowflake } from '../src/lib/snowflake.js';
import { Base62Encoder, HashEncoder, FNV1aEncoder } from '../src/lib/encoder.js';
import { Engine } from '../src/lib/engine.js';
import { Analytics } from '../src/lib/analytics.js';
import { Limiter, Strategy } from '../src/lib/limiter.js';

function bench(name, fn, iterations = 100000) {
  // Warmup
  for (let i = 0; i < Math.min(1000, iterations); i++) fn(i);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round(iterations / (elapsed / 1000));
  const nsPerOp = Math.round((elapsed * 1000000) / iterations);
  console.log(`  ${name.padEnd(45)} ${opsPerSec.toLocaleString().padStart(12)} ops/sec    ${nsPerOp.toLocaleString().padStart(8)} ns/op`);
  return { name, opsPerSec, nsPerOp };
}

function benchAsync(name, fn, iterations = 100000) {
  // Warmup
  for (let i = 0; i < Math.min(1000, iterations); i++) fn(i);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round(iterations / (elapsed / 1000));
  const nsPerOp = Math.round((elapsed * 1000000) / iterations);
  console.log(`  ${name.padEnd(45)} ${opsPerSec.toLocaleString().padStart(12)} ops/sec    ${nsPerOp.toLocaleString().padStart(8)} ns/op`);
  return { name, opsPerSec, nsPerOp };
}

console.log('\n🔗 LinkForge Benchmark Suite');
console.log('═'.repeat(80));
console.log(`  ${'Component'.padEnd(45)} ${'Throughput'.padStart(12)}    ${'Latency'.padStart(8)}`);
console.log('─'.repeat(80));

// ── Snowflake ──────────────────────────────────────────────────────────────

console.log('\n📌 Snowflake ID Generation');
const sf = new Snowflake(1, 1);
bench('snowflake.nextId()', () => sf.nextId());

// ── Encoders ───────────────────────────────────────────────────────────────

console.log('\n📌 Encoding Strategies');
const base62 = new Base62Encoder();
const md5 = new HashEncoder('md5', 8);
const sha256 = new HashEncoder('sha256', 8);
const fnv1a = new FNV1aEncoder(7);

bench('base62.encode()', (i) => base62.encode(BigInt(i)));
bench('md5.encode()', (i) => md5.encode(BigInt(i)));
bench('sha256.encode()', (i) => sha256.encode(BigInt(i)));
bench('fnv1a.encode()', (i) => fnv1a.encode(BigInt(i)));

// ── Engine ─────────────────────────────────────────────────────────────────

console.log('\n📌 Engine — Shorten');
const engine1 = new Engine();
bench('engine.shorten() [unique URLs]', (i) => {
  engine1.shorten(`https://example.com/page/${i}`);
}, 50000);

console.log('\n📌 Engine — Resolve');
const engine2 = new Engine();
const codes = [];
for (let i = 0; i < 10000; i++) {
  codes.push(engine2.shorten(`https://example.com/${i}`).shortCode);
}
bench('engine.resolve() [random lookup]', (i) => {
  engine2.resolve(codes[i % codes.length]);
});

console.log('\n📌 Engine — End-to-End');
const engine3 = new Engine();
bench('shorten → resolve', (i) => {
  const link = engine3.shorten(`https://example.com/e2e/${i}`);
  engine3.resolve(link.shortCode);
}, 50000);

// ── Analytics ──────────────────────────────────────────────────────────────

console.log('\n📌 Analytics');
const analytics = new Analytics(100000);
bench('analytics.recordClick()', (i) => {
  analytics.recordClick({
    shortCode: 'bench',
    timestamp: Date.now(),
    ip: `10.0.${i % 256}.${(i >> 8) % 256}`,
  });
});

// ── Rate Limiter ───────────────────────────────────────────────────────────

console.log('\n📌 Rate Limiter');
const tb = new Limiter(Strategy.TOKEN_BUCKET, 10000000, 60000);
bench('token_bucket.allow()', (i) => tb.allow(`key-${i % 1000}`));
tb.destroy();

const sw = new Limiter(Strategy.SLIDING_WINDOW, 10000000, 60000);
bench('sliding_window.allow()', (i) => sw.allow(`key-${i % 1000}`));
sw.destroy();

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(80));
console.log('✅ Benchmarks complete');
console.log();
