/**
 * Short code encoding strategies.
 *
 * Each encoder converts a numeric ID to a short string code.
 * Strategies differ in determinism, reversibility, and collision resistance.
 */

import { createHash } from 'node:crypto';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Base62 encoder — deterministic, reversible, collision-free for unique IDs.
 */
export class Base62Encoder {
  name = 'base62';

  encode(id) {
    let n = BigInt(id);
    if (n === 0n) return '0';
    const base = 62n;
    let result = '';
    while (n > 0n) {
      result = BASE62[Number(n % base)] + result;
      n /= base;
    }
    return result;
  }
}

/**
 * Hash-based encoder — uses MD5/SHA256 prefix. Non-reversible, fixed-length.
 */
export class HashEncoder {
  #length;
  #algorithm;

  constructor(algorithm = 'md5', length = 8) {
    this.#algorithm = algorithm;
    this.#length = length;
    this.name = algorithm;
  }

  encode(id) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(id));
    const hash = createHash(this.#algorithm).update(buf).digest('hex');
    return hash.slice(0, this.#length);
  }
}

/**
 * FNV-1a encoder — fast hash, good distribution, deterministic.
 */
export class FNV1aEncoder {
  #length;

  constructor(length = 7) {
    this.#length = length;
    this.name = 'fnv1a';
  }

  encode(id) {
    let hash = 14695981039346656037n; // FNV offset basis
    const prime = 1099511628211n;
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(id));

    for (const byte of buf) {
      hash ^= BigInt(byte);
      hash *= prime;
    }
    hash = hash & 0xFFFFFFFFFFFFFFFFn; // 64-bit mask

    // Convert to base62
    let result = '';
    let n = hash;
    while (n > 0n) {
      result = BASE62[Number(n % 62n)] + result;
      n /= 62n;
    }

    if (result.length > this.#length) {
      result = result.slice(0, this.#length);
    }
    while (result.length < this.#length) {
      result = '0' + result;
    }
    return result;
  }
}

/**
 * Returns all available encoders keyed by name.
 */
export function defaultEncoders() {
  return {
    base62: new Base62Encoder(),
    md5: new HashEncoder('md5', 8),
    sha256: new HashEncoder('sha256', 8),
    fnv1a: new FNV1aEncoder(7),
  };
}
