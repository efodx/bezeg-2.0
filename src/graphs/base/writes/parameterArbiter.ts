import {activeGesture, currentWrite, onLearnerGestureEnd, outranks, runAs, type WriteLeaseRef, type WriteSource} from "./writeSource";

/**
 * Decides between the writers of one graph's declared parameters ([parameter writes](../../../../docs/specs/parameter-writes.md),
 * ADR 0064). Pure: no React, no JSXGraph.
 *
 * A graph keeps its own validated setters. Each parameter key is bound to a reader and to that setter
 * ({@link ParameterBinding}); the arbiter never stores a value of its own, so a read right after a write returns
 * what the setter applied.
 *
 * Sources and priority: `learner` > `lesson` > `animation` (see `writeSource.ts`).
 *
 * What "holds" means. The learner holds a key
 * - from pointer or key down on its control or board element until release: {@link hold} for a control that knows
 *   its key, and, for the board and controls that do not, every key that changes during an open learner gesture is
 *   held from that change until the gesture ends;
 * - while a typed entry for it is being edited ({@link hold} from focus until commit or cancel).
 * While a key is held, `lesson` and `animation` writes to it are refused. Outside a hold the learner wins only
 * against leases (any learner change of a key ends the leases on it); a later `lesson` write may change the key again.
 *
 * Leases. An animation (playback, sweep, glide) moves its keys under a {@link Lease}. A new lease ends older leases on
 * the same keys. A `learner` or `lesson` change of a leased key, a learner hold of it, and a lesson frame change
 * ({@link endAllLeases}) end the lease at once and call its `onEnd`, so the animation's control can show that it
 * stopped. A lease cannot start on a held key, except that a lease started inside a learner gesture (pressing Play)
 * is not blocked by what that same gesture changed.
 *
 * Outcomes of {@link write} are separate: applied; refused by the arbiter (a higher source holds the key, or the
 * animation's lease has ended); refused by the domain (the setter's own error, value and leases unchanged).
 *
 * Untagged writes. {@link observe} runs after every scene store change (and whenever a binding's own change channel
 * fires). A bound key whose value changed while no source is open is an untagged write; in strict mode (tests and
 * development) it throws {@link UntaggedWriteError}. An `animation` scope that changes a key outside its lease throws
 * too. Outside strict mode both are accepted silently.
 */

export interface ParameterBinding<V = unknown> {
    /** The key's one authoritative value (it may be a per-frame live value kept out of React rendering). */
    read(): V;
    /** The graph's existing validated setter; throws the graph's domain error to refuse. */
    apply(value: V): void;
    /** Value equality for change detection; defaults to `Object.is`. */
    equals?(a: V, b: V): boolean;
    /**
     * The value's own change channel when it can change outside the scene store (a per-frame live value). The arbiter
     * observes on it, as it does after every store change.
     */
    subscribe?(listener: () => void): () => void;
}

export type WriteResult =
    | { readonly status: "applied" }
    | { readonly status: "refused-arbiter"; readonly reason: "held" | "lease-ended" | "not-leased" }
    | { readonly status: "refused-domain"; readonly error: Error };

export type LeaseEndReason = WriteSource | "frame" | "replaced" | "released" | "disposed";

export interface Lease extends WriteLeaseRef {
    /** Writes one of the lease's keys as `animation`. */
    write(key: string, value: unknown): WriteResult;
    /** Runs `work` as an `animation` scope of this lease if it is still active; returns whether it ran. */
    run(work: () => void): boolean;
    /** Ends the lease normally (the animation finished or was stopped by its own control). */
    release(): void;
}

export class UntaggedWriteError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UntaggedWriteError";
    }
}

export interface ParameterArbiterOptions {
    /** Whether an error thrown by a setter is the graph's domain refusal (anything else is rethrown). */
    isDomainError(error: unknown): boolean;
    /** Throw on untagged writes and on animation writes outside the lease. */
    strict: boolean;
    /** Graph name for error messages. */
    owner?: string;
}

interface Entry {
    readonly binding: ParameterBinding;
    last: unknown;
    /** Explicit holds (control hold, typed entry). */
    holds: number;
    /** The learner gesture during which the key last changed; held while that gesture is open. */
    gestureHold?: number;
    unbind?: () => void;
}

class LeaseImpl implements Lease {
    active = true;

    constructor(
        private readonly arbiter: ParameterArbiter,
        readonly keys: ReadonlySet<string>,
        readonly onEnd: (reason: LeaseEndReason) => void,
        /** The learner gesture that started this lease (pressing Play): its own holds do not block the lease. */
        readonly gesture: number | undefined,
    ) {
    }

    write(key: string, value: unknown): WriteResult {
        return this.arbiter.write(key, value, "animation", this);
    }

    run(work: () => void): boolean {
        if (!this.active) return false;
        runAs("animation", () => {
            work();
            // Attribute the frame's changes inside its own scope, also those outside the scene store (a live value).
            this.arbiter.observe();
        }, this);
        return true;
    }

    release(): void {
        this.arbiter.endLease(this, "released");
    }
}

export class ParameterArbiter {
    private readonly entries = new Map<string, Entry>();
    private readonly leases = new Set<LeaseImpl>();
    private readonly stopGestureListener: () => void;
    private observing = false;
    private observeAgain = false;

    constructor(private readonly options: ParameterArbiterOptions) {
        this.stopGestureListener = onLearnerGestureEnd(id => {
            for (const entry of this.entries.values()) if (entry.gestureHold === id) entry.gestureHold = undefined;
        });
    }

    /** Binds `key`; its current value becomes the baseline. Returns the unbind function. */
    bind<V>(key: string, binding: ParameterBinding<V>): () => void {
        if (this.entries.has(key)) throw new Error(`Parameter "${key}" is already bound${this.where()}.`);
        const entry: Entry = {binding: binding as ParameterBinding, last: binding.read(), holds: 0};
        this.entries.set(key, entry);
        const unsubscribe = binding.subscribe?.(() => this.observe());
        entry.unbind = () => {
            unsubscribe?.();
            if (this.entries.get(key) === entry) this.entries.delete(key);
        };
        return entry.unbind;
    }

    keys(): string[] {
        return [...this.entries.keys()];
    }

    read(key: string): unknown {
        return this.require(key).binding.read();
    }

    isHeld(key: string): boolean {
        const entry = this.require(key);
        return entry.holds > 0 || (entry.gestureHold !== undefined && entry.gestureHold === activeGesture());
    }

    /** Whether the learner holds `key` against an animation: a gesture's holds do not block the lease it started. */
    private isHeldAgainst(key: string, lease: { readonly gesture: number | undefined }): boolean {
        const entry = this.require(key);
        if (entry.holds > 0) return true;
        const gesture = entry.gestureHold;
        return gesture !== undefined && gesture === activeGesture() && gesture !== lease.gesture;
    }

    /** Writes `value` to `key` as `source`; an `animation` write names its lease. */
    write(key: string, value: unknown, source: WriteSource, lease?: Lease): WriteResult {
        const entry = this.require(key);
        if (source === "animation") {
            const own = lease as LeaseImpl | undefined;
            if (!own || !own.active) return {status: "refused-arbiter", reason: "lease-ended"};
            if (!own.keys.has(key)) return {status: "refused-arbiter", reason: "not-leased"};
        }
        if (source === "lesson" && this.isHeld(key)) return {status: "refused-arbiter", reason: "held"};
        if (source === "animation" && this.isHeldAgainst(key, lease as LeaseImpl)) return {status: "refused-arbiter", reason: "held"};
        try {
            runAs(source, () => {
                entry.binding.apply(value);
                this.observe();
            }, source === "animation" ? lease : undefined);
        } catch (error) {
            if (this.options.isDomainError(error)) return {status: "refused-domain", error: error as Error};
            throw error;
        }
        // A deliberate write ends the lower leases on the key even when the value did not change.
        if (source !== "animation") this.endLeasesOn(key, source);
        this.observe();
        return {status: "applied"};
    }

    /**
     * Holds `key` for the learner (pointer or key down on its control, a typed entry being edited) and ends the
     * leases on it. Returns the idempotent release function.
     */
    hold(key: string): () => void {
        const entry = this.require(key);
        entry.holds++;
        this.endLeasesOn(key, "learner");
        let held = true;
        return () => {
            if (!held) return;
            held = false;
            entry.holds--;
        };
    }

    /**
     * Starts an animation lease on `keys`. Older leases on any of them end (`replaced`). Returns `undefined` when the
     * learner holds one of the keys.
     */
    lease(keys: Iterable<string>, onEnd: (reason: LeaseEndReason) => void = () => undefined): Lease | undefined {
        const set = new Set(keys);
        const write = currentWrite();
        const gesture = write?.source === "learner" ? activeGesture() : undefined;
        for (const key of set) if (this.isHeldAgainst(key, {gesture})) return undefined;
        for (const other of [...this.leases]) if ([...set].some(key => other.keys.has(key))) this.endLease(other, "replaced");
        const lease = new LeaseImpl(this, set, onEnd, gesture);
        this.leases.add(lease);
        return lease;
    }

    /** Ends every lease: a lesson frame change, or the graph's teardown. */
    endAllLeases(reason: LeaseEndReason = "frame"): void {
        for (const lease of [...this.leases]) this.endLease(lease, reason);
    }

    /** Ends one lease and calls its `onEnd` once. */
    endLease(lease: Lease, reason: LeaseEndReason): void {
        const own = lease as LeaseImpl;
        if (!own.active) return;
        own.active = false;
        this.leases.delete(own);
        own.onEnd(reason);
    }

    activeLeases(): readonly Lease[] {
        return [...this.leases];
    }

    /**
     * Compares every bound key with its last observed value and attributes the changes to the current source:
     * `learner` and `lesson` changes end the leases on the key (a change inside an open learner gesture also holds
     * the key until the gesture ends); an untagged change, or an `animation` change outside its lease, throws in
     * strict mode. Call after every scene store change.
     */
    observe(): void {
        if (this.observing) {
            // A lease's onEnd (or a setter it calls) changed the store while this pass ran: look again afterwards.
            this.observeAgain = true;
            return;
        }
        this.observing = true;
        try {
            for (let pass = 0; pass < 8; pass++) {
                this.observeAgain = false;
                this.observeOnce();
                if (!this.observeAgain) return;
            }
            throw new Error(`Parameter writes did not settle${this.where()}: lease end handlers keep changing bound keys.`);
        } finally {
            this.observing = false;
        }
    }

    private observeOnce(): void {
        const write = currentWrite();
        const violations: string[] = [];
        for (const [key, entry] of this.entries) {
            const value = entry.binding.read();
            const equals = entry.binding.equals ?? Object.is;
            if (equals(value, entry.last)) continue;
            entry.last = value;
            if (!write) {
                violations.push(`"${key}" changed outside any write source`);
            } else if (write.source === "animation") {
                if (!write.lease?.keys.has(key)) violations.push(`"${key}" changed by an animation that does not lease it`);
            } else {
                this.endLeasesOn(key, write.source);
                const gesture = activeGesture();
                if (write.source === "learner" && gesture !== undefined) entry.gestureHold = gesture;
            }
        }
        if (violations.length > 0 && this.options.strict) {
            throw new UntaggedWriteError(`Untagged parameter write${this.where()}: ${violations.join("; ")}.`);
        }
    }

    /**
     * Takes the current values as the baseline without attributing them, for a graph's own setup before it is
     * ready (its first scene). Never call it to silence an untagged write.
     */
    adoptCurrentValues(): void {
        for (const entry of this.entries.values()) entry.last = entry.binding.read();
    }

    dispose(): void {
        this.endAllLeases("disposed");
        this.stopGestureListener();
        for (const entry of [...this.entries.values()]) entry.unbind?.();
        this.entries.clear();
    }

    private endLeasesOn(key: string, by: WriteSource): void {
        for (const lease of [...this.leases]) {
            if (lease.keys.has(key) && outranks(by, "animation")) this.endLease(lease, by);
        }
    }

    private require(key: string): Entry {
        const entry = this.entries.get(key);
        if (!entry) throw new Error(`Parameter "${key}" is not bound${this.where()}.`);
        return entry;
    }

    private where(): string {
        return this.options.owner ? ` in ${this.options.owner}` : "";
    }
}
