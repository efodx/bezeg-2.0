import {useT} from "../../../localization";
import React from "react";
import {JXGPHBezierCurve} from "../../curves/object/JXGPHBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import {CurveControlsProps} from "./CurveDisplayControls";

/** Offset curve settings of a PH Bézier adapter, read live from the adapter. */
export function PhBezierCurveControls({curve, onChanged}: CurveControlsProps<JXGPHBezierCurve>) {
    const t = useT();
    const showOffsetCurve = curve.isShowingOffsetCurve();
    const showControlPoints = curve.isShowingOffsetCurveControlPoints();
    return <div>
        <OnOffSwitch
            checked={showOffsetCurve}
            onChange={checked => {
                curve.setShowOffsetCurve(checked);
                if (!checked) {
                    curve.setShowOffsetCurveControlPoints(false);
                    curve.setShowOffsetCurveControlPointsLines(false);
                }
                onChanged();
            }}
            label={t("curve_offsets")}/>
        {showOffsetCurve && <div>
          <div>
            <div>{t("number_of_offsets")}</div>
            <CountSetter onPlus={() => {
                curve.addOffsetCurve();
                onChanged();
            }} onCenter={() => 1} n={curve.getNumberOfOffsetCurves()}
                         onMinus={() => {
                             curve.removeOffsetCurve();
                             onChanged();
                         }}
                         min={1}
            ></CountSetter></div>
          <Slider min={-3}
                  customText={t("offset_distance_d")} help={t("the_sign_selects_the_side_of_the_offset_zero_means_the_original_curve")}
                  max={3}
                  value={curve.getCurve().getOffsetCurveDistance()}
                  step={0.01}
                  onChange={value => {curve.setOffsetCurveDistance(value); onChanged();}}/>
          <OnOffSwitch
            onChange={checked => {
                curve.setShowOffsetCurveControlPoints(checked);
                if (!checked) curve.setShowOffsetCurveControlPointsLines(false);
                onChanged();
            }}
            label={t("offset_curve_control_points")}
            checked={showControlPoints}/>
          <OnOffSwitch
            disabled={!showControlPoints}
            onChange={checked => {
                curve.setShowOffsetCurveControlPointsLines(checked);
                onChanged();
            }}
            label={t("lines_through_offset_control_points")}
            checked={!!curve.isShowingOffsetCurveControlPointsLines()}/>
        </div>
        }
    </div>;
}
