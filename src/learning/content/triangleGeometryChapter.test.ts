import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {learningChapters} from '../learningChapters';
import {familyChapters} from './familyChapters';
import {triangleGeometryChapter} from './triangleGeometryChapter';
import {TRIANGLE_GEOMETRY_CHAPTER_ID, triangleGeometryGuidedExampleRegistry} from './triangleGeometryChapterRegistry';
import {act} from '@testing-library/react';
import {setLanguage, t} from '../../localization';
import type {LessonAction, LessonDefinition} from '../model';
import {circumcircle, thalesDot, angleBetween, powerOfPoint, circlePoint} from '../../compgeo/circle';
import {Rational, RationalPoint} from '../../compgeo/rational';
import {centroid, circumcentre, circumradius, circumradiusSquared, classifyTriangle, incentre, inradius, orthocentre} from '../../compgeo/triangle';
import {analyseInscribedAngle} from '../../compgeo/inscribedAngleModel';
import {analyseNotablePoints} from '../../compgeo/notablePointsModel';
import {InscribedAngleGraph} from '../../graphs/compgeo/InscribedAngleGraph';
import {EulerLineGraph} from '../../graphs/compgeo/EulerLineGraph';
import {analyseEulerLine, eulerExample} from '../../compgeo/eulerLineModel';
import {SimsonLineGraph} from '../../graphs/compgeo/SimsonLineGraph';
import {simsonStatusText, simsonTexts} from '../../graphs/compgeo/simsonLineText';
import {analyseSimson, SIMSON_EXAMPLES, simsonExample, type SimsonExampleId, type SimsonOffset} from '../../compgeo/simsonLineModel';
import {orientValue} from '../../compgeo/predicates';
import {NotablePointsGraph} from '../../graphs/compgeo/NotablePointsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import {
    DEFAULT_TRIANGLE, eulerLineLesson, inscribedAngleLesson, INVERSION_THETA_TURNED, inversionLesson, NEAR_EQUILATERAL_TRIANGLE, NEAR_EQUILATERAL_VIEW, OBTUSE_TRIANGLE, OBTUSE_VIEW, RIGHT_TRIANGLE, SIMSON_T_BELOW, SIMSON_T_LEFT, SIMSON_T_RIGHT, simsonLineLesson, THALES_TRIANGLE, THALES_VIEW, triangleCentresLesson,
} from './triangleGeometryChapterLessons';
import {triangleGeometryGuidedExamplePath} from './triangleGeometryChapterRegistry';
import {InversionGraph} from '../../graphs/compgeo/InversionGraph';
import {analyseAngle, analysePoint, analysePower, analyseSource, INVERSION_EXAMPLES} from '../../compgeo/inversionModel';
import {complexMapsChapter} from './complexMapsChapter';
import {complexReciprocalLesson} from './complexMapsChapterLessons';

// Chapter (reading) half, owned by the F4 worker. The lesson half is a separate describe block.
describe('triangle geometry reading chapter', () => {
    const mathFree = (source: string) => source.replace(/\\\((?:(?!\\\)).)*\\\)|\\\[(?:(?!\\\]).)*\\\]/gsu, ' ');
    const words = (source: string) => mathFree(source).trim().split(/\s+/u).filter(Boolean).length;
    const sectionProse = (index: number, language: 'sl' | 'en') => triangleGeometryChapter.sections[index].paragraphs.map(p => p[language]).join(' ');

    test('is registered in family plane-geometry, advertising T1 to T5', () => {
        expect(triangleGeometryChapter.family).toBe('plane-geometry');
        expect(triangleGeometryChapter.title).toEqual({sl: 'Geometrija trikotnika in inverzija', en: 'Triangle geometry and inversion'});
        expect(triangleGeometryChapter.sections.map(section => section.id)).toEqual(['notable-points', 'inscribed-angle', 'euler-line', 'simson-line', 'inversion']);
        expect(triangleGeometryChapter.sections.map(section => section.demonstrationIds)).toEqual([['triangle-centres'], ['inscribed-angle'], ['euler-line'], ['simson-line'], ['inversion']]);
        expect(familyChapters.some(chapter => chapter.id === TRIANGLE_GEOMETRY_CHAPTER_ID)).toBe(true);
        expect(learningChapters.some(chapter => chapter.id === TRIANGLE_GEOMETRY_CHAPTER_ID)).toBe(true);
        // Inversion is the fifth section; the first four do not mention it.
        for (const language of ['sl', 'en'] as const) {
            const all = triangleGeometryChapter.sections.slice(0, 4).map((_, index) => sectionProse(index, language)).join(' ');
            expect(all).not.toMatch(/inverz|invers/iu);
        }
    });

    test('links existing Demonstrations of the plane geometry family', () => {
        const demonstrations = getDemonstrationCatalog().demonstrations;
        for (const section of triangleGeometryChapter.sections) {
            for (const id of section.demonstrationIds ?? []) expect(demonstrations.find(demo => demo.id === id)?.family).toBe('plane-geometry');
        }
        // triangle-solver and line-geometry ship without a chapter link until families-prep F3.
        const linked = triangleGeometryChapter.sections.flatMap(section => section.demonstrationIds ?? []);
        expect(linked.sort()).toEqual(demonstrations.filter(demo => demo.family === 'plane-geometry' && demo.id !== 'triangle-solver' && demo.id !== 'line-geometry').map(demo => demo.id).sort());
    });

    test('puts each section example at its end and keeps both languages complete', () => {
        for (const section of triangleGeometryChapter.sections) {
            const sectionId = section.id as keyof typeof triangleGeometryGuidedExampleRegistry;
            expect(section.orderedContent!.at(-1)).toEqual({
                kind: 'example',
                exampleId: `${TRIANGLE_GEOMETRY_CHAPTER_ID}.${sectionId}.${triangleGeometryGuidedExampleRegistry[sectionId].demonstrationId}`,
            });
            for (const paragraph of section.paragraphs) {
                expect(paragraph.sl.length).toBeGreaterThan(20);
                expect(paragraph.en.length).toBeGreaterThan(20);
            }
        }
    });

    test('has at least 450 words of prose per language', () => {
        for (const language of ['sl', 'en'] as const) {
            const prose = [
                triangleGeometryChapter.purpose[language], triangleGeometryChapter.prerequisites[language],
                ...triangleGeometryChapter.sections.flatMap(section => [section.title[language], ...section.paragraphs.map(p => p[language])]),
            ].join(' ');
            expect(words(prose), language).toBeGreaterThanOrEqual(450);
        }
    });

    test('wraps symbols in math delimiters, uses decimal commas in Slovenian math and cites sources without section numbers for Coxeter', () => {
        for (const language of ['sl', 'en'] as const) {
            for (const section of triangleGeometryChapter.sections) {
                for (const paragraph of section.paragraphs) expect(mathFree(paragraph[language]), section.id).not.toMatch(/\\[A-Za-z]+/u);
                expect(section.formula).not.toMatch(/\[()[\]]/u);
            }
            const notable = sectionProse(0, language);
            const inscribed = sectionProse(1, language);
            expect(notable).toMatch(/Coxeter, Introduction to Geometry/u);
            expect(notable).not.toMatch(/Coxeter[^.]*(\bp\.|\bstr\.|§|\d)/u);
            for (const ref of ['III.20', 'III.21', 'III.22', 'III.31']) expect(inscribed).toContain(ref);
            expect(inscribed).toMatch(language === 'sl' ? /enaki do prikazane natančnosti/u : /equal to the displayed precision/u);
        }
        // Slovenian decimals inside math use {,}; English never does.
        const slMath = [0, 1].flatMap(index => sectionProse(index, 'sl').match(/\\\((?:(?!\\\)).)*\\\)/gsu) ?? []);
        for (const math of slMath) expect(math).not.toMatch(/\d\.\d/u);
        for (const index of [0, 1]) expect(sectionProse(index, 'en')).not.toContain('{,}');
    });
});

// Lesson half (T1 and T2), owned by the F3 worker. Every number in the prose is recomputed from the triangle and circle kernel.
describe('triangle geometry lessons (T1 and T2)', () => {
    beforeAll(installBoardShims);
    beforeEach(() => setLanguage('sl'));
    vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

    /** Prose without TeX backslashes, so `\approx` reads `approx` and the thin space `\,` disappears. */
    const plain = (text: string) => text.replace(/\\,/gu, '').split(String.fromCharCode(92)).join('');
    const bodyOf = (lesson: LessonDefinition, stepId: string, language: 'sl' | 'en') => plain(lesson.steps.find(item => item.id === stepId)!.body[language]);
    /** True when the snippet (written with a decimal point) is in the body of the step in both languages, with a decimal comma in the Slovenian one. */
    const statedIn = (lesson: LessonDefinition, stepId: string, snippet: string) =>
        bodyOf(lesson, stepId, 'en').includes(snippet) && bodyOf(lesson, stepId, 'sl').includes(snippet.split('.').join('{,}'));
    const g = (x: number, y: number) => ({x, y});
    type Grid = ReturnType<typeof g>;
    const pointsOf = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => g(x, y)) as [Grid, Grid, Grid];
    const [A, B, C] = pointsOf(DEFAULT_TRIANGLE);
    const text = (value: Rational) => value.format();
    const exactPoint = (result: ReturnType<typeof circumcentre>) => {
        if (result.kind !== 'point') throw new Error('expected a point');
        return `(${text(result.point.x)}, ${text(result.point.y)})`;
    };
    const rational = (p: Grid) => RationalPoint.fromGrid(p);
    const distanceToLine = (p: {x: number; y: number}, a: Grid, b: Grid) =>
        Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y);

    test('both lessons are owned by their sections and complete in both languages with a scene on every step', () => {
        const owned = getChapterOwnedLessons('triangle-geometry')!;
        expect(owned.lesson('notable-points')).toBe(triangleCentresLesson);
        expect(owned.lesson('inscribed-angle')).toBe(inscribedAngleLesson);
        expect(owned.path('notable-points')).toBe(triangleGeometryGuidedExamplePath('notable-points'));
        expect(triangleGeometryGuidedExamplePath('notable-points')).toBe('/bezeg-2.0/triangle-centres?example=lesson.triangle-geometry.notable-points.triangle-centres');
        expect(triangleGeometryGuidedExamplePath('inscribed-angle')).toBe('/bezeg-2.0/inscribed-angle?example=lesson.triangle-geometry.inscribed-angle.inscribed-angle');
        expect([triangleCentresLesson.id, inscribedAngleLesson.id]).toEqual(['triangle-notable-points', 'inscribed-angle-thales']);
        expect(triangleCentresLesson.steps.map(item => item.id)).toEqual(['centroid', 'circumcentre', 'incentre', 'orthocentre', 'right-angle', 'obtuse', 'explore']);
        expect(inscribedAngleLesson.steps.map(item => item.id)).toEqual(['chord', 'same-arc', 'central', 'other-arc', 'diameter', 'lattice', 'explore']);
        for (const lesson of [triangleCentresLesson, inscribedAngleLesson]) {
            for (const label of [lesson.title, lesson.summary]) {
                expect(label.sl.length).toBeGreaterThan(10);
                expect(label.en.length).toBeGreaterThan(10);
            }
            for (const item of lesson.steps) {
                for (const label of [item.title, item.body, item.prompt!]) {
                    expect(label.sl.length).toBeGreaterThan(10);
                    expect(label.en.length).toBeGreaterThan(10);
                }
                expect(item.scene!.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'demonstration-default'});
            }
        }
    });

    test('T1 default: the stated centres, radii and ratios equal the exact kernel values, and the construction theorems hold', () => {
        expect(exactPoint(circumcentre(A, B, C))).toBe('(7/2, 3/2)');
        expect(exactPoint(orthocentre(A, B, C))).toBe('(2, 2)');
        const gc = centroid(A, B, C);
        expect(`(${text(gc.point.x)}, ${text(gc.point.y)})`).toBe('(3, 5/3)');
        const r2 = circumradiusSquared(A, B, C);
        expect(r2.kind === 'value' && text(r2.value)).toBe('29/2');
        const analysis = analyseNotablePoints([A, B, C]);
        if (analysis.kind !== 'triangle') throw new Error('expected a triangle');
        expect(text(analysis.area)).toBe('35/2');
        expect(analysis.classification).toEqual({kind: 'proper', shape: 'acute'});
        expect([gc.position, analysis.circumcentre!.position, analysis.orthocentre!.position]).toEqual(['inside', 'inside', 'inside']);
        const radius = circumradius(A, B, C);
        const inr = inradius(A, B, C);
        const inc = incentre(A, B, C);
        if (radius.kind !== 'value' || inr.kind !== 'value' || inc.kind !== 'point') throw new Error('expected values');
        expect(radius.value).toBeCloseTo(3.80789, 5);
        expect(inc.x).toBeCloseTo(2.65705, 5);
        expect(inc.y).toBeCloseTo(1.79891, 5);
        expect(inr.value).toBeCloseTo(1.79891, 5);
        // The y-coordinate of I is r because AB lies on the x-axis; the incentre is equally far from the three side lines.
        expect(inc.y).toBeCloseTo(inr.value, 12);
        for (const [p, q] of [[A, B], [B, C], [C, A]] as const) expect(distanceToLine(inc, p, q)).toBeCloseTo(inr.value, 12);
        expect(17.5 / ((Math.hypot(5, 5) + Math.hypot(2, 5) + 7) / 2)).toBeCloseTo(inr.value, 12);
        // Centroid: two thirds of the way along a median.
        const midBC = g((B.x + C.x) / 2, (B.y + C.y) / 2);
        expect(A.x + (2 / 3) * (midBC.x - A.x)).toBeCloseTo(3, 12);
        expect(A.y + (2 / 3) * (midBC.y - A.y)).toBeCloseTo(5 / 3, 12);
        // Perpendicular bisectors: the circumcentre is equally far from the three vertices (R^2 = 29/2).
        const circle = circumcircle(A, B, C);
        if (circle.kind !== 'circle') throw new Error('expected a circle');
        for (const v of [A, B, C]) expect(powerOfPoint(rational(v), circle).isZero()).toBe(true);
        // Altitudes: the orthocentre satisfies (H - A) . (B - C) = 0 and so on, exactly.
        const h = orthocentre(A, B, C);
        if (h.kind !== 'point') throw new Error('expected a point');
        for (const [v, p, q] of [[A, B, C], [B, C, A], [C, A, B]] as const) {
            expect(h.point.sub(rational(v)).dot(rational(p).sub(rational(q))).isZero()).toBe(true);
        }
        // The altitude from C is x = 2 and the altitude from A is y = x (BC has direction (-1, 1)).
        expect([h.point.x.toNumber(), h.point.y.toNumber()]).toEqual([2, 2]);
        expect([C.x, B.x - C.x, C.y - B.y]).toEqual([2, 5, 5]);
        // The prose states exactly these numbers.
        const body = (id: string) => bodyOf(triangleCentresLesson, id, 'en');
        expect(body('centroid')).toContain('S=35/2');
        expect(body('centroid')).toContain('G=(3,5/3)');
        expect(statedIn(triangleCentresLesson, 'centroid', '5/3approx1.6667')).toBe(true);
        expect(5 / 3).toBeCloseTo(1.6667, 4);
        expect(body('circumcentre')).toContain('O=(7/2,3/2)');
        expect(body('circumcentre')).toContain('R^2=29/2');
        expect(statedIn(triangleCentresLesson, 'circumcentre', 'Rapprox3.8079')).toBe(true);
        expect(radius.value.toFixed(4)).toBe('3.8079');
        expect(body('incentre')).toContain('Iapprox(2.6570,1.7989)');
        expect(bodyOf(triangleCentresLesson, 'incentre', 'sl')).toContain('Iapprox(2{,}6570;1{,}7989)');
        expect([inc.x.toFixed(4), inc.y.toFixed(4)]).toEqual(['2.6570', '1.7989']);
        expect(statedIn(triangleCentresLesson, 'incentre', 'r=S/sapprox1.7989')).toBe(true);
        expect(body('orthocentre')).toContain('H=(2,2)');
    });

    test('T1 right and obtuse examples: classification, centres, radii and where the circumcentre lies', () => {
        const [ra, rb, rc] = pointsOf(RIGHT_TRIANGLE);
        expect(classifyTriangle(ra, rb, rc)).toEqual({kind: 'proper', shape: 'right'});
        expect(rational(rb).sub(rational(ra)).dot(rational(rc).sub(rational(ra))).isZero()).toBe(true);
        const rightO = circumcentre(ra, rb, rc);
        expect(exactPoint(rightO)).toBe('(2, 3/2)');
        expect(rightO.kind === 'point' && rightO.position).toBe('on');
        expect([(rb.x + rc.x) / 2, (rb.y + rc.y) / 2]).toEqual([2, 1.5]); // the midpoint of the hypotenuse BC
        expect(exactPoint(orthocentre(ra, rb, rc))).toBe('(0, 0)');
        const rightR2 = circumradiusSquared(ra, rb, rc);
        expect(rightR2.kind === 'value' && text(rightR2.value)).toBe('25/4');
        expect(circumradius(ra, rb, rc)).toMatchObject({value: 2.5});
        expect(inradius(ra, rb, rc)).toMatchObject({value: 1});
        expect(incentre(ra, rb, rc)).toMatchObject({x: 1, y: 1});
        const right = bodyOf(triangleCentresLesson, 'right-angle', 'en');
        for (const snippet of ['A=(0,0)', 'B=(4,0)', 'C=(0,3)', 'O=(2,3/2)', 'R=5/2', 'H=(0,0)', 'r=1', 'I=(1,1)']) expect(right).toContain(snippet);

        const [oa, ob, oc] = pointsOf(OBTUSE_TRIANGLE);
        expect(classifyTriangle(oa, ob, oc)).toEqual({kind: 'proper', shape: 'obtuse'});
        expect(rational(oa).sub(rational(oc)).dot(rational(ob).sub(rational(oc))).toNumber()).toBe(-5);
        const obtuseO = circumcentre(oa, ob, oc);
        const obtuseH = orthocentre(oa, ob, oc);
        expect(exactPoint(obtuseO)).toBe('(7/2, -5/2)');
        expect(exactPoint(obtuseH)).toBe('(1, 6)');
        expect(obtuseO.kind === 'point' && obtuseO.position).toBe('outside');
        expect(obtuseH.kind === 'point' && obtuseH.position).toBe('outside');
        const obtuseG = centroid(oa, ob, oc);
        expect(`(${text(obtuseG.point.x)}, ${text(obtuseG.point.y)})`).toBe('(8/3, 1/3)');
        expect(obtuseG.position).toBe('inside');
        const obtuse = bodyOf(triangleCentresLesson, 'obtuse', 'en');
        for (const snippet of ['(-1)(6)+(-1)(-1)=-5', 'O=(7/2,-5/2)', 'H=(1,6)', 'G=(8/3,1/3)']) expect(obtuse).toContain(snippet);
        // Both far centres and the circumcircle (R^2 = 37/2) are inside the explicit view of the scene (left, top, right, bottom).
        const [left, top, right2, bottom] = OBTUSE_VIEW;
        const radius = Math.sqrt(18.5);
        for (const [x, y] of [[3.5, -2.5], [1, 6]]) expect(x > left && x < right2 && y < top && y > bottom).toBe(true);
        expect(3.5 - radius > left && 3.5 + radius < right2 && -2.5 - radius > bottom && -2.5 + radius < top).toBe(true);
        // A collinear triple stays degenerate, which the exploration step mentions.
        expect(classifyTriangle(g(0, 0), g(1, 1), g(3, 3))).toEqual({kind: 'degenerate'});
    });

    test('T2 default: the inscribed angle, the central angle and the supplement equal the kernel values and the prose states them', () => {
        const circle = circumcircle(A, B, C);
        if (circle.kind !== 'circle') throw new Error('expected a circle');
        expect([text(circle.centre.x), text(circle.centre.y), text(circle.r2)]).toEqual(['7/2', '3/2', '29/2']);
        const analysis = analyseInscribedAngle([A, B, C], 90);
        if (analysis.kind !== 'circle' || !analysis.glider) throw new Error('expected a circle with a glider');
        expect(analysis.angleAcb).toBeCloseTo(66.8014, 4);
        expect(analysis.centralAngle).toBeCloseTo(133.6028, 4);
        expect(analysis.glider.angleApb).toBeCloseTo(66.8014, 4);
        expect(analysis.glider.relation).toBe('sameArc');
        expect(analysis.centralAngle).toBeCloseTo(2 * analysis.angleAcb, 10);
        const other = analyseInscribedAngle([A, B, C], 270);
        if (other.kind !== 'circle' || !other.glider) throw new Error('expected a glider');
        expect(other.glider.relation).toBe('otherArc');
        expect(other.glider.angleApb).toBeCloseTo(113.1986, 4);
        expect(other.glider.angleApb + analysis.angleAcb).toBeCloseTo(180, 10);
        for (const t of [60, 90, 120]) {
            const sameArc = analyseInscribedAngle([A, B, C], t);
            if (sameArc.kind !== 'circle' || !sameArc.glider) throw new Error('expected a glider');
            expect(sameArc.glider.relation).toBe('sameArc');
            expect(sameArc.glider.angleApb).toBeCloseTo(analysis.angleAcb, 10);
        }
        // The one-decimal values in the prose.
        const one = (value: number) => value.toFixed(1);
        expect([one(analysis.angleAcb), one(analysis.centralAngle), one(other.glider.angleApb)]).toEqual(['66.8', '133.6', '113.2']);
        expect(statedIn(inscribedAngleLesson, 'chord', 'ACBapprox66.8^circ')).toBe(true);
        expect(statedIn(inscribedAngleLesson, 'same-arc', 'APBapprox66.8^circ')).toBe(true);
        expect(statedIn(inscribedAngleLesson, 'central', 'AOBapprox133.6^circ=2cdot66.8^circ')).toBe(true);
        expect(statedIn(inscribedAngleLesson, 'other-arc', 'APBapprox113.2^circ=180^circ-66.8^circ')).toBe(true);
        const chord = bodyOf(inscribedAngleLesson, 'chord', 'en');
        for (const snippet of ['O=(7/2,3/2)', 'R^2=29/2']) expect(chord).toContain(snippet);
        // Only the glider is inexact: the prose never says "exactly equal" about glider angles.
        for (const language of ['en', 'sl'] as const) {
            const prose = inscribedAngleLesson.steps.map(item => bodyOf(inscribedAngleLesson, item.id, language)).join(' ').toLowerCase();
            expect(prose).not.toMatch(/exactly equal|natanko enak/u);
        }
        expect(bodyOf(inscribedAngleLesson, 'same-arc', 'en')).toContain('displayed precision');
        expect(bodyOf(inscribedAngleLesson, 'same-arc', 'sl')).toContain('na prikazano natančnost');
    });

    test('T2 Thales instance: the diameter (0,0)-(8,6), the lattice point (1,7) is on the circle and the dot product there is exactly zero', () => {
        const [a, b, c] = pointsOf(THALES_TRIANGLE);
        const circle = circumcircle(a, b, c);
        if (circle.kind !== 'circle') throw new Error('expected a circle');
        expect([text(circle.centre.x), text(circle.centre.y), text(circle.r2)]).toEqual(['4', '3', '25']);
        expect(powerOfPoint(rational(c), circle).isZero()).toBe(true);
        expect(thalesDot(rational(c), rational(a), rational(b)).isZero()).toBe(true);
        expect((c.x - a.x) * (c.x - b.x) + (c.y - a.y) * (c.y - b.y)).toBe(0);
        const analysis = analyseInscribedAngle([a, b, c], 60);
        if (analysis.kind !== 'circle' || !analysis.glider) throw new Error('expected a glider');
        expect(analysis.diameter).toBe(true);
        expect(analysis.angleAcb).toBeCloseTo(90, 10);
        expect(analysis.centralAngle).toBeCloseTo(180, 10);
        expect(analysis.glider.angleApb).toBeCloseTo(90, 10);
        const otherArc = analyseInscribedAngle([a, b, c], 250);
        if (otherArc.kind !== 'circle' || !otherArc.glider) throw new Error('expected a glider');
        expect(otherArc.glider.relation).toBe('otherArc');
        expect(otherArc.glider.angleApb).toBeCloseTo(90, 10);
        const p = circlePoint(circle, 250 * Math.PI / 180);
        expect(angleBetween(p, a, b)! * 180 / Math.PI).toBeCloseTo(90, 10);
        const diameter = bodyOf(inscribedAngleLesson, 'diameter', 'en');
        for (const snippet of ['A=(0,0)', 'B=(8,6)', 'C=(1,7)', 'centre ((4,3))', 'radius (5)', 'ACB=90^circ']) expect(diameter).toContain(snippet);
        for (const language of ['en', 'sl'] as const) {
            const lattice = bodyOf(inscribedAngleLesson, 'lattice', language);
            for (const snippet of ['9+16=25=5^2', '(1-0)(1-8)+(7-0)(7-6)=-7+7=0']) expect(lattice).toContain(snippet);
        }
        // The explicit view holds the whole circle of centre (4, 3) and radius 5.
        const [left, top, right, bottom] = THALES_VIEW;
        expect(4 - 5 > left && 4 + 5 < right && 3 - 5 > bottom && 3 + 5 < top).toBe(true);
    });

    describe('scenes on the real graphs', () => {
        const same = (actual: readonly {x: number; y: number}[], wanted: readonly (readonly [number, number])[]) =>
            expect(actual.map(p => [p.x, p.y])).toEqual(wanted.map(p => [...p]));
        const viewOf = (graph: NotablePointsGraph | InscribedAngleGraph) => [...(Reflect.get(graph, 'board') as JXG.Board).getBoundingBox()].map(Number);
        /** The board widens a requested box to its own aspect ratio, so the check is that the view holds the requested box. */
        const holds = (view: readonly number[], wanted: readonly number[]) => view[0] <= wanted[0] && view[1] >= wanted[1] && view[2] >= wanted[2] && view[3] <= wanted[3];
        /** Applies a step the way a lesson session does: restore the checkpoint, then every action, in one synchronous act. */
        const scene = (graph: NotablePointsGraph | InscribedAngleGraph, checkpoint: unknown, lesson: LessonDefinition, stepId: string) => act(() => {
            const capabilities = graph.getLessonCapabilities();
            capabilities.restoreState(checkpoint as never);
            for (const action of lesson.steps.find(item => item.id === stepId)!.scene!.actions as LessonAction[]) capabilities.apply(action);
        });

        test('every T1 scene sets the stated vertices, overlays and view, in any order', () => {
            const graph = new NotablePointsGraph();
            mountGraph(graph);
            const checkpoint = graph.getLessonCapabilities().captureState();
            const all = ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'] as const;
            const expected: Record<string, {points: readonly (readonly [number, number])[]; shown: readonly string[]}> = {
                centroid: {points: DEFAULT_TRIANGLE, shown: ['triangle', 'centroid']},
                circumcentre: {points: DEFAULT_TRIANGLE, shown: ['triangle', 'centroid', 'circumcentre']},
                incentre: {points: DEFAULT_TRIANGLE, shown: ['triangle', 'centroid', 'circumcentre', 'incentre']},
                orthocentre: {points: DEFAULT_TRIANGLE, shown: all},
                'right-angle': {points: RIGHT_TRIANGLE, shown: all},
                obtuse: {points: OBTUSE_TRIANGLE, shown: ['triangle', 'centroid', 'circumcentre', 'orthocentre']},
                explore: {points: DEFAULT_TRIANGLE, shown: all},
            };
            expect(triangleCentresLesson.steps.map(item => item.id)).toEqual(Object.keys(expected));
            for (const item of [...triangleCentresLesson.steps, ...[...triangleCentresLesson.steps].reverse()]) {
                scene(graph, checkpoint, triangleCentresLesson, item.id);
                same(graph.model.points, expected[item.id].points);
                expect(all.filter(id => graph.overlayShown(id)), item.id).toEqual(all.filter(id => expected[item.id].shown.includes(id)));
                if (item.id !== 'obtuse') expect(holds(viewOf(graph), [-1, 6, 8, -3]), item.id).toBe(true);
            }
            // The obtuse scene frames both far centres: O = (7/2, -5/2) and H = (1, 6) are inside the view and not reported outside it.
            scene(graph, checkpoint, triangleCentresLesson, 'obtuse');
            expect(holds(viewOf(graph), OBTUSE_VIEW)).toBe(true);
            const [left, top, right, bottom] = viewOf(graph);
            for (const [x, y] of [[3.5, -2.5], [1, 6]]) expect(x > left && x < right && y < top && y > bottom, `(${x}, ${y})`).toBe(true);
            expect([...graph.outsideView()]).toEqual([]);
            expect(graph.analysis()).toMatchObject({classification: {kind: 'proper', shape: 'obtuse'}});
            // Scenes in one synchronous sequence without a restore: each begins with the default scene and leaves nothing behind.
            act(() => {
                for (const item of [triangleCentresLesson.steps[4], triangleCentresLesson.steps[5], triangleCentresLesson.steps[0]]) {
                    for (const action of item.scene!.actions as LessonAction[]) graph.getLessonCapabilities().apply(action);
                }
            });
            same(graph.model.points, DEFAULT_TRIANGLE);
            expect(graph.overlayShown('circumcentre')).toBe(false);
            expect(graph.overlayShown('centroid')).toBe(true);
        });

        test('every T2 scene sets the stated vertices, overlays, glider and view, in any order', () => {
            const graph = new InscribedAngleGraph();
            mountGraph(graph);
            const checkpoint = graph.getLessonCapabilities().captureState();
            const defaultView = [-1, 6, 8, -3];
            const expected: Record<string, {points: readonly (readonly [number, number])[]; shown: readonly string[]; t: number; view: readonly number[]}> = {
                chord: {points: DEFAULT_TRIANGLE, shown: ['angles'], t: 90, view: defaultView},
                'same-arc': {points: DEFAULT_TRIANGLE, shown: ['angles'], t: 60, view: defaultView},
                central: {points: DEFAULT_TRIANGLE, shown: ['radii', 'angles'], t: 90, view: defaultView},
                'other-arc': {points: DEFAULT_TRIANGLE, shown: ['angles'], t: 270, view: defaultView},
                diameter: {points: THALES_TRIANGLE, shown: ['radii', 'angles'], t: 60, view: [...THALES_VIEW]},
                lattice: {points: THALES_TRIANGLE, shown: ['radii', 'angles'], t: 90, view: [...THALES_VIEW]},
                explore: {points: DEFAULT_TRIANGLE, shown: ['radii', 'angles'], t: 90, view: defaultView},
            };
            expect(inscribedAngleLesson.steps.map(item => item.id)).toEqual(Object.keys(expected));
            const ids = ['radii', 'angles'] as const;
            for (const item of [...inscribedAngleLesson.steps, ...[...inscribedAngleLesson.steps].reverse()]) {
                scene(graph, checkpoint, inscribedAngleLesson, item.id);
                const want = expected[item.id];
                same(graph.model.points, want.points);
                expect(ids.filter(id => graph.overlayShown(id)), item.id).toEqual(ids.filter(id => want.shown.includes(id)));
                expect(graph.t, item.id).toBeCloseTo(want.t, 10);
                expect(holds(viewOf(graph), want.view), item.id).toBe(true);
                const analysis = graph.analysis();
                if (analysis.kind !== 'circle') throw new Error('expected a circle');
                expect(analysis.diameter, item.id).toBe(item.id === 'diameter' || item.id === 'lattice');
                expect(analysis.glider!.relation, item.id).toBe(item.id === 'other-arc' ? 'otherArc' : 'sameArc');
                if (item.id === 'central') expect(analysis.centralAngle).toBeCloseTo(2 * analysis.angleAcb, 10);
            }
        });
    });
});

// Lesson T3 (Euler line and nine-point circle): every number in the lesson and in the chapter section is recomputed from the model and the kernel.
describe('triangle geometry lesson T3 (Euler line and nine-point circle)', () => {
    beforeAll(installBoardShims);
    beforeEach(() => setLanguage('sl'));
    vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

    /** Prose without TeX backslashes, so `\approx` reads `approx` and the thin space `\,` disappears. */
    const plain = (value: string) => value.replace(/\\,/gu, '').split(String.fromCharCode(92)).join('');
    const bodyOf = (stepId: string, language: 'sl' | 'en') => plain(eulerLineLesson.steps.find(item => item.id === stepId)!.body[language]);
    const sectionPlain = (language: 'sl' | 'en') => plain(triangleGeometryChapter.sections[2].paragraphs.map(p => p[language]).join(' '));
    /** The snippet is written with a decimal point; the Slovenian prose must have the decimal comma in braces. */
    const inBoth = (read: (language: 'sl' | 'en') => string, snippet: string) =>
        read('en').includes(snippet) && read('sl').includes(snippet.split('.').join('{,}'));
    const stepHas = (stepId: string, snippet: string) => inBoth(language => bodyOf(stepId, language), snippet);
    const sectionHas = (snippet: string) => inBoth(sectionPlain, snippet);
    const triangleOf = (id: Parameters<typeof eulerExample>[0]) => {
        const analysis = analyseEulerLine(eulerExample(id).points);
        if (analysis.kind !== 'triangle') throw new Error('expected a triangle');
        return analysis;
    };
    const pointText = (p: RationalPoint) => `(${p.x.format()}, ${p.y.format()})`;
    const sq = (from: RationalPoint, to: RationalPoint) => to.sub(from).dot(to.sub(from));

    test('is owned by the euler-line section, complete in both languages, with the default scene first on every step', () => {
        const owned = getChapterOwnedLessons('triangle-geometry')!;
        expect(owned.lesson('euler-line')).toBe(eulerLineLesson);
        expect(owned.path('euler-line')).toBe(triangleGeometryGuidedExamplePath('euler-line'));
        expect(triangleGeometryGuidedExamplePath('euler-line')).toBe('/bezeg-2.0/euler-line?example=lesson.triangle-geometry.euler-line.euler-line');
        expect(eulerLineLesson.id).toBe('euler-line-nine-point');
        expect(eulerLineLesson.steps.map(item => item.id)).toEqual(['centres', 'line', 'drag', 'nine-points', 'special', 'near-equilateral', 'explore']);
        for (const label of [eulerLineLesson.title, eulerLineLesson.summary]) {
            expect(label.sl.length).toBeGreaterThan(10);
            expect(label.en.length).toBeGreaterThan(10);
        }
        for (const item of eulerLineLesson.steps) {
            for (const label of [item.title, item.body, item.prompt!]) {
                expect(label.sl.length).toBeGreaterThan(10);
                expect(label.en.length).toBeGreaterThan(10);
            }
            expect(item.scene!.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'demonstration-default'});
        }
    });

    test('the authored triangles are the graph examples', () => {
        const as = (points: readonly {x: number; y: number}[]) => points.map(p => [p.x, p.y]);
        expect(as(eulerExample('default').points)).toEqual(DEFAULT_TRIANGLE.map(p => [...p]));
        expect(as(eulerExample('right').points)).toEqual(RIGHT_TRIANGLE.map(p => [...p]));
        expect(as(eulerExample('near-equilateral').points)).toEqual(NEAR_EQUILATERAL_TRIANGLE.map(p => [...p]));
    });

    test('default triangle: H, G, O, N, the exact decisions, the distances and the nine-point circle equal the prose', () => {
        const a = triangleOf('default');
        expect([pointText(a.h.point), pointText(a.g.point), pointText(a.o.point), pointText(a.n.point)]).toEqual(['(2, 2)', '(3, 5/3)', '(7/2, 3/2)', '(11/4, 7/4)']);
        expect(a.r2Quarter.format()).toBe('29/8');
        expect(a.collinear).toBe(true);
        expect(a.ratioHolds).toBe(true);
        expect(sq(a.g.point, a.h.point).format()).toBe('10/9');
        expect(sq(a.o.point, a.g.point).format()).toBe('5/18');
        expect(a.hg.toFixed(5)).toBe('1.05409');
        expect(a.go.toFixed(5)).toBe('0.52705');
        expect(a.halfCircumradius.toFixed(5)).toBe('1.90394');
        expect(a.nine.distinctCount).toBe(9);
        // The foot of the altitude from C and the midpoint of CH, both quoted in the prose, and every one of the nine points is at R^2/4 from N.
        expect(pointText(a.nine.feet[2])).toBe('(2, 0)');
        expect(pointText(a.nine.vertexMidpoints[2])).toBe('(2, 7/2)');
        for (const p of a.nine.all) expect(sq(a.n.point, p).equals(a.r2Quarter)).toBe(true);
        expect(a.n.point.equals(a.o.point.add(a.h.point).scale(Rational.of(1, 2)))).toBe(true);
        for (const snippet of ['O=(7/2,3/2)', 'G=(3,5/3)', 'H=(2,2)']) expect(stepHas('centres', snippet), snippet).toBe(true);
        for (const snippet of ['HGapprox1.05409', 'GOapprox0.52705', 'HG^2=10/9', 'GO^2=5/18', 'HG^2=4GO^2']) expect(stepHas('line', snippet), snippet).toBe(true);
        for (const snippet of ['N=(11/4,7/4)', 'R^2/4=29/8', 'R/2approx1.90394', '(2,0)', '(2,7/2)', '|X-N|^2=29/8']) expect(stepHas('nine-points', snippet), snippet).toBe(true);
        for (const snippet of ['HG^2=10/9', 'GO^2=5/18', 'HG^2=4GO^2', 'N=(11/4,7/4)', 'R^2/4=29/8', 'R/2approx1.90394', '(2,0)', '(2,7/2)', 'HGapprox1.05409', 'GOapprox0.52705']) {
            expect(sectionHas(snippet), snippet).toBe(true);
        }
    });

    test('distinct counts: 5 for the right triangle, 8 for the isosceles one, and the right triangle merges the stated points', () => {
        const right = triangleOf('right');
        expect(right.nine.distinctCount).toBe(5);
        expect(pointText(right.n.point)).toBe('(1, 3/4)');
        expect(right.r2Quarter.format()).toBe('25/16');
        const [a, , ] = right.vertices.map(v => RationalPoint.fromGrid(v));
        expect(right.h.point.equals(a)).toBe(true);
        expect(right.nine.feet[1].equals(a) && right.nine.feet[2].equals(a) && right.nine.vertexMidpoints[0].equals(a)).toBe(true);
        expect(right.nine.vertexMidpoints[1].equals(right.nine.midpoints[2])).toBe(true);
        expect(right.nine.vertexMidpoints[2].equals(right.nine.midpoints[1])).toBe(true);
        expect(triangleOf('isosceles').nine.distinctCount).toBe(8);
        const special = bodyOf('special', 'en');
        for (const snippet of ['(5) of the (9)', 'N=(1,3/4)', 'R^2/4=25/16', '((0,0)), ((6,0)), ((3,5))', '(8) distinct points']) expect(special, snippet).toContain(snippet);
        const slSpecial = bodyOf('special', 'sl');
        for (const snippet of ['le (5) od (9)', 'N=(1,3/4)', 'R^2/4=25/16', '(8) različnih točk']) expect(slSpecial, snippet).toContain(snippet);
        const chapter = sectionPlain('en');
        expect(chapter).toContain('only (5) distinct points out of nine');
        expect(chapter).toContain('((6,0)), ((3,5)) has (8)');
    });

    test('near-equilateral triangle: H, O, |HO| = 1/14 and R = 65/14 equal the prose, and the line direction is exact', () => {
        const a = triangleOf('near-equilateral');
        expect([pointText(a.h.point), pointText(a.o.point)]).toEqual(['(4, 16/7)', '(4, 33/14)']);
        expect(sq(a.o.point, a.h.point).format()).toBe('1/196');
        expect(a.ho.toFixed(4)).toBe('0.0714');
        expect(circumradiusSquared(...a.vertices)).toMatchObject({kind: 'value'});
        expect(a.circumradius).toBeCloseTo(65 / 14, 12);
        expect(a.circumradius.toFixed(5)).toBe('4.64286');
        expect(a.collinear && a.ratioHolds).toBe(true);
        expect(a.line).toBeDefined();
        expect(a.nine.distinctCount).toBe(8);
        for (const snippet of ['H=(4,16/7)', 'O=(4,33/14)', '|HO|=1/14approx0.0714', 'R=65/14approx4.64286']) expect(stepHas('near-equilateral', snippet), snippet).toBe(true);
        for (const snippet of ['|HO|=1/14', 'R=65/14approx4.64286']) expect(sectionHas(snippet), snippet).toBe(true);
        // The equilateral limit is only a remark (H = O, no line), with no unsourced claim about lattice triangles.
        for (const language of ['sl', 'en'] as const) {
            const all = [...eulerLineLesson.steps.map(item => bodyOf(item.id, language)), sectionPlain(language)].join(' ');
            expect(all).not.toMatch(/never equilateral|nikoli enakostrani|mrežn\w* trikotnik\w* ni|lattice triangle/iu);
        }
    });

    test('the lesson and the section state theorems with the source, name the drag an illustration and give no proof idea', () => {
        for (const language of ['sl', 'en'] as const) {
            for (const [name, prose] of [['drag step', bodyOf('drag', language)], ['nine-point step', bodyOf('nine-points', language)], ['section', sectionPlain(language)]] as const) {
                if (name !== 'nine-point step') expect(prose, name).toContain('Coxeter, Introduction to Geometry');
                expect(prose, name).not.toMatch(/Introduction to Geometry\W{0,3}(\bp\.|\bstr\.|§|\d)/u);
                expect(prose, name).not.toMatch(/homothet|homotetij/iu);
            }
            expect(bodyOf('drag', language)).toMatch(language === 'sl' ? /ponazarja/u : /illustrates/u);
            expect(sectionPlain(language)).toMatch(language === 'sl' ? /ponazarja/u : /illustrates/u);
            expect(sectionPlain(language)).toMatch(language === 'sl' ? /ne dokazujemo/u : /do not prove/u);
        }
        expect(bodyOf('nine-points', 'en')).toContain('(Coxeter)');
    });

    test('the section is complete, delimited and long enough', () => {
        const section = triangleGeometryChapter.sections[2];
        expect(section.id).toBe('euler-line');
        expect(section.demonstrationIds).toEqual(['euler-line']);
        expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: 'triangle-geometry.euler-line.euler-line'});
        expect(section.formula).not.toMatch(/\\[()[\]]/u);
        for (const language of ['sl', 'en'] as const) {
            const mathFreeProse = section.paragraphs.map(p => p[language]).join(' ').replace(/\\\((?:(?!\\\)).)*\\\)/gsu, ' ');
            expect(mathFreeProse).not.toMatch(/\\[A-Za-z]+/u);
            expect(mathFreeProse.trim().split(/\s+/u).length, language).toBeGreaterThanOrEqual(250);
        }
        const slMath = section.paragraphs.flatMap(p => p.sl.match(/\\\((?:(?!\\\)).)*\\\)/gsu) ?? []);
        for (const math of slMath) expect(math).not.toMatch(/\d\.\d/u);
        expect(section.paragraphs.map(p => p.en).join(' ')).not.toContain('{,}');
    });

    describe('scenes on the real graph', () => {
        const viewOf = (graph: EulerLineGraph) => [...(Reflect.get(graph, 'board') as JXG.Board).getBoundingBox()].map(Number);
        const holds = (view: readonly number[], wanted: readonly number[]) => view[0] <= wanted[0] && view[1] >= wanted[1] && view[2] >= wanted[2] && view[3] <= wanted[3];
        const scene = (graph: EulerLineGraph, checkpoint: unknown, stepId: string) => act(() => {
            const capabilities = graph.getLessonCapabilities();
            capabilities.restoreState(checkpoint as never);
            for (const action of eulerLineLesson.steps.find(item => item.id === stepId)!.scene!.actions as LessonAction[]) capabilities.apply(action);
        });

        test('every T3 scene sets the stated vertices and overlays, and its view holds every point the step talks about, in any order', () => {
            const graph = new EulerLineGraph();
            mountGraph(graph);
            const checkpoint = graph.getLessonCapabilities().captureState();
            const all = ['triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle'] as const;
            const lineShown = ['triangle', 'centres', 'line'];
            const circleShown = ['triangle', 'centres', 'line', 'circle', 'ninepoints'];
            const expected: Record<string, {points: readonly (readonly [number, number])[]; shown: readonly string[]; view?: readonly number[]}> = {
                centres: {points: DEFAULT_TRIANGLE, shown: ['triangle', 'centres']},
                line: {points: DEFAULT_TRIANGLE, shown: lineShown},
                drag: {points: DEFAULT_TRIANGLE, shown: lineShown},
                'nine-points': {points: DEFAULT_TRIANGLE, shown: circleShown},
                special: {points: RIGHT_TRIANGLE, shown: circleShown},
                'near-equilateral': {points: NEAR_EQUILATERAL_TRIANGLE, shown: ['triangle', 'centres', 'line', 'circle'], view: NEAR_EQUILATERAL_VIEW},
                explore: {points: DEFAULT_TRIANGLE, shown: all},
            };
            expect(eulerLineLesson.steps.map(item => item.id)).toEqual(Object.keys(expected));
            for (const item of [...eulerLineLesson.steps, ...[...eulerLineLesson.steps].reverse()]) {
                scene(graph, checkpoint, item.id);
                const want = expected[item.id];
                expect(graph.model.points.map(p => [p.x, p.y]), item.id).toEqual(want.points.map(p => [...p]));
                expect(all.filter(id => graph.overlayShown(id)), item.id).toEqual(all.filter(id => want.shown.includes(id)));
                const analysis = graph.analysis();
                if (analysis.kind !== 'triangle') throw new Error('expected a triangle');
                const [left, top, right, bottom] = viewOf(graph);
                const inside = (label: string, board: {x: number; y: number} | undefined) => {
                    expect(board, `${item.id} ${label}`).toBeDefined();
                    expect(board!.x > left && board!.x < right && board!.y < top && board!.y > bottom, `${item.id} ${label} in view`).toBe(true);
                };
                analysis.vertices.forEach((v, i) => inside(`vertex ${i}`, v));
                if (want.shown.includes('centres')) for (const key of ['h', 'g', 'o'] as const) inside(key, analysis[key].board);
                if (want.shown.includes('circle')) inside('n', analysis.n.board);
                if (want.shown.includes('ninepoints')) analysis.ninePoints.forEach((p, i) => inside(`nine ${i}`, p.board));
                expect(holds(viewOf(graph), want.view ?? [-1, 6, 8, -3]), item.id).toBe(true);
                expect([...graph.outsideView()], item.id).toEqual([]);
            }
            // The near-equilateral step holds both close points (they need not be told apart on the board) and its explicit box.
            scene(graph, checkpoint, 'near-equilateral');
            const near = graph.analysis();
            if (near.kind !== 'triangle') throw new Error('expected a triangle');
            expect(near.ho).toBeLessThan(0.1);
            // Scenes in one synchronous sequence without a restore: each begins with the default scene and leaves nothing behind.
            act(() => {
                for (const item of [eulerLineLesson.steps[5], eulerLineLesson.steps[4], eulerLineLesson.steps[0]]) {
                    for (const action of item.scene!.actions as LessonAction[]) graph.getLessonCapabilities().apply(action);
                }
            });
            expect(graph.model.points.map(p => [p.x, p.y])).toEqual(DEFAULT_TRIANGLE.map(p => [...p]));
            expect(graph.overlayShown('ninepoints')).toBe(false);
            expect(['centres', 'line', 'circle'].map(id => graph.overlayShown(id as 'centres'))).toEqual([true, false, false]);
            expect(holds(viewOf(graph), [-1, 6, 8, -3])).toBe(true);
        });
    });
});

// Lesson T4 (Simson line), 07 F3+F4. Every number in the prose is recomputed from the Simson kernel and model.
describe('triangle geometry lesson T4 (Simson line)', () => {
    beforeAll(installBoardShims);
    beforeEach(() => setLanguage('sl'));
    vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

    /** Prose without TeX backslashes and thin spaces, so `\approx` reads `approx` and `(2.20,\,0)` reads `(2.20,0)`. */
    const plain = (value: string) => value.replace(/\\,/gu, '').split(String.fromCharCode(92)).join('');
    const bodyOf = (stepId: string, language: 'sl' | 'en') => plain(simsonLineLesson.steps.find(item => item.id === stepId)!.body[language]);
    const sectionPlain = (language: 'sl' | 'en') => plain(triangleGeometryChapter.sections[3].paragraphs.map(p => p[language]).join(' '));
    /** The snippet is written with a decimal point; the Slovenian prose must have the decimal comma in braces. */
    const inBoth = (read: (language: 'sl' | 'en') => string, snippet: string) =>
        read('en').includes(snippet) && read('sl').includes(snippet.split('.').join('{,}'));
    const stepHas = (stepId: string, snippet: string) => inBoth(language => bodyOf(stepId, language), snippet);
    const sectionHas = (snippet: string) => inBoth(sectionPlain, snippet);
    const points = SIMSON_EXAMPLES[0].points;
    const triangleAt = (settings: Parameters<typeof analyseSimson>[1]) => {
        const analysis = analyseSimson(points, settings);
        if (analysis.kind !== 'triangle') throw new Error('expected a triangle');
        return analysis;
    };
    const glide = (t: number, epsilon: SimsonOffset = 0) => triangleAt({mode: 'glider', t, epsilon, pPrime: {x: 2, y: -2}});
    const exactAt = (id: SimsonExampleId) => {
        const example = simsonExample(id);
        return triangleAt({mode: example.mode, t: example.t, epsilon: example.epsilon, pPrime: example.pPrime});
    };
    const rounded = (view: {x: number; y: number}) => `(${view.x.toFixed(2)},${view.y.toFixed(2)})`;
    const exactText = (point: RationalPoint | undefined) => `(${point!.x.format()}, ${point!.y.format()})`;

    test('is owned by the simson-line section, complete in both languages, with the default scene first on every step', () => {
        const owned = getChapterOwnedLessons('triangle-geometry')!;
        expect(owned.lesson('simson-line')).toBe(simsonLineLesson);
        expect(owned.path('simson-line')).toBe(triangleGeometryGuidedExamplePath('simson-line'));
        expect(triangleGeometryGuidedExamplePath('simson-line')).toBe('/bezeg-2.0/simson-line?example=lesson.triangle-geometry.simson-line.simson-line');
        expect(simsonLineLesson.id).toBe('simson-line');
        expect(simsonLineLesson.demonstrationId).toBe('simson-line');
        expect(simsonLineLesson.steps.map(item => item.id)).toEqual(['circle', 'feet', 'drag', 'offset', 'readout', 'vertex', 'explore']);
        for (const label of [simsonLineLesson.title, simsonLineLesson.summary]) {
            expect(label.sl.length).toBeGreaterThan(10);
            expect(label.en.length).toBeGreaterThan(10);
        }
        for (const item of simsonLineLesson.steps) {
            for (const label of [item.title, item.body, item.prompt!]) {
                expect(label.sl.length).toBeGreaterThan(10);
                expect(label.en.length).toBeGreaterThan(10);
            }
            expect(item.scene!.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'demonstration-default'});
        }
    });

    test('the authored triangle is the graph example and the glider angles are the stated constants', () => {
        expect(points.map(p => [p.x, p.y])).toEqual(DEFAULT_TRIANGLE.map(p => [...p]));
        expect([SIMSON_T_BELOW, SIMSON_T_LEFT, SIMSON_T_RIGHT]).toEqual([250, 150, 320]);
    });

    test('triangle: S = 35/2, O = (7/2, 3/2), R^2 = 29/2 equal the prose', () => {
        const a = glide(250);
        expect(a.centre.x.format()).toBe('7/2');
        expect(a.centre.y.format()).toBe('3/2');
        expect(a.r2.format()).toBe('29/2');
        expect(orientValue(points[0], points[1], points[2]) / 2).toBe(35 / 2);
        expect(stepHas('circle', 'S=35/2')).toBe(true);
        expect(stepHas('circle', 'O=(7/2,3/2)')).toBe(true);
        expect(stepHas('circle', 'R^2=29/2')).toBe(true);
        expect(sectionHas('S=35/2')).toBe(true);
        expect(sectionHas('O=(7/2,3/2)')).toBe(true);
        expect(sectionHas('R^2=29/2')).toBe(true);
    });

    test('glider at offset 0: the stated P and feet at t = 250, 150, 320; the status is plain collinear and the area is zero', () => {
        const expected: Record<number, {step: string; p: string; feet?: readonly string[]}> = {
            250: {step: 'feet', p: '(2.20,-2.08)', feet: ['(5.64,1.36)', '(-0.41,-1.03)', '(2.20,0.00)']},
            150: {step: 'drag', p: '(0.20,3.40)'},
            320: {step: 'drag', p: '(6.42,-0.95)'},
        };
        for (const [angle, want] of Object.entries(expected)) {
            const a = glide(Number(angle));
            expect(rounded(a.p), `t=${angle}`).toBe(want.p);
            expect(a.status, `t=${angle}`).toBe('collinear-within');
            expect(a.collinear).toBe(true);
            expect(a.glider!.relative).toBeLessThan(1e-9);
            expect(a.line, `t=${angle}`).toBeDefined();
            if (want.feet) expect(a.feet.map(rounded), `t=${angle}`).toEqual(want.feet);
            // The prose names P at the glider angles of the step.
            if (want.feet) {
                expect(stepHas('feet', `Fapprox(${want.feet[2].slice(1, -1).replace(',0.00', ',0')})`)).toBe(true);
                expect(stepHas('feet', `Dapprox${want.feet[0]}`)).toBe(true);
                expect(stepHas('feet', `Eapprox${want.feet[1]}`)).toBe(true);
            } else {
                expect(stepHas('drag', `Papprox${want.p}`), `t=${angle}`).toBe(true);
            }
        }
        // The status key is the plain "collinear" and the readout is the zero text (owner decision 2026-11-02).
        setLanguage('sl');
        expect(simsonStatusText('collinear-within', t)).toBe('kolinearna');
        setLanguage('en');
        expect(simsonStatusText('collinear-within', t)).toBe('collinear');
        expect(bodyOf('feet', 'en')).toContain('the status reads "collinear" and the readout of the foot triangle\'s area is (0)');
        expect(bodyOf('feet', 'sl')).toContain('stanje pove »kolinearna«');
    });

    test('offsets: the area / S of the foot triangle is the stated value, the status is not collinear, and the prose uses 0.0005 S and 0.11 S', () => {
        const wanted: Record<number, number> = {0.001: 0.0005, 0.01: 0.005025, 0.05: 0.025625, 0.2: 0.11};
        for (const [epsilon, ratio] of Object.entries(wanted)) {
            const a = glide(250, Number(epsilon) as SimsonOffset);
            expect(a.glider!.relative, `eps=${epsilon}`).toBeCloseTo(ratio, 6);
            expect(a.status, `eps=${epsilon}`).toBe('not-collinear');
            expect(a.collinear).toBe(false);
        }
        expect(glide(250, 0.001).glider!.relative).toBeCloseTo(0.0005, 6);
        expect(glide(250, 0.2).glider!.relative).toBeCloseTo(0.11, 6);
        expect(stepHas('offset', '0.11S')).toBe(true);
        expect(stepHas('offset', 'varepsilon=0.2')).toBe(true);
        expect(stepHas('readout', 'varepsilon=0.001')).toBe(true);
        expect(stepHas('readout', '0.0005S')).toBe(true);
        expect(sectionHas('0.0005S')).toBe(true);
        expect(sectionHas('0.11S')).toBe(true);
        // The negative offset opens the triangle too (the area is 0.09 S, not the same as at +0.2).
        expect(glide(250, -0.2).status).toBe('not-collinear');
        expect(glide(250, -0.2).glider!.relative).toBeCloseTo(0.09, 6);
        // The area readout of the board says the same thing in both languages.
        setLanguage('sl');
        expect(simsonTexts(glide(250, 0.001), t, 'sl', new Set()).area).toBe('Ploščina nožiščnega trikotnika / S ≈ 5,0·10⁻⁴');
        expect(simsonTexts(glide(250, 0.001), t, 'sl', new Set()).status).toBe('ni kolinearna');
        expect(simsonTexts(glide(250), t, 'sl', new Set()).area).toBe('Ploščina nožiščnega trikotnika / S = 0');
    });

    test('the readout step says the feet look collinear while the readout and status say not collinear, and that the drag shows only the "if"', () => {
        // At eps = 0.001 the feet are within a small fraction of a board unit of a line: far below a pixel at the default view.
        const a = glide(250, 0.001);
        const [d, e, f] = a.feet;
        const deviation = Math.abs((e.x - d.x) * (f.y - d.y) - (e.y - d.y) * (f.x - d.x)) / Math.hypot(e.x - d.x, e.y - d.y);
        expect(deviation).toBeLessThan(0.01);
        expect(bodyOf('readout', 'en')).toContain('the feet look collinear on the board');
        expect(bodyOf('readout', 'en')).toContain('the status says "not collinear"');
        expect(bodyOf('readout', 'en')).toContain('shows only the "if"');
        expect(bodyOf('readout', 'sl')).toContain('videti kolinearna');
        expect(bodyOf('readout', 'sl')).toContain('ni kolinearna');
        expect(bodyOf('readout', 'sl')).toContain('pokaže le »če«');
    });

    test('exact example (2, -2): the three feet and the orientation 0 equal the prose, and P is on the circle', () => {
        const a = exactAt('grid-on-circle');
        expect(a.feet.map(f => exactText(f.exact))).toEqual(['(11/2, 3/2)', '(-12/29, -30/29)', '(2, 0)']);
        expect(a.exact!.orient.format()).toBe('0');
        expect(a.exact!.onCircle).toBe(true);
        expect(a.exact!.power.isZero()).toBe(true);
        expect(a.status).toBe('collinear-exact');
        expect(a.exact!.distinctCount).toBe(3);
        expect(plain(simsonLineLesson.steps[6].body.en)).toContain('((11/2,3/2)), ((-12/29,-30/29)) and ((2,0))');
        expect(sectionPlain('en')).toContain('(D=(11/2,3/2)), (E=(-12/29,-30/29)) and (F=(2,0))');
        expect(sectionPlain('sl')).toContain('(D=(11/2,3/2)), (E=(-12/29,-30/29)) in (F=(2,0))');
        expect(sectionPlain('en')).toContain('|P^{prime}-O|^2=9/4+49/4=29/2');
        // |P' - O|^2 = 9/4 + 49/4 recomputed.
        const dx = Rational.fromInt(2).sub(a.centre.x);
        const dy = Rational.fromInt(-2).sub(a.centre.y);
        expect(dx.mul(dx).format()).toBe('9/4');
        expect(dy.mul(dy).format()).toBe('49/4');
        expect(dx.mul(dx).add(dy.mul(dy)).equals(a.r2)).toBe(true);
    });

    test('vertex example: P\' = B, two feet coincide at B, the line through the two distinct feet is the altitude from B and the status says so', () => {
        const a = exactAt('vertex');
        expect(a.status).toBe('coincident');
        expect(a.feet.map(f => exactText(f.exact))).toEqual(['(7, 0)', '(28/29, 70/29)', '(7, 0)']);
        expect(a.exact!.distinctCount).toBe(2);
        expect(a.exact!.orient.isZero()).toBe(true);
        expect(a.collinear).toBe(true);
        expect(a.linePair).toBeDefined();
        expect(a.line).toBeDefined();
        const [from, to] = a.linePair!.map(i => a.feet[i]);
        expect([from.exact!.equals(to.exact!)]).toEqual([false]);
        // B - E is perpendicular to C - A: the line through the two distinct feet is the altitude from B.
        const b = RationalPoint.fromGrid(points[1]);
        const dot = b.sub(a.feet[1].exact!).dot(RationalPoint.fromGrid(points[2]).sub(RationalPoint.fromGrid(points[0])));
        expect(dot.isZero()).toBe(true);
        expect(stepHas('vertex', 'E=(28/29,70/29)')).toBe(true);
        expect(stepHas('vertex', 'P^{prime}=B=(7,0)')).toBe(true);
        expect(bodyOf('vertex', 'en')).toContain('altitude from (B)');
        setLanguage('en');
        expect(simsonStatusText(a.status, t)).toBe('two feet coincide; the line passes through the two distinct feet');
        expect(bodyOf('vertex', 'en')).toContain('two feet coincide and that the line passes through the two distinct feet');
    });

    test('the lesson and the section state the theorem with the source, call the drag an illustration, and state no distance formula as a theorem', () => {
        for (const language of ['sl', 'en'] as const) {
            for (const [name, prose] of [['drag step', bodyOf('drag', language)], ['section', sectionPlain(language)]] as const) {
                expect(prose, name).toContain('Coxeter, Introduction to Geometry');
                expect(prose, name).not.toMatch(/Introduction to Geometry\W{0,3}(\bp\.|\bstr\.|§|\d)/u);
            }
            expect(bodyOf('drag', language)).toMatch(language === 'sl' ? /ponazarja/u : /illustrates/u);
            expect(sectionPlain(language)).toMatch(language === 'sl' ? /ponazarja/u : /illustrates/u);
            const all = [...simsonLineLesson.steps.map(item => bodyOf(item.id, language)), sectionPlain(language)].join(' ');
            expect(all).not.toMatch(/OP\^2|R\^2-OP|4R\^2/u);
        }
    });

    test('the section is complete, delimited and long enough', () => {
        const section = triangleGeometryChapter.sections[3];
        expect(section.id).toBe('simson-line');
        expect(section.demonstrationIds).toEqual(['simson-line']);
        expect(section.orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: 'triangle-geometry.simson-line.simson-line'});
        expect(section.formula).not.toMatch(/\\[()[\]]/u);
        for (const language of ['sl', 'en'] as const) {
            const mathFreeProse = section.paragraphs.map(p => p[language]).join(' ').replace(/\\\((?:(?!\\\)).)*\\\)/gsu, ' ');
            expect(mathFreeProse).not.toMatch(/\\[A-Za-z]+/u);
            expect(mathFreeProse.trim().split(/\s+/u).length, language).toBeGreaterThanOrEqual(250);
        }
        const slMath = section.paragraphs.flatMap(p => p.sl.match(/\\\((?:(?!\\\)).)*\\\)/gsu) ?? []);
        for (const math of slMath) expect(math).not.toMatch(/\d\.\d/u);
        expect(section.paragraphs.map(p => p.en).join(' ')).not.toContain('{,}');
    });

    describe('scenes on the real graph', () => {
        const viewOf = (graph: SimsonLineGraph) => [...(Reflect.get(graph, 'board') as JXG.Board).getBoundingBox()].map(Number);
        const scene = (graph: SimsonLineGraph, checkpoint: unknown, stepId: string) => act(() => {
            const capabilities = graph.getLessonCapabilities();
            capabilities.restoreState(checkpoint as never);
            for (const action of simsonLineLesson.steps.find(item => item.id === stepId)!.scene!.actions as LessonAction[]) capabilities.apply(action);
        });
        const all = ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'] as const;

        test('every T4 scene sets the stated example, glider angle, offset and overlays, and its view holds P and every foot, in any order', () => {
            const graph = new SimsonLineGraph();
            mountGraph(graph);
            const checkpoint = graph.getLessonCapabilities().captureState();
            const base = ['triangle', 'sidelines', 'circumcircle'];
            const lines = [...base, 'perpendiculars', 'simson'];
            const expected: Record<string, {shown: readonly string[]; mode: 'glider' | 'exact'; t?: number; epsilon?: number; pPrime?: {x: number; y: number}}> = {
                circle: {shown: base, mode: 'glider', t: 250, epsilon: 0},
                feet: {shown: lines, mode: 'glider', t: 250, epsilon: 0},
                drag: {shown: lines, mode: 'glider', t: 150, epsilon: 0},
                offset: {shown: ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'pedal'], mode: 'glider', t: 250, epsilon: 0.2},
                readout: {shown: all, mode: 'glider', t: 250, epsilon: 0.001},
                vertex: {shown: lines, mode: 'exact', pPrime: {x: 7, y: 0}},
                explore: {shown: all, mode: 'glider', t: 250, epsilon: 0},
            };
            expect(simsonLineLesson.steps.map(item => item.id)).toEqual(Object.keys(expected));
            for (const item of [...simsonLineLesson.steps, ...[...simsonLineLesson.steps].reverse()]) {
                scene(graph, checkpoint, item.id);
                const want = expected[item.id];
                expect(graph.model.points.map(p => [p.x, p.y]), item.id).toEqual(DEFAULT_TRIANGLE.map(p => [...p]));
                expect(all.filter(id => graph.overlayShown(id)), item.id).toEqual(all.filter(id => want.shown.includes(id)));
                const settings = graph.settings;
                expect(settings.mode, item.id).toBe(want.mode);
                if (want.t !== undefined) expect(settings.t, item.id).toBe(want.t);
                if (want.epsilon !== undefined) expect(settings.epsilon, item.id).toBe(want.epsilon);
                if (want.pPrime) expect(settings.pPrime, item.id).toEqual(want.pPrime);
                const analysis = graph.analysis();
                if (analysis.kind !== 'triangle') throw new Error('expected a triangle');
                const [left, top, right, bottom] = viewOf(graph);
                const margin = 0.25;
                const inside = (label: string, board: {x: number; y: number} | undefined) => {
                    expect(board, `${item.id} ${label}`).toBeDefined();
                    expect(board!.x > left + margin && board!.x < right - margin && board!.y < top - margin && board!.y > bottom + margin, `${item.id} ${label} in view`).toBe(true);
                };
                analysis.vertices.forEach((v, i) => inside(`vertex ${i}`, v));
                inside('P', analysis.p.board);
                analysis.feet.forEach((foot, i) => inside(`foot ${i}`, foot.board));
                expect([...graph.outsideView()], item.id).toEqual([]);
                // The status of the step matches the prose: plain collinear on the circle, not collinear off it, coincident at the vertex.
                expect(analysis.status, item.id).toBe(item.id === 'vertex' ? 'coincident' : item.id === 'offset' || item.id === 'readout' ? 'not-collinear' : 'collinear-within');
            }
            // Scenes in one synchronous sequence without a restore: each begins with the default scene and leaves nothing behind.
            act(() => {
                for (const item of [simsonLineLesson.steps[5], simsonLineLesson.steps[3], simsonLineLesson.steps[0]]) {
                    for (const action of item.scene!.actions as LessonAction[]) graph.getLessonCapabilities().apply(action);
                }
            });
            expect(graph.settings).toMatchObject({mode: 'glider', t: 250, epsilon: 0});
            expect(graph.exampleId).toBe('default');
            expect(all.filter(id => graph.overlayShown(id))).toEqual(['triangle', 'sidelines', 'circumcircle']);
        });

        test('the simson actions: valid values apply, refused values throw and change nothing, and the overlay names are owned', () => {
            const graph = new SimsonLineGraph();
            mountGraph(graph);
            const apply = (action: LessonAction) => act(() => graph.getLessonCapabilities().apply(action));
            apply({kind: 'simson', operation: 'set-offset', epsilon: 0.05});
            expect(graph.settings.epsilon).toBe(0.05);
            apply({kind: 'simson', operation: 'load-example', exampleId: 'grid-off-circle'});
            expect(graph.settings).toMatchObject({mode: 'exact', pPrime: {x: 6, y: 4}, epsilon: 0});
            expect(graph.exampleId).toBe('grid-off-circle');
            apply({kind: 'parameter', name: 't', value: 400});
            expect(graph.settings.t).toBe(40);
            const before = JSON.stringify(graph.state);
            const refused: LessonAction[] = [
                {kind: 'simson', operation: 'set-offset', epsilon: 0.3 as never},
                {kind: 'simson', operation: 'set-offset', epsilon: Number.NaN as never},
                {kind: 'simson', operation: 'load-example', exampleId: 'nonsense' as never},
                {kind: 'parameter', name: 't', value: Number.NaN},
                {kind: 'parameter', name: 't', value: Number.POSITIVE_INFINITY},
                {kind: 'simson', operation: 'set-mode', mode: 'exact'} as never,
                {kind: 'point-set', operation: 'set-overlay', overlay: 'ninepoints', visible: true},
            ];
            for (const action of refused) expect(() => apply(action), JSON.stringify(action)).toThrow();
            expect(JSON.stringify(graph.state)).toBe(before);
            apply({kind: 'point-set', operation: 'set-overlay', overlay: 'pedal', visible: false});
            expect(graph.overlayShown('pedal')).toBe(false);
            apply({kind: 'point-set', operation: 'set-overlay', overlay: 'sidelines', visible: false});
            expect(graph.overlayShown('sidelines')).toBe(false);
        });
    });
});

describe('triangle geometry lesson T5 (power of a point and inversion)', () => {
    beforeAll(installBoardShims);
    beforeEach(() => setLanguage('sl'));
    vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

    const plain = (value: string) => value.replace(/\\,/gu, '').split(String.fromCharCode(92)).join('');
    const bodyOf = (stepId: string, language: 'sl' | 'en') => plain(inversionLesson.steps.find(item => item.id === stepId)!.body[language]);
    const section = () => triangleGeometryChapter.sections[4];
    const sectionPlain = (language: 'sl' | 'en') => plain(section().paragraphs.map(p => p[language]).join(' '));
    /** The snippet is written with a decimal point; the Slovenian prose must have the decimal comma in braces. */
    const inBoth = (read: (language: 'sl' | 'en') => string, snippet: string) =>
        read('en').includes(snippet) && read('sl').includes(snippet.split('.').join('{,}'));
    const stepHas = (stepId: string, snippet: string) => inBoth(language => bodyOf(stepId, language), snippet);
    const sectionHas = (snippet: string) => inBoth(sectionPlain, snippet);
    const origin = {x: 0, y: 0};
    const exact = (p: {x: Rational; y: Rational}) => `(${p.x.format()},${p.y.format()})`;
    const imageOf = (inversion: Parameters<typeof analysePoint>[0], x: {x: number; y: number}) => {
        const result = analysePoint(inversion, x);
        if (result.kind !== 'image') throw new Error('expected an image');
        return result;
    };
    const POWER_CIRCLE = {centre: {x: 5, y: 0}, radius: 3};
    const R2 = {centre: origin, radius: 2};

    test('is owned by the inversion section, complete in both languages, with the default scene first on every step', () => {
        const owned = getChapterOwnedLessons('triangle-geometry')!;
        expect(owned.lesson('inversion')).toBe(inversionLesson);
        expect(owned.path('inversion')).toBe(triangleGeometryGuidedExamplePath('inversion'));
        expect(triangleGeometryGuidedExamplePath('inversion')).toBe('/bezeg-2.0/inversion?example=lesson.triangle-geometry.inversion.inversion');
        expect(inversionLesson.id).toBe('inversion');
        expect(inversionLesson.demonstrationId).toBe('inversion');
        expect(inversionLesson.steps.map(item => item.id)).toEqual(['power', 'product', 'image', 'line', 'circle', 'angle', 'explore']);
        for (const label of [inversionLesson.title, inversionLesson.summary]) {
            expect(label.sl.length).toBeGreaterThan(10);
            expect(label.en.length).toBeGreaterThan(10);
        }
        for (const item of inversionLesson.steps) {
            for (const label of [item.title, item.body, item.prompt!]) {
                expect(label.sl.length).toBeGreaterThan(10);
                expect(label.en.length).toBeGreaterThan(10);
            }
            expect(item.scene!.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'demonstration-default'});
        }
    });

    test('power: P = C = (0,0), circle (5,0) radius 3: the power is 16, A = (2,0), B = (8,0), the tangent length is 4, and the product stays 16 at 20 degrees', () => {
        const turned = (degrees: number) => {
            const result = analysePower(origin, POWER_CIRCLE, degrees);
            if (result.kind !== 'power' || result.secant.kind !== 'two') throw new Error('expected a secant');
            return {...result, secant: result.secant};
        };
        const flat = turned(0);
        expect(flat.power.format()).toBe('16');
        expect(flat.position).toBe('outside');
        expect([flat.secant.A.x, flat.secant.A.y].map(Math.abs)).toEqual([2, 0]);
        expect([flat.secant.B.x, flat.secant.B.y].map(Math.abs)).toEqual([8, 0]);
        expect(flat.secant.product).toBeCloseTo(16, 9);
        expect(flat.tangent!.length).toBeCloseTo(4, 12);
        expect(flat.tangent!.length ** 2).toBeCloseTo(16, 9);
        const angled = turned(INVERSION_THETA_TURNED);
        const distance = (p: {x: number; y: number}) => Math.hypot(p.x, p.y);
        expect(distance(angled.secant.A)).toBeCloseTo(2.2336, 3);
        expect(distance(angled.secant.B)).toBeCloseTo(7.1633, 3);
        expect(distance(angled.secant.A) * distance(angled.secant.B)).toBeCloseTo(16, 9);
        expect(angled.secant.product).toBeCloseTo(16, 9);
        // 25 - 9 = 16 from the circle kernel as well.
        expect(powerOfPoint(RationalPoint.fromGrid(origin), {centre: RationalPoint.fromGrid(POWER_CIRCLE.centre), r2: Rational.of(9)}).format()).toBe('16');
        expect(INVERSION_THETA_TURNED).toBe(20);
        for (const snippet of ['A=(2,0)', 'B=(8,0)', '2cdot8=16', 'PAapprox2.23', 'PBapprox7.16', '4^2=16', 'theta=20^circ', 'theta=0^circ', '25-9=16']) {
            expect(stepHas('product', snippet), snippet).toBe(true);
        }
        expect(stepHas('power', 'O=(5,0)')).toBe(true);
        expect(stepHas('power', 'rho=3')).toBe(true);
        expect(bodyOf('product', 'en')).toContain('The tangent length from (P) is (4)');
    });

    test('point: r = 2, X = (3,1): X\' = (6/5, 2/5) on the ray CX, |CX| |CX\'| = r^2 = 4', () => {
        const a = imageOf(R2, {x: 3, y: 1});
        expect(exact(a.exact)).toBe('(6/5,2/5)');
        expect(a.position).toBe('outside');
        expect(Math.hypot(3, 1) * Math.hypot(a.drawn.x, a.drawn.y)).toBeCloseTo(4, 12);
        expect(a.drawn.x).toBeCloseTo(1.2, 12);
        expect(a.drawn.y).toBeCloseTo(0.4, 12);
        // On the ray: the image is a positive multiple of X.
        expect(a.drawn.x * 1 - a.drawn.y * 3).toBeCloseTo(0, 12);
        expect(a.drawn.x * 3 + a.drawn.y * 1).toBeGreaterThan(0);
        const b = imageOf({centre: origin, radius: 4}, {x: 1, y: 0});
        expect(exact(b.exact)).toBe('(16,0)');
        for (const snippet of ['r=2', 'X=(3,1)', 'r^2=4', 'sqrt{10}', 'X^{prime}=(6/5,2/5)']) expect(stepHas('image', snippet), snippet).toBe(true);
    });

    test('through the centre: the circle (1,0) radius 1 becomes the line x = 2 with the stated exact images', () => {
        const a = analyseSource(R2, {kind: 'circle', centre: {x: 1, y: 0}, radius: 1});
        if (a.kind !== 'image' || a.exact.kind !== 'line') throw new Error('expected a line');
        expect(a.throughCentre).toBe(true);
        expect(a.shape).toBe('line');
        expect([a.exact.a.format(), a.exact.b.format(), a.exact.c.format()]).toEqual(['1', '0', '2']);
        for (const [x, y, ix, iy] of [[1, 1, 2, 2], [1, -1, 2, -2], [2, 0, 2, 0]]) {
            const image = imageOf(R2, {x, y});
            expect(exact(image.exact), `(${x},${y})`).toBe(`(${ix},${iy})`);
            expect(Math.hypot(image.drawn.x - ix, image.drawn.y - iy)).toBeLessThan(1e-12);
            expect(a.exact.a.mul(image.exact.x).add(a.exact.b.mul(image.exact.y)).format()).toBe('2');
        }
        for (const snippet of ['(1,0)', 'radius(1)', 'x=2', '(1,1)mapsto(2,2)', '(1,-1)mapsto(2,-2)', '(2,0)mapsto(2,0)'].filter(item => !item.startsWith('radius'))) {
            expect(stepHas('line', snippet), snippet).toBe(true);
        }
        // A line through the centre maps to itself.
        const own = analyseSource(R2, {kind: 'line', p: {x: -3, y: -3}, q: {x: 3, y: 3}});
        if (own.kind !== 'image') throw new Error('expected an image');
        expect([own.shape, own.throughCentre]).toEqual(['line', true]);
    });

    test('not through the centre: the circle (3,0) radius 1 becomes the circle (3/2,0) radius 1/2; the orthogonal circle maps to itself', () => {
        const a = analyseSource(R2, {kind: 'circle', centre: {x: 3, y: 0}, radius: 1});
        if (a.kind !== 'image' || a.exact.kind !== 'circle') throw new Error('expected a circle');
        expect(a.throughCentre).toBe(false);
        expect(`(${a.exact.centre.x.format()},${a.exact.centre.y.format()})`).toBe('(3/2,0)');
        expect(a.exact.r2.format()).toBe('1/4');
        const centre = a.exact.centre;
        for (const [x, y, ix, iy] of [[2, 0, '2', '0'], [4, 0, '1', '0'], [3, 1, '6/5', '2/5']] as const) {
            const image = imageOf(R2, {x, y});
            expect(exact(image.exact), `(${x},${y})`).toBe(`(${ix},${iy})`);
            const d = image.exact.sub(centre);
            expect(d.dot(d).format(), `(${x},${y})`).toBe('1/4');
        }
        for (const snippet of ['(3,0)', '(3/2,0)', '(6/5,2/5)', '(2,0)', '(4,0)', '(3,1)', '1/2', 'r=4']) expect(stepHas('circle', snippet), snippet).toBe(true);
        // r = 4 and the circle (5,0) radius 3: the power of C is 16 = r^2, so the circle is orthogonal and maps to itself.
        const four = {centre: origin, radius: 4};
        const own = analyseSource(four, {kind: 'circle', centre: {x: 5, y: 0}, radius: 3});
        if (own.kind !== 'image' || own.exact.kind !== 'circle') throw new Error('expected a circle');
        expect(`(${own.exact.centre.x.format()},${own.exact.centre.y.format()})`).toBe('(5,0)');
        expect(own.exact.r2.format()).toBe('9');
        expect(exact(imageOf(four, {x: 2, y: 0}).exact)).toBe('(8,0)');
        expect(exact(imageOf(four, {x: 8, y: 0}).exact)).toBe('(2,0)');
        const five = imageOf(four, {x: 5, y: 3});
        expect(exact(five.exact)).toBe('(40/17,24/17)');
        const d = five.exact.sub(own.exact.centre);
        expect(d.dot(d).format()).toBe('9');
        expect(sectionHas('(5,3)mapsto(40/17,24/17)')).toBe(true);
    });

    test('angle: the circles meet at 60 degrees at Q = (2.134, 0.5); the images meet at 60 degrees with the opposite sign', () => {
        const first = {centre: {x: 3, y: 0}, radius: 1};
        const second = {centre: {x: 3, y: 1}, radius: 1};
        const read = (which: 0 | 1) => {
            const a = analyseAngle(R2, first, second, which);
            if (a.kind !== 'angle') throw new Error('expected an angle');
            return a;
        };
        const q = INVERSION_EXAMPLES.find(example => example.id === 'angle')!.angle!.which;
        const a = read(q);
        expect(a.point.x).toBeCloseTo(3 - Math.sqrt(3) / 2, 9);
        expect(a.point.y).toBeCloseTo(0.5, 12);
        expect(a.point.x).toBeCloseTo(2.134, 3);
        expect(a.image.x).toBeCloseTo(1.777, 3);
        expect(a.image.y).toBeCloseTo(0.416, 3);
        expect(a.before.unsigned).toBeCloseTo(60, 9);
        expect(a.after.unsigned).toBeCloseTo(60, 9);
        expect(a.before.signed).toBeCloseTo(60, 9);
        expect(a.after.signed).toBeCloseTo(-60, 9);
        // The other intersection point gives the mirrored signs.
        const other = read(q === 0 ? 1 : 0);
        expect(other.point.x).toBeCloseTo(3 + Math.sqrt(3) / 2, 9);
        expect([other.before.signed, other.after.signed].map(Math.round)).toEqual([-60, 60]);
        for (const snippet of ['(3,0)', '(3,1)', '60^circ', '+60^circ', '-60^circ']) expect(stepHas('angle', snippet), snippet).toBe(true);
        expect(bodyOf('angle', 'sl')).toContain('Qapprox(2{,}134;0{,}5)');
        expect(bodyOf('angle', 'en')).toContain('Qapprox(2.134,0.5)');
        expect(bodyOf('angle', 'sl')).toContain('Q^{prime}approx(1{,}777;0{,}416)');
        expect(bodyOf('angle', 'en')).toContain('Q^{prime}approx(1.777,0.416)');
        expect(sectionHas('60^circ')).toBe(true);
    });

    test('the centre has no image and the panel says so', () => {
        expect(analysePoint(R2, origin)).toEqual({kind: 'centre'});
        for (const language of ['sl', 'en'] as const) {
            setLanguage(language);
            expect(t('inversion_centre_no_image')).toContain(language === 'sl' ? 'nima slike' : 'has no image');
        }
        setLanguage('en');
        expect(bodyOf('explore', 'en')).toContain('has no image: the panel says so');
        expect(bodyOf('explore', 'en')).toContain('too far to draw');
        expect(t('inversion_beyond_cap')).toBe('too far to draw');
    });

    test('the theorems are cited to FMF, Inverzija; Coxeter only as see also without section numbers; orientation reversal is stated; the drags are instances', () => {
        for (const language of ['sl', 'en'] as const) {
            const prose = [...inversionLesson.steps.map(item => bodyOf(item.id, language)), sectionPlain(language)];
            const all = prose.join(' ');
            expect(all).toContain('FMF, Inverzija');
            expect(all).not.toMatch(/Introduction to Geometry\W{0,3}(\bp\.|\bstr\.|§|\d)/u);
            expect(all).not.toMatch(/FMF, Inverzija[^.;]*(\bp\.|\bstr\.|§|\d)/u);
            for (const hit of all.matchAll(/Coxeter/gu)) expect(all.slice(Math.max(0, hit.index! - 20), hit.index!), language).toMatch(language === 'sl' ? /glej tudi H\. S\. M\. $/u : /see also H\. S\. M\. $/u);
            expect(bodyOf('angle', language)).toContain(language === 'sl' ? 'ohrani velikost kotov, a obrne njihovo usmerjenost' : 'preserves the size of angles but reverses their orientation');
            expect(sectionPlain(language)).toContain(language === 'sl' ? 'ohrani velikost kotov med krivuljama, a obrne njihovo usmerjenost' : 'preserves the size of the angle between two curves but reverses its orientation');
            // "conformal" appears only with the qualification.
            for (const hit of all.matchAll(language === 'sl' ? /konformn/gu : /conformal/gu)) {
                const around = all.slice(Math.max(0, hit.index! - 25), hit.index! + 40);
                expect(around, language).toMatch(language === 'sl' ? /ne imenujemo konformna brez tega pridržka/u : /not call it conformal without that qualification/u);
            }
            expect(bodyOf('product', language)).toMatch(language === 'sl' ? /ponazarja/u : /illustrates/u);
            expect(sectionPlain(language)).toMatch(language === 'sl' ? /primeri izrekov, ne dokazi/u : /instances of the theorems, not proofs/u);
        }
    });

    test('the section is complete, delimited, long enough, links the optional complex maps prerequisite and holds its numbers', () => {
        expect(section().id).toBe('inversion');
        expect(section().demonstrationIds).toEqual(['inversion']);
        expect(section().orderedContent!.at(-1)).toEqual({kind: 'example', exampleId: 'triangle-geometry.inversion.inversion'});
        expect(section().formula).not.toMatch(/\\[()[\]]/u);
        for (const language of ['sl', 'en'] as const) {
            const mathFreeProse = section().paragraphs.map(p => p[language]).join(' ').replace(/\\\((?:(?!\\\)).)*\\\)/gsu, ' ');
            expect(mathFreeProse).not.toMatch(/\\[A-Za-z]+/u);
            expect(mathFreeProse.trim().split(/\s+/u).length, language).toBeGreaterThanOrEqual(250);
        }
        const slMath = section().paragraphs.flatMap(p => p.sl.match(/\\\((?:(?!\\\)).)*\\\)/gsu) ?? []);
        for (const math of slMath) expect(math).not.toMatch(/\d\.\d/u);
        expect(section().paragraphs.map(p => p.en).join(' ')).not.toContain('{,}');
        for (const snippet of ['25-9=16', '2cdot8=16', '(1,1)mapsto(2,2)', '(3/2,0)', '1/2', 'x=2', 'r=4']) expect(sectionHas(snippet), snippet).toBe(true);
        // The prerequisite link points at the complex maps section whose lesson shows inversion as z -> c + r^2 / conj(z - c).
        const link = triangleGeometryChapter.prerequisiteLinks!.find(item => item.path.includes('complex-maps'))!;
        expect(link.path).toBe('/bezeg-2.0/learn/complex-maps#reciprocal-inversion');
        expect(learningChapters.some(chapter => chapter.id === 'complex-maps')).toBe(true);
        expect(complexMapsChapter.sections.some(item => item.id === 'reciprocal-inversion')).toBe(true);
        expect(complexReciprocalLesson.id).toBe('complex-reciprocal-inversion');
        expect(triangleGeometryChapter.prerequisites.en).toContain('readable without it');
        expect(triangleGeometryChapter.prerequisites.sl).toContain('razumljiv tudi brez njega');
        expect(triangleGeometryChapter.prerequisites.en).toContain('z\\mapsto c+r^2/\\overline{z-c}');
    });

    describe('scenes on the real graph', () => {
        const viewOf = (graph: InversionGraph) => [...(Reflect.get(graph, 'board') as JXG.Board).getBoundingBox()].map(Number);
        const scene = (graph: InversionGraph, checkpoint: unknown, stepId: string) => act(() => {
            const capabilities = graph.getLessonCapabilities();
            capabilities.restoreState(checkpoint as never);
            for (const action of inversionLesson.steps.find(item => item.id === stepId)!.scene!.actions as LessonAction[]) capabilities.apply(action);
        });
        const all = ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'] as const;

        test('every T5 scene sets the stated example, focus, fields and overlays, and its view holds every point it talks about, in any order', () => {
            const graph = new InversionGraph();
            mountGraph(graph);
            const checkpoint = graph.getLessonCapabilities().captureState();
            const expected: Record<string, {focus: string; example: string; shown: readonly string[]; radius: number}> = {
                power: {focus: 'power', example: 'power', shown: ['secant'], radius: 2},
                product: {focus: 'power', example: 'power', shown: ['secant', 'tangent'], radius: 2},
                image: {focus: 'point', example: 'point', shown: ['inversion-circle', 'rays'], radius: 2},
                line: {focus: 'source', example: 'through-centre', shown: ['inversion-circle', 'image'], radius: 2},
                circle: {focus: 'source', example: 'not-through-centre', shown: ['inversion-circle', 'image'], radius: 2},
                angle: {focus: 'angle', example: 'angle', shown: ['inversion-circle', 'rays', 'image', 'angle-tangents'], radius: 2},
                explore: {focus: 'point', example: 'point', shown: all, radius: 2},
            };
            expect(inversionLesson.steps.map(item => item.id)).toEqual(Object.keys(expected));
            for (const item of [...inversionLesson.steps, ...[...inversionLesson.steps].reverse()]) {
                scene(graph, checkpoint, item.id);
                const want = expected[item.id];
                expect(graph.model.points.map(p => [p.x, p.y]), item.id).toEqual([[0, 0]]);
                expect(all.filter(id => graph.overlayShown(id)), item.id).toEqual(all.filter(id => want.shown.includes(id)));
                const fields = graph.fields;
                // The product step turns the secant, so its fields no longer equal the example; the explore step is custom too.
                expect([fields.focus, fields.radius, graph.exampleId === (item.id === 'explore' || item.id === 'product' ? undefined : want.example)], item.id).toEqual([want.focus, want.radius, true]);
                const [left, top, right, bottom] = viewOf(graph);
                const margin = 0.25;
                const inside = (label: string, board: {x: number; y: number} | undefined) => {
                    expect(board, `${item.id} ${label}`).toBeDefined();
                    expect(board!.x > left + margin && board!.x < right - margin && board!.y < top - margin && board!.y > bottom + margin, `${item.id} ${label} in view`).toBe(true);
                };
                inside('C', {x: 0, y: 0});
                const view = graph.view();
                if (view.kind !== 'scene') throw new Error('expected a scene');
                if (view.power?.kind === 'power') {
                    expect(view.power.thetaDeg, item.id).toBe(item.id === 'product' ? INVERSION_THETA_TURNED : 0);
                    if (view.power.secant.kind !== 'two') throw new Error('expected a secant');
                    inside('A', view.power.secant.A);
                    inside('B', view.power.secant.B);
                    inside('circle left', {x: 2, y: 0});
                    inside('circle right', {x: 8, y: 0});
                    inside('circle top', {x: 5, y: 3});
                    inside('circle bottom', {x: 5, y: -3});
                    for (const point of view.power.tangent!.points) inside('tangency point', point);
                }
                if (view.point) {
                    if (view.point.kind === 'image') {
                        inside('X', fields.x);
                        inside('X\'', view.point.board);
                        expect([fields.x.x, fields.x.y], item.id).toEqual([3, 1]);
                    } else {
                        expect(item.id).toBe('explore');
                    }
                }
                if (view.source?.kind === 'image') {
                    const centre = view.source.board!;
                    expect(centre, item.id).toBeDefined();
                    if (centre.kind === 'circle') { inside('image centre', {x: centre.centre.re, y: centre.centre.im}); inside('image left', {x: centre.centre.re - centre.radius, y: centre.centre.im}); }
                    for (const x of item.id === 'line' ? [1, 2] : [2, 3, 4]) inside(`source ${x}`, {x, y: 0});
                    if (item.id === 'line') { inside('(2,2)', {x: 2, y: 2}); inside('(2,-2)', {x: 2, y: -2}); }
                }
                if (view.angle?.kind === 'angle') {
                    inside('Q', view.angle.point);
                    inside('Q\'', view.angle.imageBoard);
                    for (const image of view.angleImages!) if (image.kind === 'image' && image.board?.kind === 'circle') inside('angle image centre', {x: image.board.centre.re, y: image.board.centre.im});
                }
                expect([...graph.outsideView()], item.id).toEqual([]);
            }
            // Scenes in one synchronous sequence without a restore: each begins with the default scene and leaves nothing behind.
            act(() => {
                for (const item of [inversionLesson.steps[5], inversionLesson.steps[1], inversionLesson.steps[2]]) {
                    for (const action of item.scene!.actions as LessonAction[]) graph.getLessonCapabilities().apply(action);
                }
            });
            expect(graph.fields).toMatchObject({focus: 'point', radius: 2, x: {x: 3, y: 1}});
            expect(graph.fields.power.thetaDeg).toBe(0);
            expect(all.filter(id => graph.overlayShown(id))).toEqual(['inversion-circle', 'rays']);
            // The last step moves X onto the centre: the model reports no image, and the panel text exists.
            scene(graph, checkpoint, 'explore');
            expect(graph.fields.x).toEqual({x: 0, y: 0});
            expect(graph.view()).toMatchObject({kind: 'scene', point: {kind: 'centre'}});
        });

        test('the inversion actions: valid values apply, refused values throw and change nothing, and the overlay names are owned', () => {
            const graph = new InversionGraph();
            mountGraph(graph);
            const apply = (action: LessonAction) => act(() => graph.getLessonCapabilities().apply(action));
            apply({kind: 'inversion', operation: 'load-example', exampleId: 'orthogonal'});
            expect(graph.exampleId).toBe('orthogonal');
            expect(graph.fields).toMatchObject({focus: 'source', radius: 4});
            apply({kind: 'inversion', operation: 'load-example', exampleId: 'power'});
            apply({kind: 'inversion', operation: 'set-theta', degrees: 380});
            expect(graph.fields.power.thetaDeg).toBe(20);
            apply({kind: 'inversion', operation: 'set-focus', focus: 'angle'});
            expect(graph.fields.focus).toBe('angle');
            apply({kind: 'inversion', operation: 'set-x', point: {x: -4, y: 7}});
            expect(graph.fields.x).toEqual({x: -4, y: 7});
            const before = JSON.stringify(graph.state);
            const refused: LessonAction[] = [
                {kind: 'inversion', operation: 'load-example', exampleId: 'nonsense' as never},
                {kind: 'inversion', operation: 'set-focus', focus: 'nonsense' as never},
                {kind: 'inversion', operation: 'set-x', point: {x: 0.5, y: 1}},
                {kind: 'inversion', operation: 'set-x', point: {x: 11, y: 1}},
                {kind: 'inversion', operation: 'set-x', point: {x: Number.NaN, y: 1}},
                {kind: 'inversion', operation: 'set-theta', degrees: Number.NaN},
                {kind: 'inversion', operation: 'set-theta', degrees: Number.POSITIVE_INFINITY},
                {kind: 'inversion', operation: 'set-theta', degrees: '20' as never},
                {kind: 'inversion', operation: 'set-radius', radius: 3} as never,
                {kind: 'point-set', operation: 'set-overlay', overlay: 'ninepoints', visible: true},
            ];
            for (const action of refused) expect(() => apply(action), JSON.stringify(action)).toThrow();
            expect(JSON.stringify(graph.state)).toBe(before);
            for (const overlay of all) {
                apply({kind: 'point-set', operation: 'set-overlay', overlay, visible: false});
                expect(graph.overlayShown(overlay), overlay).toBe(false);
                apply({kind: 'point-set', operation: 'set-overlay', overlay, visible: true});
                expect(graph.overlayShown(overlay), overlay).toBe(true);
            }
        });
    });
});
