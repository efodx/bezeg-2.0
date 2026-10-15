/**
 * Extrema demonstration: candidates (endpoints, stationary points, corners), derivative signs between them and the
 * local and global classification on a closed interval [a, b], for a few named examples.
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * Convention: local extrema are RELATIVE TO THE SELECTED INTERVAL. An interior candidate is a local minimum (maximum)
 * when f decreases (increases) on the piece to its left and increases (decreases) on the piece to its right. An endpoint
 * has a one-sided neighbourhood only: a is a local minimum when f increases right of it, a local maximum when f
 * decreases; b mirrors this. A piece on which f' is zero (constant) gives "neither", because the extremum would not be
 * strict. The classification therefore never refers to values outside [a, b].
 */

/** The endpoints a and b may move in [EXTREMA_X_MIN, EXTREMA_X_MAX], which holds the extrema +-pi/2 of sin x. */
export const EXTREMA_X_MIN = -4;
export const EXTREMA_X_MAX = 4;
export const EXTREMA_X_STEP = 0.01;

export const isExtremaX = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= EXTREMA_X_MIN && value <= EXTREMA_X_MAX;

/** True for finite numbers with a < b. */
export const isInterval = (a: number, b: number): boolean => Number.isFinite(a) && Number.isFinite(b) && a < b;

export const EXTREMA_EXAMPLE_IDS = ['square', 'cube', 'abs', 'sine'] as const;
export type ExtremaExampleId = typeof EXTREMA_EXAMPLE_IDS[number];

export const isExtremaExampleId = (value: unknown): value is ExtremaExampleId =>
    typeof value === 'string' && (EXTREMA_EXAMPLE_IDS as readonly string[]).includes(value);

/**
 * Two x values closer than this are the same point (a critical point coinciding with an endpoint). It is far below the
 * 0.01 grid of the endpoints and the display precision, so it only absorbs rounding such as cos(pi / 2) = 6e-17.
 */
export const EXTREMA_POINT_TOLERANCE = 1e-9;

/**
 * Two function values closer than this are equal for the global comparison (sin pi = 1.2e-16 ties with sin 0 = 0).
 * It is far below the display precision (at most a few decimals), so a visible difference is never called a tie.
 */
export const EXTREMA_VALUE_TOLERANCE = 1e-9;

export interface ExtremaExample {
    readonly id: ExtremaExampleId;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly plain: string;
    readonly value: (x: number) => number;
    /** f'(x), or undefined where the derivative does not exist (never Infinity or NaN). */
    readonly derivative: (x: number) => number | undefined;
    /** Points of the closed interval [a, b] with f' = 0, ascending, computed analytically (callers validate a < b). */
    readonly stationaryPoints: (a: number, b: number) => readonly number[];
    /** The points at which f is continuous but not differentiable (corners), ascending. */
    readonly corners: readonly number[];
}

export const EXTREMA_EXAMPLES: Readonly<Record<ExtremaExampleId, ExtremaExample>> = {
    square: {
        id: 'square',
        latex: 'x^2',
        plain: 'x^2',
        value: x => x * x,
        derivative: x => 2 * x,
        stationaryPoints: (a, b) => (a <= 0 && 0 <= b ? [0] : []),
        corners: [],
    },
    cube: {
        id: 'cube',
        latex: 'x^3',
        plain: 'x^3',
        value: x => x * x * x,
        derivative: x => 3 * x * x,
        stationaryPoints: (a, b) => (a <= 0 && 0 <= b ? [0] : []),
        corners: [],
    },
    abs: {
        id: 'abs',
        latex: '|x|',
        plain: '|x|',
        value: x => Math.abs(x),
        derivative: x => (x > 0 ? 1 : x < 0 ? -1 : undefined),
        stationaryPoints: () => [],
        corners: [0],
    },
    // f' = cos x vanishes exactly at pi / 2 + k pi.
    sine: {
        id: 'sine',
        latex: '\\sin x',
        plain: 'sin x',
        value: x => Math.sin(x),
        derivative: x => Math.cos(x),
        stationaryPoints: (a, b) => {
            const points: number[] = [];
            const first = Math.ceil((a - Math.PI / 2) / Math.PI - EXTREMA_POINT_TOLERANCE);
            for (let k = first; ; k++) {
                const x = Math.PI / 2 + k * Math.PI;
                if (x > b + EXTREMA_POINT_TOLERANCE) break;
                points.push(x);
            }
            return points;
        },
        corners: [],
    },
};

export const extremaExample = (id: ExtremaExampleId): ExtremaExample => EXTREMA_EXAMPLES[id];

export type CandidateKind = 'endpoint' | 'stationary' | 'corner';
/** Local classification relative to the selected interval (see the module comment). */
export type LocalKind = 'localMinimum' | 'localMaximum' | 'neither';
/** Sign of f' on an open piece: -1 decreasing, 0 constant, 1 increasing. */
export type DerivativeSign = -1 | 0 | 1;

export interface ExtremaCandidate {
    readonly x: number;
    readonly value: number;
    /**
     * 'endpoint' for a and b (also when the endpoint is itself stationary or a corner: it is not duplicated),
     * 'stationary' for an interior point with f' = 0, 'corner' for an interior point where f' does not exist.
     */
    readonly kind: CandidateKind;
    /** f'(x): exactly 0 at a stationary point (also an endpoint that is one), undefined where it does not exist. */
    readonly derivative: number | undefined;
    readonly local: LocalKind;
    readonly isGlobalMinimum: boolean;
    readonly isGlobalMaximum: boolean;
}

export interface ExtremaPiece {
    readonly from: number;
    readonly to: number;
    readonly sign: DerivativeSign;
}

export interface ExtremaAnalysis {
    /** Ascending in x, without duplicates; the first is a and the last is b. */
    readonly candidates: readonly ExtremaCandidate[];
    /** The open pieces between consecutive candidates; piece i lies between candidates i and i + 1. */
    readonly pieces: readonly ExtremaPiece[];
    readonly globalMinimum: number;
    readonly globalMaximum: number;
    /** x of every candidate attaining the global minimum / maximum (ties included), ascending. */
    readonly globalMinimumAt: readonly number[];
    readonly globalMaximumAt: readonly number[];
}

const signOf = (value: number | undefined): DerivativeSign => (value === undefined || value === 0 ? 0 : value > 0 ? 1 : -1);

function localKind(left: DerivativeSign | undefined, right: DerivativeSign | undefined): LocalKind {
    // left is undefined at a, right at b; a missing side only has its own piece to decide.
    if (left === 0 || right === 0) return 'neither';
    if (left === undefined && right !== undefined) return right > 0 ? 'localMinimum' : 'localMaximum';
    if (right === undefined && left !== undefined) return left > 0 ? 'localMaximum' : 'localMinimum';
    if (left !== undefined && right !== undefined) {
        if (left < 0 && right > 0) return 'localMinimum';
        if (left > 0 && right < 0) return 'localMaximum';
    }
    return 'neither';
}

/** Candidates, derivative signs and local/global classification of f on [a, b]. Throws unless a < b. */
export function analyzeExtrema(example: ExtremaExample, a: number, b: number): ExtremaAnalysis {
    if (!isInterval(a, b)) throw new RangeError('The endpoints must be finite numbers with a < b.');
    const near = (x: number, y: number) => Math.abs(x - y) <= EXTREMA_POINT_TOLERANCE;

    interface Raw {x: number; kind: CandidateKind; derivative: number | undefined}
    const raw: Raw[] = [
        {x: a, kind: 'endpoint', derivative: example.derivative(a)},
        {x: b, kind: 'endpoint', derivative: example.derivative(b)},
    ];
    const addCritical = (x: number, kind: 'stationary' | 'corner') => {
        const derivative = kind === 'stationary' ? 0 : undefined;
        const endpoint = raw.slice(0, 2).find(e => near(e.x, x));
        if (endpoint) endpoint.derivative = derivative; // the endpoint is the candidate, not a duplicate
        else raw.push({x, kind, derivative});
    };
    example.stationaryPoints(a, b).forEach(x => addCritical(x, 'stationary'));
    example.corners.filter(x => x >= a - EXTREMA_POINT_TOLERANCE && x <= b + EXTREMA_POINT_TOLERANCE)
        .forEach(x => addCritical(x, 'corner'));
    raw.sort((p, q) => p.x - q.x);

    const pieces: ExtremaPiece[] = [];
    for (let i = 0; i + 1 < raw.length; i++) {
        const from = raw[i].x;
        const to = raw[i + 1].x;
        pieces.push({from, to, sign: signOf(example.derivative((from + to) / 2))});
    }

    const values = raw.map(r => example.value(r.x));
    const globalMinimum = Math.min(...values);
    const globalMaximum = Math.max(...values);
    const candidates: ExtremaCandidate[] = raw.map((r, i) => ({
        x: r.x,
        value: values[i],
        kind: r.kind,
        derivative: r.derivative,
        local: localKind(i > 0 ? pieces[i - 1].sign : undefined, i < pieces.length ? pieces[i].sign : undefined),
        isGlobalMinimum: values[i] - globalMinimum <= EXTREMA_VALUE_TOLERANCE,
        isGlobalMaximum: globalMaximum - values[i] <= EXTREMA_VALUE_TOLERANCE,
    }));
    return {
        candidates,
        pieces,
        globalMinimum,
        globalMaximum,
        globalMinimumAt: candidates.filter(c => c.isGlobalMinimum).map(c => c.x),
        globalMaximumAt: candidates.filter(c => c.isGlobalMaximum).map(c => c.x),
    };
}
