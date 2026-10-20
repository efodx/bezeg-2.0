import {t} from "../../../localization";
import React from 'react';

import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {Button} from "react-bootstrap";
import {Attributes} from "../../attributes/Attributes";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {degreeElevationAction} from "../../base/lesson/curveLessonActions";

class Graph extends BaseRationalCurveGraph<BaseGraphStates> {

    /** The curve operations stay disabled on every imported curve; the adapter attributes are not in its DTO. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.getFirstJxgCurve()?.setAttributes(Attributes.bezierDisabled);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(degreeElevationAction(() => this.elevate()));
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
