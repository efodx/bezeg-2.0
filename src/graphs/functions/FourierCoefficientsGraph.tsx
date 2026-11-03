import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FourierSpectrumBars} from "./FourierSpectrumBars";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {cleanNumber} from "../../analysis/numbers";
import {
    changeFourierK, chooseFourierLayout, chooseFourierView, DEFAULT_FOURIER_COEFFICIENTS_MODEL, FOURIER_COEFFICIENT_TERMS, FOURIER_COEFFICIENTS_LAYOUTS,
    FOURIER_K_MAX, FOURIER_K_MIN, FOURIER_VALUE_BIG_STEP, FOURIER_VALUE_MAX, FOURIER_VALUE_MIN, FOURIER_VALUE_STEP, FourierCoefficientsEdit,
    FourierCoefficientsLayout, FourierCoefficientsModel, fourierHarmonic, FourierProductPolygons, fourierPartialSumSamples, fourierProductPolygons,
    fourierProjection, FourierProjection, fourierSlots, FourierSlot, selectFourierCoefficient, setFourierOverlay, setFourierValue, snapFourierValue,
} from "../../analysis/fourierCoefficientsModel";
import {fourierCoefficientsIssueMessage} from "./fourierCoefficientsMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** The most handle values of any layout (the free layout), and the most linear pieces of f. */
const MAX_SLOTS = 5;
const MAX_PIECES = 4;
const BOARD_VIEW: BoundingBox = [-4.4, 6.4, 4.4, -4.6];
const HARMONIC_DASH = 1;
const SUM_DASH = 3;

/** The names of x at the breakpoints, language-neutral. */
const X_TEXT: ReadonlyArray<readonly [number, string]> = [[-Math.PI, "−π"], [-Math.PI / 2, "−π/2"], [0, "0"], [1, "1"], [Math.PI / 2, "π/2"], [Math.PI, "π"]];
const xText = (x: number) => X_TEXT.find(([value]) => Math.abs(value - x) < 1e-9)?.[1] ?? String(x);

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View extends FourierProjection {
    product: FourierProductPolygons;
    sum: { x: number[]; y: number[] };
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
            };
        });
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

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

    protected override lessonFunctionActions(): FunctionLessonActions {
        const handle = (index: number) => (value: number) => this.setValue(index, value);
        return {
            parameters: {
                "fourier-handle-0": handle(0), "fourier-handle-1": handle(1), "fourier-handle-2": handle(2), "fourier-handle-3": handle(3),
                "fourier-handle-4": handle(4), "fourier-order": value => this.setK(value), "fourier-harmonic": value => this.setHarmonic(value),
            },
            visibility: {"fourier-partial-sum": visible => this.setOverlay(visible)},
            choices: {
                "fourier-view": value => this.setView(value), "fourier-layout": value => this.setLayout(value), "fourier-term": value => this.setTerm(value),
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
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const slots = () => fourierSlots(this.model.layout);
        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const fill = (color: string, data: () => { x: number[]; y: number[] }) => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: color, fillOpacity: 0.4, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const polygon = data();
                curve.dataX = polygon.x;
                curve.dataY = polygon.y;
            };
        };
        const line = (color: string, width: () => number, dash: number, data: () => { x: number[]; y: number[] }, visible: () => boolean = () => true) => {
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
        fill(GraphPalette.additionalCurves[0], () => view().product.positive);
        fill(GraphPalette.additionalCurves[2], () => view().product.negative);
        line(GraphPalette.label, thin, 0, () => view().product.line);
        line(GraphPalette.label, thin, HARMONIC_DASH, () => {
            const {term, k} = model().selected;
            const count = Math.max(64, 16 * k + 1);
            const x = Array.from({length: count + 1}, (_, i) => -Math.PI + (2 * Math.PI * i) / count);
            return {x, y: x.map(xi => fourierHarmonic(term, k, xi))};
        });
        line(GraphPalette.comparisonCurve, strokeWidth, SUM_DASH, () => view().sum, () => model().overlay);
        for (let i = 0; i < MAX_PIECES; i++) {
            const piece = () => view().shape.breakpoints.length - 1 > i ? {
                x0: view().shape.breakpoints[i], y0: view().shape.right[i], x1: view().shape.breakpoints[i + 1], y1: view().shape.left[i + 1],
            } : undefined;
            this.own(board.create("segment", [[() => piece()?.x0 ?? 0, () => piece()?.y0 ?? 0], [() => piece()?.x1 ?? 0, () => piece()?.y1 ?? 0]], {
                strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: () => piece() !== undefined,
            }));
        }

        // The Dirichlet midpoint at the seam and at every interior jump: the value the series converges to there.
        const midpoint = (x: () => number, y: () => number, visible: () => boolean) => this.own(board.create("point", [x, y], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
            fillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve, visible,
        }));
        const jumpAt = (i: number) => () => {
            const shape = view().shape;
            return i < shape.breakpoints.length - 1 && Math.abs(shape.left[i] - shape.right[i]) > 1e-12;
        };
        const seamJumps = () => Math.abs(view().shape.right[0] - view().shape.left[view().shape.breakpoints.length - 1]) > 1e-12;
        midpoint(() => -Math.PI, () => view().seamMidpoint, seamJumps);
        midpoint(() => Math.PI, () => view().seamMidpoint, seamJumps);
        for (let i = 1; i < MAX_SLOTS - 1; i++) {
            midpoint(() => view().shape.breakpoints[i] ?? 0, () => ((view().shape.left[i] ?? 0) + (view().shape.right[i] ?? 0)) / 2, jumpAt(i));
        }

        // The handles: vertical only. A drag snaps to 0.05; a value the model still refuses puts the handle back.
        const handleAt = (slotIndex: () => number | undefined) => {
            const slotNow = () => {
                const index = slotIndex();
                return index === undefined ? undefined : slots()[index];
            };
            const start = slotNow();
            const point = this.own(board.create("point", [start?.x ?? 0, start === undefined ? 0 : this.model.values[start.index]], {
                ...this.styles.point.default, name: "", withLabel: false, size: markerSize, fillColor: GraphPalette.warningText,
                highlightFillColor: GraphPalette.warningText, visible: () => slotNow() !== undefined,
            })) as JXG.Point;
            point.on("drag", () => {
                const slot = slotNow();
                if (!slot) return;
                const snapped = snapFourierValue(point.Y());
                const accepted = this.ignoreOutOfDomain(() => this.setValue(slot.index, snapped, {syncScene: false}));
                point.moveTo([slot.x, accepted ? snapped : this.model.values[slot.index]]);
            });
            return point;
        };
        this.handles = Array.from({length: MAX_SLOTS}, (_, j) => handleAt(() => (j < slots().length ? j : undefined)));
        // Without a seam jump the seam value is shared, so the same handle is also offered at +pi.
        this.seamMirror = handleAt(() => (slots()[0].side === "value" ? 0 : undefined));
        this.seamMirror.moveTo([Math.PI, this.model.values[0]]);

        this.caption("top-left", [
            {text: () => t("fourier_coef_board_title", {value0: this.harmonicName(model())}), scale: 1.1},
            {text: () => t("fourier_coef_board_coefficient", {value0: this.coefficientName(model()), value1: this.number(view().selectedValue, 5)}), color: GraphPalette.warningText},
            {text: () => t("fourier_coef_board_sums", {value0: this.number(view().squareIntegral, 5), value1: this.number(view().parseval, 5)})},
            {text: () => t("fourier_coef_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
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

    /** Shift + arrow steps a value by 0.5 (the field itself steps by 0.05); the field's own handler is not run for it. */
    private bigStep(index: number): (event: React.KeyboardEvent) => void {
        return event => {
            if (!event.shiftKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
            event.preventDefault();
            event.stopPropagation();
            const next = cleanNumber(this.model.values[index] + (event.key === "ArrowUp" ? 1 : -1) * FOURIER_VALUE_BIG_STEP);
            this.ignoreOutOfDomain(() => this.setValue(index, Math.min(FOURIER_VALUE_MAX, Math.max(FOURIER_VALUE_MIN, next))));
        };
    }

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const language = currentLanguage();
        const slots = fourierSlots(state.layout);
        const layoutText: Record<FourierCoefficientsLayout, string> = {
            abs: t("fourier_coef_layout_abs"), jump: t("fourier_coef_layout_jump"), free: t("fourier_coef_layout_free"),
        };
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("fourier_coef_layout_label")} value={state.layout} help={t("fourier_coef_layout_help")}
                              options={FOURIER_COEFFICIENTS_LAYOUTS.map(id => ({value: id, text: layoutText[id]}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setLayout(next))}/>
            </div>
            <div className="inspector-group">
                {slots.map(slot => <div key={slot.index} onKeyDownCapture={this.bigStep(slot.index)}>
                    <NumberInput label={this.slotLabel(slot)} value={state.values[slot.index]} min={FOURIER_VALUE_MIN} max={FOURIER_VALUE_MAX} step={FOURIER_VALUE_STEP}
                                 decimals={2} rejectedHint={t("fourier_coef_issue_value", {value0: FOURIER_VALUE_MIN, value1: FOURIER_VALUE_MAX})}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setValue(slot.index, next))}/>
                </div>)}
                <p className="inspector-help">{t("fourier_coef_handles_help")}</p>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("fourier_coef_k_label")} integer value={state.K} min={FOURIER_K_MIN} max={FOURIER_K_MAX} step={1} decimals={0}
                             rejectedHint={t("fourier_coef_issue_k", {value0: FOURIER_K_MIN, value1: FOURIER_K_MAX})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setK(next))}/>
                <ChoiceSelect label={t("fourier_coef_term_label")} value={state.selected.term}
                              options={FOURIER_COEFFICIENT_TERMS.map(id => ({value: id, text: id === "a" ? t("fourier_coef_term_a") : t("fourier_coef_term_b")}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setTerm(next))}/>
                <NumberInput label={t("fourier_coef_harmonic_label")} integer value={state.selected.k} min={0} max={state.K} step={1} decimals={0}
                             rejectedHint={t("fourier_coef_issue_harmonic", {value0: 0, value1: state.K})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setHarmonic(next))}/>
                <p className="inspector-help">{t("fourier_coef_harmonic_help", {value0: formatNumber(state.K, language, 0)})}</p>
                <OnOffSwitch checked={state.overlay} label={t("fourier_coef_overlay_label")} onChange={next => this.ignoreOutOfDomain(() => this.setOverlay(next))}/>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "f", color: GraphPalette.primaryCurve, label: t("fourier_coef_legend_f"), kind: "line"},
            {id: "harmonic", color: GraphPalette.label, label: t("fourier_coef_legend_harmonic"), kind: "dotted-line"},
            {id: "positive", color: GraphPalette.additionalCurves[0], label: t("fourier_coef_legend_positive"), kind: "area"},
            {id: "negative", color: GraphPalette.additionalCurves[2], label: t("fourier_coef_legend_negative"), kind: "area"},
            {id: "sum", color: GraphPalette.comparisonCurve, label: t("fourier_coef_legend_sum"), kind: "dashed-line"},
            {id: "midpoint", color: GraphPalette.comparisonCurve, label: t("fourier_coef_legend_midpoint"), kind: "ring"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
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
}

export default FourierCoefficientsGraph;
