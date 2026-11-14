import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FourierSpectrumBars} from "./FourierSpectrumBars";
import {FourierDecaySpectra} from "./FourierDecaySpectra";
import {guard, guardField} from "../base/controls/guard";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {FOURIER_EXAMPLE_IDS, FOURIER_EXAMPLES, FourierExampleId} from "../../analysis/fourierExamples";
import {fourierExampleCoefficients, fourierSupError} from "../../analysis/fourierDecay";
import {
    changeFourierDecayN, changeFourierK, chooseFourierLayout, chooseFourierScale, chooseFourierSelections, chooseFourierView, FOURIER_COEFFICIENTS_VIEWS,
    FOURIER_DECAY_N_MAX, FOURIER_DECAY_N_MIN, FOURIER_DECAY_SCALES, FourierCoefficientsView, FourierDecayScale, DEFAULT_FOURIER_COEFFICIENTS_MODEL, FOURIER_COEFFICIENT_TERMS, FOURIER_COEFFICIENTS_LAYOUTS,
    FOURIER_K_MAX, FOURIER_K_MIN, FOURIER_VALUE_BIG_STEP, FOURIER_VALUE_MAX, FOURIER_VALUE_MIN, FOURIER_VALUE_STEP, FourierCoefficientsEdit,
    FourierCoefficientsLayout, FourierCoefficientsModel, fourierHarmonic, FourierProductPolygons, fourierPartialSumSamples, fourierProductPolygons,
    fourierProjection, FourierProjection, fourierSlots, FourierSlot, selectFourierCoefficient, setFourierOverlay, setFourierValue, snapFourierValue,
} from "../../analysis/fourierCoefficientsModel";
import {fourierCoefficientsIssueMessage} from "./fourierCoefficientsMessages";
import {functionPresetCollections} from "./functionPresetCollections";
import {GraphPalette} from "../styles/GraphPalette";

/** The most handle values of any layout (the free layout), and the most linear pieces of f. */
const MAX_SLOTS = 5;
const MAX_PIECES = 4;
const BOARD_VIEW: BoundingBox = [-4.4, 6.4, 4.4, -4.6];
const HARMONIC_DASH = 1;
const SUM_DASH = 3;
const FOURIER_COLORS = {
    function: "#2468a2", harmonic: "#596a78", positive: "#4c9a8a", negative: "#c67978", sum: "#bd6047",
    decay: ["#2468a2", "#438d7d", "#875b91"] as const,
};

/** The names of x at the breakpoints, language-neutral. */
const X_TEXT: ReadonlyArray<readonly [number, string]> = [[-Math.PI, "−π"], [-Math.PI / 2, "−π/2"], [0, "0"], [1, "1"], [Math.PI / 2, "π/2"], [Math.PI, "π"]];
const xText = (x: number) => X_TEXT.find(([value]) => Math.abs(value - x) < 1e-9)?.[1] ?? String(x);

/** The board colours of the three decay functions, shared with their spectra. Read when drawn, so the palette stays the single source. */
const decayColors = (): readonly string[] => FOURIER_COLORS.decay;

/** f over [-pi, pi] as one run per smooth piece (a NaN between them breaks the line at a jump), 160 samples per piece. */
function decayFunctionSamples(id: FourierExampleId): { x: number[]; y: number[] } {
    const source = FOURIER_EXAMPLES[id].source;
    if (source.kind !== "function") throw new Error("the decay examples are functions");
    const x: number[] = [];
    const y: number[] = [];
    const edge = 1e-9;
    for (let piece = 0; piece + 1 < source.breakpoints.length; piece++) {
        const from = source.breakpoints[piece] + edge;
        const to = source.breakpoints[piece + 1] - edge;
        if (piece > 0) {
            x.push(NaN);
            y.push(NaN);
        }
        for (let i = 0; i <= 160; i++) {
            const xi = from + ((to - from) * i) / 160;
            x.push(xi);
            y.push(source.f(xi));
        }
    }
    return {x, y};
}

/** What the decay view draws on the board: f and S_N of the three selected examples. */
interface DecayView {
    functions: { x: number[]; y: number[] }[];
    sums: { x: number[]; y: number[] }[];
}

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View extends FourierProjection {
    product: FourierProductPolygons;
    sum: { x: number[]; y: number[] };
    /** Present only in the decay view. */
    decay?: DecayView;
}

/**
 * Fourier coefficients as projections (lesson F2, projection view; the decay view of F4 shares the model and is drawn later).
 * The model is `{view, layout, values, K, selected, overlay, selections, n, scale}` (`src/analysis/fourierCoefficientsModel`):
 * the shape f, its coefficients, the signed product f * harmonic, S_K, the mean square and the Parseval sum are recomputed from it.
 * Handles move only vertically (ADR 0034 section 2); breakpoints are fixed by the layout, so no drag can make a piece degenerate.
 *
 * Rules (reject, never clamp or round): handle values are finite in [-4, 4] (drags snap to 0.05 before they ask), K is an integer
 * in 1..32 and not below the selected harmonic, the selected harmonic satisfies 0 <= k <= K and b_0 does not exist. A setter that
 * would break a rule throws a `DomainError` and leaves the model unchanged. Fields, drags and lesson actions use the same setters.
 */
export class FourierCoefficientsGraph extends BaseFunctionGraph<FourierCoefficientsModel> {
    private handles: JXG.Point[] = [];
    private seamMirror?: JXG.Point;

    override presetCollection() {
        return functionPresetCollections["fourier-coefficients"];
    }

    protected defaultModel(): FourierCoefficientsModel {
        return {...DEFAULT_FOURIER_COEFFICIENTS_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    /** Values range over [-4, 4] while x spans two units of pi: the stored view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    private viewOf(model: FourierCoefficientsModel): View {
        return this.memoView(model, () => {
            const projection = fourierProjection(model);
            return {
                ...projection,
                product: fourierProductPolygons(projection.shape, model.selected.term, model.selected.k),
                sum: fourierPartialSumSamples(projection.coefficients, model.K),
                decay: model.view === "decay" ? {
                    functions: model.selections.map(decayFunctionSamples),
                    sums: model.selections.map(id => fourierPartialSumSamples(fourierExampleCoefficients(id), model.n)),
                } : undefined,
            };
        });
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    private accepted(edit: FourierCoefficientsEdit): FourierCoefficientsModel {
        if (!edit.ok) throw new DomainError(fourierCoefficientsIssueMessage(edit.issue));
        return edit.model;
    }

    protected setView(value: unknown): void {
        const next = this.accepted(chooseFourierView(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setLayout(value: unknown): void {
        const next = this.accepted(chooseFourierLayout(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setValue(index: number, value: number, options: { syncScene?: boolean } = {}): void {
        const next = this.accepted(setFourierValue(this.model, index, value));
        if (next !== this.model) this.commitModel(next, options);
    }

    protected setK(value: number): void {
        const next = this.accepted(changeFourierK(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setTerm(term: unknown): void {
        const next = this.accepted(selectFourierCoefficient(this.model, term, this.model.selected.k));
        if (next !== this.model) this.commitModel(next);
    }

    protected setHarmonic(k: number): void {
        const next = this.accepted(selectFourierCoefficient(this.model, this.model.selected.term, k));
        if (next !== this.model) this.commitModel(next);
    }

    protected setOverlay(visible: boolean): void {
        const next = this.accepted(setFourierOverlay(this.model, visible));
        if (next !== this.model) this.commitModel(next);
    }

    /** Sets the example of one of the three decay slots; a choice that duplicates another slot is rejected by the model. */
    protected setSelection(slot: number, value: unknown): void {
        const selections: unknown[] = [...this.model.selections];
        selections[slot] = value;
        const next = this.accepted(chooseFourierSelections(this.model, selections));
        if (next !== this.model) this.commitModel(next);
    }

    protected setDecayN(value: number): void {
        const next = this.accepted(changeFourierDecayN(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setScale(value: unknown): void {
        const next = this.accepted(chooseFourierScale(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        const handle = (index: number) => (value: number) => this.setValue(index, value);
        return {
            parameters: {
                "fourier-handle-0": handle(0), "fourier-handle-1": handle(1), "fourier-handle-2": handle(2), "fourier-handle-3": handle(3),
                "fourier-handle-4": handle(4), "fourier-order": value => this.setK(value), "fourier-harmonic": value => this.setHarmonic(value),
                "fourier-n": value => this.setDecayN(value),
            },
            visibility: {"fourier-partial-sum": visible => this.setOverlay(visible)},
            choices: {
                "fourier-view": value => this.setView(value), "fourier-layout": value => this.setLayout(value), "fourier-term": value => this.setTerm(value),
                "fourier-selection-1": value => this.setSelection(0, value), "fourier-selection-2": value => this.setSelection(1, value),
                "fourier-selection-3": value => this.setSelection(2, value), "fourier-scale": value => this.setScale(value),
            },
        };
    }

    // ---- Texts -------------------------------------------------------------------------------------------------------

    private number(value: number, decimals = 4): string {
        return formatNumber(value, currentLanguage(), decimals);
    }

    /** The selected coefficient as it is written: a₁, b₃. */
    private coefficientName(model: FourierCoefficientsModel): string {
        const digits = "₀₁₂₃₄₅₆₇₈₉";
        return model.selected.term + String(model.selected.k).split("").map(digit => digits[Number(digit)]).join("");
    }

    private harmonicName(model: FourierCoefficientsModel): string {
        return `${model.selected.term === "a" ? "cos" : "sin"} ${model.selected.k === 1 ? "" : model.selected.k}x`;
    }

    private exampleName(id: FourierExampleId): string {
        const names: Record<FourierExampleId, string> = {
            square: t("fourier_decay_example_square"), sawtooth: t("fourier_decay_example_sawtooth"), abs: t("fourier_decay_example_abs"),
            jump: t("fourier_decay_example_jump"), smooth: t("fourier_decay_example_smooth"),
        };
        return names[id];
    }

    private slotLabel(slot: FourierSlot): string {
        const x = xText(slot.x);
        return slot.side === "left" ? t("fourier_coef_handle_left", {value0: x}) : slot.side === "right" ? t("fourier_coef_handle_right", {value0: x})
            : t("fourier_coef_handle_value", {value0: x});
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const projection = () => this.model.view === "projection";
        const decay = () => this.model.view === "decay";
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const slots = () => fourierSlots(this.model.layout);
        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const fill = (color: string, data: () => { x: number[]; y: number[] }) => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: color, fillOpacity: 0.28, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true, visible: projection,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const polygon = data();
                curve.dataX = polygon.x;
                curve.dataY = polygon.y;
            };
        };
        const line = (color: string, width: () => number, dash: number, data: () => { x: number[]; y: number[] }, visible: () => boolean = projection) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, strokeWidth: width, dash, highlight: false, fixed: true, visible,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const samples = data();
                curve.dataX = samples.x;
                curve.dataY = samples.y;
            };
        };

        // Layers, lowest first: the signed product (fills, then its edge), the harmonic, S_K, f, the markers, the handles.
        fill(FOURIER_COLORS.positive, () => view().product.positive);
        fill(FOURIER_COLORS.negative, () => view().product.negative);
        line(FOURIER_COLORS.harmonic, thin, 0, () => view().product.line);
        line(FOURIER_COLORS.harmonic, thin, HARMONIC_DASH, () => {
            const {term, k} = model().selected;
            const count = Math.max(64, 16 * k + 1);
            const x = Array.from({length: count + 1}, (_, i) => -Math.PI + (2 * Math.PI * i) / count);
            return {x, y: x.map(xi => fourierHarmonic(term, k, xi))};
        });
        line(FOURIER_COLORS.sum, strokeWidth, SUM_DASH, () => view().sum, () => projection() && model().overlay);
        // Each decay function and its dashed partial sum share their spectrum colour.
        for (let slot = 0; slot < 3; slot++) {
            const colour = () => decayColors()[slot];
            const draw = (dash: number, data: () => { x: number[]; y: number[] } | undefined) => {
                const curve = this.own(board.create("curve", [[], []], {
                    strokeColor: colour, strokeWidth, dash, highlight: false, fixed: true, visible: decay,
                })) as unknown as FillCurve;
                curve.updateDataArray = () => {
                    const samples = data();
                    curve.dataX = samples?.x ?? [];
                    curve.dataY = samples?.y ?? [];
                };
            };
            draw(0, () => view().decay?.functions[slot]);
            draw(SUM_DASH, () => view().decay?.sums[slot]);
        }
        for (let i = 0; i < MAX_PIECES; i++) {
            const piece = () => view().shape.breakpoints.length - 1 > i ? {
                x0: view().shape.breakpoints[i], y0: view().shape.right[i], x1: view().shape.breakpoints[i + 1], y1: view().shape.left[i + 1],
            } : undefined;
            this.own(board.create("segment", [[() => piece()?.x0 ?? 0, () => piece()?.y0 ?? 0], [() => piece()?.x1 ?? 0, () => piece()?.y1 ?? 0]], {
                strokeColor: FOURIER_COLORS.function, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: () => projection() && piece() !== undefined,
            }));
        }

        // The Dirichlet midpoint at the seam and at every interior jump: the value the series converges to there.
        const midpoint = (x: () => number, y: () => number, visible: () => boolean) => this.own(board.create("point", [x, y], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
            fillColor: FOURIER_COLORS.sum, strokeColor: FOURIER_COLORS.sum, visible,
        }));
        const jumpAt = (i: number) => () => {
            const shape = view().shape;
            return projection() && i < shape.breakpoints.length - 1 && Math.abs(shape.left[i] - shape.right[i]) > 1e-12;
        };
        const seamJumps = () => projection() && Math.abs(view().shape.right[0] - view().shape.left[view().shape.breakpoints.length - 1]) > 1e-12;
        midpoint(() => -Math.PI, () => view().seamMidpoint, seamJumps);
        midpoint(() => Math.PI, () => view().seamMidpoint, seamJumps);
        for (let i = 1; i < MAX_SLOTS - 1; i++) {
            midpoint(() => view().shape.breakpoints[i] ?? 0, () => ((view().shape.left[i] ?? 0) + (view().shape.right[i] ?? 0)) / 2, jumpAt(i));
        }

        // The handles: vertical only. A drag snaps to 0.05; a value the model still refuses puts the handle back.
        const handleAt = (slotIndex: () => number | undefined) => {
            const slotNow = () => {
                const index = slotIndex();
                return index === undefined || !projection() ? undefined : slots()[index];
            };
            const start = slotNow();
            const point = this.own(board.create("point", [start?.x ?? 0, start === undefined ? 0 : this.model.values[start.index]], {
                ...this.styles.point.default, name: "", withLabel: false, size: markerSize, fillColor: FOURIER_COLORS.function,
                highlightFillColor: FOURIER_COLORS.function, visible: () => slotNow() !== undefined,
            })) as JXG.Point;
            point.on("drag", () => {
                const slot = slotNow();
                if (!slot) return;
                const snapped = snapFourierValue(point.Y());
                const accepted = this.dragEdit(() => this.setValue(slot.index, snapped, {syncScene: false}));
                point.moveTo([slot.x, accepted ? snapped : this.model.values[slot.index]]);
            });
            return point;
        };
        this.handles = Array.from({length: MAX_SLOTS}, (_, j) => handleAt(() => (j < slots().length ? j : undefined)));
        // Without a seam jump the seam value is shared, so the same handle is also offered at +pi.
        this.seamMirror = handleAt(() => (slots()[0].side === "value" ? 0 : undefined));
        this.seamMirror.moveTo([Math.PI, this.model.values[0]]);

        this.caption("top-left", [
            {text: () => t("fourier_coef_board_title", {value0: this.harmonicName(model())}), scale: 1.1, visible: projection},
            {text: () => t("fourier_coef_board_coefficient", {value0: this.coefficientName(model()), value1: this.number(view().selectedValue, 5)}), color: GraphPalette.label, visible: projection},
            {text: () => t("fourier_coef_board_sums", {value0: this.number(view().squareIntegral, 5), value1: this.number(view().parseval, 5)}), visible: projection},
            {text: () => t("fourier_coef_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH, visible: projection},
            {text: () => t("fourier_decay_board_title", {value0: model().n}), scale: 1.1, visible: decay},
            {text: () => t("fourier_decay_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH, visible: decay},
        ]);
    }

    protected override syncSceneToModel(): void {
        const slots = fourierSlots(this.model.layout);
        this.handles.forEach((point, j) => {
            if (j < slots.length) point.moveTo([slots[j].x, this.model.values[j]]);
        });
        if (slots[0].side === "value") this.seamMirror?.moveTo([Math.PI, this.model.values[0]]);
    }

    protected override onSceneRemoved(): void {
        this.handles = [];
        this.seamMirror = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    /** Runs an inspector change: a refusal is kept as the visible notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    /** A handle drag: a refusal shows its reason once (repeated frames are not announced again), an accepted frame clears it. */
    private dragEdit(action: () => void): boolean {
        try {
            action();
        } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            this.refusals.refuse(error.reason ?? error.message);
            return false;
        }
        this.refusals.clear();
        return true;
    }

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const viewText: Record<FourierCoefficientsView, string> = {projection: t("fourier_coef_view_projection"), decay: t("fourier_coef_view_decay")};
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("fourier_coef_view_label")} value={state.view} options={FOURIER_COEFFICIENTS_VIEWS.map(id => ({value: id, text: viewText[id]}))}
                              onChange={next => this.guarded(() => this.setView(next))}/>
            </div>
            {state.view === "decay" ? this.renderDecayControls(state) : this.renderProjectionControls(state)}
        </>;
    }

    private renderDecayControls(state: FourierCoefficientsModel): React.ReactNode {
        const scaleText: Record<FourierDecayScale, string> = {linear: t("fourier_decay_scale_linear"), log: t("fourier_decay_scale_log")};
        return <div className="inspector-group">
            {/* An example shown by another slot is disabled here (the model also rejects it, with a visible reason, for lesson and Preset paths).
                Lesson authors: swapping two examples between slots needs a free example as an intermediate step. */}
            {state.selections.map((id, slot) => <ChoiceSelect key={slot} label={t("fourier_decay_selection_label", {value0: slot + 1})} value={id}
                                                              options={FOURIER_EXAMPLE_IDS.map(option => ({
                                                                  value: option, text: this.exampleName(option), disabled: option !== id && state.selections.includes(option),
                                                              }))}
                                                              onChange={next => this.guarded(() => this.setSelection(slot, next))}/>)}
            <CountSetter label={t("fourier_decay_n_label")} n={state.n} min={FOURIER_DECAY_N_MIN} max={FOURIER_DECAY_N_MAX}
                         rejectedHint={t("fourier_coef_issue_n", {value0: FOURIER_DECAY_N_MIN, value1: FOURIER_DECAY_N_MAX})}
                         onPlus={() => this.guarded(() => this.setDecayN(this.model.n + 1))}
                         onMinus={() => this.guarded(() => this.setDecayN(this.model.n - 1))}
                         onSet={next => guardField(this.refusals, () => this.setDecayN(next))}/>
            <ChoiceSelect label={t("fourier_decay_scale_label")} value={state.scale} options={FOURIER_DECAY_SCALES.map(id => ({value: id, text: scaleText[id]}))}
                          onChange={next => this.guarded(() => this.setScale(next))}/>
            <p className="inspector-help">{t("fourier_decay_help")}</p>
        </div>;
    }

    private renderProjectionControls(state: FourierCoefficientsModel): React.ReactNode {
        const language = currentLanguage();
        const slots = fourierSlots(state.layout);
        const layoutText: Record<FourierCoefficientsLayout, string> = {
            abs: t("fourier_coef_layout_abs"), jump: t("fourier_coef_layout_jump"), free: t("fourier_coef_layout_free"),
        };
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("fourier_coef_layout_label")} value={state.layout} help={t("fourier_coef_layout_help")}
                              options={FOURIER_COEFFICIENTS_LAYOUTS.map(id => ({value: id, text: layoutText[id]}))}
                              onChange={next => this.guarded(() => this.setLayout(next))}/>
            </div>
            <div className="inspector-group">
                {slots.map(slot => <Slider key={slot.index} customText={this.slotLabel(slot)} value={state.values[slot.index]} min={FOURIER_VALUE_MIN} max={FOURIER_VALUE_MAX}
                                           step={FOURIER_VALUE_STEP} bigStep={FOURIER_VALUE_BIG_STEP} decimals={2}
                                           rejectedHint={t("fourier_coef_issue_value", {value0: FOURIER_VALUE_MIN, value1: FOURIER_VALUE_MAX})}
                                           onChange={next => guardField(this.refusals, () => this.setValue(slot.index, next))}/>)}
                <p className="inspector-help">{t("fourier_coef_handles_help")}</p>
            </div>
            <div className="inspector-group">
                <CountSetter label={t("fourier_coef_k_label")} n={state.K} min={FOURIER_K_MIN} max={FOURIER_K_MAX}
                             rejectedHint={t("fourier_coef_issue_k", {value0: FOURIER_K_MIN, value1: FOURIER_K_MAX})}
                             onPlus={() => this.guarded(() => this.setK(this.model.K + 1))}
                             onMinus={() => this.guarded(() => this.setK(this.model.K - 1))}
                             onSet={next => guardField(this.refusals, () => this.setK(next))}/>
                <ChoiceSelect label={t("fourier_coef_term_label")} value={state.selected.term}
                              options={FOURIER_COEFFICIENT_TERMS.map(id => ({value: id, text: id === "a" ? t("fourier_coef_term_a") : t("fourier_coef_term_b")}))}
                              onChange={next => this.guarded(() => this.setTerm(next))}/>
                <Slider customText={t("fourier_coef_harmonic_label")} value={state.selected.k} min={0} max={state.K} step={1}
                        rejectedHint={t("fourier_coef_issue_harmonic", {value0: 0, value1: state.K})}
                        onChange={next => guardField(this.refusals, () => this.setHarmonic(next))}/>
                <p className="inspector-help">{t("fourier_coef_harmonic_help", {value0: formatNumber(state.K, language, 0)})}</p>
                <OnOffSwitch checked={state.overlay} label={t("fourier_coef_overlay_label")} onChange={next => this.guarded(() => this.setOverlay(next))}/>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        if (this.model.view === "decay") {
            const colors = decayColors();
            return <FunctionLegend items={[
                ...this.model.selections.flatMap((id, slot) => [
                    {id: `f-${slot}`, color: colors[slot], label: t("fourier_decay_legend_f", {value0: this.exampleName(id)}), kind: "line" as const},
                    {id: `sum-${slot}`, color: colors[slot], label: `${t("fourier_decay_legend_sum")} · ${this.exampleName(id)}`, kind: "dashed-line" as const},
                ]),
            ]}/>;
        }
        return <FunctionLegend items={[
            {id: "f", color: FOURIER_COLORS.function, label: t("fourier_coef_legend_f"), kind: "line"},
            {id: "harmonic", color: FOURIER_COLORS.harmonic, label: t("fourier_coef_legend_harmonic"), kind: "dotted-line"},
            {id: "positive", color: FOURIER_COLORS.positive, label: t("fourier_coef_legend_positive"), kind: "area"},
            {id: "negative", color: FOURIER_COLORS.negative, label: t("fourier_coef_legend_negative"), kind: "area"},
            {id: "sum", color: FOURIER_COLORS.sum, label: t("fourier_coef_legend_sum"), kind: "dashed-line"},
            {id: "midpoint", color: FOURIER_COLORS.sum, label: t("fourier_coef_legend_midpoint"), kind: "ring"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        if (model.view === "decay") return this.renderDecayReadout(model);
        const view = this.viewOf(model);
        /** For a_0 the readout gives the constant term a_0/2, as the spectrum does; the board caption keeps a_0 = area / pi. */
        const constant = model.selected.term === "a" && model.selected.k === 0;
        const rows = [
            {id: "order", label: t("fourier_coef_k_label"), value: String(model.K)},
            constant
                ? {id: "selected", label: t("fourier_coef_readout_constant"), value: this.number(view.selectedValue / 2, 5)}
                : {id: "selected", label: t("fourier_coef_readout_selected", {value0: this.coefficientName(model)}), value: this.number(view.selectedValue, 5)},
            {id: "square-integral", label: t("fourier_coef_readout_square_integral"), value: this.number(view.squareIntegral, 5)},
            {id: "parseval", label: t("fourier_coef_readout_parseval"), value: this.number(view.parseval, 5)},
            {id: "seam", label: t("fourier_coef_readout_seam"), value: this.number(view.seamMidpoint, 5)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("fourier_coef_note")}/>
            <div className="inspector-group">
                <FourierSpectrumBars coefficients={view.coefficients} K={model.K} selected={model.selected}/>
            </div>
        </>;
    }

    private renderDecayReadout(model: FourierCoefficientsModel): React.ReactNode {
        const rows = [
            {id: "n", label: t("fourier_decay_n_label"), value: String(model.n)},
            ...model.selections.map((id, slot) => ({
                id: `sup-${slot + 1}`, label: t("fourier_decay_readout_sup", {value0: this.exampleName(id)}), value: this.number(fourierSupError(id, model.n), 5),
            })),
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={[t("fourier_decay_sup_help"), t("fourier_decay_note"), t("fourier_decay_note_uniform")]}/>
            <div className="inspector-group">
                <FourierDecaySpectra selections={model.selections} N={model.n} scale={model.scale} colors={decayColors()} exampleName={id => this.exampleName(id)}/>
            </div>
        </>;
    }
}

export default FourierCoefficientsGraph;
