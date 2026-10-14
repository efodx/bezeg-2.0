import {BezierSpline} from "./bezier-spline";
import {quadraticJoinScheme} from "./quadratic-join-scheme";
import {Point} from "../../api/point/point";

/** Each join sits on its segment at the user-editable fraction b[j] (default the midpoint), giving G1 continuity. */
const G1_SYMMETRIC_SCHEME = quadraticJoinScheme((context, _l, j) => {
    const b = context.parameter(j);
    return [1 - b, b];
}, 0.5);

export class G1SymmetricQuadraticBezierSpline extends BezierSpline {
    constructor(points: Array<Point>) {
        super(points, G1_SYMMETRIC_SCHEME);
    }
}
