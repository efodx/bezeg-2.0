import {GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonAvailability';
import {familyChapters} from '../content/familyChapters';
import {bezierChapter} from '../content/bezierChapter';
import {authoredGuidedLessonIds, getGuidedLessonOwner, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner} from './guidedLessonOwnership';

test('every reviewed guided lesson has a real chapter section owner and a stable launch/return route', () => {
    for (const id of GUIDED_LESSON_AVAILABLE_IDS) {
        const owner = getGuidedLessonOwner(id);
        const section = owner.chapterId === 'bezier-curves'
            ? bezierChapter.en.sections.find(entry => entry.id === owner.sectionId)
            : familyChapters.find(chapter => chapter.id === owner.chapterId)?.sections.find(entry => entry.id === owner.sectionId);
        expect(section, id).toBeDefined();
        expect(guidedLessonLaunchPath(id)).toContain(`learnChapter=${owner.chapterId}`);
        expect(guidedLessonReturnPath(owner)).toBe(`/bezeg-2.0/learn/${owner.chapterId}#${owner.sectionId}`);
    }
});

test('chapter sections expose their authored guided lesson owners', () => {
    expect(authoredGuidedLessonIds('bezier-curves', 'control-points')).toContain('bezier');
    expect(authoredGuidedLessonIds('foundations', 'why-weights')).toEqual(['bernstein']);
    expect(authoredGuidedLessonIds('analysis', 'convergence')).toContain('fixed-point');
    expect(authoredGuidedLessonIds('bezier-curves', 'bernstein-form')).toContain('bernstein');
});

test('valid legacy investigation links retain their precise authored section owner', () => {
    expect(resolveGuidedLessonOwner('?learn=1&explore=splines.piecewise.spline-cn', 'spline-cn'))
        .toEqual({chapterId: 'splines', sectionId: 'piecewise'});
    expect(resolveGuidedLessonOwner('?learn=1&explore=bezier-curves.bernstein-form.bernstein', 'bernstein'))
        .toEqual({chapterId: 'bezier-curves', sectionId: 'bernstein-form'});
    expect(resolveGuidedLessonOwner('?learn=1&explore=wrong.section.spline-cn', 'spline-cn'))
        .toEqual({chapterId: 'splines', sectionId: 'continuity-levels'});
});
