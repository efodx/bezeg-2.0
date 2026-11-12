import {t} from "../../../localization";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {JXGGenericSplineCurve} from "../object/JXGGenericSplineCurve";
import {GenericSplineChange} from "../../../bezeg/impl/curve/GenericBezierSpline";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {CountSetter} from "../../../inputs/CountSetter";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {cnSplinePresetCollection} from "./collections";

class Graph extends BaseSplineCurveGraph<BaseGraphStates> {

    override presetCollection() {
        return cnSplinePresetCollection;
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXGenericSplineCurve", {
            "points": [[-3, 2], [-4, 0.5], [-3.5, -1], [-1.5, -2], [0.5, 0], [2.5, 1.5], [4, -2]],
            "degree": 2,
            "continuity": 1,
            "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('spline-continuity', action => this.setContinuityOrDegree(action));
        registry.on('spline-degree', action => this.setContinuityOrDegree(action));
    }

    private setContinuityOrDegree(action: { kind: 'spline-continuity' | 'spline-degree', value: number }): void {
        // The model validates the completed target; a rejected one throws before anything changes.
        this.changeSpline(action.kind === 'spline-continuity' ? {continuity: action.value} : {degree: action.value});
        // The counters read the actual values while rendering.
        this.refreshSplineSwitches();
    }

    /** One completed change: the model regenerates once and the adapter redraws once. */
    private changeSpline(target: GenericSplineChange): void {
        this.board.suspendUpdate();
        try {
            this.getFirstJxgCurve().changeSpline(target);
        } finally {
            this.unsuspendBoardUpdate();
        }
    }

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const spline = this.getFirstJxgCurve().getCurve();
        return super.getGraphCommands().concat([
            <div>
                <CountSetter label={t("continuity_order")}
                             onPlus={() => this.stepContinuity(1)}
                             n={spline.getContinuity()}
                             onMinus={() => this.stepContinuity(-1)}
                             onSet={value => this.setTyped({continuity: value})}
                             min={spline.continuityRange().min} max={spline.continuityRange().max}></CountSetter>
            </div>, <div>
                <CountSetter label={t("spline_degree")}
                             onPlus={() => this.stepDegree(1)}
                             n={spline.getDegree()}
                             onMinus={() => this.stepDegree(-1)}
                             onSet={value => this.setTyped({degree: value})}
                             min={spline.degreeRange().min} max={spline.degreeRange().max}></CountSetter>
            </div>]);
    }

    override getFirstJxgCurve(): JXGGenericSplineCurve {
        return super.getFirstJxgCurve() as JXGGenericSplineCurve;
    }

    // Read the live curve at click time: a Reset or Preset import may have replaced it since the last render.
    /** A typed count: the field already kept it inside the displayed range; the model still validates the completed target and a rejected one changes nothing. */
    private setTyped(target: GenericSplineChange): boolean {
        try {
            this.changeSpline(target);
        } catch {
            return false;
        }
        this.store.notify();
        return true;
    }

    private stepContinuity(delta: number) {
        this.changeSpline({continuity: this.getFirstJxgCurve().getCurve().getContinuity() + delta});
        this.store.notify();
    }

    private stepDegree(delta: number) {
        this.changeSpline({degree: this.getFirstJxgCurve().getCurve().getDegree() + delta});
        this.store.notify();
    }
}

export default Graph;
