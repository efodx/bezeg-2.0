/**
 * Guided lessons of the trigonometry family, batch A (docs/specs/trigonometry-lessons.md): TR1, radian, sine and cosine on the unit circle, and
 * TR2, symmetries and addition formulas, both on `unit-circle` (UnitCircleGraph). Each is the lesson of one section of the trigonometry chapter
 * (trigonometryChapterRegistry.ts adapts them on request; the lesson catalog itself holds none, as it keeps one lesson per Demonstration). Scenes use only the `trig` actions UnitCircleGraph registers (`set-angle`, `set-overlay`), and
 * every scene starts from the Demonstration default and names every value it states. `trigUnitCircleGuidedLessons.test.ts` reads each number
 * the text quotes back from the real graph's readouts and recomputes it with `Math` (not the trig kernel).
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText, WorkedExample} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind']): GuidedLessonFrame => ({id, kind});

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

/** What a scene sets, in degrees (multiples of 0.5): the first angle, the second angle (only with the addition overlay) and the overlays. */
export interface UnitCircleSceneSpec {
    readonly first: number;
    readonly second?: number;
    readonly cosine?: boolean;
    readonly symmetries?: boolean;
    readonly addition?: boolean;
}

/** The actions of a scene: the Demonstration default, then the angles and the overlays that are on. */
export const unitCircleSceneActions = (id: string, spec: UnitCircleSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'trig', operation: 'set-angle', which: 'first', degrees: spec.first},
    ...(spec.second === undefined ? [] : [{kind: 'trig', operation: 'set-angle', which: 'second', degrees: spec.second} satisfies LessonAction]),
    ...(spec.cosine ? [{kind: 'trig', operation: 'set-overlay', overlay: 'cosine', on: true} satisfies LessonAction] : []),
    ...(spec.symmetries ? [{kind: 'trig', operation: 'set-overlay', overlay: 'symmetries', on: true} satisfies LessonAction] : []),
    ...(spec.addition ? [{kind: 'trig', operation: 'set-overlay', overlay: 'addition', on: true} satisfies LessonAction] : []),
];

const scene = (id: string, spec: UnitCircleSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: unitCircleSceneActions(id, spec), expectedState: text(sl, en)});

// ---- TR1 -------------------------------------------------------------------------------------------------------------------------

const tr1Formulas: readonly FormulaBlock[] = [
    {
        id: 'unit-circle-point',
        latex: 'P(\\theta)=(\\cos\\theta,\\ \\sin\\theta)',
        notation: text(
            '\\(\\theta\\) je kot v radianih, to je dolžina loka enotske krožnice od točke \\((1,0)\\) do točke \\(P(\\theta)\\); \\(\\cos\\theta\\) je abscisa, \\(\\sin\\theta\\) pa ordinata te točke.',
            '\\(\\theta\\) is the angle in radians, that is the length of the arc of the unit circle from the point \\((1,0)\\) to the point \\(P(\\theta)\\); \\(\\cos\\theta\\) is the abscissa and \\(\\sin\\theta\\) the ordinate of that point.',
        ),
        explanation: text(
            'Definicija: na enotski krožnici, ki ima polmer \\(1\\), je radian merilo kota, pri katerem je kot enak dolžini loka. Kosinus in sinus kota \\(\\theta\\) sta po definiciji koordinati točke na loku dolžine \\(\\theta\\), šteto v nasprotni smeri urinega kazalca. To je definicija, ne izrek; slika jo ponazarja.',
            'Definition: on the unit circle, which has radius \\(1\\), the radian measures an angle so that the angle equals the length of the arc. By definition the cosine and sine of the angle \\(\\theta\\) are the coordinates of the point at arc length \\(\\theta\\), counted counter-clockwise. This is a definition, not a theorem; the picture illustrates it.',
        ),
    },
    {
        id: 'pythagorean-identity',
        latex: '\\sin^2\\theta+\\cos^2\\theta=1',
        notation: text(
            '\\(\\sin^2\\theta\\) pomeni \\((\\sin\\theta)^2\\).',
            '\\(\\sin^2\\theta\\) means \\((\\sin\\theta)^2\\).',
        ),
        explanation: text(
            'Argument: točka \\(P(\\theta)\\), njena pravokotna projekcija na abscisno os in izhodišče tvorijo pravokotni trikotnik s hipotenuzo \\(1\\) in katetama \\(|\\cos\\theta|\\) in \\(|\\sin\\theta|\\). Pitagorov izrek da \\(\\cos^2\\theta+\\sin^2\\theta=1\\). Če je točka na osi, je ena kateta \\(0\\) in enakost še velja.',
            'Argument: the point \\(P(\\theta)\\), its orthogonal projection onto the x-axis and the origin form a right triangle with hypotenuse \\(1\\) and legs \\(|\\cos\\theta|\\) and \\(|\\sin\\theta|\\). Pythagoras gives \\(\\cos^2\\theta+\\sin^2\\theta=1\\). If the point is on an axis one leg is \\(0\\) and the equality still holds.',
        ),
    },
];

const tr1Examples: readonly WorkedExample[] = [
    {
        id: 'tr1-arc-radius-three',
        title: text('Lok za \\(\\theta=2\\) na krožnici s polmerom \\(3\\)', 'The arc for \\(\\theta=2\\) on a circle of radius \\(3\\)'),
        calculationLatex: '\\ell=r\\,\\theta=3\\cdot2',
        resultLatex: '6',
        check: text(
            'Za kot \\(\\theta\\) v radianih je lok krožnice s polmerom \\(r\\) dolg \\(\\ell=r\\theta\\). Pri \\(r=3\\) in \\(\\theta=2\\) je \\(\\ell=6\\); na enotski krožnici je lok enak kotu, \\(\\ell=2\\). Graf ima le enotsko krožnico, zato je to račun, ne odčitek.',
            'For an angle \\(\\theta\\) in radians the arc of a circle of radius \\(r\\) has length \\(\\ell=r\\theta\\). With \\(r=3\\) and \\(\\theta=2\\) this is \\(\\ell=6\\); on the unit circle the arc equals the angle, \\(\\ell=2\\). The graph has only the unit circle, so this is a calculation, not a readout.',
        ),
    },
    {
        id: 'tr1-pi-over-six',
        title: text('Točka pri \\(\\theta=\\tfrac{\\pi}{6}\\)', 'The point at \\(\\theta=\\tfrac{\\pi}{6}\\)'),
        calculationLatex: '\\left(\\cos\\tfrac{\\pi}{6},\\ \\sin\\tfrac{\\pi}{6}\\right)',
        resultLatex: '\\left(\\tfrac{\\sqrt3}{2},\\ \\tfrac12\\right)',
        check: text(
            'Kot \\(\\tfrac{\\pi}{6}\\) je \\(30^\\circ\\). Točka je \\((\\tfrac{\\sqrt3}{2},\\tfrac12)\\approx(0{,}8660254;\\ 0{,}5)\\), kar graf izpiše z natančno vrednostjo in zaokroženo vrednostjo. Preverek: \\(\\tfrac34+\\tfrac14=1\\).',
            'The angle \\(\\tfrac{\\pi}{6}\\) is \\(30^\\circ\\). The point is \\((\\tfrac{\\sqrt3}{2},\\tfrac12)\\approx(0.8660254,\\ 0.5)\\), which the graph writes as an exact value and a rounded value. Check: \\(\\tfrac34+\\tfrac14=1\\).',
        ),
    },
];

const tr1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'tr1-start', order: 1,
        title: text('Enotska krožnica in točka pri kotu \\(0\\)', 'The unit circle and a point at angle \\(0\\)'),
        purpose: text('Napovedati, kako se višina točke spreminja, preden jo premaknemo.', 'Predicting how the height of the point changes before moving it.'),
        explanation: text(
            'Enotska krožnica ima središče v izhodišču in polmer \\(1\\). Točka je pri kotu \\(\\theta=0\\), v točki \\((1,0)\\), njena višina je \\(0\\). Pred naslednjim korakom napovej: kaj se zgodi z višino točke, ko se točka začne gibati v nasprotni smeri urinega kazalca, in kdaj je višina največja?',
            'The unit circle has its centre at the origin and radius \\(1\\). The point is at the angle \\(\\theta=0\\), at \\((1,0)\\), and its height is \\(0\\). Before the next step, predict: what happens to the height of the point when it starts to move counter-clockwise, and when is the height greatest?',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči točko, osi in odčitka \\(\\cos\\theta\\) in \\(\\sin\\theta\\) ter zapiši svojo napoved.', 'Find the point, the axes and the readouts of \\(\\cos\\theta\\) and \\(\\sin\\theta\\), and write down your prediction.'),
        expectedObservations: [text('Točka je na osi pri \\(\\theta=0\\); graf izpiše, da je na osi, in vrednosti \\(1\\) in \\(0\\).', 'The point is on the axis at \\(\\theta=0\\); the graph says it is on the axis and shows the values \\(1\\) and \\(0\\).')],
        scene: scene('tr1-start-scene', {first: 0},
            'Kot je \\(0^\\circ\\), točka je v \\((1,0)\\), na osi; \\(\\cos\\theta=1\\), \\(\\sin\\theta=0\\).',
            'The angle is \\(0^\\circ\\), the point is at \\((1,0)\\), on the axis; \\(\\cos\\theta=1\\), \\(\\sin\\theta=0\\).'),
    }),
    step({
        id: 'tr1-arc', order: 2,
        title: text('Radian je dolžina loka', 'The radian is arc length'),
        purpose: text('Videti, da je kot \\(\\theta\\) v radianih dolžina označenega loka.', 'Seeing that the angle \\(\\theta\\) in radians is the length of the highlighted arc.'),
        explanation: text(
            'Na enotski krožnici je radian definiran kot dolžina loka: kot \\(\\theta\\) je enak dolžini odebeljenega loka od \\((1,0)\\) do točke. Kot \\(1\\) rad je približno \\(57{,}29578^\\circ\\), polni krog pa je \\(2\\pi\\). Kot \\(135^\\circ\\) je \\(\\tfrac{3\\pi}{4}\\approx2{,}35619\\) rad. Točka je zdaj pri kotu \\(2\\) rad \\(\\approx114{,}59^\\circ\\); graf pozna le polovične stopinje, zato stoji pri najbližjem kotu \\(114{,}5^\\circ\\), kar je \\(\\tfrac{229\\pi}{360}\\) rad. Tam je \\((\\cos\\theta,\\sin\\theta)\\approx(-0{,}4146932;\\ 0{,}9099613)\\); pri natanko \\(2\\) rad bi bilo \\((-0{,}4161468;\\ 0{,}9092974)\\), razlika je v tretji decimalki.',
            'On the unit circle the radian is defined as arc length: the angle \\(\\theta\\) equals the length of the thick arc from \\((1,0)\\) to the point. An angle of \\(1\\) rad is about \\(57.29578^\\circ\\), and a full turn is \\(2\\pi\\). The angle \\(135^\\circ\\) is \\(\\tfrac{3\\pi}{4}\\approx2.35619\\) rad. The point is now at the angle \\(2\\) rad \\(\\approx114.59^\\circ\\); the graph knows only half-degrees, so it stands at the nearest angle \\(114.5^\\circ\\), which is \\(\\tfrac{229\\pi}{360}\\) rad. There \\((\\cos\\theta,\\sin\\theta)\\approx(-0.4146932,\\ 0.9099613)\\); at exactly \\(2\\) rad it would be \\((-0.4161468,\\ 0.9092974)\\), a difference in the third decimal.',
        ),
        formulaIds: ['unit-circle-point'],
        workedExampleId: 'tr1-arc-radius-three',
        observationPrompt: text('Primerjaj kot v radianih v odčitku z dolžino odebeljenega loka in premakni točko še sam.', 'Compare the angle in radians in the readout with the length of the thick arc, and move the point yourself.'),
        expectedObservations: [text('Odčitek kota v radianih raste skupaj z dolžino loka; pri \\(\\tfrac{\\pi}{2}\\) je lok četrtina kroga.', 'The readout of the angle in radians grows with the arc length; at \\(\\tfrac{\\pi}{2}\\) the arc is a quarter of the circle.')],
        scene: scene('tr1-arc-scene', {first: 114.5},
            'Kot je \\(114{,}5^\\circ\\) (\\(\\tfrac{229\\pi}{360}\\) rad), točka je v drugem kvadrantu; \\(\\cos\\theta\\approx-0{,}4146932\\), \\(\\sin\\theta\\approx0{,}9099613\\).',
            'The angle is \\(114.5^\\circ\\) (\\(\\tfrac{229\\pi}{360}\\) rad), the point is in the second quadrant; \\(\\cos\\theta\\approx-0.4146932\\), \\(\\sin\\theta\\approx0.9099613\\).'),
    }),
    step({
        id: 'tr1-sine', order: 3,
        title: text('Višina točke je sinus', 'The height of the point is the sine'),
        purpose: text('Videti, da višina točke, prenesena na razvito os, riše graf sinusa.', 'Seeing that the height of the point, carried onto an unrolled axis, draws the graph of the sine.'),
        explanation: text(
            'Desno od krožnice je os, razvita iz loka: točka na njej je za dolžino loka \\(\\theta\\) desno od začetka. Višina točke \\(\\sin\\theta\\) se prenese na to točko in vse točke skupaj narišejo graf funkcije \\(\\sin\\). Pri \\(\\theta=\\tfrac{\\pi}{6}\\) je točka \\((\\tfrac{\\sqrt3}{2},\\tfrac12)\\), zato je višina \\(\\tfrac12=0{,}5\\). Višina razvite točke je isto število kot ordinata točke na krožnici. Slika je ilustracija definicije, ne dokaz.',
            'To the right of the circle is an axis unrolled from the arc: the point on it is the arc length \\(\\theta\\) to the right of the start. The height \\(\\sin\\theta\\) of the point is carried onto that point, and all such points together draw the graph of \\(\\sin\\). At \\(\\theta=\\tfrac{\\pi}{6}\\) the point is \\((\\tfrac{\\sqrt3}{2},\\tfrac12)\\), so the height is \\(\\tfrac12=0.5\\). The height of the unrolled point is the same number as the ordinate of the point on the circle. The picture illustrates the definition; it is not a proof.',
        ),
        formulaIds: ['unit-circle-point'],
        workedExampleId: 'tr1-pi-over-six',
        observationPrompt: text('Premakni točko po krožnici in spremljaj, kje je njena višina na razviti osi.', 'Move the point around the circle and follow where its height is on the unrolled axis.'),
        expectedObservations: [text('Višina na razviti osi je vedno enaka ordinati točke; ko je točka najvišje, je \\(\\sin\\theta=1\\).', 'The height on the unrolled axis always equals the ordinate of the point; when the point is highest, \\(\\sin\\theta=1\\).')],
        scene: scene('tr1-sine-scene', {first: 30},
            'Kot je \\(30^\\circ\\) (\\(\\tfrac{\\pi}{6}\\) rad), \\(\\cos\\theta=\\tfrac{\\sqrt3}{2}\\approx0{,}8660254\\), \\(\\sin\\theta=\\tfrac12\\); višina na razviti osi je \\(0{,}5\\).',
            'The angle is \\(30^\\circ\\) (\\(\\tfrac{\\pi}{6}\\) rad), \\(\\cos\\theta=\\tfrac{\\sqrt3}{2}\\approx0.8660254\\), \\(\\sin\\theta=\\tfrac12\\); the height on the unrolled axis is \\(0.5\\).'),
    }),
    step({
        id: 'tr1-cosine', order: 4,
        title: text('Abscisa je kosinus; predznaki po kvadrantih', 'The abscissa is the cosine; signs by quadrant'),
        purpose: text('Brati kosinus kot abscisa in predznaka obeh vrednosti po kvadrantih.', 'Reading the cosine as the abscissa and the signs of both values by quadrant.'),
        explanation: text(
            'Vklopljen je še graf kosinusa: abscisa točke, prenesena na razvito os. Predznaka sta posledica lege točke: v prvem kvadrantu sta oba pozitivna, v drugem je \\(\\cos\\theta<0\\) in \\(\\sin\\theta>0\\), v tretjem sta oba negativna, v četrtem je \\(\\cos\\theta>0\\) in \\(\\sin\\theta<0\\). Točka pri \\(200^\\circ\\) je v tretjem kvadrantu: \\(\\cos\\theta\\approx-0{,}9396926\\), \\(\\sin\\theta\\approx-0{,}3420201\\). Če je točka na osi, graf piše, da je na osi, in ne predznaka. Predznaki in sled sta ilustracija definicije.',
            'The graph of the cosine is now on as well: the abscissa of the point carried onto the unrolled axis. The signs follow from the position of the point: in the first quadrant both are positive, in the second \\(\\cos\\theta<0\\) and \\(\\sin\\theta>0\\), in the third both are negative, in the fourth \\(\\cos\\theta>0\\) and \\(\\sin\\theta<0\\). The point at \\(200^\\circ\\) is in the third quadrant: \\(\\cos\\theta\\approx-0.9396926\\), \\(\\sin\\theta\\approx-0.3420201\\). If the point is on an axis the graph says it is on the axis and shows no sign. The signs and the trace illustrate the definition.',
        ),
        formulaIds: ['unit-circle-point'],
        observationPrompt: text('Premakni točko skozi vse štiri kvadrante in preberi predznaka v odčitku.', 'Move the point through all four quadrants and read the signs in the readout.'),
        expectedObservations: [text('Predznaka se menjata le pri prehodu čez os; na osi graf ne napiše predznaka.', 'The signs change only when crossing an axis; on an axis the graph writes no sign.')],
        scene: scene('tr1-cosine-scene', {first: 200, cosine: true},
            'Kot je \\(200^\\circ\\), točka je v tretjem kvadrantu; \\(\\cos\\theta\\approx-0{,}9396926\\), \\(\\sin\\theta\\approx-0{,}3420201\\), predznaka sta oba negativna; graf kosinusa je prikazan.',
            'The angle is \\(200^\\circ\\), the point is in the third quadrant; \\(\\cos\\theta\\approx-0.9396926\\), \\(\\sin\\theta\\approx-0.3420201\\), both signs are negative; the cosine graph is shown.'),
    }),
    step({
        id: 'tr1-pythagoras', order: 5,
        title: text('Pitagora na enotski krožnici', 'Pythagoras on the unit circle'),
        purpose: text('Utemeljiti \\(\\sin^2\\theta+\\cos^2\\theta=1\\) s pravokotnim trikotnikom.', 'Justifying \\(\\sin^2\\theta+\\cos^2\\theta=1\\) with a right triangle.'),
        explanation: text(
            'Polmer do točke je hipotenuza dolžine \\(1\\); vodoravna projekcija ima dolžino \\(|\\cos\\theta|\\), navpična \\(|\\sin\\theta|\\). Po Pitagorovem izreku je \\(\\cos^2\\theta+\\sin^2\\theta=1\\). To je argument: narisani trikotnik ima hipotenuzo \\(1\\). Pri \\(\\theta=\\tfrac{\\pi}{6}\\) je \\(\\left(\\tfrac{\\sqrt3}{2}\\right)^2+\\left(\\tfrac12\\right)^2=\\tfrac34+\\tfrac14=1\\). Enakost velja za vsak kot, slika pa kaže enega.',
            'The radius to the point is a hypotenuse of length \\(1\\); the horizontal projection has length \\(|\\cos\\theta|\\), the vertical one \\(|\\sin\\theta|\\). By Pythagoras \\(\\cos^2\\theta+\\sin^2\\theta=1\\). This is an argument: the drawn triangle has hypotenuse \\(1\\). At \\(\\theta=\\tfrac{\\pi}{6}\\), \\(\\left(\\tfrac{\\sqrt3}{2}\\right)^2+\\left(\\tfrac12\\right)^2=\\tfrac34+\\tfrac14=1\\). The equality holds for every angle; the picture shows one.',
        ),
        formulaIds: ['pythagorean-identity'],
        observationPrompt: text('Poišči hipotenuzo in obe kateti ter ju primerjaj z odčitkoma \\(\\cos\\theta\\) in \\(\\sin\\theta\\).', 'Find the hypotenuse and both legs and compare them with the readouts of \\(\\cos\\theta\\) and \\(\\sin\\theta\\).'),
        expectedObservations: [text('Hipotenuza ostane \\(1\\), kateti se spreminjata, vsota njunih kvadratov je vedno \\(1\\).', 'The hypotenuse stays \\(1\\), the legs change, and the sum of their squares is always \\(1\\).')],
        scene: scene('tr1-pythagoras-scene', {first: 30, cosine: true},
            'Kot je \\(30^\\circ\\); kateti sta \\(\\tfrac{\\sqrt3}{2}\\) in \\(\\tfrac12\\), hipotenuza je polmer \\(1\\); \\(\\tfrac34+\\tfrac14=1\\).',
            'The angle is \\(30^\\circ\\); the legs are \\(\\tfrac{\\sqrt3}{2}\\) and \\(\\tfrac12\\), the hypotenuse is the radius \\(1\\); \\(\\tfrac34+\\tfrac14=1\\).'),
    }),
    step({
        id: 'tr1-special', order: 6,
        title: text('Posebni koti', 'Special angles'),
        purpose: text('Spoznati natančne vrednosti za \\(0^\\circ\\), \\(30^\\circ\\), \\(45^\\circ\\), \\(60^\\circ\\) in \\(90^\\circ\\).', 'Learning the exact values for \\(0^\\circ\\), \\(30^\\circ\\), \\(45^\\circ\\), \\(60^\\circ\\) and \\(90^\\circ\\).'),
        explanation: text(
            'Pri \\(0^\\circ\\), \\(30^\\circ\\), \\(45^\\circ\\), \\(60^\\circ\\) in \\(90^\\circ\\) so vrednosti \\(\\sin\\theta\\) enake \\(0\\), \\(\\tfrac12\\), \\(\\tfrac{\\sqrt2}{2}\\), \\(\\tfrac{\\sqrt3}{2}\\), \\(1\\), vrednosti \\(\\cos\\theta\\) pa istim številom v obratnem vrstnem redu. Pri \\(45^\\circ\\) sta kateti enaki, zato je \\(2\\cos^2\\theta=1\\) in \\(\\cos\\theta=\\tfrac{\\sqrt2}{2}\\). Graf za te kote izpiše natančno vrednost; pri drugih kotih izpiše zaokroženo vrednost z znakom \\(\\approx\\).',
            'At \\(0^\\circ\\), \\(30^\\circ\\), \\(45^\\circ\\), \\(60^\\circ\\) and \\(90^\\circ\\) the values of \\(\\sin\\theta\\) are \\(0\\), \\(\\tfrac12\\), \\(\\tfrac{\\sqrt2}{2}\\), \\(\\tfrac{\\sqrt3}{2}\\), \\(1\\), and the values of \\(\\cos\\theta\\) are the same numbers in reverse order. At \\(45^\\circ\\) the legs are equal, so \\(2\\cos^2\\theta=1\\) and \\(\\cos\\theta=\\tfrac{\\sqrt2}{2}\\). For these angles the graph writes the exact value; at other angles it writes a rounded value marked \\(\\approx\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Vnesi vsak od petih kotov in primerjaj izpisane natančne vrednosti s tabelo; nato vnesi \\(50^\\circ\\) in poglej, kaj se spremeni.', 'Enter each of the five angles and compare the exact values shown with the table; then enter \\(50^\\circ\\) and see what changes.'),
        expectedObservations: [text('Pri petih posebnih kotih je izpisana natančna vrednost, pri \\(50^\\circ\\) le zaokrožena z znakom \\(\\approx\\).', 'At the five special angles an exact value is shown; at \\(50^\\circ\\) only a rounded value marked \\(\\approx\\).')],
        scene: scene('tr1-special-scene', {first: 45, cosine: true},
            'Kot je \\(45^\\circ\\); \\(\\cos\\theta=\\tfrac{\\sqrt2}{2}\\approx0{,}7071068\\) in \\(\\sin\\theta=\\tfrac{\\sqrt2}{2}\\approx0{,}7071068\\), natančno izpisano.',
            'The angle is \\(45^\\circ\\); \\(\\cos\\theta=\\tfrac{\\sqrt2}{2}\\approx0.7071068\\) and \\(\\sin\\theta=\\tfrac{\\sqrt2}{2}\\approx0.7071068\\), shown exactly.'),
    }),
    step({
        id: 'tr1-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Samostojno preizkusiti kote in povezavo z valom.', 'Trying angles on your own and the link to the wave.'),
        explanation: text(
            'Premikaj točko, vnašaj kote v stopinjah ali večkratnikih števila \\(\\pi\\) in uporabljaj puščice (pol stopinje) in tipki Page (pet stopinj). Opazuj, kje sta \\(\\sin\\theta\\) in \\(\\cos\\theta\\) enaka \\(0\\) ali \\(\\pm1\\). Iz razvite sledi nastane val: njegovo amplitudo, periodo in premik raziskuje lekcija Trigonometrične funkcije na poti Trigonometrične funkcije.',
            'Move the point, enter angles in degrees or as multiples of \\(\\pi\\), and use the arrow keys (half a degree) and the Page keys (five degrees). Watch where \\(\\sin\\theta\\) and \\(\\cos\\theta\\) are \\(0\\) or \\(\\pm1\\). The unrolled trace becomes a wave; its amplitude, period and shift are explored by the Trigonometric functions lesson on the Trigonometric functions route.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči vse kote med \\(0^\\circ\\) in \\(360^\\circ\\), pri katerih je \\(\\sin\\theta=\\cos\\theta\\), in utemelji, zakaj sta dva.', 'Find all angles between \\(0^\\circ\\) and \\(360^\\circ\\) at which \\(\\sin\\theta=\\cos\\theta\\), and explain why there are two.'),
        expectedObservations: [text('Koordinati sta enaki pri \\(45^\\circ\\) in \\(225^\\circ\\), kjer točka leži na premici \\(y=x\\).', 'The coordinates are equal at \\(45^\\circ\\) and \\(225^\\circ\\), where the point lies on the line \\(y=x\\).')],
        scene: scene('tr1-explore-scene', {first: 60, cosine: true},
            'Kot je \\(60^\\circ\\), graf kosinusa je prikazan; \\(\\cos\\theta=\\tfrac12\\), \\(\\sin\\theta=\\tfrac{\\sqrt3}{2}\\approx0{,}8660254\\).',
            'The angle is \\(60^\\circ\\), the cosine graph is shown; \\(\\cos\\theta=\\tfrac12\\), \\(\\sin\\theta=\\tfrac{\\sqrt3}{2}\\approx0.8660254\\).'),
    }),
];

// ---- TR2 -------------------------------------------------------------------------------------------------------------------------

const tr2Formulas: readonly FormulaBlock[] = [
    {
        id: 'symmetry-identities',
        latex: '\\sin(\\pi-x)=\\sin x,\\quad \\cos(-x)=\\cos x,\\quad \\sin(x+\\pi)=-\\sin x',
        notation: text(
            '\\(x\\) je kot v radianih; \\(\\pi-x\\), \\(-x\\) in \\(x+\\pi\\) so kota zrcalnih slik točke \\(P(x)\\) čez ordinatno os, abscisno os in izhodišče.',
            '\\(x\\) is an angle in radians; \\(\\pi-x\\), \\(-x\\) and \\(x+\\pi\\) are the angles of the mirror images of the point \\(P(x)\\) in the y-axis, the x-axis and the origin.',
        ),
        explanation: text(
            'Argument z zrcaljenjem: zrcalna slika točke \\((\\cos x,\\sin x)\\) čez ordinatno os je \\((-\\cos x,\\sin x)\\) in leži pri kotu \\(\\pi-x\\), zato je \\(\\sin(\\pi-x)=\\sin x\\). Čez abscisno os je slika \\((\\cos x,-\\sin x)\\) pri kotu \\(-x\\), zato je \\(\\cos(-x)=\\cos x\\). Čez izhodišče je slika \\((-\\cos x,-\\sin x)\\) pri kotu \\(x+\\pi\\), zato je \\(\\sin(x+\\pi)=-\\sin x\\). Graf kaže en kot; zrcaljenje velja za vsak kot.',
            'Argument by reflection: the mirror image of the point \\((\\cos x,\\sin x)\\) in the y-axis is \\((-\\cos x,\\sin x)\\) and lies at the angle \\(\\pi-x\\), so \\(\\sin(\\pi-x)=\\sin x\\). In the x-axis the image is \\((\\cos x,-\\sin x)\\) at the angle \\(-x\\), so \\(\\cos(-x)=\\cos x\\). In the origin the image is \\((-\\cos x,-\\sin x)\\) at the angle \\(x+\\pi\\), so \\(\\sin(x+\\pi)=-\\sin x\\). The graph shows one angle; the reflection works for every angle.',
        ),
    },
    {
        id: 'addition-formulas',
        latex: '\\sin(\\alpha+\\beta)=\\sin\\alpha\\cos\\beta+\\cos\\alpha\\sin\\beta,\\quad \\cos(\\alpha+\\beta)=\\cos\\alpha\\cos\\beta-\\sin\\alpha\\sin\\beta',
        notation: text(
            '\\(\\alpha\\) je prvi kot (v krmilih označen z \\(\\theta\\)), \\(\\beta\\) drugi kot; \\((\\cos\\alpha,\\sin\\alpha)\\) in \\((-\\sin\\alpha,\\cos\\alpha)\\) sta sliki vektorjev \\(e_1=(1,0)\\) in \\(e_2=(0,1)\\) pri vrtenju za \\(\\alpha\\).',
            '\\(\\alpha\\) is the first angle (labelled \\(\\theta\\) in the controls), \\(\\beta\\) the second; \\((\\cos\\alpha,\\sin\\alpha)\\) and \\((-\\sin\\alpha,\\cos\\alpha)\\) are the images of the vectors \\(e_1=(1,0)\\) and \\(e_2=(0,1)\\) under the rotation by \\(\\alpha\\).',
        ),
        explanation: text(
            'Argument z vrtenjem okvirja: po vrtenju za \\(\\alpha\\) imata vektorja \\(e_1\\) in \\(e_2\\) koordinati \\((\\cos\\alpha,\\sin\\alpha)\\) in \\((-\\sin\\alpha,\\cos\\alpha)\\). Točka \\((\\cos\\beta,\\sin\\beta)\\), zapisana v zavrtenem okvirju, je \\(\\cos\\beta\\,e_1^{\\prime}+\\sin\\beta\\,e_2^{\\prime}\\) in leži pri kotu \\(\\alpha+\\beta\\). Primerjava koordinat da obe adicijski formuli. Veljata za vsak par kotov; slika kaže en par.',
            'Argument by rotating the frame: after the rotation by \\(\\alpha\\) the vectors \\(e_1\\) and \\(e_2\\) have the coordinates \\((\\cos\\alpha,\\sin\\alpha)\\) and \\((-\\sin\\alpha,\\cos\\alpha)\\). The point \\((\\cos\\beta,\\sin\\beta)\\), written in the rotated frame, is \\(\\cos\\beta\\,e_1^{\\prime}+\\sin\\beta\\,e_2^{\\prime}\\) and lies at the angle \\(\\alpha+\\beta\\). Comparing coordinates gives both addition formulas. They hold for every pair of angles; the picture shows one pair.',
        ),
    },
];

const tr2Examples: readonly WorkedExample[] = [
    {
        id: 'tr2-sine-105',
        title: text('\\(\\sin105^\\circ\\) iz kotov \\(60^\\circ\\) in \\(45^\\circ\\)', '\\(\\sin105^\\circ\\) from the angles \\(60^\\circ\\) and \\(45^\\circ\\)'),
        calculationLatex: '\\sin60^\\circ\\cos45^\\circ+\\cos60^\\circ\\sin45^\\circ',
        resultLatex: '\\frac{\\sqrt6+\\sqrt2}{4}',
        check: text(
            '\\(\\tfrac{\\sqrt3}{2}\\cdot\\tfrac{\\sqrt2}{2}+\\tfrac12\\cdot\\tfrac{\\sqrt2}{2}=\\tfrac{\\sqrt6+\\sqrt2}{4}\\approx0{,}9659258\\). Podobno je \\(\\cos105^\\circ=\\tfrac12\\cdot\\tfrac{\\sqrt2}{2}-\\tfrac{\\sqrt3}{2}\\cdot\\tfrac{\\sqrt2}{2}=\\tfrac{\\sqrt2-\\sqrt6}{4}\\approx-0{,}258819\\). Graf kot \\(105^\\circ\\) izračuna neposredno in pokaže iste vrednosti.',
            '\\(\\tfrac{\\sqrt3}{2}\\cdot\\tfrac{\\sqrt2}{2}+\\tfrac12\\cdot\\tfrac{\\sqrt2}{2}=\\tfrac{\\sqrt6+\\sqrt2}{4}\\approx0.9659258\\). Likewise \\(\\cos105^\\circ=\\tfrac12\\cdot\\tfrac{\\sqrt2}{2}-\\tfrac{\\sqrt3}{2}\\cdot\\tfrac{\\sqrt2}{2}=\\tfrac{\\sqrt2-\\sqrt6}{4}\\approx-0.258819\\). The graph computes the angle \\(105^\\circ\\) directly and shows the same values.',
        ),
    },
];

const tr2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'tr2-reflect', order: 1,
        title: text('Točka in njene tri zrcalne slike', 'A point and its three mirror images'),
        purpose: text('Napovedati, katera koordinata ohrani predznak pri vsakem zrcaljenju.', 'Predicting which coordinate keeps its sign under each reflection.'),
        explanation: text(
            'Točka je pri \\(x=\\tfrac{\\pi}{6}\\) (\\(30^\\circ\\)), v \\((\\tfrac{\\sqrt3}{2},\\tfrac12)\\approx(0{,}866;\\ 0{,}5)\\). Kot križec je narisana njena zrcalna slika čez abscisno os, kot plus slika čez ordinatno os in kot romb slika čez izhodišče. Pred naslednjim korakom napovej: pri katerem zrcaljenju se ohrani abscisa, pri katerem ordinata, pri katerem nobena?',
            'The point is at \\(x=\\tfrac{\\pi}{6}\\) (\\(30^\\circ\\)), at \\((\\tfrac{\\sqrt3}{2},\\tfrac12)\\approx(0.866,\\ 0.5)\\). Its mirror image in the x-axis is drawn as a cross, the image in the y-axis as a plus and the image in the origin as a diamond. Before the next step, predict: under which reflection does the abscissa keep its sign, under which the ordinate, under which neither?',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi koordinate vseh treh zrcalnih slik v odčitku in jih primerjaj z izvirno točko.', 'Read the coordinates of all three mirror images in the readout and compare them with the original point.'),
        expectedObservations: [text('Slika čez abscisno os ima isto abscisa, čez ordinatno os isto ordinato, čez izhodišče obe koordinati nasprotnega predznaka.', 'The image in the x-axis has the same abscissa, in the y-axis the same ordinate, and in the origin both coordinates have the opposite sign.')],
        scene: scene('tr2-reflect-scene', {first: 30, symmetries: true},
            'Kot je \\(30^\\circ\\); slika čez abscisno os je \\((0{,}866;\\ -0{,}5)\\), čez ordinatno os \\((-0{,}866;\\ 0{,}5)\\), čez izhodišče \\((-0{,}866;\\ -0{,}5)\\).',
            'The angle is \\(30^\\circ\\); the image in the x-axis is \\((0.866,\\ -0.5)\\), in the y-axis \\((-0.866,\\ 0.5)\\), in the origin \\((-0.866,\\ -0.5)\\).'),
    }),
    step({
        id: 'tr2-identities', order: 2,
        title: text('Enakosti iz zrcaljenj', 'The identities from the reflections'),
        purpose: text('Prebrati enakosti, ki jih dajo zrcalne slike.', 'Reading off the identities that the mirror images give.'),
        explanation: text(
            'Slika čez ordinatno os je pri kotu \\(\\pi-x\\) in ima isto ordinato: \\(\\sin(\\pi-x)=\\sin x\\). Slika čez abscisno os je pri kotu \\(-x\\) in ima isto abscisa: \\(\\cos(-x)=\\cos x\\). Slika čez izhodišče je pri kotu \\(x+\\pi\\) in ima obe koordinati nasprotnega predznaka: \\(\\sin(x+\\pi)=-\\sin x\\). Za \\(x=\\tfrac{\\pi}{6}\\) je \\(\\sin\\tfrac{5\\pi}{6}=\\tfrac12\\) in \\(\\sin\\tfrac{7\\pi}{6}=-\\tfrac12\\). Za \\(x=0{,}5\\) velja \\(\\sin(\\pi-0{,}5)=\\sin0{,}5\\approx0{,}4794255\\); to je račun, saj \\(0{,}5\\) rad ni polovična stopinja. Zrcaljenje je argument, ki velja za vsak kot.',
            'The image in the y-axis is at the angle \\(\\pi-x\\) and has the same ordinate: \\(\\sin(\\pi-x)=\\sin x\\). The image in the x-axis is at the angle \\(-x\\) and has the same abscissa: \\(\\cos(-x)=\\cos x\\). The image in the origin is at the angle \\(x+\\pi\\) and has both coordinates with the opposite sign: \\(\\sin(x+\\pi)=-\\sin x\\). For \\(x=\\tfrac{\\pi}{6}\\), \\(\\sin\\tfrac{5\\pi}{6}=\\tfrac12\\) and \\(\\sin\\tfrac{7\\pi}{6}=-\\tfrac12\\). For \\(x=0.5\\), \\(\\sin(\\pi-0.5)=\\sin0.5\\approx0.4794255\\); this is a calculation, since \\(0.5\\) rad is not a half-degree. The reflection is an argument that holds for every angle.',
        ),
        formulaIds: ['symmetry-identities'],
        observationPrompt: text('Premakni točko v drug kvadrant in preveri, da se ista pravila še vedno ujemajo z odčitki slik.', 'Move the point into another quadrant and check that the same rules still match the readouts of the images.'),
        expectedObservations: [text('Ordinata slike čez ordinatno os je vedno enaka ordinati točke, abscisa slike čez abscisno os pa abscisa točke.', 'The ordinate of the image in the y-axis always equals the ordinate of the point, and the abscissa of the image in the x-axis equals its abscissa.')],
        scene: scene('tr2-identities-scene', {first: 30, symmetries: true},
            'Kot je \\(30^\\circ\\); slika čez ordinatno os je pri \\(150^\\circ\\) (\\(\\tfrac{5\\pi}{6}\\)), slika čez izhodišče pri \\(210^\\circ\\) (\\(\\tfrac{7\\pi}{6}\\)); ordinati sta \\(0{,}5\\) in \\(-0{,}5\\).',
            'The angle is \\(30^\\circ\\); the image in the y-axis is at \\(150^\\circ\\) (\\(\\tfrac{5\\pi}{6}\\)), the image in the origin at \\(210^\\circ\\) (\\(\\tfrac{7\\pi}{6}\\)); the ordinates are \\(0.5\\) and \\(-0.5\\).'),
    }),
    step({
        id: 'tr2-frame', order: 3,
        title: text('Zavrteni okvir', 'The rotated frame'),
        purpose: text('Videti, kam gresta vektorja \\(e_1\\) in \\(e_2\\) po vrtenju za \\(\\alpha\\).', 'Seeing where the vectors \\(e_1\\) and \\(e_2\\) go under the rotation by \\(\\alpha\\).'),
        explanation: text(
            'Prvi kot je zdaj \\(\\alpha=60^\\circ\\), drugi \\(\\beta=45^\\circ\\). Okvir \\(e_1=(1,0)\\), \\(e_2=(0,1)\\) se z vrtenjem za \\(\\alpha\\) preslika v \\(e_1^{\\prime}=(\\cos\\alpha,\\sin\\alpha)=(\\tfrac12,\\tfrac{\\sqrt3}{2})\\) in \\(e_2^{\\prime}=(-\\sin\\alpha,\\cos\\alpha)=(-\\tfrac{\\sqrt3}{2},\\tfrac12)\\). Obe puščici sta enotski in pravokotni.',
            'The first angle is now \\(\\alpha=60^\\circ\\), the second \\(\\beta=45^\\circ\\). The frame \\(e_1=(1,0)\\), \\(e_2=(0,1)\\) is sent by the rotation by \\(\\alpha\\) to \\(e_1^{\\prime}=(\\cos\\alpha,\\sin\\alpha)=(\\tfrac12,\\tfrac{\\sqrt3}{2})\\) and \\(e_2^{\\prime}=(-\\sin\\alpha,\\cos\\alpha)=(-\\tfrac{\\sqrt3}{2},\\tfrac12)\\). Both arrows are unit vectors and perpendicular.',
        ),
        formulaIds: ['addition-formulas'],
        observationPrompt: text('Primerjaj puščici zavrtenega okvirja z osema in preveri, da sta še vedno enotski in pravokotni.', 'Compare the arrows of the rotated frame with the axes and check that they are still unit vectors and perpendicular.'),
        expectedObservations: [text('Prva puščica kaže v smeri kota \\(\\alpha\\), druga je zanjo pravokotna in zavrtena za \\(90^\\circ\\).', 'The first arrow points in the direction of the angle \\(\\alpha\\), the second is perpendicular to it, turned by \\(90^\\circ\\).')],
        scene: scene('tr2-frame-scene', {first: 60, second: 45, addition: true},
            'Prvi kot je \\(60^\\circ\\), drugi \\(45^\\circ\\); zavrteni okvir je \\(e_1^{\\prime}=(\\tfrac12,\\tfrac{\\sqrt3}{2})\\), \\(e_2^{\\prime}=(-\\tfrac{\\sqrt3}{2},\\tfrac12)\\).',
            'The first angle is \\(60^\\circ\\), the second \\(45^\\circ\\); the rotated frame is \\(e_1^{\\prime}=(\\tfrac12,\\tfrac{\\sqrt3}{2})\\), \\(e_2^{\\prime}=(-\\tfrac{\\sqrt3}{2},\\tfrac12)\\).'),
    }),
    step({
        id: 'tr2-rotated-point', order: 4,
        title: text('Točka \\((\\cos\\beta,\\sin\\beta)\\) v zavrtenem okvirju', 'The point \\((\\cos\\beta,\\sin\\beta)\\) in the rotated frame'),
        purpose: text('Videti, da ima točka v zavrtenem okvirju iste koordinate kot v prvotnem in da leži pri kotu \\(\\alpha+\\beta\\).', 'Seeing that the point has the same coordinates in the rotated frame as in the original one and lies at the angle \\(\\alpha+\\beta\\).'),
        explanation: text(
            'Točka drugega kota ima v prvotnem okvirju koordinati \\((\\cos\\beta,\\sin\\beta)\\). Če iste koordinate odmerimo vzdolž zavrtenih osi, dobimo točko \\(\\cos\\beta\\,e_1^{\\prime}+\\sin\\beta\\,e_2^{\\prime}\\), ki je prvotna točka zavrtena za \\(\\alpha\\), zato leži pri kotu \\(\\alpha+\\beta=105^\\circ\\) na enotski krožnici. To je argument: vrtenje ohranja dolžine in kote.',
            'The point of the second angle has the coordinates \\((\\cos\\beta,\\sin\\beta)\\) in the original frame. Measuring the same coordinates along the rotated axes gives the point \\(\\cos\\beta\\,e_1^{\\prime}+\\sin\\beta\\,e_2^{\\prime}\\), which is the original point turned by \\(\\alpha\\), so it lies at the angle \\(\\alpha+\\beta=105^\\circ\\) on the unit circle. This is an argument: a rotation keeps lengths and angles.',
        ),
        formulaIds: ['addition-formulas'],
        observationPrompt: text('Poišči kvadratek v zavrtenem okvirju in primerjaj njegov kot s seštevkom obeh kotov v odčitku.', 'Find the square marker in the rotated frame and compare its angle with the sum of the two angles in the readout.'),
        expectedObservations: [text('Kvadratek leži na krožnici pri kotu \\(\\alpha+\\beta\\), ki ga odčitek izpiše kot \\(105^\\circ\\).', 'The square marker lies on the circle at the angle \\(\\alpha+\\beta\\), which the readout writes as \\(105^\\circ\\).')],
        scene: scene('tr2-rotated-point-scene', {first: 60, second: 45, addition: true},
            'Prvi kot je \\(60^\\circ\\), drugi \\(45^\\circ\\); točka v zavrtenem okvirju je pri kotu \\(105^\\circ\\).',
            'The first angle is \\(60^\\circ\\), the second \\(45^\\circ\\); the point in the rotated frame is at the angle \\(105^\\circ\\).'),
    }),
    step({
        id: 'tr2-formulas', order: 5,
        title: text('Adicijska izreka', 'The addition formulas'),
        purpose: text('Iz koordinat točke v zavrtenem okvirju prebrati formuli za \\(\\sin(\\alpha+\\beta)\\) in \\(\\cos(\\alpha+\\beta)\\).', 'Reading the formulas for \\(\\sin(\\alpha+\\beta)\\) and \\(\\cos(\\alpha+\\beta)\\) off the coordinates of the point in the rotated frame.'),
        explanation: text(
            'Točka je \\(\\cos\\beta\\,(\\cos\\alpha,\\sin\\alpha)+\\sin\\beta\\,(-\\sin\\alpha,\\cos\\alpha)\\). Njena abscisa je \\(\\cos(\\alpha+\\beta)=\\cos\\alpha\\cos\\beta-\\sin\\alpha\\sin\\beta\\), ordinata pa \\(\\sin(\\alpha+\\beta)=\\sin\\alpha\\cos\\beta+\\cos\\alpha\\sin\\beta\\). Obe formuli veljata za vsak par kotov; graf kaže le par \\(60^\\circ\\) in \\(45^\\circ\\).',
            'The point is \\(\\cos\\beta\\,(\\cos\\alpha,\\sin\\alpha)+\\sin\\beta\\,(-\\sin\\alpha,\\cos\\alpha)\\). Its abscissa is \\(\\cos(\\alpha+\\beta)=\\cos\\alpha\\cos\\beta-\\sin\\alpha\\sin\\beta\\) and its ordinate is \\(\\sin(\\alpha+\\beta)=\\sin\\alpha\\cos\\beta+\\cos\\alpha\\sin\\beta\\). Both formulas hold for every pair of angles; the graph shows only the pair \\(60^\\circ\\) and \\(45^\\circ\\).',
        ),
        formulaIds: ['addition-formulas'],
        observationPrompt: text('Spremeni prvi ali drugi kot in preveri, da odčitek točke ostane \\((\\cos(\\alpha+\\beta),\\sin(\\alpha+\\beta))\\).', 'Change the first or the second angle and check that the readout of the point stays \\((\\cos(\\alpha+\\beta),\\sin(\\alpha+\\beta))\\).'),
        expectedObservations: [text('Točka odčitka leži vedno pri kotu, ki je vsota obeh kotov.', 'The point of the readout always lies at the angle that is the sum of the two angles.')],
        scene: scene('tr2-formulas-scene', {first: 60, second: 45, addition: true},
            'Prvi kot je \\(60^\\circ\\), drugi \\(45^\\circ\\); vsota je \\(105^\\circ\\).',
            'The first angle is \\(60^\\circ\\), the second \\(45^\\circ\\); the sum is \\(105^\\circ\\).'),
    }),
    step({
        id: 'tr2-numeric', order: 6,
        title: text('Številski primer: \\(105^\\circ\\)', 'A numeric example: \\(105^\\circ\\)'),
        purpose: text('Preveriti formuli na primeru in primerjati z neposrednim izračunom.', 'Checking the formulas on an example and comparing them with a direct computation.'),
        explanation: text(
            'Za \\(\\alpha=60^\\circ\\) in \\(\\beta=45^\\circ\\) je \\(\\sin105^\\circ=\\sin60^\\circ\\cos45^\\circ+\\cos60^\\circ\\sin45^\\circ=\\tfrac{\\sqrt6+\\sqrt2}{4}\\approx0{,}9659258\\) in \\(\\cos105^\\circ=\\cos60^\\circ\\cos45^\\circ-\\sin60^\\circ\\sin45^\\circ=\\tfrac{\\sqrt2-\\sqrt6}{4}\\approx-0{,}258819\\). Graf točko pri \\(105^\\circ\\) izračuna neposredno in izpiše iste vrednosti. Kot \\(105^\\circ\\) ni na seznamu posebnih kotov, zato ima graf za to točko zaokroženi vrednosti; natančni izraz je v zgornjem računu.',
            'For \\(\\alpha=60^\\circ\\) and \\(\\beta=45^\\circ\\), \\(\\sin105^\\circ=\\sin60^\\circ\\cos45^\\circ+\\cos60^\\circ\\sin45^\\circ=\\tfrac{\\sqrt6+\\sqrt2}{4}\\approx0.9659258\\) and \\(\\cos105^\\circ=\\cos60^\\circ\\cos45^\\circ-\\sin60^\\circ\\sin45^\\circ=\\tfrac{\\sqrt2-\\sqrt6}{4}\\approx-0.258819\\). The graph computes the point at \\(105^\\circ\\) directly and shows the same values. The angle \\(105^\\circ\\) is not in the list of special angles, so the graph shows rounded values for this point; the exact expression is in the calculation above.',
        ),
        formulaIds: ['addition-formulas'],
        workedExampleId: 'tr2-sine-105',
        observationPrompt: text('Primerjaj koordinati točke v odčitku z vrednostma iz formule.', 'Compare the coordinates of the point in the readout with the values from the formula.'),
        expectedObservations: [text('Koordinati sta \\(-0{,}258819\\) in \\(0{,}9659258\\), enaki vrednostma iz adicijskih formul.', 'The coordinates are \\(-0.258819\\) and \\(0.9659258\\), equal to the values from the addition formulas.')],
        scene: scene('tr2-numeric-scene', {first: 60, second: 45, addition: true},
            'Vsota kotov je \\(105^\\circ\\); točka je \\((-0{,}258819;\\ 0{,}9659258)\\).',
            'The sum of the angles is \\(105^\\circ\\); the point is \\((-0.258819,\\ 0.9659258)\\).'),
    }),
    step({
        id: 'tr2-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti drugačna para kotov in zrcalne slike hkrati.', 'Trying other pairs of angles and the mirror images at the same time.'),
        explanation: text(
            'Vklopljeni sta obe stikali: zrcalne slike prvega kota in drugi kot z zavrtenim okvirjem. Spreminjaj oba kota in preveri formuli pri vsakem paru. Vsak izbrani par je le en primer; formuli veljata za vsak par kotov. Poskusi par, ki je vsota več kot \\(360^\\circ\\); graf kot zloži v enkratni obhod.',
            'Both switches are on: the mirror images of the first angle and the second angle with the rotated frame. Change both angles and check the formulas for each pair. Each chosen pair is only one example; the formulas hold for every pair of angles. Try a pair whose sum is more than \\(360^\\circ\\); the graph folds the angle into one turn.',
        ),
        formulaIds: [],
        observationPrompt: text('Izberi par kotov, pri katerem je \\(\\alpha+\\beta=180^\\circ\\), in razloži, kam pade točka.', 'Choose a pair of angles with \\(\\alpha+\\beta=180^\\circ\\) and explain where the point lands.'),
        expectedObservations: [text('Točka pade v \\((-1,0)\\), kjer je \\(\\sin=0\\) in \\(\\cos=-1\\).', 'The point lands at \\((-1,0)\\), where \\(\\sin=0\\) and \\(\\cos=-1\\).')],
        scene: scene('tr2-explore-scene', {first: 60, second: 45, addition: true, symmetries: true},
            'Prvi kot je \\(60^\\circ\\), drugi \\(45^\\circ\\), zrcalne slike in zavrteni okvir so prikazani.',
            'The first angle is \\(60^\\circ\\), the second \\(45^\\circ\\), the mirror images and the rotated frame are shown.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'matura-catalogue-kotne-funkcije',
        citation: 'Predmetni izpitni katalog za splošno maturo, matematika (M-MAT-2026), poglavje 4.10.9 Kotne funkcije: definicije kotnih funkcij na enotski krožnici, adicijski izreki, vrednosti za kote 0, 30, 45, 60, 90. Cited from the text extraction of the catalogue.',
        implementationCorrespondence: 'The lesson follows the topic list: radian and the unit circle, signs by quadrant, special angles and the addition formulas; the proofs are the reflection and rotated-frame arguments stated in the lesson.',
    },
    {
        id: 'bezeg-unit-circle-implementation',
        citation: 'Bezeg source: src/trig/angle.ts, src/trig/unitCircle.ts, src/trig/trigModel.ts and src/graphs/trig/UnitCircleGraph.tsx.',
        implementationCorrespondence: 'A scene applies the graph\'s own angle and overlay edits; the text quotes only values of those scenes or plain arithmetic (labelled calculation), and trigUnitCircleGuidedLessons.test.ts recomputes them with Math and reads the readouts of the real graph.',
    },
];

const tr1: GuidedLesson = {
    demonstrationId: 'unit-circle',
    title: text('Radian, sinus in kosinus na enotski krožnici', 'Radian, sine and cosine on the unit circle'),
    summary: text(
        'Radian meri kot z dolžino loka enotske krožnice. Kosinus in sinus kota \\(\\theta\\) sta koordinati točke na loku dolžine \\(\\theta\\), predznaka sledita kvadrantom, iz pravokotnega trikotnika s hipotenuzo \\(1\\) sledi \\(\\sin^2\\theta+\\cos^2\\theta=1\\), višina točke, razvita vzdolž osi, pa nariše val.',
        'The radian measures an angle by the length of an arc of the unit circle. The cosine and sine of the angle \\(\\theta\\) are the coordinates of the point at arc length \\(\\theta\\), the signs follow the quadrants, a right triangle with hypotenuse \\(1\\) gives \\(\\sin^2\\theta+\\cos^2\\theta=1\\), and the height of the point unrolled along an axis draws the wave.',
    ),
    prerequisites: [text('Trigonometrija pravokotnega trikotnika in koordinatni sistem.', 'Trigonometry of the right triangle and the coordinate plane.')],
    learningGoals: [
        text('Razložiš radian kot dolžino loka enotske krožnice in pretvarjaš med stopinjami in radiani.', 'Explain the radian as the length of an arc of the unit circle and convert between degrees and radians.'),
        text('Prebereš \\(\\cos\\theta\\) in \\(\\sin\\theta\\) kot koordinati točke in določiš predznaka po kvadrantih.', 'Read \\(\\cos\\theta\\) and \\(\\sin\\theta\\) as the coordinates of the point and determine the signs by quadrant.'),
        text('Utemeljiš \\(\\sin^2\\theta+\\cos^2\\theta=1\\) s Pitagorovim izrekom in poznaš natančne vrednosti pri posebnih kotih.', 'Justify \\(\\sin^2\\theta+\\cos^2\\theta=1\\) by Pythagoras and know the exact values at the special angles.'),
    ],
    formulaBlocks: tr1Formulas,
    workedExamples: tr1Examples,
    steps: tr1Steps,
    sources,
    edgeCases: [
        text('Kot \\(2\\) rad ni na mreži polovičnih stopinj; graf ga zaokroži na najbližji kot, zato se odčitka razlikujeta v tretji decimalki.', 'The angle \\(2\\) rad is not on the half-degree grid; the graph rounds it to the nearest angle, so the readouts differ in the third decimal.'),
        text('Na osi (\\(0^\\circ\\), \\(90^\\circ\\), \\(180^\\circ\\), \\(270^\\circ\\)) graf piše, da je točka na osi; ena koordinata je \\(0\\), predznaka pa ne piše.', 'On an axis (\\(0^\\circ\\), \\(90^\\circ\\), \\(180^\\circ\\), \\(270^\\circ\\)) the graph says the point is on the axis; one coordinate is \\(0\\) and no sign is written.'),
        text('Zaokrožene vrednosti so označene z \\(\\approx\\); natančne so le pri posebnih kotih.', 'Rounded values are marked \\(\\approx\\); exact values appear only at special angles.'),
    ],
    unresolvedQuestions: [],
};

const tr2: GuidedLesson = {
    demonstrationId: 'unit-circle',
    title: text('Simetrije in adicijski izreki', 'Symmetries and addition formulas'),
    summary: text(
        'Zrcaljenja in polobrat točke na enotski krožnici dajo enakosti \\(\\sin(\\pi-x)=\\sin x\\), \\(\\cos(-x)=\\cos x\\) in \\(\\sin(x+\\pi)=-\\sin x\\). Vrtenje okvirja za \\(\\alpha\\) da \\(\\sin(\\alpha+\\beta)\\) in \\(\\cos(\\alpha+\\beta)\\).',
        'Reflections and the half-turn of a point on the unit circle give \\(\\sin(\\pi-x)=\\sin x\\), \\(\\cos(-x)=\\cos x\\) and \\(\\sin(x+\\pi)=-\\sin x\\). Rotating the frame by \\(\\alpha\\) gives \\(\\sin(\\alpha+\\beta)\\) and \\(\\cos(\\alpha+\\beta)\\).',
    ),
    prerequisites: [text('Lekcija o radianu, sinusu in kosinusu na enotski krožnici.', 'The lesson on the radian, sine and cosine on the unit circle.')],
    learningGoals: [
        text('Iz zrcalnih slik točke izpelješ enakosti za \\(\\pi-x\\), \\(-x\\) in \\(x+\\pi\\).', 'Derive the identities for \\(\\pi-x\\), \\(-x\\) and \\(x+\\pi\\) from the mirror images of the point.'),
        text('Iz zavrtenega okvirja izpelješ adicijski izrek za sinus in kosinus.', 'Derive the addition formulas for the sine and cosine from the rotated frame.'),
        text('Veš, da formule veljajo za vsak par kotov, slika pa kaže en par.', 'Know that the formulas hold for every pair of angles while a picture shows one pair.'),
    ],
    formulaBlocks: tr2Formulas,
    workedExamples: tr2Examples,
    steps: tr2Steps,
    sources,
    edgeCases: [
        text('Zrcalne slike so celoštevilske operacije nad polovičnimi stopinjami (\\(720-h\\), \\(360-h\\), \\(h+360\\)), zato se pri osi ujemajo natančno.', 'The mirror images are integer operations on half-degrees (\\(720-h\\), \\(360-h\\), \\(h+360\\)), so they agree exactly at an axis.'),
        text('Vsota kotov je zložena v en obhod: pri \\(\\alpha+\\beta\\ge360^\\circ\\) graf izpiše vsoto minus \\(360^\\circ\\).', 'The sum of the angles is folded into one turn: for \\(\\alpha+\\beta\\ge360^\\circ\\) the graph shows the sum minus \\(360^\\circ\\).'),
    ],
    unresolvedQuestions: [],
};

export const unitCircleRadianLesson: GuidedLesson = tr1;
export const unitCircleAdditionLesson: GuidedLesson = tr2;
