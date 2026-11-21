/** The affine route's comparison: the reference outline, the centre crosses and the two computations of one curve point. */
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import {t} from '../../../localization';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle, waitUntil} from '../../base/realGraphTestHarness';
import AffineTransformBezierCurveGraph from './AffineTransformsBezierCurveGraph';
import {evaluationNameBox} from '../object/AbstractJXGPointControlledCurve';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

/** Tests only: the private state the comparison owns. */
class Probe extends AffineTransformBezierCurveGraph {
    marksOf() { return this['marks']; }
    boardOf() { return this['board']; }
    pointsNow() { return this.getFirstCurve().getPoints(); }
    shown() { return this.getFirstJxgCurve(); }
    reference() { return this['referencePoints']; }
}

async function mounted() {
    const graph = new Probe();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitUntil(() => graph.state.initialized === true);
    await waitUntil(() => screen.queryByRole('button', {name: new RegExp(`^${t('right')}:`)}) !== null);
    return {graph, view};
}
const press = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: new RegExp(`^${name}:`)})); });
const visible = (o: unknown) => (o as {visProp: {visible: unknown}}).visProp.visible !== false;

test('the reference outline appears after a transformation, vanishes after Reset, and a hand drag resets it', async () => {
    const {graph} = await mounted();
    expect(graph.marksOf()).toBeUndefined();
    press(t('right'));
    const marks = graph.marksOf()!;
    expect(visible(marks.curve)).toBe(true);
    expect(visible(marks.polygon)).toBe(true);
    expect(visible(marks.turnCentre)).toBe(true);
    press(t('left'));
    // Moved back: the curve equals its reference again.
    expect(visible(marks.curve)).toBe(false);
    press(t('right'));
    expect(visible(graph.marksOf()!.curve)).toBe(true);
    // A hand drag of one control point: the current curve becomes the reference.
    act(() => { graph.pointsNow()[1].setX(graph.pointsNow()[1].X() + 0.3); graph.boardOf().update(); });
    expect(visible(marks.curve)).toBe(false);
    expect(graph.reference()).toBeUndefined();
    press(t('right'));
    expect(visible(graph.marksOf()!.curve)).toBe(true);
    await settle(() => graph.reset());
    expect(graph.reference()).toBeUndefined();
    const after = graph.marksOf();
    if (after) expect(visible(after.curve)).toBe(false);
});

test('the readouts follow the shown curve point and the ring sits on T(B(t))', async () => {
    const {graph} = await mounted();
    act(() => { graph.shown().showEvaluationPoint(0.75); });
    expect(screen.queryByText(t('affine_compare_title'))).toBeNull();
    press(t('rotate_left'));
    press(t('scale_up'));
    await waitUntil(() => screen.queryByText(t('affine_compare_title')) !== null);
    const rows = Array.from(document.querySelectorAll('[data-readout^="affine-"] dd')).map(n => n.textContent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(rows[1]);
    const marks = graph.marksOf()!;
    expect(visible(marks.ring)).toBe(true);
    const own = graph.shown().getCurve().eval(0.75);
    expect((marks.ring as unknown as {X(): number}).X()).toBeCloseTo(own.X(), 9);
    expect((marks.ring as unknown as {Y(): number}).Y()).toBeCloseTo(own.Y(), 9);
});

test('after a transformation the marks are board objects that Reset and unmount remove', async () => {
    const {graph, view} = await mounted();
    const board = graph.boardOf();
    press(t('right'));
    const marks = graph.marksOf()!;
    expect(marks.objects.every(o => board.objectsList.includes(o))).toBe(true);
    await settle(() => graph.reset());
    view.unmount();
    expect(marks.objects.some(o => board.objectsList.includes(o))).toBe(false);
});

/** The box (px, y down) of the shown curve point's name and the pixel position of a board point, as the board draws them. */
function labelBoxAndPx(graph: Probe, at: readonly [number, number]) {
    const board = graph.boardOf();
    const point = (graph.shown() as unknown as {evaluationPoint: {X(): number; Y(): number; label: {visProp: {offset: unknown}}}}).evaluationPoint;
    const offset = (point.label.visProp.offset as () => [number, number])();
    const px = (x: number, y: number): [number, number] => [x * board.unitX + board.origin.scrCoords[1], board.origin.scrCoords[2] - y * board.unitY];
    const [bx, by] = px(point.X(), point.Y());
    const {w, h} = evaluationNameBox(0.5, 14);
    const [cx, cy] = [bx + offset[0], by - offset[1]];
    return {box: {x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2}, cross: px(at[0], at[1])};
}

test('the name of B(1/2) keeps clear of the turn-centre cross when the turn brings them together', async () => {
    const {graph} = await mounted();
    const fixture: Array<[number, number]> = [[1, 0], [2, 3], [4, 2], [5, -1]];
    act(() => { graph.pointsNow().forEach((p, i) => { p.setX(fixture[i][0]); p.setY(fixture[i][1]); }); graph.boardOf().update(); });
    act(() => { graph.shown().showEvaluationPoint(0.5); });
    press(t('rotate_right'));
    const {box, cross} = labelBoxAndPx(graph, [3, 1]);
    expect(visible(graph.marksOf()!.turnCentre)).toBe(true);
    const gap = Math.max(box.x0 - cross[0], cross[0] - box.x1, box.y0 - cross[1], cross[1] - box.y1);
    expect(gap).toBeGreaterThanOrEqual(3);
});

test('two centre crosses a few pixels apart are named once, further apart each has its own name', async () => {
    const {graph} = await mounted();
    const fixture: Array<[number, number]> = [[0, 0], [1, 4], [2, 0], [8, 0]];
    act(() => { graph.pointsNow().forEach((p, i) => { p.setX(fixture[i][0]); p.setY(fixture[i][1]); }); graph.boardOf().update(); });
    press(t('right'));
    const marks = graph.marksOf()!;
    const label = (o: unknown) => (o as {label: {visProp: {visible: unknown}}}).label.visProp.visible;
    expect(visible(marks.scaleCentre)).toBe(true);
    expect((marks.turnCentre as unknown as {name: string}).name).toBe('$$c$$');
    expect(label(marks.scaleCentre)).not.toBe(false);
    // Move the points so the centres are 0.05 board units (a few px) apart.
    act(() => { graph.pointsNow().forEach((p, i) => { p.setX([0, 1, 2, 3][i]); p.setY([0, 1, 1, 0.1][i]); }); graph.boardOf().update(); });
    press(t('right'));
    expect((marks.turnCentre as unknown as {name: string}).name).toContain("c'");
    expect(label(marks.scaleCentre)).toBe(false);
});
