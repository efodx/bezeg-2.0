import React from "react";
import BaseFunctionGraph, {cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {NonVerticalLine} from "../../analysis/derivative";
import {
    isDifferentiableOn, isMeanValueExampleId, isMeanValueX, isOrdered, MatchSet, matchingPoints, MEAN_VALUE_EXAMPLE_IDS, meanValueExample, MeanValueExample,
    MeanValueExampleId, MVT_X_MAX, MVT_X_MIN, MVT_X_STEP, secantLineOf, secantSlope, tangentLineOf, tangentSlope,
} from "../../analysis/meanValue";
import {MEAN_VALUE_EXAMPLE_MODELS, MeanValueModel, parseMeanValueModel} from "../../analysis/meanValueModel";
import {GraphPalette} from "../styles/GraphPalette";

/**
 * Two slopes closer than this are shown as "agreeing". It is a numerical comparison of the displayed numbers, not a proof
 * (the note under the readout says so); the matching points themselves are computed by formula (`matchingPoints`).
 */
export const MATCH_TOLERANCE = 0.005;

/** Slopes and positions show four decimals so that c = ±0.5774 (±1/√3) can be read off. */
const PRECISE = 4;

/** At most this many matching markers are drawn (the named examples have at most two interior matches). */
const MAX_MARKERS = 2;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<MeanValueExampleId, string>> = {square: "x²", cube: "x³", abs: "|x|"};
const exampleTitle = (id: MeanValueExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;

type StatusKind = "differ" | "agree" | "corner" | "hypothesis" | "matches" | "matches-none" | "matches-interval";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: MeanValueExample;
    secant: NonVerticalLine;
    secantSlope: number;
    /** Undefined at a corner: there is no tangent line and no tangent slope. */
    tangent?: NonVerticalLine;
    tangentSlope?: number;
    difference?: number;
    differentiable: boolean;
    matches: MatchSet;
}

/** The line's value at x, or NaN (draws nothing) when there is no line. */
const lineAt = (line: NonVerticalLine | undefined, x: number): number => (line ? line.slope * x + line.intercept : NaN);

/**
 * The mean value theorem: the secant of f through (a, f(a)) and (b, f(b)), the tangent at an independent point c with
 * a < c < b, both slopes and their difference. The model is `{example, a, b, c, revealed}`; the mathematics lives in
 * `src/analysis/meanValue` and the matching points are recomputed from the model, never stored.
 *
 * Ordering rule (reject, never clamp): a < c < b always holds. A setter whose value would break it throws a
 * `DomainError` and leaves the model unchanged; so a drag or an input that would push an endpoint through c is refused,
 * and the way to move an endpoint past the current c is to move c first. Changing c never moves a or b, and changing a or
 * b never moves c. The inspector's number fields and the lesson actions use the same setters as dragging.
 *
 * `revealed` is part of the model (the Show matching point action, also the `matching-points` lesson element): it is
 * saved with a preset and a lesson checkpoint, survives edits of a, b and c (the matching points then follow) and is
 * reset by choosing an example. Dragging is the pointer alternative; the labelled number fields are the keyboard and
 * touch alternative.
 */
export class MeanValueGraph extends BaseFunctionGraph<MeanValueModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    private pointC?: JXG.Point;

    override presets(): string {
        return "mean-value";
    }

    protected defaultModel(): MeanValueModel {
        return {...MEAN_VALUE_EXAMPLE_MODELS.square};
    }

    protected parseModel(data: unknown): MeanValueModel | undefined {
        return parseMeanValueModel(data);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-2.5, 5, 4, -2.5];
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    private viewOf(model: MeanValueModel): View {
        const example = meanValueExample(model.example);
        const {a, b, c} = model;
        const tangent = tangentLineOf(example, a, c, b);
        const slope = tangentSlope(example, a, c, b);
        const secant = secantSlope(example, a, b);
        return {
            example, secant: secantLineOf(example, a, b), secantSlope: secant, tangent, tangentSlope: slope,
            difference: slope === undefined ? undefined : slope - secant,
            differentiable: isDifferentiableOn(example, a, b),
            matches: matchingPoints(example, a, b),
        };
    }

    /** The matching points to mark (empty unless revealed and the matches are isolated points). */
    private markers(model: MeanValueModel, view: View): number[] {
        return model.revealed && view.matches.kind === "points" ? view.matches.points.slice(0, MAX_MARKERS) : [];
    }

    private agree(view: View): boolean {
        return view.difference !== undefined && Math.abs(view.difference) <= MATCH_TOLERANCE;
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    protected setExample(value: unknown): void {
        if (!isMeanValueExampleId(value)) throw new DomainError(`The example must be one of ${MEAN_VALUE_EXAMPLE_IDS.join(", ")}.`);
        this.commitModel({...MEAN_VALUE_EXAMPLE_MODELS[value]});
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isMeanValueX(value)) throw new DomainError(`The endpoint a must be a finite number between ${MVT_X_MIN} and ${MVT_X_MAX}.`);
        if (!(value < this.model.c)) throw new DomainError("The endpoint a must be less than c (a < c < b): move c first.");
        if (value !== this.model.a) this.commitModel({...this.model, a: cleanNumber(value)}, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isMeanValueX(value)) throw new DomainError(`The endpoint b must be a finite number between ${MVT_X_MIN} and ${MVT_X_MAX}.`);
        if (!(value > this.model.c)) throw new DomainError("The endpoint b must be greater than c (a < c < b): move c first.");
        if (value !== this.model.b) this.commitModel({...this.model, b: cleanNumber(value)}, options);
    }

    protected setC(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isMeanValueX(value)) throw new DomainError(`The point c must be a finite number between ${MVT_X_MIN} and ${MVT_X_MAX}.`);
        if (!isOrdered(this.model.a, value, this.model.b)) throw new DomainError("The point c must lie strictly between a and b (a < c < b).");
        if (value !== this.model.c) this.commitModel({...this.model, c: cleanNumber(value)}, options);
    }

    protected setRevealed(visible: boolean): void {
        if (visible !== this.model.revealed) this.commitModel({...this.model, revealed: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"mvt-a": value => this.setA(value), "mvt-b": value => this.setB(value), "mvt-c": value => this.setC(value)},
            visibility: {"matching-points": visible => this.setRevealed(visible)},
            choices: {"mean-value-example": value => this.setExample(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The short status line of the board, or undefined when there is nothing to state. */
    private boardStatus(model: MeanValueModel, view: View): string | undefined {
        if (view.tangent === undefined) return t("mean_value_board_corner");
        if (model.revealed && view.matches.kind === "points" && view.matches.points.length === 0) return t("mean_value_board_none");
        if (this.agree(view)) return t("mean_value_board_agree");
        return undefined;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = () => Math.max(1, this.displaySettings.strokeWidth * 0.8);
        const thick = () => Math.max(3, this.displaySettings.strokeWidth * 2);
        const marker = (index: number) => this.markers(this.model, view())[index];

        // Layers, lowest first: the function, the secant, the tangents, the lines, then the points.
        this.own(board.create("functiongraph", [(x: number) => view().example.value(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        }));
        this.own(board.create("functiongraph", [(x: number) => lineAt(view().secant, x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth: thin,
        }));
        this.own(board.create("functiongraph", [(x: number) => lineAt(view().tangent, x)], {
            strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true, strokeWidth, visible: () => view().tangent !== undefined,
        }));

        // The tangents at the revealed matching points are parallel to the secant (same slope).
        for (let index = 0; index < MAX_MARKERS; index++) {
            this.own(board.create("functiongraph", [(x: number) => {
                const m = marker(index);
                return m === undefined ? NaN : view().example.value(m) + view().secantSlope * (x - m);
            }], {
                strokeColor: GraphPalette.constructionAccent, dash: 2, highlight: false, fixed: true, strokeWidth: thin, visible: () => marker(index) !== undefined,
            }));
        }

        // When every point of the interval matches (|x| on one side of its corner) the interval itself is marked on the axis.
        const matchingInterval = () => {
            const {matches} = view();
            return model().revealed && matches.kind === "interval" ? matches : undefined;
        };
        this.own(board.create("segment", [[() => matchingInterval()?.from ?? 0, 0], [() => matchingInterval()?.to ?? 0, 0]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: thick, highlight: false, fixed: true, withLabel: false,
            visible: () => matchingInterval() !== undefined,
        }));

        // Drop lines from the axis to the graph at a, b and c, and the function values on the graph.
        const dropLine = (x: () => number) => this.own(board.create("segment", [[x, 0], [x, () => view().example.value(x())]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));
        dropLine(() => model().a);
        dropLine(() => model().b);
        dropLine(() => model().c);
        const valuePoint = (x: () => number, color: string) => this.own(board.create("point", [x, () => view().example.value(x())], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, fillColor: color, highlightFillColor: color,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        }));
        valuePoint(() => model().a, GraphPalette.comparisonCurve);
        valuePoint(() => model().b, GraphPalette.comparisonCurve);
        valuePoint(() => model().c, GraphPalette.constructionAccent);

        // The matching points: open rings on the graph.
        for (let index = 0; index < MAX_MARKERS; index++) {
            this.own(board.create("point", [() => marker(index) ?? 0, () => {
                const m = marker(index);
                return m === undefined ? 0 : view().example.value(m);
            }], {
                ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, visible: () => marker(index) !== undefined,
                size: () => Math.max(4, this.displaySettings.pointSize), fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface,
                strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent,
                strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth),
            }));
        }

        // a, b and c are dragged along the x-axis. A drag is projected onto the grid and onto the range the ordering a < c < b
        // allows; a value the model still refuses puts the point back.
        const dragWrite = (apply: (x: number) => void) => (x: number) => {
            const accepted = this.ignoreOutOfDomain(() => apply(x));
            if (!accepted) this.syncSceneToModel();
            return accepted;
        };
        const axisPoint = (config: { x: number; name: string; placement: "below-left" | "below-right" | "below"; color: string; min: () => number; max: () => number; write: (x: number) => void }) =>
            this.slidingPoint({
                x: config.x, position: () => 0, min: config.min, max: config.max, step: MVT_X_STEP,
                attributes: {
                    ...this.styles.point.default, name: config.name, label: this.pointLabel(config.placement),
                    fillColor: config.color, highlightFillColor: config.color,
                },
                write: dragWrite(config.write),
            });
        this.pointA = axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left", color: GraphPalette.comparisonCurve,
            min: () => MVT_X_MIN, max: () => cleanNumber(model().c - MVT_X_STEP), write: x => this.setA(x, {syncScene: false}),
        });
        this.pointB = axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right", color: GraphPalette.comparisonCurve,
            min: () => cleanNumber(model().c + MVT_X_STEP), max: () => MVT_X_MAX, write: x => this.setB(x, {syncScene: false}),
        });
        this.pointC = axisPoint({
            x: model().c, name: "$$c$$", placement: "below", color: GraphPalette.constructionAccent,
            min: () => cleanNumber(model().a + MVT_X_STEP), max: () => cleanNumber(model().b - MVT_X_STEP), write: x => this.setC(x, {syncScene: false}),
        });

        // The formula, both slopes and the status stay on the board, in the corner no default curve reaches.
        this.caption("bottom-right", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {
                text: () => {
                    const current = view();
                    const secant = formatNumber(current.secantSlope, language(), PRECISE);
                    return current.tangentSlope === undefined
                        ? t("mean_value_board_slopes_corner", {value0: secant})
                        : t("mean_value_board_slopes", {value0: secant, value1: formatNumber(current.tangentSlope, language(), PRECISE)});
                },
            },
            {
                text: () => this.boardStatus(model(), view()) ?? "",
                visible: () => this.boardStatus(model(), view()) !== undefined,
                color: () => view().tangent === undefined ? GraphPalette.warningText : GraphPalette.primaryCurve,
            },
        ]);
    }

    protected override syncSceneToModel(): void {
        const {a, b, c} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
        this.pointC?.moveTo([c, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.pointC = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): MeanValueModel {
        const {example, a, b, c, revealed} = this.state;
        return {example, a, b, c, revealed};
    }

    protected renderControls(): React.ReactNode {
        const {example, a, b, c} = this.stateModel();
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("mean_value_example_label")} value={example} help={t("mean_value_example_help")}
                              options={MEAN_VALUE_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("mean_value_a_label")} value={a} min={MVT_X_MIN} max={c} step={0.1} decimals={PRECISE}
                             rejectedHint={t("mean_value_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <NumberInput label={t("mean_value_b_label")} value={b} min={c} max={MVT_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("mean_value_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/>
                <NumberInput label={t("mean_value_c_label")} value={c} min={a} max={b} step={0.1} decimals={PRECISE}
                             rejectedHint={t("mean_value_c_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setC(next))}/>
                <p className="inspector-help">{t("mean_value_order_help")}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const {revealed} = this.stateModel();
        return <>
            <div className="mean-value-actions" role="group" aria-label={t("mean_value_actions_label")}>
                <button type="button" data-action="toggle-matches" data-revealed={revealed}
                        onClick={() => this.setRevealed(!this.model.revealed)}>{revealed ? t("mean_value_hide_matches") : t("mean_value_show_matches")}</button>
            </div>
            <p className="inspector-help">{t("mean_value_matches_help")}</p>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("mean_value_legend_function"), kind: "line"},
            {id: "secant", color: GraphPalette.comparisonCurve, label: t("mean_value_legend_secant"), kind: "line"},
            {id: "tangent", color: GraphPalette.constructionAccent, label: t("mean_value_legend_tangent"), kind: "line"},
            {id: "matches", color: GraphPalette.constructionAccent, label: t("mean_value_legend_matches"), kind: "line"},
        ]}/>;
    }

    /** The matching points as text: each interior point, an interval, or the word for none (hidden until revealed). */
    private matchesText(model: MeanValueModel, view: View, language: NumberLanguage): string {
        if (!model.revealed) return t("mean_value_matches_hidden");
        const {matches} = view;
        if (matches.kind === "interval") {
            return t("mean_value_matches_interval", {value0: formatNumber(matches.from, language, PRECISE), value1: formatNumber(matches.to, language, PRECISE)});
        }
        if (matches.points.length === 0) return t("mean_value_matches_none");
        return matches.points.map(point => formatNumber(point, language, PRECISE)).join("; ");
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: MeanValueModel, view: View, language: NumberLanguage): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        const number = (value: number) => formatNumber(value, language, PRECISE);
        if (!view.differentiable) result.push({id: "hypothesis", text: t("mean_value_status_hypothesis")});
        if (view.difference === undefined) result.push({id: "corner", text: t("mean_value_status_corner")});
        else if (this.agree(view)) result.push({id: "agree", text: t("mean_value_status_agree", {value0: formatNumber(MATCH_TOLERANCE, language, 3)})});
        else result.push({id: "differ", text: t("mean_value_status_differ")});
        if (model.revealed) {
            const {matches} = view;
            if (matches.kind === "interval") {
                result.push({id: "matches-interval", text: t("mean_value_status_match_interval", {value0: number(matches.from), value1: number(matches.to)})});
            } else if (matches.points.length === 0) {
                result.push({id: "matches-none", text: t("mean_value_status_match_none")});
            } else if (matches.points.length === 1) {
                result.push({id: "matches", text: t("mean_value_status_match_one", {value0: number(matches.points[0])})});
            } else if (matches.points.length === 2) {
                result.push({id: "matches", text: t("mean_value_status_match_two", {value0: number(matches.points[0]), value1: number(matches.points[1])})});
            } else {
                result.push({id: "matches", text: t("mean_value_status_match_many", {value0: matches.points.map(number).join("; ")})});
            }
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const language = currentLanguage();
        const view = this.viewOf(model);
        const number = (value: number) => formatNumber(value, language, PRECISE);
        const {example} = view;
        const rows = [
            {id: "a", label: t("mean_value_a_label"), value: number(model.a)},
            {id: "b", label: t("mean_value_b_label"), value: number(model.b)},
            {id: "c", label: t("mean_value_c_label"), value: number(model.c)},
            {id: "f-a", label: "f(a)", value: number(example.value(model.a))},
            {id: "f-b", label: "f(b)", value: number(example.value(model.b))},
            {id: "f-c", label: "f(c)", value: number(example.value(model.c))},
            {id: "secant-slope", label: t("mean_value_readout_secant"), value: number(view.secantSlope)},
            {id: "tangent-slope", label: t("mean_value_readout_tangent"), value: view.tangentSlope === undefined ? t("mean_value_undefined") : number(view.tangentSlope)},
            {id: "difference", label: t("mean_value_readout_difference"), value: view.difference === undefined ? t("mean_value_undefined") : number(view.difference)},
            {id: "matches", label: t("mean_value_readout_matches"), value: this.matchesText(model, view, language)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("mean_value_note", {value0: formatNumber(MATCH_TOLERANCE, language, 3)})}/>
            <div className="inspector-group mean-value-status" role="status" aria-live="polite">
                {this.statuses(model, view, language).map(status => <p key={status.id} className="inspector-help" data-mean-value-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default MeanValueGraph;
