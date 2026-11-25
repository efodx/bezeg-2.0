/** A strip slot's size in whole pixels, rounded up. `offsetWidth` rounds 150.14 down to 150: the layout then gives the strip a width its
 *  slots do not fit in, and the browser wraps a row the layout counted as one (the strip rose over the lesson card). Only the sub-pixel
 *  remainder is added: an element with no layout (offset 0) is 0 x 0, and a box more than a pixel off the offset size is not trusted. */
export function measureSlot(slot: HTMLElement): {w: number; h: number} {
  const box = slot.getBoundingClientRect();
  const up = (rounded: number, exact: number): number => (rounded > 0 && exact > rounded && exact - rounded < 1 ? Math.ceil(exact - 1e-6) : rounded);
  return {w: up(slot.offsetWidth, box.width), h: up(slot.offsetHeight, box.height)};
}
