import {expect, test} from 'vitest';
import baseline from '../../../docs/reviews/illustrated-chapter-examples/baseline-examples.json';
import {bezierChapter} from '../content/bezierChapter';
import {familyChapters} from '../content/familyChapters';
import {getChapterGuidedExamples} from './guidedExamples';
import {exampleReferences, validateOrderedChapterContent} from './orderedContent';

test('both published languages place every audited home exactly once in its owning section', () => {
    expect(baseline.retainedHomes).toHaveLength(56);
    for (const language of ['sl', 'en'] as const) {
        const chapters = [
            {id: 'bezier-curves', sections: bezierChapter[language].sections},
            ...familyChapters,
        ];
        expect(chapters).toHaveLength(13);
        const allReferences: string[] = [];
        for (const chapter of chapters) {
            for (const section of chapter.sections) {
                const content = section.orderedContent;
                expect(content, `${language}/${chapter.id}/${section.id}: authored sequence`).toBeDefined();
                const expected = [
                    ...baseline.retainedHomes.filter(home => home.retainedKey.startsWith(chapter.id + '.' + section.id + '.')).map(home => home.retainedKey),
                    ...(chapter.id === 'bezier-patches' ? [
                        'curve-to-patch.patch-tensor', 'bilinear-patch.patch-tensor', 'control-net.patch-tensor',
                        'boundary-iso-curves.patch-tensor', 'tensor-decasteljau.patch-decasteljau', 'properties.patch-tensor',
                        'tensor-derivatives.patch-derivatives', 'tensor-subdivision.patch-subdivision', 'tensor-joins.patch-joins',
                        'triangular-patches.patch-triangular', 'square-vs-triangular.patch-triangular',
                    ].filter(id => id.startsWith(`${section.id}.`)).map(id => `bezier-patches.${id}`) : []),
                    ...(chapter.id === 'linear-maps' ? [`linear-maps.${section.id}.linear-map`] : []),
                    ...(chapter.id === 'convexity-hulls' && section.id !== 'why-hulls' ? [`convexity-hulls.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'complex-maps' ? [`complex-maps.${section.id}.${section.id === 'roots' ? 'complex-roots' : 'complex-reciprocal'}`] : []),
                    ...(chapter.id === 'triangle-geometry' ? [`triangle-geometry.${section.id}.${section.id === 'notable-points' ? 'triangle-centres' : 'inscribed-angle'}`] : []),
                ].sort();
                const references = exampleReferences<unknown, unknown>(content ?? []);
                expect([...references].sort(), `${language}/${chapter.id}/${section.id}`).toEqual(expected);
                const known = new Set(getChapterGuidedExamples(chapter.id, section.id).map(example => example.id));
                expect(validateOrderedChapterContent<unknown, unknown>(content ?? [], known)).toEqual([]);
                allReferences.push(...references);
            }
        }
        expect(allReferences).toHaveLength(76);
        expect(new Set(allReferences).size).toBe(76);
    }
});
