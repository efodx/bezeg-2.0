import {AnimationDriver, AnimationScheduler} from './animation';

/** What one transition reports: another step is possible, or the iteration reached a natural end (a root, stagnation, a requested tolerance). */
export type IterationOutcome = 'continue' | 'complete';

export type IterationStatus = 'idle' | 'playing' | 'paused' | 'complete';

export interface IterationControllerOptions {
    /**
     * One mathematical iteration step, the only place iteration state changes: `nextStep()` and playback both call it.
     * `index` is the zero-based number of this transition since the last reset. Returning `'complete'` ends the iteration.
     */
    transition: (index: number) => IterationOutcome | void;
    /** Time between playback steps. Fixed: a slow or resumed frame never triggers more than one step. */
    stepIntervalMs: number;
    /** The documented finite iteration limit; reaching it completes the iteration. */
    maxIterations: number;
    /** Runs when `reset()` is called, so the graph restores its initial mathematical state next to the counter. */
    onReset?: () => void;
    /** Runs once when the iteration completes, whether by `nextStep()` or playback. Playback has already stopped. */
    onComplete?: () => void;
    scheduler?: AnimationScheduler;
}

/**
 * A graph-owned driver for iterative lessons such as bisection. It counts transitions, plays them at a fixed
 * interval on top of `AnimationDriver`, stops playback when the iteration completes, and is silent after `dispose()`.
 *
 * Pausing drops the unfinished part of the current interval and resuming waits one full interval, so a resumed
 * iteration continues from the paused mathematical state with no elapsed-time jump. The graph owns the controller:
 * it calls `pause()` (or `reset()`) on manual edits, function or domain changes, scene replacement, import, capture
 * and frame transitions, and `dispose()` with the board.
 */
export class IterationController {
    private readonly driver: AnimationDriver;
    private count = 0;
    private completed = false;
    private disposed = false;
    private elapsed = 0;

    constructor(private readonly options: IterationControllerOptions) {
        if (!(options.stepIntervalMs > 0) || !Number.isFinite(options.stepIntervalMs)) {
            throw new RangeError('The iteration step interval must be a positive number of milliseconds.');
        }
        if (!Number.isInteger(options.maxIterations) || options.maxIterations < 1) {
            throw new RangeError('The iteration limit must be a positive integer.');
        }
        this.driver = new AnimationDriver(delta => this.onFrame(delta), options.scheduler);
    }

    /** Number of transitions performed since the last reset. */
    get iteration() {
        return this.count;
    }

    get status(): IterationStatus {
        if (this.completed) return 'complete';
        if (this.driver.isRunning()) return 'playing';
        return this.driver.isPaused() ? 'paused' : 'idle';
    }

    isPlaying() {
        return this.driver.isRunning();
    }

    isComplete() {
        return this.completed;
    }

    /** Performs one transition. Returns false when nothing ran because the iteration is complete or disposed. */
    nextStep(): boolean {
        if (this.disposed || this.completed) return false;
        let outcome: IterationOutcome | void;
        try {
            outcome = this.options.transition(this.count);
        } catch (error) {
            this.driver.pause();
            throw error;
        }
        this.count += 1;
        if (outcome === 'complete' || this.count >= this.options.maxIterations) this.complete();
        return true;
    }

    /** Starts or resumes playback; a no-op when complete, disposed, or already playing. */
    play() {
        if (this.disposed || this.completed) return;
        this.elapsed = 0;
        this.driver.play();
    }

    pause() {
        if (this.disposed) return;
        this.elapsed = 0;
        this.driver.pause();
    }

    /** Stops playback and returns to `iteration` (zero by default; a restored scene may start later). */
    reset(iteration = 0) {
        if (this.disposed) return;
        this.driver.stop();
        this.elapsed = 0;
        this.count = Math.min(Math.max(0, Math.floor(iteration)), this.options.maxIterations);
        this.completed = this.count >= this.options.maxIterations;
        this.options.onReset?.();
    }

    /** Stops playback and silences the controller for good; no transition or callback runs afterwards. */
    dispose() {
        this.disposed = true;
        this.driver.dispose();
    }

    private onFrame(delta: number) {
        this.elapsed += delta;
        if (this.elapsed < this.options.stepIntervalMs) return;
        // Never catch up: a long frame still yields exactly one step.
        this.elapsed = 0;
        this.nextStep();
    }

    private complete() {
        this.completed = true;
        this.driver.stop();
        this.options.onComplete?.();
    }
}
