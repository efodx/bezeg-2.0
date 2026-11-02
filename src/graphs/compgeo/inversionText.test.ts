import {lineText} from './inversionText';
import {Rational} from '../../compgeo/rational';

const line = (a: number, b: number, c: number) => lineText({kind: 'line', a: Rational.of(a), b: Rational.of(b), c: Rational.of(c)} as Parameters<typeof lineText>[0]);

test('a line prints as a x + b y = c with signs, unit coefficients dropped and zero terms omitted', () => {
    expect(line(1, 0, 2)).toBe('x = 2');
    expect(line(1, -1, 0)).toBe('x − y = 0');
    expect(line(-1, 0, 2)).toBe('−x = 2');
    expect(line(2, 3, 6)).toBe('2x + 3y = 6');
    expect(line(-2, 3, -6)).toBe('−2x + 3y = −6');
    expect(line(0, 1, 4)).toBe('y = 4');
});
