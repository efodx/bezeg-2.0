import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {fourierChapter} from './fourierChapter';
import {FOURIER_CHAPTER_ID, fourierGuidedExamplePath, fourierGuidedExampleRegistry} from './fourierChapterRegistry';
import {numericalChapter} from './numericalChapter';

const ID = 'fourier-series';
const proseOf = (language: 'sl' | 'en') => fourierChapter.sections[1].paragraphs.map(p => p[language]).join(' ') + fourierChapter.sections[1].formula;

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered last in the Analysis family with an opening and one lesson section', () => {
        expect(fourierChapter.id).toBe(FOURIER_CHAPTER_ID);
        expect(FOURIER_CHAPTER_ID).toBe('fourier-series');
        expect(fourierChapter.title).toEqual({sl: 'Fourierove vrste', en: 'Fourier series'});
        expect(fourierChapter.family).toBe('analysis');
        expect(fourierChapter.sections.map(section => section.id)).toEqual(['fourier-idea', ID]);
        expect(Object.keys(fourierGuidedExampleRegistry)).toEqual([ID]);
        expect(familyChapters.findIndex(chapter => chapter.id === FOURIER_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === numericalChapter.id) + 1);
        expect(familyChapters.at(-2)!.id).toBe(FOURIER_CHAPTER_ID); // the probability chapter follows it at the end of the functions strand
        expect(learningChapters.some(chapter => chapter.id === FOURIER_CHAPTER_ID)).toBe(true);
        expect(fourierChapter.sections[1].demonstrationIds).toEqual([ID]);
    });

    test('coefficients, decay and epicycles are not advertised', () => {
        const everything = JSON.stringify({...fourierChapter, title: undefined}).toLowerCase();
        for (const word of ['epicikl', 'epicycle', 'parseval', 'koeficient', 'coefficient', 'razpad', 'decay', 'projekcij']) expect(everything).not.toContain(word);
    });

    test('there are no figures, the text is bilingual and the example link closes the lesson section', () => {
        const registered = familyChapters.find(chapter => chapter.id === FOURIER_CHAPTER_ID)!;
        expect(JSON.stringify(fourierChapter)).not.toContain('"figure');
        expect(registered.sections.every(section => !section.orderedContent!.some(item => item.kind === 'figure' as string))).toBe(true);
        expect(registered.sections.every(section => !(section as {figures?: unknown}).figures)).toBe(true);
        const fields = [fourierChapter.purpose, fourierChapter.prerequisites, ...fourierChapter.sections.flatMap(section => section.paragraphs)];
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        for (const title of fourierChapter.sections.map(section => section.title)) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(fourierChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/analysis#convergence']);
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        const lesson = registered.sections[1];
        expect(lesson.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${FOURIER_CHAPTER_ID}.${ID}.${ID}`});
        expect(lesson.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
    });

    test('hypotheses, sources and the illustration caveat are stated in both languages', () => {
        const facts = {
            sl: ['Dirichlet', 'odsekoma gladka', 'sredini enostranskih limit', 'Zygmund', 'ne dokazano', 'ilustracije', 'ne dokaz', 'točkovno, enakomerno pa ne', '\\tfrac2\\pi\\mathrm{Si}(\\pi)', 'izrek'],
            en: ['Dirichlet', 'piecewise smooth', 'midpoint of the one-sided limits', 'Zygmund', 'not proved', 'illustrations', 'not a proof', 'pointwise but not uniformly', '\\tfrac2\\pi\\mathrm{Si}(\\pi)', 'theorem'],
        };
        for (const language of ['sl', 'en'] as const) {
            const prose = proseOf(language) + fourierChapter.sections[0].paragraphs.map(p => p[language]).join(' ');
            for (const fact of facts[language]) expect(prose, `${language}: ${fact}`).toContain(fact);
        }
        expect(fourierChapter.sections[1].formula).toBe(String.raw`S_N(x)=\frac4\pi\sum_{k\ \mathrm{odd},\ k\le N}\frac{\sin kx}{k}`);
    });

    test('every quoted number is recomputed by a direct sum and by quadrature', () => {
        // The square wave: the partial sum as a direct sum over odd k (not the lesson's kernel).
        const S = (N: number, x: number) => {
            let sum = 0;
            for (let k = 1; k <= N; k += 2) sum += Math.sin(k * x) / k;
            return 4 / Math.PI * sum;
        };
        expect([S(3, 1.57).toFixed(5), S(11, 1.57).toFixed(5), S(101, 1.57).toFixed(5)]).toEqual(['0.84883', '0.94731', '1.00622']);
        expect(S(12, 1.57)).toBe(S(11, 1.57));
        for (const N of [1, 3, 11, 101, 1001]) expect(S(N, 0), `S_${N}(0)`).toBe(0);
        // The peak at pi/(N+1): the closed-form location agrees with a fine scan of the direct sum.
        for (const N of [11, 101]) {
            let best = 0, bestX = 0;
            for (let i = 1; i <= 40000; i++) { const x = (i / 40000) * 0.6; const y = S(N, x); if (y > best) { best = y; bestX = x; } }
            expect(bestX).toBeCloseTo(Math.PI / (N + 1), 3);
            expect(S(N, Math.PI / (N + 1))).toBeGreaterThanOrEqual(best - 1e-9);
        }
        const peak11 = S(11, Math.PI / 12), peak101 = S(101, Math.PI / 102), peak1001 = S(1001, Math.PI / 1002);
        expect([peak11.toFixed(5), peak101.toFixed(5), peak1001.toFixed(5)]).toEqual(['1.18130', '1.17901', '1.17898']);
        expect(Math.PI / 12).toBeCloseTo(0.2618, 4);
        expect(((peak11 - 1) / 2 * 100).toFixed(2)).toBe('9.07');
        expect(((peak101 - 1) / 2 * 100).toFixed(2)).toBe('8.95');
        // The limit 2 Si(pi) / pi by Simpson quadrature of sin t / t.
        const n = 2000, h = Math.PI / n;
        const g = (t: number) => (t === 0 ? 1 : Math.sin(t) / t);
        let simpson = g(0) + g(Math.PI);
        for (let i = 1; i < n; i++) simpson += g(i * h) * (i % 2 ? 4 : 2);
        const Si = simpson * h / 3;
        expect(Si).toBeCloseTo(1.851937052, 8);
        expect(2 * Si / Math.PI).toBeCloseTo(1.17898, 5);
        expect(((2 * Si / Math.PI - 1) / 2 * 100)).toBeCloseTo(8.95, 2);
        // The error tends to 1 as x -> 0+: |S_101 - f| at x = 1e-6.
        expect(Math.abs(S(101, 1e-6) - 1).toFixed(5)).toBe('0.99994');
        // The prose quotes these values.
        const sl = proseOf('sl'), en = proseOf('en');
        for (const quoted of ['0{,}84883', '0{,}94731', '1{,}00622', '1{,}18130', '1{,}17901', '1{,}17898', '9{,}07', '8{,}95', '0{,}2618', '0{,}99994', 'x=1{,}57']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['0.84883', '0.94731', '1.00622', '1.18130', '1.17901', '1.17898', '9.07', '8.95', '0.2618', '0.99994', 'x=1.57']) expect(en, quoted).toContain(quoted);
    });

    test('the lesson resolves, owns its section and keeps both languages complete', () => {
        expect(getGuidedLessonOwners(ID)).toEqual([{chapterId: FOURIER_CHAPTER_ID, sectionId: ID}]);
        expect(getGuidedLessonOwner(ID)).toEqual({chapterId: FOURIER_CHAPTER_ID, sectionId: ID});
        expect(authoredGuidedLessonIds(FOURIER_CHAPTER_ID, ID)).toEqual([ID]);
        const lesson = getLessonForDemonstration(ID)!;
        expect(lesson).toBe(fourierGuidedExampleRegistry[ID]);
        expect(lesson.demonstrationId).toBe(ID);
        expect(lesson.steps.length).toBe(13);
        for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
            expect(field.sl.length).toBeGreaterThan(2);
            expect(field.en.length).toBeGreaterThan(2);
        }
        expect(authoredGuidedLessonIds(FOURIER_CHAPTER_ID, 'fourier-idea')).toEqual([]);
        expect(authoredGuidedLessonIds('analysis', 'convergence')).not.toContain(ID);
    });

    test('learn launches, example links and old routes land on the owning section', () => {
        const launch = guidedLessonLaunchPath(ID);
        expect(launch).toContain(`learnChapter=${FOURIER_CHAPTER_ID}&learnSection=${ID}`);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(ID)!)).toBe(`/bezeg-2.0/learn/${FOURIER_CHAPTER_ID}#${ID}`);
        const search = launch.slice(launch.indexOf('?'));
        expect(resolveGuidedExample(search, ID)?.owner).toEqual({chapterId: FOURIER_CHAPTER_ID, sectionId: ID});
        const exampleId = `lesson.${FOURIER_CHAPTER_ID}.${ID}.${ID}`;
        expect(resolveGuidedExample(`?example=${exampleId}`, ID)?.lesson).toBe(fourierGuidedExampleRegistry[ID]);
        const links = getChapterGuidedExamples(FOURIER_CHAPTER_ID, ID);
        expect(links.map(link => link.path)).toEqual([fourierGuidedExamplePath(ID)]);
        expect(links[0].path).toContain(`?example=${exampleId}`);
        // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
        expect(resolveGuidedLessonOwner('?learn=1&learnChapter=analysis&learnSection=convergence', ID)).toEqual({chapterId: FOURIER_CHAPTER_ID, sectionId: ID});
        // The accepted break: the interim owner's example id no longer resolves.
        expect(resolveGuidedExample(`?example=lesson.analysis.convergence.${ID}`, ID)?.lesson).toBeUndefined();
        expect(resolveGuidedExample(`?learn=1&learnChapter=${FOURIER_CHAPTER_ID}&learnSection=nope`, ID)).toBeUndefined();
        expect(getChapterGuidedExamples(FOURIER_CHAPTER_ID, 'fourier-idea')).toEqual([]);
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        expect(getLessonForDemonstration(ID)!.title.en.length).toBeGreaterThan(5);
    });
});
