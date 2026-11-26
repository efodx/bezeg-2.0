import {act, cleanup, fireEvent} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TaylorGraph, type TaylorIds} from '../../graphs/functions/TaylorGraph';
import {FixedPointGraph} from '../../graphs/functions/FixedPointGraph';
import {CrossRatioGraph} from '../../graphs/projective/CrossRatioGraph';
import {NotablePointsGraph} from '../../graphs/compgeo/NotablePointsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../graphs/base/realGraphTestHarness';
import type {GraphDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {setLanguage} from '../../localization';
import {appStorage} from '../../storage/appStorage';
import {readoutValueText} from '../cards/ReadoutsBody';
import {readFileSync} from 'node:fs';
const cardCss = readFileSync('src/workspace/cards/CardShell.css', 'utf8');
import {MemoryRouter} from 'react-router-dom';
import {render} from '@testing-library/react';
import {GraphHost} from '../../graphs/base/GraphHost';
import {SiteContext} from '../../graphs/context/react/SiteContext';
import {BOARD_LAYOUT_KEY, loadBoardLayout} from '../layout/storedLayout';
import {BoardCards, CARD_MIN_WIDTH} from './BoardCards';
import {BezierClippingGraph} from '../../graphs/compgeo/BezierClippingGraph';
import type {WorkspaceCardHost} from './cardHost';
import type {FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';

// The measure pass waits for MathJax; jsdom has none.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
/** Natural card widths by id for the jsdom layout stand-in; absent means 200. */
let naturalWidths: Record<string, number> = {};
/** A board whose size is not known (jsdom without a layout stand-in): the layer reads 0 x 0. */
let unmeasuredBoard = false;
beforeAll(() => {
    installBoardShims();
    // jsdom lays nothing out: a board of 1000 x 700 and cards of 200 x 150 with 32 px heads and 24 px rows.
    const box = (w: number, h: number, top = 0): DOMRect => ({x: 0, y: top, left: 0, top, right: w, bottom: top + h, width: w, height: h, toJSON: () => ({})}) as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        if (this.classList.contains('board-cards-layer')) return unmeasuredBoard ? box(0, 0) : box(1000, 700);
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
beforeEach(() => { setLanguage('sl'); window.localStorage.clear(); naturalWidths = {}; unmeasuredBoard = false; });
afterEach(cleanup);

const live = (selector: string) => document.querySelector<HTMLElement>(`.board-cards-layer ${selector}`);
const shown = (id: string) => live(`[data-card-id="${id}"]`);
/** The tools card starts folded on a board under 1200 px; the head icon unfolds it. */
async function openTools() {
    if (live('[data-card-id="tools"] .board-card-body:not([hidden])')) return;
    fireEvent.click(live('[data-card-id="tools"] button[aria-controls="inspector-edit"]')!);
    await waitUntil(() => live('[data-card-id="tools"] .board-card-body:not([hidden])') !== null);
}
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

    test('Orodja holds the marked readout and legend panels; there is no inspector aside or tabs', async () => {
        await mountTaylor();
        await openTools();
        expect(document.querySelector('#workspace-inspector')).toBeNull();
        expect(document.querySelector('.inspector-tabs')).toBeNull();
        // The stylesheet hides marked panels under [data-declared] (tools.css); jsdom loads no CSS.
        const panels = [...document.querySelectorAll('.tools-body [data-declared-panel]')];
        expect(panels.length).toBeGreaterThan(0);
        for (const panel of panels) expect(panel.closest('[data-declared]'), 'declared panel is inside the hiding scope').not.toBeNull();
    });

    test('a declared graph shows Orodja and Odčitki', async () => {
        await mountTaylor();
        expect(shown('tools')).not.toBeNull();
        expect(shown('readouts')).not.toBeNull();
    });

    test('the budget opens two cards at a board of 1200 px or more, one below', async () => {
        const wide = HTMLElement.prototype.getBoundingClientRect;
        HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
            const r = wide.call(this);
            return this.classList.contains('board-cards-layer') ? {...r, width: 1300, right: 1300} as DOMRect : r;
        };
        try {
            await mountTaylor();
            await waitUntil(() => shown('tools') !== null);
            expect(live('[data-card-id="readouts"] .board-card-body')).not.toBeNull();
            expect(live('[data-card-id="tools"] .board-card-body:not([hidden])')).not.toBeNull();
        } finally { HTMLElement.prototype.getBoundingClientRect = wide; }
        cleanup();
        await mountTaylor();
        await waitUntil(() => shown('tools') !== null);
        expect(live('[data-card-id="readouts"] .board-card-body')).not.toBeNull();
        expect(live('[data-card-id="tools"] .board-card-body:not([hidden])')).toBeNull();
    });

    test('the head icons switch the panel and unfold the card', async () => {
        await mountTaylor();
        expect(live('[data-card-id="tools"] .board-card-body:not([hidden])')).toBeNull();
        const save = live('[data-card-id="tools"] button[aria-controls="inspector-save"]')!;
        fireEvent.click(save);
        await waitUntil(() => live('[data-card-id="tools"] .board-card-body:not([hidden])') !== null);
        expect(document.getElementById('inspector-save')!.hidden).toBe(false);
        expect(document.getElementById('inspector-edit')!.hidden).toBe(true);
        expect(live('[data-card-id="tools"] button[aria-controls="inspector-save"]')!.getAttribute('aria-pressed')).toBe('true');
    });

    test('the Orodja card is the labelled complementary region and the id aria-controls points to', async () => {
        await mountTaylor();
        const card = document.getElementById('board-card-tools')!;
        expect(card.getAttribute('role')).toBe('complementary');
        expect(card.getAttribute('aria-label')).toBe('Orodja demonstracije');
        expect(card.querySelector('button[aria-pressed]')).not.toBeNull();
        expect(document.querySelectorAll('#board-card-tools').length).toBe(1);
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

describe('Presentation', () => {
    test('the header toggle folds and unfolds Orodja without writing the stored layout', async () => {
        render(<MemoryRouter><SiteContext.Provider value={{fullScreen: {fullScreen: true, setFullScreen: vi.fn()}}}>
            <GraphHost create={() => new TaylorGraph()}/></SiteContext.Provider></MemoryRouter>);
        await waitUntil(() => shown('tools') !== null);
        const toggle = document.querySelector<HTMLElement>('button[aria-controls="board-card-tools"]')!;
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(live('[data-card-id="tools"] .board-card-body:not([hidden])')).toBeNull();
        fireEvent.click(toggle);
        await waitUntil(() => live('[data-card-id="tools"] .board-card-body:not([hidden])') !== null);
        fireEvent.click(toggle);
        await waitUntil(() => live('[data-card-id="tools"] .board-card-body:not([hidden])') === null);
        expect(appStorage.getItem(BOARD_LAYOUT_KEY)).toBeNull();
    });
});

describe('the old panels of other declared pilots', () => {
    test.each([
        ['CrossRatio', () => new CrossRatioGraph()],
        ['NotablePoints', () => new NotablePointsGraph()],
    ])('%s marks its old panel for hiding and shows a card', async (_name, make) => {
        mountGraph(make());
        await waitUntil(() => shown('tools') !== null);
        await openTools();
        expect(document.querySelectorAll('.tools-body [data-declared-panel]').length).toBeGreaterThan(0);
        expect(document.querySelector('.board-cards-layer [data-card-id]:not([data-card-id="tools"]) [data-declared-panel]')).toBeNull();
        for (const panel of document.querySelectorAll('.tools-body [data-declared-panel]')) expect(panel.closest('[data-declared]')).not.toBeNull();
        expect(document.querySelector('.inspector-tabs')).toBeNull();
    });

    test('the Taylor readout and legend panels carry the marker', async () => {
        await mountTaylor();
        await openTools();
        expect(document.querySelectorAll('.tools-body .function-readout[data-declared-panel], .tools-body .function-legend[data-declared-panel]').length).toBeGreaterThan(0);
    });
});

describe('Orodja never waits for the measure pass', () => {
    test('its controls are in the first commit, before any timer or promise settles', () => {
        mountGraph(new FixedPointGraph());
        // No waitUntil: the card and its panels must already be there.
        expect(shown('tools')).not.toBeNull();
        expect(document.querySelector('[data-testid="inspector-edit"]')).not.toBeNull();
    });

    test('a board whose size is unknown (0 x 0) still shows the card, unpositioned', () => {
        unmeasuredBoard = true;
        mountGraph(new FixedPointGraph());
        const card = shown('tools')!;
        expect(card).not.toBeNull();
        expect(card.classList.contains('board-card--static')).toBe(true);
        expect(card.querySelector('.board-card-body')!.hasAttribute('hidden')).toBe(false);
        expect(document.querySelector('[data-testid="inspector-edit"]')).not.toBeNull();
    });
});

describe('Orodja\'s live reading settles', () => {
    // In a browser the shown card's reading follows what it was assigned (here: its width, fractional, and a height that grows once
    // the content has mounted); the layout effect that reads it must not feed that back into another commit without end.
    test.each([0, 0.3])('with a measured size that follows the assigned width (+%s px) and a height that changes once, it stops re-rendering', async (extra) => {
        const base = HTMLElement.prototype.getBoundingClientRect;
        let reads = 0;
        HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
            const r = base.call(this);
            if (this.dataset.cardId !== 'tools' || this.closest('[data-measure-layer]')) return r;
            reads += 1;
            const assigned = parseFloat(this.style.width || '');
            return {...r, width: (Number.isFinite(assigned) ? assigned : r.width) + extra, height: reads < 4 ? 105 : 338, bottom: r.top + (reads < 4 ? 105 : 338)} as DOMRect;
        };
        try {
            mountGraph(new FixedPointGraph());
            await waitUntil(() => shown('tools') !== null);
            await new Promise(resolve => setTimeout(resolve, 150));
            const settled = reads;
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(reads).toBe(settled);
            expect(settled).toBeLessThan(40);
        } finally { HTMLElement.prototype.getBoundingClientRect = base; }
    });
});

describe('Orodja\'s width', () => {
    // Orodja is read live at the width its content shrinks to (the hidden-layer proxy is not used for it); panels that shrink to
    // 215 px must not set the column: the card gets its 310 px natural width when the column cap (0.32 of the board) allows it.
    test('is at least 310 px when its content reads narrower and the column cap allows it', async () => {
        naturalWidths = {tools: 215};
        mountGraph(new FixedPointGraph());
        await waitUntil(() => shown('tools') !== null);
        await waitUntil(() => parseFloat(shown('tools')!.style.width) > 0);
        expect(parseFloat(shown('tools')!.style.width)).toBeGreaterThanOrEqual(310);
    });

    test('a short open card still leaves a folded Orodja head its width', async () => {
        naturalWidths = {readouts: 126, legend: 126};
        await mountTaylor();
        await waitUntil(() => parseFloat(shown('readouts')!.style.width) > 0);
        expect(parseFloat(shown('readouts')!.style.width)).toBeGreaterThanOrEqual(CARD_MIN_WIDTH);
    });
});

describe('two tabs share one stored layout', () => {
    test('a fold commits on top of what another tab stored after this one mounted', async () => {
        await mountTaylor();
        // Another tab opens the legend and stores that; this tab saw nothing of it (no storage event yet).
        appStorage.setItem(BOARD_LAYOUT_KEY, JSON.stringify({version: 1, placements: {}, folds: {legend: false}}));
        fireEvent.click(live('[data-card-id="readouts"] .board-card-fold')!);
        expect(loadBoardLayout().folds).toEqual({legend: false, readouts: true});
    });

    test('a storage event for the layout key refreshes the copy this tab commits from', async () => {
        await mountTaylor();
        const next = JSON.stringify({version: 1, placements: {}, folds: {legend: true}});
        appStorage.setItem(BOARD_LAYOUT_KEY, next);
        act(() => { window.dispatchEvent(new StorageEvent('storage', {key: `bezeg-2.0:${BOARD_LAYOUT_KEY}`, newValue: next})); });
        await waitUntil(() => live('[data-card-id="legend"] .board-card-body') === null);
        fireEvent.click(live('[data-card-id="readouts"] .board-card-fold')!);
        expect(loadBoardLayout().folds).toEqual({legend: true, readouts: true});
    });
});

describe('a lesson frame that uses an Orodja control', () => {
    const hostFor = (frame: FrameDeclaration, setSection: (section: 'edit' | 'display' | 'save') => void): WorkspaceCardHost => ({
        tools: {panels: {edit: <div/>, display: <div/>, save: <div/>}, section: 'save', setSection, locked: false},
        lesson: {slot: document.createElement('div'), active: true, mode: 'content', foldRequest: undefined, reportCardFolded: () => undefined},
        frame, fullScreen: false, toolsFolded: undefined, setToolsFolded: () => undefined,
    });

    test('shows the tab the playback control renders in, whatever tab the learner had', async () => {
        const setSection = vi.fn();
        render(<MemoryRouter><BoardCards graph={new BezierClippingGraph()} host={hostFor({uses: ['play'], open: ['tools']} as FrameDeclaration, setSection)}/></MemoryRouter>);
        await waitUntil(() => shown('tools') !== null);
        expect(setSection).toHaveBeenCalledWith('edit');
    });
});

describe('the presenter on an undeclared graph', () => {
    test('Orodja is the only card, starts open and holds the panels', async () => {
        mountGraph(new FixedPointGraph());
        await waitUntil(() => shown('tools') !== null);
        expect([...document.querySelectorAll('.board-cards-layer [data-card-id]')].map(el => (el as HTMLElement).dataset.cardId)).toEqual(['tools']);
        expect(live('[data-card-id="tools"] .board-card-body:not([hidden])')).not.toBeNull();
        expect(document.querySelector('.tools-body')!.hasAttribute('data-declared')).toBe(false);
        expect(document.querySelector('[data-testid="inspector-edit"]')).not.toBeNull();
        expect(document.querySelectorAll('[data-declared-panel]').length).toBe(0);
        expect(document.getElementById('jgbox')).not.toBeNull();
    });
});
