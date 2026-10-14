import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {blendPoints, chordKnots} from "./geometry";
import {Point} from "../../api/point/point";

export class C2CubicBezierSpline extends BezierSpline {

    protected override computeKnots(): number[] {
        const points = this.points;
        const n = points.length;
        const spans: Array<readonly [Point, Point]> = [[points[0], points[2]]];
        for (let i = 2; i < n - 3; i++) {
            spans.push([points[i], points[i + 1]]);
        }
        spans.push([points[n - 3], points[n - 1]]);
        return chordKnots(spans, this.alpha);
    }

    generateBezierCurves() {
        const points = this.points;
        const n = points.length;
        const numOfCurves = n - 3;
        const bezpoints: Point[][] = Array.from({length: numOfCurves}, () => new Array<Point>(3));
        const nonFreePoints: Point[] = [];

        // First span: P0, P1, then a point on P1 P2 weighted by the first two knot spans.
        bezpoints[0][0] = points[0];
        bezpoints[0][1] = points[1];
        const first = blendPoints(points[1], points[2], () => {
            const u = this.getU();
            const du1 = u[1] - u[0];
            const du2 = u[2] - u[1];
            const duSum = du1 + du2;
            return [du2 / duSum, du1 / duSum];
        });
        bezpoints[0][2] = first;
        nonFreePoints.push(first);

        // Two points on each interior segment P(l) P(l+1), weighted by three consecutive knot spans.
        for (let l = 2; l < n - 3; l++) {
            const p = blendPoints(points[l], points[l + 1], () => {
                const {du1, du2, du3, duSum} = this.getDUs(l);
                return [(du2 + du3) / duSum, du1 / duSum];
            });
            const p2 = blendPoints(points[l], points[l + 1], () => {
                const {du1, du2, du3, duSum} = this.getDUs(l);
                return [du3 / duSum, (du1 + du2) / duSum];
            });
            nonFreePoints.push(p, p2);
            bezpoints[l - 1][1] = p;
            bezpoints[l - 1][2] = p2;
        }

        // Mirror image of the first point: du1 is the second-to-last knot span, du2 the last.
        const last = blendPoints(points[n - 3], points[n - 2], () => {
            const u = this.getU();
            const du1 = u[u.length - 2] - u[u.length - 3];
            const du2 = u[u.length - 1] - u[u.length - 2];
            const duSum = du1 + du2;
            return [du2 / duSum, du1 / duSum];
        });
        nonFreePoints.push(last);
        bezpoints[numOfCurves - 1][1] = last;

        // Joints between spans lie between the neighbouring spans' inner points, which makes the spline C2.
        for (let l = 1; l < n - 3; l++) {
            const joint = blendPoints(bezpoints[l - 1][2], bezpoints[l][1], () => {
                const u = this.getU();
                const du1 = u[l] - u[l - 1];
                const du2 = u[l + 1] - u[l];
                const duSum = du1 + du2;
                return [du2 / duSum, du1 / duSum];
            });
            nonFreePoints.push(joint);
            bezpoints[l - 1][3] = joint;
            bezpoints[l][0] = joint;
        }

        bezpoints[numOfCurves - 1][2] = points[n - 2];
        bezpoints[numOfCurves - 1][3] = points[n - 1];

        this.nonFreePoints = nonFreePoints;
        this.bezierCurves = bezpoints.map(spanPoints => new PolynomialBezierCurve(spanPoints));
        this.bindNonFreePoints();
    }

    override getPoints(): Point[] {
        return this.points;
    }

    private getDUs(l: number) {
        const u = this.getU();
        const du1 = u[l - 1] - u[l - 2];
        const du2 = u[l] - u[l - 1];
        const du3 = u[l + 1] - u[l];
        const duSum = du1 + du2 + du3;
        return {du1, du2, du3, duSum};
    }

}
