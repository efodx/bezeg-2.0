import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class C1SplineGraph extends BaseSplineCurveGraph<BaseGraphStates> {

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXQuadraticC1SplineCurve", {
            "points": [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]], "degree": 2, "continuity": 1, "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    override presetCollection() {
        return curvePresetCollections["spline-c1"];
    }
}

export default C1SplineGraph;
