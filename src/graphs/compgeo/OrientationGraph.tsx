import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t, useT} from "../../localization";
import {PointSetModel, gridToBoard} from "../../compgeo/pointSetModel";
import {ORIENTATION_OVERLAY_IDS, ORIENTATION_POINT_LIMIT, orientationPresetCollection} from "./compgeoPresetCollections";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {CompgeoRegionPalette} from "./CompgeoRegionPalette";
import {formatBoardSigned, OrientationReadout, orientationReadout, OrientationTurn, triangleFitsLabel} from "./orientationReadout";

/**
 * Orientation of three points (spec convexity-hulls-lessons A1): a `PointSetGraph` limited to three points with the
 * overlay `turn` (line pq, the triangle pqr shaded by the sign, and the turn in words). The exact value and the turn are
 * also written in a readout outside the board (`data-orientation-readout`, a live region). No route or catalog entry yet.
 */
export type OrientationOverlayId = "turn" | "values";

export {ORIENTATION_POINT_LIMIT};

/** p = (0, 0), q = (4, 0), r = (3, 2): twice the signed area is +8, a left turn. */
export const DEFAULT_ORIENTATION_MODEL: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 4, y: 0}, {x: 3, y: 2}],
};

const turnWord = (turn: OrientationTurn): string =>
    turn === "left" ? t("pointset_orientation_left") : turn === "right" ? t("pointset_orientation_right") : t("pointset_orientation_collinear");

/** The readout sentence; shared by the inspector and the board text. */
/** `exponent` is the grid step exponent: the grid-unit determinant is shown in board units (times 4^exponent). */
export function orientationText(readout: OrientationReadout, translate: typeof t, exponent = 0): string {
    if (readout.kind === "missing") return translate("pointset_orientation_missing", {value0: 3 - readout.have});
    const word = readout.turn === "left" ? translate("pointset_orientation_left")
        : readout.turn === "right" ? translate("pointset_orientation_right") : translate("pointset_orientation_collinear");
    return translate("pointset_orientation_readout", {value0: formatBoardSigned(readout.value, 2 * exponent, currentLanguage()), value1: word});
}

function OrientationStatus({points, exponent, valuesShown}: {points: PointSetModel["points"]; exponent: number; valuesShown: boolean}) {
    const translate = useT();
    if (!valuesShown) return <p className="inspector-help pointset-status" role="status" data-orientation-readout="" data-orientation-value="">{translate("pointset_values_hidden")}</p>;
    const readout = orientationReadout(points);
    return <p className="inspector-help pointset-status" role="status" data-orientation-readout={readout.kind === "turn" ? readout.turn : "missing"}
              data-orientation-value={readout.kind === "turn" ? readout.value * 4 ** exponent : ""}>{orientationText(readout, translate, exponent)}</p>;
}

export class OrientationGraph extends PointSetGraph<OrientationOverlayId> {
    private unsubscribeLanguage?: () => void;

    constructor() {
        super({pointLimit: ORIENTATION_POINT_LIMIT});
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        // The board text is a function of the current language; a switch only has to redraw it.
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = onLanguageChange(() => {
            if (this.hasBoard) this.board.fullUpdate();
        });
    }

    override unmount(): void {
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = undefined;
        super.unmount();
    }

    override getInitialState(): PointSetGraphState {
        return {...super.getInitialState(), overlays: {turn: true, values: true}};
    }

    override defaultPreset(): PointSetModel {
        return {...DEFAULT_ORIENTATION_MODEL, points: DEFAULT_ORIENTATION_MODEL.points.map(p => ({...p}))};
    }

    protected override overlayIds() {
        return ORIENTATION_OVERLAY_IDS;
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return orientationPresetCollection;
    }

    protected override overlayLabel(id: "grid" | OrientationOverlayId): string {
        if (id === "values") return t("pointset_overlay_values");
        return id === "turn" ? t("pointset_orientation_overlay_turn") : super.overlayLabel(id);
    }

    protected override drawOverlay(id: "grid" | OrientationOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "values") return [];
        if (id !== "turn") return super.drawOverlay(id, model);
        const readout = orientationReadout(model.points);
        if (model.points.length < 2) return [];
        const exponent = model.gridStepExponent;
        const [p, q, r] = model.points.map(point => gridToBoard(point, exponent));
        const objects: JXG.GeometryElement[] = [];
        objects.push(this.board.create("line", [[p.x, p.y], [q.x, q.y]], {
            straightFirst: true, straightLast: true, strokeColor: GraphPalette.referenceCurve, strokeWidth: 1.5, dash: 2,
            highlight: false, fixed: true, layer: 3, name: "turn-line",
        }) as JXG.GeometryElement);
        if (readout.kind !== "turn") return objects;
        if (readout.turn !== "collinear") {
            const fill = readout.turn === "left" ? CompgeoRegionPalette.positiveFill : CompgeoRegionPalette.negativeFill;
            const boundary = readout.turn === "left" ? CompgeoRegionPalette.positiveBoundary : CompgeoRegionPalette.negativeBoundary;
            objects.push(this.board.create("polygon", [[p.x, p.y], [q.x, q.y], [r.x, r.y]], {
                // The vertices and borders are the graph's own points and segments; the shaded face is all this adds.
                vertices: {visible: false, fixed: true, withLabel: false, name: "turn-vertex"},
                borders: {visible: false, fixed: true, highlight: false},
                fillColor: fill, fillOpacity: 0.9, highlight: false, fixed: true, layer: 2, name: "turn-triangle", withLabel: false,
            }) as JXG.GeometryElement);
            // The p-q base is already the dashed turn line; draw only the other two sides as the region boundary.
            for (const [from, to] of [[p, r], [r, q]] as const) {
                objects.push(this.board.create("curve", [[from.x, to.x], [from.y, to.y]], {
                    name: "turn-side", highlight: false, fixed: true, layer: 4, strokeColor: boundary, strokeWidth: 1.25,
                }) as JXG.GeometryElement);
            }
        }
        // A label would cover the vertices of a thin or tiny triangle (under one board unit tall), so none is drawn then.
        if (!this.overlayShown("values")) return objects;
        if (!triangleFitsLabel(model.points[0], model.points[1], model.points[2], exponent)) return objects;
        const value = readout.value;
        const centre = {x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3};
        objects.push(this.board.create("text", [centre.x, centre.y, () => {
            const live = orientationReadout(model.points);
            return live.kind === "turn" ? `${formatBoardSigned(value, 2 * exponent, currentLanguage())}: ${turnWord(live.turn)}` : "";
        }], {
            anchorX: "middle", anchorY: "middle", fontSize: 14, strokeColor: GraphPalette.label, highlight: false, fixed: true,
            layer: 8, display: "html", name: "turn-text", cssStyle: "pointer-events:none;",
        }) as JXG.GeometryElement);
        return objects;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <OrientationStatus points={this.model.points} exponent={this.model.gridStepExponent} valuesShown={this.overlayShown("values")}/>
            {super.workspaceEdit()}
        </>;
    }
}
