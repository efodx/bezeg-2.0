import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {CARD_REFRESH_MS, WavesGraph} from './WavesGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Apply = (graph: WavesGraph) => void;
const sum = (patch: Record<string, number | boolean> = {}): Apply => graph => graph.applyWavesAction({kind: 'waves', operation: 'set-components', ...patch});
const mode = (value: 'sum' | 'beats' | 'standing' | 'sampling'): Apply => graph => graph.applyWavesAction({kind: 'waves', operation: 'set-mode', mode: value});
const sampling = (patch: Record<string, number | boolean>): Apply => graph => graph.applyWavesAction({kind: 'waves', operation: 'set-sampling', ...patch});
const at = (t: number): Apply => graph => graph.applyWavesAction({kind: 'waves', operation: 'set-time', t});

const SUM_PARAMS = ['waves-a1', 'waves-p1', 'waves-a2', 'waves-p2', 'waves-f1'];
const BEATS_PARAMS = ['waves-a1', 'waves-f1', 'waves-f2'];
const STANDING_PARAMS = ['waves-a1', 'waves-half-waves'];
const SAMPLING_PARAMS = ['waves-p1', 'waves-f1', 'waves-fs'];
const SUM_LEGEND = ['wave1', 'wave2', 'sum', 'phasors'];
const BEATS_LEGEND = ['wave1', 'wave2', 'sum', 'envelope'];
const STANDING_LEGEND = ['right', 'left', 'standing', 'nodes', 'antinodes'];
const SAMPLING_LEGEND = ['tone', 'dots', 'strip', 'true', 'film', 'alias', 'join', 'sinc'];

const states: {name: string; apply: Apply[]; params: string[]; actions: [string, boolean][]; legend: string[]; hidden: string[]; status: RegExp}[] = [
    {name: 'sum, default at 0,25 s', apply: [at(0.25)], params: SUM_PARAMS, actions: [['show-phasors', true]], legend: SUM_LEGEND, hidden: [], status: /^Čas 0,25 s\. Dva vala s frekvenco 3 Hz/},
    {name: 'sum, opposite waves with phasors', apply: [sum({a2: 1, p2: 180, showPhasors: true}), at(0.1)], params: SUM_PARAMS, actions: [['show-phasors', true]], legend: SUM_LEGEND, hidden: [], status: /Vala sta nasprotna/},
    {name: 'beats, 10 and 12 Hz', apply: [mode('beats'), sum({f1: 10, f2: 12}), at(0.25)], params: BEATS_PARAMS, actions: [['show-envelope', true]], legend: BEATS_LEGEND, hidden: [], status: /utripanje s frekvenco 2 Hz/},
    {name: 'beats, envelope hidden', apply: [mode('beats'), sum({f1: 10, f2: 14, showEnvelope: false}), at(1)], params: BEATS_PARAMS, actions: [['show-envelope', false]], legend: BEATS_LEGEND, hidden: ['envelope'], status: /utripanje s frekvenco 4 Hz/},
    {name: 'standing, three half waves', apply: [mode('standing'), sum({halfWaves: 3, a1: 1}), at(0.25)], params: STANDING_PARAMS, actions: [], legend: STANDING_LEGEND, hidden: [], status: /s 3 polvali/},
    {name: 'sampling, 23 Hz at 12 Hz with the alias wave', apply: [mode('sampling'), sum({f1: 23}), sampling({fs: 12, showAlias: true}), at(0.25)], params: SAMPLING_PARAMS,
        actions: [['show-alias', true], ['show-join', false], ['show-sinc', false]], legend: SAMPLING_LEGEND, hidden: ['join', 'sinc'], status: /vrti nazaj s frekvenco 1 Hz/},
    {name: 'sampling, sinc shown adds the extra samples', apply: [mode('sampling'), sum({f1: 5}), sampling({fs: 12, showSinc: true, showJoin: true, extra: 24}), at(0.3)], params: [...SAMPLING_PARAMS, 'waves-extra'],
        actions: [['show-alias', true], ['show-join', true], ['show-sinc', true]], legend: SAMPLING_LEGEND, hidden: [], status: /^Čas 0,3 s\./},
    {name: 'sampling, 6 Hz at 12 Hz (2f = fs)', apply: [mode('sampling'), sum({f1: 6}), sampling({fs: 12, showAlias: true}), at(0.1)], params: SAMPLING_PARAMS,
        actions: [['show-alias', true], ['show-join', false], ['show-sinc', false]], legend: SAMPLING_LEGEND, hidden: ['alias', 'join', 'sinc'], status: /ni mogoče določiti/},
];

describe('Waves declares the workspace', () => {
    for (const {name, apply, params, actions, legend, hidden, status} of states) {
        test(`${name}: consistent, rows and status equal the panel, pucks and legend follow the scene`, () => {
            const graph = new WavesGraph();
            const {view} = mountGraph(graph);
            act(() => { runAs('lesson', () => apply.forEach(step => step(graph))); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => parameter.key)).toEqual(params);
            expect(declaration.parameters?.every(parameter => parameter.placement === 'board')).toBe(true);
            expect(declaration.actions?.map(action => [action.id, action.pressed])).toEqual(actions);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object)?.visible, entry.id).toBe(!hidden.includes(entry.id));
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.length).toBeGreaterThan(5);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            const note = declaration.notes?.find(candidate => candidate.id === 'status');
            expect(renderMessage(note!.text)).toMatch(status);
            expect(renderMessage(note!.text)).toBe(view.container.querySelector('[data-waves-status]')?.textContent);
            expect(declaration.marks?.must).toHaveLength(1);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('a write through the arbiter changes the state and reads back; an off-grid value is snapped and a value outside the range changes nothing', () => {
        const graph = new WavesGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('waves-a1', 1.5, 'learner'); });
        expect(graph.parameters!.read('waves-a1')).toBe(1.5);
        act(() => { graph.parameters!.write('waves-a1', 1.3, 'learner'); }); // the amplitudes are on a grid of 0,25
        expect(graph.parameters!.read('waves-a1')).toBe(1.25);
        act(() => { expect(() => graph.parameters!.write('waves-f1', 99, 'learner')).not.toThrow(); });
        expect(graph.parameters!.read('waves-f1')).toBe(3);
    });

    test('a switch puck flips the field; an unknown action is refused', () => {
        const graph = new WavesGraph();
        mountGraph(graph);
        act(() => { graph.performAction('show-phasors'); });
        expect(graph.state.showPhasors).toBe(false);
        expect(graph.getDeclaration()!.actions?.[0]).toMatchObject({id: 'show-phasors', pressed: false});
        expect(() => graph.performAction('show-nothing')).toThrow();
    });

    test('while a wave plays the declared cards are refreshed about ten times a second, and at once on a pause, a step and a reset', () => {
        const graph = new WavesGraph();
        mountGraph(graph);
        let versions = 0;
        const stop = graph.store.subscribe(() => { versions++; });
        const frame = 1000 / 60;
        act(() => { graph.play(); });
        const afterPlay = versions;
        const driver = graph as unknown as {advance(delta: number): void};
        act(() => { for (let n = 0; n < 60; n++) driver.advance(frame); }); // one second of 60 frames
        const refreshes = versions - afterPlay;
        expect(refreshes).toBeGreaterThanOrEqual(8);
        expect(refreshes).toBeLessThanOrEqual(11);
        expect(frame * 6).toBeGreaterThanOrEqual(CARD_REFRESH_MS - 1);
        const before = versions;
        act(() => { graph.pausePlayback(); });
        expect(versions).toBeGreaterThan(before);
        const stepped = versions;
        act(() => { graph.setTime(0.5); });
        expect(versions).toBeGreaterThan(stepped);
        const reset = versions;
        act(() => { graph.resetTime(); });
        expect(versions).toBeGreaterThan(reset);
        stop();
    });
});
