import {Point} from "../../api/point/point";

import {geometryCache} from "../../cache/GeometryCache";

export class FixedPoint implements Point {
    private readonly coords: () => [number, number];
    private cachedCoords: undefined | [number, number] = undefined;
    private lastGeometryRevision = geometryCache.revision;

    constructor(generatingFunction: () => [number, number]) {
        this.coords = generatingFunction;
    }

    X(): number {
        return this.getCoords()[0];
    }

    Y(): number {
        return this.getCoords()[1];
    }

    setX(x: number | (() => number)) {
        throw "JUST DONT DO THIS BROTHER PLS";
    }

    setY(y: number | (() => number)) {
        throw "JUST DONT DO THIS BROTHER PLS";
    }

    isXFunction(): boolean {
        return true;
    }

    isYFunction(): boolean {
        return true;
    }

    private getCoords() {
        const currentRevision = geometryCache.revision;
        if (!this.cachedCoords || currentRevision !== this.lastGeometryRevision) {
            this.cachedCoords = this.coords();
            this.lastGeometryRevision = currentRevision;
        }
        return this.cachedCoords;
    }

}
