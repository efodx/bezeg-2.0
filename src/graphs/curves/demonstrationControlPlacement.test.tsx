import React from 'react';
import {render, screen} from '@testing-library/react';
import {t} from '../../localization';
import BaseCurveGraph from '../base/BaseCurveGraph';
import DecasteljauGraph from './bezier/DecasteljauGraph';
import SubdivisionGraph1 from './bezier/SubdivisionGraph1';
import SubdivisionGraph from './bezier/SubdivisionGraph';
import FarinPointsCurveGraph from './rational/FarinPointsCurveGraph';
import {BaseSplineCurveGraph} from './spline/BaseSplineCurveGraph';

/** Display-only groups of curve graphs: the base curve display is stubbed so only the graph's own options render. */
beforeEach(() => {
    vi.spyOn(BaseCurveGraph.prototype as any, 'workspaceGraphDisplay').mockReturnValue(null);
});
afterEach(() => {
    vi.restoreAllMocks();
});

function makeGraph(proto: object, state: Record<string, unknown>, extra: Record<string, unknown> = {}) {
    const graph = Object.create(proto) as any;
    graph.store.replaceState({initialized: true, ...state});
    Object.assign(graph, extra);
    return graph;
}

const displayOf = (graph: any) => render(<>{graph.workspaceGraphDisplay()}</>);
/** Labels of the Edit commands that are switches or sliders (elements with a label or customText prop). */
const commandProps = (graph: any): Record<string, unknown>[] => (graph.getGraphCommands() as React.ReactElement<Record<string, unknown>>[])
    .map(element => element.props);

describe('De Casteljau graphs', () => {
    test('the full-curve switch lives in Display and not in Edit', () => {
        const graph = makeGraph(DecasteljauGraph.prototype, {wholeCurve: true, animationStatus: 'ready', t: 0.5, v: 1});
        displayOf(graph);
        expect(screen.getByRole('checkbox', {name: t('full_curve')})).toBeChecked();
        expect(commandProps(graph).some(props => props.label === t('full_curve'))).toBe(false);
    });

    test('the playback controls stay in Edit with the shared playback class', () => {
        const graph = makeGraph(DecasteljauGraph.prototype, {wholeCurve: false, animationStatus: 'ready', t: 0.5, v: 1});
        const commands = graph.getGraphCommands() as React.ReactElement<{parameter?: number}>[];
        expect(commands).toHaveLength(1);
        expect(commands[0].props.parameter).toBe(0.5);
    });
});

describe('Subdivision graphs', () => {
    test('the subdivision parameter is named, not shown as an embedded value', () => {
        const graph = makeGraph(SubdivisionGraph1.prototype, {t: 0.37, v: 1});
        graph.getFirstJxgCurve = () => ({isShowingDecasteljauScheme: () => false});
        const sliders = commandProps(graph).filter(props => 'customText' in props);
        expect(sliders).toHaveLength(1);
        expect(sliders[0].customText).toBe(t('subdivision_parameter_t'));
    });

    test('the scheme switch lives in Display and not in Edit', () => {
        const graph = makeGraph(SubdivisionGraph1.prototype, {t: 0.5, v: 1, showDecasteljau: true});
        graph.getFirstJxgCurve = () => ({isShowingDecasteljauScheme: () => false});
        displayOf(graph);
        expect(screen.getByRole('checkbox', {name: t('show_scheme')})).toBeChecked();
        expect(commandProps(graph).some(props => props.label === t('show_scheme'))).toBe(false);
    });

    test('control polygons are in Display; the scheme switch appears only with a selected curve', () => {
        const graph = makeGraph(SubdivisionGraph.prototype, {});
        graph.getFirstJxgCurve = () => ({isShowingControlPolygon: () => true});
        graph.getSelectedCurve = () => undefined;
        displayOf(graph);
        expect(screen.getByRole('checkbox', {name: t('control_polygons')})).toBeChecked();
        expect(screen.queryByRole('checkbox', {name: t('de_casteljau_scheme')})).toBeNull();
        expect(screen.getByText(t('select_curve_for_scheme'))).toBeInTheDocument();
        // Edit keeps only the subdivide action.
        expect(graph.getGraphCommands()).toHaveLength(1);
    });

    test('the scheme switch reads the selected curve in Display', () => {
        const graph = makeGraph(SubdivisionGraph.prototype, {});
        graph.getFirstJxgCurve = () => ({isShowingControlPolygon: () => false});
        graph.getSelectedCurve = () => ({isShowingDecasteljauScheme: () => true});
        displayOf(graph);
        expect(screen.getByRole('checkbox', {name: t('de_casteljau_scheme')})).toBeChecked();
        expect(screen.getByRole('checkbox', {name: t('control_polygons')})).not.toBeChecked();
    });

    test('the selected-curve commands no longer carry the scheme switch', () => {
        expect(Object.prototype.hasOwnProperty.call(SubdivisionGraph.prototype, 'getSelectedCurveCommands')).toBe(false);
    });
});

describe('Rational Farin graph', () => {
    test('farin points and weights are in Display; standard form stays in Edit', () => {
        const graph = makeGraph(FarinPointsCurveGraph.prototype, {});
        graph.getFirstJxgCurve = () => ({
            isShowingFarinPoints: () => false, isShowingWeights: () => true, inStandardForm: () => true,
        });
        displayOf(graph);
        expect(screen.getByRole('checkbox', {name: t('farin_points')})).not.toBeChecked();
        expect(screen.getByRole('checkbox', {name: t('weights')})).toBeChecked();

        const editLabels = commandProps(graph).map(props => props.label);
        expect(editLabels).toContain(t('standard_form'));
        expect(editLabels).not.toContain(t('farin_points'));
        expect(editLabels).not.toContain(t('weights'));
    });
});

describe('Spline graphs', () => {
    test('point labels and hidden fixed points are in Display', () => {
        const graph = makeGraph(BaseSplineCurveGraph.prototype, {});
        graph.getFirstJxgCurve = () => ({getLabelAll: () => true, getHideFixed: () => false});
        displayOf(graph);
        expect(screen.getByRole('checkbox', {name: t('label_all_points')})).toBeChecked();
        expect(screen.getByRole('checkbox', {name: t('hide_fixed_points')})).not.toBeChecked();
        expect(graph.getGraphCommands()).toEqual([]);
    });
});
