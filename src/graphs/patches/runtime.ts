import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {PatchesDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the patches family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const patchesGraphLoaders = {
    'patch-tensor': () => import('./TensorPatchGraph').then(m => () => new m.default()),
    'patch-decasteljau': () => import('./TensorDeCasteljauGraph').then(m => () => new m.default()),
    'patch-derivatives': () => import('./TensorDerivativesGraph').then(m => () => new m.default()),
    'patch-subdivision': () => import('./TensorSubdivisionGraph').then(m => () => new m.default()),
    'patch-joins': () => import('./TensorJoinGraph').then(m => () => new m.default()),
    'patch-triangular': () => import('./TriangularPatchGraph').then(m => () => new m.default()),
    'patch-coons': () => import('./CoonsPatchGraph').then(m => () => new m.default()),
} as const satisfies Record<PatchesDemonstrationId, GraphLoader>;
