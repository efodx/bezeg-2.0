import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PascalGraph, type PascalIds} from './PascalGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {toAffine} from '../../projective/homogeneous';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const LEGEND = ['conic', 'sides', 'line', 'points', 'infinity', 'handles'] as const;

const learner = (apply: (graph: PascalGraph) => void) => (graph: PascalGraph) => { runAs('learner', () => { apply(graph); }); };
const STATES: readonly {name: string; apply(graph: PascalGraph): void}[] = [
    {name: 'default ellipse', apply: () => {}},
    {name: 'Pappus line pair', apply: learner(graph => graph.loadExample('pappus'))},
    {name: 'point at infinity', apply: learner(graph => graph.loadExample('infinity'))},
    {name: 'self-crossing order', apply: learner(graph => graph.chooseOrder('pappus'))},
    {name: 'star order', apply: learner(graph => { graph.loadExample('default'); graph.chooseOrder('star'); })},
    {name: 'hyperbola', apply: learner(graph => { graph.loadExample('default'); graph.chooseConic('hyperbola'); })},
    {name: 'parabola', apply: learner(graph => { graph.loadExample('default'); graph.chooseConic('parabola'); })},
    {name: 'neighbouring points coincide', apply: learner(graph => { graph.loadExample('default'); graph.setHandleIndex(1, graph.model.indices[0]); })},
];

describe('pascal declaration', () => {
    test('the graph binds no parameters, so nothing is declared as one', () => {
        const graph = new PascalGraph();
        mountGraph(graph);
        const declaration = graph.getDeclaration() as GraphDeclaration<PascalIds>;
        expect(declaration.parameters).toBeUndefined();
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view')).toEqual([]);
    });

    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply}) => {
        const graph = new PascalGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = graph.getDeclaration() as GraphDeclaration<PascalIds>;
        const scene = graph.scene();

        expect(checkDeclaration(declaration)).toEqual([]);

        // the legend resolves to what the board drew now
        expect(declaration.legend!.map(entry => entry.id)).toEqual([...LEGEND]);
        const finite = scene.pascalPoints.filter(entry => entry.view.kind === 'finite' && !entry.offBox).length;
        const visible = {
            conic: true,
            sides: scene.sides.some(side => side !== undefined),
            line: scene.result.status === 'ok' && scene.result.line !== null && !(scene.result.line[0] === 0n && scene.result.line[1] === 0n),
            points: finite > 0,
            infinity: scene.pascalPoints.some(entry => entry.view.kind === 'ideal'),
            handles: true,
        };
        for (const entry of declaration.legend!) {
            const object = graph.drawnObject(entry.object);
            expect(object, entry.id).toBeDefined();
            expect(object!.visible, entry.id).toBe(visible[entry.id]);
        }

        // the notes are the sentences of the panel, in its order; the state sentence is the first of them
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(declaration.notes![0].id).toBe('status');
        expect(declaration.notes![0].tone).toBe(scene.result.status === 'ok' && scene.result.collinear ? undefined : 'warning');
        expect(declaration.status).toBeUndefined();

        // the view keeps the six points and the intersections drawn as finite points
        expect(declaration.marks!.must).toHaveLength(6 + finite);
        expect(declaration.marks!.must.slice(0, 6)).toEqual(scene.handles.map(handle => {
            const at = toAffine(handle);
            return {kind: 'point', x: at.kind === 'finite' ? at.view.x : NaN, y: at.kind === 'finite' ? at.view.y : NaN};
        }));

        // the order puck shows the named order, the conic puck the conic; exactly one segment of each group is pressed
        const pressed = (prefix: string) => declaration.actions!.filter(action => action.id.startsWith(prefix) && action.pressed).map(action => action.id);
        expect(pressed('order-')).toHaveLength(1);
        expect(pressed('conic-')).toHaveLength(1);
    });

    test('the puck segments run the control actions as the learner', () => {
        const graph = new PascalGraph();
        mountGraph(graph);
        act(() => graph.performAction('order-star'));
        expect(graph.model.order).toEqual([0, 2, 4, 1, 3, 5]);
        expect((graph.getDeclaration() as GraphDeclaration<PascalIds>).actions!.find(action => action.id === 'order-star')!.pressed).toBe(true);
        act(() => graph.performAction('conic-parabola'));
        expect(graph.model.conic).toBe('parabola');
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        expect(() => graph.performAction('constructor')).toThrow('Unknown action');
    });

    test('an imported hexagon order that has no name shows no order puck', () => {
        const graph = new PascalGraph();
        mountGraph(graph);
        act(() => { runAs('learner', () => { graph.loadModel({...graph.model, example: 'custom', order: [0, 1, 2, 3, 5, 4]}); }); });
        const actions = (graph.getDeclaration() as GraphDeclaration<PascalIds>).actions!;
        expect(actions.some(action => action.id.startsWith('order-'))).toBe(false);
        expect(actions.filter(action => action.id.startsWith('conic-'))).toHaveLength(4);
    });

    test('the legend colours differ where the board draws different things, and an unknown id resolves to nothing', () => {
        const graph = new PascalGraph();
        mountGraph(graph);
        const colour = (id: string) => graph.drawnObject(id)!.color;
        expect(colour('conic')).not.toBe(colour('sides'));
        expect(colour('line')).not.toBe(colour('sides'));
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('the notes follow the language', () => {
        const graph = new PascalGraph();
        mountGraph(graph);
        const first = renderMessage(graph.getDeclaration()!.notes![0].text);
        act(() => setLanguage('en'));
        expect(renderMessage(graph.getDeclaration()!.notes![0].text)).not.toBe(first);
    });
});
