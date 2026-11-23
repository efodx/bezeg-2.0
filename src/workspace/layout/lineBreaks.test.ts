import {describe, expect, it} from 'vitest';
import {lineBreaksOf, measureCards} from './measureCards';

function rect(top: number, height: number, width = 200) {
  return () => ({top, bottom: top + height, height, width, left: 0, right: width, x: 0, y: top, toJSON: () => ({})}) as DOMRect;
}

describe('line breaks inside a text block', () => {
  const r = (top: number, bottom: number) => ({top, bottom});

  it('puts a break in the middle of the gap after each line and ends at the block bottom', () => {
    expect(lineBreaksOf([r(0, 18), r(24, 42), r(48, 66)], 70)).toEqual([21, 45, 70]);
  });

  it('groups boxes that overlap vertically into one line (inline math taller than the text, nested spans)', () => {
    expect(lineBreaksOf([r(0, 18), r(-4, 22), r(5, 15), r(30, 48)], 50)).toEqual([26, 50]);
  });

  it('keeps stacked lines whose boxes only touch apart, and a display formula is its own line', () => {
    expect(lineBreaksOf([r(0, 20), r(20, 40), r(44, 90)], 90)).toEqual([20, 42, 90]);
  });

  it('does not chain lines together through inline math that touches the next line box', () => {
    const text = [r(0, 18), r(24, 42), r(48, 66), r(72, 90)];
    const math = [r(-3, 21), r(21, 45), r(45, 69), r(69, 93)];
    expect(lineBreaksOf([...text, ...math], 93)).toEqual([21, 45, 69, 93]);
  });

  it('offers no cut between two lines whose boxes overlap deeply (a tall formula spills into the next line)', () => {
    expect(lineBreaksOf([r(0, 18), r(-10, 40), r(24, 42), r(48, 66)], 66)).toEqual([45, 66]);
  });

  it('is one break at the block bottom when no line boxes are reported', () => {
    expect(lineBreaksOf([], 55)).toEqual([55]);
  });

  it('cuts a data-card-lines row at its lines in card coordinates and keeps other rows atomic', () => {
    const root = document.createElement('div');
    root.innerHTML = `<div data-card-id="a"><div data-card-head></div><div data-card-row id="c"></div>
      <p data-card-row data-card-lines id="p">text</p></div>`;
    const set = (sel: string, fn: () => DOMRect) => { root.querySelector(sel)!.getBoundingClientRect = fn; };
    set('[data-card-id]', rect(100, 300)); set('[data-card-head]', rect(100, 30)); set('#c', rect(130, 50)); set('#p', rect(190, 72));
    const lines = [{top: 190, bottom: 208}, {top: 214, bottom: 232}, {top: 238, bottom: 256}];
    const original = Range.prototype.getClientRects;
    Range.prototype.getClientRects = () => lines as unknown as DOMRectList;
    try {
      const [card] = measureCards(root);
      expect(card.rowBreaks).toEqual([80, 111, 135, 162]);
    } finally { Range.prototype.getClientRects = original; }
  });
});
