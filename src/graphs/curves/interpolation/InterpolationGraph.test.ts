import InterpolationGraph from './InterpolationGraph';
import {InterpolationScene} from './InterpolationScene';
import {DEFAULT_INTERPOLATION_PRESET, insideHull, interpolationRejection, readoutAt, readoutLines} from './interpolationModel';
import {interpolationPresetCollection} from './interpolationPresetCollection';
import {INTERPOLATION_POINTS_MAX} from '../../../analysis/interpolation';
import {renderMessage, setLanguage} from '../../../localization';

/** Counts live language subscriptions, so a leaked listener shows even though the scene also guards its callback. */
const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        renderer: {},
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, parents, attributes, board, X: () => parents[0], Y: () => parents[1],
                on: () => undefined, moveTo: (to: number[]) => { parents[0] = to[0]; parents[1] = to[1]; }};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        getBoundingBox: () => [-5, 5, 5, -5],
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

function makeGraph() {
    const graph = Object.create(InterpolationGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({...graph.getInitialState(), initialized: true});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); });
    graph.boardUpdate = vi.fn();
    graph.ensureScene();
    return graph;
}

const duplicate = {points: [[0, 0], [0, 0], [3, 3], [4, 0]], parameterRule: 'uniform', showHull: false, showBezier: true, t: 0.5};

describe('weights readout', () => {
    const points = DEFAULT_INTERPOLATION_PRESET.points;

    test('Lagrange weights sum to 1 and reproduce the lesson defaults; each curve reports its own parameter scale', () => {
        const mid = readoutAt(points, 'uniform', 0.5);
        expect(mid.lagrange.parameter).toBe(1.5);
        [-1 / 16, 9 / 16, 9 / 16, -1 / 16].forEach((w, i) => expect(mid.lagrange.weights[i]).toBeCloseTo(w, 14));
        expect(mid.lagrange.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14);
        expect(mid.lagrange.point[0]).toBeCloseTo(2, 14);
        expect(mid.lagrange.point[1]).toBeCloseTo(2.8125, 14);
        expect(mid.bezier.parameter).toBe(0.5);
        [1 / 8, 3 / 8, 3 / 8, 1 / 8].forEach((w, i) => expect(mid.bezier.weights[i]).toBeCloseTo(w, 14));
        expect(mid.bezier.point[0]).toBeCloseTo(2, 14);
        expect(mid.bezier.point[1]).toBeCloseTo(1.875, 14);
        // Chord rule: the Lagrange parameter spans [0, total chord length], the Bezier one stays on [0, 1].
        const chord = readoutAt([[0, 0], [3, 4], [3, 10]], 'chord', 0.5);
        expect(chord.lagrange.parameter).toBeCloseTo(5.5, 14);
        expect(chord.bezier.parameter).toBe(0.5);
        const early = readoutAt(points, 'uniform', 1 / 6);
        expect(early.lagrange.parameter).toBeCloseTo(0.5, 14);
        [0.3125, 0.9375, -0.3125, 0.0625].forEach((w, i) => expect(early.lagrange.weights[i]).toBeCloseTo(w, 14));
    });

    test('the readout text names both parameter scales and shows negative weights', () => {
        setLanguage('en');
        const lines = readoutLines(points, 'uniform', 0.5, true, 'en');
        expect(lines[0]).toContain('on [0, 3]');
        expect(lines[0]).toMatch(/[−-]0.0625/);
        expect(lines[1]).toContain('on [0, 1]');
        expect(readoutLines(points, 'uniform', 0.5, false, 'en')).toHaveLength(1);
        setLanguage('sl');
    });
});

describe('InterpolationGraph state and Presets', () => {
    test('the default scene is the lesson cubic with uniform parameters, exported from the state', () => {
        const graph = makeGraph();
        expect(graph.exportPresetData()).toEqual(DEFAULT_INTERPOLATION_PRESET);
        expect(graph.presetCollection()).toBe(interpolationPresetCollection);
        expect(graph.defaultPreset()).toEqual(DEFAULT_INTERPOLATION_PRESET);
    });

    test('drag writes state through setState; a coincident chord drag is refused with a notice and the points stay', () => {
        const graph = makeGraph();
        expect(graph.movePoint(1, 1, 2.5)).toBe(true);
        expect(graph.state.points[1]).toEqual([1, 2.5]);
        graph.setParameterRule('chord');
        expect(graph.state.parameterRule).toBe('chord');
        expect(graph.movePoint(1, 0, 0)).toBe(false);
        expect(graph.state.points[1]).toEqual([1, 2.5]);
        expect(graph.state.notice).toBe('coincident');
        expect(graph.movePoint(1, 2, 2)).toBe(true);
        expect(graph.state.notice).toBe('');
        // Uniform parameters allow equal points; switching to the chord rule is then refused and the rule stays.
        graph.setParameterRule('uniform');
        graph.movePoint(1, 0, 0);
        graph.setParameterRule('chord');
        expect(graph.state.parameterRule).toBe('uniform');
        expect(graph.state.notice).toBe('coincident');
    });

    test('the actionable message names the coincident points', () => {
        const rejection = interpolationRejection(duplicate.points as [number, number][], 'chord');
        expect(rejection && renderMessage(rejection)).toMatch(/1/);
        expect(rejection && renderMessage(rejection).length).toBeGreaterThan(40);
        expect(interpolationRejection(duplicate.points as [number, number][], 'uniform')).toBeUndefined();
    });

    test('the point count stays within 2 and 12', () => {
        const graph = makeGraph();
        for (let i = 0; i < 20; i++) graph.addPoint();
        expect(graph.state.points.length).toBe(INTERPOLATION_POINTS_MAX);
        for (let i = 0; i < 20; i++) graph.removePoint();
        expect(graph.state.points.length).toBe(2);
        expect(graph.board.objectsList.filter((o: any) => o.type === 'point' && o.attributes.withLabel).length).toBe(2);
    });

    test('import refuses coincident chord data, out-of-cap data and non-finite numbers without touching the state', () => {
        const graph = makeGraph();
        const before = graph.state;
        expect(() => graph.importPresetData({...duplicate, parameterRule: 'chord'})).toThrow();
        expect(() => graph.importPresetData({...duplicate, points: [[0, 0]]})).toThrow();
        expect(() => graph.importPresetData({...duplicate, points: Array.from({length: 13}, (_, i) => [i, i])})).toThrow();
        expect(() => graph.importPresetData({...duplicate, points: [[0, 0], [1, NaN]]})).toThrow();
        expect(graph.state).toBe(before);
    });

    test('the collection rejects malformed, non-finite, out-of-cap and coincident data', () => {
        const ok = {...DEFAULT_INTERPOLATION_PRESET};
        const bad: unknown[] = [
            null, [], {...ok, points: 'x'}, {...ok, points: [[0, 0], [1]]}, {...ok, points: [[0, 0], [1, NaN]]},
            {...ok, points: [[0, 0], [Infinity, 1]]}, {...ok, points: [[0, 0]]}, {...ok, points: Array.from({length: 13}, (_, i) => [i, i * i])},
            {...ok, points: [[0, 0], [1, 1e9]]}, {...ok, parameterRule: 'centripetal'}, {...ok, showHull: 1}, {...ok, t: 2}, {...ok, t: NaN},
            {...duplicate, parameterRule: 'chord'},
        ];
        bad.forEach(data => expect(interpolationPresetCollection.check(data)).toHaveProperty('rejection'));
        expect(interpolationPresetCollection.check(duplicate)).toHaveProperty('data');
        expect(interpolationPresetCollection.checkGraphState!({...ok, points: [[0, 0], [1, NaN]]})).toBeDefined();
        expect(interpolationPresetCollection.checkGraphState!({notice: 'x'})).toBeDefined();
        expect(interpolationPresetCollection.checkGraphState!({notice: 'coincident', t: 0.2})).toBeUndefined();
    });

    test('import rebuilds one scene: repeated imports neither stack elements nor listeners, and removal releases both', () => {
        const before = liveSubscriptions.count;
        const graph = makeGraph();
        const total = graph.board.objectsList.length;
        expect(liveSubscriptions.count).toBe(before + 1);
        for (let i = 0; i < 5; i++) graph.importPresetData(graph.exportPresetData());
        expect(graph.board.objectsList.length).toBe(total);
        expect(liveSubscriptions.count).toBe(before + 1);
        graph.removeScene();
        expect(graph.board.objectsList).toEqual([]);
        expect(liveSubscriptions.count).toBe(before);
    });

    test('a scene whose build throws removes what it created and releases its subscription', () => {
        const board = fakeBoard();
        const create = board.create.getMockImplementation();
        let calls = 0;
        board.create.mockImplementation((...args: any[]) => {
            if (++calls === 7) throw new Error('board failure');
            return create(...args);
        });
        const before = liveSubscriptions.count;
        expect(() => new InterpolationScene({board, points: () => DEFAULT_INTERPOLATION_PRESET.points, rule: () => 'uniform',
            showHull: () => false, showBezier: () => true, position: () => 0.5, fontSize: () => 16, onMove: () => true})).toThrow('board failure');
        expect(board.objectsList).toEqual([]);
        expect(liveSubscriptions.count).toBe(before);
    });

    test('a lesson fixture with another point count survives the default-state replacement, with no orphan points', () => {
        const graph = makeGraph();
        const six = {...DEFAULT_INTERPOLATION_PRESET, points: [[0, 0], [1, 2], [2, 1], [3, 3], [4, 0], [5, 2]]};
        // The sequence of BaseGraph.prepareLessonFixtureScene.
        graph.importPresetData(six);
        graph.replaceState({...graph.getInitialState(), ...graph.lessonDefaultState()});
        expect(graph.state.points).toEqual(six.points);
        expect(graph.state.initialized).toBe(true);
        expect(graph.state.notice).toBe('');
        expect(graph.scene.pointElements().length).toBe(6);
        expect(graph.board.objectsList.filter((o: any) => o.type === 'point' && o.attributes.withLabel).length).toBe(6);
    });

    test('add at the coordinate limit places a distinct point and shows no notice', () => {
        const graph = makeGraph();
        graph.importPresetData({...DEFAULT_INTERPOLATION_PRESET, points: [[0, 0], [1000, 5]], parameterRule: 'chord'});
        graph.addPoint();
        expect(graph.state.points).toEqual([[0, 0], [1000, 5], [999, 5]]);
        expect(graph.state.notice).toBe('');
    });

    test('a nearly coincident parameter pair whose weights overflow is a rejection and a draw does not throw', () => {
        const tiny = [[0, 0], [1e-310, 0], [1, 2]];
        expect(interpolationRejection(tiny as [number, number][], 'chord')).toBeDefined();
        const graph = makeGraph();
        expect(() => graph.importPresetData({...DEFAULT_INTERPOLATION_PRESET, points: tiny, parameterRule: 'chord'})).toThrow();
        const board = graph.board;
        const lagrange = board.objectsList.find((o: any) => o.type === 'curve' && typeof o.parents[3] === 'function');
        graph.store.setState({points: tiny, parameterRule: 'chord'});
        expect(() => lagrange.parents[0](0.5)).not.toThrow();
        expect(Number.isNaN(lagrange.parents[0](0.5))).toBe(true);
    });

    test('insideHull on collinear data uses the segment, so a mid-segment point is inside', () => {
        const line: [number, number][] = [[0, 0], [2, 2], [4, 4]];
        expect(insideHull([1, 1], line)).toBe(true);
        expect(insideHull([3, 3.5], line)).toBe(false);
        expect(insideHull([5, 5], line)).toBe(false);
    });
});
