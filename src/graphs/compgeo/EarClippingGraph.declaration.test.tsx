import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {EarClippingGraph, type EarClippingIds} from './EarClippingGraph';
import {EAR_CLIPPING_EXAMPLE_2} from './earClippingPresetCollection';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: EarClippingGraph) => graph.getDeclaration() as GraphDeclaration<EarClippingIds>;
const action = (graph: EarClippingGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const advance = (graph: EarClippingGraph, steps: number | 'end') => {
    const count = steps === 'end' ? graph.run().length - 1 : steps;
    for (let i = 0; i < count; i++) graph.nextStep();
};
const polygon = (points: [number, number][]) => ({mode: 'polygon', closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});

const STATES: readonly {name: string; apply(graph: EarClippingGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'example 1, step 2', apply: graph => { learner(() => advance(graph, 2)); }},
    {name: 'example 1, end', apply: graph => { learner(() => advance(graph, 'end')); }},
    {name: 'comb, end', apply: graph => { learner(() => { graph.loadModel(EAR_CLIPPING_EXAMPLE_2); advance(graph, 'end'); }); }},
    {name: 'clockwise polygon, step 2', apply: graph => { learner(() => { graph.loadModel(polygon([[0, 0], [0, 4], [3, 2], [6, 4], [6, 0]]) as never); advance(graph, 2); }); }},
    {name: 'self-crossing polygon', apply: graph => { learner(() => { graph.loadModel(polygon([[0, 0], [4, 4], [4, 0], [0, 4]]) as never); }); }},
];

describe('ear clipping declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new EarClippingGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();

        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));

        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'trace', 'reflex', 'triangulation', 'guards']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const panel = [...view.container.querySelectorAll('[data-readout-note]')]
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = declaration.notes!.map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the step counter leads, a blocked ear test names its blocker, the result comes at the end', () => {
        const graph = new EarClippingGraph();
        mountGraph(graph);
        expect(renderMessage(declare(graph).notes![0].text)).toMatch(/^Korak 1 od \d+$/);
        act(() => { learner(() => advance(graph, 2)); });
        const texts = declare(graph).notes!.map(note => renderMessage(note.text));
        expect(texts.some(text => text.includes('V trikotniku leži oglišče P4.'))).toBe(true);
        act(() => { learner(() => advance(graph, 'end')); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(expect.arrayContaining(['result-triangles', 'result-diagonals', 'result-classes', 'result-guards']));
    });

    test('a drag moves the marks', () => {
        const graph = new EarClippingGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(3, {x: 3, y: 1}); }); });
        expect(declare(graph).marks!.must[3]).toEqual({kind: 'point', x: 3, y: 1});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the switches and the playback are tools actions that follow the state, no puck', () => {
        const graph = new EarClippingGraph();
        mountGraph(graph);
        const ids = ['grid', 'trace', 'reflex', 'triangulation', 'colouring', 'guards'];
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual([...ids, 'next-step', 'play', 'reset']);
        for (const id of ids) expect(action(graph, id), id).toMatchObject({placement: 'tools', section: 'display'});
        expect(action(graph, 'trace')).toMatchObject({pressed: true});
        for (const id of ids) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
        }
        expect(action(graph, 'reset').enabled).toBe(false);
        act(() => graph.performAction('next-step'));
        expect(graph.step).toBe(1);
        expect(action(graph, 'reset').enabled).toBe(true);
        act(() => graph.performAction('reset'));
        expect(graph.step).toBe(0);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
    });
});
