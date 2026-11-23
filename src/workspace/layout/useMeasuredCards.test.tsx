import {act, createElement, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useMeasuredCards} from './useMeasuredCards';
import type {MeasuredCards} from './useMeasuredCards';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let height = 100;
let observerCallbacks: Array<() => void> = [];
let disconnects = 0;

class FakeObserver {
  constructor(cb: () => void) { observerCallbacks.push(cb); }
  observe() {}
  disconnect() { disconnects += 1; }
}

let root: Root;
let host: HTMLElement;
const latest: {current: MeasuredCards | null} = {current: null};

function Probe({whenReady}: {whenReady: () => Promise<void>}) {
  const items = [{id: 'a', node: createElement('div', {'data-card-id': 'a'}, 'x')}];
  const value = useMeasuredCards(items, {whenReady});
  useEffect(() => {
    latest.current = value;
  });
  return value.layer;
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('useMeasuredCards', () => {
  let fontsEvents: EventTarget;
  beforeEach(() => {
    height = 100; observerCallbacks = []; disconnects = 0;
    fontsEvents = new EventTarget();
    Object.defineProperty(document, 'fonts', {value: fontsEvents, configurable: true});
    vi.stubGlobal('ResizeObserver', FakeObserver);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({top: 0, bottom: height, height, width: 50, left: 0, right: 50, x: 0, y: 0, toJSON: () => ({})}) as DOMRect);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('waits for readiness, remeasures once on a size change, and cleans up', async () => {
    let release!: () => void;
    const ready = new Promise<void>((r) => { release = r; });
    const removeSpy = vi.spyOn(fontsEvents, 'removeEventListener');
    await act(async () => { root.render(createElement(Probe, {whenReady: () => ready})); });
    expect(latest.current?.measured).toBeNull();
    const layerEl = host.firstElementChild as HTMLElement;
    expect(layerEl.getAttribute('aria-hidden')).toBe('true');
    expect(layerEl.hasAttribute('inert')).toBe(true);

    release();
    await flush();
    expect(latest.current?.measured?.[0].natural.h).toBe(100);
    expect(latest.current?.generation).toBe(0);

    observerCallbacks[0]?.(); // no size change: ignored
    await flush();
    expect(latest.current?.generation).toBe(0);

    height = 140;
    await act(async () => { fontsEvents.dispatchEvent(new Event('loadingdone')); });
    expect(latest.current?.generation).toBe(1);
    expect(latest.current?.measured?.[0].natural.h).toBe(140);

    height = 180;
    await act(async () => { fontsEvents.dispatchEvent(new Event('loadingdone')); });
    expect(latest.current?.generation).toBe(1); // at most one remeasure
    expect(removeSpy).toHaveBeenCalledWith('loadingdone', expect.any(Function));
  });

  it('keeps a live item out of the hidden layer and merges its on-board reading into measured', async () => {
    const rects: Record<string, [number, number]> = {card: [0, 120], head: [0, 30], body: [30, 119], row1: [40, 70], row2: [80, 110]};
    const rectOf = (el: Element) => rects[(el as HTMLElement).dataset.testid ?? ''] ?? [0, 100];
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const [top, bottom] = rectOf(this);
      return {top, bottom, height: bottom - top, width: 50, left: 0, right: 50, x: 0, y: top, toJSON: () => ({})} as DOMRect;
    });
    function LiveProbe() {
      const value = useMeasuredCards([
        {id: 'a', node: createElement('div', {'data-card-id': 'a'}, 'x')},
        {id: 'lesson', live: true, node: createElement('div', {'data-card-id': 'lesson', 'data-testid': 'hidden-lesson'}, 'y')},
      ], {whenReady: () => Promise.resolve()});
      useEffect(() => {
        latest.current = value;
      });
      return createElement('div', null, value.layer,
        createElement('div', {'data-card-id': 'lesson', 'data-testid': 'card'},
          createElement('div', {'data-card-head': '', 'data-testid': 'head'}),
          createElement('div', {'data-card-body': '', 'data-testid': 'body'},
            createElement('div', {'data-testid': 'content'}, createElement('p', {'data-card-row': '', 'data-testid': 'row1'}), createElement('p', {'data-card-row': '', 'data-testid': 'row2'})))));
    }
    rects.content = [40, 112];
    await act(async () => { root.render(createElement(LiveProbe)); });
    await flush();
    expect(host.querySelectorAll('[data-measure-layer] [data-card-id="lesson"]').length).toBe(0);
    expect(latest.current?.measured?.map((m) => m.id)).toEqual(['a']);

    await act(async () => { latest.current?.measureLive('lesson', host.querySelector<HTMLElement>('[data-testid="card"]')); });
    const lesson = latest.current?.measured?.find((m) => m.id === 'lesson');
    expect(lesson).toMatchObject({foldedHeight: 30, rowBreaks: [70, 110], natural: {w: 50, h: 112}});
    expect(lesson?.min.h).toBe(70);
    const before = latest.current?.measured;
    await act(async () => { latest.current?.measureLive('lesson', host.querySelector<HTMLElement>('[data-testid="card"]')); });
    expect(latest.current?.measured).toBe(before); // unchanged reading: no new array
  });

  it('removes the font listener on unmount', async () => {
    const removeSpy = vi.spyOn(fontsEvents, 'removeEventListener');
    await act(async () => { root.render(createElement(Probe, {whenReady: () => Promise.resolve()})); });
    await flush();
    expect(removeSpy).not.toHaveBeenCalled();
    act(() => root.unmount());
    expect(removeSpy).toHaveBeenCalledWith('loadingdone', expect.any(Function));
    expect(disconnects).toBe(1);
    root = createRoot(host);
  });
});
