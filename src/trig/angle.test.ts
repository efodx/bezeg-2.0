import {
    addAngles, angleFromDegrees, angleFromHalfDegrees, angleFromPiMultiple, halfTurn, onAxis, quadrant,
    reflectInXAxis, reflectInYAxis, specialValue, toRadians,
} from './angle';

const all = Array.from({length: 720}, (_, h) => angleFromHalfDegrees(h));

describe('Angle construction', () => {
    it('wraps to [0,720)', () => {
        expect(angleFromHalfDegrees(720).halfDegrees).toBe(0);
        expect(angleFromHalfDegrees(-1).halfDegrees).toBe(719);
        expect(angleFromHalfDegrees(1500).halfDegrees).toBe(60);
    });
    it('rejects non-integers and non-finite values', () => {
        for (const v of [0.5, NaN, Infinity, -Infinity]) expect(() => angleFromHalfDegrees(v)).toThrow(RangeError);
        expect(() => angleFromDegrees(NaN)).toThrow(RangeError);
        expect(() => angleFromPiMultiple(Infinity)).toThrow(RangeError);
    });
    it('snaps degrees and pi multiples to the nearest half-degree', () => {
        expect(angleFromDegrees(200).halfDegrees).toBe(400);
        expect(angleFromDegrees(30.2).halfDegrees).toBe(60);
        expect(angleFromDegrees(30.3).halfDegrees).toBe(61);
        expect(angleFromDegrees(-90).halfDegrees).toBe(540);
        expect(angleFromPiMultiple(0.75).halfDegrees).toBe(270);
        expect(angleFromPiMultiple(1 / 6).halfDegrees).toBe(60);
        expect(angleFromPiMultiple(2).halfDegrees).toBe(0);
    });
    it('converts to radians as pi h / 360', () => {
        for (const a of all) expect(toRadians(a)).toBe((Math.PI * a.halfDegrees) / 360);
        expect(toRadians(angleFromDegrees(135))).toBeCloseTo(2.35619, 5);
        expect(toRadians(angleFromDegrees(180))).toBe(Math.PI);
    });
});

describe('quadrant and axis (integer tests on all 720 states)', () => {
    it('partitions the states and agrees with an independent degree-based rule', () => {
        const axes = new Map<number, string>([[0, 'positive-x'], [180, 'positive-y'], [360, 'negative-x'], [540, 'negative-y']]);
        for (const a of all) {
            const h = a.halfDegrees;
            const deg = h / 2;
            const expectedQ = deg % 90 === 0 ? undefined : deg < 90 ? 1 : deg < 180 ? 2 : deg < 270 ? 3 : 4;
            expect(quadrant(a)).toBe(expectedQ);
            expect(onAxis(a)).toBe(axes.get(h));
            expect(quadrant(a) === undefined).toBe(onAxis(a) !== undefined);
        }
    });
    it('names the quadrants of the default examples', () => {
        expect(quadrant(angleFromDegrees(114.5))).toBe(2);
        expect(quadrant(angleFromDegrees(200))).toBe(3);
        expect(quadrant(angleFromDegrees(300))).toBe(4);
        expect(quadrant(angleFromDegrees(30))).toBe(1);
    });
});

describe('specialValue closed table', () => {
    const SQ3 = Math.sqrt(3) / 2;
    const SQ2 = Math.SQRT1_2;
    const numeric = (t: string): number => {
        const sign = t.startsWith('-') ? -1 : 1;
        const u = t.replace('-', '');
        const v = u === '\\frac{\\sqrt{3}}{2}' ? SQ3 : u === '\\frac{\\sqrt{2}}{2}' ? SQ2 : u === '\\frac{1}{2}' ? 0.5 : Number(u);
        return sign * v;
    };
    it('is defined exactly for multiples of 30 and 45 degrees', () => {
        for (const a of all) {
            const deg = a.halfDegrees / 2;
            expect(specialValue(a) !== undefined).toBe(deg % 30 === 0 || deg % 45 === 0);
        }
        expect(all.filter((a) => specialValue(a)).length).toBe(12 + 8 - 4);
    });
    it('matches Math.sin and Math.cos to 1e-15 for every entry', () => {
        for (const a of all) {
            const v = specialValue(a);
            if (!v) continue;
            expect(Math.abs(numeric(v.sin) - Math.sin(toRadians(a)))).toBeLessThanOrEqual(1e-15);
            expect(Math.abs(numeric(v.cos) - Math.cos(toRadians(a)))).toBeLessThanOrEqual(1e-15);
        }
    });
    it('gives the spec radicals', () => {
        expect(specialValue(angleFromDegrees(60))).toEqual({sin: '\\frac{\\sqrt{3}}{2}', cos: '\\frac{1}{2}'});
        expect(specialValue(angleFromDegrees(135))).toEqual({sin: '\\frac{\\sqrt{2}}{2}', cos: '-\\frac{\\sqrt{2}}{2}'});
        expect(specialValue(angleFromDegrees(180))).toEqual({sin: '0', cos: '-1'});
        expect(specialValue(angleFromDegrees(270))).toEqual({sin: '-1', cos: '0'});
        expect(specialValue(angleFromDegrees(200))).toBeUndefined();
    });
});

describe('integer symmetric images', () => {
    it('are 360-h, 720-h and h+360 on every state', () => {
        for (const a of all) {
            const h = a.halfDegrees;
            expect(reflectInYAxis(a).halfDegrees).toBe((((360 - h) % 720) + 720) % 720);
            expect(reflectInXAxis(a).halfDegrees).toBe((720 - h) % 720);
            expect(halfTurn(a).halfDegrees).toBe((h + 360) % 720);
        }
    });
    it('adds angles by integer addition', () => {
        expect(addAngles(angleFromDegrees(60), angleFromDegrees(45)).halfDegrees).toBe(210);
        const a = angleFromDegrees(350);
        expect(addAngles(a, a).halfDegrees).toBe(680);
    });
});
