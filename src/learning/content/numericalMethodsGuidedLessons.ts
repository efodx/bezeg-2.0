/**
 * Guided lessons of the Numerical methods family (docs/specs/numerical-methods-lessons.md): N1, Newton's method, N2, when Newton fails,
 * and N3, the secant method, all on the `root-finding` Demonstration. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"):
 * every number it quotes is a value of the scene it belongs to, and `numericalMethodsGuidedLessons.test.ts` checks that against the real
 * graph and the kernel in `src/analysis/rootFinding.ts`. Scenes use the `function-choice` actions `root-finding-method` and
 * `root-finding-example`, the `function-parameter` actions `root-x0` and `root-x1` and `next-step` of the `root-finding` animation.
 * A Demonstration has one guided lesson, so N1 (steps 1 to 6) and N2 (steps 7 to 13) are consecutive parts of the `root-finding` lesson;
 * N3, the secant method (steps 14 to 20), appends its own steps and uses the `root-finding-method` value `secant` and the action `root-x1`.
 */
import type {LessonAction} from '../model';
import {eulerGuidedLessons} from './numericalEulerGuidedLesson';
import {quadratureGuidedLessons} from './numericalQuadratureGuidedLesson';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/**
 * A Newton scene from the default scene: the method, the example, the start x0 (in this order, because choosing an example resets the start),
 * then `steps` Next-step commands. Every one of these actions pauses playback, so a scene never starts playing.
 */
const newtonScene = (
    id: string, example: 'square-minus-two' | 'cubic-two-cycle' | 'cubic-three-roots', x0: number, steps: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'root-finding-method', value: 'newton'},
        {kind: 'function-choice', name: 'root-finding-example', value: example},
        {kind: 'function-parameter', name: 'root-x0', value: x0},
        ...Array.from({length: steps}, () => ({kind: 'animation', animationId: 'root-finding', command: 'next-step'}) as const),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

/**
 * A secant scene from the default scene: the method, the example (which resets both starts), then the starts in an order that never
 * makes them equal at the moment one moves, then `steps` Next-step commands. Every one of these actions pauses playback.
 */
const secantScene = (
    id: string, example: 'square-minus-two' | 'cubic-two-cycle' | 'cubic-three-roots', x0: number, x1: number, steps: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'root-finding-method', value: 'secant'},
        {kind: 'function-choice', name: 'root-finding-example', value: example},
        {kind: 'function-parameter', name: 'root-x0', value: x0},
        {kind: 'function-parameter', name: 'root-x1', value: x1},
        ...Array.from({length: steps}, () => ({kind: 'animation', animationId: 'root-finding', command: 'next-step'}) as const),
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
    animation: {animationId: 'root-finding'},
});

const rootFindingLesson: GuidedLesson = {
    demonstrationId: 'root-finding',
    title: text('Tangentna (Newtonova) in sekantna metoda', 'Newton\'s method and the secant method'),
    summary: text(
        'Tangentna (Newtonova) metoda iz približka \\(x_k\\) potegne tangento na graf funkcije \\(f\\) in vzame njeno presečišče z osjo \\(x\\) za naslednji približek. Blizu enostavne ničle se število pravilnih mest približno podvoji v vsakem koraku, zato metoda konvergira bistveno hitreje kot bisekcija. Konvergenca pa zahteva dovolj dober začetek: približki se lahko ponavljajo ali odskočijo, bisekcija pa deluje, dokler se predznak spremeni. Sekantna metoda namesto tangente vzame sekanto skozi zadnja dva približka in zato ne potrebuje odvoda \\(f\'\\).',
        'Newton\'s method draws the tangent to the graph of \\(f\\) at the iterate \\(x_k\\) and takes its intersection with the \\(x\\)-axis as the next iterate. Near a simple root the number of correct digits roughly doubles in every step, so the method converges much faster than bisection. Convergence does need a good enough start: the iterates can repeat or jump away, while bisection keeps working as long as the sign changes. The secant method takes the secant through the last two iterates instead of the tangent and so needs no derivative \\(f\'\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje tangente in sekante grafa funkcije iz lekcije o odvodu.', 'Assumes the tangent line and the secant line of a graph from the lesson on the derivative.'),
        text('Priporočeni sta lekciji o bisekciji in o iteraciji s fiksno točko.', 'The lessons on bisection and on fixed-point iteration are recommended.'),
    ],
    learningGoals: [
        text('Napoveš, kje tangenta seka os \\(x\\), in izračunaš naslednji približek iz \\(f(x_k)\\) in \\(f\'(x_k)\\).', 'Predict where the tangent meets the \\(x\\)-axis and compute the next iterate from \\(f(x_k)\\) and \\(f\'(x_k)\\).'),
        text('Na napakah prvih korakov opaziš hitro konvergenco blizu enostavne ničle in veš, da to ni trditev za ves potek iteracije.', 'Read the fast convergence near a simple root off the errors of the first steps, and know that this is not a claim about the whole run.'),
        text('Primerjaš metodo z bisekcijo in opaziš, da začetek določa, h kateri ničli iteracija konvergira.', 'Compare the method with bisection and notice that the start decides which root the iteration reaches.'),
        text('Na primeru razložiš, kako se približki ponavljajo ali odskočijo, in imenuješ, kaj mora veljati za konvergenco.', 'Explain on an example how the iterates repeat or jump away, and name what convergence needs.'),
        text('Napoveš presečišče sekante z osjo \\(x\\), primerjaš napake sekantne in Newtonove metode ter veš, da red \\(1{,}618\\) velja pod pogoji, ne iz slike.', 'Predict where the secant meets the \\(x\\)-axis, compare the errors of the secant and Newton methods, and know that the order \\(1.618\\) holds under hypotheses and is not read off the picture.'),
    ],
    formulaBlocks: [
        {
            id: 'newton-step',
            latex: 'x_{k+1}=x_k-\\frac{f(x_k)}{f\'(x_k)}',
            notation: text(
                '\\(x_k\\) je zadnji približek, \\(f(x_k)\\) vrednost funkcije v njem in \\(f\'(x_k)\\) smerni koeficient tangente.',
                '\\(x_k\\) is the last iterate, \\(f(x_k)\\) the value of the function there and \\(f\'(x_k)\\) the slope of the tangent.',
            ),
            explanation: text(
                'Tangenta v \\((x_k,f(x_k))\\) ima enačbo \\(y=f(x_k)+f\'(x_k)(x-x_k)\\). Pri \\(y=0\\) dobimo \\(x=x_k-f(x_k)/f\'(x_k)\\), to je \\(x_{k+1}\\). Če je \\(f\'(x_k)=0\\), je tangenta vodoravna in naslednjega približka ni.',
                'The tangent at \\((x_k,f(x_k))\\) has the equation \\(y=f(x_k)+f\'(x_k)(x-x_k)\\). Setting \\(y=0\\) gives \\(x=x_k-f(x_k)/f\'(x_k)\\), which is \\(x_{k+1}\\). If \\(f\'(x_k)=0\\) the tangent is horizontal and there is no next iterate.',
            ),
        },
        {
            id: 'newton-cycle',
            latex: 'f(x)=x^3-2x+2,\\qquad x_{k+1}=x_k-\\frac{x_k^3-2x_k+2}{3x_k^2-2}',
            notation: text(
                'Funkcija \\(f\\) in iteracija iz prvega dela; \\(f\'(x)=3x^2-2\\) je nič pri \\(x=\\pm\\sqrt{2/3}\\approx\\pm0{,}8165\\).',
                'The function \\(f\\) and the iteration of the first part; \\(f\'(x)=3x^2-2\\) is zero at \\(x=\\pm\\sqrt{2/3}\\approx\\pm0.8165\\).',
            ),
            explanation: text(
                'Iz \\(x_0=0\\) dobimo \\(x_1=0-\\dfrac{2}{-2}=1\\) in \\(x_2=1-\\dfrac{1}{1}=0\\), potem se vse ponavlja. Zadosten pogoj za konvergenco je enostavna ničla (\\(f(r)=0\\), \\(f\'(r)\\ne0\\)), \\(f\'\\ne0\\) v okolici in dovolj blizu izbran začetek; tu so prikazani cikel in vodoravna tangenta, ne vsi možni primeri odpovedi.',
                'From \\(x_0=0\\) we get \\(x_1=0-\\dfrac{2}{-2}=1\\) and \\(x_2=1-\\dfrac{1}{1}=0\\), and then everything repeats. A sufficient condition for convergence is a simple root (\\(f(r)=0\\), \\(f\'(r)\\ne0\\)), \\(f\'\\ne0\\) nearby and a start close enough; the cycle and the nearly flat tangent shown here are not all the ways it can fail.',
            ),
        },
        {
            id: 'secant-step',
            latex: 'x_{k+1}=x_k-f(x_k)\\,\\frac{x_k-x_{k-1}}{f(x_k)-f(x_{k-1})}',
            notation: text(
                '\\(x_k\\) in \\(x_{k-1}\\) sta zadnja dva približka, \\(f(x_k)\\) in \\(f(x_{k-1})\\) vrednosti funkcije v njiju.',
                '\\(x_k\\) and \\(x_{k-1}\\) are the last two iterates, \\(f(x_k)\\) and \\(f(x_{k-1})\\) the values of the function there.',
            ),
            explanation: text(
                'Sekanta skozi \\((x_{k-1},f(x_{k-1}))\\) in \\((x_k,f(x_k))\\) ima smerni koeficient \\(\\dfrac{f(x_k)-f(x_{k-1})}{x_k-x_{k-1}}\\); njeno presečišče z osjo \\(x\\) je \\(x_{k+1}\\). V vsakem koraku je potreben le en nov izračun \\(f\\), odvod ni potreben. Če je \\(f(x_k)=f(x_{k-1})\\), je sekanta vodoravna in naslednjega približka ni. Red konvergence \\(\\tfrac{1+\\sqrt5}{2}\\approx1{,}618\\) je izrek za enostavno ničlo in dovolj blizu izbrana začetka; iz slike ga ne moremo izpeljati.',
                'The secant through \\((x_{k-1},f(x_{k-1}))\\) and \\((x_k,f(x_k))\\) has the slope \\(\\dfrac{f(x_k)-f(x_{k-1})}{x_k-x_{k-1}}\\); its intersection with the \\(x\\)-axis is \\(x_{k+1}\\). Each step needs only one new evaluation of \\(f\\), and no derivative. If \\(f(x_k)=f(x_{k-1})\\) the secant is horizontal and there is no next iterate. The order of convergence \\(\\tfrac{1+\\sqrt5}{2}\\approx1.618\\) is a theorem for a simple root and starts close enough; it cannot be derived from the picture.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'newton-first-step',
            title: text('Prvi korak za \\(x^2-2\\) iz \\(x_0=1\\)', 'The first step for \\(x^2-2\\) from \\(x_0=1\\)'),
            calculationLatex: 'x_1=1-\\frac{1^2-2}{2\\cdot 1}=1+\\frac12',
            resultLatex: '1{,}5',
            check: text(
                'Za \\(f(x)=x^2-2\\) je \\(f\'(x)=2x\\), \\(f(1)=-1\\) in \\(f\'(1)=2\\), zato je \\(x_1=1+\\tfrac12=1{,}5\\). Naslednja približka sta \\(x_2=1{,}41667\\) in \\(x_3=1{,}4142157\\), ničla je \\(\\sqrt2=1{,}4142136\\ldots\\)',
                'For \\(f(x)=x^2-2\\) we have \\(f\'(x)=2x\\), \\(f(1)=-1\\) and \\(f\'(1)=2\\), so \\(x_1=1+\\tfrac12=1.5\\). The next iterates are \\(x_2=1.41667\\) and \\(x_3=1.4142157\\), the root is \\(\\sqrt2=1.4142136\\ldots\\)',
            ),
        },
        {
            id: 'newton-two-cycle',
            title: text('Cikel dolžine \\(2\\) za \\(x^3-2x+2\\)', 'A cycle of length \\(2\\) for \\(x^3-2x+2\\)'),
            calculationLatex: 'x_1=0-\\frac{2}{-2}=1,\\qquad x_2=1-\\frac{1}{1}=0',
            resultLatex: '0,\\;1,\\;0,\\;1,\\;\\ldots',
            check: text(
                'Za \\(f(x)=x^3-2x+2\\) je \\(f(0)=2\\), \\(f\'(0)=-2\\), \\(f(1)=1\\) in \\(f\'(1)=1\\), zato je \\(x_1=1\\) in \\(x_2=0\\). Edina realna ničla je približno \\(-1{,}7693\\).',
                'For \\(f(x)=x^3-2x+2\\) we have \\(f(0)=2\\), \\(f\'(0)=-2\\), \\(f(1)=1\\) and \\(f\'(1)=1\\), so \\(x_1=1\\) and \\(x_2=0\\). The only real root is about \\(-1.7693\\).',
            ),
        },
        {
            id: 'secant-first-step',
            title: text('Prvi korak sekantne metode za \\(x^2-2\\) iz \\(x_0=1\\), \\(x_1=2\\)', 'The first secant step for \\(x^2-2\\) from \\(x_0=1\\), \\(x_1=2\\)'),
            calculationLatex: 'x_2=2-2\\cdot\\frac{2-1}{2-(-1)}=2-\\frac23',
            resultLatex: '1{,}3333',
            check: text(
                'Za \\(f(x)=x^2-2\\) je \\(f(1)=-1\\) in \\(f(2)=2\\), zato je smerni koeficient sekante \\(\\tfrac{2-(-1)}{2-1}=3\\) in \\(x_2=2-\\tfrac23=1{,}3333\\). Naslednja približka sta \\(x_3=1{,}4\\) in \\(x_4=1{,}4146\\).',
                'For \\(f(x)=x^2-2\\) we have \\(f(1)=-1\\) and \\(f(2)=2\\), so the slope of the secant is \\(\\tfrac{2-(-1)}{2-1}=3\\) and \\(x_2=2-\\tfrac23=1.3333\\). The next iterates are \\(x_3=1.4\\) and \\(x_4=1.4146\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'newton-predict', order: 1,
            title: text('Funkcija, začetek in ničla', 'The function, the start and the root'),
            purpose: text('Pred razkritjem napovedati, kje leži naslednji približek.', 'Predicting, before the reveal, where the next iterate lies.'),
            explanation: text(
                'Graf kaže \\(f(x)=x^2-2\\) in začetni približek \\(x_0=1\\); ničla je \\(\\sqrt2\\approx1{,}4142\\), korak še ni narejen. Metoda v \\((x_0,f(x_0))\\) potegne tangento na graf in vzame njeno presečišče z osjo \\(x\\) za \\(x_1\\). Napovej: ali bo \\(x_1\\) levo ali desno od ničle in približno kje?',
                'The graph shows \\(f(x)=x^2-2\\) and the starting iterate \\(x_0=1\\); the root is \\(\\sqrt2\\approx1.4142\\) and no step has been taken yet. The method draws the tangent to the graph at \\((x_0,f(x_0))\\) and takes its intersection with the \\(x\\)-axis as \\(x_1\\). Predict: will \\(x_1\\) lie to the left or to the right of the root, and about where?',
            ),
            formulaIds: ['newton-step'],
            observationPrompt: text('Pred razkritjem si predstavljaj tangento v točki \\((1,-1)\\) in kam seka os \\(x\\).', 'Before the reveal imagine the tangent at the point \\((1,-1)\\) and where it meets the \\(x\\)-axis.'),
            expectedObservations: [text('Pri \\(x_0=1\\) je \\(f(x_0)=-1\\) in korak še ni narejen.', 'At \\(x_0=1\\) we have \\(f(x_0)=-1\\) and no step has been taken yet.')],
            scene: newtonScene('newton-predict-start', 'square-minus-two', 1, 0,
                'Primer \\(x^2-2\\), \\(x_0=1\\), korak \\(0\\); predvajanje je ustavljeno.',
                'The example \\(x^2-2\\), \\(x_0=1\\), step \\(0\\); playback is stopped.'),
        }),
        step({
            id: 'newton-tangent', order: 2,
            title: text('Tangenta in prvi približek', 'The tangent and the first iterate'),
            purpose: text('Videti, da je presečišče tangente z osjo \\(x\\) naslednji približek.', 'Seeing that the intersection of the tangent with the \\(x\\)-axis is the next iterate.'),
            explanation: text(
                'Prikazan je prvi korak: tangenta v \\((1,-1)\\) seka os \\(x\\) pri \\(x_1=1{,}5\\). Račun: \\(f(1)=-1\\), \\(f\'(1)=2\\), zato je \\(x_1=1-\\dfrac{-1}{2}=1{,}5\\). Približek je zdaj desno od ničle \\(\\sqrt2\\approx1{,}4142\\), napaka je \\(8{,}6\\cdot10^{-2}\\).',
                'The first step is shown: the tangent at \\((1,-1)\\) meets the \\(x\\)-axis at \\(x_1=1.5\\). Computation: \\(f(1)=-1\\), \\(f\'(1)=2\\), so \\(x_1=1-\\dfrac{-1}{2}=1.5\\). The iterate is now to the right of the root \\(\\sqrt2\\approx1.4142\\), the error is \\(8.6\\cdot10^{-2}\\).',
            ),
            formulaIds: ['newton-step'],
            workedExampleId: 'newton-first-step',
            observationPrompt: text('Primerjaj napoved s presečiščem tangente in z vrednostjo v tabeli približkov.', 'Compare your prediction with the intersection of the tangent and the value in the table of iterates.'),
            expectedObservations: [text('Presečišče tangente z osjo \\(x\\) je \\(x_1=1{,}5\\), enako vrednosti v tabeli.', 'The intersection of the tangent with the \\(x\\)-axis is \\(x_1=1.5\\), the value in the table.')],
            scene: newtonScene('newton-tangent-step', 'square-minus-two', 1, 1,
                'Primer \\(x^2-2\\), \\(x_0=1\\), korak \\(1\\): \\(x_1=1{,}5\\), napaka \\(8{,}6\\cdot10^{-2}\\).',
                'The example \\(x^2-2\\), \\(x_0=1\\), step \\(1\\): \\(x_1=1.5\\), error \\(8.6\\cdot10^{-2}\\).'),
        }),
        step({
            id: 'newton-iterates', order: 3,
            title: text('Napake in hitra konvergenca', 'Errors and fast convergence'),
            purpose: text('Brati napake prvih treh korakov in opaziti, kako hitro padajo.', 'Reading the errors of the first three steps and noticing how fast they fall.'),
            explanation: text(
                'Prikazani so trije koraki: \\(x_1=1{,}5\\), \\(x_2=1{,}41667\\), \\(x_3=1{,}4142157\\). Napake glede na \\(\\sqrt2\\) so \\(8{,}6\\cdot10^{-2}\\), \\(2{,}5\\cdot10^{-3}\\) in \\(2{,}1\\cdot10^{-6}\\). Eksponent napake se približno podvoji: \\(-2\\), \\(-3\\), \\(-6\\). To velja blizu enostavne ničle in ne za ves potek iteracije; stolpec napak razlago ponazarja, ne dokazuje.',
                'Three steps are shown: \\(x_1=1.5\\), \\(x_2=1.41667\\), \\(x_3=1.4142157\\). The errors against \\(\\sqrt2\\) are \\(8.6\\cdot10^{-2}\\), \\(2.5\\cdot10^{-3}\\) and \\(2.1\\cdot10^{-6}\\). The exponent of the error roughly doubles: \\(-2\\), \\(-3\\), \\(-6\\). This holds near a simple root and not for the whole run; the error column illustrates the explanation and does not prove it.',
            ),
            formulaIds: ['newton-step'],
            observationPrompt: text('Napovej napako po četrtem koraku in preveri v tabeli.', 'Predict the error after the fourth step and check it in the table.'),
            expectedObservations: [text('Napaka pade od \\(8{,}6\\cdot10^{-2}\\) prek \\(2{,}5\\cdot10^{-3}\\) do \\(2{,}1\\cdot10^{-6}\\).', 'The error falls from \\(8.6\\cdot10^{-2}\\) through \\(2.5\\cdot10^{-3}\\) to \\(2.1\\cdot10^{-6}\\).')],
            scene: newtonScene('newton-iterates-three', 'square-minus-two', 1, 3,
                'Primer \\(x^2-2\\), \\(x_0=1\\), korak \\(3\\): \\(x_3=1{,}4142157\\), napaka \\(2{,}1\\cdot10^{-6}\\).',
                'The example \\(x^2-2\\), \\(x_0=1\\), step \\(3\\): \\(x_3=1.4142157\\), error \\(2.1\\cdot10^{-6}\\).'),
        }),
        step({
            id: 'newton-vs-bisection', order: 4,
            title: text('Primerjava z bisekcijo', 'Comparison with bisection'),
            purpose: text('Primerjati število korakov za isto natančnost pri Newtonovi metodi in pri bisekciji.', 'Comparing the number of steps for the same accuracy in Newton\'s method and in bisection.'),
            explanation: text(
                'Prikazan je četrti korak, napaka je \\(1{,}6\\cdot10^{-12}\\). Bisekcija na \\([1,2]\\) razpolovi širino intervala, zato je širina po \\(n\\) korakih \\(2^{-n}\\) in prvič pade pod \\(10^{-10}\\) pri \\(n=34\\), ko je \\(2^{-34}\\approx5{,}8\\cdot10^{-11}\\). Newtonova metoda potrebuje za to natančnost štiri korake, a zahteva odvod in dober začetek; bisekcija zahteva le spremembo predznaka.',
                'The fourth step is shown, the error is \\(1.6\\cdot10^{-12}\\). Bisection on \\([1,2]\\) halves the width, so the width after \\(n\\) steps is \\(2^{-n}\\) and first falls below \\(10^{-10}\\) at \\(n=34\\), where \\(2^{-34}\\approx5.8\\cdot10^{-11}\\). Newton\'s method needs four steps for this accuracy, but it needs the derivative and a good start; bisection needs only a change of sign.',
            ),
            formulaIds: ['newton-step'],
            observationPrompt: text('Primerjaj \\(4\\) korake Newtonove metode s \\(34\\) koraki bisekcije.', 'Compare the \\(4\\) steps of Newton\'s method with the \\(34\\) steps of bisection.'),
            expectedObservations: [text('Po štirih korakih je napaka \\(1{,}6\\cdot10^{-12}\\), bisekcija pa potrebuje \\(34\\) korakov za širino pod \\(10^{-10}\\).', 'After four steps the error is \\(1.6\\cdot10^{-12}\\), while bisection needs \\(34\\) steps for a width below \\(10^{-10}\\).')],
            scene: newtonScene('newton-bisection-compare', 'square-minus-two', 1, 4,
                'Primer \\(x^2-2\\), \\(x_0=1\\), korak \\(4\\): \\(x_4=1{,}4142136\\), napaka \\(1{,}6\\cdot10^{-12}\\).',
                'The example \\(x^2-2\\), \\(x_0=1\\), step \\(4\\): \\(x_4=1.4142136\\), error \\(1.6\\cdot10^{-12}\\).'),
        }),
        step({
            id: 'newton-start', order: 5,
            title: text('Začetek določa ničlo', 'The start decides the root'),
            purpose: text('Opaziti, da drug primer in drug začetek vodita k drugi ničli.', 'Noticing that another example and another start lead to another root.'),
            explanation: text(
                'Primer je zdaj \\(f(x)=x^3-x\\) z ničlami \\(-1\\), \\(0\\) in \\(1\\), začetek je \\(x_0=0{,}5\\). Tu je \\(f(0{,}5)=-0{,}375\\) in \\(f\'(0{,}5)=-0{,}25\\), zato je \\(x_1=0{,}5-\\dfrac{-0{,}375}{-0{,}25}=-1\\): iteracija skoči k ničli \\(-1\\), čeprav je začetek bliže ničli \\(0\\). Z začetkom \\(x_0=2\\) isti primer pride do ničle \\(1\\). Za \\(x^2-2\\) iz \\(x_0=0\\) je tangenta vodoravna in naslednjega približka ni. Povleci \\(x_0\\) in opazuj.',
                'The example is now \\(f(x)=x^3-x\\) with roots \\(-1\\), \\(0\\) and \\(1\\), the start is \\(x_0=0.5\\). Here \\(f(0.5)=-0.375\\) and \\(f\'(0.5)=-0.25\\), so \\(x_1=0.5-\\dfrac{-0.375}{-0.25}=-1\\): the iteration jumps to the root \\(-1\\) although the start is closer to the root \\(0\\). From \\(x_0=2\\) the same example reaches the root \\(1\\). For \\(x^2-2\\) from \\(x_0=0\\) the tangent is horizontal and there is no next iterate. Drag \\(x_0\\) and watch.',
            ),
            formulaIds: ['newton-step'],
            observationPrompt: text('Povleci \\(x_0\\) po osi \\(x\\) in poišči začetke, ki vodijo k vsaki od treh ničel.', 'Drag \\(x_0\\) along the \\(x\\)-axis and look for starts that lead to each of the three roots.'),
            expectedObservations: [text('Iz \\(x_0=0{,}5\\) pride iteracija v enem koraku do ničle \\(-1\\) in se ustavi z oznako najdene ničle.', 'From \\(x_0=0.5\\) the iteration reaches the root \\(-1\\) in one step and stops with the root-found status.')],
            scene: newtonScene('newton-start-three-roots', 'cubic-three-roots', 0.5, 1,
                'Primer \\(x^3-x\\), \\(x_0=0{,}5\\), korak \\(1\\): \\(x_1=-1\\), ničla je najdena.',
                'The example \\(x^3-x\\), \\(x_0=0.5\\), step \\(1\\): \\(x_1=-1\\), the root is found.'),
        }),
        step({
            id: 'newton-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati primere in začetke.', 'Exploring examples and starts on your own.'),
            explanation: text(
                'Primer je spet \\(f(x)=x^2-2\\) z začetkom \\(x_0=1\\), korak \\(0\\); vse je prosto za raziskovanje. Spremeni primer ali začetek in pritiskaj Naslednji korak. Ob vsaki spremembi se iteracija vrne na začetek.',
                'The example is again \\(f(x)=x^2-2\\) with the start \\(x_0=1\\), step \\(0\\); everything is free to explore. Change the example or the start and press Next step. Every change returns the iteration to its start.',
            ),
            formulaIds: ['newton-step'],
            observationPrompt: text('Poišči začetek, pri katerem Newtonova metoda ne konvergira.', 'Find a start for which Newton\'s method does not converge.'),
            expectedObservations: [text('Pri \\(x^2-2\\) iz \\(x_0=0\\) se iteracija ustavi: tangenta je vodoravna.', 'For \\(x^2-2\\) from \\(x_0=0\\) the iteration stops: the tangent is horizontal.')],
            scene: newtonScene('newton-explore-free', 'square-minus-two', 1, 0,
                'Primer \\(x^2-2\\), \\(x_0=1\\), korak \\(0\\); vse je prosto za raziskovanje.',
                'The example \\(x^2-2\\), \\(x_0=1\\), step \\(0\\); everything is free to explore.'),
        }),
        step({
            id: 'newton-fail-predict', order: 7,
            title: text('Newton na drugi funkciji', 'Newton on another function'),
            purpose: text('Pred razkritjem napovedati, kam pride iteracija iz \\(x_0=0\\).', 'Predicting, before the reveal, where the iteration goes from \\(x_0=0\\).'),
            explanation: text(
                'Graf kaže \\(f(x)=x^3-2x+2\\) in začetek \\(x_0=0\\), korak še ni narejen. Tu je \\(f(0)=2\\) in \\(f\'(0)=-2\\). Napovej \\(x_1\\), nato \\(x_2\\): kam pride iteracija in ali se približuje edini realni ničli blizu \\(-1{,}7693\\)?',
                'The graph shows \\(f(x)=x^3-2x+2\\) and the start \\(x_0=0\\), no step has been taken yet. Here \\(f(0)=2\\) and \\(f\'(0)=-2\\). Predict \\(x_1\\), then \\(x_2\\): where does the iteration go and does it approach the only real root near \\(-1.7693\\)?',
            ),
            formulaIds: ['newton-cycle'],
            workedExampleId: 'newton-two-cycle',
            observationPrompt: text('Izračunaj \\(x_1\\) in \\(x_2\\) na papirju, preden pritisneš Naslednji korak.', 'Compute \\(x_1\\) and \\(x_2\\) on paper before you press Next step.'),
            expectedObservations: [text('Pri \\(x_0=0\\) je \\(f(0)=2\\) in korak še ni narejen.', 'At \\(x_0=0\\) we have \\(f(0)=2\\) and no step has been taken yet.')],
            scene: newtonScene('newton-fail-predict-start', 'cubic-two-cycle', 0, 0,
                'Primer \\(x^3-2x+2\\), \\(x_0=0\\), korak \\(0\\).',
                'The example \\(x^3-2x+2\\), \\(x_0=0\\), step \\(0\\).'),
        }),
        step({
            id: 'newton-fail-cycle', order: 8,
            title: text('Cikel', 'The cycle'),
            purpose: text('Videti, da se približki ponavljajo in iteracija ne konvergira.', 'Seeing that the iterates repeat and the iteration does not converge.'),
            explanation: text(
                'Prikazana sta dva koraka: \\(x_1=1\\) in \\(x_2=0\\), spet začetek. Približki \\(0,1,0,1,\\ldots\\) se ponavljajo, zato graf ustavi iteracijo z oznako, da se približki ponavljajo in ni konvergence, namesto da bi tekla do omejitve korakov. Napaka glede na ničlo \\(-1{,}7693\\) se ne zmanjša.',
                'Two steps are shown: \\(x_1=1\\) and \\(x_2=0\\), the start again. The iterates \\(0,1,0,1,\\ldots\\) repeat, so the graph stops the iteration with the status that the iterates repeat and there is no convergence, instead of running to the step cap. The error against the root \\(-1.7693\\) does not shrink.',
            ),
            formulaIds: ['newton-cycle'],
            workedExampleId: 'newton-two-cycle',
            observationPrompt: text('Preberi stanje ob grafu in tabelo približkov.', 'Read the status next to the graph and the table of iterates.'),
            expectedObservations: [text('Tabela ima približke \\(0\\), \\(1\\), \\(0\\) in iteracija je ustavljena z oznako ponavljanja.', 'The table has the iterates \\(0\\), \\(1\\), \\(0\\) and the iteration is stopped with the repeat status.')],
            scene: newtonScene('newton-fail-cycle-two', 'cubic-two-cycle', 0, 2,
                'Primer \\(x^3-2x+2\\), \\(x_0=0\\), korak \\(2\\): približki \\(0,1,0\\), oznaka: približki se ponavljajo.',
                'The example \\(x^3-2x+2\\), \\(x_0=0\\), step \\(2\\): iterates \\(0,1,0\\), status: the iterates repeat.'),
        }),
        step({
            id: 'newton-fail-why', order: 9,
            title: text('Zakaj cikel', 'Why a cycle'),
            purpose: text('Razložiti cikel s tangentama v obeh točkah.', 'Explaining the cycle with the tangents at both points.'),
            explanation: text(
                'Prikazan je prvi korak: tangenta v \\((0,2)\\) ima smerni koeficient \\(-2\\) in seka os \\(x\\) pri \\(1\\). Tangenta v \\((1,1)\\) ima smerni koeficient \\(1\\) in seka os \\(x\\) pri \\(0\\). Tangenti si kažeta druga na drugo: vsaka vodi v točko, iz katere je potegnjena druga.',
                'The first step is shown: the tangent at \\((0,2)\\) has slope \\(-2\\) and meets the \\(x\\)-axis at \\(1\\). The tangent at \\((1,1)\\) has slope \\(1\\) and meets the \\(x\\)-axis at \\(0\\). The tangents point at each other: each leads to the point from which the other is drawn.',
            ),
            formulaIds: ['newton-cycle'],
            workedExampleId: 'newton-two-cycle',
            observationPrompt: text('Pritisni Naslednji korak in opazuj drugo tangento.', 'Press Next step and watch the second tangent.'),
            expectedObservations: [text('Tangenta iz \\((0,2)\\) seka os \\(x\\) pri \\(1\\); naslednji korak potegne tangento iz \\((1,1)\\) nazaj k \\(0\\).', 'The tangent from \\((0,2)\\) meets the \\(x\\)-axis at \\(1\\); the next step draws the tangent from \\((1,1)\\) back to \\(0\\).')],
            scene: newtonScene('newton-fail-why-first-step', 'cubic-two-cycle', 0, 1,
                'Primer \\(x^3-2x+2\\), \\(x_0=0\\), korak \\(1\\): \\(x_1=1\\).',
                'The example \\(x^3-2x+2\\), \\(x_0=0\\), step \\(1\\): \\(x_1=1\\).'),
        }),
        step({
            id: 'newton-fail-converge', order: 10,
            title: text('Drug začetek konvergira', 'Another start converges'),
            purpose: text('Primerjati cikel s konvergentno iteracijo iz drugega začetka.', 'Comparing the cycle with a convergent iteration from another start.'),
            explanation: text(
                'Začetek je zdaj \\(x_0=-2\\), prikazani so štirje koraki: \\(-1{,}8\\), \\(-1{,}76995\\), \\(-1{,}7692927\\), \\(-1{,}7692924\\). Približki se približujejo edini realni ničli \\(-1{,}7693\\) in napaka hitro pada. Isti \\(f\\) ima torej začetke, ki vodijo v cikel, in začetke, ki konvergirajo; zato odpoved ni lastnost kubičnih funkcij nasploh.',
                'The start is now \\(x_0=-2\\) and four steps are shown: \\(-1.8\\), \\(-1.76995\\), \\(-1.7692927\\), \\(-1.7692924\\). The iterates approach the only real root \\(-1.7693\\) and the error falls fast. So the same \\(f\\) has starts that lead into a cycle and starts that converge; the failure is not a property of cubic functions in general.',
            ),
            formulaIds: ['newton-cycle'],
            observationPrompt: text('Povleci \\(x_0\\) od \\(-2\\) proti \\(0\\) in poišči, kje se obnašanje spremeni.', 'Drag \\(x_0\\) from \\(-2\\) towards \\(0\\) and find where the behaviour changes.'),
            expectedObservations: [text('Po štirih korakih je približek \\(-1{,}7692924\\), napaka pa pod \\(10^{-10}\\).', 'After four steps the iterate is \\(-1.7692924\\) and the error is below \\(10^{-10}\\).')],
            scene: newtonScene('newton-fail-converge-from-minus-two', 'cubic-two-cycle', -2, 4,
                'Primer \\(x^3-2x+2\\), \\(x_0=-2\\), korak \\(4\\): \\(x_4=-1{,}7692924\\).',
                'The example \\(x^3-2x+2\\), \\(x_0=-2\\), step \\(4\\): \\(x_4=-1.7692924\\).'),
        }),
        step({
            id: 'newton-fail-flat', order: 11,
            title: text('Skoraj vodoravna tangenta', 'A nearly flat tangent'),
            purpose: text('Videti, da začetek blizu kritične točke pošlje približek daleč stran.', 'Seeing that a start near a critical point sends the iterate far away.'),
            explanation: text(
                'Odvod \\(f\'(x)=3x^2-2\\) je nič pri \\(x=\\pm\\sqrt{2/3}\\approx\\pm0{,}8165\\). Začetek je \\(x_0=0{,}8\\), blizu te točke: \\(f(0{,}8)=0{,}912\\) in \\(f\'(0{,}8)=-0{,}08\\), zato je \\(x_1=0{,}8+\\dfrac{0{,}912}{0{,}08}=12{,}2\\). Približek je daleč desno, izven prikazanega okna, in vrednost je v tabeli. Pri točno ničelnem odvodu naslednjega približka sploh ni.',
                'The derivative \\(f\'(x)=3x^2-2\\) is zero at \\(x=\\pm\\sqrt{2/3}\\approx\\pm0.8165\\). The start is \\(x_0=0.8\\), close to this point: \\(f(0.8)=0.912\\) and \\(f\'(0.8)=-0.08\\), so \\(x_1=0.8+\\dfrac{0.912}{0.08}=12.2\\). The iterate is far to the right, outside the visible window, and its value is in the table. With a derivative exactly zero there is no next iterate at all.',
            ),
            formulaIds: ['newton-cycle'],
            observationPrompt: text('Poišči v tabeli \\(x_1\\) in primerjaj z začetkom \\(0{,}8\\).', 'Find \\(x_1\\) in the table and compare it with the start \\(0.8\\).'),
            expectedObservations: [text('Približek skoči z \\(0{,}8\\) na \\(12{,}2\\); napaka glede na ničlo se močno poveča.', 'The iterate jumps from \\(0.8\\) to \\(12.2\\); the error against the root grows a lot.')],
            scene: newtonScene('newton-fail-flat-start', 'cubic-two-cycle', 0.8, 1,
                'Primer \\(x^3-2x+2\\), \\(x_0=0{,}8\\), korak \\(1\\): \\(x_1=12{,}2\\), izven okna.',
                'The example \\(x^3-2x+2\\), \\(x_0=0.8\\), step \\(1\\): \\(x_1=12.2\\), outside the window.'),
        }),
        step({
            id: 'newton-fail-bisection', order: 12,
            title: text('Bisekcija na isti krivulji', 'Bisection on the same curve'),
            purpose: text('Videti, da bisekcija potrebuje le spremembo predznaka.', 'Seeing that bisection needs only a change of sign.'),
            explanation: text(
                'Krivulja je ista, začetek je \\(x_0=-2\\). Ker je \\(f(-2)=-2\\) in \\(f(-1)=3\\), ima \\(f\\) na \\([-2,-1]\\) ničlo. Sredina je \\(-1{,}5\\) in \\(f(-1{,}5)=1{,}625>0\\), zato ničla leži v \\([-2;\\ -1{,}5]\\). Tako se interval razpolovi v vsakem koraku, ne glede na odvod. Ta Demonstracija bisekcijskega intervala ne prikazuje, račun je zato ročen.',
                'The curve is the same, the start is \\(x_0=-2\\). Since \\(f(-2)=-2\\) and \\(f(-1)=3\\), \\(f\\) has a root in \\([-2,-1]\\). The midpoint is \\(-1.5\\) and \\(f(-1.5)=1.625>0\\), so the root lies in \\([-2;\\ -1.5]\\). The interval halves in every step, whatever the derivative. This Demonstration does not draw a bisection interval, so the computation is by hand.',
            ),
            formulaIds: ['newton-cycle'],
            observationPrompt: text('Izračunaj naslednjo sredino in izberi polovico s spremembo predznaka.', 'Compute the next midpoint and choose the half with the sign change.'),
            expectedObservations: [text('Predznaka \\(f(-2)=-2\\) in \\(f(-1)=3\\) sta nasprotna, zato interval \\([-2,-1]\\) vsebuje ničlo.', 'The signs of \\(f(-2)=-2\\) and \\(f(-1)=3\\) are opposite, so the interval \\([-2,-1]\\) contains a root.')],
            scene: newtonScene('newton-fail-bisection-bracket', 'cubic-two-cycle', -2, 0,
                'Primer \\(x^3-2x+2\\), \\(x_0=-2\\), korak \\(0\\); ničla leži med \\(-2\\) in \\(-1\\).',
                'The example \\(x^3-2x+2\\), \\(x_0=-2\\), step \\(0\\); the root lies between \\(-2\\) and \\(-1\\).'),
        }),
        step({
            id: 'newton-fail-explore', order: 13,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati začetke na tej krivulji.', 'Exploring starts on this curve on your own.'),
            explanation: text(
                'Primer je \\(f(x)=x^3-2x+2\\) z začetkom \\(x_0=0\\), korak \\(0\\); vse je prosto za raziskovanje. Spreminjaj začetek in pritiskaj Naslednji korak. Poišči začetke, ki konvergirajo, se ponavljajo ali odskočijo.',
                'The example is \\(f(x)=x^3-2x+2\\) with the start \\(x_0=0\\), step \\(0\\); everything is free to explore. Vary the start and press Next step. Look for starts that converge, repeat or jump away.',
            ),
            formulaIds: ['newton-cycle'],
            observationPrompt: text('Poišči še en začetek, ki vodi v cikel.', 'Find another start that leads into a cycle.'),
            expectedObservations: [text('Začetek \\(x_0=1\\) je v istem ciklu \\(1,0,1\\).', 'The start \\(x_0=1\\) is in the same cycle \\(1,0,1\\).')],
            scene: newtonScene('newton-fail-explore-free', 'cubic-two-cycle', 0, 0,
                'Primer \\(x^3-2x+2\\), \\(x_0=0\\), korak \\(0\\); vse je prosto za raziskovanje.',
                'The example \\(x^3-2x+2\\), \\(x_0=0\\), step \\(0\\); everything is free to explore.'),
        }),
        step({
            id: 'secant-predict', order: 14,
            title: text('Dva začetka in sekanta', 'Two starts and the secant'),
            purpose: text('Pred razkritjem napovedati presečišče sekante z osjo \\(x\\).', 'Predicting, before the reveal, where the secant meets the \\(x\\)-axis.'),
            explanation: text(
                'Metoda je zdaj sekantna. Graf kaže \\(f(x)=x^2-2\\) in dva začetka \\(x_0=1\\) ter \\(x_1=2\\), korak še ni narejen. Namesto tangente potegnemo sekanto skozi \\((1,-1)\\) in \\((2,2)\\); odvoda \\(f\'\\) ne potrebujemo. Napovej, kje sekanta seka os \\(x\\): to bo \\(x_2\\).',
                'The method is now the secant method. The graph shows \\(f(x)=x^2-2\\) and the two starts \\(x_0=1\\) and \\(x_1=2\\), no step has been taken yet. Instead of a tangent we draw the secant through \\((1,-1)\\) and \\((2,2)\\); we do not need the derivative \\(f\'\\). Predict where the secant meets the \\(x\\)-axis: that will be \\(x_2\\).',
            ),
            formulaIds: ['secant-step'],
            observationPrompt: text('Pred razkritjem oceni, ali je presečišče bližje \\(1\\) ali \\(2\\).', 'Before the reveal estimate whether the intersection is nearer to \\(1\\) or to \\(2\\).'),
            expectedObservations: [text('Pri \\(x_0=1\\) in \\(x_1=2\\) je \\(f(x_0)=-1\\), \\(f(x_1)=2\\) in korak še ni narejen.', 'At \\(x_0=1\\) and \\(x_1=2\\) we have \\(f(x_0)=-1\\), \\(f(x_1)=2\\) and no step has been taken yet.')],
            scene: secantScene('secant-predict-starts', 'square-minus-two', 1, 2, 0,
                'Sekantna metoda, primer \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), korak \\(0\\).',
                'The secant method, the example \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), step \\(0\\).'),
        }),
        step({
            id: 'secant-reveal', order: 15,
            title: text('Presečišče je naslednji približek', 'The intersection is the next iterate'),
            purpose: text('Videti, da presečišče sekante z osjo \\(x\\) postane \\(x_2\\) in da najstarejša točka odpade.', 'Seeing that the intersection of the secant with the \\(x\\)-axis becomes \\(x_2\\) and that the oldest point drops out.'),
            explanation: text(
                'Prikazan je prvi korak: sekanta seka os \\(x\\) pri \\(x_2=1{,}3333\\). Račun: smerni koeficient je \\(3\\), zato je \\(x_2=2-\\dfrac{2}{3}=1{,}3333\\). Napaka glede na \\(\\sqrt2\\approx1{,}4142\\) je \\(8{,}1\\cdot10^{-2}\\). Naslednja sekanta gre skozi \\(x_1\\) in \\(x_2\\); začetek \\(x_0=1\\) odpade.',
                'The first step is shown: the secant meets the \\(x\\)-axis at \\(x_2=1.3333\\). Computation: the slope is \\(3\\), so \\(x_2=2-\\dfrac{2}{3}=1.3333\\). The error against \\(\\sqrt2\\approx1.4142\\) is \\(8.1\\cdot10^{-2}\\). The next secant goes through \\(x_1\\) and \\(x_2\\); the start \\(x_0=1\\) drops out.',
            ),
            formulaIds: ['secant-step'],
            workedExampleId: 'secant-first-step',
            observationPrompt: text('Primerjaj napoved s presečiščem sekante in z vrednostjo v tabeli približkov.', 'Compare your prediction with the intersection of the secant and the value in the table of iterates.'),
            expectedObservations: [text('Presečišče sekante z osjo \\(x\\) je \\(x_2=1{,}3333\\), enako vrednosti v tabeli.', 'The intersection of the secant with the \\(x\\)-axis is \\(x_2=1.3333\\), the value in the table.')],
            scene: secantScene('secant-reveal-first', 'square-minus-two', 1, 2, 1,
                'Sekantna metoda, primer \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), korak \\(1\\): \\(x_2=1{,}3333\\), napaka \\(8{,}1\\cdot10^{-2}\\).',
                'The secant method, the example \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), step \\(1\\): \\(x_2=1.3333\\), error \\(8.1\\cdot10^{-2}\\).'),
        }),
        step({
            id: 'secant-iterates', order: 16,
            title: text('Naslednji približki', 'The following iterates'),
            purpose: text('Brati približke do \\(x_5\\) in napake, ki padajo.', 'Reading the iterates up to \\(x_5\\) and the falling errors.'),
            explanation: text(
                'Prikazani so štirje koraki: \\(x_2=1{,}3333\\), \\(x_3=1{,}4\\), \\(x_4=1{,}4146\\), \\(x_5=1{,}414211\\). Napake glede na \\(\\sqrt2\\) so \\(8{,}1\\cdot10^{-2}\\), \\(1{,}4\\cdot10^{-2}\\), \\(4{,}2\\cdot10^{-4}\\) in \\(2{,}1\\cdot10^{-6}\\). Napaka pada hitro, vendar počasneje kot pri Newtonovi metodi; to je primer iz enega začetka, ne dokaz.',
                'Four steps are shown: \\(x_2=1.3333\\), \\(x_3=1.4\\), \\(x_4=1.4146\\), \\(x_5=1.414211\\). The errors against \\(\\sqrt2\\) are \\(8.1\\cdot10^{-2}\\), \\(1.4\\cdot10^{-2}\\), \\(4.2\\cdot10^{-4}\\) and \\(2.1\\cdot10^{-6}\\). The error falls fast, though more slowly than for Newton\'s method; this is an example from one start, not a proof.',
            ),
            formulaIds: ['secant-step'],
            workedExampleId: 'secant-first-step',
            observationPrompt: text('Napovej napako po petem koraku in preveri v tabeli.', 'Predict the error after the fifth step and check it in the table.'),
            expectedObservations: [text('Napaka pade od \\(8{,}1\\cdot10^{-2}\\) prek \\(1{,}4\\cdot10^{-2}\\) in \\(4{,}2\\cdot10^{-4}\\) do \\(2{,}1\\cdot10^{-6}\\).', 'The error falls from \\(8.1\\cdot10^{-2}\\) through \\(1.4\\cdot10^{-2}\\) and \\(4.2\\cdot10^{-4}\\) to \\(2.1\\cdot10^{-6}\\).')],
            scene: secantScene('secant-iterates-four', 'square-minus-two', 1, 2, 4,
                'Sekantna metoda, primer \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), korak \\(4\\): \\(x_5=1{,}414211\\), napaka \\(2{,}1\\cdot10^{-6}\\).',
                'The secant method, the example \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), step \\(4\\): \\(x_5=1.414211\\), error \\(2.1\\cdot10^{-6}\\).'),
        }),
        step({
            id: 'secant-vs-newton', order: 17,
            title: text('Primerjava z Newtonovo metodo', 'Comparison with Newton\'s method'),
            purpose: text('Primerjati napako po štirih korakih in ceno koraka pri obeh metodah.', 'Comparing the error after four steps and the cost of a step for both methods.'),
            explanation: text(
                'Po štirih korakih iz tega začetka je napaka sekantne metode \\(2{,}1\\cdot10^{-6}\\), Newtonove pa \\(1{,}6\\cdot10^{-12}\\). Sekantna metoda potrebuje v vsakem koraku en nov izračun \\(f\\), Newtonova pa \\(f\\) in \\(f\'\\). Red \\(1{,}618\\) sekantne metode je izrek za enostavno ničlo in dovolj blizu izbrana začetka; ta primer ga le ponazarja.',
                'After four steps from this start the error of the secant method is \\(2.1\\cdot10^{-6}\\) and that of Newton\'s method \\(1.6\\cdot10^{-12}\\). The secant method needs one new evaluation of \\(f\\) in each step, Newton\'s method needs \\(f\\) and \\(f\'\\). The order \\(1.618\\) of the secant method is a theorem for a simple root and starts close enough; this example only illustrates it.',
            ),
            formulaIds: ['secant-step'],
            observationPrompt: text('Preklopi na Newtonovo metodo in primerjaj napako po štirih korakih.', 'Switch to Newton\'s method and compare the error after four steps.'),
            expectedObservations: [text('Po štirih korakih je napaka sekantne metode \\(2{,}1\\cdot10^{-6}\\), Newtonove pa \\(1{,}6\\cdot10^{-12}\\).', 'After four steps the error of the secant method is \\(2.1\\cdot10^{-6}\\) and that of Newton\'s method \\(1.6\\cdot10^{-12}\\).')],
            scene: secantScene('secant-newton-compare', 'square-minus-two', 1, 2, 4,
                'Sekantna metoda, primer \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), korak \\(4\\): napaka \\(2{,}1\\cdot10^{-6}\\); Newton po štirih korakih \\(1{,}6\\cdot10^{-12}\\).',
                'The secant method, the example \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), step \\(4\\): error \\(2.1\\cdot10^{-6}\\); Newton after four steps \\(1.6\\cdot10^{-12}\\).'),
        }),
        step({
            id: 'secant-flat', order: 18,
            title: text('Vodoravna sekanta', 'A horizontal secant'),
            purpose: text('Videti, da iteracija obstane, če imata zadnja približka isto vrednost funkcije.', 'Seeing that the iteration stops when the last two iterates have the same function value.'),
            explanation: text(
                'Začetka sta \\(x_0=-1\\) in \\(x_1=1\\). Tu je \\(f(-1)=-1=f(1)\\), zato je sekanta vodoravna in ne seka osi \\(x\\). Graf ustavi iteracijo z oznako vodoravne sekante; naslednjega približka ni. Enaka začetka niso dovoljena.',
                'The starts are \\(x_0=-1\\) and \\(x_1=1\\). Here \\(f(-1)=-1=f(1)\\), so the secant is horizontal and does not meet the \\(x\\)-axis. The graph stops the iteration with the horizontal-secant status; there is no next iterate. Equal starts are not allowed.',
            ),
            formulaIds: ['secant-step'],
            observationPrompt: text('Premakni \\(x_1\\) malo stran od \\(1\\) in opazuj sekanto.', 'Move \\(x_1\\) a little away from \\(1\\) and watch the secant.'),
            expectedObservations: [text('Pri \\(x_0=-1\\), \\(x_1=1\\) je \\(f(x_0)=f(x_1)=-1\\) in iteracija je ustavljena z oznako vodoravne sekante.', 'For \\(x_0=-1\\), \\(x_1=1\\) we have \\(f(x_0)=f(x_1)=-1\\) and the iteration is stopped with the horizontal-secant status.')],
            scene: secantScene('secant-flat-starts', 'square-minus-two', -1, 1, 0,
                'Sekantna metoda, primer \\(x^2-2\\), \\(x_0=-1\\), \\(x_1=1\\), korak \\(0\\): sekanta je vodoravna, iteracija se ustavi.',
                'The secant method, the example \\(x^2-2\\), \\(x_0=-1\\), \\(x_1=1\\), step \\(0\\): the secant is horizontal, the iteration stops.'),
        }),
        step({
            id: 'secant-start', order: 19,
            title: text('Drugi začetki', 'Other starts'),
            purpose: text('Opaziti, da začetka določata, h kateri ničli iteracija pride.', 'Noticing that the two starts decide which root the iteration reaches.'),
            explanation: text(
                'Primer je \\(f(x)=x^3-x\\) z ničlami \\(-1\\), \\(0\\) in \\(1\\), začetka sta \\(x_0=0{,}4\\) in \\(x_1=0{,}6\\). Tu je \\(f(0{,}4)=-0{,}336\\) in \\(f(0{,}6)=-0{,}384\\), smerni koeficient sekante je \\(-0{,}24\\), zato je \\(x_2=0{,}6-\\dfrac{-0{,}384}{-0{,}24}=-1\\): iteracija skoči k ničli \\(-1\\).',
                'The example is \\(f(x)=x^3-x\\) with roots \\(-1\\), \\(0\\) and \\(1\\), the starts are \\(x_0=0.4\\) and \\(x_1=0.6\\). Here \\(f(0.4)=-0.336\\) and \\(f(0.6)=-0.384\\), the slope of the secant is \\(-0.24\\), so \\(x_2=0.6-\\dfrac{-0.384}{-0.24}=-1\\): the iteration jumps to the root \\(-1\\).',
            ),
            formulaIds: ['secant-step'],
            observationPrompt: text('Povleci začetka in poišči pare, ki vodijo k vsaki od treh ničel.', 'Drag the starts and look for pairs that lead to each of the three roots.'),
            expectedObservations: [text('Iz \\(x_0=0{,}4\\), \\(x_1=0{,}6\\) pride iteracija v enem koraku do ničle \\(-1\\) in se ustavi z oznako najdene ničle.', 'From \\(x_0=0.4\\), \\(x_1=0.6\\) the iteration reaches the root \\(-1\\) in one step and stops with the root-found status.')],
            scene: secantScene('secant-start-three-roots', 'cubic-three-roots', 0.4, 0.6, 1,
                'Sekantna metoda, primer \\(x^3-x\\), \\(x_0=0{,}4\\), \\(x_1=0{,}6\\), korak \\(1\\): \\(x_2=-1\\), ničla je najdena.',
                'The secant method, the example \\(x^3-x\\), \\(x_0=0.4\\), \\(x_1=0.6\\), step \\(1\\): \\(x_2=-1\\), the root is found.'),
        }),
        step({
            id: 'secant-explore', order: 20,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati sekantno metodo.', 'Exploring the secant method on your own.'),
            explanation: text(
                'Primer je spet \\(f(x)=x^2-2\\) z začetkoma \\(x_0=1\\) in \\(x_1=2\\), korak \\(0\\); vse je prosto za raziskovanje. Spremeni primer ali začetka in pritiskaj Naslednji korak. Ob vsaki spremembi se iteracija vrne na začetek.',
                'The example is again \\(f(x)=x^2-2\\) with the starts \\(x_0=1\\) and \\(x_1=2\\), step \\(0\\); everything is free to explore. Change the example or the starts and press Next step. Every change returns the iteration to its start.',
            ),
            formulaIds: ['secant-step'],
            observationPrompt: text('Poišči par začetkov, pri katerem sekantna metoda ne konvergira.', 'Find a pair of starts for which the secant method does not converge.'),
            expectedObservations: [text('Pri \\(x^2-2\\) iz \\(x_0=-1\\), \\(x_1=1\\) se iteracija ustavi: sekanta je vodoravna.', 'For \\(x^2-2\\) from \\(x_0=-1\\), \\(x_1=1\\) the iteration stops: the secant is horizontal.')],
            scene: secantScene('secant-explore-free', 'square-minus-two', 1, 2, 0,
                'Sekantna metoda, primer \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), korak \\(0\\); vse je prosto za raziskovanje.',
                'The secant method, the example \\(x^2-2\\), \\(x_0=1\\), \\(x_1=2\\), step \\(0\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-root-finding-implementation',
            citation: 'Bezeg source: src/analysis/rootFinding.ts, src/analysis/rootFindingModel.ts and src/graphs/functions/RootFindingGraph.tsx.',
            implementationCorrespondence: 'The kernel computes the iterates and their termination from the example, the start and the step count; a scene sets the method, the example and the start and then runs Next step commands.',
        },
    ],
    edgeCases: [
        text('Če je \\(f(x_k)=0\\), se iteracija ustavi z oznako najdene ničle; če je \\(f\'(x_k)=0\\), se ustavi, ker je tangenta vodoravna in naslednjega približka ni.', 'If \\(f(x_k)=0\\) the iteration stops with the root-found status; if \\(f\'(x_k)=0\\) it stops because the tangent is horizontal and there is no next iterate.'),
        text('Pri sekantni metodi se iteracija ustavi, če je \\(f(x_k)=f(x_{k-1})\\): sekanta je vodoravna in naslednjega približka ni; enaka začetka sta zavrnjena že pri vnosu.', 'In the secant method the iteration stops if \\(f(x_k)=f(x_{k-1})\\): the secant is horizontal and there is no next iterate; equal starts are rejected at input.'),
        text('Iteracija ima največ \\(60\\) korakov; sprememba primera ali začetka jo vrne na korak \\(0\\).', 'The iteration has at most \\(60\\) steps; changing the example or the start returns it to step \\(0\\).'),
    ],
    unresolvedQuestions: [],
};

export const numericalMethodsGuidedLessons: readonly GuidedLesson[] = [rootFindingLesson, ...quadratureGuidedLessons, ...eulerGuidedLessons];
