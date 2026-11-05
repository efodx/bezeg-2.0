import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

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
        return curvePresetCollections["spline-c1"];
    }
}

export default C1SplineGraph;
