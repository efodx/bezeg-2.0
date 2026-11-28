import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {CltGraph} from './CltGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {CLT_N_MAX, cltView, fitCltView, type CltModel} from '../../analysis/cltModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenCltGraph extends CltGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
    modelNow() { return this.model; }
}

const parameter = (value: number): LessonAction => ({kind: 'function-parameter', name: 'clt-n', value});
const example = (value: string): LessonAction => ({kind: 'function-choice', name: 'clt-example', value});
const cdf = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'clt-cdf', visible});

const states: {name: string; actions: LessonAction[]; max?: boolean}[] = [
    {name: 'default', actions: []},
    {name: 'n 3', actions: [parameter(3)]},
    {name: 'skewed n 3', actions: [example('skewed'), parameter(3)]},
    {name: 'skewed n 10, CDF', actions: [example('skewed'), parameter(10), cdf(true)]},
    {name: 'n 30', actions: [parameter(CLT_N_MAX)], max: true},
];

const ROWS = ['n', 'mean', 'variance', 'sum-mean', 'sum-variance', 'kolmogorov', 'mass-residual'];

describe('Central limit theorem declares its panel, the copies puck, the CDF switch, the playback actions and the legend', () => {
    for (const {name, actions, max} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves, no caption`, () => {
            const graph = new DrivenCltGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key)).toEqual(['clt-n']);
            expect(declaration.parameters?.[0].kind).toBe('count');
            expect(declaration.actions?.map(entry => entry.id)).toEqual(['next-step', 'play', 'reset', 'cdf']);
            const model: CltModel = graph.modelNow();
            expect(declaration.actions?.find(entry => entry.id === 'cdf')?.pressed).toBe(model.cdf);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(ROWS);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            // The values come from the kernel, not from the declaration under test.
            const result = cltView(model);
            if (!result.ok) throw new Error('view failed');
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            expect(text('n')).toBe(String(model.n));
            expect(text('mean')).toBe(formatNumber(result.view.mean, 'sl', 4));
            expect(text('sum-variance')).toBe(formatNumber(result.view.sumVariance, 'sl', 4));
            expect(text('kolmogorov')).toBe(formatNumber(result.view.kolmogorov, 'sl', 5));
            // The maximum is declared and shown once, in the readout panel; the board carries no caption.
            const statuses = declaration.status ?? [];
            if (max) expect(renderMessage(statuses[0].text)).toMatch(/Več kot 30 seštevancev/);
            else expect(statuses).toEqual([]);
            expect(graph.captionPlainLines()).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['sum', 'normal']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('sum')).toEqual({color: '#2468a2', visible: true});
            expect(graph.drawnObject('normal')).toEqual({color: '#bd6047', visible: true});
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the marks are the two curves; must names the normal curve at -3, 0 and 3 and the top of the sum (lesson step 3: n = 5)', () => {
        const graph = new DrivenCltGraph();
        mountGraph(graph);
        act(() => { graph.applyLessonAction(parameter(5)); });
        const marks = graph.getDeclaration()!.marks!;
        expect(marks.nice?.length).toBe(2);
        // the standard normal density peaks at 1 / sqrt(2 pi) = 0.3989 at x = 0
        const peak = marks.must.find(mark => mark.kind === 'point' && mark.x === 0);
        expect(peak?.kind === 'point' && peak.y).toBeCloseTo(0.3989, 3);
        expect(marks.must.filter(mark => mark.kind === 'point' && Math.abs(mark.x) === 3)).toHaveLength(2);
        expect(marks.must).toHaveLength(4);
    });

    test('the frame follows the base shape and the density or CDF choice, not the lesson scene stored box', () => {
        const graph = new DrivenCltGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()!.followView).toEqual(fitCltView(graph.modelNow()));
        act(() => { graph.applyLessonAction(example('skewed')); graph.applyLessonAction(cdf(true)); });
        expect(graph.getDeclaration()!.followView).toEqual(fitCltView(graph.modelNow()));
        expect(graph.getDeclaration()!.followView).toEqual([-6, 1.2, 6, -0.12]);
    });

    test('the distribution function is an action: pressed follows the model and performAction flips it', () => {
        const graph = new DrivenCltGraph();
        mountGraph(graph);
        act(() => { graph.performAction('cdf'); });
        expect(graph.modelNow().cdf).toBe(true);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'cdf')!.pressed).toBe(true);
        act(() => { graph.performAction('cdf'); });
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'cdf')!.pressed).toBe(false);
        expect(() => graph.performAction('other')).toThrow();
    });

    test('the playback actions follow the model: Reset is enabled after a step, Next step is not at n = 30', () => {
        const graph = new DrivenCltGraph();
        mountGraph(graph);
        const action = (id: string) => graph.getDeclaration()!.actions!.find(entry => entry.id === id)!;
        expect(action('reset').enabled).toBe(false);
        act(() => { graph.performAction('next-step'); });
        expect(graph.modelNow().n).toBe(2);
        expect(action('reset').enabled).toBe(true);
        act(() => { graph.applyLessonAction(parameter(CLT_N_MAX)); });
        expect(action('next-step').enabled).toBe(false);
        expect(action('play').enabled).toBe(false);
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenCltGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('clt-n', 12, 'learner'); });
        expect(graph.parameters!.read('clt-n')).toBe(12);
        act(() => { graph.parameters!.write('clt-n', 31, 'learner'); });
        expect(graph.parameters!.read('clt-n')).toBe(12);
        act(() => { graph.parameters!.write('clt-n', 2.5, 'learner'); });
        expect(graph.parameters!.read('clt-n')).toBe(12);
    });
});
