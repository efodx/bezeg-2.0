import type {DemonstrationId} from './demonstrations';

/**
 * Demonstrations registered before their catalog poster is captured. Their cards render the preview frame without an
 * image. Remove an id when its capture lands in src/demonstrationPreviewAssets.ts; the unit test and the browser smoke
 * catalog (tests/smoke-catalog.cjs, which parses this array literal) both fail on a stale entry.
 */
// triangle-solver, line-geometry, isometries, prob-simulation, curve-kinematics, mechanics-descent, recursion-cobweb, phase-portrait, solids, contour-map, complex-power and complex-euler: media is families-prep F5.
export const POSTER_PENDING: readonly DemonstrationId[] = ['triangle-solver', 'line-geometry', 'isometries', 'prob-simulation', 'curve-kinematics', 'mechanics-descent', 'recursion-cobweb', 'phase-portrait', 'solids', 'contour-map', 'complex-power', 'complex-euler'];
