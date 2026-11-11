import {CATALOGUE} from './functions2';
import {
    CIRCLE_PARAM_RANGE, CONSTRAINT_IDS, LAGRANGE_WINDOW_HALF, contourWindow, CONTOUR_MODES, DEFAULT_CONTOUR_STATE, LEVEL_COUNT_RANGE, LEVEL_RANGE, LINE_PARAM_RANGE, PROBE_RANGE,
    START_RANGE, STEP_RANGE, circleAngleOf, levelOf, parseContourState, probeOf, serializeContourState, startOf, stepOf,
    withFunction, type ContourState,
} from './contourModel';
import {linePoint} from './constrained';
import {Rational} from '../compgeo/rational';

const state = (patch: Partial<ContourState>): ContourState => ({...DEFAULT_CONTOUR_STATE, ...patch});
const rejected = (data: unknown) => {
    const result = parseContourState(data);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
};
const base = serializeContourState(DEFAULT_CONTOUR_STATE);
const withField = (field: string, value: unknown) => ({...base, [field]: value});

describe('contour state: parse and round trip', () => {
    it('round-trips the default and several states through JSON', () => {
        const states: ContourState[] = [
            DEFAULT_CONTOUR_STATE,
            state({mode: 'gradient', fn: 'hills', constraint: 'circle', probe: [-80, 80], numeric: true, level: -360, levelCount: 9}),
            state({mode: 'descent', fn: 'valley', start: [-8, 4], step: 30, level: 360}),
            state({mode: 'lagrange', fn: 'product', constraint: 'circle', circleParam: 47, lineParam: -12}),
            state({mode: 'lagrange', constraint: 'line', lineParam: 16, start: [-8, 8]}),
        ];
        for (const s of states) {
            expect(parseContourState(JSON.parse(JSON.stringify(serializeContourState(s))))).toEqual({ok: true, value: s});
        }
    });

    it('drops unknown fields and derived values, and never shares arrays with the input', () => {
        const input = {...serializeContourState(DEFAULT_CONTOUR_STATE), contour: [1], converges: true, tangent: true};
        const parsed = parseContourState(input);
        expect(parsed.ok && Object.keys(parsed.value).sort()).toEqual(
            ['camera', 'circleParam', 'constraint', 'fn', 'level', 'levelCount', 'lineParam', 'mode', 'numeric', 'probe', 'start', 'step'],
        );
        if (parsed.ok) expect(parsed.value.probe).not.toBe(input.probe);
    });

    it('stores no negative zero and defaults numeric to false', () => {
        const parsed = parseContourState({...base, level: -0, probe: [-0, 0], numeric: undefined});
        expect(parsed.ok && Object.is(parsed.value.level, 0) && Object.is(parsed.value.probe[0], 0) && parsed.value.numeric === false).toBe(true);
    });

    it('the default is the LS1 to LS4 starting numbers in real units', () => {
        const d = DEFAULT_CONTOUR_STATE;
        expect([levelOf(d.level), probeOf(d.probe[0]), probeOf(d.probe[1])]).toEqual([1, 0.6, 0.8]);
        expect([startOf(d.start[0]), startOf(d.start[1]), stepOf(d.step)]).toEqual([2, 1, 0.03]);
        expect(circleAngleOf(6)).toBe(Math.PI / 4);
        // The default line parameter is the exact tangency point (1, 2) of x + 2y = 5.
        const p = linePoint({a: 1, b: 2, c: 5}, Rational.of(d.lineParam, 4));
        expect([p.x.format(), p.y.format()]).toEqual(['1', '2']);
    });

    it('LS4 uses the wider window [-4, 4]^2 with the tangency point (1, 2) and the whole line range inside it', () => {
        const w = contourWindow('bowl', 'lagrange');
        expect([w.xMin, w.xMax, w.yMin, w.yMax]).toEqual([-LAGRANGE_WINDOW_HALF, LAGRANGE_WINDOW_HALF, -LAGRANGE_WINDOW_HALF, LAGRANGE_WINDOW_HALF]);
        expect(contourWindow('bowl', 'level-sets')).toBe(CATALOGUE.bowl.window);
        for (const T of [LINE_PARAM_RANGE.min, DEFAULT_CONTOUR_STATE.lineParam, LINE_PARAM_RANGE.max]) {
            const p = linePoint({a: 1, b: 2, c: 5}, Rational.of(T, 4));
            for (const v of [p.x, p.y]) expect(Math.abs(v.toNumber())).toBeLessThanOrEqual(w.xMax);
        }
        expect(contourWindow('bowl', 'lagrange').xMax - 1).toBeGreaterThanOrEqual(3); // margin of 3 on x = 1 and 2 on y = 2
    });

    it('offers every mode, function and constraint of the spec', () => {
        expect(CONTOUR_MODES).toEqual(['level-sets', 'gradient', 'descent', 'lagrange']);
        expect(CONSTRAINT_IDS).toEqual(['line', 'circle']);
    });
});

describe('contour state: rejections carry a field and a code', () => {
    it('rejects a non-object, missing and unknown names', () => {
        expect(rejected(null)).toEqual({field: 'state', reason: 'not-an-object'});
        expect(rejected([])).toEqual({field: 'state', reason: 'not-an-object'});
        expect(rejected(withField('fn', undefined)).reason).toBe('missing');
        expect(rejected(withField('fn', 'torus'))).toMatchObject({field: 'fn', reason: 'unknown-value'});
        expect(rejected(withField('mode', 'zoom'))).toMatchObject({field: 'mode', reason: 'unknown-value', choices: CONTOUR_MODES});
        expect(rejected(withField('constraint', 'parabola'))).toMatchObject({field: 'constraint', reason: 'unknown-value', choices: CONSTRAINT_IDS});
        expect(rejected(withField('numeric', 'yes'))).toMatchObject({field: 'numeric', reason: 'unknown-value'});
    });

    it('rejects off-grid, non-finite and out-of-range integers with the accepted range', () => {
        const cases: [string, unknown, {min: number; max: number}][] = [
            ['level', LEVEL_RANGE.max + 1, LEVEL_RANGE], ['level', LEVEL_RANGE.min - 1, LEVEL_RANGE],
            ['levelCount', 0, LEVEL_COUNT_RANGE], ['levelCount', 10, LEVEL_COUNT_RANGE],
            ['step', 0, STEP_RANGE], ['step', 31, STEP_RANGE],
            ['lineParam', 17, LINE_PARAM_RANGE], ['lineParam', -13, LINE_PARAM_RANGE],
            ['circleParam', 48, CIRCLE_PARAM_RANGE], ['circleParam', -1, CIRCLE_PARAM_RANGE],
        ];
        for (const [field, value, range] of cases) {
            expect(rejected(withField(field, value))).toEqual({field, reason: 'out-of-range', min: range.min, max: range.max});
        }
        expect(rejected(withField('level', 1.5))).toMatchObject({field: 'level', reason: 'off-grid'});
        expect(rejected(withField('step', 2.5))).toMatchObject({field: 'step', reason: 'off-grid'});
        expect(rejected(withField('circleParam', Infinity))).toMatchObject({field: 'circleParam', reason: 'not-finite'});
        expect(rejected(withField('lineParam', '3'))).toMatchObject({field: 'lineParam', reason: 'not-finite'});
        expect(rejected(withField('step', undefined))).toMatchObject({field: 'step', reason: 'missing'});
    });

    it('rejects probe and start components off the grid, out of range or malformed', () => {
        expect(rejected(withField('probe', [PROBE_RANGE.max + 1, 0]))).toEqual({field: 'probe[0]', reason: 'out-of-range', ...PROBE_RANGE});
        expect(rejected(withField('probe', [0, 0.5]))).toMatchObject({field: 'probe[1]', reason: 'off-grid'});
        expect(rejected(withField('probe', [1]))).toMatchObject({field: 'probe', reason: 'not-an-object'});
        expect(rejected(withField('probe', undefined)).reason).toBe('missing');
        expect(rejected(withField('start', [START_RANGE.min - 1, 0]))).toEqual({field: 'start[0]', reason: 'out-of-range', ...START_RANGE});
        expect(rejected(withField('start', [0, NaN]))).toMatchObject({field: 'start[1]', reason: 'not-finite'});
    });

    it('rejects a probe or start outside the window of the function, never clamping', () => {
        for (const fn of ['bowl', 'saddle', 'valley', 'product'] as const) {
            expect(CATALOGUE[fn].window.xMax).toBe(2);
            expect(rejected({...base, fn, probe: [41, 0]})).toEqual({field: 'probe', reason: 'inconsistent', min: -40, max: 40});
            expect(rejected({...base, fn, start: [0, 9]})).toEqual({field: 'start', reason: 'inconsistent', min: -8, max: 8});
        }
        expect(parseContourState({...base, fn: 'hills', constraint: 'circle', probe: [41, -80], start: [16, -16]}).ok).toBe(true);
        expect(parseContourState({...base, fn: 'bowl', probe: [40, -40], start: [8, -8]}).ok).toBe(true);
    });

    it('rejects the exact line constraint for hills, which has no rational gradient', () => {
        expect(rejected({...base, fn: 'hills', constraint: 'line'})).toEqual({field: 'constraint', reason: 'inconsistent', choices: ['circle']});
        expect(parseContourState({...base, fn: 'hills', constraint: 'circle'}).ok).toBe(true);
    });

    it('rejects a malformed camera', () => {
        expect(rejected(withField('camera', undefined)).reason).toBe('missing');
        expect(rejected(withField('camera', 3)).reason).toBe('not-an-object');
        expect(rejected(withField('camera', {...base.camera, el: 2}))).toEqual({field: 'camera.el', reason: 'out-of-range'});
        expect(rejected(withField('camera', {...base.camera, distance: 0}))).toEqual({field: 'camera.distance', reason: 'out-of-range'});
        expect(rejected(withField('camera', {...base.camera, projection: 'ortho'}))).toMatchObject({field: 'camera.projection', reason: 'unknown-value'});
        expect(rejected(withField('camera', {...base.camera, target: [0, 0]}))).toMatchObject({field: 'camera.target'});
    });
});

describe('contour state: changing the function keeps the state consistent', () => {
    it('keeps a probe and start that fit and the level, and returns others to the default', () => {
        const wide = state({fn: 'hills', probe: [70, 0], start: [12, 0], level: 3});
        const narrow = withFunction(wide, 'bowl');
        expect(narrow).toMatchObject({fn: 'bowl', probe: DEFAULT_CONTOUR_STATE.probe, start: DEFAULT_CONTOUR_STATE.start, level: 3});
        const kept = withFunction(state({fn: 'hills', probe: [10, -10], start: [4, 4]}), 'valley');
        expect(kept).toMatchObject({probe: [10, -10], start: [4, 4]});
        expect(withFunction(wide, 'hills')).toBe(wide);
    });

    it('falls back to the circle for hills and every result parses', () => {
        const toHills = withFunction(state({constraint: 'line'}), 'hills');
        expect(toHills.constraint).toBe('circle');
        for (const from of ['bowl', 'hills', 'product'] as const) {
            for (const to of ['bowl', 'saddle', 'valley', 'hills', 'product'] as const) {
                const next = withFunction(state({fn: from, constraint: 'circle', probe: [70, 70].map(v => (from === 'hills' ? v : 30)) as [number, number]}), to);
                expect(parseContourState(serializeContourState(next)).ok).toBe(true);
            }
        }
    });
});
