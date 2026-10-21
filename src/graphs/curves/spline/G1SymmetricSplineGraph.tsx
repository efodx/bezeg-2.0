import React from "react";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import Slider from "../../../inputs/Slider";
import {t} from "../../../localization";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {validateSplineBeta} from "./splineBetaAction";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

export const G1_SYMMETRIC_BETA_MIN = 0.01;
export const G1_SYMMETRIC_BETA_MAX = 0.99;

interface G1SymmetricSplineGraphStates extends BaseGraphStates {
    /** Bumped when lesson actions change β; part of the saved scene state. The sliders read the model values while rendering. */
    betaRevision?: number;
}

class Graph extends BaseSplineCurveGraph<G1SymmetricSplineGraphStates> {

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.getBiSetters()
        ) : [];
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXSymmetricQuadraticG1SplineCurve", {
            "points": [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]], "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    override presetCollection() {
        return curvePresetCollections["spline-g1-symmetric"];
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('spline-beta', action => {
            const curve = this.getFirstCurve();
            validateSplineBeta(action.index, action.value, curve ? curve.getNumOfBs() : 0, G1_SYMMETRIC_BETA_MIN, G1_SYMMETRIC_BETA_MAX);
            curve.setB(action.index, action.value);
            this.setState(state => ({betaRevision: (state.betaRevision ?? 0) + 1}));
            this.boardUpdate();
        });
    }

    private getBiSetters() {
        return this.getFirstCurve().getBs().map(
            (b, i) => <div key={i}>
                <Slider customText={`${t('spline_parameter_b')} ${i + 1}`} value={b} min={G1_SYMMETRIC_BETA_MIN} max={G1_SYMMETRIC_BETA_MAX}
                        onChange={(val) => this.changeBi(i, val)}/></div>
        );
    }

    private changeBi(i: number, val: number) {
        this.getFirstCurve().setB(i, val);
        this.boardUpdate();
        this.store.notify();
    }


}

export default Graph;
