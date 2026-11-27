import React from "react";
import BaseFunctionGraph, {BoundingBox, BOARD_TEXT_STYLE, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import {FunctionStatus} from "./FunctionStatus";
import {formatNumber} from "../../analysis/format";
import {CatalogFunction, catalogFunction, FUNCTION_IDS} from "../../analysis/functions";
import {
    ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN, ACCUMULATION_BOUND_STEP, accumulation, AccumulationPiece, accumulationFill, accumulationPieces, accumulationTangent,
} from "../../analysis/accumulation";
import {
    AccumulationEdit, AccumulationModel, AccumulationPoint, chooseAccumulationFunction, DEFAULT_ACCUMULATION_MODEL, moveAccumulationPoint,
} from "../../analysis/accumulationModel";
import {accumulationEditMessage} from "./accumulationMessages";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {RevealButton} from "../../inputs/RevealButton";

/** Values show four decimals so that the lesson's 1.4161 can be read off. */
const PRECISE = 4;

/**
 * Only floating-point noise around a genuine zero counts as flat, because the status says f(x) = 0: sin(pi) is 1.2e-16 and sin(2 pi)
 * is -2.4e-16 in double precision, far below this. A small but genuinely non-zero slope (a value that merely rounds to 0 on the
 * four-decimal readout) is reported as rising or falling, never as exactly zero.
 */
export const FLAT_SLOPE = 1e-12;


/** sin on [-7, 7] has zeros at -2*pi, -pi, 0, pi and 2*pi, so at most six stretches; one sign mark each. */
export const MAX_PIECES = 6;

/** A stretch narrower than this share of the board width gets no sign mark (it would only sit on its own edges). */
const MIN_MARK_SHARE = 0.03;


/**
 * Each function has its own view, which becomes the board view whenever the function choice changes and for the default scene
 * (a view stored in a preset still wins on import). One shared view cannot serve all three: sin needs about [-1.2, 6.7] by [-3.1, 3.1]
 * while x^2 and e^x reach 4 to 7 at the default x = 2. The boxes have about the aspect of the workspace (1.27): JSXGraph fits a box of
 * another aspect to its shorter side, which would show too little.
 */
const FUNCTION_VIEWS: Readonly<Record<AccumulationModel["fn"], BoundingBox>> = {
    sin: [-1.2, 3.1, 6.7, -3.1],
    square: [-2.5, 6, 5.5, -2],
    exp: [-5, 10, 9.6, -1.5],
};

/** The ids of the accumulation declaration: the bounds a and x and the Show-accumulation switch are board pucks; the drawn objects are the legend. */
export type AccumulationIds = {
    param: "accum-a" | "accum-x";
    row: "a" | "x" | "f-x" | "signed-integral" | "slope" | "above-axis" | "below-axis"; note: never;
    legend: "function" | "accumulation" | "tangent" | "positive" | "negative"; section: never; action: "show-accumulation";
};

type StatusKind = "hidden" | "empty" | "reversed" | "rising" | "falling" | "flat";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    fn: CatalogFunction;
    /** The signed integral A(x) = F(x) - F(a). */
    value: number;
    /** f(x), which is also the slope of the tangent to A at x. */
    slope: number;
    pieces: AccumulationPiece[];
    /** The shares of the parts above and below the t-axis in A(x); they add up to `value`. */
    above: number;
    below: number;
}

/**
 * The accumulated integral A(x) = integral from a to x of f, drawn with its derivative f on one board: the shaded signed region
 * between a and x (positive and negative parts marked + and - as well as coloured), the dashed accumulation curve A, and the
 * tangent to A at x, whose slope is f(x). The mathematics lives in `src/analysis/accumulation` (A is F(x) - F(a) exactly, so for
 * x < a the orientation A(x) = -(integral from x to a) follows from the formula, not from any shading logic).
 *
 * The model is `{fn, a, x, accumulationVisible}`. a and x are independent points on the x-axis, each in [-7, 7].
 * The accumulation curve starts hidden so that a lesson can ask for an area prediction first. While it is hidden,
 * everything that would give the answer away is hidden too: the curve, the tangent to A, the point on A, and the readout
 * rows A(x), A'(x) and the contributions of the parts (they are shown as "hidden" in words); the shaded region, f(x) and
 * the positions of a and x stay visible. Showing it is a model field (the Show accumulation button, also the
 * `accumulation-curve` lesson element): it is saved with a preset and a lesson checkpoint, survives edits of a, x and f.
 *
 * Board layout (decision): one board, not two coordinated views. A(x) = F(x) - F(a) has the same unit as f times x, the two curves
 * share the horizontal axis, and the tangent to A at x has slope f(x): drawing both on one y-scale keeps the picture "the slope
 * of A is the height of f" honest, and a second board (a stacked or inset panel) has no ownership, disposal or capture precedent
 * in this repository (every graph owns exactly one session board). f is a solid line, A a thick dashed line, and both are
 * named in words by the board caption, the point labels and the legend, so colour is never the only cue. Per-function views
 * keep both curves in view at the default x = 2 for sin, x^2 and e^x.
 *
 * Setters reject (never clamp): a value outside [-7, 7] throws a `DomainError` and leaves the model unchanged. Values are stored
 * as given (a lesson may set x to exactly pi, which must stay a zero of sin rather than be rounded past it); dragging
 * rounds to 0.01 before it writes.
 */
export class AccumulationGraph extends BaseFunctionGraph<AccumulationModel> {
    private pointA?: JXG.Point;
    private pointX?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    private readonly piecesOf = this.modelCache((model: AccumulationModel) => accumulationPieces(catalogFunction(model.fn), model.a, model.x));

    override presetCollection() {
        return functionPresetCollections.accumulation;
    }

    protected defaultModel(): AccumulationModel {
        return {...DEFAULT_ACCUMULATION_MODEL};
    }

    /** The view of the current function; the default model (sin) gives the default scene's view. */
    protected defaultBoundingBox(): BoundingBox {
        return [...FUNCTION_VIEWS[this.model.fn]];
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    private viewOf(model: AccumulationModel): View {
        const fn = catalogFunction(model.fn);
        const pieces = this.piecesOf(model);
        const sum = (sign: AccumulationPiece["sign"]) => pieces.filter(piece => piece.sign === sign).reduce((total, piece) => total + piece.contribution, 0);
        return {
            fn, value: accumulation(fn, model.a, model.x), slope: accumulationTangent(fn, model.a, model.x).slope,
            pieces, above: sum("positive"), below: sum("negative"),
        };
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setFunction(value: unknown): void {
        const next = this.accept(chooseAccumulationFunction(this.model, value));
        this.commitModel(next);
        if (this.generatedObjectCount > 0) this.boardView.setIntent(FUNCTION_VIEWS[next.fn], {keepAspectRatio: true});
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        this.movePoint('a', value, options);
    }

    protected setX(value: number, options: { syncScene?: boolean } = {}): void {
        this.movePoint('x', value, options);
    }

    /** Moves a bound by the model's rules; a refused move throws a `DomainError` (localized) and leaves the model unchanged. */
    private movePoint(point: AccumulationPoint, value: number, options: { syncScene?: boolean }): void {
        const next = this.accept(moveAccumulationPoint(this.model, point, value));
        if (next !== this.model) this.commitModel(next, options);
    }

    private accept(edit: AccumulationEdit): AccumulationModel {
        if (!edit.ok) throw new DomainError(accumulationEditMessage(edit.issue));
        return edit.model;
    }

    protected setAccumulationVisible(visible: boolean): void {
        if (visible !== this.model.accumulationVisible) this.commitModel({...this.model, accumulationVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"accum-a": value => this.setA(value), "accum-x": value => this.setX(value)},
            visibility: {"accumulation-curve": visible => this.setAccumulationVisible(visible)},
            choices: {"accumulation-function": value => this.setFunction(value)},
        };
    }

    /** A preset or file whose function differs and which carries no view of its own shows that function's view, like the choice does. */
    override importPreset(preset: Preset): void {
        const previous = this.model.fn;
        super.importPreset(preset);
        if (!preset.boardState && this.model.fn !== previous && this.generatedObjectCount > 0) {
            this.boardView.setIntent(FUNCTION_VIEWS[this.model.fn], {keepAspectRatio: true});
        }
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const fn = () => catalogFunction(this.model.fn);
        const revealed = () => this.model.accumulationVisible;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = this.displayThinWidth(0.8);
        const thick = () => Math.max(3, this.displaySettings.strokeWidth * 1.6);

        // Values far above or below the view are left out (NaN) for lines and limited for the shaded region, so that no drawn path
        // reaches e^7 or 7^2 far outside the view: framing tools read the path's own extent. The margin is a quarter of the view
        // height on each side, much more than the sampling step, so the visible part of every curve is unchanged.
        const margin = () => {
            const [, top, , bottom] = board.getBoundingBox();
            return {top, bottom, margin: 0.25 * (top - bottom)};
        };
        const clipped = (y: number) => {
            const {top, bottom, margin: m} = margin();
            return y > top + m || y < bottom - m ? NaN : y;
        };
        const clamped = (y: number) => {
            const {top, bottom, margin: m} = margin();
            return Math.min(top + m, Math.max(bottom - m, y));
        };

        // Layers, lowest first: the shaded stretches above and below the axis, f, A, the tangent to A, the drop lines, the sign marks, then the points.
        const fill = (color: string, part: "positive" | "negative") => {
            // The stretches below the axis are outlined with a dashed edge, so the two kinds also differ by pattern.
            this.drawn.set(part, this.signedFill(color, () => accumulationFill(fn(), model().a, model().x, clamped)[part], {dash: part === "negative" ? 2 : 0}) as unknown as JXG.GeometryElement);
        };
        fill(GraphPalette.additionalCurves[0], "positive");
        fill(GraphPalette.additionalCurves[1], "negative");

        this.drawn.set("function", this.own(board.create("functiongraph", [(t: number) => clipped(fn().value(t))], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        })));
        // JSXGraph may evaluate a function graph at a non-finite t while it sets up; `accumulation` rejects those, a curve just draws nothing there.
        this.drawn.set("accumulation", this.own(board.create("functiongraph", [(t: number) => Number.isFinite(t) ? clipped(accumulation(fn(), model().a, t)) : NaN], {
            strokeColor: GraphPalette.primaryCurve, dash: 2, highlight: false, fixed: true, strokeWidth: thick, visible: revealed,
        })));
        this.drawn.set("tangent", this.own(board.create("functiongraph", [(t: number) => {
            const line = accumulationTangent(fn(), model().a, model().x);
            return Number.isFinite(t) ? clipped(line.slope * t + line.intercept) : NaN;
        }], {
            strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true, strokeWidth: thin, visible: revealed,
        })));

        // Drop lines from the axis to the graph of f at a and at x.
        const dropLine = (position: () => number) => this.own(board.create("segment", [[position, 0], [position, () => fn().value(position())]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));
        dropLine(() => model().a);
        dropLine(() => model().x);

        // One + or - mark per stretch of the shaded region, so that the sign of each part does not depend on its colour.
        const markFontSize = () => Math.max(14, this.displaySettings.fontSize * 1.3);
        const markStyle = `${BOARD_TEXT_STYLE}font-weight:bold;pointer-events:none;`;
        const piece = (index: number): AccumulationPiece | undefined => this.piecesOf(this.model)[index];
        for (let index = 0; index < MAX_PIECES; index++) {
            this.own(board.create("text", [
                () => {
                    const p = piece(index);
                    return p === undefined ? 0 : (p.from + p.to) / 2;
                },
                () => {
                    const p = piece(index);
                    return p === undefined ? 0 : clamped(fn().value((p.from + p.to) / 2) / 2);
                },
                () => piece(index)?.sign === "negative" ? "−" : "+",
            ], {
                anchorX: "middle", anchorY: "middle", fixed: true, highlight: false, parse: false, fontSize: markFontSize,
                strokeColor: GraphPalette.label, cssStyle: markStyle, highlightCssStyle: markStyle,
                visible: () => {
                    const p = piece(index);
                    if (p === undefined) return false;
                    const [left, , right] = board.getBoundingBox();
                    return p.to - p.from >= MIN_MARK_SHARE * (right - left);
                },
            }));
        }

        // The point of f at x and, once revealed, the point of A at x; their labels name the two curves on the board itself.
        this.own(board.create("point", [() => model().x, () => fn().value(model().x)], {
            ...this.styles.point.fixed, name: "$$f(x)$$", highlight: false, label: this.pointLabel("above-left"),
            fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        }));
        this.own(board.create("point", [() => model().x, () => accumulation(fn(), model().a, model().x)], {
            ...this.styles.point.fixed, name: "$$A(x)$$", highlight: false, label: this.pointLabel("below-right", 1, revealed),
            fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, visible: revealed,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        }));

        // a and x slide along the x-axis: a drag keeps y = 0, rounds x to 0.01 and writes the model once. Their labels swap sides when x passes a.
        const axisPoint = (config: { x: number; name: string; placement: () => "below-left" | "below-right"; write: (x: number) => void }) =>
            this.slidingPoint({
                x: config.x, position: () => 0, min: ACCUMULATION_BOUND_MIN, max: ACCUMULATION_BOUND_MAX, step: ACCUMULATION_BOUND_STEP,
                attributes: {...this.styles.point.default, name: config.name, label: this.pointLabel(config.placement, 1.6)},
                write: config.write,
            });
        const xRightOfA = () => model().x >= model().a;
        this.pointA = axisPoint({x: model().a, name: "$$a$$", placement: () => xRightOfA() ? "below-left" : "below-right", write: x => this.setA(x, {syncScene: false})});
        this.pointX = axisPoint({x: model().x, name: "$$x$$", placement: () => xRightOfA() ? "below-right" : "below-left", write: x => this.setX(x, {syncScene: false})});

        // The names of the curves and the values stay on the board, in the corner the default curves leave free.
        this.caption("bottom-right", [
            {text: () => `f(x) = ${fn().plain}`, scale: 1.2, math: true},
            {text: () => t("accumulation_board_f_line"), math: true},
            {text: () => t("accumulation_board_a_line"), math: true, visible: revealed},
            {
                text: () => revealed()
                    ? t("accumulation_board_value", {value0: formatNumber(this.viewOf(model()).value, language(), PRECISE)})
                    : t("accumulation_board_hidden"),
            },
            {text: () => t("accumulation_board_slope", {value0: formatNumber(this.viewOf(model()).slope, language(), PRECISE)}), visible: revealed},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {a, x} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointX?.moveTo([x, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointX = undefined;
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, a, x} = this.model;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("accumulation_function_label")} value={fn} help={t("accumulation_function_help")}
                              options={FUNCTION_IDS.map(id => ({value: id, text: `f(x) = ${catalogFunction(id).plain}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <PuckOwnedGroup params={["accum-a", "accum-x"]} className="inspector-group">
                <PuckOwned param="accum-a"><Slider customText={t("accumulation_a_label")} value={a} min={ACCUMULATION_BOUND_MIN} max={ACCUMULATION_BOUND_MAX} step={0.1} decimals={PRECISE}
                        onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/></PuckOwned>
                <PuckOwned param="accum-x"><Slider customText={t("accumulation_x_label")} value={x} min={ACCUMULATION_BOUND_MIN} max={ACCUMULATION_BOUND_MAX} step={0.1} decimals={PRECISE}
                        onChange={next => this.ignoreOutOfDomain(() => this.setX(next))}/></PuckOwned>
                <p className="inspector-help">{t("accumulation_bounds_help")}</p>
            </PuckOwnedGroup>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const {accumulationVisible} = this.model;
        return <PuckOwnedGroup params={["show-accumulation"]}>
            <div className="accumulation-actions" role="group" aria-label={t("accumulation_actions_label")}>
                <RevealButton action="toggle-accumulation" revealed={accumulationVisible} showLabel={t("accumulation_show")} hideLabel={t("accumulation_hide")}
                              onToggle={() => this.setAccumulationVisible(!this.model.accumulationVisible)}/>
            </div>
            <p className="inspector-help">{t("accumulation_toggle_help")}</p>
        </PuckOwnedGroup>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "accum-a": {read: () => this.model.a, apply: (value: number) => this.setA(value)},
            "accum-x": {read: () => this.model.x, apply: (value: number) => this.setX(value)},
        };
    }

    /**
     * The common declaration (rows, note, view marks) plus the two bounds as board pucks, the Show-accumulation switch as a puck and the legend of
     * the drawn objects. The accumulation curve and its tangent are listed only while they are shown (a legend entry is drawn or absent).
     */
    protected override declaration(): GraphDeclaration {
        const revealed = this.model.accumulationVisible;
        const bound = (key: "accum-a" | "accum-x", label: "accumulation_a_name" | "accumulation_x_name", symbol: string) => ({
            key, kind: "range" as const, label: message(label), symbol, help: message("accumulation_bounds_help"), placement: "board" as const,
            min: ACCUMULATION_BOUND_MIN, max: ACCUMULATION_BOUND_MAX, step: ACCUMULATION_BOUND_STEP, maxDecimals: 2,
        });
        return {
            ...this.commonDeclaration(),
            parameters: [bound("accum-a", "accumulation_a_name", "a"), bound("accum-x", "accumulation_x_name", "x")],
            legend: [
                {id: "function", label: message("accumulation_legend_f"), kind: "line", object: "function"},
                ...(revealed ? [
                    {id: "accumulation" as const, label: message("accumulation_legend_a"), kind: "dashed" as const, object: "accumulation"},
                    {id: "tangent" as const, label: message("accumulation_legend_tangent"), kind: "line" as const, object: "tangent"},
                ] : []),
                {id: "positive", label: message("accumulation_legend_positive"), kind: "area", object: "positive"},
                {id: "negative", label: message("accumulation_legend_negative"), kind: "area", object: "negative"},
            ],
            actions: [
                {id: "show-accumulation", label: message("accumulation_actions_label"), help: message("accumulation_toggle_help"), placement: "board", enabled: true,
                    pressed: revealed, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "show-accumulation") runAs("learner", () => this.setAccumulationVisible(!this.model.accumulationVisible));
        else throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "positive" || id === "negative" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: AccumulationModel, view: View): { id: StatusKind; text: Message }[] {
        if (!model.accumulationVisible) return [{id: "hidden", text: message("accumulation_status_hidden")}];
        const result: { id: StatusKind; text: Message }[] = [];
        if (model.x === model.a) result.push({id: "empty", text: message("accumulation_status_empty")});
        else if (model.x < model.a) result.push({id: "reversed", text: message("accumulation_status_reversed")});
        if (view.slope >= FLAT_SLOPE) result.push({id: "rising", text: message("accumulation_status_rising")});
        else if (view.slope <= -FLAT_SLOPE) result.push({id: "falling", text: message("accumulation_status_falling")});
        else result.push({id: "flat", text: message("accumulation_status_flat")});
        return result;
    }

    /** Declared by the base (task 08): the readout rows, the note, the statuses and the plotted curves; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        // While A is hidden, every row that would give its value or slope away says so in words; f(x), a and x stay readable.
        const shown = (value: number) => model.accumulationVisible ? messageNumber(value, PRECISE) : message("accumulation_hidden");
        const plotted = [(x: number) => view.fn.value(x), ...(model.accumulationVisible ? [(x: number) => accumulation(view.fn, model.a, x)] : [])];
        return {
            rows: [
                {id: "a", name: message("accumulation_a_name"), symbol: "a", value: messageNumber(model.a, PRECISE)},
                {id: "x", name: message("accumulation_x_name"), symbol: "x", value: messageNumber(model.x, PRECISE)},
                {id: "f-x", symbol: "f(x)", value: messageNumber(view.fn.value(model.x), PRECISE)},
                {id: "signed-integral", name: message("accumulation_readout_integral"), value: shown(view.value)},
                {id: "slope", name: message("accumulation_readout_slope"), value: shown(view.slope)},
                {id: "above-axis", name: message("accumulation_readout_above"), value: shown(view.above)},
                {id: "below-axis", name: message("accumulation_readout_below"), value: shown(view.below)},
            ],
            help: message("accumulation_note"),
            status: this.statuses(model, view),
            plotted,
            must: [{x: model.a, y: 0}, {x: model.x, y: 0}, {x: model.x, y: view.fn.value(model.x)}],
        };
    }

    protected renderReadout(): React.ReactNode {
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="accumulation-status" dataAttribute="accumulation-status" lines={(this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default AccumulationGraph;
