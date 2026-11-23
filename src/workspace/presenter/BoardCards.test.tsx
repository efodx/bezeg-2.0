import {act, cleanup, fireEvent} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TaylorGraph, type TaylorIds} from '../../graphs/functions/TaylorGraph';
import {RootFindingGraph} from '../../graphs/functions/RootFindingGraph';
import {CrossRatioGraph} from '../../graphs/projective/CrossRatioGraph';
import {NotablePointsGraph} from '../../graphs/compgeo/NotablePointsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../graphs/base/realGraphTestHarness';
import type {GraphDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {setLanguage} from '../../localization';
import {appStorage} from '../../storage/appStorage';
import {readoutValueText} from '../cards/ReadoutsBody';
import {readFileSync} from 'node:fs';
const cardCss = readFileSync('src/workspace/cards/CardShell.css', 'utf8');
import {BOARD_LAYOUT_KEY, loadBoardLayout} from '../layout/storedLayout';

// The measure pass waits for MathJax; jsdom has none.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
/** Natural card widths by id for the jsdom layout stand-in; absent means 200. */
let naturalWidths: Record<string, number> = {};
beforeAll(() => {
    installBoardShims();
    // jsdom lays nothing out: a board of 1000 x 700 and cards of 200 x 150 with 32 px heads and 24 px rows.
    const box = (w: number, h: number, top = 0): DOMRect => ({x: 0, y: top, left: 0, top, right: w, bottom: top + h, width: w, height: h, toJSON: () => ({})}) as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        if (this.classList.contains('board-cards-layer')) return box(1000, 700);
        if (this.hasAttribute('data-card-id')) {
            // A shown card has its width; a card in the measure layer fills its wrapper, whose width is set once assigned.
            const assigned = parseFloat(this.style.width || this.parentElement?.style.width || '');
            return box(Number.isFinite(assigned) ? assigned : naturalWidths[this.dataset.cardId ?? ''] ?? 200, 150);
        }
        if (this.hasAttribute('data-card-head')) return box(200, 32);
        if (this.hasAttribute('data-card-row')) {
            const rows = [...(this.closest('[data-card-id]')?.querySelectorAll('[data-card-row]') ?? [])];
            return box(200, 24, 32 + 24 * rows.indexOf(this));
        }
        return box(600, 400);
    };
});
beforeEach(() => { setLanguage('sl'); window.localStorage.clear(); naturalWidths = {}; });
afterEach(cleanup);

const live = (selector: string) => document.querySelector<HTMLElement>(`.board-cards-layer ${selector}`);
const shown = (id: string) => live(`[data-card-id="${id}"]`);
const declarationOf = (graph: TaylorGraph) => graph.getDeclaration() as GraphDeclaration<TaylorIds>;

async function mountTaylor() {
    const graph = new TaylorGraph();
    const mounted = mountGraph(graph);
    await waitUntil(() => shown('readouts') !== null);
    return {...mounted, graph};
}

describe('the card presenter on a declared graph', () => {
    test('renders Odčitki with the values of the declaration', async () => {
        const {graph} = await mountTaylor();
        const rows = (declarationOf(graph).readouts ?? []).flatMap(group => [...group.rows]).filter(row => !row.unit && !row.valueTex);
        expect(rows.length).toBeGreaterThan(1);
        for (const row of rows) expect(live(`[data-card-readout="${row.id}"] dd`)?.textContent, row.id).toBe(readoutValueText(row.value));
    });

    test('a parameter write updates the shown value', async () => {
        const {graph} = await mountTaylor();
        const rows = () => (declarationOf(graph).readouts ?? []).flatMap(group => [...group.rows]).filter(row => !row.unit && !row.valueTex);
        const before = Object.fromEntries(rows().map(row => [row.id, live(`[data-card-readout="${row.id}"] dd`)?.textContent]));
        act(() => { graph.parameters!.write('taylor-degree', 4, 'lesson'); });
        const after = Object.fromEntries(rows().map(row => [row.id, live(`[data-card-readout="${row.id}"] dd`)?.textContent]));
        for (const row of rows()) expect(after[row.id], row.id).toBe(readoutValueText(row.value));
        expect(after).not.toEqual(before);
    });

    test('the card layer is a sibling of the board container, not inside it', async () => {
        await mountTaylor();
        const container = document.getElementById('jgbox')!;
        const layer = document.querySelector('.board-cards-layer')!;
        expect(layer).not.toBeNull();
        expect(container.contains(layer)).toBe(false);
        expect(container.querySelector('.board-card')).toBeNull();
        expect(layer.parentElement).toBe(container.parentElement);
    });

    test('the inspector keeps its tabs while its readout and legend panels are hidden', async () => {
        await mountTaylor();
        expect(document.querySelector('main')?.hasAttribute('data-board-cards')).toBe(true);
        expect(document.querySelector('#workspace-inspector .inspector-tabs')).not.toBeNull();
        // The stylesheet hides marked panels under [data-board-cards] (DemonstrationWorkspace.css); jsdom loads no CSS.
        const panels = [...document.querySelectorAll('#workspace-inspector [data-declared-panel]')];
        expect(panels.length).toBeGreaterThan(0);
        for (const panel of panels) expect(panel.closest('[data-board-cards]'), 'declared panel is inside the hiding scope').not.toBeNull();
        expect(document.querySelector('#workspace-inspector .inspector-tabs')?.closest('[data-declared-panel]')).toBeNull();
    });

    test('a fold persists through the stored layout and survives a remount', async () => {
        const {view} = await mountTaylor();
        expect(live('[data-card-id="readouts"] .board-card-body')).not.toBeNull();
        fireEvent.click(live('[data-card-id="readouts"] .board-card-fold')!);
        expect(loadBoardLayout().folds.readouts).toBe(true);
        await waitUntil(() => live('[data-card-id="readouts"] .board-card-body') === null);
        view.unmount();
        await mountTaylor();
        expect(live('[data-card-id="readouts"] .board-card-body')).toBeNull();
        expect(loadBoardLayout().folds.readouts).toBe(true);
    });

    test('a card folded before a reload is as wide as when open once it is unfolded', async () => {
        naturalWidths = {readouts: 282, legend: 194};
        appStorage.setItem(BOARD_LAYOUT_KEY, JSON.stringify({version: 1, placements: {}, folds: {readouts: true}}));
        await mountTaylor();
        const width = () => parseFloat(shown('readouts')!.style.width);
        expect(live('[data-card-id="readouts"] .board-card-body')).toBeNull();
        fireEvent.click(live('[data-card-id="readouts"] .board-card-fold')!);
        await waitUntil(() => live('[data-card-id="readouts"] .board-card-body') !== null);
        await waitUntil(() => width() === 282).catch(() => undefined);
        expect(width()).toBe(282);
    });

    test('a fold keeps the old layout on screen until the new one is final: no intermediate rect is ever rendered', async () => {
        naturalWidths = {readouts: 282, legend: 194};
        await mountTaylor();
        await waitUntil(() => shown('legend') !== null);
        const snapshot = () => ['readouts', 'legend'].map(id => `${id}:${shown(id)?.style.width}|${shown(id)?.style.height}|${shown(id)?.style.transform}|${shown(id)?.querySelector('.board-card-body') ? 'open' : 'folded'}`).join(' ');
        const seen: string[] = [snapshot()];
        const layer = document.querySelector('.board-cards-layer')!;
        const observer = new MutationObserver(() => { const now = snapshot(); if (now !== seen[seen.length - 1]) seen.push(now); });
        observer.observe(layer, {attributes: true, childList: true, subtree: true});
        fireEvent.click(live('[data-card-id="readouts"] .board-card-fold')!);
        await waitUntil(() => live('[data-card-id="readouts"] .board-card-body') === null);
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
        observer.disconnect();
        // old layout, then the final one: nothing between (a fold re-assigns the column width, which would show as extra states)
        expect(seen.length).toBe(2);
    });

    test('a card wider than the column is shown at the layout width and the pass terminates', async () => {
        naturalWidths = {readouts: 900, legend: 194};
        await mountTaylor();
        const wide = parseFloat(shown('readouts')!.style.width);
        expect(wide).toBeLessThan(900);
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
        expect(parseFloat(shown('readouts')!.style.width)).toBe(wide);
        // Content wider than the assigned width scrolls inside the card; it never spills over the board.
        expect(cardCss).toMatch(/\.board-card-body\s*\{[^}]*overflow-x:\s*auto/);
    });

    test('value cells reserve a width from the value format, so longer numbers do not change it', async () => {
        const {graph} = await mountTaylor();
        const reserved = () => [...document.querySelectorAll<HTMLElement>('.board-cards-layer [data-card-id="readouts"] .ws-number')].map(el => el.style.minWidth);
        const before = reserved();
        expect(before.length).toBeGreaterThan(1);
        expect(before.filter(Boolean).every(width => /^\d+ch$/.test(width))).toBe(true);
        const widthBefore = shown('readouts')!.style.width;
        act(() => { graph.parameters!.write('taylor-degree', 9, 'lesson'); });
        expect(reserved()).toEqual(before);
        expect(shown('readouts')!.style.width).toBe(widthBefore);
    });

    test('one settled polite live region announces the new value after a parameter write; the measure layer has none', async () => {
        {
            const {graph} = await mountTaylor();
            const regions = () => document.querySelectorAll('.board-cards-layer [data-card-id="readouts"] [aria-live="polite"][data-card-readouts-live]');
            expect(regions().length).toBe(1);
            expect(document.querySelector('[data-measure-layer] [aria-live]')).toBeNull();
            const before = regions()[0].textContent;
            expect(before).toContain('.');
            act(() => { graph.parameters!.write('taylor-degree', 4, 'lesson'); });
            expect(regions()[0].textContent).toBe(before);
            await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });
            const after = regions()[0].textContent;
            expect(after).not.toBe(before);
            const rows = (declarationOf(graph).readouts ?? []).flatMap(group => [...group.rows]).filter(row => !row.unit && !row.valueTex && !row.muted && row.name);
            expect(after).toContain(readoutValueText(rows[0].value));
        }
    });

    test('a keyboard move persists through the stored layout and survives a remount', async () => {
        const {view} = await mountTaylor();
        const start = shown('readouts')!.style.transform;
        const grip = live('[data-card-id="readouts"] .board-card-grip')!;
        fireEvent.keyDown(grip, {key: 'Enter'});
        for (let step = 0; step < 5; step++) fireEvent.keyDown(grip, {key: 'ArrowLeft', shiftKey: true});
        fireEvent.keyDown(grip, {key: 'Enter'});
        const placement = loadBoardLayout().placements.readouts;
        expect(placement).toBeDefined();
        await waitUntil(() => shown('readouts')!.style.transform !== start);
        const moved = shown('readouts')!.style.transform;
        view.unmount();
        await mountTaylor();
        expect(shown('readouts')!.style.transform).toBe(moved);
        expect(loadBoardLayout().placements.readouts).toEqual(placement);
    });

    test('a corrupted stored record falls back to the defaults', async () => {
        const {view} = await mountTaylor();
        const defaults = shown('readouts')!.style.transform;
        view.unmount();
        appStorage.setItem(BOARD_LAYOUT_KEY, '{"version":1,"placements":{"readouts":{"kind":"docked","anchor":"nowhere","order":0}},"folds":{"readouts":"yes"}}');
        await mountTaylor();
        expect(shown('readouts')!.style.transform).toBe(defaults);
        expect(live('[data-card-id="readouts"] .board-card-body')).not.toBeNull();
        cleanup();
        appStorage.setItem(BOARD_LAYOUT_KEY, '{not json');
        await mountTaylor();
        expect(shown('readouts')!.style.transform).toBe(defaults);
    });
});

describe('the old panels of other declared pilots', () => {
    test.each([
        ['CrossRatio', () => new CrossRatioGraph()],
        ['NotablePoints', () => new NotablePointsGraph()],
    ])('%s marks its old panel for hiding and shows a card', async (_name, make) => {
        mountGraph(make());
        await waitUntil(() => document.querySelector('.board-cards-layer [data-card-id]') !== null);
        expect(document.querySelector('main')?.hasAttribute('data-board-cards')).toBe(true);
        expect(document.querySelectorAll('#workspace-inspector [data-declared-panel]').length).toBeGreaterThan(0);
        expect(document.querySelector('.board-cards-layer [data-declared-panel]')).toBeNull();
        for (const panel of document.querySelectorAll('#workspace-inspector [data-declared-panel]')) expect(panel.closest('[data-board-cards]')).not.toBeNull();
        expect(document.querySelector('#workspace-inspector .inspector-tabs')).not.toBeNull();
    });

    test('the Taylor readout and legend panels carry the marker', async () => {
        await mountTaylor();
        expect(document.querySelectorAll('#workspace-inspector .function-readout[data-declared-panel], #workspace-inspector .function-legend[data-declared-panel]').length).toBeGreaterThan(0);
    });
});

describe('the presenter on an undeclared graph', () => {
    test('renders no card layer', () => {
        mountGraph(new RootFindingGraph());
        expect(document.querySelector('.board-cards-layer')).toBeNull();
        expect(document.querySelector('[data-board-cards]')).toBeNull();
        expect(document.querySelectorAll('[data-declared-panel]').length).toBe(0);
        expect(document.getElementById('jgbox')).not.toBeNull();
    });
});
