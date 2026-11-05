import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BezierHullsGraph} from './BezierHullsGraph';
import {BEZIER_HULLS_PRESET_KEY} from './bezierHullsPresetCollection';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const mount = (graph: BezierHullsGraph) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const model = (points: Array<[number, number]>, gridStepExponent = 0): PointSetModel =>
    ({mode: 'points', closed: false, gridStepExponent, points: points.map(([x, y]) => ({x, y}))});
/** The offset pair in half grid steps: the run ends after depth 1 with no pair left. */
const OFFSET = model([[0, 0], [4, 8], [8, 0], [0, 9], [4, 1], [8, 9]], -1);
const load = (graph: BezierHullsGraph, next: PointSetModel) => act(() => { graph.loadModel(next); });
const click = (action: string) => act(() => { fireEvent.click(document.querySelector(`button[data-action="${action}"]`)!); });
const lines = () => [...document.querySelectorAll('[data-bezier-hulls="readout"] p')].map(p => p.textContent);
const readout = () => document.querySelector('[data-bezier-hulls="readout"]')!;
/** A saved graph state with fields beyond the base type, like a file that was read. */
const saveState = (fields: object) => ({initialized: true, ...fields});
const nextTo = (target: number, graph: BezierHullsGraph) => { while (graph.step < target) click('next-step'); };

test('the readout is a status region outside the board with one line per item, at a verdict, a split and the depth 4 end (Slovenian)', () => {
    const graph = new BezierHullsGraph();
    mount(graph);
    expect(readout().getAttribute('role')).toBe('status');
    expect(readout().closest('.jxgbox, [data-board]')).toBeNull();
    expect(lines()).toEqual(['Korak 1 od 9', 'Globina subdivizije: 0 od 4', 'Ostane parov odsekov: 1 od 1', 'Preizkušenih parov: 1, zavrženih: 0']);
    click('next-step');
    expect(lines()).toEqual(['Korak 2 od 9', 'Globina subdivizije: 1 od 4', 'Pari odsekov za preizkus: 4. Odločitve še ni: ovojnice so šele na vrsti.']);
    nextTo(6, graph);
    expect(lines().slice(1)).toEqual(['Globina subdivizije: 3 od 4', 'Ostane parov odsekov: 8 od 64', 'Preizkušenih parov: 32, zavrženih: 24']);
    nextTo(8, graph);
    expect(lines().slice(1, 3)).toEqual(['Globina subdivizije: 4 od 4', 'Ostane parov odsekov: 8 od 256']);
    expect(lines()[4]).toContain('se lahko sekajo ali pa tudi ne');
    expect(lines().join(' ')).not.toMatch(/natančn|noben par/i);
});

test('the empty end says the curves do not meet, certified with a safety margin; the depth 4 line is absent', () => {
    const graph = new BezierHullsGraph();
    mount(graph);
    load(graph, OFFSET);
    nextTo(2, graph);
    expect(lines().slice(1)).toEqual([
        'Globina subdivizije: 1 od 4', 'Ostane parov odsekov: 0 od 4', 'Preizkušenih parov: 4, zavrženih: 4',
        'Noben par ne ostane: krivulji se ne sekata. Ločenost ovojnic je potrjena z varnostno rezervo.',
    ]);
    expect(document.querySelector('[data-bezier-hulls="remaining"]')).toBeNull();
});

test('the readout follows a language switch, a model change and a scene change', async () => {
    const graph = new BezierHullsGraph();
    mount(graph);
    nextTo(2, graph);
    act(() => { setLanguage('en'); });
    expect(lines()[0]).toBe('Step 3 of 9');
    expect(lines()[1]).toBe('Subdivision depth: 1 of 4');
    expect(lines()[2]).toMatch(/^Piece pairs that remain: \d+ of 4$/);
    expect(lines()[3]).toMatch(/^Pairs tested: 4, discarded: \d+$/);
    // an edit returns to step 0
    load(graph, OFFSET);
    expect(lines()).toEqual(['Step 1 of 3', 'Subdivision depth: 0 of 4', 'Piece pairs that remain: 1 of 1', 'Pairs tested: 1, discarded: 0']);
    nextTo(2, graph);
    expect(lines()[4]).toBe('No pair remains: the curves do not meet. The hulls are certified apart with a safety margin.');
    // a scene change (a saved Preset of the crossing pair) shows its saved step
    load(graph, CURVE_PAIR_CROSSING);
    nextTo(8, graph);
    act(() => { graph.saveCurrentPreset('mine'); });
    load(graph, OFFSET);
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.selectPreset('mine'); });
    await act(async () => { await pending; });
    expect(lines()[0]).toBe('Step 9 of 9');
    expect(lines()[4]).toContain('may or may not meet');
});

test('the buttons stay focusable at the end (aria-disabled), Reset returns to step 1 and Play flips to Pause', () => {
    const graph = new BezierHullsGraph();
    mount(graph);
    nextTo(8, graph);
    const next = document.querySelector('button[data-action="next-step"]')!;
    expect([next.getAttribute('aria-disabled'), next.hasAttribute('disabled')]).toEqual(['true', false]);
    click('next-step');
    expect(graph.step).toBe(8);
    click('reset');
    expect(lines()[0]).toBe('Korak 1 od 9');
    click('play-pause');
    expect(document.querySelector('button[data-action="play-pause"]')!.textContent).toBe('Premor');
    expect(readout().getAttribute('aria-live')).toBe('off');
    click('play-pause');
    expect(readout().getAttribute('aria-live')).toBe('polite');
});

test('a Preset round trip keeps the model (including the half grid) and the step; a stale step clamps', async () => {
    const graph = new BezierHullsGraph();
    mount(graph);
    load(graph, {...CURVE_PAIR_CROSSING, gridStepExponent: -1});
    nextTo(5, graph);
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(BEZIER_HULLS_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 5});
    expect(saved.graphState).not.toHaveProperty('playing');
    load(graph, OFFSET);
    expect(graph.step).toBe(0);
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.selectPreset('mine'); });
    await act(async () => { await pending; });
    expect([graph.step, graph.model.gridStepExponent, graph.model.points]).toEqual([5, -1, CURVE_PAIR_CROSSING.points]);
    expect(graph.isPlaying).toBe(false);

    act(() => { graph.importPreset({id: BEZIER_HULLS_PRESET_KEY, graphState: saveState({step: 999999}), data: OFFSET}); });
    expect(graph.step).toBe(2);
    expect(graph.exportPreset().graphState).toMatchObject({step: 2});
    act(() => { graph.importPreset({id: BEZIER_HULLS_PRESET_KEY, graphState: saveState({step: 0}), data: CURVE_PAIR_CROSSING}); });
    expect(graph.step).toBe(0);
});
