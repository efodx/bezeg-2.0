import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LineGeometryGraph, type LineGeometryIds, shownHandles} from './LineGeometryGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const at = (x: number, y: number) => ({x, y});
const fresh = {target: 'lines', P: at(-2, 1), Q: at(4, 4), R: at(3, -2), S: at(2, 0), T: at(3, -2), O: at(1, 0), B: at(3, 1)};

function setup(state: Record<string, unknown>) {
    const graph = new LineGeometryGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...fresh, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<LineGeometryIds>};
}

const states: {name: string; state: Record<string, unknown>; row: string; value: string; status: string}[] = [
    {name: 'forms', state: {mode: 'forms'}, row: 'explicit', value: 'y = (1/2)x + 2', status: 'Premica x − 2y = −4 ima implicitno, eksplicitno in odsekovno obliko.'},
    {name: 'forms, vertical', state: {mode: 'forms', P: at(3, -1), Q: at(3, 4)}, row: 'vertical', value: 'da, x = 3', status: 'Navpična premica x = 3: eksplicitne oblike ni, ker smerni koeficient ni določen.'},
    {name: 'normal, perpendicular', state: {mode: 'normal'}, row: 'dot', value: '0', status: 'Skalarni produkt normalnih vektorjev je 0, zato sta premici pravokotni.'},
    {name: 'angle', state: {mode: 'angle'}, row: 'angle', value: '90°', status: 'Premici sta pravokotni, kot med njima je 90°.'},
    {name: 'distance', state: {mode: 'distance'}, row: 'distance-squared', value: '121/5', status: 'Razdalja točke T od premice: d² = 121/5, d ≈ 4,9193.'},
    {name: 'intersect lines', state: {mode: 'intersect'}, row: 'point', value: '(4/5; 12/5)', status: 'Presečišče premic je (4/5; 12/5).'},
    {name: 'intersect circle', state: {mode: 'intersect', target: 'circle', O: at(0, 0), B: at(3, 1)}, row: 'discriminant', value: '34', status: 'Premica seka krožnico v dveh točkah (diskriminanta 34).'},
    {name: 'coincident points', state: {mode: 'forms', Q: at(-2, 1)}, row: '', value: '', status: 'Točki P in Q sovpadata, zato ne določata premice.'},
];

describe('Line geometry declaration', () => {
    for (const {name, state, row, value, status} of states) {
        test(`${name}: consistent, the rows of the panel, the status as a note`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);

            // only the intersect mode has a puck (the target, bound); the mode is an Orodja choice, the points are handles
            const params = (current.parameters ?? []).map(entry => entry.key);
            expect(params).toEqual(state.mode === 'intersect' ? ['lines-target'] : []);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(entry).toMatchObject({kind: 'choice', placement: 'board', puck: true});
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
                if (entry.kind === 'choice') expect(entry.options.length).toBeLessThanOrEqual(4);
            }
            expect(current.actions ?? []).toEqual([]);
            expect(current.legend ?? []).toEqual([]);

            // the declared rows are the old panel's rows, with the values of the model
            const rows = current.readouts![0].rows;
            expect(rows.map(entry => entry.id)).toEqual(graph.readoutRows().map(entry => entry.id));
            if (row) expect(graph.readoutRows().find(entry => entry.id === row)?.value).toBe(value);
            else expect(rows).toEqual([]);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(status);
            expect(graph.statusText()).toBe(status);

            // every shown handle is something the view keeps in sight
            const points = current.marks!.must!.filter(mark => mark.kind === 'point');
            expect(points.length).toBeGreaterThanOrEqual(shownHandles(graph.state).length);
            view.unmount();
        });
    }

    test('the target puck writes, reads back and refuses an unknown option', () => {
        const {graph, view} = setup({mode: 'intersect'});
        act(() => { graph.parameters!.write('lines-target', 'circle', 'learner'); });
        expect(graph.parameters!.read('lines-target')).toBe('circle');
        expect(graph.state.target).toBe('circle');
        expect(graph.parameters!.write('lines-target', 'cone', 'learner').status).not.toBe('applied');
        expect(graph.state.target).toBe('circle');
        view.unmount();
    });
});
