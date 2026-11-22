import JXG, {Board} from 'jsxgraph';
import {afterEach, expect, it} from 'vitest';
import {JXGBezierCurve} from './JXGBezierCurve';
import {JXGRationalBezierCurve} from './JXGRationalBezierCurve';

const boards: Board[] = [];
function makeBoard(): Board {
    const host = document.createElement('div');
    host.id = `interval-${boards.length}`;
    host.style.width = '600px';
    host.style.height = '400px';
    document.body.appendChild(host);
    const board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-5, 5, 5, -5], renderer: 'no', showCopyright: false, showNavigation: false});
    boards.push(board);
    return board;
}
afterEach(() => {
    boards.splice(0).forEach(board => JXG.JSXGraph.freeBoard(board));
    document.body.innerHTML = '';
});

const POINTS = [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]];

/** A growing curve [0, t] as the De Casteljau demonstrations draw it, with a counter on the shared evaluator. */
function growingCurve(make: (board: Board) => JXGBezierCurve | JXGRationalBezierCurve) {
    const board = makeBoard();
    const curve = make(board);
    let t = 0.3;
    curve.setIntervalEnd(() => t);
    curve.reuseSamplesAcrossIntervalChanges();
    const model = curve.getCurve() as unknown as {eval(t: number): {X(): number, Y(): number}};
    const original = model.eval.bind(model);
    let calls = 0;
    model.eval = (x: number) => { calls++; return original(x); };
    const frame = (value: number, before?: () => void) => { t = value; calls = 0; before?.(); board.update(); return calls; };
    const element = curve.getJxgCurve() as unknown as {points: Array<{usrCoords: number[], _t?: number}>};
    return {board, curve, frame, element, evaluate: original, calls: () => calls};
}

it('does not sample a Bezier curve again across parameter-only frames, but does after a control point moves', () => {
    const {curve, frame, board} = growingCurve(b => new JXGBezierCurve(POINTS, b));
    const first = frame(0.31);
    const parameterOnly = [0.32, 0.5, 0.9, 0.25].map(value => frame(value));
    // Each parameter-only frame evaluates just the two exact ends of the cut.
    parameterOnly.forEach(calls => expect(calls).toBeLessThanOrEqual(8));
    expect(first).toBeGreaterThan(100);

    const dragged = curve.getJxgPoints()[2];
    // The drag handler may already update the board, so count the whole drag.
    const afterDrag = frame(0.9, () => {
        dragged.moveTo([0, 4]);
        (dragged as unknown as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(["drag"], [{}]);
    });
    expect(afterDrag).toBeGreaterThan(100);
    expect(frame(0.91)).toBeLessThanOrEqual(8);

    expect(frame(0.92, () => board.setBoundingBox([-6, 6, 6, -6], false))).toBeGreaterThan(100);
    expect(frame(0.93)).toBeLessThanOrEqual(8);
});

it('draws the cut polyline from the curve evaluator and ends exactly at the evaluated point', () => {
    const {frame, element, evaluate} = growingCurve(b => new JXGBezierCurve(POINTS, b));
    [0.25, 0.5, 0.9].forEach(t => {
        frame(t);
        const points = element.points;
        const ts = points.map(point => point._t!);
        expect(ts[0]).toBe(0);
        expect(ts[ts.length - 1]).toBe(t);
        expect(ts.every((value, i) => i === 0 || value > ts[i - 1])).toBe(true);
        points.forEach(point => {
            const expected = evaluate(point._t!);
            expect(point.usrCoords[1]).toBeCloseTo(expected.X(), 12);
            expect(point.usrCoords[2]).toBeCloseTo(expected.Y(), 12);
        });
        expect(points.length).toBeGreaterThan(50);
    });
});

it('samples a rational curve again after a weight changes', () => {
    const {frame, curve} = growingCurve(b => new JXGRationalBezierCurve(POINTS, [1, 1, 1, 1, 1], b));
    frame(0.31);
    expect(frame(0.4)).toBeLessThanOrEqual(8);
    const rational = curve.getCurve() as unknown as {setWeights(weights: number[]): void};
    rational.setWeights([1, 1, 3, 1, 1]);
    expect(frame(0.41)).toBeGreaterThan(100);
});

it('falls back to JSXGraph sampling every frame when the interval leaves [0, 1]', () => {
    const {frame, curve} = growingCurve(b => new JXGBezierCurve(POINTS, b));
    curve.setIntervalEnd(() => 1.2);
    expect(frame(0.5)).toBeGreaterThan(100);
    expect(frame(0.6)).toBeGreaterThan(100);
});
