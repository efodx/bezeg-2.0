import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
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
    expect(screen.getByRole('status')).toHaveTextContent('Ni robov za izbiro.');
    expect(select).toHaveValue('');
});

test('without a reason the select is enabled and reports changes', () => {
    const onChange = vi.fn();
    render(<ChoiceSelect label="Rob" value="" onChange={onChange} options={[{value: '', text: 'Noben'}, {value: 'a', text: 'A'}]}/>);
    const select = screen.getByRole('combobox', {name: 'Rob'});
    expect(select).not.toHaveAttribute('aria-disabled');
    fireEvent.change(select, {target: {value: 'a'}});
    expect(onChange).toHaveBeenCalledWith('a');
});

describe('a selected text wider than the closed select', () => {
    const options = [{value: 'a', text: 'Short'}, {value: 'b', text: 'A much longer option text'}];
    let width = 100;
    beforeEach(() => {
        // JSDOM has no layout or canvas: 1 px per character, and a closed select 100 px wide minus the arrow room.
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({font: '', measureText: (text: string) => ({width: text.length * 5})})) as never);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
    });
    afterEach(() => vi.restoreAllMocks());

    test('is shown in full under the select, follows the value, and is hidden when it fits', () => {
        width = 100; // room 76: "Short" (25) fits, the long text (125) does not
        const {container, rerender} = render(<ChoiceSelect label="L" value="a" onChange={() => undefined} options={options}/>);
        expect(container.querySelector('[data-choice-full]')).toBeNull();
        rerender(<ChoiceSelect label="L" value="b" onChange={() => undefined} options={options}/>);
        const line = container.querySelector('[data-choice-full]');
        expect(line).toHaveTextContent('A much longer option text');
        expect(line).toHaveAttribute('aria-hidden', 'true');
        expect(line).toHaveClass('inspector-help');
        rerender(<ChoiceSelect label="L" value="b" onChange={() => undefined} options={[options[0], {value: 'b', text: 'Another long text here too'}]}/>);
        expect(container.querySelector('[data-choice-full]')).toHaveTextContent('Another long text here too');
        rerender(<ChoiceSelect label="L" value="a" onChange={() => undefined} options={options}/>);
        expect(container.querySelector('[data-choice-full]')).toBeNull();
    });

    describe('with a ResizeObserver', () => {
        let callbacks: (() => void)[];
        let disconnect: () => void;
        let measured: number;
        beforeEach(() => {
            callbacks = [];
            disconnect = vi.fn<() => void>();
            measured = 0;
            // The canvas context is shared module-wide, so a measurement is counted where it reads the select's width.
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => { measured++; return width; });
            vi.stubGlobal('ResizeObserver', class {
                constructor(callback: () => void) { callbacks.push(callback); }
                observe() { /* the test fires the callback itself */ }
                disconnect() { disconnect(); }
            });
        });
        afterEach(() => vi.unstubAllGlobals());

        test('the full text appears when the select shrinks below the text and disappears when it grows back', () => {
            width = 400; // room 376: the long text (125) fits
            const {container} = render(<ChoiceSelect label="L" value="b" onChange={() => undefined} options={options}/>);
            expect(container.querySelector('[data-choice-full]')).toBeNull();
            width = 100;
            act(() => callbacks.forEach(callback => callback()));
            expect(container.querySelector('[data-choice-full]')).toHaveTextContent('A much longer option text');
            width = 400;
            act(() => callbacks.forEach(callback => callback()));
            expect(container.querySelector('[data-choice-full]')).toBeNull();
        });

        test('a re-render that changes neither value, options nor size does not measure again', () => {
            width = 100;
            const {rerender} = render(<ChoiceSelect label="L" value="b" onChange={() => undefined} options={options}/>);
            const before = measured;
            expect(before).toBeGreaterThan(0);
            rerender(<ChoiceSelect label="L" value="b" onChange={() => undefined} options={[...options]} help="Pomoč"/>);
            expect(measured).toBe(before);
        });

        test('the observer is disconnected on unmount, and not before', () => {
            const {unmount} = render(<ChoiceSelect label="L" value="a" onChange={() => undefined} options={options}/>);
            expect(disconnect).not.toHaveBeenCalled();
            unmount();
            expect(disconnect).toHaveBeenCalledTimes(1);
        });
    });
});
