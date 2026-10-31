/**
 * Exact rationals for derived geometry (ADR 0030 section 1, ADR 0021). Pure TypeScript, no dependency.
 *
 * Contract (stable; other families import it and may add operations, not change these):
 * - `Rational`: immutable `bigint` numerator `num` and denominator `den`; `den > 0`, gcd-reduced, zero is `0/1`.
 *   Constructors: `Rational.fromInt(n)` (safe integer), `Rational.of(n, d)` (integer pair, `d != 0`),
 *   `Rational.fromBigInt(n, d = 1n)`. A non-integer, non-finite or unsafe number, or a zero denominator, throws RangeError.
 *   Operations: `add`, `sub`, `mul`, `div` (RangeError on zero divisor), `neg`, `sign`, `compare`, `equals`, `isZero`,
 *   `toNumber` (correctly rounded to nearest-even for any size; for drawing and display only, never for decisions),
 *   `format` (`7/2`, `-5/2`, `2`). Constants `Rational.ZERO`, `Rational.ONE`.
 * - `RationalPoint`: immutable `x`, `y` rationals with `add`, `sub`, `scale(Rational)`, `dot`, `cross` (z of the 2D cross
 *   product), `equals`, and `RationalPoint.fromGrid(GridPoint)`.
 */
import type {GridPoint} from './grid';

function abs(value: bigint): bigint {
    return value < 0n ? -value : value;
}

function gcd(a: bigint, b: bigint): bigint {
    let x = abs(a);
    let y = abs(b);
    while (y !== 0n) [x, y] = [y, x % y];
    return x;
}

function bitLength(value: bigint): number {
    return value.toString(2).length;
}

function integerNumber(value: number, name: string): bigint {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new RangeError(`${name} must be a safe integer`);
    }
    return BigInt(value);
}

export class Rational {
    static readonly ZERO: Rational = new Rational(0n, 1n);
    static readonly ONE: Rational = new Rational(1n, 1n);

    private constructor(readonly num: bigint, readonly den: bigint) {
    }

    static fromBigInt(num: bigint, den: bigint = 1n): Rational {
        if (typeof num !== 'bigint' || typeof den !== 'bigint') throw new TypeError('numerator and denominator must be bigint');
        if (den === 0n) throw new RangeError('denominator must not be zero');
        if (num === 0n) return Rational.ZERO;
        const sign = den < 0n ? -1n : 1n;
        const g = gcd(num, den);
        return new Rational((sign * num) / g, (sign * den) / g);
    }

    static fromInt(value: number): Rational {
        return Rational.fromBigInt(integerNumber(value, 'value'));
    }

    static of(num: number, den: number = 1): Rational {
        return Rational.fromBigInt(integerNumber(num, 'numerator'), integerNumber(den, 'denominator'));
    }

    add(o: Rational): Rational {
        return Rational.fromBigInt(this.num * o.den + o.num * this.den, this.den * o.den);
    }

    sub(o: Rational): Rational {
        return Rational.fromBigInt(this.num * o.den - o.num * this.den, this.den * o.den);
    }

    mul(o: Rational): Rational {
        return Rational.fromBigInt(this.num * o.num, this.den * o.den);
    }

    div(o: Rational): Rational {
        if (o.num === 0n) throw new RangeError('division by zero');
        return Rational.fromBigInt(this.num * o.den, this.den * o.num);
    }

    neg(): Rational {
        return this.num === 0n ? this : new Rational(-this.num, this.den);
    }

    sign(): -1 | 0 | 1 {
        return this.num < 0n ? -1 : this.num > 0n ? 1 : 0;
    }

    compare(o: Rational): -1 | 0 | 1 {
        const l = this.num * o.den;
        const r = o.num * this.den;
        return l < r ? -1 : l > r ? 1 : 0;
    }

    equals(o: Rational): boolean {
        return this.num === o.num && this.den === o.den;
    }

    isZero(): boolean {
        return this.num === 0n;
    }

    /** Nearest double (ties to even). Overflows to +-Infinity; results below the normal range may round twice. */
    toNumber(): number {
        if (this.num === 0n) return 0;
        const negative = this.num < 0n;
        const a = abs(this.num);
        // Scale so the integer quotient has at least 64 bits, keeping the remainder as a sticky bit.
        const s = 64 + bitLength(this.den) - bitLength(a);
        const numerator = s >= 0 ? a << BigInt(s) : a;
        const denominator = s >= 0 ? this.den : this.den << BigInt(-s);
        const q = numerator / denominator;
        const sticky = numerator % denominator !== 0n;
        const drop = bitLength(q) - 53;
        let mantissa = q >> BigInt(drop);
        const rest = q & ((1n << BigInt(drop)) - 1n);
        const half = 1n << BigInt(drop - 1);
        if (rest > half || (rest === half && (sticky || (mantissa & 1n) === 1n))) mantissa += 1n;
        const exponent = drop - s;
        const half1 = Math.trunc(exponent / 2);
        const value = Number(mantissa) * 2 ** half1 * 2 ** (exponent - half1);
        return negative ? -value : value;
    }

    format(): string {
        return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`;
    }
}

export class RationalPoint {
    constructor(readonly x: Rational, readonly y: Rational) {
    }

    static fromGrid(point: GridPoint): RationalPoint {
        return new RationalPoint(Rational.fromInt(point.x), Rational.fromInt(point.y));
    }

    add(o: RationalPoint): RationalPoint {
        return new RationalPoint(this.x.add(o.x), this.y.add(o.y));
    }

    sub(o: RationalPoint): RationalPoint {
        return new RationalPoint(this.x.sub(o.x), this.y.sub(o.y));
    }

    scale(k: Rational): RationalPoint {
        return new RationalPoint(this.x.mul(k), this.y.mul(k));
    }

    dot(o: RationalPoint): Rational {
        return this.x.mul(o.x).add(this.y.mul(o.y));
    }

    /** z component of the 2D cross product: `this.x * o.y - this.y * o.x`. */
    cross(o: RationalPoint): Rational {
        return this.x.mul(o.y).sub(this.y.mul(o.x));
    }

    equals(o: RationalPoint): boolean {
        return this.x.equals(o.x) && this.y.equals(o.y);
    }
}
