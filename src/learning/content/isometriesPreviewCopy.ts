import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Isometries lesson, keyed by example id: L1 (the triangle with the vertices (3, 1), (5, 1), (3, 4) and two mirrors through the origin,
 * the x-axis and the line through (2, 1)), L2 (the same triangle and one mirror through (1, 0) and (2, 1) in the classifying mode) and L3 (the triangle (0, 0), (4, 0), (0, 3) and its
 * image under the dilation with the centre (1, 1) and the ratio 3/2). The copy names the frame only and states none of the answers the first steps ask for (the image of a vertex,
 * whether the orientation is kept, the image of the first vertex). Every scene is deterministic: no source draws random numbers.
 */
export const isometriesPreviewCopy = {
    'isometries.classifying-a-motion.isometries': copy(
        'Krem ozadje brez koordinatnih osi. Temnozelen trikotnik z oznako lik, poševna siva premica z oznako zrcalo 1, ki poteka od leve spodaj do desne zgoraj, in po njej oranžna črtkana premica z oznako os. Na premici je sivi krog, desno više siv romb, ob rombu pa oznaka slika 1; ob premici leži debelejši siv trikotnik, ki se delno prekriva s temnozelenim.',
        'Cream background without coordinate axes. A dark green triangle labelled lik, an oblique grey line labelled zrcalo 1 running from lower left to upper right with an orange dashed line labelled os along it. A grey circle sits on the line with a grey diamond up and to the right of it and the label slika 1 beside the diamond; a thicker grey triangle lies next to the line and partly overlaps the dark green one.',
        'Eno zrcalo skozi točki \\((1,0)\\) in \\((2,1)\\) ter lik z njegovo sliko.',
        'One mirror through the points \\((1,0)\\) and \\((2,1)\\) with the triangle and its image.',
    ),
    'isometries.dilation-similarity.isometries': copy(
        'Krem ozadje brez koordinatnih osi. Manjši temnozelen pravokotni trikotnik z oznako lik leži znotraj večjega zelenega trikotnika z oznako slika 1, ki ima enako obliko. Iz oranžnega kroga, oznaka središče, gredo tanke črtkane oranžne črte proti ogliščem, ob krogu pa je moder romb.',
        'Cream background without coordinate axes. A smaller dark green right triangle labelled lik lies inside a larger green triangle of the same shape labelled slika 1. Thin dashed orange lines run from an orange circle, labelled središče, towards the vertices, and a blue diamond sits beside the circle.',
        'Lik in njegova slika pri središčnem raztegu s središčem \\(C=(1,1)\\) in razmerjem \\(k=\\tfrac32\\).',
        'The motif and its image under the central dilation with the centre \\(C=(1,1)\\) and the ratio \\(k=\\tfrac32\\).',
    ),
    'isometries.two-mirrors.isometries': copy(
        'Krem ozadje brez koordinatnih osi. Vodoravna siva premica zrcalo 1 in poševna modra črtkana premica zrcalo 2 se sekata v oranžnem križcu z oznako središče. Temnozelen pravokotni trikotnik lik leži nad prvo premico desno od preseka; pod njo je siv črtkan trikotnik slika 1, nad njo pa moder trikotnik slika 2 levo zgoraj.',
        'Cream background without coordinate axes. A horizontal grey line zrcalo 1 and an oblique blue dashed line zrcalo 2 cross at an orange cross labelled središče. A dark green right triangle lik lies above the first line to the right of the crossing; below it is a grey dashed triangle slika 1, and above it a blue triangle slika 2 at the upper left.',
        'Trikotnik in dve zrcali skozi \\((0,0)\\), prvo še skozi \\((1,0)\\), drugo skozi \\((2,1)\\).',
        'The triangle and two mirrors through \\((0,0)\\), the first also through \\((1,0)\\), the second through \\((2,1)\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
