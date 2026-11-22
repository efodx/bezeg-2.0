import React from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {PlotPoint, plotPieces, SchoolFunction, TRANSFORM_BOUNDS} from "../../analysis/schoolFunctions";
import {RuleStep} from "../../analysis/transformation";
import {
    chooseTransformBase, DEFAULT_FUNCTION_TRANSFORMATION_MODEL, FunctionTransformationModel, moveTransformPoint, ruleStepsOf, setTransformParameter,
    TRANSFORM_BASE_IDS, TRANSFORM_U_MAX, TRANSFORM_U_MIN, TRANSFORM_U_STEP, TransformBaseId, TransformParameter, trackedPointOf,
    transformBaseFunction, transformedFunctionOf,
} from "../../analysis/functionTransformationModel";
import {functionTransformationEditMessage, shiftedArgument, transformRuleText} from "./functionTransformationMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {RevealButton} from "../../inputs/RevealButton";
import {ToolSection} from "../../inputs/ToolSection";
import {pickOn} from "../../uxPicks/picks";
import type {FocusDecl, GraphUx} from "../../uxPicks/declare/graphUx";
import type {FocusShape} from "../../uxPicks/declare/focusShapes";
import {schoolFunctionModel} from "../../analysis/schoolFunctions";

/** Board captions move into the cards while pick `boardText` is on (the graph decides). */
const boardTextOnBoard = (): boolean => !pickOn("boardText");

/** Positions show four decimals, so that 0.25 and 1.5 are read off exactly. */
const PRECISE = 4;

/** Step of the arrow keys in the parameter fields. */
const FIELD_STEP = 0.1;

/** The base shapes as they are written in the selector. */
const PRETTY_BASE: Readonly<Record<TransformBaseId, string>> = {
    square: "x²", cube: "x³", sqrt: "√x", reciprocal: "1/x", abs: "|x|", exp: "eˣ", ln: "ln x",
};

/** The base shapes as TeX, for the readout card. */
const BASE_TEX: Readonly<Record<TransformBaseId, string>> = {
    square: "x^{2}", cube: "x^{3}", sqrt: "\\sqrt{x}", reciprocal: "\\frac{1}{x}", abs: "|x|", exp: "e^{x}", ln: "\\ln x",
};

/** Dash style (JSXGraph numbering) of the ghost: the base graph is dashed, so it differs from the transformed graph by pattern and not only by colour. */
const GHOST_DASH = 2;

/** Translations (c, d) lead: the first task is one translation of the base graph; the stretches follow. */
const TRANSLATIONS_FIRST: readonly TransformParameter[] = ['c', 'd', 'a', 'b'];

const LABEL_KEYS = {
    a: "function_transformation_a_label", b: "function_transformation_b_label", c: "function_transformation_c_label", d: "function_transformation_d_label",
} as const;

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

    private curve(fn: () => SchoolFunction, attributes: object): void {
        const curve = this.own(this.board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as {
            updateDataArray: () => void; dataX: number[]; dataY: number[];
        };
        curve.updateDataArray = () => {
            const {x, y} = this.plotted(fn());
            curve.dataX = x;
            curve.dataY = y;
        };
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
        this.curve(() => transformBaseFunction(model().base), {
            strokeColor: GraphPalette.referenceCurve, dash: GHOST_DASH, strokeWidth, visible: () => model().ghostVisible,
        });
        this.curve(() => transformedFunctionOf(model()), {strokeColor: GraphPalette.primaryCurve, strokeWidth});
        this.baseDot = this.marker("base", GraphPalette.referenceCurve, () => model().ghostVisible && tracked() !== undefined);
        this.imageDot = this.marker("image", GraphPalette.constructionAccent, () => tracked() !== undefined);
        this.syncSceneToModel();

        // The rule and the tracked point stay on the board (projection needs them).
        this.caption("bottom-right", [
            {text: () => transformRuleText(model(), currentLanguage()), scale: 1.2, math: true, visible: boardTextOnBoard},
            {text: () => this.boardPointText(model()), minBoardWidth: 520, visible: boardTextOnBoard},
        ]);
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

    private boardPointText(model: FunctionTransformationModel): string {
        const point = trackedPointOf(model);
        if (!point) return t("function_transformation_board_point_undefined", {value0: this.number(model.u)});
        return t("function_transformation_board_point", {
            value0: this.number(point.base.x), value1: this.number(point.base.y), value2: this.number(point.image.x), value3: this.number(point.image.y),
        });
    }

    private stepText(step: RuleStep): string {
        switch (step.kind) {
            case "shift-inside": return t("function_transformation_step_shift_inside", {value0: shiftedArgument(step.c, currentLanguage())});
            case "scale-inside": return t(step.mirrorsAboutVertical ? "function_transformation_step_scale_inside_mirror" : "function_transformation_step_scale_inside",
                {value0: this.number(step.b)});
            case "apply-base": return t("function_transformation_step_apply_base");
            case "scale-outside": return t(step.mirrorsAboutHorizontal ? "function_transformation_step_scale_outside_mirror" : "function_transformation_step_scale_outside",
                {value0: this.number(step.a)});
            case "shift-outside": return t("function_transformation_step_shift_outside", {value0: this.number(step.d)});
        }
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const hint = (min: number, max: number) => ({value0: formatNumber(min, currentLanguage()), value1: formatNumber(max, currentLanguage())});
        return <>
            <ToolSection id="function-transformation-parameters" pickTitle={t("function_transformation_parameters_title")} help={t("function_transformation_order_help")}>
                {TRANSLATIONS_FIRST.map(field => {
                    const [min, max] = TRANSFORM_BOUNDS[field];
                    return <Slider key={field} paramKey={`transform.${field}`} customText={t(LABEL_KEYS[field])} value={state[field]} min={min} max={max} step={FIELD_STEP} decimals={PRECISE}
                                        rejectedHint={field === "b" ? t("function_transformation_b_hint", hint(min, max)) : t("function_transformation_range_hint", hint(min, max))}
                                        onChange={next => this.ignoreOutOfDomain(() => this.setParameter(field, next))}/>;
                })}
                <Slider paramKey="transform.u" customText={t("function_transformation_u_label")} value={state.u} min={TRANSFORM_U_MIN} max={TRANSFORM_U_MAX} step={TRANSFORM_U_STEP}
                             decimals={PRECISE} rejectedHint={t("function_transformation_range_hint", hint(TRANSFORM_U_MIN, TRANSFORM_U_MAX))}
                             onChange={next => this.ignoreOutOfDomain(() => this.setU(next))}/>
            </ToolSection>
            <ToolSection id="function-transformation-base" pickTitle={t("function_transformation_base_label")}>
                <ChoiceSelect label={t("function_transformation_base_label")} value={state.base} help={t("function_transformation_base_help")}
                              options={TRANSFORM_BASE_IDS.map(id => ({value: id, text: `f(x) = ${PRETTY_BASE[id]}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setBase(next))}/>
            </ToolSection>
            <div className="convexity-actions" role="group" aria-label={t("function_transformation_actions_label")}>
                <RevealButton action="toggle-ghost" revealed={state.ghostVisible} showLabel={t("function_transformation_ghost_show")} hideLabel={t("function_transformation_ghost_hide")}
                              onToggle={() => this.setGhostVisible(!this.model.ghostVisible)}/>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        if (pickOn("boardText")) return null; // the legend card shows it
        return <FunctionLegend items={[
            {id: "curve", color: GraphPalette.primaryCurve, label: t("function_transformation_legend_curve"), kind: "line"},
            {id: "ghost", color: GraphPalette.referenceCurve, label: t("function_transformation_legend_ghost"), kind: "dashed-line"},
            {id: "point", color: GraphPalette.constructionAccent, label: t("function_transformation_legend_point"), kind: "dot"},
        ]}/>;
    }

    /** The cards' declaration (pick boardText): the rule, the traced point and its image, the order of operations, the legend. */
    protected override workspaceUx(): GraphUx | undefined {
        if (!pickOn("boardText")) return undefined;
        const model = this.model;
        const point = trackedPointOf(model);
        const undefinedText = t("function_transformation_point_undefined");
        return {
            pucks: [
                {param: "transform.c", help: t("function_transformation_order_help")},
                {param: "transform.d", help: t("function_transformation_order_help")},
                {param: "transform.a", help: t("function_transformation_order_help")},
                {param: "transform.b", help: t("function_transformation_order_help")},
                {param: "transform.u", help: t("function_transformation_note")},
            ],
            focus: this.focusDecl(),
            // TeX: the decimal comma of the rule text must not get a space after it.
            formula: transformRuleText(model, currentLanguage()).replace(/,/g, "{,}"),
            readouts: [
                {id: "rule", title: t("function_transformation_readout_rule"), rows: [
                    {id: "base", name: t("function_transformation_base_label").replace(/\s+f$/, ""), symbol: "f(x)", value: PRETTY_BASE[model.base], valueTex: BASE_TEX[model.base], tone: "muted"},
                ]},
                {id: "point", title: t("function_transformation_legend_point"), rows: [
                    {id: "u", name: t("function_transformation_u_label"), value: this.number(model.u)},
                    {id: "base-point", name: t("function_transformation_readout_base_point"), value: point ? this.pointText(point.base.x, point.base.y) : undefinedText, tone: "muted"},
                    {id: "image-point", name: t("function_transformation_readout_image_point"), value: point ? this.pointText(point.image.x, point.image.y) : undefinedText, tone: "primary"},
                ]},
            ],
            readoutHelp: <p>{t("function_transformation_note")}</p>,
            legend: [
                {id: "curve", label: t("function_transformation_legend_curve"), kind: "line", color: GraphPalette.primaryCurve},
                ...(model.ghostVisible ? [{id: "ghost", label: t("function_transformation_legend_ghost"), kind: "dashed" as const, color: GraphPalette.referenceCurve}] : []),
                {id: "point", label: t("function_transformation_legend_point"), kind: "point", color: GraphPalette.constructionAccent},
            ],
            sections: [{id: "steps", title: t("function_transformation_steps_title"), body: this.stepsList(model)}],
        };
    }

    /**
     * What the view keeps in view: the anchor (c, d) (image of the origin of the base shape), the traced point (u, f(u)) and its
     * image (must); the transformed curve around the anchor, y clamped to the default view (nice). A pure function of a, b, c, d, u.
     */
    private focusDecl(): FocusDecl {
        const [, top, , bottom] = this.defaultBoundingBox();
        const clamp = (y: number) => Math.min(top, Math.max(bottom, y));
        return {
            at: values => {
                const m = this.model;
                const model = {
                    ...m, a: values["transform.a"] ?? m.a, b: values["transform.b"] ?? m.b, c: values["transform.c"] ?? m.c,
                    d: values["transform.d"] ?? m.d, u: values["transform.u"] ?? m.u,
                };
                const tracked = trackedPointOf(model);
                const value = schoolFunctionModel(transformedFunctionOf(model)).value;
                const half = Math.min(6, 3 / Math.max(Math.abs(model.b), 0.5));
                const from = Math.min(model.c, tracked?.image.x ?? model.c) - half, to = Math.max(model.c, tracked?.image.x ?? model.c) + half;
                const must: FocusShape[] = [{kind: "point", at: [model.c, model.d]}];
                if (tracked) must.push({kind: "point", at: [tracked.base.x, tracked.base.y]}, {kind: "point", at: [tracked.image.x, tracked.image.y]});
                return {
                    must,
                    nice: [{kind: "curve", f: x => { const y = value(x); return y === undefined ? NaN : clamp(y); }, from, to}],
                };
            },
            limits: {maxOut: 1.6, maxIn: 1.6},
        };
    }

    private stepsList(model: FunctionTransformationModel): React.ReactNode {
        return <ol data-transform-steps>
            {ruleStepsOf(model).map(step => <li key={step.kind} data-step={step.kind}>{this.stepText(step)}</li>)}
        </ol>;
    }

    protected renderReadout(): React.ReactNode {
        if (pickOn("boardText")) return null; // the readout and section cards show it
        const model = this.model;
        const point = trackedPointOf(model);
        const undefinedText = t("function_transformation_point_undefined");
        const rows = [
            {id: "rule", label: t("function_transformation_readout_rule"), value: transformRuleText(model, currentLanguage())},
            {id: "base-point", label: t("function_transformation_readout_base_point"), value: point ? this.pointText(point.base.x, point.base.y) : undefinedText},
            {id: "image-point", label: t("function_transformation_readout_image_point"), value: point ? this.pointText(point.image.x, point.image.y) : undefinedText},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("function_transformation_note")}/>
            
            <ToolSection id="function-transformation-steps" title={t("function_transformation_steps_title")}>
                {this.stepsList(model)}
            </ToolSection>
        </>;
    }
}

export default FunctionTransformationGraph;
