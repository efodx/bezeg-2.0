import {message} from "../../../localization";
import {isFiniteNumber, isIntegerAtLeast, PresetCollection} from "../../base/presets/PresetCollection";
import {EVOLUTE_TRACE_MODES} from "../../../learning/model";
import {COMB_MAX_COUNT, COMB_MIN_COUNT} from "../../../bezeg/impl/curve/curvature";
import {COMB_GAIN_MAX, COMB_GAIN_MIN} from "../comb/curveComb";
import {OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "../object/JXGPHBezierCurve";
import {OFFSET_SAMPLES_MAX, OFFSET_SAMPLES_MIN} from "../offset/curveOffset";
import {ENVELOPE_LINES_MAX, ENVELOPE_LINES_MIN} from "../envelope/curveEnvelope";
import {curveCollection} from "../curvePresetCollections";
import {parametricPresetCollection} from "../parametric/parametricPresetCollection";

const bezier = (key: string) => curveCollection(key, {type: "JSXBezierCurve"});

/** The curvature overlay's collection (lesson L2): a Bézier curve with the standard rules, under its own key. */
export const curvatureCurvePresetCollection = bezier("curve-curvature");
/** The evolute Demonstration's collection (lesson L4): a Bézier curve with the standard rules, under its own key. */
export const evoluteCurvePresetCollection = curveCollection("curve-evolute", {
    type: "JSXBezierCurve",
    graphState: ({curvatureT, evoluteTrace, evoluteNormalShown}) => {
        if (curvatureT !== undefined && !(isFiniteNumber(curvatureT) && curvatureT >= 0 && curvatureT <= 1)) return message("invalid_parameter", {value0: "curvatureT"});
        if (evoluteTrace !== undefined && !EVOLUTE_TRACE_MODES.some(mode => mode === evoluteTrace)) return message("invalid_option", {value0: "evoluteTrace"});
        if (evoluteNormalShown !== undefined && typeof evoluteNormalShown !== "boolean") return message("invalid_option", {value0: "evoluteNormalShown"});
        return undefined;
    },
});

/** The curvature comb's collection (lesson L3): a cubic Bézier curve or a quadratic C1, cubic C2 or quadratic G1 spline. */
export const curveCombPresetCollection = curveCollection("curve-comb", {
    type: ["JSXBezierCurve", "JSXQuadraticC1SplineCurve", "JSXQubicC2SplineCurve", "JSXQuadraticG1SplineCurve"],
    graphState: ({combShown, combGain, combCount}) => {
        if (combShown !== undefined && typeof combShown !== "boolean") return message("invalid_option", {value0: "combShown"});
        if (combGain !== undefined && !(isFiniteNumber(combGain) && combGain >= COMB_GAIN_MIN && combGain <= COMB_GAIN_MAX)) return message("invalid_parameter", {value0: "combGain"});
        if (combCount !== undefined && !(isIntegerAtLeast(combCount, COMB_MIN_COUNT) && combCount <= COMB_MAX_COUNT)) return message("invalid_parameter", {value0: "combCount"});
        return undefined;
    },
});

/** The offset Demonstration's collection (lesson L5): a Bézier curve (the parabola) or a PH curve, with the offset display state. */
export const curveOffsetPresetCollection = curveCollection("curve-offset", {
    type: ["JSXBezierCurve", "JSXPHBezierCurve"],
    graphState: ({offsetD, offsetSamples, offsetShown, offsetCuspsShown, offsetSpeedPlotShown}) => {
        if (offsetD !== undefined && !(isFiniteNumber(offsetD) && offsetD >= OFFSET_DISTANCE_MIN && offsetD <= OFFSET_DISTANCE_MAX)) return message("invalid_parameter", {value0: "offsetD"});
        if (offsetSamples !== undefined && !(isIntegerAtLeast(offsetSamples, OFFSET_SAMPLES_MIN) && offsetSamples <= OFFSET_SAMPLES_MAX)) return message("invalid_parameter", {value0: "offsetSamples"});
        if (offsetShown !== undefined && typeof offsetShown !== "boolean") return message("invalid_option", {value0: "offsetShown"});
        if (offsetCuspsShown !== undefined && typeof offsetCuspsShown !== "boolean") return message("invalid_option", {value0: "offsetCuspsShown"});
        if (offsetSpeedPlotShown !== undefined && typeof offsetSpeedPlotShown !== "boolean") return message("invalid_option", {value0: "offsetSpeedPlotShown"});
        return undefined;
    },
});

/** The envelope Demonstration's collection (lesson L6): a Bézier curve of any degree, with the envelope display state. */
export const curveEnvelopePresetCollection = curveCollection("curve-envelope", {
    type: "JSXBezierCurve",
    graphState: ({envelopeT, envelopeLineCount, envelopeLinesShown, envelopeCurveShown, envelopeTouchShown}) => {
        if (envelopeT !== undefined && !(isFiniteNumber(envelopeT) && envelopeT >= 0 && envelopeT <= 1)) return message("invalid_parameter", {value0: "envelopeT"});
        if (envelopeLineCount !== undefined && !(isIntegerAtLeast(envelopeLineCount, ENVELOPE_LINES_MIN) && envelopeLineCount <= ENVELOPE_LINES_MAX)) return message("invalid_parameter", {value0: "envelopeLineCount"});
        if (envelopeLinesShown !== undefined && typeof envelopeLinesShown !== "boolean") return message("invalid_option", {value0: "envelopeLinesShown"});
        if (envelopeCurveShown !== undefined && typeof envelopeCurveShown !== "boolean") return message("invalid_option", {value0: "envelopeCurveShown"});
        if (envelopeTouchShown !== undefined && typeof envelopeTouchShown !== "boolean") return message("invalid_option", {value0: "envelopeTouchShown"});
        return undefined;
    },
});

/**
 * The family's Preset collections in catalog order; `PresetImport.ts` spreads this list (models and validation only, no graph).
 * The parametric collection keeps its definition in `parametric/parametricPresetCollection.ts`, which its graph imports directly.
 */
export const curveGeometryCollections: readonly PresetCollection<unknown>[] = [
    parametricPresetCollection, curvatureCurvePresetCollection, curveCombPresetCollection, evoluteCurvePresetCollection,
    curveOffsetPresetCollection, curveEnvelopePresetCollection,
];
