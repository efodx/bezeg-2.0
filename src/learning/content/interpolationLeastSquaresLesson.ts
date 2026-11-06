/**
 * Guided lesson I4 of the Interpolation and approximation family (docs/specs/interpolation-approximation-lessons.md): least squares,
 * `interp-least-squares`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is the readout of the scene it belongs to, and `interpolationGuidedLessons.test.ts` checks that against the real graph and
 * the kernel in `src/analysis/leastSquaresModel.ts`. Scenes use the `lsq` action (`set-point`, `set-degree`, `set-mode`, `set-line`,
 * `set-overlay`).
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

interface LsqSceneOptions {
    readonly degree: number;
    readonly squares: boolean;
    readonly normalEquations: boolean;
    /** The manual line (slope, intercept) when the manual mode is on; the best fit is shown otherwise. */
    readonly manual?: readonly [number, number];
    /** Replaces the fourth data point (3, 4) by (3, 8). */
    readonly outlier?: boolean;
}

/** A scene from the default model (the data (0,1), (1,2), (2,2), (3,4), the best line, squares shown): every action runs synchronously. */
const lsqScene = (id: string, options: LsqSceneOptions, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        ...(options.outlier ? [{kind: 'lsq', operation: 'set-point', index: 3, x: 3, y: 8} as const] : []),
        {kind: 'lsq', operation: 'set-degree', value: options.degree},
        ...(options.manual ? [{kind: 'lsq', operation: 'set-line', slope: options.manual[0], intercept: options.manual[1]} as const] : []),
        {kind: 'lsq', operation: 'set-mode', mode: options.manual ? 'manual' : 'best'},
        {kind: 'lsq', operation: 'set-overlay', overlay: 'squares', visible: options.squares},
        {kind: 'lsq', operation: 'set-overlay', overlay: 'normal-equations', visible: options.normalEquations},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

export const leastSquaresLesson: GuidedLesson = {
    demonstrationId: 'interp-least-squares',
    title: text('Metoda najmanjših kvadratov', 'Least squares'),
    summary: text(
        'Kadar je podatkov več, kot ima model parametrov, krivulja skozi vse točke običajno ne obstaja. Metoda najmanjših kvadratov izbere tisto krivuljo izbrane stopnje, pri kateri je vsota kvadratov navpičnih ostankov najmanjša; rešimo jo z normalnim sistemom. Kvadrat navpičnega ostanka je modelska izbira, ne geometrijska razdalja do krivulje.',
        'When there are more data points than model parameters, a curve through every point usually does not exist. Least squares picks the curve of the chosen degree for which the sum of the squared vertical residuals is smallest; it is solved with the normal equations. The square of the vertical residual is a modelling choice, not the geometric distance to the curve.',
    ),
    prerequisites: [
        text('Potrebno je poglavje o linearni funkciji: naklon in začetna vrednost premice \\(y=kx+n\\).', 'Assumes the linear function chapter: the slope and intercept of a line \\(y=kx+n\\).'),
        text('Potrebna je lekcija o Lagrangeevi interpolaciji (Skozi točke ali blizu njih): polinom stopnje \\(n-1\\) gre skozi \\(n\\) točk.', 'Assumes the Lagrange interpolation lesson (Through the points or near them): a polynomial of degree \\(n-1\\) passes through \\(n\\) points.'),
        text('Potrebno je osnovno znanje o vektorjih: skalarni produkt.', 'Assumes basic vectors: the inner product.'),
    ],
    learningGoals: [
        text('Napoveš, kje poteka premica z najmanjšo vsoto kvadratov ostankov, in jo primerjaš z ročno narisano.', 'Predict where the line with the smallest sum of squared residuals runs, and compare it with a hand-drawn one.'),
        text('Razložiš, zakaj ena oddaljena točka (osamelec) premico močno premakne.', 'Explain why one far-away point (an outlier) moves the line strongly.'),
        text('Poveš, da normalni sistem \\(A^{T}A\\,c=A^{T}y\\) določi najboljše prileganje in da so ostanki pravokotni na stolpce matrike \\(A\\).', 'State that the normal equations \\(A^{T}A\\,c=A^{T}y\\) determine the best fit and that the residuals are orthogonal to the columns of \\(A\\).'),
        text('Poveš, da polinom stopnje \\(n-1\\) skozi \\(n\\) točk nima ostankov, a lahko niha (interpolacija je prileganje z ničelnimi ostanki).', 'State that a polynomial of degree \\(n-1\\) through \\(n\\) points has no residuals but can wiggle (interpolation is the fit with zero residuals).'),
    ],
    formulaBlocks: [
        {
            id: 'normal-equations',
            latex: 'S(c)=\\sum_{i}\\bigl(y_i-p(x_i)\\bigr)^2,\\qquad p(x)=\\sum_{k=0}^{d}c_kx^k,\\qquad A^{T}A\\,c=A^{T}y',
            notation: text(
                '\\(S\\) je vsota kvadratov ostankov, \\(p\\) polinom stopnje \\(d\\) s koeficienti \\(c_k\\), \\(A\\) matrika z vrsticami \\((1,\\,x_i,\\,\\dots,\\,x_i^d)\\) in \\(y\\) vektor ordinat.',
                '\\(S\\) is the sum of squared residuals, \\(p\\) a polynomial of degree \\(d\\) with coefficients \\(c_k\\), \\(A\\) the matrix with rows \\((1,\\,x_i,\\,\\dots,\\,x_i^d)\\) and \\(y\\) the vector of ordinates.',
            ),
            explanation: text(
                'Ostanek \\(r_i=y_i-p(x_i)\\) je navpična razdalja med točko in krivuljo. Da so ostanki kvadrirani in seštevani, je modelska izbira, ne geometrijska razdalja točke do krivulje: velika odstopanja kaznuje močneje kot majhna. Najmanjšo vsoto dobimo, ko je vektor ostankov pravokoten na vsak stolpec matrike \\(A\\); to je prav normalni sistem \\(A^{T}A\\,c=A^{T}y\\).',
                'The residual \\(r_i=y_i-p(x_i)\\) is the vertical distance between the point and the curve. Squaring and adding the residuals is a modelling choice, not the geometric distance from the point to the curve: large deviations are punished more than small ones. The sum is smallest when the residual vector is orthogonal to every column of \\(A\\); that is exactly the normal equations \\(A^{T}A\\,c=A^{T}y\\).',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'lsq-predict', order: 1,
            title: text('Kje je najboljša premica?', 'Where is the best line?'),
            purpose: text('Pred razkritjem napovedati najboljšo premico, nato primerjati z računom.', 'Predicting the best line before the reveal, then comparing it with the computation.'),
            explanation: text(
                'Graf kaže štiri podatke \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) in vodoravno ročno premico \\(y=2\\). Napovej na oko: kje poteka premica, ki se podatkom najbolje prilega? Nato izklopi ročno premico in vklopi kvadrate ostankov. Najboljša premica je \\(y=0{,}9x+0{,}9\\), ostanki so \\(0{,}1\\), \\(0{,}2\\), \\(-0{,}7\\) in \\(0{,}4\\), vsota njihovih kvadratov pa \\(0{,}7\\). Ostanek je navpična razdalja do premice, ne najkrajša razdalja; da ga kvadriramo, je modelska izbira.',
                'The graph shows the four data points \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) and the horizontal manual line \\(y=2\\). Predict by eye: where does the line that fits the data best run? Then switch off the manual line and switch on the squares of the residuals. The best line is \\(y=0.9x+0.9\\), the residuals are \\(0.1\\), \\(0.2\\), \\(-0.7\\) and \\(0.4\\), and the sum of their squares is \\(0.7\\). A residual is the vertical distance to the line, not the shortest distance; squaring it is a modelling choice.',
            ),
            formulaIds: ['normal-equations'],
            frames: [frame('lsq-predict-explanation', 'explanation'), frame('lsq-predict-observation', 'observation')],
            observationPrompt: text('Pred razkritjem se odloči: ali bo najboljša premica nad ali pod premico \\(y=2\\) pri \\(x=3\\), in kolikšen naj bo naklon?', 'Before the reveal decide: will the best line be above or below the level \\(y=2\\) at \\(x=3\\), and roughly what slope should it have?'),
            expectedObservations: [text('Najboljša premica ima naklon \\(0{,}9\\) in teče nad vodoravno premico pri \\(x=3\\); kvadrati ostankov so največji pri točki \\((2,2)\\).', 'The best line has slope \\(0.9\\) and runs above the horizontal line at \\(x=3\\); the squares of the residuals are largest at the point \\((2,2)\\).')],
            scene: lsqScene('lsq-predict-start', {degree: 1, squares: false, normalEquations: false, manual: [0, 2]},
                'Podatki \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) in vodoravna ročna premica \\(y=2\\); najboljša premica in kvadrati ostankov še niso prikazani.',
                'The data \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) and the horizontal manual line \\(y=2\\); the best line and the squares of the residuals are not shown yet.'),
        },
        {
            id: 'lsq-manual', order: 2,
            title: text('Ročna premica in najmanjša vsota', 'The manual line and the minimum sum'),
            purpose: text('Z drsnikoma za naklon in začetno vrednost opazovati padanje vsote kvadratov do najmanjše vrednosti.', 'Using the slope and intercept sliders to watch the sum of squares fall to its minimum.'),
            explanation: text(
                'Ročna premica je zdaj \\(y=x+1\\) in kvadrati ostankov so prikazani. Njena vsota kvadratov je \\(1\\); ob njej piše najmanjša možna vsota \\(0{,}7\\). Premikaj drsnika za naklon \\(k\\) in začetno vrednost \\(n\\) in opazuj vsoto. Ko ju postaviš na \\(k=0{,}9\\) in \\(n=0{,}9\\), se vsota ujame z najmanjšo, \\(0{,}7\\); manjše vsote z nobeno premico ne dobiš.',
                'The manual line is now \\(y=x+1\\) and the squares of the residuals are shown. Its sum of squares is \\(1\\); beside it the smallest possible sum \\(0.7\\) is written. Move the sliders for the slope \\(k\\) and the intercept \\(n\\) and watch the sum. When you set \\(k=0.9\\) and \\(n=0.9\\) the sum meets the smallest one, \\(0.7\\); no line gives a smaller sum.',
            ),
            formulaIds: ['normal-equations'],
            frames: [frame('lsq-manual-explanation', 'explanation'), frame('lsq-manual-observation', 'observation')],
            observationPrompt: text('Poskusi spustiti vsoto pod \\(0{,}7\\). Kaj opaziš, ko premico premikaš na eno ali drugo stran od najboljše?', 'Try to push the sum below \\(0.7\\). What do you notice when you move the line to either side of the best one?'),
            expectedObservations: [text('Vsota ne gre pod \\(0{,}7\\); na obeh straneh najboljše premice narašča.', 'The sum does not go below \\(0.7\\); it grows on both sides of the best line.')],
            scene: lsqScene('lsq-manual-start', {degree: 1, squares: true, normalEquations: false, manual: [1, 1]},
                'Ročna premica \\(y=x+1\\) z vsoto kvadratov \\(1\\) in najmanjšo možno vsoto \\(0{,}7\\); kvadrati ostankov so prikazani.',
                'The manual line \\(y=x+1\\) with sum of squares \\(1\\) and smallest possible sum \\(0.7\\); the squares of the residuals are shown.'),
        },
        {
            id: 'lsq-outlier', order: 3,
            title: text('Ena točka daleč stran', 'One point far away'),
            purpose: text('Napovedati vpliv oddaljene točke in ga primerjati z izračunom.', 'Predicting the effect of a far-away point and comparing it with the computation.'),
            explanation: text(
                'Točka \\((3,4)\\) je zamenjana s točko \\((3,8)\\), druge tri ostanejo. Napovej: za koliko se premakne najboljša premica in kolikšna je zdaj vsota kvadratov? Najboljša premica je zdaj \\(y=2{,}1x+0{,}1\\), vsota kvadratov pa \\(8{,}7\\), prej \\(0{,}7\\). Ena sama točka je premico močno zasukala, ker kvadrat velikega ostanka šteje veliko: taki točki rečemo osamelec. Metoda najmanjših kvadratov je zato občutljiva na osamelce.',
                'The point \\((3,4)\\) is replaced by the point \\((3,8)\\); the other three stay. Predict: how far does the best line move and what is the sum of squares now? The best line is now \\(y=2.1x+0.1\\) and the sum of squares is \\(8.7\\), before \\(0.7\\). One single point has turned the line strongly, because the square of a large residual counts for a lot: such a point is called an outlier. Least squares is therefore sensitive to outliers.',
            ),
            formulaIds: ['normal-equations'],
            frames: [frame('lsq-outlier-explanation', 'explanation'), frame('lsq-outlier-observation', 'observation')],
            observationPrompt: text('Primerjaj ostanke s tistimi pri prvotnih podatkih. Kateri se je najbolj povečal?', 'Compare the residuals with those of the original data. Which one grew the most?'),
            expectedObservations: [text('Naklon naraste z \\(0{,}9\\) na \\(2{,}1\\) in vsota z \\(0{,}7\\) na \\(8{,}7\\); ostanki pri večini ostalih točk so zdaj večji kot prej.', 'The slope grows from \\(0.9\\) to \\(2.1\\) and the sum from \\(0.7\\) to \\(8.7\\); the residuals at most of the other points are larger now than before.')],
            scene: lsqScene('lsq-outlier-start', {degree: 1, squares: true, normalEquations: false, outlier: true},
                'Podatki \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,8)\\), najboljša premica \\(y=2{,}1x+0{,}1\\), vsota kvadratov \\(8{,}7\\).',
                'The data \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,8)\\), the best line \\(y=2.1x+0.1\\), sum of squares \\(8.7\\).'),
        },
        {
            id: 'lsq-normal', order: 4,
            title: text('Normalni sistem', 'The normal equations'),
            purpose: text('Pokazati normalni sistem za prvotne podatke in njegovo rešitev.', 'Showing the normal equations for the original data and their solution.'),
            explanation: text(
                'Podatki so spet prvotni. Normalni sistem \\(A^{T}A\\,c=A^{T}y\\) za premico ima obliko \\(4c_0+6c_1=9\\) in \\(6c_0+14c_1=18\\). Rešitev je \\(c_0=0{,}9\\) in \\(c_1=0{,}9\\), torej \\(y=0{,}9x+0{,}9\\). Ostanki \\(0{,}1\\), \\(0{,}2\\), \\(-0{,}7\\), \\(0{,}4\\) imajo vsoto \\(0\\) in so tudi pravokotni na stolpec z \\(x\\): \\(0{,}2-1{,}4+1{,}2=0\\). Zato je vsota kvadratov, \\(0{,}7\\), najmanjša.',
                'The data are the original ones again. The normal equations \\(A^{T}A\\,c=A^{T}y\\) for a line read \\(4c_0+6c_1=9\\) and \\(6c_0+14c_1=18\\). The solution is \\(c_0=0.9\\) and \\(c_1=0.9\\), so \\(y=0.9x+0.9\\). The residuals \\(0.1\\), \\(0.2\\), \\(-0.7\\), \\(0.4\\) add up to \\(0\\) and are also orthogonal to the column of \\(x\\): \\(0.2-1.4+1.2=0\\). That is why the sum of squares, \\(0.7\\), is the smallest.',
            ),
            formulaIds: ['normal-equations'],
            frames: [frame('lsq-normal-explanation', 'explanation'), frame('lsq-normal-observation', 'observation')],
            observationPrompt: text('Preveri v inspektorju, da prikazana rešitev \\(c\\) ustreza obema enačbama, in seštej ostanke.', 'Check in the inspector that the shown solution \\(c\\) satisfies both equations, and add up the residuals.'),
            expectedObservations: [text('Obe enačbi veljata za \\(c_0=c_1=0{,}9\\), vsota ostankov je \\(0\\).', 'Both equations hold for \\(c_0=c_1=0.9\\), and the residuals add up to \\(0\\).')],
            scene: lsqScene('lsq-normal-start', {degree: 1, squares: true, normalEquations: true},
                'Podatki \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\), najboljša premica \\(y=0{,}9x+0{,}9\\) in njen normalni sistem.',
                'The data \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\), the best line \\(y=0.9x+0.9\\) and its normal equations.'),
        },
        {
            id: 'lsq-degree', order: 5,
            title: text('Višja stopnja: manj napake, več nihanja', 'A higher degree: less error, more wiggle'),
            purpose: text('Z višanjem stopnje opazovati padanje vsote kvadratov in pojav interpolacije.', 'Raising the degree to watch the sum of squares fall and interpolation appear.'),
            explanation: text(
                'Stopnja je zdaj \\(2\\): prileganje je \\(y=1{,}15+0{,}15x+0{,}25x^2\\) z vsoto kvadratov \\(0{,}45\\), manj kot pri premici. Napovej, kaj se zgodi pri stopnji \\(3\\), nato jo povečaj. Polinom stopnje \\(3\\) gre skozi vseh \\(4\\) točke, \\(y=1+2{,}5x-2x^2+0{,}5x^3\\), ostanki in vsota kvadratov so do zaokrožitve \\(0\\). To je interpolacija iz lekcije o Lagrangeevi interpolaciji (ničelni ostanki), vendar se tak polinom rad zaniha med točkami; o tem govori lekcija o Rungejevem pojavu. Manjša vsota kvadratov ni nujno boljši model.',
                'The degree is now \\(2\\): the fit is \\(y=1.15+0.15x+0.25x^2\\) with sum of squares \\(0.45\\), less than for the line. Predict what happens at degree \\(3\\), then raise it. The polynomial of degree \\(3\\) passes through all \\(4\\) points, \\(y=1+2.5x-2x^2+0.5x^3\\), the residuals and the sum of squares are \\(0\\) up to rounding. That is the interpolation of the Lagrange lesson (zero residuals), but such a polynomial easily wiggles between the points; the lesson on the Runge phenomenon covers that. A smaller sum of squares is not necessarily a better model.',
            ),
            formulaIds: ['normal-equations'],
            frames: [frame('lsq-degree-explanation', 'explanation'), frame('lsq-degree-observation', 'observation')],
            observationPrompt: text('Pred povečanjem stopnje se odloči: ali bo vsota kvadratov padla, in ali bo krivulja še vedno blizu podatkov tudi med njimi?', 'Before raising the degree decide: will the sum of squares fall, and will the curve still stay near the data between the points too?'),
            expectedObservations: [text('Pri stopnji \\(3\\) so vsi ostanki do zaokrožitve \\(0\\) in krivulja gre skozi vse točke.', 'At degree \\(3\\) all residuals are \\(0\\) up to rounding and the curve passes through every point.')],
            scene: lsqScene('lsq-degree-quadratic', {degree: 2, squares: true, normalEquations: false},
                'Podatki \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\), prileganje stopnje \\(2\\), \\(y=1{,}15+0{,}15x+0{,}25x^2\\), vsota kvadratov \\(0{,}45\\).',
                'The data \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\), the fit of degree \\(2\\), \\(y=1.15+0.15x+0.25x^2\\), sum of squares \\(0.45\\).'),
        },
        {
            id: 'lsq-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati podatke, spreminjati stopnjo in ročno premico.', 'Moving the data, changing the degree and the manual line on your own.'),
            explanation: text(
                'Graf je spet na začetku: štiri točke, najboljša premica in kvadrati ostankov. Premikaj točke z vlečenjem ali vpiši koordinate, dodaj do \\(12\\) točk, višaj stopnjo do \\(5\\) in poskusi ročno premico. Stopnja mora biti manjša od števila točk. Če imajo vse točke isti \\(x\\), krivulje ni: \\(y\\) ni funkcija od \\(x\\). Spremljaj, kako se vsota kvadratov in kvadrati ostankov odzivajo na oddaljeno točko.',
                'The graph is back at the start: four points, the best line and the squares of the residuals. Move the points by dragging or type the coordinates, add up to \\(12\\) points, raise the degree up to \\(5\\) and try the manual line. The degree must be smaller than the number of points. If all points have the same \\(x\\) there is no curve: \\(y\\) is not a function of \\(x\\). Watch how the sum of squares and the squares of the residuals respond to a far-away point.',
            ),
            formulaIds: ['normal-equations'],
            frames: [frame('lsq-explore-explanation', 'explanation'), frame('lsq-explore-observation', 'observation')],
            observationPrompt: text('Premakni eno točko daleč stran in primerjaj, kako se premakne premica in kako polinom višje stopnje.', 'Move one point far away and compare how the line moves with how a polynomial of a higher degree moves.'),
            expectedObservations: [text('Premica se z osamelcem zasuka; polinom z več parametri se osamelcu prilagodi bolj, a med točkami niha.', 'The line turns with the outlier; a polynomial with more parameters adapts to it more, but wiggles between the points.')],
            scene: lsqScene('lsq-explore-default', {degree: 1, squares: true, normalEquations: false},
                'Podatki \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\), najboljša premica in kvadrati ostankov; vse je prosto za raziskovanje.',
                'The data \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\), the best line and the squares of the residuals; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'legendre-gauss-least-squares', citation: 'Legendre, A.-M. Nouvelles méthodes pour la détermination des orbites des comètes (1805); Gauss, C. F. Theoria motus corporum coelestium (1809).'},
        {id: 'trefethen-bau-numerical-linear-algebra', citation: 'Trefethen, L. N. and Bau, D. Numerical Linear Algebra. SIAM (1997), lectures 11 and 18 (least squares problems, QR factorization).'},
        {
            id: 'bezeg-least-squares-implementation',
            citation: 'Bezeg source: src/analysis/leastSquares.ts, src/analysis/leastSquaresModel.ts and src/graphs/functions/LeastSquaresGraph.tsx.',
            implementationCorrespondence: 'The fit is computed by QR factorization; the normal equations are only displayed. A lesson scene sets a data point, the degree, the mode, the manual line and the two display switches with the lsq action.',
        },
    ],
    edgeCases: [
        text('Stopnja je celo število od \\(1\\) do \\(\\min(\\text{št. točk}-1,\\,5)\\); drugačna vrednost je zavrnjena z izpisanim sporočilom in se ne zaokroži.', 'The degree is a whole number from \\(1\\) to \\(\\min(\\text{points}-1,\\,5)\\); another value is refused with a message and not rounded.'),
        text('Če imajo vse točke isti \\(x\\), krivulje ni in graf izpiše razlog; manj kot dve točki ni mogoče imeti.', 'If all points have the same \\(x\\) there is no curve and the graph states the reason; fewer than two points cannot be set.'),
        text('Normalni sistem je prikazan za stopnji \\(1\\) in \\(2\\); pri ročni premici prikazuje sistem najboljše premice.', 'The normal equations are shown for degrees \\(1\\) and \\(2\\); with the manual line they show the system of the best line.'),
    ],
    unresolvedQuestions: [],
};
