import {useEffect} from 'react';

/**
 * Tools-card body: marks when more lies behind its cut edge (`data-overflow`: "start"/"end"), so the stylesheet can fade it.
 * Sections, folds and help are declared by the graphs through `ToolSection` (src/inputs/ToolSection.tsx); nothing is
 * detected from the markup any more.
 */
/** Marks the tools body when more lies behind its cut edge (`data-overflow`: "start"/"end"), so the stylesheet can fade it. */
function markOverflow(root: HTMLElement) {
    const v = [root.scrollTop > 1 ? 'start' : '', root.scrollTop + root.clientHeight < root.scrollHeight - 1 ? 'end' : ''].filter(Boolean).join(' ');
    if (root.getAttribute('data-overflow') !== v) { if (v) root.setAttribute('data-overflow', v); else root.removeAttribute('data-overflow'); }
}

export function useToolsSections(root: HTMLElement | null) {
    useEffect(() => {
        if (!root) return;
        const mark = () => markOverflow(root);
        root.addEventListener('scroll', mark, {passive: true});
        const sizes = new ResizeObserver(mark);
        sizes.observe(root);
        if (root.firstElementChild) sizes.observe(root.firstElementChild);
        // Sections fold and help opens in React; the body's size changes with them.
        const obs = new MutationObserver(mark);
        obs.observe(root, {childList: true, subtree: true});
        mark();
        return () => { root.removeEventListener('scroll', mark); sizes.disconnect(); obs.disconnect(); };
    }, [root]);
}
