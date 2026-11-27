import React from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {PuckOwned} from "../base/controls/PuckOwnership";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, messageNumber, renderMessage, t, type Message} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, ParameterDeclaration, ViewMark, ViewMarks} from "../base/declare/graphDeclaration";
import {runAs} from "../base/writes/writeSource";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {PlotPoint, plotPieces, SchoolFunction, TRANSFORM_BOUNDS} from "../../analysis/schoolFunctions";
import {RuleStep} from "../../analysis/transformation";
import {
    chooseTransformBase, DEFAULT_FUNCTION_TRANSFORMATION_MODEL, FunctionTransformationModel, moveTransformPoint, ruleStepsOf, setTransformParameter,
    TRANSFORM_BASE_IDS, TRANSFORM_U_MAX, TRANSFORM_U_MIN, TRANSFORM_U_STEP, TransformBaseId, TransformParameter, trackedPointOf,
    transformBaseFunction, transformedFunctionOf,
} from "../../analysis/functionTransformationModel";
import {functionTransformationEditMessage, shiftedArgument, transformRuleParts, transformRuleText} from "./functionTransformationMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {RevealButton} from "../../inputs/RevealButton";
import type {ParameterBinding} from "../base/writes/parameterArbiter";

/** Positions show four decimals, so that 0.25 and 1.5 are read off exactly. */
const PRECISE = 4;

/** Step of the arrow keys in the parameter fields. */
const FIELD_STEP = 0.1;

/** The base shapes as they are written in the selector. */
const PRETTY_BASE: Readonly<Record<TransformBaseId, string>> = {
    square: "x²", cube: "x³", sqrt: "√x", reciprocal: "1/x", abs: "|x|", exp: "eˣ", ln: "ln x",
};

/** Dash style (JSXGraph numbering) of the ghost: the base graph is dashed, so it differs from the transformed graph by pattern and not only by colour. */
const GHOST_DASH = 2;

/** Translations (c, d) lead: the first task is one translation of the base graph; the stretches follow. */
const TRANSLATIONS_FIRST: readonly TransformParameter[] = ['c', 'd', 'a', 'b'];

const LABEL_KEYS = {
    a: "function_transformation_a_label", b: "function_transformation_b_label", c: "function_transformation_c_label", d: "function_transformation_d_label",
} as const;

/** The ids of the transformation graph's declaration (`DeclarationIds`): the arbiter keys, rows, the section, the legend entries and the ghost action. */
export type TransformationIds = {
    param: "transform-a" | "transform-b" | "transform-c" | "transform-d" | "transform-u" | "transform-base";
    row: "rule" | "base-point" | "image-point";
    note: never;
    legend: "curve" | "ghost" | "point";
    section: "order";
    action: "toggle-ghost";
};

/**
 * Graph transformations y = a f(b(x - c)) + d (school function lesson S1). The model is
 * `{base, a, b, c, d, ghostVisible, u}` (`src/analysis/functionTransformationModel`, which owns validity and the issues): the base shape
 * f, the four parameters, whether the base graph is drawn as a ghost and the abscissa u of the tracked point (u, f(u)) of the base
 * graph. The tracked point and its image (u/b + c, a f(u) + d) are both draggable along their graphs; the image follows the
 * point map of `src/analysis/transformation`. Changing the base shape keeps the parameters; b = 0 is refused, a negative b mirrors
 * the graph about x = c. The curves are sampled by `plotPieces`, which breaks the line at poles and domain edges.
 */
export class FunctionTransformationGraph extends BaseFunctionGraph<FunctionTransformationModel> {
    private baseDot?: JXG.Point;
    private imageDot?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections["function-transformation"];
    }

    protected defaultModel(): FunctionTransformationModel {
        return {...DEFAULT_FUNCTION_TRANSFORMATION_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [-6, 7, 12, -9];
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    protected setParameter(field: TransformParameter, value: number, options: { syncScene?: boolean } = {}): void {
        const edit = setTransformParameter(this.model, field, value);
        if (!edit.ok) throw new DomainError(functionTransformationEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setU(value: number, options: { syncScene?: boolean } = {}): void {
        const edit = moveTransformPoint(this.model, value);
        if (!edit.ok) throw new DomainError(functionTransformationEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setBase(value: unknown): void {
        const edit = chooseTransformBase(this.model, value);
        if (!edit.ok) throw new DomainError(functionTransformationEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
    }

    protected setGhostVisible(visible: boolean): void {
        if (visible !== this.model.ghostVisible) this.commitModel({...this.model, ghostVisible: visible});
    }

    /**
     * Parameter writes (ADR 0064). Keys are the lesson names. Writers: the tools fields, the base selector and the two
     * board markers (u) (`learner`, tagged by their input gesture), lesson actions and scenes (`lesson`); nothing animates them.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const parameter = (field: TransformParameter): ParameterBinding =>
            ({read: () => this.model[field], apply: (value: number) => this.setParameter(field, value)});
        return {
            "transform-a": parameter("a"), "transform-b": parameter("b"), "transform-c": parameter("c"), "transform-d": parameter("d"),
            "transform-u": {read: () => this.model.u, apply: (value: number) => this.setU(value)},
            "transform-base": {read: () => this.model.base, apply: (value: unknown) => this.setBase(value)},
        };
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "transform-a": value => this.setParameter("a", value), "transform-b": value => this.setParameter("b", value),
                "transform-c": value => this.setParameter("c", value), "transform-d": value => this.setParameter("d", value),
                "transform-u": value => this.setU(value),
            },
            choices: {"transform-base": value => this.setBase(value)},
            visibility: {reference: visible => this.setGhostVisible(visible)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The polyline pieces of `fn` over the view, joined into one curve with NaN gaps (so poles and domain edges break the line). */
    private plotted(fn: SchoolFunction): { x: number[]; y: number[] } {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const x: number[] = [];
        const y: number[] = [];
        plotPieces(fn, left, right, bottom, top).forEach((piece: PlotPoint[], index) => {
            if (index > 0) {
                x.push(NaN);
                y.push(NaN);
            }
            for (const point of piece) {
                x.push(point.x);
                y.push(point.y);
            }
        });
        return {x, y};
    }

    private curve(id: string, fn: () => SchoolFunction, attributes: object): void {
        const curve = this.own(this.board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as {
            updateDataArray: () => void; dataX: number[]; dataY: number[];
        };
        curve.updateDataArray = () => {
            const {x, y} = this.plotted(fn());
            curve.dataX = x;
            curve.dataY = y;
        };
        this.drawn.set(id, curve as unknown as JXG.GeometryElement);
    }

    /**
     * A marker of the tracked point. Dragging projects its abscissa to u on the grid of TRANSFORM_U_STEP (the image through u = b (x - c)),
     * refuses a u outside the base domain or range and puts the marker back on its graph.
     */
    private marker(kind: "base" | "image", color: string, shown: () => boolean): JXG.Point {
        const model = () => this.model;
        const point = this.own(this.board.create("point", [0, 0], {
            ...this.styles.point.default, name: "", withLabel: false, fillColor: color, highlightFillColor: color, visible: shown,
            size: () => Math.max(4, this.displaySettings.pointSize),
        })) as JXG.Point;
        bindMovablePointCursor(point, this.board);
        point.on("drag", () => {
            const raw = kind === "base" ? point.X() : model().b * (point.X() - model().c);
            const u = cleanNumber(Math.min(TRANSFORM_U_MAX, Math.max(TRANSFORM_U_MIN, Math.round(raw / TRANSFORM_U_STEP) * TRANSFORM_U_STEP)));
            if (Number.isFinite(u) && trackedPointOf({...model(), u}) !== undefined) this.ignoreOutOfDomain(() => this.setU(u, {syncScene: false}));
            this.syncSceneToModel();
        });
        return point;
    }

    protected createScene(): void {
        const model = () => this.model;
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const tracked = () => trackedPointOf(model());

        // Layers, lowest first: the ghost, the transformed graph, the markers.
        this.curve("ghost", () => transformBaseFunction(model().base), {
            strokeColor: GraphPalette.referenceCurve, dash: GHOST_DASH, strokeWidth, visible: () => model().ghostVisible,
        });
        this.curve("curve", () => transformedFunctionOf(model()), {strokeColor: GraphPalette.primaryCurve, strokeWidth});
        this.baseDot = this.marker("base", GraphPalette.referenceCurve, () => model().ghostVisible && tracked() !== undefined);
        this.imageDot = this.marker("image", GraphPalette.constructionAccent, () => tracked() !== undefined);
        this.drawn.set("point", this.imageDot);
        this.syncSceneToModel();
    }

    protected override syncSceneToModel(): void {
        const point = trackedPointOf(this.model);
        if (!point) return;
        this.baseDot?.moveTo([point.base.x, point.base.y]);
        this.imageDot?.moveTo([point.image.x, point.image.y]);
    }

    protected override onSceneRemoved(): void {
        this.baseDot = undefined;
        this.imageDot = undefined;
        this.drawn.clear();
    }

    // ---- Declaration (task 02) -----------------------------------------------------------------------------------------

    private pointMessage(x: number, y: number): Message {
        return message("transformations_point_value", {value0: messageNumber(x, PRECISE), value1: messageNumber(y, PRECISE)});
    }

    private stepMessage(step: RuleStep): Message {
        const number = (value: number) => messageNumber(value, PRECISE);
        switch (step.kind) {
            case "shift-inside": return message("function_transformation_step_shift_inside", {value0: shiftedArgument(step.c, currentLanguage())});
            case "scale-inside": return message(step.mirrorsAboutVertical ? "function_transformation_step_scale_inside_mirror" : "function_transformation_step_scale_inside", {value0: number(step.b)});
            case "apply-base": return message("function_transformation_step_apply_base");
            case "scale-outside": return message(step.mirrorsAboutHorizontal ? "function_transformation_step_scale_outside_mirror" : "function_transformation_step_scale_outside", {value0: number(step.a)});
            case "shift-outside": return message("function_transformation_step_shift_outside", {value0: number(step.d)});
        }
    }

    /**
     * Pure data from the model, reproducing the present panel: the four parameters, the tracked abscissa and the base choice on
     * the board (changed while watching the graph), the three readouts, the order of operations as a section and the ghost
     * toggle in Orodja (a display setting the lessons switch on themselves).
     */
    protected override declaration(): GraphDeclaration<TransformationIds> {
        const model = this.model;
        const point = trackedPointOf(model);
        const undefinedText = message("function_transformation_point_undefined");
        const parts = transformRuleParts(model, currentLanguage());
        const range = (key: TransformationIds["param"], label: Message, symbol: string, min: number, max: number, step: number): ParameterDeclaration<TransformationIds["param"]> =>
            ({key, kind: "range", label, symbol, placement: "board", min, max, step, maxDecimals: PRECISE});
        const parameters: ParameterDeclaration<TransformationIds["param"]>[] = [
            range("transform-c", message(LABEL_KEYS.c), "c", TRANSFORM_BOUNDS.c[0], TRANSFORM_BOUNDS.c[1], FIELD_STEP),
            range("transform-d", message(LABEL_KEYS.d), "d", TRANSFORM_BOUNDS.d[0], TRANSFORM_BOUNDS.d[1], FIELD_STEP),
            range("transform-a", message(LABEL_KEYS.a), "a", TRANSFORM_BOUNDS.a[0], TRANSFORM_BOUNDS.a[1], FIELD_STEP),
            range("transform-b", message(LABEL_KEYS.b), "b", TRANSFORM_BOUNDS.b[0], TRANSFORM_BOUNDS.b[1], FIELD_STEP),
            range("transform-u", message("function_transformation_u_label"), "u", TRANSFORM_U_MIN, TRANSFORM_U_MAX, TRANSFORM_U_STEP),
            {key: "transform-base", kind: "choice", label: message("function_transformation_base_label"), symbol: "f", help: message("function_transformation_base_help"), placement: "board",
                options: TRANSFORM_BASE_IDS.map(id => ({value: id, label: message(`transformations_base_${id}`)}))},
        ];
        const actions: ActionDeclaration<TransformationIds>[] = [
            {id: "toggle-ghost", label: message(model.ghostVisible ? "function_transformation_ghost_hide" : "function_transformation_ghost_show"), placement: "tools", enabled: true, pressed: model.ghostVisible},
        ];
        return {
            parameters,
            readouts: [{id: "values", title: message("function_readouts"), rows: [
                {id: "rule", name: message("function_transformation_readout_rule"), value: message("transformations_rule_value", {value0: parts.factor, value1: parts.inside, value2: parts.outside})},
                {id: "base-point", name: message("function_transformation_readout_base_point"), value: point ? this.pointMessage(point.base.x, point.base.y) : undefinedText},
                {id: "image-point", name: message("function_transformation_readout_image_point"), value: point ? this.pointMessage(point.image.x, point.image.y) : undefinedText},
            ]}],
            readoutHelp: message("function_transformation_note"),
            legend: [
                {id: "curve", label: message("function_transformation_legend_curve"), kind: "line", object: "curve"},
                {id: "ghost", label: message("function_transformation_legend_ghost"), kind: "dashed", object: "ghost"},
                {id: "point", label: message("function_transformation_legend_point"), kind: "point", object: "point"},
            ],
            sections: [{id: "order", title: message("function_transformation_steps_title"), body: [
                {kind: "text", text: message("function_transformation_order_help")},
                ...ruleStepsOf(model).map(step => ({kind: "text" as const, text: this.stepMessage(step)})),
            ]}],
            actions,
            marks: this.viewMarks(model),
        };
    }

    private viewMarksCache: {model: FunctionTransformationModel; marks: ViewMarks} | undefined;

    /**
     * What the view director keeps visible (task 07): the tracked point (u, f(u)) of the base graph and its image, the two points the
     * lesson compares. Both are read from the model (`trackedPointOf`), none when u is outside the base domain. Memoized on the model.
     */
    private viewMarks(model: FunctionTransformationModel): ViewMarks {
        if (this.viewMarksCache?.model === model) return this.viewMarksCache.marks;
        const tracked = trackedPointOf(model);
        const marks: ViewMarks = {must: tracked
            ? [tracked.base, tracked.image].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p): ViewMark => ({kind: "point", x: p.x, y: p.y}))
            : []};
        this.viewMarksCache = {model, marks};
        return marks;
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp(element.elType === "point" ? "fillcolor" : "strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        if (id !== "toggle-ghost") throw new Error("Unknown action");
        runAs("learner", () => this.setGhostVisible(!this.model.ghostVisible));
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number, language: NumberLanguage = currentLanguage()): string {
        return formatNumber(value, language, PRECISE);
    }

    /** A point as (x; y) with decimal commas in Slovenian and (x, y) in English. */
    private pointText(x: number, y: number): string {
        const language = currentLanguage();
        return `(${this.number(x, language)}${language === "sl" ? "; " : ", "}${this.number(y, language)})`;
    }

    private stepText(step: RuleStep): string {
        return renderMessage(this.stepMessage(step));
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const hint = (min: number, max: number) => ({value0: formatNumber(min, currentLanguage()), value1: formatNumber(max, currentLanguage())});
        return <>
            <div className="inspector-group">
                {TRANSLATIONS_FIRST.map(field => {
                    const [min, max] = TRANSFORM_BOUNDS[field];
                    return <PuckOwned key={field} param={`transform-${field}`}><Slider customText={t(LABEL_KEYS[field])} value={state[field]} min={min} max={max} step={FIELD_STEP} decimals={PRECISE}
                                        rejectedHint={field === "b" ? t("function_transformation_b_hint", hint(min, max)) : t("function_transformation_range_hint", hint(min, max))}
                                        onChange={next => this.ignoreOutOfDomain(() => this.setParameter(field, next))}/></PuckOwned>;
                })}
                <PuckOwned param="transform-u"><Slider customText={t("function_transformation_u_label")} value={state.u} min={TRANSFORM_U_MIN} max={TRANSFORM_U_MAX} step={TRANSFORM_U_STEP}
                             decimals={PRECISE} rejectedHint={t("function_transformation_range_hint", hint(TRANSFORM_U_MIN, TRANSFORM_U_MAX))}
                             onChange={next => this.ignoreOutOfDomain(() => this.setU(next))}/></PuckOwned>
                <p className="inspector-help">{t("function_transformation_order_help")}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("function_transformation_base_label")} value={state.base} help={t("function_transformation_base_help")}
                              options={TRANSFORM_BASE_IDS.map(id => ({value: id, text: `f(x) = ${PRETTY_BASE[id]}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setBase(next))}/>
            </div>
            <div className="convexity-actions" role="group" aria-label={t("function_transformation_actions_label")}>
                <RevealButton action="toggle-ghost" revealed={state.ghostVisible} showLabel={t("function_transformation_ghost_show")} hideLabel={t("function_transformation_ghost_hide")}
                              onToggle={() => this.setGhostVisible(!this.model.ghostVisible)}/>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "curve", color: GraphPalette.primaryCurve, label: t("function_transformation_legend_curve"), kind: "line"},
            {id: "ghost", color: GraphPalette.referenceCurve, label: t("function_transformation_legend_ghost"), kind: "dashed-line"},
            {id: "point", color: GraphPalette.constructionAccent, label: t("function_transformation_legend_point"), kind: "dot"},
        ]} declaredPanel/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const point = trackedPointOf(model);
        const undefinedText = t("function_transformation_point_undefined");
        const rows = [
            {id: "rule", label: t("function_transformation_readout_rule"), value: transformRuleText(model, currentLanguage())},
            {id: "base-point", label: t("function_transformation_readout_base_point"), value: point ? this.pointText(point.base.x, point.base.y) : undefinedText},
            {id: "image-point", label: t("function_transformation_readout_image_point"), value: point ? this.pointText(point.image.x, point.image.y) : undefinedText},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("function_transformation_note")} declaredPanel/>
            <div className="inspector-group">
                <h3>{t("function_transformation_steps_title")}</h3>
                <ol data-transform-steps>
                    {ruleStepsOf(model).map(step => <li key={step.kind} data-step={step.kind}>{this.stepText(step)}</li>)}
                </ol>
            </div>
        </>;
    }
}

export default FunctionTransformationGraph;
