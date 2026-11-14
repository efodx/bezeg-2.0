import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {CountSetter} from "../../inputs/CountSetter";
import Slider from "../../inputs/Slider";
import type {ReadoutListRow} from "../base/controls/ReadoutParts";
import {SettledReadout} from "../base/controls/LiveReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {SceneObjects} from "../recursion/SceneObjects";
import type {Rational, RationalPoint} from "../../compgeo/rational";
import type {LpConstraint} from "../../optimization/lp2";
import {
    BOUND_RANGE, COEFFICIENT_RANGE, DEFAULT_LP_STATE, OBJECTIVE_RANGE, ROW_COUNT_RANGE, SWEEP_RANGE, parseLpState, serializeLpState, type LpState,
} from "../../optimization/lpModel";
import {
    clipBox, evaluate, exactText, framePoints, integerText, isFraction, linePoly, linearText, pathPoly, regionPoly, rowLeft, snapInteger, solveState, typedInteger, viewBox,
    type Box, type LpSolution, type LpStatus,
} from "./lpScene";
import {emptyPoly, type Poly} from "./contourScene";
import {LpReadout} from "./LpPanels";
import {lpPresetCollection, type LpPresetData} from "./lpPresetCollection";
import {frameBelowLegend, legendBandPx, legendRowOffset} from "../legend/legendLines";
import {Memo} from "./Memo";
import {placeLpLabels, sampleLine, type LabelItem, type PxBox} from "../legend/boardLabelPlacement";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {Preset, StoredGraphState} from "../base/presets/Presets";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** The scene state: the stored fields of `LpState`, nothing derived. */
export interface LinearProgramGraphState extends BaseGraphState, LpState {}

/** Pointer tolerance in screen pixels around the objective handle (as the contour graph). */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
/** The most vertices a feasible region of at most five rows and the two axes can have (seven lines). */
const VERTEX_POOL = 7;
/** A row added by the count control: x + y <= 30 changes the region only when it is far from the others. */
export const NEW_ROW: LpConstraint = {a: 1, b: 1, c: BOUND_RANGE.max};

const samePair = (a: LpState["objective"], b: LpState["objective"]): boolean => a.p === b.p && a.q === b.q;
const sameRows = (a: readonly LpConstraint[], b: readonly LpConstraint[]): boolean =>
    a.length === b.length && a.every((k, index) => k.a === b[index].a && k.b === b[index].b && k.c === b[index].c);
/** Content comparison of the stored fields. */
export const sameContent = (a: LpState, b: LpState): boolean => sameRows(a.constraints, b.constraints) && samePair(a.objective, b.objective) && a.sweep === b.sweep;

const dec = (value: number, digits = 3): string => formatNumber(value, currentLanguage(), digits);
const point = (x: string, y: string): string => t("levelsets_graph_point_format", {value0: x, value1: y});

const REGION_KEYS = {
    infeasible: "levelsets_graph_lp_region_infeasible", point: "levelsets_graph_lp_region_point", segment: "levelsets_graph_lp_region_segment",
    polygon: "levelsets_graph_lp_region_polygon", unbounded: "levelsets_graph_lp_region_unbounded",
} as const;
const STATUS_KEYS: Record<LpStatus, "levelsets_graph_lp_status_infeasible" | "levelsets_graph_lp_status_unbounded" | "levelsets_graph_lp_status_flat"
    | "levelsets_graph_lp_status_unique" | "levelsets_graph_lp_status_segment" | "levelsets_graph_lp_status_ray"> = {
    infeasible: "levelsets_graph_lp_status_infeasible", unbounded: "levelsets_graph_lp_status_unbounded", flat: "levelsets_graph_lp_status_flat",
    unique: "levelsets_graph_lp_status_unique", segment: "levelsets_graph_lp_status_segment", ray: "levelsets_graph_lp_status_ray",
};

const viewKey = (box: readonly number[]): string => box.map(value => value.toFixed(6)).join(",");
/** The square of `viewBox` with a margin: the view of an empty region or a board without a size. */
const boardBox = (box: Box): [number, number, number, number] => {
    const margin = 0.04 * (box.xMax - box.xMin);
    return [box.xMin - margin, box.yMax + margin, box.xMax + margin, box.yMin - margin];
};

/** The board legend's measured width of a character (14 px font), the estimate of a label's width and height, and the backdrop that lets the text read over a line. */
const LEGEND_CHAR_PX = 6.2;
const LABEL_CHAR_PX = 6.6;
const LABEL_HEIGHT_PX = 18;
const LEGEND_BACKDROP = "background-color:rgba(255,253,246,0.88);padding:0 4px;margin-left:-4px;";

/** One row of the legend: what an element of the board is, with its drawing style said in words. */
export interface LegendRow {
    readonly id: string;
    readonly text: string;
    readonly color: string;
}

type Geometry = {readonly box: Box; readonly clip: Box; readonly region: Poly; readonly rows: readonly Poly[]};

/**
 * The linear-programming graph (level-sets spec LS5, ADR 0053 section 4): the feasible region of up to five integer constraints with
 * x >= 0 and y >= 0, its exact vertices, the objective line through the exact optimum, the line at the chosen k, the walk along the
 * vertices and a text status (unique optimum, edge or ray of optima, unbounded, infeasible). Every status and every vertex comes from
 * the `Rational` kernel `solveLinearProgram`; only the drawing clips in doubles. The stored state is `LpState`.
 *
 * Ownership: every board object is created by `buildScene` and recorded in `scene`; `disposeScene` removes them with their
 * listeners. Derived data is cached on the stored values it depends on (identity of the rows, the objective numbers) and holds no
 * language-resolved text.
 */
export class LinearProgramGraph extends BaseGraph<LinearProgramGraphState, LpPresetData> {
    private readonly scene = new SceneObjects();
    private objectiveHandle?: JXG.Point;
    private readonly solutionMemo = new Memo<LpSolution>();
    private readonly geometryMemo = new Memo<Geometry>();
    private drawnView = "";
    /** The one announcement region of the graph. */
    readonly status = new SettledReadout();
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    override getInitialState(): LinearProgramGraphState {
        return {initialized: false, ...serializeLpState(DEFAULT_LP_STATE)};
    }

    protected override lessonDefaultState(): LinearProgramGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    override presetCollection(): PresetCollection<LpPresetData> {
        return lpPresetCollection;
    }

    override defaultPreset(): LpPresetData {
        return [["LinearProgram", serializeLpState(DEFAULT_LP_STATE)]];
    }

    override exportPresetData(): LpPresetData {
        return [["LinearProgram", serializeLpState(this.state)]];
    }

    /**
     * A Preset keeps the whole state in `data`, so its `graphState` only marks it initialized: the collection refuses any other
     * field. Checkpoints still capture the full state (`savedGraphState`).
     */
    override exportPreset(): Preset<LpPresetData> {
        return {...super.exportPreset(), graphState: {initialized: true}};
    }

    /** A figure scene, Preset selection and Reset take the state from the data just imported, not from the stored `graphState`. */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined, data?: unknown): LinearProgramGraphState {
        return {...super.figurePresetGraphState(graphState, data), ...serializeLpState(this.state), initialized: true};
    }

    override importPresetData(data: LpPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "LinearProgram") return;
        const parsed = parseLpState(entry[1]);
        if (!parsed.ok) return;
        const imported = serializeLpState(parsed.value);
        // The host commits the state later and its sync would reframe: mark the imported data's view as drawn so the stored view stays.
        if (this.keepImportedView) this.drawnView = this.viewKeyOf(solveState(imported));
        this.setState(imported);
    }

    protected override initialView(): [number, number, number, number] {
        return boardBox(viewBox(solveState(DEFAULT_LP_STATE)));
    }

    /** Reset and a Preset without a stored view: the view of the default data, framed as the first load frames it (see `applyView`). */
    protected override showInitialView(): void {
        const solution = solveState(DEFAULT_LP_STATE);
        this.board.setBoundingBox(this.frameOf(solution, DEFAULT_LP_STATE.objective), true);
        this.drawnView = this.viewKeyOf(solution);
    }

    // ---- Host state (the readout re-renders from it) ---------------------------------------------------------------------

    readonly subscribeHost = (listener: () => void): (() => void) => {
        this.hostListeners.add(listener);
        return () => { this.hostListeners.delete(listener); };
    };
    readonly hostSnapshot = (): number => this.hostVersion;

    private notifyHost(): void {
        this.hostVersion++;
        this.hostListeners.forEach(listener => listener());
    }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    computationCounts(): Record<string, number> {
        return {solution: this.solutionMemo.computations, geometry: this.geometryMemo.computations};
    }
    handle(): JXG.Point | undefined { return this.objectiveHandle; }

    // ---- Derived data ----------------------------------------------------------------------------------------------------

    /** The exact solution, cached on the rows and the objective. */
    solution(): LpSolution {
        const {constraints, objective} = this.state;
        return this.solutionMemo.get([constraints, objective.p, objective.q], () => solveState({constraints, objective, sweep: this.state.sweep}));
    }

    private geometry(): Geometry {
        // Only the rows decide the region and the box, so dragging the objective does not redraw them.
        return this.geometryMemo.get([this.state.constraints], () => {
            const solution = this.solution();
            const box = viewBox(solution);
            const clip = clipBox(box);
            return {
                box, clip, region: regionPoly(solution, clip),
                rows: this.state.constraints.map(k => linePoly(k.a, k.b, k.c, clip)),
            };
        });
    }

    private flat(): boolean { return this.state.objective.p === 0 && this.state.objective.q === 0; }

    private sweepLine(): Poly {
        const {objective, sweep} = this.state;
        return this.flat() ? emptyPoly() : linePoly(objective.p, objective.q, sweep, this.geometry().clip);
    }

    private optimumLine(): Poly {
        const solution = this.solution();
        if (solution.value === null || solution.status === "flat") return emptyPoly();
        return linePoly(this.state.objective.p, this.state.objective.q, solution.value.toNumber(), this.geometry().clip);
    }

    private walkPoints(): readonly RationalPoint[] { return this.solution().result.walk; }

    /** The region is cut off by the window: it is unbounded, or a vertex lies beyond the window. */
    private clipped(): boolean { return this.solution().result.region === "unbounded"; }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("levelsets_graph_lp_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A new board (also the second mount of StrictMode) starts unframed, whatever an earlier board drew.
        this.drawnView = "";
        this.applyView();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => {
                this.status.cancel();
                this.hostListeners.clear();
            });
            session.registerCleanup(onLanguageChange(() => { this.boardUpdate(); this.status.replace(this.statusText()); }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        // A replacement (checkpoint restore, Preset import) brings its own view: build first, then mark the view as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.scene.objectCount() === 0) this.buildScene();
            this.drawnView = this.viewKeyOf(this.solution());
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) {
            this.notifyHost();
            return;
        }
        if (this.scene.objectCount() === 0) this.buildScene();
        this.applyView();
        this.placeHandle();
        this.board.update();
        this.status.report(this.statusText());
        this.notifyHost();
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the view of the imported data is only marked as drawn. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    /** Frames the board once per view key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyView(): void {
        const solution = this.solution();
        const key = this.viewKeyOf(solution);
        if (key === this.drawnView) return;
        this.drawnView = key;
        this.board.setBoundingBox(this.frameOf(solution, this.state.objective), true);
    }

    /**
     * What decides a reframe: the framed points (not the handle, so dragging the objective never moves the view) and the height of the
     * legend band, which follows the rows the state shows and the board width.
     */
    private viewKeyOf(solution: LpSolution): string {
        return `${viewKey(framePoints(solution, {p: 0, q: 0}).flat())}|${this.legendBand()}`;
    }

    /**
     * The pixels the legend takes from the top of the board: its own strip, above the framed data. It is the height of every caption
     * stacked, whatever rows the state shows, so a state change, a Preset import or Reset never moves a view that was kept.
     */
    private legendBand(): number {
        return legendBandPx(this.boardLegendTexts(true), this.board.canvasWidth);
    }

    /** The view with the feasible region, its vertices and the objective handle framed with margin below the legend band. */
    private frameOf(solution: LpSolution, handle: {readonly p: number; readonly q: number}): [number, number, number, number] {
        const {canvasWidth, canvasHeight} = this.board;
        return frameBelowLegend(framePoints(solution, handle), canvasWidth, canvasHeight, this.legendBand()) ?? boardBox(viewBox(solution));
    }

    /** Moves the objective handle to the stored (p, q) (idempotent). */
    private placeHandle(): void {
        const {p, q} = this.state.objective;
        const handle = this.objectiveHandle;
        if (handle && (handle.X() !== p || handle.Y() !== q)) handle.setPosition(JXG.COORDS_BY_USER, [p, q]);
    }

    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    private curve(data: () => Poly, attributes: Partial<JXG.CurveAttributes>): JXG.Curve {
        const element = this.scene.own(this.board.create("curve", [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes}));
        element.updateDataArray = () => {
            const {x, y} = data();
            element.dataX = x;
            element.dataY = y;
        };
        return element;
    }

    /**
     * The rows of the legend as the board writes them: the line styles that only need a word are merged two to a row, so the stack stays
     * short (a 420 px card keeps its plot). The panel list keeps every row in full (`legend`); `all` gives the rows of the fullest state.
     */
    boardLegend(all = false): LegendRow[] {
        const full = all ? undefined : this.legend();
        const has = (id: string): boolean => full === undefined || full.some(row => row.id === id);
        const part: Record<string, () => string> = {
            region: () => t("levelsets_graph_lp_capb_region"), rows: () => t("levelsets_graph_lp_capb_rows"),
            vertex: () => t("levelsets_graph_lp_capb_vertex"), optimum: () => t("levelsets_graph_lp_capb_optimum"),
            objective: () => t("levelsets_graph_lp_capb_objective"), sweep: () => t("levelsets_graph_lp_capb_sweep"),
            direction: () => t("levelsets_graph_lp_capb_direction"), walk: () => t("levelsets_graph_lp_capb_walk"),
        };
        const color: Record<string, string> = {
            region: GraphPalette.primaryCurve, rows: GraphPalette.additionalCurves[0], vertex: GraphPalette.label, optimum: GraphPalette.label,
            objective: GraphPalette.comparisonCurve, sweep: GraphPalette.constructionAccent, direction: GraphPalette.controlPoint, walk: GraphPalette.additionalCurves[3],
        };
        const merged = (id: string, parts: string[]): LegendRow[] => {
            const shown = parts.filter(has);
            return shown.length === 0 ? [] : [{id, text: shown.map(name => part[name]()).join(" · "), color: color[shown[0]]}];
        };
        const rows = [...merged("region", ["region", "rows"]), ...merged("vertex", ["vertex", "optimum"]), ...merged("objective", ["objective", "sweep"]),
            ...merged("direction", ["direction", "walk"])];
        if (full === undefined || full.some(row => row.id === "clip")) rows.push({id: "clip", text: t("levelsets_graph_lp_cap_clip"), color: GraphPalette.warningText});
        return rows;
    }

    private boardLegendTexts(all = false): string[] { return this.boardLegend(all).map(row => row.text); }

    /** The legend stack's screen box (px from the board's top left corner, y down). */
    legendBox(): PxBox | undefined {
        if (!this.hasBoard) return undefined;
        const texts = this.boardLegendTexts();
        const width = this.board.canvasWidth;
        if (texts.length === 0 || !(width > 0)) return undefined;
        const wide = Math.min(Math.max(...texts.map(text => text.length * LEGEND_CHAR_PX)), width - 20) + 20;
        return {x0: 0, y0: 0, x1: wide, y1: legendRowOffset(texts, texts.length, width)};
    }

    private layoutCache: {key: string; boxes: Record<string, PxBox>} = {key: "", boxes: {}};

    /**
     * The boxes (px, y down) of the vertex coordinates, the handle's caption and the constraint names, each clear of the markers, the
     * drawn lines, the axes' numbers, the legend and the other texts where the board has room. A constraint name sits on the visible part of its line.
     */
    labelBoxes(): Record<string, PxBox> {
        if (!this.hasBoard || !(this.board.canvasWidth > 0)) return {};
        const {ux, uy, left, top} = this.scaleOf();
        const width = this.board.canvasWidth, height = this.board.canvasHeight;
        const legend = this.legendBox();
        const {constraints, objective, sweep} = this.state;
        const key = [ux, uy, left, top, width, height, JSON.stringify(constraints), objective.p, objective.q, sweep, legend?.x1, legend?.y1, currentLanguage()].join("|");
        if (key === this.layoutCache.key) return this.layoutCache.boxes;
        const solution = this.solution();
        const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * ux, (top - y) * uy];
        const sized = (text: string): {w: number; h: number} => ({w: text.length * LABEL_CHAR_PX + 6, h: LABEL_HEIGHT_PX});
        const geometry = this.geometry();
        const lines: Poly[] = [...geometry.rows, this.sweepLine(), this.optimumLine(), pathPoly(this.walkPoints()), {x: [0, objective.p], y: [0, objective.q]}];
        const samples = lines.flatMap(line => sampleLine(line.x, line.y, toPx, width, height));
        const handleAt = toPx(objective.p, objective.q);
        const markers: Array<readonly [number, number, number]> = [
            ...solution.result.vertices.map((v): readonly [number, number, number] => [...toPx(v.x.toNumber(), v.y.toNumber()), 5]),
            ...solution.optimal.map((v): readonly [number, number, number] => [...toPx(v.x.toNumber(), v.y.toNumber()), 9]),
            [handleAt[0], handleAt[1], 8],
        ];
        const [axisX, axisY] = toPx(0, 0);
        const items: LabelItem[] = [{id: "handle", ax: handleAt[0], ay: handleAt[1], ...sized(this.handleCaption())}];
        solution.result.vertices.forEach((v, i) => {
            const [ax, ay] = toPx(v.x.toNumber(), v.y.toNumber());
            items.push({id: `v${i}`, ax, ay, ...sized(this.pointText(v))});
        });
        const floor = (legend?.y1 ?? 0) + 14;
        constraints.forEach((k, i) => {
            const row = geometry.rows[i];
            if (!row) return;
            const size = sized(this.rowLabel(i, k));
            const visible = sampleLine(row.x, row.y, toPx, width, height, 4, 400)
                .filter(([x, y]) => x >= 10 && x <= width - size.w - 20 && y >= floor && y <= height - 40);
            const anchors = visible.filter((_, index) => index % 8 === 0).reverse().slice(0, 14);
            const [anchor, ...alts] = anchors.length > 0 ? anchors : visible.slice(-1);
            if (anchor) items.push({id: `row${i}`, ax: anchor[0], ay: anchor[1], alts, ...size});
        });
        const strips: PxBox[] = [{x0: 0, y0: axisY, x1: width, y1: axisY + 22}, {x0: axisX - 40, y0: 0, x1: axisX, y1: height}];
        const boxes = placeLpLabels(items, {width, height, markers, samples, strips, blocks: legend ? [legend] : [], axisX, axisY});
        this.layoutCache = {key, boxes};
        return boxes;
    }

    private handleCaption(): string {
        const {p, q} = this.state.objective;
        return t("levelsets_graph_lp_label_direction", {value0: point(integerText(Math.round(p)), integerText(Math.round(q)))});
    }

    /** A text at its placed box (see `labelBoxes`): hidden while the board has no box for it. */
    private boxText(id: string, text: () => string, color: string, visible: () => boolean = () => true): void {
        const box = () => this.labelBoxes()[id];
        this.scene.own(this.board.create("text", [
            () => { const {left, ux} = this.scaleOf(); return left + (box()?.x0 ?? 0) / ux; },
            () => { const {top, uy} = this.scaleOf(); const b = box(); return top - (b ? (b.y0 + b.y1) / 2 : 0) / uy; },
            text,
        ], {strokeColor: color, fontSize: 14, anchorX: "left", anchorY: "middle", fixed: true, highlight: false, withLabel: false, visible: () => visible() && box() !== undefined}));
    }

    /** The axes: a tick number that the legend stack would cover is not written (the stack sits where the numbers are). */
    protected override defaultAxesAttributes() {
        const axis = this.styles.axis;
        const boardExists = (): boolean => this.hasBoard;
        const covered = (x0: number, y0: number, x1: number, y1: number): boolean => {
            const b = this.legendBox();
            return b !== undefined && x0 < b.x1 && x1 > b.x0 && y0 < b.y1 && y1 > b.y0;
        };
        const hiding = (labelOf: ((this: object, ...label: unknown[]) => string) | undefined, box: (x: number, y: number) => readonly [number, number, number, number]) =>
            function (this: object, ...label: unknown[]): string {
                const tick = label[0] as {usrCoords?: number[]} | undefined;
                if (tick?.usrCoords && boardExists() && covered(...box(tick.usrCoords[1], tick.usrCoords[2]))) return "";
                return labelOf ? labelOf.apply(this, label) : "";
            };
        const onX = (x: number): readonly [number, number, number, number] => {
            const {ux, uy, left, top} = this.scaleOf();
            const px = (x - left) * ux, py = top * uy;
            return [px - 16, py, px + 16, py + 24];
        };
        const onY = (_x: number, y: number): readonly [number, number, number, number] => {
            const {ux, uy, left, top} = this.scaleOf();
            const px = -left * ux, py = (top - y) * uy;
            return [px - 46, py - 12, px, py + 12];
        };
        const labelOfX = axis.defaultX.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        const labelOfY = axis.defaultY.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        return {
            x: {...axis.defaultX, ticks: {...axis.defaultX.ticks, generateLabelText: hiding(labelOfX, onX)}},
            y: {...axis.defaultY, ticks: {...axis.defaultY.ticks, generateLabelText: hiding(labelOfY, onY)}},
        };
    }

    /** The legend: one row for every element the readouts name, the drawing style in words. Used by the panel list. */
    legend(): LegendRow[] {
        const solution = this.solution();
        const rows: LegendRow[] = [];
        if (solution.status !== "infeasible") rows.push({id: "region", text: t("levelsets_graph_lp_cap_region"), color: GraphPalette.primaryCurve});
        rows.push({id: "rows", text: t("levelsets_graph_lp_cap_rows"), color: GraphPalette.additionalCurves[0]});
        if (solution.result.vertices.length > 0) rows.push({id: "vertex", text: t("levelsets_graph_lp_cap_vertex"), color: GraphPalette.label});
        if (solution.optimal.length > 0 && solution.status !== "flat") rows.push({id: "optimum", text: t("levelsets_graph_lp_cap_optimum"), color: GraphPalette.label});
        if (this.optimumLine().x.length > 0) rows.push({id: "objective", text: t("levelsets_graph_lp_cap_objective"), color: GraphPalette.comparisonCurve});
        if (!this.flat()) rows.push({id: "sweep", text: t("levelsets_graph_lp_cap_sweep"), color: GraphPalette.constructionAccent});
        rows.push({id: "direction", text: t("levelsets_graph_lp_cap_direction"), color: GraphPalette.controlPoint});
        if (this.walkPoints().length > 0) rows.push({id: "walk", text: t("levelsets_graph_lp_cap_walk"), color: GraphPalette.additionalCurves[3]});
        if (this.clipped()) rows.push({id: "clip", text: t("levelsets_graph_lp_cap_clip"), color: GraphPalette.warningText});
        return rows;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const state = () => this.state;

        // The region, then the constraint lines with their labels, the objective lines and the walk.
        this.curve(() => this.geometry().region, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3, fillColor: GraphPalette.primaryCurve, fillOpacity: 0.15});
        for (let i = 0; i < ROW_COUNT_RANGE.max; i++) {
            const row = () => this.geometry().rows[i] ?? emptyPoly();
            this.curve(row, {strokeColor: GraphPalette.additionalCurves[i % GraphPalette.additionalCurves.length], strokeWidth: 1.5, visible: () => i < state().constraints.length});
            this.boxText(`row${i}`, () => { const k = state().constraints[i]; return k ? this.rowLabel(i, k) : ""; }, GraphPalette.label,
                () => i < state().constraints.length);
        }
        this.curve(() => this.sweepLine(), {strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 2, visible: () => !this.flat()});
        this.curve(() => this.optimumLine(), {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 4, visible: () => this.optimumLine().x.length > 0});
        this.curve(() => pathPoly(this.walkPoints()), {strokeColor: GraphPalette.additionalCurves[3], strokeWidth: 2.5, dash: 1, visible: () => this.walkPoints().length > 0});

        // The exact vertices (circles, labelled with their exact coordinates) and the optimal ones (outlined squares).
        for (let i = 0; i < VERTEX_POOL; i++) {
            const at = (axis: "x" | "y") => () => this.solution().result.vertices[i]?.[axis].toNumber() ?? 0;
            this.scene.own(board.create("point", [at("x"), at("y")], {
                name: "", withLabel: false, fixed: true, highlight: false, size: 4, face: "o", strokeColor: GraphPalette.label, fillColor: GraphPalette.label,
                visible: () => i < this.solution().result.vertices.length,
            }));
            this.boxText(`v${i}`, () => { const v = this.solution().result.vertices[i]; return v ? this.pointText(v) : ""; },
                GraphPalette.label, () => i < this.solution().result.vertices.length);
        }
        for (let j = 0; j < 2; j++) {
            const at = (axis: "x" | "y") => () => this.solution().optimal[j]?.[axis].toNumber() ?? 0;
            this.scene.own(board.create("point", [at("x"), at("y")], {
                name: "", withLabel: false, fixed: true, highlight: false, size: 7, face: "[]", strokeColor: GraphPalette.label, fillColor: "none",
                visible: () => j < this.solution().optimal.length && this.solution().status !== "flat",
            }));
        }

        // The objective direction: an arrow from the origin to the draggable handle (p, q) (a drag snaps to whole numbers; typed values are refused instead).
        const origin = this.scene.own(board.create("point", [0, 0], {name: "", withLabel: false, fixed: true, highlight: false, visible: false, size: 1}));
        const {p, q} = this.state.objective;
        const handle: JXG.Point = this.scene.own(board.create("point", [p, q], {
            name: "", withLabel: false, size: 7, face: "o", fillColor: GraphPalette.controlPoint, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
            precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
        }));
        this.objectiveHandle = handle;
        this.wireDrag(handle, () => this.dragObjective(handle));
        this.scene.own(board.create("segment", [origin, handle], {
            fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.controlPoint, strokeWidth: 3, lastArrow: true, visible: () => !this.flat(),
        }));
        this.boxText("handle", () => this.handleCaption(), GraphPalette.controlPoint);

        // The legend: stacked from the top left. It names every element the readout names.
        const MAX_ROWS = 5;
        for (let index = 0; index < MAX_ROWS; index++) {
            this.scene.own(board.create("text", [
                () => { const {left, ux} = this.scaleOf(); return left + 10 / ux; },
                () => { const {top, uy} = this.scaleOf(); return top - legendRowOffset(this.boardLegendTexts(), index, board.canvasWidth) / uy; },
                () => this.boardLegend()[index]?.text ?? "",
            ], {strokeColor: GraphPalette.label, fontSize: 14, anchorX: "left", anchorY: "top", fixed: true, highlight: false,
                withLabel: false, visible: () => index < this.boardLegend().length, cssStyle: LEGEND_BACKDROP}));
        }
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.objectiveHandle = undefined;
    }

    // ---- Dragging: the handle snaps; typed values are refused instead ---------------------------------------------------------

    private wireDrag(handle: JXG.Point, onDrag: () => void): void {
        const board = this.board;
        const onOver = () => { board.containerObj.style.cursor = "pointer"; };
        const onOut = () => { board.containerObj.style.cursor = "default"; };
        handle.on("drag", onDrag);
        handle.on("over", onOver);
        handle.on("out", onOut);
        this.scene.listen(() => { handle.off("drag", onDrag); handle.off("over", onOver); handle.off("out", onOut); });
    }

    private dragObjective(handle: JXG.Point): void {
        const p = snapInteger(handle.X(), OBJECTIVE_RANGE);
        const q = snapInteger(handle.Y(), OBJECTIVE_RANGE);
        if (p === undefined || q === undefined) { this.placeHandle(); return; }
        if (p !== this.state.objective.p || q !== this.state.objective.q) this.edit({objective: {p, q}});
        handle.setPosition(JXG.COORDS_BY_USER, [p, q]);
    }

    // ---- Editing --------------------------------------------------------------------------------------------------------

    private edit(patch: Partial<LpState>): void {
        this.setState(patch);
        this.requestRender();
    }

    /** A typed coefficient a or b of a row: a whole number in the range, not making the row 0 x + 0 y; otherwise refused (false), never rounded or clamped. */
    setCoefficient(row: number, field: "a" | "b", value: number): boolean {
        const current = this.state.constraints[row];
        const checked = typedInteger(value, COEFFICIENT_RANGE);
        if (current === undefined || checked === undefined) return false;
        const next = {...current, [field]: checked};
        if (next.a === 0 && next.b === 0) return false;
        this.replaceRow(row, next);
        return true;
    }

    /** A typed right-hand side c of a row. */
    setBound(row: number, value: number): boolean {
        const current = this.state.constraints[row];
        const checked = typedInteger(value, BOUND_RANGE);
        if (current === undefined || checked === undefined) return false;
        this.replaceRow(row, {...current, c: checked});
        return true;
    }

    private replaceRow(row: number, next: LpConstraint): void {
        const current = this.state.constraints[row];
        if (current.a === next.a && current.b === next.b && current.c === next.c) return;
        this.edit({constraints: this.state.constraints.map((k, index) => (index === row ? next : k))});
    }

    /** A typed objective coefficient (axis 0 is p, 1 is q). */
    setObjective(axis: 0 | 1, value: number): boolean {
        const checked = typedInteger(value, OBJECTIVE_RANGE);
        if (checked === undefined) return false;
        const {p, q} = this.state.objective;
        const next = axis === 0 ? {p: checked, q} : {p, q: checked};
        if (next.p !== p || next.q !== q) this.edit({objective: next});
        return true;
    }

    /** A typed value k of the sweep line. */
    setSweep(value: number): boolean {
        const checked = typedInteger(value, SWEEP_RANGE);
        if (checked === undefined) return false;
        if (checked !== this.state.sweep) this.edit({sweep: checked});
        return true;
    }

    /** The number of rows: a row added at the end, or the last row removed. */
    setRowCount(count: number): boolean {
        if (!Number.isInteger(count) || count < ROW_COUNT_RANGE.min || count > ROW_COUNT_RANGE.max) return false;
        const rows = this.state.constraints;
        if (count === rows.length) return true;
        this.edit({constraints: count < rows.length ? rows.slice(0, count) : [...rows, ...Array.from({length: count - rows.length}, () => ({...NEW_ROW}))]});
        return true;
    }

    // ---- Lesson actions -------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`levelsets`): `set-objective` sets p and q, `set-constraints` the user rows, `set-sweep` the value k of the sweep line. The merged state goes through
     * `parseLpState` (strict, nothing snapped or clamped) before the write, so a bad value is a lesson-content error and nothing is written; unknown fields are refused.
     * A scene reads the state its earlier actions wrote.
     */
    applyLevelSetsAction(action: Extract<LessonAction, {kind: "levelsets"}>): void {
        const {kind: _kind, operation: _operation, ...fields} = action;
        const state = serializeLpState(this.state);
        switch (action.operation) {
            case "set-objective":
                this.refuseUnknown("set-objective", fields, ["p", "q"]);
                this.commitLp("set-objective", {...state, objective: {p: action.p, q: action.q}});
                return;
            case "set-constraints":
                this.refuseUnknown("set-constraints", fields, ["constraints"]);
                this.commitLp("set-constraints", {...state, constraints: action.constraints});
                return;
            case "set-sweep":
                this.refuseUnknown("set-sweep", fields, ["sweep"]);
                this.commitLp("set-sweep", {...state, sweep: action.sweep});
                return;
            default: {
                const unsupported: never = action;
                throw new Error(`levelsets: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    private refuseUnknown(operation: string, fields: Readonly<Record<string, unknown>>, allowed: readonly string[]): void {
        const unknown = Object.keys(fields).filter(key => !allowed.includes(key));
        if (unknown.length) throw new Error(`levelsets ${operation}: no such field ${unknown.join(", ")}.`);
    }

    /** Validates the merged state first, then writes only the fields that change. */
    private commitLp(operation: string, merged: unknown): void {
        const parsed = parseLpState(merged);
        if (!parsed.ok) throw new Error(`levelsets ${operation}: ${parsed.error.field} ${parsed.error.reason}.`);
        const next = serializeLpState(parsed.value);
        const patch: Partial<LpState> = {
            ...(sameRows(next.constraints, this.state.constraints) ? {} : {constraints: next.constraints}),
            ...(samePair(next.objective, this.state.objective) ? {} : {objective: next.objective}),
            ...(next.sweep === this.state.sweep ? {} : {sweep: next.sweep}),
        };
        if (Object.keys(patch).length) this.edit(patch);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("levelsets", action => this.applyLevelSetsAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    private rowLabel(index: number, k: LpConstraint): string {
        return t("levelsets_graph_lp_label_row", {value0: String(index + 1), value1: this.inequality(k)});
    }

    inequality(k: LpConstraint): string {
        return t("levelsets_graph_lp_inequality", {value0: rowLeft(k), value1: integerText(k.c)});
    }

    /** A rational, exactly, with its decimal beside it when it is a proper fraction. */
    exactValue(value: Rational): string {
        const exact = exactText(value);
        return isFraction(value) ? t("levelsets_graph_lp_exact_decimal", {value0: exact, value1: dec(value.toNumber(), 4)}) : exact;
    }

    /** A vertex, exactly "(7/2; 3)", with the decimal point beside it when a coordinate is a proper fraction. */
    pointText(v: RationalPoint): string {
        const exact = point(exactText(v.x), exactText(v.y));
        return isFraction(v.x) || isFraction(v.y)
            ? t("levelsets_graph_lp_exact_decimal", {value0: exact, value1: point(dec(v.x.toNumber(), 4), dec(v.y.toNumber(), 4))}) : exact;
    }

    private objectiveText(): string { return linearText(this.state.objective.p, this.state.objective.q); }

    /** The one status sentence. */
    statusText(): string {
        const solution = this.solution();
        const value = solution.value === null ? "" : this.exactValue(solution.value);
        switch (solution.status) {
            case "infeasible": return t("levelsets_graph_lp_say_infeasible");
            case "unbounded": {
                const ray = solution.improvingRay;
                return t("levelsets_graph_lp_say_unbounded", {value0: ray === null ? "" : point(integerText(ray.x), integerText(ray.y))});
            }
            case "flat": return t("levelsets_graph_lp_say_flat");
            case "unique": return t("levelsets_graph_lp_say_unique", {value0: value, value1: this.pointText(solution.optimal[0])});
            case "segment": return t("levelsets_graph_lp_say_segment", {value0: value, value1: this.pointText(solution.optimal[0]), value2: this.pointText(solution.optimal[1])});
            case "ray": return t("levelsets_graph_lp_say_ray", {value0: value, value1: this.pointText(solution.optimal[0])});
        }
    }

    readoutRows(): ReadoutListRow[] {
        const state = this.state;
        const solution = this.solution();
        const rows: ReadoutListRow[] = [{id: "region", label: t("levelsets_graph_lp_r_region"), value: t(REGION_KEYS[solution.result.region])}];
        state.constraints.forEach((k, index) => rows.push({id: `row-${index}`, label: t("levelsets_graph_lp_r_row", {value0: String(index + 1)}), value: this.inequality(k)}));
        rows.push({id: "axes", label: t("levelsets_graph_lp_r_axes"), value: t("levelsets_graph_lp_axes_value")});
        rows.push({id: "objective", label: t("levelsets_graph_lp_r_objective"), value: t("levelsets_graph_lp_objective_value", {value0: this.objectiveText()})});
        rows.push({id: "vertex-count", label: t("levelsets_graph_lp_r_vertex_count"), value: String(solution.vertexInfo.length)});
        solution.vertexInfo.forEach((info, index) => rows.push({
            id: `vertex-${index}`, label: t("levelsets_graph_lp_r_vertex", {value0: String(index + 1)}),
            value: t("levelsets_graph_lp_vertex_value", {value0: this.pointText(info.point), value1: this.exactValue(info.value), value2: String(info.tight)}),
        }));
        rows.push({id: "status", label: t("levelsets_graph_lp_r_status"), value: t(STATUS_KEYS[solution.status])});
        if (solution.value !== null) {
            rows.push({id: "optimum", label: t("levelsets_graph_lp_r_optimum"), value: this.exactValue(solution.value)});
            if (solution.status !== "flat") {
                solution.optimal.forEach((v, index) => rows.push({id: `optimal-${index}`, label: t("levelsets_graph_lp_r_optimal"), value: this.pointText(v)}));
            }
        } else if (solution.improvingRay !== null) {
            rows.push({id: "ray", label: t("levelsets_graph_lp_r_ray"), value: point(integerText(solution.improvingRay.x), integerText(solution.improvingRay.y))});
        }
        const walk = solution.result.walk;
        if (walk.length === 0) rows.push({id: "walk", label: t("levelsets_graph_lp_r_walk"), value: t("levelsets_graph_lp_walk_none")});
        walk.forEach((v, index) => rows.push({
            id: `walk-${index}`, label: t("levelsets_graph_lp_r_walk_step", {value0: String(index)}),
            value: t("levelsets_graph_lp_walk_step", {value0: this.pointText(v), value1: this.exactValue(evaluate(state.objective.p, state.objective.q, v))}),
        }));
        if (!this.flat()) {
            rows.push({id: "sweep", label: t("levelsets_graph_lp_r_sweep"), value: t("levelsets_graph_lp_equation", {value0: this.objectiveText(), value1: integerText(state.sweep)})});
            if (solution.value !== null) {
                rows.push({id: "through", label: t("levelsets_graph_lp_r_through"), value: t("levelsets_graph_lp_equation", {value0: this.objectiveText(), value1: this.exactValue(solution.value)})});
            }
        }
        const box = this.geometry().box;
        rows.push({id: "window", label: t("levelsets_graph_lp_r_window"), value: t("levelsets_graph_lp_window_value", {value0: integerText(box.xMin), value1: integerText(box.xMax)})});
        return rows;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <CountSetter key="count" label={t("levelsets_graph_lp_count")} n={state.constraints.length} min={ROW_COUNT_RANGE.min} max={ROW_COUNT_RANGE.max} bigStep={1}
                         minusLabel={t("levelsets_graph_lp_count_minus")} plusLabel={t("levelsets_graph_lp_count_plus")}
                         help={t("levelsets_graph_lp_count_help", {value0: String(ROW_COUNT_RANGE.min), value1: String(ROW_COUNT_RANGE.max)})}
                         onPlus={() => this.setRowCount(state.constraints.length + 1)} onMinus={() => this.setRowCount(state.constraints.length - 1)}
                         onSet={value => this.setRowCount(value)}/>,
        ];
        state.constraints.forEach((k, index) => {
            const n = String(index + 1);
            commands.push(
                <Slider key={`a-${index}`} customText={t("levelsets_graph_lp_row_a", {value0: n})} value={k.a} step={1} bigStep={5} min={COEFFICIENT_RANGE.min} max={COEFFICIENT_RANGE.max} decimals={0}
                        rejectedHint={t("levelsets_graph_lp_coefficients_rejected")}
                        onChange={value => this.setCoefficient(index, "a", value)}/>,
                <Slider key={`b-${index}`} customText={t("levelsets_graph_lp_row_b", {value0: n})} value={k.b} step={1} bigStep={5} min={COEFFICIENT_RANGE.min} max={COEFFICIENT_RANGE.max} decimals={0}
                        rejectedHint={t("levelsets_graph_lp_coefficients_rejected")}
                        onChange={value => this.setCoefficient(index, "b", value)}/>,
                <Slider key={`c-${index}`} customText={t("levelsets_graph_lp_row_c", {value0: n})} value={k.c} step={1} bigStep={5} min={BOUND_RANGE.min} max={BOUND_RANGE.max} decimals={0}
                        onChange={value => this.setBound(index, value)}/>,
            );
        });
        commands.push(
            <Slider key="p" customText={t("levelsets_graph_lp_objective_p")} value={state.objective.p} step={1} bigStep={5} min={OBJECTIVE_RANGE.min} max={OBJECTIVE_RANGE.max} decimals={0}
                    onChange={value => this.setObjective(0, value)}/>,
            <Slider key="q" customText={t("levelsets_graph_lp_objective_q")} value={state.objective.q} step={1} bigStep={5} min={OBJECTIVE_RANGE.min} max={OBJECTIVE_RANGE.max} decimals={0}
                    onChange={value => this.setObjective(1, value)}/>,
            <Slider key="sweep" customText={t("levelsets_graph_lp_sweep")} value={state.sweep} step={1} bigStep={5} min={SWEEP_RANGE.min} max={SWEEP_RANGE.max} decimals={0}
                    help={t("levelsets_graph_lp_sweep_help")}
                         rejectedHint={t("levelsets_graph_lp_sweep_rejected", {value0: integerText(SWEEP_RANGE.min), value1: integerText(SWEEP_RANGE.max)})}
                         unavailableReason={this.flat() ? t("levelsets_graph_lp_sweep_reason") : undefined}
                         onChange={value => this.setSweep(value)}/>,
        );
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <LpReadout graph={this}/>
        </>;
    }
}

export default LinearProgramGraph;
