import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import {AxisAttributes} from "jsxgraph";
import {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, escapeHtml, FillCurve, FunctionLessonActions, FunctionPanel, LABEL_STYLE} from "./BaseFunctionGraph";
import IterativeFunctionGraph, {IterationActionId} from "./IterativeFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import {formatNumber, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {
    isTermInBand, SEQUENCE_EPSILON_MAX, SEQUENCE_EPSILON_MIN, SEQUENCE_EPSILON_SCALE,
    SEQUENCE_EPSILON_STEP, SEQUENCE_EXAMPLE_IDS, SEQUENCE_LIMIT_MAX, SEQUENCE_LIMIT_MIN, SEQUENCE_MAX_TERMS, SEQUENCE_THRESHOLD_MAX,
    SEQUENCE_THRESHOLD_MIN, sequenceCertificate, SequenceCertificate, sequenceDistance, sequenceEpsilonHundredths, sequenceExample, SequenceExample, SequenceExampleId, sequenceTerm,
} from "../../analysis/sequence";
import {
    canAdvanceSequence, chooseSequenceExample, defaultSequenceModel, nextSequenceStep, resetSequenceTerms, SequenceEdit, SequenceModel, setSequenceEpsilon, setSequenceLimit,
    setSequenceThreshold,
} from "../../analysis/sequenceModel";
import {sequenceEditMessage} from "./sequenceMessages";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {RevealButton} from "../../inputs/RevealButton";

/**
 * Time between two playback steps. One term per interval, never more than one per frame, whatever the display refresh rate
 * is (see ADR 0012), so a projector shows the same sequence of steps as a laptop screen.
 */
export const SEQUENCE_STEP_INTERVAL_MS = 500;


/** The x tick numbers hang lower than the default, below the band of width 2 epsilon. The followed view keeps a left margin for the y tick labels. */
const X_TICK_DROP_PX = 26;
/** The followed view counts the shown terms in steps of this many. */
const FOLLOW_TERM_STEP = 5;

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

/**
 * The ids of the sequence declaration: the band width, the candidate limit and the threshold are board pucks, the certificate is a
 * switch puck, the playback actions are the iteration's; the rows are the readouts and the legend names every object the board draws.
 */
export type SequenceIds = {
    param: "sequence-epsilon" | "sequence-limit" | "sequence-threshold";
    row: "terms" | "epsilon" | "limit" | "threshold" | "last-term" | "distance" | "in-band" | "in-band-count" | "certificate" | "n-min" | "bound"; note: "edge";
    legend: "inside" | "outside" | "band" | "limit" | "threshold"; section: never;
    action: IterationActionId | "show-certificate";
};

type StatusKind ="hidden" | SequenceCertificate["kind"] | "beyond-terms" | "n-min-beyond-terms" | "complete";

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
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`); cleared when the scene is rebuilt. */
    private readonly drawn = new Map<string, JXG.GeometryElement[]>();

    override presetCollection() {
        return functionPresetCollections.sequence;
    }

    protected defaultModel(): SequenceModel {
        return defaultSequenceModel("reciprocal");
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...this.followBox(this.model)];
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
        return {key: this.model.example, box: this.followBox(this.model)};
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "sequence";
    }

    protected stepIntervalMs(): number {
        return SEQUENCE_STEP_INTERVAL_MS;
    }

    protected iterationIndex(model: SequenceModel): number {
        return model.terms - 1;
    }

    protected canAdvance(): boolean {
        return canAdvanceSequence(this.model);
    }

    protected cannotAdvanceMessage(): Message {
        return message("sequence_all_terms_shown", {value0: SEQUENCE_MAX_TERMS});
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

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setExample(value: unknown): void {
        const choice = chooseSequenceExample(value);
        if (!choice.ok) throw new DomainError(sequenceEditMessage(choice.issue));
        this.replaceModel(choice.model);
        if (this.generatedObjectCount > 0) this.boardView.setIntent(this.followBox(choice.model), {keepAspectRatio: this.equalAxisUnits});
    }

    protected setEpsilon(value: number): void { this.applyEdit(setSequenceEpsilon(this.model, value)); }

    protected setLimit(value: number): void { this.applyEdit(setSequenceLimit(this.model, value)); }

    protected setThreshold(value: number): void { this.applyEdit(setSequenceThreshold(this.model, value)); }

    /** The model module decides (grid, range, normalization); a refusal becomes a localized `DomainError`, no change commits nothing. */
    private applyEdit(edit: SequenceEdit): void {
        if (!edit.ok) throw new DomainError(sequenceEditMessage(edit.issue));
        if (edit.model !== this.model) this.replaceModel(edit.model);
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

    private verdictMessage(model: SequenceModel, view: View): Message {
        if (!model.certificateVisible) return message("sequence_hidden");
        switch (view.certificate.kind) {
            case "certified": return message("sequence_verdict_certified");
            case "threshold-fails": return message("sequence_verdict_threshold_fails");
            case "not-the-limit": return message("sequence_verdict_not_the_limit");
            case "oscillating": return message("sequence_verdict_oscillating");
            case "epsilon-satisfied": return message("sequence_verdict_epsilon_satisfied");
            case "divergent": return message("sequence_verdict_divergent");
        }
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
        this.drawn.clear();
        const band = this.own(board.create("curve", [[], []], {
            fillColor: GraphPalette.additionalCurves[0], fillOpacity: 0.22, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        this.drawn.set("band", [band as unknown as JXG.GeometryElement]);
        band.updateDataArray = () => {
            band.dataX = [left(), right(), right(), left(), left()];
            band.dataY = [edgeLow(), edgeLow(), edgeHigh(), edgeHigh(), edgeLow()];
        };
        const edge = (y: () => number) => this.own(board.create("segment", [[left, y], [right, y]], {
            strokeColor: GraphPalette.additionalCurves[0], dash: EDGE_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));
        edge(edgeLow);
        edge(edgeHigh);
        this.drawn.set("limit", [this.own(board.create("segment", [[left, () => model().limit], [right, () => model().limit]], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth, highlight: false, fixed: true, withLabel: false,
        }))]);
        this.drawn.set("threshold", [this.own(board.create("segment", [[() => model().threshold, bottom], [() => model().threshold, top]], {
            strokeColor: GraphPalette.referenceCurve, dash: MARKER_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
            visible: thresholdInView,
        }))]);

        // One slot per possible term and per kind: a term in the band is a filled circle, one outside it a cross, so the two differ by shape.
        const size = () => Math.max(3, this.displaySettings.pointSize * 0.8);
        const pool = (inside: boolean) => {
            const points: JXG.GeometryElement[] = [];
            this.drawn.set(inside ? "inside" : "outside", points);
            for (let n = 1; n <= SEQUENCE_MAX_TERMS; n++) {
                points.push(this.own(board.create("point", [n, () => sequenceTerm(model().example, n)], {
                    ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size, visible: () => n <= model().terms && view().inBand[n - 1] === inside,
                    ...(inside
                        ? {face: "o", fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve}
                        : {face: "x", strokeColor: GraphPalette.warningText, highlightStrokeColor: GraphPalette.warningText, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9)}),
                })));
            }
        };
        pool(false);
        pool(true);

        // The label of the threshold marker sits at the top edge, off the axes; below 520 px it is just N (the Odčitki card has the number).
        this.own(board.create("text", [
            () => model().threshold,
            () => top() - 0.03 * (top() - bottom()),
            () => `<div>${escapeHtml(compact() ? "N" : t("sequence_board_threshold", {value0: model().threshold}))}</div>`,
        ], {
            anchorX: "middle", anchorY: "top", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            fontSize: () => Math.max(10, fontSize() * 0.9 * Math.min(1, this.boardWidth() / 700)), cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE, visible: thresholdInView,
        }));
    }

    /** True when the revealed certificate is about a threshold that lies beyond the shown terms. */
    private beyondTerms(model: SequenceModel, view: View): boolean {
        const kind = view.certificate.kind;
        return model.certificateVisible && view.certificate.thresholdBeyondTerms && (kind === "certified" || kind === "threshold-fails");
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const language = currentLanguage();
        const playing = this.playback.isPlaying;
        const canAdvance = canAdvanceSequence(state);
        return <>
            <PuckOwnedGroup params={["sequence-epsilon", "sequence-limit", "sequence-threshold"]} className="inspector-group">
                <PuckOwned param="sequence-epsilon"><Slider customText={t("sequence_epsilon_label")} value={state.epsilon} min={SEQUENCE_EPSILON_MIN} max={SEQUENCE_EPSILON_MAX} step={SEQUENCE_EPSILON_STEP}
                        rejectedHint={t("sequence_epsilon_rejected_hint", {value0: formatNumber(SEQUENCE_EPSILON_MIN, language, 2), value1: formatNumber(SEQUENCE_EPSILON_MAX, language, 2)})}
                        onChange={next => this.ignoreOutOfDomain(() => this.setEpsilon(next))}/></PuckOwned>
                <PuckOwned param="sequence-limit"><Slider customText={t("sequence_limit_label")} value={state.limit} min={SEQUENCE_LIMIT_MIN} max={SEQUENCE_LIMIT_MAX} step={0.1} fieldDecimals={2}
                        rejectedHint={t("sequence_limit_rejected_hint", {value0: formatNumber(SEQUENCE_LIMIT_MIN, language), value1: formatNumber(SEQUENCE_LIMIT_MAX, language)})}
                        onChange={next => this.ignoreOutOfDomain(() => this.setLimit(next))}/></PuckOwned>
                <PuckOwned param="sequence-threshold"><Slider customText={t("sequence_threshold_label")} value={state.threshold} min={SEQUENCE_THRESHOLD_MIN} max={SEQUENCE_THRESHOLD_MAX} step={1}
                        rejectedHint={t("sequence_threshold_rejected_hint", {value0: SEQUENCE_THRESHOLD_MIN, value1: SEQUENCE_THRESHOLD_MAX})}
                        onChange={next => this.ignoreOutOfDomain(() => this.setThreshold(next))}/></PuckOwned>
                <p className="inspector-help">{t("sequence_fields_help")}</p>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("sequence_example_label")} value={state.example} help={t("sequence_example_help")}
                              options={SEQUENCE_EXAMPLE_IDS.map(id => ({value: id, text: exampleFormula(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <PlaybackButtons placement="graph" groupLabel={t("sequence_iteration_controls")} nextLabel={t("next_step")} resetLabel={t("reset")} playing={playing}
                                 onNext={() => this.ignoreOutOfDomain(() => this.nextStep())}
                                 onPlayPause={() => { if (playing) this.pauseIteration(); else this.play(); }} onReset={() => this.resetIteration()}
                                 {...playbackBlocks({atStart: state.terms <= 1, atEnd: !canAdvance, playing})}/>
                <p className="inspector-help">{t("sequence_playback_note", {value0: SEQUENCE_MAX_TERMS})}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const state = this.model;
        return <PuckOwnedGroup params={["show-certificate"]}>
            <div className={CONTROL_ROW_FILL} role="group" aria-label={t("sequence_certificate_actions_label")}>
                <RevealButton action="toggle-sequence-certificate" revealed={state.certificateVisible} showLabel={t("sequence_show_certificate")} hideLabel={t("sequence_hide_certificate")}
                              onToggle={() => this.setCertificateVisible(!this.model.certificateVisible)}/>
            </div>
            <p className="inspector-help">{t("sequence_certificate_help")}</p>
        </PuckOwnedGroup>;
    }

    /** The declared legend replaces the panel's own, so Orodja shows no second one. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "sequence-epsilon": {read: () => this.model.epsilon, apply: (value: number) => this.setEpsilon(value)},
            "sequence-limit": {read: () => this.model.limit, apply: (value: number) => this.setLimit(value)},
            "sequence-threshold": {read: () => this.model.threshold, apply: (value: number) => this.setThreshold(value)},
        };
    }

    /**
     * The common declaration (rows, note, status, view marks) plus the band width, the candidate limit and the threshold as board pucks,
     * the certificate as a switch puck, the playback actions, the legend of every object the board draws and the sequence as the formula
     * row. The example (choosing it restarts the display) and the playback buttons stay in Orodja.
     */
    protected override declaration(): GraphDeclaration {
        const model = this.model;
        const example = sequenceExample(model.example);
        return {
            ...this.commonDeclaration(),
            followView: this.followBox(model),
            formula: {label: message("sequence_formula_label"), tex: `a_n=${example.latex}`},
            parameters: [
                {key: "sequence-epsilon", kind: "range", label: message("sequence_epsilon_name"), symbol: "ε", help: message("sequence_epsilon_help"), placement: "board",
                    min: SEQUENCE_EPSILON_MIN, max: SEQUENCE_EPSILON_MAX, step: SEQUENCE_EPSILON_STEP, maxDecimals: 2},
                {key: "sequence-limit", kind: "range", label: message("sequence_limit_name"), symbol: "L", help: message("sequence_limit_help"), placement: "board",
                    min: SEQUENCE_LIMIT_MIN, max: SEQUENCE_LIMIT_MAX, step: 0.01, bigStep: 0.1, maxDecimals: 2},
                {key: "sequence-threshold", kind: "range", label: message("sequence_threshold_name"), symbol: "N", help: message("sequence_threshold_help"), placement: "board",
                    min: SEQUENCE_THRESHOLD_MIN, max: SEQUENCE_THRESHOLD_MAX, step: 1, maxDecimals: 0},
            ],
            legend: [
                {id: "inside", label: message("sequence_legend_inside"), kind: "point", object: "inside"},
                {id: "outside", label: message("sequence_legend_outside"), kind: "cross", object: "outside"},
                {id: "band", label: message("sequence_legend_band"), kind: "area", object: "band"},
                {id: "limit", label: message("sequence_legend_limit"), kind: "line", object: "limit"},
                {id: "threshold", label: message("sequence_legend_threshold"), kind: "dashed", object: "threshold"},
            ],
            actions: [
                ...this.iterationActions(),
                {id: "show-certificate", label: message("sequence_certificate_actions_label"), help: message("sequence_certificate_help"), placement: "board", enabled: true,
                    pressed: model.certificateVisible, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "show-certificate") runAs("learner", () => this.setCertificateVisible(!this.model.certificateVisible));
        else if (!this.performIterationAction(id)) throw new Error("Unknown action");
    }

    /** A group of terms is drawn as one legend entry: its colour is the first term's, it is visible while any of its terms is. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const elements = this.drawn.get(id);
        if (!elements || elements.length === 0) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const evaluate = (element: JXG.GeometryElement, name: string) => (element as JXG.GeometryElement & {evalVisProp(name: string): unknown}).evalVisProp(name);
        const colorProperty = id === "inside" || id === "band" ? "fillcolor" : "strokecolor";
        return {color: String(evaluate(elements[0], colorProperty)), visible: elements.some(element => Boolean(evaluate(element, "visible")))};
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: SequenceModel, view: View): { id: StatusKind; text: Message; tone?: "warning" | "success" }[] {
        const result: { id: StatusKind; text: Message; tone?: "warning" | "success" }[] = [];
        const certificate = view.certificate;
        if (!model.certificateVisible) {
            result.push({id: "hidden", text: message("sequence_status_hidden")});
        } else {
            const epsilon = this.epsilonText(model);
            switch (certificate.kind) {
                case "certified":
                    result.push({id: "certified", text: message("sequence_status_certified", {value0: model.threshold, value1: this.productText(model), value2: certificate.nMin})});
                    break;
                case "threshold-fails":
                    result.push({id: "threshold-fails", text: message("sequence_status_threshold_fails", {value0: model.threshold, value1: this.productText(model), value2: certificate.nMin})});
                    break;
                case "not-the-limit":
                    result.push({id: "not-the-limit", text: message("sequence_status_not_the_limit", {value0: this.number(model.limit), value1: this.number(certificate.actualLimit)})});
                    break;
                case "oscillating":
                    result.push({id: "oscillating", text: message("sequence_status_oscillating", {value0: this.number(certificate.farthestDistance), value1: epsilon})});
                    break;
                case "epsilon-satisfied":
                    result.push({id: "epsilon-satisfied", text: message("sequence_status_epsilon_satisfied", {value0: this.number(1 + Math.abs(model.limit)), value1: epsilon})});
                    break;
                case "divergent":
                    result.push({id: "divergent", text: message("sequence_status_divergent", {value0: certificate.exitIndex})});
                    break;
            }
            if (this.beyondTerms(model, view)) {
                result.push({id: "beyond-terms", text: message("sequence_status_beyond_terms", {value0: model.threshold, value1: model.terms})});
            }
            if ((certificate.kind === "certified" || certificate.kind === "threshold-fails") && certificate.nMinBeyondTerms) {
                result.push({
                    id: "n-min-beyond-terms",
                    text: certificate.nMin > SEQUENCE_MAX_TERMS
                        ? message("sequence_status_n_min_beyond_all", {value0: certificate.nMin, value1: SEQUENCE_MAX_TERMS})
                        : message("sequence_status_n_min_beyond_terms", {value0: certificate.nMin, value1: model.terms, value2: SEQUENCE_MAX_TERMS}),
                });
            }
        }
        if (model.terms >= SEQUENCE_MAX_TERMS) result.push({id: "complete", text: message("sequence_status_complete", {value0: SEQUENCE_MAX_TERMS})});
        // The tone the removed board caption gave the verdict: confirmed is success, a refusal a warning, hidden none.
        if (model.certificateVisible) result[0] = {...result[0], tone: certificate.kind === "certified" ? "success" : "warning"};
        return result;
    }

    /**
     * The view that follows the display: the terms (counted in steps of {@link FOLLOW_TERM_STEP}, so playback does not move the view at
     * every term), the band and the threshold marker, with air for the axis labels. The director fits it into the card-free area; the
     * example's view (all forty indices) would leave the few shown terms small and partly under a card.
     */
    private followBox(model: SequenceModel): BoundingBox {
        const count = Math.min(SEQUENCE_MAX_TERMS, Math.max(FOLLOW_TERM_STEP, Math.ceil(model.terms / FOLLOW_TERM_STEP) * FOLLOW_TERM_STEP));
        let low = model.limit - model.epsilon, high = model.limit + model.epsilon;
        for (let n = 1; n <= count; n++) {
            const value = sequenceTerm(model.example, n);
            if (Number.isFinite(value)) { low = Math.min(low, value); high = Math.max(high, value); }
        }
        const pad = 0.25 * (high - low);
        const reach = Math.max(count, model.threshold <= SEQUENCE_MAX_TERMS ? model.threshold : 0) + 1.5;
        return [-0.12 * reach, high + pad, reach, low - pad];
    }

    /**
     * The rows, the note and the statuses of the inspector as declared data (`renderReadout` draws them from it). The marks keep every
     * shown term and the label of the threshold marker in sight; the band spans the whole view, so it needs none.
     */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const certificate = view.certificate;
        const shown = model.certificateVisible;
        const hidden = message("sequence_hidden");
        const formula = certificate.kind === "certified" || certificate.kind === "threshold-fails";
        const [left, boxTop, right, boxBottom] = this.followBox(model);
        return {
            rows: [
                {id: "terms", name: message("sequence_readout_terms", {value0: messageNumber(SEQUENCE_MAX_TERMS, 0)}), value: messageNumber(model.terms, 0)},
                {id: "epsilon", name: message("sequence_epsilon_label"), value: messageNumber(model.epsilon, 2)},
                {id: "limit", name: message("sequence_limit_label"), value: messageNumber(model.limit, 4)},
                {id: "threshold", name: message("sequence_threshold_label"), value: messageNumber(model.threshold, 0)},
                {id: "last-term", name: message("sequence_readout_last_term", {value0: messageNumber(model.terms, 0)}), value: messageNumber(view.lastTerm, 4)},
                {id: "distance", name: message("sequence_readout_distance"), value: messageNumber(view.lastDistance, 4)},
                {id: "in-band", name: message("sequence_readout_in_band"), value: message(view.lastInBand ? "sequence_in_band" : "sequence_out_of_band")},
                {id: "in-band-count", name: message("sequence_readout_in_band_count"), value: message("sequence_count_of", {value0: messageNumber(view.insideCount, 0), value1: messageNumber(model.terms, 0)})},
                {id: "certificate", name: message("sequence_readout_certificate"), value: this.verdictMessage(model, view)},
                {id: "n-min", name: message("sequence_readout_n_min"), value: !shown ? hidden : formula ? messageNumber(certificate.nMin, 0) : {kind: "formatted", text: NOT_A_NUMBER_TEXT}},
                {
                    id: "bound", name: message("sequence_readout_bound"),
                    value: !shown ? hidden : formula
                        ? {kind: "formatted", text: `1/${model.threshold} = ${formatNumber(1 / model.threshold, currentLanguage(), 4)}`} : {kind: "formatted", text: NOT_A_NUMBER_TEXT},
                },
            ],
            notes: [{id: "edge", text: message("sequence_note")}],
            status: this.statuses(model, view),
            must: [
                ...Array.from({length: model.terms}, (_, index) => ({x: index + 1, y: sequenceTerm(model.example, index + 1)})),
                // The label of the threshold marker, at the top edge of the example's view.
                ...(model.threshold >= left && model.threshold <= right ? [{x: model.threshold, y: boxTop - 0.06 * (boxTop - boxBottom)}] : []),
            ],
        };
    }

    protected renderReadout(): React.ReactNode {
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="demo-status" dataAttribute="sequence-status" lines={(this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))} muted={this.playback.isPlaying}/>
        </>;
    }
}

export default SequenceGraph;
