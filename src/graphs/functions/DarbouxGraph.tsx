import React from "react";
import BaseFunctionGraph, {cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {
    canRefine, DARBOUX_EXAMPLE_IDS, DARBOUX_N_MAX, DARBOUX_N_MIN, DARBOUX_X_MAX, DARBOUX_X_MIN, DARBOUX_X_STEP, darbouxExample, DarbouxExample,
    DarbouxExampleId, darbouxSubintervals, DarbouxSubinterval, darbouxTotals, DarbouxTotals, isDarbouxCount, isDarbouxExampleId, isDarbouxX, refine,
} from "../../analysis/darboux";
import {DARBOUX_EXAMPLE_MODELS, DarbouxModel, parseDarbouxModel} from "../../analysis/darbouxModel";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";

/** Sums and the integral show four decimals so that 1.75, 3.75 and 8/3 = 2.6667 can be read off. */
const PRECISE = 4;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<DarbouxExampleId, string>> = {square: "x²", sine: "sin x"};
const exampleTitle = (id: DarbouxExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Each example has its own view, which becomes the board view whenever the example changes (inspector select or the
 * `darboux-example` lesson action) and for the default scene; a view stored in a preset still wins on import. x^2 on [0, 2]
 * needs y up to 4, sin x on [0, 2 pi] needs x up to 6.3 and y from -1 to 1; one shared view would show one of them tiny.
 * The bottom margin leaves room for the board caption below the rectangles.
 */
const EXAMPLE_VIEWS: Readonly<Record<DarbouxExampleId, BoundingBox>> = {
    square: [-0.8, 5, 3.6, -1.9],
    sine: [-1, 2, 7.6, -3],
};

/** A JSXGraph curve built from point lists whose data is rebuilt in `updateDataArray` (one object for any number of shapes). */
interface FillCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

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
    private viewCache?: { model: DarbouxModel; view: View };

    override presets(): string {
        return "darboux";
    }

    protected defaultModel(): DarbouxModel {
        return {...DARBOUX_EXAMPLE_MODELS.square};
    }

    protected parseModel(data: unknown): DarbouxModel | undefined {
        return parseDarbouxModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    /** A preset or file whose example differs and which carries no view of its own shows that example's view, like the choice does. */
    override importPreset(preset: Preset): void {
        const previous = this.model.example;
        super.importPreset(preset);
        if (!preset.boardState && this.model.example !== previous && this.generatedObjectCount > 0) {
            this.board.setBoundingBox([...EXAMPLE_VIEWS[this.model.example]], true);
        }
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per model object however many board objects and readouts read them. */
    private viewOf(model: DarbouxModel): View {
        if (this.viewCache?.model !== model) {
            const example = darbouxExample(model.example);
            this.viewCache = {
                model,
                view: {
                    example,
                    parts: darbouxSubintervals(example, model.a, model.b, model.n),
                    totals: darbouxTotals(example, model.a, model.b, model.n),
                },
            };
        }
        return this.viewCache.view;
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    protected setExample(value: unknown): void {
        if (!isDarbouxExampleId(value)) throw new DomainError(`The example must be one of ${DARBOUX_EXAMPLE_IDS.join(", ")}.`);
        const start = DARBOUX_EXAMPLE_MODELS[value];
        this.commitModel({...start, lowerVisible: this.model.lowerVisible, upperVisible: this.model.upperVisible});
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...EXAMPLE_VIEWS[value]], true);
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isDarbouxX(value)) throw new DomainError(`The endpoint a must be a finite number between ${DARBOUX_X_MIN} and ${DARBOUX_X_MAX}.`);
        if (!(value < this.model.b)) throw new DomainError("The endpoint a must be less than b (a < b): move b first.");
        if (value !== this.model.a) this.commitModel({...this.model, a: value}, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isDarbouxX(value)) throw new DomainError(`The endpoint b must be a finite number between ${DARBOUX_X_MIN} and ${DARBOUX_X_MAX}.`);
        if (!(value > this.model.a)) throw new DomainError("The endpoint b must be greater than a (a < b): move a first.");
        if (value !== this.model.b) this.commitModel({...this.model, b: value}, options);
    }

    protected setCount(value: number): void {
        if (!isDarbouxCount(value)) throw new DomainError(`The number of parts n must be an integer from ${DARBOUX_N_MIN} to ${DARBOUX_N_MAX}.`);
        if (value !== this.model.n) this.commitModel({...this.model, n: value});
    }

    /** Doubles n (every part is bisected, so the partition is nested); refuses at the limit. */
    protected refinePartition(): void {
        const next = refine(this.model.n);
        if (next === undefined) throw new DomainError(`The partition cannot be refined beyond n = ${DARBOUX_N_MAX}.`);
        this.setCount(next);
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
        const thin = () => Math.max(1, this.displaySettings.strokeWidth * 0.5);

        // Layers, lowest first: the upper rectangles (taller, dashed outline), the lower rectangles (filled), the partition, the function, then a and b.
        const family = (config: {
            color: string; fillOpacity: number; dash: number; visible: () => boolean; height: (part: DarbouxSubinterval) => number;
        }) => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: config.color, fillOpacity: config.fillOpacity, strokeColor: config.color, strokeOpacity: 1,
                strokeWidth: () => Math.max(1.5, this.displaySettings.strokeWidth * 0.6), dash: config.dash, highlight: false, fixed: true,
                visible: config.visible,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const data = config.visible() ? rectangles(view().parts, config.height) : {x: [], y: []};
                curve.dataX = data.x;
                curve.dataY = data.y;
            };
        };
        family({color: GraphPalette.additionalCurves[1], fillOpacity: 0.1, dash: 2, visible: () => model().upperVisible, height: part => part.sup});
        family({color: GraphPalette.additionalCurves[0], fillOpacity: 0.5, dash: 0, visible: () => model().lowerVisible, height: part => part.inf});

        // The partition: a thin line from the axis to the graph at every node (always shown, also while both sums are hidden).
        const partition = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: thin, dash: 3, highlight: false, fixed: true,
        })) as unknown as FillCurve;
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

        this.own(board.create("functiongraph", [(x: number) => view().example.value(x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        }));

        // a and b are dragged along the x-axis, projected onto the grid and onto the range a < b allows; a value the model still refuses puts the point back.
        const dragWrite = (apply: (x: number) => void) => (x: number) => {
            const accepted = this.ignoreOutOfDomain(() => apply(x));
            if (!accepted) this.syncSceneToModel();
            return accepted;
        };
        const axisPoint = (config: { x: number; name: string; placement: "below-left" | "below-right"; min: () => number; max: () => number; write: (x: number) => void }) =>
            this.slidingPoint({
                x: config.x, position: () => 0, min: config.min, max: config.max, step: DARBOUX_X_STEP,
                attributes: {...this.styles.point.default, name: config.name, label: this.pointLabel(config.placement, 1.6)},
                write: dragWrite(config.write),
            });
        this.pointA = axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left",
            min: () => DARBOUX_X_MIN, max: () => cleanNumber(model().b - DARBOUX_X_STEP), write: x => this.setA(x, {syncScene: false}),
        });
        this.pointB = axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right",
            min: () => cleanNumber(model().a + DARBOUX_X_STEP), max: () => DARBOUX_X_MAX, write: x => this.setB(x, {syncScene: false}),
        });

        // The formula, n, the integral, both sums and the key to the two kinds of rectangle stay on the board (projection needs them), bottom right under the axis.
        this.caption("bottom-right", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {
                text: () => t("darboux_board_n_integral", {
                    value0: String(model().n), value1: formatNumber(view().totals.integral, language(), PRECISE),
                }),
            },
            {
                text: () => t("darboux_board_sums", {
                    value0: model().lowerVisible ? formatNumber(view().totals.lower, language(), PRECISE) : this.hiddenText(),
                    value1: model().upperVisible ? formatNumber(view().totals.upper, language(), PRECISE) : this.hiddenText(),
                }),
            },
            {text: () => t("darboux_board_key")},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.viewCache = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): DarbouxModel {
        const {example, a, b, n, lowerVisible, upperVisible} = this.state;
        return {example, a, b, n, lowerVisible, upperVisible};
    }

    protected renderControls(): React.ReactNode {
        const {example, a, b, n, lowerVisible, upperVisible} = this.stateModel();
        const refinable = canRefine(n);
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("darboux_example_label")} value={example} help={t("darboux_example_help")}
                              options={DARBOUX_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("darboux_a_label")} value={a} min={DARBOUX_X_MIN} max={DARBOUX_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("darboux_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <NumberInput label={t("darboux_b_label")} value={b} min={DARBOUX_X_MIN} max={DARBOUX_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("darboux_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/>
                <p className="inspector-help">{t("darboux_order_help")}</p>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("darboux_n_label")} value={n} min={DARBOUX_N_MIN} max={DARBOUX_N_MAX} step={1} decimals={0}
                             rejectedHint={t("darboux_n_rejected_hint", {value0: DARBOUX_N_MIN, value1: DARBOUX_N_MAX})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setCount(next))}/>
                <div className="darboux-actions" role="group" aria-label={t("darboux_partition_label")}>
                    <button type="button" data-action="refine" disabled={!refinable} aria-describedby="darboux-refine-help"
                            onClick={() => this.ignoreOutOfDomain(() => this.refinePartition())}>{t("darboux_refine")}</button>
                </div>
                <p id="darboux-refine-help" className="inspector-help">{refinable ? t("darboux_refine_help") : t("darboux_refine_limit", {value0: DARBOUX_N_MAX})}</p>
            </div>
            <div className="inspector-group">
                <div className="darboux-actions" role="group" aria-label={t("darboux_sums_label")}>
                    <button type="button" data-action="toggle-lower" data-revealed={lowerVisible}
                            onClick={() => this.setLowerVisible(!this.model.lowerVisible)}>{lowerVisible ? t("darboux_hide_lower") : t("darboux_show_lower")}</button>
                    <button type="button" data-action="toggle-upper" data-revealed={upperVisible}
                            onClick={() => this.setUpperVisible(!this.model.upperVisible)}>{upperVisible ? t("darboux_hide_upper") : t("darboux_show_upper")}</button>
                </div>
                <p className="inspector-help">{t("darboux_sums_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.comparisonCurve, label: t("darboux_legend_function"), kind: "line"},
            {id: "lower", color: GraphPalette.additionalCurves[0], label: t("darboux_legend_lower"), kind: "area"},
            {id: "upper", color: GraphPalette.additionalCurves[1], label: t("darboux_legend_upper"), kind: "dashed"},
            {id: "partition", color: GraphPalette.referenceCurve, label: t("darboux_legend_partition"), kind: "line"},
        ]}/>;
    }

    /** The statuses to state in words (no changing numbers: they are announced on every drag step); each has a stable id. */
    private statuses(model: DarbouxModel): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (!model.lowerVisible || !model.upperVisible) result.push({id: "hidden", text: t("darboux_status_hidden")});
        else result.push({id: "trapped", text: t("darboux_status_trapped")});
        if (!canRefine(model.n)) result.push({id: "limit", text: t("darboux_status_limit", {value0: DARBOUX_N_MAX})});
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const language: NumberLanguage = currentLanguage();
        const {totals} = this.viewOf(model);
        const number = (value: number) => formatNumber(value, language, PRECISE);
        const hidden = this.hiddenText();
        const rows = [
            {id: "a", label: t("darboux_a_label"), value: number(model.a)},
            {id: "b", label: t("darboux_b_label"), value: number(model.b)},
            {id: "n", label: t("darboux_readout_n"), value: String(model.n)},
            {id: "lower", label: t("darboux_readout_lower"), value: model.lowerVisible ? number(totals.lower) : hidden},
            {id: "upper", label: t("darboux_readout_upper"), value: model.upperVisible ? number(totals.upper) : hidden},
            {id: "integral", label: t("darboux_readout_integral"), value: number(totals.integral)},
            {id: "gap", label: t("darboux_readout_gap"), value: model.lowerVisible && model.upperVisible ? number(totals.gap) : hidden},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("darboux_note")}/>
            <div className="inspector-group darboux-status" role="status" aria-live="polite">
                {this.statuses(model).map(status => <p key={status.id} className="inspector-help" data-darboux-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default DarbouxGraph;
