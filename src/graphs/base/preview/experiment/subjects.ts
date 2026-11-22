/**
 * Preview experiment (task 02 slice 5a, options A and B of docs/specs/parameter-writes.md "Previews"): for Taylor, De Casteljau
 * and the phase portrait, what the main curve(s) look like at another parameter value.
 *
 * Both options start from a *scene snapshot*, which is `graph.exportPreset()` of the live graph and not `graph.state`: part of
 * a curve graph's scene lives in board objects outside the state (De Casteljau's control points), and a preset export reads
 * them from the board. Option A reads the snapshot and computes the paths with pure math; option B loads it into a hidden
 * shadow graph (`shadowBoard.ts`) and reads the paths the shadow's board drew.
 *
 * Experiment code: no graph class imports it, and no graph class was changed for it (the shadow reads protected members by
 * element access, as `curveGraphTestAccess.ts` does).
 */
import type BaseGraph from '../../BaseGraph';
import type {BaseGraphState} from '../../BaseGraph';
import type {Preset} from '../../presets/Presets';
import {TaylorGraph} from '../../../functions/TaylorGraph';
import DecasteljauGraph from '../../../curves/bezier/DecasteljauGraph';
import {PhasePortraitGraph} from '../../../dynamics/PhasePortraitGraph';
import {evaluateTaylorCoefficients, taylorCoefficients, taylorExample} from '../../../../analysis/taylor';
import type {TaylorModel} from '../../../../analysis/taylorModel';
import {bezierPoint} from '../../../curves/bezier/affineTrack';
import {derivePhase, serializePhaseState, type PhaseState} from '../../../../dynamics/phaseModel';
import {curvePaths, type Path} from './paths';

/** The main curves of a preview, by name (every subject names the same curves in A and B). */
export type PreviewPaths = Record<string, Path[]>;

/** The visible x range a function preview draws over (a function graph samples the board's visible box). */
export interface PreviewView {
    readonly left: number;
    readonly right: number;
}

/**
 * The x range JSXGraph samples a function graph over for a visible box: the box widened by 10% of its width on each side
 * (observed: a box of width 10.5 gives points over 12.6), so the curve has no gap at the board's edge while panning.
 */
export const sampledRange = (box: readonly number[]): PreviewView => {
    const margin = 0.1 * (box[2] - box[0]);
    return {left: box[0] - margin, right: box[2] + margin};
};

export interface PreviewSubject {
    readonly id: 'taylor' | 'decasteljau' | 'phase-portrait';
    /** The previewed parameter, as the user would name it. */
    readonly parameter: string;
    /** Values to preview (the sweep of the measurement). */
    readonly values: readonly number[];
    create(): BaseGraph<BaseGraphState>;
    /** A copy of the snapshot with the parameter set: a plain data edit, nothing is applied to a live graph. */
    withValue(snapshot: Preset, value: number): Preset;
    /** Option B: the paths the (shadow) graph has drawn now. */
    readPaths(graph: BaseGraph<BaseGraphState>): PreviewPaths;
    /** Option A: the same paths from the snapshot alone, without a board. */
    geometry(snapshot: Preset, value: number, view: PreviewView): PreviewPaths;
}

const samples = 400;

// ---- Taylor: the parameter is the degree n; the main curves are f and T_n --------------------------------------------------

const taylor: PreviewSubject = {
    id: 'taylor',
    parameter: 'degree',
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    create: () => new TaylorGraph() as unknown as BaseGraph<BaseGraphState>,
    withValue: (snapshot, value) => ({...snapshot, data: {...(snapshot.data as TaylorModel), degree: value}}),
    readPaths: graph => {
        const drawn = (graph as unknown as TaylorGraph)['drawn'];
        return {function: curvePaths(drawn.get('function')), polynomial: curvePaths(drawn.get('polynomial'))};
    },
    geometry: (snapshot, value, view) => {
        const model = {...(snapshot.data as TaylorModel), degree: value};
        const example = taylorExample(model.example);
        const coefficients = taylorCoefficients(example, model.center, model.degree);
        const f: Path = [];
        const polynomial: Path = [];
        for (let i = 0; i <= samples; i++) {
            const x = view.left + ((view.right - view.left) * i) / samples;
            // As TaylorGraph draws it: 1/(1 - x) only exists left of 1.
            const y = model.example === 'geometric' && x >= 1 ? NaN : example.value(x);
            if (Number.isFinite(y)) f.push([x, y]);
            const p = evaluateTaylorCoefficients(coefficients, x - model.center);
            if (Number.isFinite(p)) polynomial.push([x, p]);
        }
        return {function: [f], polynomial: [polynomial]};
    },
};

// ---- De Casteljau: the parameter is t; the main curve is the Bezier curve from 0 to t -----------------------------------------

type CurveEntry = readonly [string, {points: Array<[number, number]>; state?: {decasteljauT?: number}}];

/** The control points are part of `snapshot.data` only because the preset export reads them from the board objects. */
const controlPoints = (snapshot: Preset): Array<[number, number]> => (snapshot.data as readonly CurveEntry[])[0][1].points;

const decasteljau: PreviewSubject = {
    id: 'decasteljau',
    parameter: 't',
    values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    create: () => new DecasteljauGraph() as unknown as BaseGraph<BaseGraphState>,
    withValue: (snapshot, value) => {
        const data = (snapshot.data as readonly CurveEntry[]).map(([type, dto], index): CurveEntry =>
            index === 0 ? [type, {...dto, state: {...dto.state, decasteljauT: value}}] : [type, dto]);
        return {...snapshot, data, graphState: {...snapshot.graphState, t: value} as Preset['graphState']};
    },
    readPaths: graph => {
        const curve = (graph as unknown as DecasteljauGraph)['getFirstJxgCurve']();
        return {curve: curvePaths(curve.getJxgCurve())};
    },
    geometry: (snapshot, value) => {
        const points = controlPoints(snapshot);
        const path: Path = [];
        for (let i = 0; i <= samples; i++) {
            const [x, y] = bezierPoint(points, (value * i) / samples);
            path.push([x, y]);
        }
        return {curve: [path]};
    },
};

// ---- Phase portrait: the parameter is the stored matrix entry A (= a/4); the main curves are the seeds' forward orbits --------

const phase: PreviewSubject = {
    id: 'phase-portrait',
    parameter: 'matrix entry A',
    values: [-16, -14, -12, -10, -8, -6, -4, -3, -2, -1],
    create: () => new PhasePortraitGraph() as unknown as BaseGraph<BaseGraphState>,
    withValue: (snapshot, value) => ({...snapshot, data: {...(snapshot.data as PhaseState), A: value}}),
    readPaths: graph => ({forward: curvePaths((graph as unknown as PhasePortraitGraph)['drawnElements'].get('trajectories'))}),
    geometry: (snapshot, value) => {
        const state = serializePhaseState({...(snapshot.data as PhaseState), A: value});
        return {forward: derivePhase(state).orbits.map(orbit => orbit.forward.map(([x, y]): [number, number] => [x, y]))};
    },
};

export const previewSubjects: readonly PreviewSubject[] = [taylor, decasteljau, phase];
