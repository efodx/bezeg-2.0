import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {NumberInput} from './NumberInput';
import {FunctionReadout} from '../graphs/functions/FunctionReadout';

/** Typing (or pasting) into the field: an input event that carries an inputType, unlike the native spinner. */
const type = (input: HTMLInputElement, value: string) => fireEvent.input(input, {target: {value}, inputType: 'insertText'});

test('commits only finite in-range numbers, keeps partial typing, and follows the model value', () => {
    const onChange = vi.fn();
    const {rerender} = render(<NumberInput label="k" value={2} min={-10} max={10} onChange={onChange}/>);
    const input = screen.getByLabelText('k') as HTMLInputElement;
    expect(input.value).toBe('2');
    fireEvent.change(input, {target: {value: '3.5'}});
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    fireEvent.change(input, {target: {value: '99'}});
    fireEvent.change(input, {target: {value: ''}});
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(<NumberInput label="k" value={-1.25} min={-10} max={10} onChange={onChange}/>);
    expect(input.value).toBe('-1.25');
    rerender(<NumberInput label="k" value={undefined} disabled min={-10} max={10} onChange={onChange}/>);
    expect(input.value).toBe('');
    expect(input).toBeDisabled();
});

test('arrow keys step by the step prop, clamp to the range, and any typed number is valid for the browser (no step attribute)', () => {
    const onChange = vi.fn();
    render(<NumberInput label="x" value={1} min={-4} max={4} step={0.01} onChange={onChange}/>);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.step).toBe('any');
    fireEvent.change(input, {target: {value: '1.005'}});
    expect(onChange).toHaveBeenLastCalledWith(1.005);
    expect(input.validity.stepMismatch).toBe(false);
    fireEvent.keyDown(input, {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(1.015);
    fireEvent.keyDown(input, {key: 'ArrowDown'});
    fireEvent.keyDown(input, {key: 'ArrowDown'});
    expect(onChange).toHaveBeenLastCalledWith(0.995);
    fireEvent.change(input, {target: {value: '3.999'}});
    fireEvent.keyDown(input, {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(4);
});

test('a value outside the range or rejected by the model is explained, in the current language, and the hint goes away when a valid value is typed', () => {
    const onChange = vi.fn(() => true);
    render(<NumberInput label="x" value={1} min={-4} max={4} onChange={onChange}/>);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    fireEvent.change(input, {target: {value: '7'}});
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med −4 in 4.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, {target: {value: '2'}});
    expect(screen.queryByRole('status')).toBeNull();
    expect(onChange).toHaveBeenCalledWith(2);
});

test('a value the model rejects shows the rejection hint', () => {
    render(<NumberInput label="x" value={1} onChange={() => false}/>);
    fireEvent.change(screen.getByLabelText('x'), {target: {value: '5'}});
    expect(screen.getByRole('status')).toHaveTextContent('Te vrednosti ni mogoče uporabiti.');
});

test('a model rejection can carry its own reason instead of the generic hint', () => {
    render(<NumberInput label="x" value={1} rejectedHint="x must stay below y." onChange={() => false}/>);
    const input = screen.getByLabelText('x');
    fireEvent.change(input, {target: {value: '5'}});
    expect(screen.getByRole('status')).toHaveTextContent('x must stay below y.');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('status').id);
});

test('the readout shows labelled values and an optional note', () => {
    render(<FunctionReadout title="Odčitki" rows={[{id: 'k', label: 'k', value: '2'}, {id: 'n', label: 'n', value: 'ni določen'}]} note="Opomba"/>);
    expect(screen.getByRole('heading', {name: 'Odčitki'})).toBeInTheDocument();
    expect(screen.getByText('ni določen')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Opomba');
});

test('applyOn="confirm" keeps what is typed until Enter or blur, then applies it once and explains a refusal', () => {
    const onChange = vi.fn((value: number) => value < 5);
    render(<NumberInput label="r" value={1} applyOn="confirm" onChange={onChange}/>);
    const input = screen.getByLabelText('r') as HTMLInputElement;
    type(input, '1.');
    type(input, '1.5');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('1.5');
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(1.5);
    // blur applies a changed draft; a refusal stays explained although the field reverts to the model value
    type(input, '9');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(9);
    expect(input.value).toBe('1');
    expect(screen.getByRole('status')).toHaveTextContent('Te vrednosti ni mogoče uporabiti.');
    // an unchanged draft is not applied on blur
    fireEvent.focus(input);
    type(input, '1');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('status')).toBeNull();
    // the arrow keys step at once
    render(<NumberInput label="s" value={1} step={0.5} applyOn="confirm" onChange={onChange}/>);
    fireEvent.keyDown(screen.getByLabelText('s'), {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(1.5);
});

test('applyOn="confirm" applies a native spinner step at once, but keeps typing and pasting until Enter', () => {
    const onChange = vi.fn();
    render(<NumberInput label="r" value={1} applyOn="confirm" onChange={onChange}/>);
    const input = screen.getByLabelText('r') as HTMLInputElement;
    // the spinner dispatches an input event without an inputType (here the plain change event of the test library does the same)
    fireEvent.change(input, {target: {value: '2'}});
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(2);
    type(input, '3');
    fireEvent.input(input, {target: {value: '4'}, inputType: 'insertFromPaste'});
    fireEvent.input(input, {target: {value: '5'}, inputType: 'deleteContentBackward'});
    expect(onChange).toHaveBeenCalledTimes(1);
});

test('applyOn="confirm" shows the model value again after Enter when the model snapped the typed value back to the unchanged one', () => {
    const onChange = vi.fn(() => true);
    render(<NumberInput label="r" value={1} applyOn="confirm" onChange={onChange}/>);
    const input = screen.getByLabelText('r') as HTMLInputElement;
    type(input, '1.01');
    expect(input.value).toBe('1.01');
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(onChange).toHaveBeenLastCalledWith(1.01);
    // the prop stayed 1: the typed text must not stay behind
    expect(input.value).toBe('1');
    // a refused value keeps the typed text so that it can be corrected
    const refuse = vi.fn(() => false);
    render(<NumberInput label="q" value={1} applyOn="confirm" onChange={refuse}/>);
    const other = screen.getByLabelText('q') as HTMLInputElement;
    type(other, '7');
    fireEvent.keyDown(other, {key: 'Enter'});
    expect(other.value).toBe('7');
});
