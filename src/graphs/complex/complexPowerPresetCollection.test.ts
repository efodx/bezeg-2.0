import {afterEach, describe, expect, it} from 'vitest';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_COMPLEX_POWER_STATE} from '../../complex/complexPowerModel';
import {COMPLEX_POWER_PRESET_KEY, complexPowerPresetCollection, complexPowerPresetData} from './complexPowerPresetCollection';

afterEach(() => setLanguage('sl'));

const rejection = (data: unknown): string | undefined => {
    const result = complexPowerPresetCollection.check(data);
    return 'rejection' in result ? renderMessage(result.rejection) : undefined;
};

describe('complex power preset collection', () => {
    it('keeps its file key and round-trips the stored state', () => {
        expect(COMPLEX_POWER_PRESET_KEY).toBe('complex-power');
        const data = complexPowerPresetData({A: -7, B: 33, n: 8});
        expect(data).toEqual([['ComplexPower', {re: -0.35, im: 1.65, n: 8}]]);
        const checked = complexPowerPresetCollection.check(JSON.parse(JSON.stringify(data)));
        expect('data' in checked && checked.data).toEqual(data);
        expect(complexPowerPresetData(DEFAULT_COMPLEX_POWER_STATE)).toEqual([['ComplexPower', {re: 1, im: 1, n: 5}]]);
    });

    it('rejects malformed data with an actionable message in both languages', () => {
        const at = (language: 'sl' | 'en', data: unknown) => { setLanguage(language); return rejection(data); };
        const outOfRange = [['ComplexPower', {re: 3, im: 0, n: 2}]];
        expect(at('en', outOfRange)).toBe('Re z must be between −2 and 2.');
        expect(at('sl', outOfRange)).toMatch(/^Re z .*−2.*2/);
        const offGrid = [['ComplexPower', {re: 0.03, im: 0, n: 2}]];
        expect(at('en', offGrid)).toBe('Re z must be a multiple of 0.05.');
        expect(at('sl', offGrid)).toContain('0,05');
        expect(at('sl', offGrid)).not.toContain('0.05');
        expect(at('en', [['ComplexPower', {re: 1, im: 1, n: 9}]])).toBe('The exponent n must be between 1 and 8.');
        expect(at('en', [['ComplexPower', {re: 1, n: 2}]])).toBe('Im z is missing.');
        expect(at('sl', [['ComplexPower', {re: 1, n: 2}]])).toMatch(/^Im z /);
        expect(at('en', [['ComplexPower', 5]])).toBe('The file must hold an object with the fields re, im and n.');
        for (const language of ['sl', 'en'] as const) {
            for (const data of [outOfRange, offGrid, [['ComplexPower', {re: 1, n: 2}]]]) expect(at(language, data)).not.toMatch(/\{\w+\}|undefined|NaN/);
        }
        expect(at('sl', outOfRange)).not.toBe(at('en', outOfRange));
    });

    it('rejects a wrong shape, a wrong key and extra entries', () => {
        for (const data of [null, 'x', {}, [], [['Other', {re: 1, im: 1, n: 2}]], [['ComplexPower']], [['ComplexPower', {re: 1, im: 1, n: 2}], ['ComplexPower', {re: 1, im: 1, n: 2}]]]) {
            expect(rejection(data), JSON.stringify(data)).toBeTruthy();
        }
    });

    it('accepts only an initialized flag as graph state', () => {
        const check = (state: unknown) => complexPowerPresetCollection.checkGraphState?.(state);
        expect(check({})).toBeUndefined();
        expect(check({initialized: true})).toBeUndefined();
        expect(check({initialized: 'yes'})).toBeDefined();
        expect(check({A: 1})).toBeDefined();
        expect(check(null)).toBeDefined();
    });
});
