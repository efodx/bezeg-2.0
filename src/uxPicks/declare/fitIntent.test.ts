import {describe, expect, it} from 'vitest';
import type {FitBox} from '../../graphs/base/fitBoundingBox';
import {coveredMarks, fitIntent, largestFreeRect} from './fitIntent';

const canvas = {width: 1000, height: 600};
const intent: FitBox = [-10, 6, 10, -6]; // 50 px per unit
const base = {intent, canvas, equalAxisUnits: true, marginPx: 0};

/** Where the intent's centre lands on screen and the scale of the result against the intent. */
function centreOf(box: FitBox) {
    const [l, t, r, b] = box;
    return {x: (0 - l) / (r - l) * canvas.width, y: (t - 0) / (t - b) * canvas.height, scale: 20 / (r - l)};
}

describe('fitIntent', () => {
    it('keeps the intent when no card is in the way', () => {
        const result = fitIntent({...base, obstacles: []});
        expect(result.box).toEqual(intent);
        expect(result.scale).toBe(1);
        expect(result.clamped).toBe(false);
    });

    it('a card on the left: the intent moves into the free right part, scaled by its width', () => {
        const result = fitIntent({...base, obstacles: [{x: 0, y: 0, width: 200, height: 600}]});
        expect(result.rect).toEqual({x: 200, y: 0, width: 800, height: 600});
        expect(result.scale).toBeCloseTo(0.8, 9);
        const c = centreOf(result.box);
        expect(c.x).toBeCloseTo(600, 6); // centre of the free rectangle
        expect(c.scale).toBeCloseTo(0.8, 9);
    });

    it('a card on the right and one on top', () => {
        const right = fitIntent({...base, obstacles: [{x: 700, y: 0, width: 300, height: 600}]});
        expect(right.scale).toBeCloseTo(0.7, 9);
        expect(centreOf(right.box).x).toBeCloseTo(350, 6);
        const top = fitIntent({...base, obstacles: [{x: 0, y: 0, width: 1000, height: 120}]});
        expect(top.scale).toBeCloseTo(0.8, 9);
        expect(centreOf(top.box).y).toBeCloseTo(120 + 240, 6);
    });

    it('a corner card is avoided by the larger of the two free rectangles', () => {
        const rect = largestFreeRect(canvas, [{x: 0, y: 0, width: 250, height: 200}], 0);
        expect(rect).toEqual({x: 250, y: 0, width: 750, height: 600}); // scale .75 beats the strip below (.667)
    });

    it('never zooms out below 1/maxOut and says so', () => {
        const lesson = {x: 0, y: 0, width: 500, height: 600};
        const result = fitIntent({...base, obstacles: [lesson]});
        expect(result.scale).toBeCloseTo(1 / 1.6, 9);
        expect(result.clamped).toBe(true);
        const tight = fitIntent({...base, obstacles: [{x: 0, y: 0, width: 200, height: 600}], maxOut: 1.1});
        expect(tight.scale).toBeCloseTo(1 / 1.1, 9);
        expect(tight.clamped).toBe(true);
    });

    it('a lesson card on or off changes only the free area', () => {
        const dock = {x: 760, y: 10, width: 230, height: 180};
        const lesson = {x: 10, y: 10, width: 330, height: 400};
        const without = fitIntent({...base, obstacles: [dock]});
        const withLesson = fitIntent({...base, obstacles: [dock, lesson]});
        expect(withLesson.scale).toBeLessThanOrEqual(without.scale);
        expect(withLesson.scale).toBeGreaterThanOrEqual(1 / 1.6);
    });

    it('is idempotent: the fit of an intent does not depend on a previous fit', () => {
        const obstacles = [{x: 0, y: 0, width: 200, height: 600}];
        expect(fitIntent({...base, obstacles}).box).toEqual(fitIntent({...base, obstacles}).box);
    });

    it('unequal axis units scale both axes by the same factor and keep the aspect of the intent', () => {
        const wide: FitBox = [0, 1, 4, 0];
        const result = fitIntent({intent: wide, canvas, obstacles: [{x: 0, y: 0, width: 250, height: 600}], equalAxisUnits: false, marginPx: 0});
        const [l, t, r, b] = result.box;
        expect((r - l) / 4).toBeCloseTo(1 / 0.75, 9);
        expect((t - b) / 1).toBeCloseTo(1 / 0.75, 9);
    });

    it('covered marks are those off the canvas or under a card', () => {
        const covered = coveredMarks(intent, [[0, 0], [-9, 0], [11, 0]], canvas, [{x: 0, y: 0, width: 100, height: 600}]);
        expect(covered).toEqual([[-9, 0], [11, 0]]);
    });

    it('cards that cover the whole canvas move nothing', () => {
        expect(fitIntent({...base, obstacles: [{x: -5, y: -5, width: 1100, height: 700}]}).box).toEqual(intent);
    });
});
