/**
 * Guided lesson N5 of the Numerical methods family (docs/specs/numerical-methods-lessons.md, section N5): the direction field and Euler's
 * method on the `euler-method` Demonstration. A sibling of numericalQuadratureGuidedLesson.ts. The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it quotes is a value of the scene it belongs to or of an
 * explicitly named change of the step h or of the equation, and `numericalEulerGuidedLesson.test.ts` checks that against the real graph
 * and an independent Euler loop.
 * Scenes use the `function-choice` actions `euler-example` and `euler-step`, the `function-parameter` actions `euler-x0`, `euler-y0` and
 * `euler-end`, and the `function-visibility` target `euler-exact` (the dashed exact curve). Step 1 sets the end x to x0 (no Euler step is
 * drawn) and hides the exact curve, so that the class predicts before anything else appears; step 2 shows one step with end x = x0 + h.
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

type EulerStepSize = '1' | '0.5' | '0.25' | '0.125' | '0.0625';

interface EulerSceneState {
    readonly step: EulerStepSize;
    /** The end x; the default scene ends at 1. */
    readonly end: number;
    readonly y0: number;
    readonly showExact: boolean;
}

/** The default scene is y' = y through (0, 1) with h = 0.5, end x = 1 and the exact curve shown; a scene changes only what it lists. */
const eulerScene = (id: string, state: EulerSceneState, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-visibility', target: 'euler-exact', visible: state.showExact},
        {kind: 'function-choice', name: 'euler-example', value: 'exponential'},
        {kind: 'function-choice', name: 'euler-step', value: state.step},
        {kind: 'function-parameter', name: 'euler-x0', value: 0},
        {kind: 'function-parameter', name: 'euler-y0', value: state.y0},
        {kind: 'function-parameter', name: 'euler-end', value: state.end},
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
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
});

const eulerLesson: GuidedLesson = {
    demonstrationId: 'euler-method',
    title: text('Polje smeri in Eulerjeva metoda', 'Direction field and Euler\'s method'),
    summary: text(
        'Enačba \\(y\'=F(x,y)\\) v vsaki točki ravnine določa naklon; polje smeri te naklone nariše kot kratke daljice. Eulerjeva lomljenka iz začetne točke sledi naklonom v korakih \\(h\\). Pri gladkih primerih se napaka pri končnem \\(x\\) zmanjša približno na polovico, ko korak razpolovimo (prvi red).',
        'The equation \\(y\'=F(x,y)\\) assigns a slope to every point of the plane; the direction field draws these slopes as short segments. From the initial point, the Euler polyline follows the slopes in steps of size \\(h\\). On smooth examples the error at the end \\(x\\) falls to about a half when the step is halved (first order).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje odvoda in tangente na graf funkcije.', 'Assumes the derivative and the tangent line to the graph of a function.'),
        text('Lekcija o Newtonovi metodi je priporočena kot prvi primer tangente kot približka.', 'The lesson on Newton\'s method is recommended as a first example of the tangent as an approximation.'),
    ],
    learningGoals: [
        text('Prebereš iz polja smeri, kam gre rešitev enačbe \\(y\'=F(x,y)\\) skozi dano točko, in napoveš njen potek.', 'Read from the direction field where the solution of \\(y\'=F(x,y)\\) through a given point goes, and predict its course.'),
        text('Izračunaš en Eulerjev korak \\(y_1=y_0+h\\,F(x_0,y_0)\\) in razložiš, da je lomljenka približek, ne rešitev.', 'Compute one Euler step \\(y_1=y_0+h\\,F(x_0,y_0)\\) and explain that the polyline is an approximation, not a solution.'),
        text('Iz napak pri korakih \\(h\\), \\(h/2\\), \\(h/4\\) opaziš, da se napaka približno razpolovi, in ločiš opažanje od izreka o prvem redu.', 'See from the errors at steps \\(h\\), \\(h/2\\), \\(h/4\\) that the error roughly halves, and separate the observation from the theorem on the first order.'),
    ],
    formulaBlocks: [
        {
            id: 'euler-step-formula',
            latex: 'y_{k+1}=y_k+h\\,F(x_k,y_k),\\qquad x_{k+1}=x_k+h',
            notation: text(
                '\\((x_0,y_0)\\) je začetna točka, \\(h\\) korak, \\(F(x_k,y_k)\\) naklon polja smeri v točki \\((x_k,y_k)\\) in \\(y_k\\) približek rešitve pri \\(x_k\\).',
                '\\((x_0,y_0)\\) is the initial point, \\(h\\) the step, \\(F(x_k,y_k)\\) the slope of the direction field at the point \\((x_k,y_k)\\) and \\(y_k\\) the approximation of the solution at \\(x_k\\).',
            ),
            explanation: text(
                'Vsak korak gre po daljici z naklonom, ki ga polje določa v trenutni točki: za \\(h\\) naprej po \\(x\\) in za \\(h\\,F(x_k,y_k)\\) po \\(y\\). Lomljenka skozi točke \\((x_k,y_k)\\) ni rešitev, saj ima na vozliščih zlome.',
                'Each step follows the tangent that the field prescribes at the current point: forward by \\(h\\) in \\(x\\) and by \\(h\\,F(x_k,y_k)\\) in \\(y\\). The polyline through the points \\((x_k,y_k)\\) is not a solution, since it has corners at the nodes.',
            ),
        },
        {
            id: 'euler-error-theorem',
            latex: '\\left|y(X)-y_N\\right|\\le\\frac{M}{2L}\\left(e^{L(X-x_0)}-1\\right)h',
            notation: text(
                '\\(y\\) je natančna rešitev, \\(y_N\\) Eulerjev približek pri \\(X=x_0+Nh\\), \\(L\\) Lipschitzova konstanta funkcije \\(F\\) po \\(y\\) in \\(M\\) zgornja meja za \\(|y\'\'|\\) na \\([x_0,X]\\).',
                '\\(y\\) is the exact solution, \\(y_N\\) the Euler approximation at \\(X=x_0+Nh\\), \\(L\\) the Lipschitz constant of \\(F\\) in \\(y\\) and \\(M\\) an upper bound of \\(|y\'\'|\\) on \\([x_0,X]\\).',
            ),
            explanation: text(
                'Izrek: naj bo \\(F\\) zvezna in Lipschitzova po \\(y\\) s konstanto \\(L>0\\), rešitev \\(y\\) pa dvakrat zvezno odvedljiva z \\(|y\'\'|\\le M\\) na \\([x_0,X]\\). Tedaj je napaka Eulerjeve metode pri \\(X\\) omejena z zgornjim izrazom, torej je reda \\(h\\) (prvi red). Obstoj in enoličnost rešitve zahtevata tak pogoj na \\(F\\); ga v lekciji ne preverjamo.',
                'Theorem: let \\(F\\) be continuous and Lipschitz in \\(y\\) with constant \\(L>0\\), and let the solution \\(y\\) be twice continuously differentiable with \\(|y\'\'|\\le M\\) on \\([x_0,X]\\). Then the error of Euler\'s method at \\(X\\) is bounded by the expression above, so it is of order \\(h\\) (first order). The existence and uniqueness of a solution need such a hypothesis on \\(F\\); the lesson does not check it.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'euler-one-step',
            title: text('En Eulerjev korak za \\(y\'=y\\), \\(y(0)=1\\), \\(h=0{,}5\\)', 'One Euler step for \\(y\'=y\\), \\(y(0)=1\\), \\(h=0.5\\)'),
            calculationLatex: 'y_1=y_0+h\\,F(x_0,y_0)=1+0{,}5\\cdot1=1{,}5',
            resultLatex: '1{,}5',
            check: text(
                'Naklon polja v točki \\((0,1)\\) je \\(F(0,1)=1\\). Tangentna daljica gre za \\(0{,}5\\) naprej po \\(x\\) in za \\(0{,}5\\) navzgor, do točke \\((0{,}5;\\,1{,}5)\\). Približek je \\(y_1=1{,}5\\).',
                'The slope of the field at the point \\((0,1)\\) is \\(F(0,1)=1\\). The tangent segment goes \\(0.5\\) forward in \\(x\\) and \\(0.5\\) up, to the point \\((0.5,\\,1.5)\\). The approximation is \\(y_1=1.5\\).',
            ),
        },
        {
            id: 'euler-two-steps',
            title: text('Dva koraka za \\(y\'=y\\), \\(y(0)=1\\), \\(h=0{,}5\\)', 'Two steps for \\(y\'=y\\), \\(y(0)=1\\), \\(h=0.5\\)'),
            calculationLatex: 'y_2=y_1+h\\,F(x_1,y_1)=1{,}5+0{,}5\\cdot1{,}5=2{,}25',
            resultLatex: '2{,}25',
            check: text(
                'V točki \\((0{,}5;\\,1{,}5)\\) je naklon \\(F=1{,}5\\), drugi korak pa gre do \\(y_2=1{,}5+0{,}5\\cdot1{,}5=2{,}25\\). Natančna rešitev \\(e^x\\) je pri \\(x=1\\) enaka \\(e\\approx2{,}7183\\).',
                'At the point \\((0.5,\\,1.5)\\) the slope is \\(F=1.5\\), and the second step goes to \\(y_2=1.5+0.5\\cdot1.5=2.25\\). The exact solution \\(e^x\\) is \\(e\\approx2.7183\\) at \\(x=1\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'field-predict', order: 1,
            title: text('Polje smeri', 'The direction field'),
            purpose: text('Videti, da enačba \\(y\'=y\\) v vsaki točki določa naklon, in napovedati rešitev skozi \\((0,1)\\).', 'Seeing that the equation \\(y\'=y\\) assigns a slope at every point, and predicting the solution through \\((0,1)\\).'),
            explanation: text(
                'Enačba \\(y\'=y\\) pove, da je naklon rešitve v točki \\((x,y)\\) enak \\(y\\). Polje smeri ta naklon nariše kot kratko daljico v mnogih točkah: ob \\(y=1\\) imajo naklon \\(1\\), više so strmejše, ob \\(y=0\\) pa vodoravne. Polje je slika ene enačbe; rešitev skozi \\((0,1)\\) je krivulja, ki se povsod dotika daljic. Da skozi vsako točko poteka natanko ena rešitev, zahteva pogoj na \\(F\\), ki ga tu ne preverjamo. Natančna krivulja je skrita: napovej, kam gre rešitev od točke \\((0,1)\\) do \\(x=1\\).',
                'The equation \\(y\'=y\\) says that the slope of a solution at the point \\((x,y)\\) is \\(y\\). The direction field draws this slope as a short segment at many points: at \\(y=1\\) they have the slope \\(1\\), higher up they are steeper, and at \\(y=0\\) they are horizontal. The field is a picture of one equation; the solution through \\((0,1)\\) is a curve that touches the segments everywhere. That exactly one solution passes through every point needs a hypothesis on \\(F\\) that is not checked here. The exact curve is hidden: predict where the solution goes from \\((0,1)\\) to \\(x=1\\).',
            ),
            formulaIds: ['euler-step-formula'],
            observationPrompt: text('Zapiši napoved za \\(y(1)\\), nato pojdi na naslednji korak.', 'Write down a prediction for \\(y(1)\\), then go on to the next step.'),
            expectedObservations: [text('Prikazana sta polje smeri in začetna točka \\((0,1)\\); koraka še ni, natančna krivulja pa je skrita.', 'The direction field and the initial point \\((0,1)\\) are shown; there is no step yet and the exact curve is hidden.')],
            scene: eulerScene('euler-field-predict', {step: '0.5', end: 0, y0: 1, showExact: false},
                'Enačba \\(y\'=y\\), začetna točka \\((0,1)\\): prikazani sta polje smeri in začetna točka, Eulerjevih korakov ni (končni \\(x\\) je \\(0\\)), natančna krivulja je skrita.',
                'The equation \\(y\'=y\\), initial point \\((0,1)\\): the direction field and the initial point are shown, there are no Euler steps (the end \\(x\\) is \\(0\\)), and the exact curve is hidden.'),
        }),
        step({
            id: 'one-step', order: 2,
            title: text('En Eulerjev korak', 'One Euler step'),
            purpose: text('Videti, da je en korak tangentna daljica po polju smeri.', 'Seeing that one step is a tangent segment along the direction field.'),
            explanation: text(
                'Pri koraku \\(h=0{,}5\\) je naklon polja v točki \\((0,1)\\) enak \\(1\\), zato daljica gre do točke \\((0{,}5;\\,1{,}5)\\) in je \\(y_1=1+0{,}5\\cdot1=1{,}5\\). Daljica sledi polju samo v začetni točki; na poti naprej se polje spreminja, a korak tega ne upošteva.',
                'With the step \\(h=0.5\\) the slope of the field at the point \\((0,1)\\) is \\(1\\), so the segment goes to the point \\((0.5,\\,1.5)\\) and \\(y_1=1+0.5\\cdot1=1.5\\). The segment follows the field only at the starting point; the field changes along the way, but the step ignores this.',
            ),
            formulaIds: ['euler-step-formula'], workedExampleId: 'euler-one-step',
            observationPrompt: text('Primerjaj konec daljice z napovedjo: ali je pod ali nad pravo rešitvijo?', 'Compare the end of the segment with your prediction: is it below or above the true solution?'),
            expectedObservations: [text('Po enem koraku je Eulerjev približek \\(1{,}5\\) pri \\(x=0{,}5\\).', 'After one step the Euler approximation is \\(1.5\\) at \\(x=0.5\\).')],
            scene: eulerScene('euler-one-step', {step: '0.5', end: 0.5, y0: 1, showExact: false},
                'Enačba \\(y\'=y\\), \\(h=0{,}5\\), končni \\(x=0{,}5\\): ena tangentna daljica od \\((0,1)\\), Eulerjev približek \\(1{,}5\\).',
                'The equation \\(y\'=y\\), \\(h=0.5\\), end \\(x=0.5\\): one tangent segment from \\((0,1)\\), the Euler approximation \\(1.5\\).'),
        }),
        step({
            id: 'polyline', order: 3,
            title: text('Lomljenka s korakom \\(h=0{,}5\\)', 'The polyline with step \\(h=0.5\\)'),
            purpose: text('Videti lomljenko iz dveh daljic in prebrati njen končni približek.', 'Seeing the polyline of two segments and reading its end approximation.'),
            explanation: text(
                'Drugi korak začne v točki \\((0{,}5;\\,1{,}5)\\), kjer je naklon \\(1{,}5\\), in pride do \\(y_2=1{,}5+0{,}5\\cdot1{,}5=2{,}25\\) pri \\(x=1\\). Lomljenka ima zlom v vozlišču; ni rešitev, saj se v zlomu ne dotika polja. Natančna krivulja je še skrita. Iz polja presodi, ali je \\(2{,}25\\) pod ali nad pravo vrednostjo \\(y(1)\\): ob vsakem koraku daljice v polju postajajo strmejše, korak pa ohrani naklon začetne točke. Nato preveri z natančno vrednostjo med odčitki.',
                'The second step starts at the point \\((0.5,\\,1.5)\\), where the slope is \\(1.5\\), and reaches \\(y_2=1.5+0.5\\cdot1.5=2.25\\) at \\(x=1\\). The polyline has a corner at the node; it is not a solution, since it does not touch the field at the corner. The exact curve is still hidden. Decide from the field whether \\(2.25\\) is below or above the true value \\(y(1)\\): along each step the segments of the field get steeper, while the step keeps the slope of its starting point. Then check against the exact value in the readouts.',
            ),
            formulaIds: ['euler-step-formula'], workedExampleId: 'euler-two-steps',
            observationPrompt: text('Preberi število korakov in Eulerjev približek pri končnem \\(x\\).', 'Read the number of steps and the Euler approximation at the end \\(x\\).'),
            expectedObservations: [text('Lomljenka ima dva koraka in Eulerjev približek \\(2{,}25\\) pri \\(x=1\\).', 'The polyline has two steps and the Euler approximation \\(2.25\\) at \\(x=1\\).')],
            scene: eulerScene('euler-polyline', {step: '0.5', end: 1, y0: 1, showExact: false},
                'Enačba \\(y\'=y\\), \\(h=0{,}5\\), končni \\(x=1\\): lomljenka iz dveh daljic, Eulerjev približek \\(2{,}25\\), natančna krivulja je skrita.',
                'The equation \\(y\'=y\\), \\(h=0.5\\), end \\(x=1\\): a polyline of two segments, the Euler approximation \\(2.25\\), the exact curve is hidden.'),
        }),
        step({
            id: 'halve-h', order: 4,
            title: text('Razpolovitev koraka in natančna krivulja', 'Halving the step and the exact curve'),
            purpose: text('Primerjati lomljenko s črtkano natančno rešitvijo in videti, da manjši korak lomljenko približa.', 'Comparing the polyline with the dashed exact solution and seeing that a smaller step brings the polyline closer.'),
            explanation: text(
                'Natančna rešitev je \\(e^x\\); pri \\(x=1\\) je \\(e\\approx2{,}7183\\). Pri \\(h=0{,}5\\) je bil približek \\(2{,}25\\) in napaka \\(0{,}4683\\). Pri \\(h=0{,}25\\) je približek \\(2{,}4414\\), napaka \\(0{,}2769\\), razmerje napak, napaka pri \\(2h\\) deljena z napako pri \\(h\\), pa \\(0{,}4683/0{,}2769=1{,}69\\). Lomljenka leži pod rešitvijo.',
                'The exact solution is \\(e^x\\); at \\(x=1\\) it is \\(e\\approx2.7183\\). At \\(h=0.5\\) the approximation was \\(2.25\\) and the error \\(0.4683\\). At \\(h=0.25\\) the approximation is \\(2.4414\\), the error \\(0.2769\\), and the ratio of the errors, the error at \\(2h\\) divided by the error at \\(h\\), is \\(0.4683/0.2769=1.69\\). The polyline lies below the solution.',
            ),
            formulaIds: ['euler-step-formula'],
            observationPrompt: text('Preklopi med \\(h=0{,}5\\) in \\(h=0{,}25\\) in opazuj lomljenko ter napako.', 'Switch between \\(h=0.5\\) and \\(h=0.25\\) and watch the polyline and the error.'),
            expectedObservations: [text('Pri \\(h=0{,}25\\) je približek \\(2{,}4414\\), natančna vrednost \\(2{,}7183\\), napaka \\(0{,}2769\\) in razmerje napak \\(1{,}69\\).', 'At \\(h=0.25\\) the approximation is \\(2.4414\\), the exact value \\(2.7183\\), the error \\(0.2769\\) and the ratio of the errors \\(1.69\\).')],
            scene: eulerScene('euler-halve-h', {step: '0.25', end: 1, y0: 1, showExact: true},
                'Enačba \\(y\'=y\\), \\(h=0{,}25\\), končni \\(x=1\\): približek \\(2{,}4414\\), natančna vrednost \\(2{,}7183\\), napaka \\(0{,}2769\\), napaka pri \\(2h\\) je \\(0{,}4683\\), razmerje napak \\(1{,}69\\).',
                'The equation \\(y\'=y\\), \\(h=0.25\\), end \\(x=1\\): approximation \\(2.4414\\), exact value \\(2.7183\\), error \\(0.2769\\), error at \\(2h\\) is \\(0.4683\\), ratio of the errors \\(1.69\\).'),
        }),
        step({
            id: 'error-ratios', order: 5,
            title: text('Napake in prvi red', 'Errors and the first order'),
            purpose: text('Prebrati, da se napaka ob razpolovitvi koraka približno razpolovi, in ločiti opažanje od izreka.', 'Reading that the error roughly halves when the step is halved, and separating the observation from the theorem.'),
            explanation: text(
                'Pri \\(h=0{,}125\\) je približek \\(2{,}5658\\) in napaka \\(0{,}1525\\). Napake za \\(h=0{,}5\\), \\(0{,}25\\), \\(0{,}125\\) so \\(0{,}4683\\), \\(0{,}2769\\), \\(0{,}1525\\), razmerji pa \\(0{,}4683/0{,}2769=1{,}69\\) in \\(0{,}2769/0{,}1525=1{,}82\\); približujeta se \\(2\\). Za \\(y\'=x-y\\), \\(y(0)=1\\), natančno rešitev \\(y=x-1+2e^{-x}\\) in \\(y(1)=2/e\\approx0{,}7358\\) so približki za \\(h=0{,}5\\), \\(0{,}25\\), \\(0{,}125\\) enaki \\(0{,}5\\), \\(0{,}6328\\), \\(0{,}6872\\), napake \\(0{,}2358\\), \\(0{,}1029\\), \\(0{,}04854\\). Pri \\(h=1\\) je približek \\(0\\), napaka pa \\(0{,}7358\\), zato so razmerja \\(0{,}7358/0{,}2358=3{,}12\\), \\(0{,}2358/0{,}1029=2{,}29\\) in \\(0{,}1029/0{,}04854=2{,}12\\), torej se tu \\(2\\) približujejo od zgoraj. To sta opažanji na dveh gladkih primerih. Izrek (izraz zgoraj) zahteva Lipschitzovo \\(F\\) in dvakrat zvezno odvedljivo rešitev ter pove le, da je napaka omejena z \\(C\\,h\\), torej prvega reda.',
                'At \\(h=0.125\\) the approximation is \\(2.5658\\) and the error \\(0.1525\\). The errors for \\(h=0.5\\), \\(0.25\\), \\(0.125\\) are \\(0.4683\\), \\(0.2769\\), \\(0.1525\\), and the ratios are \\(0.4683/0.2769=1.69\\) and \\(0.2769/0.1525=1.82\\); they approach \\(2\\). For \\(y\'=x-y\\), \\(y(0)=1\\), the exact solution \\(y=x-1+2e^{-x}\\) and \\(y(1)=2/e\\approx0.7358\\), the approximations for \\(h=0.5\\), \\(0.25\\), \\(0.125\\) are \\(0.5\\), \\(0.6328\\), \\(0.6872\\), the errors \\(0.2358\\), \\(0.1029\\), \\(0.04854\\). At \\(h=1\\) the approximation is \\(0\\) and the error \\(0.7358\\), so the ratios are \\(0.7358/0.2358=3.12\\), \\(0.2358/0.1029=2.29\\) and \\(0.1029/0.04854=2.12\\), so here they approach \\(2\\) from above. These are observations on two smooth examples. The theorem (the expression above) needs a Lipschitz \\(F\\) and a twice continuously differentiable solution and says only that the error is bounded by \\(C\\,h\\), that is, of first order.',
            ),
            formulaIds: ['euler-error-theorem'],
            observationPrompt: text('Nastavi \\(h=0{,}125\\), nato preklopi enačbo na \\(y\'=x-y\\) in primerjaj razmerja.', 'Set \\(h=0.125\\), then switch the equation to \\(y\'=x-y\\) and compare the ratios.'),
            expectedObservations: [text('Pri \\(h=0{,}125\\) je napaka \\(0{,}1525\\) in razmerje napak \\(1{,}82\\); pri \\(y\'=x-y\\) so razmerja \\(2{,}29\\) in \\(2{,}12\\).', 'At \\(h=0.125\\) the error is \\(0.1525\\) and the ratio of the errors \\(1.82\\); for \\(y\'=x-y\\) the ratios are \\(2.29\\) and \\(2.12\\).')],
            scene: eulerScene('euler-error-ratios', {step: '0.125', end: 1, y0: 1, showExact: true},
                'Enačba \\(y\'=y\\), \\(h=0{,}125\\), končni \\(x=1\\): približek \\(2{,}5658\\), natančna vrednost \\(2{,}7183\\), napaka \\(0{,}1525\\), napaka pri \\(2h\\) je \\(0{,}2769\\), razmerje napak \\(1{,}82\\).',
                'The equation \\(y\'=y\\), \\(h=0.125\\), end \\(x=1\\): approximation \\(2.5658\\), exact value \\(2.7183\\), error \\(0.1525\\), error at \\(2h\\) is \\(0.2769\\), ratio of the errors \\(1.82\\).'),
        }),
        step({
            id: 'initial-point', order: 6,
            title: text('Premik začetne točke', 'Moving the initial point'),
            purpose: text('Videti, da ista enačba skozi vsako začetno točko da drugo rešitev in drugo lomljenko.', 'Seeing that the same equation gives another solution and another polyline through every initial point.'),
            explanation: text(
                'Začetna točka \\((0,2)\\) da pri \\(h=0{,}25\\) približek \\(2\\cdot1{,}25^4=4{,}8828\\), natančna vrednost je \\(2e\\approx5{,}4366\\), napaka pa \\(0{,}5538\\), dvakrat toliko kot iz točke \\((0,1)\\). Razmerje napak je spet \\(0{,}9366/0{,}5538=1{,}69\\), saj je enačba \\(y\'=y\\) linearna. Polje smeri se ni spremenilo: ista slika polja velja za vse rešitve. Povleci začetno točko po grafu ali spremeni \\(y_0\\) in \\(x_0\\).',
                'The initial point \\((0,2)\\) gives, at \\(h=0.25\\), the approximation \\(2\\cdot1.25^4=4.8828\\), the exact value is \\(2e\\approx5.4366\\), and the error is \\(0.5538\\), twice as much as from the point \\((0,1)\\). The ratio of the errors is again \\(0.9366/0.5538=1.69\\), since the equation \\(y\'=y\\) is linear. The direction field has not changed: the same picture of the field holds for all the solutions. Drag the initial point on the graph or change \\(y_0\\) and \\(x_0\\).',
            ),
            formulaIds: ['euler-step-formula'],
            observationPrompt: text('Povleci začetno točko in opazuj, kako se spremenita lomljenka ter napaka.', 'Drag the initial point and watch how the polyline and the error change.'),
            expectedObservations: [text('Iz točke \\((0,2)\\) je pri \\(h=0{,}25\\) približek \\(4{,}8828\\), napaka \\(0{,}5538\\) in razmerje napak \\(1{,}69\\).', 'From the point \\((0,2)\\) at \\(h=0.25\\) the approximation is \\(4.8828\\), the error \\(0.5538\\) and the ratio of the errors \\(1.69\\).')],
            scene: eulerScene('euler-initial-point', {step: '0.25', end: 1, y0: 2, showExact: true},
                'Enačba \\(y\'=y\\), začetna točka \\((0,2)\\), \\(h=0{,}25\\), končni \\(x=1\\): približek \\(4{,}8828\\), natančna vrednost \\(5{,}4366\\), napaka \\(0{,}5538\\), napaka pri \\(2h\\) je \\(0{,}9366\\), razmerje napak \\(1{,}69\\).',
                'The equation \\(y\'=y\\), initial point \\((0,2)\\), \\(h=0.25\\), end \\(x=1\\): approximation \\(4.8828\\), exact value \\(5.4366\\), error \\(0.5538\\), error at \\(2h\\) is \\(0.9366\\), ratio of the errors \\(1.69\\).'),
        }),
        step({
            id: 'euler-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati polje smeri in Eulerjevo metodo.', 'Exploring the direction field and Euler\'s method on your own.'),
            explanation: text(
                'Vrnjena sta privzeta enačba \\(y\'=y\\) skozi \\((0,1)\\) in korak \\(h=0{,}5\\) s približkom \\(2{,}25\\) in napako \\(0{,}4683\\); vse je prosto za raziskovanje. Zamenjaj enačbo, premakni začetno točko, spremeni korak in končni \\(x\\) ter z gumbom Naslednji korak razkrivaj lomljenko po korakih. Poskusi enačbo \\(y\'=y^2\\) iz \\(y(0)=1\\): natančna rešitev \\(1/(1-x)\\) ima pol pri \\(x=1\\), lomljenka pa se ustavi z vidnim sporočilom, namesto da bi risala čez rob.',
                'The default equation \\(y\'=y\\) through \\((0,1)\\) and the step \\(h=0.5\\) with the approximation \\(2.25\\) and the error \\(0.4683\\) are restored; everything is free to explore. Change the equation, move the initial point, change the step and the end \\(x\\), and reveal the polyline step by step with the Next step button. Try the equation \\(y\'=y^2\\) from \\(y(0)=1\\): the exact solution \\(1/(1-x)\\) has a pole at \\(x=1\\), and the polyline stops with a visible message instead of drawing off the edge.',
            ),
            formulaIds: ['euler-step-formula', 'euler-error-theorem'],
            observationPrompt: text('Poišči začetno točko ali enačbo, pri kateri razmerje napak ni blizu \\(2\\), in razloži, kaj se zgodi.', 'Find an initial point or equation for which the ratio of the errors is not close to \\(2\\), and explain what happens.'),
            expectedObservations: [text('Privzeta scena ima pri \\(h=0{,}5\\) približek \\(2{,}25\\) in napako \\(0{,}4683\\).', 'The default scene has the approximation \\(2.25\\) and the error \\(0.4683\\) at \\(h=0.5\\).')],
            scene: eulerScene('euler-explore-free', {step: '0.5', end: 1, y0: 1, showExact: true},
                'Enačba \\(y\'=y\\), \\(h=0{,}5\\), končni \\(x=1\\): približek \\(2{,}25\\), natančna vrednost \\(2{,}7183\\), napaka \\(0{,}4683\\); vse je prosto za raziskovanje.',
                'The equation \\(y\'=y\\), \\(h=0.5\\), end \\(x=1\\): approximation \\(2.25\\), exact value \\(2.7183\\), error \\(0.4683\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'burden-faires-euler-error',
            citation: 'R. L. Burden, J. D. Faires, Numerical Analysis, section "Euler\'s Method": the error bound for Euler\'s method (F continuous and Lipschitz in y with constant L, the solution twice continuously differentiable with |y\'\'| at most M), which is of order h.',
        },
        {
            id: 'bezeg-euler-implementation',
            citation: 'Bezeg source: src/analysis/odeEuler.ts, src/analysis/eulerModel.ts and src/graphs/functions/EulerGraph.tsx.',
            implementationCorrespondence: 'The model computes the Euler polyline from the initial point, the step and the end x, the exact value from the closed-form solution, the absolute error and the ratio of the error at 2h to the error at h (from the errors as displayed, four significant digits); a scene sets the equation, the step, the initial point, the end x and the visibility of the exact curve.',
        },
    ],
    edgeCases: [
        text('Polje smeri je slika ene enačbe; obstoj in enoličnost rešitve skozi točko zahtevata pogoj na \\(F\\), ki ga lekcija ne preverja.', 'The direction field is a picture of one equation; the existence and uniqueness of a solution through a point need a hypothesis on \\(F\\) that the lesson does not check.'),
        text('Lomljenka ni rešitev: ima zlome in se polja dotika le v vozliščih.', 'The polyline is not a solution: it has corners and touches the field only at the nodes.'),
        text('Pri \\(y\'=y^2\\) iz \\(y(0)=1\\) natančna rešitev nima vrednosti pri \\(x=1\\) ali za njim, zato napake ni; če vrednosti presežejo meji, se lomljenka ustavi z vidnim sporočilom.', 'For \\(y\'=y^2\\) from \\(y(0)=1\\) the exact solution has no value at or beyond \\(x=1\\), so there is no error; if the values exceed the bounds, the polyline stops with a visible message.'),
        text('Če je napaka \\(0\\), koraka \\(2h\\) ni na seznamu ali je \\(2h\\) daljši od intervala od \\(x_0\\) do končnega \\(x\\), razmerja napak ni: tedaj bi bil korak \\(2h\\) en sam skrajšan korak, pri \\(h\\) enakem dolžini intervala celo isti kot korak \\(h\\).', 'If the error is \\(0\\), the step \\(2h\\) is not on the list or \\(2h\\) is longer than the interval from \\(x_0\\) to the end \\(x\\), there is no ratio of the errors: the step \\(2h\\) would then be a single shortened step, and for \\(h\\) equal to the length of the interval even the same as the step \\(h\\).'),
    ],
    unresolvedQuestions: [],
};

export const eulerGuidedLessons: readonly GuidedLesson[] = [eulerLesson];
