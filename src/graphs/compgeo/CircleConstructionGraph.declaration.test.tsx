import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {CircleConstructionGraph} from './CircleConstructionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';
import {deriveCircleConstruction, type CircleMode} from '../../compgeo/circleConstructionModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Circle = {applyCircleAction(action: Record<string, unknown>): void; state: Parameters<typeof deriveCircleConstruction>[0]};
const act2 = (graph: CircleConstructionGraph, ...actions: Record<string, unknown>[]) => act(() => {
    runAs('learner', () => actions.forEach(action => (graph as unknown as Circle).applyCircleAction({kind: 'circle', ...action})));
});
const mode = (value: CircleMode) => ({operation: 'set-mode', mode: value});
const point = (x: number, y: number) => ({operation: 'set-point', x, y});
const circle = (which: string, x: number, y: number, r: number) => ({operation: 'set-circle', circle: which, x, y, r});

/** The number a row's text starts with (an exact rational prints as `p/q ≈ decimal`; the minus is U+2212). */
const numberOf = (text: string): number => {
    const head = text.split('≈')[0].trim().replace('−', '-').replace(',', '.');
    const [num, den] = head.split('/');
    return den === undefined ? Number(num) : Number(num) / Number(den);
};

const states: {name: string; mode: CircleMode; actions: Record<string, unknown>[]; legend: string[]; params: string[]}[] = [
    {name: 'tangents, P outside', mode: 'tangents', actions: [], legend: ['thales', 'chord'], params: ['radius-1']},
    {name: 'tangents, P on the circle', mode: 'tangents', actions: [point(5, 0)], legend: [], params: ['radius-1']},
    {name: 'tangents, P inside', mode: 'tangents', actions: [point(1, 1)], legend: [], params: ['radius-1']},
    {name: 'radical, three circles', mode: 'radical', actions: [mode('radical')], legend: ['axis-0', 'axis-1', 'axis-2', 'centre', 'orthogonal'],
        params: ['radius-1', 'radius-2', 'radius-3']},
    {name: 'radical, concentric', mode: 'radical', actions: [mode('radical'), circle('c2', 0, 0, 3)], legend: ['axis-1', 'axis-2'], params: ['radius-1', 'radius-2', 'radius-3']},
    {name: 'apollonius circle', mode: 'apollonius', actions: [mode('apollonius')], legend: ['locus'], params: ['ratio']},
    {name: 'common, crossing', mode: 'common', actions: [mode('common'), circle('c2', 4, 0, 3)], legend: ['external-tangents', 'internal-centre'],
        params: ['radius-1', 'radius-2']},
];

describe('Circle construction declares through BaseGraph', () => {
    for (const {name, actions, legend, params, mode: expectedMode} of states) {
        test(`${name}: consistent, rows equal the panel and the kernel, legend resolves, radii and ratio are bound`, () => {
            const graph = new CircleConstructionGraph();
            const {view} = mountGraph(graph);
            act2(graph, ...actions);
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            expect(declaration.parameters?.map(parameter => parameter.key)).toEqual(params);
            for (const key of params) expect(graph.parameters!.keys(), key).toContain(key);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});

            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const expected = 'kind' in row.value && row.value.kind === 'formatted' ? row.value.text
                    : 'kind' in row.value && row.value.kind === 'number' ? String(row.value.value) : renderMessage(row.value as never);
                expect(shown, row.id).toBe(expected);
            }
            const text = (id: string) => (rows.find(row => row.id === id)?.value as {text: string} | undefined)?.text ?? '';
            const derived = deriveCircleConstruction((graph as unknown as Circle).state) as unknown as Record<string, any>;
            expect(derived.mode).toBe(expectedMode);
            if (expectedMode === 'tangents' && derived.result.status === 'outside') {
                expect(numberOf(text('power'))).toBeCloseTo(derived.result.power.toNumber(), 9);
                expect(numberOf(text('length'))).toBeCloseTo(derived.result.tangentLength, 3);
            }
            if (expectedMode === 'tangents' && derived.result.status === 'on') expect(numberOf(text('power'))).toBe(0);
            if (expectedMode === 'radical') {
                derived.powers.forEach((power: {toNumber(): number}, index: number) => expect(numberOf(text(`power-${index + 1}`))).toBeCloseTo(power.toNumber(), 9));
                if (derived.centre.status === 'centre') expect(numberOf(text('centre-power'))).toBeCloseTo(derived.centre.power.toNumber(), 9);
            }
            if (expectedMode === 'apollonius') expect(numberOf(text('ratio'))).toBeCloseTo(derived.ratio, 3);
            if (expectedMode === 'common') expect(numberOf(text('distance2'))).toBeCloseTo(derived.distanceSquared.toNumber(), 9);
        });
    }

    test('a puck write of a radius and the ratio reaches the state as a learner write', () => {
        const graph = new CircleConstructionGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('radius-1', 3, 'learner'); });
        expect((graph as unknown as Circle).state).toMatchObject({c1: {r: 3}});
        act2(graph, mode('apollonius'));
        act(() => { graph.parameters!.write('ratio', 1.5, 'learner'); });
        expect((graph as unknown as Circle).state).toMatchObject({k: 1.5});
    });
});
