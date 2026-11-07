/**
 * Compile-time fixtures for the typed conic contracts (runtime-contracts task 5, C1). They are checked by
 * `just typecheck` (tsconfig includes `src`); an unused `@ts-expect-error` fails compilation, which proves the
 * invalid shape is rejected. Nothing here runs.
 */
import {conicMetrics} from './conic';
import type {Conic as FocalConic} from './conic';
import type {FivePointResult} from '../projective/conic';

// Negative: a circle needs its radius.
// @ts-expect-error circle without radius
export const circleWithoutRadius: FocalConic = {kind: 'circle', epsilon: 0, focus: {x: 0, y: 0}};

// Negative: a non-circle needs its directrix and focus-directrix distance.
// @ts-expect-error parabola without directrix
export const parabolaWithoutDirectrix: FocalConic = {kind: 'parabola', epsilon: 1, focus: {x: 0, y: 0}, focusDirectrixDistance: 1};

// Negative: a unique five-point result needs its conic and type.
// @ts-expect-error unique without conic
export const uniqueWithoutConic: FivePointResult = {status: 'unique', cofactors: [0n, 0n, 0n, 0n, 0n, 0n]};

// Positive: narrowing yields the required fields without assertions.
export function narrowFocal(c: FocalConic): number {
    if (c.kind === 'circle') return c.radius;
    return c.directrix.d + c.focusDirectrixDistance;
}

export function narrowMetrics(c: FocalConic): number {
    if (c.kind === 'parabola') return 0;
    const {a, centre} = conicMetrics(c);
    return a + centre.x;
}

export function narrowFivePoint(r: FivePointResult): bigint {
    if (r.status === 'unique') return r.conic[0] + BigInt(r.type.length);
    if (r.status === 'line-pair') return r.conic[0] + BigInt(r.type.length);
    return r.cofactors[0];
}
