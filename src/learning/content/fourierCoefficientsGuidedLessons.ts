/**
 * Guided lesson of the `fourier-coefficients` Demonstration (docs/specs/fourier-series-lessons.md): F2, coefficients as projections
 * (steps 1 to 7, the projection view), then F4, smoothness and coefficient decay (steps 8 to 14, the decay view). A Demonstration has one
 * guided lesson, so the two are consecutive parts, as F1 and F3 are on `fourier-series`. The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it quotes is a value of the scene it belongs to, and
 * `fourierCoefficientsGuidedLessons.test.ts` checks that against the real graph and independent quadrature.
 * Scenes use the `function-choice` actions `fourier-view`, `fourier-layout`, `fourier-term`, `fourier-selection-1|2|3` and `fourier-scale`,
 * the `function-parameter` actions `fourier-handle-0..4`, `fourier-order`, `fourier-harmonic` and `fourier-n` (the decay view's N) and the
 * visibility target `fourier-partial-sum`. Every scene sets every one of these, so it works after any other scene.
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

type Example = 'square' | 'sawtooth' | 'abs' | 'jump' | 'smooth';

interface SceneState {
    readonly view: 'projection' | 'decay';
    readonly layout: 'abs' | 'jump' | 'free';
    /** One value per handle slot of the layout. */
    readonly handles: readonly number[];
    readonly term: 'a' | 'b';
    readonly k: number;
    readonly K: number;
    readonly selections: readonly [Example, Example, Example];
    readonly n: number;
    readonly scale: 'linear' | 'log';
}

/** The |x| layout with its tip at 0: f(-pi) = pi, f(0) = 0. */
const ABS_HANDLES = [Math.PI, 0] as const;
/** The jump sgn(x - 1): the right value at -pi, the two sides of the jump, the left value at pi. */
const JUMP_HANDLES = [-1, -1, 1, 1] as const;
const DEFAULT_SELECTIONS = ['square', 'abs', 'smooth'] as const;

/**
 * A scene from the default scene with every field set. Harmonic 1 is chosen before K and the final harmonic after it (K may not drop below
 * the selected harmonic); the three selections are set in slot order, which never duplicates an example from the default selections or
 * from the one other selection a scene uses.
 */
const coefficientsScene = (id: string, state: SceneState, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'fourier-view', value: state.view},
        {kind: 'function-choice', name: 'fourier-layout', value: state.layout},
        ...state.handles.map((value, index): LessonAction => ({kind: 'function-parameter', name: `fourier-handle-${index}` as 'fourier-handle-0', value})),
        {kind: 'function-parameter', name: 'fourier-harmonic', value: 1},
        {kind: 'function-choice', name: 'fourier-term', value: state.term},
        {kind: 'function-parameter', name: 'fourier-order', value: state.K},
        {kind: 'function-parameter', name: 'fourier-harmonic', value: state.k},
        {kind: 'function-visibility', target: 'fourier-partial-sum', visible: true},
        {kind: 'function-choice', name: 'fourier-selection-1', value: state.selections[0]},
        {kind: 'function-choice', name: 'fourier-selection-2', value: state.selections[1]},
        {kind: 'function-choice', name: 'fourier-selection-3', value: state.selections[2]},
        {kind: 'function-parameter', name: 'fourier-n', value: state.n},
        {kind: 'function-choice', name: 'fourier-scale', value: state.scale},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

/** A projection-view scene on a layout; the decay fields stay at their defaults. */
const projection = (id: string, layout: SceneState['layout'], handles: readonly number[], term: 'a' | 'b', k: number, sl: string, en: string): LessonScene =>
    coefficientsScene(id, {view: 'projection', layout, handles, term, k, K: 16, selections: DEFAULT_SELECTIONS, n: 11, scale: 'linear'}, sl, en);

/** A decay-view scene; the projection fields stay on |x| with K = 16. */
const decay = (
    id: string, n: number, scale: 'linear' | 'log', selections: SceneState['selections'], sl: string, en: string,
): LessonScene =>
    coefficientsScene(id, {view: 'decay', layout: 'abs', handles: ABS_HANDLES, term: 'a', k: 1, K: 16, selections, n, scale}, sl, en);

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
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
});

const coefficientsLesson: GuidedLesson = {
    demonstrationId: 'fourier-coefficients',
    title: text('Fourierovi koeficienti: projekcije in pojemanje', 'Fourier coefficients: projections and decay'),
    summary: text(
        'Koeficienta \\(a_k\\) in \\(b_k\\) povesta, koliko oblike funkcije \\(f\\) vsebuje \\(\\cos kx\\) oziroma \\(\\sin kx\\): to je integral produkta \\(f\\) in harmonika, deljen s \\(\\pi\\). Stolpci spektra koeficientov se z oblikami funkcije spreminjajo, Parsevalova identiteta pa povezuje njihove kvadrate z integralom kvadrata \\(\\tfrac1\\pi\\int f^2\\). Drugi del primerja pojemanje koeficientov: skok daje približno \\(1/k\\), kot približno \\(1/k^2\\), analitična funkcija geometrijsko pojemanje.',
        'The coefficients \\(a_k\\) and \\(b_k\\) say how much of the shape of \\(f\\) is \\(\\cos kx\\) or \\(\\sin kx\\): each is the integral of the product of \\(f\\) and the harmonic, divided by \\(\\pi\\). The bars of the coefficient spectrum change with the shape, and Parseval\'s identity links their squares to the integral of the square \\(\\tfrac1\\pi\\int f^2\\). The second part compares the decay of the coefficients: a jump gives about \\(1/k\\), a corner about \\(1/k^2\\), an analytic function geometric decay.',
    ),
    prerequisites: [
        text('Za prvi del je potrebno poznavanje določenega integrala in ploščine s predznakom (lekcija o Riemannovih vsotah).', 'The first part assumes the definite integral and signed area (the lesson on Riemann sums).'),
        text('Priporočamo lekcijo o delnih vsotah in Gibbsovem pojavu (Fourierova vrsta); za drugi del še Taylorjevo vrsto zaradi stika z analitičnimi funkcijami.', 'The lesson on partial sums and the Gibbs phenomenon (Fourier series) is recommended; for the second part also the Taylor series, for the contact with analytic functions.'),
    ],
    learningGoals: [
        text('Veš, da je \\(a_k\\) integral produkta \\(f\\) in \\(\\cos kx\\) (deljen s \\(\\pi\\)), \\(b_k\\) pa produkta \\(f\\) in \\(\\sin kx\\), in napoveš predznak koeficienta iz oblike.', 'Know that \\(a_k\\) is the integral of the product of \\(f\\) and \\(\\cos kx\\) (divided by \\(\\pi\\)) and \\(b_k\\) that of \\(f\\) and \\(\\sin kx\\), and predict the sign of a coefficient from the shape.'),
        text('Opaziš, kako vlečenje ročice spremeni stolpce spektra in da skok daje počasi pojemajoče stolpce.', 'Notice how dragging a handle changes the bars of the spectrum and that a jump gives slowly decaying bars.'),
        text('Primerjaš integral kvadrata z Parsevalovo vsoto in veš, da je identiteta izrek, ki ga navajamo.', 'Compare the integral of the square with the Parseval sum and know that the identity is a theorem that we cite.'),
        text('Na treh primerih opaziš, da gladkejša funkcija pomeni hitrejše pojemanje koeficientov, in razločiš izrek (le v tej smeri) od opažanja naklona.', 'Observe on three examples that a smoother function means faster decay of the coefficients, and tell the theorem (this direction only) from the reading of a slope.'),
    ],
    formulaBlocks: [
        {
            id: 'coefficient-projection',
            latex: 'a_k=\\frac1\\pi\\int_{-\\pi}^{\\pi}f(x)\\cos kx\\,dx,\\qquad b_k=\\frac1\\pi\\int_{-\\pi}^{\\pi}f(x)\\sin kx\\,dx',
            notation: text(
                '\\(f\\) je \\(2\\pi\\)-periodična; \\(a_k\\) in \\(b_k\\) sta koeficienta pri \\(\\cos kx\\) in \\(\\sin kx\\), konstantni člen vrste je \\(a_0/2\\).',
                '\\(f\\) is \\(2\\pi\\)-periodic; \\(a_k\\) and \\(b_k\\) are the coefficients of \\(\\cos kx\\) and \\(\\sin kx\\), the constant term of the series is \\(a_0/2\\).',
            ),
            explanation: text(
                'Produkt \\(f\\cdot\\sin kx\\) ima pozitivne in negativne dele; koeficient je njihova ploščina s predznakom, deljena s \\(\\pi\\). Pri funkciji z lomom ali skokom se integral izračuna natančno po kosih, ločeno na vsaki strani vsake točke preloma: integral brez deljenja pri skoku bi bil bistveno napačen (na primer \\(0{,}89\\) namesto \\(0{,}98\\) za \\(b_1\\) pri skoku spodaj, kar je izračunano z 16-točkovnim Gauss–Legendrovim pravilom čez cel interval).',
                'The product \\(f\\cdot\\sin kx\\) has positive and negative parts; the coefficient is their signed area divided by \\(\\pi\\). For a function with a corner or a jump the integral is computed exactly piece by piece, separately on each side of every breakpoint: an integral that does not split at the jump would be clearly wrong (for example \\(0.89\\) instead of \\(0.98\\) for \\(b_1\\) of the jump below, computed with a 16-point Gauss–Legendre rule over the whole interval).',
            ),
        },
        {
            id: 'parseval',
            latex: '\\frac1\\pi\\int_{-\\pi}^{\\pi}f(x)^2\\,dx=\\frac{a_0^2}{2}+\\sum_{k=1}^{\\infty}\\left(a_k^2+b_k^2\\right)',
            notation: text(
                'Leva stran je integral kvadrata (dvakratnik povprečja \\(f^2\\) čez periodo, zato ga ne imenujemo srednji kvadrat); desna stran je Parsevalova vsota.',
                'The left side is the integral of the square (twice the mean of \\(f^2\\) over a period, so it is not called the mean square); the right side is the Parseval sum.',
            ),
            explanation: text(
                'Izrek (Parsevalova identiteta): za odsekoma zvezno \\(2\\pi\\)-periodično \\(f\\) je enakost izpolnjena (navedeno, ne odprto). Graf prikaže delno vsoto do izbranega \\(K\\), ki je vedno manjša od integrala kvadrata ali enaka mu. Za pravokotni val, ki ga graf nima, so delne vsote \\(\\sum_{k\\ \\mathrm{lih},\\ k\\le N}16/(\\pi k)^2\\) enake \\(1{,}62114\\), \\(1{,}80127\\), \\(1{,}93261\\), \\(1{,}99205\\) za \\(N=1,3,11,101\\) in se bližajo \\(2\\); to je omenjen primer, ne tisto, kar kaže graf.',
                'Theorem (Parseval\'s identity): for a piecewise continuous \\(2\\pi\\)-periodic \\(f\\) the equality holds (cited, not opened). The graph shows the partial sum up to the chosen \\(K\\), which is never larger than the integral of the square. For the square wave, which the graph does not have, the partial sums \\(\\sum_{k\\ \\mathrm{odd},\\ k\\le N}16/(\\pi k)^2\\) are \\(1.62114\\), \\(1.80127\\), \\(1.93261\\), \\(1.99205\\) for \\(N=1,3,11,101\\) and approach \\(2\\); this is a stated example, not what the graph shows.',
            ),
        },
        {
            id: 'decay-theorem',
            latex: 'f^{(m-1)}\\ \\text{abs. continuous},\\ f^{(m)}\\ \\text{piecewise continuous}\\ \\Longrightarrow\\ |c_k|=O\\!\\left(k^{-(m+1)}\\right)',
            notation: text(
                '\\(c_k\\) je kompleksni koeficient; amplituda \\(A_k=\\sqrt{a_k^2+b_k^2}\\) je njegov dvakratnik. \\(f\\) je \\(2\\pi\\)-periodična.',
                '\\(c_k\\) is the complex coefficient; the amplitude \\(A_k=\\sqrt{a_k^2+b_k^2}\\) is twice its modulus. \\(f\\) is \\(2\\pi\\)-periodic.',
            ),
            explanation: text(
                'Izrek, le v tej smeri: če je \\(f^{(m-1)}\\) absolutno zvezna in \\(f^{(m)}\\) odsekoma zvezna, je \\(|c_k|=O(k^{-(m+1)})\\); analitična periodična funkcija ima geometrijsko pojemanje (Zygmund; Körner; navedeno, ne odprto). Obrata ne trdimo. Naklon, prebran pri končnem \\(k\\), je opažanje na treh primerih, ne zakon: kvadratni val (skok) kaže naklon \\(-1\\), \\(|x|\\) (kot) naklon \\(-2\\), \\(1/(2-\\cos x)\\) pa pojema kot \\(\\tfrac{2}{\\sqrt3}r^k\\), \\(r=2-\\sqrt3\\).',
                'Theorem, this direction only: if \\(f^{(m-1)}\\) is absolutely continuous and \\(f^{(m)}\\) is piecewise continuous, then \\(|c_k|=O(k^{-(m+1)})\\); an analytic periodic function has geometric decay (Zygmund; Körner; cited, not opened). The converse is not claimed. A slope read at a finite \\(k\\) is an observation of three examples, not a law: the square wave (jump) shows the slope \\(-1\\), \\(|x|\\) (corner) the slope \\(-2\\), and \\(1/(2-\\cos x)\\) decays like \\(\\tfrac{2}{\\sqrt3}r^k\\), \\(r=2-\\sqrt3\\).',
            ),
        },
        {
            id: 'm-test',
            latex: '\\sum_{k}|c_k|<\\infty\\ \\Longrightarrow\\ S_N\\to f\\ \\text{uniformly}',
            notation: text(
                '\\(S_N\\) je delna vsota Fourierove vrste.',
                '\\(S_N\\) is the partial sum of the Fourier series.',
            ),
            explanation: text(
                'Izrek (Weierstrassov M-test; navedeno): če je \\(\\sum|c_k|<\\infty\\), vrsta konvergira enakomerno. Za \\(|x|\\) je \\(\\sum4/(\\pi k^2)\\) končna vsota, zato enakomerna konvergenca drži; za pravokotni val je \\(\\sum4/(\\pi k)\\) po lihih \\(k\\) divergentna in enakomerne konvergence res ni (Gibbsov pojav). Obrata ne trdimo in ni splošno resničen: divergentna \\(\\sum|c_k|\\) sama po sebi ne pomeni, da enakomerne konvergence ni.',
                'Theorem (Weierstrass M-test; cited): if \\(\\sum|c_k|<\\infty\\), the series converges uniformly. For \\(|x|\\) the sum \\(\\sum4/(\\pi k^2)\\) is finite, so uniform convergence holds; for the square wave \\(\\sum4/(\\pi k)\\) over odd \\(k\\) diverges and uniform convergence does fail (the Gibbs phenomenon). The converse is not claimed and is not true in general: a divergent \\(\\sum|c_k|\\) does not by itself mean there is no uniform convergence.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'abs-a1',
            title: text('Koeficient \\(a_1\\) funkcije \\(|x|\\)', 'The coefficient \\(a_1\\) of \\(|x|\\)'),
            calculationLatex: 'a_1=\\frac2\\pi\\int_0^\\pi x\\cos x\\,dx=\\frac2\\pi\\Bigl[x\\sin x+\\cos x\\Bigr]_0^\\pi=\\frac2\\pi(-2)',
            resultLatex: '-1{,}27324',
            check: text(
                'Funkcija \\(|x|\\) je soda, zato je \\(b_k=0\\), \\(a_k=\\tfrac2\\pi\\int_0^\\pi x\\cos kx\\,dx\\). Za \\(k=1\\) dobimo \\(-\\tfrac4\\pi=-1{,}27324\\), kar graf prikaže kot koeficient \\(a_1\\). Splošno je \\(a_k=-\\tfrac{4}{\\pi k^2}\\) za lih \\(k\\) in \\(a_k=0\\) za sod \\(k\\).',
                'The function \\(|x|\\) is even, so \\(b_k=0\\) and \\(a_k=\\tfrac2\\pi\\int_0^\\pi x\\cos kx\\,dx\\). For \\(k=1\\) this gives \\(-\\tfrac4\\pi=-1.27324\\), which the graph shows as the coefficient \\(a_1\\). In general \\(a_k=-\\tfrac{4}{\\pi k^2}\\) for odd \\(k\\) and \\(a_k=0\\) for even \\(k\\).',
            ),
        },
        {
            id: 'jump-b1',
            title: text('Koeficient \\(b_1\\) skoka pri \\(x=1\\)', 'The coefficient \\(b_1\\) of the jump at \\(x=1\\)'),
            calculationLatex: 'b_1=\\frac1\\pi\\Bigl[-\\bigl(F(1)-F(-\\pi)\\bigr)+\\bigl(F(\\pi)-F(1)\\bigr)\\Bigr],\\qquad F(x)=-\\cos x',
            resultLatex: '0{,}98059',
            check: text(
                'Funkcija \\(f=\\mathrm{sgn}(x-1)\\) je \\(-1\\) na \\((-\\pi,1)\\) in \\(1\\) na \\((1,\\pi)\\), zato integral razdelimo pri \\(x=1\\). Z \\(F(1)=-\\cos1\\), \\(F(\\pm\\pi)=1\\) je \\(b_1=\\tfrac{2(1+\\cos1)}{\\pi}=0{,}98059\\).',
                'The function \\(f=\\mathrm{sgn}(x-1)\\) is \\(-1\\) on \\((-\\pi,1)\\) and \\(1\\) on \\((1,\\pi)\\), so the integral is split at \\(x=1\\). With \\(F(1)=-\\cos1\\) and \\(F(\\pm\\pi)=1\\) we get \\(b_1=\\tfrac{2(1+\\cos1)}{\\pi}=0.98059\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'coef-overlap', order: 1,
            title: text('Ena harmonika in prekrivanje z obliko', 'One harmonic and its overlap with the shape'),
            purpose: text('Pred razkritjem napovedati predznak koeficienta \\(b_1\\).', 'Predicting, before the reveal, the sign of the coefficient \\(b_1\\).'),
            explanation: text(
                'Graf kaže skok \\(f=\\mathrm{sgn}(x-1)\\), harmonik \\(\\sin x\\) (pikčasto) in njun produkt, osenčen po predznaku. Koeficient \\(b_1\\) je ploščina tega produkta s predznakom, deljena s \\(\\pi\\). Skok je pri \\(x=1\\) in ni v sredini: levo od njega je \\(f=-1\\), desno \\(f=1\\). Na \\((-\\pi,0)\\) sta \\(\\sin x<0\\) in \\(f=-1\\), na \\((1,\\pi)\\) sta \\(\\sin x>0\\) in \\(f=1\\), zato je produkt na teh delih pozitiven; graf izpiše \\(b_1=0{,}98059\\).',
                'The graph shows the jump \\(f=\\mathrm{sgn}(x-1)\\), the harmonic \\(\\sin x\\) (dotted) and their product, shaded by sign. The coefficient \\(b_1\\) is the signed area of this product divided by \\(\\pi\\). The jump is at \\(x=1\\), not in the middle: to its left \\(f=-1\\), to its right \\(f=1\\). On \\((-\\pi,0)\\) we have \\(\\sin x<0\\) and \\(f=-1\\), on \\((1,\\pi)\\) we have \\(\\sin x>0\\) and \\(f=1\\), so the product is positive on these parts; the graph shows \\(b_1=0.98059\\).',
            ),
            formulaIds: ['coefficient-projection'],
            workedExampleId: 'jump-b1',
            observationPrompt: text('Pred razkritjem napovedi, ali je \\(b_1\\) pozitiven; nato preberi vrednost in primerjaj pozitivno in negativno osenčeno območje.', 'Before the reveal predict whether \\(b_1\\) is positive; then read the value and compare the positively and negatively shaded regions.'),
            expectedObservations: [text('\\(b_1=0{,}98059>0\\): pozitivno osenčeno območje je večje od negativnega.', '\\(b_1=0.98059>0\\): the positively shaded region is larger than the negative one.')],
            scene: projection('coef-overlap-scene', 'jump', JUMP_HANDLES, 'b', 1,
                'Skok pri \\(x=1\\), \\(K=16\\), izbran koeficient \\(b_1=0{,}98059\\).',
                'The jump at \\(x=1\\), \\(K=16\\), selected coefficient \\(b_1=0.98059\\).'),
        }),
        step({
            id: 'coef-area', order: 2,
            title: text('Integral kot ploščina s predznakom', 'The integral as signed area'),
            purpose: text('Videti, da se pozitivni in negativni deli produkta \\(f\\sin kx\\) delno odštejejo.', 'Seeing that the positive and negative parts of the product \\(f\\sin kx\\) partly cancel.'),
            explanation: text(
                'Pri \\(k=2\\) harmonik \\(\\sin 2x\\) zamenja predznak sredi vsake polovice intervala. Osenčena območja produkta so zato manjša in pretežno negativna: \\(b_2=-0{,}45077\\), po velikosti manj kot polovica od \\(b_1=0{,}98059\\). Koeficient ni dolžina nobenega ovinka, ampak ploščina s predznakom.',
                'At \\(k=2\\) the harmonic \\(\\sin 2x\\) changes sign in the middle of each half of the interval. The shaded regions of the product are therefore smaller and mostly negative: \\(b_2=-0.45077\\), less than half of \\(b_1=0.98059\\) in size. The coefficient is signed area, not the length of anything.',
            ),
            formulaIds: ['coefficient-projection'],
            observationPrompt: text('Preklopi izbrani harmonik med \\(k=1\\) in \\(k=2\\) in opazuj, katero osenčeno območje prevlada.', 'Switch the selected harmonic between \\(k=1\\) and \\(k=2\\) and watch which shaded region dominates.'),
            expectedObservations: [text('\\(b_2=-0{,}45077<0\\): pri \\(k=2\\) prevlada negativno osenčeno območje.', '\\(b_2=-0.45077<0\\): at \\(k=2\\) the negatively shaded region dominates.')],
            scene: projection('coef-area-scene', 'jump', JUMP_HANDLES, 'b', 2,
                'Skok pri \\(x=1\\), \\(K=16\\), izbran koeficient \\(b_2=-0{,}45077\\).',
                'The jump at \\(x=1\\), \\(K=16\\), selected coefficient \\(b_2=-0.45077\\).'),
        }),
        step({
            id: 'coef-bars', order: 3,
            title: text('Spekter koeficientov kot stolpci', 'The coefficient spectrum as bars'),
            purpose: text('Brati stolpce \\(a_k\\) funkcije \\(|x|\\) in videti, da so sodi stolpci enaki \\(0\\).', 'Reading the bars \\(a_k\\) of \\(|x|\\) and seeing that the even bars are \\(0\\).'),
            explanation: text(
                'Za \\(f=|x|\\) so vsi \\(b_k=0\\), ker je funkcija soda. Spekter koeficientov kaže stolpce \\(a_k\\) za \\(k\\le16\\): \\(a_1=-1{,}27324\\), \\(a_3=-0{,}14147\\), \\(a_5=-0{,}05093\\), vsi sodi \\(a_k\\) so \\(0\\), kar je enako \\(-\\tfrac{4}{\\pi k^2}\\) za lih \\(k\\). Izbrani koeficient je obrobljen, njegova vrednost je v odčitku in v tabeli pod stolpci.',
                'For \\(f=|x|\\) every \\(b_k=0\\), because the function is even. The coefficient spectrum shows the bars \\(a_k\\) for \\(k\\le16\\): \\(a_1=-1.27324\\), \\(a_3=-0.14147\\), \\(a_5=-0.05093\\), and every even \\(a_k\\) is \\(0\\), which equals \\(-\\tfrac{4}{\\pi k^2}\\) for odd \\(k\\). The selected coefficient is outlined, and its value is in the readout and in the table under the bars.',
            ),
            formulaIds: ['coefficient-projection'],
            workedExampleId: 'abs-a1',
            observationPrompt: text('Preberi \\(a_1\\), \\(a_3\\), \\(a_5\\) iz tabele pod stolpci in preveri, da so sodi koeficienti \\(0\\).', 'Read \\(a_1\\), \\(a_3\\), \\(a_5\\) from the table under the bars and check that the even coefficients are \\(0\\).'),
            expectedObservations: [text('\\(a_1=-1{,}27324\\), \\(a_3=-0{,}14147\\), \\(a_5=-0{,}05093\\); \\(a_2=0\\).', '\\(a_1=-1.27324\\), \\(a_3=-0.14147\\), \\(a_5=-0.05093\\); \\(a_2=0\\).')],
            scene: projection('coef-bars-scene', 'abs', ABS_HANDLES, 'a', 1,
                'Funkcija \\(|x|\\), \\(K=16\\), izbran koeficient \\(a_1=-1{,}27324\\).',
                'The function \\(|x|\\), \\(K=16\\), selected coefficient \\(a_1=-1.27324\\).'),
        }),
        step({
            id: 'coef-drag', order: 4,
            title: text('Vlečenje ročice', 'Dragging the handle'),
            purpose: text('Videti, da premik konice spremeni stolpce, ne pa ničelnih sodih koeficientov.', 'Seeing that moving the tip changes the bars, but not the zero even coefficients.'),
            explanation: text(
                'Konico funkcije \\(|x|\\) dvignemo iz \\(0\\) v \\(1\\), robova \\(f(\\pm\\pi)=\\pi\\) ostaneta. Oblika je zdaj \\(1+\\tfrac{\\pi-1}{\\pi}|x|\\): konstanta ne vpliva na \\(a_k\\) pri \\(k\\ge1\\), zato se \\(a_k\\) pomnoži s \\(\\tfrac{\\pi-1}{\\pi}\\). Koeficient \\(a_1\\) se spremeni iz \\(-1{,}27324\\) v \\(-0{,}86795\\), \\(a_3=-0{,}09644\\), \\(a_2\\) pa ostane \\(0\\). Konstantni člen \\(a_0/2\\) se poveča.',
                'We raise the tip of \\(|x|\\) from \\(0\\) to \\(1\\); the ends stay \\(f(\\pm\\pi)=\\pi\\). The shape is now \\(1+\\tfrac{\\pi-1}{\\pi}|x|\\): a constant does not affect \\(a_k\\) for \\(k\\ge1\\), so each \\(a_k\\) is multiplied by \\(\\tfrac{\\pi-1}{\\pi}\\). The coefficient \\(a_1\\) changes from \\(-1.27324\\) to \\(-0.86795\\), \\(a_3=-0.09644\\), while \\(a_2\\) stays \\(0\\). The constant term \\(a_0/2\\) grows.',
            ),
            formulaIds: ['coefficient-projection'],
            observationPrompt: text('Povleci konico gor in dol (ali uporabi tipki ↑ in ↓) in opazuj stolpce \\(a_1\\) in \\(a_3\\).', 'Drag the tip up and down (or use the keys ↑ and ↓) and watch the bars \\(a_1\\) and \\(a_3\\).'),
            expectedObservations: [text('S konico pri \\(1\\) je \\(a_1=-0{,}86795\\), \\(a_3=-0{,}09644\\); stolpci so nižji kot pri konici \\(0\\).', 'With the tip at \\(1\\) we have \\(a_1=-0.86795\\), \\(a_3=-0.09644\\); the bars are lower than with the tip at \\(0\\).')],
            scene: projection('coef-drag-scene', 'abs', [Math.PI, 1], 'a', 1,
                'Konica funkcije \\(|x|\\) pri \\(1\\), \\(K=16\\), izbran koeficient \\(a_1=-0{,}86795\\).',
                'The tip of \\(|x|\\) at \\(1\\), \\(K=16\\), selected coefficient \\(a_1=-0.86795\\).'),
        }),
        step({
            id: 'coef-jump', order: 5,
            title: text('Skok in počasni stolpci', 'A jump and the slow bars'),
            purpose: text('Primerjati spekter skoka s spektrom funkcije \\(|x|\\).', 'Comparing the spectrum of a jump with that of \\(|x|\\).'),
            explanation: text(
                'Pri skoku \\(\\mathrm{sgn}(x-1)\\) stolpci pojemajo počasi: \\(b_1=0{,}98059\\), \\(b_2=-0{,}45077\\), \\(b_5=0{,}16344\\). Tu so neničelni tudi sodi koeficienti, ker skok ni v simetrični točki. Pri \\(|x|\\) je \\(a_5=-0{,}05093\\), pri skoku pa je že \\(b_5\\) več kot trikrat večji po velikosti. Zato delna vsota ob skoku potrebuje veliko členov (Gibbsov pojav).',
                'For the jump \\(\\mathrm{sgn}(x-1)\\) the bars decay slowly: \\(b_1=0.98059\\), \\(b_2=-0.45077\\), \\(b_5=0.16344\\). The even coefficients are not zero here, because the jump is not at a symmetric point. For \\(|x|\\) we have \\(a_5=-0.05093\\), while for the jump \\(b_5\\) is already more than three times larger in size. This is why a partial sum needs many terms near a jump (the Gibbs phenomenon).',
            ),
            formulaIds: ['coefficient-projection'],
            workedExampleId: 'jump-b1',
            observationPrompt: text('Preberi \\(b_1\\), \\(b_2\\), \\(b_5\\) iz tabele in jih primerjaj z \\(a_1\\), \\(a_3\\), \\(a_5\\) funkcije \\(|x|\\).', 'Read \\(b_1\\), \\(b_2\\), \\(b_5\\) from the table and compare them with \\(a_1\\), \\(a_3\\), \\(a_5\\) of \\(|x|\\).'),
            expectedObservations: [text('\\(b_5=0{,}16344\\) pri skoku, \\(a_5=-0{,}05093\\) pri \\(|x|\\): skok pojema počasneje.', '\\(b_5=0.16344\\) for the jump, \\(a_5=-0.05093\\) for \\(|x|\\): the jump decays more slowly.')],
            scene: projection('coef-jump-scene', 'jump', JUMP_HANDLES, 'b', 5,
                'Skok pri \\(x=1\\), \\(K=16\\), izbran koeficient \\(b_5=0{,}16344\\).',
                'The jump at \\(x=1\\), \\(K=16\\), selected coefficient \\(b_5=0.16344\\).'),
        }),
        step({
            id: 'coef-parseval', order: 6,
            title: text('Parsevalova identiteta', 'Parseval\'s identity'),
            purpose: text('Primerjati integral kvadrata s Parsevalovo vsoto.', 'Comparing the integral of the square with the Parseval sum.'),
            explanation: text(
                'Za \\(f=|x|\\) je integral kvadrata \\(\\tfrac1\\pi\\int_{-\\pi}^{\\pi}x^2\\,dx=\\tfrac{2\\pi^2}{3}=6{,}57974\\). Graf izpiše tudi Parsevalovo vsoto \\(\\tfrac{a_0^2}{2}+\\sum_{k\\le K}(a_k^2+b_k^2)\\) za izbrani \\(K=16\\): \\(6{,}57967\\), le malo pod integralom. Parsevalova identiteta je izrek, ki ga navajamo: z večanjem \\(K\\) se vsota bliža integralu. Kvadratni val, ki ga graf nima, je omenjen primer v formuli.',
                'For \\(f=|x|\\) the integral of the square is \\(\\tfrac1\\pi\\int_{-\\pi}^{\\pi}x^2\\,dx=\\tfrac{2\\pi^2}{3}=6.57974\\). The graph also shows the Parseval sum \\(\\tfrac{a_0^2}{2}+\\sum_{k\\le K}(a_k^2+b_k^2)\\) for the chosen \\(K=16\\): \\(6.57967\\), a little below the integral. Parseval\'s identity is a theorem that we cite: as \\(K\\) grows the sum approaches the integral. The square wave, which the graph does not have, is a stated example in the formula.',
            ),
            formulaIds: ['parseval'],
            observationPrompt: text('Preberi oba odčitka pri \\(K=16\\), zmanjšaj \\(K\\) in opazuj vsoto. Nato izberi skok: integral kvadrata je \\(2\\), vsota pri \\(K=16\\) pa \\(1{,}95204\\).', 'Read both readouts at \\(K=16\\), lower \\(K\\) and watch the sum. Then choose the jump: the integral of the square is \\(2\\) and the sum at \\(K=16\\) is \\(1.95204\\).'),
            expectedObservations: [text('\\(6{,}57974\\) in \\(6{,}57967\\): vsota je pod integralom in se mu z večanjem \\(K\\) bliža; pri skoku sta \\(2\\) in \\(1{,}95204\\).', '\\(6.57974\\) and \\(6.57967\\): the sum is below the integral and approaches it as \\(K\\) grows; for the jump they are \\(2\\) and \\(1.95204\\).')],
            scene: projection('coef-parseval-scene', 'abs', ABS_HANDLES, 'a', 1,
                'Funkcija \\(|x|\\), \\(K=16\\): integral kvadrata \\(6{,}57974\\), Parsevalova vsota \\(6{,}57967\\).',
                'The function \\(|x|\\), \\(K=16\\): integral of the square \\(6.57974\\), Parseval sum \\(6.57967\\).'),
        }),
        step({
            id: 'coef-explore', order: 7,
            title: text('Prosto raziskovanje: projekcije', 'Free exploration: projections'),
            purpose: text('Sestaviti lastno lomljenko in opazovati spekter.', 'Building one\'s own broken line and watching the spectrum.'),
            explanation: text(
                'Izbrana je prosta lomljenka s petimi ročicami; vse so prosto vlečljive. Spremeni jih in opazuj stolpce, izbrani koeficient in oba odčitka. Poskusi: katere lomljenke imajo vse \\(b_k=0\\)? Kaj se zgodi s šivom pri \\(x=\\pm\\pi\\), če se vrednosti na robovih ne ujemata? Izbira oblike ponastavi ročice, zato najprej izberi obliko, nato vleci.',
                'A free broken line with five handles is chosen; all of them can be dragged. Change them and watch the bars, the selected coefficient and both readouts. Try: which broken lines have every \\(b_k=0\\)? What happens at the seam \\(x=\\pm\\pi\\) when the values at the ends do not match? Choosing a shape resets the handles, so choose the shape first and then drag.',
            ),
            formulaIds: ['coefficient-projection', 'parseval'],
            observationPrompt: text('Poskusi sestaviti sodo funkcijo in preveri, da so vsi \\(b_k\\) enaki \\(0\\).', 'Try to build an even function and check that every \\(b_k\\) is \\(0\\).'),
            expectedObservations: [text('Soda lomljenka ima vse \\(b_k=0\\), liha vse \\(a_k=0\\) (razen morebitnega \\(a_0\\)).', 'An even broken line has every \\(b_k=0\\), an odd one every \\(a_k=0\\) (apart from a possible \\(a_0\\)).')],
            scene: projection('coef-explore-scene', 'free', [0, 1, 2, 1, 0], 'a', 1,
                'Prosta lomljenka z vrednostmi \\(0,1,2,1,0\\), \\(K=16\\); vse je prosto za raziskovanje.',
                'A free broken line with the values \\(0,1,2,1,0\\), \\(K=16\\); everything is free to explore.'),
        }),
        step({
            id: 'decay-three', order: 8,
            title: text('Tri funkcije, trije spektri', 'Three functions, three spectra'),
            purpose: text('Pred razkritjem napovedati, katera funkcija ima najhitreje pojemajoče koeficiente.', 'Predicting, before the reveal, which function has the fastest decaying coefficients.'),
            explanation: text(
                'Pogled pojemanja kaže amplitude \\(A_k\\) za kvadratni val (skok), \\(|x|\\) (kot) in \\(\\dfrac1{2-\\cos x}\\) (gladka, celo analitična funkcija) hkrati, do \\(N=11\\). Črtkane krivulje so referenčne: \\(c/k\\), \\(c/k^2\\) in \\(c\\,r^k\\). Gladkejša funkcija ima pričakovano hitreje pojemajoče stolpce; izrek o tem je v naslednjih korakih.',
                'The decay view shows the amplitudes \\(A_k\\) for the square wave (a jump), \\(|x|\\) (a corner) and \\(\\dfrac1{2-\\cos x}\\) (smooth, even analytic) together, up to \\(N=11\\). The dashed curves are references: \\(c/k\\), \\(c/k^2\\) and \\(c\\,r^k\\). The smoother function is expected to have faster decaying bars; the theorem on that is in the next steps.',
            ),
            formulaIds: ['decay-theorem'],
            observationPrompt: text('Pred razkritjem napovedi, kateri od treh spektrov izgine najhitreje, nato primerjaj stolpce pri \\(k=9\\) in \\(k=11\\).', 'Before the reveal predict which of the three spectra vanishes fastest, then compare the bars at \\(k=9\\) and \\(k=11\\).'),
            expectedObservations: [text('Pri \\(k=11\\) so stolpci kvadratnega vala največji, funkcije \\(|x|\\) manjši, gladke funkcije komaj vidni.', 'At \\(k=11\\) the bars of the square wave are the largest, those of \\(|x|\\) smaller, those of the smooth function barely visible.')],
            scene: decay('decay-three-scene', 11, 'linear', DEFAULT_SELECTIONS,
                'Pogled pojemanja, kvadratni val, \\(|x|\\) in gladka funkcija, linearno merilo, \\(N=11\\).',
                'The decay view, the square wave, \\(|x|\\) and the smooth function, linear scale, \\(N=11\\).'),
        }),
        step({
            id: 'decay-square', order: 9,
            title: text('Kvadratni val: približno \\(1/k\\)', 'The square wave: about \\(1/k\\)'),
            purpose: text('Brati stolpce, ki pojemajo kot \\(1/k\\), in ničle pri sodih \\(k\\).', 'Reading bars that decay like \\(1/k\\), and the zeros at even \\(k\\).'),
            explanation: text(
                'Pri kvadratnem valu je \\(|b_k|=\\tfrac{4}{\\pi k}\\) za lih \\(k\\): \\(b_{11}=0{,}11575\\), \\(b_{101}=0{,}01261\\). Od \\(k=11\\) do \\(k=101\\) se amplituda zmanjša le za faktor \\(\\tfrac{101}{11}=9{,}18\\), naklon \\(\\log|c_k|\\) proti \\(\\log k\\) je med njima \\(-1\\). Sodi koeficienti so \\(0\\) in so narisani kot ničle, ne izpuščeni. To je opažanje na enem primeru.',
                'For the square wave \\(|b_k|=\\tfrac{4}{\\pi k}\\) for odd \\(k\\): \\(b_{11}=0.11575\\), \\(b_{101}=0.01261\\). From \\(k=11\\) to \\(k=101\\) the amplitude shrinks only by the factor \\(\\tfrac{101}{11}=9.18\\); the slope of \\(\\log|c_k|\\) against \\(\\log k\\) between them is \\(-1\\). The even coefficients are \\(0\\) and are drawn as zero, not omitted. This is an observation of one example.',
            ),
            formulaIds: ['decay-theorem'],
            observationPrompt: text('Preberi stolpca pri \\(k=11\\) in \\(k=101\\) in preveri, da ju črtkana krivulja \\(c/k\\) objame.', 'Read the bars at \\(k=11\\) and \\(k=101\\) and check that the dashed curve \\(c/k\\) matches them.'),
            expectedObservations: [text('\\(b_{11}=0{,}11575\\), \\(b_{101}=0{,}01261\\); razmerje \\(9{,}18\\), naklon \\(-1\\).', '\\(b_{11}=0.11575\\), \\(b_{101}=0.01261\\); ratio \\(9.18\\), slope \\(-1\\).')],
            scene: decay('decay-square-scene', 101, 'linear', DEFAULT_SELECTIONS,
                'Pogled pojemanja, linearno merilo, \\(N=101\\): kvadratni val ima \\(b_{11}=0{,}11575\\), \\(b_{101}=0{,}01261\\).',
                'The decay view, linear scale, \\(N=101\\): the square wave has \\(b_{11}=0.11575\\), \\(b_{101}=0.01261\\).'),
        }),
        step({
            id: 'decay-abs', order: 10,
            title: text('Funkcija \\(|x|\\): približno \\(1/k^2\\)', 'The function \\(|x|\\): about \\(1/k^2\\)'),
            purpose: text('Videti, da kot daje hitrejše pojemanje kot skok.', 'Seeing that a corner gives faster decay than a jump.'),
            explanation: text(
                'Pri \\(|x|\\) je \\(|a_k|=\\tfrac{4}{\\pi k^2}\\) za lih \\(k\\): \\(a_{11}=0{,}01052\\), \\(a_{101}=0{,}000125\\). Amplituda se od \\(k=11\\) do \\(k=101\\) zmanjša za faktor \\(\\left(\\tfrac{101}{11}\\right)^2=84{,}31\\), naklon je \\(-2\\). Funkcija je zvezna, njen odvod pa ima skok, kar ustreza izreku pri \\(m=1\\): \\(|c_k|=O(k^{-2})\\). Naklon, prebran pri končnem \\(k\\), je opažanje, ne zakon.',
                'For \\(|x|\\) we have \\(|a_k|=\\tfrac{4}{\\pi k^2}\\) for odd \\(k\\): \\(a_{11}=0.01052\\), \\(a_{101}=0.000125\\). From \\(k=11\\) to \\(k=101\\) the amplitude shrinks by the factor \\(\\left(\\tfrac{101}{11}\\right)^2=84.31\\), the slope is \\(-2\\). The function is continuous and its derivative has a jump, which matches the theorem with \\(m=1\\): \\(|c_k|=O(k^{-2})\\). A slope read at a finite \\(k\\) is an observation, not a law.',
            ),
            formulaIds: ['decay-theorem'],
            observationPrompt: text('Preberi stolpca pri \\(k=11\\) in \\(k=101\\) in ju primerjaj s kvadratnim valom.', 'Read the bars at \\(k=11\\) and \\(k=101\\) and compare them with the square wave.'),
            expectedObservations: [text('\\(a_{11}=0{,}01052\\), \\(a_{101}=0{,}000125\\); razmerje \\(84{,}31\\), naklon \\(-2\\).', '\\(a_{11}=0.01052\\), \\(a_{101}=0.000125\\); ratio \\(84.31\\), slope \\(-2\\).')],
            scene: decay('decay-abs-scene', 101, 'linear', DEFAULT_SELECTIONS,
                'Pogled pojemanja, linearno merilo, \\(N=101\\): funkcija \\(|x|\\) ima \\(a_{11}=0{,}01052\\), \\(a_{101}=0{,}000125\\).',
                'The decay view, linear scale, \\(N=101\\): the function \\(|x|\\) has \\(a_{11}=0.01052\\), \\(a_{101}=0.000125\\).'),
        }),
        step({
            id: 'decay-smooth', order: 11,
            title: text('Gladka funkcija: geometrijsko pojemanje', 'The smooth function: geometric decay'),
            purpose: text('Videti, da stolpci izginejo po približno \\(k=10\\).', 'Seeing that the bars vanish after about \\(k=10\\).'),
            explanation: text(
                'Za \\(g(x)=\\dfrac1{2-\\cos x}\\) je \\(a_k=\\tfrac{2}{\\sqrt3}r^k\\), \\(r=2-\\sqrt3=0{,}26795\\), torej se vsak stolpec pomnoži z \\(r\\): \\(a_1=0{,}30940\\), \\(a_2=0{,}08290\\), \\(a_5=0{,}00159\\), \\(a_{10}=2{,}2029\\cdot10^{-6}\\). Po \\(k\\approx10\\) stolpcev ni več videti. Analitična periodična funkcija ima geometrijsko pojemanje (izrek, navedeno).',
                'For \\(g(x)=\\dfrac1{2-\\cos x}\\) we have \\(a_k=\\tfrac{2}{\\sqrt3}r^k\\), \\(r=2-\\sqrt3=0.26795\\), so each bar is the previous one multiplied by \\(r\\): \\(a_1=0.30940\\), \\(a_2=0.08290\\), \\(a_5=0.00159\\), \\(a_{10}=2.2029\\cdot10^{-6}\\). After \\(k\\approx10\\) the bars can no longer be seen. An analytic periodic function has geometric decay (theorem, cited).',
            ),
            formulaIds: ['decay-theorem'],
            observationPrompt: text('Preberi \\(a_1\\), \\(a_2\\), \\(a_5\\) in poišči \\(k\\), od katerega naprej stolpec ni več viden.', 'Read \\(a_1\\), \\(a_2\\), \\(a_5\\) and find the \\(k\\) from which on a bar is no longer visible.'),
            expectedObservations: [text('\\(a_1=0{,}30940\\), \\(a_2=0{,}08290\\), \\(a_5=0{,}00159\\); razmerje zaporednih stolpcev je \\(r=0{,}26795\\).', '\\(a_1=0.30940\\), \\(a_2=0.08290\\), \\(a_5=0.00159\\); the ratio of consecutive bars is \\(r=0.26795\\).')],
            scene: decay('decay-smooth-scene', 11, 'linear', DEFAULT_SELECTIONS,
                'Pogled pojemanja, linearno merilo, \\(N=11\\): gladka funkcija ima \\(a_1=0{,}30940\\), \\(a_2=0{,}08290\\), \\(a_5=0{,}00159\\).',
                'The decay view, linear scale, \\(N=11\\): the smooth function has \\(a_1=0.30940\\), \\(a_2=0.08290\\), \\(a_5=0.00159\\).'),
        }),
        step({
            id: 'decay-log', order: 12,
            title: text('Logaritemsko merilo', 'The logarithmic scale'),
            purpose: text('Brati hitrost pojemanja z logaritemske osi.', 'Reading the rate of decay off a logarithmic axis.'),
            explanation: text(
                'Na logaritemski navpični osi se razlike v velikostnem redu vidijo. Pri kvadratnem valu sodi \\(k\\) niso narisani: \\(\\log0\\) ni definiran, zato jih graf ne riše in to tudi napiše. Amplitude pod \\(10^{-8}\\) so na dnu osi z opombo; pri gladki funkciji je \\(a_{14}\\approx1{,}1355\\cdot10^{-8}\\) še nad mejo, \\(a_{15}\\approx3{,}0427\\cdot10^{-9}\\) pa že pod njo. Naklone \\(-1\\) in \\(-2\\) (med \\(k=11\\) in \\(k=101\\), lihi \\(k\\)) beremo kot opažanje pri dveh primerih.',
                'On a logarithmic vertical axis differences of order of magnitude become visible. For the square wave the even \\(k\\) are not drawn: \\(\\log0\\) is undefined, so the graph does not draw it and says so. Amplitudes below \\(10^{-8}\\) sit on the floor of the axis with a note; for the smooth function \\(a_{14}\\approx1.1355\\cdot10^{-8}\\) is still above the limit and \\(a_{15}\\approx3.0427\\cdot10^{-9}\\) already below it. The slopes \\(-1\\) and \\(-2\\) (between \\(k=11\\) and \\(k=101\\), odd \\(k\\)) are read as an observation of two examples.',
            ),
            formulaIds: ['decay-theorem'],
            observationPrompt: text('Preklopi med linearnim in logaritemskim merilom in poišči ničle kvadratnega vala ter stolpce na dnu osi.', 'Switch between the linear and the logarithmic scale and find the zeros of the square wave and the bars on the floor of the axis.'),
            expectedObservations: [text('V logaritemskem merilu so sodi \\(k\\) kvadratnega vala izpuščeni z opombo, gladka funkcija je od \\(k=15\\) na dnu osi.', 'On the logarithmic scale the even \\(k\\) of the square wave are left out with a note, and the smooth function is on the floor of the axis from \\(k=15\\).')],
            scene: decay('decay-log-scene', 101, 'log', DEFAULT_SELECTIONS,
                'Pogled pojemanja, logaritemsko merilo, \\(N=101\\).',
                'The decay view, logarithmic scale, \\(N=101\\).'),
        }),
        step({
            id: 'decay-sup', order: 13,
            title: text('Napaka in enakomerna konvergenca', 'The error and uniform convergence'),
            purpose: text('Povezati pojemanje koeficientov z napako \\(\\sup|f-S_N|\\) in M-testom.', 'Linking the decay of the coefficients to the error \\(\\sup|f-S_N|\\) and the M-test.'),
            explanation: text(
                'Odčitek kaže supremum napake \\(\\sup|f-S_{11}|\\) na mreži z 20001 točkami; točke skoka so izključene, sosednje mrežne točke pa ne. Za \\(|x|\\) je \\(0{,}05293\\), kar je enako repu \\(\\sum_{k\\ge13,\\ \\mathrm{lih}}\\tfrac{4}{\\pi k^2}\\), ker je maksimum v kotu. Za kvadratni val je \\(0{,}99760\\), blizu \\(1\\), in se z večanjem \\(N\\) ne približa \\(0\\): pri \\(N=101\\) je še \\(0{,}97960\\) (Gibbsov pojav). Gladka funkcija ima napako pod \\(10^{-5}\\). Povezava s koeficienti je le izrek M-testa: \\(\\sum|c_k|<\\infty\\) pomeni enakomerno konvergenco. Obrata ne trdimo.',
                'The readout shows the supremum error \\(\\sup|f-S_{11}|\\) on a grid of 20001 points; the jump points are excluded, the neighbouring grid points are not. For \\(|x|\\) it is \\(0.05293\\), equal to the tail \\(\\sum_{k\\ge13,\\ \\mathrm{odd}}\\tfrac{4}{\\pi k^2}\\), because the maximum is at the corner. For the square wave it is \\(0.99760\\), close to \\(1\\), and does not approach \\(0\\) as \\(N\\) grows: at \\(N=101\\) it is still \\(0.97960\\) (the Gibbs phenomenon). The smooth function has an error below \\(10^{-5}\\). The only link to the coefficients is the M-test theorem: \\(\\sum|c_k|<\\infty\\) means uniform convergence. The converse is not claimed.',
            ),
            formulaIds: ['m-test'],
            observationPrompt: text('Spremeni \\(N\\) in opazuj, katera napaka pada in katera ne.', 'Change \\(N\\) and watch which error falls and which does not.'),
            expectedObservations: [text('Pri \\(N=11\\): \\(|x|\\) ima \\(0{,}05293\\), kvadratni val \\(0{,}99760\\); samo prva napaka pada z \\(N\\).', 'At \\(N=11\\): \\(|x|\\) has \\(0.05293\\), the square wave \\(0.99760\\); only the first error falls with \\(N\\).')],
            scene: decay('decay-sup-scene', 11, 'linear', DEFAULT_SELECTIONS,
                'Pogled pojemanja, linearno merilo, \\(N=11\\): supremum napake \\(0{,}99760\\) (kvadratni val) in \\(0{,}05293\\) (\\(|x|\\)).',
                'The decay view, linear scale, \\(N=11\\): supremum error \\(0.99760\\) (square wave) and \\(0.05293\\) (\\(|x|\\)).'),
        }),
        step({
            id: 'decay-explore', order: 14,
            title: text('Prosto raziskovanje: pojemanje', 'Free exploration: decay'),
            purpose: text('Zamenjati primer in primerjati pojemanje.', 'Swapping an example and comparing the decay.'),
            explanation: text(
                'Namesto kvadratnega vala je izbran žagasti val; izbereš lahko katere koli tri različne primere izmed petih (kvadratni val, žagasti val, \\(|x|\\), skok, gladka funkcija). Zamenjava je mogoča le, če se primer ne podvoji: najprej izberi prost primer. Poskusi: ali ima žagasti val za razliko od kvadratnega neničelne tudi sode koeficiente? Naklon je opažanje na izbranih primerih, ne zakon.',
                'The sawtooth is chosen instead of the square wave; you can pick any three different examples out of five (the square wave, the sawtooth, \\(|x|\\), the jump, the smooth function). A swap works only when the example is not duplicated: first choose a free example. Try: unlike the square wave, does the sawtooth also have nonzero even coefficients? A slope is an observation of the chosen examples, not a law.',
            ),
            formulaIds: ['decay-theorem', 'm-test'],
            observationPrompt: text('Zamenjaj primer in primerjaj pojemanje; preveri, da gladka funkcija ostaja najhitrejša.', 'Swap an example and compare the decay; check that the smooth function stays the fastest.'),
            expectedObservations: [text('Žagasti val ima skok in pojema približno kot \\(1/k\\), gladka funkcija pojema geometrijsko.', 'The sawtooth has a jump and decays about like \\(1/k\\), the smooth function decays geometrically.')],
            scene: decay('decay-explore-scene', 21, 'log', ['sawtooth', 'abs', 'smooth'],
                'Pogled pojemanja, logaritemsko merilo, \\(N=21\\), žagasti val, \\(|x|\\) in gladka funkcija; vse je prosto za raziskovanje.',
                'The decay view, logarithmic scale, \\(N=21\\), the sawtooth, \\(|x|\\) and the smooth function; everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'zygmund-trigonometric-series',
            citation: 'Zygmund, A. Trigonometric Series, 3rd ed., vol. I, Cambridge University Press, 2002: Fourier coefficients, Parseval\'s identity, and the decay of coefficients of functions with absolutely continuous derivatives. Cited, not opened.',
        },
        {
            id: 'koerner-fourier-analysis',
            citation: 'Körner, T. W. Fourier Analysis, Cambridge University Press, 1988: the decay of Fourier coefficients of smooth and analytic periodic functions, and the Weierstrass M-test for the uniform convergence of Fourier series. Cited, not opened.',
        },
        {
            id: 'bezeg-fourier-coefficients-implementation',
            citation: 'Bezeg source: src/analysis/fourierCoefficientsModel.ts, src/analysis/fourier.ts, src/analysis/fourierDecay.ts and src/graphs/functions/FourierCoefficientsGraph.tsx.',
            implementationCorrespondence: 'The coefficients are computed by exact integration piece by piece, splitting at every breakpoint; the Parseval sum is taken up to K; the decay view draws amplitudes for k up to N, with the supremum error on a 20001-node grid that excludes the jump points but includes their neighbours. A scene sets the view, the layout and its handles, K, the selected coefficient, the three decay examples, N and the scale.',
        },
    ],
    edgeCases: [
        text('Pri funkciji \\(|x|\\) so vsi \\(b_k=0\\), pri skoku pri \\(x=1\\) niso; \\(b_0\\) ne obstaja, zato za \\(k=0\\) graf izbere \\(a_0\\) in prikaže konstantni člen \\(a_0/2\\).', 'For \\(|x|\\) every \\(b_k=0\\), for the jump at \\(x=1\\) they are not; \\(b_0\\) does not exist, so for \\(k=0\\) the graph selects \\(a_0\\) and shows the constant term \\(a_0/2\\).'),
        text('Največji harmonik \\(K\\) ne sme biti manjši od izbranega \\(k\\), zato ga scena najprej zniža; izbira oblike ponastavi ročice, zato scena po izbiri oblike nastavi vse ročice.', 'The largest harmonic \\(K\\) may not be smaller than the selected \\(k\\), so a scene lowers \\(k\\) first; choosing a shape resets the handles, so a scene sets every handle after choosing the shape.'),
        text('Tri izbrane funkcije v pogledu pojemanja morajo biti različne; Parsevalova identiteta, izrek o pojemanju in M-test so navedeni, ne dokazani, obrata M-testa pa ne trdimo.', 'The three chosen functions in the decay view must be different; Parseval\'s identity, the decay theorem and the M-test are cited, not proved, and the converse of the M-test is not claimed.'),
    ],
    unresolvedQuestions: [],
};

export const fourierCoefficientsGuidedLessons: readonly GuidedLesson[] = [coefficientsLesson];
