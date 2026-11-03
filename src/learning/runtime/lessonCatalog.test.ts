import {getLessonForDemonstration, sceneActions, GUIDED_LESSON_AVAILABLE_IDS, isGuidedLessonAvailable} from './lessonCatalog';
import {getDemonstrationCatalog, LESSON_DEMONSTRATION_IDS} from '../../demonstrations';
import {getGuidedLesson} from '../content/guidedLessons';
import {findChapterOwnedLessonByDemonstration} from '../content/chapterOwnedLessons';
import {patchGuidedExampleRegistry} from '../content/patchGuidedExampleRegistry';

test('adapts reviewed pilot scene names into typed runtime actions', () => {
    const bezier = getLessonForDemonstration('bezier')!;
    const bezierActions = bezier.steps.find(step => step.id === 'bezier-control-polygon')!.scene!.actions;
    expect(bezierActions).toEqual([
        // A fixture scene carries its curve and view to the graph.
        {kind: 'prepared-scene', sceneId: 'bezier-control-polygon-and-hull', source: 'lesson-fixture',
            curve: {points: [[-3, -2], [-3, 2], [3, 2], [3, -2]]}, view: [-4.5, 4, 4.5, -3.5]},
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'curve-visibility', target: 'convex-hull', visible: true},
    ]);
    const evaluation = bezier.steps.find(step => step.id === 'bezier-evaluation')!;
    expect(evaluation.scene!.actions[0]).toMatchObject({kind: 'prepared-scene', sceneId: 'bezier-evaluation-point', source: 'lesson-fixture'});
    expect(evaluation.scene!.actions).toContainEqual({kind: 'curve-evaluation', parameter: 0.5});
    // A default scene without a view leaves the view to the graph.
    expect(bezier.steps.find(step => step.id === 'bezier-free-exploration')!.scene!.actions[0])
        .toEqual({kind: 'prepared-scene', sceneId: 'bezier-default-exploration', source: 'demonstration-default'});
    expect(evaluation.workedExample?.result.sl).toContain('B(1/2)');

    const decasteljau = getLessonForDemonstration('decasteljau')!;
    expect(decasteljau.steps.find(step => step.id === 'decasteljau-introduction')!.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'decasteljau-quadratic', source: 'lesson-fixture',
            curve: {points: [[-3, -2], [0, 4], [3, -2]]}, view: [-4.5, 4.8, 4.5, -3]},
        {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
        {kind: 'parameter', name: 't', value: 0.5},
    ]);
    expect(decasteljau.steps.find(step => step.id === 'decasteljau-one-step')!.notation?.[0]).toEqual({
        sl: '\\[P_i^{(0)}=P_i,\\qquad P_i^{(r)}(t)=(1-t)P_i^{(r-1)}(t)+tP_{i+1}^{(r-1)}(t)\\]',
        en: '\\[P_i^{(0)}=P_i,\\qquad P_i^{(r)}(t)=(1-t)P_i^{(r-1)}(t)+tP_{i+1}^{(r-1)}(t)\\]',
    });
    expect(decasteljau.steps.find(step => step.id === 'decasteljau-one-step')!.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'decasteljau-first-row', source: 'lesson-fixture',
            curve: {points: [[-3, -2], [0, 4], [3, -2]]}, view: [-4.5, 4.8, 4.5, -3]},
        {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
        {kind: 'parameter', name: 't', value: 0.5},
    ]);

    const ph = getLessonForDemonstration('ph-cubic')!;
    expect(ph.steps.find(step => step.id === 'ph-offsets')!.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'ph-offset-positive', source: 'lesson-fixture',
            curve: {points: [[-2, -1]], hodographs: [[2, 0], [2, 1]]}, view: [-3.2, 2.7, 3.4, -2.7]},
        {kind: 'parameter', name: 'offset-distance', value: 1},
        {kind: 'curve-visibility', target: 'offset-curve', visible: true},
    ]);
});

test('returns a stable lesson object so the workspace does not restart its session on render', () => {
    expect(getLessonForDemonstration('bezier')).toBe(getLessonForDemonstration('bezier'));
});

test('derives lesson availability from the Demonstration definitions and matches the authored content', () => {
    const ids = getDemonstrationCatalog().demonstrations.map(demonstration => demonstration.id);
    // Availability is derived from the Demonstration definitions, so it must agree with the authored content in both directions:
    // a lesson without availability would never be offered, and availability without a lesson would link to nothing.
    const authored = (id: (typeof ids)[number]) => getGuidedLesson(id) !== undefined
        || Object.values(patchGuidedExampleRegistry).some(lesson => lesson.demonstrationId === id)
        || findChapterOwnedLessonByDemonstration(id) !== undefined;
    expect(ids.filter(id => authored(id)).sort()).toEqual([...GUIDED_LESSON_AVAILABLE_IDS].sort());
    for (const id of GUIDED_LESSON_AVAILABLE_IDS) expect(getLessonForDemonstration(id)).toBeDefined();
    expect(GUIDED_LESSON_AVAILABLE_IDS.every(id => ids.includes(id))).toBe(true);
    expect([...ids.filter(isGuidedLessonAvailable)].sort()).toEqual([...GUIDED_LESSON_AVAILABLE_IDS].sort());
    expect(ids.filter(id => !isGuidedLessonAvailable(id))).toHaveLength(ids.length - GUIDED_LESSON_AVAILABLE_IDS.length);
    expect(getLessonForDemonstration('bernstein')).toBeDefined();
    expect(getLessonForDemonstration('rational-elevation')).toBeDefined();
    expect(getLessonForDemonstration('rational')).toBeDefined();
});

test('adapts the rational De Casteljau lesson through existing typed actions', () => {
    const lesson = getLessonForDemonstration('rational-decasteljau')!;
    expect(lesson.id).toBe('rational-decasteljau-guided');
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[1].scene?.actions).toEqual([
        {
            kind: 'prepared-scene', sceneId: 'rational-decasteljau-quadratic-weighted', source: 'lesson-fixture',
            curve: {points: [[-4, -3], [0, 3], [4, -3]], weights: [1, 2, 1]}, view: [-6, 5, 6, -4.5],
        },
        {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
        {kind: 'curve-visibility', target: 'weights', visible: true},
        {kind: 'parameter', name: 't', value: 0.5},
    ]);
    expect(lesson.steps[2].workedExample?.result.en).toContain('(0,1)');
    expect(lesson.steps[4].workedExample?.result.en).toContain('(-9/11,21/11)');
    expect(lesson.steps[1].frames?.at(-1)?.animation).toEqual({animationId: 'decasteljau'});
    expect(lesson.steps[0].scene?.actions).toContainEqual({kind: 'curve-visibility', target: 'weights', visible: true});
});

test('adapts the elevation scene to a graph-owned operation', () => {
    const lesson = getLessonForDemonstration('elevation')!;
    expect(lesson.id).toBe('elevation-guided');
    expect(lesson.steps[3].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'elevation-analysis-scene', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'degree-elevation'},
        {kind: 'curve-evaluation', parameter: 0.75},
    ]);
});

test('adapts the expansion cohort to typed graph actions', () => {
    const rational = getLessonForDemonstration('rational')!;
    expect(rational.id).toBe('rational-guided');
    expect(rational.steps[1].scene?.actions).toEqual([
        {
            kind: 'prepared-scene', sceneId: 'rational-base-midpoint', source: 'lesson-fixture',
            curve: {points: [[-4, -3], [-3, 3], [3, 3], [4, -3]], weights: [1, 2, 1, 1]}, view: [-6, 5, 6, -4.5],
        },
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'curve-visibility', target: 'weights', visible: true},
        {kind: 'curve-evaluation', parameter: 0.5},
    ]);

    const ph = getLessonForDemonstration('ph-quintic')!;
    expect(ph.id).toBe('ph-quintic-guided');
    expect(ph.steps[2].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'ph-quintic-offset-positive', source: 'lesson-fixture',
            curve: {points: [[-2, -1]], hodographs: [[2, 0], [2, 1], [1, 1]]}, view: [-3, 2.2, 2.5, -2.6]},
        {kind: 'parameter', name: 'offset-distance', value: 0.5},
        {kind: 'curve-visibility', target: 'offset-curve', visible: true},
    ]);

    const affine = getLessonForDemonstration('affine')!;
    expect(affine.id).toBe('affine-guided');
    expect(affine.steps[1].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'translate-x', value: -2});
    expect(affine.steps[2].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'rotate', value: Math.PI / 2});
    expect(affine.steps[3].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'scale', value: 2});
});

test('adapts the foundation cohort to typed graph actions', () => {
    const bernstein = getLessonForDemonstration('bernstein')!;
    expect(bernstein.id).toBe('bernstein-guided');
    expect(bernstein.steps[0].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'bernstein-degree-one', source: 'demonstration-default'},
    ]);
    expect(bernstein.steps[3].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'bernstein-stacked-scene', source: 'demonstration-default'},
        {kind: 'bernstein-degree', degree: 3},
        {kind: 'bernstein-stacked-area', visible: true},
    ]);
    expect(bernstein.steps[2].workedExample?.result.en).toContain(String.raw`\tfrac38`);

    const rational = getLessonForDemonstration('rational-elevation')!;
    expect(rational.id).toBe('rational-elevation-guided');
    expect(rational.steps[2].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'rational-elevation-raised', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'curve-visibility', target: 'weights', visible: true},
        {kind: 'degree-elevation'},
    ]);
});

test('adapts both parameterization lessons into typed runtime actions', () => {
    const weighted = getLessonForDemonstration('weighted-parameterization')!;
    const uniform = getLessonForDemonstration('uniform-parameterization')!;
    expect(weighted.steps).toHaveLength(5);
    expect(uniform.steps).toHaveLength(5);
    const kinds = (lesson: typeof weighted) => lesson.steps.flatMap(step => step.scene?.actions ?? []).map(action => action.kind);
    expect(kinds(weighted)).toContain('parameterization-alpha');
    expect(kinds(weighted)).toContain('parameterization-samples');
    expect(kinds(weighted)).not.toContain('parameterization-mode');
    expect(kinds(uniform)).toContain('parameterization-mode');
});

test('adapts the five construction lessons into typed runtime actions', () => {
    const kinds = (id: Parameters<typeof getLessonForDemonstration>[0]) => getLessonForDemonstration(id)!.steps.flatMap(step => step.scene?.actions ?? []).map(action => action.kind);
    for (const id of ['subdivision', 'repeated-subdivision', 'rational-subdivision', 'extrapolation', 'rational-extrapolation'] as const) {
        expect(getLessonForDemonstration(id)).toBeDefined();
        expect(isGuidedLessonAvailable(id)).toBe(true);
        expect(getLessonForDemonstration(id)!.steps.length).toBeGreaterThanOrEqual(4);
    }
    expect(kinds('subdivision')).toEqual(expect.arrayContaining(['subdivision-parameter', 'subdivide']));
    expect(kinds('repeated-subdivision')).toContain('subdivide');
    expect(kinds('repeated-subdivision')).not.toContain('subdivision-parameter');
    expect(kinds('rational-subdivision')).toEqual(expect.arrayContaining(['subdivision-parameter', 'subdivide']));
    expect(kinds('extrapolation')).toEqual(expect.arrayContaining(['extrapolation-parameter', 'extrapolate']));
    expect(kinds('rational-extrapolation')).toEqual(expect.arrayContaining(['extrapolation-parameter', 'extrapolate']));
});

test('every active demonstration route has an available lesson unless it opts out with lesson: false', () => {
    const ids = getDemonstrationCatalog().demonstrations.map(demonstration => demonstration.id);
    const lessonIds = ids.filter(id => LESSON_DEMONSTRATION_IDS.includes(id));
    // Task13 publishes the six patch demonstrations alongside the existing curve lessons.
    expect(lessonIds.filter(id => !isGuidedLessonAvailable(id))).toEqual([]);
    // The fourier-coefficients id (lesson F2/F4, Fourier 05 F3) ships without a lesson; the correlation lesson P5 (curves PS-C-5d1), the Voronoi degenerate-case lesson B5 (T3 task 23), the quadrature lesson N4, the monotone-partition lesson C3 (sweep task 19), the monotone-triangulation lesson C4 (sweep task 20), the density lesson P1, the binomial-normal lesson P2, the CLT lesson P3, the summary-statistics lesson P4, the Delaunay lesson B3, the Voronoi lesson B4, the least-squares lesson I4, the inversion lesson T5 and the projective lessons K4 and K5 ended their opt-outs.
    expect(ids.filter(id => !LESSON_DEMONSTRATION_IDS.includes(id))).toEqual(['fourier-coefficients']);
    expect(ids.filter(id => !LESSON_DEMONSTRATION_IDS.includes(id) && isGuidedLessonAvailable(id))).toEqual([]);
});

describe('typed scene actions', () => {
    const scene = (actions: Parameters<typeof sceneActions>[0]['actions']): Parameters<typeof sceneActions>[0] =>
        ({id: 'mixed-scene', basedOn: 'demonstration-default', actions, expectedState: {sl: 's', en: 'e'}});

    test('typed actions pass through unchanged', () => {
        const typed = {kind: 'curve-visibility', target: 'control-polygon', visible: true} as const;
        expect(sceneActions(scene([typed]))[1]).toBe(typed);
    });

    test('typed actions adapt in authored order after the prepared scene', () => {
        const actions = sceneActions(scene([
            {kind: 'parameter', name: 't', value: 0.25},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
            {kind: 'curve-evaluation', parameter: 0.5},
        ]));
        expect(actions).toEqual([
            {kind: 'prepared-scene', sceneId: 'mixed-scene', source: 'demonstration-default'},
            {kind: 'parameter', name: 't', value: 0.25},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
            {kind: 'curve-evaluation', parameter: 0.5},
        ]);
    });

    test('triangulation point-set actions pass with the right shape and are rejected otherwise', () => {
        const run = (action: unknown) => sceneActions(scene([action as Parameters<typeof sceneActions>[0]['actions'][number]]));
        const ps = (operation: string, fields: object) => ({kind: 'point-set', operation, ...fields});
        expect(() => run(ps('set-triangulation', {triangles: [[0, 1, 2], [0, 2, 3]]}))).not.toThrow();
        expect(() => run(ps('set-triangulation', {triangles: []}))).not.toThrow();
        expect(() => run(ps('flip-edge', {edge: [0, 2]}))).not.toThrow();
        expect(() => run(ps('select-edge', {edge: [0, 2]}))).not.toThrow();
        expect(() => run(ps('select-edge', {edge: null}))).not.toThrow();
        for (const triangles of [undefined, 'x', [[0, 1]], [[0, 1, 2, 3]], [[0, 1, 1.5]], [[0, 1, -1]], [[0, 1, Number.NaN]], [[0, 1, '2']], [0, 1, 2]]) {
            expect(() => run(ps('set-triangulation', {triangles}))).toThrow('set-triangulation');
        }
        for (const edge of [undefined, null, 'ab', [0], [0, 1, 2], [0, 1.5], [-1, 2], [0, Number.POSITIVE_INFINITY], [0, '1']]) {
            expect(() => run(ps('flip-edge', {edge}))).toThrow('flip-edge');
        }
        for (const edge of [undefined, 'ab', [0], [0, 1, 2], [0, 1.5], [-1, 2], [0, Number.NaN]]) {
            expect(() => run(ps('select-edge', {edge}))).toThrow('select-edge');
        }
    });

    test('select-triangle needs a non-negative integer index or null', () => {
        const run = (action: unknown) => sceneActions(scene([action as Parameters<typeof sceneActions>[0]['actions'][number]]));
        const ps = (fields: object) => ({kind: 'point-set', operation: 'select-triangle', ...fields});
        for (const triangle of [0, 3, null]) expect(() => run(ps({triangle}))).not.toThrow();
        for (const triangle of [undefined, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '2', [1], {}]) {
            expect(() => run(ps({triangle}))).toThrow('select-triangle');
        }
        expect(() => run(ps({}))).toThrow('select-triangle');
    });

    test('lesson ids distinguish pilot content from other guided content', () => {
        expect(getLessonForDemonstration('bezier')!.id).toBe('bezier-pilot');
        expect(getLessonForDemonstration('elevation')!.id).toBe('elevation-guided');
    });
});
