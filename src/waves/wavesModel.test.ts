import {
    DEFAULT_WAVES_STATE, isOpposite, parseWavesState, serializeWavesState, snapWavesField, sumComponents, WAVES_FIELD_RANGES, WAVES_MODES,
    WAVES_NUMERIC_FIELDS, WAVES_TOGGLE_FIELDS, windowOf, type WavesState,
} from './wavesModel';

const state = (patch: Partial<WavesState> = {}): WavesState => ({...DEFAULT_WAVES_STATE, ...patch});
const bad = (data: unknown) => {
    const result = parseWavesState(data);
    if (result.ok) throw new Error('expected an error');
    return result.error;
};

describe('ranges (hand values from ADR 0055 and the spec)', () => {
    test('frequencies 1 to 40, rates 2 to 64, half waves 1 to 6, all on integer steps', () => {
        expect(WAVES_FIELD_RANGES.f1).toEqual({min: 1, max: 40, step: 1});
        expect(WAVES_FIELD_RANGES.f2).toEqual({min: 1, max: 40, step: 1});
        expect(WAVES_FIELD_RANGES.fs).toEqual({min: 2, max: 64, step: 1});
        expect(WAVES_FIELD_RANGES.halfWaves).toEqual({min: 1, max: 6, step: 1});
    });

    test('the spec examples lie on the grids: amplitudes 3 and 2, phase differences 60, 90, 120, 180 degrees', () => {
        for (const a of [1, 2, 3]) expect(snapWavesField('a1', a)).toEqual({ok: true, value: a});
        for (const p of [-180, 0, 60, 90, 120, 180]) expect(snapWavesField('p2', p)).toEqual({ok: true, value: p});
    });

    test('the windows are 1 s except the beats, which need 2 s', () => {
        expect(WAVES_MODES.map(mode => windowOf(state({mode})))).toEqual([1, 2, 1, 1]);
    });
});

describe('typed input is rounded to the grid and refused outside the range, never clamped', () => {
    test.each([
        ['a1', 0.3, 0.25], ['a1', 0.4, 0.5], ['a1', 3.99, 4], ['p1', 33, 35], ['p1', -178, -180], ['p2', 177, 175],
        ['f1', 12.4, 12], ['f2', 39.6, 40], ['fs', 23.2, 23], ['halfWaves', 2.7, 3], ['extra', 50, 48],
    ] as const)('%s %d is stored as %d', (field, input, expected) => {
        expect(snapWavesField(field, input)).toEqual({ok: true, value: expected});
    });

    test.each([
        ['a1', -0.3], ['a1', 4.5], ['p1', 181], ['p2', -182], ['f1', 0], ['f1', 41], ['f2', 0.4], ['fs', 1], ['fs', 65], ['halfWaves', 0], ['halfWaves', 7], ['extra', 200],
    ] as const)('%s %d is refused, not clamped', (field, input) => {
        const result = snapWavesField(field, input);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.reason).toBe('out-of-range');
    });

    test('NaN and infinity are refused', () => {
        for (const input of [NaN, Infinity, -Infinity]) {
            const result = snapWavesField('f1', input);
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error.reason).toBe('not-finite');
        }
    });

    test('a snapped value has no binary noise and no negative zero', () => {
        expect(snapWavesField('a1', 0.7)).toEqual({ok: true, value: 0.75});
        const zero = snapWavesField('p1', -0.4);
        expect(zero.ok && Object.is(zero.value, 0)).toBe(true);
    });
});

describe('the Preset round trip', () => {
    test('the default and every mode serialize and parse back to the same stored fields', () => {
        for (const mode of WAVES_MODES) {
            const s = state({mode, a1: 3, p1: -45, a2: 2.5, p2: 155, f1: 40, f2: 7, fs: 64, halfWaves: 6, extra: 192, showPhasors: false, showEnvelope: false, showAlias: false, showJoin: true, showSinc: true});
            expect(parseWavesState(JSON.parse(JSON.stringify(serializeWavesState(s))))).toEqual({ok: true, value: s});
        }
        expect(parseWavesState(serializeWavesState(DEFAULT_WAVES_STATE))).toEqual({ok: true, value: DEFAULT_WAVES_STATE});
    });

    test('the stored fields are the model only: time, playing and derived values are dropped, not stored', () => {
        const withHostState = {...DEFAULT_WAVES_STATE, time: 0.4, playing: true, alias: -1};
        const stored = serializeWavesState(withHostState);
        expect(Object.keys(stored).sort()).toEqual(['mode', ...WAVES_NUMERIC_FIELDS, ...WAVES_TOGGLE_FIELDS].sort());
        const parsed = parseWavesState({...stored, time: 0.4, playing: true});
        expect(parsed).toEqual({ok: true, value: DEFAULT_WAVES_STATE});
    });
});

describe('malformed or out-of-range input gives an actionable error and nothing is stored', () => {
    test('not an object', () => {
        for (const data of [null, undefined, 3, 'sum', [1, 2]]) expect(bad(data)).toMatchObject({field: 'state', reason: 'not-an-object'});
    });

    test('a missing or unknown mode names the choices', () => {
        expect(bad({...DEFAULT_WAVES_STATE, mode: undefined})).toMatchObject({field: 'mode', reason: 'missing'});
        const unknown = bad({...DEFAULT_WAVES_STATE, mode: 'chirp'});
        expect(unknown).toMatchObject({field: 'mode', reason: 'unknown-value'});
        for (const mode of WAVES_MODES) expect(unknown.message).toContain(mode);
    });

    test.each(WAVES_NUMERIC_FIELDS)('%s: missing, not a number, out of range and off the grid are named with the range', field => {
        const range = WAVES_FIELD_RANGES[field];
        expect(bad({...DEFAULT_WAVES_STATE, [field]: undefined})).toMatchObject({field, reason: 'missing'});
        expect(bad({...DEFAULT_WAVES_STATE, [field]: '3'})).toMatchObject({field, reason: 'not-finite'});
        expect(bad({...DEFAULT_WAVES_STATE, [field]: NaN})).toMatchObject({field, reason: 'not-finite'});
        const high = bad({...DEFAULT_WAVES_STATE, [field]: range.max + range.step});
        expect(high).toMatchObject({field, reason: 'out-of-range'});
        expect(high.message).toContain(String(range.max));
        expect(bad({...DEFAULT_WAVES_STATE, [field]: range.min - range.step})).toMatchObject({field, reason: 'out-of-range'});
        expect(bad({...DEFAULT_WAVES_STATE, [field]: range.min + range.step / 2})).toMatchObject({field, reason: 'off-grid'});
    });

    test.each(WAVES_TOGGLE_FIELDS)('%s: missing and non-boolean', field => {
        expect(bad({...DEFAULT_WAVES_STATE, [field]: undefined})).toMatchObject({field, reason: 'missing'});
        expect(bad({...DEFAULT_WAVES_STATE, [field]: 1})).toMatchObject({field, reason: 'not-boolean'});
    });

    test('a non-integer frequency is refused, not rounded (ADR 0055 section 2)', () => {
        expect(bad({...DEFAULT_WAVES_STATE, f1: 12.5})).toMatchObject({field: 'f1', reason: 'off-grid'});
    });
});

describe('the components and the opposite-phase test', () => {
    test('the sum mode has two components at f1 with the phases in radians', () => {
        const [c1, c2] = sumComponents(state({a1: 3, a2: 2, f1: 5, f2: 9, p1: 0, p2: 90}));
        expect(c1).toEqual({amplitude: 3, frequency: 5, phase: 0});
        expect(c2.amplitude).toBe(2);
        expect(c2.frequency).toBe(5);
        expect(c2.phase).toBeCloseTo(Math.PI / 2, 15);
    });

    test('opposite phase needs equal non-zero amplitudes and a difference of 180 degrees modulo 360', () => {
        expect(isOpposite(state({a1: 1, a2: 1, p1: 0, p2: 180}))).toBe(true);
        expect(isOpposite(state({a1: 1, a2: 1, p1: 180, p2: 0}))).toBe(true);
        expect(isOpposite(state({a1: 2.5, a2: 2.5, p1: -90, p2: 90}))).toBe(true);
        expect(isOpposite(state({a1: 1, a2: 1, p1: -180, p2: 180}))).toBe(false); // 360 degrees: in phase
        expect(isOpposite(state({a1: 1, a2: 1, p1: 0, p2: 175}))).toBe(false);
        expect(isOpposite(state({a1: 1, a2: 1.25, p1: 0, p2: 180}))).toBe(false);
        expect(isOpposite(state({a1: 0, a2: 0, p1: 0, p2: 180}))).toBe(false);
    });
});
