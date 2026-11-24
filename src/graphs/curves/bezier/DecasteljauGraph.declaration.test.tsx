import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import DecasteljauGraph, {type DecasteljauIds} from './DecasteljauGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';

import {setLanguage} from '../../../localization';
import {currentWrite} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

function setup(...ts: number[]) {
    const graph = new DecasteljauGraph();
    const {view} = mountGraph(graph);
    for (const t of ts) act(() => { graph.parameters!.write('decasteljau-t', t, 'lesson'); });
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<DecasteljauIds>};
}



describe('De Casteljau declaration', () => {
    for (const t of [0, 0.25, 0.5, 0.8, 1]) {
        for (const whole of [false, true]) {
            test(`t ${t}, full curve ${whole ? 'shown' : 'hidden'}: consistent, bound, drawn and equal to the panel`, () => {
                const {graph, declaration} = setup(t);
                if (whole) act(() => graph.performAction('full-curve'));
                const current = declaration();

                expect(checkDeclaration(current)).toEqual([]);
                for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);

                // the legend resolves to drawn objects; the remaining part is visible exactly while the full curve is shown
                for (const entry of current.legend ?? []) {
                    const drawn = graph.drawnObject(entry.object);
                    expect(drawn, entry.id).toBeDefined();
                    expect(drawn!.visible, entry.id).toBe(entry.id === 'rest' ? whole : true);
                }
                expect(current.legend!.map(entry => entry.id)).toEqual(['curve', 'rest', 'point', 'scheme', 'control']);

                // the panel has no t readout row: the slider shows t, so the declaration declares no readouts
                expect(current.readouts ?? []).toEqual([]);
                expect(current.actions!.find(action => action.id === 'full-curve')).toMatchObject({placement: 'board', puck: true, pressed: whole});
                expect(current.parameters).toMatchObject([{key: 'decasteljau-t', kind: 'range', min: 0, max: 1, placement: 'board'}]);
            });
        }
    }

    test('play, pause and reset run as the learner and the state follows in the declaration', () => {
        const sources: (string | undefined)[] = [];
        class Probe extends DecasteljauGraph {
            override pausePlayback() { sources.push(currentWrite()?.source); super.pausePlayback(); }
        }
        const graph = new Probe();
        mountGraph(graph);
        const declaration = () => graph.getDeclaration() as GraphDeclaration<DecasteljauIds>;
        const action = (id: string) => declaration().actions!.find(candidate => candidate.id === id)!;
        expect(action('play').pressed).toBe(false);
        expect(action('reset').enabled).toBe(true); // t is 0,5, so there is something to reset
        act(() => graph.performAction('play'));
        expect(action('play').pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(action('play').pressed).toBe(false);
        act(() => graph.performAction('reset'));
        expect(graph.state.t).toBe(0);
        expect(action('reset').enabled).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });
});
