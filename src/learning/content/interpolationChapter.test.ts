import {setLanguage} from '../../localization';
import {
    bezierCurvePoint, chebyshevNodes, curveParameters, equispacedNodes, interpolationErrorSample, interpolationFunction, lagrangeCurvePoint,
    type Point2,
} from '../../analysis/interpolation';
import {catmullRomSegments, catmullRomTangents, hermitePoint} from '../../analysis/hermite';
import {fitLine, fitPolynomial} from '../../analysis/leastSquares';
import {fourPointStep, subdivisionRounds} from '../../analysis/subdivision';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {interpolationChapter} from './interpolationChapter';
import {INTERPOLATION_CHAPTER_ID, interpolationGuidedExamplePath, interpolationGuidedExampleRegistry} from './interpolationChapterRegistry';
import {familyChapters} from './familyChapters';

const SECTIONS = [
    ['lagrange', 'interp-lagrange'], ['runge', 'interp-runge'], ['hermite', 'interp-hermite'],
    ['least-squares', 'interp-least-squares'], ['subdivision', 'interp-subdivision'],
] as const;
const everything = (language: 'sl' | 'en') => [
    interpolationChapter.purpose, interpolationChapter.prerequisites,
    ...interpolationChapter.sections.flatMap(section => [section.title, ...section.paragraphs]),
].map(item => item[language]).join(' ') + interpolationChapter.sections.map(section => section.formula ?? '').join(' ');
const near = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
};
const P: Point2[] = [[0, 0], [1, 2], [3, 3], [4, 0]];

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter follows b-splines in the curves strand with an opening and five lesson sections', () => {
        expect(interpolationChapter.id).toBe(INTERPOLATION_CHAPTER_ID);
        expect(interpolationChapter.title).toEqual({sl: 'Interpolacija in aproksimacija', en: 'Interpolation and approximation'});
        expect(interpolationChapter.family).toBe('/bezeg-2.0/interpolation');
        expect(interpolationChapter.sections.map(section => section.id)).toEqual(['through-or-near', ...SECTIONS.map(([id]) => id)]);
        expect(Object.keys(interpolationGuidedExampleRegistry)).toEqual(SECTIONS.map(([id]) => id));
        expect(familyChapters.findIndex(chapter => chapter.id === INTERPOLATION_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === 'b-splines') + 1);
        expect(learningChapters.findIndex(chapter => chapter.id === INTERPOLATION_CHAPTER_ID))
            .toBe(learningChapters.findIndex(chapter => chapter.id === 'b-splines') + 1);
        expect(interpolationChapter.sections.slice(1).map(section => section.demonstrationIds)).toEqual(SECTIONS.map(([, id]) => [id]));
        expect(interpolationChapter.prerequisiteLinks?.map(link => link.path))
            .toEqual(['/bezeg-2.0/learn/bezier-curves', '/bezeg-2.0/learn/splines', '/bezeg-2.0/learn/analysis']);
    });

    test('each lesson section ends with its example link and the opening section has none', () => {
        const registered = familyChapters.find(chapter => chapter.id === INTERPOLATION_CHAPTER_ID)!;
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        SECTIONS.forEach(([section, demonstration], index) => {
            expect(registered.sections[index + 1].orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${INTERPOLATION_CHAPTER_ID}.${section}.${demonstration}`});
            expect(registered.sections[index + 1].formula).toBeTruthy();
        });
    });

    test('the chapter does not promise further sections in either language', () => {
        expect(everything('sl')).not.toMatch(/Nadaljnji razdelki/);
        expect(everything('en')).not.toMatch(/Further sections/);
    });

    test('the lessons resolve, own their sections and keep both languages complete', () => {
        for (const [section, id] of SECTIONS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: INTERPOLATION_CHAPTER_ID, sectionId: section}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: INTERPOLATION_CHAPTER_ID, sectionId: section});
            expect(authoredGuidedLessonIds(INTERPOLATION_CHAPTER_ID, section)).toEqual([id]);
            expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain(id);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(interpolationGuidedExampleRegistry[section]);
            expect(lesson.demonstrationId).toBe(id);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(2);
                expect(field.en.length).toBeGreaterThan(2);
            }
        }
        expect(authoredGuidedLessonIds(INTERPOLATION_CHAPTER_ID, 'through-or-near')).toEqual([]);
    });

    test('learn launches, example links and the accepted id break land on the owning sections', () => {
        for (const [section, id] of SECTIONS) {
            const launch = guidedLessonLaunchPath(id);
            const owner = {chapterId: INTERPOLATION_CHAPTER_ID, sectionId: section};
            expect(launch).toContain(`learnChapter=${INTERPOLATION_CHAPTER_ID}&learnSection=${section}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${INTERPOLATION_CHAPTER_ID}#${section}`);
            const exampleId = `lesson.${INTERPOLATION_CHAPTER_ID}.${section}.${id}`;
            expect(resolveGuidedExample(launch.slice(launch.indexOf('?')), id)?.owner).toEqual(owner);
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(interpolationGuidedExampleRegistry[section]);
            const links = getChapterGuidedExamples(INTERPOLATION_CHAPTER_ID, section);
            expect(links.map(link => link.path)).toEqual([interpolationGuidedExamplePath(section)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // The accepted break: the interim owner's example id no longer resolves.
            expect(resolveGuidedExample(`?example=lesson.bezier-curves.geometric-properties.${id}`, id)?.lesson).toBeUndefined();
        }
        expect(getChapterGuidedExamples(INTERPOLATION_CHAPTER_ID, 'through-or-near')).toEqual([]);
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

    test('I1: Lagrange and Bezier weights and points; the Lagrange point lies above the hull edge', () => {
        const t = curveParameters(P, 'uniform');
        expect(t).toEqual([0, 1, 2, 3]);
        const lagrange = lagrangeCurvePoint(P, t, 1.5);
        near(lagrange.weights, [-1 / 16, 9 / 16, 9 / 16, -1 / 16]);
        near(lagrange.point, [2, 2.8125]);
        const bezier = bezierCurvePoint(P, 0.5);
        near(bezier.weights, [1 / 8, 3 / 8, 3 / 8, 1 / 8]);
        near(bezier.point, [2, 1.875]);
        // The hull's upper edge from (1,2) to (3,3) has height 2.5 at x = 2.
        expect(2 + (3 - 2) * (2 - 1) / (3 - 1)).toBe(2.5);
        expect(lagrange.point[1]).toBeGreaterThan(2.5);
        quoted('sl', ['2.8125', '1.875', '2.5']);
        quoted('en', ['2.8125', '1.875', '2.5']);
    });

    test('I2: grid maxima equal the Runge table values to the quoted digits', () => {
        const f = interpolationFunction('runge');
        const maxima = (rule: 'equispaced' | 'chebyshev', n: number) => interpolationErrorSample(
            f, rule === 'equispaced' ? equispacedNodes(n, -1, 1) : chebyshevNodes(n, -1, 1), -1, 1, 20001);
        const digits = (value: number, significant: number) => Number(value.toPrecision(significant));
        expect(digits(maxima('equispaced', 10).maxError, 5)).toBe(1.9157);
        expect(digits(maxima('equispaced', 15).maxError, 5)).toBe(2.1076);
        expect(digits(maxima('equispaced', 20).maxError, 4)).toBe(59.82);
        expect(digits(maxima('chebyshev', 10).maxError, 4)).toBe(0.1092);
        expect(digits(maxima('chebyshev', 15).maxError, 3)).toBe(0.0831);
        expect(digits(maxima('chebyshev', 20).maxError, 4)).toBe(0.01533);
        expect(Math.abs(maxima('equispaced', 10).argMax)).toBeGreaterThan(0.9);
        expect(Math.abs(maxima('equispaced', 10).argMax)).toBeLessThan(0.95);
        quoted('sl', ['1.9157', '2.1076', '59.82', '0.1092', '0.0831', '0.01533', '20001']);
        quoted('en', ['1.9157', '2.1076', '59.82', '0.1092', '0.0831', '0.01533', '20001']);
    });

    test('I3: Catmull-Rom tangents and the Hermite midpoint equal the Lagrange point', () => {
        const m = catmullRomTangents(P, 'uniform');
        near(m[1], [1.5, 1.5]);
        near(m[2], [1.5, -1]);
        const middle = hermitePoint(catmullRomSegments(P, 'uniform')[1], 0.5);
        near(middle, [2, 2.8125]);
        near(middle, lagrangeCurvePoint(P, [0, 1, 2, 3], 1.5).point);
        quoted('sl', ['(1.5;\\,1.5)', '(1.5;\\,-1)', '2.8125']);
        quoted('en', ['(1.5,\\,1.5)', '(1.5,\\,-1)', '2.8125']);
    });

    test('I4: the best line, the quadratic and cubic fits and the outlier case', () => {
        const data: Point2[] = [[0, 1], [1, 2], [2, 2], [3, 4]];
        const line = fitLine(data);
        near([line.slope, line.intercept], [0.9, 0.9]);
        near(line.residuals, [0.1, 0.2, -0.7, 0.4]);
        expect(line.residuals.reduce((s, r) => s + r, 0)).toBeCloseTo(0, 12);
        expect(line.residualSumOfSquares).toBeCloseTo(0.7, 12);
        expect(fitPolynomial(data, 2).residualSumOfSquares).toBeCloseTo(0.45, 12);
        expect(fitPolynomial(data, 3).residualSumOfSquares).toBeLessThan(1e-20);
        const outlier = fitLine([[0, 1], [1, 2], [2, 2], [3, 8]]);
        near([outlier.slope, outlier.intercept], [2.1, 0.1]);
        expect(outlier.residualSumOfSquares).toBeCloseTo(8.7, 12);
        quoted('sl', ['0.9x+0.9', '0.7', '0.45', '2.1x+0.1', '8.7', '-0.7', '0.4']);
        quoted('en', ['0.9x+0.9', '0.7', '0.45', '2.1x+0.1', '8.7', '-0.7', '0.4']);
    });

    test('I5: Chaikin and four-point points on the edge p1p2 and the vertex counts of closed polygons', () => {
        const contains = (stage: number[][], point: number[]) => stage.some(row => Math.abs(row[0] - point[0]) < 1e-12 && Math.abs(row[1] - point[1]) < 1e-12);
        const [, chaikin] = subdivisionRounds(P, false, 'chaikin', 1);
        expect(contains(chaikin, [1.5, 2.25]) && contains(chaikin, [2.5, 2.75])).toBe(true);
        const four = fourPointStep(P, false);
        expect(contains(four, [2, 2.8125])).toBe(true);
        for (const point of P) expect(contains(four, [...point])).toBe(true); // the old points stay
        for (const rule of ['chaikin', 'four-point'] as const) {
            const stages = subdivisionRounds([[0, 0], [4, 0], [2, 3]], true, rule, 3);
            expect(stages.map(stage => stage.length)).toEqual([3, 6, 12, 24]);
        }
        quoted('sl', ['(1.5;\\,2.25)', '(2.5;\\,2.75)', '(2;\\,2.8125)', '2^kn']);
        quoted('en', ['(1.5,\\,2.25)', '(2.5,\\,2.75)', '(2,\\,2.8125)', '2^kn']);
        for (const language of ['sl', 'en'] as const) {
            expect(everything(language)).toContain('\\tfrac1{16}');
            expect(everything(language)).not.toMatch(/C\^2\\\) (za|for) (štiri|the four)/);
        }
    });
});
