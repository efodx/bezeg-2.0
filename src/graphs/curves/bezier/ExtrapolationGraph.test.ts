import ExtrapolationGraph from './ExtrapolationGraph';
import {BaseBezierCurveGraph} from '../../base/BaseBezierCurveGraph';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {GraphPalette} from '../../styles/GraphPalette';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const curve = () => new PolynomialBezierCurve([[-4, -2], [-3, 3], [2, 3], [3, -1]].map(([x, y]) => new PointImpl(x, y)));

function fakeCurve() {
    const created: object[] = [];
    const fake: any = {
        extrapolationPoint: null as object | null,
        extrapolationT: 1.2,
        created,
        createExtrapolationPoint: vi.fn(() => {
            if (!fake.extrapolationPoint) { fake.extrapolationPoint = {}; created.push(fake.extrapolationPoint); }
        }),
        showExtrapolationPoint: vi.fn(),
        setAttributes: vi.fn(),
        setExtrapolationT: vi.fn((v: number) => { fake.extrapolationT = v; }),
        getExtrapolationT: () => fake.extrapolationT,
        extrapolate: vi.fn(),
        getCurve: () => curve(),
    };
    return fake;
}

function graphWith(c: any) {
    const graph = Object.create(ExtrapolationGraph.prototype) as any;
    graph.jxgCurves = [c];
    graph.refreshWorkspace = vi.fn();
    graph.board = {suspendUpdate: vi.fn(), objectsList: [], removeObject: vi.fn(), create: vi.fn((type: string, parents: unknown[], attributes: object) => ({type, parents, attributes}))};
    graph.unsuspendBoardUpdate = vi.fn();
    return graph;
}

test('extrapolation parameter action sets the parameter and refreshes the slider', () => {
    const c = fakeCurve();
    const graph = graphWith(c);
    graph.applyLessonAction({kind: 'extrapolation-parameter', value: 1.35});
    expect(c.extrapolationT).toBe(1.35);
    expect(graph.refreshWorkspace).toHaveBeenCalledTimes(1);
});

test.each([0.99, 1.51, NaN, Infinity])('rejects extrapolation parameter %p without mutation', value => {
    const c = fakeCurve();
    const graph = graphWith(c);
    expect(() => graph.applyLessonAction({kind: 'extrapolation-parameter', value})).toThrow();
    expect(c.setExtrapolationT).not.toHaveBeenCalled();
    expect(c.extrapolationT).toBe(1.2);
});

test('extrapolate action extrapolates at the current parameter', () => {
    const c = fakeCurve();
    const graph = graphWith(c);
    graph.applyLessonAction({kind: 'extrapolate'});
    expect(c.extrapolate).toHaveBeenCalledWith(1.2);
});

test('preset import recreates exactly one extrapolation point per curve', () => {
    const second = fakeCurve();
    const graph = graphWith(fakeCurve());
    const spy = vi.spyOn(BaseBezierCurveGraph.prototype as any, 'importPresetData').mockImplementation(function (this: any) {
        this.jxgCurves = [second];
    });
    try {
        graph.importPresetData([]);
        graph.importPresetData([]);
    } finally {
        spy.mockRestore();
    }
    expect(second.created).toHaveLength(1);
    expect(second.showExtrapolationPoint).toHaveBeenCalled();
    expect(second.setAttributes).toHaveBeenCalledWith(expect.objectContaining({allowExtrapolation: false, allowSubdivision: false}));
});

test('extrapolated curve reparameterizes the original: E(u) = B(t u)', () => {
    const original = curve();
    [1, 1.2, 1.5].forEach(t => {
        const e = original.extrapolate(t);
        [0, 0.25, 0.5, 1 / t, 1].forEach(u => {
            expect(e.eval(u).X()).toBeCloseTo(original.eval(t * u).X(), 9);
            expect(e.eval(u).Y()).toBeCloseTo(original.eval(t * u).Y(), 9);
        });
    });
});

test('extrapolated control points at t = 1.2 match the worked example', () => {
    const pts = curve().extrapolate(1.2).getPoints().map(p => [+p.X().toFixed(4), +p.Y().toFixed(4)]);
    expect(pts).toEqual([[-4, -2], [-2.8, 4], [4.16, 2.8], [3.056, -3.872]]);
});

test('the part beyond t = 1 is its own solid blue element whose points are the curve evaluated there', () => {
    const c = fakeCurve();
    const graph = graphWith(c);
    graph.getFirstJxgCurve = () => c;
    graph.buildExtension();
    const [call] = graph.board.create.mock.calls;
    expect(call[0]).toBe('curve');
    const [x, y, start, end] = call[1] as [(u: number) => number, (u: number) => number, number, () => number];
    const original = curve();
    expect(start).toBe(1);
    expect(end()).toBe(1.2);
    [1, 1.05, 1.1, 1.2].forEach(u => {
        expect(x(u)).toBeCloseTo(original.eval(u).X(), 9);
        expect(y(u)).toBeCloseTo(original.eval(u).Y(), 9);
    });
    expect(call[2].strokeColor).toBe(GraphPalette.comparisonCurve);
    expect(call[2].strokeColor).not.toBe(GraphPalette.primaryCurve);
    expect(call[2].dash).toBe(0);
    c.extrapolationT = 1;
    expect(end()).toBeCloseTo(1, 5);
    expect(end()).toBeGreaterThan(1);
});
