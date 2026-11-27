import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PolePolarGraph, type PolePolarIds} from './PolePolarGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {isLineAtInfinity, POLE_POLAR_DENOMINATOR} from './polePolarModel';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const LEGEND = ['conic', 'polar', 'tangents', 'tangency', 'centre', 'point', 'infinity'] as const;

const learner = (apply: (graph: PolePolarGraph) => void) => (graph: PolePolarGraph) => { runAs('learner', () => { apply(graph); }); };
const STATES: readonly {name: string; apply(graph: PolePolarGraph): void}[] = [
    {name: 'default outside', apply: () => {}},
    {name: 'on the conic', apply: learner(graph => graph.loadExample('on'))},
    {name: 'inside', apply: learner(graph => graph.loadExample('inside'))},
    {name: 'P at infinity', apply: learner(graph => graph.loadExample('infinity'))},
    {name: 'hyperbola', apply: learner(graph => { graph.loadExample('default'); graph.chooseConic('hyperbola'); })},
    {name: 'parabola', apply: learner(graph => { graph.loadExample('default'); graph.chooseConic('parabola'); })},
    {name: 'circle', apply: learner(graph => { graph.loadExample('default'); graph.chooseConic('circle'); })},
    {name: 'irrational tangency', apply: learner(graph => { graph.loadExample('default'); graph.placeNumerators(35, 20); })},
    {name: 'centre', apply: learner(graph => { graph.loadExample('default'); graph.placeNumerators(0, 0); })},
];

describe('pole-polar declaration', () => {
    test('the graph binds no parameters, so nothing is declared as one', () => {
        const graph = new PolePolarGraph();
        mountGraph(graph);
        const declaration = graph.getDeclaration() as GraphDeclaration<PolePolarIds>;
        expect(declaration.parameters).toBeUndefined();
        expect(declaration.actions).toBeUndefined();
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view')).toEqual([]);
    });

    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply}) => {
        const graph = new PolePolarGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = graph.getDeclaration() as GraphDeclaration<PolePolarIds>;
        const scene = graph.scene();

        expect(checkDeclaration(declaration)).toEqual([]);

        // the legend resolves to what the board drew now
        expect(declaration.legend!.map(entry => entry.id)).toEqual([...LEGEND]);
        const tangencyFinite = scene.tangency.filter(found => found.exact ? found.view.kind === 'finite' : found.approx.kind === 'finite').length;
        const visible = {
            conic: true,
            polar: scene.polar !== undefined && !isLineAtInfinity(scene.polar),
            tangents: scene.side === 'outside' && scene.tangents.some(line => !(line.exact && isLineAtInfinity(line.line))),
            tangency: tangencyFinite > 0,
            centre: scene.centre?.kind === 'finite',
            point: !scene.ideal,
            infinity: scene.ideal,
        };
        for (const entry of declaration.legend!) {
            const object = graph.drawnObject(entry.object);
            expect(object, entry.id).toBeDefined();
            expect(object!.visible, entry.id).toBe(visible[entry.id]);
        }

        // the notes are the sentences of the panel, in its order; the region sentence is the first of them
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(declaration.notes![0].id).toBe('status');
        expect(declaration.status).toBeUndefined();

        // the view keeps P (or the arrow of a P at infinity and its text), the drawn points of tangency and the centre
        const marks = declaration.marks!.must;
        expect(marks).toHaveLength((scene.ideal ? 2 : 1) + tangencyFinite + (scene.centre?.kind === 'finite' ? 1 : 0));
        if (!scene.ideal) expect(marks[0]).toEqual({kind: 'point', x: graph.model.p.x / POLE_POLAR_DENOMINATOR, y: graph.model.p.y / POLE_POLAR_DENOMINATOR});
    });

    test('the legend colours differ where the board draws different things, and an unknown id resolves to nothing', () => {
        const graph = new PolePolarGraph();
        mountGraph(graph);
        const colour = (id: string) => graph.drawnObject(id)!.color;
        expect(colour('conic')).not.toBe(colour('polar'));
        expect(colour('polar')).not.toBe(colour('tangents'));
        expect(graph.drawnObject('nothing')).toBeUndefined();
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('the notes follow the language', () => {
        const graph = new PolePolarGraph();
        mountGraph(graph);
        const first = renderMessage(graph.getDeclaration()!.notes![0].text);
        act(() => setLanguage('en'));
        expect(renderMessage(graph.getDeclaration()!.notes![0].text)).not.toBe(first);
    });
});
