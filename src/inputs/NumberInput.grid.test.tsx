import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {NumberInput} from './NumberInput';
import {enterNumber} from './testEntry';
import {setLanguage} from '../localization';

/** Typing (or pasting) into the field: an input event that carries an inputType. */
const type = (input: HTMLElement, value: string) => fireEvent.input(input, {target: {value}, inputType: 'insertText'});
const hint = () => document.querySelector('.number-input-hint');
afterEach(() => setLanguage('sl'));

describe('grid snapping', () => {
    test('a value inside the range but off the grid is rounded, passed rounded, and the field says which value it used', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-4} max={4} grid={0.01} onChange={onChange}/>);
        const input = screen.getByLabelText('x') as HTMLInputElement;
        enterNumber(input, '0,853');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(0.85);
        expect(hint()).toHaveTextContent('Zaokroženo na 0,85.');
        expect(input).not.toHaveAttribute('aria-invalid');
        act(() => setLanguage('en'));
        expect(hint()).toHaveTextContent('Rounded to 0.85.');
    });

    test('the hint clears on the next edit and on the next accepted on-grid commit', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-4} max={4} grid={0.01} onChange={onChange}/>);
        const input = screen.getByLabelText('x') as HTMLInputElement;
        enterNumber(input, '0,853');
        expect(hint()).not.toBeNull();
        type(input, '0,5');
        expect(hint()).toBeNull();
        enterNumber(input, '0,853');
        expect(hint()).not.toBeNull();
        enterNumber(input, '0,5');
        expect(onChange).toHaveBeenLastCalledWith(0.5);
        expect(hint()).toBeNull();
    });

    test('a value on the grid within arithmetic noise passes unchanged with no hint', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-4} max={4} grid={0.1} onChange={onChange}/>);
        enterNumber(screen.getByLabelText('x'), '0,3');
        expect(onChange).toHaveBeenCalledWith(0.3);
        expect(hint()).toBeNull();
    });

    test('a snap result outside the range is refused with the range hint, not clamped', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={0} max={0.4} grid={0.25} onChange={onChange}/>);
        enterNumber(screen.getByLabelText('x'), '0,39');
        expect(onChange).not.toHaveBeenCalled();
        expect(hint()).toHaveTextContent('Vnesi vrednost med 0 in 0,4.');
        cleanup();
        render(<NumberInput label="x" value={1} min={0} max={0.5} grid={0.25} onChange={onChange}/>);
        enterNumber(screen.getByLabelText('x'), '0,39');
        expect(onChange).toHaveBeenCalledWith(0.5);
    });

    test('a value outside the range is refused unchanged, with a grid', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={0} max={4} grid={0.5} onChange={onChange}/>);
        enterNumber(screen.getByLabelText('x'), '4,2');
        expect(onChange).not.toHaveBeenCalled();
        expect(hint()).toHaveTextContent('Vnesi vrednost med 0 in 4.');
    });

    test('without a grid an off-grid value is passed as typed', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-4} max={4} onChange={onChange}/>);
        enterNumber(screen.getByLabelText('x'), '0,853');
        expect(onChange).toHaveBeenCalledWith(0.853);
    });
});

describe('unavailable field', () => {
    test('keeps focus, is read-only, shows the reason, and ignores keys and commits', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-4} max={4} step={1} unavailableReason="Najprej izberi krivuljo." onChange={onChange}/>);
        const input = screen.getByLabelText('x') as HTMLInputElement;
        input.focus();
        expect(input).toHaveFocus();
        expect(input).not.toBeDisabled();
        expect(input).toHaveAttribute('aria-disabled', 'true');
        expect(input).toHaveAttribute('readonly');
        expect(input).toHaveAccessibleDescription('Najprej izberi krivuljo.');
        fireEvent.keyDown(input, {key: 'ArrowUp'});
        fireEvent.keyDown(input, {key: 'PageUp'});
        enterNumber(input, '3');
        fireEvent.blur(input);
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('1');
    });

    test('an open draft is dropped when the field becomes unavailable, and the reason is the hint; it goes when available again', () => {
        const onChange = vi.fn();
        const {rerender} = render(<NumberInput label="x" value={1} min={-4} max={4} onChange={onChange}/>);
        const input = screen.getByLabelText('x') as HTMLInputElement;
        type(input, '3');
        expect(input.value).toBe('3');
        rerender(<NumberInput label="x" value={1} min={-4} max={4} unavailableReason="Zaklenjeno." onChange={onChange}/>);
        expect(input.value).toBe('1');
        expect(hint()).toHaveTextContent('Zaklenjeno.');
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onChange).not.toHaveBeenCalled();
        rerender(<NumberInput label="x" value={1} min={-4} max={4} onChange={onChange}/>);
        expect(hint()).toBeNull();
        expect(input).not.toHaveAttribute('aria-disabled');
        enterNumber(input, '3');
        expect(onChange).toHaveBeenCalledWith(3);
    });
});

describe('snap details and live hint', () => {
    test('the snapped value is shown with the grid decimals', () => {
        render(<NumberInput label="x" value={1} min={-4} max={4} grid={0.001} onChange={() => undefined}/>);
        enterNumber(screen.getByLabelText('x'), '0,8534');
        expect(hint()).toHaveTextContent('Zaokroženo na 0,853.');
    });

    test('a grid with more decimal places than the field shows them all', () => {
        render(<NumberInput label="x" value={1} decimals={0} min={-4} max={4} grid={0.25} onChange={() => undefined}/>);
        enterNumber(screen.getByLabelText('x'), '0,3');
        expect(hint()).toHaveTextContent('Zaokroženo na 0,25.');
    });

    test('ties round away from zero, symmetric for negatives', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-4} max={4} grid={0.25} onChange={onChange}/>);
        enterNumber(screen.getByLabelText('x'), '-0,125');
        expect(onChange).toHaveBeenLastCalledWith(-0.25);
        enterNumber(screen.getByLabelText('x'), '0,125');
        expect(onChange).toHaveBeenLastCalledWith(0.25);
    });
});
