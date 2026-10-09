import {t} from "../../../localization";
import React from 'react';

import {Colors} from "./utilities/Colors";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {CurveStyles} from "../../styles/CurveStyles";
import {Attributes} from "../../attributes/Attributes";
import {AnimationDriver} from '../../../learning/runtime/animation';
import {LessonAction} from '../../../learning/model';
import {DecasteljauAnimationControls, DecasteljauAnimationStatus} from "./DecasteljauAnimationControls";

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    wholeCurve?: boolean,
    animationStatus: DecasteljauAnimationStatus
}

class DecasteljauGraph extends BaseBezierCurveGraph<any, DecasteljauGraphStates> {
    private readonly lessonAnimation = new AnimationDriver((delta) => {
        const next = Math.min(1, this.state.t + 0.015 * this.state.v * delta / 100 * 2);
        const finished = next >= 1;
        if (finished) this.lessonAnimation.stop();
        this.setState({...this.state, t: next, animationStatus: finished ? "finished" : "playing"});
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

    override componentWillUnmount() {
        this.lessonAnimation.dispose();
        super.componentWillUnmount();
    }

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": true,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    override presets(): string {
        return "decasteljau";
    }

    override importPresetData(data: any) {
        super.importPresetData(data);
        const curve = this.getFirstJxgCurve();
        curve.setIntervalEnd(() => this.state.wholeCurve ? 1 : this.state.t);
        curve.setAttributes(Attributes.bezierDisabled);
        curve.showDecasteljauPoints();
    }

    override initialize() {
        super.initialize();
        this.graphJXGPoints = this.getFirstJxgCurve().getJxgPoints();
        this.getFirstJxgCurve().setIntervalEnd(() => this.state.wholeCurve ? 1 : this.state.t);
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.getFirstJxgCurve().showDecasteljauPoints();

        const curve = this.getFirstCurve();
        this.board.create('curve',
            [(t: number) => {
                return curve.eval(t).X();
            },
                (t: number) => {
                    return curve.eval(t).Y();
                },
                () => this.state.t,
                1
            ], {...CurveStyles.default, strokeColor: Colors[2], visible: () => this.state.wholeCurve}
        );
        this.boardUpdate();
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<OnOffSwitch
            initialState={this.state.wholeCurve ? this.state.wholeCurve : false}
            onChange={checked => this.setState({...this.state, wholeCurve: checked})}
            label={t("full_curve")}></OnOffSwitch>,
            <DecasteljauAnimationControls status={this.state.animationStatus} parameter={this.state.t} speed={this.state.v}
                onPlay={() => this.playAnimation()} onPause={() => this.pauseAnimation()}
                onStop={() => this.stopAnimation()} onReplay={() => this.replayAnimation()}
                onParameterChange={(value) => this.changeParameter(value)}
                onSpeedChange={(value) => this.setState({...this.state, v: value})}/>]) : [];
    }

    private playAnimation() {
        const restart = this.state.t >= 1;
        this.setState({...this.state, t: restart ? 0 : this.state.t, animationStatus: "playing"}, () => this.lessonAnimation.play());
    }

    private pauseAnimation() {
        this.lessonAnimation.pause();
        this.setState({...this.state, animationStatus: "paused"});
    }

    private stopAnimation() {
        this.lessonAnimation.stop();
        this.setState({...this.state, t: 0, animationStatus: "ready"});
    }

    private replayAnimation() {
        this.setState({...this.state, t: 0, animationStatus: "playing"}, () => this.lessonAnimation.replay());
    }

    private changeParameter(value: number) {
        this.setState({...this.state, t: value, animationStatus: this.lessonAnimation.isRunning() ? "playing" : "ready"});
    }

    protected override stopLessonAnimations(): void {
        this.lessonAnimation.stop();
    }

    public setLessonAnimation(action: Extract<LessonAction, {kind: 'animation'}>['command']) {
        if (action === 'play') this.playAnimation();
        if (action === 'pause') this.pauseAnimation();
        if (action === 'replay') this.replayAnimation();
        if (action === 'stop') this.stopAnimation();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'parameter' && action.name === 't') {
            if (action.value < 0 || action.value > 1 || !Number.isFinite(action.value)) {
                throw new Error('The De Casteljau parameter must be between 0 and 1.');
            }
            this.setState({...this.state, t: action.value});
            this.getFirstJxgCurve().setDecasteljauT(action.value);
            this.boardUpdate();
            return;
        }
        if (action.kind === 'animation' && action.animationId === 'decasteljau') {
            this.setLessonAnimation(action.command);
            return;
        }
        super.applyLessonAction(action);
    }

}

export default DecasteljauGraph;
