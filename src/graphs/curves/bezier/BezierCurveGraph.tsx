import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BEZIER_HANDOFF_MAX_POINTS, BEZIER_HANDOFF_MIN_POINTS} from "../../../bezierHandoff";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {bezierPresetCollection} from "./collections";

class BezierCurveGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    protected override workspaceUsesStructuredEditing() { return true; }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            points: [[-4, -3], [-3, 2], [2, 2], [3, -2]]
        }]];
    }

    /** A host handoff (ADR 0038) goes through the Preset collection's check; anything it rejects leaves the default scene. */
    protected override initialPresetData(): CurveCollectionPresetData {
        const points = this.hostBridge.bezierHandoff;
        if (!points || points.length < BEZIER_HANDOFF_MIN_POINTS || points.length > BEZIER_HANDOFF_MAX_POINTS) return super.initialPresetData();
        const data = [["JSXBezierCurve", {points: points.map(p => [p[0], p[1]])}]];
        const checked = bezierPresetCollection.check(data);
        return "data" in checked ? checked.data : super.initialPresetData();
    }

    override presetCollection() {
        return bezierPresetCollection;
    }
}

export default BezierCurveGraph;
