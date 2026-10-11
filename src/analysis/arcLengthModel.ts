import {isBound, isSegmentCount} from './arcLength';

/** The stored description of the arc-length demonstration (the curve is always sin x). */
export interface ArcLengthModel {
    readonly a: number;
    readonly b: number;
    readonly n: number;
}

/** The default endpoints are 0 and pi (stored unrounded) with two segments. */
export const DEFAULT_ARC_LENGTH_MODEL: ArcLengthModel = {a: 0, b: Math.PI, n: 2};

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseArcLengthModel(data: unknown): ArcLengthModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {a, b, n} = data as Record<string, unknown>;
    if (!isBound(a) || !isBound(b) || !isSegmentCount(n)) return undefined;
    return {a, b, n};
}
