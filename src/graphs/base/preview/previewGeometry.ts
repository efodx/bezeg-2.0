/**
 * Parameter previews (task 06, ADR 0067): a graph draws what its main curves would look like at another value of a
 * `previewable` parameter by a pure function of a scene snapshot, never by changing the live graph. Types only, no React or
 * JSXGraph.
 */
import type {Preset} from '../presets/Presets';
import type {Path} from './paths';

/** The main curves of a preview by name, in board coordinates; a curve with gaps is several paths. */
export type PreviewCurves = Record<string, Path[]>;

/** The x range a function preview draws over (a function graph samples the board's visible box widened, see {@link sampledRange}). */
export interface PreviewView {
    readonly left: number;
    readonly right: number;
}

/**
 * The x range JSXGraph samples a function graph over for a visible box `[left, top, right, bottom]`: the box widened by 10% of
 * its width on each side (observed: a box of width 10.5 gives points over 12.6), so the curve has no gap at the board's edge
 * while panning.
 */
export const sampledRange = (box: readonly number[]): PreviewView => {
    const margin = 0.1 * (box[2] - box[0]);
    return {left: box[0] - margin, right: box[2] + margin};
};

/**
 * The curves at `value` of the parameter `key` (the parameter's own units, as its binding reads them). `scene.preset` is
 * `exportPreset()` read once when a preview starts (part of a curve graph's scene lives on the board, not in the state);
 * the function is pure: it neither reads a board nor writes anything.
 */
export type PreviewGeometry<State = unknown> = (scene: {readonly state: State; readonly preset: Preset}, key: string, value: number, view: PreviewView) => PreviewCurves;
