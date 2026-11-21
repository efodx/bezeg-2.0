import {AXIS, GROWS, TARGETS, type DragView, type Target} from './dockLayout';

/**
 * Where a dragged card (or the lesson card) would dock. The board's edge band (a share of its smaller side) maps the
 * pointer to the nearest anchor, and the insertion index along the anchor's axis; in the central area the card floats.
 * A stack that would overflow with the card still offers the position (it scrolls by design): `view.scrolls`.
 */
export interface Hit { region: Target | null; index: number; view: DragView; }

const GAP = 8;
/** The edge band, as a share of the board's smaller side. */
export const BAND = 0.28;
export const REGION_LABEL: Record<Target, string> = {
    tl: 'Zgoraj levo', tc: 'Zgoraj na sredini', tr: 'Zgoraj desno', ml: 'Levo', mr: 'Desno', bc: 'Spodaj na sredini', br: 'Spodaj desno',
};
/** An anchor's reference point on the board's edge, in shares of its width and height. */
export const ANCHOR_AT: Record<Target, [number, number]> = {
    tl: [0, 0], tc: [0.5, 0], tr: [1, 0], ml: [0, 0.5], mr: [1, 0.5], bc: [0.5, 1], br: [1, 1],
};

const isGap = (e: HTMLElement) => e.classList.contains('ux-dock-gap');
const byOrder = (a: HTMLElement, b: HTMLElement) => Number(a.style.order) - Number(b.style.order);

export function measureDrag(regions: Partial<Record<string, HTMLElement | null>>, frame: HTMLElement, exclude: HTMLElement | null,
                            c: DOMRect, w: number, h: number): Hit | null {
    const dock = frame.querySelector('.ux-dock');
    if (!dock) return null;
    const f = frame.getBoundingClientRect();
    // The point that decides: the grabbed head (its left part, for a wide card).
    const cx = c.left + Math.min(c.width / 2, 110) - f.left, cy = c.top + 16 - f.top;
    const none = (): Hit => ({region: null, index: 0, view: {region: null, scrolls: false, free: {x: Math.round(c.left - f.left), y: Math.round(c.bottom - f.top + 6), above: Math.round(c.top - f.top - 24)}}});

    let best: Target | null = null;
    {
        const band = BAND * Math.min(f.width, f.height);
        // The card's own edges decide whether it is near the board's edge (a card kept inside the board by clamping is as near as it gets).
        // A card too tall (or too wide) to leave the band on both sides is judged by its other axis only, so it can still float.
        const fitsX = c.width < f.width - 2 * band, fitsY = c.height < f.height - 2 * band;
        const nearX = Math.min(c.left - f.left, f.right - c.right) <= band, nearY = Math.min(c.top - f.top, f.bottom - c.bottom) <= band;
        if (!(fitsX && nearX) && !(fitsY && nearY) && (fitsX || fitsY)) return none();
        // The anchor is the one nearest the card's middle; the grabbed head (cx, cy) decides the place within a stack.
        const mx = (c.left + c.right) / 2 - f.left, my = (c.top + c.bottom) / 2 - f.top;
        let bestDist = Infinity;
        for (const r of TARGETS) {
            const d = Math.hypot(mx - ANCHOR_AT[r][0] * f.width, my - ANCHOR_AT[r][1] * f.height);
            if (d < bestDist) { best = r; bestDist = d; }
        }
    }
    if (!best) return none();

    const regionEl = regions[best];
    const horiz = AXIS[best] === 'h';
    const live = regionEl ? Array.from(regionEl.children).filter((ch): ch is HTMLElement => ch instanceof HTMLElement && ch !== exclude
        && !ch.classList.contains('is-floating')).sort(byOrder) : [];
    const cards = live.filter(ch => ch.hasAttribute('data-dock-item'));
    const gap = live.find(isGap);
    const size = (e: HTMLElement) => horiz ? e.offsetWidth : e.offsetHeight;

    // Does the stack scroll with the card in it? The room is what its anchor allows.
    const need = cards.reduce((a, e) => a + size(e), 0) + GAP * cards.length + (horiz ? w : h);
    const col = regionEl?.parentElement;
    const others = col && regionEl ? Array.from(col.children).filter(e => e !== regionEl && e instanceof HTMLElement && e.hasAttribute('data-region') && e.offsetHeight > 0)
        .reduce((a, e) => a + (e as HTMLElement).offsetHeight + GAP, 0) : 0;
    const cap = regionEl ? parseFloat(getComputedStyle(regionEl).maxHeight) : NaN;
    const room = horiz ? (col?.clientWidth ?? f.width) : best === 'ml' || best === 'mr' ? (col?.clientHeight ?? f.height) - others - GAP
        : Number.isFinite(cap) ? cap : (col?.clientHeight ?? f.height * 0.45);
    const scrolls = need > room + 0.5;

    // Where in the stack: card centres as they would lie without the gap (it shifts them by its growth rule).
    const settled = (e: HTMLElement) => {
        const b = e.getBoundingClientRect(), t = getComputedStyle(e).transform;
        const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : null;
        const dx = m?.m41 ?? 0, dy = m?.m42 ?? 0;
        return horiz ? b.left - dx - f.left + b.width / 2 : b.top - dy - f.top + b.height / 2;
    };
    const s = gap ? size(gap) + GAP : 0;
    const gi = gap ? live.indexOf(gap) : 0;
    const grows = GROWS[best];
    const head = horiz ? cx : cy;
    let index = 0;
    live.forEach((e, i) => {
        if (isGap(e) || !e.hasAttribute('data-dock-item')) return;
        const after = i > gi;
        const shift = !gap ? 0 : grows === 'start' ? (after ? -s : 0) : grows === 'end' ? (after ? 0 : s) : (after ? -s / 2 : s / 2);
        if (settled(e) + shift < head) index++;
    });
    return {region: best, index, view: {region: best, scrolls, free: null}};
}
