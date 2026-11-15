import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Projective conics lesson (K1 to K5), keyed by example id. */
export const projectiveConicsPreviewCopy = {
    'projective-conics.projective-cross-ratio.projective-cross-ratio': copy(
        'Vodoravna zelena premica s štirimi oranžnimi točkami, središče žarkov nad njo, poševna modra druga premica in črtkani žarki iz središča, ki sekajo drugo premico v slikah štirih točk. Na plošči ni napisa.',
        'A horizontal green line with four ochre points, the centre of the rays above it, a slanted blue second line and dashed rays from the centre that meet the second line at the images of the four points. The board shows no text.',
        'Središče \\(O=(0,5)\\) projicira točke \\(A,B,C,D\\) s premice \\(y=0\\) (abscise \\(0,1,3,4\\)) na premico \\(y=1+\\tfrac x2\\); slika točke \\(A\\) je \\((0,1)\\).',
        'The centre \\(O=(0,5)\\) projects the points \\(A,B,C,D\\) of the line \\(y=0\\) (abscissae \\(0,1,3,4\\)) onto the line \\(y=1+\\tfrac x2\\); the image of \\(A\\) is \\((0,1)\\).',
    ),
    'projective-conics.projective-pascal.projective-pascal': copy(
        'Elipsa s šestimi točkami, šest stranic šestkotnika in modra premica skozi dve prikazani presečišči nasprotnih stranic.',
        'An ellipse with six points, the six sides of the hexagon and the blue line through the two shown intersections of opposite sides.',
        'Šest točk \\(A,\\dots,F\\) na elipsi \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) določa šestkotnik; presečišča nasprotnih stranic ležijo na eni premici \\(p\\), tretje je zunaj prikazanega območja.',
        'Six points \\(A,\\dots,F\\) on the ellipse \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) determine a hexagon; the intersections of opposite sides lie on one line \\(p\\), and the third is outside the shown area.',
    ),
    'projective-conics.projective-pole-polar.projective-pole-polar': copy(
        'Elipsa, oranžna točka zunaj nje, črtkani tangenti z oznakama \\(t_1\\) in \\(t_2\\) iz te točke in modra polara skozi obe dotikališči.',
        'An ellipse, an ochre point outside it, the dashed tangents labelled \\(t_1\\) and \\(t_2\\) from that point and the blue polar through both points of tangency.',
        'Točka \\(P=(1,\\tfrac{21}5)\\) leži zunaj elipse \\(9x^2+25y^2=225\\); tangenti iz \\(P\\) se je dotikata v \\(T_1=(-3,\\tfrac{12}5)\\) in \\(T_2=(4,\\tfrac95)\\), polara \\(p\\) poteka skozi obe.',
        'The point \\(P=(1,\\tfrac{21}5)\\) lies outside the ellipse \\(9x^2+25y^2=225\\); the tangents from \\(P\\) touch it at \\(T_1=(-3,\\tfrac{12}5)\\) and \\(T_2=(4,\\tfrac95)\\), and the polar \\(p\\) passes through both.',
    ),
    'projective-conics.projective-five-point.projective-five-point': copy(
        'Elipsa skozi pet točk, odebeljeni lok med dvema točkama, vodoravna in navpična črtkana tangenta v krajiščih loka, kontrolna točka v njunem presečišču in napis z utežjo.',
        'An ellipse through five points, a thick arc between two of them, a horizontal and a vertical dashed tangent at the ends of the arc, the control point where they meet and a label with the weight.',
        'Pet točk na elipsi \\(9x^2+25y^2=225\\) določa stožnico; lok od \\(A=(5,0)\\) do \\(B=(0,3)\\) ima kontrolno točko \\(P_1=(5,3)\\), presečišče tangent v krajiščih, in utež \\(w=\\tfrac{\\sqrt2}2\\).',
        'Five points on the ellipse \\(9x^2+25y^2=225\\) determine the conic; the arc from \\(A=(5,0)\\) to \\(B=(0,3)\\) has the control point \\(P_1=(5,3)\\), the meeting point of the end tangents, and the weight \\(w=\\tfrac{\\sqrt2}2\\).',
    ),
    'projective-conics.projective-three-views.projective-three-views': copy(
        'Dve ploščici: na levi zelena enotska krožnica z rdečo vodoravno premico nad njo, na desni majhna modra elipsa, ki je njena slika. Na plošči ni napisa.',
        'Two panels: on the left the green unit circle with a red horizontal line above it, on the right a small blue ellipse, its image. The board shows no text.',
        'Premica \\(L\\colon y=2\\) ne seka enotske krožnice (\\(|c|>1\\)), zato je slika krožnice v desni ploščici elipsa.',
        'The line \\(L\\colon y=2\\) misses the unit circle (\\(|c|>1\\)), so the image of the circle in the right panel is an ellipse.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
