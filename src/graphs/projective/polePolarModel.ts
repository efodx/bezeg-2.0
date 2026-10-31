import {message} from "../../localization";
import {isRecord} from "../base/presets/PresetCollection";
import {
    ApproxPoint, Conic, ConicType, conic, classify, IRRATIONAL_TOLERANCE, LineIntersection, polar, pole, side, SideResult, tangentPoints,
} from "../../projective/conic";
import {AffineResult, Hom, join, lineAtInfinity, toAffine} from "../../projective/homogeneous";
import {accept, checkInteger, ProjectiveCheck, ProjectiveGridPoint, refuse} from "./projectiveValidation";
import {fractionText} from "./crossRatioModel";

/**
 * The state of the pole and polar graph (K3, spec projective-conics-lessons). The conic is one of four fixed integer conics; the
 * point P is either a finite point on the 1/5 grid (stored as integer numerators over the fixed denominator 5) or, when
 * `ideal` is set, the point at infinity of an integer direction. Everything else is derived exactly in bigint by the projective
 * kernel; only the final drawing uses doubles.
 */
export const POLE_POLAR_DENOMINATOR = 5;
/** Numerators are bounded: |numerator| <= 50 is a coordinate within +-10, inside the view box. */
export const POLE_POLAR_NUMERATOR_LIMIT = 50;
export const POLE_POLAR_DIRECTION_LIMIT = 5;
export const POLE_POLAR_CONIC_IDS = ["ellipse", "circle", "parabola", "hyperbola"] as const;
export type PolePolarConicId = typeof POLE_POLAR_CONIC_IDS[number];
export const POLE_POLAR_EXAMPLE_IDS = ["default", "on", "inside", "infinity", "custom"] as const;
export type PolePolarExampleId = typeof POLE_POLAR_EXAMPLE_IDS[number];

export interface PolePolarDirection {
    readonly dx: number;
    readonly dy: number;
}

export interface PolePolarModel {
    readonly example: PolePolarExampleId;
    readonly conic: PolePolarConicId;
    /** Numerators of the finite P over `POLE_POLAR_DENOMINATOR`. Kept while P is ideal, so leaving the ideal mode restores it. */
    readonly p: ProjectiveGridPoint;
    /** When present, P is the point at infinity of this direction (not both zero). */
    readonly ideal?: PolePolarDirection;
}

/** `A x^2 + B xy + C y^2 + D x + E y + F`, written out per conic. */
export const POLE_POLAR_CONICS: Readonly<Record<PolePolarConicId, Conic>> = {
    ellipse: conic(9, 0, 25, 0, 0, -225),
    circle: conic(1, 0, 1, 0, 0, -25),
    parabola: conic(1, 0, 0, 0, -4, 0),
    hyperbola: conic(9, 0, -16, 0, 0, -144),
};

const DEFAULT_P: ProjectiveGridPoint = {x: 5, y: 21}; // (1, 21/5)

export const POLE_POLAR_EXAMPLES: Readonly<Record<PolePolarExampleId, PolePolarModel>> = {
    default: {example: "default", conic: "ellipse", p: DEFAULT_P},
    on: {example: "on", conic: "ellipse", p: {x: 20, y: 9}}, // T1 = (4, 9/5)
    inside: {example: "inside", conic: "ellipse", p: {x: 5, y: 5}}, // (1, 1)
    infinity: {example: "infinity", conic: "ellipse", p: DEFAULT_P, ideal: {dx: 1, dy: 0}},
    custom: {example: "custom", conic: "ellipse", p: DEFAULT_P},
};

/** The view box `[left, top, right, bottom]`; every example's P, tangency points and the bounded conics' vertices lie inside it. */
export const POLE_POLAR_VIEW_BOX = [-12, 10.5, 12, -10.5] as const;

export const DEFAULT_POLE_POLAR_MODEL: PolePolarModel = POLE_POLAR_EXAMPLES.default;

const samePoint = (a: ProjectiveGridPoint, b: ProjectiveGridPoint): boolean => a.x === b.x && a.y === b.y;
const sameIdeal = (a?: PolePolarDirection, b?: PolePolarDirection): boolean => a === undefined || b === undefined ? a === b : a.dx === b.dx && a.dy === b.dy;

/** Whether a model still has exactly the values of its named example (`custom` never matches). */
export const matchesExample = (model: PolePolarModel): boolean => {
    const named = POLE_POLAR_EXAMPLES[model.example];
    return model.example !== "custom" && model.conic === named.conic && sameIdeal(model.ideal, named.ideal)
        && (named.ideal !== undefined || samePoint(model.p, named.p));
};

export const serializePolePolarModel = (model: PolePolarModel): PolePolarModel => ({
    example: model.example, conic: model.conic, p: {x: model.p.x, y: model.p.y},
    ...(model.ideal ? {ideal: {dx: model.ideal.dx, dy: model.ideal.dy}} : {}),
});

/** Checks imported data field by field; the refusal names the field and the repair. */
export function parsePolePolarModel(data: unknown): ProjectiveCheck<PolePolarModel> {
    if (!isRecord(data)) return refuse(message("projective_invalid_not_an_object"));
    const example = POLE_POLAR_EXAMPLE_IDS.find(id => id === data.example);
    if (example === undefined) return refuse(message("projective_invalid_unknown_example", {value0: POLE_POLAR_EXAMPLE_IDS.join(", ")}));
    const conicId = POLE_POLAR_CONIC_IDS.find(id => id === data.conic);
    if (conicId === undefined) return refuse(message("projective_invalid_unknown_conic", {value0: POLE_POLAR_CONIC_IDS.join(", ")}));
    if (!isRecord(data.p)) return refuse(message("projective_invalid_field_missing", {value0: "p"}));
    const x = checkInteger(data.p.x, "p.x", POLE_POLAR_NUMERATOR_LIMIT);
    if (!x.ok) return x;
    const y = checkInteger(data.p.y, "p.y", POLE_POLAR_NUMERATOR_LIMIT);
    if (!y.ok) return y;
    let ideal: PolePolarDirection | undefined;
    if (data.ideal !== undefined && data.ideal !== null) {
        if (!isRecord(data.ideal)) return refuse(message("projective_invalid_field_missing", {value0: "ideal"}));
        const dx = checkInteger(data.ideal.dx, "ideal.dx", POLE_POLAR_DIRECTION_LIMIT);
        if (!dx.ok) return dx;
        const dy = checkInteger(data.ideal.dy, "ideal.dy", POLE_POLAR_DIRECTION_LIMIT);
        if (!dy.ok) return dy;
        if (dx.value === 0 && dy.value === 0) return refuse(message("projective_invalid_zero_direction"));
        ideal = {dx: dx.value, dy: dy.value};
    }
    const model = serializePolePolarModel({example, conic: conicId, p: {x: x.value, y: y.value}, ideal});
    // A named example whose values were edited is a custom set-up, so the example buttons never claim a wrong state.
    return accept(example === "custom" || matchesExample(model) ? model : {...model, example: "custom"});
}

// ---- Exact scene ---------------------------------------------------------------------------------------------------

export type TangencyPoint =
    | {readonly exact: true; readonly point: Hom; readonly view: AffineResult}
    | {readonly exact: false; readonly approx: ApproxPoint};

export type TangentLine =
    | {readonly exact: true; readonly line: Hom}
    /** Numerical coefficients `[a, b, c]` of `ax + by + c = 0`, within the stated tolerance. */
    | {readonly exact: false; readonly coefficients: readonly [number, number, number]};

export interface PolePolarScene {
    readonly conic: Conic;
    readonly type: ConicType;
    readonly p: Hom;
    readonly ideal: boolean;
    /** Exact: decided from the sign of the conic form at P, never with a tolerance. */
    readonly side: SideResult;
    readonly polar?: Hom;
    /** One marker for `on`, two for `outside`, none for `inside`. */
    readonly tangency: readonly TangencyPoint[];
    /** True when the tangency points are decimal approximations (tolerance `NUMERICAL_TOLERANCE`). */
    readonly numerical: boolean;
    readonly tangents: readonly TangentLine[];
    /** The centre of the conic: the pole of the line at infinity. Ideal for a parabola (its axis direction). */
    readonly centre?: AffineResult;
}

/** True for the line at infinity `[0, 0, c]`: it has no finite equation and is never drawn. */
export const isLineAtInfinity = (line: Hom): boolean => line[0] === 0n && line[1] === 0n;

export const NUMERICAL_TOLERANCE = IRRATIONAL_TOLERANCE;

/** P as a homogeneous point: `[x, y, 5]` over the grid numerators, or `[dx, dy, 0]` for an ideal point. */
export const pointOf = (model: PolePolarModel): Hom => model.ideal
    ? [BigInt(model.ideal.dx), BigInt(model.ideal.dy), 0n]
    : [BigInt(model.p.x), BigInt(model.p.y), BigInt(POLE_POLAR_DENOMINATOR)];

const approxHom = (p: ApproxPoint): readonly [number, number, number] => p.kind === "finite" ? [p.x, p.y, 1] : [p.dx, p.dy, 0];
const cross = (a: readonly number[], b: readonly number[]): readonly [number, number, number] =>
    [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Evaluates the whole scene exactly. The side is exact; only an irrational tangency is approximated, and is flagged `numerical`. */
export function evaluatePolePolar(model: PolePolarModel): PolePolarScene {
    const c = POLE_POLAR_CONICS[model.conic];
    const p = pointOf(model);
    const pl = polar(c, p);
    const centre = pole(c, lineAtInfinity());
    const base = {
        conic: c, type: classify(c), p, ideal: model.ideal !== undefined, side: side(c, p),
        polar: pl.status === "ok" ? pl.line : undefined,
        centre: centre.status === "ok" ? toAffine(centre.point) : undefined,
    };
    const found = tangentPoints(c, p);
    if (found.status === "on") {
        return {...base, numerical: false, tangency: [{exact: true, point: found.point, view: toAffine(found.point)}], tangents: base.polar ? [{exact: true, line: base.polar}] : []};
    }
    if (found.status !== "outside") return {...base, tangency: [], numerical: false, tangents: []};
    const hit: LineIntersection = found.tangency;
    if (hit.status === "two") {
        return {
            ...base, numerical: false,
            tangency: hit.points.map(q => ({exact: true as const, point: q, view: toAffine(q)})),
            tangents: hit.points.map(q => ({exact: true as const, line: join(p, q)})),
        };
    }
    if (hit.status === "irrational") {
        const hp = [Number(p[0]), Number(p[1]), Number(p[2])];
        return {
            ...base, numerical: true,
            tangency: hit.approx.map(approx => ({exact: false as const, approx})),
            tangents: hit.approx.map(approx => ({exact: false as const, coefficients: cross(hp, approxHom(approx))})),
        };
    }
    return {...base, tangency: [], numerical: false, tangents: []};
}

const minus = (text: string): string => text.replace("-", "−");

/** P as text: `(1, 21/5)` for a finite point, the direction for an ideal one. */
export function pointText(p: Hom): string {
    const view = toAffine(p);
    return view.kind === "finite"
        ? `(${fractionText(view.x)}, ${fractionText(view.y)})`
        : `(${minus(String(view.direction[0]))}, ${minus(String(view.direction[1]))})`;
}
