import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {bsplineChapter} from './bsplineChapter';
import {BSPLINE_CHAPTER_ID, bsplineGuidedExamplePath, bsplineGuidedExampleLessons} from './bsplineChapterRegistry';
import {familyChapters} from './familyChapters';

const IDS = ['bspline-basis', 'bspline-deboor', 'bspline-insertion', 'bspline-extraction', 'bspline-nurbs', 'bspline-blossom'] as const;
const everything = (language: 'sl' | 'en') => [
    bsplineChapter.purpose, bsplineChapter.prerequisites,
    ...bsplineChapter.sections.flatMap(section => [section.title, ...section.paragraphs]),
].map(item => item[language]).join(' ') + bsplineChapter.sections.map(section => section.formula ?? '').join(' ');

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter follows splines in the curves strand with an opening and six lesson sections', () => {
        expect(bsplineChapter.id).toBe(BSPLINE_CHAPTER_ID);
        expect(bsplineChapter.title).toEqual({sl: 'B-zlepki in NURBS', en: 'B-splines and NURBS'});
        expect(bsplineChapter.family).toBe('/bezeg-2.0/bspline');
        expect(bsplineChapter.sections.map(section => section.id)).toEqual(['bspline-idea', ...IDS]);
        expect(Object.keys(bsplineGuidedExampleLessons.all())).toEqual([...IDS]);
        expect(familyChapters.findIndex(chapter => chapter.id === BSPLINE_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'splines') + 1);
        expect(learningChapters.some(chapter => chapter.id === BSPLINE_CHAPTER_ID)).toBe(true);
        expect(bsplineChapter.sections.slice(1).map(section => section.demonstrationIds)).toEqual([['bspline-basis'], ['bspline-deboor'], ['bspline-insertion'], ['bspline-extraction'], ['bspline-nurbs'], ['bspline-blossom']]);
        expect(bsplineChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/bezier-curves', '/bezeg-2.0/learn/splines']);
    });

    test('each lesson section ends with its example link and the opening section has none', () => {
        const registered = familyChapters.find(chapter => chapter.id === BSPLINE_CHAPTER_ID)!;
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        IDS.forEach((id, index) => {
            expect(registered.sections[index + 1].orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${BSPLINE_CHAPTER_ID}.${id}.${id}`});
        });
        expect(bsplineChapter.sections[1].formula).toBe(String.raw`\sum_i N_{i,k}(t)=1`);
    });

    test('the last section names the blossom with its Slovenian term and no section offers an unreleased lesson', () => {
        for (const language of ['sl', 'en'] as const) {
            const body = bsplineChapter.sections.flatMap(section => section.paragraphs.map(p => p[language])).join(' ').toLowerCase();
            const named = language === 'sl' ? ['cvetenje', 'polarna oblika'] : ['blossom', 'polar form'];
            for (const word of named) expect(body, `${language}: ${word}`).toContain(word);
        }
        expect(bsplineChapter.sections.flatMap(section => section.demonstrationIds ?? [])).toEqual([...IDS]);
    });

    test('the quoted numbers equal a direct recursion of the basis functions and of de Boor', () => {
        const knots = [0, 0, 0, 1, 2, 2, 2], k = 2;
        const N = (i: number, d: number, t: number): number => {
            if (d === 0) return knots[i] <= t && t < knots[i + 1] ? 1 : 0;
            const a = knots[i + d] - knots[i], b = knots[i + d + 1] - knots[i + 1];
            return (a ? (t - knots[i]) / a * N(i, d - 1, t) : 0) + (b ? (knots[i + d + 1] - t) / b * N(i + 1, d - 1, t) : 0);
        };
        const values = [0, 1, 2, 3].map(i => N(i, k, 0.5));
        expect(values).toEqual([0.25, 0.625, 0.125, 0]);
        expect(values.reduce((x, y) => x + y)).toBe(1);
        const P = [[0, 0], [1, 2], [3, 2], [4, 0]];
        expect([0, 1].map(c => P.reduce((sum, p, i) => sum + values[i] * p[c], 0))).toEqual([1, 1.5]);
        // The de Boor triangle at t = 1/2 with the ratios alpha = (t - u_j) / (u_{j+k+1-r} - u_j) of the knot vector.
        const t = 0.5;
        const lerp = (a: number[], b: number[], alpha: number) => a.map((c, j) => (1 - alpha) * c + alpha * b[j]);
        const level1 = [lerp(P[0], P[1], (t - knots[1]) / (knots[3] - knots[1])), lerp(P[1], P[2], (t - knots[2]) / (knots[4] - knots[2]))];
        expect(level1).toEqual([[0.5, 1], [1.5, 2]]);
        expect(lerp(level1[0], level1[1], (t - knots[2]) / (knots[3] - knots[2]))).toEqual([1, 1.5]);
        const sl = everything('sl'), en = everything('en');
        for (const quoted of ['0{,}25', '0{,}625', '0{,}125', '(0{,}5;\\,1)', '(1{,}5;\\,2)', '(1;\\,1{,}5)', '(0,0,0,1,2,2,2)', '[u_i,u_{i+k+1})']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['0.25', '0.625', '0.125', '(0.5,\\,1)', '(1.5,\\,2)', '(1,\\,1.5)', '(0,0,0,1,2,2,2)', '[u_i,u_{i+k+1})']) expect(en, quoted).toContain(quoted);
    });

    test('the lessons resolve, own their sections and keep both languages complete', () => {
        for (const id of IDS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: BSPLINE_CHAPTER_ID, sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: BSPLINE_CHAPTER_ID, sectionId: id});
            expect(authoredGuidedLessonIds(BSPLINE_CHAPTER_ID, id)).toEqual([id]);
            expect(authoredGuidedLessonIds('splines', 'piecewise')).not.toContain(id);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(bsplineGuidedExampleLessons.all()[id]);
            expect(lesson.demonstrationId).toBe(id);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(2);
                expect(field.en.length).toBeGreaterThan(2);
            }
        }
        expect(authoredGuidedLessonIds(BSPLINE_CHAPTER_ID, 'bspline-idea')).toEqual([]);
    });

    test('learn launches, example links and the accepted id break land on the owning sections', () => {
        for (const id of IDS) {
            const launch = guidedLessonLaunchPath(id);
            expect(launch).toContain(`learnChapter=${BSPLINE_CHAPTER_ID}&learnSection=${id}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${BSPLINE_CHAPTER_ID}#${id}`);
            const exampleId = `lesson.${BSPLINE_CHAPTER_ID}.${id}.${id}`;
            expect(resolveGuidedExample(launch.slice(launch.indexOf('?')), id)?.owner).toEqual({chapterId: BSPLINE_CHAPTER_ID, sectionId: id});
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(bsplineGuidedExampleLessons.all()[id]);
            const links = getChapterGuidedExamples(BSPLINE_CHAPTER_ID, id);
            expect(links.map(link => link.path)).toEqual([bsplineGuidedExamplePath(id)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // The accepted break: the interim owner's example id no longer resolves.
            expect(resolveGuidedExample(`?example=lesson.splines.piecewise.${id}`, id)?.lesson).toBeUndefined();
        }
        expect(getChapterGuidedExamples(BSPLINE_CHAPTER_ID, 'bspline-idea')).toEqual([]);
    });
});
