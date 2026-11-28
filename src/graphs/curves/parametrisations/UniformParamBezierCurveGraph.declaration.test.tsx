import {act, screen, within} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import UniformParamBezierCurveGraph from './UniformParamBezierCurveGraph';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage, t} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

function setup() {
    const graph = new UniformParamBezierCurveGraph();
    const {view} = mountGraph(graph);
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration};
}

const samplesOf = (graph: UniformParamBezierCurveGraph) => (graph as unknown as {sampleJxgPoints: {X(): number; Y(): number}[]}).sampleJxgPoints;
const arcText = (current: GraphDeclaration) => (current.readouts![0].rows.find(row => row.id === 'arc-length')?.value as {text: string} | undefined)?.text;

describe('uniform-parameterization declares through BasePhBezierCurveGraph', () => {
    test('the default: legend with the sample points, the arc length row, the method and the count as board pucks, no polygon puck', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['param-mode', 'param-count']);
        expect(current.parameters?.every(parameter => parameter.placement === 'board')).toBe(true);
        expect(current.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'samples']);
        for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(arcText(current)).toBe('16,717');
        expect((current.actions ?? []).filter(action => action.puck)).toEqual([]);
        view.unmount();
    });

    test('the arc length row follows a moved generator across states', () => {
        const {graph, declaration, view} = setup();
        const seen = [arcText(declaration())];
        for (let step = 0; step < 4; step++) {
            act(() => runAs('learner', () => {
                const w1 = graph.getFirstCurveAsPHBezierCurve().w[1];
                w1.setY(w1.Y() + 0.7);
                graph.boardUpdate();
            }));
            seen.push(arcText(declaration()));
            expect(checkDeclaration(declaration())).toEqual([]);
        }
        expect(new Set(seen).size).toBe(seen.length);
        view.unmount();
    });

    test('the method and the count write through the arbiter, refuse bad values with a catalog message, and the legend and markers follow', () => {
        const {graph, declaration, view} = setup();
        const params = graph.parameters!;
        expect(params.read('param-mode')).toBe('alpha');
        expect(samplesOf(graph).length).toBe(10);
        const before = samplesOf(graph).map(p => [p.X(), p.Y()]);
        act(() => { params.write('param-mode', 'uniform', 'learner'); });
        expect(graph.state.isAlphaParam).toBe(false);
        expect(params.read('param-mode')).toBe('uniform');
        expect(samplesOf(graph).map(p => [p.X(), p.Y()])).not.toEqual(before);
        act(() => { params.write('param-count', 4, 'learner'); });
        expect(samplesOf(graph).length).toBe(4);
        expect(graph.drawnObject('samples')!.visible).toBe(true);
        for (const bad of [2.5, 0, 41, 'x']) {
            const refused = params.write('param-count', bad, 'learner');
            expect(refused.status, String(bad)).toBe('refused-domain');
        }
        const mode = params.write('param-mode', 'both', 'learner');
        expect(mode.status).toBe('refused-domain');
        expect(mode.status === 'refused-domain' ? mode.error.message : '').toBe('Parametrizacija je lahko utežena ali enakomerna.');
        expect(checkDeclaration(declaration())).toEqual([]);
        view.unmount();
    });

    test('the method and the count are pucks and Orodja keeps the weight α, with no second copy of them', async () => {
        const {view} = setup();
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="param-mode"]') !== null);
        await openTools();
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="param-count"]')).not.toBeNull();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        expect(within(root).queryAllByRole('combobox', {name: t('choose_parametrization')})).toEqual([]);
        expect(within(root).queryAllByRole('spinbutton', {name: t('number_of_points')})).toEqual([]);
        expect(screen.getByRole('slider', {name: t('parameter_alpha')})).toBeDefined();
        view.unmount();
    });
});
