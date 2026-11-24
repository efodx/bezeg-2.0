import {describe, expect, it} from 'vitest';
import type {FitBox} from '../../graphs/base/fitBoundingBox';
import {coveredMarks, fitIntent, insetFree} from './fitIntent';
import type {Rect} from './viewFit';

const canvas = {width: 1000, height: 600};
const intent: FitBox = [-10, 6, 10, -6]; // 50 px per unit
const full: Rect = {x: 0, y: 0, width: 1000, height: 600};
const base = {intent, canvas, equalAxisUnits: true, marginPx: 0};

/** Where the intent's centre lands on screen and the scale of the result against the intent. */
function centreOf(box: FitBox) {
    const [l, t, r, b] = box;
    return {x: (0 - l) / (r - l) * canvas.width, y: (t - 0) / (t - b) * canvas.height, scale: 20 / (r - l)};
}

describe('fitIntent', () => {
    it('keeps the intent when no card is in the way', () => {
        const result = fitIntent({...base, free: full});
        expect(result.box).toEqual(intent);
        expect(result.scale).toBe(1);
        expect(result.clamped).toBe(false);
    });

    it('a card on the left: the intent moves into the free right part, scaled by its width', () => {
        const result = fitIntent({...base, free: {x: 200, y: 0, width: 800, height: 600}});
        expect(result.rect).toEqual({x: 200, y: 0, width: 800, height: 600});
        expect(result.scale).toBeCloseTo(0.8, 9);
        const c = centreOf(result.box);
        expect(c.x).toBeCloseTo(600, 6); // centre of the free rectangle
        expect(c.scale).toBeCloseTo(0.8, 9);
    });

    it('a card on the right and one on top', () => {
        const right = fitIntent({...base, free: {x: 0, y: 0, width: 700, height: 600}});
        expect(right.scale).toBeCloseTo(0.7, 9);
        expect(centreOf(right.box).x).toBeCloseTo(350, 6);
        const top = fitIntent({...base, free: {x: 0, y: 120, width: 1000, height: 480}});
        expect(top.scale).toBeCloseTo(0.8, 9);
        expect(centreOf(top.box).y).toBeCloseTo(120 + 240, 6);
    });

    it('never zooms out below 1/maxOut and says so', () => {
        const result = fitIntent({...base, free: {x: 700, y: 0, width: 300, height: 600}});
        expect(result.scale).toBeCloseTo(1 / 2.2, 9);
        expect(result.clamped).toBe(true);
        const tight = fitIntent({...base, free: {x: 200, y: 0, width: 800, height: 600}, maxOut: 1.1});
        expect(tight.scale).toBeCloseTo(1 / 1.1, 9);
        expect(tight.clamped).toBe(true);
    });

    it('a smaller free area never scales the intent up', () => {
        const wide = fitIntent({...base, free: {x: 0, y: 0, width: 760, height: 600}});
        const narrow = fitIntent({...base, free: {x: 0, y: 0, width: 430, height: 600}});
        expect(narrow.scale).toBeLessThanOrEqual(wide.scale);
        expect(narrow.scale).toBeGreaterThanOrEqual(1 / 2.2);
    });

    it('is idempotent and never changes the stored intent', () => {
        const stored: FitBox = [-10, 6, 10, -6];
        const frozen = Object.freeze([...stored]) as unknown as FitBox;
        const free: Rect = {x: 200, y: 0, width: 800, height: 600};
        const first = fitIntent({...base, intent: frozen, free});
        for (let k = 0; k < 20; k++) expect(fitIntent({...base, intent: frozen, free}).box).toEqual(first.box);
        expect(first.box).not.toBe(frozen);
        expect([...frozen]).toEqual(stored);
    });

    it('unequal axis units scale both axes by the same factor and keep the aspect of the intent', () => {
        const wide: FitBox = [0, 1, 4, 0];
        const result = fitIntent({intent: wide, canvas, free: {x: 250, y: 0, width: 750, height: 600}, equalAxisUnits: false, marginPx: 0});
        const [l, t, r, b] = result.box;
        expect((r - l) / 4).toBeCloseTo(1 / 0.75, 9);
        expect((t - b) / 1).toBeCloseTo(1 / 0.75, 9);
    });

    it('covered marks are those off the canvas or under a card', () => {
        const covered = coveredMarks(intent, [[0, 0], [-9, 0], [11, 0]], canvas, [{x: 0, y: 0, width: 100, height: 600}]);
        expect(covered).toEqual([[-9, 0], [11, 0]]);
    });

    it('nothing free (cards cover the whole canvas) moves nothing', () => {
        expect(fitIntent({...base, free: {x: 0, y: 0, width: 0, height: 0}}).box).toEqual(intent);
        expect(fitIntent({...base, free: {x: -5, y: -5, width: 1100, height: 700}}).box).toEqual(intent);
    });

    it('a state-following intent (a narrow bracket) lands in the free rectangle, not at the canvas centre under a card', () => {
        const bracket: FitBox = [1.0, 0.4, 1.2, -0.4];
        const free: Rect = {x: 500, y: 0, width: 500, height: 600};
        const result = fitIntent({intent: bracket, canvas, free, equalAxisUnits: false, marginPx: 0});
        const [l, t, r, b] = result.box;
        const cx = (1.1 - l) / (r - l) * canvas.width, cy = (0 - t) / (b - t) * canvas.height;
        expect(cx).toBeCloseTo(750, 6);
        expect(cy).toBeCloseTo(300, 6);
        // The bracket's edges stay inside the free rectangle.
        expect((1.0 - l) / (r - l) * canvas.width).toBeGreaterThanOrEqual(500 - 1e-6);
    });

    it('the margin pulls in only the sides that border a card', () => {
        expect(insetFree(canvas, {x: 200, y: 0, width: 800, height: 600}, 8)).toEqual({x: 208, y: 0, width: 792, height: 600});
        expect(insetFree(canvas, {x: 200, y: 100, width: 500, height: 300}, 8)).toEqual({x: 208, y: 108, width: 484, height: 284});
        expect(insetFree(canvas, full, 8)).toEqual(full);
    });
});
