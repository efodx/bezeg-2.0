import React from 'react';

import {GraphPalette} from "../../styles/GraphPalette";
import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {BezierCurveAttributes} from "../object/AbstractJXGBezierCurve";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {extrapolationActions} from "../../base/lesson/curveLessonActions";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {extrapolationPresetCollection} from "./collections";

/** Parameter length the extension keeps at t = 1: about a thousandth of a pixel at classroom sizes, so the element stays drawn and the count of curves is constant. */
const MIN_EXTENSION = 1e-6;

class GraphExtrapolation extends BaseBezierCurveGraph<BaseGraphStates> {
    /** The extrapolation parameter, preview and apply lead Edit and stay while a curve is selected (graph-control first use). */
    protected override workspaceConstructionFirst() { return true; }
    /** The part of the curve beyond t = 1, parameters [1, extrapolationT]: its own element drawn over the curve's arc, so it has its own role (solid blue, covering the moss beneath it so the arc reads as one role). */
    private extensionCurve?: JXG.Curve;
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
        this.buildExtension();
        curve.setAttributes({
            allowShrink: false,
            allowExtrapolation: false,
            allowElevation: false,
            allowDecasteljau: false,
            allowSubdivision: false
        } as BezierCurveAttributes);
    }

    /** The curve itself is drawn up to the extrapolation parameter; this solid blue element is drawn over its part beyond t = 1. Always present (JSXGraph hides a curve of zero length, so at t = 1 it keeps an arc of {@link MIN_EXTENSION} that cannot be seen), so the number of drawn curves does not change while the parameter moves. Idempotent. */
    private buildExtension() {
        this.removeExtension();
        const curve = this.getFirstJxgCurve();
        if (!curve || !this.board) return;
        const model = () => curve.getCurve();
        const role = {...this.styles.curve.default, strokeColor: GraphPalette.comparisonCurve, highlightStrokeColor: GraphPalette.comparisonCurve, dash: 0};
        this.extensionCurve = this.board.create('curve', [
            (u: number) => model().eval(u).X(),
            (u: number) => model().eval(u).Y(),
            1,
            () => Math.max(curve.getExtrapolationT(), 1 + MIN_EXTENSION),
        ], {...role, fixed: true, highlight: false, withLabel: false}) as JXG.Curve;
    }

    private removeExtension() {
        const extension = this.extensionCurve;
        this.extensionCurve = undefined;
        if (extension && this.board && this.board.objectsList.includes(extension)) this.board.removeObject(extension);
    }

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeExtension();
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