import CircleGraph from './RationalBezierCurveCircleGraphN';
import {RationalBezierCurve} from '../../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';

interface Piece {points: number[][]; weights: number[]}

function graph() {
    const g = Object.create(CircleGraph.prototype) as any;
    g.jxgCurves = [] as Piece[];
    g.createRationalJSXBezierCurve = vi.fn((points: number[][], weights: number[]) => { g.jxgCurves.push({points, weights}); });
    g.boardUpdate = vi.fn();
    g.refreshWorkspace = vi.fn();
    g.board = {suspendUpdate: vi.fn(), unsuspendUpdate: vi.fn()};
    g.disposeFigureScene = vi.fn(() => { g.jxgCurves = []; });
    return g;
}

const pieces = (n: number): Piece[] => { const g = graph(); g.setN(n); return g.jxgCurves; };
const toCurve = (p: Piece) => new RationalBezierCurve(p.points.map(([x, y]) => new PointImpl(x, y)), p.weights);

test('circle-pieces action generates exactly the requested count without leftovers', () => {
    const g = graph();
    g.applyLessonAction({kind: 'circle-pieces', count: 5});
    expect(g.jxgCurves).toHaveLength(5);
    g.applyLessonAction({kind: 'circle-pieces', count: 3});
    expect(g.jxgCurves).toHaveLength(3);
    expect(g.disposeFigureScene).toHaveBeenCalledTimes(2);
});

test.each([2, 13, 3.5, NaN, Infinity, '4'])('rejects %p without mutation', count => {
    const g = graph();
    g.applyLessonAction({kind: 'circle-pieces', count: 4});
    const before = g.jxgCurves;
    expect(() => g.applyLessonAction({kind: 'circle-pieces', count})).toThrow();
    expect(g.jxgCurves).toBe(before);
    expect(g.jxgCurves).toHaveLength(4);
});

test('the UI setter keeps the count within 3 to 12', () => {
    const g = graph();
    g.setN(3);
    g.setN(2);
    expect(g.jxgCurves).toHaveLength(3);
    g.setN(12);
    g.setN(13);
    expect(g.jxgCurves).toHaveLength(12);
});

test('prepared default scene yields three pieces from a clean board', () => {
    const g = graph();
    g.jxgCurves = [{}, {}];
    g.importPresetData = vi.fn(() => { g.jxgCurves = []; });
    g.defaultPreset = () => [];
    g.graphSession = {isReady: true, isAlive: true};
    g.setState = vi.fn();
    g.prepareLessonDefaultScene();
    expect(g.jxgCurves).toHaveLength(3);
});

describe.each([3, 4, 5, 6, 7, 8])('circle with n = %i', n => {
    const ps = pieces(n);

    test('has n pieces and every evaluated point is at distance 3', () => {
        expect(ps).toHaveLength(n);
        ps.forEach(p => {
            const c = toCurve(p);
            for (let i = 0; i <= 100; i++) {
                const pt = c.eval(i / 100);
                expect(Math.abs(Math.hypot(pt.X(), pt.Y()) - 3)).toBeLessThan(1e-9);
            }
        });
    });

    test('neighbouring pieces share endpoints and end tangents are parallel', () => {
        for (let i = 0; i < n; i++) {
            const a = ps[i], b = ps[(i + 1) % n];
            expect(a.points[2][0]).toBeCloseTo(b.points[0][0], 9);
            expect(a.points[2][1]).toBeCloseTo(b.points[0][1], 9);
            const t1 = [a.points[2][0] - a.points[1][0], a.points[2][1] - a.points[1][1]];
            const t2 = [b.points[1][0] - b.points[0][0], b.points[1][1] - b.points[0][1]];
            expect(t1[0] * t2[1] - t1[1] * t2[0]).toBeCloseTo(0, 9);
            expect(t1[0] * t2[0] + t1[1] * t2[1]).toBeGreaterThan(0);
        }
    });

    test('middle weight is cos(pi/n) and the middle point lies at 3 / cos(pi/n)', () => {
        ps.forEach(p => {
            expect(p.weights[1]).toBeCloseTo(Math.cos(Math.PI / n), 12);
            expect(Math.hypot(p.points[1][0], p.points[1][1])).toBeCloseTo(3 / Math.cos(Math.PI / n), 9);
        });
    });
});

test('middle weights for n = 3, 4, 6', () => {
    expect(Math.cos(Math.PI / 3)).toBeCloseTo(0.5, 12);
    expect(Math.cos(Math.PI / 4)).toBeCloseTo(Math.SQRT2 / 2, 12);
    expect(Math.cos(Math.PI / 6)).toBeCloseTo(Math.sqrt(3) / 2, 12);
});

test('n = 2 is degenerate, which is why the minimum is 3', () => {
    const g = graph();
    g.generateCurves(2);
    expect(Math.hypot(g.jxgCurves[0].points[1][0], g.jxgCurves[0].points[1][1])).toBeGreaterThan(1e15);
});
