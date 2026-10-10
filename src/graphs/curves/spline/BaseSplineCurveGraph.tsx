import {t} from "../../../localization";
import BaseCurveGraph, {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BezierSpline} from "../../../bezeg/impl/curve/bezier-spline";
import {AbstractJXGSplineCurve} from "../object/AbstractJXGSplineCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonAction} from "../../../learning/model";

export abstract class BaseSplineCurveGraph<S extends BaseGraphStates> extends BaseCurveGraph<any, S> {
    override componentDidMount() {
        super.componentDidMount();
        this.getFirstJxgCurve().setAttributes({allowShowPoints: true});
    }

    /** Presets, lesson scenes and checkpoints replace the curve objects without calling componentDidMount(). */
    override importPresetData(data: any) {
        super.importPresetData(data);
        this.getFirstJxgCurve()?.setAttributes({allowShowPoints: true});
    }

    /** Bumped when a lesson action changes a switch, so the switches remount with the actual state. */
    protected splineSwitchRevision?: number;

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'spline-label-points') {
            if (typeof action.visible !== 'boolean') {
                throw new Error('Labelling all spline points must be switched on or off.');
            }
            this.setLabelAll(action.visible);
            this.refreshSplineSwitches();
            return;
        }
        if (action.kind === 'spline-hide-fixed') {
            if (typeof action.hidden !== 'boolean') {
                throw new Error('Hiding the derived spline points must be switched on or off.');
            }
            this.getFirstJxgCurve().setHideFixed(action.hidden);
            this.boardUpdate();
            this.refreshSplineSwitches();
            return;
        }
        super.applyLessonAction(action);
    }

    protected refreshSplineSwitches() {
        this.splineSwitchRevision = (this.splineSwitchRevision ?? 0) + 1;
        this.forceUpdate();
    }

    override getFirstCurve(): BezierSpline {
        return super.getFirstCurve() as BezierSpline;
    }

    override getFirstJxgCurve(): AbstractJXGSplineCurve<any> {
        return super.getFirstJxgCurve() as AbstractJXGSplineCurve<any>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(<OnOffSwitch
            key={`label-${this.workspaceRevision}-${this.splineSwitchRevision ?? 0}`}
            onChange={(checked) => this.setLabelAll(checked)}
            label={t("label_all_points")}
            initialState={this.getFirstJxgCurve().getLabelAll()}></OnOffSwitch>, <OnOffSwitch
            key={`hide-${this.workspaceRevision}-${this.splineSwitchRevision ?? 0}`}
            onChange={(checked) => this.getFirstJxgCurve().setHideFixed(checked)}
            label={t("hide_fixed_points")}
            initialState={this.getFirstJxgCurve().getHideFixed()}></OnOffSwitch>) : [];
    }

    protected setLabelAll(checked: boolean) {
        this.getFirstJxgCurve().setLabelAll(checked);
        this.boardUpdate();
    }
}