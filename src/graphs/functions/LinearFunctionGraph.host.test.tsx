import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {LinearFunctionGraph} from './LinearFunctionGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

class ObservedLinearGraph extends LinearFunctionGraph {
    modelNow() { return this.model; }
}

const field = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const typeIn = (label: RegExp, value: number) => act(() => {
    fireEvent.change(field(label), {target: {value: String(value)}});
    fireEvent.keyDown(field(label), {key: 'Enter'});
});

function mount() {
    const graph = new ObservedLinearGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

test('wiring: slope and intercept are board pucks, so Orodja has no k field, and a written slope reaches the model', () => {
    const graph = mount();
    const before = graph.modelNow();
    expect(screen.queryByLabelText(/^Naklon k$/, {selector: 'input:not([type="range"])'})).toBeNull();
    act(() => { graph.parameters!.write('k', before.y2 - before.y1 === 0 ? 1 : 3, 'learner'); });
    const after = graph.modelNow();
    expect(after.x1).toBe(before.x1);
    expect(after.y2).not.toBe(before.y2);
});

test('k and n are unavailable with the vertical-line reason, and a typed value is not applied', () => {
    const graph = mount();
    typeIn(/^P2, x$/, graph.modelNow().x1);
    const model = graph.modelNow();
    expect(model.x2).toBe(model.x1);
    for (const label of [/^Naklon k$/, /^Začetna vrednost n$/]) {
        expect(field(label)).toHaveAttribute('aria-disabled', 'true');
        expect(field(label).getAttribute('aria-describedby')).toBeTruthy();
    }
    typeIn(/^Naklon k$/, 5);
    expect(graph.modelNow()).toEqual(model);
});

test('the vertical-line reason appears once, under the k and n fields, which both point to it', () => {
    const graph = mount();
    typeIn(/^P2, x$/, graph.modelNow().x1);
    const reasons = screen.getAllByText(/Navpična premica ni graf funkcije/);
    expect(reasons).toHaveLength(1);
    expect(reasons[0].id).not.toBe('');
    for (const label of [/^Naklon k$/, /^Začetna vrednost n$/]) {
        expect(field(label).getAttribute('aria-describedby')).toContain(reasons[0].id);
        expect(field(label)).not.toHaveAttribute('title');
    }
});
