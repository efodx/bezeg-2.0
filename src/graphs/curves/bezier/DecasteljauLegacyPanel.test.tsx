/**
 * The legacy selected-curve panel on De Casteljau (decision 57): Apply of an operation pauses a running run, a preview
 * or an operation parameter does not. The panel renders in the Edit tab (`workspaceEdit` -> `getGraphCommandsArea`)
 * once a curve is selected, because De Casteljau does not use structured editing. Its own curve switches every
 * operation off (`Attributes.bezierDisabled`), so the panel lists none today; the test switches them on to pin the wiring.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {t} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

type Run = BaseGraph<BaseGraphState> & {
    playAnimation(): void;
    lessonAnimation: {isRunning(): boolean};
    editing: {select(curve: unknown): void};
    jxgCurves: Array<{setAttributes(attributes: object): void}>;
};

function startRunWithSelectedCurve(attributes: object) {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(graphFactories.decasteljau()).graph as Run;
    act(() => graph.playAnimation());
    for (let i = 0; i < 3; i++) {
        const due = pending;
        pending = [];
        time += 100;
        act(() => due.forEach(callback => callback(time)));
    }
    expect(graph.lessonAnimation.isRunning()).toBe(true);
    graph.jxgCurves[0].setAttributes(attributes);
    act(() => graph.editing.select(graph.jxgCurves[0]));
    return graph;
}

describe('De Casteljau legacy selected-curve panel', () => {
    test('Apply pauses a running run; Preview does not', () => {
        const graph = startRunWithSelectedCurve({allowElevation: true});
        fireEvent.click(screen.getByRole('button', {name: t('preview_elevation')}));
        expect(graph.lessonAnimation.isRunning()).toBe(true);
        fireEvent.click(screen.getByRole('button', {name: t('elevate_degree')}));
        expect(graph.lessonAnimation.isRunning()).toBe(false);
    });

    test('the operation parameter slider and its preview do not pause the run', () => {
        const graph = startRunWithSelectedCurve({allowSubdivision: true});
        fireEvent.click(screen.getByRole('button', {name: t('preview_subdivision')}));
        fireEvent.change(screen.getAllByRole('slider')[0], {target: {value: '0.3'}});
        expect(graph.lessonAnimation.isRunning()).toBe(true);
    });
});
