import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {blendPoints, chordKnots} from "./geometry";
import {Point} from "../../api/point/point";

/**
 * Quadratic spline whose control points are P0, P1, ..., Pn: the first span is P0 P1 J1, each
 * following span starts at the join J(l-1) and ends at the free point P(l), and the last span
 * ends at Pn. Every join J(l-1) is a computed point on the segment P(l-1) P(l); subclasses only
 * say where on that segment it lies (`joinWeights`), which is what distinguishes C1 from G1.
 */
export abstract class QuadraticJoinedSpline extends BezierSpline {

    /**
     * Weights [w(l-1), w(l)] of the join on segment P(l-1) P(l), for the join with index
     * `j` = l - 2 (l runs from 2 to n-1).
     */
    protected abstract joinWeights(l: number, j: number): readonly [number, number];

    protected override computeKnots(): number[] {
        const spans: Array<readonly [Point, Point]> = [];
        for (let i = 1; i < this.points.length - 1; i++) {
            spans.push([this.points[i], this.points[i + 1]]);
        }
        return chordKnots(spans, this.alpha);
    }

    generateBezierCurves() {
        const points = this.points;
        const spanPoints: Point[][] = [[points[0], points[1]]];
        const joins: Point[] = [];
        for (let l = 2; l < points.length - 1; l++) {
            const join = blendPoints(points[l - 1], points[l], () => this.joinWeights(l, l - 2));
            joins.push(join);
            spanPoints[spanPoints.length - 1].push(join);
            spanPoints.push([join, points[l]]);
        }
        spanPoints[spanPoints.length - 1].push(points[points.length - 1]);

        this.nonFreePoints = joins;
        this.bezierCurves = spanPoints.map(spanControlPoints => new PolynomialBezierCurve(spanControlPoints));
        this.bindNonFreePoints();
    }

    override getPoints(): Point[] {
        return this.points;
    }
}
