/**
 * Frieze kernel (spec: isometries-lessons.md "Isometry kernel" item 6, L5; ADR 0047 section 3).
 * Every decision is an exact `Rational` test; no epsilon.
 *
 * Generators, for period `L`: `V: (-x, y)`, `V': (-x + L/2, y)`, `H: (x, -y)`, `R: (-x, -y)`, `G: (x + L/2, -y)`.
 * `friezeClosure` closes a set under composition modulo translation by `L` (each element's `tx` is reduced into `[0, L)`;
 * the identity is always included). It returns `reducesPeriod` when a pure translation (identity linear part) with
 * `tx` not 0 mod `L` appears, since then the true period is shorter than `L`.
 *
 * Feature signature read by `friezeType` from the closed set:
 * - vertical mirror: linear part `diag(-1, 1)`;
 * - horizontal mirror: linear part `diag(1, -1)` with `tx = 0`;
 * - glide: linear part `diag(1, -1)` (H's) with `tx` not 0 mod `L` (in this model that is `tx = L/2`);
 * - half-turn: linear part `diag(-1, -1)`.
 * Signatures map to IUC names: none p1, glide p11g, vertical p1m1, horizontal p11m, half-turn p2,
 * vertical+half-turn+glide p2mg, vertical+horizontal+half-turn p2mm. Any other signature cannot arise from valid
 * closures of the five generators and `friezeType` throws a RangeError for it.
 */
import {Rational, RationalPoint} from '../compgeo/rational';
import {affineMap, apply, compose, identityMap, mapsEqual, type AffineMap2} from './isometry2';

export type FriezeGenerator = 'V' | "V'" | 'H' | 'R' | 'G';
export type FriezeType = 'p1' | 'p11g' | 'p1m1' | 'p11m' | 'p2' | 'p2mg' | 'p2mm';

export const friezeTypes: readonly FriezeType[] = ['p1', 'p11g', 'p1m1', 'p11m', 'p2', 'p2mg', 'p2mm'];

export type FriezeClosure =
    | { readonly kind: 'closed'; readonly elements: readonly AffineMap2[] }
    | { readonly kind: 'reducesPeriod' };

const ZERO = Rational.ZERO;
const ONE = Rational.ONE;
const MINUS_ONE = ONE.neg();
const HALF = Rational.of(1, 2);

function assertPeriod(L: Rational): void {
    if (L.sign() <= 0) throw new RangeError('the period L must be positive');
}

/** `t` reduced into `[0, L)` for `L > 0`. */
function modPeriod(t: Rational, L: Rational): Rational {
    const q = t.div(L);
    let floor = q.num / q.den;
    if (q.num < 0n && q.num % q.den !== 0n) floor -= 1n;
    return t.sub(L.mul(Rational.fromBigInt(floor)));
}

export function friezeGenerator(name: FriezeGenerator, L: Rational): AffineMap2 {
    assertPeriod(L);
    const half = L.mul(HALF);
    switch (name) {
        case 'V':
            return affineMap(MINUS_ONE, ZERO, ZERO, ONE, ZERO, ZERO);
        case "V'":
            return affineMap(MINUS_ONE, ZERO, ZERO, ONE, half, ZERO);
        case 'H':
            return affineMap(ONE, ZERO, ZERO, MINUS_ONE, ZERO, ZERO);
        case 'R':
            return affineMap(MINUS_ONE, ZERO, ZERO, MINUS_ONE, ZERO, ZERO);
        case 'G':
            return affineMap(ONE, ZERO, ZERO, MINUS_ONE, half, ZERO);
        default:
            throw new RangeError('unknown frieze generator');
    }
}

const isPureTranslation = (m: AffineMap2): boolean => m.a.equals(ONE) && m.d.equals(ONE);

export function friezeClosure(generators: readonly FriezeGenerator[], L: Rational): FriezeClosure {
    assertPeriod(L);
    const elements: AffineMap2[] = [identityMap];
    const add = (m: AffineMap2): 'added' | 'known' | 'period' => {
        const reduced = {...m, tx: modPeriod(m.tx, L)};
        if (isPureTranslation(reduced) && !reduced.tx.isZero()) return 'period';
        if (elements.some((e) => mapsEqual(e, reduced))) return 'known';
        elements.push(reduced);
        return 'added';
    };
    for (const g of generators) if (add(friezeGenerator(g, L)) === 'period') return {kind: 'reducesPeriod'};
    for (let i = 0; i < elements.length; i++) {
        for (let j = 0; j <= i; j++) {
            if (add(compose(elements[i], elements[j])) === 'period') return {kind: 'reducesPeriod'};
            if (add(compose(elements[j], elements[i])) === 'period') return {kind: 'reducesPeriod'};
        }
    }
    return {kind: 'closed', elements};
}

export interface FriezeSignature {
    readonly vertical: boolean;
    readonly horizontal: boolean;
    readonly halfTurn: boolean;
    readonly glide: boolean;
}

export function friezeSignature(elements: readonly AffineMap2[]): FriezeSignature {
    let vertical = false, horizontal = false, halfTurn = false, glide = false;
    for (const m of elements) {
        if (m.a.equals(MINUS_ONE) && m.d.equals(ONE)) vertical = true;
        else if (m.a.equals(MINUS_ONE) && m.d.equals(MINUS_ONE)) halfTurn = true;
        else if (m.a.equals(ONE) && m.d.equals(MINUS_ONE)) {
            if (m.tx.isZero()) horizontal = true;
            else glide = true;
        }
    }
    return {vertical, horizontal, halfTurn, glide};
}

export function friezeType(elements: readonly AffineMap2[]): FriezeType {
    const {vertical: v, horizontal: h, halfTurn: r, glide: g} = friezeSignature(elements);
    if (!v && !h && !r && !g) return 'p1';
    if (!v && !h && !r && g) return 'p11g';
    if (v && !h && !r && !g) return 'p1m1';
    if (!v && h && !r && !g) return 'p11m';
    if (!v && !h && r && !g) return 'p2';
    if (v && !h && r && g) return 'p2mg';
    if (v && h && r && !g) return 'p2mm';
    throw new RangeError('this feature signature is not a frieze type of the model');
}

/** A representative generator set for each type (mirrors at 0). */
export const friezeRepresentative: Readonly<Record<FriezeType, readonly FriezeGenerator[]>> = {
    p1: [],
    p11g: ['G'],
    p1m1: ['V'],
    p11m: ['H'],
    p2: ['R'],
    p2mg: ['V', 'G'],
    p2mm: ['V', 'H'],
};

export interface FriezeCopy {
    readonly point: RationalPoint;
    /** Index of the closure element (0 is the identity). */
    readonly element: number;
    /** Period index `k`: the copy is the element's image shifted by `k L`. */
    readonly period: number;
}

/**
 * Images of the motif point under the type's representative closure, shifted by `k L` for the integer periods
 * `from <= k < to`. Each period holds `size` copies (1, 2 or 4); a generic motif gives no duplicates.
 * A copy's image may land outside `[kL, (k+1)L)` (mirror images cross the period strip), so consumers clip by the window.
 */
export function friezeCopies(
    type: FriezeType,
    motif: RationalPoint,
    L: Rational,
    range: { readonly from: number; readonly to: number },
): FriezeCopy[] {
    if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.to < range.from) {
        throw new RangeError('range must be integers with from <= to');
    }
    const closure = friezeClosure(friezeRepresentative[type], L);
    if (closure.kind !== 'closed') throw new RangeError('a representative set cannot reduce the period');
    const copies: FriezeCopy[] = [];
    for (let k = range.from; k < range.to; k++) {
        const shift = L.mul(Rational.fromInt(k));
        closure.elements.forEach((m, element) => {
            const p = apply(m, motif);
            copies.push({point: new RationalPoint(p.x.add(shift), p.y), element, period: k});
        });
    }
    return copies;
}
