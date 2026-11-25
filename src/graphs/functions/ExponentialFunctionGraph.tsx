import React from "react";
import BaseFunctionGraph, {DomainError, localizedSliderValue, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import Slider from "../../inputs/Slider";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, message, messageNumber, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    classifyBase, EXPONENTIAL_BASE_MAX, EXPONENTIAL_BASE_MIN, EXPONENTIAL_BASE_STEP, exponentialValue, mirrorBase,
} from "../../analysis/exponential";
import {DEFAULT_EXPONENTIAL_MODEL, ExponentialModel, isExponentialBase} from "../../analysis/exponentialModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {numberRangeRejected} from "./functionSetterMessages";
import {cleanNumber} from "../../analysis/numbers";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned} from "../base/controls/PuckOwnership";

/** The ids of the exponential declaration: the base `a` is the one bound parameter; the mirror switch stays in the display settings. */
export type ExponentialIds = {
    param: "a";
    row: "a" | "f0" | "f1" | "behavior" | "mirror-base"; note: never; legend: never; section: never; action: never;
};

/**
 * Exponential function `f(x) = a^x` with a base slider, the marked points (0, 1) and (1, a), and an optional mirror graph
 * `(1/a)^x = a^(-x)`. The model is `{a, mirror}`; values and the classification come from `src/analysis/exponential`.
 */
export class ExponentialFunctionGraph extends BaseFunctionGraph<ExponentialModel> {
    override presetCollection() {
        return functionPresetCollections["exponential-function"];
    }

    protected defaultModel(): ExponentialModel {
        return {...DEFAULT_EXPONENTIAL_MODEL};
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-5, 9, 5, -3];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    /** Sets the base; throws when it is outside the model domain, so a <= 0 can never be applied. */
    protected setBase(value: number): void {
        if (!isExponentialBase(value)) {
            throw new DomainError(numberRangeRejected("exponential_base_label", EXPONENTIAL_BASE_MIN, EXPONENTIAL_BASE_MAX));
        }
        this.commitModel({...this.model, a: cleanNumber(value)});
    }

    protected setMirrorVisible(visible: boolean): void {
        this.commitModel({...this.model, mirror: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {a: value => this.setBase(value)},
            visibility: {mirror: visible => this.setMirrorVisible(visible)},
        };
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
        const {a} = this.model;
        return <>
            <div className="inspector-group">
                <PuckOwned param="a"><Slider customText={t("exponential_base_label")} min={EXPONENTIAL_BASE_MIN} max={EXPONENTIAL_BASE_MAX}
                        step={EXPONENTIAL_BASE_STEP} value={a} help={t("exponential_base_help")} formatValue={localizedSliderValue}
                        onChange={next => this.ignoreOutOfDomain(() => this.setBase(next))}/></PuckOwned>
            </div>
        </>;
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <div className="inspector-group">
            <OnOffSwitch checked={this.model.mirror} label={t("exponential_show_mirror")}
                         onChange={checked => this.setMirrorVisible(checked)}/>
        </div>;
    }

    /** Parameter writes (ADR 0064): the lesson name `a` is the key; the view is bound by the base. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {a: {read: () => this.model.a, apply: (value: number) => this.setBase(value)}};
    }

    /** The base's common declaration (readout rows, view marks) plus the base `a` as a board puck. */
    protected override declaration(): GraphDeclaration {
        return {
            ...this.commonDeclaration(),
            parameters: [{
                key: "a", kind: "range", label: message("exponential_base_label"), symbol: "a", help: message("exponential_base_help"),
                placement: "board", min: EXPONENTIAL_BASE_MIN, max: EXPONENTIAL_BASE_MAX, step: EXPONENTIAL_BASE_STEP, maxDecimals: 2,
            }],
        };
    }

    /** Declared by the base (task 08): the readout rows and the plotted curve; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {a, mirror} = this.model;
        const behavior = {growth: message("exponential_growth"), decay: message("exponential_decay"), constant: message("exponential_constant")}[classifyBase(a)];
        return {
            rows: [
                {id: "a", symbol: "a", value: messageNumber(a)},
                {id: "f0", symbol: "f(0)", value: messageNumber(exponentialValue(a, 0))},
                {id: "f1", symbol: "f(1)", value: messageNumber(exponentialValue(a, 1))},
                {id: "behavior", name: message("exponential_behavior"), value: behavior},
                ...(mirror ? [{id: "mirror-base", name: message("exponential_mirror_base"), value: messageNumber(mirrorBase(a), 3)}] : []),
            ],
            plotted: x => exponentialValue(a, x),
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default ExponentialFunctionGraph;
