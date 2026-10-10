import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind, formulaIds?: readonly string[]): GuidedLessonFrame => ({id, kind, formulaIds});

const rationalDecasteljau: GuidedLesson = {
    demonstrationId: 'rational-decasteljau',
    title: text('Racionalna De Casteljaujeva konstrukcija', 'Rational De Casteljau construction'),
    summary: text(
        'Racionalna konstrukcija uporablja utežene kontrolne točke v homogenih koordinatah in jih nato projicira nazaj v ravnino.',
        'The rational construction interpolates weighted control points in homogeneous coordinates and then projects them back to the plane.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje linearne interpolacije in Bézierjevih kontrolnih točk.', 'Assumes familiarity with linear interpolation and Bézier control points.'),
        text('Potrebno je razumevanje, da utež spreminja vpliv kontrolne točke.', 'Assumes that a weight changes the influence of a control point.'),
    ],
    learningGoals: [
        text('Razložiš, zakaj racionalna krivulja potrebuje uteži in homogen zapis.', 'Explain why rational curves use weights and a homogeneous representation.'),
        text('Prebereš vrstico racionalne De Casteljaujeve konstrukcije pri izbranem parametru.', 'Read a row of the rational De Casteljau construction at a chosen parameter.'),
        text('Povežeš končno projekcijo konstrukcije z vrednostjo racionalne Bézierjeve krivulje.', 'Connect the final projection of the construction with the value of a rational Bézier curve.'),
    ],
    formulaBlocks: [
        {
            id: 'rational-weighted-form',
            latex: '\\mathbf{B}(t)=\\frac{\\sum_{i=0}^{n}b_{i,n}(t)w_iP_i}{\\sum_{i=0}^{n}b_{i,n}(t)w_i}',
            notation: text(
                'Števec je utežena vsota kontrolnih točk, imenovalec pa normalizira skupni vpliv uteži.',
                'The numerator is a weighted sum of control points; the denominator normalizes the total weight.',
            ),
            explanation: text(
                'Če so vse uteži enake, dobimo navadno Bézierjevo krivuljo. Različne pozitivne uteži spremenijo vpliv kontrolnih točk.',
                'Equal weights give the ordinary Bézier curve. Different positive weights change the influence of the control points.',
            ),
        },
        {
            id: 'rational-homogeneous-row',
            latex: 'Q_i^{(0)}=(w_iP_i,w_i),\\qquad Q_i^{(r)}(t)=(1-t)Q_i^{(r-1)}(t)+tQ_{i+1}^{(r-1)}(t)',
            notation: text(
                'Točka \\(P_i\\) se dvigne v homogeno točko \\((w_iP_i,w_i)\\); interpolacija poteka v treh koordinatah.',
                'The point \\(P_i\\) is lifted to \\((w_iP_i,w_i)\\); interpolation then happens in three coordinates.',
            ),
            explanation: text(
                'Prvi dve koordinati nosita utežen položaj, zadnja pa utež. V vsaki vrstici se vse tri koordinate interpolirajo skupaj.',
                'The first two coordinates carry the weighted position and the last carries the weight. All three coordinates are interpolated together in each row.',
            ),
        },
        {
            id: 'rational-projection',
            latex: 'Q_0^{(n)}(t)=(A_x,A_y,\\lambda),\\qquad \\mathbf{B}(t)=\\left(\\frac{A_x}{\\lambda},\\frac{A_y}{\\lambda}\\right)',
            notation: text(
                'Končna homogena točka se projicira v ravnino z deljenjem prvih dveh koordinat z zadnjo.',
                'The final homogeneous point is projected to the plane by dividing its first two coordinates by the last.',
            ),
            explanation: text(
                'Projekcija je zadnji korak konstrukcije. Pri \\(\\lambda=0\\) vrednost ni določena, zato mora regularnost ostati vidna.',
                'Projection is the final construction step. When \\(\\lambda=0\\), the value is undefined, so regularity must remain explicit.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rational-decasteljau-midpoint',
            title: text('Privzeta krivulja pri \\(t=1/2\\)', 'The default curve at \\(t=1/2\\)'),
            calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,2,1,1),\\quad b(1/2)=(1/8,3/8,3/8,1/8)',
            resultLatex: '\\mathbf{B}(1/2)=\\frac{(-9/8,21/8)}{11/8}=(-9/11,21/11)',
            check: text(
                'Rezultat preveri z zadnjo točko konstrukcije in z neodvisnim izračunom utežene Bernsteinove oblike.',
                'Check the result against the final construction point and an independent weighted Bernstein calculation.',
            ),
        },
    ],
    steps: [
        {
            id: 'rational-decasteljau-idea', order: 1,
            title: text('Uteži določijo vpliv', 'Weights determine influence'),
            purpose: text('Razlikovanje med navadno in racionalno Bézierjevo krivuljo.', 'Distinguishing ordinary and rational Bézier curves.'),
            explanation: text(
                'Racionalna krivulja ima poleg kontrolnih točk še uteži. Večja pozitivna utež poveča vpliv pripadajoče kontrolne točke pri isti geometriji.',
                'A rational curve has weights in addition to control points. A larger positive weight increases the influence of its control point for the same geometry.',
            ),
            formulaIds: ['rational-weighted-form'],
            frames: [frame('rational-decasteljau-idea-explanation', 'explanation'), frame('rational-decasteljau-idea-observation', 'observation')],
            scene: {
                id: 'rational-decasteljau-default', basedOn: 'demonstration-default',
                actions: [
                    {name: 'show-decasteljau-construction', value: true},
                    {name: 'show-weights', value: true},
                    {name: 'set-decasteljau-parameter', value: 0.5},
                ],
                expectedState: text('Privzete uteži in racionalna konstrukcija so vidne pri \\(t=\\tfrac{1}{2}\\).', 'The default weights and rational construction are visible at \\(t=\\tfrac{1}{2}\\).'),
            },
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj položaje kontrolnih točk, uteži in krivulje.', 'Compare the positions of the control points, weights, and curve.'),
            expectedObservations: [text('Uteži so dodatni podatki; kontrolni poligon ostane isti, oblika krivulje pa je lahko drugačna.', 'Weights are additional data; the control polygon stays the same while the curve shape can differ.')],
        },
        {
            id: 'rational-decasteljau-homogeneous', order: 2,
            title: text('Interpolacija v homogenih koordinatah', 'Interpolation in homogeneous coordinates'),
            purpose: text('Razumevanje, kaj se interpolira v posamezni vrstici.', 'Understanding what is interpolated in each row.'),
            explanation: text(
                'Vsaka kontrolna točka se najprej zapiše kot \\((w_iP_i,w_i)\\). De Casteljaujeva vrstica nato enako uteži položaj in zadnjo koordinato.',
                'Each control point is first written as \\((w_iP_i,w_i)\\). A De Casteljau row then interpolates the position and the last coordinate together.',
            ),
            formulaIds: ['rational-homogeneous-row'],
            frames: [frame('rational-decasteljau-homogeneous-explanation', 'explanation', ['rational-homogeneous-row']), frame('rational-decasteljau-homogeneous-observation', 'observation')],
            animation: {animationId: 'decasteljau'},
            scene: {
                id: 'rational-decasteljau-quarter', basedOn: 'demonstration-default',
                actions: [
                    {name: 'show-decasteljau-construction', value: true},
                    {name: 'set-decasteljau-parameter', value: 0.25},
                ],
                expectedState: text('Konstrukcija je prikazana pri \\(t=\\tfrac{1}{4}\\); vse homogene koordinate se interpolirajo skupaj.', 'The construction is shown at \\(t=\\tfrac{1}{4}\\); all homogeneous coordinates are interpolated together.'),
            },
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Predvajaj konstrukcijo in poišči vrstico, v kateri se začne spreminjati tudi zadnja, utežna koordinata.', 'Play the construction and identify the row in which the final, weight coordinate also changes.'),
            expectedObservations: [text('V vsaki vrstici se spreminjajo položajne in utežne koordinate; konstrukcija se konča z eno homogeno točko.', 'Position and weight coordinates change in every row; the construction ends in one homogeneous point.')],
        },
        {
            id: 'rational-decasteljau-projection', order: 3,
            title: text('Projekcija v ravnino', 'Projection to the plane'),
            purpose: text('Povezava zadnje homogene točke z dejansko točko na krivulji.', 'Connecting the final homogeneous point with the actual curve point.'),
            explanation: text(
                'Končna točka konstrukcije še ni zapisana v navadnih koordinatah. Prvi dve koordinati delimo z zadnjo in dobimo točko racionalne krivulje.',
                'The final construction point is not yet in ordinary coordinates. Divide its first two coordinates by the last to obtain the rational curve point.',
            ),
            formulaIds: ['rational-projection'],
            frames: [frame('rational-decasteljau-projection-explanation', 'explanation'), frame('rational-decasteljau-projection-calculation', 'calculation'), frame('rational-decasteljau-projection-observation', 'observation')],
            workedExampleId: 'rational-decasteljau-midpoint',
            scene: {
                id: 'rational-decasteljau-midpoint', basedOn: 'demonstration-default',
                actions: [
                    {name: 'show-decasteljau-construction', value: true},
                    {name: 'set-decasteljau-parameter', value: 0.5},
                ],
                expectedState: text('Končna konstrukcijska točka pri \\(t=\\tfrac{1}{2}\\) je projekcija točke \\(B(\\tfrac{1}{2})\\).', 'The final construction point at \\(t=\\tfrac{1}{2}\\) is the projection of \\(B(\\tfrac{1}{2})\\).'),
            },
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj izračunano točko \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) s končno točko konstrukcije.', 'Compare the calculated point \\(\\left(-\\tfrac{9}{11},\\,\\tfrac{21}{11}\\right)\\) with the final construction point.'),
            expectedObservations: [text('Po projekciji končna točka konstrukcije sovpada s točko racionalne krivulje.', 'After projection, the final construction point coincides with the point on the rational curve.')],
        },
        {
            id: 'rational-decasteljau-weight-effect', order: 4,
            title: text('Vpliv spremembe uteži', 'Effect of changing a weight'),
            purpose: text('Opazovanje spremembe oblike brez spremembe kontrolnega poligona.', 'Observing a shape change without changing the control polygon.'),
            explanation: text(
                'Ko spremeniš utež, se spremeni racionalna utežna vsota. Kontrolne točke ostanejo na istih mestih, vendar se krivulja pomakne proti točki z večjim vplivom.',
                'Changing a weight changes the rational weighted sum. The control points stay in place, but the curve is pulled toward the more influential point.',
            ),
            formulaIds: ['rational-weighted-form'],
            frames: [frame('rational-decasteljau-weight-effect-explanation', 'explanation'), frame('rational-decasteljau-weight-effect-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Razloži, kako bi sprememba uteži vplivala na uteženo vsoto, ne da bi premaknil kontrolne točke.', 'Explain how changing a weight would affect the weighted sum without moving the control points.'),
            expectedObservations: [text('Večja utež poveča vpliv svoje kontrolne točke; uvodna scena ohrani privzete uteži.', 'A larger weight increases its control point’s influence; the introductory scene keeps the default weights.')],
            scene: {
                id: 'rational-decasteljau-weight-exploration', basedOn: 'demonstration-default',
                actions: [{name: 'show-decasteljau-construction', value: true}, {name: 'show-weights', value: true}, {name: 'set-decasteljau-parameter', value: 0.75}],
                expectedState: text('Konstrukcija pri \\(t=\\tfrac{3}{4}\\) ostane vidna med spreminjanjem uteži.', 'The construction at \\(t=\\tfrac{3}{4}\\) remains visible while weights are changed.'),
            },
        },
        {
            id: 'rational-decasteljau-analysis', order: 5,
            title: text('Samostojna analiza', 'Independent analysis'),
            purpose: text('Povezava uteži, konstrukcije in projekcije v poljubni nastavitvi.', 'Connecting weights, construction, and projection in an arbitrary configuration.'),
            explanation: text(
                'Racionalna De Casteljaujeva konstrukcija je rekurzivni način izračuna iste racionalne krivulje, kot jo določa utežena Bernsteinova oblika.',
                'The rational De Casteljau construction recursively evaluates the same rational curve defined by the weighted Bernstein form.',
            ),
            formulaIds: ['rational-weighted-form', 'rational-projection'],
            frames: [frame('rational-decasteljau-analysis-explanation', 'explanation'), frame('rational-decasteljau-analysis-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Izberi parameter in utež ter preveri, ali se konstrukcija in projekcija še ujemata.', 'Choose a parameter and a weight, then check whether the construction and projection still agree.'),
            expectedObservations: [text('Pri regularni nastavitvi se zadnja projekcija ujema z vrednostjo racionalne krivulje.', 'For a regular configuration, the final projection agrees with the rational curve value.')],
        },
    ],
    sources: [
        {
            id: 'farin-rational-bezier',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            supports: ['rational Bézier curves', 'homogeneous coordinates', 'rational De Casteljau construction'],
            implementationCorrespondence: 'The repository evaluates rational curves by lifting weighted points to three coordinates, applying polynomial De Casteljau recursion, and projecting the result in src/bezeg/impl/curve/rational-bezier-curve.ts.',
        },
        {
            id: 'bezeg-rational-decasteljau-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/rational-bezier-curve.ts, src/graphs/curves/object/JXGRationalBezierCurve.ts, and src/graphs/curves/rational/RationalDecasteljauGraph.tsx.',
            supports: ['weighted evaluation', 'homogeneous De Casteljau rows', 'rational graph defaults and controls'],
        },
    ],
    edgeCases: [
        text('Pri ničelnem končnem imenovalcu projekcija ni določena; graf lahko prikaže neveljavne koordinate.', 'When the final denominator is zero, the projection is undefined; the graph may show invalid coordinates.'),
        text('Negativne ali ničelne uteži zahtevajo posebno razlago in niso del običajne začetne raziskave.', 'Negative or zero weights require special discussion and are outside the ordinary introductory exploration.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci uteži spreminjajo neposredno ali naj najprej samo berejo konstrukcijo.', 'Before classroom-ready review, confirm whether students should edit weights immediately or first only read the construction.'),
    ],
};

const elevation: GuidedLesson = {
    demonstrationId: 'elevation',
    title: text('Višanje stopnje brez spremembe krivulje', 'Degree elevation without changing the curve'),
    summary: text(
        'Višanje stopnje doda kontrolno točko, vendar predstavlja isto Bézierjevo krivuljo.',
        'Degree elevation adds a control point while representing the same Bézier curve.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje Bézierjevih kontrolnih točk in parametra \\(t\\).', 'Assumes familiarity with Bézier control points and the parameter \\(t\\).'),
        text('Potrebno je razlikovati stopnjo krivulje od števila kontrolnih točk.', 'Assumes the distinction between curve degree and the number of control points.'),
    ],
    learningGoals: [
        text('Povežeš stopnjo krivulje s številom kontrolnih točk.', 'Connect the degree of a curve with its number of control points.'),
        text('Izračunaš nove kontrolne točke pri višanju stopnje.', 'Calculate the new control points after degree elevation.'),
        text('Preveriš, da se vrednosti, krajišči in oblika krivulje ohranijo.', 'Check that curve values, endpoints, and shape are preserved.'),
    ],
    formulaBlocks: [
        {
            id: 'elevation-control-points',
            latex: 'Q_0=P_0,\\quad Q_{n+1}=P_n,\\quad Q_i=\\frac{i}{n+1}P_{i-1}+\\left(1-\\frac{i}{n+1}\\right)P_i',
            notation: text(
                'Nova notranja kontrolna točka je linearna kombinacija dveh sosednjih starih točk.',
                'Each new interior control point is a linear combination of two neighboring old points.',
            ),
            explanation: text(
                'Ko je stara stopnja \\(n\\), ima nova krivulja stopnjo \\(n+1\\) in \\(n+2\\) kontrolnih točk. Krajišči ostaneta enaki.',
                'When the old degree is \\(n\\), the new curve has degree \\(n+1\\) and \\(n+2\\) control points. The endpoints stay the same.',
            ),
        },
        {
            id: 'elevation-shape-invariance',
            latex: '\\widetilde{B}(t)=B(t),\\qquad 0\\le t\\le1',
            notation: text(
                'Višanje stopnje spremeni predstavitev, ne pa točk, ki jih krivulja izriše.',
                'Degree elevation changes the representation, not the points traced by the curve.',
            ),
            explanation: text(
                'Nova Bernsteinova oblika ima iste vrednosti za vsak parameter v običajnem intervalu.',
                'The new Bernstein form has the same value for every parameter in the ordinary interval.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'elevation-cubic-example',
            title: text('Višanje privzete kubične krivulje', 'Elevating the default cubic curve'),
            calculationLatex: 'P_0=(-4,-2),P_1=(-3,3),P_2=(2,3),P_3=(3,-2)',
            resultLatex: 'Q=(-4,-2),\\left(-\\frac{13}{4},\\frac74\\right),\\left(-\\frac12,3\\right),\\left(\\frac94,\\frac74\\right),(3,-2)',
            check: text(
                'Pri \\(t=\\tfrac{1}{2}\\) ostane vrednost \\(B(\\tfrac{1}{2})=\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\); preveri jo pred in po višanju stopnje.',
                'At \\(t=\\tfrac{1}{2}\\) the value remains \\(B(\\tfrac{1}{2})=\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\); check it before and after elevation.',
            ),
        },
    ],
    steps: [
        {
            id: 'elevation-degree', order: 1,
            title: text('Stopnja in kontrolne točke', 'Degree and control points'),
            purpose: text('Razlikovanje med geometrijo krivulje in njeno predstavitvijo.', 'Distinguishing the curve geometry from its representation.'),
            explanation: text(
                'Kubična Bézierjeva krivulja ima štiri kontrolne točke. Višanje stopnje bo dodalo peto točko, vendar naj bi narisana krivulja ostala ista.',
                'A cubic Bézier curve has four control points. Degree elevation will add a fifth point, while the drawn curve should stay the same.',
            ),
            formulaIds: ['elevation-shape-invariance'],
            frames: [frame('elevation-degree-explanation', 'explanation'), frame('elevation-degree-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej kontrolne točke in opiši obliko krivulje pred višanjem stopnje.', 'Count the control points and describe the curve shape before elevation.'),
            expectedObservations: [text('Privzeta krivulja ima štiri kontrolne točke in stopnjo 3.', 'The default curve has four control points and degree 3.')],
            scene: {
                id: 'elevation-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeta kubična krivulja in kontrolni poligon sta vidna.', 'The default cubic curve and control polygon are visible.'),
            },
        },
        {
            id: 'elevation-formula', order: 2,
            title: text('Nove kontrolne točke', 'New control points'),
            purpose: text('Uporaba formule za konstrukcijo višje stopnje.', 'Using the formula to construct the higher degree.'),
            explanation: text(
                'Notranje točke \\(Q_i\\) so izračunane iz sosednjih \\(P_i\\). Krajišči \\(Q_0\\) in \\(Q_4\\) se ujemata s starima krajiščema.',
                'The interior points \\(Q_i\\) are calculated from neighboring \\(P_i\\). The endpoints \\(Q_0\\) and \\(Q_4\\) equal the old endpoints.',
            ),
            formulaIds: ['elevation-control-points'],
            frames: [frame('elevation-formula-explanation', 'explanation'), frame('elevation-formula-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Klikni za višanje stopnje in primerjaj novi kontrolni poligon s starim.', 'Elevate the degree and compare the new control polygon with the old one.'),
            expectedObservations: [text('Število kontrolnih točk se poveča za eno, krajišči pa ostaneta isti.', 'The number of control points increases by one while the endpoints stay the same.')],
            scene: {
                id: 'elevation-raised', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'elevate-degree', value: true}],
                expectedState: text('Prikazana je stopnja 4 z novim kontrolnim poligonom.', 'Degree 4 and the new control polygon are shown.'),
            },
        },
        {
            id: 'elevation-calculation', order: 3,
            title: text('Preverjanje vrednosti', 'Checking a curve value'),
            purpose: text('Primerjava numerične vrednosti pred in po višanju stopnje.', 'Comparing a numerical value before and after elevation.'),
            explanation: text(
                'Formula za višanje stopnje je izbrana tako, da se Bernsteinove uteži prerazporedijo brez spremembe končne točke krivulje.',
                'The elevation formula redistributes the Bernstein weights without changing the final curve point.',
            ),
            formulaIds: ['elevation-control-points', 'elevation-shape-invariance'],
            frames: [frame('elevation-calculation-explanation', 'explanation'), frame('elevation-calculation-calculation', 'calculation'), frame('elevation-calculation-observation', 'observation')],
            workedExampleId: 'elevation-cubic-example',
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri vrednost pri \\(t=\\tfrac{1}{2}\\) na obeh predstavitvah.', 'Check the value at \\(t=\\tfrac{1}{2}\\) in both representations.'),
            expectedObservations: [text('Vrednost \\(\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\) se ohrani, čeprav je kontrolni poligon drugačen.', 'The value \\(\\left(-\\tfrac{1}{2},\\,\\tfrac{7}{4}\\right)\\) is preserved even though the control polygon is different.')],
            scene: {
                id: 'elevation-calculation-scene', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'elevate-degree', value: true}],
                expectedState: text('Višana krivulja je pripravljena za primerjavo pri \\(t=\\tfrac{1}{2}\\).', 'The elevated curve is ready for comparison at \\(t=\\tfrac{1}{2}\\).'),
            },
        },
        {
            id: 'elevation-analysis', order: 4,
            title: text('Samostojna primerjava', 'Independent comparison'),
            purpose: text('Preverjanje ohranjene geometrije z več parametri.', 'Checking preserved geometry at several parameters.'),
            explanation: text(
                'Višanje stopnje je uporabno, ko želimo enotno stopnjo ali dodatne kontrolne točke, ne da bi spremenili geometrijo krivulje.',
                'Degree elevation is useful when a common degree or extra control points are needed without changing the curve geometry.',
            ),
            formulaIds: ['elevation-shape-invariance'],
            frames: [frame('elevation-analysis-explanation', 'explanation'), frame('elevation-analysis-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Izberi več vrednosti \\(t\\) in preveri, ali se oblika in krajišči ujemajo.', 'Choose several \\(t\\) values and check whether the shape and endpoints agree.'),
            expectedObservations: [text('Pri običajnem intervalu se ujemajo vse preverjene točke, ne samo sredina.', 'All checked points agree on the ordinary interval, not only the midpoint.')],
            scene: {
                id: 'elevation-analysis-scene', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}, {name: 'elevate-degree', value: true}],
                expectedState: text('Končna višana predstavitev ostane na voljo za prosto raziskovanje.', 'The final elevated representation remains available for free exploration.'),
            },
        },
    ],
    sources: [
        {
            id: 'farin-degree-elevation',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            supports: ['Bézier degree elevation', 'control-point construction', 'shape preservation'],
            implementationCorrespondence: 'The degree-elevation recurrence is implemented by the curve model and exposed by JXGBezierCurve.elevate().',
        },
        {
            id: 'bezeg-elevation-implementation',
            citation: 'Bezeg source: src/graphs/curves/bezier/ElevationGraph.tsx and src/graphs/curves/object/JXGBezierCurve.ts.',
            supports: ['default cubic control points', 'degree elevation action', 'control-polygon rendering'],
        },
    ],
    edgeCases: [
        text('Višanje stopnje ne pomeni, da so nove notranje kontrolne točke na prvotni krivulji.', 'Degree elevation does not mean that the new interior control points lie on the original curve.'),
        text('Preverjanje velja za isto geometrijsko krivuljo; dodatne točke spremenijo predstavitev in kontrolni poligon.', 'The check concerns the same geometric curve; the extra points change the representation and control polygon.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci nove kontrolne točke izračunajo ročno ali jih najprej samo opazujejo.', 'Before classroom-ready review, confirm whether students should calculate the new control points by hand or first only observe them.'),
    ],
};

export const additionalGuidedLessons: readonly GuidedLesson[] = [rationalDecasteljau, elevation];
