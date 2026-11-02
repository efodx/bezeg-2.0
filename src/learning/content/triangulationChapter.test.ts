import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {triangulationChapter} from './triangulationChapter';
import {TRIANGULATION_CHAPTER_ID, triangulationGuidedExamplePath, triangulationGuidedExampleRegistry} from './triangulationChapterRegistry';

const ID = 'ear-clipping';
const B2 = 'point-set-triangulation';

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered under computational geometry after the convexity chapter with an opening and two lesson sections', () => {
        expect(triangulationChapter.id).toBe(TRIANGULATION_CHAPTER_ID);
        expect(triangulationChapter.title).toEqual({sl: 'Triangulacije in Voronojevi diagrami', en: 'Triangulations and Voronoi diagrams'});
        expect(triangulationChapter.sections.map(section => section.id)).toEqual(['why-triangulate', ID, B2]);
        expect(Object.keys(triangulationGuidedExampleRegistry)).toEqual([ID, B2]);
        expect(familyChapters.find(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)?.family).toBe('computational-geometry');
        expect(familyChapters.findIndex(chapter => chapter.id === TRIANGULATION_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'convexity-hulls') + 1);
        expect(learningChapters.some(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)).toBe(true);
        expect(triangulationChapter.sections[1].demonstrationIds).toEqual([ID]);
        expect(triangulationChapter.sections[2].demonstrationIds).toEqual([B2]);
    });

    test('unreleased lessons are not advertised', () => {
        // The chapter prose and B1's lesson stay free of B3 to B5 vocabulary; B2's own lesson text (its final steps) names the Delaunay triangulation, so it is not scanned.
        const everything = JSON.stringify([{...triangulationChapter, title: undefined}, triangulationGuidedExampleRegistry[ID]]).toLowerCase();
        for (const word of ['delaunay', 'delaunayeva', 'voronoi diagram', 'lawson', 'incircle', 'empty circle', 'prazna krožnica', 'cocircular']) expect(everything).not.toContain(word);
    });

    test('the opening links to the orientation section and the chapter is bilingual', () => {
        expect(triangulationChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/convexity-hulls#orientation']);
        const fields = [triangulationChapter.purpose, triangulationChapter.prerequisites];
        for (const section of triangulationChapter.sections) fields.push(...section.paragraphs);
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        const titles = [...triangulationChapter.prerequisiteLinks!.map(link => link.title), ...triangulationChapter.sections.map(section => section.title)];
        for (const title of titles) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(triangulationChapter.sections[0].orderedContent).toBeUndefined();
    });

    test('the key facts are stated and the example link sits at the section end', () => {
        const registered = familyChapters.find(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)!;
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        const section = registered.sections[1];
        expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `triangulations-voronoi.${ID}.${ID}`});
        expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
        for (const language of ['sl', 'en'] as const) {
            const prose = section.paragraphs.map(p => p[language]).join(' ');
            for (const fact of ['T=n-2', 'd=n-3', String.raw`\lfloor n/3\rfloor`, '(3,2)', '\\(18\\)']) expect(prose, `${language}: ${fact}`).toContain(fact);
        }
    });

    test('the point-set section states the count facts in both languages and links its activity at the end', () => {
        const section = familyChapters.find(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)!.sections[2];
        expect(section.id).toBe(B2);
        expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${TRIANGULATION_CHAPTER_ID}.${B2}.${B2}`});
        expect(section.formula).toBe(String.raw`T=2n-2-k,\qquad E=3n-3-k`);
        for (const language of ['sl', 'en'] as const) {
            const prose = section.paragraphs.map(p => p[language]).join(' ');
            for (const fact of ['T=2n-2-k', 'E=3n-3-k', String.raw`\(k\)`, 'n=7', '=7', '=13']) expect(prose, `${language}: ${fact}`).toContain(fact);
            expect(section.investigationPrompts![B2]![language].length).toBeGreaterThan(20);
        }
        expect(JSON.stringify(section).toLowerCase()).not.toContain('delaunay');
        expect(getChapterGuidedExamples(TRIANGULATION_CHAPTER_ID, B2).map(link => link.path)).toEqual([triangulationGuidedExamplePath(B2)]);
        expect(triangulationGuidedExamplePath(B2)).toContain(`?example=lesson.${TRIANGULATION_CHAPTER_ID}.${B2}.${B2}`);
    });

    test('lesson B2 opens from its own section and no longer from ear clipping', () => {
        const launch = '?learn=1&learnChapter=triangulations-voronoi&learnSection=point-set-triangulation';
        const lesson = getLessonForDemonstration(B2)!;
        expect(resolveGuidedExample(launch, B2)?.lesson).toBe(lesson);
        expect(lesson).toBe(triangulationGuidedExampleRegistry[B2]);
        expect(resolveGuidedExample('?learn=1&learnChapter=triangulations-voronoi&learnSection=ear-clipping', B2)?.lesson).toBeUndefined();
        expect(getGuidedLessonOwner(B2)).toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: B2});
        expect(authoredGuidedLessonIds(TRIANGULATION_CHAPTER_ID, B2)).toEqual([B2]);
        expect(authoredGuidedLessonIds(TRIANGULATION_CHAPTER_ID, ID)).toEqual([ID]);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(B2)!)).toBe(`/bezeg-2.0/learn/${TRIANGULATION_CHAPTER_ID}#${B2}`);
    });

    test('the lesson resolves, owns its section and keeps both languages complete', () => {
        expect(getGuidedLessonOwners(ID)).toEqual([{chapterId: TRIANGULATION_CHAPTER_ID, sectionId: ID}]);
        expect(getGuidedLessonOwner(ID)).toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: ID});
        expect(authoredGuidedLessonIds(TRIANGULATION_CHAPTER_ID, ID)).toEqual([ID]);
        const lesson = getLessonForDemonstration(ID)!;
        expect(lesson).toBe(triangulationGuidedExampleRegistry[ID]);
        expect(lesson.demonstrationId).toBe(ID);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
        for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
            expect(field.sl.length).toBeGreaterThan(5);
            expect(field.en.length).toBeGreaterThan(5);
        }
        expect(authoredGuidedLessonIds(TRIANGULATION_CHAPTER_ID, 'why-triangulate')).toEqual([]);
        expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain(ID);
    });

    test('learn launches, example links and old routes land on the owning section', () => {
        const launch = guidedLessonLaunchPath(ID);
        expect(launch).toContain(`learnChapter=${TRIANGULATION_CHAPTER_ID}&learnSection=${ID}`);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(ID)!)).toBe(`/bezeg-2.0/learn/${TRIANGULATION_CHAPTER_ID}#${ID}`);
        const search = launch.slice(launch.indexOf('?'));
        expect(resolveGuidedExample(search, ID)?.owner).toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: ID});
        const exampleId = `lesson.${TRIANGULATION_CHAPTER_ID}.${ID}.${ID}`;
        expect(resolveGuidedExample(`?example=${exampleId}`, ID)?.lesson).toBe(triangulationGuidedExampleRegistry[ID]);
        const links = getChapterGuidedExamples(TRIANGULATION_CHAPTER_ID, ID);
        expect(links.map(link => link.path)).toEqual([triangulationGuidedExamplePath(ID)]);
        expect(links[0].path).toContain(`?example=${exampleId}`);
        // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
        expect(resolveGuidedLessonOwner('?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties', ID))
            .toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: ID});
        expect(resolveGuidedExample('?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties', ID)?.owner)
            .toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: ID});
        // The accepted break: the interim owner's example id no longer resolves.
        expect(resolveGuidedExample(`?example=lesson.bezier-curves.geometric-properties.${ID}`, ID)?.lesson).toBeUndefined();
        expect(getChapterGuidedExamples(TRIANGULATION_CHAPTER_ID, 'why-triangulate')).toEqual([]);
        expect(resolveGuidedExample(`?learn=1&learnChapter=${TRIANGULATION_CHAPTER_ID}&learnSection=nope`, ID)).toBeUndefined();
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        expect(getLessonForDemonstration(ID)!.title.en.length).toBeGreaterThan(5);
    });
});
