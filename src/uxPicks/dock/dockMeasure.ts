import {AXIS, TARGETS, type Outline, type Target} from './dockLayout';

/**
 * Where a dragged card (or the lesson card) would dock: the stack it is over, the index it would take there, and the
 * outlines of every insertion position. A stack that would overflow with the card still offers the position (it scrolls
 * by design); its label then reads "... · se drsi".
 */
export interface Hit { region: Target | null; index: number; outlines: Outline[]; }

const GAP = 8;
/** A dragged card within this many pixels of a stack docks into it when released. */
export const SNAP = 48;
export const BAR = 8;
export const REGION_LABEL: Record<Target, string> = {
    'top-start': 'Levo', 'top-end': 'Desno', 'top-row': 'Zgoraj', 'bottom-row': 'Spodaj', 'bottom-end': 'Spodaj desno',
};

const isGap = (e: HTMLElement) => e.classList.contains('ux-dock-gap');
const byOrder = (a: HTMLElement, b: HTMLElement) => Number(a.style.order) - Number(b.style.order);

export function measureDrag(regions: Partial<Record<string, HTMLElement | null>>, frame: HTMLElement, exclude: HTMLElement | null,
                            c: DOMRect, w: number, h: number): Hit | null {
    const rail = frame.querySelector('.ux-dock-top');
    if (!rail) return null;
    const f = frame.getBoundingClientRect(), rr = rail.getBoundingClientRect();
    const out: Outline[] = [];
    let best: Target | null = null, bestDist = Infinity, bestArea = Infinity, bestIndex = 0;
    // The point that decides: the grabbed head (its left part, for a wide card).
    const cx = c.left + Math.min(c.width / 2, 110), cy = c.top + 16;

    for (const r of TARGETS) {
        const regionEl = regions[r];
        if (!regionEl) continue;
        const horiz = AXIS[r] === 'h';
        const rb = regionEl.getBoundingClientRect();
        if (horiz ? rb.width <= 0 : false) continue;
        const live = Array.from(regionEl.children).filter((ch): ch is HTMLElement => ch instanceof HTMLElement && ch !== exclude
            && !ch.classList.contains('is-floating')).sort(byOrder);
        const cards = live.filter(ch => ch.hasAttribute('data-dock-item'));
        const size = (e: HTMLElement) => horiz ? e.offsetWidth : e.offsetHeight;
        const need = cards.reduce((a, e) => a + size(e), 0) + GAP * cards.length + (horiz ? w : h);
        const maxH = parseFloat(getComputedStyle(regionEl).maxHeight);
        const room = horiz ? rb.width - 4
            : (r === 'bottom-end' ? (Number.isFinite(maxH) ? maxH : Infinity) : rr.height) - 4;
        const fits = true, scrolls = need > room + 0.5;

        // The settled box of an element, without a running glide's transform, relative to the frame.
        const rect = (e: HTMLElement) => {
            const b = e.getBoundingClientRect(), t = getComputedStyle(e).transform;
            const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : null;
            const dx = m?.m41 ?? 0, dy = m?.m42 ?? 0;
            return {left: b.left - dx - f.left, right: b.right - dx - f.left, top: b.top - dy - f.top, bottom: b.bottom - dy - f.top};
        };
        const left = (r === 'top-start' ? rb.left : rb.right - w) - f.left;
        const tag = (x: number, y: number) => out.push({region: r, x: Math.round(x), y: Math.round(y), w: 0, h: 16, bar: false, label: REGION_LABEL[r] + (scrolls ? ' · se drsi' : '')});

        // The zone the card must be near, and the position it would take.
        let zone: {left: number; right: number; top: number; bottom: number};
        if (horiz) {
            const hh = Math.max(rb.height, h);
            const top = r === 'top-row' ? rr.top : f.bottom - 10 - hh;
            zone = {left: rb.left, right: rb.right, top, bottom: top + hh};
        } else if (rb.width > 0) zone = rb;
        else {
            const o = r === 'top-start' ? {x: rr.left, y: rr.top} : r === 'top-end' ? {x: rr.right - w, y: rr.top} : {x: f.right - 10 - w, y: f.bottom - 10 - h};
            zone = {left: o.x, right: o.x + w, top: o.y, bottom: o.y + h};
        }
        if (fits) {
            const dx = Math.max(zone.left - cx, 0, cx - zone.right), dy = Math.max(zone.top - cy, 0, cy - zone.bottom);
            const near = c.left < zone.right + SNAP && c.right > zone.left - SNAP && c.top < zone.bottom + SNAP && c.bottom > zone.top - SNAP;
            const dist = Math.hypot(dx, dy), area = (zone.right - zone.left) * (zone.bottom - zone.top);
            if (near && (dist < bestDist || (dist === bestDist && area < bestArea))) {
                best = r; bestDist = dist; bestArea = area;
                let index = 0;
                if (horiz) {
                    let x = rb.width > 0 ? rb.left - regionEl.scrollLeft + 2 : zone.left;
                    cards.forEach(e => { if (x + e.offsetWidth / 2 < cx) index++; x += e.offsetWidth + GAP; });
                } else {
                    const heights = cards.map(e => e.offsetHeight);
                    const total = heights.reduce((a, b) => a + b, 0) + GAP * Math.max(0, cards.length - 1);
                    let y = r === 'bottom-end' ? f.bottom - 10 - total : (rb.width > 0 ? rb.top - regionEl.scrollTop + 2 : zone.top);
                    const head = c.top + 16; // the grabbed head decides the position
                    heights.forEach(ch => { if (y + ch / 2 < head) index++; y += ch + GAP; });
                }
                bestIndex = index;
            }
        }

        // Outlines of this stack.
        if (live.length === 0) {
            const sx = horiz ? zone.left - f.left + 2 : (r === 'top-start' ? zone.left : zone.right - w) - f.left;
            const sy = zone.top - f.top;
            const x = Math.max(0, Math.round(sx)), y = Math.max(0, Math.round(Math.min(sy, f.bottom - h - f.top)));
            out.push({region: r, x, y, w, h, bar: false}); tag(x + 8, y + 8);
            continue;
        }
        const first = rect(live[0]), last = rect(live[live.length - 1]);
        {
            const bar = (p: number, rr0: {left: number; top: number; bottom: number}) => out.push(horiz
                ? {region: r, x: Math.round(p), y: Math.round(Math.min(first.top, rr0.top)), w: BAR, h: Math.round(Math.max(...live.map(e => rect(e).bottom)) - Math.min(...live.map(e => rect(e).top))), bar: true}
                : {region: r, x: Math.round(left), y: Math.round(p), w, h: BAR, bar: true});
            const start = (e: ReturnType<typeof rect>) => horiz ? e.left : e.top;
            const end = (e: ReturnType<typeof rect>) => horiz ? e.right : e.bottom;
            if (!isGap(live[0]) && fits) bar(start(first) - BAR - 1, first);
            for (let i = 0; i + 1 < live.length; i++) {
                if (isGap(live[i]) || isGap(live[i + 1]) || !fits) continue;
                bar((end(rect(live[i])) + start(rect(live[i + 1]))) / 2 - BAR / 2, first);
            }
            if (!isGap(live[live.length - 1]) && fits) bar(end(last) + 1, first);
        }
        // The label: free space beyond the stack's far end.
        if (!horiz) tag(left, r === 'bottom-end' ? first.top - BAR - 20 : last.bottom + BAR + 4);
        else tag(first.left, r === 'bottom-row' ? Math.min(...live.map(e => rect(e).top)) - 20 : Math.max(...live.map(e => rect(e).bottom)) + 4);
    }
    return {region: best, index: bestIndex, outlines: out};
}
