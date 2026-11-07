// L1 isolation harness of docs/tasks/lesson-authoring-architecture/02-lesson-lookup.md, slice 1.
// Counts reads of raw lesson content (`getGuidedLesson` of content/guidedLessons.ts) during each lookup. The seam is the content
// module, so it survives moving the adapter out of runtime/lessonCatalog.ts. Modules are reset and imported per test so the
// module-level adapter cache cannot hide a read. Calls made while the modules load are not counted, only the lookup itself.
import {afterEach, expect, test, vi} from 'vitest';
import type {DemonstrationId} from '../../demonstrations';

async function load() {
    vi.resetModules();
    vi.doMock('../content/guidedLessons', async importOriginal => {
        const actual = await importOriginal<typeof import('../content/guidedLessons')>();
        return {...actual, getGuidedLesson: vi.fn(actual.getGuidedLesson)};
    });
    const content = await import('../content/guidedLessons');
    const ownership = await import('./guidedLessonOwnership');
    const examples = await import('./guidedExamples');
    const catalog = await import('../runtime/lessonCatalog');
    const chapters = await import('../content/chapterOwnedLessons');
    const spy = vi.mocked(content.getGuidedLesson);
    spy.mockClear();
    return {ownership, examples, catalog, chapters, reads: () => spy.mock.calls.map(call => call[0] as string)};
}

afterEach(() => {
    vi.doUnmock('../content/guidedLessons');
    vi.resetModules();
});

// L1: flips to test(...) in slice 2 of 02-lesson-lookup.md
test.fails('identity consumers read no lesson content', async () => {
    const {ownership, reads} = await load();
    expect(ownership.getGuidedLessonOwners('patch-tensor').length).toBeGreaterThan(0);
    expect(ownership.getGuidedLessonOwners('linear-map').length).toBe(2);
    expect(ownership.authoredGuidedLessonIds('b-splines', 'bspline-deboor')).toEqual(['bspline-deboor']);
    expect(ownership.getGuidedLessonOwnerForSection('bspline-deboor', 'b-splines', 'bspline-deboor')).toEqual({chapterId: 'b-splines', sectionId: 'bspline-deboor'});
    expect(ownership.guidedLessonLaunchPath('bspline-deboor')).toContain('learnSection=bspline-deboor');
    expect(reads()).toEqual([]);
});

// Each identity consumer on its own, so the failure shows which ones read content.
const identityConsumers: readonly [string, (m: Awaited<ReturnType<typeof load>>['ownership']) => unknown, unknown][] = [
    ['getGuidedLessonOwners', m => m.getGuidedLessonOwners('bspline-deboor'), [{chapterId: 'b-splines', sectionId: 'bspline-deboor'}]],
    ['authoredGuidedLessonIds', m => m.authoredGuidedLessonIds('b-splines', 'bspline-deboor'), ['bspline-deboor']],
    ['getGuidedLessonOwnerForSection', m => m.getGuidedLessonOwnerForSection('bspline-deboor', 'b-splines', 'bspline-deboor'), {chapterId: 'b-splines', sectionId: 'bspline-deboor'}],
    ['guidedLessonLaunchPath', m => m.guidedLessonLaunchPath('bspline-deboor'), '/bezeg-2.0/bspline/deboor?learn=1&learnChapter=b-splines&learnSection=bspline-deboor'],
];

for (const [name, call, expected] of identityConsumers) {
    // L1: flips to test(...) in slice 2 of 02-lesson-lookup.md
    test.fails(`${name} reads no lesson content`, async () => {
        const {ownership, reads} = await load();
        expect(call(ownership)).toEqual(expected);
        expect(reads()).toEqual([]);
    });
}

// Already isolated at 2e76896d (passes today); guards the property through the refactor.
test('a selected-chapter lookup reads only the selected Demonstration', async () => {
    const {chapters, reads} = await load();
    const lesson = chapters.getChapterOwnedLessons('b-splines')?.lesson('bspline-deboor');
    expect(lesson?.id).toBe('bspline-deboor-guided');
    expect(new Set(reads())).toEqual(new Set(['bspline-deboor']));
});

// L1: flips to test(...) in slice 2 of 02-lesson-lookup.md
test.fails('getLessonForDemonstration reads only the selected Demonstration for a chapter-owned lesson', async () => {
    const {catalog, reads} = await load();
    expect(catalog.getLessonForDemonstration('bspline-deboor')?.id).toBe('bspline-deboor-guided');
    expect(new Set(reads())).toEqual(new Set(['bspline-deboor']));
});

// L1: flips to test(...) in slice 2 of 02-lesson-lookup.md
test.fails('a fallback-only lookup reads only the selected Demonstration', async () => {
    const {catalog, reads} = await load();
    expect(catalog.getLessonForDemonstration('bezier')?.id).toBe('bezier-pilot');
    expect(new Set(reads())).toEqual(new Set(['bezier']));
});

// Already isolated at 2e76896d (passes today); guards the property through the refactor.
test('resolveGuidedExample on a canonical B-spline path reads only the selected Demonstration', async () => {
    const {examples, reads} = await load();
    const resolved = examples.resolveGuidedExample('?example=lesson.b-splines.bspline-deboor.bspline-deboor', 'bspline-deboor');
    expect(resolved?.lesson.id).toBe('bspline-deboor-guided');
    expect(new Set(reads())).toEqual(new Set(['bspline-deboor']));
});

// L1: flips to test(...) in slice 2 of 02-lesson-lookup.md
test.fails('a missing Demonstration id reads no lesson content', async () => {
    const {catalog, examples, reads} = await load();
    const unknown = 'no-such-demonstration' as DemonstrationId;
    expect(catalog.getLessonForDemonstration(unknown)).toBeUndefined();
    expect(examples.resolveGuidedExample('?learn=1', unknown)).toBeUndefined();
    expect(reads()).toEqual([]);
});
