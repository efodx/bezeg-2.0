import {FunctionId, isFunctionId} from './functions';
import {isStep, isX0} from './derivative';

/** The stored description of the derivative demonstration. */
export interface DerivativeModel {
    readonly fn: FunctionId;
    readonly x0: number;
    readonly h: number;
    readonly tangent: boolean;
}

export const DEFAULT_DERIVATIVE_MODEL: DerivativeModel = {fn: 'square', x0: 1, h: 1, tangent: false};

/** Returns a sanitized model (unknown properties dropped; a missing `tangent` means hidden) or undefined when the data is not a valid model. */
export function parseDerivativeModel(data: unknown): DerivativeModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {fn, x0, h, tangent} = data as Record<string, unknown>;
    if (!isFunctionId(fn) || !isX0(x0) || !isStep(h)) return undefined;
    if (tangent !== undefined && typeof tangent !== 'boolean') return undefined;
    return {fn, x0, h, tangent: tangent ?? false};
}
