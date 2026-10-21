import {t} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {BezierCurveAttributes} from "../object/AbstractJXGBezierCurve";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {extrapolationActions} from "../../base/lesson/curveLessonActions";
import Slider from "../../../inputs/Slider";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

class GraphExtrapolation extends BaseBezierCurveGraph<BaseGraphStates> {
    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            "points": [[-4, -2], [-3, 3], [2, 3], [3, -1]], "state": {
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

    override presetCollection() {
        return curvePresetCollections.extrapolation;
    }

    override initialize() {
        super.initialize();
        this.prepareExtrapolationCurve();
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

    override importPresetData(str: CurveCollectionPresetData) {
        super.importPresetData(str);
        this.prepareExtrapolationCurve();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(extrapolationActions({
            setParameter: value => {
                this.getFirstJxgCurve().setExtrapolationT(value);
                this.refreshWorkspace();
            },
            extrapolate: () => this.extrapolate(),
        }));
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<div>
            <Slider customText={t("extrapolation_parameter_t")} min={1} max={1.5}
                    value={this.getFirstJxgCurve().getExtrapolationT()}
                    onChange={(t) => {
                        this.getFirstJxgCurve().setExtrapolationT(t);
                        this.store.notify();
                    }}></Slider>
            <Button
                onClick={() => this.extrapolate()}>{t("extrapolate")}</Button>
        </div>]) : [];
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