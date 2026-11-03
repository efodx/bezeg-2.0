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
const CID = 'fourier-coefficients';
const coefficientsProseOf = (language: 'sl' | 'en') => fourierChapter.sections[2].paragraphs.map(p => p[language]).join(' ') + fourierChapter.sections[2].formula;
const proseOf = (language: 'sl' | 'en') => fourierChapter.sections[1].paragraphs.map(p => p[language]).join(' ') + fourierChapter.sections[1].formula;

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter is registered last in the Analysis family with an opening and two lesson sections', () => {
        expect(fourierChapter.id).toBe(FOURIER_CHAPTER_ID);
        expect(FOURIER_CHAPTER_ID).toBe('fourier-series');
        expect(fourierChapter.title).toEqual({sl: 'Fourierove vrste', en: 'Fourier series'});
        expect(fourierChapter.family).toBe('analysis');
        expect(fourierChapter.sections.map(section => section.id)).toEqual(['fourier-idea', ID, CID]);
        expect(Object.keys(fourierGuidedExampleRegistry)).toEqual([ID, CID]);
        expect(familyChapters.findIndex(chapter => chapter.id === FOURIER_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === numericalChapter.id) + 1);
        expect(familyChapters.at(-2)!.id).toBe(FOURIER_CHAPTER_ID); // the probability chapter follows it at the end of the functions strand
        expect(learningChapters.some(chapter => chapter.id === FOURIER_CHAPTER_ID)).toBe(true);
        expect(fourierChapter.sections[1].demonstrationIds).toEqual([ID]);
        expect(fourierChapter.sections[2].demonstrationIds).toEqual([CID]);
        expect(Object.keys(fourierChapter.sections[2].investigationPrompts ?? {})).toEqual([CID]);
    });

    test('epicycles and closed curves are not advertised', () => {
        const everything = JSON.stringify({...fourierChapter, title: undefined}).toLowerCase();
        for (const word of ['epicikl', 'epicycle', 'zaprt', 'closed curve']) expect(everything).not.toContain(word);
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
        const coefficients = registered.sections[2];
        expect(coefficients.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${FOURIER_CHAPTER_ID}.${CID}.${CID}`});
        expect(coefficients.orderedContent!.filter(item => item.kind === 'formula').length).toBe(1);
        expect(coefficients.paragraphs.length).toBeGreaterThanOrEqual(3);
        expect(coefficients.paragraphs.length).toBeLessThanOrEqual(4);
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

    test('the coefficients section states its hypotheses, sources and the one-directional claims in both languages', () => {
        const facts = {
            sl: ['Cilj razdelka', 'predznačena ploščina', 'projekcija', 'Parseval', 'ne dokazano', 'Zygmund', 'Körner', 'samo v smeri gladkost', 'Obratne smeri ne trdimo', 'opažanje treh zgledov, ne zakon', 'Weierstrassov M-test', 'Obrata M-testa ne trdimo', 'ilustracije, ne dokazi', '\\sum|c_k|<\\infty'],
            en: ['Learning outcome', 'signed area', 'projection', 'Parseval', 'not proved', 'Zygmund', 'Körner', 'the forward direction only', 'The converse is not claimed', 'an observation of three examples, not a law', 'Weierstrass M-test', 'The converse of the M-test is not claimed', 'illustrations, not proofs', '\\sum|c_k|<\\infty'],
        };
        for (const language of ['sl', 'en'] as const) {
            const prose = coefficientsProseOf(language);
            for (const fact of facts[language]) expect(prose, `${language}: ${fact}`).toContain(fact);
        }
        expect(fourierChapter.sections[2].formula).toBe(String.raw`a_k=\frac1\pi\int_{-\pi}^{\pi}f(x)\cos kx\,dx,\qquad b_k=\frac1\pi\int_{-\pi}^{\pi}f(x)\sin kx\,dx`);
    });

    test('the quoted coefficient numbers are recomputed by closed forms and quadrature, not by the app kernel', () => {
        // |x|: a_k by Simpson quadrature of x cos kx / pi against the closed form -4/(pi k^2) for odd k.
        const n = 20000, h = 2 * Math.PI / n;
        const a = (k: number) => {
            let sum = 0;
            for (let i = 0; i <= n; i++) sum += Math.abs(-Math.PI + i * h) * Math.cos(k * (-Math.PI + i * h)) * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
            return sum * h / 3 / Math.PI;
        };
        for (const k of [1, 2, 3, 5]) expect(a(k)).toBeCloseTo(k % 2 ? -4 / (Math.PI * k * k) : 0, 8);
        // Parseval for |x|: (1/pi) integral of x^2 = 2 pi^2 / 3 (closed form) against a_0^2/2 + sum of a_k^2 up to K = 16.
        const integralOfSquare = 2 * Math.PI ** 2 / 3;
        let parseval = Math.PI ** 2 / 2; // a_0 = pi
        for (let k = 1; k <= 16; k += 2) parseval += (4 / (Math.PI * k * k)) ** 2;
        expect(integralOfSquare.toFixed(5)).toBe('6.57974');
        expect(parseval.toFixed(5)).toBe('6.57967');
        // The smooth example: a_k of 1/(2 - cos x) by quadrature against (2/sqrt3) r^k, r = 2 - sqrt3.
        const r = 2 - Math.sqrt(3);
        expect(r.toFixed(5)).toBe('0.26795');
        const g = (k: number) => {
            let sum = 0;
            for (let i = 0; i <= n; i++) { const x = -Math.PI + i * h; sum += Math.cos(k * x) / (2 - Math.cos(x)) * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2); }
            return sum * h / 3 / Math.PI;
        };
        for (const k of [1, 2, 5]) expect(g(k)).toBeCloseTo(2 / Math.sqrt(3) * r ** k, 9);
        const sl = coefficientsProseOf('sl'), en = coefficientsProseOf('en');
        for (const quoted of ['6{,}57974', '6{,}57967', '0{,}26795', 'K=16', '2\\pi^2/3']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['6.57974', '6.57967', '0.26795', 'K=16', '2\\pi^2/3']) expect(en, quoted).toContain(quoted);
    });

    test('the coefficients lesson resolves from its own section and the old interim launch still opens it', () => {
        expect(getGuidedLessonOwners(CID)).toEqual([{chapterId: FOURIER_CHAPTER_ID, sectionId: CID}]);
        expect(authoredGuidedLessonIds(FOURIER_CHAPTER_ID, CID)).toEqual([CID]);
        expect(authoredGuidedLessonIds(FOURIER_CHAPTER_ID, 'fourier-idea')).toEqual([]);
        const lesson = fourierGuidedExampleRegistry[CID];
        expect(lesson.demonstrationId).toBe(CID);
        expect(lesson.steps.length).toBe(14);
        expect(resolveGuidedExample(`?example=lesson.${FOURIER_CHAPTER_ID}.${CID}.${CID}`, CID)?.lesson).toBe(lesson);
        expect(resolveGuidedExample(`?learn=1&learnChapter=${FOURIER_CHAPTER_ID}&learnSection=${CID}`, CID)?.lesson).toBe(lesson);
        expect(resolveGuidedExample(`?learn=1&learnChapter=${FOURIER_CHAPTER_ID}&learnSection=fourier-idea`, CID)?.lesson).toBeUndefined();
        expect(getChapterGuidedExamples(FOURIER_CHAPTER_ID, CID).map(link => link.path)).toEqual([fourierGuidedExamplePath(CID)]);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(CID)!)).toBe(`/bezeg-2.0/learn/${FOURIER_CHAPTER_ID}#${CID}`);
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
