import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, type Message, message, messageNumber, onLanguageChange, renderMessage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutRow, ViewMark, ViewMarks} from "../base/declare/graphDeclaration";
import {DomainError} from "../functions/BaseFunctionGraph";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned} from "../base/controls/PuckOwnership";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import Slider from "../../inputs/Slider";
import {PointListInput} from "../../inputs/PointListInput";
import {ReadoutHeading, ReadoutList} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {pointLabelMath} from "../styles/pointLabelMath";
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
import {placeLpLabels, sampleLine, type LabelItem, type PxBox} from "../legend/boardLabelPlacement";
import {circleConstructionPresetCollection} from "./circleConstruction/circleConstructionPresetCollection";

/**
 * The ids this graph declares. Parameters (arbiter keys): the radius of each circle the mode draws and the ratio of the Apollonius mode, the
 * values the lessons ask the learner to set while reading the rows. Rows: what the old panel listed per mode. Legend: the drawn construction
 * objects. No notes, sections or actions: the mode (it loads an example) and the point rows stay in Orodja.
 */
export type CircleConstructionIds = {
    param: "radius-1" | "radius-2" | "radius-3" | "ratio";
    row: "power" | "length" | "count" | "contact-1" | "contact-2" | "chord" | "thales"
        | "power-1" | "power-2" | "power-3" | "on-axis" | "axis-12" | "axis-13" | "axis-23" | "meet" | "centre" | "centre-power" | "orthogonal"
        | "ratio" | "on-locus" | "internal" | "external" | "locus" | "inverse"
        | "external-centre" | "internal-centre" | "distance2";
    note: never;
    legend: "thales" | "chord" | "locus" | "axis-0" | "axis-1" | "axis-2" | "centre" | "orthogonal" | "external-tangents" | "internal-tangents"
        | "external-centre" | "internal-centre";
    section: never;
    action: never;
};

type CircleRadiusKey = "radius-1" | "radius-2" | "radius-3";
const RADIUS_KEYS: Readonly<Record<"c1" | "c2" | "c3", CircleRadiusKey>> = {c1: "radius-1", c2: "radius-2", c3: "radius-3"};

/** The text of a declared row value, as the old panel showed it. */
function valueText(value: ReadoutRow["value"]): string {
    if ("kind" in value && value.kind === "formatted") return value.text;
    if ("kind" in value && value.kind === "number") return formatNumber(value.value, currentLanguage(), value.maxDecimals);
    return renderMessage(value as Message);
}

/** The scene state is the stored circle construction state (ADR 0045 sections 1 and 2); everything else is derived from it. */
export interface CircleConstructionGraphState extends BaseGraphState, CircleConstructionState {}

/** Keyboard steps: the arrow keys move a coordinate by 1, a radius by 1/4 and the ratio by 1/2; the Page keys take the big steps. */
export const COORDINATE_STEP = 1;
export const RADIUS_STEP = 0.25;
export const COORDINATE_BIG_STEP = 4;
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
/** The room a handle or marker takes beyond its size, in px, for the pixel placement of the board texts. */
const MARKER_PAD_PX = 3;
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

/** A line as a message, for example `13 x = 25` or `6 x + 12 y = 66` (the left side has letters, so it is a template, not a formatted value). */
function lineMessage(line: Line | InexactLine): Message {
    const [a, b, c] = coefficientsOf(line);
    let text = "";
    for (const [coefficient, name] of [[a, "x"], [b, "y"]] as const) {
        if (coefficient === 0) continue;
        const size = Math.abs(coefficient);
        const body = `${size === 1 ? "" : `${dec(size)} `}${name}`;
        text += text === "" ? `${coefficient < 0 ? "−" : ""}${body}` : ` ${coefficient < 0 ? "−" : "+"} ${body}`;
    }
    return message("circle_construction_line_equation", {value0: text, value1: dec(c)});
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
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];
    private readonly handleMap = new Map<HandleId, JXG.Point>();
    /** The board elements each legend entry stands for (an entry may stand for several: both tangents of a kind, the locus circle or line). */
    private readonly legendObjects = new Map<string, JXG.GeometryElement[]>();
    private viewCache?: {key: string; derived: CircleConstructionDerived};
    /** The mode the board was last drawn for; a sync that finds the same mode redraws nothing but the handle positions. */
    private builtMode: CircleMode | undefined;
    private readonly status = new SettledReadout();
    /** The board texts of the scene (see `labelBoxes`): what each says, the data point it sits beside, and when it is shown. */
    private captionList: Array<{id: string; text: () => string; anchors: () => ReadonlyArray<readonly [number, number]>; visible: () => boolean}> = [];
    private layoutCache?: {key: string; state: Readonly<CircleConstructionGraphState>; boxes: Record<string, PxBox>};

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

    /**
     * The boxes (px from the board's top left corner, y down) of the board texts: each takes the free spot nearest to its anchor that clears the
     * handles and markers, the drawn lines and circles, the axis numbers and the texts placed before it (the bounded search of `placeLpLabels`).
     */
    private labelBoxes(): Record<string, PxBox> {
        if (!this.hasBoard || !(this.board.canvasWidth > 0) || !(this.board.canvasHeight > 0)) return {};
        const board = this.board;
        const [left, top] = board.getBoundingBox();
        const ux = Number.isFinite(board.unitX) && board.unitX > 0 ? board.unitX : 1;
        const uy = Number.isFinite(board.unitY) && board.unitY > 0 ? board.unitY : 1;
        const width = board.canvasWidth, height = board.canvasHeight;
        const handles = [...this.handleMap.values()].map(h => `${h.X()},${h.Y()}`).join(";");
        type Drawn = {elType: string; evalVisProp(name: string): unknown};
        const shown = (this.objects as unknown as Drawn[]).filter(o => Boolean(o.evalVisProp("visible")));
        // The shown markers, circles and lines (their positions, not just their count) belong to the key: a layout is stale once any moved or appeared.
        const drawnKey = shown.map(o => {
            if (o.elType === "point") return `p${(o as unknown as JXG.Point).X()},${(o as unknown as JXG.Point).Y()}`;
            if (o.elType === "circle") return `c${(o as unknown as JXG.Circle).center.X()},${(o as unknown as JXG.Circle).center.Y()},${(o as unknown as JXG.Circle).Radius()}`;
            if (o.elType === "line" || o.elType === "segment") {
                const l = o as unknown as JXG.Line;
                return `l${l.point1.X()},${l.point1.Y()},${l.point2.X()},${l.point2.Y()}`;
            }
            return o.elType;
        }).join(";");
        const key = [ux, uy, left, top, width, height, this.builtMode, this.objects.length, handles, drawnKey, currentLanguage()].join("|");
        if (this.layoutCache?.key === key && this.layoutCache.state === this.state) return this.layoutCache.boxes;
        const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * ux, (top - y) * uy];
        const markers: Array<readonly [number, number, number]> = [];
        const samples: Array<readonly [number, number]> = [];
        for (const o of shown) {
            if (o.elType === "point") {
                const p = o as unknown as JXG.Point;
                markers.push([...toPx(p.X(), p.Y()), Number(o.evalVisProp("size")) + MARKER_PAD_PX]);
            } else if (o.elType === "circle") {
                const c = o as unknown as JXG.Circle;
                const [cx, cy, r] = [c.center.X(), c.center.Y(), c.Radius()];
                if (!(r > 0) || ![cx, cy, r].every(Number.isFinite)) continue;
                const xs = Array.from({length: 121}, (_, i) => cx + r * Math.cos((i * Math.PI) / 60));
                const ys = Array.from({length: 121}, (_, i) => cy + r * Math.sin((i * Math.PI) / 60));
                samples.push(...sampleLine(xs, ys, toPx, width, height, 2, 1500));
            } else if (o.elType === "line" || o.elType === "segment") {
                const l = o as unknown as JXG.Line;
                const [x0, y0, x1, y1] = [l.point1.X(), l.point1.Y(), l.point2.X(), l.point2.Y()];
                const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy);
                if (!(length > 0)) continue;
                const reach = o.elType === "line" ? 60 / length : 1;
                const from = o.elType === "line" ? -reach : 0;
                samples.push(...sampleLine([x0 + dx * from, x0 + dx * reach], [y0 + dy * from, y0 + dy * reach], toPx, width, height, 2, 1500));
            }
        }
        // The axis tick numbers (the texts of the default axes' ticks, each at its screen position) are soft obstacles.
        type Tick = {evalVisProp(name: string): unknown; plaintext?: string; coords?: {scrCoords: number[]}};
        const axes = (board as unknown as {defaultAxes?: {x?: {defaultTicks?: {labels?: Tick[]}}; y?: {defaultTicks?: {labels?: Tick[]}}}}).defaultAxes;
        const strips: PxBox[] = [];
        for (const [axis, ticks] of [["x", axes?.x?.defaultTicks?.labels], ["y", axes?.y?.defaultTicks?.labels]] as const) {
            for (const tick of ticks ?? []) {
                const [, sx, sy] = tick.coords?.scrCoords ?? [];
                if (!tick.evalVisProp("visible") || !Number.isFinite(sx) || !Number.isFinite(sy) || !tick.plaintext) continue;
                const w = tick.plaintext.length * 7 + 4, h = 14;
                strips.push(axis === "x" ? {x0: sx - w / 2, y0: sy, x1: sx + w / 2, y1: sy + h} : {x0: sx - w, y0: sy - h / 2, x1: sx, y1: sy + h / 2});
            }
        }
        const items: LabelItem[] = [];
        for (const c of this.captionList) {
            if (!c.visible()) continue;
            const text = c.text();
            if (text === "") continue;
            const [first, ...rest] = c.anchors().filter(a => Number.isFinite(a[0]) && Number.isFinite(a[1])).map(a => toPx(a[0], a[1]));
            if (first) items.push({id: c.id, ax: first[0], ay: first[1], alts: rest, w: text.length * 15 * 0.55 + 8, h: 15 + 7});
        }
        const boxes = placeLpLabels(items, {width, height, markers, samples, strips, blocks: []});
        // A name must lie nearer to its own point than to any other point marker, and clear of what is drawn. A box that is not moves to the cheapest spot on rings round the
        // point (up and to the right first) that does, clear of the markers, the other texts and, as far as it can, the drawn lines.
        const overlap = (p: PxBox, q: PxBox) => p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0;
        for (const item of items) {
            const box = boxes[item.id];
            if (!box) continue;
            const others = markers.filter(([mx, my]) => Math.hypot(mx - item.ax, my - item.ay) >= 1);
            const nearest = (b: PxBox) => {
                const [cx, cy] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
                const own = Math.hypot(cx - item.ax, cy - item.ay);
                return others.every(([mx, my]) => Math.hypot(cx - mx, cy - my) > own);
            };
            const penalty = (c: PxBox) => {
                let cost = 0;
                for (const [id, other] of Object.entries(boxes)) if (id !== item.id && overlap(c, other)) cost += 100;
                for (const [mx, my, mr] of markers) if (mx + mr > c.x0 && mx - mr < c.x1 && my + mr > c.y0 && my - mr < c.y1) cost += 60;
                for (const [x, y] of samples) if (x >= c.x0 + 3 && x <= c.x1 - 3 && y >= c.y0 + 4 && y <= c.y1 - 4) cost += 8; // the box has padding round the glyph
                for (const strip of strips) if (overlap(c, strip)) cost += 12;
                return cost;
            };
            const owned = nearest(box);
            const current = penalty(box);
            if (owned && current === 0) continue;
            let best: PxBox | undefined;
            let bestCost = Infinity;
            let bestPenalty = Infinity;
            for (const r of [14, 18, 24, 32, 42, 54, 66]) for (let k = 0; k < 16; k++) {
                const angle = -Math.PI / 4 + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8); // up right first, then alternately each way round
                const [cx, cy] = [item.ax + r * Math.cos(angle), item.ay + r * Math.sin(angle)];
                const c: PxBox = {x0: cx - item.w / 2, y0: cy - item.h / 2, x1: cx + item.w / 2, y1: cy + item.h / 2};
                if (c.x0 < 4 || c.y0 < 4 || c.x1 > width - 4 || c.y1 > height - 4 || !nearest(c)) continue;
                const pen = penalty(c);
                const cost = pen + r * 0.15 + k * 0.2;
                if (cost < bestCost) { bestCost = cost; best = c; bestPenalty = pen; }
            }
            // A box that is already nearest to its point only moves to a spot with fewer collisions.
            if (best && (!owned || bestPenalty < current)) boxes[item.id] = best;
        }
        this.layoutCache = {key, state: this.state, boxes};
        return boxes;
    }

    private buildScene(): void {
        this.disposeScene();
        this.captionList = [];
        const board = this.board;
        const mode = this.state.mode;
        this.builtMode = mode;
        type Visible = boolean | (() => boolean);
        type Coordinate = number | (() => number);
        type PointFace = NonNullable<JXG.PointAttributes["face"]>;
        const frame = (): Frame => ({state: this.state, derived: this.view()});
        /** Records the element a legend entry stands for, for `drawnObject`. */
        const legendFor = <E extends JXG.GeometryElement>(id: CircleConstructionIds["legend"], element: E): E => {
            this.legendObjects.set(id, [...(this.legendObjects.get(id) ?? []), element]);
            return element;
        };

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
        /**
         * A text sits at the centre of its placed box (see `labelBoxes`) beside its anchor, or on the anchor before the board has a size.
         * `math`: the text is only the name of a point, typeset at the compact named-label size (M03). The layout measures the plain name,
         * which is wider than the typeset one at the 15 px caption size.
         */
        const caption = (text: string | (() => string), x: Coordinate, y: Coordinate, color: string, visible: Visible = true, math = false) => {
            const id = `caption-${this.captionList.length}`;
            const content = typeof text === "string" ? () => text : text;
            const at = (v: Coordinate) => (typeof v === "function" ? v() : v);
            const anchors = () => [[at(x), at(y)] as const];
            this.captionList.push({id, text: content, anchors, visible: typeof visible === "function" ? visible : () => visible});
            const place = (axis: 0 | 1) => () => {
                const box = this.labelBoxes()[id];
                if (!box) return anchors()[0][axis];
                const [left, top] = board.getBoundingBox();
                return axis === 0 ? left + (box.x0 + box.x1) / 2 / board.unitX : top - (box.y0 + box.y1) / 2 / board.unitY;
            };
            const mathStyle = math ? {fontSize: this.styles.point.namedLabel.fontSize, useMathJax: true, parse: false} : {};
            return this.own(board.create("text", [place(0), place(1), math ? () => pointLabelMath(content()) : content], {
                strokeColor: color, fontSize: 15, ...mathStyle, anchorX: "middle", anchorY: "middle", fixed: true, highlight: false, withLabel: false, visible,
            }) as JXG.Text);
        };
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
        /** The name of a handle: a point name is typeset as math, a circle number stays a plain caption. */
        const label = (name: string, id: HandleId, color: string) =>
            caption(name, () => this.handleTarget(id)[0], () => this.handleTarget(id)[1], color, true, /^[A-Z]$/.test(name));
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
            legendFor("thales", circleAbout(thales, numberAt(f => {
                const r2 = tangents(f)?.thales?.r2;
                return r2 ? Math.sqrt(r2.toNumber()) : undefined;
            }), THALES_STYLE.color, 1, THALES_STYLE.dash, flag(f => tangents(f)?.thales != null)));
            const p = handle("p", GraphPalette.controlPoint, "o");
            const t1 = marker(contact(0, "x"), contact(0, "y"), "square", GraphPalette.primaryCurve, 5, outside);
            const t2 = marker(contact(1, "x"), contact(1, "y"), "square", GraphPalette.primaryCurve, 5, outside);
            segment(p, t1, GraphPalette.primaryCurve, 2, 0, outside);
            segment(p, t2, GraphPalette.primaryCurve, 2, 0, outside);
            legendFor("chord", segment(t1, t2, CHORD_STYLE.color, 1, CHORD_STYLE.dash, outside));
            segment(centre, p, GraphPalette.label, 1, 2, flag(f => !(tangents(f)?.atCentre ?? true)));
            caption("T1", contact(0, "x"), contact(0, "y"), GraphPalette.label, outside, true);
            caption("T2", contact(1, "x"), contact(1, "y"), GraphPalette.label, outside, true);
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
            // P is named first: the placer gives the first text the pick of the spots, and P sits among the circles.
            label("P", "p", GraphPalette.label);
            label("1", "c1", colors[0]);
            label("2", "c2", colors[1]);
            label("3", "c3", colors[2]);
            handle("p", GraphPalette.controlPoint, "o");
            ([0, 1, 2] as const).forEach(index => {
                legendFor(`axis-${index}` as "axis-0" | "axis-1" | "axis-2", lineAlong(() => {
                    const d = this.view();
                    const axis = d.mode === "radical" ? d.axes[index].axis : undefined;
                    return axis?.status === "line" ? coefficientsOf(axis.line) : null;
                }, AXIS_STYLES[index].color, 2, AXIS_STYLES[index].dash));
            });
            const centre = legendFor("centre", marker(
                numberAt(f => {
                    const c = radical(f)?.centre;
                    return c?.status === "centre" ? c.point.x.toNumber() : undefined;
                }),
                numberAt(f => {
                    const c = radical(f)?.centre;
                    return c?.status === "centre" ? c.point.y.toNumber() : undefined;
                }),
                "cross", GraphPalette.constructionAccent, 6, flag(f => radical(f)?.centre.status === "centre")));
            legendFor("orthogonal", circleAbout(centre, numberAt(f => {
                const r2 = radical(f)?.orthogonal?.r2;
                return r2 ? Math.sqrt(r2.toNumber()) : undefined;
            }), ORTHOGONAL_STYLE.color, 1, ORTHOGONAL_STYLE.dash, flag(f => radical(f)?.orthogonal != null)));
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
            legendFor("locus", circleAbout(locusCentre, numberAt(f => {
                const l = apollonius(f)?.locus;
                return l?.status === "circle" ? Math.sqrt(l.circle.r2.toNumber()) : undefined;
            }), LOCUS_STYLE.color, 2, LOCUS_STYLE.dash, flag(f => apollonius(f)?.locus.status === "circle")));
            legendFor("locus", lineAlong(() => {
                const d = this.view();
                return d.mode === "apollonius" && d.locus.status === "line" ? coefficientsOf(d.locus.line) : null;
            }, LOCUS_STYLE.color, 2, LOCUS_STYLE.dash));
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
            caption(() => t("circle_construction_caption_internal"), division("internal", "x"), division("internal", "y"),
                GraphPalette.label, internalShown, true);
            caption(() => t("circle_construction_caption_external"), division("external", "x"), division("external", "y"),
                GraphPalette.label, externalShown, true);
            segment(p, a, GraphPalette.referenceCurve, 1, 2);
            segment(p, b, GraphPalette.comparisonCurve, 1, 2);
            segment(a, b, GraphPalette.label, 1, 0);
            caption(() => {
                const ratio = apollonius(frame())?.ratio;
                return ratio == null ? "" : t("circle_construction_ratio_caption", {value0: dec(ratio)});
            }, () => this.state.p.x, () => this.state.p.y, GraphPalette.primaryCurve);
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
            legendFor("external-centre", marker(centreCoordinate("external", "x"), centreCoordinate("external", "y"), "cross", GraphPalette.constructionLevels[1], 6,
                flag(f => okResult(f)?.externalCentre != null)));
            legendFor("internal-centre", marker(centreCoordinate("internal", "x"), centreCoordinate("internal", "y"), "plus", GraphPalette.constructionLevels[2], 6,
                flag(f => okResult(f) !== undefined)));
            for (const kind of ["external", "internal"] as const) {
                for (const index of [0, 1] as const) {
                    legendFor(`${kind}-tangents`, lineAlong(() => {
                        const d = this.view();
                        if (d.mode !== "common" || d.result.status !== "ok") return null;
                        const tangent = d.result.tangents.filter(candidate => candidate.kind === kind)[index];
                        return tangent ? coefficientsOf(tangent.line) : null;
                    }, (kind === "external" ? EXTERNAL_TANGENT_STYLE : INTERNAL_TANGENT_STYLE).color, 2,
                        (kind === "external" ? EXTERNAL_TANGENT_STYLE : INTERNAL_TANGENT_STYLE).dash));
                }
            }
        }

        for (const [id, point] of this.handleMap) this.wireDrag(id, point);
    }

    /** Snaps a dragged handle to the grid (a radius to quarters) and writes the field to the scene state. */
    private wireDrag(id: HandleId, point: JXG.Point): void {
        const onDrag = () => this.dragTo(id, point);
        const board = this.board;
        const releaseCursor = bindMovablePointCursor(point, board);
        point.on("drag", onDrag);
        this.listeners.push(() => { point.off("drag", onDrag); releaseCursor(); });
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
        this.legendObjects.clear();
        this.builtMode = undefined;
    }

    // ---- Text and controls ---------------------------------------------------------------------------------------------

    private yesNo(value: boolean): Message {
        return message(value ? "circle_construction_yes" : "circle_construction_no");
    }

    private none(): Message {
        return message("circle_construction_none");
    }

    /** The sentences for the whole state, one message each; degenerate states say what they are. */
    private statusMessages(): Message[] {
        const d = this.view();
        switch (d.mode) {
            case "tangents": {
                if (d.atCentre) return [message("circle_construction_status_tangents_centre")];
                const r = d.result;
                if (r.status === "inside") return [message("circle_construction_status_tangents_inside", {value0: rat(r.power)})];
                if (r.status === "on") return [message("circle_construction_status_tangents_on")];
                return [message("circle_construction_status_tangents_outside", {value0: rat(r.power), value1: dec(r.tangentLength)})];
            }
            case "radical": {
                const statuses = d.axes.map(pair => pair.axis.status);
                if (statuses.includes("coincident")) return [message("circle_construction_status_radical_coincident")];
                if (statuses.includes("concentric")) return [message("circle_construction_status_radical_concentric")];
                const c = d.centre;
                if (c.status === "centre") return [message("circle_construction_status_radical_centre", {value0: ratPoint(c.point), value1: rat(c.power)})];
                if (c.status === "coaxal") return [message("circle_construction_status_radical_coaxal")];
                return [message("circle_construction_status_radical_parallel")];
            }
            case "apollonius": {
                const l = d.locus;
                const locus = l.status === "circle"
                    ? message("circle_construction_status_apollonius_circle", {value0: rat(l.k), value1: ratPoint(l.circle.centre), value2: rat(l.circle.r2)})
                    : l.status === "line" ? message("circle_construction_status_apollonius_line") : message("circle_construction_status_apollonius_degenerate");
                const probe = d.ratio === null
                    ? message("circle_construction_status_apollonius_at_b")
                    : message("circle_construction_status_apollonius_ratio", {value0: dec(d.ratio)});
                return [locus, probe];
            }
            case "common": {
                if (d.relation === "coincident") return [message("circle_construction_status_common_coincident")];
                if (d.relation === "concentric") return [message("circle_construction_status_common_concentric")];
                const relation = {
                    separate: message("circle_construction_status_common_separate"),
                    "touching-outside": message("circle_construction_status_common_touching_outside"),
                    crossing: message("circle_construction_status_common_crossing"),
                    "touching-inside": message("circle_construction_status_common_touching_inside"),
                    nested: message("circle_construction_status_common_nested"),
                }[d.relation];
                return d.result.status === "ok" && d.result.externalCentre === null
                    ? [relation, message("circle_construction_status_common_equal_radii")] : [relation];
            }
        }
    }

    /** The status as one text (the live region and `data-circle-status`): the lines joined by a space. */
    statusText(): string {
        return this.statusMessages().map(renderMessage).join(" ");
    }

    /**
     * The legend of the drawn construction lines and circles; the conditions are those of the board's visibility. A plus-faced marker is
     * declared as a cross (the legend has no plus kind); the label still says "plus".
     */
    private legendEntries(): LegendEntry<CircleConstructionIds>[] {
        const d = this.view();
        const line = (style: {dash: number}) => (style.dash > 0 ? "dashed" : "line") as "dashed" | "line";
        const entry = (id: CircleConstructionIds["legend"], label: Message, kind: LegendEntry["kind"]): LegendEntry<CircleConstructionIds> =>
            ({id, label, kind, object: id});
        switch (d.mode) {
            case "tangents": {
                const entries: LegendEntry<CircleConstructionIds>[] = [];
                if (d.thales) entries.push(entry("thales", message("circle_construction_legend_thales"), line(THALES_STYLE)));
                if (d.result.status === "outside") entries.push(entry("chord", message("circle_construction_legend_chord"), line(CHORD_STYLE)));
                return entries;
            }
            case "apollonius": {
                if (d.locus.status === "circle") return [entry("locus", message("circle_construction_legend_locus_circle"), line(LOCUS_STYLE))];
                return d.locus.status === "line" ? [entry("locus", message("circle_construction_legend_locus_line"), line(LOCUS_STYLE))] : [];
            }
            case "radical": {
                const entries: LegendEntry<CircleConstructionIds>[] = [];
                const pairs = [[1, 2], [1, 3], [2, 3]] as const;
                AXIS_STYLES.forEach((style, index) => {
                    if (d.axes[index].axis.status !== "line") return;
                    const pair = message("circle_construction_pair", {value0: pairs[index][0], value1: pairs[index][1]});
                    entries.push(entry(`axis-${index}` as "axis-0" | "axis-1" | "axis-2",
                        message(style.dash > 0 ? "circle_construction_legend_axis_dashed" : "circle_construction_legend_axis_solid", {value0: pair}), line(style)));
                });
                if (d.centre.status === "centre") entries.push(entry("centre", message("circle_construction_legend_centre"), "cross"));
                if (d.orthogonal) entries.push(entry("orthogonal", message("circle_construction_legend_orthogonal"), line(ORTHOGONAL_STYLE)));
                return entries;
            }
            case "common": {
                if (d.result.status !== "ok") return [];
                const entries: LegendEntry<CircleConstructionIds>[] = [];
                if (d.result.tangents.some(tangent => tangent.kind === "external")) {
                    entries.push(entry("external-tangents", message("circle_construction_legend_external_tangents"), line(EXTERNAL_TANGENT_STYLE)));
                }
                if (d.result.tangents.some(tangent => tangent.kind === "internal")) {
                    entries.push(entry("internal-tangents", message("circle_construction_legend_internal_tangents"), line(INTERNAL_TANGENT_STYLE)));
                }
                if (d.result.externalCentre) entries.push(entry("external-centre", message("circle_construction_legend_external_centre"), "cross"));
                entries.push(entry("internal-centre", message("circle_construction_legend_internal_centre"), "cross"));
                return entries;
            }
        }
    }

    /** The rows of the old panel in its order; a row of a drawn object links to its legend entry while that entry exists. */
    private readoutRows(legend: readonly LegendEntry<CircleConstructionIds>[]): ReadoutRow<CircleConstructionIds>[] {
        const d = this.view();
        const text = (value: string) => ({kind: "formatted" as const, text: value});
        const row = (id: CircleConstructionIds["row"], name: Message, value: ReadoutRow["value"], link?: CircleConstructionIds["legend"]): ReadoutRow<CircleConstructionIds> =>
            ({id, name, value, ...(link !== undefined && legend.some(entry => entry.id === link) ? {legend: link} : {})});
        switch (d.mode) {
            case "tangents": {
                const r = d.result;
                const rows = [row("power", message("circle_construction_readout_power"), text(rat(r.power)))];
                if (r.status === "outside") {
                    rows.push(
                        row("length", message("circle_construction_readout_tangent_length"), text(dec(r.tangentLength))),
                        row("count", message("circle_construction_readout_tangent_count"), messageNumber(2)),
                        row("contact-1", message("circle_construction_readout_contact", {value0: 1}), text(xyPoint(r.contacts[0].x, r.contacts[0].y))),
                        row("contact-2", message("circle_construction_readout_contact", {value0: 2}), text(xyPoint(r.contacts[1].x, r.contacts[1].y))),
                        row("chord", message("circle_construction_readout_chord"), lineMessage(r.chord), "chord"),
                    );
                    if (d.thales) {
                        rows.push(row("thales", message("circle_construction_readout_thales"),
                            message("circle_construction_readout_thales_value", {value0: ratPoint(d.thales.centre), value1: rat(d.thales.r2)}), "thales"));
                    }
                } else if (r.status === "on") {
                    rows.push(
                        row("count", message("circle_construction_readout_tangent_count"), messageNumber(1)),
                        row("contact-1", message("circle_construction_readout_contact", {value0: 1}), text(plainPoint(this.state.p.x, this.state.p.y))),
                    );
                } else {
                    rows.push(row("count", message("circle_construction_readout_tangent_count"), messageNumber(0)));
                }
                return rows;
            }
            case "radical": {
                const meet = d.firstPairMeet.kind === "two" ? "circle_construction_readout_meet_two"
                    : d.firstPairMeet.kind === "tangent" ? "circle_construction_readout_meet_one" : "circle_construction_readout_meet_none";
                const axisValue = (index: 0 | 1 | 2) => {
                    const axis = d.axes[index].axis;
                    return axis.status === "line" ? lineMessage(axis.line) : this.none();
                };
                const c = d.centre;
                return [
                    ...d.powers.map((power, index) => row(`power-${index + 1}` as "power-1" | "power-2" | "power-3",
                        message("circle_construction_readout_probe_power", {value0: index + 1}), text(rat(power)))),
                    row("on-axis", message("circle_construction_readout_on_axis"), this.yesNo(d.onFirstAxis)),
                    row("axis-12", message("circle_construction_readout_axis", {value0: "1, 2"}), axisValue(0), "axis-0"),
                    row("axis-13", message("circle_construction_readout_axis", {value0: "1, 3"}), axisValue(1), "axis-1"),
                    row("axis-23", message("circle_construction_readout_axis", {value0: "2, 3"}), axisValue(2), "axis-2"),
                    row("meet", message("circle_construction_readout_meet"), message(meet)),
                    row("centre", message("circle_construction_readout_centre"), c.status === "centre" ? text(ratPoint(c.point)) : this.none(), "centre"),
                    row("centre-power", message("circle_construction_readout_centre_power"), c.status === "centre" ? text(rat(c.power)) : this.none()),
                    row("orthogonal", message("circle_construction_readout_orthogonal"), d.orthogonal ? text(rat(d.orthogonal.r2)) : this.none(), "orthogonal"),
                ];
            }
            case "apollonius": {
                const l = d.locus;
                const locus = l.status === "circle"
                    ? message("circle_construction_readout_thales_value", {value0: ratPoint(l.circle.centre), value1: rat(l.circle.r2)})
                    : l.status === "line" ? lineMessage(l.line) : this.none();
                return [
                    row("ratio", message("circle_construction_readout_ratio"),
                        d.ratio === null ? message("circle_construction_readout_ratio_undefined") : text(dec(d.ratio))),
                    row("on-locus", message("circle_construction_readout_on_locus"), this.yesNo(d.onLocus)),
                    row("internal", message("circle_construction_readout_internal"), l.status === "degenerate" ? this.none() : text(ratPoint(l.internal))),
                    row("external", message("circle_construction_readout_external"), l.status === "circle" ? text(ratPoint(l.external)) : this.none()),
                    row("locus", message("circle_construction_readout_locus"), locus, "locus"),
                    row("inverse", message("circle_construction_readout_inverse"), d.inverseOfA ? text(ratPoint(d.inverseOfA)) : this.none()),
                ];
            }
            case "common": {
                const r = d.result;
                return [
                    row("count", message("circle_construction_readout_count"), r.status === "ok" ? messageNumber(r.count) : this.none()),
                    row("external-centre", message("circle_construction_readout_external_centre"),
                        r.status === "ok" && r.externalCentre ? text(ratPoint(r.externalCentre)) : this.none(), "external-centre"),
                    row("internal-centre", message("circle_construction_readout_internal_centre"),
                        r.status === "ok" ? text(ratPoint(r.internalCentre)) : this.none(), "internal-centre"),
                    row("distance2", message("circle_construction_readout_distance2"), text(rat(d.distanceSquared))),
                ];
            }
        }
    }

    // ---- Declaration ---------------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the radius of each circle the mode draws and the ratio, through the snapping the panel's sliders use. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const radius = (key: CircleKey): ParameterBinding<number> => ({
            read: () => this.state[key].r,
            apply: value => { if (!this.editRadius(key, value)) throw new DomainError(message("circle_construction_value_not_finite")); },
        });
        return {
            [RADIUS_KEYS.c1]: radius("c1"), [RADIUS_KEYS.c2]: radius("c2"), [RADIUS_KEYS.c3]: radius("c3"),
            ratio: {read: () => this.state.k, apply: (value: number) => { if (!this.editRatio(value)) throw new DomainError(message("circle_construction_value_not_finite")); }},
        };
    }

    /**
     * The radii of the circles of the mode and the ratio are range pucks: the lessons ask the learner to set them while reading the rows
     * (the radius of the second circle, r2, k). The mode (it loads an example, a setup choice) and the point rows (typed or dragged
     * places, no arbiter key) stay in Orodja.
     */
    private parameterDeclarations(): ParameterDeclaration<CircleConstructionIds["param"]>[] {
        const radius = (key: CircleRadiusKey, label: Message, symbol: string): ParameterDeclaration<CircleConstructionIds["param"]> =>
            ({key, kind: "range", label, symbol, placement: "board", min: RADIUS_MIN, max: RADIUS_MAX, step: RADIUS_STEP, bigStep: RADIUS_BIG_STEP, maxDecimals: 2});
        const first = message("circle_construction_radius_first");
        const second = message("circle_construction_radius_second");
        switch (this.state.mode) {
            case "tangents": return [radius("radius-1", message("circle_construction_radius_name"), "r")];
            case "radical": return [radius("radius-1", first, "r_1"), radius("radius-2", second, "r_2"), radius("radius-3", message("circle_construction_radius_third"), "r_3")];
            case "common": return [radius("radius-1", first, "r_1"), radius("radius-2", second, "r_2")];
            case "apollonius": return [{key: "ratio", kind: "range", label: message("circle_construction_ratio_name"), symbol: "k", placement: "board",
                min: RATIO_MIN, max: RATIO_MAX, step: RATIO_STEP, bigStep: RATIO_BIG_STEP, maxDecimals: 1}];
        }
    }

    /** Pure data from the state: the radius and ratio pucks, the rows of the old panel, its status lines and approximation note, the legend and the marks. */
    protected override declaration(): GraphDeclaration<CircleConstructionIds> {
        const legend = this.legendEntries();
        return {
            parameters: this.parameterDeclarations(),
            readouts: [{id: "construction", rows: this.readoutRows(legend)}],
            readoutHelp: message("circle_construction_approx_note"),
            status: this.statusMessages().map((text, index) => ({id: `status-${index + 1}`, text})),
            legend,
            marks: this.viewMarks(),
        };
    }

    private viewMarksCache: {key: string; marks: ViewMarks} | undefined;

    /**
     * What the view director keeps visible: the circles of the mode, the handles and the derived centres (must); the construction circles
     * (Thales, orthogonal, Apollonius) when there is room (nice). Memoized on the state `view()` is.
     */
    private viewMarks(): ViewMarks {
        const s = this.state;
        const key = JSON.stringify([s.mode, s.c1, s.c2, s.c3, s.p, s.a, s.b, s.k]);
        if (this.viewMarksCache?.key === key) return this.viewMarksCache.marks;
        const d = this.view();
        const finite = (...values: number[]) => values.every(Number.isFinite);
        const must: ViewMark[] = [];
        const nice: ViewMark[] = [];
        const point = (list: ViewMark[], x: number, y: number) => { if (finite(x, y)) list.push({kind: "point", x, y}); };
        const circle = (list: ViewMark[], x: number, y: number, r: number) => {
            if (finite(x, y, r)) list.push({kind: "box", left: x - r, top: y + r, right: x + r, bottom: y - r});
        };
        const ratPointMark = (list: ViewMark[], p: RationalPoint) => point(list, p.x.toNumber(), p.y.toNumber());
        for (const circleKey of ({tangents: ["c1"], radical: ["c1", "c2", "c3"], common: ["c1", "c2"], apollonius: []} as const)[s.mode] as readonly CircleKey[]) {
            circle(must, s[circleKey].x, s[circleKey].y, s[circleKey].r);
        }
        for (const id of MODE_HANDLES[s.mode]) if (id === "p" || id === "a" || id === "b") point(must, s[id].x, s[id].y);
        switch (d.mode) {
            case "tangents":
                if (d.thales) circle(nice, d.thales.centre.x.toNumber(), d.thales.centre.y.toNumber(), Math.sqrt(d.thales.r2.toNumber()));
                break;
            case "radical":
                if (d.centre.status === "centre") ratPointMark(must, d.centre.point);
                if (d.centre.status === "centre" && d.orthogonal) circle(nice, d.centre.point.x.toNumber(), d.centre.point.y.toNumber(), Math.sqrt(d.orthogonal.r2.toNumber()));
                break;
            case "apollonius":
                if (d.locus.status !== "degenerate") ratPointMark(must, d.locus.internal);
                if (d.locus.status === "circle") {
                    ratPointMark(must, d.locus.external);
                    circle(nice, d.locus.circle.centre.x.toNumber(), d.locus.circle.centre.y.toNumber(), Math.sqrt(d.locus.circle.r2.toNumber()));
                }
                break;
            case "common":
                if (d.result.status === "ok") {
                    ratPointMark(must, d.result.internalCentre);
                    if (d.result.externalCentre) ratPointMark(must, d.result.externalCentre);
                }
                break;
        }
        const marks: ViewMarks = {must, nice};
        this.viewMarksCache = {key, marks};
        return marks;
    }

    /** The first shown element of the legend entry's object (its colour and visibility), else the first one drawn, else `undefined`. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const elements = this.legendObjects.get(id);
        if (!elements?.length) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const read = (element: JXG.GeometryElement) => element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const drawn = elements.find(element => Boolean(read(element).evalVisProp("visible"))) ?? elements[0];
        const colorProperty = drawn.elType === "point" ? "fillcolor" : "strokecolor";
        return {color: String(read(drawn).evalVisProp(colorProperty)), visible: Boolean(read(drawn).evalVisProp("visible"))};
    }

    // ---- Numeric input -------------------------------------------------------------------------------------------------

    editRadius(key: CircleKey, value: number): boolean {
        const snapped = snapRadiusInput(value, "radius");
        if (!snapped.ok) return false;
        this.setCircle(key, {...this.state[key], r: snapped.value.value});
        return true;
    }

    /** Writes a typed place (a circle's centre or a point) through the grid snapping; the list has already range-checked the integers. */
    private editPlace(key: CircleKey | PointKey, x: number, y: number): void {
        const sx = snapCoordinateInput(x, "x");
        const sy = snapCoordinateInput(y, "y");
        if (!sx.ok || !sy.ok) return;
        if (key === "p" || key === "a" || key === "b") this.setPoint(key, sx.value.value, sy.value.value);
        else this.setCircle(key, {...this.state[key], x: sx.value.value, y: sy.value.value});
    }

    /** Writes a typed ratio through the model's single snapping path; a non-finite value is refused. */
    editRatio(value: number): boolean {
        const snapped = snapRatioInput(value);
        if (!snapped.ok) return false;
        this.setState({k: snapped.value.value});
        return true;
    }

    /** The points shown together as the rows of one list; the grid and the limit are those of the board. */
    private pointRows(title: string, rows: readonly {key: CircleKey | PointKey; name: string}[]): JSX.Element {
        return <PointListInput key={rows.map(row => row.key).join("")} title={title}
                               points={rows.map(row => [this.state[row.key].x, this.state[row.key].y] as const)}
                               pointLabel={index => rows[index].name} min={-COORD_LIMIT} max={COORD_LIMIT} step={COORDINATE_STEP} bigStep={COORDINATE_BIG_STEP} grid={1} decimals={0}
                               onCommit={(index, [x, y]) => { this.editPlace(rows[index].key, x, y); }}/>;
    }

    /** A circle: its centre as a point row, its radius as a slider directly below. */
    private circleInputs(key: CircleKey, number: string): JSX.Element[] {
        return [
            this.pointRows(t("circle_construction_centre_group"), [{key, name: `O${"₁₂₃"[Number(number) - 1]}`}]),
            <PuckOwned key={`${key}r`} param={RADIUS_KEYS[key]}>
                <Slider customText={t("circle_construction_radius", {value0: number})} value={this.state[key].r} min={RADIUS_MIN} max={RADIUS_MAX}
                        step={RADIUS_STEP} bigStep={RADIUS_BIG_STEP} grid={RADIUS_STEP} decimals={2} onChange={value => this.editRadius(key, value)}/>
            </PuckOwned>,
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
                commands.push(...this.circleInputs("c1", "1"), this.pointRows(t("circle_construction_point_group"), [{key: "p", name: "P"}]));
                break;
            case "radical":
                commands.push(...this.circleInputs("c1", "1"), ...this.circleInputs("c2", "2"), ...this.circleInputs("c3", "3"), this.pointRows(t("circle_construction_point_group"), [{key: "p", name: "P"}]));
                break;
            case "apollonius":
                commands.push(
                    this.pointRows(t("circle_construction_points_group"), [{key: "a", name: "A"}, {key: "b", name: "B"}, {key: "p", name: "P"}]),
                    <PuckOwned key="ratio" param="ratio">
                        <Slider customText={t("circle_construction_ratio_label")} value={state.k} min={RATIO_MIN} max={RATIO_MAX} step={RATIO_STEP}
                                bigStep={RATIO_BIG_STEP} grid={RATIO_STEP} decimals={1} onChange={value => this.editRatio(value)}/>
                    </PuckOwned>,
                );
                break;
            case "common":
                commands.push(...this.circleInputs("c1", "1"), ...this.circleInputs("c2", "2"));
                break;
        }
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group" data-declared-panel="">
                <ReadoutHeading>{t("circle_construction_readout_title")}</ReadoutHeading>
                <p data-circle-status="">{this.statusText()}</p>
                <ReadoutList label={t("circle_construction_readout_title")}
                             rows={this.readoutRows(this.legendEntries()).map(row => ({id: row.id, label: renderMessage(row.name!), value: valueText(row.value)}))}/>
                <p className="form-text">{t("circle_construction_approx_note")}</p>
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
