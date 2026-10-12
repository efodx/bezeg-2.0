import React from "react";
import BaseFunctionGraph, {DomainError, FunctionParameterAction, FunctionVisibilityAction, localizedSliderValue} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    classifyBase, EXPONENTIAL_BASE_MAX, EXPONENTIAL_BASE_MIN, EXPONENTIAL_BASE_STEP, exponentialValue, mirrorBase,
} from "../../analysis/exponential";
import {DEFAULT_EXPONENTIAL_MODEL, ExponentialModel, isExponentialBase, parseExponentialModel} from "../../analysis/exponentialModel";
import {UnsupportedLessonActionError} from "../../learning/model";
import {GraphPalette} from "../styles/GraphPalette";

/** Removes floating-point noise left by slider arithmetic (0.1 + 3 * 0.05) without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/**
 * Exponential function `f(x) = a^x` with a base slider, the marked points (0, 1) and (1, a), and an optional mirror graph
 * `(1/a)^x = a^(-x)`. The model is `{a, mirror}`; values and the classification come from `src/analysis/exponential`.
 */
export class ExponentialFunctionGraph extends BaseFunctionGraph<ExponentialModel> {
    override presets(): string {
        return "exponential-function";
    }

    protected defaultModel(): ExponentialModel {
        return {...DEFAULT_EXPONENTIAL_MODEL};
    }

    protected parseModel(data: unknown): ExponentialModel | undefined {
        return parseExponentialModel(data);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-5, 9, 5, -3];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    /** Sets the base; throws when it is outside the model domain, so a <= 0 can never be applied. */
    protected setBase(value: number): void {
        if (!isExponentialBase(value)) {
            throw new DomainError(`The base a must be a finite number between ${EXPONENTIAL_BASE_MIN} and ${EXPONENTIAL_BASE_MAX}.`);
        }
        this.commitModel({...this.model, a: clean(value)});
    }

    protected setMirrorVisible(visible: boolean): void {
        this.commitModel({...this.model, mirror: visible});
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        if (action.name === "a") {
            this.setBase(action.value);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    protected override applyFunctionVisibility(action: FunctionVisibilityAction): void {
        if (action.target === "mirror") {
            this.setMirrorVisible(action.visible);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();

        // The mirror graph goes first (lower layer) so the main graph is drawn over it.
        this.own(board.create("functiongraph", [(x: number) => exponentialValue(mirrorBase(model().a), x)], {
            strokeColor: GraphPalette.constructionAccent, dash: 2, strokeOpacity: 0.88, highlight: false, fixed: true,
            strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.72), visible: () => model().mirror,
        }));
        this.own(board.create("functiongraph", [(x: number) => exponentialValue(model().a, x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth: () => this.displaySettings.strokeWidth,
        }));

        // Every base passes through (0, 1); the second point (1, a) shows the base itself.
        // The graph rises (a > 1) or falls (a < 1) through both points: a label sits on the side of the curve away from it and
        // right of the y-axis (its tick numbers are on the left): below the rising graph, above the falling one.
        const rising = () => model().a >= 1;
        this.own(board.create("point", [0, 1], {
            ...this.styles.point.fixed, name: "$$(0,1)$$", highlight: false, label: this.pointLabel(() => rising() ? "below-right" : "above-right"),
        }));
        this.own(board.create("point", [1, () => model().a], {
            ...this.styles.point.fixed, name: "$$(1,a)$$", highlight: false, label: this.pointLabel(() => rising() ? "below-right" : "below-left"),
        }));

        // The equation, the most important readout, stays on the board, in the corner no default curve reaches; the mirror has its own line while it is shown.
        this.caption("bottom-right", [
            {text: () => `f(x) = ${formatNumber(model().a, language())}^x`, scale: 1.2, math: true},
            {text: () => `(1/a)^x = ${formatNumber(mirrorBase(model().a), language(), 3)}^x (${t("exponential_mirror_legend")})`, visible: () => model().mirror},
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {a, mirror} = this.state;
        return <>
            <div className="inspector-group">
                <Slider customText={t("exponential_base_label")} min={EXPONENTIAL_BASE_MIN} max={EXPONENTIAL_BASE_MAX}
                        step={EXPONENTIAL_BASE_STEP} fixedValue={a} help={t("exponential_base_help")} formatValue={localizedSliderValue}
                        onChange={next => this.ignoreOutOfDomain(() => this.setBase(next))}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch initialState={mirror} label={t("exponential_show_mirror")}
                             onChange={checked => this.setMirrorVisible(checked)}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {a, mirror} = this.state;
        const language = currentLanguage();
        const number = (value: number, decimals?: number) => formatNumber(value, language, decimals);
        const behavior = {growth: t("exponential_growth"), decay: t("exponential_decay"), constant: t("exponential_constant")}[classifyBase(a)];
        const rows = [
            {id: "a", label: "a", value: number(a)},
            {id: "f0", label: "f(0)", value: number(exponentialValue(a, 0))},
            {id: "f1", label: "f(1)", value: number(exponentialValue(a, 1))},
            {id: "behavior", label: t("exponential_behavior"), value: behavior},
            ...(mirror ? [{id: "mirror-base", label: t("exponential_mirror_base"), value: number(mirrorBase(a), 3)}] : []),
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows}/>;
    }
}

export default ExponentialFunctionGraph;
