import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';
import {deriveEigen, eigenViewBox} from './eigenScene';
import {deriveEllipse, ellipseViewBox} from './ellipseScene';
import {
    cellOrder, eigenLabelRequests, ellipseLabelRequests, labelRect, nameLength, placeLabels, tickRects, type LabelBoard, type LabelRequest, type Rect,
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

    test('helpers: the cell order starts at the first cell and visits all eight, and LaTeX names are measured without markup', () => {
        const order = cellOrder('right');
        expect(order[0]).toBe('right');
        expect(new Set(order).size).toBe(8);
        expect(nameLength('$$a_1=Ae_1$$')).toBe(7);
        expect(nameLength('$$\\sigma_1$$')).toBe(3);
    });
});
