import {describe, expect, it} from 'vitest';
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import type {LayoutResult} from '../layout/boardLayout';
import {fitIntent} from './fitIntent';
import {freeRect, obstacleRects} from './layoutRects';
import {marksToPoints} from './viewMarks';

const layout: LayoutResult = {
    cards: [
        {id: 'a', rect: {x: 0, y: 0, w: 200, h: 600}, folded: false, cut: null, anchor: 'tl'},
        {id: 'f', rect: {x: 400, y: 100, w: 100, h: 100}, folded: false, cut: null, anchor: 'free'},
    ],
    pucks: {x: 300, y: 540, w: 400, h: 60},
    free: {x: 200, y: 0, w: 800, h: 540},
    band: {x: 0, w: 200},
};

describe('layout bridge', () => {
    it('freeRect converts the layout free rectangle to px width/height', () => {
        expect(freeRect(layout)).toEqual({x: 200, y: 0, width: 800, height: 540});
    });

    it('obstacles are the docked cards and the pucks, not free cards', () => {
        expect(obstacleRects(layout)).toEqual([
            {x: 0, y: 0, width: 200, height: 600},
            {x: 300, y: 540, width: 400, height: 60},
        ]);
    });

    it('fitIntent maps an intent into the layout free rectangle', () => {
        const r = fitIntent({intent: [-10, 6, 10, -6], canvas: {width: 1000, height: 600}, free: freeRect(layout), equalAxisUnits: true, marginPx: 0});
        expect(r.rect).toEqual({x: 200, y: 0, width: 800, height: 540});
        expect(r.scale).toBeCloseTo(0.8, 9);
    });
});

describe('marksToPoints', () => {
    it('maps points, boxes and polylines, must and nice', () => {
        const marks: ViewMarks = {
            must: [{kind: 'point', x: 1, y: 2}, {kind: 'box', left: 0, top: 3, right: 4, bottom: 1}],
            nice: [{kind: 'polyline', points: [[5, 6], [7, 8]]}],
        };
        expect(marksToPoints(marks)).toEqual({
            must: [[1, 2], [0, 3], [4, 3], [4, 1], [0, 1]],
            nice: [[5, 6], [7, 8]],
        });
        expect(marksToPoints({must: []})).toEqual({must: [], nice: []});
    });
});
