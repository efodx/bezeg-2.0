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
import {ToolSection} from "../../../inputs/ToolSection";
import {pickOn} from "../../../uxPicks/picks";
import type {GraphUx, LegendEntry, ReadoutNote, ReadoutRow} from "../../../uxPicks/declare/graphUx";
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

const boardTextOnBoard = (): boolean => !pickOn("boardText");

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

/** The least height in pixels the path box keeps under the captions, however many rows they take. */
const MIN_PATH_PX = 120;

/** Points of the drawn osculating circle, and the largest radius drawn, in sizes of the board frame (above it the circle is not drawn). */
const OSCULATING_SAMPLES = 180;
const OSCULATING_RADIUS_FRAMES = 2;

/** One text row of a caption, in pixels (14 px type), and the widest an average character of it is. */
const CAPTION_ROW_PX = 20;
const CAPTION_CHAR_PX = 7.5;

/** Boards narrower than this set the captions in a smaller type (12 px) so the stack leaves the path its room. */
const COMPACT_BOARD_PX = 500;

/** The pixel size of an arrow tag, from its character count (a subscript letter is a narrow glyph) and the font size. */
export function tagSize(text: string, fontSize: number): {w: number; h: number} {
    return {w: Math.ceil(text.length * 0.6 * fontSize) + 4, h: Math.ceil(fontSize * 1.25) + 2};
}

/** The type of the captions on a board `width` px wide: font size, row height and the widest an average character is, in pixels. */
export function captionMetrics(width: number): {fontSize: number; rowPx: number; charPx: number} {
    return width < COMPACT_BOARD_PX ? {fontSize: 12, rowPx: 16, charPx: 6.4} : {fontSize: 14, rowPx: CAPTION_ROW_PX, charPx: CAPTION_CHAR_PX};
}

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
export function captionLines(text: string, room: number, charPx: number = CAPTION_CHAR_PX): number {
    return Math.max(1, Math.ceil((text.length * charPx) / Math.max(room, 100)));
}

/**
 * The board rectangle [left, top, right, bottom] for a motion: the path box, a margin of one full arrow, and room on top for the captions. Without `captions`
 * the room is a fixed share of the path. With them (`roomPx` of the caption stack on a board `widthPx` by `heightPx`) the frame has exactly the aspect of the
 * board and keeps `roomPx` clear above the path box, so the path takes what is left of the board.
 */
export function frameFor(derived: KinematicsDerived, captions?: {readonly roomPx: number; readonly widthPx: number; readonly heightPx: number}): [number, number, number, number] {
    const [minX, maxX, minY, maxY] = derived.box;
    const extent = Math.max(maxX - minX, maxY - minY, 1e-6);
    const margin = derived.scales.unit + 0.05 * extent;
    if (!captions || !(captions.widthPx > 0) || !(captions.heightPx > 0)) return [minX - margin, maxY + margin + CAPTION_ROOM * extent, maxX + margin, minY - margin];
    const width = maxX - minX + 2 * margin;
    const height = maxY - minY + 2 * margin;
    const room = Math.min(captions.roomPx, captions.heightPx - MIN_PATH_PX);
    // Pixels per board unit: the path box with its margin must fit the width and the height left under the captions.
    const scale = Math.min(captions.widthPx / width, (captions.heightPx - room) / height);
    const bottom = minY - margin;
    const middle = (minX + maxX) / 2;
    const half = captions.widthPx / (2 * scale);
    return [middle - half, bottom + captions.heightPx / scale, middle + half, bottom];
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
    /** The caption texts and the font size they are set in (a narrow board sets them smaller; the board width can change after the build). */
    private captionTexts: JXG.Text[] = [];
    private captionFontSize = 14;
    private frameCache?: {derived: KinematicsDerived; key: string; value: [number, number, number, number]};
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
        if (this.keepImportedView) this.drawnFrame = this.frame(deriveKinematics(imported), imported).map(value => value.toFixed(4)).join(",");
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): KinematicsGraphState {
        const parsed = parseKinematicsState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    private reframeOnBuild = false;

    /** The bare frame; every use of the initial view (a new board, Reset, a Preset without a view) is framed again with the room of the captions once the scene stands. */
    protected override initialView(): [number, number, number, number] {
        this.reframeOnBuild = true;
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
            // A resize of the board (the session's observer ends in `setBoundingBox`, which fires `boundingbox`): the caption type, the wrap and the
            // caption room of the frame follow the new size, and the frame is drawn again once for it. Panning and zooming keep the size and are left alone.
            let size = `${this.board.canvasWidth}x${this.board.canvasHeight}`;
            const board = this.board;
            const onBoundingBox = () => {
                const now = `${board.canvasWidth}x${board.canvasHeight}`;
                if (now === size) return;
                size = now;
                if (!this.hasBoard || !this.graphSession?.isAlive) return;
                this.applyFrame();
                this.boardUpdate();
            };
            board.on("boundingbox", onBoundingBox);
            session.registerCleanup(() => board.off("boundingbox", onBoundingBox));
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
            if (this.reframeOnBuild) {
                this.reframeOnBuild = false;
                this.drawnFrame = "";
                this.applyFrame();
            }
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
        const {fontSize} = captionMetrics(this.board.canvasWidth);
        if (fontSize !== this.captionFontSize) {
            this.captionFontSize = fontSize;
            const attributes: JXG.TextAttributes = {fontSize};
            for (const text of this.captionTexts) text.setAttribute(attributes);
        }
        const key = this.visibilityProbes.map(probe => probe() ? "1" : "0").join("");
        if (key !== this.visibilityKey) {
            this.visibilityKey = key;
            this.board.fullUpdate();
        } else this.board.update();
    }

    private frameKey(): string {
        return this.frame().map(value => value.toFixed(4)).join(",");
    }

    /**
     * The frame of the derived data with the room the caption stack of this board takes: every caption the switches can show (so the time never reframes),
     * wrapped at the room the captions have beside the y axis of the frame. Captions only grow with the room narrowing, so a few passes settle it.
     */
    private frame(derived: KinematicsDerived = this.derived(), state: KinematicsState = this.state): [number, number, number, number] {
        const key = `${state.motion}|${state.trace}|${state.showVelocity}|${state.showAcceleration}|${state.split}|${state.osculating}|${state.b}|${t("kinematics_graph_cap_point")}|${this.hasBoard ? this.board.canvasWidth : 0}|${this.hasBoard ? this.board.canvasHeight : 0}`;
        const cached = this.frameCache;
        if (cached && cached.derived === derived && cached.key === key) return cached.value;
        const value = this.computeFrame(derived, state);
        this.frameCache = {derived, key, value};
        return value;
    }

    private computeFrame(derived: KinematicsDerived, state: KinematicsState): [number, number, number, number] {
        const width = this.hasBoard ? this.board.canvasWidth : 0;
        const height = this.hasBoard ? this.board.canvasHeight : 0;
        if (!(width > 0) || !(height > 0)) return frameFor(derived);
        const reserved = this.captionStack(state).filter(caption => caption.reserve());
        const type = captionMetrics(width);
        const rowsIn = (room: number) => reserved.reduce((sum, caption) => sum + Math.max(...caption.texts().map(text => captionLines(text, room, type.charPx))), 0);
        let rows = rowsIn(Math.max(width - 20, 100));
        let frame = frameFor(derived, {roomPx: 10 + rows * type.rowPx, widthPx: width, heightPx: height});
        for (let pass = 0; pass < 4; pass++) {
            const axisPx = ((0 - frame[0]) * width) / (frame[2] - frame[0]);
            const next = rowsIn(captionPlacement(axisPx, width).room);
            if (next <= rows) break;
            rows = next;
            frame = frameFor(derived, {roomPx: 10 + rows * type.rowPx, widthPx: width, heightPx: height});
        }
        return frame;
    }

    /** Frames the board once per frame key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyFrame(): void {
        const frame = this.frame();
        const key = frame.map(value => value.toFixed(4)).join(",");
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
        const arrows: readonly {name: keyof typeof vector; key: "tip_v" | "tip_a" | "tip_at" | "tip_an"; color: string; dash: number; width: number; shown: () => boolean}[] = [
            {name: "v", key: "tip_v", color: GraphPalette.comparisonCurve, dash: 0, width: 3, shown: () => state().showVelocity && regular()},
            {name: "a", key: "tip_a", color: GraphPalette.constructionAccent, dash: 2, width: 3, shown: () => state().showAcceleration},
            {name: "at", key: "tip_at", color: GraphPalette.additionalCurves[3], dash: 1, width: 2, shown: () => state().split && regular()},
            {name: "an", key: "tip_an", color: GraphPalette.additionalCurves[2], dash: 4, width: 2, shown: () => state().split && regular()},
        ];
        // The tags stand at the arrow tips, placed in pixels by the shared label placer so that none runs into another, into an arrowhead,
        // into the moving point or into a shaft. The layout is cached by its inputs: at most 4 tags x 48 candidates x (4 tips and about 60 shaft samples) per change, nothing on a frame that moves no tip.
        let captionBlock: () => PxBox | undefined = () => undefined;
        let tagCache: {key: string; boxes: Record<string, PxBox>} | undefined;
        const tagLayout = (): Record<string, PxBox> => {
            const {ux, uy, left, top} = this.scaleOf();
            const width = board.canvasWidth, height = board.canvasHeight;
            const toPx = (x: number, y: number): [number, number] => [(x - left) * ux, (top - y) * uy];
            const fontSize = this.styles.point.namedLabel.fontSize();
            const shown = arrows.filter(arrow => arrow.shown() && longEnough(arrow.name)());
            const point = toPx(...ev().point);
            const tips = shown.map(arrow => ({arrow, tip: toPx(...endOf(arrow.name)())}));
            const block = captionBlock();
            const ticks = this.tickNumberBoxes(toPx, left, top, width, height, ux, uy);
            const key = [width, height, ux, uy, left, top, fontSize, currentLanguage(), point, block ? block.y1 : 0,
                this.displaySettings.tickNumbersVisible(), this.displaySettings.fontSize, ticks.length, tips.map(({arrow, tip}) => `${arrow.name}${tip}`)].join("|");
            if (tagCache?.key === key) return tagCache.boxes;
            const samples = tips.flatMap(({tip}) => sampleLine([point[0], tip[0]], [point[1], tip[1]], (x, y) => [x, y], width * 4, height * 4, 5, 60));
            const items: TagItem[] = tips.map(({arrow, tip}) => ({id: arrow.name, tip, ...tagSize(t(`kinematics_graph_${arrow.key}`), fontSize)}));
            const strips = [{x0: 0, y0: top * uy, x1: width, y1: top * uy + 22}, {x0: (0 - left) * ux - 40, y0: 0, x1: (0 - left) * ux, y1: height}];
            let boxes = placeArrowTags(items, {width, height, point, samples, block, strips, blocks: ticks});
            // A tick number costs a spot more than a shaft, so where the numbers would force two tags onto each other the tags are placed as before.
            const placed = Object.values(boxes);
            if (placed.length < items.length || placed.some((a, i) => placed.slice(i + 1).some(b => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0))) {
                boxes = placeArrowTags(items, {width, height, point, samples, block, strips});
            }
            tagCache = {key, boxes};
            return boxes;
        };
        for (const arrow of arrows) {
            const visible = watch(() => arrow.shown() && longEnough(arrow.name)());
            const end = dot(() => endOf(arrow.name)()[0], () => endOf(arrow.name)()[1], () => false);
            this.own(board.create("arrow", [mover, end], {
                strokeColor: arrow.color, strokeWidth: arrow.width, dash: arrow.dash, fixed: true, highlight: false, withLabel: false, visible,
            }));
            const corner = (): PxBox => tagLayout()[arrow.name] ?? {x0: 0, y0: 0, x1: 0, y1: 0};
            this.own(board.create("text", [() => this.scaleOf().left + corner().x0 / this.scaleOf().ux, () => this.scaleOf().top - corner().y0 / this.scaleOf().uy,
                // The name of the vector, typeset at the compact size of the named labels (M03).
                () => pointLabelMath(t(`kinematics_graph_${arrow.key}`))], {
                strokeColor: arrow.color, fontSize: this.styles.point.namedLabel.fontSize, useMathJax: true, parse: false, anchorX: "left", anchorY: "top",
                fixed: true, highlight: false, withLabel: false, visible,
            }) as JXG.Text);
        }

        // The osculating circle needs a direction; the tangent and normal axes (below, after the captions) too.
        curve(() => {
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
        }, {strokeColor: GraphPalette.additionalCurves[0], strokeWidth: 2, visible: watch(() => this.osculatingCircleNow() !== undefined)});
        // The centre (a small fixed point) and the radius: a thin segment from the moving point to the centre, in the circle's colour.
        const circleShown = watch(() => this.osculatingCircleNow() !== undefined);
        const centre = dot(() => this.osculatingCircleNow()?.centre[0] ?? 0, () => this.osculatingCircleNow()?.centre[1] ?? 0, circleShown, {
            size: 3, showInfobox: false, strokeColor: GraphPalette.additionalCurves[0], fillColor: GraphPalette.additionalCurves[0],
        });
        this.own(board.create("segment", [mover, centre], {
            strokeColor: GraphPalette.additionalCurves[0], strokeWidth: 1, fixed: true, highlight: false, withLabel: false, visible: circleShown,
        }));

        // The captions: stacked from the top left of the screen, only the visible ones take a row. They name every element a readout names.
        const captions = this.captionStack();
        // The captions stand clear of the y-axis tick labels (`captionPlacement`): right of the axis, or left of its labels on the wider side.
        const placement = () => { const {left, ux} = this.scaleOf(); return captionPlacement((0 - left) * ux, board.canvasWidth); };
        const type = () => captionMetrics(board.canvasWidth);
        this.captionTexts = [];
        this.captionFontSize = type().fontSize;
        captions.forEach((caption, index) => {
            // A caption wider than its room wraps: the rows above add up the lines each takes, so none runs into the next.
            const rows = () => captions.slice(0, index).filter(other => other.visible()).reduce((sum, other) => sum + captionLines(other.text(), placement().room, type().charPx), 0);
            const text = this.own(board.create("text", [
                () => { const {left, ux} = this.scaleOf(); return left + placement().indent / ux; },
                () => { const {top, uy} = this.scaleOf(); return top - (10 + rows() * type().rowPx) / uy; },
                () => caption.text(),
            ], {strokeColor: caption.color, fontSize: type().fontSize, anchorX: "left", anchorY: "top", fixed: true, highlight: false, withLabel: false, visible: watch(caption.visible)}) as JXG.Text);
            this.captionTexts.push(text);
        });

        // The tangent and normal axes: thin dashed lines through the point while the acceleration is split, cut off under the caption stack so that no
        // axis runs through caption text. Each is the part of the line inside the board and below the last caption row.
        const captionBottomPx = () => 10 + captions.filter(caption => caption.visible()).reduce((sum, caption) => sum + captionLines(caption.text(), placement().room, type().charPx), 0) * type().rowPx;
        captionBlock = () => captions.some(caption => caption.visible()) ? {x0: 0, y0: 0, x1: placement().indent + placement().room, y1: captionBottomPx()} : undefined;
        for (const normal of [false, true]) {
            curve(() => {
                const e = regularEv();
                if (!e) return [[], []];
                const {left, top, ux, uy} = this.scaleOf();
                const right = left + board.canvasWidth / ux;
                const bottom = top - board.canvasHeight / uy;
                const limit = top - (captionBottomPx() + 4) / uy;
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
            }, {strokeColor: GraphPalette.label, strokeWidth: 1, dash: 3, visible: watch(() => state().split && regular())});
        }
    }

    /**
     * The osculating circle at the current time: radius 1/|kappa|, centre on the side the path turns to (the left normal for kappa > 0). Undefined when
     * the switch is off, at a cusp, on a straight stretch, and when the radius exceeds OSCULATING_RADIUS_FRAMES board sizes (a circle that large is not a
     * picture of the bend; the caption says so).
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

    /**
     * The caption rows, top to bottom. `visible` is what shows now; `reserve` is what the switches in `reserved` (the stored state) can show at some time, which is
     * what the frame keeps room for. `texts` are the texts a row can take (the osculating row has two).
     */
    private captionStack(reserved: KinematicsState = this.state): readonly {text: () => string; texts: () => string[]; visible: () => boolean; reserve: () => boolean; color: string}[] {
        const live = () => this.state;
        const regular = () => this.evaluation().kind === "regular";
        const referenceVisible = () => live().motion === "circular" && live().b > 0;
        const row = (text: () => string, visible: () => boolean, color: string, reserve: boolean | (() => boolean) = visible, texts?: () => string[]) =>
            ({text, texts: texts ?? (() => [text()]), visible: () => boardTextOnBoard() && visible(), reserve: () => boardTextOnBoard() && (typeof reserve === "boolean" ? reserve : reserve()), color});
        const r = reserved;
        return [
            row(() => t("kinematics_graph_cap_point"), () => true, GraphPalette.primaryCurve, true),
            row(() => t("kinematics_graph_cap_path"), () => true, GraphPalette.label, true),
            row(() => t("kinematics_graph_cap_trace"), () => live().trace, GraphPalette.primaryCurve, r.trace),
            row(() => this.scaleCaption("velocity"), () => live().showVelocity, GraphPalette.comparisonCurve, r.showVelocity),
            row(() => this.scaleCaption("acceleration"), () => live().showAcceleration || live().split, GraphPalette.constructionAccent, r.showAcceleration || r.split),
            row(() => t("kinematics_graph_cap_components"), () => live().split, GraphPalette.additionalCurves[3], r.split),
            row(() => t("kinematics_graph_cap_sign"), () => live().split, GraphPalette.additionalCurves[2], r.split),
            row(() => t("kinematics_graph_cap_axes"), () => live().split && regular(), GraphPalette.label, r.split),
            row(() => t("kinematics_graph_cap_osculating"), () => this.osculatingCircleNow() !== undefined, GraphPalette.additionalCurves[0], r.osculating,
                () => [t("kinematics_graph_cap_osculating"), t("kinematics_graph_cap_osculating_far")]),
            row(() => t("kinematics_graph_cap_osculating_far"), () => live().osculating && regular() && this.osculatingCircleNow() === undefined, GraphPalette.label, false),
            row(() => t("kinematics_graph_cap_reference"), referenceVisible, GraphPalette.constructionAccent, r.motion === "circular" && r.b > 0),
            row(() => t("kinematics_graph_cap_gravity", {value0: dec(GRAVITY, 2)}), () => live().motion === "projectile", GraphPalette.label, r.motion === "projectile"),
            row(() => t("kinematics_graph_cap_cusp"), () => (live().showVelocity && this.standstill()) || ((live().split || live().osculating) && !regular()), GraphPalette.label,
                r.motion === "cycloid" && (r.showVelocity || r.split || r.osculating)),
        ];
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
        this.captionTexts = [];
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
        if (pickOn("boardText")) this.requestRender(); // the readout card is declared from the graph, not from host state
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

    /** A vector as undelimited TeX with decimal commas: the same numbers as `vectorText`. */
    private vectorTex(vector: readonly [number, number], unit: "m" | "speed" | "accel"): string {
        const tex = (value: number) => dec(value, 3).replace(/,/g, "{,}");
        const unitTex = {m: "\\mathrm{m}", speed: "\\mathrm{m/s}", accel: "\\mathrm{m/s^2}"}[unit];
        return `\\left(${tex(vector[0])};\\ ${tex(vector[1])}\\right)\\,${unitTex}`;
    }

    protected override workspaceUx(): GraphUx | undefined {
        if (!pickOn("boardText")) return undefined;
        const state = this.state;
        const derived = this.derived();
        const e = this.evaluation();
        const regular = e.kind === "regular";
        const rows = new Map(this.readoutRows().map(row => [row.id, row]));
        const row = (id: string, extra: Partial<ReadoutRow> = {}): ReadoutRow[] => {
            const base = rows.get(id);
            return base && typeof base.label === "string" && typeof base.value === "string" ? [{id, name: base.label, value: base.value, ...extra}] : [];
        };
        const showAcceleration = state.showAcceleration;
        const velocityDrawn = state.showVelocity && !this.standstill();
        const splitDrawn = state.split && regular;
        const osculating = this.osculatingCircleNow() !== undefined;
        const legend: LegendEntry[] = [
            {id: "point", label: t("kinematics_graph_cap_point"), kind: "point", color: GraphPalette.primaryCurve},
            {id: "path", label: t("kinematics_graph_cap_path"), kind: "line", color: GraphPalette.referenceCurve},
            ...(state.trace ? [{id: "trace", label: t("kinematics_graph_cap_trace"), kind: "line" as const, color: GraphPalette.primaryCurve}] : []),
            ...(velocityDrawn ? [{id: "velocity", label: this.scaleCaption("velocity"), kind: "line" as const, color: GraphPalette.comparisonCurve}] : []),
            ...(showAcceleration ? [{id: "acceleration", label: this.scaleCaption("acceleration"), kind: "dashed" as const, color: GraphPalette.constructionAccent}] : []),
            ...(splitDrawn ? [
                {id: "at", label: t("kinematics_graph_r_at"), kind: "dashed" as const, color: GraphPalette.additionalCurves[3]},
                {id: "an", label: t("kinematics_graph_r_an"), kind: "dashed" as const, color: GraphPalette.additionalCurves[2]},
                {id: "axes", label: t("kinematics_graph_cap_axes"), kind: "line" as const, color: GraphPalette.label},
            ] : []),
            ...(osculating ? [{id: "osculating", label: t("kinematics_graph_cap_osculating"), kind: "line" as const, color: GraphPalette.additionalCurves[0]}] : []),
            ...(state.motion === "circular" && state.b > 0 ? [{id: "reference", label: t("kinematics_graph_cap_reference"), kind: "point" as const, color: GraphPalette.constructionAccent}] : []),
        ];
        const ended = e.t >= derived.tEnd && !this.playingValue;
        const notes: ReadoutNote[] = [
            {id: "status", text: this.sentence(), tone: "muted"},
            ...(ended ? [{id: "ended", text: t("kinematics_graph_status_ended", {value0: dec(e.t, 2)}), tone: "muted" as const}] : []),
            {id: "sign", text: t("kinematics_graph_sign_hint"), tone: "muted"},
            ...(state.osculating && regular && !osculating ? [{id: "osculating-far", text: t("kinematics_graph_cap_osculating_far"), tone: "muted" as const}] : []),
            ...((state.showVelocity && this.standstill()) || ((state.split || state.osculating) && !regular)
                ? [{id: "cusp", text: t("kinematics_graph_cap_cusp"), tone: "muted" as const}] : []),
        ];
        const pucks = state.motion === "projectile" ? ["v0", "alpha"] : state.motion === "circular" ? ["radius", "omega", "b"] : [];
        return {
            pucks: [
                {param: "kinematics.t", help: t("kinematics_graph_motion_help")},
                ...pucks.map(field => ({param: `kinematics.${field}`, help: field === "b" ? t("kinematics_graph_b_help") : t("kinematics_graph_motion_help")})),
            ],
            readouts: [
                {id: "values", title: t("kinematics_graph_readout_title"), rows: [
                    ...row("time"),
                    ...row("position", {valueTex: this.vectorTex(e.point, "m"), legend: "point"}),
                    ...row("velocity", {valueTex: this.vectorTex(e.velocity, "speed"), legend: velocityDrawn ? "velocity" : undefined}),
                    ...row("speed"),
                    ...row("acceleration", {valueTex: this.vectorTex(e.acceleration, "accel"), legend: showAcceleration ? "acceleration" : undefined}),
                ]},
                {id: "parts", title: "Razcep pospeška", rows: [
                    ...row("a-t", {legend: splitDrawn ? "at" : undefined}),
                    ...row("a-n", {legend: splitDrawn ? "an" : undefined}),
                    ...row("kappa", {legend: osculating ? "osculating" : undefined}),
                    ...row("kappa-v2"),
                ]},
                {id: "motion", title: "Gibanje", rows: [...row("period"), ...row("flight"), ...row("range"), ...row("height"), ...row("gravity")]},
                {id: "scales", title: "Merili", rows: [...row("scale-velocity"), ...row("scale-acceleration")]},
            ].filter(group => group.rows.length > 0),
            notes,
            legend,
        };
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private slider(field: NumericField, labelKey: "kinematics_graph_v0_label" | "kinematics_graph_alpha_label" | "kinematics_graph_radius_label"
        | "kinematics_graph_omega_label" | "kinematics_graph_b_label", decimals: number, bigStep: number, help?: string): JSX.Element {
        const range = FIELD_RANGES[field];
        return <Slider key={field} paramKey={`kinematics.${field}`} customText={t(labelKey)} value={this.state[field]} step={range.step} bigStep={bigStep} min={range.min} max={range.max}
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
            <BooleanField key="osculating" variant="switch" label={t("kinematics_graph_osculating")} help={t("kinematics_graph_osculating_help")}
                          checked={state.osculating} onChange={on => this.editToggle("osculating", on)}/>,
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
    return <ToolSection id="kinematics-time" pickTitle={text("kinematics_graph_playback_group")}>
        <PlaybackButtons reducedMotionReason={text("playback_block_reduced_motion_time")}
                         placement="graph" groupLabel={text("kinematics_graph_playback_group")} resetLabel={text("kinematics_graph_reset_label")}
                         playing={playing} onPlayPause={() => (graph.playing ? graph.pausePlayback() : graph.play())} onReset={() => graph.resetTime()}
                         {...blocks} playBlock={!playing && graph.reducedMotion() ? "reduced-motion" : undefined}/>
        <Slider paramKey="kinematics.t" customText={text("kinematics_graph_time_label")} min={0} max={end} step={TIME_STEP} grid={TIME_STEP} bigStep={TIME_BIG_STEP} value={time}
                rejectedHint={text("kinematics_graph_time_rejected", {value0: params.value0})}
                valueText={value => `${dec(value, 2)} ${text("kinematics_graph_unit_s")}`} onChange={value => graph.setTime(value)}/>
    </ToolSection>;
}

/** The status sentence, the labelled values and the one announcement region (silent while the motion plays). */
function KinematicsReadout(props: {graph: KinematicsGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    // The readout card shows the values and the sentences; only the announcement region stays in the panel.
    if (pickOn("boardText")) return <LiveReadout readout={graph.status} muted={graph.playing}/>;
    return <div className="inspector-group">
        <ReadoutHeading>{text("kinematics_graph_readout_title")}</ReadoutHeading>
        <p data-kinematics-status="">{graph.statusText()}</p>
        <ReadoutList label={text("kinematics_graph_readout_title")} rows={graph.readoutRows()}/>
        <p data-kinematics-sign="">{text("kinematics_graph_sign_hint")}</p>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

export default KinematicsGraph;
