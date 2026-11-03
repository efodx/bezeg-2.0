import React from "react";
import {t} from "../../localization";
import {gridToBoard, PointSetModel} from "../../compgeo/pointSetModel";
import type {GridPoint} from "../../compgeo/grid";
import type {Chain} from "../../compgeo/sweep/monotoneTriangulation";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {ACTIVE_CONSTRUCTION_COLOR} from "./constructionEmphasis";
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
 * piece. Next step and every Play tick run the parent's one `advance()`, so both reach identical states.
 */
export class MonotoneTriangulationGraph extends MonotonePartitionGraph {
    private triMemo?: {points: PointSetModel["points"]; run: TriangulationRun};

    override run(): TriangulationRun {
        const points = this.model.points;
        if (this.triMemo?.points !== points) this.triMemo = {points, run: runMonotoneTriangulation(this.verticesForTrace())};
        return this.triMemo.run;
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
        const text = (name: string, x: number, y: number, content: string | (() => string), attributes: Record<string, unknown>) =>
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
            objects.push(text("monotonetri-chain-label", c.x, c.y, () => `${vertexName(v)} ${chainText(t, chain)}`, {anchorX: "left", anchorY: "bottom"}));
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
        loadExample: index => this.loadModel(
            index === 1 ? MONOTONE_TRIANGULATION_EXAMPLE_1 : index === 2 ? MONOTONE_TRIANGULATION_EXAMPLE_2 : MONOTONE_TRIANGULATION_EXAMPLE_3),
    };

    protected override sideLists(): React.ReactNode {
        return <MonotoneTriangulationLists run={this.run()} step={this.step}/>;
    }

    protected override sweepControls(): React.ReactNode {
        return <MonotoneTriangulationControls run={this.run()} step={this.step} playing={this.isPlaying} actions={this.triangulationActions}>
            {this.sideLists()}
        </MonotoneTriangulationControls>;
    }
}
