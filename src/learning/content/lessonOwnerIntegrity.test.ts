import {afterEach, describe, expect, test, vi} from 'vitest';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {lessonOwnerIntegrityIssues, type IntegrityChapterDefinition, type IntegrityOwnerEntry, type LessonOwnerIntegrityInput} from './lessonOwnerIntegrity';

// The four chapters whose lessons are authored definitions today (`ownedLessons` in chapterOwnedLessons.ts); the rest reuse catalog content.
const AUTHORED_CHAPTER_IDS = ['bezier-patches', 'linear-maps', 'complex-maps', 'triangle-geometry', 'trigonometry', 'analytic-lines', 'isometries', 'circle-geometry', 'combinatorics'];

afterEach(() => {
    vi.doUnmock('./guidedLessons');
    vi.resetModules();
});

test('the real owner table reports no issues and makes zero content reads', async () => {
    vi.resetModules();
    vi.doMock('./guidedLessons', async importOriginal => {
        const actual = await importOriginal<typeof import('./guidedLessons')>();
        return {...actual, getGuidedLesson: vi.fn(actual.getGuidedLesson)};
    });
    const content = await import('./guidedLessons');
    const owned = await import('./chapterOwnedLessons');
    const families = await import('./familyChapters');
    const availability = await import('../runtime/lessonAvailability');
    const spy = vi.mocked(content.getGuidedLesson);
    spy.mockClear();
    const issues = lessonOwnerIntegrityIssues({
        table: owned.chapterOwnedLessons,
        chapters: families.familyChapters,
        hasCatalogContent: availability.isGuidedLessonAvailable,
    });
    expect(issues.map(issue => issue.message)).toEqual([]);
    expect(Object.keys(owned.chapterOwnedLessons).length).toBeGreaterThan(10);
    expect(Object.entries(owned.chapterOwnedLessons).filter(([, chapter]) => chapter.source === 'authored').map(([id]) => id).sort())
        .toEqual([...AUTHORED_CHAPTER_IDS].sort());
    expect(spy.mock.calls).toEqual([]);
});

const d = (id: string) => id as DemonstrationId;
const definition = (id: string, ...sections: [string, DemonstrationId[]?][]): IntegrityChapterDefinition =>
    ({id, sections: sections.map(([sectionId, demonstrationIds]) => ({id: sectionId, demonstrationIds}))});
const entry = (rows: [string, string][], lesson: (sectionId: string) => LessonDefinition | undefined = () => undefined): IntegrityOwnerEntry =>
    ({source: 'catalog', rows: () => rows.map(([s, id]) => [s, d(id)] as const), lesson});
const authored = (rows: [string, string][], lesson: (sectionId: string) => LessonDefinition | undefined): IntegrityOwnerEntry =>
    ({...entry(rows, lesson), source: 'authored'});
const make = (over: Partial<LessonOwnerIntegrityInput>): LessonOwnerIntegrityInput => ({
    table: {}, chapters: [], hasCatalogContent: () => true, ...over,
});
const sound = (): LessonOwnerIntegrityInput => make({
    table: {c1: entry([['a', 'x'], ['b', 'y']])},
    chapters: [definition('c1', ['a', [d('x')]], ['b', [d('y')]])],
});
const fakeLesson = (demonstrationId: string) => ({demonstrationId: d(demonstrationId)}) as LessonDefinition;

describe('lessonOwnerIntegrityIssues on synthetic tables', () => {
    test('a sound table reports nothing', () => {
        expect(lessonOwnerIntegrityIssues(sound())).toEqual([]);
    });

    test('several owners sharing one Demonstration are valid', () => {
        const issues = lessonOwnerIntegrityIssues(make({
            table: {c1: entry([['a', 'shared'], ['b', 'shared']]), c2: entry([['z', 'shared']])},
            chapters: [definition('c1', ['a', [d('shared')]], ['b', [d('shared')]]), definition('c2', ['z', [d('shared')]])],
        }));
        expect(issues).toEqual([]);
    });

    test('duplicate owner identity names chapter.section', () => {
        const input = sound();
        input.table = {c1: entry([['a', 'x'], ['a', 'x'], ['b', 'y']])};
        const issues = lessonOwnerIntegrityIssues(input);
        expect(issues.filter(i => i.kind === 'duplicate-owner')).toMatchObject([{chapterId: 'c1', sectionId: 'a', demonstrationId: 'x'}]);
        expect(issues[0].message).toContain('c1.a');
    });

    test('a row whose section is absent from the chapter names the section', () => {
        const input = sound();
        input.table = {c1: entry([['a', 'x'], ['ghost', 'y']])};
        const issues = lessonOwnerIntegrityIssues(input);
        expect(issues).toMatchObject([{kind: 'missing-section', chapterId: 'c1', sectionId: 'ghost', demonstrationId: 'y'}]);
    });

    test('a catalog row without catalog content names the Demonstration', () => {
        const issues = lessonOwnerIntegrityIssues({...sound(), hasCatalogContent: id => id !== d('y')});
        expect(issues).toMatchObject([{kind: 'missing-provider', chapterId: 'c1', sectionId: 'b', demonstrationId: 'y'}]);
    });

    test('an authored row without a definition is a missing provider and the catalog check is not used', () => {
        const hasCatalogContent = vi.fn(() => true);
        const issues = lessonOwnerIntegrityIssues({
            ...sound(), hasCatalogContent,
            table: {c1: authored([['a', 'x'], ['b', 'y']], sectionId => sectionId === 'a' ? fakeLesson('x') : undefined)},
        });
        expect(issues).toMatchObject([{kind: 'missing-provider', chapterId: 'c1', sectionId: 'b', demonstrationId: 'y'}]);
        expect(hasCatalogContent).not.toHaveBeenCalled();
    });

    test('a catalog chapter never asks for its lesson', () => {
        const lesson = vi.fn(() => undefined);
        expect(lessonOwnerIntegrityIssues({...sound(), table: {c1: entry([['a', 'x'], ['b', 'y']], lesson)}})).toEqual([]);
        expect(lesson).not.toHaveBeenCalled();
    });

    test('a row Demonstration the section does not declare is a conflict', () => {
        const input = sound();
        input.chapters = [definition('c1', ['a', [d('x')]], ['b', [d('other')]])];
        expect(lessonOwnerIntegrityIssues(input)).toMatchObject([{kind: 'conflicting-demonstration', chapterId: 'c1', sectionId: 'b', demonstrationId: 'y'}]);
    });

    test('an authored definition that disagrees with its row is a conflict', () => {
        const issues = lessonOwnerIntegrityIssues({
            ...sound(),
            table: {c1: authored([['a', 'x'], ['b', 'y']], sectionId => fakeLesson(sectionId === 'a' ? 'x' : 'wrong'))},
        });
        expect(issues).toMatchObject([{kind: 'conflicting-demonstration', chapterId: 'c1', sectionId: 'b', demonstrationId: 'y'}]);
        expect(issues[0].message).toContain('wrong');
    });

    test('a chapter id absent from the chapter definitions is unknown', () => {
        const input = sound();
        input.table = {...input.table, mystery: entry([])};
        expect(lessonOwnerIntegrityIssues(input)).toMatchObject([{kind: 'unknown-chapter', chapterId: 'mystery'}]);
    });

    test('rows out of teaching order are invalid and name the early section', () => {
        const input = sound();
        input.table = {c1: entry([['b', 'y'], ['a', 'x']])};
        expect(lessonOwnerIntegrityIssues(input)).toMatchObject([{kind: 'invalid-order', chapterId: 'c1', sectionId: 'a', demonstrationId: 'x'}]);
    });
});
