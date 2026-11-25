// The lesson morph (task 07 slice 3a; design: docs/reviews/ux-picks-app-wide/briefs/notes/07-morph-design.md).
// Across a lesson step the declared range parameters glide from the old step's values to the new step's on the director's clock
// (250 ms, ease-out), as `animation` writes under one lease. Discrete and unbound state takes the new step's value at once. Framework-free:
// the arbiter, the clock and the frames are injected.
import type {Lease, LeaseEndReason, ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {easeOutCubic, GLIDE_MS} from './motion';

export interface MorphRange {
    readonly key: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    /** `false`: the key takes the new step's value at once (a range whose in-between values are not states). */
    readonly morph?: boolean;
}

export interface LessonMorphDeps {
    arbiter: ParameterArbiter;
    /** The declared range parameters of the present state that are bound to the arbiter. */
    rangeKeys(): readonly MorphRange[];
    /** The bound choice and count keys: a step that changes one of them morphs nothing. */
    structuralKeys?(): readonly string[];
    now?(): number;
    requestFrame?(callback: () => void): number;
    cancelFrame?(id: number): void;
    reducedMotion?(): boolean;
}

/** A frame later than this after the previous one is a slow redraw: the morph finishes at once. */
const MAX_FRAME_GAP_MS = 120;
/** A value that moves by no more than this share of its range is not a change. */
const CHANGE_TOLERANCE = 1e-9;
/** Lease ends that are not the learner or the lesson taking over a key. */
const QUIET_ENDS: readonly LeaseEndReason[] = ['frame', 'disposed', 'replaced', 'released'];

interface Moving {
    readonly range: MorphRange;
    readonly from: number;
    readonly to: number;
    /** The value this morph wrote last (what a learner's own write is told apart from). */
    shown: number;
}

interface Running {
    readonly lease: Lease;
    readonly moving: Moving[];
    readonly start: number;
    last: number;
}

const decimals = (value: number) => Math.round(value * 1e10) / 1e10;

export class LessonMorph {
    private readonly arbiter: ParameterArbiter;
    private readonly rangeKeys: () => readonly MorphRange[];
    private readonly structuralKeys: (() => readonly string[]) | undefined;
    private readonly now: () => number;
    private readonly requestFrame: (callback: () => void) => number;
    private readonly cancelFrame: (id: number) => void;
    private readonly reducedMotion: () => boolean;
    private running: Running | undefined;
    private frameId: number | undefined;
    private disposed = false;

    constructor(deps: LessonMorphDeps) {
        this.arbiter = deps.arbiter;
        this.rangeKeys = deps.rangeKeys;
        this.structuralKeys = deps.structuralKeys;
        this.now = deps.now ?? (() => performance.now());
        this.requestFrame = deps.requestFrame ?? (callback => requestAnimationFrame(callback));
        this.cancelFrame = deps.cancelFrame ?? (id => cancelAnimationFrame(id));
        this.reducedMotion = deps.reducedMotion ?? (() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    isRunning(): boolean {
        return this.running !== undefined;
    }

    /**
     * Runs `apply` (a step change, attributed `lesson` by the caller as today) and glides the range keys it changed from the
     * values shown before to the values it set. Everything else is at the new step's value when this returns.
     */
    step(apply: () => void): void {
        if (this.disposed || this.reducedMotion()) { apply(); return; }
        const ranges = this.rangeKeys().filter(range => range.morph !== false && this.numeric(range.key) !== undefined);
        const from = new Map(ranges.map(range => [range.key, this.numeric(range.key)!]));
        const structure = this.structure();
        apply();
        this.abandon(); // a morph the step did not end itself (no lease reset in between) does not survive it
        // A step that changes the setup (a choice or a count) does not morph: numbers between two setups are not a state of either.
        if (this.structure().some((value, index) => !Object.is(value, structure[index]))) return;
        const moving: Moving[] = [];
        for (const range of ranges) {
            const to = this.numeric(range.key);
            const start = from.get(range.key)!;
            if (to === undefined || Math.abs(to - start) <= CHANGE_TOLERANCE * Math.max(Math.abs(range.max - range.min), 1)) continue;
            moving.push({range, from: start, to, shown: to});
        }
        if (moving.length === 0) return;
        const lease = this.lease(moving);
        if (!lease) return;
        const now = this.now();
        const running: Running = {lease, moving, start: now, last: now};
        this.running = running;
        // The first painted frame is the old numbers with the new discrete state.
        for (const item of moving) {
            item.shown = item.from;
            if (lease.write(item.range.key, item.from).status !== 'applied') { this.finish(); return; }
        }
        this.frameId = this.requestFrame(() => this.tick());
    }

    /** Runs `read` with the morphing keys at their target values (an export or a "changed by the learner" comparison), then puts the shown values back. */
    atTargets<T>(read: () => T): T {
        const running = this.running;
        if (!running) return read();
        const shown = running.moving.map(item => item.shown);
        running.moving.forEach(item => running.lease.write(item.range.key, item.to));
        try {
            return read();
        } finally {
            if (this.running === running) running.moving.forEach((item, index) => { running.lease.write(item.range.key, shown[index]); });
        }
    }

    /** Ends the morph with every key at its target. */
    finish(): void {
        const running = this.running;
        if (!running) return;
        this.stopFrame();
        this.running = undefined;
        for (const item of running.moving) running.lease.write(item.range.key, item.to);
        running.lease.release();
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.abandon();
    }

    // ---- internals ---------------------------------------------------------------------------------------------------------

    private structure(): unknown[] {
        return (this.structuralKeys?.() ?? []).map(key => {
            try { return this.arbiter.read(key); } catch { return undefined; }
        });
    }

    private numeric(key: string): number | undefined {
        try {
            const value = this.arbiter.read(key);
            return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
        } catch {
            return undefined; // not bound (any longer)
        }
    }

    private lease(moving: Moving[]): Lease | undefined {
        const attempt = (items: Moving[]) => {
            const lease: {current?: Lease} = {};
            const made = this.arbiter.lease(items.map(item => item.range.key), reason => this.leaseEnded(lease.current, reason));
            lease.current = made;
            return made;
        };
        let made = attempt(moving);
        if (!made) {
            // The learner holds a key: that key does not morph, the others still do.
            const free = moving.filter(item => !this.arbiter.isHeld(item.range.key));
            if (free.length === 0 || free.length === moving.length) return undefined;
            moving.splice(0, moving.length, ...free);
            made = attempt(moving);
        }
        return made;
    }

    private tick(): void {
        this.frameId = undefined;
        const running = this.running;
        if (!running || this.disposed) return;
        const now = this.now();
        if (now - running.last > MAX_FRAME_GAP_MS) { this.finish(); return; }
        running.last = now;
        const t = Math.min(1, Math.max(0, (now - running.start) / GLIDE_MS));
        if (t >= 1) { this.finish(); return; }
        const k = easeOutCubic(t);
        for (const item of running.moving) {
            const {min, max, step} = item.range;
            const raw = item.from + (item.to - item.from) * k;
            const snapped = step > 0 ? min + Math.round((raw - min) / step) * step : raw;
            const value = decimals(Math.min(max, Math.max(min, snapped)));
            if (running.lease.write(item.range.key, value).status !== 'applied') { this.finish(); return; }
            item.shown = value;
        }
        if (this.running === running) this.frameId = this.requestFrame(() => this.tick());
    }

    private leaseEnded(lease: Lease | undefined, reason: LeaseEndReason): void {
        const running = this.running;
        if (!running || running.lease !== lease) return;
        this.stopFrame();
        this.running = undefined;
        if (QUIET_ENDS.includes(reason)) return;
        // The learner (or the lesson) took a key: the other keys finish at once, and the key that was taken keeps its value.
        for (const item of running.moving) {
            if (Object.is(this.numeric(item.range.key), item.shown)) this.arbiter.write(item.range.key, item.to, 'lesson');
        }
    }

    /** Drops a running morph without writing: the values stay where they are shown. */
    private abandon(): void {
        const running = this.running;
        this.stopFrame();
        this.running = undefined;
        running?.lease.release();
    }

    private stopFrame(): void {
        if (this.frameId !== undefined) this.cancelFrame(this.frameId);
        this.frameId = undefined;
    }
}
