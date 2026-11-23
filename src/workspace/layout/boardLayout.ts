// Pure board layout: one call returns every final rectangle, fold and cut.
// Spec: docs/reviews/ux-picks-app-wide/03-layout-design.md. No React, JSXGraph or DOM.

export type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bc' | 'br';
export interface Size { w: number; h: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface CardInput {
  id: string;
  natural: Size;
  min: Size;
  foldedHeight: number;
  rowBreaks: readonly number[];
  priority: number;
  defaultAnchor: Anchor;
  defaultOrder: number;
  /** Height of a bar row inside the card under its scroll area ("Več", the Povrni row). Already part of `natural.h` and `min.h`;
   *  a cut lands on the largest rowBreak that fits above it, then adds it back. Default 0. */
  reserve?: number;
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

type Column = 'left' | 'centre' | 'right';
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

const heightOf = (s: State): number => s.cut ?? (s.folded ? s.card.foldedHeight : s.card.natural.h);

export function layoutBoard(input: LayoutInput): LayoutResult {
  const { board, cards, stored, storedFolds, frame, pucks, maxSpan, columnMaxFraction, gap, frozenFolds, budget, expanded } = input;

  // Rule 1: band.
  const bandW = Math.min(board.w, maxSpan);
  const band = { x: (board.w - bandW) / 2, w: bandW };

  // Rule 2: strip. Only the left column gives up the strip's height; the strip's width is
  // capped after the columns are placed (see below).
  const reserve = pucks ? pucks.h + gap : 0;
  const colWidth: Partial<Record<Column, number>> = {};
  const colX: Partial<Record<Column, number>> = {};

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
    if (members.length === 0) continue;
    const colReserve = col === 'left' ? reserve : 0;
    const avail = board.h - 2 * gap - colReserve;
    const total = (): number => members.reduce((sum, s) => sum + heightOf(s), 0) + (members.length - 1) * gap;

    // Rule 5: fold before clip (skipped while a drag freezes the folds).
    const wide = members.find((s) => s.card.id === expanded); // "Več": never cut (until nothing else is left to give)
    if (!frozenFolds) {
      while (total() > avail) {
        // With an expanded card only lower-priority cards of its column give way to it.
        const open = members.filter((s) => !s.folded && !s.pinned && (!wide || (s !== wide && s.card.priority < wide.card.priority)));
        if (open.length === 0) break;
        open.sort((a, b) => a.card.priority - b.card.priority || (a.card.id < b.card.id ? -1 : 1));
        open[0].folded = true;
      }
    }

    // Rule 6: cut the tallest open card until the column fits.
    const exhausted = new Set<State>();
    let exempt = wide;
    while (total() > avail) {
      const open = members.filter((s) => !s.folded && !exhausted.has(s) && s !== exempt && heightOf(s) > s.card.min.h);
      if (open.length === 0) {
        if (exempt) { exempt = undefined; continue; } // last resort: cut the expanded card too
        break;
      }
      open.sort((a, b) => heightOf(b) - heightOf(a) || (a.card.id < b.card.id ? -1 : 1));
      const s = open[0];
      const room = avail - (total() - heightOf(s));
      const bar = s.card.reserve ?? 0;
      const fitting = s.card.rowBreaks.filter((b) => b <= room - bar);
      const cut = Math.max(s.card.min.h, fitting.length ? Math.max(...fitting) + bar : 0);
      if (cut >= heightOf(s)) exhausted.add(s);
      else s.cut = cut;
    }

    // Column width and x.
    const openOnes = members.filter((s) => !s.folded);
    const widest = Math.max(...(openOnes.length ? openOnes : members).map((s) => s.card.natural.w));
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
  if (pucks) {
    const y = board.h - pucks.h - gap;
    const x = band.x + gap;
    const centreBlocks = states.some((s) => {
      const r = rects.get(s.card.id);
      return s.placement.kind === 'docked' && COLUMN_OF[s.placement.anchor] === 'centre' && r !== undefined && r.y + r.h > y;
    });
    const limit = centreBlocks && colX.centre !== undefined ? colX.centre : (colX.right ?? band.x + band.w);
    stripRect = { x, y, w: Math.max(0, Math.min(pucks.w, limit - x - gap)), h: pucks.h };
  }

  // Rule 7: free cards.
  for (const s of states) {
    if (s.placement.kind !== 'free') continue;
    const w = s.card.natural.w;
    const h = heightOf(s);
    const x = Math.max(0, Math.min(s.placement.x, board.w - w));
    const y = Math.max(0, Math.min(s.placement.y, board.h - s.card.foldedHeight));
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

export function dropTarget(input: LayoutInput, cardId: string, pointer: { x: number; y: number }): DropIndex | 'free' {
  const { board } = input;
  const edge = 0.28 * Math.min(board.w, board.h);
  const inside = pointer.x < edge || pointer.x > board.w - edge || pointer.y < edge || pointer.y > board.h - edge;
  if (!inside) return 'free';
  const points: Record<Anchor, { x: number; y: number }> = {
    tl: { x: 0, y: 0 }, tc: { x: board.w / 2, y: 0 }, tr: { x: board.w, y: 0 },
    ml: { x: 0, y: board.h / 2 }, mr: { x: board.w, y: board.h / 2 },
    bc: { x: board.w / 2, y: board.h }, br: { x: board.w, y: board.h },
  };
  let anchor: Anchor = 'tl';
  let best = Infinity;
  for (const a of Object.keys(points) as Anchor[]) {
    const d = Math.hypot(pointer.x - points[a].x, pointer.y - points[a].y);
    if (d < best) { best = d; anchor = a; }
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
