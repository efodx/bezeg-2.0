import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates} from "./BasePhBezierCurveGraph";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {quinticPhPresetCollection} from "./collections";

class QuinticPhBezierCurve extends BasePhBezierCurveGraph<BasePhBezierCurveGraphStates> {

    /** Same PH workspace as the cubic: offset distance d puck while offsets are drawn (lesson steps `ph-quintic-offset-positive`, `-offset-sign`), arc length row. */
    protected override declaresPhWorkspace() { return true; }

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
        return quinticPhPresetCollection;
    }

}

export default QuinticPhBezierCurve;
