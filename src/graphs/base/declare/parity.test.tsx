/**
 * Parity recordings (task 02, slice 4): the sampled states of the graphs whose inspector panels tasks 04 to 08 remove, the
 * checker's seeded failures, and the declaration-against-recording report of every graph that already declares.
 * `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx` rewrites the `__parity__` files.
 */
import fs from 'fs';
import path from 'path';
import type {DemonstrationId} from '../../../demonstrations';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../realGraphTestHarness';
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
}

const continuityAccepted: readonly AcceptedDifference[] = [
    {kind: 'extra', where: 'row a', reason: 'the parameter is a board puck now, so its slider output "a = 1,5" is a readout row; the panel showed the value only on the slider'},
];
const SHORT_VALUE = 'the declaration shows a short value; the panel keeps the sentence, which the declaration carries as its readout help';
const phaseAccepted: readonly AcceptedDifference[] = [
    ...['Izračunano območje#0', 'Začetna točka 1#0', 'Začetna točka 2#0', 'Začetna točka 3#0', 'Energija začetne točke 1#0', 'Energija začetne točke 2#0',
        'Energija začetne točke 3#0', 'Obroč trajektorij (izračunan)#0', 'Linearizacija na obroču (izračunana)#0', 'Kaj določa linearizacija#0']
        .map(key => ({kind: 'different', where: `row ${key}`, reason: SHORT_VALUE}) as const),
    {kind: 'extra', where: 'note', reason: 'the readout help that carries the sentences the short values leave out'},
];

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
];

const root = path.resolve(__dirname, '../..');
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
        const report = checkParity(JSON.parse(fs.readFileSync(target, 'utf8')), declarations, sample.accepted);
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
