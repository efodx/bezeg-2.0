import {CROSS_RATIO_PRESET_KEY, crossRatioPresetCollection, PASCAL_PRESET_KEY, pascalPresetCollection, POLE_POLAR_PRESET_KEY, polePolarPresetCollection} from './projectivePresetCollection';
import {PASCAL_EXAMPLES, serializePascalModel} from './pascalModel';
import {POLE_POLAR_EXAMPLES, serializePolePolarModel} from './polePolarModel';
import {CROSS_RATIO_EXAMPLES, serializeCrossRatioModel} from './crossRatioModel';
import {renderMessage, setLanguage} from '../../localization';

const collection = crossRatioPresetCollection();

beforeEach(() => setLanguage('sl'));

test('the key is the frozen file contract', () => {
    expect(collection.key).toBe('projective-cross-ratio');
    expect(CROSS_RATIO_PRESET_KEY).toBe(collection.key);
});

test('valid data round-trips as an independent copy', () => {
    const data = serializeCrossRatioModel(CROSS_RATIO_EXAMPLES.infinity);
    const checked = collection.check(JSON.parse(JSON.stringify(data)));
    expect('data' in checked && checked.data).toEqual(data);
});

test('invalid data is rejected with the actionable message in both languages', () => {
    const bad = {...serializeCrossRatioModel(CROSS_RATIO_EXAMPLES.default), params: [0, 1, 2.5, 4]};
    const checked = collection.check(bad);
    expect('rejection' in checked).toBe(true);
    if (!('rejection' in checked)) return;
    expect(renderMessage(checked.rejection)).toContain('params[2] mora biti celo število');
    setLanguage('en');
    expect(renderMessage(checked.rejection)).toContain('params[2] must be a whole number');
});

test('graphState may carry only initialized', () => {
    expect(collection.checkGraphState?.({initialized: true})).toBeUndefined();
    expect(collection.checkGraphState?.({})).toBeUndefined();
    expect(collection.checkGraphState?.({initialized: 'yes'})).toBeDefined();
    expect(collection.checkGraphState?.({model: {}})).toBeDefined();
    expect(collection.checkGraphState?.(null)).toBeDefined();
});

test('the pole and polar collection has its own frozen key, one parser and actionable refusals', () => {
    const polePolar = polePolarPresetCollection();
    expect(polePolar.key).toBe('projective-pole-polar');
    expect(POLE_POLAR_PRESET_KEY).toBe(polePolar.key);
    const data = serializePolePolarModel(POLE_POLAR_EXAMPLES.infinity);
    const ok = polePolar.check(JSON.parse(JSON.stringify(data)));
    expect('data' in ok && ok.data).toEqual(data);
    const bad = polePolar.check({...data, conic: 'cubic'});
    expect('rejection' in bad).toBe(true);
    if ('rejection' in bad) expect(renderMessage(bad.rejection)).toContain('ellipse, circle, parabola, hyperbola');
    expect(polePolar.checkGraphState?.({model: {}})).toBeDefined();
});

test('the Pascal collection has its own frozen key, one parser and actionable refusals', () => {
    const pascalCollection = pascalPresetCollection();
    expect(pascalCollection.key).toBe('projective-pascal');
    expect(PASCAL_PRESET_KEY).toBe(pascalCollection.key);
    const data = serializePascalModel(PASCAL_EXAMPLES.pappus);
    const ok = pascalCollection.check(JSON.parse(JSON.stringify(data)));
    expect('data' in ok && ok.data).toEqual(data);
    const bad = pascalCollection.check({...data, order: [0, 1, 2, 3, 4, 4]});
    expect('rejection' in bad).toBe(true);
    if ('rejection' in bad) expect(renderMessage(bad.rejection)).toContain('vsako natanko enkrat');
    expect(pascalCollection.checkGraphState?.({model: {}})).toBeDefined();
});
