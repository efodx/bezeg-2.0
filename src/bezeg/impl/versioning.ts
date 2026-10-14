/**
 * Version stamps for cache validity of derived geometry.
 *
 * Every mutation of a point or curve takes a fresh stamp from one strictly
 * increasing counter. The counter only guarantees uniqueness; it never broadcasts
 * an invalidation, so a change in one object leaves unrelated objects' caches intact.
 *
 * An object's `version()` is the largest stamp among itself and everything it
 * depends on, so it changes exactly when any of them changes (a replaced
 * dependency also brings a fresher stamp through its owner's structural stamp).
 * `VOLATILE` marks values whose inputs are unknown (for example a point backed
 * by an arbitrary closure or by a foreign `Point` implementation without
 * `version()`); a cache must treat them as always stale.
 */
export const VOLATILE = -1;

export interface Versioned {
    version(): number;
}

/** Anything that may report a version; a missing `version()` means volatile. */
export type MaybeVersioned = { version?(): number };

let counter = 0;

export function nextVersion(): number {
    return ++counter;
}

/**
 * The newest stamp handed out so far. Every version in the system is a stamp from
 * `nextVersion()`, so while this value is unchanged no version can have changed and a
 * memoized non-volatile `version()` may be returned without rescanning dependencies.
 * Custom `version()` implementations must therefore only change by taking a new stamp.
 */
export function currentStamp(): number {
    return counter;
}

/** Stamp value that never matches `currentStamp()`: marks an empty version memo. */
export const NO_MEMO = -1;

/** Version of any object that may implement `Versioned`; missing means volatile. */
export function versionOf(value: MaybeVersioned): number {
    return value.version ? value.version() : VOLATILE;
}

/** Largest version of `start` and the dependencies, or VOLATILE if any dependency is volatile. */
export function maxVersion(dependencies: ReadonlyArray<MaybeVersioned>, start: number): number {
    let result = start;
    for (let i = 0; i < dependencies.length; i++) {
        const v = versionOf(dependencies[i]);
        if (v === VOLATILE) {
            return VOLATILE;
        }
        if (v > result) {
            result = v;
        }
    }
    return result;
}

/**
 * A value computed from `dependencies` and recomputed only when their combined version changes.
 * Never cached while any dependency is volatile. One memo can feed many derived points, so a
 * vector-valued computation runs once per version instead of once per coordinate or element.
 */
export class VersionedMemo<T> {
    private cachedVersion = VOLATILE;
    private hasValue = false;
    private value!: T;

    constructor(private readonly compute: () => T,
                private readonly dependencies: ReadonlyArray<MaybeVersioned>) {
    }

    get(): T {
        const version = maxVersion(this.dependencies, 0);
        if (version === VOLATILE) {
            return this.compute();
        }
        if (!this.hasValue || version !== this.cachedVersion) {
            this.value = this.compute();
            this.cachedVersion = version;
            this.hasValue = true;
        }
        return this.value;
    }
}
