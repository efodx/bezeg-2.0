import {renderMessage, setLanguage} from '../../localization';
import {BEZIER_HULLS_OVERLAY_IDS} from './BezierHullsGraph';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {BEZIER_HULLS_PRESET_KEY, bezierHullsPresetCollection, parseBezierHullsStep} from './bezierHullsPresetCollection';

const collection = bezierHullsPresetCollection(BEZIER_HULLS_OVERLAY_IDS);
const points = (pairs: Array<[number, number]>) => pairs.map(([x, y]) => ({x, y}));
const CUBIC = {...CURVE_PAIR_CROSSING, points: points([[0, 0], [1, 6], [5, 6], [6, 0], [0, 4], [2, -2], [4, 9], [6, 4]])};
const HALF = {...CURVE_PAIR_CROSSING, gridStepExponent: -1};

beforeEach(() => setLanguage('sl'));

test("the key is the graph's own; the crossing pair, a cubic pair and the half grid are accepted unchanged", () => {
    expect(collection.key).toBe(BEZIER_HULLS_PRESET_KEY);
    for (const model of [CURVE_PAIR_CROSSING, CUBIC, HALF]) {
        const checked = collection.check(model);
        expect('data' in checked && checked.data).toEqual(model);
    }
});

test('step: a nonnegative integer passes with the overlays; everything else is refused with an actionable message', () => {
    expect(collection.checkGraphState?.({initialized: true, step: 0, overlays: {pieces: false}})).toBeUndefined();
    expect(collection.checkGraphState?.({step: 999999})).toBeUndefined();
    expect(collection.checkGraphState?.({})).toBeUndefined();
    for (const step of [-1, 1.5, NaN, Infinity, '3', null, true]) {
        expect(collection.checkGraphState?.({step})?.key).toBe('bezierhulls_invalid_step');
    }
    expect(parseBezierHullsStep(0)).toBe(0);
    expect(parseBezierHullsStep(-0.5)).toBeUndefined();
    expect(collection.checkGraphState?.({extra: 1})?.key).toBe('invalid_value');
    expect(collection.checkGraphState?.({overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect(collection.checkGraphState?.([])?.key).toBe('invalid_state');
    const rejection = collection.checkGraphState!({step: -1})!;
    expect(renderMessage(rejection)).toContain('step');
    expect(renderMessage(rejection)).toContain('nenegativno celo število');
    setLanguage('en');
    expect(renderMessage(rejection)).toContain('nonnegative integer');
});

const bad = (patch: object) => ({...CURVE_PAIR_CROSSING, ...patch});
const rest = CURVE_PAIR_CROSSING.points.slice(1);
const refusals: ReadonlyArray<[string, unknown, string, string, string]> = [
    ['7 points', bad({points: points([[0, 0], [1, 1], [2, 0], [3, 0], [4, 1], [5, 0], [6, 0]])}), 'curvepair_invalid_point_count', '6 ali 8 točk', '6 or 8 points'],
    ['4 points', bad({points: points([[0, 0], [1, 1], [2, 0], [3, 0]])}), 'curvepair_invalid_point_count', '6 ali 8 točk', '6 or 8 points'],
    ['9 points', bad({points: points(Array.from({length: 9}, (_, i) => [i, 0] as [number, number]))}), 'pointset_invalid_too_many_points', 'največ 8', 'at most 8'],
    ['a non-integer coordinate', bad({points: [{x: 0.5, y: 0}, ...rest]}), 'pointset_invalid_non_integer_coordinate', 'celi števili', 'whole numbers'],
    ['a coordinate beyond 2^10', bad({points: [{x: 1025, y: 0}, ...rest]}), 'pointset_invalid_coordinate_out_of_range', '1024', '1024'],
    ['polygon mode', bad({mode: 'polygon', closed: true}), 'curvepair_invalid_point_count', 'načinu točk', 'points mode'],
    ['an unknown mode', bad({mode: 'cloud'}), 'pointset_invalid_unknown_mode', 'mode', 'mode'],
];

test.each(refusals)('refuses %s with %s in both languages', (_name, data, key, sl, en) => {
    const checked = collection.check(data);
    expect('rejection' in checked).toBe(true);
    if (!('rejection' in checked)) return;
    expect(checked.rejection.key).toBe(key);
    expect(renderMessage(checked.rejection)).toContain(sl);
    setLanguage('en');
    expect(renderMessage(checked.rejection)).toContain(en);
});
