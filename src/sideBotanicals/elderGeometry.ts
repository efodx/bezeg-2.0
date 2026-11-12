// Deterministic elder-branch artwork, a one-to-one port of the owner's playground (bezeg-side-botanicals-mockup).
// Pure geometry: no React, no DOM. Paint order and colours follow the playground.

export interface ElderSettings {
    left: number;
    right: number;
    top: number;
    bottom: number;
    reach: number;
    size: number;
    thick: number;
    heads: number;
    headSize: number;
    leaves: number;
    leafSize: number;
    opacity: number;
    fade: number;
    amp: number;
    speed: number;
    seed: number;
}

/** Playground defaults; drop the owner's tuned values in here. */
export const ELDER_SETTINGS: ElderSettings = {
    left: 4, right: 4, top: 15, bottom: 100, reach: 75, size: 2.2, thick: 2.5, heads: 5, headSize: 1.3,
    leaves: 3, leafSize: 1.05, opacity: 1, fade: .65, amp: 2.3, speed: 10, seed: 3,
};

/** Head sway angle relative to the branch angle. */
export const HEAD_AMP_FACTOR = 2.2;

export interface ElderPath {fill: string; d: string}
/** A flower head (twig, rays, florets) that bobs around its twig base on top of the branch sway. */
export interface ElderHead {baseX: number; baseY: number; duration: number; delay: number; paths: ElderPath[]}
export interface ElderBranch {hingeY: number; duration: number; delay: number; paths: ElderPath[]; heads: ElderHead[]}
export type ElderSide = 'left' | 'right';

type V = [number, number];
type Rng = () => number;

const C = {stem: '#b4b79e', leafFront: '#c3ccad', leafBack: '#dce2cc', floret: '#fffdf4', floretShade: '#e9e1c6', eye: '#dcc27a', ray: '#c2c4ab'};
type Kind = keyof typeof C;
const ORDER: Kind[] = ['stem', 'leafBack', 'leafFront', 'ray', 'floretShade', 'floret', 'eye'];

const r = (v: number): number => Math.round(v * 10) / 10;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s];
const norm = (a: V): V => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const perp = (a: V): V => [-a[1], a[0]];
const rot = (a: V, deg: number): V => {
    const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
    return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};
const P = (p: V): string => `${r(p[0])} ${r(p[1])}`;

/** Park-Miller generator, the same sequence as the playground's module seed. */
export function createRng(initialSeed: number): Rng {
    let seed = initialSeed;
    return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}

function bez(p: V[]) {
    const at = (t: number): V => {
        const u = 1 - t;
        return [0, 1].map((i) => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]) as V;
    };
    const tan = (t: number): V => {
        const u = 1 - t;
        return norm([0, 1].map((i) => 3 * u * u * (p[1][i] - p[0][i]) + 6 * u * t * (p[2][i] - p[1][i]) + 3 * t * t * (p[3][i] - p[2][i])) as V);
    };
    return {at, tan};
}

function taper(p: V[], w0: number, w1: number, n = 28): string {
    const b = bez(p), L: V[] = [], R: V[] = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n, c = b.at(t), nn = perp(b.tan(t)), w = (w0 + (w1 - w0) * Math.pow(t, .8)) / 2;
        L.push(add(c, mul(nn, w)));
        R.push(add(c, mul(nn, -w)));
    }
    const end = b.at(1);
    return `M${L.map(P).join('L')}Q${P(add(end, mul(b.tan(1), w1)))} ${P(R[n])}L${R.reverse().map(P).join('L')}Z`;
}

function leaflet(base: V, dir: V, len: number, wid: number): string {
    const d = norm(dir), n = perp(d), tip = add(base, mul(d, len));
    const a1 = add(add(base, mul(d, len * .18)), mul(n, wid * 1.1)), a2 = add(add(base, mul(d, len * .7)), mul(n, wid * .7));
    const b1 = add(add(base, mul(d, len * .7)), mul(n, -wid * .7)), b2 = add(add(base, mul(d, len * .18)), mul(n, -wid * 1.1));
    return `M${P(base)}C${P(a1)} ${P(a2)} ${P(tip)}C${P(b1)} ${P(b2)} ${P(base)}Z`;
}

function pinnate(base: V, dir: V, len: number, pairs: number, droop: number): string {
    const d = norm(dir);
    const end = add(add(base, mul(d, len)), [0, droop * len]);
    const ctrl = add(base, mul(d, len * .55));
    const q = (u: number): V => add(add(mul(base, (1 - u) * (1 - u)), mul(ctrl, 2 * u * (1 - u))), mul(end, u * u));
    const qt = (u: number): V => norm(add(mul(sub(ctrl, base), 2 * (1 - u)), mul(sub(end, ctrl), 2 * u)));
    let d1 = taper([base, add(base, mul(sub(ctrl, base), .66)), add(end, mul(sub(ctrl, end), .66)), end], 2.4, .8, 10);
    const ll = len * .42;
    for (let i = 0; i < pairs; i++) {
        const u = .28 + i * (.62 / pairs), p = q(u), tg = qt(u), nn = perp(tg);
        for (const s of [1, -1]) d1 += leaflet(p, norm(add(mul(tg, .75), mul(nn, s))), ll * (.9 + i * .06), ll * .19);
    }
    return d1 + leaflet(end, qt(1), ll * 1.05, ll * .2);
}

const circ = (c: V, rad: number): string =>
    `M${r(c[0] - rad)} ${r(c[1])}a${r(rad)} ${r(rad)} 0 1 0 ${r(rad * 2)} 0a${r(rad)} ${r(rad)} 0 1 0 ${r(-rad * 2)} 0`;

function head(rnd: Rng, node: V, axis: V, width: number, s: number) {
    const jit = (j: number) => (rnd() - .5) * 2 * j;
    const up = norm(axis), side = perp(up).map((v) => -v) as V;
    const depth = width * .26, subs = 7 + Math.floor(rnd() * 3);
    let rays = '', shade = '', petals = '', eyes = '';
    const centres: {c: V; back: number}[] = [];
    for (let i = 0; i < subs; i++) {
        const a = i === subs - 1 ? null : (i / (subs - 1)) * Math.PI * 2 + jit(.2);
        const x = a === null ? 0 : Math.cos(a) * width * .34, lift = a === null ? 0 : Math.sin(a) * width * .13;
        centres.push({c: add(add(node, mul(side, x + jit(width * .02))), mul(up, depth + lift + (a === null ? width * .03 : 0))), back: lift > 0 ? 1 : 0});
    }
    centres.sort((a, b) => b.back - a.back);
    for (const {c, back} of centres) {
        rays += taper([node, add(node, mul(up, depth * .3)), add(node, mul(sub(c, node), .45)), c], 1.8 * s, .9 * s, 8);
        const n = 16 + Math.floor(rnd() * 8), rx = width * .14, ry = width * .1;
        for (let k = 0; k < n; k++) {
            const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
            const p = add(add(c, mul(side, Math.cos(a) * rx * rr)), mul(up, Math.abs(Math.sin(a)) * ry * rr + ry * .3));
            const f = 1.35 * s * (back ? .88 : 1) * (.9 + rnd() * .25), turn = rnd() * 72;
            shade += circ(add(p, mul(up, -1.2 * f)), 3.6 * f);
            for (let q = 0; q < 5; q++) petals += circ(add(p, rot(mul(up, 2.3 * f), turn + q * 72)), 1.75 * f);
            eyes += circ(p, .55 * f);
        }
    }
    return {rays, shade, petals, eyes};
}

function branch(entryY: number, reach: number, pr: ElderSettings, bseed: number, idx: number): ElderBranch {
    const rnd = createRng(bseed);
    const jit = (s: number) => (rnd() - .5) * 2 * s;
    const S = pr.size, els: [Kind, string][] = [];
    const rise = reach * (.25 + rnd() * .3) * (rnd() < .25 ? -.4 : 1);
    const limb: V[] = [[-10, entryY], [reach * .35, entryY + jit(reach * .08)], [reach * .65, entryY - rise * .7], [reach, entryY - rise]];
    const b = bez(limb), w = 9 * S * pr.thick;
    els.push(['stem', taper(limb, w, 2.2 * pr.thick)]);
    for (let i = 0; i < pr.leaves; i++) {
        const at = (i + .5) / pr.leaves * .9 + jit(.03), p = b.at(at), tg = b.tan(at), nn = perp(tg);
        const len = 160 * S * pr.leafSize * (1 - at * .35);
        els.push(['leafBack', pinnate(p, norm(add(mul(tg, .5), mul(nn, -1))), len * .9, at > .7 ? 2 : 3, -.08)]);
        els.push(['leafFront', pinnate(p, norm(add(mul(tg, .5), mul(nn, 1))), len, at > .7 ? 2 : 3, .14)]);
    }
    const heads: ElderHead[] = [];
    for (let i = 0; i < pr.heads; i++) {
        const last = i === pr.heads - 1;
        const at = last ? 1 : .3 + (i / Math.max(1, pr.heads - 1)) * .62 + jit(.04);
        const p = b.at(at), tg = b.tan(at);
        const angle = last ? -15 + jit(10) : -(35 + rnd() * 25);
        const len = (last ? 60 : 90 + rnd() * 40) * S;
        const dir = rot(tg, angle), end = add(p, mul(dir, len));
        const twig = taper([p, add(p, mul(rot(tg, angle * .5), len * .4)), add(end, mul(dir, -len * .35)), end], Math.max(2.4, w * (1 - at) * .55), 1.6, 14);
        const hd = head(rnd, end, rot(norm(add(mul(dir, .35), [0, -1])), jit(14)), (115 + rnd() * 40) * S * pr.headSize, S * Math.sqrt(pr.headSize));
        // Per-head motion is derived from indices, not the rng, so the layout stays that of the playground.
        const key = idx * 7 + i;
        const parts: [Kind, string][] = [['stem', twig], ['ray', hd.rays], ['floretShade', hd.shade], ['floret', hd.petals], ['eye', hd.eyes]];
        heads.push({
            baseX: r(p[0]), baseY: r(p[1]),
            duration: r(pr.speed * (.35 + ((key * 29) % 10) / 50)),
            delay: -((key * 41) % 60) / 10,
            paths: parts.map(([k, d]) => ({fill: C[k], d})),
        });
    }
    els.sort((a, c) => ORDER.indexOf(a[0]) - ORDER.indexOf(c[0]));
    return {
        hingeY: r(entryY),
        duration: r(pr.speed * (.85 + ((idx * 37) % 10) / 25)),
        delay: -((idx * 53) % 70) / 10,
        paths: els.map(([k, d]) => ({fill: C[k], d})),
        heads,
    };
}

/** Branches for one gutter. boxW is the viewBox width; boxH is normally 1440. */
export function buildSide(settings: ElderSettings, side: ElderSide, boxW: number, boxH: number): ElderBranch[] {
    const count = side === 'left' ? settings.left : settings.right;
    const rnd = createRng(side === 'left' ? settings.seed * 7919 : settings.seed * 104729 + 1);
    const jit = (s: number) => (rnd() - .5) * 2 * s;
    const ys: number[] = [];
    for (let i = 0; i < count; i++) {
        const f = count === 1 ? .5 : i / (count - 1);
        ys.push(boxH * (settings.top + (settings.bottom - settings.top) * f) / 100 + jit(boxH * .04));
    }
    const reachBase = boxW * settings.reach / 100;
    const seeds = ys.map(() => 1 + Math.floor(rnd() * 1e6));
    const reaches = ys.map(() => reachBase * (.8 + rnd() * .35));
    return ys.map((y, i) => branch(y, reaches[i], settings, seeds[i], i + (side === 'right' ? 10 : 0)));
}
