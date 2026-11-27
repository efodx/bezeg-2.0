import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import ParametricCurveGraph, {type ParametricIds} from './ParametricCurveGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import {curveViewBox} from './parametricCatalogue';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: ParametricCurveGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new ParametricCurveGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<ParametricIds>};
}

const curve = (id: 'cycloid' | 'cardioid' | 'rose' | 'spiral'): Step => g => learner(() => g.setCurve(id));
const at = (parameter: number): Step => g => learner(() => g.setParameter(parameter));

const rows = (current: GraphDeclaration<ParametricIds>) => current.readouts![0].rows;
const rowIds = (current: GraphDeclaration<ParametricIds>) => rows(current).map(row => row.id as string);
const rowValue = (current: GraphDeclaration<ParametricIds>, id: string) => (rows(current).find(row => row.id === id)?.value as {value: number} | undefined)?.value;
const legendIds = (current: GraphDeclaration<ParametricIds>) => (current.legend ?? []).map(entry => entry.id as string);
const noteIds = (current: GraphDeclaration<ParametricIds>) => (current.notes ?? []).map(note => note.id as string);

describe('curve-parametric declaration', () => {
    test('the default cycloid: t and R pucks, velocity rows, length and area, a legend of what is drawn, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['parametric-t', 'parametric-radius']);
        expect(rowIds(current)).toEqual(['velocity', 'speed', 'length', 'area']);
        expect(rowValue(current, 'speed')).toBeCloseTo(Math.SQRT2, 9);
        expect(rowValue(current, 'length')).toBeCloseTo(8, 6);
        expect(rowValue(current, 'area')).toBeCloseTo(3 * Math.PI, 6);
        expect(noteIds(current)).toEqual([]);
        expect(legendIds(current)).toEqual(['curve', 'velocity', 'circle']);
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        view.unmount();
    });

    test('at the cusp the velocity rows and the velocity legend entry go and the stopped note comes', () => {
        const {declaration, view, graph} = setup(at(2 * Math.PI));
        expect(rowIds(declaration())).toEqual(['length', 'area']);
        expect(noteIds(declaration())).toEqual(['stopped']);
        expect(legendIds(declaration())).not.toContain('velocity');
        expect(graph.drawnObject('velocity')!.visible).toBe(false);
        expect(checkDeclaration(declaration())).toEqual([]);
        act(() => at(1)(graph));
        expect(noteIds(declaration())).toEqual([]);
        expect(legendIds(declaration())).toContain('velocity');
        view.unmount();
    });

    test('a polar curve declares the angle puck only, the ray row (signed) and the ray legend entry instead of the circle', () => {
        const {declaration, view, graph} = setup(curve('spiral'), at(Math.PI));
        const current = declaration();
        expect(current.parameters?.map(parameter => [parameter.key, parameter.symbol])).toEqual([['parametric-t', '\\theta']]);
        expect(rowIds(current)).toEqual(['velocity', 'speed', 'ray', 'length', 'area']);
        expect(rowValue(current, 'ray')).toBeCloseTo(Math.PI, 9);
        expect(legendIds(current)).toEqual(['curve', 'velocity', 'ray']);
        expect(graph.drawnObject('ray')!.visible).toBe(true);
        expect(graph.drawnObject('circle')).toBeUndefined();
        act(() => curve('rose')(graph));
        act(() => at(Math.PI / 3)(graph));
        expect(rowValue(declaration(), 'ray')).toBeCloseTo(-1, 9);
        expect(checkDeclaration(declaration())).toEqual([]);
        view.unmount();
    });

    test('the radius changes the length and the area', () => {
        const {declaration, view, graph} = setup();
        act(() => { graph.parameters!.write('parametric-radius', 2, 'learner'); });
        expect(graph.state.radius).toBe(2);
        expect(rowValue(declaration(), 'length')).toBeCloseTo(16, 6);
        expect(rowValue(declaration(), 'area')).toBeCloseTo(12 * Math.PI, 6);
        view.unmount();
    });

    test('t writes through the arbiter and pauses the roll; a value outside the domain is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => graph.playRoll());
        expect(graph.rolling).toBe(true);
        act(() => { graph.parameters!.write('parametric-t', 1, 'learner'); });
        expect(graph.state.parameter).toBe(1);
        expect(graph.rolling).toBe(false);
        const bad = graph.parameters!.write('parametric-t', 7, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(bad.status === 'refused-domain' ? bad.error.message : '').toMatch(/od 0 do 6,2832/);
        expect(graph.state.parameter).toBe(1);
        view.unmount();
    });

    test('the trace is not in the legend while a prediction step has drawn nothing of it yet', () => {
        const {declaration, view, graph} = setup(at(0));
        act(() => { graph.setState({traceFull: false}); });
        expect(legendIds(declaration())).not.toContain('curve');
        expect(graph.drawnObject('curve')!.visible).toBe(false);
        act(() => { graph.setState({traceFull: true}); });
        expect(legendIds(declaration())).toContain('curve');
        view.unmount();
    });

    test('the marks and the followed view box are the fitted curve box, not the lesson scene box widened to the canvas', () => {
        const {declaration, view, graph} = setup();
        const box = curveViewBox(graph.state);
        expect(declaration().followView).toEqual(box);
        expect(declaration().marks!.must).toEqual([{kind: 'box', left: box[0], top: box[1], right: box[2], bottom: box[3]}]);
        act(() => curve('rose')(graph));
        expect(declaration().followView).toEqual(curveViewBox(graph.state));
        expect(declaration().followView![2]).toBeLessThan(2);
        view.unmount();
    });

    test('no board text repeats the rows', () => {
        const {graph, view} = setup();
        const elements = (graph as unknown as {scene: {ownedElements(): readonly {elType: string}[]}}).scene.ownedElements();
        expect(elements.filter(element => element.elType === 'text')).toEqual([]);
        view.unmount();
    });

    test('the sentences follow a language switch', () => {
        const {declaration, view} = setup(at(2 * Math.PI));
        expect(renderMessage(declaration().notes![0].text as Message)).toBe('Hitrost je 0 (ost): vektor hitrosti in tangenta nista narisana');
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![0].text as Message)).toBe('The speed is 0 (cusp): the velocity vector and tangent are not drawn');
        view.unmount();
    });
});
