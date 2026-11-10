/**
 * Function catalogue for the level-sets lessons (level-sets spec, Kernels item 1).
 *
 * A closed list of ids, each with its value, analytic gradient and window. There
 * is no formula parser. The gradients are analytic; a numerical central
 * difference exists only as the test oracle and never in a learner-visible number.
 */

export const CATALOGUE_IDS = ['bowl', 'saddle', 'valley', 'hills', 'product'] as const;

export type CatalogueId = (typeof CATALOGUE_IDS)[number];

export interface Window2 {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export type Gradient2 = readonly [number, number];

export interface CatalogueFunction {
  readonly id: CatalogueId;
  readonly value: (x: number, y: number) => number;
  /** Analytic gradient \(\nabla f=(f_x,f_y)\). */
  readonly gradient: (x: number, y: number) => Gradient2;
  readonly window: Window2;
}

const SQUARE_2: Window2 = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
const SQUARE_4: Window2 = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };

export const CATALOGUE: Readonly<Record<CatalogueId, CatalogueFunction>> = {
  // x^2 + y^2
  bowl: {
    id: 'bowl',
    value: (x, y) => x * x + y * y,
    gradient: (x, y) => [2 * x, 2 * y],
    window: SQUARE_2,
  },
  // x^2 - y^2
  saddle: {
    id: 'saddle',
    value: (x, y) => x * x - y * y,
    gradient: (x, y) => [2 * x, -2 * y],
    window: SQUARE_2,
  },
  // x^2 + 10 y^2
  valley: {
    id: 'valley',
    value: (x, y) => x * x + 10 * y * y,
    gradient: (x, y) => [2 * x, 20 * y],
    window: SQUARE_2,
  },
  // sin x sin y
  hills: {
    id: 'hills',
    value: (x, y) => Math.sin(x) * Math.sin(y),
    gradient: (x, y) => [Math.cos(x) * Math.sin(y), Math.sin(x) * Math.cos(y)],
    window: SQUARE_4,
  },
  // x y
  product: {
    id: 'product',
    value: (x, y) => x * y,
    gradient: (x, y) => [y, x],
    window: SQUARE_2,
  },
};

export function isCatalogueId(value: unknown): value is CatalogueId {
  return typeof value === 'string' && (CATALOGUE_IDS as readonly string[]).includes(value);
}
