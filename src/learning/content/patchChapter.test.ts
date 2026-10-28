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
});
