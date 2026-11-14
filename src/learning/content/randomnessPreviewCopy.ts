import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Randomness lesson, keyed by example id: RS1 (the Galton board of 10 rows, seed 42, with one ball shown of the 1000) and RS2 (the fair coin, seed 42, 10 tosses).
 * The copy names the frame only and states none of the answers the first steps ask for (which slot the ball lands in, where the frequency is after 100 tosses). No tally or readout value is named.
 * The runs are seeded, so the first frame is the same every time: no source draws unseeded random numbers.
 */
export const randomnessPreviewCopy = {
    'randomness.galton-board.prob-simulation': copy(
        'Krem ozadje. Zgoraj dve vrstici besedila: Kopica predalov (vsi poskusi) in Pričakovano po zakonu. Ob vodoravni osi x je levo debel zelen obrisan stolpec kopice ene kroglice, desno od njega pa črtkan moder obris stolpcev binomskega zakona, ki je nizek in zvonaste oblike z vrhom na sredini. Pod osjo vrstica besedila o prvi poti kroglice, pod njo trikotnik sivih črtic (klini), čez katerega teče en oranžen cikcakast potek kroglice od zgornjega klina navzdol v levo.',
        'Cream background. At the top two lines of text: Heap of slots (all trials) and Expected by the law. Along the x-axis a thick green outlined bar of the heap of one ball stands at the left, and to the right of it a dashed blue outline of the bars of the binomial law, low and bell-shaped with its peak in the middle. Below the axis a line of text about the first ball path, under it a triangle of grey dashes (the pegs) crossed by one orange zigzag path of the ball from the top peg down towards the lower left.',
        'Galtonova deska z \\(10\\) vrstami klinov in \\(p=\\tfrac12\\), seme \\(42\\): ena kroglica od \\(1000\\) in stolpci binomskega zakona.',
        'The Galton board with \\(10\\) rows of pegs and \\(p=\\tfrac12\\), seed \\(42\\): one ball of \\(1000\\) and the bars of the binomial law.',
    ),
    'randomness.law-of-large-numbers.prob-simulation': copy(
        'Krem ozadje. Zgoraj tri vrstice besedila: Relativna frekvenca grbov, Pričakovana vrednost 1/2 in Pas 95 %. Pod njimi črtkan moder zgornji rob pasu, vodoravna siva črta pri 1/2 in debela zelena črta, ki se z leve dvigne do sive črte, nato pa počasi pade pod njo; pod sivo črto je črtkan spodnji rob pasu. Sledi napis Število poskusov (logaritemska os), nato dve vrstici o razliki med številom grbov in polovico metov, spodaj pa druga ločena ploskev s sivo črto, zeleno črto in črtkanim pasom ter napis Navpična os: ± 4 grbov.',
        'Cream background. At the top three lines of text: Relative frequency of heads, Expected value 1/2 and 95 % band. Below them a dashed blue upper edge of the band, a horizontal grey line at 1/2 and a thick green line that rises from the left to the grey line and then slowly falls below it; under the grey line a dashed lower edge of the band. Next the label Number of trials (logarithmic axis), then two lines about the difference between the number of heads and half the tosses, and below a second separate plot with a grey line, a green line and a dashed band, and the label Vertical axis: ± 4 heads.',
        'Pošten kovanec, seme \\(42\\), \\(10\\) metov: relativna frekvenca grbov \\(f\\) proti črti \\(\\tfrac12\\) in pasu \\(95\\,\\%\\).',
        'A fair coin, seed \\(42\\), \\(10\\) tosses: the relative frequency of heads \\(f\\) against the line \\(\\tfrac12\\) and the \\(95\\,\\%\\) band.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
