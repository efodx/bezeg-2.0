/** Where a puck's help card stands: the side of the puck with room for it, shifted along that side to stay inside the bounds. */

export interface Box {left: number; top: number; right: number; bottom: number}
export type HelpSide = 'above' | 'below' | 'left' | 'right';
export interface HelpPlacement {
    side: HelpSide;
    /** Pixels to move the card along the side (x for above/below, y for left/right) so it stays inside the bounds. */
    shift: number;
    /** The tallest the card may be; it scrolls inside beyond that. */
    maxHeight: number;
    /** The widest the card may be. */
    maxWidth: number;
}

/** Space kept between the card and the edge of the bounds, and between the card and its puck. */
export const HELP_MARGIN = 6;
/** The CSS gap between puck and card (`--puck-clear`). */
export const HELP_GAP = 15;

function fits(side: HelpSide, puck: Box, w: number, h: number, bounds: Box): boolean {
    switch (side) {
        case 'above': return puck.top - HELP_GAP - h >= bounds.top && w <= bounds.right - bounds.left;
        case 'below': return puck.bottom + HELP_GAP + h <= bounds.bottom && w <= bounds.right - bounds.left;
        case 'left': return puck.left - HELP_GAP - w >= bounds.left && h <= bounds.bottom - bounds.top;
        default: return puck.right + HELP_GAP + w <= bounds.right && h <= bounds.bottom - bounds.top;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Chooses the side for a card of `size` beside `puck` inside `bounds` (the nearest clipping ancestor cut to the viewport).
 * A row strip prefers above (the strip docks at the board's foot), then below, right, left; a column strip prefers the
 * side facing the board (right, then left) so the card does not cover the pucks stacked above and below. When no side
 * fits whole, the side with the most room is used and the card is made to scroll.
 */
export function helpPlacement(puck: Box, size: {width: number; height: number}, bounds: Box, column: boolean): HelpPlacement {
    const order: HelpSide[] = column ? ['right', 'left', 'above', 'below'] : ['above', 'below', 'right', 'left'];
    const room: Record<HelpSide, number> = {
        above: puck.top - bounds.top, below: bounds.bottom - puck.bottom,
        left: puck.left - bounds.left, right: bounds.right - puck.right,
    };
    const {width, height} = size;
    const side = order.find(s => fits(s, puck, width, height, bounds)) ?? order.reduce((a, b) => room[b] > room[a] ? b : a);
    const availW = bounds.right - bounds.left - 2 * HELP_MARGIN;
    const availH = bounds.bottom - bounds.top - 2 * HELP_MARGIN;
    const maxWidth = side === 'left' || side === 'right' ? Math.max(0, room[side] - HELP_GAP - HELP_MARGIN) : availW;
    const maxHeight = side === 'above' || side === 'below' ? Math.max(0, room[side] - HELP_GAP - HELP_MARGIN) : availH;
    const w = Math.min(width, maxWidth);
    const h = Math.min(height, maxHeight);
    // Card origin along the side starts at the puck's own edge (left: 0 / top: 0), then moves into the bounds.
    const shift = side === 'above' || side === 'below'
        ? clamp(puck.left, bounds.left + HELP_MARGIN, Math.max(bounds.left + HELP_MARGIN, bounds.right - HELP_MARGIN - w)) - puck.left
        : clamp(puck.top, bounds.top + HELP_MARGIN, Math.max(bounds.top + HELP_MARGIN, bounds.bottom - HELP_MARGIN - h)) - puck.top;
    return {side, shift, maxHeight, maxWidth};
}
