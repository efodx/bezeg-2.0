import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {numericalChapter} from './numericalChapter';
import {NUMERICAL_CHAPTER_ID, numericalGuidedExamplePath, numericalGuidedExampleRegistry} from './numericalChapterRegistry';

const ID = 'root-finding';
const proseOf = (language: 'sl' | 'en') => numericalChapter.sections[1].paragraphs.map(p => p[language]).join(' ') + numericalChapter.sections[1].formula;

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered last in the Analysis family with an opening and three lesson sections', () => {
        expect(numericalChapter.id).toBe(NUMERICAL_CHAPTER_ID);
        expect(NUMERICAL_CHAPTER_ID).toBe('numerical-methods');
        expect(numericalChapter.title).toEqual({sl: 'Numerične metode na grafu', en: 'Numerical methods on the graph'});
        expect(numericalChapter.family).toBe('analysis');
        expect(numericalChapter.sections.map(section => section.id)).toEqual(['numerical-idea', ID, 'quadrature', 'euler-method']);
        expect(Object.keys(numericalGuidedExampleRegistry)).toEqual([ID, 'quadrature', 'euler-method']);
        expect(familyChapters.findIndex(chapter => chapter.id === NUMERICAL_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'analysis') + 1);
        expect(learningChapters.some(chapter => chapter.id === NUMERICAL_CHAPTER_ID)).toBe(true);
        expect(numericalChapter.sections[1].demonstrationIds).toEqual([ID]);
    });

    test('the later lessons are not advertised', () => {
        const everything = JSON.stringify([{...numericalChapter, title: undefined}, ...Object.values(numericalGuidedExampleRegistry)]).toLowerCase();
        for (const word of ['runge', 'kutta', 'stiff']) expect(everything).not.toContain(word);
    });

    test('there are no figures, the text is bilingual and the example link closes the lesson section', () => {
        const registered = familyChapters.find(chapter => chapter.id === NUMERICAL_CHAPTER_ID)!;
        expect(JSON.stringify(numericalChapter)).not.toContain('"figure');
        expect(registered.sections.every(section => !section.orderedContent!.some(item => item.kind === 'figure' as string))).toBe(true);
        expect(registered.sections.every(section => !(section as {figures?: unknown}).figures)).toBe(true);
        const fields = [numericalChapter.purpose, numericalChapter.prerequisites, ...numericalChapter.sections.flatMap(section => section.paragraphs)];
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        for (const title of numericalChapter.sections.map(section => section.title)) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(numericalChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/analysis#existence']);
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        const lesson = registered.sections[1];
        expect(lesson.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${NUMERICAL_CHAPTER_ID}.${ID}.${ID}`});
        expect(lesson.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
    });

    test('hypotheses, orders and the illustration caveat are stated in both languages', () => {
        const facts = {
            sl: ['f\'(x^*)\\ne0', 'p=2', '1{,}618', 'enostavn', 'ilustrira', 'ne dokazuje', 'ne dokaz', '2-ciklu', 'izrek'],
            en: ['f\'(x^*)\\ne0', 'p=2', '1.618', 'simple root', 'illustrates', 'does not prove', 'not a proof', '2-cycle', 'theorem'],
        };
        for (const language of ['sl', 'en'] as const) {
            const prose = proseOf(language) + numericalChapter.sections[0].paragraphs.map(p => p[language]).join(' ');
            for (const fact of facts[language]) expect(prose, `${language}: ${fact}`).toContain(fact);
        }
        expect(numericalChapter.sections[1].formula).toBe("x_{k+1}=x_k-\\frac{f(x_k)}{f'(x_k)}");
    });

    test('every quoted number is recomputed', () => {
        const newton = (f: (x: number) => number, df: (x: number) => number, x0: number, n: number) => {
            const xs = [x0];
            for (let k = 0; k < n; k++) xs.push(xs[k] - f(xs[k]) / df(xs[k]));
            return xs;
        };
        const sq = (x: number) => x * x - 2;
        const [, n1, n2, n3, n4] = newton(sq, x => 2 * x, 1, 4);
        expect([n1, n2.toFixed(5), n3.toFixed(7), n4.toFixed(7)]).toEqual([1.5, '1.41667', '1.4142157', '1.4142136']);
        const errors = [n1, n2, n3, n4].map(x => Math.abs(x - Math.SQRT2));
        expect(errors[0]).toBeCloseTo(8.6e-2, 3); expect(errors[1]).toBeCloseTo(2.5e-3, 4);
        expect(errors[2] / 1e-6).toBeCloseTo(2.1, 1); expect(errors[3] / 1e-12).toBeCloseTo(1.6, 1);
        // bisection from [1, 2]: the width 2^-n first drops below 1e-10 at n = 34
        expect(2 ** -33).toBeGreaterThan(1e-10);
        expect(2 ** -34).toBeLessThan(1e-10);
        expect(2 ** -34 / 1e-11).toBeCloseTo(5.8, 1);
        // the 2-cycle and the root of x^3 - 2x + 2
        const cubic = (x: number) => x ** 3 - 2 * x + 2;
        const cycle = newton(cubic, x => 3 * x * x - 2, 0, 4);
        expect(cycle).toEqual([0, 1, 0, 1, 0]);
        expect(cubic(-2)).toBe(-2); expect(cubic(-1)).toBe(3);
        expect(newton(cubic, x => 3 * x * x - 2, -2, 30).at(-1)).toBeCloseTo(-1.7693, 4);
        // secant from 1 and 2
        const secant = [1, 2];
        for (let k = 1; k <= 4; k++) secant.push(secant[k] - sq(secant[k]) * (secant[k] - secant[k - 1]) / (sq(secant[k]) - sq(secant[k - 1])));
        const [, , s2, s3, s4, s5] = secant;
        expect([s2.toFixed(4), s3.toFixed(4), s4.toFixed(4), s5.toFixed(6)]).toEqual(['1.3333', '1.4000', '1.4146', '1.414211']);
        const secantErrors = [s2, s3, s4, s5].map(x => Math.abs(x - Math.SQRT2));
        expect(secantErrors[0]).toBeCloseTo(8.1e-2, 3); expect(secantErrors[1]).toBeCloseTo(1.4e-2, 3);
        expect(secantErrors[2] / 1e-4).toBeCloseTo(4.2, 1); expect(secantErrors[3] / 1e-6).toBeCloseTo(2.1, 1);
        expect((1 + Math.sqrt(5)) / 2).toBeCloseTo(1.618, 3);
        // the prose quotes these values
        const sl = proseOf('sl');
        for (const quoted of ['1{,}5', '1{,}41667', '1{,}4142157', '1{,}4142136', '8{,}6\\cdot10^{-2}', '2{,}5\\cdot10^{-3}', '2{,}1\\cdot10^{-6}', '1{,}6\\cdot10^{-12}',
            '1{,}3333', '1{,}4146', '1{,}414211', '8{,}1\\cdot10^{-2}', '1{,}4\\cdot10^{-2}', '4{,}2\\cdot10^{-4}', '-1{,}7693', '34']) expect(sl, quoted).toContain(quoted);
        expect(numericalChapter.sections[0].paragraphs.map(p => p.sl).join(' ')).toContain('5{,}8\\cdot10^{-11}');
    });

    test('the lesson resolves, owns its section and keeps both languages complete', () => {
        expect(getGuidedLessonOwners(ID)).toEqual([{chapterId: NUMERICAL_CHAPTER_ID, sectionId: ID}]);
        expect(getGuidedLessonOwner(ID)).toEqual({chapterId: NUMERICAL_CHAPTER_ID, sectionId: ID});
        expect(authoredGuidedLessonIds(NUMERICAL_CHAPTER_ID, ID)).toEqual([ID]);
        const lesson = getLessonForDemonstration(ID)!;
        expect(lesson).toBe(numericalGuidedExampleRegistry[ID]);
        expect(lesson.demonstrationId).toBe(ID);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
        for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
            expect(field.sl.length).toBeGreaterThan(2);
            expect(field.en.length).toBeGreaterThan(2);
        }
        expect(authoredGuidedLessonIds(NUMERICAL_CHAPTER_ID, 'numerical-idea')).toEqual([]);
        expect(authoredGuidedLessonIds('analysis', 'convergence')).not.toContain(ID);
    });

    test('learn launches, example links and old routes land on the owning section', () => {
        const launch = guidedLessonLaunchPath(ID);
        expect(launch).toContain(`learnChapter=${NUMERICAL_CHAPTER_ID}&learnSection=${ID}`);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(ID)!)).toBe(`/bezeg-2.0/learn/${NUMERICAL_CHAPTER_ID}#${ID}`);
        const search = launch.slice(launch.indexOf('?'));
        expect(resolveGuidedExample(search, ID)?.owner).toEqual({chapterId: NUMERICAL_CHAPTER_ID, sectionId: ID});
        const exampleId = `lesson.${NUMERICAL_CHAPTER_ID}.${ID}.${ID}`;
        expect(resolveGuidedExample(`?example=${exampleId}`, ID)?.lesson).toBe(numericalGuidedExampleRegistry[ID]);
        const links = getChapterGuidedExamples(NUMERICAL_CHAPTER_ID, ID);
        expect(links.map(link => link.path)).toEqual([numericalGuidedExamplePath(ID)]);
        expect(links[0].path).toContain(`?example=${exampleId}`);
        // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
        expect(resolveGuidedLessonOwner('?learn=1&learnChapter=analysis&learnSection=convergence', ID)).toEqual({chapterId: NUMERICAL_CHAPTER_ID, sectionId: ID});
        // The accepted break: the interim owner's example id no longer resolves.
        expect(resolveGuidedExample(`?example=lesson.analysis.convergence.${ID}`, ID)?.lesson).toBeUndefined();
        expect(resolveGuidedExample(`?learn=1&learnChapter=${NUMERICAL_CHAPTER_ID}&learnSection=nope`, ID)).toBeUndefined();
        expect(getChapterGuidedExamples(NUMERICAL_CHAPTER_ID, 'numerical-idea')).toEqual([]);
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        expect(getLessonForDemonstration(ID)!.title.en.length).toBeGreaterThan(5);
    });
});

describe('the quadrature section (N4)', () => {
    const QUAD = 'quadrature';
    const section = numericalChapter.sections[2];
    const prose = (language: 'sl' | 'en') => section.paragraphs.map(p => p[language]).join(' ') + section.formula;

    test('it follows root finding, owns the quadrature lesson and closes with its example link', () => {
        expect(section.id).toBe(QUAD);
        expect(section.demonstrationIds).toEqual([QUAD]);
        expect(section.investigationPrompts?.[QUAD]?.sl.length).toBeGreaterThan(20);
        expect(section.investigationPrompts?.[QUAD]?.en.length).toBeGreaterThan(20);
        const registered = familyChapters.find(chapter => chapter.id === NUMERICAL_CHAPTER_ID)!.sections[2];
        expect(registered.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${NUMERICAL_CHAPTER_ID}.${QUAD}.${QUAD}`});
        expect(getGuidedLessonOwners(QUAD)).toEqual([{chapterId: NUMERICAL_CHAPTER_ID, sectionId: QUAD}]);
        expect(getGuidedLessonOwner(QUAD)).toEqual({chapterId: NUMERICAL_CHAPTER_ID, sectionId: QUAD});
        expect(authoredGuidedLessonIds(NUMERICAL_CHAPTER_ID, QUAD)).toEqual([QUAD]);
        expect(getLessonForDemonstration(QUAD)).toBe(numericalGuidedExampleRegistry[QUAD]);
        expect(numericalGuidedExamplePath(QUAD)).toContain(`?example=lesson.${NUMERICAL_CHAPTER_ID}.${QUAD}.${QUAD}`);
        expect(getChapterGuidedExamples(NUMERICAL_CHAPTER_ID, QUAD).map(link => link.path)).toEqual([numericalGuidedExamplePath(QUAD)]);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(QUAD)!)).toBe(`/bezeg-2.0/learn/${NUMERICAL_CHAPTER_ID}#${QUAD}`);
    });

    test('hypotheses, orders and the observation caveat are stated in both languages', () => {
        const facts = {
            sl: ['Izrek', 'dvakrat zvezno odvedljiva', 'štirikrat zvezno odvedljiva', 'h^2', 'h^4', 'opažanja', 'ne dokaz', 'ne \\(16\\)', 'sodo'],
            en: ['Theorem', 'twice continuously differentiable', 'four times continuously differentiable', 'h^2', 'h^4', 'observations', 'not a proof', 'not \\(16\\)', 'even'],
        };
        for (const language of ['sl', 'en'] as const) for (const fact of facts[language]) expect(prose(language), `${language}: ${fact}`).toContain(fact);
    });

    test('every quoted number is recomputed with an independent loop', () => {
        const trapezoid = (f: (x: number) => number, a: number, b: number, n: number) => {
            const h = (b - a) / n;
            let sum = (f(a) + f(b)) / 2;
            for (let i = 1; i < n; i++) sum += f(a + i * h);
            return sum * h;
        };
        const simpson = (f: (x: number) => number, a: number, b: number, n: number) => {
            const h = (b - a) / n;
            let sum = f(a) + f(b);
            for (let i = 1; i < n; i++) sum += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
            return sum * h / 3;
        };
        const error = (rule: typeof trapezoid, n: number) => Math.abs(rule(Math.sin, 0, Math.PI, n) - 2);
        const sig = (value: number, digits: number) => Number(value.toPrecision(digits));
        expect([2, 4, 8].map(n => sig(error(trapezoid, n), 3))).toEqual([0.429, 0.104, 0.0258]);
        expect([2, 4, 8].map(n => sig(error(trapezoid, n), 4))).toEqual([0.4292, 0.1039, 0.02577]);
        expect([2, 4, 8].map(n => sig(error(simpson, n), 3))).toEqual([0.0944, 0.00456, 0.000269]);
        expect([sig(error(trapezoid, 16), 3), sig(error(simpson, 16), 3)]).toEqual([0.00643, 0.0000166]);
        const ratio = (rule: typeof trapezoid, n: number) => sig(sig(error(rule, n / 2), 4) / sig(error(rule, n), 4), 3);
        expect([ratio(trapezoid, 4), ratio(trapezoid, 8), ratio(simpson, 4), ratio(simpson, 8), ratio(simpson, 16)]).toEqual([4.13, 4.03, 20.7, 16.9, 16.2]);
        expect(simpson(x => x * x, 0, 3, 2)).toBeCloseTo(9, 12);
        expect(sig(trapezoid(x => x * x, 0, 3, 2) - 9, 4)).toBe(1.125);
        const sl = prose('sl');
        for (const quoted of ['0{,}4292', '0{,}1039', '0{,}0258', '4{,}13', '4{,}03', '0{,}0944', '0{,}00456', '0{,}000269', '20{,}7', '16{,}9', '1{,}66\\cdot10^{-5}', '16{,}2', '0{,}00643', '1{,}125']) expect(sl, quoted).toContain(quoted);
        const en = prose('en');
        for (const quoted of ['0.4292', '0.1039', '0.0258', '4.13', '4.03', '0.0944', '0.00456', '0.000269', '20.7', '16.9', '1.66\\cdot10^{-5}', '16.2', '0.00643', '1.125']) expect(en, quoted).toContain(quoted);
    });
});

describe('the Euler section (N5)', () => {
    const EULER = 'euler-method';
    const section = numericalChapter.sections[3];
    const prose = (language: 'sl' | 'en') => section.paragraphs.map(p => p[language]).join(' ') + section.formula;

    test('it follows quadrature, owns the Euler lesson and closes with its example link', () => {
        expect(section.id).toBe(EULER);
        expect(section.demonstrationIds).toEqual([EULER]);
        expect(section.investigationPrompts?.[EULER]?.sl.length).toBeGreaterThan(20);
        expect(section.investigationPrompts?.[EULER]?.en.length).toBeGreaterThan(20);
        const registered = familyChapters.find(chapter => chapter.id === NUMERICAL_CHAPTER_ID)!.sections[3];
        expect(registered.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${NUMERICAL_CHAPTER_ID}.${EULER}.${EULER}`});
        expect(getGuidedLessonOwners(EULER)).toEqual([{chapterId: NUMERICAL_CHAPTER_ID, sectionId: EULER}]);
        expect(getGuidedLessonOwner(EULER)).toEqual({chapterId: NUMERICAL_CHAPTER_ID, sectionId: EULER});
        expect(authoredGuidedLessonIds(NUMERICAL_CHAPTER_ID, EULER)).toEqual([EULER]);
        expect(getLessonForDemonstration(EULER)).toBe(numericalGuidedExampleRegistry[EULER]);
        expect(numericalGuidedExamplePath(EULER)).toContain(`?example=lesson.${NUMERICAL_CHAPTER_ID}.${EULER}.${EULER}`);
        expect(getChapterGuidedExamples(NUMERICAL_CHAPTER_ID, EULER).map(link => link.path)).toEqual([numericalGuidedExamplePath(EULER)]);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(EULER)!)).toBe(`/bezeg-2.0/learn/${NUMERICAL_CHAPTER_ID}#${EULER}`);
    });

    test('hypotheses, the first order and the polyline caveat are stated in both languages', () => {
        const facts = {
            sl: ['Izrek', 'Lipschitzova', 'dvakrat zvezno odvedljiva', 'prvega reda', 'ni pa rešitev', 'obstoj in enoličnost', 'opažanji', 'ne dokaz'],
            en: ['Theorem', 'Lipschitz', 'twice continuously differentiable', 'first order', 'not a solution', 'existence and uniqueness', 'observations', 'not a proof'],
        };
        for (const language of ['sl', 'en'] as const) for (const fact of facts[language]) expect(prose(language), `${language}: ${fact}`).toContain(fact);
        expect(section.formula).toBe(String.raw`y_{k+1}=y_k+h\,F(x_k,y_k),\qquad x_{k+1}=x_k+h`);
    });

    test('every quoted number is recomputed with an independent Euler loop and equals the lesson numbers', () => {
        const euler = (F: (x: number, y: number) => number, h: number) => {
            let x = 0, y = 1;
            for (let k = 0; k < 1 / h; k++) { y += h * F(x, y); x += h; }
            return y;
        };
        const sig = (value: number, digits: number) => Number(value.toPrecision(digits));
        const run = (F: (x: number, y: number) => number, exact: number) => {
            const approximations = [0.5, 0.25, 0.125].map(h => euler(F, h));
            const errors = [1, 0.5, 0.25, 0.125].map(h => sig(Math.abs(exact - euler(F, h)), 4));
            return {approximations, errors, ratios: [1, 2, 3].map(k => sig(errors[k - 1] / errors[k], 3))};
        };
        const growth = run((_x, y) => y, Math.E);
        expect(growth.approximations.map(v => sig(v, 5))).toEqual([2.25, 2.4414, 2.5658]);
        expect(growth.errors.slice(1)).toEqual([0.4683, 0.2769, 0.1525]);
        expect(growth.ratios.slice(1)).toEqual([1.69, 1.82]);
        const relaxation = run((x, y) => x - y, 2 / Math.E);
        expect(relaxation.approximations.map(v => sig(v, 4))).toEqual([0.5, 0.6328, 0.6872]);
        expect(relaxation.errors.slice(1)).toEqual([0.2358, 0.1029, 0.04854]);
        expect(relaxation.ratios.slice(1)).toEqual([2.29, 2.12]);
        expect(sig(2 / Math.E, 4)).toBe(0.7358);
        const sl = prose('sl');
        for (const quoted of ['2{,}25', '2{,}4414', '2{,}5658', '0{,}4683', '0{,}2769', '0{,}1525', '1{,}69', '1{,}82', '0{,}7358', '0{,}6328', '0{,}6872', '0{,}2358', '0{,}1029', '0{,}04854', '2{,}29', '2{,}12']) expect(sl, quoted).toContain(quoted);
        const en = prose('en');
        for (const quoted of ['2.25', '2.4414', '2.5658', '0.4683', '0.2769', '0.1525', '1.69', '1.82', '0.7358', '0.6328', '0.6872', '0.2358', '0.1029', '0.04854', '2.29', '2.12']) expect(en, quoted).toContain(quoted);
    });
});
