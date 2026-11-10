import { describe, expect, it } from 'vitest';
import { contourLength, levelCurve, marchingSquares, type Segment2 } from './contours';
import { CATALOGUE } from './functions2';

const UNIT = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

/** A function on the unit square N = 1 that takes the given corner values (test helper). */
function corners(f00: number, f10: number, f11: number, f01: number) {
  return (x: number, y: number): number => {
    if (x === 0) return y === 0 ? f00 : f01;
    return y === 0 ? f10 : f11;
  };
}

/** Order-insensitive canonical form of a segment list. */
function canon(segments: readonly Segment2[]): string[] {
  return segments
    .map(({ a, b }) => {
      const p = `${a.x},${a.y}`;
      const q = `${b.x},${b.y}`;
      return p < q ? `${p}|${q}` : `${q}|${p}`;
    })
    .sort();
}

type Quad = [number, number, number, number];

function expected(...pairs: Quad[]): string[] {
  return canon(pairs.map(([ax, ay, bx, by]) => ({ a: { x: ax, y: ay }, b: { x: bx, y: by } })));
}

// Edge midpoints (corner values are +-1 with c = 0, so t = 1/2).
const B = [0.5, 0] as const;
const R = [1, 0.5] as const;
const T = [0.5, 1] as const;
const L = [0, 0.5] as const;
const seg = (p: readonly [number, number], q: readonly [number, number]): Quad => [
  p[0],
  p[1],
  q[0],
  q[1],
];

describe('marching squares: the 16 cases (hand table)', () => {
  // Bits 00:1, 10:2, 11:4, 01:8; positive corner = +1, negative = -1.
  const table: [number, Quad[]][] = [
    [0, []],
    [1, [seg(L, B)]],
    [2, [seg(B, R)]],
    [3, [seg(L, R)]],
    [4, [seg(R, T)]],
    [5, [seg(B, R), seg(L, T)]], // symmetric saddle: G = 0, joined
    [6, [seg(B, T)]],
    [7, [seg(L, T)]],
    [8, [seg(L, T)]],
    [9, [seg(B, T)]],
    [10, [seg(L, B), seg(R, T)]], // symmetric saddle: G = 0, joined
    [11, [seg(R, T)]],
    [12, [seg(L, R)]],
    [13, [seg(B, R)]],
    [14, [seg(L, B)]],
    [15, []],
  ];
  for (const [index, segs] of table) {
    it(`case ${index}`, () => {
      const s = (bit: number): number => (index & bit ? 1 : -1);
      const f = corners(s(1), s(2), s(4), s(8));
      expect(canon(marchingSquares(f, UNIT, 1, 0))).toEqual(expected(...segs));
    });
  }
});

describe('marching squares: ambiguous cell f = xy on [-1,1]^2, N = 1', () => {
  const win = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  const f = CATALOGUE.product.value;

  it('c = 0.5 separates the positive corners', () => {
    expect(canon(marchingSquares(f, win, 1, 0.5))).toEqual(
      expected([-1, -0.5, -0.5, -1], [1, 0.5, 0.5, 1]),
    );
  });
  it('c = -0.5 joins the positive corners (cuts the two negative corners off)', () => {
    expect(canon(marchingSquares(f, win, 1, -0.5))).toEqual(
      expected([-1, 0.5, -0.5, 1], [0.5, -1, 1, -0.5]),
    );
  });
  it('c = 0 (f_s = c) is joined', () => {
    expect(canon(marchingSquares(f, win, 1, 0))).toEqual(expected([-1, 0, 0, 1], [0, -1, 1, 0]));
  });
  it('the mirror image f = -xy decides the other diagonal the same way', () => {
    const g = (x: number, y: number): number => -x * y;
    // The positive corners are (-1,1) and (1,-1); c = 0.5 separates them.
    expect(canon(marchingSquares(g, win, 1, 0.5))).toEqual(
      expected([-1, 0.5, -0.5, 1], [0.5, -1, 1, -0.5]),
    );
    expect(canon(marchingSquares(g, win, 1, -0.5))).toEqual(
      expected([-1, -0.5, -0.5, -1], [1, 0.5, 0.5, 1]),
    );
  });
});

describe('marching squares: degenerate values', () => {
  it('a node with f = c counts as positive (a segment along an edge is kept)', () => {
    // f00 = f10 = c, the upper corners below: case 3 along the bottom edge.
    const f = corners(0, 0, -1, -1);
    expect(canon(marchingSquares(f, UNIT, 1, 0))).toEqual(expected([0, 0, 1, 0]));
  });
  it('the same nodes with the upper corners above give no segment', () => {
    expect(marchingSquares(corners(0, 0, 1, 1), UNIT, 1, 0)).toEqual([]);
  });
  it('a contour touching a single node gives a zero-length segment, which is dropped', () => {
    expect(marchingSquares(corners(0, -1, -1, -1), UNIT, 1, 0)).toEqual([]);
    expect(marchingSquares(corners(-1, 0, -1, -1), UNIT, 1, 0)).toEqual([]);
  });
  it('nodes on the contour are exact doubles and no segment has zero length', () => {
    const segs = marchingSquares(CATALOGUE.bowl.value, CATALOGUE.bowl.window, 40, 1);
    const hits = segs.flatMap((s) => [s.a, s.b]).filter((p) => p.y === 0 && Math.abs(p.x) === 1);
    expect(hits.length).toBeGreaterThan(0);
    for (const s of segs) expect(s.a.x === s.b.x && s.a.y === s.b.y).toBe(false);
  });
  it('interior vertices are shared bit-identically by neighbouring cells', () => {
    const segs = marchingSquares(CATALOGUE.hills.value, CATALOGUE.hills.window, 30, 0.3);
    const count = new Map<string, number>();
    for (const { a, b } of segs) {
      for (const p of [a, b]) {
        const k = `${p.x},${p.y}`;
        count.set(k, (count.get(k) ?? 0) + 1);
      }
    }
    for (const [k, v] of count) {
      const [x, y] = k.split(',').map(Number);
      if (Math.abs(x) !== 4 && Math.abs(y) !== 4) expect(v).toBe(2);
    }
  });
});

describe('marching squares: case selection against the bilinear interpolant', () => {
  // Brute force: sample b(x,y) on a fine grid, flood-fill {b >= c} and ask whether
  // the two positive corners of a saddle cell lie in one component.
  function joinedByBruteForce(f00: number, f10: number, f11: number, f01: number, c: number): boolean {
    const m = 400;
    const b = (x: number, y: number): number =>
      f00 * (1 - x) * (1 - y) + f10 * x * (1 - y) + f11 * x * y + f01 * (1 - x) * y;
    const start: [number, number] = f00 >= c ? [0, 0] : [m, 0];
    const target: [number, number] = f00 >= c ? [m, m] : [0, m];
    const seen = new Set<number>([start[0] * (m + 1) + start[1]]);
    const stack: [number, number][] = [start];
    while (stack.length) {
      const [i, j] = stack.pop()!;
      if (i === target[0] && j === target[1]) return true;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni > m || nj > m || seen.has(ni * (m + 1) + nj)) continue;
        if (b(ni / m, nj / m) < c) continue;
        seen.add(ni * (m + 1) + nj);
        stack.push([ni, nj]);
      }
    }
    return false;
  }

  it('saddle cells agree with the brute-force sign classification', () => {
    let seed = 7;
    const rand = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let checked = 0;
    let separated = 0;
    for (let k = 0; k < 20000 && checked < 150; k += 1) {
      const v = [0, 1, 2, 3].map(() => Math.round((rand() * 2 - 1) * 8) / 2);
      const [f00, f10, f11, f01] = v;
      const c = Math.round((rand() * 2 - 1) * 4) / 2 + 0.25;
      const idx = (f00 >= c ? 1 : 0) | (f10 >= c ? 2 : 0) | (f11 >= c ? 4 : 0) | (f01 >= c ? 8 : 0);
      if (idx !== 5 && idx !== 10) continue;
      const d = f00 + f11 - f01 - f10;
      const fs = (f00 * f11 - f01 * f10) / d;
      if (Math.abs(fs - c) < 0.05) continue; // too close to a tie for a 400 x 400 sample
      const segs = marchingSquares(corners(f00, f10, f11, f01), UNIT, 1, c);
      expect(segs).toHaveLength(2);
      // A segment cutting off the lower-left corner has one endpoint on x = 0 and one on y = 0.
      const cutsLowerLeft = segs.some(
        (s) => (s.a.x === 0) !== (s.b.x === 0) && (s.a.y === 0) !== (s.b.y === 0),
      );
      const joined = idx === 5 ? !cutsLowerLeft : cutsLowerLeft;
      if (!joined) separated += 1;
      expect(joined, `corners ${v.join(',')} c=${c}`).toBe(
        joinedByBruteForce(f00, f10, f11, f01, c),
      );
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(100);
    expect(separated).toBeGreaterThan(10);
    expect(separated).toBeLessThan(checked - 10);
  });
});

describe('marching squares: circle (LS1)', () => {
  const bowl = CATALOGUE.bowl;
  const stats = (n: number) => {
    const segs = marchingSquares(bowl.value, bowl.window, n, 1);
    let radius = 0;
    for (const { a, b } of segs) {
      radius = Math.max(
        radius,
        Math.abs(Math.hypot(a.x, a.y) - 1),
        Math.abs(Math.hypot(b.x, b.y) - 1),
      );
    }
    return { length: contourLength(segs), radius };
  };
  const cases: [number, number, number, number][] = [
    [20, 6.2581, -0.0251, 0.005],
    [40, 6.2763, -0.0069, 0.0012],
    [80, 6.2813, -0.0018, 0.0003],
  ];
  for (const [n, length, err, radius] of cases) {
    it(`N = ${n}: length, error and radius error match the spec`, () => {
      const s = stats(n);
      expect(s.length).toBeCloseTo(length, 4);
      expect(s.length - 2 * Math.PI).toBeCloseTo(err, 4);
      expect(s.radius).toBeCloseTo(radius, 4);
    });
  }
  it('has one closed loop at c = 1 (every vertex has degree 2, one component)', () => {
    const segs = marchingSquares(bowl.value, bowl.window, 40, 1);
    const key = (p: { x: number; y: number }): string => `${p.x},${p.y}`;
    const parent = new Map<string, string>();
    const find = (k: string): string => {
      let r = k;
      while (parent.get(r) !== r) r = parent.get(r)!;
      return r;
    };
    const degree = new Map<string, number>();
    for (const { a, b } of segs) {
      for (const p of [a, b]) {
        if (!parent.has(key(p))) parent.set(key(p), key(p));
        degree.set(key(p), (degree.get(key(p)) ?? 0) + 1);
      }
      parent.set(find(key(a)), find(key(b)));
    }
    expect(new Set([...parent.keys()].map(find)).size).toBe(1);
    for (const d of degree.values()) expect(d).toBe(2);
  });
});

describe('marching squares: vertices lie within the interpolation bound', () => {
  // Along a cell edge of length h, |f - linear interpolant| <= h^2/8 * max|f''|.
  const secondDerivative = { bowl: 2, saddle: 2, valley: 20, hills: 1, product: 0 };
  const n = 40;
  for (const id of ['bowl', 'saddle', 'valley', 'hills', 'product'] as const) {
    it(`${id}`, () => {
      const fn = CATALOGUE[id];
      const h = (fn.window.xMax - fn.window.xMin) / n;
      const bound = (h * h * secondDerivative[id]) / 8 + 1e-12;
      const levels = id === 'hills' ? [0.3, -0.5, 0] : [0, 1, 2];
      for (const c of levels) {
        for (const { a, b } of marchingSquares(fn.value, fn.window, n, c)) {
          expect(Math.abs(fn.value(a.x, a.y) - c)).toBeLessThanOrEqual(bound);
          expect(Math.abs(fn.value(b.x, b.y) - c)).toBeLessThanOrEqual(bound);
        }
      }
    });
  }
  it('saddle c = 0 has the two crossing lines x = y and x = -y', () => {
    const fn = CATALOGUE.saddle;
    const segs = marchingSquares(fn.value, fn.window, 40, 0);
    const pts = segs.flatMap((s) => [s.a, s.b]);
    expect(pts.some((p) => p.x === 0 && p.y === 0)).toBe(true);
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        expect(pts.some((p) => sx * p.x > 1.4 && Math.abs(p.y - sy * 1.5) < 0.12)).toBe(true);
      }
    }
    for (const p of pts) expect(Math.abs(Math.abs(p.x) - Math.abs(p.y))).toBeLessThan(0.05);
    expect(contourLength(segs)).toBeCloseTo(2 * Math.hypot(4, 4), 1);
  });
});

describe('gradient against the contour (LS2)', () => {
  it('bowl at (0.6, 0.8): gradient (1.2, 1.6) is orthogonal to tangent (-0.8, 0.6)', () => {
    const [gx, gy] = CATALOGUE.bowl.gradient(0.6, 0.8);
    expect(gx).toBeCloseTo(1.2, 12);
    expect(gy).toBeCloseTo(1.6, 12);
    expect(gx * -0.8 + gy * 0.6).toBeCloseTo(0, 12);
  });
  it('N = 40: angle between gradient and segment normal at the midpoint is small', () => {
    const fn = CATALOGUE.bowl;
    const segs = marchingSquares(fn.value, fn.window, 40, 1);
    let worst = 0;
    for (const { a, b } of segs) {
      const [gx, gy] = fn.gradient((a.x + b.x) / 2, (a.y + b.y) / 2);
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      // Angle between the gradient and the normal line (sign of the normal is free).
      const cross = Math.abs(gx * ny - gy * nx);
      const dot = Math.abs(gx * nx + gy * ny);
      worst = Math.max(worst, Math.atan2(cross, dot));
    }
    // Reported number (radians), not "exact": short cut-corner chords near nodes tilt most.
    expect(worst).toBeLessThan(0.2); // observed 0.1799 rad (10.3 degrees)
    expect(worst).toBeGreaterThan(0);
  });
});

describe('level curve output', () => {
  it('is one NaN-separated polyline: two points per segment then NaN', () => {
    const segs = marchingSquares(CATALOGUE.bowl.value, CATALOGUE.bowl.window, 8, 1);
    const curve = levelCurve(segs);
    expect(curve.x).toHaveLength(3 * segs.length);
    expect(curve.y).toHaveLength(3 * segs.length);
    curve.x.forEach((v, i) => {
      expect(Number.isNaN(v)).toBe(i % 3 === 2);
      expect(Number.isNaN(curve.y[i])).toBe(i % 3 === 2);
    });
  });
  it('is empty without segments', () => {
    expect(levelCurve([])).toEqual({ x: [], y: [] });
  });
});
