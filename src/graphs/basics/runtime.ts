import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {BasicsDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the basics family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const basicsGraphLoaders = {
    bernstein: () => import('../bernstein/BernsteinGraph').then(m => () => new m.BernsteinGraph()),
    'complex-multiplication': () => import('../complex/ComplexMultiplicationGraph').then(m => () => new m.ComplexMultiplicationGraph()),
} as const satisfies Record<BasicsDemonstrationId, GraphLoader>;
