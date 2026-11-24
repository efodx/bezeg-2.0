// Pure board layout: one call returns every final rectangle, fold and cut.
// Spec: docs/reviews/ux-picks-app-wide/03-layout-design.md. No React, JSXGraph or DOM.

export type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bc' | 'br';
export type StripDock = 'bottom-left' | 'bottom-centre' | 'bottom-right' | 'left' | 'right';
export interface Size { w: number; h: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface CardInput {
  id: string;
  natural: Size;
  min: Size;
  /** What a cut free card keeps on the board at the learner's top edge, independent of the frame's text (the kept controls row, the
   *  pinned rows and the bar). Default: head, bar and a short body. Never above `min.h`. */
  anchorMin?: number;
  foldedHeight: number;
  rowBreaks: readonly number[];
  priority: number;
  defaultAnchor: Anchor;
  defaultOrder: number;
  /** Height of a bar row inside the card under its scroll area ("Več", the Povrni row). Already part of `natural.h` and `min.h`;
   *  a cut lands on the largest rowBreak that fits above it, then adds it back. Default 0. */
  reserve?: number;
  /** A docked cut lands exactly on the room, not on a row break: the lesson card, whose cut (and so its Back/Next row, when it is
   *  anchored at the bottom) must not change from frame to frame. Its body scrolls behind the bar. */
  exactCut?: boolean;
  /** Starts folded when nothing else decides (rule 4, after the budget): Legenda and `section:` cards. */
  defaultFolded?: boolean;
}

export type Placement =
  | { kind: 'docked'; anchor: Anchor; order: number }
  | { kind: 'free'; x: number; y: number };

export interface LayoutInput {
  board: Size;
  cards: readonly CardInput[];
  stored: Readonly<Record<string, Placement>>;
  storedFolds: Readonly<Record<string, boolean>>;
  frame?: { open: readonly string[]; usesTools: boolean };
  pucks?: Size;
  /** Where the strip docks (rules 2, 2j, 2k). Default 'bottom-left'. */
  stripDock?: StripDock;
  /** The strip's slots (measured), to know how tall it wraps in a narrower width. Default: one slot of the strip's size. */
  puckSlots?: readonly Size[];
  maxSpan: number;
  columnMaxFraction: number;
  gap: number;
  frozenFolds?: Readonly<Record<string, boolean>>;
  /** First view: of the ids in `order` that are present, only the first `open` start open, the rest start folded.
   *  Applies to cards without a stored fold that are not frame-opened. */
  budget?: { open: number; order: readonly string[] };
  /** "Več" on a cut card: it is not cut, and lower-priority open cards of its column fold to make room (never frame-opened,
   *  learner-opened or lesson cards). Not stored. */
  expanded?: string;
}

export interface CardLayout { id: string; rect: Rect; folded: boolean; cut: number | null; anchor: Anchor | 'free' }
export interface LayoutResult {
  cards: readonly CardLayout[];
  pucks: Rect | null;
  free: Rect;
  band: { x: number; w: number };
}

/** The strip's height when its slots wrap into rows within `width` (8 px between slots and rows); one row when they all fit. */
export function wrappedStripHeight(slots: readonly Size[], width: number): number {
  let total = 0, rowW = 0, rowH = 0, rows = 0;
  for (const slot of slots) {
    if (rowW > 0 && rowW + 8 + slot.w > width) { total += rowH; rows += 1; rowW = 0; rowH = 0; }
    rowW += (rowW > 0 ? 8 : 0) + slot.w;
    rowH = Math.max(rowH, slot.h);
  }
  return total + rowH + 8 * rows;
}

type Column ='left' | 'centre' | 'right';
const COLUMN_OF: Record<Anchor, Column> = { tl: 'left', ml: 'left', tc: 'centre', bc: 'centre', tr: 'right', mr: 'right', br: 'right' };
// Anchors of a column from the top sequence (stacking down) and the bottom sequence (stacking up).
const TOP_ANCHORS: Record<Column, Anchor[]> = { left: ['tl', 'ml'], centre: ['tc'], right: ['tr', 'mr'] };
const BOTTOM_ANCHORS: Record<Column, Anchor[]> = { left: [], centre: ['bc'], right: ['br'] };

interface State {
  card: CardInput;
  placement: Placement;
  stored: boolean; // placement came from `stored`
  folded: boolean;
  pinned: boolean; // never folded by rule 5
  cut: number | null;
}

const byOrderThenId = (a: State, b: State): number => {
  const oa = a.placement.kind === 'docked' ? a.placement.order : 0;
  const ob = b.placement.kind === 'docked' ? b.placement.order : 0;
  return oa - ob || (a.card.id < b.card.id ? -1 : a.card.id > b.card.id ? 1 : 0);
};

/** Body a free card keeps on the board under its head and "Več" bar when it is cut at the learner's top edge. */
const FREE_MIN_BODY = 50;

const heightOf = (s: State): number => s.cut ?? (s.folded ? s.card.foldedHeight : s.card.natural.h);

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The width every puck slot takes in a side dock (the widest a puck gets); pucks.css sets the same width. */
export const PUCK_COLUMN_WIDTH = 160;

/** Rule 2k: the strip as its own column at the left or right board edge. Slots stack top-down from `gap` (8 px between), wrap into
 *  further columns when taller than `board.h - 2 * gap`; every column is as wide as the widest slot. */
function sideStrip(input: LayoutInput, dock: 'left' | 'right'): Rect {
  const { board, gap } = input;
  const slots = input.puckSlots ?? (input.pucks ? [input.pucks] : []);
  const slotW = slots.length > 0 ? Math.max(PUCK_COLUMN_WIDTH, ...slots.map((s) => s.w)) : 0;
  let columns = 0, y = 0, tallest = 0;
  for (const slot of slots) {
    if (columns > 0 && y > 0 && y + 8 + slot.h > board.h - 2 * gap) { tallest = Math.max(tallest, y); columns += 1; y = 0; } else if (columns === 0) columns = 1;
    y += (y > 0 ? 8 : 0) + slot.h;
  }
  tallest = Math.max(tallest, y);
  const w = columns * slotW + Math.max(0, columns - 1) * 8;
  return { x: dock === 'left' ? gap : board.w - gap - w, y: gap, w, h: tallest };
}

function layoutSide(input: LayoutInput, dock: 'left' | 'right'): LayoutResult {
  const { board, gap } = input;
  const strip = sideStrip(input, dock);
  const used = strip.w + gap; // what the strip takes at its edge; the card column sits beside it
  const offset = dock === 'left' ? strip.x + strip.w : 0;
  const stored: Record<string, Placement> = {};
  for (const [id, p] of Object.entries(input.stored)) stored[id] = p.kind === 'free' && dock === 'left' ? { ...p, x: p.x - offset } : p;
  const sub = layoutOnce({ ...input, pucks: undefined, puckSlots: undefined, stored, board: { w: Math.max(0, board.w - used), h: board.h } }, false);
  const cards = sub.cards.map((c) => ({ ...c, rect: { ...c.rect, x: c.rect.x + offset } }));
  const obstacles = cards.filter((c) => c.anchor !== 'free').map((c) => c.rect);
  obstacles.push(strip);
  return { cards, pucks: strip, free: largestEmptyRect(board, obstacles), band: { x: sub.band.x + offset, w: sub.band.w } };
}

export function layoutBoard(input: LayoutInput): LayoutResult {
  const dock = input.stripDock ?? 'bottom-left';
  if (input.pucks && (dock === 'left' || dock === 'right')) return layoutSide(input, dock);
  const plain = layoutOnce(input, false);
  if (!plain.pucks || !input.pucks) return plain;
  if (dock !== 'bottom-left') {
    // Rule 2j, as 2h/2i for the left dock: when the stack above the strip still reaches into it after every cut, the stack's last open
    // card folds too (down to heads), then the learner-opened ones; the strip itself is never cut.
    const clear = (r: LayoutResult): boolean => !r.cards.some((c) => c.anchor !== 'free' && overlaps(r.pucks as Rect, c.rect));
    // A bottom-right strip widened leftwards must not run under centre cards that reach the bottom: re-plan it right of them.
    const plan = (level: 0 | 1 | 2): LayoutResult => {
      const r = layoutOnce(input, false, level);
      const strip = r.pucks;
      if (dock !== 'bottom-right' || !strip) return r;
      const hit = r.cards.filter((c) => c.anchor !== 'free' && COLUMN_OF[c.anchor] !== 'right' && overlaps(strip, c.rect));
      return hit.length ? layoutOnce(input, false, level, Math.max(...hit.map((c) => c.rect.x + c.rect.w)) + input.gap) : r;
    };
    const first = plan(0);
    // Never place the strip off the board's top: when it is taller than the board allows at this dock, this frame uses the
    // bottom-left rules (the stored dock does not change).
    if (first.pucks && first.pucks.y < input.gap) return layoutBoard({ ...input, stripDock: 'bottom-left' });
    if (clear(first)) return first;
    for (const level of [1, 2] as const) {
      const next = plan(level);
      if (next.pucks && next.pucks.y >= input.gap && clear(next)) return next;
    }
    return first;
  }
  const strip = plain.pucks;
  const left = plain.cards.filter((c) => c.anchor === 'tl' || c.anchor === 'ml');
  if (!left.some((c) => overlaps(strip, c.rect))) return plain;
  // Rule 2f/2g: the strip covers a left-column card (nothing fit). Try it right of the left column, running under the other columns,
  // which give up its height at the bottom (folding lowest priority first, rule 5) so that their heads stay above it.
  const fits = (r: LayoutResult): boolean => {
    const s = r.pucks;
    return s !== null && s.w > 0 && s.y >= 0 && s.x + s.w <= input.board.w && s.y + s.h <= input.board.h && !r.cards.some((c) => overlaps(s, c.rect));
  };
  const alt = layoutOnce(input, true);
  if (fits(alt)) return alt;
  // Rule 2h: last resort before the strip covers the left column (its nav row would be unreachable): the right and centre columns
  // may fold their last open card too, down to heads, so that the strip runs beside the left column. The learner can unfold it.
  const folded = layoutOnce(input, true, 1);
  if (fits(folded)) return folded;
  // Rule 2i: when that still fails, cards the frame or the learner opened give way too (never the lesson card): an unreachable
  // Back/Next is worse than a folded Orodja, which the learner unfolds with one click.
  const forced = layoutOnce(input, true, 2);
  return fits(forced) ? forced : plain;
}

function layoutOnce(input: LayoutInput, beside: boolean, foldLast: 0 | 1 | 2 = 0, stripLeft = -Infinity): LayoutResult {
  const { board, cards, stored, storedFolds, frame, pucks, maxSpan, columnMaxFraction, gap, frozenFolds, budget, expanded } = input;

  // Rule 1: band.
  const bandW = Math.min(board.w, maxSpan);
  const band = { x: (board.w - bandW) / 2, w: bandW };

  // Rule 2: strip. Only the left column gives up the strip's height; the strip's width is
  // capped after the columns are placed (see below).
  const dock = input.stripDock ?? 'bottom-left';
  const stripCol: Column | null = pucks ? (dock === 'bottom-centre' ? 'centre' : dock === 'bottom-right' ? 'right' : null) : null;
  let bottomStrip = { x: 0, w: 0, h: 0 }; // rule 2j: the strip as the bottom member of the centre or right stack
  const reserve = pucks && dock === 'bottom-left' ? pucks.h + gap : 0;
  const colWidth: Partial<Record<Column, number>> = {};
  const colX: Partial<Record<Column, number>> = {};
  // Beside mode: the strip's x, width and wrapped height when it starts right of the left column and runs to the band's edge.
  const besideX = (): number => (colX.left ?? 0) + (colWidth.left ?? 0) + gap;
  const besideW = (): number => Math.max(0, Math.min(pucks?.w ?? 0, band.x + band.w - besideX() - gap));
  const besideH = (): number => pucks ? Math.max(pucks.h, wrappedStripHeight(input.puckSlots ?? [pucks], besideW())) : 0;
  let stripAfterLeft = false; // the left column did not fit above the strip: the strip starts right of it

  // Rule 4: open or folded.
  const frameOpen = new Set(frame?.open ?? []);
  if (frame?.usesTools) frameOpen.add('tools');
  const present = new Set(cards.map((c) => c.id));
  const budgeted = budget ? budget.order.filter((id) => present.has(id)) : [];
  const budgetOpen = new Set(budgeted.slice(0, budget?.open ?? 0));
  const states: State[] = cards.map((card) => {
    const placement: Placement = stored[card.id] ?? { kind: 'docked', anchor: card.defaultAnchor, order: card.defaultOrder };
    const frozen = frozenFolds?.[card.id];
    const learner = storedFolds[card.id];
    let folded: boolean;
    if (frozen !== undefined) folded = frozen;
    else if (frameOpen.has(card.id)) folded = false;
    else if (learner !== undefined) folded = learner;
    else if (budgeted.includes(card.id)) folded = !budgetOpen.has(card.id);
    else folded = card.defaultFolded ?? false;
    const pinned = card.priority === Infinity || frameOpen.has(card.id) || learner === false;
    return { card, placement, stored: card.id in stored, folded, pinned, cut: null };
  });

  const docked = (s: State): s is State & { placement: { kind: 'docked'; anchor: Anchor; order: number } } => s.placement.kind === 'docked';
  const rects = new Map<string, Rect>();

  // Side columns first: the centre column's width depends on them.
  for (const col of ['left', 'right', 'centre'] as Column[]) {
    const members = states.filter(docked).filter((s) => COLUMN_OF[s.placement.anchor] === col);
    if (members.length === 0 && col !== stripCol) continue;
    if (col === stripCol && pucks) {
      // Rule 2j: the strip is not capped at its column's width. It runs from the column's anchored edge (right: the band's right edge;
      // centre: centred) towards its natural width, bounded by the left column (and, for centre, the right column), and wraps only
      // when that is too narrow.
      const lb = Math.max(colX.left !== undefined ? colX.left + (colWidth.left ?? 0) + gap : band.x + gap, stripLeft);
      let x: number, w: number;
      if (col === 'right') {
        // Rule 1: a stored (learner-docked) placement anchors to the board's edge, not to the band the strip may have narrowed, so a
        // stored right column keeps its place whatever dock the strip takes; only default members follow the band.
        const rightEdge = members.some((s) => s.stored) ? board.w - gap : band.x + band.w - gap;
        w =Math.max(0, Math.min(pucks.w, rightEdge - lb));
        x = rightEdge - w;
      } else {
        const rb = colX.right !== undefined ? colX.right - gap : band.x + band.w - gap;
        const cw = members.length ? Math.max(0, Math.min(Math.max(...members.map((s) => s.card.natural.w)), band.w - (colWidth.left ?? 0) - (colWidth.right ?? 0) - 4 * gap)) : 0;
        const lo = colX.left !== undefined ? colX.left + (colWidth.left ?? 0) + gap : -Infinity;
        const hi = colX.right !== undefined ? colX.right - gap - cw : Infinity;
        const cx = Math.max(lo, Math.min((board.w - cw) / 2, hi)) + cw / 2;
        w = Math.max(0, Math.min(pucks.w, 2 * Math.min(cx - lb, rb - cx)));
        x = cx - w / 2;
      }
      bottomStrip = { x, w, h: Math.max(pucks.h, wrappedStripHeight(input.puckSlots ?? [pucks], w)) };
    }
    const total = (): number => members.reduce((sum, s) => sum + heightOf(s), 0) + (members.length - 1) * gap;
    const wide = members.find((s) => s.card.id === expanded); // "Več": never cut (until nothing else is left to give)
    // The left column gives up the strip's height. When even its smallest cuts do not fit that, the strip gives way instead (it moves
    // right of the column, below), so a card is never laid over it: the column is planned again at the full height.
    // Rule 2b: the strip moves right of the column only when it still fits the board's height wrapped in the width that leaves it.
    // Rule 2c: else it stays at the bottom, full width, and the column is cut to the room above it, down to each card's anchor sliver.
    const stripRightFits = (): boolean => {
      if (!pucks) return false;
      const open = members.filter((s) => !s.folded);
      const leftW = Math.min(Math.max(...(open.length ? open : members).map((s) => s.card.natural.w)), columnMaxFraction * band.w);
      const rightMembers = states.filter(docked).filter((s) => COLUMN_OF[s.placement.anchor] === 'right');
      const rightEdge = rightMembers.length === 0
        ? band.x + band.w
        : (rightMembers.some((s) => s.stored) ? board.w - gap : band.x + band.w - gap)
          - Math.min(Math.max(...rightMembers.map((s) => s.card.natural.w)), columnMaxFraction * band.w);
      const x0 = (members.some((s) => s.stored) ? gap : band.x + gap) + leftW + gap;
      const w = Math.min(pucks.w, rightEdge - x0 - gap);
      return w > 0 && wrappedStripHeight(input.puckSlots ?? [pucks], w) <= board.h - 2 * gap;
    };
    const attempts: { reserve: number; sliver: 0 | 1 }[] = col === 'left' && reserve > 0
      // Order: strip under the column; strip beside it; column cut to its anchor slivers above the strip; strip beside the slivers;
      // last, when nothing fits (nothing left to fold), the slivers again above the strip: the kept nav row stays reachable, so the
      // strip may cover the sliver's body (open question, task 09). Nothing is ever cut below the anchor sliver.
      ? beside ? [{ reserve: 0, sliver: 0 }] : [{ reserve, sliver: 0 }, { reserve: 0, sliver: 0 }, { reserve, sliver: 1 }, { reserve: 0, sliver: 1 }, { reserve, sliver: 1 }]
      : [{ reserve: col === 'left' ? reserve : col === stripCol ? bottomStrip.h + gap : beside && pucks && colX.left !== undefined ? besideH() + gap : 0, sliver: 0 }];
    const before = members.map((s) => ({ folded: s.folded, cut: s.cut }));
    let colReserve = attempts[0].reserve;
    let avail = 0;
    for (const [attemptIndex, attempt] of attempts.entries()) {
    colReserve = attempt.reserve;
    avail = board.h - 2 * gap - colReserve;
    const floorOf = (s: State): number => attempt.sliver === 0 ? s.card.min.h : Math.min(s.card.min.h, s.card.anchorMin ?? s.card.min.h);
    members.forEach((s, i) => { s.folded = before[i].folded; s.cut = before[i].cut; });

    // Rule 5: fold before clip (skipped while a drag freezes the folds).
    if (!frozenFolds) {
      while (total() > avail) {
        // With an expanded card only lower-priority cards of its column give way to it.
        const open = members.filter((s) => !s.folded && (!s.pinned || (foldLast === 2 && col !== 'left' && s.card.priority !== Infinity)) && (!wide || (s !== wide && s.card.priority < wide.card.priority)));
        // Folding a column's last open card frees room for nothing and hides all it holds: cut it instead (rule 6).
        if (open.length === 0 || (members.filter((s) => !s.folded).length <= 1 && !(foldLast && col !== 'left'))) break;
        open.sort((a, b) => a.card.priority - b.card.priority || (a.card.id < b.card.id ? -1 : 1));
        open[0].folded = true;
      }
    }

    // Rule 6: cut the tallest open card until the column fits.
    const exhausted = new Set<State>();
    let exempt = wide;
    while (total() > avail) {
      const open = members.filter((s) => !s.folded && !exhausted.has(s) && s !== exempt && heightOf(s) > floorOf(s));
      if (open.length === 0) {
        if (exempt) { exempt = undefined; continue; } // last resort: cut the expanded card too
        break;
      }
      open.sort((a, b) => heightOf(b) - heightOf(a) || (a.card.id < b.card.id ? -1 : 1));
      const s = open[0];
      const room = avail - (total() - heightOf(s));
      const bar = s.card.reserve ?? 0;
      const fitting = s.card.rowBreaks.filter((b) => b <= room - bar);
      const cut = Math.max(floorOf(s), s.card.exactCut ? room : fitting.length ? Math.max(...fitting) + bar : 0);
      if (cut >= heightOf(s)) exhausted.add(s);
      else s.cut = cut;
    }
    if (total() <= avail && (attempt.reserve > 0 || col !== 'left' || stripRightFits())) break;
    if (attemptIndex === attempts.length - 1) break;
    }
    if (col === 'left' && reserve > 0 && colReserve === 0) stripAfterLeft = true;

    // Column width and x.
    const openOnes = members.filter((s) => !s.folded);
    const widest = members.length ? Math.max(...(openOnes.length ? openOnes : members).map((s) => s.card.natural.w)) : 0;
    // The centre column shrinks to what the side columns leave; cards take the column width
    // (the presenter measures their height at that width).
    const colW = col === 'centre'
      ? Math.max(0, Math.min(widest, band.w - (colWidth.left ?? 0) - (colWidth.right ?? 0) - 4 * gap))
      : Math.min(widest, columnMaxFraction * band.w);
    colWidth[col] = colW;
    const edge = members.some((s) => s.stored); // a learner-docked card anchors the column to the board edge
    let x: number;
    if (col === 'left') x = edge ? gap : band.x + gap;
    else if (col === 'right') x = (edge ? board.w - gap : band.x + band.w - gap) - colW;
    else {
      // Centred, but pushed aside when unequal side columns would otherwise touch it.
      const lo = colX.left !== undefined ? colX.left + (colWidth.left ?? 0) + gap : -Infinity;
      const hi = colX.right !== undefined ? colX.right - gap - colW : Infinity;
      x = Math.max(lo, Math.min((board.w - colW) / 2, hi));
    }
    colX[col] = x;

    // Rule 3: stacks. Order 0 sits nearest the anchor's edge; ml/mr start below the top stack.
    let y = gap;
    for (const a of TOP_ANCHORS[col]) {
      for (const s of members.filter((m) => m.placement.anchor === a).sort(byOrderThenId)) {
        rects.set(s.card.id, { x, y, w: colW, h: heightOf(s) });
        y += heightOf(s) + gap;
      }
    }
    y = board.h - gap - colReserve;
    for (const a of BOTTOM_ANCHORS[col]) {
      for (const s of members.filter((m) => m.placement.anchor === a).sort(byOrderThenId)) {
        rects.set(s.card.id, { x, y: y - heightOf(s), w: colW, h: heightOf(s) });
        y -= heightOf(s) + gap;
      }
    }
  }

  // Strip width: up to the bottom-centre stack's left edge, else the right column's left edge
  // (else the band's edge). Extension: a centre card reaching down into the strip's rows caps it too.
  let stripRect: Rect | null = null;
  if (pucks && stripCol) {
    stripRect = { x: bottomStrip.x, y: board.h - gap - bottomStrip.h, w: bottomStrip.w, h: bottomStrip.h };
  } else if (pucks) {
    const x = stripAfterLeft && colX.left !== undefined ? besideX() : band.x + gap;
    let h = pucks.h;
    if (beside && stripAfterLeft) h = besideH();
    else if (stripAfterLeft && input.puckSlots) {
      // Beside the left column the strip wraps in what is left of the width: its height is that of the wrapped rows.
      const limitX = colX.right ?? band.x + band.w;
      h = Math.max(h, wrappedStripHeight(input.puckSlots, Math.min(pucks.w, limitX - x - gap)));
    }
    const y = board.h - h - gap;
    const centreBlocks = states.some((s) => {
      const r = rects.get(s.card.id);
      return s.placement.kind === 'docked' && COLUMN_OF[s.placement.anchor] === 'centre' && r !== undefined && r.y + r.h > y;
    });
    const limit = beside ? band.x + band.w : centreBlocks && colX.centre !== undefined ? colX.centre : (colX.right ?? band.x + band.w);
    stripRect = { x, y, w: Math.max(0, Math.min(pucks.w, limit - x - gap)), h };
  }

  // Rule 7: free cards.
  for (const s of states) {
    if (s.placement.kind !== 'free') continue;
    const w = s.card.natural.w;
    const x = Math.max(0, Math.min(s.placement.x, board.w - w));
    // An open card keeps its smallest cut on the board (a head alone is no card); a folded one only its head.
    // Anchor rule: the learner's top edge stays put when the card's height changes (a taller frame, a longer first line). What
    // must remain on the board is therefore a frame-independent sliver (head, "Več" bar and a line or two of body), never the
    // frame's own minimum, which varies; the card is cut to the room instead of moving up.
    const sliver = Math.min(s.card.min.h, s.card.anchorMin ?? s.card.foldedHeight + (s.card.reserve ?? 0) + FREE_MIN_BODY);
    const y = Math.max(0, Math.min(s.placement.y, board.h - (s.folded ? s.card.foldedHeight : Math.min(sliver, Math.max(s.card.foldedHeight, board.h - gap)))));
    // A free card taller than the board room under its top is cut like a docked one: its body scrolls behind "Več", so all of it
    // stays reachable instead of running off the board.
    const room = board.h - y - gap;
    const floor = Math.min(s.card.min.h, Math.max(room, sliver));
    if (!s.folded && heightOf(s) > room && heightOf(s) > floor) {
      const bar = s.card.reserve ?? 0;
      const fitting = s.card.rowBreaks.filter((b) => b <= room - bar);
      const cut = Math.max(floor, fitting.length ? Math.max(...fitting) + bar : 0);
      if (cut < heightOf(s)) s.cut = cut;
    }
    const h = heightOf(s);
    rects.set(s.card.id, { x, y, w, h });
  }

  const result: CardLayout[] = states.map((s) => ({
    id: s.card.id,
    rect: rects.get(s.card.id) as Rect,
    folded: s.folded,
    cut: s.cut,
    anchor: s.placement.kind === 'docked' ? s.placement.anchor : 'free',
  }));

  // Rule 8: free rectangle.
  const obstacles = result.filter((c) => c.anchor !== 'free').map((c) => c.rect);
  if (stripRect) obstacles.push(stripRect);
  return { cards: result, pucks: stripRect, free: largestEmptyRect(board, obstacles), band };
}

function largestEmptyRect(board: Size, obstacles: readonly Rect[]): Rect {
  const clipped = obstacles
    .map((r) => ({ x0: Math.max(0, r.x), y0: Math.max(0, r.y), x1: Math.min(board.w, r.x + r.w), y1: Math.min(board.h, r.y + r.h) }))
    .filter((r) => r.x1 > r.x0 && r.y1 > r.y0);
  const uniq = (v: number[]): number[] => [...new Set(v)].sort((a, b) => a - b);
  const xs = uniq([0, board.w, ...clipped.flatMap((r) => [r.x0, r.x1])]);
  const ys = uniq([0, board.h, ...clipped.flatMap((r) => [r.y0, r.y1])]);
  const cx = board.w / 2;
  const cy = board.h / 2;
  let best: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let bestArea = -1;
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      const x0 = xs[i];
      const x1 = xs[j];
      const blockers = clipped.filter((r) => r.x0 < x1 && r.x1 > x0);
      for (let a = 0; a < ys.length; a++) {
        for (let b = a + 1; b < ys.length; b++) {
          const y0 = ys[a];
          const y1 = ys[b];
          if (blockers.some((r) => r.y0 < y1 && r.y1 > y0)) continue;
          const area = (x1 - x0) * (y1 - y0);
          const dist = Math.hypot((x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy);
          if (area > bestArea + 1e-9 || (Math.abs(area - bestArea) <= 1e-9 && dist < bestDist - 1e-9)) {
            best = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
            bestArea = area;
            bestDist = dist;
          }
        }
      }
    }
  }
  return best;
}

// ---- Drag helpers ----

export interface DropIndex { anchor: Anchor; index: number }

/**
 * Where a drop would dock. With `card` (the dragged card's visible rect) the choice follows the card: its centre in the outer
 * quarter of the board, per axis, picks the nearest anchor in board-relative terms, so top and bottom, left and right, are
 * equally easy however tall the card is. Without it the pointer is used (edge band of 0.28 of the short side).
 */
export function dropTarget(input: LayoutInput, cardId: string, pointer: { x: number; y: number }, card?: Rect): DropIndex | 'free' {
  const { board } = input;
  const points: Record<Anchor, { x: number; y: number }> = {
    tl: { x: 0, y: 0 }, tc: { x: board.w / 2, y: 0 }, tr: { x: board.w, y: 0 },
    ml: { x: 0, y: board.h / 2 }, mr: { x: board.w, y: board.h / 2 },
    bc: { x: board.w / 2, y: board.h }, br: { x: board.w, y: board.h },
  };
  let anchor: Anchor = 'tl';
  let best = Infinity;
  if (card && board.w > 0 && board.h > 0) {
    const nx = (card.x + card.w / 2) / board.w;
    const ny = (card.y + card.h / 2) / board.h;
    if (nx >= 0.25 && nx <= 0.75 && ny >= 0.25 && ny <= 0.75) return 'free';
    for (const a of Object.keys(points) as Anchor[]) {
      const d = Math.hypot(nx - points[a].x / board.w, ny - points[a].y / board.h);
      if (d < best) { best = d; anchor = a; }
    }
  } else {
    const edge = 0.28 * Math.min(board.w, board.h);
    const inside = pointer.x < edge || pointer.x > board.w - edge || pointer.y < edge || pointer.y > board.h - edge;
    if (!inside) return 'free';
    for (const a of Object.keys(points) as Anchor[]) {
      const d = Math.hypot(pointer.x - points[a].x, pointer.y - points[a].y);
      if (d < best) { best = d; anchor = a; }
    }
  }
  // Index from the settled centres of the target stack (order 0 is nearest the anchor's edge).
  const settled = layoutBoard(input).cards.filter((c) => c.anchor === anchor && c.id !== cardId);
  const fromBottom = anchor === 'bc' || anchor === 'br';
  const index = settled.filter((c) => {
    const centre = c.rect.y + c.rect.h / 2;
    return fromBottom ? centre > pointer.y : centre < pointer.y;
  }).length;
  return { anchor, index };
}

/** Which dock a dragged strip would take: its centre picks the nearest of the five docks in board-relative terms. Never free. */
export function stripDropTarget(board: Size, strip: Rect): StripDock {
  const nx = board.w > 0 ? (strip.x + strip.w / 2) / board.w : 0;
  const ny = board.h > 0 ? (strip.y + strip.h / 2) / board.h : 1;
  const points: [StripDock, number, number][] = [
    ['bottom-left', 0, 1], ['bottom-centre', 0.5, 1], ['bottom-right', 1, 1], ['left', 0, 0.5], ['right', 1, 0.5],
  ];
  let best: StripDock = 'bottom-left';
  let bestD = Infinity;
  for (const [dock, px, py] of points) {
    const d = Math.hypot(nx - px, ny - py);
    if (d < bestD) { bestD = d; best = dock; }
  }
  return best;
}

export interface ApplyDropOptions {
  defaults?: readonly CardInput[]; // cards whose default placement joins the target stack
  freeAt?: { x: number; y: number }; // top-left for a 'free' drop
}

export function applyDrop(
  stored: Readonly<Record<string, Placement>>,
  cardId: string,
  target: DropIndex | 'free',
  options: ApplyDropOptions = {},
): Record<string, Placement> {
  const next: Record<string, Placement> = { ...stored };
  if (target === 'free') {
    const prev = stored[cardId];
    const at = options.freeAt ?? (prev?.kind === 'free' ? prev : { x: 0, y: 0 });
    next[cardId] = { kind: 'free', x: at.x, y: at.y };
    return next;
  }
  const members: { id: string; order: number }[] = [];
  for (const [id, p] of Object.entries(stored)) {
    if (id !== cardId && p.kind === 'docked' && p.anchor === target.anchor) members.push({ id, order: p.order });
  }
  for (const c of options.defaults ?? []) {
    if (c.id !== cardId && !(c.id in stored) && c.defaultAnchor === target.anchor) members.push({ id: c.id, order: c.defaultOrder });
  }
  members.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const index = Math.max(0, Math.min(target.index, members.length));
  members.splice(index, 0, { id: cardId, order: 0 });
  members.forEach((m, i) => {
    next[m.id] = { kind: 'docked', anchor: target.anchor, order: i };
  });
  return next;
}
