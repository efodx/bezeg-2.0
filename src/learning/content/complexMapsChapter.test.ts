import {beforeEach, describe, expect, test, vi} from 'vitest';
import {complexArgument, complexModulus, complexMultiply, type Complex} from '../../analysis/complex';
import {circleInversion} from '../../analysis/complexMobius';
import {complexConjugate, complexDivide, complexReciprocal, unitCircleInversion} from '../../analysis/complexReciprocal';
import {complexIntegerPower, solvesRootEquation} from '../../analysis/complexRootsModel';
import {nthRoots} from '../../analysis/complexRoots';
import {ComplexReciprocalGraph} from '../../graphs/complex/ComplexReciprocalGraph';
import {ComplexRootsGraph} from '../../graphs/complex/ComplexRootsGraph';
import {setLanguage} from '../../localization';
import {complexReciprocalLesson, complexRootsLesson} from './complexMapsChapterLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {LessonDefinition} from '../model';
import {getDemonstrationCatalog} from '../../demonstrations';
import {learningChapters} from '../learningChapters';
import {familyChapters} from './familyChapters';
import {complexMapsChapter} from './complexMapsChapter';
import {COMPLEX_MAPS_CHAPTER_ID, complexMapsGuidedExampleRegistry} from './complexMapsChapterRegistry';

// Chapter (reading) half, owned by the F4 worker. The lesson half is a separate describe block.
describe('complex maps reading chapter', () => {
    const mathFree = (source: string) => source.replace(/\\\((?:(?!\\\)).)*\\\)|\\\[(?:(?!\\\]).)*\\\]/gsu, ' ');
    const words = (source: string) => mathFree(source).trim().split(/\s+/u).filter(Boolean).length;

    test('is registered after the linear maps chapter, in family maps, advertising only M1 and M2', () => {
        const ids = familyChapters.map(chapter => chapter.id);
        expect(ids.indexOf(COMPLEX_MAPS_CHAPTER_ID)).toBe(ids.indexOf('linear-maps') + 1);
        expect(complexMapsChapter.family).toBe('maps');
        expect(complexMapsChapter.title).toEqual({sl: 'Kompleksne preslikave', en: 'Complex maps'});
        expect(complexMapsChapter.sections.map(section => section.id)).toEqual(['reciprocal-inversion', 'roots']);
        expect(complexMapsChapter.sections.map(section => section.demonstrationIds)).toEqual([['complex-reciprocal'], ['complex-roots']]);
        expect(learningChapters.some(chapter => chapter.id === COMPLEX_MAPS_CHAPTER_ID)).toBe(true);
    });

    test('links existing Demonstrations and a real prerequisite chapter', () => {
        const demonstrations = getDemonstrationCatalog().demonstrations;
        for (const section of complexMapsChapter.sections) {
            for (const id of section.demonstrationIds ?? []) expect(demonstrations.some(demo => demo.id === id)).toBe(true);
        }
        for (const link of complexMapsChapter.prerequisiteLinks ?? []) {
            const target = link.path.replace('/bezeg-2.0/learn/', '');
            expect(learningChapters.some(chapter => chapter.id === target)).toBe(true);
        }
        expect(complexMapsChapter.prerequisiteLinks?.length).toBeGreaterThan(0);
    });

    test('puts each section example at its end and keeps both languages complete', () => {
        for (const section of complexMapsChapter.sections) {
            const sectionId = section.id as keyof typeof complexMapsGuidedExampleRegistry;
            expect(section.orderedContent!.at(-1)).toEqual({
                kind: 'example',
                exampleId: `${COMPLEX_MAPS_CHAPTER_ID}.${sectionId}.${complexMapsGuidedExampleRegistry[sectionId].demonstrationId}`,
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
                complexMapsChapter.purpose[language], complexMapsChapter.prerequisites[language],
                ...complexMapsChapter.sections.flatMap(section => [section.title[language], ...section.paragraphs.map(p => p[language])]),
            ].join(' ');
            expect(words(prose), language).toBeGreaterThanOrEqual(450);
        }
    });

    test('wraps symbols in math delimiters and cites the fundamental theorem and Vieta without proof', () => {
        for (const language of ['sl', 'en'] as const) {
            for (const section of complexMapsChapter.sections) {
                for (const paragraph of section.paragraphs) expect(mathFree(paragraph[language])).not.toMatch(/\\[A-Za-z]+/u);
                expect(section.formula).not.toMatch(/\\[()[\]]/u);
            }
            const roots = complexMapsChapter.sections[1].paragraphs.map(p => p[language]).join(' ');
            expect(roots).toMatch(language === 'sl' ? /osnovnega izreka algebre/u : /fundamental theorem of algebra/u);
            expect(roots).toMatch(language === 'sl' ? /Vietove/u : /Vieta/u);
        }
    });
});

// Lesson (activity) half, owned by the F3 worker. The chapter half above is a separate describe block.
describe('complex maps lessons (M1 and M2)', () => {
    beforeEach(() => setLanguage('sl'));

    const plain = (text: string) => text.split(String.fromCharCode(92)).join('');
    const prose = (lesson: LessonDefinition, language: 'sl' | 'en') =>
        plain([lesson.summary[language], ...lesson.steps.flatMap(item => [item.body[language], item.prompt![language]])].join(' '));
    /** True when the snippet (written with a decimal point) occurs in both languages, with a decimal comma in the Slovenian one. */
    const stated = (lesson: LessonDefinition, snippet: string) =>
        prose(lesson, 'en').includes(snippet) && prose(lesson, 'sl').includes(snippet.split('.').join('{,}'));
    const bodyOf = (lesson: LessonDefinition, stepId: string, language: 'sl' | 'en') => plain(lesson.steps.find(item => item.id === stepId)!.body[language]);
    const statedIn = (lesson: LessonDefinition, stepId: string, snippet: string) =>
        bodyOf(lesson, stepId, 'en').includes(snippet) && bodyOf(lesson, stepId, 'sl').includes(snippet.split('.').join('{,}'));
    const close = (a: Complex, b: Complex, tolerance = 1e-12) => {
        expect(Math.abs(a.re - b.re)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(a.im - b.im)).toBeLessThanOrEqual(tolerance);
    };
    const degrees = (radians: number) => radians * 180 / Math.PI;
    /** The angle between two principal arguments in degrees, in (-180, 180]. */
    const turn = (a: number, b: number) => {
        let d = degrees(a - b);
        while (d > 180) d -= 360;
        while (d <= -180) d += 360;
        return d;
    };

    function fakeBoard() {
        const board: any = {
            objectsList: [] as any[], unitX: 50, canvasWidth: 700,
            create: vi.fn((type: string, parents: any[], attributes: any) => {
                const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
                if (type === 'point') {
                    const free = parents.every((parent: unknown) => typeof parent === 'number');
                    object.x = free ? parents[0] : undefined;
                    object.y = free ? parents[1] : undefined;
                    object.X = () => (free ? object.x : parents[0]());
                    object.Y = () => (free ? object.y : parents[1]());
                    object.moveTo = vi.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                    object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
                }
                board.objectsList.push(object);
                return object;
            }),
            removeObject: vi.fn(),
            getBoundingBox: vi.fn(() => [-4.5, 4.5, 4.5, -4.5]), setBoundingBox: vi.fn(), fullUpdate: vi.fn(), update: vi.fn(),
        };
        return board;
    }

    /** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
    function makeGraph(Graph: new () => any) {
        const graph = new Graph();
        graph.board = fakeBoard();
        const session: any = {
            isReady: true, isAlive: true, dispose: vi.fn(), signal: new AbortController().signal,
            waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
        };
        graph.graphSession = session;
        graph.boardUpdate = vi.fn();
        graph.initialize();
        return graph;
    }

    const runStep = (graph: any, lesson: LessonDefinition, stepId: string) => {
        const found = lesson.steps.find(item => item.id === stepId);
        if (!found?.scene) throw new Error(`The lesson ${lesson.id} has no scene step ${stepId}.`);
        for (const action of found.scene.actions) graph.applyLessonAction(action);
    };

    const z1: Complex = {re: 1, im: 1};
    const sumOf = (points: readonly Complex[]) => points.reduce((acc, point) => ({re: acc.re + point.re, im: acc.im + point.im}), {re: 0, im: 0});
    const productOf = (points: readonly Complex[]) => points.reduce((acc, point) => complexMultiply(acc, point), {re: 1, im: 0});
    const rootsOf = (w: Complex, n: number) => {
        const result = nthRoots(w, n);
        if (result.kind !== 'roots') throw new Error('expected roots');
        return result;
    };
    const roundedDegrees = (w: Complex, n: number) => rootsOf(w, n).roots.map(root => Math.round(degrees(root.argument)));

    test('both lessons are owned by their sections, are complete in both languages and every step has a scene', () => {
        expect(getChapterOwnedLessons('complex-maps')?.lesson('reciprocal-inversion')).toBe(complexReciprocalLesson);
        expect(getChapterOwnedLessons('complex-maps')?.lesson('roots')).toBe(complexRootsLesson);
        expect(complexReciprocalLesson.demonstrationId).toBe('complex-reciprocal');
        expect(complexRootsLesson.demonstrationId).toBe('complex-roots');
        expect(complexReciprocalLesson.id).toBe('complex-reciprocal-inversion');
        expect(complexRootsLesson.id).toBe('complex-roots-polygon');
        for (const lesson of [complexReciprocalLesson, complexRootsLesson]) {
            expect(lesson.steps.length).toBeGreaterThanOrEqual(7);
            for (const text of [lesson.title, lesson.summary]) { expect(text.sl.length).toBeGreaterThan(20); expect(text.en.length).toBeGreaterThan(20); }
            for (const item of lesson.steps) {
                for (const text of [item.title, item.body, item.prompt!]) { expect(text.sl.length).toBeGreaterThan(5); expect(text.en.length).toBeGreaterThan(5); }
                expect(item.scene?.actions[0]).toMatchObject({kind: 'prepared-scene', source: 'demonstration-default'});
            }
        }
    });

    test('M1 checked values: reciprocal, conjugate, unit circle, division and the prose that states them', () => {
        const recip = (z: Complex) => complexReciprocal(z)!;
        close(recip(z1), {re: 0.5, im: -0.5});
        close(complexConjugate(z1), {re: 1, im: -1});
        expect(complexModulus(z1)).toBeCloseTo(Math.SQRT2, 12);
        expect(degrees(complexArgument(z1)!)).toBeCloseTo(45, 10);
        expect(degrees(complexArgument(recip(z1))!)).toBeCloseTo(-45, 10);
        expect(complexModulus(recip(z1))).toBeCloseTo(0.7071, 4);
        for (const snippet of ['0.5-0.5i', '1.4142', '0.7071', '45^', '-45^']) expect(stated(complexReciprocalLesson, snippet), snippet).toBe(true);

        const inside = {re: 0.5, im: 0.5};
        close(recip(inside), {re: 1, im: -1});
        expect(complexModulus(inside)).toBeCloseTo(0.7071, 4);
        expect(complexModulus(recip(inside))).toBeCloseTo(1.4142, 4);
        expect(stated(complexReciprocalLesson, '0.5+0.5i')).toBe(true);

        const onCircle = {re: 0.6, im: 0.8};
        close(recip(onCircle), complexConjugate(onCircle));
        close(recip(onCircle), {re: 0.6, im: -0.8});
        expect(stated(complexReciprocalLesson, '0.6-0.8i')).toBe(true);

        const quotient = complexDivide({re: 2, im: 1}, {re: 1, im: -1})!;
        close(quotient, {re: 0.5, im: 1.5});
        close(complexMultiply({re: 2, im: 1}, recip({re: 1, im: -1})), quotient);
        expect(stated(complexReciprocalLesson, '0.5+1.5i')).toBe(true);
    });

    test('M1 inversion: 1/z is the conjugate of the unit-circle inversion over a grid, and circle inversion is an orientation-reversing involution', () => {
        for (let a = -40; a <= 40; a++) {
            for (let b = -40; b <= 40; b++) {
                if (a === 0 && b === 0) continue;
                const z = {re: a * 0.05, im: b * 0.05};
                close(complexReciprocal(z)!, complexConjugate(unitCircleInversion(z)!));
            }
        }
        close(unitCircleInversion(z1)!, {re: 0.5, im: 0.5});
        close(complexConjugate(unitCircleInversion(z1)!), {re: 0.5, im: -0.5});
        const centre = {re: 0.5, im: 0}, z = {re: 1.5, im: 1};
        const image = circleInversion(z, centre, 1);
        expect(image.kind).toBe('point');
        if (image.kind === 'point') {
            close(image.point, {re: 1, im: 0.5});
            const again = circleInversion(image.point, centre, 1);
            expect(again.kind).toBe('point');
            if (again.kind === 'point') close(again.point, z);
        }
        expect(stated(complexReciprocalLesson, '1+0.5i')).toBe(true);
        // The angle from direction 1 to direction i at 0.5+0.5i, measured between the image directions, is -90 degrees.
        const at = {re: 0.5, im: 0.5}, h = 1e-6;
        const imageOf = (p: Complex) => (circleInversion(p, {re: 0, im: 0}, 1) as { point: Complex }).point;
        const base = imageOf(at);
        const d1 = imageOf({re: at.re + h, im: at.im}), d2 = imageOf({re: at.re, im: at.im + h});
        const dir1 = {re: d1.re - base.re, im: d1.im - base.im}, dir2 = {re: d2.re - base.re, im: d2.im - base.im};
        expect(degrees(complexArgument(dir2)! - complexArgument(dir1)!)).toBeCloseTo(-90, 3);
        expect(stated(complexReciprocalLesson, '-90^')).toBe(true);
    });

    const noReveals = {reciprocalVisible: false, quotientVisible: false, circleVisible: false};
    const reciprocalExpectations: Record<string, object> = {
        conjugate: {example: 'outside', zRe: 1, zIm: 1, wRe: 2, wIm: 1, ...noReveals},
        reciprocal: {example: 'outside', zRe: 1, zIm: 1, ...noReveals, reciprocalVisible: true},
        'inside-outside': {example: 'inside', zRe: 0.5, zIm: 0.5, ...noReveals, reciprocalVisible: true},
        'on-circle': {example: 'unit-circle', zRe: 0.6, zIm: 0.8, ...noReveals, reciprocalVisible: true},
        division: {example: 'division', zRe: 1, zIm: -1, wRe: 2, wIm: 1, reciprocalVisible: true, quotientVisible: true, circleVisible: false},
        'inversion-circle': {example: 'outside', zRe: 1.5, zIm: 1, centreRe: 0.5, centreIm: 0, radius: 1, ...noReveals, circleVisible: true},
        explore: {example: 'outside', zRe: 1, zIm: 1, reciprocalVisible: true, quotientVisible: true, circleVisible: true},
    };

    test('every M1 scene applied in one synchronous sequence sets exactly the stated model, in any order', () => {
        expect(complexReciprocalLesson.steps.map(item => item.id)).toEqual(Object.keys(reciprocalExpectations));
        for (const item of complexReciprocalLesson.steps) {
            const fresh = makeGraph(ComplexReciprocalGraph);
            runStep(fresh, complexReciprocalLesson, item.id);
            expect(fresh.model, item.id).toMatchObject(reciprocalExpectations[item.id]);
        }
        // One graph, all scenes in a row and then backwards: each scene ends in its own state, with nothing left over.
        const graph = makeGraph(ComplexReciprocalGraph);
        for (const item of [...complexReciprocalLesson.steps, ...[...complexReciprocalLesson.steps].reverse()]) {
            runStep(graph, complexReciprocalLesson, item.id);
            expect(graph.model, item.id).toMatchObject(reciprocalExpectations[item.id]);
        }
    });

    test('M2 checked roots for w = 2i and n = 3 and the prose that states them', () => {
        const result = rootsOf({re: 0, im: 2}, 3);
        const radius = Math.cbrt(2);
        expect(result.radius).toBeCloseTo(radius, 12);
        expect(radius).toBeCloseTo(1.26, 2);
        const cos = Math.cos(Math.PI / 6), sin = Math.sin(Math.PI / 6);
        const expected = [{re: radius * cos, im: radius * sin}, {re: -radius * cos, im: radius * sin}, {re: 0, im: -radius}];
        result.roots.forEach((root, k) => close(root.point, expected[k]));
        expect(result.roots[0].point.re).toBeCloseTo(1.0911, 4);
        expect(result.roots[0].point.im).toBeCloseTo(0.63, 2);
        expect(roundedDegrees({re: 0, im: 2}, 3)).toEqual([30, 150, -90]);
        for (const root of result.roots) close(complexIntegerPower(root.point, 3), {re: 0, im: 2}, 2e-12);
        close(sumOf(result.roots.map(root => root.point)), {re: 0, im: 0});
        close(productOf(result.roots.map(root => root.point)), {re: 0, im: 2});
        for (const snippet of ['1.0911+0.63i', '-1.0911+0.63i', '-1.26i', '1.26']) expect(stated(complexRootsLesson, snippet), snippet).toBe(true);
        expect(statedIn(complexRootsLesson, 'polygon', '(-1)^{n+1}w')).toBe(true);
    });

    test('M2 second example, rotation by a third, sixth and fourth roots of unity, and w = 0', () => {
        const second = rootsOf({re: 1, im: 1}, 3), first = rootsOf({re: 0, im: 2}, 3);
        expect(second.radius).toBeCloseTo(Math.pow(2, 1 / 6), 12);
        expect(second.radius).toBeCloseTo(1.1225, 4);
        expect(roundedDegrees({re: 1, im: 1}, 3)).toEqual([15, 135, -105]);
        expect(turn(second.roots[0].argument, first.roots[0].argument)).toBeCloseTo(-15, 10);
        expect(turn(second.argument, first.argument)).toBeCloseTo(-45, 10);
        for (const snippet of ['1.1225', '15^', '135^', '-105^', '-45^']) expect(stated(complexRootsLesson, snippet), snippet).toBe(true);

        for (const n of [6, 4]) {
            const unity = rootsOf({re: 1, im: 0}, n);
            const points = unity.roots.map(root => root.point);
            close(sumOf(points), {re: 0, im: 0});
            close(productOf(points), {re: Math.pow(-1, n + 1), im: 0});
            expect(Math.pow(-1, n + 1)).toBe(-1);
            for (const point of points) expect(solvesRootEquation(point, {re: 1, im: 0}, n)).toBe(true);
        }
        expect(roundedDegrees({re: 1, im: 0}, 6)).toEqual([0, 60, 120, 180, -120, -60]);
        [{re: 1, im: 0}, {re: 0, im: 1}, {re: -1, im: 0}, {re: 0, im: -1}].forEach((expectedRoot, k) => close(rootsOf({re: 1, im: 0}, 4).roots[k].point, expectedRoot));
        expect(nthRoots({re: 0, im: 0}, 5)).toMatchObject({kind: 'zero', multiplicity: 5, root: {re: 0, im: 0}});
    });

    test('M2 ordering follows the principal argument and jumps across the negative real axis while the set of roots does not', () => {
        const exact = rootsOf({re: -1, im: 0}, 3);
        expect(exact.argument).toBe(Math.PI);
        expect(roundedDegrees({re: -1, im: 0}, 3)).toEqual([60, 180, -60]);

        const above = rootsOf({re: -8, im: 1e-12}, 3), below = rootsOf({re: -8, im: -1e-12}, 3);
        above.roots.forEach((root, k) => expect(turn(root.argument, [60, 180, -60][k] * Math.PI / 180)).toBeCloseTo(0, 6));
        below.roots.forEach((root, k) => expect(turn(root.argument, [-60, 60, -180][k] * Math.PI / 180)).toBeCloseTo(0, 6));
        // The labels differ but every root above is a root below to within 1e-11 (the set is the same).
        for (const root of above.roots) {
            const nearest = Math.min(...below.roots.map(other => Math.hypot(other.point.re - root.point.re, other.point.im - root.point.im)));
            expect(nearest).toBeLessThan(1e-11);
        }
        // The grid value the scene opens with, w = -1 + 0.05i, and the other side of the axis.
        rootsOf({re: -1, im: 0.05}, 3).roots.forEach((root, k) => expect(Math.abs(turn(root.argument, [60, 180, -60][k] * Math.PI / 180))).toBeLessThan(1.5));
        rootsOf({re: -1, im: -0.05}, 3).roots.forEach((root, k) => expect(Math.abs(turn(root.argument, [-60, 60, -180][k] * Math.PI / 180))).toBeLessThan(1.5));
        for (const snippet of ['60^', '180^', '-60^', '-180^']) expect(stated(complexRootsLesson, snippet), snippet).toBe(true);
    });

    const hidden = {rootsVisible: false, polygonVisible: false, testVisible: false};
    const rootsExpectations: Record<string, object> = {
        'cube-rotates': {example: 'two-i', wRe: 0, wIm: 2, degree: 3, ...hidden},
        'find-roots': {example: 'two-i', wRe: 0, wIm: 2, degree: 3, zRe: 1.1, zIm: 0.65, rootsVisible: true, polygonVisible: false, testVisible: true},
        polygon: {example: 'two-i', wRe: 0, wIm: 2, degree: 3, rootsVisible: true, polygonVisible: true, testVisible: false},
        'rotate-w': {example: 'one-plus-i', wRe: 1, wIm: 1, degree: 3, rootsVisible: true, polygonVisible: true, testVisible: false},
        'change-n': {example: 'unity', wRe: 1, wIm: 0, degree: 6, rootsVisible: true, polygonVisible: true, testVisible: false},
        labelling: {example: 'negative-real', wRe: -1, wIm: 0.05, degree: 3, rootsVisible: true, polygonVisible: true, testVisible: false},
        explore: {example: 'two-i', wRe: 0, wIm: 2, degree: 3, rootsVisible: true, polygonVisible: true, testVisible: true},
    };

    test('every M2 scene applied in one synchronous sequence sets exactly the stated model, in any order', () => {
        expect(complexRootsLesson.steps.map(item => item.id)).toEqual(Object.keys(rootsExpectations));
        for (const item of complexRootsLesson.steps) {
            const fresh = makeGraph(ComplexRootsGraph);
            runStep(fresh, complexRootsLesson, item.id);
            expect(fresh.model, item.id).toMatchObject(rootsExpectations[item.id]);
        }
        const graph = makeGraph(ComplexRootsGraph);
        for (const item of [...complexRootsLesson.steps, ...[...complexRootsLesson.steps].reverse()]) {
            runStep(graph, complexRootsLesson, item.id);
            expect(graph.model, item.id).toMatchObject(rootsExpectations[item.id]);
        }
        // The test point of the find-roots scene is near a root but is not one.
        expect(solvesRootEquation({re: 1.1, im: 0.65}, {re: 0, im: 2}, 3)).toBe(false);
    });
});
