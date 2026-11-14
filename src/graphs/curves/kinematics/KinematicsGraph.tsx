import React, {useSyncExternalStore} from "react";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {TransientState} from "../../base/BaseGraph";
import {GraphSession} from "../../base/GraphSession";
import {currentLanguage, onLanguageChange, t, useT} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {BooleanField} from "../../../inputs/BooleanField";
import Slider from "../../../inputs/Slider";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../../base/controls/PlaybackButtons";
import {prefersReducedMotion, useReducedMotion} from "../../base/controls/reducedMotion";
import {GraphPalette} from "../../styles/GraphPalette";
import {PresetCollection} from "../../base/presets/PresetCollection";
import {Preset} from "../../base/presets/Presets";
import {kinematicsPresetCollection} from "./kinematicsPresetCollection";
import {AnimationDriver, AnimationScheduler} from "../../../learning/runtime/animation";
import type {LessonAction} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {circularSource} from "../../../kinematics/motion";
import {
    arrowEnd, componentVectors, DEFAULT_KINEMATICS_STATE, deriveKinematics, Evaluation, evaluateAt, FIELD_RANGES, GRAVITY,
    KinematicsDerived, KinematicsState, MotionChoice, MOTION_IDS, NumericField, parseKinematicsState, SAMPLES, serializeKinematicsState, snapField, ToggleField, withMotion,
} from "../../../kinematics/kinematicsModel";

/** The scene state: the stored fields of `KinematicsState`, nothing derived. The time and the playing flag are host state, never stored. */
export interface KinematicsGraphState extends BaseGraphState, KinematicsState {}

/** One frame advances the time by at most this many milliseconds, so a stalled tab does not jump. */
export const MAX_FRAME_MS = 100;
/** The grid of the time slider and of typed times (seconds). */
export const TIME_STEP = 0.01;
const TIME_BIG_STEP = 0.1;
/** Float slack when a slider reaches the end of the motion. */
const TIME_SLACK = 1e-9;
/** An arrow shorter than this fraction of the full-scale arrow is not drawn. */
const MIN_ARROW = 1e-3;

const STORED_FIELDS = Object.keys(DEFAULT_KINEMATICS_STATE) as (keyof KinematicsState)[];

const dec = (value: number, digits = 3): string => formatNumber(value, currentLanguage(), digits);

const MOTION_KEYS = {
    cycloid: "kinematics_graph_motion_cycloid", cardioid: "kinematics_graph_motion_cardioid", rose: "kinematics_graph_motion_rose",
    spiral: "kinematics_graph_motion_spiral", projectile: "kinematics_graph_motion_projectile", circular: "kinematics_graph_motion_circular",
} as const;

/** The fields that make a different motion: a change of any of them changes the time domain. */
const motionKey = (s: KinematicsState): string => `${s.motion}/${s.v0}/${s.alpha}/${s.radius}/${s.omega}/${s.b}`;

interface DrawnCurve {
    dataX: number[];
    dataY: number[];
    updateDataArray: () => void;
}

/** Room above the path for the captions, as a fraction of the path extent (about 100 px at the opening view on a desktop board); the captions stand in the top left corner, over the margin and this room. */
const CAPTION_ROOM = 0.25;

/** One text row of a caption, in pixels (14 px type), and the widest an average character of it is. */
const CAPTION_ROW_PX = 20;
const CAPTION_CHAR_PX = 7.5;

/** The y-axis tick labels stand left of the axis: up to this many pixels (offset 10 px plus a label of up to four characters) must stay clear. */
const AXIS_LABEL_PX = 60;
/** The gap between the y axis and a caption that stands to its right. */
const AXIS_GAP_PX = 8;

/**
 * Where the captions stand on a board `width` px wide whose y axis is `axisPx` px from the left edge (negative or beyond `width` when the axis is off
 * the board): `indent` px from the left edge and `room` px wide. The captions never cover the axis tick labels, which stand left of the axis: they go
 * to the right of the axis when that side is the wider one, else to the left of its labels.
 */
export function captionPlacement(axisPx: number, width: number): {indent: number; room: number} {
    const edge = 10;
    if (!Number.isFinite(axisPx) || axisPx <= edge + AXIS_GAP_PX || axisPx >= width + AXIS_LABEL_PX) return {indent: edge, room: Math.max(width - 2 * edge, 100)};
    // An axis just beyond the right edge still has its tick labels on the board: keep the captions left of them.
    if (axisPx >= width) return {indent: edge, room: Math.max(Math.min(axisPx - AXIS_LABEL_PX, width) - 2 * edge, 100)};
    const right = {indent: axisPx + AXIS_GAP_PX, room: width - axisPx - AXIS_GAP_PX - edge};
    const left = {indent: edge, room: axisPx - AXIS_LABEL_PX - edge};
    const wider = right.room >= left.room ? right : left;
    return {indent: wider.indent, room: Math.max(wider.room, 100)};
}

/** The lines a caption takes in `room` px: the browser wraps the text at the edge of the board. */
export function captionLines(text: string, room: number): number {
    return Math.max(1, Math.ceil((text.length * CAPTION_CHAR_PX) / Math.max(room, 100)));
}

/** The board rectangle [left, top, right, bottom] for a motion: the path box, a margin of one full arrow, and room on top for the captions. */
export function frameFor(derived: KinematicsDerived): [number, number, number, number] {
    const [minX, maxX, minY, maxY] = derived.box;
    const extent = Math.max(maxX - minX, maxY - minY, 1e-6);
    const margin = derived.scales.unit + 0.05 * extent;
    return [minX - margin, maxY + margin + CAPTION_ROOM * extent, maxX + margin, minY - margin];
}

/**
 * The kinematics graph (kinematics spec KN1 to KN5, ADR 0050): a point moving along a catalogue curve, a projectile or a circle, with
 * its velocity and acceleration drawn in SI units on the stated arrow scales. The stored state is `KinematicsState`; the path, the
 * scales and the values at the time t are derived from it (`derived`, `evaluation`), keyed on the state object.
 *
 * Ownership: every board object is created by `buildScene` and recorded in `objects`; `disposeScene` removes them. Arrows run through
 * owned hidden end points. The playback driver is created by `play`, stopped by every edit and by disposal; the settled readout's
 * timer is cancelled with the session.
 */
export class KinematicsGraph extends BaseGraph<KinematicsGraphState, KinematicsState> {
    private objects: JXG.GeometryElement[] = [];
    private derivedCache?: {state: KinematicsGraphState; key: string; value: KinematicsDerived};
    private evaluationCache?: {derived: KinematicsDerived; t: number; value: Evaluation};
    private drawnFrame = "";
    /** The function-valued `visible` of the owned elements; JSXGraph's `update()` does not re-evaluate them, so a change of any result needs `fullUpdate()`. */
    private visibilityProbes: (() => boolean)[] = [];
    private visibilityKey = "";
    private derivations = 0;
    private notice?: {readonly state: KinematicsGraphState; readonly text: () => string};
    private reconciledFor?: KinematicsGraphState;
    private driver?: AnimationDriver;
    /** The one announcement region of the graph. */
    readonly status = new SettledReadout();
    // ---- Host state: not in the model, not in a Preset ------------------------------------------------------------------
    private timeValue = 0;
    private playingValue = false;
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    override getInitialState(): KinematicsGraphState {
        return {initialized: false, ...DEFAULT_KINEMATICS_STATE};
    }

    protected override lessonDefaultState(): KinematicsGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): KinematicsState {
        return serializeKinematicsState(DEFAULT_KINEMATICS_STATE);
    }

    override presetCollection(): PresetCollection<KinematicsState> {
        return kinematicsPresetCollection();
    }

    override exportPreset(): Preset<KinematicsState> {
        const preset = super.exportPreset();
        const {motion: _motion, v0: _v0, alpha: _alpha, radius: _radius, omega: _omega, b: _b, showVelocity: _showVelocity, showAcceleration: _showAcceleration, split: _split, trace: _trace, ...graphState} = preset.graphState as KinematicsGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): KinematicsState {
        return serializeKinematicsState(this.state);
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the frame of the imported data is marked as drawn. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    override importPresetData(data: KinematicsState): void {
        const imported = serializeKinematicsState(data);
        if (this.keepImportedView) this.drawnFrame = frameFor(deriveKinematics(imported)).map(value => value.toFixed(4)).join(",");
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): KinematicsGraphState {
        const parsed = parseKinematicsState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return frameFor(deriveKinematics(DEFAULT_KINEMATICS_STATE));
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
    ownedObjectCount(): number { return this.objects.length; }
    derivationCount(): number { return this.derivations; }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    /** The path, the scales and the time domain of the current state; a cache keyed on the state object, resampled only for another motion. */
    derived(): KinematicsDerived {
        const state = this.state;
        if (this.derivedCache && this.derivedCache.state === state) return this.derivedCache.value;
        const key = motionKey(state);
        if (this.derivedCache && this.derivedCache.key === key) {
            this.derivedCache = {...this.derivedCache, state};
            return this.derivedCache.value;
        }
        this.derivations++;
        const value = deriveKinematics(state); // language-free: the units are resolved at render time
        this.derivedCache = {state, key, value};
        return value;
    }

    /** The point, vectors and parts at the current time; a cache keyed on the derived object and the time. */
    evaluation(): Evaluation {
        const derived = this.derived();
        const time = Math.min(Math.max(this.timeValue, 0), derived.tEnd);
        if (this.evaluationCache && this.evaluationCache.derived === derived && this.evaluationCache.t === time) return this.evaluationCache.value;
        const value = evaluateAt(derived, time);
        this.evaluationCache = {derived, t: time, value};
        return value;
    }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("kinematics_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
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

    protected override onStateChange(previous: Readonly<KinematicsGraphState>): void {
        // Every edit of the scene pauses, whoever made it (a control, a lesson action, a restore): a stored field changed.
        if (STORED_FIELDS.some(key => previous[key] !== this.state[key])) this.halt();
        this.reconcileTime(previous);
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.halt();
        // A replacement (checkpoint restore, Preset import) brings its own view: build first, then mark the frame as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.objects.length === 0) this.buildScene();
            this.drawnFrame = this.frameKey();
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.halt();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.objects.length === 0) this.buildScene();
        this.applyFrame();
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
    }

    /** Redraws; a change of what any element shows (a switch, the motion, an arrow shrinking to nothing) needs the full update. */
    override boardUpdate(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        const key = this.visibilityProbes.map(probe => probe() ? "1" : "0").join("");
        if (key !== this.visibilityKey) {
            this.visibilityKey = key;
            this.board.fullUpdate();
        } else this.board.update();
    }

    private frameKey(): string {
        return frameFor(this.derived()).map(value => value.toFixed(4)).join(",");
    }

    /** Frames the board once per frame key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyFrame(): void {
        const frame = frameFor(this.derived());
        const key = this.frameKey();
        if (key === this.drawnFrame) return;
        this.drawnFrame = key;
        this.board.setBoundingBox([...frame], true);
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        this.visibilityProbes = [];
        const watch = (probe: () => boolean): (() => boolean) => { this.visibilityProbes.push(probe); return probe; };
        const dot = (x: () => number, y: () => number, visible: () => boolean, attributes: Partial<JXG.PointAttributes> = {}) => this.own(board.create("point", [x, y], {
            name: "", withLabel: false, fixed: true, highlight: false, size: 3, visible: watch(visible), ...attributes,
        }));
        const curve = (data: () => [number[], number[]], attributes: Partial<JXG.CurveAttributes>) => {
            const element = this.own(board.create("curve", [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes})) as unknown as DrawnCurve & JXG.GeometryElement;
            element.updateDataArray = () => { [element.dataX, element.dataY] = data(); };
            return element;
        };
        const ev = () => this.evaluation();
        const state = () => this.state;
        const regular = () => ev().kind === "regular";

        // The whole path, faint; the part travelled, thick.
        curve(() => [[...this.derived().pathX], [...this.derived().pathY]], {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1});
        curve(() => {
            const derived = this.derived();
            const e = ev();
            const count = Math.min(SAMPLES, Math.floor(e.t / derived.tEnd * SAMPLES));
            return [[...derived.pathX.slice(0, count + 1), e.point[0]], [...derived.pathY.slice(0, count + 1), e.point[1]]];
        }, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3, visible: watch(() => state().trace)});

        // The moving point, and for the circular motion with a changing speed the point of the uniform motion.
        const mover = dot(() => ev().point[0], () => ev().point[1], () => true, {size: 5, strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve});
        const referenceAt = () => circularSource(state().radius, state().omega).at(ev().t).point;
        const referenceVisible = () => state().motion === "circular" && state().b > 0;
        dot(() => referenceAt()[0], () => referenceAt()[1], referenceVisible, {size: 4, face: "[]", strokeColor: GraphPalette.constructionAccent, fillColor: "none"});

        // Arrows from the point to owned hidden end points. Velocity and its parts need a direction, so a zero speed hides them.
        const regularEv = () => { const e = ev(); return e.kind === "regular" ? e : undefined; };
        const step = (kind: "velocity" | "acceleration") => this.derived().scales[kind].step;
        const unit = () => this.derived().scales.unit;
        const vector = {
            v: () => ev().velocity,
            a: () => ev().acceleration,
            at: () => { const e = regularEv(); return e ? componentVectors(e).tangential : [0, 0] as [number, number]; },
            an: () => { const e = regularEv(); return e ? componentVectors(e).normal : [0, 0] as [number, number]; },
        };
        const endOf = (name: keyof typeof vector) => () => arrowEnd(ev().point, vector[name](), step(name === "v" ? "velocity" : "acceleration"), unit());
        // An arrow shorter than a thousandth of the full one has nothing to show (its length is not a number the arrow can point along).
        const longEnough = (name: keyof typeof vector) => () => {
            const [vx, vy] = vector[name]();
            return Math.hypot(vx, vy) / step(name === "v" ? "velocity" : "acceleration") > MIN_ARROW;
        };
        const accelerationShown = () => state().showAcceleration || state().split;
        // The velocity has no direction to draw: a zero or negligible speed (the cusp), for the arrows that need it.
        const noDirection = () => (state().showVelocity && this.standstill()) || (state().split && !regular());
        const arrows: readonly {name: keyof typeof vector; key: "tip_v" | "tip_a" | "tip_at" | "tip_an"; color: string; dash: number; width: number; shown: () => boolean}[] = [
            {name: "v", key: "tip_v", color: GraphPalette.comparisonCurve, dash: 0, width: 3, shown: () => state().showVelocity && regular()},
            {name: "a", key: "tip_a", color: GraphPalette.constructionAccent, dash: 2, width: 3, shown: () => state().showAcceleration},
            {name: "at", key: "tip_at", color: GraphPalette.additionalCurves[3], dash: 1, width: 2, shown: () => state().split && regular()},
            {name: "an", key: "tip_an", color: GraphPalette.additionalCurves[2], dash: 4, width: 2, shown: () => state().split && regular()},
        ];
        for (const arrow of arrows) {
            const visible = watch(() => arrow.shown() && longEnough(arrow.name)());
            const end = dot(() => endOf(arrow.name)()[0], () => endOf(arrow.name)()[1], () => false);
            this.own(board.create("arrow", [mover, end], {
                strokeColor: arrow.color, strokeWidth: arrow.width, dash: arrow.dash, fixed: true, highlight: false, withLabel: false, visible,
            }));
            this.own(board.create("text", [() => endOf(arrow.name)()[0] + 6 / this.scaleOf().ux, () => endOf(arrow.name)()[1] + 6 / this.scaleOf().uy,
                () => t(`kinematics_graph_${arrow.key}`)], {
                strokeColor: arrow.color, fontSize: 14, anchorX: "left", fixed: true, highlight: false, withLabel: false, visible,
            }));
        }

        // The captions: stacked from the top left of the screen, only the visible ones take a row. They name every element a readout names.
        const captions: readonly {text: () => string; visible: () => boolean; color: string}[] = [
            {text: () => t("kinematics_graph_cap_point"), visible: () => true, color: GraphPalette.primaryCurve},
            {text: () => t("kinematics_graph_cap_path"), visible: () => true, color: GraphPalette.label},
            {text: () => t("kinematics_graph_cap_trace"), visible: () => state().trace, color: GraphPalette.primaryCurve},
            {text: () => this.scaleCaption("velocity"), visible: () => state().showVelocity, color: GraphPalette.comparisonCurve},
            {text: () => this.scaleCaption("acceleration"), visible: () => accelerationShown(), color: GraphPalette.constructionAccent},
            {text: () => t("kinematics_graph_cap_components"), visible: () => state().split, color: GraphPalette.additionalCurves[3]},
            {text: () => t("kinematics_graph_cap_sign"), visible: () => state().split, color: GraphPalette.additionalCurves[2]},
            {text: () => t("kinematics_graph_cap_reference"), visible: referenceVisible, color: GraphPalette.constructionAccent},
            {text: () => t("kinematics_graph_cap_gravity", {value0: dec(GRAVITY, 2)}), visible: () => state().motion === "projectile", color: GraphPalette.label},
            {text: () => t("kinematics_graph_cap_cusp"), visible: () => noDirection(), color: GraphPalette.label},
        ];
        // The captions stand clear of the y-axis tick labels (`captionPlacement`): right of the axis, or left of its labels on the wider side.
        const placement = () => { const {left, ux} = this.scaleOf(); return captionPlacement((0 - left) * ux, board.canvasWidth); };
        captions.forEach((caption, index) => {
            // A caption wider than its room wraps: the rows above add up the lines each takes, so none runs into the next.
            const rows = () => captions.slice(0, index).filter(other => other.visible()).reduce((sum, other) => sum + captionLines(other.text(), placement().room), 0);
            this.own(board.create("text", [
                () => { const {left, ux} = this.scaleOf(); return left + placement().indent / ux; },
                () => { const {top, uy} = this.scaleOf(); return top - (10 + rows() * CAPTION_ROW_PX) / uy; },
                () => caption.text(),
            ], {strokeColor: caption.color, fontSize: 14, anchorX: "left", anchorY: "top", fixed: true, highlight: false, withLabel: false, visible: watch(caption.visible)}));
        });
    }

    /** The unit of a scale in the current language, resolved when it is drawn (the derived data holds no language). */
    private unitOf(kind: "velocity" | "acceleration"): string {
        return t(kind === "velocity" ? "kinematics_graph_unit_speed" : "kinematics_graph_unit_accel");
    }

    private scaleCaption(kind: "velocity" | "acceleration"): string {
        const scales = this.derived().scales;
        const params = {value0: dec(scales.unit, 2), value1: dec(scales[kind].step, 3), value2: this.unitOf(kind)};
        return t(kind === "velocity" ? "kinematics_graph_cap_scale_velocity" : "kinematics_graph_cap_scale_acceleration", params);
    }

    private disposeScene(): void {
        if (this.hasBoard) {
            const board = this.board;
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.visibilityProbes = [];
        this.visibilityKey = "";
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
        if (this.timeValue >= this.derived().tEnd) this.timeValue = 0;
        this.playingValue = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.boardUpdate();
        this.notifyHost();
    }

    private advance(delta: number): void {
        if (!this.playingValue || !this.graphSession?.isAlive) return;
        const end = this.derived().tEnd;
        this.timeValue = Math.min(end, this.timeValue + Math.min(Math.max(delta, 0), MAX_FRAME_MS) / 1000);
        const finished = this.timeValue >= end;
        if (finished) this.halt();
        this.boardUpdate();
        // While playing only a change of the wording is announced; the moment the run stops the full sentence is.
        this.status.report(finished ? this.statusText() : this.sentence());
        this.notifyHost();
    }

    /** The time slider and the lesson actions: a time inside the motion; anything else is refused. Setting it pauses the playback. */
    setTime(value: number): boolean {
        const end = this.derived().tEnd;
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > end + TIME_SLACK) return false;
        this.halt();
        this.timeValue = Math.min(value, end);
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

    /**
     * A changed motion starts again at t = 0 and a changed parameter that shortens the motion shortens the time; both are said in
     * the status text. Runs after every state change, once per state object.
     */
    private reconcileTime(previous: Readonly<KinematicsState>): void {
        const state = this.state;
        if (this.reconciledFor === state) return;
        this.reconciledFor = state;
        if (previous.motion !== state.motion) {
            this.halt();
            this.timeValue = 0;
            const key = previous.b !== 0 && state.b === 0 ? "kinematics_graph_notice_reset_b" : "kinematics_graph_notice_reset";
            this.notice = {state, text: () => t(key)};
        } else if (motionKey(previous) !== motionKey(state)) {
            const end = this.derived().tEnd;
            if (this.timeValue > end) {
                this.halt();
                this.timeValue = end;
                this.notice = {state, text: () => t("kinematics_graph_notice_clamped", {value0: dec(end, 2)})};
            }
        }
        this.notifyHost();
    }

    /** The time of a lesson checkpoint; playback is never captured. */
    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), kinematicsTime: this.timeValue};
    }

    /** Every scene replacement lands stopped, at the saved time when it is valid and at t = 0 otherwise. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const time = saved?.kinematicsTime;
        this.halt();
        this.notice = undefined;
        const valid = typeof time === "number" && Number.isFinite(time) && time >= 0 && time <= this.derived().tEnd;
        // A saved time that does not fit the motion is refused, not clamped (shared rule: restored values are never changed); the time is 0 and the status says so.
        this.timeValue = valid ? time : 0;
        this.reconciledFor = this.state;
        if (time !== undefined && !valid) this.notice = {state: this.state, text: () => t("kinematics_graph_notice_time_refused")};
        this.notifyHost();
    }

    protected override stopLessonAnimations(): void { this.halt(); }

    protected override beforeFigureCapture(): void { this.halt(); }

    // ---- Editing --------------------------------------------------------------------------------------------------------

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<KinematicsState>): void {
        this.halt();
        const before = this.state;
        this.setState(patch);
        this.reconcileTime(before);
        this.requestRender();
    }

    editMotion(motion: MotionChoice): void {
        if (motion === this.state.motion) return;
        const next = withMotion(this.state, motion);
        this.edit({motion: next.motion, b: next.b});
    }

    /** Typed and stepped numbers: rounded to the field's grid, refused (false) when outside its range. */
    editNumber(field: NumericField, value: number): boolean {
        const checked = snapField(field, value);
        if (!checked.ok) return false;
        if (checked.value !== this.state[field]) this.edit({[field]: checked.value});
        return true;
    }

    editToggle(field: ToggleField, on: boolean): void {
        if (this.state[field] !== on) this.edit({[field]: on});
    }

    // ---- Lesson actions -------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`kinematics`): `set-motion` picks the motion (time back to 0, b back to 0 off the circular motion), `set-time` is the time slider and
     * `set-params` any of the stored fields. Whole new states go through `parseKinematicsState` (strict: nothing is snapped or clamped) before the first
     * write, so an off-grid or off-range value is a lesson-content error. Each write goes through `edit`, which pauses and reconciles the time at once, so a
     * `set-time` later in the same scene sees the time domain of the new motion and `onStateChange` has nothing left to reset.
     */
    applyKinematicsAction(action: Extract<LessonAction, {kind: "kinematics"}>): void {
        switch (action.operation) {
            case "set-motion": {
                const next = withMotion(this.state, action.motion);
                const parsed = parseKinematicsState(serializeKinematicsState({...this.state, motion: next.motion, b: next.b}));
                if (!parsed.ok) throw new Error(`kinematics set-motion: ${parsed.error.message}`);
                this.edit({motion: parsed.value.motion, b: parsed.value.b});
                return;
            }
            case "set-time":
                if (!this.setTime(action.t)) throw new Error(`kinematics set-time: t must be a number from 0 to ${this.derived().tEnd}, got ${action.t}.`);
                return;
            case "set-params": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
                const parsed = parseKinematicsState({...serializeKinematicsState(this.state), ...defined});
                if (!parsed.ok) throw new Error(`kinematics set-params: ${parsed.error.message}`);
                const changed = STORED_FIELDS.filter(key => parsed.value[key] !== this.state[key]);
                if (changed.length) this.edit(Object.fromEntries(changed.map(key => [key, parsed.value[key]])));
                return;
            }
            default: {
                const unsupported: never = action;
                throw new Error(`kinematics: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("kinematics", action => this.applyKinematicsAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    /** The velocity is zero or so short that its arrow is not drawn (the cusp and its neighbourhood). */
    private standstill(): boolean {
        const e = this.evaluation();
        return e.kind === "singular" || e.speed / this.derived().scales.velocity.step <= MIN_ARROW;
    }

    /** The wording of the speed change at the current time, with the cusp and the notice; no time in it. */
    sentence(): string {
        const e = this.evaluation();
        const parts: string[] = [];
        if (e.kind === "singular" || this.standstill()) parts.push(t("kinematics_graph_status_cusp"));
        else {
            parts.push(t(e.status === "constant-speed" ? "kinematics_graph_status_constant"
                : e.status === "speeding-up" ? "kinematics_graph_status_speeding"
                    : e.status === "slowing-down" ? "kinematics_graph_status_slowing" : "kinematics_graph_status_stationary"));
        }
        if (this.notice && this.notice.state === this.state) parts.push(this.notice.text());
        return parts.join(" ");
    }

    /** The status sentence: the time, the wording, and that the motion has ended. */
    statusText(): string {
        const e = this.evaluation();
        const ended = e.t >= this.derived().tEnd && !this.playingValue;
        return [t("kinematics_graph_status_time", {value0: dec(e.t, 2)}), this.sentence(), ended ? t("kinematics_graph_status_ended", {value0: dec(e.t, 2)}) : ""]
            .filter(Boolean).join(" ");
    }

    private quantity(value: number, unit: "m" | "s" | "speed" | "accel" | "curv", digits = 3): string {
        return `${dec(value, digits)} ${t(`kinematics_graph_unit_${unit}`)}`;
    }

    private vectorText(vector: readonly [number, number], unit: "m" | "speed" | "accel"): string {
        return t("kinematics_graph_vector_value", {value0: dec(vector[0], 3), value1: dec(vector[1], 3), value2: t(`kinematics_graph_unit_${unit}`)});
    }

    readoutRows(): ReadoutListRow[] {
        const state = this.state;
        const derived = this.derived();
        const e = this.evaluation();
        const none = t("kinematics_graph_not_defined");
        const regular = e.kind === "regular" ? e : undefined;
        const rows: ReadoutListRow[] = [
            {id: "time", label: t("kinematics_graph_r_time"), value: this.quantity(e.t, "s", 2)},
            {id: "position", label: t("kinematics_graph_r_position"), value: this.vectorText(e.point, "m")},
            {id: "velocity", label: t("kinematics_graph_r_velocity"), value: this.vectorText(e.velocity, "speed")},
            {id: "speed", label: t("kinematics_graph_r_speed"), value: this.quantity(e.speed, "speed")},
            {id: "acceleration", label: t("kinematics_graph_r_acceleration"), value: this.vectorText(e.acceleration, "accel")},
            {id: "a-t", label: t("kinematics_graph_r_at"), value: regular ? this.quantity(regular.aT, "accel") : none},
            {id: "a-n", label: t("kinematics_graph_r_an"), value: regular ? this.quantity(regular.aN, "accel") : none},
            {id: "kappa", label: t("kinematics_graph_r_kappa"), value: regular ? this.quantity(regular.kappa, "curv") : none},
            {id: "kappa-v2", label: t("kinematics_graph_r_kappa_v2"), value: regular ? this.quantity(regular.kappaSpeedSquared, "accel") : none},
        ];
        if (state.motion === "circular") rows.push({id: "period", label: t("kinematics_graph_r_period"), value: this.quantity(derived.tEnd, "s")});
        if (derived.summary) {
            rows.push(
                {id: "flight", label: t("kinematics_graph_r_flight"), value: this.quantity(derived.summary.flightTime, "s")},
                {id: "range", label: t("kinematics_graph_r_range"), value: this.quantity(derived.summary.range, "m")},
                {id: "height", label: t("kinematics_graph_r_height"), value: this.quantity(derived.summary.maxHeight, "m")},
                {id: "gravity", label: t("kinematics_graph_r_g"), value: this.quantity(GRAVITY, "accel", 2)},
            );
        }
        const scale = (kind: "velocity" | "acceleration") => t("kinematics_graph_r_scale_value", {
            value0: dec(derived.scales.unit, 2), value1: dec(derived.scales[kind].step, 3), value2: this.unitOf(kind)});
        if (state.showVelocity) rows.push({id: "scale-velocity", label: t("kinematics_graph_r_scale_velocity"), value: scale("velocity")});
        if (state.showAcceleration || state.split) rows.push({id: "scale-acceleration", label: t("kinematics_graph_r_scale_acceleration"), value: scale("acceleration")});
        return rows;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private slider(field: NumericField, labelKey: "kinematics_graph_v0_label" | "kinematics_graph_alpha_label" | "kinematics_graph_radius_label"
        | "kinematics_graph_omega_label" | "kinematics_graph_b_label", decimals: number, bigStep: number, help?: string): JSX.Element {
        const range = FIELD_RANGES[field];
        return <Slider key={field} customText={t(labelKey)} value={this.state[field]} step={range.step} bigStep={bigStep} min={range.min} max={range.max}
                       grid={range.step} decimals={decimals} fieldDecimals={decimals} help={help}
                       rejectedHint={t("kinematics_graph_field_rejected", {value0: dec(range.min, decimals), value1: dec(range.max, decimals)})}
                       onChange={value => this.editNumber(field, value)}/>;
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="motion" label={t("kinematics_graph_motion_label")} value={state.motion} help={t("kinematics_graph_motion_help")}
                          options={MOTION_IDS.map(value => ({value, text: t(MOTION_KEYS[value])}))}
                          onChange={value => { const motion = MOTION_IDS.find(candidate => candidate === value); if (motion) this.editMotion(motion); }}/>,
        ];
        if (state.motion === "projectile") {
            commands.push(this.slider("v0", "kinematics_graph_v0_label", 0, 5),
                this.slider("alpha", "kinematics_graph_alpha_label", 0, 15));
        } else if (state.motion === "circular") {
            commands.push(this.slider("radius", "kinematics_graph_radius_label", 1, 1),
                this.slider("omega", "kinematics_graph_omega_label", 2, 1),
                this.slider("b", "kinematics_graph_b_label", 2, 0.25, t("kinematics_graph_b_help")));
        }
        commands.push(
            <BooleanField key="showVelocity" variant="switch" label={t("kinematics_graph_show_velocity")} help={t("kinematics_graph_show_velocity_help")}
                          checked={state.showVelocity} onChange={on => this.editToggle("showVelocity", on)}/>,
            <BooleanField key="showAcceleration" variant="switch" label={t("kinematics_graph_show_acceleration")} help={t("kinematics_graph_show_acceleration_help")}
                          checked={state.showAcceleration} onChange={on => this.editToggle("showAcceleration", on)}/>,
            <BooleanField key="split" variant="switch" label={t("kinematics_graph_split")} help={t("kinematics_graph_split_help")}
                          checked={state.split} onChange={on => this.editToggle("split", on)}/>,
            <BooleanField key="trace" variant="switch" label={t("kinematics_graph_trace")} help={t("kinematics_graph_trace_help")}
                          checked={state.trace} onChange={on => this.editToggle("trace", on)}/>,
        );
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <KinematicsPlayback graph={this}/>
            <KinematicsReadout graph={this}/>
        </>;
    }
}

/** Play or pause, reset and the time slider: host state, so only this part re-renders on a frame. */
function KinematicsPlayback(props: {graph: KinematicsGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    useReducedMotion(); // follows a system change; the graph's own reducedMotion() is read below
    const end = graph.derived().tEnd;
    const time = Math.min(graph.time, end);
    const playing = graph.playing;
    const params = {value0: dec(end, 2), value1: dec(TIME_STEP, 2)};
    const blocks = playbackBlocks({atStart: time === 0, atEnd: false, playing});
    return <div className="inspector-group">
        <PlaybackButtons reducedMotionReason={text("playback_block_reduced_motion_time")}
                         placement="graph" groupLabel={text("kinematics_graph_playback_group")} resetLabel={text("kinematics_graph_reset_label")}
                         playing={playing} onPlayPause={() => (graph.playing ? graph.pausePlayback() : graph.play())} onReset={() => graph.resetTime()}
                         {...blocks} playBlock={!playing && graph.reducedMotion() ? "reduced-motion" : undefined}/>
        <Slider customText={text("kinematics_graph_time_label")} min={0} max={end} step={TIME_STEP} grid={TIME_STEP} bigStep={TIME_BIG_STEP} value={time}
                help={text("kinematics_graph_time_help", params)} rejectedHint={text("kinematics_graph_time_rejected", {value0: params.value0})}
                valueText={value => `${dec(value, 2)} ${text("kinematics_graph_unit_s")}`} onChange={value => graph.setTime(value)}/>
    </div>;
}

/** The status sentence, the labelled values and the one announcement region (silent while the motion plays). */
function KinematicsReadout(props: {graph: KinematicsGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <div className="inspector-group">
        <ReadoutHeading>{text("kinematics_graph_readout_title")}</ReadoutHeading>
        <p data-kinematics-status="">{graph.statusText()}</p>
        <ReadoutList label={text("kinematics_graph_readout_title")} rows={graph.readoutRows()}/>
        <p data-kinematics-sign="">{text("kinematics_graph_sign_hint")}</p>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

export default KinematicsGraph;
