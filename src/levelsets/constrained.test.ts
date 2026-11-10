import { describe, expect, it } from 'vitest';
import { Rational, RationalPoint } from '../compgeo/rational';
import {
  circlePoint,
  circleTangency,
  linePoint,
  lineTangency,
  lineTangencyPoints,
  TANGENCY_SIN_TOLERANCE,
} from './constrained';

const R = (n: number, d = 1) => Rational.of(n, d);
const LINE = { a: 1, b: 2, c: 5 }; // x + 2y = 5

describe('point on a line is rational', () => {
  it('x on the 1/4 grid gives y = (5 - x)/2 exactly', () => {
    const p = linePoint(LINE, R(1, 4));
    expect(p.x.format()).toBe('1/4');
    expect(p.y.format()).toBe('19/8'); // (5 - 1/4)/2 = 19/8 by hand
    expect(p.x.add(p.y.mul(R(2))).equals(R(5))).toBe(true);
  });

  it('vertical line 2x = 3 is parametrised by y', () => {
    const p = linePoint({ a: 2, b: 0, c: 3 }, R(-3, 4));
    expect(p.x.format()).toBe('3/2');
    expect(p.y.format()).toBe('-3/4');
  });

  it('rejects an off-grid parameter', () => {
    expect(() => linePoint(LINE, R(1, 3))).toThrow(RangeError);
    expect(() => linePoint(LINE, R(1, 8))).toThrow(RangeError);
  });
});

describe('exact line tangency (LS4)', () => {
  it('bowl on x + 2y = 5: tangent at (1,2) with lambda = 2, grad f = (2,4)', () => {
    const t = lineTangency('bowl', LINE, linePoint(LINE, R(1)));
    expect(t.tangent).toBe(true);
    expect(t.determinant.isZero()).toBe(true);
    expect(t.lambda?.format()).toBe('2');
  });

  it('determinant is 4x - 2y by hand (y = (5 - x)/2), so x = 1 is the only zero', () => {
    for (let q = -40; q <= 40; q += 1) {
      const x = R(q, 4);
      const t = lineTangency('bowl', LINE, linePoint(LINE, x));
      const y = R(5).sub(x).div(R(2));
      expect(t.determinant.equals(x.mul(R(4)).sub(y.mul(R(2))))).toBe(true);
      expect(t.tangent).toBe(q === 4);
    }
  });

  it('a near miss is not tangent: no tolerance on lines', () => {
    // x = 1 + 1/4 gives det = 4x - 2y = 4*5/4 - 2*15/8 = 5/4, nonzero
    const t = lineTangency('bowl', LINE, linePoint(LINE, R(5, 4)));
    expect(t.tangent).toBe(false);
    expect(t.determinant.format()).toBe('5/4');
    expect(t.lambda).toBeNull();
  });

  it('a determinant of 5e-12 is still not tangent (no tolerance)', () => {
    const x = R(1).add(R(1, 1000000000000));
    const y = R(5).sub(x).div(R(2));
    const t = lineTangency('bowl', LINE, new RationalPoint(x, y));
    expect(t.determinant.format()).toBe('1/200000000000');
    expect(t.tangent).toBe(false);
  });

  it('solves the tangency exactly, also off the 1/4 grid', () => {
    const r = lineTangencyPoints('bowl', LINE);
    expect(r.kind).toBe('point');
    if (r.kind === 'point') {
      expect(r.point.x.format()).toBe('1');
      expect(r.point.y.format()).toBe('2');
    }
    // x^2 + y^2 on 3x + y = 5: Lagrange by hand, (x,y) = lambda/2... point (3/2, 1/2): grad f = (3,1) = 1 (3,1)
    const s = lineTangencyPoints('bowl', { a: 3, b: 1, c: 5 });
    expect(s.kind).toBe('point');
    if (s.kind === 'point') {
      expect(s.point.x.format()).toBe('3/2');
      expect(s.point.y.format()).toBe('1/2');
    }
    // x^2 + 10y^2 on x + y = 11: minimise by hand: 2x = lambda, 20y = lambda -> x = 10y, 11y = 11, (10,1)
    const v = lineTangencyPoints('valley', { a: 1, b: 1, c: 11 });
    expect(v.kind === 'point' && v.point.x.format() === '10' && v.point.y.format() === '1').toBe(true);
  });

  it('agrees with brute-force minimisation along the line (bowl, valley)', () => {
    for (const id of ['bowl', 'valley'] as const) {
      const f = (x: number, y: number) => (id === 'bowl' ? x * x + y * y : x * x + 10 * y * y);
      const line = { a: 2, b: 3, c: 7 };
      let best = Infinity;
      let bestX = 0;
      for (let i = -400000; i <= 400000; i += 1) {
        const x = i / 20000;
        const v = f(x, (7 - 2 * x) / 3);
        if (v < best) {
          best = v;
          bestX = x;
        }
      }
      const r = lineTangencyPoints(id, line);
      expect(r.kind).toBe('point');
      if (r.kind === 'point') expect(Math.abs(r.point.x.toNumber() - bestX)).toBeLessThan(1e-4);
    }
  });

  it('reports no tangency or tangency everywhere without inventing a point', () => {
    // product xy on y = 3: grad f = (3, x), grad g = (0,1), det = 3 for all x, never 0
    expect(lineTangencyPoints('product', { a: 0, b: 1, c: 3 }).kind).toBe('none');
    // bowl on y = 0: grad g = (0,1), det = 2x, tangent only at x = 0
    const r = lineTangencyPoints('bowl', { a: 0, b: 1, c: 0 });
    expect(r.kind === 'point' && r.point.x.isZero()).toBe(true);
    // saddle on x - y = 0: grad f = (2x, -2x) = 2x (1,-1), so det = 0 at every point (the line is the contour f = 0)
    expect(lineTangencyPoints('saddle', { a: 1, b: -1, c: 0 }).kind).toBe('everywhere');
    // bowl on x + y = 0: det = 4x, not identically zero
    expect(lineTangencyPoints('bowl', { a: 1, b: 1, c: 0 }).kind).toBe('point');
  });

  it('hills has no rational gradient', () => {
    expect(() => lineTangency('hills', LINE, linePoint(LINE, R(1)))).toThrow(RangeError);
  });
});

describe('circle tangency uses the named tolerance (LS4)', () => {
  const r2 = 2;

  it('the tolerance is 0,01', () => {
    expect(TANGENCY_SIN_TOLERANCE).toBe(0.01);
  });

  it('|sin| = |cos 2 theta| for xy on x^2+y^2=2 (closed form by hand)', () => {
    for (let i = 0; i < 360; i += 1) {
      const theta = (i * Math.PI) / 180;
      expect(circleTangency('product', r2, theta).sin).toBeCloseTo(Math.abs(Math.cos(2 * theta)), 12);
    }
  });

  it('four tangency points at the odd multiples of pi/4, values +-1 (maxima and minima)', () => {
    const want = [1, -1, 1, -1];
    for (let k = 0; k < 4; k += 1) {
      const theta = Math.PI / 4 + (k * Math.PI) / 2;
      const t = circleTangency('product', r2, theta);
      expect(t.status).toBe('approximately-tangent');
      const p = circlePoint(r2, theta);
      expect(p.x * p.y).toBeCloseTo(want[k], 12);
    }
  });

  it('flagged angles form four clusters, total share 2 asin(0,01)/pi', () => {
    const N = 360000;
    let flagged = 0;
    let clusters = 0;
    let prev = false;
    const first = circleTangency('product', r2, 0).status === 'approximately-tangent';
    for (let i = 0; i < N; i += 1) {
      const on = circleTangency('product', r2, (2 * Math.PI * i) / N).status === 'approximately-tangent';
      if (on) flagged += 1;
      if (on && !prev) clusters += 1;
      prev = on;
    }
    if (first && prev) clusters -= 1; // wrap-around
    expect(clusters).toBe(4);
    // |cos 2t| < 0,01 iff |2t - pi/2 - k pi| < asin(0,01): four windows of width asin(0,01) in t
    const expectedFraction = (4 * Math.asin(0.01)) / (2 * Math.PI);
    expect(flagged / N).toBeCloseTo(expectedFraction, 3);
  });

  it('just outside the tolerance is not tangent, just inside is', () => {
    const half = Math.asin(0.01) / 2; // |cos 2t| = sin(2 dt) < 0,01 where t = pi/4 + dt
    expect(circleTangency('product', r2, Math.PI / 4 + half * 0.98).status).toBe('approximately-tangent');
    expect(circleTangency('product', r2, Math.PI / 4 + half * 1.02).status).toBe('not-tangent');
  });

  it('the radial gradient of the bowl is tangent everywhere on a circle, the saddle is not', () => {
    expect(circleTangency('bowl', 1, 0.3).status).toBe('approximately-tangent');
    expect(circleTangency('saddle', 1, 0.3).status).toBe('not-tangent');
  });

  it('invalid circle or angle throws RangeError', () => {
    expect(() => circlePoint(0, 0)).toThrow(RangeError);
    expect(() => circlePoint(-2, 0)).toThrow(RangeError);
    expect(() => circlePoint(1.5, 0)).toThrow(RangeError);
    expect(() => circlePoint(2, Number.NaN)).toThrow(RangeError);
  });
});

describe('invalid line input throws RangeError', () => {
  it('a = b = 0 and non-integer coefficients', () => {
    const p = linePoint(LINE, R(1));
    expect(() => linePoint({ a: 0, b: 0, c: 1 }, R(0))).toThrow(RangeError);
    expect(() => lineTangency('bowl', { a: 0, b: 0, c: 1 }, p)).toThrow(RangeError);
    expect(() => lineTangencyPoints('bowl', { a: 0, b: 0, c: 0 })).toThrow(RangeError);
    expect(() => linePoint({ a: 1.5, b: 1, c: 1 }, R(0))).toThrow(RangeError);
  });
});
