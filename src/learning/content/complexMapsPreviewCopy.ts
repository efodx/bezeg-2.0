import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene of the Complex maps chapter, keyed by example id (M1 and M2). */
export const complexMapsPreviewCopy = {
    'complex-maps.reciprocal-inversion.complex-reciprocal': copy(
        'Števili \\(z=1+i\\) in \\(w=2+i\\) kot puščici iz izhodišča, enotska krožnica in konjugirana vrednost \\(\\bar z=1-i\\).',
        'The numbers \\(z=1+i\\) and \\(w=2+i\\) as arrows from the origin, the unit circle and the conjugate \\(\\bar z=1-i\\).',
        'Točka \\(z=1+i\\) je zunaj enotske krožnice, \\(\\bar z\\) je njena zrcalna slika čez realno os; \\(1/z\\) v tem začetnem prizoru še ni prikazan.',
        'The point \\(z=1+i\\) is outside the unit circle and \\(\\bar z\\) is its mirror image in the real axis; \\(1/z\\) is not shown in this opening scene.',
    ),
    'complex-maps.roots.complex-roots': copy(
        'Število \\(w=2i\\) kot puščica iz izhodišča; koreni za \\(n=3\\) še niso prikazani.',
        'The number \\(w=2i\\) as an arrow from the origin; the roots for \\(n=3\\) are not shown yet.',
        'Napovej, kje ležijo rešitve \\(z^3=2i\\); koreni, trikotnik in preskusna točka v tem začetnem prizoru niso prikazani.',
        'Predict where the solutions of \\(z^3=2i\\) lie; the roots, the triangle and the test point are not shown in this opening scene.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
