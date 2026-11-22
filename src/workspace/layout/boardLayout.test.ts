import { describe, expect, it } from 'vitest';
import {
  applyDrop,
  dropTarget,
  layoutBoard,
  type Anchor,
  type CardInput,
  type LayoutInput,
  type Placement,
  type Rect,
} from './boardLayout';

const card = (id: string, anchor: Anchor, over: Partial<CardInput> = {}): CardInput => ({
  id,
  natural: { w: 300, h: 200 },
  min: { w: 300, h: 80 },
  foldedHeight: 30,
  rowBreaks: [],
  priority: 5,
  defaultAnchor: anchor,
  defaultOrder: 0,
  ...over,
});

const input = (cards: CardInput[], over: Partial<LayoutInput> = {}): LayoutInput => ({
  board: { w: 3440, h: 1440 },
  cards,
  stored: {},
  storedFolds: {},
  maxSpan: 1800,
  columnMaxFraction: 0.32,
  gap: 8,
  ...over,
});

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
const byId = (r: ReturnType<typeof layoutBoard>, id: string) => r.cards.find((c) => c.id === id)!;

describe('layoutBoard', () => {
  it('places the default of every anchor inside the band at 3440x1440', () => {
    const anchors: Anchor[] = ['tl', 'tc', 'tr', 'ml', 'mr', 'bc', 'br'];
    const r = layoutBoard(input(anchors.map((a) => card(a, a))));
    expect(r.band).toEqual({ x: 820, w: 1800 });
    for (const c of r.cards) {
      expect(c.rect.x).toBeGreaterThanOrEqual(r.band.x);
      expect(c.rect.x + c.rect.w).toBeLessThanOrEqual(r.band.x + r.band.w);
      expect(c.rect.y).toBeGreaterThanOrEqual(0);
      expect(c.rect.y + c.rect.h).toBeLessThanOrEqual(1440);
    }
    expect(byId(r, 'tl').rect).toMatchObject({ x: 828, y: 8 });
    expect(byId(r, 'tr').rect.x + 300).toBe(820 + 1800 - 8);
    expect(byId(r, 'bc').rect.y + 200).toBe(1440 - 8);
    expect(byId(r, 'ml').rect.y).toBe(8 + 200 + 8); // ml starts below tl
    expect(byId(r, 'tc').rect.x).toBe((3440 - 300) / 2);
  });

  it('keeps a stored far-edge placement at the board edge', () => {
    const stored: Record<string, Placement> = { a: { kind: 'docked', anchor: 'tr', order: 0 } };
    const r = layoutBoard(input([card('a', 'tl')], { stored }));
    expect(byId(r, 'a').rect.x + byId(r, 'a').rect.w).toBe(3440 - 8);
    const left = layoutBoard(input([card('a', 'tr')], { stored: { a: { kind: 'docked', anchor: 'tl', order: 0 } } }));
    expect(byId(left, 'a').rect.x).toBe(8);
  });

  describe('folds', () => {
    const three = (): CardInput[] => [
      card('A', 'tl', { priority: 1, defaultOrder: 0 }),
      card('B', 'tl', { priority: 2, defaultOrder: 1 }),
      card('C', 'tl', { priority: 3, defaultOrder: 2 }),
    ];
    const small = { board: { w: 3440, h: 400 } };

    it('follows priority, lowest first', () => {
      const r = layoutBoard(input(three(), { board: { w: 3440, h: 500 } }));
      expect(r.cards.map((c) => c.folded)).toEqual([true, false, false]);
      const r2 = layoutBoard(input(three(), small));
      expect(r2.cards.map((c) => c.folded)).toEqual([true, true, false]);
    });

    it('never folds frame-opened, lesson or stored-open cards', () => {
      const frame = layoutBoard(input(three(), { ...small, frame: { open: ['A'], usesTools: false } }));
      expect(frame.cards.map((c) => c.folded)).toEqual([false, true, true]);
      const lesson = three();
      lesson[0] = card('A', 'tl', { priority: Infinity });
      expect(layoutBoard(input(lesson, small)).cards[0].folded).toBe(false);
      const open = layoutBoard(input(three(), { ...small, storedFolds: { A: false } }));
      expect(open.cards[0].folded).toBe(false);
      const tools = layoutBoard(input([card('tools', 'tl', { priority: 0 }), ...three().slice(1)], { ...small, frame: { open: [], usesTools: true } }));
      expect(byId(tools, 'tools').folded).toBe(false);
    });

    it('lets the frame beat a stored fold, and a stored fold apply when no pressure', () => {
      const r = layoutBoard(input(three(), { storedFolds: { A: true, B: true }, frame: { open: ['B'], usesTools: false } }));
      expect(r.cards.map((c) => c.folded)).toEqual([true, false, false]);
    });

    it('stops all re-planning with frozenFolds', () => {
      const frozenFolds = { A: false, B: false, C: false };
      const r = layoutBoard(input(three(), { ...small, frozenFolds }));
      expect(r.cards.every((c) => !c.folded)).toBe(true);
      const free = layoutBoard(input(three(), { ...small, frozenFolds: { A: true, B: true, C: true } }));
      expect(free.cards.every((c) => c.folded)).toBe(true);
    });
  });

  it('cuts land on row breaks and never below min.h', () => {
    const tall = (min: number) => card('T', 'tl', { priority: Infinity, natural: { w: 300, h: 600 }, min: { w: 300, h: min }, rowBreaks: [100, 200, 300, 380, 450] });
    const board = { w: 3440, h: 400 }; // available 384
    expect(byId(layoutBoard(input([tall(120)], { board })), 'T').cut).toBe(380);
    expect(byId(layoutBoard(input([tall(390)], { board })), 'T').cut).toBe(390);
    expect(byId(layoutBoard(input([tall(120)])), 'T').cut).toBeNull();
    const r = layoutBoard(input([tall(120)], { board }));
    expect(byId(r, 'T').rect.h).toBe(380);
  });

  it('keeps the strip clear of bc and br', () => {
    const pucks = { w: 400, h: 60 };
    const r = layoutBoard(input([card('bc', 'bc'), card('br', 'br'), card('bl', 'ml')], { pucks }));
    expect(r.pucks).toEqual({ x: 828, y: 1440 - 60 - 8, w: 400, h: 60 });
    for (const id of ['bc', 'br', 'bl']) expect(overlaps(r.pucks!, byId(r, id).rect)).toBe(false);
  });

  it('lets a tall right column keep its full height next to the strip, with the strip capped by it', () => {
    const board = { w: 1000, h: 600 };
    const cards = [
      card('tr', 'tr', { natural: { w: 300, h: 270 }, priority: 1 }),
      card('br', 'br', { natural: { w: 300, h: 270 }, priority: 1 }),
    ];
    const r = layoutBoard(input(cards, { board, maxSpan: 1000, pucks: { w: 2000, h: 60 } }));
    expect(r.cards.every((c) => !c.folded && c.cut === null)).toBe(true);
    expect(byId(r, 'br').rect.y + 270).toBe(600 - 8);
    expect(r.pucks!.x + r.pucks!.w).toBe(byId(r, 'br').rect.x - 8);
    expect(overlaps(r.pucks!, byId(r, 'br').rect)).toBe(false);
    // The centre column's width shrinks to what the side columns leave.
    const wide = layoutBoard(input([card('l', 'tl', { natural: { w: 400, h: 100 } }), card('c', 'tc', { natural: { w: 900, h: 100 } }), card('r', 'tr', { natural: { w: 400, h: 100 } })], { board, maxSpan: 1000 }));
    expect(byId(wide, 'c').rect.w).toBe(1000 - 320 - 320 - 32);
  });

  describe('free rectangle', () => {
    const board = { w: 1000, h: 600 };
    it('is the whole board when nothing is docked', () => {
      const r = layoutBoard(input([], { board }));
      expect(r.free).toEqual({ x: 0, y: 0, w: 1000, h: 600 });
    });
    it('is the largest side of one docked card', () => {
      // tl card at x 8..208, y 8..308: the right-hand strip 208..1000 beats the lower one.
      const r = layoutBoard(input([card('a', 'tl', { natural: { w: 200, h: 300 } })], { board, maxSpan: 1000 }));
      expect(r.free).toEqual({ x: 208, y: 0, w: 792, h: 600 });
    });
    it('also avoids the strip', () => {
      const r = layoutBoard(input([], { board, maxSpan: 1000, pucks: { w: 300, h: 100 } }));
      // strip x 8..308, y 492..592; the area above it (1000x492) is 492000, the right of it (692x600) 415200.
      expect(r.free).toEqual({ x: 0, y: 0, w: 1000, h: 492 });
    });
  });

  it('is deterministic', () => {
    const cards = [card('a', 'tl'), card('b', 'br', { priority: 1 }), card('c', 'tc')];
    const i = input(cards, { board: { w: 1500, h: 500 }, pucks: { w: 200, h: 50 } });
    expect(JSON.stringify(layoutBoard(i))).toBe(JSON.stringify(layoutBoard(i)));
  });

  it('clamps free cards so the head stays inside the board', () => {
    const r = layoutBoard(input([card('f', 'tl')], { stored: { f: { kind: 'free', x: 9999, y: 9999 } } }));
    expect(byId(r, 'f').rect).toMatchObject({ x: 3440 - 300, y: 1440 - 30 });
    expect(byId(r, 'f').anchor).toBe('free');
  });
});

describe('drag helpers', () => {
  const cards = [card('a', 'tl', { defaultOrder: 0 }), card('b', 'tl', { defaultOrder: 1 }), card('d', 'br')];
  it('floats outside the edge band and picks the nearest anchor inside it', () => {
    const i = input(cards, { board: { w: 1000, h: 800 } });
    expect(dropTarget(i, 'd', { x: 500, y: 400 })).toBe('free');
    expect(dropTarget(i, 'd', { x: 990, y: 790 })).toMatchObject({ anchor: 'br' });
    expect(dropTarget(i, 'd', { x: 5, y: 400 })).toMatchObject({ anchor: 'ml' });
  });
  it('indexes from settled centres', () => {
    const i = input(cards, { board: { w: 1000, h: 800 } });
    expect(dropTarget(i, 'd', { x: 10, y: 100 })).toEqual({ anchor: 'tl', index: 0 });
    expect(dropTarget(i, 'd', { x: 10, y: 200 })).toEqual({ anchor: 'tl', index: 1 });
  });
  it('renumbers the target stack as integers', () => {
    const next = applyDrop({}, 'd', { anchor: 'tl', index: 1 }, { defaults: cards });
    expect(next).toEqual({
      a: { kind: 'docked', anchor: 'tl', order: 0 },
      d: { kind: 'docked', anchor: 'tl', order: 1 },
      b: { kind: 'docked', anchor: 'tl', order: 2 },
    });
    expect(applyDrop(next, 'a', 'free', { freeAt: { x: 5, y: 6 } }).a).toEqual({ kind: 'free', x: 5, y: 6 });
  });
});

// Seeded PRNG (mulberry32) for the property test.
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('property: random inputs', () => {
  it('never overlaps docked cards and keeps them inside the board', () => {
    const rnd = prng(20261122);
    const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    const anchors: Anchor[] = ['tl', 'tc', 'tr', 'ml', 'mr', 'bc', 'br'];
    for (let iter = 0; iter < 300; iter++) {
      const board = { w: int(1200, 3440), h: int(900, 1440) };
      const n = int(2, 9);
      const cards: CardInput[] = [];
      const stored: Record<string, Placement> = {};
      const storedFolds: Record<string, boolean> = {};
      for (let k = 0; k < n; k++) {
        const id = `c${k}`;
        const h = int(80, 300);
        cards.push(card(id, anchors[int(0, 6)], {
          natural: { w: int(150, 900), h },
          min: { w: 150, h: int(60, 80) },
          rowBreaks: [int(60, 120), int(120, 200), h].sort((a, b) => a - b),
          priority: k === 0 && rnd() < 0.3 ? Infinity : int(1, 9),
          defaultOrder: int(0, 4),
        }));
        const roll = rnd();
        if (roll < 0.3) stored[id] = { kind: 'docked', anchor: anchors[int(0, 6)], order: int(0, 5) };
        else if (roll < 0.4) stored[id] = { kind: 'free', x: int(-100, board.w), y: int(-100, board.h) };
        if (rnd() < 0.2) storedFolds[id] = rnd() < 0.5;
      }
      const r = layoutBoard(input(cards, {
        board, stored, storedFolds,
        maxSpan: int(1200, 1800),
        pucks: rnd() < 0.5 ? { w: int(100, 400), h: 60 } : undefined,
        frame: rnd() < 0.3 ? { open: [`c${int(0, n - 1)}`], usesTools: false } : undefined,
      }));
      const dockedCards = r.cards.filter((c) => c.anchor !== 'free');
      for (const c of dockedCards) {
        expect(c.rect.x).toBeGreaterThanOrEqual(-1e-6);
        expect(c.rect.y).toBeGreaterThanOrEqual(-1e-6);
        expect(c.rect.x + c.rect.w).toBeLessThanOrEqual(board.w + 1e-6);
        expect(c.rect.y + c.rect.h).toBeLessThanOrEqual(board.h + 1e-6);
        if (r.pucks) expect(overlaps(c.rect, r.pucks)).toBe(false);
      }
      for (let a = 0; a < dockedCards.length; a++) {
        for (let b = a + 1; b < dockedCards.length; b++) {
          expect(overlaps(dockedCards[a].rect, dockedCards[b].rect), `iter ${iter}: ${dockedCards[a].id}/${dockedCards[b].id}`).toBe(false);
        }
      }
    }
  });
});
