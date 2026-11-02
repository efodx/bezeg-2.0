import React from "react";
import {angleVector, incrementalTriangulation} from "../../compgeo/delaunay";
import {gridToBoard, PointSetModel, PointSetOptions, serializePointSetModel} from "../../compgeo/pointSetModel";
import {boundaryCount, type BoundaryCount, type InsertionCase, insertPoint} from "../../compgeo/pointInsertion";
import {
    createTriangulation, edges, flip, type FlipRefusal, triangulationCounts, type TriangulationCounts,
    type TriangulationEdge, type Triangulation,
} from "../../compgeo/triangulation";
import {t} from "../../localization";
import {BaseGraphState} from "../base/BaseGraph";
import {SceneStateUpdate} from "../base/SceneStore";
import {GraphPalette} from "../styles/GraphPalette";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {TriangulationControls} from "./TriangulationControls";
import type {Preset} from "../base/presets/Presets";

/** At most this many points: 2*40 - 2 - 3 = 75 triangles. */
export const TRIANGULATION_MAX_POINTS = 40;
export const TRIANGULATION_OVERLAY_IDS = ["grid", "triangulation"] as const;
export type TriangulationOverlayId = "triangulation";

const point = (x: number, y: number) => ({x, y});

/** The B2 example (spec): n = 7, hull k = 5. */
export const TRIANGULATION_EXAMPLE_POINTS: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0,
    points: [point(0, 0), point(8, 0), point(9, 6), point(4, 8), point(-1, 5), point(3, 3), point(6, 3)],
};
/** The starting triangulation T0 of the B2 example, by point index (counter-clockwise). */
export const TRIANGULATION_T0: readonly (readonly number[])[] = [[1, 2, 6], [1, 5, 4], [1, 6, 5], [2, 3, 4], [4, 0, 1], [4, 5, 6], [6, 2, 4]];

/** Preset data of this graph: the points as a point-set model plus the triangle list (checked by the collection, task 12b). */
export type TriangulationPresetData = PointSetModel & {readonly triangles?: readonly (readonly number[])[]};

/** The saved configuration beyond the points: the triangle list and the list before the last flip. */
export interface TriangulationGraphState extends PointSetGraphState {
    /** Counter-clockwise vertex indices per triangle; empty while the points allow no triangulation. */
    triangles: readonly (readonly number[])[];
    /** The triangle list before the last flip; absent after any other change. */
    previous?: readonly (readonly number[])[];
}

/** What the last action did, shown in the panel and announced. Cleared by the next point edit or edge selection. */
export type TriangulationEvent =
    | {kind: "inserted"; change: InsertionCase; point: number; added: number}
    | {kind: "rebuilt"}
    | {kind: "flipped"; edge: readonly [number, number]; created: readonly [number, number]}
    | {kind: "flip-refused"; reason: FlipRefusal["kind"]; edge: readonly [number, number]}
    | {kind: "flip-needs-edge"};

export type TriangulationRefusal = "duplicate-point" | "degenerate-points" | "unsupported";

/** The numbers of the readout; `before` is the smallest angle of the triangulation before the last flip. */
export interface TriangulationReadout {
    n: number;
    boundary: BoundaryCount;
    counts: TriangulationCounts;
    minAngle: number;
    minAngleBefore: number | undefined;
}

const isTriple = (value: readonly number[]): boolean => value.length === 3;

/** A stored triangle list, or an empty list when the value is not a list of integer triples. */
function storedTriangles(value: unknown): number[][] {
    if (!Array.isArray(value)) return [];
    const out: number[][] = [];
    for (const item of value) {
        if (!Array.isArray(item) || !item.every(Number.isInteger)) return [];
        const triple = item.map(Number);
        if (!isTriple(triple)) return [];
        out.push(triple);
    }
    return out;
}

/** The triangulation graph works on points only, whatever mode a restored or imported model names. */
function asPoints(model: PointSetModel): PointSetModel {
    return model.mode === "points" && !model.closed ? model : {...model, mode: "points", closed: false};
}

const sameEdge = (e: readonly [number, number], a: number, b: number): boolean => e[0] === Math.min(a, b) && e[1] === Math.max(a, b);

/**
 * A point-set graph in points mode that shows a triangulation of its points (task 12, spec B2): triangle edges (hull edges
 * heavier than interior edges), a selected edge with its quadrilateral, the counts and the smallest angle. The scene state
 * keeps the points and the triangle list; an edit keeps, extends or rebuilds the list (`retriangulate`). Board text is
 * language-neutral; the panel is the only localized text.
 *
 * Task 13 extends this class: override `drawTriangulation`, `drawSelectedEdge`, `readout`, `afterFlip`, `retriangulate`
 * and `workspaceEdit` (the panel).
 */
export class TriangulationGraph extends PointSetGraph<TriangulationOverlayId> {
    private eventValue?: TriangulationEvent;
    private selectedEdgeValue?: readonly [number, number];
    /** Set by `importPresetData` for the one model write that carries its own triangle list. */
    private incoming?: readonly (readonly number[])[];
    private currentMemo?: {points: PointSetModel["points"]; triangles: unknown; tri: Triangulation | undefined};
    private inputsMemo?: {triangles: unknown; edge: string};

    constructor(options: PointSetOptions = {}) {
        super({pointLimit: TRIANGULATION_MAX_POINTS, ...options});
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get event(): TriangulationEvent | undefined {
        return this.eventValue;
    }

    /** The triangle list of the scene. */
    get triangles(): readonly (readonly number[])[] {
        return "triangles" in this.state ? storedTriangles(this.state.triangles) : [];
    }

    private get previousTriangles(): readonly (readonly number[])[] | undefined {
        const stored = "previous" in this.state ? storedTriangles(this.state.previous) : [];
        return stored.length > 0 ? stored : undefined;
    }

    /** The current triangulation, or undefined while the points allow none (duplicates, collinear, under three). */
    triangulation(): Triangulation | undefined {
        const points = this.model.points;
        const raw: unknown = "triangles" in this.state ? this.state.triangles : undefined;
        const memo = this.currentMemo;
        if (memo?.points === points && memo.triangles === raw) return memo.tri;
        const result = createTriangulation(points, storedTriangles(raw));
        this.currentMemo = {points, triangles: raw, tri: result.ok ? result.value : undefined};
        return this.currentMemo.tri;
    }

    /** Why there is no triangulation, or undefined when there is one. */
    refusal(): TriangulationRefusal | undefined {
        if (this.triangulation()) return undefined;
        const result = createTriangulation(this.model.points, []);
        if (result.ok) return "unsupported";
        switch (result.refusal.kind) {
            case "duplicate-point": return "duplicate-point";
            case "degenerate-points": return "degenerate-points";
            default: return "unsupported";
        }
    }

    /** The selected edge while it is still an edge of the triangulation. */
    selectedEdge(): TriangulationEdge | undefined {
        const tri = this.triangulation();
        const chosen = this.selectedEdgeValue;
        return tri && chosen ? edges(tri).find(e => sameEdge(chosen, e.a, e.b)) : undefined;
    }

    /** The numbers the panel shows; undefined without a triangulation. */
    readout(): TriangulationReadout | undefined {
        const tri = this.triangulation();
        if (!tri) return undefined;
        const before = this.previousTriangles;
        const previous = before ? createTriangulation(tri.points, before) : undefined;
        return {
            n: tri.points.length, boundary: boundaryCount(tri), counts: triangulationCounts(tri),
            minAngle: angleVector(tri)[0], minAngleBefore: previous?.ok ? angleVector(previous.value)[0] : undefined,
        };
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    private patch(fields: Partial<TriangulationGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    override getInitialState(): TriangulationGraphState {
        return {...super.getInitialState(), overlays: {triangulation: true}, triangles: []};
    }

    /** Every model write also decides the triangle list (`retriangulate`), unless the write names it itself. */
    override setState(update: SceneStateUpdate<PointSetGraphState>, callback?: () => void): void {
        const wrapped: SceneStateUpdate<PointSetGraphState> = state => {
            const raw = typeof update === "function" ? update(state) : update;
            if (!raw || raw.model === undefined) return raw;
            const model = asPoints(raw.model);
            if (raw.model === state.model && model === raw.model) return raw;
            if ("triangles" in raw) return {...raw, model};
            const next = this.retriangulate(state, model, this.incoming);
            this.eventValue = next.event;
            this.selectedEdgeValue = undefined;
            return this.patch({...raw, model, triangles: next.triangles, previous: undefined});
        };
        super.setState(wrapped, callback);
    }

    /**
     * The edit rule. Adding one point to the end: `insertPoint` on the current triangulation. Moving points (same count): the
     * list is kept when `createTriangulation` still accepts it, otherwise rebuilt. Anything else (removal, a new model): rebuilt by
     * `incrementalTriangulation`. `named` is a triangle list that arrives with the model (a Preset). Points that allow no
     * triangulation give an empty list.
     */
    protected retriangulate(
        state: Readonly<PointSetGraphState>, model: PointSetModel, named?: readonly (readonly number[])[],
    ): {triangles: readonly (readonly number[])[]; event?: TriangulationEvent} {
        const points = model.points;
        if (points.length < 3 || points.length > TRIANGULATION_MAX_POINTS) return {triangles: []};
        const gate = createTriangulation(points, []);
        if (!gate.ok && (gate.refusal.kind === "duplicate-point" || gate.refusal.kind === "degenerate-points" || gate.refusal.kind === "invalid-point")) {
            return {triangles: []};
        }
        if (named && createTriangulation(points, named).ok) return {triangles: named};
        const oldPoints = state.model.points;
        const oldList = "triangles" in state ? storedTriangles(state.triangles) : [];
        const oldResult = createTriangulation(oldPoints, oldList);
        const old = oldResult.ok ? oldResult.value : undefined;
        if (old && !named) {
            const prefixKept = points.length === oldPoints.length + 1 && oldPoints.every((p, i) => p.x === points[i].x && p.y === points[i].y);
            if (prefixKept) {
                const inserted = insertPoint(old, points[points.length - 1]);
                if (inserted.ok) {
                    return {
                        triangles: inserted.value.triangles,
                        event: {kind: "inserted", change: inserted.change, point: points.length - 1, added: inserted.value.triangles.length - old.triangles.length},
                    };
                }
            } else if (points.length === oldPoints.length && createTriangulation(points, oldList).ok) {
                return {triangles: oldList};
            }
        }
        const built = incrementalTriangulation(points);
        return {triangles: built.ok ? built.value.triangles : [], event: old && !named ? {kind: "rebuilt"} : undefined};
    }

    // ---- Edge selection and flip ---------------------------------------------------------------------------------

    /** Selects the edge (a, b) when it is an edge of the triangulation (interior or hull); clears the last event. */
    selectEdge(a: number | undefined, b?: number): void {
        const tri = this.triangulation();
        const valid = a !== undefined && b !== undefined && tri !== undefined && edges(tri).some(e => sameEdge([e.a, e.b], a, b));
        this.selectedEdgeValue = valid ? [Math.min(a, b), Math.max(a, b)] : undefined;
        this.eventValue = undefined;
        this.requestRender();
        this.syncScene();
    }

    /** Flips the selected edge. A refusal shows its reason and changes nothing; a flip selects the new diagonal. */
    flipSelected(): boolean {
        const tri = this.triangulation();
        const edge = this.selectedEdge();
        if (!tri || !edge) {
            this.eventValue = {kind: "flip-needs-edge"};
            this.requestRender();
            return false;
        }
        const result = flip(tri, [edge.a, edge.b]);
        if (!result.ok) {
            this.eventValue = {kind: "flip-refused", reason: result.refusal.kind, edge: [edge.a, edge.b]};
            this.requestRender();
            return false;
        }
        const created = edges(result.value).find(e => !edges(tri).some(old => old.a === e.a && old.b === e.b));
        const next: readonly [number, number] = created ? [created.a, created.b] : [edge.a, edge.b];
        this.selectedEdgeValue = next;
        this.eventValue = {kind: "flipped", edge: [edge.a, edge.b], created: next};
        this.setState(this.patch({triangles: result.value.triangles, previous: tri.triangles}));
        this.requestRender();
        this.afterFlip(tri, result.value);
        return true;
    }

    /** Hook for a subclass, called after a successful flip with the triangulation before and after. */
    protected afterFlip(_before: Triangulation, _after: Triangulation): void {}

    // ---- Presets -------------------------------------------------------------------------------------------------

    override defaultPreset(): PointSetModel {
        const data: TriangulationPresetData = {...serializePointSetModel(TRIANGULATION_EXAMPLE_POINTS), triangles: TRIANGULATION_T0.map(tri => [...tri])};
        return data;
    }

    override exportPresetData(): PointSetModel {
        const data: TriangulationPresetData = {...serializePointSetModel(this.model), triangles: this.triangles.map(tri => [...tri])};
        return data;
    }

    /** The triangle list in `data` is kept when it is a valid triangulation of its points; otherwise the points are rebuilt. */
    override importPresetData(data: PointSetModel): void {
        const stored = "triangles" in data ? storedTriangles(data.triangles) : [];
        const {mode: _mode, closed: _closed, ...rest} = serializePointSetModel(data);
        this.incoming = stored.length > 0 ? stored : undefined;
        try {
            super.importPresetData(asPoints({...rest, mode: "points", closed: false, points: rest.points}));
        } finally {
            this.incoming = undefined;
        }
        this.selectedEdgeValue = undefined;
        this.eventValue = undefined;
    }

    /** A Preset carries the triangle list once, in `data`; its `graphState` omits it like the model. */
    override exportPreset(): Preset<PointSetModel> {
        const preset = super.exportPreset();
        const {triangles: _triangles, previous: _previous, ...graphState} = preset.graphState as TriangulationGraphState;
        return {...preset, graphState};
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PointSetGraphState {
        const merged: TriangulationGraphState = {...super.figurePresetGraphState(graphState), triangles: this.triangles};
        return merged;
    }

    protected override sceneGraphState(): PointSetGraphState {
        const state: TriangulationGraphState = {...this.state, triangles: this.triangles, previous: this.previousTriangles};
        return state;
    }

    /** The B2 example (x -1 to 9, y 0 to 8) with a margin; the app default box would cut it. */
    protected override initialView(): [number, number, number, number] {
        return [-2.5, 9.5, 10.5, -1.5];
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        return TRIANGULATION_OVERLAY_IDS;
    }

    protected override overlayLabel(id: TriangulationOverlayId | "grid"): string {
        return id === "triangulation" ? t("tri_overlay_triangulation") : super.overlayLabel(id);
    }

    /** The drawing follows the triangle list and the selected edge; neither is part of the model. */
    protected override overlayInputs(): unknown {
        const triangles: unknown = "triangles" in this.state ? this.state.triangles : undefined;
        const edge = this.selectedEdge();
        const key = edge ? `${edge.a}-${edge.b}` : "";
        const memo = this.inputsMemo;
        if (memo && memo.triangles === triangles && memo.edge === key) return memo;
        this.inputsMemo = {triangles, edge: key};
        return this.inputsMemo;
    }

    protected override drawOverlay(id: TriangulationOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const tri = this.triangulation();
        if (!tri) return [];
        const selected = this.selectedEdge();
        return [...this.drawSelectedEdge(tri, selected, model), ...this.drawTriangulation(tri, selected, model)];
    }

    /** One curve per edge: hull edges heavy, interior edges thin, so the difference does not rely on colour. */
    protected drawTriangulation(tri: Triangulation, selected: TriangulationEdge | undefined, model: PointSetModel): JXG.GeometryElement[] {
        return edges(tri).map(edge => {
            const from = gridToBoard(tri.points[edge.a], model.gridStepExponent);
            const to = gridToBoard(tri.points[edge.b], model.gridStepExponent);
            const isSelected = selected !== undefined && selected.a === edge.a && selected.b === edge.b;
            const curve = this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                name: edge.interior ? "triangulation-edge" : "triangulation-hull-edge",
                highlight: false, fixed: true, layer: isSelected ? 4 : 3,
                strokeColor: isSelected ? GraphPalette.constructionAccent : GraphPalette.referenceCurve,
                strokeWidth: isSelected ? 5 : edge.interior ? 1.5 : 3.5,
            }) as JXG.GeometryElement;
            curve.on("down", () => { if (!this.graphInteractionLocked) this.selectEdge(edge.a, edge.b); });
            return curve;
        });
    }

    /** The quadrilateral of the selected edge: its two triangles, in counter-clockwise order (a hull edge has one triangle, so none). */
    protected drawSelectedEdge(tri: Triangulation, selected: TriangulationEdge | undefined, model: PointSetModel): JXG.GeometryElement[] {
        if (!selected || selected.triangles.length !== 2) return [];
        const [first, second] = selected.triangles;
        const apex = (t: number) => tri.triangles[t].find(v => v !== selected.a && v !== selected.b);
        const corners = (t: number, other: number) => {
            const v = tri.triangles[t];
            const at = v.indexOf(selected.a);
            const directed: [number, number] = v[(at + 1) % 3] === selected.b ? [selected.a, selected.b] : [selected.b, selected.a];
            const a = apex(t), b = apex(other);
            return a === undefined || b === undefined ? [] : [directed[0], b, directed[1], a];
        };
        const quad = corners(first, second).map(i => gridToBoard(tri.points[i], model.gridStepExponent));
        if (quad.length !== 4) return [];
        return [this.board.create("polygon", quad.map(c => [c.x, c.y]), {
            name: "triangulation-quadrilateral", vertices: {visible: false}, highlight: false, fixed: true, layer: 1,
            fillColor: GraphPalette.constructionAccent, fillOpacity: 0.2, borders: {visible: false, highlight: false, fixed: true},
        }) as JXG.GeometryElement];
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override showsClosedToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        const tri = this.triangulation();
        const selected = this.selectedEdge();
        return <>
            <TriangulationControls readout={this.readout()} refusal={this.refusal()} event={this.eventValue}
                                   edges={tri ? edges(tri).map(e => ({a: e.a, b: e.b, interior: e.interior})) : []}
                                   selected={selected ? [selected.a, selected.b] : undefined}
                                   actions={{selectEdge: (a, b) => this.selectEdge(a, b), flip: () => { this.flipSelected(); }}}/>
            {super.workspaceEdit()}
        </>;
    }
}
