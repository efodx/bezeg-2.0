import { describe, expect, it } from 'vitest';
import {
  applyDrop,
  dropTarget,
  layoutBoard,
  wrappedStripHeight,
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

    it('never folds the last open card of a column: it is cut and scrolls instead', () => {
      const tall = card('tools', 'tr', { priority: 4, natural: { w: 300, h: 2000 } });
      const r = layoutBoard(input([tall], small));
      expect(byId(r, 'tools').folded).toBe(false);
      expect(byId(r, 'tools').cut).not.toBeNull();
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

  it('adds the reserve back to a cut: the largest row break above the bar, plus the bar, never below min.h', () => {
    const tall = (reserve: number, min = 120) => card('T', 'tl', { priority: Infinity, natural: { w: 300, h: 600 }, min: { w: 300, h: min }, reserve, rowBreaks: [100, 200, 300, 380, 450] });
    const board = { w: 3440, h: 400 }; // available 384
    expect(byId(layoutBoard(input([tall(30)], { board })), 'T').cut).toBe(330); // 300 <= 354, 380 > 354
    expect(byId(layoutBoard(input([tall(0)], { board })), 'T').cut).toBe(380);
    expect(byId(layoutBoard(input([tall(30, 390)], { board })), 'T').cut).toBe(390);
    expect(byId(layoutBoard(input([tall(30)])), 'T').cut).toBeNull();
  });

  describe('first-view defaults (rule 4: frozen, frame, stored fold, budget, defaultFolded, open)', () => {
    const trio = (over: Partial<Record<string, Partial<CardInput>>> = {}): CardInput[] =>
      ['lesson', 'readouts', 'tools'].map((id, k) => card(id, 'tl', { defaultOrder: k, ...over[id] }));
    const budget = (open: number) => ({ open, order: ['lesson', 'readouts', 'tools'] });
    const folds = (r: ReturnType<typeof layoutBoard>) => Object.fromEntries(r.cards.map((c) => [c.id, c.folded]));

    it('opens only the first `open` ids of the order and folds the rest of the order', () => {
      expect(folds(layoutBoard(input(trio(), { budget: budget(2) })))).toEqual({ lesson: false, readouts: false, tools: true });
      expect(folds(layoutBoard(input(trio(), { budget: budget(1) })))).toEqual({ lesson: false, readouts: true, tools: true });
      // Absent ids are skipped; cards outside the order are untouched.
      const noLesson = [...trio().slice(1), card('legend', 'tl', { defaultOrder: 3 })];
      expect(folds(layoutBoard(input(noLesson, { budget: budget(1) })))).toEqual({ readouts: false, tools: true, legend: false });
    });

    it('yields to the frame and to a stored fold, and beats defaultFolded', () => {
      const r = layoutBoard(input(trio(), { budget: budget(1), storedFolds: { readouts: false, lesson: true }, frame: { open: ['tools'], usesTools: false } }));
      expect(folds(r)).toEqual({ lesson: true, readouts: false, tools: false });
      expect(folds(layoutBoard(input(trio({ lesson: { defaultFolded: true } }), { budget: budget(1) }))).lesson).toBe(false);
    });

    it('folds a defaultFolded card unless something above it decides', () => {
      const cards = [card('legend', 'tl', { defaultFolded: true }), card('section:a', 'tl', { defaultFolded: true, defaultOrder: 1 }), card('x', 'tl', { defaultOrder: 2 })];
      expect(folds(layoutBoard(input(cards)))).toEqual({ legend: true, 'section:a': true, x: false });
      expect(folds(layoutBoard(input(cards, { storedFolds: { legend: false } }))).legend).toBe(false);
      expect(folds(layoutBoard(input(cards, { frame: { open: ['section:a'], usesTools: false } })))['section:a']).toBe(false);
      expect(folds(layoutBoard(input(cards, { frozenFolds: { legend: false, 'section:a': true, x: false } })))).toEqual({ legend: false, 'section:a': true, x: false });
    });
  });

  describe('expanded ("Več")', () => {
    const steps = (n: number, h: number): number[] => Array.from({ length: n }, (_, i) => ((i + 1) * h) / n);
    it('exempts that card from its cut; the cut moves to the other cards', () => {
      const lesson = card('R', 'tl', { priority: Infinity, natural: { w: 300, h: 400 }, rowBreaks: steps(4, 400), min: { w: 300, h: 100 } });
      const other = card('O', 'tl', { priority: 3, defaultOrder: 1, natural: { w: 300, h: 300 }, rowBreaks: steps(3, 300), min: { w: 300, h: 100 } });
      const board = { w: 3440, h: 600 };
      const plain = layoutBoard(input([lesson, other], { board, storedFolds: { O: false } }));
      expect([byId(plain, 'R').cut, byId(plain, 'O').cut]).toEqual([200, null]);
      const wide = layoutBoard(input([lesson, other], { board, storedFolds: { O: false }, expanded: 'R' }));
      expect([byId(wide, 'R').cut, byId(wide, 'O').cut]).toEqual([null, 100]);
    });
    it('folds lower-priority open cards of its column, never frame-opened or higher-priority ones', () => {
      const R = card('R', 'tl', { priority: 3, natural: { w: 300, h: 300 }, rowBreaks: steps(3, 300), min: { w: 300, h: 100 } });
      const H = card('H', 'tl', { priority: 5, defaultOrder: 1, natural: { w: 300, h: 200 }, rowBreaks: steps(2, 200), min: { w: 300, h: 80 } });
      const T = card('T', 'tl', { priority: 1, defaultOrder: 2, natural: { w: 300, h: 100 } });
      const board = { w: 3440, h: 400 };
      const plain = layoutBoard(input([R, H, T], { board }));
      expect(plain.cards.map((c) => c.folded)).toEqual([true, false, true]); // R is the lowest unpinned after T
      const wide = layoutBoard(input([R, H, T], { board, expanded: 'R' }));
      expect(wide.cards.map((c) => c.folded)).toEqual([false, false, true]);
      const framed = layoutBoard(input([R, H, T], { board, expanded: 'R', frame: { open: ['T'], usesTools: false } }));
      expect(byId(framed, 'T').folded).toBe(false);
    });
    it('is ignored for an unknown id', () => {
      const cards = [card('a', 'tl')];
      expect(layoutBoard(input(cards, { expanded: 'nope' }))).toEqual(layoutBoard(input(cards)));
    });
  });

  it('keeps the strip clear of bc and br', () => {
    const pucks = { w: 400, h: 60 };
    const r = layoutBoard(input([card('bc', 'bc'), card('br', 'br'), card('bl', 'ml')], { pucks }));
    expect(r.pucks).toEqual({ x: 828, y: 1440 - 60 - 8, w: 400, h: 60 });
    for (const id of ['bc', 'br', 'bl']) expect(overlaps(r.pucks!, byId(r, id).rect)).toBe(false);
  });

  it('moves the strip right of a left column that cannot fit above it, never laying a card over it', () => {
    const board = { w: 1200, h: 445 };
    const pucks = { w: 600, h: 100 };
    // A pinned card whose smallest cut (340) needs more than the room above the strip (445 - 16 - 108 = 321).
    const tall = card('lesson', 'tl', { natural: { w: 380, h: 420 }, min: { w: 380, h: 340 }, priority: Infinity, defaultOrder: -1 });
    const r = layoutBoard(input([tall], { board, pucks }));
    const lesson = byId(r, 'lesson').rect;
    expect(lesson.y + lesson.h).toBeLessThanOrEqual(board.h - 8);
    expect(overlaps(r.pucks!, lesson)).toBe(false);
    expect(r.pucks!.x).toBeGreaterThanOrEqual(lesson.x + lesson.w);
    expect(r.pucks!.y + r.pucks!.h).toBe(board.h - 8);
  });

  describe('strip beside a tall left column (rules 2, 2b, 2c)', () => {
    const slots = Array.from({ length: 6 }, () => ({ w: 132, h: 64 }));
    const natural = { w: 6 * 132 + 5 * 8, h: 64 };
    // The presenter's two passes: the strip's width from the first, laid out again at the height it wraps to in that width.
    const presenterLayout = (board: { w: number; h: number }, cards: CardInput[]) => {
      const base = input(cards, { board, maxSpan: 1800, columnMaxFraction: 0.32, pucks: natural, puckSlots: slots });
      const given = layoutBoard(base).pucks!;
      const wrapped = given.w < natural.w ? wrappedStripHeight(slots, given.w) : 0;
      return layoutBoard({ ...base, pucks: wrapped > natural.h ? { w: natural.w, h: wrapped } : natural });
    };
    const lesson = card('lesson', 'tl', { natural: { w: 380, h: 900 }, min: { w: 380, h: 520 }, anchorMin: 170, reserve: 30, priority: Infinity, defaultOrder: -1 });
    const right = card('right', 'tr', { natural: { w: 300, h: 300 } });

    for (const [w, h] of [[1024, 768], [1280, 720], [1440, 900], [1100, 380], [900, 600], [1024, 520], [1024, 440]]) {
      it(`keeps the strip on the board and clear of every card at ${w}x${h}`, () => {
        const board = { w, h };
        const r = presenterLayout(board, [lesson, right]);
        const strip = r.pucks!;
        expect(strip.x).toBeGreaterThanOrEqual(0);
        expect(strip.y).toBeGreaterThanOrEqual(0);
        expect(strip.x + strip.w).toBeLessThanOrEqual(board.w);
        expect(strip.y + strip.h).toBeLessThanOrEqual(board.h);
        for (const c of r.cards) expect(overlaps(strip, c.rect), `${c.id} under the strip`).toBe(false);
        const l = byId(r, 'lesson');
        expect(l.rect.y).toBeGreaterThanOrEqual(0);
        expect(l.rect.y + l.rect.h).toBeLessThanOrEqual(board.h);
        expect(l.rect.h).toBeGreaterThanOrEqual(lesson.anchorMin!);
      });
    }

    it('moves the strip beside the card when even the anchor sliver does not fit above it', () => {
      const tallSlots = Array.from({ length: 6 }, () => ({ w: 132, h: 113 }));
      const pucks = { w: 6 * 132 + 40, h: 113 };
      const sliverCard = { ...lesson, anchorMin: 288 };
      const board = { w: 1024, h: 445 };
      const base = input([sliverCard, right], { board, pucks, puckSlots: tallSlots });
      const given = layoutBoard(base).pucks!;
      const r = layoutBoard({ ...base, pucks: { w: pucks.w, h: wrappedStripHeight(tallSlots, given.w) } });
      for (const c of r.cards) expect(overlaps(r.pucks!, c.rect), `${c.id} under the strip`).toBe(false);
      expect(r.pucks!.y).toBeGreaterThanOrEqual(0);
      expect(byId(r, 'lesson').rect.h).toBeGreaterThanOrEqual(288);
    });

    it('never cuts below the anchor sliver, even when the strip fits neither under nor beside the card (1024, step 2)', () => {
      const realSlots = [160, 160, 160, 160, 160, 120].map((w, i) => ({ w, h: i < 4 ? 109 : 85 }));
      const board = { w: 974, h: 445 };
      const pucks = { w: 960, h: 226 };
      const real = card('lesson', 'tl', { natural: { w: 312, h: 1081 }, min: { w: 312, h: 321 }, anchorMin: 288, reserve: 61, foldedHeight: 39, priority: Infinity, defaultOrder: -1 });
      const side = ['readouts', 'tools', 'legend'].map((id, i) => card(id, 'tr', { natural: { w: 312, h: 400 }, min: { w: 312, h: 100 }, foldedHeight: 39, defaultFolded: true, defaultOrder: i }));
      const r = layoutBoard(input([real, ...side], { board, maxSpan: 1600, pucks, puckSlots: realSlots }));
      // 288 + 226 + 3 gaps > 445 and beside the card the strip wraps too tall: it runs right of the card, under the folded right column (2f).
      expect(r.pucks!.y).toBeGreaterThanOrEqual(0);
      expect(r.pucks!.x + r.pucks!.w).toBeLessThanOrEqual(board.w);
      for (const c of r.cards) expect(overlaps(r.pucks!, c.rect), `${c.id} under the strip`).toBe(false);
      expect(byId(r, 'lesson').rect.h).toBeGreaterThanOrEqual(288);
    });

    it('cuts the lesson card to the room above a full-width strip when the strip would wrap too tall beside it', () => {
      const r = presenterLayout({ w: 1024, h: 500 }, [lesson, right]);
      const l = byId(r, 'lesson');
      expect(r.pucks!.x).toBeLessThan(l.rect.x + l.rect.w);
      expect(l.rect.y + l.rect.h).toBeLessThanOrEqual(r.pucks!.y - 8);
      expect(l.cut).not.toBeNull();
      expect(l.rect.h).toBeGreaterThanOrEqual(lesson.anchorMin!);
    });
  });

  it('keeps the strip under a left column that does fit above it', () => {
    const r = layoutBoard(input([card('a', 'tl')], { board: { w: 1200, h: 445 }, pucks: { w: 600, h: 100 } }));
    expect(r.pucks!.x).toBe(byId(r, 'a').rect.x);
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

  it('clamps free cards so the smallest cut of an open card (its head when folded) stays inside the board', () => {
    const r = layoutBoard(input([card('f', 'tl')], { stored: { f: { kind: 'free', x: 9999, y: 9999 } } }));
    expect(byId(r, 'f').rect).toMatchObject({ x: 3440 - 300, y: 1440 - 80 });
    const folded = layoutBoard(input([card('g', 'tl')], { stored: { g: { kind: 'free', x: 9999, y: 9999 } }, storedFolds: { g: true } }));
    expect(byId(folded, 'g').rect).toMatchObject({ y: 1440 - 30 });
    expect(byId(r, 'f').anchor).toBe('free');
  });

  it('cuts a free card taller than the board room under its top, so its body scrolls instead of running off the board', () => {
    const tall = card('f', 'tl', { natural: { w: 300, h: 900 }, min: { w: 300, h: 80 }, rowBreaks: [100, 200, 300, 400], reserve: 28 });
    const r = layoutBoard(input([tall], { board: { w: 1000, h: 500 }, stored: { f: { kind: 'free', x: 50, y: 100 } } }));
    const f = byId(r, 'f');
    expect(f.cut).not.toBeNull();
    expect(f.rect.y + f.rect.h).toBeLessThanOrEqual(500);
    expect(f.rect.h).toBe(300 + 28); // the largest break that fits above the 28 px bar in 500 - 100 - gap
    // A card that fits is left alone.
    const fits = layoutBoard(input([card('g', 'tl')], { board: { w: 1000, h: 500 }, stored: { g: { kind: 'free', x: 50, y: 100 } } }));
    expect(byId(fits, 'g').cut).toBeNull();
  });

  it('keeps the learner\'s top edge when the card grows (a taller frame, a larger minimum): the card is cut, not moved up', () => {
    const stored = { f: { kind: 'free' as const, x: 50, y: 300 } };
    const frame = (naturalH: number, minH: number) => card('f', 'tl', { natural: { w: 300, h: naturalH }, min: { w: 300, h: minH }, rowBreaks: [60, 120, 180, 240, 300, 360], reserve: 28 });
    const first = byId(layoutBoard(input([frame(180, 120)], { board: { w: 1000, h: 500 }, stored })), 'f');
    const taller = byId(layoutBoard(input([frame(380, 380)], { board: { w: 1000, h: 500 }, stored })), 'f');
    expect(first.rect.y).toBe(300);
    expect(taller.rect.y).toBe(300);
    expect(taller.cut).not.toBeNull();
    expect(taller.rect.y + taller.rect.h).toBeLessThanOrEqual(500);
    // A card that declares what it must keep (its controls row) is never cut below that, so it moves up only past it.
    const keeps = (y: number) => byId(layoutBoard(input([{ ...frame(380, 380), anchorMin: 250 }], { board: { w: 1000, h: 500 }, stored: { f: { kind: 'free', x: 50, y } } })), 'f');
    expect(keeps(250).rect.y).toBe(250);
    expect(keeps(250).rect.h).toBeGreaterThanOrEqual(250);
    expect(keeps(400).rect.y).toBe(250);
    // A card that cannot keep even its head and bar on the board still moves up.
    const low = byId(layoutBoard(input([frame(380, 380)], { board: { w: 1000, h: 500 }, stored: { f: { kind: 'free', x: 50, y: 495 } } })), 'f');
    expect(low.rect.y).toBeLessThan(495);
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
          reserve: rnd() < 0.4 ? int(0, 30) : undefined,
          defaultFolded: rnd() < 0.2 ? true : undefined,
        }));
        const roll = rnd();
        if (roll < 0.3) stored[id] = { kind: 'docked', anchor: anchors[int(0, 6)], order: int(0, 5) };
        else if (roll < 0.4) stored[id] = { kind: 'free', x: int(-100, board.w), y: int(-100, board.h) };
        if (rnd() < 0.2) storedFolds[id] = rnd() < 0.5;
      }
      const inp = input(cards, {
        board, stored, storedFolds,
        maxSpan: int(1200, 1800),
        pucks: rnd() < 0.5 ? { w: int(100, 400), h: 60 } : undefined,
        frame: rnd() < 0.3 ? { open: [`c${int(0, n - 1)}`], usesTools: false } : undefined,
        budget: rnd() < 0.5 ? { open: int(0, 3), order: [0, 1, 2, 3].map((k) => `c${k}`) } : undefined,
        expanded: rnd() < 0.4 ? `c${int(0, n)}` : undefined,
      });
      const r = layoutBoard(inp);
      expect(JSON.stringify(layoutBoard(inp))).toBe(JSON.stringify(r)); // deterministic with the new inputs too
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
