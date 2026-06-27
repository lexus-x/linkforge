import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Analytics } from '../src/lib/analytics.js';

describe('Analytics', () => {
  it('records clicks', () => {
    const a = new Analytics();
    a.recordClick({ shortCode: 'test', timestamp: Date.now(), ip: '1.2.3.4' });
    assert.equal(a.getLinkClicks('test'), 1);
    assert.equal(a.getTotalClicks(), 1);
  });

  it('counts unique IPs', () => {
    const a = new Analytics();
    a.recordClick({ shortCode: 'x', timestamp: Date.now(), ip: '1.1.1.1' });
    a.recordClick({ shortCode: 'x', timestamp: Date.now(), ip: '2.2.2.2' });
    a.recordClick({ shortCode: 'x', timestamp: Date.now(), ip: '1.1.1.1' });
    assert.equal(a.getLinkClicks('x'), 3);
    assert.equal(a.getLinkUniqueIPs('x'), 2);
  });

  it('tracks hourly stats', () => {
    const a = new Analytics();
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      a.recordClick({ shortCode: 'h', timestamp: now, ip: '1.2.3.4' });
    }
    const stats = a.getHourlyStats(1);
    assert.equal(stats.length, 1);
    assert.equal(stats[0].clicks, 5);
  });

  it('limits recent clicks', () => {
    const a = new Analytics(10);
    for (let i = 0; i < 15; i++) {
      a.recordClick({ shortCode: 'r', timestamp: Date.now(), ip: '1.2.3.4' });
    }
    const recent = a.getRecentClicks(5);
    assert.equal(recent.length, 5);
  });

  it('returns overview', () => {
    const a = new Analytics();
    a.recordClick({ shortCode: 'o', timestamp: Date.now(), ip: '1.2.3.4' });
    const ov = a.overview();
    assert.equal(ov.total_clicks, 1);
    assert.equal(ov.tracked_links, 1);
  });
});
