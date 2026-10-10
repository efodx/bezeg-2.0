import RationalExtrapolationGraph from './RationalExtrapolationGraph';
import {BaseRationalCurveGraph} from './BaseRationalCurveGraph';
import {RationalBezierCurve} from '../../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const curve = () => new RationalBezierCurve([[-4, -3], [-3, 3], [3, 3], [4, -1]].map(([x, y]) => new PointImpl(x, y)), [1, 2, 1, 1]);

function fakeCurve() {
    const created: object[] = [];
    const fake: any = {
        extrapolationPoint: null as object | null,
        extrapolationT: 1.2,
        created,
        createExtrapolationPoint: jest.fn(() => {
            if (!fake.extrapolationPoint) { fake.extrapolationPoint = {}; created.push(fake.extrapolationPoint); }
        }),
        showExtrapolationPoint: jest.fn(),
        setAttributes: jest.fn(),
        setExtrapolationT: jest.fn((v: number) => { fake.extrapolationT = v; }),
        getExtrapolationT: () => fake.extrapolationT,
        extrapolate: jest.fn(),
    };
    return fake;
}

function graphWith(c: any) {
    const graph = Object.create(RationalExtrapolationGraph.prototype) as any;
    graph.jxgCurves = [c];
    graph.refreshWorkspace = jest.fn();
    graph.board = {suspendUpdate: jest.fn()};
    graph.unsuspendBoardUpdate = jest.fn();
    return graph;
}

test('extrapolation parameter action sets the parameter and refreshes the slider', () => {
    const c = fakeCurve();
    const graph = graphWith(c);
    graph.applyLessonAction({kind: 'extrapolation-parameter', value: 1.5});
    expect(c.extrapolationT).toBe(1.5);
    expect(graph.refreshWorkspace).toHaveBeenCalledTimes(1);
});

test.each([0.99, 1.51, NaN, Infinity])('rejects extrapolation parameter %p without mutation', value => {
    const c = fakeCurve();
    const graph = graphWith(c);
    expect(() => graph.applyLessonAction({kind: 'extrapolation-parameter', value})).toThrow();
    expect(c.setExtrapolationT).not.toHaveBeenCalled();
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
    const spy = jest.spyOn(BaseRationalCurveGraph.prototype as any, 'importPresetData').mockImplementation(function (this: any) {
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
});

test('rational extrapolation reparameterizes the original: E(u) = B(t u)', () => {
    const original = curve();
    [1, 1.2, 1.5].forEach(t => {
        const e = original.extrapolate(t);
        [0, 0.25, 0.5, 1 / t, 1].forEach(u => {
            expect(e.eval(u).X()).toBeCloseTo(original.eval(t * u).X(), 9);
            expect(e.eval(u).Y()).toBeCloseTo(original.eval(t * u).Y(), 9);
        });
    });
});

test('extrapolated weights: third weight is 1 + 2t - 2t^2, positive until t = (1 + sqrt 3) / 2 ~ 1.366', () => {
    const original = curve();
    const limit = (1 + Math.sqrt(3)) / 2;
    let min = Infinity;
    for (let i = 0; i <= 500; i++) {
        const t = 1 + 0.5 * i / 500;
        const w = original.extrapolate(t).getWeights();
        expect(w[2]).toBeCloseTo(1 + 2 * t - 2 * t * t, 9);
        if (t < limit - 1e-6) expect(Math.min(...w)).toBeGreaterThan(0);
        min = Math.min(min, ...w);
    }
    // Over the whole slider range [1, 1.5] the default rational curve produces a negative weight (min -0.5 at t = 1.5).
    expect(min).toBeCloseTo(-0.5, 9);
    expect(Math.min(...original.extrapolate(1.2).getWeights())).toBeGreaterThan(0.5);
});

test('a non-positive extrapolated weight is not a pole: the original denominator stays positive on [0, 1.5]', () => {
    const weights = [1, 2, 1, 1];
    for (let i = 0; i <= 1500; i++) {
        const s = 1.5 * i / 1500;
        const b = [(1 - s) ** 3, 3 * s * (1 - s) ** 2, 3 * s * s * (1 - s), s ** 3];
        expect(b.reduce((sum, value, index) => sum + value * weights[index], 0)).toBeGreaterThan(0);
    }
});
