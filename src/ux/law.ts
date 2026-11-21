/**
 * Prototype c30 "Odkrij zakon" (Kepler fitting Tycho's tables, a physics lab's curve fit, Desmos regression). After
 * a c24 sweep the dependency is fitted with the simplest law that explains it — proportional, linear, a power, a
 * quadratic, an inverse — and the constants are named exactly where they are nice (8, 3π, 1/3, √2). The student
 * sees not only that the arc length grows with R, but that it is 8·R.
 */

export interface Law { text: string; exact: boolean; r2: number }

const SUP: Record<string, string> = {'2': '²', '3': '³', '4': '⁴', '5': '⁵', '-': '⁻', '1': '¹'};

/** A constant written exactly when it is close to an integer, a small fraction, a multiple of π or a square root. */
export function niceConstant(value: number, tolerance = 5e-4): string | undefined {
    const sign = value < 0 ? '−' : '';
    const v = Math.abs(value);
    if (v < 1e-12) return '0';
    // Few denominators and a tight tolerance: a fitted 6,39 must not turn into 77/12.
    const near = (target: number) => Math.abs(v - target) <= tolerance * Math.max(1, v);
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    for (let q = 1; q <= 6; q++) {
        const p = Math.round(v * q);
        if (p > 0 && near(p / q)) { const g = gcd(p, q); return `${sign}${p / g}${q / g === 1 ? '' : `/${q / g}`}`; }
    }
    for (let q = 1; q <= 4; q++) {
        const p = Math.round(v / Math.PI * q);
        if (p > 0 && near(p * Math.PI / q)) { const g = gcd(p, q); return `${sign}${p / g === 1 ? '' : p / g}π${q / g === 1 ? '' : `/${q / g}`}`; }
    }
    const square = Math.round(v * v);
    if (square > 1 && square <= 50 && near(Math.sqrt(square)) && !Number.isInteger(Math.sqrt(square))) return `${sign}√${square}`;
    return undefined;
}

function solve(a: number[][], b: number[]): number[] | undefined {
    const n = b.length;
    const m = a.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
        let pivot = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
        if (Math.abs(m[pivot][c]) < 1e-14) return undefined;
        [m[c], m[pivot]] = [m[pivot], m[c]];
        for (let r = 0; r < n; r++) {
            if (r === c) continue;
            const f = m[r][c] / m[c][c];
            for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
        }
    }
    return m.map((row, i) => row[n] / m[i][i]);
}

/** Least squares over basis functions; returns the coefficients. */
function fit(xs: number[], ys: number[], basis: ((x: number) => number)[]): number[] | undefined {
    const k = basis.length;
    const ata = Array.from({length: k}, () => Array(k).fill(0) as number[]);
    const aty = Array(k).fill(0) as number[];
    xs.forEach((x, i) => {
        const row = basis.map(f => f(x));
        for (let a = 0; a < k; a++) {
            aty[a] += row[a] * ys[i];
            for (let b = 0; b < k; b++) ata[a][b] += row[a] * row[b];
        }
    });
    return solve(ata, aty);
}

function r2(xs: number[], ys: number[], model: (x: number) => number): number {
    const mean = ys.reduce((s, y) => s + y, 0) / ys.length;
    let res = 0, tot = 0;
    xs.forEach((x, i) => { res += (ys[i] - model(x)) ** 2; tot += (ys[i] - mean) ** 2; });
    return tot < 1e-18 ? 1 : 1 - res / tot;
}

const coefficient = (value: number, digits: (v: number) => string) => {
    const nice = niceConstant(value);
    return {text: nice ?? digits(value), exact: nice !== undefined};
};

/** The simplest law that explains y(x), or undefined when none fits well. */
export function discoverLaw(xsIn: number[], ysIn: number[], y: string, x: string, digits: (v: number) => string): Law | undefined {
    const xs: number[] = [], ys: number[] = [];
    xsIn.forEach((v, i) => { if (Number.isFinite(v) && Number.isFinite(ysIn[i])) { xs.push(v); ys.push(ysIn[i]); } });
    // Keep distinct x only (stepped sliders repeat values).
    if (new Set(xs).size < 5) return undefined;
    const scale = Math.max(...ys.map(Math.abs), 1e-12);
    const small = (v: number) => Math.abs(v) <= 2e-3 * scale;
    const term = (c: {text: string}, power: string) => `${c.text === '1' ? '' : c.text === '−1' ? '−' : `${c.text}·`}${power}`;
    const join = (parts: string[]) => parts.filter(Boolean).join(' + ').replace(/\+ −/g, '− ');
    const candidates: (() => Law | undefined)[] = [
        () => { // proportional and linear
            const c = fit(xs, ys, [v => v, () => 1]);
            if (!c) return undefined;
            const [a, b] = c;
            if (small(a * (Math.max(...xs) - Math.min(...xs)))) return undefined;
            const q = r2(xs, ys, v => a * v + b);
            if (q < 0.9999) return undefined;
            const ca = coefficient(a, digits), cb = coefficient(b, digits);
            return {text: `${y} = ${join([term(ca, x), small(b) ? '' : cb.text])}`, exact: ca.exact && (small(b) || cb.exact), r2: q};
        },
        () => { // power with a nice exponent
            if (!xs.every(v => v > 0) || !(ys.every(v => v > 0) || ys.every(v => v < 0))) return undefined;
            const s = ys[0] < 0 ? -1 : 1;
            const c = fit(xs.map(Math.log), ys.map(v => Math.log(s * v)), [v => v, () => 1]);
            if (!c) return undefined;
            const k = Math.round(c[0] * 2) / 2;
            if (Math.abs(c[0] - k) > 0.04 || k === 0 || k === 1) return undefined;
            const a = s * xs.reduce((sum, v, i) => sum + s * ys[i] * v ** k, 0) / xs.reduce((sum, v) => sum + v ** (2 * k), 0);
            const q = r2(xs, ys, v => a * v ** k);
            if (q < 0.9995) return undefined;
            const ca = coefficient(a, digits);
            const power = k === 0.5 ? `√${x}` : k === -1 ? `/${x}` : Number.isInteger(k) ? `${x}${String(k).split('').map(ch => SUP[ch] ?? ch).join('')}` : `${x}^${String(k).replace('.', ',')}`;
            return {text: k === -1 ? `${y} = ${ca.text}${power}` : `${y} = ${term(ca, power)}`, exact: ca.exact, r2: q};
        },
        // Polynomials of degree 2 and 3 (an area under x² as a function of its bound is b³/3).
        ...[2, 3].map(degree => () => {
            const powers = Array.from({length: degree + 1}, (_, i) => degree - i);
            const c = fit(xs, ys, powers.map(p => (v: number) => v ** p));
            if (!c) return undefined;
            const q = r2(xs, ys, v => powers.reduce((sum, p, i) => sum + c[i] * v ** p, 0));
            const reach = Math.max(...xs.map(Math.abs));
            if (q < 0.9999 || small(c[0] * reach ** degree)) return undefined;
            const parts = powers.map((p, i) => {
                if (small(c[i] * reach ** p)) return '';
                const k = coefficient(c[i], digits);
                return p === 0 ? k.text : term(k, p === 1 ? x : `${x}${SUP[String(p)]}`);
            });
            const exact = powers.every((p, i) => small(c[i] * reach ** p) || niceConstant(c[i]) !== undefined);
            return {text: `${y} = ${join(parts)}`, exact, r2: q};
        }),
        // A quantity approaching a limit: b + a/x (+ c/x²), as a Riemann sum approaches its integral.
        ...[1, 2].map(order => () => {
            if (xs.some(v => Math.abs(v) < 1e-9) || Math.min(...xs.map(Math.abs)) * 4 > Math.max(...xs.map(Math.abs))) return undefined;
            const basis = [() => 1, (v: number) => 1 / v, (v: number) => 1 / (v * v)].slice(0, order + 1);
            const c = fit(xs, ys, basis);
            if (!c) return undefined;
            const q = r2(xs, ys, v => basis.reduce((sum, f, i) => sum + c[i] * f(v), 0));
            if (q < 0.9995) return undefined;
            const parts = c.map((value, i) => {
                const k = coefficient(value, digits);
                if (i === 0) return k.text;
                const [num, den] = k.text.split('/');
                return den ? `${num}/(${den}${x}${i === 2 ? '²' : ''})` : `${num}/${x}${i === 2 ? '²' : ''}`;
            });
            return {text: `${y} = ${join(parts)}<br><small>ko ${x} → ∞, gre proti ${coefficient(c[0], digits).text}</small>`, exact: c.every(value => niceConstant(value) !== undefined), r2: q};
        }),
    ];
    for (const candidate of candidates) {
        const law = candidate();
        if (law) return law;
    }
    return undefined;
}
