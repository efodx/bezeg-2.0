import type {useT} from "../../localization";

/** "Step 3 of 12": the one step counter of the trace graphs. `step` is the 0-based index into the run, shown from 1. */
export function stepCounterText(t: ReturnType<typeof useT>, step: number, length: number): string {
    return t("hulltrace_step_counter", {value0: step + 1, value1: Math.max(length, 1)});
}
