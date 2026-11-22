import {act, createElement} from 'react';
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
let result: MeasuredCards;

function Probe({whenReady}: {whenReady: () => Promise<void>}) {
  const items = [{id: 'a', node: createElement('div', {'data-card-id': 'a'}, 'x')}];
  result = useMeasuredCards(items, {whenReady});
  return result.layer;
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
    expect(result.measured).toBeNull();
    const layerEl = host.firstElementChild as HTMLElement;
    expect(layerEl.getAttribute('aria-hidden')).toBe('true');
    expect(layerEl.hasAttribute('inert')).toBe(true);

    release();
    await flush();
    expect(result.measured?.[0].natural.h).toBe(100);
    expect(result.generation).toBe(0);

    observerCallbacks[0]?.(); // no size change: ignored
    await flush();
    expect(result.generation).toBe(0);

    height = 140;
    await act(async () => { fontsEvents.dispatchEvent(new Event('loadingdone')); });
    expect(result.generation).toBe(1);
    expect(result.measured?.[0].natural.h).toBe(140);

    height = 180;
    await act(async () => { fontsEvents.dispatchEvent(new Event('loadingdone')); });
    expect(result.generation).toBe(1); // at most one remeasure
    expect(removeSpy).toHaveBeenCalledWith('loadingdone', expect.any(Function));
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
