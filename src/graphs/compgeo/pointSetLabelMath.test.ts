import {pointSetLabelMath} from './pointSetLabelMath';

test('letters then digits become a subscript in the shared delimiter form', () => {
    expect(pointSetLabelMath('P1')).toBe('$$P_{1}$$');
    expect(pointSetLabelMath('A_0')).toBe('$$A_{0}$$');
    expect(pointSetLabelMath('s12')).toBe('$$s_{12}$$');
});

test('a bare letter or any other name is typeset as it is', () => {
    expect(pointSetLabelMath('a')).toBe('$$a$$');
    expect(pointSetLabelMath('C')).toBe('$$C$$');
});
