import {describe, expect, it} from 'vitest';
import {LINEAR_MAP_EXAMPLES} from './matrix2';
import {
    applySetExample, applySetMatrix, applySetMode, applySetStart, applySetTestVector, applyStep, changeMode, DEFAULT_LINEAR_MAP_STATE, DEFAULT_START,
    editMatrixEntry, ITERATE_STEP_MAX, startOf, stepOf, validateSetStart, validateStep,
    LinearMapState, parseLinearMapState, selectExample, serializeLinearMapState, snapEntryInput, validateSetExample,
    validateSetMatrix, validateSetMode, validateSetTestVector,
} from './linearMapModel';

const valid = () => JSON.parse(JSON.stringify(serializeLinearMapState({
    ...DEFAULT_LINEAR_MAP_STATE, matrix: [[2, -1], [1, 1]], mode: 'eigen', testAngle: 30, exampleId: 'basis-default',
}))) as Record<string, unknown>;

const errorOf = (data: unknown) => {
    const r = parseLinearMapState(data);
    if (r.ok) throw new Error('expected a rejection');
    return r.error;
};

describe('parseLinearMapState', () => {
    it('defaults to the identity in basis mode', () => {
        expect(DEFAULT_LINEAR_MAP_STATE.matrix).toEqual([[1, 0], [0, 1]]);
        expect(DEFAULT_LINEAR_MAP_STATE.mode).toBe('basis');
    });

    it('round-trips through JSON, with and without a second matrix', () => {
        for (const state of [DEFAULT_LINEAR_MAP_STATE, {...DEFAULT_LINEAR_MAP_STATE, mode: 'composition', secondMatrix: [[0, -1], [1, 0.25]]} as LinearMapState]) {
            const r = parseLinearMapState(JSON.parse(JSON.stringify(serializeLinearMapState(state))));
            expect(r).toEqual({ok: true, value: state});
        }
    });

    it('ignores derived and unknown fields instead of trusting them', () => {
        const r = parseLinearMapState({...valid(), det: 99, eigenvalues: [1, 2], image: [[0, 0]], extra: true});
        expect(r.ok).toBe(true);
        if (r.ok) expect(Object.keys(r.value).sort()).toEqual(Object.keys(serializeLinearMapState(r.value)).sort());
        if (r.ok) expect(r.value).not.toHaveProperty('det');
    });

    it('turns a named example whose matrix does not match into custom', () => {
        const matching = parseLinearMapState({...valid(), exampleId: 'shear', matrix: LINEAR_MAP_EXAMPLES.shear});
        expect(matching.ok && matching.value.exampleId).toBe('shear');
        const mismatched = parseLinearMapState({...valid(), exampleId: 'shear', matrix: [[1, 0], [0, 3]]});
        expect(mismatched.ok && mismatched.value.exampleId).toBe('custom');
    });

    it('rejects off-grid entries, naming the field, without snapping', () => {
        const data = valid();
        data.matrix = [[2, -1], [1, 0.3]];
        expect(errorOf(data)).toMatchObject({field: 'matrix[1][1]', reason: 'off-grid'});
    });

    it('rejects out-of-range entries, naming the field, without clamping', () => {
        const data = valid();
        data.matrix = [[4.25, -1], [1, 1]];
        expect(errorOf(data)).toMatchObject({field: 'matrix[0][0]', reason: 'out-of-range'});
        data.matrix = [[1, -4.25], [1, 1]];
        expect(errorOf(data)).toMatchObject({field: 'matrix[0][1]', reason: 'out-of-range'});
    });

    it('rejects non-finite and non-numeric entries and angles', () => {
        for (const bad of [NaN, Infinity, -Infinity, '1', null, undefined]) {
            const data = valid();
            data.matrix = [[1, 0], [bad, 1]];
            expect(errorOf(data)).toMatchObject({field: 'matrix[1][0]', reason: 'not-finite'});
            const angle = {...valid(), testAngle: bad};
            expect(errorOf(angle)).toMatchObject({field: 'testAngle', reason: 'not-finite'});
        }
    });

    it('rejects malformed matrices, including a bad second matrix', () => {
        expect(errorOf({...valid(), matrix: [[1, 0]]})).toMatchObject({field: 'matrix', reason: 'not-a-matrix'});
        expect(errorOf({...valid(), matrix: undefined})).toMatchObject({field: 'matrix', reason: 'not-a-matrix'});
        expect(errorOf({...valid(), secondMatrix: [[1, 0], [0, 1.1]]})).toMatchObject({field: 'secondMatrix[1][1]', reason: 'off-grid'});
    });

    it('rejects an unknown mode, example, bad angle range, non-boolean toggles and non-objects', () => {
        expect(errorOf({...valid(), mode: 'nope'})).toMatchObject({field: 'mode', reason: 'unknown-value'});
        expect(errorOf({...valid(), exampleId: 'nope'})).toMatchObject({field: 'exampleId', reason: 'unknown-value'});
        expect(errorOf({...valid(), testAngle: 360})).toMatchObject({field: 'testAngle', reason: 'angle-out-of-range'});
        expect(errorOf({...valid(), testAngle: -1})).toMatchObject({field: 'testAngle', reason: 'angle-out-of-range'});
        expect(errorOf({...valid(), curveVisible: 1})).toMatchObject({field: 'curveVisible', reason: 'not-boolean'});
        for (const bad of [null, [], 'x', 3, undefined]) expect(errorOf(bad)).toMatchObject({reason: 'not-an-object'});
    });

    it('accepts custom as an example and every closed example', () => {
        expect(parseLinearMapState({...valid(), exampleId: 'custom'}).ok).toBe(true);
        for (const id of Object.keys(LINEAR_MAP_EXAMPLES)) {
            const state = selectExample(DEFAULT_LINEAR_MAP_STATE, id as keyof typeof LINEAR_MAP_EXAMPLES);
            expect(parseLinearMapState(serializeLinearMapState(state)).ok).toBe(true);
        }
    });

    it('stores negative zero as plus zero', () => {
        const r = parseLinearMapState({...valid(), matrix: [[-0, 0], [0, 1]]});
        expect(r.ok && Object.is(r.value.matrix[0][0], 0)).toBe(true);
    });
});

describe('UI snap path', () => {
    it('snaps to the nearest quarter and reports adjustment without clamping', () => {
        expect(snapEntryInput(0.3)).toEqual({ok: true, value: {value: 0.25, clamped: false, adjusted: true}});
        expect(snapEntryInput(1.5)).toEqual({ok: true, value: {value: 1.5, clamped: false, adjusted: false}});
    });

    it('clamps to [-4, 4] and says so', () => {
        expect(snapEntryInput(9)).toEqual({ok: true, value: {value: 4, clamped: true, adjusted: true}});
        expect(snapEntryInput(-4.1)).toMatchObject({ok: true, value: {value: -4, clamped: true}});
    });

    it('never lets a non-finite value in', () => {
        for (const bad of [NaN, Infinity, -Infinity]) expect(snapEntryInput(bad)).toMatchObject({ok: false, error: {reason: 'not-finite'}});
        const r = editMatrixEntry(DEFAULT_LINEAR_MAP_STATE, 'matrix', 0, 0, NaN);
        expect(r.ok).toBe(false);
    });
});

describe('state transitions', () => {
    it('mode change keeps the matrix', () => {
        const s = selectExample(DEFAULT_LINEAR_MAP_STATE, 'shear');
        for (const mode of ['determinant', 'eigen', 'ellipse', 'composition', 'basis'] as const) {
            expect(changeMode(s, mode).matrix).toEqual([[1, 1], [0, 1]]);
        }
    });

    it('selecting an example sets matrix and id; editing an entry makes it custom', () => {
        const s = selectExample(DEFAULT_LINEAR_MAP_STATE, 'basis-default');
        expect(s).toMatchObject({matrix: [[2, -1], [1, 1]], exampleId: 'basis-default'});
        const e = editMatrixEntry(s, 'matrix', 1, 0, 2.6);
        expect(e.ok && e.value.state).toMatchObject({matrix: [[2, -1], [2.5, 1]], exampleId: 'custom'});
        expect(e.ok && e.value.adjusted).toBe(true);
        expect(s.matrix).toEqual([[2, -1], [1, 1]]);
    });

    it('editing the second matrix needs one and leaves the example alone', () => {
        const s = selectExample(DEFAULT_LINEAR_MAP_STATE, 'shear');
        expect(editMatrixEntry(s, 'secondMatrix', 0, 0, 1).ok).toBe(false);
        const withSecond = applySetMatrix(s, {matrix: [[0, -1], [1, 0]], target: 'secondMatrix'});
        const e = editMatrixEntry(withSecond, 'secondMatrix', 0, 0, 100);
        expect(e.ok && e.value.state).toMatchObject({secondMatrix: [[4, -1], [1, 0]], exampleId: 'shear'});
        expect(e.ok && e.value.clamped).toBe(true);
    });
});

describe('scene-action payload validators', () => {
    it('validates each payload and rejects bad ones with a field', () => {
        expect(validateSetMatrix({matrix: [[1, 1], [0, 1]]})).toEqual({ok: true, value: {matrix: [[1, 1], [0, 1]], target: 'matrix'}});
        expect(validateSetMatrix({matrix: [[1, 1], [0, 1.1]]})).toMatchObject({ok: false, error: {field: 'matrix[1][1]', reason: 'off-grid'}});
        expect(validateSetMatrix({matrix: [[5, 1], [0, 1]]})).toMatchObject({ok: false, error: {reason: 'out-of-range'}});
        expect(validateSetMatrix({matrix: [[1, 1], [0, 1]], target: 'third'})).toMatchObject({ok: false, error: {field: 'target'}});
        expect(validateSetMatrix(null)).toMatchObject({ok: false});
        expect(validateSetMode({mode: 'ellipse'})).toEqual({ok: true, value: {mode: 'ellipse'}});
        expect(validateSetMode({mode: 'x'})).toMatchObject({ok: false, error: {field: 'mode'}});
        expect(validateSetTestVector({angle: 45})).toEqual({ok: true, value: {angle: 45}});
        expect(validateSetTestVector({angle: NaN})).toMatchObject({ok: false, error: {reason: 'not-finite'}});
        expect(validateSetTestVector({angle: 400})).toMatchObject({ok: false, error: {reason: 'angle-out-of-range'}});
        expect(validateSetExample({exampleId: 'shear'})).toEqual({ok: true, value: {exampleId: 'shear'}});
        expect(validateSetExample({exampleId: 'custom'})).toMatchObject({ok: false, error: {field: 'exampleId'}});
    });

    it('applies a multi-action scene in one synchronous sequence, each action reading the previous result', () => {
        let state: LinearMapState = DEFAULT_LINEAR_MAP_STATE;
        const actions: [string, unknown][] = [
            ['set-example', {exampleId: 'eigen-default'}],
            ['set-mode', {mode: 'eigen'}],
            ['set-test-vector', {angle: 90}],
            ['set-matrix', {matrix: [[2, 1], [0, 1]]}],
            ['set-matrix', {matrix: [[0, 1], [1, 0]], target: 'secondMatrix'}],
            ['set-mode', {mode: 'composition'}],
            ['set-matrix', {matrix: [[9, 0], [0, 1]]}], // rejected: state unchanged
        ];
        const outcomes: boolean[] = [];
        for (const [type, payload] of actions) {
            if (type === 'set-example') {
                const v = validateSetExample(payload);
                if (v.ok) state = applySetExample(state, v.value);
                outcomes.push(v.ok);
            } else if (type === 'set-mode') {
                const v = validateSetMode(payload);
                if (v.ok) state = applySetMode(state, v.value);
                outcomes.push(v.ok);
            } else if (type === 'set-test-vector') {
                const v = validateSetTestVector(payload);
                if (v.ok) state = applySetTestVector(state, v.value);
                outcomes.push(v.ok);
            } else {
                const v = validateSetMatrix(payload);
                if (v.ok) state = applySetMatrix(state, v.value);
                outcomes.push(v.ok);
            }
            if (type === 'set-example') expect(state.matrix).toEqual([[4, 1], [2, 3]]);
        }
        expect(outcomes).toEqual([true, true, true, true, true, true, false]);
        expect(state).toMatchObject({
            matrix: [[2, 1], [0, 1]], secondMatrix: [[0, 1], [1, 0]], mode: 'composition', testAngle: 90, exampleId: 'custom',
        });
        expect(parseLinearMapState(serializeLinearMapState(state)).ok).toBe(true);
    });
});

describe('Batch D: start vector and step', () => {
    const stored = (extra: Record<string, unknown>) => ({...valid(), mode: 'iterate', ...extra});

    it('a state stored before Batch D has neither field, loads unchanged and serializes without them', () => {
        const old = valid();
        const parsed = parseLinearMapState(old);
        if (!parsed.ok) throw new Error('expected the old state to load');
        expect(parsed.value).not.toHaveProperty('start');
        expect(parsed.value).not.toHaveProperty('step');
        expect(JSON.parse(JSON.stringify(serializeLinearMapState(parsed.value)))).toEqual(old);
        expect(startOf(parsed.value)).toEqual(DEFAULT_START);
        expect(stepOf(parsed.value)).toBe(0);
    });

    it('stores a start on the quarter grid and a whole step, and round-trips both', () => {
        const parsed = parseLinearMapState(stored({start: [-1.25, 4], step: 30}));
        if (!parsed.ok) throw new Error('expected the state to load');
        expect(parsed.value).toMatchObject({mode: 'iterate', start: [-1.25, 4], step: 30});
        expect(JSON.parse(JSON.stringify(serializeLinearMapState(parsed.value)))).toEqual(stored({start: [-1.25, 4], step: 30}));
    });

    it('rejects an off-grid or out-of-range start and a bad step, naming the field', () => {
        expect(errorOf(stored({start: [0.3, 0]})).field).toBe('start[0]');
        expect(errorOf(stored({start: [0, 4.25]})).field).toBe('start[1]');
        expect(errorOf(stored({start: [1]})).field).toBe('start');
        expect(errorOf(stored({step: 31})).field).toBe('step');
        expect(errorOf(stored({step: 1.5})).field).toBe('step');
        expect(errorOf(stored({step: -1})).field).toBe('step');
    });

    it('set-start is strict (never snapped) and leaves the step; step advances and stops at the end', () => {
        const base: LinearMapState = {...DEFAULT_LINEAR_MAP_STATE, mode: 'iterate', step: 5};
        const start = validateSetStart({start: [2, -0.5]});
        if (!start.ok) throw new Error('expected a valid start');
        expect(applySetStart(base, start.value)).toMatchObject({start: [2, -0.5], step: 5});
        expect(validateSetStart({start: [0.3, 0]}).ok).toBe(false);
        expect(validateSetStart(null).ok).toBe(false);
        const two = validateStep({count: 2});
        if (!two.ok) throw new Error('expected a valid count');
        expect(applyStep(base, two.value).step).toBe(7);
        expect(applyStep({...base, step: 29}, two.value).step).toBe(ITERATE_STEP_MAX);
        const defaulted = validateStep({});
        expect(defaulted.ok && defaulted.value.count).toBe(1);
        expect(validateStep({count: 0}).ok).toBe(false);
        expect(validateStep({count: 2.5}).ok).toBe(false);
        expect(validateStep({count: 31}).ok).toBe(false);
    });
});

describe('Batch B: the ellipse mode conic toggle', () => {
    const stored = (extra: Record<string, unknown>) => ({...valid(), mode: 'ellipse', ...extra});

    it('a state stored before the toggle has none, loads with the image of the circle and serializes without it', () => {
        const old = valid();
        const parsed = parseLinearMapState(old);
        if (!parsed.ok) throw new Error('expected the old state to load');
        expect(parsed.value).not.toHaveProperty('conicVisible');
        expect(JSON.parse(JSON.stringify(serializeLinearMapState(parsed.value)))).toEqual(old);
    });

    it('stores the toggle when it is on, drops a false one, and round-trips', () => {
        const on = parseLinearMapState(stored({conicVisible: true}));
        if (!on.ok) throw new Error('expected the state to load');
        expect(on.value).toMatchObject({mode: 'ellipse', conicVisible: true});
        expect(JSON.parse(JSON.stringify(serializeLinearMapState(on.value)))).toEqual(stored({conicVisible: true}));
        const off = parseLinearMapState(stored({conicVisible: false}));
        if (!off.ok) throw new Error('expected the state to load');
        expect(serializeLinearMapState(off.value)).not.toHaveProperty('conicVisible');
        expect(errorOf(stored({conicVisible: 'yes'})).field).toBe('conicVisible');
    });
});

describe('Batch C: composition elements, translation and pivot', () => {
    const stored = (extra: Record<string, unknown>) => ({...valid(), mode: 'composition', secondMatrix: [[0, 1], [1, 0]], ...extra});

    it('every example in every older mode parses and exports byte-identically, without the new fields', () => {
        for (const mode of ['basis', 'determinant', 'eigen', 'ellipse', 'iterate', 'tracedet'] as const) {
            for (const [id, matrix] of Object.entries(LINEAR_MAP_EXAMPLES)) {
                const text = JSON.stringify(serializeLinearMapState({
                    ...DEFAULT_LINEAR_MAP_STATE, matrix, exampleId: id as keyof typeof LINEAR_MAP_EXAMPLES, mode,
                }));
                const parsed = parseLinearMapState(JSON.parse(text));
                if (!parsed.ok) throw new Error(`expected ${id} in ${mode} to load`);
                expect(JSON.stringify(serializeLinearMapState(parsed.value))).toBe(text);
                for (const key of ['element', 'secondElement', 'translation', 'pivot']) expect(parsed.value).not.toHaveProperty(key);
            }
        }
        const older = stored({});
        const parsed = parseLinearMapState(older);
        if (!parsed.ok) throw new Error('expected the composition state to load');
        expect(JSON.parse(JSON.stringify(serializeLinearMapState(parsed.value)))).toEqual(older);
    });

    it('stores elements, translation and pivot and round-trips them', () => {
        const data = stored({element: {kind: 'rotation', k: 6}, secondElement: {kind: 'reflection', k: 23}, translation: [1.25, -4], pivot: [3, 1]});
        const parsed = parseLinearMapState(data);
        if (!parsed.ok) throw new Error('expected the state to load');
        expect(parsed.value).toMatchObject({element: {kind: 'rotation', k: 6}, secondElement: {kind: 'reflection', k: 23}, translation: [1.25, -4], pivot: [3, 1]});
        expect(JSON.parse(JSON.stringify(serializeLinearMapState(parsed.value)))).toEqual(data);
        expect(parseLinearMapState(stored({element: null, translation: null})).ok).toBe(true);
    });

    it('rejects a bad element, translation or pivot, naming the field', () => {
        expect(errorOf(stored({element: {kind: 'rotation', k: 24}})).field).toBe('element.k');
        expect(errorOf(stored({element: {kind: 'rotation', k: 1.5}})).field).toBe('element.k');
        expect(errorOf(stored({element: {kind: 'rotation', k: -1}})).field).toBe('element.k');
        expect(errorOf(stored({secondElement: {kind: 'shear', k: 1}})).field).toBe('secondElement.kind');
        expect(errorOf(stored({secondElement: 'rotation'})).field).toBe('secondElement');
        expect(errorOf(stored({translation: [0.3, 0]})).field).toBe('translation[0]');
        expect(errorOf(stored({pivot: [0, 5]})).field).toBe('pivot[1]');
        expect(errorOf(stored({pivot: [1]})).field).toBe('pivot');
    });
});
