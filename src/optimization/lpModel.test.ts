import {BOUND_RANGE, COEFFICIENT_RANGE, DEFAULT_LP_STATE, OBJECTIVE_RANGE, ROW_COUNT_RANGE, SWEEP_RANGE, parseLpState, serializeLpState, type LpState} from './lpModel';
import {solveLinearProgram} from './lp2';

const state = (patch: Partial<LpState>): LpState => ({...DEFAULT_LP_STATE, ...patch});
const rejected = (data: unknown) => {
    const result = parseLpState(data);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
};
const base = serializeLpState(DEFAULT_LP_STATE);
const withField = (field: string, value: unknown) => ({...base, [field]: value});
const row = (a: unknown, b: unknown, c: unknown) => ({a, b, c});

describe('LP state: parse and round trip', () => {
    it('round-trips the default and several states through JSON', () => {
        const states: LpState[] = [
            DEFAULT_LP_STATE,
            state({constraints: [{a: 1, b: 1, c: 4}, {a: 1, b: 3, c: 6}, {a: 1, b: 0, c: 3}], objective: {p: 3, q: 2}, sweep: 11}),
            state({constraints: [{a: -9, b: 9, c: -30}, {a: 9, b: -9, c: 30}, {a: 0, b: 1, c: 0}, {a: 1, b: 0, c: 0}, {a: 5, b: 5, c: 5}], objective: {p: -9, q: 9}, sweep: -100}),
            state({constraints: [{a: -1, b: 1, c: 2}], objective: {p: 0, q: 0}, sweep: 100}),
        ];
        for (const s of states) {
            expect(parseLpState(JSON.parse(JSON.stringify(serializeLpState(s))))).toEqual({ok: true, value: s});
        }
    });

    it('drops unknown and derived fields and never shares rows with the input', () => {
        const input = {...serializeLpState(DEFAULT_LP_STATE), vertices: [[0, 0]], optimum: 12, region: 'polygon'};
        const parsed = parseLpState(input);
        expect(parsed.ok && Object.keys(parsed.value).sort()).toEqual(['constraints', 'objective', 'sweep']);
        if (parsed.ok) expect(parsed.value.constraints[0]).not.toBe(input.constraints[0]);
    });

    it('stores no negative zero', () => {
        const parsed = parseLpState({constraints: [row(-0, 1, -0)], objective: {p: -0, q: 1}, sweep: -0});
        expect(parsed.ok && [parsed.value.constraints[0].a, parsed.value.constraints[0].c, parsed.value.objective.p, parsed.value.sweep].every(v => Object.is(v, 0))).toBe(true);
    });

    it('the default is the LS5 scene: optimum 12 at (2, 3) from the kernel, not stored', () => {
        const result = solveLinearProgram(DEFAULT_LP_STATE.constraints, DEFAULT_LP_STATE.objective);
        expect(result.optimum?.value.format()).toBe('12');
        expect(result.optimum?.vertices.map(v => `${v.x.format()},${v.y.format()}`)).toEqual(['2,3']);
    });

    it('every accepted extreme state is accepted by the kernel', () => {
        const extreme = state({constraints: [row(-9, 9, -30), row(9, -9, 30), row(9, 9, 30), row(-9, -9, -30), row(0, 9, 30)] as LpState['constraints'], objective: {p: 9, q: -9}});
        expect(parseLpState(serializeLpState(extreme)).ok).toBe(true);
        expect(() => solveLinearProgram(extreme.constraints, extreme.objective)).not.toThrow();
    });
});

describe('LP state: rejections carry a field and a code', () => {
    it('rejects a non-object, missing and malformed lists', () => {
        expect(rejected(null)).toEqual({field: 'state', reason: 'not-an-object'});
        expect(rejected([])).toEqual({field: 'state', reason: 'not-an-object'});
        expect(rejected(withField('constraints', undefined))).toEqual({field: 'constraints', reason: 'missing', ...ROW_COUNT_RANGE});
        expect(rejected(withField('constraints', 'x'))).toMatchObject({field: 'constraints', reason: 'not-an-object'});
        expect(rejected(withField('constraints', [3]))).toEqual({field: 'constraints[0]', reason: 'not-an-object'});
        expect(rejected(withField('objective', undefined))).toEqual({field: 'objective', reason: 'missing'});
        expect(rejected(withField('objective', [3, 2]))).toEqual({field: 'objective', reason: 'not-an-object'});
    });

    it('rejects too few and too many rows with the accepted count', () => {
        expect(rejected(withField('constraints', []))).toEqual({field: 'constraints', reason: 'out-of-range', ...ROW_COUNT_RANGE});
        expect(rejected(withField('constraints', Array.from({length: 6}, () => row(1, 1, 1))))).toEqual({field: 'constraints', reason: 'out-of-range', ...ROW_COUNT_RANGE});
    });

    it('rejects coefficients off the grid, non-finite or out of range, naming the row', () => {
        const rows = (r: unknown) => withField('constraints', [row(1, 2, 8), r]);
        expect(rejected(rows(row(10, 1, 1)))).toEqual({field: 'constraints[1].a', reason: 'out-of-range', ...COEFFICIENT_RANGE});
        expect(rejected(rows(row(1, -10, 1)))).toEqual({field: 'constraints[1].b', reason: 'out-of-range', ...COEFFICIENT_RANGE});
        expect(rejected(rows(row(1, 1, 31)))).toEqual({field: 'constraints[1].c', reason: 'out-of-range', ...BOUND_RANGE});
        expect(rejected(rows(row(1, 1, -31)))).toEqual({field: 'constraints[1].c', reason: 'out-of-range', ...BOUND_RANGE});
        expect(rejected(rows(row(1.5, 1, 1)))).toMatchObject({field: 'constraints[1].a', reason: 'off-grid'});
        expect(rejected(rows(row(1, NaN, 1)))).toMatchObject({field: 'constraints[1].b', reason: 'not-finite'});
        expect(rejected(rows(row(1, 1, '3')))).toMatchObject({field: 'constraints[1].c', reason: 'not-finite'});
        expect(rejected(rows(row(1, 1, undefined)))).toMatchObject({field: 'constraints[1].c', reason: 'missing'});
    });

    it('rejects a row with a = b = 0 as a zero row', () => {
        expect(rejected(withField('constraints', [row(1, 2, 8), row(0, 0, 3)]))).toEqual({field: 'constraints[1]', reason: 'zero-row'});
        expect(rejected(withField('constraints', [row(-0, 0, 3)]))).toEqual({field: 'constraints[0]', reason: 'zero-row'});
    });

    it('rejects objective and sweep off the grid or out of range', () => {
        expect(rejected(withField('objective', {p: 10, q: 1}))).toEqual({field: 'objective.p', reason: 'out-of-range', ...OBJECTIVE_RANGE});
        expect(rejected(withField('objective', {p: 1, q: -10}))).toEqual({field: 'objective.q', reason: 'out-of-range', ...OBJECTIVE_RANGE});
        expect(rejected(withField('objective', {p: 1, q: 0.25}))).toMatchObject({field: 'objective.q', reason: 'off-grid'});
        expect(rejected(withField('sweep', 101))).toEqual({field: 'sweep', reason: 'out-of-range', ...SWEEP_RANGE});
        expect(rejected(withField('sweep', 1e999))).toMatchObject({field: 'sweep', reason: 'not-finite'});
        expect(rejected(withField('sweep', undefined))).toMatchObject({field: 'sweep', reason: 'missing'});
    });
});
