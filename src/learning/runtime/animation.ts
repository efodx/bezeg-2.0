export interface AnimationScheduler {
    request(callback: FrameRequestCallback): number;
    cancel(handle: number): void;
}

const browserScheduler: AnimationScheduler = {
    request: callback => window.requestAnimationFrame(callback),
    cancel: handle => window.cancelAnimationFrame(handle),
};

/** A small lifecycle-aware requestAnimationFrame driver. */
export class AnimationDriver {
    private handle: number | undefined;
    private running = false;
    private paused = false;
    private previousTime: DOMHighResTimeStamp | undefined;

    constructor(
        private readonly onFrame: (delta: number, time: DOMHighResTimeStamp) => void,
        private readonly scheduler: AnimationScheduler = browserScheduler,
    ) {}

    play() {
        if (this.running) return;
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
    }

    stop() {
        this.running = false;
        this.paused = false;
        this.previousTime = undefined;
        this.cancelFrame();
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
        this.onFrame(delta, time);
        this.schedule();
    }

    private cancelFrame() {
        if (this.handle !== undefined) {
            this.scheduler.cancel(this.handle);
            this.handle = undefined;
        }
    }
}
