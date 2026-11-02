/**
 * Guided lessons of the School function graphs family (docs/specs/school-function-graphs-lessons.md), batch A: S1, graph transformations,
 * on `function-transformation`, and S2, inverse functions and the logarithm, on `function-inverse`. The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it quotes is a value of the scene it belongs to, and
 * `schoolFunctionGraphsGuidedLessons.test.ts` checks that against the real graphs and the kernels `src/analysis/transformation.ts`,
 * `src/analysis/inverse.ts`. Scenes use only the `function-parameter`, `function-choice` and `function-visibility` actions the two graphs
 * register (`transform-a/b/c/d/u`, `transform-base`, `reference`; `inverse-base`, `inverse-x0`, `inverse-restriction`, `tangent`,
 * `inverse-curve`). Every scene sets every value it states, so it does not depend on the scene before it.
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

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

// ---------------------------------------------------------------------------------------------------------------- S1

export type TransformBase = 'square' | 'cube' | 'sqrt' | 'reciprocal' | 'abs' | 'exp' | 'ln';

/** An S1 scene from the default scene: base, the four parameters, the tracked abscissa u and the ghost (the base graph), in this order. */
const transformScene = (
    id: string, base: TransformBase, a: number, b: number, c: number, d: number, u: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'transform-base', value: base},
        {kind: 'function-parameter', name: 'transform-a', value: a},
        {kind: 'function-parameter', name: 'transform-b', value: b},
        {kind: 'function-parameter', name: 'transform-c', value: c},
        {kind: 'function-parameter', name: 'transform-d', value: d},
        {kind: 'function-parameter', name: 'transform-u', value: u},
        {kind: 'function-visibility', target: 'reference', visible: true},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const transformationLesson: GuidedLesson = {
    demonstrationId: 'function-transformation',
    title: text('Preoblikovanje grafov funkcij', 'Graph transformations'),
    summary: text(
        'Graf funkcije \\(y=a\\,f(b(x-c))+d\\) dobimo iz grafa osnovne funkcije \\(f\\) s prenosom, raztegom in zrcaljenjem grafa. Vsak od štirih parametrov spremeni eno lastnost grafa: \\(d\\) ga prenese navpično, \\(c\\) vodoravno, \\(a\\) ga raztegne navpično (negativen \\(a\\) ga zrcali) in \\(b\\) vodoravno (negativen \\(b\\) ga zrcali). Točka \\((u,f(u))\\) osnovnega grafa se preslika v \\((u/b+c,\\;a\\,f(u)+d)\\).',
        'The graph of \\(y=a\\,f(b(x-c))+d\\) comes from the graph of the base function \\(f\\) by shifting, stretching and reflecting. Each of the four parameters changes one feature of the graph: \\(d\\) shifts it vertically, \\(c\\) horizontally, \\(a\\) stretches it vertically (a negative \\(a\\) reflects it) and \\(b\\) horizontally (a negative \\(b\\) reflects it). The point \\((u,f(u))\\) of the base graph maps to \\((u/b+c,\\;a\\,f(u)+d)\\).',
    ),
    prerequisites: [
        text('Potrebno je razumevanje funkcije kot pravila z grafom, kot v poglavju o funkcijah.', 'Assumes a function as a rule with a graph, as in the chapter on functions.'),
        text('Priporočena je lekcija o trigonometričnih funkcijah, kjer amplituda, frekvenca, faza in srednja črta delujejo na enak način.', 'The lesson on trigonometric functions is recommended: amplitude, frequency, phase and midline act the same way.'),
    ],
    learningGoals: [
        text('Vsakemu od parametrov \\(a\\), \\(b\\), \\(c\\) in \\(d\\) pripišeš eno vidno spremembo grafa.', 'Match each of the parameters \\(a\\), \\(b\\), \\(c\\) and \\(d\\) to one visible change of the graph.'),
        text('Napoveš sliko točke osnovnega grafa po pravilu \\((u,v)\\mapsto(u/b+c,\\;a\\,v+d)\\).', 'Predict the image of a point of the base graph by the rule \\((u,v)\\mapsto(u/b+c,\\;a\\,v+d)\\).'),
        text('Navedeš vrstni red operacij in razložiš, zakaj je pri zapisu \\(f(bx+k)\\) prenos grafa enak \\(-k/b\\).', 'State the order of operations and explain why for the form \\(f(bx+k)\\) the shift of the graph is \\(-k/b\\).'),
    ],
    formulaBlocks: [
        {
            id: 'transform-rule',
            latex: 'y=a\\,f\\bigl(b(x-c)\\bigr)+d',
            notation: text(
                '\\(f\\) je osnovna funkcija, \\(a\\) navpični razteg, \\(b\\) vodoravni razteg, \\(c\\) vodoravni prenos in \\(d\\) navpični prenos; \\(b\\ne0\\).',
                '\\(f\\) is the base function, \\(a\\) the vertical stretch, \\(b\\) the horizontal stretch, \\(c\\) the horizontal shift and \\(d\\) the vertical shift; \\(b\\ne0\\).',
            ),
            explanation: text(
                'Vrstni red računanja: od \\(x\\) odštejemo \\(c\\), rezultat pomnožimo z \\(b\\), uporabimo \\(f\\), pomnožimo z \\(a\\) in prištejemo \\(d\\). Za \\(b=0\\) bi bila vrednost \\(f(0)\\) povsod enaka, zato \\(b=0\\) ni dovoljen.',
                'The order of computation: subtract \\(c\\) from \\(x\\), multiply the result by \\(b\\), apply \\(f\\), multiply by \\(a\\) and add \\(d\\). For \\(b=0\\) the value \\(f(0)\\) would be the same everywhere, so \\(b=0\\) is not allowed.',
            ),
        },
        {
            id: 'transform-point-map',
            latex: '(u,v)\\mapsto\\Bigl(\\frac{u}{b}+c,\\;a\\,v+d\\Bigr)',
            notation: text(
                '\\((u,v)\\) je točka osnovnega grafa \\(v=f(u)\\), desna stran je njena slika na novem grafu.',
                '\\((u,v)\\) is a point of the base graph \\(v=f(u)\\); the right-hand side is its image on the new graph.',
            ),
            explanation: text(
                'Točka \\((x,y)\\) je na novem grafu, če je \\(b(x-c)=u\\) in \\(y=a\\,v+d\\). Iz prve enačbe sledi \\(x=u/b+c\\): razdalje od navpične črte \\(x=c\\) so pomnožene z \\(1/|b|\\), črta sama pa je prenesena za \\(c\\). Če funkcijo zapišemo kot \\(f(bx+k)\\), je \\(k=-bc\\) in prenos grafa je \\(-k/b=c\\): konstanta znotraj funkcije se deli z \\(b\\). Navpično najprej razteg z \\(a\\), nato prenos za \\(d\\).',
                'A point \\((x,y)\\) lies on the new graph when \\(b(x-c)=u\\) and \\(y=a\\,v+d\\). The first equation gives \\(x=u/b+c\\): distances from the vertical line \\(x=c\\) are multiplied by \\(1/|b|\\) and the line itself is shifted by \\(c\\). If the function is written as \\(f(bx+k)\\), then \\(k=-bc\\) and the shift of the graph is \\(-k/b=c\\): the constant inside is divided by \\(b\\). Vertically, first the stretch by \\(a\\), then the shift \\(d\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'transform-default-point',
            title: text('Slika točke \\((2,4)\\) grafa \\(y=x^2\\)', 'The image of the point \\((2,4)\\) of \\(y=x^2\\)'),
            calculationLatex: '\\Bigl(\\frac{2}{1/2}+3,\\;-2\\cdot4+1\\Bigr)',
            resultLatex: '(7,-7)',
            check: text(
                'Za \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\) in točko \\((u,v)=(2,4)\\) je \\(x=2/\\tfrac12+3=7\\) in \\(y=-2\\cdot4+1=-7\\). Preverimo: \\(-2\\bigl(\\tfrac12(7-3)\\bigr)^2+1=-2\\cdot4+1=-7\\).',
                'For \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\) and the point \\((u,v)=(2,4)\\) we get \\(x=2/\\tfrac12+3=7\\) and \\(y=-2\\cdot4+1=-7\\). Check: \\(-2\\bigl(\\tfrac12(7-3)\\bigr)^2+1=-2\\cdot4+1=-7\\).',
            ),
        },
        {
            id: 'transform-default-value',
            title: text('Vrednost pri \\(x=5\\)', 'The value at \\(x=5\\)'),
            calculationLatex: '-2\\Bigl(\\tfrac12(5-3)\\Bigr)^2+1',
            resultLatex: '-1',
            check: text(
                'Znotraj je \\(\\tfrac12(5-3)=1\\), \\(1^2=1\\), zato je \\(y=-2\\cdot1+1=-1\\). Teme je pri \\(x=c=3\\) z vrednostjo \\(d=1\\).',
                'Inside, \\(\\tfrac12(5-3)=1\\) and \\(1^2=1\\), so \\(y=-2\\cdot1+1=-1\\). The vertex is at \\(x=c=3\\) with the value \\(d=1\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'transform-original', order: 1,
            title: text('Izvirnik in njegov duh', 'The original and its ghost'),
            purpose: text('Videti osnovni graf \\(y=x^2\\), ki bo ostal kot duh, ko se bo novi graf premaknil.', 'Seeing the base graph \\(y=x^2\\), which stays as a ghost once the new graph moves.'),
            explanation: text(
                'Parametri so \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\), zato je \\(y=1\\cdot(1\\cdot(x-0))^2+0=x^2\\) in novi graf se sklada z duhom osnovnega grafa. Sledena točka je \\((2,4)\\) in njena slika je ista točka.',
                'The parameters are \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\), so \\(y=1\\cdot(1\\cdot(x-0))^2+0=x^2\\) and the new graph coincides with the ghost of the base graph. The tracked point is \\((2,4)\\) and its image is the same point.',
            ),
            formulaIds: ['transform-rule'],
            observationPrompt: text('Poišči sledeno točko \\((2,4)\\) in preveri, da je njena slika na istem mestu.', 'Find the tracked point \\((2,4)\\) and check that its image is in the same place.'),
            expectedObservations: [text('Z vsemi parametri na izhodišču se novi graf in duh sklapljata, slika točke \\((2,4)\\) je \\((2,4)\\).', 'With every parameter at its neutral value the new graph and the ghost coincide, and the image of \\((2,4)\\) is \\((2,4)\\).')],
            scene: transformScene('transform-original-ghost', 'square', 1, 1, 0, 0, 2,
                'Osnova \\(x^2\\), \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\); slika točke \\((2,4)\\) je \\((2,4)\\); duh je viden.',
                'Base \\(x^2\\), \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\); the image of \\((2,4)\\) is \\((2,4)\\); the ghost is visible.'),
        }),
        step({
            id: 'transform-shift-d', order: 2,
            title: text('Navpični prenos \\(d\\)', 'The vertical shift \\(d\\)'),
            purpose: text('Napovedati, kaj stori \\(d\\), in nato preveriti na grafu.', 'Predicting what \\(d\\) does, then checking it on the graph.'),
            explanation: text(
                'Parameter \\(d\\) je spremenjen na \\(1\\), drugi so nespremenjeni. Graf \\(y=x^2+1\\) je duh, prenesen za \\(1\\) navzgor: teme je v \\((0,1)\\), slika točke \\((2,4)\\) pa je \\((2,5)\\). Spremenila se je samo višina grafa, oblika ostane.',
                'The parameter \\(d\\) is changed to \\(1\\), the others stay. The graph \\(y=x^2+1\\) is the ghost shifted up by \\(1\\): the vertex is at \\((0,1)\\) and the image of the point \\((2,4)\\) is \\((2,5)\\). Only the height of the graph changed, the shape stays.',
            ),
            formulaIds: ['transform-point-map'],
            observationPrompt: text('Pred razkritjem napovej, kam se premakne teme, in potem preveri.', 'Before looking, predict where the vertex moves, then check.'),
            expectedObservations: [text('Teme je v \\((0,1)\\), vsaka točka se je premaknila za \\(1\\) navzgor; \\((2,4)\\) gre v \\((2,5)\\).', 'The vertex is at \\((0,1)\\), every point moved up by \\(1\\); \\((2,4)\\) goes to \\((2,5)\\).')],
            scene: transformScene('transform-shift-d-scene', 'square', 1, 1, 0, 1, 2,
                'Osnova \\(x^2\\), \\(d=1\\) (ostali \\(a=1\\), \\(b=1\\), \\(c=0\\)); teme \\((0,1)\\), slika točke \\((2,4)\\) je \\((2,5)\\).',
                'Base \\(x^2\\), \\(d=1\\) (the others \\(a=1\\), \\(b=1\\), \\(c=0\\)); the vertex \\((0,1)\\), the image of \\((2,4)\\) is \\((2,5)\\).'),
        }),
        step({
            id: 'transform-shift-c', order: 3,
            title: text('Vodoravni prenos \\(c\\)', 'The horizontal shift \\(c\\)'),
            purpose: text('Videti, da se graf pri pozitivnem \\(c\\) premakne v desno, čeprav se \\(c\\) odšteva.', 'Seeing that the inside shift \\(c\\) moves the graph to the right for a positive \\(c\\), though it is subtracted.'),
            explanation: text(
                'Dodan je \\(c=3\\) pri \\(d=1\\): \\(y=(x-3)^2+1\\). Vrednost \\(x-3\\) je enaka stari vrednosti \\(x\\), ko je \\(x\\) za \\(3\\) večji, zato je graf prenesen za \\(3\\) v desno. Teme je v \\((3,1)\\), slika točke \\((2,4)\\) je \\((5,5)\\).',
                'Now \\(c=3\\) is added to \\(d=1\\): \\(y=(x-3)^2+1\\). The value \\(x-3\\) equals the old value of \\(x\\) once \\(x\\) is \\(3\\) larger, so the graph is shifted \\(3\\) to the right. The vertex is at \\((3,1)\\) and the image of the point \\((2,4)\\) is \\((5,5)\\).',
            ),
            formulaIds: ['transform-point-map'],
            observationPrompt: text('Primerjaj smer prenosa s predznakom v \\(x-c\\).', 'Compare the direction of the shift with the sign in \\(x-c\\).'),
            expectedObservations: [text('Teme se je premaknilo iz \\((0,1)\\) v \\((3,1)\\): višina je ista, graf je \\(3\\) v desno.', 'The vertex moved from \\((0,1)\\) to \\((3,1)\\): the same height, the graph is \\(3\\) to the right.')],
            scene: transformScene('transform-shift-c-scene', 'square', 1, 1, 3, 1, 2,
                'Osnova \\(x^2\\), \\(c=3\\), \\(d=1\\) (\\(a=1\\), \\(b=1\\)); teme \\((3,1)\\), slika točke \\((2,4)\\) je \\((5,5)\\).',
                'Base \\(x^2\\), \\(c=3\\), \\(d=1\\) (\\(a=1\\), \\(b=1\\)); the vertex \\((3,1)\\), the image of \\((2,4)\\) is \\((5,5)\\).'),
        }),
        step({
            id: 'transform-scale-a', order: 4,
            title: text('Navpični razteg in zrcaljenje \\(a\\)', 'The vertical stretch and reflection \\(a\\)'),
            purpose: text('Ločiti razteg \\(|a|\\) od zrcaljenja, ki ga povzroči predznak \\(a\\).', 'Separating the stretch \\(|a|\\) from the reflection that the sign of \\(a\\) causes.'),
            explanation: text(
                'Parameter \\(a\\) je \\(-2\\). Razdalje od vodoravne črte \\(y=d=1\\) so podvojene, negativen predznak pa graf zrcali v tej črti (v osi \\(x\\), če je \\(d=0\\)): parabola se odpira navzdol. Teme ostane v \\((3,1)\\), slika točke \\((2,4)\\) je \\((5,-7)\\), ker je \\(-2\\cdot4+1=-7\\).',
                'The parameter \\(a\\) is \\(-2\\). Distances from the horizontal line \\(y=d=1\\) are doubled, and the negative sign reflects the graph in this line (in the \\(x\\)-axis if \\(d=0\\)): the parabola opens downward. The vertex stays at \\((3,1)\\) and the image of the point \\((2,4)\\) is \\((5,-7)\\), because \\(-2\\cdot4+1=-7\\).',
            ),
            formulaIds: ['transform-point-map'],
            observationPrompt: text('Poišči, kaj ostane na mestu (teme), in kaj se obrne.', 'Find what stays in place (the vertex) and what turns over.'),
            expectedObservations: [text('Teme \\((3,1)\\) ostane, graf se odpira navzdol in je dvakrat strmejši; \\((2,4)\\) gre v \\((5,-7)\\).', 'The vertex \\((3,1)\\) stays, the graph opens downward and is twice as steep; \\((2,4)\\) goes to \\((5,-7)\\).')],
            scene: transformScene('transform-scale-a-scene', 'square', -2, 1, 3, 1, 2,
                'Osnova \\(x^2\\), \\(a=-2\\), \\(c=3\\), \\(d=1\\) (\\(b=1\\)); teme \\((3,1)\\), slika točke \\((2,4)\\) je \\((5,-7)\\).',
                'Base \\(x^2\\), \\(a=-2\\), \\(c=3\\), \\(d=1\\) (\\(b=1\\)); the vertex \\((3,1)\\), the image of \\((2,4)\\) is \\((5,-7)\\).'),
        }),
        step({
            id: 'transform-scale-b', order: 5,
            title: text('Vodoravni razteg in zrcaljenje \\(b\\)', 'The horizontal stretch and reflection \\(b\\)'),
            purpose: text('Videti, da \\(b\\) razteguje vodoravno z \\(1/|b|\\) in da negativen \\(b\\) zrcali v \\(x=c\\).', 'Seeing that \\(b\\) stretches horizontally by \\(1/|b|\\) and that a negative \\(b\\) reflects in \\(x=c\\).'),
            explanation: text(
                'Osnova je tu \\(x^3\\), ker je \\(x^2\\) simetrična in zrcaljenje ne bi bilo vidno. Parametri so \\(a=1\\), \\(b=-\\tfrac12\\), \\(c=3\\), \\(d=1\\), sledena točka je \\((1,1)\\). Pri \\(b=\\tfrac12\\) bi bila njena slika \\((1/\\tfrac12+3,\\,2)=(5,2)\\); negativen predznak jo zrcali v navpični črti \\(x=3\\) in dobimo \\((1,2)\\). Razdalje od črte \\(x=3\\) so pomnožene z \\(1/|b|=2\\).',
                'The base is \\(x^3\\) here, because \\(x^2\\) is symmetric and the reflection would not show. The parameters are \\(a=1\\), \\(b=-\\tfrac12\\), \\(c=3\\), \\(d=1\\), and the tracked point is \\((1,1)\\). For \\(b=\\tfrac12\\) its image would be \\((1/\\tfrac12+3,\\,2)=(5,2)\\); the negative sign reflects it in the vertical line \\(x=3\\), which gives \\((1,2)\\). Distances from the line \\(x=3\\) are multiplied by \\(1/|b|=2\\).',
            ),
            formulaIds: ['transform-point-map'],
            observationPrompt: text('Pred pogledom napovej, na kateri strani črte \\(x=3\\) je zdaj slika točke.', 'Before looking, predict on which side of the line \\(x=3\\) the image of the point now lies.'),
            expectedObservations: [text('Slika točke \\((1,1)\\) je \\((1,2)\\): ista višina kot pri \\(b=\\tfrac12\\), a na drugi strani črte \\(x=3\\).', 'The image of the point \\((1,1)\\) is \\((1,2)\\): the same height as for \\(b=\\tfrac12\\), but on the other side of the line \\(x=3\\).')],
            scene: transformScene('transform-scale-b-scene', 'cube', 1, -0.5, 3, 1, 1,
                'Osnova \\(x^3\\), \\(a=1\\), \\(b=-\\tfrac12\\), \\(c=3\\), \\(d=1\\); slika točke \\((1,1)\\) je \\((1,2)\\).',
                'Base \\(x^3\\), \\(a=1\\), \\(b=-\\tfrac12\\), \\(c=3\\), \\(d=1\\); the image of \\((1,1)\\) is \\((1,2)\\).'),
        }),
        step({
            id: 'transform-combine', order: 6,
            title: text('Vsi štirje parametri skupaj', 'All four parameters together'),
            purpose: text('Sestaviti preoblikovanje in slediti točki po pravilu.', 'Combining the transformation and following a point by the rule.'),
            explanation: text(
                'Osnova \\(x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\): \\(y=-2\\bigl(\\tfrac12(x-3)\\bigr)^2+1\\). Teme je v \\((3,1)\\). Vrednost pri \\(x=5\\) je \\(-1\\). Točka \\((2,4)\\) gre v \\((2/\\tfrac12+3,\\;-2\\cdot4+1)=(7,-7)\\). Vrstni red: \\(x\\) minus \\(c\\), krat \\(b\\), kvadriraj, krat \\(a\\), plus \\(d\\).',
                'The base \\(x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\): \\(y=-2\\bigl(\\tfrac12(x-3)\\bigr)^2+1\\). The vertex is at \\((3,1)\\). The value at \\(x=5\\) is \\(-1\\). The point \\((2,4)\\) goes to \\((2/\\tfrac12+3,\\;-2\\cdot4+1)=(7,-7)\\). The order: \\(x\\) minus \\(c\\), times \\(b\\), square, times \\(a\\), plus \\(d\\).',
            ),
            formulaIds: ['transform-rule', 'transform-point-map'],
            workedExampleId: 'transform-default-point',
            observationPrompt: text('Izračunaj sliko točke \\((1,1)\\) po pravilu in preveri na grafu.', 'Compute the image of the point \\((1,1)\\) by the rule and check it on the graph.'),
            expectedObservations: [text('Slika \\((2,4)\\) je \\((7,-7)\\), teme \\((3,1)\\), vrednost pri \\(x=5\\) je \\(-1\\).', 'The image of \\((2,4)\\) is \\((7,-7)\\), the vertex \\((3,1)\\), and the value at \\(x=5\\) is \\(-1\\).')],
            scene: transformScene('transform-combine-scene', 'square', -2, 0.5, 3, 1, 2,
                'Osnova \\(x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\); teme \\((3,1)\\), slika točke \\((2,4)\\) je \\((7,-7)\\), vrednost pri \\(x=5\\) je \\(-1\\).',
                'Base \\(x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\); the vertex \\((3,1)\\), the image of \\((2,4)\\) is \\((7,-7)\\), the value at \\(x=5\\) is \\(-1\\).'),
        }),
        step({
            id: 'transform-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti pravilo na drugih osnovnih funkcijah.', 'Trying the rule on other base functions on your own.'),
            explanation: text(
                'Prikazan je isti primer kot prej, vse je prosto. Zamenjaj osnovno funkcijo (parametri se ohranijo), premikaj parametre in sledeno točko ter vsakič napovej sliko po pravilu \\((u,v)\\mapsto(u/b+c,\\;a\\,v+d)\\). Pri funkcijah z omejeno domeno se točka zunaj domene ne nariše.',
                'The same example as before is shown and everything is free. Change the base function (the parameters are kept), move the parameters and the tracked point, and each time predict the image by the rule \\((u,v)\\mapsto(u/b+c,\\;a\\,v+d)\\). For functions with a restricted domain a point outside the domain is not drawn.',
            ),
            formulaIds: ['transform-rule', 'transform-point-map'],
            workedExampleId: 'transform-default-value',
            observationPrompt: text('Izberi drugo osnovo in preveri, da pravilo za sliko točke velja tudi zanjo.', 'Choose another base and check that the rule for the image of a point holds for it too.'),
            expectedObservations: [text('Pravilo za sliko točke ne zavisi od osnovne funkcije; \\(b=0\\) program zavrne.', 'The rule for the image of a point does not depend on the base function; the program rejects \\(b=0\\).')],
            scene: transformScene('transform-explore-free', 'square', -2, 0.5, 3, 1, 2,
                'Osnova \\(x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\); vse je prosto za raziskovanje.',
                'Base \\(x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-transformation-implementation',
            citation: 'Bezeg source: src/analysis/transformation.ts, src/analysis/functionTransformationModel.ts and src/graphs/functions/FunctionTransformationGraph.tsx.',
            implementationCorrespondence: 'The point map (u/b+c, a v+d) is mapPoint of the kernel; a scene sets the base, the four parameters, the tracked abscissa u and the ghost, and the lesson text quotes only values of those scenes.',
        },
    ],
    edgeCases: [
        text('Parameter \\(b=0\\) program zavrne, ker bi bila funkcija konstantna; vrednosti so omejene na \\(|a|,|b|\\le10\\) in \\(|c|,|d|\\le20\\).', 'The parameter \\(b=0\\) is rejected by the program because the function would be constant; values are bounded by \\(|a|,|b|\\le10\\) and \\(|c|,|d|\\le20\\).'),
        text('Pri osnovnih funkcijah \\(\\sqrt x\\), \\(1/x\\) in \\(\\ln x\\) sledena točka zunaj domene ni narisana.', 'For the base functions \\(\\sqrt x\\), \\(1/x\\) and \\(\\ln x\\) a tracked point outside the domain is not drawn.'),
    ],
    unresolvedQuestions: [],
};

// ---------------------------------------------------------------------------------------------------------------- S2

export type InverseRestrictionName = 'square' | 'exp' | 'natural';

/** An S2 scene from the default scene: the restriction, the base and then x0 (in this order, because x0 is valid only inside the current range), then the two toggles. */
const inverseScene = (
    id: string, restriction: InverseRestrictionName, base: number, x0: number, inverseVisible: boolean, tangentVisible: boolean, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'inverse-restriction', value: restriction},
        {kind: 'function-parameter', name: 'inverse-base', value: base},
        {kind: 'function-parameter', name: 'inverse-x0', value: x0},
        {kind: 'function-visibility', target: 'inverse-curve', visible: inverseVisible},
        {kind: 'function-visibility', target: 'tangent', visible: tangentVisible},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const inverseLesson: GuidedLesson = {
    demonstrationId: 'function-inverse',
    title: text('Inverzne funkcije in logaritem', 'Inverse functions and the logarithm'),
    summary: text(
        'Graf inverzne funkcije je zrcalna slika grafa v premici \\(y=x\\): točka \\((x,y)\\) preide v \\((y,x)\\). Ker smerna koeficienta v zrcalnih točkah zrcalita tangenti, sta obratni vrednosti: \\((f^{-1})\'(y_0)=1/f\'(x_0)\\). Logaritem \\(\\ln\\) je inverz funkcije \\(e^x\\), logaritem pri osnovi \\(a\\), \\(\\log_a\\), pa inverz funkcije \\(a^x\\).',
        'The graph of an inverse function is the reflection of the graph in the line \\(y=x\\): the point \\((x,y)\\) goes to \\((y,x)\\). The tangents at mirrored points mirror each other, so their slopes are reciprocal: \\((f^{-1})\'(y_0)=1/f\'(x_0)\\). The logarithm \\(\\ln\\) is the inverse of \\(e^x\\), and the logarithm to base \\(a\\), \\(\\log_a\\), is the inverse of \\(a^x\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje eksponentne funkcije in odvoda.', 'Assumes the exponential function and the derivative.'),
        text('Priporočena je lekcija o preoblikovanju grafov, kjer je zrcaljenje že nastopilo.', 'The lesson on graph transformations is recommended: reflection has appeared there.'),
    ],
    learningGoals: [
        text('Narišeš inverzno funkcijo kot zrcalno sliko grafa v \\(y=x\\) in zamenjaš koordinate točke.', 'Draw the inverse function as the mirror image of the graph in \\(y=x\\) and swap the coordinates of a point.'),
        text('Razložiš, zakaj ima funkcija inverz le na intervalu, kjer je ena na ena, in zakaj se \\(x^2\\) omeji na \\(x\\ge0\\).', 'Explain why a function has an inverse only where it is one-to-one, and why \\(x^2\\) is restricted to \\(x\\ge0\\).'),
        text('Veš, da je zmnožek smernih koeficientov v zrcalnih točkah enak \\(1\\), in poveš domeno \\(x>0\\) ter asimptoto \\(x=0\\) funkcije \\(\\ln\\).', 'Know that the product of the slopes at mirrored points is \\(1\\), and state the domain \\(x>0\\) and the asymptote \\(x=0\\) of \\(\\ln\\).'),
    ],
    formulaBlocks: [
        {
            id: 'inverse-reflection',
            latex: '(x,y)\\mapsto(y,x),\\qquad f^{-1}(f(x))=x',
            notation: text(
                'Točka \\((x,y)=(x,f(x))\\) grafa \\(f\\) preide v točko \\((f(x),x)\\) grafa \\(f^{-1}\\).',
                'The point \\((x,y)=(x,f(x))\\) of the graph of \\(f\\) goes to the point \\((f(x),x)\\) of the graph of \\(f^{-1}\\).',
            ),
            explanation: text(
                'Zamenjava koordinat je zrcaljenje v premici \\(y=x\\) in je natančna konstrukcija. Inverz obstaja, če \\(f\\) vsako vrednost zavzame le enkrat; vsaka vodoravna premica mora graf sekati največ enkrat. Za \\(x^2\\) na \\(\\mathbb R\\) to ne velja (\\(2^2=(-2)^2=4\\)), zato inverz velja le za omejitev \\(x\\ge0\\).',
                'Swapping the coordinates is the reflection in the line \\(y=x\\), and it is an exact construction. An inverse exists when \\(f\\) takes every value only once; every horizontal line must meet the graph at most once. For \\(x^2\\) on \\(\\mathbb R\\) this fails (\\(2^2=(-2)^2=4\\)), so the inverse exists only for the restriction \\(x\\ge0\\).',
            ),
        },
        {
            id: 'inverse-slopes',
            latex: '\\bigl(f^{-1}\\bigr)\'(y_0)=\\frac1{f\'(x_0)},\\qquad y_0=f(x_0)',
            notation: text(
                '\\(x_0\\) je abscisa točke \\(P\\), \\(y_0=f(x_0)\\) in \\(f\'(x_0)\\ne0\\).',
                '\\(x_0\\) is the abscissa of the point \\(P\\), \\(y_0=f(x_0)\\) and \\(f\'(x_0)\\ne0\\).',
            ),
            explanation: text(
                'Iz \\(f(f^{-1}(y))=y\\) po verižnem pravilu sledi \\(f\'(f^{-1}(y))\\cdot(f^{-1})\'(y)=1\\). Slika kaže to zvezo na primerih in je ne dokazuje. Če je \\(f\'(x_0)=0\\) (\\(x^2\\) pri \\(0\\)), je tangenta inverza navpična in smernega koeficienta ni.',
                'From \\(f(f^{-1}(y))=y\\) the chain rule gives \\(f\'(f^{-1}(y))\\cdot(f^{-1})\'(y)=1\\). The picture illustrates this identity on examples and does not prove it. If \\(f\'(x_0)=0\\) (\\(x^2\\) at \\(0\\)) the tangent of the inverse is vertical and there is no slope.',
            ),
        },
        {
            id: 'inverse-logarithm',
            latex: 'a^{\\log_a y}=y,\\qquad \\log_a\\bigl(a^x\\bigr)=x,\\qquad a>0,\\;a\\ne1',
            notation: text(
                '\\(\\log_a\\) je logaritem pri osnovi \\(a\\); \\(\\ln=\\log_e\\).',
                '\\(\\log_a\\) is the logarithm to base \\(a\\); \\(\\ln=\\log_e\\).',
            ),
            explanation: text(
                'Funkcija \\(a^x\\) je ena na ena in ima vrednosti \\(y>0\\), zato je njen inverz \\(\\log_a\\) definiran za \\(x>0\\), z navpično asimptoto \\(x=0\\), ki je zrcalna slika vodoravne asimptote \\(y=0\\) funkcije \\(a^x\\). Osnova \\(a=1\\) je izključena, ker je \\(1^x=1\\) konstanta.',
                'The function \\(a^x\\) is one-to-one with values \\(y>0\\), so its inverse \\(\\log_a\\) is defined for \\(x>0\\), with the vertical asymptote \\(x=0\\), the mirror image of the horizontal asymptote \\(y=0\\) of \\(a^x\\). The base \\(a=1\\) is excluded, because \\(1^x=1\\) is constant.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'inverse-square-slopes',
            title: text('Smerna koeficienta \\(x^2\\) in \\(\\sqrt x\\)', 'The slopes of \\(x^2\\) and \\(\\sqrt x\\)'),
            calculationLatex: '2\\cdot2=4,\\qquad \\frac1{2\\sqrt4}=\\frac14',
            resultLatex: '4\\cdot\\frac14=1',
            check: text(
                'V \\(P=(2,4)\\) je smerni koeficient funkcije \\(x^2\\) enak \\(2x=4\\), v \\(P\'=(4,2)\\) pa je smerni koeficient funkcije \\(\\sqrt x\\) enak \\(1/(2\\sqrt4)=\\tfrac14\\). Zmnožek je \\(1\\).',
                'At \\(P=(2,4)\\) the slope of \\(x^2\\) is \\(2x=4\\), and at \\(P\'=(4,2)\\) the slope of \\(\\sqrt x\\) is \\(1/(2\\sqrt4)=\\tfrac14\\). The product is \\(1\\).',
            ),
        },
        {
            id: 'inverse-two-slopes',
            title: text('Smerna koeficienta \\(2^x\\) in \\(\\log_2x\\)', 'The slopes of \\(2^x\\) and \\(\\log_2x\\)'),
            calculationLatex: '2^3=8,\\quad \\log_28=3,\\qquad 8\\ln2\\cdot\\frac1{8\\ln2}=1',
            resultLatex: '1',
            check: text(
                'Za \\(a=2\\) je \\(2^3=8\\) in \\(\\log_28=3\\). Smerni koeficient funkcije \\(2^x\\) v \\((3,8)\\) je \\(8\\ln2\\approx5{,}5452\\), funkcije \\(\\log_2\\) v \\((8,3)\\) pa \\(1/(8\\ln2)\\approx0{,}18034\\); zmnožek je \\(1\\).',
                'For \\(a=2\\) we have \\(2^3=8\\) and \\(\\log_28=3\\). The slope of \\(2^x\\) at \\((3,8)\\) is \\(8\\ln2\\approx5.5452\\), of \\(\\log_2\\) at \\((8,3)\\) it is \\(1/(8\\ln2)\\approx0.18034\\); the product is \\(1\\).',
            ),
        },
        {
            id: 'inverse-natural-slopes',
            title: text('Smerna koeficienta \\(e^x\\) in \\(\\ln x\\)', 'The slopes of \\(e^x\\) and \\(\\ln x\\)'),
            calculationLatex: '(e^x)\'\\Big|_{x=1}=e,\\qquad (\\ln x)\'\\Big|_{x=e}=\\frac1e',
            resultLatex: 'e\\cdot\\frac1e=1',
            check: text(
                'V \\((1,e)\\) je smerni koeficient funkcije \\(e^x\\) enak \\(e\\approx2{,}71828\\), v \\((e,1)\\) pa je smerni koeficient funkcije \\(\\ln\\) enak \\(1/e\\approx0{,}36788\\).',
                'At \\((1,e)\\) the slope of \\(e^x\\) is \\(e\\approx2.71828\\), and at \\((e,1)\\) the slope of \\(\\ln\\) is \\(1/e\\approx0.36788\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'inverse-mirror', order: 1,
            title: text('Premica \\(y=x\\) in zrcalna točka', 'The line \\(y=x\\) and the mirror point'),
            purpose: text('Napovedati zrcalno krivuljo, preden se pokaže.', 'Predicting the mirrored curve before it is shown.'),
            explanation: text(
                'Narisana sta graf \\(y=x^2\\) na \\(x\\ge0\\) in točka \\(P=(2,4)\\); njena zrcalna točka v premici \\(y=x\\) je \\(P\'=(4,2)\\), koordinati sta zamenjani. Zrcalne krivulje še ni.',
                'The graph of \\(y=x^2\\) on \\(x\\ge0\\) and the point \\(P=(2,4)\\) are drawn; its mirror point in the line \\(y=x\\) is \\(P\'=(4,2)\\), the coordinates swapped. The mirrored curve is not shown yet.',
            ),
            formulaIds: ['inverse-reflection'],
            observationPrompt: text('Napovej, kje poteka zrcalna krivulja skozi \\(P\'=(4,2)\\), in jo skiciraj.', 'Predict where the mirrored curve runs through \\(P\'=(4,2)\\), and sketch it.'),
            expectedObservations: [text('Zrcalna točka točke \\((2,4)\\) je \\((4,2)\\); inverzna krivulja še ni prikazana.', 'The mirror point of \\((2,4)\\) is \\((4,2)\\); the inverse curve is not shown yet.')],
            scene: inverseScene('inverse-mirror-point', 'square', 2, 2, false, false,
                'Omejitev \\(x^2\\) na \\(x\\ge0\\), \\(P=(2,4)\\), \\(P\'=(4,2)\\); inverzna krivulja in tangenti sta skriti.',
                'The restriction \\(x^2\\) on \\(x\\ge0\\), \\(P=(2,4)\\), \\(P\'=(4,2)\\); the inverse curve and the tangents are hidden.'),
        }),
        step({
            id: 'inverse-reveal', order: 2,
            title: text('Razkritje zrcalne krivulje', 'Revealing the mirrored curve'),
            purpose: text('Primerjati napoved z zrcalno sliko grafa.', 'Comparing the prediction with the mirror image of the graph.'),
            explanation: text(
                'Zrcalna slika grafa \\(y=x^2\\), \\(x\\ge0\\), v premici \\(y=x\\) je graf \\(y=\\sqrt x\\). Točka \\(P\'=(4,2)\\) leži na njem, ker je \\(\\sqrt4=2\\). Zrcaljenje je konstrukcija z zamenjavo koordinat, zato je natančna.',
                'The mirror image of the graph \\(y=x^2\\), \\(x\\ge0\\), in the line \\(y=x\\) is the graph \\(y=\\sqrt x\\). The point \\(P\'=(4,2)\\) lies on it, because \\(\\sqrt4=2\\). The reflection is a construction by swapping coordinates, so it is exact.',
            ),
            formulaIds: ['inverse-reflection'],
            observationPrompt: text('Primerjaj skico z \\(\\sqrt x\\) in preveri, da \\((4,2)\\) leži na njej.', 'Compare your sketch with \\(\\sqrt x\\) and check that \\((4,2)\\) lies on it.'),
            expectedObservations: [text('Inverzna krivulja \\(y=\\sqrt x\\) poteka skozi \\(P\'=(4,2)\\).', 'The inverse curve \\(y=\\sqrt x\\) runs through \\(P\'=(4,2)\\).')],
            scene: inverseScene('inverse-reveal-curve', 'square', 2, 2, true, false,
                'Omejitev \\(x^2\\) na \\(x\\ge0\\), \\(P=(2,4)\\), \\(P\'=(4,2)\\); inverzna krivulja \\(\\sqrt x\\) je prikazana, tangenti sta skriti.',
                'The restriction \\(x^2\\) on \\(x\\ge0\\), \\(P=(2,4)\\), \\(P\'=(4,2)\\); the inverse curve \\(\\sqrt x\\) is shown, the tangents are hidden.'),
        }),
        step({
            id: 'inverse-restrict', order: 3,
            title: text('Zakaj omejitev \\(x\\ge0\\)', 'Why the restriction \\(x\\ge0\\)'),
            purpose: text('Razumeti, da inverz obstaja le tam, kjer je funkcija ena na ena.', 'Understanding that an inverse exists only where the function is one-to-one.'),
            explanation: text(
                'Na celotni \\(\\mathbb R\\) premica \\(y=4\\) seka graf \\(x^2\\) v točkah \\(x=2\\) in \\(x=-2\\), zato iz vrednosti \\(4\\) ni mogoče enolično razbrati \\(x\\) in inverza ni. Program ponuja le omejitve, na katerih je funkcija ena na ena; to je predpostavka lekcije. Za \\(x\\ge0\\) imamo \\(\\sqrt x\\).',
                'On the whole of \\(\\mathbb R\\) the line \\(y=4\\) meets the graph of \\(x^2\\) at \\(x=2\\) and \\(x=-2\\), so the value \\(4\\) does not determine \\(x\\) and there is no inverse. The program offers only restrictions on which the function is one-to-one; this is a hypothesis of the lesson. For \\(x\\ge0\\) we get \\(\\sqrt x\\).',
            ),
            formulaIds: ['inverse-reflection'],
            observationPrompt: text('Predstavljaj si vodoravno premico \\(y=4\\) in preštej presečišča z levo in desno vejo parabole.', 'Imagine the horizontal line \\(y=4\\) and count its intersections with the left and the right branch of the parabola.'),
            expectedObservations: [text('Premica \\(y=4\\) seka celotno parabolo dvakrat, omejeno na \\(x\\ge0\\) pa enkrat, pri \\(x=2\\).', 'The line \\(y=4\\) meets the whole parabola twice, but the part \\(x\\ge0\\) once, at \\(x=2\\).')],
            scene: inverseScene('inverse-restrict-square', 'square', 2, 2, true, false,
                'Omejitev \\(x^2\\) na \\(x\\ge0\\), \\(P=(2,4)\\); inverz \\(\\sqrt x\\) je prikazan.',
                'The restriction \\(x^2\\) on \\(x\\ge0\\), \\(P=(2,4)\\); the inverse \\(\\sqrt x\\) is shown.'),
        }),
        step({
            id: 'inverse-tangent', order: 4,
            title: text('Tangenta in zrcalna tangenta', 'The tangent and the mirrored tangent'),
            purpose: text('Videti, da sta smerna koeficienta v zrcalnih točkah obratni vrednosti.', 'Seeing that the slopes at mirrored points are reciprocals.'),
            explanation: text(
                'Prikazani sta tangenta v \\(P=(2,4)\\) s smernim koeficientom \\(4\\) in zrcalna tangenta v \\(P\'=(4,2)\\) s smernim koeficientom \\(\\tfrac14\\). Zrcaljenje v \\(y=x\\) zamenja vlogi \\(x\\) in \\(y\\), zato je smerni koeficient obratna vrednost, zmnožek pa \\(4\\cdot\\tfrac14=1\\). Premakni \\(P\\) na \\(x_0=0\\): tangenta je vodoravna, zrcalna pa navpična in smernega koeficienta ni.',
                'The tangent at \\(P=(2,4)\\) with slope \\(4\\) and the mirrored tangent at \\(P\'=(4,2)\\) with slope \\(\\tfrac14\\) are shown. Reflection in \\(y=x\\) swaps the roles of \\(x\\) and \\(y\\), so the slope becomes its reciprocal and the product is \\(4\\cdot\\tfrac14=1\\). Move \\(P\\) to \\(x_0=0\\): the tangent is horizontal, the mirrored one is vertical and has no slope.',
            ),
            formulaIds: ['inverse-slopes'],
            workedExampleId: 'inverse-square-slopes',
            observationPrompt: text('Preberi oba smerna koeficienta in ju zmnoži.', 'Read both slopes and multiply them.'),
            expectedObservations: [text('Smerna koeficienta sta \\(4\\) in \\(\\tfrac14\\), zmnožek je \\(1\\).', 'The slopes are \\(4\\) and \\(\\tfrac14\\), the product is \\(1\\).')],
            scene: inverseScene('inverse-tangent-pair', 'square', 2, 2, true, true,
                'Omejitev \\(x^2\\), \\(P=(2,4)\\), \\(P\'=(4,2)\\); smerna koeficienta \\(4\\) in \\(\\tfrac14\\); tangenti sta prikazani.',
                'The restriction \\(x^2\\), \\(P=(2,4)\\), \\(P\'=(4,2)\\); the slopes \\(4\\) and \\(\\tfrac14\\); the tangents are shown.'),
        }),
        step({
            id: 'inverse-base', order: 5,
            title: text('Osnova \\(a\\): \\(a^x\\) in \\(\\log_a\\)', 'The base \\(a\\): \\(a^x\\) and \\(\\log_a\\)'),
            purpose: text('Povezati eksponentno funkcijo in logaritem pri isti osnovi.', 'Connecting the exponential function and the logarithm to the same base.'),
            explanation: text(
                'Pri osnovi \\(a=2\\) je \\(2^3=8\\), zato je \\(\\log_28=3\\): točki \\(P=(3,8)\\) in \\(P\'=(8,3)\\) sta zrcalni. Smerni koeficient funkcije \\(2^x\\) v \\(P\\) je \\(8\\ln2\\approx5{,}5452\\), funkcije \\(\\log_2\\) v \\(P\'\\) pa \\(1/(8\\ln2)\\approx0{,}18034\\); zmnožek je \\(1\\). Drsnik osnove obsega \\(0{,}2\\le a\\le5\\); osnove \\(a=1\\) ni, ker je \\(1^x\\) konstanta.',
                'For the base \\(a=2\\) we have \\(2^3=8\\), so \\(\\log_28=3\\): the points \\(P=(3,8)\\) and \\(P\'=(8,3)\\) are mirror images. The slope of \\(2^x\\) at \\(P\\) is \\(8\\ln2\\approx5.5452\\), of \\(\\log_2\\) at \\(P\'\\) it is \\(1/(8\\ln2)\\approx0.18034\\); the product is \\(1\\). The base slider covers \\(0.2\\le a\\le5\\); \\(a=1\\) is missing because \\(1^x\\) is constant.',
            ),
            formulaIds: ['inverse-logarithm', 'inverse-slopes'],
            workedExampleId: 'inverse-two-slopes',
            observationPrompt: text('Premakni osnovo in opazuj, kako se oba grafa skupaj spreminjata, medtem ko ostaneta zrcalna.', 'Move the base and watch how both graphs change together while staying mirror images.'),
            expectedObservations: [text('Pri \\(a=2\\) je \\(P=(3,8)\\), \\(P\'=(8,3)\\) in smerna koeficienta sta \\(5{,}5452\\) in \\(0{,}18034\\).', 'At \\(a=2\\) we have \\(P=(3,8)\\), \\(P\'=(8,3)\\) and the slopes are \\(5.5452\\) and \\(0.18034\\).')],
            scene: inverseScene('inverse-base-two', 'exp', 2, 3, true, true,
                'Omejitev \\(a^x\\) pri \\(a=2\\), \\(P=(3,8)\\), \\(P\'=(8,3)\\); smerna koeficienta \\(5{,}5452\\) in \\(0{,}18034\\).',
                'The restriction \\(a^x\\) at \\(a=2\\), \\(P=(3,8)\\), \\(P\'=(8,3)\\); the slopes \\(5.5452\\) and \\(0.18034\\).'),
        }),
        step({
            id: 'inverse-ln', order: 6,
            title: text('Naravni logaritem, domena in asimptota', 'The natural logarithm, domain and asymptote'),
            purpose: text('Videti, da je \\(\\ln\\) inverz funkcije \\(e^x\\), definiran le za \\(x>0\\).', 'Seeing that \\(\\ln\\) is the inverse of \\(e^x\\), defined only for \\(x>0\\).'),
            explanation: text(
                'Za osnovo \\(e\\) sta \\(P=(1,e)\\) in \\(P\'=(e,1)\\) zrcalni točki. Smerni koeficient funkcije \\(e^x\\) v \\(P\\) je \\(e\\approx2{,}71828\\), funkcije \\(\\ln\\) v \\(P\'\\) pa \\(1/e\\approx0{,}36788\\). Funkcija \\(e^x\\) ima samo vrednosti \\(y>0\\) in vodoravno asimptoto \\(y=0\\), zato je \\(\\ln x\\) definiran za \\(x>0\\) z navpično asimptoto \\(x=0\\).',
                'For the base \\(e\\), \\(P=(1,e)\\) and \\(P\'=(e,1)\\) are mirror points. The slope of \\(e^x\\) at \\(P\\) is \\(e\\approx2.71828\\), of \\(\\ln\\) at \\(P\'\\) it is \\(1/e\\approx0.36788\\). The function \\(e^x\\) takes only values \\(y>0\\) and has the horizontal asymptote \\(y=0\\), so \\(\\ln x\\) is defined for \\(x>0\\), with the vertical asymptote \\(x=0\\).',
            ),
            formulaIds: ['inverse-logarithm'],
            workedExampleId: 'inverse-natural-slopes',
            observationPrompt: text('Poišči asimptoti obeh grafov in preveri, da se zrcalita druga v drugo.', 'Find the asymptotes of both graphs and check that they mirror each other.'),
            expectedObservations: [text('Asimptoti \\(y=0\\) in \\(x=0\\) sta zrcalni; smerna koeficienta sta \\(e\\) in \\(0{,}36788\\).', 'The asymptotes \\(y=0\\) and \\(x=0\\) are mirror images; the slopes are \\(e\\) and \\(0.36788\\).')],
            scene: inverseScene('inverse-natural-log', 'natural', 2, 1, true, true,
                'Omejitev \\(e^x\\), \\(P=(1,e)\\), \\(P\'=(e,1)\\); smerna koeficienta \\(e\\) in \\(0{,}36788\\); asimptoti \\(y=0\\) in \\(x=0\\).',
                'The restriction \\(e^x\\), \\(P=(1,e)\\), \\(P\'=(e,1)\\); the slopes \\(e\\) and \\(0.36788\\); the asymptotes \\(y=0\\) and \\(x=0\\).'),
        }),
        step({
            id: 'inverse-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti zrcaljenje in obratni vrednosti smernih koeficientov.', 'Trying the reflection and the reciprocal slopes on your own.'),
            explanation: text(
                'Prikazana je omejitev \\(x^2\\) na \\(x\\ge0\\) s \\(P=(2,4)\\); vse je prosto. Povleci \\(P\\), zamenjaj omejitev, premakni osnovo in vsakič preveri, da sta koordinati zrcalne točke zamenjani in da je zmnožek smernih koeficientov \\(1\\).',
                'The restriction \\(x^2\\) on \\(x\\ge0\\) with \\(P=(2,4)\\) is shown and everything is free. Drag \\(P\\), change the restriction, move the base, and each time check that the coordinates of the mirror point are swapped and that the product of the slopes is \\(1\\).',
            ),
            formulaIds: ['inverse-reflection', 'inverse-slopes'],
            observationPrompt: text('Poišči položaj \\(P\\), pri katerem smernega koeficienta zrcalne tangente ni.', 'Find the position of \\(P\\) where the mirrored tangent has no slope.'),
            expectedObservations: [text('Pri \\(x^2\\) in \\(x_0=0\\) je tangenta vodoravna, zrcalna tangenta navpična in zmnožka ni.', 'For \\(x^2\\) and \\(x_0=0\\) the tangent is horizontal, the mirrored tangent vertical and there is no product.')],
            scene: inverseScene('inverse-explore-free', 'square', 2, 2, true, true,
                'Omejitev \\(x^2\\) na \\(x\\ge0\\), \\(P=(2,4)\\); vse je prosto za raziskovanje.',
                'The restriction \\(x^2\\) on \\(x\\ge0\\), \\(P=(2,4)\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-inverse-implementation',
            citation: 'Bezeg source: src/analysis/inverse.ts, src/analysis/functionInverseModel.ts and src/graphs/functions/FunctionInverseGraph.tsx.',
            implementationCorrespondence: 'The mirror point swaps coordinates and the slopes at P and P\' come from the kernel mirroredSlopes; a scene sets the restriction, the base, x0 and the two toggles, and the lesson text quotes only values of those scenes.',
        },
    ],
    edgeCases: [
        text('Pri \\(x^2\\) in \\(x_0=0\\) je smerni koeficient \\(0\\), tangenta inverza je navpična in smernega koeficienta ni; zmnožka ni.', 'For \\(x^2\\) and \\(x_0=0\\) the slope is \\(0\\), the tangent of the inverse is vertical and has no slope; there is no product.'),
        text('Točka \\(P\\) je omejena na območje, kjer \\(P\\) in \\(P\'\\) ostaneta v pogledu: \\(x_0\\in[0,2{,}8]\\) za \\(x^2\\), \\(x_0\\in[-3,2]\\) za \\(e^x\\); za osnovo \\(a\\) se območje spremeni.', 'The point \\(P\\) is limited to the range where \\(P\\) and \\(P\'\\) stay in view: \\(x_0\\in[0,2.8]\\) for \\(x^2\\), \\(x_0\\in[-3,2]\\) for \\(e^x\\); for the base \\(a\\) the range changes.'),
    ],
    unresolvedQuestions: [],
};

export const schoolFunctionGraphsGuidedLessons: readonly GuidedLesson[] = [transformationLesson, inverseLesson];
