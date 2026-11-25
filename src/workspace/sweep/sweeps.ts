// Sweeps (task 06 slice 5): a parameter that moves by itself under an `animation` lease on its key.
// The arbiter does the excluding: a learner write, hold or typed value, Esc, a lesson frame change, or a playback leasing the same key ends the
// lease, and the next frame finds it ended. Several sweeps run at once, one lease each.
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import type {Lease, ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {countSweepValue, planCountSweep, planRangeSweep, rangeSweepValue} from './sweepModel';

export type SweepParameter = RangeParameter | CountParameter;

const browserScheduler: AnimationScheduler = {
    request: callback => window.requestAnimationFrame(callback),
    cancel: handle => window.cancelAnimationFrame(handle),
};

interface Running {readonly lease: Lease; handle?: number; origin?: number}

/** The sweeps of one graph's arbiter. */
export class Sweeps {
    private readonly running = new Map<string, Running>();
    private readonly listeners = new Set<() => void>();

    constructor(private readonly arbiter: ParameterArbiter, private readonly scheduler: AnimationScheduler = browserScheduler) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };

    isRunning(key: string): boolean {
        return this.running.has(key);
    }

    toggle(parameter: SweepParameter): void {
        if (this.isRunning(parameter.key)) this.stop(parameter.key); else this.start(parameter);
    }

    /** Starts sweeping `parameter` from its current value; nothing happens when the learner holds the key or it is not bound. */
    start(parameter: SweepParameter): boolean {
        const key = parameter.key;
        if (this.running.has(key) || !this.arbiter.keys().includes(key)) return false;
        const start = Number(this.arbiter.read(key));
        if (!Number.isFinite(start)) return false;
        const entry: {lease?: Lease} = {};
        const lease = this.arbiter.lease([key], () => this.ended(key, entry.lease));
        if (!lease) return false;
        entry.lease = lease;
        const sweep: Running = {lease};
        this.running.set(key, sweep);
        const value = parameter.kind === 'range'
            ? (() => { const plan = planRangeSweep(parameter, start); return (elapsed: number) => rangeSweepValue(parameter, plan, elapsed); })()
            : (() => { const plan = planCountSweep(parameter, start); return (elapsed: number) => countSweepValue(plan, elapsed); })();
        const frame = (time: number) => {
            sweep.handle = undefined;
            sweep.origin ??= time;
            const next = value(time - sweep.origin);
            if (!Number.isFinite(next)) { lease.release(); return; }
            if (next !== Number(this.arbiter.read(key))) {
                // A refusal (held, lease ended, the setter's own) ends the sweep: it never fights for the key.
                if (lease.write(key, next).status !== 'applied') { lease.release(); return; }
            }
            if (this.running.get(key) === sweep) sweep.handle = this.scheduler.request(frame);
        };
        sweep.handle = this.scheduler.request(frame);
        this.notify();
        return true;
    }

    stop(key: string): void {
        this.running.get(key)?.lease.release();
    }

    stopAll(): void {
        for (const running of [...this.running.values()]) running.lease.release();
    }

    private ended(key: string, lease: Lease | undefined): void {
        const sweep = this.running.get(key);
        if (!sweep || (lease && sweep.lease !== lease)) return;
        this.running.delete(key);
        if (sweep.handle !== undefined) this.scheduler.cancel(sweep.handle);
        this.notify();
    }

    private notify(): void {
        for (const listener of [...this.listeners]) listener();
    }
}

const registry = new WeakMap<ParameterArbiter, Sweeps>();

/** The sweeps of `arbiter` (one set per arbiter; the arbiter's disposal ends its leases and so its sweeps). */
export function sweepsFor(arbiter: ParameterArbiter): Sweeps {
    let sweeps = registry.get(arbiter);
    if (!sweeps) { sweeps = new Sweeps(arbiter); registry.set(arbiter, sweeps); }
    return sweeps;
}
