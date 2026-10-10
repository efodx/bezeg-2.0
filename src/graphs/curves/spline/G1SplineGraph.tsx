import React from "react";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import Slider from "../../../inputs/Slider";
import {LessonAction} from "../../../learning/model";
import {validateSplineBeta} from "./splineBetaAction";

export const G1_BETA_MIN = 0.01;
export const G1_BETA_MAX = 3;

interface G1SplineGraphStates extends BaseGraphStates {
    /** Bumped when lesson actions change b, so the sliders re-read the model values. */
    betaRevision?: number;
}

class Graph extends BaseSplineCurveGraph<G1SplineGraphStates> {

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.getBiSetters()
        ) : [];
    }

    defaultPreset(): any {
        return [["JSXQuadraticG1SplineCurve", {
            "points": [[-2.5, 1], [-4, -1.5], [-2.5, -2.5], [0, -1], [3, 1]], "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    override presets(): string {
        return "g1-spline-graph";
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'spline-beta') {
            const curve = this.getFirstCurve();
            validateSplineBeta(action.index, action.value, curve ? curve.getNumOfBs() : 0, G1_BETA_MIN, G1_BETA_MAX);
            curve.setB(action.index, action.value);
            this.setState(state => ({betaRevision: (state.betaRevision ?? 0) + 1}));
            this.boardUpdate();
            return;
        }
        super.applyLessonAction(action);
    }

    /** Sliders show the model's current b values (b starts at 1), so they follow restores and default scenes. */
    private getBiSetters() {
        const bs = this.getFirstCurve().getBs();
        return <div>
            <div>ß</div>
            {bs.map(
                (b, i) => <div key={i}>
                    <Slider initialValue={b} min={G1_BETA_MIN} max={G1_BETA_MAX}
                            onChange={(val) => this.changeBi(i, val)}/></div>
            )}</div>;
    }

    private changeBi(i: number, val: number) {
        this.getFirstCurve().setB(i, val);
        this.boardUpdate();
    }
}

export default Graph;
