import { describe, expect, it } from 'vitest';
import { layoutBoard, type Anchor, type CardInput, type LayoutInput, type Rect } from './boardLayout';

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
const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;

// The phase-portrait lesson at 1280x720 (board 1230x411, measured inputs): two wrapped rows of 155 px do not fit beside the lesson
// card without reaching into the right column, and the lesson cannot shrink above the strip. The strip must still never cover the
// lesson card, whose Back/Next would be unreachable (07-nav-overlap).
const lessonLike = (): CardInput[] => [
  card('lesson', 'tl', { natural: { w: 394, h: 1037 }, min: { w: 394, h: 317 }, anchorMin: 288, reserve: 61, exactCut: true, foldedHeight: 39, priority: Infinity, defaultOrder: -1 }),
  card('readouts', 'tr', { natural: { w: 394, h: 498 }, min: { w: 394, h: 109 }, foldedHeight: 39, reserve: 29, priority: 3 }),
  card('legend', 'br', { natural: { w: 394, h: 126 }, min: { w: 394, h: 96 }, foldedHeight: 39, reserve: 29, priority: 1, defaultFolded: true }),
  card('tools', 'tr', { natural: { w: 294, h: 693 }, min: { w: 294, h: 168 }, foldedHeight: 39, reserve: 29, priority: 2.5, defaultFolded: true, defaultOrder: 1 }),
];
const slots = [{ w: 24, h: 40 }, { w: 120, h: 155 }, ...[0, 1, 2, 3, 4].map(() => ({ w: 160, h: 155 })), { w: 120, h: 155 }];

describe('strip against the lesson card', () => {
  for (const h of [155, 318]) {
    it(`never lays the strip over the lesson card (strip measured ${h} px tall)`, () => {
      const base: LayoutInput = {
        board: { w: 1230, h: 411 }, cards: lessonLike(), stored: {}, storedFolds: {}, maxSpan: 1600, columnMaxFraction: 0.32, gap: 8,
        pucks: { w: 1120, h }, puckSlots: slots, budget: { open: 2, order: ['lesson', 'readouts', 'tools'] },
      };
      const r = layoutBoard(base);
      const lesson = r.cards.find((c) => c.id === 'lesson')!;
      expect(overlaps(r.pucks!, lesson.rect)).toBe(false);
      expect(r.pucks!.y).toBeGreaterThanOrEqual(0);
    });
  }
});
