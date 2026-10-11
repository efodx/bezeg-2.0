/**
 * The shared catalog of fixed function choices used by the calculus demonstrations (derivative, definite integral):
 * each entry carries the exact derivative and an exact antiderivative. Pure mathematics: no React, JSXGraph or
 * localization imports. There is no formula parser; the choices are a closed list (see ADR 0007).
 */

export const FUNCTION_IDS = ['square', 'sin', 'exp'] as const;
export type FunctionId = typeof FUNCTION_IDS[number];

export interface CatalogFunction {
    readonly id: FunctionId;
    /** f(x). */
    readonly value: (x: number) => number;
    /** The exact derivative f'(x). */
    readonly derivative: (x: number) => number;
    /** An exact antiderivative F(x) with F' = f (the constant is fixed as written in `antiderivativeLatex`). */
    readonly antiderivative: (x: number) => number;
    /** Undelimited LaTeX of f, f' and F. */
    readonly latex: string;
    readonly derivativeLatex: string;
    readonly antiderivativeLatex: string;
    /** Plain-text forms for board texts and select options. */
    readonly plain: string;
    readonly derivativePlain: string;
    readonly antiderivativePlain: string;
}

export const FUNCTION_CATALOG: Readonly<Record<FunctionId, CatalogFunction>> = {
    square: {
        id: 'square',
        value: x => x * x,
        derivative: x => 2 * x,
        antiderivative: x => x * x * x / 3,
        latex: 'x^{2}',
        derivativeLatex: '2x',
        antiderivativeLatex: '\\frac{x^{3}}{3}',
        plain: 'x²',
        derivativePlain: '2x',
        antiderivativePlain: 'x³/3',
    },
    sin: {
        id: 'sin',
        value: x => Math.sin(x),
        derivative: x => Math.cos(x),
        antiderivative: x => -Math.cos(x),
        latex: '\\sin x',
        derivativeLatex: '\\cos x',
        antiderivativeLatex: '-\\cos x',
        plain: 'sin x',
        derivativePlain: 'cos x',
        antiderivativePlain: '−cos x',
    },
    exp: {
        id: 'exp',
        value: x => Math.exp(x),
        derivative: x => Math.exp(x),
        antiderivative: x => Math.exp(x),
        latex: 'e^{x}',
        derivativeLatex: 'e^{x}',
        antiderivativeLatex: 'e^{x}',
        plain: 'eˣ',
        derivativePlain: 'eˣ',
        antiderivativePlain: 'eˣ',
    },
};

export const isFunctionId = (value: unknown): value is FunctionId =>
    typeof value === 'string' && (FUNCTION_IDS as readonly string[]).includes(value);

export const catalogFunction = (id: FunctionId): CatalogFunction => FUNCTION_CATALOG[id];
