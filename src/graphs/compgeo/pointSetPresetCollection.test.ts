import {pointSetPresetCollection, pointSetRejection} from './pointSetPresetCollection';
import {parsePointSetModel, PointSetParseReason} from '../../compgeo/pointSetModel';
import {renderMessage, setLanguage} from '../../localization';

const collection = pointSetPresetCollection('compgeo-point-set', ['grid'], {pointLimit: 3});

beforeEach(() => setLanguage('sl'));

test('valid data is accepted and returned as an independent copy', () => {
    const data = {mode: 'polygon', closed: true, gridStepExponent: 1, points: [{x: 0, y: 0}, {x: 2, y: 0}, {x: 1, y: 3}]};
    const checked = collection.check(data);
    expect('data' in checked).toBe(true);
    if (!('data' in checked)) return;
    expect(checked.data).toEqual(data);
    expect(checked.data.points[0]).not.toBe(data.points[0]);
});

// Each refusal reason of the parser maps to a localized message that names the field, in both languages.
const refusals: ReadonlyArray<[PointSetParseReason, unknown, string, string]> = [
    ['not-an-object', [], 'objekt', 'object'],
    ['unknown-mode', {mode: 'cloud', points: []}, 'mode', 'mode'],
    ['points-not-array', {mode: 'points', points: 4}, 'seznam točk', 'list of points'],
    ['too-many-points', {mode: 'points', points: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}]}, 'največ 3', 'at most 3'],
    ['point-not-object', {mode: 'points', points: [5]}, 'x in y', 'x and y'],
    ['non-integer-coordinate', {mode: 'points', points: [{x: 0.5, y: 0}]}, 'celi števili', 'whole numbers'],
    ['coordinate-out-of-range', {mode: 'points', points: [{x: 2 ** 30, y: 0}]}, '33554432', '33554432'],
    ['invalid-grid-step', {mode: 'points', points: [], gridStepExponent: 99}, 'od -8 do 8', 'from -8 to 8'],
    ['closed-not-boolean', {mode: 'polygon', points: [], closed: 'yes'}, 'closed', 'closed'],
    ['closed-in-points-mode', {mode: 'points', points: [], closed: true}, 'polygon', 'polygon'],
];

test.each(refusals)('refusal %s gives an actionable message in Slovenian and English', (reason, data, sl, en) => {
    const parsed = parsePointSetModel(data, {pointLimit: 3});
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toBe(reason);
    const checked = collection.check(data);
    expect('rejection' in checked).toBe(true);
    if (!('rejection' in checked)) return;
    expect(checked.rejection).toEqual(pointSetRejection(parsed));
    expect(renderMessage(checked.rejection)).toContain(sl);
    setLanguage('en');
    expect(renderMessage(checked.rejection)).toContain(en);
    expect(renderMessage(checked.rejection)).not.toMatch(/\{value\d\}/);
});

test('empty and malformed data never passes', () => {
    for (const data of [{}, [], 'points', 0, {points: []}, {mode: 'points'}]) {
        expect('rejection' in collection.check(data)).toBe(true);
    }
});

test('the graph state check accepts only initialized and known overlays', () => {
    const check = collection.checkGraphState!;
    expect(check({initialized: true, overlays: {grid: true}})).toBeUndefined();
    expect(check({})).toBeUndefined();
    expect(check({overlays: {hull: true}})?.key).toBe('pointset_invalid_overlays');
    expect(check({overlays: {grid: 1}})?.key).toBe('pointset_invalid_overlays');
    expect(check({model: {mode: 'points', points: []}})).toBeDefined();
    expect(check(null)).toBeDefined();
});
