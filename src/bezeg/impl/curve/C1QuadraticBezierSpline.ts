import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {chordKnots} from "./geometry";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";

export class C1QuadraticBezierSpline extends BezierSpline {

    protected override computeKnots(): number[] {
        const spans: Array<readonly [Point, Point]> = [];
        for (let i = 1; i < this.points.length - 1; i++) {
            spans.push([this.points[i], this.points[i + 1]]);
        }
        return chordKnots(spans, this.alpha);
    }

    generateBezierCurves() {
        this.bezierCurves = [];
        this.nonFreePoints = [];

        const points = this.points;
        const bezpoints = [];
        const nonFreePoints = [];
        bezpoints[0] = [points[0], points[1]];
        for (let l = 2; l < points.length - 1; l++) {
            const p = PointImpl.derived(() => {
                const u = this.getU();
                const du1 = u[l - 1] - u[l - 2];
                const du2 = u[l] - u[l - 1];
                const duSum = du1 + du2;
                return [du2 / duSum * points[l - 1].X() + du1 / duSum * points[l].X(),
                    du2 / duSum * points[l - 1].Y() + du1 / duSum * points[l].Y()];
            });
            const curveNum = l - 1;
            nonFreePoints.push(p);
            bezpoints[curveNum - 1].push(p);
            bezpoints[curveNum] = [p];
            bezpoints[curveNum].push(points[l]);
        }
        bezpoints[bezpoints.length - 1].push(points[points.length - 1]);
        const bezcurves = [];
        for (const points of bezpoints) {
            bezcurves.push(new PolynomialBezierCurve(points));
        }

        this.nonFreePoints = nonFreePoints;
        this.bezierCurves = bezcurves;
        this.bindNonFreePoints();
    }

    override getPoints(): Point[] {
        return this.points;
    }
}