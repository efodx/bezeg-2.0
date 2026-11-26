import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import type {GraphDeclaration, LegendEntry, StatusLine} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned} from "../base/controls/PuckOwnership";
import {guard, guardField} from "../base/controls/guard";
import {FunctionStatus} from "./FunctionStatus";
import {currentLanguage, message, messageNumber, renderMessage, t} from "../../localization";
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

/** The ids of the declaration: the number of harmonics (an arbiter key, flipped while the sum is watched), the rows, the legend. */
export type FourierSeriesIds = {
    param: "fourier-n";
    row: "n" | "order" | "terms" | "x" | "epsilon" | "sum" | "target" | "error" | "jump-left" | "jump-right" | "peak-x" | "peak-value" | "overshoot" | "overshoot-limit";
    note: "about";
    legend: "sum" | "target" | "jump" | "band" | "error" | "peak" | "window";
    section: never; action: never;
};

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
    /** The drawn objects the legend entries name (`drawnObject`); cleared with the scene. */
    private drawn: Partial<Record<FourierSeriesIds["legend"], unknown>> = {};

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
        this.boardView.setIntent(BOARD_VIEWS[next.example], {keepAspectRatio: false});
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
        this.boardView.setIntent(fourierZoomWindow(this.model.example, this.model.n), {keepAspectRatio: false});
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
        this.drawn = {};
        for (let i = 0; i < MAX_PIECES; i++) {
            const piece = () => view().pieces[i];
            const shown = () => piece() !== undefined;
            const band = this.own(board.create("curve", [[], []], {
                fillColor: GraphPalette.additionalCurves[0], fillOpacity: 0.22, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true, visible: shown,
            })) as unknown as FillCurve;
            if (i === 0) this.drawn.band = band;
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
            const target = this.own(board.create("segment", [[() => piece()?.x0 ?? 0, () => piece()?.y0 ?? 0], [() => piece()?.x1 ?? 0, () => piece()?.y1 ?? 0]], {
                strokeColor: GraphPalette.comparisonCurve, dash: TARGET_DASH, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: shown,
            }));
            if (i === 0) this.drawn.target = target;
        }

        const zoomWindow = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.label, dash: WINDOW_DASH, strokeWidth: thin, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        this.drawn.window = zoomWindow;
        zoomWindow.updateDataArray = () => {
            const [left, top, right, bottom] = fourierZoomWindow(model().example, model().n);
            zoomWindow.dataX = [left, right, right, left, left];
            zoomWindow.dataY = [top, top, bottom, bottom, top];
        };

        const curve = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        this.drawn.sum = curve;
        curve.updateDataArray = () => {
            const data = this.samplesOf(model());
            curve.dataX = data.x;
            curve.dataY = data.y;
        };

        this.drawn.error = this.own(board.create("segment", [[() => model().x, () => view().target], [() => model().x, () => view().sum]], {
            strokeColor: GraphPalette.warningText, strokeWidth: () => Math.max(2.5, this.displaySettings.strokeWidth * 1.4), highlight: false, fixed: true,
            withLabel: false, visible: () => view().error > 0,
        }));

        // The jump: the one-sided limits as open circles and the midpoint, where every S_N passes, as a filled point.
        for (const side of ["left", "right"] as const) {
            const ring = marker(() => view().jump.x, () => view().jump[side], {
                face: "o", fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface, strokeColor: GraphPalette.comparisonCurve,
                strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
            });
            if (side === "left") this.drawn.jump = ring;
        }
        marker(() => view().jump.x, () => view().jump.midpoint, {
            fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        });
        // The Gibbs peak: a cross at the closed-form abscissa.
        this.drawn.peak = marker(() => view().peak.x, () => view().peak.value, {
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
        this.drawn = {};
    }

    /** Runs an inspector change: a refusal is kept as the visible notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const language = currentLanguage();
        const nHelp = state.example === "square" && state.n % 2 === 0 ? t("fourier_n_help_even", {value0: state.n, value1: state.n - 1}) : t("fourier_n_help", {value0: FOURIER_N_MIN, value1: FOURIER_N_MAX});
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("fourier_example_label")} value={state.example} help={t("fourier_example_help")}
                              options={FOURIER_SERIES_EXAMPLE_IDS.map(id => ({value: id, text: id === "square" ? t("fourier_example_square") : t("fourier_example_sawtooth")}))}
                              onChange={next => this.guarded(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <PuckOwned param="fourier-n"><CountSetter label={t("fourier_n_label")} n={state.n} min={FOURIER_N_MIN} max={FOURIER_N_MAX} help={nHelp}
                             rejectedHint={t("fourier_n_rejected_hint", {value0: FOURIER_N_MIN, value1: FOURIER_N_MAX})}
                             onPlus={() => this.guarded(() => this.setN(this.model.n + 1))}
                             onMinus={() => this.guarded(() => this.setN(this.model.n - 1))}
                             onSet={next => guardField(this.refusals, () => this.setN(next))}/></PuckOwned>
            </div>
            <div className="inspector-group">
                <Slider customText={t("fourier_x_label")} value={state.x} min={FOURIER_X_MIN} max={FOURIER_X_MAX} step={FOURIER_X_STEP}
                        rejectedHint={t("fourier_x_rejected_hint", {value0: formatNumber(FOURIER_X_MIN, language), value1: formatNumber(FOURIER_X_MAX, language)})}
                        onChange={next => guardField(this.refusals, () => this.setX(next))}/>
                <Slider customText={t("fourier_epsilon_label")} value={state.epsilon} min={FOURIER_EPSILON_MIN} max={FOURIER_EPSILON_MAX} step={FOURIER_EPSILON_STEP}
                        rejectedHint={t("fourier_epsilon_rejected_hint", {value0: formatNumber(FOURIER_EPSILON_MIN, language), value1: formatNumber(FOURIER_EPSILON_MAX, language)})}
                        onChange={next => guardField(this.refusals, () => this.setEpsilon(next))}/>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        return <>
            <div className={CONTROL_ROW_FILL} role="group" aria-label={t("fourier_actions_label")}>
                <button type="button" data-action="fourier-zoom-peak" onClick={() => this.zoomToPeak()}>{t("fourier_zoom_peak")}</button>
            </div>
            <p className="inspector-help">{t("fourier_zoom_help")}</p>
        </>;
    }

    // ---- Declaration ---------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson name is the key. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {"fourier-n": {read: () => this.model.n, apply: (value: number) => this.setN(value)}};
    }

    /**
     * Pure data from the model. Board: the number of harmonics N (flipped while the sum and the peak are watched). Orodja,
     * undeclared: the example (setup, resets the view), the tolerance epsilon, and the point x (also dragged on the board).
     */
    protected override declaration(): GraphDeclaration {
        const legend: LegendEntry<FourierSeriesIds>[] = [
            {id: "sum", label: message("fourier_series_legend_sum"), kind: "line", object: "sum"},
            {id: "target", label: message("fourier_series_legend_target"), kind: "dashed", object: "target"},
            {id: "jump", label: message("fourier_series_legend_jump"), kind: "ring", object: "jump"},
            {id: "band", label: message("fourier_series_legend_band"), kind: "area", object: "band"},
            {id: "error", label: message("fourier_series_legend_error"), kind: "line", object: "error"},
            {id: "peak", label: message("fourier_series_legend_peak"), kind: "cross", object: "peak"},
            {id: "window", label: message("fourier_series_legend_window"), kind: "dashed", object: "window"},
        ];
        return {
            ...this.commonDeclaration(),
            parameters: [{
                key: "fourier-n", kind: "count", label: message("fourier_series_n_name"), symbol: "N", help: message("fourier_series_n_help"), placement: "board",
                min: FOURIER_N_MIN, max: FOURIER_N_MAX,
            }],
            legend,
        };
    }

    /** The rows, the note, the statuses and the marks of the inspector as declared data (`renderReadout` draws them from it). */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const formatted = (text: string) => ({kind: "formatted" as const, text});
        return {
            rows: [
                {id: "n", name: message("fourier_n_label"), value: messageNumber(model.n, 0)},
                {id: "order", name: message("fourier_readout_order"), value: messageNumber(view.order, 0)},
                {id: "terms", name: message("fourier_readout_terms"), value: message("fourier_series_terms_value", {value0: fourierTermsText(fourierTermList(model.example, model.n))})},
                {id: "x", name: message("fourier_x_label"), value: messageNumber(model.x, 4)},
                {id: "epsilon", name: message("fourier_epsilon_label"), value: messageNumber(model.epsilon, 2)},
                {id: "sum", name: message("fourier_readout_sum"), value: messageNumber(view.sum, 5)},
                {id: "target", name: message("fourier_readout_target"), value: messageNumber(view.target, 4)},
                {id: "error", name: message("fourier_readout_error"), value: formatted(this.small(view.error))},
                {id: "jump-left", name: message("fourier_readout_jump_left"), value: messageNumber(view.jump.left, 4)},
                {id: "jump-right", name: message("fourier_readout_jump_right"), value: messageNumber(view.jump.right, 4)},
                {id: "peak-x", name: message("fourier_readout_peak_x"), value: messageNumber(view.peak.x, 5)},
                {id: "peak-value", name: message("fourier_readout_peak_value"), value: messageNumber(view.peak.value, 5)},
                {id: "overshoot", name: message("fourier_readout_overshoot"), value: formatted(this.overshootText(view))},
                {id: "overshoot-limit", name: message("fourier_readout_overshoot_limit"), value: formatted(this.percent(view.limitOvershoot))},
            ],
            notes: [{id: "about", text: message("fourier_note")}],
            status: this.statuses(model, view),
            // The learner compares f with the partial sum: both stay in view.
            plotted: [(x: number) => fourierTarget(model.example, x), (x: number) => fourierPartialSum(model.example, model.n, x)],
        };
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = this.drawn[id as FourierSeriesIds["legend"]];
        if (typeof element !== "object" || element === null || Array.isArray(element)) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp(id === "band" ? "fillcolor" : "strokecolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    /** A declared legend replaces the panel's own, so Orodja shows no second one. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: FourierSeriesModel, view: View): StatusLine[] {
        const result: StatusLine[] = [];
        if (model.example === "square" && model.n % 2 === 0) {
            result.push({id: "even-square", text: message("fourier_status_even_square", {value0: model.n, value1: view.order})});
        }
        if (view.onJump) result.push({id: "jump", text: message("fourier_status_jump")});
        result.push({id: "gibbs", text: message("fourier_status_gibbs", {value0: this.percent(view.limitOvershoot)})});
        if (view.peak.value - view.jump.high > model.epsilon) {
            result.push({id: "outside-band", text: message("fourier_status_outside_band", {value0: this.number(model.epsilon)})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const lines = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="demo-status" lines={lines.map(line => ({id: line.id, text: renderMessage(line.text)}))} dataAttribute="fourier-status"/>
        </>;
    }
}

export default FourierSeriesGraph;
