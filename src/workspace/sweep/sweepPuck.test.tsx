// The sweep button on a puck over a real arbiter: it starts and shows the sweep, and the learner's input ends it.
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {message} from '../../localization';
import {ParameterPuck} from '../pucks/ParameterPuck';

const range: RangeParameter = {kind: 'range', key: 'a', label: message('shell_card_tools'), placement: 'board', min: 0, max: 10, step: 0.5};
const count: CountParameter = {kind: 'count', key: 'n', label: message('shell_card_legend'), placement: 'board', min: 1, max: 20};

let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
let next = 1;
/** Runs the pending animation frames at `time` ms. */
const frame = (time: number) => { const run = queue; queue = []; act(() => { for (const entry of run) entry.callback(time); }); };

function setup() {
    const values: Record<string, number> = {a: 5, n: 10};
    const listeners = new Set<() => void>();
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true});
    const notify = () => listeners.forEach(listener => listener());
    for (const key of Object.keys(values)) arbiter.bind(key, {read: () => values[key], apply: (value: number) => { values[key] = value; notify(); }});
    const graph = {
        store: {subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }},
        parameters: arbiter,
    } as unknown as BaseGraph<BaseGraphState>;
    render(<><ParameterPuck graph={graph} parameter={range}/><ParameterPuck graph={graph} parameter={count}/></>);
    return {values, arbiter};
}

function reduceMotion(reduced: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({matches: reduced && query.includes('reduced-motion'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined}));
}

beforeEach(() => {
    queue = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = next++; queue.push({id, callback}); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queue = queue.filter(entry => entry.id !== id); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const rangeButton = () => screen.getAllByRole('button', {name: /Samodejno premikanje/})[0];
const countButton = () => screen.getAllByRole('button', {name: /Samodejno premikanje/})[1];

describe('the sweep button', () => {
    it('starts a sweep, shows it pressed, and the value and puck follow the clock', () => {
        const {values} = setup();
        expect(rangeButton()).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(rangeButton());
        expect(rangeButton()).toHaveAttribute('aria-pressed', 'true');
        frame(0);
        frame(1000);
        expect(values.a).toBe(7.5);
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '7.5');
        fireEvent.click(rangeButton());
        expect(rangeButton()).toHaveAttribute('aria-pressed', 'false');
        expect(queue).toHaveLength(0);
    });

    it('a range and a count sweep together', () => {
        const {values} = setup();
        fireEvent.click(rangeButton());
        fireEvent.click(countButton());
        frame(0);
        frame(1200);
        expect(values.a).toBe(7.5);
        expect(values.n).toBe(12);
        expect(rangeButton()).toHaveAttribute('aria-pressed', 'true');
        expect(countButton()).toHaveAttribute('aria-pressed', 'true');
    });

    it('grabbing the puck stops the sweep and the value stays where the learner puts it', () => {
        const {values} = setup();
        fireEvent.click(rangeButton());
        frame(0);
        frame(1000);
        const body = screen.getByRole('slider');
        fireEvent.pointerDown(body, {pointerId: 1, button: 0, clientX: 50, clientY: 10});
        expect(rangeButton()).toHaveAttribute('aria-pressed', 'false'); // the hold alone ends it
        fireEvent.pointerMove(body, {pointerId: 1, clientX: 80, clientY: 10});
        const grabbed = values.a;
        frame(2000);
        expect(values.a).toBe(grabbed);
        fireEvent.pointerUp(body, {pointerId: 1, clientX: 80, clientY: 10});
        frame(3000);
        expect(values.a).toBe(grabbed);
    });

    it('a typed value wins: opening the entry stops the sweep and the typed number stays', () => {
        const {values} = setup();
        fireEvent.click(rangeButton());
        frame(0);
        frame(1000);
        fireEvent.doubleClick(screen.getByRole('slider'));
        expect(rangeButton()).toHaveAttribute('aria-pressed', 'false');
        const input = screen.getByRole('textbox');
        fireEvent.change(input, {target: {value: '2'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        frame(2000);
        expect(values.a).toBe(2);
    });

    it('a count step wins and keeps the stepped value', () => {
        const {values} = setup();
        fireEvent.click(countButton());
        frame(0);
        frame(700);
        expect(values.n).toBe(11);
        fireEvent.click(screen.getByRole('button', {name: /Povečaj/}));
        expect(values.n).toBe(12);
        expect(countButton()).toHaveAttribute('aria-pressed', 'false');
        frame(1500);
        expect(values.n).toBe(12);
    });

    it('Esc and a lesson frame change stop every sweep and the pucks show it', () => {
        for (const reason of ['learner', 'frame'] as const) {
            const {arbiter} = setup();
            fireEvent.click(rangeButton());
            fireEvent.click(countButton());
            frame(0);
            act(() => arbiter.endAllLeases(reason));
            expect(rangeButton()).toHaveAttribute('aria-pressed', 'false');
            expect(countButton()).toHaveAttribute('aria-pressed', 'false');
            cleanup();
        }
    });

    it('a lost pointer capture or a blur without pointerup releases the hold, so a lesson write applies again', () => {
        for (const end of ['lostpointercapture', 'blur'] as const) {
            const {arbiter} = setup();
            const body = screen.getAllByRole('slider')[0];
            fireEvent.pointerDown(body, {pointerId: 1, button: 0, clientX: 50, clientY: 10});
            expect(arbiter.isHeld('a')).toBe(true);
            if (end === 'blur') fireEvent.blur(body); else fireEvent(body, new Event('lostpointercapture', {bubbles: true}));
            expect(arbiter.isHeld('a')).toBe(false);
            expect(arbiter.write('a', 2, 'lesson').status).toBe('applied');
            cleanup();
        }
    });

    it('shows a stop glyph while running and the sweep glyph otherwise, not colour alone', () => {
        setup();
        const glyph = () => rangeButton().querySelector('[data-glyph]')?.getAttribute('data-glyph');
        expect(glyph()).toBe('sweep');
        fireEvent.click(rangeButton());
        expect(glyph()).toBe('stop');
        fireEvent.click(rangeButton());
        expect(glyph()).toBe('sweep');
    });

    it('is not offered under reduced motion', () => {
        reduceMotion(true);
        setup();
        expect(screen.queryByRole('button', {name: /Samodejno premikanje/})).toBeNull();
    });

    it('is offered when reduced motion is not asked for', () => {
        reduceMotion(false);
        setup();
        expect(screen.getAllByRole('button', {name: /Samodejno premikanje/})).toHaveLength(2);
    });
});
