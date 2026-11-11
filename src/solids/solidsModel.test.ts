import {
    DEFAULT_SOLIDS_STATE, DISC_RANGE, MODES, MODE_SOLIDS, NORMAL_RANGE, OFFSET_RANGE, SHEAR_RANGE, SOLID_IDS, Y_AXIS_SOLIDS,
    AXES, CURSOR_RANGE, DEFAULT_CURSOR, axisAccepts, cursorOf, stackPair, isSectionSolid, modeAccepts, offsetOf, parseSolidsState, serializeSolidsState, shearOf, withMode, withSolid, type SolidsState,
} from './solidsModel';
import {cube, isConvex, prism, pyramid} from './solid';

const state = (patch: Partial<SolidsState>): SolidsState => ({...DEFAULT_SOLIDS_STATE, ...patch});
const rejected = (data: unknown) => {
    const result = parseSolidsState(data);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
};

describe('solids state: parse and round trip', () => {
    it('round-trips the default and several states through JSON', () => {
        const states: SolidsState[] = [
            DEFAULT_SOLIDS_STATE,
            state({normal: [-4, 3, 0], offset: -144, solid: 'square-pyramid'}),
            state({solid: 'sqrt', mode: 'revolve', discs: 60}),
            state({solid: 'parabola', mode: 'revolve', axis: 'y'}),
            state({solid: 'square-prism', mode: 'stack', shear: -12, discs: 1, cursor: 39}),
            state({solid: 'cone', mode: 'stack', cursor: 1}),
        ];
        for (const s of states) {
            const parsed = parseSolidsState(JSON.parse(JSON.stringify(serializeSolidsState(s))));
            expect(parsed).toEqual({ok: true, value: s});
        }
    });

    it('drops unknown fields and never shares arrays with the input', () => {
        const input = {...serializeSolidsState(DEFAULT_SOLIDS_STATE), area: 3, loop: [1, 2]};
        const parsed = parseSolidsState(input);
        expect(parsed.ok && Object.keys(parsed.value).sort()).toEqual(['axis', 'camera', 'cursor', 'discs', 'mode', 'normal', 'offset', 'shear', 'solid']);
        if (parsed.ok) expect(parsed.value.normal).not.toBe(input.normal);
    });

    it('stores no negative zero', () => {
        const parsed = parseSolidsState({...DEFAULT_SOLIDS_STATE, normal: [-0, 0, 1], shear: -0});
        expect(parsed.ok && Object.is(parsed.value.normal[0], 0) && Object.is(parsed.value.shear, 0)).toBe(true);
    });

    it('converts to real units by the grid scale', () => {
        expect(offsetOf(5)).toBe(1.25);
        expect(shearOf(6)).toBe(1.5);
    });
});

describe('solids state: rejections carry a field and a code', () => {
    const base = serializeSolidsState(DEFAULT_SOLIDS_STATE);
    const withField = (field: string, value: unknown) => ({...base, [field]: value});

    it('rejects a non-object, missing and unknown names', () => {
        expect(rejected(null)).toEqual({field: 'state', reason: 'not-an-object'});
        expect(rejected([])).toEqual({field: 'state', reason: 'not-an-object'});
        expect(rejected(withField('solid', undefined)).reason).toBe('missing');
        expect(rejected(withField('solid', 'torus'))).toMatchObject({field: 'solid', reason: 'unknown-value', choices: SOLID_IDS});
        expect(rejected(withField('mode', 'cut'))).toMatchObject({field: 'mode', reason: 'unknown-value', choices: MODES});
    });

    it('rejects normal components off the integer grid or range, and the zero normal', () => {
        expect(rejected(withField('normal', [0, 0, 5]))).toEqual({field: 'normal[2]', reason: 'out-of-range', ...NORMAL_RANGE});
        expect(rejected(withField('normal', [-5, 0, 1])).field).toBe('normal[0]');
        expect(rejected(withField('normal', [0.5, 0, 1]))).toMatchObject({field: 'normal[0]', reason: 'off-grid'});
        expect(rejected(withField('normal', [0, 0, 0]))).toEqual({field: 'normal', reason: 'zero-normal'});
        expect(rejected(withField('normal', [1, 2]))).toEqual({field: 'normal', reason: 'not-an-object'});
        expect(rejected(withField('normal', [1, NaN, 2]))).toMatchObject({field: 'normal[1]', reason: 'not-finite'});
        expect(rejected(withField('normal', undefined)).reason).toBe('missing');
    });

    it('rejects offset, shear and disc count off the grid or range without snapping', () => {
        expect(rejected(withField('offset', 145))).toEqual({field: 'offset', reason: 'out-of-range', ...OFFSET_RANGE});
        expect(rejected(withField('offset', 1.25))).toMatchObject({field: 'offset', reason: 'off-grid'});
        expect(rejected(withField('shear', 13))).toMatchObject({field: 'shear', reason: 'out-of-range', ...SHEAR_RANGE});
        expect(rejected(withField('shear', Infinity))).toMatchObject({field: 'shear', reason: 'not-finite'});
        expect(rejected(withField('discs', 0))).toMatchObject({field: 'discs', reason: 'out-of-range', ...DISC_RANGE});
        expect(rejected(withField('discs', 61)).field).toBe('discs');
        expect(rejected(withField('discs', '10')).reason).toBe('not-finite');
    });

    it('reads a missing axis as x and rejects any other value with the accepted names', () => {
        const withoutAxis = {...base} as Record<string, unknown>;
        delete withoutAxis.axis;
        expect(parseSolidsState(withoutAxis)).toEqual({ok: true, value: DEFAULT_SOLIDS_STATE});
        expect(rejected(withField('axis', 'z'))).toEqual({field: 'axis', reason: 'unknown-value', choices: AXES});
        expect(rejected(withField('axis', null)).reason).toBe('missing');
        expect(rejected({...base, solid: 'sphere', mode: 'volume', axis: 'y'})).toEqual({field: 'axis', reason: 'inconsistent', choices: Y_AXIS_SOLIDS});
    });

    it('reads a missing cursor as the middle and rejects one outside the slice heights, without snapping', () => {
        const withoutCursor = {...base} as Record<string, unknown>;
        delete withoutCursor.cursor;
        expect(parseSolidsState(withoutCursor)).toEqual({ok: true, value: DEFAULT_SOLIDS_STATE});
        expect(DEFAULT_SOLIDS_STATE.cursor).toBe(DEFAULT_CURSOR);
        expect(rejected(withField('cursor', 0))).toEqual({field: 'cursor', reason: 'out-of-range', ...CURSOR_RANGE});
        expect(rejected(withField('cursor', 40))).toMatchObject({field: 'cursor', reason: 'out-of-range'});
        expect(rejected(withField('cursor', 2.5))).toMatchObject({field: 'cursor', reason: 'off-grid'});
        expect(rejected(withField('cursor', null)).reason).toBe('missing');
        expect(cursorOf(10)).toBe(0.25);
    });

    it('rejects a malformed camera', () => {
        const cam = DEFAULT_SOLIDS_STATE.camera;
        expect(rejected(withField('camera', undefined))).toEqual({field: 'camera', reason: 'missing'});
        expect(rejected(withField('camera', 3)).reason).toBe('not-an-object');
        expect(rejected(withField('camera', {...cam, el: 2}))).toEqual({field: 'camera.el', reason: 'out-of-range'});
        expect(rejected(withField('camera', {...cam, az: NaN}))).toEqual({field: 'camera.az', reason: 'not-finite'});
        expect(rejected(withField('camera', {...cam, distance: 0}))).toEqual({field: 'camera.distance', reason: 'out-of-range'});
        expect(rejected(withField('camera', {...cam, projection: 'ortho'})).field).toBe('camera.projection');
        expect(rejected(withField('camera', {...cam, target: [0, 0]}))).toEqual({field: 'camera.target', reason: 'not-finite'});
    });
});

describe('sections only for convex grid solids', () => {
    it('the section solids are convex grid meshes, and the others are refused', () => {
        const meshes = [cube(), prism([[0, 0], [8, 0], [0, 8]], 0, 12), prism([[-8, -8], [8, -8], [8, 8], [-8, 8]], 0, 12), pyramid([[-8, -8], [8, -8], [8, 8], [-8, 8]], -8, [0, 0, 8])];
        expect(meshes.every(isConvex)).toBe(true);
        expect(meshes).toHaveLength(MODE_SOLIDS.section.length);
        for (const id of SOLID_IDS) expect(isSectionSolid(id)).toBe(MODE_SOLIDS.section.includes(id));
        expect(isSectionSolid('cone')).toBe(false);
        expect(isSectionSolid('sphere')).toBe(false);
    });

    it('rejects section mode on a non-convex or non-grid choice as inconsistent', () => {
        expect(rejected({...serializeSolidsState(DEFAULT_SOLIDS_STATE), solid: 'cone', mode: 'section'}))
            .toEqual({field: 'mode', reason: 'inconsistent', choices: MODE_SOLIDS.section});
        expect(rejected({...serializeSolidsState(DEFAULT_SOLIDS_STATE), solid: 'cube', mode: 'revolve'}).reason).toBe('inconsistent');
    });

    it('names the failing pair by the cone and rejects stack mode on the other solids', () => {
        expect(SOLID_IDS.filter(id => stackPair(id) === 'failing')).toEqual(['cone']);
        expect(MODE_SOLIDS.stack.map(stackPair)).toEqual(['sheared', 'sheared', 'failing']);
        expect(parseSolidsState({...serializeSolidsState(DEFAULT_SOLIDS_STATE), solid: 'cone', mode: 'stack'}).ok).toBe(true);
        expect(rejected({...serializeSolidsState(DEFAULT_SOLIDS_STATE), solid: 'sphere', mode: 'stack'}))
            .toEqual({field: 'mode', reason: 'inconsistent', choices: MODE_SOLIDS.stack});
    });

    it('accepts every solid in volume mode', () => {
        for (const solid of SOLID_IDS) expect(parseSolidsState({...serializeSolidsState(DEFAULT_SOLIDS_STATE), solid, mode: 'volume'}).ok).toBe(true);
    });
});

describe('changing the solid or mode keeps the state consistent', () => {
    it('falls back to volume mode when the new solid refuses the mode, keeps it otherwise', () => {
        expect(withSolid(DEFAULT_SOLIDS_STATE, 'cone').mode).toBe('volume');
        expect(withSolid(DEFAULT_SOLIDS_STATE, 'square-pyramid').mode).toBe('section');
        expect(withSolid(DEFAULT_SOLIDS_STATE, 'cube')).toBe(DEFAULT_SOLIDS_STATE);
    });

    it('resets the axis to x when the new solid cannot turn about y', () => {
        const turned = state({solid: 'parabola', mode: 'revolve', axis: 'y'});
        expect(withSolid(turned, 'cone').axis).toBe('y');
        expect(withSolid(turned, 'sphere').axis).toBe('x');
        expect(SOLID_IDS.filter(id => axisAccepts(id, 'y'))).toEqual(Y_AXIS_SOLIDS);
    });

    it('falls back to the first solid of the mode when the solid refuses the mode', () => {
        expect(withMode(DEFAULT_SOLIDS_STATE, 'revolve').solid).toBe(MODE_SOLIDS.revolve[0]);
        expect(withMode(DEFAULT_SOLIDS_STATE, 'stack').solid).toBe('cube');
        expect(withMode(state({solid: 'sphere', mode: 'volume'}), 'revolve').solid).toBe('sphere');
    });

    it('every result of both helpers is a valid state', () => {
        for (const solid of SOLID_IDS) {
            for (const mode of MODES) {
                for (const s of [withSolid(state({mode, solid: MODE_SOLIDS[mode][0]}), solid), withMode(state({solid, mode: 'volume'}), mode)]) {
                    expect(modeAccepts(s.mode, s.solid)).toBe(true);
                    expect(parseSolidsState(serializeSolidsState(s)).ok).toBe(true);
                }
            }
        }
    });
});
