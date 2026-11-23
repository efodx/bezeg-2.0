import {describe, expect, it} from 'vitest';
import {layoutBoard} from './boardLayout';
import {measureCards, measureLiveCard} from './measureCards';

function rect(top: number, height: number, width = 200) {
  return () => ({top, bottom: top + height, height, width, left: 0, right: width, x: 0, y: top, toJSON: () => ({})}) as DOMRect;
}

function build(html: string, rects: Record<string, ReturnType<typeof rect>>): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  Object.entries(rects).forEach(([sel, fn]) => {
    root.querySelector(sel)!.getBoundingClientRect = fn;
  });
  return root;
}

describe('measureCards', () => {
  const html = `<div data-card-id="a"><div data-card-head></div>
    <div data-card-row id="r1"></div><div data-card-row id="r2"></div></div>`;

  it('reads natural size, folded height, min and ascending rowBreaks', () => {
    const root = build(html, {
      '[data-card-id]': rect(100, 220),
      '[data-card-head]': rect(100, 30),
      '#r1': rect(130, 50),
      '#r2': rect(180, 40),
    });
    const [c] = measureCards(root);
    expect(c.id).toBe('a');
    expect(c.natural).toEqual({w: 200, h: 220});
    expect(c.foldedHeight).toBe(30);
    expect(c.rowBreaks).toEqual([80, 120]);
    expect(c.min).toEqual({w: 200, h: 80 + 29});
  });

  it('uses 100px min without rows, capped by natural height', () => {
    const root = build('<div data-card-id="b"><div data-card-head></div></div>', {
      '[data-card-id]': rect(0, 60),
      '[data-card-head]': rect(0, 30),
    });
    const [c] = measureCards(root);
    expect(c.rowBreaks).toEqual([]);
    expect(c.min.h).toBe(60);
    const tall = build('<div data-card-id="b"></div>', {'[data-card-id]': rect(0, 300)});
    expect(measureCards(tall)[0].min.h).toBe(100);
  });
});

// Orodja has no `data-card-row` markers (its panels belong to the graphs): a cut fell to min.h (the heading) and the card
// showed one line and the "Več" bar. Its blocks are the places a cut may fall.
describe('measureLiveCard blocks', () => {
  const html = `<div data-card-id="tools"><div data-card-head></div>
    <div data-card-body><div data-card-blocks>
      <section id="hiddenSection" hidden><p id="h1"></p></section>
      <section id="shown"><div id="wrap" style="display: contents">
        <div id="g1"></div><div id="g2"></div>
        <div id="big"><p id="b1"></p><p id="b2"></p></div><div id="empty"></div>
      </div></section>
    </div></div></div>`;
  const rects = {
    '[data-card-id]': rect(100, 600), '[data-card-head]': rect(100, 40), '[data-card-body]': rect(140, 560),
    '[data-card-blocks]': rect(140, 560), '#shown': rect(140, 560), '#g1': rect(140, 60), '#g2': rect(200, 70),
    '#big': rect(270, 300), '#b1': rect(270, 150), '#b2': rect(420, 150), '#empty': rect(570, 0),
  };

  it('takes rowBreaks at the bottoms of the shown top-level blocks, splitting tall ones and skipping hidden and empty ones', () => {
    const root = build(html, rects);
    const c = measureLiveCard(root.firstElementChild as HTMLElement);
    expect(c.rowBreaks).toEqual([100, 170, 320, 470]);
  });

  it('min is the head and the first block, but at least a body of 100 px and the bar', () => {
    const root = build(html, rects);
    const c = measureLiveCard(root.firstElementChild as HTMLElement);
    // first block bottom 100 + bar 29 = 129 < head 40 + 100 + bar 29 = 169
    expect(c.min.h).toBe(169);
  });

  it('lets a column cut the card at a block instead of at its minimum', () => {
    const root = build(html, rects);
    const c = measureLiveCard(root.firstElementChild as HTMLElement);
    const placed = layoutBoard({
      board: {w: 800, h: 400}, cards: [{...c, priority: 1, defaultAnchor: 'tr', defaultOrder: 0, reserve: 29}],
      stored: {}, storedFolds: {}, maxSpan: 1, columnMaxFraction: 0.4, gap: 8,
    }).cards[0];
    expect(placed.cut).toBe(320 + 29); // the largest block that fits above the bar (room 384 - 29), never the 169 minimum
  });
});
