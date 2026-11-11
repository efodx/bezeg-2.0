import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {CheckboxGroup} from './CheckboxGroup';

const options = [
    {key: 'a', label: 'Prva', checked: true},
    {key: 'b', label: 'Druga', checked: false},
];

test('the group is named by its visible label and holds one checkbox per option', () => {
    render(<CheckboxGroup label="Lastnosti" options={options} onChange={() => {}}/>);
    const group = screen.getByRole('group', {name: 'Lastnosti'});
    expect(group.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    expect(screen.getByRole('checkbox', {name: 'Prva'})).toBeChecked();
    expect(screen.getByRole('checkbox', {name: 'Druga'})).not.toBeChecked();
});

test('toggling a checkbox reports its key and the requested value', () => {
    const onChange = vi.fn();
    render(<CheckboxGroup label="Lastnosti" options={options} onChange={onChange}/>);
    fireEvent.click(screen.getByRole('checkbox', {name: 'Druga'}));
    expect(onChange).toHaveBeenLastCalledWith('b', true);
    fireEvent.click(screen.getByRole('checkbox', {name: 'Prva'}));
    expect(onChange).toHaveBeenLastCalledWith('a', false);
});

test('describedBy is linked from every checkbox', () => {
    render(<><p id="help">Pomoč</p><CheckboxGroup label="Lastnosti" options={options} describedBy="help" onChange={() => {}}/></>);
    for (const box of screen.getAllByRole('checkbox')) expect(box).toHaveAccessibleDescription('Pomoč');
});
