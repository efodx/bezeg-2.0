// Pure DOM reading for the board layout (design: docs/reviews/ux-picks-app-wide/03-layout-design.md).
//
// Markup contract for a measured card, rendered open at unconstrained height:
//   card root   data-card-id="<id>"
//   head        data-card-head   (the folded bar; its height is foldedHeight)
//   rows        data-card-row    (the smallest units a cut may fall between)
// Sizes come from getBoundingClientRect, so the measure layer must not be transformed.

import type {CardInput} from './boardLayout';

export type MeasuredCard = Pick<CardInput, 'id' | 'natural' | 'min' | 'foldedHeight' | 'rowBreaks'>;

/** Minimum height of a card that has no rows. */
export const DEFAULT_MIN_HEIGHT = 100;

/** What a cut card needs under its scroll area: the "Več" bar (CardShell.css: 28 px, 44 px for a coarse pointer) and the card's bottom border. */
export function moreBarHeight(): number {
  const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return (coarse ? 44 : 28) + 1;
}

/** A block taller than this is split into its own children when looking for places a cut may fall. */
const BLOCK_SPLIT = 120;

/**
 * The blocks of a card without `data-card-row` markers (Orodja: its panels belong to the graphs): the children of the elements
 * marked `data-card-blocks` that are shown, looking through `display: contents` wrappers and splitting tall blocks into their children.
 */
function blockElements(container: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const visit = (parent: HTMLElement) => {
    Array.from(parent.children).forEach((child) => {
      const el = child as HTMLElement;
      const display = getComputedStyle(el).display;
      if (display === 'none' || el.hidden) return;
      if (display === 'contents') { visit(el); return; }
      const height = el.getBoundingClientRect().height;
      if (height <= 0) return;
      if (height > BLOCK_SPLIT && el.children.length > 0) {
        const before = out.length;
        visit(el);
        if (out.length > before) return;
      }
      out.push(el);
    });
  };
  visit(container);
  return out;
}

function measureCard(root: HTMLElement, liveNaturalHeight?: number, scrolled = 0): MeasuredCard {
  const box = root.getBoundingClientRect();
  const head = root.querySelector<HTMLElement>('[data-card-head]');
  const foldedHeight = head ? head.getBoundingClientRect().height : 0;
  const rowBreaks: number[] = [];
  let last = -Infinity;
  let rows = Array.from(root.querySelectorAll<HTMLElement>('[data-card-row]'));
  let fromBlocks = false;
  if (rows.length === 0) {
    const container = root.querySelector<HTMLElement>('[data-card-blocks]');
    if (container) { rows = blockElements(container); fromBlocks = true; }
  }
  rows.forEach((row) => {
    // Cumulative bottoms relative to the card top; keep them ascending.
    const rowBox = row.getBoundingClientRect();
    // A block's own box can end above content that overflows it (a fieldset's rows): a cut must clear that too.
    const rowBottom = fromBlocks ? rowBox.top + Math.max(rowBox.height, row.scrollHeight) : rowBox.bottom;
    const bottom = Math.max(rowBottom - box.top + scrolled, last);
    rowBreaks.push(bottom);
    last = bottom;
  });
  const natural = {w: box.width, h: liveNaturalHeight ?? box.height};
  if (fromBlocks) rowBreaks.forEach((b, i) => { rowBreaks[i] = Math.min(b, natural.h); });
  // Blocks: the head, the first block and the bar, and a body of at least DEFAULT_MIN_HEIGHT (a heading alone is no content).
  const bar = moreBarHeight();
  const minH = fromBlocks && rowBreaks.length > 0 ? Math.max(rowBreaks[0] + bar, foldedHeight + DEFAULT_MIN_HEIGHT + bar)
    : rowBreaks.length > 0 ? Math.max(rowBreaks[0], foldedHeight) : DEFAULT_MIN_HEIGHT;
  return {
    id: root.dataset.cardId ?? '',
    natural,
    min: {w: natural.w, h: Math.min(minH, natural.h)},
    foldedHeight,
    rowBreaks,
  };
}

/**
 * Measures a card that is shown (laid out at its assigned width, possibly cut, so its own height is not its natural one).
 * `root` follows the same contract as a hidden card plus `data-card-body` on the scrolling body: the natural height is what the
 * body's content would need uncut plus the chrome around it, and row bottoms are corrected for the body's scroll.
 */
export function measureLiveCard(root: HTMLElement): MeasuredCard {
  const body = root.querySelector<HTMLElement>('[data-card-body]');
  if (!body) return measureCard(root);
  const box = root.getBoundingClientRect();
  const bodyBox = body.getBoundingClientRect();
  const borderBottom = parseFloat(getComputedStyle(root).borderBottomWidth) || 0;
  // The body is stretched to the card's height, so its scrollHeight cannot say how little it needs: take its content's bottom.
  const style = getComputedStyle(body);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const contentBottom = Math.max(bodyBox.top + padTop, ...Array.from(body.children).map((c) => c.getBoundingClientRect().bottom));
  const natural = bodyBox.top - box.top + (contentBottom - bodyBox.top) + body.scrollTop + padBottom + borderBottom;
  return measureCard(root, natural, body.scrollTop);
}

/** Reads every `[data-card-id]` card inside the measure container, in document order. */
export function measureCards(container: ParentNode): MeasuredCard[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]')).map((root) => measureCard(root));
}
