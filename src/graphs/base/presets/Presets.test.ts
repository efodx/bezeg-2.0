import {PresetService} from './Presets';

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
