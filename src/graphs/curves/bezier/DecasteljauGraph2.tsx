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

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    animationStatus: DecasteljauAnimationStatus
}

class DecasteljauGraph extends BaseBezierCurveGraph<any, DecasteljauGraphStates> {
    private readonly animation = new AnimationDriver((delta) => {
        const next = this.state.t + 0.015 * this.state.v * delta / 100 * 2;
        this.setState({...this.state, t: next > 1 ? 0 : next, animationStatus: "playing"});
    });

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1, animationStatus: "ready"};
    }

    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<DecasteljauGraphStates>, snapshot?: any) {
        if (prevState === this.state && prevProps === this.props) { return; }
        this.board.suspendUpdate();
        this.getFirstJxgCurve().setDecasteljauT(this.state.t);
        this.unsuspendBoardUpdate();
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
        this.getFirstJxgCurve().setAttributes({...this.getFirstJxgCurve().getAttributes(), selectable: false});
        this.graphJXGPoints = this.getFirstJxgCurve().getJxgPoints();
        this.generateInterpolatingBezierCurves();

        this.getFirstJxgCurve().setIntervalEnd(() => this.state.t);
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.getFirstJxgCurve().setDecasteljauT(this.state.t);
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


        const p1 = this.createJSXGraphPoint(() => curvee.eval(this.state.t).X(), () => curvee.eval(this.state.t).Y(), PointStyles.fixed);
        const pp1 = this.graphJXGPoints[this.graphJXGPoints.length - 1];
        const p2 = this.createJSXGraphPoint(() => curvee2.eval(this.state.t).X(), () => curvee2.eval(this.state.t).Y(), PointStyles.fixed);
        const pp2 = this.graphJXGPoints[this.graphJXGPoints.length - 1];

        const segment = this.board.create('segment', [pp1, pp2], SegmentStyles.default);

        this.board.create('curve',
            [(t: number) => {
                return curvee.eval(t).X();
            },
                (t: number) => {
                    return curvee.eval(t).Y();
                },
                0,
                () => 1
            ], {...CurveStyles.default, strokeColor: Color.E, layer: 2}
        );
        this.board.create('curve',
            [(t: number) => {
                return curvee2.eval(t).X();
            },
                (t: number) => {
                    return curvee2.eval(t).Y();
                },
                0,
                () => 1
            ], {...CurveStyles.default, strokeColor: Color.G, layer: 2}
        );
        const drawingPoint = this.board?.create('point', [() => this.getFirstJxgCurve().getCurve().eval(this.state.t).X(), () => this.getFirstJxgCurve().getCurve().eval(this.state.t).Y()], {
            ...PointStyles.default,
            color: Colors[4],
            name: () => ""
        });
    }

    private playAnimation() {
        const restart = this.state.t >= 1;
        this.setState({...this.state, t: restart ? 0 : this.state.t, animationStatus: "playing"}, () => this.animation.play());
    }

    private pauseAnimation() {
        this.animation.pause();
        this.setState({...this.state, animationStatus: "paused"});
    }

    private stopAnimation() {
        this.animation.stop();
        this.setState({...this.state, t: 0, animationStatus: "ready"});
    }

    private replayAnimation() {
        this.setState({...this.state, t: 0, animationStatus: "playing"}, () => this.animation.replay());
    }

    private changeParameter(value: number) {
        this.setState({...this.state, t: value, animationStatus: this.animation.isRunning() ? "playing" : "ready"});
    }
}

export default DecasteljauGraph;
