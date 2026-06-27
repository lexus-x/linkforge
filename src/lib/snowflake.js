/**
 * Snowflake distributed ID generator.
 *
 * 64-bit ID structure:
 *   [1 bit sign][41 bits timestamp][5 bits datacenter][5 bits worker][12 bits sequence]
 *
 * - Epoch: 2024-01-01 00:00:00 UTC
 * - Capacity: 69 years of timestamps
 * - Workers: 32 datacenters × 32 workers = 1024 nodes
 * - Throughput: 4096 IDs per millisecond per worker
 */

const EPOCH = 1704067200000n; // 2024-01-01T00:00:00Z in ms

const DATACENTER_BITS = 5n;
const WORKER_BITS = 5n;
const SEQUENCE_BITS = 12n;

const MAX_DATACENTER = (1n << DATACENTER_BITS) - 1n; // 31
const MAX_WORKER = (1n << WORKER_BITS) - 1n;         // 31
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;     // 4095

const WORKER_SHIFT = SEQUENCE_BITS;
const DATACENTER_SHIFT = SEQUENCE_BITS + WORKER_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_BITS + DATACENTER_BITS;

export class Snowflake {
  #workerId;
  #datacenterId;
  #sequence = 0n;
  #lastTime = 0n;

  constructor(datacenterId = 1, workerId = 1) {
    if (datacenterId < 0 || datacenterId > Number(MAX_DATACENTER)) {
      throw new Error(`Datacenter ID must be 0-${MAX_DATACENTER}`);
    }
    if (workerId < 0 || workerId > Number(MAX_WORKER)) {
      throw new Error(`Worker ID must be 0-${MAX_WORKER}`);
    }
    this.#workerId = BigInt(workerId);
    this.#datacenterId = BigInt(datacenterId);
  }

  nextId() {
    let now = BigInt(Date.now());

    if (now < this.#lastTime) {
      throw new Error('Clock moved backwards');
    }

    if (now === this.#lastTime) {
      this.#sequence = (this.#sequence + 1n) & MAX_SEQUENCE;
      if (this.#sequence === 0n) {
        // Sequence exhausted, wait for next ms
        while (now <= this.#lastTime) {
          now = BigInt(Date.now());
        }
      }
    } else {
      this.#sequence = 0n;
    }

    this.#lastTime = now;

    const id =
      ((now - EPOCH) << TIMESTAMP_SHIFT) |
      (this.#datacenterId << DATACENTER_SHIFT) |
      (this.#workerId << WORKER_SHIFT) |
      this.#sequence;

    return id;
  }

  decompose(id) {
    const bigId = BigInt(id);
    return {
      timestamp: Number((bigId >> TIMESTAMP_SHIFT) + EPOCH),
      datacenter: Number((bigId >> DATACENTER_SHIFT) & MAX_DATACENTER),
      worker: Number((bigId >> WORKER_SHIFT) & MAX_WORKER),
      sequence: Number(bigId & MAX_SEQUENCE),
    };
  }
}
