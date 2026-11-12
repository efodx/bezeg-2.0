import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {onLanguageChange, t} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {CountSetter} from "../../inputs/CountSetter";
import {BooleanField} from "../../inputs/BooleanField";
import {ReadoutHeading, ReadoutList, ReadoutListRow, ReadoutScrollTable} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {GraphSession} from "../base/GraphSession";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {fitBoundingBox} from "../base/fitBoundingBox";
import {GraphPalette} from "../styles/GraphPalette";
import {binomial} from "../../combinatorics/binomial";
import {ENUMERATION_CAP} from "../../combinatorics/latticePaths";
import {pascalRow} from "../../combinatorics/pascal";
import {
    DEFAULT_LATTICE_STATE, deriveExpansion, deriveLattice, EXPANSION_C_RANGE, EXPANSION_N_RANGE, ExpansionDerived, gridCounts, LATTICE_VIEWS,
    LatticeDerived, LatticeState, LatticeView, parseLatticeState, ROUTES_PER_PAGE, routePoints, routeString, selectableRoutes,
    serializeLatticeState, snapInput, STRINGS_MAX_N, TARGET_RANGE, TRIANGLE_ROW_LIMIT, withTarget,
} from "../../combinatorics/combinatoricsModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {latticePathsPresetCollection} from "./combinatoricsPresetCollection";
import {
    addPolyline, binomialText, binomText, boxPoints, countText, emptyPoly, HANDLE_MOUSE_RADIUS, HANDLE_TOUCH_RADIUS, listText, Poly, pointText,
    routeLetters, SceneObjects, smallText, stepRightText, stepUpText, superscript,
} from "./combinatoricsText";

export {HANDLE_MOUSE_RADIUS, HANDLE_TOUCH_RADIUS, HIT_SLACK} from "./combinatoricsText";

/** The scene state: the stored lattice fields. */
export interface LatticePathGraphState extends BaseGraphState, LatticeState {}

/** The fixed view box: the grid is 0..20, the triangle and the bars sit inside it, and the captions are above and below. */
export const VIEW_BOX: [number, number, number, number] = [-1.5, 24.5, 21.5, -2.2];
/**
 * The box the paths view frames for the target (a, b): the grid with the start label below and the three captions above
 * (they sit at b + 1.4, b + 2.4 and b + 3.4); at least 9 wide so the captions fit beside a small grid.
 */
export const pathsBox = (a: number, b: number): [number, number, number, number] => [-1.5, b + 4.2, Math.max(a + 1.5, 9), -2.2];
/** The three caption lines above the grid sit this far above the target's row. */
const CAPTION_ABOVE = [3.4, 2.4, 1.4] as const;
/** The captions start right of the y axis, whose tick labels lie to its left. */
const CAPTION_X = 0.3;
/** Keyboard steps of the numeric fields (arrow keys and Page keys). */
export const STEP = 1;
export const TARGET_BIG_STEP = 5;
export const ROUTE_BIG_STEP = 10;
export const EXPANSION_BIG_STEP = 3;

/** Triangle layout: row r, place k. */
export const triangleX = (row: number, place: number): number => 10 + (place - row / 2) * 1.6;
export const triangleY = (row: number): number => 19.5 - 1.4 * row;
/** Bar layout of the expansion: bar j is the coefficient of x^(n - j). */
export const BAR_BASE = 10.5;
export const BAR_HEIGHT = 7;
export const barX = (index: number): number => 1.6 + 1.5 * index;
/** The most count labels on the grid: a + b <= 12 gives at most 7 * 7 points. */
export const CELL_POOL = 49;
const POOL = 13;

const TARGET_EXAMPLES: readonly (readonly [number, number])[] = [[2, 2], [5, 3], [4, 3], [6, 6], [10, 10], [20, 20]];
const EXPANSION_EXAMPLES: readonly (readonly [number, number])[] = [[4, 1], [5, 2]];

const exampleId = (first: number, second: number): string => `${first},${second}`;
const HELP_ID = "combinatorics-lattice-input-help";

interface Cell {
    readonly x: number;
    readonly y: number;
    readonly value: bigint;
}

interface TriangleView {
    readonly n: number;
    readonly k: number;
    readonly inView: boolean;
    readonly entry: bigint;
    readonly left: bigint | undefined;
    readonly right: bigint | undefined;
    readonly rowSum: bigint;
}

interface RouteData {
    readonly grid: Poly;
    readonly all: Poly;
    readonly right: Poly;
    readonly up: Poly;
}

/** Rows 0..12 of Pascal's triangle by the addition rule (the triangle labels): computed once, immutable, shared by all boards. */
const PASCAL_ROWS: readonly (readonly bigint[])[] = Object.freeze(Array.from({length: TRIANGLE_ROW_LIMIT + 1}, (_, r) => Object.freeze(pascalRow(r))));
export function triangleRows(): readonly (readonly bigint[])[] {
    return PASCAL_ROWS;
}

/** Everything the board draws is computed from the scene state by the `src/combinatorics` kernel; the target is snapped while it is dragged. */
export class LatticePathGraph extends BaseGraph<LatticePathGraphState, LatticeState> {
    private readonly scene = new SceneObjects();
    private handle?: JXG.Point;
    private builtView?: LatticeView;
    private framedKey = "";
    private dragging = false;
    private cache?: {state: LatticePathGraphState; lattice?: LatticeDerived; cells?: Cell[]; triangle?: TriangleView; expansion?: ExpansionDerived};
    private routeCache?: {key: string; data: RouteData};
    private readonly status = new SettledReadout();
    /** A clause for the status text, valid only for the state it was made for: a later state change makes it stale by itself. */
    private notice?: {readonly state: LatticePathGraphState; readonly text: () => string};

    override getInitialState(): LatticePathGraphState {
        return {initialized: false, ...DEFAULT_LATTICE_STATE};
    }

    protected override lessonDefaultState(): LatticePathGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): LatticeState {
        return serializeLatticeState(DEFAULT_LATTICE_STATE);
    }

    override presetCollection(): PresetCollection<LatticeState> {
        return latticePathsPresetCollection();
    }

    override exportPreset(): Preset<LatticeState> {
        const preset = super.exportPreset();
        const {view: _view, a: _a, b: _b, route: _route, showCounts: _showCounts, split: _split, n: _n, c: _c, ...graphState} = preset.graphState as LatticePathGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): LatticeState {
        return serializeLatticeState(this.state);
    }

    override importPresetData(data: LatticeState): void {
        this.setState(serializeLatticeState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): LatticePathGraphState {
        const parsed = parseLatticeState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return pathsBox(DEFAULT_LATTICE_STATE.a, DEFAULT_LATTICE_STATE.b);
    }

    /** The key of the frame the board shows: the grid size in the paths view, one fixed box in the other views. */
    private frameKey(): string {
        return this.state.view === "paths" ? `${this.state.a},${this.state.b}` : "fixed";
    }

    /**
     * Frames the board to the drawn grid (paths view) or to the fixed box (triangle and expansion). It refits only when the frame key
     * changed, never while the target is dragged: a drag that leaves the box is refitted when it ends (see `endDrag`).
     */
    private frameBoard(): void {
        const key = this.frameKey();
        if (key === this.framedKey) return;
        if (this.dragging) {
            this.framedKey = key;
            return;
        }
        this.framedKey = key;
        const {width, height} = JXG.getDimensions(this.board.container, document);
        const box = this.state.view === "paths" ? pathsBox(this.state.a, this.state.b) : VIEW_BOX;
        const fitted = fitBoundingBox([[box[0], box[1]], [box[2], box[3]]], parseFloat(String(width)), parseFloat(String(height)));
        if (fitted) this.board.setBoundingBox(fitted, true);
    }

    /** The drag ended: a target dragged out of the box (or its captions out of it) refits once; a target inside leaves the view alone. */
    private endDrag(): void {
        this.dragging = false;
        if (this.state.view !== "paths") return;
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const [boxLeft, boxTop, boxRight, boxBottom] = pathsBox(this.state.a, this.state.b);
        if (left <= boxLeft && top >= boxTop && right >= boxRight && bottom <= boxBottom) return;
        this.framedKey = "";
        this.frameBoard();
    }

    // ---- Derived numbers: caches keyed by the state object, so a new state recomputes and the same state never does ----------

    private slot(): NonNullable<LatticePathGraph["cache"]> {
        if (!this.cache || this.cache.state !== this.state) this.cache = {state: this.state};
        return this.cache;
    }

    lattice(): LatticeDerived {
        const slot = this.slot();
        return slot.lattice ??= deriveLattice(this.state);
    }

    /** The count labels of the grid: the cell-by-cell sums, only while the routes are enumerated and the switch is on. */
    cells(): readonly Cell[] {
        const slot = this.slot();
        if (!slot.cells) {
            const {a, b, showCounts} = this.state;
            const cells: Cell[] = [];
            if (showCounts && this.lattice().enumerable) {
                const grid = gridCounts(a, b);
                for (let x = 0; x <= a; x++) for (let y = 0; y <= b; y++) cells.push({x, y, value: grid[x][y]});
            }
            slot.cells = cells;
        }
        return slot.cells;
    }

    triangle(): TriangleView {
        const slot = this.slot();
        if (!slot.triangle) {
            const n = this.state.a + this.state.b;
            const k = this.state.a;
            const row = pascalRow(n);
            const parents = n > 0 ? pascalRow(n - 1) : [];
            slot.triangle = {
                n, k, inView: n <= TRIANGLE_ROW_LIMIT, entry: row[k], left: k >= 1 ? parents[k - 1] : undefined,
                right: k <= n - 1 ? parents[k] : undefined, rowSum: row.reduce((total, value) => total + value, 0n),
            };
        }
        return slot.triangle;
    }

    expansion(): ExpansionDerived {
        const slot = this.slot();
        return slot.expansion ??= deriveExpansion(this.state);
    }

    /** The drawn routes, as curve data keyed by the target and the routes enumerated for it. */
    private routeData(): RouteData {
        const {a, b} = this.state;
        const key = `${a}/${b}`;
        if (this.routeCache?.key === key) return this.routeCache.data;
        const grid = emptyPoly();
        for (let x = 0; x <= a; x++) addPolyline(grid, [[x, 0], [x, b]]);
        for (let y = 0; y <= b; y++) addPolyline(grid, [[0, y], [a, y]]);
        const all = emptyPoly();
        const right = emptyPoly();
        const up = emptyPoly();
        const lattice = this.lattice();
        for (const mask of lattice.masks) {
            const points = routePoints(mask, lattice.steps);
            addPolyline(all, points);
            addPolyline(mask & 1 ? right : up, points);
        }
        const data = {grid, all, right, up};
        this.routeCache = {key, data};
        return data;
    }

    private selectedRoute(): {points: readonly (readonly [number, number])[]; letters: string} | undefined {
        const lattice = this.lattice();
        const mask = lattice.masks[this.state.route];
        if (mask === undefined) return undefined;
        return {points: routePoints(mask, lattice.steps), letters: routeString(mask, lattice.steps)};
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and its handle. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    targetHandle(): JXG.Point | undefined { return this.handle; }
    drawnView(): LatticeView | undefined { return this.builtView; }
    hasRouteCache(): boolean { return this.routeCache !== undefined; }

    // ---- Board ------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("combinatorics_lattice_board_label"));
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
                this.status.replace(this.statusText());
                if (this.hasBoard && session.isAlive) this.board.update();
            }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(_previous: Readonly<LatticePathGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        // A replacement (checkpoint restore, Preset import) brings its own view; only a later change of the grid refits. Build a
        // changed view first: the build clears `framedKey`, so marking the view framed before it would refit over the stored view.
        if (this.hasBoard && this.graphSession?.isAlive && this.builtView !== this.state.view) this.buildScene();
        this.framedKey = this.frameKey();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Rebuilds the scene when the view changed, moves the handle to the state and redraws; reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.builtView !== this.state.view) this.buildScene();
        this.placeHandle();
        this.frameBoard();
        this.board.update();
        this.status.report(this.statusText());
    }

    private placeHandle(): void {
        const {a, b} = this.state;
        if (this.handle && (this.handle.X() !== a || this.handle.Y() !== b)) this.handle.setPosition(JXG.COORDS_BY_USER, [a, b]);
    }

    private buildScene(): void {
        this.disposeScene();
        this.builtView = this.state.view;
        // The view is framed by the sync that follows the build: a replacement may bring a stored view, which a frame here would overwrite.
        this.framedKey = "";
        this.dragging = false;
        switch (this.state.view) {
            case "paths": this.buildPaths(); break;
            case "triangle": this.buildTriangle(); break;
            case "expansion": this.buildExpansion(); break;
        }
    }

    private caption(text: string | (() => string), x: number | (() => number), y: number | (() => number), color: string,
                    visible: boolean | (() => boolean) = true, options: {anchorX?: "left" | "middle" | "right"; anchorY?: "top" | "middle" | "bottom"; fontSize?: number} = {}): JXG.Text {
        return this.scene.own(this.board.create("text", [x, y, text], {
            strokeColor: color, fontSize: options.fontSize ?? 15, anchorX: options.anchorX ?? "left", anchorY: options.anchorY ?? "middle", fixed: true,
            highlight: false, withLabel: false, visible,
        }));
    }

    private curve(data: () => Poly, color: string, width: number, dash: number, visible: boolean | (() => boolean) = true, opacity = 1): JXG.Curve {
        const curve = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: color, strokeWidth: width, dash, visible, strokeOpacity: opacity,
        }));
        curve.updateDataArray = () => {
            const {x, y} = data();
            curve.dataX = x;
            curve.dataY = y;
        };
        return curve;
    }

    private buildPaths(): void {
        const board = this.board;
        const split = () => this.state.split;
        const enumerable = () => this.lattice().enumerable;
        this.curve(() => this.routeData().grid, GraphPalette.tick, 1, 0);
        this.curve(() => this.routeData().all, GraphPalette.primaryCurve, 3, 0, () => !this.state.split, 0.22);
        this.curve(() => this.routeData().right, GraphPalette.primaryCurve, 3, 0, split, 0.3);
        this.curve(() => this.routeData().up, GraphPalette.comparisonCurve, 3, 2, split, 0.45);
        this.curve(() => {
            const route = this.selectedRoute();
            return route ? {x: route.points.map(p => p[0]), y: route.points.map(p => p[1])} : emptyPoly();
        }, GraphPalette.constructionAccent, 5, 0);
        // The count labels: a pool, each reading its cell of the current grid.
        for (let i = 0; i < CELL_POOL; i++) {
            this.caption(() => (this.cells()[i] ? countText(this.cells()[i].value) : ""), () => (this.cells()[i]?.x ?? 0) + 0.12,
                () => (this.cells()[i]?.y ?? 0) + 0.3, GraphPalette.label, () => i < this.cells().length, {anchorY: "bottom", fontSize: 13});
        }
        this.scene.own(board.create("point", [0, 0], {
            fixed: true, highlight: false, withLabel: false, name: "", face: "square", size: 4, fillColor: GraphPalette.label, strokeColor: GraphPalette.pointOutline,
        }));
        const handle = this.scene.own(board.create("point", [this.state.a, this.state.b], {
            name: "", withLabel: false, size: 7, face: "o", fillColor: GraphPalette.controlPoint, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
            precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
        }));
        this.handle = handle;
        this.wireDrag(handle);
        // Captions: the target and the start, the selected route, the split legend and the cap message.
        // The captions sit above the target's row, so a framed small grid keeps them near it.
        const above = (line: number) => () => this.state.b + CAPTION_ABOVE[line];
        this.caption(() => t("combinatorics_lattice_cap_target", {value0: pointText(this.state.a, this.state.b)}), CAPTION_X, above(0), GraphPalette.controlPoint);
        this.caption(() => t("combinatorics_lattice_cap_start", {value0: pointText(0, 0)}), 0.3, -0.9, GraphPalette.label);
        this.caption(() => t("combinatorics_lattice_cap_route", {value0: routeLetters(this.selectedRoute()?.letters ?? "")}), CAPTION_X, above(1),
            GraphPalette.constructionAccent, () => this.selectedRoute() !== undefined);
        this.caption(() => t("combinatorics_lattice_cap_split", {value0: stepRightText(), value1: stepUpText()}), CAPTION_X, above(2), GraphPalette.label,
            () => split() && enumerable());
        this.caption(() => this.capMessage(), CAPTION_X, above(2), GraphPalette.warningText, () => !enumerable(), {fontSize: 14});
    }

    private capMessage(): string {
        return t("combinatorics_lattice_over_cap", {value0: smallText(ENUMERATION_CAP), value1: smallText(this.state.a + this.state.b)});
    }

    private buildTriangle(): void {
        const rows = triangleRows();
        for (let r = 0; r <= TRIANGLE_ROW_LIMIT; r++) {
            for (let k = 0; k <= r; k++) {
                this.caption(() => countText(rows[r][k]), triangleX(r, k), triangleY(r), GraphPalette.label, true, {anchorX: "middle", anchorY: "middle"});
            }
        }
        const view = () => this.triangle();
        this.curve(() => {
            const v = view();
            if (!v.inView) return emptyPoly();
            const poly = emptyPoly();
            addPolyline(poly, boxPoints(triangleX(v.n, v.k), triangleY(v.n), 0.75, 0.6));
            return poly;
        }, GraphPalette.constructionAccent, 3, 0);
        this.curve(() => {
            const v = view();
            const poly = emptyPoly();
            if (!v.inView) return poly;
            if (v.left !== undefined) addPolyline(poly, boxPoints(triangleX(v.n - 1, v.k - 1), triangleY(v.n - 1), 0.75, 0.6));
            if (v.right !== undefined) addPolyline(poly, boxPoints(triangleX(v.n - 1, v.k), triangleY(v.n - 1), 0.75, 0.6));
            return poly;
        }, GraphPalette.comparisonCurve, 2, 2);
        this.caption(() => t("combinatorics_lattice_cap_triangle"), -1.2, 23.4, GraphPalette.label);
        this.caption(() => t("combinatorics_lattice_cap_triangle_off", {value0: smallText(view().n)}), -1.2, 22.4, GraphPalette.warningText, () => !view().inView);
    }

    private buildExpansion(): void {
        this.curve(() => {
            const poly = emptyPoly();
            addPolyline(poly, [[0.4, BAR_BASE], [20.8, BAR_BASE]]);
            return poly;
        }, GraphPalette.axis, 1, 0);
        this.curve(() => this.barData(), GraphPalette.primaryCurve, 14, 0);
        for (let j = 0; j < POOL; j++) {
            this.caption(() => (j <= this.state.n ? countText(this.expansion().coefficients[j]) : ""), barX(j), () => this.barLabelY(j), GraphPalette.label,
                () => j <= this.state.n, {anchorX: "middle", fontSize: 13});
            this.caption(() => `x${superscript(this.state.n - j)}`, barX(j), 1.2, GraphPalette.label, () => j <= this.state.n, {anchorX: "middle"});
        }
        this.caption(() => t("combinatorics_lattice_cap_expansion"), -1.2, 23.4, GraphPalette.label);
        this.caption(() => binomialText(this.state.n, this.state.c), -1.2, 22.4, GraphPalette.primaryCurve);
    }

    /** Bar heights are coefficients over the largest absolute coefficient: drawing only, the labels carry the exact digits. */
    private barHeights(): number[] {
        const coefficients = this.expansion().coefficients;
        let largest = 1n;
        for (const value of coefficients) if ((value < 0n ? -value : value) > largest) largest = value < 0n ? -value : value;
        return coefficients.map(value => (Number(value) / Number(largest)) * BAR_HEIGHT);
    }

    private barData(): Poly {
        const poly = emptyPoly();
        this.barHeights().forEach((height, j) => addPolyline(poly, [[barX(j), BAR_BASE], [barX(j), BAR_BASE + height]]));
        return poly;
    }

    /** The label sits beyond the end of its bar (above a positive bar, below a negative one) and alternates two heights. */
    private barLabelY(index: number): number {
        const height = this.barHeights()[index] ?? 0;
        const stagger = (index % 2) * 0.9;
        return height >= 0 ? BAR_BASE + height + 0.6 + stagger : BAR_BASE + height - 0.6 - stagger;
    }

    // ---- Dragging: one snapping path for the target ---------------------------------------------------------------------

    private wireDrag(point: JXG.Point): void {
        const onDrag = () => { this.dragging = true; this.dragTo(point); };
        const onUp = () => { if (this.dragging) this.endDrag(); };
        const board = this.board;
        const onOver = () => { board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { board.containerObj.style.cursor = "default"; };
        point.on("drag", onDrag);
        point.on("up", onUp);
        point.on("over", onOver);
        point.on("out", onOut);
        this.scene.listen(() => { point.off("drag", onDrag); point.off("up", onUp); point.off("over", onOver); point.off("out", onOut); });
    }

    /** Drag only: the handle snaps to the nearest whole point inside the range (typed values are refused instead, see `typed`). */
    private dragTo(point: JXG.Point): void {
        const a = snapInput(point.X(), TARGET_RANGE, "a");
        const b = snapInput(point.Y(), TARGET_RANGE, "b");
        if (!a.ok || !b.ok) {
            this.placeHandle();
            return;
        }
        this.setTarget(a.value.value, b.value.value);
        point.setPosition(JXG.COORDS_BY_USER, [a.value.value, b.value.value]);
    }

    /** A new target; a chosen later route restarts at the first one, which the status text says. */
    private setTarget(a: number, b: number): void {
        const before = this.state;
        const next = withTarget(before, a, b);
        if (next === before) return;
        this.setState({a: next.a, b: next.b, route: next.route});
        if (before.route !== 0) this.notice = {state: this.state, text: () => t("combinatorics_lattice_notice_reset")};
    }

    /**
     * Lesson actions (`combinatorics`, lattice part): `set-target` is the fields a and b (the route restarts at the first one, as for a moved target) and
     * `set-lattice-display` the content select (paths or triangle) with the switch of the count labels. The whole new state goes through the model's parser
     * before the first write, so an off-range or non-integer value is a lesson-content error and nothing is snapped. `setState` writes the store
     * synchronously, so a later action of the same scene reads this one's result; the board follows in `onStateChange`.
     */
    applyCombinatoricsAction(action: Extract<LessonAction, {kind: "combinatorics"}>): void {
        switch (action.operation) {
            case "set-target": {
                const parsed = parseLatticeState({...serializeLatticeState(this.state), a: action.a, b: action.b, route: 0});
                if (!parsed.ok) throw new Error(`combinatorics set-target: ${parsed.error.message}`);
                this.setState({a: parsed.value.a, b: parsed.value.b, route: 0});
                return;
            }
            case "set-lattice-display": {
                if (action.view !== "paths" && action.view !== "triangle") throw new Error("combinatorics set-lattice-display: view must be paths or triangle.");
                const parsed = parseLatticeState({...serializeLatticeState(this.state), view: action.view, showCounts: action.showCounts});
                if (!parsed.ok) throw new Error(`combinatorics set-lattice-display: ${parsed.error.message}`);
                this.setState({view: parsed.value.view, showCounts: parsed.value.showCounts});
                return;
            }
            case "set-counting-mode":
                throw new Error("combinatorics: the lattice graph has no set-counting-mode; it belongs to the counting graph.");
            default: {
                const unsupported: never = action;
                throw new Error(`combinatorics: the lattice graph has no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("combinatorics", action => this.applyCombinatoricsAction(action));
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.handle = undefined;
        this.builtView = undefined;
        this.routeCache = undefined;
    }

    /** A typed whole number inside the range; anything else (non-integer, outside the range, not finite) is refused, never clamped. */
    private typed(value: number, range: {min: number; max: number}, field: string): number | undefined {
        const snapped = snapInput(value, range, field);
        return snapped.ok && !snapped.value.adjusted ? snapped.value.value : undefined;
    }

    // ---- Editing from the panel: typed values are refused when invalid; only the drag snaps (it has no message to give) -------------

    private editTarget(field: "a" | "b", value: number): boolean {
        const typed = this.typed(value, TARGET_RANGE, field);
        if (typed === undefined) return false;
        if (field === "a") this.setTarget(typed, this.state.b);
        else this.setTarget(this.state.a, typed);
        this.requestRender();
        return true;
    }

    private editRoute(oneBased: number): boolean {
        const snapped = snapInput(oneBased - 1, {min: 0, max: selectableRoutes(this.state.a, this.state.b) - 1}, "route");
        if (!snapped.ok) return false;
        this.setState({route: snapped.value.value});
        this.requestRender();
        return true;
    }

    private goToPage(page: number): boolean {
        const snapped = snapInput(page, {min: 0, max: this.lattice().pages - 1}, "page");
        if (!snapped.ok) return false;
        this.setState({route: snapped.value.value * ROUTES_PER_PAGE});
        this.requestRender();
        return true;
    }

    private editExpansion(field: "n" | "c", value: number): boolean {
        const typed = this.typed(value, field === "n" ? EXPANSION_N_RANGE : EXPANSION_C_RANGE, field);
        if (typed === undefined) return false;
        if (field === "n") this.setState({n: typed});
        else this.setState({c: typed});
        this.requestRender();
        return true;
    }

    // ---- Text ---------------------------------------------------------------------------------------------------------

    private viewName(view: LatticeView): string {
        switch (view) {
            case "paths": return t("combinatorics_lattice_view_paths");
            case "triangle": return t("combinatorics_lattice_view_triangle");
            case "expansion": return t("combinatorics_lattice_view_expansion");
        }
    }

    private coefficientsText(): string {
        return listText(this.expansion().coefficients.map(countText));
    }

    statusText(): string {
        const base = this.baseStatusText();
        return this.notice && this.notice.state === this.state ? `${base} ${this.notice.text()}` : base;
    }

    private baseStatusText(): string {
        const {a, b, n, c} = this.state;
        switch (this.state.view) {
            case "paths": {
                const lattice = this.lattice();
                const text = t("combinatorics_lattice_status_paths", {value0: countText(lattice.count), value1: pointText(a, b)});
                return lattice.enumerable ? text : `${text} ${this.capMessage()}`;
            }
            case "triangle": {
                const v = this.triangle();
                const row = smallText(v.n);
                const place = smallText(v.k);
                if (!v.inView) {
                    return t("combinatorics_lattice_status_triangle_off", {value0: row, value1: smallText(TRIANGLE_ROW_LIMIT), value2: countText(v.entry)});
                }
                if (v.left === undefined || v.right === undefined) {
                    return t("combinatorics_lattice_status_triangle_edge", {value0: row, value1: place, value2: countText(v.entry)});
                }
                return t("combinatorics_lattice_status_triangle", {
                    value0: row, value1: place, value2: countText(v.entry), value3: countText(v.left), value4: countText(v.right),
                });
            }
            case "expansion":
                return t("combinatorics_lattice_status_expansion", {
                    value0: binomialText(n, c), value1: this.coefficientsText(), value2: countText(this.expansion().sum),
                });
        }
    }

    private readoutRows(): ReadoutListRow[] {
        const {a, b, n, c} = this.state;
        switch (this.state.view) {
            case "paths": {
                const lattice = this.lattice();
                const rows: ReadoutListRow[] = [
                    {id: "target", label: t("combinatorics_lattice_readout_target"), value: pointText(a, b)},
                    {id: "count", label: t("combinatorics_lattice_readout_count"), value: countText(lattice.count)},
                    {id: "formula", label: t("combinatorics_lattice_readout_formula"), value: `${binomText(a + b, a)} = ${countText(binomial(a + b, a))}`},
                ];
                const route = this.selectedRoute();
                if (route) {
                    rows.push({id: "route", label: t("combinatorics_lattice_readout_route"), value: t("combinatorics_lattice_readout_route_value", {
                        value0: routeLetters(route.letters), value1: smallText(this.state.route + 1), value2: countText(lattice.count)})});
                }
                rows.push(
                    {id: "last-right", label: t("combinatorics_lattice_readout_last", {value0: stepRightText()}), value: countText(lattice.lastR)},
                    {id: "last-up", label: t("combinatorics_lattice_readout_last", {value0: stepUpText()}), value: countText(lattice.lastU)},
                    {id: "last-sum", label: t("combinatorics_lattice_readout_last_sum"),
                     value: `${countText(lattice.lastR)} + ${countText(lattice.lastU)} = ${countText(lattice.lastR + lattice.lastU)}`},
                );
                return rows;
            }
            case "triangle": {
                const v = this.triangle();
                const none = "–";
                const rows: ReadoutListRow[] = [
                    {id: "entry", label: t("combinatorics_lattice_readout_entry"), value: `${binomText(v.n, v.k)} = ${countText(v.entry)}`},
                    {id: "position", label: t("combinatorics_lattice_readout_position"),
                     value: t("combinatorics_lattice_readout_position_value", {value0: smallText(v.n), value1: smallText(v.k)})},
                    {id: "parent-left", label: t("combinatorics_lattice_readout_parent_left"), value: v.left === undefined ? none : countText(v.left)},
                    {id: "parent-right", label: t("combinatorics_lattice_readout_parent_right"), value: v.right === undefined ? none : countText(v.right)},
                    {id: "parents-sum", label: t("combinatorics_lattice_readout_parents_sum"),
                     value: v.left === undefined && v.right === undefined ? none : countText((v.left ?? 0n) + (v.right ?? 0n))},
                    {id: "row-sum", label: t("combinatorics_lattice_readout_row_sum"), value: `${countText(v.rowSum)} = 2${superscript(v.n)}`},
                ];
                return rows;
            }
            case "expansion": {
                const expansion = this.expansion();
                const base = 1 + c;
                const baseText = base < 0 ? `(${smallText(base)})` : smallText(base);
                return [
                    {id: "binomial", label: t("combinatorics_lattice_readout_expansion"), value: binomialText(n, c)},
                    {id: "coefficients", label: t("combinatorics_lattice_readout_coefficients"), value: this.coefficientsText()},
                    {id: "coefficient-sum", label: t("combinatorics_lattice_readout_coefficient_sum"),
                     value: `${baseText}${superscript(n)} = ${countText(expansion.sum)}`},
                ];
            }
        }
    }

    // ---- Controls -----------------------------------------------------------------------------------------------------

    private exampleValue(): string {
        const {a, b, n, c, view} = this.state;
        const examples = view === "expansion" ? EXPANSION_EXAMPLES : TARGET_EXAMPLES;
        const [first, second] = view === "expansion" ? [n, c] : [a, b];
        return examples.some(example => example[0] === first && example[1] === second) ? exampleId(first, second) : "custom";
    }

    private chooseExample(value: string): void {
        const examples = this.state.view === "expansion" ? EXPANSION_EXAMPLES : TARGET_EXAMPLES;
        const example = examples.find(candidate => exampleId(candidate[0], candidate[1]) === value);
        if (!example) return;
        if (this.state.view === "expansion") this.setState({n: example[0], c: example[1]});
        else this.setTarget(example[0], example[1]);
        this.requestRender();
    }

    private targetInputs(): JSX.Element[] {
        const {a, b} = this.state;
        return [
            <NumberInput key="a" label={t("combinatorics_lattice_a_label")} value={a} step={STEP} bigStep={TARGET_BIG_STEP} min={TARGET_RANGE.min}
                         max={TARGET_RANGE.max} grid={1} decimals={0} describedBy={HELP_ID} onChange={value => this.editTarget("a", value)}/>,
            <NumberInput key="b" label={t("combinatorics_lattice_b_label")} value={b} step={STEP} bigStep={TARGET_BIG_STEP} min={TARGET_RANGE.min}
                         max={TARGET_RANGE.max} grid={1} decimals={0} describedBy={HELP_ID} onChange={value => this.editTarget("b", value)}/>,
        ];
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const view = state.view;
        const examples = view === "expansion" ? EXPANSION_EXAMPLES : TARGET_EXAMPLES;
        const exampleOptions = examples.map(([first, second]) => ({
            value: exampleId(first, second), text: view === "expansion" ? binomialText(first, second) : pointText(first, second),
        }));
        const current = this.exampleValue();
        const commands: JSX.Element[] = [
            <ChoiceSelect key="view" label={t("combinatorics_view_label")} value={view}
                          options={LATTICE_VIEWS.map(name => ({value: name, text: this.viewName(name)}))}
                          onChange={value => {
                              const next = LATTICE_VIEWS.find(candidate => candidate === value);
                              if (next && next !== this.state.view) this.setState({view: next});
                          }}/>,
            <ChoiceSelect key="example" label={t("combinatorics_example_label")} value={current}
                          options={current === "custom" ? [{value: "custom", text: t("combinatorics_example_custom")}, ...exampleOptions] : exampleOptions}
                          onChange={value => this.chooseExample(value)}/>,
        ];
        if (view === "expansion") {
            commands.push(
                <NumberInput key="n" label={t("combinatorics_lattice_n_label")} value={state.n} step={STEP} bigStep={EXPANSION_BIG_STEP} min={EXPANSION_N_RANGE.min}
                             max={EXPANSION_N_RANGE.max} grid={1} decimals={0} describedBy={HELP_ID} onChange={value => this.editExpansion("n", value)}/>,
                <NumberInput key="c" label={t("combinatorics_lattice_c_label")} value={state.c} step={STEP} bigStep={EXPANSION_BIG_STEP} min={EXPANSION_C_RANGE.min}
                             max={EXPANSION_C_RANGE.max} grid={1} decimals={0} describedBy={HELP_ID} onChange={value => this.editExpansion("c", value)}/>,
            );
        } else {
            commands.push(...this.targetInputs());
        }
        if (view === "paths") {
            const lattice = this.lattice();
            if (lattice.enumerable) {
                commands.push(
                    <NumberInput key="route" label={t("combinatorics_lattice_route_label")} value={state.route + 1} step={STEP} bigStep={ROUTE_BIG_STEP}
                                 min={1} max={Number(lattice.count)} grid={1} decimals={0} describedBy={HELP_ID} onChange={value => this.editRoute(value)}/>,
                    <CountSetter key="page" label={t("combinatorics_lattice_page_label")} n={lattice.page + 1} min={1} max={lattice.pages} bigStep={5}
                                 help={t("combinatorics_lattice_routes_list", {value0: smallText(lattice.page + 1), value1: smallText(lattice.pages)})}
                                 onPlus={() => this.goToPage(lattice.page + 1)} onMinus={() => this.goToPage(lattice.page - 1)}
                                 onSet={value => this.goToPage(value - 1)}/>,
                );
            }
            const reason = lattice.enumerable ? undefined : this.capMessage();
            commands.push(
                <BooleanField key="counts" variant="switch" label={t("combinatorics_lattice_show_counts")} checked={state.showCounts}
                              describedBy={HELP_ID} unavailableReason={reason} onChange={checked => this.setState({showCounts: checked})}/>,
                <BooleanField key="split" variant="switch" label={t("combinatorics_lattice_split")} checked={state.split}
                              describedBy={HELP_ID} unavailableReason={reason} onChange={checked => this.setState({split: checked})}/>,
            );
        }
        commands.push(<p key="help" id={HELP_ID} className="form-text">{t("combinatorics_lattice_input_help", {
            value0: smallText(TARGET_RANGE.min), value1: smallText(TARGET_RANGE.max), value2: smallText(EXPANSION_N_RANGE.min),
            value3: smallText(EXPANSION_N_RANGE.max), value4: smallText(EXPANSION_C_RANGE.min), value5: smallText(EXPANSION_C_RANGE.max),
        })}</p>);
        return commands;
    }

    private routeList(): React.ReactNode {
        const lattice = this.lattice();
        if (this.state.view !== "paths" || !lattice.enumerable) return null;
        const first = lattice.page * ROUTES_PER_PAGE;
        const masks = lattice.masks.slice(first, first + ROUTES_PER_PAGE);
        return <div className="inspector-group">
            <ReadoutHeading>{t("combinatorics_lattice_routes_list", {value0: smallText(lattice.page + 1), value1: smallText(lattice.pages)})}</ReadoutHeading>
            <ol className="readout-list" data-combinatorics-routes="" start={first + 1}>
                {masks.map((mask, i) => {
                    const selected = first + i === this.state.route;
                    return <li key={mask} aria-current={selected ? "true" : undefined} data-route-index={first + i}>
                        {selected ? <strong>{routeLetters(routeString(mask, lattice.steps))}</strong> : routeLetters(routeString(mask, lattice.steps))}
                    </li>;
                })}
            </ol>
        </div>;
    }

    private stringsTable(): React.ReactNode {
        if (this.state.view !== "expansion") return null;
        const groups = this.expansion().groups;
        if (!groups) return <p className="form-text" data-combinatorics-strings-off="">{t("combinatorics_lattice_strings_off", {value0: smallText(STRINGS_MAX_N)})}</p>;
        return <ReadoutScrollTable label={t("combinatorics_lattice_strings_label")}>
            <table className="table table-sm" data-combinatorics-strings="">
                <caption>{t("combinatorics_lattice_strings_label")}</caption>
                <thead><tr>
                    <th scope="col">{t("combinatorics_lattice_strings_b")}</th>
                    <th scope="col">{t("combinatorics_lattice_strings_count")}</th>
                    <th scope="col">{t("combinatorics_lattice_strings_list")}</th>
                </tr></thead>
                <tbody>{groups.map((strings, j) => <tr key={j} data-strings-group={j}>
                    <th scope="row">{smallText(j)}</th>
                    <td>{smallText(strings.length)}</td>
                    <td>{strings.join(" ")}</td>
                </tr>)}</tbody>
            </table>
        </ReadoutScrollTable>;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("combinatorics_readout_title")}</ReadoutHeading>
                <p data-combinatorics-status="">{this.statusText()}</p>
                <ReadoutList label={t("combinatorics_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status}/>
            </div>
            {this.routeList()}
            {this.stringsTable()}
        </>;
    }
}
