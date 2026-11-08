import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import Slider from './Slider';
import {enterNumber} from './testEntry';

test('the slider has a labelled number field that commits in-range values and the range input agrees with it', () => {
    const onChange = vi.fn();
    const {rerender} = render(<Slider customText="Parameter α" min={0} max={1} value={0.5} onChange={onChange}/>);
    const field = screen.getByRole('spinbutton', {name: 'Parameter α, vrednost'}) as HTMLInputElement;
    const range = screen.getByLabelText('Parameter α') as HTMLInputElement;
    expect(field.value).toBe('0,5');
    expect(range.value).toBe('0.5');
    expect(range).toHaveAttribute('aria-valuetext', '0,5');

    fireEvent.input(field, {target: {value: '0,25'}, inputType: 'insertText'});
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onChange).toHaveBeenLastCalledWith(0.25);

    // an external change (dragging, a lesson scene) updates both the range input and the field
    rerender(<Slider customText="Parameter α" min={0} max={1} value={0.8} onChange={onChange}/>);
    expect(range.value).toBe('0.8');
    expect(field.value).toBe('0,8');
});

test('a typed value outside the range is explained and not committed', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={1} value={0.5} onChange={onChange}/>);
    enterNumber(screen.getByRole('spinbutton'), '2');
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('.number-input-hint')).toHaveTextContent('Vnesi vrednost med 0 in 1.');
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

test('Shift with an arrow, PageUp and PageDown move the range by the big step (ten steps unless bigStep is set); a plain arrow is left to the browser', () => {
    const onChange = vi.fn();
    const {rerender} = render(<Slider customText="t" min={0} max={100} step={1} value={50} onChange={onChange}/>);
    const range = screen.getByLabelText('t') as HTMLInputElement;
    expect(fireEvent.keyDown(range, {key: 'ArrowRight'})).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(range, {key: 'ArrowRight', shiftKey: true});
    expect(onChange).toHaveBeenLastCalledWith(60);
    fireEvent.keyDown(range, {key: 'PageDown'});
    expect(onChange).toHaveBeenLastCalledWith(40);
    rerender(<Slider customText="t" min={0} max={100} step={1} bigStep={25} value={90} onChange={onChange}/>);
    fireEvent.keyDown(range, {key: 'PageUp'});
    expect(onChange).toHaveBeenLastCalledWith(100);
});

test('the slider has its own presentation class and lists its range summary and help in aria-describedby', () => {
    const {container} = render(<Slider customText="Parameter α" min={0} max={1} value={0.5} help="Kratka razlaga" onChange={() => undefined}/>);
    expect(container.querySelector('form')).toHaveClass('slider-field');
    const range = screen.getByLabelText('Parameter α') as HTMLInputElement;
    expect(range).toHaveAccessibleDescription(expect.stringContaining('Kratka razlaga'));
    expect(range.getAttribute('aria-describedby')!.split(' ')).toHaveLength(2);
});

test('a cyclic slider wraps a typed value and the arrow keys of its field and range by the period', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={360} step={1} cyclic={360} value={0} onChange={onChange}/>);
    const field = screen.getByRole('spinbutton');
    enterNumber(field, '370');
    expect(onChange).toHaveBeenLastCalledWith(10);
    enterNumber(field, '-30');
    expect(onChange).toHaveBeenLastCalledWith(330);
    fireEvent.keyDown(field, {key: 'ArrowDown'});
    expect(onChange).toHaveBeenLastCalledWith(359);
    const range = screen.getByLabelText('t');
    fireEvent.keyDown(range, {key: 'ArrowLeft'});
    expect(onChange).toHaveBeenLastCalledWith(359);
});

test('a cyclic value with floating-point noise at either end of the period lands on 0, never on -0 or 360', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={360} step={1} cyclic={360} fieldDecimals={12} value={10} onChange={onChange}/>);
    const field = screen.getByRole('spinbutton');
    enterNumber(field, '359,99999999999');
    expect(Object.is(onChange.mock.lastCall?.[0], 0)).toBe(true);
    enterNumber(field, '-0,000000000001');
    expect(Object.is(onChange.mock.lastCall?.[0], 0)).toBe(true);
});

test('a plain slider still refuses a typed value outside its range (cyclic is opt in)', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={360} step={1} value={0} onChange={onChange}/>);
    enterNumber(screen.getByRole('spinbutton'), '370');
    expect(onChange).not.toHaveBeenCalled();
});

test('fieldDecimals lets the exact field accept fractions while the slider step stays whole', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={360} step={1} fieldDecimals={2} value={10} onChange={onChange}/>);
    enterNumber(screen.getByRole('spinbutton'), '12,5');
    expect(onChange).toHaveBeenLastCalledWith(12.5);
    expect(screen.getByLabelText('t')).toHaveAttribute('step', '1');
});

test('onTypedChange receives the typed field text; the field step keys and the range go to onChange', () => {
    const onChange = vi.fn();
    const onTypedChange = vi.fn();
    render(<Slider customText="t" min={0} max={100} step={1} value={10} onChange={onChange} onTypedChange={onTypedChange}/>);
    fireEvent.change(screen.getByLabelText('t'), {target: {value: '20'}});
    expect(onChange).toHaveBeenLastCalledWith(20);
    enterNumber(screen.getByRole('spinbutton'), '30');
    expect(onTypedChange).toHaveBeenLastCalledWith(30);
    expect(onChange).toHaveBeenCalledTimes(1);
    // A step key is a step, not typed text: a caller crossing a gap by direction must see it as one (InscribedAngle).
    fireEvent.keyDown(screen.getByRole('spinbutton'), {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(11);
    expect(onTypedChange).toHaveBeenCalledTimes(1);
});

test('unavailableReason keeps the slider focusable but inert and states the reason', () => {
    const onChange = vi.fn();
    render(<Slider customText="t" min={0} max={100} step={1} value={10} unavailableReason="Najprej vklopi točko." onChange={onChange}/>);
    const range = screen.getByLabelText('t') as HTMLInputElement;
    const field = screen.getByRole('spinbutton');
    expect(range.disabled).toBe(false);
    expect(range).toHaveAttribute('aria-disabled', 'true');
    expect(field).toHaveAttribute('readonly');
    expect(range).toHaveAccessibleDescription(expect.stringContaining('Najprej vklopi točko.'));
    // Shown once, outside the field's live hint region, and still describing the field.
    expect(screen.getAllByText('Najprej vklopi točko.')).toHaveLength(1);
    expect(field).toHaveAccessibleDescription(expect.stringContaining('Najprej vklopi točko.'));
    expect(field).not.toHaveAttribute('title');
    fireEvent.change(range, {target: {value: '20'}});
    fireEvent.keyDown(range, {key: 'PageUp'});
    fireEvent.keyDown(range, {key: 'ArrowRight'});
    enterNumber(field, '30');
    expect(onChange).not.toHaveBeenCalled();
});

test('grid snaps an off-grid typed value, says so, and leaves the range step alone', () => {
    const onChange = vi.fn();
    render(<Slider customText="c" min={-5} max={5} step={0.1} grid={0.1} decimals={1} value={1} onChange={onChange}/>);
    enterNumber(screen.getByRole('spinbutton'), '0,26');
    expect(onChange).toHaveBeenLastCalledWith(0.3);
    expect(document.querySelector('.number-input-hint')).toHaveTextContent('0,3');
});

test('valueText sets the thumb text without removing the exact field', () => {
    render(<Slider customText="Kot" min={0} max={360} step={1} value={35} valueText={value => `${value}°`} onChange={() => undefined}/>);
    expect(screen.getByLabelText('Kot')).toHaveAttribute('aria-valuetext', '35°');
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
});
