import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import DegreeReductionGraph, {REDUCTION_P2_POINTS, REDUCTION_P_POINTS} from './DegreeReductionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, t} from '../../../localization';
import {formatNumber} from '../../../analysis/format';
import {controlPointBound, l2Error, maxCurveError, reduce, thirdDifference} from '../../../bezeg/impl/kernels/degree-reduction';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {performAction(id: string): void; drawnObject(id: string): {color: string; visible: boolean} | undefined};
type Points = ReadonlyArray<readonly [number, number]>;

const states: {name: string; run: (graph: DegreeReductionGraph, probe: Probe) => void; points: Points; mode: 'fixed' | 'free'; mustPoints: number; legend: string[]}[] = [
    {name: 'default', run: () => undefined, points: [[0, 0], [4 / 3, 8 / 3], [8 / 3, 8 / 3], [4, 0]], mode: 'fixed', mustPoints: 7,
        legend: ['curve-0', 'control-points-0', 'reduced', 'reduced-points']},
    {name: 'P', run: graph => graph.setControlPoints(REDUCTION_P_POINTS as never), points: REDUCTION_P_POINTS as never, mode: 'fixed', mustPoints: 7,
        legend: ['curve-0', 'control-points-0', 'reduced', 'reduced-points']},
    {name: 'P free', run: (graph, probe) => { graph.setControlPoints(REDUCTION_P_POINTS as never); probe.performAction('reduction-free'); }, points: REDUCTION_P_POINTS as never,
        mode: 'free', mustPoints: 7, legend: ['curve-0', 'control-points-0', 'reduced', 'reduced-points']},
    {name: 'P2 with the elevated net', run: (graph, probe) => { graph.setControlPoints(REDUCTION_P2_POINTS as never); probe.performAction('reduction-elevation-shown'); },
        points: REDUCTION_P2_POINTS as never, mode: 'fixed', mustPoints: 11, legend: ['curve-0', 'control-points-0', 'reduced', 'reduced-points', 'elevated-net']},
    {name: 'quadratic hidden', run: (graph, probe) => { graph.setControlPoints(REDUCTION_P_POINTS as never); probe.performAction('reduction-shown'); },
        points: REDUCTION_P_POINTS as never, mode: 'fixed', mustPoints: 4, legend: ['curve-0', 'control-points-0']},
    {name: 'a flat cubic', run: graph => graph.setControlPoints([[0, 0], [1, 0], [2, 0], [3, 0]]), points: [[0, 0], [1, 0], [2, 0], [3, 0]], mode: 'fixed', mustPoints: 7,
        legend: ['curve-0', 'control-points-0', 'reduced', 'reduced-points']},
];

const num = (value: number, places = 4) => formatNumber(value, 'sl', places);

describe('Degree reduction declares through the curve workspace', () => {
    for (const {name, run, points, mode, mustPoints, legend} of states) {
        test(`${name}: consistent, readouts equal the kernel, legend resolves, marks hold the reduced points`, () => {
            const graph = new DegreeReductionGraph();
            mountGraph(graph);
            act(() => run(graph, graph as unknown as Probe));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            const cubic = points.map(p => [...p]);
            const quadratic = reduce(cubic, mode);
            const third = thirdDifference(cubic);
            const words = (declaration.notes ?? []).map(note => renderMessage(note.text));
            expect(words[0], 'third difference against the kernel').toBe(t('reduction_readout_third', {value0: num(third[0]), value1: num(third[1])}));
            expect(words[2], 'maximum error against the kernel').toBe(t('reduction_readout_max_error', {value0: num(maxCurveError(cubic, quadratic))}));
            expect(words[3], 'L2 error against the kernel').toBe(t('reduction_readout_l2_error', {value0: num(l2Error(cubic, quadratic), 6)}));
            expect(words[4], 'bound against the kernel').toBe(t('reduction_readout_bound', {value0: num(controlPointBound(cubic, quadratic))}));
            expect(declaration.notes?.map(note => note.id)).toEqual(['third', 'reducible', 'max-error', 'l2-error', 'bound']);
            for (const entry of declaration.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            expect(declaration.marks?.must).toHaveLength(mustPoints);
        });
    }

    test('the end-point choice is one board puck group, the switches stay in Orodja and flip `pressed`', () => {
        const graph = new DegreeReductionGraph();
        mountGraph(graph);
        const probe = graph as unknown as Probe;
        const actions = () => new Map((graph.getDeclaration()?.actions ?? []).map(action => [action.id as string, action]));
        expect([...actions().keys()]).toEqual(['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0', 'reduction-fixed', 'reduction-free', 'reduction-shown', 'reduction-elevation-shown']);
        for (const id of ['reduction-fixed', 'reduction-free']) {
            const puck = actions().get(id)!.puck;
            expect(actions().get(id)).toMatchObject({placement: 'board'});
            expect(puck && puck !== true && puck.group.key).toBe('reduction-mode');
        }
        expect(actions().get('reduction-fixed')!.pressed).toBe(true);
        expect(actions().get('reduction-free')!.pressed).toBe(false);
        expect(actions().get('reduction-shown')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(actions().get('reduction-elevation-shown')).toMatchObject({placement: 'tools', section: 'display', pressed: false});
        act(() => probe.performAction('reduction-free'));
        expect(graph.state.reductionMode).toBe('free');
        expect(actions().get('reduction-free')!.pressed).toBe(true);
        expect(actions().get('reduction-fixed')!.pressed).toBe(false);
        act(() => probe.performAction('reduction-elevation-shown'));
        expect(actions().get('reduction-elevation-shown')!.pressed).toBe(true);
        act(() => probe.performAction('reduction-shown'));
        expect(actions().get('reduction-shown')!.pressed).toBe(false);
        expect(() => probe.performAction('nope')).toThrow('Unknown action');
    });

    test('the notes follow the language and the tolerance sentence is the readout help', () => {
        const graph = new DegreeReductionGraph();
        mountGraph(graph);
        act(() => graph.setControlPoints(REDUCTION_P_POINTS as never));
        act(() => setLanguage('en'));
        const declaration = graph.getDeclaration() as GraphDeclaration;
        expect(renderMessage(declaration.notes![1].text)).toBe(t('reduction_readout_not_reducible'));
        expect(renderMessage(declaration.notes![3].text)).toBe(t('reduction_readout_l2_error', {value0: '0.069007'}));
        expect(declaration.readoutHelp && renderMessage(declaration.readoutHelp)).toBe(t('reduction_help_tolerance'));
    });
});
