import {angleFromDegrees, angleFromHalfDegrees, angleFromPiMultiple, toRadians} from './angle';
import {allAngles, arcLength, pointInRotatedFrame, pointOnCircle, rotationFrame, sumPoint, symmetricImages} from './unitCircle';

const all = allAngles();
// Independent direct evaluation in degrees, written without the kernel's radian conversion.
const sinDeg = (halfDegrees: number): number => Math.sin((halfDegrees / 2) * (Math.PI / 180));
const cosDeg = (halfDegrees: number): number => Math.cos((halfDegrees / 2) * (Math.PI / 180));

describe('pointOnCircle, arcLength, rotationFrame', () => {
    it('matches the TR1 default numbers', () => {
        expect(180 / Math.PI).toBeCloseTo(57.29578, 5);
        expect(toRadians(angleFromDegrees(135))).toBeCloseTo(2.35619, 5);
        expect(toRadians(angleFromPiMultiple(0.75))).toBeCloseTo(2.35619, 5);
        const [c30, s30] = pointOnCircle(angleFromPiMultiple(1 / 6));
        expect(c30).toBeCloseTo(0.8660254, 7);
        expect(s30).toBeCloseTo(0.5, 15);
        // 2 rad = 114.59 degrees snaps to 229 half-degrees (114.5 degrees): quadrant II.
        const two = angleFromDegrees((2 * 180) / Math.PI);
        expect(two.halfDegrees).toBe(229);
        const [c2, s2] = pointOnCircle(two);
        expect(c2).toBeCloseTo(-0.4161468, 2);
        expect(s2).toBeCloseTo(0.9092974, 2);
        const [c200, s200] = pointOnCircle(angleFromDegrees(200));
        expect(c200).toBeCloseTo(-0.939693, 6);
        expect(s200).toBeCloseTo(-0.34202, 5);
    });
    it('arc length is r theta', () => {
        expect(arcLength(angleFromPiMultiple(1), 3)).toBe(3 * Math.PI);
        expect(arcLength(angleFromHalfDegrees(0), 5)).toBe(0);
        expect(arcLength(angleFromDegrees(90), 2)).toBeCloseTo(Math.PI, 15);
    });
    it('sin^2 + cos^2 = 1 to 1e-15 at all 720 states', () => {
        expect(all).toHaveLength(720);
        for (const a of all) {
            const [c, s] = pointOnCircle(a);
            expect(Math.abs(s * s + c * c - 1)).toBeLessThanOrEqual(1e-15);
        }
    });
    it('rotation frame is (cos,sin), (-sin,cos)', () => {
        for (const a of all) {
            const [e1, e2] = rotationFrame(a);
            const [c, s] = pointOnCircle(a);
            expect(e1).toEqual([c, s]);
            expect(e2).toEqual([-s, c]);
        }
    });
});

describe('symmetries and addition formulas', () => {
    it('symmetric images give the identities, with angles derived by integer operations', () => {
        for (const a of all) {
            const {xAxis, yAxis, origin} = symmetricImages(a);
            const [c, s] = pointOnCircle(a);
            const [cy, sy] = pointOnCircle(yAxis);
            const [cx, sx] = pointOnCircle(xAxis);
            const [co, so] = pointOnCircle(origin);
            expect(Math.abs(cy + c)).toBeLessThanOrEqual(2.5e-15);
            expect(Math.abs(sy - s)).toBeLessThanOrEqual(2.5e-15);
            expect(Math.abs(cx - c)).toBeLessThanOrEqual(2.5e-15);
            expect(Math.abs(sx + s)).toBeLessThanOrEqual(2.5e-15);
            expect(Math.abs(co + c)).toBeLessThanOrEqual(2.5e-15);
            expect(Math.abs(so + s)).toBeLessThanOrEqual(2.5e-15);
        }
    });
    it('matches the TR2 default numbers', () => {
        expect(Math.sin(Math.PI - 0.5)).toBeCloseTo(0.4794255, 7);
        const p = sumPoint(angleFromDegrees(60), angleFromDegrees(45));
        expect(p[1]).toBeCloseTo(0.9659258, 7);
        expect(p[1]).toBeCloseTo((Math.sqrt(6) + Math.sqrt(2)) / 4, 15);
        expect(p[0]).toBeCloseTo(-0.258819, 6);
        expect(p[0]).toBeCloseTo((Math.sqrt(2) - Math.sqrt(6)) / 4, 15);
    });
    it('addition formulas equal direct evaluation over sampled half-degree pairs', () => {
        let checked = 0;
        for (let ha = 0; ha < 720; ha += 7) {
            for (let hb = 0; hb < 720; hb += 11) {
                const a = angleFromHalfDegrees(ha);
                const b = angleFromHalfDegrees(hb);
                const [cs, ss] = sumPoint(a, b);
                const direct = ha + hb; // not wrapped: direct evaluation in degrees
                expect(Math.abs(cs - cosDeg(direct))).toBeLessThanOrEqual(1e-14);
                expect(Math.abs(ss - sinDeg(direct))).toBeLessThanOrEqual(1e-14);
                const [cf, sf] = pointInRotatedFrame(a, b);
                const cAdd = cosDeg(ha) * cosDeg(hb) - sinDeg(ha) * sinDeg(hb);
                const sAdd = sinDeg(ha) * cosDeg(hb) + cosDeg(ha) * sinDeg(hb);
                expect(Math.abs(cf - cAdd)).toBeLessThanOrEqual(2.5e-15);
                expect(Math.abs(sf - sAdd)).toBeLessThanOrEqual(2.5e-15);
                expect(Math.abs(cf - cosDeg(direct))).toBeLessThanOrEqual(1e-14);
                expect(Math.abs(sf - sinDeg(direct))).toBeLessThanOrEqual(1e-14);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(6000);
    });
});
