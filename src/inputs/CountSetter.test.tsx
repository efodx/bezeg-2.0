import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {CountSetter} from './CountSetter';

test('the stepper is ordered minus, value, plus and never hides the value behind a reset action', () => {
    render(<CountSetter label="Število krivulj" n={3} min={1} max={5} onPlus={() => undefined} onMinus={() => undefined}/>);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Zmanjšaj število', 'Povečaj število']);
    expect(buttons[0]).toHaveTextContent('−');
    expect(buttons[1]).toHaveTextContent('+');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('3').tagName).toBe('OUTPUT');
    expect(screen.getByRole('group', {name: 'Število krivulj'})).toBeInTheDocument();
});

test('minus and plus are disabled at their bounds, and the bounds may be functions', () => {
    const onPlus = vi.fn();
    const onMinus = vi.fn();
    const {rerender} = render(<CountSetter n={1} min={1} max={() => 4} onPlus={onPlus} onMinus={onMinus}/>);
    expect(screen.getByRole('button', {name: 'Zmanjšaj število'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: 'Zmanjšaj število'}));
    expect(onMinus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Povečaj število'}));
    expect(onPlus).toHaveBeenCalledTimes(1);
    rerender(<CountSetter n={4} min={1} max={() => 4} onPlus={onPlus} onMinus={onMinus}/>);
    expect(screen.getByRole('button', {name: 'Povečaj število'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Zmanjšaj število'})).toBeEnabled();
});

test('with onSet the middle is an integer field: whole numbers commit, non-integers and out-of-range values are explained', () => {
    const onSet = vi.fn();
    render(<CountSetter label="Stopnja" n={2} min={0} max={5} onPlus={() => undefined} onMinus={() => undefined} onSet={onSet}/>);
    const field = screen.getByRole('spinbutton', {name: 'Stopnja'}) as HTMLInputElement;
    expect(field.value).toBe('2');
    // typing (an input event with an inputType) waits for Enter: the stepper's rule for integer fields
    fireEvent.input(field, {target: {value: '4'}, inputType: 'insertText'});
    expect(onSet).not.toHaveBeenCalled();
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onSet).toHaveBeenCalledWith(4);
    fireEvent.input(field, {target: {value: '2,5'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med 0 in 5.');
    fireEvent.input(field, {target: {value: '9'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med 0 in 5.');
});

test('without onSet the value is read-only and shown as an integer', () => {
    render(<CountSetter label="Stopnja" n={3} onPlus={() => undefined} onMinus={() => undefined}/>);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByText('3').tagName).toBe('OUTPUT');
});
