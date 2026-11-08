import type {DemonstrationId} from './demonstrations';

/** Why a Demonstration has no catalog clip yet. */
const NOT_CAPTURED = 'The lesson-guided clip is not captured yet (docs/specs/lesson-guided-catalog-clips.md).';

/**
 * Demonstrations that have no catalog clip in src/demonstrationMotionAssets.ts yet, each with the reason. Their cards
 * show the poster only. Remove an entry when its clip lands; the unit test in src/demonstrationMotionAssets.test.ts
 * fails on a Demonstration with neither a clip nor an entry, and on a duplicate, unknown or stale entry.
 */
export const MOTION_PENDING: readonly {readonly id: DemonstrationId; readonly reason: string}[] = [
    {id: 'bezier-clipping', reason: NOT_CAPTURED},
    {id: 'bspline-insertion', reason: NOT_CAPTURED},
    {id: 'bspline-nurbs', reason: NOT_CAPTURED},
    {id: 'geometric-series', reason: NOT_CAPTURED},
    {id: 'root-finding', reason: NOT_CAPTURED},
    {id: 'linear-map', reason: NOT_CAPTURED},
    {id: 'inversion', reason: NOT_CAPTURED},
    {id: 'point-in-polygon', reason: NOT_CAPTURED},
    {id: 'hull-robustness', reason: NOT_CAPTURED},
    {id: 'ear-clipping', reason: NOT_CAPTURED},
    {id: 'projective-pascal', reason: NOT_CAPTURED},
];
