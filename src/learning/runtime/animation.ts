import type {Lease, LeaseEndReason, ParameterArbiter} from "../../graphs/base/writes/parameterArbiter";

export interface AnimationScheduler {
    request(callback: FrameRequestCallback): number;
    cancel(handle: number): void;
}

const browserScheduler: AnimationScheduler = {
    request: callback => window.requestAnimationFrame(callback),
    cancel: handle => window.cancelAnimationFrame(handle),
};

/**
 * The parameters a playback moves, so it writes them as `animation` under a lease (ADR 0064). A learner or lesson
 * write to a leased key, a learner hold of it, or a lesson frame change ends the lease; the driver then stops and
 * calls `onInterrupted` so the playback control can show that it stopped.
 */
export interface AnimationLeaseSpec {
    /** The graph's arbiter; undefined while the graph binds no parameters (frames then run untagged). */
    arbiter: () => ParameterArbiter | undefined;
    /** Keys the frames change; keys the arbiter does not bind are ignored. */
    keys: readonly string[];
    onInterrupted?: (reason: LeaseEndReason) => void;
}

/** A small lifecycle-aware requestAnimationFrame driver. */
export class AnimationDriver {
    private handle: number | undefined;
    private leaseSpec: AnimationLeaseSpec | undefined;
    private lease: Lease | undefined;
    private running = false;
    private paused = false;
    private previousTime: DOMHighResTimeStamp | undefined;

    constructor(
        private readonly onFrame: (delta: number, time: DOMHighResTimeStamp) => void,
        private readonly scheduler: AnimationScheduler = browserScheduler,
    ) {}

    /** Frames then run as `animation` writes under a lease on `spec.keys`, taken at each play. */
    useLease(spec: AnimationLeaseSpec): this {
        this.leaseSpec = spec;
        return this;
    }

    /** Starts or resumes; does nothing while the learner holds one of the leased keys. */
    play() {
        if (this.running) return;
        if (!this.acquireLease()) return;
        this.running = true;
        this.paused = false;
        this.previousTime = undefined;
        this.schedule();
    }

    pause() {
        if (!this.running) return;
        this.running = false;
        this.paused = true;
        this.cancelFrame();
        this.releaseLease();
    }

    stop() {
        this.running = false;
        this.paused = false;
        this.previousTime = undefined;
        this.cancelFrame();
        this.releaseLease();
    }

    replay() {
        this.stop();
        this.play();
    }

    dispose() {
        this.stop();
    }

    isRunning() {
        return this.running;
    }

    isPaused() {
        return this.paused;
    }

    private schedule() {
        if (this.running) {
            this.handle = this.scheduler.request(time => this.frame(time));
        }
    }

    private frame(time: DOMHighResTimeStamp) {
        this.handle = undefined;
        if (!this.running) return;
        const delta = this.previousTime === undefined ? 0 : time - this.previousTime;
        this.previousTime = time;
        const lease = this.lease;
        if (lease) {
            if (!lease.run(() => this.onFrame(delta, time))) return;
        } else {
            this.onFrame(delta, time);
        }
        this.schedule();
    }

    private acquireLease(): boolean {
        const spec = this.leaseSpec;
        const arbiter = spec?.arbiter();
        if (!spec || !arbiter) return true;
        const bound = new Set(arbiter.keys());
        const unbound = spec.keys.filter(key => !bound.has(key));
        // Production leases what is bound; a lesson that names a key the graph never bound is a bug the developer should see.
        if (unbound.length > 0 && import.meta.env.DEV) throw new Error(`Animation lease names unbound parameter keys: ${unbound.join(", ")}`);
        const lease = arbiter.lease(spec.keys.filter(key => bound.has(key)), reason => {
            if (this.lease !== lease) return;
            // A higher write took a leased key (or a frame changed): stop at once and say so.
            this.lease = undefined;
            this.stop();
            spec.onInterrupted?.(reason);
        });
        this.lease = lease;
        return lease !== undefined;
    }

    private releaseLease() {
        const lease = this.lease;
        this.lease = undefined;
        lease?.release();
    }

    private cancelFrame() {
        if (this.handle !== undefined) {
            this.scheduler.cancel(this.handle);
            this.handle = undefined;
        }
    }
}
