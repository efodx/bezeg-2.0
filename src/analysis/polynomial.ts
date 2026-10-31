/**
 * Polynomials in product form k * prod (x - z_i)^m_i (school function graphs, concept S3). The product form is never
 * expanded for evaluation; derivatives use the product rule on a list of product terms. Coefficients are expanded
 * only by `polyCoefficients`, for the division helper of rational functions. Pure mathematics, no UI imports.
 */
import type {PolySpec} from './schoolFunctions';

export const MAX_POLY_DEGREE = 5;
export const MAX_MULTIPLICITY = 3;

type ZeroEntry = PolySpec['zeros'][number];

export interface MergeResult {
    readonly spec: PolySpec;
    /** True when two or more zeros were equal and their multiplicities were added. */
    readonly merged: boolean;
}

/** Zeros sorted increasingly; equal zeros merged with summed multiplicity (the result reports the merge). */
export const mergeZeros = (spec: PolySpec): MergeResult => {
    const sorted = [...spec.zeros].sort((p, q) => p.z - q.z);
    const out: {z: number; m: number}[] = [];
    let merged = false;
    for (const e of sorted) {
        const last = out[out.length - 1];
        if (last && last.z === e.z) {
            last.m += e.m;
            if (last.m > MAX_MULTIPLICITY) throw new RangeError(`merged multiplicity ${last.m} at z = ${e.z} exceeds ${MAX_MULTIPLICITY}; validate the spec first`);
            merged = true;
        } else {
            out.push({z: e.z, m: e.m});
        }
    }
    // Every merged multiplicity is at most MAX_MULTIPLICITY (checked above), so the entries are valid ZeroEntry values.
    return {spec: {k: spec.k, zeros: out as unknown as readonly ZeroEntry[]}, merged};
};

export const polyDegree = (spec: PolySpec): number => spec.zeros.reduce((s, e) => s + e.m, 0);

/** p(x) from the product form. */
export const polyValue = (spec: PolySpec, x: number): number => {
    let v = spec.k;
    for (const e of spec.zeros) v *= Math.pow(x - e.z, e.m);
    return v;
};

/** A product term c * prod (x - z)^e (exponents >= 1). */
interface Term {readonly c: number; readonly f: readonly {readonly z: number; readonly e: number}[]}

const termsOf = (spec: PolySpec): Term[] => [{c: spec.k, f: spec.zeros.map(e => ({z: e.z, e: e.m}))}];

/** Product rule: d/dx of each term, one new term per factor. */
const differentiate = (terms: readonly Term[]): Term[] => {
    const out: Term[] = [];
    for (const t of terms) {
        t.f.forEach((fac, i) => {
            const f = t.f.map((g, j) => j === i ? {z: g.z, e: g.e - 1} : g).filter(g => g.e > 0);
            out.push({c: t.c * fac.e, f});
        });
    }
    return out;
};

const derivativeTerms = (spec: PolySpec, order: number): Term[] => {
    let terms = termsOf(spec);
    for (let i = 0; i < order; i++) terms = differentiate(terms);
    return terms;
};

const evalTerms = (terms: readonly Term[], x: number): number => {
    let sum = 0;
    for (const t of terms) {
        let v = t.c;
        for (const g of t.f) v *= Math.pow(x - g.z, g.e);
        sum += v;
    }
    return sum;
};

/** The n-th derivative p^(n)(x) by repeated product rule (n = 0 is the value). */
export const polyDerivativeValue = (spec: PolySpec, x: number, order = 1): number => evalTerms(derivativeTerms(spec, order), x);

/** y-intercept k * prod (-z_i)^m_i. */
export const polyYIntercept = (spec: PolySpec): number => {
    let v = spec.k;
    for (const e of spec.zeros) v *= Math.pow(-e.z, e.m);
    return v;
};

/** The graph crosses the x axis at a zero exactly when its multiplicity is odd. */
export const crossesAtZero = (m: number): boolean => m % 2 === 1;

/** Sign of p just left and right of each zero (+1 or -1), for the sign-change check. */
export const signAround = (spec: PolySpec, z: number): {readonly left: number; readonly right: number} => {
    const h = 1e-6;
    return {left: Math.sign(polyValue(spec, z - h)), right: Math.sign(polyValue(spec, z + h))};
};

/** Expanded ascending coefficients [c0, c1, ...]; used for polynomial division only, never for evaluation. */
export const polyCoefficients = (spec: PolySpec): number[] => {
    let coef = [spec.k];
    for (const e of spec.zeros) {
        for (let i = 0; i < e.m; i++) {
            const next = new Array<number>(coef.length + 1).fill(0);
            coef.forEach((c, d) => {
                next[d + 1] += c;
                next[d] -= c * e.z;
            });
            coef = next;
        }
    }
    return coef;
};

/** Long division of ascending coefficient lists; the divisor's leading coefficient must be non-zero. */
export const dividePolynomials = (num: readonly number[], den: readonly number[]): {readonly quotient: number[]; readonly remainder: number[]} => {
    const rem = [...num];
    const dd = den.length - 1;
    const lead = den[dd];
    const qLen = Math.max(0, num.length - dd);
    const quotient = new Array<number>(qLen).fill(0);
    for (let d = num.length - 1; d >= dd; d--) {
        const q = rem[d] / lead;
        quotient[d - dd] = q;
        for (let j = 0; j <= dd; j++) rem[d - dd + j] -= q * den[j];
        rem[d] = 0;
    }
    return {quotient, remainder: rem.slice(0, Math.max(1, dd))};
};

export const evalCoefficients = (coef: readonly number[], x: number): number => coef.reduceRight((s, c) => s * x + c, 0);

// ---------------------------------------------------------------------------------------------------------------
// Text

const fmt = (n: number): string => String(Number(n.toFixed(6)));
const SUP: Record<number, string> = {2: '²', 3: '³', 4: '⁴', 5: '⁵'};

/** The argument substituted for x: `text` is the expression, `atomic` tells whether it is just `x`. */
export interface PolyArg {readonly text: string; readonly atomic: boolean}

const factorText = (z: number, e: number, a: PolyArg, plain: boolean): string => {
    const open = plain || a.atomic ? '(' : '\\left(';
    const close = plain || a.atomic ? ')' : '\\right)';
    const base = z === 0 ? (a.atomic ? a.text : `${open}${a.text}${close}`)
        : `${open}${a.text} ${z > 0 ? '-' : '+'} ${fmt(Math.abs(z))}${close}`;
    if (e === 1) return base;
    return plain ? `${base}${SUP[e]}` : `${base}^{${e}}`;
};

const termText = (t: Term, a: PolyArg, plain: boolean): string => {
    const body = t.f.map(g => factorText(g.z, g.e, a, plain)).join('');
    if (body === '') return fmt(t.c);
    if (t.c === 1) return body;
    if (t.c === -1) return `${plain ? '−' : '-'}${body}`;
    return `${fmt(t.c)}${plain ? '·' : '\\,'}${body}`;
};

const sumText = (terms: readonly Term[], a: PolyArg, plain: boolean): string => {
    if (terms.length === 0) return '0';
    return terms.map((t, i) => {
        const txt = termText(t, a, plain);
        if (i === 0) return txt;
        return txt.startsWith('-') || txt.startsWith('−') ? ` ${plain ? '−' : '-'} ${txt.slice(1)}` : ` + ${txt}`;
    }).join('');
};

/** Product-form text of p with the argument substituted for x (LaTeX when `plain` is false). */
export const polyText = (spec: PolySpec, a: PolyArg, plain: boolean): string => sumText(termsOf(spec), a, plain);

/** Product-rule text of p' (a sum of product terms; a single term for one zero). */
export const polyDerivativeText = (spec: PolySpec, a: PolyArg, plain: boolean): string =>
    sumText(derivativeTerms(spec, 1), a, plain);
