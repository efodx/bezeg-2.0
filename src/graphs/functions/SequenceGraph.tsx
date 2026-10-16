import React from "react";
import {AxisAttributes} from "jsxgraph";
import {COMPACT_BOARD_WIDTH, DomainError, escapeHtml, FillCurve, FunctionLessonActions, LABEL_STYLE} from "./BaseFunctionGraph";
import IterativeFunctionGraph from "./IterativeFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NOT_A_NUMBER_TEXT, NumberLanguage} from "../../analysis/format";
import {
    isSequenceEpsilon, isSequenceExampleId, isSequenceThreshold, isTermInBand, SEQUENCE_EPSILON_MAX, SEQUENCE_EPSILON_MIN, SEQUENCE_EPSILON_SCALE,
    SEQUENCE_EPSILON_STEP, SEQUENCE_EXAMPLE_IDS, SEQUENCE_LIMIT_MAX, SEQUENCE_LIMIT_MIN, SEQUENCE_LIMIT_STEP, SEQUENCE_MAX_STEPS, SEQUENCE_MAX_TERMS, SEQUENCE_THRESHOLD_MAX,
    SEQUENCE_THRESHOLD_MIN, sequenceCertificate, SequenceCertificate, sequenceDistance, sequenceEpsilonFromHundredths, sequenceEpsilonHundredths, sequenceExample, sequenceLimitFromHundredths, sequenceLimitHundredths,
    SequenceExample, SequenceExampleId, sequenceTerm,
} from "../../analysis/sequence";
import {
    canAdvanceSequence, defaultSequenceModel, nextSequenceStep, parseSequenceModel, resetSequenceTerms, SequenceModel,
} from "../../analysis/sequenceModel";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";

/**
 * Time between two playback steps. One term per interval, never more than one per frame, whatever the display refresh rate
 * is (see ADR 0012), so a projector shows the same sequence of steps as a laptop screen.
 */
export const SEQUENCE_STEP_INTERVAL_MS = 500;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Each example has its own view, so the whole index range 1..40 and every term fit. The caption sits in the bottom-right corner,
 * which stays free of terms: the convergent examples end near 0, and the other views leave room below the terms.
 */
const EXAMPLE_VIEWS: Readonly<Record<SequenceExampleId, BoundingBox>> = {
    "reciprocal": [-4.9, 1.5, 43, -1.5],
    "alternating-reciprocal": [-4.9, 1.5, 43, -1.5],
    "alternating-sign": [-4.9, 1.6, 43, -3.4],
    "natural": [-4.9, 54, 43, -36],
};
/**
 * The left margin (about 40 px of a 390 px board) keeps the y tick labels, with their minus signs, inside the board; the y-axis sits
 * at index 0. It stops short of x = -5, so no negative index tick number lands on the y tick labels. The x tick numbers hang lower
 * than the default, below the band of width 2 epsilon.
 */
const X_TICK_DROP_PX = 26;

/** Dash styles (JSXGraph numbering): the band edges are dashed, the threshold marker short-dashed. */
const EDGE_DASH = 2;
const MARKER_DASH = 3;

/** The formulas as they are written on the board and in the example selector. */
const exampleFormula = (id: SequenceExampleId): string => {
    switch (id) {
        case "reciprocal": return "aₙ = 1/n";
        case "alternating-reciprocal": return "aₙ = (−1)ⁿ/n";
        case "alternating-sign": return "aₙ = (−1)ⁿ";
        case "natural": return "aₙ = n";
    }
};

type StatusKind = "hidden" | SequenceCertificate["kind"] | "beyond-terms" | "n-min-beyond-terms" | "complete";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: SequenceExample;
    /** The formula-backed verdict for the chosen N (never derived from the shown terms). */
    certificate: SequenceCertificate;
    /** Whether the term a_n lies strictly inside the band, for n = 1..SEQUENCE_MAX_TERMS (index n - 1). */
    inBand: readonly boolean[];
    /** The shown terms (n <= terms) that lie in the band. */
    insideCount: number;
    lastTerm: number;
    lastDistance: number;
    lastInBand: boolean;
}

/**
 * Sequence convergence through the epsilon-N definition. The model is `{example, epsilon, limit, threshold, terms,
 * certificateVisible}` (`src/analysis/sequenceModel`): `terms` is the number of revealed terms, and the verdict for the chosen N is
 * recomputed from the formula of the named example (`src/analysis/sequence`), never from the shown terms and never stored.
 *
 * Next step and playback run the same transition (one more term) through `commitModel`; playback itself (the
 * `IterationController`) is not model data, so a reopened preset is paused. Editing the example, epsilon, the candidate limit or
 * the threshold stops playback (the example loads its own model, a one-term start with the certificate hidden; the other edits keep
 * the revealed terms and the reveal); so does anything that replaces the scene, exports a figure or unmounts the graph.
 *
 * Rules (reject, never clamp): epsilon is a multiple of 0.01 in [0.01, 2], L is in [-2, 2], N is an integer 1..1000. A setter that
 * would break a rule throws a `DomainError` and leaves the model unchanged. Number fields and lesson actions use the same setters.
 */
export class SequenceGraph extends IterativeFunctionGraph<SequenceModel> {
    override presets(): string {
        return "sequence";
    }

    protected defaultModel(): SequenceModel {
        return defaultSequenceModel("reciprocal");
    }

    protected parseModel(data: unknown): SequenceModel | undefined {
        return parseSequenceModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    /** The index n and the value a_n have different scales (forty indices against values of about one), so the stored view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** The x tick numbers are moved below the band, which the default offset would cross for a small epsilon. */
    protected override defaultAxesAttributes(): { x: AxisAttributes; y: AxisAttributes } {
        const axis = this.styles.axis;
        return {
            x: {...axis.defaultX, ticks: {...axis.defaultX.ticks, label: {...axis.defaultX.ticks?.label, offset: [0, -X_TICK_DROP_PX]}}},
            y: axis.defaultY,
        };
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "sequence";
    }

    protected stepIntervalMs(): number {
        return SEQUENCE_STEP_INTERVAL_MS;
    }

    protected maxIterations(): number {
        return SEQUENCE_MAX_STEPS;
    }

    protected iterationIndex(model: SequenceModel): number {
        return model.terms - 1;
    }

    protected canAdvance(): boolean {
        return canAdvanceSequence(this.model);
    }

    protected cannotAdvanceMessage(): string {
        return `All ${SEQUENCE_MAX_TERMS} terms are already shown.`;
    }

    /** The one mathematical transition of the iteration: Next step and every playback step reveal one more term. */
    protected transition(): IterationOutcome {
        const step = nextSequenceStep(this.model);
        if (!step.advanced) return "complete";
        this.commitModel(step.model);
        return step.outcome;
    }

    /** Back to one revealed term of the same example, epsilon, L and N; playback stops. */
    protected resetIteration(): void {
        this.replaceModel(resetSequenceTerms(this.model));
    }

    // ---- View ----------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: SequenceModel): View {
        return this.memoView(model, () => {
            const example = sequenceExample(model.example);
            const inBand = Array.from({length: SEQUENCE_MAX_TERMS}, (_, index) => isTermInBand(model.example, index + 1, model.limit, model.epsilon));
            return {
                example,
                certificate: sequenceCertificate(model),
                inBand,
                insideCount: inBand.slice(0, model.terms).filter(Boolean).length,
                lastTerm: sequenceTerm(model.example, model.terms),
                lastDistance: sequenceDistance(model.example, model.terms, model.limit),
                lastInBand: inBand[model.terms - 1],
            };
        });
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    protected setExample(value: unknown): void {
        if (!isSequenceExampleId(value)) throw new DomainError(`The example must be one of ${SEQUENCE_EXAMPLE_IDS.join(", ")}.`);
        this.replaceModel(defaultSequenceModel(value));
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...EXAMPLE_VIEWS[value]], this.equalAxisUnits);
    }

    protected setEpsilon(value: number): void {
        const hundredths = sequenceEpsilonHundredths(value);
        if (hundredths === undefined) {
            throw new DomainError(`The band width epsilon must be a multiple of ${SEQUENCE_EPSILON_STEP} between ${SEQUENCE_EPSILON_MIN} and ${SEQUENCE_EPSILON_MAX}.`);
        }
        const next = sequenceEpsilonFromHundredths(hundredths);
        if (next !== this.model.epsilon) this.replaceModel({...this.model, epsilon: next});
    }

    protected setLimit(value: number): void {
        const hundredths = sequenceLimitHundredths(value);
        if (hundredths === undefined) {
            throw new DomainError(`The candidate limit L must be a multiple of ${SEQUENCE_LIMIT_STEP} between ${SEQUENCE_LIMIT_MIN} and ${SEQUENCE_LIMIT_MAX}.`);
        }
        const next = sequenceLimitFromHundredths(hundredths);
        if (next !== this.model.limit) this.replaceModel({...this.model, limit: next});
    }

    protected setThreshold(value: number): void {
        if (!isSequenceThreshold(value)) {
            throw new DomainError(`The threshold N must be an integer between ${SEQUENCE_THRESHOLD_MIN} and ${SEQUENCE_THRESHOLD_MAX}.`);
        }
        if (value !== this.model.threshold) this.replaceModel({...this.model, threshold: value});
    }

    protected setCertificateVisible(visible: boolean): void {
        if (visible !== this.model.certificateVisible) this.commitModel({...this.model, certificateVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "sequence-epsilon": value => this.setEpsilon(value), "sequence-limit": value => this.setLimit(value), "sequence-threshold": value => this.setThreshold(value),
            },
            visibility: {"sequence-certificate": visible => this.setCertificateVisible(visible)},
            choices: {"sequence-example": value => this.setExample(value)},
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), 4);
    }

    private epsilonText(model: SequenceModel): string {
        return formatNumber(model.epsilon, currentLanguage(), 2);
    }

    /** N * epsilon as a decimal (an exact count of hundredths), the quantity the threshold is compared with 1. */
    private productText(model: SequenceModel): string {
        const hundredths = sequenceEpsilonHundredths(model.epsilon) ?? 0;
        return formatNumber((model.threshold * hundredths) / SEQUENCE_EPSILON_SCALE, currentLanguage(), 2);
    }

    private verdictText(model: SequenceModel, view: View): string {
        if (!model.certificateVisible) return t("sequence_hidden");
        switch (view.certificate.kind) {
            case "certified": return t("sequence_verdict_certified");
            case "threshold-fails": return t("sequence_verdict_threshold_fails");
            case "not-the-limit": return t("sequence_verdict_not_the_limit");
            case "oscillating": return t("sequence_verdict_oscillating");
            case "epsilon-satisfied": return t("sequence_verdict_epsilon_satisfied");
            case "divergent": return t("sequence_verdict_divergent");
        }
    }

    /** The one line of the board caption that states the verdict, and its tone: confirmed, refused (no certificate) or neutral (hidden). */
    private boardCertificate(model: SequenceModel, view: View): { text: string; tone: "neutral" | "ok" | "warning" } {
        if (!model.certificateVisible) return {text: t("sequence_board_certificate_hidden"), tone: "neutral"};
        const kind = view.certificate.kind;
        return {
            text: kind === "certified" ? t("sequence_board_certified")
                : kind === "threshold-fails" ? t("sequence_board_threshold_fails")
                    : kind === "not-the-limit" ? t("sequence_board_not_the_limit")
                        : kind === "oscillating" ? t("sequence_board_oscillating")
                            : kind === "epsilon-satisfied" ? t("sequence_board_epsilon_satisfied") : t("sequence_board_divergent"),
            tone: kind === "certified" ? "ok" : "warning",
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const fontSize = this.displayFontSize;
        const compact = () => this.boardWidth() < COMPACT_BOARD_WIDTH;
        const edgeLow = () => model().limit - model().epsilon;
        const edgeHigh = () => model().limit + model().epsilon;
        const left = () => board.getBoundingBox()[0];
        const right = () => board.getBoundingBox()[2];
        const top = () => board.getBoundingBox()[1];
        const bottom = () => board.getBoundingBox()[3];
        const thresholdInView = () => model().threshold >= left() && model().threshold <= right();

        // Layers, lowest first: the band, its dashed edges, the line y = L, the threshold marker, the terms outside the band, the terms inside.
        const band = this.own(board.create("curve", [[], []], {
            fillColor: GraphPalette.additionalCurves[0], fillOpacity: 0.22, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        band.updateDataArray = () => {
            band.dataX = [left(), right(), right(), left(), left()];
            band.dataY = [edgeLow(), edgeLow(), edgeHigh(), edgeHigh(), edgeLow()];
        };
        const edge = (y: () => number) => this.own(board.create("segment", [[left, y], [right, y]], {
            strokeColor: GraphPalette.additionalCurves[0], dash: EDGE_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));
        edge(edgeLow);
        edge(edgeHigh);
        this.own(board.create("segment", [[left, () => model().limit], [right, () => model().limit]], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth, highlight: false, fixed: true, withLabel: false,
        }));
        this.own(board.create("segment", [[() => model().threshold, bottom], [() => model().threshold, top]], {
            strokeColor: GraphPalette.referenceCurve, dash: MARKER_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
            visible: thresholdInView,
        }));

        // One slot per possible term and per kind: a term in the band is a filled circle, one outside it a cross, so the two differ by shape.
        const size = () => Math.max(3, this.displaySettings.pointSize * 0.8);
        const pool = (inside: boolean) => {
            for (let n = 1; n <= SEQUENCE_MAX_TERMS; n++) {
                this.own(board.create("point", [n, () => sequenceTerm(model().example, n)], {
                    ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size, visible: () => n <= model().terms && view().inBand[n - 1] === inside,
                    ...(inside
                        ? {face: "o", fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve}
                        : {face: "x", strokeColor: GraphPalette.warningText, highlightStrokeColor: GraphPalette.warningText, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9)}),
                }));
            }
        };
        pool(false);
        pool(true);

        // The label of the threshold marker sits at the top edge, off the axes; below 520 px it is just N (the caption has the number).
        this.own(board.create("text", [
            () => model().threshold,
            () => top() - 0.03 * (top() - bottom()),
            () => `<div>${escapeHtml(compact() ? "N" : t("sequence_board_threshold", {value0: model().threshold}))}</div>`,
        ], {
            anchorX: "middle", anchorY: "top", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            fontSize: () => Math.max(10, fontSize() * 0.9 * Math.min(1, this.boardWidth() / 700)), cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE, visible: thresholdInView,
        }));

        // The formula, the numbers, the count in the band, the verdict and the key stay on the board (projection needs them).
        this.caption("bottom-right", [
            {text: () => exampleFormula(model().example), scale: 1.2, math: true},
            {text: () => t("sequence_board_parameters", {value0: this.epsilonText(model()), value1: this.number(model().limit), value2: model().threshold})},
            {text: () => t("sequence_board_terms", {value0: model().terms, value1: view().insideCount})},
            {
                text: () => this.boardCertificate(model(), view()).text,
                color: () => ({neutral: GraphPalette.label, ok: GraphPalette.primaryCurve, warning: GraphPalette.warningText})[this.boardCertificate(model(), view()).tone],
            },
            {text: () => t("sequence_board_beyond"), minBoardWidth: COMPACT_BOARD_WIDTH, visible: () => this.beyondTerms(model(), view())},
            {text: () => t("sequence_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    /** True when the revealed certificate is about a threshold that lies beyond the shown terms. */
    private beyondTerms(model: SequenceModel, view: View): boolean {
        const kind = view.certificate.kind;
        return model.certificateVisible && view.certificate.thresholdBeyondTerms && (kind === "certified" || kind === "threshold-fails");
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const language = currentLanguage();
        const playing = this.controller.isPlaying();
        const canAdvance = canAdvanceSequence(state);
        const nextUnavailable = !canAdvance || playing;
        const playUnavailable = !canAdvance && !playing;
        const resetUnavailable = state.terms <= 1 && !playing;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("sequence_example_label")} value={state.example} help={t("sequence_example_help")}
                              options={SEQUENCE_EXAMPLE_IDS.map(id => ({value: id, text: exampleFormula(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("sequence_epsilon_label")} value={state.epsilon} min={SEQUENCE_EPSILON_MIN} max={SEQUENCE_EPSILON_MAX} step={SEQUENCE_EPSILON_STEP} decimals={2}
                             rejectedHint={t("sequence_epsilon_rejected_hint", {value0: formatNumber(SEQUENCE_EPSILON_MIN, language, 2), value1: formatNumber(SEQUENCE_EPSILON_MAX, language, 2)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setEpsilon(next))}/>
                <NumberInput label={t("sequence_limit_label")} value={state.limit} min={SEQUENCE_LIMIT_MIN} max={SEQUENCE_LIMIT_MAX} step={0.1} decimals={2}
                             rejectedHint={t("sequence_limit_rejected_hint", {value0: formatNumber(SEQUENCE_LIMIT_MIN, language), value1: formatNumber(SEQUENCE_LIMIT_MAX, language)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setLimit(next))}/>
                <NumberInput label={t("sequence_threshold_label")} value={state.threshold} min={SEQUENCE_THRESHOLD_MIN} max={SEQUENCE_THRESHOLD_MAX} step={1} decimals={0}
                             rejectedHint={t("sequence_threshold_rejected_hint", {value0: SEQUENCE_THRESHOLD_MIN, value1: SEQUENCE_THRESHOLD_MAX})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setThreshold(next))}/>
                <p className="inspector-help">{t("sequence_fields_help")}</p>
            </div>
            <div className="inspector-group">
                {/* An unavailable control stays focusable (aria-disabled, not disabled): a focused button that becomes
                    unavailable at the last term or when Play starts must not drop keyboard focus to the page body. */}
                <div className="demo-actions" role="group" aria-label={t("sequence_iteration_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.ignoreOutOfDomain(() => this.nextStep()); }}>{t("sequence_next_step")}</button>
                    <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                            onClick={() => { if (!playUnavailable) { if (playing) this.pauseIteration(); else this.play(); } }}>{playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.resetIteration(); }}>{t("sequence_reset")}</button>
                </div>
                <p className="inspector-help">{t("sequence_playback_note", {value0: SEQUENCE_MAX_TERMS})}</p>
            </div>
            <div className="inspector-group">
                <div className="demo-actions" role="group" aria-label={t("sequence_certificate_actions_label")}>
                    <button type="button" data-action="toggle-sequence-certificate" data-revealed={state.certificateVisible}
                            onClick={() => this.setCertificateVisible(!this.model.certificateVisible)}>
                        {state.certificateVisible ? t("sequence_hide_certificate") : t("sequence_show_certificate")}
                    </button>
                </div>
                <p className="inspector-help">{t("sequence_certificate_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "inside", color: GraphPalette.primaryCurve, label: t("sequence_legend_inside"), kind: "dot"},
            {id: "outside", color: GraphPalette.warningText, label: t("sequence_legend_outside"), kind: "cross"},
            {id: "band", color: GraphPalette.additionalCurves[0], label: t("sequence_legend_band"), kind: "area"},
            {id: "limit", color: GraphPalette.comparisonCurve, label: t("sequence_legend_limit"), kind: "line"},
            {id: "threshold", color: GraphPalette.referenceCurve, label: t("sequence_legend_threshold"), kind: "dotted-line"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: SequenceModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        const certificate = view.certificate;
        if (!model.certificateVisible) {
            result.push({id: "hidden", text: t("sequence_status_hidden")});
        } else {
            const epsilon = this.epsilonText(model);
            switch (certificate.kind) {
                case "certified":
                    result.push({id: "certified", text: t("sequence_status_certified", {value0: model.threshold, value1: this.productText(model), value2: certificate.nMin})});
                    break;
                case "threshold-fails":
                    result.push({id: "threshold-fails", text: t("sequence_status_threshold_fails", {value0: model.threshold, value1: this.productText(model), value2: certificate.nMin})});
                    break;
                case "not-the-limit":
                    result.push({id: "not-the-limit", text: t("sequence_status_not_the_limit", {value0: this.number(model.limit), value1: this.number(certificate.actualLimit)})});
                    break;
                case "oscillating":
                    result.push({id: "oscillating", text: t("sequence_status_oscillating", {value0: this.number(certificate.farthestDistance), value1: epsilon})});
                    break;
                case "epsilon-satisfied":
                    result.push({id: "epsilon-satisfied", text: t("sequence_status_epsilon_satisfied", {value0: this.number(1 + Math.abs(model.limit)), value1: epsilon})});
                    break;
                case "divergent":
                    result.push({id: "divergent", text: t("sequence_status_divergent", {value0: certificate.exitIndex})});
                    break;
            }
            if (this.beyondTerms(model, view)) {
                result.push({id: "beyond-terms", text: t("sequence_status_beyond_terms", {value0: model.threshold, value1: model.terms})});
            }
            if ((certificate.kind === "certified" || certificate.kind === "threshold-fails") && certificate.nMinBeyondTerms) {
                result.push({
                    id: "n-min-beyond-terms",
                    text: certificate.nMin > SEQUENCE_MAX_TERMS
                        ? t("sequence_status_n_min_beyond_all", {value0: certificate.nMin, value1: SEQUENCE_MAX_TERMS})
                        : t("sequence_status_n_min_beyond_terms", {value0: certificate.nMin, value1: model.terms, value2: SEQUENCE_MAX_TERMS}),
                });
            }
        }
        if (model.terms >= SEQUENCE_MAX_TERMS) result.push({id: "complete", text: t("sequence_status_complete", {value0: SEQUENCE_MAX_TERMS})});
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const language: NumberLanguage = currentLanguage();
        const view = this.viewOf(model);
        const certificate = view.certificate;
        const shown = model.certificateVisible;
        const hidden = t("sequence_hidden");
        const formula = certificate.kind === "certified" || certificate.kind === "threshold-fails";
        const rows = [
            {id: "terms", label: t("sequence_readout_terms", {value0: SEQUENCE_MAX_TERMS}), value: String(model.terms)},
            {id: "epsilon", label: t("sequence_epsilon_label"), value: this.epsilonText(model)},
            {id: "limit", label: t("sequence_limit_label"), value: this.number(model.limit)},
            {id: "threshold", label: t("sequence_threshold_label"), value: String(model.threshold)},
            {id: "last-term", label: t("sequence_readout_last_term", {value0: model.terms}), value: this.number(view.lastTerm)},
            {id: "distance", label: t("sequence_readout_distance"), value: this.number(view.lastDistance)},
            {id: "in-band", label: t("sequence_readout_in_band"), value: view.lastInBand ? t("sequence_in_band") : t("sequence_out_of_band")},
            {id: "in-band-count", label: t("sequence_readout_in_band_count"), value: t("sequence_count_of", {value0: view.insideCount, value1: model.terms})},
            {id: "certificate", label: t("sequence_readout_certificate"), value: this.verdictText(model, view)},
            {id: "n-min", label: t("sequence_readout_n_min"), value: !shown ? hidden : formula ? String(certificate.nMin) : NOT_A_NUMBER_TEXT},
            {
                id: "bound", label: t("sequence_readout_bound"),
                value: !shown ? hidden : formula ? `1/${model.threshold} = ${formatNumber(1 / model.threshold, language, 4)}` : NOT_A_NUMBER_TEXT,
            },
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("sequence_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-sequence-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default SequenceGraph;
