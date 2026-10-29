import {describe, expect, it} from 'vitest';
import {getChapterGuidedExamples, resolveGuidedExample} from './guidedExamples';
import {retainedExampleHomes} from './retainedExamples';

describe('chapter guided examples', () => {
    it('publishes section-owned patch basics examples through canonical and legacy routes', () => {
        const sections = ['curve-to-patch', 'bilinear-patch', 'control-net', 'boundary-iso-curves'] as const;
        for (const sectionId of sections) {
            const link = getChapterGuidedExamples('bezier-patches', sectionId).find(item => item.demonstrationId === 'patch-tensor');
            expect(link, sectionId).toBeDefined();
            expect(link?.id).toBe(`bezier-patches.${sectionId}.patch-tensor`);
            expect(link?.path).toContain(`example=lesson.bezier-patches.${sectionId}.patch-tensor`);
            const search = new URL(link!.path, 'https://example.test').search;
            const canonical = resolveGuidedExample(search, 'patch-tensor');
            expect(canonical?.owner).toEqual({chapterId: 'bezier-patches', sectionId});
            expect(canonical?.lesson.id).toBe(`patch-basics-${sectionId === 'curve-to-patch' ? 'curve-sweep' : sectionId === 'bilinear-patch' ? 'bilinear-midpoint' : sectionId === 'control-net' ? 'control-net' : 'boundary-iso-curves'}`);
            expect(resolveGuidedExample(search, 'patch-tensor')?.lesson).toBe(canonical?.lesson);
            expect(resolveGuidedExample(`?learn=1&learnChapter=bezier-patches&learnSection=${sectionId}`, 'patch-tensor')?.lesson).toBe(canonical?.lesson);
            expect(resolveGuidedExample(`?explore=bezier-patches.${sectionId}.patch-tensor`, 'patch-tensor')?.lesson).toBe(canonical?.lesson);
        }
        expect(resolveGuidedExample('?example=lesson.bezier-patches.bilinear-patch.patch-tensor', 'patch-tensor')?.owner.sectionId).toBe('bilinear-patch');
        expect(resolveGuidedExample('?example=lesson.bezier-patches.invalid.patch-tensor', 'patch-tensor')).toBeUndefined();
        expect(resolveGuidedExample('?example=lesson.bezier-patches.constructor.patch-tensor', 'patch-tensor')).toBeUndefined();
        expect(resolveGuidedExample('?example=lesson.bezier-patches.control-net.patch-tensor', 'patch-decasteljau')).toBeUndefined();
        expect(getChapterGuidedExamples('bezier-patches', 'constructor')).toEqual([]);
    });

    it('publishes a meaningful prompt in both languages for every retained card', () => {
        const links = [...new Map(retainedExampleHomes.flatMap(([, chapterId, sectionId]) => getChapterGuidedExamples(chapterId, sectionId))
            .map(link => [link.id, link])).values()];
        expect(links).toHaveLength(56);
        expect(links.filter(link => !link.prompt?.sl.trim() || !link.prompt?.en.trim()).map(link => link.id)).toEqual([]);
    });

    it('keeps consolidated lesson identity stable across render-time resolution and aliases', () => {
        const canonical = '?example=lesson.analysis.convergence.fixed-point';
        const lesson = resolveGuidedExample(canonical, 'fixed-point')?.lesson;
        expect(lesson).toBeDefined();
        expect(lesson?.steps[0].frames?.some(frame => frame.id.startsWith('retained-exploration-'))).toBe(true);
        expect(resolveGuidedExample(canonical, 'fixed-point')?.lesson).toBe(lesson);
        expect(resolveGuidedExample('?learn=1&learnChapter=analysis&learnSection=convergence', 'fixed-point')?.lesson).toBe(lesson);
    });

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
        expect(resolveGuidedExample('?chapter=bezier-curves&activity=curve-parameter&activity=shape-control', 'decasteljau')).toBeUndefined();
        expect(resolveGuidedExample('?chapter=bezier-curves&activity=curve-parameter&example=activity.bezier-curves.parameter.decasteljau', 'decasteljau')).toBeUndefined();
        expect(resolveGuidedExample('?explore=splines.worked-join.spline-c1&example=family.splines.worked-join.spline-c1', 'spline-c1')).toBeUndefined();
        expect(resolveGuidedExample('?learn=1&learn=1&learnChapter=splines&learnSection=worked-join', 'spline-c1')).toBeUndefined();
        expect(resolveGuidedExample('?learn=1&learnChapter=splines&learnChapter=foundations&learnSection=worked-join', 'spline-c1')).toBeUndefined();
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

    it('opens the retained Foundations weight comparison at quadratic degree with stacked area hidden', () => {
        const link = getChapterGuidedExamples('foundations', 'worked-weight')
            .find(item => item.id === 'foundations.worked-weight.bernstein.degree-comparison')!;
        const resolved = resolveGuidedExample(new URL(link.path, 'https://example.test').search, 'bernstein');
        expect(resolved?.owner).toEqual({chapterId: 'foundations', sectionId: 'worked-weight'});
        expect(resolved?.lesson.steps[0].scene?.actions).toEqual([
            {kind: 'bernstein-degree', degree: 2},
            {kind: 'bernstein-stacked-area', visible: false},
        ]);
    });

    it('publishes canonical example links and retains every authored lesson in its owning section', () => {
        const parameterExamples = getChapterGuidedExamples('bezier-curves', 'parameter');
        expect(parameterExamples.some(item => item.demonstrationId === 'decasteljau' && item.path.includes('example='))).toBe(true);
        expect(parameterExamples.filter(item => item.demonstrationId === 'decasteljau').length).toBeGreaterThanOrEqual(1);
        const short = parameterExamples.find(item => item.id === 'bezier-curves.parameter.decasteljau-parameter')!;
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
        expect(familyPath.id).toBe('splines.worked-join.spline-c1.parabola-derivatives');
        for (const link of [...parameterExamples, ...workedJoin]) {
            const resolved = resolveGuidedExample(new URL(link.path, 'https://example.test').search, link.demonstrationId);
            expect(resolved?.lesson.demonstrationId).toBe(link.demonstrationId);
            expect(resolved?.owner).toBeDefined();
        }
    });
});


it('rejects retained aliases mixed with another route ownership identity', () => {
    for (const conflict of ['chapter=bezier-curves', 'learnChapter=analysis', 'learnSection=convergence']) {
        expect(resolveGuidedExample('?example=lesson.analysis.convergence.sequence&' + conflict, 'sequence')).toBeUndefined();
    }
});
