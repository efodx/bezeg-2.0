import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, escapeHtml, FunctionLessonActions, LABEL_STYLE} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {clipCurveToView} from "./curveViewClip";
import {PuckOwned} from "../base/controls/PuckOwnership";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {guard, guardField} from "../base/controls/guard";
import {FunctionStatus} from "./FunctionStatus";
import {currentLanguage, message, messageNumber, t, type Message} from "../../localization";
import type {FormattedValue, GraphDeclaration, ParameterDeclaration, ReadoutNote, ViewMark, ViewMarks} from "../base/declare/graphDeclaration";
import {runAs} from "../base/writes/writeSource";
import {formatNumber, formatSignificant, NumberLanguage} from "../../analysis/format";
import {
    evaluateTaylorCoefficients, geometricConvergenceInterval, isInsideGeometricConvergence, isTaylorX,
    TAYLOR_DEGREE_MAX, TAYLOR_DEGREE_MIN, TAYLOR_EXAMPLE_IDS, taylorAbsoluteError, taylorCoefficients, taylorErrorBound, taylorExample, TaylorBound, TaylorExample,
    TaylorExampleId, taylorFunctionValue, taylorPolynomial, taylorSignedError,
} from "../../analysis/taylor";
import {chooseTaylorExample, setTaylorCenter, setTaylorDegree, setTaylorX, TAYLOR_EXAMPLE_MODELS, TaylorModel} from "../../analysis/taylorModel";
import {taylorEditMessage} from "./taylorMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {RevealButton} from "../../inputs/RevealButton";
import type {ParameterBinding} from "../base/writes/parameterArbiter";

/** Positions show four decimals; values of T_n and f show four as well, errors and the bound use significant digits. */
const PRECISE = 4;


/**
 * Each example has its own view, which becomes the board view whenever the example changes (inspector select or the
 * `taylor-example` lesson action) and for the default scene; a view stored in a preset still wins on import. The caption sits
 * in the top-left corner, where every example's graph stays low or flat.
 */
const EXAMPLE_VIEWS: Readonly<Record<TaylorExampleId, BoundingBox>> = {
    exp: [-3.5, 10, 3.5, -4],
    sine: [-7.5, 3.4, 7.5, -3.6],
    geometric: [-2.6, 6, 1.6, -3],
    flat: [-1.4, 1.6, 3.4, -0.6],
};

/** Samples per curve in the declared view marks. */
const VIEW_MARK_SAMPLES = 25;

/** Dash styles (JSXGraph numbering): f is solid, T_n dashed, so they differ by pattern and not only by colour. */
const FUNCTION_DASH = 0;
const POLYNOMIAL_DASH = 3;

/** Dragging projects c and x onto these grids (every example's center and x domain contains only multiples of them). */
const CENTER_GRID = 0.05;
const X_GRID = 0.01;

/** The arrow keys of the center and x fields add this much (the board drag uses the example's own grid). */
const FIELD_STEP = 0.1;

type StatusKind = "hidden" | "revealed" | "inside-convergence" | "outside-convergence" | "bound-not-sharp" | "no-bound" | "flat";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: TaylorExample;
    /** The coefficients a_0..a_n of T_n about the center. */
    coefficients: readonly number[];
    polynomial: number;
    value: number;
    signedError: number;
    absoluteError: number;
    bound: TaylorBound;
    /** 1/(1 - x) only: whether x lies in the open convergence interval |x - c| < 1 - c. */
    insideConvergence: boolean | undefined;
}

/** The formulas as they are written on the board and in the example selector. */
const exampleFormula = (id: TaylorExampleId): string => {
    switch (id) {
        case "exp": return "eˣ";
        case "sine": return "sin x";
        case "geometric": return "1/(1 − x)";
        case "flat": return t("taylor_formula_flat");
    }
};
const exampleTitle = (id: TaylorExampleId): string => `f(x) = ${exampleFormula(id)}`;

/** The headline formula as TeX, undelimited (the same four functions as `exampleFormula`). */
const formulaTex = (id: TaylorExampleId): string => {
    switch (id) {
        case "exp": return "f(x)=e^{x}";
        case "sine": return "f(x)=\\sin x";
        case "geometric": return "f(x)=\\frac{1}{1-x}";
        case "flat": return "f(x)=\\begin{cases}e^{-1/x}&x>0\\\\0&x\\le 0\\end{cases}";
    }
};

/** The ids of Taylor's declaration (`DeclarationIds`): its parameters by arbiter key, rows, notes, legend entries and action. */
export type TaylorIds = {
    param: "taylor-center" | "taylor-degree" | "taylor-x" | "taylor-example";
    row: "center" | "degree" | "x" | "polynomial" | "function" | "signed-error" | "absolute-error" | "bound" | "hypothesis";
    note: "series";
    legend: "function" | "polynomial" | "error" | "bound" | "convergence" | "center" | "x";
    section: never;
    action: "show-error";
};

/** The function as drawn: 1/(1 - x) only exists left of 1. */
const drawnValue = (example: TaylorExample, x: number): number => example.id === "geometric" && x >= 1 ? NaN : example.value(x);

/**
 * Taylor approximation: the Taylor polynomial T_n about a center c of one of four named functions, its error at an evaluation
 * point x, and, once Show error bound is pressed, the Lagrange remainder bound with the hypothesis behind it. The model is
 * `{example, center, degree, x, boundVisible}`; the mathematics lives in `src/analysis/taylor` and the polynomial, the errors
 * and the bound are recomputed from it, never stored.
 *
 * T_n is a finite polynomial and always exists; whether the infinite Taylor series converges (and to what) is a different
 * question and the wording keeps them apart: exp and sine converge to f everywhere, 1/(1 - x) only for |x - c| < 1 - c, and the
 * flat function's series is identically 0, converging to 0 and not to f for x > 0.
 *
 * Rules (reject, never clamp): the center and x lie in the example's own domains (the flat function's center is fixed at 0),
 * the degree is an integer from 0 to 10. A setter that would break a rule throws a `DomainError` and leaves the model unchanged;
 * dragging is projected onto the example's grid and range. Number fields, the degree buttons, lesson actions and drags use the
 * same setters.
 *
 * `boundVisible` is part of the model (the Show error bound action, lesson element `taylor-bound`), saved with a preset and a
 * lesson checkpoint. Choosing an example loads that example's model and hides it again; editing the center, degree or x keeps it.
 */
export class TaylorGraph extends BaseFunctionGraph<TaylorModel> {
    private pointCenter?: JXG.Point;
    private pointX?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections.taylor;
    }

    protected defaultModel(): TaylorModel {
        return {...TAYLOR_EXAMPLE_MODELS.exp};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: TaylorModel): View {
        return this.memoView(model, () => {
            const example = taylorExample(model.example);
            const {center, degree, x} = model;
            return {
                example,
                coefficients: taylorCoefficients(example, center, degree),
                polynomial: taylorPolynomial(example, center, degree, x),
                value: taylorFunctionValue(example, x),
                signedError: taylorSignedError(example, center, degree, x),
                absoluteError: taylorAbsoluteError(example, center, degree, x),
                bound: taylorErrorBound(example, center, degree, x),
                insideConvergence: example.id === "geometric" ? isInsideGeometricConvergence(center, x) : undefined,
            };
        });
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    protected setExample(value: unknown): void {
        const edit = chooseTaylorExample(value);
        if (!edit.ok) throw new DomainError(taylorEditMessage(edit.issue));
        this.commitModel(edit.model);
        if (this.generatedObjectCount > 0) this.boardView.setIntent(EXAMPLE_VIEWS[edit.model.example], {keepAspectRatio: true});
    }

    protected setCenter(value: number, options: { syncScene?: boolean } = {}): void {
        const edit = setTaylorCenter(this.model, value);
        if (!edit.ok) throw new DomainError(taylorEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setDegree(value: number): void {
        const edit = setTaylorDegree(this.model, value);
        if (!edit.ok) throw new DomainError(taylorEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
    }

    protected setX(value: number, options: { syncScene?: boolean } = {}): void {
        const edit = setTaylorX(this.model, value);
        if (!edit.ok) throw new DomainError(taylorEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setBoundVisible(visible: boolean): void {
        if (visible !== this.model.boundVisible) this.commitModel({...this.model, boundVisible: visible});
    }

    /**
     * Parameter writes (ADR 0064). Keys are the lesson names. Writers: the tools controls and the board's center and x
     * points (`learner`, tagged by their input gesture), lesson actions and scenes (`lesson`); nothing animates them.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "taylor-center": {read: () => this.model.center, apply: (value: number) => this.setCenter(value)},
            "taylor-degree": {read: () => this.model.degree, apply: (value: number) => this.setDegree(value)},
            "taylor-x": {read: () => this.model.x, apply: (value: number) => this.setX(value)},
            "taylor-example": {read: () => this.model.example, apply: (value: unknown) => this.setExample(value)},
        };
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "taylor-center": value => this.setCenter(value), "taylor-degree": value => this.setDegree(value), "taylor-x": value => this.setX(value),
            },
            visibility: {"taylor-bound": visible => this.setBoundVisible(visible)},
            choices: {"taylor-example": value => this.setExample(value)},
        };
    }

    /** Runs an inspector change: a refusal is kept as the visible notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), PRECISE);
    }

    /** A magnitude or an error with significant digits; floating-point noise shows as 0. */
    private small(value: number): string {
        return formatSignificant(value, currentLanguage());
    }

    private hypothesisText(id: TaylorExampleId): string {
        return t(id === "exp" ? "taylor_hypothesis_exp" : id === "sine" ? "taylor_hypothesis_sine" : id === "geometric" ? "taylor_hypothesis_geometric" : "taylor_hypothesis_flat");
    }

    private seriesText(model: TaylorModel, view: View): string {
        if (model.example === "geometric") {
            const {from, to} = geometricConvergenceInterval(model.center);
            return t(view.insideConvergence ? "taylor_series_geometric_inside" : "taylor_series_geometric_outside", {value0: this.number(from), value1: this.number(to)});
        }
        return t(model.example === "flat" ? "taylor_series_flat" : "taylor_series_everywhere");
    }

    private boardBound(model: TaylorModel, view: View): string {
        if (!model.boundVisible) return t("taylor_board_bound_hidden");
        return view.bound.kind === "bound" ? t("taylor_board_bound", {value0: this.small(view.bound.value)}) : t("taylor_board_bound_none");
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = this.displayThinWidth(0.5);
        const fontSize = () => this.displaySettings.fontSize;
        const f = (x: number) => drawnValue(view().example, x);
        const polynomial = (x: number) => evaluateTaylorCoefficients(view().coefficients, x - model().center);
        const isGeometric = () => model().example === "geometric";
        /** The convergence interval of 1/(1 - x); the other examples have none (their centers may exceed 1), so an empty one is used while it is hidden. */
        const convergence = () => isGeometric() ? geometricConvergenceInterval(model().center) : {from: 0, to: 0};
        const boundValue = () => {
            const bound = view().bound;
            return model().boundVisible && bound.kind === "bound" ? bound.value : undefined;
        };

        // Layers, lowest first: the convergence interval, the bound band, the drop line, f, T_n, the error, the markers.
        this.drawn.set("convergence", this.own(board.create("segment", [
            [() => convergence().from, 0], [() => convergence().to, 0],
        ], {
            strokeColor: GraphPalette.additionalCurves[0], strokeWidth: () => Math.max(6, this.displaySettings.strokeWidth * 3), strokeOpacity: 0.55,
            highlight: false, fixed: true, withLabel: false, visible: isGeometric,
        })));
        this.own(board.create("text", [
            () => {
                const [left] = board.getBoundingBox();
                const {from, to} = convergence();
                return (Math.max(from, left) + to) / 2;
            },
            () => {
                const [, top, , bottom] = board.getBoundingBox();
                return 0.04 * (top - bottom);
            },
            () => {
                const {from, to} = convergence();
                return `<div>${escapeHtml(t("taylor_board_convergence", {value0: this.number(from), value1: this.number(to)}))}</div>`;
            },
        ], {
            anchorX: "middle", anchorY: "bottom", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            fontSize: () => Math.max(10, fontSize() * 0.9), cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE, visible: isGeometric,
        }));
        this.drawn.set("bound", this.own(board.create("segment", [
            [() => model().x, () => view().polynomial - (boundValue() ?? 0)], [() => model().x, () => view().polynomial + (boundValue() ?? 0)],
        ], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: () => Math.max(8, this.displaySettings.strokeWidth * 4), strokeOpacity: 0.3,
            highlight: false, fixed: true, withLabel: false, visible: () => boundValue() !== undefined,
        })));
        this.own(board.create("segment", [[() => model().center, 0], [() => model().center, () => f(model().center)]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));

        this.drawn.set("function", this.own(board.create("functiongraph", [f], {
            strokeColor: GraphPalette.primaryCurve, dash: FUNCTION_DASH, highlight: false, fixed: true, strokeWidth,
        })));
        const polynomialCurve = this.own(board.create("functiongraph", [polynomial], {
            strokeColor: GraphPalette.comparisonCurve, dash: POLYNOMIAL_DASH, highlight: false, fixed: true, strokeWidth,
        }));
        // T_n runs to coordinates in the millions off the view; stroking that path costs ~180 ms a frame (count puck on fast presses).
        clipCurveToView(polynomialCurve, board);
        this.drawn.set("polynomial", polynomialCurve);
        this.drawn.set("error", this.own(board.create("segment", [[() => model().x, () => view().polynomial], [() => model().x, () => view().value]], {
            strokeColor: GraphPalette.warningText, strokeWidth: () => Math.max(2.5, this.displaySettings.strokeWidth * 1.4), highlight: false, fixed: true,
            withLabel: false, visible: () => view().absoluteError > 0,
        })));

        // The values of f at c and at x, and of T_n at x.
        const valuePoint = (x: () => number, y: () => number, color: string) => this.own(board.create("point", [x, y], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, fillColor: color, highlightFillColor: color,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
        }));
        valuePoint(() => model().center, () => f(model().center), GraphPalette.primaryCurve);
        valuePoint(() => model().x, () => view().value, GraphPalette.primaryCurve);
        valuePoint(() => model().x, () => view().polynomial, GraphPalette.comparisonCurve);

        // c and x are dragged along the x-axis, projected onto the example's grid and range; a value the model still refuses puts the point back.
        this.pointCenter = this.axisPoint({
            x: model().center, name: "$$c$$", placement: "below-left", color: GraphPalette.primaryCurve, step: CENTER_GRID,
            min: () => view().example.centerMin, max: () => view().example.centerMax, write: value => this.setCenter(value, {syncScene: false}),
        });
        this.pointX = this.axisPoint({
            x: model().x, name: "$$x$$", placement: "below-right", color: GraphPalette.warningText, step: X_GRID,
            min: () => view().example.xMin, max: () => view().example.xMax, write: value => this.setX(value, {syncScene: false}),
        });
        this.drawn.set("center-point", this.pointCenter);
        this.drawn.set("x-point", this.pointX);

        // The formula, the numbers, the bound (or the word hidden) and the key stay on the board (projection needs them).
        this.caption("top-left", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {text: () => t("taylor_board_parameters", {value0: this.number(model().center), value1: model().degree, value2: this.number(model().x)})},
            {text: () => t("taylor_board_values", {value0: this.number(view().polynomial), value1: this.number(view().value)})},
            {text: () => t("taylor_board_error", {value0: this.small(view().absoluteError)}), color: GraphPalette.warningText},
            {text: () => this.boardBound(model(), view()), minBoardWidth: 520},
            {text: () => t("taylor_board_key"), minBoardWidth: 520},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {center, x} = this.model;
        this.pointCenter?.moveTo([center, 0]);
        this.pointX?.moveTo([x, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointCenter = undefined;
        this.pointX = undefined;
        this.drawn.clear();
    }

    // ---- Declaration (task 02: the worked example; nothing renders it yet) ------------------------------------------

    /**
     * Pure data from the model: the parameters (the arbiter keys), the same readout values the inspector shows, the notes
     * (series, hypothesis and the state sentences of `statuses`), the legend of everything the board draws, and the action.
     * The flat function's center is fixed, so it declares no center parameter there (the contract has no locked range).
     */
    protected override declaration(): GraphDeclaration<TaylorIds> {
        const model = this.model;
        const view = this.viewOf(model);
        const example = view.example;
        const shown = model.boundVisible;
        const significant = (value: number): FormattedValue => ({kind: "formatted", text: this.small(value)});
        const hidden = message("taylor_hidden");
        const boundValue: Message | FormattedValue = !shown ? hidden : view.bound.kind === "bound" ? significant(view.bound.value) : message("taylor_bound_unavailable");
        const series: Message = model.example === "geometric"
            ? message(view.insideConvergence ? "taylor_series_geometric_inside" : "taylor_series_geometric_outside",
                {value0: messageNumber(geometricConvergenceInterval(model.center).from, PRECISE), value1: messageNumber(geometricConvergenceInterval(model.center).to, PRECISE)})
            : message(model.example === "flat" ? "taylor_series_flat" : "taylor_series_everywhere");
        const hypothesis = message(model.example === "exp" ? "taylor_hypothesis_exp" : model.example === "sine" ? "taylor_hypothesis_sine"
            : model.example === "geometric" ? "taylor_hypothesis_geometric" : "taylor_hypothesis_flat");
        const notes: ReadoutNote<TaylorIds>[] = [{id: "series", text: series, tone: "muted"}];
        const parameters: ParameterDeclaration<TaylorIds["param"]>[] = [
            {key: "taylor-example", kind: "choice", label: message("taylor_example_label"), help: message("taylor_example_help"), placement: "board",
                options: TAYLOR_EXAMPLE_IDS.map(id => ({value: id, label: message(`taylor_example_${id}`)}))},
            {key: "taylor-degree", kind: "count", label: message("taylor_degree_name"), symbol: "n", help: message("taylor_degree_help"), placement: "board",
                min: TAYLOR_DEGREE_MIN, max: TAYLOR_DEGREE_MAX},
            {key: "taylor-x", kind: "range", label: message("taylor_x_name"), symbol: "x", help: message("taylor_points_help"), placement: "board",
                min: example.xMin, max: example.xMax, step: X_GRID, maxDecimals: PRECISE},
        ];
        if (example.centerMin < example.centerMax) {
            parameters.unshift({key: "taylor-center", kind: "range", label: message("taylor_center_name"), symbol: "c", help: message("taylor_points_help"),
                placement: "board", min: example.centerMin, max: example.centerMax, step: CENTER_GRID, maxDecimals: PRECISE});
        }
        const fixed = (value: number) => messageNumber(value, PRECISE);
        return {
            parameters,
            formula: {label: message("taylor_formula_label"), tex: formulaTex(model.example)},
            readouts: [{id: "values", title: message("function_readouts"), rows: [
                {id: "center", name: message("taylor_center_name"), symbol: "c", value: fixed(model.center)},
                {id: "degree", name: message("taylor_degree_name"), symbol: "n", value: messageNumber(model.degree, 0)},
                {id: "x", name: message("taylor_x_name"), symbol: "x", value: fixed(model.x)},
                {id: "polynomial", name: message("taylor_readout_polynomial"), value: fixed(view.polynomial), legend: "polynomial"},
                {id: "function", name: message("taylor_readout_function"), value: fixed(view.value), legend: "function"},
                {id: "signed-error", name: message("taylor_readout_signed_error"), value: significant(view.signedError), legend: "error"},
                {id: "absolute-error", name: message("taylor_readout_absolute_error"), value: significant(view.absoluteError), legend: "error"},
                {id: "bound", name: message("taylor_readout_bound"), value: boundValue, legend: "bound", muted: !shown},
                {id: "hypothesis", name: message("taylor_readout_hypothesis"), value: shown ? hypothesis : hidden, muted: !shown},
            ]}],
            notes,
            readoutHelp: message("taylor_note"),
            legend: [
                {id: "function", label: message("taylor_legend_function"), kind: "line", object: "function"},
                {id: "polynomial", label: message("taylor_legend_polynomial"), kind: "dashed", object: "polynomial"},
                {id: "error", label: message("taylor_legend_error"), kind: "line", object: "error"},
                {id: "bound", label: message("taylor_legend_bound"), kind: "area", object: "bound"},
                {id: "convergence", label: message("taylor_legend_convergence"), kind: "area", object: "convergence"},
                {id: "center", label: message("taylor_legend_center"), kind: "point", object: "center-point"},
                {id: "x", label: message("taylor_legend_x"), kind: "point", object: "x-point"},
            ],
            actions: [{id: "show-error", label: message("show_error_bound"), help: message("taylor_bound_help"), placement: "board", enabled: true, pressed: shown, puck: true}],
            marks: this.viewMarks(model),
        };
    }

    /**
     * What the view director keeps visible (task 07): the expansion point (c, f(c)) must stay clear of the cards; samples of the function
     * and of the polynomial over the example's own interval are kept when there is room. A polynomial that runs off the example's
     * height is left out (high degrees explode away from c), so it cannot pull the view out.
     */
    private viewMarks(model: TaylorModel): ViewMarks {
        // Memoized on its inputs (the declaration is read on every render), so an unchanged state returns the same object.
        const cached = this.viewMarksCache;
        if (cached && cached.example === model.example && cached.center === model.center && cached.degree === model.degree) return cached.marks;
        const marks = this.computeViewMarks(model);
        this.viewMarksCache = {example: model.example, center: model.center, degree: model.degree, marks};
        return marks;
    }

    private viewMarksCache: {example: TaylorModel["example"]; center: number; degree: number; marks: ViewMarks} | undefined;

    private computeViewMarks(model: TaylorModel): ViewMarks {
        const example = taylorExample(model.example);
        const [left, top, right, bottom] = EXAMPLE_VIEWS[model.example];
        const height = top - bottom;
        const inside = (y: number) => Number.isFinite(y) && y >= bottom - height && y <= top + height;
        const samples = (valueAt: (x: number) => number): ViewMark => ({
            kind: "polyline",
            points: Array.from({length: VIEW_MARK_SAMPLES}, (_, i) => left + (right - left) * i / (VIEW_MARK_SAMPLES - 1))
                .filter(x => isTaylorX(example, x))
                .map(x => [x, valueAt(x)] as const).filter(([, y]) => inside(y)),
        });
        return {
            must: isTaylorX(example, model.center) ? [{kind: "point", x: model.center, y: taylorFunctionValue(example, model.center)}] : [],
            nice: [samples(x => taylorFunctionValue(example, x)), samples(x => taylorPolynomial(example, model.center, model.degree, x))],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp(element.elType === "point" ? "fillcolor" : "strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        if (id !== "show-error") throw new Error("Unknown action");
        runAs("learner", () => this.setBoundVisible(!this.model.boundVisible));
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const language = currentLanguage();
        const example = taylorExample(state.example);
        const fixedCenter = example.centerMin === example.centerMax;
        return <>
            <div className="inspector-group"><PuckOwned param="taylor-degree">
                <CountSetter label={t("taylor_degree_label")} n={state.degree} min={TAYLOR_DEGREE_MIN} max={TAYLOR_DEGREE_MAX} help={t("taylor_degree_help")}
                             rejectedHint={t("taylor_degree_rejected_hint", {value0: TAYLOR_DEGREE_MIN, value1: TAYLOR_DEGREE_MAX})}
                             onPlus={() => this.guarded(() => this.setDegree(this.model.degree + 1))}
                             onMinus={() => this.guarded(() => this.setDegree(this.model.degree - 1))}
                             onSet={next => guardField(this.refusals, () => this.setDegree(next))}/></PuckOwned>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("taylor_example_label")} value={state.example} help={t("taylor_example_help")}
                              options={TAYLOR_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.guarded(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <PuckOwned param={fixedCenter ? undefined : "taylor-center"}><Slider customText={t("taylor_center_label")} value={state.center} min={example.centerMin} max={example.centerMax} step={FIELD_STEP} fieldDecimals={PRECISE}
                        unavailableReason={fixedCenter ? t("taylor_center_fixed_help") : undefined}
                        rejectedHint={t("taylor_center_rejected_hint", {value0: formatNumber(example.centerMin, language), value1: formatNumber(example.centerMax, language)})}
                        onChange={next => guardField(this.refusals, () => this.setCenter(next))}/></PuckOwned>
                <PuckOwned param="taylor-x"><Slider customText={t("taylor_x_label")} value={state.x} min={example.xMin} max={example.xMax} step={FIELD_STEP} fieldDecimals={PRECISE}
                        rejectedHint={t("taylor_x_rejected_hint", {value0: formatNumber(example.xMin, language), value1: formatNumber(example.xMax, language)})}
                        onChange={next => guardField(this.refusals, () => this.setX(next))}/></PuckOwned>
                <p className="inspector-help">{t("taylor_points_help")}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const state = this.model;
        return <PuckOwned param="show-error">
            <div className="taylor-actions" role="group" aria-label={t("taylor_actions_label")}>
                <RevealButton action="toggle-taylor-bound" revealed={state.boundVisible} showLabel={t("show_error_bound")} hideLabel={t("hide_error_bound")}
                              onToggle={() => this.setBoundVisible(!this.model.boundVisible)}/>
            </div>
            <p className="inspector-help">{t("taylor_bound_help")}</p>
        </PuckOwned>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("taylor_legend_function"), kind: "line"},
            {id: "polynomial", color: GraphPalette.comparisonCurve, label: t("taylor_legend_polynomial"), kind: "dashed-line"},
            {id: "error", color: GraphPalette.warningText, label: t("taylor_legend_error"), kind: "line"},
            {id: "bound", color: GraphPalette.constructionAccent, label: t("taylor_legend_bound"), kind: "area"},
            {id: "convergence", color: GraphPalette.additionalCurves[0], label: t("taylor_legend_convergence"), kind: "area"},
        ]} declaredPanel/>;
    }

    /** The statuses to state in words (no changing numbers); each has a stable id. */
    private statuses(model: TaylorModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        result.push(model.boundVisible ? {id: "revealed", text: t("taylor_status_revealed")} : {id: "hidden", text: t("taylor_status_hidden")});
        if (view.insideConvergence !== undefined) {
            result.push(view.insideConvergence
                ? {id: "inside-convergence", text: t("taylor_status_inside")}
                : {id: "outside-convergence", text: t("taylor_status_outside")});
        }
        // Inside the convergence interval the error tends to 0 while the Lagrange bound (M grows with n) need not: say so, so the bound is not read as the error.
        if (model.boundVisible && view.insideConvergence && view.bound.kind === "bound" && model.x > model.center) {
            result.push({id: "bound-not-sharp", text: t("taylor_status_bound_not_sharp")});
        }
        if (model.example === "flat") {
            if (model.boundVisible) result.push({id: "no-bound", text: t("taylor_status_no_bound")});
            result.push({id: "flat", text: t("taylor_status_flat")});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const language: NumberLanguage = currentLanguage();
        const view = this.viewOf(model);
        const number = (value: number) => formatNumber(value, language, PRECISE);
        const hidden = t("taylor_hidden");
        const shown = model.boundVisible;
        const rows = [
            {id: "center", label: t("taylor_center_label"), value: number(model.center)},
            {id: "degree", label: t("taylor_degree_label"), value: String(model.degree)},
            {id: "x", label: t("taylor_x_label"), value: number(model.x)},
            {id: "polynomial", label: t("taylor_readout_polynomial"), value: number(view.polynomial)},
            {id: "function", label: t("taylor_readout_function"), value: number(view.value)},
            {id: "signed-error", label: t("taylor_readout_signed_error"), value: this.small(view.signedError)},
            {id: "absolute-error", label: t("taylor_readout_absolute_error"), value: this.small(view.absoluteError)},
            {
                id: "bound", label: t("taylor_readout_bound"),
                value: !shown ? hidden : view.bound.kind === "bound" ? this.small(view.bound.value) : t("taylor_bound_unavailable"),
            },
            {id: "bound-hypothesis", label: t("taylor_readout_hypothesis"), value: shown ? this.hypothesisText(model.example) : hidden},
            {id: "convergence", label: t("taylor_readout_series"), value: this.seriesText(model, view)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("taylor_note")} declaredPanel/>
            <FunctionStatus className="taylor-status" lines={this.statuses(model, view)} dataAttribute="taylor-status"/>
        </>;
    }
}

export default TaylorGraph;
