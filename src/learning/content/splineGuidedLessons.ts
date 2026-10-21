import type {ContentSource, GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText} from './guidedLessons';

/**
 * Cohort E, spline routes: spline-cn, spline-c1, spline-c2, spline-g1, spline-g1-symmetric, spline-parameterization.
 *
 * Subject source: K. Štampar, Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, master's thesis, University of
 * Ljubljana (FMF/FRI), 2024, section 4 (thesis pages 20-28).
 *
 * Scene actions used here are all in SUPPORTED_SCENE_ACTION_NAMES and translated by sceneAction() in lessonCatalog.ts:
 * show-spline-labels (boolean), hide-spline-fixed-points (boolean), show-control-polygon (boolean),
 * set-spline-continuity (integer), set-spline-degree (integer), set-spline-beta ({index, value} object),
 * set-parameterization-alpha (number), set-parameterization-samples (integer). Their ranges are enforced by the
 * spline graphs and checked against this content by sceneContentAgainstGraphs.test.tsx.
 */

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

const thesisSource = (id: string, where: string, supports: readonly string[], implementationCorrespondence?: string): ContentSource => ({
    id,
    citation: `Štampar, K. Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj, magistrsko delo, Univerza v Ljubljani (FMF/FRI), 2024, ${where}.`,
    supports,
    ...(implementationCorrespondence ? {implementationCorrespondence} : {}),
});

const farinSource = (id: string, supports: readonly string[]): ContentSource => ({
    id,
    citation: 'Farin, G. Curves and Surfaces for CAGD: A Practical Guide, 5th ed., Morgan Kaufmann, 2002.',
    supports,
});

// ---------------------------------------------------------------------------------------------
// spline-cn
// ---------------------------------------------------------------------------------------------

const splineCn: GuidedLesson = {
    demonstrationId: 'spline-cn',
    title: text('Enostranski Cⁿ zlepek', 'One-sided Cⁿ spline'),
    summary: text(
        'Zlepek sestavimo iz Bézierjevih odsekov, ki se stikajo v stičnih točkah. Pri enostranski konstrukciji prvi odsek izberemo prosto, vsak naslednji pa prvih \\(r+1\\) kontrolnih točk dobi z ekstrapolacijo prejšnjega. Zlepek je tako \\(C^r\\)-zvezen, sprememba ene točke pa se prenese na vse kasnejše odseke.',
        'A spline is built from Bézier pieces that meet at joints. In the one-sided construction the first piece is chosen freely and every later piece takes its first \\(r+1\\) control points from the extrapolation of the previous one. The spline is then \\(C^r\\)-continuous, but a change of one point propagates to all later pieces.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje Bézierjeve krivulje in de Casteljauovega algoritma.', 'Assumes familiarity with a Bézier curve and the de Casteljau algorithm.'),
        text('Priporočeno je poznavanje ekstrapolacije Bézierjeve krivulje.', 'Familiarity with extrapolation of a Bézier curve is recommended.'),
    ],
    learningGoals: [
        text('Razložiš, kdaj sta dva odseka na stični točki \\(C^r\\)-zvezna, in to zapišeš z diferencami kontrolnih točk.', 'Explain when two pieces are \\(C^r\\)-continuous at a joint and write it with differences of control points.'),
        text('Izpeljano točko izračunaš z ekstrapolacijo prejšnjega odseka in preveriš, da se diference na stiku ujemajo.', 'Compute a derived point by extrapolating the previous piece and check that the differences agree at the joint.'),
        text('Pojasniš, zakaj enostranska konstrukcija ni lokalna in zakaj višja zveznost ponese izpeljane točke daleč stran.', 'Explain why the one-sided construction is not local and why higher continuity sends the derived points far away.'),
    ],
    formulaBlocks: [
        {
            id: 'cn-continuity',
            latex: '\\frac{1}{(\\Delta u_0)^k}\\,\\Delta^k p^{(1)}_{n-k}=\\frac{1}{(\\Delta u_1)^k}\\,\\Delta^k p^{(2)}_0,\\qquad k=0,\\dots,r',
            notation: text(
                'Zgornja indeksa \\((1)\\) in \\((2)\\) označujeta levi in desni odsek, \\(\\Delta u_0\\) in \\(\\Delta u_1\\) sta dolžini njunih parametrskih intervalov, \\(\\Delta^k\\) pa je \\(k\\)-ta diferenca kontrolnih točk.',
                'The superscripts \\((1)\\) and \\((2)\\) mark the left and right piece, \\(\\Delta u_0\\) and \\(\\Delta u_1\\) are the lengths of their parameter intervals, and \\(\\Delta^k\\) is the \\(k\\)-th difference of control points.',
            ),
            explanation: text(
                'Pri \\(k=0\\) se odseka stikata v isti točki. Če sta intervala enako dolga, se pogoj skrči na enake diference \\(\\Delta^k\\) na obeh straneh stika.',
                'For \\(k=0\\) the pieces meet in the same point. If the two intervals have equal length, the condition reduces to equal differences \\(\\Delta^k\\) on both sides of the joint.',
            ),
        },
        {
            id: 'cn-extrapolation',
            latex: 't_0=\\frac{\\Delta u_j+\\Delta u_{j+1}}{\\Delta u_j},\\qquad q_0=p_n,\\qquad q_1=2p_n-p_{n-1}\\ \\ (r=1,\\ t_0=2)',
            notation: text(
                'Odsek \\(j\\) ekstrapoliramo do parametra \\(t_0\\). Točke \\(p_i\\) so kontrolne točke tega odseka, točke \\(q_i\\) pa prve kontrolne točke naslednjega.',
                'Piece \\(j\\) is extrapolated to the parameter \\(t_0\\). The points \\(p_i\\) are the control points of that piece and the points \\(q_i\\) are the first control points of the next one.',
            ),
            explanation: text(
                'Prvih \\(r+1\\) točk naslednjega odseka vzamemo iz de Casteljauove sheme ekstrapoliranega odseka, preostale izberemo prosto. Pri enakomernih razmikih je \\(t_0=2\\), za \\(r=1\\) pa to pomeni \\(q_1-q_0=p_n-p_{n-1}\\).',
                'The first \\(r+1\\) points of the next piece come from the de Casteljau scheme of the extrapolated piece and the rest are free. With uniform spacing \\(t_0=2\\), and for \\(r=1\\) this means \\(q_1-q_0=p_n-p_{n-1}\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'cn-first-junction',
            title: text('Primer: \\(n=2\\), \\(r=1\\), prvi stik', 'Example: \\(n=2\\), \\(r=1\\), the first joint'),
            calculationLatex: 'p_1=\\bigl(-4,\\tfrac12\\bigr),\\ p_2=\\bigl(-\\tfrac72,-1\\bigr),\\qquad q_1=2p_2-p_1=\\bigl(-7+4,\\,-2-\\tfrac12\\bigr)',
            resultLatex: 'q_1=\\bigl(-3,-\\tfrac52\\bigr),\\qquad q_1-p_2=p_2-p_1=\\bigl(\\tfrac12,-\\tfrac32\\bigr)',
            check: text(
                'Izpeljana točka je \\(q_1=(-3;\\ -2{,}5)\\), stična točka \\(p_2\\) je na sredini daljice \\(p_1q_1\\), zato se prve diference na obeh straneh stika ujemajo.',
                'The derived point is \\(q_1=(-3,\\ -2.5)\\), the joint \\(p_2\\) is the midpoint of the segment \\(p_1q_1\\), so the first differences on both sides of the joint agree.',
            ),
        },
        {
            id: 'cn-second-order',
            title: text('Primer: \\(n=3\\), \\(r=2\\), druga diferenca', 'Example: \\(n=3\\), \\(r=2\\), the second difference'),
            calculationLatex: '\\Delta^2p_1=p_3-2p_2+p_1=\\bigl(-\\tfrac32+7-4,\\,-2+2+\\tfrac12\\bigr),\\qquad \\Delta^2q_0=q_2-2q_1+q_0=\\bigl(4-1-\\tfrac32,\\,-\\tfrac72+6-2\\bigr)',
            resultLatex: '\\Delta^2p_1=\\Delta^2q_0=\\bigl(\\tfrac32,\\tfrac12\\bigr)',
            check: text(
                'Pri prvem stiku sta enaki prva diferenca \\((2;\\ -1)\\) in druga diferenca \\((1{,}5;\\ 0{,}5)\\), zato sta odseka \\(C^2\\)-zvezna.',
                'At the first joint the first difference \\((2,\\ -1)\\) and the second difference \\((1.5,\\ 0.5)\\) are equal, so the pieces are \\(C^2\\)-continuous.',
            ),
        },
    ],
    steps: [
        {
            id: 'cn-pieces', order: 1,
            title: text('Zlepek iz odsekov', 'A spline made of pieces'),
            purpose: text('Spoznati odseke, stične točke in izpeljane točke privzetega zlepka.', 'Meeting the pieces, joints and derived points of the default spline.'),
            explanation: text(
                'Zlepek je polinomska krivulja, sestavljena iz Bézierjevih odsekov, ki se stikajo v stičnih točkah (Definicija 4.1). Privzeti zlepek ima \\(7\\) točk, stopnjo \\(n=2\\) in zveznost \\(r=1\\), torej \\(5\\) kvadratnih odsekov. Prvi odsek določajo prve tri točke, vsak naslednji pa začne v zadnji točki prejšnjega in ima eno izpeljano ter eno novo prosto točko.',
                'A spline is a polynomial curve made of Bézier pieces that meet at joints (Definition 4.1). The default spline has \\(7\\) points, degree \\(n=2\\) and continuity \\(r=1\\), so \\(5\\) quadratic pieces. The first piece is set by the first three points; every later piece starts at the last point of the previous one and has one derived and one new free point.',
            ),
            formulaIds: ['cn-continuity'],
            frames: [frame('cn-pieces-explanation', 'explanation'), frame('cn-pieces-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej odseke in izpeljane točke; s stikalom Skrij fiksne točke izpeljane točke skrij in spet pokaži.', 'Count the pieces and the derived points; hide and show the derived points with the Hide fixed points switch.'),
            expectedObservations: [text('Zlepek ima \\(5\\) odsekov in \\(4\\) izpeljane točke, prostih točk je \\(7\\).', 'The spline has \\(5\\) pieces and \\(4\\) derived points, and there are \\(7\\) free points.')],
            scene: {
                id: 'cn-default-labelled', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti zlepek (\\(n=2\\), \\(r=1\\)) z oznakami točk.', 'The default spline (\\(n=2\\), \\(r=1\\)) with point labels.'),
            },
        },
        {
            id: 'cn-extrapolate', order: 2,
            title: text('Enostranska konstrukcija', 'The one-sided construction'),
            purpose: text('Izračunati izpeljano točko z ekstrapolacijo prejšnjega odseka.', 'Computing a derived point by extrapolating the previous piece.'),
            explanation: text(
                'Algoritem 3 (razdelek 4.2.1) ekstrapolira odsek do parametra \\(t_0=\\tfrac{\\Delta u_j+\\Delta u_{j+1}}{\\Delta u_j}\\) in prvih \\(r+1\\) točk naslednjega odseka vzame iz de Casteljauove sheme. Pri enakomernih razmikih in \\(r=1\\) je druga točka naslednjega odseka \\(q_1=2p_2-p_1\\): leži na podaljšku zadnje stranice prejšnjega odseka, za stično točko, na enaki razdalji.',
                'Algorithm 3 (section 4.2.1) extrapolates a piece to the parameter \\(t_0=\\tfrac{\\Delta u_j+\\Delta u_{j+1}}{\\Delta u_j}\\) and takes the first \\(r+1\\) points of the next piece from the de Casteljau scheme. With uniform spacing and \\(r=1\\) the second point of the next piece is \\(q_1=2p_2-p_1\\): it lies on the extension of the last edge of the previous piece, beyond the joint, at the same distance.',
            ),
            formulaIds: ['cn-extrapolation'],
            frames: [frame('cn-extrapolate-explanation', 'explanation'), frame('cn-extrapolate-calculation', 'calculation'), frame('cn-extrapolate-observation', 'observation')],
            workedExampleId: 'cn-first-junction',
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči prvi stik in preveri, da so \\(p_1\\), \\(p_2\\) in prva izpeljana točka na isti premici.', 'Find the first joint and check that \\(p_1\\), \\(p_2\\) and the first derived point lie on one line.'),
            expectedObservations: [text('Stična točka \\(p_2\\) je na sredini med \\(p_1\\) in izpeljano točko \\(q_1\\); kontrolni poligon gre skozi stik naravnost.', 'The joint \\(p_2\\) is the midpoint between \\(p_1\\) and the derived point \\(q_1\\); the control polygon passes straight through the joint.')],
            scene: {
                id: 'cn-extrapolation-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek z oznakami in kontrolnim poligonom.', 'The default spline with labels and the control polygon.'),
            },
        },
        {
            id: 'cn-degree-three', order: 3,
            title: text('Višja zveznost: \\(n=3\\), \\(r=2\\)', 'Higher continuity: \\(n=3\\), \\(r=2\\)'),
            purpose: text('Videti, kaj zahteva višja zveznost od izpeljanih točk.', 'Seeing what higher continuity demands of the derived points.'),
            explanation: text(
                'Pri stopnji \\(n=3\\) in zveznosti \\(r=2\\) vsak naslednji odsek prevzame prve tri točke iz ekstrapolacije in ima le še eno prosto točko. Zlepek ima \\(4\\) odseke in \\(6\\) izpeljanih točk, na stiku pa se ujemata prva in druga diferenca. Ekstrapolacija višje stopnje izpeljane točke hitro oddalji od prostih točk.',
                'At degree \\(n=3\\) and continuity \\(r=2\\) every later piece takes its first three points from the extrapolation and has just one more free point. The spline has \\(4\\) pieces and \\(6\\) derived points, and at a joint the first and second differences agree. Extrapolation of a higher degree quickly moves the derived points away from the free points.',
            ),
            formulaIds: ['cn-continuity'],
            frames: [frame('cn-degree-three-explanation', 'explanation'), frame('cn-degree-three-calculation', 'calculation'), frame('cn-degree-three-observation', 'observation')],
            workedExampleId: 'cn-second-order',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj število odsekov in izpeljanih točk s privzetim zlepkom. Zadnje izpeljane točke so izven privzetega pogleda: večkrat pritisni »Oddalji graf« in poglej, kje so.', 'Compare the number of pieces and derived points with the default spline. The last derived points lie outside the default view: press "Zoom out" a few times to see where they are.'),
            expectedObservations: [text('Odsekov je \\(4\\), izpeljanih točk \\(6\\); zadnje izpeljane točke so več deset enot daleč od prostih točk (do približno \\(70\\) enot od izhodišča), zato je pogled lahko zelo oddaljen.', 'There are \\(4\\) pieces and \\(6\\) derived points; the last derived points are tens of units away from the free points (up to about \\(70\\) units from the origin), so the view can be zoomed far out.')],
            scene: {
                id: 'cn-degree-three-continuity-two', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-degree', value: 3}, {name: 'set-spline-continuity', value: 2}, {name: 'show-spline-labels', value: true}],
                expectedState: text('Zlepek stopnje \\(3\\) z zveznostjo \\(2\\), \\(4\\) odseki in \\(6\\) izpeljanimi točkami.', 'A degree-\\(3\\) spline with continuity \\(2\\), \\(4\\) pieces and \\(6\\) derived points.'),
            },
        },
        {
            id: 'cn-nonlocal', order: 4,
            title: text('Sprememba se prenese naprej', 'A change propagates forward'),
            purpose: text('Pokazati, da enostranski zlepek ni lokalen.', 'Showing that the one-sided spline is not local.'),
            explanation: text(
                'Izpeljane točke so odvisne od prejšnjega odseka, zato premik proste točke spremeni njen odsek in vse kasnejše, prejšnji odseki pa ostanejo. Diplomsko delo (Slika 24) ugotavlja, da tako zgrajeni zlepki niso prijazni uporabniku, ker kontrolne točke različno vplivajo na obliko krivulje.',
                'The derived points depend on the previous piece, so moving a free point changes its piece and every later one, while earlier pieces stay. The thesis (Figure 24) notes that splines built this way are not user-friendly because the control points influence the shape so unequally.',
            ),
            formulaIds: ['cn-extrapolation'],
            frames: [frame('cn-nonlocal-explanation', 'explanation'), frame('cn-nonlocal-observation', 'observation')],
            learnerInteraction: 'drag-control-point',
            observationPrompt: text('Povleci točko \\(p_3\\) in opazuj, kateri odseki se spremenijo; nato povleci še \\(p_1\\).', 'Drag the point \\(p_3\\) and watch which pieces change; then drag \\(p_1\\).'),
            expectedObservations: [text('Premik \\(p_3\\) pusti prvi odsek na mestu in spremeni vse štiri naslednje; premik \\(p_1\\) spremeni vseh \\(5\\) odsekov.', 'Moving \\(p_3\\) leaves the first piece in place and changes all four following ones; moving \\(p_1\\) changes all \\(5\\) pieces.')],
            scene: {
                id: 'cn-nonlocal-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti zlepek z oznakami točk, pripravljen za vlečenje.', 'The default spline with point labels, ready for dragging.'),
            },
        },
    ],
    sources: [
        thesisSource('stampar-thesis-spline-cn', 'razdelek 4 (Definicija 4.1, pogoji \\(C^r\\), str. 20-21) in razdelek 4.2.1 (Algoritem 3, Slika 24, str. 23-24)',
            ['definition of a spline and C^r conditions', 'one-sided construction by extrapolation', 'non-locality of one-sided splines'],
            'Route points p0..p6 match the thesis p_0..p_6; each piece after the first is [junction, derived points, new free points] with t_0 = (Δu_j + Δu_{j+1}) / Δu_j.'),
        farinSource('farin-cagd-spline-cn', ['piecewise Bézier curves', 'continuity conditions at the joints']),
        {
            id: 'bezeg-spline-cn-implementation',
            citation: 'Bezeg source: src/graphs/curves/spline/CnSplineGraph.tsx and src/bezeg/impl/curve/GenericBezierSpline.ts.',
            supports: ['continuity order and spline degree counters', 'derived points', 'Label all points and Hide fixed points switches'],
            implementationCorrespondence: 'GenericBezierSpline.generateBezierCurves takes the first r+1 points of each later piece from the de Casteljau scheme of the previous piece at t_0 and the rest from the free points (step n-r).',
        },
    ],
    edgeCases: [
        text('Zveznost je od \\(0\\) do \\(n-1\\), stopnja pa od \\(r+1\\) do števila točk; če višanja ni mogoče, stikalo ne naredi ničesar.', 'The continuity runs from \\(0\\) to \\(n-1\\) and the degree from \\(r+1\\) up to the number of points; if raising is impossible the counter does nothing.'),
        text('Pri \\(n=3\\) in \\(r=1\\) sedem točk ne zapolni zadnjega odseka: ta ima le tri točke in je na stiku le \\(G^1\\), ne \\(C^1\\). Lekcija zato uporablja pare \\((2,1)\\) in \\((3,2)\\), ki zapolnita vse odseke.', 'At \\(n=3\\) and \\(r=1\\) seven points do not fill the last piece: it has only three points and is only \\(G^1\\), not \\(C^1\\), at its joint. The lesson therefore uses the pairs \\((2,1)\\) and \\((3,2)\\), which fill all pieces.'),
        text('Izpeljane točke so lahko zelo daleč od prostih: pri \\(n=3\\), \\(r=2\\) do približno \\(70\\) enot od izhodišča, pri \\(n=4\\), \\(r=3\\) celo čez \\(150\\).', 'Derived points can be very far from the free ones: up to about \\(70\\) units from the origin at \\(n=3\\), \\(r=2\\), and over \\(150\\) at \\(n=4\\), \\(r=3\\).'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenske izraze »odsek«, »stična točka« in »izpeljana točka« (v aplikaciji »fiksna točka«) ter odločiti, ali naj se privzeta točka z tremi števili \\([-1{,}5;\\ -2;\\ 5]\\), ki se izriše kot \\((-1{,}5;\\ -2)\\), popravi.', 'Before classroom-ready review, confirm the Slovenian terms "odsek" (piece), "stična točka" (joint) and "izpeljana točka" (derived point, "fiksna točka" in the app), and decide whether the default point with three numbers \\([-1.5,\\ -2,\\ 5]\\), drawn as \\((-1.5,\\ -2)\\), should be corrected.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// spline-c1
// ---------------------------------------------------------------------------------------------

const splineC1: GuidedLesson = {
    demonstrationId: 'spline-c1',
    title: text('Simetrični C¹ zlepek', 'Symmetric C¹ spline'),
    summary: text(
        'Pri simetrični konstrukciji (Algoritem 4) so vse kontrolne točke proste, stične točke pa izračunamo kot točke na stranicah kontrolnega poligona. Pri enakomernih razmikih parametra so to razpolovišča, zlepek je kvadraten in \\(C^1\\), sprememba točke pa vpliva le na bližnje odseke.',
        'In the symmetric construction (Algorithm 4) all control points are free and the joints are computed as points on the edges of the control polygon. With uniform parameter spacing they are midpoints, the spline is quadratic and \\(C^1\\), and moving a point affects only nearby pieces.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje kvadratne Bézierjeve krivulje.', 'Assumes familiarity with a quadratic Bézier curve.'),
        text('Priporočeno je, da poznaš enostranski zlepek iz lekcije \\(C^n\\).', 'It helps to know the one-sided spline from the \\(C^n\\) lesson.'),
    ],
    learningGoals: [
        text('Izračunaš stično točko kot točko na stranici kontrolnega poligona in poveš, da je pri enakomernih razmikih razpolovišče.', 'Compute a joint as a point on an edge of the control polygon and state that with uniform spacing it is the midpoint.'),
        text('Pojasniš, zakaj se odvoda na stiku ujemata in zakaj krivulja tam tangira kontrolni poligon.', 'Explain why the derivatives agree at a joint and why the curve touches the control polygon there.'),
        text('Poveš, da se vpliv točke omeji na sosednje odseke in da druga odvoda na stikih nista enaka.', 'State that the influence of a point is limited to neighbouring pieces and that second derivatives at the joints are not equal.'),
    ],
    formulaBlocks: [
        {
            id: 'c1-junction',
            latex: 'J_l=\\frac{\\Delta u_l}{\\Delta u_{l-1}+\\Delta u_l}\\,p_l+\\frac{\\Delta u_{l-1}}{\\Delta u_{l-1}+\\Delta u_l}\\,p_{l+1},\\qquad \\Delta u_l=\\Delta u_{l-1}\\ \\Rightarrow\\ J_l=\\tfrac12\\,(p_l+p_{l+1})',
            notation: text(
                'Točka \\(J_l\\) je stična točka med odsekoma \\(l\\) in \\(l+1\\), \\(p_l\\) in \\(p_{l+1}\\) sta sosednji prosti točki, \\(\\Delta u_l\\) pa so dolžine parametrskih intervalov.',
                'The point \\(J_l\\) is the joint between pieces \\(l\\) and \\(l+1\\), \\(p_l\\) and \\(p_{l+1}\\) are neighbouring free points and the \\(\\Delta u_l\\) are the lengths of the parameter intervals.',
            ),
            explanation: text(
                'Stična točka deli stranico \\(p_lp_{l+1}\\) v razmerju \\(\\Delta u_{l-1}:\\Delta u_l\\). Pri enakih razmikih je to razpolovišče stranice.',
                'The joint divides the edge \\(p_lp_{l+1}\\) in the ratio \\(\\Delta u_{l-1}:\\Delta u_l\\). With equal spacing it is the midpoint of the edge.',
            ),
        },
        {
            id: 'c1-tangent',
            latex: '\\frac{J_l-p_l}{\\Delta u_{l-1}}=\\frac{p_{l+1}-J_l}{\\Delta u_l}',
            notation: text(
                'Leva stran je odvod levega odseka v stični točki, desna odvod desnega odseka (pogoj (4.3)).',
                'The left side is the derivative of the left piece at the joint and the right side that of the right piece (condition (4.3)).',
            ),
            explanation: text(
                'Ker \\(J_l\\) leži na daljici \\(p_lp_{l+1}\\) v zgornjem razmerju, sta obe strani enaki \\(\\tfrac{p_{l+1}-p_l}{\\Delta u_{l-1}+\\Delta u_l}\\), zato je zlepek v stični točki \\(C^1\\).',
                'Since \\(J_l\\) lies on the segment \\(p_lp_{l+1}\\) in the ratio above, both sides equal \\(\\tfrac{p_{l+1}-p_l}{\\Delta u_{l-1}+\\Delta u_l}\\), so the spline is \\(C^1\\) at the joint.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'c1-first-junction',
            title: text('Primer: prva stična točka', 'Example: the first joint'),
            calculationLatex: 'J_1=\\tfrac12\\,(p_1+p_2)=\\tfrac12\\bigl((-4,-3)+(-1,-3)\\bigr)',
            resultLatex: 'J_1=\\bigl(-\\tfrac52,-3\\bigr),\\qquad J_1-p_1=p_2-J_1=\\bigl(\\tfrac32,0\\bigr)',
            check: text(
                'Prva stična točka je \\((-2{,}5;\\ -3)\\); naslednji sta \\((-1;\\ 0)\\) in \\((1;\\ 3)\\). Razliki \\(J_1-p_1\\) in \\(p_2-J_1\\) sta enaki, zato se odvoda ujemata.',
                'The first joint is \\((-2.5,\\ -3)\\); the next two are \\((-1,\\ 0)\\) and \\((1,\\ 3)\\). The differences \\(J_1-p_1\\) and \\(p_2-J_1\\) are equal, so the derivatives agree.',
            ),
        },
        {
            id: 'c1-second-differences',
            title: text('Primer: druga diferenca na prvem stiku', 'Example: the second difference at the first joint'),
            calculationLatex: 'p_0-2p_1+J_1=\\bigl(-4+8-\\tfrac52,\\,3+6-3\\bigr),\\qquad J_1-2p_2+J_2=\\bigl(-\\tfrac52+2-1,\\,-3+6+0\\bigr)',
            resultLatex: '\\bigl(\\tfrac32,6\\bigr)\\ne\\bigl(-\\tfrac32,3\\bigr)',
            check: text(
                'Druga diferenca levega in desnega odseka je \\((1{,}5;\\ 6)\\) oziroma \\((-1{,}5;\\ 3)\\): nista enaki, zato zlepek ni \\(C^2\\).',
                'The second difference of the left and right piece is \\((1.5,\\ 6)\\) and \\((-1.5,\\ 3)\\): they are not equal, so the spline is not \\(C^2\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'c1-pieces', order: 1,
            title: text('Kvadratni odseki in stične točke', 'Quadratic pieces and joints'),
            purpose: text('Spoznati odseke privzetega zlepka in izpeljane stične točke.', 'Meeting the pieces of the default spline and its derived joints.'),
            explanation: text(
                'Privzeti zlepek ima \\(6\\) prostih točk in \\(4\\) kvadratne odseke. Pri simetrični konstrukciji (Algoritem 4, razdelek 4.2.2) so vse točke proste; stične točke med odseki so izpeljane in jih računalnik poišče sam.',
                'The default spline has \\(6\\) free points and \\(4\\) quadratic pieces. In the symmetric construction (Algorithm 4, section 4.2.2) all points are free; the joints between pieces are derived and found by the program.',
            ),
            formulaIds: ['c1-junction'],
            frames: [frame('c1-pieces-explanation', 'explanation'), frame('c1-pieces-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej odseke in stične točke ter poglej, katere točke lahko vlečeš.', 'Count the pieces and joints and see which points you can drag.'),
            expectedObservations: [text('Odsekov je \\(4\\), stičnih točk \\(3\\); vsak odsek ima tri kontrolne točke, od tega sta lahko ena ali dve stični.', 'There are \\(4\\) pieces and \\(3\\) joints; every piece has three control points, of which one or two can be joints.')],
            scene: {
                id: 'c1-default-labelled', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti \\(C^1\\) zlepek z oznakami točk.', 'The default \\(C^1\\) spline with point labels.'),
            },
        },
        {
            id: 'c1-midpoint', order: 2,
            title: text('Stična točka kot razpolovišče', 'The joint as a midpoint'),
            purpose: text('Izračunati stično točko iz sosednjih prostih točk.', 'Computing a joint from neighbouring free points.'),
            explanation: text(
                'Stična točka \\(J_l\\) leži na stranici \\(p_lp_{l+1}\\) kontrolnega poligona in jo deli v razmerju \\(\\Delta u_{l-1}:\\Delta u_l\\). Ker ima privzeti zlepek enakomerne razmike (vsak odsek \\(\\tfrac14\\) parametra), je \\(J_l\\) razpolovišče: \\(J_1=(-2{,}5;\\ -3)\\).',
                'The joint \\(J_l\\) lies on the edge \\(p_lp_{l+1}\\) of the control polygon and divides it in the ratio \\(\\Delta u_{l-1}:\\Delta u_l\\). The default spline has uniform spacing (each piece takes \\(\\tfrac14\\) of the parameter), so \\(J_l\\) is the midpoint: \\(J_1=(-2.5,\\ -3)\\).',
            ),
            formulaIds: ['c1-junction'],
            frames: [frame('c1-midpoint-explanation', 'explanation'), frame('c1-midpoint-calculation', 'calculation'), frame('c1-midpoint-observation', 'observation')],
            workedExampleId: 'c1-first-junction',
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri z oznakami, da vse tri stične točke ležijo na sredini stranic \\(p_1p_2\\), \\(p_2p_3\\) in \\(p_3p_4\\).', 'Use the labels to check that all three joints lie at the middle of the edges \\(p_1p_2\\), \\(p_2p_3\\) and \\(p_3p_4\\).'),
            expectedObservations: [text('Stične točke so \\((-2{,}5;\\ -3)\\), \\((-1;\\ 0)\\) in \\((1;\\ 3)\\); stranici \\(p_0p_1\\) in \\(p_4p_5\\) nimata stične točke.', 'The joints are \\((-2.5,\\ -3)\\), \\((-1,\\ 0)\\) and \\((1,\\ 3)\\); the edges \\(p_0p_1\\) and \\(p_4p_5\\) have no joint.')],
            scene: {
                id: 'c1-midpoint-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek z oznakami in kontrolnim poligonom.', 'The default spline with labels and the control polygon.'),
            },
        },
        {
            id: 'c1-tangent-step', order: 3,
            title: text('Tangenta v stični točki', 'The tangent at a joint'),
            purpose: text('Razložiti, zakaj sta odseka na stiku \\(C^1\\)-zvezna.', 'Explaining why the pieces are \\(C^1\\)-continuous at a joint.'),
            explanation: text(
                'Odseka pred in za stično točko imata tam tangento vzdolž stranice \\(p_lp_{l+1}\\): daljici \\(p_lJ_l\\) in \\(J_lp_{l+1}\\) sta dela iste stranice, razmerje njunih dolžin pa je enako razmerju parametrskih intervalov. Zato se odvoda ujemata (pogoj (4.3)) in krivulja se v stični točki dotika kontrolnega poligona.',
                'The pieces before and after a joint have their tangent along the edge \\(p_lp_{l+1}\\) there: the segments \\(p_lJ_l\\) and \\(J_lp_{l+1}\\) are parts of the same edge and the ratio of their lengths equals the ratio of the parameter intervals. So the derivatives agree (condition (4.3)) and the curve touches the control polygon at the joint.',
            ),
            formulaIds: ['c1-tangent'],
            frames: [frame('c1-tangent-step-explanation', 'explanation'), frame('c1-tangent-step-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Sledi krivulji skozi stično točko in preveri, da se tam ne zlomi ter da se dotika poligona.', 'Follow the curve through a joint and check that it does not break there and that it touches the polygon.'),
            expectedObservations: [text('V vsaki od treh stičnih točk je krivulja gladka in se dotika stranice poligona.', 'At each of the three joints the curve is smooth and touches an edge of the polygon.')],
            scene: {
                id: 'c1-tangent-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek s kontrolnim poligonom.', 'The default spline with the control polygon.'),
            },
        },
        {
            id: 'c1-local', order: 4,
            title: text('Lokalnost', 'Locality'),
            purpose: text('Pokazati, da točka vpliva le na bližnje odseke.', 'Showing that a point influences only nearby pieces.'),
            explanation: text(
                'Stična točka \\(J_l\\) je odvisna le od dveh sosednjih prostih točk, zato se premik točke prenese le na odseke ob teh stikih. Slika 25 diplomskega dela kaže, da je tak zlepek veliko prijaznejši uporabniku od enostranskega.',
                'A joint \\(J_l\\) depends only on two neighbouring free points, so moving a point reaches only the pieces next to those joints. Figure 25 of the thesis shows that such a spline is much friendlier to the user than the one-sided one.',
            ),
            formulaIds: ['c1-junction'],
            frames: [frame('c1-local-explanation', 'explanation'), frame('c1-local-observation', 'observation')],
            learnerInteraction: 'drag-control-point',
            observationPrompt: text('Povleci \\(p_5\\), nato \\(p_2\\) in opazuj, kateri odseki se spremenijo.', 'Drag \\(p_5\\), then \\(p_2\\), and watch which pieces change.'),
            expectedObservations: [text('Premik \\(p_5\\) spremeni samo zadnji odsek; premik \\(p_2\\) spremeni prve tri odseke, četrti ostane.', 'Moving \\(p_5\\) changes only the last piece; moving \\(p_2\\) changes the first three pieces and the fourth stays.')],
            scene: {
                id: 'c1-local-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti zlepek z oznakami točk, pripravljen za vlečenje.', 'The default spline with point labels, ready for dragging.'),
            },
        },
        {
            id: 'c1-not-c2', order: 5,
            title: text('\\(C^1\\) ni \\(C^2\\)', '\\(C^1\\) is not \\(C^2\\)'),
            purpose: text('Pokazati mejo zveznosti \\(C^1\\).', 'Showing the limit of \\(C^1\\) continuity.'),
            explanation: text(
                'Prva odvoda se na stikih ujemata, druga pa ne: pri prvem stiku sta druga diferenca levega in desnega odseka \\((1{,}5;\\ 6)\\) in \\((-1{,}5;\\ 3)\\). Krivulja je gladka, njena ukrivljenost pa se lahko na stikih skokovito spremeni. Višjo zveznost da kubična konstrukcija v naslednji lekciji.',
                'The first derivatives agree at the joints but the second ones do not: at the first joint the second differences of the left and right piece are \\((1.5,\\ 6)\\) and \\((-1.5,\\ 3)\\). The curve is smooth, but its curvature can jump at the joints. The cubic construction in the next lesson gives higher continuity.',
            ),
            formulaIds: ['c1-tangent'],
            frames: [frame('c1-not-c2-explanation', 'explanation'), frame('c1-not-c2-calculation', 'calculation'), frame('c1-not-c2-observation', 'observation')],
            workedExampleId: 'c1-second-differences',
            learnerInteraction: 'observe',
            observationPrompt: text('Pri prvem stiku primerjaj, kako se krivulja ukrivlja pred njim in za njim.', 'At the first joint compare how the curve bends before and after it.'),
            expectedObservations: [text('Druga diferenca se pri vseh treh stikih razlikuje: zlepek je \\(C^1\\), ni pa \\(C^2\\).', 'The second difference differs at all three joints: the spline is \\(C^1\\) but not \\(C^2\\).')],
            scene: {
                id: 'c1-not-c2-hidden', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti zlepek z oznakami točk.', 'The default spline with point labels.'),
            },
        },
    ],
    sources: [
        thesisSource('stampar-thesis-spline-c1', 'razdelek 4 (pogoj (4.3), str. 20-21) in razdelek 4.2.2 (Algoritem 4, Slika 25, str. 24-26)',
            ['symmetric construction of a quadratic C^1 spline', 'junction points dividing control polygon edges', 'locality of control points'],
            'The route points p0..p5 are the thesis p_0..p_{m+1}; the derived junctions are J_l = (Δu_l p_l + Δu_{l-1} p_{l+1}) / (Δu_{l-1} + Δu_l).'),
        farinSource('farin-cagd-spline-c1', ['piecewise quadratic Bézier curves', 'C^1 continuity as collinear control points at the joint']),
        {
            id: 'bezeg-spline-c1-implementation',
            citation: 'Bezeg source: src/graphs/curves/spline/C1SplineGraph.tsx and src/bezeg/impl/curve/C1QuadraticBezierSpline.ts.',
            supports: ['derived junction points', 'Label all points and Hide fixed points switches', 'control polygon switch'],
            implementationCorrespondence: 'C1QuadraticBezierSpline.generateBezierCurves places the junction between points[l-1] and points[l] with weights du2/duSum and du1/duSum; alpha = 0 gives equal spans and midpoints.',
        },
    ],
    edgeCases: [
        text('Razmerje \\(\\Delta u_{l-1}:\\Delta u_l\\) je v tej poti enako \\(1:1\\), zato je vsaka stična točka razpolovišče; pri drugih razmikih bi stik drsel po stranici.', 'On this route the ratio \\(\\Delta u_{l-1}:\\Delta u_l\\) is \\(1:1\\), so every joint is a midpoint; with other spacing the joint would slide along the edge.'),
        text('Skrajni stranici \\(p_0p_1\\) in \\(p_4p_5\\) nimata stične točke: prvi in zadnji odsek se začneta oziroma končata v prosti točki.', 'The outer edges \\(p_0p_1\\) and \\(p_4p_5\\) have no joint: the first and last pieces start and end at free points.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj učenci stično točko iščejo kot »razpolovišče« ali kot »točko, ki deli stranico v razmerju parametrskih intervalov«.', 'Before classroom-ready review, confirm whether learners should look for the joint as a "midpoint" or as "the point dividing the edge in the ratio of the parameter intervals".'),
    ],
};

// ---------------------------------------------------------------------------------------------
// spline-c2
// ---------------------------------------------------------------------------------------------

const splineC2: GuidedLesson = {
    demonstrationId: 'spline-c2',
    title: text('Simetrični C² zlepek', 'Symmetric C² spline'),
    summary: text(
        'Kubični zlepek iz Algoritma 5 ima proste točke, notranji kontrolni točki vsakega odseka pa ležita na tretjinah stranice kontrolnega poligona. Stične točke ležijo sredi med sosednjima notranjima točkama, zato se ujemajo prvi in drugi odvod (\\(C^2\\)), vpliv točke pa je omejen na bližnje odseke.',
        'The cubic spline from Algorithm 5 has free points, and the two inner control points of each piece lie at the thirds of an edge of the control polygon. The joints lie midway between the neighbouring inner points, so the first and second derivatives agree (\\(C^2\\)) and the influence of a point is limited to nearby pieces.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje kubične Bézierjeve krivulje.', 'Assumes familiarity with a cubic Bézier curve.'),
        text('Priporočeno je, da poznaš simetrični \\(C^1\\) zlepek iz prejšnje lekcije.', 'It helps to know the symmetric \\(C^1\\) spline from the previous lesson.'),
    ],
    learningGoals: [
        text('Izračunaš notranji kontrolni točki odseka na tretjinah stranice in stično točko kot sredino med sosednjima notranjima točkama.', 'Compute the two inner control points of a piece at the thirds of an edge and the joint as the midpoint of the neighbouring inner points.'),
        text('Pojasniš, da se na stiku ujemajo prva in druga diferenca in da zato krivulja tam nima skoka ukrivljenosti.', 'Explain that the first and second differences agree at a joint and that the curve therefore has no curvature jump there.'),
        text('Povežeš lokalnost zlepka s tem, katere točke vplivajo na kateri odsek.', 'Connect the locality of the spline to which points influence which piece.'),
    ],
    formulaBlocks: [
        {
            id: 'c2-thirds',
            latex: 'c_1=\\tfrac23\\,a+\\tfrac13\\,b,\\qquad c_2=\\tfrac13\\,a+\\tfrac23\\,b',
            notation: text(
                'Točki \\(a\\) in \\(b\\) sta sosednji prosti točki, \\(c_1\\) in \\(c_2\\) sta notranji kontrolni točki odseka med njima.',
                'The points \\(a\\) and \\(b\\) are neighbouring free points and \\(c_1\\), \\(c_2\\) are the inner control points of the piece between them.',
            ),
            explanation: text(
                'To je poseben primer Algoritma 5 pri enakomernih razmikih; pri splošnih razmikih sta uteži \\(\\tfrac{\\Delta u_l+\\Delta u_{l+1}}{\\Delta u_{l-1}+\\Delta u_l+\\Delta u_{l+1}}\\) in \\(\\tfrac{\\Delta u_{l-1}}{\\Delta u_{l-1}+\\Delta u_l+\\Delta u_{l+1}}\\).',
                'This is a special case of Algorithm 5 with uniform spacing; for general spacing the weights are \\(\\tfrac{\\Delta u_l+\\Delta u_{l+1}}{\\Delta u_{l-1}+\\Delta u_l+\\Delta u_{l+1}}\\) and \\(\\tfrac{\\Delta u_{l-1}}{\\Delta u_{l-1}+\\Delta u_l+\\Delta u_{l+1}}\\).',
            ),
        },
        {
            id: 'c2-joint',
            latex: 'J_l=\\tfrac12\\bigl(c^{(l)}_2+c^{(l+1)}_1\\bigr),\\qquad J_l-c^{(l)}_2=c^{(l+1)}_1-J_l',
            notation: text(
                'Zgornji indeks je številka odseka: \\(c^{(l)}_2\\) je predzadnja kontrolna točka levega, \\(c^{(l+1)}_1\\) druga kontrolna točka desnega odseka.',
                'The superscript is the number of the piece: \\(c^{(l)}_2\\) is the second-to-last control point of the left piece and \\(c^{(l+1)}_1\\) the second control point of the right piece.',
            ),
            explanation: text(
                'Prvo diferenco na stiku izravna razpolovišče. Za drugo diferenco poskrbijo tretjinske točke: \\(\\Delta^2\\) levega odseka je \\(c^{(l)}_1-2c^{(l)}_2+J_l\\), desnega \\(J_l-2c^{(l+1)}_1+c^{(l+1)}_2\\), in obe sta enaki.',
                'The midpoint equalises the first difference at the joint. The third-points take care of the second difference: \\(\\Delta^2\\) of the left piece is \\(c^{(l)}_1-2c^{(l)}_2+J_l\\), of the right one \\(J_l-2c^{(l+1)}_1+c^{(l+1)}_2\\), and the two are equal.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'c2-thirds-example',
            title: text('Primer: notranji točki drugega odseka', 'Example: the inner points of the second piece'),
            calculationLatex: 'a=p_2=\\bigl(-\\tfrac{43}{10},-3\\bigr),\\ b=p_3=(1,-2),\\qquad c_1=\\tfrac23a+\\tfrac13b,\\ \\ c_2=\\tfrac13a+\\tfrac23b',
            resultLatex: 'c_1=\\bigl(-\\tfrac{38}{15},-\\tfrac83\\bigr),\\qquad c_2=\\bigl(-\\tfrac{23}{30},-\\tfrac73\\bigr)',
            check: text(
                'Točki sta približno \\((-2{,}533;\\ -2{,}667)\\) in \\((-0{,}767;\\ -2{,}333)\\) in delita stranico \\(p_2p_3\\) na tri enake dele.',
                'The points are about \\((-2.533,\\ -2.667)\\) and \\((-0.767,\\ -2.333)\\) and divide the edge \\(p_2p_3\\) into three equal parts.',
            ),
        },
        {
            id: 'c2-joint-example',
            title: text('Primer: prva stična točka', 'Example: the first joint'),
            calculationLatex: 'c^{(1)}_2=\\tfrac12(p_1+p_2)=\\bigl(-\\tfrac92,-\\tfrac{53}{40}\\bigr),\\qquad J_1=\\tfrac12\\bigl(c^{(1)}_2+c^{(2)}_1\\bigr)',
            resultLatex: 'J_1=\\bigl(-\\tfrac{211}{60},-\\tfrac{479}{240}\\bigr)\\approx(-3.517,\\,-1.996)',
            check: text(
                'Prva stična točka je približno \\((-3{,}517;\\ -1{,}996)\\); prva diferenca \\(J_1-c^{(1)}_2\\) je enaka \\(c^{(2)}_1-J_1\\), druga diferenca pa je na obeh straneh približno \\((0{,}783;\\ 1{,}004)\\).',
                'The first joint is about \\((-3.517,\\ -1.996)\\); the first difference \\(J_1-c^{(1)}_2\\) equals \\(c^{(2)}_1-J_1\\), and the second difference is about \\((0.783,\\ 1.004)\\) on both sides.',
            ),
        },
    ],
    steps: [
        {
            id: 'c2-pieces', order: 1,
            title: text('Kubični odseki', 'Cubic pieces'),
            purpose: text('Spoznati odseke privzetega kubičnega zlepka.', 'Meeting the pieces of the default cubic spline.'),
            explanation: text(
                'Privzeti zlepek ima \\(7\\) prostih točk, označenih \\(p_0,\\dots,p_6\\) (v diplomskem delu \\(p_{-1},\\dots,p_5\\)), in \\(4\\) kubične odseke. Odseki imajo skupaj \\(9\\) izpeljanih točk: tri stične in dve notranji točki vsakega srednjega odseka ter po eno notranjo točko krajnih odsekov.',
                'The default spline has \\(7\\) free points labelled \\(p_0,\\dots,p_6\\) (\\(p_{-1},\\dots,p_5\\) in the thesis) and \\(4\\) cubic pieces. The pieces share \\(9\\) derived points: three joints, two inner points for each middle piece and one inner point for each end piece.',
            ),
            formulaIds: ['c2-thirds'],
            frames: [frame('c2-pieces-explanation', 'explanation'), frame('c2-pieces-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej odseke in izpeljane točke; skrij jih s stikalom Skrij fiksne točke.', 'Count the pieces and the derived points; hide them with the Hide fixed points switch.'),
            expectedObservations: [text('Odsekov je \\(4\\), izpeljanih točk \\(9\\), prostih točk \\(7\\).', 'There are \\(4\\) pieces, \\(9\\) derived points and \\(7\\) free points.')],
            scene: {
                id: 'c2-default-labelled', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti \\(C^2\\) zlepek z oznakami točk.', 'The default \\(C^2\\) spline with point labels.'),
            },
        },
        {
            id: 'c2-thirds-step', order: 2,
            title: text('Notranji točki na tretjinah', 'Inner points at the thirds'),
            purpose: text('Izračunati notranji kontrolni točki srednjega odseka.', 'Computing the inner control points of a middle piece.'),
            explanation: text(
                'Drugi odsek leži med prostima točkama \\(p_2\\) in \\(p_3\\). Pri enakomernih razmikih njegovi notranji kontrolni točki (Algoritem 5) delita stranico \\(p_2p_3\\) na tretjine: \\(c_1=\\tfrac23p_2+\\tfrac13p_3\\) in \\(c_2=\\tfrac13p_2+\\tfrac23p_3\\).',
                'The second piece lies between the free points \\(p_2\\) and \\(p_3\\). With uniform spacing its inner control points (Algorithm 5) divide the edge \\(p_2p_3\\) into thirds: \\(c_1=\\tfrac23p_2+\\tfrac13p_3\\) and \\(c_2=\\tfrac13p_2+\\tfrac23p_3\\).',
            ),
            formulaIds: ['c2-thirds'],
            frames: [frame('c2-thirds-step-explanation', 'explanation'), frame('c2-thirds-step-calculation', 'calculation'), frame('c2-thirds-step-observation', 'observation')],
            workedExampleId: 'c2-thirds-example',
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči izpeljani točki na stranici \\(p_2p_3\\) in preveri, da jo delita na tri enake dele.', 'Find the two derived points on the edge \\(p_2p_3\\) and check that they divide it into three equal parts.'),
            expectedObservations: [text('Točki \\((-2{,}533;\\ -2{,}667)\\) in \\((-0{,}767;\\ -2{,}333)\\) ležita na stranici \\(p_2p_3\\), ob tretjinah.', 'The points \\((-2.533,\\ -2.667)\\) and \\((-0.767,\\ -2.333)\\) lie on the edge \\(p_2p_3\\), at the thirds.')],
            scene: {
                id: 'c2-thirds-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek z oznakami in kontrolnim poligonom.', 'The default spline with labels and the control polygon.'),
            },
        },
        {
            id: 'c2-joint-step', order: 3,
            title: text('Stična točka in zveznost \\(C^2\\)', 'The joint and \\(C^2\\) continuity'),
            purpose: text('Razložiti, zakaj se na stiku ujemajo odvodi do drugega reda.', 'Explaining why derivatives up to second order agree at a joint.'),
            explanation: text(
                'Stična točka leži na sredini med notranjima točkama sosednjih odsekov. Zato je \\(J_1-c^{(1)}_2=c^{(2)}_1-J_1\\) in se prvi odvod ujema; tretjinske točke pa poskrbijo, da se ujema tudi druga diferenca. Ker se ujemata prvi in drugi odvod, se na stiku ujema tudi ukrivljenost, če odvod ni nič.',
                'The joint lies midway between the inner points of the neighbouring pieces. Hence \\(J_1-c^{(1)}_2=c^{(2)}_1-J_1\\) and the first derivative agrees; the third-points make the second difference agree too. Since the first and second derivatives agree, the curvature at the joint agrees as well wherever the derivative is nonzero.',
            ),
            formulaIds: ['c2-joint'],
            frames: [frame('c2-joint-step-explanation', 'explanation'), frame('c2-joint-step-calculation', 'calculation'), frame('c2-joint-step-observation', 'observation')],
            workedExampleId: 'c2-joint-example',
            learnerInteraction: 'observe',
            observationPrompt: text('Poišči prvo stično točko in preveri, da leži sredi med dvema sosednjima notranjima točkama.', 'Find the first joint and check that it lies midway between two neighbouring inner points.'),
            expectedObservations: [text('Prva stična točka je približno \\((-3{,}517;\\ -1{,}996)\\), na sredini daljice med \\((-4{,}5;\\ -1{,}325)\\) in \\((-2{,}533;\\ -2{,}667)\\).', 'The first joint is about \\((-3.517,\\ -1.996)\\), at the middle of the segment between \\((-4.5,\\ -1.325)\\) and \\((-2.533,\\ -2.667)\\).')],
            scene: {
                id: 'c2-joint-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek z oznakami in kontrolnim poligonom.', 'The default spline with labels and the control polygon.'),
            },
        },
        {
            id: 'c2-local', order: 4,
            title: text('Lokalnost', 'Locality'),
            purpose: text('Pokazati, katere točke vplivajo na kateri odsek.', 'Showing which points influence which piece.'),
            explanation: text(
                'Vsaka prosta točka vpliva le na sosednje odseke (Slika 26 diplomskega dela). Pri privzetih sedmih točkah in štirih odsekih to pomeni: \\(p_0\\) vpliva samo na prvi odsek, \\(p_6\\) samo na zadnjega, srednja točka \\(p_3\\) pa na vse štiri.',
                'Each free point influences only neighbouring pieces (Figure 26 of the thesis). With the default seven points and four pieces this means: \\(p_0\\) influences only the first piece, \\(p_6\\) only the last, and the middle point \\(p_3\\) all four.',
            ),
            formulaIds: ['c2-thirds'],
            frames: [frame('c2-local-explanation', 'explanation'), frame('c2-local-observation', 'observation')],
            learnerInteraction: 'drag-control-point',
            observationPrompt: text('Povleci \\(p_0\\), nato \\(p_6\\) in na koncu \\(p_3\\) ter opazuj, kateri odseki se spremenijo.', 'Drag \\(p_0\\), then \\(p_6\\) and finally \\(p_3\\), and watch which pieces change.'),
            expectedObservations: [text('Premik \\(p_0\\) spremeni samo prvi, premik \\(p_6\\) samo četrti odsek; premik \\(p_3\\) spremeni vse štiri, a vsakega manj kot svoj odsek.', 'Moving \\(p_0\\) changes only the first piece, moving \\(p_6\\) only the fourth; moving \\(p_3\\) changes all four, although each by less than its own piece.')],
            scene: {
                id: 'c2-local-default', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti zlepek z oznakami točk, pripravljen za vlečenje.', 'The default spline with point labels, ready for dragging.'),
            },
        },
    ],
    sources: [
        thesisSource('stampar-thesis-spline-c2', 'razdelek 4 (pogoji \\(C^r\\), Slika 21-22, str. 21-22) in razdelek 4.2.2 (Algoritem 5, Slika 26, str. 25-26)',
            ['symmetric construction of a cubic C^2 spline', 'inner control points at thirds with uniform spacing', 'locality of control points'],
            'The route labels p0..p6 are the thesis p_{-1}..p_5 (shifted by one); piece l+1 uses the thesis edge p_l p_{l+1}.'),
        farinSource('farin-cagd-spline-c2', ['piecewise cubic Bézier curves', 'C^2 continuity of cubic splines']),
        {
            id: 'bezeg-spline-c2-implementation',
            citation: 'Bezeg source: src/graphs/curves/spline/C2SplineGraph.tsx and src/bezeg/impl/curve/C2CubicBezierSpline.ts.',
            supports: ['derived inner and joint points', 'Label all points and Hide fixed points switches', 'control polygon switch'],
            implementationCorrespondence: 'C2CubicBezierSpline.generateBezierCurves places the inner points with the weights (du2+du3)/duSum, du1/duSum and the junction between the neighbouring inner points; its default has 7 points and 4 pieces.',
        },
    ],
    edgeCases: [
        text('Skrajna odseka imata po eno notranjo točko na sredini stranice \\(p_1p_2\\) oziroma \\(p_4p_5\\), ne na tretjini, zato prvi in zadnji odsek nista tretjinska.', 'The two end pieces have one inner point at the middle of the edge \\(p_1p_2\\) or \\(p_4p_5\\), not at a third, so the first and last pieces are not third-point pieces.'),
        text('Zlepek ni \\(C^3\\): tretja diferenca se na stikih razlikuje.', 'The spline is not \\(C^3\\): the third difference differs at the joints.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba odločiti o privzeti točki z tremi števili \\([1;\\ -2;\\ 5]\\), ki se izriše kot \\((1;\\ -2)\\), in potrditi označevanje \\(p_0,\\dots,p_6\\) proti \\(p_{-1},\\dots,p_5\\) v diplomskem delu.', 'Before classroom-ready review, decide about the default point with three numbers \\([1,\\ -2,\\ 5]\\), drawn as \\((1,\\ -2)\\), and confirm the labels \\(p_0,\\dots,p_6\\) against \\(p_{-1},\\dots,p_5\\) in the thesis.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// spline-g1
// ---------------------------------------------------------------------------------------------

const splineG1: GuidedLesson = {
    demonstrationId: 'spline-g1',
    title: text('Enostranski G¹ zlepek', 'One-sided G¹ spline'),
    summary: text(
        'Geometrijska zveznost \\(G^1\\) zahteva le isto smer tangente na stiku, ne enakega odvoda. Pri enostranskem zlepku leži druga točka naslednjega odseka na podaljšku zadnje stranice prejšnjega, njeno oddaljenost pa uravnava prost parameter \\(b\\); zlepek je \\(C^1\\) samo pri \\(b=1\\).',
        'Geometric continuity \\(G^1\\) requires only the same tangent direction at a joint, not equal derivatives. In the one-sided spline the second point of the next piece lies on the extension of the last edge of the previous piece, and its distance is set by a free parameter \\(b\\); the spline is \\(C^1\\) only at \\(b=1\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje \\(C^1\\) zlepka in kvadratne Bézierjeve krivulje.', 'Assumes familiarity with a \\(C^1\\) spline and a quadratic Bézier curve.'),
        text('Priporočeno je, da poznaš enostransko konstrukcijo iz lekcije \\(C^n\\).', 'It helps to know the one-sided construction from the \\(C^n\\) lesson.'),
    ],
    learningGoals: [
        text('Razložiš, da \\(G^1\\) dovoljuje poljubno pozitivno razmerje odvodov, \\(C^1\\) pa zahteva razmerje \\(1\\).', 'Explain that \\(G^1\\) allows any positive ratio of the derivatives while \\(C^1\\) requires the ratio \\(1\\).'),
        text('Izračunaš drugo točko naslednjega odseka iz \\(b\\) in preveriš, da leži na isti premici kot zadnja stranica prejšnjega.', 'Compute the second point of the next piece from \\(b\\) and check that it lies on the same line as the last edge of the previous piece.'),
        text('Povežeš \\(b\\) s parametrom \\(\\alpha_1\\) iz pogoja (4.6) in pojasniš, zakaj sprememba \\(b\\) vpliva tudi na zadnji odsek.', 'Relate \\(b\\) to the parameter \\(\\alpha_1\\) from condition (4.6) and explain why changing \\(b\\) also affects the last piece.'),
    ],
    formulaBlocks: [
        {
            id: 'g1-condition',
            latex: 'p^{(1)}_n-p^{(1)}_{n-1}=\\alpha_1\\bigl(p^{(2)}_1-p^{(2)}_0\\bigr)',
            notation: text(
                'Zgornja indeksa \\((1)\\) in \\((2)\\) označujeta levi in desni odsek, \\(\\alpha_1>0\\) pa je prost parameter (enačba (4.6)).',
                'The superscripts \\((1)\\) and \\((2)\\) mark the left and right piece and \\(\\alpha_1>0\\) is a free parameter (equation (4.6)).',
            ),
            explanation: text(
                'Zadnja stranica levega in prva stranica desnega odseka sta vzporedni in enako usmerjeni, njuni dolžini pa imata poljubno razmerje \\(\\alpha_1\\). Pri \\(C^1\\) bi moralo biti razmerje določeno z intervaloma.',
                'The last edge of the left piece and the first edge of the right piece are parallel and equally directed, and their lengths have an arbitrary ratio \\(\\alpha_1\\). For \\(C^1\\) the ratio would have to be fixed by the intervals.',
            ),
        },
        {
            id: 'g1-construction',
            latex: 'p^{(2)}_1=p^{(2)}_0+b\\bigl(p^{(1)}_n-p^{(1)}_{n-1}\\bigr),\\qquad b=\\frac1{\\alpha_1}',
            notation: text(
                'Parameter \\(b\\) je na drsniku v aplikaciji (označen z »Parameter b«) in je v diplomskem delu \\(\\tfrac{1}{\\alpha_1}\\).',
                'The parameter \\(b\\) is on the slider in the app (labelled "Parameter b") and equals \\(\\tfrac{1}{\\alpha_1}\\) in the thesis.',
            ),
            explanation: text(
                'Druga točka naslednjega odseka je zadnja točka prejšnjega, premaknjena za \\(b\\)-kratnik zadnje stranice. Pri enako dolgih parametrskih intervalih je razmerje odvodov \\(\\tfrac{\\lVert S_2^{\\prime}\\rVert}{\\lVert S_1^{\\prime}\\rVert}=b\\), zato je zlepek \\(C^1\\) natanko pri \\(b=1\\).',
                'The second point of the next piece is the last point of the previous one shifted by \\(b\\) times the last edge. With parameter intervals of equal length the ratio of the derivatives is \\(\\tfrac{\\lVert S_2^{\\prime}\\rVert}{\\lVert S_1^{\\prime}\\rVert}=b\\), so the spline is \\(C^1\\) exactly at \\(b=1\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'g1-three-values',
            title: text('Primer: \\(b=\\tfrac14,\\ 1,\\ \\tfrac52\\)', 'Example: \\(b=\\tfrac14,\\ 1,\\ \\tfrac52\\)'),
            calculationLatex: 'p_2-p_1=\\bigl(-\\tfrac52,-\\tfrac52\\bigr)-\\bigl(-4,-\\tfrac32\\bigr)=\\bigl(\\tfrac32,-1\\bigr),\\qquad q_1=p_2+b\\,(p_2-p_1)',
            resultLatex: 'b=\\tfrac14:\\ \\bigl(-\\tfrac{17}{8},-\\tfrac{11}{4}\\bigr);\\quad b=1:\\ \\bigl(-1,-\\tfrac72\\bigr);\\quad b=\\tfrac52:\\ \\bigl(\\tfrac54,-5\\bigr)',
            check: text(
                'Vse tri točke \\(q_1\\) ležijo na premici skozi \\(p_1\\) in \\(p_2\\): približno \\((-2{,}125;\\ -2{,}75)\\), \\((-1;\\ -3{,}5)\\) in \\((1{,}25;\\ -5)\\). Smer tangente je povsod enaka, dolžina prve stranice pa se spreminja z \\(b\\).',
                'All three points \\(q_1\\) lie on the line through \\(p_1\\) and \\(p_2\\): about \\((-2.125,\\ -2.75)\\), \\((-1,\\ -3.5)\\) and \\((1.25,\\ -5)\\). The tangent direction is always the same, while the length of the first edge changes with \\(b\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'g1-vs-c1', order: 1,
            title: text('\\(G^1\\) proti \\(C^1\\)', '\\(G^1\\) versus \\(C^1\\)'),
            purpose: text('Ločiti enako smer od enakega odvoda.', 'Separating equal direction from equal derivative.'),
            explanation: text(
                'Privzeti zlepek ima \\(5\\) točk in \\(3\\) kvadratne odseke z dvema stikoma; parameter \\(b\\) je pri obeh stikih \\(1\\). Takrat je zadnja stranica levega odseka enako dolga kot prva stranica desnega in zlepek je \\(C^1\\). Pri \\(G^1\\) (Definicija 4.2, razdelek 4.1) je dovolj, da imata odseka na stiku isto smer tangente.',
                'The default spline has \\(5\\) points and \\(3\\) quadratic pieces with two joints; the parameter \\(b\\) is \\(1\\) at both. Then the last edge of the left piece is as long as the first edge of the right one and the spline is \\(C^1\\). For \\(G^1\\) (Definition 4.2, section 4.1) it is enough that the pieces have the same tangent direction at a joint.',
            ),
            formulaIds: ['g1-condition'],
            frames: [frame('g1-vs-c1-explanation', 'explanation'), frame('g1-vs-c1-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri, da so \\(p_1\\), stična točka \\(p_2\\) in izpeljana točka na isti premici in da je \\(p_2\\) na sredini med njima.', 'Check that \\(p_1\\), the joint \\(p_2\\) and the derived point lie on one line and that \\(p_2\\) is midway between them.'),
            expectedObservations: [text('Pri \\(b=1\\) je izpeljana točka \\((-1;\\ -3{,}5)\\), zrcalna slika \\(p_1\\) čez stik \\(p_2\\); odseki so \\(3\\), stikov \\(2\\).', 'At \\(b=1\\) the derived point is \\((-1,\\ -3.5)\\), the mirror image of \\(p_1\\) across the joint \\(p_2\\); there are \\(3\\) pieces and \\(2\\) joints.')],
            scene: {
                id: 'g1-default-labelled', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}],
                expectedState: text('Privzeti \\(G^1\\) zlepek z \\(b=1\\) pri obeh stikih in z oznakami točk.', 'The default \\(G^1\\) spline with \\(b=1\\) at both joints and point labels.'),
            },
        },
        {
            id: 'g1-condition-step', order: 2,
            title: text('Pogoj (4.6) in parameter \\(b\\)', 'Condition (4.6) and the parameter \\(b\\)'),
            purpose: text('Izračunati drugo točko naslednjega odseka iz \\(b\\).', 'Computing the second point of the next piece from \\(b\\).'),
            explanation: text(
                'Iz pogoja (4.6) sledi \\(p^{(2)}_1=p^{(2)}_0+b\\bigl(p^{(1)}_n-p^{(1)}_{n-1}\\bigr)\\) z \\(b=\\tfrac{1}{\\alpha_1}\\). Pri prvem stiku je \\(p_2-p_1=(1{,}5;\\ -1)\\), zato je druga točka drugega odseka \\(q_1=p_2+b\\,(1{,}5;\\ -1)\\): pri \\(b=\\tfrac14\\) je to \\((-2{,}125;\\ -2{,}75)\\), pri \\(b=1\\) točka \\((-1;\\ -3{,}5)\\), pri \\(b=\\tfrac52\\) pa \\((1{,}25;\\ -5)\\).',
                'Condition (4.6) gives \\(p^{(2)}_1=p^{(2)}_0+b\\bigl(p^{(1)}_n-p^{(1)}_{n-1}\\bigr)\\) with \\(b=\\tfrac{1}{\\alpha_1}\\). At the first joint \\(p_2-p_1=(1.5,\\ -1)\\), so the second point of the second piece is \\(q_1=p_2+b\\,(1.5,\\ -1)\\): \\((-2.125,\\ -2.75)\\) at \\(b=\\tfrac14\\), \\((-1,\\ -3.5)\\) at \\(b=1\\) and \\((1.25,\\ -5)\\) at \\(b=\\tfrac52\\).',
            ),
            formulaIds: ['g1-construction'],
            frames: [frame('g1-condition-step-explanation', 'explanation'), frame('g1-condition-step-calculation', 'calculation'), frame('g1-condition-step-observation', 'observation')],
            workedExampleId: 'g1-three-values',
            learnerInteraction: 'observe',
            observationPrompt: text('Ob kontrolnem poligonu preveri, da \\(p_1\\), \\(p_2\\) in izpeljana točka ležijo na isti premici.', 'With the control polygon shown, check that \\(p_1\\), \\(p_2\\) and the derived point lie on one line.'),
            expectedObservations: [text('Kontrolni poligon gre skozi stik \\(p_2\\) naravnost; pri \\(b=1\\) je izpeljana točka \\((-1;\\ -3{,}5)\\).', 'The control polygon passes straight through the joint \\(p_2\\); at \\(b=1\\) the derived point is \\((-1,\\ -3.5)\\).')],
            scene: {
                id: 'g1-condition-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek z oznakami in kontrolnim poligonom.', 'The default spline with labels and the control polygon.'),
            },
        },
        {
            id: 'g1-small-b', order: 3,
            title: text('Majhen \\(b=\\tfrac14\\)', 'Small \\(b=\\tfrac14\\)'),
            purpose: text('Videti, kaj naredi \\(b<1\\).', 'Seeing what \\(b<1\\) does.'),
            explanation: text(
                'Pri \\(b=\\tfrac14\\) se izpeljana točka približa stiku: \\(q_1=(-2{,}125;\\ -2{,}75)\\). Smer tangente se ne spremeni, odvod desnega odseka pa je štirikrat manjši od odvoda levega. Krivulja je v stiku gladka, a se tam upočasni; \\(C^1\\) zlepek to ni več.',
                'At \\(b=\\tfrac14\\) the derived point moves closer to the joint: \\(q_1=(-2.125,\\ -2.75)\\). The tangent direction does not change, but the derivative of the right piece is four times smaller than that of the left. The curve is smooth at the joint but slows down there; it is no longer a \\(C^1\\) spline.',
            ),
            formulaIds: ['g1-construction'],
            frames: [frame('g1-small-b-explanation', 'explanation'), frame('g1-small-b-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj lego izpeljane točke z lego pri \\(b=1\\) in preveri, da je tangenta v stiku ista.', 'Compare the position of the derived point with that at \\(b=1\\) and check that the tangent at the joint is the same.'),
            expectedObservations: [text('Izpeljana točka je bližje stiku; premica \\(p_1p_2\\) je še vedno tangenta v stiku; razmerje odvodov je \\(\\tfrac14\\).', 'The derived point is closer to the joint; the line \\(p_1p_2\\) is still the tangent at the joint; the derivative ratio is \\(\\tfrac14\\).')],
            scene: {
                id: 'g1-b-quarter', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 0, value: 0.25}}, {name: 'show-spline-labels', value: true}],
                expectedState: text('Drsnik \\(b\\) pri prvem stiku je na \\(0{,}25\\), drugi je na \\(1\\).', 'The slider \\(b\\) at the first joint is at \\(0.25\\), the second is at \\(1\\).'),
            },
        },
        {
            id: 'g1-large-b', order: 4,
            title: text('Velik \\(b=\\tfrac52\\)', 'Large \\(b=\\tfrac52\\)'),
            purpose: text('Videti, kaj naredi \\(b>1\\).', 'Seeing what \\(b>1\\) does.'),
            explanation: text(
                'Pri \\(b=\\tfrac52\\) se izpeljana točka odmakne: \\(q_1=(1{,}25;\\ -5)\\). Odvod desnega odseka je \\(2{,}5\\)-krat večji od odvoda levega, tangenta pa je spet ista. Krivulja je gladka, a se v stiku pospeši. Povečanje \\(b\\) torej uravnava hitrost, ne smeri.',
                'At \\(b=\\tfrac52\\) the derived point moves away: \\(q_1=(1.25,\\ -5)\\). The derivative of the right piece is \\(2.5\\) times that of the left, and the tangent is again the same. The curve is smooth but speeds up at the joint. So increasing \\(b\\) controls speed, not direction.',
            ),
            formulaIds: ['g1-construction'],
            frames: [frame('g1-large-b-explanation', 'explanation'), frame('g1-large-b-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj drugi odsek z drugim odsekom pri \\(b=\\tfrac14\\) in \\(b=1\\).', 'Compare the second piece with the second piece at \\(b=\\tfrac14\\) and \\(b=1\\).'),
            expectedObservations: [text('Drugi odsek se zaobli proti izpeljani točki \\((1{,}25;\\ -5)\\), ki je precej pod ostalimi točkami; tangenta v stiku ostane na premici \\(p_1p_2\\).', 'The second piece bulges toward the derived point \\((1.25,\\ -5)\\), which is well below the other points; the tangent at the joint stays on the line \\(p_1p_2\\).')],
            scene: {
                id: 'g1-b-two-and-half', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 0, value: 2.5}}, {name: 'show-spline-labels', value: true}],
                expectedState: text('Drsnik \\(b\\) pri prvem stiku je na \\(2{,}5\\), drugi je na \\(1\\).', 'The slider \\(b\\) at the first joint is at \\(2.5\\), the second is at \\(1\\).'),
            },
        },
        {
            id: 'g1-chain', order: 5,
            title: text('Sprememba \\(b\\) se prenese naprej', 'A change of \\(b\\) propagates forward'),
            purpose: text('Pokazati, da enostranski \\(G^1\\) zlepek ni lokalen.', 'Showing that the one-sided \\(G^1\\) spline is not local.'),
            explanation: text(
                'Druga točka tretjega odseka se računa iz izpeljane točke drugega odseka, zato sprememba prvega \\(b\\) premakne tudi tretji odsek. Drugi stik ostane \\(C^1\\), ker je njegov \\(b\\) še vedno \\(1\\): razmerje odvodov je \\(b\\), ne glede na to, kako velik je odvod. \\(C^1\\) je torej le tam, kjer je \\(b=1\\).',
                'The second point of the third piece is computed from the derived point of the second piece, so changing the first \\(b\\) also moves the third piece. The second joint stays \\(C^1\\) because its \\(b\\) is still \\(1\\): the derivative ratio is \\(b\\), regardless of how large the derivative is. So the spline is \\(C^1\\) only where \\(b=1\\).',
            ),
            formulaIds: ['g1-construction'],
            frames: [frame('g1-chain-explanation', 'explanation'), frame('g1-chain-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Z drsnikom prvega stika spreminjaj \\(b\\) in opazuj tretji odsek.', 'Change \\(b\\) of the first joint with its slider and watch the third piece.'),
            expectedObservations: [text('Pri \\(b=\\tfrac14\\) je druga točka tretjega odseka \\((2{,}125;\\ 0{,}75)\\) namesto \\((1;\\ 1{,}5)\\); tretji odsek se spremeni, čeprav je drugi \\(b\\) nespremenjen.', 'At \\(b=\\tfrac14\\) the second point of the third piece is \\((2.125,\\ 0.75)\\) instead of \\((1,\\ 1.5)\\); the third piece changes although the second \\(b\\) is unchanged.')],
            scene: {
                id: 'g1-chain-quarter', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 0, value: 0.25}}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Prvi \\(b\\) je \\(0{,}25\\), drugi \\(1\\), kontrolni poligon je viden.', 'The first \\(b\\) is \\(0.25\\), the second \\(1\\), and the control polygon is visible.'),
            },
        },
    ],
    sources: [
        thesisSource('stampar-thesis-spline-g1', 'razdelek 4.1 (Definicija 4.2, pogoj (4.6), Slika 23, str. 22-23)',
            ['geometric continuity G^1', 'free parameter alpha_1 in the G^1 condition', 'effect of the parameter on the spline'],
            'The app parameter b equals 1 / alpha_1 of condition (4.6); with equal spans alpha_1 = beta_1 and the derivative ratio of the right to the left piece is b.'),
        farinSource('farin-cagd-spline-g1', ['geometric continuity', 'G^1 as collinear control points at the joint']),
        {
            id: 'bezeg-spline-g1-implementation',
            citation: 'Bezeg source: src/graphs/curves/spline/G1SplineGraph.tsx and src/bezeg/impl/curve/G1QuadraticBezierSpline.ts.',
            supports: ['derived second point of each later piece', 'slider b per joint', 'Label all points and Hide fixed points switches'],
            implementationCorrespondence: 'G1QuadraticBezierSpline starts every b at 1 and places the derived point at startingPoint + b * (startingPoint - previousPoint); the slider range is [0.01, 3].',
        },
    ],
    edgeCases: [
        text('Parameter \\(b\\) mora biti pozitiven: drsnik teče od \\(0{,}01\\) do \\(3\\). Pri \\(b\\le0\\) bi izpeljana točka padla v stik ali čez njega in tangenta bi se obrnila.', 'The parameter \\(b\\) must be positive: the slider runs from \\(0.01\\) to \\(3\\). At \\(b\\le0\\) the derived point would fall onto the joint or across it and the tangent would flip.'),
        text('Odvodi se razlikujejo za faktor \\(b\\) le, če so parametrski intervali enako dolgi; privzeti zlepek jih ima.', 'The derivatives differ by the factor \\(b\\) only if the parameter intervals have equal length; the default spline has them.'),
        text('Pri \\(b=\\tfrac52\\) je izpeljana točka \\((1{,}25;\\ -5)\\) nizko pod ostalimi točkami; pri smoke testu preveri, da je v pogledu.', 'At \\(b=\\tfrac52\\) the derived point \\((1.25,\\ -5)\\) is far below the other points; check in the smoke test that it is in view.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi povezavo \\(b=\\tfrac{1}{\\alpha_1}\\) z Sliko 23 (kjer je \\(\\beta_1<1\\) pri večjem \\(b\\)).', 'Before classroom-ready review, confirm the relation \\(b=\\tfrac{1}{\\alpha_1}\\) against Figure 23 (where \\(\\beta_1<1\\) goes with larger \\(b\\)).'),
    ],
};

// ---------------------------------------------------------------------------------------------
// spline-g1-symmetric
// ---------------------------------------------------------------------------------------------

const splineG1Symmetric: GuidedLesson = {
    demonstrationId: 'spline-g1-symmetric',
    title: text('Simetrični G¹ zlepek', 'Symmetric G¹ spline'),
    summary: text(
        'Algoritem 6 namesto sredine stranice vzame poljubno točko na njej: \\(J_l=(1-\\beta_l)p_l+\\beta_lp_{l+1}\\) z \\(\\beta_l\\) med \\(0\\) in \\(1\\). Tangenta v stični točki je zvezna pri vsakem \\(\\beta_l\\), odvoda pa se ujemata le pri \\(\\beta_l=\\tfrac12\\); premik stika spremeni le sosednja odseka.',
        'Algorithm 6 takes an arbitrary point of the edge instead of its midpoint: \\(J_l=(1-\\beta_l)p_l+\\beta_lp_{l+1}\\) with \\(\\beta_l\\) between \\(0\\) and \\(1\\). The tangent at the joint is continuous for every \\(\\beta_l\\), the derivatives agree only for \\(\\beta_l=\\tfrac12\\), and moving a joint changes only the two neighbouring pieces.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje simetričnega \\(C^1\\) zlepka.', 'Assumes familiarity with the symmetric \\(C^1\\) spline.'),
        text('Priporočeno je, da poznaš \\(G^1\\) zveznost iz enostranskega zlepka.', 'It helps to know \\(G^1\\) continuity from the one-sided spline.'),
    ],
    learningGoals: [
        text('Izračunaš stično točko \\(J_l\\) za dani \\(\\beta_l\\) in poveš, da \\(\\beta_l=\\tfrac12\\) da razpolovišče.', 'Compute the joint \\(J_l\\) for a given \\(\\beta_l\\) and state that \\(\\beta_l=\\tfrac12\\) gives the midpoint.'),
        text('Pojasniš, da je smer tangente zvezna pri vsakem \\(\\beta_l\\), razmerje odvodov pa je \\(\\tfrac{1-\\beta_l}{\\beta_l}\\).', 'Explain that the tangent direction is continuous for every \\(\\beta_l\\) and that the derivative ratio is \\(\\tfrac{1-\\beta_l}{\\beta_l}\\).'),
        text('Preveriš, da sprememba enega \\(\\beta_l\\) spremeni le dva sosednja odseka.', 'Check that changing one \\(\\beta_l\\) changes only the two neighbouring pieces.'),
    ],
    formulaBlocks: [
        {
            id: 'g1s-junction',
            latex: 'J_l=(1-\\beta_l)\\,p_l+\\beta_l\\,p_{l+1},\\qquad 0<\\beta_l<1',
            notation: text(
                'Točki \\(p_l\\) in \\(p_{l+1}\\) sta sosednji prosti točki, \\(\\beta_l\\) pa je prost parameter stika (Algoritem 6).',
                'The points \\(p_l\\) and \\(p_{l+1}\\) are neighbouring free points and \\(\\beta_l\\) is the free parameter of the joint (Algorithm 6).',
            ),
            explanation: text(
                'Točka \\(J_l\\) leži na stranici \\(p_lp_{l+1}\\) in je od \\(p_l\\) oddaljena \\(\\beta_l\\)-kratnik dolžine stranice; pri \\(\\beta_l=\\tfrac12\\) je razpolovišče, kot pri \\(C^1\\) zlepku.',
                'The point \\(J_l\\) lies on the edge \\(p_lp_{l+1}\\) at \\(\\beta_l\\) times the edge length from \\(p_l\\); for \\(\\beta_l=\\tfrac12\\) it is the midpoint, as in the \\(C^1\\) spline.',
            ),
        },
        {
            id: 'g1s-ratio',
            latex: 'J_l-p_l=\\beta_l\\,(p_{l+1}-p_l),\\qquad p_{l+1}-J_l=(1-\\beta_l)(p_{l+1}-p_l),\\qquad \\frac{\\lVert p_{l+1}-J_l\\rVert}{\\lVert J_l-p_l\\rVert}=\\frac{1-\\beta_l}{\\beta_l}',
            notation: text(
                'Obe razliki sta vzporedni z \\(p_{l+1}-p_l\\), zato je smer tangente v stiku vzdolž stranice poligona.',
                'Both differences are parallel to \\(p_{l+1}-p_l\\), so the tangent direction at the joint is along the polygon edge.',
            ),
            explanation: text(
                'Pri enakih parametrskih intervalih je to razmerje odvodov desnega in levega odseka v stiku. Enako je \\(1\\) le pri \\(\\beta_l=\\tfrac12\\), takrat je zlepek \\(C^1\\). V enostranski \\(G^1\\) lekciji to ustreza \\(b=\\tfrac{1-\\beta_l}{\\beta_l}\\).',
                'With equal parameter intervals this is the ratio of the derivatives of the right and left piece at the joint. It equals \\(1\\) only for \\(\\beta_l=\\tfrac12\\), when the spline is \\(C^1\\). In the one-sided \\(G^1\\) lesson this corresponds to \\(b=\\tfrac{1-\\beta_l}{\\beta_l}\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'g1s-first-junction',
            title: text('Primer: \\(\\beta_1=\\tfrac14\\), prva stična točka', 'Example: \\(\\beta_1=\\tfrac14\\), the first joint'),
            calculationLatex: 'J_1=(1-\\tfrac14)\\,p_1+\\tfrac14\\,p_2=\\tfrac34(-4,-3)+\\tfrac14(-1,-3)',
            resultLatex: 'J_1=\\bigl(-\\tfrac{13}{4},-3\\bigr),\\qquad J_1-p_1=\\bigl(\\tfrac34,0\\bigr)',
            check: text(
                'Stična točka je \\((-3{,}25;\\ -3)\\), na četrtini poti od \\(p_1\\) do \\(p_2\\); pri \\(\\beta_1=\\tfrac12\\) bi bila \\((-2{,}5;\\ -3)\\).',
                'The joint is \\((-3.25,\\ -3)\\), a quarter of the way from \\(p_1\\) to \\(p_2\\); at \\(\\beta_1=\\tfrac12\\) it would be \\((-2.5,\\ -3)\\).',
            ),
        },
        {
            id: 'g1s-ratio-example',
            title: text('Primer: \\(\\beta_1=\\tfrac34\\), razmerje odvodov', 'Example: \\(\\beta_1=\\tfrac34\\), the derivative ratio'),
            calculationLatex: 'J_1-p_1=\\tfrac34(p_2-p_1)=\\bigl(\\tfrac94,0\\bigr),\\qquad p_2-J_1=\\tfrac14(p_2-p_1)=\\bigl(\\tfrac34,0\\bigr)',
            resultLatex: '\\frac{\\lVert p_2-J_1\\rVert}{\\lVert J_1-p_1\\rVert}=\\frac{1-\\beta_1}{\\beta_1}=\\tfrac13',
            check: text(
                'Obe razliki kažeta vzdolž osi \\(x\\), zato je tangenta v stiku zvezna; desni odvod je trikrat manjši od levega, zato zlepek ni \\(C^1\\).',
                'Both differences point along the \\(x\\)-axis, so the tangent at the joint is continuous; the right derivative is three times smaller than the left one, so the spline is not \\(C^1\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'g1s-midpoint', order: 1,
            title: text('Začetek: \\(\\beta=\\tfrac12\\)', 'The start: \\(\\beta=\\tfrac12\\)'),
            purpose: text('Povezati privzeti zlepek s simetričnim \\(C^1\\) zlepkom.', 'Linking the default spline to the symmetric \\(C^1\\) spline.'),
            explanation: text(
                'Privzeti zlepek ima \\(6\\) prostih točk in \\(4\\) kvadratne odseke; vsi trije \\(\\beta_l\\) so na \\(\\tfrac12\\). Stične točke so razpolovišča stranic \\(p_1p_2\\), \\(p_2p_3\\), \\(p_3p_4\\) in zlepek je enak simetričnemu \\(C^1\\) zlepku z istimi točkami.',
                'The default spline has \\(6\\) free points and \\(4\\) quadratic pieces; all three \\(\\beta_l\\) are at \\(\\tfrac12\\). The joints are the midpoints of the edges \\(p_1p_2\\), \\(p_2p_3\\), \\(p_3p_4\\) and the spline equals the symmetric \\(C^1\\) spline with the same points.',
            ),
            formulaIds: ['g1s-junction'],
            frames: [frame('g1s-midpoint-explanation', 'explanation'), frame('g1s-midpoint-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preveri, da so stične točke na sredini stranic kontrolnega poligona.', 'Check that the joints are at the middle of the edges of the control polygon.'),
            expectedObservations: [text('Stične točke so \\((-2{,}5;\\ -3)\\), \\((-1;\\ 0)\\) in \\((1;\\ 3)\\), tri drsniki so na \\(0{,}5\\).', 'The joints are \\((-2.5,\\ -3)\\), \\((-1,\\ 0)\\) and \\((1,\\ 3)\\), and the three sliders are at \\(0.5\\).')],
            scene: {
                id: 'g1s-default-polygon', basedOn: 'demonstration-default',
                actions: [{name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Privzeti zlepek z oznakami in kontrolnim poligonom, vsi \\(\\beta_l=0{,}5\\).', 'The default spline with labels and the control polygon, all \\(\\beta_l=0.5\\).'),
            },
        },
        {
            id: 'g1s-quarter', order: 2,
            title: text('Stik drsi: \\(\\beta_1=\\tfrac14\\)', 'The joint slides: \\(\\beta_1=\\tfrac14\\)'),
            purpose: text('Izračunati nov položaj stične točke.', 'Computing the new position of the joint.'),
            explanation: text(
                'Pri \\(\\beta_1=\\tfrac14\\) se prva stična točka premakne po stranici proti \\(p_1\\): \\(J_1=\\tfrac34p_1+\\tfrac14p_2=(-3{,}25;\\ -3)\\). Slika 29 diplomskega dela kaže isto za \\(\\beta_1=0{,}25\\) in \\(\\beta_1=0{,}75\\). Krivulja ostane gladka, spremeni pa se oblika prvih dveh odsekov.',
                'At \\(\\beta_1=\\tfrac14\\) the first joint slides along the edge toward \\(p_1\\): \\(J_1=\\tfrac34p_1+\\tfrac14p_2=(-3.25,\\ -3)\\). Figure 29 of the thesis shows the same for \\(\\beta_1=0.25\\) and \\(\\beta_1=0.75\\). The curve stays smooth, but the shape of the first two pieces changes.',
            ),
            formulaIds: ['g1s-junction'],
            frames: [frame('g1s-quarter-explanation', 'explanation'), frame('g1s-quarter-calculation', 'calculation'), frame('g1s-quarter-observation', 'observation')],
            workedExampleId: 'g1s-first-junction',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj lego prve stične točke z lego pri \\(\\beta_1=\\tfrac12\\) in preveri, da je še na stranici \\(p_1p_2\\).', 'Compare the position of the first joint with that at \\(\\beta_1=\\tfrac12\\) and check that it is still on the edge \\(p_1p_2\\).'),
            expectedObservations: [text('Prva stična točka je \\((-3{,}25;\\ -3)\\), bliže \\(p_1\\); druga in tretja sta nespremenjeni.', 'The first joint is \\((-3.25,\\ -3)\\), closer to \\(p_1\\); the second and third are unchanged.')],
            scene: {
                id: 'g1s-beta-quarter', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 0, value: 0.25}}, {name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Prvi \\(\\beta\\) je \\(0{,}25\\), drugi in tretji \\(0{,}5\\).', 'The first \\(\\beta\\) is \\(0.25\\), the second and third \\(0.5\\).'),
            },
        },
        {
            id: 'g1s-tangent', order: 3,
            title: text('Tangenta je zvezna: \\(\\beta_1=\\tfrac34\\)', 'The tangent is continuous: \\(\\beta_1=\\tfrac34\\)'),
            purpose: text('Pokazati, da smer tangente ostane zvezna, razmerje odvodov pa ne.', 'Showing that the tangent direction stays continuous while the derivative ratio does not.'),
            explanation: text(
                'Pri \\(\\beta_1=\\tfrac34\\) je \\(J_1=(-1{,}75;\\ -3)\\). Obe daljici \\(p_1J_1\\) in \\(J_1p_2\\) ležita na stranici \\(p_1p_2\\), zato je smer tangente v stiku zvezna pri vsakem \\(\\beta_1\\). Razmerje njunih dolžin je \\(\\tfrac{1-\\beta_1}{\\beta_1}=\\tfrac13\\), zato je zlepek v tem stiku \\(G^1\\), ne pa \\(C^1\\).',
                'At \\(\\beta_1=\\tfrac34\\) we have \\(J_1=(-1.75,\\ -3)\\). Both segments \\(p_1J_1\\) and \\(J_1p_2\\) lie on the edge \\(p_1p_2\\), so the tangent direction at the joint is continuous for every \\(\\beta_1\\). The ratio of their lengths is \\(\\tfrac{1-\\beta_1}{\\beta_1}=\\tfrac13\\), so the spline is \\(G^1\\) but not \\(C^1\\) at this joint.',
            ),
            formulaIds: ['g1s-ratio'],
            frames: [frame('g1s-tangent-explanation', 'explanation'), frame('g1s-tangent-calculation', 'calculation'), frame('g1s-tangent-observation', 'observation')],
            workedExampleId: 'g1s-ratio-example',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Preveri, da se krivulja v prvem stiku ne zlomi in da se dotika stranice \\(p_1p_2\\).', 'Check that the curve does not break at the first joint and that it touches the edge \\(p_1p_2\\).'),
            expectedObservations: [text('Prva stična točka je \\((-1{,}75;\\ -3)\\), blizu \\(p_2\\); krivulja je gladka in se dotika stranice \\(p_1p_2\\).', 'The first joint is \\((-1.75,\\ -3)\\), near \\(p_2\\); the curve is smooth and touches the edge \\(p_1p_2\\).')],
            scene: {
                id: 'g1s-beta-three-quarters', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 0, value: 0.75}}, {name: 'show-spline-labels', value: true}, {name: 'show-control-polygon', value: true}],
                expectedState: text('Prvi \\(\\beta\\) je \\(0{,}75\\), drugi in tretji \\(0{,}5\\).', 'The first \\(\\beta\\) is \\(0.75\\), the second and third \\(0.5\\).'),
            },
        },
        {
            id: 'g1s-neighbours', order: 4,
            title: text('Spremenita se le sosednja odseka', 'Only the neighbouring pieces change'),
            purpose: text('Pokazati lokalnost stika.', 'Showing the locality of a joint.'),
            explanation: text(
                'Stik \\(J_2\\) pripada drugemu in tretjemu odseku; pri \\(\\beta_2=\\tfrac34\\) se premakne iz \\((-1;\\ 0)\\) v \\((-1;\\ 1{,}5)\\) po stranici \\(p_2p_3\\). Prvi in četrti odsek se ne spremenita, saj ne vsebujeta točke \\(J_2\\).',
                'The joint \\(J_2\\) belongs to the second and third pieces; at \\(\\beta_2=\\tfrac34\\) it moves from \\((-1,\\ 0)\\) to \\((-1,\\ 1.5)\\) along the edge \\(p_2p_3\\). The first and fourth pieces do not change because they do not contain \\(J_2\\).',
            ),
            formulaIds: ['g1s-junction'],
            frames: [frame('g1s-neighbours-explanation', 'explanation'), frame('g1s-neighbours-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Z drugim drsnikom premikaj \\(\\beta_2\\) in opazuj, kateri odseki se spremenijo.', 'Move \\(\\beta_2\\) with the second slider and watch which pieces change.'),
            expectedObservations: [text('Spremenita se drugi in tretji odsek, prvi in četrti ostaneta; stik je \\((-1;\\ 1{,}5)\\).', 'The second and third pieces change, the first and fourth stay; the joint is \\((-1,\\ 1.5)\\).')],
            scene: {
                id: 'g1s-second-beta', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 1, value: 0.75}}, {name: 'show-spline-labels', value: true}],
                expectedState: text('Drugi \\(\\beta\\) je \\(0{,}75\\), prvi in tretji \\(0{,}5\\).', 'The second \\(\\beta\\) is \\(0.75\\), the first and third \\(0.5\\).'),
            },
        },
        {
            id: 'g1s-extreme', order: 5,
            title: text('Skrajni \\(\\beta\\)', 'Extreme \\(\\beta\\)'),
            purpose: text('Videti, zakaj mora biti \\(\\beta\\) strogo med \\(0\\) in \\(1\\).', 'Seeing why \\(\\beta\\) must lie strictly between \\(0\\) and \\(1\\).'),
            explanation: text(
                'Pri \\(\\beta_1=0{,}99\\) je \\(J_1=(-1{,}03;\\ -3)\\), skoraj v \\(p_2\\), razmerje odvodov pa je \\(\\tfrac{0{,}01}{0{,}99}\\approx0{,}01\\): desni odsek se v stiku začne skoraj stoječ. Pri \\(\\beta_1=1\\) bi \\(J_1\\) padel v \\(p_2\\) in smer tangente ne bi bila več določena, zato je drsnik omejen na \\([0{,}01;\\ 0{,}99]\\).',
                'At \\(\\beta_1=0.99\\) we have \\(J_1=(-1.03,\\ -3)\\), almost at \\(p_2\\), and the derivative ratio is \\(\\tfrac{0.01}{0.99}\\approx0.01\\): the right piece starts almost standing still at the joint. At \\(\\beta_1=1\\) the point \\(J_1\\) would fall onto \\(p_2\\) and the tangent direction would no longer be determined, so the slider is limited to \\([0.01,\\ 0.99]\\).',
            ),
            formulaIds: ['g1s-ratio'],
            frames: [frame('g1s-extreme-explanation', 'explanation'), frame('g1s-extreme-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Povleci prvi drsnik do konca in preveri, kje je stična točka.', 'Drag the first slider to the end and check where the joint is.'),
            expectedObservations: [text('Prva stična točka je blizu \\(p_2\\), pri \\((-1{,}03;\\ -3)\\); drsnik se ustavi pri \\(0{,}99\\).', 'The first joint is near \\(p_2\\), at \\((-1.03,\\ -3)\\); the slider stops at \\(0.99\\).')],
            scene: {
                id: 'g1s-beta-upper-limit', basedOn: 'demonstration-default',
                actions: [{name: 'set-spline-beta', value: {index: 0, value: 0.99}}, {name: 'show-spline-labels', value: true}],
                expectedState: text('Prvi \\(\\beta\\) je \\(0{,}99\\), drugi in tretji \\(0{,}5\\).', 'The first \\(\\beta\\) is \\(0.99\\), the second and third \\(0.5\\).'),
            },
        },
    ],
    sources: [
        thesisSource('stampar-thesis-spline-g1-symmetric', 'razdelek 4.2.2 (Algoritem 6, Slika 29, str. 25-28) in razdelek 4.1 (pogoj (4.6), str. 23)',
            ['symmetric construction of a quadratic G^1 spline', 'junction points on polygon edges with free beta_l', 'effect of beta on the spline'],
            'Route points p0..p5 are the thesis p_0..p_m; the junction J_l = (1 - beta_l) p_l + beta_l p_{l+1} with beta starting at 1/2.'),
        farinSource('farin-cagd-spline-g1-symmetric', ['geometric continuity of piecewise quadratics', 'tangent continuity at a joint on a polygon edge']),
        {
            id: 'bezeg-spline-g1-symmetric-implementation',
            citation: 'Bezeg source: src/graphs/curves/spline/G1SymmetricSplineGraph.tsx and src/bezeg/impl/curve/G1SymmetricQuadraticBezierSpline.ts.',
            supports: ['slider beta per joint', 'derived junction points', 'Label all points and Hide fixed points switches'],
            implementationCorrespondence: 'G1SymmetricQuadraticBezierSpline stores b[j] = 0.5 and places the junction at (1 - b[j]) points[l-1] + b[j] points[l]; the slider range is [0.01, 0.99].',
        },
    ],
    edgeCases: [
        text('Parameter \\(\\beta_l\\) mora biti strogo med \\(0\\) in \\(1\\): drsnik teče od \\(0{,}01\\) do \\(0{,}99\\).', 'The parameter \\(\\beta_l\\) must lie strictly between \\(0\\) and \\(1\\): the slider runs from \\(0.01\\) to \\(0.99\\).'),
        text('Razmerje odvodov \\(\\tfrac{1-\\beta_l}{\\beta_l}\\) velja za enake parametrske intervale, ki jih ima privzeti zlepek.', 'The derivative ratio \\(\\tfrac{1-\\beta_l}{\\beta_l}\\) holds for equal parameter intervals, which the default spline has.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi, ali naj lekcija razmerje \\(\\tfrac{1-\\beta_l}{\\beta_l}\\) poveže z \\(b\\) iz enostranske \\(G^1\\) lekcije ali ostane pri neposredni geometrijski razlagi.', 'Before classroom-ready review, confirm whether the lesson should link the ratio \\(\\tfrac{1-\\beta_l}{\\beta_l}\\) to \\(b\\) from the one-sided \\(G^1\\) lesson or stay with the direct geometric explanation.'),
    ],
};

// ---------------------------------------------------------------------------------------------
// spline-parameterization
// ---------------------------------------------------------------------------------------------

const splineParameterization: GuidedLesson = {
    demonstrationId: 'spline-parameterization',
    title: text('α-parametrizacije zlepka', 'α-parameterizations of a spline'),
    summary: text(
        'Razmike stičnih parametrov zlepka izberemo kot \\(\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha}\\). Vrednosti \\(\\alpha=0\\), \\(\\tfrac12\\) in \\(1\\) dajo enakomerno, centripetalno in tetivno parametrizacijo; \\(\\alpha\\) spremeni obliko zlepka in razporeditev točk, izračunanih pri enakih korakih parametra.',
        'The spacing of the joint parameters of a spline is chosen as \\(\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha}\\). The values \\(\\alpha=0\\), \\(\\tfrac12\\) and \\(1\\) give the uniform, centripetal and chordal parameterization; \\(\\alpha\\) changes the shape of the spline and the distribution of points computed at equal parameter steps.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje simetričnega \\(C^2\\) zlepka.', 'Assumes familiarity with the symmetric \\(C^2\\) spline.'),
        text('Priporočeno je, da poznaš uteženo parametrizacijo z \\(\\alpha\\) pri Bézierjevi krivulji.', 'It helps to know the weighted parameterization with \\(\\alpha\\) of a Bézier curve.'),
    ],
    learningGoals: [
        text('Zapišeš \\(\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha}\\) in izračunaš razmike za \\(\\alpha=0\\) in \\(\\alpha=1\\).', 'Write \\(\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha}\\) and compute the spacings for \\(\\alpha=0\\) and \\(\\alpha=1\\).'),
        text('Poveš, da \\(\\alpha\\) premakne izpeljane stične točke in s tem spremeni obliko zlepka, kontrolne točke pa ostanejo.', 'State that \\(\\alpha\\) moves the derived joints and thereby changes the shape of the spline while the control points stay.'),
        text('Primerjaš, kako enakomerno so razporejene točke pri enakih korakih parametra za različne \\(\\alpha\\).', 'Compare how evenly the points computed at equal parameter steps are distributed for different \\(\\alpha\\).'),
    ],
    formulaBlocks: [
        {
            id: 'sp-spans',
            latex: '\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha},\\qquad \\alpha\\in[0,1],\\qquad u_{i+1}=u_i+\\Delta u_i',
            notation: text(
                'Vektorji \\(\\Delta p_i\\) so razlike zaporednih kontrolnih točk, \\(u_i\\) pa stični parametri, ki jih na koncu delimo z \\(u_m\\), da je zlepek na intervalu \\([0,1]\\).',
                'The vectors \\(\\Delta p_i\\) are the differences of consecutive control points and the \\(u_i\\) are the joint parameters, finally divided by \\(u_m\\) so the spline lives on the interval \\([0,1]\\).',
            ),
            explanation: text(
                'Pri \\(\\alpha=0\\) so vsi razmiki \\(1\\) (enakomerna), pri \\(\\alpha=\\tfrac12\\) koreni dolžin (centripetalna), pri \\(\\alpha=1\\) dolžine tetiv (tetivna). Prvi in zadnji razmik upoštevata točki \\(p_{-1}\\) in \\(p_{m+1}\\).',
                'For \\(\\alpha=0\\) all spacings are \\(1\\) (uniform), for \\(\\alpha=\\tfrac12\\) the square roots of the lengths (centripetal), for \\(\\alpha=1\\) the chord lengths (chordal). The first and last spacings use the points \\(p_{-1}\\) and \\(p_{m+1}\\).',
            ),
        },
        {
            id: 'sp-samples',
            latex: 't_k=\\frac{k}{N+1},\\qquad k=1,\\dots,N,\\qquad S(t_1),\\dots,S(t_N)',
            notation: text(
                'Število točk \\(N\\) je na drsniku Število točk; \\(S(t)\\) je zlepek, \\(t_k\\) pa enakomerni koraki celotnega parametra.',
                'The number of points \\(N\\) is on the Number of points slider; \\(S(t)\\) is the spline and the \\(t_k\\) are equal steps of the global parameter.',
            ),
            explanation: text(
                'Točke \\(S(t_k)\\) so enakomerne po parametru, ne po loku. Odsek z večjim razmikom \\(\\Delta u_i\\) dobi več točk.',
                'The points \\(S(t_k)\\) are equally spaced in the parameter, not in arc. A piece with a larger spacing \\(\\Delta u_i\\) receives more points.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'sp-spacing-example',
            title: text('Primer: najkrajša in najdaljša tetiva', 'Example: the shortest and the longest chord'),
            calculationLatex: '\\lVert p_5-p_6\\rVert=\\sqrt{\\tfrac52}\\approx1.581,\\qquad \\lVert p_6-p_8\\rVert=\\sqrt{\\tfrac{261}{4}}\\approx8.078,\\qquad \\sum_i\\lVert\\Delta p_i\\rVert\\approx19.380',
            resultLatex: '\\alpha=0:\\ \\tfrac16,\\dots,\\tfrac16;\\qquad \\alpha=1:\\ \\tfrac{1.581}{19.380}\\approx0.082,\\ \\ \\tfrac{8.078}{19.380}\\approx0.417',
            check: text(
                'Pri \\(\\alpha=0\\) vsak od \\(6\\) odsekov dobi \\(\\tfrac16\\) parametra; pri \\(\\alpha=1\\) dobi najkrajša tetiva \\(0{,}082\\), najdaljša pa \\(0{,}417\\) parametra.',
                'At \\(\\alpha=0\\) each of the \\(6\\) pieces gets \\(\\tfrac16\\) of the parameter; at \\(\\alpha=1\\) the shortest chord gets \\(0.082\\) and the longest \\(0.417\\) of it.',
            ),
        },
        {
            id: 'sp-junction-example',
            title: text('Primer: prva stična točka pri različnih \\(\\alpha\\)', 'Example: the first joint for different \\(\\alpha\\)'),
            calculationLatex: 'J_1(0)\\approx(-1.825,\\,-0.533),\\quad J_1(\\tfrac12)\\approx(-2.273,\\,-0.691),\\quad J_1(1)\\approx(-2.703,\\,-0.810)',
            resultLatex: '\\lVert J_1(1)-J_1(0)\\rVert\\approx0.92',
            check: text(
                'Točka \\(J_1\\) se pri \\(\\alpha\\) od \\(0\\) do \\(1\\) premakne za približno \\(0{,}92\\) enote, čeprav se nobena prosta točka ni premaknila.',
                'The point \\(J_1\\) moves by about \\(0.92\\) units as \\(\\alpha\\) goes from \\(0\\) to \\(1\\), although no free point has moved.',
            ),
        },
    ],
    steps: [
        {
            id: 'sp-default', order: 1,
            title: text('Zlepek, točke in \\(\\alpha\\)', 'The spline, the points and \\(\\alpha\\)'),
            purpose: text('Spoznati zlepek, vzorčne točke in drsnik \\(\\alpha\\).', 'Meeting the spline, the sample points and the \\(\\alpha\\) slider.'),
            explanation: text(
                'Privzeti simetrični \\(C^2\\) zlepek ima \\(9\\) prostih točk in \\(6\\) odsekov. Na njem je \\(25\\) vzorčnih točk pri enakih korakih \\(t_k=\\tfrac{k}{26}\\) in \\(\\alpha=\\tfrac12\\) (centripetalna parametrizacija). Izpeljane stične točke so privzeto skrite.',
                'The default symmetric \\(C^2\\) spline has \\(9\\) free points and \\(6\\) pieces. It carries \\(25\\) sample points at equal steps \\(t_k=\\tfrac{k}{26}\\) and \\(\\alpha=\\tfrac12\\) (the centripetal parameterization). The derived joints are hidden by default.',
            ),
            formulaIds: ['sp-samples'],
            frames: [frame('sp-default-explanation', 'explanation'), frame('sp-default-observation', 'observation')],
            learnerInteraction: 'observe',
            observationPrompt: text('Preštej vzorčne točke in primerjaj njihove razmike: so povsod enaki?', 'Count the sample points and compare their gaps: are they equal everywhere?'),
            expectedObservations: [text('Vzorčnih točk je \\(25\\); najdaljši razmik je približno \\(3{,}5\\)-krat daljši od najkrajšega.', 'There are \\(25\\) sample points; the longest gap is about \\(3.5\\) times the shortest.')],
            scene: {
                id: 'sp-default-scene', basedOn: 'demonstration-default',
                actions: [{name: 'set-parameterization-alpha', value: 0.5}, {name: 'set-parameterization-samples', value: 25}],
                expectedState: text('\\(\\alpha=\\tfrac12\\) in \\(25\\) vzorčnih točk, stične točke skrite.', '\\(\\alpha=\\tfrac12\\) and \\(25\\) sample points, joints hidden.'),
            },
        },
        {
            id: 'sp-rule', order: 2,
            title: text('Pravilo \\(\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha}\\)', 'The rule \\(\\Delta u_i=\\lVert\\Delta p_i\\rVert^{\\alpha}\\)'),
            purpose: text('Izračunati razmike stičnih parametrov.', 'Computing the spacings of the joint parameters.'),
            explanation: text(
                'Razmik \\(\\Delta u_i\\) je dolžina razlike zaporednih kontrolnih točk na potenco \\(\\alpha\\) (razdelek 4.2.3). Najkrajša tetiva je \\(\\lVert p_5-p_6\\rVert\\approx1{,}581\\), najdaljša \\(\\lVert p_6-p_8\\rVert\\approx8{,}078\\). Pri \\(\\alpha=0\\) vsak odsek dobi \\(\\tfrac16\\) parametra, pri \\(\\alpha=1\\) pa \\(0{,}082\\) oziroma \\(0{,}417\\).',
                'The spacing \\(\\Delta u_i\\) is the length of the difference of consecutive control points raised to the power \\(\\alpha\\) (section 4.2.3). The shortest chord is \\(\\lVert p_5-p_6\\rVert\\approx1.581\\) and the longest \\(\\lVert p_6-p_8\\rVert\\approx8.078\\). At \\(\\alpha=0\\) every piece gets \\(\\tfrac16\\) of the parameter, at \\(\\alpha=1\\) it gets \\(0.082\\) and \\(0.417\\).',
            ),
            formulaIds: ['sp-spans'],
            frames: [frame('sp-rule-explanation', 'explanation'), frame('sp-rule-calculation', 'calculation'), frame('sp-rule-observation', 'observation')],
            workedExampleId: 'sp-spacing-example',
            learnerInteraction: 'observe',
            observationPrompt: text('S stikalom Skrij fiksne točke pokaži stične točke in poišči najdaljši odsek.', 'Show the joints with the Hide fixed points switch and find the longest piece.'),
            expectedObservations: [text('Zadnji odsek je najdaljši: ima tetivo \\(\\lVert p_6-p_8\\rVert\\approx8{,}078\\) in zlepek ima pet stičnih točk.', 'The last piece is the longest: its chord is \\(\\lVert p_6-p_8\\rVert\\approx8.078\\) and the spline has five joints.')],
            scene: {
                id: 'sp-rule-joints', basedOn: 'demonstration-default',
                actions: [{name: 'hide-spline-fixed-points', value: false}],
                expectedState: text('Privzeti zlepek z vidnimi izpeljanimi točkami.', 'The default spline with the derived points visible.'),
            },
        },
        {
            id: 'sp-uniform', order: 3,
            title: text('Enakomerna: \\(\\alpha=0\\)', 'Uniform: \\(\\alpha=0\\)'),
            purpose: text('Videti zlepek z enakimi razmiki parametra.', 'Seeing the spline with equal parameter spacings.'),
            explanation: text(
                'Pri \\(\\alpha=0\\) imajo vsi odseki enak parametrski interval, zato dobi vsak od njih približno enako število vzorčnih točk (\\(4,4,4,5,4,4\\) od \\(25\\)). Prva stična točka je \\(J_1\\approx(-1{,}825;\\ -0{,}533)\\). Vzorci pa niso enakomerno razporejeni po krivulji: kratki odseki so gosto posejani, dolgi redko.',
                'At \\(\\alpha=0\\) all pieces have the same parameter interval, so each gets about the same number of sample points (\\(4,4,4,5,4,4\\) out of \\(25\\)). The first joint is \\(J_1\\approx(-1.825,\\ -0.533)\\). The samples are not evenly spread along the curve, though: short pieces are densely sown, long ones sparsely.',
            ),
            formulaIds: ['sp-samples'],
            frames: [frame('sp-uniform-explanation', 'explanation'), frame('sp-uniform-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj razmike med vzorčnimi točkami na kratkem in na dolgem odseku.', 'Compare the gaps between sample points on a short and on a long piece.'),
            expectedObservations: [text('Največji razmik je približno \\(5{,}7\\)-krat daljši od najmanjšega.', 'The largest gap is about \\(5.7\\) times the smallest.')],
            scene: {
                id: 'sp-alpha-zero', basedOn: 'demonstration-default',
                actions: [{name: 'set-parameterization-alpha', value: 0}, {name: 'hide-spline-fixed-points', value: false}],
                expectedState: text('\\(\\alpha=0\\), \\(25\\) vzorčnih točk, stične točke vidne.', '\\(\\alpha=0\\), \\(25\\) sample points, joints visible.'),
            },
        },
        {
            id: 'sp-chordal', order: 4,
            title: text('Tetivna: \\(\\alpha=1\\)', 'Chordal: \\(\\alpha=1\\)'),
            purpose: text('Videti, da \\(\\alpha\\) spremeni obliko in razporeditev točk.', 'Seeing that \\(\\alpha\\) changes the shape and the distribution of points.'),
            explanation: text(
                'Pri \\(\\alpha=1\\) je parametrski interval odseka sorazmeren z dolžino njegove tetive. Izpeljane stične točke se premaknejo (\\(J_1\\approx(-2{,}703;\\ -0{,}810)\\)), zato se spremeni tudi oblika zlepka. Dolgi zadnji odsek dobi \\(10\\) od \\(25\\) vzorčnih točk, razporeditev (\\(2,5,3,3,2,10\\)) pa je po krivulji enakomernejša.',
                'At \\(\\alpha=1\\) the parameter interval of a piece is proportional to the length of its chord. The derived joints move (\\(J_1\\approx(-2.703,\\ -0.810)\\)), so the shape of the spline changes too. The long last piece gets \\(10\\) of the \\(25\\) sample points, and the distribution (\\(2,5,3,3,2,10\\)) is more even along the curve.',
            ),
            formulaIds: ['sp-spans'],
            frames: [frame('sp-chordal-explanation', 'explanation'), frame('sp-chordal-calculation', 'calculation'), frame('sp-chordal-observation', 'observation')],
            workedExampleId: 'sp-junction-example',
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Primerjaj lego prve stične točke z lego pri \\(\\alpha=0\\) in razmike vzorcev na zadnjem odseku.', 'Compare the position of the first joint with that at \\(\\alpha=0\\) and the gaps of the samples on the last piece.'),
            expectedObservations: [text('Stična točka je pomaknjena za približno \\(0{,}92\\) enote, krivulja je drugačna; največji razmik med vzorci je le približno \\(2{,}6\\)-krat daljši od najmanjšega.', 'The joint has moved by about \\(0.92\\) units, the curve is different; the largest gap between samples is only about \\(2.6\\) times the smallest.')],
            scene: {
                id: 'sp-alpha-one', basedOn: 'demonstration-default',
                actions: [{name: 'set-parameterization-alpha', value: 1}, {name: 'hide-spline-fixed-points', value: false}],
                expectedState: text('\\(\\alpha=1\\), \\(25\\) vzorčnih točk, stične točke vidne.', '\\(\\alpha=1\\), \\(25\\) sample points, joints visible.'),
            },
        },
        {
            id: 'sp-compare', order: 5,
            title: text('Primerjava in redkejši vzorci', 'Comparison and sparser samples'),
            purpose: text('Povezati \\(\\alpha\\) z enakomernostjo vzorcev.', 'Linking \\(\\alpha\\) to the evenness of the samples.'),
            explanation: text(
                'Pri \\(25\\) vzorcih je razmerje največjega in najmanjšega razmika \\(5{,}7\\) pri \\(\\alpha=0\\), \\(3{,}5\\) pri \\(\\alpha=\\tfrac12\\) in \\(2{,}6\\) pri \\(\\alpha=1\\): večji \\(\\alpha\\) da bolj enakomerno razporeditev. S \\(10\\) vzorci so razmiki lažje vidni; pri \\(\\alpha=1\\) je razmerje \\(2{,}1\\) (pri \\(\\alpha=0\\) \\(3{,}8\\)). Razmik merimo v ravni črti med zaporednima vzorcema, ne po loku.',
                'With \\(25\\) samples the ratio of the largest to the smallest gap is \\(5.7\\) at \\(\\alpha=0\\), \\(3.5\\) at \\(\\alpha=\\tfrac12\\) and \\(2.6\\) at \\(\\alpha=1\\): a larger \\(\\alpha\\) gives a more even distribution. With \\(10\\) samples the gaps are easier to see; at \\(\\alpha=1\\) the ratio is \\(2.1\\) (\\(3.8\\) at \\(\\alpha=0\\)). The gap is measured as a straight line between consecutive samples, not along the arc.',
            ),
            formulaIds: ['sp-samples'],
            frames: [frame('sp-compare-explanation', 'explanation'), frame('sp-compare-observation', 'observation')],
            learnerInteraction: 'adjust-construction-parameter',
            observationPrompt: text('Z drsnikom \\(\\alpha\\) preleti vrednosti \\(0\\), \\(0{,}5\\) in \\(1\\) ter opazuj razmike med \\(10\\) vzorci.', 'Sweep the \\(\\alpha\\) slider over \\(0\\), \\(0.5\\) and \\(1\\) and watch the gaps between the \\(10\\) samples.'),
            expectedObservations: [text('Z večjim \\(\\alpha\\) so razmiki med vzorci bolj izenačeni; kontrolne točke ostanejo na mestu.', 'With a larger \\(\\alpha\\) the gaps between samples are more equal; the control points stay in place.')],
            scene: {
                id: 'sp-alpha-one-ten', basedOn: 'demonstration-default',
                actions: [{name: 'set-parameterization-alpha', value: 1}, {name: 'set-parameterization-samples', value: 10}, {name: 'hide-spline-fixed-points', value: false}],
                expectedState: text('\\(\\alpha=1\\), \\(10\\) vzorčnih točk, stične točke vidne.', '\\(\\alpha=1\\), \\(10\\) sample points, joints visible.'),
            },
        },
    ],
    sources: [
        thesisSource('stampar-thesis-spline-parameterization', 'razdelek 4.2.3 (Slika 30, str. 26-28)',
            ['alpha-parameterizations of symmetric C^2 splines', 'uniform, centripetal and chordal parameterization', 'effect of alpha on shape and point distribution'],
            'The route spline is the C^2 spline with 9 points (thesis p_{-1}..p_7); its first span is |p_0 p_2| (thesis p_{-1}p_1), then the consecutive chords, and the last is |p_6 p_8|.'),
        farinSource('farin-cagd-spline-parameterization', ['uniform, chordal and centripetal parameterization of interpolating splines']),
        {
            id: 'bezeg-spline-parameterization-implementation',
            citation: 'Bezeg source: src/graphs/curves/parametrisations/SplineAlphaParametrizationGraph.tsx and src/bezeg/impl/curve/C2CubicBezierSpline.ts.',
            supports: ['alpha slider', 'Number of points slider', 'derived joints that move with alpha'],
            implementationCorrespondence: 'C2CubicBezierSpline.getU builds the spans as chord^alpha divided by their sum; the graph samples S(i/(N+1)) for i = 1..N and keeps alpha on the curve.',
        },
    ],
    edgeCases: [
        text('Parameter \\(\\alpha\\) leži na krivulji in se ob vsaki pripravi prizora znova uporabi; privzeta vrednost je \\(\\tfrac12\\), \\(25\\) vzorčnih točk.', 'The parameter \\(\\alpha\\) lives on the curve and is reapplied whenever a scene is prepared; the default is \\(\\tfrac12\\) with \\(25\\) sample points.'),
        text('Drsnik Število točk dovoli \\(0\\) do \\(50\\) točk; pri \\(0\\) so vidne le kontrolne točke in zlepek.', 'The Number of points slider allows \\(0\\) to \\(50\\) points; at \\(0\\) only the control points and the spline are visible.'),
        text('Razmerja razmikov veljajo za privzete točke; pri drugačnih točkah so števila drugačna, vrstni red \\(\\alpha=0\\), \\(\\tfrac12\\), \\(1\\) pa ni zagotovljen.', 'The gap ratios hold for the default points; other points give other numbers, and the order \\(\\alpha=0\\), \\(\\tfrac12\\), \\(1\\) is not guaranteed.'),
    ],
    unresolvedQuestions: [
        text('Pred classroom-ready pregledom je treba potrditi slovenske izraze »enakomerna«, »centripetalna« in »tetivna« parametrizacija ter trditev, da večji \\(\\alpha\\) vedno izenači razmike, tudi za druge točke.', 'Before classroom-ready review, confirm the Slovenian terms "enakomerna", "centripetalna" and "tetivna" parameterization and the claim that a larger \\(\\alpha\\) always evens out the gaps, also for other points.'),
    ],
};

export const splineGuidedLessons: readonly GuidedLesson[] = [
    splineCn,
    splineC1,
    splineC2,
    splineG1,
    splineG1Symmetric,
    splineParameterization,
];
