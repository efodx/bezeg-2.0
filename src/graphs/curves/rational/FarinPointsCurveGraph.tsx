import {t} from "../../../localization";
import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import React from "react";
import {BaseGraphStates, CurveCollectionPresetData} from "../../base/BaseCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";


class RationalBezierCurveGraph extends BaseRationalCurveGraph<BaseGraphStates> {

    override initialize() {
        super.initialize();
        if (this.getFirstJxgCurve().isShowingFarinPoints()) {
            this.showFarinPoints(true);
        }
    }

    override importPresetData(str: CurveCollectionPresetData) {
        super.importPresetData(str);
        this.syncFarinInteraction();
    }

    /** The preset importer rebuilds Farin sliders from the preset state; curve-input locking must follow.
     *  Control points stay draggable: each Farin slider follows its two control points. */
    private syncFarinInteraction() {
        const curve = this.getFirstJxgCurve();
        if (!curve) return;
        this.inputsDisabled = curve.isShowingFarinPoints();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('farin-points', action => {
            if (typeof action.visible !== 'boolean') throw new Error('Farin point visibility must be true or false.');
            this.showFarinPoints(action.visible);
            this.boardUpdate();
            this.refreshWorkspace();
        });
        registry.on('standard-form', action => {
            if (typeof action.enabled !== 'boolean') throw new Error('Standard form must be true or false.');
            this.getFirstJxgCurve().setStandardForm(action.enabled);
            this.boardUpdate();
            this.refreshWorkspace();
        });
        registry.on('rational-weights', action => {
            const count = this.getFirstJxgCurve().getJxgPoints().length;
            const weights = action.weights;
            if (!Array.isArray(weights) || weights.length !== count
                || !weights.every(w => typeof w === 'number' && Number.isFinite(w) && w > 0)) {
                throw new Error(`Provide exactly ${count} finite weights greater than zero.`);
            }
            this.getFirstJxgCurve().setEffectiveWeights(weights.slice());
            this.boardUpdate();
            this.refreshWorkspace();
        });
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("construction")}</h3>
            <OnOffSwitch checked={this.getFirstJxgCurve().isShowingFarinPoints()}
                onChange={(checked) => this.showFarinPoints(checked)} label={t("farin_points")}/>
            <OnOffSwitch checked={this.getFirstJxgCurve().isShowingWeights()}
                onChange={(checked) => {
                    this.getFirstJxgCurve().showwWeights(checked);
                    this.store.notify();
                }} label={t("weights")}/></div></>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(<OnOffSwitch
            checked={this.getFirstJxgCurve().inStandardForm()}
            onChange={(checked) => {
                this.getFirstJxgCurve().setStandardForm(checked);
                this.store.notify();
            }}
            label={t("standard_form")}/>) : [];
    }

    defaultPreset(): any {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -3]], "weights": [1, 2, 1, 1], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "subdivisionT": 0.5,
                "extrapolationT": 1.2,
                "showingWeights": false,
                "weightNumber": 1,
                "showingFarinPoints": false
            }
        }]];
    }

    override presets(): string {
        return "rational-bezier-farin";
    }

    private showFarinPoints(checked: boolean) {
        this.getFirstJxgCurve().showFarinPoints(checked);
        this.syncFarinInteraction();
        this.store.notify();
    }
}

export default RationalBezierCurveGraph;
