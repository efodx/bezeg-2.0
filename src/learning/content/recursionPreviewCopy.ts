import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Recursion lesson, keyed by example id: RG1 (the arithmetic sequence with first term 3 and difference 2, six terms as bars) and RG3 (1000 at 5 percent for one year, the four interest models).
 * The copy names the frame only and states none of the answers the first steps ask for (the tenth term, the values after ten years). Nothing on the board is read beyond the values the lessons state in their own first scene.
 */
export const recursionPreviewCopy = {
    'recursion.sequences.recursion-growth': copy(
        'Krem ozadje. Zgoraj levo ob navpični osi tri vrstice besedila: aₖ (člen zaporedja), stolpci: členi aₖ za k = 1 … 6 in odčitek šestega člena. Nad vodoravno osjo (k, številka člena) stoji šest zelenih obrisanih stolpcev, ki z vsakim členom enakomerno rastejo od leve proti desni; nad vrhom šestega stolpca je majhen oranžen romb.',
        'Cream background. At the top left beside the vertical axis three lines of text: aₖ (term of the sequence), bars: terms aₖ for k = 1 … 6 and a readout of the sixth term. Above the horizontal axis (k, term number) stand six green outlined bars that grow evenly with each term from left to right; a small orange diamond sits above the top of the sixth bar.',
        'Aritmetično zaporedje z \\(a_1=3\\) in \\(d=2\\): prvih šest členov kot stolpci.',
        'The arithmetic sequence with \\(a_1=3\\) and \\(d=2\\): the first six terms as bars.',
    ),
    'recursion.compound-interest.recursion-growth': copy(
        'Krem ozadje. Zgoraj ob navpični osi naslov vrednost in štiri vrstice legende, vsaka z vzorcem črte in vrednostjo: sivo črtkana navadno obrestovanje, debela zelena obrestno obrestovanje, tanka oranžna relativno z m = 1 in modra črtkana zvezno. Pod legendo se štiri skoraj sovpadajoče krivulje z začetkom pri 1000 ob navpični osi komaj opazno dvignejo proti desnemu robu pri enem letu; pod njimi je prazen prostor do vodoravne osi t (leta).',
        'Cream background. At the top beside the vertical axis the title value and four legend lines, each with a line sample and a value: grey dashed simple interest, thick green compound interest, thin orange relative with m = 1 and blue dashed continuous. Below the legend four nearly coinciding curves start at 1000 on the vertical axis and rise barely visibly towards the right edge at one year; empty space lies below them down to the horizontal axis t (years).',
        'Glavnica \\(1000\\) pri \\(5\\,\\%\\) za eno leto: štiri vrste obrestovanja.',
        'A capital of \\(1000\\) at \\(5\\,\\%\\) for one year: the four kinds of interest.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
