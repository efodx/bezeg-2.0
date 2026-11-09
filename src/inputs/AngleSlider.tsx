import React from "react";
import {useLanguage} from "../localization";
import {formatNumber} from "../analysis/format";
import Slider from "./Slider";

/**
 * The shared angle slider in degrees (spec decision 60): 0 to 360 in whole degrees, Shift or Page keys move by 10, the value wraps
 * around the circle, the thumb reads as degrees and the exact field takes two decimals. Only the name, value and callbacks vary.
 */
export default function AngleSlider(props: {
    customText: string,
    value: number,
    onChange: (degrees: number) => any,
    /** Typed text in the exact field calls this instead of `onChange` (see `Slider`). */
    onTypedChange?: (degrees: number) => any
}) {
    const {language} = useLanguage();
    return <Slider customText={props.customText} min={0} max={360} step={1} bigStep={10} decimals={1} cyclic={360} fieldDecimals={2}
                   value={props.value} valueText={value => `${formatNumber(value, language, 1)}°`}
                   onChange={props.onChange} onTypedChange={props.onTypedChange}/>;
}
