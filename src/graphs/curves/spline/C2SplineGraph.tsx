import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class Graph extends BaseSplineCurveGraph<BaseGraphStates> {

    override presetCollection() {
        return curvePresetCollections["spline-c2"];
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXQubicC2SplineCurve", {
            "points": [[-2.7, 1.8], [-4.7, 0.35], [-4.3, -3], [1, -2], [0.2, 1.8], [4, 1], [4.5, -2.3]],
            "degree": 3,
            "continuity": 3,
            "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }


}

export default Graph;
