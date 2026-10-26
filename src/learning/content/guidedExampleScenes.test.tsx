import {act} from '@testing-library/react';
import {graphFactories} from '../../graphs/graphFactories';
import {installBoardShims, mountGraph} from '../../graphs/base/realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {familyChapters} from './familyChapters';
import type {LessonAction} from '../model';
import {resolveGuidedExample} from '../chapter/guidedExamples';

beforeAll(installBoardShims);

const familyExamples = familyChapters.flatMap(chapter => chapter.sections.flatMap(section =>
    Object.keys(section.investigationPrompts ?? {}).map(demonstrationId => ({
        chapterId: chapter.id, sectionId: section.id, demonstrationId: demonstrationId as DemonstrationId,
    })).filter(example => section.demonstrationIds?.includes(example.demonstrationId))));

function applyExample(id: DemonstrationId, actions: readonly LessonAction[]): Readonly<Record<string, unknown>> {
    const mounted = mountGraph(graphFactories[id]());
    try {
        const graph = mounted.graph as typeof mounted.graph & {getFirstJxgCurve(): {getCurve(): {eval(t: number): {X(): number; Y(): number}}}};
        act(() => {
            const capabilities = mounted.graph.getLessonCapabilities();
            for (const action of actions) capabilities.apply(action);
        });
        const sceneState = mounted.graph.state as unknown as Readonly<Record<string, unknown>>;
        if (id === 'spline-c1' && actions.some(action => action.kind === 'prepared-scene' && action.sceneId === 'worked-parabola-join')) {
            const spline = graph.getFirstJxgCurve().getCurve();
            const left = spline.eval(0.25), join = spline.eval(0.5), right = spline.eval(0.75);
            expect([left.X(), left.Y()]).toEqual([0.5, 0.25]);
            expect([join.X(), join.Y()]).toEqual([1, 1]);
            expect([right.X(), right.Y()]).toEqual([1.5, 2.25]);
            const before = spline.eval(0.5 - 1e-6), after = spline.eval(0.5 + 1e-6);
            expect((join.X() - before.X()) / 1e-6).toBeCloseTo((after.X() - join.X()) / 1e-6, 4);
            expect((join.Y() - before.Y()) / 1e-6).toBeCloseTo((after.Y() - join.Y()) / 1e-6, 4);
            const secondAtJoin = (side: 'left' | 'right') => {
                const h = 1e-3;
                const points = side === 'left'
                    ? [spline.eval(0.5), spline.eval(0.5 - h), spline.eval(0.5 - 2 * h)]
                    : [spline.eval(0.5 + 2 * h), spline.eval(0.5 + h), spline.eval(0.5)];
                const second = (coordinate: 'X' | 'Y') => (points[0][coordinate]() - 2 * points[1][coordinate]() + points[2][coordinate]()) / (h * h);
                return {x: second('X'), y: second('Y')};
            };
            expect(secondAtJoin('left').x).toBeCloseTo(0, 3);
            expect(secondAtJoin('right').x).toBeCloseTo(0, 3);
            expect(secondAtJoin('left').y).toBeCloseTo(8, 3);
            expect(secondAtJoin('right').y).toBeCloseTo(8, 3);
        }
        return sceneState;
    } finally {
        mounted.view.unmount();
    }
}

describe('family guided examples apply to their real demonstration graphs', () => {
    test.each(familyExamples.map(example => [example.chapterId, example.sectionId, example.demonstrationId] as const))(
        '%s / %s / %s', (chapterId, sectionId, rawId) => {
            const id = rawId as DemonstrationId;
            const resolved = resolveGuidedExample(`?explore=${encodeURIComponent(`${chapterId}.${sectionId}.${id}`)}`, id);
            const actions = resolved?.lesson.steps[0].scene?.actions;
            expect(resolved?.owner).toEqual({chapterId, sectionId});
            expect(resolved?.lesson.steps[0].prompt).toBeDefined();
            expect(actions?.length).toBeGreaterThan(0);
            expect(actions?.[0]?.kind).toBe('prepared-scene');
            const initialState = applyExample(id, actions!);
            if (id === 'continuity') expect(initialState).toMatchObject({a: 1});
            if (id === 'derivative') expect(initialState).toMatchObject({fn: 'square', x0: 1, h: 1});
            if (id === 'definite-integral') expect(initialState).toMatchObject({fn: 'square', a: 0, b: 2, n: 4, method: 'left'});
            if (id === 'arc-length') expect(initialState).toMatchObject({a: 0, b: Math.PI, n: 1});
        },
    );
});
