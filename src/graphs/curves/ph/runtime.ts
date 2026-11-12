import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {PhDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the PH family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const phGraphLoaders = {
    'ph-cubic': () => import('./CubicPhBezierCurveGraph').then(m => () => new m.default()),
    'ph-quintic': () => import('./QuinticPhBezierCurveGraph').then(m => () => new m.default()),
} as const satisfies Record<PhDemonstrationId, GraphLoader>;
