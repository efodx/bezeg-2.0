import {describe, expect, it} from 'vitest';
import {orient} from '../../compgeo/predicates';
import {formatHalf, formatSigned, orientationReadout, triangleFitsLabel} from './orientationReadout';

const p = {x: 0, y: 0};
const q = {x: 4, y: 0};

describe('orientationReadout', () => {
    it('gives the exact value and the turn of the three task examples', () => {
        expect(orientationReadout([p, q, {x: 3, y: 2}])).toEqual({kind: 'turn', value: 8, turn: 'left'});
        expect(orientationReadout([p, q, {x: 3, y: -2}])).toEqual({kind: 'turn', value: -8, turn: 'right'});
        expect(orientationReadout([p, q, {x: 2, y: 0}])).toEqual({kind: 'turn', value: 0, turn: 'collinear'});
    });

    it('reports how many points exist when fewer than three', () => {
        expect(orientationReadout([])).toEqual({kind: 'missing', have: 0});
        expect(orientationReadout([p, q])).toEqual({kind: 'missing', have: 2});
    });

    it('negates the value when any two points are swapped', () => {
        const r = {x: 3, y: 2};
        const base = orientationReadout([p, q, r]);
        for (const swapped of [[q, p, r], [p, r, q], [r, q, p]]) {
            const other = orientationReadout(swapped);
            expect(other.kind === 'turn' && base.kind === 'turn' && other.value).toBe(base.kind === 'turn' ? -base.value : NaN);
        }
    });

    it('the turn agrees with orient over a grid of r, and collinear exactly on the line', () => {
        for (let x = -3; x <= 7; x++) {
            for (let y = -3; y <= 3; y++) {
                const readout = orientationReadout([p, q, {x, y}]);
                if (readout.kind !== 'turn') throw new Error('missing');
                const sign = orient(p, q, {x, y});
                expect(readout.turn).toBe(sign > 0 ? 'left' : sign < 0 ? 'right' : 'collinear');
                expect(Math.sign(readout.value)).toBe(sign);
                expect(readout.turn === 'collinear').toBe(y === 0);
            }
        }
    });
});

describe('formatting', () => {
    it('writes signed integers with the true minus sign', () => {
        expect(formatSigned(8)).toBe('+8');
        expect(formatSigned(-8)).toBe('−8');
        expect(formatSigned(0)).toBe('0');
        expect(formatSigned(42n)).toBe('+42');
        expect(formatSigned(-36n)).toBe('−36');
        expect(formatSigned(0n)).toBe('0');
    });

    it('halves a doubled value exactly, with a decimal comma in Slovenian', () => {
        expect(formatHalf(42n, 'sl')).toBe('21');
        expect(formatHalf(21n, 'sl')).toBe('10,5');
        expect(formatHalf(21n, 'en')).toBe('10.5');
        expect(formatHalf(-36n, 'en')).toBe('−18');
        expect(formatHalf(1n, 'en')).toBe('0.5');
        expect(formatHalf(0n, 'en')).toBe('0');
    });
});

describe('triangleFitsLabel', () => {
    it('a normal triangle fits a label; thin, tiny and degenerate ones do not', () => {
        expect(triangleFitsLabel({x: 0, y: 0}, {x: 4, y: 0}, {x: 3, y: 2})).toBe(true);
        expect(triangleFitsLabel({x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1})).toBe(false);
        expect(triangleFitsLabel({x: 0, y: 0}, {x: 10, y: 1}, {x: 21, y: 2})).toBe(false);
        expect(triangleFitsLabel({x: 0, y: 0}, {x: 4, y: 0}, {x: 2, y: 0})).toBe(false);
        expect(triangleFitsLabel({x: 1, y: 1}, {x: 1, y: 1}, {x: 1, y: 1})).toBe(false);
    });
});
