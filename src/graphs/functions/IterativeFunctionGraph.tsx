import BaseFunctionGraph, {DomainError} from "./BaseFunctionGraph";
import {IterationController, IterationOutcome} from "../../learning/runtime/iterationController";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {LessonAnimationCommand} from "../../learning/model";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** The lesson animation commands an iteration handles. `stop` is rejected: the iteration has no separate stopped state (use pause or reset). */
const LESSON_COMMANDS: readonly LessonAnimationCommand[] = ["play", "pause", "replay", "next-step", "reset"];

/**
 * A function demonstration that reveals one step at a time (a bisection, a sequence, a fixed-point iteration): the
 * `IterationController` wiring they share. Next step and every playback step run the one `transition()` of the subclass; playback
 * is not model data, so a reopened preset is paused; anything that replaces the scene, exports a figure or unmounts the graph
 * pauses it. The subclass supplies its model's mathematics (`transition`, `canAdvance`, `resetIteration`, `iterationIndex`).
 */
export default abstract class IterativeFunctionGraph<M extends object> extends BaseFunctionGraph<M> {
    protected controller: IterationController;
    private controllerDisposed = false;

    constructor(protected readonly scheduler?: AnimationScheduler) {
        super();
        this.controller = this.createController();
    }

    /** The animation id lesson `animation` actions are addressed to. */
    protected abstract animationId(): string;

    /** Time between two playback steps: one step per interval, never more than one per frame (see ADR 0012). */
    protected abstract stepIntervalMs(): number;

    /** The number of transitions a full run takes. */
    protected abstract maxIterations(): number;

    /** The one mathematical transition of the iteration; it commits the next model and says whether the run continues or is complete. */
    protected abstract transition(): IterationOutcome;

    /** True while another transition is possible. */
    protected abstract canAdvance(): boolean;

    /** Why Next step is refused (a `DomainError` message). */
    protected abstract cannotAdvanceMessage(): string;

    /** Back to the first step of the same example and parameters; playback stops. */
    protected abstract resetIteration(): void;

    /** How many transitions produced the model (the controller's iteration count). */
    protected abstract iterationIndex(model: M): number;

    /** The model with an out-of-range step cut to what the history can take; identity by default. */
    protected normalizeIterationModel(model: M): M {
        return model;
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.transition(),
            stepIntervalMs: this.stepIntervalMs(),
            maxIterations: this.maxIterations(),
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    /** Replaces the model by an edit: the controller follows the revealed steps and playback stops. */
    protected replaceModel(next: M): void {
        const model = this.normalizeIterationModel(next);
        this.controller.reset(this.iterationIndex(model));
        this.commitModel(model);
        this.requestRender();
    }

    protected pauseIteration(): void {
        this.controller.pause();
        this.requestRender();
    }

    /** One Next step. It takes over from playback, throws when the iteration cannot advance, and waits while a figure is captured. */
    protected nextStep(): void {
        // While a figure is captured the step is dropped without an error: a lesson `next-step` that arrives then is not queued
        // (the export lock is short and ends in a figure, never in a scene change).
        if (this.exportBusy) return;
        if (!this.canAdvance()) throw new DomainError(this.cannotAdvanceMessage());
        this.controller.pause();
        this.controller.nextStep();
        this.requestRender();
    }

    protected play(): void {
        if (this.exportBusy || !this.canAdvance()) return;
        this.controller.play();
        this.requestRender();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated("animation", this.animationId(), action => this.lessonCommand(action.command), {
            supports: action => LESSON_COMMANDS.includes(action.command),
        });
    }

    private lessonCommand(command: LessonAnimationCommand): void {
        if (command === "next-step") this.nextStep();
        else if (command === "play") this.play();
        else if (command === "pause") this.pauseIteration();
        else if (command === "reset") this.resetIteration();
        else if (command === "replay") {
            this.resetIteration();
            this.play();
        }
    }

    override mount(container: HTMLElement): void {
        // A disposed controller stays silent for good; a remount (React StrictMode) needs a new one.
        if (this.controllerDisposed) {
            this.controller = this.createController();
            this.controllerDisposed = false;
        }
        super.mount(container);
    }

    override unmount(): void {
        this.controller.dispose();
        this.controllerDisposed = true;
        super.unmount();
    }

    /** A preset or lesson checkpoint never starts playback: the controller returns to the loaded step, paused. */
    override importPresetData(data: any): void {
        super.importPresetData(data);
        this.controller.reset(this.iterationIndex(this.model));
        this.requestRender();
    }

    protected override stopLessonAnimations(): void {
        this.pauseIteration();
    }

    protected override beforeFigureCapture(): void {
        this.pauseIteration();
    }

    protected override onSceneRemoved(): void {
        // A replaced scene must not keep running behind the new one. The base class may call this before the controller exists;
        // the render refreshes the Play/Pause label.
        if (!this.controller) return;
        this.controller.pause();
        this.requestRender();
    }
}
