import {t, useLanguage} from "../../../localization";
import {Button, ButtonGroup} from "react-bootstrap";
import React from "react";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {CurveControlsProps} from "./CurveDisplayControls";

function WeightController({curve, onChanged}: CurveControlsProps<JXGRationalBezierCurve>) {
    useLanguage();
    const change = (action: () => void) => {
        action();
        curve.board.update();
        onChanged();
    };
    return <ButtonGroup vertical={true}>
        <Button className="btn-block" onClick={() => change(() => curve.changeWeight(0.25))}>+</Button>
        <ButtonGroup>
            <Button className="btn-block" onClick={() => change(() => curve.prevWeight())}>{"<"}</Button>
            <Button variant="light" onClick={() => change(() => curve.resetWeight())}
                    className="btn-block">{curve.getCurrentWeight().toFixed(2)}</Button>
            <Button onClick={() => change(() => curve.nextWeight())} className="btn-block">{">"}</Button>
        </ButtonGroup> <Button onClick={() => change(() => curve.changeWeight(-0.25))}
                               className="btn-block">-</Button>
    </ButtonGroup>;
}

/** Weight display, weight editing and standard form of a rational Bézier adapter, read live from the adapter. */
export function RationalBezierCurveControls({curve, onChanged}: CurveControlsProps<JXGRationalBezierCurve>) {
    useLanguage();
    return <div>
        <OnOffSwitch checked={curve.isShowingWeights()} label={t("weights")}
                     onChange={checked => {curve.showwWeights(checked); onChanged();}}/>
        <WeightController curve={curve} onChanged={onChanged}/>
        <OnOffSwitch checked={curve.inStandardForm()} label={t("standard_form")}
                     onChange={checked => {curve.setStandardForm(checked); onChanged();}}/>
    </div>;
}
