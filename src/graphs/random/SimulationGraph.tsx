import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {BooleanField} from "../../inputs/BooleanField";
import Slider from "../../inputs/Slider";
import {ReadoutHeading, ReadoutHelp, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {StepCounter} from "../base/controls/StepCounter";
import {GraphPalette} from "../styles/GraphPalette";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import {
    AREA_SHAPES, AreaShape, CHAIN_MAX, CHAIN_MIN, DEFAULT_RANDOM_STATE, exactFor, fairCoinBandHalfWidth, frequencySd, largestBarDifference, markovShareSd,
    N_MAX, N_MIN, nextStop, OVERLAY_MODES, P_MAX, P_MIN, PERCENT_STEP, piStandardError, RANDOM_MODES, RandomExact, RandomMode, RandomSim, RandomState,
    ROWS_MAX, ROWS_MIN, SAMPLE_SIZE_MAX, SAMPLE_SIZE_MIN, SEED_MAX, SEED_MIN, simulate, snapChainInput, snapPercentInput, snapRowsInput,
    snapSampleSizeInput, snapSeedInput, snapStopInput, snapTrialsInput, snapWalkStepsInput, STOP_MS_DEFAULT, STOP_MS_MAX, STOP_MS_MIN, STOP_MS_STEP, stopPosition,
    WALK_STEPS_MAX, WALK_STEPS_MIN, withMode,
} from "../../random/randomModel";
import {intervalHalfWidth} from "../../random/samplePaths";
import {Caption, CaptionKey, EMPTY_LAYER, Layer, sceneFor, SceneData} from "./simulationScene";

/** The scene state: the stored simulation fields (`RandomState`), nothing derived. */
export interface RandomGraphState extends BaseGraphState, RandomState {}

const HELP_ID = "random-graph-input-help";
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
const percentText = (fraction: number): string => `${dec(fraction * 100, 1)} %`;

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
        case "logAxis": return t("random_graph_cap_log_axis");
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
        case "boxStart": return t("random_graph_cap_box_start", {value0: stateName(values[0])});
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
export class SimulationGraph extends BaseGraph<RandomGraphState, null> {
    private objects: JXG.GeometryElement[] = [];
    private viewCache?: {state: RandomGraphState; key: string; view: RunView};
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

    override defaultPreset(): null {
        return null;
    }

    protected override initialView(): [number, number, number, number] {
        return [-1, 0.4, DEFAULT_RANDOM_STATE.rows + 1, -0.4];
    }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    /** Tallies, exact curves and polylines of the current state; a cache keyed on the state object, the exact part on the parameters only. */
    view(): RunView {
        const state = this.state;
        if (this.viewCache && this.viewCache.state === state) return this.viewCache.view;
        // The speed does not change the run: the tallies, curves and polylines are kept when only it changed.
        const key = JSON.stringify({...state, stopMs: 0, initialized: true});
        if (this.viewCache && this.viewCache.key === key) {
            this.viewCache = {...this.viewCache, state};
            return this.viewCache.view;
        }
        const exactKey = `${state.mode}/${state.rows}/${state.pPercent}/${state.walkSteps}/${state.markovA}/${state.markovB}/${state.markovStart}/${state.sampleSize}`;
        if (!this.exactCache || this.exactCache.key !== exactKey) this.exactCache = {key: exactKey, exact: exactFor(state)};
        const sim = simulate(state);
        const sim2 = state.overlay === 1 && OVERLAY_MODES.includes(state.mode) ? simulate({...state, seed: state.seed2}) : undefined;
        const view: RunView = {sim, exact: this.exactCache.exact, sim2, scene: sceneFor(state, sim, this.exactCache.exact, sim2)};
        this.viewCache = {state, key, view};
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
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.drawnMode !== this.state.mode || this.drawnCaptions !== this.view().scene.captions.length) this.buildScene();
        this.applyFrame();
        this.board.update();
        this.status.report(this.statusText());
    }

    private applyFrame(): void {
        const frame = this.view().scene.frame;
        const key = `${this.state.mode}/${frame.map(value => value.toFixed(4)).join(",")}`;
        if (key === this.drawnFrame) return;
        this.drawnFrame = key;
        this.board.setBoundingBox([...frame], false);
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
            this.own(board.create("text", [() => caption()?.x ?? 0, () => caption()?.y ?? 0, () => {
                const current = caption();
                return current ? captionText(current, this.state) : "";
            }], {strokeColor: GraphPalette.label, fontSize: 14, anchorX: "left", fixed: true, highlight: false, withLabel: false}));
        }
        this.drawnFrame = "";
        this.applyFrame();
    }

    private disposeScene(): void {
        if (this.hasBoard) {
            const board = this.board;
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.drawnMode = undefined;
        this.drawnCaptions = 0;
        this.drawnFrame = "";
    }

    // ---- Editing and playback -------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
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

    // ---- Text -----------------------------------------------------------------------------------------------------------

    private statusText(): string {
        const state = this.state;
        const {sim, exact} = this.view();
        const shown = state.shown;
        const of = {value0: shown, value1: state.n};
        switch (sim.kind) {
            case "galton":
                if (exact.kind !== "galton") return "";
                return t("random_graph_status_galton", {...of, value2: dec(largestBarDifference(sim.counts, exact.masses, sim.trials), 4)});
            case "frequency":
                return t("random_graph_status_frequency", {...of, value2: sim.heads, value3: dec(shown > 0 ? sim.heads / shown : 0, 4), value4: dec(sim.heads - shown / 2, 1)});
            case "area":
                return t("random_graph_status_area", {...of, value2: sim.inside, value3: dec(shown > 0 ? (4 * sim.inside) / shown : 0, 4)});
            case "walk":
                return t("random_graph_status_walk", {...of, value2: sim.zeros});
            case "markov":
                return t("random_graph_status_markov", {...of, value2: sim.inA, value3: dec(shown > 0 ? sim.inA / shown : 0, 4)});
            case "interval":
                return t("random_graph_status_interval", {...of, value2: sim.misses});
        }
    }

    private readoutRows(): ReadoutListRow[] {
        const state = this.state;
        const {sim, exact} = this.view();
        const shown = state.shown;
        const rows: ReadoutListRow[] = [
            {id: "shown", label: t("random_graph_r_shown"), value: t("random_graph_r_shown_value", {value0: shown, value1: state.n})},
            {id: "seed", label: t("random_graph_r_seed"), value: String(state.seed)},
        ];
        if (sim.kind === "galton" && exact.kind === "galton") {
            const middle = exact.masses.indexOf(Math.max(...exact.masses));
            const frequency = shown > 0 ? sim.counts[middle] / shown : 0;
            const sd = frequencySd(exact.masses[middle], Math.max(shown, 1));
            rows.push(
                {id: "counts", label: t("random_graph_r_counts"), value: sim.counts.join("; ")},
                {id: "expected", label: t("random_graph_r_expected"), value: exact.masses.map(m => dec(m * shown, 1)).join("; ")},
                {id: "largest", label: t("random_graph_r_largest"), value: dec(largestBarDifference(sim.counts, exact.masses, shown), 4)},
                {id: "middle", label: t("random_graph_r_middle", {value0: middle}), value: t("random_graph_r_middle_value", {
                    value0: dec(frequency, 4), value1: dec(exact.masses[middle], 4), value2: dec(sd, 4)})},
            );
        } else if (sim.kind === "frequency") {
            const width = shown > 0 ? fairCoinBandHalfWidth(shown) : 0;
            rows.push(
                {id: "heads", label: t("random_graph_r_heads"), value: t("random_graph_r_heads_value", {value0: sim.heads, value1: shown})},
                {id: "frequency", label: t("random_graph_r_frequency"), value: dec(shown > 0 ? sim.heads / shown : 0, 4)},
                {id: "band", label: t("random_graph_r_band"), value: t("random_graph_r_band_value", {
                    value0: dec(shown / 2 - width, 1), value1: dec(shown / 2 + width, 1), value2: dec(width, 1)})},
                {id: "typical", label: t("random_graph_r_typical"), value: `± ${dec(shown > 0 ? frequencySd(0.5, shown) : 0, 4)}`},
            );
        } else if (sim.kind === "area") {
            const estimate = shown > 0 ? (4 * sim.inside) / shown : 0;
            rows.push(
                {id: "inside", label: t("random_graph_r_inside"), value: t("random_graph_r_inside_value", {value0: sim.inside, value1: shown})},
                {id: "share", label: t("random_graph_r_share_inside"), value: dec(shown > 0 ? sim.inside / shown : 0, 4)},
                {id: "estimate", label: t("random_graph_r_pi_estimate"), value: dec(estimate, 4)},
                {id: "error", label: t("random_graph_r_pi_error"), value: dec(shown > 0 ? estimate - Math.PI : 0, 4)},
                {id: "typical", label: t("random_graph_r_se"), value: `± ${dec(shown > 0 ? piStandardError(shown) : 0, 4)}`},
            );
        } else if (sim.kind === "walk" && exact.kind === "walk") {
            rows.push(
                {id: "rms", label: t("random_graph_r_rms"), value: t("random_graph_r_rms_value", {
                    value0: dec(shown > 0 ? Math.sqrt(sim.sumSquares / shown) : 0, 2), value1: dec(Math.sqrt(state.walkSteps), 2)})},
                {id: "mean-abs", label: t("random_graph_r_mean_abs"), value: t("random_graph_r_mean_abs_value", {
                    value0: dec(shown > 0 ? sim.sumAbs / shown : 0, 3), value1: dec(exact.meanAbs, 4)})},
                {id: "zeros", label: t("random_graph_r_zeros"), value: state.walkSteps % 2 === 1 ? t("random_graph_r_zeros_odd", {value0: sim.zeros})
                    : t("random_graph_r_zeros_value", {value0: sim.zeros, value1: dec(exact.zeroMass * shown, 1)})},
            );
        } else if (sim.kind === "markov" && exact.kind === "markov") {
            const sd = markovShareSd(exact, Math.max(shown, 1));
            rows.push(
                {id: "share", label: t("random_graph_r_share"), value: dec(shown > 0 ? sim.inA / shown : 0, 4)},
                {id: "stationary", label: t("random_graph_r_stationary"), value: exact.stationary
                    ? `${dec(exact.stationary[0], 4)}; ${dec(exact.stationary[1], 4)}` : t("random_graph_r_stationary_none")},
                {id: "lambda", label: t("random_graph_r_lambda"), value: dec(exact.lambda, 4)},
                {id: "typical", label: t("random_graph_r_share_sd"), value: sd === null ? "—" : `± ${dec(sd, 4)}`},
            );
        } else if (sim.kind === "interval" && exact.kind === "interval") {
            const expected = exact.miss * shown;
            rows.push(
                {id: "misses", label: t("random_graph_r_misses"), value: t("random_graph_r_misses_value", {value0: sim.misses, value1: shown})},
                {id: "miss-share", label: t("random_graph_r_miss_share"), value: percentText(shown > 0 ? sim.misses / shown : 0)},
                {id: "exact-miss", label: t("random_graph_r_exact_miss"), value: percentText(exact.miss)},
                {id: "expected", label: t("random_graph_r_expected_misses"), value: t("random_graph_r_expected_misses_value", {
                    value0: dec(expected, 1), value1: dec(Math.sqrt(shown * exact.miss * (1 - exact.miss)), 1)})},
                {id: "half-width", label: t("random_graph_r_half_width"), value: dec(intervalHalfWidth(state.sampleSize), 4)},
            );
        }
        const second = this.view().sim2;
        if (second) rows.push(this.secondRow(second, exact));
        return rows;
    }

    /** Sentences under the readout list (not rows, so the labelled rows stay a definition list): why the Markov chain is special, and equal seeds. */
    private readoutNotes(): string[] {
        const state = this.state;
        const {exact, sim2} = this.view();
        const notes: string[] = [];
        if (exact.kind === "markov") {
            if (exact.stationary === null) notes.push(t("random_graph_r_note_identity"));
            else if (exact.lambda === -1) notes.push(t("random_graph_r_note_period"));
        }
        if (sim2 && state.seed2 === state.seed) notes.push(t("random_graph_seed2_same"));
        return notes;
    }

    /** One headline number of the second run, the same one the first run shows in its own row. */
    private secondRow(second: RandomSim, exact: RandomExact): ReadoutListRow {
        const shown = this.state.shown;
        const seed = {value0: dec(this.state.seed2, 0)};
        switch (second.kind) {
            case "galton": return {id: "seed2", label: t("random_graph_r_seed2_galton", seed),
                value: exact.kind === "galton" ? dec(largestBarDifference(second.counts, exact.masses, second.trials), 4) : ""};
            case "frequency": return {id: "seed2", label: t("random_graph_r_seed2_frequency", seed), value: t("random_graph_r_heads_value", {value0: second.heads, value1: shown})};
            case "walk": return {id: "seed2", label: t("random_graph_r_seed2_walk", seed), value: String(second.zeros)};
            case "markov": return {id: "seed2", label: t("random_graph_r_seed2_markov", seed), value: dec(shown > 0 ? second.inA / shown : 0, 4)};
            default: return {id: "seed2", value: ""};
        }
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private inputHelp(): string {
        const state = this.state;
        const common = {value0: dec(SEED_MIN, 0), value1: dec(SEED_MAX, 0), value2: dec(N_MIN, 0), value3: dec(N_MAX[state.mode], 0)};
        switch (state.mode) {
            case "galton": return t("random_graph_input_help_galton", {...common, value4: dec(ROWS_MIN, 0), value5: dec(ROWS_MAX, 0), value6: dec(P_MIN, 0), value7: dec(P_MAX, 0)});
            case "frequency": return t("random_graph_input_help_frequency", common);
            case "area": return t("random_graph_input_help_area", common);
            case "walk": return t("random_graph_input_help_walk", {...common, value4: dec(WALK_STEPS_MIN, 0), value5: dec(WALK_STEPS_MAX, 0)});
            case "markov": return t("random_graph_input_help_markov", {...common, value4: dec(CHAIN_MIN, 0), value5: dec(CHAIN_MAX, 0)});
            case "interval": return t("random_graph_input_help_interval", {...common, value4: dec(SAMPLE_SIZE_MIN, 0), value5: dec(SAMPLE_SIZE_MAX, 0)});
        }
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const whole = {decimals: 0, integer: true, describedBy: HELP_ID};
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("random_graph_mode_label")} value={state.mode}
                          options={RANDOM_MODES.map(value => ({value, text: modeName(value)}))}
                          onChange={value => { const mode = RANDOM_MODES.find(candidate => candidate === value); if (mode) this.editMode(mode); }}/>,
            <NumberInput key="seed" label={t("random_graph_seed_label")} value={state.seed} step={1} bigStep={100} min={SEED_MIN} max={SEED_MAX}
                         help={t("random_graph_seed_help")} rejectedHint={t("random_graph_seed_rejected", {value0: dec(SEED_MIN, 0), value1: dec(SEED_MAX, 0)})}
                         {...whole} onChange={value => this.editSeed(value)}/>,
            <NumberInput key="n" label={trialsLabel(state.mode)} value={state.n} step={1} bigStep={10} min={N_MIN} max={N_MAX[state.mode]}
                         {...whole} onChange={value => this.editTrials(value)}/>,
        ];
        if (OVERLAY_MODES.includes(state.mode)) {
            commands.push(
                <BooleanField key="overlay" variant="switch" label={t("random_graph_overlay_label")} checked={state.overlay === 1}
                              describedBy={HELP_ID} onChange={on => this.editOverlay(on)}/>,
                <NumberInput key="seed2" label={t("random_graph_seed2_label")} value={state.seed2} step={1} bigStep={100} min={SEED_MIN} max={SEED_MAX}
                             help={t("random_graph_seed2_help")} rejectedHint={t("random_graph_seed_rejected", {value0: dec(SEED_MIN, 0), value1: dec(SEED_MAX, 0)})}
                             {...whole} onChange={value => this.editSeed2(value)}/>,
            );
        }
        switch (state.mode) {
            case "galton":
                commands.push(
                    <NumberInput key="rows" label={t("random_graph_rows_label")} value={state.rows} step={1} bigStep={2} min={ROWS_MIN} max={ROWS_MAX}
                                 {...whole} onChange={value => this.editRows(value)}/>,
                    <NumberInput key="p" label={t("random_graph_p_label")} value={state.pPercent} step={PERCENT_STEP} bigStep={20} min={P_MIN} max={P_MAX}
                                 grid={PERCENT_STEP} {...whole} onChange={value => this.editPercent(value)}/>,
                );
                break;
            case "area":
                commands.push(<ChoiceSelect key="shape" label={t("random_graph_shape_label")} value={state.areaShape}
                                            options={AREA_SHAPES.map(value => ({value, text: t(value === "disc" ? "random_graph_shape_disc" : "random_graph_shape_quarter")}))}
                                            onChange={value => { const shape = AREA_SHAPES.find(candidate => candidate === value); if (shape) this.editShape(shape); }}/>);
                break;
            case "walk":
                commands.push(<NumberInput key="steps" label={t("random_graph_steps_label")} value={state.walkSteps} step={1} bigStep={10}
                                           min={WALK_STEPS_MIN} max={WALK_STEPS_MAX} {...whole} onChange={value => this.editWalkSteps(value)}/>);
                break;
            case "markov":
                commands.push(
                    <NumberInput key="a" label={t("random_graph_a_label")} value={state.markovA} step={PERCENT_STEP} bigStep={20} min={CHAIN_MIN} max={CHAIN_MAX}
                                 grid={PERCENT_STEP} {...whole} onChange={value => this.editChain("markovA", value)}/>,
                    <NumberInput key="b" label={t("random_graph_b_label")} value={state.markovB} step={PERCENT_STEP} bigStep={20} min={CHAIN_MIN} max={CHAIN_MAX}
                                 grid={PERCENT_STEP} {...whole} onChange={value => this.editChain("markovB", value)}/>,
                    <ChoiceSelect key="start" label={t("random_graph_start_label")} value={String(state.markovStart)}
                                  options={[{value: "0", text: t("random_graph_start_a")}, {value: "1", text: t("random_graph_start_b")}]}
                                  onChange={value => this.editStart(value === "1" ? 1 : 0)}/>,
                );
                break;
            case "interval":
                commands.push(<NumberInput key="sample" label={t("random_graph_sample_label")} value={state.sampleSize} step={1} bigStep={10}
                                           min={SAMPLE_SIZE_MIN} max={SAMPLE_SIZE_MAX} {...whole} onChange={value => this.editSampleSize(value)}/>);
                break;
            default:
                break;
        }
        commands.push(<p key="help" id={HELP_ID} className="form-text">{this.inputHelp()}</p>);
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        const {n, shown} = this.state;
        const {index, length} = stopPosition(shown, n);
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <PlaybackButtons placement="graph" groupLabel={t("random_graph_playback_group")} nextLabel={t("next_step")} resetLabel={t("replay")}
                                 playing={this.playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (this.playing) this.pausePlayback(); else this.play(); }}
                                 onReset={() => this.resetRun()} {...playbackBlocks({atStart: shown === 0, atEnd: shown >= n, playing: this.playing})}
                                 playBlock={shown >= n && this.reducedMotion() && !this.playing ? "no-more-steps" : undefined}/>
                <Slider customText={t("random_graph_speed_label")} min={STOP_MS_MIN} max={STOP_MS_MAX} step={STOP_MS_STEP} grid={STOP_MS_STEP} bigStep={200}
                        value={this.state.stopMs} help={t("random_graph_speed_help", {value0: dec(STOP_MS_MIN, 0), value1: dec(STOP_MS_MAX, 0), value2: dec(STOP_MS_STEP, 0)})} rejectedHint={t("random_graph_speed_rejected", {value0: dec(STOP_MS_MIN, 0), value1: dec(STOP_MS_MAX, 0), value2: dec(STOP_MS_STEP, 0)})}
                        unavailableReason={this.reducedMotion() ? t("random_graph_speed_reduced") : undefined}
                        onChange={value => this.editStopMs(value)}/>
                <StepCounter step={index} length={length}/>
                <ReadoutHeading>{t("random_graph_readout_title")}</ReadoutHeading>
                <p data-random-status="">{this.statusText()}</p>
                <ReadoutList label={t("random_graph_readout_title")} rows={this.readoutRows()}/>
                {this.readoutNotes().map(note => <ReadoutHelp key={note}><span data-random-note="">{note}</span></ReadoutHelp>)}
                <LiveReadout readout={this.status} muted={this.playing}/>
            </div>
        </>;
    }
}

export default SimulationGraph;
