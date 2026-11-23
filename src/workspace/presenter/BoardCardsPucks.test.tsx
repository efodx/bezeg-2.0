// The puck strip on a declared graph (task 05 slices 1, 8, 9): one puck per board range/count parameter, in order, no duplicate in Orodja.
import {act, cleanup, fireEvent} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TaylorGraph} from '../../graphs/functions/TaylorGraph';
import DecasteljauGraph from '../../graphs/curves/bezier/DecasteljauGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../graphs/base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {puckRenderCounts} from '../pucks/ParameterPuck';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

beforeAll(() => {
    installBoardShims();
    const box = (w: number, h: number): DOMRect => ({x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({})}) as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        if (this.classList.contains('board-cards-layer')) return box(1000, 700);
        if (this.hasAttribute('data-card-id')) return box(200, 150);
        if (this.hasAttribute('data-card-head')) return box(200, 32);
        if (this.hasAttribute('data-card-row')) return box(200, 24);
        return box(600, 400);
    };
});
beforeEach(() => { setLanguage('sl'); window.localStorage.clear(); });
afterEach(cleanup);

const keys = () => [...document.querySelectorAll('.puck-strip [data-puck-key]')].map(element => element.getAttribute('data-puck-key'));
const renders = (key: string) => puckRenderCounts.get(key) ?? 0;

async function mountTaylor() {
    const graph = new TaylorGraph();
    const mounted = mountGraph(graph);
    await waitUntil(() => document.querySelector('.puck-strip [data-puck-key]') !== null);
    return {...mounted, graph};
}

describe('the puck strip on a declared pilot', () => {
    test('shows one puck per board range or count parameter, in declared order', async () => {
        const {graph} = await mountTaylor();
        const expected = (graph.getDeclaration()?.parameters ?? [])
            .filter(parameter => (parameter.kind === 'range' || parameter.kind === 'count') && parameter.placement === 'board').map(parameter => parameter.key);
        expect(expected.length).toBeGreaterThan(1);
        expect(keys()).toEqual(expected);
    });

    test('a puck write lands in the store in the same tick, as the learner', async () => {
        const {graph} = await mountTaylor();
        const write = vi.spyOn(graph.parameters!, 'write');
        const before = Number(graph.parameters!.read('taylor-degree'));
        const spin = document.querySelector<HTMLElement>('.puck-strip [role="spinbutton"]')!;
        fireEvent.keyDown(spin, {key: 'ArrowUp'});
        expect(write).toHaveBeenCalledWith('taylor-degree', before + 1, 'learner');
        expect(graph.parameters!.read('taylor-degree')).toBe(before + 1);
        expect(spin).toHaveAttribute('aria-valuenow', String(before + 1));
    });

    test('a refused typed value leaves the store unchanged', async () => {
        const {graph} = await mountTaylor();
        const before = graph.parameters!.read('taylor-x');
        const slider = document.querySelector<HTMLElement>('.puck-strip [data-puck-key="taylor-x"] [role="slider"]')!;
        fireEvent.doubleClick(slider);
        const input = document.querySelector<HTMLInputElement>('.puck-strip input')!;
        fireEvent.change(input, {target: {value: '99'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(graph.parameters!.read('taylor-x')).toBe(before);
    });

    test('a write to one key does not render another key\'s puck', async () => {
        const {graph} = await mountTaylor();
        const [degree, x] = [renders('taylor-degree'), renders('taylor-x')];
        act(() => { graph.parameters!.write('taylor-degree', 5, 'learner'); });
        expect(renders('taylor-degree')).toBeGreaterThan(degree);
        expect(renders('taylor-x')).toBe(x);
    });

    test('Orodja has no control for a puck parameter: the control exists once, in the strip', async () => {
        await mountTaylor();
        fireEvent.click(document.querySelector('.board-cards-layer [data-card-id="tools"] button[aria-controls="inspector-edit"]')!);
        await waitUntil(() => document.querySelector('.tools-body') !== null);
        const named = (root: ParentNode) => [...root.querySelectorAll('[role="slider"], [role="spinbutton"]')]
            .map(element => element.getAttribute('aria-label') ?? '').filter(label => label !== '');
        const puckLabels = named(document.querySelector('.puck-strip')!);
        expect(puckLabels.length).toBeGreaterThan(1);
        const toolsLabels = named(document.querySelector('.tools-body')!);
        for (const label of puckLabels) expect(toolsLabels, label).not.toContain(label);
        expect(document.querySelector('.tools-body [data-puck-param]')).toBeNull();
    });

    test('De Casteljau shows Play and Reset with its t puck, and a learner write to t stops the run', async () => {
        const graph = new DecasteljauGraph();
        mountGraph(graph);
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="decasteljau-t"]') !== null);
        const play = () => document.querySelector<HTMLElement>('.puck-strip [data-action="play-pause"]');
        expect(play()).not.toBeNull();
        expect(document.querySelector('.puck-strip [data-action="reset"]')).not.toBeNull();
        await act(async () => { play()!.click(); });
        await waitUntil(() => graph.getDeclaration()?.actions?.find(action => action.id === 'play')?.pressed === true);
        act(() => { graph.parameters!.write('decasteljau-t', 0.5, 'learner'); });
        expect(graph.getDeclaration()?.actions?.find(action => action.id === 'play')?.pressed).toBe(false);
    });
});
