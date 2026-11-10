import {describe, expect, it} from 'vitest';
import {Rational, RationalPoint} from '../compgeo/rational';
import {apply, mapsEqual} from './isometry2';
import {
    friezeClosure, friezeCopies, friezeGenerator, friezeSignature, friezeType, friezeTypes,
    type FriezeGenerator, type FriezeType,
} from './frieze';

const L = Rational.of(4);
const ALL: FriezeGenerator[] = ['V', "V'", 'H', 'R', 'G'];

const subsets = (): FriezeGenerator[][] =>
    Array.from({length: 32}, (_, mask) => ALL.filter((_g, i) => (mask >> i) & 1));

const closed = (gens: FriezeGenerator[]) => {
    const c = friezeClosure(gens, L);
    if (c.kind !== 'closed') throw new Error('expected closed');
    return c.elements;
};
const typeOf = (gens: FriezeGenerator[]) => friezeType(closed(gens));
const key = (gens: FriezeGenerator[]) => gens.join(',');

// Independent brute-force oracle with integers, L = 4: element (sx, sy, t) is (x, y) -> (sx x + t, sy y), t in 0..3.
type E = readonly [number, number, number];
const GEN: Record<FriezeGenerator, E> = {V: [-1, 1, 0], "V'": [-1, 1, 2], H: [1, -1, 0], R: [-1, -1, 0], G: [1, -1, 2]};
const mod4 = (t: number) => ((t % 4) + 4) % 4;
const comp = (o: E, i: E): E => [o[0] * i[0], o[1] * i[1], mod4(o[0] * i[2] + o[2])];
function brute(gens: FriezeGenerator[]): E[] | 'reduces' {
    const set = new Map<string, E>([['1,1,0', [1, 1, 0]]]);
    let grew = true;
    for (const g of gens) set.set(GEN[g].join(), GEN[g]);
    while (grew) {
        grew = false;
        for (const a of [...set.values()]) {
            for (const b of [...set.values()]) {
                const c = comp(a, b);
                if (c[0] === 1 && c[1] === 1 && c[2] !== 0) return 'reduces';
                if (!set.has(c.join())) {
                    set.set(c.join(), c);
                    grew = true;
                }
            }
        }
    }
    for (const e of set.values()) if (e[0] === 1 && e[1] === 1 && e[2] !== 0) return 'reduces';
    return [...set.values()];
}
const bruteSignature = (els: E[]) => [
    els.some((e) => e[0] === -1 && e[1] === 1),
    els.some((e) => e[0] === 1 && e[1] === -1 && e[2] === 0),
    els.some((e) => e[0] === -1 && e[1] === -1),
    els.some((e) => e[0] === 1 && e[1] === -1 && e[2] !== 0),
].join();

describe('friezeClosure and friezeType', () => {
    it('with no generators gives the identity and p1', () => {
        expect(closed([])).toHaveLength(1);
        expect(typeOf([])).toBe('p1');
    });

    it('reduces the period for V with V-prime, and for H with G', () => {
        expect(friezeClosure(['V', "V'"], L).kind).toBe('reducesPeriod');
        expect(friezeClosure(['H', 'G'], L).kind).toBe('reducesPeriod');
        expect(friezeClosure(['V', 'R', 'G'], L).kind).toBe('reducesPeriod');
    });

    it('reproduces the spec numbers for L = 4 against an independent brute-force oracle', () => {
        let valid = 0;
        const sets = new Set<string>();
        const signatures = new Set<string>();
        const types = new Set<FriezeType>();
        for (const gens of subsets()) {
            const b = brute(gens);
            const c = friezeClosure(gens, L);
            expect(c.kind === 'reducesPeriod').toBe(b === 'reduces');
            if (b === 'reduces') continue;
            valid++;
            sets.add(b.map((e) => e.join()).sort().join(';'));
            signatures.add(bruteSignature(b));
            if (c.kind === 'closed') {
                expect(c.elements).toHaveLength(b.length);
                types.add(friezeType(c.elements));
            }
        }
        expect(valid).toBe(16);
        expect(32 - valid).toBe(16);
        expect(sets.size).toBe(10);
        expect(signatures.size).toBe(7);
        expect(types.size).toBe(7);
    });

    it('finds exactly the five p2mg generator sets and the p2mm cases', () => {
        const p2mg = subsets().filter((g) => friezeClosure(g, L).kind === 'closed' && typeOf(g) === 'p2mg').map(key).sort();
        const expected: FriezeGenerator[][] = [['V', 'G'], ["V'", 'R'], ["V'", 'G'], ['R', 'G'], ["V'", 'R', 'G']];
        expect(p2mg).toEqual(expected.map(key).sort());
        expect(typeOf(['V', 'R'])).toBe('p2mm');
        expect(typeOf(['V', 'H'])).toBe('p2mm');
        expect(friezeSignature(closed(['V', 'H'])).halfTurn).toBe(true);
    });

    it('gives closed-set sizes 1, 2, 2, 2, 2, 4, 4 for the seven types', () => {
        const size: Partial<Record<FriezeType, number>> = {};
        for (const gens of subsets()) {
            const c = friezeClosure(gens, L);
            if (c.kind !== 'closed') continue;
            const t = friezeType(c.elements);
            expect(size[t] ?? c.elements.length).toBe(c.elements.length);
            size[t] = c.elements.length;
        }
        expect(friezeTypes.map((t) => size[t])).toEqual([1, 2, 2, 2, 2, 4, 4]);
    });

    it('V with G has a half-turn at L/4 and glide is H with a half-period shift', () => {
        const els = closed(['V', 'G']);
        const turn = els.find((m) => m.a.equals(Rational.of(-1)) && m.d.equals(Rational.of(-1)));
        expect(turn?.tx.equals(Rational.of(2))).toBe(true);
        expect(friezeGenerator('G', L).tx.equals(Rational.of(2))).toBe(true);
        expect(mapsEqual(friezeGenerator('G', L), friezeGenerator('H', L))).toBe(false);
    });

    it('reduces a negative tx into [0, L) for L = 3/2 (V after G)', () => {
        const third = Rational.of(3, 2);
        const c = friezeClosure(['V', 'G'], third);
        if (c.kind !== 'closed') throw new Error('expected closed');
        const turn = c.elements.find((m) => m.a.equals(Rational.of(-1)) && m.d.equals(Rational.of(-1)));
        expect(turn?.tx.equals(Rational.of(3, 4))).toBe(true); // raw tx = -3/4
        for (const m of c.elements) {
            expect(m.tx.sign()).toBeGreaterThanOrEqual(0);
            expect(m.tx.compare(third)).toBe(-1);
        }
    });

    it('works for rational periods and rejects a non-positive period', () => {
        const half = Rational.of(3, 2);
        expect(friezeClosure(['V', 'G'], half).kind).toBe('closed');
        expect(friezeClosure(['G', 'H'], half).kind).toBe('reducesPeriod');
        expect(() => friezeClosure([], Rational.ZERO)).toThrow(RangeError);
    });
});

describe('friezeCopies', () => {
    const motif = new RationalPoint(Rational.of(1, 3), Rational.of(1, 5));
    const sizes: Record<FriezeType, number> = {p1: 1, p11g: 2, p1m1: 2, p11m: 2, p2: 2, p2mg: 4, p2mm: 4};

    it('has no duplicates and the same number of copies in every period', () => {
        for (const type of friezeTypes) {
            const copies = friezeCopies(type, motif, L, {from: -3, to: 4});
            expect(copies).toHaveLength(7 * sizes[type]);
            const keys = copies.map((c) => `${c.point.x.format()},${c.point.y.format()}`);
            expect(new Set(keys).size).toBe(copies.length);
            for (let k = -3; k < 4; k++) expect(copies.filter((c) => c.period === k)).toHaveLength(sizes[type]);
        }
    });

    it('covers every interior period with the same count when clipped by x range', () => {
        for (const type of friezeTypes) {
            const copies = friezeCopies(type, motif, L, {from: -3, to: 4});
            for (let k = -2; k < 3; k++) {
                const inStrip = copies.filter((c) => c.point.x.compare(L.mul(Rational.of(k))) >= 0
                    && c.point.x.compare(L.mul(Rational.of(k + 1))) < 0);
                expect(inStrip).toHaveLength(sizes[type]);
            }
        }
    });

    it('shifts the period-zero images by kL and starts with the motif itself', () => {
        const copies = friezeCopies('p2mg', motif, L, {from: 0, to: 2});
        expect(copies[0].point.equals(motif)).toBe(true);
        const g = friezeGenerator('G', L);
        expect(copies.some((c) => c.point.equals(apply(g, motif)))).toBe(true);
        const first = copies.filter((c) => c.period === 0);
        first.forEach((c, i) => {
            const next = copies[first.length + i];
            expect(next.point.x.sub(c.point.x).equals(L)).toBe(true);
            expect(next.point.y.equals(c.point.y)).toBe(true);
        });
    });
});
