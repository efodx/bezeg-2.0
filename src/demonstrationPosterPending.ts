import type {DemonstrationId} from './demonstrations';

/**
 * Demonstrations registered before their catalog poster is captured. Their cards render the preview frame without an
 * image. Remove an id when its capture lands in src/demonstrationPreviewAssets.ts; the unit test and the browser smoke
 * catalog (tests/smoke-catalog.cjs, which parses this array literal) both fail on a stale entry.
 */
export const POSTER_PENDING: readonly DemonstrationId[] = ['linear-map', 'complex-reciprocal', 'complex-roots', 'triangle-centres', 'inscribed-angle', 'orientation', 'polygon-area', 'convex-hull',
    'ear-clipping', 'interval-sweep', 'segment-intersections', 'curve-parametric', 'curve-curvature', 'interp-lagrange', 'interp-hermite', 'interp-subdivision', 'patch-coons',
    'projective-cross-ratio', 'projective-pascal', 'projective-pole-polar'];
