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

    return {
        default: curveStyle,
        comparison,
        /** Deterministic display role for a curve's position in a graph scene. */
        series: (index = 0) => index <= 0 ? curveStyle : comparison(index - 1)
    };
}

export type CurveStyleSet = ReturnType<typeof createCurveStyles>;
