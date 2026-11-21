import {useEffect, useState} from 'react';

/**
 * Pick toolsCard: the lesson card on the graph keeps one height for the whole lesson (owner review 7: its height changed
 * 325 -> 238 -> 200 between frames, so the cards below it jumped on every Naprej). The largest height the card reached in
 * this lesson becomes its min-height (a ratchet), capped by what its stack's column can give it once the other cards have
 * their minimum. The ratchet starts over when the lesson changes, when the card is folded or carried away, and when it
 * lands in another stack. The same hook marks the text region that scrolls (`data-overflow`: "start"/"end") so the
 * stylesheet can fade the cut edge.
 */
export function useLessonCardFit(enabled: boolean, lesson: unknown) {
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!enabled) return undefined;
        const card = document.querySelector<HTMLElement>('.ux-bcard-guide');
        // The dock's regions mount a moment after the lesson: look again until the card is there.
        if (!card) { const retry = window.setTimeout(() => setAttempt(a => a + 1), 150); return () => window.clearTimeout(retry); }
        let max = 0, home: Element | null = card.parentElement, raf = 0;
        const px = (value: string) => parseFloat(value) || 0;
                /** The height the stack's column can give the card: the column minus the other stacks and the cards beside it at their minimum. */
        const cap = (region: HTMLElement) => {
            const column = region.parentElement;
            if (!column) return Infinity;
            const own = getComputedStyle(region);
            let free = column.clientHeight - px(own.paddingTop) - px(own.paddingBottom) - px(own.marginTop) - px(own.marginBottom);
            for (const other of Array.from(column.children) as HTMLElement[]) {
                if (other === region || other.classList.contains('ux-dock-region') === false || other.childElementCount === 0) continue;
                const s = getComputedStyle(other);
                free -= other.scrollHeight + px(s.marginTop) + px(s.marginBottom);
            }
            const beside = (Array.from(region.children) as HTMLElement[]).filter(c => c !== card && c.classList.contains('ux-btext'));
            for (const c of beside) free -= c.classList.contains('ux-btext-collapsed') ? c.offsetHeight : Math.min(c.offsetHeight, px(getComputedStyle(c).minHeight) || c.offsetHeight);
            free -= 8 * beside.length;
            return free;
        };
        const reading = () => card.querySelector<HTMLElement>('.guided-lesson-reading');
        const markScroll = () => {
            const el = reading();
            if (!el) return;
            const v = [el.scrollTop > 1 ? 'start' : '', el.scrollTop + el.clientHeight < el.scrollHeight - 1 ? 'end' : ''].filter(Boolean).join(' ');
            if (el.getAttribute('data-overflow') !== v) { if (v) el.setAttribute('data-overflow', v); else el.removeAttribute('data-overflow'); }
        };
        const apply = () => {
            raf = 0;
            const region = card.parentElement;
            if (card.classList.contains('is-floating') || !region || !region.classList.contains('ux-dock-v')) { max = 0; card.style.removeProperty('min-height'); markScroll(); return; }
            if (region !== home) { home = region; max = 0; card.style.removeProperty('min-height'); }
            max = Math.max(max, card.offsetHeight);
            const want = Math.round(Math.min(max, Math.max(200, cap(region))));
            if (card.style.minHeight !== `${want}px`) card.style.minHeight = `${want}px`;
            markScroll();
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
        const observer = new ResizeObserver(schedule);
        observer.observe(card);
        const watch = (el: Element | null) => { if (el) observer.observe(el); };
        const rewatch = () => { watch(card.parentElement); watch(card.parentElement?.parentElement ?? null); for (const sib of Array.from(card.parentElement?.parentElement?.children ?? [])) watch(sib); };
        rewatch();
        // The card moves between stacks without being remounted, and the reading region is replaced on each frame.
        const mutations = new MutationObserver(() => { rewatch(); schedule(); });
        mutations.observe(card, {childList: true, subtree: true});
        mutations.observe(card, {attributes: true, attributeFilter: ['class']});
        const onScroll = () => markScroll();
        card.addEventListener('scroll', onScroll, true);
        const timer = window.setInterval(() => { if (card.parentElement !== home) schedule(); markScroll(); }, 250);
        schedule();
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.clearInterval(timer);
            observer.disconnect(); mutations.disconnect();
            card.removeEventListener('scroll', onScroll, true);
            card.style.removeProperty('min-height');
        };
    }, [enabled, lesson, attempt]);
}
