import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/lib/engine.js';

describe('Engine', () => {
  it('shortens valid URLs', () => {
    const engine = new Engine();
    const link = engine.shorten('https://example.com');
    assert.ok(link.shortCode);
    assert.equal(link.longUrl, 'https://example.com');
    assert.equal(link.domain, 'example.com');
  });

  it('auto-prepends https', () => {
    const engine = new Engine();
    const link = engine.shorten('example.com');
    assert.equal(link.longUrl, 'https://example.com');
  });

  it('rejects empty URL', () => {
    const engine = new Engine();
    assert.throws(() => engine.shorten(''), /empty/);
  });

  it('rejects invalid URL', () => {
    const engine = new Engine();
    assert.throws(() => engine.shorten('://invalid'), /Invalid/);
  });

  it('supports custom codes', () => {
    const engine = new Engine();
    const link = engine.shorten('https://example.com', 'mycode');
    assert.equal(link.shortCode, 'mycode');
  });

  it('rejects duplicate custom codes', () => {
    const engine = new Engine();
    engine.shorten('https://example.com', 'taken');
    assert.throws(() => engine.shorten('https://other.com', 'taken'), /taken/);
  });

  it('rejects reserved codes', () => {
    const engine = new Engine();
    assert.throws(() => engine.shorten('https://example.com', 'api'), /reserved/);
    assert.throws(() => engine.shorten('https://example.com', 'admin'), /reserved/);
    assert.throws(() => engine.shorten('https://example.com', 'health'), /reserved/);
  });

  it('deduplicates same URL', () => {
    const engine = new Engine();
    const link1 = engine.shorten('https://example.com');
    const link2 = engine.shorten('https://example.com');
    assert.equal(link1.shortCode, link2.shortCode);
  });

  it('resolves codes', () => {
    const engine = new Engine();
    const link = engine.shorten('https://example.com', 'test123');
    const resolved = engine.resolve('test123');
    assert.ok(resolved);
    assert.equal(resolved.longUrl, link.longUrl);
  });

  it('returns null for unknown code', () => {
    const engine = new Engine();
    assert.equal(engine.resolve('nonexistent'), null);
  });

  it('deletes links', () => {
    const engine = new Engine();
    engine.shorten('https://example.com', 'delme');
    assert.ok(engine.delete('delme'));
    assert.equal(engine.resolve('delme'), null);
    assert.equal(engine.delete('delme'), false);
  });

  it('returns stats', () => {
    const engine = new Engine();
    engine.shorten('https://a.com');
    engine.shorten('https://b.com');
    const stats = engine.stats();
    assert.equal(stats.total_links, 2);
    assert.equal(stats.unique_urls, 2);
  });

  it('concurrent shortening works', () => {
    const engine = new Engine();
    const links = [];
    for (let i = 0; i < 100; i++) {
      links.push(engine.shorten(`https://example.com/${i}`));
    }
    const codes = new Set(links.map(l => l.shortCode));
    assert.equal(codes.size, 100); // all unique
  });
});
