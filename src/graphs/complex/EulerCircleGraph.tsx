import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {SceneStateUpdate} from "../base/SceneStore";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {Preset, StoredGraphState} from "../base/presets/Presets";
import {DomainError} from "../functions/BaseFunctionGraph";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {formatArgument, formatComplex} from "../../analysis/complexFormat";
import {NumberInput} from "../../inputs/NumberInput";
import {BooleanField} from "../../inputs/BooleanField";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
import {legendStackOffsetPx, legendWrapExtraPx} from "../legend/legendStack";
import {keepOpeningView} from "./openingView";
import {GraphPalette} from "../styles/GraphPalette";
import {SceneObjects} from "../recursion/SceneObjects";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController} from "../../learning/runtime/iterationController";
import {
    accelerationScale, ANGLE_RANGE, applyEulerCircleAction, B_RANGE, B_STEP, DEFAULT_EULER_CIRCLE_STATE, DEGREE_RANGE, deriveEulerCircle,
    EulerCircleAction, EulerCircleDerived, EulerCircleState, ExactValue, exactTrig as exactTrigOf, exactValueOf, nextAngle, OMEGA_RANGE,
    parseEulerCircleState, snapDragAngle, snapDragSecondAngle, STEP_DEGREES, typedAngle, typedDegree, typedOmega, typedSecondAngle, VELOCITY_SCALE,
} from "../../complex/eulerCircleModel";
import {eulerCirclePresetCollection, eulerCirclePresetData, EulerCirclePresetData} from "./eulerCirclePresetCollection";

/** The scene state: the stored fields of `EulerCircleState`, nothing derived and no playback. */
export interface EulerCircleGraphState extends BaseGraphState, EulerCircleState {}

/** Time between two playback steps of `STEP_DEGREES` degrees. A playback setting, not stored: a reopened Preset is paused. */
export const STEP_INTERVAL_MS = 100;
export const HANDLE_SIZE = 6;
/** The board: the unit circle and the arrows in the upper part; the rows below hold the legend. */
export const VIEW_BOX: readonly [number, number, number, number] = [-2.2, 2.2, 2.2, -4.8];
/** The legend rows: the pitch between two visible rows, shrunk when the board is so low that the rows would pass its bottom edge. */
export const ROW_PX = 16;
const ROW_TEXT_PX = 14;
const LEGEND_TOP = -2.3;
/** The part of the opening board's height that the legend band takes (below the unit circle's frame). */
const LEGEND_BAND_FRACTION = (LEGEND_TOP - VIEW_BOX[3]) / (VIEW_BOX[1] - VIEW_BOX[3]);
const LEGEND_OFFSET_PX = 8;
/** Dash patterns of JSXGraph (index 1 is 2-2 dotted, 4 is 20-20 long dashes, 5 is 20-10-10-10 dash-dot); the legend names each in words and no two share one. */
export const UNIT_CIRCLE_DASH: number = 4;
export const PROJECTION_DASH = 1;
export const ACCELERATION_DASH = 5;
export const RADIUS_DASH = 0;
export const RADIUS_WIDTH = 1;
const ARROW_TYPE = 2;
const ARROW_SIZE = 6;
const CIRCLE_POINTS: number = 128;

const dec = (value: number, digits = 6): string => formatNumber(value, currentLanguage(), digits);

const sameContent = (a: EulerCircleState, b: EulerCircleState): boolean =>
    a.degrees === b.degrees && a.omega === b.omega && a.degree === b.degree && a.velocity === b.velocity && a.acceleration === b.acceleration
    && a.mode === b.mode && a.b === b.b;
/** The same fields except the angle: what a playing run may not have changed under it. */
const sameParameters = (a: EulerCircleState, b: EulerCircleState): boolean =>
    a.omega === b.omega && a.degree === b.degree && a.velocity === b.velocity && a.acceleration === b.acceleration
    && a.mode === b.mode && a.b === b.b;

type Visible = boolean | (() => boolean);
interface Point {
    readonly re: number;
    readonly im: number;
}

/**
 * The Euler-circle graph (complex-maps spec M7, ADR 0058): the point e^(i theta) = cos theta + i sin theta on the unit circle at a
 * whole number of degrees, uniform circular motion theta = omega t with the velocity i omega z and the acceleration -omega^2 z as
 * arrows, and the partial sum of degree N of the series for e^(i theta) with its distance from the point. The stored state is
 * `EulerCircleState`; everything else is derived (`derived()`), keyed on the state object. The time t = theta / omega is derived.
 *
 * The exact point is labelled exact where it is (multiples of 30 and 45 degrees, with 1, i, -1, -i as exact integers); every
 * other coordinate, the velocity, the acceleration, the speed, the angle between position and velocity, the partial sum and its
 * distance from the point are doubles and labelled computed. The velocity and acceleration are drawn at a stated fraction of their
 * length. The velocity statement is an argument from the definition; the series statement is Euler's theorem (cited, not proved);
 * the partial sum is an illustration. Nothing is claimed about e^z for complex z.
 *
 * Ownership: every board object goes through `scene`, which removes the objects and the drag listeners with the scene. The playback
 * is an `IterationController` created on demand and disposed with the scene and on unmount; it is not stored.
 */
export class EulerCircleGraph extends BaseGraph<EulerCircleGraphState, EulerCirclePresetData> {
    private readonly scene = new SceneObjects();
    private handle?: JXG.Point;
    private secondHandle?: JXG.Point;
    private built = false;
    private cache?: {state: EulerCircleGraphState; value: EulerCircleDerived};
    private controller?: IterationController;
    private derivations = 0;
    private readonly status = new SettledReadout();

    override getInitialState(): EulerCircleGraphState {
        return {initialized: false, ...DEFAULT_EULER_CIRCLE_STATE};
    }

    protected override lessonDefaultState(): EulerCircleGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    override presetCollection(): PresetCollection<EulerCirclePresetData> {
        return eulerCirclePresetCollection;
    }

    override defaultPreset(): EulerCirclePresetData {
        return eulerCirclePresetData(DEFAULT_EULER_CIRCLE_STATE);
    }

    /** A Preset keeps the whole state in `data`; its `graphState` only marks it initialized (the collection refuses any other field). */
    override exportPreset(): Preset<EulerCirclePresetData> {
        return {...super.exportPreset(), graphState: {initialized: true}};
    }

    /** A figure scene, Preset selection and Reset take the state from the data just imported, not from the stored `graphState`. */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined, data?: unknown): EulerCircleGraphState {
        const {degrees, omega, degree, velocity, acceleration, mode, b} = this.state;
        return {...super.figurePresetGraphState(graphState, data), degrees, omega, degree, velocity, acceleration, mode, b, initialized: true};
    }

    override exportPresetData(): EulerCirclePresetData {
        return eulerCirclePresetData(this.state);
    }

    override importPresetData(data: EulerCirclePresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "EulerCircle") return;
        // A Preset without the mode and the second angle gets their defaults; an invalid one is ignored (the collection refuses it first).
        const parsed = parseEulerCircleState(entry[1]);
        if (parsed.ok) this.setState({...parsed.value});
    }

    protected override initialView(): [number, number, number, number] {
        return [...VIEW_BOX];
    }

    // ---- Derived numbers: a cache keyed by the state object ---------------------------------------------------------------------

    derived(): EulerCircleDerived {
        const state = this.state;
        if (this.cache && this.cache.state === state) return this.cache.value;
        if (this.cache && sameContent(this.cache.state, state)) {
            this.cache = {state, value: this.cache.value};
            return this.cache.value;
        }
        this.derivations++;
        this.cache = {state, value: deriveEulerCircle(state)};
        return this.cache.value;
    }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    derivationCount(): number { return this.derivations; }
    dragHandle(): JXG.Point | undefined { return this.handle; }
    dragSecondHandle(): JXG.Point | undefined { return this.secondHandle; }
    isPlaying(): boolean { return this.controller?.isPlaying() ?? false; }

    // ---- Board ----------------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("euler_circle_graph_board_label"));
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
        if (this.hasBoard) keepOpeningView(this.board, session, () => this.showInitialView());
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => { this.disposeController(); this.status.cancel(); });
            session.registerCleanup(onLanguageChange(() => {
                this.status.replace(this.statusText());
                if (this.hasBoard && session.isAlive) this.board.update();
            }));
        }
        this.status.replace(this.statusText());
    }

    /** True while the playback's own tick writes the angle; a write at any other time while playing came from outside. */
    private ticking = false;
    private outsideWrite = false;

    override setState(update: SceneStateUpdate<EulerCircleGraphState>, callback?: () => void): void {
        if (!this.ticking && this.isPlaying()) this.outsideWrite = true;
        super.setState(update, callback);
    }

    protected override onStateChange(previous: Readonly<EulerCircleGraphState>): void {
        // A playing run moves the angle to the next step and nothing else, written by its own tick; any other write (a lesson action,
        // a restore), even to the next step, pauses it. A write that changes no stored field (the host's `initialized`) leaves a run alone.
        const outside = this.outsideWrite;
        this.outsideWrite = false;
        const changed = !sameContent(previous, this.state);
        if (this.isPlaying() && changed && (outside || !(sameParameters(previous, this.state) && this.state.degrees === nextAngle(previous.degrees)))) this.pausePlayback();
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.pausePlayback();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (!this.built) this.buildScene();
        this.placeHandle();
        this.board.update();
        this.status.report(this.statusText());
    }

    private placeHandle(): void {
        const p = this.derived().position;
        if (this.handle && (this.handle.X() !== p.re || this.handle.Y() !== p.im)) this.handle.setPosition(JXG.COORDS_BY_USER, [p.re, p.im]);
        const q = this.derived().product.second;
        if (this.secondHandle && (this.secondHandle.X() !== q.re || this.secondHandle.Y() !== q.im)) this.secondHandle.setPosition(JXG.COORDS_BY_USER, [q.re, q.im]);
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number} {
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy};
    }

    /** A straight piece from one board point to another; no arrow head. */
    private piece(from: () => Point, to: () => Point, color: string, width: number, dash: number, visible: Visible): JXG.Curve {
        return this.scene.own(this.board.create("curve", [
            (s: number) => from().re + s * (to().re - from().re), (s: number) => from().im + s * (to().im - from().im), 0, 1,
        ], {strokeColor: color, strokeWidth: width, dash, doAdvancedPlot: false, numberPoints: 2, highlight: false, fixed: true, withLabel: false, visible}));
    }

    /** The unit circle. */
    private ring(color: string, width: number, dash: number, visible: Visible): JXG.Curve {
        return this.scene.own(this.board.create("curve", [
            (s: number) => Math.cos(2 * Math.PI * s), (s: number) => Math.sin(2 * Math.PI * s), 0, 1,
        ], {strokeColor: color, strokeWidth: width, dash, doAdvancedPlot: false, numberPoints: CIRCLE_POINTS, highlight: false, fixed: true, withLabel: false, visible}));
    }

    /** A straight piece with an arrow head at its end. */
    private arrow(from: () => Point, to: () => Point, color: string, width: number, dash: number, visible: Visible): JXG.Curve {
        return this.scene.own(this.board.create("curve", [
            (s: number) => from().re + s * (to().re - from().re), (s: number) => from().im + s * (to().im - from().im), 0, 1,
        ], {
            strokeColor: color, strokeWidth: width, dash, lastArrow: {type: ARROW_TYPE, size: ARROW_SIZE}, doAdvancedPlot: false, numberPoints: 2,
            highlight: false, fixed: true, withLabel: false, visible,
        }));
    }

    /** A caption at a board point plus a pixel offset (up is positive); `dy` below the point is negative. */
    private caption(x: () => number, y: () => number, dx: number, dy: number | (() => number), text: () => string, color: string, options: {
        visible?: () => boolean; anchorX?: "left" | "right"; anchorY?: "top" | "bottom";
        /** A legend row: it gets the board's own background, so the axis and its tick labels do not run through its text. */
        legend?: boolean;
    } = {}): void {
        this.scene.own(this.board.create("text", [
            () => x() + dx / this.scaleOf().ux, () => y() + (typeof dy === "number" ? dy : dy()) / this.scaleOf().uy, text,
        ], {
            strokeColor: color, fontSize: 14, anchorX: options.anchorX ?? "left", anchorY: options.anchorY ?? "bottom", fixed: true, highlight: false, withLabel: false,
            ...(options.legend ? {cssStyle: "background: rgba(255, 253, 245, 0.88); padding: 0 2px; border-radius: 2px;"} : {}),
            parse: false, // the text holds e^(...), which JSXGraph would otherwise turn into a superscript of the bracket
            visible: options.visible ?? (() => true),
        }));
    }

    /** The tail of the velocity and acceleration arrows is the point; their tips are the point plus the scaled vectors. */
    private position = (): Point => this.derived().position;
    private velocityTip = (): Point => {
        const d = this.derived();
        return {re: d.position.re + VELOCITY_SCALE * d.velocity.re, im: d.position.im + VELOCITY_SCALE * d.velocity.im};
    };
    private accelerationTip = (): Point => {
        const d = this.derived();
        const scale = accelerationScale(this.state.omega);
        return {re: d.position.re + scale * d.acceleration.re, im: d.position.im + scale * d.acceleration.im};
    };

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        this.built = true;
        const velocityShown = () => this.state.velocity;
        const accelerationShown = () => this.state.acceleration;
        const sumShown = () => this.derived().partialInsideView;

        // The unit circle (dashed), the projections of the point on the axes (dotted), the velocity (solid) and acceleration (dashed) arrows.
        this.ring(GraphPalette.referenceCurve, 2, UNIT_CIRCLE_DASH, true);
        this.piece(this.position, () => ({re: this.position().re, im: 0}), GraphPalette.comparisonCurve, 2, PROJECTION_DASH, true);
        this.piece(this.position, () => ({re: 0, im: this.position().im}), GraphPalette.comparisonCurve, 2, PROJECTION_DASH, true);
        this.arrow(this.position, this.velocityTip, GraphPalette.additionalCurves[1], 2, 0, velocityShown);
        this.arrow(this.position, this.accelerationTip, GraphPalette.additionalCurves[2], 2, ACCELERATION_DASH, accelerationShown);

        // The product mode: the second point, the product point and the radii to the three points.
        const productShown = () => this.state.mode === "product";
        const origin = (): Point => ({re: 0, im: 0});
        const secondPoint = (): Point => this.derived().product.second;
        const productPoint = (): Point => this.derived().product.point;
        this.piece(origin, this.position, GraphPalette.referenceCurve, RADIUS_WIDTH, RADIUS_DASH, productShown);
        this.piece(origin, secondPoint, GraphPalette.referenceCurve, RADIUS_WIDTH, RADIUS_DASH, productShown);
        this.piece(origin, productPoint, GraphPalette.referenceCurve, RADIUS_WIDTH, RADIUS_DASH, productShown);
        this.scene.own(board.create("point", [() => productPoint().re, () => productPoint().im], {
            fixed: true, highlight: false, withLabel: false, name: "", face: "triangleUp", size: 6, fillColor: GraphPalette.additionalCurves[3],
            strokeColor: GraphPalette.pointOutline, showInfobox: false, visible: productShown,
        }));

        // The partial sum of the series (a diamond), not drawn when it is beyond the view.
        this.scene.own(board.create("point", [() => this.derived().partialSum.re, () => this.derived().partialSum.im], {
            fixed: true, highlight: false, withLabel: false, name: "", face: "diamond", size: 5, fillColor: GraphPalette.additionalCurves[0],
            strokeColor: GraphPalette.pointOutline, showInfobox: false, visible: sumShown,
        }));
        const start = this.derived().position;
        const handle = this.scene.own(board.create("point", [start.re, start.im], {
            withLabel: false, name: "", face: "circle", size: HANDLE_SIZE, fillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
        }));
        this.handle = handle;
        this.wireDrag(handle, "first");
        const startSecond = this.derived().product.second;
        const second = this.scene.own(board.create("point", [startSecond.re, startSecond.im], {
            withLabel: false, name: "", face: "square", size: HANDLE_SIZE, fillColor: GraphPalette.additionalCurves[4], strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false, visible: productShown,
        }));
        this.secondHandle = second;
        this.wireDrag(second, "second");

        // A caption for every element a readout names: the point, the arrows, the partial sum, and the legend of the styles.
        this.caption(() => this.position().re, () => this.position().im, 8, 8, () => t("euler_circle_graph_cap_point", {value0: this.pointText()}), GraphPalette.constructionAccent);
        this.caption(() => this.velocityTip().re, () => this.velocityTip().im, 6, 0, () => t("euler_circle_graph_cap_velocity_near"),
            GraphPalette.additionalCurves[1], {visible: velocityShown});
        this.caption(() => this.accelerationTip().re, () => this.accelerationTip().im, 6, 0, () => t("euler_circle_graph_cap_acceleration_near"),
            GraphPalette.additionalCurves[2], {visible: accelerationShown});
        this.caption(() => this.derived().partialSum.re, () => this.derived().partialSum.im, 8, -6, () => t("euler_circle_graph_cap_sum_near", {value0: String(this.state.degree)}),
            GraphPalette.additionalCurves[0], {visible: sumShown, anchorY: "top"});
        this.caption(() => secondPoint().re, () => secondPoint().im, 8, 8, () => t("euler_circle_graph_cap_second", {value0: this.secondText()}),
            GraphPalette.additionalCurves[4], {visible: productShown});
        this.caption(() => productPoint().re, () => productPoint().im, 8, -8, () => t("euler_circle_graph_cap_product", {value0: this.productText()}),
            GraphPalette.additionalCurves[3], {visible: productShown, anchorY: "top"});
        // The legend stacks only the visible rows, from the top down, anchored at the live bottom-left corner of the board (pixel offsets, so a pan or zoom keeps it there); the pitch of a one-line row is
        // shrunk so that the last one stays inside the board, and a row that wraps takes its lines.
        const shown: Array<{text: () => string; visible: () => boolean}> = [];
        const states = () => shown.map(row => ({text: row.text(), visible: row.visible()}));
        const rowOffset = (index: number): number => {
            const rows = states();
            const visibleRows = rows.filter(row => row.visible).length;
            const width = this.board.canvasWidth;
            const room = LEGEND_BAND_FRACTION * this.board.canvasHeight - LEGEND_OFFSET_PX - ROW_TEXT_PX - legendWrapExtraPx(rows, width, ROW_PX);
            const pitch = visibleRows > 1 && Number.isFinite(room) ? Math.min(ROW_PX, Math.max(room, 0) / (visibleRows - 1)) : ROW_PX;
            // Pixels above the bottom edge of the live board: the rows below this one stack under it, so a pan or zoom keeps the legend at the edge.
            return LEGEND_OFFSET_PX + legendStackOffsetPx(rows, rows.length, width, pitch) - legendStackOffsetPx(rows, index, width, pitch);
        };
        const row = (text: () => string, color: string, visible: () => boolean = () => true) => {
            const index = shown.length;
            shown.push({text, visible});
            this.caption(() => this.board.getBoundingBox()[0], () => this.board.getBoundingBox()[3], 10, () => rowOffset(index), text, color, {anchorY: "top", visible, legend: true});
        };
        row(() => t("euler_circle_graph_cap_unit", {value0: t("euler_circle_graph_style_dashed")}), GraphPalette.referenceCurve);
        row(() => t("euler_circle_graph_cap_projections", {value0: t("euler_circle_graph_style_dotted")}), GraphPalette.comparisonCurve);
        row(() => t("euler_circle_graph_cap_handle", {value0: t("euler_circle_graph_style_circle")}), GraphPalette.constructionAccent);
        row(() => t("euler_circle_graph_cap_velocity", {value0: dec(VELOCITY_SCALE, 1), value1: t("euler_circle_graph_style_solid_arrow")}),
            GraphPalette.additionalCurves[1], velocityShown);
        row(() => t("euler_circle_graph_cap_acceleration", {value0: dec(accelerationScale(this.state.omega), 5), value1: t("euler_circle_graph_style_dashed_arrow")}),
            GraphPalette.additionalCurves[2], accelerationShown);
        row(() => t("euler_circle_graph_cap_sum", {value0: String(this.state.degree), value1: t("euler_circle_graph_style_diamond")}),
            GraphPalette.additionalCurves[0], sumShown);
        row(() => t("euler_circle_graph_cap_sum_out", {value0: String(this.state.degree)}), GraphPalette.label, () => !this.derived().partialInsideView);
        row(() => t("euler_circle_graph_cap_second_handle", {value0: t("euler_circle_graph_style_square")}), GraphPalette.additionalCurves[4], productShown);
        row(() => t("euler_circle_graph_cap_product_legend", {value0: t("euler_circle_graph_style_triangle")}), GraphPalette.additionalCurves[3], productShown);
        row(() => t("euler_circle_graph_cap_radii", {value0: t("euler_circle_graph_style_thin_line")}), GraphPalette.referenceCurve, productShown);
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.handle = undefined;
        this.secondHandle = undefined;
        this.built = false;
    }

    // ---- Dragging: the point snaps to the nearest whole degree of the circle ---------------------------------------------------

    private wireDrag(point: JXG.Point, which: "first" | "second"): void {
        const onDrag = () => (which === "first" ? this.dragTo(point) : this.dragSecondTo(point));
        const board = this.board;
        const onOver = () => { board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { board.containerObj.style.cursor = "default"; };
        point.on("drag", onDrag);
        point.on("over", onOver);
        point.on("out", onOut);
        this.scene.listen(() => { point.off("drag", onDrag); point.off("over", onOver); point.off("out", onOut); });
    }

    /** Drag only: the angle snaps to the nearest whole degree (typed values are refused instead); a non-finite or central position is ignored. */
    private dragTo(point: JXG.Point): void {
        const degrees = snapDragAngle(point.X(), point.Y());
        if (degrees === undefined) {
            this.placeHandle();
            return;
        }
        this.pausePlayback();
        if (degrees !== this.state.degrees) this.setState({degrees});
        this.placeHandle();
    }

    /** Drag of the second point: it snaps to the nearest multiple of `B_STEP` degrees; a non-finite or central position is ignored. */
    private dragSecondTo(point: JXG.Point): void {
        const b = snapDragSecondAngle(point.X(), point.Y());
        if (b !== undefined && b !== this.state.b) this.edit({b});
        this.placeHandle();
    }

    // ---- Playback -------------------------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private disposeController(): void {
        this.controller?.dispose();
        this.controller = undefined;
    }

    /** The controller counts the steps from theta = 0; it is kept in step with the stored angle (a write from outside moved it). */
    private syncedController(): IterationController {
        this.controller ??= new IterationController({
            transition: () => {
                const degrees = nextAngle(this.state.degrees);
                this.ticking = true;
                try { this.setState({degrees}); } finally { this.ticking = false; }
                this.requestRender();
                return degrees >= ANGLE_RANGE.max ? "complete" : "continue";
            },
            stepIntervalMs: STEP_INTERVAL_MS,
            maxIterations: ANGLE_RANGE.max / STEP_DEGREES,
            onComplete: () => this.requestRender(),
            scheduler: this.animationScheduler(),
        });
        const iteration = Math.floor(this.state.degrees / STEP_DEGREES);
        if (this.controller.iteration !== iteration) this.controller.reset(iteration);
        return this.controller;
    }

    /** A figure export captures the paused angle, not a frame of a running playback. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Stops the playback; the angle stays where it is. */
    override pausePlayback(): void {
        if (!this.controller?.isPlaying()) return;
        this.controller.pause();
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the stored angle on; at 360 degrees there is nothing to play (Reset goes back). Under reduced motion nothing plays: the Play button says so and Next step stays available. */
    play(): void {
        if (this.isPlaying() || !this.hasBoard || !this.graphSession?.isAlive || this.state.degrees >= ANGLE_RANGE.max) return;
        if (this.reducedMotion()) return;
        this.syncedController().play();
        this.requestRender();
    }

    stepOnce(): void {
        this.pausePlayback();
        if (this.state.degrees >= ANGLE_RANGE.max) return;
        this.syncedController().nextStep();
        this.requestRender();
    }

    /** Back to theta = 0; omega, the series degree and the arrows stay. */
    resetRun(): void {
        this.pausePlayback();
        this.setState({degrees: ANGLE_RANGE.min});
        this.controller?.reset(0);
        this.requestRender();
    }

    // ---- Editing from the panel and scene actions: typed values are refused when invalid; only the drag snaps -----------------

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<EulerCircleState>): void {
        this.pausePlayback();
        this.setState(patch);
        this.requestRender();
    }

    /** A typed angle: a whole number of degrees from 0 to 360, otherwise refused (false), never rounded or clamped. */
    editAngle(value: number): boolean {
        const checked = typedAngle(value);
        if (!checked.ok) return false;
        if (checked.value !== this.state.degrees) this.edit({degrees: checked.value});
        return true;
    }

    editOmega(value: number): boolean {
        const checked = typedOmega(value);
        if (!checked.ok) return false;
        if (checked.value !== this.state.omega) this.edit({omega: checked.value});
        return true;
    }

    editDegree(value: number): boolean {
        const checked = typedDegree(value);
        if (!checked.ok) return false;
        if (checked.value !== this.state.degree) this.edit({degree: checked.value});
        return true;
    }

    editSecondAngle(value: number): boolean {
        const checked = typedSecondAngle(value);
        if (!checked.ok) return false;
        if (checked.value !== this.state.b) this.edit({b: checked.value});
        return true;
    }

    setProductMode(on: boolean): void {
        this.edit({mode: on ? "product" : "motion"});
    }

    setVectors(patch: {velocity?: boolean; acceleration?: boolean}): void {
        this.edit(patch);
    }

    /**
     * Applies one scene action (`set-angle`, `set-omega`, `set-degree`, `set-vectors`, `step`) synchronously: the state is written
     * before the call returns, so the next action reads it from `this.state`. An invalid payload is a lesson-content error and
     * throws a `DomainError` naming the field.
     */
    act(action: EulerCircleAction): void {
        const result = applyEulerCircleAction(this.state, action);
        if (!result.ok) throw new DomainError(`${result.error.field}: ${result.error.reason}`);
        this.edit({...result.value});
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------------

    /** An exact trigonometric value as text: 0, 1, 1/2, √2/2, −√3/2 (sign, root and denominator by catalog patterns). */
    private exactText(v: ExactValue): string {
        if (v.sign === 0) return dec(0, 0);
        const top = v.radicand === 1 ? dec(1, 0) : t("euler_circle_graph_value_root", {value0: dec(v.radicand, 0)});
        const body = v.denominator === 1 ? top : t("euler_circle_graph_value_fraction", {value0: top, value1: dec(v.denominator, 0)});
        return v.sign < 0 ? t("euler_circle_graph_value_negative", {value0: body}) : body;
    }

    /** A coordinate: the exact value (with its rounded decimal when it has a root) where there is one, else the computed decimal. */
    private coordinateText(exact: ExactValue | undefined, computed: number): string {
        if (exact === undefined) return dec(computed, 7);
        return exact.radicand === 1 ? this.exactText(exact)
            : t("euler_circle_graph_value_with_decimal", {value0: this.exactText(exact), value1: dec(exactValueOf(exact), 7)});
    }

    private pair(first: string, second: string): string {
        return t("euler_circle_graph_value_pair", {value0: first, value1: second});
    }

    /** A computed vector as "a + bi" with seven decimals, like every other computed value of this graph (the spec lists (−1; 1,7320508)). */
    private vectorText(z: Point): string {
        const re = dec(z.re, 7);
        const im = dec(z.im, 7);
        if (im === "0") return re;
        const magnitude = im.startsWith("−") ? im.slice(1) : im;
        const part = `${magnitude === "1" ? "" : magnitude}i`;
        if (re === "0") return im.startsWith("−") ? `−${part}` : part;
        return `${re} ${im.startsWith("−") ? "−" : "+"} ${part}`;
    }

    /** The point as (cos; sin): exact texts where exact, rounded doubles otherwise. */
    private pointText(): string {
        const d = this.derived();
        return d.exact === undefined ? formatComplex(d.position, currentLanguage()) : this.pair(this.exactText(d.exact.cos), this.exactText(d.exact.sin));
    }

    private secondText(): string {
        const q = this.derived().product.second;
        const exact = exactTrigOf(this.state.b);
        return exact === undefined ? formatComplex(q, currentLanguage()) : this.pair(this.exactText(exact.cos), this.exactText(exact.sin));
    }

    /** The product point as (cos; sin) of the reduced sum: exact texts where exact, else doubles of seven digits (the row says computed). */
    private productText(): string {
        const {point, exact} = this.derived().product;
        return exact === undefined ? this.pair(dec(point.re, 7), dec(point.im, 7)) : this.pair(this.exactText(exact.cos), this.exactText(exact.sin));
    }

    private word(exact: boolean): string {
        return t(exact ? "euler_circle_graph_word_exact" : "euler_circle_graph_word_computed");
    }

    /** The status sentence: where the point is, the partial sum and its distance from the point. */
    statusText(): string {
        const d = this.derived();
        const lang = currentLanguage();
        const angle = dec(this.state.degrees, 0);
        return [
            d.exact === undefined
                ? t("euler_circle_graph_status_computed", {value0: angle, value1: formatComplex(d.position, lang)})
                : t("euler_circle_graph_status_exact", {value0: angle, value1: this.pointText()}),
            t("euler_circle_graph_status_sum", {value0: String(this.state.degree), value1: formatComplex(d.partialSum, lang), value2: formatSignificant(d.error, lang, 3)}),
            this.state.mode === "product" ? this.productStatus() : "",
            d.partialInsideView ? "" : t("euler_circle_graph_status_out"),
        ].filter(Boolean).join(" ");
    }

    private productStatus(): string {
        const {reducedDegrees, exact} = this.derived().product;
        return t(exact === undefined ? "euler_circle_graph_status_product_computed" : "euler_circle_graph_status_product_exact",
            {value0: dec(reducedDegrees, 0), value1: this.productText()});
    }

    readoutRows(): ReadoutListRow[] {
        const d = this.derived();
        const lang = currentLanguage();
        const {degree} = this.state;
        const none = "";
        const rows: ReadoutListRow[] = [
            {id: "angle", label: t("euler_circle_graph_r_angle"), value: t("euler_circle_graph_value_angle", {value0: dec(this.state.degrees, 0), value1: formatArgument(d.radians, lang, none)})},
            {id: "omega", label: t("euler_circle_graph_r_omega"), value: dec(this.state.omega, 0)},
            {id: "time", label: t("euler_circle_graph_r_time"), value: formatArgument(d.time, lang, none)},
            {id: "period", label: t("euler_circle_graph_r_period"), value: formatArgument(d.period, lang, none)},
            {id: "cos", label: t("euler_circle_graph_r_cos", {value0: this.word(d.exact !== undefined)}), value: this.coordinateText(d.exact?.cos, d.position.re)},
            {id: "sin", label: t("euler_circle_graph_r_sin", {value0: this.word(d.exact !== undefined)}), value: this.coordinateText(d.exact?.sin, d.position.im)},
        ];
        if (this.state.velocity) {
            rows.push(
                {id: "velocity", label: t("euler_circle_graph_r_velocity"), value: this.vectorText(d.velocity)},
                {id: "speed", label: t("euler_circle_graph_r_speed"), value: dec(d.speed, 6)},
                {id: "between", label: t("euler_circle_graph_r_between"), value: t("euler_circle_graph_value_degrees", {value0: dec(d.angleBetween, 4)})},
            );
        }
        if (this.state.mode === "product") {
            const {sumDegrees, reducedDegrees, exact} = d.product;
            const first = dec(this.state.degrees, 0);
            const second = dec(this.state.b, 0);
            rows.push(
                {id: "b", label: t("euler_circle_graph_r_b"), value: t("euler_circle_graph_value_degrees", {value0: second})},
                {id: "sum-angle", label: t("euler_circle_graph_r_sum_angle"), value: sumDegrees === reducedDegrees
                    ? t("euler_circle_graph_value_sum_angle", {value0: first, value1: second, value2: dec(sumDegrees, 0)})
                    : t("euler_circle_graph_value_sum_angle_reduced", {value0: first, value1: second, value2: dec(sumDegrees, 0), value3: dec(reducedDegrees, 0)})},
                {id: "second", label: t("euler_circle_graph_r_second", {value0: this.word(exactTrigOf(this.state.b) !== undefined)}), value: this.secondText()},
                {id: "product", label: t("euler_circle_graph_r_product", {value0: this.word(exact !== undefined)}), value: this.productText()},
            );
        }
        if (this.state.acceleration) rows.push({id: "acceleration", label: t("euler_circle_graph_r_acceleration"), value: this.vectorText(d.acceleration)});
        rows.push(
            {id: "sum", label: t("euler_circle_graph_r_sum", {value0: String(degree)}), value: formatComplex(d.partialSum, lang)},
            {id: "point", label: t("euler_circle_graph_r_point", {value0: this.word(d.exact !== undefined)}), value: this.pointText()},
            {id: "error", label: t("euler_circle_graph_r_error", {value0: String(degree)}), value: formatSignificant(d.error, lang, 3)},
        );
        if (!d.partialInsideView) rows.push({id: "out", label: t("euler_circle_graph_r_out", {value0: String(degree)}), value: t("euler_circle_graph_value_out")});
        return rows;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        const angleArgs = {value0: dec(ANGLE_RANGE.min, 0), value1: dec(ANGLE_RANGE.max, 0)};
        const omegaArgs = {value0: dec(OMEGA_RANGE.min, 0), value1: dec(OMEGA_RANGE.max, 0)};
        const bArgs = {value0: dec(B_RANGE.min, 0), value1: dec(B_RANGE.max, 0), value2: dec(B_STEP, 0)};
        const degreeArgs = {value0: dec(DEGREE_RANGE.min, 0), value1: dec(DEGREE_RANGE.max, 0)};
        return [
            <NumberInput key="angle" label={t("euler_circle_graph_angle_label")} value={this.state.degrees} step={1} bigStep={STEP_DEGREES} min={ANGLE_RANGE.min}
                         max={ANGLE_RANGE.max} decimals={0} integer help={t("euler_circle_graph_angle_help", angleArgs)}
                         rejectedHint={t("euler_circle_graph_angle_rejected", angleArgs)} onChange={value => this.editAngle(value)}/>,
            <NumberInput key="omega" label={t("euler_circle_graph_omega_label")} value={this.state.omega} step={1} bigStep={1} min={OMEGA_RANGE.min}
                         max={OMEGA_RANGE.max} decimals={0} integer help={t("euler_circle_graph_omega_help", omegaArgs)}
                         rejectedHint={t("euler_circle_graph_omega_rejected", omegaArgs)} onChange={value => this.editOmega(value)}/>,
            <NumberInput key="degree" label={t("euler_circle_graph_degree_label")} value={this.state.degree} step={1} bigStep={5} min={DEGREE_RANGE.min}
                         max={DEGREE_RANGE.max} decimals={0} integer help={t("euler_circle_graph_degree_help", degreeArgs)}
                         rejectedHint={t("euler_circle_graph_degree_rejected", degreeArgs)} onChange={value => this.editDegree(value)}/>,
            <BooleanField key="mode" variant="checkbox" checked={this.state.mode === "product"} label={t("euler_circle_graph_mode_label")}
                          help={t("euler_circle_graph_mode_help")} onChange={checked => this.setProductMode(checked)}/>,
            ...(this.state.mode === "product" ? [
                <NumberInput key="b" label={t("euler_circle_graph_b_label")} value={this.state.b} step={B_STEP} bigStep={B_STEP * 6} min={B_RANGE.min}
                             max={B_RANGE.max} decimals={0} integer help={t("euler_circle_graph_b_help", bArgs)}
                             rejectedHint={t("euler_circle_graph_b_rejected", bArgs)} onChange={value => this.editSecondAngle(value)}/>,
            ] : []),
            <BooleanField key="velocity" variant="checkbox" checked={this.state.velocity} label={t("euler_circle_graph_velocity_label")}
                          help={t("euler_circle_graph_velocity_help")} onChange={checked => this.setVectors({velocity: checked})}/>,
            <BooleanField key="acceleration" variant="checkbox" checked={this.state.acceleration} label={t("euler_circle_graph_acceleration_label")}
                          help={t("euler_circle_graph_acceleration_help")} onChange={checked => this.setVectors({acceleration: checked})}/>,
        ];
    }

    protected override workspaceEdit(): React.ReactNode {
        const {degrees} = this.state;
        const playing = this.isPlaying();
        const blocks = playbackBlocks({atStart: degrees === ANGLE_RANGE.min, atEnd: degrees >= ANGLE_RANGE.max, playing});
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReducedMotion>{() =>
                    <PlaybackButtons placement="graph" groupLabel={t("euler_circle_graph_playback_group")} nextLabel={t("next_step")} resetLabel={t("reset")}
                                     playing={playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (playing) this.pausePlayback(); else this.play(); }}
                                     onReset={() => this.resetRun()} {...blocks} playBlock={blocks.playBlock ?? (!playing && this.reducedMotion() ? "reduced-motion" : undefined)}
                                     reducedMotionReason={t("playback_block_reduced_motion_next_step")}/>}
                </ReducedMotion>
                <ReadoutHeading>{t("euler_circle_graph_readout_title")}</ReadoutHeading>
                <p data-euler-status="">{this.statusText()}</p>
                <ReadoutList label={t("euler_circle_graph_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status} muted={playing}/>
            </div>
        </>;
    }
}

export default EulerCircleGraph;
