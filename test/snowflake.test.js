import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Snowflake } from '../src/lib/snowflake.js';

describe('Snowflake', () => {
  it('generates unique IDs', () => {
    const sf = new Snowflake(1, 1);
    const ids = new Set();
    const count = 100000;

    for (let i = 0; i < count; i++) {
      ids.add(sf.nextId());
    }

    assert.equal(ids.size, count);
  });

  it('generates monotonic IDs', () => {
    const sf = new Snowflake(0, 0);
    let prev = sf.nextId();

    for (let i = 0; i < 10000; i++) {
      const next = sf.nextId();
      assert.ok(next > prev, `ID ${next} should be > ${prev}`);
      prev = next;
    }
  });

  it('decomposes ID correctly', () => {
    const sf = new Snowflake(5, 10);
    const id = sf.nextId();
    const { timestamp, datacenter, worker, sequence } = sf.decompose(id);

    assert.equal(datacenter, 5);
    assert.equal(worker, 10);
    assert.ok(timestamp >= 1704067200000); // after epoch
    assert.ok(sequence >= 0 && sequence <= 4095);
  });

  it('rejects invalid params', () => {
    assert.throws(() => new Snowflake(-1, 1), /Datacenter/);
    assert.throws(() => new Snowflake(32, 1), /Datacenter/);
    assert.throws(() => new Snowflake(1, -1), /Worker/);
    assert.throws(() => new Snowflake(1, 32), /Worker/);
  });

  it('concurrent generation produces unique IDs', () => {
    const sf = new Snowflake(1, 1);
    const ids = new Set();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(Promise.resolve().then(() => {
        for (let j = 0; j < 1000; j++) {
          ids.add(sf.nextId());
        }
      }));
    }

    return Promise.all(promises).then(() => {
      assert.equal(ids.size, 10000);
    });
  });
});
