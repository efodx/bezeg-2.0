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

function measureCard(root: HTMLElement): MeasuredCard {
  const box = root.getBoundingClientRect();
  const head = root.querySelector<HTMLElement>('[data-card-head]');
  const foldedHeight = head ? head.getBoundingClientRect().height : 0;
  const rowBreaks: number[] = [];
  let last = -Infinity;
  root.querySelectorAll<HTMLElement>('[data-card-row]').forEach((row) => {
    // Cumulative bottoms relative to the card top; keep them ascending.
    const bottom = Math.max(row.getBoundingClientRect().bottom - box.top, last);
    rowBreaks.push(bottom);
    last = bottom;
  });
  const natural = {w: box.width, h: box.height};
  const minH = rowBreaks.length > 0 ? Math.max(rowBreaks[0], foldedHeight) : DEFAULT_MIN_HEIGHT;
  return {
    id: root.dataset.cardId ?? '',
    natural,
    min: {w: natural.w, h: Math.min(minH, natural.h)},
    foldedHeight,
    rowBreaks,
  };
}

/** Reads every `[data-card-id]` card inside the measure container, in document order. */
export function measureCards(container: ParentNode): MeasuredCard[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]')).map(measureCard);
}
