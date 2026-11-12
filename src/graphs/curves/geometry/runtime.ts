import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {CurveGeometryDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the curve geometry family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const curveGeometryGraphLoaders = {
    'curve-parametric': () => import('../parametric/ParametricCurveGraph').then(m => () => new m.default()),
    'curve-curvature': () => import('../bezier/CurvatureBezierCurveGraph').then(m => () => new m.default()),
    'curve-comb': () => import('../comb/CurveCombGraph').then(m => () => new m.default()),
    'curve-evolute': () => import('../bezier/CurveEvoluteGraph').then(m => () => new m.default()),
    'curve-offset': () => import('../offset/CurveOffsetGraph').then(m => () => new m.default()),
    'curve-envelope': () => import('../envelope/CurveEnvelopeGraph').then(m => () => new m.default()),
} as const satisfies Record<CurveGeometryDemonstrationId, GraphLoader>;
