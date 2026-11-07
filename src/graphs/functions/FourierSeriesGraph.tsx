import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, formatSignificant, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {
    changeFourierEpsilon, changeFourierN, chooseFourierSeriesExample, DEFAULT_FOURIER_SERIES_MODEL, effectiveOrder, FOURIER_EPSILON_MAX, FOURIER_EPSILON_MIN,
    FOURIER_EPSILON_STEP, FOURIER_N_MAX, FOURIER_N_MIN, FOURIER_SERIES_EXAMPLE_IDS, FOURIER_X_MAX, FOURIER_X_MIN, FOURIER_X_STEP, fourierGibbsPeak, FourierJump,
    fourierJump, fourierLimitOvershoot, fourierPartialSum, FourierPeak, FourierPiece, fourierPieces, FourierSamples, fourierSamples, FourierSeriesEdit,
    FourierSeriesExampleId, FourierSeriesModel, fourierTarget, fourierZoomWindow, isFourierJumpPoint, moveFourierX,
    fourierTermList,
} from "../../analysis/fourierSeriesModel";
import {fourierSeriesEditMessage, fourierTermsText} from "./fourierSeriesMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** The most linear pieces of f on the drawn domain (the square wave has four, the sawtooth three). */
const MAX_PIECES = 4;

/** Dash styles (JSXGraph numbering): f is dashed, the band edges medium-dashed, the zoom window dotted; the sum is solid. */
const TARGET_DASH = 3;
const EDGE_DASH = 2;
const WINDOW_DASH = 1;

/** The default views (left, top, right, bottom): two periods, with room above for the caption. */
const BOARD_VIEWS: Readonly<Record<FourierSeriesExampleId, BoundingBox>> = {
    square: [-7.2, 3.6, 7.2, -2],
    sawtooth: [-7.2, 7.4, 7.2, -4.4],
};

/** The formulas as they are written on the board. */
const EXAMPLE_FORMULA: Readonly<Record<FourierSeriesExampleId, string>> = {
    square: "f(x) = sgn x, x ∈ (−π, π)",
    sawtooth: "f(x) = x, x ∈ (−π, π)",
};

type StatusKind = "even-square" | "jump" | "gibbs" | "outside-band";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    order: number;
    sum: number;
    target: number;
    error: number;
    jump: FourierJump;
    peak: FourierPeak;
    limitOvershoot: number;
    onJump: boolean;
    pieces: readonly FourierPiece[];
}

/**
 * Fourier partial sums S_N of a square wave or a sawtooth wave (lessons F1 and F3). The model is `{example, n, x, epsilon}`
 * (`src/analysis/fourierSeriesModel`): S_N, f, the error |f - S_N| at x, the jump, the Gibbs peak and the sampled curve are all
 * recomputed from it and never stored. The peak marker sits at the closed-form abscissa pi/(N+1) (not at a sampled maximum); the
 * curve is sampled with at least 8 points per period of its highest harmonic and contains the peak abscissa.
 *
 * Rules (reject, never clamp or round): N is an integer in 1..1001 (for the square wave an even N draws the same sum as N - 1), x a
 * multiple of 0.01 in [-6.28, 6.28] and epsilon a multiple of 0.01 in [0.01, 1]. A setter that would break a rule throws a
 * `DomainError` and leaves the model unchanged. Number fields, buttons and drags use the same setters.
 *
 * The zoom window follows the peak: Zoom to the peak sets the view to a window around the Gibbs peak, and while the view is that
 * window a change of N moves the view to the new window. The view is not part of the model.
 */
export class FourierSeriesGraph extends BaseFunctionGraph<FourierSeriesModel> {
    private pointX?: JXG.Point;
    // Not the base `modelCache`: it keys on the model object and would sample again on every x or epsilon drag; this keys on (example, n).
    /** The sampled curve for the (example, n) it was computed for, so a drag of x or epsilon does not sample again. */
    private sampled?: { example: FourierSeriesExampleId; n: number; data: FourierSamples };

    override presetCollection() {
        return functionPresetCollections["fourier-series"];
    }

    protected defaultModel(): FourierSeriesModel {
        return {...DEFAULT_FOURIER_SERIES_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: [...BOARD_VIEWS[this.model.example]] as BoundingBox};
    }

    /** The window around the peak is far narrower than tall, so the stored view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    private viewOf(model: FourierSeriesModel): View {
        return this.memoView(model, () => {
            const sum = fourierPartialSum(model.example, model.n, model.x);
            const target = fourierTarget(model.example, model.x);
            return {
                order: effectiveOrder(model.example, model.n),
                sum,
                target,
                error: Math.abs(target - sum),
                jump: fourierJump(model.example),
                peak: fourierGibbsPeak(model.example, model.n),
                limitOvershoot: fourierLimitOvershoot(),
                onJump: isFourierJumpPoint(model.example, model.x),
                pieces: fourierPieces(model.example),
            };
        });
    }

    private samplesOf(model: FourierSeriesModel): FourierSamples {
        if (this.sampled?.example !== model.example || this.sampled.n !== model.n) {
            this.sampled = {example: model.example, n: model.n, data: fourierSamples(model.example, model.n)};
        }
        return this.sampled.data;
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    /** The model of an accepted edit; a refused edit throws a `DomainError` whose reason is the localized rule the model named. */
    private accepted(edit: FourierSeriesEdit): FourierSeriesModel {
        if (!edit.ok) throw new DomainError(fourierSeriesEditMessage(edit.issue));
        return edit.model;
    }

    /** True while the board shows the zoom window of `model`. */
    private zoomedOn(model: FourierSeriesModel): boolean {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const [wl, wt, wr, wb] = fourierZoomWindow(model.example, model.n);
        const near = (a: number, b: number, extent: number) => Math.abs(a - b) <= 1e-6 * extent;
        return near(left, wl, wr - wl) && near(right, wr, wr - wl) && near(top, wt, wt - wb) && near(bottom, wb, wt - wb);
    }

    protected setExample(value: unknown): void {
        const next = this.accepted(chooseFourierSeriesExample(this.model, value));
        if (next === this.model) return;
        this.commitModel(next);
        this.board.setBoundingBox([...BOARD_VIEWS[next.example]], false);
    }

    /** A change of N keeps the zoom window on the peak if the board was showing it. */
    protected setN(value: number): void {
        const next = this.accepted(changeFourierN(this.model, value));
        if (next === this.model) return;
        const zoomed = this.zoomedOn(this.model);
        this.commitModel(next);
        if (zoomed) this.zoomToPeak();
    }

    protected setX(value: number, options: { syncScene?: boolean } = {}): void {
        const next = this.accepted(moveFourierX(this.model, value));
        if (next !== this.model) this.commitModel(next, options);
    }

    protected setEpsilon(value: number): void {
        const next = this.accepted(changeFourierEpsilon(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"fourier-n": value => this.setN(value), "fourier-x": value => this.setX(value), "fourier-epsilon": value => this.setEpsilon(value)},
            choices: {"fourier-example": value => this.setExample(value)},
        };
    }

    protected zoomToPeak(): void {
        this.board.setBoundingBox(fourierZoomWindow(this.model.example, this.model.n), false);
        this.boardUpdate();
    }

    protected showWholeView(): void {
        this.board.setBoundingBox([...BOARD_VIEWS[this.model.example]], false);
        this.boardUpdate();
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), 4);
    }

    /** Sums and peak values with five decimals, as the lessons quote them (1,18130). */
    private precise(value: number): string {
        return formatNumber(value, currentLanguage(), 5);
    }

    /** An error with significant digits; floating-point noise shows as 0. */
    private small(value: number): string {
        return formatSignificant(value, currentLanguage(), 5);
    }

    private percent(fraction: number): string {
        return `${formatNumber(fraction * 100, currentLanguage(), 2)} %`;
    }

    private overshootText(view: View): string {
        return view.peak.overshoot === undefined ? NOT_A_NUMBER_TEXT : this.percent(view.peak.overshoot);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const marker = (x: () => number, y: () => number, attributes: object) => this.own(board.create("point", [x, y], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: markerSize, ...attributes,
        }));

        // Layers, lowest first: the band and its edges, f, the zoom window, S_N, the error, the markers, the point.
        for (let i = 0; i < MAX_PIECES; i++) {
            const piece = () => view().pieces[i];
            const shown = () => piece() !== undefined;
            const band = this.own(board.create("curve", [[], []], {
                fillColor: GraphPalette.additionalCurves[0], fillOpacity: 0.22, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true, visible: shown,
            })) as unknown as FillCurve;
            band.updateDataArray = () => {
                const p = piece();
                const e = model().epsilon;
                band.dataX = p ? [p.x0, p.x1, p.x1, p.x0, p.x0] : [];
                band.dataY = p ? [p.y0 - e, p.y1 - e, p.y1 + e, p.y0 + e, p.y0 - e] : [];
            };
            for (const sign of [-1, 1]) {
                this.own(board.create("segment", [
                    [() => piece()?.x0 ?? 0, () => (piece()?.y0 ?? 0) + sign * model().epsilon], [() => piece()?.x1 ?? 0, () => (piece()?.y1 ?? 0) + sign * model().epsilon],
                ], {strokeColor: GraphPalette.additionalCurves[0], dash: EDGE_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false, visible: shown}));
            }
            this.own(board.create("segment", [[() => piece()?.x0 ?? 0, () => piece()?.y0 ?? 0], [() => piece()?.x1 ?? 0, () => piece()?.y1 ?? 0]], {
                strokeColor: GraphPalette.comparisonCurve, dash: TARGET_DASH, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: shown,
            }));
        }

        const zoomWindow = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.label, dash: WINDOW_DASH, strokeWidth: thin, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        zoomWindow.updateDataArray = () => {
            const [left, top, right, bottom] = fourierZoomWindow(model().example, model().n);
            zoomWindow.dataX = [left, right, right, left, left];
            zoomWindow.dataY = [top, top, bottom, bottom, top];
        };

        const curve = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        curve.updateDataArray = () => {
            const data = this.samplesOf(model());
            curve.dataX = data.x;
            curve.dataY = data.y;
        };

        this.own(board.create("segment", [[() => model().x, () => view().target], [() => model().x, () => view().sum]], {
            strokeColor: GraphPalette.warningText, strokeWidth: () => Math.max(2.5, this.displaySettings.strokeWidth * 1.4), highlight: false, fixed: true,
            withLabel: false, visible: () => view().error > 0,
        }));

        // The jump: the one-sided limits as open circles and the midpoint, where every S_N passes, as a filled point.
        for (const side of ["left", "right"] as const) {
            marker(() => view().jump.x, () => view().jump[side], {
                face: "o", fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface, strokeColor: GraphPalette.comparisonCurve,
                strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
            });
        }
        marker(() => view().jump.x, () => view().jump.midpoint, {
            fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        });
        // The Gibbs peak: a cross at the closed-form abscissa.
        marker(() => view().peak.x, () => view().peak.value, {
            face: "x", strokeColor: GraphPalette.warningText, highlightStrokeColor: GraphPalette.warningText, size: () => Math.max(5, this.displaySettings.pointSize * 1.2),
            strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
        });
        // The values of S_N and f at the chosen x.
        marker(() => model().x, () => view().sum, {
            fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        });
        marker(() => model().x, () => view().target, {
            fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7), visible: () => view().error > 0,
        });

        this.pointX = this.axisPoint({
            x: model().x, name: "$$x$$", placement: "below-right", color: GraphPalette.warningText, step: FOURIER_X_STEP, min: FOURIER_X_MIN, max: FOURIER_X_MAX,
            write: value => this.setX(value, {syncScene: false}),
        });

        this.caption("top-left", [
            {text: () => t("fourier_board_title", {value0: EXAMPLE_FORMULA[model().example]}), scale: 1.2, math: true},
            {text: () => t("fourier_board_parameters", {value0: model().n, value1: this.number(model().x), value2: this.number(model().epsilon)})},
            {text: () => t("fourier_board_values", {value0: this.precise(view().sum), value1: this.number(view().target), value2: this.small(view().error)}), color: GraphPalette.warningText},
            {text: () => t("fourier_board_peak", {value0: this.precise(view().peak.x), value1: this.precise(view().peak.value), value2: this.overshootText(view())})},
            {text: () => t("fourier_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ], () => board.getBoundingBox()[0] + 0.02 * (board.getBoundingBox()[2] - board.getBoundingBox()[0]));
    }

    protected override syncSceneToModel(): void {
        this.pointX?.moveTo([this.model.x, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointX = undefined;
        this.sampled = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const language = currentLanguage();
        const atMinimum = state.n <= FOURIER_N_MIN;
        const atMaximum = state.n >= FOURIER_N_MAX;
        const nHelp = atMinimum ? t("fourier_n_limit_min", {value0: FOURIER_N_MIN})
            : atMaximum ? t("fourier_n_limit_max", {value0: FOURIER_N_MAX})
                : state.example === "square" && state.n % 2 === 0 ? t("fourier_n_help_even", {value0: state.n, value1: state.n - 1}) : t("fourier_n_help", {value0: FOURIER_N_MIN, value1: FOURIER_N_MAX});
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("fourier_example_label")} value={state.example} help={t("fourier_example_help")}
                              options={FOURIER_SERIES_EXAMPLE_IDS.map(id => ({value: id, text: id === "square" ? t("fourier_example_square") : t("fourier_example_sawtooth")}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <div className="count-setter">
                    <div className="count-setter-label">{t("fourier_n_label")}</div>
                    {/* aria-disabled, not disabled: a focused button that becomes unavailable at the end of the range must not drop keyboard focus. */}
                    <div className="count-setter-controls">
                        <button type="button" className="count-setter-button" data-action="n-decrease" aria-disabled={atMinimum} aria-describedby="fourier-n-help"
                                aria-label={t("fourier_n_decrease")} onClick={() => { if (!atMinimum) this.ignoreOutOfDomain(() => this.setN(this.model.n - 1)); }}>−</button>
                        <NumberInput label={t("fourier_n_label")} hideLabel compact integer value={state.n} min={FOURIER_N_MIN} max={FOURIER_N_MAX} step={1} decimals={0}
                                     rejectedHint={t("fourier_n_rejected_hint", {value0: FOURIER_N_MIN, value1: FOURIER_N_MAX})}
                                     onChange={next => this.ignoreOutOfDomain(() => this.setN(next))}/>
                        <button type="button" className="count-setter-button" data-action="n-increase" aria-disabled={atMaximum} aria-describedby="fourier-n-help"
                                aria-label={t("fourier_n_increase")} onClick={() => { if (!atMaximum) this.ignoreOutOfDomain(() => this.setN(this.model.n + 1)); }}>+</button>
                    </div>
                </div>
                <p id="fourier-n-help" className="inspector-help">{nHelp}</p>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("fourier_x_label")} value={state.x} min={FOURIER_X_MIN} max={FOURIER_X_MAX} step={FOURIER_X_STEP} decimals={2}
                             rejectedHint={t("fourier_x_rejected_hint", {value0: formatNumber(FOURIER_X_MIN, language), value1: formatNumber(FOURIER_X_MAX, language)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setX(next))}/>
                <NumberInput label={t("fourier_epsilon_label")} value={state.epsilon} min={FOURIER_EPSILON_MIN} max={FOURIER_EPSILON_MAX} step={FOURIER_EPSILON_STEP} decimals={2}
                             rejectedHint={t("fourier_epsilon_rejected_hint", {value0: formatNumber(FOURIER_EPSILON_MIN, language), value1: formatNumber(FOURIER_EPSILON_MAX, language)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setEpsilon(next))}/>
                <p className="inspector-help">{t("fourier_fields_help")}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        return <>
            <div className="demo-actions" role="group" aria-label={t("fourier_actions_label")}>
                <button type="button" data-action="fourier-zoom-peak" onClick={() => this.zoomToPeak()}>{t("fourier_zoom_peak")}</button>
                <button type="button" data-action="fourier-zoom-full" onClick={() => this.showWholeView()}>{t("fourier_zoom_full")}</button>
            </div>
            <p className="inspector-help">{t("fourier_zoom_help")}</p>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "sum", color: GraphPalette.primaryCurve, label: t("fourier_legend_sum"), kind: "line"},
            {id: "target", color: GraphPalette.comparisonCurve, label: t("fourier_legend_target"), kind: "dashed-line"},
            {id: "jump", color: GraphPalette.comparisonCurve, label: t("fourier_legend_jump"), kind: "ring"},
            {id: "band", color: GraphPalette.additionalCurves[0], label: t("fourier_legend_band"), kind: "area"},
            {id: "error", color: GraphPalette.warningText, label: t("fourier_legend_error"), kind: "line"},
            {id: "peak", color: GraphPalette.warningText, label: t("fourier_legend_peak"), kind: "cross"},
            {id: "window", color: GraphPalette.label, label: t("fourier_legend_window"), kind: "dotted-line"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: FourierSeriesModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (model.example === "square" && model.n % 2 === 0) {
            result.push({id: "even-square", text: t("fourier_status_even_square", {value0: model.n, value1: view.order})});
        }
        if (view.onJump) result.push({id: "jump", text: t("fourier_status_jump")});
        result.push({id: "gibbs", text: t("fourier_status_gibbs", {value0: this.percent(view.limitOvershoot)})});
        if (view.peak.value - view.jump.high > model.epsilon) {
            result.push({id: "outside-band", text: t("fourier_status_outside_band", {value0: this.number(model.epsilon)})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const rows = [
            {id: "n", label: t("fourier_n_label"), value: String(model.n)},
            {id: "order", label: t("fourier_readout_order"), value: String(view.order)},
            {id: "terms", label: t("fourier_readout_terms"), value: fourierTermsText(fourierTermList(model.example, model.n))},
            {id: "x", label: t("fourier_x_label"), value: this.number(model.x)},
            {id: "epsilon", label: t("fourier_epsilon_label"), value: formatNumber(model.epsilon, currentLanguage(), 2)},
            {id: "sum", label: t("fourier_readout_sum"), value: this.precise(view.sum)},
            {id: "target", label: t("fourier_readout_target"), value: this.number(view.target)},
            {id: "error", label: t("fourier_readout_error"), value: this.small(view.error)},
            {id: "jump-left", label: t("fourier_readout_jump_left"), value: this.number(view.jump.left)},
            {id: "jump-right", label: t("fourier_readout_jump_right"), value: this.number(view.jump.right)},
            {id: "peak-x", label: t("fourier_readout_peak_x"), value: this.precise(view.peak.x)},
            {id: "peak-value", label: t("fourier_readout_peak_value"), value: this.precise(view.peak.value)},
            {id: "overshoot", label: t("fourier_readout_overshoot"), value: this.overshootText(view)},
            {id: "overshoot-limit", label: t("fourier_readout_overshoot_limit"), value: this.percent(view.limitOvershoot)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("fourier_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-fourier-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default FourierSeriesGraph;
