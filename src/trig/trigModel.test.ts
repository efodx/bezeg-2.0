import {describe, expect, it} from 'vitest';
import {
    DEFAULT_SOLVE_DATA, DEFAULT_TRIANGLE_STATE, DEFAULT_UNIT_CIRCLE_STATE, deriveTriangle, deriveUnitCircle, parseTriangleState,
    parseUnitCircleState, serializeTriangleState, serializeUnitCircleState, snapAngleInput, snapPiMultipleInput, snapSideInput,
    snapSolverAngleInput, snapVertexInput, SOLVE_DATA_TYPES, TRIANGLE_MODES, TriangleState, UnitCircleState,
} from './trigModel';
import {solveTriangle} from './triangleSolver';

type Rec = Record<string, unknown>;
const clone = <T>(v: T) => JSON.parse(JSON.stringify(v)) as Rec;
/** Mutable sub-object of a cloned draft. */
const sub = (d: Rec, key: string) => d[key] as Rec;
const errorOf = (r: {ok: boolean; error?: {field: string; reason: string; message: string}}) => {
    if (r.ok) throw new Error('expected a rejection');
    return r.error!;
};

// mulberry32: deterministic seeded generator for the property test.
const rng = (seed: number) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('defaults', () => {
    it('unit circle default is the TR2 example, alpha 60 and beta 45 degrees', () => {
        expect(DEFAULT_UNIT_CIRCLE_STATE.angle / 2).toBe(60);
        expect(DEFAULT_UNIT_CIRCLE_STATE.secondAngle / 2).toBe(45);
        expect(deriveUnitCircle(DEFAULT_UNIT_CIRCLE_STATE).point[1]).toBeCloseTo(Math.sqrt(3) / 2, 15);
    });

    it('triangle default is the TR3 triangle with SSS 5, 6, 7', () => {
        expect(DEFAULT_TRIANGLE_STATE.A).toEqual({x: 0, y: 0});
        expect(DEFAULT_TRIANGLE_STATE.B).toEqual({x: 7, y: 0});
        expect(DEFAULT_TRIANGLE_STATE.C).toEqual({x: 2, y: 4});
        const d = deriveTriangle(DEFAULT_TRIANGLE_STATE);
        expect(d.solution.kind === 'one' && d.solution.triangle.area).toBeCloseTo(14.69694, 5);
    });

    it('every default solver data type solves to a triangle', () => {
        for (const type of SOLVE_DATA_TYPES) expect(solveTriangle(DEFAULT_SOLVE_DATA[type]).kind).not.toBe('none');
    });
});

describe('parseUnitCircleState', () => {
    it('accepts the default and rejects non-objects', () => {
        expect(parseUnitCircleState(clone(DEFAULT_UNIT_CIRCLE_STATE))).toEqual({ok: true, value: DEFAULT_UNIT_CIRCLE_STATE});
        expect(errorOf(parseUnitCircleState([])).field).toBe('state');
        expect(errorOf(parseUnitCircleState(null)).reason).toBe('not-an-object');
    });

    it.each([
        ['angle', 'null', null, 'missing'],
        ['angle', 'string', '30', 'not-finite'],
        ['angle', 'Infinity', 'inf', 'not-finite'],
        ['angle', 'negative', -1, 'out-of-range'],
        ['angle', 'a full turn', 720, 'out-of-range'],
        ['angle', 'a quarter half-degree', 10.5, 'off-grid'],
        ['secondAngle', 'out of range', 1000, 'out-of-range'],
        ['showSymmetries', 'a string', 'yes', 'not-boolean'],
        ['showCosine', 'missing', undefined, 'missing'],
    ] as const)('rejects %s (%s) naming the field', (field, _label, value, reason) => {
        const data = clone(DEFAULT_UNIT_CIRCLE_STATE);
        data[field] = value === 'inf' ? Infinity : value;
        if (value === undefined) delete data[field];
        const e = errorOf(parseUnitCircleState(data === null ? null : value === 'inf' ? {...data, [field]: Infinity} : data));
        expect(e.field).toBe(field);
        expect(e.reason).toBe(reason);
        expect(e.message).toContain(field);
    });

    it('rejects a non-finite number written as NaN', () => {
        expect(errorOf(parseUnitCircleState({...DEFAULT_UNIT_CIRCLE_STATE, angle: NaN})).reason).toBe('not-finite');
    });
});

describe('parseTriangleState', () => {
    it('accepts the default for every mode and data type', () => {
        for (const mode of TRIANGLE_MODES) for (const type of SOLVE_DATA_TYPES) {
            const s: TriangleState = {...DEFAULT_TRIANGLE_STATE, mode, data: DEFAULT_SOLVE_DATA[type]};
            expect(parseTriangleState(clone(s))).toEqual({ok: true, value: s});
        }
    });

    const bad = (mutate: (d: Rec) => void) => {
        const d = clone(DEFAULT_TRIANGLE_STATE);
        mutate(d);
        return errorOf(parseTriangleState(d));
    };

    it('names vertex coordinates', () => {
        expect(bad(d => { sub(d, 'C').y = 1.5; })).toMatchObject({field: 'C.y', reason: 'off-grid'});
        expect(bad(d => { sub(d, 'A').x = 2 ** 26; })).toMatchObject({field: 'A.x', reason: 'out-of-range'});
        expect(bad(d => { delete d.B; })).toMatchObject({field: 'B', reason: 'missing'});
        expect(bad(d => { d.B = {x: 1}; })).toMatchObject({field: 'B.y', reason: 'missing'});
        expect(bad(d => { d.B = 'x'; })).toMatchObject({field: 'B', reason: 'not-an-object'});
        expect(parseTriangleState({...clone(DEFAULT_TRIANGLE_STATE), C: {x: 2, y: NaN}})).toMatchObject({ok: false, error: {field: 'C.y', reason: 'not-finite'}});
    });

    it('names solver inputs and rejects off-grid sides and angles', () => {
        expect(bad(d => { sub(d, 'data').b = 6.1; })).toMatchObject({field: 'data.b', reason: 'off-grid'});
        expect(bad(d => { sub(d, 'data').c = 12.25; })).toMatchObject({field: 'data.c', reason: 'out-of-range'});
        expect(bad(d => { sub(d, 'data').a = 0; })).toMatchObject({field: 'data.a', reason: 'out-of-range'});
        expect(bad(d => { delete sub(d, 'data').a; })).toMatchObject({field: 'data.a', reason: 'missing'});
        expect(bad(d => { d.data = {type: 'sas', b: 5, c: 7, angleA: 60.5}; })).toMatchObject({field: 'data.angleA', reason: 'off-grid'});
        expect(bad(d => { d.data = {type: 'asa', angleA: 40, angleB: 180, c: 8}; })).toMatchObject({field: 'data.angleB', reason: 'out-of-range'});
        expect(bad(d => { d.data = {type: 'ssa', a: 5, b: 8}; })).toMatchObject({field: 'data.angleA', reason: 'missing'});
        expect(bad(d => { sub(d, 'data').type = 'aaa'; })).toMatchObject({field: 'data.type', reason: 'unknown-value'});
        expect(bad(d => { d.mode = 'spin'; })).toMatchObject({field: 'mode', reason: 'unknown-value'});
        expect(bad(d => { delete d.data; })).toMatchObject({field: 'data', reason: 'missing'});
    });

    it('allows degenerate and impossible stored inputs (they are statuses, not Preset errors)', () => {
        const s: TriangleState = {...DEFAULT_TRIANGLE_STATE, A: {x: 0, y: 0}, B: {x: 1, y: 1}, C: {x: 2, y: 2}, data: {type: 'sss', a: 1, b: 1, c: 12}};
        const parsed = parseTriangleState(clone(s));
        expect(parsed.ok).toBe(true);
        const d = deriveTriangle(s);
        expect(d.sine.kind).toBe('degenerate');
        expect(d.solution).toEqual({kind: 'none', reason: 'triangle-inequality'});
    });

    it('drops irrelevant solver fields of another data type', () => {
        const d = clone(DEFAULT_TRIANGLE_STATE);
        d.data = {type: 'asa', angleA: 40, angleB: 60, c: 8, a: 99, angleC: 7};
        const r = parseTriangleState(d);
        expect(r.ok && r.value.data).toEqual({type: 'asa', angleA: 40, angleB: 60, c: 8});
    });
});

describe('derived values are never read from a Preset', () => {
    it('drops derived and unknown properties from unit circle state', () => {
        const poisoned = {
            ...serializeUnitCircleState(DEFAULT_UNIT_CIRCLE_STATE), point: [9, 9], quadrant: 4, sin: 7, special: 'x', derived: {point: [0, 0]},
        };
        const r = parseUnitCircleState(poisoned);
        expect(r.ok && Object.keys(r.value).sort()).toEqual(['angle', 'secondAngle', 'showCosine', 'showSymmetries']);
        expect(r.ok && deriveUnitCircle(r.value)).toEqual(deriveUnitCircle(DEFAULT_UNIT_CIRCLE_STATE));
    });

    it('drops derived and unknown properties from triangle state, even inside data and vertices', () => {
        const poisoned = clone(serializeTriangleState(DEFAULT_TRIANGLE_STATE));
        Object.assign(poisoned, {solution: {kind: 'two'}, ratios: [1, 2, 3], R2: -1, area: 0});
        sub(poisoned, 'data').angleA = 12; // not an sss input
        sub(poisoned, 'data').solution = {kind: 'two'};
        sub(poisoned, 'A').z = 5;
        const r = parseTriangleState(poisoned);
        expect(r.ok && Object.keys(r.value).sort()).toEqual(['A', 'B', 'C', 'data', 'mode']);
        expect(r.ok && r.value).toEqual(DEFAULT_TRIANGLE_STATE);
        expect(r.ok && deriveTriangle(r.value)).toEqual(deriveTriangle(DEFAULT_TRIANGLE_STATE));
    });
});

describe('snapping (UI input path)', () => {
    const val = <T>(r: {ok: boolean; value?: T}) => r.value as T;

    it('angles snap to half-degrees and wrap', () => {
        expect(val(snapAngleInput(30.2))).toEqual({halfDegrees: 60, adjusted: true});
        expect(val(snapAngleInput(30.3))).toEqual({halfDegrees: 61, adjusted: true});
        expect(val(snapAngleInput(30.5))).toEqual({halfDegrees: 61, adjusted: false});
        expect(val(snapAngleInput(-90))).toEqual({halfDegrees: 540, adjusted: true});
        expect(val(snapAngleInput(360)).halfDegrees).toBe(0);
        expect(val(snapPiMultipleInput(1 / 6))).toEqual({halfDegrees: 60, adjusted: false});
        expect(val(snapPiMultipleInput(0.3333))).toMatchObject({halfDegrees: 120, adjusted: true});
    });

    it('sides snap to quarters and clamp to [1/4, 12]', () => {
        expect(val(snapSideInput(5.1))).toEqual({value: 5, clamped: false, adjusted: true});
        expect(val(snapSideInput(5.15))).toEqual({value: 5.25, clamped: false, adjusted: true});
        expect(val(snapSideInput(5.75))).toEqual({value: 5.75, clamped: false, adjusted: false});
        expect(val(snapSideInput(20))).toEqual({value: 12, clamped: true, adjusted: true});
        expect(val(snapSideInput(0))).toEqual({value: 0.25, clamped: true, adjusted: true});
        expect(val(snapSideInput(0.2))).toEqual({value: 0.25, clamped: false, adjusted: true});
        expect(val(snapSideInput(0.05))).toEqual({value: 0.25, clamped: true, adjusted: true});
        expect(val(snapSideInput(12.1))).toEqual({value: 12, clamped: false, adjusted: true});
        expect(val(snapSideInput(12.2))).toEqual({value: 12, clamped: true, adjusted: true});
        expect(val(snapVertexInput(2 ** 25 + 0.4))).toEqual({value: 2 ** 25, clamped: false, adjusted: true});
    });

    it('solver angles snap to degrees in [1, 179]; vertices to integers', () => {
        expect(val(snapSolverAngleInput(59.6))).toEqual({value: 60, clamped: false, adjusted: true});
        expect(val(snapSolverAngleInput(180))).toEqual({value: 179, clamped: true, adjusted: true});
        expect(val(snapSolverAngleInput(179.4))).toEqual({value: 179, clamped: false, adjusted: true});
        expect(val(snapSolverAngleInput(179.6))).toEqual({value: 179, clamped: true, adjusted: true});
        expect(val(snapSolverAngleInput(0.4))).toEqual({value: 1, clamped: true, adjusted: true});
        expect(val(snapSolverAngleInput(1.4))).toEqual({value: 1, clamped: false, adjusted: true});
        expect(val(snapSolverAngleInput(0.2)).value).toBe(1);
        expect(val(snapVertexInput(2.6))).toEqual({value: 3, clamped: false, adjusted: true});
        expect(val(snapVertexInput(-0.2)).value).toBe(0);
        expect(Object.is(val(snapVertexInput(-0.2)).value, 0)).toBe(true);
        expect(val(snapVertexInput(1e12))).toMatchObject({value: 2 ** 25, clamped: true});
    });

    it('non-finite input is an error naming the field and never a value', () => {
        for (const f of [snapAngleInput, snapPiMultipleInput, snapSideInput, snapSolverAngleInput, snapVertexInput]) {
            const e = errorOf(f(NaN, 'field-x'));
            expect(e).toMatchObject({field: 'field-x', reason: 'not-finite'});
            expect(f(Infinity).ok).toBe(false);
        }
    });

    it('snapped values are accepted by the strict parser', () => {
        const side = val(snapSideInput(7.3)).value;
        const s = {...clone(DEFAULT_TRIANGLE_STATE), data: {type: 'sss', a: side, b: 6, c: 7}};
        expect(parseTriangleState(s).ok).toBe(true);
    });
});

describe('round trip (serialize, JSON, parse)', () => {
    it('is the identity for the defaults', () => {
        const u = parseUnitCircleState(JSON.parse(JSON.stringify(serializeUnitCircleState(DEFAULT_UNIT_CIRCLE_STATE))));
        expect(u).toEqual({ok: true, value: DEFAULT_UNIT_CIRCLE_STATE});
        for (const type of SOLVE_DATA_TYPES) {
            const s: TriangleState = {...DEFAULT_TRIANGLE_STATE, data: DEFAULT_SOLVE_DATA[type]};
            expect(parseTriangleState(JSON.parse(JSON.stringify(serializeTriangleState(s))))).toEqual({ok: true, value: s});
        }
    });

    it('is the identity for 2000 seeded random states', () => {
        const next = rng(20261110);
        const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
        const side = () => int(1, 48) / 4;
        const deg = () => int(1, 179);
        const point = () => ({x: int(-30, 30), y: int(-30, 30)});
        for (let i = 0; i < 2000; i++) {
            const u: UnitCircleState = {angle: int(0, 719), secondAngle: int(0, 719), showSymmetries: next() < 0.5, showCosine: next() < 0.5};
            expect(parseUnitCircleState(JSON.parse(JSON.stringify(serializeUnitCircleState(u))))).toEqual({ok: true, value: u});
            const type = SOLVE_DATA_TYPES[int(0, 3)];
            const data = {
                sss: {type, a: side(), b: side(), c: side()},
                sas: {type, b: side(), c: side(), angleA: deg()},
                asa: {type, angleA: deg(), angleB: deg(), c: side()},
                ssa: {type, a: side(), b: side(), angleA: deg()},
            }[type] as TriangleState['data'];
            const t: TriangleState = {mode: TRIANGLE_MODES[int(0, 2)], A: point(), B: point(), C: point(), data};
            expect(parseTriangleState(JSON.parse(JSON.stringify(serializeTriangleState(t))))).toEqual({ok: true, value: t});
        }
    });
});
