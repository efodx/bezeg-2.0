import type {DemonstrationId} from './demonstrations';

/**
 * Demonstrations registered before their catalog poster is captured. Their cards render the preview frame without an
 * image. Remove an id when its capture lands in src/demonstrationPreviewAssets.ts; the unit test and the browser smoke
 * catalog (tests/smoke-catalog.cjs, which parses this array literal) both fail on a stale entry.
 */
// unit-circle, triangle-solver, line-geometry, isometries, circle-construction, lattice-paths, counting-tree, prob-simulation and curve-kinematics: media is families-prep F5.
export const POSTER_PENDING: readonly DemonstrationId[] = ['unit-circle', 'triangle-solver', 'line-geometry', 'isometries', 'circle-construction', 'lattice-paths', 'counting-tree', 'prob-simulation', 'curve-kinematics'];
