import {Point} from "../../../bezeg/api/point/point";

/**
 * Class that wraps a JXG.Point into BezegPoint interface.
 */
export class JXGPointWrapper implements Point {
    readonly point: JXG.Point;

    constructor(point: JXG.Point) {
        this.point = point;
    }

    X(): number {
        return this.point.X();
    }

    Y(): number {
        return this.point.Y();
    }

    setX(x: number | (() => number)): void {
        if (typeof x == 'function') {
            throw "Not implemented yet";
        }
        this.point.setPositionDirectly(JXG.COORDS_BY_USER, [x, this.point.Y()]);
    }

    setY(y: number | (() => number)): void {
        if (typeof y == 'function') {
            throw "Not implemented yet";
        }
        this.point.setPositionDirectly(JXG.COORDS_BY_USER, [this.point.X(), y]);
    }

    isXFunction(): boolean {
        return false;
    }

    isYFunction(): boolean {
        return false;
    }
}
