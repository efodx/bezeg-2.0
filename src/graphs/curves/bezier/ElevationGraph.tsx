import {t} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonAction} from "../../../learning/model";

class ElevationGraph extends BaseBezierCurveGraph<any, BaseGraphStates> {
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

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-4, -2], [-3, 3], [2, 3], [3, -2]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    elevate() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().elevate();
        this.unsuspendBoardUpdate();
    }

    override presets(): string {
        return "elevation-graph";
    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<Button className="degree-elevation-action" onClick={() => this.elevate()}>
            <span className="degree-elevation-action-icon" aria-hidden="true">↑</span>
            {t("elevate_degree")}
        </Button>]);
    }
}

export default ElevationGraph;
