// Drawable samples (randomness spec, F2a decisions). The kernel runners return tallies only; the graph also draws the path of a ball, the
// coordinates of a point, the path of a walk and the sample behind an interval. These functions read the SAME seeded stream with the SAME
// decisions as the runners (integer comparisons, same draw order), so a range of trials here is exactly that range of trials of the run:
// tallies computed from these samples equal the runner's tallies (oracle tests). Pure TypeScript; no allocation per draw.
import {createPcg32} from './pcg32';
import {bernoulliThreshold} from './samplers';
import {INTERVAL_POPULATION_SIZE, insideQuarterDiscUint32, intervalCoverLimit} from './runners';

const TWO32 = 4294967296;

/** Largest number of trials one call returns (the graph draws a few hundred objects). */
export const SAMPLE_COUNT_MAX = 1000;

function checkRange(first: number, count: number): void {
    if (!Number.isInteger(first) || first < 1) throw new RangeError('first must be a whole number from 1');
    if (!Number.isInteger(count) || count < 0 || count > SAMPLE_COUNT_MAX) throw new RangeError(`count must be a whole number from 0 to ${SAMPLE_COUNT_MAX}`);
}

function skip(rng: {next(): number}, draws: number): void {
    for (let i = 0; i < draws; i++) rng.next();
}

export interface BallPaths {
    readonly rows: number;
    /** Balls first ... first + count - 1 (1-based numbers of the run). */
    readonly first: number;
    readonly count: number;
    /** `rights[b * (rows + 1) + r]` = right bounces of ball b after r pegs (r = 0 ... rows); the last one is the slot. */
    readonly rights: Uint8Array;
}

/** The paths of balls `first` ... `first + count - 1` of the Galton run `runGalton(seed, rows, pPercent, ...)`. */
export function galtonBallPaths(seed: number, rows: number, pPercent: number, first: number, count: number): BallPaths {
    checkRange(first, count);
    if (!Number.isInteger(rows) || rows < 1 || rows > 64) throw new RangeError('rows must be a whole number from 1 to 64');
    const threshold = bernoulliThreshold(pPercent);
    const rng = createPcg32(seed);
    skip(rng, (first - 1) * rows);
    const rights = new Uint8Array(count * (rows + 1));
    for (let b = 0; b < count; b++) {
        let slot = 0;
        for (let r = 0; r < rows; r++) {
            if (rng.next() < threshold) slot++;
            rights[b * (rows + 1) + r + 1] = slot;
        }
    }
    return {rows, first, count, rights};
}

/** Slot of ball b (0-based within the range) of a path set. */
export const ballSlot = (paths: BallPaths, b: number): number => paths.rights[b * (paths.rows + 1) + paths.rows];

export interface PointSamples {
    readonly first: number;
    readonly count: number;
    /** Coordinates in [0, 1): the uint32 draw divided by 2^32. */
    readonly x: Float64Array;
    readonly y: Float64Array;
    /** 1 when the point lies in the quarter disc (exact integer test of the runner, not computed from x and y). */
    readonly inside: Uint8Array;
}

/** Points `first` ... `first + count - 1` of `runArea(seed, ...)` (two draws each, x first). */
export function areaPoints(seed: number, first: number, count: number): PointSamples {
    checkRange(first, count);
    const rng = createPcg32(seed);
    skip(rng, 2 * (first - 1));
    const x = new Float64Array(count);
    const y = new Float64Array(count);
    const inside = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
        const ux = rng.next();
        const uy = rng.next();
        x[i] = ux / TWO32;
        y[i] = uy / TWO32;
        inside[i] = insideQuarterDiscUint32(ux, uy) ? 1 : 0;
    }
    return {first, count, x, y, inside};
}

export interface WalkPaths {
    readonly steps: number;
    readonly first: number;
    readonly count: number;
    /** `positions[w * (steps + 1) + s]` = position of walk w after s steps (s = 0 ... steps), +1 for a set top bit of the draw. */
    readonly positions: Int16Array;
}

/** The paths of walks `first` ... `first + count - 1` of `runWalks(seed, ..., steps, ...)`. */
export function walkPaths(seed: number, steps: number, first: number, count: number): WalkPaths {
    checkRange(first, count);
    if (!Number.isInteger(steps) || steps < 1 || steps > 4096) throw new RangeError('steps must be a whole number from 1 to 4096');
    const rng = createPcg32(seed);
    skip(rng, (first - 1) * steps);
    const positions = new Int16Array(count * (steps + 1));
    for (let w = 0; w < count; w++) {
        let position = 0;
        for (let s = 0; s < steps; s++) {
            position += rng.next() >>> 31 === 1 ? 1 : -1;
            positions[w * (steps + 1) + s + 1] = position;
        }
    }
    return {steps, first, count, positions};
}

export interface IntervalSamples {
    readonly sampleSize: number;
    readonly first: number;
    readonly count: number;
    /** Sum of the sample draws of each interval (integers from 0 ... 99). */
    readonly sums: Float64Array;
    /** 1 when the interval misses the true mean 49,5: the runner's integer test |2S - 99 n| <= L fails. */
    readonly missed: Uint8Array;
}

/**
 * Samples of intervals `first` ... `first + count - 1` of `runIntervals(seed, ...)`: uniform integers 0 ... 99 by Lemire's bounded draw
 * (the runner's sampler, including its rejections, so the stream stays in step). Skipping to `first` draws the earlier samples too.
 */
export function intervalSamples(seed: number, sampleSize: number, first: number, count: number): IntervalSamples {
    checkRange(first, count);
    const limit = intervalCoverLimit(sampleSize);
    const m = INTERVAL_POPULATION_SIZE;
    const reject = TWO32 % m;
    const rng = createPcg32(seed);
    const draw = (): number => {
        for (;;) {
            const product = rng.next() * m;
            const high = Math.floor(product / TWO32);
            if (product - high * TWO32 >= reject) return high;
        }
    };
    for (let i = 0; i < (first - 1) * sampleSize; i++) draw();
    const sums = new Float64Array(count);
    const missed = new Uint8Array(count);
    const center = (m - 1) * sampleSize;
    for (let r = 0; r < count; r++) {
        let sum = 0;
        for (let i = 0; i < sampleSize; i++) sum += draw();
        sums[r] = sum;
        const deviation = 2 * sum - center;
        missed[r] = deviation > limit || deviation < -limit ? 1 : 0;
    }
    return {sampleSize, first, count, sums, missed};
}

/** Half-width of the interval in value units, 1,96 sigma / sqrt(n) with sigma^2 = (100^2 - 1) / 12 (display; the miss decision is the integer test). */
export const intervalHalfWidth = (sampleSize: number): number => 1.96 * Math.sqrt((INTERVAL_POPULATION_SIZE * INTERVAL_POPULATION_SIZE - 1) / 12 / sampleSize);
