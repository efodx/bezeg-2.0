import JXG, {Board} from 'jsxgraph';
import {afterEach, expect, it} from 'vitest';
import {JXGBezierCurve} from './JXGBezierCurve';

const boards: Board[] = [];
function makeBoard(): Board {
    const host = document.createElement('div');
    host.id = `hull-${boards.length}`;
    document.body.appendChild(host);
    const board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-2, 6, 8, -2], renderer: 'no', showCopyright: false, showNavigation: false});
    boards.push(board);
    return board;
}
afterEach(() => {
    boards.splice(0).forEach(board => JXG.JSXGraph.freeBoard(board));
    document.body.innerHTML = '';
});

it('keeps the convex hull valid while control points are removed', () => {
    const board = makeBoard();
    const curve = new JXGBezierCurve([[0, 0], [1, 2], [3, 2], [4, 0]], board);
    curve.showConvexHull(true);
    curve.showControlPolygon();
    const hullVertices = () => (Object.values(board.objects) as {elType?: string, vertices?: unknown[]}[])
        .filter(o => o.elType === 'polygon')
        .map(o => (o.vertices?.length ?? 0) - 1);
    expect(() => curve.removePoint(3)).not.toThrow();
    board.update();
    // The hull is rebuilt over the remaining points: three points give a triangle.
    expect(hullVertices()).toEqual([3]);
    expect(() => curve.removePoint(2)).not.toThrow();
    expect(() => curve.removePoint(1)).not.toThrow();
});
