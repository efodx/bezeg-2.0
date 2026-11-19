/**
 * Construction first on both De Casteljau graphs (graph-control first use, decision 2026-11-19): the graph's own commands
 * (Play, parameter, speed) are the first Edit group, before curve selection, and stay first and working while a curve is
 * selected; the selected-curve area follows. An ordinary Bezier graph keeps its structured editing without that group.
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
    parameter: number;
    lessonAnimation?: {isRunning(): boolean};
    animation?: {isRunning(): boolean};
    editing: {select(curve: unknown): void};
    jxgCurves: Array<{setAttributes(attributes: object): void}>;
};

function mountRun(key: 'decasteljau' | 'decasteljau-alternative' | 'bezier' | 'elevation') {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(graphFactories[key]()).graph as Run;
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
    test('the first Edit group is the construction group with Play and the parameter, before curve selection and typed fields', () => {
        mountRun(key);
        const card = constructionCard();
        expect(card).toBeTruthy();
        expect(card.contains(play())).toBe(true);
        expect(card.contains(parameterSlider())).toBe(true);
        // The alternative's only curve is not selectable (DecasteljauGraph2 bindSceneToFirstCurve), so it lists no curve selection.
        const selection = screen.queryByText(t('curve_selection'));
        expect(selection !== null, key).toBe(key === 'decasteljau');
        if (selection) {
            before(constructionTitle(), selection);
            before(play(), selection);
            before(parameterSlider(), selection);
        }
        const edit = card.parentElement!;
        expect(edit.querySelector('.tools')).toBe(card);
        for (const typed of screen.queryAllByRole('spinbutton')) {
            if (!card.contains(typed)) before(card, typed);
        }
    });

    test('Play advances the parameter without a selected curve', () => {
        const {graph, frames, running} = mountRun(key);
        expect(graph.state.curveSelected).toBeFalsy();
        const start = graph.parameter;
        act(() => { fireEvent.click(play()); });
        frames(3);
        expect(running()).toBe(true);
        expect(graph.parameter).toBeGreaterThan(start);
    });

    test('scrubbing the parameter to 0.4 sets it and pauses a running run', () => {
        const {graph, frames, running} = mountRun(key);
        act(() => { fireEvent.click(play()); });
        frames(2);
        expect(running()).toBe(true);
        act(() => { fireEvent.change(parameterSlider(), {target: {value: '0.4'}}); });
        expect(graph.parameter).toBeCloseTo(0.4, 6);
        expect(running()).toBe(false);
    });

    test.runIf(key === 'decasteljau')('with a curve selected Play and the parameter stay first and work; the selected-curve area follows', () => {
        const {graph, frames, running} = mountRun(key);
        act(() => { fireEvent.click(play()); });
        frames(2);
        expect(running()).toBe(true);
        graph.jxgCurves[0].setAttributes({allowElevation: true});
        act(() => graph.editing.select(graph.jxgCurves[0]));
        const card = constructionCard();
        // The run is still going, so the play button is named Pause.
        expect(card.contains(screen.getByRole('button', {name: t('pause')}))).toBe(true);
        expect(card.contains(parameterSlider())).toBe(true);
        expect(card.parentElement!.querySelector('.tools')).toBe(card);
        before(constructionTitle(), heading(t('selected_curve_25')));
        before(parameterSlider(), heading(t('selected_curve_25')));
        const mark = graph.parameter;
        act(() => { fireEvent.click(screen.getByRole('button', {name: t('pause')})); });
        expect(running()).toBe(false);
        expect(card.contains(play())).toBe(true);
        act(() => { fireEvent.click(play()); });
        frames(3);
        expect(running()).toBe(true);
        expect(graph.parameter).toBeGreaterThan(mark);
    });
});

describe('an ordinary Bezier graph', () => {
    test('has no construction group; selecting a curve shows the point editor and curve operations', () => {
        const {graph} = mountRun('bezier');
        expect(screen.queryAllByText(t('construction')).filter(element => element.closest('.tools'))).toEqual([]);
        act(() => graph.editing.select(graph.jxgCurves[0]));
        expect(screen.queryAllByText(t('construction')).filter(element => element.closest('.tools'))).toEqual([]);
        expect(screen.getAllByText(t('control_points')).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button').length).toBeGreaterThan(3);
    });
});

describe('a non-structured curve graph with commands but no opt-in', () => {
    test('Elevation keeps its commands under the graph-commands heading and swaps them for the selected-curve area', () => {
        const {graph} = mountRun('elevation');
        const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('.tools'));
        expect(inEdit(t('graph_commands')).length).toBe(1);
        expect(inEdit(t('construction'))).toEqual([]);
        graph.jxgCurves[0].setAttributes({allowElevation: true});
        act(() => graph.editing.select(graph.jxgCurves[0]));
        expect(inEdit(t('selected_curve_25')).length).toBe(1);
        expect(inEdit(t('graph_commands'))).toEqual([]);
        expect(inEdit(t('construction'))).toEqual([]);
    });
});
