// Injected into every crawled page (addInitScript). Defines window.__crawl helpers used by crawl.cjs.
window.__crawl = {
    // Really shown: non-zero box, not inside a closed <details> (its summary excepted), not clipped away by an ancestor.
    shown(el) {
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
        const d = el.closest('details:not([open])');
        if (d && !(el.closest('summary') && el.closest('summary').parentElement === d)) return false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.overflow === 'visible' && s.overflowX === 'visible' && s.overflowY === 'visible' && s.clipPath === 'none') continue;
            const r = a.getBoundingClientRect();
            const w = Math.min(b.right, r.right) - Math.max(b.left, r.left), h = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
            if ((w < 2 || h < 2) && !(s.overflowY === 'auto' || s.overflowY === 'scroll')) return false;
        }
        return true;
    },
    // What sits on top of el's centre after scrolling it into view; null when el itself (or its label) is hit.
    coveredBy(el) {
        el.scrollIntoView({block: 'center', inline: 'nearest'});
        const b = el.getBoundingClientRect();
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!top || el === top || el.contains(top) || top.contains(el)) return null;
        const label = el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
        if (label && (label === top || label.contains(top))) return null;
        return `${top.tagName.toLowerCase()}.${String(top.className).slice(0, 40)} "${(top.textContent || '').trim().slice(0, 30)}"`;
    },
};
