import {
    Complex, complexExampleOperands, COMPLEX_EXAMPLE_IDS, ComplexExampleId, isComplexCoordinate, isComplexExampleId, snapComplexCoordinate,
} from './complex';

/**
 * The stored description of the complex multiplication demonstration. `example` records which named example the operands
 * started from (any valid operands may follow it, as with the other demonstrations); `productVisible` and `anglesVisible` say
 * whether the product arrow (Show product) and the argument arcs (Show arguments) are shown, saved so a reopened preset and a
 * lesson checkpoint show the same scene. The product, moduli, arguments and polar forms are never stored: they are recomputed.
 * Operand coordinates are on the 0.05 grid in [-2, 2].
 */
export interface ComplexModel {
    readonly example: ComplexExampleId;
    readonly zRe: number;
    readonly zIm: number;
    readonly wRe: number;
    readonly wIm: number;
    readonly productVisible: boolean;
    readonly anglesVisible: boolean;
}

function exampleModel(example: ComplexExampleId): ComplexModel {
    const {z, w} = complexExampleOperands(example);
    return {example, zRe: z.re, zIm: z.im, wRe: w.re, wIm: w.im, productVisible: false, anglesVisible: false};
}

/** (1 + i) i with the product and the arcs hidden, so the lesson can ask for a prediction before revealing -1 + i. */
export const DEFAULT_COMPLEX_MODEL: ComplexModel = exampleModel('rotation-i');

/** The model a named example starts from: its two operands, product and arcs hidden. */
export const COMPLEX_EXAMPLE_MODELS: Readonly<Record<ComplexExampleId, ComplexModel>> = Object.fromEntries(
    COMPLEX_EXAMPLE_IDS.map(id => [id, exampleModel(id)]),
) as Record<ComplexExampleId, ComplexModel>;

/** The operands z and w of a model. */
export const complexModelOperands = (model: ComplexModel): {readonly z: Complex; readonly w: Complex} =>
    ({z: {re: model.zRe, im: model.zIm}, w: {re: model.wRe, im: model.wIm}});

/**
 * Returns a sanitized model (unknown properties dropped, coordinates written as exact grid values) or undefined unless the data
 * is a valid model: a known example, four coordinates that are finite numbers on the 0.05 grid within [-2, 2] and two booleans.
 * Nothing is clamped: an off-grid or out-of-range coordinate rejects the whole model.
 */
export function parseComplexModel(data: unknown): ComplexModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, zRe, zIm, wRe, wIm, productVisible, anglesVisible} = data as Record<string, unknown>;
    if (!isComplexExampleId(example)) return undefined;
    if (!isComplexCoordinate(zRe) || !isComplexCoordinate(zIm) || !isComplexCoordinate(wRe) || !isComplexCoordinate(wIm)) return undefined;
    if (typeof productVisible !== 'boolean' || typeof anglesVisible !== 'boolean') return undefined;
    return {
        example,
        zRe: snapComplexCoordinate(zRe), zIm: snapComplexCoordinate(zIm),
        wRe: snapComplexCoordinate(wRe), wIm: snapComplexCoordinate(wIm),
        productVisible, anglesVisible,
    };
}
