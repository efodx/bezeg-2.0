import React from 'react';


import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseGraphState} from "../../base/BaseGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {AnimationDriver} from "../../../learning/runtime/animation";
import {DecasteljauAnimationControls, DecasteljauAnimationStatus} from "./DecasteljauAnimationControls";
import {PolynomialBezierCurve} from "../../../bezeg/impl/curve/polynomial-bezier-curve";
import {LessonSceneCheckpoint} from "../../../learning/model";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {Point} from "../../../bezeg/api/point/point";
import {Preset} from "../../base/presets/Presets";
import {skipRedundantHtmlTextClipping} from "../../base/htmlTextClipping";
import {onlyParameterStateChanged, PARAMETER_PUBLISH_INTERVAL_MS} from "./decasteljauParameter";

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    animationStatus: DecasteljauAnimationStatus
}

class DecasteljauGraph extends BaseBezierCurveGraph<DecasteljauGraphStates> {
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

    protected override onStateChange(prevState: Readonly<DecasteljauGraphStates>) {
        if (prevState === this.state) { return; }
        // A published playback value may lag the drawn parameter; only external values move it.
        const parameterChanged = this.state.t !== prevState.t && this.state.t !== this.publishedParameter;
        if (parameterChanged) this.parameter = this.state.t;
        if (!onlyParameterStateChanged(prevState, this.state)) {
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
        this.bindSceneToFirstCurve();
        this.boardUpdate();
    }

    /** Presets, lesson scenes and checkpoints replace the curve objects without calling initialize(). */
    override importPresetData(data: any) {
        super.importPresetData(data);
        this.bindSceneToFirstCurve();
    }

    /** Auxiliary board objects (helper points, segment, interpolating curves, main point) owned by this graph. */
    private helperObjects: any[] = [];

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeHelperObjects();
    }

    private removeHelperObjects() {
        const objects = this.helperObjects;
        this.helperObjects = [];
        if (this.graphJXGPoints) this.graphJXGPoints = this.graphJXGPoints.filter(point => !objects.includes(point));
        const board = this.board;
        if (!board) return;
        objects.reverse().forEach(object => {
            if (board.objectsList.includes(object)) board.removeObject(object);
        });
    }

    /** Idempotent: removes earlier helpers and rebinds the display settings and helpers to the current first curve. */
    private bindSceneToFirstCurve() {
        this.removeHelperObjects();
        const jxgCurve = this.getFirstJxgCurve();
        if (!jxgCurve || !this.board) return;
        jxgCurve.setAttributes({...jxgCurve.getAttributes(), selectable: false});
        this.graphJXGPoints = [];
        this.generateInterpolatingBezierCurves(jxgCurve);

        jxgCurve.setIntervalEnd(() => this.parameter);
        jxgCurve.setAttributes(Attributes.bezierDisabled);
        jxgCurve.setDecasteljauT(this.parameter);
    }

    protected override lessonDefaultState(): DecasteljauGraphStates {
        return {...super.lessonDefaultState(), t: 0.5, v: 1, animationStatus: "ready"};
    }

    protected override prepareLessonDefaultScene(): void {
        this.animation.stop();
        this.parameter = 0.5;
        this.publishedParameter = undefined;
        super.prepareLessonDefaultScene();
    }

    protected override restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        const t = (checkpoint.value as any)?.graphState?.t;
        if (typeof t === 'number' && Number.isFinite(t)) {
            this.parameter = t;
            this.publishedParameter = undefined;
        }
        super.restoreLessonState(checkpoint);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('parameter', 't', action => {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
                throw new Error('The De Casteljau parameter must be between 0 and 1.');
            }
            const running = this.animation.isRunning();
            this.animation.pause();
            this.setParameter(value, running || this.state.animationStatus === "playing" ? "paused" : this.state.animationStatus);
        });
    }

    override unmount() {
        this.animation.dispose();
        super.unmount();
    }

    protected override stopLessonAnimations(): void {
        this.animation.pause();
    }

    /** Publishes the drawn parameter and pauses without resetting it. */
    override pausePlayback(): void {
        if (this.animation.isRunning() || this.state.animationStatus === "playing") this.pauseAnimation();
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, runtimeState?: unknown): DecasteljauGraphStates {
        const state = super.figurePresetGraphState(graphState, runtimeState) as DecasteljauGraphStates;
        // The loaded scene starts at its own parameter, with no playback value left over from the previous scene.
        this.parameter = state.t;
        this.publishedParameter = undefined;
        this.lastPublishTime = -Infinity;
        return state.animationStatus === "playing" ? {...state, animationStatus: "paused"} : state;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <DecasteljauAnimationControls status={this.state.animationStatus} parameter={this.state.t} speed={this.state.v}
                onPlay={() => this.playAnimation()} onPause={() => this.pauseAnimation()}
                onStop={() => this.stopAnimation()} onReplay={() => this.replayAnimation()}
                onParameterChange={(value) => this.changeParameter(value)}
                onSpeedChange={(value) => this.setState({v: value})}/>
        ]) : [];
    }

    private generateInterpolatingBezierCurves(jxgCurve: ReturnType<DecasteljauGraph["getFirstJxgCurve"]>) {
        if (jxgCurve.getCurve().getPoints().length < 2) return;
        const own = <T, >(object: T): T => { this.helperObjects.push(object); return object; };

        // Both helper curves follow the live control points of the bound curve.
        const sliceCurve = (offset: number) => {
            let cached: {points: Point[], curve: PolynomialBezierCurve} | undefined;
            return () => {
                const all = jxgCurve.getCurve().getPoints();
                const points = all.slice(offset, offset + all.length - 1);
                if (!cached || cached.points.length !== points.length || points.some((point, i) => point !== cached!.points[i])) {
                    cached = {points, curve: new PolynomialBezierCurve(points)};
                }
                return cached.curve;
            };
        };
        const first = sliceCurve(0);
        const second = sliceCurve(1);

        const p1 = own(this.createJSXGraphPoint(() => first().eval(this.parameter).X(), () => first().eval(this.parameter).Y(), this.styles.point.fixed).point);
        const p2 = own(this.createJSXGraphPoint(() => second().eval(this.parameter).X(), () => second().eval(this.parameter).Y(), this.styles.point.fixed).point);

        own(this.board.create('segment', [p1, p2], this.styles.segment.default));

        own(this.sampleOnlyWhenChanged(this.board.create('curve',
            [(t: number) => first().eval(t).X(), (t: number) => first().eval(t).Y(), 0, () => 1],
            {...this.styles.curve.comparison(0), layer: 2}
        ) as JXG.Curve, first));
        own(this.sampleOnlyWhenChanged(this.board.create('curve',
            [(t: number) => second().eval(t).X(), (t: number) => second().eval(t).Y(), 0, () => 1],
            {...this.styles.curve.comparison(1), layer: 2}
        ) as JXG.Curve, second));
        own(this.board.create('point', [() => jxgCurve.getCurve().eval(this.parameter).X(), () => jxgCurve.getCurve().eval(this.parameter).Y()], {
            ...this.styles.point.result(0),
            name: () => ""
        }));
    }

    /**
     * The interpolating curves do not depend on the parameter, so they are sampled again only when
     * their control points, the board view or the drag sampling quality change instead of on every
     * animation frame.
     */
    private sampleOnlyWhenChanged(curve: JXG.Curve, source: () => PolynomialBezierCurve) {
        const element = curve as any;
        const sample = element.updateCurve;
        if (typeof sample !== 'function') return curve;
        let sampledFor: string | undefined;
        element.updateCurve = function () {
            const board = this.board;
            const key = [...source().getPoints().flatMap(point => [point.X(), point.Y()]),
                ...board.getBoundingBox(), board.canvasWidth, board.canvasHeight, board.updateQuality].join(",");
            if (key === sampledFor) return this;
            sampledFor = key;
            return sample.call(this);
        };
        return curve;
    }

    private playAnimation() {
        const restart = this.parameter >= 1;
        this.setParameter(restart ? 0 : this.parameter, "playing", this.whileMounted(() => this.animation.play()));
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
        this.setParameter(0, "playing", this.whileMounted(() => this.animation.replay()));
    }

    private changeParameter(value: number) {
        this.setParameter(value, this.animation.isRunning() ? "playing" : "ready");
    }
}

export default DecasteljauGraph;
