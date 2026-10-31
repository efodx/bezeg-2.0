/**
 * Analytic plane-curve derivative sources (r, r', r'') for the fixed parametric/polar catalogue.
 * Pure functions on plain numbers; see curvature.ts for the DerivativeSource contract.
 */
import type {DerivativeSource, DerivativeTuple} from "./curvature";

/** Cartesian r, r', r'' of the polar curve rho(theta), from rho, rho' and rho'' at theta. */
export function polarDerivatives(rho: number, rho1: number, rho2: number, theta: number): DerivativeTuple {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return {
        point: [rho * c, rho * s],
        d1: [rho1 * c - rho * s, rho1 * s + rho * c],
        d2: [rho2 * c - 2 * rho1 * s - rho * c, rho2 * s + 2 * rho1 * c - rho * s],
    };
}

/** Polar source from [rho, rho', rho''] as a function of theta. */
export function polarSource(rho: (theta: number) => [number, number, number], scale = 1): DerivativeSource {
    return {
        scale,
        at(theta) {
            const [r, r1, r2] = rho(theta);
            return polarDerivatives(r, r1, r2, theta);
        },
    };
}

/** Cycloid of rolling radius R: (R(t - sin t), R(1 - cos t)). */
export function cycloidSource(radius = 1): DerivativeSource {
    return {
        scale: radius,
        at(t) {
            return {
                point: [radius * (t - Math.sin(t)), radius * (1 - Math.cos(t))],
                d1: [radius * (1 - Math.cos(t)), radius * Math.sin(t)],
                d2: [radius * Math.sin(t), radius * Math.cos(t)],
            };
        },
    };
}

/** Cardioid rho = 1 + cos(theta). */
export function cardioidSource(): DerivativeSource {
    return polarSource(th => [1 + Math.cos(th), -Math.sin(th), -Math.cos(th)], 2);
}

/** Rose rho = cos(k theta). */
export function roseSource(k: number): DerivativeSource {
    return polarSource(th => [Math.cos(k * th), -k * Math.sin(k * th), -k * k * Math.cos(k * th)], 1);
}

/** Archimedean spiral rho = a theta. */
export function archimedeanSpiralSource(a = 1, scale = 1): DerivativeSource {
    return polarSource(th => [a * th, a, 0], scale);
}

/** Parabola y = x^2 parametrized by x. */
export function parabolaSource(): DerivativeSource {
    return {
        scale: 1,
        at(x) {
            return {point: [x, x * x], d1: [1, 2 * x], d2: [0, 2]};
        },
    };
}
