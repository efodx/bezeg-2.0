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
import {CLT_EXAMPLES, cltView, shapeMoments} from '../../analysis/cltModel';
import {DEFAULT_SUMMARY_MODEL, SUMMARY_EXAMPLES, summaryStatisticsView} from '../../analysis/summaryStatisticsModel';
import {correlation} from '../../analysis/correlation';
import {CORRELATION_EXAMPLES} from '../../analysis/correlationModel';

const SECTIONS = [['density', 'prob-density'], ['binomial-normal', 'prob-binomial-normal'], ['clt', 'prob-clt'], ['summary', 'prob-summary'], ['correlation', 'prob-correlation']] as const;
const everything = (language: 'sl' | 'en') => [
    probabilityChapter.purpose, probabilityChapter.prerequisites,
    ...probabilityChapter.sections.flatMap(section => [section.title, ...section.paragraphs]),
].map(item => item[language]).join(' ') + probabilityChapter.sections.map(section => section.formula ?? '').join(' ');

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter ends the functions strand with an opening and four lesson sections', () => {
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

    test('P3: the quoted Kolmogorov distances equal the CLT kernel and the moments equal the shapes', () => {
        const distance = (example: 'uniform' | 'skewed', n: number) => {
            const result = cltView({...CLT_EXAMPLES[example], n});
            if (!result.ok) throw new Error('the CLT view must exist for a catalogued example');
            return result.view.kolmogorov.toFixed(5);
        };
        expect(distance('uniform', 10)).toBe('0.00281');
        expect(distance('skewed', 10)).toBe('0.01248');
        expect(shapeMoments(CLT_EXAMPLES.uniform.heights)!.variance).toBeCloseTo(1 / 12, 3);
        expect(shapeMoments(CLT_EXAMPLES.skewed.heights)!.mean).toBeCloseTo(1 / 3, 3);
        expect(shapeMoments(CLT_EXAMPLES.skewed.heights)!.variance).toBeCloseTo(1 / 18, 3);
        for (const language of ['sl', 'en'] as const) quoted(language, ['0.00281', '0.01248']);
    });

    test('P4: the quoted mean, median, sigma, quartiles, fences and deviation sums equal the summary model', () => {
        const school = summaryStatisticsView(DEFAULT_SUMMARY_MODEL);
        const outlier = summaryStatisticsView({...DEFAULT_SUMMARY_MODEL, values: SUMMARY_EXAMPLES.outlier});
        const exclusive = summaryStatisticsView({...DEFAULT_SUMMARY_MODEL, rule: 'exclusive'});
        if (school.summary.status !== 'ok' || outlier.summary.status !== 'ok' || exclusive.summary.status !== 'ok') throw new Error('seven values give a box plot');
        expect(school.mean.toFixed(6)).toBe('5.857143');
        expect(school.median).toBe(6);
        expect(school.sigmaPopulation.toFixed(4)).toBe('1.2454');
        expect(school.sigmaSample!.toFixed(4)).toBe('1.3452');
        expect(school.atMean.squared.toFixed(3)).toBe('10.857');
        expect(school.atMedian.squared).toBeCloseTo(11, 9);
        expect(school.atMedian.absolute).toBeCloseTo(7, 9);
        expect(school.atMean.absolute.toFixed(3)).toBe('7.143');
        expect(SUMMARY_EXAMPLES.outlier).toEqual([4, 5, 5, 6, 6, 7, 30]);
        expect(outlier.mean).toBeCloseTo(9, 9);
        expect(outlier.median).toBe(6);
        expect(outlier.sigmaPopulation.toFixed(4)).toBe('8.6189');
        expect([outlier.summary.q1, outlier.summary.q3, outlier.summary.lowerFenceQuarter / 40, outlier.summary.upperFenceQuarter / 40]).toEqual([5, 6.5, 2.75, 8.75]);
        expect([exclusive.summary.q1, exclusive.summary.q3]).toEqual([5, 7]);
        for (const language of ['sl', 'en'] as const) quoted(language, ['5.857143', '1.2454', '1.3452', '10.857', '7.143', '8.6189', '6.5', '2.75', '8.75']);
    });

    test('P4: the chapter names the quartile rule and sigma, says calculators differ and that an outlier is a convention', () => {
        for (const needle of ['šolsko pravilo', 'populacijski \\(\\sigma\\)', 'Kalkulatorji in programi se razlikujejo', 'osamelec je dogovor', 'ne matematična lastnost']) {
            expect(everything('sl'), needle).toContain(needle);
        }
        for (const needle of ['school quartile rule', 'population \\(\\sigma\\)', 'Calculators and software differ', 'An outlier is a convention', 'not a mathematical property']) {
            expect(everything('en'), needle).toContain(needle);
        }
    });

    test('P5: the quoted sums, r, both regression lines and the outlier case equal the correlation kernel', () => {
        const base = correlation(CORRELATION_EXAMPLES.default);
        const outlier = correlation(CORRELATION_EXAMPLES.outlier);
        const parabola = correlation(CORRELATION_EXAMPLES.parabola);
        if (!base.yOnX || !base.xOnY || !outlier.yOnX || base.r === undefined || outlier.r === undefined) throw new Error('the default and outlier data give both lines and r');
        expect([base.sxx, base.syy, base.sxy]).toEqual([5, 4.75, 4.5]);
        expect(base.r.toFixed(5)).toBe('0.92338');
        expect(base.rSquared).toBeCloseTo(81 / 95, 12);
        expect([base.yOnX.slope, base.yOnX.intercept, base.residualSumOfSquares!].map(value => value.toFixed(9))).toEqual(['0.900000000', '0.900000000', '0.700000000']);
        expect(base.residualSumOfSquares!).toBeCloseTo(base.syy * (1 - base.rSquared!), 12);
        expect([base.xOnY.slope.toFixed(5), base.xOnY.intercept.toFixed(5)]).toEqual(['0.94737', '-0.63158']);
        expect(base.yOnX.slope * base.xOnY.slope).toBeCloseTo(base.rSquared!, 12);
        expect(outlier.r.toFixed(5)).toBe('0.84680');
        expect([outlier.yOnX.slope.toFixed(9), outlier.yOnX.intercept.toFixed(9), outlier.residualSumOfSquares!.toFixed(9)]).toEqual(['2.100000000', '0.100000000', '8.700000000']);
        expect([parabola.nSxy, parabola.r]).toEqual([0, 0]);
        for (const language of ['sl', 'en'] as const) quoted(language, ['4.75', '4.5', '0.92338', '0.84680', '0.94737', '0.63158', '0.9x+0.9', '2.1x+0.1', '8.7', '0.7=']);
        expect(everything('sl')).toContain('\\(r^2=\\tfrac{81}{95}\\)');
    });

    test('P5: the chapter says r is linear only, r = 0 is not independence, |r| is not causation, the residual is a choice, and the matura goal', () => {
        for (const needle of ['meri samo linearno povezanost', '\\(r=0\\) ne pomeni neodvisnosti', 'ne pomeni vzročnosti', 'En osamelec lahko \\(r\\) močno spremeni', 'modelska izbira', 'preprostih povezavah', 'predznaka naklona', 'univerzitetna razširitev']) {
            expect(everything('sl'), needle).toContain(needle);
        }
        for (const needle of ['measures linear association only', '\\(r=0\\) does not mean independence', 'does not mean causation', 'One outlier can change \\(r\\)', 'modelling choice', 'simple associations', 'sign of the regression line\'s slope', 'university-level extension']) {
            expect(everything('en'), needle).toContain(needle);
        }
    });

    test('the chapter names the theorem, its hypotheses and sources, and says convergence is in distribution without a rate', () => {
        for (const needle of ['neodvisne, enako porazdeljene', 'končno varianco', 'FMF, Verjetnost in Statistika', 'Berry–Esseen', 'v porazdelitvi', 'ni hitrost']) {
            expect(everything('sl'), needle).toContain(needle);
        }
        for (const needle of ['independent, identically distributed', 'finite variance', 'FMF, Verjetnost and Statistika', 'Berry–Esseen', 'in distribution', 'is not a rate']) {
            expect(everything('en'), needle).toContain(needle);
        }
    });

    test('the chapter states de Moivre-Laplace as a limit without a rate, in both languages', () => {
        expect(everything('sl')).toContain('\\to\\Phi(x)');
        expect(everything('sl')).toMatch(/hitrosti konvergence ne podaja/);
        expect(everything('en')).toContain('\\to\\Phi(x)');
        expect(everything('en')).toMatch(/no rate of convergence/);
    });
});
