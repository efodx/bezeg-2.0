import {Rational, RationalPoint} from '../compgeo/rational';
import {apply} from './isometry2';
import {
    CLASSIFY_EXAMPLES, CLASSIFY_EXAMPLE_IDS, DEFAULT_ISOMETRY_STATE, deriveIsometry, deriveMotion, FRIEZE_WINDOW, friezeGeneratorsOf, friezePolygons,
    matchingClassifyExample, parseIsometryState, serializeIsometryState, snapCoordinateInput, snapPeriodInput, snapRatioInput, snapRosetteNInput,
    type FriezeFeatures, type IsometryState, type MirrorSpec,
} from './isometryModel';

const q = (num: number, den = 1) => Rational.of(num, den);
const at = (p: RationalPoint, x: Rational, y: Rational) => p.x.equals(x) && p.y.equals(y);
const mirror = (px: number, py: number, qx: number, qy: number): MirrorSpec => ({p: {x: px, y: py}, q: {x: qx, y: qy}});
const withState = (patch: Partial<IsometryState>): IsometryState => ({...DEFAULT_ISOMETRY_STATE, ...patch});
const features = (vertical: boolean, horizontal: boolean, halfTurn: boolean, glide: boolean): FriezeFeatures => ({vertical, horizontal, halfTurn, glide});

function motion(state: IsometryState) {
    const d = deriveIsometry(state);
    if (d.mode !== 'mirrors' && d.mode !== 'classify') throw new Error('not a motion mode');
    if (d.motion.status !== 'ok') throw new Error('expected a valid motion');
    return d.motion;
}

describe('parse, serialize and the Preset round trip', () => {
    test('the default state is valid and survives a JSON round trip unchanged', () => {
        const stored = JSON.parse(JSON.stringify(serializeIsometryState(DEFAULT_ISOMETRY_STATE)));
        const parsed = parseIsometryState(stored);
        expect(parsed).toEqual({ok: true, value: DEFAULT_ISOMETRY_STATE});
    });

    test('every mode and a changed state round trip', () => {
        const state = withState({
            mode: 'frieze', motionLength: 3, dilationCentre: {x: -3, y: 4}, dilationK: -0.75, rosetteN: 12, rosetteMirrors: true,
            rosettePoint: {x: -16, y: 16}, friezeFeatures: features(true, false, true, true), friezePeriod: 7,
            mirrors: [mirror(-16, 16, 16, -16), mirror(2, 2, 2, 2), mirror(0, 1, 5, 9)],
        });
        const back = parseIsometryState(JSON.parse(JSON.stringify(serializeIsometryState(state))));
        expect(back).toEqual({ok: true, value: state});
    });

    test('derived values are never read from a Preset: unknown and derived fields are dropped', () => {
        const stored = {
            ...serializeIsometryState(DEFAULT_ISOMETRY_STATE),
            composite: {a: 99}, class: 'glide', order: 99, derived: {type: 'p2mm'}, mirrorsImage: [[1, 2]],
        };
        const parsed = parseIsometryState(stored);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(Object.keys(parsed.value).sort()).toEqual(Object.keys(DEFAULT_ISOMETRY_STATE).sort());
            expect(deriveIsometry(parsed.value)).toEqual(deriveIsometry(DEFAULT_ISOMETRY_STATE));
        }
        expect(Object.keys(serializeIsometryState(DEFAULT_ISOMETRY_STATE)).sort()).toEqual(Object.keys(DEFAULT_ISOMETRY_STATE).sort());
    });

    const stored = () => JSON.parse(JSON.stringify(serializeIsometryState(DEFAULT_ISOMETRY_STATE)));
    const failure = (data: unknown) => {
        const result = parseIsometryState(data);
        if (result.ok) throw new Error('expected a failure');
        return result.error;
    };

    test('errors name the field and say what is expected', () => {
        expect(failure(null)).toMatchObject({field: 'state', reason: 'not-an-object'});
        expect(failure([])).toMatchObject({field: 'state', reason: 'not-an-object'});
        expect(failure({...stored(), mode: 'spiral'})).toMatchObject({field: 'mode', reason: 'unknown-value'});
        expect(failure({...stored(), mode: 'spiral'}).message).toContain('frieze');
        const noMode = stored(); delete noMode.mode;
        expect(failure(noMode)).toMatchObject({field: 'mode', reason: 'missing'});
        expect(failure({...stored(), mirrors: 5})).toMatchObject({field: 'mirrors', reason: 'not-an-object'});
        expect(failure({...stored(), mirrors: [mirror(0, 0, 1, 0)]})).toMatchObject({field: 'mirrors', reason: 'out-of-range'});
        const off = stored(); off.mirrors[1].q.x = 2.5;
        expect(failure(off)).toMatchObject({field: 'mirrors[1].q.x', reason: 'off-grid'});
        const far = stored(); far.mirrors[2].p.y = 17;
        expect(failure(far)).toMatchObject({field: 'mirrors[2].p.y', reason: 'out-of-range'});
        const nan = stored(); nan.dilationCentre.x = null;
        expect(failure(nan)).toMatchObject({field: 'dilationCentre.x', reason: 'missing'});
        const text = stored(); text.dilationCentre.y = '3';
        expect(failure(text)).toMatchObject({field: 'dilationCentre.y', reason: 'not-finite'});
        expect(failure({...stored(), motionLength: 4})).toMatchObject({field: 'motionLength', reason: 'out-of-range'});
        expect(failure({...stored(), motionLength: 1.5})).toMatchObject({field: 'motionLength', reason: 'off-grid'});
        expect(failure({...stored(), rosetteN: 0})).toMatchObject({field: 'rosetteN', reason: 'out-of-range'});
        expect(failure({...stored(), rosetteN: 13})).toMatchObject({field: 'rosetteN', reason: 'out-of-range'});
        expect(failure({...stored(), rosetteMirrors: 'yes'})).toMatchObject({field: 'rosetteMirrors', reason: 'unknown-value'});
        expect(failure({...stored(), friezePeriod: 3})).toMatchObject({field: 'friezePeriod', reason: 'out-of-range'});
        expect(failure({...stored(), friezePeriod: 5.5})).toMatchObject({field: 'friezePeriod', reason: 'off-grid'});
        const flag = stored(); flag.friezeFeatures.glide = 1;
        expect(failure(flag)).toMatchObject({field: 'friezeFeatures.glide', reason: 'unknown-value'});
        const noFeatures = stored(); delete noFeatures.friezeFeatures;
        expect(failure(noFeatures)).toMatchObject({field: 'friezeFeatures', reason: 'missing'});
    });

    test('the ratio is a quarter with 1/4 <= |k| <= 4: zero, a tenth, 4.25 and a non-number are refused', () => {
        const kError = (k: unknown) => failure({...stored(), dilationK: k});
        expect(kError(0)).toMatchObject({field: 'dilationK', reason: 'out-of-range'});
        expect(kError(0.1)).toMatchObject({field: 'dilationK', reason: 'out-of-range'});
        expect(kError(4.25)).toMatchObject({field: 'dilationK', reason: 'out-of-range'});
        expect(kError(-4.25)).toMatchObject({field: 'dilationK', reason: 'out-of-range'});
        expect(kError(0.3)).toMatchObject({field: 'dilationK', reason: 'off-grid'});
        expect(kError(Number.NaN)).toMatchObject({field: 'dilationK', reason: 'not-finite'});
        expect(kError('1')).toMatchObject({field: 'dilationK', reason: 'not-finite'});
        for (const k of [-4, -0.25, 0.25, 1, 1.75, 4]) expect(parseIsometryState({...stored(), dilationK: k}).ok).toBe(true);
    });

    test('coincident mirror points are a valid stored state', () => {
        expect(parseIsometryState(withState({mirrors: [mirror(3, 3, 3, 3), mirror(0, 0, 1, 0), mirror(0, 0, 1, 1)]})).ok).toBe(true);
    });
});

describe('one snapping path per field', () => {
    const value = (r: ReturnType<typeof snapRatioInput>) => (r.ok ? r.value.value : Number.NaN);

    test('coordinates round to the grid and clamp to 16; NaN and infinity are refused', () => {
        expect(value(snapCoordinateInput(2.4))).toBe(2);
        expect(value(snapCoordinateInput(-2.6))).toBe(-3);
        expect(value(snapCoordinateInput(40))).toBe(16);
        expect(Object.is(value(snapCoordinateInput(-0.2)), 0)).toBe(true);
        expect(snapCoordinateInput(Number.NaN).ok).toBe(false);
        expect(snapCoordinateInput(Infinity).ok).toBe(false);
    });

    test('the ratio rounds to quarters, clamps to +-4 and never lands on zero', () => {
        expect(value(snapRatioInput(1.3))).toBe(1.25);
        expect(value(snapRatioInput(9))).toBe(4);
        expect(value(snapRatioInput(-9))).toBe(-4);
        expect(value(snapRatioInput(0.1))).toBe(0.25);
        expect(value(snapRatioInput(-0.1))).toBe(-0.25);
        expect(value(snapRatioInput(0, 0.25))).toBe(-0.25); // a step down from 1/4 crosses zero
        expect(value(snapRatioInput(0, -0.25))).toBe(0.25);
        expect(snapRatioInput(Number.NaN).ok).toBe(false);
        expect(snapRatioInput(-Infinity).ok).toBe(false);
        const clamped = snapRatioInput(9);
        expect(clamped.ok && clamped.value.clamped).toBe(true);
    });

    test('n and the period round to integers and clamp', () => {
        expect(value(snapRosetteNInput(5.4))).toBe(5);
        expect(value(snapRosetteNInput(0))).toBe(1);
        expect(value(snapRosetteNInput(99))).toBe(12);
        expect(snapRosetteNInput(Number.NaN).ok).toBe(false);
        expect(value(snapPeriodInput(3))).toBe(4);
        expect(value(snapPeriodInput(8.6))).toBe(8);
        expect(snapPeriodInput(Number.NaN).ok).toBe(false);
    });
});

describe('mirrors: hand oracle of spec L1', () => {
    test('mirror 1 through (0,0),(1,0) and mirror 2 through (0,0),(2,1): the composite is 1/5 [[3,-4],[4,3]]', () => {
        const m = motion(DEFAULT_ISOMETRY_STATE);
        const c = m.composite;
        expect([c.a, c.b, c.c, c.d, c.tx, c.ty].map(x => x.format())).toEqual(['3/5', '-4/5', '4/5', '3/5', '0', '0']);
        expect(m.cls.kind).toBe('rotation');
        if (m.cls.kind === 'rotation') {
            expect(at(m.cls.centre, q(0), q(0))).toBe(true);
            expect(m.cls.angle * 180 / Math.PI).toBeCloseTo(53.130102354, 8);
            expect(m.cls.angleComputed).toBe(true);
        }
        // (3,1) -> (3,-1) in mirror 1 -> (1,3) in mirror 2
        expect(at(m.steps[0].image[0], q(3), q(-1))).toBe(true);
        expect(at(m.steps[1].image[0], q(1), q(3))).toBe(true);
        expect(at(m.steps[1].image[1], q(11, 5), q(23, 5))).toBe(true);
        expect(at(m.steps[1].image[2], q(-7, 5), q(24, 5))).toBe(true);
        // the motif is counterclockwise, the first image clockwise, the second counterclockwise again
        expect([m.steps[0].orientation, m.steps[1].orientation]).toEqual([-1, 1]);
        expect(m.fixed).toBe('one');
        expect(m.offView).toBe(0);
    });

    test('parallel mirrors x = 0 and x = 3 translate by (6, 0)', () => {
        const m = motion(withState({mirrors: [mirror(0, 0, 0, 1), mirror(3, 0, 3, 1), mirror(0, 0, 1, 1)]}));
        expect(m.cls.kind).toBe('translation');
        if (m.cls.kind === 'translation') expect(at(m.cls.vector, q(6), q(0))).toBe(true);
        expect(m.fixed).toBe('none');
        expect(at(m.steps[1].image[0], q(9), q(1))).toBe(true);
    });

    test('the same mirror twice is the identity; images far from the origin are counted off view', () => {
        const same = motion(withState({mirrors: [mirror(0, 0, 1, 0), mirror(2, 0, 5, 0), mirror(0, 0, 1, 1)]}));
        expect(same.cls.kind).toBe('identity');
        expect(same.fixed).toBe('plane');
        const far = motion(withState({mirrors: [mirror(-16, -16, -16, 16), mirror(16, -16, 16, 16), mirror(0, 0, 1, 1)]}));
        expect(far.offView).toBeGreaterThan(0);
    });

    test('coincident mirror points give a status naming the mirror, and no kernel call', () => {
        const d1 = deriveIsometry(withState({mirrors: [mirror(2, 2, 2, 2), mirror(0, 0, 2, 1), mirror(0, 0, 1, 1)]}));
        expect(d1).toEqual({mode: 'mirrors', motion: {status: 'coincident', mirror: 1}});
        const d2 = deriveIsometry(withState({mirrors: [mirror(0, 0, 1, 0), mirror(-4, 5, -4, 5), mirror(0, 0, 1, 1)]}));
        expect(d2).toEqual({mode: 'mirrors', motion: {status: 'coincident', mirror: 2}});
        // the third mirror is unused by the mirrors mode and by a classify motion of length 2
        const unused = [mirror(0, 0, 1, 0), mirror(0, 0, 2, 1), mirror(7, 7, 7, 7)] as const;
        expect(deriveIsometry(withState({mirrors: unused})).mode).toBe('mirrors');
        expect(deriveMotion(unused, 2).status).toBe('ok');
        expect(deriveMotion(unused, 3)).toEqual({status: 'coincident', mirror: 3});
    });
});

describe('classify: hand oracles of spec L2', () => {
    const example = (id: keyof typeof CLASSIFY_EXAMPLES) => motion(withState({mode: 'classify', ...CLASSIFY_EXAMPLES[id]}));
    const entries = (m: ReturnType<typeof motion>) => [m.composite.a, m.composite.b, m.composite.c, m.composite.d, m.composite.tx, m.composite.ty].map(x => x.format());

    test('rotation by 90 degrees about (1,2), t = (3,1): (x, y) -> (3 - y, x + 1)', () => {
        const m = example('rotation');
        expect(entries(m)).toEqual(['0', '-1', '1', '0', '3', '1']);
        expect(m.cls.kind).toBe('rotation');
        if (m.cls.kind === 'rotation') {
            expect(at(m.cls.centre, q(1), q(2))).toBe(true);
            expect(m.cls.angle).toBeCloseTo(Math.PI / 2, 12);
        }
        expect(m.fixed).toBe('one');
    });

    test('glide (x, y) -> (y + 2, x + 2): axis y = x, vector (2, 2), no fixed point', () => {
        const m = example('glide');
        expect(entries(m)).toEqual(['0', '1', '1', '0', '2', '2']);
        expect(m.cls.kind).toBe('glide');
        if (m.cls.kind === 'glide') {
            expect(at(m.cls.vector, q(2), q(2))).toBe(true);
            // the axis is x - y = 0
            const {a, b, c} = m.cls.axis;
            expect(a.mul(q(3)).add(b.mul(q(3))).equals(c)).toBe(true);
            expect(a.mul(q(1)).add(b.mul(q(2))).equals(c)).toBe(false);
        }
        expect(m.fixed).toBe('none');
    });

    test('reflection in y = x - 1: (x, y) -> (y + 1, x - 1), a line of fixed points', () => {
        const m = example('reflection');
        expect(entries(m)).toEqual(['0', '1', '1', '0', '1', '-1']);
        expect(m.cls.kind).toBe('reflection');
        expect(m.fixed).toBe('line');
        // (2,1) is fixed
        expect(at(apply(m.composite, new RationalPoint(q(2), q(1))), q(2), q(1))).toBe(true);
    });

    test('the example list matches the state it loads, and an edit leaves the list', () => {
        for (const id of CLASSIFY_EXAMPLE_IDS) expect(matchingClassifyExample(withState({mode: 'classify', ...CLASSIFY_EXAMPLES[id]}))).toBe(id);
        const edited = withState({...CLASSIFY_EXAMPLES.rotation, mirrors: [mirror(1, 2, 2, 2), mirror(1, 2, 2, 4), mirror(0, 0, 1, 1)]});
        expect(matchingClassifyExample(edited)).toBeUndefined();
        expect(matchingClassifyExample(DEFAULT_ISOMETRY_STATE)).toBeUndefined();
    });
});

describe('similarity: hand oracles of spec L3', () => {
    const sim = (k: number, cx = 1, cy = 1) => {
        const d = deriveIsometry(withState({mode: 'similarity', dilationCentre: {x: cx, y: cy}, dilationK: k}));
        if (d.mode !== 'similarity') throw new Error('mode');
        return d;
    };

    test('centre (1,1), k = 3/2: images (-1/2,-1/2), (11/2,-1/2), (-1/2,4); area 6 -> 27/2; ratios 3/2 and 9/4', () => {
        const d = sim(1.5);
        expect(at(d.image[0], q(-1, 2), q(-1, 2))).toBe(true);
        expect(at(d.image[1], q(11, 2), q(-1, 2))).toBe(true);
        expect(at(d.image[2], q(-1, 2), q(4))).toBe(true);
        expect(d.area.equals(q(6))).toBe(true);
        expect(d.imageArea.equals(q(27, 2))).toBe(true);
        expect(d.areaRatio.equals(q(9, 4))).toBe(true);
        expect(d.sideRatio.equals(q(3, 2))).toBe(true);
        expect(d.orientation).toBe(1);
        expect(d.fixedPoint).not.toBe('all');
        if (d.fixedPoint !== 'all') expect(at(d.fixedPoint, q(1), q(1))).toBe(true);
        expect(d.isometry).toBe(false);
        // the hypotenuse 5 becomes 7.5
        expect(Math.hypot(d.image[1].x.sub(d.image[2].x).toNumber(), d.image[1].y.sub(d.image[2].y).toNumber())).toBeCloseTo(7.5, 12);
    });

    test('k = -1/2: images (3/2,3/2), (-1/2,3/2), (3/2,0); orientation is kept; area ratio 1/4', () => {
        const d = sim(-0.5);
        expect(at(d.image[0], q(3, 2), q(3, 2))).toBe(true);
        expect(at(d.image[1], q(-1, 2), q(3, 2))).toBe(true);
        expect(at(d.image[2], q(3, 2), q(0))).toBe(true);
        expect(d.orientation).toBe(1);
        expect(d.sideRatio.equals(q(1, 2))).toBe(true);
        expect(d.areaRatio.equals(q(1, 4))).toBe(true);
    });

    test('k = 1 is the identity (every point fixed) and k = -1 a half-turn about the centre; both are isometries', () => {
        const one = sim(1);
        expect(one.cls.kind).toBe('identity');
        expect(one.fixedPoint).toBe('all');
        expect(one.isometry).toBe(true);
        const minus = sim(-1);
        expect(minus.cls.kind).toBe('rotation');
        if (minus.cls.kind === 'rotation') {
            expect(Math.abs(minus.cls.angle)).toBeCloseTo(Math.PI, 12);
            expect(at(minus.cls.centre, q(1), q(1))).toBe(true);
        }
        expect(minus.isometry).toBe(true);
    });

    const turned = (k: number, dilationTurn: IsometryState['dilationTurn']) => {
        const d = deriveIsometry(withState({mode: 'similarity', dilationCentre: {x: 1, y: 1}, dilationK: k, dilationTurn}));
        if (d.mode !== 'similarity') throw new Error('mode');
        return d;
    };

    test('a quarter-turn after k = 3/2 about (1,1): images (5/2,-1/2), (5/2,11/2), (-2,-1/2); the centre stays fixed', () => {
        const d = turned(1.5, 'r90');
        expect(at(d.image[0], q(5, 2), q(-1, 2))).toBe(true);
        expect(at(d.image[1], q(5, 2), q(11, 2))).toBe(true);
        expect(at(d.image[2], q(-2), q(-1, 2))).toBe(true);
        expect(d.fixedPoint).not.toBe('all');
        if (d.fixedPoint !== 'all') expect(at(d.fixedPoint, q(1), q(1))).toBe(true);
        expect(d.areaRatio.equals(q(9, 4))).toBe(true);
        expect(d.orientation).toBe(1);
    });

    test('the Pythagorean turn (3/5, 4/5) with k = 1 is the rotation taking (0,0) to (6/5,-2/5); its inverse takes it to (-2/5,6/5)', () => {
        const d = turned(1, 'pythagorean');
        expect(at(d.image[0], q(6, 5), q(-2, 5))).toBe(true);
        expect(d.cls.kind).toBe('rotation');
        expect(d.isometry).toBe(true);
        const inv = turned(1, 'pythagoreanInverse');
        expect(at(inv.image[0], q(-2, 5), q(6, 5))).toBe(true);
    });

    test('k = 1 with a quarter-turn is the rotation about the centre: the centre is the one fixed point', () => {
        const d = turned(1, 'r90');
        expect(d.cls.kind).toBe('rotation');
        expect(d.fixedPoint).not.toBe('all');
        if (d.fixedPoint !== 'all') expect(at(d.fixedPoint, q(1), q(1))).toBe(true);
        expect(d.isometry).toBe(true);
    });

    test('k = -1 with a half-turn is the identity: every point fixed', () => {
        const d = turned(-1, 'r180');
        expect(d.cls.kind).toBe('identity');
        expect(d.fixedPoint).toBe('all');
    });

    test('the turn is validated: an unknown value names the field, and the turn survives the Preset round trip', () => {
        const stored = JSON.parse(JSON.stringify(serializeIsometryState(withState({dilationTurn: 'pythagoreanInverse'}))));
        expect(parseIsometryState(stored)).toEqual({ok: true, value: withState({dilationTurn: 'pythagoreanInverse'})});
        const bad = parseIsometryState({...stored, dilationTurn: 'r45'});
        expect(bad.ok).toBe(false);
        if (!bad.ok) expect(bad.error).toMatchObject({field: 'dilationTurn', reason: 'unknown-value'});
        const gone = parseIsometryState({...stored, dilationTurn: undefined});
        if (!gone.ok) expect(gone.error).toMatchObject({field: 'dilationTurn', reason: 'missing'});
    });

    test('the extreme ratios stay exact: k = 1/4 and k = -4', () => {
        const small = sim(0.25, -16, 16);
        expect(small.areaRatio.equals(q(1, 16))).toBe(true);
        expect(small.offView).toBe(0);
        const big = sim(-4, 0, 0);
        expect(big.sideRatio.equals(q(4))).toBe(true);
        expect(at(big.image[1], q(-16), q(0))).toBe(true);
    });
});

describe('rosette: orders are exact, images computed', () => {
    const ros = (n: number, mirrors: boolean, x = 4, y = 1) => {
        const d = deriveIsometry(withState({mode: 'rosette', rosetteN: n, rosetteMirrors: mirrors, rosettePoint: {x, y}}));
        if (d.mode !== 'rosette') throw new Error('mode');
        return d;
    };

    test('n = 5 has order 5, with mirrors 10, with no coincident images for a generic point', () => {
        expect(ros(5, false)).toMatchObject({order: 5, distinct: 5});
        expect(ros(5, true)).toMatchObject({order: 10, distinct: 10});
        expect(ros(12, true)).toMatchObject({order: 24, distinct: 24});
        expect(ros(1, false)).toMatchObject({order: 1, distinct: 1});
    });

    test('a point on a mirror has fewer distinct images (5 of 10), the centre has one', () => {
        expect(ros(5, true, 4, 0)).toMatchObject({order: 10, distinct: 5});
        expect(ros(5, false, 4, 0)).toMatchObject({order: 5, distinct: 5});
        expect(ros(6, true, 0, 0)).toMatchObject({order: 12, distinct: 1});
    });

    test('independent check: every image lies on the circle of the motif, rotated by multiples of 72 degrees, with alternating orientation', () => {
        const d = ros(5, true, 3, 1);
        const radius = Math.hypot(3, 1);
        const base = Math.atan2(1, 3);
        d.images.forEach((image, i) => {
            expect(Math.hypot(image.x, image.y)).toBeCloseTo(radius, 12);
            expect(image.reflected).toBe(i % 2 === 1);
            const j = Math.floor(i / 2);
            const expected = image.reflected ? -base + 2 * Math.PI * j / 5 : base + 2 * Math.PI * j / 5;
            expect(Math.cos(Math.atan2(image.y, image.x) - expected)).toBeCloseTo(1, 12);
        });
    });

    test('images beyond the starting view are counted', () => {
        expect(ros(5, false, 16, 16).offView).toBeGreaterThan(0);
        expect(ros(5, false, 4, 1).offView).toBe(0);
    });
});

describe('frieze: the closure of the chosen features', () => {
    const frieze = (f: FriezeFeatures, period = 4) => {
        const d = deriveIsometry(withState({mode: 'frieze', friezeFeatures: f, friezePeriod: period}));
        if (d.mode !== 'frieze') throw new Error('mode');
        return d;
    };

    // Hand-derived from spec L5: H after G is a pure translation by L/2, so any set with H and G halves the period; V, R and G together too.
    const table: Array<[FriezeFeatures, string, number]> = [
        [features(false, false, false, false), 'p1', 1],
        [features(true, false, false, false), 'p1m1', 2],
        [features(false, true, false, false), 'p11m', 2],
        [features(false, false, true, false), 'p2', 2],
        [features(false, false, false, true), 'p11g', 2],
        [features(true, true, false, false), 'p2mm', 4],
        [features(true, false, true, false), 'p2mm', 4],
        [features(false, true, true, false), 'p2mm', 4],
        [features(true, true, true, false), 'p2mm', 4],
        [features(true, false, false, true), 'p2mg', 4],
        [features(false, false, true, true), 'p2mg', 4],
    ];
    const reducing: FriezeFeatures[] = [
        features(false, true, false, true), features(true, true, false, true), features(false, true, true, true),
        features(true, false, true, true), features(true, true, true, true),
    ];

    test.each(table)('%j names %s with %i images per period', (f, type, size) => {
        const d = frieze(f);
        expect(d).toMatchObject({status: 'closed', type, copiesPerPeriod: size});
    });

    test.each(reducing.map(f => [f]))('%j halves the period and says so', (f) => {
        const d = frieze(f);
        expect(d.status).toBe('reducesPeriod');
        // only the translates of the motif are drawn
        expect(new Set(d.polygons.map(p => p.element))).toEqual(new Set([0]));
    });

    test('11 closed sets in 7 types and 5 that reduce the period cover all 16 subsets', () => {
        expect(table.length + reducing.length).toBe(16);
        expect(new Set(table.map(([, type]) => type)).size).toBe(7);
        expect(friezeGeneratorsOf(features(true, true, true, true))).toEqual(['V', 'H', 'R', 'G']);
        expect(friezeGeneratorsOf(features(false, true, false, true))).toEqual(['H', 'G']);
    });

    test('every period in 4..8 names the same types', () => {
        for (let L = 4; L <= 8; L++) {
            expect(frieze(features(true, false, false, true), L)).toMatchObject({status: 'closed', type: 'p2mg'});
            expect(frieze(features(false, true, false, true), L).status).toBe('reducesPeriod');
        }
    });

    test('the F outline under the half-turn and the glide: (0.1, 0.4) -> (-0.1, -0.4) and (2.1, -0.4) for L = 4', () => {
        const half = frieze(features(false, false, true, false));
        const identity = half.polygons.find(p => p.element === 0 && p.period === 0)!;
        expect([identity.xs[0], identity.ys[0]]).toEqual([0.1, 0.4]);
        const turned = half.polygons.filter(p => p.element === 1);
        expect(turned.some(p => Math.abs(p.xs[0] - 3.9) < 1e-12 && Math.abs(p.ys[0] + 0.4) < 1e-12)).toBe(true); // -0.1 + 4
        const glide = frieze(features(false, false, false, true));
        expect(glide.polygons.some(p => p.element === 1 && Math.abs(p.xs[0] - 2.1) < 1e-12 && Math.abs(p.ys[0] + 0.4) < 1e-12)).toBe(true);
    });

    test('copies lie inside the window, are distinct, and tile: each interior period holds exactly the closed set', () => {
        for (const [f, , size] of table) {
            const d = frieze(f);
            expect(d.polygons.every(p => p.xs.every(x => Math.abs(x) <= FRIEZE_WINDOW))).toBe(true);
            const keys = d.polygons.map(p => `${p.xs[0].toFixed(9)},${p.ys[0].toFixed(9)}`);
            expect(new Set(keys).size).toBe(keys.length);
            // every element of the closed set appears in at least 6 consecutive periods (the window holds 8.5 periods of L = 4)
            for (let element = 0; element < size; element++) {
                expect(d.polygons.filter(p => p.element === element).length).toBeGreaterThanOrEqual(6);
            }
            expect(d.polygons.every(p => p.xs.length === 10 && p.ys.length === 10)).toBe(true);
        }
    });

    test('twenty periods hold twenty times the closed set', () => {
        const d = frieze(features(true, true, false, false));
        if (d.status !== 'closed') throw new Error('closed');
        expect(friezePolygons(d.elements, 4, 1000, 0, 20).length).toBe(80);
    });
});
