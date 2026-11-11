import {binomialMasses} from '../../analysis/distributions';
import {DEFAULT_RANDOM_STATE, exactFor, simulate, type RandomState} from '../../random/randomModel';
import {intervalHalfWidth} from '../../random/samplePaths';
import {runFrequency, runGalton} from '../../random/runners';
import {INTERVALS_DRAWN, LAW_HEIGHT, LAW_LEFT, LAW_WIDTH, OUTSIDE_MARK, PATHS_DRAWN, POINTS_DRAWN, sceneFor, type Layer, type SceneData} from './simulationScene';

const stateOf = (patch: Partial<RandomState>): RandomState => {
    const base = {...DEFAULT_RANDOM_STATE, ...patch};
    return {...base, shown: patch.shown ?? base.n};
};
const build = (patch: Partial<RandomState>) => {
    const state = stateOf(patch);
    const sim = simulate(state);
    const exact = exactFor(state);
    return {state, sim, exact, scene: sceneFor(state, sim, exact)};
};
/** The same state with the second seed's run drawn over the first. */
const buildOverlay = (patch: Partial<RandomState>) => {
    const state = stateOf({...patch, overlay: 1});
    const sim = simulate(state);
    const sim2 = simulate({...state, seed: state.seed2});
    const exact = exactFor(state);
    return {state, sim, sim2, exact, scene: sceneFor(state, sim, exact, sim2)};
};
/** Centres of the plus marks of a point layer: the horizontal bar of each mark comes first, its midpoint is the point. */
const centresOf = (layer: Layer): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    let piece = 0;
    for (let i = 0; i + 1 < layer.x.length; i++) {
        if (Number.isNaN(layer.x[i])) { piece++; continue; }
        if (piece % 2 === 0 && !Number.isNaN(layer.x[i + 1])) { out.push([(layer.x[i] + layer.x[i + 1]) / 2, layer.y[i]]); i++; }
    }
    return out;
};
/** Number of pieces of a NaN-separated layer. */
const pieces = (layer: Layer) => (layer.x.length === 0 ? 0 : layer.x.filter(Number.isNaN).length + 1);
const closeTo = (a: number, b: number, tolerance = 1e-12) => expect(Math.abs(a - b)).toBeLessThan(tolerance);

/** Every layer has equal-length axes, NaN only as a pair (a break), every other value finite; the frame is finite. */
function expectWellFormed(scene: SceneData) {
    for (const [name, layer] of Object.entries(scene.layers)) {
        expect(layer.x.length, name).toBe(layer.y.length);
        layer.x.forEach((x, i) => {
            expect(Number.isNaN(x), `${name}[${i}] break pair`).toBe(Number.isNaN(layer.y[i]));
            if (!Number.isNaN(x)) {
                expect(Number.isFinite(x) && Number.isFinite(layer.y[i]), `${name}[${i}] finite`).toBe(true);
            }
        });
        if (layer.x.length) {
            expect(Number.isNaN(layer.x[0]) || Number.isNaN(layer.x[layer.x.length - 1]), `${name} ends`).toBe(false);
        }
    }
    scene.frame.forEach(value => expect(Number.isFinite(value)).toBe(true));
    scene.captions.forEach(c => { expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true); });
}

describe('galton', () => {
    test('2 rows, p = 1/2: pegs, exact bars 1/4 1/2 1/4, heap sums to 1, the one ball ends in the slot that holds it', () => {
        const {scene, sim} = build({mode: 'galton', rows: 2, pPercent: 50, n: 1});
        expectWellFormed(scene);
        const L = scene.layers;
        expect(pieces(L.pegs)).toBe(3); // 1 + 2 pegs
        expect(L.bars.y.filter((_, i) => i % 4 === 1)).toEqual([0.25, 0.5, 0.25]);
        expect(L.bars.x.slice(0, 4)).toEqual([-0.5, -0.5, 0.5, 0.5]);
        const tops = L.heap.y.filter((_, i) => i % 4 === 1);
        expect(tops.reduce((a, b) => a + b, 0)).toBe(1);
        if (sim.kind !== 'galton') throw new Error('kind');
        const slot = sim.counts.indexOf(1);
        expect(L.latest.x).toHaveLength(3);
        expect(L.latest.x[0]).toBe(1); // every ball starts at the middle
        expect(L.latest.x[2]).toBe(slot);
        expect(pieces(L.paths)).toBe(0); // the only ball is the latest one
        expect(scene.captions.map(c => c.key)).toEqual(['heap', 'bars', 'path']);
        expect(scene.captions[2].count).toBe(1);
    });

    test('at most 10 balls are drawn however large the run, the last of them is the latest; the heap still covers the whole run', () => {
        const {scene, sim} = build({mode: 'galton', rows: 4, n: 500});
        expectWellFormed(scene);
        expect(pieces(scene.layers.paths)).toBe(PATHS_DRAWN - 1);
        expect(scene.layers.latest.x).toHaveLength(5);
        expect(scene.captions[2].count).toBe(PATHS_DRAWN);
        if (sim.kind !== 'galton') throw new Error('kind');
        const tops = scene.layers.heap.y.filter((_, i) => i % 4 === 1);
        sim.counts.forEach((c, i) => closeTo(tops[i], c / 500));
    });

    test('shown 0 draws no ball and an empty heap, the exact bars stay', () => {
        const {scene} = build({mode: 'galton', rows: 3, n: 50, shown: 0});
        expectWellFormed(scene);
        expect(scene.layers.latest.x).toHaveLength(0);
        expect(scene.layers.heap.y.every(y => y === 0)).toBe(true);
        expect(scene.layers.bars.y.some(y => y > 0)).toBe(true);
        expect(scene.captions[2].count).toBe(0);
    });
});

describe('frequency', () => {
    test('n = 100: the 1/2 line runs along the log axis from 0 to 2, the running curve starts at one toss and ends at n', () => {
        const {scene, sim} = build({mode: 'frequency', n: 100});
        expectWellFormed(scene);
        expect(scene.layers.half).toEqual({x: [0, 2], y: [0.5, 0.5]});
        expect(scene.layers.running.x[0]).toBe(0); // log10(1)
        const last = scene.layers.running.x.length - 1;
        closeTo(scene.layers.running.x[last], 2);
        if (sim.kind !== 'frequency') throw new Error('kind');
        closeTo(scene.layers.running.y[last], sim.heads / 100);
        expect(scene.frame[0]).toBeCloseTo(-0.34, 12);
        expect(scene.frame[2]).toBeCloseTo(2.2, 12);
        expect(pieces(scene.layers.band)).toBe(2);
        // The band is symmetric about 1/2 where it is not clipped.
        const half = scene.layers.band.y.length / 2 - 0.5;
        for (let i = 0; i < half; i++) closeTo(scene.layers.band.y[i] + scene.layers.band.y[half + 1 + i], 1);
    });

    test('shown 0 draws no running curve and still frames the log axis', () => {
        const {scene} = build({mode: 'frequency', n: 10, shown: 0});
        expectWellFormed(scene);
        expect(scene.layers.running.x).toHaveLength(0);
        closeTo(scene.layers.half.x[1], 1); // log10(10)
    });
});

describe('area', () => {
    test('one point: the square has 5 corners, the arc is a quarter circle, the one point is a cross in its own layer', () => {
        const {scene, sim} = build({mode: 'area', n: 1});
        expectWellFormed(scene);
        const L = scene.layers;
        expect(L.square).toEqual({x: [0, 1, 1, 0, 0], y: [0, 0, 1, 1, 0]});
        expect(L.circle.x).toHaveLength(61);
        closeTo(L.circle.x[0], 1);
        closeTo(L.circle.y[0], 0);
        closeTo(L.circle.x[60], 0, 1e-15);
        closeTo(L.circle.y[60], 1);
        if (sim.kind !== 'area') throw new Error('kind');
        const owner = sim.inside === 1 ? L.inside : L.outside;
        const other = sim.inside === 1 ? L.outside : L.inside;
        expect(pieces(owner)).toBe(2); // the two bars of the cross
        expect(other.x).toHaveLength(0);
        expect(L.truth.y).toEqual([Math.PI / 4, Math.PI / 4]);
        expect(pieces(L.errorBar)).toBe(3);
        expect(L.estimate.x).toHaveLength(5);
        closeTo(L.estimate.y[0], sim.inside); // the horizontal bar of the estimate mark sits at the share inside, 0 or 1
    });

    test('at most 300 points are drawn; every drawn point is split between inside and outside', () => {
        const {scene} = build({mode: 'area', n: 5000});
        expectWellFormed(scene);
        expect((pieces(scene.layers.inside) + pieces(scene.layers.outside)) / 2).toBe(POINTS_DRAWN);
        expect(scene.captions[0].count).toBe(POINTS_DRAWN);
    });

    test('shown 0 has no estimate and no error bar', () => {
        const {scene} = build({mode: 'area', n: 20, shown: 0});
        expectWellFormed(scene);
        expect(scene.layers.estimate.x).toHaveLength(0);
        expect(scene.layers.errorBar.x).toHaveLength(0);
    });
});

describe('walk', () => {
    test('4 steps, 3 walks: funnel at +-sqrt(k), two earlier paths and the latest one move one step at a time from 0', () => {
        const {scene, exact, state} = build({mode: 'walk', walkSteps: 4, n: 3});
        expectWellFormed(scene);
        const L = scene.layers;
        expect(L.funnel.x).toHaveLength(11);
        expect(L.funnel.y[4]).toBe(2);
        expect(L.funnel.y[10]).toBe(-2);
        expect(pieces(L.paths)).toBe(2);
        expect(L.latest.x).toEqual([0, 1, 2, 3, 4]);
        expect(L.latest.y[0]).toBe(0);
        for (let i = 1; i < 5; i++) expect(Math.abs(L.latest.y[i] - L.latest.y[i - 1])).toBe(1);
        if (exact.kind !== 'walk') throw new Error('kind');
        expect(exact.positions).toEqual([-4, -2, 0, 2, 4]);
        expect(L.bars.x).toHaveLength(20);
        expect(state.walkSteps).toBe(4);
        expect(scene.frame).toEqual([-0.32, 4.8, 6.2, -4.8]);
    });

    test('exact bars sit right of the walks and sum (length times width) to the scale: the heap bars never exceed it', () => {
        const {scene} = build({mode: 'walk', walkSteps: 16, n: 200});
        expectWellFormed(scene);
        const base = 16 * 1.06;
        expect(Math.min(...scene.layers.bars.x)).toBeCloseTo(base, 12);
        expect(Math.min(...scene.layers.heap.x)).toBeCloseTo(base, 12);
        expect(scene.captions.map(c => c.key)).toEqual(['walks', 'funnel', 'walkHeap', 'walkExact']);
    });
});

describe('markov', () => {
    test('A to B 30 %, B to A 60 %, start A: stationary 2/3, P(A after 1) = 0.7, P(A after k) tends to 2/3', () => {
        const {scene, sim} = build({mode: 'markov', n: 100});
        expectWellFormed(scene);
        const L = scene.layers;
        closeTo(L.stationary.y[0], 2 / 3);
        expect(L.stationary.x).toEqual([0, 2]);
        expect(L.exactA.x[0]).toBe(0);
        closeTo(L.exactA.y[0], 0.7);
        closeTo(L.exactA.y[L.exactA.y.length - 1], 2 / 3, 1e-9);
        const last = L.share.x.length - 1;
        if (sim.kind !== 'markov') throw new Error('kind');
        closeTo(L.share.y[last], sim.inA / 100);
        expect(scene.captions.map(c => c.key)).toEqual(['share', 'exactA', 'stationary', 'logAxis', 'boxStart', 'box', 'move', 'move', 'move', 'move']);
    });

    test('0 % and 0 %: no unique stationary distribution, so no stationary line', () => {
        const {scene} = build({mode: 'markov', n: 20, markovA: 0, markovB: 0});
        expectWellFormed(scene);
        expect(scene.layers.stationary.x).toHaveLength(0);
        closeTo(scene.layers.exactA.y[0], 1);
    });
});

describe('interval', () => {
    test('3 intervals of 36 draws: each is a bar of width 2h on its own row, the missed ones are flagged, misses match the tally', () => {
        const {scene, sim} = build({mode: 'interval', n: 3, sampleSize: 36});
        expectWellFormed(scene);
        const L = scene.layers;
        const h = intervalHalfWidth(36);
        const hits = pieces(L.hits);
        const misses = pieces(L.misses);
        expect(hits + misses).toBe(3);
        if (sim.kind !== 'interval') throw new Error('kind');
        expect(misses).toBe(sim.misses);
        expect(pieces(L.flags)).toBe(2 * misses); // a cross of two bars per miss
        for (const layer of [L.hits, L.misses]) {
            for (let i = 0; i + 1 < layer.x.length; i += 3) closeTo(layer.x[i + 1] - layer.x[i], 2 * h);
        }
        expect(L.mean).toEqual({x: [49.5, 49.5], y: [0, 104]});
        expect(scene.captions[2]).toMatchObject({key: 'cover', count: 3});
    });

    test('at most 100 intervals are drawn', () => {
        const {scene} = build({mode: 'interval', n: 1000});
        expectWellFormed(scene);
        expect(pieces(scene.layers.hits) + pieces(scene.layers.misses)).toBe(INTERVALS_DRAWN);
    });
});

test('the same state gives the same scene; another seed gives another scene', () => {
    const a = build({mode: 'galton', n: 100, seed: 7});
    const b = build({mode: 'galton', n: 100, seed: 7});
    const c = build({mode: 'galton', n: 100, seed: 8});
    expect(a.scene).toEqual(b.scene);
    expect(a.scene.layers.heap).not.toEqual(c.scene.layers.heap);
});

test('every mode at its default is well formed', () => {
    for (const mode of ['galton', 'frequency', 'area', 'walk', 'markov', 'interval'] as const) {
        const {scene} = build({mode, n: mode === 'walk' ? 50 : 200});
        expectWellFormed(scene);
    }
});

describe('RS6 exact law of the misses', () => {
    test('3 intervals: four bars in the ratios of (1-q)^3, 3q(1-q)^2, 3q^2(1-q), q^3 (hand formulas), the run marked at its own count', () => {
        const {scene, sim, exact} = build({mode: 'interval', n: 3});
        expectWellFormed(scene);
        if (sim.kind !== 'interval' || exact.kind !== 'interval') throw new Error('kind');
        const q = exact.miss;
        const hand = [(1 - q) ** 3, 3 * q * (1 - q) ** 2, 3 * q * q * (1 - q), q ** 3];
        const tops = scene.layers.law.y.filter((_, i) => i % 4 === 1);
        expect(tops).toHaveLength(4);
        tops.forEach((top, k) => closeTo(top / LAW_HEIGHT, hand[k] / Math.max(...hand)));
        expect(Math.max(...tops)).toBe(LAW_HEIGHT);
        const slot = LAW_WIDTH / 4;
        expect(scene.layers.law.x[0]).toBeCloseTo(LAW_LEFT, 12);
        expect(scene.layers.law.x[scene.layers.law.x.length - 1]).toBeCloseTo(LAW_LEFT + LAW_WIDTH, 12);
        const at = LAW_LEFT + (sim.misses + 0.5) * slot;
        expect(scene.layers.observed.x).toEqual([at, at]);
        expect(scene.captions.find(c => c.key === 'missLaw')?.values).toEqual([3, 0, 3]);
        expect(scene.captions.find(c => c.key === 'missRun')?.values).toEqual([sim.misses]);
    });

    test('1000 intervals: adjacent bars follow the ratio recurrence (N-k)/(k+1) q/(1-q); the window holds the run and stays in the panel', () => {
        const {scene, sim, exact} = build({mode: 'interval', n: 1000});
        expectWellFormed(scene);
        if (sim.kind !== 'interval' || exact.kind !== 'interval') throw new Error('kind');
        const q = exact.miss;
        const tops = scene.layers.law.y.filter((_, i) => i % 4 === 1);
        const [, first, last] = scene.captions.find(c => c.key === 'missLaw')?.values ?? [];
        expect(tops).toHaveLength(last - first + 1);
        for (let k = first; k < last; k++) closeTo(tops[k - first + 1] / tops[k - first], ((1000 - k) / (k + 1)) * (q / (1 - q)), 1e-9);
        expect(sim.misses).toBeGreaterThanOrEqual(first);
        expect(sim.misses).toBeLessThanOrEqual(last);
        expect(Math.min(...scene.layers.law.x)).toBeGreaterThanOrEqual(LAW_LEFT - 1e-9);
        expect(Math.max(...scene.layers.law.x)).toBeLessThanOrEqual(LAW_LEFT + LAW_WIDTH + 1e-9);
        // the window carries (almost) all of the exact law, checked against the kernel masses
        const kernel = binomialMasses(1000, q);
        let covered = 0;
        for (let k = first; k <= last; k++) covered += kernel[k];
        expect(covered).toBeGreaterThan(1 - 1e-5);
        expect(Math.max(...tops)).toBe(LAW_HEIGHT);
    });

    test('10000 intervals (beyond the kernel limit of 1000): the peak bar sits at the mean n q, within one count', () => {
        const {scene, exact} = build({mode: 'interval', n: 10000});
        expectWellFormed(scene);
        if (exact.kind !== 'interval') throw new Error('kind');
        const tops = scene.layers.law.y.filter((_, i) => i % 4 === 1);
        const [, first] = scene.captions.find(c => c.key === 'missLaw')?.values ?? [];
        const peak = first + tops.indexOf(Math.max(...tops));
        expect(Math.abs(peak - 10000 * exact.miss)).toBeLessThanOrEqual(1);
    });

    test('shown 0: no law, no marker, no law captions', () => {
        const {scene} = build({mode: 'interval', n: 50, shown: 0});
        expectWellFormed(scene);
        expect(scene.layers.law.x).toHaveLength(0);
        expect(scene.layers.observed.x).toHaveLength(0);
        expect(scene.captions.map(c => c.key)).toEqual(['mean', 'miss', 'cover']);
    });
});

describe('Markov box diagram', () => {
    test('30 % and 60 %: the arrows read 3/10 (A to B), 3/5 (B to A), and the loops 7/10 and 2/5', () => {
        const {scene} = build({mode: 'markov', n: 100});
        const moves = scene.captions.filter(c => c.key === 'move').map(c => c.values);
        expect(moves).toEqual([[0, 1, 3, 10], [1, 0, 3, 5], [0, 0, 7, 10], [1, 1, 2, 5]]);
        expect(pieces(scene.layers.boxes)).toBe(2);
        expect(pieces(scene.layers.arrows)).toBe(8); // two arrows and two loops, each with a head
        expectWellFormed(scene);
    });

    test('the fractions leaving a state add to exactly 1 (cross-multiplied, no float), and the start box is named', () => {
        for (const [a, b] of [[30, 60], [0, 0], [100, 100], [5, 95], [50, 25]]) {
            const {scene} = build({mode: 'markov', n: 20, markovA: a, markovB: b, markovStart: 1});
            const moves = scene.captions.filter(c => c.key === 'move').map(c => c.values ?? []);
            for (const from of [0, 1]) {
                const [x, y] = moves.filter(m => m[0] === from);
                expect(x[2] * y[3] + y[2] * x[3]).toBe(x[3] * y[3]);
            }
            expect(scene.captions.filter(c => c.key === 'boxStart').map(c => c.values)).toEqual([[1]]);
        }
    });

    test('the diagram sits under the plot and inside the frame, also at the smallest n', () => {
        const {scene} = build({mode: 'markov', n: 1});
        expectWellFormed(scene);
        const [left, top, right, bottom] = scene.frame;
        for (const layer of [scene.layers.boxes, scene.layers.arrows]) {
            layer.x.filter(v => !Number.isNaN(v)).forEach(v => { expect(v).toBeGreaterThan(left); expect(v).toBeLessThan(right); });
            layer.y.filter(v => !Number.isNaN(v)).forEach(v => { expect(v).toBeLessThan(0); expect(v).toBeGreaterThan(bottom); });
        }
        expect(top).toBeGreaterThan(1);
    });
});

describe('RS3 second shape: the whole circle in the square', () => {
    const disc = (n: number) => build({mode: 'area', n, areaShape: 'disc'});

    test('300 points: 75 in each quadrant, inside the circle exactly when inside the quarter disc, circle of 121 points on x^2+y^2=1', () => {
        const {scene, sim} = disc(300);
        expectWellFormed(scene);
        const quarter = build({mode: 'area', n: 300});
        const inside = centresOf(scene.layers.inside);
        const outside = centresOf(scene.layers.outside);
        expect(inside.length + outside.length).toBe(300);
        expect(inside.length).toBe(centresOf(quarter.scene.layers.inside).length);
        for (const [x, y] of inside) expect(x * x + y * y).toBeLessThan(1);
        for (const [x, y] of outside) expect(x * x + y * y).toBeGreaterThanOrEqual(1);
        const quadrants = [0, 0, 0, 0];
        for (const [x, y] of [...inside, ...outside]) quadrants[(x < 0 ? 1 : 0) + (y < 0 ? 2 : 0)]++;
        expect(quadrants).toEqual([75, 75, 75, 75]);
        expect(scene.layers.circle.x).toHaveLength(121);
        scene.layers.circle.x.forEach((x, i) => closeTo(x * x + scene.layers.circle.y[i] ** 2, 1, 1e-12));
        expect(scene.layers.square).toEqual({x: [-1, 1, 1, -1, -1], y: [-1, -1, 1, 1, -1]});
        if (sim.kind !== 'area') throw new Error('kind');
        closeTo(scene.layers.estimate.y[0], sim.inside / 300); // the share inside, which estimates pi/4
        expect(scene.layers.truth.y).toEqual([Math.PI / 4, Math.PI / 4]);
        expect(scene.captions.map(c => c.key)).toContain('circleWhole');
    });

    test('the share is the quarter picture share (one tally), and the frame holds the square and the estimate panel', () => {
        const a = disc(1000);
        const b = build({mode: 'area', n: 1000});
        expect(a.scene.layers.estimate.y).toEqual(b.scene.layers.estimate.y);
        const [left, top, right, bottom] = a.scene.frame;
        expect(left).toBeLessThan(-1);
        expect(top).toBeGreaterThan(1);
        expect(bottom).toBeLessThan(-1);
        expect(Math.max(...a.scene.layers.truth.x)).toBeLessThan(right);
        expectWellFormed(a.scene);
    });

    test('the quarter shape keeps its own caption', () => {
        expect(build({mode: 'area', n: 50}).scene.captions.map(c => c.key)).toContain('circle');
    });
});

describe('RS2 second plot: heads minus n/2', () => {
    const pointAt = (layer: Layer, count: number) => layer.y[layer.x.findIndex(x => Math.abs(x - Math.log10(count)) < 1e-12)];
    const unplace = (y: number, scale: number) => ((y + 0.75) / 0.5) * scale;

    test('seed 42 (spec): -4, -5, -7, +11 heads from half at n = 10, 100, 1000, 10000; zero line at the centre', () => {
        // The drawn counts are 1..40 and multiples of n/240, so each spec count is the end of its own run (a prefix of the same stream).
        const spec: Array<[number, number]> = [[10, 1 - 5], [100, 45 - 50], [1000, 493 - 500], [10000, 5011 - 5000]];
        for (const [count, difference] of spec) {
            const {scene} = build({mode: 'frequency', n: count});
            expectWellFormed(scene);
            const scale = scene.captions.find(c => c.key === 'diffScale')?.values?.[0] ?? NaN;
            closeTo(unplace(pointAt(scene.layers.diff, count), scale), difference, 1e-9);
            expect(scene.layers.diffZero.y).toEqual([-0.75, -0.75]);
        }
    });

    test('the plotted difference at other counts equals heads of a fresh prefix run minus n/2 (independent route)', () => {
        const {scene} = build({mode: 'frequency', n: 1000});
        const scale = scene.captions.find(c => c.key === 'diffScale')?.values?.[0] ?? NaN;
        for (const count of [3, 17, 250]) {
            const prefix = simulate(stateOf({mode: 'frequency', n: 1000, shown: count}));
            if (prefix.kind !== 'frequency') throw new Error('kind');
            closeTo(unplace(pointAt(scene.layers.diff, count), scale), prefix.heads - count / 2, 1e-9);
        }
    });

    test('the band is the exact 95 % half-width: at n = 100 it is 10 heads (smallest m with P(|H-50| <= m) >= 0,95 from binomialMasses)', () => {
        const masses = binomialMasses(100, 0.5);
        let m = 0;
        const covered = (limit: number) => masses.reduce((sum, mass, k) => (Math.abs(k - 50) <= limit ? sum + mass : sum), 0);
        while (covered(m) < 0.95) m++;
        expect(m).toBe(10);
        const {scene} = build({mode: 'frequency', n: 1000});
        const scale = scene.captions.find(c => c.key === 'diffScale')?.values?.[0] ?? NaN;
        const upper = scene.layers.diffBand.y.slice(0, scene.layers.diffBand.y.findIndex(Number.isNaN));
        const xs = scene.layers.diffBand.x.slice(0, upper.length);
        const index = xs.findIndex(x => Math.abs(x - 2) < 1e-12);
        closeTo(unplace(upper[index], scale), m, 1e-9);
        closeTo(unplace(scene.layers.diffBand.y[upper.length + 1 + index], scale), -m, 1e-9);
    });

    test('the second plot sits under the first inside the frame, and its scale holds every drawn value', () => {
        const {scene} = build({mode: 'frequency', n: 10000});
        const [, top, , bottom] = scene.frame;
        const all = [...scene.layers.diff.y, ...scene.layers.diffBand.y.filter(v => !Number.isNaN(v))];
        all.forEach(v => { expect(v).toBeLessThanOrEqual(-0.25 + 1e-12); expect(v).toBeGreaterThanOrEqual(-1.25 - 1e-12); });
        expect(bottom).toBeLessThan(-1.25);
        expect(top).toBe(1.08);
        expect(scene.captions.map(c => c.key)).toEqual(expect.arrayContaining(['diff', 'diffBand', 'diffScale']));
    });

    test('shown 0: the difference curve is empty, the band and the zero line stay', () => {
        const {scene} = build({mode: 'frequency', n: 100, shown: 0});
        expectWellFormed(scene);
        expect(scene.layers.diff.x).toHaveLength(0);
        expect(scene.layers.diffBand.x.length).toBeGreaterThan(0);
    });
});

describe('overlaid seeds', () => {
    test('frequency: the second curve is the run of the second seed (kernel heads at n), the first is untouched; two seed captions', () => {
        const {scene, state} = buildOverlay({mode: 'frequency', n: 1000, seed2: 7});
        expect(state.seed2).toBe(7);
        const one = build({mode: 'frequency', n: 1000});
        expect(scene.layers.running).toEqual(one.scene.layers.running);
        const heads = new Uint32Array(1);
        runFrequency(7, 50, 1000, heads);
        const last = scene.layers.running2.y.length - 1;
        closeTo(scene.layers.running2.y[last], heads[0] / 1000);
        closeTo(scene.layers.running2.x[last], 3);
        expect(scene.layers.diff2.x).toEqual(scene.layers.running2.x);
        expect(scene.captions.filter(c => c.key === 'seedOne' || c.key === 'seedTwo').map(c => [c.key, c.values])).toEqual([['seedOne', [42]], ['seedTwo', [7]]]);
        expectWellFormed(scene);
    });

    test('the vertical scale of the second plot also holds the second seed', () => {
        const {scene} = buildOverlay({mode: 'frequency', n: 10000, seed2: 7});
        const scale = scene.captions.find(c => c.key === 'diffScale')?.values?.[0] ?? NaN;
        for (const y of scene.layers.diff2.y) expect(Math.abs(((y + 0.75) / 0.5) * scale)).toBeLessThanOrEqual(scale + 1e-9);
    });

    test('galton: the second heap holds the kernel counts of the second seed as shares summing to 1; the first heap is untouched', () => {
        const {scene} = buildOverlay({mode: 'galton', rows: 4, n: 400, seed2: 9});
        const counts = new Uint32Array(5);
        runGalton(9, 4, 50, 400, counts);
        const tops = scene.layers.heap2.y.filter((_, i) => i % 4 === 1);
        tops.forEach((top, k) => closeTo(top, counts[k] / 400));
        closeTo(tops.reduce((a, b) => a + b, 0), 1);
        expect(scene.layers.heap).toEqual(build({mode: 'galton', rows: 4, n: 400}).scene.layers.heap);
        expect(scene.captions.map(c => c.key)).toEqual(['heap', 'bars', 'path', 'seedOne', 'seedTwo']);
    });

    test('walk and markov draw a second layer too; with overlay off nothing is drawn; area and interval have no second layer', () => {
        const walk = buildOverlay({mode: 'walk', walkSteps: 16, n: 200, seed2: 9});
        expect(walk.scene.layers.heap2.x.length).toBeGreaterThan(0);
        expect(Math.min(...walk.scene.layers.heap2.x)).toBeCloseTo(16 * 1.06, 12);
        const markov = buildOverlay({mode: 'markov', n: 100, seed2: 9});
        expect(markov.scene.layers.share2.x.length).toBeGreaterThan(0);
        const off = build({mode: 'galton', n: 100});
        expect(off.scene.layers.heap2.x).toHaveLength(0);
        expect(off.scene.captions.map(c => c.key)).toEqual(['heap', 'bars', 'path']);
        expect(build({mode: 'frequency', n: 100}).scene.layers.running2.x).toHaveLength(0);
        for (const mode of ['area', 'interval'] as const) {
            const state = stateOf({mode, n: 50, overlay: 1});
            const sim = simulate(state);
            const keys = Object.keys(sceneFor(state, sim, exactFor(state), sim).layers);
            expect(keys.filter(key => key.endsWith('2'))).toEqual([]);
        }
    });

    test('the same seed twice draws the very same curve over the first (a legal choice, not an error)', () => {
        const {scene} = buildOverlay({mode: 'frequency', n: 200, seed2: 42});
        expect(scene.layers.running2).toEqual(scene.layers.running);
    });
});

describe('review repairs: area legend and law scale', () => {
    test('points outside are smaller than points inside, and the area scene names inside, outside and the error bar', () => {
        const {scene} = build({mode: 'area', n: 300});
        const L = scene.layers;
        const arm = (layer: Layer) => (layer.x[1] - layer.x[0]) / 2;
        expect(L.inside.x.length).toBeGreaterThan(0);
        expect(L.outside.x.length).toBeGreaterThan(0);
        expect(arm(L.outside)).toBeCloseTo(arm(L.inside) * OUTSIDE_MARK, 12);
        expect(arm(L.outside)).toBeLessThan(arm(L.inside));
        const keys = scene.captions.map(c => c.key);
        for (const key of ['inside', 'outside', 'errorBar'] as const) expect(keys, key).toContain(key);
    });

    test('the law bars are scaled so the tallest bar reaches the panel height', () => {
        const {scene} = build({mode: 'interval', n: 20});
        expect(Math.max(...scene.layers.law.y)).toBeCloseTo(LAW_HEIGHT, 9);
    });

    test('the mean line lies left of the law panel', () => {
        const {scene} = build({mode: 'interval', n: 20});
        for (const x of scene.layers.mean.x) expect(x).toBeLessThan(LAW_LEFT);
        const lawXs = scene.layers.law.x.filter(Number.isFinite);
        expect(Math.min(...lawXs)).toBeGreaterThanOrEqual(LAW_LEFT);
    });
});
