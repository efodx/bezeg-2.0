import {JXGRationalBezierCurve} from "../object/./JXGRationalBezierCurve";
import BaseCurveGraph, {BaseGraphStates} from "../../base/BaseCurveGraph";

export abstract class BaseRationalCurveGraph<S extends BaseGraphStates> extends BaseCurveGraph<S> {
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    override initialize() {
        super.initialize();
        this.boardUpdate();
    }

    override getFirstJxgCurve(): JXGRationalBezierCurve {
        return super.getFirstJxgCurve() as JXGRationalBezierCurve;
    }
}
