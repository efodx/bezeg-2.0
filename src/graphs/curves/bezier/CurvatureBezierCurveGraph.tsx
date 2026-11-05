import React from "react";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvatureCurvePresetCollection, CurveCollectionPresetData} from "../curvePresetCollections";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {CurvatureOverlay} from "./CurvatureOverlay";

export interface CurvatureGraphStates extends BaseGraphStates {
    /** The Bezier parameter at which the frame and osculating circle are drawn. */
    curvatureT: number;
    /** The T and N frame is drawn; a lesson step hides it before the reveal. Saved with Presets like `curvatureT`. */
    curvatureFrameShown: boolean;
    /** The osculating circle (or its tangent line) is drawn; saved with Presets like the frame flag. */
    curvatureCircleShown: boolean;
}

export const CURVATURE_T_DEFAULT = 0.5;

/** y = x^2 for x in [-1, 1] as a quadratic Bezier: x = 2t - 1, y = (2t - 1)^2. */
export const PARABOLA_CONTROL_POINTS: number[][] = [[-1, 1], [0, -1], [1, 1]];

/**
 * Curvature Demonstration (ADR 0022): the Bezier graph plus one owned {@link CurvatureOverlay}. The overlay is
 * created after the curve exists, recreated after every scene import, and disposed with the scene and on unmount.
 */
export abstract class CurvatureOverlayGraph<S extends CurvatureGraphStates> extends BaseBezierCurveGraph<S> {
    protected overlay?: CurvatureOverlay;
    /** What the overlay last read. A lesson scene resets the state and sets it back within one batch, so comparing only with the previous state would miss a redraw. */
    private drawn?: { t: number, frame: boolean, circle: boolean };

    // Same structured editing as BezierCurveGraph; that class fixes its state type, so it cannot be subclassed here.
    protected override workspaceUsesStructuredEditing() { return true; }

    // The state type is fixed by each concrete class, so generic code cannot write a partial update to `S` without a cast.
    protected abstract writeCurvatureState(update: Partial<CurvatureGraphStates>): void;

    /** Text appended to the overlay's readout (a subclass adds its own quantity); undefined adds nothing. */
    protected overlayExtraReadout(): (() => string) | undefined { return undefined; }

    /** Extra Edit controls, placed between the parameter slider and the structured editing. */
    protected workspaceCurvatureExtras(): React.ReactNode { return null; }

    /** Creates the subclass's own overlays right after the curvature overlay (later elements draw above it). */
    protected createExtraOverlays(): void {}

    /** Removes the subclass's overlays; idempotent. Runs before the curvature overlay is removed. */
    protected removeExtraOverlays(): void {}

    /** Whether a state change other than the shared flags needs a board redraw. `prevState` is the state before the commit. */
    protected extraStateChanged(_prevState: Readonly<S>): boolean { return false; }

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
        return curvatureCurvePresetCollection;
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
    protected ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new CurvatureOverlay({
            board: this.board,
            controlPoints: () => this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]),
            parameter: () => {
                this.drawn = {t: this.state.curvatureT, frame: this.state.curvatureFrameShown, circle: this.state.curvatureCircleShown};
                return this.state.curvatureT;
            },
            showFrame: () => this.state.curvatureFrameShown,
            showCircle: () => this.state.curvatureCircleShown,
            fontSize: () => this.displaySettings.fontSize,
            extraReadout: this.overlayExtraReadout(),
        });
        this.createExtraOverlays();
    }

    private removeOverlay() {
        this.removeExtraOverlays();
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

    protected override onStateChange(prevState: Readonly<S>) {
        super.onStateChange(prevState);
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.t !== this.state.curvatureT
            || drawn.frame !== this.state.curvatureFrameShown || drawn.circle !== this.state.curvatureCircleShown);
        if (prevState !== this.state && (stale || prevState.curvatureT !== this.state.curvatureT
            || prevState.curvatureFrameShown !== this.state.curvatureFrameShown
            || prevState.curvatureCircleShown !== this.state.curvatureCircleShown
            || this.extraStateChanged(prevState))) this.boardUpdate();
    }

    /**
     * Structured editing does not render `getGraphCommands`, so the parameter slider is its own Edit group, first
     * because the Demonstration is about moving t.
     */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.parameterSlider()}{this.state.initialized && this.workspaceCurvatureExtras()}{super.workspaceEdit()}</>;
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('parameter', 't', action => {
            if (!Number.isFinite(action.value) || action.value < 0 || action.value > 1) throw new Error('The curvature parameter must be between 0 and 1.');
            this.setCurvatureT(action.value);
        });
        registry.onDiscriminated('curve-visibility', 'curvature-frame', action => this.writeCurvatureState({curvatureFrameShown: action.visible}));
        registry.onDiscriminated('curve-visibility', 'curvature-circle', action => this.writeCurvatureState({curvatureCircleShown: action.visible}));
    }

    setCurvatureT(value: number) {
        this.writeCurvatureState({curvatureT: value});
    }

    private parameterSlider() {
        return <div className="inspector-group"><Slider min={0} max={1} step={0.01} value={this.state.curvatureT}
                            customText={t("curvature_parameter_t")}
                            onChange={value => this.setCurvatureT(value)}/></div>;
    }
}

/** Curvature Demonstration (lesson L2). */
class CurvatureBezierCurveGraph extends CurvatureOverlayGraph<CurvatureGraphStates> {
    override getInitialState(): CurvatureGraphStates {
        return {
            ...super.getInitialState(),
            curvatureT: CURVATURE_T_DEFAULT,
            curvatureFrameShown: true,
            curvatureCircleShown: true,
        };
    }

    protected override writeCurvatureState(update: Partial<CurvatureGraphStates>): void {
        this.setState(update);
    }
}

export default CurvatureBezierCurveGraph;
