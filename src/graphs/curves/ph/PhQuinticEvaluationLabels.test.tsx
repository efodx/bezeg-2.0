import {act} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {setLanguage} from '../../../localization';
import type {PxBox} from '../../legend/boardLabelPlacement';
import {tickStrips} from '../../legend/pointNamePlacement';
import {controlNameBox, evaluationNameBox, evaluationPointLabel} from '../object/AbstractJXGPointControlledCurve';

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
    return {graph, curve, t};
}

/** The evaluation point's name box (as anchored), the control point labels and the markers, all in px. */
function measure({graph, curve, t}: ReturnType<typeof open>) {
    const board = graph.board;
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const points = board.objectsList as unknown as Placed[];
    const evaluation = points.filter(o => o.elType === 'point' && o.label && o.name?.startsWith('$$B(')).pop()!;
    expect(evaluation, 'the evaluation point has a label').toBeDefined();
    const fontPx = Number(evaluation.label!.evalVisProp('fontsize'));
    // The evaluation name is a typeset fraction centred on its anchor; its box is the one measured in the browser.
    const {w, h} = evaluationNameBox(t, fontPx);
    const [ex, ey] = toPx(evaluation.label!.X(), evaluation.label!.Y());
    expect([evaluation.label!.evalVisProp('anchorx'), evaluation.label!.evalVisProp('anchory')]).toEqual(['middle', 'middle']);
    const name: PxBox = {x0: ex - w / 2, y0: ey - h / 2, x1: ex + w / 2, y1: ey + h / 2};
    // A control point's typeset name sits about 1.3 font sizes above the point, wherever its anchor is (measured in the browser).
    const controls = curve.getJxgPoints().map((p, i) => {
        const [x, y] = toPx(p.X(), p.Y());
        return {name: `p${i}`, box: controlNameBox(`p${i}`, x, y, fontPx)};
    });
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
        // The memo is private; read it to see that hiding the point drops the placed boxes too.
        expect((mounted.curve as unknown as {evaluationLabels: {cache?: unknown}}).evaluationLabels.cache).toBeUndefined();
    });
});
