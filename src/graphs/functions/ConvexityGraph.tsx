import React from "react";
import BaseFunctionGraph, {cleanNumber, DomainError, escapeHtml, FunctionLessonActions, LABEL_STYLE, SIGN_STYLE} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatLineEquation, formatNumber, NumberLanguage} from "../../analysis/format";
import {NonVerticalLine} from "../../analysis/derivative";
import {
    chordComparison, chordLineOf, CONVEXITY_EXAMPLE_IDS, CONVEXITY_X_MAX, CONVEXITY_X_MIN, CONVEXITY_X_STEP, convexityExample, ConvexityExample,
    ConvexityExampleId, ConvexityVerdict, convexityVerdict, ComparisonClaim, inflectionPointsIn, isConvexityExampleId, isConvexityX,
    secondDerivativePieces, SecondDerivativePiece, SecondDerivativeSign, secondDerivativeSignOn, tangentComparison, tangentLineAt,
} from "../../analysis/convexity";
import {CONVEXITY_EXAMPLE_MODELS, ConvexityModel} from "../../analysis/convexityModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** Positions and line coefficients show four decimals, so that 0.25 and 1.5 are read off exactly. */
const PRECISE = 4;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<ConvexityExampleId, string>> = {square: "x²", negSquare: "−x²", cube: "x³", quartic: "x⁴"};
const exampleTitle = (id: ConvexityExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Each example has its own view, which becomes the board view whenever the example changes (inspector select or the
 * `convexity-example` lesson action) and for the default scene; a view stored in a preset still wins on import. The caption sits
 * in the bottom-right corner, so below the x-axis (and the a, b, t labels) every view keeps an empty band for it, taller where the
 * graph itself runs low (-x^2); the top margin leaves room for the row of f'' signs. With a fixed aspect ratio the board shows
 * `min(width, height)` of the box vertically, so each box is at least as wide as it is tall and its height is what the board shows.
 */
const EXAMPLE_VIEWS: Readonly<Record<ConvexityExampleId, BoundingBox>> = {
    square: [-6.5, 4.2, 6.5, -3.2],
    negSquare: [-6.5, 2.3, 6.5, -7.8],
    cube: [-6.5, 4.2, 6.5, -3.2],
    quartic: [-6.5, 4.2, 6.5, -3.2],
};

/** The board keeps one slot for an inflection point (no example has two), two sign pieces and one zero mark of f''. */
const MAX_INFLECTIONS = 1;
const MAX_PIECES = 2;
const MAX_ZEROS = 1;
/** A 0 mark at x = 0 is shifted this many pixels right of the y-axis, clear of its tick labels. */
const ZERO_MARK_OFFSET_PX = 14;
/** Space kept between a shifted point label and the board edge (pixels). */
const LABEL_EDGE_MARGIN_PX = 4;

/** Dash styles (JSXGraph numbering): the chord is a solid segment, the tangent a dashed line, so they differ by pattern and not only by colour. */
const CHORD_DASH = 0;
const TANGENT_DASH = 3;

type StatusKind = "hidden" | "revealed" | "no-claim" | "tangent-outside" | "zero-without-change";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: ConvexityExample;
    chord: NonVerticalLine;
    tangent: NonVerticalLine;
    sign: SecondDerivativeSign;
    verdict: ConvexityVerdict;
    chordClaim: ComparisonClaim;
    tangentClaim: ComparisonClaim;
    /** Zeros of f'' that are not inflection points (f'' touches 0 without changing sign). */
    flatZeros: readonly number[];
    /** The inflection point of f drawn on the board (an inflection of f anywhere in the range, not only inside [a, b]). */
    inflection: number | undefined;
    /** The inflection points strictly inside (a, b). */
    inflectionsInside: readonly number[];
}

/** The line's value at x. */
const lineAt = (line: NonVerticalLine, x: number): number => line.slope * x + line.intercept;

/** The sign of f'' on a piece as the character the board shows. */
const SIGN_CHARACTER: Readonly<Record<1 | -1, string>> = {[-1]: "−", 1: "+"};

/**
 * Convexity and concavity: the chord of f over [a, b], the tangent at an independent point t, and, once the second derivative
 * is shown, the sign of f'' across the view, the inflection point and the verdict for [a, b]. The model is
 * `{example, a, b, t, secondDerivativeVisible}`; the mathematics lives in `src/analysis/convexity` and every claim (graph on or
 * below the chord, on or above the tangent, or the reverse) is derived analytically from the sign of f'' on [a, b], never from
 * sampling. When f'' changes sign on [a, b] no claim is made; the tangent claim is made only when t lies in [a, b].
 *
 * Rules (reject, never clamp): a < b, and a, b, t all in [-2, 2]; t is independent of a and b. A setter that would break a rule
 * throws a `DomainError` and leaves the model unchanged; dragging is clamped to the allowed range (one grid step short of the
 * other endpoint for a and b) and a drag the model still refuses puts the point back. Number fields, lesson actions and drags use the
 * same setters.
 *
 * `secondDerivativeVisible` is part of the model (the Show second derivative action, lesson element `second-derivative`), saved
 * with a preset and a lesson checkpoint. Until it is set the chord and the tangent are drawn but the verdicts, the sign strip and
 * the inflection point are withheld (the readout and the caption say "hidden"), so a prediction is not given away. Editing a, b
 * or t keeps it; choosing an example loads that example's model and hides it again.
 */
export class ConvexityGraph extends BaseFunctionGraph<ConvexityModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    private pointT?: JXG.Point;

    override presetCollection() {
        return functionPresetCollections.convexity;
    }

    protected defaultModel(): ConvexityModel {
        return {...CONVEXITY_EXAMPLE_MODELS.square};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: ConvexityModel): View {
        return this.memoView(model, () => {
            const example = convexityExample(model.example);
            const {a, b, t} = model;
            return {
                example,
                chord: chordLineOf(example, a, b),
                tangent: tangentLineAt(example, t),
                sign: secondDerivativeSignOn(example, a, b),
                verdict: convexityVerdict(example, a, b),
                chordClaim: chordComparison(example, a, b),
                tangentClaim: tangentComparison(example, a, b, t),
                flatZeros: example.secondDerivativeZeros.filter(x => !example.inflectionPoints.includes(x)),
                inflection: example.inflectionPoints[0],
                inflectionsInside: inflectionPointsIn(example, a, b),
            };
        });
    }

    /** The pieces of the view on which f'' has one strict sign; none while the board has no extent. */
    private piecesInView(example: ConvexityExample): readonly SecondDerivativePiece[] {
        const [left, , right] = this.board.getBoundingBox();
        return left < right ? secondDerivativePieces(example, left, right) : [];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    protected setExample(value: unknown): void {
        if (!isConvexityExampleId(value)) throw new DomainError(`The example must be one of ${CONVEXITY_EXAMPLE_IDS.join(", ")}.`);
        this.commitModel({...CONVEXITY_EXAMPLE_MODELS[value], secondDerivativeVisible: false});
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...EXAMPLE_VIEWS[value]], true);
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isConvexityX(value)) throw new DomainError(`The endpoint a must be a finite number between ${CONVEXITY_X_MIN} and ${CONVEXITY_X_MAX}.`);
        if (!(value < this.model.b)) throw new DomainError("The endpoint a must be less than b (a < b): move b first.");
        const next = cleanNumber(value);
        if (next !== this.model.a) this.commitModel({...this.model, a: next}, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isConvexityX(value)) throw new DomainError(`The endpoint b must be a finite number between ${CONVEXITY_X_MIN} and ${CONVEXITY_X_MAX}.`);
        if (!(value > this.model.a)) throw new DomainError("The endpoint b must be greater than a (a < b): move a first.");
        const next = cleanNumber(value);
        if (next !== this.model.b) this.commitModel({...this.model, b: next}, options);
    }

    protected setT(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isConvexityX(value)) throw new DomainError(`The tangent point t must be a finite number between ${CONVEXITY_X_MIN} and ${CONVEXITY_X_MAX}.`);
        const next = cleanNumber(value);
        if (next !== this.model.t) this.commitModel({...this.model, t: next}, options);
    }

    protected setSecondDerivativeVisible(visible: boolean): void {
        if (visible !== this.model.secondDerivativeVisible) this.commitModel({...this.model, secondDerivativeVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "convexity-a": value => this.setA(value), "convexity-b": value => this.setB(value), "convexity-t": value => this.setT(value),
            },
            visibility: {"second-derivative": visible => this.setSecondDerivativeVisible(visible)},
            choices: {"convexity-example": value => this.setExample(value)},
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), PRECISE);
    }

    private signText(sign: SecondDerivativeSign): string {
        return t(sign === "nonnegative" ? "convexity_sign_nonnegative" : sign === "nonpositive" ? "convexity_sign_nonpositive" : "convexity_sign_changes");
    }

    private verdictText(verdict: ConvexityVerdict): string {
        return t(verdict.kind === "convex" ? "convexity_verdict_convex" : verdict.kind === "concave" ? "convexity_verdict_concave" : "convexity_verdict_none");
    }

    private tangentClaimText(claim: ComparisonClaim): string {
        if (claim.kind === "none") return t(claim.reason === "sign-changes" ? "convexity_tangent_none_sign" : "convexity_tangent_none_outside");
        return t(claim.kind === "above" ? "convexity_tangent_above" : "convexity_tangent_below");
    }

    private inflectionText(view: View): string {
        return view.example.inflectionPoints.length === 0
            ? t("convexity_inflection_none")
            : t("convexity_inflection_at", {value0: view.example.inflectionPoints.map(x => this.number(x)).join("; ")});
    }

    /** The board's verdict line: hidden until the second derivative is shown. */
    private boardVerdict(model: ConvexityModel, view: View): string {
        if (!model.secondDerivativeVisible) return t("convexity_board_verdict_hidden");
        return t(view.verdict.kind === "convex" ? "convexity_board_convex" : view.verdict.kind === "concave" ? "convexity_board_concave" : "convexity_board_none");
    }

    /** The board's line on where the graph lies relative to the chord and the tangent; undefined when nothing is claimed or nothing is shown yet. */
    private boardRelations(model: ConvexityModel, view: View): string | undefined {
        if (!model.secondDerivativeVisible || view.verdict.kind === "none") return undefined;
        const outside = view.tangentClaim.kind === "none";
        if (view.verdict.kind === "convex") return t(outside ? "convexity_board_relations_convex_outside" : "convexity_board_relations_convex");
        return t(outside ? "convexity_board_relations_concave_outside" : "convexity_board_relations_concave");
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = () => Math.max(1, this.displaySettings.strokeWidth * 0.5);
        const fontSize = () => this.displaySettings.fontSize;
        const revealed = () => model().secondDerivativeVisible;
        const f = (x: number) => view().example.value(x);

        // Layers, lowest first: the drop lines, the function, the chord, the tangent, the markers, the sign strip.
        const dropLine = (x: () => number) => this.own(board.create("segment", [[x, 0], [x, () => f(x())]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));
        dropLine(() => model().a);
        dropLine(() => model().b);
        dropLine(() => model().t);

        this.own(board.create("functiongraph", [f], {strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth}));
        this.own(board.create("segment", [[() => model().a, () => f(model().a)], [() => model().b, () => f(model().b)]], {
            strokeColor: GraphPalette.comparisonCurve, dash: CHORD_DASH, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 1.2),
            highlight: false, fixed: true, withLabel: false,
        }));
        this.own(board.create("functiongraph", [(x: number) => lineAt(view().tangent, x)], {
            strokeColor: GraphPalette.constructionAccent, dash: TANGENT_DASH, strokeWidth, highlight: false, fixed: true,
        }));

        // The points of the graph above a, b and t.
        const valuePoint = (x: () => number, color: string) => this.own(board.create("point", [x, () => f(x())], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, fillColor: color, highlightFillColor: color,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        }));
        valuePoint(() => model().a, GraphPalette.comparisonCurve);
        valuePoint(() => model().b, GraphPalette.comparisonCurve);
        valuePoint(() => model().t, GraphPalette.constructionAccent);

        // The inflection point of f: an open ring on the graph with a label, once the second derivative is shown.
        const inflection = () => revealed() ? view().inflection : undefined;
        // How many pixels the inflection label must move left to stay inside the board (0 when it fits right of the ring). The
        // anchor never changes: JSXGraph clips text to the board using the position of the previous draw.
        const inflectionLabelShiftPx = () => {
            const x = inflection();
            if (x === undefined) return 0;
            const [, , right] = board.getBoundingBox();
            const widthPx = t("convexity_board_inflection", {value0: this.number(x)}).length * Math.max(10, fontSize() * 0.9) * 0.62 + 12;
            return Math.max(0, widthPx + LABEL_EDGE_MARGIN_PX - (right - x) * board.unitX);
        };
        for (let slot = 0; slot < MAX_INFLECTIONS; slot++) {
            this.own(board.create("point", [() => inflection() ?? 0, () => f(inflection() ?? 0)], {
                ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, visible: () => inflection() !== undefined,
                size: () => Math.max(5, this.displaySettings.pointSize + 1), fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface,
                strokeColor: GraphPalette.additionalCurves[2], highlightStrokeColor: GraphPalette.additionalCurves[2],
                strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth),
            }));
            this.own(board.create("text", [() => (inflection() ?? 0) - inflectionLabelShiftPx() / board.unitX, () => f(inflection() ?? 0), () => {
                const x = inflection();
                return x === undefined ? "" : `<div>${escapeHtml(t("convexity_board_inflection", {value0: this.number(x)}))}</div>`;
            }], {
                // Right of the ring, below the axis; with no room on the right (a narrow board) it moves left and above the axis,
                // clear of the a, b and t labels.
                anchorX: "left", anchorY: () => inflectionLabelShiftPx() > 0 ? "bottom" : "top",
                fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
                fontSize: () => Math.max(10, fontSize() * 0.9), cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE, visible: () => inflection() !== undefined,
            }));
        }

        // The sign of f'' on every piece of the view (and a 0 where f'' vanishes), in a row at the top: + and − marks, not colour only.
        const stripY = () => {
            const [, top, , bottom] = board.getBoundingBox();
            return top - 0.07 * (top - bottom);
        };
        const signText = (content: () => string, x: () => number, shown: () => boolean) => this.own(board.create("text", [x, stripY, content], {
            anchorX: "middle", anchorY: "top", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            fontSize: () => fontSize() * 1.5, cssStyle: SIGN_STYLE, highlightCssStyle: SIGN_STYLE, visible: shown,
        }));
        for (let index = 0; index < MAX_PIECES; index++) {
            const piece = () => revealed() ? this.piecesInView(view().example)[index] : undefined;
            signText(() => piece() ? SIGN_CHARACTER[piece()!.sign] : "", () => piece() ? this.signMarkX(piece()!.from, piece()!.to) : 0, () => piece() !== undefined);
        }
        for (let index = 0; index < MAX_ZEROS; index++) {
            const zero = () => {
                if (!revealed()) return undefined;
                const [left, , right] = board.getBoundingBox();
                return view().example.secondDerivativeZeros.filter(x => x > left && x < right)[index];
            };
            // The y-axis tick labels sit left of x = 0, so a 0 mark there is set just right of the axis.
            signText(() => zero() === undefined ? "" : "0", () => (zero() ?? 0) + (zero() === 0 ? ZERO_MARK_OFFSET_PX / board.unitX : 0), () => zero() !== undefined);
        }

        // a, b and t are dragged along the x-axis, projected onto the grid and onto the range the model allows; a value the model still refuses puts the point back.
        this.pointA = this.axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left", color: GraphPalette.comparisonCurve, step: CONVEXITY_X_STEP,
            min: () => CONVEXITY_X_MIN, max: () => cleanNumber(model().b - CONVEXITY_X_STEP), write: x => this.setA(x, {syncScene: false}),
        });
        this.pointB = this.axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right", color: GraphPalette.comparisonCurve, step: CONVEXITY_X_STEP,
            min: () => cleanNumber(model().a + CONVEXITY_X_STEP), max: () => CONVEXITY_X_MAX, write: x => this.setB(x, {syncScene: false}),
        });
        this.pointT = this.axisPoint({
            x: model().t, name: "$$t$$", placement: "below", color: GraphPalette.constructionAccent, step: CONVEXITY_X_STEP,
            min: () => CONVEXITY_X_MIN, max: () => CONVEXITY_X_MAX, write: x => this.setT(x, {syncScene: false}),
        });

        // The formula, the points, the verdict (or the word hidden) and the keys stay on the board (projection needs them).
        this.caption("bottom-right", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {text: () => t("convexity_board_interval", {value0: this.number(model().a), value1: this.number(model().b), value2: this.number(model().t)})},
            {
                text: () => this.boardVerdict(model(), view()),
                color: () => revealed() && view().verdict.kind === "none" ? GraphPalette.warningText : GraphPalette.label,
            },
            {
                text: () => this.boardRelations(model(), view()) ?? "",
                visible: () => this.boardRelations(model(), view()) !== undefined,
                minBoardWidth: 520,
            },
            {text: () => t("convexity_board_key"), minBoardWidth: 520},
            {text: () => t("convexity_board_signs_key"), visible: revealed, minBoardWidth: 520},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {a, b, t: tangentPoint} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
        this.pointT?.moveTo([tangentPoint, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.pointT = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): ConvexityModel {
        const state = this.state;
        return {example: state.example, a: state.a, b: state.b, t: state.t, secondDerivativeVisible: state.secondDerivativeVisible};
    }

    protected renderControls(): React.ReactNode {
        const state = this.stateModel();
        const range = {value0: formatNumber(CONVEXITY_X_MIN, currentLanguage()), value1: formatNumber(CONVEXITY_X_MAX, currentLanguage())};
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("convexity_example_label")} value={state.example} help={t("convexity_example_help")}
                              options={CONVEXITY_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("convexity_a_label")} value={state.a} min={CONVEXITY_X_MIN} max={CONVEXITY_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("convexity_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <NumberInput label={t("convexity_b_label")} value={state.b} min={CONVEXITY_X_MIN} max={CONVEXITY_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("convexity_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/>
                <NumberInput label={t("convexity_t_label")} value={state.t} min={CONVEXITY_X_MIN} max={CONVEXITY_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("convexity_t_rejected_hint", range)} onChange={next => this.ignoreOutOfDomain(() => this.setT(next))}/>
                <p className="inspector-help">{t("convexity_order_help")}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const state = this.stateModel();
        return <>
            <div className="convexity-actions" role="group" aria-label={t("convexity_actions_label")}>
                <button type="button" data-action="toggle-second-derivative" data-revealed={state.secondDerivativeVisible}
                        onClick={() => this.setSecondDerivativeVisible(!this.model.secondDerivativeVisible)}>
                    {state.secondDerivativeVisible ? t("convexity_hide_second_derivative") : t("convexity_show_second_derivative")}
                </button>
            </div>
            <p className="inspector-help">{t("convexity_second_derivative_help")}</p>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("convexity_legend_function"), kind: "line"},
            {id: "chord", color: GraphPalette.comparisonCurve, label: t("convexity_legend_chord"), kind: "line"},
            {id: "tangent", color: GraphPalette.constructionAccent, label: t("convexity_legend_tangent"), kind: "dashed-line"},
            {id: "inflection", color: GraphPalette.additionalCurves[2], label: t("convexity_legend_inflection"), kind: "ring"},
        ]}/>;
    }

    /** The statuses to state in words (no changing numbers except the fixed zero of f''); each has a stable id. */
    private statuses(model: ConvexityModel, view: View): { id: StatusKind; text: string }[] {
        if (!model.secondDerivativeVisible) return [{id: "hidden", text: t("convexity_status_hidden")}];
        const result: { id: StatusKind; text: string }[] = [{id: "revealed", text: t("convexity_status_revealed")}];
        if (view.verdict.kind === "none") result.push({id: "no-claim", text: t("convexity_status_no_claim")});
        else if (view.tangentClaim.kind === "none") result.push({id: "tangent-outside", text: t("convexity_status_tangent_outside")});
        if (view.flatZeros.length > 0) {
            result.push({id: "zero-without-change", text: t("convexity_status_zero_without_change", {value0: view.flatZeros.map(x => this.number(x)).join("; ")})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const language: NumberLanguage = currentLanguage();
        const view = this.viewOf(model);
        const number = (value: number) => formatNumber(value, language, PRECISE);
        const hidden = t("convexity_hidden");
        const shown = model.secondDerivativeVisible;
        const rows = [
            {id: "a", label: t("convexity_a_label"), value: number(model.a)},
            {id: "b", label: t("convexity_b_label"), value: number(model.b)},
            {id: "t", label: t("convexity_t_label"), value: number(model.t)},
            {id: "chord", label: t("convexity_readout_chord"), value: formatLineEquation(view.chord, language, PRECISE)},
            {id: "tangent", label: t("convexity_readout_tangent"), value: formatLineEquation(view.tangent, language, PRECISE)},
            {id: "second-derivative-sign", label: t("convexity_readout_sign"), value: shown ? this.signText(view.sign) : hidden},
            {id: "verdict", label: t("convexity_readout_verdict"), value: shown ? this.verdictText(view.verdict) : hidden},
            {id: "tangent-verdict", label: t("convexity_readout_tangent_verdict"), value: shown ? this.tangentClaimText(view.tangentClaim) : hidden},
            {id: "inflection", label: t("convexity_readout_inflection"), value: shown ? this.inflectionText(view) : hidden},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("convexity_note")}/>
            <div className="inspector-group convexity-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-convexity-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default ConvexityGraph;
