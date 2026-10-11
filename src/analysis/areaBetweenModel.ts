import {AreaMode, INTERSECTIONS, isAreaMode, isBound} from './areaBetween';

/** The stored description of the area-between-curves demonstration. */
export interface AreaBetweenModel {
    readonly a: number;
    readonly b: number;
    readonly mode: AreaMode;
}

/** The default bounds are the intersections 2 -+ sqrt(1.5), stored unrounded. */
export const DEFAULT_AREA_BETWEEN_MODEL: AreaBetweenModel = {a: INTERSECTIONS[0], b: INTERSECTIONS[1], mode: 'between'};

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseAreaBetweenModel(data: unknown): AreaBetweenModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {a, b, mode} = data as Record<string, unknown>;
    if (!isBound(a) || !isBound(b) || !isAreaMode(mode)) return undefined;
    return {a, b, mode};
}
