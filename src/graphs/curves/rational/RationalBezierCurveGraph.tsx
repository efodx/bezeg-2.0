import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import type {GraphDeclaration} from "../../base/declare/graphDeclaration";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {rationalPresetCollection} from "./collections";

class RationalBezierCurveGraph extends BaseRationalCurveGraph<BaseGraphStates> {

    /**
     * The common curve declaration. Weights stay beside their control points as the board labels w_i (lessons set the weights through
     * scene actions and the learner reads them; no step asks the learner to vary one, so no puck per weight). The weights, point
     * label and control point switches are display settings in Orodja; the polygon and hull are pucks.
     */
    protected override declaresRationalWorkspace() { return true; }

    /**
     * The common declaration plus the box around the control points and curve samples, grown by a fifth with room above for the
     * labels. Without it the view director frames the lesson scene's box widened to the canvas aspect and the curve shrinks, so the
     * w_i labels crowd the B(1/2) label.
     */
    protected override declaration(): GraphDeclaration | undefined {
        const common = this.commonCurveDeclaration();
        const marks = common.marks;
        if (!marks) return common;
        const points = [...marks.must, ...(marks.nice ?? [])].flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : mark.kind === 'polyline' ? mark.points.map(p => [p[0], p[1]]) : []);
        if (points.length === 0) return common;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.5);
        return {...common, followView: [left - pad, top + 2 * pad, right + pad, bottom - pad]};
    }

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
        return rationalPresetCollection;
    }

}


export default RationalBezierCurveGraph;
