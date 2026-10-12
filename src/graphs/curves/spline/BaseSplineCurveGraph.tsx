import {t} from "../../../localization";
import BaseCurveGraph, {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BezierSpline} from "../../../bezeg/impl/curve/bezier-spline";
import {AbstractJXGSplineCurve} from "../object/AbstractJXGSplineCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

export abstract class BaseSplineCurveGraph<S extends BaseGraphStates> extends BaseCurveGraph<S> {
    override mount(container: HTMLElement) {
        super.mount(container);
        this.getFirstJxgCurve().setAttributes({allowShowPoints: true});
    }

    /** Presets, lesson scenes and checkpoints replace the curve objects without calling mount(). */
    override importPresetData(data: any) {
        super.importPresetData(data);
        this.getFirstJxgCurve()?.setAttributes({allowShowPoints: true});
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('spline-label-points', action => {
            if (typeof action.visible !== 'boolean') {
                throw new Error('Labelling all spline points must be switched on or off.');
            }
            this.setLabelAll(action.visible);
            this.refreshSplineSwitches();
        });
        registry.on('spline-hide-fixed', action => {
            if (typeof action.hidden !== 'boolean') {
                throw new Error('Hiding the derived spline points must be switched on or off.');
            }
            this.getFirstJxgCurve().setHideFixed(action.hidden);
            this.boardUpdate();
            this.refreshSplineSwitches();
        });
    }

    /** The switches and counters read the curve while rendering, so a changed curve only needs a render. */
    protected refreshSplineSwitches() {
        this.requestRender();
    }

    override getFirstCurve(): BezierSpline {
        return super.getFirstCurve() as BezierSpline;
    }

    override getFirstJxgCurve(): AbstractJXGSplineCurve<any> {
        return super.getFirstJxgCurve() as AbstractJXGSplineCurve<any>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(<OnOffSwitch
            onChange={(checked) => this.setLabelAll(checked)}
            label={t("label_all_points")}
            checked={this.getFirstJxgCurve().getLabelAll()}></OnOffSwitch>, <OnOffSwitch
            onChange={(checked) => {
                this.getFirstJxgCurve().setHideFixed(checked);
                this.store.notify();
            }}
            label={t("hide_fixed_points")}
            checked={this.getFirstJxgCurve().getHideFixed()}></OnOffSwitch>) : [];
    }

    protected setLabelAll(checked: boolean) {
        this.getFirstJxgCurve().setLabelAll(checked);
        this.boardUpdate();
        this.store.notify();
    }
}