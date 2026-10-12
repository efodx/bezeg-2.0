import BaseCurveGraph, {BaseGraphStates} from "./BaseCurveGraph";
import {JXGBezierCurve} from "../curves/object/JXGBezierCurve";


export abstract class BaseBezierCurveGraph<S extends BaseGraphStates> extends BaseCurveGraph<S> {
    override getFirstJxgCurve() {
        return super.getFirstJxgCurve() as JXGBezierCurve;
    }

    override getSelectedCurve() {
        return super.getSelectedCurve() as JXGBezierCurve;
    }
}
