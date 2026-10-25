import type {LessonCurveFixture, LessonViewBox} from '../model';
import type {ContentSource, GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const farinSource = (supports: readonly string[], implementationCorrespondence?: string): ContentSource => ({
    id: 'farin-cagd-construction',
    citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
    supports,
    ...(implementationCorrespondence ? {implementationCorrespondence} : {}),
});

const pbpSource = (supports: readonly string[]): ContentSource => ({
    id: 'pbp-construction',
    citation: 'Prautzsch, H., Boehm, W., Paluszny, M. Bézier and B-Spline Techniques, Springer, 2002.',
    supports,
});

// ---------------------------------------------------------------------------------------------
// subdivision
// ---------------------------------------------------------------------------------------------

const subdivision: GuidedLesson = {
    demonstrationId: 'subdivision',
    title: text('Subdivizija Bézierjeve krivulje', 'Subdivision of a Bézier curve'),
    summary: text(
        'Decasteljaujeva shema pri parametru \\(t\\) krivuljo razreže na dva dela, ki sta spet Bézierjevi krivulji iste stopnje. Njune kontrolne točke so prve in zadnje točke vrstic sheme, skupaj pa natančno prekrijeta izvirno krivuljo.',
        'The de Casteljau scheme at the parameter \\(t\\) cuts a curve into two parts that are again Bézier curves of the same degree. Their control points are the first and last points of the rows of the scheme, and together they cover the original curve exactly.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Decasteljaujeve sheme in Bézierjeve krivulje \\(B(t)\\) na intervalu \\([0,1]\\).', 'Assumes familiarity with the de Casteljau scheme and a Bézier curve \\(B(t)\\) on the interval \\([0,1]\\).'),
        text('Priporočeno je, da veš, da so \\(B(0)\\) in \\(B(1)\\) prva in zadnja kontrolna točka.', 'It helps to know that \\(B(0)\\) and \\(B(1)\\) are the first and last control points.'),
    ],
    learningGoals: [
        text('Iz vrstic Decasteljaujeve sheme prebereš kontrolne točke levega in desnega dela.', 'Read the control points of the left and right parts from the rows of the de Casteljau scheme.'),
        text('Poveš, da je levi del \\(L(u)=B(tu)\\) in desni del \\(R(u)=B(t+(1-t)u)\\), torej gre za preparametrizaciji izvirne krivulje.', 'State that the left part is \\(L(u)=B(tu)\\) and the right part is \\(R(u)=B(t+(1-t)u)\\), so both are reparameterizations of the original curve.'),
        text('Pojasniš, zakaj imata dela skupno točko \\(B(t)\\) in zakaj se pri drugem \\(t\\) razmerje dolžin delov spremeni.', 'Explain why the parts share the point \\(B(t)\\) and why the ratio of their lengths changes with \\(t\\).'),
    ],
    formulaBlocks: [
        {
            id: 'sd-decasteljau-rows',
            latex: 'b_i^0=P_i,\\qquad b_i^r=(1-t)\\,b_i^{r-1}+t\\,b_{i+1}^{r-1},\\qquad r=1,\\dots,n,\\quad i=0,\\dots,n-r',
            notation: text(
                'Vrstica \\(r\\) sheme vsebuje točke \\(b_i^r\\); \\(n\\) je stopnja krivulje, \\(P_i\\) so kontrolne točke, \\(t\\) pa parameter subdivizije.',
                'Row \\(r\\) of the scheme holds the points \\(b_i^r\\); \\(n\\) is the degree of the curve, the \\(P_i\\) are the control points, and \\(t\\) is the subdivision parameter.',
            ),
            explanation: text(
                'Zadnja vrstica ima eno samo točko \\(b_0^n=B(t)\\).',
                'The last row has a single point \\(b_0^n=B(t)\\).',
            ),
        },
        {
            id: 'sd-split-points',
            latex: '\\text{left: } b_0^0,b_0^1,\\dots,b_0^n,\\qquad \\text{right: } b_0^n,b_1^{n-1},\\dots,b_n^0',
            notation: text(
                'Levi del vzame prvo točko vsake vrstice, desni del zadnjo točko vsake vrstice, v obratnem vrstnem redu.',
                'The left part takes the first point of every row, the right part the last point of every row, in reverse order.',
            ),
            explanation: text(
                'Obe krivulji imata \\(n+1\\) kontrolnih točk, zadnja točka levega dela in prva točka desnega dela pa sta ista točka \\(b_0^n=B(t)\\).',
                'Both curves have \\(n+1\\) control points, and the last point of the left part and the first point of the right part are the same point \\(b_0^n=B(t)\\).',
            ),
        },
        {
            id: 'sd-reparameterization',
            latex: 'L(u)=B(tu),\\qquad R(u)=B\\bigl(t+(1-t)u\\bigr),\\qquad u\\in[0,1]',
            notation: text(
                'Parameter \\(u\\) teče po vsakem delu od 0 do 1, parameter \\(t\\) pa je mesto reza na izvirni krivulji.',
                'The parameter \\(u\\) runs from 0 to 1 along each part, while \\(t\\) is the place of the cut on the original curve.',
            ),
            explanation: text(
                'Levi del opiše \\(B\\) na \\([0,t]\\), desni na \\([t,1]\\). Krivulja se ne spremeni, spremeni se le njen opis s kontrolnimi točkami.',
                'The left part traces \\(B\\) on \\([0,t]\\), the right part on \\([t,1]\\). The curve does not change, only its description by control points does.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'sd-half',
            title: text('Primer: privzeta krivulja, \\(t=\\tfrac12\\)', 'Example: the default curve, \\(t=\\tfrac12\\)'),
            calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3);\\quad b^1=\\bigl(-\\tfrac72,0\\bigr),(0,3),\\bigl(\\tfrac72,0\\bigr);\\quad b^2=\\bigl(-\\tfrac74,\\tfrac32\\bigr),\\bigl(\\tfrac74,\\tfrac32\\bigr);\\quad b^3=\\bigl(0,\\tfrac32\\bigr)',
            resultLatex: '\\text{left: }(-4,-3),\\bigl(-\\tfrac72,0\\bigr),\\bigl(-\\tfrac74,\\tfrac32\\bigr),\\bigl(0,\\tfrac32\\bigr);\\quad \\text{right: }\\bigl(0,\\tfrac32\\bigr),\\bigl(\\tfrac74,\\tfrac32\\bigr),\\bigl(\\tfrac72,0\\bigr),(4,-3)',
            check: text(
                'Skupna točka \\(\\bigl(0,\\tfrac32\\bigr)\\) je \\(B(\\tfrac12)\\), desni del pa je zrcalna slika levega, ker je privzeta krivulja simetrična.',
                'The shared point \\(\\bigl(0,\\tfrac32\\bigr)\\) is \\(B(\\tfrac12)\\), and the right part is the mirror image of the left because the default curve is symmetric.',
            ),
        },
    ],
    steps: [
        {
            id: 'sd-whole-curve', order: 1,
            title: text('Ena krivulja, shema pri \\(t\\)', 'One curve, the scheme at \\(t\\)'),
            purpose: text('Spomniti se Decasteljaujeve sheme, ki bo krivuljo razrezala.', 'Recalling the de Casteljau scheme that will cut the curve.'),
            explanation: text(
                'Prikazana je privzeta krivulja s shemo pri \\(t=\\tfrac12\\). Shema ima tri vrstice vmesnih točk in na koncu točko \\(B(t)\\) na krivulji. Isto shemo bomo uporabili za rez.',
                'The default curve is shown with its scheme at \\(t=\\tfrac12\\). The scheme has three rows of intermediate points and ends with the point \\(B(t)\\) on the curve. We will use the same scheme for the cut.',
            ),
            formulaIds: ['sd-decasteljau-rows'],
            frames: [frame('sd-whole-curve-explanation', 'explanation'), frame('sd-whole-curve-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči točko \\(B(t)\\), kjer se shema konča, in preštej vrstice vmesnih točk.', 'Find the point \\(B(t)\\) where the scheme ends and count the rows of intermediate points.'),
            expectedObservations: [text('Prikazana je ena krivulja s štirimi kontrolnimi točkami in shemo; točka sheme na krivulji je na sredini.', 'One curve with four control points and its scheme is shown; the scheme point on the curve is at the middle.')],
            scene: {
                id: 'sd-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text('Privzeta krivulja s prikazano shemo pri \\(t=\\tfrac12\\).', 'The default curve with the scheme shown at \\(t=\\tfrac12\\).'),
            },
        },
        {
            id: 'sd-choose-t', order: 2,
            title: text('Mesto reza \\(t\\)', 'The place of the cut \\(t\\)'),
            purpose: text('Spoznati parameter reza in oranžni preostanek krivulje.', 'Meeting the cut parameter and the orange remainder of the curve.'),
            explanation: text(
                'Parameter \\(t\\) določa, kje krivuljo razrežemo. Pri \\(t=\\tfrac{3}{10}\\) je rez bliže začetku, oranžni del pa je preostanek krivulje na \\([t,1]\\).',
                'The parameter \\(t\\) decides where the curve is cut. At \\(t=\\tfrac{3}{10}\\) the cut is nearer the start, and the orange part is the rest of the curve on \\([t,1]\\).',
            ),
            formulaIds: ['sd-reparameterization'],
            frames: [frame('sd-choose-t-explanation', 'explanation'), frame('sd-choose-t-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Premakni drsnik \\(t\\) in spremljaj, kako se premika točka reza in kako se spreminja oranžni del.', 'Move the \\(t\\) slider and watch how the cut point moves and how the orange part changes.'),
            expectedObservations: [text('Točka reza je pri \\(t=\\tfrac{3}{10}\\) bliže začetku krivulje; oranžni del je daljši od modrega.', 'At \\(t=\\tfrac{3}{10}\\) the cut point is nearer the start of the curve; the orange part is longer than the blue one.')],
            scene: {
                id: 'sd-t-third', basedOn: 'demonstration-default',
                actions: [{name: 'set-subdivision-parameter', value: 0.3}],
                expectedState: text('Shema je prikazana pri \\(t=\\tfrac{3}{10}\\).', 'The scheme is shown at \\(t=\\tfrac{3}{10}\\).'),
            },
        },
        {
            id: 'sd-read-rows', order: 3,
            title: text('Kontrolne točke iz sheme', 'Control points from the scheme'),
            purpose: text('Izračunati kontrolne točke obeh delov iz vrstic sheme.', 'Computing the control points of both parts from the rows of the scheme.'),
            explanation: text(
                'Pri \\(t=\\tfrac12\\) je prva točka vsake vrstice kontrolna točka levega dela, zadnja točka vsake vrstice pa kontrolna točka desnega dela. Za privzeto krivuljo dobimo levo \\((-4,-3)\\), \\(\\bigl(-\\tfrac72,0\\bigr)\\), \\(\\bigl(-\\tfrac74,\\tfrac32\\bigr)\\), \\(\\bigl(0,\\tfrac32\\bigr)\\).',
                'At \\(t=\\tfrac12\\) the first point of each row is a control point of the left part, and the last point of each row is a control point of the right part. For the default curve the left part gets \\((-4,-3)\\), \\(\\bigl(-\\tfrac72,0\\bigr)\\), \\(\\bigl(-\\tfrac74,\\tfrac32\\bigr)\\), \\(\\bigl(0,\\tfrac32\\bigr)\\).',
            ),
            formulaIds: ['sd-split-points'],
            frames: [frame('sd-read-rows-explanation', 'explanation'), frame('sd-read-rows-calculation', 'calculation'), frame('sd-read-rows-observation', 'observation')],
            workedExampleId: 'sd-half',
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči v shemi točke \\(\\bigl(-\\tfrac72,0\\bigr)\\) in \\(\\bigl(0,\\tfrac32\\bigr)\\) ter ugotovi, kateri vrstici pripadata.', 'Find the points \\(\\bigl(-\\tfrac72,0\\bigr)\\) and \\(\\bigl(0,\\tfrac32\\bigr)\\) in the scheme and decide which rows they belong to.'),
            expectedObservations: [text('Točka \\(\\bigl(-\\tfrac72,0\\bigr)\\) je prva točka prve vrstice, točka \\(\\bigl(0,\\tfrac32\\bigr)\\) pa je zadnja vrstica, torej \\(B(\\tfrac12)\\) na krivulji.', 'The point \\(\\bigl(-\\tfrac72,0\\bigr)\\) is the first point of the first row, and the point \\(\\bigl(0,\\tfrac32\\bigr)\\) is the last row, that is \\(B(\\tfrac12)\\) on the curve.')],
            scene: {
                id: 'sd-t-half', basedOn: 'demonstration-default',
                actions: [{name: 'set-subdivision-parameter', value: 0.5}],
                expectedState: text('Shema je prikazana pri \\(t=\\tfrac12\\).', 'The scheme is shown at \\(t=\\tfrac12\\).'),
            },
        },
        {
            id: 'sd-split-half', order: 4,
            title: text('Rez na sredini', 'A cut at the middle'),
            purpose: text('Videti obe novi krivulji in preveriti, da skupaj dasta izvirno krivuljo.', 'Seeing both new curves and checking that together they give the original curve.'),
            explanation: text(
                'Gumb Subdiviziraj pri \\(t=\\tfrac12\\) nadomesti krivuljo z dvema. Levi del je \\(L(u)=B(\\tfrac{u}{2})\\), desni del pa \\(R(u)=B\\bigl(\\tfrac{1+u}{2}\\bigr)\\). Skupaj natanko prekrijeta izvirno krivuljo, ki se ni spremenila.',
                'The Subdivide button at \\(t=\\tfrac12\\) replaces the curve with two. The left part is \\(L(u)=B(\\tfrac{u}{2})\\) and the right part is \\(R(u)=B\\bigl(\\tfrac{1+u}{2}\\bigr)\\). Together they cover the original curve exactly, and it has not changed.',
            ),
            formulaIds: ['sd-reparameterization'],
            frames: [frame('sd-split-half-explanation', 'explanation'), frame('sd-split-half-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri, da je oblika enaka kot pred rezom, in poišči skupno točko obeh delov.', 'Check that the shape is the same as before the cut and find the point shared by the two parts.'),
            expectedObservations: [text('Prikazani sta dve krivulji z osmimi kontrolnimi točkami; oblika je enaka, skupna točka je \\(\\bigl(0,\\tfrac32\\bigr)\\).', 'Two curves with eight control points are shown; the shape is the same, and the shared point is \\(\\bigl(0,\\tfrac32\\bigr)\\).')],
            scene: {
                id: 'sd-after-half', basedOn: 'demonstration-default',
                actions: [{name: 'set-subdivision-parameter', value: 0.5}, {name: 'subdivide', value: true}],
                expectedState: text('Krivulja je razrezana na dva dela pri \\(t=\\tfrac12\\).', 'The curve is cut into two parts at \\(t=\\tfrac12\\).'),
            },
        },
        {
            id: 'sd-split-uneven', order: 5,
            title: text('Neenak rez in omejitve', 'An uneven cut and its limits'),
            purpose: text('Pokazati, da \\(t\\) določa velikost delov, in opozoriti na stanje po rezu.', 'Showing that \\(t\\) decides the size of the parts, and pointing out the state after a cut.'),
            explanation: text(
                'Pri \\(t=\\tfrac{3}{10}\\) je levi del \\(B(\\tfrac{3u}{10})\\), krajši interval parametra, desni pa \\(B(\\tfrac{3}{10}+\\tfrac{7u}{10})\\). Po rezu se parameter \\(t\\) postavi na 1 in shema se skrije; za nov rez najprej izberi nov \\(t\\). Drsnik sega le od 0,01 do 0,99, ker se pri \\(t=0\\) ali \\(t=1\\) del skrči v točko.',
                'At \\(t=\\tfrac{3}{10}\\) the left part is \\(B(\\tfrac{3u}{10})\\), a shorter parameter interval, and the right part is \\(B(\\tfrac{3}{10}+\\tfrac{7u}{10})\\). After a cut the parameter \\(t\\) is set to 1 and the scheme is hidden; choose a new \\(t\\) before another cut. The slider only spans 0.01 to 0.99 because at \\(t=0\\) or \\(t=1\\) one part collapses to a point.',
            ),
            formulaIds: ['sd-reparameterization'],
            frames: [frame('sd-split-uneven-explanation', 'explanation'), frame('sd-split-uneven-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj velikost obeh delov in preveri, da ima njuna skupna točka koordinate \\(B(\\tfrac{3}{10})\\).', 'Compare the size of the two parts and check that their shared point is \\(B(\\tfrac{3}{10})\\).'),
            expectedObservations: [text('Levi del je krajši od desnega; skupna točka je približno \\((-2{,}02;\\ 0{,}78)\\), shema je skrita, drsnik pa je na 1.', 'The left part is shorter than the right one; the shared point is about \\((-2.02,\\ 0.78)\\), the scheme is hidden, and the slider is at 1.')],
            scene: {
                id: 'sd-after-third', basedOn: 'demonstration-default',
                actions: [{name: 'set-subdivision-parameter', value: 0.3}, {name: 'subdivide', value: true}],
                expectedState: text('Krivulja je razrezana na dva dela pri \\(t=\\tfrac{3}{10}\\).', 'The curve is cut into two parts at \\(t=\\tfrac{3}{10}\\).'),
            },
        },
    ],
    sources: [
        farinSource(['de Casteljau subdivision of Bézier curves', 'control points of the subcurves'], 'PolynomialBezierCurve.subdivide(t) takes the first and the reversed last points of the de Casteljau rows as the control points of the two parts.'),
        pbpSource(['subdivision of Bézier curves', 'reparameterization of the pieces']),
        {
            id: 'bezeg-subdivision-implementation',
            citation: 'Bezeg source: src/graphs/curves/bezier/SubdivisionGraph1.tsx and src/bezeg/impl/curve/polynomial-bezier-curve.ts.',
            supports: ['Subdivide button', 'subdivision parameter t slider', 'scheme switch'],
        },
    ],
    edgeCases: [
        text('Po rezu se parameter \\(t\\) postavi na 1 in shema se skrije; nov rez zahteva nov izbor \\(t\\) iz \\([0{,}01;\\ 0{,}99]\\).', 'After a cut the parameter \\(t\\) is set to 1 and the scheme is hidden; another cut needs a new choice of \\(t\\) from \\([0.01,\\ 0.99]\\).'),
        text('Dela se v točki reza stikata zvezno in sta le delčka iste gladke krivulje; če kasneje premakneš kontrolne točke enega dela, se stik lahko zlomi.', 'The parts meet continuously at the cut and are only pieces of one smooth curve; if you later move the control points of one part, the joint can develop a corner.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenski izraz »subdivizija« (v aplikaciji) proti izrazu »razdelitev« v literaturi.', 'Before classroom-ready review, confirm the Slovenian term "subdivizija" used in the app against "razdelitev" in the literature.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// repeated-subdivision
// ---------------------------------------------------------------------------------------------

const repeatedSubdivision: GuidedLesson = {
    demonstrationId: 'repeated-subdivision',
    title: text('Zaporedna subdivizija', 'Repeated subdivision'),
    summary: text(
        'Vsak korak razpolovi vsak kos krivulje pri \\(t=\\tfrac12\\). Po \\(k\\) korakih je \\(2^k\\) kosov, njihovi kontrolni poligoni pa se krivulji približujejo vsakič približno štirikrat bolj.',
        'Each step halves every piece of the curve at \\(t=\\tfrac12\\). After \\(k\\) steps there are \\(2^k\\) pieces, and their control polygons approach the curve about four times closer with each step.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje subdivizije Bézierjeve krivulje pri izbranem \\(t\\).', 'Assumes familiarity with subdividing a Bézier curve at a chosen \\(t\\).'),
        text('Priporočeno je, da razumeš kontrolni poligon kot grobo skico krivulje.', 'It helps to see the control polygon as a rough sketch of the curve.'),
    ],
    learningGoals: [
        text('Napoveš, da je po \\(k\\) korakih \\(2^k\\) kosov in da vsak pokriva \\(2^{-k}\\) parametričnega intervala.', 'Predict that after \\(k\\) steps there are \\(2^k\\) pieces and each covers \\(2^{-k}\\) of the parameter interval.'),
        text('Razložiš, zakaj se kontrolni poligoni krivulji približujejo in da se razdalja zmanjša približno za faktor 4 na korak.', 'Explain why the control polygons approach the curve and that the distance shrinks by about a factor of 4 per step.'),
        text('Poveš, da je v aplikaciji na voljo največ pet korakov.', 'State that the app offers at most five steps.'),
    ],
    formulaBlocks: [
        {
            id: 'rs-pieces',
            latex: '\\text{pieces after }k\\text{ steps: }2^k,\\qquad \\text{piece }j\\text{ traces }B\\ \\text{on}\\ \\Bigl[\\tfrac{j}{2^k},\\tfrac{j+1}{2^k}\\Bigr],\\quad j=0,\\dots,2^k-1',
            notation: text(
                'Število korakov \\(k\\) je od 0 do 5; kos \\(j\\) je krivulja \\(B\\), zožena na majhen interval parametra.',
                'The number of steps \\(k\\) runs from 0 to 5; piece \\(j\\) is the curve \\(B\\) restricted to a small parameter interval.',
            ),
            explanation: text(
                'Vsak kos je Bézierjeva krivulja iste stopnje, ki natanko sledi krivulji \\(B\\), zato vsi kosi skupaj ostanejo prekrivni z izvirno krivuljo.',
                'Each piece is a Bézier curve of the same degree that follows \\(B\\) exactly, so all pieces together still cover the original curve.',
            ),
        },
        {
            id: 'rs-distance',
            latex: 'd_k=\\max_{j,i}\\Bigl\\|Q_{j,i}-B\\Bigl(\\tfrac{j+i/3}{2^k}\\Bigr)\\Bigr\\|,\\qquad i=0,1,2,3',
            notation: text(
                '\\(Q_{j,i}\\) je \\(i\\)-ta kontrolna točka kosa \\(j\\); točka \\(B\\bigl(\\tfrac{j+i/3}{2^k}\\bigr)\\) je točka krivulje pri pripadajočem parametru.',
                '\\(Q_{j,i}\\) is the \\(i\\)-th control point of piece \\(j\\); the point \\(B\\bigl(\\tfrac{j+i/3}{2^k}\\bigr)\\) is the curve point at the matching parameter.',
            ),
            explanation: text(
                'Število \\(d_k\\) meri, kako daleč je najbolj oddaljena kontrolna točka od krivulje. Ker se \\(d_k\\) pri vsakem koraku zmanjša približno na četrtino, se kontrolni poligoni kvadratično približujejo krivulji.',
                'The number \\(d_k\\) measures how far the most distant control point lies from the curve. Because \\(d_k\\) shrinks to about a quarter with each step, the control polygons approach the curve quadratically.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rs-distances',
            title: text('Primer: razdalje \\(d_k\\) na privzeti krivulji', 'Example: the distances \\(d_k\\) on the default curve'),
            calculationLatex: 'd_k=\\max_{j,i}\\bigl\\|Q_{j,i}-B\\bigl(\\tfrac{j+i/3}{2^k}\\bigr)\\bigr\\|,\\qquad \\tfrac{d_{k+1}}{d_k}\\approx\\tfrac14',
            resultLatex: 'd_0\\approx2.38,\\ d_1\\approx0.62,\\ d_2\\approx0.16,\\ d_3\\approx0.040,\\ d_4\\approx0.010,\\ d_5\\approx0.0025',
            check: text(
                'Razmerje zaporednih razdalj je blizu \\(\\tfrac14\\): po nekaj razpolovitvah poligon skoraj sovpade s krivuljo.',
                'The ratio of successive distances is close to \\(\\tfrac14\\): after a few halvings the polygon almost coincides with the curve.',
            ),
        },
    ],
    steps: [
        {
            id: 'rs-one-polygon', order: 1,
            title: text('Ena krivulja in njen poligon', 'One curve and its polygon'),
            purpose: text('Zapomniti si izhodišče, s katerim bomo primerjali kose.', 'Remembering the starting point against which the pieces will be compared.'),
            explanation: text(
                'Za začetek je ena krivulja s štirimi kontrolnimi točkami in prikazanim kontrolnim poligonom. Poligon je od krivulje precej oddaljen: največja razdalja \\(d_0\\) je približno 2,38.',
                'To begin there is one curve with four control points and its control polygon shown. The polygon is quite far from the curve: the largest distance \\(d_0\\) is about 2.38.',
            ),
            formulaIds: ['rs-distance'],
            frames: [frame('rs-one-polygon-explanation', 'explanation'), frame('rs-one-polygon-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Oceni, katera kontrolna točka je od krivulje najbolj oddaljena.', 'Estimate which control point is the farthest from the curve.'),
            expectedObservations: [text('Prikazana je ena krivulja; notranji kontrolni točki \\(P_1\\) in \\(P_2\\) ležita daleč nad njo.', 'One curve is shown; the inner control points \\(P_1\\) and \\(P_2\\) lie far above it.')],
            scene: {
                id: 'rs-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text('Privzeta krivulja s kontrolnim poligonom, nič korakov.', 'The default curve with its control polygon, no steps done.'),
            },
        },
        {
            id: 'rs-first-step', order: 2,
            title: text('Prvi korak: dva kosa', 'The first step: two pieces'),
            purpose: text('Videti, da razpolovitev da dva kosa z bližjima poligonoma.', 'Seeing that a halving gives two pieces with closer polygons.'),
            explanation: text(
                'Gumb Subdiviziraj naredi en korak: krivuljo razpolovi pri \\(t=\\tfrac12\\). Nastaneta \\(2^1=2\\) kosa, vsak ima svoj kontrolni poligon. Razdalja pade na \\(d_1\\approx0{,}62\\).',
                'The Subdivide button does one step: it halves the curve at \\(t=\\tfrac12\\). This gives \\(2^1=2\\) pieces, each with its own control polygon. The distance drops to \\(d_1\\approx0.62\\).',
            ),
            formulaIds: ['rs-pieces'],
            frames: [frame('rs-first-step-explanation', 'explanation'), frame('rs-first-step-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj oba nova poligona z izvirnim: ali sta bližje krivulji?', 'Compare the two new polygons with the original: are they closer to the curve?'),
            expectedObservations: [text('Prikazana sta dva kosa; oblika je enaka, poligona pa se krivulji tesneje prilegata.', 'Two pieces are shown; the shape is the same, and the polygons hug the curve more tightly.')],
            scene: {
                id: 'rs-after-one', basedOn: 'demonstration-default',
                actions: [{name: 'subdivide', value: true}],
                expectedState: text('Po enem koraku sta dva kosa.', 'After one step there are two pieces.'),
            },
        },
        {
            id: 'rs-measure', order: 3,
            title: text('Izmerjena razdalja do krivulje', 'The measured distance to the curve'),
            purpose: text('Izmeriti, kako hitro se poligoni približujejo krivulji.', 'Measuring how fast the polygons approach the curve.'),
            explanation: text(
                'Po dveh korakih je \\(2^2=4\\) kosov in \\(d_2\\approx0{,}16\\). Zaporedne razdalje \\(2{,}38\\), \\(0{,}62\\), \\(0{,}16\\) imajo razmerje blizu \\(\\tfrac14\\), torej se približevanje vsakič poveča za faktor 4.',
                'After two steps there are \\(2^2=4\\) pieces and \\(d_2\\approx0.16\\). The successive distances \\(2.38\\), \\(0.62\\), \\(0.16\\) have a ratio close to \\(\\tfrac14\\), so the approach improves by a factor of 4 each time.',
            ),
            formulaIds: ['rs-distance'],
            frames: [frame('rs-measure-explanation', 'explanation'), frame('rs-measure-calculation', 'calculation'), frame('rs-measure-observation', 'observation')],
            workedExampleId: 'rs-distances',
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej kose in ugotovi, ali je poligon še opazno oddaljen od krivulje.', 'Count the pieces and decide whether the polygon is still noticeably away from the curve.'),
            expectedObservations: [text('Prikazani so štirje kosi; poligoni so le še rahlo nad krivuljo.', 'Four pieces are shown; the polygons lie only slightly above the curve.')],
            scene: {
                id: 'rs-after-two', basedOn: 'demonstration-default',
                actions: [{name: 'subdivide', value: true}, {name: 'subdivide', value: true}],
                expectedState: text('Po dveh korakih so štirje kosi.', 'After two steps there are four pieces.'),
            },
        },
        {
            id: 'rs-eight-pieces', order: 4,
            title: text('Osem kosov', 'Eight pieces'),
            purpose: text('Opaziti, da poligoni skoraj sovpadejo s krivuljo.', 'Noticing that the polygons almost coincide with the curve.'),
            explanation: text(
                'Po treh korakih je \\(2^3=8\\) kosov in \\(d_3\\approx0{,}040\\). Kosi se tesno držijo krivulje, zato kontrolni poligon postane dober približek. Tako krivulje v računalniški grafiki pogosto izrišemo.',
                'After three steps there are \\(2^3=8\\) pieces and \\(d_3\\approx0.040\\). The pieces hug the curve closely, so the control polygon becomes a good approximation. This is how curves are often drawn in computer graphics.',
            ),
            formulaIds: ['rs-pieces'],
            frames: [frame('rs-eight-pieces-explanation', 'explanation'), frame('rs-eight-pieces-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Poskusi razločiti poligon od krivulje in preštej kose.', 'Try to tell the polygon from the curve and count the pieces.'),
            expectedObservations: [text('Prikazanih je osem kosov; poligon je komaj razločljiv od krivulje.', 'Eight pieces are shown; the polygon is barely distinguishable from the curve.')],
            scene: {
                id: 'rs-after-three', basedOn: 'demonstration-default',
                actions: [{name: 'subdivide', value: true}, {name: 'subdivide', value: true}, {name: 'subdivide', value: true}],
                expectedState: text('Po treh korakih je osem kosov.', 'After three steps there are eight pieces.'),
            },
        },
        {
            id: 'rs-step-limit', order: 5,
            title: text('Šestnajst kosov in meja korakov', 'Sixteen pieces and the step limit'),
            purpose: text('Pokazati rast števila kosov in omejitev aplikacije.', 'Showing the growth in the number of pieces and the limit of the app.'),
            explanation: text(
                'Štiri korake dajo \\(2^4=16\\) kosov in \\(d_4\\approx0{,}010\\). Aplikacija dovoli največ pet korakov, torej \\(2^5=32\\) kosov in \\(d_5\\approx0{,}0025\\); šesti korak zavrne, ker število kosov raste eksponentno.',
                'Four steps give \\(2^4=16\\) pieces and \\(d_4\\approx0.010\\). The app allows at most five steps, that is \\(2^5=32\\) pieces and \\(d_5\\approx0.0025\\); a sixth step is refused because the number of pieces grows exponentially.',
            ),
            formulaIds: ['rs-pieces', 'rs-distance'],
            frames: [frame('rs-step-limit-explanation', 'explanation'), frame('rs-step-limit-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Pritisni Subdiviziraj še enkrat in preštej, koliko kosov je zdaj.', 'Press Subdivide once more and count how many pieces there are now.'),
            expectedObservations: [text('Po štirih korakih je 16 kosov; peti korak da 32 kosov, nato se gumb ne odzove več.', 'After four steps there are 16 pieces; the fifth step gives 32 pieces, after which the button no longer responds.')],
            scene: {
                id: 'rs-after-four', basedOn: 'demonstration-default',
                actions: [{name: 'subdivide', value: true}, {name: 'subdivide', value: true}, {name: 'subdivide', value: true}, {name: 'subdivide', value: true}],
                expectedState: text('Po štirih korakih je 16 kosov.', 'After four steps there are 16 pieces.'),
            },
        },
    ],
    sources: [
        farinSource(['repeated subdivision', 'convergence of the control polygon to the curve']),
        pbpSource(['convergence of subdivided control polygons', 'quadratic convergence rate']),
        {
            id: 'bezeg-repeated-subdivision-implementation',
            citation: 'Bezeg source: src/graphs/curves/bezier/SubdivisionGraph.tsx.',
            supports: ['Subdivide button', 'five-step limit', 'control polygons switch'],
            implementationCorrespondence: 'SubdivisionGraph.subdivide() calls subdivide(1/2) on every current piece, so each step doubles the number of curves; stepsDone caps this at MAX_SUBDIVISION_STEPS = 5.',
        },
    ],
    edgeCases: [
        text('Razdalje \\(d_k\\) so izmerjene na privzeti krivulji; pri drugačni krivulji so števila drugačna, razmerje blizu \\(\\tfrac14\\) pa velja za gladke krivulje.', 'The distances \\(d_k\\) are measured on the default curve; other curves give other numbers, although a ratio near \\(\\tfrac14\\) holds for smooth curves.'),
        text('Po petih korakih gumb Subdiviziraj ne naredi ničesar več.', 'After five steps the Subdivide button does nothing more.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi trditev o kvadratični konvergenci za splošne Bézierjeve krivulje in izbiro merila \\(d_k\\).', 'Before classroom-ready review, confirm the claim of quadratic convergence for general Bézier curves and the choice of the measure \\(d_k\\).'),
    ],
};

// ---------------------------------------------------------------------------------------------
// rational-subdivision
// ---------------------------------------------------------------------------------------------

const rationalSubdivision: GuidedLesson = {
    demonstrationId: 'rational-subdivision',
    title: text('Subdivizija racionalne Bézierjeve krivulje', 'Subdivision of a rational Bézier curve'),
    summary: text(
        'Racionalno krivuljo razrežemo z Decasteljaujevo shemo v homogenih koordinatah \\((w_iP_i,\\ w_i)\\). Nastala dela sta racionalni krivulji z novimi točkami in utežmi, ki na delih intervala natanko ujemata izvirno krivuljo.',
        'A rational curve is cut with the de Casteljau scheme in homogeneous coordinates \\((w_iP_i,\\ w_i)\\). The two parts are rational curves with new points and weights that match the original curve exactly on parts of the interval.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje subdivizije Bézierjeve krivulje in racionalne krivulje z utežmi \\(w_i\\).', 'Assumes familiarity with subdividing a Bézier curve and with a rational curve with weights \\(w_i\\).'),
        text('Priporočeno je, da veš, kako utež \\(w_i\\) privlači krivuljo k točki \\(P_i\\).', 'It helps to know how a weight \\(w_i\\) pulls the curve toward the point \\(P_i\\).'),
    ],
    learningGoals: [
        text('Razložiš, da subdivizijo izvedemo v homogenih koordinatah in nato delimo z zadnjo koordinato.', 'Explain that subdivision is carried out in homogeneous coordinates followed by division by the last coordinate.'),
        text('Izračunaš kontrolne točke in uteži obeh delov pri \\(t=\\tfrac12\\) za privzeto krivuljo.', 'Compute the control points and weights of both parts at \\(t=\\tfrac12\\) for the default curve.'),
        text('Poveš, da se uteži delov razlikujejo od izvirnih, krivulja pa ostane enaka.', 'State that the weights of the parts differ from the original ones while the curve stays the same.'),
    ],
    formulaBlocks: [
        {
            id: 'rsd-homogeneous-scheme',
            latex: 'H_i=(w_iP_i,\\ w_i),\\qquad h_i^r=(1-t)\\,h_i^{r-1}+t\\,h_{i+1}^{r-1},\\qquad Q=\\frac{(x,y)}{w}\\ \\text{for}\\ h=(x,y,w)',
            notation: text(
                'Točke \\(H_i\\) so homogene kontrolne točke, \\(h_i^r\\) so točke sheme, delitev z zadnjo koordinato \\(w\\) pa da pravo točko in njeno utež.',
                'The points \\(H_i\\) are homogeneous control points, the \\(h_i^r\\) are the points of the scheme, and division by the last coordinate \\(w\\) gives the actual point and its weight.',
            ),
            explanation: text(
                'Shema je ista kot pri navadni krivulji, le da jo računamo na treh koordinatah. Zadnja koordinata je utež nove točke.',
                'The scheme is the same as for an ordinary curve, only computed on three coordinates. The last coordinate is the weight of the new point.',
            ),
        },
        {
            id: 'rsd-junction-weight',
            latex: 'w_{\\text{junction}}=\\sum_{i=0}^{n}b_{i,n}(t)\\,w_i,\\qquad b_{i,n}(t)=\\binom ni(1-t)^{n-i}t^i',
            notation: text(
                'Utež skupne točke obeh delov je imenovalec izvirne racionalne krivulje pri \\(t\\); \\(b_{i,n}\\) so Bernsteinovi polinomi.',
                'The weight of the point shared by the two parts is the denominator of the original rational curve at \\(t\\); the \\(b_{i,n}\\) are Bernstein polynomials.',
            ),
            explanation: text(
                'Skupna točka je \\(B(t)\\) racionalne krivulje, njena utež pa je imenovalec, s katerim smo delili.',
                'The shared point is \\(B(t)\\) of the rational curve, and its weight is the denominator we divided by.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rsd-half',
            title: text('Primer: uteži \\((1,2,1,1)\\), \\(t=\\tfrac12\\)', 'Example: weights \\((1,2,1,1)\\), \\(t=\\tfrac12\\)'),
            calculationLatex: 'w^1=\\tfrac32,\\tfrac32,1;\\quad w^2=\\tfrac32,\\tfrac54;\\quad w^3=\\tfrac{11}8;\\qquad \\text{e.g. } Q_1=\\frac{\\tfrac12(-4,-3)+\\tfrac12\\cdot2(-3,3)}{3/2}=\\bigl(-\\tfrac{10}3,1\\bigr)',
            resultLatex: '\\text{left: }(-4,-3)_{1},\\bigl(-\\tfrac{10}3,1\\bigr)_{3/2},\\bigl(-\\tfrac{13}6,2\\bigr)_{3/2},\\bigl(-\\tfrac9{11},\\tfrac{21}{11}\\bigr)_{11/8};\\quad \\text{right: }\\bigl(-\\tfrac9{11},\\tfrac{21}{11}\\bigr)_{11/8},\\bigl(\\tfrac45,\\tfrac95\\bigr)_{5/4},\\bigl(\\tfrac72,0\\bigr)_{1},(4,-3)_{1}',
            check: text(
                'Pri vsaki točki je v indeksu njena utež. Skupna točka ima utež \\(\\tfrac{11}{8}\\), enako imenovalcu izvirne krivulje \\(\\tfrac18+\\tfrac68+\\tfrac38+\\tfrac18\\) pri \\(t=\\tfrac12\\).',
                'The subscript of each point is its weight. The shared point has weight \\(\\tfrac{11}{8}\\), equal to the denominator of the original curve \\(\\tfrac18+\\tfrac68+\\tfrac38+\\tfrac18\\) at \\(t=\\tfrac12\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'rsd-weighted-curve', order: 1,
            title: text('Racionalna krivulja z utežmi', 'A rational curve with weights'),
            purpose: text('Videti izhodišče: točke, uteži in shemo.', 'Seeing the starting point: points, weights and the scheme.'),
            explanation: text(
                'Privzeta racionalna krivulja ima iste kontrolne točke kot navadna, uteži pa so \\((1,2,1,1)\\): druga točka močneje privlači krivuljo. Prikazana je shema pri \\(t=\\tfrac12\\).',
                'The default rational curve has the same control points as the ordinary one, and its weights are \\((1,2,1,1)\\): the second point pulls the curve more strongly. The scheme at \\(t=\\tfrac12\\) is shown.',
            ),
            formulaIds: ['rsd-homogeneous-scheme'],
            frames: [frame('rsd-weighted-curve-explanation', 'explanation'), frame('rsd-weighted-curve-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži ob točkah in primerjaj z navadno krivuljo: kje se krivulja bolj približa točki \\(P_1\\)?', 'Read the weights next to the points and compare with the ordinary curve: where does the curve come closer to the point \\(P_1\\)?'),
            expectedObservations: [text('Utež \\(w_1=2\\) potegne krivuljo bližje drugi kontrolni točki kot pri enakih utežeh.', 'The weight \\(w_1=2\\) pulls the curve closer to the second control point than with equal weights.')],
            scene: {
                id: 'rsd-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-weights', value: true}],
                expectedState: text('Privzeta racionalna krivulja z uteži in shemo pri \\(t=\\tfrac12\\).', 'The default rational curve with weights and the scheme at \\(t=\\tfrac12\\).'),
            },
        },
        {
            id: 'rsd-homogeneous-rule', order: 2,
            title: text('Shema v homogenih koordinatah', 'The scheme in homogeneous coordinates'),
            purpose: text('Pojasniti, kako se uteži vključijo v rez.', 'Explaining how the weights enter the cut.'),
            explanation: text(
                'Vsako točko zapišemo kot \\((w_iP_i,\\ w_i)\\) in v tej obliki izvedemo isto shemo kot pri navadni krivulji. Šele nato delimo s \\(w\\). Tako shema pri racionalnih krivuljah da tudi nove uteži. Pri enakih utežeh so vse zadnje koordinate enake 1 in shema je navadna subdivizija; uteži delov se spremenijo le, kadar so izvirne uteži različne.',
                'Each point is written as \\((w_iP_i,\\ w_i)\\) and the same scheme as for an ordinary curve is run in that form. Only afterward do we divide by \\(w\\). This is how the scheme gives the new weights as well. With equal weights all last coordinates equal 1 and the scheme is ordinary subdivision; the weights of the parts change only when the original weights differ.',
            ),
            formulaIds: ['rsd-homogeneous-scheme'],
            frames: [frame('rsd-homogeneous-rule-explanation', 'explanation'), frame('rsd-homogeneous-rule-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Premakni drsnik \\(t\\) in opazuj, kako shema sledi uteženim točkam.', 'Move the \\(t\\) slider and watch how the scheme follows the weighted points.'),
            expectedObservations: [text('Točke sheme ležijo bližje točki \\(P_1\\), kot bi ležale pri enakih utežeh.', 'The scheme points lie nearer to the point \\(P_1\\) than they would with equal weights.')],
            scene: {
                id: 'rsd-t-half', basedOn: 'demonstration-default',
                actions: [{name: 'show-weights', value: true}, {name: 'set-subdivision-parameter', value: 0.5}],
                expectedState: text('Shema je prikazana pri \\(t=\\tfrac12\\), uteži so vidne.', 'The scheme is shown at \\(t=\\tfrac12\\), with the weights visible.'),
            },
        },
        {
            id: 'rsd-half-example', order: 3,
            title: text('Rez pri \\(t=\\tfrac12\\)', 'The cut at \\(t=\\tfrac12\\)'),
            purpose: text('Izračunati točke in uteži obeh delov in jih primerjati s prikazom.', 'Computing the points and weights of both parts and comparing them with the display.'),
            explanation: text(
                'Uteži vrstic sheme so \\(\\tfrac32,\\tfrac32,1\\), nato \\(\\tfrac32,\\tfrac54\\) in končno \\(\\tfrac{11}{8}\\). Levi del ima uteži \\((1,\\ \\tfrac32,\\ \\tfrac32,\\ \\tfrac{11}8)\\), desni pa \\((\\tfrac{11}8,\\ \\tfrac54,\\ 1,\\ 1)\\). Uteži delov se razlikujejo od \\((1,2,1,1)\\), krivulja pa ostane enaka. Pri enakih utežeh bi bila skupna točka navadna točka \\(B\\left(\\tfrac12\\right)=(0,\\,\\tfrac32)\\); utež 2 jo premakne v \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\).',
                'The weights of the rows of the scheme are \\(\\tfrac32,\\tfrac32,1\\), then \\(\\tfrac32,\\tfrac54\\) and finally \\(\\tfrac{11}{8}\\). The left part has weights \\((1,\\ \\tfrac32,\\ \\tfrac32,\\ \\tfrac{11}8)\\) and the right one \\((\\tfrac{11}8,\\ \\tfrac54,\\ 1,\\ 1)\\). The weights of the parts differ from \\((1,2,1,1)\\), while the curve stays the same. With equal weights the shared point would be the ordinary point \\(B\\left(\\tfrac12\\right)=(0,\\,\\tfrac32)\\); the weight 2 moves it to \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\).',
            ),
            formulaIds: ['rsd-homogeneous-scheme', 'rsd-junction-weight'],
            frames: [frame('rsd-half-example-explanation', 'explanation'), frame('rsd-half-example-calculation', 'calculation'), frame('rsd-half-example-observation', 'observation')],
            workedExampleId: 'rsd-half',
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži ob novih kontrolnih točkah in poišči skupno točko obeh delov.', 'Read the weights next to the new control points and find the point shared by the two parts.'),
            expectedObservations: [text('Prikazani sta dve krivulji; skupna točka ima utež \\(\\tfrac{11}8\\), končni točki imata utež 1.', 'Two curves are shown; the shared point has weight \\(\\tfrac{11}8\\), and the end points have weight 1.')],
            scene: {
                id: 'rsd-after-half', basedOn: 'demonstration-default',
                actions: [{name: 'show-weights', value: true}, {name: 'set-subdivision-parameter', value: 0.5}, {name: 'subdivide', value: true}],
                expectedState: text('Krivulja je razrezana pri \\(t=\\tfrac12\\), uteži so vidne.', 'The curve is cut at \\(t=\\tfrac12\\), with the weights visible.'),
            },
        },
        {
            id: 'rsd-uneven-cut', order: 4,
            title: text('Neenak rez in utež skupne točke', 'An uneven cut and the weight of the shared point'),
            purpose: text('Preveriti, da utež skupne točke vedno enaka imenovalcu izvirne krivulje.', 'Checking that the weight of the shared point always equals the denominator of the original curve.'),
            explanation: text(
                'Pri \\(t=\\tfrac{3}{10}\\) je utež skupne točke imenovalec \\(\\sum b_{i,3}(t)\\,w_i\\), kar je približno \\(1{,}44\\). Levi del natanko sledi izvirni krivulji na \\([0,t]\\), desni na \\([t,1]\\), uteži teh dveh delov pa spet niso \\((1,2,1,1)\\).',
                'At \\(t=\\tfrac{3}{10}\\) the weight of the shared point is the denominator \\(\\sum b_{i,3}(t)\\,w_i\\), which is about \\(1.44\\). The left part follows the original curve exactly on \\([0,t]\\), the right one on \\([t,1]\\), and the weights of these two parts again differ from \\((1,2,1,1)\\).',
            ),
            formulaIds: ['rsd-junction-weight'],
            frames: [frame('rsd-uneven-cut-explanation', 'explanation'), frame('rsd-uneven-cut-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj utež skupne točke z utežmi končnih točk in z izračunano vrednostjo.', 'Compare the weight of the shared point with the weights of the end points and with the computed value.'),
            expectedObservations: [text('Levi del je krajši od desnega; utež skupne točke je približno \\(1{,}44\\), končni točki imata utež 1.', 'The left part is shorter than the right; the weight of the shared point is about \\(1.44\\), and the end points have weight 1.')],
            scene: {
                id: 'rsd-after-third', basedOn: 'demonstration-default',
                actions: [{name: 'show-weights', value: true}, {name: 'set-subdivision-parameter', value: 0.3}, {name: 'subdivide', value: true}],
                expectedState: text('Krivulja je razrezana pri \\(t=\\tfrac{3}{10}\\), uteži so vidne.', 'The curve is cut at \\(t=\\tfrac{3}{10}\\), with the weights visible.'),
            },
        },
    ],
    sources: [
        farinSource(['rational Bézier curves', 'homogeneous coordinates', 'subdivision of rational curves'], 'RationalBezierCurve.subdivide(t) runs the de Casteljau scheme on (w_iP_i, w_i), takes first and reversed last points of the rows, and divides by the last coordinate.'),
        pbpSource(['projective invariance of subdivision', 'rational Bézier curves']),
        {
            id: 'bezeg-rational-subdivision-implementation',
            citation: 'Bezeg source: src/graphs/curves/rational/RationalSubdivisionGraph2.tsx and src/bezeg/impl/curve/rational-bezier-curve.ts.',
            supports: ['Subdivide button', 'subdivision parameter t slider', 'weights switch'],
        },
    ],
    edgeCases: [
        text('Po rezu se parameter \\(t\\) postavi na 1 in shema se skrije; nov rez zahteva nov izbor \\(t\\).', 'After a cut the parameter \\(t\\) is set to 1 and the scheme is hidden; another cut needs a new choice of \\(t\\).'),
        text('Uteži delov niso povsod enake izvirnim; pri pozitivnih izvirnih utežeh ostanejo pozitivne, ker so pozitivne kombinacije.', 'The weights of the parts are not the original ones; with positive original weights they stay positive because they are positive combinations.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenski izraz za »homogene koordinate« in navedbo vira za racionalne krivulje.', 'Before classroom-ready review, confirm the Slovenian term for "homogeneous coordinates" and the source for rational curves.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// extrapolation
// ---------------------------------------------------------------------------------------------

/**
 * Extrapolation views around the route's default curve. At t=3/2 the curve's end reaches (1/2, -9.88) and at t=6/5 the
 * extended curve reaches y of about -8.5; after extrapolating at t=3/2 the control points span (-27.6, -32.8) to (8, 1.75).
 */
const extrapolationExampleView: LessonViewBox = [-5.5, 5.5, 5.5, -11];
const extrapolationLargeView: LessonViewBox = [-30, 8, 10, -35];

const extrapolation: GuidedLesson = {
    demonstrationId: 'extrapolation',
    title: text('Ekstrapolacija Bézierjeve krivulje', 'Extrapolation of a Bézier curve'),
    summary: text(
        'Decasteljaujeva shema pri parametru \\(t>1\\) da kontrolne točke krivulje \\(E(u)=B(tu)\\), ki podaljša izvirno krivuljo prek zadnje točke. Z večjim \\(t\\) se kontrolne točke hitro oddaljujejo, zato je ponujen le interval \\([1;\\ 1{,}5]\\).',
        'The de Casteljau scheme at a parameter \\(t>1\\) gives the control points of the curve \\(E(u)=B(tu)\\), which extends the original curve beyond its last point. As \\(t\\) grows the control points move away quickly, so only the interval \\([1,1.5]\\) is offered.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Decasteljaujeve sheme in subdivizije Bézierjeve krivulje.', 'Assumes familiarity with the de Casteljau scheme and the subdivision of a Bézier curve.'),
        text('Priporočeno je, da veš, da polinom \\(B(t)\\) obstaja tudi zunaj intervala \\([0,1]\\).', 'It helps to know that the polynomial \\(B(t)\\) also exists outside the interval \\([0,1]\\).'),
    ],
    learningGoals: [
        text('Razložiš, da shema pri \\(t>1\\) deluje enako kot pri \\(t\\le1\\) in da zadnja vrstica da točko \\(B(t)\\) zunaj krivulje.', 'Explain that the scheme works the same for \\(t>1\\) as for \\(t\\le1\\) and that the last row gives a point \\(B(t)\\) beyond the curve.'),
        text('Poveš, da je \\(E(u)=B(tu)\\), torej da nova krivulja ponovi izvirno na \\(u\\in[0,\\tfrac1t]\\).', 'State that \\(E(u)=B(tu)\\), so the new curve retraces the original on \\(u\\in[0,\\tfrac1t]\\).'),
        text('Pojasniš, zakaj se kontrolne točke z večjim \\(t\\) hitro oddaljijo.', 'Explain why the control points move away quickly as \\(t\\) grows.'),
    ],
    formulaBlocks: [
        {
            id: 'ex-scheme',
            latex: 'b_i^0=P_i,\\qquad b_i^r=(1-t)\\,b_i^{r-1}+t\\,b_{i+1}^{r-1},\\qquad t>1,\\qquad E\\ \\text{has control points}\\ b_0^0,b_0^1,\\dots,b_0^n',
            notation: text(
                'Ista rekurzija kot pri subdiviziji; \\(n\\) je stopnja, \\(P_i\\) so kontrolne točke, \\(t\\) je tokrat večji od 1.',
                'The same recursion as in subdivision; \\(n\\) is the degree, the \\(P_i\\) are the control points, and \\(t\\) is now larger than 1.',
            ),
            explanation: text(
                'Za \\(t>1\\) sta uteži \\(1-t\\) in \\(t\\) ena negativna in ena večja od 1, zato točke ležijo zunaj daljic med prejšnjimi.',
                'For \\(t>1\\) the weights \\(1-t\\) and \\(t\\) are one negative and one larger than 1, so the points lie outside the segments between the previous ones.',
            ),
        },
        {
            id: 'ex-reparameterization',
            latex: 'E(u)=B(tu),\\qquad E(1)=B(t),\\qquad E(u)=B(tu)\\ \\text{retraces}\\ B\\ \\text{for}\\ u\\in\\bigl[0,\\tfrac1t\\bigr]',
            notation: text(
                'Parameter \\(u\\) teče od 0 do 1 po novi krivulji, \\(t\\) je razteg parametra.',
                'The parameter \\(u\\) runs from 0 to 1 along the new curve, and \\(t\\) is the stretch of the parameter.',
            ),
            explanation: text(
                'Nova krivulja je isti polinom, le hitreje prehodi parameter. Končna točka je \\(B(t)\\) zunaj izvirne krivulje.',
                'The new curve is the same polynomial run through its parameter faster. Its end point is \\(B(t)\\), beyond the original curve.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'ex-twelve-tenths',
            title: text('Primer: privzeta krivulja, \\(t=\\tfrac65\\)', 'Example: the default curve, \\(t=\\tfrac65\\)'),
            calculationLatex: 'P=(-4,-2),(-3,3),(2,3),(3,-1);\\ b^1=\\bigl(-\\tfrac{14}5,4\\bigr),(3,3),\\bigl(\\tfrac{16}5,-\\tfrac95\\bigr);\\ b^2=\\bigl(\\tfrac{104}{25},\\tfrac{14}5\\bigr),\\bigl(\\tfrac{81}{25},-\\tfrac{69}{25}\\bigr);\\ b^3=\\bigl(\\tfrac{382}{125},-\\tfrac{484}{125}\\bigr)',
            resultLatex: 'E:\\ (-4,-2),\\ \\bigl(-\\tfrac{14}5,4\\bigr),\\ \\bigl(\\tfrac{104}{25},\\tfrac{14}5\\bigr),\\ \\bigl(\\tfrac{382}{125},-\\tfrac{484}{125}\\bigr)',
            check: text(
                'Zadnja točka je \\(B(\\tfrac65)\\approx(3{,}06;\\ -3{,}87)\\), torej zunaj izvirne krivulje, ki se konča v \\((3,-1)\\).',
                'The last point is \\(B(\\tfrac65)\\approx(3.06,\\ -3.87)\\), that is beyond the original curve, which ends at \\((3,-1)\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'ex-marker', order: 1,
            title: text('Točka zunaj krivulje', 'A point beyond the curve'),
            purpose: text('Videti, da polinom sega prek zadnje točke.', 'Seeing that the polynomial reaches past the last point.'),
            explanation: text(
                'Na privzeti krivulji je prikazana točka pri \\(t=\\tfrac65\\). Ker je \\(t>1\\), leži zunaj narisanega loka: to je točka \\(B(\\tfrac65)\\) podaljška krivulje.',
                'On the default curve a point at \\(t=\\tfrac65\\) is shown. Because \\(t>1\\), it lies outside the drawn arc: it is the point \\(B(\\tfrac65)\\) of the continuation of the curve.',
            ),
            formulaIds: ['ex-reparameterization'],
            frames: [frame('ex-marker-explanation', 'explanation'), frame('ex-marker-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči označeno točko in ugotovi, na kateri strani krivulje leži.', 'Find the marked point and decide on which side of the curve it lies.'),
            expectedObservations: [text('Točka leži za končno točko krivulje, v smeri njenega nadaljevanja.', 'The point lies past the end point of the curve, in the direction of its continuation.')],
            scene: {
                id: 'ex-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text('Privzeta krivulja s točko pri \\(t=\\tfrac65\\).', 'The default curve with the point at \\(t=\\tfrac65\\).'),
            },
        },
        {
            id: 'ex-farther', order: 2,
            title: text('Večji \\(t\\), večji doseg', 'A larger \\(t\\), a longer reach'),
            purpose: text('Opaziti, kako točka beži z večjim \\(t\\).', 'Noticing how the point runs away as \\(t\\) grows.'),
            explanation: text(
                'Pri \\(t=\\tfrac32\\), največji ponujeni vrednosti, je točka \\(B(\\tfrac32)\\) že \\((0{,}5;\\ -9{,}88)\\), daleč pod krivuljo. Drsnik zato sega le od 1 do 1,5.',
                'At \\(t=\\tfrac32\\), the largest offered value, the point \\(B(\\tfrac32)\\) is already \\((0.5,\\ -9.88)\\), far below the curve. The slider therefore only spans 1 to 1.5.',
            ),
            formulaIds: ['ex-reparameterization'],
            frames: [frame('ex-farther-explanation', 'explanation'), frame('ex-farther-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Premikaj drsnik \\(t\\) med 1 in 1,5 ter spremljaj, kako hitro točka beži.', 'Move the \\(t\\) slider between 1 and 1.5 and watch how fast the point runs away.'),
            expectedObservations: [text('Z naraščajočim \\(t\\) se točka vse hitreje oddaljuje od krivulje; pri \\(t=\\tfrac32\\) je lahko zunaj vidnega območja.', 'As \\(t\\) grows the point moves away from the curve ever faster; at \\(t=\\tfrac32\\) it may be outside the visible area.')],
            scene: {
                id: 'ex-t-max', basedOn: 'demonstration-default', view: extrapolationExampleView,
                actions: [{name: 'set-extrapolation-parameter', value: 1.5}],
                expectedState: text('Točka je prikazana pri \\(t=\\tfrac32\\).', 'The point is shown at \\(t=\\tfrac32\\).'),
            },
        },
        {
            id: 'ex-extend', order: 3,
            title: text('Podaljšana krivulja', 'The extended curve'),
            purpose: text('Izračunati kontrolne točke podaljšane krivulje in jo primerjati z izvirno.', 'Computing the control points of the extended curve and comparing it with the original.'),
            explanation: text(
                'Gumb Ekstrapoliraj pri \\(t=\\tfrac65\\) nadomesti krivuljo z \\(E(u)=B(\\tfrac{6u}{5})\\). Nove kontrolne točke so prvi členi vrstic sheme. Zadnja kontrolna točka \\(E(1)=B(\\tfrac65)\\) je prej označena točka zunaj krivulje.',
                'The Extrapolate button at \\(t=\\tfrac65\\) replaces the curve with \\(E(u)=B(\\tfrac{6u}{5})\\). The new control points are the first entries of the rows of the scheme. The last control point \\(E(1)=B(\\tfrac65)\\) is the previously marked point beyond the curve.',
            ),
            formulaIds: ['ex-scheme', 'ex-reparameterization'],
            frames: [frame('ex-extend-explanation', 'explanation'), frame('ex-extend-calculation', 'calculation'), frame('ex-extend-observation', 'observation')],
            workedExampleId: 'ex-twelve-tenths',
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri, da nova krivulja najprej ponovi izvirno in nato nadaljuje prek njenega konca.', 'Check that the new curve first retraces the original and then continues past its end.'),
            expectedObservations: [text('Še vedno je ena krivulja s štirimi kontrolnimi točkami; začetek je isti, konec pa je za \\((3{,}06;\\ -3{,}87)\\).', 'There is still one curve with four control points; the start is the same, and the end is at \\((3.06,\\ -3.87)\\).')],
            scene: {
                id: 'ex-after-twelve-tenths', basedOn: 'demonstration-default', view: extrapolationExampleView,
                actions: [{name: 'set-extrapolation-parameter', value: 1.2}, {name: 'extrapolate', value: true}],
                expectedState: text('Krivulja je podaljšana pri \\(t=\\tfrac65\\).', 'The curve is extended at \\(t=\\tfrac65\\).'),
            },
        },
        {
            id: 'ex-large-extension', order: 4,
            title: text('Največji podaljšek', 'The largest extension'),
            purpose: text('Pokazati, kako se kontrolne točke zelo oddaljijo, čeprav je krivulja samo malo daljša.', 'Showing how the control points move very far although the curve is only slightly longer.'),
            explanation: text(
                'Pri \\(t=\\tfrac32\\) so nove kontrolne točke \\((-4,-2)\\), \\((-2{,}5;\\ 5{,}5)\\), \\((8;\\ 1{,}75)\\) in \\((0{,}5;\\ -9{,}875)\\). Krivulja \\(E(u)=B(\\tfrac{3u}{2})\\) ponovi izvirno na \\(u\\in[0,\\tfrac23]\\), preostanek pa je podaljšek. Za še večje \\(t\\) bi se kontrolne točke odselile še dlje.',
                'At \\(t=\\tfrac32\\) the new control points are \\((-4,-2)\\), \\((-2.5,\\ 5.5)\\), \\((8,\\ 1.75)\\) and \\((0.5,\\ -9.875)\\). The curve \\(E(u)=B(\\tfrac{3u}{2})\\) retraces the original on \\(u\\in[0,\\tfrac23]\\), and the rest is the extension. For still larger \\(t\\) the control points would move even farther.',
            ),
            formulaIds: ['ex-reparameterization'],
            frames: [frame('ex-large-extension-explanation', 'explanation'), frame('ex-large-extension-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj lego kontrolnih točk z lego pri \\(t=\\tfrac65\\) in poišči, kje se podaljšek loči od izvirne krivulje.', 'Compare the positions of the control points with those at \\(t=\\tfrac65\\) and find where the extension departs from the original curve.'),
            expectedObservations: [text('Kontrolne točke so veliko dlje od krivulje kot pri \\(t=\\tfrac65\\); nekatere so lahko zunaj vidnega območja.', 'The control points are much farther from the curve than at \\(t=\\tfrac65\\); some may be outside the visible area.')],
            scene: {
                id: 'ex-after-three-halves', basedOn: 'demonstration-default', view: extrapolationLargeView,
                actions: [{name: 'set-extrapolation-parameter', value: 1.5}, {name: 'extrapolate', value: true}],
                expectedState: text('Krivulja je podaljšana pri \\(t=\\tfrac32\\).', 'The curve is extended at \\(t=\\tfrac32\\).'),
            },
        },
    ],
    sources: [
        farinSource(['extrapolation with the de Casteljau algorithm', 'Bézier curves outside [0,1]'], 'PolynomialBezierCurve.extrapolate(t) runs the de Casteljau scheme at t and takes the first point of every row as a control point of the new curve.'),
        pbpSource(['de Casteljau algorithm for parameters outside [0,1]', 'reparameterization of Bézier curves']),
        {
            id: 'bezeg-extrapolation-implementation',
            citation: 'Bezeg source: src/graphs/curves/bezier/ExtrapolationGraph.tsx and src/bezeg/impl/curve/polynomial-bezier-curve.ts.',
            supports: ['Extrapolate button', 'extrapolation slider from 1 to 1.5', 'extrapolation point'],
        },
    ],
    edgeCases: [
        text('Ponujen je le \\(t\\in[1;\\ 1{,}5]\\); pri večjem \\(t\\) bi kontrolne točke ušle iz razumnega območja grafa.', 'Only \\(t\\in[1,\\ 1.5]\\) is offered; for larger \\(t\\) the control points would leave any sensible range of the graph.'),
        text('Podaljšana krivulja ima obliko izvirnega polinoma, zato ni »nova« krivulja, le daljši odsek iste.', 'The extended curve has the shape of the original polynomial, so it is not a new curve, only a longer arc of the same one.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenski izraz »ekstrapolacija« za podaljšanje krivulje prek krajišča.', 'Before classroom-ready review, confirm the Slovenian term "ekstrapolacija" for extending a curve beyond its end point.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// rational-extrapolation
// ---------------------------------------------------------------------------------------------

/**
 * Rational extrapolation fixtures: the route's default curve (weights (1,2,1,1)) with views that contain every extended
 * control point. The scheme's third control point is (176/13, 33/13) at t=6/5 (x of about 13.54, outside the default view
 * [-5, 5, 5, -5]) and (-29.5, 6) with weight -1/2 at t=3/2. D(s) = 1 + 3s(1 - s)^2 >= 1 for s >= 0, with its only real root
 * at s of about -0.2229, outside the extended interval.
 */
const rationalExtrapolationFixture: LessonCurveFixture = {points: [[-4, -3], [-3, 3], [3, 3], [4, -1]], weights: [1, 2, 1, 1]};
const rationalExtrapolationExampleView: LessonViewBox = [-7, 8, 17, -6];
const rationalExtrapolationNegativeWeightView: LessonViewBox = [-34, 9, 6, -6];

const rationalExtrapolation: GuidedLesson = {
    demonstrationId: 'rational-extrapolation',
    title: text('Ekstrapolacija racionalne Bézierjeve krivulje', 'Extrapolation of a rational Bézier curve'),
    summary: text(
        'V homogenih koordinatah \\((w_iP_i,\\ w_i)\\) se ekstrapolacija izvede enako kot pri navadni krivulji in da krivuljo \\(E(u)=B(tu)\\). Nove uteži \\(1,\\ 1+t,\\ 1+2t-2t^2,\\ w(t)\\) lahko postanejo nepozitivne, a negativna utež kontrolne točke sama ni pol: pol bi bila ničla imenovalca \\(D\\) izvirne krivulje, ta pa je na podaljšanem intervalu \\([0,t]\\) pozitiven.',
        'In homogeneous coordinates \\((w_iP_i,\\ w_i)\\) extrapolation is carried out exactly as for an ordinary curve and gives the curve \\(E(u)=B(tu)\\). The new weights \\(1,\\ 1+t,\\ 1+2t-2t^2,\\ w(t)\\) can become non-positive, but a negative control weight is not itself a pole: a pole would be a zero of the denominator \\(D\\) of the original curve, and \\(D\\) is positive on the extended interval \\([0,t]\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje ekstrapolacije Bézierjeve krivulje in racionalne krivulje z utežmi.', 'Assumes familiarity with extrapolating a Bézier curve and with a rational curve with weights.'),
        text('Priporočeno je, da veš, da je racionalna krivulja količnik uteženega števca in imenovalca.', 'It helps to know that a rational curve is the quotient of a weighted numerator and a denominator.'),
    ],
    learningGoals: [
        text('Razložiš, da je podaljšek še vedno \\(B(tu)\\) in da sledi izvirni racionalni krivulji.', 'Explain that the extension is still \\(B(tu)\\) and follows the original rational curve.'),
        text('Izračunaš nove uteži pri \\(t=\\tfrac65\\) za privzeto krivuljo.', 'Compute the new weights at \\(t=\\tfrac65\\) for the default curve.'),
        text('Poveš, zakaj negativna utež nove predstavitve ni pol krivulje, preveriš imenovalec na celotnem podaljšanem intervalu in poveš, kaj izgubimo.', 'State why a negative weight of the new representation is not a pole of the curve, check the denominator on the whole extended interval, and say what is lost.'),
    ],
    formulaBlocks: [
        {
            id: 'rex-homogeneous',
            latex: 'H_i=(w_iP_i,\\ w_i),\\quad h^r_i=(1-t)\\,h^{r-1}_i+t\\,h^{r-1}_{i+1},\\quad E\\ \\text{has points}\\ \\frac{(x,y)}{w}\\ \\text{and weights}\\ w\\ \\text{from}\\ h^r_0=(x,y,w)',
            notation: text(
                'Ista shema kot pri navadni krivulji, le v homogenih koordinatah; nova kontrolna točka in utež sta prvi člen vsake vrstice, deljen z zadnjo koordinato.',
                'The same scheme as for an ordinary curve, only in homogeneous coordinates; each new control point and weight is the first entry of a row, divided by the last coordinate.',
            ),
            explanation: text(
                'Ker shema ohrani homogene koordinate, je \\(E(u)=B(tu)\\), kjer je \\(B\\) izvirna racionalna krivulja.',
                'Because the scheme keeps the homogeneous coordinates, we have \\(E(u)=B(tu)\\), where \\(B\\) is the original rational curve.',
            ),
        },
        {
            id: 'rex-weights',
            latex: 'w_0=1,\\quad w_1=1+t,\\quad w_2=1+2t-2t^2,\\quad w_3=w(t)=1+3t-6t^2+3t^3',
            notation: text(
                'Nove uteži za privzete uteži \\((1,2,1,1)\\); \\(w(t)\\) je imenovalec izvirne krivulje v točki \\(t\\).',
                'The new weights for the default weights \\((1,2,1,1)\\); \\(w(t)\\) is the denominator of the original curve at the point \\(t\\).',
            ),
            explanation: text(
                'Utež \\(w_2\\) je nič pri \\(t=\\tfrac{1+\\sqrt3}{2}\\approx1{,}366\\) in \\(-\\tfrac12\\) pri \\(t=\\tfrac32\\).',
                'The weight \\(w_2\\) is zero at \\(t=\\tfrac{1+\\sqrt3}{2}\\approx1.366\\) and \\(-\\tfrac12\\) at \\(t=\\tfrac32\\).',
            ),
        },
        {
            id: 'rex-denominator',
            latex: 'D(s)=\\sum_{i=0}^{3}b_{i,3}(s)\\,w_i=1+3s-6s^2+3s^3=1+3s(1-s)^2\\ge1\\quad\\text{for}\\ s\\ge0',
            notation: text(
                'Imenovalec \\(D(s)\\) izvirne racionalne krivulje; \\(b_{i,3}\\) so Bernsteinovi polinomi, \\(w_i\\) privzete uteži.',
                'The denominator \\(D(s)\\) of the original rational curve; the \\(b_{i,3}\\) are Bernstein polynomials and the \\(w_i\\) are the default weights.',
            ),
            explanation: text(
                'Ker je \\(3s(1-s)^2\\ge0\\) za \\(s\\ge0\\), je \\(D(s)\\ge1\\) na vsem podaljšanem intervalu \\([0,t]\\), tudi do \\(t=\\tfrac32\\): tam ni pola in je \\(E(u)=B(tu)\\) povsod dobro definirana. Pozitivne uteži na \\([0,1]\\) pa same po sebi ne izključijo pola zunaj: ta \\(D\\) ima ničlo pri \\(s\\approx-0{,}223\\), torej pred začetkom krivulje. Negativna utež kontrolne točke ni pol; pomeni le, da nova predstavitev nima več lastnosti konveksne ovojnice.',
                'Because \\(3s(1-s)^2\\ge0\\) for \\(s\\ge0\\), we have \\(D(s)\\ge1\\) on the whole extended interval \\([0,t]\\), up to \\(t=\\tfrac32\\): there is no pole there, and \\(E(u)=B(tu)\\) is well defined everywhere. Positive weights on \\([0,1]\\) do not by themselves exclude a pole outside it, though: this \\(D\\) has a zero at \\(s\\approx-0.223\\), before the start of the curve. A negative control weight is not a pole; it only means the new representation no longer has the convex hull property.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rex-twelve-tenths',
            title: text('Primer: uteži \\((1,2,1,1)\\), \\(t=\\tfrac65\\)', 'Example: weights \\((1,2,1,1)\\), \\(t=\\tfrac65\\)'),
            calculationLatex: 'w_1=1+\\tfrac65=\\tfrac{11}5,\\quad w_2=1+\\tfrac{12}5-\\tfrac{72}{25}=\\tfrac{13}{25},\\quad w_3=D\\bigl(\\tfrac65\\bigr)=\\tfrac{143}{125};\\qquad Q_1=\\frac{(1-t)(-4,-3)\\cdot1+t\\cdot2\\,(-3,3)}{w_1}=\\bigl(-\\tfrac{32}{11},\\tfrac{39}{11}\\bigr)',
            resultLatex: '(-4,-3)_{1},\\ \\bigl(-\\tfrac{32}{11},\\tfrac{39}{11}\\bigr)_{11/5},\\ \\bigl(\\tfrac{176}{13},\\tfrac{33}{13}\\bigr)_{13/25},\\ \\bigl(\\tfrac{436}{143},-3\\bigr)_{143/125}',
            check: text(
                'Pri vsaki točki je v indeksu njena utež. Zadnja utež \\(\\tfrac{143}{125}=1{,}144\\) je imenovalec izvirne krivulje v \\(t=\\tfrac65\\), vse štiri uteži so še pozitivne.',
                'The subscript of each point is its weight. The last weight \\(\\tfrac{143}{125}=1.144\\) is the denominator of the original curve at \\(t=\\tfrac65\\), and all four weights are still positive.',
            ),
        },
    ],
    steps: [
        {
            id: 'rex-weighted-curve', order: 1,
            title: text('Racionalna krivulja in točka zunaj nje', 'A rational curve and a point beyond it'),
            purpose: text('Videti izhodišče: uteži in označeno točko \\(B(t)\\) zunaj krivulje.', 'Seeing the starting point: the weights and the marked point \\(B(t)\\) beyond the curve.'),
            explanation: text(
                'Privzeta racionalna krivulja ima uteži \\((1,2,1,1)\\). Točka pri \\(t=\\tfrac65\\) leži zunaj narisanega loka: racionalna funkcija \\(B\\) je tam še vedno definirana, ker je njen imenovalec \\(D(s)\\) pozitiven na vsem intervalu \\([0,\\tfrac65]\\) (najmanj 1).',
                'The default rational curve has weights \\((1,2,1,1)\\). The point at \\(t=\\tfrac65\\) lies outside the drawn arc: the rational function \\(B\\) is still defined there because its denominator \\(D(s)\\) is positive on the whole interval \\([0,\\tfrac65]\\) (at least 1).',
            ),
            formulaIds: ['rex-denominator'],
            frames: [frame('rex-weighted-curve-explanation', 'explanation'), frame('rex-weighted-curve-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži in poišči označeno točko za koncem krivulje.', 'Read the weights and find the marked point past the end of the curve.'),
            expectedObservations: [text('Uteži so \\(1\\), \\(2\\), \\(1\\), \\(1\\); označena točka leži za končno točko krivulje.', 'The weights are \\(1\\), \\(2\\), \\(1\\), \\(1\\); the marked point lies past the end point of the curve.')],
            scene: {
                id: 'rex-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-weights', value: true}],
                expectedState: text('Privzeta racionalna krivulja z vidnimi utežmi in točko pri \\(t=\\tfrac65\\).', 'The default rational curve with visible weights and the point at \\(t=\\tfrac65\\).'),
            },
        },
        {
            id: 'rex-homogeneous-rule', order: 2,
            title: text('Shema v homogenih koordinatah', 'The scheme in homogeneous coordinates'),
            purpose: text('Pojasniti, kako uteži vstopijo v podaljšek.', 'Explaining how the weights enter the extension.'),
            explanation: text(
                'Točke zapišemo kot \\((w_iP_i,\\ w_i)\\), izvedemo isto shemo pri \\(t=\\tfrac65\\) in delimo z zadnjo koordinato. Prvi členi vrstic dajo štiri nove kontrolne točke in štiri nove uteži. Tako je \\(E(u)=B(tu)\\).',
                'We write the points as \\((w_iP_i,\\ w_i)\\), run the same scheme at \\(t=\\tfrac65\\) and divide by the last coordinate. The first entries of the rows give four new control points and four new weights. Thus \\(E(u)=B(tu)\\).',
            ),
            formulaIds: ['rex-homogeneous'],
            frames: [frame('rex-homogeneous-rule-explanation', 'explanation'), frame('rex-homogeneous-rule-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Premakni drsnik \\(t\\) in opazuj, kako se označena točka premika po nadaljevanju krivulje.', 'Move the \\(t\\) slider and watch how the marked point moves along the continuation of the curve.'),
            expectedObservations: [text('Označena točka leži vedno na nadaljevanju iste racionalne krivulje, čeprav se \\(t\\) spreminja.', 'The marked point always lies on the continuation of the same rational curve as \\(t\\) changes.')],
            scene: {
                id: 'rex-t-twelve-tenths', basedOn: 'demonstration-default',
                actions: [{name: 'show-weights', value: true}, {name: 'set-extrapolation-parameter', value: 1.2}],
                expectedState: text('Uteži so vidne, parameter je \\(t=\\tfrac65\\).', 'The weights are visible, and the parameter is \\(t=\\tfrac65\\).'),
            },
        },
        {
            id: 'rex-example', order: 3,
            title: text('Podaljšek pri \\(t=\\tfrac65\\)', 'The extension at \\(t=\\tfrac65\\)'),
            purpose: text('Izračunati nove točke in uteži in jih primerjati s prikazom.', 'Computing the new points and weights and comparing them with the display.'),
            explanation: text(
                'Gumb Ekstrapoliraj nadomesti krivuljo z \\(E(u)=B(\\tfrac{6u}{5})\\). Nove uteži so \\(1,\\ \\tfrac{11}5,\\ \\tfrac{13}{25},\\ \\tfrac{143}{125}\\), tj. \\(1,\\ 2{,}2,\\ 0{,}52,\\ 1{,}144\\). Tretja kontrolna točka \\(\\left(\\tfrac{176}{13},\\,\\tfrac{33}{13}\\right)\\approx(13{,}54;\\ 2{,}54)\\) je daleč od krivulje, ker ima majhno utež; pogled je zato razširjen, da je vidna.',
                'The Extrapolate button replaces the curve with \\(E(u)=B(\\tfrac{6u}{5})\\). The new weights are \\(1,\\ \\tfrac{11}5,\\ \\tfrac{13}{25},\\ \\tfrac{143}{125}\\), that is \\(1,\\ 2.2,\\ 0.52,\\ 1.144\\). The third control point \\(\\left(\\tfrac{176}{13},\\,\\tfrac{33}{13}\\right)\\approx(13.54,\\ 2.54)\\) is far from the curve because its weight is small; the view is widened so that it is visible.',
            ),
            formulaIds: ['rex-homogeneous', 'rex-weights'],
            frames: [frame('rex-example-explanation', 'explanation'), frame('rex-example-calculation', 'calculation'), frame('rex-example-observation', 'observation')],
            workedExampleId: 'rex-twelve-tenths',
            learnerInteraction: 'observe',
            observationPrompt: text('Preberi uteži ob kontrolnih točkah in poišči kontrolno točko z najmanjšo utežjo.', 'Read the weights next to the control points and find the control point with the smallest weight.'),
            expectedObservations: [text('Še vedno je ena krivulja s štirimi točkami; najmanjšo utež \\(0{,}52\\) ima tretja kontrolna točka, ki je daleč desno.', 'There is still one curve with four points; the smallest weight \\(0.52\\) belongs to the third control point, which is far to the right.')],
            scene: {
                id: 'rex-after-twelve-tenths', basedOn: 'lesson-fixture', curve: rationalExtrapolationFixture, view: rationalExtrapolationExampleView,
                actions: [{name: 'show-weights', value: true}, {name: 'set-extrapolation-parameter', value: 1.2}, {name: 'extrapolate', value: true}],
                expectedState: text('Krivulja je podaljšana pri \\(t=\\tfrac65\\), uteži so vidne, pogled pa vključuje vse štiri nove kontrolne točke.', 'The curve is extended at \\(t=\\tfrac65\\), with the weights visible, and the view includes all four new control points.'),
            },
        },
        {
            id: 'rex-negative-weight', order: 4,
            title: text('Napredno: negativna utež, a brez pola', 'Advanced: a negative weight, yet no pole'),
            purpose: text('Pojasniti, kaj pomeni nepozitivna utež nove predstavitve.', 'Explaining what a non-positive weight of the new representation means.'),
            explanation: text(
                'Pri \\(t=\\tfrac32\\) so uteži \\(1,\\ \\tfrac52,\\ -\\tfrac12,\\ \\tfrac{17}8\\); tretja je nič pri \\(t=\\tfrac{1+\\sqrt3}2\\approx1{,}366\\) in negativna za večje \\(t\\). Negativna utež kontrolne točke sama ni pol. Pol je ničla imenovalca \\(D(s)=1+3s(1-s)^2\\) izvirne krivulje, ta pa je na \\([0,\\tfrac32]\\) vsaj 1 (pri \\(s=\\tfrac32\\) je \\(\\tfrac{17}8\\)), zato je \\(E(u)=B(tu)\\) povsod definirana. Pozitivne uteži na \\([0,1]\\) ne zagotavljajo, da pola ni zunaj tega intervala: ta \\(D\\) ima ničlo pri \\(s\\approx-0{,}223\\), a ta leži pred začetkom krivulje. Nova predstavitev pa izgubi lastnost konveksne ovojnice. Točka z negativno utežjo leži pri \\((-29{,}5;\\ 6)\\), daleč od krivulje, ker majhna absolutna vrednost uteži točko oddalji; pogled je zato razširjen, da je vidna.',
                'At \\(t=\\tfrac32\\) the weights are \\(1,\\ \\tfrac52,\\ -\\tfrac12,\\ \\tfrac{17}8\\); the third is zero at \\(t=\\tfrac{1+\\sqrt3}2\\approx1.366\\) and negative for larger \\(t\\). A negative control weight is not itself a pole. A pole is a zero of the denominator \\(D(s)=1+3s(1-s)^2\\) of the original curve, and \\(D\\) is at least 1 on \\([0,\\tfrac32]\\) (it is \\(\\tfrac{17}8\\) at \\(s=\\tfrac32\\)), so \\(E(u)=B(tu)\\) is defined everywhere. Positive weights on \\([0,1]\\) do not guarantee that there is no pole outside that interval: this \\(D\\) has a zero at \\(s\\approx-0.223\\), but it lies before the start of the curve. The new representation, however, loses the convex hull property. The control point with the negative weight lies at \\((-29.5,\\ 6)\\), far from the curve, because a small absolute weight pushes the point far out; the view is widened so that it is visible.',
            ),
            formulaIds: ['rex-weights', 'rex-denominator'],
            frames: [frame('rex-negative-weight-explanation', 'explanation'), frame('rex-negative-weight-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri, da je krivulja kljub negativni uteži ena sama gladka krivulja brez preloma in pola, in poišči kontrolno točko z negativno utežjo.', 'Check that the curve is nevertheless a single smooth curve with no break and no pole, and find the control point with the negative weight.'),
            expectedObservations: [text('Krivulja se zvezno nadaljuje brez pola in preloma; tretja kontrolna točka z utežjo \\(-\\tfrac12\\) leži pri \\((-29{,}5;\\ 6)\\), daleč levo od krivulje, a v pogledu.', 'The curve continues smoothly with no pole or break; the third control point with weight \\(-\\tfrac12\\) lies at \\((-29.5,\\ 6)\\), far to the left of the curve but inside the view.')],
            scene: {
                id: 'rex-after-three-halves', basedOn: 'lesson-fixture', curve: rationalExtrapolationFixture, view: rationalExtrapolationNegativeWeightView,
                actions: [{name: 'show-weights', value: true}, {name: 'set-extrapolation-parameter', value: 1.5}, {name: 'extrapolate', value: true}],
                expectedState: text('Krivulja je podaljšana pri \\(t=\\tfrac32\\), uteži so vidne (\\(1\\), \\(2{,}50\\), \\(-0{,}50\\), \\(2{,}13\\)); pogled vključuje točko z negativno utežjo.', 'The curve is extended at \\(t=\\tfrac32\\), with the weights visible (\\(1\\), \\(2.50\\), \\(-0.50\\), \\(2.13\\)); the view includes the negative-weight point.'),
            },
        },
    ],
    sources: [
        farinSource(['rational Bézier curves', 'homogeneous coordinates', 'extrapolation of rational curves'], 'RationalBezierCurve.extrapolate(t) runs the de Casteljau scheme on (w_iP_i, w_i), takes the first point of every row, and divides by the last coordinate.'),
        pbpSource(['projective invariance of the de Casteljau algorithm', 'rational Bézier curves and negative weights']),
        {
            id: 'bezeg-rational-extrapolation-implementation',
            citation: 'Bezeg source: src/graphs/curves/rational/RationalExtrapolationGraph.tsx and src/bezeg/impl/curve/rational-bezier-curve.ts.',
            supports: ['Extrapolate button', 'extrapolation slider from 1 to 1.5', 'weights switch'],
        },
    ],
    edgeCases: [
        text('Pri \\(t>\\tfrac{1+\\sqrt3}2\\) ima tretja kontrolna točka nepozitivno utež; krivulja je še vedno enaka \\(B(tu)\\).', 'For \\(t>\\tfrac{1+\\sqrt3}2\\) the third control point has a non-positive weight; the curve is still equal to \\(B(tu)\\).'),
        text('Točke z majhno ali negativno utežjo so lahko zelo daleč in zunaj vidnega območja; to je posledica predstavitve, ne napaka krivulje. Lekcija zato za primera \\(t=\\tfrac65\\) in \\(t=\\tfrac32\\) razširi pogled.', 'Points with a small or negative weight can be very far away and outside the visible area; this is a property of the representation, not an error of the curve. The lesson therefore widens the view for the cases \\(t=\\tfrac65\\) and \\(t=\\tfrac32\\).'),
        text('Pozitivne uteži na \\([0,1]\\) ne izključijo pola zunaj tega intervala; za to krivuljo pa je \\(D(s)\\ge1\\) za \\(s\\ge0\\), zato podaljšanje do \\(t=\\tfrac32\\) pola ne zadene, podaljšanje v nasprotno smer čez \\(s\\approx-0{,}223\\) pa bi ga.', 'Positive weights on \\([0,1]\\) do not exclude a pole outside that interval; for this curve \\(D(s)\\ge1\\) for \\(s\\ge0\\), so extending to \\(t=\\tfrac32\\) meets no pole, whereas extending in the opposite direction past \\(s\\approx-0.223\\) would.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi vir za racionalne krivulje z negativnimi utežmi.', 'Before classroom-ready review, confirm the source for rational curves with negative weights.'),
    ],
};

export const constructionGuidedLessons: readonly GuidedLesson[] = [subdivision, repeatedSubdivision, rationalSubdivision, extrapolation, rationalExtrapolation];
