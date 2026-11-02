import React from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {Point2} from "../../analysis/transformation";
import {SlopeResult} from "../../analysis/inverse";
import {
    chooseInverseRestriction, DEFAULT_FUNCTION_INVERSE_MODEL, FunctionInverseModel, hasAsymptotes, INVERSE_BASE_MAX, INVERSE_BASE_MIN, INVERSE_RESTRICTION_IDS,
    INVERSE_X0_STEP, inverseSlopesOf, inversePairOf, inverseX0Range, InverseRestrictionId, moveInversePoint, setInverseBase,
} from "../../analysis/functionInverseModel";
import {functionInverseEditMessage} from "./functionInverseMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";

/** Positions and slopes show four decimals, so that 0.25 and 5.5452 are read off. */
const PRECISE = 4;

/** Step of the arrow keys in the base field. */
const BASE_STEP = 0.1;

/** Samples across the view; the points nearest to the curve's edge (x = 0) are added below, where sqrt and ln are steepest. */
const SAMPLES = 320;
const EDGE_SAMPLES = [0, 1e-6, 1e-4, 1e-3, 1e-2];

/** Half length of a drawn tangent, in board units along the tangent. */
const TANGENT_HALF_LENGTH = 2.5;

/** Dash styles (JSXGraph numbering): construction lines are dashed so that they differ from the graphs by pattern and not only by colour. */
const DASH = 2;

const RESTRICTION_KEYS = {
    square: "function_inverse_restriction_square", exp: "function_inverse_restriction_exp", natural: "function_inverse_restriction_natural",
} as const satisfies Record<InverseRestrictionId, string>;

const HYPOTHESIS_KEYS = {
    square: "function_inverse_hypothesis_square", exp: "function_inverse_hypothesis_exp", natural: "function_inverse_hypothesis_natural",
} as const satisfies Record<InverseRestrictionId, string>;

/**
 * Inverse functions and the logarithm (school function lesson S2). The model is `{restriction, base, x0, inverseVisible, tangentVisible}`
 * (`src/analysis/functionInverseModel`, which owns validity and the issues): one of the three one-to-one restrictions (x^2 on x >= 0
 * with sqrt, a^x with log_a, e^x with ln), the base a, the abscissa x0 of the point P = (x0, f(x0)) and two toggles ("predict, then
 * reveal" the inverse curve; the tangent at P and the mirrored tangent at P'). The mirror P' = (f(x0), x0) is the reflection in
 * y = x, a swap of coordinates; the slopes at P and P' come from the kernel `src/analysis/inverse` and are reciprocal. Where the
 * forward slope is 0 the inverse tangent is drawn vertical and no slope number is shown.
 */
export class FunctionInverseGraph extends BaseFunctionGraph<FunctionInverseModel> {
    private dotP?: JXG.Point;
    private dotMirror?: JXG.Point;
    private inverseCurve?: JXG.Curve;

    override presetCollection() {
        return functionPresetCollections["function-inverse"];
    }

    protected defaultModel(): FunctionInverseModel {
        return {...DEFAULT_FUNCTION_INVERSE_MODEL};
    }

    /** Holds P and P' for every valid model: f(x0) <= 8 (`INVERSE_VALUE_MAX`) and x0 >= -3, with a margin at x0 = -3. */
    protected defaultBoundingBox(): BoundingBox {
        return [-4, 9, 11, -4];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    protected setBase(value: number, options: { syncScene?: boolean } = {}): void {
        const edit = setInverseBase(this.model, value);
        if (!edit.ok) throw new DomainError(functionInverseEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setX0(value: number, options: { syncScene?: boolean } = {}): void {
        const edit = moveInversePoint(this.model, value);
        if (!edit.ok) throw new DomainError(functionInverseEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setRestriction(value: unknown): void {
        const edit = chooseInverseRestriction(this.model, value);
        if (!edit.ok) throw new DomainError(functionInverseEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
    }

    protected setInverseVisible(visible: boolean): void {
        if (visible !== this.model.inverseVisible) this.commitModel({...this.model, inverseVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"inverse-base": value => this.setBase(value), "inverse-x0": value => this.setX0(value)},
            choices: {"inverse-restriction": value => this.setRestriction(value)},
            visibility: {tangent: visible => this.setTangentVisible(visible), "inverse-curve": visible => this.setInverseVisible(visible)},
        };
    }

    protected setTangentVisible(visible: boolean): void {
        if (visible !== this.model.tangentVisible) this.commitModel({...this.model, tangentVisible: visible});
    }

    protected resetValues(): void {
        this.commitModel(this.defaultModel());
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** A curve y = value(x) over the view, with NaN gaps where the function has no value. */
    private sampled(value: (x: number) => number | undefined): { x: number[]; y: number[] } {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const span = Math.abs(top - bottom);
        const xs = new Set<number>(EDGE_SAMPLES.filter(x => x >= left && x <= right));
        for (let i = 0; i <= SAMPLES; i++) xs.add(left + (right - left) * i / SAMPLES);
        const x: number[] = [];
        const y: number[] = [];
        for (const xi of [...xs].sort((p, q) => p - q)) {
            const yi = value(xi);
            if (yi === undefined || !Number.isFinite(yi) || Math.abs(yi) > 1000 * span) {
                if (x.length > 0 && !Number.isNaN(x[x.length - 1])) {
                    x.push(NaN);
                    y.push(NaN);
                }
                continue;
            }
            x.push(xi);
            y.push(yi);
        }
        return {x, y};
    }

    private curve(data: () => { x: number[]; y: number[] }, attributes: object): JXG.Curve {
        const curve = this.own(this.board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as {
            updateDataArray: () => void; dataX: number[]; dataY: number[];
        };
        curve.updateDataArray = () => {
            const {x, y} = data();
            curve.dataX = x;
            curve.dataY = y;
        };
        return curve as unknown as JXG.Curve;
    }

    private straightLine(through: [number, number], direction: [number, number], attributes: object): void {
        const [x, y] = through;
        this.own(this.board.create("line", [[x, y], [x + direction[0], y + direction[1]]], {
            highlight: false, fixed: true, straightFirst: true, straightLast: true, ...attributes,
        }));
    }

    /** A tangent segment through `at`: along (1, slope), or vertical for a vertical tangent, and nothing where the slope is undefined. */
    private tangentSegment(at: Point2, slope: SlopeResult): { x: number[]; y: number[] } {
        if (slope.kind === "undefined") return {x: [], y: []};
        const [dx, dy] = slope.kind === "vertical" ? [0, 1] : [1 / Math.hypot(1, slope.value), slope.value / Math.hypot(1, slope.value)];
        return {x: [at.x - TANGENT_HALF_LENGTH * dx, at.x + TANGENT_HALF_LENGTH * dx], y: [at.y - TANGENT_HALF_LENGTH * dy, at.y + TANGENT_HALF_LENGTH * dy]};
    }

    /** The marker P. Dragging projects its abscissa to the grid of INVERSE_X0_STEP, inside the range of the restriction, back onto the curve. */
    private marker(): JXG.Point {
        const point = this.own(this.board.create("point", [0, 0], {
            ...this.styles.point.default, name: "", withLabel: false, fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve,
            size: () => Math.max(4, this.displaySettings.pointSize),
        })) as JXG.Point;
        bindMovablePointCursor(point, this.board);
        point.on("drag", () => {
            const [min, max] = inverseX0Range(this.model.restriction, this.model.base);
            const raw = cleanNumber(Math.round(point.X() / INVERSE_X0_STEP) * INVERSE_X0_STEP);
            if (Number.isFinite(raw)) this.ignoreOutOfDomain(() => this.setX0(Math.min(max, Math.max(min, raw)), {syncScene: false}));
            this.syncSceneToModel();
        });
        return point;
    }

    protected createScene(): void {
        const model = () => this.model;
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const slopes = () => inverseSlopesOf(model());
        const pair = () => inversePairOf(model());

        // Layers, lowest first: the mirror line and the asymptotes, the two graphs, the tangents, the connector, the markers.
        this.straightLine([0, 0], [1, 1], {strokeColor: GraphPalette.axis, dash: DASH, strokeWidth: 1.5});
        this.straightLine([0, 0], [0, 1], {strokeColor: GraphPalette.warningText, dash: DASH, strokeWidth: 1.5, visible: () => hasAsymptotes(model()) && model().inverseVisible});
        this.straightLine([0, 0], [1, 0], {strokeColor: GraphPalette.referenceCurve, dash: DASH, strokeWidth: 1.5, visible: () => hasAsymptotes(model())});
        this.curve(() => this.sampled(x => pair().forward.value(x)), {strokeColor: GraphPalette.primaryCurve, strokeWidth});
        this.inverseCurve = this.curve(() => this.sampled(x => pair().inverse.value(x)), {strokeColor: GraphPalette.comparisonCurve, strokeWidth, visible: () => model().inverseVisible});
        this.curve(() => {
            const s = slopes();
            return s ? this.tangentSegment(s.point, s.forwardSlope) : {x: [], y: []};
        }, {strokeColor: GraphPalette.primaryCurve, strokeWidth: 2, dash: DASH, visible: () => model().tangentVisible});
        this.curve(() => {
            const s = slopes();
            return s ? this.tangentSegment(s.mirror, s.inverseSlope) : {x: [], y: []};
        }, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: DASH, visible: () => model().tangentVisible && model().inverseVisible});
        this.curve(() => {
            const s = slopes();
            return s ? {x: [s.point.x, s.mirror.x], y: [s.point.y, s.mirror.y]} : {x: [], y: []};
        }, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: DASH});
        this.dotP = this.marker();
        this.dotMirror = this.own(this.board.create("point", [0, 0], {
            ...this.styles.point.default, name: "", withLabel: false, fixed: true, fillColor: GraphPalette.comparisonCurve, highlightFillColor: GraphPalette.comparisonCurve,
            size: () => Math.max(4, this.displaySettings.pointSize),
        })) as JXG.Point;
        this.syncSceneToModel();

        // The pair, the points and the slopes stay on the board (projection needs them).
        this.caption("bottom-right", [
            {text: () => this.ruleText(model()), scale: 1.2},
            {text: () => this.boardPointText(model()), minBoardWidth: 520},
            {text: () => this.boardSlopeText(model()), minBoardWidth: 520},
        ]);
    }

    protected override syncSceneToModel(): void {
        const s = inverseSlopesOf(this.model);
        if (!s) return;
        this.dotP?.moveTo([s.point.x, s.point.y]);
        this.dotMirror?.moveTo([s.mirror.x, s.mirror.y]);
    }

    protected override onSceneRemoved(): void {
        this.dotP = undefined;
        this.dotMirror = undefined;
        this.inverseCurve = undefined;
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number, language: NumberLanguage = currentLanguage()): string {
        return formatNumber(value, language, PRECISE);
    }

    /** A point as (x; y) with decimal commas in Slovenian and (x, y) in English. */
    private pointText(p: Point2): string {
        const language = currentLanguage();
        return `(${this.number(p.x, language)}${language === "sl" ? "; " : ", "}${this.number(p.y, language)})`;
    }

    /** A slope: the number, or the words for a vertical tangent (never a number there). */
    private slopeText(slope: SlopeResult): string {
        if (slope.kind === "slope") return this.number(slope.value);
        return t(slope.kind === "vertical" ? "function_inverse_slope_vertical" : "function_inverse_slope_undefined");
    }

    private ruleText(model: FunctionInverseModel): string {
        switch (model.restriction) {
            case "square": return t("function_inverse_rule_square");
            case "exp": return t("function_inverse_rule_exp", {value0: this.number(model.base)});
            case "natural": return t("function_inverse_rule_natural");
        }
    }

    private boardPointText(model: FunctionInverseModel): string {
        const s = inverseSlopesOf(model);
        return s ? t("function_inverse_board_point", {value0: this.pointText(s.point), value1: this.pointText(s.mirror)}) : "";
    }

    private boardSlopeText(model: FunctionInverseModel): string {
        const s = inverseSlopesOf(model);
        return s ? t("function_inverse_board_slopes", {value0: this.slopeText(s.forwardSlope), value1: this.slopeText(s.inverseSlope)}) : "";
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): FunctionInverseModel {
        const {restriction, base, x0, inverseVisible, tangentVisible} = this.state;
        return {restriction, base, x0, inverseVisible, tangentVisible};
    }

    protected renderControls(): React.ReactNode {
        const state = this.stateModel();
        const language = currentLanguage();
        const [x0Min, x0Max] = inverseX0Range(state.restriction, state.base);
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("function_inverse_restriction_label")} value={state.restriction} help={t("function_inverse_restriction_help")}
                              options={INVERSE_RESTRICTION_IDS.map(id => ({value: id, text: t(RESTRICTION_KEYS[id])}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setRestriction(next))}/>
            </div>
            <div className="inspector-group">
                {state.restriction === "exp" &&
                    <NumberInput label={t("function_inverse_base_label")} value={state.base} min={INVERSE_BASE_MIN} max={INVERSE_BASE_MAX} step={BASE_STEP} decimals={PRECISE}
                                 rejectedHint={t("function_inverse_base_hint", {value0: formatNumber(INVERSE_BASE_MIN, language), value1: formatNumber(INVERSE_BASE_MAX, language)})}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setBase(next))}/>}
                <NumberInput label={t("function_inverse_x0_label")} value={state.x0} min={x0Min} max={x0Max} step={INVERSE_X0_STEP} decimals={PRECISE}
                             onChange={next => this.ignoreOutOfDomain(() => this.setX0(next))}/>
            </div>
            <div className="convexity-actions" role="group" aria-label={t("function_inverse_actions_label")}>
                <button type="button" data-action="toggle-inverse" data-revealed={state.inverseVisible}
                        onClick={() => this.setInverseVisible(!this.model.inverseVisible)}>
                    {state.inverseVisible ? t("function_inverse_inverse_hide") : t("function_inverse_inverse_show")}
                </button>
                <button type="button" data-action="toggle-tangent" data-revealed={state.tangentVisible}
                        onClick={() => this.setTangentVisible(!this.model.tangentVisible)}>
                    {state.tangentVisible ? t("function_inverse_tangent_hide") : t("function_inverse_tangent_show")}
                </button>
                <button type="button" data-action="reset-inverse" onClick={() => this.resetValues()}>{t("function_inverse_reset")}</button>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "forward", color: GraphPalette.primaryCurve, label: t("function_inverse_legend_forward"), kind: "line"},
            {id: "inverse", color: GraphPalette.comparisonCurve, label: t("function_inverse_legend_inverse"), kind: "line"},
            {id: "mirror-line", color: GraphPalette.axis, label: t("function_inverse_legend_mirror_line"), kind: "dashed-line"},
            {id: "point", color: GraphPalette.constructionAccent, label: t("function_inverse_legend_point"), kind: "dot"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const s = inverseSlopesOf(model);
        const rows = [
            {id: "pair", label: t("function_inverse_readout_pair"), value: this.ruleText(model)},
            {id: "hypothesis", label: t("function_inverse_readout_hypothesis"), value: t(HYPOTHESIS_KEYS[model.restriction])},
            {id: "point", label: t("function_inverse_readout_point"), value: s ? this.pointText(s.point) : ""},
            {id: "mirror", label: t("function_inverse_readout_mirror"), value: s ? this.pointText(s.mirror) : ""},
            {id: "forward-slope", label: t("function_inverse_readout_forward_slope"), value: s ? this.slopeText(s.forwardSlope) : ""},
            {id: "inverse-slope", label: t("function_inverse_readout_inverse_slope"), value: s ? this.slopeText(s.inverseSlope) : ""},
            {id: "product", label: t("function_inverse_readout_product"), value: s?.product === undefined ? t("function_inverse_product_none") : this.number(s.product)},
            {id: "domain", label: t("function_inverse_readout_domain"), value: t(model.restriction === "square" ? "function_inverse_domain_sqrt" : "function_inverse_domain_log")},
            ...(hasAsymptotes(model) ? [{id: "asymptote", label: t("function_inverse_readout_asymptote"), value: t("function_inverse_asymptote_value")}] : []),
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("function_inverse_note")}/>;
    }
}

export default FunctionInverseGraph;
