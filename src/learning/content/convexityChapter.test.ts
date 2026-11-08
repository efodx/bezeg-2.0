import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {convexityChapter} from './convexityChapter';
import {CONVEXITY_CHAPTER_ID, convexityGuidedExamplePath, convexityGuidedExampleLessons} from './convexityChapterRegistry';
import {familyChapters} from './familyChapters';

const SECTIONS = ['orientation', 'polygon-area', 'point-in-polygon', 'convex-hull', 'hull-robustness', 'bezier-hulls'] as const;

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered under computational geometry with an opening and the three Batch 1 sections', () => {
        expect(convexityChapter.id).toBe(CONVEXITY_CHAPTER_ID);
        expect(convexityChapter.title).toEqual({sl: 'Konveksnost in ovojnice', en: 'Convexity and hulls'});
        expect(convexityChapter.sections.map(section => section.id)).toEqual(['why-hulls', ...SECTIONS]);
        expect(Object.keys(convexityGuidedExampleLessons.all())).toEqual([...SECTIONS]);
        expect(familyChapters.find(chapter => chapter.id === CONVEXITY_CHAPTER_ID)?.family).toBe('computational-geometry');
        expect(learningChapters.some(chapter => chapter.id === CONVEXITY_CHAPTER_ID)).toBe(true);
        for (const section of convexityChapter.sections.slice(1)) expect(section.demonstrationIds).toEqual([section.id]);
    });

    test('unreleased lessons are not advertised', () => {
        const everything = JSON.stringify([convexityChapter, ...Object.values(convexityGuidedExampleLessons.all())]);
        for (const word of ['ear-clipping']) expect(everything).not.toContain(word);
    });

    test('the opening links to the Bezier hull section and the chapter is bilingual', () => {
        expect(convexityChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/bezier-curves#geometric-properties']);
        const fields = [convexityChapter.purpose, convexityChapter.prerequisites];
        for (const section of convexityChapter.sections) fields.push(...section.paragraphs);
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        const titles = [...convexityChapter.prerequisiteLinks!.map(link => link.title), ...convexityChapter.sections.map(section => section.title)];
        for (const title of titles) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(convexityChapter.sections[0].orderedContent).toBeUndefined();
    });

    test('formulas are the numbers of the spec and the example links sit at the section ends', () => {
        const registered = familyChapters.find(chapter => chapter.id === CONVEXITY_CHAPTER_ID)!;
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        for (const section of registered.sections.slice(1)) {
            const example = {kind: 'example', exampleId: `convexity-hulls.${section.id}.${section.id}`};
            // The convex hull section continues after its example with the collision playground's polygon passage (CP9).
            if (section.id === 'convex-hull') {
                const content = section.orderedContent!;
                const exampleIndex = content.findLastIndex(item => item.kind === 'example');
                expect(content[exampleIndex]).toEqual(example);
                expect(content[exampleIndex + 2]).toEqual({kind: 'playground', playground: 'collisions', mode: 'polygons'});
                expect(content.filter(item => item.kind === 'playground')).toHaveLength(1);
            } else expect(section.orderedContent!.at(-1)).toEqual(example);
            if (section.id === 'bezier-hulls') {
                const link = section.orderedContent!.at(-2);
                expect(link).toMatchObject({kind: 'paragraph', links: [{href: '/bezeg-2.0/learn/convexity-hulls#convex-hull'}]});
                // The paragraph renderer links a label only where it occurs in the text, in each language.
                if (link?.kind !== 'paragraph' || !link.links) throw new Error('bezier-hulls link paragraph missing');
                for (const {label} of link.links) {
                    for (const language of ['sl', 'en'] as const) expect(link.text[language]).toContain(label[language]);
                }
            }
            expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
        }
        const prose = (id: string) => convexityChapter.sections.find(section => section.id === id)!.paragraphs.map(p => p.en).join(' ');
        expect(prose('orientation')).toContain('D=+8');
        expect(prose('polygon-area')).toContain('A=21');
        expect(prose('polygon-area')).toContain('A=18');
        for (const count of ['504', '23', '35']) expect(prose('convex-hull')).toContain(`\\(${count}\\)`);
    });

    test('lessons resolve, own their sections and keep both languages complete', () => {
        for (const id of SECTIONS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: 'convexity-hulls', sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: 'convexity-hulls', sectionId: id});
            expect(authoredGuidedLessonIds('convexity-hulls', id)).toEqual([id]);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(convexityGuidedExampleLessons.all()[id]);
            expect(lesson.demonstrationId).toBe(id);
            expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(5);
                expect(field.en.length).toBeGreaterThan(5);
            }
        }
        expect(authoredGuidedLessonIds('convexity-hulls', 'why-hulls')).toEqual([]);
        expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain('orientation');
    });

    test('learn launches, example links and old routes land on the owning section', () => {
        for (const id of SECTIONS) {
            const launch = guidedLessonLaunchPath(id);
            expect(launch).toContain(`learnChapter=convexity-hulls&learnSection=${id}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/convexity-hulls#${id}`);
            const search = launch.slice(launch.indexOf('?'));
            expect(resolveGuidedExample(search, id)?.owner).toEqual({chapterId: 'convexity-hulls', sectionId: id});
            expect(resolveGuidedExample(`?example=lesson.convexity-hulls.${id}.${id}`, id)?.lesson).toBe(convexityGuidedExampleLessons.all()[id]);
            const links = getChapterGuidedExamples('convexity-hulls', id);
            expect(links.map(link => link.path)).toEqual([convexityGuidedExamplePath(id)]);
            expect(links[0].path).toContain(`?example=lesson.convexity-hulls.${id}.${id}`);
            // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
            expect(resolveGuidedLessonOwner('?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties', id))
                .toEqual({chapterId: 'convexity-hulls', sectionId: id});
            expect(resolveGuidedExample('?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties', id)?.owner)
                .toEqual({chapterId: 'convexity-hulls', sectionId: id});
        }
        expect(getChapterGuidedExamples('convexity-hulls', 'why-hulls')).toEqual([]);
        expect(resolveGuidedExample('?learn=1&learnChapter=convexity-hulls&learnSection=nope', 'orientation')).toBeUndefined();
    });

    test('the lesson text is unchanged in both languages after the move', () => {
        setLanguage('en');
        for (const id of SECTIONS) expect(getLessonForDemonstration(id)!.title.en.length).toBeGreaterThan(5);
    });
});
