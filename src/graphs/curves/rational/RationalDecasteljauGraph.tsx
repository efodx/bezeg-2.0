import DecasteljauGraph from "../bezier/DecasteljauGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class RationalDecasteljauGraph extends DecasteljauGraph {

    override defaultPreset(): CurveCollectionPresetData {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -3]], "weights": [1, 2, 1, 1], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "subdivisionT": 0.5,
                "extrapolationT": 1.2,
                "showingWeights": false,
                "weightNumber": 1,
                "showingFarinPoints": false,
                "showingDecasteljauScheme": true
            }
        }]];
    }

    override presetCollection() {
        return curvePresetCollections["rational-decasteljau"];
    }

}

export default RationalDecasteljauGraph;
