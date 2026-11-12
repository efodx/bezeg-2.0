import type {DemonstrationId} from './demonstrations';

/**
 * Demonstrations that have no catalog clip in src/demonstrationMotionAssets.ts yet, each with the reason. Their cards
 * show the poster only. Remove an entry when its clip lands; the unit test in src/demonstrationMotionAssets.test.ts
 * fails on a Demonstration with neither a clip nor an entry, and on a duplicate, unknown or stale entry.
 */
export const MOTION_PENDING: readonly {readonly id: DemonstrationId; readonly reason: string}[] = [
    {id: 'ear-clipping', reason: 'No motion is possible: the poster is step 12 of the 12-step trace and the trace has no Back control (docs/specs/lesson-guided-catalog-clips.md).'},
    {id: 'projective-pascal', reason: 'Its steppers show no table index to read back; waits for a readout in PascalControls.tsx from the Controls stream (docs/tasks/feature-streams/controls.md).'},
    {id: 'unit-circle', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-trig.md).'},
    {id: 'triangle-solver', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-trig.md).'},
    {id: 'line-geometry', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-lines-isometries.md).'},
    {id: 'isometries', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-lines-isometries.md).'},
    {id: 'circle-construction', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md).'},
    {id: 'lattice-paths', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md).'},
    {id: 'counting-tree', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md).'},
    {id: 'prob-simulation', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-random-kinematics.md).'},
    {id: 'curve-kinematics', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-random-kinematics.md).'},
    {id: 'recursion-cobweb', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-recursion-waves.md).'},
    {id: 'recursion-growth', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-recursion-waves.md).'},
    {id: 'mechanics-descent', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-mechanics-phase.md).'},
    {id: 'phase-portrait', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-mechanics-phase.md).'},
    {id: 'logistic-map', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-mechanics-phase.md).'},
    {id: 'solids', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-solids-levelsets.md).'},
    {id: 'contour-map', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-solids-levelsets.md).'},
    {id: 'linear-program', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-solids-levelsets.md).'},
    {id: 'waves', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-recursion-waves.md).'},
    {id: 'complex-power', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-complex-linear.md).'},
    {id: 'complex-euler', reason: 'Newly registered; its clip waits for the lesson family media pass (docs/reviews/feature-streams/families-prep/notes/f2b-complex-linear.md).'},
];
