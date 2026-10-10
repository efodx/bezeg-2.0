import SubdivisionGraph1 from './SubdivisionGraph1';
import RationalSubdivisionGraph2 from '../rational/RationalSubdivisionGraph2';
import BaseCurveGraph from '../../base/BaseCurveGraph';
import {AbstractJXGBezierCurve} from '../object/AbstractJXGBezierCurve';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {RationalBezierCurve} from '../../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const P = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const poly = () => new PolynomialBezierCurve(P.map(([x, y]) => new PointImpl(x, y)));
const rational = () => new RationalBezierCurve(P.map(([x, y]) => new PointImpl(x, y)), [1, 2, 1, 1]);
const xy = (pts: any[]) => pts.map(p => [p.X(), p.Y()]);

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: jest.fn((type: string, parents: any[]) => {
            const object = {type, parents};
            board.objectsList.push(object);
            return object;
        }),
        removeObject: jest.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((o: any) => !list.includes(o));
        }),
        update: jest.fn(),
    };
    return board;
}

function fakeJxgCurve(curve: any) {
    return {
        getCurve: () => curve,
        getJxgPoints: () => [],
        setIntervalEnd: jest.fn(),
        setAttributes: jest.fn(),
        showDecasteljauPoints: jest.fn(),
        showCurrentDecasteljauScheme: jest.fn(),
        setSubdivisionT: jest.fn(),
        subdivide: jest.fn(() => ({getJxgCurve: () => ({setAttribute: jest.fn()})})),
        isShowingDecasteljauScheme: () => false,
        dispose: jest.fn(),
        board: undefined as any,
    };
}

function makeGraph(Cls: any = SubdivisionGraph1) {
    const graph = Object.create(Cls.prototype) as any;
    graph.board = fakeBoard();
    graph.jxgCurves = [fakeJxgCurve(poly())];
    graph.graphJXGPoints = [];
    graph.workspaceRevision = 0;
    graph.graphSession = {isReady: true, isAlive: true};
    graph.state = {t: 0.5, v: 1, showDecasteljau: true, initialized: true};
    graph.setState = jest.fn((patch: any) => { graph.state = {...graph.state, ...(typeof patch === 'function' ? patch(graph.state) : patch)}; });
    graph.boardUpdate = jest.fn();
    return graph;
}

const orange = (graph: any) => graph.board.objectsList.filter((o: any) => o.type === 'curve');

describe('subdivision math', () => {
    test('polynomial default split at 1/2', () => {
        const [l, r] = poly().subdivide(0.5);
        expect(xy(l.getPoints())).toEqual([[-4, -3], [-3.5, 0], [-1.75, 1.5], [0, 1.5]]);
        expect(xy(r.getPoints())).toEqual([[0, 1.5], [1.75, 1.5], [3.5, 0], [4, -3]]);
    });

    test.each([['polynomial', poly], ['rational', rational]])('%s halves reparametrize the original', (_n, make) => {
        for (const t of [0.1, 0.37, 0.5, 0.9]) {
            const curve: any = make();
            const [l, r]: any[] = make().subdivide(t);
            for (const u of [0, 0.25, 0.6, 1]) {
                const a = l.eval(u), b = curve.eval(t * u);
                expect(a.X()).toBeCloseTo(b.X(), 9);
                expect(a.Y()).toBeCloseTo(b.Y(), 9);
                const c = r.eval(u), d = curve.eval(t + (1 - t) * u);
                expect(c.X()).toBeCloseTo(d.X(), 9);
                expect(c.Y()).toBeCloseTo(d.Y(), 9);
            }
        }
    });
});

describe('lesson actions', () => {
    test.each([0.01, 0.5, 0.99])('subdivision-parameter accepts %p', value => {
        const graph = makeGraph();
        graph.applyLessonAction({kind: 'subdivision-parameter', value});
        expect(graph.state.t).toBe(value);
    });

    test.each([0, 0.009, 1, -1, NaN, Infinity, '0.5'])('subdivision-parameter rejects %p without mutation', value => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'subdivision-parameter', value})).toThrow(/0\.01 to 0\.99/);
        expect(graph.state.t).toBe(0.5);
        expect(graph.setState).not.toHaveBeenCalled();
    });

    test('subdivide splits at state t and resets scheme/t like the button', () => {
        const graph = makeGraph();
        const jxg = graph.jxgCurves[0];
        graph.state.t = 0.3;
        graph.applyLessonAction({kind: 'subdivide'});
        expect(jxg.setSubdivisionT).toHaveBeenCalledWith(0.3);
        expect(jxg.subdivide).toHaveBeenCalledTimes(1);
        expect(jxg.showCurrentDecasteljauScheme).toHaveBeenCalledWith(false);
        expect(graph.state).toMatchObject({t: 1, showDecasteljau: false});
    });

    test('subdivide is rejected before mutation when t is out of range', () => {
        const graph = makeGraph();
        graph.state.t = 1;
        const jxg = graph.jxgCurves[0];
        expect(() => graph.applyLessonAction({kind: 'subdivide'})).toThrow(/0\.01 and 0\.99/);
        expect(jxg.subdivide).not.toHaveBeenCalled();
        expect(graph.state.t).toBe(1);
    });

    test('prepared scene, parameter and subdivide in one synchronous tick split at the new t after an earlier split', () => {
        const graph = makeGraph();
        graph.state.t = 1;
        // setState is asynchronous in React: state only commits after the whole scene ran.
        const queued: any[] = [];
        graph.setState = jest.fn((patch: any) => { queued.push(patch); });
        const spy = jest.spyOn(BaseCurveGraph.prototype, 'importPresetData').mockImplementation(function (this: any) {
            this.jxgCurves = [fakeJxgCurve(poly())];
        });
        try {
            graph.applyLessonAction({kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
            graph.applyLessonAction({kind: 'subdivision-parameter', value: 0.3});
            const jxg = graph.jxgCurves[0];
            expect(graph.state.t).toBe(1);
            graph.applyLessonAction({kind: 'subdivide'});
            expect(jxg.setSubdivisionT).toHaveBeenCalledWith(0.3);
            expect(jxg.subdivide).toHaveBeenCalledTimes(1);
            // a second split in the same tick must see the post-split reset value (1) and be rejected
            expect(() => graph.applyLessonAction({kind: 'subdivide'})).toThrow(/0\.01 and 0\.99/);
        } finally { spy.mockRestore(); }
    });

    test('decasteljau-scheme visibility keeps state in sync', () => {
        const graph = makeGraph();
        Object.setPrototypeOf(graph.jxgCurves[0], AbstractJXGBezierCurve.prototype);
        graph.applyLessonAction({kind: 'curve-visibility', target: 'decasteljau-scheme', visible: false});
        expect(graph.state.showDecasteljau).toBe(false);
        expect(graph.jxgCurves[0].showCurrentDecasteljauScheme).toHaveBeenCalledWith(false);
    });
});

describe('orange remainder ownership', () => {
    function stubImport() {
        return jest.spyOn(BaseCurveGraph.prototype, 'importPresetData').mockImplementation(function (this: any) {
            this.disposeFigureScene();
            this.jxgCurves = [fakeJxgCurve(poly())];
        });
    }

    test('initialize creates one orange curve bound to the first curve', () => {
        const graph = makeGraph();
        graph.initialize();
        expect(orange(graph)).toHaveLength(1);
        const [fx] = orange(graph)[0].parents;
        expect(fx(0)).toBe(-4);
    });

    test('preset import disposes the old remainder and rebinds to the new curve', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        const first = orange(graph)[0];
        const oldCurve = graph.jxgCurves[0];
        const spy = stubImport();
        try {
            graph.importPresetData([]);
            expect(orange(graph)).toHaveLength(1);
            expect(orange(graph)[0]).not.toBe(first);
            expect(graph.board.objectsList).not.toContain(first);
            expect(graph.jxgCurves[0]).not.toBe(oldCurve);
            expect(graph.jxgCurves[0].setIntervalEnd).toHaveBeenCalledTimes(1);
            const end = graph.jxgCurves[0].setIntervalEnd.mock.calls[0][0];
            expect(end()).toBe(1);
            graph.state = {...graph.state, showDecasteljau: false, t: 0.25};
            expect(end()).toBe(0.25);
        } finally { spy.mockRestore(); }
    });

    test('default scene leaves exactly one curve and one remainder', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        graph.jxgCurves.push(fakeJxgCurve(poly()));
        graph.state = {...graph.state, t: 1, showDecasteljau: false};
        const spy = stubImport();
        try {
            graph.applyLessonAction({kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
            expect(graph.jxgCurves).toHaveLength(1);
            expect(orange(graph)).toHaveLength(1);
            expect(graph.state).toMatchObject({t: 0.5, showDecasteljau: true});
        } finally { spy.mockRestore(); }
    });

    test('disposeFigureScene removes the remainder', () => {
        const graph = makeGraph();
        graph.bindSceneToFirstCurve();
        graph.disposeFigureScene();
        expect(orange(graph)).toHaveLength(0);
    });

    test('rational route inherits the behaviour with weights (1,2,1,1)', () => {
        const graph = makeGraph(RationalSubdivisionGraph2);
        expect(graph.defaultPreset()[0][1].weights).toEqual([1, 2, 1, 1]);
        graph.jxgCurves = [fakeJxgCurve(rational())];
        graph.bindSceneToFirstCurve();
        expect(orange(graph)).toHaveLength(1);
        graph.applyLessonAction({kind: 'subdivision-parameter', value: 0.4});
        expect(graph.state.t).toBe(0.4);
    });
});
