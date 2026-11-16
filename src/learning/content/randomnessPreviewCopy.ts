import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Randomness lesson, keyed by example id: RS1 (the Galton board of 10 rows, seed 42, with one ball shown of the 1000), RS2 (the fair coin, seed 42, 10 tosses), RS3 (the square with the quarter circle, 100 points, none thrown yet) and RS4 (the random walk of 100 steps, one walk, none drawn yet).
 * The copy names the frame only and states none of the answers the first steps ask for (which slot the ball lands in, where the frequency is after 100 tosses, how many points land in the circle, where a walk ends). No tally or readout value is named.
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
    'randomness.monte-carlo.prob-simulation': copy(
        'Krem ozadje. Levo kvadrat s tanko sivozeleno obrobo in debel moder lok četrtine kroga od zgornjega levega do spodnjega desnega oglišča; nad kvadratom besedilo Narisane prve točke: 0, pod njim Četrtina kroga. V kvadratu ni nobene točke. Desno od kvadrata vrstice besedila: Delež točk v krogu (ocena števila π/4), Prava vrednost π/4 nad vodoravno črtkano modro črto, nato Navpična črta: običajno odstopanje ocene, Velik križec: točka v krogu ter Majhen križec: točka zunaj kroga.',
        'Cream background. On the left a square with a thin grey-green outline and a thick blue quarter circle arc from the upper left to the lower right corner; above the square the text Drawn first points: 0, below it Quarter circle. The square holds no point. To the right of the square lines of text: Share of points in the circle (estimate of the number π/4), True value π/4 above a horizontal dashed blue line, then Vertical line: usual deviation of the estimate, Large cross: point in the circle and Small cross: point outside the circle.',
        'Kvadrat s četrtino kroga, seme \\(42\\), \\(100\\) točk: še nobena ni vržena.',
        'The square with the quarter circle, seed \\(42\\), \\(100\\) points: none thrown yet.',
    ),
    'randomness.random-walk.prob-simulation': copy(
        'Krem ozadje. Zgoraj levo štiri vrstice besedila: Narisani prvi sprehodi: 0, Običajna širina sprehodov, Kje se sprehodi končajo in Pričakovano po zakonu. Levo črtkan moder obris lijaka, ki se z ostrim vrhom ob levem robu razširi proti desni. Desno debela zelena navpična črta, ob njej na desni črtkan moder obris vodoravnih stolpcev zvonaste oblike, ki so na sredini najdaljši in proti obema koncema krajši. Noben sprehod ni narisan.',
        'Cream background. At the top left four lines of text: Drawn first walks: 0, Typical width of the walks, Where the walks end and Expected by the law. On the left a dashed blue outline of a funnel that widens to the right from a sharp tip at the left edge. On the right a thick green vertical line with, to its right, a dashed blue outline of horizontal bars of bell shape, longest in the middle and shorter towards both ends. No walk is drawn.',
        'Slučajni sprehod, seme \\(42\\), \\(100\\) korakov, \\(1\\) sprehod: še noben ni narisan.',
        'The random walk, seed \\(42\\), \\(100\\) steps, \\(1\\) walk: none drawn yet.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
