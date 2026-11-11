import {Rational} from '../../compgeo/rational';
import {CATALOGUE} from '../../levelsets/functions2';
import {
    GRID_N, SURFACE_N, arrowScale, buildSurfaceScene, circleParamNear, circleTangentCount, circleTangentParams, constraintPoly, descentInfo,
    firstOutsideDrawing, gradientAt, lagrangeInfo, levelDrawings, levelValues, numericGradient, pathPoly, rationalText, snapGrid, surfaceMesh,
    totalLength, typedGrid, zScaleFor,
} from './contourScene';

const LEVEL = {min: -360, max: 360};

describe('typedGrid and snapGrid', () => {
    it('typedGrid keeps only values on the grid inside the range, never rounding', () => {
        expect(typedGrid(0.5, 8, LEVEL)).toBe(4);
        expect(typedGrid(-0.375, 8, LEVEL)).toBe(-3);
        expect(typedGrid(0.3, 8, LEVEL)).toBeUndefined(); // 2,4 is off the grid
        expect(typedGrid(46, 8, LEVEL)).toBeUndefined(); // 368 is out of range
        expect(typedGrid(45, 8, LEVEL)).toBe(360);
        expect(typedGrid(Number.NaN, 8, LEVEL)).toBeUndefined();
        expect(typedGrid(Number.POSITIVE_INFINITY, 8, LEVEL)).toBeUndefined();
        expect(Object.is(typedGrid(-0, 8, LEVEL), 0)).toBe(true);
    });

    it('snapGrid takes the nearest grid integer and clamps to the range', () => {
        expect(snapGrid(0.31, 8, LEVEL)).toBe(2);
        expect(snapGrid(0.32, 8, LEVEL)).toBe(3);
        expect(snapGrid(100, 8, LEVEL)).toBe(360);
        expect(snapGrid(-100, 8, LEVEL)).toBe(-360);
        expect(snapGrid(Number.NaN, 8, LEVEL)).toBeUndefined();
        expect(Object.is(snapGrid(-0.01, 8, LEVEL), 0)).toBe(true);
    });
});

describe('levels and contours', () => {
    it('levelValues goes c, c + d, ... with d = 1 (hills 1/8)', () => {
        expect(levelValues(1, 3, 'bowl')).toEqual([1, 2, 3]);
        expect(levelValues(0.25, 3, 'hills')).toEqual([0.25, 0.375, 0.5]);
        expect(levelValues(-1, 1, 'saddle')).toEqual([-1]);
    });

    it('levelDrawings draws the chosen level first; the bowl contour c = 1 has length near 2 pi', () => {
        const window = CATALOGUE.bowl.window;
        const drawings = levelDrawings('bowl', window, 1, 2);
        expect(drawings.map(d => d.c)).toEqual([1, 2]);
        expect(totalLength(drawings.slice(0, 1))).toBeGreaterThan(6.2);
        expect(totalLength(drawings.slice(0, 1))).toBeLessThan(6.29);
        expect(drawings[1].segments.length).toBeGreaterThan(0);
        expect(levelDrawings('bowl', window, -1, 1)[0].segments).toEqual([]); // no point has f = -1
        expect(GRID_N).toBe(60);
    });
});

describe('gradient', () => {
    it('bowl at (0,6; 0,8): gradient (1,2; 1,6), norm 2, unit tangent (-0,8; 0,6), dot near 0', () => {
        const info = gradientAt('bowl', 0.6, 0.8);
        expect(info.gradient[0]).toBeCloseTo(1.2, 12);
        expect(info.gradient[1]).toBeCloseTo(1.6, 12);
        expect(info.norm).toBeCloseTo(2, 12);
        expect(info.tangent?.[0]).toBeCloseTo(-0.8, 12);
        expect(info.tangent?.[1]).toBeCloseTo(0.6, 12);
        expect(Math.abs(info.dot ?? 1)).toBeLessThan(1e-12);
        expect(info.stationary).toBe(false);
    });

    it('is stationary exactly when both components are exactly 0, and then invents no direction', () => {
        for (const fn of ['bowl', 'saddle', 'product', 'valley'] as const) {
            const info = gradientAt(fn, 0, 0);
            expect(info.stationary, fn).toBe(true);
            expect(info.tangent, fn).toBeNull();
            expect(info.dot, fn).toBeNull();
            expect(info.norm, fn).toBe(0);
        }
        expect(gradientAt('bowl', 0.05, 0).stationary).toBe(false);
        expect(gradientAt('hills', 0, 0).stationary).toBe(true); // d/dx = cos 0 sin 0 = 0 and d/dy = 0
    });

    it('the central difference at h = 0,01 errs by about 7,6e-6 for hills at (1, 1) and is exact for the bowl', () => {
        const hills = numericGradient('hills', 1, 1);
        expect(hills.estimate[0] - CATALOGUE.hills.gradient(1, 1)[0]).toBeLessThan(0); // sin''' = -cos: the estimate is low
        expect(hills.error).toBeGreaterThan(7.5e-6);
        expect(hills.error).toBeLessThan(7.7e-6);
        expect(numericGradient('bowl', 0.6, 0.8).error).toBeLessThan(1e-12);
        expect(numericGradient('hills', 1, 1, 0.1).error).toBeGreaterThan(100 * hills.error * 0.9); // h^2 scaling: 100 times larger at h = 0,1
    });

    it('arrowScale shrinks only vectors longer than the fraction of the half-width', () => {
        expect(arrowScale(2, [0.5, 0.8])).toBe(1);
        expect(arrowScale(2, [4])).toBeCloseTo(0.2, 12);
        expect(arrowScale(2, [])).toBe(1);
    });
});

describe('descent', () => {
    const valley = (S: readonly [number, number], H: number) => descentInfo({fn: 'valley', start: S, step: H});

    it('valley from (2, 1): converges below 1e-6 after 123, 73, 40 steps for H = 3, 5, 9', () => {
        expect(valley([8, 4], 3).settledAt).toBe(123);
        expect(valley([8, 4], 5).settledAt).toBe(73);
        expect(valley([8, 4], 9).settledAt).toBe(40);
        expect(valley([8, 4], 3).behaviour).toBe('converges');
    });

    it('the valley rule is exact: H <= 9 or y0 = 0 converges, H = 10 oscillates, H > 10 diverges', () => {
        expect(valley([8, 4], 9).behaviour).toBe('converges');
        expect(valley([8, 4], 10).behaviour).toBe('oscillates');
        expect(valley([8, 4], 11).behaviour).toBe('diverges');
        expect(valley([8, 4], 30).behaviour).toBe('diverges');
        expect(valley([8, 0], 30).behaviour).toBe('converges');
        expect(valley([8, 0], 10).behaviour).toBe('converges');
        expect(valley([8, 4], 10).settledAt).toBeNull();
        expect(descentInfo({fn: 'bowl', start: [8, 4], step: 3}).behaviour).toBeUndefined(); // no convergence claim
    });

    it('the path is cut before the first point beyond four half-widths', () => {
        const diverging = valley([8, 4], 11);
        const outside = firstOutsideDrawing(diverging, 2);
        expect(outside).not.toBeNull();
        expect(pathPoly(diverging, 200, 2).x).toHaveLength(outside as number);
        const calm = valley([8, 4], 3);
        expect(firstOutsideDrawing(calm, 2)).toBeNull();
        expect(pathPoly(calm, 3, 2).x).toHaveLength(4);
        expect(pathPoly(calm, 3, 2).x[0]).toBe(2);
        expect(pathPoly(calm, 3, 2).y[0]).toBe(1);
    });
});

describe('constrained point', () => {
    it('the line at x = 1 meets the bowl contour tangentially at (1, 2) with lambda 2, exactly', () => {
        const info = lagrangeInfo({fn: 'bowl', constraint: 'line', lineParam: 4, circleParam: 0});
        expect(info.exact?.x.equals(Rational.of(1))).toBe(true);
        expect(info.exact?.y.equals(Rational.of(2))).toBe(true);
        expect([info.x, info.y]).toEqual([1, 2]);
        expect(info.f).toBe(5);
        expect(info.gradF).toEqual([2, 4]);
        expect(info.gradG).toEqual([1, 2]);
        if (info.tangency.kind !== 'exact') throw new Error('line is exact');
        expect(info.tangency.tangency.tangent).toBe(true);
        expect(info.tangency.tangency.lambda?.equals(Rational.of(2))).toBe(true);
        expect(info.tangency.points.kind).toBe('point');
    });

    it('a neighbouring point of the line is not tangent and has no lambda', () => {
        const info = lagrangeInfo({fn: 'bowl', constraint: 'line', lineParam: 8, circleParam: 0});
        if (info.tangency.kind !== 'exact') throw new Error('line is exact');
        expect(info.tangency.tangency.tangent).toBe(false);
        expect(info.tangency.tangency.lambda).toBeNull();
        expect([info.x, info.y]).toEqual([2, 1.5]);
    });

    it('the circle is approximate: product is tangent at K = 6, 18, 30, 42 only; the bowl everywhere; the saddle at 4 points', () => {
        expect(circleTangentParams('product')).toEqual([6, 18, 30, 42]);
        expect(circleTangentCount('product')).toBe(4);
        expect(circleTangentCount('bowl')).toBe(48);
        expect(circleTangentParams('saddle')).toEqual([0, 12, 24, 36]);
        const at = (K: number) => lagrangeInfo({fn: 'product', constraint: 'circle', lineParam: 0, circleParam: K});
        expect(at(6).tangency.kind).toBe('approximate');
        expect(at(6).exact).toBeUndefined();
        expect(at(6).x).toBeCloseTo(1, 12);
        expect(at(6).y).toBeCloseTo(1, 12);
        const east = at(0).tangency;
        expect(east.kind === 'approximate' && east.tangency.status).toBe('not-tangent');
    });

    it('circleParamNear gives the nearest of 48 steps, wrapping at the end', () => {
        expect(circleParamNear(1, 1, 48)).toBe(6);
        expect(circleParamNear(-1, 1, 48)).toBe(18);
        expect(circleParamNear(1.4142, -0.0001, 48)).toBe(0);
        expect(circleParamNear(0, 0, 48)).toBeUndefined();
        expect(circleParamNear(Number.NaN, 1, 48)).toBeUndefined();
    });

    it('draws the line cut at the window and the closed circle', () => {
        const line = constraintPoly('line');
        expect(line.x).toEqual([-4, 4]);
        expect(line.y).toEqual([4.5, 0.5]);
        const circle = constraintPoly('circle');
        expect(circle.x[0]).toBeCloseTo(circle.x[circle.x.length - 1], 12);
        expect(circle.y[0]).toBeCloseTo(circle.y[circle.y.length - 1], 12);
        for (let i = 0; i < circle.x.length; i++) expect(Math.hypot(circle.x[i], circle.y[i])).toBeCloseTo(Math.SQRT2, 12);
    });

    it('rationalText uses a true minus', () => {
        expect(rationalText(Rational.of(-1, 2))).toBe('−1/2');
        expect(rationalText(Rational.of(4, 2))).toBe('2');
        expect(rationalText(Rational.of(-3))).toBe('−3');
    });
});

describe('surface', () => {
    it('the mesh has (N + 1)^2 finite vertices and 2 N^2 triangles forming a watertight sheet', () => {
        const {mesh, owners} = surfaceMesh('hills', CATALOGUE.hills.window);
        const vertices = (SURFACE_N + 1) ** 2;
        expect(mesh.positions).toHaveLength(3 * vertices);
        expect(mesh.positions.every(Number.isFinite)).toBe(true);
        expect(mesh.faces).toHaveLength(3 * 2 * SURFACE_N ** 2);
        expect(mesh.faces.every(index => Number.isInteger(index) && index >= 0 && index < vertices)).toBe(true);
        const edges = new Map<string, number>();
        for (let f = 0; f < mesh.faces.length; f += 3) {
            for (let k = 0; k < 3; k++) {
                const a = mesh.faces[f + k], b = mesh.faces[f + (k + 1) % 3];
                const key = a < b ? `${a}-${b}` : `${b}-${a}`;
                edges.set(key, (edges.get(key) ?? 0) + 1);
            }
        }
        const counts = [...edges.values()];
        expect(counts.filter(count => count === 1)).toHaveLength(4 * SURFACE_N); // the border only
        expect(counts.every(count => count === 1 || count === 2)).toBe(true);
        expect(owners).toEqual([{id: 'function-surface', kind: 'function', faceStart: 0, faceCount: 2 * SURFACE_N ** 2}]);
    });

    it('zScale is the largest power of two that keeps the surface within the window half-width', () => {
        for (const fn of ['bowl', 'saddle', 'valley', 'hills', 'product'] as const) {
            const window = CATALOGUE[fn].window;
            const zScale = zScaleFor(fn, window);
            expect(Number.isInteger(Math.log2(zScale)), fn).toBe(true);
            const {mesh} = surfaceMesh(fn, window);
            const top = Math.max(...mesh.positions.filter((_, i) => i % 3 === 2).map(Math.abs));
            expect(top, fn).toBeLessThanOrEqual(window.xMax);
            expect(top * 2, fn).toBeGreaterThan(window.xMax);
        }
        expect(zScaleFor('bowl', CATALOGUE.bowl.window)).toBe(0.25);
    });

    it('buildSurfaceScene lifts the chosen contour to z = c * zScale, marks the point and names the function owner', () => {
        const window = CATALOGUE.bowl.window;
        const data = surfaceMesh('bowl', window);
        const camera = {az: 1, el: 0.5, distance: 9, projection: 'perspective' as const, target: [0, 0, 0] as [number, number, number]};
        const contour = levelDrawings('bowl', window, 1, 1)[0].segments;
        const scene = buildSurfaceScene({data, camera, contour, level: 1, marker: {x: 0.6, y: 0.8, f: 1}}, 7);
        expect(scene.revision).toBe(7);
        expect(scene.meshOwners?.map(owner => owner.kind)).toEqual(['function']);
        expect(scene.polylines).toHaveLength(contour.length);
        expect(scene.polylines.every(line => line.points.every(point => point[2] === data.zScale))).toBe(true);
        expect(scene.markers).toEqual([{id: 'point', role: 'evaluated', xyz: [0.6, 0.8, data.zScale]}]);
        expect(buildSurfaceScene({data, camera, contour: [], level: 1, marker: undefined}, 8).markers).toEqual([]);
    });
});
