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
    'level-sets.linear-programming.linear-program': copy(
        'Krem ozadje. Osem vrstic legende z vzorcem in pomenom črte zapolni zgornji del slike. Pod njimi stoji ob presečišču koordinatnih osi majhen štirikotnik z debelim robom in rahlim polnilom; v njegovih štirih ogliščih so črni krogi z napisanimi koordinatami. V enem oglišču je obrobljen kvadrat, skozi katerega teče debela modra črta; vzporedno z njo teče črtkana črta, dve tanki črti omejujeta območje, iz izhodišča pa kaže oranžna puščica z ročico in oznako cilja. Dolge črte se nadaljujejo čez legendo.',
        'Cream background. The top two thirds of the picture hold eight legend lines, each with a sample and the meaning of a line. Below them, at the crossing of the coordinate axes, stands a small quadrilateral with a thick edge and a light fill; at its four vertices stand black circles with their coordinates written beside them. One vertex carries an outlined square with a thick blue line running through it; a dashed line runs parallel to it, two thin lines bound the region, and an orange arrow with a handle and an objective label points away from the origin. The long lines continue across the legend.',
        'Dopustno območje pri \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x,y\\ge0\\) s kriterijsko funkcijo \\(3x+2y\\).',
        'The feasible region of \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x,y\\ge0\\) with the objective \\(3x+2y\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
