import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText, SceneAction} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind, formulaIds?: readonly string[]): GuidedLessonFrame => ({id, kind, formulaIds});
const action = (name: SceneAction['name'], value: SceneAction['value']): SceneAction => ({name, value});
const scene = (id: string, actions: readonly SceneAction[], sl: string, en: string) => ({
    id, basedOn: 'demonstration-default' as const, actions, expectedState: text(sl, en),
});

const rational: GuidedLesson = {
    demonstrationId: 'rational',
    title: text('Racionalna Bézierjeva krivulja', 'Rational Bézier curve'),
    summary: text(
        'Razišči, kako uteži spremenijo vrednost racionalne krivulje, ne da bi premaknile kontrolne točke.',
        'Explore how weights change a rational curve value without moving the control points.',
    ),
    prerequisites: [
        text('Potrebno je osnovno poznavanje Bézierjevih kontrolnih točk in Bernsteinovih polinomov.', 'Assumes familiarity with Bézier control points and Bernstein polynomials.'),
        text('Potrebno je razlikovati kontrolni poligon od dejanske krivulje.', 'Assumes the distinction between a control polygon and the curve itself.'),
    ],
    learningGoals: [
        text('Prebereš uteži privzete racionalne krivulje.', 'Read the weights of the default rational curve.'),
        text('Izračunaš racionalno vrednost pri izbranem parametru.', 'Calculate a rational value at a chosen parameter.'),
        text('Razložiš, zakaj kontrolni poligon ostane enak, ko se spremeni utež.', 'Explain why the control polygon stays fixed when a weight changes.'),
    ],
    formulaBlocks: [
        {
            id: 'rational-base-weighted-form',
            latex: '\\mathbf{B}(t)=\\frac{\\sum_{i=0}^{n}b_{i,n}(t)w_iP_i}{\\sum_{i=0}^{n}b_{i,n}(t)w_i}',
            notation: text('Uteži nastopajo v števcu in imenovalcu; imenovalec normalizira skupni vpliv.', 'Weights occur in the numerator and denominator; the denominator normalizes their total influence.'),
            explanation: text('Pri enakih utežeh dobimo navadno Bézierjevo krivuljo. Pri različnih pozitivnih utežeh se vpliv kontrolnih točk spremeni.', 'Equal weights give an ordinary Bézier curve. Different positive weights change the influence of the control points.'),
        },
        {
            id: 'rational-base-equal-weights',
            latex: 'w_0=\\cdots=w_n\\Longrightarrow\\mathbf{B}(t)=\\sum_{i=0}^{n}b_{i,n}(t)P_i',
            notation: text('Če so vse uteži enake, se skupni faktor pokrajša.', 'When all weights are equal, the common factor cancels.'),
            explanation: text('Racionalna oblika vsebuje navadno Bézierjevo obliko kot poseben primer.', 'The rational form contains the ordinary Bézier form as a special case.'),
        },
        {
            id: 'rational-base-endpoints',
            latex: '\\mathbf{B}(0)=P_0,\\qquad\\mathbf{B}(1)=P_n',
            notation: text('Krajišči sta določeni s prvo in zadnjo kontrolno točko, če je ustrezna utež regularna.', 'The endpoints are determined by the first and last control points when the corresponding weight is regular.'),
            explanation: text('Uteži vplivajo na notranji potek, ne pa na osnovno krajiščno pripadnost.', 'Weights affect the interior behavior, not the endpoint ownership.'),
        },
    ],
    workedExamples: [{
        id: 'rational-base-midpoint',
        title: text('Privzeta krivulja pri t=1/2', 'The default curve at t=1/2'),
        calculationLatex: 'P=(-4,-3),(-3,3),(3,3),(4,-3),\\quad w=(1,2,1,1),\\quad b(1/2)=(1/8,3/8,3/8,1/8)',
        resultLatex: '\\mathbf{B}(1/2)=\\frac{(-9/8,21/8)}{11/8}=(-9/11,21/11)',
        check: text('Primerjaj izračun z označeno točko na grafu in z racionalno De Casteljaujevo konstrukcijo.', 'Compare the calculation with the marked graph point and the rational De Casteljau construction.'),
    }],
    steps: [
        {
            id: 'rational-base-weights', order: 1,
            title: text('Uteži so dodatni podatki', 'Weights are additional data'),
            purpose: text('Prepoznavanje razlike med položajem kontrolne točke in njenim vplivom.', 'Recognizing the difference between a control-point position and its influence.'),
            explanation: text('Privzeta krivulja ima kontrolne točke (-4,-3),(-3,3),(3,3),(4,-3) in uteži (1,2,1,1). Druga kontrolna točka ima večjo utež.', 'The default curve has control points (-4,-3),(-3,3),(3,3),(4,-3) and weights (1,2,1,1). The second control point has greater weight.'),
            formulaIds: ['rational-base-weighted-form'],
            frames: [frame('rational-base-weights-explanation', 'explanation'), frame('rational-base-weights-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj kontrolni poligon, oznake uteži in lego krivulje.', 'Compare the control polygon, weight labels, and curve position.'),
            expectedObservations: [text('Utež 2 pripada drugi kontrolni točki; kontrolni poligon sam ne pokaže vseh podatkov racionalne krivulje.', 'Weight 2 belongs to the second control point; the control polygon alone does not show all rational-curve data.'),],
            scene: scene('rational-base-default', [action('show-control-polygon', true), action('show-weights', true)], 'Kontrolni poligon in privzete uteži so vidni.', 'The control polygon and default weights are visible.'),
        },
        {
            id: 'rational-base-evaluation', order: 2,
            title: text('Utežena vrednost', 'Weighted value'),
            purpose: text('Povezava formule z označeno točko na krivulji.', 'Connecting the formula with a marked curve point.'),
            explanation: text('Pri t=1/2 Bernsteinovi faktorji določijo deleže, uteži pa te deleže spremenijo pred normalizacijo.', 'At t=1/2 the Bernstein factors determine shares, while the weights change those shares before normalization.'),
            formulaIds: ['rational-base-weighted-form'],
            frames: [frame('rational-base-evaluation-explanation', 'explanation', ['rational-base-weighted-form']), frame('rational-base-evaluation-calculation', 'calculation'), frame('rational-base-evaluation-observation', 'observation')],
            workedExampleId: 'rational-base-midpoint',
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri, ali se izračunana točka (-9/11,21/11) ujema z označeno točko.', 'Check whether the calculated point (-9/11,21/11) matches the marked point.'),
            expectedObservations: [text('Končni položaj je rezultat števca in imenovalca, ne samo povprečja kontrolnih točk.', 'The final position comes from the numerator and denominator, not just an average of control points.'),],
            scene: scene('rational-base-midpoint', [action('show-control-polygon', true), action('show-weights', true), action('show-evaluation-point', 0.5)], 'Točka B(1/2) in uteži so pripravljene za preverjanje.', 'Point B(1/2) and the weights are ready for checking.'),
        },
        {
            id: 'rational-base-endpoints', order: 3,
            title: text('Krajišči ostaneta določeni', 'The endpoints remain determined'),
            purpose: text('Preverjanje krajiščne lastnosti racionalne oblike.', 'Checking the endpoint property of the rational form.'),
            explanation: text('Pri t=0 in t=1 preživi samo prvi oziroma zadnji Bernsteinov člen. Zato sta krajišči povezana s P₀ in P₃.', 'At t=0 and t=1 only the first or last Bernstein term survives. Therefore the endpoints are tied to P₀ and P₃.'),
            formulaIds: ['rational-base-endpoints'],
            frames: [frame('rational-base-endpoints-explanation', 'explanation'), frame('rational-base-endpoints-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Premakni parameter proti 0 in 1 ter opazuj krajišči krivulje.', 'Move the parameter toward 0 and 1 and observe the curve endpoints.'),
            expectedObservations: [text('Krivulja se pri krajiščih dotakne prve oziroma zadnje kontrolne točke.', 'The curve reaches the first and last control points at its endpoints.'),],
            scene: scene('rational-base-endpoint-check', [action('show-weights', true), action('show-evaluation-point', 0.25)], 'Točka pri t=1/4 je pripravljena za opazovanje približevanja krajiščema.', 'The point at t=1/4 is ready for observing the endpoint behavior.'),
        },
        {
            id: 'rational-base-analysis', order: 4,
            title: text('Samostojna analiza uteži', 'Independent weight analysis'),
            purpose: text('Povezava uteži, parametra in položaja točke.', 'Connecting weights, parameter, and point position.'),
            explanation: text('Uteži lahko razumeš kot del racionalnega opisa krivulje; njihova sprememba ne premakne kontrolnega poligona, spremeni pa vrednosti B(t).', 'Weights are part of the rational curve description; changing one does not move the control polygon, but changes B(t).'),
            formulaIds: ['rational-base-weighted-form', 'rational-base-equal-weights'],
            frames: [frame('rational-base-analysis-explanation', 'explanation'), frame('rational-base-analysis-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('V prostem raziskovanju izberi parameter in razloži, katera utež najbolj vpliva na tvojo primerjavo.', 'In free exploration, choose a parameter and explain which weight most influences your comparison.'),
            expectedObservations: [text('Razlaga mora povezati položaj, Bernsteinov faktor in utež, ne samo videza krivulje.', 'The explanation should connect position, the Bernstein factor, and the weight—not only the curve’s appearance.'),],
            scene: scene('rational-base-analysis', [action('show-control-polygon', true), action('show-weights', true), action('show-evaluation-point', 0.75)], 'Končna scena ohrani uteži, poligon in označeno točko.', 'The final scene keeps the weights, polygon, and marked point visible.'),
        },
    ],
    sources: [
        {id: 'farin-rational-base', citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.', supports: ['rational Bézier evaluation', 'weights', 'endpoint behavior'], implementationCorrespondence: 'The repository evaluates the rational curve with weighted Bernstein terms in src/bezeg/impl/curve/rational-bezier-curve.ts.'},
        {id: 'bezeg-rational-base', citation: 'Bezeg source: src/graphs/curves/rational/RationalBezierCurveGraph.tsx and src/graphs/curves/object/JXGRationalBezierCurve.ts.', supports: ['default points and weights', 'weight labels', 'evaluation marker']},
    ],
    edgeCases: [
        text('Negativne ali ničelne uteži lahko povzročijo nedoločeno projekcijo in niso del te uvodne scene.', 'Negative or zero weights can produce an undefined projection and are outside this introductory scene.'),
        text('Pri enakih utežeh se racionalna oblika reducira na navadno Bézierjevo krivuljo.', 'With equal weights the rational form reduces to the ordinary Bézier curve.'),
    ],
    unresolvedQuestions: [text('Pred classroom-ready pregledom potrdi, ali naj bo neposredno urejanje uteži ločen napredni korak.', 'Before classroom-ready review, confirm whether direct weight editing should be a separate advanced step.')],
};

const phQuintic: GuidedLesson = {
    demonstrationId: 'ph-quintic',
    title: text('Kvintična PH-krivulja', 'Quintic PH curve'),
    summary: text('Poveži tri generatorje hodografa, polinomsko hitrost in odmično krivuljo.', 'Connect three hodograph generators, polynomial speed, and an offset curve.'),
    prerequisites: [
        text('Potrebno je osnovno poznavanje vektorjev in odvoda parametrične krivulje.', 'Assumes basic familiarity with vectors and derivatives of parametric curves.'),
        text('Potrebno je razumeti, da je odmik dodatna konstrukcija in ne nova osnovna krivulja.', 'Assumes that an offset is an additional construction, not a new base curve.'),
    ],
    learningGoals: [
        text('Povežeš število generatorjev z lihim stopnjam PH-krivulje.', 'Connect the number of generators with the odd degree of a PH curve.'),
        text('Izračunaš polinomsko hitrost iz hodografa.', 'Calculate polynomial speed from the hodograph.'),
        text('Razložiš vpliv predznaka in velikosti odmika.', 'Explain the effect of offset sign and magnitude.'),
    ],
    formulaBlocks: [
        {id: 'ph-quintic-degree', latex: 'm=3\\Longrightarrow\\deg r=2m-1=5', notation: text('Trije generatorji določijo kvintično PH-krivuljo.', 'Three generators determine a quintic PH curve.'), explanation: text('Stopnja je ena manj kot dvakratno število generatorjev.', 'The degree is one less than twice the number of generators.')},
        {id: 'ph-quintic-hodograph', latex: 'w(t)=\\sum_{i=0}^{2}b_{i,2}(t)w_i,\\qquad r\'(t)=w(t)^2', notation: text('Hodograf se kvadrira v kompleksni predstavitvi odvoda.', 'The hodograph is squared in the complex representation of the derivative.'), explanation: text('Kvadrat ne pomeni navadnega skalarnega kvadrata; uporablja se kompleksno množenje ravninskih vektorjev.', 'The square is not an ordinary scalar square; it uses complex multiplication of planar vectors.')},
        {id: 'ph-quintic-speed', latex: '\\|r\'(t)\\|=\\|w(t)\\|^2', notation: text('Hitrost je kvadrat dolžine hodografa.', 'Speed is the square of the hodograph length.'), explanation: text('Zato je hitrost polinom in jo lahko preverimo brez numeričnega odvajanja izrisa.', 'The speed is therefore polynomial and can be checked without numerically differentiating the drawing.')},
        {id: 'ph-quintic-offset', latex: 'r_d(t)=r(t)+d\\,n(t)', notation: text('Odmik uporablja razdaljo d in normalno smer n(t).', 'The offset uses distance d and normal direction n(t).'), explanation: text('V prikazu ostane osnovna PH-krivulja enaka, medtem ko se doda odmična konstrukcija.', 'The base PH curve stays the same in the display while an offset construction is added.')},
    ],
    workedExamples: [{
        id: 'ph-quintic-speed-midpoint', title: text('Hitrost pri t=1/2', 'Speed at t=1/2'),
        calculationLatex: 'w(1/2)=\\tfrac14(-3.3,0)+\\tfrac12(0.2,-4)+\\tfrac14(2,-3.2)=(-0.225,-2.8)',
        resultLatex: '\\|r\'(1/2)\\|=\\|w(1/2)\\|^2=(-0.225)^2+(-2.8)^2=7.890625',
        check: text('Vrednost primerjaj z istim hodografom in ne z vizualno dolžino odseka na grafu.', 'Compare the value with the same hodograph, not with the visual length of a graph segment.'),
    }],
    steps: [
        {
            id: 'ph-quintic-degree', order: 1, title: text('Tri generatorji, stopnja pet', 'Three generators, degree five'),
            purpose: text('Razumevanje vhodnih podatkov kvintične PH-krivulje.', 'Understanding the inputs of the quintic PH curve.'),
            explanation: text('Privzeta scena začne s P₀=(1,-1) in tremi generatorji w₀=(-3.3,0), w₁=(0.2,-4), w₂=(2,-3.2).', 'The default scene starts with P₀=(1,-1) and three generators w₀=(-3.3,0), w₁=(0.2,-4), w₂=(2,-3.2).'),
            formulaIds: ['ph-quintic-degree'], frames: [frame('ph-quintic-degree-explanation', 'explanation'), frame('ph-quintic-degree-observation', 'observation')], learnerInteraction: 'observe',
            observationPrompt: text('Preštej generatorje in poveži njihovo število s stopnjo krivulje.', 'Count the generators and connect their number with the curve degree.'),
            expectedObservations: [text('Trije generatorji dajo stopnjo 5; generatorji so vhod, večina kontrolnih točk krivulje pa je izpeljana.', 'Three generators give degree 5; the generators are inputs, while most curve control points are derived.')],
            scene: scene('ph-quintic-default', [], 'Privzeta kvintična scena ostane pripravljena brez odmika.', 'The default quintic scene remains prepared without an offset.'),
        },
        {
            id: 'ph-quintic-speed', order: 2, title: text('Hodograf določa hitrost', 'The hodograph determines speed'),
            purpose: text('Povezava hodografa z odvodom in hitrostjo.', 'Connecting the hodograph with the derivative and speed.'),
            explanation: text('Pri t=1/2 se trije generatorji zmešajo z Bernsteinovimi faktorji stopnje 2; nato kvadrat norme določi hitrost.', 'At t=1/2 the three generators mix with degree-two Bernstein factors; the squared norm then gives speed.'),
            formulaIds: ['ph-quintic-hodograph', 'ph-quintic-speed'], frames: [frame('ph-quintic-speed-explanation', 'explanation'), frame('ph-quintic-speed-calculation', 'calculation'), frame('ph-quintic-speed-observation', 'observation')], workedExampleId: 'ph-quintic-speed-midpoint', learnerInteraction: 'observe',
            observationPrompt: text('Preveri vrednost 7.890625 z izračunom srednjega hodografa.', 'Check 7.890625 by calculating the midpoint hodograph.'),
            expectedObservations: [text('Hitrost je kvadrat dolžine hodografa, ne dolžina osnovne krivulje.', 'Speed is the squared length of the hodograph, not the length of the base curve.')],
            scene: scene('ph-quintic-speed-scene', [action('show-evaluation-point', 0.5)], 'Označena je srednja točka osnovne krivulje.', 'The midpoint of the base curve is marked.'),
        },
        {
            id: 'ph-quintic-offset-positive', order: 3, title: text('Pozitiven odmik', 'Positive offset'),
            purpose: text('Razlikovanje osnovne in odmične krivulje.', 'Distinguishing the base curve from its offset.'),
            explanation: text('Pri d=0.5 runtime prikaže odmično krivuljo, osnovna PH-krivulja pa ostane ista.', 'At d=0.5 the runtime shows an offset curve while the base PH curve stays the same.'),
            formulaIds: ['ph-quintic-offset'], frames: [frame('ph-quintic-offset-positive-explanation', 'explanation'), frame('ph-quintic-offset-positive-observation', 'observation')], learnerInteraction: 'adjust-offset-distance',
            observationPrompt: text('Primerjaj osnovno krivuljo in odmik pri d=0.5.', 'Compare the base curve and the offset at d=0.5.'),
            expectedObservations: [text('Odmik je dodatna konstrukcija; generatorji in osnovna krivulja se ne zamenjajo.', 'The offset is an additional construction; the generators and base curve are not replaced.')],
            scene: scene('ph-quintic-offset-positive', [action('set-offset-distance', 0.5), action('show-offset-curve', true)], 'Prikazan je odmik pri d=0.5.', 'The offset at d=0.5 is shown.'),
        },
        {
            id: 'ph-quintic-offset-sign', order: 4, title: text('Predznak odmika', 'Offset sign'),
            purpose: text('Opazovanje spremembe strani odmika.', 'Observing the change of offset side.'),
            explanation: text('Negativen d izbere nasprotno stran normalne smeri; osnovna krivulja ostane nespremenjena.', 'A negative d selects the opposite normal side; the base curve stays unchanged.'),
            formulaIds: ['ph-quintic-offset'], frames: [frame('ph-quintic-offset-sign-explanation', 'explanation'), frame('ph-quintic-offset-sign-observation', 'observation')], learnerInteraction: 'adjust-offset-distance',
            observationPrompt: text('Primerjaj odmika pri d=0.5 in d=-0.5 ter opiši nespremenjeni del.', 'Compare d=0.5 and d=-0.5 and describe what does not change.'),
            expectedObservations: [text('Predznak spremeni stran odmika, ne pa stopnje ali vhodnih generatorjev.', 'The sign changes the offset side, not the degree or input generators.')],
            scene: scene('ph-quintic-offset-negative', [action('set-offset-distance', -0.5), action('show-offset-curve', true)], 'Prikazan je odmik pri d=-0.5.', 'The offset at d=-0.5 is shown.'),
        },
        {
            id: 'ph-quintic-analysis', order: 5, title: text('Samostojna analiza', 'Independent analysis'),
            purpose: text('Povezava generatorjev, hitrosti in odmika.', 'Connecting generators, speed, and offset.'),
            explanation: text('Pri prostem raziskovanju loči, kaj določa osnovno krivuljo, kaj določa hitrost in kaj je samo odmični prikaz.', 'During free exploration, distinguish what determines the base curve, speed, and the offset display.'),
            formulaIds: ['ph-quintic-hodograph', 'ph-quintic-speed'], frames: [frame('ph-quintic-analysis-explanation', 'explanation'), frame('ph-quintic-analysis-observation', 'observation')], learnerInteraction: 'adjust-offset-distance',
            observationPrompt: text('Izberi razdaljo odmika in razloži, kateri podatki ostanejo nespremenjeni.', 'Choose an offset distance and explain which data remain unchanged.'),
            expectedObservations: [text('Generatorji določajo PH-krivuljo in hitrost; d določa odmični prikaz.', 'The generators determine the PH curve and speed; d determines the offset display.')],
            scene: scene('ph-quintic-analysis-scene', [action('set-offset-distance', 1), action('show-offset-curve', true)], 'Končna scena omogoča primerjavo osnovne in odmične krivulje.', 'The final scene enables comparison of base and offset curves.'),
        },
    ],
    sources: [
        {id: 'farouki-ph-quintic', citation: 'Farouki, R. T. Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable, Springer, 2008.', supports: ['PH hodographs', 'polynomial speed', 'offset motivation'], implementationCorrespondence: 'The repository constructs degree 2m-1 PH curves from m generators in src/bezeg/impl/curve/ph-bezier-curve.ts.'},
        {id: 'bezeg-ph-quintic', citation: 'Bezeg source: src/graphs/curves/ph/QuinticPhBezierCurveGraph.tsx, src/graphs/curves/ph/BasePhBezierCurveGraph.tsx, and src/graphs/curves/object/JXGPHBezierCurve.ts.', supports: ['default quintic generators', 'offset visibility', 'offset distance action']},
    ],
    edgeCases: [
        text('Če hodograf izgine, regularnost in normalna smer odmika nista zagotovljeni.', 'If the hodograph vanishes, regularity and a normal offset direction are not guaranteed.'),
        text('Odmik ni dokaz, da sta dve krivulji povsod na enaki vizualni razdalji v projekciji zaslona.', 'An offset is not evidence that two curves are at equal visual distance in screen projection everywhere.'),
    ],
    unresolvedQuestions: [text('Pred classroom-ready pregledom preveri, ali želiš vključiti sekundarni graf generatorjev kot ločeno dejavnost.', 'Before classroom-ready review, decide whether the secondary generator graph should be a separate activity.')],
};

const affine: GuidedLesson = {
    demonstrationId: 'affine',
    title: text('Afine transformacije Bézierjeve krivulje', 'Affine transformations of a Bézier curve'),
    summary: text('Preveri, kako premik in merilo delujeta na kontrolne točke in krivuljo.', 'Check how translation and scaling act on control points and the curve.'),
    prerequisites: [
        text('Potrebno je osnovno poznavanje linearnih transformacij ravnine.', 'Assumes basic familiarity with planar linear transformations.'),
        text('Potrebno je poznavanje Bézierjevega vrednotenja kot utežene vsote kontrolnih točk.', 'Assumes Bézier evaluation as a weighted sum of control points.'),
    ],
    learningGoals: [
        text('Prepoznaš, da afina transformacija deluje na vse kontrolne točke.', 'Recognize that an affine transformation acts on every control point.'),
        text('Preveriš komutativnost transformacije in vrednotenja.', 'Check that transformation and evaluation commute.'),
        text('Ločiš spremembo lege ali merila od spremembe stopnje krivulje.', 'Distinguish a change of position or scale from a change of curve degree.'),
    ],
    formulaBlocks: [
        {id: 'affine-map', latex: 'T(P)=AP+b', notation: text('Afina preslikava je linearni del A in premik b.', 'An affine map consists of a linear part A and translation b.'), explanation: text('Premiki in enakomerno merilo v tej lekciji sta afini preslikavi, ki uporabljata isto pravilo za vse kontrolne točke.', 'The translation and uniform scaling used in this lesson are affine maps that apply the same rule to every control point.')},
        {id: 'affine-bezier-commutation', latex: 'T(B(t))=T\\left(\\sum_i b_{i,n}(t)P_i\\right)=\\sum_i b_{i,n}(t)T(P_i)', notation: text('Afina preslikava lahko gre skozi Bernsteinovo vsoto.', 'An affine map can pass through the Bernstein sum.'), explanation: text('Zato lahko transformiraš kontrolne točke ali najprej izračunaš točko krivulje in dobiš isti rezultat.', 'Therefore transforming control points or evaluating first and then transforming gives the same result.')},
        {id: 'affine-degree-invariant', latex: '\\deg(T(B))=\\deg(B),\\qquad t\\in[0,1]', notation: text('Afina transformacija ne spremeni stopnje ali parametričnega intervala.', 'An affine transformation does not change degree or parameter interval.'), explanation: text('Spremeni se geometrijska lega oziroma merilo, ne pa število Bernsteinovih členov.', 'The geometric position or scale changes, not the number of Bernstein terms.')},
    ],
    workedExamples: [{
        id: 'affine-translation-midpoint', title: text('Premik v desno pri t=1/2', 'Translation right at t=1/2'),
        calculationLatex: 'B(1/2)=(3/8,0),\\qquad T(x,y)=(x+1/2,y)',
        resultLatex: 'T(B(1/2))=(7/8,0)=B_T(1/2)',
        check: text('Po premiku za 1/2 preveri istočko na grafu in transformirane kontrolne točke.', 'After translating by 1/2, check the graph point and transformed control points.'),
    }],
    steps: [
        {
            id: 'affine-map', order: 1, title: text('Kaj je afina transformacija?', 'What is an affine transformation?'),
            purpose: text('Razlikovanje linearnega dela in premika.', 'Distinguishing the linear part from translation.'),
            explanation: text('Afina preslikava lahko spremeni lego, orientacijo ali merilo krivulje, vendar uporablja isto preslikavo za vse kontrolne točke.', 'An affine map can change position, orientation, or scale while using the same map for every control point.'),
            formulaIds: ['affine-map', 'affine-degree-invariant'], frames: [frame('affine-map-explanation', 'explanation'), frame('affine-map-observation', 'observation')], learnerInteraction: 'observe',
            observationPrompt: text('Preštej kontrolne točke in opiši, kaj se v privzeti sceni lahko spremeni brez spremembe stopnje.', 'Count the control points and describe what can change without changing degree.'),
            expectedObservations: [text('Privzeta krivulja je kubična in ima štiri kontrolne točke; transformacija tega ne spremeni.', 'The default curve is cubic with four control points; the transformation does not change that.')],
            scene: scene('affine-default', [action('show-control-polygon', true), action('show-evaluation-point', 0.5)], 'Privzeta krivulja, kontrolni poligon in B(1/2) so vidni.', 'The default curve, control polygon, and B(1/2) are visible.'),
        },
        {
            id: 'affine-translation', order: 2, title: text('Premik skozi Bernsteinovo vsoto', 'Translation through the Bernstein sum'),
            purpose: text('Preverjanje afine komutativnosti na konkretnem primeru.', 'Checking affine commutation in a concrete example.'),
            explanation: text('Premik za 1/2 v smeri x doda isti vektor vsaki kontrolni točki in tudi vrednosti B(t).', 'Translating by 1/2 in x adds the same vector to every control point and to B(t).'),
            formulaIds: ['affine-bezier-commutation'], frames: [frame('affine-translation-explanation', 'explanation', ['affine-bezier-commutation']), frame('affine-translation-calculation', 'calculation'), frame('affine-translation-observation', 'observation')], workedExampleId: 'affine-translation-midpoint', learnerInteraction: 'observe',
            observationPrompt: text('Preveri, ali se B(1/2) premakne za isti vektor kot kontrolne točke.', 'Check whether B(1/2) moves by the same vector as the control points.'),
            expectedObservations: [text('Po premiku je B_T(1/2)=(7/8,0), kar je T(B(1/2)).', 'After translation B_T(1/2)=(7/8,0), which equals T(B(1/2)).')],
            scene: scene('affine-translation-right', [action('show-control-polygon', true), action('translate-x', 0.5), action('show-evaluation-point', 0.5)], 'Krivulja je premaknjena za 1/2 v desno.', 'The curve is translated 1/2 to the right.'),
        },
        {
            id: 'affine-scale', order: 3, title: text('Merilo brez spremembe stopnje', 'Scale without changing degree'),
            purpose: text('Opazovanje spremembe velikosti in nespremenjene parametrične strukture.', 'Observing a size change with unchanged parametric structure.'),
            explanation: text('Enakomerno merilo 1,2 spremeni velikost okoli središča krivulje, ne pa števila kontrolnih točk ali intervala t.', 'Uniform scale 1.2 changes size around the curve center, not the number of control points or the t interval.'),
            formulaIds: ['affine-degree-invariant'], frames: [frame('affine-scale-explanation', 'explanation'), frame('affine-scale-observation', 'observation')], learnerInteraction: 'observe',
            observationPrompt: text('Primerjaj stopnjo, število točk in obliko pred in po spremembi merila.', 'Compare degree, point count, and shape before and after scaling.'),
            expectedObservations: [text('Merilo spremeni razsežnost, ne pa stopnje ali števila Bernsteinovih členov.', 'Scaling changes size, not degree or the number of Bernstein terms.')],
            scene: scene('affine-scale-up', [action('show-control-polygon', true), action('scale-affine', 1.2), action('show-evaluation-point', 0.5)], 'Krivulja je povečana z merilom 1,2.', 'The curve is enlarged by scale 1.2.'),
        },
        {
            id: 'affine-analysis', order: 4, title: text('Samostojna primerjava', 'Independent comparison'),
            purpose: text('Uporaba afine komutativnosti pri prostem raziskovanju.', 'Using affine commutation during free exploration.'),
            explanation: text('Pri prostem raziskovanju primerjaj transformirane kontrolne točke z označeno vrednostjo krivulje.', 'During free exploration, compare transformed control points with the marked curve value.'),
            formulaIds: ['affine-bezier-commutation'], frames: [frame('affine-analysis-explanation', 'explanation'), frame('affine-analysis-observation', 'observation')], learnerInteraction: 'observe',
            observationPrompt: text('Izberi transformacijo in preveri en parameter, za katerega lahko utemeljiš rezultat.', 'Choose a transformation and check one parameter value whose result you can justify.'),
            expectedObservations: [text('Transformacija vrednosti in transformirano vrednotenje kontrolnih točk se ujemata.', 'Transforming the value and evaluating transformed control points agree.')],
            scene: scene('affine-translate-up', [action('show-control-polygon', true), action('translate-y', 0.5), action('show-evaluation-point', 0.75)], 'Končna scena pokaže premik za 1/2 navzgor.', 'The final scene shows a translation by 1/2 upward.'),
        },
    ],
    sources: [
        {id: 'farin-affine-bezier', citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.', supports: ['affine invariance of Bézier curves', 'control-point transformations'], implementationCorrespondence: 'The implementation transforms the point-controlled curve while evaluating the same Bernstein representation.'},
        {id: 'bezeg-affine', citation: 'Bezeg source: src/graphs/curves/bezier/AffineTransformsBezierCurveGraph.tsx and src/bezeg/impl/curve/abstract-point-controlled-curve.ts.', supports: ['translation', 'scaling', 'rotation', 'reflection operations']},
    ],
    edgeCases: [
        text('Afina transformacija lahko spremeni lego ali merilo, vendar ne sme ustvariti nove stopnje.', 'An affine transformation can change position or scale, but it does not create a new degree.'),
        text('V tej lekciji se merilo uporablja kot enakomerno merilo okoli središča krivulje, kot ga izvaja graf.', 'This lesson uses uniform scaling around the curve center, as implemented by the graph.'),
    ],
    unresolvedQuestions: [text('Pred ločeno lekcijo za vrtenje in zrcaljenje določi eksplicitno središče transformacije; trenutna grafična operacija ga izračuna iz kontrolnih točk.', 'Before a separate rotation and reflection lesson, define the transform center explicitly; the current graph operation derives it from the control points.')],
};

export const expansionGuidedLessons: readonly GuidedLesson[] = [rational, phQuintic, affine];
