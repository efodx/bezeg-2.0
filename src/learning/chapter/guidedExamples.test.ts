import {describe, expect, it} from 'vitest';
import {getChapterGuidedExamples, resolveGuidedExample} from './guidedExamples';

describe('chapter guided examples', () => {
    it('adapts a valid legacy activity with its prepared action sequence and owner', () => {
        const resolved = resolveGuidedExample('?chapter=bezier-curves&activity=curve-parameter', 'decasteljau');
        expect(resolved?.owner).toEqual({chapterId: 'bezier-curves', sectionId: 'parameter'});
        expect(resolved?.lesson.steps[0].scene?.actions).toEqual([
            {kind: 'prepared-scene', sceneId: 'decasteljau-quartic', source: 'demonstration-default'},
            {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
            {kind: 'curve-visibility', target: 'decasteljau-full-curve', visible: true},
            {kind: 'parameter', name: 't', value: 0.5},
            {kind: 'animation', animationId: 'decasteljau', command: 'pause'},
        ]);
        expect(resolved?.lesson.steps[0].prompt?.en).toContain('parameter');
        expect(resolved?.lesson.steps[0].body).toEqual(resolved?.lesson.steps[0].prompt);
        expect(resolved?.lesson.steps[0].frames?.map(frame => frame.kind)).toEqual(['explanation', 'observation']);
        expect(resolved?.lesson.steps[0].frames?.[1].prompt).toEqual(resolved?.lesson.steps[0].prompt);
    });

    it('rejects mismatched and malformed legacy routes', () => {
        expect(resolveGuidedExample('?chapter=bezier-curves&activity=curve-parameter', 'bezier')).toBeUndefined();
        expect(resolveGuidedExample('?chapter=bezier-curves&activity=unknown', 'decasteljau')).toBeUndefined();
        expect(resolveGuidedExample('?chapter=other&activity=curve-parameter', 'decasteljau')).toBeUndefined();
    });

    it('rejects canonical identities with extra segments or a false chapter owner', () => {
        expect(resolveGuidedExample('?explore=splines.worked-join.spline-c1.extra', 'spline-c1')).toBeUndefined();
        expect(resolveGuidedExample('?example=family.splines.worked-join.spline-c1.extra', 'spline-c1')).toBeUndefined();
        expect(resolveGuidedExample('?example=activity.splines.parameter.decasteljau', 'decasteljau')).toBeUndefined();
        expect(resolveGuidedExample('?example=activity.bezier-curves.geometric-properties.decasteljau', 'decasteljau')).toBeUndefined();
    });

    it('resolves family prompts and authored multi-frame lessons to chapter owners', () => {
        const explore = resolveGuidedExample('?explore=splines.worked-join.spline-c1', 'spline-c1');
        expect(explore?.owner).toEqual({chapterId: 'splines', sectionId: 'worked-join'});
        expect(explore?.lesson.steps[0].prompt?.en).toContain('L(t)=(t,t^2)');
        expect(explore?.lesson.steps[0].body).toEqual(explore?.lesson.steps[0].prompt);
        const fixture = explore?.lesson.steps[0].scene?.actions[0];
        expect(fixture).toEqual({kind: 'prepared-scene', sceneId: 'worked-parabola-join', source: 'lesson-fixture',
            curve: {points: [[0, 0], [0.5, 0], [1.5, 2], [2, 4]], degree: 2, continuity: 1}, view: [-0.25, 4.5, 2.25, -0.5]});

        const authored = resolveGuidedExample('?learn=1&learnChapter=splines&learnSection=worked-join', 'spline-c1');
        expect(authored?.owner).toEqual({chapterId: 'splines', sectionId: 'worked-join'});
        expect(authored?.lesson.steps.length).toBeGreaterThan(1);
    });

    it('starts spline label prompts with labels hidden so enabling them remains a real learner action', () => {
        for (const demonstrationId of ['spline-cn', 'spline-c2'] as const) {
            for (const link of getChapterGuidedExamples('splines', 'investigate-splines').filter(item => item.demonstrationId === demonstrationId && item.id.startsWith('family.'))) {
                const resolved = resolveGuidedExample(new URL(link.path, 'https://example.test').search, demonstrationId);
                expect(resolved?.lesson.steps[0].scene?.actions.at(-1)).toEqual({kind: 'spline-label-points', visible: false});
            }
        }
    });

    it('publishes canonical example links and retains every authored lesson in its owning section', () => {
        const parameterExamples = getChapterGuidedExamples('bezier-curves', 'parameter');
        expect(parameterExamples.some(item => item.demonstrationId === 'decasteljau' && item.path.includes('example='))).toBe(true);
        expect(parameterExamples.filter(item => item.demonstrationId === 'decasteljau').length).toBeGreaterThanOrEqual(1);
        const short = parameterExamples.find(item => item.id === 'curve-parameter')!;
        expect(resolveGuidedExample(new URL(short.path, 'https://example.test').search, short.demonstrationId)?.lesson.id).toBe('activity-curve-parameter');
        const firstResolve = resolveGuidedExample('?chapter=bezier-curves&activity=curve-parameter', 'decasteljau')?.lesson;
        expect(resolveGuidedExample('?chapter=bezier-curves&activity=curve-parameter', 'decasteljau')?.lesson).toBe(firstResolve);
        const workedJoin = getChapterGuidedExamples('splines', 'worked-join');
        expect(workedJoin.some(item => item.demonstrationId === 'spline-c1' && item.prompt?.en.includes('L(t)=(t,t^2)'))).toBe(true);
        const familyPath = workedJoin.find(item => item.path.includes('example=family.'))!;
        expect(familyPath.title.sl).not.toBe(familyPath.title.en);
        expect(familyPath.title.sl).toContain('·');
        expect(familyPath.title.en).toContain('·');
        expect(resolveGuidedExample(new URL(familyPath.path, 'https://example.test').search, familyPath.demonstrationId)?.lesson.steps[0].scene?.actions[0])
            .toEqual(resolveGuidedExample('?explore=splines.worked-join.spline-c1', 'spline-c1')?.lesson.steps[0].scene?.actions[0]);
        expect(familyPath.id).toBe('family.splines.worked-join.spline-c1');
        for (const link of [...parameterExamples, ...workedJoin]) {
            const resolved = resolveGuidedExample(new URL(link.path, 'https://example.test').search, link.demonstrationId);
            expect(resolved?.lesson.demonstrationId).toBe(link.demonstrationId);
            expect(resolved?.owner).toBeDefined();
        }
    });
});
