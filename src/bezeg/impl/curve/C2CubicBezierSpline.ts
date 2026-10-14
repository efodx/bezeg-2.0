import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {blendPoints} from "./geometry";
import {Point} from "../../api/point/point";
import {SplineScheme} from "./spline-scheme";

/**
 * Cubic C2 spline with de Boor-style free points P0 ... Pn: the end spans interpolate P0 and Pn, and
 * every inner Bezier point and joint is a computed point on a segment of the free polygon, weighted by
 * the knot spans (so the spline stays C2 for any parametrisation alpha).
 */
const C2_CUBIC_SCHEME: SplineScheme = {
    listsComputedPoints: false,

    build(context) {
        const points = context.points;
        const n = points.length;
        const numOfCurves = n - 3;
        const bezpoints: Point[][] = Array.from({length: numOfCurves}, () => new Array<Point>(3));
        const computedPoints: Point[] = [];

        // First span: P0, P1, then a point on P1 P2 weighted by the first two knot spans.
        bezpoints[0][0] = points[0];
        bezpoints[0][1] = points[1];
        const first = blendPoints(points[1], points[2], () => {
            const u = context.knots();
            const du1 = u[1] - u[0];
            const du2 = u[2] - u[1];
            const duSum = du1 + du2;
            return [du2 / duSum, du1 / duSum];
        });
        bezpoints[0][2] = first;
        computedPoints.push(first);

        // Two points on each interior segment P(l) P(l+1), weighted by three consecutive knot spans.
        const threeSpans = (l: number) => {
            const u = context.knots();
            const du1 = u[l - 1] - u[l - 2];
            const du2 = u[l] - u[l - 1];
            const du3 = u[l + 1] - u[l];
            return {du1, du2, du3, duSum: du1 + du2 + du3};
        };
        for (let l = 2; l < n - 3; l++) {
            const p = blendPoints(points[l], points[l + 1], () => {
                const {du1, du2, du3, duSum} = threeSpans(l);
                return [(du2 + du3) / duSum, du1 / duSum];
            });
            const p2 = blendPoints(points[l], points[l + 1], () => {
                const {du1, du2, du3, duSum} = threeSpans(l);
                return [du3 / duSum, (du1 + du2) / duSum];
            });
            computedPoints.push(p, p2);
            bezpoints[l - 1][1] = p;
            bezpoints[l - 1][2] = p2;
        }

        // Mirror image of the first point: du1 is the second-to-last knot span, du2 the last.
        const last = blendPoints(points[n - 3], points[n - 2], () => {
            const u = context.knots();
            const du1 = u[u.length - 2] - u[u.length - 3];
            const du2 = u[u.length - 1] - u[u.length - 2];
            const duSum = du1 + du2;
            return [du2 / duSum, du1 / duSum];
        });
        computedPoints.push(last);
        bezpoints[numOfCurves - 1][1] = last;

        // Joints between spans lie between the neighbouring spans' inner points, which makes the spline C2.
        for (let l = 1; l < n - 3; l++) {
            const joint = blendPoints(bezpoints[l - 1][2], bezpoints[l][1], () => {
                const u = context.knots();
                const du1 = u[l] - u[l - 1];
                const du2 = u[l + 1] - u[l];
                const duSum = du1 + du2;
                return [du2 / duSum, du1 / duSum];
            });
            computedPoints.push(joint);
            bezpoints[l - 1][3] = joint;
            bezpoints[l][0] = joint;
        }

        bezpoints[numOfCurves - 1][2] = points[n - 2];
        bezpoints[numOfCurves - 1][3] = points[n - 1];

        return {curves: bezpoints.map(spanPoints => new PolynomialBezierCurve(spanPoints)), computedPoints};
    },

    // The first and last knot intervals span two free-polygon legs (P0 P2 and P(n-2) Pn), the rest one leg.
    knotSpans(points) {
        const n = points.length;
        const spans: Array<readonly [Point, Point]> = [[points[0], points[2]]];
        for (let i = 2; i < n - 3; i++) {
            spans.push([points[i], points[i + 1]]);
        }
        spans.push([points[n - 3], points[n - 1]]);
        return spans;
    },
};

export class C2CubicBezierSpline extends BezierSpline {
    constructor(points: Array<Point>) {
        super(points, C2_CUBIC_SCHEME);
    }
}
