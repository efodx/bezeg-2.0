import React, {useSyncExternalStore} from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import type {TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {phasePortraitPresetCollection} from "./dynamicsPresetCollection";
import {currentLanguage, onLanguageChange, t, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {NumberInput} from "../../inputs/NumberInput";
import Slider from "../../inputs/Slider";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, useReducedMotion} from "../base/controls/reducedMotion";
import {GraphPalette} from "../styles/GraphPalette";
import {SceneObjects} from "../recursion/SceneObjects";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import type {Vec2} from "../../linear/matrix2";
import {classifyEigen, type EigenClassification} from "../../linear/eigen2";
import type {PlaneType} from "../../dynamics/classify2";
import {RK4_STEP, type StopReason} from "../../dynamics/rk4";
import {SYSTEM_IDS, type SystemId} from "../../dynamics/systems2";
import {
    DEFAULT_PHASE_STATE, derivePhase, ENTRY_RANGE, ENTRY_SCALE, entryOf, equilibriumChoices, halfWidthOf, ORBIT_DURATION, parsePhaseState, PhaseDerived, PhaseState, serializePhaseState,
    SEEDS_MAX, SEEDS_MIN, SEED_RANGE, SEED_SCALE, seedOf, snapDragInteger, typedInteger, withSystem, ZOOM_RANGE, EnergyStatus, Orbit, SeedState,
} from "../../dynamics/phaseModel";

/** The scene state: the stored fields of `PhaseState`, nothing derived. The time and the playing flag are host state, never stored. */
export interface PhasePortraitGraphState extends BaseGraphState, PhaseState {}

/** One frame advances the time by at most this many milliseconds, so a stalled tab does not jump. */
export const MAX_FRAME_MS = 100;
/** The grid of the time slider and of typed times (seconds): the integration step, so a time is a whole number of steps. */
export const TIME_STEP = RK4_STEP;
const TIME_BIG_STEP = 1;
const TIME_SLACK = 1e-9;
/** Pointer tolerance in screen pixels around a handle; JSXGraph adds a slack of 2 and tests both sides, so a touch zone is over 44 px across. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;
/** The (tau, delta) inset shows tau in [-TAU_MAX, TAU_MAX] and delta in [-DELTA_MAX, DELTA_MAX]: every matrix of the grid fits, so nothing is clipped. */
export const INSET_TAU_MAX = 8;
export const INSET_DELTA_MAX = 32;
let helpInstances = 0;

/** Every stored field: derived from the defaults; a test compares it with the keys of `PhaseState` so a new field cannot miss the pause rule. */
export const STORED_FIELDS = Object.keys(DEFAULT_PHASE_STATE) as (keyof PhaseState)[];

/** New seeds are taken from this list in order, skipping the ones already present. */
const SEED_CANDIDATES: readonly SeedState[] = [
    {X: 20, Y: 0}, {X: 0, Y: 20}, {X: -20, Y: 0}, {X: 0, Y: -20}, {X: 20, Y: 20}, {X: -20, Y: -20},
    {X: 20, Y: -20}, {X: -20, Y: 20}, {X: 40, Y: 0}, {X: 0, Y: 40}, {X: -40, Y: 0}, {X: 0, Y: -40},
];

const dec = (value: number, digits = 3): string => formatNumber(value, currentLanguage(), digits);
const point = (x: number, y: number): string => t("phase_graph_point_format", {value0: dec(x), value1: dec(y)});

const SYSTEM_KEYS = {
    linear: "phase_graph_system_linear", pendulum: "phase_graph_system_pendulum", "weak-spiral": "phase_graph_system_weak_spiral",
} as const;

const STABILITY_KEYS = {
    node: {stable: "phase_graph_type_node_stable", unstable: "phase_graph_type_node_unstable"},
    "star-node": {stable: "phase_graph_type_star_stable", unstable: "phase_graph_type_star_unstable"},
    "degenerate-node": {stable: "phase_graph_type_degenerate_stable", unstable: "phase_graph_type_degenerate_unstable"},
    spiral: {stable: "phase_graph_type_spiral_stable", unstable: "phase_graph_type_spiral_unstable"},
} as const;

const NON_ISOLATED_KEYS = {
    "line-of-equilibria": "phase_graph_type_line_of_equilibria", "shear-flow": "phase_graph_type_shear_flow", "all-fixed": "phase_graph_type_all_fixed",
} as const;

/** The exact type of a classification as a label in the current language. */
export function typeLabel(type: PlaneType): string {
    switch (type.kind) {
        case "saddle": return t("phase_graph_type_saddle");
        case "centre": return t("phase_graph_type_centre");
        case "non-isolated": return t(NON_ISOLATED_KEYS[type.case]);
        default: return t(STABILITY_KEYS[type.kind][type.stability]);
    }
}

/** Whether one half of an orbit stopped before the full horizon. */
const stopped = (stop: StopReason): boolean => stop !== "complete";

interface Poly {
    readonly x: number[];
    readonly y: number[];
}

const emptyPoly = (): Poly => ({x: [], y: []});

/** Appends a polyline; a NaN separates it from the previous one, so one curve draws many pieces. */
function addPolyline(poly: Poly, points: readonly (readonly [number, number])[]): void {
    if (points.length === 0) return;
    if (poly.x.length > 0) {
        poly.x.push(NaN);
        poly.y.push(NaN);
    }
    for (const [x, y] of points) {
        poly.x.push(x);
        poly.y.push(y);
    }
}

/** The curve data of the board, keyed on the derived object: one NaN-separated curve per drawing style (ADR 0054, measurement). */
interface Drawn {
    readonly frame: Poly;
    readonly seedForward: Poly;
    readonly seedBackward: Poly;
    readonly ring: Poly;
    readonly ringLinear: Poly;
    readonly separatrix: Poly;
    readonly wraps: Poly;
}

const wholeOrbit = (orbit: Orbit): readonly Vec2[] => [...orbit.backward.slice().reverse(), ...orbit.forward.slice(1)];

const SEPARATRIX_SAMPLES = 240;
/** The seed captions: an estimate of a letter's width, the height of the text box, the clear gap to the trajectory and the points tested of it. */
const SEED_CAPTION_CHAR_PX = 7.5;
const SEED_CAPTION_HEIGHT_PX = 18;
const SEED_CAPTION_CLEAR_PX = 8;
const SEED_CAPTION_SAMPLES = 200;

function drawnFor(state: PhaseState, derived: PhaseDerived): Drawn {
    const {xMin, xMax, yMin, yMax} = derived.view;
    const frame = emptyPoly();
    addPolyline(frame, [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax], [xMin, yMin]]);
    const seedForward = emptyPoly();
    const seedBackward = emptyPoly();
    for (const orbit of derived.orbits) {
        addPolyline(seedForward, orbit.forward);
        addPolyline(seedBackward, orbit.backward);
    }
    const ring = emptyPoly();
    for (const orbit of derived.ring) addPolyline(ring, wholeOrbit(orbit));
    const ringLinear = emptyPoly();
    for (const orbit of derived.ringLinear) addPolyline(ringLinear, wholeOrbit(orbit));
    const separatrix = emptyPoly();
    const wraps = emptyPoly();
    if (state.system === "pendulum") {
        // H = 1: omega = +-2 cos(theta / 2), the two branches through the saddles (pi + 2 k pi, 0).
        for (const sign of [1, -1]) {
            const branch: [number, number][] = [];
            for (let i = 0; i <= SEPARATRIX_SAMPLES; i++) {
                const theta = xMin + ((xMax - xMin) * i) / SEPARATRIX_SAMPLES;
                branch.push([theta, sign * 2 * Math.cos(theta / 2)]);
            }
            addPolyline(separatrix, branch);
        }
        // theta and theta + 2 pi are the same angle: the vertical lines at the odd multiples of pi show where the plane wraps.
        for (let k = Math.ceil((xMin / Math.PI - 1) / 2); (2 * k + 1) * Math.PI <= xMax; k++) {
            addPolyline(wraps, [[(2 * k + 1) * Math.PI, yMin], [(2 * k + 1) * Math.PI, yMax]]);
        }
    }
    return {frame, seedForward, seedBackward, ring, ringLinear, separatrix, wraps};
}

const sameContent = (a: PhaseState, b: PhaseState): boolean => STORED_FIELDS.every(key => a[key] === b[key]);

const viewBox = (derived: PhaseDerived): [number, number, number, number] => {
    const {xMin, xMax, yMin, yMax} = derived.view;
    const margin = 0.04 * (xMax - xMin);
    return [xMin - margin, yMax + margin, xMax + margin, yMin - margin];
};

const LEGEND_CHAR_PX = 7.5;
/** The lines a legend row takes on a board `width` px wide (10 px margin each side): the browser wraps it at the edge of the board. */
export function legendLines(text: string, width: number): number {
    return Math.max(1, Math.ceil((text.length * LEGEND_CHAR_PX) / Math.max(width - 20, 100)));
}

const viewKey = (box: readonly number[]): string => box.map(value => value.toFixed(6)).join(",");

/**
 * The phase-portrait graph (phase-portraits spec PP1 to PP3, ADR 0054): trajectories of a planar system, forward and backward, from
 * seed points that can be dragged or typed; the matrix of the linear system by two draggable columns or four fields; the pendulum
 * with its separatrix; and for the other two systems a ring of trajectories around an equilibrium beside the linearization's.
 *
 * The stored state is `PhaseState`; the classification, the orbits and the energy status are derived (`derived()`), keyed on the
 * stored content and never on a language-resolved string. The type shown is the exact classification of the matrix or Jacobian; the
 * drawn trajectories are numbers computed by RK4 and are labelled so.
 *
 * Ownership: every board object is created by `buildScene` and recorded in `scene`; `disposeScene` removes them with their listeners.
 * Lines run through owned hidden points. The playback driver is created by `play`, stopped by every edit and by disposal; the
 * settled readout's timer is cancelled with the session.
 */
export class PhasePortraitGraph extends BaseGraph<PhasePortraitGraphState, PhaseState> {
    private readonly scene = new SceneObjects();
    /** Per instance, so two mounted graphs never share the id that `aria-describedby` points at. */
    private readonly helpId = `phase-portrait-input-help-${++helpInstances}`;
    private seedHandles: JXG.Point[] = [];
    private columnHandles: JXG.Point[] = [];
    private derivedCache?: {state: PhasePortraitGraphState; value: PhaseDerived};
    private drawnCache?: {derived: PhaseDerived; value: Drawn};
    private eigenCache?: {derived: PhaseDerived; value: EigenClassification};
    private drawnView = "";
    private derivations = 0;
    private driver?: AnimationDriver;
    private notice?: {readonly state: PhasePortraitGraphState; readonly text: () => string};
    /** The one announcement region of the graph. */
    readonly status = new SettledReadout();
    // ---- Host state: not in the model, not in a Preset ------------------------------------------------------------------
    private timeValue = 0;
    private playingValue = false;
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    override getInitialState(): PhasePortraitGraphState {
        return {initialized: false, ...DEFAULT_PHASE_STATE};
    }

    protected override lessonDefaultState(): PhasePortraitGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`. Time and playing stay host state.

    override defaultPreset(): PhaseState {
        return serializePhaseState(DEFAULT_PHASE_STATE);
    }

    override presetCollection(): PresetCollection<PhaseState> {
        return phasePortraitPresetCollection();
    }

    override exportPreset(): Preset<PhaseState> {
        const preset = super.exportPreset();
        const {system: _system, A: _A, B: _B, C: _C, D: _D, seeds: _seeds, equilibrium: _equilibrium, zoom: _zoom, ...graphState} = preset.graphState as PhasePortraitGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): PhaseState {
        return serializePhaseState(this.state);
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the view of the imported data is marked as drawn. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    override importPresetData(data: PhaseState): void {
        const imported = serializePhaseState(data);
        if (this.keepImportedView) this.drawnView = viewKey(viewBox(derivePhase(imported)));
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): PhasePortraitGraphState {
        const parsed = parsePhaseState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return viewBox(derivePhase(DEFAULT_PHASE_STATE));
    }

    // ---- Host state -----------------------------------------------------------------------------------------------------

    readonly subscribeHost = (listener: () => void): (() => void) => {
        this.hostListeners.add(listener);
        return () => { this.hostListeners.delete(listener); };
    };
    readonly hostSnapshot = (): number => this.hostVersion;

    private notifyHost(): void {
        this.hostVersion++;
        this.hostListeners.forEach(listener => listener());
    }

    get time(): number { return this.timeValue; }
    get playing(): boolean { return this.playingValue; }
    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    derivationCount(): number { return this.derivations; }
    seedHandle(index: number): JXG.Point | undefined { return this.seedHandles[index]; }
    columnHandle(index: number): JXG.Point | undefined { return this.columnHandles[index]; }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    /** The classification, orbits and energies of the current state; recomputed only for other stored content (never for a language change). */
    derived(): PhaseDerived {
        const state = this.state;
        if (this.derivedCache && this.derivedCache.state === state) return this.derivedCache.value;
        if (this.derivedCache && sameContent(this.derivedCache.state, state)) {
            this.derivedCache = {state, value: this.derivedCache.value};
            return this.derivedCache.value;
        }
        this.derivations++;
        const value = derivePhase(state);
        this.derivedCache = {state, value};
        return value;
    }

    private drawn(): Drawn {
        const derived = this.derived();
        if (this.drawnCache?.derived !== derived) this.drawnCache = {derived, value: drawnFor(this.state, derived)};
        return this.drawnCache.value;
    }

    /** The eigen-structure of the Jacobian, in floating point: it only places the eigen-direction lines and fills the computed readout. */
    private eigen(): EigenClassification {
        const derived = this.derived();
        if (this.eigenCache?.derived !== derived) this.eigenCache = {derived, value: classifyEigen(derived.jacobian)};
        return this.eigenCache.value;
    }

    private eigenDirections(): readonly Vec2[] {
        const eigen = this.eigen();
        if (eigen.kind === "distinct-real") return eigen.eigenvectors;
        if (eigen.kind === "repeated" && eigen.repeated === "defective") return [eigen.eigenvector];
        return [];
    }

    /** The position of the moving point of a seed at the current time: the orbit's point at that time, parked at its last point once it stopped. */
    private movingPoint(orbit: Orbit): Vec2 {
        const index = Math.min(Math.round(this.timeValue / RK4_STEP), orbit.forward.length - 1);
        return orbit.forward[Math.max(index, 0)];
    }

    /** How many seeds' moving points are parked at the end of a stopped forward orbit at the current time. */
    private parkedCount(): number {
        const index = Math.round(this.timeValue / RK4_STEP);
        return this.derived().orbits.filter(orbit => stopped(orbit.forwardStop) && index >= orbit.forward.length - 1).length;
    }

    private stopCounts(): {stopped: number; halves: number} {
        const derived = this.derived();
        const all = [...derived.orbits, ...derived.ring, ...derived.ringLinear];
        return {
            stopped: all.reduce((sum, orbit) => sum + Number(stopped(orbit.forwardStop)) + Number(stopped(orbit.backwardStop)), 0),
            halves: 2 * all.length,
        };
    }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("phase_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A new board (also the second mount of StrictMode) starts unframed, whatever an earlier board drew.
        this.drawnView = "";
        this.applyView();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => {
                this.stopDriver();
                this.playingValue = false;
                this.status.cancel();
                this.hostListeners.clear();
            });
            session.registerCleanup(onLanguageChange(() => { this.boardUpdate(); this.status.replace(this.statusText()); }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(previous: Readonly<PhasePortraitGraphState>): void {
        // Every edit of the scene pauses, whoever made it (a control, a drag, a lesson action, a restore): a stored field changed.
        if (STORED_FIELDS.some(key => previous[key] !== this.state[key])) this.halt();
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.halt();
        // A replacement (checkpoint restore, Preset import) brings its own view: build first, then mark the view as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.scene.objectCount() === 0) this.buildScene();
            this.drawnView = viewKey(viewBox(this.derived()));
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.halt();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.scene.objectCount() === 0) this.buildScene();
        this.applyView();
        this.placeHandles();
        this.board.update();
        this.status.report(this.statusText());
        this.notifyHost();
    }

    /** Frames the board once per view key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyView(): void {
        const box = viewBox(this.derived());
        const key = viewKey(box);
        if (key === this.drawnView) return;
        this.drawnView = key;
        this.board.setBoundingBox([...box], true);
    }

    /** Moves every handle to the stored value (idempotent). */
    private placeHandles(): void {
        const {seeds, A, B, C, D} = this.state;
        this.seedHandles.forEach((handle, index) => {
            const seed = seeds[index];
            if (seed && (handle.X() !== seedOf(seed.X) || handle.Y() !== seedOf(seed.Y))) handle.setPosition(JXG.COORDS_BY_USER, [seedOf(seed.X), seedOf(seed.Y)]);
        });
        const columns: Vec2[] = [[entryOf(A), entryOf(C)], [entryOf(B), entryOf(D)]];
        this.columnHandles.forEach((handle, index) => {
            const [x, y] = columns[index];
            if (handle.X() !== x || handle.Y() !== y) handle.setPosition(JXG.COORDS_BY_USER, [x, y]);
        });
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    /** Whether a seed handle shows: the seed exists and its stored position is inside the computed region (read from the state, not the handle). */
    private seedShown(index: number): boolean {
        const seed = this.state.seeds[index];
        return seed !== undefined && this.inView(seedOf(seed.X), seedOf(seed.Y));
    }

    /** Whether a matrix-column handle shows: the system is linear and the stored column is inside the computed region. */
    private columnShown(column: 0 | 1): boolean {
        const {A, B, C, D} = this.state;
        return this.state.system === "linear" && (column === 0 ? this.inView(entryOf(A), entryOf(C)) : this.inView(entryOf(B), entryOf(D)));
    }

    private inView(x: number, y: number): boolean {
        const {xMin, xMax, yMin, yMax} = this.derived().view;
        return x >= xMin && x <= xMax && y >= yMin && y <= yMax;
    }

    private curve(data: () => Poly, attributes: Partial<JXG.CurveAttributes>): JXG.Curve {
        const element = this.scene.own(this.board.create("curve", [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes}));
        element.updateDataArray = () => {
            const {x, y} = data();
            element.dataX = x;
            element.dataY = y;
        };
        return element;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const state = () => this.state;
        const nonlinear = () => state().system !== "linear";
        const pendulum = () => state().system === "pendulum";

        // The computed region, the separatrix and the angle wrap, then the trajectories: one NaN-separated curve per style.
        this.curve(() => this.drawn().frame, {strokeColor: GraphPalette.tick, strokeWidth: 1});
        this.curve(() => this.drawn().wraps, {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1, dash: 2, visible: pendulum});
        this.curve(() => this.drawn().separatrix, {strokeColor: GraphPalette.additionalCurves[3], strokeWidth: 2, dash: 1, visible: pendulum});
        this.curve(() => this.drawn().ringLinear, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: 2, visible: nonlinear});
        this.curve(() => this.drawn().ring, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 1.5, visible: nonlinear});
        this.curve(() => this.drawn().seedBackward, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 2, dash: 2});
        this.curve(() => this.drawn().seedForward, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3});

        // Eigen-direction lines through owned hidden points (the centre, and the centre plus each direction).
        const hidden = (x: () => number, y: () => number) => this.scene.own(board.create("point", [x, y], {
            name: "", withLabel: false, fixed: true, highlight: false, visible: false, size: 1,
        }));
        const centre = hidden(() => this.derived().centre[0], () => this.derived().centre[1]);
        for (let i = 0; i < 2; i++) {
            const direction = (): Vec2 => this.eigenDirections()[i] ?? [1, 0];
            const end = hidden(() => this.derived().centre[0] + direction()[0], () => this.derived().centre[1] + direction()[1]);
            this.scene.own(board.create("line", [centre, end], {
                straightFirst: true, straightLast: true, strokeColor: GraphPalette.additionalCurves[1], strokeWidth: 1.5, dash: 3, fixed: true,
                highlight: false, withLabel: false, visible: () => this.eigenDirections().length > i,
            }));
        }

        // The equilibrium the readout names.
        this.scene.own(board.create("point", [() => this.derived().centre[0], () => this.derived().centre[1]], {
            name: "", withLabel: false, fixed: true, highlight: false, size: 4, face: "x", strokeColor: GraphPalette.label, fillColor: GraphPalette.label,
        }));
        this.pixelText(() => this.derived().centre[0], () => this.derived().centre[1], 8, -14,
            () => t("phase_graph_cap_equilibrium", {value0: typeLabel(this.derived().plane.type)}), GraphPalette.label);

        // The moving points of the playback: hollow squares at the orbit's point at the current time.
        for (let i = 0; i < SEEDS_MAX; i++) {
            this.scene.own(board.create("point", [() => this.movingFor(i)[0], () => this.movingFor(i)[1]], {
                name: "", withLabel: false, fixed: true, highlight: false, size: 5, face: "[]", strokeColor: GraphPalette.label, fillColor: "none",
                visible: () => i < state().seeds.length && this.inView(...this.movingFor(i)),
            }));
        }

        // Seed handles (draggable): the stored seeds, snapped while dragged; typed values have fields in the panel.
        this.seedHandles = [];
        for (let i = 0; i < SEEDS_MAX; i++) {
            const seed = state().seeds[i] ?? SEED_CANDIDATES[i];
            const handle: JXG.Point = this.scene.own(board.create("point", [seedOf(seed.X), seedOf(seed.Y)], {
                name: "", withLabel: false, size: 7, face: "o", fillColor: GraphPalette.controlPoint, strokeColor: GraphPalette.pointOutline,
                highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
                visible: () => this.seedShown(i),
                precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
            }));
            this.seedHandles.push(handle);
            this.wireDrag(handle, () => this.dragSeed(i, handle));
            this.pixelText(() => handle.X(), () => handle.Y(), () => this.seedCaptionOffset(i, handle)[0], () => this.seedCaptionOffset(i, handle)[1],
                () => t("phase_graph_cap_seed", {value0: String(i + 1)}), GraphPalette.controlPoint,
                () => this.seedShown(i));
        }

        // Matrix columns (the linear system only): the images of (1, 0) and (0, 1), with a segment from the origin.
        this.columnHandles = [];
        const origin = hidden(() => 0, () => 0);
        for (const i of [0, 1] as const) {
            const initial: Vec2 = i === 0 ? [entryOf(state().A), entryOf(state().C)] : [entryOf(state().B), entryOf(state().D)];
            const handle: JXG.Point = this.scene.own(board.create("point", [initial[0], initial[1]], {
                name: "", withLabel: false, size: 7, face: "diamond", fillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.pointOutline,
                highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
                visible: () => this.columnShown(i),
                precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
            }));
            this.columnHandles.push(handle);
            this.wireDrag(handle, () => this.dragColumn(i, handle));
            this.scene.own(board.create("segment", [origin, handle], {
                strokeColor: GraphPalette.comparisonCurve, strokeWidth: 1, dash: 2, fixed: true, highlight: false, withLabel: false,
                visible: () => this.columnShown(i),
            }));
            this.pixelText(() => handle.X(), () => handle.Y(), 10, -14,
                () => t(i === 0 ? "phase_graph_cap_column1" : "phase_graph_cap_column2", {value0: point(handle.X(), handle.Y())}), GraphPalette.comparisonCurve,
                () => this.columnShown(i));
        }

        // The legend: stacked from the top left, only the visible rows take a place. It names every element the readout names.
        const rows: readonly {text: () => string; visible: () => boolean; color: string}[] = [
            {text: () => t("phase_graph_cap_trajectories"), visible: () => true, color: GraphPalette.primaryCurve},
            {text: () => t("phase_graph_cap_moving"), visible: () => true, color: GraphPalette.label},
            {text: () => t("phase_graph_cap_ring"), visible: nonlinear, color: GraphPalette.comparisonCurve},
            {text: () => t("phase_graph_cap_ring_linear"), visible: nonlinear, color: GraphPalette.constructionAccent},
            {text: () => t("phase_graph_cap_eigen"), visible: () => this.eigenDirections().length > 0, color: GraphPalette.additionalCurves[1]},
            {text: () => t("phase_graph_cap_separatrix"), visible: pendulum, color: GraphPalette.additionalCurves[3]},
            {text: () => t("phase_graph_cap_wrap"), visible: () => pendulum() && this.drawn().wraps.x.length > 0, color: GraphPalette.label},
            {text: () => t("phase_graph_cap_frame"), visible: () => true, color: GraphPalette.label},
            {text: () => { const c = this.stopCounts(); return t("phase_graph_cap_stops", {value0: String(c.stopped), value1: String(c.halves)}); },
                visible: () => this.stopCounts().stopped > 0, color: GraphPalette.warningText},
        ];
        rows.forEach((row, index) => {
            // A row wider than the board wraps: the rows above add up the lines each takes, so none runs into the next.
            const place = () => rows.slice(0, index).filter(other => other.visible()).reduce((sum, other) => sum + legendLines(other.text(), board.canvasWidth), 0);
            this.scene.own(board.create("text", [
                () => { const {left, ux} = this.scaleOf(); return left + 10 / ux; },
                () => { const {top, uy} = this.scaleOf(); return top - (10 + place() * 20) / uy; },
                () => row.text(),
            ], {strokeColor: row.color, fontSize: 14, anchorX: "left", anchorY: "top", fixed: true, highlight: false, withLabel: false, visible: row.visible}));
        });
    }

    /** A caption at a board point plus a pixel offset (up is positive). */
    private pixelText(x: () => number, y: () => number, dx: number | (() => number), dy: number | (() => number), text: () => string, color: string,
                      visible: () => boolean = () => true): void {
        const offset = (value: number | (() => number)) => typeof value === "number" ? value : value();
        this.scene.own(this.board.create("text", [
            () => x() + offset(dx) / this.scaleOf().ux, () => y() + offset(dy) / this.scaleOf().uy, text,
        ], {strokeColor: color, fontSize: 14, anchorX: "left", fixed: true, highlight: false, withLabel: false, visible}));
    }

    /**
     * The pixel offset of the caption of a seed: the first of the four corners around the seed (up right, up left, down right, down
     * left) whose text box stays clear of the seed's trajectory and of the equilibrium caption, else the clearest one.
     */
    private seedCaptionOffset(index: number, handle: JXG.Point): readonly [number, number] {
        const orbit = this.derived().orbits[index];
        const {ux, uy} = this.scaleOf();
        const width = SEED_CAPTION_CHAR_PX * t("phase_graph_cap_seed", {value0: String(index + 1)}).length;
        const sx = handle.X();
        const sy = handle.Y();
        const obstacles: Vec2[] = [];
        const take = (points: readonly Vec2[]) => {
            const step = Math.max(1, Math.floor(points.length / SEED_CAPTION_SAMPLES));
            for (let i = 0; i < points.length; i += step) obstacles.push([(points[i][0] - sx) * ux, (points[i][1] - sy) * uy]);
        };
        if (orbit) { take(orbit.forward); take(orbit.backward); }
        const [cx, cy] = this.derived().centre;
        const equilibriumWidth = SEED_CAPTION_CHAR_PX * t("phase_graph_cap_equilibrium", {value0: typeLabel(this.derived().plane.type)}).length;
        for (let along = 0; along <= equilibriumWidth; along += 8) obstacles.push([(cx - sx) * ux + 8 + along, (cy - sy) * uy - 14]);
        const half = SEED_CAPTION_HEIGHT_PX / 2;
        const corners: ReadonlyArray<readonly [number, number]> = [
            [10, 10 + half], [-10 - width, 10 + half], [10, -10 - half], [-10 - width, -10 - half],
        ];
        let best = corners[0];
        let bestClearance = -1;
        for (const corner of corners) {
            let clearance = Infinity;
            for (const [px, py] of obstacles) {
                const gapX = Math.max(corner[0] - px, 0, px - (corner[0] + width));
                const gapY = Math.max(corner[1] - half - py, 0, py - (corner[1] + half));
                clearance = Math.min(clearance, Math.hypot(gapX, gapY));
            }
            if (clearance >= SEED_CAPTION_CLEAR_PX) return corner;
            if (clearance > bestClearance) { best = corner; bestClearance = clearance; }
        }
        return best;
    }

    private movingFor(index: number): Vec2 {
        const orbit = this.derived().orbits[index];
        return orbit ? this.movingPoint(orbit) : this.derived().centre;
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.seedHandles = [];
        this.columnHandles = [];
    }

    // ---- Dragging: snapping for the handles; typed values are refused instead -------------------------------------------------

    private wireDrag(handle: JXG.Point, onDrag: () => void): void {
        const board = this.board;
        const onOver = () => { board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { board.containerObj.style.cursor = "default"; };
        handle.on("drag", onDrag);
        handle.on("over", onOver);
        handle.on("out", onOut);
        this.scene.listen(() => { handle.off("drag", onDrag); handle.off("over", onOver); handle.off("out", onOut); });
    }

    /** Drag only: the seed snaps to the nearest grid point inside the range (typed values are refused instead, see `editSeed`). */
    private dragSeed(index: number, handle: JXG.Point): void {
        const X = snapDragInteger(handle.X(), SEED_SCALE, SEED_RANGE);
        const Y = snapDragInteger(handle.Y(), SEED_SCALE, SEED_RANGE);
        if (X === undefined || Y === undefined) {
            this.placeHandles();
            return;
        }
        const seed = this.state.seeds[index];
        if (seed && (seed.X !== X || seed.Y !== Y)) this.edit({seeds: this.state.seeds.map((other, i) => (i === index ? {X, Y} : other))});
        handle.setPosition(JXG.COORDS_BY_USER, [seedOf(X), seedOf(Y)]);
    }

    /** Drag only: a matrix column snaps to the quarter grid inside [-4, 4]. */
    private dragColumn(column: 0 | 1, handle: JXG.Point): void {
        const x = snapDragInteger(handle.X(), ENTRY_SCALE, ENTRY_RANGE);
        const y = snapDragInteger(handle.Y(), ENTRY_SCALE, ENTRY_RANGE);
        if (x === undefined || y === undefined) {
            this.placeHandles();
            return;
        }
        const patch = column === 0 ? {A: x, C: y} : {B: x, D: y};
        if (Object.entries(patch).some(([key, value]) => this.state[key as "A" | "B" | "C" | "D"] !== value)) this.edit(patch);
        handle.setPosition(JXG.COORDS_BY_USER, [entryOf(x), entryOf(y)]);
    }

    // ---- Playback and the time -------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private stopDriver(): void {
        this.driver?.dispose();
        this.driver = undefined;
    }

    /** Stops the frame loop; the time stays where it is. */
    private halt(): void {
        this.stopDriver();
        if (!this.playingValue) return;
        this.playingValue = false;
        this.notifyHost();
    }

    override pausePlayback(): void {
        this.halt();
        if (this.hasBoard && this.graphSession?.isAlive) this.status.report(this.statusText());
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the current time (from 0 at the end). Under reduced motion nothing moves; the slider still sets the time. */
    play(): void {
        if (this.playingValue || this.reducedMotion() || !this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.timeValue >= ORBIT_DURATION) this.timeValue = 0;
        this.playingValue = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.boardUpdate();
        this.notifyHost();
    }

    private advance(delta: number): void {
        if (!this.playingValue || !this.graphSession?.isAlive) return;
        this.timeValue = Math.min(ORBIT_DURATION, this.timeValue + Math.min(Math.max(delta, 0), MAX_FRAME_MS) / 1000);
        const finished = this.timeValue >= ORBIT_DURATION;
        if (finished) this.halt();
        this.boardUpdate();
        // While playing only the time and a change of the wording are announced; the moment the run stops the full sentence is.
        this.status.report(finished ? this.statusText() : this.sentence());
        this.notifyHost();
    }

    /** The time slider and the lesson actions: a time inside the horizon; anything else is refused. Setting it pauses the playback. */
    setTime(value: number): boolean {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > ORBIT_DURATION + TIME_SLACK) return false;
        this.halt();
        this.timeValue = Math.min(value, ORBIT_DURATION);
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.requestRender();
        return true;
    }

    resetTime(): void {
        this.halt();
        this.timeValue = 0;
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.requestRender();
    }

    /** The time of a lesson checkpoint; playback is never captured. */
    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), phaseTime: this.timeValue};
    }

    /** Every scene replacement lands stopped, at the saved time when it is valid and at t = 0 otherwise. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const time = saved?.phaseTime;
        this.halt();
        this.notice = undefined;
        const valid = typeof time === "number" && Number.isFinite(time) && time >= 0 && time <= ORBIT_DURATION;
        // A saved time outside the horizon is refused, not clamped (restored values are never changed); the time is 0 and the status says so.
        this.timeValue = valid ? time : 0;
        if (time !== undefined && !valid) this.notice = {state: this.state, text: () => t("phase_graph_notice_time_refused")};
        this.notifyHost();
    }

    protected override stopLessonAnimations(): void { this.halt(); }

    protected override beforeFigureCapture(): void { this.halt(); }

    // ---- Editing --------------------------------------------------------------------------------------------------------

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<PhaseState>): void {
        this.halt();
        this.setState(patch);
        this.requestRender();
    }

    editSystem(system: SystemId): void {
        if (system === this.state.system) return;
        const next = withSystem(this.state, system);
        this.edit({system: next.system, equilibrium: next.equilibrium});
    }

    editEquilibrium(index: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index >= equilibriumChoices(this.state.system)) return false;
        if (index !== this.state.equilibrium) this.edit({equilibrium: index});
        return true;
    }

    /** A typed matrix entry: on the quarter grid inside [-4, 4], otherwise refused (false), never rounded or clamped. */
    editEntry(field: "A" | "B" | "C" | "D", value: number): boolean {
        const checked = typedInteger(value, ENTRY_SCALE, ENTRY_RANGE, field);
        if (!checked.ok) return false;
        if (checked.value !== this.state[field]) this.edit({[field]: checked.value});
        return true;
    }

    /** A typed seed coordinate: on the 1/20 grid inside [-4, 4], otherwise refused. */
    editSeed(index: number, axis: "X" | "Y", value: number): boolean {
        const seed = this.state.seeds[index];
        if (!seed) return false;
        const checked = typedInteger(value, SEED_SCALE, SEED_RANGE, axis);
        if (!checked.ok) return false;
        if (checked.value !== seed[axis]) this.edit({seeds: this.state.seeds.map((other, i) => (i === index ? {...other, [axis]: checked.value} : other))});
        return true;
    }

    /** The number of seeds, 1 to 6: more seeds are taken from a fixed list of grid points, fewer drop the last ones. */
    setSeedCount(count: number): boolean {
        if (!Number.isInteger(count) || count < SEEDS_MIN || count > SEEDS_MAX) return false;
        const seeds = this.state.seeds;
        if (count === seeds.length) return true;
        if (count < seeds.length) {
            this.edit({seeds: seeds.slice(0, count)});
            return true;
        }
        const next = [...seeds];
        for (const candidate of SEED_CANDIDATES) {
            if (next.length >= count) break;
            if (!next.some(seed => seed.X === candidate.X && seed.Y === candidate.Y)) next.push(candidate);
        }
        this.edit({seeds: next});
        return true;
    }

    editZoom(zoom: number): boolean {
        if (!Number.isInteger(zoom) || zoom < ZOOM_RANGE.min || zoom > ZOOM_RANGE.max) return false;
        if (zoom !== this.state.zoom) this.edit({zoom});
        return true;
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    private stopText(stop: StopReason, points: number): string {
        const seconds = dec((points - 1) * RK4_STEP, 2);
        switch (stop) {
            case "complete": return t("phase_graph_stop_complete", {value0: dec(ORBIT_DURATION, 0)});
            case "left-view": return t("phase_graph_stop_left_view", {value0: seconds});
            case "diverged": return t("phase_graph_stop_diverged", {value0: seconds});
            case "non-finite": return t("phase_graph_stop_non_finite", {value0: seconds});
        }
    }

    private energyText(energy: EnergyStatus): string {
        const params = {value0: dec(energy.H, 6)};
        switch (energy.kind) {
            case "swing": return t("phase_graph_energy_swing", params);
            case "rotation": return t("phase_graph_energy_rotation", params);
            case "separatrix-exact": return t("phase_graph_energy_separatrix_exact", params);
            case "separatrix-near": return t("phase_graph_energy_separatrix_near", params);
        }
    }

    /** The wording without the time: the exact type, with what it means for the system, the parked points and the notice. */
    sentence(): string {
        const derived = this.derived();
        const linear = this.state.system === "linear";
        const parts = [t(linear ? "phase_graph_status_type_linear" : "phase_graph_status_type_linearization", {
            value0: typeLabel(derived.plane.type), value1: dec(derived.plane.tau, 4), value2: dec(derived.plane.delta, 4)})];
        if (!linear && !derived.hyperbolic) parts.push(t("phase_graph_decision_no"));
        const parked = this.parkedCount();
        if (parked > 0) parts.push(t("phase_graph_status_parked", {value0: String(parked), value1: String(this.state.seeds.length)}));
        if (this.notice && this.notice.state === this.state) parts.push(this.notice.text());
        return parts.join(" ");
    }

    /** The status sentence: the time, the wording, and that the horizon has ended. */
    statusText(): string {
        const ended = this.timeValue >= ORBIT_DURATION && !this.playingValue;
        return [t("phase_graph_status_time", {value0: dec(this.timeValue, 2)}), this.sentence(),
            ended ? t("phase_graph_status_ended", {value0: dec(ORBIT_DURATION, 0)}) : ""].filter(Boolean).join(" ");
    }

    private eigenText(): string {
        const eigen = this.eigen();
        switch (eigen.kind) {
            case "distinct-real": return t("phase_graph_eig_real", {value0: dec(eigen.eigenvalues[0], 4), value1: dec(eigen.eigenvalues[1], 4)});
            case "complex": return t("phase_graph_eig_complex", {value0: dec(eigen.real, 4), value1: dec(eigen.imaginary, 4)});
            case "repeated":
                return t(eigen.repeated === "scalar" ? "phase_graph_eig_scalar" : "phase_graph_eig_defective", {value0: dec(eigen.eigenvalue, 4)});
        }
    }

    readoutRows(): ReadoutListRow[] {
        const state = this.state;
        const derived = this.derived();
        const linear = state.system === "linear";
        const {tau, delta, discriminant} = derived.plane;
        const j = derived.jacobian;
        const halves = (orbits: readonly Orbit[]) => orbits.reduce((sum, orbit) => sum + Number(stopped(orbit.forwardStop)) + Number(stopped(orbit.backwardStop)), 0);
        const rows: ReadoutListRow[] = [
            {id: "time", label: t("phase_graph_r_time"), value: `${dec(this.timeValue, 2)} ${t("phase_graph_unit_s")}`},
            {id: "system", label: t("phase_graph_r_system"), value: t(SYSTEM_KEYS[state.system])},
            {id: "centre", label: t("phase_graph_r_centre"), value: point(derived.centre[0], derived.centre[1])},
            {id: "type", label: t(linear ? "phase_graph_r_type_linear" : "phase_graph_r_type_linearization"), value: typeLabel(derived.plane.type)},
            {id: "tau", label: t("phase_graph_r_tau"), value: dec(tau, 4)},
            {id: "delta", label: t("phase_graph_r_delta"), value: dec(delta, 4)},
            {id: "discriminant", label: t("phase_graph_r_discriminant"), value: dec(discriminant, 4)},
            {id: "jacobian", label: t(linear ? "phase_graph_r_matrix" : "phase_graph_r_jacobian"),
                value: t("phase_graph_jacobian_value", {value0: dec(j[0][0]), value1: dec(j[0][1]), value2: dec(j[1][0]), value3: dec(j[1][1])})},
            {id: "hyperbolic", label: t("phase_graph_r_hyperbolic"), value: t(derived.hyperbolic ? "phase_graph_yes" : "phase_graph_no")},
        ];
        if (!linear) rows.push({id: "decision", label: t("phase_graph_r_decision"), value: t(derived.hyperbolic ? "phase_graph_decision_yes" : "phase_graph_decision_no")});
        rows.push({id: "eigen", label: t("phase_graph_r_eigen"), value: this.eigenText()});
        const half = halfWidthOf(state.zoom);
        rows.push({id: "view", label: t("phase_graph_r_view"), value: t("phase_graph_view_value", {
            value0: dec(derived.view.xMin, 4), value1: dec(derived.view.xMax, 4), value2: dec(derived.view.yMin, 4), value3: dec(derived.view.yMax, 4), value4: dec(half, 4)})});
        state.seeds.forEach((seed, index) => {
            const orbit = derived.orbits[index];
            rows.push({id: `seed-${index + 1}`, label: t("phase_graph_r_seed", {value0: String(index + 1)}), value: t("phase_graph_seed_value", {
                value0: point(seedOf(seed.X), seedOf(seed.Y)), value1: this.stopText(orbit.forwardStop, orbit.forward.length),
                value2: this.stopText(orbit.backwardStop, orbit.backward.length)})});
            const energy = derived.energies[index];
            if (energy) rows.push({id: `energy-${index + 1}`, label: t("phase_graph_r_energy", {value0: String(index + 1)}), value: this.energyText(energy)});
        });
        if (!linear) {
            rows.push({id: "ring", label: t("phase_graph_r_ring"), value: t("phase_graph_ring_value", {
                value0: String(derived.ring.length), value1: String(halves(derived.ring)), value2: String(2 * derived.ring.length)})});
            rows.push({id: "ring-linear", label: t("phase_graph_r_ring_linear"), value: t("phase_graph_ring_value", {
                value0: String(derived.ringLinear.length), value1: String(halves(derived.ringLinear)), value2: String(2 * derived.ringLinear.length)})});
        }
        return rows;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private entryField(field: "A" | "B" | "C" | "D", labelKey: "phase_graph_matrix_a_label" | "phase_graph_matrix_b_label" | "phase_graph_matrix_c_label"
        | "phase_graph_matrix_d_label"): JSX.Element {
        return <NumberInput key={field} label={t(labelKey)} value={entryOf(this.state[field])} step={1 / ENTRY_SCALE} bigStep={1} min={ENTRY_RANGE.min / ENTRY_SCALE}
                            max={ENTRY_RANGE.max / ENTRY_SCALE} decimals={2} describedBy={this.helpId}
                            onChange={value => this.editEntry(field, value)}/>;
    }

    private seedFields(index: number): JSX.Element[] {
        const seed = this.state.seeds[index];
        const pendulum = this.state.system === "pendulum";
        const n = String(index + 1);
        const axis = (key: "X" | "Y", label: string) => <NumberInput key={`seed-${index}-${key}`} label={label} value={seedOf(seed[key])} step={1 / SEED_SCALE} bigStep={1}
            min={SEED_RANGE.min / SEED_SCALE} max={SEED_RANGE.max / SEED_SCALE} decimals={2} describedBy={this.helpId}
            onChange={value => this.editSeed(index, key, value)}/>;
        return [axis("X", t(pendulum ? "phase_graph_seed_theta_label" : "phase_graph_seed_x_label", {value0: n})),
            axis("Y", t(pendulum ? "phase_graph_seed_omega_label" : "phase_graph_seed_y_label", {value0: n}))];
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="system" label={t("phase_graph_system_label")} value={state.system} help={t("phase_graph_system_help")}
                          options={SYSTEM_IDS.map(value => ({value, text: t(SYSTEM_KEYS[value])}))}
                          onChange={value => { const system = SYSTEM_IDS.find(candidate => candidate === value); if (system) this.editSystem(system); }}/>,
        ];
        if (equilibriumChoices(state.system) > 1) {
            commands.push(<ChoiceSelect key="equilibrium" label={t("phase_graph_equilibrium_label")} value={String(state.equilibrium)} help={t("phase_graph_equilibrium_help")}
                                        options={[{value: "0", text: t("phase_graph_equilibrium_origin")}, {value: "1", text: t("phase_graph_equilibrium_pi")}]}
                                        onChange={value => this.editEquilibrium(Number(value))}/>);
        }
        if (state.system === "linear") {
            commands.push(this.entryField("A", "phase_graph_matrix_a_label"), this.entryField("B", "phase_graph_matrix_b_label"),
                this.entryField("C", "phase_graph_matrix_c_label"), this.entryField("D", "phase_graph_matrix_d_label"));
        }
        commands.push(
            <CountSetter key="seeds" label={t("phase_graph_seeds_label")} n={state.seeds.length} min={SEEDS_MIN} max={SEEDS_MAX} bigStep={1}
                         minusLabel={t("phase_graph_seeds_minus")} plusLabel={t("phase_graph_seeds_plus")} help={t("phase_graph_seeds_help", {value0: String(SEEDS_MIN), value1: String(SEEDS_MAX)})}
                         onPlus={() => this.setSeedCount(state.seeds.length + 1)} onMinus={() => this.setSeedCount(state.seeds.length - 1)}
                         onSet={value => this.setSeedCount(value)}/>,
        );
        state.seeds.forEach((_, index) => commands.push(...this.seedFields(index)));
        commands.push(
            <Slider key="zoom" customText={t("phase_graph_zoom_label")} min={ZOOM_RANGE.min} max={ZOOM_RANGE.max} step={1} grid={1} bigStep={1} value={state.zoom}
                    decimals={0} help={t("phase_graph_zoom_help", {value0: String(ZOOM_RANGE.min), value1: String(ZOOM_RANGE.max), value2: dec(halfWidthOf(state.zoom), 4)})}
                    rejectedHint={t("phase_graph_zoom_rejected", {value0: String(ZOOM_RANGE.min), value1: String(ZOOM_RANGE.max)})}
                    valueText={value => t("phase_graph_zoom_value", {value0: dec(halfWidthOf(Math.round(value)), 4)})} onChange={value => this.editZoom(value)}/>,
            <p key="help" id={this.helpId} className="form-text">{t("phase_graph_input_help", {
                value0: dec(ENTRY_RANGE.min / ENTRY_SCALE, 0), value1: dec(ENTRY_RANGE.max / ENTRY_SCALE, 0), value2: dec(1 / ENTRY_SCALE, 2),
                value3: dec(SEED_RANGE.min / SEED_SCALE, 0), value4: dec(SEED_RANGE.max / SEED_SCALE, 0), value5: dec(1 / SEED_SCALE, 2)})}</p>,
        );
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <PhasePlayback graph={this}/>
            <PhaseReadout graph={this}/>
        </>;
    }
}

/** Play or pause, reset and the time slider: host state, so only this part re-renders on a frame. */
function PhasePlayback(props: {graph: PhasePortraitGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    useReducedMotion(); // follows a system change; the graph's own reducedMotion() is read below
    const time = Math.min(graph.time, ORBIT_DURATION);
    const playing = graph.playing;
    const params = {value0: dec(ORBIT_DURATION, 0), value1: dec(TIME_STEP, 2)};
    const blocks = playbackBlocks({atStart: time === 0, atEnd: false, playing});
    return <div className="inspector-group">
        <PlaybackButtons reducedMotionReason={text("playback_block_reduced_motion_time")}
                         placement="graph" groupLabel={text("phase_graph_playback_group")}
                         playing={playing} onPlayPause={() => (graph.playing ? graph.pausePlayback() : graph.play())} onReset={() => graph.resetTime()}
                         {...blocks} playBlock={blocks.playBlock ?? (!playing && graph.reducedMotion() ? "reduced-motion" : undefined)}/>
        <Slider customText={text("phase_graph_time_label")} min={0} max={ORBIT_DURATION} step={TIME_STEP} grid={TIME_STEP} bigStep={TIME_BIG_STEP} value={time}
                help={text("phase_graph_time_help", params)} rejectedHint={text("phase_graph_time_rejected", {value0: params.value0})}
                valueText={value => `${dec(value, 2)} ${text("phase_graph_unit_s")}`} onChange={value => graph.setTime(value)}/>
    </div>;
}

const INSET_SIZE = 180;
const insetX = (tau: number): number => ((tau + INSET_TAU_MAX) / (2 * INSET_TAU_MAX)) * INSET_SIZE;
const insetY = (delta: number): number => ((INSET_DELTA_MAX - delta) / (2 * INSET_DELTA_MAX)) * INSET_SIZE;
const PARABOLA = Array.from({length: 65}, (_, i) => {
    const tau = -INSET_TAU_MAX + (2 * INSET_TAU_MAX * i) / 64;
    return `${insetX(tau).toFixed(1)},${insetY((tau * tau) / 4).toFixed(1)}`;
}).join(" ");

/** The (tau, delta) plane with the parabola delta = tau^2 / 4 and the axes; the range holds every matrix of the grid, so nothing is clipped. */
export function TraceDeterminantInset(props: {tau: number; delta: number}) {
    const text = useT();
    const {tau, delta} = props;
    const x = insetX(tau);
    const y = insetY(delta);
    const label = text("phase_graph_inset_label", {value0: dec(tau, 4), value1: dec(delta, 4), value2: dec(INSET_TAU_MAX, 0), value3: dec(INSET_DELTA_MAX, 0)});
    return <svg role="img" aria-label={label} viewBox={`0 0 ${INSET_SIZE} ${INSET_SIZE}`} width={INSET_SIZE} height={INSET_SIZE} data-phase-inset="">
        <title>{text("phase_graph_inset_title")}</title>
        <rect x={0} y={0} width={INSET_SIZE} height={INSET_SIZE} fill={GraphPalette.boardSurface} stroke={GraphPalette.tick}/>
        <line x1={insetX(0)} y1={0} x2={insetX(0)} y2={INSET_SIZE} stroke={GraphPalette.axis}/>
        <line x1={0} y1={insetY(0)} x2={INSET_SIZE} y2={insetY(0)} stroke={GraphPalette.axis}/>
        <polyline points={PARABOLA} fill="none" stroke={GraphPalette.additionalCurves[3]} strokeWidth={1.5} strokeDasharray="4 3"/>
        <text x={INSET_SIZE - 4} y={insetY(0) - 3} textAnchor="end" fontSize={11} fill={GraphPalette.label}>τ</text>
        <text x={insetX(0) + 4} y={11} fontSize={11} fill={GraphPalette.label}>δ</text>
        <text x={2} y={insetY(0) + 12} fontSize={10} fill={GraphPalette.label} data-inset-tick="">{`−${dec(INSET_TAU_MAX, 0)}`}</text>
        <text x={INSET_SIZE - 2} y={insetY(0) + 12} textAnchor="end" fontSize={10} fill={GraphPalette.label} data-inset-tick="">{dec(INSET_TAU_MAX, 0)}</text>
        <text x={insetX(0) + 3} y={21} fontSize={10} fill={GraphPalette.label} data-inset-tick="">{dec(INSET_DELTA_MAX, 0)}</text>
        <text x={insetX(0) + 3} y={INSET_SIZE - 3} fontSize={10} fill={GraphPalette.label} data-inset-tick="">{`−${dec(INSET_DELTA_MAX, 0)}`}</text>
        <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke={GraphPalette.controlPoint} strokeWidth={2}/>
        <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke={GraphPalette.controlPoint} strokeWidth={2}/>
        <circle cx={x} cy={y} r={4} fill="none" stroke={GraphPalette.controlPoint} strokeWidth={2}/>
    </svg>;
}

/** The status sentence, the labelled values, the (tau, delta) inset and the one announcement region (silent while the points move). */
function PhaseReadout(props: {graph: PhasePortraitGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    const {plane} = graph.derived();
    return <div className="inspector-group">
        <ReadoutHeading>{text("phase_graph_readout_title")}</ReadoutHeading>
        <p data-phase-status="">{graph.statusText()}</p>
        <ReadoutList label={text("phase_graph_readout_title")} rows={graph.readoutRows()}/>
        <TraceDeterminantInset tau={plane.tau} delta={plane.delta}/>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

export default PhasePortraitGraph;
