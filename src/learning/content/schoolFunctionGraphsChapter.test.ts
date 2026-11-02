import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {schoolFunctionGraphsChapter} from './schoolFunctionGraphsChapter';
import {
    SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID as CHAPTER, schoolFunctionGraphsGuidedExamplePath, schoolFunctionGraphsGuidedExampleRegistry,
} from './schoolFunctionGraphsChapterRegistry';

const IDS = ['function-transformation', 'function-inverse'] as const;
const chapter = schoolFunctionGraphsChapter;
const proseOf = (index: number, language: 'sl' | 'en') => chapter.sections[index].paragraphs.map(p => p[language]).join(' ') + chapter.sections[index].formula;

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered in the Functions family with one section per lesson', () => {
        expect(chapter.id).toBe(CHAPTER);
        expect(CHAPTER).toBe('school-function-graphs');
        expect(chapter.title).toEqual({sl: 'Grafi funkcij za maturo', en: 'Function graphs for the matura'});
        expect(chapter.family).toBe('/bezeg-2.0/functions');
        expect(chapter.sections.map(section => section.id)).toEqual([...IDS]);
        expect(Object.keys(schoolFunctionGraphsGuidedExampleRegistry)).toEqual([...IDS]);
        expect(learningChapters.some(item => item.id === CHAPTER)).toBe(true);
        expect(chapter.sections.map(section => section.demonstrationIds)).toEqual([['function-transformation'], ['function-inverse']]);
    });

    test('only batch A is advertised', () => {
        const everything = JSON.stringify({...chapter, title: undefined}).toLowerCase();
        for (const word of ['polinom', 'polynomial', 'večkratnost', 'multiplicity', 'racionaln', 'rational function', 'geometrijska vrsta', 'geometric series', 'stožnic', 'conic']) {
            expect(everything, word).not.toContain(word);
        }
    });

    test('there are no figures, the text is bilingual and each example link closes its section', () => {
        const registered = familyChapters.find(item => item.id === CHAPTER)!;
        expect(JSON.stringify(chapter)).not.toContain('"figure');
        expect(registered.sections.every(section => !section.orderedContent!.some(item => item.kind === 'figure' as string))).toBe(true);
        expect(registered.sections.every(section => !(section as {figures?: unknown}).figures)).toBe(true);
        const fields = [chapter.purpose, chapter.prerequisites, ...chapter.sections.flatMap(section => section.paragraphs)];
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        for (const title of chapter.sections.map(section => section.title)) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(chapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/functions-and-calculus#function-rules']);
        for (const id of IDS) {
            const section = registered.sections.find(item => item.id === id)!;
            expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${CHAPTER}.${id}.${id}`});
            expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
            expect(section.orderedContent!.filter(item => item.kind === 'example')).toHaveLength(1);
        }
        // Outcome, worked example, caution.
        for (const section of chapter.sections) expect(section.paragraphs).toHaveLength(3);
    });

    test('hypotheses, the order of operations and the illustration caveat are stated in both languages', () => {
        const facts = [
            {sl: ['b=0', 'ni dovoljen', 'vrstni red', 'za vsako osnovno funkcijo'], en: ['b=0', 'not allowed', 'order of computation', 'every base function']},
            {sl: ['injektivna', 'x\\ge0', 'a\\ne1', 'f\'(x_0)\\ne0', 'ilustracija', 'ni dokaz', 'x>0'], en: ['one-to-one', 'x\\ge0', 'a\\ne1', 'f\'(x_0)\\ne0', 'illustrates', 'not a proof', 'x>0']},
        ];
        for (const language of ['sl', 'en'] as const) {
            facts.forEach((set, index) => {
                const prose = proseOf(index, language);
                for (const fact of set[language]) expect(prose, `${language}/${index}: ${fact}`).toContain(fact);
            });
        }
        expect(chapter.sections[0].formula).toBe('y=a\\,f\\bigl(b(x-c)\\bigr)+d');
        expect(chapter.sections[1].formula).toBe("(f^{-1})'(y_0)=\\frac{1}{f'(x_0)}");
    });

    test('every quoted number is recomputed', () => {
        // S1: y = -2 (1/2 (x - 3))^2 + 1
        const [a, b, c, d] = [-2, 0.5, 3, 1];
        const y = (x: number) => a * (b * (x - c)) ** 2 + d;
        expect(y(3)).toBe(1);
        for (const x of [0, 1, 2, 4, 5, 7]) expect(y(3)).toBeGreaterThanOrEqual(y(x));
        expect(y(5)).toBe(-1);
        const [u, v] = [2, 4];
        expect([u / b + c, a * v + d]).toEqual([7, -7]);
        expect(y(u / b + c)).toBe(a * v + d);
        // S2: slopes at mirrored points are reciprocal
        expect(2 * 2).toBe(4);
        expect(1 / (2 * Math.sqrt(4))).toBe(0.25);
        expect(2 ** 3).toBe(8);
        expect(Math.log(8) / Math.log(2)).toBeCloseTo(3, 12);
        const slopeExp2 = 8 * Math.LN2;
        expect(slopeExp2.toFixed(4)).toBe('5.5452');
        expect((1 / slopeExp2).toFixed(5)).toBe('0.18034');
        expect(slopeExp2 * (1 / (8 * Math.LN2))).toBeCloseTo(1, 9);
        expect((1 / Math.E).toFixed(5)).toBe('0.36788');
        // the prose quotes these values
        const sl = proseOf(0, 'sl') + proseOf(1, 'sl');
        const en = proseOf(0, 'en') + proseOf(1, 'en');
        for (const quoted of ['(3,1)', '(7,-7)', '(2,4)', '(4,2)', '5{,}5452', '0{,}18034', '0{,}36788', '\\log_28=3', 'y=-2\\cdot1+1=-1']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['(3,1)', '(7,-7)', '(2,4)', '(4,2)', '5.5452', '0.18034', '0.36788', '\\log_28=3', 'y=-2\\cdot1+1=-1']) expect(en, quoted).toContain(quoted);
    });

    test('each lesson resolves, owns its section and keeps both languages complete', () => {
        for (const id of IDS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: CHAPTER, sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: CHAPTER, sectionId: id});
            expect(authoredGuidedLessonIds(CHAPTER, id)).toEqual([id]);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(schoolFunctionGraphsGuidedExampleRegistry[id]);
            expect(lesson.demonstrationId).toBe(id);
            expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(2);
                expect(field.en.length).toBeGreaterThan(2);
            }
            expect(authoredGuidedLessonIds('functions-and-calculus', 'function-rules')).not.toContain(id);
        }
    });

    test('learn launches, example links and old routes land on the owning section', () => {
        for (const id of IDS) {
            const launch = guidedLessonLaunchPath(id);
            expect(launch).toContain(`learnChapter=${CHAPTER}&learnSection=${id}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${CHAPTER}#${id}`);
            const search = launch.slice(launch.indexOf('?'));
            expect(resolveGuidedExample(search, id)?.owner).toEqual({chapterId: CHAPTER, sectionId: id});
            const exampleId = `lesson.${CHAPTER}.${id}.${id}`;
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(schoolFunctionGraphsGuidedExampleRegistry[id]);
            const links = getChapterGuidedExamples(CHAPTER, id);
            expect(links.map(link => link.path)).toEqual([schoolFunctionGraphsGuidedExamplePath(id)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
            expect(resolveGuidedLessonOwner('?learn=1&learnChapter=functions-and-calculus&learnSection=function-rules', id)).toEqual({chapterId: CHAPTER, sectionId: id});
            // The accepted break: the interim owner's example id no longer resolves.
            expect(resolveGuidedExample(`?example=lesson.functions-and-calculus.function-rules.${id}`, id)?.lesson).toBeUndefined();
            expect(resolveGuidedExample(`?learn=1&learnChapter=${CHAPTER}&learnSection=nope`, id)).toBeUndefined();
        }
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        for (const id of IDS) expect(getLessonForDemonstration(id)!.title.en.length).toBeGreaterThan(5);
    });
});
