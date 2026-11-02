import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {learningChapters} from '../learningChapters';
import {familyChapters} from './familyChapters';
import {triangleGeometryChapter} from './triangleGeometryChapter';
import {TRIANGLE_GEOMETRY_CHAPTER_ID, triangleGeometryGuidedExampleRegistry} from './triangleGeometryChapterRegistry';
import {act} from '@testing-library/react';
import {setLanguage} from '../../localization';
import type {LessonAction, LessonDefinition} from '../model';
import {circumcircle, thalesDot, angleBetween, powerOfPoint, circlePoint} from '../../compgeo/circle';
import {Rational, RationalPoint} from '../../compgeo/rational';
import {centroid, circumcentre, circumradius, circumradiusSquared, classifyTriangle, incentre, inradius, orthocentre} from '../../compgeo/triangle';
import {analyseInscribedAngle} from '../../compgeo/inscribedAngleModel';
import {analyseNotablePoints} from '../../compgeo/notablePointsModel';
import {InscribedAngleGraph} from '../../graphs/compgeo/InscribedAngleGraph';
import {NotablePointsGraph} from '../../graphs/compgeo/NotablePointsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import {
    DEFAULT_TRIANGLE, inscribedAngleLesson, OBTUSE_TRIANGLE, OBTUSE_VIEW, RIGHT_TRIANGLE, THALES_TRIANGLE, THALES_VIEW, triangleCentresLesson,
} from './triangleGeometryChapterLessons';
import {triangleGeometryGuidedExamplePath} from './triangleGeometryChapterRegistry';

// Chapter (reading) half, owned by the F4 worker. The lesson half is a separate describe block.
describe('triangle geometry reading chapter', () => {
    const mathFree = (source: string) => source.replace(/\\\((?:(?!\\\)).)*\\\)|\\\[(?:(?!\\\]).)*\\\]/gsu, ' ');
    const words = (source: string) => mathFree(source).trim().split(/\s+/u).filter(Boolean).length;
    const sectionProse = (index: number, language: 'sl' | 'en') => triangleGeometryChapter.sections[index].paragraphs.map(p => p[language]).join(' ');

    test('is registered in family plane-geometry, advertising only T1 and T2', () => {
        expect(triangleGeometryChapter.family).toBe('plane-geometry');
        expect(triangleGeometryChapter.title).toEqual({sl: 'Geometrija trikotnika in inverzija', en: 'Triangle geometry and inversion'});
        expect(triangleGeometryChapter.sections.map(section => section.id)).toEqual(['notable-points', 'inscribed-angle']);
        expect(triangleGeometryChapter.sections.map(section => section.demonstrationIds)).toEqual([['triangle-centres'], ['inscribed-angle']]);
        expect(familyChapters.some(chapter => chapter.id === TRIANGLE_GEOMETRY_CHAPTER_ID)).toBe(true);
        expect(learningChapters.some(chapter => chapter.id === TRIANGLE_GEOMETRY_CHAPTER_ID)).toBe(true);
        // Later batches (Euler line, Simson line, inversion) are not promised as available.
        for (const language of ['sl', 'en'] as const) {
            const all = triangleGeometryChapter.sections.map((_, index) => sectionProse(index, language)).join(' ');
            expect(all).not.toMatch(language === 'sl' ? /Eulerjev|Simson|devetih točk/u : /Euler line|Simson|nine-point/u);
        }
    });

    // The Euler line Demonstration is registered in F2b; the chapter links it with its section in F4.
    test('links existing Demonstrations of the plane geometry family', () => {
        const demonstrations = getDemonstrationCatalog().demonstrations;
        for (const section of triangleGeometryChapter.sections) {
            for (const id of section.demonstrationIds ?? []) expect(demonstrations.find(demo => demo.id === id)?.family).toBe('plane-geometry');
        }
        const linked = triangleGeometryChapter.sections.flatMap(section => section.demonstrationIds ?? []);
        expect(linked.sort()).toEqual(demonstrations.filter(demo => demo.family === 'plane-geometry' && demo.id !== 'euler-line').map(demo => demo.id).sort());
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
