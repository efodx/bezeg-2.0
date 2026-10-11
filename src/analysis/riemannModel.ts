import {FunctionId, isFunctionId} from './functions';
import {isBound, isSubintervalCount, isSumMethod, SumMethod} from './riemann';

/** The stored description of the definite-integral demonstration. */
export interface RiemannModel {
    readonly fn: FunctionId;
    readonly a: number;
    readonly b: number;
    readonly n: number;
    readonly method: SumMethod;
}

export const DEFAULT_RIEMANN_MODEL: RiemannModel = {fn: 'square', a: 0, b: 2, n: 4, method: 'left'};

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseRiemannModel(data: unknown): RiemannModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {fn, a, b, n, method} = data as Record<string, unknown>;
    if (!isFunctionId(fn) || !isBound(a) || !isBound(b) || !isSubintervalCount(n) || !isSumMethod(method)) return undefined;
    return {fn, a, b, n, method};
}
