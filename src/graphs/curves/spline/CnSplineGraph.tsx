import {t} from "../../../localization";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {JXGGenericSplineCurve} from "../object/JXGGenericSplineCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {CountSetter} from "../../../inputs/CountSetter";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

class Graph extends BaseSplineCurveGraph<BaseGraphStates> {

    override presets(): string {
        return "cn-spline";
    }

    defaultPreset(): any {
        return [["JSXGenericSplineCurve", {
            "points": [[-3, 2], [-4, 0.5], [-3.5, -1], [-1.5, -2, 5], [0.5, 0], [2.5, 1.5], [4, -2]],
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
        const target = action.value;
        const curve = this.getFirstJxgCurve().getCurve();
        const degree = curve.getDegree(), continuity = curve.getContinuity();
        if (action.kind === 'spline-continuity') {
            if (!Number.isInteger(target) || target < 0 || target > degree - 1) {
                throw new Error(`The continuity order must be a whole number from 0 to ${degree - 1} at degree ${degree}.`);
            }
        } else {
            const max = curve.getPoints().length;
            if (!Number.isInteger(target) || target < continuity + 1 || target > max) {
                throw new Error(`The degree must be a whole number from ${continuity + 1} to ${max} at continuity ${continuity}.`);
            }
        }
        this.board.suspendUpdate();
        try {
            const jxg = this.getFirstJxgCurve();
            const read = () => action.kind === 'spline-continuity' ? curve.getContinuity() : curve.getDegree();
            // Each step stays inside the bounds validated above, because the target is within them.
            while (read() < target) {
                action.kind === 'spline-continuity' ? jxg.increaseContinuity() : jxg.increaseDegree();
            }
            while (read() > target) {
                action.kind === 'spline-continuity' ? jxg.decreaseContinuity() : jxg.decreaseDegree();
            }
        } finally {
            this.unsuspendBoardUpdate();
        }
        // The counters read the actual values while rendering.
        this.refreshSplineSwitches();
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <div>
                <CountSetter label={t("continuity_order")} onPlus={() => this.increaseContinuity()}
                             n={this.getFirstJxgCurve().getCurve().getContinuity()}
                             onMinus={() => this.decreaseContinuity()} min={0}
                             max={() => this.getFirstJxgCurve().getCurve().getDegree() - 1}></CountSetter>
            </div>, <div>
                <CountSetter label={t("spline_degree")} onPlus={() => this.increaseDegree()}
                             n={this.getFirstJxgCurve().getCurve().getDegree()}
                             onMinus={() => this.decreaseDegree()}
                             min={() => this.getFirstJxgCurve().getCurve().getContinuity() + 1}
                             max={() => this.getFirstJxgCurve().getCurve().getPoints().length}></CountSetter>
            </div>]) : [];
    }

    override getFirstJxgCurve(): JXGGenericSplineCurve {
        return super.getFirstJxgCurve() as JXGGenericSplineCurve;
    }

    private increaseContinuity() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().increaseContinuity();
        this.unsuspendBoardUpdate();
        this.store.notify();
    }

    private decreaseContinuity() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().decreaseContinuity();
        this.unsuspendBoardUpdate();
        this.store.notify();
    }

    private increaseDegree() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().increaseDegree();
        this.unsuspendBoardUpdate();
        this.store.notify();
    }

    private decreaseDegree() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().decreaseDegree();
        this.unsuspendBoardUpdate();
        this.store.notify();

    }
}

export default Graph;
