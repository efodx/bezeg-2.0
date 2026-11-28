import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {InversionGraph, type InversionIds} from './InversionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration, type RangeParameter} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: InversionGraph) => graph.getDeclaration() as GraphDeclaration<InversionIds>;
const learner = (work: () => void) => act(() => runAs('learner', work));
const points = (list: [number, number][]) => ({mode: 'points' as const, closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});

const OVERLAYS = ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'];
const STATES: readonly {name: string; apply(graph: InversionGraph): void; puck: 'inversion-radius' | 'inversion-theta' | undefined}[] = [
    {name: 'default point', apply: () => {}, puck: 'inversion-radius'},
    {name: 'radius 3, X moved', apply: graph => { graph.setRadius(3); graph.setX({x: -2, y: 1}); }, puck: 'inversion-radius'},
    {name: 'X at the centre', apply: graph => { graph.setX({x: 0, y: 0}); }, puck: 'inversion-radius'},
    {name: 'circle through the centre', apply: graph => graph.loadExample('through-centre'), puck: 'inversion-radius'},
    {name: 'line through the centre', apply: graph => graph.loadExample('line-through-centre'), puck: 'inversion-radius'},
    {name: 'power', apply: graph => graph.loadExample('power'), puck: 'inversion-theta'},
    {name: 'power, secant turned', apply: graph => { graph.loadExample('power'); graph.setTheta(20); }, puck: 'inversion-theta'},
    {name: 'angle', apply: graph => graph.loadExample('angle'), puck: 'inversion-radius'},
    {name: 'orthogonal', apply: graph => graph.loadExample('orthogonal'), puck: 'inversion-radius'},
    {name: 'no centre', apply: graph => graph.loadModel(points([])), puck: undefined},
];

describe('Inversion declaration', () => {
    test.each(STATES)('$name: consistent, the puck follows the focus, notes equal the panel', ({apply, puck}) => {
        const graph = new InversionGraph();
        const {view} = mountGraph(graph);
        learner(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // the radius puck exists for the focuses with a circle of inversion, the direction puck for the power focus; the arbiter binds both whatever the state
        expect((declaration.parameters ?? []).map(parameter => parameter.key)).toEqual(puck && graph.view().kind === 'scene' ? [puck] : []);
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view').sort()).toEqual(['inversion-radius', 'inversion-theta']);

        // the marks begin with the vertex; with a figure they also hold the circle of inversion (or the power circle)
        const vertices = graph.model.points.map(p => ({kind: 'point', x: p.x, y: p.y}));
        expect(declaration.marks!.must.slice(0, vertices.length)).toEqual(vertices);
        if (graph.view().kind === 'scene') expect(declaration.marks!.must.some(mark => mark.kind === 'box')).toBe(true);

        // the legend resolves
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', ...OVERLAYS]);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThan(0);
    });

    test('the inversion radius is a whole-number range puck that writes through the setter', () => {
        const graph = new InversionGraph();
        mountGraph(graph);
        const parameter = declare(graph).parameters![0] as RangeParameter;
        expect(parameter).toMatchObject({key: 'inversion-radius', kind: 'range', placement: 'board', symbol: 'r', min: 1, max: 8, step: 1});
        expect(graph.parameters!.read('inversion-radius')).toBe(graph.fields.radius);
        act(() => { graph.parameters!.write('inversion-radius', 5, 'learner'); });
        expect(graph.fields.radius).toBe(5);
        expect(graph.parameters!.read('inversion-radius')).toBe(5);
    });

    test('the secant direction is a range puck of the power focus that writes through the setter', () => {
        const graph = new InversionGraph();
        mountGraph(graph);
        learner(() => graph.loadExample('power'));
        const parameter = declare(graph).parameters![0] as RangeParameter;
        expect(parameter).toMatchObject({key: 'inversion-theta', kind: 'range', placement: 'board', min: 0, max: 360});
        act(() => { graph.parameters!.write('inversion-theta', 20, 'learner'); });
        expect(graph.fields.power.thetaDeg).toBe(20);
        expect(graph.parameters!.read('inversion-theta')).toBe(20);
    });

    test('the overlay switches are display actions that run as the learner and follow the state', () => {
        const graph = new InversionGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', ...OVERLAYS]);
        expect(declare(graph).actions!.filter(candidate => candidate.puck)).toEqual([]);
        for (const id of ['grid', ...OVERLAYS]) {
            const was = declare(graph).actions!.find(candidate => candidate.id === id)!.pressed;
            act(() => graph.performAction(id));
            expect(declare(graph).actions!.find(candidate => candidate.id === id)!.pressed, id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden overlay hides its legend entry', () => {
        const graph = new InversionGraph();
        mountGraph(graph);
        expect(graph.drawnObject('image')!.visible).toBe(true);
        act(() => graph.performAction('image'));
        expect(graph.drawnObject('image')!.visible).toBe(false);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });
});
