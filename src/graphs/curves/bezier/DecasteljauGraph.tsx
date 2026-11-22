import {currentLanguage, message, t} from "../../../localization";
import {withDecimalSeparator} from "../../../analysis/format";
import type {GraphDeclaration, LegendEntry} from "../../base/declare/graphDeclaration";
import {runAs} from "../../base/writes/writeSource";
import {comparisonCurveColor} from "../../styles/GraphPalette";
import React from 'react';

import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {TransientState} from "../../base/BaseGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {Attributes} from "../../attributes/Attributes";
import {AnimationDriver} from '../../../learning/runtime/animation';
import {LessonAnimationCommand} from '../../../learning/model';
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {LiveParameter} from "./decasteljauLiveParameter";
import {DecasteljauAnimationControls, DecasteljauAnimationStatus} from "./DecasteljauAnimationControls";
import {onlyParameterStateChanged, PARAMETER_PUBLISH_INTERVAL_MS, statusAfterSceneReplacement} from "./decasteljauParameter";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {decasteljauPresetCollection} from "./collections";
import {reuseSamplesAcrossIntervalChanges} from "../object/intervalSampling";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";

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

/** The ids of De Casteljau's declaration (`DeclarationIds`): the parameter by arbiter key, the t row, the legend and the controls. */
export type DecasteljauIds = {
    param: "decasteljau-t";
    row: "t";
    note: never;
    legend: "curve" | "rest" | "point" | "scheme" | "control";
    section: never;
    action: "play" | "reset" | "full-curve";
};

class DecasteljauGraph extends BaseBezierCurveGraph<DecasteljauGraphStates> {
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    /** Play and the parameter lead Edit and stay while a curve is selected (graph-control first use). */
    protected override workspaceConstructionFirst() { return true; }
    /**
     * Deliberate drawing cache of the scene-store `t`: playback draws every frame but publishes `t` at a display
     * cadence, so this runs ahead of the store while playing. Saved scenes use it (`sceneGraphState`), and every scene
     * replacement resets it from the restored `t` (`syncReplacedScene`).
     */
    protected parameter = 0.5;
    private publishedParameter?: number;
    /** The playing parameter for the controls; frames report here and the scene store is written at state changes only. */
    private liveStore?: LiveParameter;
    /** Created on first use: scene replacement can reach it before this subclass's fields are initialised. */
    private get liveParameter(): LiveParameter { return this.liveStore ??= new LiveParameter(); }
    private lastPublishTime = -Infinity;
    private wholeCurveElement?: JXG.Curve;

    private readonly lessonAnimation = new AnimationDriver((delta, time) => {
        const next = Math.min(1, this.parameter + 0.015 * this.state.v * delta / 100 * 2);
        const finished = next >= 1;
        this.drawParameter(next);
        if (finished || time - this.lastPublishTime >= PARAMETER_PUBLISH_INTERVAL_MS) {
            this.lastPublishTime = time;
            if (finished) {
                this.publishedParameter = next;
                this.liveParameter.report(undefined);
                this.setState({t: next, animationStatus: "finished"});
            } else this.liveParameter.report(next);
        }
        // The final write above still belongs to the lease, so the driver stops after it.
        if (finished) this.lessonAnimation.stop();
    }).useLease({
        // Frames write `decasteljau-t` under a lease; when a higher write takes it, the control shows the run paused.
        arbiter: () => this.parameters,
        keys: ["decasteljau-t"],
        onInterrupted: () => {
            if (this.state.animationStatus === "playing") this.setParameter(this.parameter, "paused");
        },
    });

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1, animationStatus: "ready"};
    }

    protected override onStateChange(prevState: Readonly<DecasteljauGraphStates>) {
        if (prevState === this.state) { return; }
        // A published playback value may lag the drawn parameter; only external values move it.
        const parameterChanged = this.state.t !== prevState.t && this.state.t !== this.publishedParameter;
        if (parameterChanged) this.parameter = this.state.t;
        if (prevState.selectedCurveOption !== this.state.selectedCurveOption) this.pausePlayback();
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

    /**
     * The whole-curve plot evaluates the first curve, so it goes before an import disposes that curve; JSXGraph could
     * otherwise sample it while the replacement curve is not registered yet.
     */
    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        const element = this.wholeCurveElement;
        this.wholeCurveElement = undefined;
        if (element && this.board?.objectsList.includes(element)) this.board.removeObject(element);
    }

    /**
     * Playback is transient: every scene replacement ends it. A scene saved during playback (a checkpoint, a Preset or a
     * batch entry scene) is shown paused at its parameter, never as playing without a running driver.
     */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.lessonAnimation.stop();
        const animationStatus = statusAfterSceneReplacement(this.state.animationStatus);
        if (animationStatus !== this.state.animationStatus) this.setState({animationStatus});
    }

    /** A replaced scene is drawn at its own parameter, with no playback value left over from the previous scene. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.publishedParameter = undefined;
        this.lastPublishTime = -Infinity;
        this.liveParameter.report(undefined);
        this.drawParameter(this.state.t);
        this.syncWholeCurve();
    }

    protected override sceneGraphState(): DecasteljauGraphStates {
        return {...super.sceneGraphState(), t: this.parameter};
    }

    /**
     * The workspace refreshes after a model change (an applied curve command, a subdivision that adds a curve, a point edit),
     * never for a display switch, so it pauses a run (decision 57).
     */
    protected override refreshWorkspace(): void {
        this.pausePlayback();
        super.refreshWorkspace();
    }

    override mount(container: HTMLElement) {
        super.mount(container);
        // A press on the board (a drag, adding or deleting a point, or a pan) pauses the run (decision 57).
        this.getActiveGraphSession()?.on('down', () => this.pausePlayback());
    }

    override unmount() {
        this.lessonAnimation.dispose();
        super.unmount();
    }

    defaultPreset(): CurveCollectionPresetData {
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

    override presetCollection() {
        return decasteljauPresetCollection;
    }

    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        const curve = this.getFirstJxgCurve();
        curve.setIntervalEnd(() => this.state.wholeCurve ? 1 : this.parameter);
        curve.reuseSamplesAcrossIntervalChanges();
        curve.setAttributes(Attributes.bezierDisabled);
        curve.showDecasteljauPoints();
    }

    override initialize() {
        super.initialize();
        this.graphJXGPoints = this.getFirstJxgCurve().getJxgPoints();
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
            reuseSamplesAcrossIntervalChanges(this.wholeCurveElement, () => this.getFirstCurve());
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
        this.liveParameter.report(animationStatus === "playing" ? t : undefined);
        this.setState({t, animationStatus}, callback);
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("construction")}</h3>
            <OnOffSwitch checked={this.state.wholeCurve ? this.state.wholeCurve : false}
                onChange={checked => this.setState({wholeCurve: checked})} label={t("full_curve")}/></div></>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <DecasteljauAnimationControls status={this.state.animationStatus} parameter={this.state.t} live={this.liveParameter} speed={this.state.v}
                onPlay={() => this.playAnimation()} onPause={() => this.pauseAnimation()}
                onStop={() => this.stopAnimation()}
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

    /** A seek is an edit: it pauses a running animation (decision 57). */
    private changeParameter(value: number) {
        const running = this.lessonAnimation.isRunning();
        this.lessonAnimation.pause();
        this.setParameter(value, running ? "paused" : "ready");
    }

    /**
     * Parameter writes (ADR 0064). Key `decasteljau-t` (the lesson `t`). Writers: the
     * parameter slider (`learner`, a seek that pauses playback) and the lesson `parameter` action (`lesson`). Playback
     * frames move it under the driver's lease (`animation`); a learner or lesson write, or a frame change, ends it.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        // While playing, the drawn parameter runs ahead of the store; otherwise the store's `t` is the value, because the
        // drawn parameter follows a store write only when the host commits, after the write's source has closed.
        const read = () => this.lessonAnimation.isRunning() ? this.parameter : this.state.t;
        return {"decasteljau-t": {read, apply: (value: number) => this.changeParameter(value)}};
    }

    // ---- Declaration (task 02: nothing renders it yet) ----------------------------------------------------------------

    /**
     * Pure data from the scene state: the parameter `t` (the arbiter key), its readout as the present panel shows it,
     * the legend of what the board draws and the controls: play and reset on the board, the full curve in Orodja.
     * The speed is not bound in the arbiter, so it is not declared (see the placement note).
     */
    protected override declaration(): GraphDeclaration<DecasteljauIds> {
        const {t: value, animationStatus, wholeCurve} = this.state;
        const playing = animationStatus === "playing";
        const atStart = animationStatus === "ready" && value === 0;
        const degreeOne = (this.getFirstCurve()?.getPoints().length ?? 3) < 3;
        const legend: LegendEntry<DecasteljauIds>[] = [
            {id: "curve", label: message("decasteljau_legend_curve"), kind: "line", object: "curve"},
            {id: "rest", label: message("decasteljau_legend_rest"), kind: "dashed", object: "rest"},
            {id: "point", label: message("decasteljau_legend_point"), kind: "point", object: "point"},
            ...(degreeOne ? [] : [{id: "scheme" as const, label: message("decasteljau_legend_scheme"), kind: "point" as const, object: "scheme"}]),
            {id: "control", label: message("decasteljau_legend_control"), kind: "point", object: "control"},
        ];
        return {
            parameters: [{key: "decasteljau-t", kind: "range", label: message("animation_parameter"), symbol: "t", placement: "board", min: 0, max: 1, step: 0.01, maxDecimals: 2}],
            readouts: [{id: "values", rows: [{id: "t", name: message("decasteljau_t_name"), symbol: "t", value: {kind: "formatted", text: withDecimalSeparator(value.toFixed(2), currentLanguage())}}]}],
            legend,
            actions: [
                {id: "play", label: message("play"), placement: "board", enabled: true, pressed: playing},
                {id: "reset", label: message("reset"), placement: "board", enabled: !atStart || playing},
                {id: "full-curve", label: message("full_curve"), placement: "tools", section: "construction", enabled: true, pressed: wholeCurve === true},
            ],
        };
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const read = (element: JXG.GeometryElement | undefined, colorProperty: "strokecolor" | "fillcolor") => {
            if (!element) return undefined;
            // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
            const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
            return {color: String(drawn.evalVisProp(colorProperty)), visible: Boolean(drawn.evalVisProp("visible"))};
        };
        const curve = this.getFirstJxgCurve();
        if (!curve) return undefined;
        const scheme = curve.getJXGDecasteljauPoints();
        switch (id) {
            case "curve": return read(curve.getJxgCurve(), "strokecolor");
            // The remaining part exists only while the full curve is shown; absent, it is a hidden entry in its own colour.
            case "rest": return read(this.wholeCurveElement, "strokecolor") ?? {color: comparisonCurveColor(0), visible: false};
            case "point": return read(scheme[scheme.length - 1], "fillcolor");
            case "scheme": return read(scheme[0] === scheme[scheme.length - 1] ? undefined : scheme[0], "fillcolor");
            case "control": return read(curve.getJxgPoints()[0], "fillcolor");
            default: return undefined;
        }
    }

    override performAction(id: string): void {
        runAs("learner", () => {
            if (id === "play") {
                if (this.state.animationStatus === "playing") this.pauseAnimation(); else this.playAnimation();
            } else if (id === "reset") this.stopAnimation();
            else if (id === "full-curve") this.setState({wholeCurve: !this.state.wholeCurve});
            else throw new Error("Unknown action");
        });
    }

    protected override stopLessonAnimations(): void {
        this.lessonAnimation.stop();
    }

    /** An export captures one settled scene, so playback stops first. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Pauses at the drawn parameter; stopLessonAnimations() resets playback during scene replacement. */
    override pausePlayback(): void {
        if (this.lessonAnimation.isRunning() || this.state.animationStatus === "playing") this.pauseAnimation();
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
            const running = this.lessonAnimation.isRunning();
            this.lessonAnimation.pause();
            this.setParameter(action.value, running || this.state.animationStatus === "playing" ? "paused" : this.state.animationStatus);
        });
        registry.onDiscriminated('curve-visibility', 'decasteljau-full-curve', action => {
            this.setState({wholeCurve: action.visible});
            // Multiple lesson actions can be applied in one tick, so the host may coalesce
            // state notifications. Keep the JSXGraph auxiliary curve in step with each action.
            this.syncWholeCurve();
            this.boardUpdate();
        });
        // The frame animation has no iteration; `next-step` and `reset` are rejected rather than ignored.
        registry.onDiscriminated('animation', 'decasteljau',
            action => { if (isDecasteljauCommand(action.command)) this.setLessonAnimation(action.command); },
            {supports: action => isDecasteljauCommand(action.command)});
    }

}

export default DecasteljauGraph;
