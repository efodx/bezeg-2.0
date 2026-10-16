import {getLessonForDemonstration, sceneAction, GUIDED_LESSON_AVAILABLE_IDS, isGuidedLessonAvailable} from './lessonCatalog';
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
    expect(GUIDED_LESSON_AVAILABLE_IDS).toEqual(['bezier', 'decasteljau', 'affine', 'elevation', 'rational', 'rational-decasteljau', 'ph-cubic', 'ph-quintic', 'bernstein', 'rational-elevation', 'weighted-parameterization', 'uniform-parameterization', 'subdivision', 'repeated-subdivision', 'rational-subdivision', 'extrapolation', 'rational-extrapolation', 'decasteljau-alternative', 'farin', 'circle', 'spline-cn', 'spline-c1', 'spline-c2', 'spline-g1', 'spline-g1-symmetric', 'spline-parameterization', 'linear-function', 'exponential-function', 'trigonometric-functions', 'continuity', 'derivative', 'definite-integral', 'area-between-curves', 'arc-length', 'bisection', 'mean-value', 'accumulation', 'darboux', 'extrema', 'convexity', 'taylor', 'sequence', 'uniform-convergence', 'complex-multiplication', 'fixed-point']);
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

test.each([-1, 6, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects the Bernstein degree %p before it reaches the graph', degree => {
    expect(() => sceneAction({name: 'set-bernstein-degree', value: degree})).toThrow('Bernstein degree');
});

test.each([0, 1, 3, 5])('maps the valid Bernstein degree %p and the stacked-area switch', degree => {
    expect(sceneAction({name: 'set-bernstein-degree', value: degree})).toEqual({kind: 'bernstein-degree', degree});
    expect(sceneAction({name: 'show-bernstein-stacked-area', value: false})).toEqual({kind: 'bernstein-stacked-area', visible: false});
});

test('adapts parameterization scene actions and rejects invalid values with clear errors', () => {
    expect(sceneAction({name: 'set-parameterization-alpha', value: 0.25})).toEqual({kind: 'parameterization-alpha', value: 0.25});
    expect(sceneAction({name: 'set-parameterization-alpha', value: 0})).toEqual({kind: 'parameterization-alpha', value: 0});
    expect(sceneAction({name: 'set-parameterization-samples', value: 3})).toEqual({kind: 'parameterization-samples', count: 3});
    expect(sceneAction({name: 'set-parameterization-samples', value: 40})).toEqual({kind: 'parameterization-samples', count: 40});
    expect(sceneAction({name: 'set-parameterization-mode', value: 'uniform'})).toEqual({kind: 'parameterization-mode', mode: 'uniform'});
    expect(sceneAction({name: 'set-parameterization-mode', value: 'weighted'})).toEqual({kind: 'parameterization-mode', mode: 'weighted'});
    for (const value of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY, 'x', true]) {
        expect(() => sceneAction({name: 'set-parameterization-alpha', value: value as number})).toThrow(/alpha.*between 0 and 1/);
    }
    for (const value of [-1, 51, 2.5, Number.NaN, '3', false]) {
        expect(() => sceneAction({name: 'set-parameterization-samples', value: value as number})).toThrow(/integer between 0 and 50/);
    }
    for (const value of ['arc', 'Weighted', 1, true]) {
        expect(() => sceneAction({name: 'set-parameterization-mode', value: value as string})).toThrow(/weighted.*uniform/);
    }
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

test('adapts subdivision and extrapolation scene actions and rejects invalid values', () => {
    expect(sceneAction({name: 'set-subdivision-parameter', value: 0.3})).toEqual({kind: 'subdivision-parameter', value: 0.3});
    expect(sceneAction({name: 'set-subdivision-parameter', value: 0.01})).toEqual({kind: 'subdivision-parameter', value: 0.01});
    expect(sceneAction({name: 'set-subdivision-parameter', value: 0.99})).toEqual({kind: 'subdivision-parameter', value: 0.99});
    expect(sceneAction({name: 'subdivide', value: true})).toEqual({kind: 'subdivide'});
    expect(sceneAction({name: 'set-extrapolation-parameter', value: 1})).toEqual({kind: 'extrapolation-parameter', value: 1});
    expect(sceneAction({name: 'set-extrapolation-parameter', value: 1.5})).toEqual({kind: 'extrapolation-parameter', value: 1.5});
    expect(sceneAction({name: 'extrapolate', value: true})).toEqual({kind: 'extrapolate'});
    for (const value of [0, 0.009, 1, 1.01, Number.NaN, Number.POSITIVE_INFINITY, 'x', true]) {
        expect(() => sceneAction({name: 'set-subdivision-parameter', value: value as number})).toThrow(/subdivision parameter.*0\.01 and 0\.99/);
    }
    for (const value of [0.99, 1.51, 2, Number.NaN, Number.POSITIVE_INFINITY, '1.2', true]) {
        expect(() => sceneAction({name: 'set-extrapolation-parameter', value: value as number})).toThrow(/extrapolation parameter.*1 and 1\.5/);
    }
    for (const name of ['subdivide', 'extrapolate'] as const) {
        for (const value of [false, 1, 'true']) {
            expect(() => sceneAction({name, value: value as boolean})).toThrow(/Unsupported guided scene action/);
        }
    }
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

test('every active demonstration route has an available lesson', () => {
    const ids = getDemonstrationCatalog().demonstrations.map(demonstration => demonstration.id);
    expect(ids.filter(id => !isGuidedLessonAvailable(id))).toEqual([]);
});

test('maps the spline, Farin and circle scene actions to typed runtime actions', () => {
    expect(sceneAction({name: 'show-spline-labels', value: true})).toEqual({kind: 'spline-label-points', visible: true});
    expect(sceneAction({name: 'hide-spline-fixed-points', value: false})).toEqual({kind: 'spline-hide-fixed', hidden: false});
    expect(sceneAction({name: 'set-spline-continuity', value: 2})).toEqual({kind: 'spline-continuity', value: 2});
    expect(sceneAction({name: 'set-spline-degree', value: 3})).toEqual({kind: 'spline-degree', value: 3});
    expect(sceneAction({name: 'set-spline-beta', value: {index: 1, value: 0.25}})).toEqual({kind: 'spline-beta', index: 1, value: 0.25});
    expect(sceneAction({name: 'show-farin-points', value: true})).toEqual({kind: 'farin-points', visible: true});
    expect(sceneAction({name: 'set-standard-form', value: true})).toEqual({kind: 'standard-form', enabled: true});
    expect(sceneAction({name: 'set-rational-weights', value: [1, 3, 9, 27]})).toEqual({kind: 'rational-weights', weights: [1, 3, 9, 27]});
    expect(sceneAction({name: 'set-circle-pieces', value: 12})).toEqual({kind: 'circle-pieces', count: 12});
    expect(sceneAction({name: 'set-parameterization-samples', value: 0})).toEqual({kind: 'parameterization-samples', count: 0});
    expect(sceneAction({name: 'set-parameterization-samples', value: 50})).toEqual({kind: 'parameterization-samples', count: 50});
});

test('rejects structurally invalid spline, Farin and circle scene actions', () => {
    expect(() => sceneAction({name: 'show-spline-labels', value: 1})).toThrow('boolean');
    expect(() => sceneAction({name: 'show-farin-points', value: 'yes'})).toThrow('boolean');
    expect(() => sceneAction({name: 'set-spline-degree', value: 2.5})).toThrow('non-negative integer');
    expect(() => sceneAction({name: 'set-spline-continuity', value: -1})).toThrow('non-negative integer');
    expect(() => sceneAction({name: 'set-circle-pieces', value: true})).toThrow('non-negative integer');
    expect(() => sceneAction({name: 'set-spline-beta', value: 0.5})).toThrow('{index, value}');
    expect(() => sceneAction({name: 'set-spline-beta', value: {index: -1, value: 0.5}})).toThrow('index');
    expect(() => sceneAction({name: 'set-spline-beta', value: {index: 0, value: Number.NaN}})).toThrow('finite positive');
    expect(() => sceneAction({name: 'set-spline-beta', value: {index: 0, value: 0}})).toThrow('finite positive');
    expect(() => sceneAction({name: 'set-rational-weights', value: []})).toThrow('weights');
    expect(() => sceneAction({name: 'set-rational-weights', value: [1, 0, 2]})).toThrow('weights');
    expect(() => sceneAction({name: 'set-rational-weights', value: [1, Number.POSITIVE_INFINITY]})).toThrow('weights');
    expect(() => sceneAction({name: 'set-rational-weights', value: 3})).toThrow('weights');
    expect(() => sceneAction({name: 'set-parameterization-samples', value: 51})).toThrow('between 0 and 50');
    expect(() => sceneAction({name: 'set-parameterization-samples', value: 2.5})).toThrow('between 0 and 50');
});
