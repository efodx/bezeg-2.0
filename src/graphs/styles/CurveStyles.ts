import {SizeContext} from "../context/SizeContext";
import {GraphPalette, comparisonCurveColor, comparisonCurveDash} from "./GraphPalette";

const curveStyle = {
    strokeWidth: () => SizeContext.strokeWidth,
    strokeColor: GraphPalette.primaryCurve,
    highlightStrokeColor: GraphPalette.primaryCurve
};

export const CurveStyles = {
    default: curveStyle,
    comparison: (index = 0) => {
        const color = comparisonCurveColor(index);
        return {
            ...curveStyle,
            strokeColor: color,
            highlightStrokeColor: color,
            strokeWidth: () => SizeContext.strokeWidth * 0.85,
            strokeOpacity: 0.88,
            dash: comparisonCurveDash(index)
        };
    },
    /** Deterministic display role for a curve's position in a graph scene. */
    series: (index = 0) => index <= 0 ? curveStyle : CurveStyles.comparison(index - 1)
};
