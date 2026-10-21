import {t} from "../../../localization";
import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates} from "../ph/BasePhBezierCurveGraph";
import React from "react";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {range} from "../../../utils/Range";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {GraphPalette} from "../../styles/GraphPalette";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

interface UniformParamBezierCurveGraphStates extends BasePhBezierCurveGraphStates {
    isAlphaParam: boolean
    numberOfPoints: number
    alpha: number
}

class UniformParamBezierCurveGraph extends BasePhBezierCurveGraph<UniformParamBezierCurveGraphStates> {
    private ts?: number[];
    /** Sample points this graph created; the only points clearPoints() may remove. */
    private sampleJxgPoints: JXG.Point[] = [];

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        // The scene disposal removes graphJXGPoints (which include the samples) from the board.
        this.ts = undefined;
        this.sampleJxgPoints = [];
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('parameterization-alpha', action => {
            if (!Number.isFinite(action.value) || action.value < 0 || action.value > 1) {
                throw new Error('The parametrization alpha must be between 0 and 1.');
            }
            this.setState({alpha: action.value});
        });
        registry.on('parameterization-samples', action => {
            if (!Number.isInteger(action.count) || action.count < 1 || action.count > 40) {
                throw new Error('The number of sample points must be an integer between 1 and 40.');
            }
            this.setState({numberOfPoints: action.count});
        });
        registry.on('parameterization-mode', action => {
            if (action.mode !== 'weighted' && action.mode !== 'uniform') {
                throw new Error('The parametrization mode must be weighted or uniform.');
            }
            this.setState({isAlphaParam: action.mode === 'weighted'});
        });
    }

    protected override workspaceDescription() {
        return t("compare_weighted_and_uniform_parametrization_of_the_ph_curve");
    }

    /** The sampling group precedes the hodograph board so the parameter choice is reached first. */
    protected override workspaceBeforeHodograph(): React.ReactNode {
        return <div className="inspector-group">
            <h3>{t("parametrization")}</h3>{this.paramField()}
        </div>;
    }

    protected override onStateChange(prevState: Readonly<UniformParamBezierCurveGraphStates>) {
        if (prevState === this.state) { return; }
        super.onStateChange(prevState);
        this.syncSamplesToState();
    }

    /** The parameter values and sample markers are rebuilt on an imported curve before the host commits. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncSamplesToState();
    }

    /** Idempotent: recomputes the sample parameters and brings the markers in line with the scene state. */
    private syncSamplesToState() {
        if (!this.getFirstJxgCurve() || !this.graphSession?.isAlive) { return; }
        this.board.suspendUpdate();
        this.refreshTs();
        if (this.sampleJxgPoints.length !== this.state.numberOfPoints) {
            this.clearPoints();
            this.generateParamPoints();
        }
        this.unsuspendBoardUpdate();
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXPHBezierCurve", {
            "points": [[-3, -4]], "hodographs": [[-4.5, -4], [-1, 0], [-4.5, 4]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2,
                "showOffsetCurveControlPoints": false,
                "showOffsetCurve": false
            }
        }]];
    }

    override getInitialState(): UniformParamBezierCurveGraphStates {
        return {
            ...super.getInitialState(), isAlphaParam: true, alpha: 0.5, numberOfPoints: 10
        };
    }

    alphaParam(t: number): number {
        return (1 - this.state.alpha) * t / (this.state.alpha * (1 - t) + (1 - this.state.alpha) * t);
    }

    override getFirstCurve(): PhBezierCurve {
        return super.getFirstCurve() as PhBezierCurve;
    }

    setAlpha(alpha: number) {
        this.setState({alpha: alpha});
    }

    getUniformParamTs() {
        const curve = this.getFirstCurve();
        const curveLength = curve.s(1);
        const ds = curveLength / (this.state.numberOfPoints + 1);
        let t = 0;
        const ts = [];
        for (let i = 0; i <= this.state.numberOfPoints; i++) {
            t = curve.tk(t, ds, i + 1);
            ts.push(t);
        }
        return ts;
    }

    setNumberOfPoints(numberOfPoints: number) {
        this.setState({numberOfPoints: numberOfPoints});
    }

    paramField() {
        return <div>
            <div className="mb-3">
                <ChoiceSelect label={t("choose_parametrization")}
                              value={this.state.isAlphaParam ? "alpha" : "uniform"}
                              options={[{value: "alpha", text: t("weighted_parametrization")},
                                  {value: "uniform", text: t("uniform_parametrization")}]}
                              onChange={value => this.selectParam(value)}/>
            </div>
            <div><Slider customText={t("number_of_points")} min={1} max={40} step={1}
                         value={this.state.numberOfPoints}
                         onChange={(num) => this.setNumberOfPoints(num)}/>
            </div>
            {this.state.isAlphaParam ? <div>
                <Slider min={0} max={1} value={this.state.alpha} customText={t("parameter_alpha")}
                        onChange={(alpha) => this.setAlpha(alpha)}/>
            </div> : null}

        </div>;
    }

    clearPoints() {
        const owned = this.sampleJxgPoints;
        this.sampleJxgPoints = [];
        this.graphJXGPoints = this.graphJXGPoints.filter(point => !owned.includes(point));
        const present = owned.filter(point => this.board.objectsList.includes(point));
        if (present.length) this.board.removeObject(present);
    }

    refreshTs() {
        const dt = 1 / (this.state.numberOfPoints + 1);
        if (this.state.isAlphaParam) {
            this.ts = range(1, this.state.numberOfPoints + 1, 1).map(i => this.alphaParam(i * dt));
        } else {
            this.ts = this.getUniformParamTs();
        }
    }

    generateParamPoints() {
        for (let i = 1; i <= this.state.numberOfPoints; i++) {
            let point = this.createJSXGraphPoint(() => this.getFirstCurve().eval(this.ts?.[i - 1] ?? 0).X(), () => this.getFirstCurve().eval(this.ts?.[i - 1] ?? 0).Y(), {
                ...this.styles.point.fixed,
                size: () => this.displaySettings.pointSize * 0.5,
                fillColor: GraphPalette.parameterSample,
            });
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => this.displaySettings.pointSize / 5, strokeColor: GraphPalette.label});
            this.sampleJxgPoints.push(point.point);
        }
    }

    override presetCollection() {
        return curvePresetCollections["uniform-parameterization"];
    }

    private selectParam(param: string) {
        this.setState({isAlphaParam: param === "alpha"});
    }
}

export default UniformParamBezierCurveGraph;
