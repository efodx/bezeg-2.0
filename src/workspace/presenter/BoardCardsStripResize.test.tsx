// Task 08 bug A: a puck slot that grows after the strip's first reading (a lesson adds a button to a puck, a font loads) must be read
// again, or the layout wraps the strip in rows it does not count and the extra row overlaps the lesson card above.
import {act, cleanup} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {TaylorGraph} from '../../graphs/functions/TaylorGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../graphs/base/realGraphTestHarness';
import {setLanguage} from '../../localization';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

const observers: {callback: () => void; targets: Element[]}[] = [];
let slotWidth = 132;

beforeAll(() => {
    installBoardShims();
    window.ResizeObserver = class {
        private readonly entry: {callback: () => void; targets: Element[]};
        constructor(callback: () => void) { this.entry = {callback, targets: []}; observers.push(this.entry); }
        observe(target: Element) { this.entry.targets.push(target); }
        unobserve() {}
        disconnect() { this.entry.targets.length = 0; }
    } as unknown as typeof ResizeObserver;
    const base = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!.get!;
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {configurable: true, get(this: HTMLElement) { return this.classList.contains('puck-slot') ? slotWidth : base.call(this); }});
});
beforeEach(() => { setLanguage('sl'); window.localStorage.clear(); slotWidth = 132; observers.length = 0; });
afterEach(cleanup);

test('a slot that grows after the first reading is measured again and the strip wraps to the taller height', async () => {
    mountGraph(new TaylorGraph());
    const strip = () => document.querySelector<HTMLElement>('[data-puck-strip]')!;
    await waitUntil(() => strip() !== null && strip().style.transform !== '');
    const before = parseFloat(strip().style.height);
    slotWidth = 480; // wider than the board leaves for the strip: it must wrap
    act(() => { for (const observer of observers) if (observer.targets.some(target => target.classList.contains('puck-slot'))) observer.callback(); });
    await waitUntil(() => parseFloat(strip().style.height) > before);
    expect(parseFloat(strip().style.height)).toBeGreaterThan(before);
});
