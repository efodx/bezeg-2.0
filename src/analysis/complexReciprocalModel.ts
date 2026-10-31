import {Complex, COMPLEX_COORDINATE_MAX, isComplexCoordinate, snapComplexCoordinate} from './complex';

/**
 * The stored description of the reciprocal demonstration (complex maps lesson M1). The named examples and their operands are
 * below; `example` records which one the operands started from (any valid operands may follow it). `reciprocalVisible`,
 * `quotientVisible` and `circleVisible` say whether 1/z (Show reciprocal), w/z (Show division) and the circle inversion of z
 * (Show inversion circle, with the draggable centre and radius) are shown, saved so a reopened preset and a lesson checkpoint
 * show the same scene. The conjugate, reciprocal, quotient, moduli, arguments and inversion image are never stored.
 * All coordinates are on the 0.05 grid in [-2, 2]; the radius is a multiple of 0.05 in [0.05, 2].
 */
export interface ComplexReciprocalModel {
    readonly example: ComplexReciprocalExampleId;
    readonly zRe: number;
    readonly zIm: number;
    readonly wRe: number;
    readonly wIm: number;
    readonly reciprocalVisible: boolean;
    readonly quotientVisible: boolean;
    readonly circleVisible: boolean;
    readonly centreRe: number;
    readonly centreIm: number;
    readonly radius: number;
}

export const COMPLEX_RECIPROCAL_EXAMPLE_IDS = ['outside', 'inside', 'unit-circle', 'division', 'zero'] as const;
export type ComplexReciprocalExampleId = typeof COMPLEX_RECIPROCAL_EXAMPLE_IDS[number];

export const isComplexReciprocalExampleId = (value: unknown): value is ComplexReciprocalExampleId =>
    typeof value === 'string' && (COMPLEX_RECIPROCAL_EXAMPLE_IDS as readonly string[]).includes(value);

export const INVERSION_RADIUS_MIN = 0.05;
export const INVERSION_RADIUS_MAX = COMPLEX_COORDINATE_MAX;
const GRID_NOISE = 1e-9;

/** True for a finite multiple of 0.05 within [0.05, 2] (noise below 1e-9 of a step tolerated). */
export function isInversionRadius(value: unknown): value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    const units = value * 20;
    return Math.abs(units - Math.round(units)) <= GRID_NOISE && Math.round(units) >= 1 && Math.round(units) <= 40;
}

/** The grid radius nearest to `value`; does not clamp (callers check with `isInversionRadius`). Throws on a non-finite value. */
export function snapInversionRadius(value: number): number {
    if (!Number.isFinite(value)) throw new RangeError('The radius must be a finite number.');
    return Math.round(value * 20) / 20;
}

/** Operands of the named examples: z = 1 + i, 0.5 + 0.5i, 0.6 + 0.8i (on the unit circle), 1 - i (with w = 2 + i) and 0. */
const EXAMPLE_OPERANDS: Readonly<Record<ComplexReciprocalExampleId, {readonly z: Complex; readonly w: Complex}>> = {
    outside: {z: {re: 1, im: 1}, w: {re: 2, im: 1}},
    inside: {z: {re: 0.5, im: 0.5}, w: {re: 2, im: 1}},
    'unit-circle': {z: {re: 0.6, im: 0.8}, w: {re: 2, im: 1}},
    division: {z: {re: 1, im: -1}, w: {re: 2, im: 1}},
    zero: {z: {re: 0, im: 0}, w: {re: 2, im: 1}},
};

function exampleModel(example: ComplexReciprocalExampleId): ComplexReciprocalModel {
    const {z, w} = EXAMPLE_OPERANDS[example];
    return {
        example, zRe: z.re, zIm: z.im, wRe: w.re, wIm: w.im,
        reciprocalVisible: false, quotientVisible: false, circleVisible: false, centreRe: 0.5, centreIm: 0, radius: 1,
    };
}

/** z = 1 + i with 1/z, w/z and the inversion circle hidden, so the lesson can ask for a prediction first. */
export const DEFAULT_COMPLEX_RECIPROCAL_MODEL: ComplexReciprocalModel = exampleModel('outside');

/** The model a named example starts from: its operands, the default circle, every reveal hidden. */
export const COMPLEX_RECIPROCAL_EXAMPLE_MODELS: Readonly<Record<ComplexReciprocalExampleId, ComplexReciprocalModel>> = Object.fromEntries(
    COMPLEX_RECIPROCAL_EXAMPLE_IDS.map(id => [id, exampleModel(id)]),
) as Record<ComplexReciprocalExampleId, ComplexReciprocalModel>;

/** The operands z and w, and the inversion circle's centre, of a model. */
export const reciprocalModelPoints = (model: ComplexReciprocalModel): {readonly z: Complex; readonly w: Complex; readonly centre: Complex} =>
    ({z: {re: model.zRe, im: model.zIm}, w: {re: model.wRe, im: model.wIm}, centre: {re: model.centreRe, im: model.centreIm}});

export const RECIPROCAL_COORDINATE_FIELDS = ['zRe', 'zIm', 'wRe', 'wIm', 'centreRe', 'centreIm'] as const;
export const RECIPROCAL_VISIBILITY_FIELDS = ['reciprocalVisible', 'quotientVisible', 'circleVisible'] as const;

/**
 * Returns a sanitized model (unknown properties dropped, grid values written exactly) or undefined unless the data is a valid
 * model. Nothing is clamped: an off-grid or out-of-range value, or a missing field, rejects the whole model.
 */
export function parseComplexReciprocalModel(data: unknown): ComplexReciprocalModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const record = data as Record<string, unknown>;
    if (!isComplexReciprocalExampleId(record.example)) return undefined;
    const coordinates: Record<string, number> = {};
    for (const field of RECIPROCAL_COORDINATE_FIELDS) {
        const value = record[field];
        if (!isComplexCoordinate(value)) return undefined;
        coordinates[field] = snapComplexCoordinate(value);
    }
    const visibility: Record<string, boolean> = {};
    for (const field of RECIPROCAL_VISIBILITY_FIELDS) {
        const value = record[field];
        if (typeof value !== 'boolean') return undefined;
        visibility[field] = value;
    }
    if (!isInversionRadius(record.radius)) return undefined;
    return {
        example: record.example,
        zRe: coordinates.zRe, zIm: coordinates.zIm, wRe: coordinates.wRe, wIm: coordinates.wIm,
        reciprocalVisible: visibility.reciprocalVisible, quotientVisible: visibility.quotientVisible, circleVisible: visibility.circleVisible,
        centreRe: coordinates.centreRe, centreIm: coordinates.centreIm, radius: snapInversionRadius(record.radius),
    };
}
