import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';
import {DEFAULT_LINEAR_MAP_STATE} from '../../linear/linearMapModel';
import type {LabelPlacement} from '../functions/BaseFunctionGraph';
import {compositionViewBox, deriveComposition} from './compositionScene';
import {deriveEigen, eigenViewBox} from './eigenScene';
import {deriveEllipse, ellipseViewBox} from './ellipseScene';
import {
    cellOrder, compositionLabelRequests, eigenLabelRequests, ellipseLabelRequests, labelRect, nameLength, placeLabels, tickRects, type LabelBoard, type LabelRequest, type Rect,
} from './labelLayout';

const N = LINEAR_MAP_EXAMPLES['non-symmetric'];
const E = LINEAR_MAP_EXAMPLES['eigen-default'];
const FONT = 16;
// The graph's board at 1366 x 768 and at 390 x 844 (the unit-per-pixel scale follows the fitted view box).
const VIEWPORTS: readonly [number, number][] = [[930, 450], [380, 300]];

const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;

function check(requests: readonly LabelRequest[], board: LabelBoard) {
    const cells = placeLabels(requests, board);
    const rects = requests.map(request => labelRect(request, cells[request.id], board));
    const [l, t, r, b] = board.box;
    rects.forEach((rect, i) => {
        expect(rect.left, requests[i].id).toBeGreaterThanOrEqual(l);
        expect(rect.right, requests[i].id).toBeLessThanOrEqual(r);
        expect(rect.bottom, requests[i].id).toBeGreaterThanOrEqual(b);
        expect(rect.top, requests[i].id).toBeLessThanOrEqual(t);
        for (let j = 0; j < i; j++) expect(overlaps(rect, rects[j]), `${requests[j].id} and ${requests[i].id}`).toBe(false);
    });
    return {cells, rects};
}

describe('the shared greedy label placement', () => {
    test.each(VIEWPORTS.map(size => [size]))('ellipse mode on N and E, both toggles: no two labels overlap and all stay inside the board (%j)', ([w, h]) => {
        for (const matrix of [N, E] as Mat2[]) {
            for (const conic of [false, true]) {
                const box = ellipseViewBox(matrix, conic, w, h);
                check(ellipseLabelRequests(matrix, deriveEllipse(matrix), conic), {box, widthPx: w, heightPx: h, fontSize: FONT});
            }
        }
    });

    test.each(VIEWPORTS.map(size => [size]))('eigen mode on N and E: no overlap, inside the board, for the test vectors every 15 degrees (%j)', ([w, h]) => {
        for (const matrix of [N, E] as Mat2[]) {
            const box = eigenViewBox(matrix, w, h);
            for (let angle = 0; angle < 180; angle += 15) {
                check(eigenLabelRequests(matrix, deriveEigen(matrix, angle)), {box, widthPx: w, heightPx: h, fontSize: FONT});
            }
        }
    });

    test('the handle labels come first: a later label at the same point takes another cell', () => {
        const board: LabelBoard = {box: [-4, 3, 4, -3], widthPx: 800, heightPx: 600, fontSize: FONT};
        const a: LabelRequest = {id: 'a', anchor: [2, 1], name: '$$a_1=Ae_1$$', distance: 1.1};
        const b: LabelRequest = {id: 'b', anchor: [2, 1], name: '$$\\sigma_1$$', distance: 0.9};
        const cells = placeLabels([a, b], board);
        expect(cells.a).toBe('above-right');
        expect(cells.b).not.toBe('above-right');
        expect(overlaps(labelRect(a, cells.a, board), labelRect(b, cells.b, board))).toBe(false);
    });

    test('a label beside the board edge turns inward, and the placement follows the view box', () => {
        const request: LabelRequest = {id: 'a', anchor: [1.9, 0.5], name: '$$a_1=Ae_1$$', distance: 1.1};
        const narrow: LabelBoard = {box: [-2.4, 3, 2.4, -3], widthPx: 380, heightPx: 475, fontSize: FONT};
        const wide: LabelBoard = {box: [-6, 3, 6, -3], widthPx: 940, heightPx: 470, fontSize: FONT};
        expect(placeLabels([request], narrow).a).toMatch(/left|above$|below$/);
        expect(placeLabels([request], wide).a).toMatch(/right/);
    });

    test('a cell on a tick label is skipped', () => {
        const board: LabelBoard = {box: [-4, 3, 4, -3], widthPx: 800, heightPx: 600, fontSize: FONT};
        const ticks = tickRects(board);
        const request: LabelRequest = {id: 'a', anchor: [2, 0.05], name: '$$\\sigma_1$$', distance: 0.9};
        const cell = placeLabels([request], board).a;
        expect(ticks.some(tick => overlaps(labelRect(request, cell, board), tick))).toBe(false);
    });

    describe('composition mode, the quarter turn about (3, 1) (lesson L5 step 4)', () => {
        const R = {kind: 'rotation', k: 6} as const;
        const view = deriveComposition({...DEFAULT_LINEAR_MAP_STATE, mode: 'composition', element: R, pivot: [3, 1]});
        const requests = compositionLabelRequests(view);
        const rectsOf = (cells: Record<string, LabelPlacement>, board: LabelBoard) => requests.map(request => labelRect(request, cells[request.id], board));
        const overlapCount = (rects: Rect[]) => rects.flatMap((rect, i) => rects.slice(0, i).filter(other => overlaps(rect, other))).length;

        test('at 1366 px the placement is that of the code before the 390-px rule', () => {
            const board: LabelBoard = {box: compositionViewBox(view), widthPx: 930, heightPx: 450, fontSize: FONT};
            expect(placeLabels(requests, board)).toEqual({
                c: 'right', p0: 'below-left', p1: 'above-right', p2: 'right', p3: 'above-right',
                t0: 'below-right', t1: 'below-right', t2: 'left', t3: 'above-right',
            });
        });

        test('the requests come in priority order: c, then the images, then the sources', () => {
            expect(requests.map(request => request.id)).toEqual(['c', 't0', 't1', 't2', 't3', 'p0', 'p1', 'p2', 'p3']);
            expect(compositionLabelRequests(deriveComposition({...DEFAULT_LINEAR_MAP_STATE, mode: 'composition'})).map(request => request.id)[0]).toBe('t0');
        });

        test.each([[930, 450], [350, 300]])('the fixed cells of the old board overlap (the red case, %j px)', (w, h) => {
            const board: LabelBoard = {box: compositionViewBox(view), widthPx: w, heightPx: h, fontSize: FONT};
            const fixed: Record<string, LabelPlacement> = {c: 'below-left'};
            for (let i = 0; i < 4; i++) { fixed[`p${i}`] = 'above-left'; fixed[`t${i}`] = 'below-right'; }
            expect(overlapCount(rectsOf(fixed, board))).toBeGreaterThan(0);
        });

        // The last case is the graph at 390 px wide as measured in the browser (a 364 x 295 board, box fitted to equal axis units).
        test.each([[930, 450, 1], [350, 300, 1], [1100, 700, 1], [364, 295, 0]])('the placed cells: no two of the nine labels overlap and none leaves the board (%j px)', (w, h, fit) => {
            const box: [number, number, number, number] = fit ? compositionViewBox(view) : [-11.105, 9, 11.105, -9];
            const board: LabelBoard = {box, widthPx: w, heightPx: h, fontSize: FONT};
            const rects = rectsOf(placeLabels(requests, board), board);
            expect(overlapCount(rects)).toBe(0);
            const [l, t, r, b] = board.box;
            rects.forEach(rect => {
                expect(rect.left).toBeGreaterThanOrEqual(l);
                expect(rect.right).toBeLessThanOrEqual(r);
                expect(rect.bottom).toBeGreaterThanOrEqual(b);
                expect(rect.top).toBeLessThanOrEqual(t);
            });
        });
    });

    describe('at 390 px (a 364 x 295 board): no label covers another label or a point marker', () => {
        const W = 364, H = 295;
        const board = (box: readonly [number, number, number, number]): LabelBoard => ({box, widthPx: W, heightPx: H, fontSize: FONT});
        const clean = (requests: readonly LabelRequest[], b: LabelBoard, what: string, hitsAllowed = 0) => {
            let hits = 0;
            const cells = placeLabels(requests, b);
            const [l, t, r, bt] = b.box;
            const upx = (r - l) / b.widthPx, upy = (t - bt) / b.heightPx;
            const rects = requests.map(request => labelRect(request, cells[request.id], b));
            requests.forEach((request, i) => {
                for (let j = 0; j < i; j++) expect(overlaps(rects[i], rects[j]), `${what}: ${requests[j].id} and ${request.id} overlap`).toBe(false);
                requests.forEach(other => {
                    if (other === request) return;
                    const marker = {left: other.anchor[0] - 7 * upx, right: other.anchor[0] + 7 * upx, bottom: other.anchor[1] - 7 * upy, top: other.anchor[1] + 7 * upy};
                    if (overlaps(rects[i], marker)) hits++;
                });
            });
            expect(hits, `${what}: labels on markers`).toBeLessThanOrEqual(hitsAllowed);
        };

        test('composition: L5 step 1 (no pivot, a translation) and step 4 (R about (3, 1))', () => {
            const R = {kind: 'rotation', k: 6} as const;
            // L5 step 1 opens on a rotation followed by a reflection (determinant -1); a translation spreads the images over the board.
            const step1 = deriveComposition({...DEFAULT_LINEAR_MAP_STATE, mode: 'composition', element: R, secondElement: {kind: 'reflection', k: 3}, translation: [0, -4]});
            const step4 = deriveComposition({...DEFAULT_LINEAR_MAP_STATE, mode: 'composition', element: R, pivot: [3, 1]});
            clean(compositionLabelRequests(step1), board(compositionViewBox(step1)), 'step 1 fitted');
            clean(compositionLabelRequests(step1), board([-11.105, 9, 11.105, -9]), 'step 1');
            // Step 4 has no overlap-free assignment that also clears every marker (c has a single clear cell); the best one covers one marker.
            clean(compositionLabelRequests(step4), board([-11.105, 9, 11.105, -9]), 'step 4', 1);
        });

        test.each([['N', N], ['E', E]] as [string, Mat2][])('eigen mode on %s, test vectors every 15 degrees', (name, matrix) => {
            for (let angle = 0; angle < 180; angle += 15) {
                clean(eigenLabelRequests(matrix, deriveEigen(matrix, angle)), board(eigenViewBox(matrix, W, H)), `eigen ${name} ${angle}`);
            }
        });

        test.each([[false], [true]])('ellipse mode on N (conic %s)', conic => {
            clean(ellipseLabelRequests(N, deriveEllipse(N), conic), board(ellipseViewBox(N, conic, W, H)), 'ellipse N');
        });
    });

    test('helpers: the cell order starts at the first cell and visits all eight, and LaTeX names are measured without markup', () => {
        const order = cellOrder('right');
        expect(order[0]).toBe('right');
        expect(new Set(order).size).toBe(8);
        expect(nameLength('$$a_1=Ae_1$$')).toBe(7);
        expect(nameLength('$$\\sigma_1$$')).toBe(3);
    });
});
