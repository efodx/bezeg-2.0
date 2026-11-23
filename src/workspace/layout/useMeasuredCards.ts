import {createElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {ReactElement, ReactNode} from 'react';
import {loadMathJax} from '../../mathjax/loadMathJax';
import type {MathJaxApi} from '../../mathjax/loadMathJax';
import {measureCards, measureLiveCard} from './measureCards';
import type {MeasuredCard} from './measureCards';

export interface MeasureItem {
  id: string;
  /** Fixed width in px (centre column); omitted means the card's natural width. */
  width?: number;
  /** Must render a card root following the markup contract in measureCards.ts. */
  node: ReactNode;
  /** The card is shown on the board and measured there: it is not rendered in the hidden layer; the presenter calls
   *  `measureLive(id, cardRoot)` from a layout effect instead. */
  live?: true;
}

export interface MeasuredCards {
  /** Render this once, anywhere; it is hidden, off-screen and inert. */
  layer: ReactElement;
  /** Null until fonts and typesetting have settled (live cards, once read, are included before that). */
  measured: readonly MeasuredCard[] | null;
  /** 0 after the first measurement, 1 after the single remeasure (if any size changed). */
  generation: number;
  /** True when `measured` was taken for the items and content key of this render (false while a newer pass is pending). */
  settled: boolean;
  /** Reads a live item's card (`[data-card-id]` root with `data-card-body`, rows and head) at its assigned width and merges it into
   *  `measured`. Call from a layout effect (it re-renders before paint); an unchanged reading does nothing. Stable identity. */
  measureLive: (id: string, element: HTMLElement | null) => void;
}

export interface MeasureOptions {
  /** Anything that changes the cards' content (language, ids, highlights): a new value measures again. */
  contentKey?: string;
  /** Resolves when fonts and formulas inside the layer are final. Default: fonts + MathJax. */
  whenReady?: (layer: HTMLElement) => Promise<void>;
}

/** Same APIs as FigureCapture.ts (waitForFonts/waitForMathJax), without its capture lifecycle. */
export async function waitForFontsAndMath(layer: HTMLElement): Promise<void> {
  const waitFonts = async () => {
    const fonts = document.fonts;
    if (fonts?.ready) await fonts.ready;
  };
  await waitFonts();
  let mathJax = (window as Window & {MathJax?: MathJaxApi}).MathJax;
  const hasRawMath = /\\\(|\\\[|\$\$|\\begin\s*\{/.test(layer.textContent ?? '');
  if (mathJax || hasRawMath) {
    if (!mathJax) mathJax = await loadMathJax();
    if (mathJax.startup?.promise) await mathJax.startup.promise;
    if (mathJax.typesetPromise) await mathJax.typesetPromise([layer]);
    await waitFonts(); // typesetting can introduce web fonts
  }
}

const signature = (cards: readonly MeasuredCard[]) => JSON.stringify(cards);

const LAYER_STYLE = {
  position: 'fixed',
  left: -100000,
  top: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
  width: 'max-content',
} as const;

export function useMeasuredCards(items: readonly MeasureItem[], options: MeasureOptions = {}): MeasuredCards {
  const [layerNode, setLayerNode] = useState<HTMLDivElement | null>(null);
  const [state, setState] = useState<{measured: readonly MeasuredCard[] | null; generation: number; key: string | null}>(
    {measured: null, generation: 0, key: null});
  const whenReadyRef = useRef(options.whenReady ?? waitForFontsAndMath);
  const whenReady = options.whenReady ?? waitForFontsAndMath;
  useEffect(() => {
    whenReadyRef.current = whenReady;
  });
  const [liveCards, setLiveCards] = useState<Readonly<Record<string, MeasuredCard>>>({});
  const measureLive = useCallback((id: string, element: HTMLElement | null) => {
    if (!element) return;
    const next = measureLiveCard(element);
    setLiveCards((prev) => (prev[id] && signature([prev[id]]) === signature([next]) ? prev : {...prev, [id]: {...next, id}}));
  }, []);
  const key = items.map((i) => `${i.id}:${i.width ?? ''}${i.live ? ':live' : ''}`).join('|') + `#${options.contentKey ?? ''}`;

  useEffect(() => {
    const layer = layerNode;
    if (!layer) return undefined;
    layer.setAttribute('inert', '');
    let cancelled = false;
    let teardown: (() => void) | null = null;

    // A formula engine that fails to load (offline) must not leave the cards unmeasured: measure what is there.
    void whenReadyRef.current(layer).catch(() => undefined).then(() => {
      if (cancelled) return;
      const first = measureCards(layer);
      setState((prev) => ({measured: first, generation: prev.measured ? prev.generation : 0, key}));

      // At most one remeasure: the first observed change in any size.
      const check = () => {
        if (cancelled) return;
        const next = measureCards(layer);
        if (signature(next) === signature(first)) return;
        teardown?.();
        teardown = null;
        setState((prev) => ({measured: next, generation: prev.generation + 1, key}));
      };
      const fonts = document.fonts;
      fonts?.addEventListener?.('loadingdone', check);
      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(check);
        layer.querySelectorAll('[data-card-id]').forEach((el) => observer?.observe(el));
      }
      teardown = () => {
        fonts?.removeEventListener?.('loadingdone', check);
        observer?.disconnect();
      };
    });

    return () => {
      cancelled = true;
      teardown?.();
      teardown = null;
    };
  }, [key, layerNode]);

  const layer = createElement(
    'div',
    {ref: setLayerNode, 'aria-hidden': true, style: LAYER_STYLE, 'data-measure-layer': ''},
    items.filter((item) => !item.live).map((item) =>
      createElement(
        'div',
        {key: item.id, style: {width: item.width ?? 'max-content', position: 'relative'}},
        item.node,
      ),
    ),
  );

  const liveIds = items.filter((i) => i.live).map((i) => i.id).join('|');
  const measured = useMemo(() => {
    const ids = liveIds ? liveIds.split('|') : [];
    const live = ids.flatMap((id) => (liveCards[id] ? [liveCards[id]] : []));
    // A live card is shown before the hidden ones are measured: with nothing else measured yet, `measured` holds the live cards only.
    if (!state.measured) return live.length ? live : null;
    return live.length ? [...state.measured, ...live] : state.measured;
  }, [state.measured, liveCards, liveIds]);

  return {layer, measured, generation: state.generation, settled: state.key === key, measureLive};
}
