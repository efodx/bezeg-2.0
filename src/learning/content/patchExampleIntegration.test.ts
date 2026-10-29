import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {authoredGuidedLessonIds} from '../chapter/guidedLessonOwnership';
import {exampleReferences} from '../chapter/orderedContent';
import {retainedExampleHomes} from '../chapter/retainedExamples';
import {isGuidedLessonAvailable} from '../runtime/lessonAvailability';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {patchChapter} from './patchChapter';

const entries = [
    ['curve-to-patch', 'patch-tensor'], ['bilinear-patch', 'patch-tensor'],
    ['control-net', 'patch-tensor'], ['boundary-iso-curves', 'patch-tensor'],
    ['tensor-decasteljau', 'patch-decasteljau'], ['properties', 'patch-tensor'],
    ['tensor-derivatives', 'patch-derivatives'],
    ['tensor-subdivision', 'patch-subdivision'], ['tensor-joins', 'patch-joins'],
    ['triangular-patches', 'patch-triangular'], ['square-vs-triangular', 'patch-triangular'],
] as const;

test.each(entries)('%s publishes its prepared lesson through every entry point', (sectionId, demo) => {
    const id = `bezier-patches.${sectionId}.${demo}`;
    const links = getChapterGuidedExamples('bezier-patches', sectionId);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({id, demonstrationId: demo});
    const target = new URL(links[0].path, 'https://bezeg.invalid');
    expect(target.search).toBe(`?example=lesson.${id}`);
    const canonical = resolveGuidedExample(target.search, demo);
    expect(canonical?.owner).toEqual({chapterId: 'bezier-patches', sectionId});
    expect(canonical?.lesson.demonstrationId).toBe(demo);
    expect(canonical?.lesson.steps[0].scene?.actions.length).toBeGreaterThan(0);
    for (const query of [`?explore=${id}`, `?learn=1&learnChapter=bezier-patches&learnSection=${sectionId}`]) {
        expect(resolveGuidedExample(query, demo)).toEqual(canonical);
    }
    expect(authoredGuidedLessonIds('bezier-patches', sectionId)).toEqual([demo]);
    const section = patchChapter.sections.find(item => item.id === sectionId)!;
    expect(exampleReferences(section.orderedContent ?? [])).toEqual([id]);
    expect(isGuidedLessonAvailable(demo)).toBe(true);
    expect(getLessonForDemonstration(demo)?.demonstrationId).toBe(demo);
});

test('keeps retained curve homes separate and rejects wrong-demo and prototype identities', () => {
    expect(retainedExampleHomes).toHaveLength(56);
    expect(resolveGuidedExample('?example=lesson.bezier-patches.properties.patch-derivatives', 'patch-derivatives')).toBeUndefined();
    for (const key of ['constructor', '__proto__', 'toString']) {
        expect(resolveGuidedExample(`?example=lesson.bezier-patches.${key}.patch-tensor`, 'patch-tensor')).toBeUndefined();
    }
});
