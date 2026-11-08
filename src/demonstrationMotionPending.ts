import type {DemonstrationId} from './demonstrations';

/**
 * Demonstrations that have no catalog clip in src/demonstrationMotionAssets.ts yet, each with the reason. Their cards
 * show the poster only. Remove an entry when its clip lands; the unit test in src/demonstrationMotionAssets.test.ts
 * fails on a Demonstration with neither a clip nor an entry, and on a duplicate, unknown or stale entry.
 */
export const MOTION_PENDING: readonly {readonly id: DemonstrationId; readonly reason: string}[] = [
    {id: 'ear-clipping', reason: 'No motion is possible: the poster is step 12 of the 12-step trace and the trace has no Back control (docs/specs/lesson-guided-catalog-clips.md).'},
    {id: 'projective-pascal', reason: 'Its steppers show no table index to read back; waits for a readout in PascalControls.tsx from the Controls stream (docs/tasks/feature-streams/controls.md).'},
];
