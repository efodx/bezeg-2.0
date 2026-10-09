import {t, useLanguage} from "../../../../localization";
import React, {useEffect, useState} from "react";
import {JXGPHBezierCurve} from "../JXGPHBezierCurve";
import {OnOffSwitch} from "../../../../inputs/OnOffSwitch";
import Slider from "../../../../inputs/Slider";
import {CountSetter} from "../../../../inputs/CountSetter";


interface OffsetCurveSettingsProps {
    curve: JXGPHBezierCurve
}

function OffsetCurveSettings({curve}: OffsetCurveSettingsProps) {
    useLanguage();
    const [showOffsetCurve, setShowOffsetCurve] = useState(curve.isShowingOffsetCurve());
    const [showOffSetCurveControlPoints, setShowOffSetCurveControlPoints] = useState(curve.isShowingOffsetCurveControlPoints());
    const [showOffSetCurveControlPointsLines, setShowOffSetCurveControlPointsLines] = useState(!!curve.isShowingOffsetCurveControlPointsLines());
    const [numberOfCurves, setNumberOfCurves] = useState(curve.getNumberOfOffsetCurves());
    useEffect(() => {
        setShowOffsetCurve(curve.isShowingOffsetCurve());
        setShowOffSetCurveControlPoints(curve.isShowingOffsetCurveControlPoints());
        setShowOffSetCurveControlPointsLines(!!curve.isShowingOffsetCurveControlPointsLines());
        setNumberOfCurves(curve.getNumberOfOffsetCurves());
    }, [curve]);
    return <div>
        <OnOffSwitch
            initialState={curve.isShowingOffsetCurve()}
            onChange={checked => {
                curve.setShowOffsetCurve(checked);
                setShowOffsetCurve(checked);
                if (!checked) {
                    curve.setShowOffsetCurveControlPoints(false);
                    setShowOffSetCurveControlPoints(false);
                    curve.setShowOffsetCurveControlPointsLines(false);
                    setShowOffSetCurveControlPointsLines(false);
                }
            }}
            label={t("curve_offsets")}/>
        {showOffsetCurve && <div key={showOffsetCurve + ""}>
          <div>
            <div>{t("number_of_offsets")}</div>
            <CountSetter onPlus={() => {
                curve.addOffsetCurve();
                setNumberOfCurves(numberOfCurves + 1);
            }} onCenter={() => 1} n={numberOfCurves}
                         onMinus={() => {
                             curve.removeOffsetCurve();
                             setNumberOfCurves(numberOfCurves - 1);
                         }}
                         min={1}
            ></CountSetter></div>
          <Slider min={-3}
                  customText={t("offset_distance_d")} help={t("the_sign_selects_the_side_of_the_offset_zero_means_the_original_curve")}
                  max={3}
                  initialValue={curve.getCurve().getOffsetCurveDistance()}
                  step={0.01}
                  onChange={e => curve.setOffsetCurveDistance(e)}/>
          <OnOffSwitch
            onChange={checked => {
                curve.setShowOffsetCurveControlPoints(checked);
                setShowOffSetCurveControlPoints(checked);
                if (!checked) {
                    console.log("setting no lines bby");
                    curve.setShowOffsetCurveControlPointsLines(false);
                    setShowOffSetCurveControlPointsLines(false);
                }
            }}
            label={t("offset_curve_control_points")}
            initialState={showOffSetCurveControlPoints}/>
          <OnOffSwitch
            key={"" + !showOffSetCurveControlPoints}
            disabled={!showOffSetCurveControlPoints}
            onChange={checked => {
                curve.setShowOffsetCurveControlPointsLines(checked);
                setShowOffSetCurveControlPointsLines(checked);
            }}
            label={t("lines_through_offset_control_points")}
            initialState={showOffSetCurveControlPointsLines}/>
        </div>
        }
    </div>;
}

export function PhBezierCurveCommands(curve: JXGPHBezierCurve): JSX.Element[] {
    const commands = [];
    commands.push(<OffsetCurveSettings key="offset-settings" curve={curve}></OffsetCurveSettings>);
    return commands;
}
