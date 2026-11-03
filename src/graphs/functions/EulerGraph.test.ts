import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {LocalizedError, setLanguage} from '../../localization';

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

const preset = (data: unknown) => JSON.stringify({'preset-euler': {data: [{id: 'Osnova', boardState: {boundingBox: [-2, 5, 3.5, -1.5]}, graphState: {initialized: true}, data}]}});
const valid = {example: 'linear-relaxation', x0: -1, y0: 0.5, step: 0.125, xEnd: 2, showExact: false, revealed: 3};

test('the Euler collection imports a model object and keeps other storage untouched', () => {
    localStorage.setItem('other-app', 'keep');
    commitPresetImport(preflightPresetImport(preset(valid)));
    expect(JSON.parse(localStorage.getItem('preset-euler')!).data[0].data).toEqual(valid);
    expect(localStorage.getItem('other-app')).toBe('keep');
});

test('a null reveal count (all steps) is valid', () => {
    commitPresetImport(preflightPresetImport(preset({...valid, revealed: null})));
    expect(JSON.parse(localStorage.getItem('preset-euler')!).data[0].data.revealed).toBeNull();
});

test.each([[[]], [null], [{}], [{...valid, example: 'logistic'}], [{...valid, x0: 11}], [{...valid, xEnd: -11}], [{...valid, y0: 10.5}],
    [{...valid, x0: 3, xEnd: 1}], [{...valid, step: 0.3}], [{...valid, step: 2}], [{...valid, showExact: 'yes'}], [{...valid, revealed: 1.5}],
    [{...valid, revealed: 321}], [{...valid, revealed: -1}], [{...valid, x0: '0'}], [{...valid, y0: NaN}], [{...valid, xEnd: null}]])
('the Euler collection rejects invalid data without writing: %j', data => {
    expect(() => preflightPresetImport(preset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test.each([
    [{...valid, example: 'logistic'}, /example mora biti eno od: exponential, linear-relaxation, blow-up|example must be one of: exponential, linear-relaxation, blow-up/],
    [{...valid, x0: 11}, /x0 morata biti števili med −10 in 10|x0 must be numbers between −10 and 10/],
    [{...valid, y0: 10.5}, /y0 mora biti število med −10 in 10|y0 must be a number between −10 and 10/],
    [{...valid, x0: 3, xEnd: 1}, /x0 ne sme biti večje od xEnd|x0 must not be greater than xEnd/],
    [{...valid, step: 0.3}, /step mora biti eno od: 1, 0.5, 0.25, 0.125, 0.0625/],
    [{...valid, showExact: 'yes'}, /showExact mora biti true ali false|showExact must be true or false/],
    [{...valid, revealed: 321}, /revealed mora biti null ali celo število od 0 do 320|revealed must be null or a whole number from 0 to 320/],
])('Euler errors name the field and the allowed values: %j', (data, expected) => {
    expect(() => preflightPresetImport(preset(data))).toThrow(expected);
    expect(() => preflightPresetImport(preset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test('the English file errors follow the language', () => {
    setLanguage('en');
    expect(() => preflightPresetImport(preset({...valid, y0: 20}))).toThrow(/field y0 must be a number between −10 and 10; correct the value in the file/);
});

test('Euler data of the wrong type keeps the generic function-data message', () => {
    for (const data of [null, [], {...valid, x0: '0'}, {...valid, step: null}]) {
        expect(() => preflightPresetImport(preset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});
