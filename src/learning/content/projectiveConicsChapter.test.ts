import {beforeEach, describe, expect, test} from 'vitest';
import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {
    authoredGuidedLessonIds, getGuidedLessonOwner, getGuidedLessonOwners, guidedLessonLaunchPath, guidedLessonReturnPath, resolveGuidedLessonOwner,
} from '../chapter/guidedLessonOwnership';
import {learningChapters} from '../learningChapters';
import {learningStrands} from '../LearningPage';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {projectiveConicsChapter} from './projectiveConicsChapter';
import {
    PROJECTIVE_CONICS_CHAPTER_ID, projectiveConicsGuidedExamplePath, projectiveConicsGuidedExampleLessons,
} from './projectiveConicsChapterRegistry';
import {triangleGeometryChapter} from './triangleGeometryChapter';

const LESSONS = ['projective-cross-ratio', 'projective-pascal', 'projective-pole-polar', 'projective-five-point', 'projective-three-views'] as const;
const sectionOf = (id: typeof LESSONS[number]) => projectiveConicsChapter.sections.find(section => section.id === id)!;
const proseOf = (id: typeof LESSONS[number], language: 'sl' | 'en') => sectionOf(id).paragraphs.map(p => p[language]).join(' ') + sectionOf(id).formula;

beforeEach(() => setLanguage('sl'));

// Exact fractions written by hand as [numerator, denominator] pairs; nothing below calls the projective kernel.
type Fr = readonly [number, number];
const mul = ([a, b]: Fr, [c, d]: Fr): Fr => [a * c, b * d];
const sub = ([a, b]: Fr, [c, d]: Fr): Fr => [a * d - c * b, b * d];
const eq = ([a, b]: Fr, [c, d]: Fr) => a * d === c * b;
const f = (n: number, d = 1): Fr => [n, d];
const crossRatio = (A: Fr, B: Fr, C: Fr, D: Fr) => {
    const top = mul(sub(C, A), sub(D, B));
    const bottom = mul(sub(C, B), sub(D, A));
    return [top[0] * bottom[1], top[1] * bottom[0]] as Fr;
};

describe('chapter structure and registration', () => {
    test('the chapter is registered last in the plane geometry strand with an opening and one section per lesson', () => {
        expect(projectiveConicsChapter.id).toBe(PROJECTIVE_CONICS_CHAPTER_ID);
        expect(PROJECTIVE_CONICS_CHAPTER_ID).toBe('projective-conics');
        expect(projectiveConicsChapter.title).toEqual({sl: 'Projektivna geometrija stožnic', en: 'Projective geometry of conics'});
        expect(projectiveConicsChapter.family).toBe('projective');
        expect(projectiveConicsChapter.sections.map(section => section.id)).toEqual(['projective-idea', ...LESSONS]);
        expect(Object.keys(projectiveConicsGuidedExampleLessons.all())).toEqual([...LESSONS]);
        const planeGeometry = learningStrands.find(strand => strand.id === 'plane-geometry')!;
        expect(planeGeometry.chapters.at(-1)).toBe(PROJECTIVE_CONICS_CHAPTER_ID);
        expect(familyChapters.findIndex(chapter => chapter.id === PROJECTIVE_CONICS_CHAPTER_ID))
            .toBe(familyChapters.findIndex(chapter => chapter.id === triangleGeometryChapter.id) + 1);
        expect(learningChapters.some(chapter => chapter.id === PROJECTIVE_CONICS_CHAPTER_ID)).toBe(true);
        for (const id of LESSONS) expect(sectionOf(id).demonstrationIds).toEqual([id]);
    });

    test('no school level is claimed', () => {
        const everything = JSON.stringify({...projectiveConicsChapter, title: undefined}).toLowerCase();
        for (const word of ['matura', 'matur']) expect(everything, word).not.toContain(word);
    });

    test('there are no figures, the text is bilingual and each example link closes its lesson section', () => {
        const registered = familyChapters.find(chapter => chapter.id === PROJECTIVE_CONICS_CHAPTER_ID)!;
        expect(JSON.stringify(projectiveConicsChapter)).not.toContain('"figure');
        expect(registered.sections.every(section => !section.orderedContent!.some(item => item.kind === 'figure' as string))).toBe(true);
        expect(registered.sections.every(section => !(section as {figures?: unknown}).figures)).toBe(true);
        const fields = [projectiveConicsChapter.purpose, projectiveConicsChapter.prerequisites, ...projectiveConicsChapter.sections.flatMap(section => section.paragraphs)];
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        for (const title of projectiveConicsChapter.sections.map(section => section.title)) { expect(title.sl.length).toBeGreaterThan(5); expect(title.en.length).toBeGreaterThan(5); }
        expect(projectiveConicsChapter.prerequisiteLinks?.map(link => link.path)).toEqual(['/bezeg-2.0/learn/rational-curves#worked-conic', '/bezeg-2.0/learn/rational-curves#operations']);
        expect(registered.sections[0].orderedContent!.some(item => item.kind === 'example')).toBe(false);
        for (const id of LESSONS) {
            const section = registered.sections.find(entry => entry.id === id)!;
            expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: `${PROJECTIVE_CONICS_CHAPTER_ID}.${id}.${id}`});
            expect(section.orderedContent!.some(item => item.kind === 'formula')).toBe(true);
        }
    });

    test('theorems carry hypotheses, sources and the illustration caveat in both languages', () => {
        const facts = {
            'projective-cross-ratio': {
                sl: ['Izrek', 'različne točke', 'ne leži na tej premici in ne na drugi premici', 'dvorazmerje', 'Coxeter', 'ne odprto', 'ne dokaz', 'harmonična četverka', 'afina in projektivna geometrija'],
                en: ['Theorem', 'distinct points', 'neither on that line nor on the second line', 'cross-ratio', 'Coxeter', 'not opened', 'not a proof', 'harmonic quadruple', 'Affine and Projective Geometry'],
            },
            'projective-pascal': {
                sl: ['Izrek (Pascal)', 'šest različnih točk', 'nedegenerirani stožnici', 'Pappusov izrek', 'točka v neskončnosti', 'Coxeter', 'ne odprto', 'ne dokaz'],
                en: ['Theorem (Pascal)', 'six distinct points', 'non-degenerate conic', 'Pappus\'s theorem', 'point at infinity', 'Coxeter', 'not opened', 'not a proof'],
            },
            'projective-pole-polar': {
                sl: ['Izrek (pol in polara)', 'nedegenerirana', 'glede na stožnico', 'premica v neskončnosti', 'Coxeter', 'ne odprto', 'ne dokaz'],
                en: ['Theorem (pole and polar)', 'non-degenerate', 'with respect to the conic', 'line at infinity', 'Coxeter', 'not opened', 'not a proof'],
            },
            'projective-five-point': {
                sl: ['Izrek (pet točk)', 'nobene tri ne ležijo na isti premici', 'natanko ena stožnica', 'polom tetive', 'krajnima utežema', 'Coxeter', 'ne odprto', 'ne dokaz', 'preverjanje na vzorcu'],
                en: ['Theorem (five points)', 'no three on a line', 'exactly one conic', 'pole of the chord', 'end weights', 'Coxeter', 'not opened', 'not a proof', 'sample'],
            },
            'projective-three-views': {
                sl: ['Izrek (klasifikacija stožnic)', 'projektivno ekvivalentni', 'klasifikacija stožnic', 'Coxeter', 'ne odprto', 'ne dokaz'],
                en: ['Theorem (classification of conics)', 'projectively equivalent', 'classification of conics', 'Coxeter', 'not opened', 'not a proof'],
            },
        } as const;
        for (const id of LESSONS) {
            for (const language of ['sl', 'en'] as const) {
                const prose = proseOf(id, language);
                for (const fact of facts[id][language]) expect(prose.toLowerCase(), `${id} ${language}: ${fact}`).toContain(fact.toLowerCase());
            }
        }
        // "Pole" is never bare in Slovenian conic prose: it always comes with the polar or the conic.
        const sl = proseOf('projective-pole-polar', 'sl');
        expect(sl).toContain('pol te premice glede na stožnico');
    });

    test('K1 numbers: the cross-ratio 9/8, the harmonic -1 and the point at infinity 33/20 are recomputed', () => {
        expect(crossRatio(f(0), f(1), f(3), f(4))).toSatisfy((value: Fr) => eq(value, f(9, 8)));
        expect(crossRatio(f(0), f(6), f(2), f(-6))).toSatisfy((value: Fr) => eq(value, f(-1)));
        // The images of 0, 1, 3, 4 from O=(0,5) onto y=1+x/2 have the abscissae 0, 8/11, 24/13, 16/7 (checked on the lines through O).
        expect(crossRatio(f(0), f(8, 11), f(24, 13), f(16, 7))).toSatisfy((value: Fr) => eq(value, f(9, 8)));
        // D = -10 projects to a point at infinity; the original quadruple still has the value 33/20, which the limit formula gives for the images.
        expect(crossRatio(f(0), f(1), f(3), f(-10))).toSatisfy((value: Fr) => eq(value, f(33, 20)));
        for (const [sl, en] of [['\\tfrac98', '\\tfrac98'], ['-1', '-1'], ['\\tfrac{33}{20}', '\\tfrac{33}{20}']]) {
            expect(proseOf('projective-cross-ratio', 'sl')).toContain(sl);
            expect(proseOf('projective-cross-ratio', 'en')).toContain(en);
        }
    });

    test('K2 numbers: the six points are on the ellipse, the sides and Pascal points are recomputed and are collinear', () => {
        // Points of x^2/25 + y^2/9 = 1: 9x^2 + 25y^2 = 225, exactly.
        const pts: readonly (readonly [Fr, Fr])[] = [[f(5), f(0)], [f(3), f(12, 5)], [f(0), f(3)], [f(-3), f(12, 5)], [f(0), f(-3)], [f(4), f(-9, 5)]];
        for (const [x, y] of pts) {
            const sum = sub(mul(f(9), mul(x, x)), mul(f(-25), mul(y, y)));
            expect(eq(sum, f(225))).toBe(true);
        }
        // Sides a x + b y = c, written by hand through the points: s1 AB, s2 BC, s3 CD, s4 DE, s5 EF, s6 FA.
        const sides = [[6, 5, 30], [1, 5, 15], [1, -5, -15], [9, 5, -15], [3, -10, 30], [9, -5, 45]] as const;
        sides.forEach(([a, b, c], i) => {
            const [p, q] = [pts[i], pts[(i + 1) % 6]];
            for (const [x, y] of [p, q]) expect(eq(sub(sub(mul(f(a), x), mul(f(-b), y)), f(c)), f(0)), `s${i + 1}`).toBe(true);
        });
        // Cramer's rule for opposite sides.
        const meet = ([a1, b1, c1]: readonly number[], [a2, b2, c2]: readonly number[]): readonly [Fr, Fr] => {
            const det = a1 * b2 - a2 * b1;
            return [f(c1 * b2 - c2 * b1, det), f(a1 * c2 - a2 * c1, det)];
        };
        const P = [meet(sides[0], sides[3]), meet(sides[1], sides[4]), meet(sides[2], sides[5])];
        const expected: readonly (readonly [Fr, Fr])[] = [[f(-15), f(24)], [f(12), f(3, 5)], [f(15, 2), f(9, 2)]];
        P.forEach(([x, y], i) => { expect(eq(x, expected[i][0]) && eq(y, expected[i][1]), `P${i + 1}`).toBe(true); });
        // Collinear: (P2-P1) x (P3-P1) = 0.
        const [[x1, y1], [x2, y2], [x3, y3]] = P;
        const cross = sub(mul(sub(x2, x1), sub(y3, y1)), mul(sub(y2, y1), sub(x3, x1)));
        expect(cross[0] === 0).toBe(true);
        const sl = proseOf('projective-pascal', 'sl'), en = proseOf('projective-pascal', 'en');
        for (const quoted of ['(-15,24)', '(12,\\tfrac35)', '(\\tfrac{15}2,\\tfrac92)', '6x+5y=30', '9x+5y=-15']) { expect(sl, quoted).toContain(quoted); expect(en, quoted).toContain(quoted); }
    });

    test('K3 numbers: the tangents meet in P, the polar passes through the tangency points and P is outside', () => {
        // Ellipse 9x^2 + 25y^2 = 225; tangent at (x0,y0) is 9 x0 x + 25 y0 y = 225.
        const T1: readonly [Fr, Fr] = [f(-3), f(12, 5)], T2: readonly [Fr, Fr] = [f(4), f(9, 5)];
        for (const [x, y] of [T1, T2]) expect(eq(sub(mul(f(9), mul(x, x)), mul(f(-25), mul(y, y))), f(225))).toBe(true);
        // Tangent at T1: -27x + 60y = 225, i.e. -9x + 20y = 75; at T2: 36x + 45y = 225, i.e. 4x + 5y = 25.
        const P: readonly [Fr, Fr] = [f(1), f(21, 5)];
        expect(eq(sub(sub(mul(f(-9), P[0]), mul(f(-20), P[1])), f(75)), f(0))).toBe(true);
        expect(eq(sub(sub(mul(f(4), P[0]), mul(f(-5), P[1])), f(25)), f(0))).toBe(true);
        for (const [x, y] of [T1, T2]) {
            expect(eq(sub(sub(mul(f(-9), x), mul(f(-20), y)), f(75)), f(0)) || eq(sub(sub(mul(f(4), x), mul(f(-5), y)), f(25)), f(0))).toBe(true);
        }
        // The polar of P: 9*1*x + 25*(21/5)*y = 225, i.e. 9x + 105y = 225, i.e. 3x + 35y - 75 = 0.
        expect(eq(mul(f(25), P[1]), f(105))).toBe(true);
        for (const [x, y] of [T1, T2]) expect(eq(sub(sub(mul(f(3), x), mul(f(-35), y)), f(75)), f(0))).toBe(true);
        // P is outside: 9 + 25 (21/5)^2 = 450 > 225.
        expect(eq(sub(mul(f(9), mul(P[0], P[0])), mul(f(-25), mul(P[1], P[1]))), f(450))).toBe(true);
        const sl = proseOf('projective-pole-polar', 'sl'), en = proseOf('projective-pole-polar', 'en');
        for (const quoted of ['3x+35y-75=0', '-9x+20y=75', '4x+5y=25', '(1,\\tfrac{21}5)', '-9+84=75', '12+63=75']) { expect(sl, quoted).toContain(quoted); expect(en, quoted).toContain(quoted); }
    });
});

describe('K4 and K5 numbers', () => {
    test('K4: the ellipse points, P1, lambda and w = sqrt(2)/2, and the hyperbola w = 2/sqrt(3), are recomputed by hand', () => {
        // Ellipse 9x^2 + 25y^2 = 225 and its five points.
        const pts: readonly (readonly [Fr, Fr])[] = [[f(5), f(0)], [f(0), f(3)], [f(-5), f(0)], [f(4), f(9, 5)], [f(-3), f(12, 5)]];
        for (const [x, y] of pts) expect(eq(sub(mul(f(9), mul(x, x)), mul(f(-25), mul(y, y))), f(225))).toBe(true);
        // Tangents x = 5 (9*5*x = 225) and y = 3 (25*3*y = 225) meet in P1 = (5,3).
        expect(9 * 5 * 5).toBe(225);
        expect(25 * 3 * 3).toBe(225);
        // M = (5/2, 3/2); the ray M + l (P1 - M) = ((5/2)(1+l), (3/2)(1+l)) meets the ellipse where (225/2)(1+l)^2 = 225, i.e. (1+l)^2 = 2.
        // With m = 1 + l: m^2 = 2. The weight w = l/(1-l) satisfies w^2 = 1/2 iff 2 l^2 = (1-l)^2 iff l^2 + 2 l - 1 = 0 iff m^2 - 2 = 0 (substitute l = m - 1).
        // Polynomial in m: l^2 + 2l - 1 = (m-1)^2 + 2(m-1) - 1 = m^2 - 2: coefficients [1, 0, -2] (m^2, m, 1).
        const [c2, c1, c0] = [1, -2 + 2, 1 - 2 - 1];
        expect([c2, c1, c0]).toEqual([1, 0, -2]);
        // Hyperbola 16x^2 - 9y^2 = 144, arc (3,0) to (5,16/3).
        const Q: readonly [Fr, Fr] = [f(5), f(16, 3)];
        expect(eq(sub(mul(f(16), mul(Q[0], Q[0])), mul(f(9), mul(Q[1], Q[1]))), f(144))).toBe(true);
        // Tangent at (3,0): 48x = 144, x = 3. Tangent at Q: 16*5 x - 9*(16/3) y = 144, i.e. 80x - 48y = 144, i.e. 5x - 3y = 9; at x = 3: y = 2, so P1 = (3,2).
        expect(eq(sub(mul(f(80), f(3)), mul(f(48), f(2))), f(144))).toBe(true);
        expect(eq(sub(mul(f(80), Q[0]), mul(f(48), Q[1])), f(144))).toBe(true);
        // M = (4, 8/3); M + l (P1 - M) = (4 - l, 8/3 - (2/3) l) is on the hyperbola iff 12 l^2 - 96 l + 48 = 0, i.e. l^2 - 8 l + 4 = 0.
        // Expand 16 (4-l)^2 - (8-2l)^2 - 144 coefficientwise: l^2: 16 - 4; l: -128 + 32; 1: 256 - 64 - 144.
        expect([16 - 4, -128 + 32, 256 - 64 - 144]).toEqual([12, -96, 48]);
        // w = l/(1-l) has w^2 = 4/3 iff 4 (1-l)^2 = 3 l^2 iff l^2 - 8 l + 4 = 0: the same polynomial, so w^2 = 4/3, w = 2/sqrt(3) > 1.
        expect([4 - 3, -8, 4]).toEqual([1, -8, 4]);
        expect(4 / 3).toBeGreaterThan(1);
        const sl = proseOf('projective-five-point', 'sl'), en = proseOf('projective-five-point', 'en');
        for (const quoted of ['9x^2+25y^2=225', '(5,3)', '\\tfrac{\\sqrt2}2', '\\tfrac2{\\sqrt3}>1', '16x^2-9y^2=144']) { expect(sl, quoted).toContain(quoted); expect(en, quoted).toContain(quoted); }
    });

    test('K5: B^2 - 4AC for the image of the unit circle is -12, 0 and 4 for c = 2, 1, 0', () => {
        // X^2 + (c^2 - 1) Y^2 + 2 c Y + 1 = 0: A = 1, B = 0, C = c^2 - 1.
        const discriminant = (c: number) => 0 * 0 - 4 * 1 * (c * c - 1);
        expect([2, 1, 0].map(discriminant)).toEqual([-12, 0, 4]);
        // The line y = c misses the unit circle iff c^2 > 1 (c = 2), touches iff c^2 = 1 (c = 1), cuts iff c^2 < 1 (c = 0).
        expect([2 * 2 > 1, 1 * 1 === 1, 0 * 0 < 1]).toEqual([true, true, true]);
        const sl = proseOf('projective-three-views', 'sl'), en = proseOf('projective-three-views', 'en');
        for (const quoted of ['B^2-4AC=-12<0', 'B^2-4AC=0', 'B^2-4AC=4>0', 'X^2+(c^2-1)Y^2+2cY+1=0']) { expect(sl, quoted).toContain(quoted); expect(en, quoted).toContain(quoted); }
    });
});

describe('lessons, ownership and links', () => {
    test.each(LESSONS)('the %s lesson resolves, owns its section and keeps both languages complete', id => {
        expect(getGuidedLessonOwners(id)).toEqual([{chapterId: PROJECTIVE_CONICS_CHAPTER_ID, sectionId: id}]);
        expect(getGuidedLessonOwner(id)).toEqual({chapterId: PROJECTIVE_CONICS_CHAPTER_ID, sectionId: id});
        expect(authoredGuidedLessonIds(PROJECTIVE_CONICS_CHAPTER_ID, id)).toEqual([id]);
        const lesson = getLessonForDemonstration(id)!;
        expect(lesson).toBe(projectiveConicsGuidedExampleLessons.all()[id]);
        expect(lesson.demonstrationId).toBe(id);
        for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body])]) {
            expect(field.sl.length).toBeGreaterThan(2);
            expect(field.en.length).toBeGreaterThan(2);
        }
        expect(authoredGuidedLessonIds('rational-curves', 'worked-conic')).not.toContain(id);
    });

    test.each(LESSONS)('learn launches, example links and old routes of %s land on the owning section', id => {
        const launch = guidedLessonLaunchPath(id);
        expect(launch).toContain(`learnChapter=${PROJECTIVE_CONICS_CHAPTER_ID}&learnSection=${id}`);
        expect(guidedLessonReturnPath(getGuidedLessonOwner(id)!)).toBe(`/bezeg-2.0/learn/${PROJECTIVE_CONICS_CHAPTER_ID}#${id}`);
        const search = launch.slice(launch.indexOf('?'));
        expect(resolveGuidedExample(search, id)?.owner).toEqual({chapterId: PROJECTIVE_CONICS_CHAPTER_ID, sectionId: id});
        const exampleId = `lesson.${PROJECTIVE_CONICS_CHAPTER_ID}.${id}.${id}`;
        expect(resolveGuidedExample(`?example=${exampleId}`, id)?.lesson).toBe(projectiveConicsGuidedExampleLessons.all()[id]);
        const links = getChapterGuidedExamples(PROJECTIVE_CONICS_CHAPTER_ID, id);
        expect(links.map(link => link.path)).toEqual([projectiveConicsGuidedExamplePath(id)]);
        expect(links[0].path).toContain(`?example=${exampleId}`);
        // A launch stored before the move named the interim owner; it still opens the lesson at the new owner.
        expect(resolveGuidedLessonOwner('?learn=1&learnChapter=rational-curves&learnSection=worked-conic', id)).toEqual({chapterId: PROJECTIVE_CONICS_CHAPTER_ID, sectionId: id});
        // The accepted break: the interim owner's example id no longer resolves.
        expect(resolveGuidedExample(`?example=lesson.rational-curves.worked-conic.${id}`, id)?.lesson).toBeUndefined();
        expect(resolveGuidedExample(`?learn=1&learnChapter=${PROJECTIVE_CONICS_CHAPTER_ID}&learnSection=nope`, id)).toBeUndefined();
    });

    test('the opening section owns no lesson', () => {
        expect(getChapterGuidedExamples(PROJECTIVE_CONICS_CHAPTER_ID, 'projective-idea')).toEqual([]);
    });

    test('the lesson text is available in English after the move', () => {
        setLanguage('en');
        for (const id of LESSONS) expect(getLessonForDemonstration(id)!.title.en.length).toBeGreaterThan(5);
    });
});
