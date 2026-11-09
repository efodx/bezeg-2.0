import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {t} from '../../../localization';
import {appStorage} from '../../../storage/appStorage';
import BezierCurveGraph from '../../curves/bezier/BezierCurveGraph';
import ElevationGraph from '../../curves/bezier/ElevationGraph';
import ExtrapolationGraph from '../../curves/bezier/ExtrapolationGraph';
import SubdivisionGraph, {MAX_SUBDIVISION_STEPS} from '../../curves/bezier/SubdivisionGraph';
import SubdivisionGraph1 from '../../curves/bezier/SubdivisionGraph1';
import RationalElevationGraph from '../../curves/rational/RationalElevationGraph';
import {GraphHost} from '../GraphHost';
import {CurveOperation, BezierAdapter} from './BezierCurveControls';

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

class SelectableGraph extends BezierCurveGraph {
    selectFirst() { this.selectCurve(this.getFirstJxgCurve()); }
}

type Xy = {X(): number, Y(): number};
type CurveGraph = {getFirstJxgCurve(): {getCurve(): {getPoints(): Xy[], eval(u: number): Xy}}};
const points = (graph: CurveGraph) => graph.getFirstJxgCurve().getCurve().getPoints().map(point => [point.X(), point.Y()]);
const evalAt = (graph: CurveGraph, u: number) => {
    const p = graph.getFirstJxgCurve().getCurve().eval(u);
    return [p.X(), p.Y()];
};

function mount(graph: React.ComponentProps<typeof GraphHost>['create'] extends () => infer G ? G : never) {
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return view;
}

describe('the selected-curve operations keep their mathematical results', () => {
    test('Apply subdivide keeps the first piece of the curve at the chosen parameter', () => {
        const graph = new SelectableGraph();
        const view = mount(graph);
        act(() => graph.selectFirst());
        fireEvent.change(view.getByLabelText(t('subdivision_parameter_t')), {target: {value: '0.3'}});
        const original = [0.25, 0.5, 1].map(u => evalAt(graph, 0.3 * u));
        fireEvent.click(view.getByRole('button', {name: t('subdivide'), hidden: false}));
        [0.25, 0.5, 1].forEach((u, i) => {
            const [x, y] = evalAt(graph, u);
            expect(x).toBeCloseTo(original[i][0], 8);
            expect(y).toBeCloseTo(original[i][1], 8);
        });
        view.unmount();
    });

    test('Apply extrapolate extends the curve to the chosen parameter', () => {
        const graph = new SelectableGraph();
        const view = mount(graph);
        act(() => graph.selectFirst());
        fireEvent.change(view.getByLabelText(t('extrapolation_parameter_t')), {target: {value: '1.2'}});
        const [x, y] = evalAt(graph, 1.2);
        fireEvent.click(view.getByRole('button', {name: t('extrapolate')}));
        expect(evalAt(graph, 1)[0]).toBeCloseTo(x, 8);
        expect(evalAt(graph, 1)[1]).toBeCloseTo(y, 8);
        view.unmount();
    });

    test('Apply elevate adds one control point and keeps the curve', () => {
        const graph = new SelectableGraph();
        const view = mount(graph);
        act(() => graph.selectFirst());
        const before = points(graph).length;
        const at = evalAt(graph, 0.37);
        fireEvent.click(view.getByRole('button', {name: t('elevate_degree')}));
        expect(points(graph)).toHaveLength(before + 1);
        expect(evalAt(graph, 0.37)[0]).toBeCloseTo(at[0], 8);
        expect(evalAt(graph, 0.37)[1]).toBeCloseTo(at[1], 8);
        view.unmount();
    });

    test('Apply hides a pressed preview before it runs the operation and clears the pressed state', () => {
        const graph = new SelectableGraph();
        const mounted = mount(graph);
        const curve = graph.getFirstJxgCurve() as unknown as BezierAdapter;
        const order: string[] = [];
        const hide = vi.spyOn(curve, 'hideElevatePoints').mockImplementation(() => {order.push('hide');});
        const elevate = vi.spyOn(curve, 'elevate').mockImplementation(() => {order.push('elevate');});
        const view = render(<CurveOperation curve={curve} tool="elevation" onChanged={() => undefined} onApplied={() => undefined}/>);
        fireEvent.click(view.getByRole('button', {name: t('preview_elevation')}));
        expect(view.getByRole('button', {name: t('preview_elevation')}).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(view.getByRole('button', {name: t('elevate_degree')}));
        expect(order).toEqual(['hide', 'elevate']);
        expect(view.getByRole('button', {name: t('preview_elevation')}).getAttribute('aria-pressed')).toBe('false');
        hide.mockRestore();
        elevate.mockRestore();
        view.unmount();
        mounted.unmount();
    });

    test('unmounting the panel leaves a De Casteljau scheme that was shown from outside', () => {
        const graph = new SelectableGraph();
        const mounted = mount(graph);
        const curve = graph.getFirstJxgCurve() as unknown as BezierAdapter;
        const view = render(<CurveOperation curve={curve} tool="elevation" onChanged={() => undefined}/>);
        act(() => {curve.showCurrentDecasteljauScheme(); });
        expect(curve.isShowingDecasteljauScheme()).toBe(true);
        view.unmount();
        expect(curve.isShowingDecasteljauScheme()).toBe(true);
        mounted.unmount();
    });

    test('collapsing an operation disclosure clears its pressed preview', () => {
        const graph = new SelectableGraph();
        const view = mount(graph);
        act(() => graph.selectFirst());
        fireEvent.click(view.getByRole('button', {name: t('preview_elevation')}));
        const details = view.getByRole('button', {name: t('preview_elevation')}).closest('details') as HTMLDetailsElement;
        details.open = false;
        fireEvent(details, new Event('toggle'));
        details.open = true;
        fireEvent(details, new Event('toggle'));
        expect(view.getByRole('button', {name: t('preview_elevation')}).getAttribute('aria-pressed')).toBe('false');
        view.unmount();
    });

    test('Shorten ends at the adapter subdivision parameter, so a restored subdivisionT sets it', () => {
        const graph = new SelectableGraph();
        const view = mount(graph);
        act(() => graph.selectFirst());
        const curve = graph.getFirstJxgCurve() as unknown as BezierAdapter;
        act(() => {curve.setSubdivisionT(0.4); });
        view.rerender(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        const slider = view.getByLabelText(t('end_parameter_of_the_shortened_curve_t')) as HTMLInputElement;
        expect(Number(slider.value)).toBeCloseTo(0.4, 8);
        const original = evalAt(graph, 0.4 * 0.5);
        fireEvent.click(view.getByRole('button', {name: t('shorten')}));
        expect(evalAt(graph, 0.5)[0]).toBeCloseTo(original[0], 8);
        view.unmount();
    });
});

describe('the operation graphs use the shared operation tool', () => {
    test('the Elevation graph elevates through an UnavailableButton-style Apply', () => {
        for (const graph of [new ElevationGraph(), new RationalElevationGraph()]) {
            const view = mount(graph);
            const before = points(graph).length;
            const button = view.getByRole('button', {name: t('elevate_degree')});
            expect(button.getAttribute('aria-disabled')).toBe('false');
            expect(view.queryByRole('button', {name: t('preview_elevation')})).toBeNull();
            fireEvent.click(button);
            expect(points(graph)).toHaveLength(before + 1);
            view.unmount();
        }
    });

    test('the Extrapolation graph extrapolates to the slider value', () => {
        const graph = new ExtrapolationGraph();
        const view = mount(graph);
        fireEvent.change(view.getByLabelText(t('extrapolation_parameter_t')), {target: {value: '1.3'}});
        expect(graph.getFirstJxgCurve().getExtrapolationT()).toBeCloseTo(1.3);
        const [x, y] = evalAt(graph, 1.3);
        fireEvent.click(view.getByRole('button', {name: t('extrapolate')}));
        expect(evalAt(graph, 1)[0]).toBeCloseTo(x, 8);
        expect(evalAt(graph, 1)[1]).toBeCloseTo(y, 8);
        view.unmount();
    });

    test('the Subdivision graph with a slider subdivides at the slider value', () => {
        const graph = new SubdivisionGraph1();
        const view = mount(graph);
        fireEvent.change(view.getByLabelText(t('subdivision_parameter_t')), {target: {value: '0.25'}});
        const at = evalAt(graph, 0.25);
        fireEvent.click(view.getByRole('button', {name: t('subdivide')}));
        expect(evalAt(graph, 1)[0]).toBeCloseTo(at[0], 8);
        expect(evalAt(graph, 1)[1]).toBeCloseTo(at[1], 8);
        view.unmount();
    });

    test('the repeated Subdivision graph says why Apply is unavailable at its step limit and then does nothing', () => {
        const graph = new SubdivisionGraph();
        const view = mount(graph);
        expect(view.queryByLabelText(t('subdivision_parameter_t'))).toBeNull();
        for (let step = 0; step < MAX_SUBDIVISION_STEPS; step++) {
            act(() => { fireEvent.click(view.getByRole('button', {name: t('subdivide')})); });
        }
        const button = view.getByRole('button', {name: t('subdivide')});
        const reason = t('subdivision_steps_limit', {value0: String(MAX_SUBDIVISION_STEPS)});
        expect(button.getAttribute('aria-disabled')).toBe('true');
        expect(button.getAttribute('title')).toBe(reason);
        const curves = (graph as unknown as {jxgCurves: unknown[]}).jxgCurves.length;
        fireEvent.click(button);
        expect((graph as unknown as {jxgCurves: unknown[]}).jxgCurves).toHaveLength(curves);
        view.unmount();
    });
});
