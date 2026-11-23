/**
 * Construction first on both De Casteljau graphs (graph-control first use, decision 2026-11-19): the graph's own commands
 * (Play, parameter, speed) are the first Edit group, before curve selection, and stay first and working while a curve is
 * selected; the selected-curve area follows. An ordinary Bezier graph keeps its structured editing without that group.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import {t} from '../../../localization';
import ElevationGraph from './ElevationGraph';
import BaseCurveGraph from '../../base/BaseCurveGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

type Run = BaseGraph<BaseGraphState> & {
    parameter: number;
    lessonAnimation?: {isRunning(): boolean};
    animation?: {isRunning(): boolean};
    editing: {select(curve: unknown): void};
    jxgCurves: Array<{setAttributes(attributes: object): void}>;
};

/**
 * Every curve graph with commands in this stream's batch opts in, so the control is a test-local subclass of the elevation
 * graph that takes BaseCurveGraph's default instead of its own opt-in, so this test fails if that default turns true.
 */
class WithoutOptIn extends ElevationGraph {
    protected override workspaceConstructionFirst() { return BaseCurveGraph.prototype['workspaceConstructionFirst'].call(this); }
}

async function mountRun(key: 'decasteljau' | 'decasteljau-alternative' | 'bezier' | 'no-opt-in') {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(key === 'no-opt-in' ? new WithoutOptIn() : graphFactories[key]()).graph as Run;
    const frames = (count: number) => {
        for (let i = 0; i < count; i++) {
            const due = pending;
            pending = [];
            time += 100;
            act(() => due.forEach(callback => callback(time)));
        }
    };
    /** The running driver is `lessonAnimation` on decasteljau and `animation` on the alternative. */
    const running = () => (graph.lessonAnimation ?? graph.animation)!.isRunning();
    // De Casteljau's t, Play and Reset are a puck on the board (task 05); the strip appears once the board has laid out.
    if (key === 'decasteljau') await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="decasteljau-t"]') !== null && screen.queryByRole('button', {name: t('play')}) !== null);
    return {graph, frames, running};
}

const play = () => screen.getByRole('button', {name: t('play')});
const parameterSlider = () => screen.getByRole('slider', {name: t('animation_parameter')});
const heading = (text: string) => screen.getByText(text);
const before = (first: Element, second: Element) => expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
// "Konstrukcija" also heads a Graph display group; the Edit group is the card.
const constructionTitle = () => screen.getAllByText(t('construction')).find(element => element.closest('.tools'))!;
const constructionCard = () => constructionTitle().closest('.tools') as HTMLElement;

describe.each(['decasteljau', 'decasteljau-alternative'] as const)('%s construction first', key => {
    test('the construction group is first; Play and the parameter are on the board (a puck) for De Casteljau and first in the group for the alternative', async () => {
        await mountRun(key);
        const card = constructionCard();
        expect(card).toBeTruthy();
        // De Casteljau carries Play, Reset and t on the board as a puck, once and not in Orodja; the alternative keeps them in the group.
        const owned = key === 'decasteljau';
        expect(card.contains(play())).toBe(!owned);
        expect(card.contains(parameterSlider())).toBe(!owned);
        expect(document.querySelector('.puck-strip')?.contains(parameterSlider()) ?? false).toBe(owned);
        expect(document.querySelector('.puck-strip')?.contains(play()) ?? false).toBe(owned);
        // The alternative's only curve is not selectable (DecasteljauGraph2 bindSceneToFirstCurve), so it lists no curve selection.
        const selection = screen.queryByText(t('curve_selection'));
        expect(selection !== null, key).toBe(key === 'decasteljau');
        if (selection) {
            before(constructionTitle(), selection);
            if (!owned) {
                before(play(), selection);
                before(parameterSlider(), selection);
            }
        }
        const edit = card.parentElement!;
        expect(edit.querySelector('.tools')).toBe(card);
        for (const typed of screen.queryAllByRole('spinbutton')) {
            if (!card.contains(typed)) before(card, typed);
        }
    });

    test('Play advances the parameter without a selected curve', async () => {
        const {graph, frames, running} = await mountRun(key);
        expect(screen.queryByText(t('selected_curve_25'))).toBeNull();
        const start = graph.parameter;
        act(() => { fireEvent.click(play()); });
        frames(3);
        expect(running()).toBe(true);
        expect(graph.parameter).toBeGreaterThan(start);
    });

    test('scrubbing the parameter to 0.4 sets it and pauses a running run', async () => {
        const {graph, frames, running} = await mountRun(key);
        act(() => { fireEvent.click(play()); });
        frames(2);
        expect(running()).toBe(true);
        if (key === 'decasteljau') {
            // The t puck: typed entry (double-click), the same write a learner makes.
            act(() => { fireEvent.doubleClick(parameterSlider()); });
            const entry = document.querySelector<HTMLInputElement>('.puck-strip input')!;
            act(() => { fireEvent.change(entry, {target: {value: '0.4'}}); });
            act(() => { fireEvent.keyDown(entry, {key: 'Enter'}); });
        } else act(() => { fireEvent.change(parameterSlider(), {target: {value: '0.4'}}); });
        expect(graph.parameter).toBeCloseTo(0.4, 6);
        expect(running()).toBe(false);
    });

    test.runIf(key === 'decasteljau')('with a curve selected Play and the parameter stay on the board and work; the selected-curve area follows', async () => {
        const {graph, frames, running} = await mountRun(key);
        act(() => { fireEvent.click(play()); });
        frames(2);
        expect(running()).toBe(true);
        graph.jxgCurves[0].setAttributes({allowElevation: true});
        act(() => graph.editing.select(graph.jxgCurves[0]));
        const card = constructionCard();
        // The run is still going, so the play button is named Pause.
        const strip = document.querySelector('.puck-strip')!;
        expect(strip.contains(screen.getByRole('button', {name: t('pause')}))).toBe(true);
        expect(strip.contains(parameterSlider())).toBe(true);
        expect(card.contains(parameterSlider())).toBe(false);
        expect(card.parentElement!.querySelector('.tools')).toBe(card);
        before(constructionTitle(), heading(t('selected_curve_25')));
        const mark = graph.parameter;
        act(() => { fireEvent.click(screen.getByRole('button', {name: t('pause')})); });
        expect(running()).toBe(false);
        expect(strip.contains(play())).toBe(true);
        act(() => { fireEvent.click(play()); });
        frames(3);
        expect(running()).toBe(true);
        expect(graph.parameter).toBeGreaterThan(mark);
    });
});

describe('an ordinary Bezier graph', () => {
    test('has no construction group; selecting a curve shows the point editor and curve operations', async () => {
        const {graph} = await mountRun('bezier');
        expect(screen.queryAllByText(t('construction')).filter(element => element.closest('#inspector-edit'))).toEqual([]);
        act(() => graph.editing.select(graph.jxgCurves[0]));
        expect(screen.queryAllByText(t('construction')).filter(element => element.closest('#inspector-edit'))).toEqual([]);
        expect(screen.getAllByText(t('control_points')).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button').length).toBeGreaterThan(3);
    });
});

describe('a non-structured curve graph with commands but no opt-in', () => {
    test('A graph with commands and no opt-in keeps its commands under the graph-commands heading and swaps them for the selected-curve area', async () => {
        const {graph} = await mountRun('no-opt-in');
        const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
        expect(inEdit(t('graph_commands')).length).toBe(1);
        expect(inEdit(t('construction'))).toEqual([]);
        graph.jxgCurves[0].setAttributes({allowElevation: true});
        act(() => graph.editing.select(graph.jxgCurves[0]));
        expect(inEdit(t('selected_curve_25')).length).toBe(1);
        expect(inEdit(t('graph_commands'))).toEqual([]);
        expect(inEdit(t('construction'))).toEqual([]);
    });
});
