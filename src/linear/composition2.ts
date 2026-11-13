import {apply, det, IDENTITY, Mat2, multiply, orientationSign, Vec2} from './matrix2';

/**
 * Composition and affine maps (lesson L5, ADR 0025 section 2). Pure TypeScript: no React, JSXGraph or localization.
 *
 * A chosen element is a rotation by k * 15 degrees or a reflection in the line through the origin at the angle
 * k * 7.5 degrees (so the reflection matrix has the doubled angle k * 15 degrees), k an integer 0..23. Both families
 * are closed under composition, which a line at multiples of 15 degrees would not be (the rotation by 15 degrees
 * after the reflection in the x-axis is the reflection at 7.5 degrees). Only these two are stored as elements: scale and
 * shear matrices lie on the quarter grid and are stored as free entries.
 */
export const ELEMENT_STEP_DEGREES = 15;
/** Number of distinct elements per family: 360 / 15. */
export const ELEMENT_COUNT = 24;

export type ElementKind = 'rotation' | 'reflection';
export interface MapElement {
    readonly kind: ElementKind;
    /** Integer 0..23. */
    readonly k: number;
}

export const isElementIndex = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < ELEMENT_COUNT;

const EXACT_COS_SIN: readonly (readonly [number, number])[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/** cos and sin of k * 15 degrees; exact (0, 1, -1) when k is a multiple of 6, correctly rounded otherwise. */
export function cosSin(k: number): readonly [number, number] {
    const m = ((k % ELEMENT_COUNT) + ELEMENT_COUNT) % ELEMENT_COUNT;
    if (m % 6 === 0) {
        return EXACT_COS_SIN[m / 6];
    }
    const angle = m * Math.PI / 12;
    return [Math.cos(angle), Math.sin(angle)];
}

/** Negating an exact zero must not leave -0 in a stored or compared matrix. */
const zero = (x: number): number => x === 0 ? 0 : x;

/** Rotation by k * 15 degrees, counter-clockwise: [[c, -s], [s, c]]. */
export function rotationMatrix(k: number): Mat2 {
    const [c, s] = cosSin(k);
    return [[c, zero(-s)], [s, c]];
}

/** Reflection in the line at the angle k * 7.5 degrees: [[c, s], [s, -c]] with c, s of k * 15 degrees. */
export function reflectionMatrix(k: number): Mat2 {
    const [c, s] = cosSin(k);
    return [[c, s], [s, zero(-c)]];
}

export const elementMatrix = (e: MapElement): Mat2 => e.kind === 'rotation' ? rotationMatrix(e.k) : reflectionMatrix(e.k);

/** The orientation of an element, from its kind (exact, never from a computed float). */
export const elementOrientation = (e: MapElement): 1 | -1 => e.kind === 'rotation' ? 1 : -1;

const wrap = (k: number): number => ((k % ELEMENT_COUNT) + ELEMENT_COUNT) % ELEMENT_COUNT;

/**
 * The element of "first, then second" (matrix second * first), exact in the index arithmetic:
 * R_m R_k = R_(m+k), R_m F_k = F_(k+m), F_m R_k = F_(m-k), F_m F_k = R_(m-k).
 */
export function composeElements(second: MapElement, first: MapElement): MapElement {
    if (second.kind === 'rotation') {
        return first.kind === 'rotation'
            ? {kind: 'rotation', k: wrap(second.k + first.k)}
            : {kind: 'reflection', k: wrap(first.k + second.k)};
    }
    return first.kind === 'rotation'
        ? {kind: 'reflection', k: wrap(second.k - first.k)}
        : {kind: 'rotation', k: wrap(second.k - first.k)};
}

/** The matrix a slot applies: its chosen element when there is one, else its stored free entries. */
export const slotMatrix = (matrix: Mat2, element?: MapElement): Mat2 => element ? elementMatrix(element) : matrix;

/** Orientation of a slot: from the element when chosen (exact), else from the grid matrix (exact on the quarter grid). */
export const slotOrientation = (matrix: Mat2, element?: MapElement): -1 | 0 | 1 =>
    element ? elementOrientation(element) : orientationSign(matrix);

export interface CompositionFields {
    readonly matrix: Mat2;
    readonly secondMatrix?: Mat2;
    readonly element?: MapElement;
    readonly secondElement?: MapElement;
    readonly translation?: Vec2;
    readonly pivot?: Vec2;
}

export const firstMap = (s: Pick<CompositionFields, 'matrix' | 'element'>): Mat2 => slotMatrix(s.matrix, s.element);
/** The second matrix B; the identity when the state has none (a composition with nothing applied after). */
export const secondMap = (s: Pick<CompositionFields, 'secondMatrix' | 'secondElement'>): Mat2 =>
    s.secondMatrix || s.secondElement ? slotMatrix(s.secondMatrix ?? IDENTITY, s.secondElement) : IDENTITY;

/** The product readout B A: apply A first, then B. */
export const productMatrix = (s: CompositionFields): Mat2 => multiply(secondMap(s), firstMap(s));

/** The element of the product when both slots are chosen elements (exact); otherwise undefined. */
export const productElement = (s: CompositionFields): MapElement | undefined =>
    s.element && s.secondElement ? composeElements(s.secondElement, s.element) : undefined;

/** Orientation of the product: the product of the slot orientations (from elements where chosen, exact). */
export const productOrientation = (s: CompositionFields): -1 | 0 | 1 =>
    (slotOrientation(firstMap(s), s.element) * slotOrientation(secondMap(s), s.secondElement)) as -1 | 0 | 1;

export const DEFAULT_PIVOT: Vec2 = [0, 0];
export const DEFAULT_TRANSLATION: Vec2 = [0, 0];

/**
 * The stored affine form T(P) = c + M (P - c) + b, with M the product B A, c the pivot (default the origin) and b the
 * translation (default 0). The two forms of the lesson are special cases: c = 0 gives M P + b, b = 0 gives c + M (P - c).
 */
export function affineImage(m: Mat2, pivot: Vec2, translation: Vec2, p: Vec2): Vec2 {
    const d = apply(m, [p[0] - pivot[0], p[1] - pivot[1]]);
    return [pivot[0] + d[0] + translation[0], pivot[1] + d[1] + translation[1]];
}

/** The same map written T(P) = M P + t, with t = b + c - M c (the derived form; not stored). */
export function affineTranslationForm(m: Mat2, pivot: Vec2, translation: Vec2): Vec2 {
    const mc = apply(m, pivot);
    return [translation[0] + pivot[0] - mc[0], translation[1] + pivot[1] - mc[1]];
}

export const stateAffineImage = (s: CompositionFields, p: Vec2): Vec2 =>
    affineImage(productMatrix(s), s.pivot ?? DEFAULT_PIVOT, s.translation ?? DEFAULT_TRANSLATION, p);

/** Image of a point of the plane under "A, then B" computed by applying the two matrices in turn (not through the product). */
export const applyThenApply = (a: Mat2, b: Mat2, p: Vec2): Vec2 => apply(b, apply(a, p));

/** The Bezier fixture of the existing affine lesson (src/learning/content/expansionGuidedLessons.ts): control points. */
export const COMPOSITION_FIXTURE: readonly Vec2[] = [[1, 0], [2, 3], [4, 2], [5, -1]];

/** de Casteljau evaluation of the Bezier curve of the control points at t. */
export function deCasteljau(points: readonly Vec2[], t: number): Vec2 {
    let level = points.slice();
    while (level.length > 1) {
        level = level.slice(1).map((q, i) => [(1 - t) * level[i][0] + t * q[0], (1 - t) * level[i][1] + t * q[1]] as Vec2);
    }
    return level[0];
}

export const affineControlPoints = (s: CompositionFields, points: readonly Vec2[] = COMPOSITION_FIXTURE): Vec2[] =>
    points.map(p => stateAffineImage(s, p));

/** Determinant of the product: det B * det A (equal to det(B A) to rounding off the quarter grid). */
export const productDeterminant = (s: CompositionFields): number => det(productMatrix(s));
