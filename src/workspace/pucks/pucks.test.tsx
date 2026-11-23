import {useState} from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {message} from '../../localization';
import {CountPuck} from './CountPuck';
import {RangePuck} from './RangePuck';

const range = (extra: Partial<RangeParameter> = {}): RangeParameter => ({
    kind: 'range', key: 'a', label: message('shell_card_tools'), placement: 'board', min: -2, max: 2, step: 0.25, ...extra,
});
const count = (extra: Partial<CountParameter> = {}): CountParameter => ({
    kind: 'count', key: 'n', label: message('shell_card_legend'), placement: 'board', min: 1, max: 12, ...extra,
});

/** A caller that holds the value: a puck's value is its prop, so a sequence of writes needs one. */
function RangeH(props: Omit<React.ComponentProps<typeof RangePuck>, 'value'> & {initial: number}) {
    const [value, setValue] = useState(props.initial);
    return <RangePuck {...props} value={value} onWrite={next => { setValue(next); props.onWrite(next); }}/>;
}
function CountH(props: Omit<React.ComponentProps<typeof CountPuck>, 'value'> & {initial: number}) {
    const [value, setValue] = useState(props.initial);
    return <CountPuck {...props} value={value} onWrite={next => { setValue(next); props.onWrite(next); }}/>;
}

function pointer(target: Element, type: string, init: MouseEventInit = {}) {
    act(() => { target.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, ...init})); });
}
function pointerWith(target: Element, type: string, init: MouseEventInit, pointerType: string) {
    const event = new MouseEvent(type, {bubbles: true, cancelable: true, ...init});
    Object.defineProperty(event, 'pointerType', {value: pointerType});
    act(() => { target.dispatchEvent(event); });
}

const slider = () => screen.getByRole('slider', {name: 'Orodja'});

afterEach(cleanup);

describe('range puck', () => {
    it('is a slider named by the declared label with its range and a localized value text', () => {
        render(<RangePuck parameter={range()} value={0.5} onWrite={() => undefined}/>);
        const el = slider();
        expect(el).toHaveAttribute('aria-valuemin', '-2');
        expect(el).toHaveAttribute('aria-valuemax', '2');
        expect(el).toHaveAttribute('aria-valuenow', '0.5');
        expect(el).toHaveAttribute('aria-valuetext', '0,5');
    });

    it('steps with arrows, ten steps with PageUp/PageDown, to the ends with Home/End, in the same tick as learner writes', () => {
        const onWrite = vi.fn();
        render(<RangeH parameter={range()} initial={0} onWrite={onWrite}/>);
        fireEvent.keyDown(slider(), {key: 'ArrowRight'});
        expect(onWrite).toHaveBeenLastCalledWith(0.25);
        fireEvent.keyDown(slider(), {key: 'ArrowDown'});
        expect(onWrite).toHaveBeenLastCalledWith(0);
        fireEvent.keyDown(slider(), {key: 'PageUp'});
        expect(onWrite).toHaveBeenLastCalledWith(2);
        fireEvent.keyDown(slider(), {key: 'PageDown'});
        expect(onWrite).toHaveBeenLastCalledWith(-0.5);
        fireEvent.keyDown(slider(), {key: 'Home'});
        expect(onWrite).toHaveBeenLastCalledWith(-2);
        fireEvent.keyDown(slider(), {key: 'End'});
        expect(onWrite).toHaveBeenLastCalledWith(2);
    });

    it('steps with the wheel', () => {
        const onWrite = vi.fn();
        render(<RangeH parameter={range()} initial={0} onWrite={onWrite}/>);
        fireEvent.wheel(slider(), {deltaY: -100});
        expect(onWrite).toHaveBeenLastCalledWith(0.25);
        fireEvent.wheel(slider(), {deltaY: 100});
        expect(onWrite).toHaveBeenLastCalledWith(0);
    });

    it('drags sideways, finer the further the pointer is vertically, with the ruler kept inside the bounds', () => {
        const onWrite = vi.fn();
        render(<RangeH parameter={range()} initial={0} onWrite={onWrite} bounds={() => ({left: 100, right: 300, width: 200})}/>);
        const el = slider();
        // Ruler width is the bounds' width less 16 = 184 px for the span of 4.
        pointer(el, 'pointerdown', {clientX: 0, clientY: 0});
        pointer(el, 'pointermove', {clientX: 46, clientY: 0});
        expect(onWrite).toHaveBeenLastCalledWith(1);
        const ruler = document.querySelector<HTMLElement>('[data-puck-ruler]')!;
        expect(ruler).not.toBeNull();
        expect(parseFloat(ruler.style.left)).toBeGreaterThanOrEqual(108);
        expect(parseFloat(ruler.style.left) + parseFloat(ruler.style.width)).toBeLessThanOrEqual(292);
        // 46 px further, a hundred pixels away from the puck: a quarter of the step.
        pointer(el, 'pointermove', {clientX: 92, clientY: 100});
        expect(onWrite).toHaveBeenLastCalledWith(1.25);
        pointer(el, 'pointerup', {clientX: 92, clientY: 100});
        expect(document.querySelector('[data-puck-ruler]')).toBeNull();
    });

    it('reads the board rectangle once per drag, not once per pointer move (a read after each redraw forces a layout)', () => {
        const bounds = vi.fn(() => ({left: 100, right: 300, width: 200}));
        render(<RangeH parameter={range()} initial={0} onWrite={vi.fn()} bounds={bounds}/>);
        const el = slider();
        pointer(el, 'pointerdown', {clientX: 0, clientY: 0});
        for (let x = 10; x <= 50; x += 10) pointer(el, 'pointermove', {clientX: x, clientY: 0});
        pointer(el, 'pointerup', {clientX: 50, clientY: 0});
        expect(bounds).toHaveBeenCalledTimes(1);
    });

    it('keeps the typed entry exactly as wide as the value, so opening it does not shift the pucks after it', () => {
        render(<RangeH parameter={range()} initial={0} onWrite={vi.fn()}/>);
        const valueWidth = document.querySelector<HTMLElement>('.puck-value')!.style.width;
        fireEvent.doubleClick(slider());
        expect(screen.getByRole('textbox', {name: /Vnesi vrednost/}).style.width).toBe(valueWidth);
    });

    it('opens typed entry on double-click, Enter or a digit, and refuses an out-of-range value with a reason', () => {
        const onWrite = vi.fn();
        render(<RangeH parameter={range()} initial={0} onWrite={onWrite}/>);
        fireEvent.doubleClick(slider());
        const input = screen.getByRole('textbox', {name: /Vnesi vrednost/});
        fireEvent.change(input, {target: {value: '3'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onWrite).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Vrednost mora biti med −2 in 2.');
        fireEvent.change(input, {target: {value: 'x'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onWrite).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Vnesi število');
        fireEvent.change(input, {target: {value: '1,5'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onWrite).toHaveBeenCalledExactlyOnceWith(1.5);
        expect(screen.queryByRole('textbox')).toBeNull();

        fireEvent.keyDown(slider(), {key: 'Enter'});
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Escape'});
        fireEvent.keyDown(slider(), {key: '1'});
        expect(screen.getByRole('textbox')).toHaveValue('1');
    });

    it('keeps the value box width the same for every value in the range', () => {
        const {rerender} = render(<RangePuck parameter={range({min: 0, max: 10, step: 0.25})} value={0} onWrite={() => undefined}/>);
        const width = () => document.querySelector<HTMLElement>('.puck-value')!.style.width;
        const first = width();
        for (const v of [9.75, 10, 5.5]) {
            rerender(<RangePuck parameter={range({min: 0, max: 10, step: 0.25})} value={v} onWrite={() => undefined}/>);
            expect(width()).toBe(first);
        }
    });

    describe('track jump undo', () => {
        beforeEach(() => { vi.useFakeTimers(); });
        afterEach(() => { vi.useRealTimers(); });

        const jump = () => {
            const onWrite = vi.fn();
            render(<RangeH parameter={range()} initial={0} onWrite={onWrite}/>);
            const track = document.querySelector<HTMLElement>('.puck-track')!;
            track.getBoundingClientRect = () => ({left: 0, width: 100, right: 100, top: 0, bottom: 8, height: 8, x: 0, y: 0, toJSON: () => ({})});
            pointer(track, 'pointerdown', {clientX: 100, clientY: 0});
            pointer(track, 'pointerup', {clientX: 100, clientY: 0});
            return onWrite;
        };

        it('a click on the track jumps and offers the pill; clicking it restores the old value', () => {
            const onWrite = jump();
            expect(onWrite).toHaveBeenLastCalledWith(2);
            act(() => { screen.getByRole('button', {name: /Razveljavi/}).click(); });
            expect(onWrite).toHaveBeenLastCalledWith(0);
            expect(screen.queryByRole('button', {name: /Razveljavi/})).toBeNull();
        });

        it('Esc restores the old value too', () => {
            const onWrite = jump();
            fireEvent.keyDown(document.body, {key: 'Escape'});
            expect(onWrite).toHaveBeenLastCalledWith(0);
        });

        it('the pill leaves after 4 s', () => {
            jump();
            expect(screen.getByRole('button', {name: /Razveljavi/})).toBeInTheDocument();
            act(() => { vi.advanceTimersByTime(3999); });
            expect(screen.getByRole('button', {name: /Razveljavi/})).toBeInTheDocument();
            act(() => { vi.advanceTimersByTime(4000); });
            expect(screen.queryByRole('button', {name: /Razveljavi/})).toBeNull();
        });

        it('a typed value more than one step away offers it; one step away does not', () => {
            const onWrite = vi.fn();
            const {rerender} = render(<RangeH parameter={range()} initial={0} onWrite={onWrite}/>);
            fireEvent.doubleClick(slider());
            fireEvent.change(screen.getByRole('textbox'), {target: {value: '0,25'}});
            fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Enter'});
            expect(screen.queryByRole('button', {name: /Razveljavi/})).toBeNull();
            rerender(<RangePuck parameter={range()} value={0.25} onWrite={onWrite}/>);
            fireEvent.doubleClick(slider());
            fireEvent.change(screen.getByRole('textbox'), {target: {value: '2'}});
            fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Enter'});
            expect(screen.getByRole('button', {name: /Razveljavi/})).toBeInTheDocument();
        });

        it('a step key ends the offer', () => {
            jump();
            fireEvent.keyDown(slider(), {key: 'ArrowLeft'});
            expect(screen.queryByRole('button', {name: /Razveljavi/})).toBeNull();
        });
    });

    it('shows the setter refusal at the puck', () => {
        render(<RangePuck parameter={range()} value={0} onWrite={() => undefined} refusal="Preveč blizu."/>);
        expect(screen.getByRole('status')).toHaveTextContent('Preveč blizu.');
    });

    it('a locked parameter is disabled, ignores input and shows its reason', () => {
        const onWrite = vi.fn();
        render(<RangeH parameter={range({locked: true})} initial={0} onWrite={onWrite} lockReason={message('workspace_notes_less')}/>);
        expect(slider()).toHaveAttribute('aria-disabled', 'true');
        fireEvent.keyDown(slider(), {key: 'ArrowRight'});
        fireEvent.keyDown(slider(), {key: 'Enter'});
        fireEvent.wheel(slider(), {deltaY: -100});
        pointer(slider(), 'pointerdown', {clientX: 0, clientY: 0});
        pointer(slider(), 'pointermove', {clientX: 90, clientY: 0});
        expect(onWrite).not.toHaveBeenCalled();
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(document.querySelector('[data-puck-lock]')).toHaveTextContent('Skrij opombe');
        expect(slider().getAttribute('aria-describedby')).toBe(document.querySelector('[data-puck-lock]')!.id);
    });

    describe('help', () => {
        const withHelp = () => render(<RangePuck parameter={range({help: message('shell_more')})} value={0} onWrite={() => undefined}/>);

        it('opens a card from the "?" and closes it with Esc', () => {
            withHelp();
            const button = screen.getByRole('button', {name: /Pomoč/});
            fireEvent.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'true');
            expect(screen.getByRole('group', {name: 'Orodja'})).toHaveTextContent('Več vsebine');
            fireEvent.keyDown(button, {key: 'Escape'});
            expect(screen.queryByRole('group', {name: 'Orodja'})).toBeNull();
        });

        it('shows a tooltip for a mouse hover and for keyboard focus but never for touch', () => {
            withHelp();
            pointerWith(slider(), 'pointerover', {}, 'touch');
            expect(screen.queryByRole('tooltip')).toBeNull();
            pointerWith(slider(), 'pointerover', {}, 'mouse');
            expect(screen.getByRole('tooltip')).toHaveTextContent('Več vsebine');
            pointerWith(slider(), 'pointerout', {}, 'mouse');
            expect(screen.queryByRole('tooltip')).toBeNull();
            const matches = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) { return selector === ':focus-visible'; });
            fireEvent.focus(slider());
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
            matches.mockRestore();
            fireEvent.blur(slider());
            expect(screen.queryByRole('tooltip')).toBeNull();
        });
    });
});

describe('count puck', () => {
    const spin = () => screen.getByRole('spinbutton', {name: 'Legenda'});

    it('is a spinbutton named by the declared label with minus and plus buttons', () => {
        const onWrite = vi.fn();
        render(<CountH parameter={count()} initial={3} onWrite={onWrite}/>);
        expect(spin()).toHaveAttribute('aria-valuenow', '3');
        expect(spin()).toHaveAttribute('aria-valuemin', '1');
        expect(spin()).toHaveAttribute('aria-valuemax', '12');
        fireEvent.click(screen.getByRole('button', {name: /Povečaj/}));
        expect(onWrite).toHaveBeenLastCalledWith(4);
        fireEvent.click(screen.getByRole('button', {name: /Zmanjšaj/}));
        expect(onWrite).toHaveBeenLastCalledWith(3);
    });

    it('does not step past its bounds', () => {
        const onWrite = vi.fn();
        render(<CountH parameter={count()} initial={1} onWrite={onWrite}/>);
        fireEvent.click(screen.getByRole('button', {name: /Zmanjšaj/}));
        fireEvent.keyDown(spin(), {key: 'ArrowDown'});
        expect(onWrite).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: /Zmanjšaj/})).toHaveAttribute('aria-disabled', 'true');
    });

    it('steps with arrows and Home/End', () => {
        const onWrite = vi.fn();
        render(<CountH parameter={count()} initial={5} onWrite={onWrite}/>);
        fireEvent.keyDown(spin(), {key: 'ArrowUp'});
        expect(onWrite).toHaveBeenLastCalledWith(6);
        fireEvent.keyDown(spin(), {key: 'End'});
        expect(onWrite).toHaveBeenLastCalledWith(12);
        fireEvent.keyDown(spin(), {key: 'Home'});
        expect(onWrite).toHaveBeenLastCalledWith(1);
    });

    it('refuses a typed value that is out of range or not whole, and accepts a good one with the undo offer', () => {
        const onWrite = vi.fn();
        render(<CountH parameter={count()} initial={3} onWrite={onWrite}/>);
        fireEvent.keyDown(spin(), {key: 'Enter'});
        const input = screen.getByRole('textbox');
        fireEvent.change(input, {target: {value: '13'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        fireEvent.change(input, {target: {value: '2,5'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onWrite).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Vnesi celo število med 1 in 12.');
        fireEvent.change(input, {target: {value: '9'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(onWrite).toHaveBeenCalledExactlyOnceWith(9);
        fireEvent.keyDown(document.body, {key: 'Escape'});
        expect(onWrite).toHaveBeenLastCalledWith(3);
    });

    it('locks with a reason and keeps a constant value width', () => {
        const onWrite = vi.fn();
        const {rerender} = render(<CountPuck parameter={count({locked: true})} value={3} onWrite={onWrite}/>);
        fireEvent.click(screen.getByRole('button', {name: /Povečaj/}));
        fireEvent.keyDown(spin(), {key: 'ArrowUp'});
        expect(onWrite).not.toHaveBeenCalled();
        expect(document.querySelector('[data-puck-lock]')).toHaveTextContent('Zaklenjeno');
        const width = () => document.querySelector<HTMLElement>('.puck-value')!.style.width;
        const first = width();
        rerender(<CountPuck parameter={count({locked: true})} value={12} onWrite={onWrite}/>);
        expect(width()).toBe(first);
    });

    it('shows the setter refusal at the puck', () => {
        render(<CountPuck parameter={count()} value={3} onWrite={() => undefined} refusal={message('puck_locked')}/>);
        expect(screen.getByRole('status')).toHaveTextContent('Zaklenjeno v tem koraku');
    });
});
