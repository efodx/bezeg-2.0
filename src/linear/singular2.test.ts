import {classifyEigen} from './eigen2';
import {apply, det, LINEAR_MAP_EXAMPLE_IDS, LINEAR_MAP_EXAMPLES, Mat2, Vec2} from './matrix2';
import {singular} from './singular2';

const ex = LINEAR_MAP_EXAMPLES;
const Sy = ex.symmetric;
const N = ex['non-symmetric'];
const deg = (r: number) => r * 180 / Math.PI;
const dot = (u: Vec2, w: Vec2) => u[0] * w[0] + u[1] * w[1];
/** Direction angle in degrees reduced to [0, 180). */
const lineAngle = (v: Vec2) => ((deg(Math.atan2(v[1], v[0])) % 180) + 180) % 180;

/**
 * Independent oracle: sample the image of the unit circle, take the best sample of |Av| (max or min), then refine
 * the stationary angle by bisection on the sign of d/dtheta |A v(theta)|^2 inside the bracket of one sample step
 * (step 2 pi / 2e5 = 3.1e-5 rad), so the result is limited by double rounding, not by the scan resolution.
 */
function scanExtreme(m: Mat2, sense: 1 | -1, samples = 200_000) {
    const norm2 = (t: number) => {
        const w = apply(m, [Math.cos(t), Math.sin(t)]);
        return w[0] * w[0] + w[1] * w[1];
    };
    const slope = (t: number) => {
        const v: Vec2 = [Math.cos(t), Math.sin(t)];
        const dv: Vec2 = [-Math.sin(t), Math.cos(t)];
        const w = apply(m, v);
        const dw = apply(m, dv);
        return 2 * (w[0] * dw[0] + w[1] * dw[1]);
    };
    const step = 2 * Math.PI / samples;
    let best = 0;
    for (let k = 1; k < samples; k++) {
        if (sense * (norm2(k * step) - norm2(best * step)) > 0) {
            best = k;
        }
    }
    let lo = (best - 1) * step;
    let hi = (best + 1) * step;
    const sign = Math.sign(slope(lo));
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (Math.sign(slope(mid)) === sign) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    const theta = (lo + hi) / 2;
    const w = apply(m, [Math.cos(theta), Math.sin(theta)]);
    return {value: Math.hypot(w[0], w[1]), domainDeg: lineAngle([Math.cos(theta), Math.sin(theta)]), imageDeg: lineAngle(w)};
}

describe('singular basics', () => {
    it('sigma1 >= sigma2 >= 0, sigma1 sigma2 = |det| to 1e-12, right and left directions orthonormal', () => {
        for (const id of LINEAR_MAP_EXAMPLE_IDS) {
            const m = ex[id];
            const s = singular(m);
            expect(s.sigma[0]).toBeGreaterThanOrEqual(s.sigma[1]);
            expect(s.sigma[1]).toBeGreaterThanOrEqual(0);
            expect(Math.abs(s.sigma[0] * s.sigma[1] - Math.abs(det(m)))).toBeLessThan(1e-12);
            expect(Math.abs(dot(s.right[0], s.right[1]))).toBeLessThan(1e-12);
            expect(Math.hypot(...s.right[0])).toBeCloseTo(1, 12);
            const [l1, l2] = s.left;
            if (l1 && l2) {
                expect(Math.abs(dot(l1, l2))).toBeLessThan(1e-12);
            }
            s.left.forEach((l, i) => {
                if (l) {
                    const image = apply(m, s.right[i]);
                    expect(image[0]).toBeCloseTo(s.sigma[i] * l[0], 12);
                    expect(image[1]).toBeCloseTo(s.sigma[i] * l[1], 12);
                }
            });
        }
    });

    it('random quarter-grid matrices keep sigma1 sigma2 = |det|', () => {
        let seed = 12345;
        const next = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return (seed % 33 - 16) / 4;
        };
        for (let i = 0; i < 2000; i++) {
            const m: Mat2 = [[next(), next()], [next(), next()]];
            const s = singular(m);
            expect(Math.abs(s.sigma[0] * s.sigma[1] - Math.abs(det(m)))).toBeLessThan(1e-12);
            expect(s.segmentOrPoint).toBe(det(m) === 0);
        }
    });

    it('flags: segment-or-point exactly when det = 0, circle exactly when A^T A is sigma^2 I', () => {
        const c = singular(ex.singular);
        expect(c).toMatchObject({segmentOrPoint: true, circle: false});
        expect(c.sigma[1]).toBe(0);
        expect(c.left[1]).toBeUndefined();
        expect(c.left[0]).toBeDefined();
        const zero = singular([[0, 0], [0, 0]]);
        expect(zero).toMatchObject({sigma: [0, 0], segmentOrPoint: true, circle: false, left: [undefined, undefined]});
        const rotation = singular(ex['quarter-turn']);
        expect(rotation).toMatchObject({circle: true, segmentOrPoint: false});
        expect(rotation.sigma).toEqual([1, 1]);
        expect(singular([[2, 0], [0, 2]])).toMatchObject({circle: true, sigma: [2, 2]});
        expect(singular([[0.5, -0.5], [0.5, 0.5]]).circle).toBe(true);
        expect(singular(ex['reflection-x'])).toMatchObject({circle: true});
        for (const id of ['basis-default', 'orientation-reversing', 'eigen-default', 'shear', 'symmetric', 'non-symmetric'] as const) {
            expect(singular(ex[id])).toMatchObject({circle: false, segmentOrPoint: false});
        }
        // a nearly-circle quarter-grid matrix is not a circle
        expect(singular([[1, 0.25], [0, 1]]).circle).toBe(false);
    });

    it('rejects non-finite entries', () => {
        expect(() => singular([[NaN, 0], [0, 1]])).toThrow(RangeError);
        expect(() => singular([[0.1, 0], [0, 1]])).toThrow(RangeError);
    });
});

describe('S_y symmetric example', () => {
    it('singular values 3 and 1 along (1,1) and (1,-1), equal to the eigen data up to sign', () => {
        const s = singular(Sy);
        expect(s.sigma[0]).toBeCloseTo(3, 12);
        expect(s.sigma[1]).toBeCloseTo(1, 12);
        expect(Math.abs(s.right[0][0] - Math.SQRT1_2)).toBeLessThan(1e-12);
        expect(Math.abs(s.right[0][1] - Math.SQRT1_2)).toBeLessThan(1e-12);
        expect(lineAngle(s.right[1])).toBeCloseTo(135, 9);
        const eigen = classifyEigen(Sy);
        if (eigen.kind !== 'distinct-real') {
            throw new Error('expected distinct-real');
        }
        expect(eigen.eigenvalues[0]).toBeCloseTo(s.sigma[0], 12);
        expect(eigen.eigenvalues[1]).toBeCloseTo(s.sigma[1], 12);
        for (let i = 0; i < 2; i++) {
            expect(Math.abs(Math.abs(dot(eigen.eigenvectors[i], s.right[i])) - 1)).toBeLessThan(1e-12);
        }
        expect(Math.abs(dot(eigen.eigenvectors[0], eigen.eigenvectors[1]))).toBeLessThan(1e-12);
    });

    it('agrees with the scan of the image of the unit circle to 1e-9', () => {
        const s = singular(Sy);
        const max = scanExtreme(Sy, 1);
        const min = scanExtreme(Sy, -1);
        expect(Math.abs(max.value - s.sigma[0])).toBeLessThan(1e-9);
        expect(Math.abs(min.value - s.sigma[1])).toBeLessThan(1e-9);
        expect(Math.abs(max.domainDeg - 45)).toBeLessThan(1e-9);
        expect(Math.abs(min.domainDeg - 135)).toBeLessThan(1e-9);
    });
});

describe('N non-symmetric example', () => {
    it('singular values sqrt(3 +- sqrt 5), product 2, axes 13.28 and 31.72 degrees, not eigen-directions', () => {
        const s = singular(N);
        expect(s.sigma[0]).toBeCloseTo(Math.sqrt(3 + Math.sqrt(5)), 12);
        expect(s.sigma[1]).toBeCloseTo(Math.sqrt(3 - Math.sqrt(5)), 12);
        expect(s.sigma[0] * s.sigma[1]).toBeCloseTo(2, 12);
        expect(lineAngle(s.left[0] as Vec2)).toBeCloseTo(13.28, 2);
        expect(lineAngle(s.right[0])).toBeCloseTo(31.72, 2);
        const eigen = classifyEigen(N);
        if (eigen.kind !== 'distinct-real') {
            throw new Error('expected distinct-real');
        }
        for (const v of eigen.eigenvectors) {
            expect(Math.abs(lineAngle(v) - lineAngle(s.right[0]))).toBeGreaterThan(1);
            expect(Math.abs(lineAngle(v) - lineAngle(s.left[0] as Vec2))).toBeGreaterThan(1);
        }
        expect(Math.abs(dot(eigen.eigenvectors[0], eigen.eigenvectors[1]))).toBeGreaterThan(0.5); // 45 degrees apart
    });

    it('agrees with the scan (2e5 points, refined) for values and both axes to 1e-9', () => {
        const s = singular(N);
        const max = scanExtreme(N, 1);
        const min = scanExtreme(N, -1);
        expect(Math.abs(max.value - s.sigma[0])).toBeLessThan(1e-9);
        expect(Math.abs(min.value - s.sigma[1])).toBeLessThan(1e-9);
        expect(Math.abs(max.domainDeg - lineAngle(s.right[0]))).toBeLessThan(1e-9);
        expect(Math.abs(max.imageDeg - lineAngle(s.left[0] as Vec2))).toBeLessThan(1e-9);
        expect(Math.abs(min.domainDeg - lineAngle(s.right[1]))).toBeLessThan(1e-9);
        expect(max.value).toBeCloseTo(2.28825, 5);
        expect(min.value).toBeCloseTo(0.87403, 5);
    });

    it('agrees with the scan for further matrices (E, A, shear)', () => {
        for (const m of [ex['eigen-default'], ex['basis-default'], ex.shear]) {
            const s = singular(m);
            expect(Math.abs(scanExtreme(m, 1).value - s.sigma[0])).toBeLessThan(1e-9);
            expect(Math.abs(scanExtreme(m, -1).value - s.sigma[1])).toBeLessThan(1e-9);
        }
    });
});
