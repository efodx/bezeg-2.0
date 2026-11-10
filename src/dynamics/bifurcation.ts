/** Bifurcation raster of the logistic map (phase-portraits spec, Kernel 5): deterministic, memoised on (W, bins). */
import {logisticMapAt, PERIOD_START} from './logistic';

export const BIFURCATION_R_MIN = 2.5;
export const BIFURCATION_R_MAX = 4;
export const BIFURCATION_TRANSIENT = 1000;
export const BIFURCATION_RECORDED = 300;
export const BIFURCATION_START = PERIOD_START;

export interface BifurcationRaster {
    readonly width: number;
    readonly bins: number;
    /** counts[column * bins + bin]: how many recorded iterates of the column fall in the bin (bin 0 is x near 0). */
    readonly counts: Uint16Array;
}

/** The r of column j of W (W >= 2); the last column is exactly 4. */
export const columnR = (width: number, j: number): number =>
    BIFURCATION_R_MIN + ((BIFURCATION_R_MAX - BIFURCATION_R_MIN) * j) / (width - 1);

/** The column nearest to r, clamped to the raster. The cursor reports columnR of this column, not R/100. */
export const nearestColumn = (width: number, r: number): number => {
    const j = Math.round(((r - BIFURCATION_R_MIN) / (BIFURCATION_R_MAX - BIFURCATION_R_MIN)) * (width - 1));
    return Math.max(0, Math.min(width - 1, j));
};

const cache = new Map<string, BifurcationRaster>();

export function bifurcationRaster(width: number, bins: number): BifurcationRaster {
    if (!Number.isInteger(width) || width < 2 || !Number.isInteger(bins) || bins < 1) {
        throw new RangeError('width must be an integer >= 2 and bins an integer >= 1.');
    }
    const key = `${width}x${bins}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const counts = new Uint16Array(width * bins);
    for (let j = 0; j < width; j++) {
        const f = logisticMapAt(columnR(width, j));
        let x = BIFURCATION_START;
        for (let i = 0; i < BIFURCATION_TRANSIENT; i++) x = f(x);
        for (let i = 0; i < BIFURCATION_RECORDED; i++) {
            x = f(x);
            counts[j * bins + Math.min(bins - 1, Math.floor(x * bins))]++;
        }
    }
    const raster = {width, bins, counts};
    cache.set(key, raster);
    return raster;
}
