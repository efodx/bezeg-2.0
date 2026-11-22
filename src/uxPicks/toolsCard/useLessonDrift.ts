import {useEffect, useRef, useState} from 'react';

/**
 * Pick toolsCard: a reading frame no longer locks the graph (owner, 2026-11-21), so the frame's text can stop matching the
 * graph. This tells when it does: the graph's state is captured when the learner starts an input on the graph, its tools or
 * pucks (not on the lesson card), and compared once the input settles. True while the state differs; a new frame, or
 * `clear` after "Povrni", starts over. The baseline is the state once the frame's own transition (the b1 morph) has
 * settled, so the transition is never read as the learner's change (a tap on a puck 600 ms after Next did).
 */
export function useLessonDrift(enabled: boolean, frameKey: string, capture: () => unknown): [boolean, () => void] {
    const [drifted, setDrifted] = useState(false);
    const baseline = useRef<string | null>(null);
    const captureRef = useRef(capture);
    captureRef.current = capture;
    const arm = useRef<() => void>(() => undefined);
    useEffect(() => { baseline.current = null; setDrifted(false); arm.current(); }, [frameKey, enabled]);
    useEffect(() => {
        if (!enabled) return;
        let timer = 0, settleTimer = 0, arming = false;
        const read = () => { try { return JSON.stringify(captureRef.current()); } catch { return null; } };
        const inScope = (target: EventTarget | null) => {
            const el = target instanceof Element ? target : null;
            return !!el && !!el.closest('.workspace-graph, .ux-bcard-tools, .ux-pucks, .ux-dock-tray') && !el.closest('.ux-bcard-guide, .ux-lesson-menu-list');
        };
        // A new frame (or Povrni) morphs the graph to the frame's state (b1) for a moment; the baseline is the state once
        // two reads 150 ms apart agree, so an input that lands mid-morph does not read the morph as the learner's change.
        // An input that starts while the morph runs takes no capture of its own (it would be mid-morph): the morph's end state
        // is the baseline.
        arm.current = () => {
            window.clearInterval(settleTimer);
            let previous: string | null = null, tries = 0;
            arming = true;
            settleTimer = window.setInterval(() => {
                const now = read();
                if (baseline.current !== null || ++tries > 40) { window.clearInterval(settleTimer); arming = false; return; }
                if (now !== null && now === previous) { baseline.current = now; window.clearInterval(settleTimer); arming = false; }
                previous = now;
            }, 150);
        };
        arm.current();
        const start = (event: Event) => { if (baseline.current === null && !arming && inScope(event.target)) baseline.current = read(); };
        const settle = (event: Event) => {
            if (baseline.current === null || (event.type !== 'pointerup' && event.type !== 'pointercancel' && !inScope(event.target))) return;
            window.clearTimeout(timer);
            // Long enough for a sweep (a3) or a slider's last write to land.
            timer = window.setTimeout(() => {
                const now = read();
                if (now !== null && baseline.current !== null) setDrifted(now !== baseline.current);
            }, 250);
        };
        const opts = {capture: true, passive: true} as const;
        for (const type of ['pointerdown', 'keydown', 'wheel'] as const) document.addEventListener(type, start, opts);
        for (const type of ['pointerup', 'pointercancel', 'keyup', 'change', 'input', 'wheel'] as const) document.addEventListener(type, settle, opts);
        return () => {
            arm.current = () => undefined;
            arming = false;
            window.clearInterval(settleTimer);
            window.clearTimeout(timer);
            for (const type of ['pointerdown', 'keydown', 'wheel'] as const) document.removeEventListener(type, start, opts);
            for (const type of ['pointerup', 'pointercancel', 'keyup', 'change', 'input', 'wheel'] as const) document.removeEventListener(type, settle, opts);
        };
    }, [enabled]);
    return [drifted, () => { baseline.current = null; setDrifted(false); arm.current(); }];
}
