import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Probability lesson, keyed by example id. The boards draw no axes, no tick labels and no point names.
 * Every scene is deterministic: no source draws random numbers (the central limit lesson computes convolutions, it does not sample).
 */
export const probabilityPreviewCopy = {
    'probability.density.prob-density': copy(
        'Temnozelena zvonasta krivulja z vrhom na sredini; območje pod njo je osenčeno sivomodro. Krivulja se na obeh straneh stisne ob vodoravno os in teče po njej do roba plošče. Na tej osi sta dva oranžna krogca brez oznak, ki ju lahko vlečeš: levi pri \\(x=-4\\), desni pri \\(x=4\\). Levo zgoraj sta dve vrstici napisa: »X ∼ N(0; 1²)« in »Ploščina pod gostoto med a in b: 99,99 %«.',
        'A dark green bell-shaped curve with its peak in the middle; the region under it is shaded grey-blue. On both sides the curve flattens against the horizontal axis and runs along it to the edge of the board. On that axis there are two orange dots without labels, which can be dragged: the left one at \\(x=-4\\), the right one at \\(x=4\\). Top left there are two lines of text: "X ∼ N(0; 1²)" and "Area under the density between a and b: 99.99 %".',
        'Gostota standardne normalne porazdelitve \\(N(0;1)\\) z mejama \\(a=-4\\) in \\(b=4\\): osenčena ploščina je verjetnost \\(P(-4\\le X\\le4)\\approx99{,}99\\ \\%\\).',
        'The density of the standard normal distribution \\(N(0;1)\\) with the bounds \\(a=-4\\) and \\(b=4\\): the shaded area is the probability \\(P(-4\\le X\\le4)\\approx99.99\\ \\%\\).',
    ),
    'probability.binomial-normal.prob-binomial-normal': copy(
        'Stolpčni prikaz z dotikajočimi se stolpci, narisanimi samo z obrobo, ki so najvišji na sredini in proti robovoma hitro padejo skoraj do osi. Stolpci od levega roba do najvišjega stolpca na sredini, vključno z njim, so pobarvani sivomodro. Čez stolpce gre temnozelena zvonasta krivulja, ki sledi njihovi obliki. Oranžen krogec brez oznake, ki ga lahko vlečeš, leži na vodoravni osi pod najvišjim stolpcem. Levo zgoraj so tri vrstice napisa: »X ∼ B(20; 0,5)«, »Povprečje 10, σ = 2,24« in »P(X ≤ 10) = 0,5881«.',
        'A bar chart of touching bars drawn with outlines only, tallest in the middle and falling quickly towards both ends almost to the axis. The bars from the left edge up to and including the tallest bar in the middle are shaded blue-grey. A dark green bell-shaped curve runs over the bars and follows their shape. An orange dot without a label, which can be dragged, lies on the horizontal axis under the tallest bar. Top left there are three lines of text: "X ∼ B(20; 0,5)", "Mean 10, σ = 2,24" and "P(X ≤ 10) = 0,5881" (the board writes its numbers with decimal commas).',
        'Binomska porazdelitev \\(B(20;\\tfrac12)\\) s povprečjem \\(10\\) in \\(\\sigma\\approx2{,}24\\); pobarvani stolpci do vključno \\(k=10\\) dajo \\(P(X\\le10)=0{,}5881\\). Zelena krivulja je normalna gostota z istim povprečjem in varianco.',
        'The binomial distribution \\(B(20;\\tfrac12)\\) with mean \\(10\\) and \\(\\sigma\\approx2.24\\); the shaded bars up to and including \\(k=10\\) give \\(P(X\\le10)=0.5881\\). The green curve is the normal density with the same mean and variance.',
    ),
    'probability.clt.prob-clt': copy(
        'Črtkana rdečkasto rjava zvonasta krivulja, ki je najvišja na sredini in se na obeh straneh izravna blizu dna plošče ter teče do roba. Znotraj nje leži modra vodoravna črta, ki je krajša od zvona in leži na okoli treh četrtinah njegove višine (natančneje \\(0{,}72\\) vrha) ter seka zvon na njegovih bokih; njeni konci so v ravni višini, brez navpičnih stranic. Na plošči ni napisa, točk ali oznak.',
        'A dashed reddish-brown bell-shaped curve, highest in the middle, flattening on both sides near the bottom of the board and running to the edge. Inside it lies a blue horizontal line, shorter than the bell, at roughly three quarters of its height (about \\(0.72\\) of its peak), which crosses the bell on its flanks; its ends are at the same height, with no vertical sides. The board shows no text, no points and no labels.',
        'Standardizirana gostota ene enakomerne spremenljivke (\\(n=1\\)) je vodoravna črta na višini \\(\\tfrac1{2\\sqrt3}\\approx0{,}289\\) med \\(-\\sqrt3\\) in \\(\\sqrt3\\); črtkano je standardna normalna gostota. Z večanjem \\(n\\) se ji standardizirana vsota približuje.',
        'The standardized density of one uniform variable (\\(n=1\\)) is a horizontal line at the height \\(\\tfrac1{2\\sqrt3}\\approx0.289\\) between \\(-\\sqrt3\\) and \\(\\sqrt3\\); the dashed curve is the standard normal density. As \\(n\\) grows, the standardized sum approaches it.',
    ),
    'probability.summary.prob-summary': copy(
        'Sedem oranžnih krogcev, ki jih lahko vlečeš vodoravno, v dveh vrstah brez oznak: spodnja vrsta ima pet krogcev pri \\(4\\), \\(5\\), \\(6\\), \\(7\\) in \\(8\\), zgornja dva krogca, ki ležita nad krogcema pri \\(5\\) in \\(6\\). Pod njimi je moder trikotnik z napisom »sredina« malo levo od stolpca pri \\(6\\) in pod njim zelen kvadrat z napisom »mediana« točno pod tem stolpcem. Levo zgoraj je napis »Število vrednosti: 7«. Škatle z brki in pasu ni.',
        'Seven orange dots that can be dragged horizontally, in two rows without labels: the lower row has five dots at \\(4\\), \\(5\\), \\(6\\), \\(7\\) and \\(8\\), the upper row two dots above the dots at \\(5\\) and \\(6\\). Below them is a blue triangle labelled "sredina" (mean) a little to the left of the column at \\(6\\), and under it a green square labelled "mediana" (median) exactly under that column. Top left is the text "Število vrednosti: 7" (number of values: 7). There is no box plot and no band.',
        'Sedem vrednosti \\(4,5,5,6,6,7,8\\); enaki krogci so naloženi drug na drugega. Sredina (povprečje) je \\(\\tfrac{41}{7}\\approx5{,}857\\), mediana \\(6\\). Škatla z brki in pas \\(\\sigma\\) nista prikazana.',
        'Seven values \\(4,5,5,6,6,7,8\\); equal dots are stacked on top of each other. The mean is \\(\\tfrac{41}{7}\\approx5.857\\), the median \\(6\\). The box plot and the \\(\\sigma\\) band are not shown.',
    ),
    'probability.correlation.prob-correlation': copy(
        'Štirje oranžni krogci, ki jih lahko vlečeš, brez oznak: \\((0,1)\\), \\((1,2)\\), \\((2,2)\\) in \\((3,4)\\). Skoraj čez celotno ploščo teče zelena premica navzgor v desno; prva dva krogca ležita tik nad njo, tretji pod njo, četrti nad njo. Nad premico stoji zeleni napis »regresijska premica za y«. Levo zgoraj sta dve vrstici napisa: »Razsevni diagram, točk: 4« in »Korelacijski koeficient r = 0,92338«. Ostankov in druge premice ni.',
        'Four orange dots that can be dragged, without labels: \\((0,1)\\), \\((1,2)\\), \\((2,2)\\) and \\((3,4)\\). A green line rises to the right across most of the board; the first two dots lie just above it, the third below it, the fourth above it. Above the line stands the green text "regresijska premica za y" (regression line of y on x). Top left there are two lines of text: "Razsevni diagram, točk: 4" (scatter plot, points: 4) and "Korelacijski koeficient r = 0,92338" (correlation coefficient r = 0,92338, with a decimal comma). There are no residuals and no second line.',
        'Razsevni diagram štirih točk z regresijsko premico za \\(y\\); korelacijski koeficient je \\(r\\approx0{,}92338\\), torej so točke blizu naraščajoče premice. Ostanki in premica za \\(x\\) še niso prikazani.',
        'A scatter plot of four points with the regression line of \\(y\\) on \\(x\\); the correlation coefficient is \\(r\\approx0.92338\\), so the points lie close to a rising line. The residuals and the line of \\(x\\) on \\(y\\) are not shown yet.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
