import React from "react";
import BaseFunctionGraph, {cleanNumber, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {message, Message, MessageNumber, MessageParameter, messageNumber, renderMessage, t} from "../../localization";
import {NonVerticalLine} from "../../analysis/derivative";
import {
    isDifferentiableOn, MatchSet, matchingPoints, MEAN_VALUE_EXAMPLE_IDS, meanValueExample, MeanValueExample,
    MeanValueExampleId, MVT_X_MAX, MVT_X_MIN, MVT_X_STEP, secantLineOf, secantSlope, tangentLineOf, tangentSlope,
} from "../../analysis/meanValue";
import {
    chooseMeanValueExample, MEAN_VALUE_EXAMPLE_MODELS, MeanValueEdit, MeanValueModel, MeanValuePoint, moveMeanValuePoint,
} from "../../analysis/meanValueModel";
import {meanValueEditMessage} from "./meanValueMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {RevealButton} from "../../inputs/RevealButton";

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
const FORMULA_TEX: Readonly<Record<MeanValueExampleId, string>> = {square: "x^{2}", cube: "x^{3}", abs: "|x|"};

/**
 * The ids of the mean value declaration: a, b and c are board pucks and the matching points are a switch puck; the readout rows are the
 * three points, the three function values, the slopes and the matching points; the drawn objects are the legend.
 */
export type MeanValueIds = {
    param: "mvt-a" | "mvt-b" | "mvt-c";
    row: "a" | "b" | "c" | "f-a" | "f-b" | "f-c" | "secant-slope" | "tangent-slope" | "difference" | "matches"; note: never;
    legend: "function" | "secant" | "tangent" | "matches"; section: never; action: "show-matches";
};

/** The height in user units under the x-axis that the labels of a, b and c use (the board is about 7.5 units high by default). */
const AXIS_LABEL_DEPTH = 0.6;

/** Messages joined by a separator message, left to right ("a; b"); one part is itself. */
const joinMessages = (parts: readonly MessageParameter[]): MessageParameter =>
    parts.reduce((joined, part) => message("mean_value_join_semicolon", {value0: joined, value1: part}));

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
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections["mean-value"];
    }

    protected defaultModel(): MeanValueModel {
        return {...MEAN_VALUE_EXAMPLE_MODELS.square};
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

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    protected setExample(value: unknown): void {
        this.commitModel(this.accept(chooseMeanValueExample(value)));
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        this.movePoint('a', value, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        this.movePoint('b', value, options);
    }

    protected setC(value: number, options: { syncScene?: boolean } = {}): void {
        this.movePoint('c', value, options);
    }

    /** Moves a point by the model's rules; a refused move throws a `DomainError` (localized) and leaves the model unchanged. */
    private movePoint(point: MeanValuePoint, value: number, options: { syncScene?: boolean }): void {
        const next = this.accept(moveMeanValuePoint(this.model, point, value));
        if (next !== this.model) this.commitModel(next, options);
    }

    private accept(edit: MeanValueEdit): MeanValueModel {
        if (!edit.ok) throw new DomainError(meanValueEditMessage(edit.issue));
        return edit.model;
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

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = this.displayThinWidth(0.8);
        const thick = () => Math.max(3, this.displaySettings.strokeWidth * 2);
        const marker = (index: number) => this.markers(this.model, view())[index];

        // Layers, lowest first: the function, the secant, the tangents, the lines, then the points.
        this.drawn.clear();
        this.drawn.set("function", this.own(board.create("functiongraph", [(x: number) => view().example.value(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        })));
        this.drawn.set("secant", this.own(board.create("functiongraph", [(x: number) => lineAt(view().secant, x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth: thin,
        })));
        this.drawn.set("tangent", this.own(board.create("functiongraph", [(x: number) => lineAt(view().tangent, x)], {
            strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true, strokeWidth, visible: () => view().tangent !== undefined,
        })));

        // The tangents at the revealed matching points are parallel to the secant (same slope).
        for (let index = 0; index < MAX_MARKERS; index++) {
            const parallel = this.own(board.create("functiongraph", [(x: number) => {
                const m = marker(index);
                return m === undefined ? NaN : view().example.value(m) + view().secantSlope * (x - m);
            }], {
                strokeColor: GraphPalette.constructionAccent, dash: 2, highlight: false, fixed: true, strokeWidth: thin, visible: () => marker(index) !== undefined,
            }));
            if (index === 0) this.drawn.set("matches", parallel);
        }

        // When every point of the interval matches (|x| on one side of its corner) the interval itself is marked on the axis.
        const matchingInterval = () => {
            const {matches} = view();
            return model().revealed && matches.kind === "interval" ? matches : undefined;
        };
        this.drawn.set("matches-interval", this.own(board.create("segment", [[() => matchingInterval()?.from ?? 0, 0], [() => matchingInterval()?.to ?? 0, 0]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: thick, highlight: false, fixed: true, withLabel: false,
            visible: () => matchingInterval() !== undefined,
        })));

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

        // Nothing else stays on the board: the formula is a declared row, the slopes and the matching points are readout rows and the
        // status lines are the status of the readouts (owner, 2026-11-27).
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
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {example, a, b, c} = this.model;
        return <>
            <PuckOwnedGroup params={["mvt-c"]} className="inspector-group">
                <PuckOwned param="mvt-c"><Slider customText={t("mean_value_c_label")} value={c} min={MVT_X_MIN} max={MVT_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("mean_value_c_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setC(next))}/></PuckOwned>
                <p className="inspector-help">{t("mean_value_order_help")}</p>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("mean_value_example_label")} value={example} help={t("mean_value_example_help")}
                              options={MEAN_VALUE_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <PuckOwnedGroup params={["mvt-a", "mvt-b"]} className="inspector-group">
                <PuckOwned param="mvt-a"><Slider customText={t("mean_value_a_label")} value={a} min={MVT_X_MIN} max={MVT_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("mean_value_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/></PuckOwned>
                <PuckOwned param="mvt-b"><Slider customText={t("mean_value_b_label")} value={b} min={MVT_X_MIN} max={MVT_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("mean_value_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/></PuckOwned>
            </PuckOwnedGroup>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const {revealed} = this.model;
        return <PuckOwnedGroup params={["show-matches"]}>
            <div className="mean-value-actions" role="group" aria-label={t("mean_value_actions_label")}>
                <RevealButton action="toggle-matches" revealed={revealed} showLabel={t("mean_value_show_matches")} hideLabel={t("mean_value_hide_matches")}
                              onToggle={() => this.setRevealed(!this.model.revealed)}/>
            </div>
            <p className="inspector-help">{t("mean_value_matches_help")}</p>
        </PuckOwnedGroup>;
    }

    /** The legend is declared: the graph's own legend panel renders nothing. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "mvt-a": {read: () => this.model.a, apply: (value: number) => this.setA(value)},
            "mvt-b": {read: () => this.model.b, apply: (value: number) => this.setB(value)},
            "mvt-c": {read: () => this.model.c, apply: (value: number) => this.setC(value)},
        };
    }

    /**
     * The common declaration (rows, note, status, view marks) plus a, b and c as board pucks, the matching points as a switch puck and the
     * legend of the drawn objects. The tangent is listed while it exists (not at a corner), the matching points once they are drawn.
     */
    protected override declaration(): GraphDeclaration {
        const model = this.model;
        const view = this.viewOf(model);
        const point = (key: "mvt-a" | "mvt-b" | "mvt-c", label: "mean_value_a_name" | "mean_value_b_name" | "mean_value_c_name", symbol: string) => ({
            key, kind: "range" as const, label: message(label), symbol, help: message("mean_value_order_help"), placement: "board" as const,
            min: MVT_X_MIN, max: MVT_X_MAX, step: MVT_X_STEP, maxDecimals: PRECISE,
        });
        return {
            ...this.commonDeclaration(),
            formula: {label: message("mean_value_formula_label"), tex: `f(x)=${FORMULA_TEX[model.example]}`},
            parameters: [point("mvt-a", "mean_value_a_name", "a"), point("mvt-b", "mean_value_b_name", "b"), point("mvt-c", "mean_value_c_name", "c")],
            legend: [
                {id: "function", label: message("mean_value_legend_function"), kind: "line", object: "function"},
                {id: "secant", label: message("mean_value_legend_secant"), kind: "line", object: "secant"},
                ...(view.tangent !== undefined ? [{id: "tangent" as const, label: message("mean_value_legend_tangent"), kind: "line" as const, object: "tangent"}] : []),
                ...(this.matchesDrawn(model, view) ? [{id: "matches" as const, label: message("mean_value_legend_matches"), kind: "line" as const, object: "matches"}] : []),
            ],
            actions: [
                {id: "show-matches", label: message("mean_value_actions_label"), help: message("mean_value_matches_help"), placement: "board", enabled: true,
                    pressed: model.revealed, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "show-matches") runAs("learner", () => this.setRevealed(!this.model.revealed));
        else throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        // The matching points are drawn as parallel tangents and rings, or as one interval on the axis: the entry follows whichever is drawn.
        const drawn = id === "matches" && this.viewOf(this.model).matches.kind === "interval" ? this.drawn.get("matches-interval") : this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp("strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** True when the revealed matching points are drawn: isolated points (rings and tangents) or an interval on the axis. */
    private matchesDrawn(model: MeanValueModel, view: View): boolean {
        return this.markers(model, view).length > 0 || (model.revealed && view.matches.kind === "interval");
    }

    /** The matching points as a message: each interior point, an interval, or the word for none (hidden until revealed). */
    private matchesMessage(model: MeanValueModel, view: View): Message | MessageNumber {
        if (!model.revealed) return message("mean_value_matches_hidden");
        const {matches} = view;
        if (matches.kind === "interval") {
            return message("mean_value_matches_interval", {value0: messageNumber(matches.from, PRECISE), value1: messageNumber(matches.to, PRECISE)});
        }
        if (matches.points.length === 0) return message("mean_value_matches_none");
        const [first, ...rest] = matches.points;
        return rest.reduce<Message | MessageNumber>((joined, point) => message("mean_value_join_semicolon", {value0: joined, value1: messageNumber(point, PRECISE)}), messageNumber(first, PRECISE));
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: MeanValueModel, view: View): { id: StatusKind; text: Message }[] {
        const result: { id: StatusKind; text: Message }[] = [];
        const number = (value: number) => messageNumber(value, PRECISE);
        if (!view.differentiable) result.push({id: "hypothesis", text: message("mean_value_status_hypothesis")});
        if (view.difference === undefined) result.push({id: "corner", text: message("mean_value_status_corner")});
        else if (this.agree(view)) result.push({id: "agree", text: message("mean_value_status_agree", {value0: messageNumber(MATCH_TOLERANCE, 3)})});
        else result.push({id: "differ", text: message("mean_value_status_differ")});
        if (model.revealed) {
            const {matches} = view;
            if (matches.kind === "interval") {
                result.push({id: "matches-interval", text: message("mean_value_status_match_interval", {value0: number(matches.from), value1: number(matches.to)})});
            } else if (matches.points.length === 0) {
                result.push({id: "matches-none", text: message("mean_value_status_match_none")});
            } else if (matches.points.length === 1) {
                result.push({id: "matches", text: message("mean_value_status_match_one", {value0: number(matches.points[0])})});
            } else if (matches.points.length === 2) {
                result.push({id: "matches", text: message("mean_value_status_match_two", {value0: number(matches.points[0]), value1: number(matches.points[1])})});
            } else {
                result.push({id: "matches", text: message("mean_value_status_match_many", {value0: joinMessages(matches.points.map(number))})});
            }
        }
        return result;
    }

    /**
     * Declared by the base (task 08): the readout rows, the note, the statuses and the drawn curves; the readout panel is drawn from the
     * same data. The marks keep the function, the secant, the tangents, the points a, b and c on the axis with their labels below it and
     * the points on the graph in sight.
     */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const {example} = view;
        const number = (value: number) => messageNumber(value, PRECISE);
        const undefinedText = message("mean_value_undefined");
        const markers = this.markers(model, view);
        const onGraph = [model.a, model.b, model.c, ...markers].map(x => ({x, y: example.value(x)}));
        return {
            rows: [
                {id: "a", name: message("mean_value_a_name"), symbol: "a", value: number(model.a)},
                {id: "b", name: message("mean_value_b_name"), symbol: "b", value: number(model.b)},
                {id: "c", name: message("mean_value_c_name"), symbol: "c", value: number(model.c)},
                {id: "f-a", symbol: "f(a)", value: number(example.value(model.a))},
                {id: "f-b", symbol: "f(b)", value: number(example.value(model.b))},
                {id: "f-c", symbol: "f(c)", value: number(example.value(model.c))},
                {id: "secant-slope", name: message("mean_value_readout_secant"), value: number(view.secantSlope)},
                {id: "tangent-slope", name: message("mean_value_readout_tangent"), value: view.tangentSlope === undefined ? undefinedText : number(view.tangentSlope)},
                {id: "difference", name: message("mean_value_readout_difference"), value: view.difference === undefined ? undefinedText : number(view.difference)},
                {id: "matches", name: message("mean_value_readout_matches"), value: this.matchesMessage(model, view)},
            ],
            help: message("mean_value_note", {value0: messageNumber(MATCH_TOLERANCE, 3)}),
            status: this.statuses(model, view),
            plotted: [
                (x: number) => example.value(x),
                (x: number) => lineAt(view.secant, x),
                (x: number) => lineAt(view.tangent, x),
            ],
            must: [
                ...[model.a, model.b, model.c].flatMap(x => [{x, y: 0}, {x, y: -AXIS_LABEL_DEPTH}]),
                ...onGraph,
                ...(view.matches.kind === "interval" && model.revealed ? [{x: view.matches.from, y: 0}, {x: view.matches.to, y: 0}] : []),
            ],
        };
    }

    protected renderReadout(): React.ReactNode {
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="mean-value-status" dataAttribute="mean-value-status" lines={(this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default MeanValueGraph;
