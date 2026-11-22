/**
 * Whole rows at rest (round 9). A card or stack that scrolls shows a footer bar ("še N" / "Več") over its last BAR px; the
 * rows above the bar must end on a row (or text line) boundary, so nothing is cut by the bar's top edge. `snapRows` sets an
 * inline max-height that ends the visible region on such a boundary; it runs only while the element is at its top, so a
 * scrolling element never changes height.
 */
export const BAR = 26;
/** The opaque gradient above the bar; rows end above it too, so none is half-faded. */
export const FADE = 6;
/** A stack's box reaches 12 px past its visible cards (soft-shadow room, overlapping its neighbours); the bar sits above that. */
export const footOf = (el: HTMLElement) => el.classList.contains('ux-dock-region') ? 12 : 0;
const SNAP = 'data-snap-h';

/** Vertical extents (viewport coordinates) of the rows and text lines inside `el`, merged where they overlap. */
export function lineBands(el: HTMLElement): Array<[number, number]> {
    const raw: Array<[number, number]> = [];
    el.querySelectorAll<HTMLElement>('[data-readout]').forEach(row => { const r = row.getBoundingClientRect(); if (r.height > 0) raw.push([r.top, r.bottom]); });
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue || !n.nodeValue.trim()) continue;
        range.selectNodeContents(n);
        for (const r of Array.from(range.getClientRects())) if (r.height > 0 && r.width > 0) raw.push([r.top, r.bottom]);
    }
    raw.sort((a, b) => a[0] - b[0]);
    const out: Array<[number, number]> = [];
    for (const [t, b] of raw) {
        const last = out[out.length - 1];
        if (last && t < last[1] - 1) last[1] = Math.max(last[1], b); else out.push([t, b]);
    }
    return out;
}

/** Drops a snapped height so the element can be measured at its natural size. */
export function clearSnap(el: HTMLElement) {
    if (el.hasAttribute(SNAP)) { el.style.removeProperty('max-height'); el.removeAttribute(SNAP); }
}

/** At scrollTop 0 with a cut: a max-height ending on the last band that fits above the bar. Returns true when it set one. */
export function snapRows(el: HTMLElement): boolean {
    if (el.scrollHeight <= el.clientHeight + 2) return false;
    const box = el.getBoundingClientRect();
    const foot = footOf(el), limit = box.top + el.clientHeight - foot - BAR - FADE;
    const bands = lineBands(el);
    if (!bands.some(([t, b]) => t < limit - 0.5 && b > limit + 0.5)) return false;
    const fit = bands.filter(([, b]) => b <= limit + 0.5).reduce((m, [, b]) => Math.max(m, b), 0);
    const h = Math.ceil(fit - box.top + BAR + FADE + foot);
    if (fit === 0 || h < 100 || h >= el.clientHeight) return false;
    el.style.maxHeight = `${h}px`;
    el.setAttribute(SNAP, '');
    return true;
}

/** The scroll distance of one page that puts the first band cut by the bar (or hidden below it) at the top. */
export function pageStep(el: HTMLElement): number {
    const box = el.getBoundingClientRect();
    const limit = box.top + el.clientHeight - footOf(el) - BAR - FADE;
    const first = lineBands(el).find(([, b]) => b > limit + 0.5);
    const step = first ? first[0] - box.top - 8 : 0;
    return step >= 40 ? step : Math.max(60, el.clientHeight * 0.8);
}
