import {describe, expect, it} from 'vitest';
import {measureSlot} from './measureSlot';

const slot = (offset: {w: number; h: number}, box: {w: number; h: number}): HTMLElement => {
  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetWidth', {value: offset.w});
  Object.defineProperty(element, 'offsetHeight', {value: offset.h});
  element.getBoundingClientRect = () => ({width: box.w, height: box.h}) as DOMRect;
  return element;
};

describe('measureSlot', () => {
  it('rounds a sub-pixel width up, so the strip is given a width its slots fit in (inverse lesson: 150.14 + 120 + 120)', () => {
    expect(measureSlot(slot({w: 150, h: 79}, {w: 150.140625, h: 79}))).toEqual({w: 151, h: 79});
  });
  it('keeps whole sizes and reads an element without layout as 0', () => {
    expect(measureSlot(slot({w: 120, h: 79}, {w: 120, h: 79}))).toEqual({w: 120, h: 79});
    expect(measureSlot(slot({w: 0, h: 0}, {w: 600, h: 400}))).toEqual({w: 0, h: 0});
  });
});
