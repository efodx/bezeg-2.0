import {deriveConic, deriveEllipse, ellipseHalfExtent, ellipseViewBox, ELLIPSE_SAMPLES} from './ellipseScene';
import {LINEAR_MAP_EXAMPLES, type Mat2, type Vec2} from '../../linear/matrix2';

const Sy = LINEAR_MAP_EXAMPLES.symmetric;
const N = LINEAR_MAP_EXAMPLES['non-symmetric'];
const degrees = (v: Vec2) => Math.atan2(v[1], v[0]) * 180 / Math.PI;

describe('the image of the circle from the singular decomposition', () => {
    test.each([Sy, N, LINEAR_MAP_EXAMPLES['basis-default'], LINEAR_MAP_EXAMPLES['eigen-default'], LINEAR_MAP_EXAMPLES['quarter-turn']].map(m => [m]))(
        'the drawn points are A applied to the unit circle (the same set to 1e-9) for %j', (matrix: Mat2) => {
            const view = deriveEllipse(matrix);
            expect(view.imageCurve.x).toHaveLength(ELLIPSE_SAMPLES + 1);
            const {sigma, left, right} = view.singular;
            for (let i = 0; i < ELLIPSE_SAMPLES; i++) {
                const t = 2 * Math.PI * i / ELLIPSE_SAMPLES;
                // the SVD parameter t corresponds to the domain point V (cos t, sin t)
                const x: Vec2 = [Math.cos(t) * right[0][0] + Math.sin(t) * right[1][0], Math.cos(t) * right[0][1] + Math.sin(t) * right[1][1]];
                const direct = [matrix[0][0] * x[0] + matrix[0][1] * x[1], matrix[1][0] * x[0] + matrix[1][1] * x[1]];
                expect(view.imageCurve.x[i]).toBeCloseTo(direct[0], 9);
                expect(view.imageCurve.y[i]).toBeCloseTo(direct[1], 9);
                // and every drawn point satisfies (P.u1/s1)^2 + (P.u2/s2)^2 = 1
                const [px, py] = [view.imageCurve.x[i], view.imageCurve.y[i]];
                const q = (px * left[0]![0] + py * left[0]![1]) ** 2 / sigma[0] ** 2 + (px * left[1]![0] + py * left[1]![1]) ** 2 / sigma[1] ** 2;
                expect(q).toBeCloseTo(1, 9);
            }
            // the curve is closed
            expect(view.imageCurve.x[ELLIPSE_SAMPLES]).toBe(view.imageCurve.x[0]);
        });

    test('S_y: semi-axes 3 and 1 along (1,1) and (1,-1); the image axis angle is 45 and the domain angle 45', () => {
        const view = deriveEllipse(Sy);
        expect(view.kind).toBe('ellipse');
        expect(view.symmetric).toBe(true);
        expect(view.singular.sigma[0]).toBeCloseTo(3, 12);
        expect(view.singular.sigma[1]).toBeCloseTo(1, 12);
        expect(view.axes.map(a => a.name)).toEqual(['$$\\sigma_1$$', '$$\\sigma_2$$']);
        const [t1, t2] = view.axes.map(a => a.tip);
        expect(Math.hypot(...t1)).toBeCloseTo(3, 12);
        expect(Math.abs(t1[0] - t1[1])).toBeLessThan(1e-12);
        expect(Math.hypot(...t2)).toBeCloseTo(1, 12);
        expect(Math.abs(t2[0] + t2[1])).toBeLessThan(1e-12);
        expect(view.imageAxisAngle).toBeCloseTo(45, 9);
        expect(view.domainAxisAngle).toBeCloseTo(45, 9);
        expect(view.lines).toHaveLength(2);
    });

    test('N: sigma = sqrt(3 +- sqrt 5), product 2 = |det|, major image axis 13,28 deg, domain direction 31,72 deg, neither an eigen-direction', () => {
        const view = deriveEllipse(N);
        expect(view.kind).toBe('ellipse');
        expect(view.symmetric).toBe(false);
        expect(view.singular.sigma[0]).toBeCloseTo(Math.sqrt(3 + Math.sqrt(5)), 12);
        expect(view.singular.sigma[1]).toBeCloseTo(Math.sqrt(3 - Math.sqrt(5)), 12);
        expect(view.singular.sigma[0]).toBeCloseTo(2.2882, 4);
        expect(view.singular.sigma[1]).toBeCloseTo(0.8740, 4);
        expect(Math.abs(view.product - 2)).toBeLessThan(1e-12);
        expect(view.absDeterminant).toBe(2);
        expect(view.imageAxisAngle!).toBeCloseTo(13.28, 2);
        expect(view.domainAxisAngle!).toBeCloseTo(31.72, 2);
        // the eigen-directions of N are (1,0) and (1,-1): 0 and 135 degrees as lines
        const eigenAngles = view.lines.map(v => ((degrees(v) % 180) + 180) % 180).sort((a, b) => a - b);
        expect(eigenAngles[0]).toBeCloseTo(0, 6);
        expect(eigenAngles[1]).toBeCloseTo(135, 6);
        for (const angle of eigenAngles) {
            expect(Math.abs(angle - view.imageAxisAngle!)).toBeGreaterThan(5);
            expect(Math.abs(angle - view.domainAxisAngle!)).toBeGreaterThan(5);
        }
    });
});

describe('the degenerate cases', () => {
    test('a singular matrix is a segment of half-length sigma1, never an ellipse with a zero axis', () => {
        const view = deriveEllipse(LINEAR_MAP_EXAMPLES.singular);
        expect(view.kind).toBe('segment');
        expect(view.singular.sigma[1]).toBe(0);
        expect(view.imageCurve.x).toHaveLength(2);
        expect(Math.hypot(view.imageCurve.x[0] - view.imageCurve.x[1], view.imageCurve.y[0] - view.imageCurve.y[1])).toBeCloseTo(2 * view.singular.sigma[0], 12);
        expect(view.axes).toHaveLength(1);
        expect(view.directions).toHaveLength(2);
        for (const x of [...view.imageCurve.x, ...view.imageCurve.y]) expect(Number.isFinite(x)).toBe(true);
    });

    test('the zero matrix is a point: nothing to draw, no axes', () => {
        const view = deriveEllipse([[0, 0], [0, 0]]);
        expect(view.kind).toBe('point');
        expect(view.imageCurve.x).toEqual([]);
        expect(view.axes).toEqual([]);
        expect(view.directions).toEqual([]);
        expect(view.imageAxisAngle).toBeUndefined();
        expect(view.conic.kind).toBe('empty');
    });

    test('a rotation and 2I are circles with non-unique axes: no axes and no domain directions are drawn', () => {
        for (const matrix of [LINEAR_MAP_EXAMPLES['quarter-turn'], LINEAR_MAP_EXAMPLES['scalar-2'], LINEAR_MAP_EXAMPLES.identity]) {
            const view = deriveEllipse(matrix);
            expect(view.kind).toBe('circle');
            expect(view.axes).toEqual([]);
            expect(view.directions).toEqual([]);
            const radius = view.singular.sigma[0];
            for (let i = 0; i < ELLIPSE_SAMPLES; i++) expect(Math.hypot(view.imageCurve.x[i], view.imageCurve.y[i])).toBeCloseTo(radius, 12);
        }
    });

    test('no real eigen-direction for a rotation (no dashed lines), the line of a shear is one', () => {
        expect(deriveEllipse(LINEAR_MAP_EXAMPLES['quarter-turn']).lines).toHaveLength(0);
        expect(deriveEllipse(LINEAR_MAP_EXAMPLES.shear).lines).toHaveLength(1);
    });
});

describe('the conic of the symmetric part', () => {
    test('S_y: x^T S x = 1 has semi-axes 1/sqrt 3 (along (1,1)) and 1 (along (1,-1)); every drawn point satisfies the form', () => {
        const conic = deriveConic(Sy);
        expect(conic.kind).toBe('ellipse');
        expect(conic.eigenvalues[0]).toBeCloseTo(3, 12);
        expect(conic.eigenvalues[1]).toBeCloseTo(1, 12);
        expect(conic.semiAxes![0]).toBeCloseTo(0.57735, 5);
        expect(conic.semiAxes![1]).toBeCloseTo(1, 12);
        expect(Math.abs(conic.directions[0][0] - conic.directions[0][1])).toBeLessThan(1e-12);
        const [[a, b], [, d]] = conic.symmetricPart;
        conic.curve!.x.forEach((x, i) => {
            const y = conic.curve!.y[i];
            expect(a * x * x + 2 * b * x * y + d * y * y).toBeCloseTo(1, 12);
        });
    });

    test('N: the symmetric part is [[2,1/2],[1/2,1]], positive definite, so its conic is drawn', () => {
        const conic = deriveConic(N);
        expect(conic.symmetricPart).toEqual([[2, 0.5], [0.5, 1]]);
        expect(conic.kind).toBe('ellipse');
        expect(conic.curve).toBeDefined();
        const [[a, b], [, d]] = conic.symmetricPart;
        conic.curve!.x.forEach((x, i) => expect(a * x * x + 2 * b * x * conic.curve!.y[i] + d * conic.curve!.y[i] ** 2).toBeCloseTo(1, 12));
        expect(deriveEllipse(N).conicAxes).toHaveLength(2);
    });

    test('indefinite, semidefinite and negative definite symmetric parts are classified, described and never drawn', () => {
        const kind = (m: Mat2) => deriveConic(m).kind;
        expect(kind(LINEAR_MAP_EXAMPLES['reflection-x'])).toBe('hyperbola');
        expect(kind(LINEAR_MAP_EXAMPLES['orientation-reversing'])).toBe('hyperbola');
        expect(kind([[0, 1], [-1, 0]])).toBe('empty'); // S = 0
        expect(kind([[1, 1], [1, 1]])).toBe('parallel-lines'); // det S = 0, tr S > 0, exact
        expect(kind([[1, 0.5], [0.5, 0.25]])).toBe('parallel-lines');
        expect(kind([[-1, 0], [0, -1]])).toBe('empty');
        expect(kind([[-1, -1], [-1, -1]])).toBe('empty');
        for (const m of [LINEAR_MAP_EXAMPLES['reflection-x'], [[1, 1], [1, 1]] as Mat2]) {
            const conic = deriveConic(m);
            expect(conic.curve).toBeUndefined();
            expect(deriveEllipse(m).conicAxes).toEqual([]);
        }
        expect(deriveConic(LINEAR_MAP_EXAMPLES.shear).kind).toBe('ellipse'); // S = [[1,1/2],[1/2,1]]
    });
});

describe('the view and the labels', () => {
    test('the half-extent is at least 1,2 times max(1, sigma1, |a1|, |a2|), and never below 2', () => {
        for (const matrix of Object.values(LINEAR_MAP_EXAMPLES)) {
            const sigma1 = deriveEllipse(matrix).singular.sigma[0];
            const reach = Math.max(1, sigma1, Math.hypot(matrix[0][0], matrix[1][0]), Math.hypot(matrix[0][1], matrix[1][1]));
            expect(ellipseHalfExtent(matrix)).toBeGreaterThanOrEqual(1.2 * reach - 1e-12);
            expect(ellipseHalfExtent(matrix)).toBeGreaterThanOrEqual(2);
        }
        expect(ellipseHalfExtent([[4, 4], [4, 4]])).toBeGreaterThan(1.2 * 8 - 1e-9);
    });

    test('with the conic shown the view also holds its semi-axes', () => {
        const flat: Mat2 = [[0.25, 0], [0, 0.25]]; // S = I/4: semi-axes 2
        expect(ellipseHalfExtent(flat, true)).toBeGreaterThanOrEqual(2.4 - 1e-12);
        expect(ellipseHalfExtent(flat, false)).toBe(2);
        const thin: Mat2 = [[0.25, 0], [0, 4]]; // S = diag(1/4, 4): semi-axes 2 and 1/2
        expect(ellipseHalfExtent(thin, true)).toBeGreaterThanOrEqual(2.4 - 1e-12);
    });

    test('the box is centred and follows the board aspect', () => {
        const [l, t, r, b] = ellipseViewBox(N, false, 800, 400);
        expect(l).toBe(-r);
        expect(t).toBe(-b);
        expect((r - l) / (t - b)).toBeCloseTo(2, 12);
    });
});
