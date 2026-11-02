import {
    checkQuadratureModel, chooseQuadratureRule, countRule, DEFAULT_QUADRATURE_MODEL, moveQuadratureEndpoint, parseQuadratureModel, QuadratureModel,
    quadratureApproximation, quadratureView, setQuadratureCount,
} from './quadratureModel';
import {catalogFunction} from './functions';
import {exactIntegral} from './riemann';
import {simpsonRule} from './quadrature';
import {formatSignificant} from './format';

const at = (rule: QuadratureModel['rule'], n: number, fn: QuadratureModel['fn'] = 'sin'): QuadratureModel => ({rule, fn, a: 0, b: Math.PI, n});
const significant = (value: number, digits: number) => Number(value.toPrecision(digits));

describe('N4 example numbers (sin on [0, pi], exact value 2)', () => {
    test('the default model is the lesson example', () => {
        expect(DEFAULT_QUADRATURE_MODEL).toEqual({rule: 'trapezoid', fn: 'sin', a: 0, b: Math.PI, n: 2});
        expect(quadratureView(DEFAULT_QUADRATURE_MODEL).exact).toBeCloseTo(2, 14);
    });

    test.each([[2, 4, 0.4292], [4, 4, 0.1039], [8, 3, 0.0258], [16, 3, 0.00643]])('trapezoid error at n = %i has the lesson value %f', (n, digits, expected) => {
        expect(significant(quadratureView(at('trapezoid', n)).error, digits)).toBe(expected);
    });

    test.each([[2, 3, 0.0944], [4, 3, 0.00456], [8, 3, 0.000269], [16, 3, 0.0000166]])('Simpson error at n = %i has the lesson value %f', (n, digits, expected) => {
        expect(significant(quadratureView(at('simpson', n)).error, digits)).toBe(expected);
    });

    test.each([['trapezoid', 4, 4.13], ['trapezoid', 8, 4.03], ['simpson', 4, 20.7], ['simpson', 8, 16.9], ['simpson', 16, 16.2]] as const)(
        '%s ratio at n = %i is %f', (rule, n, expected) => {
            expect(significant(quadratureView(at(rule, n)).ratio!, 3)).toBe(expected);
        });

    test('the ratio is the error at n/2 over the error at n, and there is none where n/2 is not valid for the rule', () => {
        const view = quadratureView(at('trapezoid', 8));
        expect(view.halfN).toBe(4);
        expect(view.halfError).toBe(quadratureView(at('trapezoid', 4)).error);
        expect(view.ratio).toBe(quadratureView(at('trapezoid', 4)).error / view.error);
        expect(quadratureView(at('trapezoid', 2)).halfN).toBe(1);
        expect(quadratureView(at('trapezoid', 7)).ratio).toBeUndefined();
        expect(quadratureView(at('simpson', 2)).halfN).toBeUndefined();
        expect(quadratureView(at('simpson', 6)).halfN).toBeUndefined();
        expect(quadratureView(at('simpson', 6)).ratio).toBeUndefined();
        expect(quadratureView(at('simpson', 12)).halfN).toBe(6);
    });
});

describe('Simpson is exact for cubics', () => {
    test('x^2 on [0, 3]: error below 1e-12 against the antiderivative, for every even n', () => {
        for (const n of [2, 4, 6, 10, 150]) {
            const view = quadratureView({rule: 'simpson', fn: 'square', a: 0, b: 3, n});
            expect(view.exact).toBeCloseTo(9, 14);
            expect(view.error).toBeLessThan(1e-12);
        }
    });

    test('a local cubic is integrated exactly too, and the trapezoid rule is not exact for x^2', () => {
        const cubic = {value: (x: number) => x ** 3 - 2 * x ** 2 + x - 5};
        const antiderivative = (x: number) => x ** 4 / 4 - 2 * x ** 3 / 3 + x ** 2 / 2 - 5 * x;
        expect(Math.abs(simpsonRule(cubic, -1, 2.5, 4) - (antiderivative(2.5) - antiderivative(-1)))).toBeLessThan(1e-12);
        expect(quadratureView({rule: 'trapezoid', fn: 'square', a: 0, b: 3, n: 4}).error).toBeGreaterThan(0.1);
    });

    test('the exact value is the catalogue antiderivative difference', () => {
        for (const fn of ['square', 'sin', 'exp'] as const) {
            expect(quadratureView({rule: 'simpson', fn, a: -1, b: 2, n: 4}).exact).toBe(exactIntegral(catalogFunction(fn), -1, 2));
        }
        expect(quadratureApproximation(at('simpson', 4))).toBeCloseTo(2.0045598, 6);
    });
});

describe('validity', () => {
    test('Simpson accepts only even n from 2 to 150; the trapezoid rule 1 to 150', () => {
        expect(countRule('simpson')).toEqual({min: 2, max: 150, step: 2});
        expect(countRule('trapezoid')).toEqual({min: 1, max: 150, step: 1});
        const model = at('simpson', 4);
        for (const odd of [1, 3, 5, 149]) expect(setQuadratureCount(model, odd)).toMatchObject({ok: false, issue: {kind: 'count', even: true}});
        for (const bad of [0, 152, 2.5, NaN, '4']) expect(setQuadratureCount(model, bad).ok).toBe(false);
        expect(setQuadratureCount(model, 6)).toMatchObject({ok: true, model: {n: 6}});
        expect(setQuadratureCount(at('trapezoid', 4), 5)).toMatchObject({ok: true, model: {n: 5}});
        expect(setQuadratureCount(at('trapezoid', 4), 151).ok).toBe(false);
    });

    test('switching to Simpson with odd n raises n by one and reports it; even n is kept', () => {
        expect(chooseQuadratureRule(at('trapezoid', 5), 'simpson')).toMatchObject({ok: true, model: {rule: 'simpson', n: 6}, adjustedFrom: 5});
        expect(chooseQuadratureRule(at('trapezoid', 149), 'simpson')).toMatchObject({model: {n: 150}, adjustedFrom: 149});
        const even = chooseQuadratureRule(at('trapezoid', 6), 'simpson');
        expect(even).toMatchObject({ok: true, model: {rule: 'simpson', n: 6}});
        expect('adjustedFrom' in even).toBe(false);
        expect(chooseQuadratureRule(at('simpson', 6), 'trapezoid')).toMatchObject({model: {rule: 'trapezoid', n: 6}});
        expect(chooseQuadratureRule(at('simpson', 6), 'romberg').ok).toBe(false);
    });

    test('the model parser rejects odd Simpson n, bad rule, function, bounds and unknown shapes; it drops unknown properties', () => {
        const valid = at('simpson', 4);
        expect(parseQuadratureModel({...valid, extra: 1})).toEqual(valid);
        for (const bad of [{...valid, n: 5}, {...valid, n: 0}, {...valid, rule: 'midpoint'}, {...valid, fn: 'cube'}, {...valid, a: 3.2, b: 3.1},
            {...valid, b: 7.5}, {...valid, a: -7.5}, {...valid, a: 1, b: 1}, {...valid, n: '4'}, {rule: 'simpson'}, null, [], 3]) {
            expect(parseQuadratureModel(bad), JSON.stringify(bad)).toBeUndefined();
        }
        expect(parseQuadratureModel(at('trapezoid', 5))).toEqual(at('trapezoid', 5));
        expect(checkQuadratureModel({...valid, n: 5})).toMatchObject({ok: false, issue: {kind: 'count', rule: 'simpson', even: true}});
        expect(checkQuadratureModel({...valid, rule: 'x'})).toMatchObject({ok: false, issue: {kind: 'rule'}});
        expect(checkQuadratureModel({...valid, b: 9})).toMatchObject({ok: false, issue: {kind: 'range', endpoints: ['b']}});
        expect(checkQuadratureModel({...valid, a: 2, b: 1})).toMatchObject({ok: false, issue: {kind: 'order'}});
        expect(checkQuadratureModel({...valid, n: '4'})).toMatchObject({ok: false, issue: undefined});
    });

    test('the bounds keep a < b and stay in range; pi stays exact', () => {
        const model = at('trapezoid', 4);
        expect(moveQuadratureEndpoint(model, 'a', 3.2).ok).toBe(false);
        expect(moveQuadratureEndpoint(model, 'b', 0).ok).toBe(false);
        expect(moveQuadratureEndpoint(model, 'b', 7.5).ok).toBe(false);
        expect(moveQuadratureEndpoint(model, 'a', -7)).toMatchObject({ok: true, model: {a: -7}});
        const same = moveQuadratureEndpoint(model, 'b', Math.PI);
        expect(same.ok && same.model).toBe(model);
    });
});

describe('the ratio is the quotient of the displayed errors', () => {
    const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const parseShown = (text: string): number => {
        const [mantissa, exponent] = text.split('·10');
        if (exponent === undefined) return Number(mantissa);
        const sign = exponent.startsWith('⁻') ? -1 : 1;
        const digits = [...exponent.replace('⁻', '')].map(character => SUPERSCRIPT.indexOf(character)).join('');
        return Number(mantissa) * 10 ** (sign * Number(digits));
    };
    test.each([['trapezoid', 1, 150, 1], ['simpson', 2, 150, 2]] as const)('%s, every valid n', (rule, min, max, step) => {
        for (const fn of ['sin', 'exp', 'square'] as const) {
            for (let n = min; n <= max; n += step) {
                const view = quadratureView(at(rule, n, fn));
                if (view.halfError === undefined || view.ratio === undefined) continue;
                const shownError = parseShown(formatSignificant(view.error, 'en', 4));
                const shownHalf = parseShown(formatSignificant(view.halfError, 'en', 4));
                expect(Math.abs(view.ratio / (shownHalf / shownError) - 1)).toBeLessThan(1e-9);
                expect(view.ratio).toBe(view.halfError / view.error);
            }
        }
    });
    test('trapezoid n = 20 on sin: the shown 3-digit ratio is the quotient of the shown errors', () => {
        const view = quadratureView(at('trapezoid', 20));
        const shown = Number((parseShown(formatSignificant(view.halfError!, 'en', 4)) / parseShown(formatSignificant(view.error, 'en', 4))).toPrecision(3));
        expect(Number(view.ratio!.toPrecision(3))).toBe(shown);
    });
});
