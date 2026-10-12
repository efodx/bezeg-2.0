import {t} from "../../../localization";
import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import React from "react";
import {BaseGraphStates, CurveCollectionPresetData} from "../../base/BaseCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonAction, LessonSceneCheckpoint} from "../../../learning/model";


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

    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.syncFarinInteraction();
        this.refreshWorkspace();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'farin-points') {
            if (typeof action.visible !== 'boolean') throw new Error('Farin point visibility must be true or false.');
            this.showFarinPoints(action.visible);
            this.boardUpdate();
            this.refreshWorkspace();
            return;
        }
        if (action.kind === 'standard-form') {
            if (typeof action.enabled !== 'boolean') throw new Error('Standard form must be true or false.');
            this.getFirstJxgCurve().setStandardForm(action.enabled);
            this.boardUpdate();
            this.refreshWorkspace();
            return;
        }
        if (action.kind === 'rational-weights') {
            const count = this.getFirstJxgCurve().getJxgPoints().length;
            const weights = action.weights;
            if (!Array.isArray(weights) || weights.length !== count
                || !weights.every(w => typeof w === 'number' && Number.isFinite(w) && w > 0)) {
                throw new Error(`Provide exactly ${count} finite weights greater than zero.`);
            }
            this.setEffectiveWeights(weights.slice());
            this.boardUpdate();
            this.refreshWorkspace();
            return;
        }
        super.applyLessonAction(action);
    }

    /** Farin sliders are sized from the weights, so rebuild them around a weight change. */
    private setEffectiveWeights(weights: number[]) {
        const curve = this.getFirstJxgCurve();
        const farin = curve.isShowingFarinPoints();
        if (farin) curve.showFarinPoints(false);
        curve.getCurve().setWeights(weights);
        if (farin) curve.showFarinPoints(true);
    }

    protected override captureLessonState(): LessonSceneCheckpoint {
        const checkpoint = super.captureLessonState();
        const curve = this.getFirstJxgCurve();
        return {
            ...checkpoint,
            value: {
                ...(checkpoint.value as object),
                farin: {
                    effectiveWeights: curve.getCurve().getEffectiveWeights().slice(),
                    showingFarinPoints: curve.isShowingFarinPoints(),
                    standardForm: curve.inStandardForm(),
                },
            },
        } as LessonSceneCheckpoint;
    }

    protected override restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        const farin = (checkpoint.value as {farin?: {effectiveWeights?: unknown, showingFarinPoints?: unknown, standardForm?: unknown}} | undefined)?.farin;
        super.restoreLessonState(checkpoint);
        const curve = this.getFirstJxgCurve();
        if (curve && farin && Array.isArray(farin.effectiveWeights)
            && farin.effectiveWeights.length === curve.getJxgPoints().length) {
            // The exported weights are display-normalized in standard form, so restore the effective ones.
            curve.showFarinPoints(false);
            curve.getCurve().setWeights((farin.effectiveWeights as number[]).slice());
            if (farin.showingFarinPoints === true) curve.showFarinPoints(true);
            curve.setStandardForm(farin.standardForm === true);
        }
        this.syncFarinInteraction();
        this.boardUpdate();
        this.refreshWorkspace();
    }

    override getGraphCommands(): JSX.Element[] {
        const revision = this.workspaceRevision;
        return this.state.initialized ? super.getGraphCommands().concat(<OnOffSwitch
            key={`farin-${revision}`}
            initialState={this.getFirstJxgCurve().isShowingFarinPoints()}
            onChange={(checked) => this.showFarinPoints(checked)} label={t("farin_points")}/>, <OnOffSwitch
            key={`weights-${revision}`}
            initialState={this.getFirstJxgCurve().isShowingWeights()}
            onChange={(checked) => this.getFirstJxgCurve().showwWeights(checked)} label={t("weights")}/>, <OnOffSwitch
            key={`standard-${revision}`}
            initialState={this.getFirstJxgCurve().inStandardForm()}
            onChange={(checked) => this.getFirstJxgCurve().setStandardForm(checked)}
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
    }
}

export default RationalBezierCurveGraph;
