import {cleanNumber, gridUnits} from './numbers';
import {gridValue} from '../graphs/functions/BaseFunctionGraph';

test('gridUnits returns the integer step count of a value on the grid, noise included', () => {
    expect(gridUnits(0.85, 0.05)).toBe(17);
    expect(gridUnits(0.8500000000000001, 0.05)).toBe(17);
    expect(gridUnits(0.1 + 0.2, 0.01)).toBe(30);
    expect(gridUnits(0, 0.05)).toBe(0);
    expect(gridUnits(7, 1)).toBe(7);
});

test('gridUnits handles steps of +-0.5 in both signs', () => {
    expect(gridUnits(0.5, 0.5)).toBe(1);
    expect(gridUnits(-0.5, 0.5)).toBe(-1);
    expect(gridUnits(-1.5, 0.5)).toBe(-3);
    expect(gridUnits(0.25, 0.5)).toBeUndefined();
    expect(gridUnits(-0.25, 0.5)).toBeUndefined();
});

test('gridUnits rejects off-grid, non-finite and non-number values instead of rounding them', () => {
    expect(gridUnits(0.851, 0.05)).toBeUndefined();
    expect(gridUnits(0.125, 0.01)).toBeUndefined();
    expect(gridUnits(NaN, 0.01)).toBeUndefined();
    expect(gridUnits(Infinity, 0.01)).toBeUndefined();
    expect(gridUnits('0.5', 0.5)).toBeUndefined();
    expect(gridUnits(undefined, 0.5)).toBeUndefined();
});

test('gridValue is the exact decimal of the grid point and never produces -0', () => {
    expect(gridValue(0.8500000000000001, 0.05)).toBe(0.85);
    expect(gridValue(0.1 + 0.2, 0.01)).toBe(0.3);
    expect(gridValue(-0.5, 0.5)).toBe(-0.5);
    expect(Object.is(gridValue(-1e-12, 0.5), 0)).toBe(true);
    expect(gridValue(0.851, 0.05)).toBeUndefined();
});

test('cleanNumber removes noise and the sign of zero', () => {
    expect(cleanNumber(0.1 + 0.2)).toBe(0.3);
    expect(Object.is(cleanNumber(-0), 0)).toBe(true);
    expect(cleanNumber(Math.PI)).toBe(3.141592654);
});
