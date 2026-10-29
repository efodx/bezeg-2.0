import {AnimationDriver, type AnimationScheduler} from "../../learning/runtime/animation";
import type {LessonAnimationCommand} from "../../learning/model";

export type SweepParameter = "u" | "v";
export type SweepCommand = Extract<LessonAnimationCommand, "play" | "pause" | "replay" | "stop">;
export const SWEEP_COMMANDS: readonly SweepCommand[] = ["play", "pause", "replay", "stop"];
export const isSweepCommand = (command: LessonAnimationCommand): command is SweepCommand => (SWEEP_COMMANDS as readonly string[]).includes(command);

/** Milliseconds a sweep takes per unit of parameter. */
export const SWEEP_MS_PER_UNIT = 4000;

/** What a sweep needs from its graph; the parameters live only in the scene store. */
export interface PatchSweepHost {
    /** The current parameter value, read from the scene store. */
    read(parameter: SweepParameter): number;
    /** The interval the parameter sweeps over with the other parameter as it is now: [0, 1] for a tensor patch, [0, 1 - other] for a triangular one. */
    range(parameter: SweepParameter): readonly [number, number];
    /** Writes the parameter through the graph's setter. */
    write(parameter: SweepParameter, value: number): void;
}

/**
 * The u and v sweep animations of a patch graph. A sweep moves one parameter from the low end of its range to the
 * high end with the other parameter fixed, so a triangular patch never leaves its domain. Play continues from the
 * current value (from the start when it is at the end), replay always starts at the low end; pause and stop hold the
 * value. Only one sweep runs at a time. Nothing but the scene store holds the parameter.
 */
export class PatchSweeps {
    private readonly drivers: Record<SweepParameter, AnimationDriver>;

    constructor(private readonly host: PatchSweepHost, scheduler?: AnimationScheduler) {
        const make = (parameter: SweepParameter) => new AnimationDriver(delta => this.frame(parameter, delta), scheduler);
        this.drivers = {u: make("u"), v: make("v")};
    }

    apply(parameter: SweepParameter, command: SweepCommand): void {
        const driver = this.drivers[parameter];
        if (command === "pause") { driver.pause(); return; }
        if (command === "stop") { driver.stop(); return; }
        this.stop(parameter === "u" ? "v" : "u");
        const [low, high] = this.host.range(parameter);
        if (command === "replay" || this.host.read(parameter) >= high) this.host.write(parameter, low);
        if (command === "replay") driver.stop();
        driver.play();
    }

    /** Ends every sweep without touching the parameters. */
    stopAll(): void {
        this.drivers.u.stop();
        this.drivers.v.stop();
    }

    pauseAll(): void {
        this.drivers.u.pause();
        this.drivers.v.pause();
    }

    dispose(): void {
        this.drivers.u.dispose();
        this.drivers.v.dispose();
    }

    isRunning(parameter: SweepParameter): boolean {
        return this.drivers[parameter].isRunning();
    }

    private stop(parameter: SweepParameter) {
        this.drivers[parameter].stop();
    }

    private frame(parameter: SweepParameter, delta: number): void {
        const [, high] = this.host.range(parameter);
        const next = Math.min(high, this.host.read(parameter) + delta / SWEEP_MS_PER_UNIT);
        this.host.write(parameter, next);
        if (next >= high) this.drivers[parameter].stop();
    }
}
