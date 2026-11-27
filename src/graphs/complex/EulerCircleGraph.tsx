import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {SceneStateUpdate} from "../base/SceneStore";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {Preset, StoredGraphState} from "../base/presets/Presets";
import {DomainError} from "../functions/BaseFunctionGraph";
import {currentLanguage, isMessageNumber, message, messageNumber, onLanguageChange, renderMessage, t, type Message, type MessageNumber} from "../../localization";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned} from "../base/controls/PuckOwnership";
import type {ActionDeclaration, FormattedValue, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutRow, ViewMarks} from "../base/declare/graphDeclaration";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {formatArgument} from "../../analysis/complexFormat";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {BooleanField} from "../../inputs/BooleanField";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
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

/** What the graph declares (task 08): four number pucks, three switch pucks, the playback actions, nine legend entries and the readout rows. */
export type EulerCircleIds = {
    param: "euler-angle" | "euler-omega" | "euler-degree" | "euler-b";
    row: "angle" | "omega" | "time" | "period" | "cos" | "sin" | "velocity" | "speed" | "between" | "b" | "sum-angle" | "second" | "product" | "acceleration" | "sum" | "point" | "error" | "out";
    note: "status";
    legend: "unit" | "projections" | "point" | "velocity" | "acceleration" | "sum" | "second" | "product" | "radii";
    section: never;
    action: "next-step" | "play-pause" | "reset-run" | "show-velocity" | "show-acceleration" | "product-mode";
};
type EulerRow = {readonly id: EulerCircleIds["row"]; readonly name: Message; readonly value: Message | MessageNumber | FormattedValue};
const formatted = (text: string): FormattedValue => ({kind: "formatted", text});

/** The scene state: the stored fields of `EulerCircleState`, nothing derived and no playback. */
export interface EulerCircleGraphState extends BaseGraphState, EulerCircleState {}

/** Time between two playback steps of `STEP_DEGREES` degrees. A playback setting, not stored: a reopened Preset is paused. */
export const STEP_INTERVAL_MS = 100;
export const HANDLE_SIZE = 6;
/** The board: the unit circle and the arrows; the legend is a declared card, not a band of the board. */
export const VIEW_BOX: readonly [number, number, number, number] = [-2.2, 2.2, 2.2, -2.2];
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

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * The angle and the time are the exact multiples numerator·π/denominator (θ in whole degrees: θ = degrees·π/180, t = θ/ω). `formatArgument` names only
 * small denominators and otherwise returns a bare "≈ 0,1309", which a readout row would print as "= ≈ 0,1309"; here the exact fraction goes in front.
 */
function withPiFraction(text: string, numerator: number, denominator: number): string {
    if (!text.startsWith("≈ ") || numerator === 0) return text;
    const divisor = gcd(numerator, denominator);
    const top = numerator / divisor === 1 ? "π" : `${numerator / divisor}π`;
    const bottom = denominator / divisor;
    return `${bottom === 1 ? top : `${top}/${bottom}`} ${text}`;
}

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
    /** The elements the legend names, by the `object` id of their entry (`drawnObject`); rebuilt with the scene. */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

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
        const label = () => container.setAttribute("aria-label", t("euler_board_label"));
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
        if (this.hasBoard) keepOpeningView(this.board, session, () => runAs("learner", () => this.showInitialView())); // the view is a declared parameter: framing it again is tagged like Reset
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
        this.drawn.set("unit", this.ring(GraphPalette.referenceCurve, 2, UNIT_CIRCLE_DASH, true));
        this.drawn.set("projections", this.piece(this.position, () => ({re: this.position().re, im: 0}), GraphPalette.comparisonCurve, 2, PROJECTION_DASH, true));
        this.piece(this.position, () => ({re: 0, im: this.position().im}), GraphPalette.comparisonCurve, 2, PROJECTION_DASH, true);
        this.drawn.set("velocity", this.arrow(this.position, this.velocityTip, GraphPalette.additionalCurves[1], 2, 0, velocityShown));
        this.drawn.set("acceleration", this.arrow(this.position, this.accelerationTip, GraphPalette.additionalCurves[2], 2, ACCELERATION_DASH, accelerationShown));

        // The product mode: the second point, the product point and the radii to the three points.
        const productShown = () => this.state.mode === "product";
        const origin = (): Point => ({re: 0, im: 0});
        const secondPoint = (): Point => this.derived().product.second;
        const productPoint = (): Point => this.derived().product.point;
        this.drawn.set("radii", this.piece(origin, this.position, GraphPalette.referenceCurve, RADIUS_WIDTH, RADIUS_DASH, productShown));
        this.piece(origin, secondPoint, GraphPalette.referenceCurve, RADIUS_WIDTH, RADIUS_DASH, productShown);
        this.piece(origin, productPoint, GraphPalette.referenceCurve, RADIUS_WIDTH, RADIUS_DASH, productShown);
        this.drawn.set("product", this.scene.own(board.create("point", [() => productPoint().re, () => productPoint().im], {
            fixed: true, highlight: false, withLabel: false, name: "", face: "triangleUp", size: 6, fillColor: GraphPalette.additionalCurves[3],
            strokeColor: GraphPalette.pointOutline, showInfobox: false, visible: productShown,
        })));

        // The partial sum of the series (a diamond), not drawn when it is beyond the view.
        this.drawn.set("sum", this.scene.own(board.create("point", [() => this.derived().partialSum.re, () => this.derived().partialSum.im], {
            fixed: true, highlight: false, withLabel: false, name: "", face: "diamond", size: 5, fillColor: GraphPalette.additionalCurves[0],
            strokeColor: GraphPalette.pointOutline, showInfobox: false, visible: sumShown,
        })));
        const start = this.derived().position;
        const handle = this.scene.own(board.create("point", [start.re, start.im], {
            withLabel: false, name: "", face: "circle", size: HANDLE_SIZE, fillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
        }));
        this.handle = handle;
        this.drawn.set("point", handle);
        this.wireDrag(handle, "first");
        const startSecond = this.derived().product.second;
        const second = this.scene.own(board.create("point", [startSecond.re, startSecond.im], {
            withLabel: false, name: "", face: "square", size: HANDLE_SIZE, fillColor: GraphPalette.additionalCurves[4], strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false, visible: productShown,
        }));
        this.secondHandle = second;
        this.drawn.set("second", second);
        this.wireDrag(second, "second");
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.drawn.clear();
        this.handle = undefined;
        this.secondHandle = undefined;
        this.built = false;
    }

    // ---- Dragging: the point snaps to the nearest whole degree of the circle ---------------------------------------------------

    private wireDrag(point: JXG.Point, which: "first" | "second"): void {
        // A drag is a learner's write; JSXGraph's handler runs outside the DOM input tagging.
        const onDrag = () => runAs("learner", () => (which === "first" ? this.dragTo(point) : this.dragSecondTo(point)));
        const board = this.board;
        const releaseCursor = bindMovablePointCursor(point, board);
        point.on("drag", onDrag);
        this.scene.listen(() => { point.off("drag", onDrag); releaseCursor(); });
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
        // The frame is an `animation` write of the angle under the playback's lease (ADR 0064). A learner or lesson write of the angle, or a
        // lesson frame change, ends the lease and pauses.
        }).useLease({
            arbiter: () => this.parameters,
            keys: ["euler-angle"],
            onInterrupted: () => { if (this.graphSession?.isAlive) this.requestRender(); },
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

    // ---- Lesson actions -------------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`complex-euler`): `set-angle` the angle theta, `set-motion` omega and the two arrow toggles, `set-mode` the mode chooser (and the second angle `b`),
     * `set-series` the series degree N. The merged state goes through `parseEulerCircleState` (strict: nothing is snapped or clamped) before the write, so an off-grid or
     * out-of-range value is a lesson-content error and nothing is written. Only the changed fields are written, in one edit; a valid action pauses the playback and never starts it.
     */
    applyComplexEulerLessonAction(action: Extract<LessonAction, {kind: "complex-euler"}>): void {
        const {kind: _kind, operation: _operation, ...patch} = action;
        switch (action.operation) {
            case "set-angle":
                this.editStored("set-angle", patch, ["degrees"], ["degrees"]);
                return;
            case "set-motion":
                this.editStored("set-motion", patch, ["omega", "velocity", "acceleration"], []);
                return;
            case "set-mode":
                this.editStored("set-mode", patch, ["mode", "b"], ["mode"]);
                return;
            case "set-series":
                this.editStored("set-series", patch, ["degree"], ["degree"]);
                return;
            default: {
                const unsupported: never = action;
                throw new Error(`complex-euler: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    /** Validates the merged state first, then writes only the fields that change; unknown fields are refused. */
    private editStored(operation: string, patch: Readonly<Record<string, unknown>>, allowed: readonly (keyof EulerCircleState)[], required: readonly (keyof EulerCircleState)[]): void {
        const unknown = Object.keys(patch).filter(key => !allowed.some(field => field === key));
        if (unknown.length) throw new Error(`complex-euler ${operation}: no such field ${unknown.join(", ")}.`);
        const missing = required.find(key => patch[key] === undefined);
        if (missing) throw new Error(`complex-euler ${operation}: ${missing} is missing.`);
        const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        const parsed = parseEulerCircleState({...this.state, ...defined});
        if (!parsed.ok) throw new Error(`complex-euler ${operation}: ${parsed.error.field} is ${parsed.error.reason}.`);
        this.pausePlayback();
        const changed = allowed.filter(key => parsed.value[key] !== this.state[key]);
        if (changed.length) this.edit(Object.fromEntries(changed.map(key => [key, parsed.value[key]])));
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("complex-euler", action => this.applyComplexEulerLessonAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------------
    // Every value is a catalog message (nested messages for the exact values and the complex numbers); the panel and the board captions render them
    // as text, so the declaration, the panel and the captions never disagree.

    private render(value: Message | MessageNumber): string {
        return isMessageNumber(value) ? dec(value.value, value.maxDecimals) : renderMessage(value);
    }

    /** An exact trigonometric value as a message: 0, 1, 1/2, √2/2, −√3/2 (sign, root and denominator by catalog patterns). */
    private exactMessage(v: ExactValue): Message | MessageNumber {
        if (v.sign === 0) return messageNumber(0, 0);
        const top = v.radicand === 1 ? messageNumber(1, 0) : message("euler_circle_graph_value_root", {value0: messageNumber(v.radicand, 0)});
        const body = v.denominator === 1 ? top : message("euler_circle_graph_value_fraction", {value0: top, value1: messageNumber(v.denominator, 0)});
        return v.sign < 0 ? message("euler_circle_graph_value_negative", {value0: body}) : body;
    }

    /** A coordinate: the exact value (with its rounded decimal when it has a root) where there is one, else the computed decimal. */
    private coordinateMessage(exact: ExactValue | undefined, computed: number): Message | MessageNumber {
        if (exact === undefined) return messageNumber(computed, 7);
        return exact.radicand === 1 ? this.exactMessage(exact)
            : message("euler_circle_graph_value_with_decimal", {value0: this.exactMessage(exact), value1: messageNumber(exactValueOf(exact), 7)});
    }

    private pair(first: Message | MessageNumber, second: Message | MessageNumber): Message {
        return message("euler_circle_graph_value_pair", {value0: first, value1: second});
    }

    /** A complex number as "a + bi" with `digits` decimals ("1 + i", "−i", "0,5 − 1,25i", "2", "0"). */
    private complexMessage(z: Point, digits: number): Message | MessageNumber {
        const re = dec(z.re, digits);
        const im = dec(z.im, digits);
        if (im === "0") return messageNumber(z.re, digits);
        const negative = im.startsWith("−");
        const magnitude = negative ? im.slice(1) : im;
        const part = magnitude === "1" ? message("euler_complex_i") : message("euler_complex_imag", {value0: messageNumber(Math.abs(z.im), digits)});
        if (re === "0") return negative ? message("euler_circle_graph_value_negative", {value0: part}) : part;
        return negative ? message("euler_complex_minus", {value0: messageNumber(z.re, digits), value1: part})
            : message("euler_complex_plus", {value0: messageNumber(z.re, digits), value1: part});
    }

    /** The velocity and acceleration vectors: seven decimals, like every other computed value of this graph (the spec lists (−1; 1,7320508)). */
    private vectorMessage(z: Point): Message | MessageNumber {
        return this.complexMessage(z, 7);
    }

    /** The point as (cos; sin): exact texts where exact, rounded doubles otherwise. */
    private pointMessage(): Message | MessageNumber {
        const d = this.derived();
        return d.exact === undefined ? this.complexMessage(d.position, 4) : this.pair(this.exactMessage(d.exact.cos), this.exactMessage(d.exact.sin));
    }

    private secondMessage(): Message | MessageNumber {
        const q = this.derived().product.second;
        const exact = exactTrigOf(this.state.b);
        return exact === undefined ? this.complexMessage(q, 4) : this.pair(this.exactMessage(exact.cos), this.exactMessage(exact.sin));
    }

    /** The product point as (cos; sin) of the reduced sum: exact texts where exact, else doubles of seven digits (the row says computed). */
    private productMessage(): Message | MessageNumber {
        const {point, exact} = this.derived().product;
        return exact === undefined ? this.pair(messageNumber(point.re, 7), messageNumber(point.im, 7)) : this.pair(this.exactMessage(exact.cos), this.exactMessage(exact.sin));
    }

    private word(exact: boolean): Message {
        return exact ? message("euler_circle_graph_word_exact") : message("euler_circle_graph_word_computed");
    }

    /** The status sentence as a message: where the point is, the partial sum and its distance from the point, the product, the partial sum beyond the view. */
    statusMessage(): Message {
        const d = this.derived();
        const lang = currentLanguage();
        const angle = messageNumber(this.state.degrees, 0);
        const sentences: Message[] = [
            d.exact === undefined
                ? message("euler_circle_graph_status_computed", {value0: angle, value1: this.complexMessage(d.position, 4)})
                : message("euler_circle_graph_status_exact", {value0: angle, value1: this.pointMessage()}),
            message("euler_circle_graph_status_sum", {value0: messageNumber(this.state.degree, 0), value1: this.complexMessage(d.partialSum, 4), value2: formatSignificant(d.error, lang, 3)}),
        ];
        if (this.state.mode === "product") sentences.push(this.productStatus());
        if (!d.partialInsideView) sentences.push(message("euler_circle_graph_status_out"));
        return sentences.reduce((joined, sentence) => message("euler_status_join", {value0: joined, value1: sentence}));
    }

    /** The status sentence as text in the current language. */
    statusText(): string {
        return renderMessage(this.statusMessage());
    }

    private productStatus(): Message {
        const {reducedDegrees, exact} = this.derived().product;
        const parameters = {value0: messageNumber(reducedDegrees, 0), value1: this.productMessage()};
        return exact === undefined ? message("euler_circle_graph_status_product_computed", parameters) : message("euler_circle_graph_status_product_exact", parameters);
    }

    /** The rows of the readout as messages: the declaration's rows, and what the panel lists. */
    private rowSpecs(): EulerRow[] {
        const d = this.derived();
        const lang = currentLanguage();
        const {degree} = this.state;
        const none = "";
        const degreeNumber = messageNumber(degree, 0);
        const rows: EulerRow[] = [
            {id: "angle", name: message("euler_circle_graph_r_angle"), value: message("euler_circle_graph_value_angle", {value0: messageNumber(this.state.degrees, 0),
                value1: withPiFraction(formatArgument(d.radians, lang, none), this.state.degrees, 180)})},
            {id: "omega", name: message("euler_circle_graph_r_omega"), value: messageNumber(this.state.omega, 0)},
            {id: "time", name: message("euler_circle_graph_r_time"), value: formatted(withPiFraction(formatArgument(d.time, lang, none), this.state.degrees, 180 * this.state.omega))},
            {id: "period", name: message("euler_circle_graph_r_period"), value: formatted(formatArgument(d.period, lang, none))},
            {id: "cos", name: message("euler_circle_graph_r_cos", {value0: this.word(d.exact !== undefined)}), value: this.coordinateMessage(d.exact?.cos, d.position.re)},
            {id: "sin", name: message("euler_circle_graph_r_sin", {value0: this.word(d.exact !== undefined)}), value: this.coordinateMessage(d.exact?.sin, d.position.im)},
        ];
        if (this.state.velocity) {
            rows.push(
                {id: "velocity", name: message("euler_circle_graph_r_velocity"), value: this.vectorMessage(d.velocity)},
                {id: "speed", name: message("euler_circle_graph_r_speed"), value: messageNumber(d.speed, 6)},
                {id: "between", name: message("euler_circle_graph_r_between"), value: message("euler_circle_graph_value_degrees", {value0: messageNumber(d.angleBetween, 4)})},
            );
        }
        if (this.state.mode === "product") {
            const {sumDegrees, reducedDegrees, exact} = d.product;
            const first = messageNumber(this.state.degrees, 0);
            const second = messageNumber(this.state.b, 0);
            rows.push(
                {id: "b", name: message("euler_circle_graph_r_b"), value: message("euler_circle_graph_value_degrees", {value0: second})},
                {id: "sum-angle", name: message("euler_circle_graph_r_sum_angle"), value: sumDegrees === reducedDegrees
                    ? message("euler_circle_graph_value_sum_angle", {value0: first, value1: second, value2: messageNumber(sumDegrees, 0)})
                    : message("euler_circle_graph_value_sum_angle_reduced", {value0: first, value1: second, value2: messageNumber(sumDegrees, 0), value3: messageNumber(reducedDegrees, 0)})},
                {id: "second", name: message("euler_circle_graph_r_second", {value0: this.word(exactTrigOf(this.state.b) !== undefined)}), value: this.secondMessage()},
                {id: "product", name: message("euler_circle_graph_r_product", {value0: this.word(exact !== undefined)}), value: this.productMessage()},
            );
        }
        if (this.state.acceleration) rows.push({id: "acceleration", name: message("euler_circle_graph_r_acceleration"), value: this.vectorMessage(d.acceleration)});
        rows.push(
            {id: "sum", name: message("euler_circle_graph_r_sum", {value0: degreeNumber}), value: this.complexMessage(d.partialSum, 4)},
            {id: "point", name: message("euler_circle_graph_r_point", {value0: this.word(d.exact !== undefined)}), value: this.pointMessage()},
            {id: "error", name: message("euler_circle_graph_r_error", {value0: degreeNumber}), value: formatted(formatSignificant(d.error, lang, 3))},
        );
        if (!d.partialInsideView) rows.push({id: "out", name: message("euler_circle_graph_r_out", {value0: degreeNumber}), value: message("euler_circle_graph_value_out")});
        return rows;
    }

    /** The panel's text of the rows. */
    readoutRows(): ReadoutListRow[] {
        return this.rowSpecs().map(({id, name, value}): ReadoutListRow => ({
            id, label: renderMessage(name), value: "kind" in value && value.kind === "formatted" ? value.text : this.render(value),
        }));
    }

    // ---- Declaration ----------------------------------------------------------------------------------------------------------

    /**
     * Parameter writes (ADR 0064). Keys `euler-angle` (whole degrees), `euler-omega`, `euler-degree` and `euler-b` (steps of `B_STEP`): the typed setters the
     * sliders call, so a value off the grid or out of range is refused with the control's own message, never rounded or clamped.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const numbers = (min: number, max: number) => ({value0: messageNumber(min, 0), value1: messageNumber(max, 0)});
        return {
            "euler-angle": {
                read: () => this.state.degrees,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.editAngle(value)) throw new DomainError(message("euler_circle_graph_angle_rejected", numbers(ANGLE_RANGE.min, ANGLE_RANGE.max)));
                },
            },
            "euler-omega": {
                read: () => this.state.omega,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.editOmega(value)) throw new DomainError(message("euler_circle_graph_omega_rejected", numbers(OMEGA_RANGE.min, OMEGA_RANGE.max)));
                },
            },
            "euler-degree": {
                read: () => this.state.degree,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.editDegree(value)) throw new DomainError(message("euler_circle_graph_degree_rejected", numbers(DEGREE_RANGE.min, DEGREE_RANGE.max)));
                },
            },
            "euler-b": {
                read: () => this.state.b,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.editSecondAngle(value)) {
                        throw new DomainError(message("euler_circle_graph_b_rejected", {...numbers(B_RANGE.min, B_RANGE.max), value2: messageNumber(B_STEP, 0)}));
                    }
                },
            },
        };
    }

    /**
     * Pure data from the state: the angle, the angular speed, the series degree and (in the product mode) the second angle are board pucks (the learner moves
     * them while watching the point, the rows and the arrows; the angle is also dragged), the two arrow switches and the product switch are switch pucks (the
     * lessons ask the learner to flip each and notice the change), the playback actions stay in the playback group of Edit, and the legend names what the board
     * draws (the product elements only while the mode is on, the partial sum only while inside the view). The status sentence and the rows are the readouts.
     */
    protected override declaration(): GraphDeclaration<EulerCircleIds> {
        const {degrees, omega, degree, velocity, acceleration, mode} = this.state;
        const playing = this.isPlaying();
        const blocks = playbackBlocks({atStart: degrees === ANGLE_RANGE.min, atEnd: degrees >= ANGLE_RANGE.max, playing});
        const degreesUnit = message("euler_degrees");
        const parameters: ParameterDeclaration<EulerCircleIds["param"]>[] = [
            {key: "euler-angle", kind: "range", label: message("euler_angle_name"), symbol: "θ", placement: "board", min: ANGLE_RANGE.min, max: ANGLE_RANGE.max, step: 1,
                bigStep: STEP_DEGREES, maxDecimals: 0, unit: degreesUnit, help: message("euler_circle_graph_angle_help")},
            {key: "euler-omega", kind: "range", label: message("euler_omega_name"), symbol: "ω", placement: "board", min: OMEGA_RANGE.min, max: OMEGA_RANGE.max, step: 1,
                bigStep: 1, maxDecimals: 0, help: message("euler_circle_graph_omega_help")},
            {key: "euler-degree", kind: "count", label: message("euler_degree_name"), symbol: "N", placement: "board", min: DEGREE_RANGE.min, max: DEGREE_RANGE.max,
                help: message("euler_circle_graph_degree_help")},
            ...(mode === "product" ? [{key: "euler-b" as const, kind: "range" as const, label: message("euler_b_name"), symbol: "φ", placement: "board" as const, min: B_RANGE.min,
                max: B_RANGE.max, step: B_STEP, bigStep: B_STEP * 6, maxDecimals: 0, unit: degreesUnit, help: message("euler_circle_graph_b_help")}] : []),
        ];
        const legend: LegendEntry<EulerCircleIds>[] = [
            {id: "unit", label: message("euler_legend_unit"), kind: "dashed", object: "unit"},
            {id: "projections", label: message("euler_legend_projections"), kind: "dashed", object: "projections"},
            {id: "point", label: message("euler_legend_point"), kind: "point", object: "point"},
            {id: "velocity", label: message("euler_legend_velocity", {value0: messageNumber(VELOCITY_SCALE, 1)}), kind: "line", object: "velocity"},
            {id: "acceleration", label: message("euler_legend_acceleration", {value0: messageNumber(accelerationScale(omega), 5)}), kind: "dashed", object: "acceleration"},
            {id: "sum", label: message("euler_legend_sum", {value0: messageNumber(degree, 0)}), kind: "point", object: "sum"},
            {id: "second", label: message("euler_legend_second"), kind: "point", object: "second"},
            {id: "product", label: message("euler_legend_product"), kind: "point", object: "product"},
            {id: "radii", label: message("euler_legend_radii"), kind: "line", object: "radii"},
        ];
        const switchPuck = (id: EulerCircleIds["action"], label: Message, pressed: boolean): ActionDeclaration<EulerCircleIds> => ({id, label, placement: "board", puck: true, enabled: true, pressed});
        const playback = {placement: "tools" as const, tab: "edit" as const};
        const actions: ActionDeclaration<EulerCircleIds>[] = [
            switchPuck("show-velocity", message("euler_velocity_puck"), velocity),
            switchPuck("show-acceleration", message("euler_acceleration_puck"), acceleration),
            switchPuck("product-mode", message("euler_product_puck"), mode === "product"),
            {id: "next-step", label: message("next_step"), enabled: blocks.nextBlock === undefined, ...playback},
            {id: "play-pause", label: message("play"), enabled: playing || (blocks.playBlock === undefined && !this.reducedMotion()), pressed: playing, ...playback},
            {id: "reset-run", label: message("reset"), enabled: blocks.resetBlock === undefined, ...playback},
        ];
        const rows: ReadoutRow<EulerCircleIds>[] = this.rowSpecs();
        return {
            parameters,
            readouts: [{id: "values", title: message("euler_circle_graph_readout_title"), rows}],
            notes: [
                {id: "status", text: this.statusMessage()},
            ],
            legend,
            actions,
            marks: this.viewMarks(),
        };
    }

    /** What the view director keeps visible: the unit circle with its points (the arrows and the partial sum may leave the box; the opening view holds them). */
    private viewMarks(): ViewMarks {
        return {must: [{kind: "box", left: -1.2, top: 1.2, right: 1.2, bottom: -1.2}]};
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = this.drawn.get(id);
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const filled = id === "point" || id === "sum" || id === "second" || id === "product";
        return {color: String(drawn.evalVisProp(filled ? "fillcolor" : "strokecolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        switch (id) {
            case "next-step": runAs("learner", () => this.stepOnce()); return;
            case "play-pause": runAs("learner", () => { if (this.isPlaying()) this.pausePlayback(); else this.play(); }); return;
            case "reset-run": runAs("learner", () => this.resetRun()); return;
            case "show-velocity": runAs("learner", () => this.setVectors({velocity: !this.state.velocity})); return;
            case "show-acceleration": runAs("learner", () => this.setVectors({acceleration: !this.state.acceleration})); return;
            case "product-mode": runAs("learner", () => this.setProductMode(this.state.mode !== "product")); return;
            default: throw new Error("Unknown action");
        }
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        const angleArgs = {value0: dec(ANGLE_RANGE.min, 0), value1: dec(ANGLE_RANGE.max, 0)};
        const omegaArgs = {value0: dec(OMEGA_RANGE.min, 0), value1: dec(OMEGA_RANGE.max, 0)};
        const bArgs = {value0: dec(B_RANGE.min, 0), value1: dec(B_RANGE.max, 0), value2: dec(B_STEP, 0)};
        const degreeArgs = {value0: dec(DEGREE_RANGE.min, 0), value1: dec(DEGREE_RANGE.max, 0)};
        return [
            <PuckOwned key="angle" param="euler-angle"><Slider customText={t("euler_circle_graph_angle_label")} value={this.state.degrees} step={1} bigStep={STEP_DEGREES} min={ANGLE_RANGE.min}
                    max={ANGLE_RANGE.max} help={t("euler_circle_graph_angle_help")}
                    rejectedHint={t("euler_circle_graph_angle_rejected", angleArgs)} onChange={value => this.editAngle(value)}/></PuckOwned>,
            <PuckOwned key="omega" param="euler-omega"><Slider customText={t("euler_circle_graph_omega_label")} value={this.state.omega} step={1} bigStep={1} min={OMEGA_RANGE.min}
                    max={OMEGA_RANGE.max} help={t("euler_circle_graph_omega_help")}
                    rejectedHint={t("euler_circle_graph_omega_rejected", omegaArgs)} onChange={value => this.editOmega(value)}/></PuckOwned>,
            <PuckOwned key="degree" param="euler-degree"><CountSetter label={t("euler_circle_graph_degree_label")} n={this.state.degree} min={DEGREE_RANGE.min} max={DEGREE_RANGE.max}
                         help={t("euler_circle_graph_degree_help")} rejectedHint={t("euler_circle_graph_degree_rejected", degreeArgs)}
                         onPlus={() => this.editDegree(this.state.degree + 1)} onMinus={() => this.editDegree(this.state.degree - 1)}
                         onSet={value => this.editDegree(value)}/></PuckOwned>,
            <PuckOwned key="mode" param="product-mode"><BooleanField variant="checkbox" checked={this.state.mode === "product"} label={t("euler_circle_graph_mode_label")}
                          help={t("euler_circle_graph_mode_help")} onChange={checked => this.setProductMode(checked)}/></PuckOwned>,
            ...(this.state.mode === "product" ? [
                <PuckOwned key="b" param="euler-b"><Slider customText={t("euler_circle_graph_b_label")} value={this.state.b} step={B_STEP} bigStep={B_STEP * 6} min={B_RANGE.min}
                        max={B_RANGE.max} help={t("euler_circle_graph_b_help")}
                        rejectedHint={t("euler_circle_graph_b_rejected", bArgs)} onChange={value => this.editSecondAngle(value)}/></PuckOwned>,
            ] : []),
            <PuckOwned key="velocity" param="show-velocity"><BooleanField variant="checkbox" checked={this.state.velocity} label={t("euler_circle_graph_velocity_label")}
                          help={t("euler_circle_graph_velocity_help")} onChange={checked => this.setVectors({velocity: checked})}/></PuckOwned>,
            <PuckOwned key="acceleration" param="show-acceleration"><BooleanField variant="checkbox" checked={this.state.acceleration} label={t("euler_circle_graph_acceleration_label")}
                          help={t("euler_circle_graph_acceleration_help")} onChange={checked => this.setVectors({acceleration: checked})}/></PuckOwned>,
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
            </div>
            <div className="inspector-group" data-declared-panel="">
                <ReadoutHeading>{t("euler_circle_graph_readout_title")}</ReadoutHeading>
                <p data-euler-status="" data-readout-note="">{this.statusText()}</p>
                <ReadoutList label={t("euler_circle_graph_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status} muted={playing}/>
            </div>
        </>;
    }
}

export default EulerCircleGraph;
