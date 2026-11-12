import {message} from "../../../localization";
import {isFiniteNumber, isIntegerAtLeast, type PresetCollection} from "../../base/presets/PresetCollection";
import {bezierClippingCollection} from "../../compgeo/compgeoPresetCollections";
import {ARC_MOVER_MODES, ARC_PIECES_MAX, ARC_PIECES_MIN} from "../arclength/arcLengthModel";
import {curveCollection} from "../curvePresetCollections";

const bezier = (key: string) => curveCollection(key, {type: "JSXBezierCurve"});

/** The Bezier curve Demonstration's collection. */
export const bezierPresetCollection = bezier("bezier-curve");
/** The de Casteljau Demonstration's collection. */
export const decasteljauPresetCollection = bezier("decasteljau");
/** The alternative de Casteljau Demonstration's collection; the key `decasteljau2` is a file contract. */
export const decasteljauAlternativePresetCollection = bezier("decasteljau2");
/** The affine transformations Demonstration's collection. */
export const affinePresetCollection = bezier("affine-transform");
/** The subdivision Demonstration's collection. */
export const subdivisionPresetCollection = bezier("subdivision-1");
/** The repeated subdivision Demonstration's collection. */
export const repeatedSubdivisionPresetCollection = bezier("bezier-subdivision");
/** The extrapolation Demonstration's collection. */
export const extrapolationPresetCollection = bezier("bezier-extrapolation");
/** The degree elevation Demonstration's collection. */
export const elevationPresetCollection = bezier("elevation-graph");

/** The degree reduction Demonstration's collection (advanced lesson D1): a cubic Bézier curve (exactly four points) with the reduction mode and display state. */
export const reductionPresetCollection = curveCollection("reduction", {
    type: "JSXBezierCurve",
    pointCount: 4,
    graphState: ({reductionMode, reductionShown, reductionElevationShown}) => {
        if (reductionMode !== undefined && reductionMode !== "fixed" && reductionMode !== "free") return message("invalid_option", {value0: "reductionMode"});
        if (reductionShown !== undefined && typeof reductionShown !== "boolean") return message("invalid_option", {value0: "reductionShown"});
        if (reductionElevationShown !== undefined && typeof reductionElevationShown !== "boolean") return message("invalid_option", {value0: "reductionElevationShown"});
        return undefined;
    },
});

/** The arc-length parametrization Demonstration's collection (lesson D3): a Bézier curve or a PH curve, with the display state of the marks, the speed plot and the moving point. */
export const arcLengthParamPresetCollection = curveCollection("arc-length-param", {
    type: ["JSXBezierCurve", "JSXPHBezierCurve"],
    graphState: ({arcPieces, arcEqualTShown, arcEqualArcShown, arcSpeedPlotShown, arcMoverMode, arcMoverPosition}) => {
        if (arcPieces !== undefined && !(isIntegerAtLeast(arcPieces, ARC_PIECES_MIN) && arcPieces <= ARC_PIECES_MAX)) return message("invalid_parameter", {value0: "arcPieces"});
        if (arcEqualTShown !== undefined && typeof arcEqualTShown !== "boolean") return message("invalid_option", {value0: "arcEqualTShown"});
        if (arcEqualArcShown !== undefined && typeof arcEqualArcShown !== "boolean") return message("invalid_option", {value0: "arcEqualArcShown"});
        if (arcSpeedPlotShown !== undefined && typeof arcSpeedPlotShown !== "boolean") return message("invalid_option", {value0: "arcSpeedPlotShown"});
        if (arcMoverMode !== undefined && !ARC_MOVER_MODES.some(mode => mode === arcMoverMode)) return message("invalid_option", {value0: "arcMoverMode"});
        if (arcMoverPosition !== undefined && !(isFiniteNumber(arcMoverPosition) && arcMoverPosition >= 0 && arcMoverPosition <= 1)) return message("invalid_parameter", {value0: "arcMoverPosition"});
        return undefined;
    },
});

/** The family's Preset collections in catalog order, the clipping collection last; `PresetImport.ts` spreads this list (models and validation only, no graph). */
export const bezierCollections: readonly PresetCollection<unknown>[] = [
    bezierPresetCollection, decasteljauPresetCollection, decasteljauAlternativePresetCollection, affinePresetCollection,
    subdivisionPresetCollection, repeatedSubdivisionPresetCollection, extrapolationPresetCollection, elevationPresetCollection,
    reductionPresetCollection, arcLengthParamPresetCollection, bezierClippingCollection,
];
