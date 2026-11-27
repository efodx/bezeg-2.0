import React from "react";
import BaseFunctionGraph, {BoundingBox, FillCurve, cleanNumber, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {FunctionStatus} from "./FunctionStatus";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    canRefine, DARBOUX_EXAMPLE_IDS, DARBOUX_N_MAX, DARBOUX_N_MIN, DARBOUX_X_MAX, DARBOUX_X_MIN, DARBOUX_X_STEP, darbouxExample, DarbouxExample,
    DarbouxExampleId, darbouxSubintervals, DarbouxSubinterval, darbouxTotals, DarbouxTotals,
} from "../../analysis/darboux";
import {
    chooseDarbouxExample, DARBOUX_EXAMPLE_MODELS, DarbouxEdit, DarbouxModel, moveDarbouxEndpoint, refineDarbouxPartition, setDarbouxCount,
} from "../../analysis/darbouxModel";
import {guard, guardField} from "../base/controls/guard";
import {darbouxEditMessage} from "./darbouxMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {RevealButton} from "../../inputs/RevealButton";

/** Sums and the integral show four decimals so that 1.75, 3.75 and 8/3 = 2.6667 can be read off. */
const PRECISE = 4;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<DarbouxExampleId, string>> = {square: "x²", sine: "sin x"};
const FORMULA_TEX: Readonly<Record<DarbouxExampleId, string>> = {square: "x^{2}", sine: "\\sin x"};
const exampleTitle = (id: DarbouxExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;


/**
 * Each example has its own view, which becomes the board view whenever the example changes (inspector select or the
 * `darboux-example` lesson action) and for the default scene; a view stored in a preset still wins on import. x^2 on [0, 2]
 * needs y up to 4, sin x on [0, 2 pi] needs x up to 6.3 and y from -1 to 1; one shared view would show one of them tiny.
 * The bottom margin is an empty band for the board caption below the x-axis. With a fixed aspect ratio the board shows
 * `min(width, height)` of the box vertically, so each box is at least as wide as it is tall and its height is what the board shows.
 */
const EXAMPLE_VIEWS: Readonly<Record<DarbouxExampleId, BoundingBox>> = {
    square: [-3.2, 4.6, 5.2, -3.6],
    sine: [-1, 2, 7.6, -4.6],
};

/** The ids of the Darboux declaration: a, b and n and the two sum switches are board pucks; the drawn objects are the legend. */
export type DarbouxIds = {
    param: "darboux-a" | "darboux-b" | "darboux-n";
    row: "a" | "b" | "n" | "lower" | "upper" | "integral" | "gap"; note: never;
    legend: "function" | "lower" | "upper" | "partition"; section: never; action: "show-lower-sum" | "show-upper-sum";
};

type StatusKind = "hidden" | "trapped" | "limit";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: DarbouxExample;
    parts: DarbouxSubinterval[];
    totals: DarbouxTotals;
}

/** The point lists of one family of rectangles (NaN separates the closed outlines): `height` picks the infimum or the supremum. */
function rectangles(parts: readonly DarbouxSubinterval[], height: (part: DarbouxSubinterval) => number): { x: number[]; y: number[] } {
    const x: number[] = [];
    const y: number[] = [];
    parts.forEach((part, index) => {
        if (index > 0) {
            x.push(NaN);
            y.push(NaN);
        }
        const h = height(part);
        x.push(part.x0, part.x0, part.x1, part.x1, part.x0);
        y.push(0, h, h, 0, 0);
    });
    return {x, y};
}

/**
 * Lower and upper (Darboux) sums of x^2 or sin x on an equal partition of [a, b] into n parts. The model is
 * `{example, a, b, n, lowerVisible, upperVisible}`; the infimum and supremum of every part, both sums, the exact integral
 * and their gap are recomputed from the model by `src/analysis/darboux` (exact: no sampling) and never stored.
 *
 * Rules (reject, never clamp): a < b, both in [-7, 7], and n an integer from 1 to 128. A setter that would break one throws a
 * `DomainError` and leaves the model unchanged; dragging is clamped to the allowed range (one grid step short of the other
 * endpoint) and a drag the model still refuses puts the point back. Number fields, lesson actions and drags use the same
 * setters. **Refine** sets n to 2n (a nested partition: every part is bisected) and is unavailable, with an explanation,
 * at the limit. The sums are the sums of the infimum (lower, filled rectangles) and the supremum (upper, dashed outline)
 * on each part; they are not left or right endpoint sums, and the board and the readout say so.
 *
 * `lowerVisible` and `upperVisible` are part of the model (lesson targets `lower-sum` and `upper-sum`), saved with a preset
 * and a lesson checkpoint. While a sum is hidden its rectangles, its readout and the gap are hidden too, so the prediction is
 * not given away; the partition, the graph and the exact integral stay visible. Choosing an example loads its a, b and n and
 * keeps the visibility flags.
 */
export class DarbouxGraph extends BaseFunctionGraph<DarbouxModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections.darboux;
    }

    protected defaultModel(): DarbouxModel {
        return {...DARBOUX_EXAMPLE_MODELS.square};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: DarbouxModel): View {
        return this.memoView(model, () => {
            const example = darbouxExample(model.example);
            return {
                example,
                parts: darbouxSubintervals(example, model.a, model.b, model.n),
                totals: darbouxTotals(example, model.a, model.b, model.n),
            };
        });
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    protected setExample(value: unknown): void {
        const edit = chooseDarbouxExample(this.model, value);
        if (!edit.ok) throw new DomainError(darbouxEditMessage(edit.issue));
        this.commitModel(edit.model);
        if (this.generatedObjectCount > 0) this.boardView.setIntent(EXAMPLE_VIEWS[edit.model.example], {keepAspectRatio: true});
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        this.moveEndpoint("a", value, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        this.moveEndpoint("b", value, options);
    }

    private moveEndpoint(endpoint: "a" | "b", value: number, options: { syncScene?: boolean }): void {
        const edit = moveDarbouxEndpoint(this.model, endpoint, value);
        if (!edit.ok) throw new DomainError(darbouxEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setCount(value: number): void {
        this.applyEdit(setDarbouxCount(this.model, value));
    }

    /** Doubles n (every part is bisected, so the partition is nested); refuses at the limit. */
    protected refinePartition(): void {
        this.applyEdit(refineDarbouxPartition(this.model));
    }

    private applyEdit(edit: DarbouxEdit): void {
        if (!edit.ok) throw new DomainError(darbouxEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
    }

    protected setLowerVisible(visible: boolean): void {
        if (visible !== this.model.lowerVisible) this.commitModel({...this.model, lowerVisible: visible});
    }

    protected setUpperVisible(visible: boolean): void {
        if (visible !== this.model.upperVisible) this.commitModel({...this.model, upperVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"darboux-a": value => this.setA(value), "darboux-b": value => this.setB(value), "darboux-n": value => this.setCount(value)},
            visibility: {"lower-sum": visible => this.setLowerVisible(visible), "upper-sum": visible => this.setUpperVisible(visible)},
            choices: {"darboux-example": value => this.setExample(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private hiddenText(): string {
        return t("darboux_hidden");
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = this.displayThinWidth(0.5);

        // Layers, lowest first: the upper rectangles (taller, dashed outline), the lower rectangles (filled), the partition, the function, then a and b.
        const family = (id: string, config: {
            color: string; fillOpacity: number; dash: number; visible: () => boolean; height: (part: DarbouxSubinterval) => number;
        }) => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: config.color, fillOpacity: config.fillOpacity, strokeColor: config.color, strokeOpacity: 1,
                strokeWidth: () => Math.max(1.5, this.displaySettings.strokeWidth * 0.6), dash: config.dash, highlight: false, fixed: true,
                visible: config.visible,
            })) as unknown as FillCurve;
            this.drawn.set(id, curve as unknown as JXG.GeometryElement);
            curve.updateDataArray = () => {
                const data = config.visible() ? rectangles(view().parts, config.height) : {x: [], y: []};
                curve.dataX = data.x;
                curve.dataY = data.y;
            };
        };
        family("upper", {color: GraphPalette.additionalCurves[1], fillOpacity: 0.1, dash: 2, visible: () => model().upperVisible, height: part => part.sup});
        family("lower", {color: GraphPalette.additionalCurves[0], fillOpacity: 0.5, dash: 0, visible: () => model().lowerVisible, height: part => part.inf});

        // The partition: a thin line from the axis to the graph at every node (always shown, also while both sums are hidden).
        const partition = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: thin, dash: 3, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        this.drawn.set("partition", partition as unknown as JXG.GeometryElement);
        partition.updateDataArray = () => {
            const {parts, example} = view();
            const nodes = [parts[0].x0, ...parts.map(part => part.x1)];
            const x: number[] = [];
            const y: number[] = [];
            nodes.forEach((node, index) => {
                if (index > 0) {
                    x.push(NaN);
                    y.push(NaN);
                }
                x.push(node, node);
                y.push(0, example.value(node));
            });
            partition.dataX = x;
            partition.dataY = y;
        };

        this.drawn.set("function", this.own(board.create("functiongraph", [(x: number) => view().example.value(x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        })));

        // a and b are dragged along the x-axis, projected onto the grid and onto the range a < b allows; a value the model still refuses puts the point back.
        this.pointA = this.axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left", step: DARBOUX_X_STEP,
            min: () => DARBOUX_X_MIN, max: () => cleanNumber(model().b - DARBOUX_X_STEP), write: x => this.setA(x, {syncScene: false}),
        });
        this.pointB = this.axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right", step: DARBOUX_X_STEP,
            min: () => cleanNumber(model().a + DARBOUX_X_STEP), max: () => DARBOUX_X_MAX, write: x => this.setB(x, {syncScene: false}),
        });

        // Nothing stays on the board: the formula is declared, n, the integral and the sums are readout rows, the key to the two kinds of rectangle is the legend (owner, 2026-11-27).
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {example, a, b, n} = this.model;
        const refinable = canRefine(n);
        return <>
            <div className="inspector-group">
                <PuckOwned param="darboux-n">
                    <CountSetter label={t("darboux_n_label")} n={n} min={DARBOUX_N_MIN} max={DARBOUX_N_MAX}
                                 rejectedHint={t("darboux_n_rejected_hint", {value0: DARBOUX_N_MIN, value1: DARBOUX_N_MAX})}
                                 onPlus={() => guard(this.refusals, () => this.setCount(n + 1))}
                                 onMinus={() => guard(this.refusals, () => this.setCount(n - 1))}
                                 onSet={next => guardField(this.refusals, () => this.setCount(next))}/>
                </PuckOwned>
                <div className="darboux-actions" role="group" aria-label={t("darboux_partition_label")}>
                    <UnavailableButton data-action="refine" aria-describedby="darboux-refine-help"
                                       reason={refinable ? undefined : t("darboux_refine_limit", {value0: DARBOUX_N_MAX})}
                                       onPress={() => { guard(this.refusals, () => this.refinePartition()); }}>{t("darboux_refine")}</UnavailableButton>
                </div>
                <p id="darboux-refine-help" className="inspector-help">{t("darboux_refine_help")}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("darboux_example_label")} value={example} help={t("darboux_example_help")}
                              options={DARBOUX_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <PuckOwnedGroup params={["darboux-a", "darboux-b"]} className="inspector-group">
                <PuckOwned param="darboux-a"><Slider customText={t("darboux_a_label")} value={a} min={DARBOUX_X_MIN} max={DARBOUX_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("darboux_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/></PuckOwned>
                <PuckOwned param="darboux-b"><Slider customText={t("darboux_b_label")} value={b} min={DARBOUX_X_MIN} max={DARBOUX_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("darboux_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/></PuckOwned>
                <p className="inspector-help">{t("darboux_order_help")}</p>
            </PuckOwnedGroup>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const {lowerVisible, upperVisible} = this.model;
        return <PuckOwnedGroup params={["show-lower-sum", "show-upper-sum"]}>
            <div className="darboux-actions" role="group" aria-label={t("darboux_sums_label")}>
                <RevealButton action="toggle-lower" revealed={lowerVisible} showLabel={t("darboux_show_lower")} hideLabel={t("darboux_hide_lower")}
                              onToggle={() => this.setLowerVisible(!this.model.lowerVisible)}/>
                <RevealButton action="toggle-upper" revealed={upperVisible} showLabel={t("darboux_show_upper")} hideLabel={t("darboux_hide_upper")}
                              onToggle={() => this.setUpperVisible(!this.model.upperVisible)}/>
            </div>
            <p className="inspector-help">{t("darboux_sums_help")}</p>
        </PuckOwnedGroup>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "darboux-a": {read: () => this.model.a, apply: (value: number) => this.setA(value)},
            "darboux-b": {read: () => this.model.b, apply: (value: number) => this.setB(value)},
            "darboux-n": {read: () => this.model.n, apply: (value: number) => this.setCount(value)},
        };
    }

    /**
     * The common declaration (rows, note, view marks) plus a, b and n as board pucks, the two sum switches as switch pucks and the
     * legend of the drawn objects. A sum is listed only while it is drawn (a hidden sum is not given away).
     */
    protected override declaration(): GraphDeclaration {
        const model = this.model;
        const endpoint = (key: "darboux-a" | "darboux-b", label: "darboux_a_name" | "darboux_b_name", symbol: string) => ({
            key, kind: "range" as const, label: message(label), symbol, help: message("darboux_order_help"), placement: "board" as const,
            min: DARBOUX_X_MIN, max: DARBOUX_X_MAX, step: DARBOUX_X_STEP, maxDecimals: 4,
        });
        return {
            ...this.commonDeclaration(),
            formula: {label: message("darboux_formula_label"), tex: `f(x)=${FORMULA_TEX[model.example]}`},
            parameters: [
                endpoint("darboux-a", "darboux_a_name", "a"),
                endpoint("darboux-b", "darboux_b_name", "b"),
                {key: "darboux-n", kind: "count", label: message("darboux_n_name"), symbol: "n", placement: "board", min: DARBOUX_N_MIN, max: DARBOUX_N_MAX,
                    help: message("darboux_n_rejected_hint", {value0: DARBOUX_N_MIN, value1: DARBOUX_N_MAX})},
            ],
            legend: [
                {id: "function", label: message("darboux_legend_function"), kind: "line", object: "function"},
                ...(model.lowerVisible ? [{id: "lower" as const, label: message("darboux_legend_lower"), kind: "area" as const, object: "lower"}] : []),
                ...(model.upperVisible ? [{id: "upper" as const, label: message("darboux_legend_upper"), kind: "dashed" as const, object: "upper"}] : []),
                {id: "partition", label: message("darboux_legend_partition"), kind: "line", object: "partition"},
            ],
            actions: [
                {id: "show-lower-sum", label: message("darboux_lower_puck"), help: message("darboux_sums_help"), placement: "board", enabled: true,
                    pressed: model.lowerVisible, puck: true},
                {id: "show-upper-sum", label: message("darboux_upper_puck"), help: message("darboux_sums_help"), placement: "board", enabled: true,
                    pressed: model.upperVisible, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "show-lower-sum") runAs("learner", () => this.setLowerVisible(!this.model.lowerVisible));
        else if (id === "show-upper-sum") runAs("learner", () => this.setUpperVisible(!this.model.upperVisible));
        else throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp("strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** The statuses to state in words (no changing numbers: they are announced on every drag step); each has a stable id. */
    private statuses(model: DarbouxModel): { id: StatusKind; text: Message }[] {
        const result: { id: StatusKind; text: Message }[] = [];
        if (!model.lowerVisible || !model.upperVisible) result.push({id: "hidden", text: message("darboux_status_hidden")});
        else result.push({id: "trapped", text: message("darboux_status_trapped")});
        if (!canRefine(model.n)) result.push({id: "limit", text: message("darboux_status_limit", {value0: DARBOUX_N_MAX})});
        return result;
    }

    /** Declared by the base (task 08): the readout rows, the note, the statuses and the drawn curve; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const {example, parts, totals} = this.viewOf(model);
        const hidden = message("darboux_hidden");
        const f = (x: number) => example.value(x);
        const top = Math.max(...parts.map(part => part.sup));
        const bottom = Math.min(...parts.map(part => part.inf));
        return {
            rows: [
                {id: "a", name: message("darboux_a_name"), symbol: "a", value: messageNumber(model.a, PRECISE)},
                {id: "b", name: message("darboux_b_name"), symbol: "b", value: messageNumber(model.b, PRECISE)},
                {id: "n", name: message("darboux_readout_n"), value: messageNumber(model.n, 0)},
                {id: "lower", name: message("darboux_readout_lower"), value: model.lowerVisible ? messageNumber(totals.lower, PRECISE) : hidden},
                {id: "upper", name: message("darboux_readout_upper"), value: model.upperVisible ? messageNumber(totals.upper, PRECISE) : hidden},
                {id: "integral", name: message("darboux_readout_integral"), value: messageNumber(totals.integral, PRECISE)},
                {id: "gap", name: message("darboux_readout_gap"), value: model.lowerVisible && model.upperVisible ? messageNumber(totals.gap, PRECISE) : hidden},
            ],
            help: message("darboux_note"),
            status: this.statuses(model),
            plotted: [f],
            // The partition ends on the axis and the rectangles reach the extreme heights, so the view keeps both in sight.
            must: [{x: model.a, y: 0}, {x: model.b, y: 0}, {x: model.a, y: top}, {x: model.b, y: bottom}],
        };
    }

    protected renderReadout(): React.ReactNode {
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="darboux-status" dataAttribute="darboux-status" lines={(this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default DarbouxGraph;
