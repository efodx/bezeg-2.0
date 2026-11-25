import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BisectionGraph, type BisectionIds} from './BisectionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {BISECTION_EXAMPLE_IDS, bisectionHistory, type BisectionExampleId} from '../../analysis/bisection';
import {FOLLOW_MIN_WIDTH, bisectionFollowView, bisectionViewMarks} from './bisectionView';
import {setLanguage} from '../../localization';
import {LessonAction} from '../../learning/model';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const nextStep: LessonAction = {kind: 'animation', animationId: 'bisection', command: 'next-step'};

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenBisectionGraph extends BisectionGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

function setup() {
    const graph = new DrivenBisectionGraph();
    mountGraph(graph);
    return {graph, declaration: () => graph.getDeclaration() as GraphDeclaration<BisectionIds>};
}

/** The lesson's example functions with their lesson brackets (analysisGuidedLessons.ts). */
const LESSON_BRACKETS: readonly [BisectionExampleId, number, number][] = [['square-minus-two', 1, 2], ['sign-step', -1, 1], ['cubic', -1.5, 2]];

describe('Bisection declaration', () => {
    test('is consistent, binds every declared parameter and the view, and offers the three examples', () => {
        const {graph, declaration} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
        expect(graph.parameters!.keys()).toContain('view');
        const choice = current.parameters!.find(parameter => parameter.key === 'bisection-example');
        expect(choice?.kind === 'choice' && choice.options.map(option => option.value)).toEqual([...BISECTION_EXAMPLE_IDS]);
    });

    test('parameter writes through the arbiter change the model as the lesson names do', () => {
        const {graph, declaration} = setup();
        act(() => { graph.parameters!.write('bisection-example', 'cubic', 'lesson'); });
        act(() => { graph.parameters!.write('bisect-a', -1.5, 'lesson'); });
        act(() => { graph.parameters!.write('bisect-b', 2, 'lesson'); });
        expect(graph.parameters!.read('bisect-a')).toBe(-1.5);
        expect(graph.parameters!.read('bisect-b')).toBe(2);
        expect(graph.parameters!.read('bisection-example')).toBe('cubic');
        expect(checkDeclaration(declaration())).toEqual([]);
    });

    test('the followView follows the bracket as steps advance, and a step changes it, an unchanged state does not', () => {
        const {graph, declaration} = setup();
        const first = declaration().followView!;
        expect(declaration().followView).toBe(first); // memoized on the model: the same object for the same state
        expect(declaration().marks).toBe(declaration().marks);
        // The board shows the bracket the revealed step bisected, so the first step still frames the initial bracket (and adds the midpoint); the second one narrows.
        act(() => { graph.applyLessonAction(nextStep); graph.applyLessonAction(nextStep); });
        const second = declaration().followView!;
        expect(second).not.toEqual(first);
        expect(second[2] - second[0]).toBeLessThan(first[2] - first[0]);
        expect(declaration().marks!.must.length).toBe(6); // a, b and the midpoint just revealed, each on the axis and on the curve
    });

    test('the followView is a fit and never writes the stored intent', () => {
        const {graph} = setup();
        const board = (graph as unknown as {boardView: {intent(): {box: readonly number[]}}}).boardView;
        const before = board.intent().box;
        act(() => { graph.applyLessonAction(nextStep); graph.applyLessonAction(nextStep); });
        expect(board.intent().box).toEqual(before);
    });
});

describe('the bisection followView', () => {
    for (const [example, a, b] of LESSON_BRACKETS) {
        test(`${example} on [${a}, ${b}]: contains the bracket at every iteration and shrinks monotonically until the floor`, () => {
            let previousWidth = Infinity;
            let reachedFloor = false;
            for (let step = 0; step <= 30; step++) {
                const history = bisectionHistory(example, a, b, step);
                const [left, top, right, bottom] = bisectionFollowView(history);
                expect(left, `step ${step}`).toBeLessThanOrEqual(history.currentA);
                expect(right, `step ${step}`).toBeGreaterThanOrEqual(history.currentB);
                expect(top, `step ${step}`).toBeGreaterThan(0); // the axis is in view
                expect(bottom, `step ${step}`).toBeLessThan(0);
                const width = right - left;
                expect(width, `step ${step}`).toBeLessThanOrEqual(previousWidth + 1e-12);
                expect(width, `step ${step}`).toBeGreaterThanOrEqual(FOLLOW_MIN_WIDTH - 1e-12);
                if (previousWidth - FOLLOW_MIN_WIDTH < 1e-9) expect(width).toBeCloseTo(FOLLOW_MIN_WIDTH, 9); // at the floor it stays there
                if (width - FOLLOW_MIN_WIDTH < 1e-9) reachedFloor = true;
                previousWidth = width;
                if (history.termination !== undefined) break;
            }
            if (example !== 'sign-step') expect(reachedFloor).toBe(true);
        });
    }

    test('the sign change stays readable at the floor: the curve crosses the axis inside the box', () => {
        const history = bisectionHistory('square-minus-two', 1, 2, 25);
        const [left, top, right, bottom] = bisectionFollowView(history);
        expect(right - left).toBeCloseTo(FOLLOW_MIN_WIDTH, 12);
        expect(left).toBeLessThan(Math.SQRT2);
        expect(right).toBeGreaterThan(Math.SQRT2);
        expect(top).toBeGreaterThan(0);
        expect(bottom).toBeLessThan(0);
    });

    test('the marks keep the bracket ends and the revealed midpoint on the axis and on the curve, and the curve over the bracket', () => {
        const history = bisectionHistory('square-minus-two', 1, 2, 2);
        const marks = bisectionViewMarks(history);
        const f = (x: number) => x * x - 2;
        const mid = history.steps[1].mid;
        for (const x of [history.steps[1].a, history.steps[1].b, mid]) {
            expect(marks.must).toContainEqual({kind: 'point', x, y: 0});
            expect(marks.must).toContainEqual({kind: 'point', x, y: f(x)});
        }
        expect(marks.nice?.[0]).toMatchObject({kind: 'polyline'});
        expect(bisectionViewMarks(bisectionHistory('square-minus-two', 1, 2, 0)).must).toHaveLength(4);
    });

    test('the followView frames f(a), f(b) and f(m) at every iteration of the lesson examples', () => {
        const {graph, declaration} = setup();
        for (const [example, a, b] of LESSON_BRACKETS) {
            act(() => { graph.parameters!.write('bisection-example', example, 'lesson'); });
            act(() => { graph.parameters!.write('bisect-a', a, 'lesson'); });
            act(() => { graph.parameters!.write('bisect-b', b, 'lesson'); });
            for (let step = 0; step < 6; step++) {
                const [left, top, right, bottom] = declaration().followView!;
                for (const mark of declaration().marks!.must) {
                    if (mark.kind !== 'point') continue;
                    expect(mark.x, `${example} step ${step}`).toBeGreaterThanOrEqual(left);
                    expect(mark.x, `${example} step ${step}`).toBeLessThanOrEqual(right);
                    expect(mark.y, `${example} step ${step}`).toBeLessThan(top);
                    expect(mark.y, `${example} step ${step}`).toBeGreaterThan(bottom);
                }
                act(() => { graph.applyLessonAction(nextStep); });
            }
        }
    });
});
