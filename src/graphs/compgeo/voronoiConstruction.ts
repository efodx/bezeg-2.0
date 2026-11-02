/**
 * The bisector construction of one Voronoi cell (spec B4 step 3) and the exact text parsing of the query point.
 * No board, no React: the graph draws what these return. Every decision is on exact rationals.
 *
 * The cell of site `s` is the intersection of the half-planes "nearer to `s` than to `o`" over all other sites `o`. The
 * construction applies them one at a time to the view box, in the decided order: other sites by increasing squared
 * distance from `s`, ties by site index. After all of them the region is the cell clipped to the box (`clipCell`).
 */
import type {GridPoint} from "../../compgeo/grid";
import {Rational, RationalPoint} from "../../compgeo/rational";
import type {RationalBox} from "../../compgeo/voronoi";

const squaredDistance = (a: GridPoint, b: GridPoint): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** The other sites in the order their bisectors are applied: increasing distance from `site`, ties by index. */
export function bisectorOrder(points: readonly GridPoint[], site: number): number[] {
    return points.map((_, i) => i).filter(i => i !== site)
        .sort((a, b) => squaredDistance(points[site], points[a]) - squaredDistance(points[site], points[b]) || a - b);
}

/** Exact `|x - s|^2 - |x - o|^2` (at most 0 iff `x` is at least as near to `s`). */
function bisectorValue(x: RationalPoint, site: GridPoint, other: GridPoint): Rational {
    const toOther = RationalPoint.fromGrid({x: other.x - site.x, y: other.y - site.y});
    const norm = Rational.fromInt(other.x ** 2 + other.y ** 2 - site.x ** 2 - site.y ** 2);
    return Rational.of(2).mul(x.dot(toOther)).sub(norm);
}

const boxCorners = (box: RationalBox): RationalPoint[] => [
    new RationalPoint(box.minX, box.minY), new RationalPoint(box.maxX, box.minY),
    new RationalPoint(box.maxX, box.maxY), new RationalPoint(box.minX, box.maxY),
];

/** Keeps the part of the convex polygon where `value <= 0`. */
function clipHalfPlane(polygon: readonly RationalPoint[], value: (p: RationalPoint) => Rational): RationalPoint[] {
    const out: RationalPoint[] = [];
    polygon.forEach((a, k) => {
        const b = polygon[(k + 1) % polygon.length];
        const ha = value(a);
        const hb = value(b);
        if (ha.sign() <= 0) out.push(a);
        if (ha.sign() * hb.sign() < 0) out.push(a.add(b.sub(a).scale(ha.div(ha.sub(hb)))));
    });
    return out;
}

/**
 * The box intersected with the first `count` half-planes of `order` (a convex polygon, counter-clockwise; empty when it
 * has no area). `count` is clamped to `0..order.length`.
 */
export function constructionRegion(
    points: readonly GridPoint[], site: number, order: readonly number[], count: number, box: RationalBox,
): RationalPoint[] {
    let polygon = boxCorners(box);
    const used = Math.max(0, Math.min(order.length, count));
    for (let k = 0; k < used && polygon.length > 0; k++) {
        const other = points[order[k]];
        polygon = clipHalfPlane(polygon, p => bisectorValue(p, points[site], other));
    }
    return polygon.length < 3 ? [] : polygon;
}

/** Whether two polygons have the same corners in the same cyclic order, whichever corner they start at (exact). */
export function sameCyclicPolygon(a: readonly RationalPoint[], b: readonly RationalPoint[]): boolean {
    if (a.length !== b.length) return false;
    if (a.length === 0) return true;
    const start = b.findIndex(p => p.equals(a[0]));
    return start >= 0 && a.every((p, k) => p.equals(b[(start + k) % b.length]));
}

/**
 * Parses an exact rational typed by a student: an integer, a fraction `3/2` or a decimal with a point or comma (`1,5`).
 * Returns undefined for anything else (including a zero denominator). The sign may only lead.
 */
export function parseRationalText(text: string): Rational | undefined {
    const trimmed = text.trim().replace(/\s+/g, "");
    const fraction = /^([+-]?\d+)\/(\d+)$/.exec(trimmed);
    if (fraction) {
        const den = BigInt(fraction[2]);
        return den === 0n ? undefined : Rational.fromBigInt(BigInt(fraction[1]), den);
    }
    const decimal = /^([+-]?)(\d+)(?:[.,](\d+))?$/.exec(trimmed);
    if (!decimal) return undefined;
    const digits = decimal[3] ?? "";
    const magnitude = Rational.fromBigInt(BigInt(decimal[2] + digits), 10n ** BigInt(digits.length));
    return decimal[1] === "-" ? magnitude.neg() : magnitude;
}
