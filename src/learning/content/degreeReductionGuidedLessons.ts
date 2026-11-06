/**
 * Guided lesson of the degree-reduction Demonstration (docs/specs/advanced-bezier-lessons.md, D1). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `degreeReductionGuidedLessons.test.tsx` checks that against the real graph and the kernel in
 * `src/bezeg/impl/kernels/degree-reduction.ts`. Scenes use `reduction-points`, `reduction-mode` and `curve-visibility`
 * (`reduction-quadratic`, `reduction-elevation`).
 */
import type {LessonAction, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** Low on the board: the lesson panel covers its upper part and the readout caption sits at the top, so the curves (y from 0 to 4.5) stay below. */
export const REDUCTION_LESSON_VIEW: LessonViewBox = [-1.5, 9.5, 5.5, -1.5];

/** The spec's cubics. The elevated quadratic is the graph's default; P has third difference (-2, 0), P2 has (-2, 12). */
export const REDUCTION_LESSON_ELEVATED: ReadonlyArray<readonly [number, number]> = [[0, 0], [4 / 3, 8 / 3], [8 / 3, 8 / 3], [4, 0]];
export const REDUCTION_LESSON_P: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 3], [3, 3], [4, 0]];
export const REDUCTION_LESSON_P2: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 4], [3, 1], [4, 3]];

/**
 * A scene of the degree-reduction graph. The four control points, the mode and both switches are always set, so a scene does not
 * lean on an earlier one: any step reached by jump or backward navigation gives the same state.
 */
const reductionScene = (
    id: string, points: ReadonlyArray<readonly [number, number]>, mode: 'fixed' | 'free', shown: {quadratic: boolean; elevation: boolean},
    sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'reduction-points', points},
        {kind: 'reduction-mode', mode},
        {kind: 'curve-visibility', target: 'reduction-quadratic', visible: shown.quadratic},
        {kind: 'curve-visibility', target: 'reduction-elevation', visible: shown.elevation},
    ];
    return {id, basedOn: 'demonstration-default', view: REDUCTION_LESSON_VIEW, actions, expectedState: text(sl, en)};
};

const degreeReductionLesson: GuidedLesson = {
    demonstrationId: 'reduction',
    title: text('Nižanje stopnje', 'Degree reduction'),
    summary: text(
        'Zvišanje stopnje je točno: ista krivulja z eno kontrolno točko več. Obratno na splošno ne gre: kubična krivulja je kvadratna natanko tedaj, ko je njena tretja diferenca \\(b_3-3b_2+3b_1-b_0\\) enaka nič. Sicer jo kvadratna krivulja le približa, "najboljša" pa je odvisna od norme in od pogojev, na primer od fiksnih krajišč, zato odgovor ni en sam. Če tretja diferenca ni nič, optimum ni nikoli točen, "nižljiva" pa pomeni, da je tretja diferenca nič v okviru tolerance \\(10^{-9}\\).',
        'Elevation is exact: the same curve with one more control point. The reverse does not work in general: a cubic is a quadratic exactly when its third difference \\(b_3-3b_2+3b_1-b_0\\) is zero. Otherwise a quadratic can only approximate it, and "the best" one depends on the norm and on the constraints, for example fixed end points, so the answer is not unique. Unless the third difference is zero, the optimum is never exact, and "reducible" means that the third difference is zero within the tolerance \\(10^{-9}\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje poglavja o Bézierjevih krivuljah in zvišanja stopnje (pot /bezier/elevation).', 'Assumes the Bézier chapter and degree elevation (the route /bezier/elevation).'),
    ],
    learningGoals: [
        text('Veš, da je zvišanje stopnje točno, nižanje pa na splošno ne, in da je kubična krivulja kvadratna natanko tedaj, ko je tretja diferenca nič.', 'Know that elevation is exact but reduction is not in general, and that a cubic is a quadratic exactly when the third difference is zero.'),
        text('Poveš, da je "najboljša" kvadratna krivulja najboljša glede na normo in pogoje (krajišči fiksni ali prosti), druga izbira pa da drugo krivuljo.', 'Say that "the best" quadratic is best for a norm and constraints (fixed or free end points), and that another choice gives another curve.'),
        text('Primerjaš napako \\(L^2\\), največjo napako in mejo iz kontrolnih točk ter veš, da meja ni nikoli manjša od prave največje napake.', 'Compare the \\(L^2\\) error, the maximum error and the control-point bound, and know that the bound is never smaller than the true maximum error.'),
    ],
    formulaBlocks: [
        {
            id: 'reduction-third-difference',
            latex: 'b_3-3b_2+3b_1-b_0=0',
            notation: text(
                '\\(b_0,\\dots,b_3\\) so kontrolne točke kubične krivulje; razlika je vektor z dvema komponentama.',
                '\\(b_0,\\dots,b_3\\) are the control points of the cubic; the difference is a vector with two components.',
            ),
            explanation: text(
                'Kubična krivulja je zvišana kvadratna natanko tedaj, ko je tretja diferenca nič. V aplikaciji velja za nič, kadar je nič v okviru tolerance \\(10^{-9}\\) glede na velikost kontrolnih točk; to je numerična odločitev, ne algebrski dokaz.',
                'A cubic is an elevated quadratic exactly when the third difference is zero. In the app it counts as zero when it is zero within the tolerance \\(10^{-9}\\) relative to the size of the control points; that is a numerical decision, not an algebraic proof.',
            ),
        },
        {
            id: 'reduction-norms',
            latex: '\\|e\\|_2=\\Bigl(\\int_0^1|B(t)-Q(t)|^2\\,dt\\Bigr)^{1/2},\\qquad \\max_{0\\le t\\le1}|B(t)-Q(t)|',
            notation: text(
                '\\(B\\) je kubična krivulja, \\(Q\\) kvadratna. Prva količina je napaka \\(L^2\\), druga največja napaka; največja napaka je v aplikaciji vzorčena, zato je zanesljiva le na štiri decimalke.',
                '\\(B\\) is the cubic, \\(Q\\) the quadratic. The first quantity is the \\(L^2\\) error, the second the maximum error; the maximum error is sampled in the app, so only four decimals are reliable.',
            ),
            explanation: text(
                'Najboljša kvadratna krivulja tu pomeni najmanjšo napako \\(L^2\\), ne najmanjše največje napake. Če izberemo drugo normo (na primer najmanjšo največjo napako) ali drug pogoj (na primer ohranjeno tangento), dobimo drugo kvadratno krivuljo.',
                'The best quadratic here means the smallest \\(L^2\\) error, not the smallest maximum error. If another norm (for example the smallest maximum error) or another constraint (for example a preserved tangent) is chosen, another quadratic results.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'reduction-third-difference-example',
            title: text('Tretja diferenca kubične krivulje \\(P\\)', 'The third difference of the cubic \\(P\\)'),
            calculationLatex: 'b_3-3b_2+3b_1-b_0=(4,0)-3(3,3)+3(1,3)-(0,0)',
            resultLatex: '(-2,\\;0)',
            check: text(
                'Prva komponenta je \\(4-9+3-0=-2\\), druga \\(0-9+9-0=0\\). Polje Tretja diferenca v podoknu Orodja pokaže \\((-2;\\ 0)\\) in izpiše, da krivulja ni nižljiva.',
                'The first component is \\(4-9+3-0=-2\\), the second \\(0-9+9-0=0\\). The Third difference readout in the Tools panel shows \\((-2;\\ 0)\\) and says that the curve is not reducible.',
            ),
        },
        {
            id: 'reduction-forrest-example',
            title: text('Najboljša srednja točka s fiksnima krajiščema', 'The best middle point with fixed end points'),
            calculationLatex: 'q_1=\\tfrac14\\bigl(3(b_1+b_2)-b_0-b_3\\bigr)=\\tfrac14\\bigl(3(4,6)-(0,0)-(4,0)\\bigr)',
            resultLatex: 'q_1=\\bigl(2,\\;\\tfrac92\\bigr)',
            check: text(
                'Vsota \\(b_1+b_2=(4,6)\\), torej \\(\\tfrac14\\bigl((12,18)-(4,0)\\bigr)=(2;\\ 4{,}5)\\). To je optimum norme \\(L^2\\) pri fiksnih krajiščih, kar ujema s Forrestovo formulo; ni pa edina možna kvadratna krivulja.',
                'The sum \\(b_1+b_2=(4,6)\\), so \\(\\tfrac14\\bigl((12,18)-(4,0)\\bigr)=(2;\\ 4.5)\\). This is the \\(L^2\\) optimum with fixed end points, which agrees with Forrest\'s formula; it is not the only possible quadratic.',
            ),
        },
    ],
    steps: [
        {
            id: 'reduction-elevated', order: 1,
            title: text('Zvišana kvadratna krivulja', 'An elevated quadratic'),
            purpose: text('Videti, da je zvišanje stopnje točno: kubična krivulja je ista krivulja kot kvadratna.', 'Seeing that elevation is exact: the cubic is the same curve as the quadratic.'),
            explanation: text(
                'Kubična krivulja s kontrolnimi točkami \\((0,0)\\), \\((\\tfrac43,\\tfrac83)\\), \\((\\tfrac83,\\tfrac83)\\), \\((4,0)\\) je kvadratna krivulja \\((0,0)\\), \\((2,4)\\), \\((4,0)\\), zvišana za eno stopnjo: ista krivulja, zapisana s štirimi točkami. Nižana kvadratna krivulja leži natanko na njej, njena zvišana mreža pa je enaka kubični. Tretja diferenca je \\((0;\\ 0)\\), največja napaka \\(0\\), napaka \\(L^2\\) \\(0\\) in meja iz kontrolnih točk \\(0\\). To je edini primer v tej lekciji, ki ga polje označi kot točno nižljivega.',
                'The cubic with control points \\((0,0)\\), \\((\\tfrac43,\\tfrac83)\\), \\((\\tfrac83,\\tfrac83)\\), \\((4,0)\\) is the quadratic \\((0,0)\\), \\((2,4)\\), \\((4,0)\\) elevated by one degree: the same curve, written with four points. The reduced quadratic lies exactly on it, and its elevated net equals the cubic one. The third difference is \\((0;\\ 0)\\), the maximum error \\(0\\), the \\(L^2\\) error \\(0\\) and the control-point bound \\(0\\). This is the only case in this lesson that the readout calls exactly reducible.',
            ),
            formulaIds: ['reduction-third-difference'],
            frames: [frame('reduction-elevated-explanation', 'explanation'), frame('reduction-elevated-observation', 'observation')],
            observationPrompt: text('Primerjaj zvišano mrežo s kubičnimi kontrolnimi točkami in preberi polje v podoknu Orodja.', 'Compare the elevated net with the cubic control points and read the readout in the Tools panel.'),
            expectedObservations: [text('Zvišana mreža leži na kubičnih kontrolnih točkah, krivulji sta ista, vse napake so \\(0\\) in polje izpiše, da je krivulja točno nižljiva.', 'The elevated net lies on the cubic control points, the two curves coincide, every error is \\(0\\) and the readout says that the curve is exactly reducible.')],
            scene: reductionScene('reduction-elevated-start', REDUCTION_LESSON_ELEVATED, 'fixed', {quadratic: true, elevation: true},
                'Kubična krivulja je zvišana kvadratna krivulja \\((0,0)\\), \\((2,4)\\), \\((4,0)\\); vse napake so \\(0\\) in krivulja je točno nižljiva.',
                'The cubic is the elevated quadratic \\((0,0)\\), \\((2,4)\\), \\((4,0)\\); every error is \\(0\\) and the curve is exactly reducible.'),
        },
        {
            id: 'reduction-predict', order: 2,
            title: text('Ali gre kubična krivulja nazaj?', 'Can the cubic go back?'),
            purpose: text('Pred razkritjem napovedati, ali je kubična krivulja \\(P\\) zvišana kvadratna.', 'Predicting, before the reveal, whether the cubic \\(P\\) is an elevated quadratic.'),
            explanation: text(
                'Zdaj je prikazana kubična krivulja \\(P\\) s kontrolnimi točkami \\((0,0)\\), \\((1,3)\\), \\((3,3)\\), \\((4,0)\\). Kvadratna in zvišana krivulja sta skriti. Napovej: ali je \\(P\\) zvišana kvadratna krivulja? Njena tretja diferenca je \\((-2;\\ 0)\\), kar ni nič, zato ni: nobena kvadratna krivulja ne leži natanko na njej. Polje v podoknu Orodja to že izpiše; odloči se, preden ga prebereš.',
                'Now the cubic \\(P\\) with control points \\((0,0)\\), \\((1,3)\\), \\((3,3)\\), \\((4,0)\\) is shown. The quadratic and the elevated net are hidden. Predict: is \\(P\\) an elevated quadratic? Its third difference is \\((-2;\\ 0)\\), which is not zero, so it is not: no quadratic lies exactly on it. The readout in the Tools panel already says so; decide before you read it.',
            ),
            formulaIds: ['reduction-third-difference'],
            frames: [frame('reduction-predict-explanation', 'explanation'), frame('reduction-predict-observation', 'observation')],
            observationPrompt: text('Preden prebereš polje, oceni, ali kubična krivulja še spominja na parabolo.', 'Before you read the readout, judge whether the cubic still resembles a parabola.'),
            expectedObservations: [text('Krivulja je podobna paraboli, a tretja diferenca \\((-2;\\ 0)\\) ni nič, zato ni nižljiva (toleranca \\(10^{-9}\\)).', 'The curve looks like a parabola, but the third difference \\((-2;\\ 0)\\) is not zero, so it is not reducible (tolerance \\(10^{-9}\\)).')],
            scene: reductionScene('reduction-predict-p', REDUCTION_LESSON_P, 'fixed', {quadratic: false, elevation: false},
                'Kubična krivulja \\(P\\) \\((0,0)\\), \\((1,3)\\), \\((3,3)\\), \\((4,0)\\); kvadratna in zvišana krivulja sta skriti, tretja diferenca je \\((-2;\\ 0)\\).',
                'The cubic \\(P\\) \\((0,0)\\), \\((1,3)\\), \\((3,3)\\), \\((4,0)\\); the quadratic and the elevated net are hidden, the third difference is \\((-2;\\ 0)\\).'),
        },
        {
            id: 'reduction-third-difference-step', order: 3,
            title: text('Premik točk in tretja diferenca', 'Moving points and the third difference'),
            purpose: text('Videti, kako premik kontrolnih točk iz nižljivega položaja spremeni tretjo diferenco.', 'Seeing how moving control points away from the reducible position changes the third difference.'),
            explanation: text(
                'Izhodišče je nižljivi položaj iz prvega koraka. Točki \\(b_1\\) in \\(b_2\\) sta zdaj na \\((1,3)\\) in \\((3,3)\\): \\(b_1\\) se je premaknila za \\((-\\tfrac13,\\tfrac13)\\), \\(b_2\\) za \\((\\tfrac13,\\tfrac13)\\). Tretja diferenca se spremeni za \\(3(-\\tfrac13,\\tfrac13)-3(\\tfrac13,\\tfrac13)=(-2,0)\\), zato je zdaj \\((-2;\\ 0)\\) in krivulja ni več nižljiva. Prikazana je kvadratna krivulja, ki jo najbolje nadomešča; njeno napako preberi v naslednjih korakih. Premikaj točke sam in opazuj, kdaj se tretja diferenca vrne na \\((0;\\ 0)\\).',
                'The starting point is the reducible position of the first step. The points \\(b_1\\) and \\(b_2\\) are now at \\((1,3)\\) and \\((3,3)\\): \\(b_1\\) has moved by \\((-\\tfrac13,\\tfrac13)\\), \\(b_2\\) by \\((\\tfrac13,\\tfrac13)\\). The third difference changes by \\(3(-\\tfrac13,\\tfrac13)-3(\\tfrac13,\\tfrac13)=(-2,0)\\), so it is now \\((-2;\\ 0)\\) and the curve is no longer reducible. The quadratic that replaces it best is shown; read its error in the next steps. Drag the points yourself and watch when the third difference returns to \\((0;\\ 0)\\).',
            ),
            formulaIds: ['reduction-third-difference'], workedExampleId: 'reduction-third-difference-example',
            frames: [frame('reduction-third-difference-explanation', 'explanation'), frame('reduction-third-difference-calculation', 'calculation'), frame('reduction-third-difference-observation', 'observation')],
            observationPrompt: text('Povleci kontrolno točko in opazuj polje Tretja diferenca ter vrstico o nižljivosti.', 'Drag a control point and watch the Third difference readout and the reducibility line.'),
            expectedObservations: [text('Tretja diferenca je \\((-2;\\ 0)\\), polje izpiše, da krivulja ni nižljiva (toleranca \\(10^{-9}\\)), in kvadratna krivulja se od kubične vidno loči.', 'The third difference is \\((-2;\\ 0)\\), the readout says that the curve is not reducible (tolerance \\(10^{-9}\\)), and the quadratic visibly differs from the cubic.')],
            scene: reductionScene('reduction-third-difference-p', REDUCTION_LESSON_P, 'fixed', {quadratic: true, elevation: false},
                'Kubična krivulja \\(P\\) in njena kvadratna krivulja s fiksnima krajiščema; tretja diferenca je \\((-2;\\ 0)\\) in krivulja ni nižljiva.',
                'The cubic \\(P\\) and its quadratic with fixed end points; the third difference is \\((-2;\\ 0)\\) and the curve is not reducible.'),
        },
        {
            id: 'reduction-fixed', order: 4,
            title: text('Nižanje s fiksnima krajiščema', 'Reduction with fixed end points'),
            purpose: text('Pred razkritjem napovedati srednjo točko kvadratne krivulje in videti, da je njena zvišana mreža drugačna od \\(P\\).', 'Predicting, before the reveal, the middle point of the quadratic and seeing that its elevated net differs from \\(P\\).'),
            explanation: text(
                'Krajišči ostaneta, \\(q_0=b_0\\) in \\(q_2=b_3\\), srednjo točko \\(q_1\\) pa izberemo tako, da je napaka \\(L^2\\) čim manjša. Napovej \\(q_1\\) iz Forrestove formule: \\(q_1=(2;\\ 4{,}5)\\). Zvišana mreža te krivulje je črtkana in se razlikuje od \\(P\\). Največja napaka (vzorčena) je \\(0{,}0962\\), napaka \\(L^2\\) je \\(0{,}069007\\). "Najboljša" tu pomeni najmanjšo napako \\(L^2\\) pri fiksnih krajiščih; optimum je približek in ni točen.',
                'The end points stay, \\(q_0=b_0\\) and \\(q_2=b_3\\), and the middle point \\(q_1\\) is chosen to make the \\(L^2\\) error as small as possible. Predict \\(q_1\\) from Forrest\'s formula: \\(q_1=(2;\\ 4.5)\\). The elevated net of this curve is dashed and differs from \\(P\\). The maximum error (sampled) is \\(0.0962\\), the \\(L^2\\) error is \\(0.069007\\). "Best" here means the smallest \\(L^2\\) error with fixed end points; the optimum is an approximation and not exact.',
            ),
            formulaIds: ['reduction-norms'], workedExampleId: 'reduction-forrest-example',
            frames: [frame('reduction-fixed-explanation', 'explanation'), frame('reduction-fixed-calculation', 'calculation'), frame('reduction-fixed-observation', 'observation')],
            observationPrompt: text('Primerjaj črtkano zvišano mrežo s kontrolnimi točkami \\(P\\) in preberi obe napaki.', 'Compare the dashed elevated net with the control points of \\(P\\) and read both errors.'),
            expectedObservations: [text('Krajišči sta enaki, srednja točka je \\((2;\\ 4{,}5)\\), največja napaka je \\(0{,}0962\\) in napaka \\(L^2\\) \\(0{,}069007\\); zvišana mreža ni enaka \\(P\\).', 'The end points agree, the middle point is \\((2;\\ 4.5)\\), the maximum error is \\(0.0962\\) and the \\(L^2\\) error \\(0.069007\\); the elevated net is not equal to \\(P\\).')],
            scene: reductionScene('reduction-fixed-p', REDUCTION_LESSON_P, 'fixed', {quadratic: true, elevation: true},
                'Krajišči ostaneta, \\(q_1=(2;\\ 4{,}5)\\); največja napaka \\(0{,}0962\\), napaka \\(L^2\\) \\(0{,}069007\\), zvišana mreža je prikazana.',
                'The end points stay, \\(q_1=(2;\\ 4.5)\\); maximum error \\(0.0962\\), \\(L^2\\) error \\(0.069007\\), the elevated net is shown.'),
        },
        {
            id: 'reduction-free', order: 5,
            title: text('Prosta krajišča', 'Free end points'),
            purpose: text('Pred razkritjem napovedati, kaj se zgodi z napakama, ko se smeta premakniti tudi krajišči.', 'Predicting, before the reveal, what happens to the two errors when the end points may move too.'),
            explanation: text(
                'Zdaj se smejo premakniti vse tri kontrolne točke kvadratne krivulje: \\((-0{,}1;\\ 0)\\), \\((2;\\ 4{,}5)\\), \\((4{,}1;\\ 0)\\). Napovej: kaj se zgodi z napakama? Napaka \\(L^2\\) je manjša, \\(0{,}037796\\) proti prejšnjim \\(0{,}069007\\), saj je omejitev manj. Največja napaka pa je večja, \\(0{,}1\\) proti \\(0{,}0962\\), ker optimum ne meri največje napake. Obe krivulji sta "najboljši" glede na isto normo \\(L^2\\), a pri različnih pogojih; druga norma ali pogoj bi dal tretjo krivuljo.',
                'Now all three control points of the quadratic may move: \\((-0.1;\\ 0)\\), \\((2;\\ 4.5)\\), \\((4.1;\\ 0)\\). Predict: what happens to the two errors? The \\(L^2\\) error is smaller, \\(0.037796\\) against the earlier \\(0.069007\\), since there are fewer restrictions. The maximum error is larger, though, \\(0.1\\) against \\(0.0962\\), because the optimum does not measure the maximum error. Both curves are "the best" for the same \\(L^2\\) norm, but under different constraints; another norm or constraint would give a third curve.',
            ),
            formulaIds: ['reduction-norms'],
            frames: [frame('reduction-free-explanation', 'explanation'), frame('reduction-free-observation', 'observation')],
            observationPrompt: text('Preklopi med načinoma Krajišči ostaneta in Krajišči se smeta premakniti ter primerjaj obe napaki.', 'Switch between the modes Fixed end points and Free end points and compare the two errors.'),
            expectedObservations: [text('Pri prostih krajiščih je napaka \\(L^2\\) \\(0{,}037796\\) (manjša), največja napaka \\(0{,}1\\) (večja), krajišči pa se premakneta na \\((-0{,}1;\\ 0)\\) in \\((4{,}1;\\ 0)\\).', 'With free end points the \\(L^2\\) error is \\(0.037796\\) (smaller), the maximum error \\(0.1\\) (larger), and the end points move to \\((-0.1;\\ 0)\\) and \\((4.1;\\ 0)\\).')],
            scene: reductionScene('reduction-free-p', REDUCTION_LESSON_P, 'free', {quadratic: true, elevation: true},
                'Prosta krajišča: \\((-0{,}1;\\ 0)\\), \\((2;\\ 4{,}5)\\), \\((4{,}1;\\ 0)\\); napaka \\(L^2\\) \\(0{,}037796\\), največja napaka \\(0{,}1\\).',
                'Free end points: \\((-0.1;\\ 0)\\), \\((2;\\ 4.5)\\), \\((4.1;\\ 0)\\); \\(L^2\\) error \\(0.037796\\), maximum error \\(0.1\\).'),
        },
        {
            id: 'reduction-bound', order: 6,
            title: text('Meja iz kontrolnih točk', 'The control-point bound'),
            purpose: text('Pred razkritjem napovedati, ali je meja iz kontrolnih točk večja ali manjša od prave največje napake.', 'Predicting, before the reveal, whether the control-point bound is larger or smaller than the true maximum error.'),
            explanation: text(
                'Meja iz kontrolnih točk je največja razdalja med istoležnima kontrolnima točkama krivulje \\(P\\) in zvišane kvadratne krivulje. Krivulja je konveksna kombinacija svojih kontrolnih točk, zato je ta meja vedno vsaj tako velika kot prava največja napaka. Pri fiksnih krajiščih je meja \\(0{,}3333\\) (točka \\(b_1=(1,3)\\) je od \\((\\tfrac43,3)\\) oddaljena za \\(\\tfrac13\\)), največja napaka pa \\(0{,}0962\\). Meja je torej varna, a groba; ni natančna napaka.',
                'The control-point bound is the largest distance between corresponding control points of \\(P\\) and the elevated quadratic. A curve is a convex combination of its control points, so this bound is always at least as large as the true maximum error. With fixed end points the bound is \\(0.3333\\) (the point \\(b_1=(1,3)\\) is \\(\\tfrac13\\) from \\((\\tfrac43,3)\\)) and the maximum error is \\(0.0962\\). So the bound is safe but coarse; it is not the exact error.',
            ),
            formulaIds: ['reduction-norms'],
            frames: [frame('reduction-bound-explanation', 'explanation'), frame('reduction-bound-observation', 'observation')],
            observationPrompt: text('Preberi mejo in največjo napako ter ju primerjaj; nato premakni točko in preveri, da meja ostane večja.', 'Read the bound and the maximum error and compare them; then move a point and check that the bound stays larger.'),
            expectedObservations: [text('Meja \\(0{,}3333\\) je večja od največje napake \\(0{,}0962\\) in je tudi po premiku točke nikoli ne prekorači navzdol.', 'The bound \\(0.3333\\) is larger than the maximum error \\(0.0962\\), and after moving a point it never falls below the error.')],
            scene: reductionScene('reduction-bound-p', REDUCTION_LESSON_P, 'fixed', {quadratic: true, elevation: true},
                'Fiksna krajišča: meja iz kontrolnih točk \\(0{,}3333\\) je večja od največje napake \\(0{,}0962\\).',
                'Fixed end points: the control-point bound \\(0.3333\\) is larger than the maximum error \\(0.0962\\).'),
        },
        {
            id: 'reduction-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati kontrolne točke in preklapljati način; drugi primer je pripravljen.', 'Moving control points and switching the mode on your own, with the second example prepared.'),
            explanation: text(
                'Prikazan je drugi primer \\(P_2\\): \\((0,0)\\), \\((1,4)\\), \\((3,1)\\), \\((4,3)\\), s tretjo diferenco \\((-2;\\ 12)\\). Pri fiksnih krajiščih je \\(q_1=(2;\\ 3)\\), največja napaka \\(0{,}5853\\), napaka \\(L^2\\) \\(0{,}41975\\) in meja \\(2{,}0276\\). Premikaj točke, preklapljaj način in ugotovi, kdaj je razlika med načinoma velika in kdaj majhna. Pomni: "najboljša" je odvisna od norme in pogojev, če tretja diferenca ni nič, optimum nikoli ni točen, "nižljiva" pa pomeni nič v okviru tolerance \\(10^{-9}\\).',
                'The second example \\(P_2\\) is shown: \\((0,0)\\), \\((1,4)\\), \\((3,1)\\), \\((4,3)\\), with the third difference \\((-2;\\ 12)\\). With fixed end points \\(q_1=(2;\\ 3)\\), the maximum error is \\(0.5853\\), the \\(L^2\\) error \\(0.41975\\) and the bound \\(2.0276\\). Move the points, switch the mode and find out when the two modes differ a lot and when little. Remember: "best" depends on the norm and the constraints, unless the third difference is zero the optimum is never exact, and "reducible" means zero within the tolerance \\(10^{-9}\\).',
            ),
            formulaIds: ['reduction-third-difference', 'reduction-norms'],
            frames: [frame('reduction-explore-explanation', 'explanation'), frame('reduction-explore-observation', 'observation')],
            observationPrompt: text('Poskusi najti položaj kontrolnih točk, pri katerem je krivulja nižljiva, in tak, pri katerem sta načina zelo različna.', 'Try to find a position of the control points where the curve is reducible and one where the two modes differ a lot.'),
            expectedObservations: [text('Nižljiv je le položaj s tretjo diferenco \\((0;\\ 0)\\); pri drugih položajih sta načina različna in nobena napaka ni točno nič.', 'Only a position with third difference \\((0;\\ 0)\\) is reducible; at other positions the modes differ and no error is exactly zero.')],
            scene: reductionScene('reduction-explore-p2', REDUCTION_LESSON_P2, 'fixed', {quadratic: true, elevation: true},
                'Drugi primer \\(P_2\\) s fiksnima krajiščema: \\(q_1=(2;\\ 3)\\), največja napaka \\(0{,}5853\\), napaka \\(L^2\\) \\(0{,}41975\\); vse je prosto za raziskovanje.',
                'The second example \\(P_2\\) with fixed end points: \\(q_1=(2;\\ 3)\\), maximum error \\(0.5853\\), \\(L^2\\) error \\(0.41975\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'farin-reduction', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the sections on degree elevation and degree reduction (Forrest\'s formula).'},
        {
            id: 'bezeg-reduction-implementation',
            citation: 'Bezeg source: src/bezeg/impl/kernels/degree-reduction.ts, src/graphs/curves/reduction/DegreeReductionGraph.tsx and ReductionOverlay.ts.',
            implementationCorrespondence: 'All values come from the reduction kernel; a lesson scene sets the four control points, the mode and the two switches with the reduction-points, reduction-mode and curve-visibility actions. The maximum error is sampled (2001 parameters).',
        },
    ],
    edgeCases: [
        text('Največja napaka je vzorčena, zato je zanesljiva le na štiri decimalke; napaka \\(L^2\\) je izračunana iz Gramove matrike.', 'The maximum error is sampled, so only four decimals are reliable; the \\(L^2\\) error is computed from the Gram matrix.'),
        text('Krivulja je nižljiva le v okviru tolerance \\(10^{-9}\\) glede na velikost kontrolnih točk; optimum pri neničelni tretji diferenci ni nikoli točen.', 'A curve is reducible only within the tolerance \\(10^{-9}\\) relative to the size of the control points; the optimum for a non-zero third difference is never exact.'),
    ],
    unresolvedQuestions: [],
};

export const degreeReductionGuidedLessons: readonly GuidedLesson[] = [degreeReductionLesson];
