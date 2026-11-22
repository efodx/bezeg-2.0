import {useEffect, useState} from 'react';
import {clearSnap, snapRows} from '../dock/snapRows';

/**
 * Pick toolsCard: the lesson card on the graph fits its text, and when the text changes (Naprej, Nazaj, an opened
 * "Kaj bi morali opaziti", MathJax finishing) the card glides to its new height instead of snapping, so the cards below
 * it slide with it rather than jump. Review 7 had asked for one height per lesson (the cards below jumped on every
 * Naprej); the owner found the blank space that left under short frames ugly (2026-11-21), so the height follows the
 * text again and only the motion is smoothed.
 *
 * Docked in a stack, the card holds an explicit height: the height it would have on its own (capped by the column, as
 * before) with a floor of min(200 px, its text) so a crowded column still leaves it room to read. Floating or folded,
 * the card is left to the stylesheet. The same hook marks the text region that scrolls (`data-overflow`: "start"/"end")
 * so the stylesheet can fade the cut edge. Reduced motion: no glide.
 */
const GLIDE = 'height 220ms cubic-bezier(.2, .8, .2, 1)';
const FLOOR = 200;

export function useLessonCardFit(enabled: boolean, lesson: unknown) {
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!enabled) return undefined;
        const card = document.querySelector<HTMLElement>('.ux-bcard-guide');
        // The dock's regions mount a moment after the lesson: look again until the card is there.
        if (!card) { const retry = window.setTimeout(() => setAttempt(a => a + 1), 150); return () => window.clearTimeout(retry); }
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let held = false, home: Element | null = card.parentElement;

        const reading = () => card.querySelector<HTMLElement>('.guided-lesson-reading');
        const markScroll = () => {
            const el = reading();
            if (!el) return;
            const v = [el.scrollTop > 1 ? 'start' : '', el.scrollTop + el.clientHeight < el.scrollHeight - 1 ? 'end' : ''].filter(Boolean).join(' ');
            if (el.getAttribute('data-overflow') !== v) { if (v) el.setAttribute('data-overflow', v); else el.removeAttribute('data-overflow'); }
        };
        const release = () => {
            if (!held) return;
            held = false;
            for (const p of ['height', 'min-height', 'transition', 'flex-shrink']) card.style.removeProperty(p);
            const el = reading();
            if (el) clearSnap(el);
        };
        const docked = () => !card.classList.contains('is-floating') && !card.classList.contains('ux-btext-collapsed')
            && !!card.parentElement?.classList.contains('ux-dock-v');

        let busy = false, settling = 0, settlePass = false;
        const apply = () => {
            if (busy) return;
            // One more pass once the glide and MathJax have settled: a snap measured mid-glide can leave a line cut (round 14).
            if (!settlePass) { window.clearTimeout(settling); settling = window.setTimeout(() => { settlePass = true; try { apply(); } finally { settlePass = false; } }, 320); }
            if (!docked()) { release(); markScroll(); return; }
            busy = true;
            try {
                const moved = card.parentElement !== home;
                home = card.parentElement;
                // Where the card is on screen now (mid-glide too), then the height it wants: its full text (no shrink),
                // and what its column gives it (the stylesheet's flex).
                const now = card.getBoundingClientRect().height;
                card.style.transition = 'none';
                card.style.removeProperty('height');
                card.style.removeProperty('min-height');
                card.style.flexShrink = '0';
                const full = card.getBoundingClientRect().height;
                card.style.removeProperty('flex-shrink');
                const floor = Math.min(FLOOR, full);
                card.style.minHeight = `${Math.round(floor)}px`;
                const fits = card.getBoundingClientRect().height;
                let target = Math.round(Math.max(floor, fits));
                // Text cut by the column ends on a whole line (a max-height, snapRows) above the "Več" bar; the card then shrinks
                // to that, so the bar sits on its bottom edge with no blank band below.
                const text = reading();
                if (text) {
                    clearSnap(text);
                    card.style.height = `${target}px`;
                    if (snapRows(text)) {  // floors to the last whole line above the bar
                        card.style.removeProperty('height');
                        target = Math.round(Math.max(floor, card.getBoundingClientRect().height));
                    }
                }
                const glide = held && !moved && !reducedMotion.matches && Math.abs(target - now) > 2;
                held = true;
                if (glide) {
                    card.style.height = `${now}px`;
                    void card.offsetHeight;
                    card.style.transition = GLIDE;
                }
                card.style.height = `${target}px`;
            } finally {
                busy = false;
            }
            markScroll();
        };

        // Our own style writes resize the card and its column; those observer calls find nothing new to do (the target is
        // unchanged), so they settle at once.
        let raf = 0;
        const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(); }); };
        // Content changes are handled before the frame is painted, so the card never shows the new text at the old height.
        // (One observe call: a second call on the same node would replace these options.) Our own writes are to `style`
        // and `data-overflow`, which are not watched.
        const mutations = new MutationObserver(() => { rewatch(); apply(); });
        mutations.observe(card, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'open', 'hidden']});
        const contentSize = new ResizeObserver(() => apply());
        const layoutSize = new ResizeObserver(schedule);
        const rewatch = () => {
            contentSize.disconnect(); layoutSize.disconnect();
            // The text's own blocks (their size changes with MathJax and opened details) and the column holding the card.
            const el = reading();
            if (el) for (const child of Array.from(el.children)) contentSize.observe(child);
            const column = card.parentElement?.parentElement;
            if (column) layoutSize.observe(column);
        };
        rewatch();
        const onScroll = () => markScroll();
        card.addEventListener('scroll', onScroll, true);
        const onResize = () => schedule();
        window.addEventListener('resize', onResize);
        const timer = window.setInterval(() => { if (card.parentElement !== home) { rewatch(); schedule(); } markScroll(); }, 250);
        apply();
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.clearInterval(timer); window.clearTimeout(settling);
            window.removeEventListener('resize', onResize);
            mutations.disconnect(); contentSize.disconnect(); layoutSize.disconnect();
            card.removeEventListener('scroll', onScroll, true);
            release();
        };
    }, [enabled, lesson, attempt]);
}
