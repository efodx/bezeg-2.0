import {
    affineControlPoints, affineTranslationForm, COMPOSITION_FIXTURE, DEFAULT_PIVOT, DEFAULT_TRANSLATION, firstMap, MapElement, productElement, productMatrix,
    productOrientation, secondMap,
} from '../../linear/composition2';
import {det, isMatrixEntry, type Mat2, type Vec2} from '../../linear/matrix2';
import type {LinearMapState} from '../../linear/linearMapModel';
import {gridPolyline, type Polyline} from './linearMapScene';

/**
 * The derived data of the composition mode (lesson L5), pure: no React, JSXGraph or localization. Everything is recomputed from the
 * stored state (`matrix`, `secondMatrix`, `element`, `secondElement`, `translation`, `pivot`); nothing is stored here.
 */

/** The default view of the plane modes: the grid covers [-6, 6]^2. The composition view only ever grows from it. */
export const COMPOSITION_BASE_VIEW: readonly [number, number, number, number] = [-12, 9, 12, -9];

export interface CompositionView {
    /** A, the matrix applied first (the chosen element's, else the stored entries). */
    readonly a: Mat2;
    /** B, the matrix applied second (the identity when none is stored). */
    readonly b: Mat2;
    /** The product B A. */
    readonly product: Mat2;
    /** det of the product; its sign is `orientation`, which comes from the slots' kinds and is exact. */
    readonly determinant: number;
    readonly orientation: -1 | 0 | 1;
    /** The product as a named element, only when both slots are chosen elements. */
    readonly productElement?: MapElement;
    readonly pivot: Vec2;
    /** True when the state stores a pivot (the derived t is then read out). */
    readonly pivotSet: boolean;
    readonly translation: Vec2;
    /** t = b + c - M c of T(P) = M P + t. */
    readonly translationForm: Vec2;
    /** The tip of the translation vector: the image of the pivot, c + b. */
    readonly pivotImage: Vec2;
    readonly source: readonly Vec2[];
    /** The control points of the image of the fixture curve under the whole affine map. */
    readonly image: Vec2[];
    readonly gridA: Polyline;
    readonly gridImage: Polyline;
    /** Divides the base view: 1 when everything fits the base view, larger when the view was enlarged to show the images. */
    readonly viewScale: number;
}

const shift = (line: Polyline, offset: Vec2): Polyline => ({x: line.x.map(v => v + offset[0]), y: line.y.map(v => v + offset[1])});

/** True when every entry is a multiple of 1/4, so the matrix is stored and shown exactly (an element's matrix usually is not). */
export const isExactMatrix = (m: Mat2): boolean => m.every(row => row.every(isMatrixEntry));

/** The scale of the view: 1, or the smallest multiple of 1/2 of the base view that contains the points with a margin. */
export function fitScale(points: readonly Vec2[]): number {
    const [left, top] = COMPOSITION_BASE_VIEW;
    const margin = 1;
    let scale = 1;
    for (const [x, y] of points) {
        scale = Math.max(scale, (Math.abs(x) + margin) / Math.abs(left), (Math.abs(y) + margin) / Math.abs(top));
    }
    return Math.ceil(scale * 2) / 2;
}

export function viewBoxOf(scale: number): [number, number, number, number] {
    const [left, top, right, bottom] = COMPOSITION_BASE_VIEW;
    return [left * scale, top * scale, right * scale, bottom * scale];
}

export function deriveComposition(state: LinearMapState): CompositionView {
    const a = firstMap(state);
    const b = secondMap(state);
    const product = productMatrix(state);
    const pivot = state.pivot ?? DEFAULT_PIVOT;
    const translation = state.translation ?? DEFAULT_TRANSLATION;
    const translationForm = affineTranslationForm(product, pivot, translation);
    const image = affineControlPoints(state);
    const pivotImage: Vec2 = [pivot[0] + translation[0], pivot[1] + translation[1]];
    return {
        a, b, product, determinant: det(product), orientation: productOrientation(state), productElement: productElement(state),
        pivot, pivotSet: state.pivot !== undefined, translation, translationForm, pivotImage,
        source: COMPOSITION_FIXTURE, image,
        gridA: gridPolyline(a),
        gridImage: shift(gridPolyline(product), translationForm),
        viewScale: fitScale([...COMPOSITION_FIXTURE, ...image, pivot, pivotImage]),
    };
}

export const compositionViewBox = (view: CompositionView): [number, number, number, number] => viewBoxOf(view.viewScale);

/** The straight segment from the pivot to its image (the translation vector), as a polyline. */
export const translationSegment = (view: CompositionView): Polyline =>
    ({x: [view.pivot[0], view.pivotImage[0]], y: [view.pivot[1], view.pivotImage[1]]});
