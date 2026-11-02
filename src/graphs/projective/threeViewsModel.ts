import {message} from "../../localization";
import {isRecord} from "../base/presets/PresetCollection";
import {classify, Conic, conic, ConicType, discriminant} from "../../projective/conic";
import {sampleConic} from "../../projective/conicSampler";
import {accept, checkInteger, ProjectiveCheck, refuse} from "./projectiveValidation";

/**
 * The state of the "one conic, three views" graph (K5 of projective-conics-lessons, ADR 0033). The unit circle x^2 + y^2 = 1 is
 * fixed and the line L: y = c moves; the projective map (x, y) -> (X, Y) = (x / (y - c), 1 / (y - c)) sends L to the line at
 * infinity and the circle to X^2 + (c^2 - 1) Y^2 + 2cY + 1 = 0.
 *
 * `c` is stored as a whole number of tenths `k` (c = k / 10), range -25..25 (c in [-2.5, 2.5]), so every decision is exact integer
 * arithmetic: multiplying the image equation by 100 gives 100 X^2 + (k^2 - 100) Y^2 + 20k Y + 100 = 0, which `conic` reduces by
 * the gcd. The optional point on the circle is stored as a step number of 15 degrees (0..23). Doubles appear only when drawing.
 */
export const THREE_VIEWS_LIMIT = 25;
export const THREE_VIEWS_TENTHS = 10;
/** The point on the circle moves in steps of 15 degrees, 24 positions. */
export const THREE_VIEWS_ANGLE_STEPS = 24;
export const THREE_VIEWS_STEP_DEGREES = 15;

export interface ThreeViewsModel {
    /** The height of L in tenths: c = c / 10. */
    readonly c: number;
    readonly pointOn: boolean;
    /** The position of the optional point P on the circle, in steps of 15 degrees from (1, 0), counter-clockwise. */
    readonly angle: number;
}

export const DEFAULT_THREE_VIEWS_MODEL: ThreeViewsModel = {c: 20, pointOn: false, angle: 3};

export const serializeThreeViewsModel = (model: ThreeViewsModel): ThreeViewsModel => ({c: model.c, pointOn: model.pointOn, angle: model.angle});

const checkBoolean = (value: unknown, field: string): ProjectiveCheck<boolean> =>
    typeof value === "boolean" ? accept(value) : refuse(message("projective_three_views_invalid_boolean", {value0: field}));

/** Checks imported data field by field; the refusal names the field and the repair. */
export function parseThreeViewsModel(data: unknown): ProjectiveCheck<ThreeViewsModel> {
    if (!isRecord(data)) return refuse(message("projective_invalid_not_an_object"));
    const c = checkInteger(data.c, "c", THREE_VIEWS_LIMIT);
    if (!c.ok) return c;
    const pointOn = checkBoolean(data.pointOn, "pointOn");
    if (!pointOn.ok) return pointOn;
    const angle = checkInteger(data.angle, "angle", THREE_VIEWS_ANGLE_STEPS - 1);
    if (!angle.ok) return angle;
    if (angle.value < 0) return refuse(message("projective_invalid_out_of_range", {value0: "angle", value1: THREE_VIEWS_ANGLE_STEPS - 1}));
    return accept({c: c.value, pointOn: pointOn.value, angle: angle.value});
}

// ---- The exact scene -----------------------------------------------------------------------------------------------

export type ThreeViewsType = Extract<ConicType, "ellipse" | "parabola" | "hyperbola">;
/** How L meets the circle: not at all (ellipse), in one point (parabola) or in two (hyperbola). */
export type ThreeViewsContact = "misses" | "touches" | "cuts";

/** A point where L meets the circle and the direction its image has at infinity. */
export interface ThreeViewsIdealPoint {
    /** The x coordinate of the point (x, c) on the circle: a square root, so a double for drawing. */
    readonly x: number;
    /** The exact 100 x^2 = 100 - k^2 (a whole number), the proof that the points are real. */
    readonly hundredXSquared: number;
    /** The image of the point is the point at infinity with direction (x, 1). */
    readonly direction: {readonly x: number; readonly y: 1};
}

export type ThreeViewsPointImage =
    | {readonly kind: "finite"; readonly X: number; readonly Y: number}
    | {readonly kind: "infinity"; readonly direction: {readonly x: number; readonly y: 1}};

export interface ThreeViewsScene {
    readonly model: ThreeViewsModel;
    /** c as a double, k / 10, for drawing only. */
    readonly cValue: number;
    /** The image equation, reduced by the gcd: A X^2 + B XY + C Y^2 + D X + E Y + F = 0. */
    readonly conic: Conic;
    readonly type: ThreeViewsType;
    readonly contact: ThreeViewsContact;
    /** B^2 - 4AC of the reduced conic, exact. */
    readonly discriminant: bigint;
    /** The coefficient A of the reduced conic: the scale of the equation X^2 + (c^2 - 1) Y^2 + 2cY + 1 = 0. */
    readonly scale: bigint;
    /** det of the symmetric 3x3 matrix of the reduced conic, times 4 (an integer). */
    readonly fourDeterminant: bigint;
    /** det / scale^3, which is the determinant of the unscaled equation: exactly -1. */
    readonly determinantNormalised: number;
    /** The points where L meets the circle, ordered by x, and so the points at infinity of the image (empty, one or two). */
    readonly ideal: readonly ThreeViewsIdealPoint[];
    /** The optional point P on the circle and its image, when it is switched on. */
    readonly point?: {readonly x: number; readonly y: number; readonly image: ThreeViewsPointImage};
}

/** The unit-circle point at step `angle` of 15 degrees; the multiples of 90 degrees are exact. */
export function circlePoint(angle: number): {x: number; y: number} {
    const step = ((angle % THREE_VIEWS_ANGLE_STEPS) + THREE_VIEWS_ANGLE_STEPS) % THREE_VIEWS_ANGLE_STEPS;
    if (step % 6 === 0) return [{x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}][step / 6];
    const theta = step * THREE_VIEWS_STEP_DEGREES * Math.PI / 180;
    return {x: Math.cos(theta), y: Math.sin(theta)};
}

/** The image of a point (x, y) with y != c under (x, y) -> (x / (y - c), 1 / (y - c)). */
export const imageOfPoint = (c: number, x: number, y: number): {X: number; Y: number} => ({X: x / (y - c), Y: 1 / (y - c)});

/** |X^2 + (c^2 - 1) Y^2 + 2cY + 1| divided by the sum of the absolute values of the terms: the relative residual of the image equation. */
export function imageResidual(c: number, X: number, Y: number): number {
    const terms = [X * X, (c * c - 1) * Y * Y, 2 * c * Y, 1];
    const sum = terms.reduce((a, b) => a + b, 0);
    return Math.abs(sum) / terms.reduce((a, b) => a + Math.abs(b), 0);
}

/** Below this distance of a circle point from L the point is treated as lying on L (its image is at infinity). */
export const ON_LINE_TOLERANCE = 1e-9;

/** The image conic of the circle for c = k / 10, in the exact reduced integer form. */
export function imageConic(k: number): Conic {
    return conic(100, 0, k * k - 100, 0, 20 * k, 100);
}

export function evaluateThreeViews(model: ThreeViewsModel): ThreeViewsScene {
    const k = model.c;
    const reduced = imageConic(k);
    const kind = classify(reduced);
    const type: ThreeViewsType = kind === "parabola" || kind === "hyperbola" ? kind : "ellipse";
    // k^2 against 100 is the same decision as the sign of B^2 - 4AC (= 400 (100 - k^2) before the reduction), made on the whole number k.
    const contact: ThreeViewsContact = k * k > 100 ? "misses" : k * k === 100 ? "touches" : "cuts";
    const [A, , C, , E, F] = reduced;
    const fourDeterminant = A * (4n * C * F - E * E);
    const c = k / THREE_VIEWS_TENTHS;
    const hundred = 100 - k * k;
    const ideal: ThreeViewsIdealPoint[] = contact === "misses" ? [] : contact === "touches"
        ? [{x: 0, hundredXSquared: 0, direction: {x: 0, y: 1}}]
        : [-1, 1].map(sign => {
            const x = sign * Math.sqrt(hundred) / 10;
            return {x, hundredXSquared: hundred, direction: {x, y: 1 as const}};
        });
    let point: ThreeViewsScene["point"];
    if (model.pointOn) {
        const p = circlePoint(model.angle);
        const image: ThreeViewsPointImage = Math.abs(p.y - c) < ON_LINE_TOLERANCE
            ? {kind: "infinity", direction: {x: p.x, y: 1}}
            : {kind: "finite", ...imageOfPoint(c, p.x, p.y)};
        point = {x: p.x, y: p.y, image};
    }
    return {
        model, cValue: c, conic: reduced, type, contact, discriminant: discriminant(reduced), scale: A, fourDeterminant,
        determinantNormalised: Number(fourDeterminant) / Number(4n * A * A * A), ideal, point,
    };
}

// ---- Drawing helpers (pure) ------------------------------------------------------------------------------------------

/** The board: two panels side by side, the source plane (left, centre (-6, 0), scale 2) and the image plane (right, centre (6, 0), scale 1). */
export const THREE_VIEWS_VIEW_BOX = [-12, 7.5, 12, -7.5] as const;
export const SOURCE_CENTRE = -6;
export const IMAGE_CENTRE = 6;
export const SOURCE_SCALE = 2;
export const PANEL_HALF_WIDTH = 5.5;
export const PANEL_HALF_HEIGHT = 7;
/** The image plane window the sampler clips the image conic to, in image coordinates. */
export const IMAGE_WINDOW = {xMin: -PANEL_HALF_WIDTH, xMax: PANEL_HALF_WIDTH, yMin: -PANEL_HALF_HEIGHT, yMax: PANEL_HALF_HEIGHT} as const;

/** Where the ray from `from` in direction `d` leaves the image window (the largest s with from + s d inside it). */
export function windowExit(from: {x: number; y: number}, d: {x: number; y: number}): {x: number; y: number} {
    const w = IMAGE_WINDOW;
    let s = Infinity;
    if (d.x > 0) s = Math.min(s, (w.xMax - from.x) / d.x);
    if (d.x < 0) s = Math.min(s, (w.xMin - from.x) / d.x);
    if (d.y > 0) s = Math.min(s, (w.yMax - from.y) / d.y);
    if (d.y < 0) s = Math.min(s, (w.yMin - from.y) / d.y);
    return {x: from.x + s * d.x, y: from.y + s * d.y};
}

/** The centre of the image conic: (0, c / (1 - c^2)) for |c| < 1; the parabola has none, so its direction ray starts at the origin. */
export function directionAnchor(scene: ThreeViewsScene): {x: number; y: number} {
    return scene.contact === "cuts" ? {x: 0, y: scene.cValue / (1 - scene.cValue * scene.cValue)} : {x: 0, y: 0};
}

/** The asymptote segments (hyperbola) or the axis direction ray (parabola) in image coordinates, one `[from, to]` per point at infinity. */
export function directionSegments(scene: ThreeViewsScene): readonly (readonly [{x: number; y: number}, {x: number; y: number}])[] {
    const anchor = directionAnchor(scene);
    return scene.ideal.map(p => [anchor, windowExit(anchor, p.direction)] as const);
}

/**
 * The pieces of the image conic in the image window as one polyline in image coordinates, broken by NaN (JSXGraph lifts the pen at
 * NaN). The sampler returns each hyperbola branch as its own piece, ending at the window where the branch runs to the point at
 * infinity, so the two branches are never joined.
 */
export function imagePolyline(c: Conic): {x: number[]; y: number[]} {
    const out = {x: [] as number[], y: [] as number[]};
    for (const piece of sampleConic(c, IMAGE_WINDOW).pieces) {
        if (out.x.length) {
            out.x.push(NaN);
            out.y.push(NaN);
        }
        for (const p of piece.points) {
            out.x.push(p.x);
            out.y.push(p.y);
        }
    }
    return out;
}
