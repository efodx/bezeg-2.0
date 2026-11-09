import {useT} from "../../../localization";
import {Button} from "react-bootstrap";
import React from "react";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {CountSetter} from "../../../inputs/CountSetter";
import {CurveControlsProps} from "./CurveDisplayControls";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
/** The weight index in the graph's own notation (w₀, w₁, …): the labels and the control points number from 0. */
const subscript = (index: number) => String(index).split("").map(digit => SUBSCRIPT_DIGITS[Number(digit)]).join("");

interface RationalBezierCurveControlsProps extends CurveControlsProps<JXGRationalBezierCurve> {
    /** The curve's number in the graph, counted from 1 as the Display tab counts them. */
    curveNumber: number;
}

/**
 * Weight identity, weight stepping and exact weight entry, weight navigation and standard form of a rational Bézier adapter, read live
 * from the adapter. The weights switch lives in Display (CurveDisplayControls). The weight is a plain value: changing it never needs a
 * click on the number itself.
 */
export function RationalBezierCurveControls({curve, curveNumber, onChanged}: RationalBezierCurveControlsProps) {
    const t = useT();
    const index = curve.getWeightNumber();
    const weight = curve.getCurrentWeight();
    const change = (action: () => void) => {
        action();
        curve.board.update();
        onChanged();
    };
    const identity = t("rational_weight_identity", {value0: String(curveNumber), value1: subscript(index)});
    return <div className="rational-weight-controls">
        <p className="rational-weight-identity">{identity}</p>
        <div className="rational-weight-stepper" role="group" aria-label={identity}>
            {/* A weight of zero or less is refused here: the rational curve is not defined by such a weight. */}
            <CountSetter label={t("weight_value")} n={weight} decimals={2} step={0.25} min={0.25} typedMin={0} minReason={t("weight_must_be_positive")}
                         minusLabel={t("decrease_weight")} plusLabel={t("increase_weight")}
                         rejectedHint={t("weight_must_be_positive")}
                         onMinus={() => change(() => curve.changeWeight(-0.25))}
                         onPlus={() => change(() => curve.changeWeight(0.25))}
                         onSet={value => {
                             if (value <= 0) return false;
                             change(() => curve.setWeight(value));
                         }}/>
        </div>
        <div className="rational-weight-navigation">
            <Button onClick={() => change(() => curve.prevWeight())}>{t("previous_weight")}</Button>
            <Button onClick={() => change(() => curve.nextWeight())}>{t("next_weight")}</Button>
            <Button onClick={() => change(() => curve.resetWeight())}>{t("reset_weight")}</Button>
        </div>
        <OnOffSwitch checked={curve.inStandardForm()} label={t("standard_form")}
                     onChange={checked => {curve.setStandardForm(checked); onChanged();}}/>
    </div>;
}
