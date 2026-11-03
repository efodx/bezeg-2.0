import {presetCollections} from '../base/presets/PresetImport';
import {FORTUNE_PRESET_KEY, fortuneCollection} from './fortunePresetCollection';
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from '../../compgeo/sweep/limits';

/** The collection the file importer consults for `compgeo-fortune` (sweep task 24 registers it), not the module's own export. */
const registered = presetCollections.find(collection => collection.key === FORTUNE_PRESET_KEY);

const sites = (count: number, shift = 0) => ({
    mode: 'points', closed: false, gridStepExponent: 0,
    points: Array.from({length: count}, (_, i) => ({x: i * 2 + shift, y: (i * 7) % 5})),
});

test('the importer knows the Fortune collection, once', () => {
    expect(registered).toBe(fortuneCollection);
    expect(presetCollections.filter(collection => collection.key === FORTUNE_PRESET_KEY)).toHaveLength(1);
});

test('twelve sites are accepted and thirteen refused with a message', () => {
    expect('data' in registered!.check(sites(SWEEP_MAX_SITES))).toBe(true);
    const checked = registered!.check(sites(SWEEP_MAX_SITES + 1));
    expect('rejection' in checked).toBe(true);
});

test('a coordinate at the sweep limit is accepted and one beyond it refused', () => {
    expect('data' in registered!.check(sites(3, SWEEP_COORD_LIMIT - 4))).toBe(true);
    expect('rejection' in registered!.check(sites(3, SWEEP_COORD_LIMIT - 3))).toBe(true);
    expect('rejection' in registered!.check({...sites(3), points: [{x: 0, y: -SWEEP_COORD_LIMIT - 1}]})).toBe(true);
});

test('a polygon-mode set is refused', () => {
    expect('rejection' in registered!.check({...sites(4), mode: 'polygon', closed: true})).toBe(true);
});
