import {clipBezierPair, type ClipPoint} from '../../bezeg/impl/kernels/bezier-clipping';
import {setLanguage} from '../../localization';
import {getDemonstrationCatalog} from '../../demonstrations';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {advancedBezierChapter} from './advancedBezierChapter';
import {
    ADVANCED_BEZIER_CHAPTER_ID, advancedBezierGuidedExamplePath, advancedBezierGuidedExampleLessons,
} from './advancedBezierChapterRegistry';
import {familyChapters} from './familyChapters';
import {guidedLessonPreviewCopyByDemonstration} from './guidedExamplePreviewCopy';
import {sl as slCatalog} from '../../localization/sl';
import {en as enCatalog} from '../../localization/en';

const IDS = ['reduction', 'bezier-clipping', 'arc-length-param', 'patch-coons'] as const;
const everything = (language: 'sl' | 'en') => [
    advancedBezierChapter.purpose, advancedBezierChapter.prerequisites,
    ...advancedBezierChapter.sections.flatMap(section => [section.title, ...section.paragraphs]),
].map(item => item[language]).join(' ') + advancedBezierChapter.sections.map(section => section.formula ?? '').join(' ');

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter follows the patches chapter with an opening and four lesson sections', () => {
        expect(advancedBezierChapter.id).toBe(ADVANCED_BEZIER_CHAPTER_ID);
        expect(advancedBezierChapter.title).toEqual({sl: 'Napredne Bézierjeve teme', en: 'Advanced Bézier topics'});
        expect(advancedBezierChapter.sections.map(section => section.id)).toEqual(['advanced-bezier-idea', ...IDS]);
        expect(Object.keys(advancedBezierGuidedExampleLessons.all())).toEqual([...IDS]);
        const order = familyChapters.map(chapter => chapter.id);
        expect(order.indexOf(ADVANCED_BEZIER_CHAPTER_ID)).toBe(order.indexOf('bezier-patches') + 1);
        for (const link of advancedBezierChapter.prerequisiteLinks!) {
            const id = link.path.split('/').at(-1)!;
            const index = learningChapters.findIndex(chapter => chapter.id === id);
            expect(index, link.path).toBeGreaterThanOrEqual(0);
            expect(index, link.path).toBeLessThan(learningChapters.findIndex(chapter => chapter.id === ADVANCED_BEZIER_CHAPTER_ID));
        }
        expect(advancedBezierChapter.prerequisiteLinks?.map(link => link.path)).toEqual([
            '/bezeg-2.0/learn/bezier-curves', '/bezeg-2.0/learn/parametrization', '/bezeg-2.0/learn/ph-curves', '/bezeg-2.0/learn/bezier-patches',
        ]);
        expect(advancedBezierChapter.sections.slice(1).map(section => section.demonstrationIds)).toEqual(IDS.map(id => [id]));
    });

    test('the section demonstrations exist: three in the Bezier family and the Coons patch in the patches family', () => {
        const demonstrations = getDemonstrationCatalog().demonstrations;
        expect(advancedBezierChapter.family).toBe('/bezeg-2.0/bezier');
        expect(demonstrations.find(demo => demo.id === 'reduction')?.family).toBe('/bezeg-2.0/bezier');
        expect(demonstrations.find(demo => demo.id === 'bezier-clipping')?.family).toBe('/bezeg-2.0/bezier');
        expect(demonstrations.find(demo => demo.id === 'arc-length-param')?.family).toBe('/bezeg-2.0/bezier');
        expect(demonstrations.find(demo => demo.id === 'patch-coons')?.family).toBe('/bezeg-2.0/patches');
    });

    test('each lesson section ends with its example link and the opening section has none', () => {
        const registered = familyChapters.find(chapter => chapter.id === ADVANCED_BEZIER_CHAPTER_ID)!;
        expect((registered.sections[0].orderedContent ?? []).some(item => item.kind === 'example')).toBe(false);
        IDS.forEach((id, index) => {
            expect(registered.sections[index + 1].orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${ADVANCED_BEZIER_CHAPTER_ID}.${id}.${id}`});
        });
    });

    test('the terms are in both languages', () => {
        const terms = {
            sl: ['nižanje stopnje', 'naravna parametrizacija', 'parametrizacija z ločno dolžino', 'coonsova ploskev', 'tretja diferenca', 'mešanje', 'bézierovo rezanje', 'debela premica'],
            en: ['degree reduction', 'arc-length parametrization', 'coons patch', 'third difference', 'blend', 'bézier clipping', 'fat line'],
        };
        for (const language of ['sl', 'en'] as const) {
            const body = everything(language).toLowerCase();
            for (const word of terms[language]) expect(body, `${language}: ${word}`).toContain(word);
        }
    });

    test('the quoted reduction and Coons numbers equal a direct computation', () => {
        // Cubic P and its endpoint-fixed and free-endpoint quadratic optima, by dense sampling.
        const P = [[0, 0], [1, 3], [3, 3], [4, 0]];
        const errors = (Q: number[][]) => {
            const N = 100000;
            let max = 0, sum = 0;
            for (let k = 0; k <= N; k++) {
                const t = k / N;
                const b = [0, 1].map(j => (1 - t) ** 3 * P[0][j] + 3 * t * (1 - t) ** 2 * P[1][j] + 3 * t * t * (1 - t) * P[2][j] + t ** 3 * P[3][j]);
                const q = [0, 1].map(j => (1 - t) ** 2 * Q[0][j] + 2 * t * (1 - t) * Q[1][j] + t * t * Q[2][j]);
                const e = Math.hypot(b[0] - q[0], b[1] - q[1]);
                max = Math.max(max, e);
                sum += e * e / N;
            }
            return {max, l2: Math.sqrt(sum)};
        };
        expect([0, 1].map(j => (3 * (P[1][j] + P[2][j]) - P[0][j] - P[3][j]) / 4)).toEqual([2, 4.5]);
        expect([0, 1].map(j => P[3][j] - 3 * P[2][j] + 3 * P[1][j] - P[0][j])).toEqual([-2, 0]);
        const fixed = errors([[0, 0], [2, 4.5], [4, 0]]);
        expect(fixed.max).toBeCloseTo(Math.sqrt(3) / 18, 6);
        expect(fixed.l2).toBeCloseTo(0.069007, 5);
        const free = errors([[-0.1, 0], [2, 4.5], [4.1, 0]]);
        expect(free.max).toBeCloseTo(0.1, 6);
        expect(free.l2).toBeCloseTo(0.037796, 5);
        // Coons patch with cubic boundaries: the centre and the interior net Lc + Ld - B.
        const bern = (t: number) => [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
        const c0 = [[0, 0, 0], [1, 0, 2], [2, 0, 2], [3, 0, 0]], c1 = [[0, 3, 0], [1, 3, -1], [2, 3, -1], [3, 3, 0]];
        const d0 = [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]], d1 = [[3, 0, 0], [3, 1, 1], [3, 2, 1], [3, 3, 0]];
        const on = (curve: number[][], t: number) => [0, 1, 2].map(k => bern(t).reduce((sum, w, i) => sum + w * curve[i][k], 0));
        const bilinear = (u: number, v: number, k: number) => (1 - u) * (1 - v) * c0[0][k] + u * (1 - v) * c0[3][k] + (1 - u) * v * c1[0][k] + u * v * c1[3][k];
        const S = (u: number, v: number) => {
            const [a, b, c, d] = [on(c0, u), on(c1, u), on(d0, v), on(d1, v)];
            return [0, 1, 2].map(k => (1 - v) * a[k] + v * b[k] + (1 - u) * c[k] + u * d[k] - bilinear(u, v, k));
        };
        const close = (actual: number[], expected: number[]) => actual.forEach((value, k) => expect(value).toBeCloseTo(expected[k], 12));
        close(S(0.5, 0.5), [1.5, 1.5, 0.75]);
        const net = (i: number, j: number) => {
            const u = i / 3, v = j / 3;
            return [0, 1, 2].map(k => (1 - v) * c0[i][k] + v * c1[i][k] + (1 - u) * d0[j][k] + u * d1[j][k] - bilinear(u, v, k));
        };
        close(net(1, 1), [1, 1, 4 / 3]); close(net(1, 2), [1, 2, 1 / 3]); close(net(2, 1), [2, 1, 5 / 3]); close(net(2, 2), [2, 2, 2 / 3]);
        const sl = everything('sl'), en = everything('en');
        for (const quoted of ['(-2;\\,0)', '\\sqrt3/18', '0{,}069007', '0{,}037796', '(2;\\,4{,}5)', '(1{,}5;\\,1{,}5;\\,0{,}75)', '(1,1,\\tfrac43)', '(1,2,\\tfrac13)', '(2,1,\\tfrac53)', '(2,2,\\tfrac23)', '31/3', '6{,}390976', '8{,}32456']) expect(sl, quoted).toContain(quoted);
        for (const quoted of ['(-2,\\,0)', '\\sqrt3/18', '0.069007', '0.037796', '(2,\\,4.5)', '(1.5,\\,1.5,\\,0.75)', '(1,1,\\tfrac43)', '(1,2,\\tfrac13)', '(2,1,\\tfrac53)', '(2,2,\\tfrac23)', '31/3', '6.390976', '8.32456']) expect(en, quoted).toContain(quoted);
    });

    test('the quoted clipping numbers equal a direct kernel run, in both languages', () => {
        const A: ClipPoint[] = [[0, 0], [2, 4], [4, 0]];
        const crossing: ClipPoint[] = [[0, 3], [2, -1], [4, 3]], tangent: ClipPoint[] = [[0, 4], [2, 0], [4, 4]], offset: ClipPoint[] = [[0, 4.5], [2, 0.5], [4, 4.5]];
        const run = (b: ClipPoint[], k: number) => clipBezierPair(A, b, {tolerance: 10 ** -k});
        const counts: [ClipPoint[], number, number][] = [[crossing, 3, 17], [crossing, 6, 21], [tangent, 3, 53], [tangent, 6, 113], [tangent, 10, 200], [offset, 6, 17]];
        for (const [b, k, clips] of counts) expect(run(b, k).clipCount, `10^-${k}`).toBe(clips);
        expect(run(tangent, 10).unresolved).toHaveLength(28);
        expect(run(offset, 6).results).toHaveLength(0);
        const section = advancedBezierChapter.sections.find(item => item.id === 'bezier-clipping')!;
        for (const language of ['sl', 'en'] as const) {
            const body = section.paragraphs.map(item => item[language]).join(' ');
            for (const number of ['17', '21', '53', '113', '200', '28']) expect(body, `${language}: ${number}`).toContain(`\\(${number}\\)`);
        }
    });

    test('the claims keep their scope: sampled, tolerance, not unique, polynomial only, illustration', () => {
        const sl = everything('sl'), en = everything('en');
        for (const phrase of ['vzorčena', '10^{-9}', 'nikoli ni natančen, razen če je tretja diferenca nič', 'nima polinomske naravne parametrizacije', 'ne dokaz', 'ena izmed mnogih', 'potreben, ne zadosten pogoj', 'pravilo za ustavitev', 'ponazarja, ne dokazuje']) expect(sl, phrase).toContain(phrase);
        for (const phrase of ['sampled', '10^{-9}', 'never exact unless the third difference is zero', 'no polynomial arc-length parametrization', 'not a proof', 'one of many', 'necessary, not sufficient', 'stopping rule', 'illustrates and does not prove']) expect(en, phrase).toContain(phrase);
    });

    test('the lessons resolve, own their sections and keep both languages complete', () => {
        for (const id of IDS) {
            expect(getGuidedLessonOwners(id)).toEqual([{chapterId: ADVANCED_BEZIER_CHAPTER_ID, sectionId: id}]);
            expect(getGuidedLessonOwner(id)).toEqual({chapterId: ADVANCED_BEZIER_CHAPTER_ID, sectionId: id});
            expect(authoredGuidedLessonIds(ADVANCED_BEZIER_CHAPTER_ID, id)).toEqual([id]);
            expect(authoredGuidedLessonIds('bezier-curves', 'geometric-properties')).not.toContain(id);
            const lesson = getLessonForDemonstration(id)!;
            expect(lesson).toBe(advancedBezierGuidedExampleLessons.all()[id]);
            expect(lesson.demonstrationId).toBe(id);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
                expect(field.sl.length).toBeGreaterThan(2);
                expect(field.en.length).toBeGreaterThan(2);
            }
        }
        expect(authoredGuidedLessonIds(ADVANCED_BEZIER_CHAPTER_ID, 'advanced-bezier-idea')).toEqual([]);
    });

    test('learn launches and example links land on the owning sections, including the Coons patch', () => {
        for (const id of IDS) {
            const launch = guidedLessonLaunchPath(id);
            expect(launch).toContain(`learnChapter=${ADVANCED_BEZIER_CHAPTER_ID}&learnSection=${id}`);
            expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${ADVANCED_BEZIER_CHAPTER_ID}#${id}`);
            const exampleId = `lesson.${ADVANCED_BEZIER_CHAPTER_ID}.${id}.${id}`;
            expect(resolveGuidedExample(launch.slice(launch.indexOf('?')), id)?.owner).toEqual({chapterId: ADVANCED_BEZIER_CHAPTER_ID, sectionId: id});
            expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(advancedBezierGuidedExampleLessons.all()[id]);
            const links = getChapterGuidedExamples(ADVANCED_BEZIER_CHAPTER_ID, id);
            expect(links.map(link => link.path)).toEqual([advancedBezierGuidedExamplePath(id)]);
            expect(links[0].path).toContain(`?example=${exampleId}`);
            // The interim owner's example id no longer resolves.
            expect(resolveGuidedExample(`?example=lesson.bezier-curves.geometric-properties.${id}`, id)?.lesson).toBeUndefined();
        }
        expect(getChapterGuidedExamples(ADVANCED_BEZIER_CHAPTER_ID, 'advanced-bezier-idea')).toEqual([]);
    });
});

describe('the Coons section states what is a choice and names only controls the route has', () => {
    const section = advancedBezierChapter.sections.find(candidate => candidate.id === 'patch-coons')!;
    const card = guidedLessonPreviewCopyByDemonstration['patch-coons'];
    const prompt = (language: 'sl' | 'en') => section.investigationPrompts!['patch-coons']![language];
    const sectionText = (language: 'sl' | 'en') => [...section.paragraphs.map(p => p[language]), prompt(language), card.alt[language], card.caption[language]].join(' ');

    test.each(['sl', 'en'] as const)('%s: no twist wording in the paragraphs, the prompt or the card', language => {
        expect(sectionText(language).toLowerCase()).not.toMatch(/twist|zasuk/);
    });

    test('the blend is one of many and the edges alone do not determine the interior', () => {
        expect(sectionText('sl')).toContain('ena izmed mnogih');
        expect(sectionText('sl')).toContain('robovi sami ne določajo notranjosti');
        expect(sectionText('en')).toContain('one of many');
        expect(sectionText('en')).toContain('the edges alone do not determine the interior');
    });

    test('the investigation prompt names the Surface and Linked corners controls and no control the route lacks', () => {
        expect(prompt('sl')).not.toContain('izklopiš odštevalni');
        expect(prompt('en')).not.toContain('switch off the subtracted');
        for (const label of [slCatalog.coons_shown, slCatalog.coons_linked_corners]) expect(prompt('sl')).toContain(label);
        for (const label of [enCatalog.coons_shown, enCatalog.coons_linked_corners]) expect(prompt('en')).toContain(label);
    });
});
