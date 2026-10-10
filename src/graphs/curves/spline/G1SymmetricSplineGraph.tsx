import React from "react";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import Slider from "../../../inputs/Slider";
import {LessonAction} from "../../../learning/model";
import {validateSplineBeta} from "./splineBetaAction";

export const G1_SYMMETRIC_BETA_MIN = 0.01;
export const G1_SYMMETRIC_BETA_MAX = 0.99;

interface G1SymmetricSplineGraphStates extends BaseGraphStates {
    /** Bumped when lesson actions change β, so the sliders re-read the model values. */
    betaRevision?: number;
}

class Graph extends BaseSplineCurveGraph<G1SymmetricSplineGraphStates> {

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.getBiSetters()
        ) : [];
    }

    defaultPreset(): any {
        return [["JSXSymmetricQuadraticG1SplineCurve", {
            "points": [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]], "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    override presets(): string {
        return "g1-symmetric-spline-graph";
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'spline-beta') {
            const curve = this.getFirstCurve();
            validateSplineBeta(action.index, action.value, curve ? curve.getNumOfBs() : 0, G1_SYMMETRIC_BETA_MIN, G1_SYMMETRIC_BETA_MAX);
            curve.setB(action.index, action.value);
            this.setState(state => ({betaRevision: (state.betaRevision ?? 0) + 1}));
            this.boardUpdate();
            return;
        }
        super.applyLessonAction(action);
    }

    private getBiSetters() {
        return this.getFirstCurve().getBs().map(
            (b, i) => <div key={i}>
                <Slider initialValue={b} min={G1_SYMMETRIC_BETA_MIN} max={G1_SYMMETRIC_BETA_MAX}
                        onChange={(val) => this.changeBi(i, val)}/></div>
        );
    }

    private changeBi(i: number, val: number) {
        this.getFirstCurve().setB(i, val);
        this.boardUpdate();
    }


}

export default Graph;
