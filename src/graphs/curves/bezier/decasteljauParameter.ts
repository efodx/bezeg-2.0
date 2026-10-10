/**
 * While an animation draws the De Casteljau parameter on every frame, React state follows it at
 * this display cadence. Playback, pause, finish and stop publish the exact drawn value.
 */
export const PARAMETER_PUBLISH_INTERVAL_MS = 100;

const PARAMETER_STATE_KEYS = ["t", "v", "animationStatus"];

/** True when only parameter playback fields (and the listed graph-owned fields) differ. */
export function onlyParameterStateChanged(previous: object, next: object, handledKeys: string[] = []): boolean {
    const handled = new Set([...PARAMETER_STATE_KEYS, ...handledKeys]);
    const before = previous as Record<string, unknown>;
    const after = next as Record<string, unknown>;
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
        if (!handled.has(key) && before[key] !== after[key]) return false;
    }
    return true;
}
