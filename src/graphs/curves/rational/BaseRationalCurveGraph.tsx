import {JXGRationalBezierCurve} from "../object/./JXGRationalBezierCurve";
import BaseCurveGraph, {BaseGraphStates} from "../../base/BaseCurveGraph";

export abstract class BaseRationalCurveGraph<S extends BaseGraphStates> extends BaseCurveGraph<S> {
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    /** Opt-in (task 08, lane L45): true declares the curve workspace (legend, marks, display switches, the weights switch). Other subclasses keep their panels. */
    protected declaresRationalWorkspace(): boolean { return false; }
    protected override declaresCurveWorkspace(): boolean { return this.declaresRationalWorkspace(); }
    override initialize() {
        super.initialize();
        this.boardUpdate();
    }

    override getFirstJxgCurve(): JXGRationalBezierCurve {
        return super.getFirstJxgCurve() as JXGRationalBezierCurve;
    }
}
