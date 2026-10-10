import React from 'react';

import {Color, Colors} from "./utilities/Colors";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseGraphState} from "../../base/BaseGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {AnimationDriver} from "../../../learning/runtime/animation";
import {DecasteljauAnimationControls, DecasteljauAnimationStatus} from "./DecasteljauAnimationControls";
import {PolynomialBezierCurve} from "../../../bezeg/impl/curve/polynomial-bezier-curve";
import {PointStyles} from "../../styles/PointStyles";
import {SegmentStyles} from "../../styles/SegmentStyles";
import {CurveStyles} from "../../styles/CurveStyles";
import {LessonSceneCheckpoint} from "../../../learning/model";
import {Preset} from "../../base/presets/Presets";
import {skipRedundantHtmlTextClipping} from "../../base/htmlTextClipping";
import {onlyParameterStateChanged, PARAMETER_PUBLISH_INTERVAL_MS} from "./decasteljauParameter";

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    animationStatus: DecasteljauAnimationStatus
}

class DecasteljauGraph extends BaseBezierCurveGraph<any, DecasteljauGraphStates> {
    /** The drawn parameter; during playback React state follows it at a display cadence. */
    private parameter = 0.5;
    private publishedParameter?: number;
    private lastPublishTime = -Infinity;

    private readonly animation = new AnimationDriver((delta, time) => {
        const advanced = this.parameter + 0.015 * this.state.v * delta / 100 * 2;
        const next = advanced > 1 ? 0 : advanced;
        this.drawParameter(next);
        if (time - this.lastPublishTime >= PARAMETER_PUBLISH_INTERVAL_MS) {
            this.lastPublishTime = time;
            this.publishedParameter = next;
            this.setState({t: next, animationStatus: "playing"});
        }
    });

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1, animationStatus: "ready"};
    }

    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<DecasteljauGraphStates>, snapshot?: any) {
        if (prevState === this.state && prevProps === this.props) { return; }
        // A published playback value may lag the drawn parameter; only external values move it.
        const parameterChanged = this.state.t !== prevState.t && this.state.t !== this.publishedParameter;
        if (parameterChanged) this.parameter = this.state.t;
        if (prevProps !== this.props || !onlyParameterStateChanged(prevState, this.state)) {
            this.board.suspendUpdate();
            this.getFirstJxgCurve().setDecasteljauT(this.parameter);
            this.unsuspendBoardUpdate();
        } else if (parameterChanged) {
            this.drawParameter(this.parameter);
        }
    }

    override exportPreset(): Preset {
        const preset = super.exportPreset();
        const graphState: DecasteljauGraphStates = {...preset.graphState as DecasteljauGraphStates, t: this.parameter};
        return {...preset, graphState};
    }

    protected override captureLessonState(): LessonSceneCheckpoint {
        const checkpoint = super.captureLessonState();
        const value = checkpoint.value as {graphState: DecasteljauGraphStates};
        return {...checkpoint, value: {...value, graphState: {...value.graphState, t: this.parameter}}};
    }

    /** Draws a parameter-only change with an ordinary board update. */
    private drawParameter(t: number) {
        this.parameter = t;
        const curve = this.getFirstJxgCurve();
        if (!curve || !this.graphSession?.isAlive) return;
        curve.setDecasteljauT(t);
        this.boardUpdate();
    }

    /** Draws and publishes a parameter chosen outside playback. */
    private setParameter(t: number, animationStatus: DecasteljauAnimationStatus, callback?: () => void) {
        this.drawParameter(t);
        this.publishedParameter = t;
        this.setState({t, animationStatus}, callback);
    }

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]], "state": {
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


    override presets(): string {
        return "decasteljau2";
    }

    override initialize() {
        super.initialize();
        skipRedundantHtmlTextClipping(this.board);
        this.getFirstJxgCurve().setAttributes({...this.getFirstJxgCurve().getAttributes(), selectable: false});
        this.graphJXGPoints = this.getFirstJxgCurve().getJxgPoints();
        this.generateInterpolatingBezierCurves();

        this.getFirstJxgCurve().setIntervalEnd(() => this.parameter);
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.getFirstJxgCurve().setDecasteljauT(this.parameter);
        // this.getFirstJxgCurve().showDecasteljauPoints()
        this.boardUpdate();
    }

    override componentWillUnmount() {
        this.animation.dispose();
        super.componentWillUnmount();
    }

    protected override stopLessonAnimations(): void {
        this.animation.pause();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, runtimeState?: unknown): DecasteljauGraphStates {
        const state = super.figurePresetGraphState(graphState, runtimeState) as DecasteljauGraphStates;
        return state.animationStatus === "playing" ? {...state, animationStatus: "paused"} : state;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <DecasteljauAnimationControls status={this.state.animationStatus} parameter={this.state.t} speed={this.state.v}
                onPlay={() => this.playAnimation()} onPause={() => this.pauseAnimation()}
                onStop={() => this.stopAnimation()} onReplay={() => this.replayAnimation()}
                onParameterChange={(value) => this.changeParameter(value)}
                onSpeedChange={(value) => this.setState({...this.state, v: value})}/>
        ]) : [];
    }

    private generateInterpolatingBezierCurves() {
        const points = this.getFirstJxgCurve().getCurve().getPoints();
        const curve1points = points.slice(0, this.graphJXGPoints.length - 1);
        const curve2points = points.slice(1, this.graphJXGPoints.length);
        const curvee = new PolynomialBezierCurve(curve1points);
        const curvee2 = new PolynomialBezierCurve(curve2points);


        const p1 = this.createJSXGraphPoint(() => curvee.eval(this.parameter).X(), () => curvee.eval(this.parameter).Y(), PointStyles.fixed);
        const pp1 = this.graphJXGPoints[this.graphJXGPoints.length - 1];
        const p2 = this.createJSXGraphPoint(() => curvee2.eval(this.parameter).X(), () => curvee2.eval(this.parameter).Y(), PointStyles.fixed);
        const pp2 = this.graphJXGPoints[this.graphJXGPoints.length - 1];

        const segment = this.board.create('segment', [pp1, pp2], SegmentStyles.default);

        this.sampleOnlyWhenChanged(this.board.create('curve',
            [(t: number) => {
                return curvee.eval(t).X();
            },
                (t: number) => {
                    return curvee.eval(t).Y();
                },
                0,
                () => 1
            ], {...CurveStyles.default, strokeColor: Color.E, layer: 2}
        ) as JXG.Curve, curvee);
        this.sampleOnlyWhenChanged(this.board.create('curve',
            [(t: number) => {
                return curvee2.eval(t).X();
            },
                (t: number) => {
                    return curvee2.eval(t).Y();
                },
                0,
                () => 1
            ], {...CurveStyles.default, strokeColor: Color.G, layer: 2}
        ) as JXG.Curve, curvee2);
        const drawingPoint = this.board?.create('point', [() => this.getFirstJxgCurve().getCurve().eval(this.parameter).X(), () => this.getFirstJxgCurve().getCurve().eval(this.parameter).Y()], {
            ...PointStyles.default,
            color: Colors[4],
            name: () => ""
        });
    }

    /**
     * The interpolating curves do not depend on the parameter, so they are sampled again only when
     * their control points, the board view or the drag sampling quality change instead of on every
     * animation frame.
     */
    private sampleOnlyWhenChanged(curve: JXG.Curve, source: PolynomialBezierCurve) {
        const element = curve as any;
        const sample = element.updateCurve;
        let sampledFor: string | undefined;
        element.updateCurve = function () {
            const board = this.board;
            const key = [...source.getPoints().flatMap(point => [point.X(), point.Y()]),
                ...board.getBoundingBox(), board.canvasWidth, board.canvasHeight, board.updateQuality].join(",");
            if (key === sampledFor) return this;
            sampledFor = key;
            return sample.call(this);
        };
    }

    private playAnimation() {
        const restart = this.parameter >= 1;
        this.setParameter(restart ? 0 : this.parameter, "playing", () => this.animation.play());
    }

    private pauseAnimation() {
        this.animation.pause();
        this.setParameter(this.parameter, "paused");
    }

    private stopAnimation() {
        this.animation.stop();
        this.setParameter(0, "ready");
    }

    private replayAnimation() {
        this.setParameter(0, "playing", () => this.animation.replay());
    }

    private changeParameter(value: number) {
        this.setParameter(value, this.animation.isRunning() ? "playing" : "ready");
    }
}

export default DecasteljauGraph;
