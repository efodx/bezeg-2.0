import type {FamilyChapter} from './familyChapters';
import {patchBasicSections} from './patchChapterBasics';
import {patchEvaluationSections} from './patchChapterEvaluation';
import {patchJoinsTriangularSections} from './patchChapterJoinsTriangular';
import {text} from './patchChapterKit';
import {withPatchBasicExampleSequence} from './patchBasicExampleSequence';
import {getPatchGuidedExamplePreviewSource, PATCH_GUIDED_EXAMPLE_PREVIEW_FIXTURES} from '../chapter/guidedExamplePreviews';
import {patchGuidedPreviewCopy} from './patchGuidedPreviewCopy';

/** The Bézier patches chapter has eleven sections (spec), more than the generic family-chapter cap. */
export const patchChapterSectionIds = [
    'curve-to-patch', 'bilinear-patch', 'control-net', 'boundary-iso-curves', 'tensor-decasteljau', 'properties',
    'tensor-derivatives', 'tensor-subdivision', 'tensor-joins', 'triangular-patches', 'square-vs-triangular',
] as const;

export const patchChapter: FamilyChapter = {
    id: 'bezier-patches',
    family: '/bezeg-2.0/patches',
    title: text('Bézierjeve krpe', 'Bézier patches'),
    purpose: text('Bézierjeva krpa je ploskev z dvema parametroma, ki jo, tako kot Bézierjevo krivuljo, oblikujemo s kontrolnimi točkami. Poglavje gradi od bilinearne krpe prek tenzorske definicije, de Casteljauja, odvodov in subdivizije do spajanja krp in trikotnih Bézierjevih krp. Vsak razdelek poda merljiv izid in primer, ki ga lahko preračunaš sam.', 'A Bézier patch is a surface with two parameters, shaped by control points just as a Bézier curve is. The chapter builds from the bilinear patch through the tensor definition, de Casteljau, derivatives and subdivision to joining patches and triangular Bézier patches. Each section states a measurable outcome and an example you can recompute yourself.'),
    prerequisites: text('Bézierjeve krivulje: kontrolni poligon, Bernsteinove uteži, de Casteljau, višanje stopnje ter zveznost \\(C^0\\), \\(C^1\\) in geometrijska zveznost \\(G^1\\). Poglavje o njih je na /bezeg-2.0/learn/bezier-curves.', 'Bézier curves: control polygon, Bernstein weights, de Casteljau, degree elevation, and continuity \\(C^0\\), \\(C^1\\) and geometric continuity \\(G^1\\). The chapter on them is at /bezeg-2.0/learn/bezier-curves.'),
    sections: [...patchBasicSections, ...patchEvaluationSections, ...patchJoinsTriangularSections]
        .map(section => {
            const fixture = PATCH_GUIDED_EXAMPLE_PREVIEW_FIXTURES.find(item => item.sectionId === section.id);
            const src = fixture && getPatchGuidedExamplePreviewSource(fixture.id);
            if (!fixture || !src) return section;
            const copy = patchGuidedPreviewCopy[section.id as keyof typeof patchGuidedPreviewCopy];
            return {
                ...section,
                figures: [...(section.figures ?? []), {src, alt: copy.alt, caption: copy.caption}],
            };
        })
        .map(withPatchBasicExampleSequence),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/bezier-curves', title: text('Bézierjeve krivulje', 'Bézier curves')}],
};
