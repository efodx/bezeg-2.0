import {message} from "../../localization";
import {isRecord} from "../base/presets/PresetCollection";
import {
    crossRatio, CrossRatioResult, Fraction, fractionToNumber, Hom, isZero, join, point, project, toAffine, AffineResult,
} from "../../projective/homogeneous";
import {accept, checkGridPoint, checkInteger, checkTuple, ProjectiveCheck, ProjectiveGridPoint, refuse} from "./projectiveValidation";

/**
 * The state of the cross-ratio graph (K1, spec projective-conics-lessons). Four points sit on the first line `y = 0` at
 * the whole-number abscissae `params`; the centre and the two points that fix the second line are free grid points.
 * Everything else is derived exactly from these integers by the projective kernel, so no rounding enters the readouts.
 */
export const CROSS_RATIO_COORD_LIMIT = 30;
export const CROSS_RATIO_EXAMPLE_IDS = ["default", "harmonic", "infinity", "custom"] as const;
export type CrossRatioExampleId = typeof CROSS_RATIO_EXAMPLE_IDS[number];

export interface CrossRatioModel {
    readonly example: CrossRatioExampleId;
    /** Abscissae of A, B, C, D on the line `y = 0`. */
    readonly params: readonly [number, number, number, number];
    readonly centre: ProjectiveGridPoint;
    /** Two distinct grid points that fix the second line (the image line). */
    readonly line2: readonly [ProjectiveGridPoint, ProjectiveGridPoint];
}

const SECOND_LINE: CrossRatioModel["line2"] = [{x: 0, y: 1}, {x: 2, y: 2}]; // y = 1 + x/2
const CENTRE: ProjectiveGridPoint = {x: 0, y: 5};

/** The examples. `default` and `infinity` are the checked values of the spec: 9/8, and 33/20 with D at -10. */
export const CROSS_RATIO_EXAMPLES: Readonly<Record<CrossRatioExampleId, CrossRatioModel>> = {
    default: {example: "default", params: [0, 1, 3, 4], centre: CENTRE, line2: SECOND_LINE},
    harmonic: {example: "harmonic", params: [0, 6, 2, -6], centre: CENTRE, line2: SECOND_LINE},
    infinity: {example: "infinity", params: [0, 1, 3, -10], centre: CENTRE, line2: SECOND_LINE},
    custom: {example: "custom", params: [0, 1, 3, 4], centre: CENTRE, line2: SECOND_LINE},
};

/** The view box of the board `[left, top, right, bottom]`; every example's handles, finite images and centre lie inside it. */
export const CROSS_RATIO_VIEW_BOX = [-14, 9, 14, -7] as const;

const samePoint = (a: ProjectiveGridPoint, b: ProjectiveGridPoint): boolean => a.x === b.x && a.y === b.y;

/** Whether a model still has exactly the values of its named example (`custom` never matches). */
export const matchesExample = (model: CrossRatioModel): boolean => {
    const named = CROSS_RATIO_EXAMPLES[model.example];
    return model.example !== "custom" && model.params.every((v, i) => v === named.params[i]) && samePoint(model.centre, named.centre)
        && samePoint(model.line2[0], named.line2[0]) && samePoint(model.line2[1], named.line2[1]);
};

export const DEFAULT_CROSS_RATIO_MODEL: CrossRatioModel = CROSS_RATIO_EXAMPLES.default;

export const serializeCrossRatioModel = (model: CrossRatioModel): CrossRatioModel => ({
    example: model.example,
    params: [model.params[0], model.params[1], model.params[2], model.params[3]],
    centre: {x: model.centre.x, y: model.centre.y},
    line2: [{x: model.line2[0].x, y: model.line2[0].y}, {x: model.line2[1].x, y: model.line2[1].y}],
});

/** Checks imported data field by field; the refusal names the field and the repair. */
export function parseCrossRatioModel(data: unknown): ProjectiveCheck<CrossRatioModel> {
    if (!isRecord(data)) return refuse(message("projective_invalid_not_an_object"));
    const example = CROSS_RATIO_EXAMPLE_IDS.find(id => id === data.example);
    if (example === undefined) return refuse(message("projective_invalid_unknown_example", {value0: CROSS_RATIO_EXAMPLE_IDS.join(", ")}));
    const params = checkTuple(data.params, "params", 4, (entry, name) => checkInteger(entry, name, CROSS_RATIO_COORD_LIMIT));
    if (!params.ok) return params;
    const centre = checkGridPoint(data.centre, "centre", CROSS_RATIO_COORD_LIMIT);
    if (!centre.ok) return centre;
    const line2 = checkTuple(data.line2, "line2", 2, (entry, name) => checkGridPoint(entry, name, CROSS_RATIO_COORD_LIMIT));
    if (!line2.ok) return line2;
    const [a, b, c, d] = params.value;
    const model = serializeCrossRatioModel({example, params: [a, b, c, d], centre: centre.value, line2: [line2.value[0], line2.value[1]]});
    // A named example whose values were edited is a custom set-up, so the example buttons never claim a wrong state.
    return accept(example === "custom" || matchesExample(model) ? model : {...model, example: "custom"});
}

// ---- Exact scene ---------------------------------------------------------------------------------------------------

/** The first line `y = 0` as a homogeneous line. */
export const FIRST_LINE: Hom = [0n, 1n, 0n];

export type CrossRatioStatus = "ok" | "centre-on-line" | "coincident-points" | "degenerate-second-line";

export interface CrossRatioScene {
    readonly status: CrossRatioStatus;
    readonly originals: readonly Hom[];
    /** The exact cross-ratio of the four original points; absent when two coincide. */
    readonly originalRatio?: CrossRatioResult;
    /** The images on the second line (status `ok` or `coincident-points`); absent when the projection is undefined. */
    readonly images?: readonly Hom[];
    readonly imageViews?: readonly AffineResult[];
    readonly imageRatio?: CrossRatioResult;
    /** Index (0-3) of the image at infinity, if any. At most one point can project to infinity. */
    readonly idealIndex?: number;
}

/** The second line of a model, or the zero triple when its two points coincide. */
export const secondLine = (model: CrossRatioModel): Hom => join(point(model.line2[0].x, model.line2[0].y), point(model.line2[1].x, model.line2[1].y));

const dot = (l: Hom, p: Hom): bigint => l[0] * p[0] + l[1] * p[1] + l[2] * p[2];

/** Evaluates the whole scene exactly. Every undefined case is a typed status; nothing divides or yields NaN. */
export function evaluateCrossRatio(model: CrossRatioModel): CrossRatioScene {
    const originals = model.params.map(x => point(x, 0));
    const second = secondLine(model);
    if (isZero(second)) return {status: "degenerate-second-line", originals};
    const centre = point(model.centre.x, model.centre.y);
    if (dot(FIRST_LINE, centre) === 0n || dot(second, centre) === 0n) return {status: "centre-on-line", originals};
    const images: Hom[] = [];
    let idealIndex: number | undefined;
    for (let i = 0; i < 4; i++) {
        const projected = project(centre, FIRST_LINE, second, originals[i]);
        if (projected.status !== "ok") return {status: "centre-on-line", originals};
        images.push(projected.image);
        if (projected.ideal) idealIndex = i;
    }
    const originalRatio = crossRatio(originals[0], originals[1], originals[2], originals[3]);
    if (originalRatio.status !== "ok") return {status: "coincident-points", originals, originalRatio, images, imageViews: images.map(toAffine), idealIndex};
    const imageRatio = crossRatio(images[0], images[1], images[2], images[3]);
    return {status: "ok", originals, originalRatio, images, imageViews: images.map(toAffine), imageRatio, idealIndex};
}

export const POINT_NAMES = ["A", "B", "C", "D"] as const;

export const fractionText = (f: Fraction): string => (f.den === 1n ? `${f.num}` : `${f.num}/${f.den}`).replace("-", "\u2212");
export const fractionValue = (f: Fraction): number => fractionToNumber(f);
