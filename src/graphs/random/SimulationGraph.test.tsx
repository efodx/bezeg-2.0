import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {DEFAULT_RANDOM_STATE, nextStop, RANDOM_MODES, type RandomMode} from '../../random/randomModel';
import {PATHS_DRAWN, POINTS_DRAWN} from './simulationScene';
import {PLAYBACK_STEP_MS, SimulationGraph} from './SimulationGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    requests = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; this.requests++; return ++this.handle; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

/** Exposes the board and the disposal the scene replacement calls, with a fake clock and a switchable reduced-motion setting. */
class ObservedGraph extends SimulationGraph {
    clock = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return this.reduced; }
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const button = (label: string) => screen.getByRole('button', {name: label});
const press = (label: string) => act(() => { fireEvent.click(button(label)); });
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const chooseMode = (mode: RandomMode) => act(() => { fireEvent.change(field(t('random_graph_mode_label')), {target: {value: mode}}); });
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const HELP_ID = 'random-graph-input-help';

type Probe = {id: string; elType: string; dataX?: number[]; dataY?: number[]; plaintext?: string; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const curves = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve');
/** The graph's own captions: every text on the board except the origin label the board itself carries. */
const captions = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'text' && o.plaintext !== '0,0').map(o => o.plaintext ?? '');
/** The drawing as comparable data: the point arrays of every curve, sorted by length then content. */
const drawing = (graph: ObservedGraph) => curves(graph).map(o => JSON.stringify([o.dataX ?? [], o.dataY ?? []])).sort();

type FieldKey = 'random_graph_seed_label' | 'random_graph_n_galton' | 'random_graph_rows_label' | 'random_graph_p_label' | 'random_graph_n_frequency'
    | 'random_graph_n_area' | 'random_graph_n_walk' | 'random_graph_steps_label' | 'random_graph_n_markov' | 'random_graph_a_label'
    | 'random_graph_b_label' | 'random_graph_n_interval' | 'random_graph_sample_label';
const FIELDS: Readonly<Record<RandomMode, readonly FieldKey[]>> = {
    galton: ['random_graph_seed_label', 'random_graph_n_galton', 'random_graph_rows_label', 'random_graph_p_label'],
    frequency: ['random_graph_seed_label', 'random_graph_n_frequency'],
    area: ['random_graph_seed_label', 'random_graph_n_area'],
    walk: ['random_graph_seed_label', 'random_graph_n_walk', 'random_graph_steps_label'],
    markov: ['random_graph_seed_label', 'random_graph_n_markov', 'random_graph_a_label', 'random_graph_b_label'],
    interval: ['random_graph_seed_label', 'random_graph_n_interval', 'random_graph_sample_label'],
};

describe('mount and the drawing of each mode', () => {
    test('the default is the Galton board of the spec: 1000 balls, seed 42, all shown, counts sum to n, nothing is NaN', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({mode: 'galton', n: 1000, shown: 1000, seed: 42, rows: 10});
        const counts = readout('counts')!.split('; ').map(Number);
        expect(counts).toHaveLength(11);
        expect(counts.reduce((a, b) => a + b, 0)).toBe(1000);
        expect(readout('seed')).toBe('42');
        expect(document.querySelector(`[aria-label="${t('random_graph_board_label')}"]`)).not.toBeNull();
        // Nothing to drag: the graph owns only curves and captions, the numbers are the controls.
        expect(graph.ownedObjectCount()).toBe(curves(graph).length + captions(graph).length);
        noBadText();
    });

    test.each([...RANDOM_MODES])('%s: one board curve per scene layer, each holds the scene data, one text per caption, named by the catalog', mode => {
        const {graph} = mountGraph();
        chooseMode(mode);
        const scene = graph.view().scene;
        const drawn = curves(graph);
        expect(drawn).toHaveLength(Object.keys(scene.layers).length);
        act(() => { graph.liveBoard().update(); });
        const expected = Object.values(scene.layers).map(l => JSON.stringify([Array.from(l.x), Array.from(l.y)])).sort();
        // NaN serialises as null on both sides, so equal strings mean equal data.
        expect(drawing(graph)).toEqual(expected);
        const texts = captions(graph);
        expect(texts).toHaveLength(scene.captions.length);
        expect(texts.every(text => text.length > 0 && !/random_graph|undefined|NaN/.test(text))).toBe(true);
        expect(document.querySelector('[data-random-status]')!.textContent!.length).toBeGreaterThan(0);
        noBadText();
    });

    test('Galton names its three captions, the ball count is the 10 drawn paths', () => {
        const {graph} = mountGraph();
        expect(captions(graph)).toEqual([t('random_graph_cap_heap'), t('random_graph_cap_bars'), t('random_graph_cap_path', {value0: PATHS_DRAWN})]);
    });

    test('area draws 300 points of 10000 and reads the estimate from all of them', () => {
        const {graph} = mountGraph();
        chooseMode('area');
        expect(captions(graph)).toContain(t('random_graph_cap_points', {value0: POINTS_DRAWN}));
        const inside = Number(readout('inside')!.split(' ')[0]);
        expect(Number(readout('estimate')!.replace(',', '.'))).toBeCloseTo((4 * inside) / 10000, 4);
    });

    test('Markov with 0 % and 0 % says why there is no stationary distribution; walk with an odd step count says no walk returns', () => {
        const {graph} = mountGraph();
        chooseMode('markov');
        enter(t('random_graph_a_label'), '0');
        enter(t('random_graph_b_label'), '0');
        expect(graph.state).toMatchObject({markovA: 0, markovB: 0});
        expect(document.body.textContent).toContain(t('random_graph_r_note_identity'));
        chooseMode('walk');
        enter(t('random_graph_steps_label'), '7');
        expect(readout('zeros')).toContain('lihem');
        noBadText();
    });

    test('the Markov share spread is labelled approximate', () => {
        mountGraph();
        chooseMode('markov');
        expect(t('random_graph_r_share_sd')).toContain('približno');
        setLanguage('en');
        expect(t('random_graph_r_share_sd')).toContain('approximately');
    });
});

describe('same seed, same drawing', () => {
    test('two mounts with one seed draw the same; another seed draws another', () => {
        const first = mountGraph();
        const a = drawing(first.graph);
        first.view.unmount();
        const second = mountGraph();
        expect(drawing(second.graph)).toEqual(a);
        enter(t('random_graph_seed_label'), '43');
        expect(second.graph.state.seed).toBe(43);
        expect(drawing(second.graph)).not.toEqual(a);
        enter(t('random_graph_seed_label'), '42');
        expect(drawing(second.graph)).toEqual(a);
    });

    test('the view is cached on the state object and recomputed for a new one', () => {
        const {graph} = mountGraph();
        const view = graph.view();
        expect(graph.view()).toBe(view);
        act(() => { graph.setState({shown: 500}); });
        expect(graph.view()).not.toBe(view);
        expect(graph.view().exact).toBe(view.exact); // the exact part depends on the parameters only
    });
});

describe('invalid input', () => {
    test.each(['1000000', '-1', '4,5', 'abc'])('seed %s is refused with a message, the state and the drawing stay', value => {
        const {graph} = mountGraph();
        const before = drawing(graph);
        enter(t('random_graph_seed_label'), value);
        expect(graph.state.seed).toBe(42);
        expect(field(t('random_graph_seed_label')).getAttribute('aria-invalid')).toBe('true');
        expect(document.querySelector('.number-input-hint')?.textContent?.length).toBeGreaterThan(0);
        expect(drawing(graph)).toEqual(before);
    });

    test('the edit paths refuse out-of-range, fractional and NaN values themselves, with no state change and no playback change', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        expect(graph.editSeed(1000000)).toBe(false);
        expect(graph.editSeed(Number.NaN)).toBe(false);
        expect(graph.editSeed(1.5)).toBe(false);
        expect(graph.editTrials(0)).toBe(false);
        expect(graph.editRows(13)).toBe(false);
        expect(graph.editPercent(100)).toBe(false);
        expect(graph.editSeed(7)).toBe(true);
        expect(graph.state).toEqual({...before, seed: 7});
    });

    test('a count above the mode limit is refused; off-grid percent rounds to the grid', () => {
        const {graph} = mountGraph();
        enter(t('random_graph_n_galton'), '100001');
        expect(graph.state.n).toBe(1000);
        enter(t('random_graph_p_label'), '37');
        expect(graph.state.pPercent).toBe(35);
        enter(t('random_graph_p_label'), '97');
        expect(graph.state.pPercent).toBe(35);
        noBadText();
    });
});

describe('numeric fields, help and keyboard', () => {
    test('every numeric field of every mode follows its input and is described by the mode help, which states the ranges', () => {
        const {graph} = mountGraph();
        const entries: Readonly<Record<FieldKey, [string, (s: typeof graph.state) => unknown, unknown]>> = {
            random_graph_seed_label: ['77', s => s.seed, 77],
            random_graph_n_galton: ['300', s => s.n, 300],
            random_graph_rows_label: ['6', s => s.rows, 6],
            random_graph_p_label: ['35', s => s.pPercent, 35],
            random_graph_n_frequency: ['200', s => s.n, 200],
            random_graph_n_area: ['400', s => s.n, 400],
            random_graph_n_walk: ['30', s => s.n, 30],
            random_graph_steps_label: ['20', s => s.walkSteps, 20],
            random_graph_n_markov: ['500', s => s.n, 500],
            random_graph_a_label: ['45', s => s.markovA, 45],
            random_graph_b_label: ['15', s => s.markovB, 15],
            random_graph_n_interval: ['50', s => s.n, 50],
            random_graph_sample_label: ['25', s => s.sampleSize, 25],
        };
        for (const mode of RANDOM_MODES) {
            chooseMode(mode);
            const help = document.getElementById(HELP_ID)!;
            expect(help.textContent).toMatch(/^Seme 0 do 999/);
            const labels = [...document.querySelectorAll<HTMLInputElement>('input[role="spinbutton"]')].map(input => input.labels?.[0]?.textContent);
            expect(labels, mode).toEqual(expect.arrayContaining(FIELDS[mode].map(key => t(key))));
            expect(labels.filter(label => label?.startsWith(t('random_graph_seed_label'))), mode).toHaveLength(1);
            for (const key of FIELDS[mode]) {
                const input = field(t(key));
                expect(input.getAttribute('aria-describedby') ?? '', key).toContain(HELP_ID);
                const [typed, read, expected] = entries[key];
                enter(t(key), typed);
                expect(read(graph.state), `${mode} ${key}`).toBe(expected);
            }
            expect(graph.state.mode).toBe(mode);
        }
        expect(document.getElementById(HELP_ID)!.textContent).toContain('16');
        // The Markov start state is a choice, not a number.
        chooseMode('markov');
        act(() => { fireEvent.change(field(t('random_graph_start_label')), {target: {value: '1'}}); });
        expect(graph.state.markovStart).toBe(1);
    });

    test('arrows step the seed by 1 and Shift+arrow by 100, Enter commits; Escape restores', () => {
        const {graph} = mountGraph();
        const seed = field(t('random_graph_seed_label'));
        act(() => { fireEvent.keyDown(seed, {key: 'ArrowUp'}); });
        expect(graph.state.seed).toBe(43);
        act(() => { fireEvent.keyDown(seed, {key: 'ArrowUp', shiftKey: true}); });
        expect(graph.state.seed).toBe(143);
        act(() => { fireEvent.keyDown(seed, {key: 'ArrowDown'}); });
        expect(graph.state.seed).toBe(142);
        act(() => { fireEvent.input(seed, {target: {value: '9'}, inputType: 'insertText'}); fireEvent.keyDown(seed, {key: 'Escape'}); });
        expect(seed.value).toBe('142');
    });

    test('editing the count shows the whole run', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({shown: 10}); });
        enter(t('random_graph_n_galton'), '200');
        expect(graph.state).toMatchObject({n: 200, shown: 200});
    });
});

describe('playback', () => {
    test('Play at the end restarts at 0 and visits the stops 1, 2, 5, 10 on the clock; Pause keeps the position', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        expect(graph.state.shown).toBe(0);
        const seen: number[] = [];
        let time = 0;
        for (const expected of [1, 2, 5, 10]) {
            graph.clock.tick(time);
            time += PLAYBACK_STEP_MS;
            seen.push(graph.state.shown);
            expect(graph.state.shown).toBe(expected);
        }
        expect(seen).toEqual([1, 2, 5, 10]);
        expect(readout('shown')).toBe(t('random_graph_r_shown_value', {value0: 10, value1: 1000}));
        press(t('pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.state.shown).toBe(10);
        graph.clock.tick(5000);
        expect(graph.state.shown).toBe(10);
    });

    test('a frame sooner than the step interval changes nothing', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.clock.tick(0);
        expect(graph.state.shown).toBe(1);
        graph.clock.tick(PLAYBACK_STEP_MS - 1);
        expect(graph.state.shown).toBe(1);
        graph.clock.tick(PLAYBACK_STEP_MS);
        expect(graph.state.shown).toBe(2);
    });

    test('the last stop pauses on its own, then Play starts over', () => {
        const {graph} = mountGraph();
        enter(t('random_graph_n_galton'), '3');
        press(t('play'));
        let time = 0;
        for (let i = 0; i < 3; i++) { graph.clock.tick(time); time += PLAYBACK_STEP_MS; }
        expect(graph.state.shown).toBe(3);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        expect(graph.state.shown).toBe(0);
        expect(graph.isPlaying()).toBe(true);
    });

    test('Next step moves to the next stop, Replay shows nothing, both pause', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({shown: 10}); });
        press(t('next_step'));
        expect(graph.state.shown).toBe(nextStop(10, 1000));
        expect(graph.state.shown).toBe(20);
        press(t('replay'));
        expect(graph.state.shown).toBe(0);
        expect(readout('shown')).toBe(t('random_graph_r_shown_value', {value0: 0, value1: 1000}));
        noBadText();
        press(t('play'));
        // While playing, Next step is blocked and says why; the run is not moved by it.
        expect(button(t('next_step')).getAttribute('aria-disabled')).toBe('true');
        graph.stepOnce();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.state.shown).toBe(1);
    });

    test.each([
        ['seed', () => enter(t('random_graph_seed_label'), '5')],
        ['count', () => enter(t('random_graph_n_galton'), '500')],
        ['rows', () => enter(t('random_graph_rows_label'), '5')],
        ['probability', () => enter(t('random_graph_p_label'), '30')],
        ['mode', () => chooseMode('walk')],
    ])('an edit of the %s pauses the playback first', (_name, edit) => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.clock.tick(0);
        expect(graph.isPlaying()).toBe(true);
        edit();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('reduced motion: Play shows the whole run at once and starts no animation', () => {
        const {graph} = mountGraph();
        graph.reduced = true;
        act(() => { graph.setState({shown: 5}); });
        press(t('play'));
        expect(graph.state.shown).toBe(1000);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.requests).toBe(0);
    });

    test('each step redraws: the heap grows with the shown trials', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({shown: 0}); });
        expect(Number(readout('counts')!.split('; ').reduce((a, b) => a + Number(b), 0))).toBe(0);
        act(() => { graph.setState({shown: 50}); });
        expect(readout('counts')!.split('; ').reduce((a, b) => a + Number(b), 0)).toBe(50);
    });
});

describe('ownership', () => {
    test('mount, state change, mode change and dispose: the board returns to what it was before the scene', () => {
        const {graph, view} = mountGraph();
        // The axis tick labels come and go with the frame; they belong to the board, not to the scene.
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const owned = graph.ownedObjectCount();
        const base = count() - owned;
        const before = new Set(probes(graph).map(o => o.id));
        const sceneCurves = curves(graph).map(o => o.id);
        act(() => { graph.setState({shown: 100}); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(count()).toBe(base + owned); // a state change does not rebuild
        expect(new Set(probes(graph).map(o => o.id))).toEqual(before);

        chooseMode('area'); // a real rebuild: the old curves are gone, new ones stand
        const after = new Set(probes(graph).map(o => o.id));
        expect(count()).toBe(base + graph.ownedObjectCount());
        expect(sceneCurves.filter(id => after.has(id))).toEqual([]);
        expect(curves(graph)).toHaveLength(7);
        for (const mode of RANDOM_MODES) {
            chooseMode(mode);
            expect(count()).toBe(base + graph.ownedObjectCount());
        }
        chooseMode('galton');
        expect(graph.ownedObjectCount()).toBe(owned);

        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(count()).toBe(base);
        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
    });

    test('unmount while playing cancels the frame loop, removes the board label and the language listener', () => {
        const {graph, view} = mountGraph();
        press(t('play'));
        expect(graph.clock.pending()).toBe(true);
        view.unmount();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('random_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('disposing the scene while playing stops the driver', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.disposeNow();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
    });

    test('StrictMode mounts, unmounts and mounts again with the same number of objects as a plain mount', () => {
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });
});

describe('language', () => {
    test('switching the language renames the board, the labels, the captions and the status', () => {
        const {graph} = mountGraph();
        const slCaptions = captions(graph);
        act(() => { setLanguage('en'); });
        expect(document.querySelector(`[aria-label="${t('random_graph_board_label')}"]`)).not.toBeNull();
        expect(t('random_graph_board_label')).toMatch(/Random experiments/);
        expect(screen.getByLabelText(t('random_graph_seed_label'))).toBeTruthy();
        expect(captions(graph)[0]).toBe(t('random_graph_cap_heap'));
        expect(captions(graph)).not.toEqual(slCaptions);
        expect(document.querySelector('[data-random-status]')!.textContent).toMatch(/^Balls /);
        expect(document.getElementById(HELP_ID)!.textContent).toMatch(/^Seed 0 to 999/);
        expect(graph.state).toMatchObject({seed: DEFAULT_RANDOM_STATE.seed});
    });
});

describe('overlay, second seed, shape and the time between stops', () => {
    const slider = () => screen.getByRole('slider') as HTMLInputElement;
    const overlaySwitch = () => screen.getByRole('checkbox', {name: t('random_graph_overlay_label')}) as HTMLInputElement;
    const turnOverlay = () => act(() => { fireEvent.click(overlaySwitch()); });
    const layerY = (graph: ObservedGraph, name: string) => JSON.stringify(Array.from(graph.view().scene.layers[name].y));

    test('the overlay switch and the second seed exist in the overlay modes only, both linked to the help', () => {
        mountGraph();
        for (const mode of RANDOM_MODES) {
            chooseMode(mode);
            const offered = ['galton', 'frequency', 'walk', 'markov'].includes(mode);
            expect(screen.queryAllByLabelText(t('random_graph_overlay_label')).length > 0, mode).toBe(offered);
            expect(screen.queryAllByLabelText(t('random_graph_seed2_label')).length > 0, mode).toBe(offered);
            if (!offered) continue;
            expect(overlaySwitch().getAttribute('aria-describedby') ?? '', mode).toContain(HELP_ID);
            expect(field(t('random_graph_seed2_label')).getAttribute('aria-describedby') ?? '', mode).toContain(HELP_ID);
        }
    });

    test('the switch draws the second seed dotted with its two captions and a readout row; turning it off removes them', () => {
        const {graph} = mountGraph();
        chooseMode('frequency');
        const without = captions(graph).length;
        expect(readout('seed2')).toBeUndefined();
        turnOverlay();
        expect(graph.state.overlay).toBe(1);
        expect(captions(graph)).toEqual(expect.arrayContaining([t('random_graph_cap_seed_one', {value0: 42}), t('random_graph_cap_seed_two', {value0: 43})]));
        expect(captions(graph).length).toBe(without + 2);
        expect(readout('seed2')).toBeTruthy();
        expect(graph.view().scene.layers.running2.x.length).toBeGreaterThan(0);
        turnOverlay();
        expect(graph.state.overlay).toBe(0);
        expect(captions(graph).length).toBe(without);
        expect(readout('seed2')).toBeUndefined();
        noBadText();
    });

    test('the second seed: a valid value changes the second drawing only; invalid ones are refused with a message and the help id', () => {
        const {graph} = mountGraph();
        chooseMode('frequency');
        turnOverlay();
        const first = layerY(graph, 'running');
        const second = layerY(graph, 'running2');
        enter(t('random_graph_seed2_label'), '44');
        expect(graph.state).toMatchObject({seed: 42, seed2: 44});
        expect(layerY(graph, 'running')).toBe(first);
        expect(layerY(graph, 'running2')).not.toBe(second);
        const before = drawing(graph);
        for (const bad of ['1000000', '-1', '4,5', 'abc']) {
            enter(t('random_graph_seed2_label'), bad);
            const input = field(t('random_graph_seed2_label'));
            expect(graph.state.seed2, bad).toBe(44);
            expect(input.getAttribute('aria-invalid'), bad).toBe('true');
            expect(input.getAttribute('aria-describedby') ?? '', bad).toContain(HELP_ID);
            expect(document.querySelector('.number-input-hint')?.textContent?.length, bad).toBeGreaterThan(0);
            expect(drawing(graph), bad).toEqual(before);
        }
        expect(graph.editSeed2(1000000)).toBe(false);
        expect(graph.editSeed2(2.5)).toBe(false);
        expect(graph.state.seed2).toBe(44);
        expect(graph.editSeed2(5)).toBe(true);
        expect(graph.state.seed2).toBe(5);
    });

    test('the overlay in the Galton, walk and Markov modes draws the second layer and a second readout row', () => {
        const {graph} = mountGraph();
        for (const [mode, layer] of [['galton', 'heap2'], ['walk', 'heap2'], ['markov', 'share2']] as const) {
            chooseMode(mode);
            if (graph.state.overlay === 0) turnOverlay();
            expect(graph.view().scene.layers[layer].x.length, mode).toBeGreaterThan(0);
            expect(readout('seed2'), mode).toBeTruthy();
            expect(curves(graph), mode).toHaveLength(Object.keys(graph.view().scene.layers).length);
        }
        noBadText();
    });

    test('the shape select switches the area picture between the quarter and the whole circle, with its caption', () => {
        const {graph} = mountGraph();
        chooseMode('area');
        expect(captions(graph)).toContain(t('random_graph_cap_circle'));
        act(() => { fireEvent.change(field(t('random_graph_shape_label')), {target: {value: 'disc'}}); });
        expect(graph.state.areaShape).toBe('disc');
        expect(captions(graph)).toContain(t('random_graph_cap_circle_whole'));
        expect(captions(graph)).not.toContain(t('random_graph_cap_circle'));
        act(() => { fireEvent.change(field(t('random_graph_shape_label')), {target: {value: 'quarter'}}); });
        expect(graph.state.areaShape).toBe('quarter');
        expect(captions(graph)).toContain(t('random_graph_cap_circle'));
    });

    test('the slider sets the time between stops (grid 50), refuses off-range values and shows its range', () => {
        const {graph} = mountGraph();
        expect(slider().value).toBe('450');
        expect(slider().min).toBe('100');
        expect(slider().max).toBe('2000');
        expect(slider().getAttribute('aria-describedby') ?? '').toContain('help');
        act(() => { fireEvent.change(slider(), {target: {value: '200'}}); });
        expect(graph.state.stopMs).toBe(200);
        expect(graph.editStopMs(50)).toBe(false);
        expect(graph.editStopMs(2050)).toBe(false);
        expect(graph.editStopMs(333)).toBe(false);
        expect(graph.state.stopMs).toBe(200);
        expect(graph.editStopMs(1000)).toBe(true);
        expect(graph.state.stopMs).toBe(1000);
    });

    test('a shorter time plays faster on the fake clock; a longer one slower', () => {
        const shownAfter = (stopMs: number, total: number) => {
            const {graph, view} = mountGraph();
            act(() => { graph.editStopMs(stopMs); });
            press(t('play'));
            for (let time = 0; time <= total; time += 50) graph.clock.tick(time);
            const shown = graph.state.shown;
            view.unmount();
            return shown;
        };
        const fast = shownAfter(100, 1000);
        const slow = shownAfter(1000, 1000);
        expect(fast).toBeGreaterThan(slow);
        expect(slow).toBeLessThanOrEqual(2);
    });

    test('changing the speed while playing does not pause (a playback setting, not a scene edit); the next stop uses the new time', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.clock.tick(0);
        expect(graph.state.shown).toBe(1);
        act(() => { fireEvent.change(slider(), {target: {value: '100'}}); });
        expect(graph.isPlaying()).toBe(true);
        expect(graph.clock.pending()).toBe(true);
        expect(graph.state.stopMs).toBe(100);
        graph.clock.tick(100);
        expect(graph.state.shown).toBe(2);
    });

    test('under reduced motion the slider is unavailable with its reason and Play still shows the whole run', () => {
        const {graph} = mountGraph();
        graph.reduced = true;
        act(() => { graph.setState({shown: 3}); });
        expect(slider().getAttribute('aria-disabled')).toBe('true');
        expect(document.body.textContent).toContain(t('random_graph_speed_reduced'));
        press(t('play'));
        expect(graph.state.shown).toBe(1000);
        expect(graph.clock.requests).toBe(0);
    });

    test('with motion allowed the reason is not shown', () => {
        mountGraph();
        expect(document.body.textContent).not.toContain(t('random_graph_speed_reduced'));
    });

    test('the new captions are drawn in Slovenian and in English from the catalog, none as a key or a stray number', () => {
        const {graph} = mountGraph();
        const seenIn: Record<string, Set<string>> = {sl: new Set(), en: new Set()};
        for (const language of ['sl', 'en'] as const) {
            act(() => { setLanguage(language); });
            const collect = () => captions(graph).forEach(text => seenIn[language].add(text));
            chooseMode('interval');
            collect();
            chooseMode('markov');
            collect();
            chooseMode('area');
            act(() => { fireEvent.change(field(t('random_graph_shape_label')), {target: {value: 'disc'}}); });
            collect();
            chooseMode('frequency');
            collect();
            turnOverlay();
            collect();
            turnOverlay();
        }
        const sl = [...seenIn.sl].join('\n');
        const en = [...seenIn.en].join('\n');
        expect(sl).toContain('Zgrešenih med');
        expect(sl).toContain('Stanje A (začetek)');
        expect(sl).toContain('Cel krog');
        expect(sl).toContain('Grbov več kot pol metov');
        expect(sl).toContain('Pikčasta črta: seme 43');
        expect(sl).toContain('Polna črta: seme 42');
        expect(en).toContain('Misses among');
        expect(en).toContain('State A (start)');
        expect(en).toContain('Whole circle');
        expect(en).toContain('Dotted line: seed 43');
        expect(en).not.toContain('Zgrešenih');
        for (const text of [sl, en]) expect(text).not.toMatch(/random_graph|undefined|NaN|\{value/);
    });

    test('the frequency status names the heads above half the tosses (value4)', () => {
        const {graph} = mountGraph();
        chooseMode('frequency');
        const sim = graph.view().sim;
        if (sim.kind !== 'frequency') throw new Error('kind');
        const above = sim.heads - sim.trials / 2;
        const status = document.querySelector('[data-random-status]')!.textContent!;
        expect(status).toContain(`grbov več kot pol metov ${String(above).replace('.', ',')}.`);
        noBadText();
    });
});

describe('the board is rebuilt when the caption count changes', () => {
    test('overlay on: new texts stand, the old ones are gone; after dispose the count equals the pre-mount count', () => {
        const {graph, view} = mountGraph();
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const base = count() - graph.ownedObjectCount();
        chooseMode('frequency');
        const textIds = () => new Set(probes(graph).filter(o => o.elType === 'text' && !o.id.endsWith('_infobox')).map(o => o.id));
        const before = textIds();
        const texts = captions(graph).length;
        act(() => { fireEvent.click(screen.getByRole('checkbox', {name: t('random_graph_overlay_label')})); });
        expect(captions(graph).length).toBeGreaterThan(texts);
        expect([...textIds()].filter(id => before.has(id))).toEqual([]);
        expect(count()).toBe(base + graph.ownedObjectCount());
        expect(graph.ownedObjectCount()).toBe(curves(graph).length + captions(graph).length);
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(count()).toBe(base);
        view.unmount();
    });
});

describe('review repairs', () => {
    const slider = () => screen.getByRole('slider') as HTMLInputElement;
    const turnOverlay = () => act(() => { fireEvent.click(screen.getByRole('checkbox', {name: t('random_graph_overlay_label')})); });

    test('the speed help states its range and step', () => {
        mountGraph();
        expect(slider()).toBeTruthy();
        expect(document.body.textContent).toContain('100–2000 ms, korak 50 ms');
        act(() => { setLanguage('en'); });
        expect(document.body.textContent).toContain('100–2000 ms, step 50 ms');
    });

    test('the 95 % band is called the 95 % band in the caption and the readout, and the 1 sd readout stays "typical"', () => {
        const {graph} = mountGraph();
        chooseMode('frequency');
        expect(captions(graph)).toContain('Pas 95 %');
        expect(document.querySelector('[data-readout="band"] dt')?.textContent).toContain('95 %');
        expect(document.querySelector('[data-readout="typical"] dt')?.textContent).toContain('Običajno odstopanje');
        act(() => { setLanguage('en'); });
        expect(captions(graph)).toContain('95 % band');
    });

    test('the band half-width of an odd count is a half-integer with a decimal comma', () => {
        mountGraph();
        chooseMode('frequency');
        enter(t('random_graph_n_frequency'), '9');
        expect(readout('band')).toMatch(/\(± \d+,5\)$/);
    });

    test('the whole circle says it is one sample quarter mirrored into the four quarters', () => {
        const {graph} = mountGraph();
        chooseMode('area');
        act(() => { fireEvent.change(field(t('random_graph_shape_label')), {target: {value: 'disc'}}); });
        expect(captions(graph).join('|')).toContain('zrcaljena v štiri četrtine');
        act(() => { setLanguage('en'); });
        expect(captions(graph).join('|')).toContain('mirrored into the four quarters');
    });

    test('the second run says it has the same parameters, and equal seeds are announced', () => {
        mountGraph();
        chooseMode('frequency');
        turnOverlay();
        expect(document.body.textContent).toContain('enake parametre');
        const seed = field(t('random_graph_seed_label')).value;
        const note = () => document.querySelector('[data-random-note]');
        enter(t('random_graph_seed2_label'), '77');
        expect(note()).toBeNull();
        enter(t('random_graph_seed2_label'), seed);
        expect(note()?.textContent).toBe(t('random_graph_seed2_same'));
        enter(t('random_graph_seed2_label'), '78');
        expect(note()).toBeNull();
    });

    test('Markov notes sit under the list: the labelled rows stay a definition list for 100 % and 100 % and for 0 % and 0 %', () => {
        mountGraph();
        chooseMode('markov');
        for (const [percent, note] of [['100', 'random_graph_r_note_period'], ['0', 'random_graph_r_note_identity']] as const) {
            enter(t('random_graph_a_label'), percent);
            enter(t('random_graph_b_label'), percent);
            const list = document.querySelector(`[aria-label="${t('random_graph_readout_title')}"].readout-list`);
            expect(list?.tagName, percent).toBe('DL');
            expect(document.querySelectorAll('.readout-list dt').length, percent).toBeGreaterThanOrEqual(4);
            expect(document.querySelector('[data-random-note]')?.textContent, percent).toBe(t(note));
        }
    });

    test('the area scene names inside points, outside points and the error bar', () => {
        const {graph} = mountGraph();
        chooseMode('area');
        for (const key of ['random_graph_cap_inside', 'random_graph_cap_outside', 'random_graph_cap_error_bar'] as const) expect(captions(graph), key).toContain(t(key));
    });

    test('the law caption says the bars are scaled to the tallest bar', () => {
        const {graph} = mountGraph();
        chooseMode('interval');
        expect(captions(graph).join('|')).toContain('merilo: najvišji stolpec');
        act(() => { setLanguage('en'); });
        expect(captions(graph).join('|')).toContain('scale: tallest bar');
    });

    test('the input help id is rendered once in every mode, the selects have visible labels, and a blocked Next shows its reason', () => {
        mountGraph();
        for (const mode of RANDOM_MODES) {
            chooseMode(mode);
            expect(document.querySelectorAll(`#${HELP_ID}`).length, mode).toBe(1);
        }
        chooseMode('markov');
        for (const key of ['random_graph_mode_label', 'random_graph_start_label'] as const) {
            expect(screen.getByText(t(key), {selector: 'label'}), key).toBeTruthy();
        }
        expect(document.querySelector('[data-playback-reason]')).toBeNull();
        press(t('next_step'));
        expect(document.querySelector('[data-playback-reason="no-more-steps"]')?.textContent).toBe(t('playback_block_no_more_steps'));
    });
});
