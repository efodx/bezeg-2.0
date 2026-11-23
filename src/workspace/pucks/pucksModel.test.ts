import {describe, expect, it} from 'vitest';
import {fineLevel, isJump, parseEntry, placeRulerLeft, rulerTicks, rulerWidth, snapValue, widestChars, widestCountChars} from './pucksModel';

const p = {min: -2, max: 2, step: 0.25};

describe('puck model', () => {
    it('snaps to the grid from min and clamps', () => {
        expect(snapValue(0.3, p)).toBe(0.25);
        expect(snapValue(9, p)).toBe(2);
        expect(snapValue(-9, p)).toBe(-2);
        expect(snapValue(0.1 + 0.2, {min: 0, max: 1, step: 0.1})).toBe(0.3);
    });

    it('reserves the widest formatted value over the declared range, sign and step decimals included', () => {
        expect(widestChars({min: 0, max: 10, step: 1}, 'sl')).toBe(2);
        // "9,75" is reachable on a 0.25 grid even though both bounds are whole.
        expect(widestChars({min: 0, max: 10, step: 0.25}, "sl")).toBe(4);
        // The minus sign counts.
        expect(widestChars({min: -5, max: 5, step: 1}, 'sl')).toBe(2);
        expect(widestChars({min: 0, max: 1, step: 0.001, maxDecimals: 3}, 'sl')).toBe(5);
        expect(widestCountChars({min: 1, max: 12})).toBe(2);
    });

    it('accepts both decimal conventions and refuses out of range and non-numbers without clamping', () => {
        expect(parseEntry('1,5', p)).toEqual({ok: true, value: 1.5});
        expect(parseEntry('1.5', p)).toEqual({ok: true, value: 1.5});
        expect(parseEntry('−0,5', p)).toEqual({ok: true, value: -0.5});
        expect(parseEntry('3', p)).toEqual({ok: false, reason: 'range'});
        expect(parseEntry('abc', p)).toEqual({ok: false, reason: 'number'});
        expect(parseEntry('', p)).toEqual({ok: false, reason: 'number'});
        expect(parseEntry('2,5', p, true)).toEqual({ok: false, reason: 'whole'});
    });

    it('calls a change of more than one step a jump', () => {
        expect(isJump(0, 0.25, 0.25)).toBe(false);
        expect(isJump(0, 0.5, 0.25)).toBe(true);
    });

    it('gets finer the further the pointer is from the puck', () => {
        expect(fineLevel(0).factor).toBe(1);
        expect(fineLevel(60).factor).toBe(0.25);
        expect(fineLevel(200).factor).toBe(1 / 16);
    });

    it('keeps the ruler inside the bounds and the window', () => {
        expect(rulerWidth({width: 1000}, 1400)).toBe(360);
        expect(rulerWidth({width: 200}, 1400)).toBe(184);
        const bounds = {left: 100, right: 500};
        expect(placeRulerLeft({left: 90, width: 100}, bounds, 360, 1400)).toBe(108);
        expect(placeRulerLeft({left: 480, width: 100}, bounds, 360, 1400)).toBe(132);
        expect(placeRulerLeft({left: 0, width: 10}, undefined, 360, 300)).toBe(8);
    });

    it('draws only ticks inside the range', () => {
        const ticks = rulerTicks({min: 0, max: 1}, 0.02, 300, 300);
        expect(ticks.every(tick => tick.value >= 0 && tick.value <= 1)).toBe(true);
        expect(ticks.some(tick => tick.major)).toBe(true);
    });
});
