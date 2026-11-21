import {useEffect} from 'react';

/**
 * Pick boardText / toolsCard: formulas in the board cards are not tab stops. MathJax makes every rendered formula
 * focusable (`mjx-container[tabindex=0]`), so one lesson frame put ~24 stops between Naprej and the tools. A display
 * formula region of the lesson card (`.guided-lesson-notation`) keeps one stop only while it scrolls sideways (the
 * keyboard needs it to read the rest). Formulas stay readable to screen readers (their assistive MathML is untouched).
 */
export function useQuietFormulas(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return undefined;
        let raf = 0;
        const apply = () => {
            raf = 0;
            for (const el of document.querySelectorAll<HTMLElement>('.ux-btext mjx-container[tabindex]:not([tabindex="-1"])')) el.setAttribute('tabindex', '-1');
            for (const el of document.querySelectorAll<HTMLElement>('.ux-bcard-guide .guided-lesson-notation')) {
                const scrolls = el.scrollWidth > el.clientWidth + 1;
                if (scrolls && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
                else if (!scrolls && el.hasAttribute('tabindex')) el.removeAttribute('tabindex');
            }
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
        const observer = new MutationObserver(records => {
            // The board's own drawing changes constantly and holds no formulas of ours.
            if (records.some(r => !(r.target instanceof Element && r.target.closest('svg')))) schedule();
        });
        observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['tabindex']});
        window.addEventListener('resize', schedule);
        schedule();
        return () => { observer.disconnect(); window.removeEventListener('resize', schedule); if (raf) cancelAnimationFrame(raf); };
    }, [enabled]);
}
