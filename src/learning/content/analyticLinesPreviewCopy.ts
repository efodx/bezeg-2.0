import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Analytic lines lesson, keyed by example id: L1 (the line through P = (-2, 1) and Q = (4, 4)), L2 (that line and the
 * horizontal line through R = (3, -2) and S = (5, -2), with the two normal arrows), L3 (the lines through (-2, 1), (0, 2) and through (0, 2), (1, 5) with the angle arc)
 * and L4 (the line, the point T = (3, -2), its foot and the segments to it). The copy names the frame only and states none of the answers the first steps ask for
 * (the slope and the intercept, the normal vector, the angle, the foot and the distance). Every scene is deterministic: no source draws random numbers.
 */
export const analyticLinesPreviewCopy = {
    'analytic-lines.angle-between-lines.line-geometry': copy(
        'Krem ozadje brez koordinatnih osi. Zelena premica ℓ poteka poševno navzgor, strma modra premica m jo seka pri oranžni piki; na vsaki je puščica smernega vektorja z oznako u oziroma v. Druga oranžna pika leži na modri premici višje, med premicama pa je oranžen krožni lok z oznako kota.',
        'Cream background without coordinate axes. A green line ℓ rises obliquely, a steeper blue line m crosses it at an orange dot; each carries a direction-vector arrow labelled u and v. A second orange dot sits higher on the blue line, and an orange circular arc with an angle label lies between the lines.',
        'Premici \\(\\ell\\) in \\(m\\) s smernima vektorjema in lokom kota med njima.',
        'The lines \\(\\ell\\) and \\(m\\) with their direction vectors and the arc of the angle between them.',
    ),
    'analytic-lines.distance-point-line.line-geometry': copy(
        'Krem ozadje brez koordinatnih osi. Zelena premica ℓ poteka poševno navzgor skozi dve oranžni piki. Pod njo je tretja oranžna pika; od leve pike na premici do nje poteka siva črtkana daljica, z majhne oranžne oznake na premici pa debela oranžna puščica z oznakami.',
        'Cream background without coordinate axes. A green line ℓ rises obliquely through two orange dots. Below it is a third orange dot; a grey dashed segment runs to it from the left dot on the line, and a thick labelled orange arrow runs to it from a small orange mark on the line.',
        'Premica \\(\\ell\\) in točka \\(T\\) pod njo z daljico \\(PT\\) in puščico od premice.',
        'The line \\(\\ell\\) and the point \\(T\\) below it with the segment \\(PT\\) and an arrow from the line.',
    ),
    'analytic-lines.forms-of-a-line.line-geometry': copy(
        'Krem ozadje brez koordinatnih osi. Debela zelena premica ℓ poteka poševno navzgor od leve spodaj do desne zgoraj; na njej sta dve oranžni piki, ena levo spodaj in ena desno zgoraj, ob njej oznaka ℓ.',
        'Cream background without coordinate axes. A thick green line ℓ rises obliquely from lower left to upper right; two orange dots sit on it, one at the lower left and one at the upper right, with the label ℓ beside it.',
        'Premica \\(\\ell\\) skozi točki \\(P=(-2,1)\\) in \\(Q=(4,4)\\).',
        'The line \\(\\ell\\) through the points \\(P=(-2,1)\\) and \\(Q=(4,4)\\).',
    ),
    'analytic-lines.normal-parallel-perpendicular.line-geometry': copy(
        'Krem ozadje brez koordinatnih osi. Poševna zelena premica ℓ z dvema oranžnima pikama in vodoravna modra premica m z dvema oranžnima pikama pod njo. Od zelene premice navzdol gre oranžna puščica z oznako n₁, od modre navzgor druga puščica z oznako n₂.',
        'Cream background without coordinate axes. An oblique green line ℓ with two orange dots and, below it, a horizontal blue line m with two orange dots. An orange arrow labelled n₁ points down from the green line and a second arrow labelled n₂ points up from the blue line.',
        'Premici \\(\\ell\\) in \\(m\\) z normalnima vektorjema \\(\\vec n_1\\) in \\(\\vec n_2\\).',
        'The lines \\(\\ell\\) and \\(m\\) with their normal vectors \\(\\vec n_1\\) and \\(\\vec n_2\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
