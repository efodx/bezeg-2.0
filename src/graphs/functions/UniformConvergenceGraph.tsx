import React from "react";
import BaseFunctionGraph, {cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, formatSignificant, NumberLanguage} from "../../analysis/format";
import {
    isUniformEpsilon, isUniformExampleId, isUniformN, isUniformX, UNIFORM_EPSILON_MAX, UNIFORM_EPSILON_MIN, UNIFORM_EPSILON_STEP, UNIFORM_EXAMPLE_IDS, UNIFORM_MAX_N,
    UNIFORM_N_MIN, UNIFORM_R_MAX, UNIFORM_R_MIN, UNIFORM_R_STEP, UNIFORM_X_STEP, uniformExample, UniformExample, UniformExampleId, uniformLimit, uniformLimitHasJump,
    uniformLimitPieces, UniformLimitPiece, uniformPointwiseError, uniformPointwiseThreshold, UniformPointwiseThreshold, uniformSupremum, UniformSupremum, uniformTerm,
    uniformThreshold, UniformThreshold,
} from "../../analysis/uniformConvergence";
import {changeUniformR, parseUniformConvergenceModel, UNIFORM_EXAMPLE_MODELS, UniformConvergenceModel} from "../../analysis/uniformConvergenceModel";
import {GraphPalette} from "../styles/GraphPalette";

/** Boards narrower than this many pixels get fewer caption lines. */
export const COMPACT_BOARD_WIDTH = 520;

/** Errors and the supremum show five significant digits, so 0.8^5 reads 0.32768. */
const SIGNIFICANT_DIGITS = 5;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Both ranges are about [0, 1]. The room above 1 is for the caption (top-left, where the functions stay low) and the room
 * below 0 for the band, the axis labels and the point labels. The two axes are independent (see `equalAxisUnits`), so the
 * domain [0, 1] uses the whole board width at any size.
 */
const BOARD_VIEW: BoundingBox = [-0.15, 1.45, 1.2, -0.2];

/** Dash styles (JSXGraph numbering): the limit is dashed, the band edges medium-dashed, the supremum dotted; f_n is solid. */
const LIMIT_DASH = 3;
const EDGE_DASH = 2;
const SUPREMUM_DASH = 1;

/** The formulas as they are written on the board and in the example selector. */
const exampleFormula = (id: UniformExampleId): string => id === "power" ? "fₙ(x) = xⁿ" : "fₙ(x) = x/n";

type SegmentPiece = Extract<UniformLimitPiece, { kind: "segment" }>;
type PointPiece = Extract<UniformLimitPiece, { kind: "point" }>;

type StatusKind = "hidden" | "attained" | "not-attained" | "shared-n" | "no-shared-n" | "shared-n-beyond" | "covered" | "not-covered" | "jump" | "pointwise-beyond";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: UniformExample;
    term: number;
    limit: number;
    pointwiseError: number;
    pointwise: UniformPointwiseThreshold;
    supremum: UniformSupremum;
    threshold: UniformThreshold;
    /** The limit as separate pieces: a jump is never joined. */
    pieces: readonly UniformLimitPiece[];
    segment: SegmentPiece | undefined;
    isolated: PointPiece | undefined;
    hasJump: boolean;
}

/** A closed curve whose data arrays are recomputed on every board update (the shaded band). */
interface FillCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

/**
 * The grid value that `value` is within arithmetic noise of (1e-9 of a grid step), as an exact decimal, or undefined for a
 * real off-grid value. A number field hands the model exactly what was typed; this only removes the noise of slider and
 * key-step arithmetic (0.8500000000000001), never rounds a real value such as 0.851 to the grid.
 */
export function gridValue(value: number, step: number): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    const units = Math.round(value / step);
    return Math.abs(value / step - units) <= 1e-9 ? cleanNumber(units * step) : undefined;
}

/**
 * Uniform convergence: f_n(x) = x^n or x/n on the domain [0, r], the pointwise limit, the band f +- epsilon, the pointwise error
 * at a chosen point x with its threshold N(x, epsilon), and, once Show supremum is pressed, the supremum error over the whole
 * domain with the shared N(epsilon) (or "no shared N"). The model is `{example, r, n, x, epsilon, supremumVisible}`
 * (`src/analysis/uniformConvergenceModel`); errors, thresholds and suprema are recomputed from it with the closed forms of
 * `src/analysis/uniformConvergence`, never from sampled values and never stored.
 *
 * The limit is drawn from `uniformLimitPieces`: for `power` on [0, 1] the half-open segment y = 0 on [0, 1) with an open circle at
 * (1, 0) and the isolated filled point (1, 1); the jump is never joined. The index n is a plain parameter (a field and the
 * buttons - and +), not an iteration.
 *
 * Rules (reject, never clamp): r is a multiple of 0.05 in [0.1, 1] and not below the chosen x (the inspector says to move x first),
 * n an integer 1..50, x a multiple of 0.01 in [0, r] and epsilon a multiple of 0.01 in [0.01, 1]. Values within arithmetic noise of the
 * grid are snapped; a real off-grid value is refused. A setter that would break a rule throws a `DomainError` and leaves the model
 * unchanged. Number fields, buttons, drags and lesson actions use the same setters. Choosing an example loads its model.
 */
export class UniformConvergenceGraph extends BaseFunctionGraph<UniformConvergenceModel> {
    private pointX?: JXG.Point;

    override presets(): string {
        return "uniform-convergence";
    }

    protected defaultModel(): UniformConvergenceModel {
        return {...UNIFORM_EXAMPLE_MODELS.power};
    }

    protected parseModel(data: unknown): UniformConvergenceModel | undefined {
        return parseUniformConvergenceModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    /** The domain [0, 1] and the values in [0, 1] have independent scales, so the stored view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: UniformConvergenceModel): View {
        return this.memoView(model, () => {
            const example = uniformExample(model.example);
            const pieces = uniformLimitPieces(example, model.r);
            return {
                example,
                term: uniformTerm(example, model.r, model.n, model.x),
                limit: uniformLimit(example, model.r, model.x),
                pointwiseError: uniformPointwiseError(example, model.r, model.n, model.x),
                pointwise: uniformPointwiseThreshold(example, model.r, model.x, model.epsilon),
                supremum: uniformSupremum(example, model.r, model.n),
                threshold: uniformThreshold(example, model.r, model.epsilon),
                pieces,
                segment: pieces.find((piece): piece is SegmentPiece => piece.kind === "segment"),
                isolated: pieces.find((piece): piece is PointPiece => piece.kind === "point"),
                hasJump: uniformLimitHasJump(example, model.r),
            };
        });
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    protected setExample(value: unknown): void {
        if (!isUniformExampleId(value)) throw new DomainError(`The example must be one of ${UNIFORM_EXAMPLE_IDS.join(", ")}.`);
        this.commitModel({...UNIFORM_EXAMPLE_MODELS[value]});
    }

    protected setR(value: number): void {
        const snapped = gridValue(value, UNIFORM_R_STEP);
        if (snapped === undefined) throw new DomainError(`The domain end r must be a multiple of ${UNIFORM_R_STEP} between ${UNIFORM_R_MIN} and ${UNIFORM_R_MAX}.`);
        const change = changeUniformR(this.model, snapped);
        if (!change.ok) {
            throw new DomainError(change.reason === "x-outside-domain"
                ? `The domain end r = ${snapped} would leave the chosen point x = ${this.model.x} outside [0, r]; move x first.`
                : `The domain end r must be a multiple of ${UNIFORM_R_STEP} between ${UNIFORM_R_MIN} and ${UNIFORM_R_MAX}.`);
        }
        if (change.model.r !== this.model.r) this.commitModel(change.model);
    }

    protected setN(value: number): void {
        const rounded = Math.round(value);
        if (!Number.isFinite(value) || Math.abs(value - rounded) > 1e-9 || !isUniformN(rounded)) {
            throw new DomainError(`The index n must be an integer between ${UNIFORM_N_MIN} and ${UNIFORM_MAX_N}.`);
        }
        if (rounded !== this.model.n) this.commitModel({...this.model, n: rounded});
    }

    protected setX(value: number, options: { syncScene?: boolean } = {}): void {
        const snapped = gridValue(value, UNIFORM_X_STEP);
        if (snapped === undefined || !isUniformX(this.model.r, snapped)) {
            throw new DomainError(`The point x must be a multiple of ${UNIFORM_X_STEP} between 0 and r = ${this.model.r}.`);
        }
        if (snapped !== this.model.x) this.commitModel({...this.model, x: snapped}, options);
    }

    protected setEpsilon(value: number): void {
        const snapped = gridValue(value, UNIFORM_EPSILON_STEP);
        if (snapped === undefined || !isUniformEpsilon(snapped)) {
            throw new DomainError(`The tolerance epsilon must be a multiple of ${UNIFORM_EPSILON_STEP} between ${UNIFORM_EPSILON_MIN} and ${UNIFORM_EPSILON_MAX}.`);
        }
        if (snapped !== this.model.epsilon) this.commitModel({...this.model, epsilon: snapped});
    }

    protected setSupremumVisible(visible: boolean): void {
        if (visible !== this.model.supremumVisible) this.commitModel({...this.model, supremumVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "uniform-r": value => this.setR(value), "uniform-n": value => this.setN(value), "uniform-x": value => this.setX(value),
                "uniform-epsilon": value => this.setEpsilon(value),
            },
            visibility: {"uniform-supremum": visible => this.setSupremumVisible(visible)},
            choices: {"uniform-example": value => this.setExample(value)},
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), 4);
    }

    /** An error or a supremum with significant digits; floating-point noise shows as 0. */
    private small(value: number): string {
        return formatSignificant(value, currentLanguage(), SIGNIFICANT_DIGITS);
    }

    /** N(x, epsilon) as the plain number (the board); beyond the cap says how far the search went. */
    private pointwiseNumber(view: View): string {
        return view.pointwise.kind === "threshold" ? String(view.pointwise.n) : t("uniform_beyond_cap", {value0: view.pointwise.cap});
    }

    /** N(x, epsilon) for the inspector: a value beyond the selectable index n is reported, not truncated. */
    private pointwiseText(view: View): string {
        if (view.pointwise.kind !== "threshold") return this.pointwiseNumber(view);
        return view.pointwise.n > UNIFORM_MAX_N ? t("uniform_n_beyond", {value0: view.pointwise.n, value1: UNIFORM_MAX_N}) : String(view.pointwise.n);
    }

    private sharedText(view: View): string {
        if (view.threshold.kind === "none") return t("uniform_no_shared_n");
        return view.threshold.n > UNIFORM_MAX_N ? t("uniform_n_beyond", {value0: view.threshold.n, value1: UNIFORM_MAX_N}) : String(view.threshold.n);
    }

    private attainedText(view: View): string {
        return t(view.supremum.attained ? "uniform_attained_at" : "uniform_not_attained", {value0: this.number(view.supremum.at)});
    }

    private boardSupremum(model: UniformConvergenceModel, view: View): string {
        if (!model.supremumVisible) return t("uniform_board_supremum_hidden");
        return view.supremum.attained
            ? t("uniform_board_supremum_attained", {value0: this.small(view.supremum.value), value1: this.number(view.supremum.at)})
            : t("uniform_board_supremum_not_attained", {value0: this.small(view.supremum.value)});
    }

    private boardShared(view: View): string {
        return view.threshold.kind === "none" ? t("uniform_board_no_shared_n") : t("uniform_board_shared_n", {value0: view.threshold.n});
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = () => Math.max(1, this.displaySettings.strokeWidth * 0.6);
        const left = () => board.getBoundingBox()[0];
        const segment = () => view().segment;
        const segmentVisible = () => segment() !== undefined;
        const lowEdge = () => (segment()?.y ?? 0) - model().epsilon;
        const highEdge = () => (segment()?.y ?? 0) + model().epsilon;
        const f = (x: number) => x < 0 || x > model().r + 1e-12 ? NaN : view().example.term(model().n, x);
        const supremumShown = () => model().supremumVisible;
        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);

        // Layers, lowest first: the band and its edges, the limit, f_n, the pointwise error, the supremum, the markers, the points.
        const band = this.own(board.create("curve", [[], []], {
            fillColor: GraphPalette.additionalCurves[0], fillOpacity: 0.22, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true, visible: segmentVisible,
        })) as unknown as FillCurve;
        band.updateDataArray = () => {
            const piece = segment();
            const to = piece?.to ?? 0;
            band.dataX = [0, to, to, 0, 0];
            band.dataY = [lowEdge(), lowEdge(), highEdge(), highEdge(), lowEdge()];
        };
        const edge = (y: () => number) => this.own(board.create("segment", [[0, y], [() => segment()?.to ?? 0, y]], {
            strokeColor: GraphPalette.additionalCurves[0], dash: EDGE_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false, visible: segmentVisible,
        }));
        edge(lowEdge);
        edge(highEdge);
        // Around an isolated value of the limit the band is a vertical stretch f(x) +- epsilon at that single x.
        this.own(board.create("segment", [
            [() => view().isolated?.x ?? 0, () => (view().isolated?.y ?? 0) - model().epsilon], [() => view().isolated?.x ?? 0, () => (view().isolated?.y ?? 0) + model().epsilon],
        ], {
            strokeColor: GraphPalette.additionalCurves[0], strokeWidth: () => Math.max(6, this.displaySettings.strokeWidth * 3), strokeOpacity: 0.35,
            highlight: false, fixed: true, withLabel: false, visible: () => view().isolated !== undefined,
        }));

        // The limit: a (half-open) segment and, for a jump, a separate isolated point; the two pieces are never joined.
        this.own(board.create("segment", [[0, () => segment()?.y ?? 0], [() => segment()?.to ?? 0, () => segment()?.y ?? 0]], {
            strokeColor: GraphPalette.comparisonCurve, dash: LIMIT_DASH, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: segmentVisible,
        }));
        this.own(board.create("functiongraph", [f], {
            strokeColor: GraphPalette.primaryCurve, dash: 0, highlight: false, fixed: true, strokeWidth,
        }));
        this.own(board.create("segment", [[() => model().x, () => view().limit], [() => model().x, () => view().term]], {
            strokeColor: GraphPalette.warningText, strokeWidth: () => Math.max(2.5, this.displaySettings.strokeWidth * 1.4), highlight: false, fixed: true,
            withLabel: false, visible: () => view().pointwiseError > 0,
        }));
        this.own(board.create("segment", [[0, () => view().supremum.value], [() => model().r, () => view().supremum.value]], {
            strokeColor: GraphPalette.warningText, dash: SUPREMUM_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false, visible: supremumShown,
        }));

        // The open end of the limit's segment and the isolated value.
        const marker = (x: () => number, y: () => number, attributes: object) => this.own(board.create("point", [x, y], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: markerSize, ...attributes,
        }));
        marker(() => segment()?.to ?? 0, () => segment()?.y ?? 0, {
            face: "o", fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface, strokeColor: GraphPalette.comparisonCurve,
            strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9), visible: () => segment() !== undefined && segment()!.closedTo === false,
        });
        marker(() => view().isolated?.x ?? 0, () => view().isolated?.y ?? 0, {
            face: "o", fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve,
            visible: () => view().isolated !== undefined,
        });
        // The supremum: a cross where it is attained, an open circle where the error only approaches it.
        marker(() => view().supremum.at, () => view().supremum.value, {
            face: "x", strokeColor: GraphPalette.warningText, highlightStrokeColor: GraphPalette.warningText, size: () => Math.max(5, this.displaySettings.pointSize * 1.2),
            strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9), visible: () => supremumShown() && view().supremum.attained,
        });
        marker(() => view().supremum.at, () => view().supremum.value, {
            face: "o", fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface, strokeColor: GraphPalette.warningText,
            size: () => Math.max(6, this.displaySettings.pointSize * 1.5), strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
            visible: () => supremumShown() && !view().supremum.attained,
        });
        // The values of f_n and f at the chosen x.
        marker(() => model().x, () => view().term, {
            fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        });
        marker(() => model().x, () => view().limit, {
            fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7), visible: () => view().pointwiseError > 0,
        });

        // The domain end r is marked on the axis (not draggable: it changes the comparison); x is dragged along [0, r] on its grid.
        this.own(board.create("point", [() => model().r, 0], {
            ...this.styles.point.default, name: "$$r$$", label: this.pointLabel("below-left", 1.6), fixed: true,
            fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve, size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        }));
        this.pointX = this.axisPoint({
            x: model().x, name: "$$x$$", placement: "below-right", color: GraphPalette.warningText, step: UNIFORM_X_STEP, min: 0, max: () => model().r,
            write: value => this.setX(value, {syncScene: false}),
        });

        // The formula and domain, the numbers, the pointwise error, the supremum (or the word hidden) and the key stay on the board.
        this.caption("top-left", [
            {text: () => t("uniform_board_title", {value0: exampleFormula(model().example), value1: this.number(model().r)}), scale: 1.2, math: true},
            {text: () => t("uniform_board_parameters", {value0: model().n, value1: this.number(model().x), value2: this.number(model().epsilon)})},
            {text: () => t("uniform_board_pointwise", {value0: this.small(view().pointwiseError), value1: this.pointwiseNumber(view())}), color: GraphPalette.warningText},
            {text: () => this.boardSupremum(model(), view())},
            {
                text: () => this.boardShared(view()),
                visible: supremumShown,
            },
            {text: () => t("uniform_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    protected override syncSceneToModel(): void {
        this.pointX?.moveTo([this.model.x, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointX = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): UniformConvergenceModel {
        const state = this.state;
        return {example: state.example, r: state.r, n: state.n, x: state.x, epsilon: state.epsilon, supremumVisible: state.supremumVisible};
    }

    protected renderControls(): React.ReactNode {
        const state = this.stateModel();
        const language = currentLanguage();
        const atMinimum = state.n <= UNIFORM_N_MIN;
        const atMaximum = state.n >= UNIFORM_MAX_N;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("uniform_example_label")} value={state.example} help={t("uniform_example_help")}
                              options={UNIFORM_EXAMPLE_IDS.map(id => ({value: id, text: exampleFormula(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("uniform_r_label")} value={state.r} min={UNIFORM_R_MIN} max={UNIFORM_R_MAX} step={UNIFORM_R_STEP} decimals={2}
                             rejectedHint={t("uniform_r_rejected_hint", {
                                 value0: formatNumber(UNIFORM_R_MIN, language), value1: formatNumber(UNIFORM_R_MAX, language), value2: formatNumber(state.x, language),
                             })}
                             onChange={next => this.ignoreOutOfDomain(() => this.setR(next))}/>
                <NumberInput label={t("uniform_x_label")} value={state.x} min={0} max={state.r} step={UNIFORM_X_STEP} decimals={2}
                             rejectedHint={t("uniform_x_rejected_hint", {value0: formatNumber(state.r, language)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setX(next))}/>
                <NumberInput label={t("uniform_epsilon_label")} value={state.epsilon} min={UNIFORM_EPSILON_MIN} max={UNIFORM_EPSILON_MAX} step={UNIFORM_EPSILON_STEP} decimals={2}
                             rejectedHint={t("uniform_epsilon_rejected_hint", {value0: formatNumber(UNIFORM_EPSILON_MIN, language, 2), value1: formatNumber(UNIFORM_EPSILON_MAX, language, 2)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setEpsilon(next))}/>
                <p className="inspector-help">{t("uniform_fields_help")}</p>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("uniform_n_label")} value={state.n} min={UNIFORM_N_MIN} max={UNIFORM_MAX_N} step={1} decimals={0}
                             rejectedHint={t("uniform_n_rejected_hint", {value0: UNIFORM_N_MIN, value1: UNIFORM_MAX_N})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setN(next))}/>
                <div className="uniform-actions" role="group" aria-label={t("uniform_n_buttons_label")}>
                    <button type="button" data-action="n-decrease" disabled={atMinimum} aria-describedby="uniform-n-help"
                            aria-label={t("uniform_n_decrease")} onClick={() => this.ignoreOutOfDomain(() => this.setN(this.model.n - 1))}>−</button>
                    <button type="button" data-action="n-increase" disabled={atMaximum} aria-describedby="uniform-n-help"
                            aria-label={t("uniform_n_increase")} onClick={() => this.ignoreOutOfDomain(() => this.setN(this.model.n + 1))}>+</button>
                </div>
                <p id="uniform-n-help" className="inspector-help">
                    {atMinimum ? t("uniform_n_limit_min", {value0: UNIFORM_N_MIN}) : atMaximum ? t("uniform_n_limit_max", {value0: UNIFORM_MAX_N}) : t("uniform_n_help")}
                </p>
            </div>
            <div className="inspector-group">
                <div className="uniform-actions" role="group" aria-label={t("uniform_actions_label")}>
                    <button type="button" data-action="toggle-uniform-supremum" data-revealed={state.supremumVisible}
                            onClick={() => this.setSupremumVisible(!this.model.supremumVisible)}>
                        {state.supremumVisible ? t("uniform_hide_supremum") : t("uniform_show_supremum")}
                    </button>
                </div>
                <p className="inspector-help">{t("uniform_supremum_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("uniform_legend_function"), kind: "line"},
            {id: "limit", color: GraphPalette.comparisonCurve, label: t("uniform_legend_limit"), kind: "dashed-line"},
            {id: "limit-open", color: GraphPalette.comparisonCurve, label: t("uniform_legend_limit_open"), kind: "ring"},
            {id: "band", color: GraphPalette.additionalCurves[0], label: t("uniform_legend_band"), kind: "area"},
            {id: "error", color: GraphPalette.warningText, label: t("uniform_legend_error"), kind: "line"},
            {id: "supremum", color: GraphPalette.warningText, label: t("uniform_legend_supremum"), kind: "dotted-line"},
            {id: "attained", color: GraphPalette.warningText, label: t("uniform_legend_attained"), kind: "cross"},
            {id: "not-attained", color: GraphPalette.warningText, label: t("uniform_legend_not_attained"), kind: "ring"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: UniformConvergenceModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (!model.supremumVisible) {
            result.push({id: "hidden", text: t("uniform_status_hidden")});
        } else {
            const {value, attained, at} = view.supremum;
            result.push(attained
                ? {id: "attained", text: t("uniform_status_attained", {value0: this.small(value), value1: this.number(at)})}
                : {id: "not-attained", text: t("uniform_status_not_attained", {value0: this.small(value), value1: this.number(at)})});
            const epsilon = formatNumber(model.epsilon, currentLanguage(), 2);
            if (view.threshold.kind === "none") {
                result.push({id: "no-shared-n", text: t("uniform_status_no_shared_n", {value0: this.small(value), value1: epsilon})});
            } else {
                result.push({id: "shared-n", text: t("uniform_status_shared_n", {value0: view.threshold.n, value1: epsilon})});
                if (view.threshold.n > UNIFORM_MAX_N) {
                    result.push({id: "shared-n-beyond", text: t("uniform_status_shared_n_beyond", {value0: view.threshold.n, value1: UNIFORM_MAX_N})});
                }
            }
            const covered = view.threshold.kind === "threshold" && model.n >= view.threshold.n;
            result.push(covered
                ? {id: "covered", text: t("uniform_status_covered", {value0: model.n})}
                : {id: "not-covered", text: t("uniform_status_not_covered", {value0: model.n})});
        }
        if (view.hasJump) result.push({id: "jump", text: t("uniform_status_jump")});
        if (view.pointwise.kind === "threshold" && view.pointwise.n > UNIFORM_MAX_N) {
            result.push({id: "pointwise-beyond", text: t("uniform_status_pointwise_beyond", {value0: view.pointwise.n, value1: UNIFORM_MAX_N})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const language: NumberLanguage = currentLanguage();
        const view = this.viewOf(model);
        const shown = model.supremumVisible;
        const hidden = t("uniform_hidden");
        const rows = [
            {id: "r", label: t("uniform_r_label"), value: this.number(model.r)},
            {id: "n", label: t("uniform_n_label"), value: String(model.n)},
            {id: "x", label: t("uniform_x_label"), value: this.number(model.x)},
            {id: "epsilon", label: t("uniform_epsilon_label"), value: formatNumber(model.epsilon, language, 2)},
            {id: "term", label: t("uniform_readout_term"), value: this.small(view.term)},
            {id: "limit", label: t("uniform_readout_limit"), value: this.small(view.limit)},
            {id: "pointwise-error", label: t("uniform_readout_pointwise_error"), value: this.small(view.pointwiseError)},
            {id: "pointwise-n", label: t("uniform_readout_pointwise_n"), value: this.pointwiseText(view)},
            {id: "supremum", label: t("uniform_readout_supremum"), value: shown ? this.small(view.supremum.value) : hidden},
            {id: "supremum-attained", label: t("uniform_readout_attained"), value: shown ? this.attainedText(view) : hidden},
            {id: "shared-n", label: t("uniform_readout_shared_n"), value: shown ? this.sharedText(view) : hidden},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("uniform_note")}/>
            <div className="inspector-group uniform-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-uniform-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default UniformConvergenceGraph;
