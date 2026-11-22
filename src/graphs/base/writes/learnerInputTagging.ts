import {beginLearnerGesture} from "./writeSource";

/**
 * Tags every write that a learner's input causes as `learner`, with one set of window capture listeners instead of
 * a wrapper per control, board handler and panel button (task 01, slice 4).
 *
 * - Pointer down opens a learner gesture until that pointer's up or cancel; key down until that key's up. While it
 *   is open, every key a write changes is held for the learner (see `ParameterArbiter`), so a board drag or a
 *   held arrow key keeps lessons and animations off the key until release.
 * - Click, input, change, wheel and the other discrete input events open a short gesture that covers their
 *   synchronous handlers (React dispatches `onChange` and `onClick` inside the native event).
 *
 * A gesture ends after its event's dispatch: at the window's bubble listener when the event reaches it, else in
 * the next task (an inner handler may stop propagation). A scope opened by code (`runAs("lesson", ...)` around a
 * lesson Next, an animation frame's lease) wins over the ambient gesture.
 *
 * Owner: the window; installed once, never removed (it holds no graph). Pure DOM, no React or JSXGraph.
 */

const DISCRETE_EVENTS = ["click", "dblclick", "input", "change", "wheel", "contextmenu", "submit"] as const;

let installed: Window | undefined;

export function installLearnerInputTagging(target: Window = window): void {
    if (installed === target) return;
    installed = target;

    const pointers = new Map<number, () => void>();
    const keys = new Map<string, () => void>();

    const endSoon = (end: () => void) => {
        let done = false;
        const once = () => {
            if (done) return;
            done = true;
            end();
        };
        target.setTimeout(once, 0);
        return once;
    };

    /** A gesture for one dispatch: ended at the bubble listener of the same event, or in the next task. */
    const pulse = () => endSoon(beginLearnerGesture());
    const pulses = new WeakMap<Event, () => void>();
    const startPulse = (event: Event) => {
        if (!pulses.has(event)) pulses.set(event, pulse());
    };
    const endPulse = (event: Event) => {
        pulses.get(event)?.();
    };

    target.addEventListener("pointerdown", event => {
        pointers.get(event.pointerId)?.();
        pointers.set(event.pointerId, beginLearnerGesture());
    }, true);
    const pointerEnd = (event: PointerEvent) => {
        const end = pointers.get(event.pointerId);
        if (!end) return;
        pointers.delete(event.pointerId);
        // The click that follows pointer up still belongs to the gesture.
        endSoon(end);
    };
    target.addEventListener("pointerup", pointerEnd, true);
    target.addEventListener("pointercancel", pointerEnd, true);

    target.addEventListener("keydown", event => {
        if (!keys.has(event.code)) keys.set(event.code, beginLearnerGesture());
        startPulse(event);
    }, true);
    target.addEventListener("keydown", endPulse);
    target.addEventListener("keyup", event => {
        const end = keys.get(event.code);
        if (!end) return;
        keys.delete(event.code);
        endSoon(end);
    }, true);

    // A lost key up or pointer up (focus left the window) must not leave a hold open.
    target.addEventListener("blur", () => {
        for (const end of [...pointers.values(), ...keys.values()]) end();
        pointers.clear();
        keys.clear();
    });

    for (const type of DISCRETE_EVENTS) {
        target.addEventListener(type, startPulse, {capture: true, passive: true});
        target.addEventListener(type, endPulse, {passive: true});
    }
}
