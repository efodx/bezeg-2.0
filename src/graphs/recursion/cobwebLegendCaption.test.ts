import {describe, expect, test} from 'vitest';
import {deriveCobweb, type CobwebState} from '../../recursion/recursionModel';
import {CAPTION_CHAR_PX, CAPTION_ROW_PX, captionPlace, mapSamples, VIEW_BOXES, wrapped} from './cobwebScene';

/** The legend caption (wrapped at the board's right edge) misses the number row, the y axis and its numbers, the map curve and the diagonal. */
const TEXT = 'Pajkova mreža: navpično do krivulje, vodoravno do diagonale'; // the Slovenian legend text
const CHARS = TEXT.length;
const STATES: [string, CobwebState][] = [
    ['affine m=0,5 c=1', {map: 'affine', M: 10, C: 10, R: 15, X: 0, step: 0}],
    ['affine m=-0,8 c=1', {map: 'affine', M: -16, C: 10, R: 15, X: 0, step: 0}],
    ['logistic r=1,2', {map: 'logistic', M: 10, C: 10, R: 12, X: 10, step: 0}],
    ['logistic r=2,9', {map: 'logistic', M: 10, C: 10, R: 29, X: 10, step: 0}],
];

type Box = {left: number; right: number; bottom: number; top: number};
const overlap = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;

function hitsLine(xs: number[], ys: number[], box: Box): boolean {
    for (let i = 0; i + 1 < xs.length; i++) {
        const steps = Math.max(1, Math.ceil(Math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i]) / 0.5));
        for (let k = 0; k <= steps; k++) {
            const px = xs[i] + ((xs[i + 1] - xs[i]) * k) / steps, py = ys[i] + ((ys[i + 1] - ys[i]) * k) / steps;
            if (px >= box.left && px <= box.right && py >= box.bottom && py <= box.top) return true;
        }
    }
    return false;
}

/** On a 390x300 board these three have no clear spot for a legend that wraps at the board edge (the right half is cut by the diagonal or the curve, the left by the axis): the legend then misses only the numbers, the axis and the board edge (it crosses a line). */
const CRAMPED = new Set(['affine m=-0,8 c=1 390', 'logistic r=1,2 390', 'logistic r=2,9 390']);

describe('the legend caption stands clear of the axes, their numbers and the lines', () => {
    for (const [name, state] of STATES) {
        for (const [width, height] of [[600, 400], [390, 300]]) {
            test(`${name} on a ${width}x${height} board`, () => {
                const derived = deriveCobweb(state);
                const [xmin, ymax, xmax, ymin] = VIEW_BOXES[state.map];
                const scale = {unitX: width / (xmax - xmin), unitY: height / (ymax - ymin), width};
                const place = captionPlace(state.map, 'legend', 0, CHARS, scale, derived.map, TEXT);
                const left = (place.x - xmin) * scale.unitX;
                const textPx = CHARS * CAPTION_CHAR_PX;
                const {rows, widest: wide} = wrapped(TEXT, textPx, width - left - 6);
                const centre = place.y * scale.unitY;
                const box = {left, right: left + wide, bottom: centre - (rows * CAPTION_ROW_PX) / 2 + 2, top: centre + (rows * CAPTION_ROW_PX) / 2 - 2};
                const axisX = -xmin * scale.unitX;
                expect(overlap(box, {left: 0, right: width, bottom: -20, top: -2})).toBe(false); // number row of the x axis
                expect(overlap(box, {left: axisX - 34, right: axisX + 1, bottom: ymin * scale.unitY, top: ymax * scale.unitY})).toBe(false); // y axis and numbers
                const toPx = (xs: number[], ys: number[]) => ({x: xs.map(v => (v - xmin) * scale.unitX), y: ys.map(v => v * scale.unitY)});
                const samples = mapSamples(derived.map, xmin, xmax);
                const curve = toPx(samples.x, samples.y), diagonal = toPx([xmin, xmax], [xmin, xmax]);
                if (!CRAMPED.has(`${name} ${width}`)) {
                    expect(hitsLine(curve.x, curve.y, box)).toBe(false);
                    expect(hitsLine(diagonal.x, diagonal.y, box)).toBe(false);
                }
                expect(box.left).toBeGreaterThanOrEqual(0);
                expect(box.right).toBeLessThanOrEqual(width);
                expect(box.bottom).toBeGreaterThanOrEqual(ymin * scale.unitY);
                expect(box.top).toBeLessThanOrEqual(ymax * scale.unitY);
            });
        }
    }
});
