import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {t} from '../../localization';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import CubicPhBezierCurveGraph from '../curves/ph/CubicPhBezierCurveGraph';
import {BaseBezierCurveGraph} from './BaseBezierCurveGraph';
import {BaseGraphStates} from './BaseCurveGraph';
import {GraphHost} from './GraphHost';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {SelectedCurveOption} from './CurveEditingFeature';
import {appStorage} from '../../storage/appStorage';
import DecasteljauGraph from '../curves/bezier/DecasteljauGraph';
import {ActivitySession} from '../../learning/chapter/ActivitySession';
import {findActivity} from '../../learning/chapter/activities';
import {AxisSelect} from './DisplaySettings';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
    appStorage.clear();
});

const renderGraph = (graph: BaseGraph<BaseGraphState>) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);

/** A route without structured editing (the editing-mode dropdown is the only mode control) holding two curves. */
class TwoCurveGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    defaultPreset(): any {
        return [["JSXBezierCurve", {points: [[-4, -3], [-3, 2], [2, 2], [3, -2]]}],
            ["JSXBezierCurve", {points: [[-4, 3], [-3, -2], [2, -2], [3, 2]]}]];
    }

    override presets() { return "two-curve-test"; }

    selectWith(index: number, selectedCurveOption: SelectedCurveOption) {
        this.selectCurve(this.jxgCurves[index], {selectedCurveOption});
    }
    curveAt(index: number) { return this.jxgCurves[index]; }
    selectedCurve() { return this.getSelectedCurve(); }
    movePoint(curveIndex: number, pointIndex: number, x: number, y: number) {
        this.jxgCurves[curveIndex].getJxgPoints()[pointIndex].moveTo([x, y], 0);
    }
    setView(box: [number, number, number, number]) { this.board.setBoundingBox(box); }
}

class SelectableBezierGraph extends BezierCurveGraph {
    selectFirst() { this.selectCurve(this.getFirstJxgCurve()); }
}

class CountableDecasteljauGraph extends DecasteljauGraph {
    drawnCurveCount() { return this.board.objectsList.filter(object => object !== null && typeof object === 'object'
        && 'elType' in object && object.elType === 'curve').length; }
}

test('visible editing-mode buttons follow the graph and switch modes without changing curve geometry', () => {
    const graph = new TwoCurveGraph();
    const view = renderGraph(graph);
    act(() => graph.selectWith(0, SelectedCurveOption.ADD_POINTS));

    const modeGroup = () => view.getByRole('group', {name: t('editing_mode')});
    const modeButton = (label: string) => view.getByRole('button', {name: label});
    const modes = [t('manipulate_curve'), t('add_points'), t('delete_points')];
    const selectedModes = () => modes.filter(label => modeButton(label).getAttribute('aria-pressed') === 'true');
    const originalPoints = graph.curveAt(0).getCurve().getPoints().map(point => [point.X(), point.Y()]);
    expect(modeGroup()).toBeTruthy();
    expect(modeGroup().querySelectorAll('button')).toHaveLength(3);
    expect(modeGroup().querySelectorAll('.curve-editing-mode-marker[aria-hidden="true"]')).toHaveLength(3);
    expect(selectedModes()).toEqual([t('add_points')]);

    // The curve picker selects the other curve and switches the graph to move mode.
    fireEvent.click(view.getByRole('button', {name: `${t('curve')}2`}));
    expect(graph.state.selectedCurveOption).toBe(SelectedCurveOption.MOVE_CURVE);
    expect(selectedModes()).toEqual([t('manipulate_curve')]);

    // A user choice is written to the graph and shown.
    fireEvent.click(modeButton(t('delete_points')));
    expect(graph.state.selectedCurveOption).toBe(SelectedCurveOption.DELETE_POINTS);
    expect(selectedModes()).toEqual([t('delete_points')]);
    expect(graph.curveAt(0).getCurve().getPoints().map(point => [point.X(), point.Y()])).toEqual(originalPoints);
    view.unmount();
});

test('lesson checkpoints restore curve geometry, viewport, and selected editing mode', () => {
    const graph = new TwoCurveGraph();
    const view = renderGraph(graph);
    act(() => graph.selectWith(1, SelectedCurveOption.DELETE_POINTS));
    const selectedCurve = graph.curveAt(1);
    const savedPoints = selectedCurve.getCurve().getPoints().map(point => [point.X(), point.Y()]);
    const savedView = graph.boardState()?.boundingBox;
    act(() => { graph.setElementSize(2); graph.setAxisSelect(AxisSelect.NONE); graph.setPointLabelsVisible(false); });
    const checkpoint = graph.getLessonCapabilities().captureState();

    act(() => graph.selectWith(0, SelectedCurveOption.MOVE_CURVE));
    act(() => graph.movePoint(1, 0, 10, 10));
    graph.setView([-2, 2, 2, -2]);
    act(() => { graph.setElementSize(0); graph.setAxisSelect(AxisSelect.EVERYTHING); graph.setPointLabelsVisible(true); });
    act(() => graph.getLessonCapabilities().restoreState(checkpoint));

    expect(graph.selectedCurve()).toBe(graph.curveAt(1));
    expect(graph.state.selectedCurveOption).toBe(SelectedCurveOption.DELETE_POINTS);
    expect(view.getByRole('button', {name: t('delete_points')})).toHaveAttribute('aria-pressed', 'true');
    expect(graph.curveAt(1).getCurve().getPoints().map(point => [point.X(), point.Y()])).toEqual(savedPoints);
    expect(graph.boardState()?.boundingBox).toEqual(savedView);
    expect(graph.displaySettings.getSize()).toBe(2);
    expect(graph.displaySettings.getAxisSelect()).toBe(AxisSelect.NONE);
    expect(graph.displaySettings.pointLabelsVisible).toBe(false);
    view.unmount();
});

test('Reset restores the authored De Casteljau parameter after reopening an edited activity snapshot', () => {
    const activity = findActivity('curve-parameter')!;
    const firstGraph = new CountableDecasteljauGraph();
    const firstView = renderGraph(firstGraph as unknown as BaseGraph<BaseGraphState>);
    const firstSession = new ActivitySession(activity, firstGraph.getLessonCapabilities());

    act(() => firstSession.start());
    expect(firstGraph.state.t).toBe(0.5);
    expect(firstGraph.drawnCurveCount()).toBe(2);
    act(() => firstGraph.getLessonCapabilities().apply({kind: 'parameter', name: 't', value: 0.75}));
    expect(firstGraph.state.t).toBe(0.75);
    const edited = firstSession.capture();
    firstView.unmount();

    const graph = new CountableDecasteljauGraph();
    const view = renderGraph(graph as unknown as BaseGraph<BaseGraphState>);
    const session = new ActivitySession(activity, graph.getLessonCapabilities());
    act(() => session.start(edited));
    expect(graph.state.t).toBe(0.75);
    expect(graph.drawnCurveCount()).toBe(2);

    act(() => session.reset());
    expect(graph.state.t).toBe(0.5);
    expect(graph.drawnCurveCount()).toBe(2);
    expect(view.container.querySelector('.decasteljau-animation-heading output')?.textContent).toContain('t = 0.50');
    view.unmount();
});

test('the De Casteljau switch of the selected curve follows a lesson action and then toggles on the first click', () => {
    const graph = new SelectableBezierGraph();
    const view = renderGraph(graph);
    act(() => graph.selectFirst());
    const scheme = () => view.getByLabelText(t('de_casteljau_construction'), {selector: 'input'}) as HTMLInputElement;
    expect(scheme().checked).toBe(false);

    act(() => graph.getLessonCapabilities().apply({kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true}));
    expect(graph.getFirstJxgCurve().isShowingDecasteljauScheme()).toBe(true);
    expect(scheme().checked).toBe(true);

    fireEvent.click(scheme());
    expect(graph.getFirstJxgCurve().isShowingDecasteljauScheme()).toBe(false);
    expect(scheme().checked).toBe(false);
    view.unmount();
});

test('the selected-curve parameter sliders read the adapter, so an outside change shows after a store notification', () => {
    const graph = new SelectableBezierGraph();
    const view = renderGraph(graph);
    act(() => graph.selectFirst());
    act(() => {
        graph.getFirstJxgCurve().setSubdivisionT(0.8);
        graph.getFirstJxgCurve().setExtrapolationT(1.4);
        graph.store.notify();
    });
    expect(Number((view.getByLabelText(t('subdivision_parameter_t')) as HTMLInputElement).value)).toBeCloseTo(0.8);
    expect(Number((view.getByLabelText(t('extrapolation_parameter_t')) as HTMLInputElement).value)).toBeCloseTo(1.4);
    view.unmount();
});

test('using the shorten preview does not change the subdivision parameter the user chose', () => {
    class Graph extends SelectableBezierGraph {
        curveCount() { return this.jxgCurves.length; }
    }
    const graph = new Graph();
    const view = renderGraph(graph);
    act(() => graph.selectFirst());
    const curve = graph.getFirstJxgCurve();
    const subdivisionSlider = () => view.getByLabelText(t('subdivision_parameter_t')) as HTMLInputElement;
    const expectedSplit = curve.getCurve().eval(0.3);

    fireEvent.change(subdivisionSlider(), {target: {value: '0.3'}});
    fireEvent.click(view.getByRole('button', {name: t('preview_shortening')}));
    fireEvent.change(view.getByLabelText(t('end_parameter_of_the_shortened_curve_t')), {target: {value: '0.8'}});

    // The preview borrows the shared parameter, but the slider keeps the user's choice.
    expect(Number(subdivisionSlider().value)).toBeCloseTo(0.3);

    // Ending the preview gives the adapter its own value back.
    fireEvent.click(view.getByRole('button', {name: t('preview_shortening')}));
    expect(curve.getSubdivisionT()).toBeCloseTo(0.3);

    fireEvent.click(view.getByRole('button', {name: t('preview_shortening')}));
    fireEvent.click(view.getByRole('button', {name: t('subdivide')}));
    expect(graph.curveCount()).toBe(2);
    const left = graph.getFirstJxgCurve().getCurve().getPoints();
    expect(left[left.length - 1].X()).toBeCloseTo(expectedSplit.X());
    expect(left[left.length - 1].Y()).toBeCloseTo(expectedSplit.Y());
    view.unmount();
});

test('PH offsets: the switch and the captured scene agree, and restoring a checkpoint re-applies the offsets', () => {
    const graph = new CubicPhBezierCurveGraph();
    const view = renderGraph(graph);
    const offsets = () => view.getAllByLabelText(t('curve_offsets')).find(element => element instanceof HTMLInputElement) as HTMLInputElement;

    // Offset visibility is owned by the curve adapter alone; the graph state carries no second copy of it.
    expect(graph.state).not.toHaveProperty('showOffsetCurve');
    expect(graph.state).not.toHaveProperty('showOffsetCurveControlPoints');

    fireEvent.click(offsets());
    expect(graph.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()).toBe(true);
    expect(offsets().checked).toBe(true);
    expect(graph.state).not.toHaveProperty('showOffsetCurve');

    const checkpoint = graph.getLessonCapabilities().captureState();
    fireEvent.click(offsets());
    expect(offsets().checked).toBe(false);

    act(() => graph.getLessonCapabilities().restoreState(checkpoint));
    expect(graph.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()).toBe(true);
    expect(offsets().checked).toBe(true);

    act(() => graph.getLessonCapabilities().apply({kind: 'curve-visibility', target: 'offset-curve', visible: false}));
    expect(graph.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()).toBe(false);
    expect(offsets().checked).toBe(false);
    view.unmount();
});
