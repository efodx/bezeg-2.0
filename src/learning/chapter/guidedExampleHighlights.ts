/**
 * Authored highlight recipes for guided-example card media (docs/specs/guided-example-highlights.md H2-H4).
 *
 * This is the single source of truth for how a card image is reached beyond the example's start scene. It is
 * keyed by the guided example id (`retainedExampleHomes` key or a patch example id) and read by
 * `scripts/generate-guided-example-inventory.cjs`, which resolves frame ids against the example's own lesson,
 * copies the recipe into the capture inventory, and fingerprints it. An example with no entry here is captured
 * at its start scene; the generator writes that choice into the inventory as an explicit `{kind: 'start'}` recipe.
 *
 * Steps reuse what the guided lesson already offers a learner, applied in order after the example prepared its
 * scene, so a recipe cannot reach a state a learner could not reach:
 * - `goto-frame` moves to a frame of the same lesson with the previous/next navigation (forward or back).
 * - `frame-action` presses the authored action button of the current frame (`LessonFrame.action`, or the step
 *   action it inherits); the lesson session applies that frame's scene and action exactly as for a learner.
 */

/** Pure data: the recipe never holds functions, so it can be fingerprinted and stored in the manifest. */
export type HighlightStep =
    | {readonly kind: 'goto-frame'; readonly frame: string}
    | {readonly kind: 'frame-action'};

/** Expected geometry of the highlight state, in the vocabulary of the inventory `expected` checks. */
export interface HighlightChecks {
    /** Exact visible element count per JSXGraph element type, for example `{curve: 2, point: 6}`. */
    readonly types?: Readonly<Record<string, number>>;
    /** Visible curve plus function-graph count. */
    readonly curveCount?: number;
    /** Points that must be visible, as `[x, y]`. */
    readonly points?: readonly (readonly [number, number])[];
    /** Curves that must be visible, each as samples at parameter 0, 0.5 and 1 in `[x, y]`. */
    readonly curves?: readonly (readonly [readonly [number, number], readonly [number, number], readonly [number, number]])[];
}

export type HighlightRecipe =
    /** Explicitly keep the start scene (first frame, nothing applied). */
    | {readonly kind: 'start'}
    | {
        readonly kind: 'highlight';
        /** Target frame id of the example's lesson, reached before `steps` run. */
        readonly frame: string;
        /** Ordered steps applied after reaching `frame`; may be empty when the frame itself is the highlight. */
        readonly steps: readonly HighlightStep[];
        /** `true`: the board must differ from the start scene (capture fails otherwise); `false`: it must be unchanged. */
        readonly expectChange: boolean;
        /** Required, nonempty: geometry that must hold on the board in the highlight state. */
        readonly checks: HighlightChecks;
    };

/** Recipes by guided example id. Empty until the sample recipes are authored (task 01 part B). */
export const guidedExampleHighlightRecipes: Readonly<Record<string, HighlightRecipe>> = {};
