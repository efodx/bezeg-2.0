/**
 * Guided lesson of the `epicycles` Demonstration (docs/specs/fourier-series-lessons.md, F5): a closed curve as a sum of rotating vectors,
 * the partial sum with frequencies -N..N, the diamond with its corners, the dependence of the coefficients on the parametrization,
 * and a dragged control point. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is a value of the scene it belongs to, and `epicyclesGuidedLessons.test.ts` recomputes that against the real graph and an
 * independent de Casteljau plus Simpson quadrature. Scenes use the `function-choice` actions `epicycle-example` and `epicycle-parametrization`
 * and the `function-parameter` actions `epicycle-n`, `epicycle-time` and `epicycle-control-<i>-<1|2>-x|y`. Every scene sets the example (which
 * rebuilds the loop), the parametrization, N and the time, so it works after any other scene; playback is stopped by every scene change.
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

interface SceneState {
    readonly example: 'circle' | 'diamond' | 'uneven';
    readonly parametrization: 'equal' | 'chord';
    readonly N: number;
    /** The time t in [0, 2 pi). */
    readonly time: number;
    /** Extra edits after the example is chosen: the first control point of span 0 moved to (x, y). */
    readonly control?: {readonly x: number; readonly y: number};
}

const epicycleScene = (id: string, state: SceneState, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'epicycle-example', value: state.example},
        {kind: 'function-choice', name: 'epicycle-parametrization', value: state.parametrization},
        {kind: 'function-parameter', name: 'epicycle-n', value: state.N},
        ...(state.control
            ? [
                {kind: 'function-parameter', name: 'epicycle-control-0-1-x', value: state.control.x} as const,
                {kind: 'function-parameter', name: 'epicycle-control-0-1-y', value: state.control.y} as const,
            ]
            : []),
        {kind: 'function-parameter', name: 'epicycle-time', value: state.time},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

interface StepContent {
    readonly id: string;
    readonly order: number;
    readonly title: LocalizedText;
    readonly purpose: LocalizedText;
    readonly explanation: LocalizedText;
    readonly formulaIds: readonly string[];
    readonly workedExampleId?: string;
    readonly observationPrompt: LocalizedText;
    readonly expectedObservations: readonly LocalizedText[];
    readonly scene: LessonScene;
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
        frame(`${content.id}-observation`, 'observation'),
    ],
});

const HALF_PI = Math.PI / 2;

const epicyclesLesson: GuidedLesson = {
    demonstrationId: 'epicycles',
    title: text('Epicikli: sklenjena krivulja kot vsota vrtečih se krogov', 'Epicycles: a closed curve as a sum of rotating circles'),
    summary: text(
        'Sklenjeno ravninsko krivuljo \\(z(t)=x(t)+i\\,y(t)\\) zapišemo kot vsoto \\(\\sum c_k e^{ikt}\\) z kompleksnimi koeficienti \\(c_k\\): vsak člen je vektor, ki se vrti s frekvenco \\(k\\) in ima dolžino \\(|c_k|\\), zato mu pravimo vrteči se krog (epicikel). Delna vsota s frekvencami \\(-N,\\ldots,N\\) nariše sled, ki se krivulji približuje. Koeficienti so odvisni od izbrane parametrizacije in od začetka zanke, narisana oblika pa ne.',
        'A closed plane curve \\(z(t)=x(t)+i\\,y(t)\\) is written as a sum \\(\\sum c_k e^{ikt}\\) with complex coefficients \\(c_k\\): each term is a vector that rotates with frequency \\(k\\) and has length \\(|c_k|\\), so it is drawn as a rotating circle (an epicycle). The partial sum with frequencies \\(-N,\\ldots,N\\) draws a trace that approaches the curve. The coefficients depend on the chosen parametrization and on the start of the loop; the drawn shape does not depend on the start.',
    ),
    prerequisites: [
        text('Lekcija o koeficientih kot projekcijah (Fourierovi koeficienti) in kompleksna števila kot točke v ravnini.', 'The lesson on coefficients as projections (Fourier coefficients) and complex numbers as points of the plane.'),
        text('Sklenjene zanke iz kubičnih lokov, kot jih poznaš iz poglavij o Bézierovih zlepkih.', 'Closed loops of cubic spans, as known from the Bézier spline chapters.'),
    ],
    learningGoals: [
        text('Veš, da je koeficient \\(c_k\\) kompleksno število, njegova velikost \\(|c_k|\\) je polmer kroga, njegov argument pa začetni kot.', 'Know that the coefficient \\(c_k\\) is a complex number: its modulus \\(|c_k|\\) is the radius of the circle and its argument is the starting angle.'),
        text('Opaziš, da prvi krog skoraj sam nariše krožnico in da vsak naslednji krog napako zmanjša, pri rombu pa počasneje zaradi ogliščnih kotov.', 'Notice that the first circle nearly draws the circle by itself and that every further circle reduces the error, more slowly for the diamond because of its corners.'),
        text('Veš, da sled ni dokaz konvergence: konvergenca v vsaki točki je izrek, ki ga navajamo, sled pa je ilustracija.', 'Know that the trace is not a proof of convergence: convergence at every point is a theorem that we cite, and the trace is an illustration.'),
        text('Veš, da druga parametrizacija iste krivulje da druge koeficiente in drugačno sled.', 'Know that another parametrization of the same curve gives other coefficients and a different trace.'),
    ],
    formulaBlocks: [
        {
            id: 'epicycle-sum',
            latex: 'z(t)=x(t)+i\\,y(t)=\\sum_{k=-\\infty}^{\\infty}c_k\\,e^{ikt},\\qquad S_N(t)=\\sum_{k=-N}^{N}c_k\\,e^{ikt}',
            notation: text(
                '\\(t\\in[0,2\\pi)\\); \\(c_k\\) je kompleksni koeficient, \\(e^{ikt}\\) enotski vektor, ki se vrti \\(k\\)-krat hitreje kot \\(e^{it}\\) (za \\(k<0\\) v nasprotni smeri); \\(S_N\\) je delna vsota.',
                '\\(t\\in[0,2\\pi)\\); \\(c_k\\) is a complex coefficient, \\(e^{ikt}\\) a unit vector rotating \\(k\\) times as fast as \\(e^{it}\\) (the other way for \\(k<0\\)); \\(S_N\\) is the partial sum.',
            ),
            explanation: text(
                'Člen \\(c_k e^{ikt}\\) je vektor dolžine \\(|c_k|\\), ki se vrti s kotno hitrostjo \\(k\\). Člen \\(k=0\\) se ne vrti: je središče. Graf nalaga člene po padajoči velikosti \\(|c_k|\\), kar je izbira prikaza; vsota je od vrstnega reda neodvisna.',
                'The term \\(c_k e^{ikt}\\) is a vector of length \\(|c_k|\\) rotating with angular speed \\(k\\). The term \\(k=0\\) does not rotate: it is the centre. The graph stacks the terms by decreasing \\(|c_k|\\), which is a display choice; the sum does not depend on the order.',
            ),
        },
        {
            id: 'epicycle-coefficient',
            latex: 'c_k=\\frac1{2\\pi}\\int_0^{2\\pi}z(t)\\,e^{-ikt}\\,dt',
            notation: text(
                'Integral je vsota integralov po lokih; vsak lok ima svoj interval parametra.',
                'The integral is the sum of the integrals over the spans; each span has its own parameter interval.',
            ),
            explanation: text(
                'Koeficient je projekcija krivulje na vrtečo se frekvenco \\(k\\), kot pri realni Fourierovi vrsti. Odvisen je od parametrizacije: pri enakomerni vsak od \\(m\\) lokov dobi interval parametra dolžine \\(2\\pi/m\\), pri parametrizaciji po dolžini tetiv pa lok traja sorazmerno z razdaljo med svojima krajiščema. Ista narisana krivulja ima pri obeh drugačne koeficiente.',
                'The coefficient is the projection of the curve on the rotating frequency \\(k\\), as in the real Fourier series. It depends on the parametrization: for the equal one each of \\(m\\) spans gets parameter length \\(2\\pi/m\\), for the chord-length one a span lasts in proportion to the distance between its end points. The same drawn curve has different coefficients under the two.',
            ),
        },
        {
            id: 'epicycle-start-shift',
            latex: 'z_\\tau(t)=z(t+\\tau)\\ \\Longrightarrow\\ c_k^{(\\tau)}=e^{ik\\tau}\\,c_k',
            notation: text(
                '\\(\\tau\\) je premik začetka zanke po parametru.',
                '\\(\\tau\\) is the shift of the start of the loop along the parameter.',
            ),
            explanation: text(
                'Premik začetka zanke pomnoži vsak \\(c_k\\) z \\(e^{ik\\tau}\\), torej zavrti spekter, velikosti \\(|c_k|\\) in narisana oblika pa ostanejo. Graf nima kontrole za začetek, zato to trdimo, ne pokažemo.',
                'Moving the start of the loop multiplies each \\(c_k\\) by \\(e^{ik\\tau}\\), so it rotates the spectrum while the moduli \\(|c_k|\\) and the drawn shape stay. The graph has no control for the start, so this is stated, not shown.',
            ),
        },
        {
            id: 'epicycle-convergence',
            latex: 'S_N(t)\\to z(t)\\quad(N\\to\\infty),\\qquad t\\in[0,2\\pi)',
            notation: text(
                'Odsekoma gladka pomeni gladka na vsakem loku, v krajiščih sta lahko vogal.',
                'Piecewise smooth means smooth on each span; the end points may be corners.',
            ),
            explanation: text(
                'Izrek (kompleksna oblika Dirichletovega izreka; navedeno, ne odprto): za zvezno, odsekoma gladko periodično \\(z\\) delne vsote konvergirajo k \\(z(t)\\) v vsaki točki. Sled na grafu je ilustracija za izbrani \\(N\\), ne dokaz. Napaka na zaslonu je največja razdalja med sledjo in krivuljo na 2000 vzorčnih točkah, torej vzorčna, ne natančni maksimum.',
                'Theorem (complex form of Dirichlet\'s theorem; cited, not opened): for a continuous, piecewise smooth periodic \\(z\\) the partial sums converge to \\(z(t)\\) at every point. The trace on the graph is an illustration for the chosen \\(N\\), not a proof. The error on screen is the largest distance between trace and curve at 2000 sample points, so it is sampled, not the exact maximum.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'diamond-c1',
            title: text('Koeficient \\(c_1\\) romba', 'The coefficient \\(c_1\\) of the diamond'),
            calculationLatex: 'c_k=\\frac{8}{\\pi^2k^2}\\ (k\\equiv1\\bmod 4),\\qquad c_1=\\frac{8}{\\pi^2}',
            resultLatex: '0{,}81057',
            check: text(
                'Romb ima štiri daljice skozi \\(1,i,-1,-i\\), vsaka dobi interval \\(\\pi/2\\). Integral linearne funkcije krat \\(e^{-ikt}\\) je v zaprti obliki; vsota štirih lokov da \\(c_k=8/(\\pi^2k^2)\\) za \\(k\\equiv1\\pmod 4\\), sicer \\(0\\). Za \\(k=1\\) dobimo \\(8/\\pi^2=0{,}81057\\).',
                'The diamond has four straight spans through \\(1,i,-1,-i\\), each with an interval of length \\(\\pi/2\\). The integral of a linear function times \\(e^{-ikt}\\) has a closed form; the sum over the four spans gives \\(c_k=8/(\\pi^2k^2)\\) for \\(k\\equiv1\\pmod 4\\) and \\(0\\) otherwise. For \\(k=1\\) this is \\(8/\\pi^2=0.81057\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'epi-loop', order: 1,
            title: text('Zanka in en krog', 'The loop and one circle'),
            purpose: text('Napovedati polmer naslednjega kroga.', 'Predicting the radius of the next circle.'),
            explanation: text(
                'Graf kaže sklenjeno krivuljo iz štirih kubičnih lokov, ki približno poteka po enotski krožnici, in za \\(N=1\\) en vrteči se krog s sledjo. Središče \\(c_0\\) je v izhodišču, zato je prvi viden krog \\(c_1\\). Pred razkritjem napovej, kako velik bo krog, ki ga dodamo za \\(N=3\\).',
                'The graph shows a closed curve of four cubic spans that follows the unit circle closely, and for \\(N=1\\) one rotating circle with its trace. The centre \\(c_0\\) is at the origin, so the first visible circle is \\(c_1\\). Before the reveal, predict how large the circle added for \\(N=3\\) will be.',
            ),
            formulaIds: ['epicycle-sum'],
            observationPrompt: text('Napovej, ali bo naslednji krog podoben prvemu ali veliko manjši; nato preberi napako sledi.', 'Predict whether the next circle will be similar to the first or much smaller; then read the error of the trace.'),
            expectedObservations: [text('Velikost \\(|c_1|=1{,}0001\\); sled se od krivulje razlikuje za največ \\(0{,}00735\\) na vzorčnih točkah.', 'The size is \\(|c_1|=1.0001\\); the trace differs from the curve by at most \\(0.00735\\) at the sample points.')],
            scene: epicycleScene('epi-loop-scene', {example: 'circle', parametrization: 'equal', N: 1, time: 0},
                'Krožnica, enakomerna parametrizacija, \\(N=1\\), \\(t=0\\): največji krog \\(|c_1|=1{,}0001\\), napaka \\(0{,}00735\\).',
                'The circle, equal parametrization, \\(N=1\\), \\(t=0\\): the largest circle \\(|c_1|=1.0001\\), error \\(0.00735\\).'),
        }),
        step({
            id: 'epi-radius', order: 2,
            title: text('\\(N=1\\): polmer \\(|c_1|\\)', '\\(N=1\\): the radius \\(|c_1|\\)'),
            purpose: text('Videti, da je polmer kroga velikost koeficienta.', 'Seeing that the radius of the circle is the modulus of the coefficient.'),
            explanation: text(
                'Čas je zdaj na četrtini obhoda, \\(t=\\pi/2\\). Konec roke kroga \\(c_1e^{it}\\) je zavrten za četrt kroga, krog sam pa ima še vedno polmer \\(|c_1|\\). Velikost \\(|c_1|\\) je torej polmer, argument \\(c_1\\) pa kot, pod katerim roka začne. Pri \\(N=1\\) je še krog za \\(k=-1\\), vendar je njegov polmer \\(|c_{-1}|\\) v izpisu enak \\(0\\).',
                'The time is now a quarter of the way round, \\(t=\\pi/2\\). The arm of the circle \\(c_1e^{it}\\) has turned by a quarter, while the circle itself still has radius \\(|c_1|\\). So the modulus \\(|c_1|\\) is the radius and the argument of \\(c_1\\) is the angle where the arm starts. For \\(N=1\\) there is also the circle for \\(k=-1\\), but its radius \\(|c_{-1}|\\) in the table is \\(0\\).',
            ),
            formulaIds: ['epicycle-sum'],
            observationPrompt: text('Primerjaj polmer kroga s krivuljo in prebrano velikostjo \\(|c_1|\\) v tabeli.', 'Compare the radius of the circle with the curve and the modulus \\(|c_1|\\) read in the table.'),
            expectedObservations: [text('Polmer kroga je \\(1{,}0001\\), skoraj polmer krožnice.', 'The radius of the circle is \\(1.0001\\), almost the radius of the circle curve.')],
            scene: epicycleScene('epi-radius-scene', {example: 'circle', parametrization: 'equal', N: 1, time: HALF_PI},
                'Krožnica, \\(N=1\\), \\(t=\\pi/2\\): polmer \\(|c_1|=1{,}0001\\).',
                'The circle, \\(N=1\\), \\(t=\\pi/2\\): radius \\(|c_1|=1.0001\\).'),
        }),
        step({
            id: 'epi-add', order: 3,
            title: text('Dodajamo kroge enega za drugim', 'Adding circles one at a time'),
            purpose: text('Primerjati napovedani polmer z dejanskim in videti, kako hitro napaka pada.', 'Comparing the predicted radius with the real one and seeing how fast the error falls.'),
            explanation: text(
                'Za \\(N=5\\) so v verigi krogi \\(k=1\\), \\(k=5\\) in \\(k=-3\\), po padajoči velikosti. Drugi in tretji krog sta zelo majhna: \\(|c_5|=0{,}0037\\) in \\(|c_{-3}|=0{,}0036\\). Krožnica je namreč štirikrat simetrična, \\(z(t+\\pi/2)=i\\,z(t)\\), zato so vsi koeficienti razen tistih s \\(k\\equiv1\\pmod 4\\) enaki \\(0\\) (številčno pod \\(10^{-9}\\)). Napaka pada: za \\(N=3\\) je \\(0{,}00476\\), za \\(N=5\\) pa \\(0{,}00155\\).',
                'For \\(N=5\\) the chain holds the circles \\(k=1\\), \\(k=5\\) and \\(k=-3\\), by decreasing size. The second and third are tiny: \\(|c_5|=0.0037\\) and \\(|c_{-3}|=0.0036\\). The circle curve has four-fold symmetry, \\(z(t+\\pi/2)=i\\,z(t)\\), so every coefficient except those with \\(k\\equiv1\\pmod 4\\) is \\(0\\) (below \\(10^{-9}\\) numerically). The error falls: \\(0.00476\\) for \\(N=3\\) and \\(0.00155\\) for \\(N=5\\).',
            ),
            formulaIds: ['epicycle-sum'],
            observationPrompt: text('Primerjaj napoved s tabelo in opazuj, katere frekvence \\(k\\) imajo velikost nad \\(0\\).', 'Compare your prediction with the table and watch which frequencies \\(k\\) have a modulus above \\(0\\).'),
            expectedObservations: [text('Naslednja kroga sta več kot dvestokrat manjša od prvega; napaka je \\(0{,}00155\\).', 'The next circles are more than two hundred times smaller than the first; the error is \\(0.00155\\).')],
            scene: epicycleScene('epi-add-scene', {example: 'circle', parametrization: 'equal', N: 5, time: 0},
                'Krožnica, \\(N=5\\): krogi \\(1{,}0001\\), \\(0{,}0037\\) in \\(0{,}0036\\), napaka \\(0{,}00155\\).',
                'The circle, \\(N=5\\): circles \\(1.0001\\), \\(0.0037\\) and \\(0.0036\\), error \\(0.00155\\).'),
        }),
        step({
            id: 'epi-trace', order: 4,
            title: text('Sled proti prvotni krivulji', 'The trace against the original'),
            purpose: text('Primerjati sled delne vsote s prvotno zanko in razločiti ilustracijo od izreka.', 'Comparing the trace of the partial sum with the original loop and telling an illustration from a theorem.'),
            explanation: text(
                'Za \\(N=9\\) sled pri tem merilu komaj ločimo od zanke: napaka je \\(0{,}00060\\) na vzorčnih točkah, za \\(N=1\\) je bila \\(0{,}00735\\). Konvergenca v vsaki točki je izrek za zvezne odsekoma gladke krivulje (navedeno, ne odprto); sled za en \\(N\\) je le ilustracija. Napaka na zaslonu je vzorčna: največja vrednost na 2000 točkah.',
                'For \\(N=9\\) the trace is hard to tell from the loop at this scale: the error is \\(0.00060\\) at the sample points, against \\(0.00735\\) for \\(N=1\\). Convergence at every point is a theorem for continuous, piecewise smooth curves (cited, not opened); the trace for one \\(N\\) is only an illustration. The error on screen is sampled: the largest value at 2000 points.',
            ),
            formulaIds: ['epicycle-sum', 'epicycle-convergence'],
            observationPrompt: text('Poišči mesto, kjer se sled in zanka najbolj razhajata, in oceni, ali je razlika vidna.', 'Find the place where trace and loop differ most and judge whether the difference is visible.'),
            expectedObservations: [text('Največja vzorčna napaka je \\(0{,}00060\\), pod širino črte.', 'The largest sampled error is \\(0.00060\\), below the width of the line.')],
            scene: epicycleScene('epi-trace-scene', {example: 'circle', parametrization: 'equal', N: 9, time: Math.PI},
                'Krožnica, \\(N=9\\), \\(t=\\pi\\): vzorčna napaka \\(0{,}00060\\).',
                'The circle, \\(N=9\\), \\(t=\\pi\\): sampled error \\(0.00060\\).'),
        }),
        step({
            id: 'epi-diamond', order: 5,
            title: text('Romb: oglišča in pojemanje', 'The diamond: corners and decay'),
            purpose: text('Videti, da zanka z vogali potrebuje veliko krogov.', 'Seeing that a loop with corners needs many circles.'),
            explanation: text(
                'Romb iz štirih daljic skozi \\(1,i,-1,-i\\) ima koeficiente \\(c_k=8/(\\pi^2k^2)\\) za \\(k\\equiv1\\pmod 4\\) in \\(0\\) drugje: \\(|c_1|=0{,}8106\\), \\(|c_{-3}|=0{,}0901\\), \\(|c_5|=0{,}0324\\). Pojemanje kot \\(1/k^2\\) je posledica vogalov. Za \\(N=9\\) je vzorčna napaka še \\(0{,}04040\\), vogali so zaobljeni; pri krožnici je bila pri enakem \\(N\\) več kot šestdesetkrat manjša.',
                'The diamond of four straight spans through \\(1,i,-1,-i\\) has coefficients \\(c_k=8/(\\pi^2k^2)\\) for \\(k\\equiv1\\pmod 4\\) and \\(0\\) elsewhere: \\(|c_1|=0.8106\\), \\(|c_{-3}|=0.0901\\), \\(|c_5|=0.0324\\). The decay like \\(1/k^2\\) comes from the corners. For \\(N=9\\) the sampled error is still \\(0.04040\\), and the corners are rounded; for the circle curve at the same \\(N\\) it was more than sixty times smaller.',
            ),
            formulaIds: ['epicycle-coefficient'],
            workedExampleId: 'diamond-c1',
            observationPrompt: text('Poglej, kako sled zaokroži vogale, in povečaj \\(N\\); kdaj vogali izginejo?', 'Look at how the trace rounds the corners and raise \\(N\\); when do the corners disappear?'),
            expectedObservations: [text('Vogali ostanejo zaobljeni; napaka je \\(0{,}04040\\) za \\(N=9\\) in pada počasi.', 'The corners stay rounded; the error is \\(0.04040\\) for \\(N=9\\) and falls slowly.')],
            scene: epicycleScene('epi-diamond-scene', {example: 'diamond', parametrization: 'equal', N: 9, time: 0},
                'Romb, \\(N=9\\): krogi \\(0{,}8106\\), \\(0{,}0901\\), \\(0{,}0324\\), napaka \\(0{,}04040\\).',
                'The diamond, \\(N=9\\): circles \\(0.8106\\), \\(0.0901\\), \\(0.0324\\), error \\(0.04040\\).'),
        }),
        step({
            id: 'epi-uneven-equal', order: 6,
            title: text('Neenakomerna krivulja, enakomerna parametrizacija', 'An uneven curve, equal parametrization'),
            purpose: text('Videti, da imajo neenakomerni loki pri enakomerni parametrizaciji neenakomerno hitrost.', 'Seeing that uneven spans get an uneven speed under the equal parametrization.'),
            explanation: text(
                'Krožnica in romb sta simetrična, vsi loki so enako dolgi, zato pri njiju obe parametrizaciji dasta isto. Šest lokov neenakomerne krivulje ima različne tetive, najdaljša je \\(3{,}6\\)-krat daljša od najkrajše. Pri enakomerni parametrizaciji vsak lok traja \\(2\\pi/6\\). Največji krog je \\(k=-1\\) (obrača se v smeri urnega kazalca, ker zanka teče tako) z \\(|c_{-1}|=1{,}7658\\); vzorčna napaka za \\(N=9\\) je \\(0{,}09719\\).',
                'The circle and the diamond are symmetric, all their spans are equally long, so both parametrizations give the same for them. The six spans of the uneven curve have different chords, the longest being \\(3.6\\) times the shortest. Under the equal parametrization each span lasts \\(2\\pi/6\\). The largest circle is \\(k=-1\\) (it turns clockwise because the loop runs that way) with \\(|c_{-1}|=1.7658\\); the sampled error for \\(N=9\\) is \\(0.09719\\).',
            ),
            formulaIds: ['epicycle-coefficient'],
            observationPrompt: text('Zabeleži smer vrtenja največjega kroga in napako, nato pojdi na naslednji korak.', 'Note the direction of the largest circle and the error, then go to the next step.'),
            expectedObservations: [text('Največji krog je \\(k=-1\\) z velikostjo \\(1{,}7658\\); napaka je \\(0{,}09719\\).', 'The largest circle is \\(k=-1\\) with size \\(1.7658\\); the error is \\(0.09719\\).')],
            scene: epicycleScene('epi-uneven-equal-scene', {example: 'uneven', parametrization: 'equal', N: 9, time: 0},
                'Neenakomerna krivulja, enakomerna parametrizacija, \\(N=9\\): \\(|c_{-1}|=1{,}7658\\), napaka \\(0{,}09719\\).',
                'The uneven curve, equal parametrization, \\(N=9\\): \\(|c_{-1}|=1.7658\\), error \\(0.09719\\).'),
        }),
        step({
            id: 'epi-uneven-chord', order: 7,
            title: text('Ista krivulja, parametrizacija po dolžini tetiv', 'The same curve, chord-length parametrization'),
            purpose: text('Videti, da drugačna parametrizacija iste krivulje da druge koeficiente in drugačno sled.', 'Seeing that another parametrization of the same curve gives other coefficients and another trace.'),
            explanation: text(
                'Krivulja je enaka, spremenila se je le hitrost, s katero jo obhajamo: lok zdaj traja sorazmerno z dolžino svoje tetive. Koeficienti so drugačni: \\(|c_{-1}|=1{,}7843\\), vzorčna napaka za \\(N=9\\) je \\(0{,}14875\\), pri enakomerni je bila \\(0{,}09719\\). To velja za ta primer in ta \\(N\\), ne za vsako krivuljo. Premik začetka zanke bi pomnožil \\(c_k\\) z \\(e^{ik\\tau}\\), oblika pa bi ostala; graf nima kontrole za začetek, zato to trdimo, ne pokažemo.',
                'The curve is the same; only the speed at which it is traversed has changed: a span now lasts in proportion to the length of its chord. The coefficients differ: \\(|c_{-1}|=1.7843\\), and the sampled error for \\(N=9\\) is \\(0.14875\\), against \\(0.09719\\) for the equal one. This holds for this example and this \\(N\\), not for every curve. Moving the start of the loop would multiply \\(c_k\\) by \\(e^{ik\\tau}\\) and keep the shape; the graph has no control for the start, so this is stated, not shown.',
            ),
            formulaIds: ['epicycle-coefficient', 'epicycle-start-shift'],
            observationPrompt: text('Primerjaj velikosti krogov in napako s prejšnjim korakom ter pri obeh parametrizacijah poglej, kje so loki daljši.', 'Compare the sizes of the circles and the error with the previous step, and look at where the spans are longer under both.'),
            expectedObservations: [text('Največji krog je \\(1{,}7843\\), napaka \\(0{,}14875\\): drugi koeficienti, druga sled.', 'The largest circle is \\(1.7843\\), the error \\(0.14875\\): other coefficients, another trace.')],
            scene: epicycleScene('epi-uneven-chord-scene', {example: 'uneven', parametrization: 'chord', N: 9, time: 0},
                'Neenakomerna krivulja, po dolžini tetiv, \\(N=9\\): \\(|c_{-1}|=1{,}7843\\), napaka \\(0{,}14875\\).',
                'The uneven curve, by chord length, \\(N=9\\): \\(|c_{-1}|=1.7843\\), error \\(0.14875\\).'),
        }),
        step({
            id: 'epi-drag', order: 8,
            title: text('Premik kontrolne točke', 'Dragging a control point'),
            purpose: text('Videti, kako se krogi odzovejo na spremembo krivulje.', 'Seeing how the circles respond to a change of the curve.'),
            explanation: text(
                'Prva kontrolna točka prvega loka krožnice je premaknjena iz \\((1;\\,0{,}5523)\\) v \\((1{,}5;\\,0{,}55)\\). Krivulja ni več štirikrat simetrična, zato imajo koeficienti zunaj \\(k\\equiv1\\pmod 4\\) velikost nad \\(0\\) in člen \\(c_0\\) je \\(0{,}0313\\). Največji krog je \\(|c_1|=1{,}0243\\), vzorčna napaka za \\(N=9\\) je \\(0{,}03149\\), več kot petdesetkrat večja kot pri nespremenjeni krožnici. Povleci kontrolno točko ali krajišče na grafu in opazuj kroge.',
                'The first control point of the first span of the circle curve is moved from \\((1,\\,0.5523)\\) to \\((1.5,\\,0.55)\\). The curve is no longer four-fold symmetric, so coefficients outside \\(k\\equiv1\\pmod 4\\) have a modulus above \\(0\\) and the term \\(c_0\\) is \\(0.0313\\). The largest circle is \\(|c_1|=1.0243\\), the sampled error for \\(N=9\\) is \\(0.03149\\), more than fifty times larger than for the unchanged circle curve. Drag a control point or vertex on the graph and watch the circles.',
            ),
            formulaIds: ['epicycle-coefficient'],
            observationPrompt: text('Povleci točko in poglej, kateri krogi se spremenijo ter kdaj napaka postane vidna.', 'Drag a point and look at which circles change and when the error becomes visible.'),
            expectedObservations: [text('Več krogov ima velikost nad \\(0\\); napaka za \\(N=9\\) je \\(0{,}03149\\).', 'More circles have a modulus above \\(0\\); the error for \\(N=9\\) is \\(0.03149\\).')],
            scene: epicycleScene('epi-drag-scene', {example: 'circle', parametrization: 'equal', N: 9, time: 0, control: {x: 1.5, y: 0.55}},
                'Krožnica s prvo kontrolno točko v \\((1{,}5;\\,0{,}55)\\), \\(N=9\\): \\(|c_1|=1{,}0243\\), napaka \\(0{,}03149\\).',
                'The circle with the first control point at \\((1.5,\\,0.55)\\), \\(N=9\\): \\(|c_1|=1.0243\\), error \\(0.03149\\).'),
        }),
        step({
            id: 'epi-explore', order: 9,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskati število krogov, primere in parametrizacijo.', 'Exploring the number of circles, the examples and the parametrization independently.'),
            explanation: text(
                'Neenakomerna krivulja z \\(N=15\\): prosto spreminjaj \\(N\\) (največ 50, to je 101 členov), izbiraj primere in parametrizacijo ter vleci točke. Predvajanje je privzeto ustavljeno. Vprašanja: ali je za vsako krivuljo \\(c_0\\) središče, ali je vrstni red krogov po velikosti vedno enak, kdaj druga parametrizacija zmanjša napako?',
                'The uneven curve with \\(N=15\\): change \\(N\\) freely (at most 50, that is 101 terms), choose the examples and the parametrization, and drag points. Playback is stopped by default. Questions: is \\(c_0\\) always the centre of the curve, is the order of the circles by size always the same, when does the other parametrization reduce the error?',
            ),
            formulaIds: ['epicycle-sum', 'epicycle-convergence'],
            observationPrompt: text('Izberi svojo zanimivo zanko in zapiši, kateri krogi prevladajo.', 'Pick an interesting loop of your own and write down which circles dominate.'),
            expectedObservations: [text('Odgovori so odvisni od tvoje izbire; pri vsaki sledi preveri še ilustracijo z izrekom.', 'The answers depend on your choice; for every trace check the illustration against the theorem.')],
            scene: epicycleScene('epi-explore-scene', {example: 'uneven', parametrization: 'equal', N: 15, time: 0},
                'Neenakomerna krivulja, enakomerna parametrizacija, \\(N=15\\), \\(t=0\\).',
                'The uneven curve, equal parametrization, \\(N=15\\), \\(t=0\\).'),
        }),
    ],
    sources: [
        {
            id: 'zygmund-trigonometric-series-epicycles',
            citation: 'Zygmund, A. Trigonometric Series, 3rd ed., vol. I, Cambridge University Press, 2002: Fourier series of continuous functions of bounded variation and Dirichlet\'s theorem (the complex form for the plane curve z = x + iy). Cited, not opened.',
        },
        {
            id: 'bezeg-epicycles-implementation',
            citation: 'Bezeg source: src/analysis/epicycleModel.ts, src/analysis/closedSpline.ts and src/graphs/functions/EpicycleGraph.tsx.',
            implementationCorrespondence: 'A loop of m spans (lines or cubics) gets a parameter interval of length 2 pi / m per span (equal) or proportional to the chord (chord); the coefficients are computed by Gauss-Legendre quadrature split at the span ends; the chain stacks the terms |k| <= N by decreasing |c_k|; the error on screen is the largest distance over 2000 sample points. A scene sets the example, the parametrization, N, the time and, in one step, a control point.',
        },
    ],
    edgeCases: [
        text('Izbira primera ponastavi zanko, N in parametrizacijo ostaneta; zato scena po izbiri primera vedno nastavi parametrizacijo, \\(N\\) in čas.', 'Choosing an example resets the loop while \\(N\\) and the parametrization stay, so a scene sets the parametrization, \\(N\\) and the time after choosing the example.'),
        text('Če sta dve zaporedni krajišči enaki, tetive ni mogoče razmeriti in graf uporabi enakomerno parametrizacijo (obvestilo na grafu); izrek o konvergenci, razčlenitev po lokih in vzorčna napaka so navedeni, ne dokazani.', 'If two consecutive end points coincide the chords cannot be used as proportions and the graph falls back to the equal parametrization (a note on the graph); the convergence theorem, the span-wise integration and the sampled error are cited, not proved.'),
    ],
    unresolvedQuestions: [],
};

export const epicyclesGuidedLessons: readonly GuidedLesson[] = [epicyclesLesson];
