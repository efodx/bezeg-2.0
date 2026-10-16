import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import Slider from './Slider';

test('the slider has a labelled number field that commits in-range values and the range input agrees with it', () => {
    const onChange = vi.fn();
    const {rerender} = render(<Slider customText="Parameter α" min={0} max={1} value={0.5} onChange={onChange}/>);
    const field = screen.getByRole('spinbutton', {name: 'Parameter α, vrednost'}) as HTMLInputElement;
    const range = screen.getByLabelText('Parameter α') as HTMLInputElement;
    expect(field.value).toBe('0,5');
    expect(range.value).toBe('0.5');
    expect(range).toHaveAttribute('aria-valuetext', '0,5');

    fireEvent.input(field, {target: {value: '0,25'}, inputType: 'insertText'});
    expect(onChange).toHaveBeenLastCalledWith(0.25);

    // an external change (dragging, a lesson scene) updates both the range input and the field
    rerender(<Slider customText="Parameter α" min={0} max={1} value={0.8} onChange={onChange}/>);
    expect(range.value).toBe('0.8');
    expect(field.value).toBe('0,8');
});

test('a typed value outside the range is explained and not committed', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={1} value={0.5} onChange={onChange}/>);
    fireEvent.change(screen.getByRole('spinbutton'), {target: {value: '2'}});
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med 0 in 1.');
});

test('an integer slider shows integers in the field and the bounds', () => {
    render(<Slider customText="Število točk" min={1} max={40} step={1} value={12} onChange={() => undefined}/>);
    expect(screen.getByRole('spinbutton', {name: 'Število točk, vrednost'})).toHaveValue('12');
    const bounds = document.querySelector('.slider-range')!.textContent ?? '';
    expect(bounds).toContain('40');
    expect(bounds).not.toContain(',');
});

test('a formatted slider keeps the read-only output instead of the number field', () => {
    render(<Slider customText="Faza" min={0} max={6.28} value={3.14} formatValue={value => `${value.toFixed(1)} rad`} onChange={() => undefined}/>);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByText('3.1 rad', {selector: 'output'})).toBeInTheDocument();
});

test('Enter in the slider number field does not submit the surrounding form', () => {
    render(<Slider customText="t" min={0} max={1} value={0.5} onChange={() => undefined}/>);
    const notPrevented = fireEvent.keyDown(screen.getByRole('spinbutton', {name: 't, vrednost'}), {key: 'Enter'});
    expect(notPrevented).toBe(false);
});
