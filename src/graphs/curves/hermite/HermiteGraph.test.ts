import HermiteGraph from './HermiteGraph';
import {HermiteScene} from './HermiteScene';
import {
    catmullRomStored, chainDerivative, chainPoint, DEFAULT_HERMITE_PRESET, hermiteChain, hermiteRejection, HermitePresetData,
    HERMITE_TENSION_MAX, hermiteViewBox,
} from './hermiteModel';
import {catmullRomTangents} from '../../../analysis/hermite';
import {hermitePresetCollection} from './hermitePresetCollection';
import {renderMessage} from '../../../localization';

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
                on: () => undefined, setAttribute: () => undefined, moveTo: (to: number[]) => { parents[0] = to[0]; parents[1] = to[1]; }};
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
    const graph = Object.create(HermiteGraph.prototype) as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({...graph.getInitialState(), initialized: true});
    graph.setState = vi.fn((patch: any) => { graph.store.setState(patch); });
    graph.boardUpdate = vi.fn();
    graph.ensureScene();
    return graph;
}

const valid: HermitePresetData = {...DEFAULT_HERMITE_PRESET};

describe('the model', () => {
    test('the default stored tangents are the Catmull-Rom tangents of the default points', () => {
        const chain = hermiteChain(valid);
        expect(chain.tangents).toEqual(valid.tangents);
        expect(chainPoint(chain, 1.5)[0]).toBeCloseTo(2, 12);
        expect(chainPoint(chain, 1.5)[1]).toBeCloseTo(2.8125, 12);
        const d = chainDerivative(chain, 1);
        expect([d[0], d[1]]).toEqual([1.5, 1.5]);
    });

    test('hermiteRejection names the coincident pair and the cap violations', () => {
        expect(hermiteRejection(valid)).toBeUndefined();
        const rejection = hermiteRejection({...valid, points: [[0, 0], [1, 2], [1, 2], [4, 0]]});
        expect(rejection && renderMessage(rejection)).toContain('Interpolacijski točki 2 in 3');
        const bad: Partial<HermitePresetData>[] = [
            {points: [[0, 0]], tangents: [[0, 0]]}, {tension: -0.1}, {tension: 2.01}, {tension: NaN}, {tangents: valid.tangents.slice(1)},
            {tangents: [[1, 2], [1.5, 1.5], [1.5, -1], [NaN, 0]]}, {tangents: [[1, 2], [1.5, 1.5], [1.5, -1], [4001, 0]]},
            {points: [[0, 0], [1, 2], [3, 3], [4, 1001]]}, {mode: 'spline' as never}, {parameterRule: 'centripetal' as never},
        ];
        bad.forEach(patch => expect(hermiteRejection({...valid, ...patch})).toBeDefined());
        const twelve = Array.from({length: 12}, (_, i) => [i, i * i % 7] as const);
        expect(hermiteRejection({...valid, points: twelve, tangents: twelve.map(() => [0, 0] as const)})).toBeUndefined();
        const thirteen = Array.from({length: 13}, (_, i) => [i, i * i % 7] as const);
        expect(hermiteRejection({...valid, points: thirteen, tangents: thirteen.map(() => [0, 0] as const)})).toBeDefined();
    });

    test('the largest Catmull-Rom tangents the caps allow are stored for Hermite mode exactly and are valid data', () => {
        const points = [[-1000, 1000], [1000, -1000], [-1000, 1000]] as const;
        const stored = catmullRomStored(points, 'uniform', HERMITE_TENSION_MAX);
        expect(stored).toEqual(catmullRomTangents(points, 'uniform', HERMITE_TENSION_MAX));
        expect(stored[0]).toEqual([4000, -4000]);
        expect(hermiteRejection({...valid, mode: 'hermite', points, tangents: stored, tension: HERMITE_TENSION_MAX})).toBeUndefined();
    });

    test('the view box contains the points with a margin', () => {
        const [left, top, right, bottom] = hermiteViewBox(valid.points);
        expect(left).toBeLessThan(0);
        expect(right).toBeGreaterThan(4);
        expect(top).toBeGreaterThan(3);
        expect(bottom).toBeLessThan(0);
    });
});

describe('the collection', () => {
    test('accepts the default and rejects malformed, non-finite, out-of-cap and coincident data', () => {
        expect(hermitePresetCollection.check(valid)).toHaveProperty('data');
        const bad: unknown[] = [
            null, [], {...valid, points: 'x'}, {...valid, points: [[0, 0], [1]]}, {...valid, tangents: undefined}, {...valid, tangents: [[0, 0]]},
            {...valid, tangents: [[1, 2], [1.5, 1.5], [1.5, -1], [1, 'x']]}, {...valid, mode: 'x'}, {...valid, parameterRule: 'x'},
            {...valid, tension: '1'}, {...valid, tension: 3}, {...valid, showTangents: 1}, {...valid, showBezier: undefined},
            {...valid, points: [[0, 0], [0, 0], [3, 3], [4, 0]]}, {...valid, points: [[0, 0], [1000, 0], [1000, 1e-300], [4, 0]], parameterRule: 'chord'},
        ];
        bad.forEach(data => expect(hermitePresetCollection.check(data)).toHaveProperty('rejection'));
        expect(hermitePresetCollection.check({...valid, points: [[0, 0], [1000, 0], [1000, 1e-300], [4, 0]]})).toHaveProperty('data');
        expect(hermitePresetCollection.checkGraphState!({...valid, notice: 'coincident'})).toBeUndefined();
        expect(hermitePresetCollection.checkGraphState!({notice: 'x'})).toBeDefined();
        expect(hermitePresetCollection.checkGraphState!({...valid, tension: 9})).toBeDefined();
        expect(hermitePresetCollection.checkGraphState!({initialized: true})).toBeUndefined();
    });
});

describe('HermiteGraph state', () => {
    test('the default scene is exported from the state', () => {
        const graph = makeGraph();
        expect(graph.exportPresetData()).toEqual(DEFAULT_HERMITE_PRESET);
        expect(graph.presetCollection()).toBe(hermitePresetCollection);
        expect(graph.defaultPreset()).toEqual(DEFAULT_HERMITE_PRESET);
    });

    test('mode switch copies the scaled tangents; tension is ignored in Hermite mode; tangent drags need Hermite mode', () => {
        const graph = makeGraph();
        graph.setTension(5);
        expect(graph.state.tension).toBe(2);
        graph.setMode('hermite');
        expect(graph.state.tangents[1]).toEqual([3, 3]);
        graph.setTension(0.1);
        expect(graph.state.tension).toBe(2);
        expect(graph.moveTangent(1, 3, 4)).toBe(true);
        expect(graph.state.tangents[1]).toEqual([2, 2]);
        graph.setMode('catmull-rom');
        expect(graph.moveTangent(1, 9, 9)).toBe(false);
        expect(graph.editTangent(1, [9, 9])).toBeUndefined();
        expect(graph.state.tangents[1]).toEqual([2, 2]);
    });

    test('a refused drag keeps the old data and sets the notice; an accepted one clears it; Hermite keeps m_i', () => {
        const graph = makeGraph();
        graph.setMode('hermite');
        expect(graph.movePoint(1, 0, 0)).toBe(false);
        expect(graph.state.points[1]).toEqual([1, 2]);
        expect(graph.state.notice).toBe('coincident');
        expect(graph.movePoint(1, 1, 3)).toBe(true);
        expect(graph.state.notice).toBe('');
        expect(graph.state.tangents[1]).toEqual([1.5, 1.5]);
        expect(graph.movePoint(1, 5000, -5000)).toBe(true);
        expect(graph.state.points[1]).toEqual([1000, -1000]);
    });

    test('the point count stays within 2 and 12, and tangents follow', () => {
        const graph = makeGraph();
        for (let i = 0; i < 20; i++) graph.addPoint();
        expect(graph.state.points.length).toBe(12);
        expect(graph.state.tangents.length).toBe(12);
        for (let i = 0; i < 20; i++) graph.removePoint();
        expect(graph.state.points.length).toBe(2);
        expect(graph.state.tangents.length).toBe(2);
        graph.importPresetData({...valid, points: [[0, 0], [1000, 5]], tangents: [[0, 0], [0, 0]]});
        graph.addPoint();
        expect(graph.state.points[2]).toEqual([999, 5]);
        expect(graph.state.tangents[2]).toEqual([-1, 0]);
    });

    test('a lesson fixture with another point count survives the default-state replacement, with no orphans', () => {
        const graph = makeGraph();
        const six = {...valid, mode: 'hermite' as const, points: [[0, 0], [1, 2], [2, 1], [3, 3], [4, 0], [5, 2]], tangents: Array.from({length: 6}, () => [1, 0] as const)};
        graph.importPresetData(six);
        graph.replaceState({...graph.getInitialState(), ...graph.lessonDefaultState()});
        expect(graph.exportPresetData()).toEqual(six);
        expect(graph.state.initialized).toBe(true);
        expect(graph.scene.pointElements().length).toBe(6);
        expect(graph.board.objectsList.filter((o: any) => o.type === 'arrow').length).toBe(6);
    });
});

describe('scene ownership', () => {
    test('repeated imports neither stack elements nor listeners; removal releases both', () => {
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
        graph.removeScene();
        expect(liveSubscriptions.count).toBe(before);
    });

    test('disposeFigureScene removes every owned object and the subscription', () => {
        const before = liveSubscriptions.count;
        const graph = makeGraph();
        graph.disposeFigureScene();
        expect(graph.board.objectsList).toEqual([]);
        expect(liveSubscriptions.count).toBe(before);
    });

    test('a scene whose build throws removes what it created and releases its subscription', () => {
        const board = fakeBoard();
        const create = board.create.getMockImplementation();
        let calls = 0;
        board.create.mockImplementation((...args: any[]) => {
            if (++calls === 14) throw new Error('board failure');
            return create(...args);
        });
        const before = liveSubscriptions.count;
        expect(() => new HermiteScene({board, input: () => ({...valid, mode: 'catmull-rom'}), showTangents: () => true, showBezier: () => false,
            fontSize: () => 16, onMove: () => true, onTangent: () => true})).toThrow('board failure');
        expect(board.objectsList).toEqual([]);
        expect(liveSubscriptions.count).toBe(before);
    });

    test('an undrawable state draws NaN, never throws', () => {
        const graph = makeGraph();
        graph.store.setState({points: [[0, 0], [0, 0], [3, 3], [4, 0]]});
        const curve = graph.board.objectsList.find((o: any) => o.type === 'curve' && typeof o.parents[3] === 'function');
        expect(() => curve.parents[0](0.5)).not.toThrow();
        expect(Number.isNaN(curve.parents[0](0.5))).toBe(true);
    });
});
