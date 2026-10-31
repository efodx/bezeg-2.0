/**
 * Integer grid points for the computational-geometry core (ADR 0021). Predicates see grid units only; a graph maps
 * them to the board with a power-of-two scale. Every coordinate is a safe integer with |c| <= GRID_COORD_LIMIT,
 * which keeps degree-two predicates such as `orient` exact in plain doubles.
 */
export interface GridPoint {
    readonly x: number;
    readonly y: number;
}

/** 2^25: coordinate differences stay within 2^26, so orientation products stay within 2^52. */
export const GRID_COORD_LIMIT = 2 ** 25;

export function isGridCoordinate(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= GRID_COORD_LIMIT;
}

export function isGridPoint(value: unknown): value is GridPoint {
    if (value === null || typeof value !== 'object') return false;
    const {x, y} = value as Record<string, unknown>;
    return isGridCoordinate(x) && isGridCoordinate(y);
}

/** Throws a RangeError for a point a predicate cannot evaluate exactly; predicates reject rather than approximate. */
export function assertGridPoint(point: GridPoint, name = 'point'): void {
    if (!isGridPoint(point)) {
        throw new RangeError(`${name} must have integer coordinates with |c| <= ${GRID_COORD_LIMIT}`);
    }
}
