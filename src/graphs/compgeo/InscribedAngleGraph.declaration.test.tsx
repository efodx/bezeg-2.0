import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {InscribedAngleGraph, type InscribedAngleIds} from './InscribedAngleGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration, type RangeParameter} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: InscribedAngleGraph) => graph.getDeclaration() as GraphDeclaration<InscribedAngleIds>;
const action = (graph: InscribedAngleGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (work: () => void) => act(() => runAs('learner', work));
const points = (list: [number, number][]) => ({mode: 'points' as const, closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});

const STATES: readonly {name: string; apply(graph: InscribedAngleGraph): void; circle: boolean; glider: boolean}[] = [
    {name: 'default', apply: () => {}, circle: true, glider: true},
    {name: 'P on the other arc', apply: graph => graph.setT(270), circle: true, glider: true},
    {name: 'Thales example', apply: graph => graph.loadExample('thales'), circle: true, glider: true},
    {name: 'C moved', apply: graph => graph.loadModel(points([[0, 0], [7, 0], [3, 6]])), circle: true, glider: true},
    {name: 'degenerate', apply: graph => graph.loadModel(points([[0, 0], [1, 1], [3, 3]])), circle: false, glider: false},
    {name: 'two points', apply: graph => graph.loadModel(points([[0, 0], [4, 1]])), circle: false, glider: false},
    {name: 'empty', apply: graph => graph.clear(), circle: false, glider: false},
];

describe('inscribed angle declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the figure, notes equal the panel', ({apply, circle, glider}) => {
        const graph = new InscribedAngleGraph();
        const {view} = mountGraph(graph);
        learner(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // the glider angle is the one parameter, bound in the arbiter, present exactly when P is drawn
        expect((declaration.parameters ?? []).map(parameter => parameter.key)).toEqual(glider ? ['inscribed-t'] : []);
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view')).toEqual(['inscribed-t']);

        // the marks are the vertices, plus the box of the circle when there is one
        const vertices = graph.model.points.map(p => ({kind: 'point', x: p.x, y: p.y}));
        expect(declaration.marks!.must.slice(0, vertices.length)).toEqual(vertices);
        expect(declaration.marks!.must.length).toBe(vertices.length + (circle ? 1 : 0));
        if (circle) {
            const analysis = graph.analysis();
            const {centre, radius} = analysis.kind === 'circle' && analysis.board ? analysis.board : {centre: {x: NaN, y: NaN}, radius: NaN};
            expect(declaration.marks!.must[vertices.length]).toEqual({kind: 'box', left: centre.x - radius, top: centre.y + radius, right: centre.x + radius, bottom: centre.y - radius});
        }

        // the legend resolves; every entry is drawn exactly as the state says
        expect(declaration.legend!.map(entry => entry.id)).toEqual([
            'points', ...(circle ? ['circle', 'chord', 'glider'] : []), 'radii', 'angles',
        ]);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(graph.drawnObject('circle')!.visible).toBe(circle);
        expect(graph.drawnObject('glider')!.visible).toBe(glider);

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThan(0);
    });

    test('the glider angle is a range puck that writes through the setter and snaps out of the exclusion gap', () => {
        const graph = new InscribedAngleGraph();
        mountGraph(graph);
        const parameter = declare(graph).parameters![0] as RangeParameter;
        expect(parameter).toMatchObject({key: 'inscribed-t', kind: 'range', placement: 'board', symbol: 't', min: 0, max: 360});
        expect(graph.parameters!.read('inscribed-t')).toBe(90);
        act(() => { graph.parameters!.write('inscribed-t', 270, 'learner'); });
        expect(graph.t).toBe(270);
        expect(graph.drawnObject('glider')!.visible).toBe(true);
        // a typed value inside the gap at A (203.2 degrees) is moved to its edge, exactly as the panel's slider does
        act(() => { graph.parameters!.write('inscribed-t', 203.3, 'learner'); });
        expect(graph.parameters!.read('inscribed-t')).toBe(graph.t);
        expect(graph.t).not.toBe(203.3);
    });

    test('the overlay switches are display actions that run as the learner and follow the state', () => {
        const graph = new InscribedAngleGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'radii', 'angles']);
        expect(declare(graph).actions!.filter(candidate => candidate.puck)).toEqual([]);
        expect(action(graph, 'angles')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(action(graph, 'radii')).toMatchObject({placement: 'tools', section: 'display', pressed: false});
        for (const id of ['grid', 'radii', 'angles']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden overlay hides its legend entry', () => {
        const graph = new InscribedAngleGraph();
        mountGraph(graph);
        expect(graph.drawnObject('angles')!.visible).toBe(true);
        expect(graph.drawnObject('radii')!.visible).toBe(false);
        act(() => graph.performAction('angles'));
        act(() => graph.performAction('radii'));
        expect(graph.drawnObject('angles')!.visible).toBe(false);
        expect(graph.drawnObject('radii')!.visible).toBe(true);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });
});

