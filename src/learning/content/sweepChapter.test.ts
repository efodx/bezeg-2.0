import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {sweepChapter} from './sweepChapter';
import {SWEEP_CHAPTER_ID, sweepGuidedExamplePath, sweepGuidedExampleRegistry} from './sweepChapterRegistry';

const IDS = ['interval-sweep', 'segment-intersections', 'monotone-partition', 'monotone-triangulation'] as const;

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered under computational geometry after the triangulation chapter with an opening and four lesson sections', () => {
        expect(sweepChapter.id).toBe(SWEEP_CHAPTER_ID);
        expect(SWEEP_CHAPTER_ID).toBe('sweep-algorithms');
        expect(sweepChapter.title).toEqual({sl: 'Algoritmi pometanja', en: 'Sweep-line algorithms'});
        expect(sweepChapter.sections.map(section => section.id)).toEqual(['sweep-idea', ...IDS]);
        expect(Object.keys(sweepGuidedExampleRegistry)).toEqual([...IDS]);
        expect(familyChapters.find(chapter => chapter.id === SWEEP_CHAPTER_ID)?.family).toBe('computational-geometry');
        expect(familyChapters.findIndex(chapter => chapter.id === SWEEP_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'triangulations-voronoi') + 1);
        expect(learningChapters.some(chapter => chapter.id === SWEEP_CHAPTER_ID)).toBe(true);
        expect(sweepChapter.sections.slice(1).map(section => section.demonstrationIds)).toEqual([['interval-sweep'], ['segment-intersections'], ['monotone-partition'], ['monotone-triangulation']]);
    });

    test('unreleased lessons are not advertised', () => {
        const everything = JSON.stringify([{...sweepChapter, title: undefined, prerequisiteLinks: sweepChapter.prerequisiteLinks?.map(link => ({...link, path: undefined}))}, ...Object.values(sweepGuidedExampleRegistry)]).toLowerCase();
        for (const word of ['fortune', 'beach line', 'obalna črta', 'voronoi', 'closest pair', 'najbližji par', 'overlay', 'prekrivanje dveh razdelitev']) expect(everything).not.toContain(word);
    });

    test('the chapter links to the orientation and ear-clipping sections, is bilingual and names the first section from the second', () => {
        expect(sweepChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/convexity-hulls#orientation', '/bezeg-2.0/learn/triangulations-voronoi#ear-clipping']);
        const fields = [sweepChapter.purpose, sweepChapter.prerequisites];
        for (const section of sweepChapter.sections) fields.push(...section.paragraphs);
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        const titles = [...sweepChapter.prerequisiteLinks!.map(link => link.title), ...sweepChapter.sections.map(section => section.title)];
        for (const title of titles) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(sweepChapter.sections[0].orderedContent).toBeUndefined();
        expect(sweepChapter.sections[2].paragraphs.map(p => p.sl).join(' ')).toContain('Pometanje intervalov');
        expect(sweepChapter.sections[2].paragraphs.map(p => p.en).join(' ')).toContain('Interval sweep');
        expect(sweepChapter.sections[4].paragraphs.map(p => p.sl).join(' ')).toContain('Razdelitev na monotone večkotnike');
        expect(sweepChapter.sections[4].paragraphs.map(p => p.en).join(' ')).toContain('Partitioning into monotone polygons');
    });

    test('the key facts are stated and each example link sits at its section end', () => {
        const registered = familyChapters.find(chapter => chapter.id === SWEEP_CHAPTER_ID)!;
        const opening = registered.sections[0];
        expect(opening.orderedContent!.some(item => item.kind === 'example')).toBe(false);
        for (const language of ['sl', 'en'] as const) {
            const prose = opening.paragraphs.map(p => p[language]).join(' ');
            for (const fact of ['\\(y\\)', '\\(x\\)']) expect(prose, `${language}: opening ${fact}`).toContain(fact);
        }
        const facts: Record<(typeof IDS)[number], string[]> = {
            'interval-sweep': ['\\binom n2', '1,2,3,2,1,2,1,2,1,0', '\\(3\\)', 'ab, ac, bc, bd, de', '\\(10\\)'],
            'segment-intersections': ['O((n+k)\\log n)', '\\(k\\)', '(3,2)', '\\(13\\)', '\\binom42=6'],
            'monotone-partition': ['p=d+1', '\\(y\\)', '\\(d=1\\)', '\\(p=2\\)', '\\((12,8)\\)'],
            'monotone-triangulation': ['t=n-2', '\\(n-2\\)', '\\(O(n)\\)', '\\(O(n^2)\\)', '\\(t=6-2=4\\)'],
        };
        IDS.forEach((id, index) => {
            const section = registered.sections[index + 1];
            expect(section.id).toBe(id);
            expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `sweep-algorithms.${id}.${id}`});
            expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
            for (const language of ['sl', 'en'] as const) {
                const prose = section.paragraphs.map(p => p[language]).join(' ') + (section.formula ?? '');
                for (const fact of facts[id]) expect(prose, `${language} ${id}: ${fact}`).toContain(fact);
            }
        });
        const en = (id: (typeof IDS)[number]) => registered.sections.find(section => section.id === id)!.paragraphs.map(p => p.en).join(' ');
        expect(en('interval-sweep')).toContain('entering events are processed before leaving');
        expect(en('segment-intersections')).toContain('only the new neighbouring pairs');
        expect(en('segment-intersections')).toContain('swap');
        expect(en('monotone-partition')).toContain('Only split and merge vertices break monotonicity');
        expect(en('monotone-partition')).toContain('five types');
        expect(en('monotone-triangulation')).toContain('two chains');
        expect(en('monotone-triangulation')).toContain('one stack');
    });

    test('the lessons resolve, own their sections and keep both languages complete', () => {
        for (const id of IDS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: SWEEP_CHAPTER_ID, sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: SWEEP_CHAPTER_ID, sectionId: id});
            expect(authoredGuidedLessonIds(SWEEP_CHAPTER_ID, id)).toEqual([id]);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(sweepGuidedExampleRegistry[id]);
            expect(lesson.demonstrationId).toBe(id);
            expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(5);
                expect(field.en.length).toBeGreaterThan(5);
            }
        }
        expect(authoredGuidedLessonIds(SWEEP_CHAPTER_ID, 'sweep-idea')).toEqual([]);
        expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain('interval-sweep');
        expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain('segment-intersections');
    });

    test('learn launches, example links and old routes land on the owning section', () => {
        for (const id of IDS) {
            const launch = guidedLessonLaunchPath(id);
            expect(launch).toContain(`learnChapter=${SWEEP_CHAPTER_ID}&learnSection=${id}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${SWEEP_CHAPTER_ID}#${id}`);
            const search = launch.slice(launch.indexOf('?'));
            expect(resolveGuidedExample(search, id)?.owner).toEqual({chapterId: SWEEP_CHAPTER_ID, sectionId: id});
            const exampleId = `lesson.${SWEEP_CHAPTER_ID}.${id}.${id}`;
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(sweepGuidedExampleRegistry[id]);
            const links = getChapterGuidedExamples(SWEEP_CHAPTER_ID, id);
            expect(links.map(link => link.path)).toEqual([sweepGuidedExamplePath(id)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
            expect(resolveGuidedLessonOwner('?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties', id))
                .toEqual({chapterId: SWEEP_CHAPTER_ID, sectionId: id});
            expect(resolveGuidedExample('?learn=1&learnChapter=bezier-curves&learnSection=geometric-properties', id)?.owner)
                .toEqual({chapterId: SWEEP_CHAPTER_ID, sectionId: id});
            // The accepted break: the interim owner's example id no longer resolves.
            expect(resolveGuidedExample(`?example=lesson.bezier-curves.geometric-properties.${id}`, id)?.lesson).toBeUndefined();
            expect(resolveGuidedExample(`?learn=1&learnChapter=${SWEEP_CHAPTER_ID}&learnSection=nope`, id)).toBeUndefined();
        }
        expect(getChapterGuidedExamples(SWEEP_CHAPTER_ID, 'sweep-idea')).toEqual([]);
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        for (const id of IDS) expect(getLessonForDemonstration(id)!.title.en.length).toBeGreaterThan(5);
    });
});
