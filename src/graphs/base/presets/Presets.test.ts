import {vi} from 'vitest';
import {firstUnusedPresetName, PresetService} from './Presets';

const collection = {data: [{id: 'Imported example', data: [['JSXBezierCurve', {points: [[0, 0], [1, 2], [3, 0]]}]]}]};
const oldSiteFile = JSON.stringify({'preset-bezier-curve': collection});

beforeEach(() => localStorage.clear());

test('explicitly imports and re-exports the established preset file format in isolated storage', () => {
    localStorage.setItem('preset-bezier-curve', 'original site preset');
    const service = new PresetService('bezier-curve');

    service.importFromString(oldSiteFile);

    expect(localStorage.getItem('preset-bezier-curve')).toBe('original site preset');
    expect(JSON.parse(localStorage.getItem('bezeg-2.0:preset-bezier-curve')!)).toEqual(collection);
    expect(service.loadPresets()).toEqual(collection);
    expect(JSON.parse(service.exportAllPresetsToString())).toEqual({'preset-bezier-curve': collection});
});

test('names an unnamed preset with the first unused preset-N', () => {
    expect(firstUnusedPresetName([])).toBe('preset-1');
    expect(firstUnusedPresetName([{id: 'preset-1'}])).toBe('preset-2');
    expect(firstUnusedPresetName([{id: 'preset-1'}, {id: 'preset-3'}, {id: 'Mine'}])).toBe('preset-2');
});

test('saving unnamed presets through the service yields preset-1 then preset-2', () => {
    const service = new PresetService('bezier-curve');
    for (let i = 0; i < 2; i++) service.savePreset({id: firstUnusedPresetName(service.loadPresets().data)});
    expect(service.loadPresets().data.map(preset => preset.id)).toEqual(['preset-1', 'preset-2']);
});

describe('persisted collection integrity', () => {
    const key = 'bezeg-2.0:preset-bezier-curve';
    afterEach(() => vi.restoreAllMocks());

    test('malformed JSON loads as empty with a problem, and the raw value stays untouched', () => {
        localStorage.setItem(key, '{not json');
        const service = new PresetService('bezier-curve');

        const loaded = service.loadPresets();

        expect(loaded.data).toEqual([]);
        expect(loaded.problem?.key).toBe('stored_presets_unreadable_left_unchanged');
        expect(service.getPreset('x')).toBeUndefined();
        expect(localStorage.getItem(key)).toBe('{not json');
    });

    test.each([
        ['an array', '[]'], ['a missing data list', '{"items":[]}'], ['a non-list data', '{"data":{}}'],
        ['a Preset without a name', '{"data":[{"data":[]}]}'], ['a null Preset', '{"data":[null]}'],
    ])('a collection of the wrong shape (%s) is a problem, not a crash', (_, raw) => {
        localStorage.setItem(key, raw);
        const loaded = new PresetService('bezier-curve').loadPresets();
        expect(loaded.data).toEqual([]);
        expect(loaded.problem?.key).toBe('stored_presets_unreadable_left_unchanged');
    });

    test('saving or deleting onto a corrupt collection is refused and never overwrites the raw value', () => {
        localStorage.setItem(key, '{not json');
        const service = new PresetService('bezier-curve');

        expect(service.savePreset({id: 'mine'}).problem?.key).toBe('stored_presets_unreadable_left_unchanged');
        expect(service.removePreset('mine').problem?.key).toBe('stored_presets_unreadable_left_unchanged');
        expect(localStorage.getItem(key)).toBe('{not json');
    });

    test('denied storage reads as empty with a problem and writes report the problem', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
        vi.spyOn(Storage.prototype, 'length', 'get').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
        const service = new PresetService('bezier-curve');

        expect(service.loadPresets()).toEqual({data: [], problem: expect.objectContaining({key: 'presets_storage_unavailable'})});
        expect(service.savePreset({id: 'mine'}).problem?.key).toBe('presets_storage_unavailable');
        expect(service.exportAll().problem?.key).toBe('presets_storage_unavailable');
    });

    test('a failed write reports the quota problem and keeps the stored collection', () => {
        const service = new PresetService('bezier-curve');
        service.savePreset({id: 'first'});
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });

        const outcome = service.savePreset({id: 'second'});

        expect(outcome.problem?.key).toBe('cannot_save_presets_free_browser_storage_space_and_try_again');
        vi.restoreAllMocks();
        expect(service.loadPresets().data.map(preset => preset.id)).toEqual(['first']);
    });

    test('backup export skips a corrupt collection, still exports the valid ones, and names the skipped key', () => {
        localStorage.setItem('bezeg-2.0:preset-bezier-curve', JSON.stringify(collection));
        localStorage.setItem('bezeg-2.0:preset-b-spline', '{broken');
        const service = new PresetService('bezier-curve');

        expect(JSON.parse(service.exportAllPresetsToString())).toEqual({'preset-bezier-curve': collection});
        const exported = service.exportAll();
        expect(exported.skipped).toEqual(['preset-b-spline']);
        expect(localStorage.getItem('bezeg-2.0:preset-b-spline')).toBe('{broken');
    });
});
