import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, message, onLanguageChange, renderMessage, t, type Message} from "../../localization";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {DomainError} from "../functions/BaseFunctionGraph";
import type {FormattedValue, GraphDeclaration, ParameterDeclaration, ReadoutRow as DeclaredRow} from "../base/declare/graphDeclaration";
import {formatNumber, withDecimalSeparator} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {BooleanField} from "../../inputs/BooleanField";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {ReadoutHeading, ReadoutHelp, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
import {StepCounter} from "../base/controls/StepCounter";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {randomPresetCollection} from "./randomPresetCollection";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import {
    AREA_SHAPES, AreaShape, CHAIN_MAX, CHAIN_MIN, DEFAULT_RANDOM_STATE, exactFor, fairCoinBandHalfWidth, frequencySd, largestBarDifference, markovProbabilityA, markovShareSd,
    N_MAX, N_MIN, nextStop, playbackStops, OVERLAY_MODES, P_MAX, P_MIN, PERCENT_STEP, piStandardError, parseRandomState, RANDOM_MODES, RandomExact, RandomMode, RandomSim, RandomState,
    ROWS_MAX, ROWS_MIN, SAMPLE_SIZE_MAX, SAMPLE_SIZE_MIN, SEED_MAX, SEED_MIN, serializeRandomState, simulate, snapChainInput, snapPercentInput, snapRowsInput,
    snapSampleSizeInput, snapSeedInput, snapStopInput, snapTrialsInput, snapWalkStepsInput, STOP_MS_DEFAULT, STOP_MS_MAX, STOP_MS_MIN, STOP_MS_STEP, stopPosition,
    WALK_STEPS_MAX, WALK_STEPS_MIN, withMode,
} from "../../random/randomModel";
import {intervalHalfWidth} from "../../random/samplePaths";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {AREA_LAYOUT, Caption, CaptionKey, EMPTY_LAYER, Layer, LAW_LEFT, POINTS_DRAWN, sceneFor, SceneData} from "./simulationScene";

/** The scene state: the stored simulation fields (`RandomState`), nothing derived. */
export interface RandomGraphState extends BaseGraphState, RandomState {}

/**
 * What the graph declares (task 08): the run controls the lessons ask the learner to set are pucks (the count of trials, the seeds, the mode's own parameter),
 * the readout rows and the state sentences are the cards'. Mode, the second-run switch and the playback have no lesson step that sets them (a scene does) or no
 * arbiter key, so they stay in Orodja.
 */
export type SimulationIds = {
    param: "random-n" | "random-seed" | "random-seed2" | "random-rows" | "random-p" | "random-steps" | "random-a" | "random-b" | "random-start" | "random-sample" | "random-shape";
    row: "shown" | "seed" | "counts" | "expected" | "largest" | "middle" | "heads" | "frequency" | "band" | "typical" | "inside" | "share" | "estimate" | "error" | "rms"
        | "mean-abs" | "zeros" | "stationary" | "lambda" | "exact-a" | "misses" | "miss-share" | "exact-miss" | "exact-coverage" | "half-width" | "seed2";
    note: "status" | "identity" | "period" | "seed2-same";
    legend: never;
    section: never;
    action: never;
};
type SimulationRow = DeclaredRow<SimulationIds>;
const formatted = (text: string): FormattedValue => ({kind: "formatted", text});

/** Playback moves to the next stop (1, 2, 5, 10, ... n) this often by default; the speed control changes `stopMs` of the state. */
export const PLAYBACK_STEP_MS = STOP_MS_DEFAULT;

/** Everything drawn or read for one state: the tallies, the exact curves and the polylines. Recomputed when the state object changes. */
export interface RunView {
    readonly sim: RandomSim;
    readonly exact: RandomExact;
    /** The run of the second seed, while it is drawn over the first. */
    readonly sim2?: RandomSim;
    readonly scene: SceneData;
}

type CurveStyle = Partial<JXG.CurveAttributes>;
const SOLID = 3;
const style = (strokeColor: string, strokeWidth: number, dash = 0): CurveStyle => ({strokeColor, strokeWidth, dash});
/** The run of the second seed: another colour and a dotted line (the captions name it too). */
const SECOND = (width = 3): CurveStyle => style(GraphPalette.additionalCurves[1], width, 4);

/** Look of each layer, by mode and layer name; the order of creation is the scene's key order (lowest first). Never colour alone: widths, dashes and the captions differ. */
const LAYER_STYLES: Readonly<Record<RandomMode, Readonly<Record<string, CurveStyle>>>> = {
    galton: {
        bars: style(GraphPalette.comparisonCurve, 2, 2), heap: style(GraphPalette.primaryCurve, SOLID), heap2: SECOND(), pegs: style(GraphPalette.referenceCurve, 1),
        paths: style(GraphPalette.constructionLevels[3], 1), latest: style(GraphPalette.constructionAccent, 3),
    },
    frequency: {
        band: style(GraphPalette.comparisonCurve, 2, 2), half: style(GraphPalette.referenceCurve, 1), running: style(GraphPalette.primaryCurve, SOLID),
        running2: SECOND(), diffBand: style(GraphPalette.comparisonCurve, 2, 2), diffZero: style(GraphPalette.referenceCurve, 1),
        diff: style(GraphPalette.primaryCurve, SOLID), diff2: SECOND(),
    },
    area: {
        square: style(GraphPalette.referenceCurve, 1), circle: style(GraphPalette.comparisonCurve, 2), outside: style(GraphPalette.constructionLevels[3], 1),
        inside: style(GraphPalette.primaryCurve, 3), truth: style(GraphPalette.comparisonCurve, 2, 2), errorBar: style(GraphPalette.label, 3),
        estimate: style(GraphPalette.constructionAccent, 3),
    },
    walk: {
        funnel: style(GraphPalette.comparisonCurve, 2, 2), paths: style(GraphPalette.constructionLevels[3], 1), latest: style(GraphPalette.constructionAccent, 3),
        bars: style(GraphPalette.comparisonCurve, 2, 2), heap: style(GraphPalette.primaryCurve, SOLID), heap2: SECOND(),
    },
    markov: {
        stationary: style(GraphPalette.referenceCurve, 2, 3), exactA: style(GraphPalette.comparisonCurve, 2, 2), share: style(GraphPalette.primaryCurve, SOLID),
        share2: SECOND(), boxes: style(GraphPalette.label, 2), arrows: style(GraphPalette.label, 2),
    },
    interval: {
        mean: style(GraphPalette.referenceCurve, 2, 2), hits: style(GraphPalette.primaryCurve, 2), misses: style(GraphPalette.constructionAccent, 5),
        flags: style(GraphPalette.constructionAccent, 2), law: style(GraphPalette.comparisonCurve, 2, 2), observed: style(GraphPalette.primaryCurve, 4),
    },
};

const dec = (value: number, digits = 3): string => formatNumber(value, currentLanguage(), digits);
const percentText = (fraction: number): string => `${dec(fraction * 100, 2)} %`;

function modeName(mode: RandomMode): string {
    switch (mode) {
        case "galton": return t("random_graph_mode_galton");
        case "frequency": return t("random_graph_mode_frequency");
        case "area": return t("random_graph_mode_area");
        case "walk": return t("random_graph_mode_walk");
        case "markov": return t("random_graph_mode_markov");
        case "interval": return t("random_graph_mode_interval");
    }
}

/** Pixels: the gap of a text from the board edge, the height of one stacked caption row. */
const EDGE_PX = 6;
const CAPTION_ROW_PX = 18;
/** The board height assumed before there is a board. */
const DEFAULT_HEIGHT_PX = 400;
const DEFAULT_WIDTH_PX = 600;
/** A generous width of one glyph of a 14 px caption, to estimate where a caption wraps. */
const GLYPH_PX = 7.2;
const LEFT_PX = 36;
/** The smallest pixels per unit of the area picture that keeps the rows of the side column apart; below it the captions stack above and below the shape. */
const MIN_COLUMN_UNIT_PX = 150;

/** The pixel heights of the stacked caption rows of a compact layout (without `EDGE_PX` and the gap), and where each caption stands. */
export interface StackPlan {
    readonly top: number;
    readonly bottom: number;
    /** Per caption index: pixels from the top (`top`) or bottom (`bottom`) board edge to the caption's own top or bottom. */
    readonly offsets: ReadonlyMap<number, {readonly from: "top" | "bottom"; readonly px: number}>;
}

/**
 * Stacks the captions that have a `top` or `bottom` row one under the other, a caption as tall as its wrapped lines: `widths` are the measured text widths
 * in pixels, a text wraps at the board's edges (`EDGE_PX` of air on each side). Rows count in order of their row number.
 */
export function stackPlan(captions: readonly Caption[], widths: readonly number[], boardWidth: number): StackPlan {
    const room = Math.max(boardWidth - 2 * EDGE_PX, 1);
    const offsets = new Map<number, {from: "top" | "bottom"; px: number}>();
    const total = {top: 0, bottom: 0};
    for (const from of ["top", "bottom"] as const) {
        const rows = captions.map((caption, index) => ({index, row: caption[from]})).filter((entry): entry is {index: number; row: number} => entry.row !== undefined)
            .sort((a, b) => a.row - b.row);
        let used = 0;
        for (const {index} of rows) {
            offsets.set(index, {from, px: EDGE_PX + used});
            // The wrap of words is a little worse than the plain width ratio.
            const lines = Math.max(1, Math.ceil((widths[index] * 1.06) / room));
            used += lines * (CAPTION_ROW_PX - 1) + 2;
        }
        total[from] = used;
    }
    return {...total, offsets};
}

/** A frame with equal units in x and y (a pixel per unit alike) that shows `frame` in a `w` x `h` board with `topPx` and `bottomPx` of captions: the left keeps `LEFT_PX` for the y tick numbers, spare width goes right, spare height above and below. */
function equalFrame(frame: readonly [number, number, number, number], topPx: number, bottomPx: number, w: number, h: number): [number, number, number, number] {
    const [left, top, right, bottom] = frame;
    const plot = Math.max(h - topPx - bottomPx, h / 3);
    const dy = top - bottom;
    let unit = Math.min(w / (right - left), plot / dy);
    let from = left;
    if (left < 0 && right > 0 && -left * unit < LEFT_PX) {
        unit = Math.min((w - LEFT_PX) / right, plot / dy);
        from = -LEFT_PX / unit;
    }
    const extra = (plot / unit - dy) / 2;
    return [from, top + extra + topPx / unit, from + w / unit, bottom - extra - bottomPx / unit];
}

/** Pixels per unit of the equal-unit frame of `frame` in a `w` x `h` board with `topPx` and `bottomPx` of captions. */
export function equalUnit(frame: readonly [number, number, number, number], topPx: number, bottomPx: number, w: number, h: number): number {
    const [left, , right] = equalFrame(frame, topPx, bottomPx, w, h);
    return w / (right - left);
}

/**
 * The frame of a scene with room in pixels for its stacked caption rows (above and under the data) and `EDGE_PX` of air at the top and bottom edge,
 * for a board `height` px tall (0: unknown): the data keeps its place in the plot, whatever the board size. `plan` (a compact layout) sets the rows' height,
 * `equal` gives x and y the same pixels per unit (a picture of a square and a circle).
 */
export function framedScene(scene: SceneData, height: number, width = 0, plan?: StackPlan, equal = false): [number, number, number, number] {
    const [left, top, right, bottom] = scene.frame;
    const rows = (key: "top" | "bottom") => scene.captions.reduce((most, caption) => Math.max(most, (caption[key] ?? -1) + 1), 0);
    const reserved = (key: "top" | "bottom") => plan ? (plan[key] > 0 ? plan[key] : 0) : (rows(key) > 0 ? CAPTION_ROW_PX * rows(key) : 0);
    const topPx = EDGE_PX + (reserved("top") > 0 ? reserved("top") + 2 : 0);
    const bottomPx = EDGE_PX + (reserved("bottom") > 0 ? reserved("bottom") + 2 : 0);
    const h = height > 0 ? height : DEFAULT_HEIGHT_PX;
    const w = width > 0 ? width : DEFAULT_WIDTH_PX;
    if (equal) return equalFrame(scene.frame, topPx, bottomPx, w, h);
    const plot = Math.max(h - topPx - bottomPx, h / 3);
    const perPx = (top - bottom) / plot;
    // The y tick numbers stand left of the vertical axis: at least `LEFT_PX` between it and the left edge.
    const wide = left < 0 && right > 0 && (-left * w) / (right - left) < LEFT_PX ? (-LEFT_PX * right) / (w - LEFT_PX) : left;
    return [wide, top + topPx * perPx, right, bottom - bottomPx * perPx];
}

const SEEDS_ID = "random-graph-seeds";
/** A Galton bin lighter than this is left out of the view the director keeps clear of the cards. */
const GALTON_TAIL_MASS = 0.005;

function trialsLabel(mode: RandomMode): string {
    switch (mode) {
        case "galton": return t("random_graph_n_galton");
        case "frequency": return t("random_graph_n_frequency");
        case "area": return t("random_graph_n_area");
        case "walk": return t("random_graph_n_walk");
        case "markov": return t("random_graph_n_markov");
        case "interval": return t("random_graph_n_interval");
    }
}

const stateName = (index: number | undefined): string => (index === 1 ? t("random_graph_start_b") : t("random_graph_start_a"));

function captionText(caption: Caption, state: RandomState): string {
    const count = caption.count ?? 0;
    const values = caption.values ?? [];
    switch (caption.key as CaptionKey) {
        case "heap": return t("random_graph_cap_heap");
        case "bars": return t("random_graph_cap_bars");
        case "path": return t("random_graph_cap_path", {value0: count});
        case "running": return t("random_graph_cap_running");
        case "half": return t("random_graph_cap_half");
        case "band": return t("random_graph_cap_band");
        case "logAxis": return state.mode === "markov" ? t("random_graph_cap_log_axis_steps") : t("random_graph_cap_log_axis");
        case "points": return t("random_graph_cap_points", {value0: count});
        case "circle": return t("random_graph_cap_circle");
        case "estimate": return t("random_graph_cap_estimate");
        case "truth": return t("random_graph_cap_truth");
        case "inside": return t("random_graph_cap_inside");
        case "outside": return t("random_graph_cap_outside");
        case "errorBar": return t("random_graph_cap_error_bar");
        case "walks": return t("random_graph_cap_walks", {value0: count});
        case "funnel": return t("random_graph_cap_funnel");
        case "walkHeap": return t("random_graph_cap_walk_heap");
        case "walkExact": return t("random_graph_cap_walk_exact");
        case "share": return t("random_graph_cap_share");
        case "exactA": return t("random_graph_cap_exact_a", {value0: stateName(state.markovStart)});
        case "stationary": return t("random_graph_cap_stationary");
        case "mean": return t("random_graph_cap_mean");
        case "miss": return t("random_graph_cap_miss");
        case "cover": return t("random_graph_cap_cover", {value0: count});
        case "circleWhole": return t("random_graph_cap_circle_whole");
        case "diff": return t("random_graph_cap_diff");
        case "diffBand": return t("random_graph_cap_diff_band");
        case "diffScale": return t("random_graph_cap_diff_scale", {value0: dec(values[0] ?? 0, 1)});
        case "seedOne": return t("random_graph_cap_seed_one", {value0: dec(values[0] ?? 0, 0)});
        case "seedTwo": return t("random_graph_cap_seed_two", {value0: dec(values[0] ?? 0, 0)});
        case "box": return t("random_graph_cap_box", {value0: stateName(values[0])});
        case "boxStart": return t("random_graph_cap_box_start");
        case "move": return t("random_graph_cap_move", {
            value0: stateName(values[0]), value1: stateName(values[1]), value2: values[3] === 1 ? String(values[2]) : `${values[2]}/${values[3]}`});
        case "missLaw": return t("random_graph_cap_miss_law", {value0: dec(values[0] ?? 0, 0), value1: dec(values[1] ?? 0, 0), value2: dec(values[2] ?? 0, 0)});
        case "missRun": return t("random_graph_cap_miss_run", {value0: dec(values[0] ?? 0, 0)});
    }
}

interface DrawnCurve {
    dataX: number[];
    dataY: number[];
    updateDataArray: () => void;
}

/**
 * The simulation graph (randomness spec RS1 to RS6): tallies from the kernel runners next to exact curves, for six modes. The drawn
 * paths, points and samples are read from the same seeded stream (`samplePaths`), so the picture is the run. The stored state is
 * `RandomState`; everything drawn or read is derived from it by `view()`, keyed on the state object.
 *
 * Ownership: every board object is created in `buildScene` and recorded in `objects`; `disposeScene` removes them. The playback driver
 * is created by `play`, stopped by every edit and disposed with the scene; the settled readout's timer is cancelled with the session.
 */
export class SimulationGraph extends BaseGraph<RandomGraphState, RandomState> {
    private objects: JXG.GeometryElement[] = [];
    private texts: JXG.Text[] = [];
    private viewCache?: {state: RandomGraphState; key: string; view: RunView; compact: boolean};
    private drawnCompact = false;
    private readonly widths = new Map<string, number>();
    private exactCache?: {key: string; exact: RandomExact};
    private drawnMode?: RandomMode;
    private drawnFrame = "";
    private drawnCaptions = 0;
    private driver?: AnimationDriver;
    private playing = false;
    private sinceStep = 0;
    private readonly status = new SettledReadout();

    override getInitialState(): RandomGraphState {
        return {initialized: false, ...DEFAULT_RANDOM_STATE};
    }

    protected override lessonDefaultState(): RandomGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): RandomState {
        return serializeRandomState(DEFAULT_RANDOM_STATE);
    }

    override presetCollection(): PresetCollection<RandomState> {
        return randomPresetCollection();
    }

    override exportPreset(): Preset<RandomState> {
        const preset = super.exportPreset();
        const {generator: _generator, mode: _mode, seed: _seed, n: _n, shown: _shown, rows: _rows, pPercent: _pPercent, walkSteps: _walkSteps, markovA: _markovA, markovB: _markovB, markovStart: _markovStart, sampleSize: _sampleSize, areaShape: _areaShape, overlay: _overlay, seed2: _seed2, stopMs: _stopMs, ...graphState} = preset.graphState as RandomGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): RandomState {
        return serializeRandomState(this.state);
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

    override importPresetData(data: RandomState): void {
        if (this.keepImportedView) this.keepNextFrame = true;
        this.setState(serializeRandomState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): RandomGraphState {
        const parsed = parseRandomState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    /** The axes mean different things (counts, probabilities, rounds): every scene frame is applied exactly, as a mount shows the default frame. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override initialView(): [number, number, number, number] {
        return framedScene(sceneFor(DEFAULT_RANDOM_STATE, simulate(DEFAULT_RANDOM_STATE), exactFor(DEFAULT_RANDOM_STATE)), this.boardHeight(), this.boardWidth());
    }

    /** The x axis of the walk has no numbers past the last step (the histogram panel there is not on that axis); the axes of the area picture none beyond the shape. */
    protected override defaultAxesAttributes() {
        const axis = this.styles.axis;
        const labelOfX = axis.defaultX.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        const current = () => this.state;
        const upToLastStep = function (this: object, ...label: unknown[]): string {
            const tick = label[0] as {usrCoords?: number[]} | undefined;
            if (current().mode === "walk" && tick?.usrCoords && tick.usrCoords[1] > current().walkSteps + 1e-9) return "";
            if (current().mode === "area" && tick?.usrCoords && Math.abs(tick.usrCoords[1]) > 1 + 1e-9) return "";
            // The frequency and Markov plots run on log10(n): the numbers stand at powers of ten as trial counts (1, 10, 100 ...), none left of 1.
            if ((current().mode === "frequency" || current().mode === "markov") && tick?.usrCoords) {
                const exponent = tick.usrCoords[1];
                return exponent > -1e-9 && Math.abs(exponent - Math.round(exponent)) < 1e-9 ? String(Math.round(10 ** Math.round(exponent))) : "";
            }
            // The interval plot spans the population 0..99; right of it stands the law panel of the miss counts, which is not on that axis.
            if (current().mode === "interval" && tick?.usrCoords && tick.usrCoords[1] > LAW_LEFT - 1 + 1e-9) return "";
            return labelOfX ? labelOfX.apply(this, label) : "";
        };
        // The y axis of the area picture has numbers only over the shape (|y| up to 1, likewise the x axis above): beyond it the stacked captions of a narrow board stand.
        const labelOfY = axis.defaultY.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        const withinShape = function (this: object, ...label: unknown[]): string {
            const tick = label[0] as {usrCoords?: number[]} | undefined;
            if (current().mode === "area" && tick?.usrCoords && Math.abs(tick.usrCoords[2]) > 1 + 1e-9) return "";
            // The Markov plot ends at 0 and 1; the captions above it and the state diagram below it carry no numbers.
            // The lower panel of the frequency plot has its own scale (the caption under it): the shared axis numbers there would mislead.
            if (current().mode === "frequency" && tick?.usrCoords && tick.usrCoords[2] < -1e-9) return "";
            if (current().mode === "markov" && tick?.usrCoords && (tick.usrCoords[2] > 1 + 1e-9 || tick.usrCoords[2] < -1e-9)) return "";
            return labelOfY ? labelOfY.apply(this, label) : "";
        };
        return {
            x: {...axis.defaultX, ticks: {...axis.defaultX.ticks, generateLabelText: upToLastStep}},
            y: {...axis.defaultY, ticks: {...axis.defaultY.ticks, generateLabelText: withinShape}},
        };
    }

    /** The width of a caption in pixels as the board font sets it (a canvas measure; a generous per-glyph estimate where there is none). */
    private textWidth(text: string): number {
        const key = `${currentLanguage()}|${text}`;
        const known = this.widths.get(key);
        if (known !== undefined) return known;
        let width = 0;
        try {
            const context = document.createElement("canvas").getContext("2d");
            if (context) {
                const family = this.hasBoard ? getComputedStyle(this.board.containerObj).fontFamily : "";
                context.font = `14px ${family || "serif"}`;
                width = context.measureText(text).width;
            }
        } catch {
            width = 0;
        }
        if (!(width > 0)) width = text.length * GLYPH_PX;
        this.widths.set(key, width);
        return width;
    }

    /**
     * Whether the area picture stacks its captions above and below the shape (compact) instead of in a column at its right: when the column cannot hold
     * the longest caption on one line, a caption cannot stand on one line of the board, or the shape would be smaller than a row of the column needs.
     */
    private areaCompact(): boolean {
        const width = this.boardWidth();
        const height = this.boardHeight();
        if (this.state.mode !== "area" || !(width > 0) || !(height > 0)) return false;
        const layout = AREA_LAYOUT[this.state.areaShape];
        const keys: CaptionKey[] = ["points", this.state.areaShape === "disc" ? "circleWhole" : "circle", "estimate", "truth", "errorBar", "inside", "outside"];
        const widths = keys.map(key => this.textWidth(captionText({key, x: 0, y: 0, count: POINTS_DRAWN}, this.state)));
        const column = Math.max(...widths.slice(2));
        const unit = equalUnit(layout.frame, EDGE_PX, EDGE_PX, width, height);
        return unit * (layout.frame[2] - layout.truth[0]) < column + 2 * EDGE_PX || Math.max(...widths) + 2 * EDGE_PX > width || unit < MIN_COLUMN_UNIT_PX;
    }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    /** Tallies, exact curves and polylines of the current state; a cache keyed on the state object, the exact part on the parameters only. */
    view(): RunView {
        const state = this.state;
        const compact = this.areaCompact();
        if (this.viewCache && this.viewCache.state === state && this.viewCache.compact === compact) return this.viewCache.view;
        // The speed does not change the run: the tallies, curves and polylines are kept when only it changed.
        const key = JSON.stringify({...state, stopMs: 0, initialized: true});
        if (this.viewCache && this.viewCache.key === key) {
            const cached = this.viewCache.view;
            const view = this.viewCache.compact === compact ? cached : {...cached, scene: sceneFor(state, cached.sim, cached.exact, cached.sim2, compact)};
            this.viewCache = {...this.viewCache, state, view, compact};
            return view;
        }
        const exactKey = `${state.mode}/${state.rows}/${state.pPercent}/${state.walkSteps}/${state.markovA}/${state.markovB}/${state.markovStart}/${state.sampleSize}`;
        if (!this.exactCache || this.exactCache.key !== exactKey) this.exactCache = {key: exactKey, exact: exactFor(state)};
        const sim = simulate(state);
        const sim2 = state.overlay === 1 && OVERLAY_MODES.includes(state.mode) ? simulate({...state, seed: state.seed2}) : undefined;
        const view: RunView = {sim, exact: this.exactCache.exact, sim2, scene: sceneFor(state, sim, this.exactCache.exact, sim2, compact)};
        this.viewCache = {state, key, view, compact};
        return view;
    }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.objects.length; }
    isPlaying(): boolean { return this.playing; }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("random_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A mount frames the scene once (a board starts with the canvas-aspect box); replacements never call initialize and keep their view.
        if (this.hasBoard) this.applyFrame();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => { this.stopDriver(); this.playing = false; this.status.cancel(); });
            session.registerCleanup(onLanguageChange(() => { this.boardUpdate(); this.status.replace(this.statusText()); }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(_previous: Readonly<RandomGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.pausePlayback();
        // A replacement (checkpoint restore, Preset import) brings its own view: build a changed scene first, then mark its frame as drawn.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.needsBuild()) this.buildScene();
            this.drawnFrame = this.frameKey();
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.needsBuild()) this.buildScene();
        this.applyFrame();
        this.board.update();
        this.status.report(this.statusText());
    }

    /** Whether the drawn texts are not those of the scene (another mode, caption count or caption layout). */
    private needsBuild(): boolean {
        const view = this.view();
        return this.drawnMode !== this.state.mode || this.drawnCaptions !== view.scene.captions.length || this.drawnCompact !== this.areaCompact();
    }

    private frameKey(): string {
        return `${this.state.mode}/${this.view().scene.frame.map(value => value.toFixed(4)).join(",")}/${this.boardHeight()}x${this.boardWidth()}/${this.plan()?.top ?? 0}/${this.plan()?.bottom ?? 0}`;
    }

    /** The stacked rows of a compact area layout (undefined in the side layout and every other mode). */
    private plan(): StackPlan | undefined {
        if (!this.areaCompact() && this.state.mode !== "markov") return undefined;
        const captions = this.view().scene.captions;
        return stackPlan(captions, captions.map(caption => this.textWidth(captionText(caption, this.state))), this.boardWidth());
    }

    /** Frames the board once per frame key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyFrame(): void {
        const frame = framedScene(this.view().scene, this.boardHeight(), this.boardWidth(), this.plan(), this.state.mode === "area");
        const key = this.frameKey();
        if (this.keepNextFrame) {
            this.keepNextFrame = false;
            this.drawnFrame = key;
            return;
        }
        if (key === this.drawnFrame) return;
        this.drawnFrame = key;
        this.boardView.following(() => this.boardView.setIntent(frame, {keepAspectRatio: false}));
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const mode = this.state.mode;
        this.drawnMode = mode;
        this.drawnCompact = this.areaCompact();
        this.clipYAxis(mode === "markov");
        this.clipXAxis(mode === "interval");
        const styles = LAYER_STYLES[mode];
        for (const name of Object.keys(styles)) {
            const curve = this.own(board.create("curve", [[], []], {
                ...styles[name], fixed: true, highlight: false, withLabel: false,
            })) as unknown as DrawnCurve & JXG.GeometryElement;
            curve.updateDataArray = () => {
                const layer: Layer = this.view().scene.layers[name] ?? EMPTY_LAYER;
                curve.dataX = Array.from(layer.x);
                curve.dataY = Array.from(layer.y);
            };
        }
        // The captions name every curve, so no curve is told apart by colour alone.
        const count = this.view().scene.captions.length;
        this.drawnCaptions = count;
        for (let i = 0; i < count; i++) {
            const caption = () => this.view().scene.captions[i];
            // A stacked caption is anchored at the edge it is stacked from, so a wrapped one grows away from the edge.
            const first = caption();
            const anchorY = first?.after || first?.top !== undefined ? "top" : first?.bottom !== undefined ? "bottom" : "middle";
            this.texts[i] = this.own(board.create("text", [() => this.captionX(caption()), () => this.captionY(caption(), i), () => {
                const current = caption();
                return current ? captionText(current, this.state) : "";
            }], {strokeColor: GraphPalette.label, fontSize: 14, anchorX: "left", anchorY, fixed: true, highlight: false, withLabel: false}));
        }
        this.drawnFrame = "";
    }

    /** The data x of a caption: a caption of the compact layout stands `EDGE_PX` from the left edge of the board. */
    private captionX(caption: Caption | undefined): number {
        if (!caption) return 0;
        if (caption.edge && this.hasBoard && this.board.unitX > 0) return this.board.getBoundingBox()[0] + EDGE_PX / this.board.unitX;
        return caption.x;
    }

    /** The data y of a caption: a stack row stands in pixels from the top or bottom edge of the window the board shows, any other caption at its scene y. */
    private captionY(caption: Caption | undefined, index: number): number {
        if (!caption) return 0;
        if (!this.hasBoard || !(this.board.unitY > 0)) return caption.y;
        if (caption.axis !== undefined) return -caption.axis / this.board.unitY;
        if (caption.after) {
            const previous = this.texts[index - 1];
            // The text wraps at the right edge of the board: its height is the larger of the measured one (one frame behind) and an estimate of the wrapped lines.
            const words = previous ? captionText(this.view().scene.captions[index - 1], this.state) : "";
            const [, , right] = this.board.getBoundingBox();
            const room = previous ? Math.max((right - previous.X()) * this.board.unitX, 1) : 1;
            // A browser wraps words a little worse than the plain width ratio (as `stackPlan` allows).
            const lines = Math.max(1, Math.ceil((this.textWidth(words) * 1.06) / room));
            const height = Math.max(previous?.getSize?.()[1] ?? 0, lines * (CAPTION_ROW_PX - 1));
            return (previous ? previous.Y() : caption.y) - (height + 2) / this.board.unitY;
        }
        const row = caption.top ?? caption.bottom;
        if (row === undefined) return caption.y;
        const [, top, , bottom] = this.board.getBoundingBox();
        const planned = this.plan()?.offsets.get(index);
        if (planned) return planned.from === "top" ? top - planned.px / this.board.unitY : bottom + planned.px / this.board.unitY;
        // The Galton path caption stands on the bottom of the scene's data frame, which the view director keeps clear of the cards and the pucks strip (the board's own bottom edge lies under them).
        if (caption.top === undefined && this.state.mode === "galton") return this.view().scene.frame[3] + (CAPTION_ROW_PX * (row + 1)) / this.board.unitY;
        const offset = (EDGE_PX + CAPTION_ROW_PX * row) / this.board.unitY;
        return caption.top !== undefined ? top - offset : bottom + offset;
    }

    /** The height of the board in pixels, or 0 before there is a board. */
    private boardHeight(): number {
        return this.hasBoard && this.board.canvasHeight > 0 ? this.board.canvasHeight : 0;
    }

    private boardWidth(): number {
        return this.hasBoard && this.board.canvasWidth > 0 ? this.board.canvasWidth : 0;
    }

    /** The y axis of the Markov plot is the segment from 0 to 1 (its points), not the infinite line that would cross the captions and the state diagram; every other mode has the whole line. */
    private clipYAxis(clipped: boolean): void {
        const axis = (this.board as unknown as {defaultAxes?: {y?: {setAttribute(attributes: {straightFirst: boolean; straightLast: boolean}): unknown}}}).defaultAxes?.y;
        axis?.setAttribute({straightFirst: !clipped, straightLast: !clipped});
    }

    /** The x axis of the interval plot ends at the law panel (x = `LAW_LEFT`), whose bars count misses, not population values; every other mode has the whole line (second point back at x = 1). */
    private clipXAxis(clipped: boolean): void {
        const axis = (this.board as unknown as {defaultAxes?: {x?: {setAttribute(attributes: {straightLast: boolean}): unknown; point2?: {setPositionDirectly?(method: number, coords: number[], oldCoords: number[]): unknown; coords?: {usrCoords: number[]}; moveTo?(coords: number[]): unknown}}}}).defaultAxes?.x;
        if (!axis) return;
        axis.setAttribute({straightLast: !clipped});
        axis.point2?.moveTo?.([clipped ? LAW_LEFT - 1 : 1, 0]);
    }

    private disposeScene(): void {
        if (this.hasBoard) {
            const board = this.board;
            this.clipYAxis(false);
            this.clipXAxis(false);
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.texts = [];
        this.drawnMode = undefined;
        this.drawnCaptions = 0;
        this.drawnCompact = false;
        this.drawnFrame = "";
    }

    // ---- Editing and playback -------------------------------------------------------------------------------------------

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

    /** An export captures one settled scene, so playback stops first. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Stops the playback; the position stays where it is. */
    override pausePlayback(): void {
        this.stopDriver();
        if (!this.playing) return;
        this.playing = false;
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Starts playing from the position (from 0 when everything is shown). Under reduced motion nothing moves: everything is shown at once. */
    play(): void {
        if (this.playing || !this.hasBoard || !this.graphSession?.isAlive) return;
        const {n, shown} = this.state;
        if (this.reducedMotion()) {
            if (shown < n) this.setState({shown: n});
            this.requestRender();
            return;
        }
        if (shown >= n) this.setState({shown: 0});
        this.sinceStep = this.state.stopMs;
        this.playing = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.requestRender();
    }

    private advance(delta: number): void {
        if (!this.playing || !this.graphSession?.isAlive) return;
        this.sinceStep += delta;
        if (this.sinceStep < this.state.stopMs) return;
        this.sinceStep = 0;
        const {n, shown} = this.state;
        const next = nextStop(shown, n);
        this.setState({shown: next});
        if (next >= n) this.pausePlayback();
    }

    stepOnce(): void {
        this.pausePlayback();
        const {n, shown} = this.state;
        this.setState({shown: nextStop(shown, n)});
        this.requestRender();
    }

    resetRun(): void {
        this.pausePlayback();
        this.setState({shown: 0});
        this.requestRender();
    }

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<RandomState>): void {
        this.pausePlayback();
        this.setState(patch);
        this.requestRender();
    }

    editMode(mode: RandomMode): void {
        if (mode !== this.state.mode) this.edit(withMode(this.state, mode));
    }

    editSeed(value: number): boolean {
        const checked = snapSeedInput(value);
        if (!checked.ok) return false;
        this.edit({seed: checked.value});
        return true;
    }

    editSeed2(value: number): boolean {
        const checked = snapSeedInput(value);
        if (!checked.ok) return false;
        this.edit({seed2: checked.value});
        return true;
    }

    editOverlay(on: boolean): void {
        if ((on ? 1 : 0) !== this.state.overlay) this.edit({overlay: on ? 1 : 0});
    }

    editShape(shape: AreaShape): void {
        if (shape !== this.state.areaShape) this.edit({areaShape: shape});
    }

    /** The speed does not change the run, so it does not pause the playback: the next stop simply comes sooner or later. */
    editStopMs(value: number): boolean {
        const checked = snapStopInput(value);
        if (!checked.ok) return false;
        this.setState({stopMs: checked.value});
        this.requestRender();
        return true;
    }

    editTrials(value: number): boolean {
        const checked = snapTrialsInput(this.state.mode, value);
        if (!checked.ok) return false;
        this.edit({n: checked.value, shown: checked.value});
        return true;
    }

    editRows(value: number): boolean {
        const checked = snapRowsInput(value);
        if (!checked.ok) return false;
        this.edit({rows: checked.value});
        return true;
    }

    editPercent(value: number): boolean {
        const checked = snapPercentInput(value);
        if (!checked.ok) return false;
        this.edit({pPercent: checked.value});
        return true;
    }

    editWalkSteps(value: number): boolean {
        const checked = snapWalkStepsInput(value);
        if (!checked.ok) return false;
        this.edit({walkSteps: checked.value});
        return true;
    }

    editChain(field: "markovA" | "markovB", value: number): boolean {
        const checked = snapChainInput(value, field);
        if (!checked.ok) return false;
        this.edit(field === "markovA" ? {markovA: checked.value} : {markovB: checked.value});
        return true;
    }

    editStart(start: 0 | 1): void {
        if (start !== this.state.markovStart) this.edit({markovStart: start});
    }

    editSampleSize(value: number): boolean {
        const checked = snapSampleSizeInput(value);
        if (!checked.ok) return false;
        this.edit({sampleSize: checked.value});
        return true;
    }

    // ---- Lesson actions -------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`random`): `set-mode` picks the mode (its default trial count, everything shown, as the mode list does), `set-run` sets the seed, the trial count
     * (everything shown, as typing it does), the rows and the right-bounce percent, the walk steps, the area shape, the Markov percentages and start state and the
     * interval sample size (each as its control writes it: the playback position stays), `set-overlay` the second run, `set-position` the playback position (a stop of the
     * playback). The merged state goes through `parseRandomState` (strict, nothing snapped or clamped) before the first write, so a bad value is a lesson-content error
     * and nothing is written; unknown fields are refused. A write halts the playback. A scene reads the state its earlier actions wrote.
     */
    applyRandomAction(action: Extract<LessonAction, {kind: "random"}>): void {
        const {kind: _kind, operation: _operation, ...fields} = action;
        const state = serializeRandomState(this.state);
        switch (action.operation) {
            case "set-mode":
                this.refuseUnknown("set-mode", fields, ["mode"]);
                this.commitRandom("set-mode", withMode(state, action.mode));
                return;
            case "set-run": {
                this.refuseUnknown("set-run", fields, ["seed", "n", "rows", "pPercent", "walkSteps", "areaShape", "markovA", "markovB", "markovStart", "sampleSize"]);
                const {n, seed, rows, pPercent, walkSteps, areaShape, markovA, markovB, markovStart, sampleSize} = action;
                const defined = Object.fromEntries(Object.entries({seed, rows, pPercent, walkSteps, areaShape, markovA, markovB, markovStart, sampleSize})
                    .filter(([, value]) => value !== undefined));
                this.commitRandom("set-run", {...state, ...defined, ...(n !== undefined ? {n, shown: n} : {})});
                return;
            }
            case "set-overlay": {
                this.refuseUnknown("set-overlay", fields, ["overlay", "seed2"]);
                if (typeof action.overlay !== "boolean") throw new Error("random set-overlay: overlay must be true or false.");
                if (action.overlay && !OVERLAY_MODES.includes(state.mode)) throw new Error(`random set-overlay: the mode ${state.mode} has no second run.`);
                this.commitRandom("set-overlay", {...state, overlay: action.overlay ? 1 : 0, ...(action.seed2 !== undefined ? {seed2: action.seed2} : {})});
                return;
            }
            case "set-position":
                this.refuseUnknown("set-position", fields, ["shown"]);
                if (!playbackStops(state.n).includes(action.shown)) throw new Error(`random set-position: shown must be a playback stop of n = ${state.n}.`);
                this.commitRandom("set-position", {...state, shown: action.shown});
                return;
            default: {
                const unsupported: never = action;
                throw new Error(`random: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    private refuseUnknown(operation: string, fields: Readonly<Record<string, unknown>>, allowed: readonly string[]): void {
        const unknown = Object.keys(fields).filter(key => !allowed.includes(key));
        if (unknown.length) throw new Error(`random ${operation}: no such field ${unknown.join(", ")}.`);
    }

    /** Validates the merged state first, then halts the playback and writes only the fields that change. */
    private commitRandom(operation: string, merged: unknown): void {
        const parsed = parseRandomState(merged);
        if (!parsed.ok) throw new Error(`random ${operation}: ${parsed.error.message}`);
        const current = new Map(Object.entries(serializeRandomState(this.state)));
        const changed = Object.fromEntries(Object.entries(parsed.value).filter(([key, value]) => value !== current.get(key)));
        this.pausePlayback();
        if (Object.keys(changed).length) this.edit(changed);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("random", action => this.applyRandomAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    /** The state sentence: the tallies of the run shown so far. */
    statusMessage(): Message {
        const state = this.state;
        const {sim, exact} = this.view();
        const shown = state.shown;
        const of = {value0: shown, value1: state.n};
        switch (sim.kind) {
            case "galton":
                if (exact.kind !== "galton") return message("random_graph_status_galton", {...of, value2: ""});
                return message("random_graph_status_galton", {...of, value2: dec(largestBarDifference(sim.counts, exact.masses, sim.trials), 4)});
            case "frequency":
                return message("random_graph_status_frequency", {...of, value2: sim.heads, value3: dec(shown > 0 ? sim.heads / shown : 0, 4), value4: dec(sim.heads - shown / 2, 1)});
            case "area":
                if (shown <= 0) return message("random_graph_status_area_none", of);
                return message("random_graph_status_area", {...of, value2: sim.inside, value3: dec(shown > 0 ? (4 * sim.inside) / shown : 0, 4)});
            case "walk":
                return message("random_graph_status_walk", {...of, value2: sim.zeros});
            case "markov":
                return message("random_graph_status_markov", {...of, value2: sim.inA, value3: dec(shown > 0 ? sim.inA / shown : 0, 4)});
            case "interval":
                return message("random_graph_status_interval", {...of, value2: sim.misses});
        }
    }

    private statusText(): string {
        return renderMessage(this.statusMessage());
    }

    /** The rows of the readout as declared; the panel shows their text. */
    private readoutRows(): SimulationRow[] {
        const state = this.state;
        const {sim, exact} = this.view();
        const shown = state.shown;
        const rows: SimulationRow[] = [
            {id: "shown", name: message("random_graph_r_shown"), value: message("random_graph_r_shown_value", {value0: shown, value1: state.n})},
            {id: "seed", name: message("random_graph_r_seed"), value: formatted(String(state.seed))},
        ];
        if (sim.kind === "galton" && exact.kind === "galton") {
            const middle = exact.masses.indexOf(Math.max(...exact.masses));
            const frequency = shown > 0 ? sim.counts[middle] / shown : 0;
            const sd = frequencySd(exact.masses[middle], Math.max(shown, 1));
            rows.push(
                {id: "counts", name: message("random_graph_r_counts"), value: formatted(sim.counts.join("; "))},
                {id: "expected", name: message("random_graph_r_expected"), value: formatted(exact.masses.map(m => dec(m * shown, 1)).join("; "))},
                {id: "largest", name: message("random_graph_r_largest"), value: formatted(dec(largestBarDifference(sim.counts, exact.masses, shown), 4))},
                {id: "middle", name: message("random_graph_r_middle", {value0: middle}), value: message("random_graph_r_middle_value", {
                    value0: dec(frequency, 4), value1: dec(exact.masses[middle], 4), value2: dec(sd, 4)})},
            );
        } else if (sim.kind === "frequency") {
            const width = shown > 0 ? fairCoinBandHalfWidth(shown) : 0;
            rows.push(
                {id: "heads", name: message("random_graph_r_heads"), value: message("random_graph_r_heads_value", {value0: sim.heads, value1: shown})},
                {id: "frequency", name: message("random_graph_r_frequency"), value: formatted(dec(shown > 0 ? sim.heads / shown : 0, 4))},
                {id: "band", name: message("random_graph_r_band"), value: message("random_graph_r_band_value", {
                    value0: dec(shown / 2 - width, 1), value1: dec(shown / 2 + width, 1), value2: dec(width, 1)})},
                {id: "typical", name: message("random_graph_r_typical"), value: formatted(`± ${dec(shown > 0 ? frequencySd(0.5, shown) : 0, 4)}`)},
            );
        } else if (sim.kind === "area") {
            const estimate = (4 * sim.inside) / Math.max(shown, 1);
            const none = message("random_graph_r_unavailable");
            rows.push(
                {id: "inside", name: message("random_graph_r_inside"), value: message("random_graph_r_inside_value", {value0: sim.inside, value1: shown})},
                {id: "share", name: message("random_graph_r_share_inside"), value: shown > 0 ? formatted(dec(sim.inside / shown, 4)) : none},
                {id: "estimate", name: message("random_graph_r_pi_estimate"), value: shown > 0 ? formatted(dec(estimate, 4)) : none},
                {id: "error", name: message("random_graph_r_pi_error"), value: shown > 0 ? formatted(dec(estimate - Math.PI, 4)) : none},
                {id: "typical", name: message("random_graph_r_se"), value: shown > 0 ? formatted(`± ${dec(piStandardError(shown), 4)}`) : none},
            );
        } else if (sim.kind === "walk" && exact.kind === "walk") {
            rows.push(
                {id: "rms", name: message("random_graph_r_rms"), value: message("random_graph_r_rms_value", {
                    value0: dec(shown > 0 ? Math.sqrt(sim.sumSquares / shown) : 0, 2), value1: dec(Math.sqrt(state.walkSteps), 2)})},
                {id: "mean-abs", name: message("random_graph_r_mean_abs"), value: message("random_graph_r_mean_abs_value", {
                    value0: dec(shown > 0 ? sim.sumAbs / shown : 0, 3), value1: dec(exact.meanAbs, 4)})},
                {id: "zeros", name: message("random_graph_r_zeros"), value: state.walkSteps % 2 === 1 ? message("random_graph_r_zeros_odd", {value0: sim.zeros})
                    : message("random_graph_r_zeros_value", {value0: sim.zeros, value1: dec(exact.zeroMass * shown, 1)})},
            );
        } else if (sim.kind === "markov" && exact.kind === "markov") {
            const sd = markovShareSd(exact, Math.max(shown, 1));
            rows.push(
                {id: "share", name: message("random_graph_r_share"), value: formatted(dec(shown > 0 ? sim.inA / shown : 0, 4))},
                {id: "stationary", name: message("random_graph_r_stationary"), value: exact.stationary
                    ? formatted(`${dec(exact.stationary[0], 4)}; ${dec(exact.stationary[1], 4)}`) : message("random_graph_r_stationary_none")},
                {id: "lambda", name: message("random_graph_r_lambda"), value: formatted(dec(exact.lambda, 4))},
                {id: "typical", name: message("random_graph_r_share_sd"), value: formatted(sd === null ? "—" : `± ${dec(sd, 4)}`)},
                {id: "exact-a", name: message("random_graph_r_exact_a", {value0: shown}), value: formatted(shown > 0 ? dec(markovProbabilityA(state, shown), 5) : "—")},
            );
        } else if (sim.kind === "interval" && exact.kind === "interval") {
            const expected = exact.miss * shown;
            rows.push(
                {id: "misses", name: message("random_graph_r_misses"), value: message("random_graph_r_misses_value", {value0: sim.misses, value1: shown})},
                {id: "miss-share", name: message("random_graph_r_miss_share"), value: formatted(percentText(shown > 0 ? sim.misses / shown : 0))},
                {id: "exact-miss", name: message("random_graph_r_exact_miss"), value: formatted(percentText(exact.miss))},
                {id: "exact-coverage", name: message("random_graph_r_exact_coverage"), value: formatted(withDecimalSeparator(exact.coverage.toFixed(5), currentLanguage()))},
                {id: "expected", name: message("random_graph_r_expected_misses"), value: message("random_graph_r_expected_misses_value", {
                    value0: dec(expected, 1), value1: dec(Math.sqrt(shown * exact.miss * (1 - exact.miss)), 1)})},
                {id: "half-width", name: message("random_graph_r_half_width"), value: formatted(dec(intervalHalfWidth(state.sampleSize), 4))},
            );
        }
        const second = this.view().sim2;
        const secondRow = second ? this.secondRow(second, exact) : undefined;
        if (secondRow) rows.push(secondRow);
        return rows;
    }

    /** The text of the declared rows, as the panel lists them. */
    private listRows(): ReadoutListRow[] {
        return this.readoutRows().map(({id, name, value}): ReadoutListRow => ({
            id, label: name ? renderMessage(name) : "", value: "kind" in value && value.kind === "formatted" ? value.text : renderMessage(value as Message),
        }));
    }

    /** Sentences under the readout list (not rows, so the labelled rows stay a definition list): why the Markov chain is special, and equal seeds. */
    private readoutNotes(): {id: SimulationIds["note"]; text: Message}[] {
        const state = this.state;
        const {exact, sim2} = this.view();
        const notes: {id: SimulationIds["note"]; text: Message}[] = [];
        if (exact.kind === "markov") {
            if (exact.stationary === null) notes.push({id: "identity", text: message("random_graph_r_note_identity")});
            else if (exact.lambda === -1) notes.push({id: "period", text: message("random_graph_r_note_period")});
        }
        if (sim2 && state.seed2 === state.seed) notes.push({id: "seed2-same", text: message("random_graph_seed2_same")});
        return notes;
    }

    /** One headline number of the second run, the same one the first run shows in its own row (the area and the interval mode have no second run). */
    private secondRow(second: RandomSim, exact: RandomExact): SimulationRow | undefined {
        const shown = this.state.shown;
        const seed = {value0: dec(this.state.seed2, 0)};
        switch (second.kind) {
            case "galton": return {id: "seed2", name: message("random_graph_r_seed2_galton", seed),
                value: formatted(exact.kind === "galton" ? dec(largestBarDifference(second.counts, exact.masses, second.trials), 4) : "")};
            case "frequency": return {id: "seed2", name: message("random_graph_r_seed2_frequency", seed), value: message("random_graph_r_heads_value", {value0: second.heads, value1: shown})};
            case "walk": return {id: "seed2", name: message("random_graph_r_seed2_walk", seed), value: formatted(String(second.zeros))};
            case "markov": return {id: "seed2", name: message("random_graph_r_seed2_markov", seed), value: formatted(dec(shown > 0 ? second.inA / shown : 0, 4))};
            default: return undefined;
        }
    }

    // ---- Declaration ----------------------------------------------------------------------------------------------------

    private refusal(min: number, max: number): DomainError {
        return new DomainError(message("random_value_rejected", {value0: dec(min, 0), value1: dec(max, 0)}));
    }

    private seedRefusal(): DomainError {
        return new DomainError(message("random_graph_seed_rejected", {value0: dec(SEED_MIN, 0), value1: dec(SEED_MAX, 0)}));
    }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const number = (value: unknown): number => (typeof value === "number" ? value : NaN);
        const bound = (read: () => number, edit: (value: number) => boolean, refused: () => DomainError): ParameterBinding => ({
            read, apply: (value: unknown) => { if (!edit(number(value))) throw refused(); },
        });
        return {
            "random-n": bound(() => this.state.n, value => this.editTrials(value), () => this.refusal(N_MIN, N_MAX[this.state.mode])),
            "random-seed": bound(() => this.state.seed, value => this.editSeed(value), () => this.seedRefusal()),
            "random-seed2": bound(() => this.state.seed2, value => this.editSeed2(value), () => this.seedRefusal()),
            "random-rows": bound(() => this.state.rows, value => this.editRows(value), () => this.refusal(ROWS_MIN, ROWS_MAX)),
            "random-p": bound(() => this.state.pPercent, value => this.editPercent(value), () => this.refusal(P_MIN, P_MAX)),
            "random-steps": bound(() => this.state.walkSteps, value => this.editWalkSteps(value), () => this.refusal(WALK_STEPS_MIN, WALK_STEPS_MAX)),
            "random-a": bound(() => this.state.markovA, value => this.editChain("markovA", value), () => this.refusal(CHAIN_MIN, CHAIN_MAX)),
            "random-b": bound(() => this.state.markovB, value => this.editChain("markovB", value), () => this.refusal(CHAIN_MIN, CHAIN_MAX)),
            "random-sample": bound(() => this.state.sampleSize, value => this.editSampleSize(value), () => this.refusal(SAMPLE_SIZE_MIN, SAMPLE_SIZE_MAX)),
            "random-start": {
                read: () => String(this.state.markovStart),
                apply: (value: unknown) => {
                    if (value !== "0" && value !== "1") throw new DomainError(message("random_choice_unknown", {value0: String(value)}));
                    this.editStart(value === "1" ? 1 : 0);
                },
            },
            "random-shape": {
                read: () => this.state.areaShape,
                apply: (value: unknown) => {
                    const shape = AREA_SHAPES.find(candidate => candidate === value);
                    if (!shape) throw new DomainError(message("random_choice_unknown", {value0: String(value)}));
                    this.editShape(shape);
                },
            },
        };
    }

    private trialsName(mode: RandomMode): Message {
        switch (mode) {
            case "galton": return message("random_graph_n_galton");
            case "frequency": return message("random_graph_n_frequency");
            case "area": return message("random_graph_n_area");
            case "walk": return message("random_name_walks");
            case "markov": return message("random_name_chain_steps");
            case "interval": return message("random_name_intervals");
        }
    }

    /** Whether the second seed is in use: the mode has a second run and it is switched on. */
    private secondRun(): boolean {
        return OVERLAY_MODES.includes(this.state.mode) && this.state.overlay === 1;
    }

    /**
     * Pucks: the lessons ask the learner to type the number of trials (all six modes, e.g. rs1-thousand, rs2-thousand, rs3-se, rs4-ten-walks, rs5-longer, rs6-long) and the
     * seed (rs1-seed, rs2-count, rs3-replay-seeds), to set the mode's own parameter (rows and p in rs1-p and rs1-explore, steps per walk in rs4-parity and rs4-doubling, a and b in
     * rs5-rates and rs5-edges, the starting state in rs5-start-b, the sample size in rs6-sample-size, the shape in rs3-whole-circle), and to try other second seeds (rs2-seeds).
     * The mode, the second-run switch and the playback stay in Orodja: a scene sets them, and the playback has no arbiter key.
     */
    protected override declaration(): GraphDeclaration<SimulationIds> {
        const state = this.state;
        type Param = ParameterDeclaration<SimulationIds["param"]>;
        const count = (key: SimulationIds["param"], label: Message, min: number, max: number, help?: Message): Param =>
            ({key, kind: "count", label, placement: "board", min, max, ...(help ? {help} : {})});
        const percent = (key: SimulationIds["param"], label: Message, symbol: string, min: number, max: number): Param =>
            ({key, kind: "range", label, symbol, placement: "board", min, max, step: PERCENT_STEP, bigStep: 20, maxDecimals: 0, unit: message("random_unit_percent")});
        const parameters: Param[] = [count("random-n", this.trialsName(state.mode), N_MIN, N_MAX[state.mode])];
        switch (state.mode) {
            case "galton":
                parameters.push(count("random-rows", message("random_name_rows"), ROWS_MIN, ROWS_MAX), percent("random-p", message("random_name_p"), "p", P_MIN, P_MAX));
                break;
            case "area":
                parameters.push({
                    key: "random-shape", kind: "choice", label: message("random_graph_shape_label"), placement: "board", puck: true,
                    options: AREA_SHAPES.map(value => ({value, label: message(value === "disc" ? "random_graph_shape_disc" : "random_graph_shape_quarter"),
                        short: message(value === "disc" ? "random_shape_disc_short" : "random_shape_quarter_short")})),
                });
                break;
            case "walk":
                parameters.push({key: "random-steps", kind: "range", label: message("random_name_walk_steps"), placement: "board", min: WALK_STEPS_MIN, max: WALK_STEPS_MAX, step: 1, bigStep: 10, maxDecimals: 0});
                break;
            case "markov":
                parameters.push(
                    percent("random-a", message("random_name_a"), "a", CHAIN_MIN, CHAIN_MAX),
                    percent("random-b", message("random_name_b"), "b", CHAIN_MIN, CHAIN_MAX),
                    {
                        key: "random-start", kind: "choice", label: message("random_graph_start_label"), placement: "board", puck: true,
                        options: [{value: "0", label: message("random_graph_start_a"), short: message("random_graph_start_a")},
                            {value: "1", label: message("random_graph_start_b"), short: message("random_graph_start_b")}],
                    },
                );
                break;
            case "interval":
                parameters.push({key: "random-sample", kind: "range", label: message("random_graph_sample_label"), placement: "board", min: SAMPLE_SIZE_MIN, max: SAMPLE_SIZE_MAX, step: 1, bigStep: 10, maxDecimals: 0});
                break;
            default:
                break;
        }
        parameters.push(count("random-seed", message("random_graph_seed_label"), SEED_MIN, SEED_MAX, message("random_graph_seed_help")));
        if (this.secondRun()) parameters.push(count("random-seed2", message("random_graph_seed2_label"), SEED_MIN, SEED_MAX, message("random_graph_seed2_help")));
        // What the mode shows (the bars or bins, the walk or chain paths, the area shape): the data frame of the scene, never the canvas-sized fit.
        const [frameLeft, top, frameRight, bottom] = this.view().scene.frame;
        let left = frameLeft;
        let right = frameRight;
        const {exact} = this.view();
        if (exact.kind === "galton") {
            // The outermost bins hold under half a percent each: the bars the learner reads are the others, so the view keeps those clear of the cards and may cut the sparse tails.
            const heavy = exact.masses.flatMap((mass, slot) => (mass >= GALTON_TAIL_MASS ? [slot] : []));
            if (heavy.length > 0) { left = Math.max(frameLeft, heavy[0] - 0.7); right = Math.min(frameRight, heavy[heavy.length - 1] + 0.7); }
        }
        return {
            parameters,
            readouts: [{id: "values", title: message("random_graph_readout_title"), rows: this.readoutRows()}],
            notes: [{id: "status", text: this.statusMessage()}, ...this.readoutNotes()],
            marks: {must: [{kind: "box", left, top, right, bottom}]},
            followView: [left, top, right, bottom],
        };
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const whole = {decimals: 0, integer: true};
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("random_graph_mode_label")} value={state.mode}
                          options={RANDOM_MODES.map(value => ({value, text: modeName(value)}))}
                          onChange={value => { const mode = RANDOM_MODES.find(candidate => candidate === value); if (mode) this.editMode(mode); }}/>,
            <PuckOwned key="n" param="random-n"><CountSetter label={trialsLabel(state.mode)} n={state.n} min={N_MIN} max={N_MAX[state.mode]}
                         onPlus={() => this.editTrials(state.n + 1)} onMinus={() => this.editTrials(state.n - 1)}
                         onSet={value => this.editTrials(value)}/></PuckOwned>,
        ];
        switch (state.mode) {
            case "galton":
                commands.push(
                    <PuckOwned key="rows" param="random-rows"><CountSetter label={t("random_graph_rows_label")} n={state.rows} min={ROWS_MIN} max={ROWS_MAX} bigStep={2}
                                 onPlus={() => this.editRows(state.rows + 1)} onMinus={() => this.editRows(state.rows - 1)} onSet={value => this.editRows(value)}/></PuckOwned>,
                    <PuckOwned key="p" param="random-p"><Slider customText={t("random_graph_p_label")} value={state.pPercent} step={PERCENT_STEP} bigStep={20} min={P_MIN} max={P_MAX}
                            grid={PERCENT_STEP} onChange={value => this.editPercent(value)}/></PuckOwned>,
                );
                break;
            case "area":
                commands.push(<PuckOwned key="shape" param="random-shape"><ChoiceSelect label={t("random_graph_shape_label")} value={state.areaShape}
                                            options={AREA_SHAPES.map(value => ({value, text: t(value === "disc" ? "random_graph_shape_disc" : "random_graph_shape_quarter")}))}
                                            onChange={value => { const shape = AREA_SHAPES.find(candidate => candidate === value); if (shape) this.editShape(shape); }}/></PuckOwned>);
                break;
            case "walk":
                commands.push(<PuckOwned key="steps" param="random-steps"><Slider customText={t("random_graph_steps_label")} value={state.walkSteps} step={1} bigStep={10}
                                  min={WALK_STEPS_MIN} max={WALK_STEPS_MAX} onChange={value => this.editWalkSteps(value)}/></PuckOwned>);
                break;
            case "markov":
                commands.push(
                    <PuckOwned key="a" param="random-a"><Slider customText={t("random_graph_a_label")} value={state.markovA} step={PERCENT_STEP} bigStep={20} min={CHAIN_MIN} max={CHAIN_MAX}
                            grid={PERCENT_STEP} onChange={value => this.editChain("markovA", value)}/></PuckOwned>,
                    <PuckOwned key="b" param="random-b"><Slider customText={t("random_graph_b_label")} value={state.markovB} step={PERCENT_STEP} bigStep={20} min={CHAIN_MIN} max={CHAIN_MAX}
                            grid={PERCENT_STEP} onChange={value => this.editChain("markovB", value)}/></PuckOwned>,
                    <PuckOwned key="start" param="random-start"><ChoiceSelect label={t("random_graph_start_label")} value={String(state.markovStart)}
                                  options={[{value: "0", text: t("random_graph_start_a")}, {value: "1", text: t("random_graph_start_b")}]}
                                  onChange={value => this.editStart(value === "1" ? 1 : 0)}/></PuckOwned>,
                );
                break;
            case "interval":
                commands.push(<PuckOwned key="sample" param="random-sample"><Slider customText={t("random_graph_sample_label")} value={state.sampleSize} step={1} bigStep={10}
                                  min={SAMPLE_SIZE_MIN} max={SAMPLE_SIZE_MAX} onChange={value => this.editSampleSize(value)}/></PuckOwned>);
                break;
            default:
                break;
        }
        const second = this.secondRun();
        const seedControls = <>
            <PuckOwned param="random-seed"><NumberInput label={t("random_graph_seed_label")} value={state.seed} step={1} bigStep={100} min={SEED_MIN} max={SEED_MAX}
                         help={t("random_graph_seed_help")} rejectedHint={t("random_graph_seed_rejected", {value0: dec(SEED_MIN, 0), value1: dec(SEED_MAX, 0)})}
                         {...whole} onChange={value => this.editSeed(value)}/></PuckOwned>
            {OVERLAY_MODES.includes(state.mode) && <BooleanField variant="switch" label={t("random_graph_overlay_label")} checked={state.overlay === 1}
                                                                   onChange={on => this.editOverlay(on)}/>}
            {second && <PuckOwned param="random-seed2"><NumberInput label={t("random_graph_seed2_label")} value={state.seed2} step={1} bigStep={100} min={SEED_MIN} max={SEED_MAX}
                                    help={t("random_graph_seed2_help")} rejectedHint={t("random_graph_seed_rejected", {value0: dec(SEED_MIN, 0), value1: dec(SEED_MAX, 0)})}
                                    {...whole} onChange={value => this.editSeed2(value)}/></PuckOwned>}
        </>;
        // The group keeps the second-run switch in the modes that have one; without it the seed alone is a puck and the group goes.
        commands.push(OVERLAY_MODES.includes(state.mode)
            ? <div key="seeds" className="inspector-group" role="group" aria-labelledby={SEEDS_ID}><h3 id={SEEDS_ID}>{t("random_graph_seeds_group")}</h3>{seedControls}</div>
            : <PuckOwnedGroup key="seeds" params={["random-seed"]} className="inspector-group" role="group" aria-labelledby={SEEDS_ID}><h3 id={SEEDS_ID}>{t("random_graph_seeds_group")}</h3>{seedControls}</PuckOwnedGroup>);
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        const {n, shown} = this.state;
        const {index, length} = stopPosition(shown, n);
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReducedMotion>{() => <>
                    <PlaybackButtons placement="graph" groupLabel={t("random_graph_playback_group")} nextLabel={t("next_step")} resetLabel={t("replay")}
                                     playing={this.playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (this.playing) this.pausePlayback(); else this.play(); }}
                                     onReset={() => this.resetRun()} {...playbackBlocks({atStart: shown === 0, atEnd: shown >= n, playing: this.playing})}
                                     playBlock={shown >= n && this.reducedMotion() && !this.playing ? "no-more-steps" : undefined}/>
                    <Slider customText={t("random_graph_speed_label")} min={STOP_MS_MIN} max={STOP_MS_MAX} step={STOP_MS_STEP} grid={STOP_MS_STEP} bigStep={200}
                            value={this.state.stopMs} help={t("random_graph_speed_help", {value0: dec(STOP_MS_MIN, 0), value1: dec(STOP_MS_MAX, 0), value2: dec(STOP_MS_STEP, 0)})} rejectedHint={t("random_graph_speed_rejected", {value0: dec(STOP_MS_MIN, 0), value1: dec(STOP_MS_MAX, 0), value2: dec(STOP_MS_STEP, 0)})}
                            unavailableReason={this.reducedMotion() ? t("random_graph_speed_reduced") : undefined}
                            onChange={value => this.editStopMs(value)}/>
                </>}</ReducedMotion>
                <StepCounter step={index} length={length}/>
            </div>
            <div className="inspector-group" data-declared-panel="">
                <ReadoutHeading>{t("random_graph_readout_title")}</ReadoutHeading>
                <p data-random-status="" data-readout-note="">{this.statusText()}</p>
                <ReadoutList label={t("random_graph_readout_title")} rows={this.listRows()}/>
                {this.readoutNotes().map(note => <ReadoutHelp key={note.id} hooks={{"data-readout-note": ""}}><span data-random-note="">{renderMessage(note.text)}</span></ReadoutHelp>)}
                <LiveReadout readout={this.status} muted={this.playing}/>
            </div>
        </>;
    }
}

export default SimulationGraph;
