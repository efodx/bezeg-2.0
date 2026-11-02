import {SIMSON_LINE_PRESET_KEY, simsonLinePresetCollection} from './simsonLinePresetCollection';
import {renderMessage, setLanguage} from '../../localization';
import {SIMSON_OFFSETS} from '../../compgeo/simsonLineModel';

const collection = simsonLinePresetCollection(['grid', 'triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal']);
const model = (points: {x: number; y: number}[], extra: object = {}) => ({mode: 'points', closed: false, gridStepExponent: 0, points, ...extra});
const check = collection.checkGraphState!;

beforeEach(() => setLanguage('sl'));

test('the key is the file contract', () => {
    expect(collection.key).toBe(SIMSON_LINE_PRESET_KEY);
    expect(SIMSON_LINE_PRESET_KEY).toBe('compgeo-simson-line');
});

test('a collinear and a coincident triple are accepted as valid state, and the copy is independent', () => {
    for (const points of [[{x: 0, y: 0}, {x: 1, y: 1}, {x: 3, y: 3}], [{x: 2, y: 2}, {x: 2, y: 2}, {x: 2, y: 2}]]) {
        const data = model(points);
        const checked = collection.check(data);
        if (!('data' in checked)) throw new Error('rejected');
        expect(checked.data).toEqual(data);
        expect(checked.data.points[0]).not.toBe(data.points[0]);
    }
    expect('data' in collection.check(model([]))).toBe(true);
});

test.each([
    ['four vertices', model([{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}]), 'največ 3', 'at most 3'],
    ['out-of-range coordinate', model([{x: 2 ** 30, y: 0}]), '33554432', '33554432'],
    ['non-integer coordinate', model([{x: 0.5, y: 0}]), 'celi števili', 'whole numbers'],
    ['polygon mode', {mode: 'polygon', closed: false, gridStepExponent: 0, points: []}, 'točke', 'points'],
    ['grid step other than 1', model([], {gridStepExponent: 1}), 'korak mreže', 'grid step'],
])('refuses %s with an actionable message in both languages', (_name, data, sl, en) => {
    const checked = collection.check(data);
    if (!('rejection' in checked)) throw new Error('accepted');
    expect(renderMessage(checked.rejection)).toContain(sl);
    setLanguage('en');
    expect(renderMessage(checked.rejection)).toContain(en);
    expect(renderMessage(checked.rejection)).not.toMatch(/\{value\d\}/);
});

test('malformed data never passes', () => {
    for (const data of [{}, [], 'x', 0, null, {points: []}]) expect('rejection' in collection.check(data)).toBe(true);
});

test('the graph state round-trips every field: initialized, toggles, example, mode, t, every offset and P-prime', () => {
    expect(check({})).toBeUndefined();
    for (const epsilon of SIMSON_OFFSETS) {
        expect(check({initialized: true, overlays: {simson: true, grid: false}, exampleId: 'vertex', mode: 'exact', t: 123.5, epsilon, pPrime: {x: -3, y: 4}})).toBeUndefined();
    }
    expect(check({mode: 'glider', t: 720})).toBeUndefined();
    expect(check({pPrime: {x: 2 ** 25, y: -(2 ** 25)}})).toBeUndefined();
});

test('the graph state refuses an unknown field, with the field named', () => {
    const refused = check({colour: 'red'});
    expect(refused?.key).toBe('invalid_value');
    expect(check({model: model([])})).toBeDefined();
    expect(check(null)).toBeDefined();
    expect(check([])).toBeDefined();
});

test.each([
    ['a bad example id', {exampleId: 'nope'}, 'simson_invalid_example'],
    ['a bad mode', {mode: 'both'}, 'simson_invalid_mode'],
    ['a non-finite t', {t: Number.NaN}, 'simson_invalid_t'],
    ['an infinite t', {t: Number.POSITIVE_INFINITY}, 'simson_invalid_t'],
    ['a string t', {t: '60'}, 'simson_invalid_t'],
    ['an offset outside the set', {epsilon: 0.02}, 'simson_invalid_epsilon'],
    ['a string offset', {epsilon: '0.01'}, 'simson_invalid_epsilon'],
    ['a non-integer P-prime', {pPrime: {x: 0.5, y: 1}}, 'simson_invalid_pprime'],
    ['an out-of-range P-prime', {pPrime: {x: 2 ** 25 + 1, y: 0}}, 'simson_invalid_pprime'],
    ['a P-prime that is not a pair', {pPrime: [1, 2]}, 'simson_invalid_pprime'],
    ['an unknown overlay', {overlays: {centroid: true}}, 'pointset_invalid_overlays'],
    ['a non-boolean overlay', {overlays: {simson: 'yes'}}, 'pointset_invalid_overlays'],
    ['a non-boolean initialized', {initialized: 'yes'}, 'invalid_state'],
])('the graph state refuses %s with an actionable message in both languages', (_name, state, key) => {
    const refused = check(state);
    expect(refused?.key).toBe(key);
    expect(renderMessage(refused!)).not.toMatch(/\{value\d\}/);
    setLanguage('en');
    expect(renderMessage(refused!)).not.toMatch(/\{value\d\}/);
    expect(renderMessage(refused!).length).toBeGreaterThan(5);
});
