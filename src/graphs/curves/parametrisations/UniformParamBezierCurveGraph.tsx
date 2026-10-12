import {t} from "../../../localization";
import Form from 'react-bootstrap/Form';
import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates} from "../ph/BasePhBezierCurveGraph";
import React from "react";
import Slider from "../../../inputs/Slider";
import {range} from "../../../utils/Range";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {PointStyles} from "../../styles/PointStyles";
import {SizeContext} from "../../context/SizeContext";
import {GraphPalette} from "../../styles/GraphPalette";
import {LessonAction} from "../../../learning/model";

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

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'parameterization-alpha') {
            if (!Number.isFinite(action.value) || action.value < 0 || action.value > 1) {
                throw new Error('The parametrization alpha must be between 0 and 1.');
            }
            this.setState({alpha: action.value});
            return;
        }
        if (action.kind === 'parameterization-samples') {
            if (!Number.isInteger(action.count) || action.count < 1 || action.count > 40) {
                throw new Error('The number of sample points must be an integer between 1 and 40.');
            }
            this.setState({numberOfPoints: action.count});
            return;
        }
        if (action.kind === 'parameterization-mode') {
            if (action.mode !== 'weighted' && action.mode !== 'uniform') {
                throw new Error('The parametrization mode must be weighted or uniform.');
            }
            this.setState({isAlphaParam: action.mode === 'weighted'});
            return;
        }
        super.applyLessonAction(action);
    }

    protected override workspaceDescription() {
        return t("compare_weighted_and_uniform_parametrization_of_the_ph_curve");
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>{super.workspaceEdit()}<div className="inspector-group">
            <h3>{t("parametrization")}</h3>{this.paramField()}
        </div></>;
    }

    protected override onStateChange(prevState: Readonly<UniformParamBezierCurveGraphStates>) {
        if (prevState === this.state) { return; }
        super.onStateChange(prevState);
        if (!this.getFirstJxgCurve()) { return; }
        this.board.suspendUpdate();
        this.refreshTs();
        if (this.sampleJxgPoints.length !== this.state.numberOfPoints) {
            this.clearPoints();
            this.generateParamPoints();
        }
        this.unsuspendBoardUpdate();
    }

    defaultPreset(): any {
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

    override getGraphCommands(): JSX.Element[] {
        return [this.paramField()];
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
            <Form className={'mb-3'}>
                <Form.Select
                    value={this.state.isAlphaParam ? "alpha" : "uniform"}
                    onChange={select => this.selectParam(select)}
                    aria-label={t("choose_parametrization")}>
                    <option value="alpha">{t("weighted_parametrization")}</option>
                    <option value="uniform">{t("uniform_parametrization")}</option>
                </Form.Select>
            </Form>
            <div>{t("number_of_points")}<Slider min={1} max={40} step={1}
                                      initialValue={this.state.numberOfPoints}
                                      onChange={(num) => this.setNumberOfPoints(num)}/>
            </div>
            {this.state.isAlphaParam ? <div>
                <Slider min={0} max={1} initialValue={this.state.alpha} customText={'α'}
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
                ...PointStyles.fixed,
                size: () => SizeContext.pointSize * 0.5,
                fillColor: GraphPalette.parameterSample,
            });
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => SizeContext.pointSize / 5, strokeColor: GraphPalette.label});
            this.sampleJxgPoints.push(point.point);
        }
    }

    override presets(): string | undefined {
        return "uniform-graph";
    }

    private selectParam(select: React.ChangeEvent<HTMLSelectElement>) {
        const param = select.target.value;
        this.setState({isAlphaParam: param === "alpha"});
    }
}

export default UniformParamBezierCurveGraph;
