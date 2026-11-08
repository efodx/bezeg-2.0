import React from 'react';
import {render, screen} from '@testing-library/react';
import {ChoiceSelect} from './ChoiceSelect';

test('an option may carry its own accessible name, and options without one keep their text as the name', () => {
    render(<ChoiceSelect label="Toleranca" value="6" onChange={() => undefined}
                         options={[{value: '3', text: '10⁻³', ariaLabel: '10 na minus 3'}, {value: '6', text: '10⁻⁶', ariaLabel: '10 na minus 6'}, {value: 'x', text: 'Drugo'}]}/>);
    expect(screen.getByRole('option', {name: '10 na minus 6'})).toHaveTextContent('10⁻⁶');
    expect(screen.getByRole('option', {name: '10 na minus 3'})).toHaveValue('3');
    expect(screen.getByRole('option', {name: 'Drugo'})).not.toHaveAttribute('aria-label');
});
