import React from "react";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import Slider from "../../../inputs/Slider";
import {t} from "../../../localization";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {validateSplineBeta} from "./splineBetaAction";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

export const G1_BETA_MIN = 0.01;
export const G1_BETA_MAX = 3;

interface G1SplineGraphStates extends BaseGraphStates {
    /** Bumped when lesson actions change b; part of the saved scene state. The sliders read the model values while rendering. */
    betaRevision?: number;
}

class Graph extends BaseSplineCurveGraph<G1SplineGraphStates> {

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.getBiSetters()
        ) : [];
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXQuadraticG1SplineCurve", {
            "points": [[-2.5, 1], [-4, -1.5], [-2.5, -2.5], [0, -1], [3, 1]], "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    override presetCollection() {
        return curvePresetCollections["spline-g1"];
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('spline-beta', action => {
            const curve = this.getFirstCurve();
            validateSplineBeta(action.index, action.value, curve ? curve.getNumOfBs() : 0, G1_BETA_MIN, G1_BETA_MAX);
            curve.setB(action.index, action.value);
            this.setState(state => ({betaRevision: (state.betaRevision ?? 0) + 1}));
            this.boardUpdate();
        });
    }

    /** Sliders show the model's current b values (b starts at 1), so they follow restores and default scenes. */
    private getBiSetters() {
        const bs = this.getFirstCurve().getBs();
        return <div>
            <div>{t('spline_parameter_b')}</div>
            {bs.map(
                (b, i) => <div key={i}>
                    <Slider customText={`${t('spline_parameter_b')} ${i + 1}`} value={b} min={G1_BETA_MIN} max={G1_BETA_MAX}
                            onChange={(val) => this.changeBi(i, val)}/></div>
            )}</div>;
    }

    private changeBi(i: number, val: number) {
        this.getFirstCurve().setB(i, val);
        this.boardUpdate();
        this.store.notify();
    }
}

export default Graph;
