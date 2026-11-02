import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {LocalizedError, setLanguage} from '../../localization';
import {quadratureShapes} from './QuadratureGraph';
import {QuadratureModel} from '../../analysis/quadratureModel';

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

const preset = (data: unknown) => JSON.stringify({'preset-quadrature': {data: [{id: 'Osnova', boardState: {boundingBox: [-1, 2.6, 4.8, -1.8]}, graphState: {initialized: true}, data}]}});
const valid = {rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 8};

test('the quadrature collection imports a model object and keeps other storage untouched', () => {
    localStorage.setItem('other-app', 'keep');
    commitPresetImport(preflightPresetImport(preset(valid)));
    expect(JSON.parse(localStorage.getItem('preset-quadrature')!).data[0].data).toEqual(valid);
    expect(localStorage.getItem('other-app')).toBe('keep');
});

test.each([[[]], [null], [{}], [{...valid, rule: 'midpoint'}], [{...valid, fn: 'cube'}], [{...valid, n: 5}], [{...valid, n: 0}], [{...valid, n: 152}],
    [{...valid, a: 3, b: 1}], [{...valid, b: 8}], [{...valid, a: '0'}], [{...valid, n: NaN}], [{rule: 'trapezoid', fn: 'sin', a: 0, b: 1}]])
('the quadrature collection rejects invalid data without writing: %j', data => {
    expect(() => preflightPresetImport(preset(data))).toThrow(LocalizedError);
    expect(localStorage.length).toBe(0);
});

test('the trapezoid rule accepts an odd n that Simpson refuses', () => {
    commitPresetImport(preflightPresetImport(preset({...valid, rule: 'trapezoid', n: 5})));
    expect(JSON.parse(localStorage.getItem('preset-quadrature')!).data[0].data.n).toBe(5);
});

test.each([
    [{...valid, rule: 'midpoint'}, /trapezoid, simpson/],
    [{...valid, fn: 'cube'}, /square, sin, exp/],
    [{...valid, n: 5}, /sodo število od 2 do 150|even number from 2 to 150/],
    [{...valid, rule: 'trapezoid', n: 151}, /celo število od 1 do 150|whole number from 1 to 150/],
    [{...valid, a: 3, b: 1}, /a mora biti manjša od b|a must be smaller than b/],
    [{...valid, b: 8}, /med −7 in 7|between −7 and 7/],
])('quadrature errors name the rule, function, bound or count to fix: %j', (data, expected) => {
    expect(() => preflightPresetImport(preset(data))).toThrow(expected);
    expect(() => preflightPresetImport(preset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test('the English file errors follow the language', () => {
    setLanguage('en');
    expect(() => preflightPresetImport(preset({...valid, n: 5}))).toThrow(/for Simpson's rule the field n must be an even number from 2 to 150; correct the value in the file/);
});

test('quadrature data of the wrong type keeps the generic function-data message', () => {
    for (const data of [null, [], {...valid, a: '0'}, {rule: 'simpson', fn: 'sin', a: 0, b: 1, n: null}]) {
        expect(() => preflightPresetImport(preset(data))).toThrow(/invalid function data|neveljavni podatki funkcije/);
    }
});

describe('the drawn shapes', () => {
    const model = (rule: QuadratureModel['rule'], n: number): QuadratureModel => ({rule, fn: 'square', a: 0, b: 4, n});
    const polygons = (shapes: { x: number[]; y: number[] }) => {
        const result: { x: number[]; y: number[] }[] = [{x: [], y: []}];
        shapes.x.forEach((x, i) => {
            if (Number.isNaN(x)) result.push({x: [], y: []});
            else {
                result[result.length - 1].x.push(x);
                result[result.length - 1].y.push(shapes.y[i]);
            }
        });
        return result;
    };

    test('the trapezoid rule draws one trapezoid per subinterval with chord heights f(x0) and f(x1)', () => {
        const shapes = polygons(quadratureShapes(model('trapezoid', 4)));
        expect(shapes).toHaveLength(4);
        expect(shapes[0]).toEqual({x: [0, 0, 1, 1, 0], y: [0, 0, 1, 0, 0]});
        expect(shapes[3]).toEqual({x: [3, 3, 4, 4, 3], y: [0, 9, 16, 0, 0]});
    });

    test('Simpson draws one parabola region per pair of subintervals, spanning [x_2j, x_2j+2] and following the parabola', () => {
        const shapes = polygons(quadratureShapes(model('simpson', 4)));
        expect(shapes).toHaveLength(2);
        expect(shapes[0].x[0]).toBe(0);
        expect(shapes[0].x[shapes[0].x.length - 2]).toBe(2);
        expect(shapes[1].x[0]).toBe(2);
        expect(shapes[1].x[shapes[1].x.length - 2]).toBe(4);
        // x^2 is a parabola, so the drawn curve is x^2 itself (samples at k/24 of the pair width)
        shapes[1].x.slice(1, -2).forEach((x, i) => expect(shapes[1].y[i + 1]).toBeCloseTo(x * x, 12));
    });

    test('the number of shapes does not depend on n beyond the rule: n trapezoids, n/2 parabolas', () => {
        expect(polygons(quadratureShapes(model('trapezoid', 150)))).toHaveLength(150);
        expect(polygons(quadratureShapes(model('simpson', 150)))).toHaveLength(75);
    });
});
