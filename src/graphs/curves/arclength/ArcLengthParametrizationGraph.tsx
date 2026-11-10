import React from "react";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {AnimationDriver, AnimationScheduler} from "../../../learning/runtime/animation";
import BaseCurveGraph, {BaseGraphStates} from "../../base/BaseCurveGraph";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {fitBoundingBox} from "../../base/fitBoundingBox";
import {arcLengthParamPresetCollection, CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {PlaybackButtons} from "../../base/controls/PlaybackButtons";
import {JXGPHBezierCurve} from "../object/JXGPHBezierCurve";
import {ARC_MOVER_MODES, ARC_PIECES_DEFAULT, ARC_PIECES_MAX, ARC_PIECES_MIN, ArcMoverMode} from "./arcLengthModel";
import {ArcLengthOverlay} from "./ArcLengthOverlay";
import {ReadoutDetails, ReadoutDetailsController} from "../ReadoutDetails";
import {ArcSpeedPlot, ArcSpeedPlotController} from "./ArcSpeedPlot";

export type ArcCurveKind = 'bezier' | 'ph';
export const ARC_CURVE_KINDS: readonly ArcCurveKind[] = ['bezier', 'ph'];
export {ARC_PIECES_DEFAULT, ARC_PIECES_MAX, ARC_PIECES_MIN};
export type {ArcMoverMode};

/** The cubic Q of the spec: length 6.390976, chord 4 and control polygon 8.32456 bracket it. */
export const ARC_Q_POINTS: number[][] = [[0, 0], [1, 3], [3, 3], [4, 0]];
/** The time one traversal of the mover takes (position 0 to 1) while playing, in milliseconds. */
export const ARC_TRAVERSAL_MS = 6000;
/** How often the inspector re-renders during playback, so the position slider follows the point. */
const ARC_SLIDER_SYNC_MS = 250;

const KIND_VIEW: Readonly<Record<ArcCurveKind, [number, number, number, number]>> = {
    bezier: [-1.5, 6.2, 5.5, -1.4],
    ph: [-6, 7, 6, -4],
};

const DISPLAY_STATE = {
    showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false,
    subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2,
};

function bezierDefaultPreset(): CurveCollectionPresetData {
    return [["JSXBezierCurve", {points: ARC_Q_POINTS.map(point => [...point]), state: {...DISPLAY_STATE}}]];
}

/** The cubic PH curve of the spec (start and hodograph points as the PH route's cubic preset). */
function phDefaultPreset(): CurveCollectionPresetData {
    return [["JSXPHBezierCurve", {
        points: [[-4.2, -2]], hodographs: [[-3.5, -1.7], [-2.6, 1.7]],
        state: {...DISPLAY_STATE, showOffsetCurveControlPoints: false, showOffsetCurve: false, offsetCurveNumber: 1},
    }]];
}

/** The default scene of each curve kind. */
export function arcPresetFor(kind: ArcCurveKind): CurveCollectionPresetData {
    return kind === 'ph' ? phDefaultPreset() : bezierDefaultPreset();
}

export function isArcCurveKind(value: unknown): value is ArcCurveKind {
    return typeof value === 'string' && (ARC_CURVE_KINDS as readonly string[]).includes(value);
}

export function isArcMoverMode(value: unknown): value is ArcMoverMode {
    return typeof value === 'string' && (ARC_MOVER_MODES as readonly string[]).includes(value);
}

export interface ArcLengthStates extends BaseGraphStates {
    arcPieces: number;
    arcEqualTShown: boolean;
    arcEqualArcShown: boolean;
    arcSpeedPlotShown: boolean;
    arcMoverMode: ArcMoverMode;
    /** A fraction of the parameter t or of the length L, by the mover mode. Committed when playback pauses. */
    arcMoverPosition: number;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function curveLabel(kind: ArcCurveKind): string {
    return kind === 'ph' ? t("arcparam_curve_ph") : t("arcparam_curve_bezier");
}

/**
 * Arc-length parametrization Demonstration (lesson D3): equal steps in t against equal arcs on a cubic Bezier curve or the
 * cubic PH curve, the speed plot, the length readouts and a moving point at constant t-speed or constant arc speed. The
 * kind is read from the live curve, never stored. The PH curve is fixed here (as on the offset route); the Bezier cubic
 * keeps its degree (no structured editing). Both kinds use the numerical table of the kernel; the exact s(1) of a PH curve
 * is shown beside it.
 *
 * Playback: the graph owns one frame loop. It advances a live position by the elapsed time and redraws the board directly;
 * no graph state is written per frame. `arcMoverPosition` is committed when playback pauses. The inspector renders every
 * {@link ARC_SLIDER_SYNC_MS} so the disabled position slider follows the point without a React render per frame.
 * A press on the board (a drag), Reset, a scene import, an undo that changes the mover, and unmount stop the loop. The
 * position slider is disabled while playing, since the frame loop owns the position.
 */
class ArcLengthParametrizationGraph extends BaseCurveGraph<ArcLengthStates> {
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    private overlay?: ArcLengthOverlay;
    private drawn?: { pieces: number, equalT: boolean, equalArc: boolean, mode: ArcMoverMode };
    private readonly liveReadout = new SettledReadout();
    private readonly plot = new ArcSpeedPlotController();
    private readonly details = new ReadoutDetailsController();
    private driver?: AnimationDriver;
    private playing = false;
    private livePosition = 0;
    private sinceSliderSync = 0;

    curveKind(): ArcCurveKind {
        return this.phCurve() ? 'ph' : 'bezier';
    }

    private phCurve(): JXGPHBezierCurve | undefined {
        const live: unknown = this.getFirstJxgCurve();
        return live instanceof JXGPHBezierCurve ? live : undefined;
    }

    override getInitialState(): ArcLengthStates {
        return {
            ...super.getInitialState(),
            arcPieces: ARC_PIECES_DEFAULT,
            arcEqualTShown: true,
            arcEqualArcShown: true,
            arcSpeedPlotShown: true,
            arcMoverMode: 'parameter',
            arcMoverPosition: 0,
        };
    }

    defaultPreset(): CurveCollectionPresetData {
        return bezierDefaultPreset();
    }

    override presetCollection() {
        return arcLengthParamPresetCollection;
    }

    protected override initialView(): [number, number, number, number] {
        return [...KIND_VIEW.bezier];
    }

    override initialize() {
        super.initialize();
        this.ensureOverlay();
    }

    override mount(container: HTMLElement) {
        super.mount(container);
        // A press on the board (a drag of a control point, or a pan) pauses playback.
        this.getActiveGraphSession()?.on('down', () => this.pause());
    }

    override importPresetData(data: CurveCollectionPresetData) {
        this.stopPlayback(false);
        super.importPresetData(data);
        this.ensureOverlay();
    }

    /** Reset stops playback before the scene is reloaded. */
    override reset(): Promise<void> {
        this.stopPlayback(false);
        return super.reset();
    }

    // ---- Values the board draws (a restored Preset may hold anything, so they are bounded here) ------------------------

    private effectivePieces() { return Math.round(clampNumber(this.state.arcPieces, ARC_PIECES_MIN, ARC_PIECES_MAX, ARC_PIECES_DEFAULT)); }
    private effectiveEqualT() { return this.state.arcEqualTShown !== false; }
    private effectiveEqualArc() { return this.state.arcEqualArcShown !== false; }
    private effectiveMode(): ArcMoverMode { return isArcMoverMode(this.state.arcMoverMode) ? this.state.arcMoverMode : 'parameter'; }
    private effectivePosition() { return clampNumber(this.state.arcMoverPosition, 0, 1, 0); }
    /** The position the mover is drawn at: the playback position while playing, else the committed state. */
    private moverPosition() { return this.playing ? this.livePosition : this.effectivePosition(); }

    controlRows(): number[][] | undefined {
        const curve = this.getFirstCurve();
        return curve ? curve.getPoints().map(point => [point.X(), point.Y()]) : undefined;
    }

    /** Exact s(1) of the live curve when it is a PH curve; undefined for any other curve. */
    private exactLength(): number | undefined {
        const ph = this.phCurve();
        return ph ? ph.getCurve().arcLength() : undefined;
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.stopPlayback(false);
        this.boardUpdate();
        if (this.overlay) this.liveReadout.replace(this.overlay.readoutText());
    }

    /** The live overlay, for the lesson and tests. */
    arcOverlay(): ArcLengthOverlay | undefined { return this.overlay; }
    /** The plot controller, for tests. */
    speedPlot(): ArcSpeedPlotController { return this.plot; }
    /** The details controller, for tests. */
    detailsList(): ReadoutDetailsController { return this.details; }
    isPlaying(): boolean { return this.playing; }

    private ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new ArcLengthOverlay({
            board: this.board,
            rows: () => this.controlRows(),
            pieces: () => {
                this.drawn = {
                    pieces: this.effectivePieces(), equalT: this.effectiveEqualT(), equalArc: this.effectiveEqualArc(), mode: this.effectiveMode(),
                };
                return this.effectivePieces();
            },
            equalTShown: () => this.effectiveEqualT(),
            equalArcShown: () => this.effectiveEqualArc(),
            moverMode: () => this.effectiveMode(),
            moverPosition: () => this.moverPosition(),
            exactLength: () => this.exactLength(),
            fontSize: () => this.displaySettings.fontSize,
            plot: this.plot,
            details: this.details,
            onReadout: text => this.liveReadout.report(text),
        });
    }

    private removeOverlay() {
        this.overlay?.dispose();
        this.overlay = undefined;
    }

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeOverlay();
    }

    override unmount() {
        this.stopPlayback(false);
        this.removeOverlay();
        this.liveReadout.cancel();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<ArcLengthStates>) {
        super.onStateChange(prevState);
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.pieces !== this.effectivePieces() || drawn.equalT !== this.effectiveEqualT()
            || drawn.equalArc !== this.effectiveEqualArc() || drawn.mode !== this.effectiveMode());
        if (prevState === this.state) return;
        const moverMoved = prevState.arcMoverPosition !== this.state.arcMoverPosition || prevState.arcMoverMode !== this.state.arcMoverMode;
        // The loop commits its own position only after it stops, so a change while it runs is somebody else's (a slider, an undo).
        if (this.playing && moverMoved) this.stopPlayback(false);
        const changed = stale || moverMoved || prevState.arcPieces !== this.state.arcPieces
            || prevState.arcEqualTShown !== this.state.arcEqualTShown || prevState.arcEqualArcShown !== this.state.arcEqualArcShown;
        if (!changed) return;
        this.boardUpdate();
    }

    // ---- Playback --------------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    }

    /** Starts the frame loop from the committed position (from 0 when that is 1). Under reduced motion nothing moves; the slider still sets the position. */
    play() {
        if (this.playing || this.reducedMotion() || !this.board || !this.graphSession?.isAlive) return;
        const start = this.effectivePosition();
        this.livePosition = start >= 1 ? 0 : start;
        this.sinceSliderSync = 0;
        this.playing = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.refreshWorkspace();
    }

    /** Stops the loop and commits the playback position. */
    pause() {
        if (!this.playing) return;
        this.stopPlayback(true);
    }

    private advance(delta: number) {
        if (!this.playing || !this.graphSession?.isAlive || !this.hasBoard) return;
        const next = this.livePosition + delta / ARC_TRAVERSAL_MS;
        this.livePosition = next >= 1 ? next - Math.floor(next) : next;
        this.board.update();
        this.sinceSliderSync += delta;
        if (this.sinceSliderSync >= ARC_SLIDER_SYNC_MS) {
            this.sinceSliderSync = 0;
            this.refreshWorkspace();
        }
    }

    private stopPlayback(commit: boolean) {
        this.driver?.dispose();
        this.driver = undefined;
        if (!this.playing) return;
        this.playing = false;
        if (commit && this.graphSession?.isAlive) this.setState({arcMoverPosition: this.livePosition});
        if (this.graphSession?.isAlive) this.refreshWorkspace();
    }

    // ---- Operations ------------------------------------------------------------------------------------------------

    setArcPieces(value: number) {
        if (!Number.isInteger(value) || value < ARC_PIECES_MIN || value > ARC_PIECES_MAX) {
            throw new Error(`The number of pieces must be an integer from ${ARC_PIECES_MIN} to ${ARC_PIECES_MAX}.`);
        }
        this.setState({arcPieces: value});
    }

    setArcEqualTShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The equal-t marks must be switched on or off.');
        this.setState({arcEqualTShown: visible});
    }

    setArcEqualArcShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The equal-arc marks must be switched on or off.');
        this.setState({arcEqualArcShown: visible});
    }

    setArcSpeedPlotShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The speed graph must be switched on or off.');
        this.setState({arcSpeedPlotShown: visible});
    }

    setArcMoverMode(mode: ArcMoverMode) {
        if (!isArcMoverMode(mode)) throw new Error('The mover mode must be parameter or arc.');
        // A mode change while playing would otherwise stop the loop and fall back to the older committed position.
        this.pause();
        this.setState({arcMoverMode: mode});
    }

    setArcMoverPosition(value: number) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
            throw new Error('The mover position must be a number from 0 to 1.');
        }
        this.setState({arcMoverPosition: value});
    }

    private showKindView(kind: ArcCurveKind) {
        if (!this.board) return;
        const [left, top, right, bottom] = KIND_VIEW[kind];
        const box = fitBoundingBox([[left, top], [right, bottom]], this.board.canvasWidth, this.board.canvasHeight);
        this.board.setBoundingBox(box ?? [left, top, right, bottom], this.equalAxisUnits);
    }

    /** Replaces the scene with the default of `kind` and its view, keeping the arc state; playback stops with the import. */
    setCurveKind(kind: ArcCurveKind) {
        if (!isArcCurveKind(kind)) throw new Error('The curve must be bezier or ph.');
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        const keep = {
            arcPieces: this.state.arcPieces, arcEqualTShown: this.state.arcEqualTShown, arcEqualArcShown: this.state.arcEqualArcShown,
            arcSpeedPlotShown: this.state.arcSpeedPlotShown, arcMoverMode: this.state.arcMoverMode, arcMoverPosition: this.state.arcMoverPosition,
        };
        this.runLessonReplacement({
            importData: () => this.importPresetData(arcPresetFor(kind)),
            afterImport: () => this.showKindView(kind),
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState(), ...keep}),
            transientState: undefined,
        });
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'arc-equal-t', action => this.setArcEqualTShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'arc-equal-arc', action => this.setArcEqualArcShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'arc-speed-plot', action => this.setArcSpeedPlotShown(action.visible));
        registry.on('arc-curve', action => this.setCurveKind(action.curve));
        registry.on('arc-pieces', action => this.setArcPieces(action.value));
        registry.on('arc-mover-mode', action => this.setArcMoverMode(action.mode));
        registry.on('arc-mover-position', action => this.setArcMoverPosition(action.value));
        registry.on('arc-play', () => this.play());
        registry.on('arc-pause', () => this.pause());
    }

    // ---- Controls --------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.arcControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private arcControls() {
        const kind = this.curveKind();
        const reduced = this.reducedMotion();
        return <div className="inspector-group">
            <ChoiceSelect label={t("parametric_curve_label")} value={kind}
                          options={ARC_CURVE_KINDS.map(value => ({value, text: curveLabel(value)}))}
                          onChange={value => { if (isArcCurveKind(value) && value !== kind) this.setCurveKind(value); }}/>
            <p className="inspector-help">{t("arcparam_help")}</p>
            <Slider min={ARC_PIECES_MIN} max={ARC_PIECES_MAX} step={1} value={this.effectivePieces()} customText={t("arcparam_pieces")}
                    onChange={value => this.setArcPieces(Math.round(value))}/>
            <OnOffSwitch label={t("arcparam_equal_t_shown")} checked={this.effectiveEqualT()} onChange={checked => this.setArcEqualTShown(checked)}/>
            <OnOffSwitch label={t("arcparam_equal_arc_shown")} checked={this.effectiveEqualArc()} onChange={checked => this.setArcEqualArcShown(checked)}/>
            <ChoiceSelect label={t("arcparam_mover_mode")} value={this.effectiveMode()}
                          options={ARC_MOVER_MODES.map(value => ({value, text: value === 'arc' ? t("arcparam_mode_arc") : t("arcparam_mode_parameter")}))}
                          onChange={value => { if (isArcMoverMode(value)) this.setArcMoverMode(value); }}/>
            <Slider min={0} max={1} step={0.001} value={this.moverPosition()} customText={t("arcparam_mover_position")}
                    unavailableReason={this.playing ? t("arcparam_position_while_playing") : undefined}
                    onChange={value => this.setArcMoverPosition(value)}/>
            <PlaybackButtons placement="graph" groupLabel={t("arcparam_playback_group")} className="arc-playback" playing={this.playing}
                             playBlock={reduced ? 'reduced-motion' : undefined}
                             onPlayPause={() => { if (this.playing) this.pause(); else this.play(); }}/>
            <OnOffSwitch label={t("arcparam_speed_plot_shown")} checked={this.state.arcSpeedPlotShown}
                         onChange={checked => this.setArcSpeedPlotShown(checked)}/>
            {this.state.arcSpeedPlotShown && <ArcSpeedPlot controller={this.plot} fontSize={this.displaySettings.fontSize}/>}
            <ReadoutDetails controller={this.details} label={t("arcparam_details_aria")} testId="arc-details"/>
        </div>;
    }
}

export default ArcLengthParametrizationGraph;
