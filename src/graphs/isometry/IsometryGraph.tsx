import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {BooleanField} from "../../inputs/BooleanField";
import {CheckboxGroup} from "../../inputs/CheckboxGroup";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {Line} from "../../compgeo/circle";
import {Rational, RationalPoint} from "../../compgeo/rational";
import type {GridPoint} from "../../compgeo/grid";
import {
    CLASSIFY_EXAMPLES, CLASSIFY_EXAMPLE_IDS, COORD_LIMIT, DEFAULT_ISOMETRY_STATE, deriveIsometry, DILATION_TURNS, FRIEZE_MOTIF_TENTHS, type DilationTurn,
    type FriezeFeatures, type IsometryDerived, type IsometryMode, type IsometryState, ISOMETRY_MODES, K_MAX, K_MIN, matchingClassifyExample, type MirrorSpec,
    type MotionDerived, type MotionLength, PERIOD_MAX, PERIOD_MIN, ROSETTE_N_MAX, ROSETTE_N_MIN, snapCoordinateInput, snapPeriodInput, snapRatioInput,
    snapRosetteNInput, VIEW_HALF, INITIAL_VIEW_HALF, type FixedPoints, type FriezePolygon, parseIsometryState, serializeIsometryState,
} from "../../isometry/isometryModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {isometryPresetCollection} from "./isometryPresetCollection";
import type {IsometryClass} from "../../isometry/isometry2";
import type {RosetteImage} from "../../isometry/rosette";

/** The scene state is the stored isometry state (ADR 0047 sections 1 to 3); everything else is derived from it. */
export interface IsometryGraphState extends BaseGraphState, IsometryState {}

/** Keyboard steps: the arrow keys move a coordinate, the order and the period by 1 and the ratio by 1/4; the Page keys take the big steps. */
export const COORDINATE_STEP = 1;
export const COORDINATE_BIG_STEP = 5;
export const RATIO_STEP = 0.25;
export const RATIO_BIG_STEP = 1;
export const SMALL_INTEGER_STEP = 1;
export const SMALL_INTEGER_BIG_STEP = 2;
/** Pointer tolerance in screen pixels around a handle; JSXGraph adds `HIT_SLACK` and tests both sides, so a touch zone is over 44 px across. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
export const HIT_SLACK = 2;

const MIRROR_HANDLES = [["m1p", "m1q"], ["m2p", "m2q"], ["m3p", "m3q"]] as const;
type MirrorHandleId = typeof MIRROR_HANDLES[number][number];
export type HandleId = MirrorHandleId | "centre" | "k" | "point";
const MIRROR_OF: Readonly<Record<MirrorHandleId, {index: 0 | 1 | 2; end: "p" | "q"}>> = {
    m1p: {index: 0, end: "p"}, m1q: {index: 0, end: "q"}, m2p: {index: 1, end: "p"}, m2q: {index: 1, end: "q"},
    m3p: {index: 2, end: "p"}, m3q: {index: 2, end: "q"},
};
const isMirrorHandle = (id: HandleId): id is MirrorHandleId => id in MIRROR_OF;

/** The handles a mode shows, in creation order. */
export function handlesFor(mode: IsometryMode, motionLength: MotionLength): readonly HandleId[] {
    const count = mode === "mirrors" ? 2 : mode === "classify" ? motionLength : 0;
    if (mode === "similarity") return ["centre", "k"];
    if (mode === "rosette") return ["point"];
    return MIRROR_HANDLES.slice(0, count).flat();
}

/** The number of mirrors a motion may have (the `MotionLength` type). */
const MOTION_LENGTH_MIN = 1;
const MOTION_LENGTH_MAX = 3;
const dec = (value: number): string => formatNumber(value, currentLanguage(), 4);
const dec2 = (value: number): string => formatNumber(value, currentLanguage(), 2);
const signed = (n: bigint): string => (n < 0n ? `−${-n}` : `${n}`);
/** An exact rational as text: an integer plainly, otherwise `p/q ≈ decimal`. */
function rat(value: Rational): string {
    if (value.den === 1n) return signed(value.num);
    return `${signed(value.num)}/${value.den} ≈ ${dec(value.toNumber())}`;
}
const pointText = (x: string, y: string): string => t("isometry_graph_point_format", {value0: x, value1: y});
const ratPoint = (p: RationalPoint): string => pointText(rat(p.x), rat(p.y));
const xyPoint = (x: number, y: number): string => pointText(dec(x), dec(y));
const degrees = (radians: number): string => `${dec2((radians * 180) / Math.PI)}°`;
/** Counts the graphs built, so the ids of two instances on one page do not collide. */
let instances = 0;

/** A line as text, for example `13 x = 25` or `6 x + 12 y = 66`. */
function lineText(line: Line): string {
    let text = "";
    for (const [coefficient, name] of [[line.a.toNumber(), "x"], [line.b.toNumber(), "y"]] as const) {
        if (coefficient === 0) continue;
        const size = Math.abs(coefficient);
        const body = `${size === 1 ? "" : `${dec(size)} `}${name}`;
        text += text === "" ? `${coefficient < 0 ? "−" : ""}${body}` : ` ${coefficient < 0 ? "−" : "+"} ${body}`;
    }
    return `${text} = ${dec(line.c.toNumber())}`;
}

type Poly = {readonly x: readonly number[]; readonly y: readonly number[]};
const EMPTY_POLY: Poly = {x: [], y: []};

/** A polygon as closed curve data. */
function closedPoly(points: readonly {x: number; y: number}[]): Poly {
    if (points.length === 0) return EMPTY_POLY;
    return {x: [...points.map(p => p.x), points[0].x], y: [...points.map(p => p.y), points[0].y]};
}
const exactPoly = (points: readonly RationalPoint[]): Poly => closedPoly(points.map(p => ({x: p.x.toNumber(), y: p.y.toNumber()})));

/** Several closed polygons as ONE curve: each ring closed, NaN between rings (JSXGraph breaks the curve at NaN). */
export function mergedPoly(polygons: readonly FriezePolygon[]): Poly {
    const x: number[] = [];
    const y: number[] = [];
    for (const polygon of polygons) {
        if (x.length) { x.push(Number.NaN); y.push(Number.NaN); }
        x.push(...polygon.xs, polygon.xs[0]);
        y.push(...polygon.ys, polygon.ys[0]);
    }
    return {x, y};
}

/** The n mirror lines of a dihedral rosette through the origin as ONE curve with NaN breaks. */
export function rosetteMirrorPoly(n: number): Poly {
    const x: number[] = [];
    const y: number[] = [];
    for (let j = 0; j < n; j++) {
        const angle = (Math.PI * j) / n;
        if (x.length) { x.push(Number.NaN); y.push(Number.NaN); }
        x.push(-2 * VIEW_HALF * Math.cos(angle), 2 * VIEW_HALF * Math.cos(angle));
        y.push(-2 * VIEW_HALF * Math.sin(angle), 2 * VIEW_HALF * Math.sin(angle));
    }
    return {x, y};
}

/** The line `a x + b y = c` as two finite anchor points (the foot of the origin and a normal-turned step away). */
function anchorsOf(line: Line | null): {first: readonly [number, number]; second: readonly [number, number]} {
    if (line === null) return {first: [0, 0], second: [1, 0]};
    const a = line.a.toNumber();
    const b = line.b.toNumber();
    const c = line.c.toNumber();
    const n = a * a + b * b;
    if (!(n > 0)) return {first: [0, 0], second: [1, 0]};
    const x = (a * c) / n;
    const y = (b * c) / n;
    return {first: [x, y], second: [x - b, y + a]};
}

function toMotionLength(value: number): MotionLength | undefined {
    if (!Number.isFinite(value)) return undefined;
    const rounded = Math.min(3, Math.max(1, Math.round(value)));
    return rounded === 1 ? 1 : rounded === 2 ? 2 : 3;
}

const FEATURE_KEYS: Readonly<Record<keyof FriezeFeatures, "isometry_graph_feature_vertical" | "isometry_graph_feature_horizontal" | "isometry_graph_feature_half_turn" | "isometry_graph_feature_glide">> = {
    vertical: "isometry_graph_feature_vertical",
    horizontal: "isometry_graph_feature_horizontal",
    halfTurn: "isometry_graph_feature_half_turn",
    glide: "isometry_graph_feature_glide",
};
const FEATURE_NAMES = ["vertical", "horizontal", "halfTurn", "glide"] as const;

/**
 * The isometry lessons L1 to L5 (docs/specs/isometries-lessons.md): two mirrors, classifying a motion, dilation and similarity, rosettes and
 * frieze patterns. Every number drawn or read comes from the exact kernel through `deriveIsometry`; a handle is snapped to the grid.
 *
 * Ownership: every board object is created in `buildScene` and recorded in `objects`; the drag listeners are recorded in `listeners`.
 * `disposeScene` removes the listeners and then the objects; it runs on a mode change, on a scene dispose and, through a session cleanup,
 * on unmount. A line is drawn through two owned points: a handle pair for a mirror, hidden points for a computed axis.
 * The board is rebuilt only when the mode (or, in the classify mode, the number of mirrors) changes; other edits move handles and redraw.
 */
export class IsometryGraph extends BaseGraph<IsometryGraphState, IsometryState> {
    private readonly instanceNumber = ++instances;
    private readonly helpId = `isometry-input-help-${this.instanceNumber}`;
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];
    private readonly handleMap = new Map<HandleId, JXG.Point>();
    private viewCache?: {state: Readonly<IsometryGraphState>; derived: IsometryDerived};
    private rosetteCache?: {derived: IsometryDerived; split: ReturnType<IsometryGraph["rosetteImages"]>};
    /** What the board was last drawn for; a sync that finds the same key redraws nothing but the handle positions. */
    private builtKey: string | undefined;
    private readonly status = new SettledReadout();

    override getInitialState(): IsometryGraphState {
        return {initialized: false, ...DEFAULT_ISOMETRY_STATE};
    }

    protected override lessonDefaultState(): IsometryGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): IsometryState {
        return serializeIsometryState(DEFAULT_ISOMETRY_STATE);
    }

    override presetCollection(): PresetCollection<IsometryState> {
        return isometryPresetCollection();
    }

    override exportPreset(): Preset<IsometryState> {
        const preset = super.exportPreset();
        const {
            mode: _mode, mirrors: _mirrors, motionLength: _length, dilationCentre: _centre, dilationK: _k, dilationTurn: _turn, rosetteN: _n,
            rosetteMirrors: _rm, rosettePoint: _point, friezeFeatures: _features, friezePeriod: _period, ...graphState
        } = preset.graphState as IsometryGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): IsometryState {
        return serializeIsometryState(this.state);
    }

    override importPresetData(data: IsometryState): void {
        this.setState(serializeIsometryState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): IsometryGraphState {
        const parsed = parseIsometryState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    /** The board opens on [-10, 10]^2 so the default figure fills it; the model counts points to `VIEW_HALF` as in view, and the user can zoom out. */
    protected override initialView(): [number, number, number, number] {
        return [-INITIAL_VIEW_HALF, INITIAL_VIEW_HALF, INITIAL_VIEW_HALF, -INITIAL_VIEW_HALF];
    }

    // ---- Derived numbers ---------------------------------------------------------------------------------------------

    /** Everything drawn or read, recomputed when the state object changes (a cache keyed by its identity, not a mirror of the state). */
    view(): IsometryDerived {
        const state = this.state;
        if (this.viewCache?.state === state) return this.viewCache.derived;
        const derived = deriveIsometry(state);
        this.viewCache = {state, derived};
        return derived;
    }

    /** The rosette images split into direct and reflected ones, once per derived view. */
    private rosetteImages(): {direct: readonly RosetteImage[]; reflected: readonly RosetteImage[]; all: readonly RosetteImage[]} {
        const d = this.view();
        if (this.rosetteCache?.derived === d) return this.rosetteCache.split;
        const all = d.mode === "rosette" ? d.images : [];
        const split = {direct: all.filter(image => !image.reflected), reflected: all.filter(image => image.reflected), all};
        this.rosetteCache = {derived: d, split};
        return split;
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and its handles. */
    ownedObjectCount(): number { return this.objects.length; }
    ownedListenerCount(): number { return this.listeners.length; }
    handles(): Map<HandleId, JXG.Point> { return this.handleMap; }

    // ---- Board -------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("isometry_graph_board_label"));
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
            session.registerCleanup(onLanguageChange(() => {
                if (this.hasBoard && session.isAlive) this.board.update();
                this.status.replace(this.statusText());
            }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(_previous: Readonly<IsometryGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    private sceneKey(): string {
        const s = this.state;
        return `${s.mode}:${s.mode === "classify" ? s.motionLength : 0}`;
    }

    /** Rebuilds when the mode (or the classify length) changed, moves the handles to the state, redraws and reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.builtKey !== this.sceneKey()) this.buildScene();
        this.placeHandles();
        this.board.update();
        this.status.report(this.statusText());
    }

    private handleTarget(id: HandleId): readonly [number, number] {
        const s = this.state;
        if (isMirrorHandle(id)) {
            const {index, end} = MIRROR_OF[id];
            const p = s.mirrors[index][end];
            return [p.x, p.y];
        }
        switch (id) {
            case "centre": return [s.dilationCentre.x, s.dilationCentre.y];
            case "k": return [s.dilationCentre.x + s.dilationK, s.dilationCentre.y];
            case "point": return [s.rosettePoint.x, s.rosettePoint.y];
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

    private motion(): MotionDerived | undefined {
        const d = this.view();
        return d.mode === "mirrors" || d.mode === "classify" ? d.motion : undefined;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const state = this.state;
        const mode = state.mode;
        this.builtKey = this.sceneKey();
        type Visible = boolean | (() => boolean);
        type Coordinate = number | (() => number);
        type PointFace = NonNullable<JXG.PointAttributes["face"]>;

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
        /** Captions shrink on a narrow board (few pixels per unit, read when the board is built) so they stay apart. */
        const captionFont = () => (board.unitX < 20 ? 12 : 15);
        const caption = (text: string | (() => string), x: Coordinate, y: Coordinate, color: string, visible: Visible = true) =>
            this.own(board.create("text", [x, y, text], {
                strokeColor: color, fontSize: captionFont(), fixed: true, highlight: false, withLabel: false, visible,
            }));
        /** A curve whose data come from `data()`; NaN entries break it. */
        const curveOf = (data: () => Poly, color: string, width: number, dash: number, visible: Visible = true) => {
            const curve = this.own(board.create("curve", [[], []], {
                highlight: false, fixed: true, withLabel: false, strokeColor: color, strokeWidth: width, dash, visible,
            })) as unknown as {updateDataArray: () => void; dataX: number[]; dataY: number[]};
            curve.updateDataArray = () => {
                const {x, y} = data();
                curve.dataX = [...x];
                curve.dataY = [...y];
            };
            return curve;
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
        const label = (name: () => string, id: HandleId, color: string, visible: Visible = true, lift: () => number = () => 0, shift: () => number = () => 0.4) =>
            caption(name, () => this.handleTarget(id)[0] + shift(), () => this.handleTarget(id)[1] + 0.4 + lift(), color, visible);
        /** A vertical gap of at least one caption line, in units: 0.9 on a wide board, more where a unit is few pixels (narrow boards). */
        const lineGap = (units: number) => Math.max(0.9 * units, (captionFont() * 1.2 * units) / board.unitY);
        const numberAt = (read: () => number | undefined) => () => {
            const value = read();
            return value !== undefined && Number.isFinite(value) ? value : 0;
        };
        const mirrorColors = [GraphPalette.referenceCurve, GraphPalette.comparisonCurve, GraphPalette.constructionLevels[1]] as const;
        const text = (key: "isometry_graph_cap_motif" | "isometry_graph_cap_centre" | "isometry_graph_cap_axis" | "isometry_graph_cap_k" | "isometry_graph_cap_point"
            | "isometry_graph_cap_vector") => () => t(key);
        const imageText = (n: number) => () => t("isometry_graph_cap_image", {value0: String(n)});

        /** The motif and the images of a motion; the polygons first so the handles lie above them. */
        const motionScene = (count: number) => {
            const ok = () => this.motion()?.status === "ok";
            const poly = (read: () => readonly RationalPoint[] | undefined) => () => {
                const points = read();
                return points ? exactPoly(points) : EMPTY_POLY;
            };
            const stepImage = (index: number) => () => {
                const m = this.motion();
                return m?.status === "ok" ? m.steps[index]?.image : undefined;
            };
            curveOf(poly(() => {
                const m = this.motion();
                return m?.status === "ok" ? m.motif : undefined;
            }), GraphPalette.label, 2, 0, ok);
            const colors = [GraphPalette.referenceCurve, GraphPalette.comparisonCurve, GraphPalette.primaryCurve] as const;
            for (let i = 0; i < count; i++) {
                curveOf(poly(stepImage(i)), colors[i], i === count - 1 ? 3 : 2, i === count - 1 ? 0 : 2, ok);
                caption(imageText(i + 1), numberAt(() => stepImage(i)()?.[0].x.toNumber()), numberAt(() => (stepImage(i)()?.[0].y.toNumber() ?? 0) - lineGap(1)),
                    colors[i], ok);
            }
            caption(text("isometry_graph_cap_motif"), numberAt(() => {
                const m = this.motion();
                return m?.status === "ok" ? m.motif[0].x.toNumber() : undefined;
            }), numberAt(() => {
                const m = this.motion();
                return m?.status === "ok" ? m.motif[0].y.toNumber() - lineGap(1.6) : undefined;
            }), GraphPalette.label, ok);
            // The mirrors: lines through the owned handle points, hidden while the two points coincide.
            for (let i = 0; i < count; i++) {
                const p = handle(MIRROR_HANDLES[i][0], mirrorColors[i], "o");
                const q = handle(MIRROR_HANDLES[i][1], mirrorColors[i], "diamond");
                this.own(board.create("line", [p, q], {
                    strokeColor: mirrorColors[i], strokeWidth: 2, dash: i === 0 ? 0 : 2, fixed: true, highlight: false, withLabel: false,
                    straightFirst: true, straightLast: true, visible: () => this.state.mirrors[i].p.x !== this.state.mirrors[i].q.x
                        || this.state.mirrors[i].p.y !== this.state.mirrors[i].q.y,
                }));
                // Mirrors often share a handle position (the defaults both start at the origin): stack their captions left of the handle so they do not overlap each other, the centre caption or the image captions.
                label(() => t("isometry_graph_cap_mirror", {value0: String(i + 1)}), MIRROR_HANDLES[i][0], mirrorColors[i], true, () => lineGap(1) * i, () => -Math.max(3.4, (captionFont() * 4.3) / board.unitX));
            }
            // The composite's centre (rotation) or axis (reflection and glide).
            const classOf = (): IsometryClass | undefined => {
                const m = this.motion();
                return m?.status === "ok" ? m.cls : undefined;
            };
            const centreOf = (axis: "x" | "y") => numberAt(() => {
                const c = classOf();
                return c?.kind === "rotation" ? c.centre[axis].toNumber() : undefined;
            });
            const isRotation = () => classOf()?.kind === "rotation";
            marker(centreOf("x"), centreOf("y"), "cross", GraphPalette.constructionAccent, 6, isRotation);
            caption(text("isometry_graph_cap_centre"), () => centreOf("x")() + 0.4, () => centreOf("y")() + 0.4, GraphPalette.constructionAccent, isRotation);
            const axisLine = () => {
                const c = classOf();
                return c?.kind === "reflection" || c?.kind === "glide" ? c.axis : null;
            };
            const first = hidden(() => anchorsOf(axisLine()).first[0], () => anchorsOf(axisLine()).first[1]);
            const second = hidden(() => anchorsOf(axisLine()).second[0], () => anchorsOf(axisLine()).second[1]);
            this.own(board.create("line", [first, second], {
                strokeColor: GraphPalette.constructionAccent, strokeWidth: 1, dash: 3, fixed: true, highlight: false, withLabel: false,
                straightFirst: true, straightLast: true, visible: () => axisLine() !== null,
            }));
            caption(text("isometry_graph_cap_axis"), () => anchorsOf(axisLine()).first[0] + 0.4, () => anchorsOf(axisLine()).first[1] + 0.4,
                GraphPalette.constructionAccent, () => axisLine() !== null);
            // The glide's translation part, an arrow along the axis from the foot of the origin.
            const glideVector = (): readonly [number, number] | undefined => {
                const c = classOf();
                return c?.kind === "glide" ? [c.vector.x.toNumber(), c.vector.y.toNumber()] : undefined;
            };
            const isGlide = () => glideVector() !== undefined;
            const arrowFrom = hidden(() => anchorsOf(axisLine()).first[0], () => anchorsOf(axisLine()).first[1]);
            const arrowTo = hidden(() => anchorsOf(axisLine()).first[0] + (glideVector()?.[0] ?? 0),
                () => anchorsOf(axisLine()).first[1] + (glideVector()?.[1] ?? 0));
            this.own(board.create("arrow", [arrowFrom, arrowTo], {
                strokeColor: GraphPalette.primaryCurve, strokeWidth: 3, fixed: true, highlight: false, withLabel: false, visible: isGlide,
            }));
            caption(text("isometry_graph_cap_vector"), () => anchorsOf(axisLine()).first[0] + (glideVector()?.[0] ?? 0) / 2 - 0.4,
                () => anchorsOf(axisLine()).first[1] + (glideVector()?.[1] ?? 0) / 2 - 0.9, GraphPalette.primaryCurve, isGlide);
        };

        if (mode === "mirrors") {
            motionScene(2);
        } else if (mode === "classify") {
            motionScene(state.motionLength);
        } else if (mode === "similarity") {
            const sim = () => {
                const d = this.view();
                return d.mode === "similarity" ? d : undefined;
            };
            const corner = (index: number, axis: "x" | "y", which: "motif" | "image") => numberAt(() => sim()?.[which][index][axis].toNumber());
            curveOf(() => exactPoly(sim()?.motif ?? []), GraphPalette.label, 2, 0);
            curveOf(() => exactPoly(sim()?.image ?? []), GraphPalette.primaryCurve, 3, 0);
            // dashed rays from the centre through each vertex to its image
            const centre = handle("centre", GraphPalette.controlPoint, "o");
            for (let i = 0; i < 3; i++) {
                const from = hidden(corner(i, "x", "motif"), corner(i, "y", "motif"));
                const to = hidden(corner(i, "x", "image"), corner(i, "y", "image"));
                segment(from, to, GraphPalette.constructionLevels[1], 1, 3);
            }
            segment(centre, hidden(corner(0, "x", "image"), corner(0, "y", "image")), GraphPalette.constructionAccent, 1, 2);
            handle("k", GraphPalette.comparisonCurve, "diamond");
            label(text("isometry_graph_cap_centre"), "centre", GraphPalette.controlPoint);
            label(text("isometry_graph_cap_k"), "k", GraphPalette.comparisonCurve);
            caption(text("isometry_graph_cap_motif"), corner(0, "x", "motif"), () => corner(0, "y", "motif")() - 0.9, GraphPalette.label);
            caption(imageText(1), corner(0, "x", "image"), () => corner(0, "y", "image")() - 0.9, GraphPalette.primaryCurve);
        } else if (mode === "rosette") {
            const rosetteOf = () => this.rosetteImages().all;
            curveOf(() => (this.state.rosetteMirrors ? rosetteMirrorPoly(this.state.rosetteN) : EMPTY_POLY), GraphPalette.constructionLevels[1], 1, 3,
                () => this.state.rosetteMirrors);
            marker(0, 0, "cross", GraphPalette.constructionAccent, 6);
            caption(text("isometry_graph_cap_centre"), 0.4, 0.4, GraphPalette.constructionAccent);
            // Two pools of markers: circles for direct images, diamonds for reflected ones; an image beyond the pool end is hidden.
            for (const reflected of [false, true] as const) {
                for (let j = 0; j < ROSETTE_N_MAX; j++) {
                    const nth = () => (reflected ? this.rosetteImages().reflected : this.rosetteImages().direct)[j];
                    marker(numberAt(() => nth()?.x), numberAt(() => nth()?.y), reflected ? "diamond" : "circle",
                        reflected ? GraphPalette.comparisonCurve : GraphPalette.primaryCurve, 4, () => nth() !== undefined);
                }
            }
            for (let i = 0; i < 2 * ROSETTE_N_MAX; i++) {
                caption(imageText(i + 1), numberAt(() => rosetteOf()[i]?.x), () => numberAt(() => rosetteOf()[i]?.y)() + 0.5,
                    GraphPalette.label, () => rosetteOf()[i] !== undefined);
            }
            handle("point", GraphPalette.controlPoint, "o");
            label(text("isometry_graph_cap_point"), "point", GraphPalette.controlPoint);
        } else {
            const frieze = () => {
                const d = this.view();
                return d.mode === "frieze" ? d : undefined;
            };
            const period = () => this.state.friezePeriod;
            // The base line and a period bracket, then the pattern as three curves: the base copy, its translates and the other symmetry images.
            const left = hidden(-2 * VIEW_HALF, 0);
            const right = hidden(2 * VIEW_HALF, 0);
            segment(left, right, GraphPalette.constructionLevels[1], 1, 3);
            const bracketA = hidden(0, -0.8);
            const bracketB = hidden(() => period(), -0.8);
            segment(bracketA, bracketB, GraphPalette.constructionAccent, 2, 0);
            caption(() => t("isometry_graph_cap_period", {value0: String(period())}), () => period() / 2 - 1, -1.8, GraphPalette.constructionAccent);
            curveOf(() => mergedPoly((frieze()?.polygons ?? []).filter(p => p.element === 0 && p.period !== 0)), GraphPalette.referenceCurve, 2, 0);
            curveOf(() => mergedPoly((frieze()?.polygons ?? []).filter(p => p.element !== 0)), GraphPalette.comparisonCurve, 2, 0);
            curveOf(() => mergedPoly((frieze()?.polygons ?? []).filter(p => p.element === 0 && p.period === 0)), GraphPalette.primaryCurve, 3, 0);
            caption(text("isometry_graph_cap_motif"), FRIEZE_MOTIF_TENTHS[0][0] / 10, FRIEZE_MOTIF_TENTHS[0][1] / 10 - 1.2, GraphPalette.primaryCurve);
            caption(() => {
                const d = frieze();
                return d && d.status !== "reducesPeriod" ? t("isometry_graph_cap_frieze_type", {value0: d.type}) : "";
            }, () => period() / 2 - 1, 3.4, GraphPalette.label);
        }

        for (const [id, point] of this.handleMap) this.wireDrag(id, point);
    }

    /** Snaps a dragged handle to the grid (the ratio to quarters) and writes the field to the scene state. */
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
        const x = point.X();
        const y = point.Y();
        if (id === "k") {
            this.applyRatio(x - this.state.dilationCentre.x); // a drag may snap to the nearest side of 0
        } else {
            const sx = snapCoordinateInput(x);
            const sy = snapCoordinateInput(y);
            if (sx.ok && sy.ok) this.setHandle(id, sx.value.value, sy.value.value);
        }
        // The board updates right after this handler, so the handles must already lie on the grid the state was written for.
        this.placeHandles();
        this.status.report(this.statusText());
    }

    /** Writes a handle's grid point to the state, unless it is unchanged. */
    private setHandle(id: HandleId, x: number, y: number): void {
        if (isMirrorHandle(id)) {
            const {index, end} = MIRROR_OF[id];
            const m = this.state.mirrors[index];
            if (m[end].x === x && m[end].y === y) return;
            const next: MirrorSpec = end === "p" ? {p: {x, y}, q: m.q} : {p: m.p, q: {x, y}};
            const mirrors: [MirrorSpec, MirrorSpec, MirrorSpec] = [this.state.mirrors[0], this.state.mirrors[1], this.state.mirrors[2]];
            mirrors[index] = next;
            this.setState({mirrors});
        } else if (id === "centre") {
            const c = this.state.dilationCentre;
            if (c.x !== x || c.y !== y) this.setState({dilationCentre: {x, y}});
        } else if (id === "point") {
            const p = this.state.rosettePoint;
            if (p.x !== x || p.y !== y) this.setState({rosettePoint: {x, y}});
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
        this.handleMap.clear();
        this.builtKey = undefined;
    }

    // ---- Numeric input: one snapping path per field, a non-finite value is refused ------------------------------------

    editMirror(index: 0 | 1 | 2, end: "p" | "q", axis: "x" | "y", value: number): boolean {
        const snapped = snapCoordinateInput(value, axis);
        if (!snapped.ok) return false;
        const current = this.state.mirrors[index][end];
        this.setHandle(MIRROR_HANDLES[index][end === "p" ? 0 : 1], axis === "x" ? snapped.value.value : current.x, axis === "y" ? snapped.value.value : current.y);
        return true;
    }

    editCentre(axis: "x" | "y", value: number): boolean {
        const snapped = snapCoordinateInput(value, axis);
        if (!snapped.ok) return false;
        const c = this.state.dilationCentre;
        this.setHandle("centre", axis === "x" ? snapped.value.value : c.x, axis === "y" ? snapped.value.value : c.y);
        return true;
    }

    editPoint(axis: "x" | "y", value: number): boolean {
        const snapped = snapCoordinateInput(value, axis);
        if (!snapped.ok) return false;
        const p = this.state.rosettePoint;
        this.setHandle("point", axis === "x" ? snapped.value.value : p.x, axis === "y" ? snapped.value.value : p.y);
        return true;
    }

    /**
     * Writes a typed ratio. Zero is not a ratio, and the field hands over a value already rounded to the quarter grid, so a typed 0 or 0.1 arrives
     * as 0: it is refused (the field shows why) and k keeps its value instead of jumping to the other side of it. A non-finite value is refused.
     */
    editRatio(value: number): boolean {
        if (Number.isFinite(value) && Math.round(value * 4) === 0) return false;
        return this.applyRatio(value);
    }

    /** A keyboard step: stepping through zero lands on the other side of it (1/4 down to -1/4), the model's rule for a step. */
    stepRatio(value: number): boolean {
        return this.applyRatio(value);
    }

    private applyRatio(value: number): boolean {
        const snapped = snapRatioInput(value, this.state.dilationK);
        if (!snapped.ok) return false;
        if (snapped.value.value !== this.state.dilationK) this.setState({dilationK: snapped.value.value});
        return true;
    }

    editRosetteN(value: number): boolean {
        const snapped = snapRosetteNInput(value);
        if (!snapped.ok) return false;
        if (snapped.value.value !== this.state.rosetteN) this.setState({rosetteN: snapped.value.value});
        return true;
    }

    editPeriod(value: number): boolean {
        const snapped = snapPeriodInput(value);
        if (!snapped.ok) return false;
        if (snapped.value.value !== this.state.friezePeriod) this.setState({friezePeriod: snapped.value.value});
        return true;
    }

    editMotionLength(value: number): boolean {
        const length = toMotionLength(value);
        if (length === undefined) return false;
        if (length !== this.state.motionLength) this.setState({motionLength: length});
        return true;
    }

    private setFeature(name: keyof FriezeFeatures, checked: boolean): void {
        this.setState({friezeFeatures: {...this.state.friezeFeatures, [name]: checked}});
    }

    // ---- Lesson actions -----------------------------------------------------------------------------------------------

    /**
     * The `isometry` lesson actions `set-mode` (the mode select), `set-mirror-count` (the number-of-mirrors field), `set-mirrors` (the mirror coordinate
     * fields) and `set-dilation` (the centre, ratio and turn fields; only the fields that change are written). Lesson data is checked strictly and completely before the write (a content error throws; nothing is snapped, clamped or repaired, ADR 0047),
     * then one synchronous `setState` writes the store, so a later action of the same scene reads this one's result; the board follows in `onStateChange`.
     */
    applyIsometryAction(action: Extract<LessonAction, {kind: "isometry"}>): void {
        switch (action.operation) {
            case "set-mode": {
                const mode = ISOMETRY_MODES.find(candidate => candidate === action.mode);
                if (!mode) throw new Error(`isometry set-mode: mode must be one of ${ISOMETRY_MODES.join(", ")}.`);
                this.setState({mode});
                return;
            }
            case "set-mirror-count": {
                const count = action.count === 1 ? 1 : action.count === 2 ? 2 : action.count === 3 ? 3 : undefined;
                if (count === undefined) throw new Error("isometry set-mirror-count: count must be 1, 2 or 3.");
                this.setState({motionLength: count});
                return;
            }
            case "set-mirrors": {
                const entries = Object.entries(action.mirrors ?? {});
                if (entries.length === 0) throw new Error("isometry set-mirrors: name at least one of the mirrors 1, 2, 3.");
                const mirrors: [MirrorSpec, MirrorSpec, MirrorSpec] = [this.state.mirrors[0], this.state.mirrors[1], this.state.mirrors[2]];
                for (const [name, spec] of entries) {
                    const index = name === "1" ? 0 : name === "2" ? 1 : name === "3" ? 2 : undefined;
                    if (index === undefined) throw new Error(`isometry set-mirrors: ${name} is not a mirror (1, 2, 3).`);
                    const grid = (point: unknown): GridPoint => {
                        const candidate = typeof point === "object" && point !== null ? point as Record<string, unknown> : {};
                        const {x, y} = candidate;
                        const valid = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= COORD_LIMIT;
                        if (!valid(x) || !valid(y)) throw new Error(`isometry set-mirrors: mirror ${name} needs integer points in [-${COORD_LIMIT}, ${COORD_LIMIT}].`);
                        return {x: x === 0 ? 0 : x, y: y === 0 ? 0 : y};
                    };
                    const p = grid(spec?.p);
                    const q = grid(spec?.q);
                    if (p.x === q.x && p.y === q.y) throw new Error(`isometry set-mirrors: the points of mirror ${name} must differ.`);
                    mirrors[index] = {p, q};
                }
                this.setState({mirrors});
                return;
            }
            case "set-dilation": {
                const {centre, k, turn} = action;
                if (centre === undefined && k === undefined && turn === undefined) throw new Error("isometry set-dilation: name at least one of centre, k, turn.");
                const patch: {dilationCentre?: GridPoint; dilationK?: number; dilationTurn?: DilationTurn} = {};
                if (centre !== undefined) {
                    const candidate = typeof centre === "object" && centre !== null ? centre as unknown as Record<string, unknown> : {};
                    const {x, y} = candidate;
                    const valid = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= COORD_LIMIT;
                    if (!valid(x) || !valid(y)) throw new Error(`isometry set-dilation: the centre needs integer coordinates in [-${COORD_LIMIT}, ${COORD_LIMIT}].`);
                    const c = this.state.dilationCentre;
                    if (c.x !== x || c.y !== y) patch.dilationCentre = {x: x === 0 ? 0 : x, y: y === 0 ? 0 : y};
                }
                if (k !== undefined) {
                    const valid = typeof k === "number" && Number.isFinite(k) && Number.isInteger(k * 4) && Math.abs(k) >= K_MIN && Math.abs(k) <= K_MAX;
                    if (!valid) throw new Error(`isometry set-dilation: k must be a multiple of 1/4 with ${K_MIN} <= |k| <= ${K_MAX}.`);
                    if (k !== this.state.dilationK) patch.dilationK = k;
                }
                if (turn !== undefined) {
                    const known = DILATION_TURNS.find(candidate => candidate === turn);
                    if (!known) throw new Error(`isometry set-dilation: turn must be one of ${DILATION_TURNS.join(", ")}.`);
                    if (known !== this.state.dilationTurn) patch.dilationTurn = known;
                }
                if (Object.keys(patch).length > 0) this.setState(patch);
                return;
            }
            default: {
                const unsupported: never = action;
                throw new Error(`isometry: the isometry graph has no such operation ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("isometry", action => this.applyIsometryAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    private yesNo(value: boolean): string {
        return t(value ? "isometry_graph_yes" : "isometry_graph_no");
    }

    private none(): string {
        return t("isometry_graph_none");
    }

    private className(cls: IsometryClass): string {
        switch (cls.kind) {
            case "identity": return t("isometry_graph_class_identity");
            case "translation": return t("isometry_graph_class_translation");
            case "rotation": return t("isometry_graph_class_rotation");
            case "reflection": return t("isometry_graph_class_reflection");
            case "glide": return t("isometry_graph_class_glide");
            case "notIsometry": return t("isometry_graph_class_not_isometry");
        }
    }

    private fixedText(fixed: FixedPoints | "all"): string {
        switch (fixed) {
            case "none": return t("isometry_graph_fixed_none");
            case "one": return t("isometry_graph_fixed_one");
            case "line": return t("isometry_graph_fixed_line");
            case "plane":
            case "all": return t("isometry_graph_fixed_all");
        }
    }

    private orientationText(orientation: 1 | -1): string {
        return t(orientation === 1 ? "isometry_graph_orientation_kept" : "isometry_graph_orientation_reversed");
    }

    private offViewText(count: number): string {
        return count > 0 ? ` ${t("isometry_graph_status_off_view", {value0: String(count)})}` : "";
    }

    /** One sentence for the whole state; degenerate states say what they are. */
    statusText(): string {
        const d = this.view();
        switch (d.mode) {
            case "mirrors":
            case "classify": {
                const m = d.motion;
                if (m.status === "coincident") return t("isometry_graph_status_coincident", {value0: String(m.mirror)});
                const last = m.steps[m.steps.length - 1];
                return t("isometry_graph_status_motion", {value0: this.className(m.cls), value1: this.orientationText(last.orientation)})
                    + this.offViewText(m.offView);
            }
            case "similarity": {
                const base = t("isometry_graph_status_similarity", {
                    value0: ratPoint(RationalPoint.fromGrid(this.state.dilationCentre)), value1: dec(this.state.dilationK), value2: rat(d.sideRatio),
                    value3: rat(d.areaRatio),
                });
                const iso = d.isometry ? ` ${t("isometry_graph_status_similarity_isometry", {value0: this.className(d.cls)})}` : "";
                return base + iso + this.offViewText(d.offView);
            }
            case "rosette": {
                const p = this.state.rosettePoint;
                if (p.x === 0 && p.y === 0) return t("isometry_graph_status_rosette_centre") + this.offViewText(d.offView);
                if (d.distinct < d.order) {
                    return t("isometry_graph_status_rosette_mirror", {value0: String(d.distinct), value1: String(d.order)}) + this.offViewText(d.offView);
                }
                return t("isometry_graph_status_rosette", {value0: String(d.order), value1: String(d.distinct)}) + this.offViewText(d.offView);
            }
            case "frieze":
                if (d.status === "reducesPeriod") return t("isometry_graph_status_frieze_reduces");
                return t("isometry_graph_status_frieze", {value0: d.type, value1: String(d.copiesPerPeriod)});
        }
    }

    readoutRows(): ReadoutListRow[] {
        const d = this.view();
        const row = (id: string, label: string, value: string): ReadoutListRow => ({id, label, value});
        switch (d.mode) {
            case "mirrors":
            case "classify": {
                const m = d.motion;
                if (m.status === "coincident") return [row("composite", t("isometry_graph_readout_class"), this.none())];
                const cls = m.cls;
                const rows = [row("composite", t("isometry_graph_readout_class"), this.className(cls))];
                if (cls.kind === "rotation") {
                    rows.push(
                        row("centre", t("isometry_graph_readout_centre"), ratPoint(cls.centre)),
                        row("angle", t("isometry_graph_readout_angle"), degrees(cls.angle)),
                    );
                    if (d.mode === "mirrors") rows.push(row("half-angle", t("isometry_graph_readout_half_angle"), degrees(cls.angle / 2)));
                } else if (cls.kind === "translation") {
                    rows.push(row("vector", t("isometry_graph_readout_vector"), ratPoint(cls.vector)));
                } else if (cls.kind === "reflection" || cls.kind === "glide") {
                    rows.push(row("axis", t("isometry_graph_readout_axis"), lineText(cls.axis)));
                    if (cls.kind === "glide") rows.push(row("vector", t("isometry_graph_readout_vector"), ratPoint(cls.vector)));
                }
                const last = m.steps[m.steps.length - 1];
                rows.push(
                    row("fixed", t("isometry_graph_readout_fixed"), this.fixedText(m.fixed)),
                    row("orientation", t("isometry_graph_readout_orientation"), this.orientationText(last.orientation)),
                    row("first-image", t("isometry_graph_readout_first_image"), ratPoint(m.steps[0].image[0])),
                    row("last-image", t("isometry_graph_readout_last_image"), ratPoint(last.image[0])),
                );
                return rows;
            }
            case "similarity":
                return [
                    row("side-ratio", t("isometry_graph_readout_side_ratio"), rat(d.sideRatio)),
                    row("area-ratio", t("isometry_graph_readout_area_ratio"), rat(d.areaRatio)),
                    row("area", t("isometry_graph_readout_area"), t("isometry_graph_readout_area_value", {value0: rat(d.area), value1: rat(d.imageArea)})),
                    row("orientation", t("isometry_graph_readout_orientation"), this.orientationText(d.orientation)),
                    row("fixed", t("isometry_graph_readout_fixed_point"),
                        d.fixedPoint === "all" ? this.fixedText("all") : ratPoint(d.fixedPoint)),
                    row("isometry", t("isometry_graph_readout_isometry"), this.yesNo(d.isometry)),
                    row("image-1", t("isometry_graph_readout_image_vertex", {value0: "1"}), ratPoint(d.image[0])),
                ];
            case "rosette": {
                const n = this.state.rosetteN;
                const first = d.images[0];
                return [
                    row("group", t("isometry_graph_readout_group"), t(this.state.rosetteMirrors ? "isometry_graph_group_dihedral" : "isometry_graph_group_cyclic", {value0: String(n)})),
                    row("order", t("isometry_graph_readout_order"), String(d.order)),
                    row("distinct", t("isometry_graph_readout_distinct"), String(d.distinct)),
                    row("point", t("isometry_graph_readout_point"), ratPoint(RationalPoint.fromGrid(this.state.rosettePoint))),
                    row("image-1", t("isometry_graph_readout_image_computed", {value0: "1"}), first ? xyPoint(first.x, first.y) : this.none()),
                    row("image-2", t("isometry_graph_readout_image_computed", {value0: "2"}), d.images[1] ? xyPoint(d.images[1].x, d.images[1].y) : this.none()),
                ];
            }
            case "frieze": {
                if (d.status === "reducesPeriod") {
                    return [row("type", t("isometry_graph_readout_type"), this.none()), row("period", t("isometry_graph_readout_period"), String(this.state.friezePeriod))];
                }
                return [
                    row("type", t("isometry_graph_readout_type"), d.type),
                    row("copies", t("isometry_graph_readout_copies"), String(d.copiesPerPeriod)),
                    row("period", t("isometry_graph_readout_period"), String(this.state.friezePeriod)),
                    ...FEATURE_NAMES.map(name => row(`has-${name}`, t(FEATURE_KEYS[name]), this.yesNo(d.signature[name]))),
                ];
            }
        }
    }

    // ---- Controls ---------------------------------------------------------------------------------------------------------

    private modeName(mode: IsometryMode): string {
        switch (mode) {
            case "mirrors": return t("isometry_graph_mode_mirrors");
            case "classify": return t("isometry_graph_mode_classify");
            case "similarity": return t("isometry_graph_mode_similarity");
            case "rosette": return t("isometry_graph_mode_rosette");
            case "frieze": return t("isometry_graph_mode_frieze");
        }
    }

    private coordinateInput(key: string, label: string, value: number, onChange: (value: number) => boolean): JSX.Element {
        return <NumberInput key={key} label={label} value={value} step={COORDINATE_STEP} bigStep={COORDINATE_BIG_STEP} min={-COORD_LIMIT} max={COORD_LIMIT}
                            grid={1} decimals={0} describedBy={this.helpId} onChange={onChange}/>;
    }

    private mirrorInputs(index: 0 | 1 | 2): JSX.Element[] {
        const inputs: JSX.Element[] = [];
        for (const end of ["p", "q"] as const) {
            const point = this.state.mirrors[index][end];
            const name = String(index + 1);
            const endName = end === "p" ? "P" : "Q";
            inputs.push(
                this.coordinateInput(`m${index}${end}x`, t("isometry_graph_mirror_x", {value0: name, value1: endName}), point.x,
                    value => this.editMirror(index, end, "x", value)),
                this.coordinateInput(`m${index}${end}y`, t("isometry_graph_mirror_y", {value0: name, value1: endName}), point.y,
                    value => this.editMirror(index, end, "y", value)),
            );
        }
        return inputs;
    }

    private turnName(turn: DilationTurn): string {
        switch (turn) {
            case "r0": return t("isometry_graph_turn_r0");
            case "r90": return t("isometry_graph_turn_r90");
            case "r180": return t("isometry_graph_turn_r180");
            case "r270": return t("isometry_graph_turn_r270");
            case "pythagorean": return t("isometry_graph_turn_pythagorean");
            case "pythagoreanInverse": return t("isometry_graph_turn_pythagorean_inverse");
        }
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("isometry_graph_mode_label")} value={state.mode}
                          options={ISOMETRY_MODES.map(mode => ({value: mode, text: this.modeName(mode)}))}
                          help={t("isometry_graph_mode_help")}
                          onChange={value => {
                              const mode = ISOMETRY_MODES.find(candidate => candidate === value);
                              if (mode && mode !== this.state.mode) this.setState({mode});
                          }}/>,
        ];
        switch (state.mode) {
            case "mirrors":
                commands.push(...this.mirrorInputs(0), ...this.mirrorInputs(1));
                break;
            case "classify": {
                const example = matchingClassifyExample(state);
                commands.push(
                    <ChoiceSelect key="example" label={t("isometry_graph_example_label")} value={example ?? "own"}
                                  options={[{value: "own", text: t("isometry_graph_example_own")},
                                      ...CLASSIFY_EXAMPLE_IDS.map(id => ({value: id, text: t(`isometry_graph_example_${id}`)}))]}
                                  onChange={value => {
                                      const id = CLASSIFY_EXAMPLE_IDS.find(candidate => candidate === value);
                                      if (id) this.setState({...CLASSIFY_EXAMPLES[id]});
                                  }}/>,
                    <NumberInput key="length" label={t("isometry_graph_length_label")} value={state.motionLength} step={1} bigStep={1} min={MOTION_LENGTH_MIN} max={MOTION_LENGTH_MAX} grid={1}
                                 decimals={0} describedBy={this.helpId} onChange={value => this.editMotionLength(value)}
                                 help={t("isometry_graph_length_help", {value0: dec(MOTION_LENGTH_MIN), value1: dec(MOTION_LENGTH_MAX)})}/>,
                );
                for (let i = 0; i < state.motionLength; i++) commands.push(...this.mirrorInputs(i === 0 ? 0 : i === 1 ? 1 : 2));
                break;
            }
            case "similarity":
                commands.push(
                    this.coordinateInput("cx", t("isometry_graph_centre_x"), state.dilationCentre.x, value => this.editCentre("x", value)),
                    this.coordinateInput("cy", t("isometry_graph_centre_y"), state.dilationCentre.y, value => this.editCentre("y", value)),
                    <NumberInput key="k" label={t("isometry_graph_k_label")} value={state.dilationK} step={RATIO_STEP} bigStep={RATIO_BIG_STEP} min={-K_MAX}
                                 max={K_MAX} grid={RATIO_STEP} decimals={2} describedBy={this.helpId} onChange={value => this.editRatio(value)}
                                 onStepChange={value => this.stepRatio(value)}
                                 rejectedHint={t("isometry_graph_k_rejected", {value0: dec(K_MIN), value1: dec(K_MAX)})}/>,
                    <ChoiceSelect key="turn" label={t("isometry_graph_turn_label")} value={state.dilationTurn}
                                  options={DILATION_TURNS.map(turn => ({value: turn, text: this.turnName(turn)}))}
                                  help={t("isometry_graph_turn_help")}
                                  onChange={value => {
                                      const turn = DILATION_TURNS.find(candidate => candidate === value);
                                      if (turn) this.setState({dilationTurn: turn});
                                  }}/>,
                );
                break;
            case "rosette":
                commands.push(
                    <NumberInput key="n" label={t("isometry_graph_n_label")} value={state.rosetteN} step={SMALL_INTEGER_STEP} bigStep={SMALL_INTEGER_BIG_STEP}
                                 min={ROSETTE_N_MIN} max={ROSETTE_N_MAX} grid={1} decimals={0} describedBy={this.helpId} onChange={value => this.editRosetteN(value)}/>,
                    <BooleanField key="mirrors" variant="switch" label={t("isometry_graph_rosette_mirrors_label")} checked={state.rosetteMirrors}
                                  describedBy={this.helpId} onChange={checked => this.setState({rosetteMirrors: checked})}/>,
                    this.coordinateInput("px", t("isometry_graph_point_x"), state.rosettePoint.x, value => this.editPoint("x", value)),
                    this.coordinateInput("py", t("isometry_graph_point_y"), state.rosettePoint.y, value => this.editPoint("y", value)),
                );
                break;
            case "frieze":
                commands.push(<CheckboxGroup key="features" label={t("isometry_graph_features_group")} describedBy={this.helpId}
                                             options={FEATURE_NAMES.map(name => ({key: name, label: t(FEATURE_KEYS[name]), checked: state.friezeFeatures[name]}))}
                                             onChange={(key, checked) => {
                                                 const name = FEATURE_NAMES.find(candidate => candidate === key);
                                                 if (name) this.setFeature(name, checked);
                                             }}/>);
                commands.push(<NumberInput key="period" label={t("isometry_graph_period_label")} value={state.friezePeriod} step={SMALL_INTEGER_STEP}
                                           bigStep={SMALL_INTEGER_BIG_STEP} min={PERIOD_MIN} max={PERIOD_MAX} grid={1} decimals={0} describedBy={this.helpId}
                                           onChange={value => this.editPeriod(value)}/>);
                break;
        }
        commands.push(<p key="help" id={this.helpId} className="form-text">{t("isometry_graph_input_help", {
            value0: dec(-COORD_LIMIT), value1: dec(COORD_LIMIT), value2: dec(K_MIN), value3: dec(K_MAX), value4: dec(ROSETTE_N_MIN),
            value5: dec(ROSETTE_N_MAX), value6: dec(PERIOD_MIN), value7: dec(PERIOD_MAX),
        })}</p>);
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("isometry_graph_readout_title")}</ReadoutHeading>
                <p data-isometry-status="">{this.statusText()}</p>
                <ReadoutList label={t("isometry_graph_readout_title")} rows={this.readoutRows()}/>
                <p className="form-text">{t("isometry_graph_approx_note")}</p>
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
