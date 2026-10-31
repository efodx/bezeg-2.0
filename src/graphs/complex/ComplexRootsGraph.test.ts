import {ComplexRootsGraph} from './ComplexRootsGraph';
import {complexRootsPresetCollection} from './complexRootsPresets';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {DEFAULT_COMPLEX_ROOTS_MODEL} from '../../analysis/complexRootsModel';
import {onLanguageChange, renderMessage, setLanguage} from '../../localization';

const BOX = [-3.4, 3.4, 3.4, -3.4];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        unitX: 50,
        canvasWidth: 700,
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
            if (type === 'point') {
                const free = parents.every((parent: unknown) => typeof parent === 'number');
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = vi.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => board.box),
        box: BOX,
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new ComplexRootsGraph() as any;
    graph.board = fakeBoard();
    const session: any = {
        isReady: true, isAlive: true, dispose: vi.fn(() => { session.isAlive = false; }), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.graphSession = session;
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: string, value: number): LessonAction => ({kind: 'function-parameter', name, value} as LessonAction);
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const visible = (object: any) => resolve(object.attributes.visible);

// Creation order per type (see createScene): curves are the circle of the roots, the eight edge slots and the arrow of w; points are the eight
// root markers, then the test point z and w; texts are the axis names and the caption.
const CIRCLE = 0;
const EDGE = (k: number) => 1 + k;
const ARROW_W = 9;
const ROOT = (k: number) => k;
const [Z_POINT, W_POINT] = [8, 9];
const OBJECT_COUNT = 23;
const curves = (graph: any) => ofType(graph, 'curve');
const points = (graph: any) => ofType(graph, 'point');
const caption = (graph: any) => graph.captionPlainLines();
const at = (point: any) => [point.X(), point.Y()];
const shown = (object: any) => visible(object);
const shownRoots = (graph: any) => [0, 1, 2, 3, 4, 5, 6, 7].filter(k => shown(points(graph)[ROOT(k)]));
const shownEdges = (graph: any) => [0, 1, 2, 3, 4, 5, 6, 7].filter(k => shown(curves(graph)[EDGE(k)]));
const edgeEnds = (curve: any) => [[curve.parents[0](0), curve.parents[1](0)], [curve.parents[0](1), curve.parents[1](1)]];

function collect(node: any, found: Record<string, any[]> = {}) {
    if (!node || typeof node !== 'object') return found;
    if (Array.isArray(node)) { node.forEach(child => collect(child, found)); return found; }
    const name = typeof node.type === 'string' ? node.type : node.type?.name;
    if (name) (found[name] ??= []).push(node);
    collect(node.props?.children, found);
    return found;
}
const controls = (graph: any) => {
    const found = collect([graph.renderControls(), graph.renderReveals()]);
    const [wRe, wIm, degree, zRe, zIm] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {
        found, select: found.ChoiceSelect[0], wRe, wIm, degree, zRe, zIm,
        showRoots: button('toggle-complex-roots'), showPolygon: button('toggle-complex-polygon'), showTest: button('toggle-complex-test'),
    };
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);
const set = (graph: any, patch: object) => graph.commitModel({...graph.model, ...patch});
const everyText = (graph: any) => JSON.stringify([
    caption(graph), rows(graph), graph.statuses(graph.model, graph.viewOf(graph.model)),
    points(graph).map((point: any) => at(point)), curves(graph).map((curve: any) => [curve.parents[0](0.7), curve.parents[1](0.7)]),
]);
const ALL = {rootsVisible: true, polygonVisible: true, testVisible: true};

beforeEach(() => setLanguage('sl'));

function rejectionOf(entry: unknown) {
    const result = complexRootsPresetCollection.check(entry);
    if (!('rejection' in result)) throw new Error('expected a rejection');
    return result.rejection;
}

test('initialization draws w = 2i with the roots, the n-gon and the test point hidden, from a fixed pool of owned objects', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual(DEFAULT_COMPLEX_ROOTS_MODEL);
    expect(graph.presets()).toBe('complex-roots');
    expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
    expect(at(points(graph)[W_POINT])).toEqual([0, 2]);
    expect(shown(points(graph)[W_POINT])).toBe(true);
    expect(shown(points(graph)[Z_POINT])).toBe(false);
    expect(shownRoots(graph)).toEqual([]);
    expect(shownEdges(graph)).toEqual([]);
    expect(shown(curves(graph)[CIRCLE])).toBe(false);
    expect(shown(curves(graph)[ARROW_W])).toBe(true);
    expect(caption(graph)).toEqual(['w = 2i, n = 3', 'koreni: skriti', 'kvadrat: w; krog: koren z_k; romb: preizkusna točka z']);
    expect(rows(graph)).toMatchObject({w: '2i', 'w-modulus': '2', roots: 'skrito', radius: 'skrito', test: 'skrito', 'test-power': 'skrito', 'test-gap': 'skrito', degree: '3'});
    expect(statusIds(graph)).toEqual(['predict']);
});

test('the roots of w = 2i, n = 3 sit at 30, 150 and 270 degrees on the circle of radius 2^(1/3) and appear only after Show roots', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {rootsVisible: true});
    expect(shownRoots(graph)).toEqual([0, 1, 2]);
    const radius = Math.cbrt(2);
    [30, 150, 270].forEach((degrees, k) => {
        const [x, y] = at(points(graph)[ROOT(k)]);
        expect(x).toBeCloseTo(radius * Math.cos((degrees * Math.PI) / 180), 12);
        expect(y).toBeCloseTo(radius * Math.sin((degrees * Math.PI) / 180), 12);
    });
    expect(rows(graph)).toMatchObject({
        'root-0': '1,0911 + 0,63i; |z| = 1,2599, arg z = π/6 ≈ 0,524',
        'root-1': '−1,0911 + 0,63i; |z| = 1,2599, arg z = 5π/6 ≈ 2,618',
        'root-2': '−1,2599i; |z| = 1,2599, arg z = −π/2 ≈ −1,571',
    });
    expect(rows(graph)['root-3']).toBeUndefined();
    expect(rows(graph).radius).toBe('skrito');
    expect(caption(graph).slice(1, 4)).toEqual(['z₀ = 1,0911 + 0,63i', 'z₁ = −1,0911 + 0,63i', 'z₂ = −1,2599i']);
    expect(statusIds(graph)).toEqual([]);
    // the board marker names carry the indices
    expect(points(graph)[ROOT(2)].attributes.name).toBe('$$z_{2}$$');
});

test('the n-gon is regular with edge 2 r sin(pi/n) and n edges for every degree, and appears only after Show n-gon', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {rootsVisible: true});
    expect(shownEdges(graph)).toEqual([]);
    for (let n = 2; n <= 8; n++) {
        set(graph, {degree: n, polygonVisible: true, wRe: 1, wIm: 1.5});
        const radius = Math.hypot(1, 1.5) ** (1 / n);
        expect(shownRoots(graph), `n=${n}`).toEqual([...Array(n).keys()]);
        expect(shownEdges(graph), `n=${n}`).toEqual([...Array(n).keys()]);
        expect(shown(curves(graph)[CIRCLE])).toBe(true);
        for (let k = 0; k < n; k++) {
            const [from, to] = edgeEnds(curves(graph)[EDGE(k)]);
            expect(Math.hypot(to[0] - from[0], to[1] - from[1]), `n=${n} edge ${k}`).toBeCloseTo(2 * radius * Math.sin(Math.PI / n), 12);
            const [fromRoot, toRoot] = [at(points(graph)[ROOT(k)]), at(points(graph)[ROOT((k + 1) % n)])];
            expect(from).toEqual(fromRoot);
            expect(to[0]).toBeCloseTo(toRoot[0], 12);
            expect(to[1]).toBeCloseTo(toRoot[1], 12);
            expect(Math.hypot(from[0], from[1])).toBeCloseTo(radius, 12);
        }
        expect(curves(graph)[CIRCLE].parents[0](0)).toBeCloseTo(radius, 12);
    }
    // lowering n hides the pool slots above it again: no stale markers or edges
    set(graph, {degree: 3, polygonVisible: true});
    expect(shownRoots(graph)).toEqual([0, 1, 2]);
    expect(shownEdges(graph)).toEqual([0, 1, 2]);
    set(graph, {polygonVisible: false});
    expect(shownEdges(graph)).toEqual([]);
    expect(rows(graph).radius).toBe('skrito');
});

test('each root raised to the n-th power gives w, and the roots sum to 0, for every degree and a set of grid w', () => {
    const graph = makeGraph({asyncState: false});
    for (const [re, im] of [[0, 2], [1, 1], [-1, 0], [2, -2], [-0.05, 0.05], [0.7, -1.35], [-2, 0.05]]) {
        for (let n = 2; n <= 8; n++) {
            set(graph, {degree: n, wRe: re, wIm: im, rootsVisible: true});
            let sumRe = 0;
            let sumIm = 0;
            for (let k = 0; k < n; k++) {
                const [x, y] = at(points(graph)[ROOT(k)]);
                let power = [1, 0];
                for (let j = 0; j < n; j++) power = [power[0] * x - power[1] * y, power[0] * y + power[1] * x];
                expect(Math.hypot(power[0] - re, power[1] - im), `w=${re},${im} n=${n} k=${k}`).toBeLessThan(1e-12 * Math.max(1, Math.hypot(re, im)));
                sumRe += x;
                sumIm += y;
            }
            expect(Math.hypot(sumRe, sumIm)).toBeLessThan(1e-12);
        }
    }
});

test('w = 0 has the single root 0 with its multiplicity stated and no polygon, and no text or coordinate shows NaN or Infinity', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {example: 'zero', wRe: 0, wIm: 0, degree: 5, ...ALL});
    expect(shownRoots(graph)).toEqual([0]);
    expect(at(points(graph)[ROOT(0)])).toEqual([0, 0]);
    expect(shownEdges(graph)).toEqual([]);
    expect(shown(curves(graph)[CIRCLE])).toBe(false);
    expect(shown(curves(graph)[ARROW_W])).toBe(false);
    expect(rows(graph)['root-0']).toBe('0, večkratnost 5');
    expect(rows(graph)['root-1']).toBeUndefined();
    expect(rows(graph)['w-argument']).toBe('ni definiran');
    expect(caption(graph)).toContain('w = 0: edini koren z₀ = 0, večkratnost 5');
    expect(statusIds(graph)).toEqual(['zero', 'test-fails']);
    set(graph, {zRe: 0, zIm: 0});
    expect(statusIds(graph)).toEqual(['zero', 'test-solves']);
    // everything on a grid of corners and the origin, for every degree and with every reveal, is finite text
    for (const re of [-2, -0.05, 0, 0.05, 2]) {
        for (const im of [-2, 0, 2]) {
            for (let n = 2; n <= 8; n++) {
                set(graph, {wRe: re, wIm: im, degree: n, zRe: 2, zIm: -2, ...ALL});
                expect(everyText(graph), `${re},${im} n=${n}`).not.toMatch(/NaN|Infinity|undefined/);
            }
        }
    }
});

test('the labelling follows Arg w in (-pi, pi]: exactly on the negative real axis it is pi, across the axis the labels jump and the set of roots stays', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {example: 'negative-real', wRe: -1, wIm: 0, degree: 2, rootsVisible: true});
    expect(rows(graph)['w-argument']).toBe('π ≈ 3,142');
    expect(rows(graph)['root-0']).toMatch(/^i; \|z\| = 1, arg z = π\/2/);
    expect(rows(graph)['root-1']).toMatch(/^−i; \|z\| = 1, arg z = −π\/2/);
    expect(statusIds(graph)).toEqual(['on-cut']);
    const rootsAt = (wIm: number) => {
        set(graph, {wIm});
        return [at(points(graph)[ROOT(0)]), at(points(graph)[ROOT(1)])];
    };
    const above = rootsAt(0.05);
    const below = rootsAt(-0.05);
    expect(statusIds(graph)).toEqual([]);
    // root 0 jumps from the upper to the lower half plane; as sets the roots are close to {i, -i}
    expect(above[0][1]).toBeGreaterThan(0.9);
    expect(below[0][1]).toBeLessThan(-0.9);
    expect(above[1][1]).toBeLessThan(-0.9);
    expect(below[1][1]).toBeGreaterThan(0.9);
    expect(Math.hypot(above[0][0] - below[1][0], above[0][1] - below[1][1])).toBeLessThan(0.1);
    // the same for n = 3 with the arguments of the spec: 60, 180, -60 degrees just above the axis
    set(graph, {degree: 3, wRe: -2, wIm: 0.05});
    const degrees = (k: number) => (Math.atan2(at(points(graph)[ROOT(k)])[1], at(points(graph)[ROOT(k)])[0]) * 180) / Math.PI;
    expect(degrees(0)).toBeCloseTo(60 - 0.0, 0);
    expect(degrees(1)).toBeCloseTo(180, 0);
    expect(degrees(2)).toBeCloseTo(-60, 0);
});

test('the test point z is hidden until shown and its z^n is compared with w: a root solves the equation, others do not', () => {
    const graph = makeGraph({asyncState: false});
    expect(shown(points(graph)[Z_POINT])).toBe(false);
    set(graph, {testVisible: true, rootsVisible: true});
    expect(shown(points(graph)[Z_POINT])).toBe(true);
    expect(at(points(graph)[Z_POINT])).toEqual([1, 0.5]);
    // (1 + 0.5i)^3 = 0.25 + 1.375i, at distance hypot(0.25, 0.625) from 2i
    expect(rows(graph)).toMatchObject({test: '1 + 0,5i', 'test-power': '0,25 + 1,375i', 'test-gap': '0,6731'});
    expect(statusIds(graph)).toEqual(['test-fails']);
    expect(caption(graph)).toContain('z = 1 + 0,5i, z^n = 0,25 + 1,375i');
    set(graph, {example: 'unity', wRe: 1, wIm: 0, degree: 4, zRe: 0, zIm: 1});
    expect(rows(graph)).toMatchObject({'test-power': '1', 'test-gap': '0'});
    expect(statusIds(graph)).toEqual(['test-solves']);
    set(graph, {zRe: 0, zIm: 1.05});
    expect(statusIds(graph)).toEqual(['test-fails']);
    set(graph, {testVisible: false});
    expect(rows(graph)).toMatchObject({test: 'skrito', 'test-power': 'skrito'});
    expect(statusIds(graph)).toEqual([]);
});

test('the example choice sets w and n, keeps nothing hidden state alive, hides every reveal and ignores an unknown id', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, ALL);
    controls(graph).select.props.onChange('one-plus-i');
    expect(graph.model).toEqual({example: 'one-plus-i', wRe: 1, wIm: 1, degree: 3, rootsVisible: false, polygonVisible: false, testVisible: false, zRe: 1, zIm: 0.5});
    expect(at(points(graph)[W_POINT])).toEqual([1, 1]);
    set(graph, {rootsVisible: true});
    // the first root of 1 + i at 15 degrees, modulus 2^(1/6)
    const [x, y] = at(points(graph)[ROOT(0)]);
    expect(Math.hypot(x, y)).toBeCloseTo(2 ** (1 / 6), 12);
    expect((Math.atan2(y, x) * 180) / Math.PI).toBeCloseTo(15, 10);
    const before = {...graph.model};
    controls(graph).select.props.onChange('cubic');
    expect(graph.model).toEqual(before);
    expect(controls(graph).select.props.options.map((option: { text: string }) => option.text)).toEqual([
        'w = 2i, n = 3', 'w = 1 + i, n = 3', 'w = −1, n = 2 (negativna realna os)', 'w = 1, n = 4 (koreni enote)', 'w = 0, n = 3 (brez n-kotnika)',
    ]);
});

test('numeric inputs snap arithmetic noise to the 0.05 grid and reject a real off-grid, out-of-range or non-integer value without changing the model', () => {
    const graph = makeGraph({asyncState: false});
    const inspector = () => controls(graph);
    inspector().wRe.props.onChange(0.30000000000000004);
    expect(graph.model.wRe).toBe(0.3);
    inspector().wIm.props.onChange(-0);
    expect(Object.is(graph.model.wIm, -0)).toBe(false);
    inspector().degree.props.onChange(7);
    inspector().zRe.props.onChange(-1.5);
    inspector().zIm.props.onChange(0.25);
    expect(graph.model).toMatchObject({wRe: 0.3, wIm: 0, degree: 7, zRe: -1.5, zIm: 0.25});
    expect(at(points(graph)[W_POINT])).toEqual([0.3, 0]);
    expect(at(points(graph)[Z_POINT])).toEqual([-1.5, 0.25]);
    const before = {...graph.model};
    for (const [field, value] of [['wRe', 0.123], ['wIm', 2.05], ['zRe', -2.5], ['zIm', Number.NaN], ['degree', 1], ['degree', 9], ['degree', 2.5], ['degree', Number.NaN]] as const) {
        inspector()[field].props.onChange(value);
        expect(graph.model, `${field} ${value}`).toEqual(before);
    }
    expect(inspector().degree.props.min).toBe(2);
    expect(inspector().degree.props.max).toBe(8);
    expect(() => apply(graph, parameter('complex-w-re', 0.123))).toThrow(/multiple of 0.05/);
    expect(() => apply(graph, parameter('n', 9))).toThrow(/integer between 2 and 8/);
    expect(() => apply(graph, parameter('n', 2.5))).toThrow(/integer between 2 and 8/);
    expect(graph.model).toEqual(before);
});

test('dragging w and the test point projects onto the grid inside the limits and writes once per event', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, ALL);
    const w = points(graph)[W_POINT];
    const writes = graph.setState.mock.calls.length;
    w.x = 1.234;
    w.y = -0.9;
    w.handlers.drag();
    expect(graph.model).toMatchObject({wRe: 1.25, wIm: -0.9, example: 'two-i'});
    expect(at(w)).toEqual([1.25, -0.9]);
    expect(graph.setState.mock.calls.length).toBe(writes + 1);
    // the roots follow the drag
    const radius = Math.hypot(1.25, -0.9) ** (1 / 3);
    expect(Math.hypot(...(at(points(graph)[ROOT(0)]) as [number, number]))).toBeCloseTo(radius, 12);
    // beyond the square the drag is limited to its edge
    w.x = 5;
    w.y = -7;
    w.handlers.drag();
    expect(graph.model).toMatchObject({wRe: 2, wIm: -2});
    expect(at(w)).toEqual([2, -2]);
    w.x = -0.5;
    w.y = 0.02;
    w.handlers.drag();
    expect(graph.model).toMatchObject({wRe: -0.5, wIm: 0});
    expect(Object.is(graph.model.wIm, -0)).toBe(false);
    const z = points(graph)[Z_POINT];
    z.x = -1.01;
    z.y = 9;
    z.handlers.drag();
    expect(graph.model).toMatchObject({zRe: -1, zIm: 2});
    expect(at(z)).toEqual([-1, 2]);
    // a non-finite pointer position changes nothing
    const before = {...graph.model};
    z.x = Number.NaN;
    z.handlers.drag();
    expect(graph.model).toEqual(before);
});

test('the lesson action registry handles the w and z coordinates and n and refuses the others', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('complex-w-re', -1));
    apply(graph, parameter('complex-w-im', 0.5));
    apply(graph, parameter('complex-z-re', 0.25));
    apply(graph, parameter('complex-z-im', -1.5));
    apply(graph, parameter('n', 6));
    expect(graph.model).toMatchObject({wRe: -1, wIm: 0.5, zRe: 0.25, zIm: -1.5, degree: 6});
    expect(() => apply(graph, {kind: 'function-parameter', name: 'uniform-x', value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'complex-product', visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'complex-example', value: 'zero'} as LessonAction)).toThrow(UnsupportedLessonActionError);
});

test('presets round-trip, a malformed preset explains itself and loads the default, and capture, restore and Reset bring back the model and the board', () => {
    const graph = makeGraph();
    set(graph, {example: 'unity', wRe: -1.35, wIm: 1, degree: 5, rootsVisible: true, polygonVisible: true, testVisible: true, zRe: 0.5, zIm: -0.25});
    const exported = graph.exportPresetData();
    expect(exported).toEqual({
        example: 'unity', wRe: -1.35, wIm: 1, degree: 5, rootsVisible: true, polygonVisible: true, testVisible: true, zRe: 0.5, zIm: -0.25,
    });
    const other = makeGraph();
    other.importPreset({id: 'stored', data: JSON.parse(JSON.stringify(exported))});
    expect(other.model).toEqual(exported);
    // the board shows the imported model, not only the fields
    expect(at(points(other)[W_POINT])).toEqual([-1.35, 1]);
    expect(at(points(other)[Z_POINT])).toEqual([0.5, -0.25]);
    expect(shownRoots(other)).toEqual([0, 1, 2, 3, 4]);
    expect(shownEdges(other)).toEqual([0, 1, 2, 3, 4]);
    expect(graph.defaultPreset()).toEqual(DEFAULT_COMPLEX_ROOTS_MODEL);

    const valid = {...DEFAULT_COMPLEX_ROOTS_MODEL};
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad: [unknown, string][] = [
        [{...valid, example: 'cubic'}, 'example'], [{...valid, wRe: 2.05}, 'coordinate'], [{...valid, zIm: 0.01}, 'coordinate'], [{...valid, wIm: -3}, 'coordinate'],
        [{...valid, degree: 1}, 'degree'], [{...valid, degree: 9}, 'degree'], [{...valid, degree: 2.5}, 'degree'], [{...valid, degree: '3'}, 'degree'],
        [{...valid, rootsVisible: 'yes'}, 'visibility'], [{...valid, testVisible: 1}, 'visibility'], [{...valid, wIm: '1'}, 'generic'], [{}, 'generic'], [[], 'generic'],
    ];
    for (const [entry] of bad) {
        const checked = complexRootsPresetCollection.check(entry);
        expect('rejection' in checked, JSON.stringify(entry)).toBe(true);
        other.importPreset({id: 'stored', data: entry});
        expect(other.model, JSON.stringify(entry)).toEqual(valid);
        expect(shownRoots(other)).toEqual([]);
        expect(at(points(other)[W_POINT])).toEqual([0, 2]);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    // the exact localized text of one rejection per kind, in both languages
    expect(renderMessage(rejectionOf({...valid, example: 'cubic'}))).toBe('polje example mora biti eno od: two-i, one-plus-i, negative-real, unity, zero; popravi vrednost v datoteki');
    expect(renderMessage(rejectionOf({...valid, wRe: 2.05}))).toBe('polje wRe mora biti večkratnik števila 0.05 med −2 in 2; popravi vrednost v datoteki');
    expect(renderMessage(rejectionOf({...valid, degree: 9}))).toBe('polje degree mora biti celo število med 2 in 8; popravi vrednost v datoteki');
    expect(renderMessage(rejectionOf({...valid, polygonVisible: 'yes'}))).toBe('polje polygonVisible mora biti true ali false; popravi vrednost v datoteki');
    expect(renderMessage(rejectionOf({...valid, degree: undefined}))).toBe('neveljavni podatki funkcije');
    setLanguage('en');
    expect(renderMessage(rejectionOf({...valid, degree: 2.5}))).toBe('the field degree must be an integer between 2 and 8; correct the value in the file');
    expect(renderMessage(rejectionOf({...valid, zRe: 2.05}))).toBe('the field zRe must be a multiple of 0.05 between −2 and 2; correct the value in the file');
    expect(renderMessage(rejectionOf({...valid, testVisible: 0}))).toBe('the field testVisible must be true or false; correct the value in the file');
    setLanguage('sl');

    // capture, then Reset (the demonstration default), then restore: the model and the board return together
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual(exported);
    apply(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.model).toEqual(valid);
    expect(at(points(graph)[W_POINT])).toEqual([0, 2]);
    expect(at(points(graph)[Z_POINT])).toEqual([1, 0.5]);
    expect(shownRoots(graph)).toEqual([]);
    expect(shownEdges(graph)).toEqual([]);
    expect(shown(points(graph)[Z_POINT])).toBe(false);
    expect(caption(graph)[0]).toBe('w = 2i, n = 3');
    expect(rows(graph)).toMatchObject({degree: '3', roots: 'skrito'});
    expect(controls(graph).wRe.props.value).toBe(0);
    expect(controls(graph).degree.props.value).toBe(3);
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual(exported);
    expect(at(points(graph)[W_POINT])).toEqual([-1.35, 1]);
    expect(at(points(graph)[Z_POINT])).toEqual([0.5, -0.25]);
    expect(shownRoots(graph)).toEqual([0, 1, 2, 3, 4]);
    expect(controls(graph).wRe.props.value).toBe(-1.35);
    expect(controls(graph).degree.props.value).toBe(5);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('the board caption, readouts, statuses and legend follow the language, and a language change notifies subscribers', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {example: 'negative-real', wRe: -1, wIm: 0, degree: 2, rootsVisible: true, testVisible: true, zRe: 0, zIm: 1});
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    expect(caption(graph)).toEqual([
        'w = −1, n = 2', 'z₀ = i', 'z₁ = −i', 'z = i, z^n = −1', 'kvadrat: w; krog: koren z_k; romb: preizkusna točka z',
    ]);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)).toEqual([
        'w = −1, n = 2', 'z₀ = i', 'z₁ = −i', 'z = i, z^n = −1', 'square: w; circle: root z_k; diamond: test point z',
    ]);
    expect(rows(graph)).toMatchObject({'root-0': 'i; |z| = 1, arg z = π/2 ≈ 1.571', 'w-argument': 'π ≈ 3.142', 'test-power': '−1'});
    expect(graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: any) => status.text)).toEqual([
        'w is on the negative real axis, so arg w is exactly π. When w crosses the axis the labels of the roots move, though the set of roots stays the same.',
        'z^n = w up to rounding (difference below 10⁻⁹): the test point z is a root.',
    ]);
    set(graph, {rootsVisible: false});
    expect(caption(graph)[1]).toBe('roots: hidden');
    expect(rows(graph).roots).toBe('hidden');
    expect(controls(graph).showRoots.props.children).toBe('Show roots');
    expect(controls(graph).showTest.props.children).toBe('Hide test point');
    expect(controls(graph).degree.props.label).toBe('Degree n');
    expect(controls(graph).select.props.options[0].text).toBe('w = 2i, n = 3');
    setLanguage('sl');
    expect(caption(graph)[1]).toBe('koreni: skriti');
    expect(controls(graph).showRoots.props.children).toBe('Pokaži korene');
    expect(controls(graph).degree.props.label).toBe('Stopnja n');
    expect(controls(graph).select.props.options[2].text).toBe('w = −1, n = 2 (negativna realna os)');
    // below 520 px the root lines and the key are left out
    set(graph, {rootsVisible: true});
    graph.board.canvasWidth = 390;
    expect(caption(graph)).toEqual(['w = −1, n = 2', 'z = i, z^n = −1']);
    graph.board.canvasWidth = 700;
    expect(caption(graph)).toHaveLength(5);
    unsubscribe();
});

test('unmounting releases every owned object and reference, and a late drag after unmount only touches the model', () => {
    const graph = makeGraph({asyncState: false});
    const w = points(graph)[W_POINT];
    expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    graph.unmount();
    expect(graph.generatedObjectCount).toBe(0);
    expect(graph.pointW).toBeUndefined();
    expect(graph.pointZ).toBeUndefined();
    expect(graph.model).toEqual(DEFAULT_COMPLEX_ROOTS_MODEL);
    w.x = 0.5;
    w.y = 0.5;
    expect(() => w.handlers.drag()).not.toThrow();
});
