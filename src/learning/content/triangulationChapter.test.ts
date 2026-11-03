import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {getGuidedLesson} from './guidedLessons';
import {triangulationChapter} from './triangulationChapter';
import {TRIANGULATION_CHAPTER_ID, triangulationGuidedExamplePath, triangulationGuidedExampleRegistry} from './triangulationChapterRegistry';

const ID = 'ear-clipping';
const B2 = 'point-set-triangulation';
const B3 = 'delaunay';
const B4 = 'voronoi';

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered under computational geometry after the convexity chapter with an opening and four lesson sections', () => {
        expect(triangulationChapter.id).toBe(TRIANGULATION_CHAPTER_ID);
        expect(triangulationChapter.title).toEqual({sl: 'Triangulacije in Voronojevi diagrami', en: 'Triangulations and Voronoi diagrams'});
        expect(triangulationChapter.sections.map(section => section.id)).toEqual(['why-triangulate', ID, B2, B3, B4]);
        expect(Object.keys(triangulationGuidedExampleRegistry)).toEqual([ID, B2, B3, B4]);
        expect(familyChapters.find(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)?.family).toBe('computational-geometry');
        expect(familyChapters.findIndex(chapter => chapter.id === TRIANGULATION_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'convexity-hulls') + 1);
        expect(learningChapters.some(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)).toBe(true);
        expect(triangulationChapter.sections[1].demonstrationIds).toEqual([ID]);
        expect(triangulationChapter.sections[2].demonstrationIds).toEqual([B2]);
        expect(triangulationChapter.sections[3].demonstrationIds).toEqual([B3]);
        expect(triangulationChapter.sections[4].demonstrationIds).toEqual([B4]);
    });

    test('unreleased lessons are not advertised', () => {
        // B5 (degenerate Voronoi sites) is not released and nothing names it. The scan of Voronoi vocabulary now covers the released prose only up to B3: the opening, ear clipping, B2 and B3 sections (B3's closing forward-link paragraph excepted) and the ear clipping and B2 lessons. The B3 lesson links to B4 and the B4 section is the released Voronoi text.
        const b3 = triangulationChapter.sections[3];
        const scanned = [{...triangulationChapter, sections: undefined, id: undefined, title: undefined}, ...triangulationChapter.sections.slice(0, 3), {...b3, paragraphs: b3.paragraphs.slice(0, -1), orderedContent: undefined}, triangulationGuidedExampleRegistry[ID], triangulationGuidedExampleRegistry[B2]];
        const everything = JSON.stringify(scanned).toLowerCase().split(TRIANGULATION_CHAPTER_ID).join('');
        for (const word of ['voronoi', 'voronoj', 'dual graph', 'dualni graf']) expect(everything).not.toContain(word);
        const early = JSON.stringify([triangulationChapter.sections[0], triangulationChapter.sections[1], triangulationGuidedExampleRegistry[ID]]).toLowerCase();
        for (const word of ['delaunay', 'lawson', 'incircle', 'empty circle', 'prazna krožnica', 'cocircular']) expect(early).not.toContain(word);
        const all = JSON.stringify([triangulationChapter, triangulationGuidedExampleRegistry[B4]]).toLowerCase();
        for (const word of ['voronoi-degenerate', 'degenerate sites', 'lesson b5']) expect(all).not.toContain(word);
    });

    test('the Delaunay section ends with a forward link naming the Voronoi section', () => {
        const b3 = triangulationChapter.sections[3];
        const last = b3.paragraphs.at(-1)!;
        expect(last.sl).toContain(triangulationChapter.sections[4].title.sl);
        expect(last.en).toContain(triangulationChapter.sections[4].title.en);
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

    test('the Delaunay section states the circle test, the example numbers and the cited facts in both languages and links its activity at the end', () => {
        const section = familyChapters.find(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)!.sections[3];
        expect(section.id).toBe(B3);
        expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${TRIANGULATION_CHAPTER_ID}.${B3}.${B3}`});
        expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
        for (const language of ['sl', 'en'] as const) {
            const prose = section.paragraphs.map(p => p[language]).join(' ');
            const comma = (text: string) => language === 'sl' ? text : text.replaceAll('{,}', '.');
            for (const fact of ['D>0', 'D=64>0', '-64', '\\tfrac{85}{9}', '\\tfrac{37}{9}', comma('19{,}65^\\circ'), comma('26{,}57^\\circ'), 'D=0']) expect(prose, `${language}: ${fact}`).toContain(fact);
            expect(section.investigationPrompts![B3]![language].length).toBeGreaterThan(20);
            const convexity = language === 'sl' ? 'Pri neustreznem robu je štirikotnik vedno izbočen' : 'For an illegal edge the quadrilateral is always convex';
            expect(prose, `${language}: convexity of the illegal-edge quadrilateral`).toContain(convexity);
        }
        // The convexity fact is cited from de Berg et al.: the Delaunay lesson carries that source.
        expect(getGuidedLesson(B3)!.sources.some(source => source.id === 'berg-delaunay' && source.citation.startsWith('de Berg, M., Cheong, O.'))).toBe(true);
        expect(getChapterGuidedExamples(TRIANGULATION_CHAPTER_ID, B3).map(link => link.path)).toEqual([triangulationGuidedExamplePath(B3)]);
        expect(triangulationGuidedExamplePath(B3)).toContain(`?example=lesson.${TRIANGULATION_CHAPTER_ID}.${B3}.${B3}`);
    });

    test('lesson B3 opens from its own section, owns it, and keeps both languages complete', () => {
        const launch = '?learn=1&learnChapter=triangulations-voronoi&learnSection=delaunay';
        const lesson = getLessonForDemonstration(B3)!;
        expect(resolveGuidedExample(launch, B3)?.lesson).toBe(lesson);
        expect(lesson).toBe(triangulationGuidedExampleRegistry[B3]);
        expect(lesson.steps).toHaveLength(7);
        expect(resolveGuidedExample('?learn=1&learnChapter=triangulations-voronoi&learnSection=point-set-triangulation', B3)?.lesson).toBeUndefined();
        expect(getGuidedLessonOwner(B3)).toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: B3});
        expect(authoredGuidedLessonIds(TRIANGULATION_CHAPTER_ID, B3)).toEqual([B3]);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(B3)!)).toBe(`/bezeg-2.0/learn/${TRIANGULATION_CHAPTER_ID}#${B3}`);
        expect(guidedLessonLaunchPath(B3)).toContain(`learnChapter=${TRIANGULATION_CHAPTER_ID}&learnSection=${B3}`);
        for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
            expect(field.sl.length).toBeGreaterThan(5);
            expect(field.en.length).toBeGreaterThan(5);
        }
    });

    test('the Voronoi section states the example numbers, the vertex and the duality caveat in both languages and links its activity at the end', () => {
        const section = familyChapters.find(chapter => chapter.id === TRIANGULATION_CHAPTER_ID)!.sections[4];
        expect(section.id).toBe(B4);
        expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${TRIANGULATION_CHAPTER_ID}.${B4}.${B4}`});
        expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
        for (const language of ['sl', 'en'] as const) {
            const prose = section.paragraphs.map(p => p[language]).join(' ');
            for (const fact of ['\\(7\\)', '\\(8\\)', '\\(5\\)', '(4,-1)', 'P_1P_2P_6']) expect(prose, `${language}: ${fact}`).toContain(fact);
            expect(prose, `${language}: illustrates, does not prove`).toContain(language === 'sl' ? 'dokazuje' : 'does not prove');
            expect(section.investigationPrompts![B4]![language].length).toBeGreaterThan(20);
        }
        expect(getChapterGuidedExamples(TRIANGULATION_CHAPTER_ID, B4).map(link => link.path)).toEqual([triangulationGuidedExamplePath(B4)]);
        expect(triangulationGuidedExamplePath(B4)).toContain(`?example=lesson.${TRIANGULATION_CHAPTER_ID}.${B4}.${B4}`);
    });

    test('lesson B4 opens from its own section, owns it, and keeps both languages complete', () => {
        const launch = '?learn=1&learnChapter=triangulations-voronoi&learnSection=voronoi';
        const lesson = getLessonForDemonstration(B4)!;
        expect(resolveGuidedExample(launch, B4)?.lesson).toBe(lesson);
        expect(lesson).toBe(triangulationGuidedExampleRegistry[B4]);
        expect(lesson.steps).toHaveLength(7);
        expect(resolveGuidedExample('?learn=1&learnChapter=triangulations-voronoi&learnSection=delaunay', B4)?.lesson).toBeUndefined();
        expect(getGuidedLessonOwner(B4)).toEqual({chapterId: TRIANGULATION_CHAPTER_ID, sectionId: B4});
        expect(authoredGuidedLessonIds(TRIANGULATION_CHAPTER_ID, B4)).toEqual([B4]);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(B4)!)).toBe(`/bezeg-2.0/learn/${TRIANGULATION_CHAPTER_ID}#${B4}`);
        expect(guidedLessonLaunchPath(B4)).toContain(`learnChapter=${TRIANGULATION_CHAPTER_ID}&learnSection=${B4}`);
        for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
            expect(field.sl.length).toBeGreaterThan(5);
            expect(field.en.length).toBeGreaterThan(5);
        }
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        expect(getLessonForDemonstration(ID)!.title.en.length).toBeGreaterThan(5);
    });
});
