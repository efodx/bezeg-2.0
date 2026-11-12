import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {FunctionLegend, LegendItem} from "../functions/FunctionReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {Line} from "../../compgeo/circle";
import {InexactLine} from "../../compgeo/circleConstructions";
import {Rational, RationalPoint} from "../../compgeo/rational";
import {
    CIRCLE_MODES, CircleConstructionDerived, CircleConstructionState, CircleMode, CircleSpec, COORD_LIMIT, DEFAULT_CIRCLE_CONSTRUCTION_STATE,
    deriveCircleConstruction, exampleState, parseCircleConstructionState, RADIUS_MAX, RADIUS_MIN, RATIO_MAX, RATIO_MIN,
    serializeCircleConstructionState, snapCoordinateInput, snapRadiusInput, snapRatioInput,
} from "../../compgeo/circleConstructionModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {circleConstructionPresetCollection} from "./circleConstruction/circleConstructionPresetCollection";

/** The scene state is the stored circle construction state (ADR 0045 sections 1 and 2); everything else is derived from it. */
export interface CircleConstructionGraphState extends BaseGraphState, CircleConstructionState {}

/** Keyboard steps: the arrow keys move a coordinate by 1, a radius by 1/4 and the ratio by 1/2; the Page keys take the big steps. */
export const COORDINATE_STEP = 1;
export const COORDINATE_BIG_STEP = 4;
export const RADIUS_STEP = 0.25;
export const RADIUS_BIG_STEP = 1;
export const RATIO_STEP = 0.5;
export const RATIO_BIG_STEP = 2;
/** Pointer tolerance in screen pixels around a handle; JSXGraph adds `HIT_SLACK` and tests both sides, so a touch zone is over 44 px across. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;

export type HandleId = "c1" | "c1r" | "c2" | "c2r" | "c3" | "c3r" | "p" | "a" | "b";

/** The handles each mode shows, in creation order. */
export const MODE_HANDLES: Readonly<Record<CircleMode, readonly HandleId[]>> = {
    tangents: ["c1", "c1r", "p"],
    radical: ["c1", "c1r", "c2", "c2r", "c3", "c3r", "p"],
    apollonius: ["a", "b", "p"],
    common: ["c1", "c1r", "c2", "c2r"],
};

type Coefficients = readonly [number, number, number];
type CircleKey = "c1" | "c2" | "c3";
type PointKey = "p" | "a" | "b";
const CIRCLE_KEYS: readonly CircleKey[] = ["c1", "c2", "c3"];

const signed = (n: bigint): string => (n < 0n ? `−${-n}` : `${n}`);

/** An exact rational as text: an integer plainly, otherwise `p/q ≈ decimal`. */
function rat(value: Rational): string {
    if (value.den === 1n) return signed(value.num);
    return `${signed(value.num)}/${value.den} ≈ ${formatNumber(value.toNumber(), currentLanguage(), 4)}`;
}

const dec = (value: number): string => formatNumber(value, currentLanguage(), 4);
const ratPoint = (p: RationalPoint): string => t("circle_construction_point_format", {value0: rat(p.x), value1: rat(p.y)});
const xyPoint = (x: number, y: number): string => t("circle_construction_point_format", {value0: dec(x), value1: dec(y)});
const plainPoint = (x: number, y: number): string => xyPoint(x, y);
/** Counts instances so that the input help id of two graphs on one page never collides. */
let helpInstances = 0;
/** Colour and dash of the drawn construction elements the legend states (dash 0 is a solid line). */
export const THALES_STYLE = {color: GraphPalette.constructionLevels[1], dash: 2} as const;
export const AXIS_STYLES = [
    {color: GraphPalette.constructionLevels[1], dash: 0},
    {color: GraphPalette.constructionLevels[2], dash: 2},
    {color: GraphPalette.constructionLevels[3], dash: 2},
] as const;
export const ORTHOGONAL_STYLE = {color: GraphPalette.constructionAccent, dash: 3} as const;
export const EXTERNAL_TANGENT_STYLE = {color: GraphPalette.primaryCurve, dash: 0} as const;
export const INTERNAL_TANGENT_STYLE = {color: GraphPalette.constructionAccent, dash: 3} as const;
export const CHORD_STYLE = {color: GraphPalette.constructionAccent, dash: 2} as const;
export const LOCUS_STYLE = {color: GraphPalette.primaryCurve, dash: 0} as const;

const numberOf = (value: Rational | number): number => (typeof value === "number" ? value : value.toNumber());

/** The coefficients of `a x + b y = c` in doubles; the exact lines are exact integers or rationals before this conversion. */
function coefficientsOf(line: Line | InexactLine): Coefficients {
    return [numberOf(line.a), numberOf(line.b), numberOf(line.c)];
}

/** A line as text, for example `13 x = 25` or `6 x + 12 y = 66`. */
function lineText(line: Line | InexactLine): string {
    const [a, b, c] = coefficientsOf(line);
    let text = "";
    for (const [coefficient, name] of [[a, "x"], [b, "y"]] as const) {
        if (coefficient === 0) continue;
        const size = Math.abs(coefficient);
        const body = `${size === 1 ? "" : `${dec(size)} `}${name}`;
        text += text === "" ? `${coefficient < 0 ? "−" : ""}${body}` : ` ${coefficient < 0 ? "−" : "+"} ${body}`;
    }
    return `${text} = ${dec(c)}`;
}

interface Anchors {
    readonly first: readonly [number, number];
    readonly second: readonly [number, number];
}

/** Two points that span the line `a x + b y = c`: the foot of the origin and a point one normal-turned step away. Finite for any input. */
function anchorsOf(coefficients: Coefficients | null): Anchors {
    if (coefficients === null) return {first: [0, 0], second: [1, 0]};
    const [a, b, c] = coefficients;
    const n = a * a + b * b;
    if (!(n > 0)) return {first: [0, 0], second: [1, 0]};
    const x = (a * c) / n;
    const y = (b * c) / n;
    return {first: [x, y], second: [x - b, y + a]};
}

interface Frame {
    readonly state: Readonly<CircleConstructionState>;
    readonly derived: CircleConstructionDerived;
}

/**
 * The circle constructions CG1 to CG4 (docs/specs/circle-geometry-lessons.md): tangents from a point, the radical axes and radical
 * centre, the Apollonius circle and the common tangents of two circles. Every number drawn or read comes from the exact kernel through
 * `deriveCircleConstruction`; a handle is snapped to the grid while it is dragged.
 *
 * Ownership: every board object is created in `buildScene` and recorded in `objects`; the drag listeners are recorded in `listeners`.
 * `disposeScene` removes the listeners and then the objects; it runs on a mode change, on a scene dispose and, through a session
 * cleanup, on unmount. A line is always drawn through two owned hidden points: a line built from coefficient functions makes helper points
 * that `removeObject` does not remove.
 *
 * Choosing a mode loads that mode's example state; edits made in the previous mode are discarded, by design (the spec's default
 * examples). A Preset keeps the stored fields once, as `data` (checked by `parseCircleConstructionState`).
 */
export class CircleConstructionGraph extends BaseGraph<CircleConstructionGraphState, CircleConstructionState> {
    readonly helpId = `circle-construction-input-help-${++helpInstances}`;
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];
    private readonly handleMap = new Map<HandleId, JXG.Point>();
    private viewCache?: {key: string; derived: CircleConstructionDerived};
    /** The mode the board was last drawn for; a sync that finds the same mode redraws nothing but the handle positions. */
    private builtMode: CircleMode | undefined;
    private readonly status = new SettledReadout();

    override getInitialState(): CircleConstructionGraphState {
        return {initialized: false, ...DEFAULT_CIRCLE_CONSTRUCTION_STATE};
    }

    protected override lessonDefaultState(): CircleConstructionGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): CircleConstructionState {
        return serializeCircleConstructionState(DEFAULT_CIRCLE_CONSTRUCTION_STATE);
    }

    override presetCollection(): PresetCollection<CircleConstructionState> {
        return circleConstructionPresetCollection();
    }

    override exportPreset(): Preset<CircleConstructionState> {
        const preset = super.exportPreset();
        const {mode: _mode, c1: _c1, c2: _c2, c3: _c3, p: _p, a: _a, b: _b, k: _k, ...graphState} = preset.graphState as CircleConstructionGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): CircleConstructionState {
        return serializeCircleConstructionState(this.state);
    }

    override importPresetData(data: CircleConstructionState): void {
        this.setState(serializeCircleConstructionState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): CircleConstructionGraphState {
        const parsed = parseCircleConstructionState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return [-9, 9, 17, -9];
    }

    // ---- Derived numbers ---------------------------------------------------------------------------------------------

    /** Everything drawn or read, recomputed when a stored field changes (a cache keyed by its inputs, not a mirror of the state). */
    view(): CircleConstructionDerived {
        const s = this.state;
        const key = JSON.stringify([s.mode, s.c1, s.c2, s.c3, s.p, s.a, s.b, s.k]);
        if (this.viewCache?.key === key) return this.viewCache.derived;
        const derived = deriveCircleConstruction(s);
        this.viewCache = {key, derived};
        return derived;
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and its handles. */
    ownedObjectCount(): number { return this.objects.length; }
    ownedListenerCount(): number { return this.listeners.length; }
    handles(): Map<HandleId, JXG.Point> { return this.handleMap; }

    // ---- Board -------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("circle_construction_board_label"));
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
            session.registerCleanup(() => this.status.cancel());
            session.registerCleanup(onLanguageChange(() => this.status.replace(this.statusText())));
        }
        this.status.replace(this.statusText());
    }

    /**
     * Lesson actions (`circle`): `set-mode` is the construction select (it loads that construction's example), `set-circle` the centre and radius
     * fields of one circle, `set-point` the coordinate fields of P, `set-apollonius` the named fields among A, B, P and the ratio. Every value is checked against the model's grid and range rules before the first
     * write; a lesson-content error throws and nothing is snapped or clamped. `setState` writes the store synchronously, so a later action of the
     * same scene reads this one's result, and the board follows in `onStateChange`.
     */
    applyCircleAction(action: Extract<LessonAction, {kind: "circle"}>): void {
        switch (action.operation) {
            case "set-mode": {
                const mode = CIRCLE_MODES.find(candidate => candidate === action.mode);
                if (!mode) throw new Error(`circle set-mode: mode must be one of ${CIRCLE_MODES.join(", ")}.`);
                this.setState(exampleState(mode));
                return;
            }
            case "set-circle": {
                const key = CIRCLE_KEYS.find(candidate => candidate === action.circle);
                if (!key) throw new Error("circle set-circle: circle must be c1, c2 or c3.");
                const x = this.exactCoordinate(action.x, "circle set-circle x");
                const y = this.exactCoordinate(action.y, "circle set-circle y");
                const r = snapRadiusInput(action.r, "radius");
                if (!r.ok || r.value.adjusted) throw new Error(`circle set-circle: the radius must be a multiple of 1/4 in [${RADIUS_MIN}, ${RADIUS_MAX}].`);
                this.setCircle(key, {x, y, r: r.value.value});
                return;
            }
            case "set-point": {
                const x = this.exactCoordinate(action.x, "circle set-point x");
                const y = this.exactCoordinate(action.y, "circle set-point y");
                this.setPoint("p", x, y);
                return;
            }
            case "set-apollonius": {
                const given = (["a", "b", "p"] as const).filter(key => action[key] !== undefined);
                if (given.length === 0 && action.k === undefined) throw new Error("circle set-apollonius: give at least one of a, b, p, k.");
                const next: {a?: {x: number; y: number}; b?: {x: number; y: number}; p?: {x: number; y: number}; k?: number} = {};
                for (const key of given) {
                    const point = action[key];
                    if (point === null || typeof point !== "object") throw new Error(`circle set-apollonius ${key}: must be a point {x, y}.`);
                    const x = this.exactCoordinate(point.x, `circle set-apollonius ${key}.x`);
                    const y = this.exactCoordinate(point.y, `circle set-apollonius ${key}.y`);
                    const same = this.state[key];
                    if (same.x !== x || same.y !== y) next[key] = {x, y};
                }
                if (action.k !== undefined) {
                    const k = snapRatioInput(action.k, "k");
                    if (!k.ok || k.value.adjusted) throw new Error(`circle set-apollonius k: the ratio must be a multiple of 1/2 in [${RATIO_MIN}, ${RATIO_MAX}].`);
                    if (k.value.value !== this.state.k) next.k = k.value.value;
                }
                if (Object.keys(next).length > 0) this.setState(next);
                return;
            }
            default: {
                const unsupported: never = action;
                throw new Error(`circle: the circle graph has no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    /** A lesson coordinate: an integer in [-16, 16] exactly as given (the snapping path of typed input would hide a content error). */
    private exactCoordinate(value: number, field: string): number {
        const snapped = snapCoordinateInput(value, field);
        if (!snapped.ok || snapped.value.adjusted) throw new Error(`${field}: must be an integer in [-${COORD_LIMIT}, ${COORD_LIMIT}].`);
        return snapped.value.value;
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("circle", action => this.applyCircleAction(action));
    }

    protected override onStateChange(_previous: Readonly<CircleConstructionGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Rebuilds when the mode changed, moves the handles to the state, redraws and reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.builtMode !== this.state.mode) this.buildScene();
        this.placeHandles();
        this.board.update();
        this.status.report(this.statusText());
    }

    private handleTarget(id: HandleId): readonly [number, number] {
        const s = this.state;
        switch (id) {
            case "c1": return [s.c1.x, s.c1.y];
            case "c1r": return [s.c1.x + s.c1.r, s.c1.y];
            case "c2": return [s.c2.x, s.c2.y];
            case "c2r": return [s.c2.x + s.c2.r, s.c2.y];
            case "c3": return [s.c3.x, s.c3.y];
            case "c3r": return [s.c3.x + s.c3.r, s.c3.y];
            case "p": return [s.p.x, s.p.y];
            case "a": return [s.a.x, s.a.y];
            case "b": return [s.b.x, s.b.y];
        }
    }

    private placeHandles(): void {
        for (const [id, handle] of this.handleMap) {
            const [x, y] = this.handleTarget(id);
            if (handle.X() !== x || handle.Y() !== y) handle.setPosition(JXG.COORDS_BY_USER, [x, y]);
        }
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const mode = this.state.mode;
        this.builtMode = mode;
        type Visible = boolean | (() => boolean);
        type Coordinate = number | (() => number);
        type PointFace = NonNullable<JXG.PointAttributes["face"]>;
        const frame = (): Frame => ({state: this.state, derived: this.view()});

        // ---- Primitives. Every one is owned; the accessors return finite numbers whatever the mode of the cached view is. ----
        const hidden = (x: Coordinate, y: Coordinate) =>
            this.own(board.create("point", [x, y], {visible: false, fixed: true, withLabel: false, name: ""}));
        // A cross or plus face has no fill: JSXGraph draws it with the stroke alone, so the stroke carries the colour.
        const strokeOnly = (face: PointFace) => face === "cross" || face === "plus" || face === "x" || face === "+";
        const marker = (x: Coordinate, y: Coordinate, face: PointFace, color: string, size: number, visible: Visible = true) =>
            this.own(board.create("point", [x, y], {
                fixed: true, highlight: false, withLabel: false, name: "", face, size, fillColor: color, visible,
                ...(strokeOnly(face) ? {strokeColor: color, strokeWidth: 2} : {strokeColor: GraphPalette.pointOutline}),
            }));
        const segment = (a: JXG.Point, b: JXG.Point, color: string, width: number, dash: number, visible: Visible = true) =>
            this.own(board.create("segment", [a, b], {
                strokeColor: color, strokeWidth: width, dash, fixed: true, highlight: false, visible, withLabel: false,
            }));
        const circleAbout = (centre: JXG.Point, radius: () => number, color: string, width: number, dash: number, visible: Visible = true) =>
            this.own(board.create("circle", [centre, radius], {
                strokeColor: color, strokeWidth: width, dash, fillColor: "none", highlightFillColor: "none", fixed: true, highlight: false,
                withLabel: false, visible,
            }));
        const lineAlong = (coefficients: () => Coefficients | null, color: string, width: number, dash: number) => {
            const first = hidden(() => anchorsOf(coefficients()).first[0], () => anchorsOf(coefficients()).first[1]);
            const second = hidden(() => anchorsOf(coefficients()).second[0], () => anchorsOf(coefficients()).second[1]);
            return this.own(board.create("line", [first, second], {
                strokeColor: color, strokeWidth: width, dash, fixed: true, highlight: false, withLabel: false, straightFirst: true,
                straightLast: true, visible: () => coefficients() !== null,
            }));
        };
        const caption = (text: string | (() => string), x: Coordinate, y: Coordinate, color: string, visible: Visible = true) =>
            this.own(board.create("text", [x, y, text], {
                strokeColor: color, fontSize: 15, fixed: true, highlight: false, withLabel: false, visible,
            }));
        const handleAttributes = (color: string, face: PointFace): JXG.PointAttributes => ({
            name: "", withLabel: false, size: 7, face, fillColor: color, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
            precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
        });
        const handle = (id: HandleId, color: string, face: PointFace) => {
            const [x, y] = this.handleTarget(id);
            const point = this.own(board.create("point", [x, y], handleAttributes(color, face)));
            this.handleMap.set(id, point);
            return point;
        };
        const label = (name: string, id: HandleId, color: string) =>
            caption(name, () => this.handleTarget(id)[0] + 0.3, () => this.handleTarget(id)[1] + 0.3, color);
        const circleRadius = (key: CircleKey) => () => this.state[key].r;
        const numberAt = (read: (f: Frame) => number | undefined) => () => {
            const value = read(frame());
            return value !== undefined && Number.isFinite(value) ? value : 0;
        };
        const flag = (read: (f: Frame) => boolean) => () => read(frame());

        /** A circle about its handle with its radius handle; the circle is drawn first so the handles lie above it. */
        const circleWithHandles = (key: CircleKey, color: string, face: PointFace) => {
            const centre = handle(key, color, face);
            handle(`${key}r` as HandleId, color, "diamond");
            circleAbout(centre, circleRadius(key), color, 2, 0);
            return centre;
        };

        if (mode === "tangents") {
            const tangents = (f: Frame) => (f.derived.mode === "tangents" ? f.derived : undefined);
            const outside = flag(f => tangents(f)?.result.status === "outside");
            const contact = (index: 0 | 1, axis: "x" | "y") => numberAt(f => {
                const d = tangents(f);
                return d?.result.status === "outside" ? d.result.contacts[index][axis] : undefined;
            });
            const centre = circleWithHandles("c1", GraphPalette.referenceCurve, "o");
            const thales = hidden(
                numberAt(f => tangents(f)?.thales?.centre.x.toNumber()), numberAt(f => tangents(f)?.thales?.centre.y.toNumber()));
            circleAbout(thales, numberAt(f => {
                const r2 = tangents(f)?.thales?.r2;
                return r2 ? Math.sqrt(r2.toNumber()) : undefined;
            }), THALES_STYLE.color, 1, THALES_STYLE.dash, flag(f => tangents(f)?.thales != null));
            const p = handle("p", GraphPalette.controlPoint, "o");
            const t1 = marker(contact(0, "x"), contact(0, "y"), "square", GraphPalette.primaryCurve, 5, outside);
            const t2 = marker(contact(1, "x"), contact(1, "y"), "square", GraphPalette.primaryCurve, 5, outside);
            segment(p, t1, GraphPalette.primaryCurve, 2, 0, outside);
            segment(p, t2, GraphPalette.primaryCurve, 2, 0, outside);
            segment(t1, t2, CHORD_STYLE.color, 1, CHORD_STYLE.dash, outside);
            segment(centre, p, GraphPalette.label, 1, 2, flag(f => !(tangents(f)?.atCentre ?? true)));
            caption("T1", () => contact(0, "x")() + 0.3, () => contact(0, "y")() + 0.3, GraphPalette.label, outside);
            caption("T2", () => contact(1, "x")() + 0.3, () => contact(1, "y")() + 0.3, GraphPalette.label, outside);
            label("1", "c1", GraphPalette.referenceCurve);
            lineAlong(() => {
                const d = this.view();
                return d.mode === "tangents" && d.result.status === "on" ? coefficientsOf(d.result.line) : null;
            }, GraphPalette.primaryCurve, 2, 0);
            label("P", "p", GraphPalette.label);
        } else if (mode === "radical") {
            const radical = (f: Frame) => (f.derived.mode === "radical" ? f.derived : undefined);
            const colors = [GraphPalette.referenceCurve, GraphPalette.comparisonCurve, GraphPalette.primaryCurve] as const;
            circleWithHandles("c1", colors[0], "o");
            circleWithHandles("c2", colors[1], "o");
            circleWithHandles("c3", colors[2], "o");
            label("1", "c1", colors[0]);
            label("2", "c2", colors[1]);
            label("3", "c3", colors[2]);
            handle("p", GraphPalette.controlPoint, "o");
            label("P", "p", GraphPalette.label);
            ([0, 1, 2] as const).forEach(index => {
                lineAlong(() => {
                    const d = this.view();
                    const axis = d.mode === "radical" ? d.axes[index].axis : undefined;
                    return axis?.status === "line" ? coefficientsOf(axis.line) : null;
                }, AXIS_STYLES[index].color, 2, AXIS_STYLES[index].dash);
            });
            const centre = marker(
                numberAt(f => {
                    const c = radical(f)?.centre;
                    return c?.status === "centre" ? c.point.x.toNumber() : undefined;
                }),
                numberAt(f => {
                    const c = radical(f)?.centre;
                    return c?.status === "centre" ? c.point.y.toNumber() : undefined;
                }),
                "cross", GraphPalette.constructionAccent, 6, flag(f => radical(f)?.centre.status === "centre"));
            circleAbout(centre, numberAt(f => {
                const r2 = radical(f)?.orthogonal?.r2;
                return r2 ? Math.sqrt(r2.toNumber()) : undefined;
            }), ORTHOGONAL_STYLE.color, 1, ORTHOGONAL_STYLE.dash, flag(f => radical(f)?.orthogonal != null));
        } else if (mode === "apollonius") {
            const apollonius = (f: Frame) => (f.derived.mode === "apollonius" ? f.derived : undefined);
            const a = handle("a", GraphPalette.referenceCurve, "o");
            const b = handle("b", GraphPalette.comparisonCurve, "o");
            const p = handle("p", GraphPalette.controlPoint, "o");
            label("A", "a", GraphPalette.label);
            label("B", "b", GraphPalette.label);
            label("P", "p", GraphPalette.label);
            const locusCentre = hidden(
                numberAt(f => {
                    const l = apollonius(f)?.locus;
                    return l?.status === "circle" ? l.circle.centre.x.toNumber() : undefined;
                }),
                numberAt(f => {
                    const l = apollonius(f)?.locus;
                    return l?.status === "circle" ? l.circle.centre.y.toNumber() : undefined;
                }));
            circleAbout(locusCentre, numberAt(f => {
                const l = apollonius(f)?.locus;
                return l?.status === "circle" ? Math.sqrt(l.circle.r2.toNumber()) : undefined;
            }), LOCUS_STYLE.color, 2, LOCUS_STYLE.dash, flag(f => apollonius(f)?.locus.status === "circle"));
            lineAlong(() => {
                const d = this.view();
                return d.mode === "apollonius" && d.locus.status === "line" ? coefficientsOf(d.locus.line) : null;
            }, LOCUS_STYLE.color, 2, LOCUS_STYLE.dash);
            const division = (kind: "internal" | "external", axis: "x" | "y") => numberAt(f => {
                const l = apollonius(f)?.locus;
                if (!l || l.status === "degenerate") return undefined;
                if (kind === "external" && l.status !== "circle") return undefined;
                const point = kind === "internal" ? l.internal : (l as {external: RationalPoint}).external;
                return point[axis].toNumber();
            });
            const internalShown = flag(f => (apollonius(f)?.locus.status ?? "degenerate") !== "degenerate");
            const externalShown = flag(f => apollonius(f)?.locus.status === "circle");
            marker(division("internal", "x"), division("internal", "y"), "diamond", GraphPalette.constructionLevels[1], 6, internalShown);
            marker(division("external", "x"), division("external", "y"), "triangleUp", GraphPalette.constructionLevels[2], 6, externalShown);
            caption(() => t("circle_construction_caption_internal"), () => division("internal", "x")() + 0.3, () => division("internal", "y")() + 0.3,
                GraphPalette.label, internalShown);
            caption(() => t("circle_construction_caption_external"), () => division("external", "x")() + 0.3, () => division("external", "y")() + 0.3,
                GraphPalette.label, externalShown);
            segment(p, a, GraphPalette.referenceCurve, 1, 2);
            segment(p, b, GraphPalette.comparisonCurve, 1, 2);
            segment(a, b, GraphPalette.label, 1, 0);
            caption(() => {
                const ratio = apollonius(frame())?.ratio;
                return ratio == null ? "" : t("circle_construction_ratio_caption", {value0: dec(ratio)});
            }, () => this.state.p.x + 0.3, () => this.state.p.y - 0.8, GraphPalette.primaryCurve);
        } else {
            const common = (f: Frame) => (f.derived.mode === "common" ? f.derived : undefined);
            const okResult = (f: Frame) => {
                const d = common(f);
                return d?.result.status === "ok" ? d.result : undefined;
            };
            const first = circleWithHandles("c1", GraphPalette.referenceCurve, "o");
            const second = circleWithHandles("c2", GraphPalette.comparisonCurve, "o");
            segment(first, second, GraphPalette.label, 1, 2);
            label("1", "c1", GraphPalette.referenceCurve);
            label("2", "c2", GraphPalette.comparisonCurve);
            const centreCoordinate = (kind: "external" | "internal", axis: "x" | "y") => numberAt(f => {
                const r = okResult(f);
                const point = kind === "internal" ? r?.internalCentre : r?.externalCentre;
                return point?.[axis].toNumber();
            });
            marker(centreCoordinate("external", "x"), centreCoordinate("external", "y"), "cross", GraphPalette.constructionLevels[1], 6,
                flag(f => okResult(f)?.externalCentre != null));
            marker(centreCoordinate("internal", "x"), centreCoordinate("internal", "y"), "plus", GraphPalette.constructionLevels[2], 6,
                flag(f => okResult(f) !== undefined));
            for (const kind of ["external", "internal"] as const) {
                for (const index of [0, 1] as const) {
                    lineAlong(() => {
                        const d = this.view();
                        if (d.mode !== "common" || d.result.status !== "ok") return null;
                        const tangent = d.result.tangents.filter(candidate => candidate.kind === kind)[index];
                        return tangent ? coefficientsOf(tangent.line) : null;
                    }, (kind === "external" ? EXTERNAL_TANGENT_STYLE : INTERNAL_TANGENT_STYLE).color, 2,
                        (kind === "external" ? EXTERNAL_TANGENT_STYLE : INTERNAL_TANGENT_STYLE).dash);
                }
            }
        }

        for (const [id, point] of this.handleMap) this.wireDrag(id, point);
    }

    /** Snaps a dragged handle to the grid (a radius to quarters) and writes the field to the scene state. */
    private wireDrag(id: HandleId, point: JXG.Point): void {
        const onDrag = () => this.dragTo(id, point);
        const board = this.board;
        const onOver = () => { if (!point.visProp.fixed) board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { if (!point.visProp.fixed) board.containerObj.style.cursor = "default"; };
        point.on("drag", onDrag);
        point.on("over", onOver);
        point.on("out", onOut);
        this.listeners.push(() => { point.off("drag", onDrag); point.off("over", onOver); point.off("out", onOut); });
    }

    private dragTo(id: HandleId, point: JXG.Point): void {
        const s = this.state;
        const x = point.X();
        const y = point.Y();
        if (id === "c1r" || id === "c2r" || id === "c3r") {
            const key = id.slice(0, 2) as CircleKey;
            const centre = s[key];
            const snapped = snapRadiusInput(Math.hypot(x - centre.x, y - centre.y), "radius");
            if (snapped.ok && snapped.value.value !== centre.r) this.setCircle(key, {...centre, r: snapped.value.value});
        } else {
            const sx = snapCoordinateInput(x);
            const sy = snapCoordinateInput(y);
            if (sx.ok && sy.ok) {
                if (id === "p" || id === "a" || id === "b") this.setPoint(id, sx.value.value, sy.value.value);
                else this.setCircle(id, {...s[id], x: sx.value.value, y: sy.value.value});
            }
        }
        // The board updates right after this handler, so the handles must already lie on the grid the state was written for.
        this.placeHandles();
        this.status.report(this.statusText());
    }

    private setCircle(key: CircleKey, circle: CircleSpec): void {
        const same = this.state[key];
        if (same.x === circle.x && same.y === circle.y && same.r === circle.r) return;
        if (key === "c1") this.setState({c1: circle});
        else if (key === "c2") this.setState({c2: circle});
        else this.setState({c3: circle});
    }

    private setPoint(key: PointKey, x: number, y: number): void {
        const same = this.state[key];
        if (same.x === x && same.y === y) return;
        if (key === "p") this.setState({p: {x, y}});
        else if (key === "a") this.setState({a: {x, y}});
        else this.setState({b: {x, y}});
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
        this.handleMap.clear();
        this.builtMode = undefined;
    }

    // ---- Text and controls ---------------------------------------------------------------------------------------------

    private yesNo(value: boolean): string {
        return t(value ? "circle_construction_yes" : "circle_construction_no");
    }

    private none(): string {
        return t("circle_construction_none");
    }

    /** One sentence for the whole state; degenerate states say what they are. */
    statusText(): string {
        const d = this.view();
        switch (d.mode) {
            case "tangents": {
                if (d.atCentre) return t("circle_construction_status_tangents_centre");
                const r = d.result;
                if (r.status === "inside") return t("circle_construction_status_tangents_inside", {value0: rat(r.power)});
                if (r.status === "on") return t("circle_construction_status_tangents_on");
                return t("circle_construction_status_tangents_outside", {value0: rat(r.power), value1: dec(r.tangentLength)});
            }
            case "radical": {
                const statuses = d.axes.map(pair => pair.axis.status);
                if (statuses.includes("coincident")) return t("circle_construction_status_radical_coincident");
                if (statuses.includes("concentric")) return t("circle_construction_status_radical_concentric");
                const c = d.centre;
                if (c.status === "centre") return t("circle_construction_status_radical_centre", {value0: ratPoint(c.point), value1: rat(c.power)});
                if (c.status === "coaxal") return t("circle_construction_status_radical_coaxal");
                return t("circle_construction_status_radical_parallel");
            }
            case "apollonius": {
                const l = d.locus;
                const locus = l.status === "circle"
                    ? t("circle_construction_status_apollonius_circle", {value0: rat(l.k), value1: ratPoint(l.circle.centre), value2: rat(l.circle.r2)})
                    : l.status === "line" ? t("circle_construction_status_apollonius_line") : t("circle_construction_status_apollonius_degenerate");
                const probe = d.ratio === null
                    ? t("circle_construction_status_apollonius_at_b")
                    : t("circle_construction_status_apollonius_ratio", {value0: dec(d.ratio)});
                return `${locus} ${probe}`;
            }
            case "common": {
                if (d.relation === "coincident") return t("circle_construction_status_common_coincident");
                if (d.relation === "concentric") return t("circle_construction_status_common_concentric");
                const text = {
                    separate: t("circle_construction_status_common_separate"),
                    "touching-outside": t("circle_construction_status_common_touching_outside"),
                    crossing: t("circle_construction_status_common_crossing"),
                    "touching-inside": t("circle_construction_status_common_touching_inside"),
                    nested: t("circle_construction_status_common_nested"),
                }[d.relation];
                return d.result.status === "ok" && d.result.externalCentre === null
                    ? `${text} ${t("circle_construction_status_common_equal_radii")}` : text;
            }
        }
    }

    /** The legend of the drawn construction lines and circles, each with the style it is drawn in (the same constants the board uses). */
    legendItems(): LegendItem[] {
        const d = this.view();
        const dash = (style: {dash: number}) => (style.dash > 0 ? "dashed-line" : "line") as "dashed-line" | "line";
        switch (d.mode) {
            case "tangents": {
                const items: LegendItem[] = [];
                if (d.thales) items.push({id: "thales", color: THALES_STYLE.color, kind: dash(THALES_STYLE), label: t("circle_construction_legend_thales")});
                if (d.result.status === "outside") {
                    items.push({id: "chord", color: CHORD_STYLE.color, kind: dash(CHORD_STYLE), label: t("circle_construction_legend_chord")});
                }
                return items;
            }
            case "apollonius": {
                if (d.locus.status === "circle") {
                    return [{id: "locus", color: LOCUS_STYLE.color, kind: dash(LOCUS_STYLE), label: t("circle_construction_legend_locus_circle")}];
                }
                return d.locus.status === "line"
                    ? [{id: "locus", color: LOCUS_STYLE.color, kind: dash(LOCUS_STYLE), label: t("circle_construction_legend_locus_line")}]
                    : [];
            }
            case "radical": {
                const items: LegendItem[] = [];
                const pairs = [[1, 2], [1, 3], [2, 3]] as const;
                AXIS_STYLES.forEach((style, index) => {
                    if (d.axes[index].axis.status !== "line") return;
                    items.push({id: `axis-${index}`, color: style.color, kind: dash(style),
                        label: t(style.dash > 0 ? "circle_construction_legend_axis_dashed" : "circle_construction_legend_axis_solid", {value0: t("circle_construction_pair", {value0: pairs[index][0], value1: pairs[index][1]})})});
                });
                if (d.centre.status === "centre") {
                    items.push({id: "centre", color: GraphPalette.constructionAccent, kind: "cross", label: t("circle_construction_legend_centre")});
                }
                if (d.orthogonal) {
                    items.push({id: "orthogonal", color: ORTHOGONAL_STYLE.color, kind: dash(ORTHOGONAL_STYLE), label: t("circle_construction_legend_orthogonal")});
                }
                return items;
            }
            case "common": {
                if (d.result.status !== "ok") return [];
                const items: LegendItem[] = [];
                if (d.result.tangents.some(tangent => tangent.kind === "external")) {
                    items.push({id: "external-tangents", color: EXTERNAL_TANGENT_STYLE.color, kind: dash(EXTERNAL_TANGENT_STYLE),
                        label: t("circle_construction_legend_external_tangents")});
                }
                if (d.result.tangents.some(tangent => tangent.kind === "internal")) {
                    items.push({id: "internal-tangents", color: INTERNAL_TANGENT_STYLE.color, kind: dash(INTERNAL_TANGENT_STYLE),
                        label: t("circle_construction_legend_internal_tangents")});
                }
                if (d.result.externalCentre) {
                    items.push({id: "external-centre", color: GraphPalette.constructionLevels[1], kind: "cross", label: t("circle_construction_legend_external_centre")});
                }
                items.push({id: "internal-centre", color: GraphPalette.constructionLevels[2], kind: "plus", label: t("circle_construction_legend_internal_centre")});
                return items;
            }
            default:
                return [];
        }
    }

    readoutRows(): ReadoutListRow[] {
        const d = this.view();
        const row = (id: string, label: string, value: string): ReadoutListRow => ({id, label, value});
        switch (d.mode) {
            case "tangents": {
                const r = d.result;
                const rows = [row("power", t("circle_construction_readout_power"), rat(r.power))];
                if (r.status === "outside") {
                    rows.push(
                        row("length", t("circle_construction_readout_tangent_length"), dec(r.tangentLength)),
                        row("count", t("circle_construction_readout_tangent_count"), "2"),
                        row("contact-1", t("circle_construction_readout_contact", {value0: "1"}), xyPoint(r.contacts[0].x, r.contacts[0].y)),
                        row("contact-2", t("circle_construction_readout_contact", {value0: "2"}), xyPoint(r.contacts[1].x, r.contacts[1].y)),
                        row("chord", t("circle_construction_readout_chord"), lineText(r.chord)),
                    );
                    if (d.thales) {
                        rows.push(row("thales", t("circle_construction_readout_thales"),
                            t("circle_construction_readout_thales_value", {value0: ratPoint(d.thales.centre), value1: rat(d.thales.r2)})));
                    }
                } else if (r.status === "on") {
                    rows.push(
                        row("count", t("circle_construction_readout_tangent_count"), "1"),
                        row("contact-1", t("circle_construction_readout_contact", {value0: "1"}), plainPoint(this.state.p.x, this.state.p.y)),
                    );
                } else {
                    rows.push(row("count", t("circle_construction_readout_tangent_count"), "0"));
                }
                return rows;
            }
            case "radical": {
                const meet = d.firstPairMeet.kind === "two" ? "circle_construction_readout_meet_two"
                    : d.firstPairMeet.kind === "tangent" ? "circle_construction_readout_meet_one" : "circle_construction_readout_meet_none";
                const axisText = (index: 0 | 1 | 2) => {
                    const axis = d.axes[index].axis;
                    return axis.status === "line" ? lineText(axis.line) : this.none();
                };
                const c = d.centre;
                return [
                    ...d.powers.map((power, index) =>
                        row(`power-${index + 1}`, t("circle_construction_readout_probe_power", {value0: String(index + 1)}), rat(power))),
                    row("on-axis", t("circle_construction_readout_on_axis"), this.yesNo(d.onFirstAxis)),
                    row("axis-12", t("circle_construction_readout_axis", {value0: "1, 2"}), axisText(0)),
                    row("axis-13", t("circle_construction_readout_axis", {value0: "1, 3"}), axisText(1)),
                    row("axis-23", t("circle_construction_readout_axis", {value0: "2, 3"}), axisText(2)),
                    row("meet", t("circle_construction_readout_meet"), t(meet)),
                    row("centre", t("circle_construction_readout_centre"), c.status === "centre" ? ratPoint(c.point) : this.none()),
                    row("centre-power", t("circle_construction_readout_centre_power"), c.status === "centre" ? rat(c.power) : this.none()),
                    row("orthogonal", t("circle_construction_readout_orthogonal"), d.orthogonal ? rat(d.orthogonal.r2) : this.none()),
                ];
            }
            case "apollonius": {
                const l = d.locus;
                const internal = l.status === "degenerate" ? this.none() : ratPoint(l.internal);
                const locus = l.status === "circle"
                    ? t("circle_construction_readout_thales_value", {value0: ratPoint(l.circle.centre), value1: rat(l.circle.r2)})
                    : l.status === "line" ? lineText(l.line) : this.none();
                return [
                    row("ratio", t("circle_construction_readout_ratio"),
                        d.ratio === null ? t("circle_construction_readout_ratio_undefined") : dec(d.ratio)),
                    row("on-locus", t("circle_construction_readout_on_locus"), this.yesNo(d.onLocus)),
                    row("internal", t("circle_construction_readout_internal"), internal),
                    row("external", t("circle_construction_readout_external"), l.status === "circle" ? ratPoint(l.external) : this.none()),
                    row("locus", t("circle_construction_readout_locus"), locus),
                    row("inverse", t("circle_construction_readout_inverse"), d.inverseOfA ? ratPoint(d.inverseOfA) : this.none()),
                ];
            }
            case "common": {
                const r = d.result;
                return [
                    row("count", t("circle_construction_readout_count"), r.status === "ok" ? String(r.count) : this.none()),
                    row("external-centre", t("circle_construction_readout_external_centre"),
                        r.status === "ok" && r.externalCentre ? ratPoint(r.externalCentre) : this.none()),
                    row("internal-centre", t("circle_construction_readout_internal_centre"), r.status === "ok" ? ratPoint(r.internalCentre) : this.none()),
                    row("distance2", t("circle_construction_readout_distance2"), rat(d.distanceSquared)),
                ];
            }
        }
    }

    // ---- Numeric input -------------------------------------------------------------------------------------------------

    private editCircle(key: CircleKey, field: "x" | "y" | "r", value: number): boolean {
        const snapped = field === "r" ? snapRadiusInput(value, "radius") : snapCoordinateInput(value, field);
        if (!snapped.ok) return false;
        this.setCircle(key, {...this.state[key], [field]: snapped.value.value});
        return true;
    }

    private editPoint(key: PointKey, field: "x" | "y", value: number): boolean {
        const snapped = snapCoordinateInput(value, field);
        if (!snapped.ok) return false;
        const current = this.state[key];
        this.setPoint(key, field === "x" ? snapped.value.value : current.x, field === "y" ? snapped.value.value : current.y);
        return true;
    }

    /** Writes a typed ratio through the model's single snapping path; a non-finite value is refused. */
    editRatio(value: number): boolean {
        const snapped = snapRatioInput(value);
        if (!snapped.ok) return false;
        this.setState({k: snapped.value.value});
        return true;
    }

    private circleInputs(key: CircleKey, name: string): JSX.Element[] {
        const s = this.state[key];
        return [
            <NumberInput key={`${key}x`} label={t("circle_construction_centre_x", {value0: name})} value={s.x} step={COORDINATE_STEP}
                         bigStep={COORDINATE_BIG_STEP} min={-COORD_LIMIT} max={COORD_LIMIT} grid={1} decimals={0} describedBy={this.helpId}
                         onChange={value => this.editCircle(key, "x", value)}/>,
            <NumberInput key={`${key}y`} label={t("circle_construction_centre_y", {value0: name})} value={s.y} step={COORDINATE_STEP}
                         bigStep={COORDINATE_BIG_STEP} min={-COORD_LIMIT} max={COORD_LIMIT} grid={1} decimals={0} describedBy={this.helpId}
                         onChange={value => this.editCircle(key, "y", value)}/>,
            <NumberInput key={`${key}r`} label={t("circle_construction_radius", {value0: name})} value={s.r} step={RADIUS_STEP}
                         bigStep={RADIUS_BIG_STEP} min={RADIUS_MIN} max={RADIUS_MAX} grid={RADIUS_STEP} decimals={2} describedBy={this.helpId}
                         onChange={value => this.editCircle(key, "r", value)}/>,
        ];
    }

    private pointInputs(key: PointKey, name: string): JSX.Element[] {
        const s = this.state[key];
        return [
            <NumberInput key={`${key}x`} label={t("circle_construction_point_x", {value0: name})} value={s.x} step={COORDINATE_STEP}
                         bigStep={COORDINATE_BIG_STEP} min={-COORD_LIMIT} max={COORD_LIMIT} grid={1} decimals={0} describedBy={this.helpId}
                         onChange={value => this.editPoint(key, "x", value)}/>,
            <NumberInput key={`${key}y`} label={t("circle_construction_point_y", {value0: name})} value={s.y} step={COORDINATE_STEP}
                         bigStep={COORDINATE_BIG_STEP} min={-COORD_LIMIT} max={COORD_LIMIT} grid={1} decimals={0} describedBy={this.helpId}
                         onChange={value => this.editPoint(key, "y", value)}/>,
        ];
    }

    private modeName(mode: CircleMode): string {
        switch (mode) {
            case "tangents": return t("circle_construction_mode_tangents");
            case "radical": return t("circle_construction_mode_radical");
            case "apollonius": return t("circle_construction_mode_apollonius");
            case "common": return t("circle_construction_mode_common");
        }
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("circle_construction_mode_label")} value={state.mode}
                          options={CIRCLE_MODES.map(mode => ({value: mode, text: this.modeName(mode)}))}
                          help={t("circle_construction_mode_help")}
                          onChange={value => {
                              const mode = CIRCLE_MODES.find(candidate => candidate === value);
                              if (mode) this.setState(exampleState(mode));
                          }}/>,
        ];
        switch (state.mode) {
            case "tangents":
                commands.push(...this.circleInputs("c1", "1"), ...this.pointInputs("p", "P"));
                break;
            case "radical":
                commands.push(...this.circleInputs("c1", "1"), ...this.circleInputs("c2", "2"), ...this.circleInputs("c3", "3"), ...this.pointInputs("p", "P"));
                break;
            case "apollonius":
                commands.push(
                    ...this.pointInputs("a", "A"), ...this.pointInputs("b", "B"), ...this.pointInputs("p", "P"),
                    <NumberInput key="ratio" label={t("circle_construction_ratio_label")} value={state.k} step={RATIO_STEP} bigStep={RATIO_BIG_STEP}
                                 min={RATIO_MIN} max={RATIO_MAX} grid={RATIO_STEP} decimals={1} describedBy={this.helpId}
                                 onChange={value => this.editRatio(value)}/>,
                );
                break;
            case "common":
                commands.push(...this.circleInputs("c1", "1"), ...this.circleInputs("c2", "2"));
                break;
        }
        commands.push(<p key="help" id={this.helpId} className="form-text">{t("circle_construction_input_help", {
            value0: dec(-COORD_LIMIT), value1: dec(COORD_LIMIT), value2: dec(RADIUS_MIN), value3: dec(RADIUS_MAX), value4: dec(RATIO_MIN), value5: dec(RATIO_MAX),
        })}</p>);
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("circle_construction_readout_title")}</ReadoutHeading>
                <p data-circle-status="">{this.statusText()}</p>
                <ReadoutList label={t("circle_construction_readout_title")} rows={this.readoutRows()}/>
                <p className="form-text">{t("circle_construction_approx_note")}</p>
                {this.legendItems().length > 0 && <FunctionLegend items={this.legendItems()}/>}
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
