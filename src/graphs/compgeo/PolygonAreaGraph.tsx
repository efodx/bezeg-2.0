import React, {useMemo, useState} from "react";
import {RefusalChannel, RefusalNotice} from "../../inputs/RefusalChannel";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {StatusLive} from "./StatusLive";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {currentLanguage, t, useLanguage, useT} from "../../localization";
import {gridToBoard, PointSetModel, reverseVertices} from "../../compgeo/pointSetModel";
import {doubledFanAreas} from "../../compgeo/polygonMeasures";
import {POLYGON_AREA_OVERLAY_IDS, polygonAreaPresetCollection} from "./compgeoPresetCollections";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {CompgeoRegionPalette} from "./CompgeoRegionPalette";
import {AreaReadout, areaReadout, latticeMarkers} from "./areaReadout";
import {formatBoardHalf, formatBoardSigned, triangleFitsLabel} from "./orientationReadout";

/**
 * Polygon area and Pick's theorem (spec convexity-hulls-lessons A2): a `PointSetGraph` in polygon mode, closed by default,
 * with the overlays `fan` (triangles from vertex 0, each labelled with its signed doubled area) and `lattice` (boundary
 * points as squares, interior points as crosses, so shape and not only colour tells them apart), a readout outside the
 * board (`data-area-readout`) built by the pure `areaReadout`, and a Reverse order control (`reverseVertices`). Vertices are
 * grid points by the base graph's snapping, so every count is exact. No route or catalog entry yet.
 */
export type PolygonAreaOverlayId = "fan" | "lattice" | "values";

/** The hull pentagon: doubled area 42, B = 8, I = 18 (Pick: 2*18 + 8 - 2 = 42). */
export const HULL_PENTAGON_MODEL: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0, points: [{x: -1, y: 3}, {x: 0, y: 0}, {x: 4, y: 0}, {x: 5, y: 3}, {x: 2, y: 5}],
};

/** The notched pentagon: doubled area 36, B = 16, I = 11. */
export const NOTCHED_PENTAGON_MODEL: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 6, y: 0}, {x: 6, y: 4}, {x: 3, y: 2}, {x: 0, y: 4}],
};

const copy = (model: PointSetModel): PointSetModel => ({...model, points: model.points.map(p => ({...p}))});

/** A machine-readable board value (plain digits, "." separator) of a grid-unit doubled value. */
const scaledText = (value: bigint, exponent = 0): string => exponent === 0 ? String(value) : String(Number(value) * 2 ** exponent);

function AreaStatus({model, valuesShown}: {model: PointSetModel; valuesShown: boolean}) {
    const translate = useT();
    const {language} = useLanguage();
    if (!valuesShown) return <><div className="inspector-help pointset-status" data-area-readout="" data-area-doubled=""><p className="mb-1" data-area-live="">{translate("pointset_values_hidden")}</p></div><StatusLive text={translate("pointset_values_hidden")}/></>;
    const readout: AreaReadout = areaReadout(model);
    // One concise line is live (the area, or why there is none); the remaining rows are plain text, read on demand.
    let live: string;
    let lines: string[];
    if (readout.kind === "message") {
        live = readout.reason === "open" ? translate("pointset_area_open") : translate("pointset_area_too_few", {value0: 3 - model.points.length});
        lines = [];
    } else if (readout.kind === "signed-sum") {
        live = translate("pointset_area_not_simple");
        lines = [translate("pointset_area_signed_sum", {value0: formatBoardSigned(readout.doubledSum, readout.areaExponent ?? 0, language)})];
    } else {
        const scale = readout.areaExponent ?? 0;
        live = translate("pointset_area_value", {value0: formatBoardHalf(readout.doubledArea, readout.areaExponent ?? 0, language)});
        lines = [
            translate("pointset_area_doubled", {value0: formatBoardSigned(readout.doubledSigned, scale, language)}),
            ...(readout.orientation === "ccw" ? [translate("pointset_area_ccw")] : readout.orientation === "cw" ? [translate("pointset_area_cw")] : []),
            ...(readout.countsOmitted ? [] : [
                translate("pointset_area_boundary", {value0: readout.boundary}),
                readout.interior === undefined ? translate("pointset_area_interior_skipped") : translate("pointset_area_interior", {value0: readout.interior}),
            ]),
            ...(readout.pick === undefined ? [] : [readout.pick.holds
                ? translate("pointset_area_pick_holds", {value0: readout.pick.doubledValue, value1: formatBoardSigned(readout.doubledArea, scale, language).replace(/^\+/, "")})
                : translate("pointset_area_pick_differs", {value0: readout.pick.doubledValue, value1: formatBoardSigned(readout.doubledArea, scale, language).replace(/^\+/, "")})]),
        ];
    }
    return <><div className="inspector-help pointset-status" data-area-readout={readout.kind}
                data-area-doubled={readout.kind === "simple" ? scaledText(readout.doubledSigned, readout.areaExponent) : readout.kind === "signed-sum" ? scaledText(readout.doubledSum, readout.areaExponent) : ""}>
        <p className="mb-1" data-area-live="">{live}</p>
        {lines.map((line, i) => <p key={i} className="mb-1">{line}</p>)}
    </div><StatusLive text={live}/></>;
}

function ReverseControl({disabled, onReverse}: {disabled: boolean; onReverse: () => void}) {
    const translate = useT();
    const reason = disabled ? translate("pointset_area_reverse_few") : undefined;
    // A press while unavailable shows the reason alone, in the shared refusal region, until Reverse becomes available again.
    const [pressed, setPressed] = useState(0);
    // The press belongs to the block it happened in: once the reason clears, a later re-block shows nothing until pressed again.
    if (reason === undefined && pressed > 0) setPressed(0);
    const channel = useMemo(() => {
        const next = new RefusalChannel();
        if (pressed > 0 && reason !== undefined) next.refuse(reason, true);
        return next;
    }, [pressed, reason]);
    return <div className="inspector-group">
        <UnavailableButton className="btn btn-outline-secondary btn-sm" reason={reason} onPress={onReverse} onBlockedPress={() => setPressed(count => count + 1)}>
            {translate("pointset_area_reverse")}
        </UnavailableButton>
        <RefusalNotice channel={channel}/>
    </div>;
}

export class PolygonAreaGraph extends PointSetGraph<PolygonAreaOverlayId> {
    override getInitialState(): PointSetGraphState {
        return {...super.getInitialState(), overlays: {fan: true, lattice: true, values: true}};
    }

    override defaultPreset(): PointSetModel {
        return copy(HULL_PENTAGON_MODEL);
    }

    /** The default example (x -1 to 5, y 0 to 5) with a half-unit margin; the app default box would put its top point on the frame. */
    protected override initialView(): [number, number, number, number] {
        return [-1.5, 5.5, 5.5, -0.5];
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
        return POLYGON_AREA_OVERLAY_IDS;
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return polygonAreaPresetCollection;
    }

    protected override overlayLabel(id: "grid" | PolygonAreaOverlayId): string {
        if (id === "fan") return t("pointset_area_overlay_fan");
        if (id === "lattice") return t("pointset_area_overlay_lattice");
        if (id === "values") return t("pointset_overlay_values");
        return super.overlayLabel(id);
    }

    protected override drawOverlay(id: "grid" | PolygonAreaOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "fan") return this.drawFan(model);
        if (id === "lattice") return this.drawLattice(model);
        if (id === "values") return [];
        return super.drawOverlay(id, model);
    }

    private drawFan(model: PointSetModel): JXG.GeometryElement[] {
        if (model.mode !== "polygon" || !model.closed || model.points.length < 3) return [];
        const exponent = model.gridStepExponent;
        const at = model.points.map(point => gridToBoard(point, exponent));
        const objects: JXG.GeometryElement[] = [];
        // Draw each internal fan edge once; shared fills alone hide the decomposition.
        for (let k = 2; k < at.length - 1; k++) {
            objects.push(this.board.create("curve", [[at[0].x, at[k].x], [at[0].y, at[k].y]], {
                name: "fan-diagonal", withLabel: false, highlight: false, fixed: true, layer: 3,
                strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth,
            }) as JXG.GeometryElement);
        }
        doubledFanAreas(model.points).forEach((doubled, k) => {
            const corners = [at[0], at[k + 1], at[k + 2]];
            if (doubled !== 0n) {
                objects.push(this.board.create("polygon", corners.map(c => [c.x, c.y]), {
                    vertices: {visible: false, fixed: true, withLabel: false, name: "fan-vertex"},
                    borders: {visible: false, fixed: true, highlight: false},
                    fillColor: doubled > 0n ? CompgeoRegionPalette.positiveFill : CompgeoRegionPalette.negativeFill, fillOpacity: 0.82,
                    highlight: false, fixed: true, layer: 2, name: "fan-triangle", withLabel: false,
                }) as JXG.GeometryElement);
            }
            if (!this.overlayShown("values") || !triangleFitsLabel(model.points[0], model.points[k + 1], model.points[k + 2], exponent)) return;
            objects.push(this.board.create("text", [
                (corners[0].x + corners[1].x + corners[2].x) / 3, (corners[0].y + corners[1].y + corners[2].y) / 3, formatBoardSigned(doubled, 2 * exponent, currentLanguage()),
            ], {
                anchorX: "middle", anchorY: "middle", fontSize: 13, strokeColor: GraphPalette.label, highlight: false, fixed: true,
                layer: 8, display: "html", name: "fan-label",
                cssStyle: `pointer-events:none;background:${GraphPalette.boardSurface};padding:0 2px;`,
            }) as JXG.GeometryElement);
        });
        return objects;
    }

    private drawLattice(model: PointSetModel): JXG.GeometryElement[] {
        const markers = latticeMarkers(model);
        if (markers.kind !== "points") return [];
        const mark = (point: {x: number; y: number}, face: string, size: number, color: string) => {
            return this.board.create("point", [point.x, point.y], {
                name: "lattice-marker", withLabel: false, face, size, fillColor: color, strokeColor: color, strokeWidth: 2,
                highlight: false, fixed: true, showInfobox: false, layer: 4,
            }) as JXG.GeometryElement;
        };
        return [
            ...markers.interior.map(point => mark(point, "x", 3.5, CompgeoRegionPalette.latticeInterior)),
            ...markers.boundary.map(point => mark(point, "[]", 4, CompgeoRegionPalette.latticeBoundary)),
        ];
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <AreaStatus model={this.model} valuesShown={this.overlayShown("values")}/>
            <ReverseControl disabled={this.model.points.length < 2} onReverse={() => { this.reverseOrder(); }}/>
            {super.workspaceEdit()}
        </>;
    }
}
