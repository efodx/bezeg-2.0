import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Trigonometry lesson, keyed by example id: TR1 (the angle 0, no overlay), TR2 (30 degrees with the three
 * mirror images), TR3 and TR4 (the triangle A = (0, 0), B = (7, 0), C = (2, 4) in the sides mode). The two triangle lessons open on the same scene, so their
 * two cards show the same frame. The copy names the frame only and answers none of the first-step questions (the height of the point, which reflection keeps
 * which coordinate, whether the quotients are related, the sign of the correction). Every scene is deterministic: no source draws random numbers.
 */
export const trigonometryPreviewCopy = {
    'trigonometry.radian-sine-cosine.unit-circle': copy(
        'Koordinatni osi na krem ozadju. Sivozelena enotska krožnica okoli izhodišča ima oranžno piko na osi \\(x\\) pri \\((1,0)\\); od izhodišča do nje poteka modrikasta črta. Desno od krožnice se pri zeleni piki na osi \\(x\\) pri \\(1{,}7\\) začne zelena valovita krivulja z oznako sin θ, ki poteka do približno \\(x=8\\).',
        'Coordinate axes on a cream background. A grey-green unit circle around the origin has an orange dot on the \\(x\\)-axis at \\((1,0)\\); a bluish line runs from the origin to it. To the right of the circle a green wavy curve labelled sin θ starts at a green dot on the \\(x\\)-axis at \\(1.7\\) and runs to about \\(x=8\\).',
        'Enotska krožnica s točko pri kotu \\(\\theta=0\\), v \\((1,0)\\).',
        'The unit circle with the point at the angle \\(\\theta=0\\), at \\((1,0)\\).',
    ),
    'trigonometry.addition-formulas.unit-circle': copy(
        'Koordinatni osi na krem ozadju. Na sivozeleni enotski krožnici je oranžna pika v prvem kvadrantu; modra črta poteka od izhodišča po osi \\(x\\), temnejša črta do pike, črtkana vodoravnica pa do zelene pike na valoviti krivulji desno od krožnice. Tri zrcalne slike točke: oranžen križec v četrtem kvadrantu, moder plus v drugem in vijoličen romb v tretjem.',
        'Coordinate axes on a cream background. On the grey-green unit circle an orange dot sits in the first quadrant; a blue line runs from the origin along the \\(x\\)-axis, a darker line to the dot, and a dashed horizontal line to a green dot on the wavy curve to the right of the circle. Three mirror images of the point: an orange cross in the fourth quadrant, a blue plus in the second and a purple diamond in the third.',
        'Točka pri kotu \\(30^\\circ\\) in njene tri zrcalne slike.',
        'The point at the angle \\(30^\\circ\\) and its three mirror images.',
    ),
    'trigonometry.sine-rule.triangle-solver': copy(
        'Krem ozadje brez osi. Na levi je trikotnik z zelenimi stranicami, označenimi \\(a\\), \\(b\\) in \\(c\\), in tremi oranžnimi oglišči; stranica \\(c\\) je vodoravna spodaj. Desno od njega sta dve vodoravni vrstici in pod njima oranžno besedilo s popravkom.',
        'A cream background without axes. On the left a triangle with green sides labelled \\(a\\), \\(b\\) and \\(c\\) and three orange vertices; the side \\(c\\) is horizontal at the bottom. To its right two horizontal bars and, under them, an orange text with the correction.',
        'Trikotnik z oglišči \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\).',
        'The triangle with the vertices \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\).',
    ),
    'trigonometry.cosine-rule.triangle-solver': copy(
        'Krem ozadje brez osi. Na levi je trikotnik z zelenimi stranicami, označenimi \\(a\\), \\(b\\) in \\(c\\), in tremi oranžnimi oglišči. Desno od njega sta dve vodoravni vrstici: zgornja je siva z oranžnim črtkanim delom na desni, spodnja zelena in modra z oznakama a² in b². Pod njima je oranžno besedilo s popravkom.',
        'A cream background without axes. On the left a triangle with green sides labelled \\(a\\), \\(b\\) and \\(c\\) and three orange vertices. To its right two horizontal bars: the upper one grey with an orange dashed part at its right end, the lower one green and blue, labelled a² and b². Under them an orange text with the correction.',
        'Trikotnik z oglišči \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) in vrstici kvadratov stranic.',
        'The triangle with the vertices \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(2,4)\\) and the two rows of squares of the sides.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
