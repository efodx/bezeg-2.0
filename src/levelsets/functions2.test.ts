import { describe, expect, it } from 'vitest';
import { CATALOGUE, CATALOGUE_IDS, isCatalogueId } from './functions2';

/** Deterministic pseudo-random numbers in [0,1) (test only). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('catalogue', () => {
  it('is the closed id list with the windows of the spec', () => {
    expect([...CATALOGUE_IDS]).toEqual(['bowl', 'saddle', 'valley', 'hills', 'product']);
    expect(CATALOGUE.hills.window).toEqual({ xMin: -4, xMax: 4, yMin: -4, yMax: 4 });
    for (const id of ['bowl', 'saddle', 'valley', 'product'] as const) {
      expect(CATALOGUE[id].window).toEqual({ xMin: -2, xMax: 2, yMin: -2, yMax: 2 });
    }
    expect(isCatalogueId('bowl')).toBe(true);
    expect(isCatalogueId('x^2')).toBe(false);
  });

  it('has the spec values', () => {
    expect(CATALOGUE.bowl.value(3, 4)).toBe(25);
    expect(CATALOGUE.saddle.value(3, 4)).toBe(-7);
    expect(CATALOGUE.valley.value(1, 2)).toBe(41);
    expect(CATALOGUE.product.value(-2, 3)).toBe(-6);
    expect(CATALOGUE.hills.value(1, 2)).toBeCloseTo(Math.sin(1) * Math.sin(2), 15);
  });

  it('has the spec gradients at the checked points', () => {
    expect(CATALOGUE.bowl.gradient(0.6, 0.8)).toEqual([1.2, 1.6]);
    const [gx, gy] = CATALOGUE.hills.gradient(1, 1);
    expect(gx).toBeCloseTo(0.4546487, 7);
    expect(gy).toBeCloseTo(0.4546487, 7);
  });

  for (const id of CATALOGUE_IDS) {
    it(`${id}: analytic gradient matches a central difference (h = 1e-5) within 1e-9`, () => {
      const fn = CATALOGUE[id];
      const rand = lcg(12345);
      const h = 1e-5;
      const { xMin, xMax, yMin, yMax } = fn.window;
      let worst = 0;
      for (let k = 0; k < 1000; k += 1) {
        const x = xMin + (xMax - xMin) * rand();
        const y = yMin + (yMax - yMin) * rand();
        const [gx, gy] = fn.gradient(x, y);
        const nx = (fn.value(x + h, y) - fn.value(x - h, y)) / (2 * h);
        const ny = (fn.value(x, y + h) - fn.value(x, y - h)) / (2 * h);
        worst = Math.max(worst, Math.abs(gx - nx), Math.abs(gy - ny));
      }
      expect(worst).toBeLessThan(1e-9);
    });
  }
});
