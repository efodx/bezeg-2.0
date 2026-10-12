import React from "react";
import BaseFunctionGraph, {DomainError, localizedSliderValue, FunctionChoiceAction, FunctionParameterAction, FunctionVisibilityAction} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {catalogFunction, FUNCTION_IDS, isFunctionId} from "../../analysis/functions";
import {
    differenceQuotient, H_MAX, H_MIN, H_MIN_ABS, H_STEP, isStep, isX0, lineValue, stepOutOfBand, tangentLine, X0_MAX, X0_MIN, X0_STEP,
} from "../../analysis/derivative";
import {DEFAULT_DERIVATIVE_MODEL, DerivativeModel, parseDerivativeModel} from "../../analysis/derivativeModel";
import {UnsupportedLessonActionError} from "../../learning/model";
import {SizeContext} from "../context/SizeContext";
import {PointStyles} from "../styles/PointStyles";
import {GraphPalette} from "../styles/GraphPalette";

/** Removes floating-point noise left by slider arithmetic (-2 + 150 * 0.01) without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/** Derivative-related numbers show four decimals so that the lesson's 0.4528 and 0.5403 can be read off. */
const PRECISE = 4;

/**
 * Difference quotient, secant and tangent. The learner drags the point P = (x0, f(x0)) along the graph (the drag is
 * projected onto the graph and written to the model as x0), moves Q = (x0 + h, f(x0 + h)) with the slider h, and sees the
 * secant through both. The optional dashed tangent is the limit line. The model is `{fn, x0, h, tangent}`; the mathematics
 * comes from `src/analysis/derivative` and the function catalog `src/analysis/functions`. Changing the function keeps
 * x0, h and the view (the default box [-3, 6, 4, -2] shows x^2 near x0 = 1, and sin and e^x are also visible there).
 */
export class DerivativeGraph extends BaseFunctionGraph<DerivativeModel> {
    private pointP?: JXG.Point;

    override presets(): string {
        return "derivative";
    }

    protected defaultModel(): DerivativeModel {
        return {...DEFAULT_DERIVATIVE_MODEL};
    }

    protected parseModel(data: unknown): DerivativeModel | undefined {
        return parseDerivativeModel(data);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-3, 6, 4, -2];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    private currentFunction() {
        return catalogFunction(this.model.fn);
    }

    protected setFunction(value: unknown): void {
        if (!isFunctionId(value)) throw new DomainError(`The function must be one of ${FUNCTION_IDS.join(", ")}.`);
        this.commitModel({...this.model, fn: value});
    }

    protected setX0(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isX0(value)) throw new DomainError(`The point x0 must be a finite number between ${X0_MIN} and ${X0_MAX}.`);
        this.commitModel({...this.model, x0: clean(value)}, options);
    }

    protected setStep(value: number): void {
        if (!isStep(value)) {
            throw new DomainError(`The step h must be a finite number between ${H_MIN} and ${H_MAX} with |h| of at least ${H_MIN_ABS} (h = 0 gives the undefined quotient 0/0).`);
        }
        this.commitModel({...this.model, h: clean(value)});
    }

    protected setTangentVisible(visible: boolean): void {
        this.commitModel({...this.model, tangent: visible});
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        switch (action.name) {
            case "x0":
                return this.setX0(action.value);
            case "h":
                return this.setStep(action.value);
            default:
                throw new UnsupportedLessonActionError(action);
        }
    }

    protected override applyFunctionVisibility(action: FunctionVisibilityAction): void {
        if (action.target === "tangent") {
            this.setTangentVisible(action.visible);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    protected override applyFunctionChoice(action: FunctionChoiceAction): void {
        if (action.name === "derivative-function") {
            this.setFunction(action.value);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const fn = () => this.currentFunction();
        const language = () => currentLanguage();
        const strokeWidth = () => SizeContext.strokeWidth;

        // Layers, lowest first: the function, the exact tangent, the secant, then the points.
        this.own(board.create("functiongraph", [(x: number) => fn().value(x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        }));
        this.own(board.create("functiongraph", [(x: number) => lineValue(tangentLine(fn(), model().x0), x)], {
            strokeColor: GraphPalette.primaryCurve, dash: 2, highlight: false, fixed: true,
            strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.85), visible: () => model().tangent,
        }));

        // P is a free point whose drag is projected onto the graph; the model is written from the projected x.
        // A dragged x0 is rounded to X0_STEP (0.01) so that the readout of x0 shows exactly the value used for f(x0). The
        // labels sit below-right of the points: the graph and the secant rise there (for the catalog functions near x0), so below-right is free of both.
        const pointP = this.pointP = this.slidingPoint({
            x: model().x0, position: x => fn().value(x), min: X0_MIN, max: X0_MAX, step: X0_STEP,
            attributes: {...PointStyles.default, name: "$$P$$", label: this.pointLabel("below-right")},
            write: x => this.setX0(x, {syncScene: false}),
        });
        const pointQ = this.own(board.create("point", [() => model().x0 + model().h, () => fn().value(model().x0 + model().h)], {
            ...PointStyles.fixed, name: "$$Q$$", highlight: false, label: this.pointLabel("below-right"),
        }) as JXG.Point);

        // The secant is a full line through P and Q; its slope is the difference quotient.
        this.own(board.create("line", [pointP, pointQ], {
            strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true, strokeWidth,
        }));

        // The function and the slopes, the most important readouts, stay on the board.
        // At the top centre: the catalog graphs rise at both sides of x0 only far from the centre of the default view.
        this.caption("top-center", [
            {text: () => `f(x) = ${fn().plain}`, scale: 1.2},
            {text: () => t("derivative_board_slopes", {
                value0: formatNumber(differenceQuotient(fn(), model().x0, model().h), language(), PRECISE),
                value1: formatNumber(fn().derivative(model().x0), language(), PRECISE),
            })},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {x0} = this.model;
        this.pointP?.moveTo([x0, this.currentFunction().value(x0)]);
    }

    protected override onSceneRemoved(): void {
        this.pointP = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, x0, h, tangent} = this.state;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("derivative_function_label")} value={fn} help={t("derivative_function_help")}
                              options={FUNCTION_IDS.map(id => ({value: id, text: `f(x) = ${catalogFunction(id).plain}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("derivative_x0_label")} value={x0} min={X0_MIN} max={X0_MAX} step={X0_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setX0(next))}/>
                <Slider customText={t("derivative_h_label")} min={H_MIN} max={H_MAX} step={H_STEP} fixedValue={h}
                        help={t("derivative_h_help")} formatValue={localizedSliderValue}
                        onChange={next => this.ignoreOutOfDomain(() => this.setStep(stepOutOfBand(next, this.model.h)))}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch initialState={tangent} label={t("derivative_show_tangent")}
                             onChange={checked => this.setTangentVisible(checked)}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {fn, x0, h} = this.state;
        const language = currentLanguage();
        const entry = catalogFunction(fn);
        const number = (value: number, decimals = 2) => formatNumber(value, language, decimals);
        const quotient = differenceQuotient(entry, x0, h);
        const exact = entry.derivative(x0);
        const rows = [
            {id: "x0", label: "x₀", value: number(x0)},
            {id: "h", label: "h", value: number(h)},
            {id: "f-x0", label: "f(x₀)", value: number(entry.value(x0), PRECISE)},
            {id: "f-x0h", label: "f(x₀ + h)", value: number(entry.value(x0 + h), PRECISE)},
            {id: "quotient", label: t("derivative_quotient"), value: number(quotient, PRECISE)},
            {id: "derivative", label: t("derivative_exact"), value: number(exact, PRECISE)},
            {id: "difference", label: t("derivative_difference"), value: number(quotient - exact, PRECISE)},
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("derivative_h_note")}/>;
    }
}

export default DerivativeGraph;
