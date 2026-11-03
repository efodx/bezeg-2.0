import {expect, test} from 'vitest';
import baseline from '../../../docs/reviews/illustrated-chapter-examples/baseline-examples.json';
import {bezierChapter} from '../content/bezierChapter';
import {familyChapters} from '../content/familyChapters';
import {getChapterGuidedExamples} from './guidedExamples';
import {exampleReferences, validateOrderedChapterContent} from './orderedContent';

const interpolationDemonstrations: Record<string, string> = {
    lagrange: 'interp-lagrange', runge: 'interp-runge', hermite: 'interp-hermite', 'least-squares': 'interp-least-squares', subdivision: 'interp-subdivision',
};

const probabilityDemonstrations: Record<string, string> = {density: 'prob-density', 'binomial-normal': 'prob-binomial-normal', clt: 'prob-clt', summary: 'prob-summary', correlation: 'prob-correlation'};

test('both published languages place every audited home exactly once in its owning section', () => {
    expect(baseline.retainedHomes).toHaveLength(56);
    for (const language of ['sl', 'en'] as const) {
        const chapters = [
            {id: 'bezier-curves', sections: bezierChapter[language].sections},
            ...familyChapters,
        ];
        expect(chapters).toHaveLength(22);
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
                    ...(chapter.id === 'triangulations-voronoi' && section.id !== 'why-triangulate' ? [`triangulations-voronoi.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'sweep-algorithms' && section.id !== 'sweep-idea' ? [`sweep-algorithms.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'numerical-methods' && section.id !== 'numerical-idea' ? [`numerical-methods.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'b-splines' && section.id !== 'bspline-idea' ? [`b-splines.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'interpolation' && section.id !== 'through-or-near' ? [`interpolation.${section.id}.${interpolationDemonstrations[section.id]}`] : []),
                    ...(chapter.id === 'probability' && section.id !== 'area-and-approximation' ? [`probability.${section.id}.${probabilityDemonstrations[section.id]}`] : []),
                    ...(chapter.id === 'projective-conics' && section.id !== 'projective-idea' ? [`projective-conics.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'fourier-series' && section.id !== 'fourier-idea' ? [`fourier-series.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'school-function-graphs' ? [`school-function-graphs.${section.id}.${section.id}`] : []),
                    ...(chapter.id === 'complex-maps' ? [`complex-maps.${section.id}.${section.id === 'roots' ? 'complex-roots' : 'complex-reciprocal'}`] : []),
                    ...(chapter.id === 'triangle-geometry' ? [`triangle-geometry.${section.id}.${(section.id === 'notable-points' ? 'triangle-centres' : section.id)}`] : []),
                ].sort();
                const references = exampleReferences<unknown>(content ?? []);
                expect([...references].sort(), `${language}/${chapter.id}/${section.id}`).toEqual(expected);
                const known = new Set(getChapterGuidedExamples(chapter.id, section.id).map(example => example.id));
                expect(validateOrderedChapterContent<unknown>(content ?? [], known)).toEqual([]);
                allReferences.push(...references);
            }
        }
        expect(allReferences).toHaveLength(114);
        expect(new Set(allReferences).size).toBe(114);
    }
});
