import {Point} from "../../api/point/point";

import {geometryCache} from "../../cache/GeometryCache";

export class PointImpl implements Point {
    private x: number | (() => number);
    private y: number | (() => number);
    private changeListeners?: Set<() => void>;
    private lastGeometryRevisionX = geometryCache.revision;
    private cachedX?: number = undefined;
    private cachedY?: number = undefined;
    private lastGeometryRevisionY = geometryCache.revision;

    constructor(x: number | (() => number), y: number | (() => number)) {
        this.x = x;
        this.y = y;
    }

    X(): number {
        if (typeof this.x == 'number') {
            return this.x;
        }
        const currentRevision = geometryCache.revision;
        if (this.cachedX === undefined || currentRevision !== this.lastGeometryRevisionX) {
            this.cachedX = this.x();
            this.lastGeometryRevisionX = currentRevision;
        }
        return this.cachedX!;
    }

    Y(): number {
        if (typeof this.y == 'number') {
            return this.y;
        }
        const currentRevision = geometryCache.revision;
        if (this.cachedY === undefined || currentRevision !== this.lastGeometryRevisionY) {
            this.cachedY = this.y();
            this.lastGeometryRevisionY = currentRevision;
        }
        return this.cachedY!;
    }

    setX(x: number | (() => number)) {
        this.x = x;
        geometryCache.invalidate();
        this.notifyChanged();
    }

    setY(y: number | (() => number)) {
        this.y = y;
        geometryCache.invalidate();
        this.notifyChanged();
    }

    setCoordinates(x: number, y: number) {
        this.x = x;
        this.y = y;
        geometryCache.invalidate();
        this.notifyChanged();
    }

    subscribe(listener: () => void): () => void {
        if (!this.changeListeners) {
            this.changeListeners = new Set();
        }
        this.changeListeners.add(listener);
        return () => this.changeListeners?.delete(listener);
    }

    isXFunction(): boolean {
        return typeof this.x === "function";
    }

    isYFunction(): boolean {
        return typeof this.y === "function";
    }

    private notifyChanged() {
        this.changeListeners?.forEach(listener => listener());
    }

}
