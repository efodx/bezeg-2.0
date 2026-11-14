import type {DisplaySettings} from "../base/DisplaySettings";
import {GraphPalette, comparisonCurveColor, comparisonCurveDash} from "./GraphPalette";

/** Curve attribute presets whose callbacks read the display settings of one graph. */
export function createCurveStyles(settings: DisplaySettings) {
    const curveStyle = {
        strokeWidth: () => settings.strokeWidth,
        strokeColor: GraphPalette.primaryCurve,
        highlightStrokeColor: GraphPalette.primaryCurve
    };

    const comparison = (index = 0) => {
        const color = comparisonCurveColor(index);
        return {
            ...curveStyle,
            strokeColor: color,
            highlightStrokeColor: color,
            strokeWidth: () => settings.strokeWidth * 0.85,
            strokeOpacity: 0.88,
            dash: comparisonCurveDash(index)
        };
    };

    /**
     * One ordered family (PH offsets): the same blue and solid line for every member, thinner than the base curve
     * (R1), with the stroke opacity stepping down from 1 by 0.8 per member to a floor of 0.4.
     */
    const offsetFamily = (index = 0) => {
        const color = GraphPalette.comparisonCurve;
        return {
            ...curveStyle,
            strokeColor: color,
            highlightStrokeColor: color,
            strokeWidth: () => settings.strokeWidth * 0.6,
            strokeOpacity: Math.max(0.4, Math.pow(0.8, Math.max(0, Math.trunc(index)))),
            dash: 0
        };
    };

    return {
        default: curveStyle,
        comparison,
        offsetFamily,
        /** Deterministic display role for a curve's position in a graph scene. */
        series: (index = 0) => index <= 0 ? curveStyle : comparison(index - 1)
    };
}

export type CurveStyleSet = ReturnType<typeof createCurveStyles>;
