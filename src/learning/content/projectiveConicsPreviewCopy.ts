import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Projective conics lesson (K1 to K3), keyed by example id. */
export const projectiveConicsPreviewCopy = {
    'projective-conics.projective-cross-ratio.projective-cross-ratio': copy(
        'Vodoravna premica s točkami A, B, C, D, središče O nad njo, poševna druga premica in črtkani žarki iz O, ki sekajo drugo premico v slikah A\', B\', C\', D\'.',
        'A horizontal line with the points A, B, C, D, the centre O above it, a slanted second line and dashed rays from O that meet the second line at the images A\', B\', C\', D\'.',
        'Središče \\(O=(0,5)\\) projicira točke \\(A,B,C,D\\) s premice \\(y=0\\) (abscise \\(0,1,3,4\\)) na premico \\(y=1+\\tfrac x2\\); slika točke \\(A\\) je \\((0,1)\\).',
        'The centre \\(O=(0,5)\\) projects the points \\(A,B,C,D\\) of the line \\(y=0\\) (abscissae \\(0,1,3,4\\)) onto the line \\(y=1+\\tfrac x2\\); the image of \\(A\\) is \\((0,1)\\).',
    ),
    'projective-conics.projective-pascal.projective-pascal': copy(
        'Elipsa s šestimi točkami, šest stranic šestkotnika in premica p skozi dve prikazani presečišči nasprotnih stranic.',
        'An ellipse with six points, the six sides of the hexagon and the line p through the two shown intersections of opposite sides.',
        'Šest točk \\(A,\\dots,F\\) na elipsi \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) določa šestkotnik; presečišča nasprotnih stranic ležijo na eni premici \\(p\\), tretje je zunaj prikazanega območja.',
        'Six points \\(A,\\dots,F\\) on the ellipse \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) determine a hexagon; the intersections of opposite sides lie on one line \\(p\\), and the third is outside the shown area.',
    ),
    'projective-conics.projective-pole-polar.projective-pole-polar': copy(
        'Elipsa, točka P zunaj nje, tangenti iz P z dotikališčema T1 in T2 ter polara p skozi obe dotikališči.',
        'An ellipse, a point P outside it, the tangents from P with the points of tangency T1 and T2, and the polar p through both points of tangency.',
        'Točka \\(P=(1,\\tfrac{21}5)\\) leži zunaj elipse \\(9x^2+25y^2=225\\); tangenti iz \\(P\\) se je dotikata v \\(T_1=(-3,\\tfrac{12}5)\\) in \\(T_2=(4,\\tfrac95)\\), polara \\(p\\) poteka skozi obe.',
        'The point \\(P=(1,\\tfrac{21}5)\\) lies outside the ellipse \\(9x^2+25y^2=225\\); the tangents from \\(P\\) touch it at \\(T_1=(-3,\\tfrac{12}5)\\) and \\(T_2=(4,\\tfrac95)\\), and the polar \\(p\\) passes through both.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
