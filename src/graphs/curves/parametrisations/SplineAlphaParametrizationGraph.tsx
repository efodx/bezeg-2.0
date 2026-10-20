import {t} from "../../../localization";
import {BaseSplineCurveGraph} from "../spline/BaseSplineCurveGraph";
import {GraphPalette} from "../../styles/GraphPalette";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import React from "react";
import Slider from "../../../inputs/Slider";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

export const SPLINE_ALPHA_MAX_SAMPLES = 50;

interface SplineAlphaParamGraphStates extends BaseGraphStates {
    numberOfPoints: number;
    alpha: number;
}

class Graph extends BaseSplineCurveGraph<SplineAlphaParamGraphStates> {
    /** Sample markers owned by this graph; control points belong to the curve objects and are never listed here. */
    private sampleMarkers: JXG.Point[] = [];

    protected override onStateChange(prevState: Readonly<SplineAlphaParamGraphStates>) {
        if (prevState === this.state) { return; }
        this.syncCurveToState();
    }

    /** An imported curve takes α from the scene state, and its sample markers are rebuilt on it. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncCurveToState();
    }

    /** Idempotent: brings the curve's α and the sample markers in line with the scene state. */
    private syncCurveToState() {
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

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('parameterization-alpha', action => {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
                throw new Error('The parameter α must be a number from 0 to 1.');
            }
            this.getFirstCurve().setAlpha(value);
            this.setState({alpha: value});
            this.boardUpdate();
        });
        registry.on('parameterization-samples', action => {
            const count = action.count;
            if (!Number.isInteger(count) || count < 0 || count > SPLINE_ALPHA_MAX_SAMPLES) {
                throw new Error(`The number of sample points must be an integer from 0 to ${SPLINE_ALPHA_MAX_SAMPLES}.`);
            }
            this.setState({numberOfPoints: count});
            this.regenerateSamples(count);
        });
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


    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.alphaParamSlider(), this.numberOfPointsSlider()) : [];
    }

    setAlpha(alpha: number) {
        this.board.suspendUpdate();
        this.setState({alpha: alpha});
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
        this.setState({numberOfPoints: numberOfPoints});
        this.regenerateSamples(numberOfPoints);
    }

    alphaParamSlider() {
        return <div><Slider customText={t("parameter_alpha")} min={0} max={1} step={0.01} value={this.state.alpha}
                             onChange={(alpha) => this.setAlpha(alpha)}/></div>;
    }

    numberOfPointsSlider() {
        return <div><Slider customText={t("number_of_points")} min={0} max={SPLINE_ALPHA_MAX_SAMPLES} step={1}
                            value={this.state.numberOfPoints}
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
                ...this.styles.point.default,
                size: () => this.displaySettings.pointSize * 0.5,
                fillColor: GraphPalette.parameterSample,
            });
            this.sampleMarkers.push(point.point);
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => this.displaySettings.pointSize / 5, strokeColor: GraphPalette.label});
        }
    }

}

export default Graph;
