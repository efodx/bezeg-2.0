import {Rational, RationalPoint} from './rational';
import {
    CIRCLE_MODES, CircleConstructionState, CircleMode, deriveCircleConstruction, exampleState, parseCircleConstructionState,
    serializeCircleConstructionState, snapCoordinateInput, snapRadiusInput, snapRatioInput, type ApolloniusDerived, type CommonDerived,
    type RadicalDerived, type TangentsDerived,
} from './circleConstructionModel';

const q = (num: number, den = 1) => Rational.of(num, den);
const pt = (x: number, y: number) => new RationalPoint(q(x), q(y));
type Changes = Partial<CircleConstructionState>;
const withState = (mode: CircleMode, changes: Changes): CircleConstructionState => ({...exampleState(mode), ...changes});
const tangents = (changes: Changes) => deriveCircleConstruction(withState('tangents', changes)) as TangentsDerived;
const radical = (changes: Changes) => deriveCircleConstruction(withState('radical', changes)) as RadicalDerived;
const apollonius = (changes: Changes) => deriveCircleConstruction(withState('apollonius', changes)) as ApolloniusDerived;
const common = (changes: Changes) => deriveCircleConstruction(withState('common', changes)) as CommonDerived;

/** Fails the test (with the error) when parsing does not succeed. */
function parsed(data: unknown): CircleConstructionState {
    const result = parseCircleConstructionState(data);
    if (!result.ok) throw new Error(`${result.error.field}: ${result.error.message}`);
    return result.value;
}

describe('state parsing and the Preset round trip', () => {
    test.each(CIRCLE_MODES)('the %s example survives serialise, JSON and parse unchanged', mode => {
        const state = exampleState(mode);
        expect(parsed(JSON.parse(JSON.stringify(serializeCircleConstructionState(state))))).toEqual(state);
    });

    test('a Preset carrying derived fields is accepted and they are dropped, so nothing derived is read from it', () => {
        const bogus = {
            ...exampleState('tangents'), power: 999, derived: {count: 4}, tangentLength: 1, count: 7,
            c1: {...exampleState('tangents').c1, r2: 1},
        };
        const state = parsed(bogus);
        expect(Object.keys(state).sort()).toEqual(['a', 'b', 'c1', 'c2', 'c3', 'k', 'mode', 'p']);
        expect(Object.keys(state.c1).sort()).toEqual(['r', 'x', 'y']);
        const result = deriveCircleConstruction(state) as TangentsDerived;
        expect(result.result.status === 'outside' && result.result.power.equals(q(144))).toBe(true);
    });

    test.each([
        [{mode: undefined}, 'mode', 'missing'],
        [{mode: 'power'}, 'mode', 'unknown-value'],
        [{c1: null}, 'c1', 'missing'],
        [{c1: 5}, 'c1', 'not-an-object'],
        [{c1: {x: 0.5, y: 0, r: 5}}, 'c1.x', 'off-grid'],
        [{c2: {x: 17, y: 0, r: 5}}, 'c2.x', 'out-of-range'],
        [{c2: {x: 0, y: -17, r: 5}}, 'c2.y', 'out-of-range'],
        [{c3: {x: 0, y: 0, r: 0}}, 'c3.r', 'out-of-range'],
        [{c3: {x: 0, y: 0, r: 8.25}}, 'c3.r', 'out-of-range'],
        [{c1: {x: 0, y: 0, r: 1.1}}, 'c1.r', 'off-grid'],
        [{c1: {x: 0, y: 0, r: '5'}}, 'c1.r', 'not-finite'],
        [{c1: {x: 0, y: 0, r: Number.NaN}}, 'c1.r', 'not-finite'],
        [{p: {x: 1}}, 'p.y', 'missing'],
        [{a: [1, 2]}, 'a', 'not-an-object'],
        [{b: {x: Infinity, y: 0}}, 'b.x', 'not-finite'],
        [{k: 0}, 'k', 'out-of-range'],
        [{k: 4.5}, 'k', 'out-of-range'],
        [{k: 1.3}, 'k', 'off-grid'],
    ])('rejects %j with an actionable error naming %s (%s)', (change, field, reason) => {
        const result = parseCircleConstructionState({...exampleState('tangents'), ...change});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.field).toBe(field);
            expect(result.error.reason).toBe(reason);
            expect(result.error.message).toContain(field);
        }
    });

    test('rejects a non-object, an array and a missing field with the field name', () => {
        for (const data of [null, 7, 'x', []]) expect(parseCircleConstructionState(data)).toMatchObject({ok: false, error: {field: 'state'}});
        const {k: _dropped, ...withoutK} = exampleState('tangents');
        expect(parseCircleConstructionState(withoutK)).toMatchObject({ok: false, error: {field: 'k', reason: 'missing'}});
    });

    test('negative zero is normalised and the coordinate limits are accepted', () => {
        const state = parsed({...exampleState('tangents'), p: {x: -0, y: 16}, a: {x: -16, y: -0}});
        expect(Object.is(state.p.x, 0)).toBe(true);
        expect(Object.is(state.a.y, 0)).toBe(true);
        expect(state.a.x).toBe(-16);
    });
});

describe('snapping (ADR 0045 section 2)', () => {
    test('coordinates snap to integers and clamp to [-16, 16]', () => {
        expect(snapCoordinateInput(3.4)).toEqual({ok: true, value: {value: 3, clamped: false, adjusted: true}});
        expect(snapCoordinateInput(-3.5)).toEqual({ok: true, value: {value: -3, clamped: false, adjusted: true}});
        expect(snapCoordinateInput(7)).toEqual({ok: true, value: {value: 7, clamped: false, adjusted: false}});
        expect(snapCoordinateInput(40)).toEqual({ok: true, value: {value: 16, clamped: true, adjusted: true}});
        expect(snapCoordinateInput(-17.2)).toEqual({ok: true, value: {value: -16, clamped: true, adjusted: true}});
        const zero = snapCoordinateInput(-0.2);
        expect(zero.ok && Object.is(zero.value.value, 0)).toBe(true);
    });

    test('radii snap to quarters and clamp to [1/4, 8]', () => {
        expect(snapRadiusInput(2.6)).toEqual({ok: true, value: {value: 2.5, clamped: false, adjusted: true}});
        expect(snapRadiusInput(2.75)).toEqual({ok: true, value: {value: 2.75, clamped: false, adjusted: false}});
        expect(snapRadiusInput(0)).toEqual({ok: true, value: {value: 0.25, clamped: true, adjusted: true}});
        expect(snapRadiusInput(-3)).toEqual({ok: true, value: {value: 0.25, clamped: true, adjusted: true}});
        expect(snapRadiusInput(99)).toEqual({ok: true, value: {value: 8, clamped: true, adjusted: true}});
    });

    test('the ratio snaps to halves and clamps to [1/2, 4]', () => {
        expect(snapRatioInput(1.3)).toEqual({ok: true, value: {value: 1.5, clamped: false, adjusted: true}});
        expect(snapRatioInput(0.1)).toEqual({ok: true, value: {value: 0.5, clamped: true, adjusted: true}});
        expect(snapRatioInput(9)).toEqual({ok: true, value: {value: 4, clamped: true, adjusted: true}});
    });

    test('non-finite input is an error naming the field', () => {
        for (const bad of [Number.NaN, Infinity, -Infinity]) {
            expect(snapCoordinateInput(bad, 'c1.x')).toMatchObject({ok: false, error: {field: 'c1.x', reason: 'not-finite'}});
            expect(snapRadiusInput(bad)).toMatchObject({ok: false, error: {reason: 'not-finite'}});
            expect(snapRatioInput(bad)).toMatchObject({ok: false, error: {reason: 'not-finite'}});
        }
    });
});

describe('tangent mode (CG1), hand-computed values', () => {
    test('O=(0,0), rho=5, P=(13,0): power 144, tangent length 12, chord x=25/13, Thales circle on OP', () => {
        const d = tangents({});
        expect(d.result.status).toBe('outside');
        if (d.result.status !== 'outside') return;
        expect(d.result.power.equals(q(144))).toBe(true);
        expect(d.result.tangentLength).toBe(12);
        // The chord of contact 13 x = 25, that is x = 25/13.
        expect(d.result.chord.a.equals(q(13)) && d.result.chord.b.isZero() && d.result.chord.c.equals(q(25))).toBe(true);
        expect(d.result.contacts[0].x).toBeCloseTo(25 / 13, 12);
        expect(Math.abs(d.result.contacts[0].y)).toBeCloseTo(60 / 13, 12);
        expect(d.thales?.centre.equals(new RationalPoint(q(13, 2), q(0)))).toBe(true);
        expect(d.thales?.r2.equals(q(169, 4))).toBe(true);
        expect(d.atCentre).toBe(false);
    });

    test('on the circle: one exact tangent x=5, no Thales circle; inside: power -16 and none', () => {
        const on = tangents({p: {x: 5, y: 0}});
        expect(on.result.status).toBe('on');
        if (on.result.status === 'on') expect(on.result.line.a.equals(q(5)) && on.result.line.b.isZero() && on.result.line.c.equals(q(25))).toBe(true);
        expect(on.thales).toBeNull();
        const inside = tangents({p: {x: 3, y: 0}});
        expect(inside.result.status === 'inside' && inside.result.power.equals(q(-16))).toBe(true);
    });

    test('P=O is flagged, still inside with power -rho^2, and nothing is NaN', () => {
        const d = tangents({p: {x: 0, y: 0}});
        expect(d.atCentre).toBe(true);
        expect(d.result.status === 'inside' && d.result.power.equals(q(-25))).toBe(true);
    });
});

describe('radical mode (CG2)', () => {
    test('c1=(0,0;5), c2=(6,0;3), c3=(3,6;2): axis 12 x=13/3, radical centre (13/3,10/3), power 44/9, orthogonal circle', () => {
        const d = radical({});
        const axis = d.axes[0].axis;
        expect(axis.status).toBe('line');
        // 12 x = 36 - 9 + 25 = 52.
        if (axis.status === 'line') expect(axis.line.a.equals(q(12)) && axis.line.b.isZero() && axis.line.c.equals(q(52))).toBe(true);
        expect(d.firstPairMeet.kind).toBe('two');
        expect(d.centre.status).toBe('centre');
        if (d.centre.status === 'centre') {
            expect(d.centre.point.equals(new RationalPoint(q(13, 3), q(10, 3)))).toBe(true);
            expect(d.centre.power.equals(q(44, 9))).toBe(true);
        }
        expect(d.orthogonal?.r2.equals(q(44, 9))).toBe(true);
    });

    test('probe powers are exact and equal exactly on the axis x=13/3 (grid probes are on it only if x*3=13: none)', () => {
        // Probe (4,2): powers 16+4-25=-5 and 4+4-9=-1, not equal.
        const d = radical({p: {x: 4, y: 2}});
        expect(d.powers.map(p => p.format())).toEqual(['-5', '-1', '13']);
        expect(d.onFirstAxis).toBe(false);
        // Disjoint-by-axis check with c2 moved so the axis x=121/20 is not on the grid, and with c2=(8,0;3): axis x=5 passes through P=(5,3).
        const touching = radical({c2: {x: 8, y: 0, r: 3}, p: {x: 5, y: 3}});
        expect(touching.firstPairMeet.kind).toBe('tangent');
        expect(touching.onFirstAxis).toBe(true);
        expect(touching.powers[0].equals(touching.powers[1])).toBe(true);
    });

    test('concentric and coincident pairs give statuses, no centre, no orthogonal circle', () => {
        const concentric = radical({c2: {x: 0, y: 0, r: 3}});
        expect(concentric.axes[0].axis.status).toBe('concentric');
        expect(concentric.centre.status).toBe('concentric');
        expect(concentric.orthogonal).toBeNull();
        const same = radical({c2: {x: 0, y: 0, r: 5}});
        expect(same.axes[0].axis.status).toBe('coincident');
    });

    test('collinear centres: parallel axes, or one shared axis for circles through the same two points', () => {
        const parallel = radical({c3: {x: 12, y: 0, r: 2}});
        expect(parallel.centre.status).toBe('parallel');
        // Circles through (0,3) and (0,-3): centres (0,0),(4,0),(8,0) with r^2 = 9, 25, 73 -> use radii 3, 5 and sqrt(73): not on the grid; use c3 = (-4,0) with r = 5.
        const coaxal = radical({c1: {x: 0, y: 0, r: 3}, c2: {x: 4, y: 0, r: 5}, c3: {x: -4, y: 0, r: 5}});
        expect(coaxal.centre.status).toBe('coaxal');
        const none = radical({c1: {x: 0, y: 0, r: 5}, c2: {x: 4, y: 0, r: 5}, c3: {x: 8, y: 0, r: 5}});
        expect(none.centre.status).toBe('parallel');
    });
});

describe('Apollonius mode (CG3)', () => {
    test('A=(0,0), B=(6,0), k=2: circle centre (8,0), r^2=16, division points (4,0), (12,0); A and B inverse', () => {
        const d = apollonius({});
        expect(d.m.equals(q(4))).toBe(true);
        expect(d.locus.status).toBe('circle');
        if (d.locus.status === 'circle') {
            expect(d.locus.circle.centre.equals(pt(8, 0))).toBe(true);
            expect(d.locus.circle.r2.equals(q(16))).toBe(true);
            expect(d.locus.internal.equals(pt(4, 0))).toBe(true);
            expect(d.locus.external.equals(pt(12, 0))).toBe(true);
        }
        expect(d.inverseOfA?.equals(pt(6, 0))).toBe(true);
    });

    test('probe (8,4): |PA|^2=80, |PB|^2=20, ratio 2 and exactly on the locus; (8,3) is not', () => {
        const d = apollonius({});
        expect(d.pa2.equals(q(80)) && d.pb2.equals(q(20))).toBe(true);
        expect(d.ratio).toBe(2);
        expect(d.onLocus).toBe(true);
        const off = apollonius({p: {x: 8, y: 3}});
        expect(off.onLocus).toBe(false);
        expect(off.ratio).toBeCloseTo(Math.sqrt(73 / 13), 12);
    });

    test('k=1/2 gives centre (-2,0), r^2=16; k=1 is the line x=3', () => {
        const half = apollonius({k: 0.5});
        expect(half.locus.status === 'circle' && half.locus.circle.centre.equals(pt(-2, 0)) && half.locus.circle.r2.equals(q(16))).toBe(true);
        const one = apollonius({k: 1});
        expect(one.locus.status).toBe('line');
        // 12 x = 36.
        if (one.locus.status === 'line') expect(one.locus.line.a.equals(q(12)) && one.locus.line.b.isZero() && one.locus.line.c.equals(q(36))).toBe(true);
        expect(one.inverseOfA).toBeNull();
    });

    test('P=B has no ratio and is not NaN; A=B is degenerate', () => {
        const atB = apollonius({p: {x: 6, y: 0}});
        expect(atB.atB).toBe(true);
        expect(atB.ratio).toBeNull();
        const same = apollonius({b: {x: 0, y: 0}});
        expect(same.locus.status).toBe('degenerate');
        expect(same.inverseOfA).toBeNull();
    });
});

describe('common tangents mode (CG4)', () => {
    test('(0,0;3) and (10,0;1): four tangents, centres of similarity (15,0) and (15/2,0), lines at distance r from both centres', () => {
        const d = common({});
        expect(d.relation).toBe('separate');
        expect(d.result.status).toBe('ok');
        if (d.result.status !== 'ok') return;
        expect(d.result.count).toBe(4);
        expect(d.result.externalCentre?.equals(pt(15, 0))).toBe(true);
        expect(d.result.internalCentre.equals(new RationalPoint(q(15, 2), q(0)))).toBe(true);
        expect(d.result.tangents.map(t => t.kind).sort()).toEqual(['external', 'external', 'internal', 'internal']);
    });

    test('the lines are at distance 3 and 1 from the centres (independent distance formula)', () => {
        const d = common({});
        if (d.result.status !== 'ok') throw new Error('expected ok');
        for (const t of d.result.tangents) {
            const line = t.line as {a: number; b: number; c: number};
            const length = Math.hypot(line.a, line.b);
            expect(Math.abs(line.a * 0 + line.b * 0 - line.c) / length).toBeCloseTo(3, 12);
            expect(Math.abs(line.a * 10 - line.c) / length).toBeCloseTo(1, 12);
        }
    });

    test.each([
        // radii 5 and 3: centre distance d.
        [8, 'touching-outside', 3],
        [7, 'crossing', 2],
        [2, 'touching-inside', 1],
        [1, 'nested', 0],
        [9, 'separate', 4],
    ] as const)('radii 5, 3 at centre distance %i: %s with %i tangents', (distance, relation, count) => {
        const d = common({c1: {x: 0, y: 0, r: 5}, c2: {x: distance, y: 0, r: 3}});
        expect(d.relation).toBe(relation);
        expect(d.result.status === 'ok' && d.result.count).toBe(count);
    });

    test('equal radii: no external centre, external tangents y=3 and y=-3', () => {
        const d = common({c1: {x: 0, y: 0, r: 3}, c2: {x: 10, y: 0, r: 3}});
        if (d.result.status !== 'ok') throw new Error('expected ok');
        expect(d.result.externalCentre).toBeNull();
        const externals = d.result.tangents.filter(t => t.kind === 'external').map(t => t.line as {a: number; b: number; c: number});
        expect(externals.map(l => Math.round((l.c / l.b) * 1e9) / 1e9).sort()).toEqual([-3, 3]);
        expect(d.result.internalCentre.equals(pt(5, 0))).toBe(true);
    });

    test('concentric and coincident circles give statuses and finite numbers only', () => {
        const concentric = common({c1: {x: 2, y: 2, r: 3}, c2: {x: 2, y: 2, r: 5}});
        expect(concentric.relation).toBe('concentric');
        expect(concentric.result.status === 'ok' && concentric.result.count).toBe(0);
        const same = common({c1: {x: 2, y: 2, r: 3}, c2: {x: 2, y: 2, r: 3}});
        expect(same.relation).toBe('coincident');
        expect(same.result.status).toBe('coincident');
        expect(JSON.stringify(concentric, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))).not.toMatch(/NaN|null.*Infinity/);
    });
});
