import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class RationalBezierCurveGraph extends BaseRationalCurveGraph<BaseGraphStates> {

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -3]], "weights": [1, 2, 1, 1], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "subdivisionT": 0.5,
                "extrapolationT": 1.2,
                "showingWeights": true,
                "weightNumber": 1,
                "showingFarinPoints": false
            }
        }]];
    }

    override presetCollection() {
        return curvePresetCollections.rational;
    }

}


export default RationalBezierCurveGraph;
