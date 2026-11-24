// Bridges the layout result (`{x, y, w, h}`, board pixels) to the fit core (`{x, y, width, height}`). Pure.
import type {LayoutResult, Rect as LayoutRect} from '../layout/boardLayout';
import type {Rect} from './viewFit';

export function rectFromLayout(r: LayoutRect): Rect {
    return {x: r.x, y: r.y, width: r.w, height: r.h};
}

/**
 * The card-free rectangle the layout leaves, in fit pixels. Free cards are not part of it (the layout's rule 8): they float
 * over the board and the learner put them there.
 */
export function freeRect(layout: LayoutResult): Rect {
    return rectFromLayout(layout.free);
}

/** Docked cards and the pucks strip: the rectangles `fitView` keeps its must points clear of. */
export function obstacleRects(layout: LayoutResult): Rect[] {
    const out = layout.cards.filter(c => c.anchor !== 'free').map(c => rectFromLayout(c.rect));
    if (layout.pucks) out.push(rectFromLayout(layout.pucks));
    return out;
}
