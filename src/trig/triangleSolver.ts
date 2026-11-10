/**
 * Triangle solver for TR5 (ADR 0044 section 2). Inputs live on a finite grid: sides are multiples of 1/4 in [1/4, 12], angles
 * are integer degrees 1..179. Inputs outside the grid are rejected (`none`, reason `out-of-grid`). Discrete outcomes (valid
 * triple, number of SSA solutions) are decided exactly on the grid; computed sides, angles (radians) and area are doubles.
 *
 * Naming: the side `a` lies opposite the vertex `A`, and so on. `triangleFromSolution` places `A=(0,0)`, `B=(c,0)` and
 * `C` above the x-axis, so a drawing can be measured from its vertices instead of echoing the solver.
 *
 * SSA, exact on the grid: with `h = b sin A`, acute `A`: `a < h` none, `a = h` one (right angle at B), `h < a < b` two,
 * `a >= b` one; right or obtuse `A`: `a > b` one, otherwise none. `a = h` happens on the grid only for `A = 30` with
 * `2a = b` (Niven), decided by that integer test; for the other acute angles `a` against `h` is a double comparison whose
 * smallest relative gap on the grid is 1.1e-5 (enumerated), so it is exact, not a tolerance.
 */
export type SolveSpec =
    | { readonly type: 'sss'; readonly a: number; readonly b: number; readonly c: number }
    /** Sides `b`, `c` and the angle `angleA` between them (degrees). */
    | { readonly type: 'sas'; readonly b: number; readonly c: number; readonly angleA: number }
    /** Angles `angleA`, `angleB` (degrees) and the side `c` between them; AAS follows from the angle sum. */
    | { readonly type: 'asa'; readonly angleA: number; readonly angleB: number; readonly c: number }
    /** Sides `a`, `b` and the angle `angleA` opposite `a` (degrees). */
    | { readonly type: 'ssa'; readonly a: number; readonly b: number; readonly angleA: number };

export type NoneReason =
    | 'out-of-grid'
    | 'triangle-inequality'
    | 'angle-sum'
    | 'a-below-height'
    | 'a-not-greater-than-b';

/** Computed (double) data of one solved triangle; angles in radians. */
export interface SolvedTriangle {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly angleA: number;
    readonly angleB: number;
    readonly angleC: number;
    readonly area: number;
    readonly computed: true;
}

export type SolveResult =
    | { readonly kind: 'none'; readonly reason: NoneReason }
    /** `tangent` is set for the SSA case `a = h` (right angle at B). */
    | { readonly kind: 'one'; readonly triangle: SolvedTriangle; readonly tangent?: true }
    | { readonly kind: 'two'; readonly triangles: readonly [SolvedTriangle, SolvedTriangle] }
    | { readonly kind: 'degenerate' };

export interface Vertices {
    readonly A: { readonly x: number; readonly y: number };
    readonly B: { readonly x: number; readonly y: number };
    readonly C: { readonly x: number; readonly y: number };
}

const NONE_GRID: SolveResult = Object.freeze({kind: 'none', reason: 'out-of-grid'});
const MAX_SIDE_QUARTERS = 48;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** Side in quarter units (1..48), or undefined for a value off the grid. */
function sideQuarters(value: number): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const q = value * 4;
    return Number.isInteger(q) && q >= 1 && q <= MAX_SIDE_QUARTERS ? q : undefined;
}

function isGridAngle(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 179;
}

/** Angles from sides and area: `atan2(2 S, dot)` with `dot = (u^2 + v^2 - w^2) / 2` for the arms `u`, `v`, opposite `w`. */
function fromSidesAndArea(a: number, b: number, c: number, area: number): SolvedTriangle {
    const angle = (u: number, v: number, w: number) => Math.atan2(2 * area, (u * u + v * v - w * w) / 2);
    return {
        a, b, c, area, computed: true,
        angleA: angle(b, c, a),
        angleB: angle(a, c, b),
        angleC: angle(a, b, c),
    };
}

function solveSss(a4: number, b4: number, c4: number): SolveResult {
    const sorted = [a4, b4, c4].sort((x, y) => x - y);
    const excess = sorted[0] + sorted[1] - sorted[2];
    if (excess < 0) return {kind: 'none', reason: 'triangle-inequality'};
    if (excess === 0) return {kind: 'degenerate'};
    // 16 S^2 = (a+b+c)(-a+b+c)(a-b+c)(a+b-c); in quarter units the product is Q/256, an exact integer over 256, and S = sqrt(Q) / 64.
    const q = (a4 + b4 + c4) * (-a4 + b4 + c4) * (a4 - b4 + c4) * (a4 + b4 - c4);
    return {kind: 'one', triangle: fromSidesAndArea(a4 / 4, b4 / 4, c4 / 4, Math.sqrt(q) / 64)};
}

function solveSas(b4: number, c4: number, angleA: number): SolveResult {
    const b = b4 / 4;
    const c = c4 / 4;
    const rad = toRad(angleA);
    const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad));
    return {kind: 'one', triangle: fromSidesAndArea(a, b, c, 0.5 * b * c * Math.sin(rad))};
}

function solveAsa(angleA: number, angleB: number, c4: number): SolveResult {
    const angleC = 180 - angleA - angleB;
    if (angleC <= 0) return {kind: 'none', reason: 'angle-sum'};
    const c = c4 / 4;
    const sinC = Math.sin(toRad(angleC));
    const a = (c * Math.sin(toRad(angleA))) / sinC;
    const b = (c * Math.sin(toRad(angleB))) / sinC;
    return {kind: 'one', triangle: fromSidesAndArea(a, b, c, 0.5 * a * c * Math.sin(toRad(angleB)))};
}

export type SsaCase = 'none-below-height' | 'none-not-greater' | 'tangent' | 'two' | 'one';

/** Exact SSA case on the grid (quarter units); the single place where the rule lives. */
function ssaCase(a4: number, b4: number, angleA: number): SsaCase {
    if (angleA >= 90) return a4 > b4 ? 'one' : 'none-not-greater';
    if (a4 >= b4) return 'one';
    if (angleA === 30) {
        if (2 * a4 < b4) return 'none-below-height';
        return 2 * a4 === b4 ? 'tangent' : 'two';
    }
    // Both sides scaled by 4; a = h is impossible here (Niven), and the relative gap is at least 1.1e-5.
    return a4 < b4 * Math.sin(toRad(angleA)) ? 'none-below-height' : 'two';
}

/** Number of SSA solutions (0, 1 or 2) by the exact rule, or `undefined` for input off the grid. */
export function ssaCount(a: number, b: number, angleA: number): 0 | 1 | 2 | undefined {
    const a4 = sideQuarters(a);
    const b4 = sideQuarters(b);
    if (a4 === undefined || b4 === undefined || !isGridAngle(angleA)) return undefined;
    const kind = ssaCase(a4, b4, angleA);
    return kind === 'two' ? 2 : kind === 'one' || kind === 'tangent' ? 1 : 0;
}

function solveSsa(a4: number, b4: number, angleA: number): SolveResult {
    const kind = ssaCase(a4, b4, angleA);
    if (kind === 'none-below-height') return {kind: 'none', reason: 'a-below-height'};
    if (kind === 'none-not-greater') return {kind: 'none', reason: 'a-not-greater-than-b'};
    const a = a4 / 4;
    const b = b4 / 4;
    const rad = toRad(angleA);
    const sin = Math.sin(rad);
    const mid = b * Math.cos(rad);
    // c solves c^2 - 2 b cos(A) c + b^2 - a^2 = 0; the discriminant quarter is a^2 - h^2 (zero in the tangent case).
    const root = kind === 'tangent' ? 0 : Math.sqrt(Math.max(0, a * a - b * b * sin * sin));
    const make = (c: number) => fromSidesAndArea(a, b, c, 0.5 * b * c * sin);
    if (kind === 'two') return {kind: 'two', triangles: [make(mid + root), make(mid - root)]};
    return kind === 'tangent' ? {kind: 'one', triangle: make(mid), tangent: true} : {kind: 'one', triangle: make(mid + root)};
}

export function solveTriangle(spec: SolveSpec): SolveResult {
    switch (spec.type) {
        case 'sss': {
            const [a, b, c] = [sideQuarters(spec.a), sideQuarters(spec.b), sideQuarters(spec.c)];
            return a === undefined || b === undefined || c === undefined ? NONE_GRID : solveSss(a, b, c);
        }
        case 'sas': {
            const [b, c] = [sideQuarters(spec.b), sideQuarters(spec.c)];
            return b === undefined || c === undefined || !isGridAngle(spec.angleA) ? NONE_GRID : solveSas(b, c, spec.angleA);
        }
        case 'asa': {
            const c = sideQuarters(spec.c);
            return c === undefined || !isGridAngle(spec.angleA) || !isGridAngle(spec.angleB)
                ? NONE_GRID : solveAsa(spec.angleA, spec.angleB, c);
        }
        case 'ssa': {
            const [a, b] = [sideQuarters(spec.a), sideQuarters(spec.b)];
            return a === undefined || b === undefined || !isGridAngle(spec.angleA) ? NONE_GRID : solveSsa(a, b, spec.angleA);
        }
        default:
            return NONE_GRID;
    }
}

/** Vertices `A=(0,0)`, `B=(c,0)`, `C=((b^2+c^2-a^2)/(2c), 2S/c)`; sides, angles and area are re-measured from these. */
export function triangleFromSolution(t: SolvedTriangle): Vertices {
    return {
        A: {x: 0, y: 0},
        B: {x: t.c, y: 0},
        C: {x: (t.b * t.b + t.c * t.c - t.a * t.a) / (2 * t.c), y: (2 * t.area) / t.c},
    };
}
