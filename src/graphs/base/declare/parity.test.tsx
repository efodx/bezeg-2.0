/**
 * Parity recordings (task 02, slice 4): the sampled states of the graphs whose inspector panels tasks 04 to 08 remove, the
 * checker's seeded failures, and the declaration-against-recording report of every graph that already declares.
 * `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx` rewrites the `__parity__` files.
 */
import fs from 'fs';
import path from 'path';
import type {DemonstrationId} from '../../../demonstrations';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../realGraphTestHarness';
import {CLASSIFY_EXAMPLES} from '../../../isometry/isometryModel';
import {createGraph} from '../createTestGraph';
import {runAs} from '../writes/writeSource';
import {message, messageNumber, renderMessage} from '../../../localization';
import type {GraphDeclaration} from './graphDeclaration';
import {type AcceptedDifference, checkParity, describeDifferences, normalise, plainSymbol,type ParityRecording, type ParityState, recordParityWithDeclarations} from './parity';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

/** A learner write of one key; a refused write fails the recording rather than recording a stale state. */
const set = (graph: {parameters?: {write(key: string, value: unknown, source: 'learner'): {status: string}}}, writes: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(writes)) {
        const result = graph.parameters!.write(key, value, 'learner');
        if (result.status !== 'applied') throw new Error(`Write ${key}=${String(value)} was ${JSON.stringify(result)}`);
    }
};
const state = (name: string, writes: Record<string, unknown>): ParityState => ({name, apply: graph => set(graph as never, writes)});

interface Sample {
    readonly file: string;
    readonly demonstration: DemonstrationId;
    readonly states: readonly ParityState[];
    /** Deliberate differences check mode tolerates; anything not listed still fails. */
    readonly accepted?: readonly AcceptedDifference[];
    /** Recorded notes that a declaration may have moved elsewhere (a row, a merged sentence); only a recorded note matching this is tolerated as missing. */
    readonly movedNotes?: {readonly pattern: RegExp; readonly reason: string};
}

const continuityAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'row a', reason: 'the parameter is a board puck now, so its slider output "a = 1,5" is a readout row; the panel showed the value only on the slider'},
];
const trigAccepted: readonly AcceptedDifference[] = [
    ['A', 'omega', 'phase-value', 'B'].map(key => ({
        kind: 'extra', where: `row ${key}`,
        reason: 'the parameter is a board puck now, so its slider read-off is a readout row; the panel showed the value only on the slider',
    }) as const),
].flat();
const SHORT_VALUE ='the declaration shows a short value; the panel keeps the sentence, which the declaration carries as its readout help';
const phaseAccepted: readonly AcceptedDifference[] = [
    ...['Izračunano območje#0', 'Začetna točka 1#0', 'Začetna točka 2#0', 'Začetna točka 3#0', 'Energija začetne točke 1#0', 'Energija začetne točke 2#0',
        'Energija začetne točke 3#0', 'Obroč trajektorij (izračunan)#0', 'Linearizacija na obroču (izračunana)#0', 'Kaj določa linearizacija#0']
        .map(key => ({kind: 'different', where: `row ${key}`, reason: SHORT_VALUE}) as const),
    {kind: 'extra', where: 'note', reason: 'the readout help that carries the sentences the short values leave out'},
];

const extractionAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the readout help carries the help line the old panel showed above its readouts (it carries no readout marker, so the recording holds none)'},
];

const isometriesAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the readout help carries the approximation line the old panel showed under its rows (it carries no readout marker, so the recording holds none)'},
];

const nurbsAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the readout help carries the help line the old panel showed under its error sentence (it carries no readout marker, so the recording holds none)'},
];

const deBoorAccepted: readonly AcceptedDifference[] = [
    {kind: 'missing', where: 'output', reason: 'the only read-off is the point count of the "Število kontrolnih točk" count setter, a setup control that stays in Orodja and shows its own value; the sentences of the levels are board captions'},
];

const arcAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the readout help carries the help line the old panel showed above its details (it carries no readout marker, so the recording holds none), and the mover line "t = .., s(t) = .." is declared as a note while the old panel drew it only as a board caption, which the recording holds as a caption'},
];

const quadratureAccepted: readonly AcceptedDifference[] = [];

const eulerAccepted:readonly AcceptedDifference[] = [
    {kind: 'missing', where: 'output', reason: 'the step slider read the step h (e.g. "0,5"); the step puck now counts halvings k, so the same value is shown by the declared row h, which the recorded panel row "Korak h" already matches'},
];

const leastSquaresAccepted: readonly AcceptedDifference[] = [
    {kind: 'missing', where: 'output', reason: 'the point count read-off belongs to the retained point editor in Orodja (data-parity-retained); the declared points row shows the same count'},
];

const reductionAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the readout help carries the tolerance sentence the old panel showed beside its readouts (it carries no readout marker, so the recording holds none)'},
];

const circleConstructionAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the readout help carries the approximation sentence the old panel showed under its readouts (it carries no readout marker, so the recording holds none)'},
];

const fortuneAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'note', reason: 'the processed event, the queue and the cancelled circle events are one sentence each'},
    {kind: 'extra', where: 'row height', reason: 'the sweep height is a row with its formula'},
];

/** The queue items ("▸ mesto Anaslednji dogodek", "● krožni dogodek (B, A, C)trenutni dogodek", a bare "mesto B") and the TeX height sentence. */
const fortuneMovedNotes = {
    pattern: /^(?:[▸●] )?(?:mesto [A-Z]|krožni dogodek \()|^Višina pometalne premice: |^Pometalna premica je nad vsemi mesti\.$/,
    reason: 'the old panel listed the queue one item per line with glyphs and screen-reader words, and the sweep height as a TeX sentence (or "above all the sites" before the first event); the declaration says the queue and the processed event as one sentence each and the height as a row',
};

const SAMPLES: readonly Sample[] = [
    {file: 'functions/__parity__/taylor.json', demonstration: 'taylor', states: [
        state('default', {}),
        state('degree 3, x 1,5', {'taylor-degree': 3, 'taylor-x': 1.5}),
        state('centre 1, degree 6', {'taylor-center': 1, 'taylor-degree': 6}),
        {name: 'bound shown', apply: graph => { runAs('learner', () => (graph as unknown as {setBoundVisible(v: boolean): void}).setBoundVisible(true)); }},
        state('sine, degree 5, x 2', {'taylor-example': 'sine', 'taylor-center': 0, 'taylor-degree': 5, 'taylor-x': 2}),
        state('geometric inside', {'taylor-example': 'geometric', 'taylor-center': 0, 'taylor-degree': 4, 'taylor-x': 0.5}),
        state('geometric outside', {'taylor-center': 0.5, 'taylor-x': -0.5}),
        state('flat', {'taylor-example': 'flat', 'taylor-center': 0, 'taylor-degree': 2, 'taylor-x': 1}),
    ]},
    {file: 'functions/__parity__/function-transformation.json', demonstration: 'function-transformation', states: [
        state('default', {}),
        state('stretch and shift', {'transform-a': 1.5, 'transform-b': 2, 'transform-c': -1, 'transform-d': 0.5}),
        state('point u 1', {'transform-u': 1}),
        state('reflected, compressed', {'transform-a': -1, 'transform-b': 0.5, 'transform-c': 2, 'transform-d': -2}),
        state('sqrt', {'transform-base': 'sqrt', 'transform-u': 4}),
        state('reciprocal', {'transform-base': 'reciprocal', 'transform-u': 2}),
        state('abs', {'transform-base': 'abs', 'transform-u': -3}),
    ]},
    {file: 'curves/bezier/__parity__/decasteljau.json', demonstration: 'decasteljau', states: [
        state('default', {}),
        state('t 0', {'decasteljau-t': 0}),
        state('t 0,25', {'decasteljau-t': 0.25}),
        state('t 0,8', {'decasteljau-t': 0.8}),
        state('t 1', {'decasteljau-t': 1}),
    ]},
    {file: 'compgeo/__parity__/triangle-centres.json', demonstration: 'triangle-centres', states: [
        state('default', {}),
        {name: 'obtuse example', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('obtuse')); }},
        {name: 'right example', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('right')); }},
        {name: 'degenerate example', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('degenerate')); }},
        {name: 'scalene acute', apply: graph => { runAs('learner', () => (graph as unknown as {loadModel(model: unknown): void}).loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 5, y: 1}, {x: 1, y: 4}]})); }},
        {name: 'two points', apply: graph => { runAs('learner', () => (graph as unknown as {loadModel(model: unknown): void}).loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 5, y: 1}]})); }},
        // Centres stay inside the initial view: whether a centre is outside the view is board state, which a declaration cannot hold.
        {name: 'obtuse custom', apply: graph => { runAs('learner', () => (graph as unknown as {loadModel(model: unknown): void}).loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 3, y: 3}]})); }},
    ]},
    {file: 'projective/__parity__/projective-cross-ratio.json', demonstration: 'projective-cross-ratio', states: [
        state('default', {}),
        {name: 'harmonic', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('harmonic')); }},
        {name: 'image at infinity', apply: graph => { runAs('learner', () => (graph as unknown as {loadExample(id: string): void}).loadExample('infinity')); }},
        {name: 'point D moved', apply: graph => { runAs('learner', () => { (graph as unknown as {loadExample(id: string): void}).loadExample('default'); (graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}).moveHandleTo(3, 6, 0); }); }},
        {name: 'centre and N moved', apply: graph => { runAs('learner', () => { const g = graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}; g.moveHandleTo(4, 3, 6); g.moveHandleTo(6, 4, 1); }); }},
        {name: 'centre on the first line', apply: graph => { runAs('learner', () => (graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}).moveHandleTo(4, 2, 0)); }},
        {name: 'two points coincide', apply: graph => { runAs('learner', () => { const g = graph as unknown as {moveHandleTo(h: number, x: number, y: number): void}; g.moveHandleTo(4, 0, 5); g.moveHandleTo(1, 0, 0); }); }},
        {name: 'second line degenerate', apply: graph => { runAs('learner', () => { const g = graph as unknown as {loadExample(id: string): void; moveHandleTo(h: number, x: number, y: number): void}; g.loadExample('harmonic'); g.moveHandleTo(6, 0, 1); }); }},
    ]},
    {file: 'projective/__parity__/projective-five-point.json', demonstration: 'projective-five-point', states: (() => {
        type Five = {loadExample(id: string): void; moveTo(i: number, x: number, y: number): boolean; chooseEnd(which: 'a' | 'b', i: number): boolean; chooseThird(i: number): boolean};
        const on = (apply: (g: Five) => void): ParityState['apply'] => graph => { runAs('learner', () => apply(graph as unknown as Five)); };
        return [
            {name: 'default ellipse', apply: () => {}},
            {name: 'hyperbola', apply: on(g => g.loadExample('hyperbola'))},
            {name: 'parabola', apply: on(g => g.loadExample('parabola'))},
            {name: 'three collinear', apply: on(g => g.loadExample('three-collinear'))},
            {name: 'four collinear', apply: on(g => g.loadExample('four-collinear'))},
            {name: 'point moved', apply: on(g => { g.loadExample('ellipse'); g.moveTo(3, 5, 2); })},
            {name: 'arc ends changed', apply: on(g => { g.loadExample('ellipse'); g.chooseEnd('a', 2); g.chooseEnd('b', 4); g.chooseThird(0); })},
            {name: 'ellipse made degenerate (stale conic)', apply: on(g => { g.loadExample('ellipse'); g.moveTo(3, 2, 0); })},
        ];
    })()},
    {file: 'projective/__parity__/projective-three-views.json', demonstration: 'projective-three-views', states: (() => {
        type Three = {setCTenths(tenths: number): boolean; togglePoint(on: boolean): boolean; placePoint(step: number): boolean};
        const on = (apply: (g: Three) => void): ParityState['apply'] => graph => { runAs('learner', () => apply(graph as unknown as Three)); };
        return [
            {name: 'default ellipse (c = 2)', apply: () => {}},
            {name: 'parabola (c = 1)', apply: on(g => g.setCTenths(10))},
            {name: 'hyperbola (c = 0)', apply: on(g => g.setCTenths(0))},
            {name: 'point on the circle', apply: on(g => { g.setCTenths(5); g.togglePoint(true); g.placePoint(2); })},
            {name: 'point on L (at infinity)', apply: on(g => { g.setCTenths(0); g.togglePoint(true); g.placePoint(0); })},
            {name: 'clipped image', apply: on(g => { g.setCTenths(9); g.togglePoint(true); g.placePoint(6); })},
            {name: 'L below the circle', apply: on(g => g.setCTenths(-15))},
        ];
    })()},
    {file: 'compgeo/__parity__/polygon-area.json', demonstration: 'polygon-area', states: (() => {
        type Area = {loadModel(model: unknown): void; setOverlay(id: string, shown: boolean): void; setPolygonClosed(closed: boolean): boolean; reverseOrder(): boolean};
        const polygon = (points: [number, number][], closed = true) => ({mode: 'polygon', closed, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
        const load = (model: unknown, values = true): ParityState['apply'] => graph => { runAs('learner', () => { const g = graph as unknown as Area; g.loadModel(model); g.setOverlay('values', values); }); };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        const pentagon = polygon([[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]]);
        return [
            step('hull pentagon', load(pentagon)),
            step('notched pentagon', load(polygon([[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]]))),
            step('square', load(polygon([[0, 0], [3, 0], [3, 3], [0, 3]]))),
            step('square reversed', graph => { load(polygon([[0, 0], [3, 0], [3, 3], [0, 3]]))(graph); runAs('learner', () => (graph as unknown as Area).reverseOrder()); }),
            step('values hidden', load(pentagon, false)),
            step('open polygon', graph => { load(pentagon)(graph); runAs('learner', () => (graph as unknown as Area).setPolygonClosed(false)); }),
            step('two points', load(polygon([[0, 0], [4, 1]]))),
            step('bow tie', load(polygon([[0, 0], [4, 4], [4, 0], [0, 4]]))),
        ];
    })()},
    {file: 'compgeo/__parity__/bezier-hulls.json', demonstration: 'bezier-hulls', states: (() => {
        type Pair = [number, number][];
        type Hulls = {applyPointSetAction(action: unknown): void; setOverlay(id: string, shown: boolean): void};
        const crossing: Pair = [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]];
        const nearMiss: Pair = [[4, 0], [8, 2], [2, 6], [5, 0], [7, 4], [3, 6]];
        const apart: Pair = [[0, 0], [2, 1], [4, 0], [0, 6], [2, 8], [4, 6]];
        const point = (operation: string, rest: Record<string, unknown>) => ({kind: 'point-set', operation, ...rest});
        const run = (pair: Pair, step: number | 'end', pieces = true): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Hulls;
                g.applyPointSetAction(point('set-points', {mode: 'points', points: pair}));
                g.setOverlay('pieces', pieces);
                g.applyPointSetAction(point('set-trace-step', {step}));
            });
        };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('crossing, split step 1', run(crossing, 1)),
            step('crossing, discard step 2', run(crossing, 2)),
            step('crossing, end', run(crossing, 'end')),
            step('crossing, pieces hidden', run(crossing, 2, false)),
            step('near miss, end', run(nearMiss, 'end')),
            step('hulls apart, end', run(apart, 'end')),
        ];
    })()},
    {file: 'compgeo/__parity__/convex-hull.json', demonstration: 'convex-hull', states: (() => {
        type Hull = {setAlgorithm(id: string): void; nextStep(): void; loadModel(model: unknown): void; run(): {length: number}};
        const model = (points: [number, number][]) => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
        const run = (algorithm: string, steps: number | 'end', points?: [number, number][]): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Hull;
                if (points) g.loadModel(model(points));
                g.setAlgorithm(algorithm);
                const count = steps === 'end' ? g.run().length - 1 : steps;
                for (let i = 0; i < count; i++) g.nextStep();
            });
        };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('chain, pop test (5)', run('monotone-chain', 5)),
            step('chain, collinear test (11)', run('monotone-chain', 11)),
            step('chain, end', run('monotone-chain', 'end')),
            step('slow edge test, 3', run('slow-edge-test', 3)),
            step('slow edge test, end', run('slow-edge-test', 'end')),
            step('gift wrapping, 7', run('gift-wrapping', 7)),
            step('gift wrapping, end', run('gift-wrapping', 'end')),
            step('two points, end', run('monotone-chain', 'end', [[0, 0], [3, 1]])),
            step('collinear points, end', run('monotone-chain', 'end', [[0, 0], [1, 1], [2, 2], [3, 3]])),
        ];
    })()},
    {file: 'compgeo/__parity__/hull-robustness.json', demonstration: 'hull-robustness', states: (() => {
        type Robust = {
            setRobustnessMode(mode: string): void; setPopRule(rule: string): void; setDuplicateRule(rule: string): void;
            setKettnerPanel(panel: string): void; selectKettnerCell(i: number, j: number): void;
            loadModel(model: unknown): void; resetTrace(): void; nextStep(): void; run(): {length: number};
        };
        const model = (points: [number, number][]) => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
        const collinear: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 0], [1, 3]];
        const doubled: [number, number][] = [[0, 0], [4, 0], [4, 0], [2, 3], [0, 0]];
        const chain = (pop: string, duplicates: string, points: [number, number][] | undefined, steps: number | 'end'): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Robust;
                g.setRobustnessMode('chain'); g.setPopRule(pop); g.setDuplicateRule(duplicates);
                if (points) g.loadModel(model(points));
                g.resetTrace();
                const count = steps === 'end' ? g.run().length - 1 : steps;
                for (let i = 0; i < count; i++) g.nextStep();
            });
        };
        const kettner = (panel: string, i: number, j: number): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Robust;
                g.setRobustnessMode('kettner'); g.setKettnerPanel(panel); g.selectKettnerCell(i, j);
            });
        };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('chain, step 5', chain('non-left', 'merge', undefined, 5)),
            step('chain, end', chain('non-left', 'merge', undefined, 'end')),
            step('collinear, drop rule, end', chain('non-left', 'merge', collinear, 'end')),
            step('collinear, keep rule, test step', chain('right', 'merge', collinear, 4)),
            step('collinear, keep rule, end', chain('right', 'merge', collinear, 'end')),
            step('duplicates merged, end', chain('non-left', 'merge', doubled, 'end')),
            step('duplicates kept, end', chain('non-left', 'keep', doubled, 'end')),
            step('Kettner inexact, default cell', kettner('inexact', 41, 48)),
            step('Kettner exact, default cell', kettner('exact', 41, 48)),
            step('Kettner exact, cell 10,20', kettner('exact', 10, 20)),
            step('Kettner inexact, cell 10,20', kettner('inexact', 10, 20)),
        ];
    })()},
    {file: 'compgeo/__parity__/delaunay.json', demonstration: 'delaunay', states: (() => {
        type Delaunay = {
            applyPointSetAction(action: unknown): void; loadExample(index: number): void; selectTriangle(index: number | undefined): void;
            selectEdge(a: number, b?: number): void; flipSelected(): boolean; addPointAt(point: {x: number; y: number}): boolean;
        };
        const point = (operation: string, rest: Record<string, unknown>) => ({kind: 'point-set', operation, ...rest});
        const on = (act: (g: Delaunay) => void): ParityState['apply'] => graph => { runAs('learner', () => act(graph as unknown as Delaunay)); };
        const traceTo = (step: number | 'end') => (g: Delaunay) => g.applyPointSetAction(point('set-trace-step', {step}));
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('quad, step 1 (test)', on(g => { g.loadExample(0); traceTo(1)(g); })),
            step('quad, step 3', on(g => { g.loadExample(0); traceTo(3)(g); })),
            step('quad, end', on(g => { g.loadExample(0); traceTo('end')(g); })),
            step('seven, step 1', on(g => { g.loadExample(1); traceTo(1)(g); })),
            step('seven, end', on(g => { g.loadExample(1); traceTo('end')(g); })),
            step('seven, triangle selected', on(g => { g.loadExample(1); g.selectTriangle(2); })),
            step('square, end (cocircular)', on(g => { g.loadExample(2); traceTo('end')(g); })),
            step('quad, point added', on(g => { g.loadExample(0); g.addPointAt({x: 2, y: 1}); })),
            step('quad, edge flipped', on(g => { g.loadExample(0); g.selectEdge(0, 2); g.flipSelected(); })),
            step('quad, hull edge flip refused', on(g => { g.loadExample(0); g.selectEdge(0, 1); g.flipSelected(); })),
        ];
    })()},
    {file: 'compgeo/__parity__/ear-clipping.json', demonstration: 'ear-clipping', states: (() => {
        type Ear = {nextStep(): void; loadModel(model: unknown): void; run(): {length: number}};
        const polygon = (points: [number, number][]) => ({mode: 'polygon', closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
        const comb: [number, number][] = [[0, 0], [18, 0], [16, 2], [15, 6], [14, 2], [10, 2], [9, 6], [8, 2], [4, 2], [3, 6], [2, 2]];
        const clockwise: [number, number][] = [[0, 0], [0, 4], [3, 2], [6, 4], [6, 0]];
        const bowtie: [number, number][] = [[0, 0], [4, 4], [4, 0], [0, 4]];
        const run = (steps: number | 'end', points?: [number, number][]): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Ear;
                if (points) g.loadModel(polygon(points));
                const count = steps === 'end' ? g.run().length - 1 : steps;
                for (let i = 0; i < count; i++) g.nextStep();
            });
        };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('example 1, step 2', run(2)),
            step('example 1, step 5', run(5)),
            step('example 1, end', run('end')),
            step('comb, end', run('end', comb)),
            step('clockwise polygon, step 2', run(2, clockwise)),
            step('self-crossing polygon', run(0, bowtie)),
            step('two points', run(0, [[0, 0], [3, 1]])),
        ];
    })()},
    {file: 'compgeo/__parity__/fortune.json', demonstration: 'fortune', accepted: fortuneAccepted, movedNotes: fortuneMovedNotes, states: (() => {
        type Fortune = {applyPointSetAction(action: unknown): void; loadExample(id: string): void; loadModel(model: unknown): void};
        const model = (points: [number, number][]) => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
        const run = (steps: number | 'end', example?: string, points?: [number, number][]): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Fortune;
                if (example) g.loadExample(example);
                if (points) g.loadModel(model(points));
                g.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step: steps});
            });
        };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('example 1, step 2', run(2)),
            step('example 1, step 3', run(3)),
            step('example 1, step 4', run(4)),
            step('example 1, step 5 (false alarm)', run(5)),
            step('example 1, step 6', run(6)),
            step('example 1, end', run('end')),
            step('example 2, step 3', run(3, 'example-2')),
            step('example 2, end', run('end', 'example-2')),
            step('collinear, end', run('end', 'collinear')),
            step('cocircular, end', run('end', 'cocircular')),
            step('one site', run(0, undefined, [[0, 0]])),
        ];
    })()},
    {file: 'compgeo/__parity__/bezier-clipping.json', demonstration: 'bezier-clipping', states: (() => {
        type Pair = [number, number][];
        type Clipping = {applyPointSetAction(action: unknown): void; setClipTolerance(exponent: number): boolean};
        const crossing: Pair = [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]];
        const tangent: Pair = [[0, 0], [2, 4], [4, 0], [0, 4], [2, 0], [4, 4]];
        const offset: Pair = [[0, 0], [2, 4], [4, 0], [0, 4.5], [2, 0.5], [4, 4.5]];
        const apart: Pair = [[0, 0], [2, 1], [4, 0], [0, 6], [2, 8], [4, 6]];
        const point = (operation: string, rest: Record<string, unknown>) => ({kind: 'point-set', operation, ...rest});
        const run = (pair: Pair, exponent: number, tolerance: number, step: number | 'end'): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Clipping;
                g.applyPointSetAction(point('load-model', {points: pair, gridStepExponent: exponent}));
                g.setClipTolerance(tolerance);
                g.applyPointSetAction(point('set-trace-step', {step}));
            });
        };
        const step = (name: string, apply: ParityState['apply']): ParityState => ({name, apply});
        return [
            step('default', () => {}),
            step('crossing, step 4', run(crossing, 0, 6, 4)),
            step('crossing, step 5', run(crossing, 0, 6, 5)),
            step('crossing, end', run(crossing, 0, 6, 'end')),
            step('crossing, tolerance 3, end', run(crossing, 0, 3, 'end')),
            step('hulls apart', run(apart, 0, 6, 0)),
            step('tangent, tolerance 10, end', run(tangent, 0, 10, 'end')),
            step('offset, end (empty)', run(offset, -1, 6, 'end')),
        ];
    })()},
    {file: 'patches/__parity__/patch-coons.json', demonstration: 'patch-coons', states: (() => {
        type Coons = {selectBoundaryPoint(name: string, index: number): void; setSelectedCoordinates(xyz: [number, number, number]): void; setLinkedCorners(linked: boolean): void};
        const move = (name: string, index: number, xyz: [number, number, number]) => (graph: unknown) => runAs('learner', () => {
            (graph as Coons).selectBoundaryPoint(name, index);
            (graph as Coons).setSelectedCoordinates(xyz);
        });
        const step = (name: string, apply: (graph: unknown) => void): ParityState => ({name, apply: graph => apply(graph)});
        return [
            state('default', {}),
            step('inner point raised', move('c0', 1, [1, 0, 1.5])),
            step('linked corner moved', move('c0', 0, [0.2, 0.1, 0.3])),
            step('corners unlinked, one corner apart', graph => { runAs('learner', () => (graph as Coons).setLinkedCorners(false)); move('d0', 0, [-0.5, 0.5, 0.9])(graph); }),
            step('far corner raised, still unlinked', move('d1', 3, [3, 3, 1])),
            step('corners linked again, inner point moved', graph => { runAs('learner', () => (graph as Coons).setLinkedCorners(true)); move('c1', 1, [1.5, 3.4, -1])(graph); }),
        ];
    })()},
    {file: 'linear/__parity__/linear-map-basis.json', demonstration: 'linear-map', states: [
        state('basis default', {'linear-map-mode': 'basis'}),
        state('shear', {'linear-map-example': 'shear'}),
        state('quarter turn', {'linear-map-example': 'quarter-turn'}),
        state('reflection', {'linear-map-example': 'reflection-x'}),
        state('scalar 2', {'linear-map-example': 'scalar-2'}),
        state('entry a12 = 2', {'linear-map-a12': 2}),
        state('entry a21 = -1', {'linear-map-a21': -1}),
        state('singular', {'linear-map-example': 'singular'}),
    ]},
    {file: 'linear/__parity__/linear-map-determinant.json', demonstration: 'linear-map', states: [
        state('determinant identity', {'linear-map-mode': 'determinant', 'linear-map-example': 'identity'}),
        state('scalar 2', {'linear-map-example': 'scalar-2'}),
        state('orientation reversing', {'linear-map-example': 'orientation-reversing'}),
        state('singular', {'linear-map-example': 'singular'}),
        state('shear', {'linear-map-example': 'shear'}),
        state('entry a11 = 3', {'linear-map-a11': 3}),
        state('entry a22 = -2', {'linear-map-a22': -2}),
    ]},
    {file: 'functions/__parity__/exponential-function.json', demonstration: 'exponential-function', states: (() => {
        const base = (value: number): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as {setBase(value: number): void}).setBase(value)); };
        const mirror = (visible: boolean): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as {setMirrorVisible(visible: boolean): void}).setMirrorVisible(visible)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'base 3', apply: base(3)},
            {name: 'base 0.5', apply: base(0.5)},
            {name: 'base 1 (constant)', apply: base(1)},
            {name: 'base 2.5 with mirror', apply: graph => { base(2.5)(graph); mirror(true)(graph); }},
            {name: 'base 0.25 with mirror', apply: base(0.25)},
            {name: 'mirror hidden', apply: mirror(false)},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/bspline/__parity__/bspline-blossom.json', demonstration: 'bspline-blossom', states: (() => {
        type Blossom = {setArgument(index: number, value: number): void; setSegment(segment: number): void; setDegree(degree: number): void; setShowBezier(show: boolean): void};
        const run = (edit: (graph: Blossom) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Blossom)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'a 0, b 1', apply: run(g => { g.setArgument(0, 0); g.setArgument(1, 1); })},
            {name: 'a 0,25, b 0,75', apply: run(g => { g.setArgument(0, 0.25); g.setArgument(1, 0.75); })},
            {name: 'a 0,75, b 0,25', apply: run(g => { g.setArgument(0, 0.75); g.setArgument(1, 0.25); })},
            {name: 'a = b = 0,5 (curve point)', apply: run(g => { g.setArgument(0, 0.5); g.setArgument(1, 0.5); })},
            {name: 'a = b = 1,5 outside the segment', apply: run(g => { g.setArgument(0, 1.5); g.setArgument(1, 1.5); })},
            {name: 'segment [1, 2), a = b = 1,25', apply: run(g => { g.setSegment(3); g.setArgument(0, 1.25); g.setArgument(1, 1.25); })},
            {name: 'segment [1, 2), a 0,5, b 1,25', apply: run(g => { g.setArgument(0, 0.5); g.setArgument(1, 1.25); })},
            {name: 'Bezier points hidden, a 1, b 1,75', apply: run(g => { g.setShowBezier(false); g.setArgument(0, 1); g.setArgument(1, 1.75); })},
            {name: 'degree 3', apply: run(g => { g.setShowBezier(true); g.setDegree(3); })},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/bspline/__parity__/bspline-extraction.json', demonstration: 'bspline-extraction', accepted: extractionAccepted, states: (() => {
        type Extraction = {selectExample(id: 'quadratic' | 'cubic'): void; editPoint(index: number, value: readonly [number, number]): void;
            editKnot(index: number, value: number): string | undefined; resetToOrigin(): void};
        const run = (edit: (graph: Extraction) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Extraction)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'point 2 moved', apply: run(g => g.editPoint(2, [2, 3.5]))},
            {name: 'point 0 moved', apply: run(g => g.editPoint(0, [0.5, 0.5]))},
            {name: 'reset', apply: run(g => g.resetToOrigin())},
            {name: 'cubic example', apply: run(g => g.selectExample('cubic'))},
            {name: 'cubic, point 3 moved', apply: run(g => g.editPoint(3, [3, 2]))},
            {name: 'cubic, knot 5 typed', apply: run(g => { g.resetToOrigin(); g.editKnot(5, 1.5); })},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/bspline/__parity__/bspline-insertion.json', demonstration: 'bspline-insertion', states: (() => {
        type Insertion = {selectExample(id: 'quadratic' | 'cubic'): void; insert(x?: number): boolean; setShowComb(show: boolean): void;
            editPoint(index: number, value: readonly [number, number]): void; resetToOrigin(): void};
        const run = (edit: (graph: Insertion) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Insertion)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'insert 1', apply: run(g => g.insert(1))},
            {name: 'insert 0,5', apply: run(g => { g.resetToOrigin(); g.insert(0.5); })},
            {name: 'insert 1,5 after 0,5, comb hidden', apply: run(g => { g.insert(1.5); g.setShowComb(false); })},
            {name: 'comb shown, a point moved', apply: run(g => { g.setShowComb(true); g.editPoint(2, [3, 3]); })},
            {name: 'reset', apply: run(g => g.resetToOrigin())},
            {name: 'cubic example', apply: run(g => g.selectExample('cubic'))},
            {name: 'cubic, insert 1,5', apply: run(g => g.insert(1.5))},
            {name: 'cubic, insert 2 (triple knot)', apply: run(g => { g.resetToOrigin(); g.insert(2); })},
            {name: 'cubic, insert 2 again (a break)', apply: run(g => g.insert(2))},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/bspline/__parity__/bspline-nurbs.json', demonstration: 'bspline-nurbs', accepted: nurbsAccepted, states: (() => {
        type Nurbs = {selectExample(id: 'circle' | 'unit'): void; setT(t: number): void; setWeight(index: number, value: number): string | undefined;
            setShowCircle(show: boolean): void; editPoint(index: number, value: readonly [number, number]): void; resetToOrigin(): void};
        const run = (edit: (graph: Nurbs) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Nurbs)); };
        return [
            {name: 'default (the circle, t = 1/16)', apply: () => undefined},
            {name: 't = 1/8', apply: run(g => g.setT(0.125))},
            {name: 't = 0,6', apply: run(g => g.setT(0.6))},
            {name: 'unit weights example', apply: run(g => { g.selectExample('unit'); g.setT(0.125); })},
            {name: 'a corner weight 2', apply: run(g => { g.selectExample('circle'); g.setWeight(1, 2); })},
            {name: 'weight 4 is 0,5, t = 0,3', apply: run(g => { g.setWeight(3, 0.5); g.setT(0.3); })},
            {name: 'circle hidden, a point moved', apply: run(g => { g.resetToOrigin(); g.setShowCircle(false); g.editPoint(2, [0.2, 1.4]); })},
            {name: 'reset', apply: run(g => g.resetToOrigin())},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/bspline/__parity__/bspline-deboor.json', demonstration: 'bspline-deboor', accepted: deBoorAccepted, states: (() => {
        type DeBoor = {setT(t: number): void; setDegree(degree: number): void; changePointCount(add: boolean): void; nextStep(): boolean; resetLevels(): void;
            editPoint(index: number, value: readonly [number, number]): void};
        const run = (edit: (graph: DeBoor) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as DeBoor)); };
        return [
            {name: 'default (degree 2, t = 0,5)', apply: () => undefined},
            {name: 't = 1,5', apply: run(g => g.setT(1.5))},
            {name: 'two levels revealed', apply: run(g => { g.nextStep(); g.nextStep(); })},
            {name: 'degree 3', apply: run(g => g.setDegree(3))},
            {name: 'a fifth point', apply: run(g => g.changePointCount(true))},
            {name: 'a point moved, t = 1', apply: run(g => { g.editPoint(1, [1, 3]); g.setT(1); })},
            {name: 'degree 1, levels reset', apply: run(g => { g.setDegree(1); g.resetLevels(); })},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/arclength/__parity__/arc-length-param.json', demonstration: 'arc-length-param', accepted: arcAccepted, states: (() => {
        type Arc = {setArcMoverPosition(value: number): void; setArcPieces(value: number): void; setArcMoverMode(mode: 'parameter' | 'arc'): void;
            setCurveKind(kind: 'bezier' | 'ph'): void; runLessonReplacement(spec: Record<string, unknown>): void; importPresetData(data: unknown): void; getInitialState(): object; lessonDefaultState(): object};
        const run = (edit: (graph: Arc) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Arc)); };
        const cuspState = {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false,
            subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2};
        return [
            {name: 'default (the cubic Q, N = 8)', apply: () => undefined},
            {name: 'position 0,5', apply: run(g => g.setArcMoverPosition(0.5))},
            {name: 'N = 16', apply: run(g => g.setArcPieces(16))},
            {name: 'constant arc speed, position 0,25', apply: run(g => { g.setArcMoverMode('arc'); g.setArcMoverPosition(0.25); })},
            {name: 'the PH curve', apply: run(g => g.setCurveKind('ph'))},
            {name: 'PH, N = 4, position 0,3', apply: run(g => { g.setArcPieces(4); g.setArcMoverPosition(0.3); })},
            {name: 'a cusp curve', apply: run(g => g.runLessonReplacement({importData: () => g.importPresetData([['JSXBezierCurve', {points: [[0, 0], [1, 2], [0, 1], [1, 1]], state: cuspState}]]), afterImport: () => undefined, state: () => ({...g.getInitialState(), ...g.lessonDefaultState()}), transientState: undefined}))},
        ] satisfies ParityState[];
    })()},
    {file: 'curves/reduction/__parity__/reduction.json', demonstration: 'reduction', accepted: reductionAccepted, states: (() => {
        type Reduction = {setControlPoints(points: ReadonlyArray<readonly [number, number]>): void; setReductionMode(mode: 'fixed' | 'free'): void};
        const run = (edit: (graph: Reduction) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Reduction)); };
        const P = [[0, 0], [1, 3], [3, 3], [4, 0]] as const, P2 = [[0, 0], [1, 4], [3, 1], [4, 3]] as const;
        return [
            {name: 'default (the elevated quadratic, reducible)', apply: () => undefined},
            {name: 'P, fixed end points', apply: run(g => g.setControlPoints(P))},
            {name: 'P, free end points', apply: run(g => g.setReductionMode('free'))},
            {name: 'P2, free end points', apply: run(g => g.setControlPoints(P2))},
            {name: 'P2, fixed end points', apply: run(g => g.setReductionMode('fixed'))},
            {name: 'a flat cubic', apply: run(g => g.setControlPoints([[0, 0], [1, 0], [2, 0], [3, 0]]))},
        ] satisfies ParityState[];
    })()},
    {file: 'compgeo/__parity__/circle-construction.json', demonstration: 'circle-construction', accepted: circleConstructionAccepted, states: (() => {
        type Circle = {applyCircleAction(action: Record<string, unknown>): void};
        const act = (...actions: Record<string, unknown>[]): ParityState['apply'] => graph => {
            runAs('learner', () => actions.forEach(action => (graph as unknown as Circle).applyCircleAction({kind: 'circle', ...action})));
        };
        const mode = (value: string) => ({operation: 'set-mode', mode: value});
        const point = (x: number, y: number) => ({operation: 'set-point', x, y});
        const circle = (which: string, x: number, y: number, r: number) => ({operation: 'set-circle', circle: which, x, y, r});
        return [
            {name: 'default (tangents, P outside)', apply: () => undefined},
            {name: 'tangents, P inside', apply: act(point(3, 1))},
            {name: 'tangents, P on the circle', apply: act(point(5, 0))},
            {name: 'tangents, P at the centre', apply: act(point(0, 0))},
            {name: 'tangents, P outside, radius 2', apply: act(point(8, 6), circle('c1', 0, 0, 2))},
            {name: 'radical example', apply: act(mode('radical'))},
            {name: 'radical, probe moved', apply: act(point(-3, 5))},
            {name: 'radical, second circle moved', apply: act(circle('c2', 6, 2, 3))},
            {name: 'radical, circles 1 and 2 concentric', apply: act(circle('c2', 0, 0, 3))},
            {name: 'radical, circles 1 and 2 coincide', apply: act(circle('c2', 0, 0, 5))},
            {name: 'radical, centres on a line', apply: act(circle('c1', 0, 0, 5), circle('c2', 6, 0, 3), circle('c3', 12, 0, 2))},
            {name: 'apollonius example', apply: act(mode('apollonius'))},
            {name: 'apollonius, ratio 1 (a line)', apply: act({operation: 'set-apollonius', k: 1})},
            {name: 'apollonius, P at B', apply: act({operation: 'set-apollonius', k: 2, p: {x: 6, y: 0}})},
            {name: 'common example', apply: act(mode('common'))},
            {name: 'common, crossing', apply: act(circle('c2', 4, 0, 3))},
            {name: 'common, touching outside', apply: act(circle('c2', 7, 0, 4))},
            {name: 'common, nested', apply: act(circle('c2', 1, 0, 1))},
            {name: 'common, equal radii', apply: act(circle('c1', 0, 0, 3), circle('c2', 9, 0, 3))},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/function-inverse.json', demonstration: 'function-inverse', states: (() => {
        type InverseSetters = {setX0(value: number): void; setBase(value: number): void; setRestriction(value: string): void};
        const run = (edit: (graph: InverseSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as InverseSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'square x0 1.2', apply: run(g => g.setX0(1.2))},
            {name: 'square x0 0 (vertical inverse tangent)', apply: run(g => g.setX0(0))},
            {name: 'exp base 2', apply: run(g => { g.setRestriction('exp'); g.setX0(1); })},
            {name: 'exp base 0.5', apply: run(g => { g.setBase(0.5); g.setX0(-1); })},
            {name: 'exp base 3', apply: run(g => { g.setBase(3); g.setX0(0.5); })},
            {name: 'natural x0 1.5', apply: run(g => { g.setRestriction('natural'); g.setX0(1.5); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/interp-least-squares.json', demonstration: 'interp-least-squares', accepted: leastSquaresAccepted, states: (() => {
        type Lsq = {setDegree(value: number): void; setPoint(index: number, value: readonly [number, number]): void; setManualLine(value: boolean): void;
            setLine(field: 'slope' | 'intercept', value: number): void; addPoint(): void; removePoint(): void};
        const run = (edit: (graph: Lsq) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as Lsq)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'degree 2', apply: run(g => g.setDegree(2))},
            {name: 'degree 3', apply: run(g => g.setDegree(3))},
            {name: 'degree 1, outlier (3, 8)', apply: run(g => { g.setDegree(1); g.setPoint(3, [3, 8]); })},
            {name: 'manual line y = x + 1', apply: run(g => { g.setManualLine(true); g.setLine('slope', 1); g.setLine('intercept', 1); })},
            {name: 'manual line y = 2', apply: run(g => { g.setLine('slope', 0); g.setLine('intercept', 2); })},
            {name: 'best fit, five points', apply: run(g => { g.setManualLine(false); g.addPoint(); })},
            {name: 'degree 4 through five points', apply: run(g => g.setDegree(4))},
            {name: 'three points, quadratic', apply: run(g => { g.removePoint(); g.removePoint(); g.setDegree(2); })},
            {name: 'vertical data', apply: run(g => { g.setDegree(1); g.setPoint(0, [2, 0]); g.setPoint(1, [2, 1]); g.setPoint(2, [2, 3]); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/arc-length.json', demonstration: 'arc-length', states: (() => {
        type ArcSetters = {setBound(which: 'a' | 'b', value: number): void; setCount(value: number): void};
        const run = (edit: (graph: ArcSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as ArcSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'n 1', apply: run(g => g.setCount(1))},
            {name: 'n 10', apply: run(g => g.setCount(10))},
            {name: 'n 100', apply: run(g => g.setCount(100))},
            {name: 'a 0.5, b 2.5', apply: run(g => { g.setBound('a', 0.5); g.setBound('b', 2.5); })},
            {name: 'a = b', apply: run(g => { g.setBound('a', 1.5); g.setBound('b', 1.5); })},
            {name: 'a > b', apply: run(g => { g.setBound('a', 3); g.setBound('b', 0.25); g.setCount(4); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/area-between-curves.json', demonstration: 'area-between-curves', states: (() => {
        type AreaSetters = {setBound(which: 'a' | 'b', value: number): void; setMode(value: string): void};
        const run = (edit: (graph: AreaSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as AreaSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'between 1..3', apply: run(g => { g.setBound('a', 1); g.setBound('b', 3); })},
            {name: 'under g 1..3', apply: run(g => { g.setMode('under-g'); g.setBound('a', 1); g.setBound('b', 3); })},
            {name: 'under f 1..3', apply: run(g => g.setMode('under-f'))},
            {name: 'between 0..4', apply: run(g => { g.setMode('between'); g.setBound('a', 0); g.setBound('b', 4); })},
            {name: 'between 1..3.5', apply: run(g => g.setBound('b', 3.5))},
            {name: 'reversed a > b', apply: run(g => { g.setBound('a', 4); g.setBound('b', 0); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/definite-integral.json', demonstration: 'definite-integral', states: (() => {
        type IntegralSetters = {setBound(which: 'a' | 'b', value: number): void; setCount(value: number): void; setMethod(value: string): void; setFunction(value: string): void};
        const run = (edit: (graph: IntegralSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as IntegralSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'n 10', apply: run(g => g.setCount(10))},
            {name: 'right sum', apply: run(g => g.setMethod('right'))},
            {name: 'midpoint, n 4', apply: run(g => { g.setMethod('midpoint'); g.setCount(4); })},
            {name: 'trapezoid, n 20', apply: run(g => { g.setMethod('trapezoid'); g.setCount(20); })},
            {name: 'a 0.5, b 1.5', apply: run(g => { g.setBound('a', 0.5); g.setBound('b', 1.5); })},
            {name: 'sin 0..2pi', apply: run(g => { g.setFunction('sin'); g.setBound('a', 0); g.setBound('b', 6.28); g.setCount(8); })},
            {name: 'exp reversed a > b', apply: run(g => { g.setFunction('exp'); g.setBound('a', 2); g.setBound('b', 0); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/derivative.json', demonstration: 'derivative', states: (() => {
        type DerivativeSetters = {setX0(value: number): void; setStep(value: number): void; setFunction(value: string): void; setTangentVisible(value: boolean): void};
        const run = (edit: (graph: DerivativeSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as DerivativeSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'h 0.5', apply: run(g => g.setStep(0.5))},
            {name: 'h 0.01', apply: run(g => g.setStep(0.01))},
            {name: 'h -0.5', apply: run(g => g.setStep(-0.5))},
            {name: 'tangent shown, x0 2', apply: run(g => { g.setTangentVisible(true); g.setX0(2); })},
            {name: 'sin x0 0.5', apply: run(g => { g.setFunction('sin'); g.setX0(0.5); g.setStep(0.1); })},
            {name: 'exp x0 -1', apply: run(g => { g.setFunction('exp'); g.setX0(-1); g.setStep(1); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/linear-function.json', demonstration: 'linear-function', states: (() => {
        type LinearSetters = {setPoint(index: 0 | 1, x: number, y: number): void; setLineParameter(change: {k?: number; n?: number}): void};
        const run = (edit: (graph: LinearSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as LinearSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'P1 moved', apply: run(g => g.setPoint(0, -1, 2))},
            {name: 'k -0.5', apply: run(g => g.setLineParameter({k: -0.5}))},
            {name: 'n -2', apply: run(g => g.setLineParameter({n: -2}))},
            {name: 'horizontal k 0', apply: run(g => g.setLineParameter({k: 0}))},
            {name: 'vertical', apply: run(g => { g.setPoint(0, 1, -1); g.setPoint(1, 1, 3); })},
            {name: 'coincident points', apply: run(g => { g.setPoint(0, 2, 2); g.setPoint(1, 2, 2); })},
            {name: 'fractional slope', apply: run(g => { g.setPoint(0, 0, 0); g.setPoint(1, 3, 1); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/trigonometric-functions.json', demonstration: 'trigonometric-functions', accepted: trigAccepted, states: (() => {
        type TrigSetters = {setFunction(value: string): void; setAmplitude(value: number): void; setOmega(value: number): void; setPhase(value: number): void; setMidline(value: number): void; setReferenceVisible(value: boolean): void};
        const run = (edit: (graph: TrigSetters) => void): ParityState['apply'] => graph => { runAs('learner', () => edit(graph as unknown as TrigSetters)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'amplitude 2', apply: run(g => g.setAmplitude(2))},
            {name: 'omega 2', apply: run(g => g.setOmega(2))},
            {name: 'phase pi/2', apply: run(g => g.setPhase(Math.PI / 2))},
            {name: 'midline 1', apply: run(g => g.setMidline(1))},
            {name: 'cos, reference shown', apply: run(g => { g.setFunction('cos'); g.setReferenceVisible(true); })},
            {name: 'tan', apply: run(g => { g.setFunction('tan'); g.setAmplitude(1); g.setOmega(0.5); g.setPhase(0); g.setMidline(0); })},
            {name: 'sin, A -1.5, omega 3, phi -pi/4, B -1', apply: run(g => { g.setFunction('sin'); g.setAmplitude(-1.5); g.setOmega(3); g.setPhase(-Math.PI / 4); g.setMidline(-1); })},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/continuity.json', demonstration: 'continuity', accepted: continuityAccepted, states: (() => {
        const run = (value: number): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as {setParameter(value: number): void}).setParameter(value)); };
        return [
            {name: 'default', apply: () => undefined},
            {name: 'a 0', apply: run(0)},
            {name: 'a 1', apply: run(1)},
            {name: 'a 1.5 (continuous)', apply: run(1.5)},
            {name: 'a 2.25', apply: run(2.25)},
            {name: 'a 3', apply: run(3)},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/bisection.json', demonstration: 'bisection', states: (() => {
        const next = (count: number): ParityState['apply'] => graph => {
            for (let i = 0; i < count; i++) (graph as unknown as {applyLessonAction(action: unknown): void}).applyLessonAction({kind: 'animation', animationId: 'bisection', command: 'next-step'});
        };
        return [
            state('default', {}),
            {name: 'step 1', apply: next(1)},
            {name: 'step 4', apply: next(3)},
            state('wider bracket, step 0', {'bisect-a': 0, 'bisect-b': 3}),
            state('cubic', {'bisection-example': 'cubic', 'bisect-a': -1.5, 'bisect-b': 2}),
            {name: 'cubic step 2', apply: next(2)},
            state('sign step', {'bisection-example': 'sign-step', 'bisect-a': -1, 'bisect-b': 1}),
            {name: 'sign step, step 3', apply: next(3)},
        ];
    })()},
    {file: 'functions/__parity__/root-finding.json', demonstration: 'root-finding', states: (() => {
        const act = (...actions: unknown[]): ParityState['apply'] => graph => {
            for (const action of actions) (graph as unknown as {applyLessonAction(action: unknown): void}).applyLessonAction(action);
        };
        const next = (count: number) => Array.from({length: count}, () => ({kind: 'animation', animationId: 'root-finding', command: 'next-step'}));
        const choice = (name: string, value: string) => ({kind: 'function-choice', name, value});
        const parameter = (name: string, value: number) => ({kind: 'function-parameter', name, value});
        return [
            {name: 'default', apply: act()},
            {name: 'newton step 1', apply: act(...next(1))},
            {name: 'newton step 4', apply: act(...next(3))},
            {name: 'three roots, x0 0.5, step 1', apply: act(choice('root-finding-example', 'cubic-three-roots'), parameter('root-x0', 0.5), ...next(1))},
            {name: 'two-cycle, x0 0, step 2', apply: act(choice('root-finding-example', 'cubic-two-cycle'), parameter('root-x0', 0), ...next(2))},
            {name: 'flat tangent', apply: act(choice('root-finding-example', 'square-minus-two'), parameter('root-x0', 0))},
            {name: 'secant default', apply: act(choice('root-finding-method', 'secant'))},
            {name: 'secant step 3', apply: act(parameter('root-x1', 2), ...next(3))},
            {name: 'secant three roots', apply: act(choice('root-finding-example', 'cubic-three-roots'), parameter('root-x0', 0.4), parameter('root-x1', 0.6), ...next(1))},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/euler-method.json', demonstration: 'euler-method', accepted: eulerAccepted, states: (() => {
        const act = (...actions: unknown[]): ParityState['apply'] => graph => {
            for (const action of actions) (graph as unknown as {applyLessonAction(action: unknown): void}).applyLessonAction(action);
        };
        const choice = (name: string, value: string) => ({kind: 'function-choice', name, value});
        const parameter = (name: string, value: number) => ({kind: 'function-parameter', name, value});
        const reveal = (count: number): ParityState['apply'] => graph => {
            for (let i = 0; i < count; i++) runAs('learner', () => (graph as unknown as {nextStep(): void}).nextStep());
        };
        // States accumulate on one graph, so each one sets every field it shows.
        const scene = (example: string, step: string, y0: number, end: number, exact = true) => act(
            {kind: 'function-visibility', target: 'euler-exact', visible: exact}, choice('euler-example', example), choice('euler-step', step),
            parameter('euler-x0', 0), parameter('euler-y0', y0), parameter('euler-end', end));
        return [
            {name: 'default', apply: scene('exponential', '0.5', 1, 1)},
            {name: 'h 0.25', apply: scene('exponential', '0.25', 1, 1)},
            {name: 'h 0.125, end 2', apply: scene('exponential', '0.125', 1, 2)},
            {name: 'y0 2, h 1', apply: scene('exponential', '1', 2, 2)},
            {name: 'relaxation', apply: scene('linear-relaxation', '0.25', 1, 2)},
            {name: 'blow-up stops early', apply: scene('blow-up', '0.0625', 1, 3)},
            {name: 'blow-up, no exact value', apply: scene('blow-up', '0.5', 1, 1.5)},
            {name: 'end at x0, exact hidden', apply: scene('exponential', '0.5', 1, 0, false)},
            {name: 'revealed 2 of 8', apply: graph => { scene('exponential', '0.125', 1, 1)(graph); reveal(2)(graph); }},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/fourier-series.json', demonstration: 'fourier-series', states: (() => {
        // Every state sets every field (the example first, as it keeps N, x and epsilon), so none depends on the one before it.
        const scene = (example: string, n: number, x: number, epsilon: number): ParityState['apply'] => graph => {
            const driven = graph as unknown as {applyLessonAction(action: unknown): void};
            driven.applyLessonAction({kind: 'function-choice', name: 'fourier-example', value: example});
            driven.applyLessonAction({kind: 'function-parameter', name: 'fourier-n', value: n});
            driven.applyLessonAction({kind: 'function-parameter', name: 'fourier-x', value: x});
            driven.applyLessonAction({kind: 'function-parameter', name: 'fourier-epsilon', value: epsilon});
        };
        return [
            {name: 'default', apply: scene('square', 11, 1.57, 0.25)},
            {name: 'N 1', apply: scene('square', 1, 1.57, 0.25)},
            {name: 'N 100 (even)', apply: scene('square', 100, 1.57, 0.25)},
            {name: 'at the jump x 0', apply: scene('square', 11, 0, 0.25)},
            {name: 'x 2.5, epsilon 0.1', apply: scene('square', 11, 2.5, 0.1)},
            {name: 'N 1001', apply: scene('square', 1001, 0.05, 1)},
            {name: 'sawtooth', apply: scene('sawtooth', 11, 1.57, 0.25)},
            {name: 'sawtooth N 40 x -2', apply: scene('sawtooth', 40, -2, 0.5)},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/fourier-coefficients.json', demonstration: 'fourier-coefficients', states: (() => {
        const choice = (name: string, value: unknown) => ({kind: 'function-choice', name, value});
        const parameter = (name: string, value: number) => ({kind: 'function-parameter', name, value});
        interface Scene {view: string; layout: string; handles: number[]; term: string; K: number; k: number; selections: string[]; n: number; scale: string}
        // States accumulate on one graph, so each one sets every field it shows (the harmonic goes to 0 first so K may drop below it).
        const scene = (s: Scene): ParityState['apply'] => graph => {
            const driven = graph as unknown as {applyLessonAction(action: unknown): void};
            const act = (action: unknown) => driven.applyLessonAction(action);
            act(choice('fourier-view', s.view));
            act(choice('fourier-layout', s.layout));
            s.handles.forEach((value, index) => act(parameter(`fourier-handle-${index}`, value)));
            act(choice('fourier-term', 'a'));
            act(parameter('fourier-harmonic', 0));
            act(parameter('fourier-order', s.K));
            act(parameter('fourier-harmonic', s.k));
            act(choice('fourier-term', s.term));
            // A slot may not repeat another slot's example: retry the refused ones after the others moved.
            let pending = s.selections.map((value, slot) => ({value, slot}));
            for (let pass = 0; pass < 3 && pending.length > 0; pass++) {
                pending = pending.filter(({value, slot}) => {
                    try { act(choice(`fourier-selection-${slot + 1}`, value)); return false; } catch { return true; }
                });
            }
            if (pending.length > 0) throw new Error('selections could not be set');
            act(parameter('fourier-n', s.n));
            act(choice('fourier-scale', s.scale));
        };
        const base: Scene = {view: 'projection', layout: 'abs', handles: [Math.PI, 0], term: 'a', K: 16, k: 1, selections: ['square', 'abs', 'smooth'], n: 11, scale: 'linear'};
        return [
            {name: 'default', apply: scene(base)},
            {name: 'sine coefficient k 3', apply: scene({...base, term: 'b', k: 3})},
            {name: 'constant term a0', apply: scene({...base, k: 0})},
            {name: 'jump layout, K 8, b1', apply: scene({...base, layout: 'jump', handles: [-1, -1, 1, 1], K: 8, term: 'b', k: 1})},
            {name: 'free layout, K 32', apply: scene({...base, layout: 'free', handles: [1, -2, 0.5, 3, -1], K: 32, k: 5})},
            {name: 'decay default', apply: scene({...base, view: 'decay'})},
            {name: 'decay N 3, other examples', apply: scene({...base, view: 'decay', n: 3, selections: ['sawtooth', 'jump', 'abs']})},
            {name: 'decay N 40 log', apply: scene({...base, view: 'decay', n: 40, scale: 'log'})},
        ] satisfies ParityState[];
    })()},
    {file: 'isometry/__parity__/isometries.json', demonstration: 'isometries', accepted: isometriesAccepted, states: (() => {
        type Iso = {setState(state: Record<string, unknown>): void};
        const at = (x: number, y: number) => ({x, y});
        const line = (px: number, py: number, qx: number, qy: number) => ({p: at(px, py), q: at(qx, qy)});
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Iso).setState(state)); };
        const classify = (id: 'rotation' | 'glide' | 'reflection') => ({mode: 'classify', ...CLASSIFY_EXAMPLES[id]});
        return [
            {name: 'default (two mirrors, a rotation)', apply: () => undefined},
            {name: 'parallel mirrors (a translation)', apply: run({mode: 'mirrors', mirrors: [line(0, 0, 0, 1), line(3, 0, 3, 1), line(0, 0, 1, 1)]})},
            {name: 'the same mirror twice (coincident)', apply: run({mode: 'mirrors', mirrors: [line(0, 0, 1, 0), line(0, 0, 1, 0), line(0, 0, 1, 1)]})},
            {name: 'classify, rotation example', apply: run(classify('rotation'))},
            {name: 'classify, glide example', apply: run(classify('glide'))},
            {name: 'classify, reflection example', apply: run(classify('reflection'))},
            {name: 'similarity, default', apply: run({mode: 'similarity'})},
            {name: 'similarity, k = 1 with a quarter turn (an isometry)', apply: run({mode: 'similarity', dilationK: 1, dilationTurn: 'r90', dilationCentre: at(0, 0)})},
            {name: 'similarity, k = -2, Pythagorean turn', apply: run({mode: 'similarity', dilationK: -2, dilationTurn: 'pythagorean', dilationCentre: at(2, -1)})},
            {name: 'rosette, default (C5)', apply: run({mode: 'rosette'})},
            {name: 'rosette, D6 with another point', apply: run({mode: 'rosette', rosetteN: 6, rosetteMirrors: true, rosettePoint: at(2, 3)})},
            {name: 'rosette, point on a mirror', apply: run({mode: 'rosette', rosetteN: 4, rosetteMirrors: true, rosettePoint: at(3, 0)})},
            {name: 'rosette, point at the centre', apply: run({mode: 'rosette', rosettePoint: at(0, 0)})},
            {name: 'frieze, default', apply: run({mode: 'frieze'})},
            {name: 'frieze, both mirrors, period 6', apply: run({mode: 'frieze', friezePeriod: 6, friezeFeatures: {vertical: true, horizontal: true, halfTurn: false, glide: false}})},
            {name: 'frieze, glide only', apply: run({mode: 'frieze', friezeFeatures: {vertical: false, horizontal: false, halfTurn: false, glide: true}})},
            {name: 'frieze, nothing chosen', apply: run({mode: 'frieze', friezeFeatures: {vertical: false, horizontal: false, halfTurn: false, glide: false}})},
        ] satisfies ParityState[];
    })()},
    {file: 'levelsets/__parity__/linear-program.json', demonstration: 'linear-program', states: (() => {
        type Row = {a: number; b: number; c: number};
        type Lp = {applyLevelSetsAction(action: unknown): void};
        const dflt: Row[] = [{a: 1, b: 2, c: 8}, {a: 3, b: 1, c: 9}];
        // every state sets rows, objective and sweep, so it does not inherit the previous one
        const lp = (constraints: Row[], objective: {p: number; q: number}, sweep: number): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Lp;
                g.applyLevelSetsAction({kind: 'levelsets', operation: 'set-constraints', constraints});
                g.applyLevelSetsAction({kind: 'levelsets', operation: 'set-objective', ...objective});
                g.applyLevelSetsAction({kind: 'levelsets', operation: 'set-sweep', sweep});
            });
        };
        return [
            {name: 'default', apply: lp(dflt, {p: 3, q: 2}, 9)},
            {name: 'sweep at 6', apply: lp(dflt, {p: 3, q: 2}, 6)},
            {name: 'sweep at the optimum', apply: lp(dflt, {p: 3, q: 2}, 12)},
            {name: 'objective parallel to a side (segment)', apply: lp(dflt, {p: 1, q: 2}, 8)},
            {name: 'degenerate vertex', apply: lp([{a: 1, b: 1, c: 4}, {a: 1, b: 3, c: 6}, {a: 1, b: 0, c: 3}], {p: 3, q: 2}, 11)},
            {name: 'unbounded (ray of improvement)', apply: lp([{a: 1, b: -1, c: 2}], {p: 1, q: 1}, 0)},
            {name: 'infeasible', apply: lp([{a: 1, b: 1, c: -1}], {p: 1, q: 1}, 0)},
            {name: 'flat objective', apply: lp(dflt, {p: 0, q: 0}, 0)},
            {name: 'fractional vertex', apply: lp([{a: 2, b: 3, c: 7}, {a: 3, b: 1, c: 8}], {p: 1, q: 1}, 3)},
            {name: 'ray of optima', apply: lp([{a: 1, b: -1, c: 2}], {p: 1, q: -1}, 2)},
            {name: 'five rows', apply: lp([...dflt, {a: 1, b: 0, c: 3}, {a: 0, b: 1, c: 3}, {a: 1, b: 1, c: 5}], {p: 2, q: 3}, 10)},
        ] satisfies ParityState[];
    })()},
    {file: 'levelsets/__parity__/contour-map.json', demonstration: 'contour-map', states: (() => {
        type Contour = {setState(state: Record<string, unknown>): void; setStepIndex(value: number): boolean};
        const fresh = {mode: 'level-sets', fn: 'bowl', level: 8, levelCount: 1, probe: [12, 16], numeric: false, start: [8, 4], step: 3, constraint: 'line', lineParam: 4, circleParam: 6};
        // every state starts from the default fields, so a state does not inherit the previous one
        const run = (state: Record<string, unknown>, stepIndex?: number): ParityState['apply'] => graph => {
            runAs('learner', () => {
                const g = graph as unknown as Contour;
                g.setState({...fresh, ...state});
                if (stepIndex !== undefined) g.setStepIndex(stepIndex);
            });
        };
        return [
            {name: 'default', apply: run({})},
            {name: 'saddle, three levels at 0, probe (1; 0,5)', apply: run({fn: 'saddle', level: 0, levelCount: 3, probe: [20, 10]})},
            {name: 'gradient on the hills with the estimate', apply: run({fn: 'hills', level: 5, probe: [20, 20], mode: 'gradient', numeric: true})},
            {name: 'gradient at a stationary point', apply: run({fn: 'hills', level: 5, probe: [0, 0], mode: 'gradient'})},
            {name: 'descent on the valley, H 11, step 3', apply: run({fn: 'valley', mode: 'descent', step: 11}, 3)},
            {name: 'descent on the bowl, step 0', apply: run({mode: 'descent', step: 9})},
            {name: 'lagrange on the line at x 1', apply: run({mode: 'lagrange', levelCount: 3, lineParam: 4})},
            {name: 'lagrange on the circle, product', apply: run({mode: 'lagrange', fn: 'product', level: 0, constraint: 'circle', circleParam: 18})},
        ] satisfies ParityState[];
    })()},
    {file: 'lines/__parity__/line-geometry.json', demonstration: 'line-geometry', states: (() => {
        type Lines = {setState(state: Record<string, unknown>): void};
        const at = (x: number, y: number) => ({x, y});
        const fresh = {target: 'lines', P: at(-2, 1), Q: at(4, 4), R: at(3, -2), S: at(2, 0), T: at(3, -2), O: at(1, 0), B: at(3, 1)};
        // every state starts from the default points, so a state does not inherit the previous one
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Lines).setState({...fresh, ...state})); };
        return [
            {name: 'forms, default', apply: run({mode: 'forms'})},
            {name: 'forms, vertical line', apply: run({mode: 'forms', P: at(3, -1), Q: at(3, 4)})},
            {name: 'forms, through the origin', apply: run({mode: 'forms', P: at(0, 0), Q: at(2, 3)})},
            {name: 'forms, parallel to an axis', apply: run({mode: 'forms', P: at(-2, 2), Q: at(3, 2)})},
            {name: 'forms, a point twice (coincident)', apply: run({mode: 'forms', P: at(1, 1), Q: at(1, 1)})},
            {name: 'normal, default', apply: run({mode: 'normal'})},
            {name: 'normal, parallel', apply: run({mode: 'normal', P: at(0, 0), Q: at(2, 1), R: at(0, 2), S: at(2, 3)})},
            {name: 'normal, perpendicular', apply: run({mode: 'normal', P: at(0, 0), Q: at(2, 1), R: at(1, 3), S: at(0, 5)})},
            {name: 'normal, the same line', apply: run({mode: 'normal', P: at(0, 0), Q: at(2, 1), R: at(4, 2), S: at(-2, -1)})},
            {name: 'angle, default', apply: run({mode: 'angle'})},
            {name: 'angle, perpendicular', apply: run({mode: 'angle', P: at(0, 0), Q: at(2, 1), R: at(1, 3), S: at(0, 5)})},
            {name: 'angle, parallel', apply: run({mode: 'angle', P: at(0, 0), Q: at(2, 1), R: at(0, 2), S: at(2, 3)})},
            {name: 'distance, default', apply: run({mode: 'distance'})},
            {name: 'distance, point on the line', apply: run({mode: 'distance', P: at(-2, 1), Q: at(4, 4), T: at(0, 2)})},
            {name: 'distance, far point', apply: run({mode: 'distance', T: at(-7, 6)})},
            {name: 'intersect lines, default', apply: run({mode: 'intersect', target: 'lines'})},
            {name: 'intersect lines, parallel', apply: run({mode: 'intersect', target: 'lines', P: at(0, 0), Q: at(2, 1), R: at(0, 2), S: at(2, 3)})},
            {name: 'intersect circle, tangent', apply: run({mode: 'intersect', target: 'circle'})},
            {name: 'intersect circle, two points', apply: run({mode: 'intersect', target: 'circle', O: at(0, 0), B: at(3, 1)})},
            {name: 'intersect circle, no points', apply: run({mode: 'intersect', target: 'circle', O: at(-6, -6), B: at(-5, -6)})},
        ] satisfies ParityState[];
    })()},
    {file: 'functions/__parity__/quadrature.json', demonstration: 'quadrature', accepted: quadratureAccepted, states: (() => {
        const act = (...actions: unknown[]): ParityState['apply'] => graph => {
            for (const action of actions) (graph as unknown as {applyLessonAction(action: unknown): void}).applyLessonAction(action);
        };
        const choice = (name: string, value: string) => ({kind: 'function-choice', name, value});
        const parameter = (name: string, value: number) => ({kind: 'function-parameter', name, value});
        // States accumulate on one graph, so each one sets every field it shows: the trapezoid rule first (any n), then the bounds
        // through b = 7 (so a < b holds at every step), n, and last the rule (Simpson needs an even n).
        const scene = (rule: string, fn: string, a: number, b: number, n: number) => act(
            choice('quadrature-rule', 'trapezoid'), choice('quadrature-function', fn), parameter('quadrature-b', 7), parameter('quadrature-a', a),
            parameter('quadrature-b', b), parameter('quadrature-n', n), choice('quadrature-rule', rule));
        return [
            {name: 'default', apply: scene('trapezoid', 'sin', 0, Math.PI, 2)},
            {name: 'trapezoid n 4', apply: scene('trapezoid', 'sin', 0, Math.PI, 4)},
            {name: 'trapezoid n 8', apply: scene('trapezoid', 'sin', 0, Math.PI, 8)},
            {name: 'simpson n 4', apply: scene('simpson', 'sin', 0, Math.PI, 4)},
            {name: 'simpson n 16', apply: scene('simpson', 'sin', 0, Math.PI, 16)},
            {name: 'simpson exact square', apply: scene('simpson', 'square', 0, 3, 2)},
            {name: 'trapezoid odd n, exp', apply: scene('trapezoid', 'exp', -1, 2, 7)},
            {name: 'rule switch raises n', apply: act(...[choice('quadrature-rule', 'trapezoid'), parameter('quadrature-n', 7), choice('quadrature-rule', 'simpson')])},
        ] satisfies ParityState[];
    })()},
    {file: 'dynamics/__parity__/phase-portrait.json', demonstration: 'phase-portrait', accepted: phaseAccepted, states: [
        state('default', {}),
        state('spiral entries', {'phase-a': 1, 'phase-b': -2, 'phase-c': 2, 'phase-d': 1}),
        state('centre entries', {'phase-a': 0, 'phase-b': 1, 'phase-c': -1, 'phase-d': 0}),
        state('saddle entries', {'phase-a': 2, 'phase-b': 0, 'phase-c': 0, 'phase-d': -1}),
        state('time 3', {'phase-time': 3}),
        state('zoom 2', {'phase-zoom': 2}),
        state('three seeds', {'phase-seed-count': 3}),
        state('pendulum', {'phase-system': 'pendulum'}),
        state('weak spiral', {'phase-system': 'weak-spiral'}),
    ]},
    {file: 'recursion/__parity__/recursion-growth.json', demonstration: 'recursion-growth', states: (() => {
        type Growth = {setState(state: Record<string, unknown>): void};
        const fresh = {panel: 'sequence', kind: 'arithmetic', a1: 3, d: 2, q: 20, n: 10, capital: 1000, rate: 10, years: 10, parts: 12, y0: 1000, logQ: 105, logModel: 'exponential'};
        // every state starts from the default state, so a state does not inherit the previous one
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Growth).setState({...fresh, ...state})); };
        return [
            {name: 'arithmetic, default', apply: run({})},
            {name: 'arithmetic, a1 -5, d 4, n 6', apply: run({a1: -5, d: 4, n: 6})},
            {name: 'geometric, q 2', apply: run({kind: 'geometric'})},
            {name: 'geometric, q 0,5 (limit)', apply: run({kind: 'geometric', q: 5, a1: 8, n: 12})},
            {name: 'geometric, q 3, n 30 (computed)', apply: run({kind: 'geometric', q: 30, n: 30})},
            {name: 'interest, default', apply: run({panel: 'interest'})},
            {name: 'interest, 5 % twice a year, 25 years', apply: run({panel: 'interest', capital: 2500, rate: 10, years: 25, parts: 2})},
            {name: 'interest, 365 parts, 3 years', apply: run({panel: 'interest', rate: 24, years: 3, parts: 365})},
            {name: 'log, exponential default', apply: run({panel: 'log'})},
            {name: 'log, exponential factor 2, 20 steps', apply: run({panel: 'log', logQ: 200, n: 20, y0: 50})},
            {name: 'log, power', apply: run({panel: 'log', logModel: 'power'})},
        ] satisfies ParityState[];
    })()},
    {file: 'trig/__parity__/triangle-solver.json', demonstration: 'triangle-solver', states: (() => {
        type Solver = {setState(state: Record<string, unknown>): void};
        const fresh = {mode: 'sides', A: {x: 0, y: 0}, B: {x: 7, y: 0}, C: {x: 2, y: 4}, data: {type: 'sss', a: 5, b: 6, c: 7}};
        // every state starts from the default state, so a state does not inherit the previous one
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Solver).setState({...fresh, ...state})); };
        return [
            {name: 'sides, default', apply: run({})},
            {name: 'sides, right angle at A', apply: run({B: {x: 3, y: 0}, C: {x: 0, y: 4}})},
            {name: 'sides, obtuse', apply: run({C: {x: 2, y: 1}})},
            {name: 'sides, flat', apply: run({C: {x: 5, y: 0}})},
            {name: 'circle, default', apply: run({mode: 'circle'})},
            {name: 'circle, right angle at A', apply: run({mode: 'circle', B: {x: 3, y: 0}, C: {x: 0, y: 4}})},
            {name: 'circle, flat', apply: run({mode: 'circle', C: {x: 5, y: 0}})},
            {name: 'solve, SSS default', apply: run({mode: 'solve'})},
            {name: 'solve, SSS no triangle', apply: run({mode: 'solve', data: {type: 'sss', a: 2, b: 3, c: 6}})},
            {name: 'solve, SAS', apply: run({mode: 'solve', data: {type: 'sas', b: 5, c: 7, angleA: 60}})},
            {name: 'solve, ASA', apply: run({mode: 'solve', data: {type: 'asa', angleA: 40, angleB: 60, c: 8}})},
            {name: 'solve, ASA angle sum', apply: run({mode: 'solve', data: {type: 'asa', angleA: 40, angleB: 150, c: 8}})},
            {name: 'solve, SSA two triangles', apply: run({mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}})},
            {name: 'solve, SSA one triangle', apply: run({mode: 'solve', data: {type: 'ssa', a: 8, b: 8, angleA: 30}})},
            {name: 'solve, SSA tangent', apply: run({mode: 'solve', data: {type: 'ssa', a: 4, b: 8, angleA: 30}})},
            {name: 'solve, SSA below height', apply: run({mode: 'solve', data: {type: 'ssa', a: 3, b: 8, angleA: 30}})},
        ] satisfies ParityState[];
    })()},
    {file: 'trig/__parity__/unit-circle.json', demonstration: 'unit-circle', states: (() => {
        type Circle = {setState(state: Record<string, unknown>): void};
        const fresh = {angle: 120, secondAngle: 0, showSymmetries: false, showCosine: false, showAddition: false};
        // every state starts from the default state (60 degrees, switches off), so a state does not inherit the previous one
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Circle).setState({...fresh, ...state})); };
        return [
            {name: 'default, 60 degrees', apply: run({})},
            {name: '0 degrees', apply: run({angle: 0})},
            {name: '90 degrees, cosine', apply: run({angle: 180, showCosine: true})},
            {name: '135 degrees, second quadrant', apply: run({angle: 270})},
            {name: '225 degrees, third quadrant', apply: run({angle: 450})},
            {name: '37,5 degrees, not special', apply: run({angle: 75})},
            {name: '300 degrees, symmetries', apply: run({angle: 600, showSymmetries: true})},
            {name: '60 and 45 degrees, addition', apply: run({angle: 120, secondAngle: 90, showAddition: true})},
            {name: 'all overlays', apply: run({angle: 210, secondAngle: 330, showAddition: true, showSymmetries: true, showCosine: true})},
        ] satisfies ParityState[];
    })()},
    {file: 'dynamics/__parity__/logistic-map.json', demonstration: 'logistic-map', states: (() => {
        type Logistic = {setState(state: Record<string, unknown>): void};
        const fresh = {R: 290, X: 20, step: 0};
        // every state starts from the default state (r = 2,9, x0 = 0,2, no steps), so a state does not inherit the previous one
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Logistic).setState({...fresh, ...state})); };
        return [
            {name: 'default, r = 2,9', apply: run({})},
            {name: 'r = 2,5, ten steps', apply: run({R: 250, step: 10})},
            {name: 'r = 3, neutral', apply: run({R: 300, X: 50, step: 5})},
            {name: 'r = 3,2, 2-cycle', apply: run({R: 320, X: 33, step: 30})},
            {name: 'r = 3,5, beyond the 2-cycle', apply: run({R: 350, X: 75, step: 60})},
            {name: 'r = 3,8, chaos', apply: run({R: 380, X: 10, step: 25})},
            {name: 'r = 4, last step', apply: run({R: 400, X: 99, step: 60})},
        ] satisfies ParityState[];
    })()},
    {file: 'complex/__parity__/complex-euler.json', demonstration: 'complex-euler', states: (() => {
        type Euler = {setState(state: Record<string, unknown>): void};
        const fresh = {degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45};
        // every state starts from the default state, so a state does not inherit the previous one
        const run = (state: Record<string, unknown>): ParityState['apply'] => graph => { runAs('learner', () => (graph as unknown as Euler).setState({...fresh, ...state})); };
        return [
            {name: 'default, 30 degrees', apply: run({})},
            {name: '45 degrees, omega 1, velocity off', apply: run({degrees: 45, omega: 1, velocity: false})},
            {name: '100 degrees, computed, omega 3, N 9', apply: run({degrees: 100, omega: 3, degree: 9})},
            {name: 'velocity and acceleration, 90 degrees', apply: run({degrees: 90, acceleration: true})},
            {name: 'partial sum out of view, 180 degrees, N 1', apply: run({degrees: 180, degree: 1, velocity: false})},
            {name: 'product, 30 and 45 degrees', apply: run({mode: 'product'})},
            {name: 'product reduced, 250 and 200 degrees, acceleration', apply: run({mode: 'product', degrees: 250, b: 200, acceleration: true, omega: 4})},
            {name: 'full turn, N 30', apply: run({degrees: 360, degree: 30, omega: 1})},
        ] satisfies ParityState[];
    })()},
    {file: 'complex/__parity__/complex-reciprocal.json', demonstration: 'complex-reciprocal', states: (() => {
        type Recip = {setExample(id: string): void; setOperand(which: 'z' | 'w', re: number, im: number): void; setCentre(re: number, im: number): void;
            setRadius(value: number): void; setReciprocalVisible(v: boolean): void; setQuotientVisible(v: boolean): void; setCircleVisible(v: boolean): void};
        // every state starts from an example (which hides every reveal), so a state does not inherit the previous one
        const run = (example: string, change: (g: Recip) => void = () => undefined): ParityState['apply'] =>
            graph => { runAs('learner', () => { const g = graph as unknown as Recip; g.setExample(example); change(g); }); };
        return [
            {name: 'default, reciprocal hidden', apply: run('outside')},
            {name: 'reciprocal shown, outside', apply: run('outside', g => g.setReciprocalVisible(true))},
            {name: 'inside the circle', apply: run('inside', g => g.setReciprocalVisible(true))},
            {name: 'on the circle', apply: run('unit-circle', g => g.setReciprocalVisible(true))},
            {name: 'division', apply: run('division', g => { g.setReciprocalVisible(true); g.setQuotientVisible(true); })},
            {name: 'inversion circle, moved', apply: run('outside', g => { g.setCircleVisible(true); g.setCentre(0.5, 0); g.setRadius(1); g.setOperand('z', 1.5, 1); })},
            {name: 'z at the origin, everything shown', apply: run('zero', g => { g.setReciprocalVisible(true); g.setQuotientVisible(true); g.setCircleVisible(true); })},
            {name: 'z at the centre of the circle', apply: run('outside', g => { g.setCircleVisible(true); g.setCentre(1, 1); g.setRadius(0.5); })},
        ] satisfies ParityState[];
    })()},
    {file: 'complex/__parity__/complex-roots.json', demonstration: 'complex-roots', states: (() => {
        type Roots = {setExample(id: string): void; setW(re: number, im: number): void; setTest(re: number, im: number): void; setDegree(n: number): void;
            setRootsVisible(v: boolean): void; setPolygonVisible(v: boolean): void; setTestVisible(v: boolean): void};
        // every state starts from an example (which hides every reveal), so a state does not inherit the previous one
        const run = (example: string, change: (g: Roots) => void = () => undefined): ParityState['apply'] =>
            graph => { runAs('learner', () => { const g = graph as unknown as Roots; g.setExample(example); change(g); }); };
        return [
            {name: 'default, roots hidden', apply: run('two-i')},
            {name: 'roots shown', apply: run('two-i', g => g.setRootsVisible(true))},
            {name: 'polygon shown', apply: run('two-i', g => { g.setRootsVisible(true); g.setPolygonVisible(true); })},
            {name: 'test point on a root', apply: run('two-i', g => { g.setRootsVisible(true); g.setTestVisible(true); g.setTest(1.1, 0.65); })},
            {name: 'test point off the roots', apply: run('one-plus-i', g => { g.setTestVisible(true); g.setTest(1, 0.5); })},
            {name: 'w on the negative axis, n 3', apply: run('negative-real', g => { g.setDegree(3); g.setRootsVisible(true); g.setPolygonVisible(true); })},
            {name: 'roots of unity, n 6', apply: run('unity', g => { g.setDegree(6); g.setRootsVisible(true); g.setPolygonVisible(true); })},
            {name: 'w at the origin', apply: run('zero', g => { g.setRootsVisible(true); g.setPolygonVisible(true); g.setTestVisible(true); })},
        ] satisfies ParityState[];
    })()},
];

const root =path.resolve(__dirname, '../..');
const record = async (sample: Sample) => recordParityWithDeclarations(path.basename(sample.file, '.json'), createGraph(sample.demonstration), sample.states);
const text = (recording: ParityRecording) => `${JSON.stringify(recording, null, 2)}\n`;

// Named by the recording's id (not `$file`, which vitest truncates) so `just graph-check <id>` can filter to it.
// BEZEG_PARITY_ID=<demonstration id> limits recording and checking to that sample, so a lane never rewrites others' files.
describe.each(SAMPLES.map(sample => [path.basename(sample.file, '.json'), sample] as const).filter(([id]) => !process.env.BEZEG_PARITY_ID || id === process.env.BEZEG_PARITY_ID))('parity recording %s', (_id, sample) => {
    test('records deterministically and every state changes a shown value', async () => {
        const first = (await record(sample)).recording;
        const second = (await record(sample)).recording;
        expect(text(second)).toBe(text(first));
        const shown = (s: ParityRecording['states'][number]) => JSON.stringify([s.rows, s.notes, s.outputs, s.captions]);
        first.states.slice(1).forEach((s, i) => expect(shown(s), `state ${i + 1} (${s.name}) shows what ${first.states[i].name} showed`).not.toBe(shown(first.states[i])));
        if (process.env.BEZEG_PARITY_RECORD) {
            const target = path.join(root, sample.file);
            fs.mkdirSync(path.dirname(target), {recursive: true});
            fs.writeFileSync(target, text(first));
        }
    });

    test.skipIf(!process.env.BEZEG_PARITY_CHECK && !process.env.BEZEG_PARITY_REPORT)('the graph declaration reproduces the recording (BEZEG_PARITY_CHECK=1; graphs without a declaration are skipped)', async () => {
        const {declarations} = await record(sample);
        if (declarations.every(declaration => declaration === undefined)) return;
        const target = path.join(root, sample.file);
        if (!fs.existsSync(target)) return;
        const raw = checkParity(JSON.parse(fs.readFileSync(target, 'utf8')), declarations, sample.accepted);
        const moved = sample.movedNotes;
        const report = moved ? {...raw, differences: raw.differences.filter(d => !(d.kind === 'missing' && d.where === 'note' && moved.pattern.test(d.recorded ?? '')))} : raw;
        if (process.env.BEZEG_PARITY_REPORT) fs.writeFileSync(path.join(root, `${sample.file}.report.txt`), `${describeDifferences(report)}\ncaptions not covered: ${report.uncoveredCaptions.length}\n`);
        expect(describeDifferences(report)).toBe('');
    });
});

describe('checker on a fake declaration', () => {
    const recording: ParityRecording = {graph: 'fake', language: 'sl', states: [
        {name: 'one', rows: [{key: 'Napaka#0', label: 'Napaka', value: '0,7183'}, {key: 'Točka#0', label: 'Točka', value: '(2; 4)'}],
            notes: ['Ocena je skrita.'], outputs: [], captions: []},
    ]};
    const declared = (overrides: Partial<{error: number; withPoint: boolean; extra: boolean}> = {}): GraphDeclaration => ({
        readouts: [{id: 'g', rows: [
            {id: 'error', name: message('taylor_readout_signed_error'), value: messageNumber(overrides.error ?? 0.7183, 4)},
            ...(overrides.withPoint === false ? [] : [{id: 'point', name: message('taylor_readout_polynomial'), value: message('taylor_hidden')}]),
            ...(overrides.extra ? [{id: 'more', name: message('taylor_readout_bound'), value: messageNumber(1)}] : []),
        ]}],
        notes: [{id: 'n', text: message('taylor_hidden')}],
    });

    test('a matching declaration has no differences, whitespace and minus aside', () => {
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [{key: 'x#0', label: 'x', value: '-0,5'}], notes: ['skrito'], outputs: [], captions: []}]};
        const declaration: GraphDeclaration = {readouts: [{id: 'g', rows: [{id: 'a', name: message('taylor_readout_signed_error'), symbol: 'x', value: messageNumber(-0.5, 4)}]}], notes: [{id: 'n', text: message('taylor_hidden')}]};
        expect(checkParity(rec, [declaration]).differences).toEqual([]);
        expect(normalise('−0,5  s')).toBe('-0,5 s');
    });

    test('seeded failures: a changed value, a missing row, an extra row, a missing state', () => {
        const changed = checkParity(recording, [declared({error: 0.7184})]);
        const missing = checkParity(recording, [declared({withPoint: false})]);
        const extra = checkParity(recording, [declared({extra: true})]);
        const none = checkParity(recording, []);
        // Observed (see the report): rows are matched by label, so labels that differ from the recording show as missing + extra.
        expect(changed.differences.length).toBeGreaterThan(0);
        expect(missing.differences.some(d => d.kind === 'missing')).toBe(true);
        expect(extra.differences.some(d => d.kind === 'extra')).toBe(true);
        expect(none.differences).toEqual([{state: 0, stateName: 'one', kind: 'missing', where: 'declaration', recorded: 'one'}]);
    });

    test('a changed value is reported as different with both values', () => {
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [{key: 'Napaka f(x) - Tₙ(x)#0', label: 'Napaka f(x) - Tₙ(x)', value: '0,7183'}], notes: [], outputs: [], captions: []}]};
        const declaration = (value: number): GraphDeclaration => ({readouts: [{id: 'g', rows: [{id: 'error', name: message('taylor_readout_signed_error'), value: messageNumber(value, 4)}]}]});
        expect(checkParity(rec, [declaration(0.7183)]).differences).toEqual([]);
        const different = checkParity(rec, [declaration(0.7184)]).differences;
        expect(different).toEqual([{state: 0, stateName: 's', kind: 'different', where: 'row Napaka f(x) - Tₙ(x)#0', recorded: '0,7183', declared: '0,7184'}]);
    });

    test('a declared name and symbol match the recorded label "name symbol" (TeX subscripts as the panel writes them)', () => {
        expect(['c', 'x_0', 'T_n(x)', 'f(x)'].map(plainSymbol)).toEqual(['c', 'x₀', 'Tₙ(x)', 'f(x)']);
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [{key: 'Polinom Tₙ(x)#0', label: 'Polinom Tₙ(x)', value: '2'}], notes: [], outputs: [], captions: []}]};
        const declaration = (value: number): GraphDeclaration => ({readouts: [{id: 'g', rows: [{id: 'polynomial', name: message('taylor_polynomial_name'), symbol: 'T_n(x)', value: messageNumber(value, 4)}]}]});
        expect(checkParity(rec, [declaration(2)]).differences).toEqual([]);
        expect(checkParity(rec, [declaration(3)]).differences).toEqual([{state: 0, stateName: 's', kind: 'different', where: 'row Polinom Tₙ(x)#0', recorded: '2', declared: '3'}]);
    });

    test('accepted differences tolerate exactly their kind and place, and nothing else', () => {
        const row = (key: 'taylor_readout_signed_error' | 'taylor_readout_bound') => ({key: `${normalise(renderMessage(message(key)))}#0`, label: normalise(renderMessage(message(key))), value: '1'});
        const [first, second] = [row('taylor_readout_signed_error'), row('taylor_readout_bound')];
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [first, second], notes: [], outputs: [], captions: []}]};
        const declaration: GraphDeclaration = {readouts: [{id: 'g', rows: [
            {id: 'error', name: message('taylor_readout_signed_error'), value: messageNumber(2, 4)}, {id: 'other', name: message('taylor_readout_bound'), value: messageNumber(2, 4)}]}]};
        const accepted = [{kind: 'different', where: `row ${first.key}`, reason: 'test'}] as const;
        expect(checkParity(rec, [declaration], accepted).differences.map(d => d.where)).toEqual([`row ${second.key}`]);
    });

    test("a control's read-off is covered by the declared parameter with that symbol, and missing without it", () => {
        const rec: ParityRecording = {graph: 'fake', language: 'sl', states: [{name: 's', rows: [], notes: [], outputs: ['t = 0,50'], captions: []}]};
        const withT: GraphDeclaration = {parameters: [{key: 't', kind: 'range', label: message('animation_parameter'), symbol: 't', placement: 'board', min: 0, max: 1, step: 0.01}]};
        const withS: GraphDeclaration = {parameters: [{key: 's', kind: 'range', label: message('animation_parameter'), symbol: 's', placement: 'board', min: 0, max: 1, step: 0.01}]};
        expect(checkParity(rec, [withT]).differences).toEqual([]);
        expect(checkParity(rec, [withS]).differences).toEqual([{state: 0, stateName: 's', kind: 'missing', where: 'output', recorded: 't = 0,50'}]);
    });
});
