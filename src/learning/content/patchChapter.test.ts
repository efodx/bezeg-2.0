import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {guidedLessonOwners} from '../chapter/guidedLessonOwnership';
import {familyChapters} from './familyChapters';
import {learningChapters} from '../learningChapters';
import {patchChapter, patchChapterSectionIds} from './patchChapter';

describe('Bézier patches chapter', () => {
    test('has eleven sections in spec order with the reserved ids', () => {
        expect(patchChapter.sections.map(section => section.id)).toEqual([...patchChapterSectionIds]);
        expect(patchChapterSectionIds).toHaveLength(11);
        for (const [demo, sectionId] of [
            ['patch-tensor', 'curve-to-patch'], ['patch-decasteljau', 'tensor-decasteljau'], ['patch-derivatives', 'tensor-derivatives'],
            ['patch-subdivision', 'tensor-subdivision'], ['patch-joins', 'tensor-joins'], ['patch-triangular', 'triangular-patches'],
        ] as const) {
            expect(guidedLessonOwners[demo]).toMatchObject({chapterId: 'bezier-patches', sectionId});
        }
    });

    test('is registered after parametrization, with Bézier curves as prerequisite, and links existing demonstrations', () => {
        const ids = familyChapters.map(chapter => chapter.id);
        expect(ids.indexOf('bezier-patches')).toBe(ids.indexOf('parametrization') + 1);
        expect(learningChapters.some(chapter => chapter.id === 'bezier-patches')).toBe(true);
        expect(patchChapter.family).toBe('/bezeg-2.0/patches');
        expect(patchChapter.prerequisites.sl).toContain('bezier-curves');
        expect(patchChapter.prerequisites.en).toContain('bezier-curves');
        const catalog = getDemonstrationCatalog().demonstrations;
        for (const section of patchChapter.sections) {
            expect(section.demonstrationIds?.length, section.id).toBeGreaterThan(0);
            for (const id of section.demonstrationIds ?? []) {
                expect(catalog.find(demo => demo.id === id)?.family, `${section.id}/${id}`).toBe('/bezeg-2.0/patches');
                expect(section.investigationPrompts?.[id], `${section.id}/${id} prompt`).toBeDefined();
            }
            expect(section.paragraphs.length).toBeGreaterThan(0);
        }
    });

    test('has no example blocks before the guided frames and keeps figure text bilingual', () => {
        for (const section of familyChapters.find(chapter => chapter.id === 'bezier-patches')!.sections) {
            expect(section.orderedContent?.some(block => block.kind === 'example')).toBe(false);
            for (const figure of section.figures ?? []) {
                for (const language of ['sl', 'en'] as const) {
                    expect(figure.alt[language].trim()).not.toBe('');
                    expect(figure.caption[language].trim()).not.toBe('');
                }
            }
        }
    });

    test('authored sections 1 to 4 state outcomes and recompute their worked numbers', () => {
        const basics = patchChapter.sections.slice(0, 4);
        for (const section of basics) {
            expect(section.paragraphs[0].sl).toMatch(/^Cilj razdelka:/u);
            expect(section.paragraphs[0].en).toMatch(/^Learning outcome:/u);
        }
        const bernstein = (n: number, i: number, t: number) => [[1], [1, 1], [1, 2, 1]][n][i] * t ** i * (1 - t) ** (n - i);
        const wu = [0, 1, 2].map(i => bernstein(2, i, 0.25) * 16);
        expect(wu).toEqual([9, 6, 1]);
        const wv = [0, 1, 2].map(i => bernstein(2, i, 0.5));
        expect(wv).toEqual([0.25, 0.5, 0.25]);
        expect(wu.reduce((a, b) => a + b) / 16 * wv.reduce((a, b) => a + b)).toBe(1);
        const q1 = bernstein(2, 1, 0.5) * 4;
        expect(q1).toBe(2);
        expect(0.25 * 0 + 0.5 * q1 + 0.25 * 0).toBe(1);
        const bilinear = (u: number, v: number) => [u * (1 - v) + u * v, (1 - u) * v + u * v, u * v];
        expect(bilinear(0.5, 0.5)).toEqual([0.5, 0.5, 0.25]);
    });

    test('explains iso-curve boundary exceptions and the limited variation-diminishing counterexample', () => {
        const byId = (id: string) => patchChapter.sections.find(section => section.id === id)!;
        const isoCurve = byId('boundary-iso-curves').paragraphs.map(paragraph => paragraph.sl).join(' ');
        const isoCurveEn = byId('boundary-iso-curves').paragraphs.map(paragraph => paragraph.en).join(' ');
        expect(isoCurve).toMatch(/praviloma/u);
        expect(isoCurve).toContain('u=0');
        expect(isoCurve).toContain('u=1');
        expect(isoCurveEn).toMatch(/generally/u);
        expect(isoCurveEn).toContain('u=0');
        expect(isoCurveEn).toContain('u=1');

        const properties = byId('properties').paragraphs;
        const sl = properties.map(paragraph => paragraph.sl).join(' ');
        const en = properties.map(paragraph => paragraph.en).join(' ');
        for (const prose of [sl, en]) {
            expect(prose).toContain('P_{00}=(0,0,1)');
            expect(prose).toContain('P_{01}=(0,1,-1)');
            expect(prose).toContain('P_{10}=(1,0,-1)');
            expect(prose).toContain('P_{11}=(1,1,1)');
            expect(prose).toContain('S(u,v)=(u,v,(1-2u)(1-2v))');
            expect(prose).toContain('t\\in\\mathbb R');
            expect(prose).toContain('tfrac12,\\tfrac12,0');
            expect(prose).toContain('1\\le0');
        }
        expect(en).toContain('control-net wireframe');
        expect(en).toContain('planar Bézier curve');
        expect(en).toContain('does not rule out every possible bivariate formulation');
        expect(sl).toContain('žično kontrolno mrežo');
        expect(sl).toContain('ravninsko Bézierjevo krivuljo');
        expect(sl).toContain('ne izključuje vseh mogočih dvorazsežnih različic');
    });

    test('the explicit bilinear saddle gives one line-patch intersection and no line-net intersections', () => {
        const saddle = (u: number, v: number): [number, number, number] => [u, v, (1 - 2 * u) * (1 - 2 * v)];
        const linePoint: [number, number, number] = [0.5, 0.5, 0];
        expect(saddle(0.5, 0.5)).toEqual(linePoint);

        // x=u and y=v force the only possible patch parameter pair on this vertical line.
        const net: [number, number, number][] = [[0, 0, 1], [0, 1, -1], [1, 0, -1], [1, 1, 1]];
        const netEdges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3]];
        for (const [a, b] of netEdges) {
            const first = net[a];
            const second = net[b];
            // Each net edge fixes x or y to 0 or 1, so cannot reach x=y=1/2 on the line.
            expect(first[0] === second[0] && (first[0] === 0 || first[0] === 1)
                || first[1] === second[1] && (first[1] === 0 || first[1] === 1)).toBe(true);
        }
    });
});
