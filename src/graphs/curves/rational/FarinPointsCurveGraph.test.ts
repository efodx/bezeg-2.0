import FarinPointsCurveGraph from './FarinPointsCurveGraph';
import {RationalBezierCurve} from '../../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

const POINTS = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const curve = (weights: number[], points = POINTS) => new RationalBezierCurve(points.map(([x, y]) => new PointImpl(x, y)), weights);

function farinPoints(points: number[][], w: number[]) {
    return points.slice(0, -1).map((p, i) => [0, 1].map(d => (w[i] * p[d] + w[i + 1] * points[i + 1][d]) / (w[i] + w[i + 1])));
}

function fakeCurve(count = 4) {
    const fake: any = {
        farin: false, standard: false, weights: [1, 2, 1, 1], calls: [] as string[],
        getJxgPoints: () => new Array(count).fill({}),
        isShowingFarinPoints: () => fake.farin,
        showFarinPoints: vi.fn((v: boolean) => { fake.calls.push(`farin:${v}`); fake.farin = v; }),
        setStandardForm: vi.fn((v: boolean) => { fake.standard = v; }),
        inStandardForm: () => fake.standard,
        getCurve: () => ({
            setWeights: vi.fn((w: number[]) => { fake.calls.push('weights'); fake.weights = w; }),
            getEffectiveWeights: () => fake.weights,
        }),
    };
    return fake;
}

function graphWith(c: any) {
    const graph = Object.create(FarinPointsCurveGraph.prototype) as any;
    graph.jxgCurves = [c];
    graph.boardUpdate = vi.fn();
    graph.refreshWorkspace = vi.fn();
    graph.inputsDisabled = false;
    graph.getAllJxgPoints = () => [];
    return graph;
}

test('farin-points action toggles display and curve inputs, keeping control points draggable', () => {
    const c = fakeCurve();
    const graph = graphWith(c);
    const point = {setAttribute: vi.fn()};
    graph.getAllJxgPoints = () => [point];
    graph.applyLessonAction({kind: 'farin-points', visible: true});
    expect(c.farin).toBe(true);
    expect(graph.inputsDisabled).toBe(true);
    graph.applyLessonAction({kind: 'farin-points', visible: false});
    expect(graph.inputsDisabled).toBe(false);
    expect(point.setAttribute).not.toHaveBeenCalledWith({fixed: true});
});

test('standard-form action sets the form', () => {
    const c = fakeCurve();
    const graph = graphWith(c);
    graph.applyLessonAction({kind: 'standard-form', enabled: true});
    expect(c.standard).toBe(true);
});

test('rational-weights rebuilds Farin sliders around the change', () => {
    const c = fakeCurve();
    c.farin = true;
    const graph = graphWith(c);
    graph.applyLessonAction({kind: 'rational-weights', weights: [1, 3, 9, 27]});
    expect(c.weights).toEqual([1, 3, 9, 27]);
    expect(c.calls).toEqual(['farin:false', 'weights', 'farin:true']);
    expect(graph.refreshWorkspace).toHaveBeenCalled();
});

test.each([
    [[1, 2, 3]], [[1, 2, 3, 4, 5]], [[1, 0, 1, 1]], [[1, -1, 1, 1]], [[1, NaN, 1, 1]], [[1, Infinity, 1, 1]],
])('rejects weights %p without mutation', weights => {
    const c = fakeCurve();
    const graph = graphWith(c);
    expect(() => graph.applyLessonAction({kind: 'rational-weights', weights})).toThrow();
    expect(c.weights).toEqual([1, 2, 1, 1]);
    expect(c.calls).toEqual([]);
});

test('Farin points of the default curve divide the legs in the ratio w(i+1):w(i)', () => {
    const w = [1, 2, 1, 1];
    const f = farinPoints(POINTS, w);
    f.forEach((point, i) => {
        const dToStart = Math.hypot(point[0] - POINTS[i][0], point[1] - POINTS[i][1]);
        const dToEnd = Math.hypot(point[0] - POINTS[i + 1][0], point[1] - POINTS[i + 1][1]);
        expect(dToStart / dToEnd).toBeCloseTo(w[i + 1] / w[i], 9);
    });
    expect(f.map(p => p.map(v => +v.toFixed(4)))).toEqual([[-3.3333, 1], [-1, 3], [3.5, 0]]);
});

test('weights are recovered recursively from Farin points with w0 = 1', () => {
    const w = [1, 2, 1, 1];
    const f = farinPoints(POINTS, w);
    const recovered = [1];
    f.forEach((point, i) => {
        const dToStart = Math.hypot(point[0] - POINTS[i][0], point[1] - POINTS[i][1]);
        const dToEnd = Math.hypot(point[0] - POINTS[i + 1][0], point[1] - POINTS[i + 1][1]);
        recovered.push(recovered[i] * dToStart / dToEnd);
    });
    recovered.forEach((value, i) => expect(value).toBeCloseTo(w[i], 9));
});

describe('standard form', () => {
    const standardized = (w: number[]) => { const c = curve(w); c.setStandardForm(true); return c.getWeights(); };

    test('1, 3, 9, 27 standardizes to 1, 1, 1, 1', () => {
        standardized([1, 3, 9, 27]).forEach(value => expect(value).toBeCloseTo(1, 9));
    });

    test('formula w_i / w_n^(i/n) for w0 = 1', () => {
        const w = [1, 2, 5, 4];
        standardized(w).forEach((value, i) => expect(value).toBeCloseTo(w[i] / Math.pow(w[3], i / 3), 9));
    });

    test('default weights are already standard: w0 = w3 = 1', () => {
        const values = standardized([1, 2, 1, 1]);
        values.forEach((value, i) => expect(value).toBeCloseTo([1, 2, 1, 1][i], 9));
    });

    test('standardization only reparameterizes: phi(t) = rho t / (1 - t + rho t)', () => {
        const w = [1, 3, 9, 27];
        const original = curve(w);
        const reduced = curve(standardized(w));
        const rho = Math.pow(w[3] / w[0], 1 / 3);
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const a = original.eval(t);
            const b = reduced.eval(rho * t / (1 - t + rho * t));
            expect(a.X()).toBeCloseTo(b.X(), 9);
            expect(a.Y()).toBeCloseTo(b.Y(), 9);
        }
    });

    test('every sampled point of the original lies on the standardized curve (non-trivial weights)', () => {
        const w = [1, 2, 5, 4];
        const original = curve(w);
        const reduced = curve(standardized(w));
        const dist = (u: number, p: {X(): number; Y(): number}) => Math.hypot(reduced.eval(u).X() - p.X(), reduced.eval(u).Y() - p.Y());
        const dense = Array.from({length: 2001}, (_, i) => i / 2000);
        for (let i = 0; i <= 20; i++) {
            const p = original.eval(i / 20);
            const best = dense.reduce((b, u) => dist(u, p) < dist(b, p) ? u : b, 0);
            let lo = Math.max(0, best - 1 / 2000), hi = Math.min(1, best + 1 / 2000);
            for (let it = 0; it < 80; it++) {
                const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
                if (dist(m1, p) < dist(m2, p)) hi = m2; else lo = m1;
            }
            expect(dist((lo + hi) / 2, p)).toBeLessThan(1e-9);
        }
    });
});
