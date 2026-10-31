import {
    arcLength, clampParameter, curveViewBox, enclosedArea, PARAMETRIC_CATALOGUE, PARAMETRIC_CURVE_IDS, polarRadius, sourceOf, velocityAt,
} from "./parametricCatalogue";
import {curvatureAt} from "../../../bezeg/impl/curve/curvature";
import {DEFAULT_PARAMETRIC_PRESET, parametricPresetCollection} from "./parametricPresetCollection";

const cycloid = (radius = 1) => ({curve: 'cycloid' as const, radius});
const polar = (curve: 'cardioid' | 'rose' | 'spiral') => ({curve, radius: 1});

describe('cycloid closed forms (spec L1)', () => {
    test('r = 1: arch length 8 and area 3 pi to 1e-6', () => {
        expect(Math.abs(arcLength(cycloid()) - 8)).toBeLessThan(1e-6);
        expect(Math.abs(enclosedArea(cycloid()) - 3 * Math.PI)).toBeLessThan(1e-6);
    });

    test.each([0.25, 0.5, 2.5, 3])('radius %s: length scales as r and area as r^2', radius => {
        expect(Math.abs(arcLength(cycloid(radius)) - 8 * radius)).toBeLessThan(1e-6 * radius);
        expect(Math.abs(enclosedArea(cycloid(radius)) - 3 * Math.PI * radius * radius)).toBeLessThan(1e-6 * radius * radius);
    });

    test('length up to t is 4r (1 - cos(t/2))', () => {
        for (const t of [0.5, 2, Math.PI, 5]) {
            expect(Math.abs(arcLength(cycloid(1.5), t) - 4 * 1.5 * (1 - Math.cos(t / 2)))).toBeLessThan(1e-6);
        }
        expect(arcLength(cycloid(), 0)).toBe(0);
    });
});

describe('polar closed forms', () => {
    test('cardioid rho = 1 + cos theta: rho(0) = 2, kappa(0) = 3/4 from the kernel, length 8, area 3 pi / 2', () => {
        const source = sourceOf(polar('cardioid'));
        const {point, d1, d2} = source.at(0);
        expect(point[0]).toBeCloseTo(2, 12);
        const k = curvatureAt(d1, d2, source.scale);
        expect(k.kind).toBe('regular');
        if (k.kind === 'regular') expect(k.kappa).toBeCloseTo(0.75, 9);
        expect(Math.abs(arcLength(polar('cardioid')) - 8)).toBeLessThan(1e-5);
        expect(Math.abs(enclosedArea(polar('cardioid')) - 3 * Math.PI / 2)).toBeLessThan(1e-6);
    });

    test('three-petal rose: area pi / 4 over [0, pi], petal tip at rho = 1', () => {
        expect(Math.abs(enclosedArea(polar('rose')) - Math.PI / 4)).toBeLessThan(1e-6);
        expect(polarRadius(polar('rose'), 0)).toBeCloseTo(1, 12);
    });

    test('Archimedean spiral rho = theta on [0, 2 pi]: length and area from the closed forms', () => {
        const a = 2 * Math.PI;
        const length = 0.5 * (a * Math.sqrt(1 + a * a) + Math.asinh(a));
        expect(Math.abs(arcLength(polar('spiral')) - length)).toBeLessThan(1e-5);
        expect(Math.abs(enclosedArea(polar('spiral')) - a ** 3 / 6)).toBeLessThan(1e-5);
        expect(polarRadius(polar('spiral'), 1.5)).toBeCloseTo(1.5, 12);
    });
});

describe('velocity', () => {
    test.each(PARAMETRIC_CURVE_IDS.map(id => [id]))('%s: the velocity vector equals the central difference of the trace', id => {
        const selection = {curve: id, radius: 1.3};
        const source = sourceOf(selection);
        const [t0, t1] = PARAMETRIC_CATALOGUE[id].domain;
        for (const fraction of [0.2, 0.4, 0.8]) {
            const t = t0 + fraction * (t1 - t0);
            const h = 1e-5;
            const a = source.at(t - h).point;
            const b = source.at(t + h).point;
            const v = velocityAt(selection, t);
            expect(v.status).toBe('moving');
            if (v.status !== 'moving') return;
            expect(v.vector[0]).toBeCloseTo((b[0] - a[0]) / (2 * h), 6);
            expect(v.vector[1]).toBeCloseTo((b[1] - a[1]) / (2 * h), 6);
            expect(v.speed).toBeCloseTo(Math.hypot(v.vector[0], v.vector[1]), 12);
        }
    });

    test('cycloid velocity is (r (1 - cos t), r sin t)', () => {
        const v = velocityAt(cycloid(2), 1);
        expect(v.status === 'moving' && v.vector[0]).toBeCloseTo(2 * (1 - Math.cos(1)), 12);
        expect(v.status === 'moving' && v.vector[1]).toBeCloseTo(2 * Math.sin(1), 12);
    });

    test('cycloid cusps at t = 0 and 2 pi: speed 0, no vector; t = pi is the top with speed 2r', () => {
        for (const t of [0, 2 * Math.PI]) {
            const v = velocityAt(cycloid(1.7), t);
            expect(v.status).toBe('stopped');
            expect(v.speed).toBe(0);
            expect('vector' in v).toBe(false);
        }
        const top = velocityAt(cycloid(1.7), Math.PI);
        expect(top.status === 'moving' && top.speed).toBeCloseTo(3.4, 12);
    });

    test('the cardioid cusp at theta = pi is stopped, theta = pi/2 is not', () => {
        expect(velocityAt(polar('cardioid'), Math.PI).status).toBe('stopped');
        expect(velocityAt(polar('cardioid'), Math.PI / 2).status).toBe('moving');
    });
});

describe('helpers', () => {
    test('clampParameter keeps the parameter in the domain and rejects non-finite values', () => {
        expect(clampParameter(cycloid(), -1)).toBe(0);
        expect(clampParameter(cycloid(), 99)).toBe(2 * Math.PI);
        expect(clampParameter(cycloid(), NaN)).toBe(0);
    });

    test('the view box contains the whole trace with a margin', () => {
        const [left, top, right, bottom] = curveViewBox(cycloid(2));
        expect(left).toBeLessThan(0);
        expect(right).toBeGreaterThan(4 * Math.PI);
        expect(top).toBeGreaterThan(4);
        expect(bottom).toBeLessThan(0);
    });
});

describe('Preset collection', () => {
    test('the default Preset round trips through JSON and the check', () => {
        const checked = parametricPresetCollection.check(JSON.parse(JSON.stringify(DEFAULT_PARAMETRIC_PRESET)));
        expect('rejection' in checked).toBe(false);
        expect('data' in checked && checked.data).toEqual(DEFAULT_PARAMETRIC_PRESET);
    });

    test.each([
        ['unknown curve', {...DEFAULT_PARAMETRIC_PRESET, curve: 'lemniscate'}],
        ['radius out of range', {...DEFAULT_PARAMETRIC_PRESET, radius: 10}],
        ['parameter outside the domain', {...DEFAULT_PARAMETRIC_PRESET, parameter: 7}],
        ['parameter not a number', {...DEFAULT_PARAMETRIC_PRESET, parameter: NaN}],
        ['not a record', [1, 2]],
    ])('rejects %s', (_name, data) => {
        expect('rejection' in parametricPresetCollection.check(data)).toBe(true);
    });

    test('scene state fields are checked too', () => {
        const check = parametricPresetCollection.checkGraphState!;
        expect(check({initialized: true, ...DEFAULT_PARAMETRIC_PRESET})).toBeUndefined();
        expect(check({initialized: true, curve: 'x'})).toBeDefined();
        expect(check({initialized: true, curve: 'rose', parameter: 5})).toBeDefined();
    });
});
