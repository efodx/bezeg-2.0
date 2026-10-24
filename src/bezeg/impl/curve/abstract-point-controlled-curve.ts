import {Point} from "../../api/point/point";
import {PointControlledCurve} from "../../api/curve/point-controlled-curve";
import {boundingBoxOf, convexHull} from "./geometry";
import {currentStamp, maxVersion, NO_MEMO, nextVersion, Versioned, VOLATILE} from "../versioning";

export abstract class AbstractPointControlledCurve implements PointControlledCurve, Versioned {
    points: Array<Point>;
    private structuralVersion = nextVersion();
    private versionMemoStamp = NO_MEMO;
    private versionMemo = VOLATILE;

    constructor(points: Array<Point>) {
        this.points = points;
    }

    abstract eval(t: number): Point;

    /**
     * Sets the control points.
     * @param {Array.<Point>} points
     */
    setPoints(points: Point[]) {
        this.points = points;
        this.touch();
    }

    /**
     * Cache version of this curve: the newest stamp among its structural stamp
     * (point set, weights, parameters, transforms) and its control points, or
     * VOLATILE when any control point is volatile. O(n), allocation free.
     */
    version(): number {
        // O(1) while no stamp has been taken since the last scan; volatile results are never memoized.
        const stamp = currentStamp();
        if (stamp === this.versionMemoStamp) {
            return this.versionMemo;
        }
        const version = maxVersion(this.points, this.structuralVersion);
        if (version !== VOLATILE) {
            this.versionMemoStamp = stamp;
            this.versionMemo = version;
        }
        return version;
    }

    /** Marks a structural change (points, weights, parameters, transform) of this curve. */
    protected touch() {
        this.structuralVersion = nextVersion();
    }

    getPoints(): Point[] {
        return this.points;
    }

    scale(xScale: number): void;
    scale(xScale: number, yScale: number): void;
    scale(xScale: number, yScale?: number): void {
        if (yScale === undefined) {
            yScale = xScale;
        }
        this.transform([[xScale, 0], [0, yScale]], [0, 0], this.getBoundingBoxCenter());
    }

    moveFor(x: number, y: number): void {
        this.transform([[1, 0], [0, 1]], [x, y]);
    }

    flip(x: boolean, y: boolean) {
        this.transform([[x ? -1 : 1, 0], [0, y ? -1 : 1]]);
    }

    /**
     * Rotates the curve by theta around the centre (mean) of its control points.
     * @param theta angle of rotation in radians
     */
    rotate(theta: number) {
        const rotationMatrix = [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];
        this.transform(rotationMatrix, [0, 0]);
    }

    getBoundingBox() {
        return boundingBoxOf(this.points);
    }

    getBoundingBoxCenter() {
        let [minX, maxX, minY, maxY] = this.getBoundingBox();
        return [(minX + maxX) / 2, (minY + maxY) / 2];

    }

    transform(A: number[][], b?: number[], center?: number[]): void {
        if (!center) {
            center = this.getPointsCenter();
        }
        let [xCenter, yCenter] = center;
        this.points.forEach(point => {
            this.transformPoint(point, xCenter, yCenter, A, b);
        });
        this.touch();

    }

    getPointsCenter() {
        let [xc, yc] = this.getPoints().reduce((previousValue, currentValue) => [previousValue[0] + currentValue.X(), previousValue[1] + currentValue.Y()], [0, 0]);
        xc = xc / this.getPoints().length;
        yc = yc / this.getPoints().length;
        return [xc, yc];
    }

    transformPoint(point: Point, xCenter: number, yCenter: number, A: number[][], b?: number[]) {
        let x = point.X();
        let y = point.Y();
        x = x - xCenter;
        y = y - yCenter;
        let newX = A[0][0] * x + A[0][1] * y;
        let newY = A[1][0] * x + A[1][1] * y;
        newX = newX + xCenter;
        newY = newY + yCenter;
        if (b) {
            newX = newX + b[0];
            newY = newY + b[1];
        }
        // This is so that we don't override points that have their coordinated fixed by others
        if (!point.isXFunction()) {
            point.setX(newX);
        }
        if (!point.isYFunction()) {
            point.setY(newY);
        }
    }

    /**
     * Removes control point, if it exists.
     * @param point
     */
    removePoint(point: Point) {
        this.points = this.points.filter(point2 => point2 !== point);
        this.touch();
    }

    /**
     * Adds a control point to the end of this Curve.
     * @param {Point} point
     */
    addPoint(point: Point) {
        this.points.push(point);
        this.touch();
    }

    getConvexHull(): Point[] {
        return convexHull(this.getPoints());
    }

}
