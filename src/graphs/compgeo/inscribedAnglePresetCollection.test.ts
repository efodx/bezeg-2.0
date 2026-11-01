import {INSCRIBED_ANGLE_PRESET_KEY, inscribedAnglePresetCollection} from './inscribedAnglePresetCollection';
import {renderMessage, setLanguage} from '../../localization';

const collection = inscribedAnglePresetCollection(['grid', 'circle', 'radii', 'angles']);
const model = (points: {x: number; y: number}[], extra: object = {}) => ({mode: 'points', closed: false, gridStepExponent: 0, points, ...extra});

beforeEach(() => setLanguage('sl'));

test('the key is the file contract', () => {
    expect(collection.key).toBe(INSCRIBED_ANGLE_PRESET_KEY);
    expect(INSCRIBED_ANGLE_PRESET_KEY).toBe('compgeo-inscribed-angle');
});

test('a round trip returns an equal independent copy; a collinear and a coincident triple and no vertices are accepted', () => {
    for (const points of [[{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 5}], [{x: 0, y: 0}, {x: 1, y: 1}, {x: 3, y: 3}], [{x: 2, y: 2}, {x: 2, y: 2}, {x: 2, y: 2}], []]) {
        const data = model(points);
        const checked = collection.check(data);
        if (!('data' in checked)) throw new Error('rejected');
        expect(checked.data).toEqual(data);
        if (points.length > 0) expect(checked.data.points[0]).not.toBe(data.points[0]);
    }
});

test.each([
    ['four vertices', model([{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}]), 'največ 3', 'at most 3'],
    ['out-of-range integer', model([{x: 2 ** 30, y: 0}]), '33554432', '33554432'],
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

test('the graph state accepts initialized, known toggles, a known example and any finite t, nothing else', () => {
    const check = collection.checkGraphState!;
    expect(check({initialized: true, overlays: {radii: true}, exampleId: 'thales', t: 90})).toBeUndefined();
    expect(check({})).toBeUndefined();
    for (const t of [-90, 360, 1e12, 0, 12.5]) expect(check({t}), String(t)).toBeUndefined();
    expect(check({exampleId: 'nope'})?.key).toBe('inscribed_invalid_example');
    expect(check({exampleId: 'obtuse'})?.key).toBe('inscribed_invalid_example');
    for (const t of [NaN, Infinity, -Infinity, '90', null, {}]) expect(check({t})?.key, String(t)).toBe('inscribed_invalid_t');
    expect(check({overlays: {euler: true}})?.key).toBe('pointset_invalid_overlays');
    expect(check({overlays: {radii: 'yes'}})?.key).toBe('pointset_invalid_overlays');
    expect(check({extra: 1})?.key).toBe('invalid_value');
    expect(check({model: model([])})).toBeDefined();
    expect(check({initialized: 'yes'})).toBeDefined();
    expect(check(null)).toBeDefined();
});

test('the t and example messages are actionable in both languages', () => {
    const rejection = collection.checkGraphState!({t: NaN})!;
    expect(renderMessage(rejection)).toContain('stopinj');
    setLanguage('en');
    expect(renderMessage(rejection)).toContain('degrees');
    expect(renderMessage(collection.checkGraphState!({exampleId: 'x'})!)).toContain('example');
});
