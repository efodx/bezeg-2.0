import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Circle geometry lesson, keyed by example id: CG1 (the circle with the centre (0, 0) and the radius 5 and the point P = (13, 0)),
 * CG2 (the circles (0, 0, 5), (6, 0, 3), (3, 6, 2) and P = (4, 2)), CG3 (A = (0, 0), B = (6, 0), P = (8, 4) and the ratio k = 1) and CG4 (the circles (0, 0, 5) and (13, 0, 3)).
 * The copy names the frame only and states none of the answers the first steps ask for (the number of tangents and the power of P, the powers of P, the shape of the locus, the number
 * of common tangents). Every scene is deterministic: no source draws random numbers.
 */
export const circleGeometryPreviewCopy = {
    'circle-geometry.apollonius-circle.circle-construction': copy(
        'Krem ozadje brez koordinatnih osi. Navpična debela zelena premica poteka skozi sredino levega dela slike. Sivi krog A in modri krog B ležita na vodoravni črti levo in desno od nje; med njima je oranžen romb z oznako N. Od A in B gresta črtkani črti k oranžnemu krogu P zgoraj desno, ob njem pa je zelena oznaka PA : PB = 2.',
        'Cream background without coordinate axes. A thick vertical green line runs through the middle of the left part of the picture. A grey circle A and a blue circle B lie on a horizontal line to the left and right of it, with an orange diamond labelled N between them. Dashed lines run from A and B to an orange circle P at the upper right, beside which a green label reads PA : PB = 2.',
        'Točki \\(A=(0,0)\\) in \\(B=(6,0)\\), točka \\(P=(8,4)\\) in razmerje \\(k=1\\).',
        'The points \\(A=(0,0)\\) and \\(B=(6,0)\\), the point \\(P=(8,4)\\) and the ratio \\(k=1\\).',
    ),
    'circle-geometry.common-tangents.circle-construction': copy(
        'Krem ozadje brez koordinatnih osi. Večja siva in manjša modra krožnica ležita na vodoravni osi, vsaka s krogom v središču in rombom na desnem robu; med njima poteka siva črtkana črta središč s modrim plusom. Dve zeleni premici se razhajata v levo in desno mimo obeh krožnic, dve oranžni črtkani premici se križata med njima.',
        'Cream background without coordinate axes. A larger grey and a smaller blue circle lie on a horizontal axis, each with a dot at its centre and a diamond on its right edge; a grey dashed line of centres with a blue plus runs between them. Two green lines fan out to the left and right past both circles, and two orange dashed lines cross between them.',
        'Krožnici s središčema \\((0,0)\\) in \\((13,0)\\) ter polmeroma \\(5\\) in \\(3\\).',
        'The circles with the centres \\((0,0)\\) and \\((13,0)\\) and the radii \\(5\\) and \\(3\\).',
    ),
    'circle-geometry.radical-axis-and-centre.circle-construction': copy(
        'Krem ozadje brez koordinatnih osi. Velika siva, srednja modra in majhna zelena krožnica se delno prekrivajo; vsaka ima krog v središču, oznake 1, 2 in 3 ter romb na desnem robu. Med njimi je oranžen krog P. Navpična debela oranžna premica ter dve črtkani premici, modra in vijoličasta, se sekajo nad njim v oranžnem križcu, okoli katerega je tanka oranžna črtkana krožnica.',
        'Cream background without coordinate axes. A large grey, a medium blue and a small green circle overlap in part; each has a dot at its centre, labels 1, 2 and 3 and a diamond on its right edge. An orange circle P lies between them. A thick vertical orange line and two dashed lines, one blue and one purple, meet above it in an orange cross surrounded by a thin dashed orange circle.',
        'Krožnice \\(c_1,c_2,c_3\\) s središči \\((0,0)\\), \\((6,0)\\), \\((3,6)\\) in polmeri \\(5\\), \\(3\\), \\(2\\) ter točka \\(P=(4,2)\\).',
        'The circles \\(c_1,c_2,c_3\\) with the centres \\((0,0)\\), \\((6,0)\\), \\((3,6)\\) and the radii \\(5\\), \\(3\\), \\(2\\) and the point \\(P=(4,2)\\).',
    ),
    'circle-geometry.tangents-from-a-point.circle-construction': copy(
        'Krem ozadje brez koordinatnih osi. Siva krožnica z oznako 1 v središču in rombom na desnem robu, desno od nje oranžen krog P. Prek krožnice poteka tanka oranžna črtkana krožnica, ki se dotika zelenih kvadratkov T1 in T2 na sivi; od njiju gresta debeli zeleni črti k točki P, med njima je oranžna črtkana navpičnica, vodoravna siva črtkana črta pa povezuje središče in P.',
        'Cream background without coordinate axes. A grey circle with the label 1 at its centre and a diamond on its right edge, and an orange circle P to the right of it. A thin dashed orange circle crosses it and passes through green squares T1 and T2 on the grey one; thick green lines run from them to the point P, an orange dashed vertical line joins them and a grey dashed horizontal line joins the centre and P.',
        'Krožnica s središčem \\((0,0)\\) in polmerom \\(5\\) ter točka \\(P=(13,0)\\).',
        'The circle with the centre \\((0,0)\\) and the radius \\(5\\) and the point \\(P=(13,0)\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
