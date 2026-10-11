/** The stored description of the linear-function demonstration: two points. Pure data and validation. */
export interface LinearModel {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
}

/** Coordinates and derived values must stay within this magnitude, which keeps every readout finite and drawable. */
export const LINEAR_COORDINATE_LIMIT = 1000;

export const DEFAULT_LINEAR_MODEL: LinearModel = {x1: 0, y1: 1, x2: 2, y2: 5};

export const isLinearCoordinate = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= LINEAR_COORDINATE_LIMIT;

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseLinearModel(data: unknown): LinearModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {x1, y1, x2, y2} = data as Record<string, unknown>;
    if (!isLinearCoordinate(x1) || !isLinearCoordinate(y1) || !isLinearCoordinate(x2) || !isLinearCoordinate(y2)) return undefined;
    return {x1, y1, x2, y2};
}
