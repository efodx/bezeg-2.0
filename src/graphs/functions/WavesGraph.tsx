import React, {useSyncExternalStore} from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import type {TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, message, messageNumber, onLanguageChange, renderMessage, t, useT, type Message} from "../../localization";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned} from "../base/controls/PuckOwnership";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutRow, ViewMarks} from "../base/declare/graphDeclaration";
import {DomainError} from "./BaseFunctionGraph";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {BooleanField} from "../../inputs/BooleanField";
import Slider from "../../inputs/Slider";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, useReducedMotion} from "../base/controls/reducedMotion";
import {GraphPalette} from "../styles/GraphPalette";
import {placeLpLabels, sampleLine, type LabelItem, type PxBox} from "../legend/boardLabelPlacement";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {wavesPresetCollection} from "./waves/wavesPresetCollection";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {travelling} from "../../waves/standing";
import {valueAt} from "../../waves/sinusoid";
import {envelope} from "../../waves/beats";
import {
    DEFAULT_WAVES_STATE, parseWavesState, POINTS_PER_SECOND, serializeWavesState, snapWavesField, WAVES_FIELD_RANGES, WAVES_MODES, windowOf, type WavesMode, type WavesNumericField,
    type WavesState, type WavesToggleField,
} from "../../waves/wavesModel";
import {
    deriveWaves, derivedKey, frameAt, instantOf, SINC_ERROR_FROM, SINC_ERROR_TO, standingCurves, type BeatFacts, type SamplingFacts, type StandingFacts, type SumFacts, type WavesDerived,
} from "./waves/wavesDerived";

/** The declared vocabulary of the waves graph. Parameter ids are arbiter keys. */
export type WavesIds = {
    param: "waves-a1" | "waves-p1" | "waves-a2" | "waves-p2" | "waves-f1" | "waves-f2" | "waves-fs" | "waves-half-waves" | "waves-extra";
    row: "time" | "frequency" | "phase-difference" | "sum-amplitude" | "sum-phase" | "amplitude-range" | "wave1" | "wave2" | "sum" | "f1" | "f2" | "beat-frequency"
        | "mean-frequency" | "beat-period" | "envelope" | "half-waves" | "wavelength" | "period" | "nodes" | "antinodes" | "antinode-amplitude" | "rate" | "samples-per-period"
        | "nyquist" | "alias" | "alias-frequency" | "frame" | "ambiguous-samples" | "join-error" | "sinc-error" | "resolution";
    note: "status" | "computed";
    legend: "wave1" | "wave2" | "sum" | "phasors" | "envelope" | "right" | "left" | "standing" | "nodes" | "antinodes" | "tone" | "dots" | "strip" | "true" | "film" | "alias" | "join" | "sinc";
    section: never;
    action: "show-phasors" | "show-envelope" | "show-alias" | "show-join" | "show-sinc";
};

/** The cards follow a playing wave this often (ms): refreshing them every frame would re-render the workspace sixty times a second. */
export const CARD_REFRESH_MS = 100;

/** The scene state: the stored fields of `WavesState`, nothing derived. The time and the playing flag are host state, never stored. */
export interface WavesGraphState extends BaseGraphState, WavesState {}

/** One frame advances the time by at most this many milliseconds, so a stalled tab does not jump. */
export const MAX_FRAME_MS = 100;
/** The grid of the time slider (seconds). */
export const TIME_STEP = 0.01;
const TIME_BIG_STEP = 0.1;
/** Float slack when a slider reaches the end of the window. */
const TIME_SLACK = 1e-9;
/** The largest sampling rate: the number of sample dots the sampling scene owns. */
const MAX_DOTS = WAVES_FIELD_RANGES.fs.max + 1;
const MAX_NODES = WAVES_FIELD_RANGES.halfWaves.max + 1;
const MAX_ANTINODES = WAVES_FIELD_RANGES.halfWaves.max;

const STORED_FIELDS = Object.keys(DEFAULT_WAVES_STATE) as (keyof WavesState)[];
/** The fields the lesson actions `set-components` and `set-sampling` may carry (the mode has its own action). */
const COMPONENT_FIELDS = ["a1", "p1", "a2", "p2", "f1", "f2", "halfWaves", "showPhasors", "showEnvelope"] as const satisfies readonly (keyof WavesState)[];
const SAMPLING_FIELDS = ["fs", "extra", "showAlias", "showJoin", "showSinc"] as const satisfies readonly (keyof WavesState)[];

const dec = (value: number, digits = 3): string => formatNumber(value, currentLanguage(), digits);
/** Rounded to four decimals, with -0 turned into 0. */
const roundedFour = (value: number): number => Math.round(value * 1e4) / 1e4 + 0;
/** Degrees on the phase fields' range, greater than -180 and at most 180. */
const wrapDegrees = (degrees: number): number => {
    const wrapped = degrees - 360 * Math.round(degrees / 360);
    return wrapped <= -180 ? wrapped + 360 : wrapped;
};

const MODE_KEYS = {
    sum: "waves_graph_mode_sum", beats: "waves_graph_mode_beats", standing: "waves_graph_mode_standing", sampling: "waves_graph_mode_sampling",
} as const;

interface DrawnCurve {
    dataX: number[];
    dataY: number[];
    updateDataArray: () => void;
}

type Box = [number, number, number, number];

/** The board rectangle [left, top, right, bottom] for the derived data: the plot, the panel on the left where a mode has one, room above for the "y" title. */
export function frameFor(derived: WavesDerived, board?: {readonly heightPx: number}): Box {
    const span = derived.xs[derived.xs.length - 1];
    const peak = 1.1 * derived.yPeak;
    const hasPanel = derived.mode === "sum" || derived.mode === "sampling";
    let bottom = derived.mode === "sampling" ? -2 * peak : -1.25 * peak;
    let top = 1.3 * peak;
    // Keep the "y" title clear above the plot and the tick row clear under it, whatever the board's height.
    if (board && Number.isFinite(board.heightPx)) {
        const need = Math.min(Y_TITLE_PX, board.heightPx - MIN_PLOT_PX);
        // The tick numbers and the axis title stand in a row under the plot (under the strip in sampling mode): keep that row inside the board.
        const plotPx = board.heightPx - Math.max(need, 0);
        if (derived.mode === "sampling") bottom = Math.min(bottom, stripLevel(derived) - (2.55 * peak * SAMPLING_BELOW_PX) / (plotPx - SAMPLING_BELOW_PX));
        else bottom = Math.min(bottom, peak - (2 * peak) / (1 - TICK_ROW_PX / plotPx));
        if (need > 0) top = Math.max(top, peak + (need * (peak - bottom)) / (board.heightPx - need));
    }
    return [hasPanel ? -0.66 * span : -0.1 * span, top, 1.06 * span, bottom];
}

/** The height of the "y" axis title and the gap above it, in pixels. */
const Y_TITLE_PX = 44;
/** The row of x tick numbers and the axis title under the plot (modes without the strip): gap under the plot edge and the height it needs, in pixels. */
const TICK_GAP_PX = 5;
const TICK_ROW_PX = 26;
/** The "y" title stands at least this many pixels above the top tick number (a 12 px number centred on its tick) before its own gap. */
const Y_TITLE_CLEARANCE_PX = 14;
/** The names of the wheel arrows: the gap under the circle (the arrowhead overshoots the circle by about 10 px) and the pitch of their two rows. */
const NAME_GAP_PX = 24;
const NAME_ROW_PX = 20;
const MIN_PLOT_PX = 90;

/**
 * Sampling mode, under the plot edge, top to bottom: the strip of instants (its line at `stripLevel`, in board units so that a card window keeps it), the
 * hollow square (half STRIP_SQUARE_PX), the row of tick numbers and the axis title, and a margin. SAMPLING_BELOW_PX is the height under the strip line; it
 * also holds the two wheel names (the circle is at most the plot half height, then 58 px of names).
 */
const stripLevel = (derived: WavesDerived): number => -1.55 * 1.1 * derived.yPeak;
const STRIP_SQUARE_PX = 7;
const SAMPLING_BELOW_PX = 44;

/** A curve that is redrawn only when its source changes. */
const ALWAYS = (): unknown => ({});

/**
 * The waves graph (waves spec WV1 to WV5, ADR 0055): two waves and their sum with a phasor picture, beats with their envelope, a
 * standing wave with its nodes, and a wave observed at the instants n / fs. The stored state is `WavesState`; the curves and
 * numbers are derived from it by the accepted kernel (`deriveWaves`), keyed on the fields that matter.
 *
 * Time is continuous and held by the host. The sampler is the drawn strip of instants n / fs and is never the animation frame rate.
 *
 * Ownership: every board object is created by `buildScene` and recorded in `objects`; `disposeScene` removes them. Arrows run
 * through owned hidden end points. The playback driver is created by `play`, stopped by every edit and by disposal; the settled
 * readout's timer is cancelled with the session.
 */
export class WavesGraph extends BaseGraph<WavesGraphState, WavesState> {
    private objects: JXG.GeometryElement[] = [];
    private derivedCache?: {state: WavesGraphState; key: string; value: WavesDerived};
    private standingCache?: {derived: WavesDerived; t: number; value: ReturnType<typeof standingCurves>};
    private drawnFrame = "";
    private builtMode?: WavesMode;
    /** The drawn objects the legend names, by the id `drawnObject` resolves. */
    private named = new Map<string, JXG.GeometryElement>();
    /** Milliseconds of playback since the declared cards were last refreshed (the cards follow a playing wave about ten times a second). */
    private sinceCards = 0;
    private derivations = 0;
    private notice?: {readonly state: WavesGraphState; readonly text: () => Message};
    private reconciledFor?: WavesGraphState;
    private driver?: AnimationDriver;
    /** The one announcement region of the graph. */
    readonly status = new SettledReadout();
    // ---- Host state: not in the model, not in a Preset ------------------------------------------------------------------
    private timeValue = 0;
    private playingValue = false;
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    override getInitialState(): WavesGraphState {
        return {initialized: false, ...DEFAULT_WAVES_STATE};
    }

    protected override lessonDefaultState(): WavesGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`. Time and playing are host state.

    override defaultPreset(): WavesState {
        return serializeWavesState(DEFAULT_WAVES_STATE);
    }

    override presetCollection(): PresetCollection<WavesState> {
        return wavesPresetCollection();
    }

    override exportPreset(): Preset<WavesState> {
        const preset = super.exportPreset();
        const {mode: _mode, a1: _a1, p1: _p1, a2: _a2, p2: _p2, f1: _f1, f2: _f2, fs: _fs, halfWaves: _halfWaves, extra: _extra, showPhasors: _showPhasors, showEnvelope: _showEnvelope, showAlias: _showAlias, showJoin: _showJoin, showSinc: _showSinc, ...graphState} = preset.graphState as WavesGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): WavesState {
        return serializeWavesState(this.state);
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the next frame (after the host commits the imported state and the scene is built) is marked as drawn without being applied. */
    private keepImportedView = false;
    private keepNextFrame = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    override importPresetData(data: WavesState): void {
        const imported = serializeWavesState(data);
        if (this.keepImportedView) this.keepNextFrame = true;
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): WavesGraphState {
        const parsed = parseWavesState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    /** The time axis (seconds) and the amplitude axis have different scales, so a stored box is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** The default axes are replaced by the graph's own (an axis curve with the unit named on the board). */
    protected override defaultAxesAttributes() {
        const axis = this.styles.axis;
        return {
            x: {...axis.defaultX, visible: false, ticks: {...axis.defaultX.ticks, visible: false, drawLabels: false}},
            y: {...axis.defaultY, visible: false, ticks: {...axis.defaultY.ticks, visible: false, drawLabels: false}},
        };
    }

    private reframeOnBuild = false;

    /** The bare frame; every use of the initial view (a new board, Reset, a Preset without a view) is framed again for the board's height once the scene stands. */
    protected override initialView(): Box {
        this.reframeOnBuild = true;
        return frameFor(deriveWaves(DEFAULT_WAVES_STATE));
    }

    // ---- Host state -----------------------------------------------------------------------------------------------------

    readonly subscribeHost = (listener: () => void): (() => void) => {
        this.hostListeners.add(listener);
        return () => { this.hostListeners.delete(listener); };
    };
    readonly hostSnapshot = (): number => this.hostVersion;

    private notifyHost(): void {
        this.hostVersion++;
        this.hostListeners.forEach(listener => listener());
    }

    get time(): number { return this.timeValue; }
    get playing(): boolean { return this.playingValue; }
    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.objects.length; }
    derivationCount(): number { return this.derivations; }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    /** The curves and numbers of the current state; a cache keyed on the state object, recomputed only for another key. */
    derived(): WavesDerived {
        const state = this.state;
        if (this.derivedCache && this.derivedCache.state === state) return this.derivedCache.value;
        const key = derivedKey(state);
        if (this.derivedCache && this.derivedCache.key === key) {
            this.derivedCache = {...this.derivedCache, state};
            return this.derivedCache.value;
        }
        this.derivations++;
        const value = deriveWaves(state); // language-free: the units are resolved at render time
        this.derivedCache = {state, key, value};
        return value;
    }

    /** The time, inside the window of the mode. */
    private clock(): number {
        return Math.min(Math.max(this.timeValue, 0), windowOf(this.state));
    }

    /** The two travelling waves and their sum at the current time (standing mode); a cache keyed on the derived object and the time. */
    private standing(): ReturnType<typeof standingCurves> {
        const derived = this.derived();
        const time = this.clock();
        if (this.standingCache && this.standingCache.derived === derived && this.standingCache.t === time) return this.standingCache.value;
        const value = standingCurves(derived, time);
        this.standingCache = {derived, t: time, value};
        return value;
    }

    private sumFacts(): SumFacts | undefined { const f = this.derived().facts; return f.kind === "sum" ? f : undefined; }
    private beatFacts(): BeatFacts | undefined { const f = this.derived().facts; return f.kind === "beats" ? f : undefined; }
    private standingFacts(): StandingFacts | undefined { const f = this.derived().facts; return f.kind === "standing" ? f : undefined; }
    private samplingFacts(): SamplingFacts | undefined { const f = this.derived().facts; return f.kind === "sampling" ? f : undefined; }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("waves_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A mount frames the scene once; a rebuild or a replacement never frames over the stored view.
        if (this.hasBoard) this.applyFrame();
        const session = this.graphSession;
        const container = this.hasBoard ? this.board.containerObj as HTMLElement | undefined : undefined;
        if (session && container && typeof ResizeObserver !== "undefined") {
            // The board follows a resize after a short delay of its own, so the frame waits for the board's new size.
            let timer: ReturnType<typeof setTimeout> | undefined;
            const observer = new ResizeObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => this.reframeToSize(), RESIZE_SETTLE_MS);
            });
            observer.observe(container);
            session.registerCleanup(() => { clearTimeout(timer); observer.disconnect(); });
        }
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => {
                this.stopDriver();
                this.playingValue = false;
                this.status.cancel();
                this.hostListeners.clear();
            });
            session.registerCleanup(onLanguageChange(() => { this.boardUpdate(); this.status.replace(this.statusText()); }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(previous: Readonly<WavesGraphState>): void {
        // Every edit of the scene pauses, whoever made it (a control, a lesson action, a restore): a stored field changed.
        if (STORED_FIELDS.some(key => previous[key] !== this.state[key])) this.halt();
        this.reconcileTime(previous);
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.halt();
        // A replacement (checkpoint restore, Preset import) brings its own view: build first, then mark the frame as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.objects.length === 0 || this.builtMode !== this.state.mode) this.buildScene();
            if (this.reframeOnBuild) {
                this.reframeOnBuild = false;
                this.boardView.following(() => this.showFrame(this.frame()));
            }
            this.drawnFrame = this.frameKey();
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.halt(false);
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.objects.length === 0 || this.builtMode !== this.state.mode) this.buildScene();
        this.boardView.following(() => this.applyFrame());
        this.board.update();
        this.status.report(this.statusText());
        this.notifyHost();
    }

    private frameKey(): string {
        return this.frame().map(value => value.toFixed(4)).join(",");
    }

    /** The frame of the derived data with the room the title and the tick row of this board height take. */
    private frame(derived: WavesDerived = this.derived()): Box {
        const height = this.board.canvasHeight;
        if (!(this.board.canvasWidth > 0) || !(height > 0)) return frameFor(derived);
        return frameFor(derived, {heightPx: height});
    }

    private applyFrame(): void {
        const frame = this.frame();
        const key = this.frameKey();
        if (this.reframeOnBuild) {
            // The board was just set to the bare initial view: show the framing for the board's height, whatever was drawn before.
            this.reframeOnBuild = false;
            this.drawnFrame = key;
            this.showFrame(frame);
            return;
        }
        if (this.keepNextFrame) {
            this.keepNextFrame = false;
            this.drawnFrame = key;
            return;
        }
        if (key === this.drawnFrame) return;
        this.drawnFrame = key;
        this.showFrame(frame);
    }

    private shownFrame: Box | undefined;

    private showFrame(frame: Box): void {
        this.shownFrame = frame;
        this.boardView.setIntent(frame, {keepAspectRatio: false});
    }

    /** The board's height settles after the first frame (the layout finishes): a view still on the frame we drew is framed again for the final size, so a load and a Reset agree. A view the user moved is left alone. */
    private reframeToSize(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive || !this.shownFrame) return;
        this.boardView.resizing(() => {
            const box = this.board.getBoundingBox();
            const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));
            if (!box.every((value, index) => near(value, this.shownFrame![index]))) return;
            const key = this.frameKey();
            if (key === this.drawnFrame) return;
            this.drawnFrame = key;
            this.showFrame(this.frame());
            this.board.update();
        });
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    /** The picture panel left of the plot (phasors, wheel): its centre and the pixels per amplitude unit; arrows are circular on screen. */
    private panel(): {cx: number; k: number} {
        const derived = this.derived();
        const {ux, uy} = this.scaleOf();
        const span = derived.xs[derived.xs.length - 1];
        const widthPx = 0.56 * span * ux;
        return {cx: -0.36 * span, k: Math.min(uy, (0.46 * widthPx) / derived.yPeak)};
    }

    /** The end of an arrow of the given amplitude and phase angle from a start: it points up at angle 0 and turns counterclockwise, so its height is the wave's value. */
    private armEnd(from: readonly [number, number], amplitude: number, theta: number): [number, number] {
        const {k} = this.panel();
        const {ux, uy} = this.scaleOf();
        return [from[0] - (k * amplitude * Math.sin(theta)) / ux, from[1] + (k * amplitude * Math.cos(theta)) / uy];
    }

    private panelOrigin(): [number, number] { return [this.panel().cx, 0]; }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const mode = this.state.mode;
        this.builtMode = mode;
        const dot = (x: () => number, y: () => number, visible: () => boolean, attributes: Partial<JXG.PointAttributes> = {}) => this.own(board.create("point", [x, y], {
            name: "", withLabel: false, fixed: true, highlight: false, size: 3, visible, ...attributes,
        }));
        const curve = (identity: () => unknown, data: () => readonly [readonly number[], readonly number[]], attributes: Partial<JXG.CurveAttributes>) => {
            let drawnFor: unknown = {};
            const element = this.own(board.create("curve", [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes})) as unknown as DrawnCurve & JXG.GeometryElement;
            element.updateDataArray = () => {
                const source = identity();
                if (source === drawnFor) return;
                drawnFor = source;
                const [xs, ys] = data();
                element.dataX = [...xs];
                element.dataY = [...ys];
            };
            return element;
        };
        const text = (x: () => number, y: () => number, content: () => string, attributes: Partial<JXG.TextAttributes>) => this.own(board.create("text", [x, y, content], {
            fontSize: 14, fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.label, ...attributes,
        }));
        const d = () => this.derived();
        const state = () => this.state;
        const peak = () => 1.1 * d().yPeak;
        const span = () => d().xs[d().xs.length - 1];
        const showing = (flag: WavesToggleField) => () => state()[flag];

        // The axes in one curve: the two axis lines, tick marks, with gaps between the pieces.
        curve(() => d(), () => {
            const derived = d();
            const length = derived.xs[derived.xs.length - 1];
            const p = 1.1 * derived.yPeak;
            const xs: number[] = [];
            const ys: number[] = [];
            const piece = (x0: number, y0: number, x1: number, y1: number) => { xs.push(x0, x1, NaN); ys.push(y0, y1, NaN); };
            piece(0, 0, length, 0);
            piece(0, -p, 0, p);
            for (let k = 0; k <= 4; k++) piece((length * k) / 4, -0.04 * p, (length * k) / 4, 0.04 * p);
            for (const level of [-derived.yPeak, derived.yPeak]) piece(-0.012 * length, level, 0.012 * length, level);
            return [xs, ys];
        }, {strokeColor: GraphPalette.axis, strokeWidth: 1});
        // Tick numbers and the axis title stand in one row under the plot (the curves never reach it); in sampling mode under the strip, so no dot or stem crosses them.
        const rowY = () => (mode === "sampling" ? stripLevel(d()) - Math.max(STRIP_SQUARE_PX / this.scaleOf().uy, 0.1 * peak()) - TICK_GAP_PX / this.scaleOf().uy : -peak() - TICK_GAP_PX / this.scaleOf().uy);
        const tickText = (k: number) => dec((span() * k) / 4, 2);
        const titleText = () => t(mode === "standing" ? "waves_graph_axis_x" : "waves_graph_axis_t");
        // The title takes the middle between the last two numbers; the number before it is left out when the board is too narrow to hold both.
        const tickFits = (k: number) => k !== 3 || (span() * this.scaleOf().ux) / 8 >= (titleText().length * 7 + 4) / 2 + (tickText(3).length * 6.6) / 2 + 4;
        const xAxisLabel = (k: number) => text(() => (span() * k) / 4, rowY, () => tickText(k), {anchorX: "middle", anchorY: "top", fontSize: 12, visible: () => tickFits(k)});
        [0, 1, 2, 3, 4].forEach(xAxisLabel);
        const yLabelGapPx = 12;
        text(() => -yLabelGapPx / this.scaleOf().ux, () => d().yPeak, () => dec(d().yPeak, 2), {anchorX: "right", anchorY: "middle", fontSize: 12});
        text(() => -yLabelGapPx / this.scaleOf().ux, () => -d().yPeak, () => `${dec(-d().yPeak, 2)}`, {anchorX: "right", anchorY: "middle", fontSize: 12});
        text(() => span() * 0.875, rowY, titleText, {anchorX: "middle", anchorY: "top"});
        text(() => 6 / this.scaleOf().ux, () => Math.max(peak(), d().yPeak + Y_TITLE_CLEARANCE_PX / this.scaleOf().uy) + 2 / this.scaleOf().uy, () => t("waves_graph_axis_y"), {anchorX: "left", anchorY: "bottom"});

        const playhead = (): number => this.clock();
        const timeCursor = () => {
            curve(ALWAYS, () => [[playhead(), playhead()], [-peak(), peak()]], {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1, dash: 3});
        };
        const wave = (identity: () => unknown, y: () => readonly number[], attributes: Partial<JXG.CurveAttributes>) =>
            curve(identity, () => [d().xs, y()], attributes);

        /** Records the element the legend entry `id` names. */
        const as = <E extends JXG.GeometryElement>(id: string, element: E): E => { this.named.set(id, element); return element; };

        if (mode === "sum") {
            timeCursor();
            const sumLine = () => this.sumFacts();
            as("wave1", wave(d, () => d().first, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2}));
            as("wave2", wave(d, () => d().second, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 3}));
            as("sum", wave(d, () => d().total, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 4}));
            const at = (index: 0 | 1 | 2) => (): number => {
                const f = sumLine();
                if (!f) return 0;
                return index === 0 ? valueAt(f.c1, playhead()) : index === 1 ? valueAt(f.c2, playhead()) : valueAt(f.c1, playhead()) + valueAt(f.c2, playhead());
            };
            [GraphPalette.comparisonCurve, GraphPalette.constructionAccent, GraphPalette.primaryCurve].forEach((color, index) => {
                dot(playhead, at(index as 0 | 1 | 2), () => true, {size: index === 2 ? 5 : 3, strokeColor: color, fillColor: color});
            });
            // The phasor picture: wave 2's arrow starts at the tip of wave 1's; the thick arrow is their vector sum.
            const shown = showing("showPhasors");
            as("phasors", curve(ALWAYS, () => this.circlePoints(), {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1, visible: shown}));
            const origin = dot(() => this.panelOrigin()[0], () => this.panelOrigin()[1], () => false);
            const angle = (index: 0 | 1) => (): number => {
                const f = sumLine();
                return f ? 2 * Math.PI * f.c1.frequency * playhead() + (index === 0 ? f.c1.phase : f.c2.phase) : 0;
            };
            const tip1 = () => this.armEnd(this.panelOrigin(), sumLine()?.c1.amplitude ?? 0, angle(0)());
            const tip2 = () => this.armEnd(tip1(), sumLine()?.c2.amplitude ?? 0, angle(1)());
            const end1 = dot(() => tip1()[0], () => tip1()[1], () => false);
            const end2 = dot(() => tip2()[0], () => tip2()[1], () => false);
            const arrows: {from: JXG.Point; to: JXG.Point; color: string; dash: number; width: number}[] = [
                {from: origin, to: end1, color: GraphPalette.comparisonCurve, dash: 2, width: 2},
                {from: end1, to: end2, color: GraphPalette.constructionAccent, dash: 3, width: 2},
                {from: origin, to: end2, color: GraphPalette.primaryCurve, dash: 0, width: 4},
            ];
            arrows.forEach(arrow => {
                this.own(board.create("arrow", [arrow.from, arrow.to], {
                    strokeColor: arrow.color, strokeWidth: arrow.width, dash: arrow.dash, fixed: true, highlight: false, withLabel: false, visible: shown,
                }));
            });
            // Names: placed by the shared label placer (clear of the tips, the circle, the shafts and the captions), read from a cache.
            const nameAt = (id: string, axis: 0 | 1, fallback: () => number) => () => {
                const box = this.phasorNameBoxes(tip1(), tip2())[id];
                if (!box) return fallback();
                const {left, top, ux, uy} = this.scaleOf();
                return axis === 0 ? left + (box.x0 + box.x1) / 2 / ux : top - (box.y0 + box.y1) / 2 / uy;
            };
            const nameAttributes = (color: string): Partial<JXG.TextAttributes> => ({strokeColor: color, anchorX: "middle", anchorY: "middle", visible: shown});
            text(nameAt("1", 0, () => tip1()[0] - 12 / this.scaleOf().ux), nameAt("1", 1, () => tip1()[1]), () => t("waves_graph_tip_1"), nameAttributes(GraphPalette.comparisonCurve));
            text(nameAt("2", 0, () => (tip1()[0] + tip2()[0]) / 2), nameAt("2", 1, () => (tip1()[1] + tip2()[1]) / 2), () => t("waves_graph_tip_2"), nameAttributes(GraphPalette.constructionAccent));
            text(nameAt("sum", 0, () => tip2()[0] + 12 / this.scaleOf().ux), nameAt("sum", 1, () => tip2()[1]), () => t("waves_graph_tip_sum"), nameAttributes(GraphPalette.primaryCurve));
        } else if (mode === "beats") {
            timeCursor();
            const f = () => this.beatFacts();
            as("wave1", wave(d, () => d().first, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 1, dash: 2}));
            as("wave2", wave(d, () => d().second, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 1, dash: 3}));
            as("sum", wave(d, () => d().total, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 3}));
            const upper = () => d().envelope ?? [];
            as("envelope", wave(d, upper, {strokeColor: GraphPalette.additionalCurves[3], strokeWidth: 2, dash: 4, visible: showing("showEnvelope")}));
            curve(d, () => [d().xs, upper().map(value => -value)], {strokeColor: GraphPalette.additionalCurves[3], strokeWidth: 2, dash: 4, visible: showing("showEnvelope")});
            dot(playhead, () => { const b = f(); return b ? valueAt({amplitude: b.amplitude, frequency: b.f1, phase: 0}, playhead()) + valueAt({amplitude: b.amplitude, frequency: b.f2, phase: 0}, playhead()) : 0; },
                () => true, {size: 5, strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve});
        } else if (mode === "standing") {
            as("right", curve(() => this.standing(), () => [d().xs, this.standing().right], {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2}));
            as("left", curve(() => this.standing(), () => [d().xs, this.standing().left], {strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 3}));
            as("standing", curve(() => this.standing(), () => [d().xs, this.standing().total], {strokeColor: GraphPalette.primaryCurve, strokeWidth: 4}));
            const f = () => this.standingFacts();
            for (let n = 0; n < MAX_NODES; n++) {
                const node = dot(() => f()?.nodes[n] ?? 0, () => 0, () => n < (f()?.nodes.length ?? 0), {size: 5, face: "[]", strokeColor: GraphPalette.constructionAccent, fillColor: GraphPalette.boardSurface});
                if (n === 0) as("nodes", node);
            }
            for (let n = 0; n < MAX_ANTINODES; n++) {
                const x = () => f()?.antinodes[n] ?? 0;
                const y = () => { const facts = f(); return facts ? facts.amplitude * (travelling(facts.k, facts.omega, 1, x(), this.clock()) + travelling(facts.k, facts.omega, -1, x(), this.clock())) : 0; };
                const antinode = dot(x, y, () => n < (f()?.antinodes.length ?? 0), {size: 5, face: "diamond", strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve});
                if (n === 0) as("antinodes", antinode);
            }
        } else {
            timeCursor();
            const f = () => this.samplingFacts();
            const level = () => stripLevel(d());
            as("tone", wave(d, () => d().first, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2}));
            as("alias", wave(d, () => f()?.aliasWave ?? [], {strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 3, visible: () => state().showAlias && f()?.aliasWave != null}));
            as("join", curve(d, () => { const facts = f(); return [facts?.instants ?? [], facts?.samples ?? []]; }, {strokeColor: GraphPalette.additionalCurves[3], strokeWidth: 2, dash: 4, visible: showing("showJoin")}));
            as("sinc", wave(d, () => f()?.sinc?.values ?? [], {strokeColor: GraphPalette.additionalCurves[2], strokeWidth: 2, dash: 1, visible: () => state().showSinc && f()?.sinc != null}));
            // The strip of instants n / fs, with a dotted stem from each instant to its dot.
            as("strip", curve(d, () => {
                const facts = f();
                const xs: number[] = [0, 1, NaN];
                const ys: number[] = [level(), level(), NaN];
                facts?.instants.forEach(instant => { xs.push(instant, instant, NaN); ys.push(level() - 0.1 * peak(), level() + 0.1 * peak(), NaN); });
                return [xs, ys];
            }, {strokeColor: GraphPalette.label, strokeWidth: 1}));
            curve(d, () => {
                const facts = f();
                const xs: number[] = [];
                const ys: number[] = [];
                facts?.instants.forEach((instant, n) => { xs.push(instant, instant, NaN); ys.push(level() + 0.1 * peak(), facts.samples[n], NaN); });
                return [xs, ys];
            }, {strokeColor: GraphPalette.tick, strokeWidth: 1, dash: 1});
            for (let n = 0; n < MAX_DOTS; n++) {
                const sample = dot(() => f()?.instants[n] ?? 0, () => f()?.samples[n] ?? 0, () => n < (f()?.instants.length ?? 0), {size: 4, strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.primaryCurve});
                if (n === 0) as("dots", sample);
            }
            const frame = () => frameAt(playhead(), state().fs);
            dot(() => instantOf(frame(), state().fs), level, () => true, {size: 6, face: "[]", strokeColor: GraphPalette.primaryCurve, fillColor: GraphPalette.boardSurface});
            dot(playhead, () => { const facts = f(); return facts ? valueAt(facts.tone, playhead()) : 0; }, () => true, {size: 4, strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve});
            // The wheel: the true mark turns continuously; the film shows the mark at the last instant n / fs.
            curve(ALWAYS, () => this.circlePoints(), {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1});
            const origin = dot(() => this.panelOrigin()[0], () => this.panelOrigin()[1], () => false);
            const turn = (time: () => number) => (): [number, number] => {
                const facts = f();
                return facts ? this.armEnd(this.panelOrigin(), facts.tone.amplitude, 2 * Math.PI * facts.tone.frequency * time() + facts.tone.phase) : this.panelOrigin();
            };
            const trueEnd = turn(playhead);
            const filmEnd = turn(() => instantOf(frame(), state().fs));
            const trueTip = dot(() => trueEnd()[0], () => trueEnd()[1], () => false);
            const filmTip = dot(() => filmEnd()[0], () => filmEnd()[1], () => false);
            as("true", this.own(board.create("arrow", [origin, trueTip], {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2, fixed: true, highlight: false, withLabel: false})));
            as("film", this.own(board.create("arrow", [origin, filmTip], {strokeColor: GraphPalette.primaryCurve, strokeWidth: 4, fixed: true, highlight: false, withLabel: false})));
            // The two arrows often coincide, so their names stand in two fixed rows under the circle (never on a tip or shaft).
            const nameRow = (row: number) => () => -(this.panel().k * this.derived().yPeak + (NAME_GAP_PX + NAME_ROW_PX * row)) / this.scaleOf().uy;
            text(() => this.panelOrigin()[0], nameRow(0), () => t("waves_graph_tip_true"), {strokeColor: GraphPalette.comparisonCurve, anchorX: "middle", anchorY: "top"});
            text(() => this.panelOrigin()[0], nameRow(1), () => t("waves_graph_tip_film"), {strokeColor: GraphPalette.primaryCurve, anchorX: "middle", anchorY: "top"});
        }
    }

    private nameCache?: {key: string; boxes: Record<string, PxBox>};

    /**
     * The pixel boxes of the three phasor names, from the shared placer. Cache key: the board's scale and size, the panel (centre, radius), the two tips quantised to
     * 6 px (so a name follows a turning arrow in steps, one placer run per 6 px of tip travel, a lookup in between), the names themselves (language).
     */
    private phasorNameBoxes(tip1: readonly [number, number], tip2: readonly [number, number]): Record<string, PxBox> {
        const board = this.board;
        if (!this.hasBoard || !this.state.showPhasors || !(board.canvasWidth > 0) || !(board.canvasHeight > 0)) return {};
        const {ux, uy, left, top} = this.scaleOf();
        const width = board.canvasWidth, height = board.canvasHeight;
        const toPx = (x: number, y: number): readonly [number, number] => [(x - left) * ux, (top - y) * uy];
        const origin = this.panelOrigin();
        const [ox, oy] = toPx(origin[0], origin[1]), [ax, ay] = toPx(tip1[0], tip1[1]), [bx, by] = toPx(tip2[0], tip2[1]);
        const names = [t("waves_graph_tip_1"), t("waves_graph_tip_2"), t("waves_graph_tip_sum")];
        const Q = 6;
        const key = [ux, uy, left, top, width, height, this.panel().k, Math.round(ox / Q), Math.round(oy / Q), Math.round(ax / Q), Math.round(ay / Q), Math.round(bx / Q), Math.round(by / Q), names.join("|")].join(",");
        if (this.nameCache?.key === key) return this.nameCache.boxes;
        const size = (text: string) => ({w: text.length * 14 * 0.55 + 8, h: 14 + 6});
        // The sum name goes first (it has the pick of the spots above the head); the others take the sides.
        const items: LabelItem[] = [
            {id: "sum", ax: bx, ay: by, ...size(names[2])},
            {id: "1", ax, ay, ...size(names[0])},
            {id: "2", ax: (ax + bx) / 2, ay: (ay + by) / 2, ...size(names[1])},
        ];
        // The ring and the shafts are chains of small markers (a name over one costs as much as one over a point), the heads are larger markers.
        const chain = (xs: readonly number[], ys: readonly number[]) => sampleLine(xs, ys, toPx, width, height, 7, 120).map(([x, y]) => [x, y, 4] as const);
        const [circleX, circleY] = this.circlePoints();
        const markers: Array<readonly [number, number, number]> = [
            [ox, oy, 6], [ax, ay, 3], [bx, by, 3],
            ...chain(circleX, circleY),
            ...chain([origin[0], tip1[0]], [origin[1], tip1[1]]),
            ...chain([tip1[0], tip2[0]], [tip1[1], tip2[1]]),
            ...chain([origin[0], tip2[0]], [origin[1], tip2[1]]),
        ];
        const boxes = placeLpLabels(items, {width, height, markers, samples: [], strips: [], blocks: []});
        this.nameCache = {key, boxes};
        return boxes;
    }

    /** The circle of the panel (the largest arrow) as an ellipse in board units, so that it is round on the screen. */
    private circlePoints(): [number[], number[]] {
        const derived = this.derived();
        const {cx, k} = this.panel();
        const {ux, uy} = this.scaleOf();
        const radius = k * derived.yPeak;
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i <= 96; i++) {
            const angle = (2 * Math.PI * i) / 96;
            xs.push(cx + (radius * Math.cos(angle)) / ux);
            ys.push((radius * Math.sin(angle)) / uy);
        }
        return [xs, ys];
    }

    private disposeScene(): void {
        if (this.hasBoard) {
            const board = this.board;
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.builtMode = undefined;
        this.named.clear();
    }

    // ---- Playback and the time -------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private stopDriver(): void {
        this.driver?.dispose();
        this.driver = undefined;
    }

    /** Stops the frame loop; the time stays where it is. */
    private halt(refresh = true): void {
        this.stopDriver();
        if (!this.playingValue) return;
        this.playingValue = false;
        this.notifyHost();
        if (refresh) this.refreshCards();
    }

    /**
     * The declared cards read the time (rows, status), which is host state, so they are refreshed through the scene store: at once for every stop, step and reset, and
     * while a wave plays about ten times a second (CARD_REFRESH_MS), not every frame.
     */
    private refreshCards(): void {
        this.sinceCards = 0;
        this.store.notify();
    }

    override pausePlayback(): void {
        this.halt();
        if (this.hasBoard && this.graphSession?.isAlive) this.status.report(this.statusText());
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the current time (from 0 at the end). Under reduced motion nothing moves; the slider still sets the time. */
    play(): void {
        if (this.playingValue || this.reducedMotion() || !this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.timeValue >= windowOf(this.state)) this.timeValue = 0;
        this.playingValue = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.boardUpdate();
        this.notifyHost();
        this.refreshCards();
    }

    /** One frame: the time moves by the frame's duration (at most MAX_FRAME_MS). The sampler instants do not depend on it. */
    private advance(delta: number): void {
        if (!this.playingValue || !this.graphSession?.isAlive) return;
        const end = windowOf(this.state);
        this.timeValue = Math.min(end, this.timeValue + Math.min(Math.max(delta, 0), MAX_FRAME_MS) / 1000);
        const finished = this.timeValue >= end;
        if (finished) this.halt();
        this.boardUpdate();
        // While playing only a change of the wording is announced; the moment the run stops the full sentence is.
        this.status.report(finished ? this.statusText() : this.sentence());
        this.notifyHost();
        this.sinceCards += Math.min(Math.max(delta, 0), MAX_FRAME_MS);
        if (!finished && this.sinceCards >= CARD_REFRESH_MS) this.refreshCards();
    }

    /** The time slider and the lesson actions: a time inside the window; anything else is refused. Setting it pauses the playback. */
    setTime(value: number): boolean {
        const end = windowOf(this.state);
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > end + TIME_SLACK) return false;
        this.halt();
        this.timeValue = Math.min(value, end);
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.refreshCards();
        this.requestRender();
        return true;
    }

    resetTime(): void {
        this.halt();
        this.timeValue = 0;
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.refreshCards();
        this.requestRender();
    }

    /** Another mode starts again at t = 0, and the status text says so. Runs after every state change, once per state object. */
    private reconcileTime(previous: Readonly<WavesState>): void {
        const state = this.state;
        if (this.reconciledFor === state) return;
        this.reconciledFor = state;
        if (previous.mode !== state.mode) {
            this.halt();
            this.timeValue = 0;
            this.notice = {state, text: () => message("waves_graph_notice_reset")};
            this.refreshCards();
        }
        this.notifyHost();
    }

    /** The time of a lesson checkpoint; playback is never captured. */
    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), wavesTime: this.timeValue};
    }

    /** Every scene replacement lands stopped, at the saved time when it is valid and at t = 0 otherwise. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const time = saved?.wavesTime;
        this.halt();
        this.notice = undefined;
        const valid = typeof time === "number" && Number.isFinite(time) && time >= 0 && time <= windowOf(this.state);
        // A saved time that does not fit the window is refused, not clamped (shared rule: restored values are never changed); the time is 0 and the status says so.
        this.timeValue = valid ? time : 0;
        this.reconciledFor = this.state;
        if (time !== undefined && !valid) this.notice = {state: this.state, text: () => message("waves_graph_notice_time_refused")};
        this.notifyHost();
        this.refreshCards();
    }

    protected override stopLessonAnimations(): void { this.halt(); }

    protected override beforeFigureCapture(): void { this.halt(); }

    // ---- Editing --------------------------------------------------------------------------------------------------------

    /** Every edit pauses the playback first, then writes the patch; `notice` is said in the status text of the new state. */
    private edit(patch: Partial<WavesState>, notice?: () => Message): void {
        this.halt();
        const before = this.state;
        this.setState(patch);
        this.reconcileTime(before);
        if (notice) {
            this.notice = {state: this.state, text: notice};
            this.status.report(this.statusText());
        }
        this.requestRender();
    }

    editMode(mode: WavesMode): void {
        if (mode !== this.state.mode) this.edit({mode});
    }

    /** Typed and stepped numbers: rounded to the field's grid, refused (false) when outside its range; a rounded value is announced. */
    editNumber(field: WavesNumericField, value: number): boolean {
        const checked = snapWavesField(field, value);
        if (!checked.ok) return false;
        if (checked.value !== this.state[field]) {
            const stored = checked.value;
            this.edit({[field]: stored}, Math.abs(stored - value) > 1e-9 ? () => message("waves_graph_notice_rounded", {value0: messageNumber(stored, 2)}) : undefined);
        }
        return true;
    }

    editToggle(field: WavesToggleField, on: boolean): void {
        if (this.state[field] !== on) this.edit({[field]: on});
    }

    // ---- Lesson actions -------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`waves`): `set-mode` picks the kind of waves (time back to 0), `set-components` and `set-sampling` set stored fields and `set-time` is the time
     * slider. The merged state goes through `parseWavesState` (strict: nothing is snapped or clamped) before the first write, so an off-grid or off-range value is a
     * lesson-content error. Each write goes through `edit` (it pauses first), so a `set-time` later in the same scene sees the window of the new state.
     */
    applyWavesAction(action: Extract<LessonAction, {kind: "waves"}>): void {
        switch (action.operation) {
            case "set-mode": {
                const parsed = parseWavesState(serializeWavesState({...this.state, mode: action.mode}));
                if (!parsed.ok) throw new Error(`waves set-mode: ${parsed.error.message}`);
                this.editMode(parsed.value.mode);
                return;
            }
            case "set-components": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-components", patch, COMPONENT_FIELDS);
                return;
            }
            case "set-sampling": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-sampling", patch, SAMPLING_FIELDS);
                return;
            }
            case "set-time":
                if (!this.setTime(action.t)) throw new Error(`waves set-time: t must be a number from 0 to ${windowOf(this.state)}, got ${action.t}.`);
                return;
            default: {
                const unsupported: never = action;
                throw new Error(`waves: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    /** Validates the merged state first, then writes only the fields that change; unknown fields are refused. */
    private editStored(operation: string, patch: Readonly<Record<string, unknown>>, allowed: readonly (keyof WavesState)[]): void {
        const unknown = Object.keys(patch).filter(key => !allowed.some(field => field === key));
        if (unknown.length) throw new Error(`waves ${operation}: no such field ${unknown.join(", ")}.`);
        const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        const parsed = parseWavesState({...serializeWavesState(this.state), ...defined});
        if (!parsed.ok) throw new Error(`waves ${operation}: ${parsed.error.message}`);
        const changed = allowed.filter(key => parsed.value[key] !== this.state[key]);
        if (changed.length) this.edit(Object.fromEntries(changed.map(key => [key, parsed.value[key]])));
        else this.halt();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("waves", action => this.applyWavesAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    /** A quantity with its unit: "0,25 s", "3 Hz", "120°" (the degree sign takes no space). */
    private quantity(value: number, unit: "s" | "hz" | "deg" | "rev", digits = 3): Message {
        return message(`waves_q_${unit}`, {value0: messageNumber(value, digits)});
    }

    /** The apparent motion of the wheel in words, from the exact integer alias. */
    private aliasMessage(facts: SamplingFacts): Message {
        const alias = facts.alias;
        if (alias.ambiguous) return message("waves_graph_alias_ambiguous");
        if (alias.magnitude === 0) return message("waves_graph_alias_rest");
        return message(alias.signed < 0 ? "waves_graph_alias_backward" : "waves_graph_alias_forward", {value0: messageNumber(alias.magnitude, 0)});
    }

    /** The wording of the mode's result, with the notice; no time in it. */
    private sentenceMessage(): Message {
        const sum = this.sumFacts();
        const beats = this.beatFacts();
        const standing = this.standingFacts();
        const sampling = this.samplingFacts();
        let base: Message;
        if (sum) {
            base = sum.opposite ? message("waves_graph_status_sum_cancel")
                : message("waves_graph_status_sum", {value0: messageNumber(sum.c1.frequency, 0), value1: messageNumber(sum.phasor.amplitude, 3)});
        } else if (beats) {
            base = beats.beatPeriod === null ? message("waves_graph_status_no_beats", {value0: messageNumber(2 * beats.amplitude, 2)})
                : message("waves_graph_status_beats", {value0: messageNumber(beats.f1, 0), value1: messageNumber(beats.f2, 0), value2: messageNumber(beats.beatFrequency, 0), value3: messageNumber(beats.beatPeriod, 3)});
        } else if (standing) {
            base = message("waves_graph_status_standing", {value0: messageNumber(standing.halfWaves, 0), value1: messageNumber(standing.nodes.length, 0), value2: messageNumber(2 * standing.amplitude, 2)});
        } else {
            base = message("waves_graph_status_sampling", {value0: messageNumber(this.state.f1, 0), value1: messageNumber(this.state.fs, 0), value2: sampling ? this.aliasMessage(sampling) : ""});
        }
        return this.notice && this.notice.state === this.state ? message("waves_status_join", {value0: base, value1: this.notice.text()}) : base;
    }

    sentence(): string {
        return renderMessage(this.sentenceMessage());
    }

    /** The status sentence: the time, the wording, and that the window has ended. */
    private statusMessage(): Message {
        const time = this.clock();
        const ended = time >= windowOf(this.state) && !this.playingValue;
        const head = message("waves_status_join", {value0: message("waves_graph_status_time", {value0: messageNumber(time, 2)}), value1: this.sentenceMessage()});
        return ended ? message("waves_status_join", {value0: head, value1: message("waves_graph_status_ended", {value0: messageNumber(time, 2)})}) : head;
    }

    statusText(): string {
        return renderMessage(this.statusMessage());
    }

    /** The readout rows of the state as declared values: the declaration's rows and what the panel lists. */
    private declaredRows(): ReadoutRow<WavesIds>[] {
        const state = this.state;
        const time = this.clock();
        const number = (value: number, digits: number): {readonly kind: "formatted"; readonly text: string} => ({kind: "formatted", text: dec(value, digits)});
        const none = message("waves_graph_not_defined");
        const rows: ReadoutRow<WavesIds>[] = [{id: "time", name: message("waves_graph_r_time"), value: this.quantity(time, "s", 2)}];
        const sum = this.sumFacts();
        const beats = this.beatFacts();
        const standing = this.standingFacts();
        const sampling = this.samplingFacts();
        if (sum) {
            const first = valueAt(sum.c1, time);
            const second = valueAt(sum.c2, time);
            const noWave = state.a1 === 0 && state.a2 === 0;
            rows.push(
                {id: "frequency", name: message("waves_graph_r_frequency_both"), value: this.quantity(sum.c1.frequency, "hz", 0)},
                {id: "phase-difference", name: message("waves_graph_r_phase_difference"), value: this.quantity(sum.phaseDifference, "deg", 0)},
                {id: "sum-amplitude", name: message("waves_graph_r_sum_amplitude"), value: sum.opposite ? message("waves_graph_cancel") : number(sum.phasor.amplitude, 3)},
                {id: "sum-phase", name: message("waves_graph_r_sum_phase"), value: sum.opposite || noWave ? none : this.quantity(wrapDegrees((sum.phasor.phase * 180) / Math.PI), "deg", 2)},
                {id: "amplitude-range", name: message("waves_graph_r_amplitude_range"), value: message("waves_graph_range_value", {value0: messageNumber(Math.abs(state.a1 - state.a2), 2), value1: messageNumber(state.a1 + state.a2, 2)})},
                {id: "wave1", name: message("waves_graph_r_wave1"), value: number(first, 3), legend: "wave1"},
                {id: "wave2", name: message("waves_graph_r_wave2"), value: number(second, 3), legend: "wave2"},
                {id: "sum", name: message("waves_graph_r_sum"), value: number(first + second, 3), legend: "sum"},
            );
        } else if (beats) {
            const first = valueAt({amplitude: beats.amplitude, frequency: beats.f1, phase: 0}, time);
            const second = valueAt({amplitude: beats.amplitude, frequency: beats.f2, phase: 0}, time);
            rows.push(
                {id: "f1", name: message("waves_graph_r_f1"), value: this.quantity(beats.f1, "hz", 0)},
                {id: "f2", name: message("waves_graph_r_f2"), value: this.quantity(beats.f2, "hz", 0)},
                {id: "beat-frequency", name: message("waves_graph_r_beat_frequency"), value: this.quantity(beats.beatFrequency, "hz", 0)},
                {id: "mean-frequency", name: message("waves_graph_r_mean_frequency"), value: this.quantity(beats.meanFrequency, "hz", 1)},
                {id: "beat-period", name: message("waves_graph_r_beat_period"), value: beats.beatPeriod === null ? message("waves_graph_no_beats") : this.quantity(beats.beatPeriod, "s", 3)},
                {id: "envelope", name: message("waves_graph_r_envelope"), value: number(envelope(beats.amplitude, beats.f1, beats.f2, time), 3), legend: "envelope"},
                {id: "sum", name: message("waves_graph_r_sum"), value: number(first + second, 3), legend: "sum"},
            );
        } else if (standing) {
            const join = (values: readonly number[]) => ({kind: "formatted" as const, text: values.map(value => dec(value, 3)).join("; ")});
            rows.push(
                {id: "half-waves", name: message("waves_graph_r_half_waves"), value: number(standing.halfWaves, 0)},
                {id: "wavelength", name: message("waves_graph_r_wavelength"), value: number(standing.wavelength, 3)},
                {id: "period", name: message("waves_graph_r_period"), value: this.quantity(1, "s", 0)},
                {id: "nodes", name: message("waves_graph_r_nodes"), value: join(standing.nodes), legend: "nodes"},
                {id: "antinodes", name: message("waves_graph_r_antinodes"), value: join(standing.antinodes), legend: "antinodes"},
                {id: "antinode-amplitude", name: message("waves_graph_r_antinode_amplitude"), value: number(2 * standing.amplitude, 3)},
            );
        } else if (sampling) {
            const frame = frameAt(time, state.fs);
            rows.push(
                {id: "frequency", name: message("waves_graph_r_frequency_tone"), value: this.quantity(state.f1, "hz", 0)},
                {id: "rate", name: message("waves_graph_r_rate"), value: this.quantity(state.fs, "hz", 0)},
                {id: "samples-per-period", name: message("waves_graph_r_samples_per_period"), value: number(sampling.samplesPerPeriod, 2)},
                {id: "nyquist", name: message("waves_graph_r_nyquist"), value: message(`waves_graph_nyquist_${sampling.relation}`, {value0: messageNumber(state.fs, 0), value1: messageNumber(2 * state.f1, 0)})},
                {id: "alias", name: message("waves_graph_r_alias"), value: this.aliasMessage(sampling)},
                {id: "alias-frequency", name: message("waves_graph_r_alias_frequency"), value: sampling.alias.ambiguous ? none : this.quantity(sampling.alias.signed, "rev", 0)},
                {id: "frame", name: message("waves_graph_r_frame"), value: message("waves_graph_frame_value", {value0: messageNumber(frame, 0), value1: messageNumber(state.fs, 0), value2: messageNumber(instantOf(frame, state.fs), 4)})},
            );
            if (sampling.alias.ambiguous) {
                const first = roundedFour(state.a1 * Math.cos(state.p1 * Math.PI / 180));
                rows.push({id: "ambiguous-samples", name: message("waves_graph_r_ambiguous_samples"), value: message("waves_graph_ambiguous_samples_value", {value0: messageNumber(first, 4), value1: messageNumber(roundedFour(-first), 4), value2: messageNumber(Math.abs(first), 4)})});
            }
            if (state.showJoin) rows.push({id: "join-error", name: message("waves_graph_r_join_error"), value: message("waves_graph_join_error_value", {value0: messageNumber(sampling.joinError, 4), value1: messageNumber(windowOf(state), 0)})});
            if (sampling.sinc) rows.push({id: "sinc-error", name: message("waves_graph_r_sinc_error"), value: message("waves_graph_sinc_error_value", {value0: messageNumber(sampling.sinc.error, 4), value1: messageNumber(SINC_ERROR_FROM, 1), value2: messageNumber(SINC_ERROR_TO, 1)})});
        }
        rows.push({id: "resolution", name: message("waves_graph_r_resolution"), value: message(state.mode === "standing" ? "waves_graph_resolution_space" : "waves_graph_resolution_time", {value0: messageNumber(POINTS_PER_SECOND)})});
        return rows;
    }

    /** The panel's text of the rows, from the declared ones (one source). */
    readoutRows(): ReadoutListRow[] {
        return this.declaredRows().map(({id, name, value}): ReadoutListRow => ({
            id, label: name ? renderMessage(name) : id, value: "kind" in value && value.kind === "formatted" ? value.text : renderMessage(value as Message),
        }));
    }

    // ---- Declaration ----------------------------------------------------------------------------------------------------

    /**
     * Parameter writes (ADR 0064). Keys `waves-a1`, `waves-p1`, `waves-a2`, `waves-p2`, `waves-f1`, `waves-f2`, `waves-fs`, `waves-half-waves` and `waves-extra`:
     * the validated number setter (`editNumber`), which rounds to the field's grid and refuses a value outside its range. The mode, the playback and the time have no key:
     * they stay in Orodja.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const bind = (field: WavesNumericField): ParameterBinding => ({
            read: () => this.state[field],
            apply: (value: unknown) => {
                if (typeof value !== "number" || !this.editNumber(field, value)) {
                    const range = WAVES_FIELD_RANGES[field];
                    throw new DomainError(message("waves_value_rejected", {value0: messageNumber(range.min, 2), value1: messageNumber(range.max, 2)}));
                }
            },
        });
        return {
            "waves-a1": bind("a1"), "waves-p1": bind("p1"), "waves-a2": bind("a2"), "waves-p2": bind("p2"), "waves-f1": bind("f1"), "waves-f2": bind("f2"),
            "waves-fs": bind("fs"), "waves-half-waves": bind("halfWaves"), "waves-extra": bind("extra"),
        };
    }

    private marksCache?: {derived: WavesDerived; marks: ViewMarks};

    /** The whole frame of the mode (plot, title and tick row, the panel on the left where the mode has one) must stay clear of the cards. */
    private viewMarks(): ViewMarks {
        const derived = this.derived();
        if (this.marksCache?.derived === derived) return this.marksCache.marks;
        const [left, top, right, bottom] = frameFor(derived);
        const marks: ViewMarks = {must: [{kind: "box", left, top, right, bottom}]};
        this.marksCache = {derived, marks};
        return marks;
    }

    /**
     * Pure data from the state and the time. Pucks, by what a lesson step asks the learner to set or flip (wavesGuidedLessons, wavesSamplingGuidedLessons): sum mode the
     * two amplitudes, the two phases and the frequency (wv1-phase, wv1-amplitudes, wv1-explore) and the phasors switch (wv1-explore); beats the amplitude, both frequencies
     * and the envelope switch (wv2-difference, wv2-envelope, wv2-explore); standing the amplitude and the number of half waves (wv3-half-waves, wv3-explore); sampling the
     * phase and frequency of the tone, the rate, the extra samples while the sinc curve is drawn, and the three switches (wv4-alias-wave, wv5-join, wv5-alias, wv5-explore).
     * The mode, the playback and the time slider are setup and stay in Orodja (no arbiter key). The status sentence and the computed note are the notes; the rows are the readouts.
     */
    protected override declaration(): GraphDeclaration<WavesIds> {
        const {mode} = this.state;
        const R = WAVES_FIELD_RANGES;
        type Param = ParameterDeclaration<WavesIds["param"]>;
        const range = (key: WavesIds["param"], field: WavesNumericField, label: Message, extra: {unit?: Message; bigStep: number; maxDecimals: number}): Param =>
            ({key, kind: "range", label, placement: "board", min: R[field].min, max: R[field].max, step: R[field].step, ...extra});
        const hz = message("waves_graph_unit_hz");
        const degrees = message("waves_graph_unit_deg");
        const parameters: Param[] = [];
        const actions: ActionDeclaration<WavesIds>[] = [];
        const toggle = (id: WavesIds["action"], field: WavesToggleField, label: Message, help: Message) =>
            actions.push({id, label, help, placement: "board", enabled: true, pressed: this.state[field], puck: true});
        const legend: LegendEntry<WavesIds>[] = [];
        if (mode === "sum") {
            parameters.push(
                range("waves-a1", "a1", message("waves_a1_sum_name"), {bigStep: 1, maxDecimals: 2}),
                range("waves-p1", "p1", message("waves_p1_name"), {unit: degrees, bigStep: 15, maxDecimals: 0}),
                range("waves-a2", "a2", message("waves_a2_name"), {bigStep: 1, maxDecimals: 2}),
                range("waves-p2", "p2", message("waves_p2_name"), {unit: degrees, bigStep: 15, maxDecimals: 0}),
                range("waves-f1", "f1", message("waves_f_both_name"), {unit: hz, bigStep: 5, maxDecimals: 0}),
            );
            toggle("show-phasors", "showPhasors", message("waves_graph_show_phasors"), message("waves_graph_show_phasors_help"));
            legend.push(
                {id: "wave1", label: message("waves_graph_r_wave1"), kind: "dashed", object: "wave1"},
                {id: "wave2", label: message("waves_graph_r_wave2"), kind: "dashed", object: "wave2"},
                {id: "sum", label: message("waves_graph_r_sum"), kind: "line", object: "sum"},
                {id: "phasors", label: message("waves_legend_phasors"), kind: "line", object: "phasors"},
            );
        } else if (mode === "beats") {
            parameters.push(
                range("waves-a1", "a1", message("waves_a_each_name"), {bigStep: 1, maxDecimals: 2}),
                range("waves-f1", "f1", message("waves_f1_name"), {unit: hz, bigStep: 5, maxDecimals: 0}),
                range("waves-f2", "f2", message("waves_f2_name"), {unit: hz, bigStep: 5, maxDecimals: 0}),
            );
            toggle("show-envelope", "showEnvelope", message("waves_graph_show_envelope"), message("waves_graph_show_envelope_help"));
            legend.push(
                {id: "wave1", label: message("waves_graph_r_wave1"), kind: "dashed", object: "wave1"},
                {id: "wave2", label: message("waves_graph_r_wave2"), kind: "dashed", object: "wave2"},
                {id: "sum", label: message("waves_graph_r_sum"), kind: "line", object: "sum"},
                {id: "envelope", label: message("waves_graph_r_envelope"), kind: "dashed", object: "envelope"},
            );
        } else if (mode === "standing") {
            parameters.push(
                range("waves-a1", "a1", message("waves_a_each_name"), {bigStep: 1, maxDecimals: 2}),
                {key: "waves-half-waves", kind: "count", label: message("waves_half_waves_name"), placement: "board", min: R.halfWaves.min, max: R.halfWaves.max, help: message("waves_graph_half_waves_help")},
            );
            legend.push(
                {id: "right", label: message("waves_legend_right"), kind: "dashed", object: "right"},
                {id: "left", label: message("waves_legend_left"), kind: "dashed", object: "left"},
                {id: "standing", label: message("waves_graph_mode_standing"), kind: "line", object: "standing"},
                {id: "nodes", label: message("waves_legend_nodes"), kind: "ring", object: "nodes"},
                {id: "antinodes", label: message("waves_legend_antinodes"), kind: "point", object: "antinodes"},
            );
        } else {
            parameters.push(
                range("waves-p1", "p1", message("waves_p_tone_name"), {unit: degrees, bigStep: 15, maxDecimals: 0}),
                range("waves-f1", "f1", message("waves_f_tone_name"), {unit: hz, bigStep: 5, maxDecimals: 0}),
                range("waves-fs", "fs", message("waves_fs_name"), {unit: hz, bigStep: 6, maxDecimals: 0}),
            );
            if (this.state.showSinc) parameters.push(range("waves-extra", "extra", message("waves_extra_name"), {bigStep: 48, maxDecimals: 0}));
            toggle("show-alias", "showAlias", message("waves_alias_name"), message("waves_graph_show_alias_help"));
            toggle("show-join", "showJoin", message("waves_join_name"), message("waves_graph_show_join_help"));
            toggle("show-sinc", "showSinc", message("waves_sinc_name"), message("waves_graph_show_sinc_help"));
            const facts = this.samplingFacts();
            legend.push(
                {id: "tone", label: message("waves_legend_tone"), kind: "line", object: "tone"},
                {id: "dots", label: message("waves_legend_dots"), kind: "point", object: "dots"},
                {id: "strip", label: message("waves_legend_strip"), kind: "line", object: "strip"},
                {id: "true", label: message("waves_legend_true"), kind: "dashed", object: "true"},
                {id: "film", label: message("waves_legend_film"), kind: "line", object: "film"},
                {id: "alias", kind: "dashed", object: "alias",
                 label: facts?.relation === "above" ? message("waves_legend_alias_exact")
                     : message("waves_legend_alias", {value0: messageNumber(facts && !facts.alias.ambiguous ? facts.alias.signed : 0, 0)})},
                {id: "join", label: message("waves_graph_show_join"), kind: "dashed", object: "join"},
                {id: "sinc", label: message("waves_legend_sinc"), kind: "dashed", object: "sinc"},
            );
        }
        return {
            parameters,
            readouts: [{id: "values", title: message("waves_graph_readout_title"), rows: this.declaredRows()}],
            notes: [{id: "status", text: this.statusMessage()}, {id: "computed", text: message("waves_graph_computed_note"), tone: "muted"}],
            legend,
            actions,
            marks: this.viewMarks(),
        };
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = this.named.get(id);
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const filled = element.elType === "point" && id !== "nodes";
        return {color: String(drawn.evalVisProp(filled ? "fillcolor" : "strokecolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        const toggles: Readonly<Record<WavesIds["action"], WavesToggleField>> = {
            "show-phasors": "showPhasors", "show-envelope": "showEnvelope", "show-alias": "showAlias", "show-join": "showJoin", "show-sinc": "showSinc",
        };
        const field = (toggles as Readonly<Record<string, WavesToggleField | undefined>>)[id];
        if (!field) throw new Error("Unknown action");
        runAs("learner", () => this.editToggle(field, !this.state[field]));
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private toggle(field: WavesToggleField, action: WavesIds["action"], labelKey: "waves_graph_show_phasors" | "waves_graph_show_envelope" | "waves_graph_show_alias" | "waves_graph_show_join" | "waves_graph_show_sinc",
                   helpKey: "waves_graph_show_phasors_help" | "waves_graph_show_envelope_help" | "waves_graph_show_alias_help" | "waves_graph_show_join_help" | "waves_graph_show_sinc_help"): JSX.Element {
        return <PuckOwned key={field} param={action}><BooleanField variant="switch" label={t(labelKey)} help={t(helpKey)} checked={this.state[field]} onChange={on => this.editToggle(field, on)}/></PuckOwned>;
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const R = WAVES_FIELD_RANGES;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("waves_graph_mode_label")} value={state.mode} help={t("waves_graph_mode_help")}
                          options={WAVES_MODES.map(value => ({value, text: t(MODE_KEYS[value])}))}
                          onChange={value => { const mode = WAVES_MODES.find(candidate => candidate === value); if (mode) this.editMode(mode); }}/>,
        ];
        if (state.mode === "sum") {
            commands.push(<PuckOwned key="a1" param="waves-a1"><Slider customText={t("waves_graph_a1_sum_label")} value={state.a1} min={R.a1.min} max={R.a1.max} step={R.a1.step} grid={R.a1.step} bigStep={1}
                    onChange={value => this.editNumber("a1", value)}/></PuckOwned>,
                <PuckOwned key="p1" param="waves-p1"><Slider customText={t("waves_graph_p1_label")} value={state.p1} min={R.p1.min} max={R.p1.max} step={R.p1.step} grid={R.p1.step} bigStep={15}
                    onChange={value => this.editNumber("p1", value)}/></PuckOwned>,
                <PuckOwned key="a2" param="waves-a2"><Slider customText={t("waves_graph_a2_label")} value={state.a2} min={R.a2.min} max={R.a2.max} step={R.a2.step} grid={R.a2.step} bigStep={1}
                    onChange={value => this.editNumber("a2", value)}/></PuckOwned>,
                <PuckOwned key="p2" param="waves-p2"><Slider customText={t("waves_graph_p2_label")} value={state.p2} min={R.p2.min} max={R.p2.max} step={R.p2.step} grid={R.p2.step} bigStep={15}
                    onChange={value => this.editNumber("p2", value)}/></PuckOwned>,
                <PuckOwned key="f1" param="waves-f1"><Slider customText={t("waves_graph_f_both_label")} value={state.f1} min={R.f1.min} max={R.f1.max} step={R.f1.step} grid={R.f1.step} bigStep={5}
                    onChange={value => this.editNumber("f1", value)}/></PuckOwned>,
                this.toggle("showPhasors", "show-phasors", "waves_graph_show_phasors", "waves_graph_show_phasors_help"));
        } else if (state.mode === "beats") {
            commands.push(<PuckOwned key="a1" param="waves-a1"><Slider customText={t("waves_graph_a1_each_label")} value={state.a1} min={R.a1.min} max={R.a1.max} step={R.a1.step} grid={R.a1.step} bigStep={1}
                    onChange={value => this.editNumber("a1", value)}/></PuckOwned>,
                <PuckOwned key="f1" param="waves-f1"><Slider customText={t("waves_graph_f1_beats_label")} value={state.f1} min={R.f1.min} max={R.f1.max} step={R.f1.step} grid={R.f1.step} bigStep={5} help={t("waves_graph_f_beats_help")}
                    onChange={value => this.editNumber("f1", value)}/></PuckOwned>,
                <PuckOwned key="f2" param="waves-f2"><Slider customText={t("waves_graph_f2_beats_label")} value={state.f2} min={R.f2.min} max={R.f2.max} step={R.f2.step} grid={R.f2.step} bigStep={5} help={t("waves_graph_f_beats_help")}
                    onChange={value => this.editNumber("f2", value)}/></PuckOwned>,
                this.toggle("showEnvelope", "show-envelope", "waves_graph_show_envelope", "waves_graph_show_envelope_help"));
        } else if (state.mode === "standing") {
            commands.push(<PuckOwned key="a1" param="waves-a1"><Slider customText={t("waves_graph_a1_each_label")} value={state.a1} min={R.a1.min} max={R.a1.max} step={R.a1.step} grid={R.a1.step} bigStep={1}
                    onChange={value => this.editNumber("a1", value)}/></PuckOwned>,
                <PuckOwned key="halfWaves" param="waves-half-waves"><Slider customText={t("waves_graph_half_waves_label")} value={state.halfWaves} min={R.halfWaves.min} max={R.halfWaves.max} step={R.halfWaves.step} grid={R.halfWaves.step} bigStep={1} help={t("waves_graph_half_waves_help")}
                    onChange={value => this.editNumber("halfWaves", value)}/></PuckOwned>);
        } else {
            commands.push(<PuckOwned key="a1" param="waves-a1"><Slider customText={t("waves_graph_a1_tone_label")} value={state.a1} min={R.a1.min} max={R.a1.max} step={R.a1.step} grid={R.a1.step} bigStep={1}
                    onChange={value => this.editNumber("a1", value)}/></PuckOwned>,
                <PuckOwned key="p1" param="waves-p1"><Slider customText={t("waves_graph_p1_tone_label")} value={state.p1} min={R.p1.min} max={R.p1.max} step={R.p1.step} grid={R.p1.step} bigStep={15}
                    onChange={value => this.editNumber("p1", value)}/></PuckOwned>,
                <PuckOwned key="f1" param="waves-f1"><Slider customText={t("waves_graph_f_tone_label")} value={state.f1} min={R.f1.min} max={R.f1.max} step={R.f1.step} grid={R.f1.step} bigStep={5}
                    onChange={value => this.editNumber("f1", value)}/></PuckOwned>,
                <PuckOwned key="fs" param="waves-fs"><Slider customText={t("waves_graph_fs_label")} value={state.fs} min={R.fs.min} max={R.fs.max} step={R.fs.step} grid={R.fs.step} bigStep={6} help={t("waves_graph_fs_help")}
                    onChange={value => this.editNumber("fs", value)}/></PuckOwned>,
                this.toggle("showAlias", "show-alias", "waves_graph_show_alias", "waves_graph_show_alias_help"),
                this.toggle("showJoin", "show-join", "waves_graph_show_join", "waves_graph_show_join_help"),
                this.toggle("showSinc", "show-sinc", "waves_graph_show_sinc", "waves_graph_show_sinc_help"));
            if (state.showSinc) commands.push(<PuckOwned key="extra" param="waves-extra"><Slider customText={t("waves_graph_extra_label")} value={state.extra} min={R.extra.min} max={R.extra.max} step={R.extra.step} grid={R.extra.step} bigStep={48}
                    onChange={value => this.editNumber("extra", value)}/></PuckOwned>);
        }
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <WavesPlayback graph={this}/>
            {this.getGraphCommandsArea()}
            <WavesReadout graph={this}/>
        </>;
    }
}

const RESIZE_SETTLE_MS = 150;
const REDUCED_REASON_ID = "waves-play-reduced-reason";

/** Play or pause, reset and the time slider: host state, so only this part re-renders on a frame. */
function WavesPlayback(props: {graph: WavesGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    useReducedMotion(); // follows a system change; the graph's own reducedMotion() is read below
    const end = windowOf(graph.state);
    const time = Math.min(graph.time, end);
    const playing = graph.playing;
    const params = {value0: dec(end, 2), value1: dec(TIME_STEP, 2)};
    const blocks = playbackBlocks({atStart: time === 0, atEnd: false, playing});
    const reduced = !playing && graph.reducedMotion();
    return <div className="inspector-group">
        <PlaybackButtons reducedMotionReason={text("playback_block_reduced_motion_time")}
                         placement="graph" groupLabel={text("waves_graph_playback_group")} resetLabel={text("reset")}
                         playing={playing} onPlayPause={() => (graph.playing ? graph.pausePlayback() : graph.play())} onReset={() => graph.resetTime()}
                         {...blocks} playBlock={reduced ? "reduced-motion" : undefined} describedBy={reduced ? {"play-pause": REDUCED_REASON_ID} : undefined}/>
        {reduced && <p id={REDUCED_REASON_ID} className="inspector-help">{text("playback_block_reduced_motion_time")}</p>}
        <Slider customText={text("waves_graph_time_label")} min={0} max={end} step={TIME_STEP} grid={TIME_STEP} bigStep={TIME_BIG_STEP} value={time}
                rejectedHint={text("waves_graph_time_rejected", {value0: params.value0})}
                valueText={value => `${dec(value, 2)} ${text("waves_graph_unit_s")}`} onChange={value => graph.setTime(value)}/>
    </div>;
}

/** The status sentence, the labelled values and the one announcement region (silent while the wave plays). */
function WavesReadout(props: {graph: WavesGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <div className="inspector-group" data-declared-panel="">
        <ReadoutHeading>{text("waves_graph_readout_title")}</ReadoutHeading>
        <p data-waves-status="" data-readout-note="">{graph.statusText()}</p>
        <ReadoutList label={text("waves_graph_readout_title")} rows={graph.readoutRows()}/>
        <p data-waves-note="" data-readout-note="">{text("waves_graph_computed_note")}</p>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

export default WavesGraph;
