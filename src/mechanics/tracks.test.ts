import { describe, expect, it } from 'vitest';
import { arcTrack, bezierTrack, cycloidTrack, lineTrack, type Track, type Vec2 } from './tracks';

/** Central difference of the point, an oracle independent of the exact `velocity`. */
function numericVelocity(track: Track, t: number): Vec2 {
    const h = 1e-6;
    const a = track.point(t - h);
    const b = track.point(t + h);
    return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)];
}

function expectVelocityMatches(track: Track, ts: number[]) {
    for (const t of ts) {
        const exact = track.velocity(t);
        const approx = numericVelocity(track, t);
        expect(exact[0]).toBeCloseTo(approx[0], 6);
        expect(exact[1]).toBeCloseTo(approx[1], 6);
        expect(track.y(t)).toBeCloseTo(track.point(t)[1], 12);
    }
}

describe('tracks', () => {
    it('line: endpoints and constant velocity', () => {
        const track = lineTrack([0, 0], [3, 2]);
        expect(track.point(0)).toEqual([0, 0]);
        expect(track.point(1)).toEqual([3, 2]);
        expect(track.velocity(0.4)).toEqual([3, 2]);
        expectVelocityMatches(track, [0.1, 0.5, 0.9]);
    });

    it('circle arc: radius, endpoints and exact derivative', () => {
        const c = 2.2;
        const track = arcTrack([c, 0], c, Math.PI, Math.PI - 2);
        const start = track.point(0);
        expect(start[0]).toBeCloseTo(0, 14);
        expect(start[1]).toBeCloseTo(0, 14);
        for (const t of [0, 0.3, 1]) {
            const p = track.point(t);
            expect(Math.hypot(p[0] - c, p[1])).toBeCloseTo(c, 12);
        }
        expect(track.velocity(0)[0]).toBeCloseTo(0, 14); // vertical start tangent
        expectVelocityMatches(track, [0.1, 0.5, 0.9]);
    });

    it('cycloid via the depth adapter: depth r(1 - cos), cusp start, exact derivative', () => {
        const r = 1.5;
        const track = cycloidTrack(r, 0, Math.PI);
        expect(track.point(0)).toEqual([0, 0]);
        const p = track.point(Math.PI);
        expect(p[0]).toBeCloseTo(r * Math.PI, 12);
        expect(p[1]).toBeCloseTo(2 * r, 12);
        expect(track.velocity(0)).toEqual([0, 0]);
        expectVelocityMatches(track, [0.5, 1.7, 3]);
        expect(track.t0).toBe(0);
        expect(track.t1).toBe(Math.PI);
    });

    it('Bézier: Bernstein sums match the power form and the exact derivative', () => {
        const P: Vec2[] = [[0, 0], [0.5, 2], [2, 2.5], [3.25, 2]];
        const track = bezierTrack(P);
        for (const t of [0, 0.2, 0.5, 0.77, 1]) {
            // power form of the cubic: independent of the Bernstein evaluation under test
            const u = 1 - t;
            for (const k of [0, 1] as const) {
                const expected =
                    u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k];
                expect(track.point(t)[k]).toBeCloseTo(expected, 13);
            }
        }
        expect(track.point(0)).toEqual([0, 0]);
        expect(track.point(1)[0]).toBeCloseTo(3.25, 14);
        // start slope of the depth is n * y1 = 6
        expect(track.velocity(0)[1]).toBeCloseTo(6, 13);
        expectVelocityMatches(track, [0.1, 0.5, 0.9]);
    });

    it('Bézier of any degree >= 1 and rejects a single point', () => {
        expect(bezierTrack([[0, 0], [1, 1]]).point(0.5)).toEqual([0.5, 0.5]);
        const quintic = bezierTrack([[0, 0], [1, 1], [2, 0.5], [3, 2], [4, 1], [5, 3]]);
        expectVelocityMatches(quintic, [0.2, 0.6]);
        expect(() => bezierTrack([[0, 0]])).toThrow(RangeError);
    });
});
