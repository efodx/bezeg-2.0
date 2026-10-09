import {getLessonForDemonstration, GUIDED_LESSON_AVAILABLE_IDS, isGuidedLessonAvailable} from './lessonCatalog';
import {getDemonstrationCatalog} from '../../demonstrations';

test('adapts reviewed pilot scene names into typed runtime actions', () => {
    const bezier = getLessonForDemonstration('bezier')!;
    const bezierActions = bezier.steps.find(step => step.id === 'bezier-control-polygon')!.scene!.actions;
    expect(bezierActions).toEqual([
        {kind: 'prepared-scene', sceneId: 'bezier-control-polygon-and-hull', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'curve-visibility', target: 'convex-hull', visible: true},
    ]);
    const evaluation = bezier.steps.find(step => step.id === 'bezier-evaluation')!;
    expect(evaluation.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'bezier-evaluation-point', source: 'demonstration-default'},
        {kind: 'curve-evaluation', parameter: 0.5},
    ]);
    expect(evaluation.workedExample?.result.sl).toContain('B(1/2)');

    const decasteljau = getLessonForDemonstration('decasteljau')!;
    expect(decasteljau.steps.find(step => step.id === 'decasteljau-introduction')!.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'decasteljau-default', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
        {kind: 'parameter', name: 't', value: 0.5},
    ]);
    expect(decasteljau.steps.find(step => step.id === 'decasteljau-one-step')!.notation?.[0]).toEqual({
        sl: '\\[P_i^{(0)}=P_i,\\qquad P_i^{(r)}(t)=(1-t)P_i^{(r-1)}(t)+tP_{i+1}^{(r-1)}(t)\\]',
        en: '\\[P_i^{(0)}=P_i,\\qquad P_i^{(r)}(t)=(1-t)P_i^{(r-1)}(t)+tP_{i+1}^{(r-1)}(t)\\]',
    });
    expect(decasteljau.steps.find(step => step.id === 'decasteljau-one-step')!.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'decasteljau-first-row', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
        {kind: 'parameter', name: 't', value: 0.5},
    ]);

    const ph = getLessonForDemonstration('ph-cubic')!;
    expect(ph.steps.find(step => step.id === 'ph-offsets')!.scene!.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'ph-offset-positive', source: 'demonstration-default'},
        {kind: 'parameter', name: 'offset-distance', value: 0.2},
        {kind: 'curve-visibility', target: 'offset-curve', visible: true},
    ]);
});

test('returns a stable lesson object so the workspace does not restart its session on render', () => {
    expect(getLessonForDemonstration('bezier')).toBe(getLessonForDemonstration('bezier'));
});

test('uses an exact availability allowlist across the full demonstration catalog', () => {
    const ids = getDemonstrationCatalog().demonstrations.map(demonstration => demonstration.id);
    expect(GUIDED_LESSON_AVAILABLE_IDS).toEqual(['bezier', 'decasteljau', 'affine', 'elevation', 'rational', 'rational-decasteljau', 'ph-cubic', 'ph-quintic']);
    expect(GUIDED_LESSON_AVAILABLE_IDS.every(id => ids.includes(id))).toBe(true);
    expect(ids.filter(isGuidedLessonAvailable)).toEqual([...GUIDED_LESSON_AVAILABLE_IDS]);
    expect(ids.filter(id => !isGuidedLessonAvailable(id))).toHaveLength(ids.length - GUIDED_LESSON_AVAILABLE_IDS.length);
    expect(getLessonForDemonstration('bernstein')).toBeUndefined();
    expect(getLessonForDemonstration('rational')).toBeDefined();
});

test('adapts the rational De Casteljau lesson through existing typed actions', () => {
    const lesson = getLessonForDemonstration('rational-decasteljau')!;
    expect(lesson.id).toBe('rational-decasteljau-guided');
    expect(lesson.steps).toHaveLength(5);
    expect(lesson.steps[1].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'rational-decasteljau-quarter', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
        {kind: 'parameter', name: 't', value: 0.25},
    ]);
    expect(lesson.steps[2].workedExample?.result.en).toContain('(-9/11,21/11)');
    expect(lesson.steps[1].frames?.at(-1)?.animation).toEqual({animationId: 'decasteljau'});
    expect(lesson.steps[0].scene?.actions).toContainEqual({kind: 'curve-visibility', target: 'weights', visible: true});
});

test('adapts the elevation scene to a graph-owned operation', () => {
    const lesson = getLessonForDemonstration('elevation')!;
    expect(lesson.id).toBe('elevation-guided');
    expect(lesson.steps[1].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'elevation-raised', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'degree-elevation'},
    ]);
});

test('adapts the expansion cohort to typed graph actions', () => {
    const rational = getLessonForDemonstration('rational')!;
    expect(rational.id).toBe('rational-guided');
    expect(rational.steps[1].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'rational-base-midpoint', source: 'demonstration-default'},
        {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        {kind: 'curve-visibility', target: 'weights', visible: true},
        {kind: 'curve-evaluation', parameter: 0.5},
    ]);

    const ph = getLessonForDemonstration('ph-quintic')!;
    expect(ph.id).toBe('ph-quintic-guided');
    expect(ph.steps[2].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'ph-quintic-offset-positive', source: 'demonstration-default'},
        {kind: 'parameter', name: 'offset-distance', value: 0.5},
        {kind: 'curve-visibility', target: 'offset-curve', visible: true},
    ]);

    const affine = getLessonForDemonstration('affine')!;
    expect(affine.id).toBe('affine-guided');
    expect(affine.steps[1].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'translate-x', value: 0.5});
    expect(affine.steps[2].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'scale', value: 1.2});
});
