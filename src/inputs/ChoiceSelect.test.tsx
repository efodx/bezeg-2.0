import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {ChoiceSelect} from './ChoiceSelect';

test('an option may carry its own accessible name, and options without one keep their text as the name', () => {
    render(<ChoiceSelect label="Toleranca" value="6" onChange={() => undefined}
                         options={[{value: '3', text: '10⁻³', ariaLabel: '10 na minus 3'}, {value: '6', text: '10⁻⁶', ariaLabel: '10 na minus 6'}, {value: 'x', text: 'Drugo'}]}/>);
    expect(screen.getByRole('option', {name: '10 na minus 6'})).toHaveTextContent('10⁻⁶');
    expect(screen.getByRole('option', {name: '10 na minus 3'})).toHaveValue('3');
    expect(screen.getByRole('option', {name: 'Drugo'})).not.toHaveAttribute('aria-label');
});

test('a reason is shown as a line linked to the select, which stays focusable (aria-disabled, not disabled) and ignores changes', () => {
    const onChange = vi.fn();
    render(<ChoiceSelect label="Rob" value="" onChange={onChange} reason="Ni robov za izbiro."
                         options={[{value: '', text: 'Noben'}, {value: 'a', text: 'A'}]}/>);
    const select = screen.getByRole('combobox', {name: 'Rob'});
    expect(select).not.toBeDisabled();
    expect(select).toHaveAttribute('aria-disabled', 'true');
    expect(select).toHaveAccessibleDescription('Ni robov za izbiro.');
    fireEvent.change(select, {target: {value: 'a'}});
    expect(onChange).not.toHaveBeenCalled();
});

test('without a reason the select is enabled and reports changes', () => {
    const onChange = vi.fn();
    render(<ChoiceSelect label="Rob" value="" onChange={onChange} options={[{value: '', text: 'Noben'}, {value: 'a', text: 'A'}]}/>);
    const select = screen.getByRole('combobox', {name: 'Rob'});
    expect(select).not.toHaveAttribute('aria-disabled');
    fireEvent.change(select, {target: {value: 'a'}});
    expect(onChange).toHaveBeenCalledWith('a');
});
