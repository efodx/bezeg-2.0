export interface Point {
    X(): number;

    Y(): number;

    /** Optional height coordinate; implementations without it are planar (z = 0). */
    Z?(): number;

    setX(x: number | (() => number)): void;

    setY(y: number | (() => number)): void;

    setZ?(z: number | (() => number)): void;

    isYFunction(): boolean;

    isXFunction(): boolean;

    /**
     * Cache version: changes whenever the coordinates may have changed, and is
     * `VOLATILE` (-1) when the inputs are unknown. Implementations without it are
     * treated as volatile, so derived values are never cached on top of them.
     */
    version?(): number;
}
