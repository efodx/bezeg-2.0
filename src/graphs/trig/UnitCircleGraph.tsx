import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {unitCirclePresetCollection} from "./trigPresetCollection";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import AngleSlider from "../../inputs/AngleSlider";
import {NumberInput} from "../../inputs/NumberInput";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {FunctionLegend} from "../functions/FunctionReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {addAngles, Angle, angleFromHalfDegrees, degreesOf, Quadrant, toRadians} from "../../trig/angle";
import {pointInRotatedFrame, pointOnCircle, Point, rotationFrame, sumPoint, symmetricImages} from "../../trig/unitCircle";
import {
    DEFAULT_UNIT_CIRCLE_STATE, deriveUnitCircle, parseUnitCircleState, serializeUnitCircleState, snapAngleInput, snapPiMultipleInput, UnitCircleDerived,
    UnitCircleState,
} from "../../trig/trigModel";

/** The scene state: the stored unit-circle fields plus the display switch of the TR2 second angle. */
export interface UnitCircleGraphState extends BaseGraphState, UnitCircleState {
    /** Shows the second angle, the rotated frame and the point expressed in it (TR2). */
    readonly showAddition: boolean;
}

type AngleField = "angle" | "secondAngle";

/** The unrolled axis starts here, to the right of the unit circle. */
export const TRACE_ORIGIN_X = 1.7;
/** Half-degree steps of one full turn. */
const TURN = 720;
/** Keyboard steps in degrees: the arrow keys move half a degree, Shift and the Page keys five degrees. */
export const ANGLE_STEP_DEGREES = 0.5;
export const ANGLE_BIG_STEP_DEGREES = 5;
/** Pointer tolerance in screen pixels around a handle; JSXGraph adds `HIT_SLACK` and tests both sides, so a touch zone is over 44 px across. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;
/** The stored range of the angle in the typed fields: [0°, 360°) in half-degrees, or [0π, 2π) in steps of π/360. */
export const ANGLE_MAX_DEGREES = 359.5;
export const ANGLE_MAX_PI = 719 / 360;
/** The marker faces of the three symmetric points, the styles the legend states. */
export const SYMMETRY_FACES = {xAxis: "cross", yAxis: "plus", origin: "diamond"} as const;

interface Trace {
    readonly xs: readonly number[];
    readonly sin: readonly number[];
    readonly cos: readonly number[];
}

/** The x coordinate on the unrolled axis of the angle with `halfDegrees` half-degrees: the origin plus the arc length. */
export const traceX = (halfDegrees: number): number => TRACE_ORIGIN_X + (Math.PI * halfDegrees) / 360;

let traceCache: Trace | undefined;

/**
 * The unrolled traces at all 720 half-degree angles and the closing 2*pi: the same `pointOnCircle` doubles the circle point uses, so
 * the height of the trace at theta is the point's y (and its x for the cosine), never a second computation.
 */
export function unrolledTrace(): Trace {
    if (!traceCache) {
        const xs: number[] = [];
        const sin: number[] = [];
        const cos: number[] = [];
        for (let h = 0; h <= TURN; h++) {
            const p = pointOnCircle(angleFromHalfDegrees(h % TURN));
            xs.push(traceX(h));
            cos.push(p[0]);
            sin.push(p[1]);
        }
        traceCache = {xs, sin, cos};
    }
    return traceCache;
}

const EXACT_PLAIN: Readonly<Record<string, string>> = {
    "\\frac{\\sqrt{3}}{2}": "√3/2",
    "\\frac{\\sqrt{2}}{2}": "√2/2",
    "\\frac{1}{2}": "1/2",
};

/** Plain text of an exact value from the closed table (for example `-\frac{\sqrt{3}}{2}` gives `−√3/2`). */
export function exactPlain(latex: string): string {
    const negative = latex.startsWith("-");
    const body = negative ? latex.slice(1) : latex;
    const text = EXACT_PLAIN[body] ?? body;
    return negative ? `−${text}` : text;
}

/** Signs of (cos, sin) by quadrant, an integer decision (never read off a double). */
/** Signs of cosine and sine on the four axis points 0°, 90°, 180°, 270° (index = half-degrees / 180). */
export const AXIS_SIGNS: readonly (readonly [string, string])[] = [[">", "="], ["=", ">"], ["<", "="], ["=", "<"]];
export const QUADRANT_SIGNS: Readonly<Record<Quadrant, readonly [string, string]>> = {1: [">", ">"], 2: ["<", ">"], 3: ["<", "<"], 4: [">", "<"]};

interface View {
    readonly derived: UnitCircleDerived;
    readonly images: {readonly xAxis: Point; readonly yAxis: Point; readonly origin: Point};
    readonly secondPoint: Point;
    readonly frame: readonly [Point, Point];
    readonly rotated: Point;
    readonly sumAngle: Angle;
    readonly sum: Point;
}

const whereText = (q: Quadrant | undefined): string => {
    switch (q) {
        case 1: return t("unit_circle_where_1");
        case 2: return t("unit_circle_where_2");
        case 3: return t("unit_circle_where_3");
        case 4: return t("unit_circle_where_4");
        default: return t("unit_circle_where_axis");
    }
};

/**
 * The unit circle (TR1 and TR2): a point at an angle that is an integer number of half-degrees (ADR 0044 section 3), its projections,
 * the unrolled sin (and cos) trace, and for TR2 the second angle, the rotated frame and the three symmetric points. Everything drawn is
 * computed from the scene state by the `src/trig` kernel; the point is snapped to half-degrees while it is dragged.
 *
 * Ownership: every board object is created in `buildScene` and recorded in `objects`; the drag listeners are recorded in `listeners`.
 * `disposeScene` removes the listeners and then the objects; it runs on a rebuild, on a scene dispose and, through a session cleanup,
 * on unmount.
 */
export class UnitCircleGraph extends BaseGraph<UnitCircleGraphState, UnitCircleState> {
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];
    private handle?: JXG.Point;
    private secondHandle?: JXG.Point;
    private viewCache?: {angle: number; second: number; view: View};
    /** The state key the board was last drawn for; a sync that finds the same key draws nothing. */
    private drawnKey = "";
    /** The fields behind the function-valued `visible` attributes, as last drawn; only a change here needs fullUpdate(). */
    private drawnVisibility = "";
    /** The value a typed angle was stored as when that differs from what was typed; shown until the next edit. */
    private adjustedTo?: number;
    /** The state key the note `adjustedTo` belongs to: any other stored-state change drops the note. */
    private adjustedKey = "";
    private readonly status = new SettledReadout();

    override getInitialState(): UnitCircleGraphState {
        return {initialized: false, ...DEFAULT_UNIT_CIRCLE_STATE, showAddition: false};
    }

    protected override lessonDefaultState(): UnitCircleGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps `initialized` and the `showAddition` switch.

    override defaultPreset(): UnitCircleState {
        return serializeUnitCircleState(DEFAULT_UNIT_CIRCLE_STATE);
    }

    override presetCollection(): PresetCollection<UnitCircleState> {
        return unitCirclePresetCollection();
    }

    override exportPreset(): Preset<UnitCircleState> {
        const preset = super.exportPreset();
        const {angle: _angle, secondAngle: _second, showSymmetries: _symmetries, showCosine: _cosine, ...graphState} = preset.graphState as UnitCircleGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): UnitCircleState {
        return serializeUnitCircleState(this.state);
    }

    override importPresetData(data: UnitCircleState): void {
        this.setState(serializeUnitCircleState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): UnitCircleGraphState {
        const parsed = parseUnitCircleState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.6, 1.8, TRACE_ORIGIN_X + 2 * Math.PI + 0.3, -1.8];
    }

    // ---- Derived numbers ---------------------------------------------------------------------------------------------

    /** Everything drawn or read, recomputed when the two angles change (a cache keyed by its inputs, not a mirror of the state). */
    view(): View {
        const {angle, secondAngle} = this.state;
        const cached = this.viewCache;
        if (cached && cached.angle === angle && cached.second === secondAngle) return cached.view;
        const derived = deriveUnitCircle(this.state);
        const second = angleFromHalfDegrees(secondAngle);
        const images = symmetricImages(derived.angle);
        const view: View = {
            derived,
            images: {xAxis: pointOnCircle(images.xAxis), yAxis: pointOnCircle(images.yAxis), origin: pointOnCircle(images.origin)},
            secondPoint: pointOnCircle(second),
            frame: rotationFrame(derived.angle),
            rotated: pointInRotatedFrame(derived.angle, second),
            sumAngle: addAngles(derived.angle, second),
            sum: sumPoint(derived.angle, second),
        };
        this.viewCache = {angle, second: secondAngle, view};
        return view;
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and its two handles. */
    ownedObjectCount(): number { return this.objects.length; }
    ownedListenerCount(): number { return this.listeners.length; }
    handles(): {readonly angle: JXG.Point | undefined; readonly second: JXG.Point | undefined} {
        return {angle: this.handle, second: this.secondHandle};
    }

    private stateKey(): string {
        const s = this.state;
        return `${s.angle}/${s.secondAngle}/${s.showSymmetries}/${s.showCosine}/${s.showAddition}`;
    }

    /** Every field a function-valued `visible` attribute reads: the three switches and whether the arc highlight is empty (angle 0). */
    private visibilityKey(): string {
        const s = this.state;
        return `${s.showSymmetries}/${s.showCosine}/${s.showAddition}/${s.angle > 0}`;
    }

    // ---- Board -------------------------------------------------------------------------------------------------------

    initialize(): void {
        this.adjustedTo = undefined;
        this.buildScene();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => this.status.cancel());
            session.registerCleanup(onLanguageChange(() => this.status.replace(this.statusText())));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(_previous: Readonly<UnitCircleGraphState>): void {
        if (this.adjustedKey !== this.stateKey()) this.adjustedTo = undefined;
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.adjustedTo = undefined;
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Moves the handles to the state and redraws when the state differs from what is drawn; reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        const {derived, secondPoint} = this.view();
        this.placeHandle(this.handle, derived.point);
        this.placeHandle(this.secondHandle, secondPoint);
        const key = this.stateKey();
        if (key !== this.drawnKey) {
            this.drawnKey = key;
            // update() does not re-evaluate function-valued `visible` attributes (showCosine, showAddition); fullUpdate() does.
            // Angle-only changes (typed or restored) keep every visibility, so they take the cheaper update().
            const visibility = this.visibilityKey();
            if (visibility !== this.drawnVisibility) {
                this.drawnVisibility = visibility;
                this.board.fullUpdate();
            } else {
                this.board.update();
            }
        }
        this.status.report(this.statusText());
    }

    private placeHandle(handle: JXG.Point | undefined, target: Point): void {
        if (handle && (handle.X() !== target[0] || handle.Y() !== target[1])) handle.setPosition(JXG.COORDS_BY_USER, [target[0], target[1]]);
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const view = () => this.view();
        const showCosine = () => this.state.showCosine;
        const showSymmetries = () => this.state.showSymmetries;
        const showAddition = () => this.state.showAddition;
        type Visible = boolean | (() => boolean);
        type Coordinate = number | (() => number);
        type PointFace = NonNullable<JXG.PointAttributes["face"]>;

        const hidden = (x: Coordinate, y: Coordinate) =>
            this.own(board.create("point", [x, y], {visible: false, fixed: true, withLabel: false, name: ""}));
        // A cross or plus face has no fill: JSXGraph draws it with the stroke alone, so the stroke carries the colour.
        const strokeOnly = (face: PointFace) => face === "cross" || face === "plus" || face === "x" || face === "+";
        const marker = (x: Coordinate, y: Coordinate, face: PointFace, color: string, size: number, visible: Visible = true) =>
            this.own(board.create("point", [x, y], {
                fixed: true, highlight: false, withLabel: false, name: "", face, size, fillColor: color, visible,
                ...(strokeOnly(face) ? {strokeColor: color, strokeWidth: 2} : {strokeColor: GraphPalette.pointOutline}),
            }));
        const segment = (a: JXG.Point, b: JXG.Point, color: string, width: number, dash: number, visible: Visible = true, lastArrow = false) =>
            this.own(board.create("segment", [a, b], {
                strokeColor: color, strokeWidth: width, dash, fixed: true, highlight: false, visible, withLabel: false, lastArrow,
            }));
        const handleAttributes = (color: string, face: PointFace): JXG.PointAttributes => ({
            name: "", withLabel: false, size: 7, face, fillColor: color, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
            precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
        });
        const trace = unrolledTrace();
        const theta = () => toRadians(view().derived.angle);
        const traceAt = () => traceX(view().derived.angle.halfDegrees);

        const origin = hidden(0, 0);
        this.own(board.create("circle", [origin, 1], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: 2, fillColor: "none", highlightFillColor: "none", fixed: true,
            highlight: false, withLabel: false,
        }));
        this.own(board.create("curve", [[...trace.xs], [...trace.sin]], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth: 2, fixed: true, highlight: false, needsRegularUpdate: false, withLabel: false,
        }));
        this.own(board.create("curve", [[...trace.xs], [...trace.cos]], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2, fixed: true, highlight: false, needsRegularUpdate: false,
            withLabel: false, visible: showCosine,
        }));
        // On-graph names for the traces, so the curves differ by more than colour and dash; each shows with its trace.
        this.own(board.create("text", [traceX(180), 1.2, () => t("unit_circle_trace_sin")], {
            strokeColor: GraphPalette.primaryCurve, fontSize: 15, anchorX: "middle", fixed: true, highlight: false, withLabel: false,
        }));
        this.own(board.create("text", [traceX(TURN), 1.2, () => t("unit_circle_trace_cos")], {
            strokeColor: GraphPalette.comparisonCurve, fontSize: 15, anchorX: "middle", fixed: true, highlight: false, withLabel: false,
            visible: showCosine,
        }));
        // The arc highlight from angle 0 to theta.
        this.own(board.create("curve", [(u: number) => Math.cos(u), (u: number) => Math.sin(u), 0, theta], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: 5, fixed: true, highlight: false, withLabel: false,
            visible: () => view().derived.angle.halfDegrees > 0,
        }));

        // Projections of the point onto the axes: |cos| along the x-axis and |sin| as the vertical segment form the right triangle.
        const footX = hidden(() => view().derived.point[0], 0);
        const footY = hidden(0, () => view().derived.point[1]);
        const handle = this.own(board.create("point", [view().derived.point[0], view().derived.point[1]], handleAttributes(GraphPalette.controlPoint, "o")));
        this.handle = handle;
        segment(origin, handle, GraphPalette.label, 2, 0);
        segment(origin, footX, GraphPalette.comparisonCurve, 4, 0);
        segment(footX, handle, GraphPalette.primaryCurve, 4, 0);
        segment(footY, handle, GraphPalette.referenceCurve, 1, 2);

        // The unrolled markers: the heights are the circle point's own coordinates, the same doubles.
        const sinMark = marker(traceAt, () => view().derived.point[1], "o", GraphPalette.primaryCurve, 4);
        segment(handle, sinMark, GraphPalette.primaryCurve, 1, 2);
        marker(traceAt, () => view().derived.point[0], "square", GraphPalette.comparisonCurve, 4, showCosine);

        // The three symmetric points: integer operations on the half-degree angle, then drawn.
        marker(() => view().images.xAxis[0], () => view().images.xAxis[1], SYMMETRY_FACES.xAxis, GraphPalette.constructionLevels[1], 5, showSymmetries);
        marker(() => view().images.yAxis[0], () => view().images.yAxis[1], SYMMETRY_FACES.yAxis, GraphPalette.constructionLevels[2], 5, showSymmetries);
        marker(() => view().images.origin[0], () => view().images.origin[1], SYMMETRY_FACES.origin, GraphPalette.constructionLevels[3], 5, showSymmetries);

        // TR2: the second angle, the frame rotated by the first angle and the second point expressed in it.
        const second = this.own(board.create("point", [view().secondPoint[0], view().secondPoint[1]], {
            ...handleAttributes(GraphPalette.comparisonCurve, "diamond"), visible: showAddition,
        }));
        this.secondHandle = second;
        const e1 = hidden(() => view().frame[0][0], () => view().frame[0][1]);
        const e2 = hidden(() => view().frame[1][0], () => view().frame[1][1]);
        segment(origin, e1, GraphPalette.constructionAccent, 2, 0, showAddition, true);
        segment(origin, e2, GraphPalette.constructionAccent, 2, 0, showAddition, true);
        const rotated = marker(() => view().rotated[0], () => view().rotated[1], "square", GraphPalette.constructionLevels[3], 5, showAddition);
        segment(origin, second, GraphPalette.comparisonCurve, 1, 2, showAddition);
        segment(origin, rotated, GraphPalette.constructionLevels[3], 2, 0, showAddition);

        this.wireDrag(handle, "angle");
        this.wireDrag(second, "secondAngle");
        this.drawnKey = this.stateKey();
        this.drawnVisibility = this.visibilityKey();
    }

    /** Snaps a dragged handle to the nearest half-degree on the circle and writes the angle to the scene state. */
    private wireDrag(point: JXG.Point, field: AngleField): void {
        const onDrag = () => this.dragTo(point, field);
        const board = this.board;
        const releaseCursor = bindMovablePointCursor(point, board);
        point.on("drag", onDrag);
        this.listeners.push(() => { point.off("drag", onDrag); releaseCursor(); });
    }

    private dragTo(point: JXG.Point, field: AngleField): void {
        const halfDegrees = angleFromHalfDegrees(Math.round((Math.atan2(point.Y(), point.X()) * 360) / Math.PI)).halfDegrees;
        this.adjustedTo = undefined;
        if (this.state[field] !== halfDegrees) this.setAngle(field, halfDegrees);
        const target = pointOnCircle(angleFromHalfDegrees(halfDegrees));
        point.setPosition(JXG.COORDS_BY_USER, [target[0], target[1]]);
        // The board updates right after this handler, so the state it draws is the one just written.
        this.drawnKey = this.stateKey();
        this.status.report(this.statusText());
    }

    private setAngle(field: AngleField, halfDegrees: number): void {
        if (field === "angle") this.setState({angle: halfDegrees});
        else this.setState({secondAngle: halfDegrees});
    }

    /** Removes the listeners, then the objects, newest first; safe to call twice and after the board is gone. */
    private disposeScene(): void {
        for (const off of this.listeners.splice(0)) off();
        if (this.hasBoard) {
            const board = this.board;
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.handle = undefined;
        this.secondHandle = undefined;
        this.drawnKey = "";
        this.drawnVisibility = "";
    }

    // ---- Text and controls ---------------------------------------------------------------------------------------------

    private number(value: number, language: NumberLanguage): string {
        return formatNumber(value, language, 7);
    }

    /** A coordinate: exact radical text for the special angles with its rounded value, otherwise the rounded double marked with "≈". */
    private coordinateText(value: number, exact: string | undefined, language: NumberLanguage): string {
        const rounded = this.number(value, language);
        if (exact === undefined) return `≈ ${rounded}`;
        const plain = exactPlain(exact);
        return plain === rounded ? plain : `${plain} ≈ ${rounded}`;
    }

    /** The angle as an exact multiple of pi: every half-degree angle is h/360 of a pi, shown as a reduced fraction. */
    private radianText(angle: Angle): string {
        const h = angle.halfDegrees;
        if (h === 0) return "0";
        let a = h, b = TURN / 2;
        while (b) [a, b] = [b, a % b];
        const num = h / a, den = TURN / 2 / a;
        return `${num === 1 ? "" : num}π${den === 1 ? "" : `/${den}`}`;
    }

    private statusText(): string {
        const language = currentLanguage();
        const {derived} = this.view();
        const exact = derived.special;
        return t("unit_circle_status", {
            value0: formatNumber(degreesOf(derived.angle), language, 1),
            value1: this.radianText(derived.angle),
            value2: this.coordinateText(derived.point[0], exact?.cos, language),
            value3: this.coordinateText(derived.point[1], exact?.sin, language),
            value4: whereText(derived.quadrant),
        });
    }

    private pointText(point: Point, language: NumberLanguage): string {
        return t("unit_circle_point_format", {value0: this.number(point[0], language), value1: this.number(point[1], language)});
    }

    private readoutRows(): ReadoutListRow[] {
        const language = currentLanguage();
        const {derived, images, sumAngle, sum} = this.view();
        const exact = derived.special;
        const [cosSign, sinSign] = derived.quadrant !== undefined ? QUADRANT_SIGNS[derived.quadrant] : AXIS_SIGNS[derived.angle.halfDegrees / 180];
        const signs = `cos θ ${cosSign} 0, sin θ ${sinSign} 0`;
        const rows: ReadoutListRow[] = [
            {id: "angle", label: t("unit_circle_readout_angle"), value: t("unit_circle_readout_angle_value", {
                value0: formatNumber(degreesOf(derived.angle), language, 1), value1: this.radianText(derived.angle)})},
            {id: "cos", label: t("unit_circle_readout_cos"), value: this.coordinateText(derived.point[0], exact?.cos, language)},
            {id: "sin", label: t("unit_circle_readout_sin"), value: this.coordinateText(derived.point[1], exact?.sin, language)},
            {id: "position", label: t("unit_circle_readout_position"), value: whereText(derived.quadrant)},
            {id: "signs", label: t("unit_circle_readout_signs"), value: signs},
        ];
        if (this.state.showSymmetries) {
            rows.push(
                {id: "symmetry-x", label: t("unit_circle_readout_sym_x"), value: this.pointText(images.xAxis, language)},
                {id: "symmetry-y", label: t("unit_circle_readout_sym_y"), value: this.pointText(images.yAxis, language)},
                {id: "symmetry-origin", label: t("unit_circle_readout_sym_origin"), value: this.pointText(images.origin, language)},
            );
        }
        if (this.state.showAddition) {
            rows.push(
                {id: "sum-angle", label: t("unit_circle_readout_sum"), value: `${formatNumber(degreesOf(sumAngle), language, 1)}°`},
                {id: "sum-point", label: t("unit_circle_readout_sum_point"), value: this.pointText(sum, language)},
            );
        }
        return rows;
    }

    /**
     * Lesson actions (`trig`): `set-angle` is the degrees field and `set-overlay` the three switches. Values are checked strictly (a lesson-content
     * error throws, nothing is snapped); `setState` writes the store synchronously, so a later action of the same scene reads this one's result.
     */
    applyTrigAction(action: Extract<LessonAction, {kind: "trig"}>): void {
        if (action.operation === "set-overlay") {
            const {overlay, on} = action;
            if (typeof on !== "boolean") throw new Error("trig set-overlay: on must be a boolean.");
            if (overlay === "cosine") this.setState({showCosine: on});
            else if (overlay === "symmetries") this.setState({showSymmetries: on});
            else if (overlay === "addition") this.setState({showAddition: on});
            else throw new Error("trig set-overlay: overlay must be cosine, symmetries or addition.");
            this.requestRender();
            return;
        }
        if (action.operation !== "set-angle") throw new Error(`trig: the unit-circle graph has no operation ${String((action as {operation: unknown}).operation)}.`);
        const {which, degrees} = action;
        if (which !== "first" && which !== "second") throw new Error("trig set-angle: which must be first or second.");
        if (typeof degrees !== "number" || !Number.isFinite(degrees) || degrees < 0 || degrees > ANGLE_MAX_DEGREES || !Number.isInteger(degrees * 2)) {
            throw new Error(`trig set-angle: degrees must be a multiple of 0.5 from 0 to ${ANGLE_MAX_DEGREES}.`);
        }
        this.adjustedTo = undefined;
        this.setAngle(which === "first" ? "angle" : "secondAngle", degrees * 2);
        this.requestRender();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("trig", action => this.applyTrigAction(action));
    }

    private editAngle(field: AngleField, kind: "degrees" | "pi", value: number): boolean {
        const snapped = kind === "pi" ? snapPiMultipleInput(value, field) : snapAngleInput(value, field);
        if (!snapped.ok) return false;
        this.setAngle(field, snapped.value.halfDegrees);
        // Written after the state, so the note is tied to exactly the state this entry produced.
        this.adjustedTo = snapped.value.adjusted ? snapped.value.halfDegrees / 2 : undefined;
        this.adjustedKey = this.stateKey();
        this.requestRender();
        return true;
    }

    /** The legend entries for the styles of the symmetric points and the second radius, shown while those are drawn. */
    legendItems(): {id: string; color: string; label: string; kind: "cross" | "plus" | "diamond" | "dashed-line"}[] {
        const items: {id: string; color: string; label: string; kind: "cross" | "plus" | "diamond" | "dashed-line"}[] = [];
        if (this.state.showSymmetries) {
            items.push(
                {id: "symmetry-x", color: GraphPalette.constructionLevels[1], label: t("unit_circle_legend_sym_x"), kind: SYMMETRY_FACES.xAxis},
                {id: "symmetry-y", color: GraphPalette.constructionLevels[2], label: t("unit_circle_legend_sym_y"), kind: SYMMETRY_FACES.yAxis},
                {id: "symmetry-origin", color: GraphPalette.constructionLevels[3], label: t("unit_circle_legend_sym_origin"), kind: SYMMETRY_FACES.origin},
            );
        }
        if (this.state.showAddition) {
            items.push({id: "second-radius", color: GraphPalette.comparisonCurve, label: t("unit_circle_legend_second"), kind: "dashed-line"});
        }
        return items;
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <AngleSlider key="degrees" customText={t("unit_circle_angle_degrees_label")} value={degreesOf(angleFromHalfDegrees(state.angle))}
                         onChange={value => this.editAngle("angle", "degrees", value)}/>,
            <NumberInput key="pi" label={t("unit_circle_angle_pi_label")} value={state.angle / 360}
                         step={1 / 360} bigStep={1 / 72} decimals={4} min={0} max={ANGLE_MAX_PI} grid={1 / 360}
                         help={t("unit_circle_angle_pi_help")}
                         onChange={value => this.editAngle("angle", "pi", value)}/>,
        ];
        if (state.showAddition) {
            commands.push(<AngleSlider key="second" customText={t("unit_circle_second_angle_label")} value={state.secondAngle / 2}
                                       onChange={value => this.editAngle("secondAngle", "degrees", value)}/>);
        }
        if (this.adjustedTo !== undefined && this.adjustedKey === this.stateKey()) {
            commands.push(<p key="note" className="form-text" data-unit-circle-note="">
                {t("unit_circle_snapped_note", {value0: formatNumber(this.adjustedTo, currentLanguage(), 1)})}</p>);
        }
        commands.push(
            <OnOffSwitch key="cosine" checked={state.showCosine} label={t("unit_circle_show_cosine")} onChange={checked => this.setState({showCosine: checked})}/>,
            <OnOffSwitch key="symmetries" checked={state.showSymmetries} label={t("unit_circle_show_symmetries")}
                         onChange={checked => this.setState({showSymmetries: checked})}/>,
            <OnOffSwitch key="addition" checked={state.showAddition} label={t("unit_circle_show_addition")}
                         onChange={checked => this.setState({showAddition: checked})}/>,
        );
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("unit_circle_readout_title")}</ReadoutHeading>
                <p data-unit-circle-status="">{this.statusText()}</p>
                <ReadoutList label={t("unit_circle_readout_title")} rows={this.readoutRows()}/>
                <p className="form-text">{t("unit_circle_approx_note")}</p>
                {this.legendItems().length > 0 && <FunctionLegend items={this.legendItems()}/>}
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
