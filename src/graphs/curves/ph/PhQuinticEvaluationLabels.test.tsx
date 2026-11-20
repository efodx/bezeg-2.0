import {act} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {setLanguage} from '../../../localization';
import type {PxBox} from '../../legend/boardLabelPlacement';
import {nameBox, tickStrips} from '../../legend/pointNamePlacement';
import {evaluationPointLabel} from '../object/AbstractJXGPointControlledCurve';

// A lesson board at 1440 px is about 880 x 600.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 880], ['clientHeight', 600], ['offsetWidth', 880], ['offsetHeight', 600]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, value: size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

type Curve = {showEvaluationPoint(t: number): void; hideEvaluationPoint(): void; getJxgPoints(): JXG.Point[]; showControlPolygon(): void};
type Internals = {board: JXG.Board; getFirstJxgCurve(): Curve; boardUpdate(): void};
type Placed = {elType: string; name?: string; X: () => number; Y: () => number; evalVisProp(name: string): unknown; label?: Placed & {plaintext?: string}};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function open(t: number, polygon = false) {
    const mounted = mountGraph(graphFactories['ph-quintic']());
    const graph = mounted.graph as unknown as Internals;
    const curve = graph.getFirstJxgCurve();
    act(() => { if (polygon) curve.showControlPolygon(); curve.showEvaluationPoint(t); graph.board.update(); });
    return {graph, curve};
}

/** The evaluation point's name box (as anchored), the control point labels and the markers, all in px. */
function measure({graph, curve}: ReturnType<typeof open>) {
    const board = graph.board;
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const points = board.objectsList as unknown as Placed[];
    const evaluation = points.filter(o => o.elType === 'point' && o.label && o.name?.startsWith('$$B(')).pop()!;
    expect(evaluation, 'the evaluation point has a label').toBeDefined();
    const fontPx = Number(evaluation.label!.evalVisProp('fontsize'));
    const boxAt = (label: Placed, name: string): PxBox => {
        const {w, h} = nameBox(name, fontPx);
        const [x, y] = toPx(label.X(), label.Y());
        const x0 = label.evalVisProp('anchorx') === 'left' ? x : label.evalVisProp('anchorx') === 'right' ? x - w : x - w / 2;
        const y0 = label.evalVisProp('anchory') === 'bottom' ? y - h : label.evalVisProp('anchory') === 'top' ? y : y - h / 2;
        return {x0, y0, x1: x0 + w, y1: y0 + h};
    };
    const name = boxAt(evaluation.label!, 'B(1/2)');
    const controls = curve.getJxgPoints().map((p, i) => ({name: `p${i}`, box: boxAt((p as unknown as Placed).label!, `p${i}`)}));
    const markers = [evaluation, ...(curve.getJxgPoints() as unknown as Placed[])].map(p => ({at: toPx(p.X(), p.Y()), r: Number(p.evalVisProp('size')) + 1}));
    return {board, name, controls, markers, ticks: tickStrips(board)};
}

function expectClear(mounted: ReturnType<typeof open>, where: string) {
    const {board, name, controls, markers, ticks} = measure(mounted);
    expect.soft(name.x0 >= 0 && name.y0 >= 0 && name.x1 <= board.canvasWidth && name.y1 <= board.canvasHeight, `${where}: the name leaves the board`).toBe(true);
    for (const c of controls) expect.soft(overlaps(name, c.box), `${where}: the name lies on the label ${c.name}`).toBe(false);
    markers.forEach((m, i) => expect.soft(m.at[0] + m.r > name.x0 && m.at[0] - m.r < name.x1 && m.at[1] + m.r > name.y0 && m.at[1] - m.r < name.y1,
        `${where}: the name covers the marker ${i === 0 ? 'B' : `p${i - 1}`}`).toBe(false));
    ticks.forEach((tick, i) => expect.soft(overlaps(name, tick), `${where}: the name covers the tick ${i}`).toBe(false));
}

describe('the evaluation point of a quintic PH curve', () => {
    it('is named at the size of the other labels', () => {
        expect(evaluationPointLabel(0.5)).toBe('$$B(\\tfrac{1}{2})$$');
        expect(evaluationPointLabel(0.25)).toBe('$$B(0.25)$$');
    });

    it('has its name clear of the control point labels, the markers and the tick labels in the lesson frame', () => {
        expectClear(open(0.5), 'lesson frame');
    });

    it('does the same near the ends and with the control polygon shown', () => {
        expectClear(open(0.9, true), 't = 0.9 with the polygon');
        expectClear(open(0.1), 't = 0.1');
    });

    it('drops its placement with the point', () => {
        const mounted = open(0.5);
        act(() => { mounted.curve.hideEvaluationPoint(); mounted.graph.board.update(); });
        const points = mounted.graph.board.objectsList as unknown as Placed[];
        expect(points.some(o => o.elType === 'point' && o.name?.startsWith('$$B('))).toBe(false);
    });
});
