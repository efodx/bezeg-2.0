/**
 * Guided lesson of the arc-length Demonstration (docs/specs/advanced-bezier-lessons.md, D3). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `arcLengthGuidedLessons.test.tsx` checks that against the real graph. No scene starts playback: the student presses Play.
 * Scenes use the `arc-curve`, `arc-pieces`, `arc-mover-mode`, `arc-mover-position`, `arc-pause` and `curve-visibility` actions.
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

interface ArcSceneSettings {
    curve: 'bezier' | 'ph';
    pieces: number;
    mode: 'parameter' | 'arc';
    position: number;
    equalT: boolean;
    equalArc: boolean;
    plot: boolean;
}

/**
 * A scene from the default of the chosen curve. `arc-curve` comes first because it replaces the curve and keeps the arc state;
 * then every arc setting is written, so no scene leans on another. Playback is paused last, never started.
 */
const arcScene = (id: string, s: ArcSceneSettings, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'arc-curve', curve: s.curve},
        {kind: 'arc-pieces', value: s.pieces},
        {kind: 'curve-visibility', target: 'arc-equal-t', visible: s.equalT},
        {kind: 'curve-visibility', target: 'arc-equal-arc', visible: s.equalArc},
        {kind: 'curve-visibility', target: 'arc-speed-plot', visible: s.plot},
        {kind: 'arc-mover-mode', mode: s.mode},
        {kind: 'arc-mover-position', value: s.position},
        {kind: 'arc-pause'},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const arcLengthLesson: GuidedLesson = {
    demonstrationId: 'arc-length-param',
    title: text('Naravna parametrizacija', 'Arc-length parametrization'),
    summary: text(
        'Enaki koraki v parametru \\(t\\) niso enaki koraki po krivulji. Ločno dolžino \\(s(t)=\\int_0^t|B\'(u)|\\,du\\) izračunamo numerično, jo obrnemo in dobimo točke na enakih ločnih razdaljah. Pri PH krivulji je \\(s(t)\\) točen polinom, njen inverz \\(t(s)\\) pa nikoli ni polinom, zato nobena nelinearna polinomska krivulja nima polinomske naravne parametrizacije.',
        'Equal steps in the parameter \\(t\\) are not equal steps along the curve. The arc length \\(s(t)=\\int_0^t|B\'(u)|\\,du\\) is computed numerically and inverted to get points at equal distances along the curve. For a PH curve \\(s(t)\\) is an exact polynomial, but its inverse \\(t(s)\\) is never a polynomial, so no non-linear polynomial curve is arc-length parametrized.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje poglavja o parametrizaciji krivulj in poglavja o PH krivuljah (hitrost \\(|B\'(t)|\\)).', 'Assumes the chapter on curve parametrization and the chapter on PH curves (the speed \\(|B\'(t)|\\)).'),
    ],
    learningGoals: [
        text('Pojasniš, zakaj enaki koraki v \\(t\\) niso enake ločne razdalje, in to preveriš z grafom hitrosti \\(|B\'(t)|\\).', 'Explain why equal steps in \\(t\\) are not equal arc distances, and check it with the speed graph \\(|B\'(t)|\\).'),
        text('Prebereš dolžino \\(L\\) iz tabele \\(s(t)\\), jo oklepaš s tetivo in kontrolnim poligonom ter z obratom \\(s(t)\\) postaviš točke na enake ločne razdalje.', 'Read the length \\(L\\) from the table of \\(s(t)\\), bracket it by the chord and the control polygon, and invert \\(s(t)\\) to place points at equal arc distances.'),
        text('Veš, da je pri PH krivulji dolžina polinom, inverz pa ne, in da je napaka včrtanega poligona na tem primeru ponazoritev vedenja \\(O(h^2)\\), ne dokaz.', 'Know that for a PH curve the length is a polynomial and its inverse is not, and that the inscribed-polyline error on this example illustrates \\(O(h^2)\\) behaviour and proves nothing.'),
    ],
    formulaBlocks: [
        {
            id: 'arc-length-integral',
            latex: 's(t)=\\int_0^t|B\'(u)|\\,du,\\quad L=s(1),\\quad s\\bigl(t_k\\bigr)=\\frac{k}{N}\\,L',
            notation: text(
                '\\(|B\'(u)|\\) je hitrost krivulje, \\(s(t)\\) ločna dolžina od \\(t=0\\) do \\(t\\), \\(L\\) celotna dolžina in \\(N\\) število delov. Parametri \\(t_k\\) so rešitve enačb \\(s(t_k)=kL/N\\).',
                '\\(|B\'(u)|\\) is the speed of the curve, \\(s(t)\\) the arc length from \\(t=0\\) to \\(t\\), \\(L\\) the total length and \\(N\\) the number of pieces. The parameters \\(t_k\\) solve \\(s(t_k)=kL/N\\).',
            ),
            explanation: text(
                'Integral numerično seštejemo po tabeli, nato enačbe \\(s(t_k)=kL/N\\) rešimo z obratom tabele. Ker je \\(s\'(t)=|B\'(t)|>0\\) brez osti, je \\(s\\) strogo naraščajoča in obrat obstaja.',
                'The integral is summed numerically over a table, then the equations \\(s(t_k)=kL/N\\) are solved by inverting the table. Since \\(s\'(t)=|B\'(t)|>0\\) without cusps, \\(s\\) is strictly increasing and the inverse exists.',
            ),
        },
        {
            id: 'arc-ph-length',
            latex: '|B\'(t)|=\\sigma(t)=b_0(1-t)^2+2b_1(1-t)t+b_2t^2,\\quad s(1)=\\int_0^1\\sigma(t)\\,dt=\\frac{b_0+b_1+b_2}{3}',
            notation: text(
                'Pri kubični PH krivulji z izpeljankama \\(h_0,h_1\\) je hitrost kvadratni polinom z Bernsteinovimi koeficienti \\(b_0=|h_0|^2\\), \\(b_1=h_0\\cdot h_1\\), \\(b_2=|h_1|^2\\).',
                'For a cubic PH curve with hodograph points \\(h_0,h_1\\) the speed is a quadratic polynomial with Bernstein coefficients \\(b_0=|h_0|^2\\), \\(b_1=h_0\\cdot h_1\\), \\(b_2=|h_1|^2\\).',
            ),
            explanation: text(
                'Koren je izginil, ker je \\(|B\'(t)|\\) polinom, zato je \\(s(t)\\) polinom stopnje \\(3\\) in \\(L=s(1)\\) je točna racionalna vsota koeficientov.',
                'The square root has disappeared because \\(|B\'(t)|\\) is a polynomial, so \\(s(t)\\) is a polynomial of degree \\(3\\) and \\(L=s(1)\\) is an exact rational sum of the coefficients.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'arc-ph-exact-example',
            title: text('Točna dolžina PH krivulje', 'The exact length of the PH curve'),
            calculationLatex: 's(1)=\\frac{b_0+b_1+b_2}{3}=\\frac{15{,}14+6{,}21+9{,}65}{3}',
            resultLatex: 's(1)=\\frac{31}{3}=10{,}333333\\ldots',
            check: text(
                'Za izpeljanki \\(h_0=(-3{,}5;\\ -1{,}7)\\) in \\(h_1=(-2{,}6;\\ 1{,}7)\\) je \\(b_0=12{,}25+2{,}89=15{,}14\\), \\(b_1=9{,}1-2{,}89=6{,}21\\), \\(b_2=6{,}76+2{,}89=9{,}65\\). Vsota je \\(31\\), zato je \\(s(1)=\\tfrac{31}{3}\\). Numerično polje \\(L\\) pokaže \\(10{,}333333\\), enako točni vrednosti.',
                'For the hodograph points \\(h_0=(-3.5;\\ -1.7)\\) and \\(h_1=(-2.6;\\ 1.7)\\) we get \\(b_0=12.25+2.89=15.14\\), \\(b_1=9.1-2.89=6.21\\), \\(b_2=6.76+2.89=9.65\\). The sum is \\(31\\), so \\(s(1)=\\tfrac{31}{3}\\). The numerical \\(L\\) readout shows \\(10.333333\\), equal to the exact value.',
            ),
        },
    ],
    steps: [
        {
            id: 'arc-constant-t', order: 1,
            title: text('Enaka hitrost v \\(t\\) ni enaka hitrost po krivulji', 'Constant speed in \\(t\\) is not constant speed along the curve'),
            purpose: text('Pred razkritjem napovedati, ali so točke z enakimi koraki v \\(t\\) enakomerno razporejene po krivulji.', 'Predicting, before the reveal, whether points with equal steps in \\(t\\) are evenly spread along the curve.'),
            explanation: text(
                'Prikazana je kubična Bézierjeva krivulja \\(Q\\) s kontrolnimi točkami \\((0,0)\\), \\((1,3)\\), \\((3,3)\\), \\((4,0)\\) in \\(8\\) enakimi koraki v \\(t\\) (polni krogci). Točka se giblje po enakih korakih v \\(t\\). Napovej: ali so krogci enakomerno razporejeni po krivulji? Pritisni Predvajaj ali premakni drsnik lege. Točka je zdaj pri \\(t=0{,}25\\), a je prepotovala \\(s(0{,}25)=1{,}9289\\) od dolžine \\(L=6{,}390976\\), to je \\(30{,}2\\,\\%\\) in ne \\(25\\,\\%\\). Razmerje največje in najmanjše tetive med sosednjima krogcema je \\(1{,}857\\).',
                'The cubic Bézier curve \\(Q\\) with control points \\((0,0)\\), \\((1,3)\\), \\((3,3)\\), \\((4,0)\\) is shown with \\(8\\) equal steps in \\(t\\) (filled circles). The point moves in equal steps of \\(t\\). Predict: are the circles evenly spread along the curve? Press Play or move the position slider. The point is now at \\(t=0.25\\), but it has covered \\(s(0.25)=1.9289\\) of the length \\(L=6.390976\\), that is \\(30.2\\,\\%\\) and not \\(25\\,\\%\\). The ratio of the longest to the shortest chord between neighbouring circles is \\(1.857\\).',
            ),
            formulaIds: ['arc-length-integral'],
            frames: [frame('arc-constant-t-explanation', 'explanation'), frame('arc-constant-t-observation', 'observation')],
            observationPrompt: text('Poženi točko in opazuj, kje se premika hitro in kje počasi.', 'Play the point and watch where it moves fast and where slowly.'),
            expectedObservations: [text('Točka je hitra na koncih krivulje in počasna na sredini, čeprav se \\(t\\) enakomerno povečuje; krogci so na koncih redkejši.', 'The point is fast near the ends of the curve and slow in the middle although \\(t\\) grows evenly; the circles are sparser near the ends.')],
            scene: arcScene('arc-constant-t-scene', {curve: 'bezier', pieces: 8, mode: 'parameter', position: 0.25, equalT: true, equalArc: false, plot: false},
                'Krivulja \\(Q\\) z \\(8\\) enakimi koraki v \\(t\\); točka je pri \\(t=0{,}25\\), kjer je \\(s=1{,}9289\\); predvajanje je ustavljeno.',
                'The curve \\(Q\\) with \\(8\\) equal steps in \\(t\\); the point is at \\(t=0.25\\), where \\(s=1.9289\\); playback is stopped.'),
        },
        {
            id: 'arc-speed-graph', order: 2,
            title: text('Graf hitrosti \\(|B\'(t)|\\)', 'The speed graph \\(|B\'(t)|\\)'),
            purpose: text('Pred razkritjem napovedati, kje je hitrost največja, in jo povezati z razmikom krogcev.', 'Predicting, before the reveal, where the speed is largest, and connecting it with the spacing of the circles.'),
            explanation: text(
                'Hitrost \\(|B\'(t)|\\) pove, koliko ločne dolžine pride na enoto \\(t\\). Napovej, kje je največja. Prikazan je njen graf: pri \\(t=0\\) je \\(|B\'(0)|=3\\sqrt{10}=9{,}4868\\), pri \\(t=0{,}5\\) pa le \\(|B\'(0{,}5)|=4{,}5\\), kar je \\(2{,}108\\)-krat manj. Pri enakih korakih v \\(t\\) je torej razmik krogcev na koncih približno dvakrat večji kot na sredini.',
                'The speed \\(|B\'(t)|\\) tells how much arc length falls on one unit of \\(t\\). Predict where it is largest. Its graph is shown: at \\(t=0\\) we have \\(|B\'(0)|=3\\sqrt{10}=9.4868\\), at \\(t=0.5\\) only \\(|B\'(0.5)|=4.5\\), which is \\(2.108\\) times smaller. With equal steps in \\(t\\) the spacing of the circles near the ends is therefore about twice that in the middle.',
            ),
            formulaIds: ['arc-length-integral'],
            frames: [frame('arc-speed-graph-explanation', 'explanation'), frame('arc-speed-graph-observation', 'observation')],
            observationPrompt: text('Premakni lego točke po grafu hitrosti in primerjaj višino krivulje z razmikom krogcev.', 'Move the position along the speed graph and compare the height of the curve with the spacing of the circles.'),
            expectedObservations: [text('Kjer je graf visok (konca), so krogci daleč narazen; kjer je nizek (sredina), so blizu.', 'Where the graph is high (the ends) the circles are far apart; where it is low (the middle) they are close.')],
            scene: arcScene('arc-speed-graph-scene', {curve: 'bezier', pieces: 8, mode: 'parameter', position: 0.5, equalT: true, equalArc: false, plot: true},
                'Prikazan je graf hitrosti; točka je pri \\(t=0{,}5\\), kjer je hitrost \\(4{,}5\\), na krajiščih pa \\(9{,}4868\\).',
                'The speed graph is shown; the point is at \\(t=0.5\\), where the speed is \\(4.5\\), and \\(9.4868\\) at the end points.'),
        },
        {
            id: 'arc-table', order: 3,
            title: text('Tabela \\(s(t)\\) in dolžina \\(L\\)', 'The table of \\(s(t)\\) and the length \\(L\\)'),
            purpose: text('Pred razkritjem napovedati, med katerima dolžinama leži \\(L\\), in prebrati numerično vrednost z njeno nastavitvijo.', 'Predicting, before the reveal, between which lengths \\(L\\) lies, and reading the numerical value with its setting.'),
            explanation: text(
                'Ločno dolžino \\(s(t)\\) seštejemo v tabelo po delih \\(t\\). Napovej: med katerima številoma leži \\(L\\)? Tetiva med krajiščema je spodnja meja \\(4\\), dolžina kontrolnega poligona zgornja meja \\(8{,}324555\\). Točka je zdaj pri \\(t=1\\) in polje pokaže \\(s(1)=L=6{,}390976\\). To je numerična vrednost: Gauss-Legendre s \\(24\\) točkami na \\(32\\) delih. Za krivuljo \\(Q\\) ni formule v elementarnih funkcijah, zato vrednosti ne imenujemo točna.',
                'The arc length \\(s(t)\\) is summed into a table over pieces of \\(t\\). Predict: between which two numbers does \\(L\\) lie? The chord between the end points is the lower bound \\(4\\), the control polygon length the upper bound \\(8.324555\\). The point is now at \\(t=1\\) and the readout shows \\(s(1)=L=6.390976\\). This is a numerical value: Gauss-Legendre with \\(24\\) points on \\(32\\) panels. There is no elementary closed form for the curve \\(Q\\), so the value is not called exact.',
            ),
            formulaIds: ['arc-length-integral'],
            frames: [frame('arc-table-explanation', 'explanation'), frame('arc-table-observation', 'observation')],
            observationPrompt: text('Preberi polje Ločna dolžina in vrstico Tetiva \\(\\le L\\le\\) kontrolni poligon.', 'Read the Arc length readout and the Chord \\(\\le L\\le\\) control polygon line.'),
            expectedObservations: [text('Velja \\(4\\le 6{,}390976\\le 8{,}324555\\); polje navaja tudi nastavitev kvadrature (\\(24\\) točk, \\(32\\) delov).', 'It holds that \\(4\\le 6.390976\\le 8.324555\\); the readout also states the quadrature setting (\\(24\\) points, \\(32\\) panels).')],
            scene: arcScene('arc-table-scene', {curve: 'bezier', pieces: 8, mode: 'parameter', position: 1, equalT: true, equalArc: false, plot: true},
                'Točka je pri \\(t=1\\), kjer je \\(s=6{,}391\\); polje kaže \\(L=6{,}390976\\) in meje \\(4\\) ter \\(8{,}324555\\).',
                'The point is at \\(t=1\\), where \\(s=6.391\\); the readout shows \\(L=6.390976\\) and the bounds \\(4\\) and \\(8.324555\\).'),
        },
        {
            id: 'arc-equal-arcs', order: 4,
            title: text('Obrat: točke na enakih ločnih razdaljah', 'Inversion: points at equal arc distances'),
            purpose: text('Pred razkritjem napovedati, ali bodo tetive pri enakih ločnih dolžinah skoraj enake, in primerjati razmerji.', 'Predicting, before the reveal, whether the chords for equal arcs will be almost equal, and comparing the two ratios.'),
            explanation: text(
                'Enačbe \\(s(t_k)=kL/N\\) rešimo z obratom tabele in dobimo parametre \\(t_k\\) (prazni kvadrati). Pri \\(N=8\\) so prvi trije \\(0{,}0906\\), \\(0{,}1983\\), \\(0{,}3324\\), sredina pa \\(0{,}5\\). Vsak del krivulje ima dolžino \\(L/8\\). Napovej: kolikšno je zdaj razmerje največje in najmanjše tetive? Pri enakih korakih v \\(t\\) je bilo \\(1{,}857\\), pri enakih ločnih dolžinah je \\(1{,}015\\). Enako dolgi loki se različno ukrivijo, zato so tetive različno krajše od njih in razmerje ni natanko \\(1\\). Točka v načinu Stalna hitrost po krivulji je pri \\(s=L/4=1{,}5977\\), to je pri \\(t=0{,}1983\\), ne pri \\(t=0{,}25\\).',
                'The equations \\(s(t_k)=kL/N\\) are solved by inverting the table, giving the parameters \\(t_k\\) (hollow squares). For \\(N=8\\) the first three are \\(0.0906\\), \\(0.1983\\), \\(0.3324\\), and the middle one is \\(0.5\\). Each piece of the curve has length \\(L/8\\). Predict: what is the ratio of the longest to the shortest chord now? For equal steps in \\(t\\) it was \\(1.857\\); for equal arcs it is \\(1.015\\). Arcs of equal length bend by different amounts, so their chords fall short by different amounts and the ratio is not exactly \\(1\\). In the Constant speed along the curve mode the point is at \\(s=L/4=1.5977\\), that is at \\(t=0.1983\\), not at \\(t=0.25\\).',
            ),
            formulaIds: ['arc-length-integral'],
            frames: [frame('arc-equal-arcs-explanation', 'explanation'), frame('arc-equal-arcs-observation', 'observation')],
            observationPrompt: text('Primerjaj razmik polnih krogcev in praznih kvadratov ter pritisni Predvajaj v načinu Stalna hitrost po krivulji.', 'Compare the spacing of the filled circles and the hollow squares, and press Play in the Constant speed along the curve mode.'),
            expectedObservations: [text('Kvadrati so po krivulji skoraj enakomerno razporejeni (razmerje \\(1{,}015\\)), krogci pa ne (\\(1{,}857\\)); točka s stalno ločno hitrostjo se giblje enakomerno.', 'The squares are almost evenly spread along the curve (ratio \\(1.015\\)) and the circles are not (\\(1.857\\)); the point at constant arc speed moves evenly.')],
            scene: arcScene('arc-equal-arcs-scene', {curve: 'bezier', pieces: 8, mode: 'arc', position: 0.25, equalT: true, equalArc: true, plot: true},
                'Prikazani so krogci in kvadrati, \\(N=8\\); točka je pri \\(s=1{,}5977\\) (\\(t=0{,}1983\\)); razmerji tetiv sta \\(1{,}857\\) in \\(1{,}015\\).',
                'Circles and squares are shown, \\(N=8\\); the point is at \\(s=1.5977\\) (\\(t=0.1983\\)); the chord ratios are \\(1.857\\) and \\(1.015\\).'),
        },
        {
            id: 'arc-ph-exact', order: 5,
            title: text('PH krivulja: točna \\(s(t)\\), a ne inverz', 'The PH curve: an exact \\(s(t)\\), but no exact inverse'),
            purpose: text('Pred razkritjem napovedati, ali se numerična dolžina ujema s točno vsoto, in razumeti, zakaj inverz ni polinom.', 'Predicting, before the reveal, whether the numerical length agrees with the exact sum, and understanding why the inverse is not a polynomial.'),
            explanation: text(
                'Pri kubični PH krivulji z začetkom \\((-4{,}2;\\ -2)\\) in izpeljankama \\((-3{,}5;\\ -1{,}7)\\), \\((-2{,}6;\\ 1{,}7)\\) je hitrost kvadratni polinom, zato je \\(s(t)\\) polinom in \\(s(1)=\\tfrac{31}{3}\\) je točna vrednost. Napovej: kaj pokaže numerična dolžina \\(L\\)? Polje pokaže \\(L=10{,}333333\\) in točno \\(s(1)=10{,}333333\\); razlika je pod \\(10^{-9}\\). Točka je pri \\(t=0{,}3\\), kjer je \\(s=3{,}8496\\). Razmerji tetiv sta \\(1{,}619\\) in \\(1{,}004\\). PH naredi polinom dolžino \\(s(t)\\), ne pa njenega inverza \\(t(s)\\). Naravna parametrizacija bi zahtevala hitrost \\(1\\): če je \\(x\'(t)^2+y\'(t)^2=1\\) za polinoma \\(x\'\\), \\(y\'\\) in je večja stopnja \\(m\\ge1\\), se člen stopnje \\(2m\\) (vsota kvadratov vodilnih koeficientov, ki je pozitivna) ne more uničiti. Zato sta \\(x\'\\) in \\(y\'\\) konstanti in krivulja je daljica. Nelinearna polinomska krivulja torej nima polinomske naravne parametrizacije; kar naredimo, je numerični obrat.',
                'For the cubic PH curve with start \\((-4.2;\\ -2)\\) and hodograph points \\((-3.5;\\ -1.7)\\), \\((-2.6;\\ 1.7)\\) the speed is a quadratic polynomial, so \\(s(t)\\) is a polynomial and \\(s(1)=\\tfrac{31}{3}\\) is the exact value. Predict: what does the numerical length \\(L\\) show? The readout shows \\(L=10.333333\\) and the exact \\(s(1)=10.333333\\); the difference is below \\(10^{-9}\\). The point is at \\(t=0.3\\), where \\(s=3.8496\\). The chord ratios are \\(1.619\\) and \\(1.004\\). PH makes the length \\(s(t)\\) a polynomial, not its inverse \\(t(s)\\). An arc-length parametrization would need speed \\(1\\): if \\(x\'(t)^2+y\'(t)^2=1\\) for polynomials \\(x\'\\), \\(y\'\\) and the larger degree is \\(m\\ge1\\), the term of degree \\(2m\\) (the sum of the squares of the leading coefficients, which is positive) cannot cancel. So \\(x\'\\) and \\(y\'\\) are constants and the curve is a straight segment. A non-linear polynomial curve therefore has no polynomial arc-length parametrization; what we do is a numerical inversion.',
            ),
            formulaIds: ['arc-ph-length'], workedExampleId: 'arc-ph-exact-example',
            frames: [frame('arc-ph-exact-explanation', 'explanation'), frame('arc-ph-exact-calculation', 'calculation'), frame('arc-ph-exact-observation', 'observation')],
            observationPrompt: text('Primerjaj polji Ločna dolžina in Točna dolžina ter nato kvadrate in kroge.', 'Compare the Arc length and Exact length readouts, then the squares and circles.'),
            expectedObservations: [text('Obe polji kažeta \\(10{,}333333\\); točno vrednost ima samo PH krivulja, kvadrati so spet bližje enakomerni razporeditvi kot krogci.', 'Both readouts show \\(10.333333\\); only the PH curve has an exact value, and the squares are again closer to an even spread than the circles.')],
            scene: arcScene('arc-ph-exact-scene', {curve: 'ph', pieces: 8, mode: 'parameter', position: 0.3, equalT: true, equalArc: true, plot: true},
                'Kubična PH krivulja: \\(L=10{,}333333\\), točno \\(s(1)=\\tfrac{31}{3}\\); točka je pri \\(t=0{,}3\\), \\(s=3{,}8496\\).',
                'The cubic PH curve: \\(L=10.333333\\), exact \\(s(1)=\\tfrac{31}{3}\\); the point is at \\(t=0.3\\), \\(s=3.8496\\).'),
        },
        {
            id: 'arc-polyline-error', order: 6,
            title: text('Napaka včrtanega poligona', 'The error of the inscribed polyline'),
            purpose: text('Pred razkritjem napovedati, kolikokrat se napaka zmanjša, ko prepolovimo dolžino dela, in videti, da je to ponazoritev, ne dokaz.', 'Predicting, before the reveal, by what factor the error drops when the piece length is halved, and seeing that this is an illustration and not a proof.'),
            explanation: text(
                'Z \\(N\\) enakimi koraki v \\(t\\) včrtamo poligon in ga primerjamo z \\(L\\). Pri \\(N=8\\) je napaka \\(|L-\\text{poligon}|=0{,}025086\\). Nastavi \\(N=16\\), da se dolžina dela razpolovi. Napovej, kolikšna bo napaka. Polje pokaže \\(0{,}006267\\), to je približno \\(4\\)-krat manj. Pri \\(N=4\\) je bila \\(0{,}100244\\), pri \\(N=32\\) bo \\(0{,}001566\\). Če se \\(h\\) razpolovi in se napaka deli s \\(4\\), je to vedenje \\(O(h^2)\\). Štiri vrednosti na krivulji \\(Q\\) so ponazoritev tega vedenja, ne dokaz.',
                'An inscribed polyline with \\(N\\) equal steps in \\(t\\) is compared with \\(L\\). For \\(N=8\\) the error \\(|L-\\text{polyline}|\\) is \\(0.025086\\). Set \\(N=16\\) so that the piece length is halved. Predict the error. The readout shows \\(0.006267\\), about \\(4\\) times smaller. For \\(N=4\\) it was \\(0.100244\\); for \\(N=32\\) it will be \\(0.001566\\). If \\(h\\) halves and the error divides by \\(4\\), that is \\(O(h^2)\\) behaviour. The four values on the curve \\(Q\\) illustrate this behaviour; they are not a proof.',
            ),
            formulaIds: ['arc-length-integral'],
            frames: [frame('arc-polyline-error-explanation', 'explanation'), frame('arc-polyline-error-observation', 'observation')],
            observationPrompt: text('Spreminjaj število delov \\(N\\) in beleži napako v polju Napaka včrtanega poligona.', 'Change the number of pieces \\(N\\) and note the error in the Inscribed polyline error readout.'),
            expectedObservations: [text('Vsakič, ko se \\(N\\) podvoji, se napaka deli s približno \\(4\\): \\(0{,}100244\\), \\(0{,}025086\\), \\(0{,}006267\\), \\(0{,}001566\\).', 'Each time \\(N\\) doubles, the error divides by about \\(4\\): \\(0.100244\\), \\(0.025086\\), \\(0.006267\\), \\(0.001566\\).')],
            scene: arcScene('arc-polyline-error-scene', {curve: 'bezier', pieces: 8, mode: 'parameter', position: 0, equalT: true, equalArc: false, plot: false},
                'Krivulja \\(Q\\), \\(N=8\\); napaka včrtanega poligona je \\(0{,}025086\\).',
                'The curve \\(Q\\), \\(N=8\\); the inscribed-polyline error is \\(0.025086\\).'),
        },
        {
            id: 'arc-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati kontrolne točke, preklapljati krivuljo in spreminjati \\(N\\).', 'Moving control points, switching the curve and changing \\(N\\) on your own.'),
            explanation: text(
                'Krivulja \\(Q\\) je spet na začetnem mestu, prikazani so krogci, kvadrati in graf hitrosti, \\(N=8\\). Premikaj kontrolne točke, preklopi na PH krivuljo, spreminjaj \\(N\\) in poženi točko v obeh načinih. Opazuj, kdaj se hitrost približa \\(0\\) (osti): tam so dolžine manj zanesljive in polje to sporoči.',
                'The curve \\(Q\\) is back at its start, with circles, squares and the speed graph shown, \\(N=8\\). Move the control points, switch to the PH curve, change \\(N\\) and play the point in both modes. Watch for the speed approaching \\(0\\) (cusps): lengths are less reliable there and the readout says so.',
            ),
            formulaIds: ['arc-length-integral', 'arc-ph-length'],
            frames: [frame('arc-explore-explanation', 'explanation'), frame('arc-explore-observation', 'observation')],
            observationPrompt: text('Povleci kontrolno točko tako, da dobi krivulja ost, in preberi polje o ostih.', 'Drag a control point so that the curve gets a cusp and read the cusp readout.'),
            expectedObservations: [text('Pri osti hitrost pade na \\(0\\), graf se dotakne osi in polje navede parameter osti; dolžina je tam manj natančna.', 'At a cusp the speed drops to \\(0\\), the graph touches the axis and the readout names the cusp parameter; the length is less accurate there.')],
            scene: arcScene('arc-explore-scene', {curve: 'bezier', pieces: 8, mode: 'parameter', position: 0, equalT: true, equalArc: true, plot: true},
                'Privzeta krivulja \\(Q\\), \\(N=8\\), vse prikazano; vse je prosto za raziskovanje.',
                'The default curve \\(Q\\), \\(N=8\\), everything shown; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'farin-arc-length', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the sections on arc length and on Pythagorean-hodograph curves.'},
        {id: 'farouki-ph', citation: 'Farouki, R. T. Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable. Springer (2008), chapters on arc length.'},
        {
            id: 'bezeg-arc-length-implementation',
            citation: 'Bezeg source: src/bezeg/impl/kernels/arc-length.ts and src/graphs/curves/arclength/.',
            implementationCorrespondence: 'Lengths come from a Gauss-Legendre table (24 points on 32 panels); the exact PH value is the polynomial s(1) of the PH curve. A lesson scene sets the curve, N, the mover and the three switches with the arc actions.',
        },
    ],
    edgeCases: [
        text('Pri osti (\\(|B\'(t)|=0\\)) obrat ni dobro pogojen; graf to sporoči namesto deljenja z \\(0\\).', 'At a cusp (\\(|B\'(t)|=0\\)) the inversion is ill-conditioned; the graph reports it instead of dividing by \\(0\\).'),
        text('Če vse kontrolne točke sovpadajo, je dolžina \\(0\\) in naravne parametrizacije ni.', 'If all control points coincide, the length is \\(0\\) and there is no arc-length parametrization.'),
    ],
    unresolvedQuestions: [],
};

export const arcLengthGuidedLessons: readonly GuidedLesson[] = [arcLengthLesson];
