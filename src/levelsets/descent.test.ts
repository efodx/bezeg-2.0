import { describe, expect, it } from 'vitest';
import { classifyValley, descend, DESCENT_MAX_STEPS, iterationsUntil, type Point2 } from './descent';
import { CATALOGUE } from './functions2';

const OFF_AXIS: Point2[] = [
  { x: 2, y: 1 },
  { x: 0.25, y: -0.75 },
  { x: -1.5, y: 0.25 },
  { x: 0, y: 1 },
];
const ON_AXIS: Point2[] = [
  { x: 2, y: 0 },
  { x: -0.25, y: 0 },
  { x: 0, y: 0 },
];

/** Independent oracle: the closed-form iterate c0 * (1 - lambda h)^k. */
function closed(c0: number, lambda: number, H: number, k: number): number {
  return c0 * (1 - (lambda * H) / 100) ** k;
}

function near(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= 1e-12 + 1e-9 * Math.abs(expected);
}

/** Behaviour read off a simulation, with no use of classifyValley. */
function simulated(start: Point2, H: number): 'converges' | 'oscillates' | 'diverges' {
  const { path, stop } = descend('valley', start, H);
  if (stop === 'escaped') return 'diverges';
  const last = path[path.length - 1];
  const shrinks = (c0: number, c: number) => c0 === 0 || Math.abs(c) < 0.05 * Math.abs(c0);
  return shrinks(start.x, last.x) && shrinks(start.y, last.y) ? 'converges' : 'oscillates';
}

describe('descent on valley matches the closed form', () => {
  it('x0 (1-2h)^k and y0 (1-20h)^k for every H in [1, 30] and every start', () => {
    for (let H = 1; H <= 30; H += 1) {
      for (const s of [...OFF_AXIS, ...ON_AXIS]) {
        const { path } = descend('valley', s, H);
        expect(path.length).toBeGreaterThan(1);
        path.forEach((p, k) => {
          expect(near(p.x, closed(s.x, 2, H, k))).toBe(true);
          expect(near(p.y, closed(s.y, 20, H, k))).toBe(true);
        });
      }
    }
  });

  it('bowl has the factor 1-2h in both coordinates', () => {
    const { path } = descend('bowl', { x: 2, y: -1 }, 20);
    path.forEach((p, k) => {
      expect(near(p.x, closed(2, 2, 20, k))).toBe(true);
      expect(near(p.y, closed(-1, 2, 20, k))).toBe(true);
    });
  });
});

describe('spec numbers (LS3)', () => {
  it('iterations until f < 1e-6 from (2,1): 123, 73, 40 for H = 3, 5, 9', () => {
    const counts = [3, 5, 9].map((H) => iterationsUntil('valley', descend('valley', { x: 2, y: 1 }, H).path, 1e-6));
    expect(counts).toEqual([123, 73, 40]);
  });

  it('H = 5: y is 0 after one step and x has factor 0,9', () => {
    const { path } = descend('valley', { x: 2, y: 1 }, 5);
    expect(path[1].y).toBeCloseTo(0, 12);
    expect(path[1].x).toBeCloseTo(1.8, 12);
  });

  it('H = 9: first iterates (1,64; -0,8), (1,3448; 0,64), (1,10274; -0,512)', () => {
    const { path } = descend('valley', { x: 2, y: 1 }, 9);
    const want = [[1.64, -0.8], [1.3448, 0.64], [1.10274, -0.512]];
    want.forEach(([x, y], i) => {
      expect(path[i + 1].x).toBeCloseTo(x, 5);
      expect(path[i + 1].y).toBeCloseTo(y, 5);
    });
  });

  it('H = 10: y = +-1 forever (factor -1), x tends to 0, f tends to 10', () => {
    const { path, stop } = descend('valley', { x: 2, y: 1 }, 10);
    expect(stop).toBe('cap');
    expect(path).toHaveLength(DESCENT_MAX_STEPS + 1);
    path.forEach((p, k) => expect(near(p.y, k % 2 === 0 ? 1 : -1)).toBe(true));
    const last = path[path.length - 1];
    expect(CATALOGUE.valley.value(last.x, last.y)).toBeCloseTo(10, 1);
  });

  it('H = 11: factor -1,2, the path escapes the 10^6 radius', () => {
    const { path, stop } = descend('valley', { x: 2, y: 1 }, 11);
    expect(stop).toBe('escaped');
    // |y_k| = 1,2^k: 1,2^75 = 868147 <= 10^6 < 1,2^76 = 1041777, so step 75 is the last accepted iterate
    expect(path).toHaveLength(76);
    expect(path[2].y / path[1].y).toBeCloseTo(-1.2, 12);
    const last = path[75];
    expect(Math.hypot(last.x, last.y)).toBeLessThanOrEqual(1e6);
    expect(Math.abs(Math.abs(last.y) / 1.2 ** 75 - 1)).toBeLessThan(1e-9);
    // f = 10 * 1,2^150 = 7,54e12 (x contributes under 1e-6)
    expect(Math.abs(CATALOGUE.valley.value(last.x, last.y) / 7.5368e12 - 1)).toBeLessThan(1e-4);
  });
});

describe('classification "converges iff H <= 9 or y0 = 0"', () => {
  it('is the integer rule over H in [1, 30] and both kinds of start', () => {
    for (let H = 1; H <= 30; H += 1) {
      for (const s of OFF_AXIS) {
        const want = H <= 9 ? 'converges' : H === 10 ? 'oscillates' : 'diverges';
        expect(classifyValley(s, H)).toBe(want);
        expect(simulated(s, H)).toBe(want);
      }
      for (const s of ON_AXIS) {
        expect(classifyValley(s, H)).toBe('converges');
        expect(simulated(s, H)).toBe('converges');
      }
    }
  });
});

describe('path stops', () => {
  it('caps at 200 steps when the path stays bounded', () => {
    const r = descend('hills', { x: 1, y: 1 }, 7);
    expect(r.stop).toBe('cap');
    expect(r.path).toHaveLength(DESCENT_MAX_STEPS + 1);
  });

  it('stops before an iterate with |p| > 10^6', () => {
    const r = descend('saddle', { x: 1, y: 1 }, 30);
    expect(r.stop).toBe('escaped');
    expect(r.path.every((p) => Math.hypot(p.x, p.y) <= 1e6)).toBe(true);
  });
});

describe('invalid input throws RangeError', () => {
  it('off-grid start', () => {
    expect(() => descend('bowl', { x: 0.1, y: 0 }, 5)).toThrow(RangeError);
    expect(() => descend('bowl', { x: 0, y: 1 / 3 }, 5)).toThrow(RangeError);
    expect(() => descend('bowl', { x: Number.NaN, y: 0 }, 5)).toThrow(RangeError);
    expect(() => classifyValley({ x: 0.3, y: 0 }, 5)).toThrow(RangeError);
  });

  it('H outside [1, 30] or not an integer', () => {
    for (const H of [0, 31, -1, 2.5, Number.NaN]) {
      expect(() => descend('bowl', { x: 1, y: 1 }, H)).toThrow(RangeError);
      expect(() => classifyValley({ x: 1, y: 1 }, H)).toThrow(RangeError);
    }
  });

  it('accepts the boundaries H = 1 and H = 30 and quarter-grid starts', () => {
    expect(() => descend('bowl', { x: 0.25, y: -0.75 }, 1)).not.toThrow();
    expect(() => descend('bowl', { x: 0.25, y: -0.75 }, 30)).not.toThrow();
  });
});
