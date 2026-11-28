import {act, screen, within} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import AlphaParamBezierCurveGraph from './AlphaParamBezierCurveGraph';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage, t} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

function setup() {
    const graph = new AlphaParamBezierCurveGraph();
    const {view} = mountGraph(graph);
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration};
}

const markersOf = (graph: AlphaParamBezierCurveGraph) => (graph as unknown as {sampleMarkers: {X(): number; Y(): number}[]}).sampleMarkers;
const positions = (graph: AlphaParamBezierCurveGraph) => markersOf(graph).map(p => [p.X(), p.Y()]);

describe('weighted-parameterization declares through BaseCurveGraph', () => {
    test('the default: legend with the sample points, α and the count as board pucks, no polygon puck, no values shown', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['param-alpha', 'param-count']);
        expect(current.parameters?.every(parameter => parameter.placement === 'board')).toBe(true);
        expect(current.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'samples']);
        for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect((current.actions ?? []).filter(action => action.puck)).toEqual([]);
        expect(current.readouts ?? []).toEqual([]);
        view.unmount();
    });

    test('α and the count write through the arbiter, the markers follow, bad values are refused with a catalog message', () => {
        const {graph, view} = setup();
        const params = graph.parameters!;
        expect(params.read('param-alpha')).toBe(0.5);
        const even = positions(graph);
        act(() => { params.write('param-alpha', 0.25, 'learner'); });
        expect(graph.state.alpha).toBe(0.25);
        expect(markersOf(graph).length).toBe(10);
        expect(positions(graph)).not.toEqual(even);
        act(() => { params.write('param-count', 3, 'learner'); });
        expect(markersOf(graph).length).toBe(3);
        const bad = params.write('param-alpha', 1.5, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(bad.status === 'refused-domain' ? bad.error.message : '').toBe('Parameter α mora biti število od 0 do 1.');
        for (const count of [2.5, 0, 41]) expect(params.write('param-count', count, 'learner').status, String(count)).toBe('refused-domain');
        view.unmount();
    });

    test('α and the count are pucks and Orodja holds no second copy of them', async () => {
        const {view} = setup();
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="param-alpha"]') !== null);
        await openTools();
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="param-count"]')).not.toBeNull();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        expect(within(root).queryAllByRole('slider', {name: t('parameter_alpha')})).toEqual([]);
        expect(within(root).queryAllByRole('spinbutton', {name: t('number_of_points')})).toEqual([]);
        expect(screen.queryAllByText(t('construction')).filter(heading => root.contains(heading))).toEqual([]);
        view.unmount();
    });
});
