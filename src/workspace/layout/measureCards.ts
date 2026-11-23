// Pure DOM reading for the board layout (design: docs/reviews/ux-picks-app-wide/03-layout-design.md).
//
// Markup contract for a measured card, rendered open at unconstrained height:
//   card root   data-card-id="<id>"
//   head        data-card-head   (the folded bar; its height is foldedHeight)
//   rows        data-card-row    (the smallest units a cut may fall between; `data-card-lines` on a row also allows a cut after each of its text lines)
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

export type LineRect = {top: number; bottom: number};

/** Two lines whose boxes overlap by no more than this (px) still take a cut between them; a deeper overlap is one unbreakable stretch. */
const LINE_OVERLAP_TOLERANCE = 3;

/**
 * The places a cut may fall inside one text block: after each of its lines. `rects` are the boxes of the block's text and inline
 * elements (a Range's client rects, a formula's box), in the block's own coordinates. A box belongs to the line whose first box has a
 * centre within 0.6 of a typical box height of its own, so inline math taller than the text stays on its line even where it overlaps
 * the next line's box; a display formula or block-level box is its own line. A break is the middle of the gap to the next line (so the
 * cut keeps the line's descenders); where two lines overlap deeper than a hair there is none between them. The last break is `blockBottom`.
 */
export function lineBreaksOf(rects: readonly LineRect[], blockBottom: number): number[] {
  const boxes = rects.filter((r) => r.bottom > r.top).sort((a, b) => (a.top + a.bottom) - (b.top + b.bottom));
  const heights = boxes.map((r) => r.bottom - r.top).sort((a, b) => a - b);
  const threshold = 0.6 * (heights[Math.floor(heights.length / 2)] ?? 0);
  const lines: (LineRect & {centre: number})[] = [];
  boxes.forEach((r) => {
    const centre = (r.top + r.bottom) / 2;
    const line = lines[lines.length - 1];
    if (line && centre - line.centre <= threshold) { line.top = Math.min(line.top, r.top); line.bottom = Math.max(line.bottom, r.bottom); }
    else lines.push({top: r.top, bottom: r.bottom, centre});
  });
  const breaks: number[] = [];
  lines.slice(0, -1).forEach((line, i) => {
    const next = lines[i + 1];
    if (line.bottom <= next.top) breaks.push((line.bottom + next.top) / 2);
    else if (line.bottom - next.top <= LINE_OVERLAP_TOLERANCE) breaks.push(line.bottom);
  });
  breaks.push(Math.max(blockBottom, lines.length > 0 ? lines[lines.length - 1].bottom : blockBottom));
  return breaks;
}

/** Client rects of a text block's content (its text, and the inline and display elements in it) when the browser can report them. */
function textLineRects(row: HTMLElement): LineRect[] {
  if (typeof document.createRange !== 'function') return [];
  const range = document.createRange();
  range.selectNodeContents(row);
  const rects = typeof range.getClientRects === 'function' ? Array.from(range.getClientRects()) : [];
  // A MathJax formula is one box, whatever its internal glyph boxes report.
  const formulas = Array.from(row.querySelectorAll<HTMLElement>('mjx-container')).map((el) => el.getBoundingClientRect());
  const insideFormula = (r: DOMRect) => formulas.some((f) => r.top >= f.top - 0.5 && r.bottom <= f.bottom + 0.5 && r.left >= f.left - 0.5 && r.right <= f.right + 0.5);
  return [...rects.filter((r) => !insideFormula(r)), ...formulas].map((r) => ({top: r.top, bottom: r.bottom}));
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
    // A text block (`data-card-lines`) may be cut after any of its lines; anything else is one atomic row.
    if (row.hasAttribute('data-card-lines')) {
      const offset = scrolled - box.top;
      const lineRects = textLineRects(row).map((r) => ({top: r.top + offset, bottom: r.bottom + offset}));
      lineBreaksOf(lineRects, bottom).forEach((b) => { const at = Math.max(Math.min(b, bottom), last); rowBreaks.push(at); last = at; });
      return;
    }
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
