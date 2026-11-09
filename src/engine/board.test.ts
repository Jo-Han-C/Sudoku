import { describe, expect, it } from 'vitest';
import { PEERS, boxOf, colOf, rowOf } from './board';

describe('board', () => {
  it('beräknar rad, kolumn och box', () => {
    expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
    expect(boxOf(30)).toBe(4);
  });

  it('ger varje cell exakt 20 peers', () => {
    for (const peers of PEERS) expect(peers).toHaveLength(20);
    expect(PEERS[0]).not.toContain(0);
  });
});
