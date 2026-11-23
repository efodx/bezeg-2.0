import {createElement, useEffect, useRef, useState} from 'react';
import type {ReactElement, ReactNode} from 'react';
import {loadMathJax} from '../../mathjax/loadMathJax';
import type {MathJaxApi} from '../../mathjax/loadMathJax';
import {measureCards} from './measureCards';
import type {MeasuredCard} from './measureCards';

export interface MeasureItem {
  id: string;
  /** Fixed width in px (centre column); omitted means the card's natural width. */
  width?: number;
  /** Must render a card root following the markup contract in measureCards.ts. */
  node: ReactNode;
}

export interface MeasuredCards {
  /** Render this once, anywhere; it is hidden, off-screen and inert. */
  layer: ReactElement;
  /** Null until fonts and typesetting have settled. */
  measured: readonly MeasuredCard[] | null;
  /** 0 after the first measurement, 1 after the single remeasure (if any size changed). */
  generation: number;
}

export interface MeasureOptions {
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
  const [state, setState] = useState<{measured: readonly MeasuredCard[] | null; generation: number}>(
    {measured: null, generation: 0});
  const whenReadyRef = useRef(options.whenReady ?? waitForFontsAndMath);
  const whenReady = options.whenReady ?? waitForFontsAndMath;
  useEffect(() => {
    whenReadyRef.current = whenReady;
  });
  const key = items.map((i) => `${i.id}:${i.width ?? ''}`).join('|');

  useEffect(() => {
    const layer = layerNode;
    if (!layer) return undefined;
    layer.setAttribute('inert', '');
    let cancelled = false;
    let teardown: (() => void) | null = null;

    void whenReadyRef.current(layer).then(() => {
      if (cancelled) return;
      const first = measureCards(layer);
      setState((prev) => ({measured: first, generation: prev.measured ? prev.generation : 0}));

      // At most one remeasure: the first observed change in any size.
      const check = () => {
        if (cancelled) return;
        const next = measureCards(layer);
        if (signature(next) === signature(first)) return;
        teardown?.();
        teardown = null;
        setState((prev) => ({measured: next, generation: prev.generation + 1}));
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
    items.map((item) =>
      createElement(
        'div',
        {key: item.id, style: {width: item.width ?? 'max-content', position: 'relative'}},
        item.node,
      ),
    ),
  );

  return {layer, measured: state.measured, generation: state.generation};
}
