import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Limiter, Strategy } from '../src/lib/limiter.js';

describe('Limiter', () => {
  it('token bucket allows up to limit', () => {
    const l = new Limiter(Strategy.TOKEN_BUCKET, 5, 1000);
    for (let i = 0; i < 5; i++) {
      assert.ok(l.allow('test'), `Request ${i} should be allowed`);
    }
    assert.equal(l.allow('test'), false);
    l.destroy();
  });

  it('sliding window allows up to limit', () => {
    const l = new Limiter(Strategy.SLIDING_WINDOW, 3, 1000);
    for (let i = 0; i < 3; i++) {
      assert.ok(l.allow('test'));
    }
    assert.equal(l.allow('test'), false);
    l.destroy();
  });

  it('fixed window allows up to limit', () => {
    const l = new Limiter(Strategy.FIXED_WINDOW, 3, 1000);
    for (let i = 0; i < 3; i++) {
      assert.ok(l.allow('test'));
    }
    assert.equal(l.allow('test'), false);
    l.destroy();
  });

  it('different keys get separate buckets', () => {
    const l = new Limiter(Strategy.TOKEN_BUCKET, 2, 1000);
    l.allow('a');
    l.allow('a');
    assert.ok(l.allow('b'));
    l.destroy();
  });

  it('returns stats', () => {
    const l = new Limiter(Strategy.TOKEN_BUCKET, 100, 60000);
    const stats = l.stats();
    assert.equal(stats.strategy, 'token_bucket');
    assert.equal(stats.limit, 100);
    l.destroy();
  });
});
