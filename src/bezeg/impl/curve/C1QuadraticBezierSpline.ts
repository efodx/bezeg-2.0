import {QuadraticJoinedSpline} from "./quadratic-joined-spline";

/** Each join divides its segment in the ratio of the neighbouring knot spans, which makes the spline C1. */
export class C1QuadraticBezierSpline extends QuadraticJoinedSpline {

    protected joinWeights(l: number): readonly [number, number] {
        const u = this.getU();
        const du1 = u[l - 1] - u[l - 2];
        const du2 = u[l] - u[l - 1];
        const duSum = du1 + du2;
        return [du2 / duSum, du1 / duSum];
    }
}
