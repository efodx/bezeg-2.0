import {t} from "../../../localization";
import {BaseSplineCurveGraph} from "../spline/BaseSplineCurveGraph";
import {GraphPalette} from "../../styles/GraphPalette";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {PointStyles} from "../../styles/PointStyles";
import React from "react";
import Slider from "../../../inputs/Slider";
import {SizeContext} from "../../context/SizeContext";
import {Preset} from "../../base/presets/Presets";
import {LessonAction, LessonSceneCheckpoint} from "../../../learning/model";

export const SPLINE_ALPHA_MAX_SAMPLES = 50;

interface SplineAlphaParamGraphStates extends BaseGraphStates {
    numberOfPoints: number;
    alpha: number;
}

class Graph extends BaseSplineCurveGraph<SplineAlphaParamGraphStates> {
    /** Sample markers owned by this graph; control points belong to the curve objects and are never listed here. */
    private sampleMarkers: JXG.Point[] = [];

    /**
     * α lives on the curve model, not only in state, and setState is asynchronous. The value written in this tick is
     * kept here so a replacement curve (preset import, default scene, checkpoint restore) receives it immediately.
     */
    private pendingAlpha?: number;

    private currentAlpha(): number {
        return this.pendingAlpha ?? this.state.alpha;
    }

    override initialize() {
        super.initialize();
        this.getFirstCurve()?.setAlpha(this.currentAlpha());
        this.boardUpdate();
    }

    /** Presets, lesson scenes and checkpoints replace the curve without calling initialize(): reapply α to it. */
    override importPresetData(data: any) {
        super.importPresetData(data);
        this.getFirstCurve()?.setAlpha(this.currentAlpha());
    }

    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<SplineAlphaParamGraphStates>, snapshot?: any) {
        this.pendingAlpha = undefined;
        if (prevState === this.state && prevProps === this.props) { return; }
        if (!this.board || !this.graphSession?.isAlive || !this.getFirstJxgCurve()) { return; }
        if (this.getFirstCurve().getAlpha() !== this.state.alpha) {
            this.getFirstCurve().setAlpha(this.state.alpha);
            this.boardUpdate();
        }
        if (!this.samplesAreCurrent(this.state.numberOfPoints)) {
            this.regenerateSamples(this.state.numberOfPoints);
        }
    }

    private samplesAreCurrent(count: number): boolean {
        return this.sampleMarkers.length === count
            && this.sampleMarkers.every(point => this.board.objectsList.includes(point));
    }

    private regenerateSamples(count: number) {
        this.board.suspendUpdate();
        try {
            this.clearPoints();
            this.generateParamPoints(count);
        } finally {
            this.unsuspendBoardUpdate();
        }
    }

    protected override prepareLessonDefaultScene(): void {
        const state = this.lessonDefaultState();
        this.pendingAlpha = state.alpha;
        super.prepareLessonDefaultScene();
        this.regenerateSamples(state.numberOfPoints);
    }

    protected override lessonDefaultState(): SplineAlphaParamGraphStates {
        return {...super.lessonDefaultState(), numberOfPoints: 25, alpha: 0.5};
    }

    protected override restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        const saved = (checkpoint.value as any)?.graphState;
        if (typeof saved?.alpha === 'number' && Number.isFinite(saved.alpha)) { this.pendingAlpha = saved.alpha; }
        super.restoreLessonState(checkpoint);
        if (this.graphSession?.isReady && typeof saved?.numberOfPoints === 'number') {
            this.regenerateSamples(saved.numberOfPoints);
        }
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'parameterization-alpha') {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
                throw new Error('The parameter α must be a number from 0 to 1.');
            }
            this.pendingAlpha = value;
            this.getFirstCurve().setAlpha(value);
            this.setState({alpha: value});
            this.boardUpdate();
            return;
        }
        if (action.kind === 'parameterization-samples') {
            const count = action.count;
            if (!Number.isInteger(count) || count < 0 || count > SPLINE_ALPHA_MAX_SAMPLES) {
                throw new Error(`The number of sample points must be an integer from 0 to ${SPLINE_ALPHA_MAX_SAMPLES}.`);
            }
            this.setState({numberOfPoints: count});
            this.regenerateSamples(count);
            return;
        }
        super.applyLessonAction(action);
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        this.sampleMarkers = [];
    }

    override getInitialState() {
        return {
            ...super.getInitialState(),
            numberOfPoints: 25,
            alpha: 0.5,
        };
    }


    override presets(): string {
        return "alfaparametrizacije";
    }

    override importPreset(preset: Preset) {
        super.importPreset(preset);
        const presetState = preset.graphState as SplineAlphaParamGraphStates | undefined;
        if (presetState && typeof presetState.numberOfPoints === "number") {
            this.board.suspendUpdate();
            const alpha = typeof presetState.alpha === "number" ? presetState.alpha : this.state.alpha;
            this.pendingAlpha = alpha;
            this.getFirstCurve().setAlpha(alpha);
            this.setState({alpha, numberOfPoints: presetState.numberOfPoints});
            this.clearPoints();
            this.generateParamPoints(presetState.numberOfPoints);
            this.unsuspendBoardUpdate();
        }
    }

    protected override importFigurePresetData(preset: Preset): void {
        super.importFigurePresetData(preset);
        const alpha = (preset.graphState as Partial<SplineAlphaParamGraphStates> | undefined)?.alpha;
        if (typeof alpha === "number" && Number.isFinite(alpha)) this.getFirstCurve().setAlpha(alpha);
    }


    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.alphaParamSlider(), this.numberOfPointsSlider()) : [];
    }

    setAlpha(alpha: number) {
        this.board.suspendUpdate();
        this.pendingAlpha = alpha;
        this.setState({...this.state, alpha: alpha});
        this.getFirstCurve().setAlpha(alpha);
        this.unsuspendBoardUpdate();
    }

    clearPoints() {
        const owned = new Set<JXG.Point>(this.sampleMarkers);
        const present = this.sampleMarkers.filter(point => this.board.objectsList.includes(point)).reverse();
        if (present.length) this.board.removeObject(present);
        this.graphJXGPoints = this.graphJXGPoints.filter(point => !owned.has(point));
        this.sampleMarkers = [];
    }

    setNumberOfPoints(numberOfPoints: number) {
        this.setState({...this.state, numberOfPoints: numberOfPoints});
        this.regenerateSamples(numberOfPoints);
    }

    alphaParamSlider() {
        return <div>α<Slider min={0} max={1} step={0.01} initialValue={this.state.alpha}
                             onChange={(alpha) => this.setAlpha(alpha)}/></div>;
    }

    numberOfPointsSlider() {
        return <div>{t("number_of_points")}<Slider min={0} max={SPLINE_ALPHA_MAX_SAMPLES} step={1}
                                         initialValue={this.state.numberOfPoints}
                                         onChange={(num) => this.setNumberOfPoints(num)}/>
        </div>;
    }

    defaultPreset(): any {
        return [["JSXQubicC2SplineCurve", {
            "points": [[-3.2, 0], [-4.2, -1], [-1.7, -1], [1.3, 1.8], [3.5, 1.9], [4.3, 0.5], [3.8, -1], [-0.5, -4], [-3.7, -4]],
            "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false, hideFixed: true
            }
        }]];
    }

    generateParamPoints(numberOfPoints: number = this.state.numberOfPoints) {
        const dt = 1 / (numberOfPoints + 1);
        for (let i = 1; i <= numberOfPoints; i++) {
            let point = this.createJSXGraphPoint(() => this.getFirstCurve()!.eval(i * dt).X(), () => this.getFirstCurve()!.eval(i * dt).Y(), {
                ...PointStyles.default,
                size: () => SizeContext.pointSize * 0.5,
                fillColor: GraphPalette.parameterSample,
            });
            this.sampleMarkers.push(point.point);
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => SizeContext.pointSize / 5, strokeColor: GraphPalette.label});
        }
    }

}

export default Graph;
