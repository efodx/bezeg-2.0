/**
 * One-shot "open as Bezier" handoff (ADR 0038): control points carried in React Router `location.state` under their own
 * field, next to the Demonstration return context. Never trusted: the reader validates shape and count, and anything else is
 * ignored (the Bezier graph then shows its default scene).
 */
export type BezierHandoff = Readonly<{kind: 'bezier-points'; points: ReadonlyArray<readonly [number, number]>}>;

export const BEZIER_ROUTE_PATH = '/bezeg-2.0/bezier/curve';
/** A Bezier curve needs two control points at least; 16 matches the B-spline graphs' point cap. */
export const BEZIER_HANDOFF_MIN_POINTS = 2;
export const BEZIER_HANDOFF_MAX_POINTS = 16;

const field = 'bezierHandoff';

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Router state carrying the points, keeping every other field (the return context) of `state`. */
export function withBezierHandoff(state: unknown, points: ReadonlyArray<readonly [number, number]>): Record<string, unknown> {
    const handoff: BezierHandoff = {kind: 'bezier-points', points: points.map(p => [p[0], p[1]] as const)};
    return {...(isRecord(state) ? state : {}), [field]: handoff};
}

/** `state` without the handoff field; the same object when it has none. */
export function withoutBezierHandoff(state: unknown): unknown {
    if (!isRecord(state) || !(field in state)) return state;
    const {[field]: _removed, ...rest} = state;
    return rest;
}

export function hasBezierHandoff(state: unknown): boolean {
    return isRecord(state) && field in state;
}

/** The validated points of a handoff, or undefined for anything malformed. Never throws. */
export function readBezierHandoff(state: unknown): BezierHandoff | undefined {
    if (!isRecord(state)) return undefined;
    const candidate = state[field];
    if (!isRecord(candidate) || candidate.kind !== 'bezier-points') return undefined;
    const points = candidate.points;
    if (!Array.isArray(points) || points.length < BEZIER_HANDOFF_MIN_POINTS || points.length > BEZIER_HANDOFF_MAX_POINTS) return undefined;
    const out: Array<readonly [number, number]> = [];
    for (const point of points) {
        if (!Array.isArray(point) || point.length !== 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])
            || typeof point[0] !== 'number' || typeof point[1] !== 'number') return undefined;
        out.push([point[0], point[1]]);
    }
    return {kind: 'bezier-points', points: out};
}
