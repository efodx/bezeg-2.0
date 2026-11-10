import {describe, expect, it} from "vitest";
import {arrowScale, ladderStep} from "./arrowScale";

describe('ladderStep', () => {
    it('keeps a magnitude that lies exactly on the ladder', () => {
        const exact: Array<[number, number]> = [
            [1, 1], [2, 2], [5, 5], [10, 10], [20, 20], [50, 50], [0.1, 0.1], [0.2, 0.2], [0.5, 0.5],
            [0.01, 0.01], [1000, 1000], [20, 20], [50, 50], [100, 100],
        ];
        for (const [m, step] of exact) {
            expect(ladderStep(m)).toBe(step);
        }
    });

    it('rounds up just above a boundary and keeps the step just below it', () => {
        expect(ladderStep(1.0001)).toBe(2);
        expect(ladderStep(0.9999)).toBe(1);
        expect(ladderStep(2.0001)).toBe(5);
        expect(ladderStep(1.9999)).toBe(2);
        expect(ladderStep(5.0001)).toBe(10);
        expect(ladderStep(4.9999)).toBe(5);
        expect(ladderStep(0.1001)).toBe(0.2);
        expect(ladderStep(0.0999)).toBe(0.1);
        expect(ladderStep(0.5001)).toBe(1);
        expect(ladderStep(10.0001)).toBe(20);
        expect(ladderStep(20.0001)).toBe(50);
        expect(ladderStep(50.0001)).toBe(100);
        expect(ladderStep(100.0001)).toBe(200);
        expect(ladderStep(19.9999)).toBe(20);
        expect(ladderStep(49.9999)).toBe(50);
        expect(ladderStep(99.9999)).toBe(100);
    });

    it('tolerates rounding noise on a boundary', () => {
        expect(ladderStep(0.1 + 0.2 - 0.2)).toBe(0.1);
        expect(ladderStep(3 * 0.1 + 1.7)).toBe(2);
    });

    it('never gives a step below the magnitude and stays within a factor 2.5', () => {
        for (let i = 1; i < 2000; i++) {
            const m = 0.0007 * i ** 1.7;
            const s = ladderStep(m);
            expect(s).toBeGreaterThanOrEqual(m * (1 - 1e-9));
            expect(s / m).toBeLessThanOrEqual(2.5 + 1e-9);
        }
    });

    it('handles zero and rejects negative or non-finite magnitudes', () => {
        expect(ladderStep(0)).toBe(1);
        expect(() => ladderStep(-1)).toThrow(RangeError);
        expect(() => ladderStep(NaN)).toThrow(RangeError);
        expect(() => ladderStep(Infinity)).toThrow(RangeError);
    });
});

describe('arrowScale', () => {
    it('labels the step with its unit and a decimal comma', () => {
        expect(arrowScale(14.7908, 'm/s')).toEqual({step: 20, unit: 'm/s', label: '20 m/s'});
        expect(arrowScale(9.81, 'm/s²')).toEqual({step: 10, unit: 'm/s²', label: '10 m/s²'});
        expect(arrowScale(0.15, 'm/s').label).toBe('0,2 m/s');
    });

    it('writes tiny and huge steps positionally, never in exponent form', () => {
        expect(arrowScale(1e-7, 'm/s').label).toBe('0,0000001 m/s');
        expect(arrowScale(3e-7, 'm/s').label).toBe('0,0000005 m/s');
        expect(arrowScale(1e-7, 'm/s').step).toBe(1e-7);
        expect(arrowScale(1.5e21, 'm/s').label).not.toMatch(/e/);
    });

    it('gives velocity and acceleration separate scales', () => {
        const v = arrowScale(3.14159, 'm/s');
        const a = arrowScale(4.9348, 'm/s²');
        expect(v.step).toBe(5);
        expect(a.step).toBe(5);
        expect(arrowScale(2, 'm/s').step).not.toBe(arrowScale(19.7392, 'm/s²').step);
        expect(v.unit).not.toBe(a.unit);
    });
});
