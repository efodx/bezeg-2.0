import {t} from "../../../localization";
import React from 'react';

import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {Button} from "react-bootstrap";
import {BezierCurveAttributes} from "../object/AbstractJXGBezierCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonAction} from "../../../learning/model";
import Slider from '../../../inputs/Slider';

class GraphExtrapolation extends BaseRationalCurveGraph<any, BaseGraphStates> {
    override initialize() {
        super.initialize();
        this.prepareExtrapolationCurve();
        this.boardUpdate();
    }

    /** Extrapolation point state lives on the curve object, so every newly imported curve needs it again. */
    private prepareExtrapolationCurve() {
        const curve = this.getFirstJxgCurve();
        if (!curve) return;
        curve.createExtrapolationPoint();
        curve.showExtrapolationPoint();
        curve.setAttributes({
            allowShrink: false,
            allowExtrapolation: false,
            allowElevation: false,
            allowDecasteljau: false,
            allowSubdivision: false
        } as BezierCurveAttributes);
    }

    override importPresetData(str: string) {
        super.importPresetData(str);
        this.prepareExtrapolationCurve();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'extrapolation-parameter') {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 1.5) {
                throw new Error('The extrapolation parameter must be a number from 1 to 1.5.');
            }
            this.getFirstJxgCurve().setExtrapolationT(value);
            this.refreshWorkspace();
            return;
        }
        if (action.kind === 'extrapolate') {
            this.extrapolate();
            return;
        }
        super.applyLessonAction(action);
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<div>
            <Slider min={1} max={1.5}
                    initialValue={this.getFirstJxgCurve().getExtrapolationT()}
                    onChange={(t) => this.getFirstJxgCurve().setExtrapolationT(t)}></Slider>
            <Button
                onClick={() => this.extrapolate()}>{t("extrapolate")}</Button>
        </div>]) : [];
    }

    defaultPreset(): any {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -1]], "weights": [1, 2, 1, 1], "state": {
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
        return "rational-bezier-extrapolation";
    }

    override deselectSelectedCurve() {
        super.deselectSelectedCurve();
        this.getFirstJxgCurve().createExtrapolationPoint();
        this.getFirstJxgCurve().showExtrapolationPoint();
    }

    private extrapolate() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().extrapolate(this.getFirstJxgCurve().getExtrapolationT());
        this.unsuspendBoardUpdate();
    }

}

export default GraphExtrapolation;
