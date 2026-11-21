import {getParam, observeParamChanges, type ParamEntry} from './paramRegistry';

/**
 * a6 — Lessons that glide. When the learner presses a lesson button (Next, Back, a step's action) and the scene changes a
 * ranged parameter, the parameter travels to its new value over about 0.8 s instead of jumping, so the learner sees what
 * the step changed and how. It hooks the shared parameter registry, so every lesson that sets a slider parameter glides.
 */

const DURATION = 850;
let armedUntil = 0;
const running = new Map<string, {from: number; to: number; start: number}>();
let frame = 0;

function ease(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function tick(now: number) {
    frame = 0;
    for (const [key, tween] of running) {
        const entry = getParam(key);
        const t = Math.min(1, (now - tween.start) / DURATION);
        if (!entry) { running.delete(key); continue; }
        const raw = tween.from + (tween.to - tween.from) * ease(t);
        // Whole-number parameters (counts, n, k) step through whole numbers; fine ones glide.
        const value = t >= 1 ? tween.to : entry.step >= 1 ? Math.round((raw - entry.min) / entry.step) * entry.step + entry.min : raw;
        entry.setFromLesson(value);
        if (t >= 1) running.delete(key);
    }
    if (running.size > 0) frame = requestAnimationFrame(tick);
}

function onChange(previous: ParamEntry, next: ParamEntry) {
    if (performance.now() > armedUntil || running.has(next.key)) return;
    if (next.cyclic !== undefined && Math.abs(next.value - previous.value) > next.cyclic / 2) return;
    running.set(next.key, {from: previous.value, to: next.value, start: performance.now()});
    // Back to where it was, synchronously (this runs in the slider's layout effect, before paint), then travel.
    next.setFromLesson(previous.value);
    if (!frame) frame = requestAnimationFrame(tick);
}

export function installLessonTweens(): () => void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => undefined;
    const arm = (event: Event) => {
        const target = event.target as Element | null;
        if (target?.closest('.guided-lesson button, .guided-lesson-tab')) armedUntil = performance.now() + 600;
    };
    const cancel = (event: Event) => {
        const target = event.target as Element | null;
        if (running.size > 0 && target?.closest('.ux-board-frame, .workspace-inspector')) {
            for (const [key, tween] of running) getParam(key)?.setFromLesson(tween.to);
            running.clear();
        }
    };
    document.addEventListener('click', arm, true);
    document.addEventListener('keydown', arm, true);
    document.addEventListener('pointerdown', cancel, true);
    observeParamChanges(onChange);
    return () => {
        document.removeEventListener('click', arm, true);
        document.removeEventListener('keydown', arm, true);
        document.removeEventListener('pointerdown', cancel, true);
        observeParamChanges(undefined);
        cancelAnimationFrame(frame);
        running.clear();
    };
}
