import {t} from "../../../localization";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import React from "react";
import Slider from "../../../inputs/Slider";
import {GraphPalette} from "../../styles/GraphPalette";
import {LessonAction} from "../../../learning/model";

export const ALPHA_PARAM_MAX_SAMPLES = 40;

interface AlphaParamGraphStates extends BaseGraphStates {
    numberOfPoints: number;
    alpha: number;
}

/** phi_alpha(t) = (1-alpha) t / (alpha (1-t) + (1-alpha) t); alpha = 1/2 is the identity. */
export function alphaParameterization(alpha: number, t: number): number {
    return (1 - alpha) * t / (alpha * (1 - t) + (1 - alpha) * t);
}

class AlphaParamBezierCurveGraph extends BaseBezierCurveGraph<AlphaParamGraphStates> {

    override getInitialState() {
        return {
            ...super.getInitialState(),
            numberOfPoints: 10,
            alpha: 0.5,
        };
    }

    /** Sample markers owned by this graph; control points belong to the curve objects and are never listed here. */
    private sampleMarkers: JXG.Point[] = [];

    protected override onStateChange(prevState: Readonly<AlphaParamGraphStates>) {
        if (prevState === this.state) { return; }
        if (!this.board || !this.graphSession?.isAlive || !this.getFirstJxgCurve()) { return; }
        if (this.samplesAreCurrent(this.state.numberOfPoints)) {
            // Alpha is read lazily by the marker coordinates, so markers only need a refresh.
            this.boardUpdate();
            return;
        }
        this.board.suspendUpdate();
        this.clearPoints();
        this.generateParamPoints();
        this.unsuspendBoardUpdate();
    }

    private samplesAreCurrent(count: number): boolean {
        return this.sampleMarkers.length === count
            && this.sampleMarkers.every(point => this.board.objectsList.includes(point));
    }

    protected override prepareLessonDefaultScene(): void {
        // Imports the route's default preset (disposing old samples) and resets alpha/count state.
        super.prepareLessonDefaultScene();
        const state = this.lessonDefaultState();
        this.clearPoints();
        this.generateParamPoints(state.numberOfPoints);
        this.boardUpdate();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'parameterization-alpha') {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
                throw new Error('The parameter α must be a number from 0 to 1.');
            }
            this.setState({alpha: value});
            this.boardUpdate();
            return;
        }
        if (action.kind === 'parameterization-samples') {
            const count = action.count;
            if (!Number.isInteger(count) || count < 1 || count > ALPHA_PARAM_MAX_SAMPLES) {
                throw new Error(`The number of sample points must be an integer from 1 to ${ALPHA_PARAM_MAX_SAMPLES}.`);
            }
            this.setState({numberOfPoints: count});
            this.board.suspendUpdate();
            try {
                this.clearPoints();
                this.generateParamPoints(count);
            } finally {
                this.unsuspendBoardUpdate();
            }
            return;
        }
        // 'parameterization-mode' belongs to the weighted/uniform comparison graph; unsupported here.
        super.applyLessonAction(action);
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        this.sampleMarkers = [];
    }

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-4, -3], [-3, 2], [2, 2], [3, -2]], "state": {
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

    alphaParam: (t: number) => number = (t: number) => alphaParameterization(this.state.alpha, t);

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.alphaParamSlider(), this.numberOfPointsSlider()) : [];
    }

    setAlpha(alpha: number) {
        this.setState({alpha: alpha});
    }

    setNumberOfPoints(numberOfPoints: number) {
        this.setState({numberOfPoints: numberOfPoints});
    }

    alphaParamSlider() {
        return <div><Slider min={0} max={1} initialValue={this.state.alpha} customText={'α = ' + this.state.alpha}
                            onChange={(alpha) => this.setAlpha(alpha)}/></div>;
    }

    numberOfPointsSlider() {
        return <div>{t("number_of_points")}<Slider min={1} max={40} step={1}
                                         initialValue={this.state.numberOfPoints}
                                         onChange={(num) => this.setNumberOfPoints(num)}/>
        </div>;
    }

    clearPoints() {
        const owned = new Set<JXG.Point>(this.sampleMarkers);
        const present = this.sampleMarkers.filter(point => this.board.objectsList.includes(point)).reverse();
        if (present.length) this.board.removeObject(present);
        this.graphJXGPoints = this.graphJXGPoints.filter(point => !owned.has(point));
        this.sampleMarkers = [];
    }

    generateParamPoints(count: number = this.state.numberOfPoints) {
        const dt = 1 / (count + 1);
        for (let i = 1; i <= count; i++) {
            const point = this.createJSXGraphPoint(() => this.getFirstCurve()!.eval(this.alphaParam(i * dt)).X(), () => this.getFirstCurve()!.eval(this.alphaParam(i * dt)).Y(), {
                ...this.styles.point.fixed,
                size: () => this.displaySettings.pointSize * 0.5,
                fillColor: GraphPalette.parameterSample,
            });
            this.sampleMarkers.push(point.point);
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => this.displaySettings.pointSize / 5, strokeColor: GraphPalette.label});
        }
    }

    override presets(): string | undefined {
        return "alpha-param";
    }
}

export default AlphaParamBezierCurveGraph;
