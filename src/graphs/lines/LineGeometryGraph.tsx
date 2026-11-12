import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {fitBoundingBox} from "../base/fitBoundingBox";
import {Rational, RationalPoint} from "../../compgeo/rational";
import {
    DEFAULT_LINE_STATE, deriveLineGeometry, formatExplicit, formatImplicit, formatIntercept, formatTwoPoint, GRID_LIMIT, INTERSECT_TARGETS,
    LINE_MODES, LineGeometryDerived, LineGeometryState, NormalRelation, parseLineGeometryState, PointField, POINT_FIELDS, serializeLineGeometryState,
    snapGridInput,
} from "./lineGeometryModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {lineGeometryPresetCollection} from "./linePresetCollection";

/** The scene state: the mode, what the intersect mode meets, and the integer grid handles. */
export type LineGeometryGraphState = BaseGraphState & LineGeometryState;

type GridXY = {readonly x: number; readonly y: number};

/** Pointer tolerance in screen pixels around a handle (see `UnitCircleGraph`): 26 gives a 52 px touch zone, above 44 px. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;
/** Keyboard steps of a coordinate (the arrow keys move one grid unit, Shift and the Page keys five). */
export const POINT_STEP = 1;
export const POINT_BIG_STEP = 5;

/**
 * The fixed view [left, top, right, bottom]. The handles fill [-8, 8]^2, so [-10, 10]^2 keeps every handle and label on the board
 * with a margin and the figure large. A foot or intersection farther out (a foot reaches 15,5 on the grid) is not drawn; the status
 * says so. Lines run to the board edge. The view stays fixed: it is not refitted under the pointer.
 */
export const VIEW_HALF = 10;
export const FIXED_VIEW: readonly [number, number, number, number] = [-VIEW_HALF, VIEW_HALF, VIEW_HALF, -VIEW_HALF];
/** Length of the drawn normal arrow (the direction is exact, the length is for drawing only), the angle arc radius, the right-angle square. */
export const NORMAL_ARROW_LENGTH = 3;
export const ARC_RADIUS = 3;
export const RIGHT_ANGLE_SIZE = 0.8;
const LABEL_OFFSET = 0.9;

/** Counts the graphs built, so the help ids of two instances on one page do not collide. */
let helpInstances = 0;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const signed = (value: Rational): string => value.format().replace("-", "−");
const inView = (x: number, y: number) => Math.abs(x) <= VIEW_HALF && Math.abs(y) <= VIEW_HALF;
const unit = (x: number, y: number): GridXY => {
    const length = Math.hypot(x, y);
    return length === 0 ? {x: 0, y: 0} : {x: x / length, y: y / length};
};

/** The handles shown in a mode (and for the intersect mode its target). */
export function shownHandles(state: LineGeometryState): readonly PointField[] {
    switch (state.mode) {
        case "forms": return ["P", "Q"];
        case "distance": return ["P", "Q", "T"];
        case "intersect": return state.target === "circle" ? ["P", "Q", "O", "B"] : ["P", "Q", "R", "S"];
        default: return ["P", "Q", "R", "S"];
    }
}

/** A normal arrow: the tail, the tip and where its caption sits. */
interface NormalArrow {
    readonly from: GridXY;
    readonly to: GridXY;
    readonly label: GridXY;
}

interface View {
    readonly derived: LineGeometryDerived;
    readonly firstLabel: GridXY | undefined;
    readonly secondLabel: GridXY | undefined;
    /** The normal arrows n₁ on the first line and n₂ on the second: from the middle of the two points along the exact normal. */
    readonly normalArrow: NormalArrow | undefined;
    readonly secondNormalArrow: NormalArrow | undefined;
    readonly foot: GridXY | undefined;
    readonly rightAngle: readonly [GridXY, GridXY, GridXY] | undefined;
    readonly distanceLabel: GridXY | undefined;
    readonly projectionLabel: GridXY | undefined;
    readonly pointVectorLabel: GridXY | undefined;
    /** The common point of the two lines when it lies in the view (angle and intersect modes). */
    readonly crossing: GridXY | undefined;
    readonly arc: {readonly start: number; readonly sweep: number; readonly label: GridXY; readonly degrees: number} | undefined;
    readonly radius: number;
    /** The circle intersection points that lie in the view: the tangent point, or the first and second of two points. */
    readonly tangent: GridXY | undefined;
    readonly pair: readonly [GridXY | undefined, GridXY | undefined];
    /** An intersection point exists but lies outside the view. */
    readonly offView: boolean;
    readonly footNotDrawn: boolean;
}

function buildView(state: LineGeometryState): View {
    const derived = deriveLineGeometry(state);
    const {first, second} = derived;
    const labelAt = (p: GridXY, q: GridXY, a: Rational, b: Rational): GridXY => {
        const n = unit(a.toNumber(), b.toNumber());
        return {x: (p.x + q.x) / 2 + LABEL_OFFSET * n.x, y: (p.y + q.y) / 2 + LABEL_OFFSET * n.y};
    };
    const arrowOn = (p: GridXY, q: GridXY, a: Rational, b: Rational): NormalArrow => {
        const n = unit(a.toNumber(), b.toNumber());
        const from = {x: (p.x + q.x) / 2, y: (p.y + q.y) / 2};
        return {
            from, to: {x: from.x + NORMAL_ARROW_LENGTH * n.x, y: from.y + NORMAL_ARROW_LENGTH * n.y},
            label: {x: from.x + (NORMAL_ARROW_LENGTH + 0.8) * n.x, y: from.y + (NORMAL_ARROW_LENGTH + 0.8) * n.y},
        };
    };
    let normalArrow: NormalArrow | undefined;
    let secondNormalArrow: NormalArrow | undefined;
    if (derived.normal && first) normalArrow = arrowOn(state.P, state.Q, first.line.a, first.line.b);
    if (derived.normal && second) secondNormalArrow = arrowOn(state.R, state.S, second.line.a, second.line.b);
    let foot: GridXY | undefined;
    let rightAngle: View["rightAngle"];
    let distanceLabel: GridXY | undefined;
    let projectionLabel: GridXY | undefined;
    let pointVectorLabel: GridXY | undefined;
    let footNotDrawn = false;
    if (derived.distance && first) {
        const d = derived.distance;
        foot = {x: d.foot.x.toNumber(), y: d.foot.y.toNumber()};
        const footOff = !inView(foot.x, foot.y);
        const along = unit(first.u.x.toNumber(), first.u.y.toNumber());
        const across = unit(state.T.x - foot.x, state.T.y - foot.y);
        if (!d.onLine && !footOff) {
            const s = RIGHT_ANGLE_SIZE;
            rightAngle = [
                {x: foot.x + s * along.x, y: foot.y + s * along.y},
                {x: foot.x + s * (along.x + across.x), y: foot.y + s * (along.y + across.y)},
                {x: foot.x + s * across.x, y: foot.y + s * across.y},
            ];
            distanceLabel = {x: (foot.x + state.T.x) / 2 + 0.8 * along.x, y: (foot.y + state.T.y) / 2 + 0.8 * along.y};
            projectionLabel = {x: (foot.x + state.T.x) / 2 - 0.8 * along.x, y: (foot.y + state.T.y) / 2 - 0.8 * along.y};
        }
        pointVectorLabel = {x: (state.P.x + state.T.x) / 2 - 0.8 * across.x, y: (state.P.y + state.T.y) / 2 - 0.8 * across.y};
        if (footOff) {
            foot = undefined;
            footNotDrawn = true;
        }
    }
    let crossing: GridXY | undefined;
    let arc: View["arc"];
    let offView = false;
    if (derived.lines?.kind === "point") {
        const x = derived.lines.point.x.toNumber();
        const y = derived.lines.point.y.toNumber();
        if (inView(x, y)) crossing = {x, y};
        else offView = true;
        if (crossing && derived.angle && first && second) {
            const u = {x: first.u.x.toNumber(), y: first.u.y.toNumber()};
            const flip = derived.angle.dot.sign() < 0 ? -1 : 1;
            const v = {x: flip * second.u.x.toNumber(), y: flip * second.u.y.toNumber()};
            const start = Math.atan2(u.y, u.x);
            const sweep = Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y);
            const mid = start + sweep / 2;
            arc = {
                start, sweep, degrees: toDegrees(derived.angle.radians),
                label: {x: crossing.x + (ARC_RADIUS + 1.2) * Math.cos(mid), y: crossing.y + (ARC_RADIUS + 1.2) * Math.sin(mid)},
            };
        }
    }
    let tangent: GridXY | undefined;
    let pair: [GridXY | undefined, GridXY | undefined] = [undefined, undefined];
    const result = derived.circle?.result;
    if (result?.kind === "tangent") {
        const x = result.exact.x.toNumber();
        const y = result.exact.y.toNumber();
        if (inView(x, y)) tangent = {x, y};
        else offView = true;
    } else if (result?.kind === "two") {
        const [p0, p1] = result.points;
        pair = [inView(p0.x, p0.y) ? {x: p0.x, y: p0.y} : undefined, inView(p1.x, p1.y) ? {x: p1.x, y: p1.y} : undefined];
        offView = offView || pair.some(p => p === undefined);
    }
    return {
        derived,
        firstLabel: first ? labelAt(state.P, state.Q, first.line.a, first.line.b) : undefined,
        secondLabel: second ? labelAt(state.R, state.S, second.line.a, second.line.b) : undefined,
        normalArrow, secondNormalArrow, foot, rightAngle, distanceLabel, projectionLabel, pointVectorLabel, crossing, arc,
        radius: derived.circle ? Math.sqrt(derived.circle.circle.r2.toNumber()) : 0,
        tangent, pair, offView, footNotDrawn,
    };
}

/**
 * The line graph (L1 to L5): two or more draggable integer-grid handles, one line (or two, or a line and a circle) drawn through
 * them, and in each mode the elements and readouts of one concept: all forms of a line, the normal and the parallel and
 * perpendicular status, the angle between the lines, the distance of a point with its foot and projection, and the
 * intersections. Every number comes from the exact `lineForms` kernel through `deriveLineGeometry`.
 *
 * Ownership: every board object is created in `buildScene` and recorded in `objects`; each line is drawn through two owned hidden
 * points (a line from three coefficient functions would leave helper points behind on removal). The drag listeners are recorded in
 * `listeners`. `disposeScene` removes the listeners and then the objects; it runs on a rebuild, on a scene dispose and, through a
 * session cleanup, on unmount.
 */
export class LineGeometryGraph extends BaseGraph<LineGeometryGraphState, LineGeometryState> {
    private readonly helpId = `line-geometry-point-help-${++helpInstances}`;
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];
    private handles_: Partial<Record<PointField, JXG.Point>> = {};
    /** The view built for one state object; a new state object (every `setState`) invalidates it. */
    private viewCache?: {state: LineGeometryGraphState; view: View};
    /** The state key the board was last drawn for; a sync that finds the same key draws nothing. */
    private drawnKey = "";
    private framed = false;
    private readonly status = new SettledReadout();

    override getInitialState(): LineGeometryGraphState {
        return {initialized: false, ...DEFAULT_LINE_STATE};
    }

    protected override lessonDefaultState(): LineGeometryGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): LineGeometryState {
        return serializeLineGeometryState(DEFAULT_LINE_STATE);
    }

    override presetCollection(): PresetCollection<LineGeometryState> {
        return lineGeometryPresetCollection();
    }

    override exportPreset(): Preset<LineGeometryState> {
        const preset = super.exportPreset();
        const {mode: _mode, target: _target, P: _p, Q: _q, R: _r, S: _s, T: _t, O: _o, B: _b, ...graphState} = preset.graphState as LineGeometryGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): LineGeometryState {
        return serializeLineGeometryState(this.state);
    }

    override importPresetData(data: LineGeometryState): void {
        this.setState(serializeLineGeometryState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): LineGeometryGraphState {
        const parsed = parseLineGeometryState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return [...FIXED_VIEW];
    }

    // ---- Derived numbers ---------------------------------------------------------------------------------------------

    private stateKey(): string {
        const s = this.state;
        return `${s.mode}/${s.target}/${POINT_FIELDS.map(field => `${s[field].x},${s[field].y}`).join("/")}`;
    }

    /** Everything drawn or read, recomputed when the state object changes (a cache keyed by state identity, not a mirror of the state). */
    view(): View {
        const state = this.state;
        const cached = this.viewCache;
        if (cached && cached.state === state) return cached.view;
        const view = buildView(state);
        this.viewCache = {state, view};
        return view;
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and the handles. */
    ownedObjectCount(): number { return this.objects.length; }
    ownedListenerCount(): number { return this.listeners.length; }
    handles(): Readonly<Partial<Record<PointField, JXG.Point>>> { return this.handles_; }

    // ---- Board -------------------------------------------------------------------------------------------------------

    initialize(): void {
        this.buildScene();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => this.status.cancel());
            session.registerCleanup(onLanguageChange(() => this.status.replace(this.statusText())));
        }
        this.status.replace(this.statusText());
    }

    /**
     * Lesson actions (`lines`): `set-mode` is the mode select and `set-points` the coordinate fields of the named handles. Values are checked
     * strictly and completely before the first write (a lesson-content error throws, nothing is snapped or clamped); `setState` writes the
     * store synchronously, so a later action of the same scene reads this one's result, and the board follows in `onStateChange`.
     */
    applyLinesAction(action: Extract<LessonAction, {kind: "lines"}>): void {
        if (action.operation === "set-mode") {
            const mode = LINE_MODES.find(candidate => candidate === action.mode);
            if (!mode) throw new Error(`lines set-mode: mode must be one of ${LINE_MODES.join(", ")}.`);
            this.setState({mode});
            this.requestRender();
            return;
        }
        if (action.operation !== "set-points") {
            const unsupported: never = action;
            throw new Error(`lines: the line graph has no operation in ${JSON.stringify(unsupported)}.`);
        }
        const entries = Object.entries(action.points ?? {});
        if (entries.length === 0) throw new Error("lines set-points: name at least one handle.");
        const next: Partial<Record<PointField, GridXY>> = {};
        for (const [name, point] of entries) {
            const field = POINT_FIELDS.find(candidate => candidate === name);
            if (!field) throw new Error(`lines set-points: ${name} is not a handle (${POINT_FIELDS.join(", ")}).`);
            const valid = (value: unknown) => typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= GRID_LIMIT;
            if (!point || !valid(point.x) || !valid(point.y)) throw new Error(`lines set-points: ${name} must have integer coordinates in [-${GRID_LIMIT}, ${GRID_LIMIT}].`);
            next[field] = {x: point.x === 0 ? 0 : point.x, y: point.y === 0 ? 0 : point.y};
        }
        this.setState(next);
        this.requestRender();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("lines", action => this.applyLinesAction(action));
    }

    protected override onStateChange(_previous: Readonly<LineGeometryGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Moves the handles to the state and redraws when the state differs from what is drawn; reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        for (const field of POINT_FIELDS) this.placeHandle(this.handles_[field], this.state[field]);
        const key = this.stateKey();
        if (key !== this.drawnKey) {
            this.drawnKey = key;
            this.board.update();
        }
        this.frameBoard();
        this.status.report(this.statusText());
    }

    /** Frames the board once: the fixed view, with equal axis scale for the canvas (a user zoom is kept afterwards). */
    private frameBoard(): void {
        if (this.framed) return;
        this.framed = true;
        const {width, height} = JXG.getDimensions(this.board.container, document);
        const [left, top, right, bottom] = FIXED_VIEW;
        const box = fitBoundingBox([[left, top], [right, bottom]], parseFloat(String(width)), parseFloat(String(height)));
        if (box) this.board.setBoundingBox(box, true);
    }

    private placeHandle(handle: JXG.Point | undefined, target: GridXY): void {
        if (handle && (handle.X() !== target.x || handle.Y() !== target.y)) handle.setPosition(JXG.COORDS_BY_USER, [target.x, target.y]);
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        type Visible = () => boolean;
        type Place = () => number;
        type PointFace = NonNullable<JXG.PointAttributes["face"]>;

        const mode = () => this.state.mode;
        const circleTarget: Visible = () => mode() === "intersect" && this.state.target === "circle";
        const linesTarget: Visible = () => mode() === "intersect" && this.state.target === "lines";
        const secondShown: Visible = () => mode() === "normal" || mode() === "angle" || linesTarget();
        const firstDrawn: Visible = () => this.view().derived.first !== undefined;
        const secondDrawn: Visible = () => secondShown() && this.view().derived.second !== undefined;
        const bothDrawn: Visible = () => firstDrawn() && secondDrawn();
        const handleShown = (field: PointField): Visible => () => shownHandles(this.state).includes(field);
        const at = (field: PointField, axis: "x" | "y"): Place => () => this.state[field][axis];

        const hidden = (x: Place, y: Place) =>
            this.own(board.create("point", [x, y], {visible: false, fixed: true, withLabel: false, name: ""}));
        // A cross or plus face is drawn by its stroke alone, so the stroke must carry the colour (a white outline would hide it).
        const strokeOnly = (face: PointFace) => face === "cross" || face === "plus" || face === "x" || face === "+";
        const marker = (x: Place, y: Place, face: PointFace, color: string, size: number, visible: Visible, name = "") =>
            this.own(board.create("point", [x, y], {
                fixed: true, highlight: false, withLabel: name !== "", name, face, size, fillColor: color, visible,
                ...(strokeOnly(face) ? {strokeColor: color, strokeWidth: 2} : {strokeColor: GraphPalette.pointOutline}),
            }));
        const segment = (a: JXG.Point, b: JXG.Point, color: string, width: number, dash: number, visible: Visible, lastArrow = false) =>
            this.own(board.create("segment", [a, b], {
                strokeColor: color, strokeWidth: width, dash, fixed: true, highlight: false, visible, withLabel: false, lastArrow,
            }));
        const label = (x: Place, y: Place, text: () => string, color: string, visible: Visible) =>
            this.own(board.create("text", [x, y, text], {
                strokeColor: color, fontSize: 15, anchorX: "middle", anchorY: "middle", fixed: true, highlight: false, withLabel: false, visible,
            }));
        const line = (a: JXG.Point, b: JXG.Point, color: string, visible: Visible) =>
            this.own(board.create("line", [a, b], {
                strokeColor: color, strokeWidth: 3, fixed: true, highlight: false, withLabel: false, visible,
            }));
        const handleAttributes = (field: PointField): JXG.PointAttributes => ({
            name: field, withLabel: true, size: 7, face: "o", fillColor: GraphPalette.controlPoint, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false, visible: handleShown(field),
            precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
        });

        // ---- handles on the integer grid, one per stored point field
        for (const field of POINT_FIELDS) {
            this.handles_[field] = this.own(board.create("point", [this.state[field].x, this.state[field].y], handleAttributes(field)));
        }
        const h = (field: PointField): JXG.Point => {
            const handle = this.handles_[field];
            if (!handle) throw new Error(`handle ${field} was not created`);
            return handle;
        };

        // ---- the lines, each through two owned hidden points that follow the state
        line(hidden(at("P", "x"), at("P", "y")), hidden(at("Q", "x"), at("Q", "y")), GraphPalette.primaryCurve, firstDrawn);
        line(hidden(at("R", "x"), at("R", "y")), hidden(at("S", "x"), at("S", "y")), GraphPalette.comparisonCurve, secondDrawn);
        label(() => this.view().firstLabel?.x ?? 0, () => this.view().firstLabel?.y ?? 0, () => "ℓ", GraphPalette.primaryCurve, firstDrawn);
        label(() => this.view().secondLabel?.x ?? 0, () => this.view().secondLabel?.y ?? 0, () => "m", GraphPalette.comparisonCurve, secondDrawn);

        // ---- normal mode: the normal arrows n₁ on the first line and n₂ on the second
        const normalArrowOf = (pick: (view: View) => NormalArrow | undefined, caption: string) => {
            const drawn: Visible = () => mode() === "normal" && pick(this.view()) !== undefined;
            const end = (key: "from" | "to", axis: "x" | "y"): Place => () => pick(this.view())?.[key][axis] ?? 0;
            segment(hidden(end("from", "x"), end("from", "y")), hidden(end("to", "x"), end("to", "y")), GraphPalette.constructionAccent, 4, 0, drawn, true);
            label(() => pick(this.view())?.label.x ?? 0, () => pick(this.view())?.label.y ?? 0, () => caption, GraphPalette.constructionAccent, drawn);
        };
        normalArrowOf(view => view.normalArrow, "n₁");
        normalArrowOf(view => view.secondNormalArrow, "n₂");

        // ---- angle mode: the direction vectors u (P to Q) and v (R to S), the arc at the common point
        const angleDrawn: Visible = () => mode() === "angle" && bothDrawn();
        segment(h("P"), h("Q"), GraphPalette.primaryCurve, 2, 2, angleDrawn, true);
        segment(h("R"), h("S"), GraphPalette.comparisonCurve, 2, 2, angleDrawn, true);
        const middle = (a: PointField, b: PointField, axis: "x" | "y", shift: number): Place => () => (this.state[a][axis] + this.state[b][axis]) / 2 + shift;
        label(middle("P", "Q", "x", 0.7), middle("P", "Q", "y", -0.7), () => "u", GraphPalette.primaryCurve, angleDrawn);
        label(middle("R", "S", "x", 0.7), middle("R", "S", "y", -0.7), () => "v", GraphPalette.comparisonCurve, angleDrawn);
        const arcDrawn: Visible = () => angleDrawn() && this.view().arc !== undefined;
        this.own(board.create("curve", [
            (s: number) => (this.view().crossing?.x ?? 0) + ARC_RADIUS * Math.cos((this.view().arc?.start ?? 0) + s * (this.view().arc?.sweep ?? 0)),
            (s: number) => (this.view().crossing?.y ?? 0) + ARC_RADIUS * Math.sin((this.view().arc?.start ?? 0) + s * (this.view().arc?.sweep ?? 0)),
            0, 1,
        ], {strokeColor: GraphPalette.constructionAccent, strokeWidth: 3, fixed: true, highlight: false, withLabel: false, visible: arcDrawn}));
        label(() => this.view().arc?.label.x ?? 0, () => this.view().arc?.label.y ?? 0,
            () => `α = ${formatNumber(this.view().arc?.degrees ?? NaN, currentLanguage(), 4)}°`, GraphPalette.constructionAccent, arcDrawn);

        // ---- distance mode: PT, the foot F, the projection of PT on the normal (the vector F to T) and the right angle at F
        const distanceDrawn: Visible = () => mode() === "distance" && this.view().foot !== undefined;
        const offLine: Visible = () => distanceDrawn() && this.view().rightAngle !== undefined;
        segment(h("P"), h("T"), GraphPalette.referenceCurve, 2, 2, distanceDrawn, true);
        label(() => this.view().pointVectorLabel?.x ?? 0, () => this.view().pointVectorLabel?.y ?? 0, () => "PT", GraphPalette.referenceCurve, distanceDrawn);
        const foot = marker(() => this.view().foot?.x ?? 0, () => this.view().foot?.y ?? 0, "diamond", GraphPalette.constructionAccent, 5, distanceDrawn, "F");
        segment(foot, h("T"), GraphPalette.constructionAccent, 4, 0, offLine, true);
        label(() => this.view().projectionLabel?.x ?? 0, () => this.view().projectionLabel?.y ?? 0, () => "PTₙ", GraphPalette.constructionAccent, offLine);
        const corner = (index: 0 | 1 | 2) => hidden(() => this.view().rightAngle?.[index].x ?? 0, () => this.view().rightAngle?.[index].y ?? 0);
        const [r0, r1, r2] = [corner(0), corner(1), corner(2)];
        segment(r0, r1, GraphPalette.constructionAccent, 2, 0, offLine);
        segment(r1, r2, GraphPalette.constructionAccent, 2, 0, offLine);
        label(() => this.view().distanceLabel?.x ?? 0, () => this.view().distanceLabel?.y ?? 0,
            () => `d ≈ ${formatNumber(this.view().derived.distance?.distance ?? NaN, currentLanguage(), 4)}`, GraphPalette.constructionAccent, offLine);

        // ---- intersect mode: the common point of two lines (also the anchor of the angle arc), or the circle and its points
        marker(() => this.view().crossing?.x ?? 0, () => this.view().crossing?.y ?? 0, "x", GraphPalette.constructionAccent, 6,
            () => (linesTarget() || mode() === "angle") && this.view().crossing !== undefined, "X");
        this.own(board.create("circle", [h("O"), () => this.view().radius], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: 3, fillColor: "none", highlightFillColor: "none", fixed: true,
            highlight: false, withLabel: false, visible: () => circleTarget() && this.view().derived.circle !== undefined,
        }));
        segment(h("O"), h("B"), GraphPalette.referenceCurve, 2, 2, () => circleTarget() && this.view().derived.circle !== undefined);
        const circlePoint = (pick: (view: View) => GridXY | undefined, name: string) =>
            marker(() => pick(this.view())?.x ?? 0, () => pick(this.view())?.y ?? 0, "x", GraphPalette.constructionAccent, 6,
                () => circleTarget() && pick(this.view()) !== undefined, name);
        circlePoint(view => view.tangent, "X");
        circlePoint(view => view.pair[0], "X₁");
        circlePoint(view => view.pair[1], "X₂");

        for (const field of POINT_FIELDS) this.wireDrag(field);
        this.drawnKey = this.stateKey();
        this.framed = false;
        this.frameBoard();
    }

    /** Snaps a dragged handle to the nearest grid point inside [-8, 8]^2 and writes it to the scene state. */
    private wireDrag(field: PointField): void {
        const point = this.handles_[field];
        if (!point) return;
        const onDrag = () => this.dragTo(point, field);
        const board = this.board;
        const onOver = () => { if (!point.visProp.fixed) board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { if (!point.visProp.fixed) board.containerObj.style.cursor = "default"; };
        point.on("drag", onDrag);
        point.on("over", onOver);
        point.on("out", onOut);
        this.listeners.push(() => { point.off("drag", onDrag); point.off("over", onOver); point.off("out", onOut); });
    }

    private dragTo(point: JXG.Point, field: PointField): void {
        const x = snapGridInput(point.X(), field);
        const y = snapGridInput(point.Y(), field);
        if (!x.ok || !y.ok) return;
        this.setPoint(field, x.value.value, y.value.value);
        point.setPosition(JXG.COORDS_BY_USER, [x.value.value, y.value.value]);
        // The board updates right after this handler, so the state it draws is the one just written.
        this.drawnKey = this.stateKey();
        this.status.report(this.statusText());
    }

    private setPoint(field: PointField, x: number, y: number): void {
        const current = this.state[field];
        if (current.x === x && current.y === y) return;
        switch (field) {
            case "P": this.setState({P: {x, y}}); break;
            case "Q": this.setState({Q: {x, y}}); break;
            case "R": this.setState({R: {x, y}}); break;
            case "S": this.setState({S: {x, y}}); break;
            case "T": this.setState({T: {x, y}}); break;
            case "O": this.setState({O: {x, y}}); break;
            default: this.setState({B: {x, y}}); break;
        }
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
        this.handles_ = {};
        this.drawnKey = "";
        this.framed = false;
    }

    // ---- Text -------------------------------------------------------------------------------------------------------

    private num(value: number, language: NumberLanguage, decimals = 4): string {
        return formatNumber(value, language, decimals);
    }

    private exactPoint(point: RationalPoint): string {
        return t("line_geometry_point_format", {value0: signed(point.x), value1: signed(point.y)});
    }

    private approxPoint(x: number, y: number, language: NumberLanguage): string {
        return t("line_geometry_point_format", {value0: this.num(x, language), value1: this.num(y, language)});
    }

    private relationText(relation: NormalRelation): string {
        switch (relation) {
            case "same": return t("line_geometry_relation_same");
            case "parallel": return t("line_geometry_relation_parallel");
            case "perpendicular": return t("line_geometry_relation_perpendicular");
            default: return t("line_geometry_relation_neither");
        }
    }

    private statusText(): string {
        const language = currentLanguage();
        const view = this.view();
        const {derived} = view;
        switch (derived.degenerate) {
            case "first-line": return t("line_geometry_status_coincident_first");
            case "second-line": return t("line_geometry_status_coincident_second");
            case "circle": return t("line_geometry_status_coincident_circle");
            default: break;
        }
        const note = view.offView ? ` ${t(this.state.mode === "angle" ? "line_geometry_status_arc_off_view" : "line_geometry_status_off_view")}` : "";
        const {first, forms, normal, angle, distance, lines, circle} = derived;
        if (forms && first) {
            if (forms.explicit.vertical) return t("line_geometry_status_forms_vertical", {value0: formatExplicit(forms.explicit)});
            const equation = formatImplicit(first.line);
            if (forms.intercept.kind === "origin") return t("line_geometry_status_forms_origin", {value0: equation});
            if (forms.intercept.kind === "axis-parallel") return t("line_geometry_status_forms_axis", {value0: equation});
            return t("line_geometry_status_forms_all", {value0: equation});
        }
        if (normal) {
            switch (normal.relation) {
                case "same": return t("line_geometry_status_normal_same");
                case "parallel": return t("line_geometry_status_normal_parallel");
                case "perpendicular": return t("line_geometry_status_normal_perpendicular");
                default: return t("line_geometry_status_normal_neither", {value0: signed(normal.cross), value1: signed(normal.dot)});
            }
        }
        if (angle) {
            const degrees = this.num(toDegrees(angle.radians), language);
            if (angle.relation === "parallel") return t("line_geometry_status_angle_parallel");
            if (angle.relation === "perpendicular") return t("line_geometry_status_angle_perpendicular") + note;
            return t("line_geometry_status_angle", {value0: degrees}) + note;
        }
        if (distance) {
            if (distance.onLine) return t("line_geometry_status_distance_on_line");
            return t("line_geometry_status_distance", {value0: signed(distance.distanceSquared), value1: this.num(distance.distance, language)})
                + (view.footNotDrawn ? ` ${t("line_geometry_status_foot_off_view")}` : "");
        }
        if (lines) {
            if (lines.kind === "same") return t("line_geometry_status_lines_same");
            if (lines.kind === "parallel") return t("line_geometry_status_lines_parallel");
            return t("line_geometry_status_lines_point", {value0: this.exactPoint(lines.point)}) + note;
        }
        if (circle) {
            switch (circle.result.kind) {
                case "none": return t("line_geometry_status_circle_none", {value0: signed(circle.discriminant)});
                case "tangent": return t("line_geometry_status_circle_tangent", {value0: this.exactPoint(new RationalPoint(circle.result.exact.x, circle.result.exact.y))}) + note;
                default: return t("line_geometry_status_circle_two", {value0: signed(circle.discriminant)}) + note;
            }
        }
        return "";
    }

    private rows(): ReadoutListRow[] {
        const language = currentLanguage();
        const view = this.view();
        const {derived} = view;
        const {first, second, forms, normal, angle, distance, lines, circle} = derived;
        const rows: ReadoutListRow[] = [];
        const row = (id: string, labelText: string, value: string) => rows.push({id, label: labelText, value});
        if (forms && first) {
            const {explicit, intercept, twoPoint} = forms;
            row("two-point", t("line_geometry_row_two_point"),
                twoPoint.vertical ? t("line_geometry_value_undefined_vertical") : formatTwoPoint(this.state.P, twoPoint.dx, twoPoint.dy));
            row("implicit-raw", t("line_geometry_row_implicit_raw"), formatImplicit(first.raw));
            row("implicit", t("line_geometry_row_implicit"), formatImplicit(first.line));
            row("explicit", t("line_geometry_row_explicit"), explicit.vertical ? t("line_geometry_value_undefined_vertical") : formatExplicit(explicit));
            row("intercept", t("line_geometry_row_intercept"),
                intercept.kind === "form" ? formatIntercept(intercept.form)
                    : intercept.kind === "origin" ? t("line_geometry_value_undefined_origin") : t("line_geometry_value_undefined_axis"));
            row("vertical", t("line_geometry_row_vertical"),
                explicit.vertical ? t("line_geometry_value_vertical_yes", {value0: formatExplicit(explicit)}) : t("line_geometry_value_vertical_no"));
        }
        if (normal && first && second) {
            row("implicit-1", t("line_geometry_row_implicit_first"), formatImplicit(first.line));
            row("implicit-2", t("line_geometry_row_implicit_second"), formatImplicit(second.line));
            row("normal-1", t("line_geometry_row_normal_first"), this.exactPoint(normal.n1));
            row("normal-2", t("line_geometry_row_normal_second"), this.exactPoint(normal.n2));
            row("cross", "a₁b₂ − a₂b₁", signed(normal.cross));
            row("dot", "a₁a₂ + b₁b₂", signed(normal.dot));
            row("slopes", "k₁ · k₂", normal.slopeProduct ? signed(normal.slopeProduct) : t("line_geometry_value_no_slope"));
            row("relation", t("line_geometry_row_relation"), this.relationText(normal.relation));
        }
        if (angle) {
            row("direction-u", t("line_geometry_row_direction_u"), this.exactPoint(angle.u));
            row("direction-v", t("line_geometry_row_direction_v"), this.exactPoint(angle.v));
            row("dot", "u · v", signed(angle.dot));
            row("cross", "u × v", signed(angle.cross));
            row("angle", t("line_geometry_row_angle"), `${this.num(toDegrees(angle.radians), language)}°`);
            row("cosine-rule", t("line_geometry_row_cosine_rule"),
                `${signed(angle.differenceSquared)} = ${signed(angle.uSquared)} + ${signed(angle.vSquared)} − 2 · ${signed(angle.dot)}`);
        }
        if (distance && first) {
            row("implicit", t("line_geometry_row_implicit"), formatImplicit(first.line));
            row("value", t("line_geometry_row_value"), signed(distance.value));
            row("norm", "a² + b²", signed(distance.normSquared));
            row("distance-squared", "d²", signed(distance.distanceSquared));
            row("distance", t("line_geometry_row_distance"), `≈ ${this.num(distance.distance, language)}`);
            row("foot", t("line_geometry_row_foot"), this.exactPoint(distance.foot));
            row("pt", t("line_geometry_row_pt"), this.exactPoint(distance.pt));
            row("pt-dot-n", "PT · n", signed(distance.ptDotN));
            row("projection", t("line_geometry_row_projection"), this.exactPoint(distance.projection));
        }
        if (lines && first && second) {
            row("implicit-1", t("line_geometry_row_implicit_first"), formatImplicit(first.line));
            row("implicit-2", t("line_geometry_row_implicit_second"), formatImplicit(second.line));
            if (lines.kind === "point") {
                row("point", t("line_geometry_row_point"), this.exactPoint(lines.point));
                row("point-approx", t("line_geometry_row_point_approx"), this.approxPoint(lines.point.x.toNumber(), lines.point.y.toNumber(), language));
            } else {
                row("point", t("line_geometry_row_point"), t(lines.kind === "same" ? "line_geometry_value_no_point_same" : "line_geometry_value_no_point_parallel"));
            }
        }
        if (circle && first) {
            const result = circle.result;
            row("implicit", t("line_geometry_row_implicit"), formatImplicit(first.line));
            row("r-squared", "r²", signed(circle.circle.r2));
            row("s", t("line_geometry_row_s"), signed(circle.s));
            row("norm", "a² + b²", signed(circle.normSquared));
            row("discriminant", t("line_geometry_row_discriminant"), signed(circle.discriminant));
            row("count", t("line_geometry_row_count"), `${result.kind === "none" ? 0 : result.kind === "tangent" ? 1 : 2}`);
            if (result.kind === "tangent") {
                row("points", t("line_geometry_row_tangent_point"),this.exactPoint(new RationalPoint(result.exact.x, result.exact.y)));
            } else if (result.kind === "two") {
                result.points.forEach((p, index) => row(`points-${index + 1}`, t("line_geometry_row_point_n", {value0: `${index + 1}`}),
                    `≈ ${this.approxPoint(p.x, p.y, language)}`));
            }
        }
        return rows;
    }

    // ---- Controls -----------------------------------------------------------------------------------------------------

    private editPoint(field: PointField, axis: "x" | "y", value: number): boolean {
        const snapped = snapGridInput(value, field);
        if (!snapped.ok) return false;
        const current = this.state[field];
        this.setPoint(field, axis === "x" ? snapped.value.value : current.x, axis === "y" ? snapped.value.value : current.y);
        this.requestRender();
        return true;
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("line_geometry_mode_label")} value={state.mode}
                          options={[
                              {value: "forms", text: t("line_geometry_mode_forms")},
                              {value: "normal", text: t("line_geometry_mode_normal")},
                              {value: "angle", text: t("line_geometry_mode_angle")},
                              {value: "distance", text: t("line_geometry_mode_distance")},
                              {value: "intersect", text: t("line_geometry_mode_intersect")},
                          ]}
                          onChange={value => {
                              const mode = LINE_MODES.find(candidate => candidate === value);
                              if (mode) this.setState({mode});
                          }}/>,
        ];
        if (state.mode === "intersect") {
            commands.push(
                <ChoiceSelect key="target" label={t("line_geometry_target_label")} value={state.target}
                              options={[
                                  {value: "lines", text: t("line_geometry_target_lines")},
                                  {value: "circle", text: t("line_geometry_target_circle")},
                              ]}
                              onChange={value => {
                                  const target = INTERSECT_TARGETS.find(candidate => candidate === value);
                                  if (target) this.setState({target});
                              }}/>,
            );
        }
        commands.push(<p key="point-help" id={this.helpId} className="number-input-help">{t("line_geometry_point_help", {
            value0: formatNumber(-GRID_LIMIT, currentLanguage(), 0), value1: formatNumber(GRID_LIMIT, currentLanguage(), 0),
        })}</p>);
        for (const field of shownHandles(state)) {
            for (const axis of ["x", "y"] as const) {
                commands.push(
                    <NumberInput key={`${field}-${axis}`} label={t("line_geometry_point_label", {value0: field, value1: axis})}
                                 value={state[field][axis]} min={-GRID_LIMIT} max={GRID_LIMIT} step={POINT_STEP}
                                 bigStep={POINT_BIG_STEP} integer decimals={0} describedBy={this.helpId}
                                 onChange={value => this.editPoint(field, axis, value)}/>,
                );
            }
        }
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("line_geometry_readout_title")}</ReadoutHeading>
                <p data-line-status="">{this.statusText()}</p>
                <ReadoutList label={t("line_geometry_readout_title")} rows={this.rows()}/>
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
