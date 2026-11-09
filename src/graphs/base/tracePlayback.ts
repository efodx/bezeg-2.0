import type {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import type {TraceControls} from "../compgeo/traceLessonActions";

/** The documented step limit of the controller: far above the longest trace of any trace graph. */
const MAX_PLAYBACK_STEPS = 100000;

/**
 * What a trace graph supplies to its playback: live access to the run and to the step index, which lives in the
 * `SceneStore` (never in the policy), and the few graph-level reactions. The mathematics stay in the algorithm's run.
 */
export interface TracePlaybackHost {
    /** Number of trace events of the current run; 0 for a refused or empty input (then nothing advances). */
    runLength(): number;
    /** The step index in the store, clamped to the current run. */
    step(): number;
    /**
     * Writes the step index to the scene store; the graph's `setState` calls `TracePlayback.settle` for it. A graph whose
     * run length is only known by taking the step (the function iterations) may return the outcome of the step it took;
     * `advance()` then uses it instead of comparing with `runLength()`.
     */
    writeStep(step: number): IterationOutcome | void;
    /** True while a figure export is running; Next step and Play are refused then. */
    exportBusy(): boolean;
    requestRender(): void;
    /** The tick of the current configuration; read when a controller is created and before Next step or Play. */
    intervalMs(): number;
}

/**
 * The shared playback policy of the hull and interval-sweep trace graphs (task 3). It composes the existing
 * `IterationController` (scheduling, one step per interval, never catching up) with the graph's store-held step index:
 *
 * - Next step and every Play tick run the one `advance()`, so both reach the same final step; both end at the last event.
 * - Next step and Play are no-ops at the end of the run and for an empty run; Play never starts a finished trace.
 * - Any write of a new model returns the step to 0 and resets the controller (the graph reports it through `settle`);
 *   a step written outside `advance()` (a restore, a lesson action) also resets it, so a finished controller restarts.
 * - Scene replacement, figure capture and lesson stop pause; unmount disposes the controller and `mount` creates a fresh
 *   one (React StrictMode remounts), so no scheduler callback stays pending.
 */
export class TracePlayback implements TraceControls {
    private controller: IterationController;
    private disposed = false;
    private interval: number;
    private advancing = false;

    constructor(private readonly host: TracePlaybackHost, private readonly scheduler?: AnimationScheduler) {
        this.interval = host.intervalMs();
        this.controller = this.create();
    }

    get isPlaying(): boolean {
        return this.controller.isPlaying();
    }

    private create(): IterationController {
        this.interval = this.host.intervalMs();
        return new IterationController({
            transition: () => this.advance(),
            stepIntervalMs: this.interval,
            maxIterations: MAX_PLAYBACK_STEPS,
            onComplete: () => this.host.requestRender(),
            scheduler: this.scheduler,
        });
    }

    /** The controller's interval is fixed at construction, so an idle controller of another tick is replaced before it runs. */
    private syncInterval(): void {
        if (this.disposed || this.interval === this.host.intervalMs()) return;
        this.controller.dispose();
        this.controller = this.create();
    }

    private get atEnd(): boolean {
        return this.host.step() >= this.host.runLength() - 1;
    }

    /** The one transition of Next step and of every playback tick. */
    private advance(): IterationOutcome {
        const last = this.host.runLength() - 1;
        const next = Math.min(this.host.step() + 1, Math.max(last, 0));
        let outcome: IterationOutcome | void;
        this.advancing = true;
        try {
            outcome = this.host.writeStep(next);
        } finally {
            this.advancing = false;
        }
        this.host.requestRender();
        return outcome ?? (next >= last ? "complete" : "continue");
    }

    nextStep(): void {
        if (this.host.exportBusy() || this.atEnd) return;
        this.syncInterval();
        this.controller.pause();
        this.controller.nextStep();
        this.host.requestRender();
    }

    play(): void {
        if (this.host.exportBusy() || this.atEnd) return;
        this.syncInterval();
        this.controller.play();
        this.host.requestRender();
    }

    pause(): void {
        this.controller.pause();
        this.host.requestRender();
    }

    /** Back to step 0; playback stops. */
    resetTrace(): void {
        this.controller.reset(0);
        this.host.writeStep(0);
        this.host.requestRender();
    }

    /** Pauses without a render request: the hook of scene replacement and figure disposal, which render on their own. */
    halt(): void {
        this.controller.pause();
    }

    /** Stops playback and counts from `step`, for a restored or imported scene that starts mid-trace. */
    restoreTo(step: number): void {
        this.controller.reset(step);
        this.host.requestRender();
    }

    /**
     * The graph's `setState` reports every store write here, after it. A new model resets the controller to the step the
     * graph's write left in the store: 0 for an edit, the named step for a write that names one, and the clamped old step
     * for Fortune, whose `setState` deliberately keeps the sweep position. What counts as a model edit is the graph's call
     * (Delaunay also counts its `triangles` and clears its triangle selection itself). A step written outside `advance()`
     * resets to that step so a finished controller restarts.
     */
    settle(modelChanged: boolean, namedStep: boolean): void {
        if (modelChanged || (namedStep && !this.advancing)) {
            this.controller.reset(this.host.step());
            this.host.requestRender();
        }
    }

    /** Ahead of an algorithm switch: a switch returns to step 0 and stops playback before the new run is read. */
    stop(): void {
        this.controller.reset(0);
    }

    /** A disposed controller stays silent for good; a remount needs a new one. */
    mount(): void {
        if (!this.disposed) return;
        this.controller = this.create();
        this.disposed = false;
    }

    unmount(): void {
        this.controller.dispose();
        this.disposed = true;
    }
}
