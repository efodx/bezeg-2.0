import type {LessonAction, LessonAnimationCommand} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** The `algorithm-trace` commands the trace graphs accept; each runs the transition of the button of the same name. */
const TRACE_LESSON_COMMANDS: readonly LessonAnimationCommand[] = ["next-step", "reset", "play", "pause", "replay"];

/** The transitions of a trace graph's buttons. */
export interface TraceControls {
    nextStep(): void;
    play(): void;
    pause(): void;
    resetTrace(): void;
}

/** Registers the `algorithm-trace` animation on `registry`, running the graph's own button transitions. */
export function registerTraceCommands(registry: LessonActionRegistry, controls: TraceControls): void {
    registry.onDiscriminated("animation", "algorithm-trace", action => runTraceCommand(action.command, controls), {
        supports: action => TRACE_LESSON_COMMANDS.includes(action.command),
    });
}

function runTraceCommand(command: LessonAnimationCommand, controls: TraceControls): void {
    if (command === "next-step") controls.nextStep();
    else if (command === "play") controls.play();
    else if (command === "pause") controls.pause();
    else if (command === "reset") controls.resetTrace();
    else if (command === "replay") {
        controls.resetTrace();
        controls.play();
    }
}

/**
 * The step a `set-trace-step` action asks for: a finite number as is (the graph clamps it to its trace) or `'end'` as the
 * last step. Anything else is a lesson-content error and throws.
 */
export function requestedTraceStep(action: Extract<LessonAction, {kind: "point-set"; operation: "set-trace-step"}>, runLength: number): number {
    const requested: unknown = action.step;
    if (requested !== "end" && (typeof requested !== "number" || !Number.isFinite(requested))) {
        throw new Error("point-set set-trace-step: step must be a finite number or \"end\".");
    }
    return requested === "end" ? runLength - 1 : requested;
}
