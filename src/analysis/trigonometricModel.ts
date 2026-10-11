import {
    AMPLITUDE_MAX, AMPLITUDE_MIN, MIDLINE_MAX, MIDLINE_MIN, OMEGA_MAX, OMEGA_MIN, PHASE_MAX, PHASE_MIN, snapPhase, TRIG_FUNCTIONS, TrigFunction,
} from './trigonometric';

/** The stored description of the trigonometric-functions demonstration. */
export interface TrigonometricModel {
    readonly fn: TrigFunction;
    readonly A: number;
    readonly omega: number;
    readonly phi: number;
    readonly B: number;
    readonly reference: boolean;
}

export const DEFAULT_TRIGONOMETRIC_MODEL: TrigonometricModel = {fn: 'sin', A: 1, omega: 1, phi: 0, B: 0, reference: false};

const finiteIn = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export const isTrigFunction = (value: unknown): value is TrigFunction => typeof value === 'string' && (TRIG_FUNCTIONS as readonly string[]).includes(value);
export const isAmplitude = (value: unknown): value is number => finiteIn(value, AMPLITUDE_MIN, AMPLITUDE_MAX);
/** omega must be positive and inside the slider range, which excludes omega = 0 (a constant, with no period). */
export const isOmega = (value: unknown): value is number => finiteIn(value, OMEGA_MIN, OMEGA_MAX);
/** Slider arithmetic starting at -pi can end a few ulps beyond +pi; that noise is accepted. */
export const isPhase = (value: unknown): value is number => finiteIn(value, PHASE_MIN - 1e-9, PHASE_MAX + 1e-9);
export const isMidline = (value: unknown): value is number => finiteIn(value, MIDLINE_MIN, MIDLINE_MAX);

/** Returns a sanitized model (unknown properties dropped; a missing `reference` means hidden) or undefined when the data is not a valid model. */
export function parseTrigonometricModel(data: unknown): TrigonometricModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {fn, A, omega, phi, B, reference} = data as Record<string, unknown>;
    if (!isTrigFunction(fn) || !isAmplitude(A) || !isOmega(omega) || !isPhase(phi) || !isMidline(B)) return undefined;
    if (reference !== undefined && typeof reference !== 'boolean') return undefined;
    return {fn, A, omega, phi: snapPhase(phi), B, reference: reference ?? false};
}
