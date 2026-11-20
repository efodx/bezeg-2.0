import React from "react";
import {t} from "../../localization";
import {gridToBoard, PointSetModel} from "../../compgeo/pointSetModel";
import type {GridPoint} from "../../compgeo/grid";
import type {Chain} from "../../compgeo/sweep/monotoneTriangulation";
import {PresetCollection} from "../base/presets/PresetCollection";
import {currentLanguage} from "../../localization";
import {nameBox, PlacedLabels, pxFrame, tickStrips, type PlacementInput, type PxFrame} from "../legend/pointNamePlacement";
import type {LabelItem, PxBox} from "../legend/boardLabelPlacement";
import {GraphPalette} from "../styles/GraphPalette";
import {ACTIVE_CONSTRUCTION_COLOR} from "./constructionEmphasis";
import {matchingExample} from "./ExampleSelect";
import {MonotonePartitionGraph, MonotonePartitionOverlayId} from "./MonotonePartitionGraph";
import {vertexName} from "./monotonePartitionRun";
import {
    MONOTONE_TRIANGULATION_EXAMPLE_1, MONOTONE_TRIANGULATION_EXAMPLE_2, MONOTONE_TRIANGULATION_EXAMPLE_3, monotoneTriangulationCollection,
} from "./monotoneTriangulationPresetCollection";
import {runMonotoneTriangulation, type TriangulationRun} from "./monotoneTriangulationRun";
import {MonotoneTriangulationControlActions, MonotoneTriangulationControls, MonotoneTriangulationLists, chainText} from "./MonotoneTriangulationControls";

/** Marker shape per chain, so the chain is never carried by colour alone (the text label names it as well). */
const CHAIN_FACES: Record<Chain, string> = {top: "^", bottom: "v", left: "<", right: ">"};
const CHAIN_COLOURS: Record<Chain, string> = {
    top: GraphPalette.referenceCurve, bottom: GraphPalette.referenceCurve,
    left: GraphPalette.constructionLevels[2], right: GraphPalette.constructionLevels[4],
};
/** A JSXGraph text, for the attributes its typings leave out. */
interface Restyle {setAttribute(attributes: Record<string, unknown>): void}
const CHAIN_LABEL_FONT = 14;

/** Fills of the finished triangles, one per piece, cycled. */
const PIECE_FILLS = [
    GraphPalette.constructionLevels[1], GraphPalette.constructionLevels[2], GraphPalette.constructionLevels[4],
    GraphPalette.constructionLevels[3], GraphPalette.constructionLevels[5],
];

/**
 * The monotone partition graph (task 16) extended by the triangulation of every piece (task 17, spec sweep-algorithms-lessons C4).
 * It steps through the combined trace of `partitionAndTriangulate`: the partition events drawn as in task 16, then each
 * piece's stack algorithm. The step, playback, edit and Preset behaviour is the parent's; only the run, the drawing of the
 * triangulation phase, the panel and the Preset key differ. A polygon that is already y-monotone has no diagonal and one
 * piece. Next step and every Play tick run the parent's one `TracePlayback` transition, so both reach identical states.
 */
export class MonotoneTriangulationGraph extends MonotonePartitionGraph {
    private triMemo?: {points: PointSetModel["points"]; run: TriangulationRun};
    /** The placed boxes of the chain labels and the vertex names, shared by the labels of one board state (boxes only, no board reference). */
    private readonly names = new PlacedLabels();
    /** The vertices whose chain label the last overlay drew (data only; replaced with every redraw, emptied with the scene). */
    private chainNames: Array<{v: number; chain: Chain}> = [];
    /** The point labels already given their placed position (weak: nothing here outlives the board's objects). */
    private readonly namesPlaced = new WeakSet<object>();

    override run(): TriangulationRun {
        const points = this.model.points;
        if (this.triMemo?.points !== points) this.triMemo = {points, run: runMonotoneTriangulation(this.verticesForTrace())};
        return this.triMemo.run;
    }

    protected override disposeFigureScene(): void {
        this.names.clear();
        this.chainNames = [];
        super.disposeFigureScene();
    }

    protected override syncReplacedScene(): void {
        this.names.clear();
        this.chainNames = [];
        super.syncReplacedScene();
    }

    // ---- Names ---------------------------------------------------------------------------------------------------

    /** The text of a vertex's chain label. */
    private chainLabel(v: number, chain: Chain): string {
        return `${vertexName(v)} ${chainText(t, chain)}`;
    }

    private nameFontPx(): number {
        const size = (this.styles.point.default.label as unknown as {fontSize?: number | (() => number)}).fontSize;
        return typeof size === "function" ? size() : size ?? 15;
    }

    /** The boxes (px) of the chain labels `c<v>` and the vertex names `P<n>`: chain labels first, then the names, beside their own marker. */
    private placedNames(): Record<string, PxBox> {
        const board = this.board;
        type Shown = JXG.GeometryElement & {X?: () => number; Y?: () => number; evalVisProp(name: string): unknown; dataX?: number[]; dataY?: number[]; plaintext?: string};
        const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp("visible")));
        const points = shown.filter(o => o.elType === "point" && o.X && o.Y && o.name !== "pending")
            .map(o => ({x: o.X!(), y: o.Y!(), r: Number(o.evalVisProp("size")) + 1 || 7}));
        const lines = shown.filter(o => o.elType === "curve" && o.name.startsWith("monotonetri-") && (o.dataX?.length ?? 0) >= 2 && (o.dataY?.length ?? 0) >= 2)
            .map(o => ({a: [o.dataX![0], o.dataY![0]] as const, b: [o.dataX![1], o.dataY![1]] as const}));
        const test = shown.find(o => o.elType === "text" && o.name === "monotonetri-test-label");
        const testText = test?.plaintext ?? "";
        const model = this.model;
        const font = this.nameFontPx();
        const token = [points.map(p => `${p.x},${p.y},${p.r}`).join(";"), lines.map(l => `${l.a}|${l.b}`).join(";"), test ? `${test.X!()},${test.Y!()},${testText}` : "",
            model.points, model.gridStepExponent, this.chainNames.map(c => `${c.v}${c.chain}`).join(), currentLanguage(), font];
        return this.names.boxes(board, token, frame => this.nameInput(frame, points, lines, test && test.X && test.Y ? {x: test.X(), y: test.Y(), text: testText} : undefined, font));
    }

    private nameInput(frame: PxFrame, points: ReadonlyArray<{x: number; y: number; r: number}>, lines: ReadonlyArray<{a: readonly [number, number]; b: readonly [number, number]}>,
                      test: {x: number; y: number; text: string} | undefined, font: number): PlacementInput {
        const exponent = this.model.gridStepExponent;
        const vertices = this.model.points.map(p => { const c = gridToBoard(p, exponent); return frame.toPx(c.x, c.y); });
        // One marker per place: the largest drawn there (the stack square, the ring, the chain marker, the vertex point).
        const markers: Array<[number, number, number]> = [];
        for (const p of points) {
            const [x, y] = frame.toPx(p.x, p.y);
            const same = markers.find(m => Math.hypot(m[0] - x, m[1] - y) < 1);
            if (same) same[2] = Math.max(same[2], p.r); else markers.push([x, y, p.r]);
        }
        const samples: Array<readonly [number, number]> = [];
        const along = (a: readonly [number, number], b: readonly [number, number]) => {
            const n = Math.max(1, Math.min(800, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)));
            for (let i = 0; i <= n; i++) samples.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
        };
        vertices.forEach((a, i) => along(a, vertices[(i + 1) % vertices.length]));
        for (const l of lines) along(frame.toPx(l.a[0], l.a[1]), frame.toPx(l.b[0], l.b[1]));
        const items: LabelItem[] = [];
        for (const {v, chain} of this.chainNames) {
            if (!vertices[v]) continue; // a label of a vertex the edit just removed
            const box = nameBox(this.chainLabel(v, chain), CHAIN_LABEL_FONT);
            items.push({id: `c${v}`, ax: vertices[v][0], ay: vertices[v][1], ...box});
        }
        vertices.forEach(([ax, ay], i) => items.push({id: `P${i + 1}`, ax, ay, ...nameBox(`P${i + 1}`, font)}));
        let blocks: PxBox[] | undefined;
        if (test) {
            const [cx, cy] = frame.toPx(test.x, test.y);
            const {w, h} = nameBox(test.text, CHAIN_LABEL_FONT);
            blocks = [{x0: cx - w / 2, y0: cy, x1: cx + w / 2, y1: cy + h}];
        }
        // The axis numbers with a margin: a long chain label then keeps clear of them by a few px, not by the estimated box alone.
        const margin = tickStrips(this.board).map(b => ({x0: b.x0 - 4, y0: b.y0 - 4, x1: b.x1 + 4, y1: b.y1 + 4}));
        return {items, markers, samples, blocks: [...(blocks ?? []), ...margin]};
    }

    protected override syncScene(): void {
        super.syncScene();
        if (!this.hasBoard) return;
        const board = this.board;
        for (const element of board.objectsList as unknown as Array<JXG.GeometryElement & {X?: () => number; Y?: () => number; label?: JXG.Text}>) {
            if (this.namesPlaced.has(element) || element.elType !== "point" || !/^P\d+$/.test(element.name) || !element.label) continue;
            this.namesPlaced.add(element);
            const name = element.name;
            const label = element.label as unknown as Restyle;
            label.setAttribute({anchorX: "middle", anchorY: "middle"});
            label.setAttribute({offset: () => {
                const frame = pxFrame(board);
                return frame ? this.names.offset(this.placedNames()[name], frame.toPx(element.X!(), element.Y!()), [8, 8]) : [8, 8];
            }});
        }
    }

    protected override buildRun(vertices: readonly GridPoint[]): TriangulationRun {
        return runMonotoneTriangulation(vertices);
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PointSetModel> {
        return monotoneTriangulationCollection;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayLabel(id: MonotonePartitionOverlayId | "grid"): string {
        if (id === "sweep") return t("monotonetri_overlay_sweep");
        return super.overlayLabel(id);
    }

    /** The partition phase is task 16's drawing; the triangulation phase is drawn here. */
    protected override drawOverlay(id: MonotonePartitionOverlayId | "grid", model: PointSetModel): JXG.GeometryElement[] {
        this.chainNames = [];
        const run = this.run();
        const piece = id === "grid" || run.refusal !== undefined || run.length === 0 ? null : run.pieceAt(this.step);
        const view = piece === null ? undefined : run.triangulationView(this.step);
        if (piece === null || !view) return super.drawOverlay(id, model);
        const at = (index: number) => gridToBoard(model.points[index], model.gridStepExponent);
        const scale = 2 ** model.gridStepExponent;
        const curve = (name: string, xs: number[], ys: number[], attributes: Record<string, unknown>) =>
            this.board.create("curve", [xs, ys], {name, withLabel: false, highlight: false, fixed: true, ...attributes}) as JXG.GeometryElement;
        const marker = (name: string, index: number, attributes: Record<string, unknown>) => {
            const c = at(index);
            return this.board.create("point", [c.x, c.y], {
                name, withLabel: false, highlight: false, fixed: true, showInfobox: false, ...attributes,
            }) as JXG.GeometryElement;
        };
        const text = (name: string, x: number | (() => number), y: number | (() => number), content: string | (() => string), attributes: Record<string, unknown>) =>
            this.board.create("text", [x, y, content], {
                name, fixed: true, highlight: false, display: "internal", fontSize: 14, strokeColor: GraphPalette.label, layer: 6, ...attributes,
            }) as JXG.GeometryElement;
        const objects: JXG.GeometryElement[] = [];
        // Finished triangles, one fill per piece (the triangles of piece p are the next pieceSize(p) - 2 of the list).
        const owner: number[] = [];
        for (let p = 0; p < run.pieceCount; p++) {
            for (let k = 0; k < run.pieceSize(p) - 2; k++) owner.push(p);
        }
        view.triangles.forEach((triangle, k) => {
            const corners = triangle.map(at);
            const fill = PIECE_FILLS[owner[k] % PIECE_FILLS.length];
            objects.push(this.board.create("polygon", corners.map(c => [c.x, c.y]), {
                name: "monotonetri-triangle", vertices: {visible: false}, highlight: false, fixed: true, layer: 2,
                fillColor: fill, fillOpacity: 0.4, borders: {highlight: false, fixed: true, strokeColor: fill, strokeWidth: 1},
            }) as JXG.GeometryElement);
        });
        // Keep the polygon object for the current piece, but draw its outline per edge so a coincident
        // construction diagonal can supply the one visible dashed stroke for that boundary.
        const corners = view.cycle.map(at);
        objects.push(this.board.create("polygon", corners.map(c => [c.x, c.y]), {
            name: "monotonetri-piece", vertices: {visible: false}, highlight: false, fixed: true, layer: 3, fillOpacity: 0, highlightFillOpacity: 0,
            borders: {highlight: false, fixed: true, strokeColor: GraphPalette.primaryCurve, strokeWidth: 1, strokeOpacity: 0},
        }) as JXG.GeometryElement);
        const diagonals = [...view.earlierDiagonals, ...view.diagonals];
        const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
        const diagonalEdges = new Set(diagonals.map(([a, b]) => edgeKey(a, b)));
        for (let i = 0; i < view.cycle.length; i++) {
            const a = view.cycle[i];
            const b = view.cycle[(i + 1) % view.cycle.length];
            if (diagonalEdges.has(edgeKey(a, b))) continue;
            objects.push(curve("monotonetri-piece-edge", [at(a).x, at(b).x], [at(a).y, at(b).y], {
                strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 3, layer: 5,
            }));
        }
        // Diagonals so far: one thin dashed construction stroke, including when it lies on the piece boundary.
        for (const [a, b] of diagonals) {
            objects.push(curve("monotonetri-diagonal", [at(a).x, at(b).x], [at(a).y, at(b).y], {
                strokeColor: ACTIVE_CONSTRUCTION_COLOR, strokeWidth: 2, dash: 2, layer: 5,
            }));
        }
        // The sweep line through the current vertex.
        const xs = model.points.map(p => p.x * scale);
        const lineY = view.vertex === null ? Math.max(...model.points.map(p => p.y * scale)) + scale : at(view.vertex).y;
        objects.push(curve("monotonetri-sweep-line", [Math.min(...xs) - scale, Math.max(...xs) + scale], [lineY, lineY], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, layer: 3,
        }));
        // The visibility test of this step: the vertex pair, with the outcome in text and in the dash.
        if (view.test) {
            const a = at(view.test.a);
            const b = at(view.test.b);
            const visible = view.test.outcome === "visible";
            objects.push(curve("monotonetri-test", [a.x, b.x], [a.y, b.y], {
                strokeColor: visible ? GraphPalette.constructionAccent : GraphPalette.warningText, strokeWidth: 4, dash: visible ? 2 : 6, layer: 5,
            }));
            objects.push(text("monotonetri-test-label", (a.x + b.x) / 2, (a.y + b.y) / 2,
                () => (visible ? t("monotonetri_test_inside") : t("monotonetri_test_outside")), {anchorX: "middle", anchorY: "top"}));
        }
        // The stack: a hollow square around each stack vertex.
        for (const v of view.stack) {
            objects.push(marker("monotonetri-stack", v, {
                face: "square", size: 10, fillOpacity: 0, highlightFillOpacity: 0, strokeColor: GraphPalette.selectedControlPointOutline,
                strokeWidth: 2, layer: 6,
            }));
        }
        // Every vertex of the piece: a marker whose shape and colour follow its chain, and a text label with the chain.
        view.order.forEach((v, k) => {
            const chain = view.chains[k];
            const c = at(v);
            objects.push(marker("monotonetri-chain-marker", v, {
                face: CHAIN_FACES[chain], size: 7, fillColor: CHAIN_COLOURS[chain], strokeColor: GraphPalette.selectedControlPointOutline,
                strokeWidth: 1, layer: 6,
            }));
            this.chainNames.push({v, chain});
            // Placed beside its marker with the other names; the text sits at the centre of its box (before one exists, at the vertex).
            const centre = (axis: 0 | 1) => () => {
                const frame = pxFrame(this.board), box = this.placedNames()[`c${v}`];
                if (!frame || !box) return axis === 0 ? c.x : c.y;
                return axis === 0 ? frame.left + (box.x0 + box.x1) / 2 / this.board.unitX : frame.top - (box.y0 + box.y1) / 2 / this.board.unitY;
            };
            objects.push(text("monotonetri-chain-label", centre(0), centre(1), () => this.chainLabel(v, chain), {anchorX: "middle", anchorY: "middle"}));
        });
        // The current vertex: a ring around its marker.
        if (view.vertex !== null) {
            objects.push(marker("monotonetri-current", view.vertex, {
                face: "circle", size: 8, fillOpacity: 0, highlightFillOpacity: 0, strokeColor: ACTIVE_CONSTRUCTION_COLOR,
                strokeWidth: 1.5, layer: 7,
            }));
        }
        return objects;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly triangulationActions: MonotoneTriangulationControlActions = {
        nextStep: () => this.nextStep(),
        playPause: () => { if (this.isPlaying) this.pause(); else this.play(); },
        reset: () => this.resetTrace(),
        loadExample: id => this.loadModel(
            id === "example-1" ? MONOTONE_TRIANGULATION_EXAMPLE_1 : id === "example-2" ? MONOTONE_TRIANGULATION_EXAMPLE_2 : MONOTONE_TRIANGULATION_EXAMPLE_3),
    };

    protected override sideLists(): React.ReactNode {
        return <MonotoneTriangulationLists run={this.run()} step={this.step}/>;
    }

    protected override sweepControls(): React.ReactNode {
        return <MonotoneTriangulationControls run={this.run()} step={this.step} playing={this.isPlaying} actions={this.triangulationActions}
            exampleId={matchingExample(this.model, [{id: "example-1", ...MONOTONE_TRIANGULATION_EXAMPLE_1}, {id: "example-2", ...MONOTONE_TRIANGULATION_EXAMPLE_2}, {id: "example-3", ...MONOTONE_TRIANGULATION_EXAMPLE_3}])}>
            {this.sideLists()}
        </MonotoneTriangulationControls>;
    }
}
