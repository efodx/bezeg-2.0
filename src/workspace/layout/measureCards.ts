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

function measureCard(root: HTMLElement, liveNaturalHeight?: number, scrolled = 0): MeasuredCard {
  const box = root.getBoundingClientRect();
  const head = root.querySelector<HTMLElement>('[data-card-head]');
  const foldedHeight = head ? head.getBoundingClientRect().height : 0;
  const rowBreaks: number[] = [];
  let last = -Infinity;
  root.querySelectorAll<HTMLElement>('[data-card-row]').forEach((row) => {
    // Cumulative bottoms relative to the card top; keep them ascending.
    const bottom = Math.max(row.getBoundingClientRect().bottom - box.top + scrolled, last);
    rowBreaks.push(bottom);
    last = bottom;
  });
  const natural = {w: box.width, h: liveNaturalHeight ?? box.height};
  const minH = rowBreaks.length > 0 ? Math.max(rowBreaks[0], foldedHeight) : DEFAULT_MIN_HEIGHT;
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
