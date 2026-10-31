import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const weightedParameterization: GuidedLesson = {
    demonstrationId: 'weighted-parameterization',
    title: text('Utežena parametrizacija', 'Weighted parameterization'),
    summary: text(
        'Krivulja in njene kontrolne točke ostanejo enake, spremeni se le, pri katerih parametrih \\(t\\) so izbrane točke na njej: parameter \\(\\alpha\\) preoblikuje enakomerne vrednosti \\(t_i\\) z racionalno funkcijo \\(\\varphi_\\alpha\\).',
        'The curve and its control points stay the same; only the parameters \\(t\\) at which points are picked on it change: the parameter \\(\\alpha\\) reshapes the equally spaced values \\(t_i\\) with the rational function \\(\\varphi_\\alpha\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Bézierjeve krivulje \\(B(t)\\) in intervala \\([0,1]\\).', 'Assumes familiarity with a Bézier curve \\(B(t)\\) and the interval \\([0,1]\\).'),
        text('Priporočeno je, da parameter \\(t\\) razumeš kot čas premikanja po krivulji.', 'It helps to think of the parameter \\(t\\) as time while moving along the curve.'),
    ],
    learningGoals: [
        text('Razložiš, da parametrizacija določa, kako hitro se po isti krivulji premikamo, ne pa oblike krivulje.', 'Explain that a parameterization sets how fast we traverse the same curve, not the curve shape.'),
        text('Izračunaš \\(\\varphi_\\alpha(t)\\) za dane \\(\\alpha\\) in \\(t\\) ter napoveš, proti kateri kontrolni točki se vzorčne točke zgostijo.', 'Compute \\(\\varphi_\\alpha(t)\\) for given \\(\\alpha\\) and \\(t\\) and predict toward which control point the sample points crowd.'),
        text('Uporabiš simetrijo \\(\\varphi_{1-\\alpha}(t)=1-\\varphi_\\alpha(1-t)\\) in navedeš, kaj se zgodi pri \\(\\alpha=0\\) in \\(\\alpha=1\\).', 'Use the symmetry \\(\\varphi_{1-\\alpha}(t)=1-\\varphi_\\alpha(1-t)\\) and state what happens at \\(\\alpha=0\\) and \\(\\alpha=1\\).'),
    ],
    formulaBlocks: [
        {
            id: 'wp-sample-parameters',
            latex: 't_i=\\frac{i}{N+1},\\qquad i=1,\\dots,N,\\qquad \\text{sample points } B\\bigl(\\varphi_\\alpha(t_i)\\bigr)',
            notation: text(
                'Število točk \\(N\\) določa, koliko vzorčnih točk je na krivulji; \\(t_i\\) so enakomerno razporejene vrednosti med 0 in 1, krivulja \\(B\\) je fiksna.',
                'The number of points \\(N\\) sets how many sample points lie on the curve; the \\(t_i\\) are equally spaced values between 0 and 1, and the curve \\(B\\) is fixed.',
            ),
            explanation: text(
                'Točke na krivulji so \\(B(\\varphi_\\alpha(t_i))\\). Pri \\(\\varphi_\\alpha(t)=t\\) so to točke \\(B(t_i)\\).',
                'The points on the curve are \\(B(\\varphi_\\alpha(t_i))\\). When \\(\\varphi_\\alpha(t)=t\\) they are the points \\(B(t_i)\\).',
            ),
        },
        {
            id: 'wp-phi',
            latex: '\\varphi_\\alpha(t)=\\frac{(1-\\alpha)\\,t}{\\alpha\\,(1-t)+(1-\\alpha)\\,t}',
            notation: text(
                'Parameter \\(\\alpha\\) je na drsniku \\(\\alpha\\) med 0 in 1; \\(t\\) je vrednost med 0 in 1.',
                'The parameter \\(\\alpha\\) is on the \\(\\alpha\\) slider between 0 and 1; \\(t\\) is a value between 0 and 1.',
            ),
            explanation: text(
                'Za \\(0<\\alpha<1\\) je \\(\\varphi_\\alpha\\) naraščajoča, \\(\\varphi_\\alpha(0)=0\\) in \\(\\varphi_\\alpha(1)=1\\), zato preslika \\([0,1]\\) nazaj na \\([0,1]\\). Pri \\(\\alpha=\\tfrac{1}{2}\\) je \\(\\varphi_\\alpha(t)=t\\).',
                'For \\(0<\\alpha<1\\) the function \\(\\varphi_\\alpha\\) is increasing, \\(\\varphi_\\alpha(0)=0\\) and \\(\\varphi_\\alpha(1)=1\\), so it maps \\([0,1]\\) back onto \\([0,1]\\). At \\(\\alpha=\\tfrac{1}{2}\\) we have \\(\\varphi_\\alpha(t)=t\\).',
            ),
        },
        {
            id: 'wp-symmetry',
            latex: '\\varphi_{1-\\alpha}(t)=1-\\varphi_\\alpha(1-t)',
            notation: text(
                'Zamenjava \\(\\alpha\\) z \\(1-\\alpha\\) je zrcaljenje parametra \\(t\\) v \\(1-t\\).',
                'Replacing \\(\\alpha\\) with \\(1-\\alpha\\) mirrors the parameter \\(t\\) to \\(1-t\\).',
            ),
            explanation: text(
                'Če se pri \\(\\alpha\\) točke zgostijo proti \\(P_3\\), se pri \\(1-\\alpha\\) zgostijo enako proti \\(P_0\\).',
                'If the points crowd toward \\(P_3\\) for \\(\\alpha\\), they crowd the same way toward \\(P_0\\) for \\(1-\\alpha\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'wp-quarter',
            title: text('Primer: \\(\\alpha=\\tfrac{1}{4}\\), \\(N=3\\)', 'Example: \\(\\alpha=\\tfrac{1}{4}\\), \\(N=3\\)'),
            calculationLatex: 't_i=\\tfrac14,\\tfrac12,\\tfrac34,\\qquad \\varphi_{1/4}(t)=\\frac{\\tfrac34 t}{\\tfrac14(1-t)+\\tfrac34 t}=\\frac{3t}{1+2t}',
            resultLatex: '\\varphi_{1/4}\\left(\\tfrac14,\\tfrac12,\\tfrac34\\right)=\\left(\\tfrac12,\\tfrac34,\\tfrac9{10}\\right)',
            check: text(
                'Vzorčne točke so pri \\(t=\\tfrac{1}{2}\\), \\(\\tfrac{3}{4}\\) in \\(\\tfrac{9}{10}\\): zgostijo se proti \\(P_3\\).',
                'The sample points are at \\(t=\\tfrac{1}{2}\\), \\(\\tfrac{3}{4}\\) and \\(\\tfrac{9}{10}\\): they crowd toward \\(P_3\\).',
            ),
        },
        {
            id: 'wp-three-quarters',
            title: text('Primer: \\(\\alpha=\\tfrac{3}{4}\\), \\(N=3\\)', 'Example: \\(\\alpha=\\tfrac{3}{4}\\), \\(N=3\\)'),
            calculationLatex: '\\varphi_{3/4}(t)=1-\\varphi_{1/4}(1-t)=1-\\frac{3(1-t)}{3-2t}=\\frac{t}{3-2t}',
            resultLatex: '\\varphi_{3/4}\\left(\\tfrac14,\\tfrac12,\\tfrac34\\right)=\\left(\\tfrac1{10},\\tfrac14,\\tfrac12\\right)',
            check: text(
                'Vzorčne točke so pri \\(t=\\tfrac{1}{10}\\), \\(\\tfrac{1}{4}\\) in \\(\\tfrac{1}{2}\\): zgostijo se proti \\(P_0\\), kot napove simetrija.',
                'The sample points are at \\(t=\\tfrac{1}{10}\\), \\(\\tfrac{1}{4}\\) and \\(\\tfrac{1}{2}\\): they crowd toward \\(P_0\\), as the symmetry predicts.',
            ),
        },
    ],
    steps: [
        {
            id: 'wp-same-curve', order: 1,
            title: text('Ista krivulja, izbrane točke', 'One curve, picked points'),
            purpose: text('Ločiti krivuljo od načina, kako na njej izbiramo točke.', 'Separating the curve from the way points are picked on it.'),
            explanation: text(
                'Na krivulji je \\(N\\) notranjih vzorčnih točk, ki jih določa Število točk; krajišči \\(P_0\\) in \\(P_3\\) nista označeni. Začnemo s \\(N=3\\) in \\(\\alpha=\\tfrac{1}{2}\\): tedaj je \\(\\varphi_\\alpha(t)=t\\), točke ležijo pri \\(t_i=\\tfrac{i}{N+1}=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\) in so po parametru enakomerno razporejene. V naslednjih korakih ostanejo kontrolne točke enake, spreminja se le \\(\\alpha\\).',
                'The curve carries \\(N\\) interior sample points set by Number of points; the end points \\(P_0\\) and \\(P_3\\) are not marked. We start with \\(N=3\\) and \\(\\alpha=\\tfrac{1}{2}\\): then \\(\\varphi_\\alpha(t)=t\\), the points lie at \\(t_i=\\tfrac{i}{N+1}=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\), and they are equally spaced in the parameter. In the next steps the control points stay the same and only \\(\\alpha\\) changes.',
            ),
            formulaIds: ['wp-sample-parameters', 'wp-phi'],
            frames: [frame('wp-same-curve-explanation', 'explanation'), frame('wp-same-curve-observation', 'observation')],
            observationPrompt: text('Preštej vzorčne točke in si zapomni obliko krivulje, lego kontrolnih točk in položaj treh točk.', 'Count the sample points and remember the curve shape, the position of the control points and the position of the three points.'),
            expectedObservations: [text('Na krivulji so 3 notranje vzorčne točke pri \\(t=\\tfrac{1}{4}\\), \\(\\tfrac{1}{2}\\) in \\(\\tfrac{3}{4}\\); srednja je na sredini krivulje po parametru.', 'There are 3 interior sample points on the curve at \\(t=\\tfrac{1}{4}\\), \\(\\tfrac{1}{2}\\) and \\(\\tfrac{3}{4}\\); the middle one is at the parametric midpoint of the curve.')],
            scene: {
                id: 'wp-identity-three', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-alpha', value: 0.5}, {kind: 'parameterization-samples', count: 3}],
                expectedState: text('\\(\\alpha=\\tfrac{1}{2}\\) in 3 vzorčne točke.', '\\(\\alpha=\\tfrac{1}{2}\\) and 3 sample points.'),
            },
        },
        {
            id: 'wp-quarter-calculation', order: 2,
            title: text('Izračun za \\(\\alpha=\\tfrac{1}{4}\\)', 'Calculation for \\(\\alpha=\\tfrac{1}{4}\\)'),
            purpose: text('Izračunati nove parametre in napovedati, kam se točke premaknejo.', 'Computing the new parameters and predicting where the points move.'),
            explanation: text(
                'Pri \\(\\alpha=\\tfrac{1}{4}\\) je \\(\\varphi_\\alpha(t)=\\tfrac{3t}{1+2t}\\). Za \\(t=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\) dobimo \\(\\tfrac{1}{2}\\), \\(\\tfrac{3}{4}\\) in \\(\\tfrac{9}{10}\\), torej se točke pomaknejo proti \\(P_3\\). Krivulja in kontrolne točke se ne spremenijo.',
                'For \\(\\alpha=\\tfrac{1}{4}\\) we have \\(\\varphi_\\alpha(t)=\\tfrac{3t}{1+2t}\\). For \\(t=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\) this gives \\(\\tfrac{1}{2}\\), \\(\\tfrac{3}{4}\\) and \\(\\tfrac{9}{10}\\), so the points move toward \\(P_3\\). The curve and the control points do not change.',
            ),
            formulaIds: ['wp-phi'],
            frames: [frame('wp-quarter-calculation-explanation', 'explanation'), frame('wp-quarter-calculation-calculation', 'calculation'), frame('wp-quarter-calculation-observation', 'observation')],
            workedExampleId: 'wp-quarter',
            observationPrompt: text('Primerjaj lege treh točk z lego pri \\(\\alpha=\\tfrac{1}{2}\\) in z izračunanimi parametri ter preveri, da kontrolne točke ostanejo na mestu.', 'Compare the positions of the three points with those at \\(\\alpha=\\tfrac{1}{2}\\) and with the computed parameters, and check that the control points stay in place.'),
            expectedObservations: [text('Vse tri točke so na drugi polovici krivulje (\\(t\\ge\\tfrac{1}{2}\\)), zadnja je tik ob \\(P_3\\); krivulja je enaka.', 'All three points are on the second half of the curve (\\(t\\ge\\tfrac{1}{2}\\)), the last one close to \\(P_3\\); the curve is unchanged.')],
            scene: {
                id: 'wp-quarter-three', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-alpha', value: 0.25}, {kind: 'parameterization-samples', count: 3}],
                expectedState: text('\\(\\alpha=\\tfrac{1}{4}\\) in 3 vzorčne točke.', '\\(\\alpha=\\tfrac{1}{4}\\) and 3 sample points.'),
            },
        },
        {
            id: 'wp-symmetry-step', order: 3,
            title: text('Simetrija \\(\\alpha\\) in \\(1-\\alpha\\)', 'Symmetry of \\(\\alpha\\) and \\(1-\\alpha\\)'),
            purpose: text('Pokazati, da \\(1-\\alpha\\) točke zrcali glede na parameter.', 'Showing that \\(1-\\alpha\\) mirrors the points with respect to the parameter.'),
            explanation: text(
                'Iz \\(\\varphi_{1-\\alpha}(t)=1-\\varphi_\\alpha(1-t)\\) sledi, da so pri \\(\\alpha=\\tfrac{3}{4}\\) in \\(N=3\\) parametri \\(\\tfrac{1}{10}\\), \\(\\tfrac{1}{4}\\) in \\(\\tfrac{1}{2}\\). Točke se zgostijo proti \\(P_0\\).',
                'From \\(\\varphi_{1-\\alpha}(t)=1-\\varphi_\\alpha(1-t)\\) it follows that for \\(\\alpha=\\tfrac{3}{4}\\) and \\(N=3\\) the parameters are \\(\\tfrac{1}{10}\\), \\(\\tfrac{1}{4}\\) and \\(\\tfrac{1}{2}\\). The points crowd toward \\(P_0\\).',
            ),
            formulaIds: ['wp-symmetry'],
            frames: [frame('wp-symmetry-explanation', 'explanation'), frame('wp-symmetry-calculation', 'calculation'), frame('wp-symmetry-observation', 'observation')],
            workedExampleId: 'wp-three-quarters',
            observationPrompt: text('Primerjaj lege točk z lego pri \\(\\alpha=\\tfrac{1}{4}\\): proti kateremu koncu so zdaj zgoščene?', 'Compare the point positions with those at \\(\\alpha=\\tfrac{1}{4}\\): toward which end are they crowded now?'),
            expectedObservations: [text('Točke so zgoščene ob \\(P_0\\), zrcalno glede na parametrično polovico; krivulja je ista.', 'The points are crowded near \\(P_0\\), mirrored about the parametric midpoint; the curve is the same.')],
            scene: {
                id: 'wp-three-quarters-three', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-alpha', value: 0.75}, {kind: 'parameterization-samples', count: 3}],
                expectedState: text('\\(\\alpha=\\tfrac{3}{4}\\) in 3 vzorčne točke.', '\\(\\alpha=\\tfrac{3}{4}\\) and 3 sample points.'),
            },
        },
        {
            id: 'wp-density-ten', order: 4,
            title: text('Več točk pri istem \\(\\alpha\\)', 'More points at the same \\(\\alpha\\)'),
            purpose: text('Povečati število točk in videti, kako se razporeditev oblikuje.', 'Increasing the number of points to see the distribution take shape.'),
            explanation: text(
                'Pri \\(\\alpha=\\tfrac{1}{4}\\) povečamo Število točk s 3 na 10. Točke so zdaj pri \\(\\varphi_{1/4}\\bigl(\\tfrac{i}{11}\\bigr)\\) za \\(i=1,\\dots,10\\): razmiki med njimi se manjšajo proti \\(P_3\\), kontrolne točke in krivulja pa ostanejo enake kot v prejšnjih korakih.',
                'At \\(\\alpha=\\tfrac{1}{4}\\) we raise Number of points from 3 to 10. The points are now at \\(\\varphi_{1/4}\\bigl(\\tfrac{i}{11}\\bigr)\\) for \\(i=1,\\dots,10\\): the gaps between them shrink toward \\(P_3\\), while the control points and the curve stay the same as in the previous steps.',
            ),
            formulaIds: ['wp-sample-parameters', 'wp-phi'],
            frames: [frame('wp-density-ten-explanation', 'explanation'), frame('wp-density-ten-observation', 'observation')],
            observationPrompt: text('Preštej točke in primerjaj razmike ob \\(P_0\\) in ob \\(P_3\\); nato poskusi še Število točk.', 'Count the points and compare the gaps near \\(P_0\\) and near \\(P_3\\); then try Number of points yourself.'),
            expectedObservations: [text('Na krivulji je 10 notranjih točk; razmiki ob \\(P_0\\) so veliki, ob \\(P_3\\) pa majhni, krajišči nista označeni.', 'There are 10 interior points on the curve; the gaps near \\(P_0\\) are large and near \\(P_3\\) small, and the end points are not marked.')],
            scene: {
                id: 'wp-quarter-ten', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-alpha', value: 0.25}, {kind: 'parameterization-samples', count: 10}],
                expectedState: text('\\(\\alpha=\\tfrac{1}{4}\\) in 10 vzorčnih točk.', '\\(\\alpha=\\tfrac{1}{4}\\) and 10 sample points.'),
            },
        },
        {
            id: 'wp-density', order: 5,
            title: text('Gostota točk in robni primeri', 'Point density and edge cases'),
            purpose: text('Gostoto točk povezati s hitrostjo premikanja po krivulji.', 'Linking the density of points to the speed of traversal.'),
            explanation: text(
                'Z 20 točkami in \\(\\alpha=\\tfrac{1}{4}\\) se točke gosto zbirajo ob \\(P_3\\), ob \\(P_0\\) pa so redke: parametrizacija ne spremeni krivulje, spremeni hitrost premikanja. Pri \\(\\alpha=0\\) ali \\(\\alpha=1\\) vse notranje točke padejo v končno točko, zato izbiraj notranje vrednosti.',
                'With 20 points and \\(\\alpha=\\tfrac{1}{4}\\) the points gather densely near \\(P_3\\) and are sparse near \\(P_0\\): the parameterization does not change the curve, it changes the speed of traversal. At \\(\\alpha=0\\) or \\(\\alpha=1\\) every interior point falls onto an endpoint, so choose interior values.',
            ),
            formulaIds: ['wp-phi', 'wp-symmetry'],
            frames: [frame('wp-density-explanation', 'explanation'), frame('wp-density-observation', 'observation')],
            observationPrompt: text('Premikaj drsnik \\(\\alpha\\) med 0 in 1 ter opazuj gostoto točk ob \\(P_0\\) in \\(P_3\\).', 'Move the \\(\\alpha\\) slider between 0 and 1 and watch the density of points near \\(P_0\\) and \\(P_3\\).'),
            expectedObservations: [text('Manjši \\(\\alpha\\) zgosti točke ob \\(P_3\\), večji ob \\(P_0\\); krivulja in kontrolne točke ostanejo nespremenjene.', 'A smaller \\(\\alpha\\) crowds the points near \\(P_3\\), a larger one near \\(P_0\\); the curve and the control points stay unchanged.')],
            scene: {
                id: 'wp-quarter-twenty', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-alpha', value: 0.25}, {kind: 'parameterization-samples', count: 20}],
                expectedState: text('\\(\\alpha=\\tfrac{1}{4}\\) in 20 vzorčnih točk.', '\\(\\alpha=\\tfrac{1}{4}\\) and 20 sample points.'),
            },
        },
    ],
    sources: [
        {
            id: 'farin-parametrization',
            citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
            implementationCorrespondence: 'AlphaParamBezierCurveGraph evaluates the fixed curve at phi_alpha(i/(N+1)) for i=1..N.',
        },
        {
            id: 'prautzsch-boehm-reparameterization',
            citation: 'Prautzsch, H., Boehm, W., Paluszny, M. Bézier and B-Spline Techniques, Springer, 2002.',
        },
        {
            id: 'bezeg-weighted-parameterization-implementation',
            citation: 'Bezeg source: src/graphs/curves/parametrisations/AlphaParamBezierCurveGraph.tsx.',
        },
    ],
    edgeCases: [
        text('Pri \\(\\alpha=0\\) ali \\(\\alpha=1\\) vse notranje vzorčne točke padejo v eno končno točko krivulje, zato lekcija uporablja notranje vrednosti.', 'At \\(\\alpha=0\\) or \\(\\alpha=1\\) every interior sample point collapses onto one endpoint of the curve, so the lesson uses interior values.'),
        text('Drsnik \\(\\alpha\\) in Število točk ne spremenita krivulje ali kontrolnih točk, spremenita le vzorčne točke.', 'The \\(\\alpha\\) slider and Number of points never change the curve or the control points, only the sample points.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenski izraz »vzorčne točke« in presoditi, ali naj ima lekcija izrecen primer z \\(\\alpha=0\\).', 'Before classroom-ready review, confirm the Slovenian term "vzorčne točke" (sample points) and decide whether the lesson needs an explicit case with \\(\\alpha=0\\).'),
    ],
};

const uniformParameterization: GuidedLesson = {
    demonstrationId: 'uniform-parameterization',
    title: text('Enakomerna parametrizacija PH krivulje', 'Uniform parameterization of a PH curve'),
    summary: text(
        'Pri PH krivulji je hitrost \\(\\sigma(t)\\) polinom, zato je tudi dolžina loka \\(s(t)\\) polinom. To omogoča izbiro točk, ki so po loku približno enakomerno razporejene, namesto enakomerno po parametru \\(t\\).',
        'For a PH curve the speed \\(\\sigma(t)\\) is a polynomial, so the arc length \\(s(t)\\) is a polynomial too. This allows choosing points that are approximately equally spaced along the arc instead of equally spaced in the parameter \\(t\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje PH krivulj in hodografa ter pojma dolžine loka.', 'Assumes familiarity with PH curves, the hodograph and the notion of arc length.'),
        text('Priporočeno je, da poznaš uteženo parametrizacijo z \\(\\alpha\\).', 'It helps to know the weighted parameterization with \\(\\alpha\\).'),
    ],
    learningGoals: [
        text('Pojasniš, zakaj je pri PH krivulji dolžina loka polinom v \\(t\\).', 'Explain why the arc length of a PH curve is a polynomial in \\(t\\).'),
        text('Zapišeš pogoj \\(s(t_k)=\\tfrac{k}{N+1}L\\) in ga uporabiš na primeru treh točk.', 'Write the condition \\(s(t_k)=\\tfrac{k}{N+1}L\\) and apply it to an example with three points.'),
        text('Primerjaš enakomerno in uteženo parametrizacijo ter povežeš zgoščanje točk s hitrostjo \\(\\sigma\\).', 'Compare the uniform and the weighted parameterization and connect the crowding of points with the speed \\(\\sigma\\).'),
    ],
    formulaBlocks: [
        {
            id: 'up-speed',
            latex: '\\sigma(t)=\\lVert r\'(t)\\rVert,\\qquad s(t)=\\int_0^t\\sigma(u)\\,du,\\qquad L=s(1)',
            notation: text(
                'Hitrost \\(\\sigma\\) je dolžina odvoda krivulje \\(r\\); \\(s(t)\\) je dolžina loka od začetka do parametra \\(t\\), \\(L\\) pa celotna dolžina.',
                'The speed \\(\\sigma\\) is the length of the derivative of the curve \\(r\\); \\(s(t)\\) is the arc length from the start to the parameter \\(t\\), and \\(L\\) is the total length.',
            ),
            explanation: text(
                'Pri PH krivulji je \\(r\'(t)=w(t)^2\\) za kompleksen polinom \\(w\\) (kvadrat v kompleksnem smislu), zato je \\(\\sigma(t)=\\lVert w(t)\\rVert^2\\) polinom in njegov integral \\(s(t)\\) prav tako.',
                'For a PH curve we have \\(r\'(t)=w(t)^2\\) for a complex polynomial \\(w\\) (squared as a complex number), so \\(\\sigma(t)=\\lVert w(t)\\rVert^2\\) is a polynomial and so is its integral \\(s(t)\\).',
            ),
        },
        {
            id: 'up-equal-arc',
            latex: 's(t_k)=\\frac{k}{N+1}\\,L,\\qquad k=1,\\dots,N',
            notation: text(
                'Parametri \\(t_k\\) so rešitve teh enačb, tako da je lok med sosednjima točkama dolg približno \\(\\tfrac{L}{N+1}\\).',
                'The parameters \\(t_k\\) solve these equations, so the arc between neighboring points has length approximately \\(\\tfrac{L}{N+1}\\).',
            ),
            explanation: text(
                'Enačbe rešimo numerično z Newtonovimi popravki (en napovedni korak in štirje popravki, brez kriterija ustavitve), zato so loki le približno enaki, ne popolnoma enaki. Na privzeti krivulji je napaka dolžine loka pri vseh številih točk pod \\(10^{-6}L\\).',
                'The equations are solved numerically with Newton corrections (one predictor step and four corrections, with no stopping criterion), so the arcs are approximately equal, not exactly equal. On the default curve the arc-length error is below \\(10^{-6}L\\) for every number of points.',
            ),
        },
        {
            id: 'up-weighted-contrast',
            latex: 't_i=\\frac{i}{N+1}\\quad(\\alpha=\\tfrac12),\\qquad \\varphi_\\alpha(t)=\\frac{(1-\\alpha)\\,t}{\\alpha\\,(1-t)+(1-\\alpha)\\,t}',
            notation: text(
                'Utežena parametrizacija izbere točke po parametru \\(t\\), ne po loku.',
                'The weighted parameterization picks points by the parameter \\(t\\), not by arc.',
            ),
            explanation: text(
                'Kjer je hitrost \\(\\sigma\\) majhna, enak korak v \\(t\\) pusti točke tesno skupaj; kjer je velika, jih razmakne.',
                'Where the speed \\(\\sigma\\) is small an equal step in \\(t\\) leaves the points close together; where it is large it spreads them apart.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'up-three-points',
            title: text('Dolžina \\(L\\) in tri točke', 'The length \\(L\\) and three points'),
            calculationLatex: 'L=s(1)=\\tfrac{1003}{60}\\approx 16.72,\\qquad s(t_k)=\\tfrac{k}{4}L\\ \\ (N=3),\\qquad \\tfrac{L}{4}\\approx 4.18',
            resultLatex: 't_1\\approx 0.149,\\quad t_2=\\tfrac12,\\quad t_3\\approx 0.851',
            check: text(
                'Privzeta krivulja je simetrična, zato je \\(t_2=\\tfrac{1}{2}\\) in \\(t_3=1-t_1\\). Vzorčne točke niso pri \\(\\tfrac{1}{4}\\) in \\(\\tfrac{3}{4}\\), ker je hitrost ob koncih večja kot na sredini.',
                'The default curve is symmetric, so \\(t_2=\\tfrac{1}{2}\\) and \\(t_3=1-t_1\\). The sample points are not at \\(\\tfrac{1}{4}\\) and \\(\\tfrac{3}{4}\\) because the speed is larger near the ends than in the middle.',
            ),
        },
    ],
    steps: [
        {
            id: 'up-uneven-samples', order: 1,
            title: text('Enaki koraki \\(t\\), neenaki loki', 'Equal steps in \\(t\\), unequal arcs'),
            purpose: text('Opaziti, da enakomerna razporeditev po parametru ni enakomerna po krivulji.', 'Noticing that equal spacing in the parameter is not equal spacing along the curve.'),
            explanation: text(
                'Izbrana je utežena parametrizacija z \\(\\alpha=\\tfrac{1}{2}\\) in \\(N=3\\) notranjimi točkami, zato so te pri \\(t_i=\\tfrac{i}{N+1}=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\). Dolžina loka krivulje je \\(L\\approx 16{,}72\\), enakomerna razporeditev po loku pa bi imela štiri loke po \\(\\tfrac{L}{4}\\approx 4{,}18\\). Tu so loki med zaporednimi točkami (vštevši odseka do krajišč) približno \\(5{,}92\\), \\(2{,}43\\), \\(2{,}43\\) in \\(5{,}92\\).',
                'The weighted parameterization with \\(\\alpha=\\tfrac{1}{2}\\) and \\(N=3\\) interior points is selected, so the points sit at \\(t_i=\\tfrac{i}{N+1}=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\). The arc length of the curve is \\(L\\approx 16.72\\), and an even spread along the arc would give four arcs of \\(\\tfrac{L}{4}\\approx 4.18\\). Here the arcs between consecutive points (counting the pieces out to the end points) are about \\(5.92\\), \\(2.43\\), \\(2.43\\) and \\(5.92\\).',
            ),
            formulaIds: ['up-weighted-contrast'],
            frames: [frame('up-uneven-samples-explanation', 'explanation'), frame('up-uneven-samples-observation', 'observation')],
            observationPrompt: text('Primerjaj razmik med točkami ob koncih krivulje in na njeni sredini.', 'Compare the gap between points near the ends of the curve with the gap in its middle.'),
            expectedObservations: [text('Srednji točki sta si bližje kot ostali sosedi: srednja loka sta približno \\(2{,}43\\), zunanja pa približno \\(5{,}92\\), kar je več kot dvakrat toliko.', 'The two middle points are closer together than the other neighbors: the middle arcs are about \\(2.43\\) and the outer ones about \\(5.92\\), more than twice as long.')],
            scene: {
                id: 'up-default', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-mode', mode: 'weighted'}, {kind: 'parameterization-alpha', value: 0.5}, {kind: 'parameterization-samples', count: 3}],
                expectedState: text('Utežena parametrizacija z \\(\\alpha=\\tfrac{1}{2}\\) in 3 točkami.', 'Weighted parameterization with \\(\\alpha=\\tfrac{1}{2}\\) and 3 points.'),
            },
        },
        {
            id: 'up-arc-length', order: 2,
            title: text('Hitrost in dolžina loka', 'Speed and arc length'),
            purpose: text('Pojasniti, zakaj je dolžina loka PH krivulje polinom.', 'Explaining why the arc length of a PH curve is a polynomial.'),
            explanation: text(
                'Hitrost \\(\\sigma(t)=\\lVert r\'(t)\\rVert\\) je pri PH krivulji polinom. Na privzeti krivulji je \\(\\sigma(0)=\\sigma(1)=36{,}25\\) in \\(\\sigma(\\tfrac{1}{2})\\approx 7{,}56\\): ob koncih je krivulja hitra, na sredini počasna. Dolžina loka je \\(s(t)=\\int_0^t\\sigma\\), polinom, in \\(L=s(1)\\approx 16{,}72\\).',
                'The speed \\(\\sigma(t)=\\lVert r\'(t)\\rVert\\) of a PH curve is a polynomial. On the default curve \\(\\sigma(0)=\\sigma(1)=36.25\\) and \\(\\sigma(\\tfrac{1}{2})\\approx 7.56\\): the curve is fast at the ends and slow in the middle. The arc length is \\(s(t)=\\int_0^t\\sigma\\), a polynomial, and \\(L=s(1)\\approx 16.72\\).',
            ),
            formulaIds: ['up-speed'],
            frames: [frame('up-arc-length-explanation', 'explanation'), frame('up-arc-length-observation', 'observation')],
            observationPrompt: text('Poveži gostoto točk z lokalno hitrostjo: kje je krivulja počasna in kje hitra?', 'Connect the density of points with the local speed: where is the curve slow and where fast?'),
            expectedObservations: [text('Kjer je hitrost majhna (sredina), enak korak v \\(t\\) pomeni kratek lok in točke so goste.', 'Where the speed is small (the middle), an equal step in \\(t\\) is a short arc and the points are dense.')],
            scene: {
                id: 'up-weighted-ten', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-mode', mode: 'weighted'}, {kind: 'parameterization-alpha', value: 0.5}, {kind: 'parameterization-samples', count: 3}],
                expectedState: text('Utežena parametrizacija z \\(\\alpha=\\tfrac{1}{2}\\) in 3 točkami.', 'Weighted parameterization with \\(\\alpha=\\tfrac{1}{2}\\) and 3 points.'),
            },
        },
        {
            id: 'up-three-points-step', order: 3,
            title: text('Tri točke po loku', 'Three points along the arc'),
            purpose: text('Rešiti enačbe \\(s(t_k)=\\tfrac{k}{N+1}L\\) na primeru.', 'Solving the equations \\(s(t_k)=\\tfrac{k}{N+1}L\\) on an example.'),
            explanation: text(
                'Pri \\(N=3\\) iščemo parametre, pri katerih je \\(s(t_k)=\\tfrac{k}{4}L\\). Rezultat je \\(t_1\\approx 0{,}149\\), \\(t_2=\\tfrac{1}{2}\\), \\(t_3\\approx 0{,}851\\). V načinu Enakomerna parametrizacija je lok med sosednjima točkama (in do krajišč) približno enak \\(\\tfrac{L}{4}\\approx 4{,}18\\), z napako pod \\(10^{-6}L\\). Premice med točkami (tetive) pa niso vse enako dolge: \\(4{,}18\\), \\(3{,}91\\), \\(3{,}91\\), \\(4{,}18\\), saj je tetiva krajša od loka, kjer se krivulja ukrivlja.',
                'For \\(N=3\\) we look for parameters where \\(s(t_k)=\\tfrac{k}{4}L\\). The result is \\(t_1\\approx 0.149\\), \\(t_2=\\tfrac{1}{2}\\), \\(t_3\\approx 0.851\\). In Uniform parametrization mode the arc between neighboring points (and out to the end points) is approximately \\(\\tfrac{L}{4}\\approx 4.18\\), with an error below \\(10^{-6}L\\). The straight segments between the points (chords) are not all equally long, though: \\(4.18\\), \\(3.91\\), \\(3.91\\), \\(4.18\\), because a chord is shorter than its arc where the curve bends.',
            ),
            formulaIds: ['up-equal-arc'],
            frames: [frame('up-three-points-explanation', 'explanation'), frame('up-three-points-calculation', 'calculation'), frame('up-three-points-observation', 'observation')],
            workedExampleId: 'up-three-points',
            observationPrompt: text('Primerjaj položaje treh točk z lego pri \\(t=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\).', 'Compare the positions of the three points with those at \\(t=\\tfrac{1}{4},\\tfrac{1}{2},\\tfrac{3}{4}\\).'),
            expectedObservations: [text('Prva in zadnja točka sta bližje koncema krivulje kot pri \\(t=\\tfrac{1}{4}\\) in \\(\\tfrac{3}{4}\\), srednja ostane na isti legi; razmiki med točkami so zdaj videti enaki, tetivi na sredini pa sta za približno 6 % krajši od zunanjih.', 'The first and last points are nearer the ends of the curve than at \\(t=\\tfrac{1}{4}\\) and \\(\\tfrac{3}{4}\\), while the middle one stays put; the gaps now look even, but the two middle chords are about 6% shorter than the outer ones.')],
            scene: {
                id: 'up-uniform-three', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-mode', mode: 'uniform'}, {kind: 'parameterization-samples', count: 3}],
                expectedState: text('Enakomerna parametrizacija s 3 točkami.', 'Uniform parametrization with 3 points.'),
            },
        },
        {
            id: 'up-uniform-twenty', order: 4,
            title: text('Enakomerna razporeditev po krivulji', 'Even spread along the curve'),
            purpose: text('Pogledati celotno razporeditev pri večjem številu točk.', 'Looking at the whole distribution with more points.'),
            explanation: text(
                'Z 10 točkami v enakomerni parametrizaciji je vsak od 11 lokov (vštevši odseka do krajišč) dolg \\(\\tfrac{L}{11}\\approx 1{,}52\\), napaka je zanemarljiva. Tetive, torej premice med sosednjimi točkami, so skoraj enake (\\(1{,}52\\) ob koncih), le srednja je krajša (\\(1{,}44\\)), ker se krivulja tam najbolj ukrivlja. Enak lok torej ni enaka tetiva.',
                'With 10 points in the uniform parameterization each of the 11 arcs (counting the pieces out to the end points) has length \\(\\tfrac{L}{11}\\approx 1.52\\), with negligible error. The chords, the straight segments between neighboring points, are nearly equal (\\(1.52\\) near the ends), but the middle one is shorter (\\(1.44\\)) because the curve bends the most there. Equal arc length is therefore not equal chord length.',
            ),
            formulaIds: ['up-equal-arc'],
            frames: [frame('up-uniform-twenty-explanation', 'explanation'), frame('up-uniform-twenty-observation', 'observation')],
            observationPrompt: text('Poglej razmike med točkami in jih primerjaj z dolžino loka; nato spremeni Število točk.', 'Look at the gaps between the points and compare them with the arc length; then change Number of points.'),
            expectedObservations: [text('Razmiki med točkami so videti enaki po vsej krivulji; tetiva na sredini je za približno 5 % krajša od tetiv ob koncih, čeprav so loki enaki.', 'The gaps between points look even along the whole curve; the chord in the middle is about 5% shorter than the chords near the ends, although the arcs are equal.')],
            scene: {
                id: 'up-uniform-ten-scene', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-mode', mode: 'uniform'}, {kind: 'parameterization-samples', count: 10}],
                expectedState: text('Enakomerna parametrizacija z 10 točkami.', 'Uniform parametrization with 10 points.'),
            },
        },
        {
            id: 'up-weighted-contrast-step', order: 5,
            title: text('Primerjava z utežno parametrizacijo', 'Contrast with the weighted parameterization'),
            purpose: text('Pokazati, da \\(\\alpha\\) premakne točke po parametru, ne po loku.', 'Showing that \\(\\alpha\\) shifts points in the parameter, not along the arc.'),
            explanation: text(
                'Nazaj pri uteženi parametrizaciji z \\(\\alpha=\\tfrac{1}{2}\\) in istih 10 točkah na isti krivulji: točke so pri \\(t_i=\\tfrac{i}{11}\\), loki pa se razlikujejo od približno \\(2{,}81\\) ob koncih do približno \\(0{,}69\\) na sredini, torej so ob koncih okoli 4-krat daljši. Enakomerna parametrizacija ni odvisna od \\(\\alpha\\); utežena pa ponuja drsnik \\(\\alpha\\) za poljubno razporeditev po parametru.',
                'Back in the weighted parameterization with \\(\\alpha=\\tfrac{1}{2}\\) and the same 10 points on the same curve: the points are at \\(t_i=\\tfrac{i}{11}\\), and the arcs range from about \\(2.81\\) near the ends to about \\(0.69\\) in the middle, so the end arcs are about 4 times longer. The uniform parameterization does not depend on \\(\\alpha\\); the weighted one offers the \\(\\alpha\\) slider for an arbitrary distribution in the parameter.',
            ),
            formulaIds: ['up-weighted-contrast'],
            frames: [frame('up-weighted-contrast-explanation', 'explanation'), frame('up-weighted-contrast-observation', 'observation')],
            observationPrompt: text('Preklopi med Utežena parametrizacija in Enakomerna parametrizacija ter primerjaj razmike.', 'Switch between Weighted parametrization and Uniform parametrization and compare the gaps.'),
            expectedObservations: [text('Pri uteženi parametrizaciji z \\(\\alpha=\\tfrac{1}{2}\\) so točke goste na sredini in redke ob koncih, pri enakomerni so razmiki enaki; krivulja in kontrolne točke se ne spremenijo.', 'In the weighted parameterization with \\(\\alpha=\\tfrac{1}{2}\\) the points are dense in the middle and sparse near the ends, while in the uniform one the gaps are even; the curve and the control points do not change.')],
            scene: {
                id: 'up-weighted-contrast-ten', basedOn: 'demonstration-default',
                actions: [{kind: 'parameterization-mode', mode: 'weighted'}, {kind: 'parameterization-alpha', value: 0.5}, {kind: 'parameterization-samples', count: 10}],
                expectedState: text('Utežena parametrizacija z \\(\\alpha=\\tfrac{1}{2}\\) in 10 točkami.', 'Weighted parameterization with \\(\\alpha=\\tfrac{1}{2}\\) and 10 points.'),
            },
        },
    ],
    sources: [
        {
            id: 'farouki-ph-arc-length',
            citation: 'Farouki, R. T. Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable, Springer, 2008.',
            implementationCorrespondence: 'PhBezierCurve.s(t) is the polynomial arc length and tk() inverts it with one predictor step and four Newton corrections.',
        },
        {
            id: 'stampar-thesis-ph-speed',
            citation: 'Štampar, Kevin. Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, magistrsko delo, Univerza v Ljubljani, 2024.',
        },
        {
            id: 'bezeg-uniform-parameterization-implementation',
            citation: 'Bezeg source: src/graphs/curves/parametrisations/UniformParamBezierCurveGraph.tsx.',
        },
    ],
    edgeCases: [
        text('Enakomerna parametrizacija je le približna: parametre dobimo z Newtonovimi popravki, ne iz zaprte formule. Enaki loki niso enake tetive: tetiva je krajša od loka, kjer se krivulja ukrivlja.', 'The uniform parameterization is only approximate: the parameters come from Newton corrections, not from a closed formula. Equal arcs are not equal chords: a chord is shorter than its arc where the curve bends.'),
        text('Drsnik \\(\\alpha\\) je viden le pri uteženi parametrizaciji; enakomerna ga ne uporablja.', 'The \\(\\alpha\\) slider is visible only for the weighted parameterization; the uniform one does not use it.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi vir za dolžino loka PH krivulj in slovenski izraz »enakomerna parametrizacija« za parametrizacijo po dolžini loka.', 'Before classroom-ready review, confirm the source for PH arc length and the Slovenian term "enakomerna parametrizacija" for arc-length parameterization.'),
    ],
};

export const parameterizationGuidedLessons: readonly GuidedLesson[] = [weightedParameterization, uniformParameterization];
