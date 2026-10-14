import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {blendPoints} from "./geometry";
import {Point} from "../../api/point/point";
import {SplineBuildContext, SplineScheme} from "./spline-scheme";

/**
 * Scheme for a quadratic spline with control points P0, P1, ..., Pn: the first span is P0 P1 J1,
 * each following span starts at the join J(l-1) and ends at the free point P(l), and the last
 * span ends at Pn. Every join J(l-1) is a computed point on the segment P(l-1) P(l); only where
 * on that segment it lies differs between C1 and G1.
 *
 * @param joinWeights weights [w(l-1), w(l)] of the join with index `j` = l - 2 on segment P(l-1) P(l)
 * @param initialParameter initial value of the editable parameter b[j] of every join, if it has one
 */
export function quadraticJoinScheme(
    joinWeights: (context: SplineBuildContext, l: number, j: number) => readonly [number, number],
    initialParameter?: number,
): SplineScheme {
    return {
        listsComputedPoints: false,

        initialParameters: initialParameter === undefined
            ? undefined
            : pointCount => new Array<number>(Math.max(0, pointCount - 3)).fill(initialParameter),

        build(context) {
            const points = context.points;
            const spanPoints: Point[][] = [[points[0], points[1]]];
            const joins: Point[] = [];
            for (let l = 2; l < points.length - 1; l++) {
                const join = blendPoints(points[l - 1], points[l], () => joinWeights(context, l, l - 2));
                joins.push(join);
                spanPoints[spanPoints.length - 1].push(join);
                spanPoints.push([join, points[l]]);
            }
            spanPoints[spanPoints.length - 1].push(points[points.length - 1]);
            return {curves: spanPoints.map(controlPoints => new PolynomialBezierCurve(controlPoints)), computedPoints: joins};
        },

        knotSpans(points) {
            const spans: Array<readonly [Point, Point]> = [];
            for (let i = 1; i < points.length - 1; i++) {
                spans.push([points[i], points[i + 1]]);
            }
            return spans;
        },
    };
}
