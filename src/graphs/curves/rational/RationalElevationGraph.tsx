import React from 'react';

import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {Attributes} from "../../attributes/Attributes";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {degreeElevationAction} from "../../base/lesson/curveLessonActions";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {rationalElevationPresetCollection} from "./collections";

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
        return super.getGraphCommands().concat([<CurveOperation key="elevation" curve={this.getFirstJxgCurve()} tool="elevation" permanentPreview
            onChanged={() => this.store.notify()} onApply={() => this.elevate()}/>]);
    }

    defaultPreset(): CurveCollectionPresetData {
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

    override presetCollection() {
        return rationalElevationPresetCollection;
    }
}

export default Graph;
