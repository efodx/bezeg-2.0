import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class BezierCurveGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    protected override workspaceUsesStructuredEditing() { return true; }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            points: [[-4, -3], [-3, 2], [2, 2], [3, -2]]
        }]];
    }

    override presetCollection() {
        return curvePresetCollections.bezier;
    }
}

export default BezierCurveGraph;
