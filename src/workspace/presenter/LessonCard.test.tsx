// The lesson card on the board (task 04 slice 3b): the Guided lesson lives in a board card, mounts once, folds without losing its frame,
// and wires its frame to the card layer. Real Taylor graph through GraphHost, jsdom layout stand-ins as in BoardCards.test.tsx.
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {TaylorGraph} from '../../graphs/functions/TaylorGraph';
import {RootFindingGraph} from '../../graphs/functions/RootFindingGraph';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../graphs/base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {BOARD_LAYOUT_KEY} from '../layout/storedLayout';
import {appStorage} from '../../storage/appStorage';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

beforeAll(() => {
    installBoardShims();
    const box = (w: number, h: number, top = 0): DOMRect => ({x: 0, y: top, left: 0, top, right: w, bottom: top + h, width: w, height: h, toJSON: () => ({})}) as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        if (this.classList.contains('board-cards-layer')) return box(1000, 700);
        if (this.hasAttribute('data-card-id')) {
            const assigned = parseFloat(this.style.width || this.parentElement?.style.width || '');
            return box(Number.isFinite(assigned) ? assigned : 300, 150);
        }
        if (this.hasAttribute('data-card-head')) return box(200, 32);
        if (this.hasAttribute('data-card-row')) {
            const rows = [...(this.closest('[data-card-id]')?.querySelectorAll('[data-card-row]') ?? [])];
            return box(200, 24, 32 + 24 * rows.indexOf(this));
        }
        return box(600, 400);
    };
});
beforeEach(() => {
    setLanguage('sl');
    window.localStorage.clear();
    (window as Window & {MathJax?: unknown}).MathJax = {startup: {promise: Promise.resolve()}, typesetClear: vi.fn(), typesetPromise: vi.fn().mockResolvedValue(undefined)};
});
afterEach(cleanup);

const layer = (selector: string) => document.querySelector<HTMLElement>(`.board-cards-layer ${selector}`);
const card = (id: string) => layer(`[data-card-id="${id}"]`);
const bodyShown = (id: string) => layer(`[data-card-id="${id}"] .board-card-body:not([hidden])`) !== null;
const next = () => fireEvent.click(document.querySelector<HTMLElement>('button[aria-label="Naprej: naslednji okvir"]')!);
const frameTitle = () => layer('.guided-lesson-frame h3')?.textContent;

async function mountLesson() {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/analysis/taylor?learn=1']}><GraphHost create={() => new TaylorGraph()}/></MemoryRouter>);
    await waitUntil(() => card('lesson') !== null && layer('.guided-lesson') !== null && card('readouts') !== null);
}

describe('the lesson card', () => {
    test('holds the lesson slot and is the only place the lesson renders', async () => {
        await mountLesson();
        expect(card('lesson')!.querySelector('.guided-lesson-slot > .guided-lesson-card')).not.toBeNull();
        expect(document.querySelectorAll('.guided-lesson-slot').length).toBe(1);
        expect(document.querySelector('.demonstration-workspace > .guided-lesson-slot')).toBeNull();
        expect(card('lesson')!.querySelector('[data-card-row]')).not.toBeNull();
    });

    test('the frame and the lesson element survive a move and a fold', async () => {
        await mountLesson();
        const lesson = layer('.guided-lesson')!;
        next();
        const second = frameTitle();
        await act(async () => { next(); });
        const third = frameTitle();
        expect(third).not.toBe(second);
        // A keyboard move (pick up, arrow, drop) and a fold from the card head.
        const grip = card('lesson')!.querySelector<HTMLElement>('.board-card-grip')!;
        grip.focus();
        fireEvent.keyDown(grip, {key: 'Enter'});
        fireEvent.keyDown(grip, {key: 'ArrowRight'});
        fireEvent.keyDown(grip, {key: 'Enter'});
        fireEvent.click(card('lesson')!.querySelector<HTMLElement>('.board-card-fold')!);
        await waitUntil(() => !bodyShown('lesson'));
        fireEvent.click(card('lesson')!.querySelector<HTMLElement>('.board-card-fold')!);
        await waitUntil(() => bodyShown('lesson'));
        expect(layer('.guided-lesson')).toBe(lesson);
        expect(frameTitle()).toBe(third);
    });

    test('a fold request from the lesson (Escape) folds the card without storing the fold, and the frame is kept', async () => {
        await mountLesson();
        next();
        const title = frameTitle();
        act(() => { document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); });
        await waitUntil(() => !bodyShown('lesson'));
        expect(appStorage.getItem(BOARD_LAYOUT_KEY) ?? '').not.toContain('lesson');
        fireEvent.click(card('lesson')!.querySelector<HTMLElement>('.board-card-fold')!);
        await waitUntil(() => bodyShown('lesson'));
        expect(frameTitle()).toBe(title);
    });
});

describe('the frame reaches the card layer', () => {
    test('the open frame highlights its readout rows', async () => {
        await mountLesson();
        // At this board width the budget leaves Odčitki folded; the frame's highlight does not open it, so the learner does.
        if (!bodyShown('readouts')) fireEvent.click(card('readouts')!.querySelector<HTMLElement>('.board-card-fold')!);
        await waitUntil(() => bodyShown('readouts'));
        expect(card('readouts')!.querySelector('[data-highlight]')).toBeNull();
        for (let index = 0; index < 2; index++) { await act(async () => { next(); }); }
        await waitUntil(() => card('readouts')!.querySelector('[data-highlight]') !== null);
        expect(card('readouts')!.querySelector('[data-card-readout="absolute-error"]')?.hasAttribute('data-highlight')).toBe(true);
    });

    test('a declared graph whose frame uses only board controls leaves Orodja folded beside the lesson on a narrow board', async () => {
        await mountLesson();
        for (let index = 0; index < 2; index++) { await act(async () => { next(); }); }
        expect(bodyShown('tools')).toBe(false);
    });

    test('an undeclared graph keeps Orodja open beside the lesson card at any width', async () => {
        render(<MemoryRouter initialEntries={['/bezeg-2.0/analysis/root-finding?learn=1']}><GraphHost create={() => new RootFindingGraph()}/></MemoryRouter>);
        await waitUntil(() => card('lesson') !== null && layer('.guided-lesson') !== null && card('tools') !== null);
        await waitUntil(() => bodyShown('tools'));
        expect(bodyShown('lesson')).toBe(true);
    });
});
