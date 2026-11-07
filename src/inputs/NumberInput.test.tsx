import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {NumberInput, parseDecimal} from './NumberInput';
import {blurNumber, enterNumber} from './testEntry';
import {setLanguage} from '../localization';
import {FunctionReadout} from '../graphs/functions/FunctionReadout';

/** Typing (or pasting) into the field: an input event that carries an inputType,. */
const type = (input: HTMLElement, value: string) => fireEvent.input(input, {target: {value}, inputType: 'insertText'});

test('never commits the rounded display of an untouched value on blur or Enter', () => {
    const onChange = vi.fn();
    render(<NumberInput label="r" value={0.123456} decimals={4} onChange={onChange}/>);
    const input = screen.getByLabelText('r') as HTMLInputElement;
    expect(input.value).toBe('0,1235');
    fireEvent.focus(input);
    fireEvent.keyDown(input, {key: 'Enter'});
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    type(input, '0,2');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(0.2);
});

test('commits only finite in-range numbers, keeps partial typing, and follows the model value', () => {
    const onChange = vi.fn();
    const {rerender} = render(<NumberInput label="k" value={2} min={-10} max={10} onChange={onChange}/>);
    const input = screen.getByLabelText('k') as HTMLInputElement;
    expect(input.value).toBe('2');
    enterNumber(input, '3.5');
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    enterNumber(input, '99');
    enterNumber(input, '');
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(<NumberInput label="k" value={-1.25} min={-10} max={10} onChange={onChange}/>);
    expect(input.value).toBe('−1,25');
    rerender(<NumberInput label="k" value={undefined} disabled min={-10} max={10} onChange={onChange}/>);
    expect(input.value).toBe('');
    expect(input).toBeDisabled();
});

test('arrow keys step by the step prop and clamp to the range; typed values are not restricted to multiples of it', () => {
    const onChange = vi.fn();
    render(<NumberInput label="x" value={1} min={-4} max={4} step={0.01} onChange={onChange}/>);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.type).toBe('text');
    type(input, '1.005');
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('role', 'spinbutton');
    fireEvent.keyDown(input, {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(1.015);
    fireEvent.keyDown(input, {key: 'ArrowDown'});
    fireEvent.keyDown(input, {key: 'ArrowDown'});
    expect(onChange).toHaveBeenLastCalledWith(0.995);
    type(input, '3.999');
    fireEvent.keyDown(input, {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(4);
});

test('a value outside the range or rejected by the model is explained, in the current language, and the hint goes away when a valid value is typed', () => {
    const onChange = vi.fn(() => true);
    render(<NumberInput label="x" value={1} min={-4} max={4} onChange={onChange}/>);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    enterNumber(input, '7');
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med −4 in 4.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
    enterNumber(input, '2');
    expect(screen.queryByRole('status')).toBeNull();
    expect(onChange).toHaveBeenCalledWith(2);
});

test('a draft that is not a number is explained on Enter and on blur, and commits nothing', () => {
    const onChange = vi.fn(() => true);
    render(<NumberInput label="x" value={1} min={-4} max={4} rejectedHint="Taken" onChange={onChange}/>);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    enterNumber(input, '-');
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med −4 in 4.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.value).toBe('-');
    type(input, '2');
    expect(screen.queryByRole('status')).toBeNull();
    blurNumber(input, 'abc');
    expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med −4 in 4.');
    expect(input.value).toBe('1');
    expect(onChange).not.toHaveBeenCalled();
});

test('without limits, a draft that is not a number gets the general hint rather than a model refusal', () => {
    render(<NumberInput label="x" value={1} rejectedHint="Taken" onChange={() => true}/>);
    enterNumber(screen.getByLabelText('x'), 'abc');
    expect(screen.getByRole('status')).toHaveTextContent('Te vrednosti ni mogoče uporabiti.');
});

test('a value the model rejects shows the rejection hint', () => {
    render(<NumberInput label="x" value={1} onChange={() => false}/>);
    enterNumber(screen.getByLabelText('x'), '5');
    expect(screen.getByRole('status')).toHaveTextContent('Te vrednosti ni mogoče uporabiti.');
});

test('a model rejection can carry its own reason instead of the generic hint', () => {
    render(<NumberInput label="x" value={1} rejectedHint="x must stay below y." onChange={() => false}/>);
    const input = screen.getByLabelText('x');
    enterNumber(input, '5');
    expect(screen.getByRole('status')).toHaveTextContent('x must stay below y.');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('status').id);
});

test('the readout shows labelled values and an optional note', () => {
    render(<FunctionReadout title="Odčitki" rows={[{id: 'k', label: 'k', value: '2'}, {id: 'n', label: 'n', value: 'ni določen'}]} note="Opomba"/>);
    expect(screen.getByRole('heading', {name: 'Odčitki'})).toBeInTheDocument();
    expect(screen.getByText('ni določen')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Opomba');
});

test('keeps what is typed until Enter or blur, then applies it once and explains a refusal', () => {
    const onChange = vi.fn((value: number) => value < 5);
    render(<NumberInput label="r" value={1} onChange={onChange}/>);
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
    render(<NumberInput label="s" value={1} step={0.5} onChange={onChange}/>);
    fireEvent.keyDown(screen.getByLabelText('s'), {key: 'ArrowUp'});
    expect(onChange).toHaveBeenLastCalledWith(1.5);
});

test('every change, whatever its input type, only edits the draft until Enter', () => {
    const onChange = vi.fn();
    render(<NumberInput label="r" value={1} onChange={onChange}/>);
    const input = screen.getByLabelText('r') as HTMLInputElement;
    fireEvent.change(input, {target: {value: '2'}});
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(2);
    type(input, '3');
    fireEvent.input(input, {target: {value: '4'}, inputType: 'insertFromPaste'});
    fireEvent.input(input, {target: {value: '5'}, inputType: 'deleteContentBackward'});
    expect(onChange).toHaveBeenCalledTimes(1);
});

test('a small real edit below the display precision commits on blur and on Enter, but an untouched or display-equal draft writes nothing', () => {
    const onChange = vi.fn();
    const {unmount} = render(<NumberInput label="q" value={1} decimals={2} onChange={onChange}/>);
    blurNumber(screen.getByLabelText('q'), '1.0004');
    expect(onChange).toHaveBeenLastCalledWith(1.0004);
    unmount();
    onChange.mockClear();
    render(<NumberInput label="q" value={1} decimals={2} onChange={onChange}/>);
    enterNumber(screen.getByLabelText('q'), '1.0004');
    expect(onChange).toHaveBeenLastCalledWith(1.0004);
    onChange.mockClear();
    const field = screen.getByLabelText('q');
    enterNumber(field, '1');
    blurNumber(field, '1');
    expect(onChange).not.toHaveBeenCalled();
});

test('shows the model value again after Enter when the model snapped the typed value back to the unchanged one', () => {
    const onChange = vi.fn(() => true);
    render(<NumberInput label="r" value={1} onChange={onChange}/>);
    const input = screen.getByLabelText('r') as HTMLInputElement;
    type(input, '1.01');
    expect(input.value).toBe('1.01');
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(onChange).toHaveBeenLastCalledWith(1.01);
    // the prop stayed 1: the typed text must not stay behind
    expect(input.value).toBe('1');
    // a refused value keeps the typed text so that it can be corrected
    const refuse = vi.fn(() => false);
    render(<NumberInput label="q" value={1} onChange={refuse}/>);
    const other = screen.getByLabelText('q') as HTMLInputElement;
    type(other, '7');
    fireEvent.keyDown(other, {key: 'Enter'});
    expect(other.value).toBe('7');
});

describe('decimal entry', () => {
    afterEach(() => setLanguage('sl'));

    test('parseDecimal accepts both decimal conventions, signs and the Unicode minus, and rejects incomplete drafts', () => {
        expect(parseDecimal('1,5')).toBe(1.5);
        expect(parseDecimal('1.5')).toBe(1.5);
        expect(parseDecimal(' -2,25 ')).toBe(-2.25);
        expect(parseDecimal('−0,5')).toBe(-0.5);
        expect(parseDecimal('3')).toBe(3);
        expect(parseDecimal('-')).toBeNaN();
        expect(parseDecimal('')).toBeNaN();
        expect(parseDecimal('1,')).toBeNaN();
        expect(parseDecimal('1.')).toBeNaN();
        expect(parseDecimal('1e5')).toBeNaN();
        expect(parseDecimal('abc')).toBeNaN();
    });

    test('Slovenian entry accepts a decimal comma and displays the value with a decimal comma', () => {
        const onChange = vi.fn();
        render(<NumberInput label="k" value={1} min={-4} max={4} onChange={onChange}/>);
        const input = screen.getByLabelText('k') as HTMLInputElement;
        expect(input.value).toBe('1');
        enterNumber(input, '1,5');
        expect(onChange).toHaveBeenLastCalledWith(1.5);
        enterNumber(input, '1.25');
        expect(onChange).toHaveBeenLastCalledWith(1.25);
    });

    test('English entry accepts a decimal point and displays the value with a decimal point', () => {
        setLanguage('en');
        const onChange = vi.fn();
        const {rerender} = render(<NumberInput label="k" value={1} min={-4} max={4} onChange={onChange}/>);
        const input = screen.getByLabelText('k') as HTMLInputElement;
        enterNumber(input, '-2.5');
        expect(onChange).toHaveBeenLastCalledWith(-2.5);
        rerender(<NumberInput label="k" value={-0.75} min={-4} max={4} onChange={onChange}/>);
        expect(input.value).toBe('−0.75');
    });

    test('while typing, an incomplete draft such as "1," is kept, does not commit, shows no hint, and leaves the graph value unchanged', () => {
        const onChange = vi.fn();
        render(<NumberInput label="k" value={2} onChange={onChange}/>);
        const input = screen.getByLabelText('k') as HTMLInputElement;
        type(input, '1,');
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('1,');
        expect(screen.queryByRole('status')).toBeNull();
    });

    test('the field follows a language change and keeps its value', () => {
        const onChange = vi.fn();
        const {rerender} = render(<NumberInput label="k" value={1.5} onChange={onChange}/>);
        const input = screen.getByLabelText('k') as HTMLInputElement;
        expect(input.value).toBe('1,5');
        setLanguage('en');
        rerender(<NumberInput label="k" value={1.5} onChange={onChange}/>);
        expect(input.value).toBe('1.5');
    });

    test('the field exposes spinbutton bounds and the current value', () => {
        render(<NumberInput label="k" value={2} min={-3} max={7} onChange={() => true}/>);
        const input = screen.getByRole('spinbutton', {name: 'k'});
        expect(input).toHaveAttribute('aria-valuemin', '-3');
        expect(input).toHaveAttribute('aria-valuemax', '7');
        expect(input).toHaveAttribute('aria-valuenow', '2');
    });

    test('integer fields reject a non-integer with the range hint and accept whole numbers', () => {
        const onChange = vi.fn();
        render(<NumberInput label="n" value={3} min={1} max={9} integer decimals={0} onChange={onChange}/>);
        const input = screen.getByLabelText('n');
        enterNumber(input, '2,5');
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Vnesi vrednost med 1 in 9.');
        enterNumber(input, '5');
        expect(onChange).toHaveBeenLastCalledWith(5);
    });
});

describe('one commit rule: typed values commit on Enter or blur only', () => {
    afterEach(() => setLanguage('sl'));

    test('typing never commits per keystroke; Escape drops the draft and shows the model value', () => {
        const onChange = vi.fn();
        render(<NumberInput label="r" value={2} onChange={onChange}/>);
        const input = screen.getByLabelText('r') as HTMLInputElement;
        type(input, '3');
        type(input, '35');
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.keyDown(input, {key: 'Escape'});
        expect(input.value).toBe('2');
        fireEvent.blur(input);
        expect(onChange).not.toHaveBeenCalled();
    });

    test('an unrelated rerender keeps the draft; an authoritative replacement or Reset replaces it, and the model value stays the one the caller holds', () => {
        let model = 2;
        const onChange = vi.fn((value: number) => { model = value; });
        const {rerender} = render(<NumberInput label="r" value={model} onChange={onChange}/>);
        const input = screen.getByLabelText('r') as HTMLInputElement;
        type(input, '7');
        rerender(<NumberInput label="r" value={model} onChange={onChange}/>);
        expect(input.value).toBe('7');
        expect(model).toBe(2);
        // Reset-style replacement while a draft is open: the field shows the replacement and blur does not commit the stale draft
        rerender(<NumberInput label="r" value={5} onChange={onChange}/>);
        expect(input.value).toBe('5');
        fireEvent.blur(input);
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('5');
        expect(model).toBe(2);
    });

    test('a language change with an open draft shows the model value in the new convention and commits nothing', () => {
        const onChange = vi.fn();
        const {rerender} = render(<NumberInput label="r" value={1.5} onChange={onChange}/>);
        const input = screen.getByLabelText('r') as HTMLInputElement;
        type(input, '9');
        setLanguage('en');
        rerender(<NumberInput label="r" value={1.5} onChange={onChange}/>);
        expect(input.value).toBe('1.5');
        fireEvent.blur(input);
        expect(onChange).not.toHaveBeenCalled();
    });

    test('arrows, Shift with an arrow, PageUp and PageDown step at once; the big step defaults to ten steps and a prop sets it', () => {
        const onChange = vi.fn();
        render(<NumberInput label="x" value={1} min={-20} max={20} step={0.5} onChange={onChange}/>);
        const input = screen.getByLabelText('x');
        fireEvent.keyDown(input, {key: 'ArrowUp'});
        expect(onChange).toHaveBeenLastCalledWith(1.5);
        fireEvent.keyDown(input, {key: 'ArrowUp', shiftKey: true});
        expect(onChange).toHaveBeenLastCalledWith(6.5);
        fireEvent.keyDown(input, {key: 'PageDown'});
        expect(onChange).toHaveBeenLastCalledWith(1.5);
        fireEvent.keyDown(input, {key: 'PageUp'});
        expect(onChange).toHaveBeenLastCalledWith(6.5);
        render(<NumberInput label="y" value={0} min={-20} max={3} step={1} bigStep={2} onChange={onChange}/>);
        fireEvent.keyDown(screen.getByLabelText('y'), {key: 'PageUp'});
        expect(onChange).toHaveBeenLastCalledWith(2);
        fireEvent.keyDown(screen.getByLabelText('y'), {key: 'ArrowDown', shiftKey: true});
        expect(onChange).toHaveBeenLastCalledWith(0);
    });
});

test('the decimal keypad is requested only for fields that cannot go negative', () => {
    const noop = () => undefined;
    const {rerender} = render(<NumberInput label="r" value={1} min={0} max={5} onChange={noop}/>);
    const mode = () => (screen.getByLabelText('r') as HTMLInputElement).getAttribute('inputmode');
    expect(mode()).toBe('decimal');
    rerender(<NumberInput label="r" value={1} min={0} max={5} integer onChange={noop}/>);
    expect(mode()).toBe('decimal');
    rerender(<NumberInput label="r" value={1} min={2} onChange={noop}/>);
    expect(mode()).toBe('decimal');
    rerender(<NumberInput label="r" value={1} min={-1} max={5} onChange={noop}/>);
    expect(mode()).toBe('text');
    rerender(<NumberInput label="r" value={1} min={-3} integer onChange={noop}/>);
    expect(mode()).toBe('text');
    rerender(<NumberInput label="r" value={1} max={5} onChange={noop}/>);
    expect(mode()).toBe('text');
    rerender(<NumberInput label="r" value={1} onChange={noop}/>);
    expect(mode()).toBe('text');
});

test('help, describedBy and the error hint all describe the field and the name stays the label', () => {
    render(<div><p id="why">Zakaj</p>
        <NumberInput label="r" value={1} min={0} max={5} help="Polmer kroga" describedBy="why" onChange={() => undefined}/></div>);
    const input = screen.getByRole('spinbutton', {name: 'r'});
    expect(input).toHaveAccessibleDescription('Polmer kroga Zakaj');
    type(input, '9');
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(input.getAttribute('aria-describedby')!.split(' ')).toHaveLength(3);
    expect(input).toHaveAccessibleDescription(/Polmer kroga Zakaj$/);
    expect(screen.getByText('Polmer kroga')).toHaveClass('number-input-help');
});
