import React from 'react';

import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {BezierCurveAttributes} from "../object/AbstractJXGBezierCurve";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {extrapolationActions} from "../../base/lesson/curveLessonActions";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {extrapolationPresetCollection} from "./collections";

class GraphExtrapolation extends BaseBezierCurveGraph<BaseGraphStates> {
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
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
        return extrapolationPresetCollection;
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
        // The extrapolated point stays on the board, so the operation offers no Preview toggle.
        return this.state.initialized ? super.getGraphCommands().concat([<div key="extrapolation">
            <CurveOperation curve={this.getFirstJxgCurve()} tool="extrapolation" permanentPreview onChanged={() => this.store.notify()}
                            onApply={() => this.extrapolate()}/>
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