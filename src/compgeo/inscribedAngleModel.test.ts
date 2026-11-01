import {
    activeInscribedExampleId, analyseInscribedAngle, GLIDER_EXCLUSION_DEG, gliderTFromBoard, INSCRIBED_EXAMPLES, inscribedExample,
    excludeGliderGaps, InscribedCircleAnalysis, isInscribedExampleId, normaliseDegrees, resolveGliderT, stepGliderT,
} from './inscribedAngleModel';
import {thalesDot} from './circle';
import {RationalPoint} from './rational';

const RAD = Math.PI / 180;
const DEFAULT = inscribedExample('default').points;
const THALES = inscribedExample('thales').points;
const OBTUSE = [{x: 0, y: 0}, {x: 7, y: 0}, {x: 3, y: 1}];

function circleOf(points: readonly {x: number; y: number}[], t: number): InscribedCircleAnalysis {
    const analysis = analyseInscribedAngle(points, t);
    if (analysis.kind !== 'circle') throw new Error('expected a circle');
    return analysis;
}

function noNonFinite(value: unknown, path = 'value'): void {
    if (typeof value === 'number') expect(Number.isFinite(value), path).toBe(true);
    else if (value !== null && typeof value === 'object' && !('num' in value) && !('centre' in value && 'r2' in value)) {
        for (const [key, inner] of Object.entries(value)) noNonFinite(inner, `${path}.${key}`);
    }
}

test('default example: angle ACB, angle APB on C\'s arc, and the central angle', () => {
    for (const t of [90, 20, 350]) {
        const a = circleOf(DEFAULT, t);
        expect(a.angleAcb).toBeCloseTo(66.8014, 4);
        expect(a.centralAngle).toBeCloseTo(133.6028, 4);
        expect(a.glider?.relation).toBe('sameArc');
        expect(a.glider?.angleApb).toBeCloseTo(66.8014, 4);
        expect(a.diameter).toBe(false);
    }
    expect(circleOf(DEFAULT, inscribedExample('default').t).glider?.relation).toBe('sameArc');
});

test('default example: the other arc gives 180 - angle ACB = 113.1986', () => {
    for (const t of [250, 270, 300]) {
        const g = circleOf(DEFAULT, t).glider;
        expect(g?.relation).toBe('otherArc');
        expect(g?.angleApb).toBeCloseTo(113.1986, 4);
        expect(g?.expectedApb).toBeCloseTo(113.1986, 4);
    }
});

test('100 positions: 2 * angle APB equals the central angle on the major arc (degrees, 1e-12); on the minor arc the sum with ACB is 180', () => {
    const base = circleOf(DEFAULT, 90);
    let same = 0;
    let other = 0;
    for (let i = 0; i < 100; i++) {
        const t = 3.6 * i + 0.123;
        const a = circleOf(DEFAULT, t);
        const g = a.glider!;
        expect(g.t).toBeCloseTo(t, 12);
        if (g.relation === 'sameArc') {
            same++;
            expect(Math.abs(2 * g.angleApb - base.centralAngle)).toBeLessThan(1e-12);
        } else {
            other++;
            expect(Math.abs(g.angleApb + base.angleAcb - 180)).toBeLessThan(1e-12);
        }
    }
    expect(same).toBeGreaterThan(20);
    expect(other).toBeGreaterThan(20);
});

test('Thales: every lattice point on the circle (independent integer check) has exact dot zero; the model flags the diameter', () => {
    let found = 0;
    for (let x = -1; x <= 9; x++) {
        for (let y = -2; y <= 8; y++) {
            if ((x - 4) ** 2 + (y - 3) ** 2 !== 25) continue;
            found++;
            const isEnd = (x === 0 && y === 0) || (x === 8 && y === 6);
            const dot = thalesDot(RationalPoint.fromGrid({x, y}), RationalPoint.fromGrid(THALES[0]), RationalPoint.fromGrid(THALES[1]));
            if (!isEnd) expect(dot.isZero(), `(${x},${y})`).toBe(true);
        }
    }
    expect(found).toBe(12);
    const a = circleOf(THALES, 90);
    expect(a.diameter).toBe(true);
    expect(a.centralAngle).toBeCloseTo(180, 10);
    expect(a.angleAcb).toBeCloseTo(90, 10);
    expect(a.circle.centre.x.toNumber()).toBe(4);
    expect(a.circle.r2.toNumber()).toBe(25);
    expect(circleOf(DEFAULT, 90).diameter).toBe(false);
    // C = (7, 7) is another lattice point of the Thales circle: the flag follows the chord A, B, not C
    expect(circleOf([THALES[0], THALES[1], {x: 7, y: 7}], 90).diameter).toBe(true);
    expect(circleOf([{x: 0, y: 0}, {x: 7, y: 1}, {x: 8, y: 6}], 90).diameter).toBe(false);
});

test('exclusion: A, B and the gap edges move out in the direction of motion, or to the nearer edge', () => {
    const [ga, gb] = circleOf(DEFAULT, 90).gapCentres;
    const h = GLIDER_EXCLUSION_DEG;
    expect(h).toBe(0.5);
    for (const centre of [ga, gb]) {
        const up = resolveGliderT(DEFAULT, centre, 1);
        const down = resolveGliderT(DEFAULT, centre, -1);
        expect(normaliseDegrees(up - centre)).toBeCloseTo(h, 9);
        expect(normaliseDegrees(centre - down)).toBeCloseTo(h, 9);
        const inside = resolveGliderT(DEFAULT, centre + 0.2, -1);
        expect(normaliseDegrees(centre - inside)).toBeCloseTo(h, 9);
        expect(normaliseDegrees(resolveGliderT(DEFAULT, centre + 0.2) - centre)).toBeCloseTo(h, 9);
        expect(normaliseDegrees(centre - resolveGliderT(DEFAULT, centre - 0.2))).toBeCloseTo(h, 9);
        // the edges themselves are allowed
        expect(resolveGliderT(DEFAULT, centre + h + 1e-6)).toBeCloseTo(centre + h + 1e-6, 9);
    }
    // glider on the model side never sits in a gap
    for (const centre of [ga, gb]) {
        for (const off of [-0.49, -0.1, 0, 0.1, 0.49]) {
            const g = circleOf(DEFAULT, centre + off).glider!;
            let d = Math.abs(g.t - centre);
            d = Math.min(d, 360 - d);
            expect(d).toBeGreaterThanOrEqual(h - 1e-8);
        }
    }
});

test('a step across a gap skips it; a drag uses the previous t for the direction', () => {
    const [ga] = circleOf(DEFAULT, 90).gapCentres;
    const before = ga - 0.8;
    const after = stepGliderT(DEFAULT, before, 1);
    expect(normaliseDegrees(after - ga)).toBeCloseTo(0.5, 9);
    // landing nearer the entry edge still crosses to the far edge
    expect(normaliseDegrees(stepGliderT(DEFAULT, ga - 1.2, 1) - ga)).toBeCloseTo(0.5, 9);
    expect(normaliseDegrees(ga - stepGliderT(DEFAULT, ga + 1.2, -1))).toBeCloseTo(0.5, 9);
    const back = stepGliderT(DEFAULT, ga + 0.8, -1);
    expect(normaliseDegrees(ga - back)).toBeCloseTo(0.5, 9);
    const o = circleOf(DEFAULT, 90).circle.centre;
    const x = o.x.toNumber() + 5 * Math.cos((ga + 0.1) * RAD);
    const y = o.y.toNumber() + 5 * Math.sin((ga + 0.1) * RAD);
    expect(normaliseDegrees(gliderTFromBoard(DEFAULT, x, y, ga + 5)! - ga)).toBeCloseTo(359.5, 8); // moving down: the lower edge, ga - 0.5
    expect(gliderTFromBoard(DEFAULT, NaN, 0)).toBeUndefined();
    expect(gliderTFromBoard([{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}], 1, 1)).toBeUndefined();
});

test('t is normalised: negative, at or above 360, and huge values', () => {
    expect(normaliseDegrees(-90)).toBe(270);
    expect(normaliseDegrees(450)).toBe(90);
    expect(normaliseDegrees(360)).toBe(0);
    expect(normaliseDegrees(-720)).toBe(0);
    expect(Object.is(normaliseDegrees(-0), 0)).toBe(true);
    expect(circleOf(DEFAULT, -270).glider?.t).toBeCloseTo(90, 12);
    expect(circleOf(DEFAULT, 450).glider?.t).toBeCloseTo(90, 12);
    expect(circleOf(DEFAULT, 1e12 + 90).glider?.t).toBeGreaterThanOrEqual(0);
    expect(circleOf(DEFAULT, 1e12 + 90).glider?.t).toBeLessThan(360);
});

test('obtuse C on the minor arc: central angle is 360 - angle AOB, and the arcs are classified from C', () => {
    const a = circleOf(OBTUSE, 90);
    const expected = 180 - Math.atan2(7, 11) / RAD; // CA = (-3,-1), CB = (4,-1): cross 7, dot -11
    expect(a.angleAcb).toBeCloseTo(expected, 10);
    expect(a.angleAcb).toBeGreaterThan(90);
    expect(a.centralAngle).toBeCloseTo(2 * a.angleAcb, 9); // the reflex arc
    expect(a.centralAngle).toBeGreaterThan(180);
    // C = (3,1) is above AB on the minor arc, so the centre lies below AB
    const above = circleOf(OBTUSE, 90).glider!; // north of O
    const below = circleOf(OBTUSE, 270).glider!;
    const c = a.circle.centre.y.toNumber();
    expect(c).toBeLessThan(0); // the centre lies below AB because C is on the minor arc
    expect(above.board.y).toBeGreaterThan(0);
    expect(above.relation).toBe('sameArc');
    expect(above.angleApb).toBeCloseTo(a.angleAcb, 10);
    expect(below.relation).toBe('otherArc');
    expect(below.angleApb).toBeCloseTo(180 - a.angleAcb, 10);
    expect(2 * below.angleApb).toBeCloseTo(360 - a.centralAngle, 9);
});

test('degenerate and missing input give typed results with no NaN and no throw', () => {
    for (const points of [[{x: 0, y: 0}, {x: 1, y: 1}, {x: 3, y: 3}], [{x: 2, y: 2}, {x: 2, y: 2}, {x: 2, y: 2}], [{x: 0, y: 0}, {x: 0, y: 0}, {x: 5, y: 1}]]) {
        const a = analyseInscribedAngle(points, 45);
        expect(a).toEqual({kind: 'degenerate'});
        expect(resolveGliderT(points, -45)).toBe(315);
        expect(stepGliderT(points, 359.5, 1)).toBe(0.5);
    }
    expect(analyseInscribedAngle([], 0)).toEqual({kind: 'missing', have: 0});
    expect(analyseInscribedAngle(DEFAULT.slice(0, 2), 0)).toEqual({kind: 'missing', have: 2});
});

test('no NaN in the analysis of the examples, and a huge circle has no board and no glider', () => {
    for (const example of INSCRIBED_EXAMPLES) noNonFinite(analyseInscribedAngle(example.points, example.t));
    // Nearly collinear: the radius is about M^2 / 2 = 5.6e14, beyond BOARD_COORDINATE_CAP.
    const M = 33554432;
    const huge = analyseInscribedAngle([{x: -M, y: 0}, {x: M, y: 0}, {x: 0, y: 1}], 90);
    expect(huge.kind).toBe('circle');
    if (huge.kind !== 'circle') return;
    noNonFinite({...huge, circle: undefined});
    expect(huge.board).toBeUndefined();
    expect(huge.glider).toBeUndefined();
});

test('example helpers', () => {
    expect(isInscribedExampleId('thales')).toBe(true);
    expect(isInscribedExampleId('nope')).toBe(false);
    expect(() => inscribedExample('nope' as 'default')).toThrow(RangeError);
    expect(activeInscribedExampleId('default', DEFAULT)).toBe('default');
    expect(activeInscribedExampleId('default', THALES)).toBeUndefined();
    expect(activeInscribedExampleId(undefined, DEFAULT)).toBeUndefined();
    for (const example of INSCRIBED_EXAMPLES) {
        expect(Number.isInteger(example.t)).toBe(true);
        expect(circleOf(example.points, example.t).glider?.relation).toBe('sameArc');
        expect(circleOf(example.points, example.t).glider?.t).toBe(example.t);
    }
});

test('exclusion across 0/360 and with overlapping gaps (A and B within one degree)', () => {
    const outside = (gaps: number[], t: number) => gaps.every(g => Math.abs(normaliseDegrees(t - g + 180) - 180) >= GLIDER_EXCLUSION_DEG - 1e-9);
    expect(excludeGliderGaps([359.8, 0.2], 0, 1)).toBeCloseTo(0.7, 9);
    expect(excludeGliderGaps([359.8, 0.2], 0, -1)).toBeCloseTo(359.3, 9);
    expect(excludeGliderGaps([359.8, 120], 0.1, 1)).toBeCloseTo(0.3, 9);
    expect(excludeGliderGaps([359.8, 120], 0.1, -1)).toBeCloseTo(359.3, 9);
    for (const t of [0, 0.1, 0.2, 0.3, 0.4, 359.9]) {
        for (const direction of [-1, 0, 1]) {
            const value = excludeGliderGaps([0, 0.4], t, direction);
            expect(Number.isFinite(value)).toBe(true);
            expect(outside([0, 0.4], value)).toBe(true);
        }
    }
    expect(excludeGliderGaps([0, 0.4], 0.1, 1)).toBeCloseTo(0.9, 9);
    expect(excludeGliderGaps([0, 0.4], 0.3, -1)).toBeCloseTo(359.5, 9);
});
