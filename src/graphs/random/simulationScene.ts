import {
    curveCounts, fairCoinBandHalfWidth, frequencySd, markovProbabilityCurve, missCountWindow, percentFraction, type RandomExact, type RandomSim,
    type RandomState,
} from '../../random/randomModel';
import {areaPoints, galtonBallPaths, intervalHalfWidth, intervalSamples, walkPaths} from '../../random/samplePaths';

/**
 * The numbers the simulation graph draws, as plain polylines (no JSXGraph, no React). One layer is one board curve; `NaN` breaks it into
 * pieces, so a whole picture (all pegs, all intervals, all points) is one object. The tallies come from `simulate`, the exact curves
 * from `exactFor`, and the drawn paths, points and samples from `samplePaths` (the same seeded stream), so the picture is the run.
 */

export interface Layer {
    readonly x: readonly number[];
    readonly y: readonly number[];
}

export type CaptionKey =
    | 'heap' | 'bars' | 'path'
    | 'running' | 'half' | 'band' | 'logAxis'
    | 'points' | 'circle' | 'estimate' | 'truth' | 'inside' | 'outside' | 'errorBar'
    | 'walks' | 'funnel' | 'walkHeap' | 'walkExact'
    | 'share' | 'exactA' | 'stationary'
    | 'mean' | 'miss' | 'cover'
    | 'circleWhole' | 'diff' | 'diffBand' | 'diffScale' | 'seedOne' | 'seedTwo'
    | 'box' | 'boxStart' | 'move' | 'missLaw' | 'missRun';

export interface Caption {
    readonly key: CaptionKey;
    readonly x: number;
    readonly y: number;
    /** Optional number the caption names (how many paths, points or intervals are drawn). */
    readonly count?: number;
    /** Stack row from the top (`top`) or the bottom (`bottom`) edge of the board: the graph stands the caption there in pixels, in a band above the scene frame, whatever the board size; `x` is still its data x. */
    readonly top?: number;
    readonly bottom?: number;
    /** Pixels under the horizontal axis (y = 0): the caption stands there whatever the board size (the tick numbers take the first 24). */
    readonly axis?: number;
    /** The caption stands under the previous one, whose height (it wraps on a narrow board) the graph measures. */
    readonly after?: true;
    /**
     * Other numbers the caption names: `box`, `boxStart` [state 0 or 1]; `move` [from, to, numerator, denominator]; `diffScale` [heads];
     * `seedOne`, `seedTwo` [seed]; `missLaw` [intervals, first count, last count]; `missRun` [misses].
     */
    readonly values?: readonly number[];
}

export interface SceneData {
    /** left, top, right, bottom of the board. */
    readonly frame: readonly [number, number, number, number];
    readonly layers: Readonly<Record<string, Layer>>;
    readonly captions: readonly Caption[];
}

/** Most paths drawn at once for balls and walks, points, and intervals. */
export const PATHS_DRAWN = 10;
export const POINTS_DRAWN = 300;
export const INTERVALS_DRAWN = 100;

export const EMPTY_LAYER: Layer = {x: [], y: []};
const BREAK = Number.NaN;

/** Joins polylines into one, with a NaN between pieces. */
function join(pieces: ReadonlyArray<{x: number[]; y: number[]}>): Layer {
    const x: number[] = [];
    const y: number[] = [];
    pieces.forEach((piece, i) => {
        if (i > 0) { x.push(BREAK); y.push(BREAK); }
        x.push(...piece.x);
        y.push(...piece.y);
    });
    return {x, y};
}

/** A small plus mark at each point, `size` is the half-length in board units. */
function marks(xs: ArrayLike<number>, ys: ArrayLike<number>, indices: readonly number[], size: number, sizeY = size): Layer {
    return join(indices.flatMap(i => [
        {x: [xs[i] - size, xs[i] + size], y: [ys[i], ys[i]]},
        {x: [xs[i], xs[i]], y: [ys[i] - sizeY, ys[i] + sizeY]},
    ]));
}

/** Outline of a histogram with unit-wide bars centred on `centres`: one polyline along the tops. */
function verticalBars(centres: readonly number[], heights: readonly number[], halfWidth: number): Layer {
    const x: number[] = [];
    const y: number[] = [];
    centres.forEach((c, i) => {
        x.push(c - halfWidth, c - halfWidth, c + halfWidth, c + halfWidth);
        y.push(0, heights[i], heights[i], 0);
    });
    return {x, y};
}

/** Bars drawn sideways from the line x = base, for positions on the y axis. */
function horizontalBars(base: number, positions: readonly number[], lengths: readonly number[], halfWidth: number): Layer {
    const x: number[] = [];
    const y: number[] = [];
    positions.forEach((p, i) => {
        x.push(base, base + lengths[i], base + lengths[i], base);
        y.push(p - halfWidth, p - halfWidth, p + halfWidth, p + halfWidth);
    });
    return {x, y};
}

const logAxis = (n: number): number => Math.max(Math.log10(Math.max(n, 1)), 0.3);

/** The log-scaled running curve: x = log10 of the trial count, y = tally / count, for the counts from 1. */
function running(curve: {readonly at: readonly number[]; readonly tally: readonly number[]}): Layer {
    const x: number[] = [];
    const y: number[] = [];
    curve.at.forEach((count, i) => {
        if (count < 1) return;
        x.push(Math.log10(count));
        y.push(curve.tally[i] / count);
    });
    return {x, y};
}

/** `sim2` is the run of `state.seed2` when a second seed is drawn over the first (modes galton, frequency, walk and markov). */
export function sceneFor(state: RandomState, sim: RandomSim, exact: RandomExact, sim2?: RandomSim): SceneData {
    switch (state.mode) {
        case 'galton': return galtonScene(state, sim, exact, sim2);
        case 'frequency': return frequencyScene(state, sim, sim2);
        case 'area': return areaScene(state, sim);
        case 'walk': return walkScene(state, sim, exact, sim2);
        case 'markov': return markovScene(state, sim, exact, sim2);
        case 'interval': return intervalScene(state, sim, exact);
    }
}

/** The captions that tell the two seeds apart (solid: the seed field, dotted: the second seed); present only while a second run is drawn. */
function seedCaptions(state: RandomState, sim2: RandomSim | undefined, x: number, y: number, dy: number, topRow?: number): Caption[] {
    if (!sim2) return [];
    return [{key: 'seedOne', x, y, values: [state.seed], ...(topRow === undefined ? {} : {top: topRow})}, {key: 'seedTwo', x, y: y - dy, values: [state.seed2], ...(topRow === undefined ? {} : {top: topRow + 1})}];
}

function galtonScene(state: RandomState, sim: RandomSim, exact: RandomExact, sim2?: RandomSim): SceneData {
    if (sim.kind !== 'galton' || exact.kind !== 'galton') throw new Error('galton scene needs galton data');
    const rows = state.rows;
    const slots = Array.from({length: rows + 1}, (_, k) => k);
    const freq = sim.counts.map(c => (sim.trials > 0 ? c / sim.trials : 0));
    const freq2 = sim2?.kind === 'galton' ? sim2.counts.map(c => (sim2.trials > 0 ? c / sim2.trials : 0)) : [];
    const height = Math.max(Math.max(...exact.masses) * 1.35, Math.max(...freq, ...freq2) * 1.05, 0.05);
    const yPath = (r: number) => -height * (0.1 + (0.85 * r) / rows);
    const xPath = (r: number, rights: number) => rows / 2 + (2 * rights - r) / 2;
    const pegs: Array<{x: number[]; y: number[]}> = [];
    for (let r = 0; r < rows; r++) for (let j = 0; j <= r; j++) pegs.push({x: [xPath(r, j) - 0.05, xPath(r, j) + 0.05], y: [yPath(r), yPath(r)]});
    const drawn = Math.min(sim.trials, PATHS_DRAWN);
    const paths = galtonBallPaths(state.seed, rows, state.pPercent, 1, drawn);
    const polyline = (b: number) => ({
        x: slots.map(r => xPath(r, paths.rights[b * (rows + 1) + r])),
        y: slots.map(r => yPath(r)),
    });
    const earlier = Array.from({length: Math.max(drawn - 1, 0)}, (_, b) => polyline(b));
    const latest = drawn > 0 ? polyline(drawn - 1) : {x: [], y: []};
    const heap2 = sim2?.kind === 'galton' ? verticalBars(slots, freq2, 0.5) : EMPTY_LAYER;
    return {
        frame: [-1, height * 1.12, rows + 1, -height * 1.08],
        layers: {
            heap: verticalBars(slots, freq, 0.5),
            heap2,
            bars: verticalBars(slots, exact.masses, 0.5),
            pegs: join(pegs),
            paths: join(earlier),
            latest,
        },
        captions: [
            // Right of the vertical axis, and the path caption under the axis labels: no axis line strikes through a caption.
            // The heap and bar captions stand in a pixel band above the frame (above every bar, which reach at most 0.96 of `height`).
            {key: 'heap', x: 0.1, y: height * 1.08, top: 0},
            {key: 'bars', x: 0.1, y: height * 0.98, top: 1},
            {key: 'path', x: 0.1, y: -height * 0.15, count: drawn, bottom: 0},
            ...seedCaptions(state, sim2, 0.1, height * 0.88, height * 0.1, 2),
        ],
    };
}

/** Height of one caption row above a plot, in plot units, and the top of the plot the captions stay clear of: the captions get their own band, the data lines never run through them. */
export const CAPTION_ROW = 0.11;
export const PLOT_TOP = 1.08;
/** The title of a logarithmic axis: under the tick labels (about 0.1 below the axis on the narrowest board), clear of the rows below it. */
export const LOG_TITLE_Y = -0.17;

/** Centres of `rows` caption rows stacked above `PLOT_TOP`, the first row on top. */
const bandRow = (rows: number, i: number) => PLOT_TOP + CAPTION_ROW * (rows - i);

/** Position of the second plot (heads minus half the tosses) under the running frequency: centre line and half height. */
const DIFF_CENTRE = -0.88;
const DIFF_HALF = 0.4;

function frequencyScene(state: RandomState, sim: RandomSim, sim2?: RandomSim): SceneData {
    if (sim.kind !== 'frequency') throw new Error('frequency scene needs frequency data');
    const xmax = logAxis(state.n);
    const band = curveCounts(state.n).filter(c => c >= 1);
    const width = band.map(c => fairCoinBandHalfWidth(c));
    const upper = band.map((c, i) => Math.min(1, 0.5 + width[i] / c));
    const lower = band.map((c, i) => Math.max(0, 0.5 - width[i] / c));
    const xs = band.map(c => Math.log10(c));
    const second = sim2?.kind === 'frequency' ? sim2 : undefined;
    // Heads minus n/2 at the sampled counts; the vertical scale holds the exact band at n and every drawn value.
    const gap = (curve: {readonly at: readonly number[]; readonly tally: readonly number[]}) => {
        const x: number[] = [];
        const y: number[] = [];
        curve.at.forEach((count, i) => {
            if (count < 1) return;
            x.push(Math.log10(count));
            y.push(curve.tally[i] - count / 2);
        });
        return {x, y};
    };
    const own = gap(sim.curve);
    const other = second ? gap(second.curve) : {x: [], y: []};
    const scale = Math.max(width[width.length - 1] ?? 1, ...own.y.map(Math.abs), ...other.y.map(Math.abs));
    const place = (d: number) => DIFF_CENTRE + (DIFF_HALF * d) / scale;
    const rows = 3 + (second ? 2 : 0);
    return {
        frame: [-0.12 * xmax - 0.1, PLOT_TOP + 0.04, xmax * 1.05 + 0.1, -1.3],
        layers: {
            running: running(sim.curve),
            running2: second ? running(second.curve) : EMPTY_LAYER,
            half: {x: [0, xmax], y: [0.5, 0.5]},
            band: join([{x: xs, y: upper}, {x: xs, y: lower}]),
            diff: {x: own.x, y: own.y.map(place)},
            diff2: {x: other.x, y: other.y.map(place)},
            diffBand: join([{x: xs, y: width.map(place)}, {x: xs, y: width.map(w => place(-w))}]),
            diffZero: {x: [0, xmax], y: [DIFF_CENTRE, DIFF_CENTRE]},
        },
        captions: [
            // The three rows (five with the second seed) stand in a pixel band above the plot, the scale note in one under the lower plot.
            {key: 'running', x: 0.05 * xmax, y: bandRow(rows, 0), top: 0},
            {key: 'half', x: 0.05 * xmax, y: bandRow(rows, 1), top: 1},
            {key: 'band', x: 0.05 * xmax, y: bandRow(rows, 2), top: 2},
            {key: 'logAxis', x: xmax * 0.25, y: LOG_TITLE_Y, axis: 30},
            ...seedCaptions(state, second, 0.05 * xmax, bandRow(rows, 3), CAPTION_ROW, 3),
            {key: 'diff', x: 0.05 * xmax, y: -1.5, bottom: 2},
            {key: 'diffBand', x: 0.05 * xmax, y: -1.4, bottom: 1},
            {key: 'diffScale', x: 0.05 * xmax, y: -1.34, values: [scale], bottom: 0},
        ],
    };
}

interface AreaLayout {
    readonly frame: [number, number, number, number];
    /** Horizontal centre of the estimate panel and the ends of the true-value line. */
    readonly centre: number;
    readonly truth: [number, number];
    readonly mark: number;
}
const AREA_LAYOUT: Readonly<Record<RandomState['areaShape'], AreaLayout>> = {
    quarter: {frame: [-0.12, 1.12, 2.4, -0.12], centre: 1.8, truth: [1.3, 2.3], mark: 0.012},
    disc: {frame: [-1.12, 1.12, 3.4, -1.12], centre: 2.5, truth: [1.7, 3.3], mark: 0.024},
};
/** The whole-disc picture puts the i-th point of the stream into quadrant i mod 4: signs of x and y. */
const QUADRANT_SIGNS: ReadonlyArray<readonly [number, number]> = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

/** Points outside the circle get plus marks this fraction of the size of those inside, so the two differ by shape size and not colour alone. */
export const OUTSIDE_MARK = 0.5;

function areaScene(state: RandomState, sim: RandomSim): SceneData {
    if (sim.kind !== 'area') throw new Error('area scene needs area data');
    const whole = state.areaShape === 'disc';
    const layout = AREA_LAYOUT[state.areaShape];
    const drawn = Math.min(sim.trials, POINTS_DRAWN);
    const points = areaPoints(state.seed, 1, drawn);
    const xs = Array.from(points.x, (x, i) => (whole ? x * QUADRANT_SIGNS[i % 4][0] : x));
    const ys = Array.from(points.y, (y, i) => (whole ? y * QUADRANT_SIGNS[i % 4][1] : y));
    const inside: number[] = [];
    const outside: number[] = [];
    for (let i = 0; i < drawn; i++) (points.inside[i] === 1 ? inside : outside).push(i);
    const arc = Array.from({length: whole ? 121 : 61}, (_, i) => (whole ? 2 : 0.5) * Math.PI * (i / (whole ? 120 : 60)));
    const estimate = sim.trials > 0 ? sim.inside / sim.trials : NaN;
    const sd = sim.trials > 0 ? frequencySd(Math.PI / 4, sim.trials) : 0;
    const centre = layout.centre;
    const [left, right] = layout.truth;
    const top = layout.frame[1];
    const bottom = layout.frame[3];
    return {
        frame: layout.frame,
        layers: {
            inside: marks(xs, ys, inside, layout.mark),
            outside: marks(xs, ys, outside, layout.mark * OUTSIDE_MARK),
            square: whole ? {x: [-1, 1, 1, -1, -1], y: [-1, -1, 1, 1, -1]} : {x: [0, 1, 1, 0, 0], y: [0, 0, 1, 1, 0]},
            circle: {x: arc.map(a => Math.cos(a)), y: arc.map(a => Math.sin(a))},
            truth: {x: [left, right], y: [Math.PI / 4, Math.PI / 4]},
            errorBar: Number.isFinite(estimate)
                ? join([{x: [centre, centre], y: [estimate - sd, estimate + sd]}, {x: [centre - 0.06, centre + 0.06], y: [estimate - sd, estimate - sd]},
                    {x: [centre - 0.06, centre + 0.06], y: [estimate + sd, estimate + sd]}])
                : EMPTY_LAYER,
            estimate: Number.isFinite(estimate) ? marks([centre], [estimate], [0], 0.05, 0.02) : EMPTY_LAYER,
        },
        captions: [
            {key: 'points', x: whole ? -1.08 : 0.02, y: top - 0.04, count: drawn},
            whole ? {key: 'circleWhole', x: -1.08, y: bottom + 0.05} : {key: 'circle', x: 0.05, y: -0.07},
            {key: 'estimate', x: left, y: top - 0.04},
            {key: 'truth', x: left, y: Math.PI / 4 + 0.07},
            {key: 'errorBar', x: left, y: Math.PI / 4 - 0.1},
            {key: 'inside', x: left, y: 0.56},
            {key: 'outside', x: left, y: 0.34},
        ],
    };
}

function walkScene(state: RandomState, sim: RandomSim, exact: RandomExact, sim2?: RandomSim): SceneData {
    if (sim.kind !== 'walk' || exact.kind !== 'walk') throw new Error('walk scene needs walk data');
    const steps = state.walkSteps;
    const reach = Math.min(steps, Math.ceil(3.3 * Math.sqrt(steps)));
    const ks = Array.from({length: steps + 1}, (_, k) => k);
    const drawn = Math.min(sim.trials, PATHS_DRAWN);
    const paths = walkPaths(state.seed, steps, 1, drawn);
    const polyline = (w: number) => ({x: ks, y: ks.map(s => paths.positions[w * (steps + 1) + s]) as number[]});
    const earlier = Array.from({length: Math.max(drawn - 1, 0)}, (_, w) => polyline(w));
    const base = steps * 1.06;
    const maxMass = Math.max(...exact.masses);
    const scale = (steps * 0.4) / maxMass;
    const freq = sim.counts.map(c => (sim.trials > 0 ? c / sim.trials : 0));
    const heap2 = sim2?.kind === 'walk'
        ? horizontalBars(base, exact.positions, sim2.counts.map(c => (sim2.trials > 0 ? (c / sim2.trials) * scale : 0)), 1) : EMPTY_LAYER;
    return {
        frame: [-0.08 * steps, reach * 1.2, steps * 1.55, -reach * 1.2],
        layers: {
            paths: join(earlier),
            latest: drawn > 0 ? polyline(drawn - 1) : EMPTY_LAYER,
            funnel: join([{x: ks, y: ks.map(k => Math.sqrt(k))}, {x: ks, y: ks.map(k => -Math.sqrt(k))}]),
            heap: horizontalBars(base, exact.positions, freq.map(f => f * scale), 1),
            heap2,
            bars: horizontalBars(base, exact.positions, exact.masses.map(m => m * scale), 1),
        },
        captions: [
            {key: 'walks', x: 0.02 * steps, y: reach * 1.12, count: drawn},
            {key: 'funnel', x: 0.02 * steps, y: reach * 1.0},
            // All rows stand in the clear top left, left of the heap axis (at `base`): beside the axis the heap column is too narrow for a caption
            // (it wraps over the next one, and the axis line strikes through the first letters). The walks are narrow there (within the funnel).
            {key: 'walkHeap', x: 0.02 * steps, y: reach * 0.88},
            {key: 'walkExact', x: 0.02 * steps, y: reach * 0.76},
            ...seedCaptions(state, sim2, 0.02 * steps, reach * 0.64, reach * 0.12),
        ],
    };
}

/** A rectangle outline from x0 to x1 and y0 to y1. */
const rectangle = (x0: number, x1: number, y0: number, y1: number): {x: number[]; y: number[]} => ({x: [x0, x1, x1, x0, x0], y: [y0, y0, y1, y1, y0]});

/** The two-box diagram under the plot, in units of the board width `s`: boxes A and B, the arrows between them and the loops over them. */
function markovDiagram(s: number, a: number, b: number, start: 0 | 1, drop: number): {boxes: Layer; arrows: Layer; captions: Caption[]} {
    const cap = (from: 0 | 1, to: 0 | 1, percent: number, x: number, y: number): Caption => {
        const {num, den} = percentFraction(percent);
        return {key: 'move', x, y, values: [from, to, num, den]};
    };
    const arrowRight = [{x: [0.34 * s, 0.66 * s], y: [-0.43 - drop, -0.43 - drop]}, {x: [0.62 * s, 0.66 * s, 0.62 * s], y: [-0.39 - drop, -0.43 - drop, -0.47 - drop]}];
    const arrowLeft = [{x: [0.66 * s, 0.34 * s], y: [-0.57 - drop, -0.57 - drop]}, {x: [0.38 * s, 0.34 * s, 0.38 * s], y: [-0.53 - drop, -0.57 - drop, -0.61 - drop]}];
    const loop = (x0: number, x1: number) => [{x: [x0, x0, x1, x1], y: [-0.35 - drop, -0.24 - drop, -0.24 - drop, -0.35 - drop]}, {x: [x1 - 0.015 * s, x1, x1 + 0.015 * s], y: [-0.31 - drop, -0.35 - drop, -0.31 - drop]}];
    return {
        boxes: join([rectangle(0.03 * s, 0.34 * s, -0.65 - drop, -0.35 - drop), rectangle(0.66 * s, 0.97 * s, -0.65 - drop, -0.35 - drop)]),
        arrows: join([...arrowRight, ...arrowLeft, ...loop(0.12 * s, 0.22 * s), ...loop(0.78 * s, 0.88 * s)]),
        captions: [
            {key: start === 0 ? 'boxStart' : 'box', x: 0.05 * s, y: -0.5 - drop, values: [0]},
            {key: start === 1 ? 'boxStart' : 'box', x: 0.68 * s, y: -0.5 - drop, values: [1]},
            cap(0, 1, a, 0.35 * s, -0.32 - drop),
            cap(1, 0, b, 0.35 * s, -0.68 - drop),
            cap(0, 0, 100 - a, 0.04 * s, -0.12 - drop),
            cap(1, 1, 100 - b, 0.7 * s, -0.12 - drop),
        ],
    };
}

/** The diagram hangs this far below the axis title (it moved down to leave a row for it under the tick labels). */
const DIAGRAM_DROP = 0.2;

function markovScene(state: RandomState, sim: RandomSim, exact: RandomExact, sim2?: RandomSim): SceneData {
    if (sim.kind !== 'markov' || exact.kind !== 'markov') throw new Error('markov scene needs markov data');
    const xmax = logAxis(state.n);
    const span = Math.max(xmax, 2);
    const ks = curveCounts(state.n).filter(c => c >= 1);
    const second = sim2?.kind === 'markov' ? sim2 : undefined;
    const diagram = markovDiagram(span, state.markovA, state.markovB, state.markovStart, DIAGRAM_DROP);
    const rows = 3 + (second ? 2 : 0);
    return {
        frame: [-0.12 * span - 0.1, PLOT_TOP + 0.04, span * 1.05 + 0.1, -0.9 - DIAGRAM_DROP],
        layers: {
            share: running(sim.curve),
            share2: second ? running(second.curve) : EMPTY_LAYER,
            exactA: {x: ks.map(k => Math.log10(k)), y: markovProbabilityCurve(state, ks)},
            stationary: exact.stationary ? {x: [0, xmax], y: [exact.stationary[0], exact.stationary[0]]} : EMPTY_LAYER,
            boxes: diagram.boxes,
            arrows: diagram.arrows,
        },
        captions: [
            {key: 'share', x: 0.05 * xmax, y: bandRow(rows, 0), top: 0},
            {key: 'exactA', x: 0.05 * xmax, y: bandRow(rows, 1), top: 1},
            {key: 'stationary', x: 0.05 * xmax, y: bandRow(rows, 2), top: 2},
            {key: 'logAxis', x: xmax * 0.25, y: LOG_TITLE_Y},
            ...seedCaptions(state, second, 0.05 * xmax, bandRow(rows, 3), CAPTION_ROW, 3),
            ...diagram.captions,
        ],
    };
}

/** Right of the intervals: the panel of the exact law of the number of misses. */
export const LAW_LEFT = 100;
export const LAW_WIDTH = 85;
export const LAW_HEIGHT = 80;

function intervalScene(state: RandomState, sim: RandomSim, exact: RandomExact): SceneData {
    if (sim.kind !== 'interval' || exact.kind !== 'interval') throw new Error('interval scene needs interval data');
    const drawn = Math.min(sim.trials, INTERVALS_DRAWN);
    const samples = intervalSamples(state.seed, state.sampleSize, 1, drawn);
    const half = intervalHalfWidth(state.sampleSize);
    const hit: Array<{x: number[]; y: number[]}> = [];
    const missed: Array<{x: number[]; y: number[]}> = [];
    const flags: Array<{x: number[]; y: number[]}> = [];
    for (let i = 0; i < drawn; i++) {
        const centre = samples.sums[i] / state.sampleSize;
        const piece = {x: [centre - half, centre + half], y: [i + 1, i + 1]};
        (samples.missed[i] === 1 ? missed : hit).push(piece);
        if (samples.missed[i] === 1) flags.push({x: [16.2, 17.8], y: [i + 1 - 0.8, i + 1 + 0.8]}, {x: [16.2, 17.8], y: [i + 1 + 0.8, i + 1 - 0.8]});
    }
    // The exact law of the number of misses among the intervals run so far, with the count of this run marked.
    let law: Layer = EMPTY_LAYER;
    let observed: Layer = EMPTY_LAYER;
    const lawCaptions: Caption[] = [];
    if (sim.trials >= 1) {
        const window = missCountWindow(sim.trials, exact.miss, sim.misses);
        const slot = LAW_WIDTH / window.masses.length;
        const centres = window.masses.map((_, i) => LAW_LEFT + (i + 0.5) * slot);
        const top = Math.max(...window.masses);
        law = verticalBars(centres, window.masses.map(m => (m / top) * LAW_HEIGHT), slot / 2);
        const at = centres[sim.misses - window.first];
        observed = {x: [at, at], y: [0, LAW_HEIGHT + 8]};
        lawCaptions.push(
            {key: 'missLaw', x: LAW_LEFT, y: 108, top: 0, values: [sim.trials, window.first, window.first + window.masses.length - 1]},
            {key: 'missRun', x: LAW_LEFT, y: 100, after: true, values: [sim.misses]},
        );
    }
    return {
        frame: [15, 112, 190, -6],
        layers: {
            hits: join(hit),
            misses: join(missed),
            flags: join(flags),
            mean: {x: [49.5, 49.5], y: [0, 104]},
            law,
            observed,
        },
        captions: [
            {key: 'mean', x: 50.2, y: 108, top: 0},
            {key: 'miss', x: 16, y: 108, top: 0},
            {key: 'cover', x: 16, y: -3.5, count: drawn, bottom: 0},
            ...lawCaptions,
        ],
    };
}
