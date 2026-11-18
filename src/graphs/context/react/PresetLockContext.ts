import {createContext} from "react";

/**
 * Who owns user interaction with the graph right now: `free` (free exploration, or after a lesson released the scene),
 * `lesson-card` (a guided lesson's instructional card owns it) or `lesson-observe` (a lesson is active but its card is hidden
 * or finished, so the learner may use the graph).
 */
export type UserActionMode = "free" | "lesson-card" | "lesson-observe";

/**
 * The one decision about user commands (docs/specs/master-review-followups-2026-11.md, user-action availability).
 * `mode` is the value of the last render, for showing reasons; `current()` reads the workspace's state at call time, so a
 * commit made through an older form or retained callback is decided by what holds now, not by what held when it was created.
 */
export interface UserActionPolicy {
    readonly mode: UserActionMode;
    current(): UserActionMode;
}

/** User Preset writes (save, overwrite, rename, delete) are refused during any active lesson. */
export const presetWritesAllowed = (mode: UserActionMode): boolean => mode === "free";
/** User playback (step, play, run reset) is refused only while the lesson card owns interaction. */
export const playbackAllowed = (mode: UserActionMode): boolean => mode !== "lesson-card";

export const policyOf = (mode: UserActionMode): UserActionPolicy => ({mode, current: () => mode});

/**
 * Provided by the workspace. Select, reset, delete and import (scene-replacing Preset operations) stay disabled whenever the
 * mode is not `free`, so a lesson never describes a scene that was replaced underneath it.
 */
export const PresetLockContext = createContext<UserActionPolicy>(policyOf("free"));
