import JXG, {Board} from 'jsxgraph';
import {afterEach, expect, it, vi} from 'vitest';
import {JXGBSplineCurve} from './JXGBSplineCurve';
import {JXGGenericSplineCurve} from './JXGGenericSplineCurve';
import {JXGQuadraticG1SplineCurve} from './JXGQuadraticG1SplineCurve';
import {JXGPHBezierCurve} from './JXGPHBezierCurve';
import {JXGRationalBezierCurve} from './JXGRationalBezierCurve';
import {BSplineCurve} from '../../../bezeg/impl/curve/bspline-curve';
import {GenericBezierSpline} from '../../../bezeg/impl/curve/GenericBezierSpline';
import {G1QuadraticBezierSpline} from '../../../bezeg/impl/curve/G1QuadraticBezierSpline';
import {RationalBezierCurve} from '../../../bezeg/impl/curve/rational-bezier-curve';

const SEVEN = [[0, 0], [1, 2], [2, 3], [3, 1], [4, 0], [5, 2], [6, 3]];
const FOUR = [[0, 0], [1, 2], [3, 2], [4, 0]];

let board: Board;
function makeBoard(): Board {
    const host = document.createElement('div');
    host.id = 'subclass-construct-leak';
    document.body.appendChild(host);
    board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-2, 6, 8, -2], renderer: 'no', showCopyright: false, showNavigation: false});
    return board;
}

afterEach(() => {
    vi.restoreAllMocks();
    JXG.JSXGraph.freeBoard(board);
    document.body.innerHTML = '';
});

/** A subclass construction step that throws after `super()` created objects leaves no object and no update listener. */
const updateListeners = (b: Board) => ((b as unknown as {eventHandlers: Record<string, unknown[] | undefined>}).eventHandlers['update'] ?? []).length;

function expectCleanFailure(construct: (board: Board) => unknown): void {
    const b = makeBoard();
    const objects = b.objectsList.length;
    const listeners = updateListeners(b);

    expect(() => construct(b)).toThrow('post-super failure');

    expect(b.objectsList.length).toBe(objects);
    expect(updateListeners(b)).toBe(listeners);
}

const fail = () => {
    throw new Error('post-super failure');
};

it('a B-spline whose setSpline throws after super leaves nothing behind', () => {
    vi.spyOn(BSplineCurve.prototype, 'setSpline').mockImplementation(fail);
    expectCleanFailure(b => new JXGBSplineCurve(FOUR, 2, [0, 0, 0, 0.5, 1, 1, 1], undefined, b));
});

it('a generic spline whose restore throws after super leaves nothing behind', () => {
    vi.spyOn(GenericBezierSpline.prototype, 'restore').mockImplementation(fail);
    expectCleanFailure(b => new JXGGenericSplineCurve(SEVEN, 1, 3, b));
});

it('a spline whose generateBezierCurves throws after super leaves nothing behind', () => {
    const original = G1QuadraticBezierSpline.prototype.generateBezierCurves;
    let calls = 0;
    vi.spyOn(G1QuadraticBezierSpline.prototype, 'generateBezierCurves').mockImplementation(function (this: G1QuadraticBezierSpline) {
        // The first call is the base class's own, inside its guarded constructor; the second is the subclass's.
        if (calls++ > 0) fail();
        return original.call(this);
    });
    expectCleanFailure(b => new JXGQuadraticG1SplineCurve(FOUR, b));
});

it('a rational Bezier curve whose setWeights throws after super leaves nothing behind', () => {
    vi.spyOn(RationalBezierCurve.prototype, 'setWeights').mockImplementation(fail);
    expectCleanFailure(b => new JXGRationalBezierCurve(FOUR, [1, 2, 2, 1], b));
});

it('a PH Bezier curve whose final setAttributes throws after super leaves nothing behind', () => {
    const original = JXGPHBezierCurve.prototype.setAttributes;
    vi.spyOn(JXGPHBezierCurve.prototype, 'setAttributes').mockImplementation(function (this: JXGPHBezierCurve, attributes) {
        if (attributes.allowShowConvexHull === false) fail();
        return original.call(this, attributes);
    });
    expectCleanFailure(b => new JXGPHBezierCurve(FOUR, b));
});
