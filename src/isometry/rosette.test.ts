import {describe, expect, it} from 'vitest';
import {rosette} from './rosette';

const motif = {x: 1.3, y: 0.4};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const distinct = (pts: readonly { x: number; y: number }[]) =>
    pts.filter((p, i) => pts.findIndex((q) => near(p.x, q.x) && near(p.y, q.y)) === i).length;

describe('rosette', () => {
    it('gives n images for C_n and 2n for D_n, with exact order, for n = 1..12', () => {
        for (let n = 1; n <= 12; n++) {
            const c = rosette(n, false, motif);
            const d = rosette(n, true, motif);
            expect(c.order).toBe(n);
            expect(c.images).toHaveLength(n);
            expect(d.order).toBe(2 * n);
            expect(d.images).toHaveLength(2 * n);
            expect(distinct(c.images)).toBe(n);
            expect(distinct(d.images)).toBe(2 * n);
        }
    });

    it('matches an independent loop of rotations by 2 pi j / n', () => {
        for (const n of [3, 5, 7, 12]) {
            const {images} = rosette(n, false, motif);
            const r = Math.hypot(motif.x, motif.y);
            const a0 = Math.atan2(motif.y, motif.x);
            images.forEach((im, j) => {
                const a = a0 + (2 * Math.PI * j) / n;
                expect(near(im.x, r * Math.cos(a))).toBe(true);
                expect(near(im.y, r * Math.sin(a))).toBe(true);
            });
        }
    });

    it('alternates orientation with mirrors and has fewer images for a point on a mirror', () => {
        const d = rosette(5, true, motif);
        d.images.forEach((im, i) => expect(im.reflected).toBe(i % 2 === 1));
        expect(rosette(5, false, motif).images.every((im) => !im.reflected)).toBe(true);
        expect(distinct(rosette(6, true, {x: 2, y: 0}).images)).toBe(6);
        // A point on the mirror at angle pi / 4 (n = 4).
        const onMirror = rosette(4, true, {x: 1, y: 1});
        expect(onMirror.images).toHaveLength(8);
        expect(distinct(onMirror.images)).toBe(4);
    });

    it('matches an independent reflect-then-rotate loop for mirror images', () => {
        for (const n of [1, 3, 5, 12]) {
            const {images} = rosette(n, true, motif);
            for (let j = 0; j < n; j++) {
                const a = (2 * Math.PI * j) / n;
                const fx = motif.x, fy = -motif.y; // reflect in the x axis
                const ex = fx * Math.cos(a) - fy * Math.sin(a);
                const ey = fx * Math.sin(a) + fy * Math.cos(a);
                expect(Math.abs(images[2 * j + 1].x - ex)).toBeLessThan(1e-12);
                expect(Math.abs(images[2 * j + 1].y - ey)).toBeLessThan(1e-12);
            }
        }
    });

    it('rejects other n', () => {
        for (const n of [0, 13, -1, 2.5, NaN]) expect(() => rosette(n, false, motif)).toThrow(RangeError);
    });
});
