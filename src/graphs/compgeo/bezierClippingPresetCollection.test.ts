import {renderMessage, setLanguage} from '../../localization';
import {BEZIER_CLIPPING_OVERLAY_IDS} from './compgeoPresetCollections';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {
    BEZIER_CLIPPING_PRESET_KEY, bezierClippingPresetCollection, CLIP_TOLERANCE_EXPONENTS, DEFAULT_CLIP_TOLERANCE_EXPONENT, parseClipToleranceExponent,
} from './bezierClippingPresetCollection';

const collection = bezierClippingPresetCollection(BEZIER_CLIPPING_OVERLAY_IDS);
const points = (pairs: Array<[number, number]>) => pairs.map(([x, y]) => ({x, y}));
const CUBIC = {...CURVE_PAIR_CROSSING, points: points([[0, 0], [1, 6], [5, 6], [6, 0], [0, 4], [2, -2], [4, 9], [6, 4]])};
const HALF = {...CURVE_PAIR_CROSSING, gridStepExponent: -1};

beforeEach(() => setLanguage('sl'));

test('the key is its own; the crossing pair, a cubic pair and the half grid are accepted unchanged', () => {
    expect(collection.key).toBe(BEZIER_CLIPPING_PRESET_KEY);
    expect(BEZIER_CLIPPING_PRESET_KEY).toBe('compgeo-bezier-clipping');
    for (const model of [CURVE_PAIR_CROSSING, CUBIC, HALF]) {
        const checked = collection.check(model);
        expect('data' in checked && checked.data).toEqual(model);
    }
});

test('the overlays are the curve pair ones plus the fat line, the kept and the discarded parts', () => {
    expect(BEZIER_CLIPPING_OVERLAY_IDS).toEqual(['grid', 'control', 'hull', 'fatLine', 'kept', 'discarded']);
    expect(collection.checkGraphState?.({initialized: true, overlays: {fatLine: false, kept: true, discarded: false}})).toBeUndefined();
    expect(collection.checkGraphState?.({overlays: {pieces: true}})?.key).toBe('pointset_invalid_overlays');
});

test('the tolerance exponent is a whole number from 3 to 10; everything else is refused with an actionable message', () => {
    expect(CLIP_TOLERANCE_EXPONENTS).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(DEFAULT_CLIP_TOLERANCE_EXPONENT).toBe(6);
    for (const k of CLIP_TOLERANCE_EXPONENTS) expect(collection.checkGraphState?.({step: 2, clipToleranceExponent: k})).toBeUndefined();
    expect(collection.checkGraphState?.({})).toBeUndefined();
    for (const bad of [2, 11, 6.5, NaN, Infinity, '6', null, true, -6, 0]) {
        expect(collection.checkGraphState?.({clipToleranceExponent: bad})?.key).toBe('bezierclipping_invalid_tolerance');
    }
    expect(parseClipToleranceExponent(3)).toBe(3);
    expect(parseClipToleranceExponent(10)).toBe(10);
    expect(parseClipToleranceExponent(2)).toBeUndefined();
    const rejection = collection.checkGraphState!({clipToleranceExponent: 11})!;
    expect(renderMessage(rejection)).toContain('clipToleranceExponent');
    expect(renderMessage(rejection)).toContain('od 3 do 10');
    setLanguage('en');
    expect(renderMessage(rejection)).toContain('from 3 to 10');
});

test('step is checked as for the Bezier hulls graph; unknown fields and a non-record state are refused', () => {
    expect(collection.checkGraphState?.({step: 0})).toBeUndefined();
    expect(collection.checkGraphState?.({step: 999999})).toBeUndefined();
    for (const step of [-1, 1.5, NaN, '3', null]) expect(collection.checkGraphState?.({step})?.key).toBe('bezierhulls_invalid_step');
    expect(collection.checkGraphState?.({extra: 1})?.key).toBe('invalid_value');
    expect(collection.checkGraphState?.([])?.key).toBe('invalid_state');
});

test('a degree other than 2 or 3 and a bad point list are refused as for the curve pair', () => {
    const bad = (patch: object) => collection.check({...CURVE_PAIR_CROSSING, ...patch});
    const refused = (patch: object) => 'rejection' in bad(patch) && (bad(patch) as {rejection: {key: string}}).rejection.key;
    expect(refused({points: points([[0, 0], [1, 1], [2, 0], [3, 0]])})).toBe('curvepair_invalid_point_count');
    expect(refused({points: points(Array.from({length: 10}, (_, i) => [i, 0] as [number, number]))})).toBe('pointset_invalid_too_many_points');
    expect(refused({mode: 'polygon', closed: true})).toBe('curvepair_invalid_point_count');
});
