import {t} from "../../../localization";
import React from 'react';

import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseGraphState} from "../../base/BaseGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {Attributes} from "../../attributes/Attributes";
import {AnimationDriver} from '../../../learning/runtime/animation';
import {LessonAnimationCommand, LessonSceneCheckpoint} from '../../../learning/model';
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {DecasteljauAnimationControls, DecasteljauAnimationStatus} from "./DecasteljauAnimationControls";
import {onlyParameterStateChanged, PARAMETER_PUBLISH_INTERVAL_MS} from "./decasteljauParameter";
import {Preset} from "../../base/presets/Presets";
import {skipRedundantHtmlTextClipping} from "../../base/htmlTextClipping";

type DecasteljauAnimationCommand = Extract<LessonAnimationCommand, 'play' | 'pause' | 'replay' | 'stop'>;
const DECASTELJAU_ANIMATION_COMMANDS: readonly DecasteljauAnimationCommand[] = ['play', 'pause', 'replay', 'stop'];
const isDecasteljauCommand = (command: LessonAnimationCommand): command is DecasteljauAnimationCommand =>
    DECASTELJAU_ANIMATION_COMMANDS.some(known => known === command);

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    wholeCurve?: boolean,
    animationStatus: DecasteljauAnimationStatus
}

class DecasteljauGraph extends BaseBezierCurveGraph<DecasteljauGraphStates> {
    /** The drawn parameter; during playback React state follows it at a display cadence. */
    protected parameter = 0.5;
    private publishedParameter?: number;
    private lastPublishTime = -Infinity;
    private wholeCurveElement?: JXG.Curve;

    private readonly lessonAnimation = new AnimationDriver((delta, time) => {
        const next = Math.min(1, this.parameter + 0.015 * this.state.v * delta / 100 * 2);
        const finished = next >= 1;
        if (finished) this.lessonAnimation.stop();
        this.drawParameter(next);
        if (finished || time - this.lastPublishTime >= PARAMETER_PUBLISH_INTERVAL_MS) {
            this.lastPublishTime = time;
            this.publishedParameter = next;
            this.setState({t: next, animationStatus: finished ? "finished" : "playing"});
        }
    });

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1, animationStatus: "ready"};
    }

    protected override onStateChange(prevState: Readonly<DecasteljauGraphStates>) {
        if (prevState === this.state) { return; }
        // A published playback value may lag the drawn parameter; only external values move it.
        const parameterChanged = this.state.t !== prevState.t && this.state.t !== this.publishedParameter;
        if (parameterChanged) this.parameter = this.state.t;
        const wholeCurveChanged = this.state.wholeCurve !== prevState.wholeCurve;
        if (wholeCurveChanged) this.syncWholeCurve();
        if (!onlyParameterStateChanged(prevState, this.state, ["wholeCurve"])) {
            this.board.suspendUpdate();
            this.getFirstJxgCurve().setDecasteljauT(this.parameter);
            this.unsuspendBoardUpdate();
        } else if (parameterChanged || wholeCurveChanged) {
            this.drawParameter(this.parameter);
        }
    }

    protected override resetSceneFields(): void {
        super.resetSceneFields();
        // The previous scene element was removed with the board objects.
        this.wholeCurveElement = undefined;
    }

    override unmount() {
        this.lessonAnimation.dispose();
        super.unmount();
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
        curve.setIntervalEnd(() => this.state.wholeCurve ? 1 : this.parameter);
        curve.setAttributes(Attributes.bezierDisabled);
        curve.showDecasteljauPoints();
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

    override initialize() {
        super.initialize();
        skipRedundantHtmlTextClipping(this.board);
        this.graphJXGPoints = this.getFirstJxgCurve().getJxgPoints();
        this.getFirstJxgCurve().setIntervalEnd(() => this.state.wholeCurve ? 1 : this.parameter);
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.getFirstJxgCurve().showDecasteljauPoints();
        this.getFirstJxgCurve().setDecasteljauT(this.parameter);

        // Figure scene restores remove board objects before initializing again.
        this.wholeCurveElement = undefined;
        this.syncWholeCurve();
        this.boardUpdate();
    }

    /**
     * JSXGraph samples a curve before checking its visibility, so the remaining part of the
     * curve exists only while it is shown.
     */
    private syncWholeCurve() {
        if (!this.graphSession?.isAlive) return;
        if (this.state.wholeCurve && !this.wholeCurveElement) {
            this.wholeCurveElement = this.board.create('curve',
                [(t: number) => this.getFirstCurve().eval(t).X(),
                    (t: number) => this.getFirstCurve().eval(t).Y(),
                    () => this.parameter,
                    1
                ], this.styles.curve.comparison(0)
            ) as JXG.Curve;
        } else if (!this.state.wholeCurve && this.wholeCurveElement) {
            this.board.removeObject(this.wholeCurveElement);
            this.wholeCurveElement = undefined;
        }
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

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<OnOffSwitch
            checked={this.state.wholeCurve ? this.state.wholeCurve : false}
            onChange={checked => this.setState({wholeCurve: checked})}
            label={t("full_curve")}></OnOffSwitch>,
            <DecasteljauAnimationControls status={this.state.animationStatus} parameter={this.state.t} speed={this.state.v}
                onPlay={() => this.playAnimation()} onPause={() => this.pauseAnimation()}
                onStop={() => this.stopAnimation()} onReplay={() => this.replayAnimation()}
                onParameterChange={(value) => this.changeParameter(value)}
                onSpeedChange={(value) => this.setState({v: value})}/>]) : [];
    }

    private playAnimation() {
        const restart = this.parameter >= 1;
        this.setParameter(restart ? 0 : this.parameter, "playing", this.whileMounted(() => this.lessonAnimation.play()));
    }

    private pauseAnimation() {
        this.lessonAnimation.pause();
        this.setParameter(this.parameter, "paused");
    }

    private stopAnimation() {
        this.lessonAnimation.stop();
        this.setParameter(0, "ready");
    }

    private replayAnimation() {
        this.setParameter(0, "playing", this.whileMounted(() => this.lessonAnimation.replay()));
    }

    private changeParameter(value: number) {
        this.setParameter(value, this.lessonAnimation.isRunning() ? "playing" : "ready");
    }

    protected override stopLessonAnimations(): void {
        this.lessonAnimation.stop();
    }

    /** Pauses at the drawn parameter; stopLessonAnimations() resets playback during scene replacement. */
    override pausePlayback(): void {
        if (this.lessonAnimation.isRunning() || this.state.animationStatus === "playing") this.pauseAnimation();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, runtimeState?: unknown): DecasteljauGraphStates {
        const state = super.figurePresetGraphState(graphState, runtimeState) as DecasteljauGraphStates;
        // The loaded scene starts at its own parameter, with no playback value left over from the previous scene.
        this.parameter = state.t;
        this.publishedParameter = undefined;
        this.lastPublishTime = -Infinity;
        return state.animationStatus === "playing" ? {...state, animationStatus: "paused"} : state;
    }

    public setLessonAnimation(action: DecasteljauAnimationCommand) {
        if (action === 'play') this.playAnimation();
        if (action === 'pause') this.pauseAnimation();
        if (action === 'replay') this.replayAnimation();
        if (action === 'stop') this.stopAnimation();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('parameter', 't', action => {
            if (action.value < 0 || action.value > 1 || !Number.isFinite(action.value)) {
                throw new Error('The De Casteljau parameter must be between 0 and 1.');
            }
            this.setParameter(action.value, this.state.animationStatus);
        });
        // The frame animation has no iteration; `next-step` and `reset` are rejected rather than ignored.
        registry.onDiscriminated('animation', 'decasteljau',
            action => { if (isDecasteljauCommand(action.command)) this.setLessonAnimation(action.command); },
            {supports: action => isDecasteljauCommand(action.command)});
    }

}

export default DecasteljauGraph;
