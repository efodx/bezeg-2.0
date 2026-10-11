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

test('the readout shows labelled values and an optional note', () => {
    render(<FunctionReadout title="Odčitki" rows={[{id: 'k', label: 'k', value: '2'}, {id: 'n', label: 'n', value: 'ni določen'}]} note="Opomba"/>);
    expect(screen.getByRole('heading', {name: 'Odčitki'})).toBeInTheDocument();
    expect(screen.getByText('ni določen')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Opomba');
});
