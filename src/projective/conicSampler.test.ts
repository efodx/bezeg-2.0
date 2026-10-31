import {describe, expect, it} from 'vitest';
import {classify, conic, type Conic} from './conic';
import {DEFAULT_SAMPLE_DENSITY, sampleConic, type Pt, type SamplerView} from './conicSampler';

const VIEW: SamplerView = {xMin: -10, xMax: 10, yMin: -8, yMax: 8};
const TOL = 1e-9;

/** Relative residual: |f| over the sum of the absolute values of the six terms. */
function residual(c: Conic, p: Pt): number {
    const k = c.map(Number);
    const terms = [k[0] * p.x * p.x, k[1] * p.x * p.y, k[2] * p.y * p.y, k[3] * p.x, k[4] * p.y, k[5]];
    const sum = terms.reduce((s, t) => s + Math.abs(t), 0);
    return Math.abs(terms.reduce((s, t) => s + t, 0)) / sum;
}

function allPoints(s: ReturnType<typeof sampleConic>): Pt[] {
    return s.pieces.flatMap((p) => [...p.points]);
}

function expectInView(pts: Pt[], v: SamplerView = VIEW) {
    for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(v.xMin - TOL);
        expect(p.x).toBeLessThanOrEqual(v.xMax + TOL);
        expect(p.y).toBeGreaterThanOrEqual(v.yMin - TOL);
        expect(p.y).toBeLessThanOrEqual(v.yMax + TOL);
    }
}

const NAMED: [string, Conic, string][] = [
    ['K2/K3 default ellipse 9x^2+25y^2=225', conic(9, 0, 25, 0, 0, -225), 'ellipse'],
    ['K3 circle x^2+y^2=25', conic(1, 0, 1, 0, 0, -25), 'circle'],
    ['K3 parabola x^2=4y', conic(1, 0, 0, 0, -4, 0), 'parabola'],
    ['K3 hyperbola 9x^2-16y^2=144', conic(9, 0, -16, 0, 0, -144), 'hyperbola'],
    ['K5 c=2', conic(1, 0, 3, 0, 4, 1), 'ellipse'],
    ['K5 c=1', conic(1, 0, 0, 0, 2, 1), 'parabola'],
    ['K5 c=0', conic(1, 0, -1, 0, 0, 1), 'hyperbola'],
    ['K5 c=1/2 scaled', conic(4, 0, -3, 0, 4, 4), 'hyperbola'],
    ['rotated ellipse x^2+xy+y^2=3 (no rational point)', conic(1, 1, 1, 0, 0, -3), 'ellipse'],
    ['circle x^2+y^2=3 (no rational point)', conic(1, 0, 1, 0, 0, -3), 'circle'],
    ['shifted xy=1: (x+2)(y-1)=1', conic(0, 1, 0, -1, 2, -3), 'hyperbola'],
    ['rotated parabola (x+y)^2=x-y', conic(1, 2, 1, -1, 1, 0), 'parabola'],
    ['translated ellipse', conic(9, 0, 25, -18, 50, -191), 'ellipse'],
];

describe('sampleConic: samples lie on the conic and in the view', () => {
    for (const [name, c, type] of NAMED) {
        it(`${name}: type ${type}, residual <= 1e-12, inside the view`, () => {
            expect(classify(c)).toBe(type);
            const s = sampleConic(c, VIEW);
            const pts = allPoints(s);
            expect(pts.length).toBeGreaterThan(50);
            for (const p of pts) expect(residual(c, p)).toBeLessThanOrEqual(1e-12);
            expectInView(pts);
        });
    }
});

describe('sampleConic: curve topology', () => {
    it('an ellipse in the view is one closed piece with first == last', () => {
        for (const c of [conic(9, 0, 25, 0, 0, -225), conic(1, 1, 1, 0, 0, -3), conic(1, 0, 3, 0, 4, 1)]) {
            const s = sampleConic(c, VIEW);
            expect(s.pieces).toHaveLength(1);
            const [piece] = s.pieces;
            expect(piece.closed).toBe(true);
            expect(piece.points[0]).toEqual(piece.points[piece.points.length - 1]);
            expect(piece.points).toHaveLength(DEFAULT_SAMPLE_DENSITY + 1);
        }
    });

    it('an ellipse cut by the view is open pieces that all lie in the view and cover both sides', () => {
        const c = conic(9, 0, 25, 0, 0, -225); // x in [-5,5], y in [-3,3]
        const v: SamplerView = {xMin: -2, xMax: 2, yMin: -10, yMax: 10};
        const s = sampleConic(c, v);
        expect(s.pieces).toHaveLength(2);
        expect(s.pieces.every((p) => !p.closed)).toBe(true);
        // one piece above (y > 0), one below
        const signs = s.pieces.map((p) => Math.sign(p.points[Math.floor(p.points.length / 2)].y)).sort();
        expect(signs).toEqual([-1, 1]);
        expectInView(allPoints(s), v);
        for (const p of s.pieces) {
            // endpoints sit on the boundary x = +-2
            for (const e of [p.points[0], p.points[p.points.length - 1]]) expect(Math.abs(Math.abs(e.x) - 2)).toBeLessThan(1e-9);
        }
    });

    it('a view containing the whole curve except one arc keeps one piece (no break at the start)', () => {
        const c = conic(9, 0, 25, 0, 0, -225);
        const s = sampleConic(c, {xMin: -10, xMax: 4, yMin: -10, yMax: 10});
        expect(s.pieces).toHaveLength(1);
        expect(s.pieces[0].closed).toBe(false);
    });

    it('a hyperbola with both branches in the view gives exactly two branches, never joined', () => {
        for (const c of [conic(1, 0, -1, 0, 0, 1), conic(4, 0, -3, 0, 4, 4), conic(9, 0, -16, 0, 0, -144)]) {
            const v: SamplerView = {xMin: -20, xMax: 20, yMin: -20, yMax: 20};
            const s = sampleConic(c, v);
            expect(s.pieces).toHaveLength(2);
            // A chord inside one branch has its midpoint on the convex side of f, whose sign is opposite to f at the
            // centre (the region between the branches). A chord joining the branches would have the centre's sign.
            const k = c.map(Number);
            const val = (x: number, y: number) => k[0] * x * x + k[1] * x * y + k[2] * y * y + k[3] * x + k[4] * y + k[5];
            const det = 4 * k[0] * k[2] - k[1] * k[1];
            const cs = Math.sign(val((k[1] * k[4] - 2 * k[2] * k[3]) / det, (k[1] * k[3] - 2 * k[0] * k[4]) / det));
            for (const piece of s.pieces) {
                for (let i = 1; i < piece.points.length; i++) {
                    const m = val(
                        (piece.points[i].x + piece.points[i - 1].x) / 2,
                        (piece.points[i].y + piece.points[i - 1].y) / 2,
                    );
                    expect(Math.sign(m)).toBe(-cs);
                }
            }
        }
    });

    it('xy=1 shifted: two branches on opposite sides of the centre', () => {
        const c = conic(0, 1, 0, -1, 2, -3); // (x+2)(y-1)=1, centre (-2,1)
        const s = sampleConic(c, {xMin: -20, xMax: 20, yMin: -20, yMax: 20});
        expect(s.pieces).toHaveLength(2);
        const sides = s.pieces.map((p) => Math.sign(p.points[0].x + 2)).sort();
        expect(sides).toEqual([-1, 1]);
        for (const p of s.pieces) expect(new Set(p.points.map((q) => Math.sign(q.x + 2))).size).toBe(1);
    });

    it('a parabola in the view is one open piece', () => {
        for (const c of [conic(1, 0, 0, 0, -4, 0), conic(1, 0, 0, 0, 2, 1), conic(1, 2, 1, -1, 1, 0)]) {
            const s = sampleConic(c, VIEW);
            expect(s.pieces).toHaveLength(1);
            expect(s.pieces[0].closed).toBe(false);
        }
    });

    it('a hyperbola branch leaving and re-entering the view becomes separate pieces', () => {
        const c = conic(1, 0, -1, 0, 0, 1); // y = +-sqrt(x^2+1)
        // view window cuts the upper branch into nothing at x in [-1,1] by removing y > 0.5
        const v: SamplerView = {xMin: -3, xMax: 3, yMin: -10, yMax: 1.2};
        const s = sampleConic(c, v);
        // lower branch is entirely clipped by y >= -10 -> but |y|>=1 so lower branch passes; upper branch has y>=1 <=1.2 -> x in [-0.66,0.66]
        expect(s.pieces).toHaveLength(2);
        expectInView(allPoints(s), v);
    });

    it('density is a parameter', () => {
        const c = conic(9, 0, 25, 0, 0, -225);
        expect(sampleConic(c, VIEW, 50).pieces[0].points).toHaveLength(51);
        expect(() => sampleConic(c, VIEW, 1)).toThrow(RangeError);
    });
});

describe('sampleConic: repairs from review', () => {
    const small: SamplerView = {xMin: -10, xMax: 10, yMin: -10, yMax: 10};

    it('finds a branch whose far samples are all outside the view (R = 1000)', () => {
        // (y-R)^2 - x^2 = R^2 - 1, centre (0, 1000); the lower branch y ~ -x^2/2000 crosses the view.
        const c = conic(-1, 0, 1, 0, -2000, 1000000 - (1000000 - 1));
        expect(classify(c)).toBe('hyperbola');
        const s = sampleConic(c, small);
        expect(s.status).toBe('ok');
        expect(s.pieces.length).toBeGreaterThanOrEqual(1);
        const pts = allPoints(s);
        for (const p of pts) expect(residual(c, p)).toBeLessThanOrEqual(1e-12);
        expectInView(pts, small);
        // the branch passes through the origin region: some sample is near x = 0
        expect(Math.min(...pts.map((p) => Math.abs(p.x)))).toBeLessThan(0.5);
    });

    it('always finds a base point: very narrow hyperbola, rotated narrow hyperbola, far parabola', () => {
        const narrow = conic(1000000, 0, -1, 0, 0, -1);
        const rotated = conic(999999, 2000002, 999999, 0, 0, -1); // 1e6 (x+y)^2 - (x-y)^2 = 1
        for (const c of [narrow, rotated]) {
            expect(classify(c)).toBe('hyperbola');
            const s = sampleConic(c, small);
            expect(s.status).toBe('ok');
            expect(s.pieces).toHaveLength(2);
            for (const p of allPoints(s)) expect(residual(c, p)).toBeLessThanOrEqual(1e-12);
        }
        const far = conic(0, 0, 1, -4, -1000, 252000); // (y-500)^2 = 4(x-500)
        expect(classify(far)).toBe('parabola');
        const v: SamplerView = {xMin: 490, xMax: 520, yMin: 490, yMax: 520};
        const s = sampleConic(far, v);
        expect(s.status).toBe('ok');
        expect(s.pieces).toHaveLength(1);
        for (const p of allPoints(s)) expect(residual(far, p)).toBeLessThanOrEqual(1e-12);
        expectInView(allPoints(s), v);
    });

    it('branches are never joined, even with a view huge relative to the conic (view +-1e6)', () => {
        const huge: SamplerView = {xMin: -1e6, xMax: 1e6, yMin: -1e6, yMax: 1e6};
        // (conic, density, linear form that is positive on one branch and negative on the other)
        const cases: [Conic, number, (p: Pt) => number][] = [
            [conic(0, 1, 0, 0, 0, -1), 721, (p) => p.x],
            [conic(0, 1, 0, 0, 0, -1), 720, (p) => p.x],
            [conic(1, 1, -6, 0, 0, -1), 721, (p) => p.x - 2 * p.y], // (x-2y)(x+3y) = 1
            [conic(1, 1, -6, 0, 0, -1), 333, (p) => p.x - 2 * p.y],
        ];
        for (const [c, density, form] of cases) {
            const s = sampleConic(c, huge, density);
            expect(s.pieces).toHaveLength(2);
            for (const piece of s.pieces) {
                expect(new Set(piece.points.map((p) => Math.sign(form(p)))).size).toBe(1);
                for (const p of piece.points) expect(residual(c, p)).toBeLessThanOrEqual(1e-12);
            }
        }
    });

    it('far, large-coefficient conic keeps the 1e-12 residual', () => {
        const c = conic(3, 1, 2, -7000, -5000, 5000000);
        const kind = classify(c);
        expect(['ellipse', 'circle']).toContain(kind);
        const s = sampleConic(c, {xMin: 0, xMax: 2500, yMin: 0, yMax: 2500});
        expect(s.pieces.length).toBeGreaterThan(0);
        for (const p of allPoints(s)) expect(residual(c, p)).toBeLessThanOrEqual(1e-12);
    });
});

describe('sampleConic: degenerate conics', () => {
    const onBoundary = (p: Pt, v: SamplerView) =>
        Math.min(Math.abs(p.x - v.xMin), Math.abs(p.x - v.xMax), Math.abs(p.y - v.yMin), Math.abs(p.y - v.yMax)) < 1e-9;

    it('a line pair x^2 = y^2 gives two segments whose ends are on the view boundary and on the lines', () => {
        const c = conic(1, 0, -1, 0, 0, 0);
        const s = sampleConic(c, VIEW);
        expect(s.type).toBe('line-pair');
        expect(s.pieces).toHaveLength(2);
        for (const p of s.pieces) {
            expect(p.points).toHaveLength(2);
            for (const e of p.points) {
                expect(onBoundary(e, VIEW)).toBe(true);
                expect(Math.abs(Math.abs(e.x) - Math.abs(e.y))).toBeLessThan(1e-9);
            }
        }
    });

    it('a skew line pair (x-1)(x+y-2)=0 through (1,1)', () => {
        const c = conic(1, 1, 0, -3, -1, 2); // x^2+xy-3x-y+2... verify below via residual
        expect(classify(c)).toBe('line-pair');
        const s = sampleConic(c, VIEW);
        expect(s.pieces).toHaveLength(2);
        for (const p of s.pieces) {
            for (const e of p.points) {
                expect(onBoundary(e, VIEW)).toBe(true);
                expect(Math.abs(residual(c, e))).toBeLessThan(1e-9);
            }
        }
    });

    it('w(Dx+Ey+Fw): only the finite line is drawn', () => {
        const c = conic(0, 0, 0, 1, 1, -2); // x + y = 2 plus the line at infinity
        const s = sampleConic(c, VIEW);
        expect(s.type).toBe('line-pair');
        expect(s.pieces).toHaveLength(1);
        for (const e of s.pieces[0].points) {
            expect(onBoundary(e, VIEW)).toBe(true);
            expect(Math.abs(e.x + e.y - 2)).toBeLessThan(1e-9);
        }
    });

    it('parallel lines x^2 = 4 give two vertical segments x = +-2; tilted parallel lines', () => {
        const s = sampleConic(conic(1, 0, 0, 0, 0, -4), VIEW);
        expect(s.type).toBe('parallel-lines');
        expect(s.pieces.map((p) => Math.round(p.points[0].x)).sort()).toEqual([-2, 2]);
        for (const p of s.pieces) {
            expect(p.points[0].x).toBeCloseTo(p.points[1].x, 12);
            expect(onBoundary(p.points[0], VIEW)).toBe(true);
            expect(onBoundary(p.points[1], VIEW)).toBe(true);
        }
        const t = conic(1, 2, 1, 0, 0, -9); // (x+y)^2 = 9
        const st = sampleConic(t, VIEW);
        expect(st.type).toBe('parallel-lines');
        expect(st.pieces).toHaveLength(2);
        for (const p of st.pieces) for (const e of p.points) expect(Math.abs(Math.abs(e.x + e.y) - 3)).toBeLessThan(1e-9);
    });

    it('a double line gives one segment', () => {
        const s = sampleConic(conic(1, 0, 0, -2, 0, 1), VIEW); // (x-1)^2
        expect(s.type).toBe('double-line');
        expect(s.pieces).toHaveLength(1);
        for (const e of s.pieces[0].points) expect(e.x).toBeCloseTo(1, 12);
        const d = sampleConic(conic(0, 0, 4, 0, 4, 1), VIEW); // (2y+1)^2
        expect(d.pieces).toHaveLength(1);
        for (const e of d.pieces[0].points) expect(e.y).toBeCloseTo(-0.5, 12);
    });

    it('line segments miss a view that does not contain the line', () => {
        expect(sampleConic(conic(1, 0, 0, 0, 0, -400), VIEW).pieces).toHaveLength(0);
    });

    it('a point conic gives a marker and no pieces', () => {
        const s = sampleConic(conic(1, 0, 1, -2, -4, 5), VIEW); // (x-1)^2+(y-2)^2 = 0
        expect(s.type).toBe('point');
        expect(s.status).toBe('point');
        expect(s.pieces).toHaveLength(0);
        expect(s.markers).toHaveLength(1);
        expect(s.markers[0].x).toBeCloseTo(1, 12);
        expect(s.markers[0].y).toBeCloseTo(2, 12);
    });

    it('an empty conic gives no pieces and the typed status', () => {
        for (const c of [conic(1, 0, 1, 0, 0, 1), conic(1, 0, 0, 0, 0, 1), conic(0, 0, 0, 0, 0, 1)]) {
            const s = sampleConic(c, VIEW);
            expect(s.status).toBe('empty');
            expect(s.pieces).toHaveLength(0);
            expect(s.markers).toHaveLength(0);
        }
        expect(sampleConic(conic(1, 0, 1, 0, 0, 1), VIEW).type).toBe('empty');
    });
});
