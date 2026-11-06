import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {expect, test, vi} from 'vitest';
import {PointEditor} from './TensorPatchPanels';

const field = (axis: string) => screen.getByLabelText<HTMLInputElement>(`P ${axis}`);
const apply = () => fireEvent.submit(document.querySelector('form')!);

test('a dragged coordinate shows at most four decimals', () => {
    render(<PointEditor name="P" xyz={[1, 0.123456789, -2.00000004]} onApply={() => {}}/>);
    expect([field('x').value, field('y').value, field('z').value]).toEqual(['1', '0.1235', '-2']);
});

test('Apply keeps the exact value of an axis the user did not change', () => {
    const onApply = vi.fn();
    render(<PointEditor name="P" xyz={[1, 0.123456789, -2.00000004]} onApply={onApply}/>);
    fireEvent.change(field('x'), {target: {value: '3'}});
    apply();
    expect(onApply).toHaveBeenCalledWith([3, 0.123456789, -2.00000004]);
});

test('a typed value that differs from the shown one is applied as typed', () => {
    const onApply = vi.fn();
    render(<PointEditor name="P" xyz={[1, 0.123456789, 0]} onApply={onApply}/>);
    fireEvent.change(field('y'), {target: {value: '0.12'}});
    apply();
    expect(onApply).toHaveBeenCalledWith([1, 0.12, 0]);
});
