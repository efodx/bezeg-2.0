import {describe, expect, test} from 'vitest';
import {
    BASIS_SAMPLES, draggedKnots, editedKnots, isClamped, knotProblem, parameterView, readoutAt, rebuiltKnots, sampleBasis, snapKnot,
} from './bsplineBasisModel';
import {renderMessage} from '../../../localization';

describe('knot vector helpers', () => {
    test('isClamped looks at both ends only', () => {
        expect(isClamped([0, 0, 0, 1, 2, 2, 2], 2)).toBe(true);
        expect(isClamped([0, 1, 2, 3, 4, 5, 6], 2)).toBe(false);
        expect(isClamped([0, 0, 0, 1, 2, 3, 4], 2)).toBe(false);
        expect(isClamped([0, 0, 1], 2)).toBe(false);
    });

    test('rebuiltKnots keeps n, raises it to the degree when needed, and is valid', () => {
        expect(rebuiltKnots(2, 3, true)).toEqual([0, 0, 0, 1, 2, 2, 2]);
        expect(rebuiltKnots(2, 3, false)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(rebuiltKnots(3, 1, true)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
        for (const degree of [1, 2, 3]) for (const clamped of [true, false]) {
            const knots = rebuiltKnots(degree, 4, clamped);
            expect(knotProblem(knots, degree)).toBeUndefined();
        }
    });

    test('snapKnot rounds to 0.01 without negative zero', () => {
        expect(snapKnot(0.07)).toBe(0.07);
        expect(snapKnot(1.234)).toBe(1.23);
        expect(snapKnot(-0.004)).toBe(0);
        expect(Object.is(snapKnot(-0.004), 0)).toBe(true);
    });
});

describe('dragging and typing', () => {
    const knots = [0, 0, 0, 1, 2, 3, 4, 4, 4];

    test('a drag clamps to the neighbours and returns undefined when nothing changes', () => {
        expect(draggedKnots(knots, 2, 4, 2.5)).toEqual([0, 0, 0, 1, 2.5, 3, 4, 4, 4]);
        expect(draggedKnots(knots, 2, 4, 99)).toEqual([0, 0, 0, 1, 3, 3, 4, 4, 4]);
        expect(draggedKnots(knots, 2, 4, -99)).toEqual([0, 0, 0, 1, 1, 3, 4, 4, 4]);
        expect(draggedKnots(knots, 2, 4, 2)).toBeUndefined();
        expect(draggedKnots(knots, 2, 4, Number.NaN)).toBeUndefined();
        expect(draggedKnots(knots, 2, 99, 1)).toBeUndefined();
    });

    test('a drag never produces an invalid vector', () => {
        // Four equal knots at the start, or an empty domain, would be invalid.
        expect(draggedKnots(knots, 2, 3, 0)).toBeUndefined();
        expect(draggedKnots([0, 0, 0, 1, 1, 1], 2, 3, 0)).toBeUndefined();
        expect(draggedKnots([0, 0, 0, 1, 1, 1], 2, 3, 0.5)).toEqual([0, 0, 0, 0.5, 1, 1]);
    });

    test('a typed value is checked by the kernel with the vector n and gives the localized reason', () => {
        expect('knots' in editedKnots(knots, 2, 4, 2.5)).toBe(true);
        const refused = (index: number, value: number) => {
            const edit = editedKnots(knots, 2, index, value);
            return 'rejection' in edit ? renderMessage(edit.rejection) : undefined;
        };
        expect(refused(4, 0.5)).toBe('vozli ne smejo padati: vozel 5 je manjši od prejšnjega');
        expect(refused(3, 0)).toContain('največ 3-krat');
        expect(refused(0, Number.NaN)).toBe('vsi vozli morajo biti končna števila');
        expect(refused(0, 4)).toBeDefined();
    });
});

describe('display mapping and samples', () => {
    test('the display toggle maps the domain onto [0, 1] and back', () => {
        const view = parameterView([0, 0, 0, 1, 2, 2, 2], 2, true);
        expect([view.toDisplay(0), view.toDisplay(1), view.toDisplay(2)]).toEqual([0, 0.5, 1]);
        expect(view.toRaw(0.25)).toBe(0.5);
        const raw = parameterView([0, 0, 0, 1, 2, 2, 2], 2, false);
        expect(raw.toDisplay(1.5)).toBe(1.5);
        const unclamped = parameterView([0, 1, 2, 3, 4, 5, 6], 2, true);
        expect([unclamped.start, unclamped.end, unclamped.toDisplay(3.5)]).toEqual([2, 4, 0.75]);
    });

    test('the readout holds k + 1 values and sums to 1; an invalid vector has none', () => {
        const reading = readoutAt([0, 0, 0, 1, 2, 2, 2], 2, 0.5)!;
        expect(reading.first).toBe(0);
        expect(reading.values).toEqual([0.25, 0.625, 0.125]);
        expect(reading.sum).toBe(1);
        expect(readoutAt([0, 0, 0, 2, 1, 2, 2], 2, 0.5)).toBeUndefined();
    });

    test('sampleBasis covers the domain with every column; an invalid vector draws nothing', () => {
        const samples = sampleBasis([0, 0, 0, 1, 2, 2, 2], 2);
        // The uniform grid already contains the interior knot 1; only its left-limit sample is added.
        expect(samples.t).toHaveLength(BASIS_SAMPLES + 2);
        expect(samples.columns).toHaveLength(4);
        expect(samples.columns.every(column => column.length === samples.t.length)).toBe(true);
        expect(samples.t[0]).toBe(0);
        expect(samples.t[samples.t.length - 1]).toBe(2);
        expect(samples.t.every((value, j) => j === 0 || value > samples.t[j - 1])).toBe(true);
        expect(sampleBasis([0, 0, 0, 2, 1, 2, 2], 2).t).toEqual([]);
    });

    test('a knot of multiplicity k + 1 is sampled on both sides, so the jump draws as a vertical step', () => {
        // Degree 2, knots 0,0,0,1,1,1,2,2,2: two Bernstein pieces; N_2 jumps from 1 to 0 at t = 1 and N_3 from 0 to 1.
        const samples = sampleBasis([0, 0, 0, 1, 1, 1, 2, 2, 2], 2);
        const at = samples.t.indexOf(1);
        expect(at).toBeGreaterThan(0);
        expect(1 - samples.t[at - 1]).toBeLessThan(1e-8);
        expect(samples.columns[2][at - 1]).toBeCloseTo(1, 7);
        expect(samples.columns[3][at - 1]).toBeCloseTo(0, 7);
        expect(samples.columns[2][at]).toBe(0);
        expect(samples.columns[3][at]).toBe(1);
    });

    test('a knot off the uniform grid is sampled exactly', () => {
        expect(sampleBasis([0, 0, 0, 0.123456, 2, 2, 2], 2).t).toContain(0.123456);
    });
});
