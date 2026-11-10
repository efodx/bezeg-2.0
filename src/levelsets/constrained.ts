/**
 * The constrained point (ADR 0053 section 4, spec Kernels item 4).
 *
 * Line a x + b y = c with integer coefficients: the point has rational coordinates and tangency
 * det(grad f, grad g) = 0 is decided exactly in `Rational`. Circle x^2 + y^2 = r2: the point is at an angle and
 * tangency uses the named tolerance TANGENCY_SIN_TOLERANCE, reported as "approximately".
 */
import { Rational, RationalPoint } from '../compgeo/rational';
import { CATALOGUE, type CatalogueId } from './functions2';

/** Named tolerance |sin(angle between grad f and grad g)| < 0,01 for the circle tangency. */
export const TANGENCY_SIN_TOLERANCE = 0.01;

export interface Line {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

function checkLine({ a, b, c }: Line): void {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(c)) {
    throw new RangeError('line coefficients must be safe integers');
  }
  if (a === 0 && b === 0) throw new RangeError('a line needs a or b non-zero');
}

/** True when the rational has a denominator dividing 4. */
function isQuarterGrid(t: Rational): boolean {
  return 4n % t.den === 0n;
}

/** Exact gradient of the polynomial catalogue functions; `hills` has no rational gradient. */
function exactGradient(id: CatalogueId, p: RationalPoint): readonly [Rational, Rational] {
  const two = Rational.of(2);
  switch (id) {
    case 'bowl': return [p.x.mul(two), p.y.mul(two)];
    case 'saddle': return [p.x.mul(two), p.y.mul(two).neg()];
    case 'valley': return [p.x.mul(two), p.y.mul(Rational.of(20))];
    case 'product': return [p.y, p.x];
    default: throw new RangeError(`no exact gradient for ${id}`);
  }
}

/** The point of the line with a parameter that is x when b !== 0, else y (vertical line). */
function pointAt(line: Line, t: Rational): RationalPoint {
  const { a, b, c } = line;
  if (b !== 0) return new RationalPoint(t, Rational.of(c).sub(Rational.of(a).mul(t)).div(Rational.of(b)));
  return new RationalPoint(Rational.of(c, a), t);
}

/**
 * The point of the line for the parameter t on the 1/4 grid: t is x when b !== 0, else y (vertical line).
 * Coordinates are exact rationals.
 */
export function linePoint(line: Line, t: Rational): RationalPoint {
  checkLine(line);
  if (!isQuarterGrid(t)) throw new RangeError('line parameter must lie on the 1/4 grid');
  return pointAt(line, t);
}

/** det(grad f, grad g) at the point, with grad g = (a, b). Exact. */
export function lineDeterminant(id: CatalogueId, line: Line, p: RationalPoint): Rational {
  checkLine(line);
  const [fx, fy] = exactGradient(id, p);
  return fx.mul(Rational.of(line.b)).sub(fy.mul(Rational.of(line.a)));
}

export interface LineTangency {
  /** det(grad f, grad g) === 0, exact. */
  readonly tangent: boolean;
  readonly determinant: Rational;
  /** lambda with grad f = lambda grad g when tangent (0 at a stationary point). */
  readonly lambda: Rational | null;
}

export function lineTangency(id: CatalogueId, line: Line, p: RationalPoint): LineTangency {
  const determinant = lineDeterminant(id, line, p);
  const tangent = determinant.isZero();
  let lambda: Rational | null = null;
  if (tangent) {
    const [fx, fy] = exactGradient(id, p);
    lambda = line.a !== 0 ? fx.div(Rational.of(line.a)) : fy.div(Rational.of(line.b));
  }
  return { tangent, determinant, lambda };
}

export type LineTangencyPoints =
  | { readonly kind: 'point'; readonly t: Rational; readonly point: RationalPoint }
  | { readonly kind: 'none' }
  | { readonly kind: 'everywhere' };

/**
 * Where on the line the contour is tangent to it. The determinant is affine in the parameter for the polynomial
 * catalogue functions, so the zero is solved exactly (it need not lie on the 1/4 grid).
 */
export function lineTangencyPoints(id: CatalogueId, line: Line): LineTangencyPoints {
  checkLine(line);
  const at = (t: number) => lineDeterminant(id, line, pointAt(line, Rational.of(t)));
  const d0 = at(0);
  const slope = at(1).sub(d0);
  if (slope.isZero()) return d0.isZero() ? { kind: 'everywhere' } : { kind: 'none' };
  const t = d0.neg().div(slope);
  return { kind: 'point', t, point: pointAt(line, t) };
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/** The point of the circle x^2 + y^2 = r2 at angle theta (radians). */
export function circlePoint(r2: number, theta: number): Point {
  if (!Number.isSafeInteger(r2) || r2 <= 0) throw new RangeError('circle needs a positive integer r2');
  if (!Number.isFinite(theta)) throw new RangeError('angle must be finite');
  const r = Math.sqrt(r2);
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

export type CircleTangencyStatus = 'approximately-tangent' | 'not-tangent' | 'stationary';

export interface CircleTangency {
  readonly status: CircleTangencyStatus;
  /** |sin| of the angle between grad f and grad g = (2x, 2y); 0 when grad f = 0. */
  readonly sin: number;
}

export function circleTangency(id: CatalogueId, r2: number, theta: number): CircleTangency {
  const p = circlePoint(r2, theta);
  const [fx, fy] = CATALOGUE[id].gradient(p.x, p.y);
  const nf = Math.hypot(fx, fy);
  if (nf === 0) return { status: 'stationary', sin: 0 };
  const gx = 2 * p.x;
  const gy = 2 * p.y;
  const sin = Math.abs(fx * gy - fy * gx) / (nf * Math.hypot(gx, gy));
  return { status: sin < TANGENCY_SIN_TOLERANCE ? 'approximately-tangent' : 'not-tangent', sin };
}
