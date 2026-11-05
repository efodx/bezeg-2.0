import type {DemonstrationId} from './demonstrations';

/**
 * Demonstrations registered before their catalog poster is captured. Their cards render the preview frame without an
 * image. Remove an id when its capture lands in src/demonstrationPreviewAssets.ts; the unit test and the browser smoke
 * catalog (tests/smoke-catalog.cjs, which parses this array literal) both fail on a stale entry.
 */
export const POSTER_PENDING: readonly DemonstrationId[] = ['bezier-hulls'];
