import {Point} from "../../api/point/point";
import {currentStamp, MaybeVersioned, maxVersion, NO_MEMO, nextVersion, Versioned, VOLATILE} from "../versioning";

/**
 * Point whose coordinates are always computed. Without `dependencies` it is
 * VOLATILE: recomputed on every read and version() is VOLATILE. With them, the
 * result is cached until one of the dependencies changes.
 */
export class FixedPoint implements Point, Versioned {
    private readonly coords: () => [number, number] | [number, number, number];
    private readonly dependencies?: ReadonlyArray<MaybeVersioned>;
    private readonly ownVersion = nextVersion();
    private cachedCoords: undefined | [number, number] | [number, number, number] = undefined;
    private cachedVersion = VOLATILE;
    private versionMemoStamp = NO_MEMO;
    private versionMemo = VOLATILE;

    constructor(generatingFunction: () => [number, number] | [number, number, number], dependencies?: ReadonlyArray<MaybeVersioned>) {
        this.coords = generatingFunction;
        this.dependencies = dependencies;
    }

    version(): number {
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
        return this.getCoords()[0];
    }

    Y(): number {
        return this.getCoords()[1];
    }

    Z(): number {
        return this.getCoords()[2] ?? 0;
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

    private getCoords(): [number, number] | [number, number, number] {
        const version = this.version();
        if (version === VOLATILE) {
            return this.coords();
        }
        if (!this.cachedCoords || version !== this.cachedVersion) {
            this.cachedCoords = this.coords();
            this.cachedVersion = version;
        }
        return this.cachedCoords;
    }

}
