import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {t, useLanguage, useT} from "../../localization";
import {gridToBoard, PointSetModel, reverseVertices} from "../../compgeo/pointSetModel";
import {doubledFanAreas} from "../../compgeo/polygonMeasures";
import {GraphPalette} from "../styles/GraphPalette";
import {AreaReadout, areaReadout, latticeMarkers} from "./areaReadout";
import {formatHalf, formatSigned, triangleFitsLabel} from "./orientationReadout";

/**
 * Polygon area and Pick's theorem (spec convexity-hulls-lessons A2): a `PointSetGraph` in polygon mode, closed by default,
 * with the overlays `fan` (triangles from vertex 0, each labelled with its signed doubled area) and `lattice` (boundary
 * points as squares, interior points as crosses, so shape and not only colour tells them apart), a readout outside the
 * board (`data-area-readout`) built by the pure `areaReadout`, and a Reverse order control (`reverseVertices`). Vertices are
 * grid points by the base graph's snapping, so every count is exact. No route or catalog entry yet.
 */
export type PolygonAreaOverlayId = "fan" | "lattice";

/** The hull pentagon: doubled area 42, B = 8, I = 18 (Pick: 2*18 + 8 - 2 = 42). */
export const HULL_PENTAGON_MODEL: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0, points: [{x: -1, y: 3}, {x: 0, y: 0}, {x: 4, y: 0}, {x: 5, y: 3}, {x: 2, y: 5}],
};

/** The notched pentagon: doubled area 36, B = 16, I = 11. */
export const NOTCHED_PENTAGON_MODEL: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 6, y: 0}, {x: 6, y: 4}, {x: 3, y: 2}, {x: 0, y: 4}],
};

const copy = (model: PointSetModel): PointSetModel => ({...model, points: model.points.map(p => ({...p}))});

function AreaStatus({model}: {model: PointSetModel}) {
    const translate = useT();
    const {language} = useLanguage();
    const readout: AreaReadout = areaReadout(model);
    // One concise line is live (the area, or why there is none); the remaining rows are plain text, read on demand.
    let live: string;
    let lines: string[];
    if (readout.kind === "message") {
        live = readout.reason === "open" ? translate("pointset_area_open") : translate("pointset_area_too_few", {value0: 3 - model.points.length});
        lines = [];
    } else if (readout.kind === "signed-sum") {
        live = translate("pointset_area_not_simple");
        lines = [translate("pointset_area_signed_sum", {value0: formatSigned(readout.doubledSum)})];
    } else {
        live = translate("pointset_area_value", {value0: formatHalf(readout.doubledArea, language)});
        lines = [
            translate("pointset_area_doubled", {value0: formatSigned(readout.doubledSigned)}),
            ...(readout.orientation === "ccw" ? [translate("pointset_area_ccw")] : readout.orientation === "cw" ? [translate("pointset_area_cw")] : []),
            translate("pointset_area_boundary", {value0: readout.boundary}),
            readout.interior === undefined ? translate("pointset_area_interior_skipped") : translate("pointset_area_interior", {value0: readout.interior}),
            ...(readout.pick === undefined ? [] : [readout.pick.holds
                ? translate("pointset_area_pick_holds", {value0: readout.pick.doubledValue, value1: String(readout.doubledArea)})
                : translate("pointset_area_pick_differs", {value0: readout.pick.doubledValue, value1: String(readout.doubledArea)})]),
        ];
    }
    return <div className="inspector-help pointset-status" data-area-readout={readout.kind}
                data-area-doubled={readout.kind === "simple" ? String(readout.doubledSigned) : readout.kind === "signed-sum" ? String(readout.doubledSum) : ""}>
        <p className="mb-1" role="status" data-area-live="">{live}</p>
        {lines.map((line, i) => <p key={i} className="mb-1">{line}</p>)}
    </div>;
}

function ReverseControl({disabled, onReverse}: {disabled: boolean; onReverse: () => void}) {
    const translate = useT();
    return <div className="inspector-group">
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={disabled} onClick={onReverse}>{translate("pointset_area_reverse")}</button>
    </div>;
}

export class PolygonAreaGraph extends PointSetGraph<PolygonAreaOverlayId> {
    override getInitialState(): PointSetGraphState {
        return {...super.getInitialState(), overlays: {fan: true, lattice: true}};
    }

    override defaultPreset(): PointSetModel {
        return copy(HULL_PENTAGON_MODEL);
    }

    /** Reverses the vertex order (v0 stays first); the selection follows its vertex. Returns false when there is nothing to reverse. */
    reverseOrder(): boolean {
        const model = this.model;
        if (model.points.length < 2) return false;
        const selected = this.selectedIndex;
        this.setState({model: reverseVertices(model)});
        this.select(selected === undefined ? undefined : selected === 0 ? 0 : model.points.length - selected);
        this.requestRender();
        return true;
    }

    protected override overlayIds() {
        return [...super.overlayIds(), "fan" as const, "lattice" as const];
    }

    protected override overlayLabel(id: "grid" | PolygonAreaOverlayId): string {
        if (id === "fan") return t("pointset_area_overlay_fan");
        if (id === "lattice") return t("pointset_area_overlay_lattice");
        return super.overlayLabel(id);
    }

    protected override drawOverlay(id: "grid" | PolygonAreaOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "fan") return this.drawFan(model);
        if (id === "lattice") return this.drawLattice(model);
        return super.drawOverlay(id, model);
    }

    private drawFan(model: PointSetModel): JXG.GeometryElement[] {
        if (model.mode !== "polygon" || !model.closed || model.points.length < 3) return [];
        const exponent = model.gridStepExponent;
        const at = model.points.map(point => gridToBoard(point, exponent));
        const objects: JXG.GeometryElement[] = [];
        doubledFanAreas(model.points).forEach((doubled, k) => {
            const corners = [at[0], at[k + 1], at[k + 2]];
            if (doubled !== 0n) {
                objects.push(this.board.create("polygon", corners.map(c => [c.x, c.y]), {
                    vertices: {visible: false, fixed: true, withLabel: false, name: "fan-vertex"},
                    borders: {visible: false, fixed: true, highlight: false},
                    fillColor: doubled > 0n ? GraphPalette.primaryCurve : GraphPalette.comparisonCurve, fillOpacity: 0.22,
                    highlight: false, fixed: true, layer: 2, name: "fan-triangle", withLabel: false,
                }) as JXG.GeometryElement);
            }
            if (!triangleFitsLabel(model.points[0], model.points[k + 1], model.points[k + 2])) return;
            objects.push(this.board.create("text", [
                (corners[0].x + corners[1].x + corners[2].x) / 3, (corners[0].y + corners[1].y + corners[2].y) / 3, formatSigned(doubled),
            ], {
                anchorX: "middle", anchorY: "middle", fontSize: 13, strokeColor: GraphPalette.label, highlight: false, fixed: true,
                layer: 8, display: "html", name: "fan-label", cssStyle: "pointer-events:none;",
            }) as JXG.GeometryElement);
        });
        return objects;
    }

    private drawLattice(model: PointSetModel): JXG.GeometryElement[] {
        const markers = latticeMarkers(model);
        if (markers.kind !== "points") return [];
        const exponent = model.gridStepExponent;
        const mark = (point: {x: number; y: number}, face: string, size: number, color: string) => {
            const at = gridToBoard(point, exponent);
            return this.board.create("point", [at.x, at.y], {
                name: "lattice-marker", withLabel: false, face, size, fillColor: color, strokeColor: color, strokeWidth: 2,
                highlight: false, fixed: true, showInfobox: false, layer: 4,
            }) as JXG.GeometryElement;
        };
        return [
            ...markers.interior.map(point => mark(point, "x", 4, GraphPalette.comparisonCurve)),
            ...markers.boundary.map(point => mark(point, "[]", 5, GraphPalette.constructionAccent)),
        ];
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <AreaStatus model={this.model}/>
            <ReverseControl disabled={this.model.points.length < 2} onReverse={() => { this.reverseOrder(); }}/>
            {super.workspaceEdit()}
        </>;
    }
}
