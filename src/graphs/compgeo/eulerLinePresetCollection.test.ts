import {EULER_LINE_PRESET_KEY, eulerLinePresetCollection} from './eulerLinePresetCollection';
import {renderMessage, setLanguage} from '../../localization';

const collection = eulerLinePresetCollection(['grid', 'triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle']);
const model = (points: {x: number; y: number}[], extra: object = {}) => ({mode: 'points', closed: false, gridStepExponent: 0, points, ...extra});

beforeEach(() => setLanguage('sl'));

test('the key is the file contract', () => {
    expect(collection.key).toBe(EULER_LINE_PRESET_KEY);
    expect(EULER_LINE_PRESET_KEY).toBe('compgeo-euler-line');
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

test('the graph state accepts initialized, known toggles and a known example id, nothing else', () => {
    const check = collection.checkGraphState!;
    expect(check({initialized: true, overlays: {line: true}, exampleId: 'isosceles'})).toBeUndefined();
    expect(check({})).toBeUndefined();
    expect(check({exampleId: 'nope'})?.key).toBe('euler_invalid_example');
    expect(check({overlays: {centroid: true}})?.key).toBe('pointset_invalid_overlays');
    expect(check({overlays: {line: 'yes'}})?.key).toBe('pointset_invalid_overlays');
    expect(check({model: model([])})).toBeDefined();
    expect(check(null)).toBeDefined();
});
