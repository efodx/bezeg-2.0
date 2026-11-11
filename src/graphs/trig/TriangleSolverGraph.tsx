import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {triangleSolverPresetCollection} from "./trigPresetCollection";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {FunctionLegend} from "../functions/FunctionReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {fitBoundingBox, FitPoint} from "../base/fitBoundingBox";
import {angleBetween} from "../../compgeo/circle";
import {Rational, RationalPoint} from "../../compgeo/rational";
import type {TriangleShape} from "../../compgeo/triangle";
import {angleAtAntipode, CosineRule, SineRule} from "../../trig/sineCosineRules";
import {SolveResult, triangleFromSolution, Vertices} from "../../trig/triangleSolver";
import {
    DEFAULT_SOLVE_DATA, DEFAULT_TRIANGLE_STATE, deriveTriangle, parseTriangleState, serializeTriangleState, SIDE_MAX, SIDE_MIN, SOLVE_DATA_TYPES, SOLVER_ANGLE_MAX,
    SOLVER_ANGLE_MIN, snapSideInput, snapSolverAngleInput, snapVertexInput, TRIANGLE_MODES, TriangleDerived, TriangleState,
} from "../../trig/trigModel";

/** The scene state: the stored triangle fields (mode, vertices, solver data); the vertices are integer grid points. */
export type TriangleSolverGraphState = BaseGraphState & TriangleState;

type Vertex = "A" | "B" | "C";
const VERTICES: readonly Vertex[] = ["A", "B", "C"];

/** Pointer tolerance in screen pixels around a handle (see `UnitCircleGraph`): 26 gives a 52 px touch zone, above 44 px. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;
/** Keyboard steps of a vertex coordinate (the arrow keys move one grid unit, Shift and the Page keys five). */
export const VERTEX_STEP = 1;
export const VERTEX_BIG_STEP = 5;

/** The length bars of the cosine rule sit right of the triangle: rows of squared lengths, one scale for all. */
export const BAR_X = 9;
export const BAR_LENGTH = 6;
export const BAR_ROW_C = 4.4;
export const BAR_ROW_AB = 3;
/** The fixed view of the sides and circle modes: [left, top, right, bottom]. */
export const FIXED_VIEW: readonly [number, number, number, number] = [-3, 12, 17, -8];
/** Typed or dragged vertices stay left of the length bars (x from BAR_X - 1) and a margin of 1 inside the fixed view. */
export const VERTEX_MARGIN = 1;
export const VERTEX_X_MIN = FIXED_VIEW[0] + VERTEX_MARGIN;
export const VERTEX_X_MAX = BAR_X - 1;
export const VERTEX_Y_MIN = FIXED_VIEW[3] + VERTEX_MARGIN;
export const VERTEX_Y_MAX = FIXED_VIEW[1] - VERTEX_MARGIN;
const clampVertexCoordinate = (axis: "x" | "y", value: number): number =>
    axis === "x" ? Math.min(VERTEX_X_MAX, Math.max(VERTEX_X_MIN, value)) : Math.min(VERTEX_Y_MAX, Math.max(VERTEX_Y_MIN, value));
/** The SSA ray extends this far past the largest solved side and past the circle about C; the solve view pads the drawing by 1. */
export const RAY_OVERSHOOT = 2;
/** The colours of the solid circumcircle and of the SSA arc about C, which the legend states. */
export const CIRCUMCIRCLE_COLOR = GraphPalette.referenceCurve;
export const SSA_ARC_COLOR = GraphPalette.referenceCurve;
export const SOLVE_VIEW_PADDING = 1;

interface SsaConstruction {
    readonly a: number;
    readonly b: number;
    /** Vertex C = b (cos A, sin A) on the ray from A = (0, 0) along the x-axis, and the foot of the height from C. */
    readonly C: {readonly x: number; readonly y: number};
    readonly h: number;
}

interface View {
    readonly derived: TriangleDerived;
    /** The solver triangles as drawn, re-placed from the solution by `triangleFromSolution`. */
    readonly drawn: readonly Vertices[];
    readonly ssa: SsaConstruction | undefined;
    /** Where the SSA ray ends: past the largest solved side and past the circle about C. */
    readonly rayEnd: number;
    /** The corners of what the solve mode draws, padded; empty when nothing is drawn. */
    readonly solveExtent: readonly FitPoint[];
}

export interface Measured {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly angleA: number;
    readonly angleB: number;
    readonly angleC: number;
    readonly area: number;
}

/** Sides by distance, angles by `angleBetween` and the area by the shoelace formula, all taken from the drawn vertices. */
export function measureDrawn(v: Vertices): Measured {
    const side = (p: {x: number; y: number}, q: {x: number; y: number}) => Math.hypot(p.x - q.x, p.y - q.y);
    return {
        a: side(v.B, v.C), b: side(v.C, v.A), c: side(v.A, v.B),
        angleA: angleBetween(v.A, v.B, v.C) ?? NaN,
        angleB: angleBetween(v.B, v.C, v.A) ?? NaN,
        angleC: angleBetween(v.C, v.A, v.B) ?? NaN,
        area: Math.abs((v.B.x - v.A.x) * (v.C.y - v.A.y) - (v.C.x - v.A.x) * (v.B.y - v.A.y)) / 2,
    };
}

/** The corners of everything the solve mode draws (triangles, SSA circle about C, height and ray), padded on every side. */
function solveExtent(drawn: readonly Vertices[], ssa: SsaConstruction | undefined, rayEnd: number): FitPoint[] {
    const points: FitPoint[] = [];
    for (const v of drawn) for (const q of [v.A, v.B, v.C]) points.push([q.x, q.y]);
    if (ssa) {
        points.push([0, 0], [rayEnd, 0], [ssa.C.x - ssa.a, ssa.C.y - ssa.a], [ssa.C.x + ssa.a, ssa.C.y + ssa.a]);
    }
    if (!points.length) return [];
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const pad = SOLVE_VIEW_PADDING;
    return [[Math.min(...xs) - pad, Math.min(...ys) - pad], [Math.max(...xs) + pad, Math.max(...ys) + pad]];
}

const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const signed = (value: bigint): string => value.toString().replace("-", "−");

const shapeText = (shape: TriangleShape): string => {
    switch (shape) {
        case "acute": return t("triangle_solver_shape_acute");
        case "right": return t("triangle_solver_shape_right");
        default: return t("triangle_solver_shape_obtuse");
    }
};
const angleShapeText = (shape: TriangleShape): string => {
    switch (shape) {
        case "acute": return t("triangle_solver_angle_acute");
        case "right": return t("triangle_solver_angle_right");
        default: return t("triangle_solver_angle_obtuse");
    }
};

type FieldKind = "side" | "angle";
interface DataField {
    readonly name: string;
    readonly kind: FieldKind;
}
const DATA_FIELDS = {
    sss: [{name: "a", kind: "side"}, {name: "b", kind: "side"}, {name: "c", kind: "side"}],
    sas: [{name: "b", kind: "side"}, {name: "c", kind: "side"}, {name: "angleA", kind: "angle"}],
    asa: [{name: "angleA", kind: "angle"}, {name: "angleB", kind: "angle"}, {name: "c", kind: "side"}],
    ssa: [{name: "a", kind: "side"}, {name: "b", kind: "side"}, {name: "angleA", kind: "angle"}],
} as const satisfies Record<string, readonly DataField[]>;
/** Counts instances so that the vertex help id of two graphs on one page never collides. */
let helpInstances = 0;
const FIELD_SYMBOL: Readonly<Record<string, string>> = {a: "a", b: "b", c: "c", angleA: "A", angleB: "B"};

/**
 * The triangle graph (TR3 to TR5): in `sides` and `circle` mode three draggable integer-grid vertices with the sine and cosine rule
 * readouts, the circumcircle, the diameter BA' and the auxiliary triangle; in `solve` mode the solver result for the chosen data
 * type, drawn from the solution and re-measured on the drawn vertices. All numbers come from the `src/trig` kernel.
 *
 * Ownership: every board object is created in `buildScene` and recorded in `objects`; the drag listeners are recorded in `listeners`.
 * `disposeScene` removes the listeners and then the objects; it runs on a rebuild, on a scene dispose and, through a session cleanup,
 * on unmount.
 */
export class TriangleSolverGraph extends BaseGraph<TriangleSolverGraphState, TriangleState> {
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];
    private handles_: Partial<Record<Vertex, JXG.Point>> = {};
    private viewCache?: {key: string; view: View};
    /** The state key the board was last drawn for; a sync that finds the same key draws nothing. */
    private drawnKey = "";
    /** The view the board was last framed for: "fixed" for sides and circle, the state key in solve mode (so a user zoom is kept). */
    private framedKey = "";
    private readonly status = new SettledReadout();
    private readonly vertexHelpId = `triangle-solver-vertex-help-${++helpInstances}`;

    override getInitialState(): TriangleSolverGraphState {
        return {initialized: false, ...DEFAULT_TRIANGLE_STATE};
    }

    protected override lessonDefaultState(): TriangleSolverGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): TriangleState {
        return serializeTriangleState(DEFAULT_TRIANGLE_STATE);
    }

    override presetCollection(): PresetCollection<TriangleState> {
        return triangleSolverPresetCollection();
    }

    override exportPreset(): Preset<TriangleState> {
        const preset = super.exportPreset();
        const {mode: _mode, A: _a, B: _b, C: _c, data: _data, ...graphState} = preset.graphState as TriangleSolverGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): TriangleState {
        return serializeTriangleState(this.state);
    }

    override importPresetData(data: TriangleState): void {
        this.setState(serializeTriangleState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): TriangleSolverGraphState {
        const parsed = parseTriangleState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return [...FIXED_VIEW];
    }

    // ---- Derived numbers ---------------------------------------------------------------------------------------------

    private stateKey(): string {
        const {mode, A, B, C, data} = this.state;
        return `${mode}/${A.x},${A.y}/${B.x},${B.y}/${C.x},${C.y}/${JSON.stringify(data)}`;
    }

    /** Everything drawn or read, recomputed when the state changes (a cache keyed by its inputs, not a mirror of the state). */
    view(): View {
        const key = this.stateKey();
        const cached = this.viewCache;
        if (cached && cached.key === key) return cached.view;
        const derived = deriveTriangle(this.state);
        const drawn = this.drawnTriangles(derived.solution);
        const data = this.state.data;
        let ssa: SsaConstruction | undefined;
        if (data.type === "ssa" && !(derived.solution.kind === "none" && derived.solution.reason === "out-of-grid")) {
            const rad = toRad(data.angleA);
            ssa = {a: data.a, b: data.b, C: {x: data.b * Math.cos(rad), y: data.b * Math.sin(rad)}, h: data.b * Math.sin(rad)};
        }
        const rayEnd = ssa
            ? Math.max(ssa.C.x + ssa.a, ...drawn.map(v => Math.hypot(v.B.x - v.A.x, v.B.y - v.A.y))) + RAY_OVERSHOOT
            : 0;
        const view: View = {derived, drawn, ssa, rayEnd, solveExtent: solveExtent(drawn, ssa, rayEnd)};
        this.viewCache = {key, view};
        return view;
    }

    private drawnTriangles(result: SolveResult): readonly Vertices[] {
        switch (result.kind) {
            case "one": return [triangleFromSolution(result.triangle)];
            case "two": return [triangleFromSolution(result.triangles[0]), triangleFromSolution(result.triangles[1])];
            default: return [];
        }
    }

    private proper(): {sine: SineRule; cosine: CosineRule} | undefined {
        const {sine, cosine} = this.view().derived;
        return sine.kind === "proper" && cosine.kind === "proper" ? {sine, cosine} : undefined;
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and the vertex handles. */
    ownedObjectCount(): number { return this.objects.length; }
    ownedListenerCount(): number { return this.listeners.length; }
    handles(): Readonly<Partial<Record<Vertex, JXG.Point>>> { return this.handles_; }

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

    protected override onStateChange(_previous: Readonly<TriangleSolverGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        // A replacement (checkpoint restore, Preset import) brings its own view; only a later change of the solve data refits.
        this.framedKey = this.state.mode === "solve" ? this.stateKey() : "fixed";
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Moves the handles to the state and redraws when the state differs from what is drawn; reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        for (const vertex of VERTICES) this.placeHandle(this.handles_[vertex], this.state[vertex]);
        const key = this.stateKey();
        if (key !== this.drawnKey) {
            this.drawnKey = key;
            this.board.update();
        }
        this.frameBoard();
        this.status.report(this.statusText());
    }

    /** Frames the board: the solve mode fits the drawn solution(s) with equal axis scale, the other modes return to the fixed view. */
    private frameBoard(): void {
        const solving = this.state.mode === "solve";
        const key = solving ? this.stateKey() : "fixed";
        if (key === this.framedKey) return;
        this.framedKey = key;
        const {width, height} = JXG.getDimensions(this.board.container, document);
        const extent = solving ? this.view().solveExtent : [];
        const [left, top, right, bottom] = FIXED_VIEW;
        const box = fitBoundingBox(extent.length ? extent : [[left, top], [right, bottom]], parseFloat(String(width)), parseFloat(String(height)));
        if (box) this.board.setBoundingBox(box, true);
    }

    private placeHandle(handle: JXG.Point | undefined, target: {readonly x: number; readonly y: number}): void {
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

        const inSolve: Visible = () => this.state.mode === "solve";
        const inSides: Visible = () => this.state.mode === "sides";
        const inCircle: Visible = () => this.state.mode === "circle";
        const inGeometry: Visible = () => this.state.mode !== "solve";
        const properNow: Visible = () => this.proper() !== undefined;
        const circleDrawn: Visible = () => inCircle() && properNow();
        const auxDrawn: Visible = () => circleDrawn() && !this.proper()?.sine.rightAtA;
        const barsDrawn: Visible = () => inSides() && properNow();
        const triangleDrawn = (index: number): Visible => () => inSolve() && this.view().drawn.length > index;
        const ssaDrawn: Visible = () => inSolve() && this.view().ssa !== undefined;

        const hidden = (x: Place, y: Place) =>
            this.own(board.create("point", [x, y], {visible: false, fixed: true, withLabel: false, name: ""}));
        const marker = (x: Place, y: Place, face: PointFace, color: string, size: number, visible: Visible) =>
            this.own(board.create("point", [x, y], {
                fixed: true, highlight: false, withLabel: false, name: "", face, size, fillColor: color, strokeColor: GraphPalette.pointOutline, visible,
            }));
        const segment = (a: JXG.Point, b: JXG.Point, color: string, width: number, dash: number, visible: Visible, lastArrow = false) =>
            this.own(board.create("segment", [a, b], {
                strokeColor: color, strokeWidth: width, dash, fixed: true, highlight: false, visible, withLabel: false, lastArrow,
            }));
        const label = (x: Place, y: Place, text: () => string, color: string, visible: Visible) =>
            this.own(board.create("text", [x, y, text], {
                strokeColor: color, fontSize: 15, anchorX: "middle", anchorY: "middle", fixed: true, highlight: false, withLabel: false, visible,
            }));
        const handleAttributes = (name: string): JXG.PointAttributes => ({
            name, withLabel: true, size: 7, face: "o", fillColor: GraphPalette.controlPoint, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false, visible: inGeometry,
            precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
        });

        // ---- sides and circle modes: the triangle on three draggable grid vertices
        const handleFor = (vertex: Vertex) => {
            const handle = this.own(board.create("point", [this.state[vertex].x, this.state[vertex].y], handleAttributes(vertex)));
            this.handles_[vertex] = handle;
            return handle;
        };
        const hA = handleFor("A");
        const hB = handleFor("B");
        const hC = handleFor("C");
        segment(hB, hC, GraphPalette.primaryCurve, 3, 0, inGeometry);
        segment(hC, hA, GraphPalette.primaryCurve, 3, 0, inGeometry);
        segment(hA, hB, GraphPalette.primaryCurve, 3, 0, inGeometry);
        const mid = (p: Vertex, q: Vertex, axis: "x" | "y"): Place => () => (this.state[p][axis] + this.state[q][axis]) / 2;
        label(mid("B", "C", "x"), mid("B", "C", "y"), () => "a", GraphPalette.label, inGeometry);
        label(mid("C", "A", "x"), mid("C", "A", "y"), () => "b", GraphPalette.label, inGeometry);
        label(mid("A", "B", "x"), mid("A", "B", "y"), () => "c", GraphPalette.label, inGeometry);

        // The circumcircle, the diameter B A' and the auxiliary triangle B A' C (circle mode, exact centre and antipode).
        const centre = hidden(() => this.proper()?.sine.circumcentre.x.toNumber() ?? 0, () => this.proper()?.sine.circumcentre.y.toNumber() ?? 0);
        this.own(board.create("circle", [centre, () => Math.sqrt(this.proper()?.sine.r2.toNumber() ?? 0)], {
            strokeColor: CIRCUMCIRCLE_COLOR, strokeWidth: 2, fillColor: "none", highlightFillColor: "none", fixed: true,
            highlight: false, withLabel: false, visible: circleDrawn,
        }));
        const antipodeAt = (axis: "x" | "y"): Place => () => this.proper()?.sine.antipode[axis].toNumber() ?? 0;
        const antipode = this.own(board.create("point", [antipodeAt("x"), antipodeAt("y")], {
            fixed: true, highlight: false, withLabel: true, name: "A′", face: "diamond", size: 5, fillColor: GraphPalette.constructionAccent,
            strokeColor: GraphPalette.pointOutline, visible: circleDrawn,
        }));
        segment(hB, antipode, GraphPalette.constructionAccent, 3, 0, circleDrawn);
        segment(antipode, hC, GraphPalette.comparisonCurve, 2, 2, auxDrawn);

        // The cosine rule as length bars: c^2 against a^2 + b^2, the difference being the correction 2 CA.CB.
        const scale = () => {
            const rule = this.proper()?.cosine;
            return rule ? BAR_LENGTH / Math.max(Number(rule.c2), Number(rule.a2 + rule.b2), 1) : 0;
        };
        const squares = () => {
            const rule = this.proper()?.cosine;
            return {a2: Number(rule?.a2 ?? 0n), b2: Number(rule?.b2 ?? 0n), c2: Number(rule?.c2 ?? 0n), corr: Number(rule?.correction ?? 0n)};
        };
        const barStart = (y: number) => hidden(() => BAR_X, () => y);
        const barPoint = (x: () => number, y: number) => hidden(() => BAR_X + x() * scale(), () => y);
        const rowC = barStart(BAR_ROW_C);
        const rowAB = barStart(BAR_ROW_AB);
        const endC = barPoint(() => squares().c2, BAR_ROW_C);
        const midAB = barPoint(() => squares().a2, BAR_ROW_AB);
        const endAB = barPoint(() => squares().a2 + squares().b2, BAR_ROW_AB);
        segment(rowC, endC, GraphPalette.referenceCurve, 8, 0, barsDrawn);
        segment(rowAB, midAB, GraphPalette.primaryCurve, 8, 0, barsDrawn);
        segment(midAB, endAB, GraphPalette.comparisonCurve, 8, 0, barsDrawn);
        // The correction continues the shorter row up to the longer one, dashed; its sign decides which row that is.
        const shorterRow = () => (squares().corr >= 0 ? BAR_ROW_C : BAR_ROW_AB);
        const corrFrom = hidden(() => BAR_X + Math.min(squares().c2, squares().a2 + squares().b2) * scale(), () => shorterRow());
        const corrTo = hidden(() => BAR_X + Math.max(squares().c2, squares().a2 + squares().b2) * scale(), () => shorterRow());
        segment(corrFrom, corrTo, GraphPalette.constructionAccent, 8, 2, () => barsDrawn() && squares().corr !== 0);
        label(() => BAR_X + (squares().c2 * scale()) / 2, () => BAR_ROW_C + 0.55, () => "c²", GraphPalette.label, barsDrawn);
        label(() => BAR_X + (squares().a2 * scale()) / 2, () => BAR_ROW_AB - 0.55, () => "a²", GraphPalette.primaryCurve, barsDrawn);
        label(() => BAR_X + ((squares().a2 + squares().b2 / 2) * scale()), () => BAR_ROW_AB - 0.55, () => "b²", GraphPalette.comparisonCurve, barsDrawn);
        label(() => BAR_X + 3, () => BAR_ROW_AB - 1.6, () => `${t("triangle_solver_bar_correction")} = ${signed(this.proper()?.cosine.correction ?? 0n)}`,
            GraphPalette.constructionAccent, barsDrawn);

        // ---- solve mode: the solved triangle(s), and for SSA the height, the ray and the circle of radius a around C
        const point = (index: number, name: "A" | "B" | "C"): Place[] => {
            const read = (axis: "x" | "y"): Place => () => this.view().drawn[index]?.[name][axis] ?? 0;
            return [read("x"), read("y")];
        };
        const corner = (index: number, name: "A" | "B" | "C", face: PointFace, color: string) => {
            const [x, y] = point(index, name);
            return marker(x, y, face, color, 5, triangleDrawn(index));
        };
        const triangle = (index: number, color: string, dash: number) => {
            const a = corner(index, "A", "o", color);
            const b = corner(index, "B", index === 0 ? "o" : "square", color);
            const c = corner(index, "C", "o", color);
            segment(a, b, color, 3, dash, triangleDrawn(index));
            segment(b, c, color, 3, dash, triangleDrawn(index));
            segment(c, a, color, 3, dash, triangleDrawn(index));
            const [bx, by] = point(index, "B");
            label(() => bx() + 0.4, () => by() - 0.5, () => (this.view().drawn.length > 1 ? t(index === 0 ? "triangle_solver_label_b1" : "triangle_solver_label_b2") : "B"),
                color, triangleDrawn(index));
        };
        triangle(0, GraphPalette.primaryCurve, 0);
        triangle(1, GraphPalette.comparisonCurve, 2);
        const [ax, ay] = point(0, "A");
        const [cx, cy] = point(0, "C");
        label(() => ax() - 0.5, () => ay() - 0.5, () => "A", GraphPalette.label, triangleDrawn(0));
        label(() => cx(), () => cy() + 0.6, () => "C", GraphPalette.label, triangleDrawn(0));

        const ssaOrigin = hidden(() => 0, () => 0);
        const ssaEnd = hidden(() => this.view().rayEnd, () => 0);
        const ssaC = marker(() => this.view().ssa?.C.x ?? 0, () => this.view().ssa?.C.y ?? 0, "o", GraphPalette.primaryCurve, 5, ssaDrawn);
        const ssaFoot = hidden(() => this.view().ssa?.C.x ?? 0, () => 0);
        segment(ssaOrigin, ssaEnd, GraphPalette.label, 2, 0, ssaDrawn, true);
        segment(ssaC, ssaFoot, GraphPalette.constructionAccent, 2, 2, ssaDrawn);
        segment(ssaOrigin, ssaC, GraphPalette.primaryCurve, 2, 0, () => ssaDrawn() && this.view().drawn.length === 0);
        this.own(board.create("circle", [ssaC, () => this.view().ssa?.a ?? 0], {
            strokeColor: SSA_ARC_COLOR, strokeWidth: 2, fillColor: "none", highlightFillColor: "none", fixed: true,
            highlight: false, withLabel: false, visible: ssaDrawn,
        }));
        label(() => (this.view().ssa?.C.x ?? 0) - 0.5, () => (this.view().ssa?.C.y ?? 0) / 2, () => "h", GraphPalette.constructionAccent, ssaDrawn);

        for (const vertex of VERTICES) this.wireDrag(vertex);
        this.drawnKey = this.stateKey();
        // The view is framed by the sync that follows the build: a replacement may bring a stored view, which a frame here would overwrite.
        this.framedKey = this.state.mode === "solve" ? "" : "fixed";
    }

    /** Snaps a dragged vertex handle to the nearest integer point and writes it to the scene state. */
    private wireDrag(vertex: Vertex): void {
        const point = this.handles_[vertex];
        if (!point) return;
        const onDrag = () => this.dragTo(point, vertex);
        const board = this.board;
        const onOver = () => { if (!point.visProp.fixed) board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { if (!point.visProp.fixed) board.containerObj.style.cursor = "default"; };
        point.on("drag", onDrag);
        point.on("over", onOver);
        point.on("out", onOut);
        this.listeners.push(() => { point.off("drag", onDrag); point.off("over", onOver); point.off("out", onOut); });
    }

    private dragTo(point: JXG.Point, vertex: Vertex): void {
        const x = snapVertexInput(point.X(), vertex);
        const y = snapVertexInput(point.Y(), vertex);
        if (!x.ok || !y.ok) return;
        const px = clampVertexCoordinate("x", x.value.value);
        const py = clampVertexCoordinate("y", y.value.value);
        this.setVertex(vertex, px, py);
        point.setPosition(JXG.COORDS_BY_USER, [px, py]);
        // The board updates right after this handler, so the state it draws is the one just written.
        this.drawnKey = this.stateKey();
        this.status.report(this.statusText());
    }

    private setVertex(vertex: Vertex, x: number, y: number): void {
        const current = this.state[vertex];
        if (current.x === x && current.y === y) return;
        if (vertex === "A") this.setState({A: {x, y}});
        else if (vertex === "B") this.setState({B: {x, y}});
        else this.setState({C: {x, y}});
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
        this.framedKey = "";
    }

    // ---- Text -------------------------------------------------------------------------------------------------------

    private num(value: number, language: NumberLanguage, decimals = 5): string {
        return formatNumber(value, language, decimals);
    }

    private degrees(radians: number, language: NumberLanguage): string {
        return `${formatNumber(toDegrees(radians), language, 4)}°`;
    }

    private approx(value: number, language: NumberLanguage): string {
        return t("triangle_solver_approx_value", {value0: this.num(value, language)});
    }

    /** A measured quantity as `name = value` when the shown (rounded) value is the value itself, otherwise `name ≈ value`. */
    private measured(name: string, value: number, shown: string, decimals: number): string {
        const exact = !Number.isFinite(value) || Math.abs(value - Number(value.toFixed(decimals))) < 1e-9;
        return exact ? `${name} = ${shown}` : `${name} ${t("triangle_solver_approx_value", {value0: shown})}`;
    }

    /** A side from its exact squared length: an integer when the square is perfect, otherwise the radical with its rounded value. */
    private sideText(square: bigint, language: NumberLanguage): string {
        const root = Math.round(Math.sqrt(Number(square)));
        if (BigInt(root) * BigInt(root) === square) return `${root}`;
        return t("triangle_solver_sqrt_value", {value0: `${square}`, value1: this.num(Math.sqrt(Number(square)), language)});
    }

    private pointText(point: RationalPoint): string {
        return t("triangle_solver_point_format", {value0: point.x.format(), value1: point.y.format()});
    }

    private rationalText(value: Rational): string {
        return value.format().replace("-", "−");
    }

    private statusText(): string {
        const language = currentLanguage();
        if (this.state.mode === "solve") return this.solveStatus(language);
        const proper = this.proper();
        if (!proper) return t("triangle_solver_status_degenerate");
        const {sine, cosine} = proper;
        if (this.state.mode === "circle") {
            if (sine.rightAtA) return t("triangle_solver_status_circle_right_a", {value0: this.num(sine.twoR, language)});
            return t("triangle_solver_status_circle", {
                value0: shapeText(cosine.triangleShape), value1: this.num(sine.twoR, language), value2: this.rationalText(sine.r2),
            });
        }
        return t("triangle_solver_status_sides", {
            value0: shapeText(cosine.triangleShape), value1: angleShapeText(cosine.shapeAtC),
            value2: signed(cosine.c2), value3: signed(cosine.a2 + cosine.b2), value4: signed(cosine.correction),
        });
    }

    private solveStatus(language: NumberLanguage): string {
        const {derived, drawn, ssa} = this.view();
        const result = derived.solution;
        switch (result.kind) {
            case "degenerate": return t("triangle_solver_status_flat");
            case "none":
                switch (result.reason) {
                    case "out-of-grid": return t("triangle_solver_status_off_grid");
                    case "triangle-inequality": return t("triangle_solver_status_inequality");
                    case "angle-sum": return t("triangle_solver_status_angle_sum");
                    case "a-below-height": return t("triangle_solver_status_below_height", {value0: this.num(ssa?.h ?? NaN, language)});
                    default: return t("triangle_solver_status_not_greater");
                }
            case "one":
                if (result.tangent) return t("triangle_solver_status_tangent", {value0: this.num(ssa?.h ?? NaN, language)});
                return t(this.state.data.type === "ssa" ? "triangle_solver_status_one_ssa" : "triangle_solver_status_one");
            default: {
                const [first, second] = drawn.map(measureDrawn);
                return t("triangle_solver_status_two", {value0: this.num(first?.c ?? NaN, language), value1: this.num(second?.c ?? NaN, language)});
            }
        }
    }

    private geometryRows(language: NumberLanguage): ReadoutListRow[] {
        const proper = this.proper();
        if (!proper) return [];
        const {sine, cosine} = proper;
        const sides: Array<[string, bigint, number, number, number]> = [
            ["a", cosine.a2, sine.sides.a, sine.angles.A, sine.ratios[0]],
            ["b", cosine.b2, sine.sides.b, sine.angles.B, sine.ratios[1]],
            ["c", cosine.c2, sine.sides.c, sine.angles.C, sine.ratios[2]],
        ];
        const letters = ["A", "B", "C"];
        const rows: ReadoutListRow[] = [];
        sides.forEach(([name, square]) =>
            rows.push({id: `side-${name}`, label: t("triangle_solver_readout_side", {value0: name}), value: this.sideText(square, language)}));
        sides.forEach(([, , , angle], index) =>
            rows.push({id: `angle-${letters[index]}`, label: t("triangle_solver_readout_angle", {value0: letters[index]}), value: this.degrees(angle, language)}));
        sides.forEach(([name, , , , ratio], index) =>
            rows.push({id: `ratio-${name}`, label: t("triangle_solver_readout_ratio", {value0: name, value1: letters[index]}),
                value: this.approx(ratio, language)}));
        if (this.state.mode === "circle") {
            const apex = angleAtAntipode(sine, this.state.C, this.state.B);
            rows.push(
                {id: "two-r", label: t("triangle_solver_readout_two_r"), value: this.approx(sine.twoR, language)},
                {id: "r-squared", label: t("triangle_solver_readout_r_squared"), value: this.rationalText(sine.r2)},
                {id: "centre", label: t("triangle_solver_readout_centre"), value: this.pointText(sine.circumcentre)},
                {id: "antipode", label: t("triangle_solver_readout_antipode"), value: this.pointText(sine.antipode)},
                {id: "thales", label: t("triangle_solver_readout_thales"), value: this.rationalText(sine.thalesAtC)},
                {id: "apex-angle", label: t("triangle_solver_readout_apex_angle"),
                    value: apex === undefined ? t("triangle_solver_apex_none") : this.degrees(apex, language)},
            );
        } else {
            rows.push(
                {id: "dot", label: t("triangle_solver_readout_dot"), value: signed(cosine.dot)},
                {id: "correction", label: t("triangle_solver_readout_correction"), value: signed(cosine.correction)},
                {id: "identity", label: t("triangle_solver_readout_identity"),
                    value: `${signed(cosine.c2)} = ${signed(cosine.a2)} + ${signed(cosine.b2)} − (${signed(cosine.correction)})`},
            );
        }
        return rows;
    }

    private solveRows(language: NumberLanguage): ReadoutListRow[] {
        const {drawn, ssa} = this.view();
        const rows: ReadoutListRow[] = [];
        drawn.map(measureDrawn).forEach((m, index) => {
            const n = `${index + 1}`;
            const separator = t("triangle_solver_list_separator");
            const sides: Array<[string, number]> = [["a", m.a], ["b", m.b], ["c", m.c]];
            const angles: Array<[string, number]> = [["A", m.angleA], ["B", m.angleB], ["C", m.angleC]];
            rows.push(
                {id: `solved-sides-${n}`, label: t("triangle_solver_readout_solved_sides", {value0: n}),
                    value: sides.map(([name, side]) => this.measured(name, side, this.num(side, language), 5)).join(separator)},
                {id: `solved-angles-${n}`, label: t("triangle_solver_readout_solved_angles", {value0: n}),
                    value: angles.map(([name, angle]) => this.measured(name, toDegrees(angle), this.degrees(angle, language), 4)).join(separator)},
                {id: `solved-area-${n}`, label: t("triangle_solver_readout_solved_area", {value0: n}), value: this.num(m.area, language)},
            );
        });
        if (ssa) rows.push({id: "height", label: t("triangle_solver_readout_height"), value: this.approx(ssa.h, language)});
        return rows;
    }

    /** The legend entries for the circumcircle, the point A', the SSA arc and the height, each with the style it is drawn in. */
    legendItems(): {id: string; color: string; label: string; kind: "line" | "diamond" | "dashed-line"}[] {
        const items: {id: string; color: string; label: string; kind: "line" | "diamond" | "dashed-line"}[] = [];
        if (this.state.mode === "circle" && this.proper()) {
            items.push(
                {id: "circumcircle", color: CIRCUMCIRCLE_COLOR, label: t("triangle_solver_legend_circumcircle"), kind: "line"},
                {id: "antipode", color: GraphPalette.constructionAccent, label: t("triangle_solver_legend_antipode"), kind: "diamond"},
            );
        }
        if (this.state.mode === "solve" && this.view().ssa !== undefined) {
            items.push(
                {id: "ssa-arc", color: SSA_ARC_COLOR, label: t("triangle_solver_legend_ssa_arc"), kind: "line"},
                {id: "height", color: GraphPalette.constructionAccent, label: t("triangle_solver_legend_height"), kind: "dashed-line"},
            );
        }
        return items;
    }

    private readoutRows(): ReadoutListRow[] {
        const language = currentLanguage();
        return this.state.mode === "solve" ? this.solveRows(language) : this.geometryRows(language);
    }

    // ---- Controls -----------------------------------------------------------------------------------------------------

    private editVertex(vertex: Vertex, axis: "x" | "y", value: number): boolean {
        const snapped = snapVertexInput(value, vertex);
        if (!snapped.ok) return false;
        const current = this.state[vertex];
        const clamped = clampVertexCoordinate(axis, snapped.value.value);
        this.setVertex(vertex, axis === "x" ? clamped : current.x, axis === "y" ? clamped : current.y);
        this.requestRender();
        return true;
    }

    /** Writes one solver input; the candidate state goes through the strict parser, so only grid data reaches the scene. */
    private editData(name: string, kind: FieldKind, value: number): boolean {
        const snapped = kind === "side" ? snapSideInput(value, name) : snapSolverAngleInput(value, name);
        if (!snapped.ok) return false;
        const parsed = parseTriangleState({...this.state, data: {...this.state.data, [name]: snapped.value.value}});
        if (!parsed.ok) return false;
        this.setState({data: parsed.value.data});
        this.requestRender();
        return true;
    }

    private dataValue(name: string): number | undefined {
        const record: Readonly<Record<string, string | number>> = this.state.data;
        const value = record[name];
        return typeof value === "number" ? value : undefined;
    }

    private dataLabel(field: DataField): string {
        return field.kind === "side"
            ? t("triangle_solver_side_label", {value0: FIELD_SYMBOL[field.name]})
            : t("triangle_solver_angle_label", {value0: FIELD_SYMBOL[field.name]});
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("triangle_solver_mode_label")} value={state.mode}
                          options={[
                              {value: "sides", text: t("triangle_solver_mode_sides")},
                              {value: "circle", text: t("triangle_solver_mode_circle")},
                              {value: "solve", text: t("triangle_solver_mode_solve")},
                          ]}
                          onChange={value => {
                              const mode = TRIANGLE_MODES.find(candidate => candidate === value);
                              if (mode) this.setState({mode});
                          }}/>,
        ];
        if (state.mode === "solve") {
            commands.push(
                <ChoiceSelect key="data-type" label={t("triangle_solver_data_label")} value={state.data.type} help={t("triangle_solver_data_help")}
                              options={[
                                  {value: "sss", text: t("triangle_solver_data_sss")},
                                  {value: "sas", text: t("triangle_solver_data_sas")},
                                  {value: "asa", text: t("triangle_solver_data_asa")},
                                  {value: "ssa", text: t("triangle_solver_data_ssa")},
                              ]}
                              onChange={value => {
                                  const type = SOLVE_DATA_TYPES.find(candidate => candidate === value);
                                  if (type) this.setState({data: DEFAULT_SOLVE_DATA[type]});
                              }}/>,
            );
            for (const field of DATA_FIELDS[state.data.type]) {
                const side = field.kind === "side";
                commands.push(
                    <NumberInput key={`${state.data.type}-${field.name}`} label={this.dataLabel(field)} value={this.dataValue(field.name)}
                                 min={side ? SIDE_MIN : SOLVER_ANGLE_MIN} max={side ? SIDE_MAX : SOLVER_ANGLE_MAX}
                                 step={side ? 0.25 : 1} bigStep={side ? 1 : 10} grid={side ? 0.25 : 1} integer={!side} decimals={side ? 2 : 0}
                                 help={side ? t("triangle_solver_side_help") : t("triangle_solver_solve_help")}
                                 onChange={value => this.editData(field.name, field.kind, value)}/>,
                );
            }
            return commands;
        }
        commands.push(<p key="vertex-help" id={this.vertexHelpId} className="number-input-help">{t("triangle_solver_vertex_help", {
            value0: formatNumber(VERTEX_X_MIN, currentLanguage()), value1: formatNumber(VERTEX_X_MAX, currentLanguage()),
            value2: formatNumber(VERTEX_Y_MIN, currentLanguage()), value3: formatNumber(VERTEX_Y_MAX, currentLanguage())})}</p>);
        for (const vertex of VERTICES) {
            for (const axis of ["x", "y"] as const) {
                commands.push(
                    <NumberInput key={`${vertex}-${axis}`} label={t("triangle_solver_vertex_label", {value0: vertex, value1: axis})}
                                 value={state[vertex][axis]} min={axis === "x" ? VERTEX_X_MIN : VERTEX_Y_MIN}
                                 max={axis === "x" ? VERTEX_X_MAX : VERTEX_Y_MAX} step={VERTEX_STEP}
                                 bigStep={VERTEX_BIG_STEP} integer decimals={0} describedBy={this.vertexHelpId}
                                 onChange={value => this.editVertex(vertex, axis, value)}/>,
                );
            }
        }
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("triangle_solver_readout_title")}</ReadoutHeading>
                <p data-triangle-status="">{this.statusText()}</p>
                <ReadoutList label={t("triangle_solver_readout_title")} rows={this.readoutRows()}/>
                {this.legendItems().length > 0 && <FunctionLegend items={this.legendItems()}/>}
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
