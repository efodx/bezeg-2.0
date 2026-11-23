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

const RAW_MATH = /\\\(|\\\[|\$\$|\\begin\s*\{/;

/** Elements of `layer` that hold raw math delimiters in their own text and no typeset output (nothing to nest into). */
function rawMathElements(layer: HTMLElement): HTMLElement[] {
  const found = new Set<HTMLElement>();
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent && RAW_MATH.test(node.textContent ?? '') && !parent.closest('mjx-container') && !parent.querySelector('mjx-container')) found.add(parent);
  }
  return [...found];
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
    if (mathJax.typesetPromise) {
      // Typesetting a subtree that already holds MathJax output typesets that output again (its assistive MathML becomes a new,
      // nested formula, 4 more per pass), and this layer is measured again on every fold. Formulas (`Tex`) typeset themselves, so
      // only elements with raw delimiters and no output yet are typeset here; an empty call queues behind the formulas in flight.
      for (const el of rawMathElements(layer)) await mathJax.typesetPromise([el]);
      await mathJax.typesetPromise([]);
    }
    await waitFonts(); // typesetting can introduce web fonts
  }
}

const signature = (cards: readonly MeasuredCard[]) => JSON.stringify(cards);

const READING_TOLERANCE = 0.5;
const near = (a: number, b: number) => Math.abs(a - b) < READING_TOLERANCE;
const sameReading = (a: MeasuredCard, b: MeasuredCard) =>
  near(a.natural.w, b.natural.w) && near(a.natural.h, b.natural.h) && near(a.min.w, b.min.w) && near(a.min.h, b.min.h) &&
  near(a.foldedHeight, b.foldedHeight) && a.rowBreaks.length === b.rowBreaks.length && a.rowBreaks.every((v, i) => near(v, b.rowBreaks[i]));

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
  const liveRef = useRef<Readonly<Record<string, MeasuredCard>>>({});
  const measureLive = useCallback((id: string, element: HTMLElement | null) => {
    if (!element) return;
    const next = measureLiveCard(element);
    // Compared against a ref, not inside a state updater: an updater that returns the old state still schedules a render, and from
    // a layout effect that read again after every commit it ended in "Maximum update depth exceeded". Readings within half a pixel
    // are the same reading, so a size that follows the layout's own output by a fraction cannot keep it going either.
    const read = liveRef.current[id];
    if (read && sameReading(read, next)) return;
    const merged = {...liveRef.current, [id]: {...next, id}};
    liveRef.current = merged;
    setLiveCards(merged);
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
