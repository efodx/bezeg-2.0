import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {c1SplinePresetCollection} from "./collections";
import {pickOn} from "../../../uxPicks/picks";
import type {GraphUx} from "../../../uxPicks/declare/graphUx";
import {GraphPalette} from "../../styles/GraphPalette";

/** The route's default scene; the curvature comb Demonstration starts its C1 spline from the same data. */
export function c1SplineDefaultPreset(): CurveCollectionPresetData {
    return [["JSXQuadraticC1SplineCurve", {
        "points": [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]], "degree": 2, "continuity": 1, "state": {
            "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
        }
    }]];
}

class C1SplineGraph extends BaseSplineCurveGraph<BaseGraphStates> {

    defaultPreset(): CurveCollectionPresetData {
        return c1SplineDefaultPreset();
    }

    override presetCollection() {
        return c1SplinePresetCollection;
    }

    /** The cards' declaration: what the spline is made of (pieces, free points, joints) and what is drawn. */
    protected override workspaceUx(): GraphUx | undefined {
        if (!pickOn("boardText")) return undefined;
        if (!this.state.initialized || !this.getFirstJxgCurve()) return undefined;
        const jxg = this.getFirstJxgCurve();
        const spline = this.getFirstCurve();
        const joints = spline.getNonFreePoints().length;
        const free = spline.getPoints().filter(point => !spline.getNonFreePoints().includes(point)).length;
        return {
            readouts: [
                {id: "spline", title: "Zlepek", rows: [
                    {id: "pieces", name: "odsekov", value: String(spline.getUnderlyingCurves().length)},
                    {id: "free-points", name: "prostih točk", value: String(free), legend: "free-points"},
                    {id: "joints", name: "stičnih točk", value: String(joints), legend: "joints"},
                ]},
            ],
            notes: [{id: "joints-rule", text: "Stične točke izračunamo iz prostih; pri enakomernih razmikih parametra so razpolovišča stranic kontrolnega poligona.", tone: "muted"}],
            legend: [
                {id: "curve", label: "Zlepek", kind: "line", color: GraphPalette.primaryCurve},
                ...(jxg.isShowingControlPolygon() ? [{id: "polygon", label: "Kontrolni poligon", kind: "dashed" as const, color: GraphPalette.controlPolygon}] : []),
                ...(jxg.isShowingJxgPoints() ? [{id: "free-points", label: "Proste točke", kind: "point" as const, color: GraphPalette.controlPoint}] : []),
                ...(jxg.isShowingJxgPoints() && !jxg.getHideFixed() && joints > 0 ? [{id: "joints", label: "Stične točke", kind: "point" as const, color: GraphPalette.splineJoin}] : []),
            ],
        };
    }
}

export default C1SplineGraph;
