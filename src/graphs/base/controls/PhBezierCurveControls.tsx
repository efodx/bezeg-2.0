import {useT} from "../../../localization";
import React from "react";
import {JXGPHBezierCurve, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "../../curves/object/JXGPHBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import {CurveControlsProps} from "./CurveDisplayControls";

/**
 * Display settings of a PH Bézier adapter's offset curves: the on/off switch and the dependent visibility options.
 * Turning the offsets off also hides their control points and lines. Read live from the adapter.
 */
export function PhOffsetDisplayControls({curve, onChanged}: CurveControlsProps<JXGPHBezierCurve>) {
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

/**
 * The mathematical offset parameters of a PH Bézier adapter: the number of offset curves and the distance d.
 * They are shown only while the offsets are on; otherwise a hint says where to turn them on.
 */
export function PhOffsetParameterControls({curve, onChanged}: CurveControlsProps<JXGPHBezierCurve>) {
    const t = useT();
    if (!curve.isShowingOffsetCurve()) return <p>{t("offset_parameters_hint")}</p>;
    return <div>
        <div>
            <CountSetter label={t("number_of_offsets")} onPlus={() => {
                curve.addOffsetCurve();
                onChanged();
            }} n={curve.getNumberOfOffsetCurves()}
                         onMinus={() => {
                             curve.removeOffsetCurve();
                             onChanged();
                         }}
                         min={1}
            ></CountSetter></div>
        <Slider min={OFFSET_DISTANCE_MIN}
                customText={t("offset_distance_d")} help={t("the_sign_selects_the_side_of_the_offset_zero_means_the_original_curve")}
                max={OFFSET_DISTANCE_MAX}
                value={curve.getCurve().getOffsetCurveDistance()}
                step={0.01}
                onChange={value => {curve.setOffsetCurveDistance(value); onChanged();}}/>
    </div>;
}

/** Both offset parts together, for surfaces that show the whole offset group in one place. */
export function PhBezierCurveControls(props: CurveControlsProps<JXGPHBezierCurve>) {
    return <>
        <PhOffsetDisplayControls {...props}/>
        <PhOffsetParameterControls {...props}/>
    </>;
}
