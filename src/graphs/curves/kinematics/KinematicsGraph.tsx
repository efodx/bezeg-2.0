import React, {useSyncExternalStore} from "react";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {TransientState} from "../../base/BaseGraph";
import {GraphSession} from "../../base/GraphSession";
import {currentLanguage, message, messageNumber, onLanguageChange, renderMessage, t, useT, type Message} from "../../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ReadoutRow, ViewMarks} from "../../base/declare/graphDeclaration";
import {runAs} from "../../base/writes/writeSource";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {formatNumber} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {BooleanField} from "../../../inputs/BooleanField";
import Slider from "../../../inputs/Slider";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../../base/controls/PlaybackButtons";
import {prefersReducedMotion, useReducedMotion} from "../../base/controls/reducedMotion";
import {GraphPalette} from "../../styles/GraphPalette";
import {sampleLine, type PxBox} from "../../legend/boardLabelPlacement";
import {placeArrowTags, type TagItem} from "./arrowTagPlacement";
import {pointLabelMath} from "../../styles/pointLabelMath";
import {PresetCollection} from "../../base/presets/PresetCollection";
import {Preset} from "../../base/presets/Presets";
import {kinematicsPresetCollection} from "./kinematicsPresetCollection";
import {AnimationDriver, AnimationScheduler} from "../../../learning/runtime/animation";
import type {LessonAction} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {circularSource} from "../../../kinematics/motion";
import {
    arrowEnd, componentVectors, DEFAULT_KINEMATICS_STATE, deriveKinematics, Evaluation, evaluateAt, FIELD_RANGES, GRAVITY,
    KinematicsDerived, KinematicsState, MotionChoice, MOTION_IDS, NUMERIC_FIELDS, NumericField, parseKinematicsState, SAMPLES, serializeKinematicsState, snapField, ToggleField, withMotion,
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

/** The legend entry (and drawn object) of each arrow. */
const UNIT_KEYS = {m: "kinematics_graph_unit_m", s: "kinematics_graph_unit_s", speed: "kinematics_graph_unit_speed", accel: "kinematics_graph_unit_accel", curv: "kinematics_graph_unit_curv"} as const;

const ARROW_LEGEND = {v: "velocity", a: "acceleration", at: "tangential", an: "normal"} as const;

/** Points of the drawn osculating circle, and the largest radius drawn, in sizes of the board frame (above it the circle is not drawn). */
const OSCULATING_SAMPLES = 180;
const OSCULATING_RADIUS_FRAMES = 2;

/** The pixel size of an arrow tag, from its character count (a subscript letter is a narrow glyph) and the font size. */
export function tagSize(text: string, fontSize: number): {w: number; h: number} {
    return {w: Math.ceil(text.length * 0.6 * fontSize) + 4, h: Math.ceil(fontSize * 1.25) + 2};
}

/**
 * The board rectangle [left, top, right, bottom] for a motion: the path box with a margin of one full arrow and a twentieth of the extent. No board text stands on it (the
 * legend and the readout name everything), so no room is kept for captions and the frame does not depend on the size of the board.
 */
export function frameFor(derived: KinematicsDerived): [number, number, number, number] {
    const [minX, maxX, minY, maxY] = derived.box;
    const extent = Math.max(maxX - minX, maxY - minY, 1e-6);
    const margin = derived.scales.unit + 0.05 * extent;
    return [minX - margin, maxY + margin, maxX + margin, minY - margin];
}

/** The ids of the kinematics declaration (`DeclarationIds`): the parameters by arbiter key, the readout rows of `readoutRows`, the notes, the drawn legend entries and the actions. */
export type KinematicsIds = {
    param: "kinematics-time" | "kinematics-v0" | "kinematics-alpha" | "kinematics-radius" | "kinematics-omega" | "kinematics-b";
    row: "time" | "position" | "velocity" | "speed" | "acceleration" | "a-t" | "a-n" | "kappa" | "kappa-v2" | "period" | "flight" | "range" | "height" | "gravity"
        | "scale-velocity" | "scale-acceleration";
    note: "status" | "notice" | "ended" | "osculating-far" | "sign";
    legend: "path" | "trace" | "point" | "reference" | "velocity" | "acceleration" | "tangential" | "normal" | "osculating" | "axes";
    section: never;
    action: "play-pause" | "reset-time" | "split" | "osculating";
};

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
    /** The board objects the legend names, by legend id (`drawnObject`). */
    private readonly drawnElements = new Map<string, JXG.GeometryElement>();
    private readonly timeListeners = new Set<() => void>();
    /** The function-valued `visible` of the owned elements; JSXGraph's `update()` does not re-evaluate them, so a change of any result needs `fullUpdate()`. */
    private visibilityProbes: (() => boolean)[] = [];
    private visibilityKey = "";
    private derivations = 0;
    private notice?: {readonly state: KinematicsGraphState; readonly message: Message};
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
        const {motion: _motion, v0: _v0, alpha: _alpha, radius: _radius, omega: _omega, b: _b, showVelocity: _showVelocity, showAcceleration: _showAcceleration, split: _split, trace: _trace, osculating: _osculating, ...graphState} = preset.graphState as KinematicsGraphState;
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

    /** The frame of the default motion; every use of the initial view (a new board, Reset, a Preset without a view). */
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
        this.timeListeners.forEach(listener => listener());
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
        this.boardView.following(() => this.applyFrame());
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

    /** The frame of the current motion. */
    private frame(): [number, number, number, number] {
        return frameFor(this.derived());
    }

    private frameKey(): string {
        return this.frame().map(value => value.toFixed(4)).join(",");
    }

    /** Frames the board once per frame key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyFrame(): void {
        const frame = this.frame();
        const key = frame.map(value => value.toFixed(4)).join(",");
        if (key === this.drawnFrame) return;
        this.drawnFrame = key;
        this.boardView.setIntent(frame, {keepAspectRatio: true});
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

    /**
     * The boxes (px, y down) of the visible axis tick numbers, from the major tick spacing of the default axes (not from the tick label
     * elements, which exist only after the first draw). Same estimate as `IsometryGraph.tickNumberBoxes`. Empty when the numbers are hidden.
     */
    private tickNumberBoxes(toPx: (x: number, y: number) => readonly [number, number], left: number, top: number, width: number, height: number, ux = this.board.unitX, uy = this.board.unitY): PxBox[] {
        if (!this.displaySettings.tickNumbersVisible()) return [];
        const axes = (this.board as unknown as {defaultAxes?: Record<"x" | "y", {defaultTicks?: {getDistanceMajorTicks?: () => number}} | undefined>}).defaultAxes;
        const font = this.displaySettings.fontSize * 0.6;
        const [origin0, origin1] = toPx(0, 0);
        const [right, bottom] = [left + width / ux, top - height / uy];
        const text = (v: number) => Number(v.toFixed(6)).toString();
        const boxes: PxBox[] = [];
        const along = (axis: "x" | "y", from: number, to: number, place: (v: number) => PxBox) => {
            const distance = Number(axes?.[axis]?.defaultTicks?.getDistanceMajorTicks?.());
            if (!(distance > 0) || (to - from) / distance > 200) return;
            for (let k = Math.ceil(from / distance); k * distance <= to; k++) if (k !== 0) boxes.push(place(k * distance));
        };
        const wide = (v: number) => text(v).length * font * 0.55 + 2, high = font + 1;
        if (origin1 > -high && origin1 < height) {
            along("x", left, right, v => {
                const [px] = toPx(v, 0);
                return {x0: px - wide(v) / 2, x1: px + wide(v) / 2, y0: origin1 + 1, y1: origin1 + 3 + high};
            });
        }
        if (origin0 > 0 && origin0 < width + 40) {
            along("y", bottom, top, v => {
                const [, py] = toPx(0, v);
                return {x0: origin0 - 10 - wide(v), x1: origin0 - 8, y0: py + 5 - high / 2, y1: py + 5 + high / 2};
            });
        }
        return boxes;
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
        this.drawnElements.set("path", curve(() => [[...this.derived().pathX], [...this.derived().pathY]], {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1}));
        this.drawnElements.set("trace", curve(() => {
            const derived = this.derived();
            const e = ev();
            const count = Math.min(SAMPLES, Math.floor(e.t / derived.tEnd * SAMPLES));
            return [[...derived.pathX.slice(0, count + 1), e.point[0]], [...derived.pathY.slice(0, count + 1), e.point[1]]];
        }, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3, visible: watch(() => state().trace)}));

        // The moving point, and for the circular motion with a changing speed the point of the uniform motion.
        const mover = dot(() => ev().point[0], () => ev().point[1], () => true, {size: 5, strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve}); this.drawnElements.set("point", mover);
        const referenceAt = () => circularSource(state().radius, state().omega).at(ev().t).point;
        const referenceVisible = () => state().motion === "circular" && state().b > 0;
        this.drawnElements.set("reference", dot(() => referenceAt()[0], () => referenceAt()[1], referenceVisible, {size: 4, face: "[]", strokeColor: GraphPalette.constructionAccent, fillColor: "none"}));

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
        const arrows: readonly {name: keyof typeof vector; key: "tip_v" | "tip_a" | "tip_at" | "tip_an"; color: string; dash: number; width: number; shown: () => boolean}[] = [
            {name: "v", key: "tip_v", color: GraphPalette.comparisonCurve, dash: 0, width: 3, shown: () => state().showVelocity && regular()},
            {name: "a", key: "tip_a", color: GraphPalette.constructionAccent, dash: 2, width: 3, shown: () => state().showAcceleration},
            {name: "at", key: "tip_at", color: GraphPalette.additionalCurves[3], dash: 1, width: 2, shown: () => state().split && regular()},
            {name: "an", key: "tip_an", color: GraphPalette.additionalCurves[2], dash: 4, width: 2, shown: () => state().split && regular()},
        ];
        // The tags stand at the arrow tips, placed in pixels by the shared label placer so that none runs into another, into an arrowhead,
        // into the moving point or into a shaft. The layout is cached by its inputs: at most 4 tags x 48 candidates x (4 tips and about 60 shaft samples) per change, nothing on a frame that moves no tip.
        let tagCache: {key: string; boxes: Record<string, PxBox>} | undefined;
        const tagLayout = (): Record<string, PxBox> => {
            const {ux, uy, left, top} = this.scaleOf();
            const width = board.canvasWidth, height = board.canvasHeight;
            const toPx = (x: number, y: number): [number, number] => [(x - left) * ux, (top - y) * uy];
            const fontSize = this.styles.point.namedLabel.fontSize();
            const shown = arrows.filter(arrow => arrow.shown() && longEnough(arrow.name)());
            const point = toPx(...ev().point);
            const tips = shown.map(arrow => ({arrow, tip: toPx(...endOf(arrow.name)())}));
            const ticks = this.tickNumberBoxes(toPx, left, top, width, height, ux, uy);
            const key = [width, height, ux, uy, left, top, fontSize, currentLanguage(), point,
                this.displaySettings.tickNumbersVisible(), this.displaySettings.fontSize, ticks.length, tips.map(({arrow, tip}) => `${arrow.name}${tip}`)].join("|");
            if (tagCache?.key === key) return tagCache.boxes;
            const samples = tips.flatMap(({tip}) => sampleLine([point[0], tip[0]], [point[1], tip[1]], (x, y) => [x, y], width * 4, height * 4, 5, 60));
            const items: TagItem[] = tips.map(({arrow, tip}) => ({id: arrow.name, tip, ...tagSize(t(`kinematics_graph_${arrow.key}`), fontSize)}));
            const strips = [{x0: 0, y0: top * uy, x1: width, y1: top * uy + 22}, {x0: (0 - left) * ux - 40, y0: 0, x1: (0 - left) * ux, y1: height}];
            let boxes = placeArrowTags(items, {width, height, point, samples, strips, blocks: ticks});
            // A tick number costs a spot more than a shaft, so where the numbers would force two tags onto each other the tags are placed as before.
            const placed = Object.values(boxes);
            if (placed.length < items.length || placed.some((a, i) => placed.slice(i + 1).some(b => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0))) {
                boxes = placeArrowTags(items, {width, height, point, samples, strips});
            }
            tagCache = {key, boxes};
            return boxes;
        };
        for (const arrow of arrows) {
            const visible = watch(() => arrow.shown() && longEnough(arrow.name)());
            const end = dot(() => endOf(arrow.name)()[0], () => endOf(arrow.name)()[1], () => false);
            this.drawnElements.set(ARROW_LEGEND[arrow.name], this.own(board.create("arrow", [mover, end], {
                strokeColor: arrow.color, strokeWidth: arrow.width, dash: arrow.dash, fixed: true, highlight: false, withLabel: false, visible,
            })));
            const corner = (): PxBox => tagLayout()[arrow.name] ?? {x0: 0, y0: 0, x1: 0, y1: 0};
            this.own(board.create("text", [() => this.scaleOf().left + corner().x0 / this.scaleOf().ux, () => this.scaleOf().top - corner().y0 / this.scaleOf().uy,
                // The name of the vector, typeset at the compact size of the named labels (M03).
                () => pointLabelMath(t(`kinematics_graph_${arrow.key}`))], {
                strokeColor: arrow.color, fontSize: this.styles.point.namedLabel.fontSize, useMathJax: true, parse: false, anchorX: "left", anchorY: "top",
                fixed: true, highlight: false, withLabel: false, visible,
            }) as JXG.Text);
        }

        // The osculating circle needs a direction; the tangent and normal axes too.
        this.drawnElements.set("osculating", curve(() => {
            const circle = this.osculatingCircleNow();
            if (!circle) return [[], []];
            const xs: number[] = [];
            const ys: number[] = [];
            for (let i = 0; i <= OSCULATING_SAMPLES; i++) {
                const angle = (2 * Math.PI * i) / OSCULATING_SAMPLES;
                xs.push(circle.centre[0] + circle.radius * Math.cos(angle));
                ys.push(circle.centre[1] + circle.radius * Math.sin(angle));
            }
            return [xs, ys];
        }, {strokeColor: GraphPalette.additionalCurves[0], strokeWidth: 2, visible: watch(() => this.osculatingCircleNow() !== undefined)}));
        // The centre (a small fixed point) and the radius: a thin segment from the moving point to the centre, in the circle's colour.
        const circleShown = watch(() => this.osculatingCircleNow() !== undefined);
        const centre = dot(() => this.osculatingCircleNow()?.centre[0] ?? 0, () => this.osculatingCircleNow()?.centre[1] ?? 0, circleShown, {
            size: 3, showInfobox: false, strokeColor: GraphPalette.additionalCurves[0], fillColor: GraphPalette.additionalCurves[0],
        });
        this.own(board.create("segment", [mover, centre], {
            strokeColor: GraphPalette.additionalCurves[0], strokeWidth: 1, fixed: true, highlight: false, withLabel: false, visible: circleShown,
        }));

        // The tangent and normal axes: thin dashed lines through the point while the acceleration is split. Each is the part of the line inside the board.
        for (const normal of [false, true]) {
            const axis = curve(() => {
                const e = regularEv();
                if (!e) return [[], []];
                const {left, top, ux, uy} = this.scaleOf();
                const right = left + board.canvasWidth / ux;
                const bottom = top - board.canvasHeight / uy;
                const limit = top;
                const dx = (normal ? -e.velocity[1] : e.velocity[0]) / e.speed;
                const dy = (normal ? e.velocity[0] : e.velocity[1]) / e.speed;
                // Clip the line point + s * (dx, dy) to left <= x <= right, bottom <= y <= limit.
                let lo = -Infinity;
                let hi = Infinity;
                for (const [p, d, min, max] of [[e.point[0], dx, left, right], [e.point[1], dy, bottom, limit]] as const) {
                    if (Math.abs(d) < 1e-12) { if (p < min || p > max) return [[], []]; continue; }
                    const [s1, s2] = [(min - p) / d, (max - p) / d];
                    lo = Math.max(lo, Math.min(s1, s2));
                    hi = Math.min(hi, Math.max(s1, s2));
                }
                if (!(lo < hi) || !Number.isFinite(lo) || !Number.isFinite(hi)) return [[], []];
                return [[e.point[0] + lo * dx, e.point[0] + hi * dx], [e.point[1] + lo * dy, e.point[1] + hi * dy]];
            }, {strokeColor: GraphPalette.label, strokeWidth: 1, dash: 3, visible: watch(() => state().split && regular())}); if (!normal) this.drawnElements.set("axes", axis);
        }
    }

    /**
     * The osculating circle at the current time: radius 1/|kappa|, centre on the side the path turns to (the left normal for kappa > 0). Undefined when
     * the switch is off, at a cusp, on a straight stretch, and when the radius exceeds OSCULATING_RADIUS_FRAMES board sizes (a circle that large is not a
     * picture of the bend).
     */
    osculatingCircleNow(): {readonly centre: readonly [number, number]; readonly radius: number} | undefined {
        if (!this.state.osculating) return undefined;
        const e = this.evaluation();
        if (e.kind !== "regular" || !Number.isFinite(e.kappa) || e.kappa === 0) return undefined;
        const radius = 1 / Math.abs(e.kappa);
        const [left, top, right, bottom] = this.frame();
        if (!(radius <= OSCULATING_RADIUS_FRAMES * Math.max(right - left, top - bottom))) return undefined;
        const nx = -e.velocity[1] / e.speed;
        const ny = e.velocity[0] / e.speed;
        return {centre: [e.point[0] + nx / e.kappa, e.point[1] + ny / e.kappa], radius};
    }

    /** The unit of a scale in the current language, resolved when it is drawn (the derived data holds no language). */
    private unitOf(kind: "velocity" | "acceleration"): string {
        return t(kind === "velocity" ? "kinematics_graph_unit_speed" : "kinematics_graph_unit_accel");
    }

    private disposeScene(): void {
        if (this.hasBoard) {
            const board = this.board;
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.drawnElements.clear();
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
        if (this.timeValue >= this.derived().tEnd) {
            this.timeValue = 0;
            // Attribute the restart to the learner's Play before the lease starts, or the later notify would end that lease.
            this.timeListeners.forEach(listener => listener());
        }
        this.playingValue = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.useLease({arbiter: () => this.parameters, keys: ["kinematics-time"], onInterrupted: () => this.halt()});
        this.driver.play();
        // The learner holds the time (dragging its slider): the driver did not start, so the control stays paused.
        if (!this.driver.isRunning()) {
            this.halt();
            return;
        }
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
            this.notice = {state, message: message(key)};
        } else if (motionKey(previous) !== motionKey(state)) {
            const end = this.derived().tEnd;
            if (this.timeValue > end) {
                this.halt();
                this.timeValue = end;
                this.notice = {state, message: message("kinematics_graph_notice_clamped", {value0: messageNumber(end, 2)})};
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
        if (time !== undefined && !valid) this.notice = {state: this.state, message: message("kinematics_graph_notice_time_refused")};
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
        if (this.notice && this.notice.state === this.state) parts.push(renderMessage(this.notice.message));
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

    // ---- Declaration -----------------------------------------------------------------------------------------------------

    /** Whether the arrow of a vector is drawn now: its switch is on, the motion has a direction where one is needed, and it is longer than a thousandth of the full arrow. */
    private arrowDrawn(name: "v" | "a" | "at" | "an"): boolean {
        const state = this.state;
        const e = this.evaluation();
        if (name === "a") return state.showAcceleration && Math.hypot(...e.acceleration) / this.derived().scales.acceleration.step > MIN_ARROW;
        if (e.kind !== "regular" || !(name === "v" ? state.showVelocity : state.split)) return false;
        const vector = name === "v" ? e.velocity : name === "at" ? componentVectors(e).tangential : componentVectors(e).normal;
        return Math.hypot(vector[0], vector[1]) / this.derived().scales[name === "v" ? "velocity" : "acceleration"].step > MIN_ARROW;
    }

    /** The numeric pucks that apply to the motion: the launch speed and angle of the projectile, the radius, angular velocity and speed variation of the circular motion. */
    private fieldPucks(): readonly NumericField[] {
        return this.state.motion === "projectile" ? ["v0", "alpha"] : this.state.motion === "circular" ? ["radius", "omega", "b"] : [];
    }

    /** The two switches are pucks where a lesson step flips them (the paths); on the circular motion they stay in Orodja, which keeps the strip short. */
    private switchPucks(): boolean {
        return this.state.motion !== "circular";
    }

    /**
     * Pure data from the state and the cached derivation. Parameters: the time always, and only the numbers the motion uses (the launch speed and angle, or the radius,
     * the angular velocity and the speed variation), with the two switches that a step flips as pucks on the other motions, so the strip holds about four at most. Rows
     * are the readout rows; the legend names what is drawn now; notes carry the status wording; the frame is the path box with the room of one arrow.
     */
    protected override declaration(): GraphDeclaration<KinematicsIds> {
        const state = this.state;
        const derived = this.derived();
        const e = this.evaluation();
        const regular = e.kind === "regular" ? e : undefined;
        const fieldRange = (field: NumericField) => ({kind: "range" as const, min: FIELD_RANGES[field].min, max: FIELD_RANGES[field].max, step: FIELD_RANGES[field].step, placement: "board" as const});
        const parameters: ParameterDeclaration<KinematicsIds["param"]>[] = [
            {key: "kinematics-time", kind: "range", label: message("kinematics_name_time"), symbol: "t", placement: "board", min: 0, max: derived.tEnd, step: TIME_STEP,
                bigStep: TIME_BIG_STEP, maxDecimals: 2, unit: message("kinematics_graph_unit_s")},
        ];
        for (const field of this.fieldPucks()) {
            switch (field) {
                case "v0": parameters.push({key: "kinematics-v0", label: message("kinematics_name_v0"), symbol: "v_0", unit: message("kinematics_graph_unit_speed"), bigStep: 5, maxDecimals: 0, ...fieldRange(field)}); break;
                case "alpha": parameters.push({key: "kinematics-alpha", label: message("kinematics_name_alpha"), symbol: "\\alpha", unit: message("kinematics_unit_degree"), bigStep: 15, maxDecimals: 0, ...fieldRange(field)}); break;
                case "radius": parameters.push({key: "kinematics-radius", label: message("kinematics_name_radius"), symbol: "R", unit: message("kinematics_graph_unit_m"), bigStep: 1, maxDecimals: 1, ...fieldRange(field)}); break;
                case "omega": parameters.push({key: "kinematics-omega", label: message("kinematics_name_omega"), symbol: "\\omega", unit: message("kinematics_unit_omega"), bigStep: 1, maxDecimals: 2, ...fieldRange(field)}); break;
                case "b": parameters.push({key: "kinematics-b", label: message("kinematics_name_b"), symbol: "b", help: message("kinematics_graph_b_help"), bigStep: 0.25, maxDecimals: 2, ...fieldRange(field)}); break;
            }
        }
        const vector = (value: readonly [number, number], unit: keyof typeof UNIT_KEYS): Message => message("kinematics_graph_vector_value", {
            value0: messageNumber(value[0], 3), value1: messageNumber(value[1], 3), value2: message(UNIT_KEYS[unit])});
        const quantity = (value: number, unit: keyof typeof UNIT_KEYS, digits = 3) => ({value: messageNumber(value, digits), unit: message(UNIT_KEYS[unit])});
        const none = message("kinematics_graph_not_defined");
        const drawn = {v: this.arrowDrawn("v"), a: this.arrowDrawn("a"), at: this.arrowDrawn("at"), an: this.arrowDrawn("an")};
        const rows: ReadoutRow<KinematicsIds>[] = [
            {id: "time", name: message("kinematics_graph_r_time"), ...quantity(e.t, "s", 2)},
            {id: "position", name: message("kinematics_graph_r_position"), value: vector(e.point, "m"), legend: "point"},
            {id: "velocity", name: message("kinematics_graph_r_velocity"), value: vector(e.velocity, "speed"), ...(drawn.v ? {legend: "velocity" as const} : {})},
            {id: "speed", name: message("kinematics_graph_r_speed"), ...quantity(e.speed, "speed")},
            {id: "acceleration", name: message("kinematics_graph_r_acceleration"), value: vector(e.acceleration, "accel"), ...(drawn.a ? {legend: "acceleration" as const} : {})},
            {id: "a-t", name: message("kinematics_graph_r_at"), ...(regular ? quantity(regular.aT, "accel") : {value: none}), ...(drawn.at ? {legend: "tangential" as const} : {})},
            {id: "a-n", name: message("kinematics_graph_r_an"), ...(regular ? quantity(regular.aN, "accel") : {value: none}), ...(drawn.an ? {legend: "normal" as const} : {})},
            {id: "kappa", name: message("kinematics_graph_r_kappa"), ...(regular ? quantity(regular.kappa, "curv") : {value: none})},
            {id: "kappa-v2", name: message("kinematics_graph_r_kappa_v2"), ...(regular ? quantity(regular.kappaSpeedSquared, "accel") : {value: none})},
        ];
        if (state.motion === "circular") rows.push({id: "period", name: message("kinematics_graph_r_period"), ...quantity(derived.tEnd, "s")});
        if (derived.summary) {
            rows.push(
                {id: "flight", name: message("kinematics_graph_r_flight"), ...quantity(derived.summary.flightTime, "s")},
                {id: "range", name: message("kinematics_graph_r_range"), ...quantity(derived.summary.range, "m")},
                {id: "height", name: message("kinematics_graph_r_height"), ...quantity(derived.summary.maxHeight, "m")},
                {id: "gravity", name: message("kinematics_graph_r_g"), ...quantity(GRAVITY, "accel", 2)},
            );
        }
        const scale = (kind: "velocity" | "acceleration"): Message => message("kinematics_graph_r_scale_value", {
            value0: messageNumber(derived.scales.unit, 2), value1: messageNumber(derived.scales[kind].step, 3), value2: message(kind === "velocity" ? "kinematics_graph_unit_speed" : "kinematics_graph_unit_accel")});
        if (state.showVelocity) rows.push({id: "scale-velocity", name: message("kinematics_graph_r_scale_velocity"), value: scale("velocity")});
        if (state.showAcceleration || state.split) rows.push({id: "scale-acceleration", name: message("kinematics_graph_r_scale_acceleration"), value: scale("acceleration")});

        const wording = e.kind === "singular" || this.standstill() ? "kinematics_graph_status_cusp"
            : e.status === "constant-speed" ? "kinematics_graph_status_constant" : e.status === "speeding-up" ? "kinematics_graph_status_speeding"
                : e.status === "slowing-down" ? "kinematics_graph_status_slowing" : "kinematics_graph_status_stationary";
        const notes: ReadoutNote<KinematicsIds>[] = [{id: "status", text: message(wording)}];
        if (this.notice && this.notice.state === state) notes.push({id: "notice", text: this.notice.message});
        if (e.t >= derived.tEnd && !this.playingValue) notes.push({id: "ended", text: message("kinematics_graph_status_ended", {value0: messageNumber(e.t, 2)})});
        if (state.osculating && regular && this.osculatingCircleNow() === undefined) notes.push({id: "osculating-far", text: message("kinematics_note_osculating_far"), tone: "muted"});
        notes.push({id: "sign", text: message("kinematics_graph_sign_hint"), tone: "muted"});

        const legend: LegendEntry<KinematicsIds>[] = [
            {id: "path", label: message("kinematics_legend_path"), kind: "line", object: "path"},
            ...(state.trace ? [{id: "trace" as const, label: message("kinematics_legend_trace"), kind: "line" as const, object: "trace"}] : []),
            {id: "point", label: message("kinematics_legend_point"), kind: "point", object: "point"},
            ...(state.motion === "circular" && state.b > 0 ? [{id: "reference" as const, label: message("kinematics_legend_reference"), kind: "ring" as const, object: "reference"}] : []),
            ...(drawn.v ? [{id: "velocity" as const, label: message("kinematics_legend_velocity"), kind: "line" as const, object: "velocity"}] : []),
            ...(drawn.a ? [{id: "acceleration" as const, label: message("kinematics_legend_acceleration"), kind: "dashed" as const, object: "acceleration"}] : []),
            ...(drawn.at ? [{id: "tangential" as const, label: message("kinematics_legend_tangential"), kind: "dashed" as const, object: "tangential"}] : []),
            ...(drawn.an ? [{id: "normal" as const, label: message("kinematics_legend_normal"), kind: "dashed" as const, object: "normal"}] : []),
            ...(this.osculatingCircleNow() ? [{id: "osculating" as const, label: message("kinematics_legend_osculating"), kind: "line" as const, object: "osculating"}] : []),
            ...(state.split && regular ? [{id: "axes" as const, label: message("kinematics_legend_axes"), kind: "dashed" as const, object: "axes"}] : []),
        ];
        const actions: ActionDeclaration<KinematicsIds>[] = [
            {id: "play-pause", label: message(this.playingValue ? "pause" : "play"), placement: "board", enabled: this.playingValue || !this.reducedMotion(),
                help: this.reducedMotion() ? message("playback_block_reduced_motion_time") : undefined},
            {id: "reset-time", label: message("reset"), placement: "board", enabled: this.playingValue || this.timeValue > 0},
            ...(this.switchPucks() ? [
                {id: "split" as const, label: message("kinematics_action_split"), placement: "board" as const, enabled: true, pressed: state.split, puck: true as const},
                {id: "osculating" as const, label: message("kinematics_action_osculating"), placement: "board" as const, enabled: true, pressed: state.osculating, puck: true as const},
            ] : []),
        ];
        const box = this.frame();
        const marks: ViewMarks = {must: [{kind: "box", left: box[0], top: box[1], right: box[2], bottom: box[3]}]};
        return {parameters, readouts: [{id: "values", title: message("kinematics_graph_readout_title"), rows}], notes, legend, actions, marks, followView: box};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawnElements.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it. It reads the attribute only: nothing is redrawn.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp(id === "point" ? "fillcolor" : "strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        if (id === "play-pause") runAs("learner", () => (this.playingValue ? this.pausePlayback() : this.play()));
        else if (id === "reset-time") runAs("learner", () => this.resetTime());
        else if (id === "split" || id === "osculating") runAs("learner", () => this.editToggle(id, !this.state[id]));
        else throw new Error("Unknown action");
    }

    /**
     * Parameter writes (ADR 0064). Keys: `kinematics-time` (the time, in range 0 to the end of the motion) and the numbers `kinematics-v0`, `-alpha`, `-radius`, `-omega`, `-b`
     * (on the field's grid inside its range). Writers: the pucks and Orodja (`learner`), lesson actions and scenes (`lesson`). Only the time animates: Play's frames move it as
     * `animation` under a lease; a learner or lesson write of the time ends the lease and `onInterrupted` halts the playback. A value outside the range is a `DomainError`
     * (never clamped); a value off the grid snaps to it; the speed variation b other than 0 is refused off the circular motion.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const bindings: Record<string, ParameterBinding> = {
            "kinematics-time": {
                read: () => this.timeValue,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.setTime(value)) {
                        throw new DomainError(message("kinematics_graph_time_rejected", {value0: messageNumber(this.derived().tEnd, 2)}));
                    }
                },
                subscribe: listener => {
                    this.timeListeners.add(listener);
                    return () => { this.timeListeners.delete(listener); };
                },
            },
        };
        for (const field of NUMERIC_FIELDS) {
            bindings[`kinematics-${field}`] = {
                read: () => this.state[field],
                apply: (value: unknown) => {
                    const range = FIELD_RANGES[field];
                    if (typeof value !== "number" || (field === "b" && this.state.motion !== "circular" && value !== 0) || !this.editNumber(field, value)) {
                        throw new DomainError(message("kinematics_value_refused", {value0: messageNumber(range.min, 2), value1: messageNumber(range.max, 2)}));
                    }
                },
            };
        }
        return bindings;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private slider(field: NumericField, labelKey: "kinematics_graph_v0_label" | "kinematics_graph_alpha_label" | "kinematics_graph_radius_label"
        | "kinematics_graph_omega_label" | "kinematics_graph_b_label", decimals: number, bigStep: number, help?: string): JSX.Element {
        const range = FIELD_RANGES[field];
        return <PuckOwned key={field} param={`kinematics-${field}`}><Slider customText={t(labelKey)} value={this.state[field]} step={range.step} bigStep={bigStep} min={range.min} max={range.max}
                       grid={range.step} decimals={decimals} fieldDecimals={decimals} help={help}
                       rejectedHint={t("kinematics_graph_field_rejected", {value0: dec(range.min, decimals), value1: dec(range.max, decimals)})}
                       onChange={value => this.editNumber(field, value)}/></PuckOwned>;
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
            <PuckOwned key="split" param="split"><BooleanField variant="switch" label={t("kinematics_graph_split")} help={t("kinematics_graph_split_help")}
                          checked={state.split} onChange={on => this.editToggle("split", on)}/></PuckOwned>,
            <PuckOwned key="osculating" param="osculating"><BooleanField variant="switch" label={t("kinematics_graph_osculating")} help={t("kinematics_graph_osculating_help")}
                          checked={state.osculating} onChange={on => this.editToggle("osculating", on)}/></PuckOwned>,
            <BooleanField key="trace" variant="switch" label={t("kinematics_graph_trace")} help={t("kinematics_graph_trace_help")}
                          checked={state.trace} onChange={on => this.editToggle("trace", on)}/>,
        );
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <KinematicsPlayback graph={this}/>
            {this.getGraphCommandsArea()}
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
        <PuckOwned param="kinematics-time"><Slider customText={text("kinematics_graph_time_label")} min={0} max={end} step={TIME_STEP} grid={TIME_STEP} bigStep={TIME_BIG_STEP} value={time}
                rejectedHint={text("kinematics_graph_time_rejected", {value0: params.value0})}
                valueText={value => `${dec(value, 2)} ${text("kinematics_graph_unit_s")}`} onChange={value => graph.setTime(value)}/></PuckOwned>
    </div>;
}

/** The status sentence, the labelled values and the one announcement region (silent while the motion plays). */
function KinematicsReadout(props: {graph: KinematicsGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <div className="inspector-group" data-declared-panel="">
        <ReadoutHeading>{text("kinematics_graph_readout_title")}</ReadoutHeading>
        <p data-kinematics-status="" data-readout-note="">{graph.statusText()}</p>
        <ReadoutList label={text("kinematics_graph_readout_title")} rows={graph.readoutRows()}/>
        <p data-kinematics-sign="" data-readout-note="">{text("kinematics_graph_sign_hint")}</p>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

export default KinematicsGraph;
