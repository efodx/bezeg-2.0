import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene of the Complex maps chapter, keyed by example id (M1, M2, M6 and M7). */
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
    'complex-maps.powers.complex-power': copy(
        'Število \\(z=1+i\\) kot krožec, njegova druga potenca kot romb, črta čez obe točki in črtkana enotska krožnica.',
        'The number \\(z=1+i\\) as a circle, its second power as a diamond, a line through both points and the dashed unit circle.',
        'Prikazani sta točki \\(z=1+i\\) in \\(z^2\\) pri \\(n=2\\); napovej, kje bo \\(z^3\\), preden povečaš \\(n\\).',
        'The points \\(z=1+i\\) and \\(z^2\\) are shown at \\(n=2\\); predict where \\(z^3\\) will be before you raise \\(n\\).',
    ),
    'complex-maps.euler.complex-euler': copy(
        'Točka na enotski krožnici pri kotu nič stopinj, na realni osi, s pikčasto daljico do izhodišča; romb delne vsote leži na isti točki.',
        'A point on the unit circle at the angle zero degrees, on the real axis, with a dotted segment to the origin; the diamond of the partial sum lies on the same point.',
        'Prikazan je kot \\(\\theta=0^\\circ\\) z enim členom vrste; napovej, kje bo točka pri \\(90^\\circ\\), \\(180^\\circ\\) in \\(270^\\circ\\).',
        'The angle \\(\\theta=0^\\circ\\) is shown with one term of the series; predict where the point will be at \\(90^\\circ\\), \\(180^\\circ\\) and \\(270^\\circ\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
