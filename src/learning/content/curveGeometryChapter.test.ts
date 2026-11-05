import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {curveGeometryChapter} from './curveGeometryChapter';
import {
    CURVE_GEOMETRY_CHAPTER_ID, curveGeometryGuidedExamplePath, curveGeometryGuidedExampleRegistry,
} from './curveGeometryChapterRegistry';
import {familyChapters} from './familyChapters';

const IDS = ['curve-parametric', 'curve-curvature', 'curve-comb', 'curve-evolute', 'curve-offset', 'curve-envelope'] as const;
const everything = (language: 'sl' | 'en') => [
    curveGeometryChapter.purpose, curveGeometryChapter.prerequisites,
    ...curveGeometryChapter.sections.flatMap(section => [section.title, ...section.paragraphs]),
].map(item => item[language]).join(' ') + curveGeometryChapter.sections.map(section => section.formula ?? '').join(' ');

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter follows parametrization in the curves strand with an opening and six lesson sections', () => {
        expect(curveGeometryChapter.id).toBe(CURVE_GEOMETRY_CHAPTER_ID);
        expect(curveGeometryChapter.title).toEqual({sl: 'Geometrija krivulj', en: 'Geometry of curves'});
        expect(curveGeometryChapter.family).toBe('/bezeg-2.0/curve-geometry');
        expect(curveGeometryChapter.sections.map(section => section.id)).toEqual(['curve-geometry-idea', ...IDS]);
        expect(Object.keys(curveGeometryGuidedExampleRegistry)).toEqual([...IDS]);
        const order = familyChapters.map(chapter => chapter.id);
        expect(order.indexOf(CURVE_GEOMETRY_CHAPTER_ID)).toBe(order.indexOf('parametrization') + 1);
        // The curve chapters it builds on come earlier; the calculus chapter sits in the functions strand, which follows.
        for (const link of curveGeometryChapter.prerequisiteLinks!.slice(0, 3)) {
            expect(order.indexOf(link.path.split('/').at(-1)!), link.path).toBeLessThan(order.indexOf(CURVE_GEOMETRY_CHAPTER_ID));
        }
        expect(learningChapters.some(chapter => chapter.id === CURVE_GEOMETRY_CHAPTER_ID)).toBe(true);
        expect(curveGeometryChapter.sections.slice(1).map(section => section.demonstrationIds)).toEqual([['curve-parametric'], ['curve-curvature'], ['curve-comb'], ['curve-evolute'], ['curve-offset'], ['curve-envelope']]);
        expect(curveGeometryChapter.prerequisiteLinks?.map(link => link.path)).toEqual([
            '/bezeg-2.0/learn/parametrization', '/bezeg-2.0/learn/ph-curves', '/bezeg-2.0/learn/bezier-curves', '/bezeg-2.0/learn/functions-and-calculus',
        ]);
    });

    test('each lesson section ends with its example link and the opening section has none', () => {
        const registered = familyChapters.find(chapter => chapter.id === CURVE_GEOMETRY_CHAPTER_ID)!;
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        IDS.forEach((id, index) => {
            expect(registered.sections[index + 1].orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${CURVE_GEOMETRY_CHAPTER_ID}.${id}.${id}`});
        });
    });

    test('all six released lessons are presented and the terms are in both languages', () => {
        const terms = {sl: ['ukrivljenost', 'krivinska krožnica', 'parametrične in polarne krivulje', 'glavnik ukrivljenosti', 'stik', 'evoluta', 'ost', 'vzporednica', 'ovojnica'], en: ['curvature', 'osculating circle', 'parametric and polar curves', 'curvature comb', 'join', 'evolute', 'cusp', 'offset', 'envelope']};
        for (const language of ['sl', 'en'] as const) {
            const body = everything(language).toLowerCase();
            for (const word of terms[language]) expect(body, `${language}: ${word}`).toContain(word);
        }
        expect(curveGeometryChapter.sections.flatMap(section => section.demonstrationIds ?? [])).toEqual([...IDS]);
    });

    test('the quoted numbers equal a direct computation of the cycloid, the cardioid, the parabola and the cubic', () => {
        // Cycloid with r = 1: speed 2 sin(t/2); midpoint rule for the arch length and the area under the arch.
        const N = 200000, h = 2 * Math.PI / N;
        let length = 0, area = 0;
        for (let i = 0; i < N; i++) {
            const t = (i + 0.5) * h;
            length += Math.hypot(1 - Math.cos(t), Math.sin(t)) * h;
            area += (1 - Math.cos(t)) ** 2 * h;
        }
        expect(length).toBeCloseTo(8, 6);
        expect(area).toBeCloseTo(3 * Math.PI, 6);
        // Cardioid rho = 1 + cos(theta) at theta = 0: rho = 2, rho' = 0, rho'' = -1.
        const [rho, d1, d2] = [2, 0, -1];
        expect((rho ** 2 + 2 * d1 ** 2 - rho * d2) / (rho ** 2 + d1 ** 2) ** 1.5).toBe(0.75);
        // Parabola y = x^2: kappa = 2 / (1 + 4 x^2)^(3/2), centre p + N / kappa with N = (-2x, 1) / sqrt(1 + 4x^2).
        const parabola = (x: number) => {
            const kappa = 2 / (1 + 4 * x * x) ** 1.5, s = Math.sqrt(1 + 4 * x * x);
            return {kappa, radius: 1 / kappa, centre: [x - 2 * x / s / kappa, x * x + 1 / s / kappa]};
        };
        expect(parabola(0)).toEqual({kappa: 2, radius: 0.5, centre: [0, 0.5]});
        const one = parabola(1);
        expect(one.kappa).toBeCloseTo(0.17889, 5);
        expect(one.radius).toBeCloseTo(5.5902, 4);
        expect(one.centre[0]).toBeCloseTo(-4, 9);
        expect(one.centre[1]).toBeCloseTo(3.5, 9);
        // Cubic Bezier (0,0), (1,0), (2,1), (3,3): kappa = |x'y'' - y'x''| / |r'|^3 from the hodograph.
        const P = [[0, 0], [1, 0], [2, 1], [3, 3]];
        const d = (t: number, order: number) => {
            const q = order === 1 ? P.slice(1).map((p, i) => p.map((c, j) => 3 * (c - P[i][j]))) : [0, 1].map(i => P[i + 2].map((c, j) => 6 * (c - 2 * P[i + 1][j] + P[i][j])));
            const bern = order === 1 ? [(1 - t) ** 2, 2 * t * (1 - t), t * t] : [1 - t, t];
            return [0, 1].map(j => q.reduce((sum, row, i) => sum + bern[i] * row[j], 0));
        };
        const kappa = (t: number) => { const [a, b] = d(t, 1), [c, e] = d(t, 2); return Math.abs(a * e - b * c) / Math.hypot(a, b) ** 3; };
        expect(kappa(0)).toBeCloseTo(2 / 3, 12);
        expect(kappa(0.5)).toBeCloseTo(0.2357, 4);
        expect(kappa(1)).toBeCloseTo(0.05963, 5);
        const sl = everything('sl'), en = everything('en');
        for (const quoted of ['\\int_0^{2\\pi}2\\sin\\tfrac t2\\,dt=8', '3\\pi', '\\kappa(0)=\\tfrac{4+2}{8}=\\tfrac34', '\\kappa(0)=2', '\\tfrac12', '(0,\\tfrac12)', '0{,}17889', '5{,}5902', '(-4;\\,3{,}5)', '\\kappa(0)=\\tfrac23', '0{,}23570', '0{,}05963']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['\\int_0^{2\\pi}2\\sin\\tfrac t2\\,dt=8', '3\\pi', '\\kappa(0)=\\tfrac{4+2}{8}=\\tfrac34', '\\kappa(0)=2', '\\tfrac12', '(0,\\tfrac12)', '0.17889', '5.5902', '(-4,\\,3.5)', '\\kappa(0)=\\tfrac23', '0.23570', '0.05963']) expect(en, quoted).toContain(quoted);
    });

    test('the lessons resolve, own their sections and keep both languages complete', () => {
        for (const id of IDS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: CURVE_GEOMETRY_CHAPTER_ID, sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: CURVE_GEOMETRY_CHAPTER_ID, sectionId: id});
            expect(authoredGuidedLessonIds(CURVE_GEOMETRY_CHAPTER_ID, id)).toEqual([id]);
            expect(authoredGuidedLessonIds('parametrization', 'uniform-timing')).not.toContain(id);
            expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain(id);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(curveGeometryGuidedExampleRegistry[id]);
            expect(lesson.demonstrationId).toBe(id);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(2);
                expect(field.en.length).toBeGreaterThan(2);
            }
        }
        expect(authoredGuidedLessonIds(CURVE_GEOMETRY_CHAPTER_ID, 'curve-geometry-idea')).toEqual([]);
    });

    test('learn launches, example links and the accepted id break land on the owning sections', () => {
        const formerOwners: Partial<Record<(typeof IDS)[number], string>> = {'curve-parametric': 'parametrization.uniform-timing', 'curve-curvature': 'bezier-curves.geometric-properties'};
        for (const id of IDS) {
            const launch = guidedLessonLaunchPath(id);
            expect(launch).toContain(`learnChapter=${CURVE_GEOMETRY_CHAPTER_ID}&learnSection=${id}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${CURVE_GEOMETRY_CHAPTER_ID}#${id}`);
            const exampleId = `lesson.${CURVE_GEOMETRY_CHAPTER_ID}.${id}.${id}`;
            expect(resolveGuidedExample(launch.slice(launch.indexOf('?')), id)?.owner).toEqual({chapterId: CURVE_GEOMETRY_CHAPTER_ID, sectionId: id});
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(curveGeometryGuidedExampleRegistry[id]);
            const links = getChapterGuidedExamples(CURVE_GEOMETRY_CHAPTER_ID, id);
            expect(links.map(link => link.path)).toEqual([curveGeometryGuidedExamplePath(id)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // The accepted break: the interim owner's example id no longer resolves.
            // The comb lesson is new in this chapter and has no former owner.
            if (formerOwners[id]) expect(resolveGuidedExample(`?example=lesson.${formerOwners[id]}.${id}`, id)?.lesson).toBeUndefined();
        }
        expect(getChapterGuidedExamples(CURVE_GEOMETRY_CHAPTER_ID, 'curve-geometry-idea')).toEqual([]);
    });
});
