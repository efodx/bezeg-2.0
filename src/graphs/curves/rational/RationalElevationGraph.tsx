import {t} from "../../../localization";
import React from 'react';

import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {Button} from "react-bootstrap";
import {Attributes} from "../../attributes/Attributes";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonAction} from "../../../learning/model";

class Graph extends BaseRationalCurveGraph<any, BaseGraphStates> {

    override initialize() {
        super.initialize();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
    }

    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.boardUpdate();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'degree-elevation') {
            this.elevate();
            return;
        }
        super.applyLessonAction(action);
    }

    elevate() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().elevate();
        this.unsuspendBoardUpdate();
    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<Button onClick={() => this.elevate()}>{t("elevate_degree")}</Button>]);
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
        return "rational-bezier-elevation";
    }
}

export default Graph;
