import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import AffineTransformsBezierCurveGraph from './AffineTransformsBezierCurveGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {applyLessonAction(action: unknown): void; performAction(id: string): void; drawnObject(id: string): {color: string; visible: boolean} | undefined};

const at = (parameter: number) => ({kind: 'curve-evaluation', parameter});
const op = (operation: string, value: number) => ({kind: 'affine-transform', operation, value});

/** Each state: the lesson actions applied to the default curve, and the two computations of the shown point (equal, by affine invariance). */
const states: {name: string; actions: unknown[]; rows: string | undefined}[] = [
    {name: 'nothing transformed', actions: [at(0.5)], rows: undefined},
    {name: 'translated', actions: [at(0.5), op('translate-x', -2), op('translate-y', -1)], rows: '(−1,63; −1)'},
    {name: 'scaled by 2', actions: [at(0.25), op('scale', 2)], rows: undefined},
    {name: 'turned and scaled', actions: [at(0.5), op('rotate', Math.PI / 2), op('scale', 2)], rows: undefined},
    {name: 'reflected', actions: [at(0.75), op('reflect-x', 1)], rows: undefined},
];

const rowsOf = (declaration: GraphDeclaration) => declaration.readouts?.flatMap(group => group.rows) ?? [];

describe('affine transformations declare through BaseCurveGraph', () => {
    for (const {name, actions, rows} of states) {
        test(`${name}: consistent, legend resolves, the two computations of the point agree`, () => {
            const graph = new AffineTransformsBezierCurveGraph();
            mountGraph(graph);
            act(() => runAs('learner', () => { for (const action of actions) (graph as unknown as Probe).applyLessonAction(action); }));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toBeDefined();
            const found = rowsOf(declaration);
            if (actions.length === 1) {
                expect(found).toEqual([]);
                expect(declaration.notes).toEqual([]);
            } else {
                expect(found.map(row => row.id)).toEqual(['affine-mapped-reference', 'affine-moved-points']);
                const [mapped, moved] = found.map(row => (row.value as {text: string}).text);
                expect(mapped).toBe(moved);
                if (rows) expect(mapped).toBe(rows);
                expect(declaration.notes).toHaveLength(1);
                expect(declaration.marks!.nice!.filter(mark => mark.kind === 'polyline').length).toBe(2);
            }
        });
    }

    test('the dashed original curve is part of the marks and follows the transformation', () => {
        const graph = new AffineTransformsBezierCurveGraph();
        mountGraph(graph);
        const before = (graph.getDeclaration() as GraphDeclaration).marks!.nice!.length;
        act(() => runAs('learner', () => { (graph as unknown as Probe).applyLessonAction(at(0.5)); (graph as unknown as Probe).applyLessonAction(op('translate-x', 3)); }));
        expect((graph.getDeclaration() as GraphDeclaration).marks!.nice!.length).toBe(before + 1);
    });

    test('the display switches are actions; control polygon and hull are board pucks', () => {
        const graph = new AffineTransformsBezierCurveGraph();
        mountGraph(graph);
        const actions = () => new Map((graph.getDeclaration()?.actions ?? []).map(action => [action.id as string, action]));
        expect(actions().get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        const before = actions().get('control-polygon-0')!.pressed;
        act(() => (graph as unknown as Probe).performAction('control-polygon-0'));
        expect(actions().get('control-polygon-0')!.pressed).toBe(!before);
    });
});
