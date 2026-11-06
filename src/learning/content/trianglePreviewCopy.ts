import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Triangle geometry lesson, keyed by example id. */
export const trianglePreviewCopy = {
    'triangle-geometry.notable-points.triangle-centres': copy(
        'Trikotnik z oglišči \\((0,0)\\), \\((7,0)\\) in \\((2,5)\\) ter njegove tri težiščnice, ki se sekajo znotraj trikotnika.',
        'The triangle with the vertices \\((0,0)\\), \\((7,0)\\) and \\((2,5)\\) and its three medians, which meet inside the triangle.',
        'Trikotnik s tremi težiščnicami; težišče je njihovo presečišče. Napis na plošči pravi, da je trikotnik ostrokotni.',
        'The triangle with its three medians; the centroid is where they meet. The text on the board says the triangle is acute.',
    ),
    'triangle-geometry.inscribed-angle.inscribed-angle': copy(
        'Krožnica skozi \\(A=(0,0)\\), \\(B=(7,0)\\) in \\(C=(2,5)\\) s tetivo \\(AB\\), obodnim kotom v \\(C\\), obodnim kotom v točki \\(P\\) na loku nad tetivo in središčnim kotom pri \\(O\\).',
        'The circle through \\(A=(0,0)\\), \\(B=(7,0)\\) and \\(C=(2,5)\\) with the chord \\(AB\\), the inscribed angle at \\(C\\), the inscribed angle at the point \\(P\\) on the arc above the chord and the central angle at \\(O\\).',
        'Obodna kota nad tetivo \\(AB\\) v točkah \\(C\\) in \\(P\\) sta oba \\(66{,}8^\\circ\\), središčni kot je \\(133{,}6^\\circ\\); odčitki so na plošči.',
        'The inscribed angles over the chord \\(AB\\) at \\(C\\) and \\(P\\) are both \\(66.8^\\circ\\), and the central angle is \\(133.6^\\circ\\); the readouts are on the board.',
    ),
    'triangle-geometry.euler-line.euler-line': copy(
        'Trikotnik z oglišči \\((0,0)\\), \\((7,0)\\) in \\((2,5)\\) ter znotraj njega označeni točki \\(H=(2,2)\\), \\(G=(3,5/3)\\) in \\(O=(7/2,3/2)\\).',
        'The triangle with the vertices \\((0,0)\\), \\((7,0)\\) and \\((2,5)\\) and the marked points \\(H=(2,2)\\), \\(G=(3,5/3)\\) and \\(O=(7/2,3/2)\\) inside it.',
        'Točke \\(H\\) (kvadratek), \\(G\\) (križec \\(\\times\\)) in \\(O\\) (znak \\(+\\)); premica skoznje še ni narisana. Napis na plošči pravi, da so kolinearne.',
        'The points \\(H\\) (square), \\(G\\) (cross \\(\\times\\)) and \\(O\\) (plus sign \\(+\\)); the line through them is not drawn yet. The text on the board says they are collinear.',
    ),
    'triangle-geometry.simson-line.simson-line': copy(
        'Trikotnik z oglišči \\((0,0)\\), \\((7,0)\\) in \\((2,5)\\), nosilke njegovih stranic, očrtana krožnica s središčem \\(O\\), točka \\(P\\) na krožnici pod stranico \\(AB\\) in tri nožišča \\(D\\), \\(E\\), \\(F\\).',
        'The triangle with the vertices \\((0,0)\\), \\((7,0)\\) and \\((2,5)\\), the lines carrying its sides, the circumcircle with centre \\(O\\), the point \\(P\\) on the circle below the side \\(AB\\) and the three feet \\(D\\), \\(E\\), \\(F\\).',
        'Nožišča so označena s kvadratki; pravokotnic in premice skoznje še ni. Napis na plošči pravi, da so nožišča kolinearna.',
        'The feet are marked by small squares; the perpendiculars and the line through the feet are not drawn yet. The text on the board says the feet are collinear.',
    ),
    'triangle-geometry.inversion.inversion': copy(
        'Točka \\(P=(0,0)\\), krožnica s središčem \\(O=(5,0)\\) in polmerom \\(3\\) ter sekanta po osi \\(x\\), ki jo seka v točkah \\(A=(2,0)\\) in \\(B=(8,0)\\); na sekanti je še ročica kota \\(\\theta\\) v točki \\((3,0)\\).',
        'The point \\(P=(0,0)\\), the circle with centre \\(O=(5,0)\\) and radius \\(3\\) and a secant along the \\(x\\)-axis that meets it at the points \\(A=(2,0)\\) and \\(B=(8,0)\\); the secant also carries the handle of the angle \\(\\theta\\) at \\((3,0)\\).',
        'Sekanta skozi \\(P\\) seka krožnico v \\(A\\) in \\(B\\); napis na plošči pravi, da je potenca \\(16\\).',
        'The secant through \\(P\\) meets the circle at \\(A\\) and \\(B\\); the text on the board says the power is \\(16\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
