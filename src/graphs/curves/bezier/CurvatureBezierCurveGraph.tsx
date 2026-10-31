import React from "react";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {CurvatureOverlay} from "./CurvatureOverlay";

export interface CurvatureGraphStates extends BaseGraphStates {
    /** The Bezier parameter at which the frame and osculating circle are drawn. */
    curvatureT: number;
}

export const CURVATURE_T_DEFAULT = 0.5;

/** y = x^2 for x in [-1, 1] as a quadratic Bezier: x = 2t - 1, y = (2t - 1)^2. */
export const PARABOLA_CONTROL_POINTS: number[][] = [[-1, 1], [0, -1], [1, 1]];

/**
 * Curvature Demonstration (ADR 0022): the Bezier graph plus one owned {@link CurvatureOverlay}. The overlay is
 * created after the curve exists, recreated after every scene import, and disposed with the scene and on unmount.
 */
class CurvatureBezierCurveGraph extends BaseBezierCurveGraph<CurvatureGraphStates> {
    private overlay?: CurvatureOverlay;

    // Same structured editing as BezierCurveGraph; that class fixes its state type, so it cannot be subclassed here.
    protected override workspaceUsesStructuredEditing() { return true; }

    override getInitialState() {
        return {
            ...super.getInitialState(),
            curvatureT: CURVATURE_T_DEFAULT,
        };
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            points: PARABOLA_CONTROL_POINTS.map(point => [...point]),
            state: {
                showingJxgPoints: true,
                showingControlPolygon: false,
                showingConvexHull: false,
                showingDecasteljauScheme: false,
                subdivisionT: 0.5,
                decasteljauT: 0.5,
                extrapolationT: 1.2,
            },
        }]];
    }

    override presetCollection() {
        return curvePresetCollections.curvature;
    }

    override initialize() {
        super.initialize();
        this.ensureOverlay();
    }

    /** Scene imports dispose the overlay with the scene, so it is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        this.ensureOverlay();
    }

    /** Idempotent: removes any earlier overlay and creates one reading the current first curve lazily. */
    private ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new CurvatureOverlay({
            board: this.board,
            controlPoints: () => this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]),
            parameter: () => this.state.curvatureT,
            fontSize: () => this.displaySettings.fontSize,
        });
    }

    private removeOverlay() {
        this.overlay?.dispose();
        this.overlay = undefined;
    }

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeOverlay();
    }

    override unmount() {
        this.removeOverlay();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<CurvatureGraphStates>) {
        super.onStateChange(prevState);
        if (prevState !== this.state && prevState.curvatureT !== this.state.curvatureT) this.boardUpdate();
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.parameterSlider()) : [];
    }

    setCurvatureT(value: number) {
        this.setState({curvatureT: value});
    }

    private parameterSlider() {
        return <div><Slider min={0} max={1} step={0.01} value={this.state.curvatureT}
                            customText={t("curvature_parameter_t")}
                            onChange={value => this.setCurvatureT(value)}/></div>;
    }
}

export default CurvatureBezierCurveGraph;
