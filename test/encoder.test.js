import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Base62Encoder, HashEncoder, FNV1aEncoder } from '../src/lib/encoder.js';

describe('Base62Encoder', () => {
  const enc = new Base62Encoder();

  it('encodes zero', () => assert.equal(enc.encode(0), '0'));
  it('encodes 1', () => assert.equal(enc.encode(1), '1'));
  it('encodes 61', () => assert.equal(enc.encode(61), 'Z'));
  it('encodes 62', () => assert.equal(enc.encode(62), '10'));
  it('encodes 3844', () => assert.equal(enc.encode(3844), '100'));

  it('produces unique codes for sequential IDs', () => {
    const seen = new Set();
    for (let i = 0; i < 10000; i++) {
      const code = enc.encode(i);
      assert.ok(!seen.has(code), `Duplicate: ${code}`);
      seen.add(code);
    }
  });
});

describe('HashEncoder', () => {
  it('MD5 is deterministic', () => {
    const enc = new HashEncoder('md5', 8);
    assert.equal(enc.encode(12345), enc.encode(12345));
  });

  it('MD5 produces different codes for different inputs', () => {
    const enc = new HashEncoder('md5', 8);
    assert.notEqual(enc.encode(12345), enc.encode(54321));
  });

  it('SHA256 is deterministic', () => {
    const enc = new HashEncoder('sha256', 8);
    assert.equal(enc.encode(12345), enc.encode(12345));
    assert.notEqual(enc.encode(12345), enc.encode(54321));
  });
});

describe('FNV1aEncoder', () => {
  it('produces fixed-length codes', () => {
    const enc = new FNV1aEncoder(7);
    for (let i = 0; i < 100; i++) {
      const code = enc.encode(i);
      assert.ok(code.length <= 7, `Code too long: ${code}`);
    }
  });

  it('is deterministic', () => {
    const enc = new FNV1aEncoder(7);
    assert.equal(enc.encode(999), enc.encode(999));
  });
});
