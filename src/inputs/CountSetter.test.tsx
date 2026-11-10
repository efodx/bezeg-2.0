import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {CountSetter} from './CountSetter';
const countStatus = () => document.querySelector('[data-count-status]')!;

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

test('minus and plus are unavailable at their bounds with a reason, and the bounds may be functions', () => {
    const onPlus = vi.fn();
    const onMinus = vi.fn();
    const {rerender} = render(<CountSetter n={1} min={1} max={() => 4} onPlus={onPlus} onMinus={onMinus}/>);
    const minus = screen.getByRole('button', {name: 'Zmanjšaj število'});
    expect(minus).toHaveAttribute('aria-disabled', 'true');
    expect(minus).not.toBeDisabled();
    expect(minus).toHaveAccessibleDescription('Najmanj 1.');
    fireEvent.click(minus);
    expect(onMinus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Povečaj število'}));
    expect(onPlus).toHaveBeenCalledTimes(1);
    rerender(<CountSetter n={4} min={1} max={() => 4} onPlus={onPlus} onMinus={onMinus}/>);
    expect(screen.getByRole('button', {name: 'Povečaj število'})).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', {name: 'Povečaj število'})).toHaveAccessibleDescription('Največ 4.');
    expect(screen.getByRole('button', {name: 'Zmanjšaj število'})).toHaveAttribute('aria-disabled', 'false');
});

test('pressing at a bound keeps focus on the button and says why in its own status region; caller reasons win', () => {
    const onPlus = vi.fn();
    const {rerender} = render(<CountSetter n={4} min={1} max={5} onPlus={onPlus} onMinus={() => undefined}/>);
    const plus = screen.getByRole('button', {name: 'Povečaj število'});
    plus.focus();
    fireEvent.click(plus);
    expect(onPlus).toHaveBeenCalledTimes(1);
    rerender(<CountSetter n={5} min={1} max={5} onPlus={onPlus} onMinus={() => undefined}/>);
    expect(plus).toHaveFocus();
    expect(document.querySelector('[data-count-reason]')).toBeNull();
    fireEvent.click(plus);
    expect(onPlus).toHaveBeenCalledTimes(1);
    expect(plus).toHaveFocus();
    expect(countStatus()).toHaveTextContent('Največ 5.');
    rerender(<CountSetter n={4} min={1} max={5} onPlus={onPlus} onMinus={() => undefined}/>);
    expect(countStatus()).toHaveTextContent('');
    rerender(<CountSetter n={5} min={1} max={5} maxReason="Pet je preveč." onPlus={onPlus} onMinus={() => undefined}/>);
    fireEvent.click(plus);
    expect(countStatus()).toHaveTextContent('Pet je preveč.');
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
    expect(document.querySelector('.number-input-hint')).toHaveTextContent('Vnesi celo število med 0 in 5.');
    fireEvent.input(field, {target: {value: '9'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.number-input-hint')).toHaveTextContent('Vnesi celo število med 0 in 5.');
});

test('without onSet the value is read-only and shown as an integer', () => {
    render(<CountSetter label="Stopnja" n={3} onPlus={() => undefined} onMinus={() => undefined}/>);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByText('3').tagName).toBe('OUTPUT');
});

test('the field steps by one with an arrow and by the big step with Shift or Page keys, within the bounds', () => {
    const onSet = vi.fn();
    render(<CountSetter n={5} min={1} max={12} onPlus={() => {}} onMinus={() => {}} onSet={onSet}/>);
    const field = screen.getByRole('spinbutton');
    fireEvent.keyDown(field, {key: 'ArrowUp'});
    expect(onSet).toHaveBeenLastCalledWith(6);
    fireEvent.keyDown(field, {key: 'PageUp'});
    expect(onSet).toHaveBeenLastCalledWith(12);
    fireEvent.keyDown(field, {key: 'ArrowDown', shiftKey: true});
    expect(onSet).toHaveBeenLastCalledWith(2);
});

test('help describes the stepper group together with its label', () => {
    render(<CountSetter label="Število krivulj" n={3} help="Največ pet" onPlus={() => undefined} onMinus={() => undefined}/>);
    expect(screen.getByRole('group', {name: 'Število krivulj'})).toHaveAccessibleDescription('Največ pet');
});

test('without help the group has no description', () => {
    render(<CountSetter label="Število krivulj" n={3} onPlus={() => undefined} onMinus={() => undefined}/>);
    expect(screen.getByRole('group', {name: 'Število krivulj'})).not.toHaveAttribute('aria-describedby');
});

test('a blocked-press reason does not come back when the count leaves the bound and returns', () => {
    const props = {min: 1, max: 5, onPlus: () => undefined, onMinus: () => undefined};
    const {rerender} = render(<CountSetter n={1} {...props}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Zmanjšaj število'}));
    expect(countStatus()).toHaveTextContent('Najmanj 1.');
    rerender(<CountSetter n={3} {...props}/>);
    rerender(<CountSetter n={1} {...props}/>);
    expect(countStatus()).toHaveTextContent('');
});

test('a repeated blocked press announces again: the reason line is a new element', () => {
    render(<CountSetter n={1} min={1} max={5} onPlus={() => undefined} onMinus={() => undefined}/>);
    const minus = screen.getByRole('button', {name: 'Zmanjšaj število'});
    fireEvent.click(minus);
    const first = document.querySelector('[data-count-reason]');
    fireEvent.click(minus);
    const second = document.querySelector('[data-count-reason]');
    expect(second).toHaveTextContent('Najmanj 1.');
    expect(second).not.toBe(first);
});

test('with decimals the typed field takes fractional values, shows them, names its buttons and explains a refusal', () => {
    const onSet = vi.fn((value: number) => value > 0);
    render(<CountSetter label="Utež" n={1.25} decimals={2} step={0.25} rejectedHint="Utež mora biti pozitivna." minusLabel="Zmanjšaj utež"
                        plusLabel="Povečaj utež" onPlus={() => undefined} onMinus={() => undefined} onSet={onSet}/>);
    const field = screen.getByRole('spinbutton', {name: 'Utež'}) as HTMLInputElement;
    expect(field.value).toBe('1,25');
    expect(screen.getByRole('button', {name: 'Zmanjšaj utež'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Povečaj utež'})).toBeInTheDocument();
    fireEvent.input(field, {target: {value: '0,5'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(onSet).toHaveBeenLastCalledWith(0.5);
    fireEvent.input(field, {target: {value: '-1'}, inputType: 'insertText'});
    fireEvent.keyDown(field, {key: 'Enter'});
    expect(document.querySelector('.number-input-hint')).toHaveTextContent('Utež mora biti pozitivna.');
});
