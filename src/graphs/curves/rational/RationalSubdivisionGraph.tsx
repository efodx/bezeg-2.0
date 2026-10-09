import {t} from "../../../localization";
import React from 'react';

import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {Button} from "react-bootstrap";
import {JXGRationalBezierCurve} from "../object/JXGRationalBezierCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";

/**
 * Represents iteration of subdivision on rational bezier curves.
 */
class Graph extends BaseRationalCurveGraph<any, BaseGraphStates> {
    private stepsDone: number = 0;

    protected override captureFigureRuntimeState(): unknown {
        return {...(super.captureFigureRuntimeState() as object), stepsDone: this.stepsDone};
    }

    protected override restoreFigureRuntimeState(runtimeState: unknown): void {
        super.restoreFigureRuntimeState(runtimeState);
        const stepsDone = (runtimeState as {stepsDone?: number} | undefined)?.stepsDone;
        if (typeof stepsDone === "number" && Number.isFinite(stepsDone)) this.stepsDone = stepsDone;
    }

    subdivide() {
        if (this.stepsDone > 4) {
            return;
        }
        this.stepsDone = this.stepsDone + 1;
        this.board.suspendUpdate();
        let oldJsxBezierCurves = this.jxgCurves.map(c => c as JXGRationalBezierCurve);
        for (let bezierCurve of oldJsxBezierCurves) {
            bezierCurve.subdivide(1 / 2);
        }
        this.unsuspendBoardUpdate();
    };

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<Button
            onClick={() => this.subdivide()}>{t("subdivide")}</Button>]);
    }

    defaultPreset(): any {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 2], [3, 2], [4, -3]], "weights": [1, 2, 1, 1], "state": {
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
        return "rational-bezier-subdivision";
    }


}

export default Graph;
