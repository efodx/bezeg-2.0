/**
 * Lesson and activity content applied to the real graphs: every scene of every Guided lesson and the actions of every
 * Chapter activity go to the real graph of their Demonstration (`graphFactories`, mounted through the real `GraphHost`),
 * synchronously and in order, the way a lesson session applies them. A value a graph rejects fails here, so limits
 * stay a graph-side fact and content is checked against them without restating them.
 */
import {act} from '@testing-library/react';
import {graphFactories} from '../../graphs/graphFactories';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonAction} from '../model';
import {activities} from '../chapter/activities';
import {getLessonForDemonstration, GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonCatalog';
import {installBoardShims, mountGraph} from '../../graphs/base/realGraphTestHarness';
import {BERNSTEIN_MAX_DEGREE} from '../../graphs/bernstein/BernsteinGraph';
import {SUBDIVISION_T_MAX, SUBDIVISION_T_MIN} from '../../graphs/curves/bezier/SubdivisionGraph1';
import {EXTRAPOLATION_T_MAX, EXTRAPOLATION_T_MIN} from '../../graphs/curves/object/AbstractJXGBezierCurve';
import {OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from '../../graphs/curves/object/JXGPHBezierCurve';
import {
    ALPHA_PARAM_MAX_SAMPLES,
    ALPHA_PARAM_MIN_SAMPLES,
    PARAMETERIZATION_ALPHA_MAX,
    PARAMETERIZATION_ALPHA_MIN,
    SPLINE_ALPHA_MAX_SAMPLES,
    SPLINE_ALPHA_MIN_SAMPLES,
} from '../../graphs/curves/parametrisations/parametrisationLimits';

beforeAll(installBoardShims);

/** Applies the actions in one synchronous sequence and names every action the graph rejected. */
function rejections(id: DemonstrationId, where: string, actionsByScene: ReadonlyArray<{where: string; actions: readonly LessonAction[]}>): string[] {
    const mounted = mountGraph(graphFactories[id]());
    try {
        const capabilities = mounted.graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const failures: string[] = [];
        for (const scene of actionsByScene) {
            act(() => {
                capabilities.restoreState(checkpoint);
                for (const action of scene.actions) {
                    try {
                        capabilities.apply(action);
                    } catch (error) {
                        failures.push(`${where} ${scene.where}: ${JSON.stringify(action)} -> ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            });
        }
        return failures;
    } finally {
        mounted.view.unmount();
    }
}

describe('Guided lesson scenes are accepted by their Demonstration graph', () => {
    test.each([...GUIDED_LESSON_AVAILABLE_IDS])('%s', id => {
        const lesson = getLessonForDemonstration(id)!;
        const scenes = lesson.steps.filter(step => step.scene).map(step => ({where: step.id, actions: step.scene!.actions}));
        expect(scenes.length).toBeGreaterThan(0);
        expect(rejections(id, id, scenes)).toEqual([]);
    });
});

describe('Chapter activity actions are accepted by their Demonstration graph', () => {
    test.each(activities.map(activity => [activity.id, activity] as const))('%s', (_id, activity) => {
        expect(rejections(activity.demonstrationId, activity.id, [{where: activity.id, actions: activity.actions}])).toEqual([]);
    });
});

/**
 * Each limit is defined by the module that enforces it, and a scene action is valid only against the limits of the
 * Demonstration it targets. These cases also show that this test fails when a graph rejects a value: the boundary
 * values come from the exported limits, so a changed limit moves the boundary instead of breaking the test.
 */
describe('scene action limits belong to the target Demonstration', () => {
    function acceptedBy(id: DemonstrationId, action: LessonAction): boolean {
        return rejections(id, id, [{where: 'probe', actions: [action]}]).length === 0;
    }

    const probe = (id: DemonstrationId, inside: LessonAction[], outside: LessonAction[]) => {
        expect(inside.filter(action => !acceptedBy(id, action))).toEqual([]);
        expect(outside.filter(action => acceptedBy(id, action))).toEqual([]);
    };
    const samples = (count: number): LessonAction => ({kind: 'parameterization-samples', count});

    test('parameterization samples differ between the weighted, uniform and spline Demonstrations', () => {
        probe('weighted-parameterization', [samples(ALPHA_PARAM_MIN_SAMPLES), samples(ALPHA_PARAM_MAX_SAMPLES)],
            [samples(ALPHA_PARAM_MIN_SAMPLES - 1), samples(ALPHA_PARAM_MAX_SAMPLES + 1), samples(SPLINE_ALPHA_MAX_SAMPLES)]);
        probe('uniform-parameterization', [samples(ALPHA_PARAM_MIN_SAMPLES), samples(ALPHA_PARAM_MAX_SAMPLES)],
            [samples(ALPHA_PARAM_MIN_SAMPLES - 1), samples(ALPHA_PARAM_MAX_SAMPLES + 1), samples(SPLINE_ALPHA_MAX_SAMPLES)]);
        probe('spline-parameterization', [samples(SPLINE_ALPHA_MIN_SAMPLES), samples(SPLINE_ALPHA_MAX_SAMPLES)],
            [samples(SPLINE_ALPHA_MIN_SAMPLES - 1), samples(SPLINE_ALPHA_MAX_SAMPLES + 1)]);
    });

    test.each(['weighted-parameterization', 'uniform-parameterization', 'spline-parameterization'] as const)('%s: alpha', id => {
        const alpha = (value: number): LessonAction => ({kind: 'parameterization-alpha', value});
        probe(id, [alpha(PARAMETERIZATION_ALPHA_MIN), alpha(PARAMETERIZATION_ALPHA_MAX)],
            [alpha(PARAMETERIZATION_ALPHA_MIN - 0.1), alpha(PARAMETERIZATION_ALPHA_MAX + 0.1)]);
    });

    test('Bernstein degree', () => {
        const degree = (value: number): LessonAction => ({kind: 'bernstein-degree', degree: value});
        probe('bernstein', [degree(0), degree(BERNSTEIN_MAX_DEGREE)], [degree(-1), degree(BERNSTEIN_MAX_DEGREE + 1)]);
    });

    test.each(['subdivision', 'rational-subdivision'] as const)('%s: subdivision parameter', id => {
        const t = (value: number): LessonAction => ({kind: 'subdivision-parameter', value});
        probe(id, [t(SUBDIVISION_T_MIN), t(SUBDIVISION_T_MAX)], [t(0), t(1)]);
    });

    test.each(['extrapolation', 'rational-extrapolation'] as const)('%s: extrapolation parameter', id => {
        const t = (value: number): LessonAction => ({kind: 'extrapolation-parameter', value});
        probe(id, [t(EXTRAPOLATION_T_MIN), t(EXTRAPOLATION_T_MAX)], [t(EXTRAPOLATION_T_MIN - 0.1), t(EXTRAPOLATION_T_MAX + 0.1)]);
    });

    test.each(['ph-cubic', 'ph-quintic'] as const)('%s: PH offset distance', id => {
        const d = (value: number): LessonAction => ({kind: 'parameter', name: 'offset-distance', value});
        probe(id, [d(OFFSET_DISTANCE_MIN), d(OFFSET_DISTANCE_MAX)], [d(OFFSET_DISTANCE_MIN - 0.5), d(OFFSET_DISTANCE_MAX + 0.5)]);
    });

    test('the De Casteljau and curve evaluation parameters stay on the curve parameter interval', () => {
        const parameter = (value: number): LessonAction => ({kind: 'parameter', name: 't', value});
        probe('decasteljau', [parameter(0), parameter(1)], [parameter(-0.1), parameter(1.1)]);
        const evaluation = (value: number): LessonAction => ({kind: 'curve-evaluation', parameter: value});
        probe('bezier', [evaluation(0), evaluation(1)], [evaluation(-0.1), evaluation(1.1)]);
    });
});
