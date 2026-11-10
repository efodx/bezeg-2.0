import { describe, expect, it } from 'vitest';
import { antinodes, nodes, nodesOnLength, standingAt, travelling } from './standing';

describe('standing wave identity', () => {
  it('equals the sum of the two travelling waves on a grid', () => {
    for (const [k, w] of [[Math.PI, 2 * Math.PI], [1.7, 0.4], [3 * Math.PI, 5]]) {
      let worst = 0;
      for (let i = 0; i <= 200; i++) {
        for (let j = 0; j <= 100; j++) {
          const x = (3 * i) / 200;
          const t = j / 50;
          const sum = travelling(k, w, 1, x, t) + travelling(k, w, -1, x, t);
          worst = Math.max(worst, Math.abs(sum - standingAt(k, w, x, t)));
        }
      }
      expect(worst).toBeLessThan(1e-14);
    }
  });

  it('has nodes at n pi / k, antinodes of amplitude 2 at (n + 1/2) pi / k, flat at t = 1/4', () => {
    const k = Math.PI;
    const w = 2 * Math.PI;
    expect(nodes(k, 3).map((x) => Math.round(x * 1e12) / 1e12)).toEqual([0, 1, 2]);
    expect(antinodes(k, 2).map((x) => Math.round(x * 1e12) / 1e12)).toEqual([0.5, 1.5]);
    for (let j = 0; j <= 100; j++) {
      const t = j / 37;
      for (const x of nodes(k, 4)) {
        expect(Math.abs(travelling(k, w, 1, x, t) + travelling(k, w, -1, x, t))).toBeLessThan(1e-12);
      }
    }
    for (const x of antinodes(k, 4)) {
      expect(Math.abs(travelling(k, w, 1, x, 0) + travelling(k, w, -1, x, 0))).toBeCloseTo(2, 12);
    }
    for (let i = 0; i <= 40; i++) {
      const x = i / 10;
      expect(travelling(k, w, 1, x, 0.25) + travelling(k, w, -1, x, 0.25)).toBeCloseTo(0, 12);
    }
  });

  it('places nodes at n L / m from the integer half-wave count', () => {
    expect(nodesOnLength(6, 3)).toEqual([0, 2, 4, 6]);
    for (let m = 1; m <= 6; m++) {
      const L = 6;
      const k = (m * Math.PI) / L;
      for (const x of nodesOnLength(L, m)) {
        for (const t of [0, 0.3, 1.1, 2.9]) {
          expect(Math.abs(travelling(k, 3, 1, x, t) + travelling(k, 3, -1, x, t))).toBeLessThan(1e-12);
        }
      }
      expect(nodesOnLength(L, m)).toHaveLength(m + 1);
    }
  });

  it('throws RangeError for invalid k, counts, lengths and half-wave counts', () => {
    expect(() => nodes(0, 2)).toThrow(RangeError);
    expect(() => nodes(-1, 2)).toThrow(RangeError);
    expect(() => antinodes(1, 1.5)).toThrow(RangeError);
    expect(() => nodesOnLength(0, 2)).toThrow(RangeError);
    expect(() => nodesOnLength(6, 0)).toThrow(RangeError);
    expect(() => nodesOnLength(6, 7)).toThrow(RangeError);
    expect(() => nodesOnLength(6, 2.5)).toThrow(RangeError);
  });
});
