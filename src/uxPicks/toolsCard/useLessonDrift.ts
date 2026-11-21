import {useEffect, useRef, useState} from 'react';

/**
 * Pick toolsCard: a reading frame no longer locks the graph (owner, 2026-11-21), so the frame's text can stop matching the
 * graph. This tells when it does: the graph's state is captured when the learner starts an input on the graph, its tools or
 * pucks (not on the lesson card), and compared once the input settles. True while the state differs; a new frame, or
 * `clear` after "Povrni", starts over. A state captured only on input keeps the lesson's own transitions (and the b1 morph)
 * out of the comparison.
 */
export function useLessonDrift(enabled: boolean, frameKey: string, capture: () => unknown): [boolean, () => void] {
    const [drifted, setDrifted] = useState(false);
    const baseline = useRef<string | null>(null);
    const captureRef = useRef(capture);
    captureRef.current = capture;
    useEffect(() => { baseline.current = null; setDrifted(false); }, [frameKey, enabled]);
    useEffect(() => {
        if (!enabled) return;
        let timer = 0;
        const read = () => { try { return JSON.stringify(captureRef.current()); } catch { return null; } };
        const inScope = (target: EventTarget | null) => {
            const el = target instanceof Element ? target : null;
            return !!el && !!el.closest('.workspace-graph, .ux-bcard-tools') && !el.closest('.ux-bcard-guide, .ux-lesson-menu-list');
        };
        const start = (event: Event) => { if (baseline.current === null && inScope(event.target)) baseline.current = read(); };
        const settle = (event: Event) => {
            if (baseline.current === null || (event.type !== 'pointerup' && !inScope(event.target))) return;
            window.clearTimeout(timer);
            // Long enough for a sweep (a3) or a slider's last write to land.
            timer = window.setTimeout(() => {
                const now = read();
                if (now !== null && baseline.current !== null) setDrifted(now !== baseline.current);
            }, 250);
        };
        const opts = {capture: true, passive: true} as const;
        for (const type of ['pointerdown', 'keydown', 'wheel'] as const) document.addEventListener(type, start, opts);
        for (const type of ['pointerup', 'keyup', 'change', 'input', 'wheel'] as const) document.addEventListener(type, settle, opts);
        return () => {
            window.clearTimeout(timer);
            for (const type of ['pointerdown', 'keydown', 'wheel'] as const) document.removeEventListener(type, start, opts);
            for (const type of ['pointerup', 'keyup', 'change', 'input', 'wheel'] as const) document.removeEventListener(type, settle, opts);
        };
    }, [enabled]);
    return [drifted, () => { baseline.current = null; setDrifted(false); }];
}
