import {describe, expect, test} from 'vitest';
import {deriveCobweb, type CobwebState} from '../../recursion/recursionModel';
import {CAPTION_CHAR_PX, captionPlace, mapSamples, VIEW_BOXES} from './cobwebScene';

/** The fixed-point caption stands clear of the map curve and the diagonal whenever a clear candidate exists. */
const CHARS = 24;
const HALF_HEIGHT = 7; // the caption box is 14 px high, centred on its place

function intersects(x: number[], y: number[], box: {left: number; right: number; bottom: number; top: number}): boolean {
    for (let i = 0; i + 1 < x.length; i++) {
        // sample the segment densely; a coarse polyline of 200 pieces is short enough for 0.5 px steps at these sizes
        const steps = Math.max(1, Math.ceil(Math.hypot(x[i + 1] - x[i], y[i + 1] - y[i]) / 0.5));
        for (let k = 0; k <= steps; k++) {
            const px = x[i] + ((x[i + 1] - x[i]) * k) / steps;
            const py = y[i] + ((y[i + 1] - y[i]) * k) / steps;
            if (px >= box.left && px <= box.right && py >= box.bottom && py <= box.top) return true;
        }
    }
    return false;
}

const STATES: [string, CobwebState][] = [
    ['affine m=0,5 c=1', {map: 'affine', M: 10, C: 10, R: 15, X: 0, step: 0}],
    ['affine m=-0,8 c=1', {map: 'affine', M: -16, C: 10, R: 15, X: 0, step: 0}],
    ['affine m=1,5 c=-1', {map: 'affine', M: 30, C: -10, R: 15, X: 0, step: 0}],
    ['logistic r=1,2', {map: 'logistic', M: 10, C: 10, R: 12, X: 10, step: 0}],
    ['logistic r=2,9', {map: 'logistic', M: 10, C: 10, R: 29, X: 10, step: 0}],
    ['logistic r=2,8', {map: 'logistic', M: 10, C: 10, R: 28, X: 10, step: 0}],
];

describe('the fixed-point caption stays off the map curve and the diagonal', () => {
    for (const [name, state] of STATES) {
        for (const [width, height] of [[600, 400], [390, 300]]) {
            test(`${name} on a ${width}x${height} board`, () => {
                const derived = deriveCobweb(state);
                const star = derived.fixedPoint;
                expect(star).not.toBeNull();
                const [xmin, ymax, xmax, ymin] = VIEW_BOXES[state.map];
                const scale = {unitX: width / (xmax - xmin), unitY: height / (ymax - ymin), width};
                const place = captionPlace(state.map, 'fixed', star ?? NaN, CHARS, scale, derived.map);
                const left = (place.x - xmin) * scale.unitX;
                const box = {left, right: left + CHARS * CAPTION_CHAR_PX, bottom: place.y * scale.unitY - HALF_HEIGHT, top: place.y * scale.unitY + HALF_HEIGHT};
                const samples = mapSamples(derived.map, xmin, xmax);
                const toPx = (xs: number[], ys: number[]) => ({x: xs.map(v => (v - xmin) * scale.unitX), y: ys.map(v => v * scale.unitY)});
                const curve = toPx(samples.x, samples.y);
                const diagonal = toPx([xmin, xmax], [xmin, xmax]);
                expect(intersects(curve.x, curve.y, box)).toBe(false);
                expect(intersects(diagonal.x, diagonal.y, box)).toBe(false);
                expect(box.left).toBeGreaterThanOrEqual(0);
                expect(box.right).toBeLessThanOrEqual(width);
            });
        }
    }
});
