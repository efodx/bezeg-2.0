// A puck wired to a graph's arbiter (task 05 slice 1): its own key only, writes as learner, a domain refusal shown at the puck.
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import {message} from '../../localization';
import {ParameterPuck, puckRenderCounts} from './ParameterPuck';

const range: RangeParameter = {kind: 'range', key: 'a', label: message('shell_card_tools'), placement: 'board', min: 0, max: 10, step: 1};
const count: CountParameter = {kind: 'count', key: 'n', label: message('shell_card_legend'), placement: 'board', min: 1, max: 9};

/** A graph with an arbiter over two keys and a store version; `setValue` writes the values like a scene change. */
function fakeGraph(refuse?: string | ((value: number) => boolean)) {
    const values: Record<string, number> = {a: 3, n: 4};
    const listeners = new Set<() => void>();
    const write = vi.fn((key: string, value: unknown, source: string) => {
        void source;
        const refused = typeof refuse === 'function' ? refuse(Number(value)) : refuse !== undefined;
        if (refused) return {status: 'refused-domain' as const, error: new Error(typeof refuse === 'string' ? refuse : 'refused')};
        values[key] = Number(value);
        listeners.forEach(listener => listener());
        return {status: 'applied' as const};
    });
    const graph = {
        store: {subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }},
        parameters: {keys: () => Object.keys(values), read: (key: string) => values[key], write, hold: () => () => undefined},
    } as unknown as BaseGraph<BaseGraphState>;
    const set = (key: string, value: number) => act(() => { values[key] = value; listeners.forEach(listener => listener()); });
    return {graph, write, set};
}
const renders = (key: string) => puckRenderCounts.get(key) ?? 0;

afterEach(cleanup);

describe('ParameterPuck', () => {
    it('writes a step to the arbiter in the same tick as the learner', () => {
        const {graph, write} = fakeGraph();
        render(<ParameterPuck graph={graph} parameter={range}/>);
        fireEvent.keyDown(screen.getByRole('slider'), {key: 'ArrowUp'});
        expect(write).toHaveBeenCalledWith('a', 4, 'learner');
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
    });

    it('shows a domain refusal at the puck and keeps the value', () => {
        const {graph, write} = fakeGraph('Stopnja je prevelika.');
        render(<ParameterPuck graph={graph} parameter={count}/>);
        fireEvent.keyDown(screen.getByRole('spinbutton'), {key: 'ArrowUp'});
        expect(write).toHaveBeenCalledWith('n', 5, 'learner');
        expect(screen.getByRole('status')).toHaveTextContent('Stopnja je prevelika.');
        expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '4');
    });

    it('a refused write keeps the earlier accepted undo offer: Escape restores the old value', () => {
        vi.useFakeTimers();
        try {
            const {graph, write} = fakeGraph(value => value === 9);
            render(<ParameterPuck graph={graph} parameter={count}/>);
            const type = (text: string) => {
                fireEvent.keyDown(screen.getByRole('spinbutton'), {key: 'Enter'});
                const input = screen.getByRole('textbox');
                fireEvent.change(input, {target: {value: text}});
                fireEvent.keyDown(input, {key: 'Enter'});
            };
            type('7'); // accepted jump 4 -> 7, offers the undo to 4
            type('9'); // refused by the arbiter
            expect(write).toHaveBeenLastCalledWith('n', 9, 'learner');
            fireEvent.keyDown(document.body, {key: 'Escape'});
            expect(write).toHaveBeenLastCalledWith('n', 4, 'learner');
        } finally { vi.useRealTimers(); }
    });

    it('a typed value out of range is refused by the puck and never written', () => {
        const {graph, write} = fakeGraph();
        render(<ParameterPuck graph={graph} parameter={range}/>);
        fireEvent.doubleClick(screen.getByRole('slider'));
        const input = screen.getByRole('textbox');
        fireEvent.change(input, {target: {value: '99'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(write).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Vrednost mora biti med 0 in 10.');
    });

    it('a typed value on the grid shows no notice; an off-grid one is snapped, written as learner and says so', () => {
        const quarter: RangeParameter = {...range, min: 0, max: 4, step: 0.25, maxDecimals: 2};
        const {graph, write} = fakeGraph();
        render(<ParameterPuck graph={graph} parameter={quarter}/>);
        fireEvent.doubleClick(screen.getByRole('slider'));
        fireEvent.change(screen.getByRole('textbox'), {target: {value: '1,5'}});
        fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Enter'});
        expect(write).toHaveBeenLastCalledWith('a', 1.5, 'learner');
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        fireEvent.doubleClick(screen.getByRole('slider'));
        fireEvent.change(screen.getByRole('textbox'), {target: {value: '1,3'}});
        fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Enter'});
        expect(write).toHaveBeenLastCalledWith('a', 1.25, 'learner');
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '1.25');
        expect(screen.getByRole('status')).toHaveTextContent('Zaokroženo na 1,25.');
    });

    it('the big step is the declared bigStep in value units', () => {
        const {graph, write} = fakeGraph();
        render(<ParameterPuck graph={graph} parameter={{...range, bigStep: 6}}/>);
        fireEvent.keyDown(screen.getByRole('slider'), {key: 'PageUp'});
        expect(write).toHaveBeenLastCalledWith('a', 9, 'learner');
    });

    it('a change of one key does not render another key\'s puck', () => {
        const {graph, set} = fakeGraph();
        render(<><ParameterPuck graph={graph} parameter={range}/><ParameterPuck graph={graph} parameter={count}/></>);
        const [a0, n0] = [renders('a'), renders('n')];
        set('a', 7);
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
        expect(renders('a')).toBeGreaterThan(a0);
        expect(renders('n')).toBe(n0);
    });

    it('renders nothing for a key the arbiter does not bind', () => {
        const {graph} = fakeGraph();
        render(<ParameterPuck graph={graph} parameter={{...range, key: 'missing'}}/>);
        expect(document.querySelector('[data-puck-key]')).toBeNull();
    });
});
