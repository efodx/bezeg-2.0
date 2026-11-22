import {describe, expect, it} from 'vitest';
import {measureCards} from './measureCards';

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
    expect(c.min).toEqual({w: 200, h: 80});
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
