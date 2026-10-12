import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {NumberInput} from './NumberInput';
import {FunctionReadout} from '../graphs/functions/FunctionReadout';

test('commits only finite in-range numbers, keeps partial typing, and follows the model value', () => {
    const onChange = jest.fn();
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
    const onChange = jest.fn();
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
    const onChange = jest.fn(() => true);
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

test('the readout shows labelled values and an optional note', () => {
    render(<FunctionReadout title="Odčitki" rows={[{id: 'k', label: 'k', value: '2'}, {id: 'n', label: 'n', value: 'ni določen'}]} note="Opomba"/>);
    expect(screen.getByRole('heading', {name: 'Odčitki'})).toBeInTheDocument();
    expect(screen.getByText('ni določen')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Opomba');
});
