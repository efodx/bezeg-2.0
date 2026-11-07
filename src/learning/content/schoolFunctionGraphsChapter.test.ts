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
    SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID as CHAPTER, schoolFunctionGraphsGuidedExamplePath, schoolFunctionGraphsGuidedExampleLessons,
} from './schoolFunctionGraphsChapterRegistry';

const IDS = ['function-transformation', 'function-inverse', 'polynomial-zeros', 'rational-function', 'geometric-series', 'conic-focal'] as const;
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
        expect(Object.keys(schoolFunctionGraphsGuidedExampleLessons.all())).toEqual([...IDS]);
        expect(learningChapters.some(item => item.id === CHAPTER)).toBe(true);
        expect(chapter.sections.map(section => section.demonstrationIds)).toEqual([['function-transformation'], ['function-inverse'], ['polynomial-zeros'], ['rational-function'], ['geometric-series'], ['conic-focal']]);
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
            {sl: ['večkratnosti', 'seka', 'dotika', 'odvod', 'Stopnja je vsota večkratnosti', 'p(-1)=4', 'prevoj', 'zavrnjena'], en: ['multiplicity', 'crosses', 'touches', 'derivative', 'degree is the sum of the multiplicities', 'p(-1)=4', 'inflection', 'refused']},
            {sl: ['ol lihe večkratnosti', 'luknjo, ne pola', 'pri končnem \\(x\\) seka', 'ostank', '\\frac38=0{,}375', '2{,}0625', '(1;2)'], en: ['pole of odd multiplicity', 'a hole, not a pole', 'at a finite \\(x\\), because', 'remainder', '\\frac38=0.375', '2.0625', '(1,2)']},
            {sl: ['le za \\(|q|<1\\)', 'q=-1', 'nihajo', 'ponazarja', 'ne eno od njih', '0{,}999\\dots=1', '\\dfrac{31}{16}=1{,}9375'], en: ['only for \\(|q|<1\\)', 'q=-1', 'oscillate', 'illustrates', 'not one of them', '0.999\\dots=1', '\\dfrac{31}{16}=1.9375']},
            {sl: ['razmerje', 'numerična ekscentričnost', 'krožnica ni stožnica z vodnico', 'ni določeno', 'ne razdalja', '\\dfrac5{6{,}25}=0{,}8=\\varepsilon', 'w_1=\\tfrac{\\sqrt2}2'], en: ['ratio', 'eccentricity', 'the circle is not a conic with a directrix', 'is undefined', 'not a distance', '\\dfrac5{6.25}=0.8=\\varepsilon', 'w_1=\\tfrac{\\sqrt2}2']},
        ];
        for (const language of ['sl', 'en'] as const) {
            facts.forEach((set, index) => {
                const prose = proseOf(index, language);
                for (const fact of set[language]) expect(prose, `${language}/${index}: ${fact}`).toContain(fact);
            });
        }
        expect(chapter.sections[0].formula).toBe('y=a\\,f\\bigl(b(x-c)\\bigr)+d');
        expect(chapter.sections[1].formula).toBe("(f^{-1})'(y_0)=\\frac{1}{f'(x_0)}");
        expect(chapter.sections[2].formula).toBe('p(x)=k\\,(x-z_1)^{m_1}(x-z_2)^{m_2}\\cdots(x-z_r)^{m_r}');
        expect(chapter.sections[3].formula).toBe('f(x)=\\frac{p(x)}{q(x)}=s(x)+\\frac{r(x)}{q(x)}');
        expect(chapter.sections[4].formula).toBe('S_n=a\\,\\frac{1-q^n}{1-q},\\qquad S_n\\to\\frac a{1-q}\\quad(|q|<1)');
        expect(chapter.sections[5].formula).toBe('|PF|=\\varepsilon\\,|Pd|');
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
        // S3: p(x) = (x + 2)(x - 1)^2 = x^3 - 3x + 2, written out from the product form
        const p = (x: number) => (x + 2) * (x - 1) ** 2;
        expect(p(0)).toBe(2);
        expect(1 * 2 ** 1 * (-1) ** 2).toBe(2);
        expect(p(-1)).toBe(4);
        for (const x of [-3, -1, 0, 2.5]) expect(p(x)).toBeCloseTo(x ** 3 - 3 * x + 2, 12);
        expect(3 * 1 ** 2 - 3).toBe(0); // p'(1)
        expect(3 * (-1) ** 2 - 3).toBe(0); // p'(-1): the derivative vanishes where p is not zero
        expect(6 * 1).toBe(6); // p''(1)
        // S4: (x^2 - 1)/(x - 2) = x + 2 + 3/(x - 2), written out from the fraction
        const f = (x: number) => (x * x - 1) / (x - 2);
        expect(f(10)).toBe(99 / 8);
        expect(f(10) - (10 + 2)).toBe(0.375);
        expect(3 / (10 - 2)).toBe(0.375);
        for (const x of [-3, 0, 1, 3, 10]) expect(f(x)).toBeCloseTo(x + 2 + 3 / (x - 2), 12);
        // (x^2 - 1)/(x - 1) = x + 1 off x = 1, so the hole is at (1, 2)
        for (const x of [-3, 0, 0.5, 1.5, 4]) expect((x * x - 1) / (x - 1)).toBeCloseTo(x + 1, 12);
        expect(1 + 1).toBe(2);
        // (2x^2 - 2)/(x^2 - 4) = 2 + 6/(x^2 - 4), and its value at 10 is 2.0625
        const g = (x: number) => (2 * x * x - 2) / (x * x - 4);
        expect(g(10)).toBe(2.0625);
        expect(2 + 6 / 96).toBe(2.0625);
        for (const x of [-3, 0, 1, 5]) expect(g(x)).toBeCloseTo(2 + 6 / (x * x - 4), 12);
        // 4x/((x + 2)(x - 1)^2) crosses its asymptote y = 0 at x = 0
        const h = (x: number) => 4 * x / ((x + 2) * (x - 1) ** 2);
        expect(h(0)).toBe(0);
        // S5: S_5 by adding terms (a = 1, q = 1/2), the limit 2, the error, the oscillating sums at q = -1/2 and the repeating decimals
        const sum = (a: number, q: number, n: number) => Array.from({length: n}, (_, k) => a * q ** k).reduce((x, y) => x + y, 0);
        expect(sum(1, 0.5, 5)).toBe(1.9375);
        expect(sum(1, 0.5, 5)).toBe(31 / 16);
        expect((1 - 0.5 ** 5) / (1 - 0.5)).toBe(1.9375);
        expect(1 / (1 - 0.5)).toBe(2);
        expect(2 - sum(1, 0.5, 5)).toBe(0.0625);
        expect([1, 2, 3, 4].map(n => sum(1, -0.5, n))).toEqual([1, 0.5, 0.75, 0.625]);
        expect(1 / (1 + 0.5)).toBeCloseTo(2 / 3, 15);
        expect(0.3 / (1 - 0.1)).toBeCloseTo(1 / 3, 15);
        expect(0.9 / (1 - 0.1)).toBeCloseTo(1, 15);
        // the prose quotes these values
        const sl = proseOf(0, 'sl') + proseOf(1, 'sl');
        const en = proseOf(0, 'en') + proseOf(1, 'en');
        for (const quoted of ['\\frac38=0{,}375', '2{,}0625', '(1;2)', 'y=0']) expect(proseOf(3, 'sl'), quoted).toContain(quoted);
        for (const quoted of ['\\frac38=0.375', '2.0625', '(1,2)', 'y=0']) expect(proseOf(3, 'en'), quoted).toContain(quoted);
        for (const quoted of ['1{,}9375', '0{,}0625', '1,\\,0{,}5,\\,0{,}75,\\,0{,}625', '\\tfrac23', '\\dfrac13', '=1\\)']) expect(proseOf(4, 'sl'), quoted).toContain(quoted);
        for (const quoted of ['1.9375', '0.0625', '1,\\,0.5,\\,0.75,\\,0.625', '\\tfrac23', '\\dfrac13', '=1\\)']) expect(proseOf(4, 'en'), quoted).toContain(quoted);
        for (const quoted of ['(3,1)', '(7,-7)', '(2,4)', '(4,2)', '5{,}5452', '0{,}18034', '0{,}36788', '\\log_28=3', 'y=-2\\cdot1+1=-1']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['(3,1)', '(7,-7)', '(2,4)', '(4,2)', '5.5452', '0.18034', '0.36788', '\\log_28=3', 'y=-2\\cdot1+1=-1']) expect(en, quoted).toContain(quoted);
    });

    test('each lesson resolves, owns its section and keeps both languages complete', () => {
        for (const id of IDS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: CHAPTER, sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: CHAPTER, sectionId: id});
            expect(authoredGuidedLessonIds(CHAPTER, id)).toEqual([id]);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(schoolFunctionGraphsGuidedExampleLessons.all()[id]);
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
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(schoolFunctionGraphsGuidedExampleLessons.all()[id]);
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
