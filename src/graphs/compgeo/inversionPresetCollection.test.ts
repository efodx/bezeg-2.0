import {INVERSION_OVERLAY_IDS, INVERSION_PRESET_KEY, inversionPresetCollection} from './inversionPresetCollection';
import {renderMessage, setLanguage} from '../../localization';
import {INVERSION_EXAMPLES} from '../../compgeo/inversionModel';

const collection = inversionPresetCollection(INVERSION_OVERLAY_IDS);
const model = (points: {x: number; y: number}[], extra: object = {}) => ({mode: 'points', closed: false, gridStepExponent: 0, points, ...extra});
const check = collection.checkGraphState!;
const circle = {centre: {x: 3, y: 0}, radius: 1};

beforeEach(() => setLanguage('sl'));

test('the key is the file contract', () => {
    expect(collection.key).toBe(INVERSION_PRESET_KEY);
    expect(INVERSION_PRESET_KEY).toBe('compgeo-inversion');
});

test('data: zero or one vertex is accepted, and the copy is independent', () => {
    const data = model([{x: 2, y: -3}]);
    const checked = collection.check(data);
    if (!('data' in checked)) throw new Error('rejected');
    expect(checked.data).toEqual(data);
    expect(checked.data.points[0]).not.toBe(data.points[0]);
    expect('data' in collection.check(model([]))).toBe(true);
});

test.each([
    ['two vertices', model([{x: 0, y: 0}, {x: 1, y: 0}]), 'največ 1', 'at most 1'],
    ['out-of-range coordinate', model([{x: 11, y: 0}]), '10', '10'],
    ['non-integer coordinate', model([{x: 0.5, y: 0}]), 'celi števili', 'whole numbers'],
    ['polygon mode', {mode: 'polygon', closed: false, gridStepExponent: 0, points: []}, 'točke', 'points'],
    ['grid step other than 1', model([], {gridStepExponent: 1}), 'korak mreže', 'grid step'],
])('data refuses %s with an actionable message in both languages', (_name, data, sl, en) => {
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

test('every example round-trips as a full graph state', () => {
    expect(check({})).toBeUndefined();
    for (const example of INVERSION_EXAMPLES) {
        const focus = example.point ? 'point' : example.source ? 'source' : example.power ? 'power' : 'angle';
        const state = {
            initialized: true, overlays: {grid: false, rays: true}, exampleId: example.id, focus, radius: example.inversion.radius,
            x: example.point ?? {x: 3, y: 1},
            source: example.source ?? {kind: 'circle', centre: {x: 1, y: 0}, radius: 1},
            power: {circle: example.power?.circle ?? circle, thetaDeg: example.power?.thetaDeg ?? 0},
            angle: example.angle ?? {first: circle, second: circle, which: 0},
        };
        expect(check(state)).toBeUndefined();
    }
    expect(check({source: {kind: 'line', p: {x: -3, y: -3}, q: {x: 3, y: 3}}, power: {circle, thetaDeg: 359.5}})).toBeUndefined();
});

test('the graph state refuses an unknown field, with the field named', () => {
    expect(check({colour: 'red'})?.key).toBe('invalid_value');
    expect(check({model: model([])})).toBeDefined();
    expect(check(null)).toBeDefined();
    expect(check([])).toBeDefined();
    expect(check({power: {circle, thetaDeg: 0, extra: 1}})?.key).toBe('inversion_invalid_power');
});

test.each([
    ['a bad example id', {exampleId: 'nope'}, 'inversion_invalid_example'],
    ['a bad focus', {focus: 'sphere'}, 'inversion_invalid_focus'],
    ['radius 0', {radius: 0}, 'inversion_invalid_radius'],
    ['radius 9', {radius: 9}, 'inversion_invalid_radius'],
    ['a fractional radius', {radius: 1.5}, 'inversion_invalid_radius'],
    ['a non-integer point', {x: {x: 0.5, y: 1}}, 'inversion_invalid_x'],
    ['an out-of-range point', {x: {x: 11, y: 0}}, 'inversion_invalid_x'],
    ['a line source with equal points', {source: {kind: 'line', p: {x: 1, y: 1}, q: {x: 1, y: 1}}}, 'inversion_invalid_source'],
    ['a circle source with radius 0', {source: {kind: 'circle', centre: {x: 1, y: 0}, radius: 0}}, 'inversion_invalid_source'],
    ['a non-finite theta', {power: {circle, thetaDeg: Number.NaN}}, 'inversion_invalid_power'],
    ['an infinite theta', {power: {circle, thetaDeg: Number.POSITIVE_INFINITY}}, 'inversion_invalid_power'],
    ['theta 360', {power: {circle, thetaDeg: 360}}, 'inversion_invalid_power'],
    ['a negative theta', {power: {circle, thetaDeg: -1}}, 'inversion_invalid_power'],
    ['a bad power circle', {power: {circle: {centre: {x: 0.5, y: 0}, radius: 1}, thetaDeg: 0}}, 'inversion_invalid_power'],
    ['which = 2', {angle: {first: circle, second: circle, which: 2}}, 'inversion_invalid_angle'],
    ['an angle block with a bad circle', {angle: {first: circle, second: {centre: {x: 0, y: 0}, radius: 9}, which: 0}}, 'inversion_invalid_angle'],
    ['an unknown overlay', {overlays: {centroid: true}}, 'pointset_invalid_overlays'],
    ['a non-boolean overlay', {overlays: {rays: 'yes'}}, 'pointset_invalid_overlays'],
    ['a non-boolean initialized', {initialized: 'yes'}, 'invalid_state'],
])('the graph state refuses %s with an actionable message in both languages', (_name, state, key) => {
    const refused = check(state);
    expect(refused?.key).toBe(key);
    expect(renderMessage(refused!)).not.toMatch(/\{value\d\}/);
    setLanguage('en');
    expect(renderMessage(refused!)).not.toMatch(/\{value\d\}/);
    expect(renderMessage(refused!).length).toBeGreaterThan(5);
});

test.each([
    ['x', {x: {x: 1, y: 1, z: 2}}, 'x.z'],
    ['a circle source', {source: {kind: 'circle', centre: {x: 1, y: 0}, radius: 1, colour: 'red'}}, 'source.colour'],
    ['a circle source centre', {source: {kind: 'circle', centre: {x: 1, y: 0, z: 0}, radius: 1}}, 'source.centre.z'],
    ['a line source point', {source: {kind: 'line', p: {x: 0, y: 0, w: 1}, q: {x: 3, y: 3}}}, 'source.p.w'],
    ['a power circle', {power: {circle: {centre: {x: 1, y: 0}, radius: 1, fill: 1}, thetaDeg: 0}}, 'power.circle.fill'],
    ['an angle circle centre', {angle: {first: circle, second: {centre: {x: 1, y: 0, z: 1}, radius: 1}, which: 0}}, 'angle.second.centre.z'],
])('the graph state refuses an unknown field in %s, naming it', (_name, state, path) => {
    const refused = check(state);
    expect(refused?.key).toBe('invalid_value');
    expect(renderMessage(refused!)).toContain(path);
});
