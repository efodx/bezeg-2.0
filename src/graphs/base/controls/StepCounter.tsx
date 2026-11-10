import React from "react";
import {useT} from "../../../localization";

type Translate = ReturnType<typeof useT>;

/** The counted noun: one catalogue key per noun ("Korak k od n", "Dogodek k od n"). */
export type StepCounterNoun = "step" | "event";

/** "Step 3 of 12" from a 0-based `step` index and the `length` of the run (at least 1), counted from 1 (decision 38). */
export function stepCounterText(t: Translate, step: number, length: number, noun: StepCounterNoun = "step"): string {
    const values = {value0: step + 1, value1: Math.max(length, 1)};
    return noun === "event" ? t("collision_inspect_progress", values) : t("step_counter", values);
}

/** The one visible step counter; `data-step-counter` is the test hook. The same text feeds the graph's live readout. */
export function StepCounter(props: { step: number; length: number; noun?: StepCounterNoun; hooks?: Record<`data-${string}`, string> }) {
    const t = useT();
    return <p className="inspector-help" data-step-counter="" {...props.hooks}>{stepCounterText(t, props.step, props.length, props.noun)}</p>;
}
