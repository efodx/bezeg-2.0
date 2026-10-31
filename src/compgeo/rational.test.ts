import {GRID_COORD_LIMIT, type GridPoint} from './grid';
import {orientValue} from './predicates';
import {Rational, RationalPoint} from './rational';

/** Deterministic pseudo-random generator so failures are reproducible. */
function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Random non-negative bigint below 2^bits. */
function randomBig(random: () => number, bits: number): bigint {
    let value = 0n;
    for (let i = 0; i < bits + 16; i += 16) value = (value << 16n) | BigInt(Math.floor(random() * 65536));
    return value & ((1n << BigInt(bits)) - 1n);
}

function randomRational(random: () => number, bits = 60): Rational {
    const edge = random();
    if (edge < 0.05) return Rational.ZERO;
    if (edge < 0.1) return random() < 0.5 ? Rational.ONE : Rational.ONE.neg();
    const n = randomBig(random, 1 + Math.floor(random() * bits)) * (random() < 0.5 ? -1n : 1n);
    const d = (randomBig(random, 1 + Math.floor(random() * bits)) + 1n) * (random() < 0.5 ? -1n : 1n);
    return Rational.fromBigInt(n, d);
}

function gcdRef(a: bigint, b: bigint): bigint {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) [a, b] = [b, a % b];
    return a;
}

function expectNormal(r: Rational): void {
    expect(r.den > 0n).toBe(true);
    expect(gcdRef(r.num, r.den)).toBe(r.num === 0n ? r.den : 1n);
    if (r.num === 0n) expect(r.den).toBe(1n);
}

/** Exact value of a finite double. */
function exactOf(value: number): Rational {
    let scaled = value;
    let shift = 0;
    while (!Number.isInteger(scaled)) {
        scaled *= 2;
        shift += 1;
    }
    return Rational.fromBigInt(BigInt(scaled), 1n << BigInt(shift));
}

function abs(r: Rational): Rational {
    return r.sign() < 0 ? r.neg() : r;
}

/** Adjacent double in the given direction, by stepping the IEEE bit pattern (finite, non-zero x). */
function adjacent(x: number, up: boolean): number {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    const bits = view.getBigUint64(0);
    view.setBigUint64(0, (x > 0) === up ? bits + 1n : bits - 1n);
    return view.getFloat64(0);
}

/** x is the nearest double to r: neither true neighbour is closer, and a tie picks the even mantissa. */
function expectNearest(r: Rational, x: number): void {
    const error = abs(exactOf(x).sub(r));
    for (const neighbour of [adjacent(x, false), adjacent(x, true)]) {
        if (!Number.isFinite(neighbour) || neighbour === 0) continue;
        const other = abs(exactOf(neighbour).sub(r));
        expect(error.compare(other)).toBeLessThanOrEqual(0);
        if (error.equals(other)) {
            const view = new DataView(new ArrayBuffer(8));
            view.setFloat64(0, x);
            expect(view.getBigUint64(0) & 1n).toBe(0n);
        }
    }
}

describe('Rational normal form', () => {
    it('normalizes constructors', () => {
        expect(Rational.of(2, -4)).toMatchObject({num: -1n, den: 2n});
        expect(Rational.of(0, -7)).toMatchObject({num: 0n, den: 1n});
        expect(Rational.fromBigInt(6n, 3n)).toMatchObject({num: 2n, den: 1n});
        expect(Rational.fromInt(-5)).toMatchObject({num: -5n, den: 1n});
    });

    it('stays normal after every operation on random inputs', () => {
        const random = mulberry32(11);
        for (let i = 0; i < 300; i++) {
            const a = randomRational(random);
            const b = randomRational(random);
            for (const r of [a, b, a.add(b), a.sub(b), a.mul(b), a.neg(), a.sub(a)]) expectNormal(r);
            if (!b.isZero()) expectNormal(a.div(b));
        }
    });
});

describe('Rational constructor rejection', () => {
    it('rejects non-integer, non-finite and unsafe numbers and a zero denominator', () => {
        expect(() => Rational.fromInt(0.5)).toThrow(RangeError);
        expect(() => Rational.fromInt(NaN)).toThrow(RangeError);
        expect(() => Rational.fromInt(Infinity)).toThrow(RangeError);
        expect(() => Rational.fromInt(2 ** 53)).toThrow(RangeError);
        expect(() => Rational.of(1, 0.5)).toThrow(RangeError);
        expect(() => Rational.of(2 ** 60, 1)).toThrow(RangeError);
        expect(() => Rational.of(1, 0)).toThrow(RangeError);
        expect(() => Rational.fromBigInt(1n, 0n)).toThrow(RangeError);
        expect(() => Rational.fromInt(Number.MAX_SAFE_INTEGER)).not.toThrow();
    });

    it('throws on division by zero', () => {
        expect(() => Rational.of(1, 2).div(Rational.ZERO)).toThrow(RangeError);
    });
});

describe('Rational field identities', () => {
    it('holds commutativity, associativity, distributivity and inverses', () => {
        const random = mulberry32(5);
        for (let i = 0; i < 300; i++) {
            const a = randomRational(random);
            const b = randomRational(random);
            const c = randomRational(random);
            expect(a.add(b)).toEqual(b.add(a));
            expect(a.mul(b)).toEqual(b.mul(a));
            expect(a.add(b).add(c)).toEqual(a.add(b.add(c)));
            expect(a.mul(b).mul(c)).toEqual(a.mul(b.mul(c)));
            expect(a.mul(b.add(c))).toEqual(a.mul(b).add(a.mul(c)));
            expect(a.add(Rational.ZERO)).toEqual(a);
            expect(a.mul(Rational.ONE)).toEqual(a);
            expect(a.add(a.neg())).toEqual(Rational.ZERO);
            expect(a.sub(b)).toEqual(a.add(b.neg()));
            if (!a.isZero()) expect(a.mul(Rational.ONE.div(a))).toEqual(Rational.ONE);
            if (!b.isZero()) expect(a.div(b).mul(b)).toEqual(a);
        }
    });
});

describe('Rational compare / sign / equals', () => {
    it('is consistent with the sign of the difference', () => {
        const random = mulberry32(21);
        for (let i = 0; i < 400; i++) {
            const a = randomRational(random);
            const b = i % 5 === 0 ? a : randomRational(random);
            expect(a.compare(b)).toBe(a.sub(b).sign());
            expect(b.compare(a) + a.compare(b)).toBe(0);
            expect(a.equals(b)).toBe(a.compare(b) === 0);
        }
        expect(Rational.of(1, 3).compare(Rational.of(1, 2))).toBe(-1);
        expect(Rational.of(-1, 3).sign()).toBe(-1);
        expect(Rational.ZERO.sign()).toBe(0);
    });
});

describe('Rational toNumber', () => {
    it('matches known cases', () => {
        expect(Rational.of(7, 2).toNumber()).toBe(3.5);
        expect(Rational.of(-1, 8).toNumber()).toBe(-0.125);
        expect(Rational.ZERO.toNumber()).toBe(0);
        expect(Rational.of(1, 3).toNumber()).toBe(1 / 3);
        expect(Rational.fromBigInt(2n ** 60n + 1n).toNumber()).toBe(2 ** 60);
    });

    it('rounds ties to even', () => {
        // 2^53 + 1 is halfway between 2^53 and 2^53 + 2; the even mantissa is 2^53.
        expect(Rational.fromBigInt(2n ** 53n + 1n).toNumber()).toBe(2 ** 53);
        // 2^53 + 3 is halfway between 2^53 + 2 and 2^53 + 4; the even mantissa is 2^53 + 4.
        expect(Rational.fromBigInt(2n ** 53n + 3n).toNumber()).toBe(2 ** 53 + 4);
        expect(Rational.fromBigInt(-(2n ** 53n) - 1n).toNumber()).toBe(-(2 ** 53));
    });

    it('is the nearest double for numerators and denominators up to 2^60', () => {
        const random = mulberry32(99);
        for (let i = 0; i < 400; i++) {
            const n = randomBig(random, 1 + Math.floor(random() * 60)) * (random() < 0.5 ? -1n : 1n);
            const d = randomBig(random, 1 + Math.floor(random() * 60)) + 1n;
            const r = Rational.fromBigInt(n, d);
            const x = r.toNumber();
            expect(Number.isFinite(x)).toBe(true);
            if (r.isZero()) continue;
            expectNearest(r, x);
        }
    });

    it('rounds sticky ties, huge operands, overflow and tiny values', () => {
        // Halfway plus a tiny remainder: the sticky bit must round up, away from the even neighbour.
        const k = 70n;
        expect(Rational.fromBigInt((2n ** 53n + 1n) * 2n ** k + 1n, 2n ** k).toNumber()).toBe(2 ** 53 + 2);
        expect(Rational.fromBigInt(-((2n ** 53n + 1n) * 2n ** k + 1n), 2n ** k).toNumber()).toBe(-(2 ** 53 + 2));
        // Exactly halfway with den > 1 still ties to even.
        expect(Rational.fromBigInt((2n ** 53n + 1n) * 3n, 3n * 2n ** k).toNumber()).toBe(2 ** 53 * 2 ** -70);
        // Numerator and denominator beyond the double range.
        expect(Rational.fromBigInt(2n ** 1100n + 1n, 2n ** 1100n).toNumber()).toBe(1);
        expect(Rational.fromBigInt(-(3n ** 700n), 3n ** 699n * 2n).toNumber()).toBe(-1.5);
        expect(Rational.fromBigInt(2n ** 1024n).toNumber()).toBe(Infinity);
        expect(Rational.fromBigInt(-(2n ** 1024n)).toNumber()).toBe(-Infinity);
        expect(Rational.fromBigInt(1n, 2n ** 1022n).toNumber()).toBe(2 ** -1022);
        expect(Rational.fromBigInt(-7n, 3n * 2n ** 1000n).toNumber()).toBe(-7 / 3 / 2 ** 1000);
        const random = mulberry32(7);
        for (let i = 0; i < 200; i++) {
            const n = (randomBig(random, 1 + Math.floor(random() * 1200)) + 1n) * (random() < 0.5 ? -1n : 1n);
            const d = randomBig(random, 1 + Math.floor(random() * 1200)) + 1n;
            const r = Rational.fromBigInt(n, d);
            const x = r.toNumber();
            if (Number.isFinite(x) && Math.abs(x) >= 2 ** -1022) expectNearest(r, x);
        }
    });
});

describe('Rational format', () => {
    it('prints fractions and integers', () => {
        expect(Rational.of(7, 2).format()).toBe('7/2');
        expect(Rational.of(5, -2).format()).toBe('-5/2');
        expect(Rational.of(4, 2).format()).toBe('2');
        expect(Rational.ZERO.format()).toBe('0');
    });
});

describe('RationalPoint', () => {
    const P = (x: number, y: number): GridPoint => ({x, y});

    it('supports add, sub, scale, dot and cross', () => {
        const a = RationalPoint.fromGrid(P(1, 2));
        const b = RationalPoint.fromGrid(P(3, -4));
        expect(a.add(b).equals(RationalPoint.fromGrid(P(4, -2)))).toBe(true);
        expect(a.sub(b).equals(RationalPoint.fromGrid(P(-2, 6)))).toBe(true);
        const half = a.scale(Rational.of(1, 2));
        expect(half.x.format()).toBe('1/2');
        expect(half.y.format()).toBe('1');
        expect(a.dot(b).format()).toBe('-5');
        expect(a.cross(b).format()).toBe('-10');
    });

    it('cross of three grid points equals orientValue', () => {
        const random = mulberry32(2025);
        const coord = () => Math.round((random() * 2 - 1) * (random() < 0.5 ? 5 : GRID_COORD_LIMIT));
        let collinear = 0;
        for (let i = 0; i < 500; i++) {
            const a = P(coord(), coord());
            const b = P(coord(), coord());
            const c = i % 7 === 0 ? P(Math.max(-GRID_COORD_LIMIT, Math.min(GRID_COORD_LIMIT, 2 * b.x - a.x)), 2 * b.y - a.y) : P(coord(), coord());
            if (Math.abs(c.y) > GRID_COORD_LIMIT) continue;
            const [ra, rb, rc] = [a, b, c].map(RationalPoint.fromGrid);
            const cross = rb.sub(ra).cross(rc.sub(ra));
            const expected = orientValue(a, b, c);
            if (expected === 0) collinear++;
            expect(cross.num).toBe(BigInt(expected));
            expect(cross.den).toBe(1n);
        }
        expect(collinear).toBeGreaterThan(0);
    });
});
