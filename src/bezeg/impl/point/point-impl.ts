import {Point} from "../../api/point/point";
import {currentStamp, MaybeVersioned, maxVersion, NO_MEMO, nextVersion, Versioned, VOLATILE} from "../versioning";

/**
 * Mutable point.
 *
 * Versioning: numeric coordinates carry a version stamp refreshed by every setter.
 * A function-backed coordinate is VOLATILE (recomputed on every read, version() is
 * VOLATILE) unless the point declares `dependencies`: the objects the functions
 * read. Then version() is the newest stamp among the point and its dependencies
 * and the computed value is cached until that changes. An incomplete dependency
 * list leaves the cache stale, so list everything the functions read.
 */
export class PointImpl implements Point, Versioned {
    private x: number | (() => number);
    private y: number | (() => number);
    private z: number | (() => number);
    private changeListeners?: Set<() => void>;
    private ownVersion = nextVersion();
    private dependencies?: ReadonlyArray<MaybeVersioned>;
    private versionMemoStamp = NO_MEMO;
    private versionMemo = VOLATILE;
    private cachedX = 0;
    private cachedXVersion = VOLATILE;
    private cachedY = 0;
    private cachedYVersion = VOLATILE;
    private cachedZ = 0;
    private cachedZVersion = VOLATILE;

    constructor(x: number | (() => number), y: number | (() => number),
                dependencies?: ReadonlyArray<MaybeVersioned>, z: number | (() => number) = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.dependencies = dependencies;
    }

    /**
     * A point computed from other geometry as one [x, y] or [x, y, z] function. `compute` runs once per
     * version for every coordinate instead of once per coordinate. Declare `dependencies`
     * (or call `dependOn` later) to make the result cacheable; without them it is volatile
     * and `compute` runs on every read, as with two separate closures.
     */
    static derived(compute: () => readonly [number, number] | readonly [number, number, number],
                   dependencies?: ReadonlyArray<MaybeVersioned>): PointImpl {
        let memoVersion = VOLATILE;
        let memo: readonly [number, number] | readonly [number, number, number] = [0, 0];
        const read = (): readonly [number, number] | readonly [number, number, number] => {
            const version = point.version();
            if (version === VOLATILE) {
                return compute();
            }
            if (version !== memoVersion) {
                memo = compute();
                memoVersion = version;
            }
            return memo;
        };
        const point: PointImpl = new PointImpl(() => read()[0], () => read()[1], dependencies, () => read()[2] ?? 0);
        return point;
    }

    /** Declares the objects whose changes the coordinate functions react to. */
    dependOn(dependencies: ReadonlyArray<MaybeVersioned>) {
        this.dependencies = dependencies;
        this.ownVersion = nextVersion();
    }

    version(): number {
        if (typeof this.x === 'number' && typeof this.y === 'number' && typeof this.z === 'number') {
            return this.ownVersion;
        }
        if (!this.dependencies) {
            return VOLATILE;
        }
        const stamp = currentStamp();
        if (stamp === this.versionMemoStamp) {
            return this.versionMemo;
        }
        const version = maxVersion(this.dependencies, this.ownVersion);
        if (version !== VOLATILE) {
            this.versionMemoStamp = stamp;
            this.versionMemo = version;
        }
        return version;
    }

    X(): number {
        if (typeof this.x == 'number') {
            return this.x;
        }
        const version = this.dependencies ? this.version() : VOLATILE;
        if (version === VOLATILE) {
            return this.x();
        }
        if (version !== this.cachedXVersion) {
            this.cachedX = this.x();
            this.cachedXVersion = version;
        }
        return this.cachedX;
    }

    Y(): number {
        if (typeof this.y == 'number') {
            return this.y;
        }
        const version = this.dependencies ? this.version() : VOLATILE;
        if (version === VOLATILE) {
            return this.y();
        }
        if (version !== this.cachedYVersion) {
            this.cachedY = this.y();
            this.cachedYVersion = version;
        }
        return this.cachedY;
    }

    Z(): number {
        if (typeof this.z === 'number') return this.z;
        const version = this.dependencies ? this.version() : VOLATILE;
        if (version === VOLATILE) return this.z();
        if (version !== this.cachedZVersion) {
            this.cachedZ = this.z();
            this.cachedZVersion = version;
        }
        return this.cachedZ;
    }

    setX(x: number | (() => number)) {
        if (typeof x === 'function') {
            this.dependencies = undefined;
        }
        this.x = x;
        this.ownVersion = nextVersion();
        this.notifyChanged();
    }

    setY(y: number | (() => number)) {
        if (typeof y === 'function') {
            this.dependencies = undefined;
        }
        this.y = y;
        this.ownVersion = nextVersion();
        this.notifyChanged();
    }

    setZ(z: number | (() => number)) {
        if (typeof z === 'function') this.dependencies = undefined;
        this.z = z;
        this.ownVersion = nextVersion();
        this.notifyChanged();
    }

    setCoordinates(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.ownVersion = nextVersion();
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
