import {BezierSpline} from "./bezier-spline";
import {quadraticJoinScheme} from "./quadratic-join-scheme";
import {Point} from "../../api/point/point";

/** Each join divides its segment in the ratio of the neighbouring knot spans, which makes the spline C1. */
const C1_QUADRATIC_SCHEME = quadraticJoinScheme((context, l) => {
    const u = context.knots();
    const du1 = u[l - 1] - u[l - 2];
    const du2 = u[l] - u[l - 1];
    const duSum = du1 + du2;
    return [du2 / duSum, du1 / duSum];
});

export class C1QuadraticBezierSpline extends BezierSpline {
    constructor(points: Array<Point>) {
        super(points, C1_QUADRATIC_SCHEME);
    }
}
