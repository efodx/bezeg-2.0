import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of the Level sets lesson, keyed by example id: LS5 (the feasible region of two constraints with the objective 3x + 2y, drawn with its vertices).
 * The copy names the frame only and states none of the answers step 1 asks for (the vertices of the polygon): the board itself labels its vertices, the copy does not repeat their coordinates.
 */
export const levelSetsPreviewCopy = {
    'level-sets.gradient.contour-map': copy(
        'Krem ozadje s koordinatnima osema in mrežo. Zgoraj levo so tri vrstice legende. Okoli izhodišča leži ena krožnica, narisana z debelo črto in črtkano črto čez njo; na krožnici v prvem kvadrantu stoji oranžna pika z oznako sonde in njenimi koordinatami. Nobena puščica ni narisana.',
        'Cream background with the coordinate axes and a grid. Three lines of legend text stand at the top left. One circle around the origin is drawn with a thick line and a dashed line over it; on the circle in the first quadrant stands an orange dot labelled as the probe with its coordinates. No arrow is drawn.',
        'Zemljevid nivojnic sklede \\(x^2+y^2\\) z eno nivojnico pri \\(c=1\\) in sondo v \\((0{,}6;\\ 0{,}8)\\); gradient še ni narisan.',
        'The contour map of the bowl \\(x^2+y^2\\) with one level set at \\(c=1\\) and the probe at \\((0.6,\\ 0.8)\\); the gradient is not drawn yet.',
    ),
    'level-sets.linear-programming.linear-program': copy(
        'Krem ozadje s koordinatnima osema. Ob presečišču osi stoji majhen štirikotnik z debelim robom in rahlim polnilom; v njegovih štirih ogliščih so črni krogi z napisanimi koordinatami. V enem oglišču je obrobljen kvadrat, skozi katerega teče debela modra črta; vzporedno z njo teče črtkana črta, dve tanki črti omejujeta območje, iz izhodišča pa kaže oranžna puščica do oranžne ročice.',
        'Cream background with the coordinate axes. At the crossing of the axes stands a small quadrilateral with a thick edge and a light fill; at its four vertices stand black circles with their coordinates written beside them. One vertex carries an outlined square with a thick blue line running through it; a dashed line runs parallel to it, two thin lines bound the region, and an orange arrow points from the origin to an orange handle.',
        'Dopustno območje pri \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x,y\\ge0\\) s kriterijsko funkcijo \\(3x+2y\\).',
        'The feasible region of \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x,y\\ge0\\) with the objective \\(3x+2y\\).',
    ),
    'level-sets.surface.contour-map': copy(
        'Krem ozadje s koordinatnima osema in mrežo. Zgoraj levo so tri vrstice legende. Okoli izhodišča leži ena krožnica, narisana z debelo črto in črtkano črto čez njo; na krožnici v prvem kvadrantu stoji oranžna pika z oznako sonde in njenimi koordinatami. Druge nivojnice niso narisane.',
        'Cream background with the coordinate axes and a grid. Three lines of legend text stand at the top left. One circle around the origin is drawn with a thick line and a dashed line over it; on the circle in the first quadrant stands an orange dot labelled as the probe with its coordinates. No other level set is drawn.',
        'Zemljevid nivojnic sklede \\(x^2+y^2\\) z eno nivojnico pri \\(c=1\\) in sondo na njej; druge nivojnice dodaš sam.',
        'The contour map of the bowl \\(x^2+y^2\\) with one level set at \\(c=1\\) and a probe on it; you add the other level sets yourself.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
