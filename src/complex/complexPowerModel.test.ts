import {describe, expect, it} from 'vitest';
import {
    applyComplexPowerAction, arrowToward, DEFAULT_COMPLEX_POWER_STATE, deriveComplexPower, exactModulus, insideView, parseComplexPowerState,
    serializeComplexPowerState, snapDragCoordinate, superscript, typedCoordinate, typedExponent, VIEW_LIMIT, zOf,
} from './complexPowerModel';

describe('complex power model', () => {
    it('defaults to z = 1 + i and n = 5', () => {
        expect(DEFAULT_COMPLEX_POWER_STATE).toEqual({A: 20, B: 20, n: 5});
        expect(zOf(DEFAULT_COMPLEX_POWER_STATE)).toEqual({re: 1, im: 1});
    });

    it('round-trips through serialize and parse', () => {
        const state = {A: -7, B: 33, n: 8};
        const stored = serializeComplexPowerState(state);
        expect(stored).toEqual({re: -0.35, im: 1.65, n: 8});
        expect(parseComplexPowerState(stored)).toEqual({ok: true, value: state});
        expect(parseComplexPowerState({...stored, extra: 1})).toEqual({ok: true, value: state});
    });

    it('rejects malformed data with a field, a reason and the accepted range', () => {
        const reason = (data: unknown) => {
            const result = parseComplexPowerState(data);
            return result.ok ? 'ok' : `${result.error.field}:${result.error.reason}`;
        };
        expect(reason(null)).toBe('state:not-an-object');
        expect(reason([1])).toBe('state:not-an-object');
        expect(reason({im: 0, n: 2})).toBe('re:missing');
        expect(reason({re: 'x', im: 0, n: 2})).toBe('re:not-finite');
        expect(reason({re: NaN, im: 0, n: 2})).toBe('re:not-finite');
        expect(reason({re: 0.03, im: 0, n: 2})).toBe('re:off-grid');
        expect(reason({re: 2.05, im: 0, n: 2})).toBe('re:out-of-range');
        expect(reason({re: 1, im: -2.05, n: 2})).toBe('im:out-of-range');
        expect(reason({re: 1, im: 1, n: 0})).toBe('n:out-of-range');
        expect(reason({re: 1, im: 1, n: 9})).toBe('n:out-of-range');
        expect(reason({re: 1, im: 1, n: 2.5})).toBe('n:off-grid');
        const error = parseComplexPowerState({re: 3, im: 0, n: 2});
        expect(error.ok ? undefined : error.error).toMatchObject({min: -2, max: 2, step: 0.05});
    });

    it('refuses a typed value instead of rounding or clamping it', () => {
        expect(typedCoordinate(0.35)).toEqual({ok: true, value: 7});
        const negativeZero = typedCoordinate(-0);
        expect(negativeZero.ok && Object.is(negativeZero.value, 0)).toBe(true);
        expect(typedCoordinate(0.351).ok).toBe(false);
        expect(typedCoordinate(2.5).ok).toBe(false);
        expect(typedExponent(3)).toEqual({ok: true, value: 3});
        expect(typedExponent(1.5).ok).toBe(false);
        expect(typedExponent(Infinity).ok).toBe(false);
    });

    it('snaps a drag to the grid, clamps it, and ignores a non-finite coordinate', () => {
        expect(snapDragCoordinate(0.372)).toBe(7);
        expect(snapDragCoordinate(5)).toBe(40);
        expect(snapDragCoordinate(-5)).toBe(-40);
        expect(snapDragCoordinate(NaN)).toBeUndefined();
        expect(Object.is(snapDragCoordinate(-0.001), 0)).toBe(true);
    });

    it('applies set-z, set-n and step in sequence and refuses invalid payloads', () => {
        let state = DEFAULT_COMPLEX_POWER_STATE;
        for (const action of [{operation: 'set-z', re: 0.5, im: -1}, {operation: 'set-n', n: 3}, {operation: 'step'}, {operation: 'step', count: 7}]) {
            const result = applyComplexPowerAction(state, action);
            expect(result.ok).toBe(true);
            if (result.ok) state = result.value;
        }
        expect(state).toEqual({A: 10, B: -20, n: 8});
        expect(applyComplexPowerAction(state, {operation: 'set-z', re: 0.5, im: 9}).ok).toBe(false);
        expect(applyComplexPowerAction(state, {operation: 'step', count: 8}).ok).toBe(false);
        expect(applyComplexPowerAction(state, {operation: 'fly'}).ok).toBe(false);
        expect(applyComplexPowerAction(state, 3).ok).toBe(false);
    });

    it('has exact values for z = 1 + i', () => {
        const d = deriveComplexPower({A: 20, B: 20, n: 5});
        expect(d.exactRe).toEqual({numerator: -4, denominator: 1});
        expect(d.exactIm).toEqual({numerator: -4, denominator: 1});
        expect(d.powers[4]).toEqual({re: -4, im: -4});
        expect(d.exactModulus).toEqual({coefficient: 4, radicand: 2, denominator: 1});
        expect(d.unwrappedDegrees).toBeCloseTo(225, 9);
        expect(d.principalDegrees).toBeCloseTo(-135, 9);
        expect(d.isReal).toBe(false);
        const eighth = deriveComplexPower({A: 20, B: 20, n: 8});
        expect(eighth.isReal).toBe(true);
        expect(eighth.exactRe).toEqual({numerator: 16, denominator: 1});
        expect(eighth.exactModulus).toEqual({coefficient: 16, radicand: 1, denominator: 1});
    });

    it('obeys de Moivre: modulus r^n and argument n phi for every grid z and n', () => {
        for (let A = -40; A <= 40; A += 7) for (let B = -40; B <= 40; B += 9) for (let n = 1; n <= 8; n++) {
            if (A === 0 && B === 0) continue;
            const d = deriveComplexPower({A, B, n});
            const r = Math.hypot(A, B) / 20;
            expect(d.modulus / r ** n).toBeCloseTo(1, 9);
            const last = d.powers[n - 1];
            expect(Math.hypot(last.re, last.im) / r ** n).toBeCloseTo(1, 6);
            expect(d.unwrappedDegrees).toBeCloseTo(n * ((Math.atan2(B, A) * 180) / Math.PI), 9);
            const principal = d.principalDegrees as number;
            expect(principal).toBeGreaterThan(-180);
            expect(principal).toBeLessThanOrEqual(180);
            const diff = ((((d.unwrappedDegrees as number) - principal) % 360) + 360) % 360;
            expect(Math.min(diff, 360 - diff)).toBeCloseTo(0, 6);
        }
    });

    it('keeps exact fractions and radicals in lowest terms', () => {
        const half = deriveComplexPower({A: 10, B: 0, n: 3});
        expect(half.exactRe).toEqual({numerator: 1, denominator: 8});
        expect(half.exactIm).toEqual({numerator: 0, denominator: 1});
        expect(exactModulus(10, 0, 3)).toEqual({coefficient: 1, radicand: 1, denominator: 8});
        for (const [A, B, n] of [[3, 4, 3], [20, 20, 7], [-13, 31, 8], [40, 40, 8]] as const) {
            const m = exactModulus(A, B, n);
            const value = (m.coefficient * Math.sqrt(m.radicand)) / m.denominator;
            expect(value / (Math.hypot(A, B) / 20) ** n).toBeCloseTo(1, 9);
        }
        expect(exactModulus(0, 0, 4)).toEqual({coefficient: 0, radicand: 1, denominator: 1});
    });

    it('decides the unit circle and equality to 1 exactly', () => {
        const unit = deriveComplexPower({A: 16, B: 12, n: 8});
        expect(unit.onUnitCircle).toBe(true);
        expect(unit.zero).toBe(false);
        expect(unit.isOne).toBe(false);
        expect(deriveComplexPower({A: 20, B: 0, n: 8}).isOne).toBe(true);
        expect(deriveComplexPower({A: 0, B: 20, n: 4}).isOne).toBe(true);
        expect(deriveComplexPower({A: 0, B: 20, n: 3}).isOne).toBe(false);
        expect(deriveComplexPower({A: 17, B: 11, n: 2}).onUnitCircle).toBe(false);
        expect(deriveComplexPower({A: 10, B: 10, n: 2}).onUnitCircle).toBe(false);
    });

    it('treats z = 0 without an argument', () => {
        const d = deriveComplexPower({A: 0, B: 0, n: 4});
        expect(d.zero).toBe(true);
        expect(d.unwrappedDegrees).toBeUndefined();
        expect(d.principalDegrees).toBeUndefined();
        expect(d.modulus).toBe(0);
        expect(d.isReal).toBe(true);
    });

    it('draws a power beyond the view as an arrow that ends inside it', () => {
        expect(insideView({re: VIEW_LIMIT, im: -VIEW_LIMIT})).toBe(true);
        expect(insideView({re: 2.6, im: 0})).toBe(false);
        const {tail, tip} = arrowToward({re: 6, im: -3});
        expect(insideView(tip)).toBe(true);
        expect(tip.im / tip.re).toBeCloseTo(-0.5, 9);
        expect(Math.hypot(tail.re, tail.im)).toBeLessThan(Math.hypot(tip.re, tip.im));
        expect(arrowToward({re: 0, im: 0}).tip).toEqual({re: 0, im: 0});
    });

    it('writes superscript exponents', () => {
        expect(superscript(5)).toBe('⁵');
        expect(superscript(10)).toBe('¹⁰');
    });
});
