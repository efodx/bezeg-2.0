import {setLanguage} from '../../localization';
import {
    binomialCdf, binomialNormalCdf, normalProbability, poissonCdf,
} from '../../analysis/distributions';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {learningStrands} from '../LearningPage';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {probabilityChapter} from './probabilityChapter';
import {PROBABILITY_CHAPTER_ID, probabilityGuidedExamplePath, probabilityGuidedExampleRegistry} from './probabilityChapterRegistry';
import {familyChapters} from './familyChapters';

const SECTIONS = [['density', 'prob-density'], ['binomial-normal', 'prob-binomial-normal']] as const;
const everything = (language: 'sl' | 'en') => [
    probabilityChapter.purpose, probabilityChapter.prerequisites,
    ...probabilityChapter.sections.flatMap(section => [section.title, ...section.paragraphs]),
].map(item => item[language]).join(' ') + probabilityChapter.sections.map(section => section.formula ?? '').join(' ');

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter ends the functions strand with an opening and two lesson sections', () => {
        expect(probabilityChapter.id).toBe(PROBABILITY_CHAPTER_ID);
        expect(probabilityChapter.title).toEqual({sl: 'Verjetnost in statistika na grafu', en: 'Distributions, CLT and correlation'});
        expect(probabilityChapter.family).toBe('/bezeg-2.0/probability');
        expect(probabilityChapter.sections.map(section => section.id)).toEqual(['area-and-approximation', ...SECTIONS.map(([id]) => id)]);
        expect(Object.keys(probabilityGuidedExampleRegistry)).toEqual(SECTIONS.map(([id]) => id));
        expect(familyChapters.at(-1)!.id).toBe(PROBABILITY_CHAPTER_ID);
        expect(familyChapters.findIndex(chapter => chapter.id === PROBABILITY_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'fourier-series') + 1);
        expect(learningChapters.findIndex(chapter => chapter.id === PROBABILITY_CHAPTER_ID))
            .toBe(learningChapters.findIndex(chapter => chapter.id === 'fourier-series') + 1);
        expect(learningStrands.find(strand => strand.id === 'functions')!.chapters.at(-1)).toBe(PROBABILITY_CHAPTER_ID);
        expect(probabilityChapter.sections.slice(1).map(section => section.demonstrationIds)).toEqual(SECTIONS.map(([, id]) => [id]));
        expect(probabilityChapter.prerequisiteLinks?.map(link => link.path))
            .toEqual(['/bezeg-2.0/learn/functions-and-calculus#integrals', '/bezeg-2.0/learn/analysis']);
        for (const link of probabilityChapter.prerequisiteLinks!) {
            expect(learningChapters.some(chapter => chapter.id === link.path.split('/learn/')[1].split('#')[0])).toBe(true);
        }
    });

    test('each lesson section ends with its example link and the opening section has none', () => {
        const registered = familyChapters.find(chapter => chapter.id === PROBABILITY_CHAPTER_ID)!;
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        SECTIONS.forEach(([section, demonstration], index) => {
            expect(registered.sections[index + 1].orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${PROBABILITY_CHAPTER_ID}.${section}.${demonstration}`});
            expect(registered.sections[index + 1].formula).toBeTruthy();
        });
    });

    test('the lessons resolve, own their sections and keep both languages complete', () => {
        for (const [section, id] of SECTIONS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: PROBABILITY_CHAPTER_ID, sectionId: section}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: PROBABILITY_CHAPTER_ID, sectionId: section});
            expect(authoredGuidedLessonIds(PROBABILITY_CHAPTER_ID, section)).toEqual([id]);
            expect(authoredGuidedLessonIds('functions-and-calculus', 'integrals')).not.toContain(id);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(probabilityGuidedExampleRegistry[section]);
            expect(lesson.demonstrationId).toBe(id);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(2);
                expect(field.en.length).toBeGreaterThan(2);
            }
        }
        expect(authoredGuidedLessonIds(PROBABILITY_CHAPTER_ID, 'area-and-approximation')).toEqual([]);
    });

    test('learn launches, example links and the accepted id break land on the owning sections', () => {
        for (const [section, id] of SECTIONS) {
            const launch = guidedLessonLaunchPath(id);
            const owner = {chapterId: PROBABILITY_CHAPTER_ID, sectionId: section};
            expect(launch).toContain(`learnChapter=${PROBABILITY_CHAPTER_ID}&learnSection=${section}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${PROBABILITY_CHAPTER_ID}#${section}`);
            const exampleId = `lesson.${PROBABILITY_CHAPTER_ID}.${section}.${id}`;
            expect(resolveGuidedExample(launch.slice(launch.indexOf('?')), id)?.owner).toEqual(owner);
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(probabilityGuidedExampleRegistry[section]);
            const links = getChapterGuidedExamples(PROBABILITY_CHAPTER_ID, section);
            expect(links.map(link => link.path)).toEqual([probabilityGuidedExamplePath(section)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // The accepted break: the interim owner's example id no longer resolves.
            expect(resolveGuidedExample(`?example=lesson.functions-and-calculus.integrals.${id}`, id)?.lesson).toBeUndefined();
        }
        expect(getChapterGuidedExamples(PROBABILITY_CHAPTER_ID, 'area-and-approximation')).toEqual([]);
    });
});

describe('quoted numbers equal the analysis kernels', () => {
    const quoted = (language: 'sl' | 'en', values: readonly string[]) => {
        const body = everything(language);
        for (const value of values) {
            const written = language === 'sl' ? value.split('.').join('{,}') : value;
            expect(body, `${language}: ${value}`).toContain(written);
        }
    };
    const digits = (value: number, places: number) => value.toFixed(places);

    test('P1: the standard normal shares within one, two and three deviations and the N(100;15^2) interval', () => {
        expect([1, 2, 3].map(k => digits(normalProbability(-k, k), 4))).toEqual(['0.6827', '0.9545', '0.9973']);
        expect(digits(normalProbability(85, 130, 100, 15), 5)).toBe('0.81859');
        // The share within k deviations does not depend on mu and sigma.
        expect(normalProbability(100 - 15, 100 + 15, 100, 15)).toBeCloseTo(normalProbability(-1, 1), 12);
        for (const language of ['sl', 'en'] as const) quoted(language, ['0.6827', '0.9545', '0.9973', '0.81859']);
    });

    test('P2: B(20;1/2) exact, corrected and uncorrected, and the B(100;0.02) Poisson regime', () => {
        expect(digits(binomialCdf(20, 0.5, 8), 5)).toBe('0.25172');
        expect(digits(binomialNormalCdf(20, 0.5, 8, true), 5)).toBe('0.25117');
        expect(digits(binomialNormalCdf(20, 0.5, 8, false), 5)).toBe('0.18555');
        expect(digits(binomialCdf(100, 0.02, 2), 5)).toBe('0.67669');
        expect(digits(poissonCdf(2, 2), 5)).toBe('0.67668');
        for (const language of ['sl', 'en'] as const) quoted(language, ['0.25172', '0.25117', '0.18555', '0.67669', '0.67668']);
    });

    test('the chapter states de Moivre-Laplace as a limit without a rate, in both languages', () => {
        expect(everything('sl')).toContain('\\to\\Phi(x)');
        expect(everything('sl')).toMatch(/hitrosti konvergence ne podaja/);
        expect(everything('en')).toContain('\\to\\Phi(x)');
        expect(everything('en')).toMatch(/no rate of convergence/);
    });
});
