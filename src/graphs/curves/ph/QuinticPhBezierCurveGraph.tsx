import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates} from "./BasePhBezierCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class QuinticPhBezierCurve extends BasePhBezierCurveGraph<BasePhBezierCurveGraphStates> {

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXPHBezierCurve", {
            "points": [[1, -1]], "hodographs": [[-3.3, 0], [0.2, -4], [2, -3.2]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2,
                "showOffsetCurveControlPoints": false,
                "showOffsetCurve": false
            }
        }]];
    }

    override presetCollection() {
        return curvePresetCollections["ph-quintic"];
    }

}

export default QuinticPhBezierCurve;
