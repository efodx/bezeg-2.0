/**
 * Guided lessons of the combinatorics family, batch A (docs/specs/combinatorics-lessons.md): CB1, lattice paths and Pascal's triangle, on `lattice-paths`
 * (LatticePathGraph), and CB2, the product rule, the tree, permutations, variations and combinations, on `counting-tree` (CountingTreeGraph). Each is the
 * lesson of one section of the combinatorics chapter (combinatoricsChapterRegistry.ts adapts them on request; the lesson catalog holds none, as it keeps one
 * lesson per Demonstration). Scenes use only the `combinatorics` actions the two graphs register (`set-target`, `set-lattice-display`, `set-expansion`, `set-counting-mode`)
 * and every scene starts from the Demonstration default and names what it sets. Every number the text quotes is a readout of the graph for that scene,
 * a value the learner reads after an action the text asks for, or plain arithmetic shown in the same step; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-comb-a.md.
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

/** What a lattice scene sets: the target and, when it differs from the default, the content view and the switch of the count labels. */
export interface LatticeSceneSpec {
    readonly a: number;
    readonly b: number;
    readonly view?: 'paths' | 'triangle';
    readonly showCounts?: boolean;
    /** The switch that colours the routes by their last step (CB3); absent leaves it off. */
    readonly split?: boolean;
}

/** The actions of a lattice scene: the Demonstration default, the target, and the display only when the scene names one. */
export const latticeSceneActions = (id: string, spec: LatticeSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'combinatorics', operation: 'set-target', a: spec.a, b: spec.b},
    ...(spec.view !== undefined || spec.showCounts !== undefined || spec.split !== undefined
        ? [{
            kind: 'combinatorics', operation: 'set-lattice-display', view: spec.view ?? 'paths', showCounts: spec.showCounts ?? false,
            ...(spec.split !== undefined ? {split: spec.split} : {}),
        } as const]
        : []),
];

/** The actions of an expansion scene (CB4): the Demonstration default, then the view `expansion` of (x + c)^n. */
export const expansionSceneActions = (id: string, spec: {readonly n: number; readonly c: number}): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'combinatorics', operation: 'set-expansion', n: spec.n, c: spec.c},
];

const expansionScene = (id: string, spec: {readonly n: number; readonly c: number}, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: expansionSceneActions(id, spec), expectedState: text(sl, en)});

const latticeScene = (id: string, spec: LatticeSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: latticeSceneActions(id, spec), expectedState: text(sl, en)});

/** What a counting scene sets: a choice of k from n with the two switches, or the four letter counts. */
export type CountingSceneSpec =
    | {readonly view: 'choices'; readonly n: number; readonly k: number; readonly ordered: boolean; readonly repetition: boolean}
    | {readonly view: 'multiset'; readonly counts: readonly [number, number, number, number]};

export const countingSceneActions = (id: string, spec: CountingSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    spec.view === 'choices'
        ? {kind: 'combinatorics', operation: 'set-counting-mode', view: 'choices', n: spec.n, k: spec.k, ordered: spec.ordered, repetition: spec.repetition}
        : {kind: 'combinatorics', operation: 'set-counting-mode', view: 'multiset', counts: spec.counts},
];

const countingScene = (id: string, spec: CountingSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: countingSceneActions(id, spec), expectedState: text(sl, en)});

const MISSISSIPPI: readonly [number, number, number, number] = [1, 4, 4, 2];

// ---- CB1 -------------------------------------------------------------------------------------------------------------------------

const cb1Formulas: readonly FormulaBlock[] = [
    {
        id: 'route-count',
        latex: 'N(a,b)=\\binom{a+b}{a}',
        notation: text(
            '\\(N(a,b)\\) je število poti po mreži od \\((0,0)\\) do \\((a,b)\\), ki gredo samo desno in gor; \\(\\binom{a+b}{a}\\) je binomski simbol.',
            '\\(N(a,b)\\) is the number of routes on the grid from \\((0,0)\\) to \\((a,b)\\) that go only right and up; \\(\\binom{a+b}{a}\\) is the binomial coefficient.',
        ),
        explanation: text(
            'Izrek: poti do \\((a,b)\\) je \\(\\binom{a+b}{a}\\). Pot ima \\(a+b\\) korakov, od tega \\(a\\) korakov desno (D) in \\(b\\) korakov gor (G), pot pa je natanko določena s tem, katerih \\(a\\) od \\(a+b\\) korakov je D. Zato je število poti enako številu izbir \\(a\\) mest izmed \\(a+b\\) mest. Binomski simbol je simetričen: \\(\\binom{a+b}{a}=\\binom{a+b}{b}\\).',
            'Theorem: the number of routes to \\((a,b)\\) is \\(\\binom{a+b}{a}\\). A route has \\(a+b\\) steps, \\(a\\) of them right (R) and \\(b\\) up (U), and a route is determined exactly by which \\(a\\) of the \\(a+b\\) steps are R. So the number of routes equals the number of ways to choose \\(a\\) places out of \\(a+b\\) places. The binomial coefficient is symmetric: \\(\\binom{a+b}{a}=\\binom{a+b}{b}\\).',
        ),
    },
    {
        id: 'addition-rule',
        latex: 'N(a,b)=N(a-1,b)+N(a,b-1)',
        notation: text(
            '\\(N(a-1,b)\\) je število poti do točke levo od cilja, \\(N(a,b-1)\\) do točke pod ciljem; velja za \\(a,b\\ge1\\).',
            '\\(N(a-1,b)\\) is the number of routes to the point left of the target, \\(N(a,b-1)\\) to the point below it; it holds for \\(a,b\\ge1\\).',
        ),
        explanation: text(
            'Pravilo seštevanja: število poti do točke je vsota števil poti do točke levo od nje in točke pod njo. Na mreži ga vidimo kot ponazoritev. Razlog (pot vstopi v točko iz leve ali od spodaj) je tema poznejše lekcije v poglavju; tu ga uporabljamo samo za branje oznak.',
            'The addition rule: the number of routes to a point is the sum of the numbers of routes to the point left of it and the point below it. On the grid we see it as an illustration. The reason (a route enters a point from the left or from below) is the topic of a later lesson in the chapter; here we only use it to read the labels.',
        ),
    },
];

const cb1Examples: readonly WorkedExample[] = [
    {
        id: 'cb1-choose',
        title: text('Poti do \\((5,3)\\) kot izbira treh mest izmed osmih', 'Routes to \\((5,3)\\) as a choice of three places out of eight'),
        calculationLatex: '\\binom{8}{3}=\\frac{8\\cdot7\\cdot6}{3\\cdot2\\cdot1}=\\frac{336}{6}',
        resultLatex: '\\binom{8}{3}=56',
        check: text(
            'Isto število pove odčitek, ki ga zapiše kot \\(\\binom85=56\\) (izbiramo mesta za D, ne za G), in \\(\\binom85=\\binom83\\). Obrazec za binomski simbol utemelji naslednja lekcija (štetje izbir).',
            'The readout shows the same number, written as \\(\\binom85=56\\) (it chooses the places for R, not for U), and \\(\\binom85=\\binom83\\). The next lesson (counting choices) justifies the formula for the binomial coefficient.',
        ),
    },
];

const cb1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cb1-predict', order: 1,
        title: text('Ena pot in napoved števila poti', 'One route and a prediction of the number of routes'),
        purpose: text('Napovedati število poti po mreži do točke \\((2,2)\\), preden ga preberemo.', 'Predicting the number of routes on the grid to the point \\((2,2)\\) before reading it.'),
        explanation: text(
            'Iz točke \\((0,0)\\) gremo do cilja \\((2,2)\\), v vsakem koraku pa smemo iti samo za eno polje desno (D) ali gor (G). Na sliki je označena ena taka pot, GGDD: dvakrat gor in dvakrat desno. Preden prebereš odčitek, napovej, koliko je vseh takih poti do \\((2,2)\\).',
            'From the point \\((0,0)\\) we go to the target \\((2,2)\\), and in each step we may move only one cell right (R) or up (U). The picture marks one such route, UURR: twice up and twice right. Before you read the readout, predict how many such routes there are to \\((2,2)\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato v odčitku preberi število poti in označeno pot.', 'Write down your prediction, then read the number of routes and the marked route in the readout.'),
        expectedObservations: [text('Do \\((2,2)\\) vodi \\(6\\) poti, označena pot je prva od njih.', 'There are \\(6\\) routes to \\((2,2)\\), and the marked route is the first of them.')],
        scene: latticeScene('cb1-predict-scene', {a: 2, b: 2},
            'Cilj \\((2,2)\\), izbrana je pot 1 od 6; število poti je \\(6\\).',
            'The target \\((2,2)\\), route 1 of 6 is selected; the number of routes is \\(6\\).'),
    }),
    step({
        id: 'cb1-list', order: 2,
        title: text('Seznam vseh poti', 'The list of all routes'),
        purpose: text('Našteti vse poti do \\((2,2)\\) in videti, da jih ni več ali manj.', 'Listing all routes to \\((2,2)\\) and seeing that there are neither more nor fewer.'),
        explanation: text(
            'Seznam poti pod odčitkom našteje vse: GGDD, GDGD, GDDG, DGGD, DGDG in DDGG. Vsaka je beseda iz štirih črk z dvema D in dvema G, različne besede pa so različne poti. Vseh je \\(6\\), kar odčitek zapiše kot binomski simbol \\(\\binom42=6\\). Napovedi iz prejšnjega koraka primerjaj s tem številom in poskusi sam najti sedmo pot: ne bo je.',
            'The list of routes below the readout names them all: UURR, URUR, URRU, RUUR, RURU and RRUU. Each is a word of four letters with two R and two U, and different words are different routes. There are \\(6\\), which the readout writes as the binomial coefficient \\(\\binom42=6\\). Compare your prediction from the previous step with this number and try to find a seventh route yourself: there is none.',
        ),
        formulaIds: [],
        observationPrompt: text('Preštej poti v seznamu in primerjaj z odčitkom.', 'Count the routes in the list and compare with the readout.'),
        expectedObservations: [text('Seznam ima \\(6\\) poti, odčitek pa pri binomskem simbolu pokaže \\(6\\).', 'The list has \\(6\\) routes and the readout shows \\(6\\) at the binomial coefficient.')],
        scene: latticeScene('cb1-list-scene', {a: 2, b: 2},
            'Cilj \\((2,2)\\) in seznam šestih poti; binomski simbol \\(\\binom42=6\\).',
            'The target \\((2,2)\\) and a list of six routes; the binomial coefficient \\(\\binom42=6\\).'),
    }),
    step({
        id: 'cb1-drag', order: 3,
        title: text('Premikanje cilja', 'Moving the target'),
        purpose: text('Spremljati, kako se število poti spreminja s ciljem.', 'Watching how the number of routes changes with the target.'),
        explanation: text(
            'Cilj je zdaj \\((5,3)\\). Preden preveriš, ugibaj: ali je poti do njega več kot \\(20\\)? Nato preberi odčitek: poti je \\(56\\), zapisano kot \\(\\binom85=56\\), kar je enako \\(\\binom83\\). Premakni cilj (povleci točko ali vpiši koraka \\(a\\) in \\(b\\)) na \\((6,6)\\): odčitek pokaže \\(924\\) poti, ki so vse še narisane (dvanajst korakov). Opazuj tudi, da število poti raste hitreje kot koraka. Premikanje ponazarja posamezne primere, splošno vrednost daje izrek v naslednjih korakih.',
            'The target is now \\((5,3)\\). Before you check, guess: are there more than \\(20\\) routes to it? Then read the readout: there are \\(56\\) routes, written as \\(\\binom85=56\\), which equals \\(\\binom83\\). Move the target (drag the point or type the steps \\(a\\) and \\(b\\)) to \\((6,6)\\): the readout shows \\(924\\) routes, all still drawn (twelve steps). Notice also that the number of routes grows faster than the steps. Moving the target illustrates single cases; the general value comes from the theorem in the next steps.',
        ),
        formulaIds: ['route-count'],
        observationPrompt: text('Preberi število poti pri \\((5,3)\\), nato pri \\((6,6)\\).', 'Read the number of routes at \\((5,3)\\), then at \\((6,6)\\).'),
        expectedObservations: [text('Pri \\((5,3)\\) je poti \\(56\\), pri \\((6,6)\\) jih je \\(924\\).', 'At \\((5,3)\\) there are \\(56\\) routes, at \\((6,6)\\) there are \\(924\\).')],
        scene: latticeScene('cb1-drag-scene', {a: 5, b: 3},
            'Cilj \\((5,3)\\); število poti je \\(56\\).',
            'The target \\((5,3)\\); the number of routes is \\(56\\).'),
    }),
    step({
        id: 'cb1-counts', order: 4,
        title: text('Števila v vseh točkah mreže', 'The numbers at every grid point'),
        purpose: text('Videti, da oznake v točkah mreže pišejo Pascalov trikotnik po diagonalah.', 'Seeing that the labels at the grid points write Pascal\'s triangle along the diagonals.'),
        explanation: text(
            'Vklopljen je prikaz števila poti v točkah mreže: vsaka točka pokaže, koliko poti vodi do nje. Poglej diagonalo točk z vsoto koordinat \\(3\\): števila so \\(1,3,3,1\\), na diagonali z vsoto \\(2\\) pa \\(1,2,1\\). To so vrstice Pascalovega trikotnika. Vsako število je vsota števila levo od točke in števila pod njo: ob cilju \\((5,3)\\) je \\(35+21=56\\), kjer je \\(35\\) pri \\((4,3)\\) in \\(21\\) pri \\((5,2)\\). Preklopi Vsebino na Pascalov trikotnik: stanje pove vrstico \\(8\\), mesto \\(5\\) in \\(56=35+21\\). Napolnjena mreža je ponazoritev pravila seštevanja; razlog zanj pride kasneje.',
            'The display of the number of routes at the grid points is on: each point shows how many routes lead to it. Look at the diagonal of points with coordinate sum \\(3\\): the numbers are \\(1,3,3,1\\), and on the diagonal with sum \\(2\\) they are \\(1,2,1\\). These are rows of Pascal\'s triangle. Each number is the sum of the number left of the point and the number below it: next to the target \\((5,3)\\) we have \\(35+21=56\\), where \\(35\\) is at \\((4,3)\\) and \\(21\\) at \\((5,2)\\). Switch the Content to Pascal\'s triangle: the status gives row \\(8\\), place \\(5\\) and \\(56=35+21\\). The filled grid is an illustration of the addition rule; the reason for it comes later.',
        ),
        formulaIds: ['addition-rule'],
        observationPrompt: text('Preberi števila na diagonali z vsoto \\(3\\) in števili ob cilju, nato še stanje v prikazu Pascalovega trikotnika.', 'Read the numbers on the diagonal with sum \\(3\\) and the numbers next to the target, then the status in the Pascal\'s triangle view.'),
        expectedObservations: [text('Diagonala pokaže \\(1,3,3,1\\); ob cilju je \\(35+21=56\\), v trikotniku vrstica \\(8\\), mesto \\(5\\).', 'The diagonal shows \\(1,3,3,1\\); next to the target \\(35+21=56\\), in the triangle row \\(8\\), place \\(5\\).')],
        scene: latticeScene('cb1-counts-scene', {a: 5, b: 3, view: 'paths', showCounts: true},
            'Cilj \\((5,3)\\) s števili poti v vseh točkah mreže: v \\((4,3)\\) je \\(35\\), v \\((5,2)\\) je \\(21\\), v cilju \\(56\\).',
            'The target \\((5,3)\\) with the numbers of routes at all grid points: \\(35\\) at \\((4,3)\\), \\(21\\) at \\((5,2)\\), \\(56\\) at the target.'),
    }),
    step({
        id: 'cb1-choose', order: 5,
        title: text('Pot je izbira mest', 'A route is a choice of places'),
        purpose: text('Utemeljiti, da je število poti binomski simbol.', 'Arguing that the number of routes is a binomial coefficient.'),
        explanation: text(
            'Argument: pot do \\((5,3)\\) ima \\(8\\) korakov, od tega \\(5\\) korakov D in \\(3\\) korake G. Ko povemo, na katerih treh od osmih mest so koraki G, so preostala mesta D in pot je določena. Obratno vsaka pot daje eno tako izbiro mest. Različne izbire dajo različne poti, zato je poti natanko toliko kot izbir treh mest izmed osmih, to je \\(\\binom83=56\\). Isto velja za vsak cilj: poti do \\((a,b)\\) je \\(\\binom{a+b}{a}\\). Slika ponazarja en primer, utemeljitev je ujemanje poti z izbirami mest.',
            'Argument: a route to \\((5,3)\\) has \\(8\\) steps, \\(5\\) of them R and \\(3\\) of them U. When we say on which three of the eight places the U steps are, the remaining places are R and the route is determined. Conversely every route gives one such choice of places. Different choices give different routes, so there are exactly as many routes as choices of three places out of eight, that is \\(\\binom83=56\\). The same holds for every target: the number of routes to \\((a,b)\\) is \\(\\binom{a+b}{a}\\). The picture illustrates one case; the argument is the match between routes and choices of places.',
        ),
        formulaIds: ['route-count'],
        workedExampleId: 'cb1-choose',
        observationPrompt: text('Primerjaj izračun \\(\\binom83\\) z odčitkom pri cilju \\((5,3)\\).', 'Compare the computation of \\(\\binom83\\) with the readout at the target \\((5,3)\\).'),
        expectedObservations: [text('Račun in odčitek dasta \\(56\\); odčitek zapiše \\(\\binom85\\), ki je enako \\(\\binom83\\).', 'The computation and the readout both give \\(56\\); the readout writes \\(\\binom85\\), which equals \\(\\binom83\\).')],
        scene: latticeScene('cb1-choose-scene', {a: 5, b: 3},
            'Cilj \\((5,3)\\); število poti je \\(56\\) in binomski simbol \\(\\binom85=56\\).',
            'The target \\((5,3)\\); the number of routes is \\(56\\) and the binomial coefficient \\(\\binom85=56\\).'),
    }),
    step({
        id: 'cb1-cap', order: 6,
        title: text('Ko poti ne narišemo več', 'When the routes are no longer drawn'),
        purpose: text('Brati število poti tudi tam, kjer jih ni mogoče narisati.', 'Reading the number of routes where they cannot be drawn.'),
        explanation: text(
            'Poti narišemo in naštejemo samo do \\(12\\) korakov; to je zgornja meja, ki jo graf pove v stanju. Cilj je zdaj \\((10,10)\\), torej \\(20\\) korakov, zato graf ne nariše nobene poti in pokaže samo število: \\(184\\,756\\). Napoved, preden preveriš: vsak korak dodan v obeh smereh pomnoži število poti približno s štirimi. Nastavi še \\((20,20)\\), največji cilj, ki ga graf dovoli: odčitek pokaže \\(137\\,846\\,528\\,820\\) poti. Število je še vedno točno, ker izrek velja tudi tam, kjer slike ni.',
            'The routes are drawn and listed only up to \\(12\\) steps; this is the limit, and the graph says so in its status. The target is now \\((10,10)\\), that is \\(20\\) steps, so the graph draws no routes and shows only the number: \\(184\\,756\\). A prediction before you check: each extra step in both directions multiplies the number of routes by about four. Now set \\((20,20)\\), the largest target the graph allows: the readout shows \\(137\\,846\\,528\\,820\\) routes. The number is still exact, because the theorem holds where there is no picture.',
        ),
        formulaIds: ['route-count'],
        observationPrompt: text('Preberi stanje pri \\((10,10)\\) in število poti pri \\((20,20)\\).', 'Read the status at \\((10,10)\\) and the number of routes at \\((20,20)\\).'),
        expectedObservations: [text('Pri \\((10,10)\\) je \\(184\\,756\\) poti in graf pove, da jih ne riše; pri \\((20,20)\\) jih je \\(137\\,846\\,528\\,820\\).', 'At \\((10,10)\\) there are \\(184\\,756\\) routes and the graph says it does not draw them; at \\((20,20)\\) there are \\(137\\,846\\,528\\,820\\).')],
        scene: latticeScene('cb1-cap-scene', {a: 10, b: 10},
            'Cilj \\((10,10)\\); število poti je \\(184\\,756\\), poti niso narisane.',
            'The target \\((10,10)\\); the number of routes is \\(184\\,756\\), no routes are drawn.'),
    }),
    step({
        id: 'cb1-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Raziskati, kako se število poti odziva na cilj.', 'Exploring how the number of routes responds to the target.'),
        explanation: text(
            'Spreminjaj koraka \\(a\\) in \\(b\\) od \\(0\\) do \\(20\\) ter vklopi in izklopi oznake števila poti. Če je \\(a\\) ali \\(b\\) enak \\(0\\), je pot ena. Zamenjaj koraka: pri \\((3,5)\\) je poti spet \\(56\\), ker je \\(\\binom83=\\binom85\\). Poišči cilj, pri katerem se poti neha risati. Vse to so primeri, ponazoritve; utemeljitev števila poti je ujemanje poti z izbirami mest iz petega koraka.',
            'Change the steps \\(a\\) and \\(b\\) from \\(0\\) to \\(20\\) and switch the labels with the numbers of routes on and off. If \\(a\\) or \\(b\\) equals \\(0\\), there is one route. Swap the steps: at \\((3,5)\\) there are \\(56\\) routes again, because \\(\\binom83=\\binom85\\). Find the target where the routes stop being drawn. All of these are examples, illustrations; the justification of the number of routes is the match between routes and choices of places from step 5.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči cilj z natanko eno potjo in par ciljev z enakim številom poti.', 'Find a target with exactly one route and a pair of targets with the same number of routes.'),
        expectedObservations: [text('Cilji \\((a,0)\\) in \\((0,b)\\) imajo eno pot, cilja \\((a,b)\\) in \\((b,a)\\) imata enako število poti.', 'The targets \\((a,0)\\) and \\((0,b)\\) have one route, and the targets \\((a,b)\\) and \\((b,a)\\) have the same number of routes.')],
        scene: latticeScene('cb1-explore-scene', {a: 5, b: 3},
            'Začetni primer: cilj \\((5,3)\\), \\(56\\) poti.',
            'The starting case: the target \\((5,3)\\), \\(56\\) routes.'),
    }),
];

// ---- CB2 -------------------------------------------------------------------------------------------------------------------------

const cb2Formulas: readonly FormulaBlock[] = [
    {
        id: 'product-rule',
        latex: 'N=m_1\\cdot m_2\\cdots m_k',
        notation: text(
            '\\(m_i\\) je število možnosti pri \\(i\\)-ti izbiri, če ne glede na prejšnje izbire vedno enako; \\(N\\) je število vseh izbir.',
            '\\(m_i\\) is the number of options at the \\(i\\)-th choice, the same whatever the earlier choices were; \\(N\\) is the number of all choices.',
        ),
        explanation: text(
            'Osnovni izrek kombinatorike: če ima prva izbira \\(m_1\\) možnosti in ima za vsako od njih druga izbira \\(m_2\\) možnosti, je skupaj \\(m_1\\cdot m_2\\) možnosti; podobno za več izbir. Argument: kombinatorično drevo ima \\(m_1\\) vej iz korena in iz vsake še \\(m_2\\) vej, listov pa je zato \\(m_1\\cdot m_2\\).',
            'The fundamental theorem of counting (the product rule): if the first choice has \\(m_1\\) options and for each of them the second has \\(m_2\\) options, there are \\(m_1\\cdot m_2\\) options together; likewise for more choices. Argument: the counting tree has \\(m_1\\) branches from the root and \\(m_2\\) more from each, so there are \\(m_1\\cdot m_2\\) leaves.',
        ),
    },
    {
        id: 'choice-counts',
        latex: 'n!,\\quad V_n^k=\\frac{n!}{(n-k)!},\\quad n^k,\\quad \\binom nk=\\frac{V_n^k}{k!}',
        notation: text(
            '\\(n!\\) je število permutacij \\(n\\) predmetov, \\(V_n^k\\) število variacij \\(k\\) od \\(n\\), \\(n^k\\) število variacij s ponavljanjem in \\(\\binom nk\\) število kombinacij.',
            '\\(n!\\) is the number of permutations of \\(n\\) items, \\(V_n^k\\) the number of variations of \\(k\\) out of \\(n\\), \\(n^k\\) the number of variations with repetition and \\(\\binom nk\\) the number of combinations.',
        ),
        explanation: text(
            'Definicije: permutacija je razporeditev vseh \\(n\\) predmetov, variacija je izbira \\(k\\) od \\(n\\) predmetov z vrstnim redom, kombinacija je izbira brez vrstnega reda. Po osnovnem izreku je variacij brez ponavljanja \\(n(n-1)\\cdots(n-k+1)\\), s ponavljanjem \\(n^k\\), permutacij \\(n!\\), kombinacij pa \\(V_n^k/k!\\), ker vsaka kombinacija pomeni natanko \\(k!\\) variacij.',
            'Definitions: a permutation is an arrangement of all \\(n\\) items, a variation is a choice of \\(k\\) out of \\(n\\) items with order, a combination is a choice without order. By the product rule the variations without repetition number \\(n(n-1)\\cdots(n-k+1)\\), with repetition \\(n^k\\), the permutations \\(n!\\), and the combinations \\(V_n^k/k!\\), because each combination stands for exactly \\(k!\\) variations.',
        ),
    },
    {
        id: 'repeated-letters',
        latex: 'P=\\frac{n!}{n_1!\\,n_2!\\cdots n_r!}',
        notation: text(
            '\\(n\\) je število vseh črk, \\(n_1,\\dots,n_r\\) so števila enakih črk po vrstah; permutacije s ponavljanjem.',
            '\\(n\\) is the number of all letters, \\(n_1,\\dots,n_r\\) are the numbers of equal letters by kind; permutations with repetition.',
        ),
        explanation: text(
            'Argument: če bi bile vse črke različne, bi bilo razporeditev \\(n!\\). Med seboj enakih \\(n_i\\) črk lahko zamenjamo na \\(n_i!\\) načinov, ne da bi se beseda spremenila, zato vsako besedo štejemo \\(n_1!\\,n_2!\\cdots n_r!\\)-krat. Delimo in dobimo obrazec.',
            'Argument: if all letters were different there would be \\(n!\\) arrangements. The \\(n_i\\) equal letters of a kind can be swapped in \\(n_i!\\) ways without changing the word, so each word is counted \\(n_1!\\,n_2!\\cdots n_r!\\) times. Dividing gives the formula.',
        ),
    },
];

const cb2Examples: readonly WorkedExample[] = [
    {
        id: 'cb2-combination',
        title: text('Kombinacije \\(3\\) od \\(6\\)', 'Combinations of \\(3\\) out of \\(6\\)'),
        calculationLatex: 'V_6^3=6\\cdot5\\cdot4=120,\\qquad 3!=6',
        resultLatex: '\\binom63=\\frac{120}{6}=20',
        check: text(
            'Odčitek pokaže iste številke: variacij \\(120\\), vrstnih redov ene kombinacije \\(3!=6\\) in količnik \\(120/6=20\\).',
            'The readout shows the same numbers: \\(120\\) variations, \\(3!=6\\) orderings of one combination, and the quotient \\(120/6=20\\).',
        ),
    },
    {
        id: 'cb2-mississippi',
        title: text('Razporeditve črk besede MISSISSIPPI', 'Arrangements of the letters of the word MISSISSIPPI'),
        calculationLatex: '\\frac{11!}{1!\\,4!\\,4!\\,2!}=\\frac{39\\,916\\,800}{1\\cdot24\\cdot24\\cdot2}=\\frac{39\\,916\\,800}{1152}',
        resultLatex: '\\frac{11!}{1!\\,4!\\,4!\\,2!}=34\\,650',
        check: text(
            'Graf poišče iste vrednosti: \\(11!=39\\,916\\,800\\) bi bilo razporeditev, če bi bile vse črke različne, in \\(34\\,650\\) jih je, ker so enake črke zamenljive.',
            'The graph finds the same values: \\(11!=39\\,916\\,800\\) would be the arrangements if all letters were different, and there are \\(34\\,650\\) because equal letters are interchangeable.',
        ),
    },
];

const cb2Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cb2-tree', order: 1,
        title: text('Drevo izbir', 'A tree of choices'),
        purpose: text('Napovedati število listov drevesa dveh zaporednih izbir.', 'Predicting the number of leaves of a tree of two successive choices.'),
        explanation: text(
            'Imamo tri predmete \\(1,2,3\\) in izberemo dva po vrstnem redu, brez ponavljanja. Kombinatorično drevo ima v korenu eno vejo za vsak predmet prve izbire, iz vsake veje pa še veje za predmete, ki so ostali. List drevesa je ena cela izbira. Preden prešteješ liste, napovej njihovo število.',
            'We have three items \\(1,2,3\\) and choose two in order, without repetition. The counting tree has a branch at the root for each item of the first choice, and from each branch further branches for the items that remain. A leaf of the tree is one complete choice. Before you count the leaves, predict their number.',
        ),
        formulaIds: [],
        observationPrompt: text('Preštej liste drevesa in preberi število listov v odčitku.', 'Count the leaves of the tree and read the number of leaves in the readout.'),
        expectedObservations: [text('Drevo ima \\(6\\) listov, odčitek pokaže \\(3\\cdot2=6\\).', 'The tree has \\(6\\) leaves and the readout shows \\(3\\cdot2=6\\).')],
        scene: countingScene('cb2-tree-scene', {view: 'choices', n: 3, k: 2, ordered: true, repetition: false},
            'Drevo variacij \\(2\\) od \\(3\\) brez ponavljanja z \\(6\\) listi.',
            'The tree of variations of \\(2\\) out of \\(3\\) without repetition, with \\(6\\) leaves.'),
    }),
    step({
        id: 'cb2-product', order: 2,
        title: text('Osnovni izrek kombinatorike', 'The product rule'),
        purpose: text('Spoznati, da se možnosti pomnožijo, in izračunati število listov brez štetja.', 'Seeing that options multiply, and computing the number of leaves without counting.'),
        explanation: text(
            'Argument na majhnem primeru: v prejšnjem drevesu so iz korena tri veje in iz vsake še dve, zato je listov \\(3\\cdot2=6\\). Enako velja za vsako drevo, v katerem ima vsaka izbira ne glede na prejšnje isto število možnosti: število listov je produkt števil možnosti, to je osnovni izrek kombinatorike. Zdaj so trije predmeti izbrani po vrstnem redu iz štirih: napovej število listov iz produkta \\(4\\cdot3\\cdot2\\) in preveri z odčitkom. Drevo je argument za osnovni izrek na majhnem primeru, tabela, ki jo bomo videli pri večjih številih, je ponazoritev.',
            'Argument on a small case: in the previous tree there are three branches from the root and two more from each, so there are \\(3\\cdot2=6\\) leaves. The same holds for every tree in which each choice has the same number of options whatever the earlier choices were: the number of leaves is the product of the numbers of options, which is the product rule. Now three items are chosen in order out of four: predict the number of leaves from the product \\(4\\cdot3\\cdot2\\) and check it with the readout. The tree is an argument for the product rule on a small case; the table that we will see for larger numbers is an illustration.',
        ),
        formulaIds: ['product-rule'],
        observationPrompt: text('Preberi produkt in število listov v odčitku.', 'Read the product and the number of leaves in the readout.'),
        expectedObservations: [text('Produkt je \\(4\\cdot3\\cdot2=24\\) in drevo ima \\(24\\) listov.', 'The product is \\(4\\cdot3\\cdot2=24\\) and the tree has \\(24\\) leaves.')],
        scene: countingScene('cb2-product-scene', {view: 'choices', n: 4, k: 3, ordered: true, repetition: false},
            'Drevo variacij \\(3\\) od \\(4\\) brez ponavljanja z \\(24\\) listi; produkt \\(4\\cdot3\\cdot2=24\\).',
            'The tree of variations of \\(3\\) out of \\(4\\) without repetition, with \\(24\\) leaves; the product \\(4\\cdot3\\cdot2=24\\).'),
    }),
    step({
        id: 'cb2-permutations', order: 3,
        title: text('Vrstni red šteje: permutacije', 'Order matters: permutations'),
        purpose: text('Spoznati permutacije kot celotno drevo vseh razporeditev.', 'Meeting permutations as the full tree of all arrangements.'),
        explanation: text(
            'Če razporedimo vseh \\(n\\) predmetov, je \\(k=n\\) in izbir je \\(n\\cdot(n-1)\\cdots2\\cdot1=n!\\). To so permutacije. Za štiri predmete je drevo celo: \\(4\\cdot3\\cdot2\\cdot1=24\\) listov, kar je \\(4!\\) (zadnja izbira nima izbire, njen faktor je \\(1\\)). Napovej, koliko je razporeditev pet različnih knjig na polici, nato nastavi \\(n\\) in \\(k\\) na \\(5\\): odčitek pokaže \\(120=5!\\). Drevo bi imelo več kot \\(64\\) listov, zato graf namesto njega pokaže tabelo; število ostaja natančno.',
            'If we arrange all \\(n\\) items then \\(k=n\\) and the number of choices is \\(n\\cdot(n-1)\\cdots2\\cdot1=n!\\). These are permutations. For four items the tree is complete: \\(4\\cdot3\\cdot2\\cdot1=24\\) leaves, which is \\(4!\\) (the last choice has no freedom, its factor is \\(1\\)). Predict how many arrangements five different books on a shelf have, then set \\(n\\) and \\(k\\) to \\(5\\): the readout shows \\(120=5!\\). The tree would have more than \\(64\\) leaves, so the graph shows a table instead; the number stays exact.',
        ),
        formulaIds: ['choice-counts'],
        observationPrompt: text('Preberi število listov pri \\(n=k=4\\), nato število izbir pri \\(n=k=5\\).', 'Read the number of leaves for \\(n=k=4\\), then the number of choices for \\(n=k=5\\).'),
        expectedObservations: [text('Za štiri predmete je \\(24\\) razporeditev, za pet knjig \\(120\\).', 'Four items have \\(24\\) arrangements, five books have \\(120\\).')],
        scene: countingScene('cb2-permutations-scene', {view: 'choices', n: 4, k: 4, ordered: true, repetition: false},
            'Drevo vseh razporeditev štirih predmetov, \\(24\\) listov, produkt \\(4\\cdot3\\cdot2\\cdot1=24\\).',
            'The tree of all arrangements of four items, \\(24\\) leaves, the product \\(4\\cdot3\\cdot2\\cdot1=24\\).'),
    }),
    step({
        id: 'cb2-variations', order: 4,
        title: text('Izberemo \\(k\\) od \\(n\\): variacije', 'Choosing \\(k\\) of \\(n\\): variations'),
        purpose: text('Primerjati variacije brez ponavljanja in s ponavljanjem.', 'Comparing variations without and with repetition.'),
        explanation: text(
            'Izberemo tri od šestih predmetov, vrstni red šteje. Brez ponavljanja je izbir po osnovnem izreku \\(6\\cdot5\\cdot4=120=V_6^3\\); drevo bi imelo več kot \\(64\\) listov, zato je prikazana tabela. Napovej, kaj se zgodi s številom, če se predmeti smejo ponavljati, nato vklopi stikalo »Predmeti se lahko ponavljajo«: pri vsaki izbiri je spet vseh šest možnosti, zato je \\(6\\cdot6\\cdot6=216=6^3\\). Drevo narišemo samo do \\(64\\) listov: za štiri predmete in tri izbire s ponavljanjem je to ravno \\(4\\cdot4\\cdot4=64\\). Tabela je ponazoritev števil, ki jih daje osnovni izrek.',
            'We choose three out of six items and order matters. Without repetition the product rule gives \\(6\\cdot5\\cdot4=120=V_6^3\\) choices; the tree would have more than \\(64\\) leaves, so a table is shown. Predict what happens to the number if the items may repeat, then switch on "Items may repeat": at every choice all six options are available again, so \\(6\\cdot6\\cdot6=216=6^3\\). The tree is drawn only up to \\(64\\) leaves: for four items and three choices with repetition that is exactly \\(4\\cdot4\\cdot4=64\\). The table is an illustration of the numbers the product rule gives.',
        ),
        formulaIds: ['choice-counts'],
        observationPrompt: text('Preberi število izbir brez ponavljanja in s ponavljanjem ter produkt v odčitku.', 'Read the number of choices without and with repetition and the product in the readout.'),
        expectedObservations: [text('Brez ponavljanja je \\(120\\), s ponavljanjem \\(216\\); pri \\(n=4\\), \\(k=3\\) s ponavljanjem je \\(64\\) listov.', 'Without repetition there are \\(120\\), with repetition \\(216\\); for \\(n=4\\), \\(k=3\\) with repetition there are \\(64\\) leaves.')],
        scene: countingScene('cb2-variations-scene', {view: 'choices', n: 6, k: 3, ordered: true, repetition: false},
            'Variacije \\(3\\) od \\(6\\) brez ponavljanja: \\(120\\) izbir; tabela pokaže tudi \\(216\\) s ponavljanjem.',
            'Variations of \\(3\\) out of \\(6\\) without repetition: \\(120\\) choices; the table also shows \\(216\\) with repetition.'),
    }),
    step({
        id: 'cb2-combinations', order: 5,
        title: text('Vrstni red ne šteje: kombinacije', 'Order does not matter: combinations'),
        purpose: text('Utemeljiti, da je število kombinacij število variacij, deljeno s \\(k!\\).', 'Arguing that the number of combinations is the number of variations divided by \\(k!\\).'),
        explanation: text(
            'Zdaj vrstni red ne šteje: izbira \\(\\{1,2,3\\}\\) je ista kot \\(\\{3,1,2\\}\\). Napovej, kolikokrat manj je kombinacij kot variacij. Argument: tri izbrane predmete lahko uredimo na \\(3!=6\\) načinov, torej vsaki kombinaciji ustreza natanko \\(6\\) variacij in je kombinacij \\(120/6=20\\). Na sliki so prve tri kombinacije, vsaka s svojimi šestimi vrstnimi redi, in napis z \\(20\\) skupinami in računom \\(120/6\\). Splošno je \\(\\binom nk=V_n^k/k!\\). Slika prikazuje samo tri skupine izmed dvajsetih, zato je ponazoritev; argument je, da \\(k\\) različnih predmetov lahko uredimo na \\(k!\\) načinov.',
            'Now order does not matter: the choice \\(\\{1,2,3\\}\\) is the same as \\(\\{3,1,2\\}\\). Predict how many times fewer combinations there are than variations. Argument: three chosen items can be ordered in \\(3!=6\\) ways, so each combination stands for exactly \\(6\\) variations and there are \\(120/6=20\\) combinations. The picture shows the first three combinations, each with its six orderings, and the caption with \\(20\\) groups and the computation \\(120/6\\). In general \\(\\binom nk=V_n^k/k!\\). The picture shows only three groups out of twenty, so it is an illustration; the argument is that \\(k\\) different items can be ordered in \\(k!\\) ways.',
        ),
        formulaIds: ['choice-counts'],
        workedExampleId: 'cb2-combination',
        observationPrompt: text('Preberi vrstne rede ene kombinacije in količnik v odčitku ter preštej vrstne rede v prvi skupini na sliki.', 'Read the orderings of one combination and the quotient in the readout, and count the orderings in the first group in the picture.'),
        expectedObservations: [text('Vsaka skupina ima \\(6\\) vrstnih redov, količnik je \\(120/6=20\\).', 'Each group has \\(6\\) orderings, and the quotient is \\(120/6=20\\).')],
        scene: countingScene('cb2-combinations-scene', {view: 'choices', n: 6, k: 3, ordered: false, repetition: false},
            'Kombinacije \\(3\\) od \\(6\\): \\(20\\) izbir, \\(3!=6\\) vrstnih redov ene kombinacije, tri skupine na sliki.',
            'Combinations of \\(3\\) out of \\(6\\): \\(20\\) choices, \\(3!=6\\) orderings of one combination, three groups in the picture.'),
    }),
    step({
        id: 'cb2-repetition', order: 6,
        title: text('Permutacije s ponavljanjem', 'Permutations with repetition'),
        purpose: text('Prešteti razporeditve črk, med katerimi so enake.', 'Counting arrangements of letters some of which are equal.'),
        explanation: text(
            'Črke besede MISSISSIPPI: ena črka M, štiri črke I, štiri črke S in dve črki P, skupaj \\(11\\). Če bi bile vse različne, bi bilo razporeditev \\(11!=39\\,916\\,800\\). Napovej, ali je pravo število večje ali manjše od tega in koliko. Enake črke so zamenljive, zato vsako besedo štejemo \\(1!\\,4!\\,4!\\,2!=1152\\)-krat, razporeditev pa je \\(\\dfrac{11!}{1!\\,4!\\,4!\\,2!}=34\\,650\\). To so permutacije s ponavljanjem. Argument je delitev s številom zamenjav enakih črk, črke na sliki so ponazoritev.',
            'The letters of the word MISSISSIPPI: one letter M, four letters I, four letters S and two letters P, \\(11\\) together. If all were different there would be \\(11!=39\\,916\\,800\\) arrangements. Predict whether the true number is larger or smaller than this, and by how much. Equal letters are interchangeable, so each word is counted \\(1!\\,4!\\,4!\\,2!=1152\\) times, and the arrangements number \\(\\dfrac{11!}{1!\\,4!\\,4!\\,2!}=34\\,650\\). These are permutations with repetition. The argument is the division by the number of swaps of equal letters; the letters in the picture are an illustration.',
        ),
        formulaIds: ['repeated-letters'],
        workedExampleId: 'cb2-mississippi',
        observationPrompt: text('Preberi število vseh črk, razporeditve in razporeditve, če bi bile vse črke različne.', 'Read the number of all letters, the arrangements, and the arrangements if all letters were different.'),
        expectedObservations: [text('Črk je \\(11\\), razporeditev \\(34\\,650\\), če bi bile vse različne pa \\(39\\,916\\,800\\).', 'There are \\(11\\) letters, \\(34\\,650\\) arrangements, and \\(39\\,916\\,800\\) if all were different.')],
        scene: countingScene('cb2-repetition-scene', {view: 'multiset', counts: MISSISSIPPI},
            'Črke besede MISSISSIPPI (M 1, I 4, S 4, P 2): \\(11\\) črk, \\(34\\,650\\) razporeditev.',
            'The letters of the word MISSISSIPPI (M 1, I 4, S 4, P 2): \\(11\\) letters, \\(34\\,650\\) arrangements.'),
    }),
    step({
        id: 'cb2-explore', order: 7,
        title: text('Prosto raziskovanje: ali vrstni red šteje?', 'Free exploration: does order matter?'),
        purpose: text('Sam izbrati pravo vrsto izbire s stikaloma za vrstni red in ponavljanje.', 'Choosing the right kind of choice yourself with the switches for order and repetition.'),
        explanation: text(
            'Spreminjaj \\(n\\) in \\(k\\) ter stikali »Vrstni red šteje« in »Predmeti se lahko ponavljajo«. Majhna tabela odločitev: vrstni red šteje in ponavljanja ni, so variacije (pri \\(k=n\\) permutacije); vrstni red šteje in ponavljanje je, so variacije s ponavljanjem; vrstni red ne šteje in ponavljanja ni, so kombinacije. Četrto vrsto, kombinacije s ponavljanjem, tabela v grafu tudi pokaže, a je ta lekcija ne izpelje. Primerjaj števila: drevesa so ponazoritve majhnih primerov, splošne obrazce dajeta osnovni izrek in delitev s \\(k!\\). Brez ponavljanja \\(k\\) ne sme presegati \\(n\\).',
            'Change \\(n\\) and \\(k\\) and the switches "Order matters" and "Items may repeat". The small decision table: order matters and no repetition, variations (permutations when \\(k=n\\)); order matters and repetition, variations with repetition; order does not matter and no repetition, combinations. The graph\'s table also shows a fourth kind, combinations with repetition, but this lesson does not derive it. Compare the numbers: the trees are illustrations of small cases, the general formulas come from the product rule and the division by \\(k!\\). Without repetition \\(k\\) must not exceed \\(n\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči \\(n\\) in \\(k\\), pri katerih so kombinacije in variacije enake, in pri katerih se najbolj razlikujejo.', 'Find \\(n\\) and \\(k\\) for which combinations and variations are equal, and for which they differ most.'),
        expectedObservations: [text('Pri \\(k=1\\) (ali \\(k=0\\)) je število kombinacij enako številu variacij, sicer je variacij \\(k!\\)-krat več.', 'For \\(k=1\\) (or \\(k=0\\)) the number of combinations equals the number of variations; otherwise there are \\(k!\\) times more variations.')],
        scene: countingScene('cb2-explore-scene', {view: 'choices', n: 6, k: 3, ordered: true, repetition: false},
            'Začetni primer: variacije \\(3\\) od \\(6\\) brez ponavljanja, \\(120\\) izbir.',
            'The starting case: variations of \\(3\\) out of \\(6\\) without repetition, \\(120\\) choices.'),
    }),
];

// ---- CB3 -------------------------------------------------------------------------------------------------------------------------

const cb3Formulas: readonly FormulaBlock[] = [
    {
        id: 'last-step-split',
        latex: 'N(a,b)=N(a-1,b)+N(a,b-1)',
        notation: text(
            '\\(N(a-1,b)\\) je število poti do točke levo od cilja (zadnji korak D), \\(N(a,b-1)\\) do točke pod ciljem (zadnji korak G); velja za \\(a,b\\ge1\\).',
            '\\(N(a-1,b)\\) is the number of routes to the point left of the target (last step R), \\(N(a,b-1)\\) to the point below it (last step U); it holds for \\(a,b\\ge1\\).',
        ),
        explanation: text(
            'Poti do \\((a,b)\\), ki se končajo z D, in poti, ki se končajo z G, razdelijo vse poti: vsaka pot je v natanko eni skupini. Če zadnji korak odstranimo, dobimo pot do sosednje točke, in obratno ima vsaka pot do sosednje točke natanko en podaljšek s tem korakom. Zato je v obeh skupinah skupaj natanko toliko poti kot do obeh sosednjih točk skupaj.',
            'The routes to \\((a,b)\\) that end with R and the routes that end with U split all routes: each route is in exactly one group. Removing the last step gives a route to a neighbouring point, and conversely every route to a neighbouring point has exactly one extension by that step. So the two groups together are exactly as many as the routes to the two neighbouring points together.',
        ),
    },
    {
        id: 'pascal-identity',
        latex: '\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}',
        notation: text(
            '\\(\\binom nk\\) je vnos Pascalovega trikotnika v vrstici \\(n\\) na mestu \\(k\\) (mesta štejemo od \\(0\\)); identiteta velja za \\(1\\le k\\le n-1\\).',
            '\\(\\binom nk\\) is the entry of Pascal\'s triangle in row \\(n\\) at place \\(k\\) (places are counted from \\(0\\)); the identity holds for \\(1\\le k\\le n-1\\).',
        ),
        explanation: text(
            'Pascalova identiteta: \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\) za \\(1\\le k\\le n-1\\). Vsak vnos, ki ni na robu, je vsota dveh vnosov nad njim. Robna vnosa \\(\\binom n0\\) in \\(\\binom nn\\) sta enaka \\(1\\) in imata le enega starša. Utemeljitev je razdelitev poti po zadnjem koraku, trikotnik pa identiteto ponazarja.',
            'Pascal\'s identity: \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\) for \\(1\\le k\\le n-1\\). Every entry that is not on the edge is the sum of the two entries above it. The edge entries \\(\\binom n0\\) and \\(\\binom nn\\) equal \\(1\\) and have only one parent. The justification is the split of the routes by their last step, and the triangle illustrates the identity.',
        ),
    },
    {
        id: 'binomial-symmetry',
        latex: '\\binom nk=\\binom n{n-k}',
        notation: text(
            'Vnosa v isti vrstici, enako oddaljena od obeh robov trikotnika, sta enaka.',
            'Two entries of the same row that are equally far from the two edges of the triangle are equal.',
        ),
        explanation: text(
            'Zamenjava vseh korakov D in G preslika poti do \\((a,b)\\) na poti do \\((b,a)\\) in je obratljiva, zato je poti do obeh ciljev enako mnogo: \\(\\binom{a+b}{a}=\\binom{a+b}{b}\\).',
            'Swapping every step R and U maps the routes to \\((a,b)\\) onto the routes to \\((b,a)\\) and can be undone, so there are equally many routes to both targets: \\(\\binom{a+b}{a}=\\binom{a+b}{b}\\).',
        ),
    },
];

const cb3Examples: readonly WorkedExample[] = [
    {
        id: 'cb3-identity',
        title: text('Pascalova identiteta za \\(n=7\\), \\(k=3\\)', 'Pascal\'s identity for \\(n=7\\), \\(k=3\\)'),
        calculationLatex: '\\binom73=\\binom62+\\binom63=15+20',
        resultLatex: '\\binom73=35',
        check: text(
            'Odčitek trikotnika pri cilju \\((4,3)\\) zapiše isto vsoto z vnosom \\(\\binom74\\): \\(35=20+15\\); gre za ista števila, ker je \\(\\binom73=\\binom74\\) in \\(\\binom62=\\binom64\\).',
            'The triangle readout at the target \\((4,3)\\) writes the same sum with the entry \\(\\binom74\\): \\(35=20+15\\); these are the same numbers, because \\(\\binom73=\\binom74\\) and \\(\\binom62=\\binom64\\).',
        ),
    },
];

const cb3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cb3-predict', order: 1,
        title: text('Zadnji korak poti', 'The last step of a route'),
        purpose: text('Napovedati, koliko poti do \\((4,3)\\) se konča z D in koliko z G.', 'Predicting how many routes to \\((4,3)\\) end with R and how many with U.'),
        explanation: text(
            'Cilj je \\((4,3)\\): vsaka pot do njega ima \\(7\\) korakov, štiri D in tri G, zadnji korak pa je D ali G. Poti zato lahko uvrstimo v skupino tistih, ki se končajo z D, in skupino tistih, ki se končajo z G. Napovej, v kateri skupini je poti več in koliko jih je v vsaki. Nato v polje »Koraki desno (a)« vpiši \\(4\\), v polje »Koraki gor (b)« pa \\(3\\), in preberi odčitka.',
            'The target is \\((4,3)\\): every route to it has \\(7\\) steps, four R and three U, and the last step is R or U. So we can put the routes into the group of those that end with R and the group of those that end with U. Predict which group has more routes and how many routes each has. Then enter \\(4\\) in the field "Steps right (a)" and \\(3\\) in the field "Steps up (b)" and read the readouts.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, vpiši \\(a=4\\), \\(b=3\\) in preberi odčitka za zadnji korak D in zadnji korak G ter njuno vsoto.', 'Write down your prediction, enter \\(a=4\\), \\(b=3\\) and read the readouts for the last step R and the last step U and their sum.'),
        expectedObservations: [text('Z D se konča \\(20\\) poti, z G jih \\(15\\); vsota \\(20+15=35\\) je število vseh poti do \\((4,3)\\).', 'Of the routes, \\(20\\) end with R and \\(15\\) end with U; the sum \\(20+15=35\\) is the number of all routes to \\((4,3)\\).')],
        scene: latticeScene('cb3-predict-scene', {a: 2, b: 2},
            'Začetni cilj \\((2,2)\\), \\(6\\) poti; odčitka za zadnji korak kažeta \\(3\\) in \\(3\\); poti še niso ločene po barvi.',
            'The starting target \\((2,2)\\), \\(6\\) routes; the readouts for the last step show \\(3\\) and \\(3\\); the routes are not yet split by colour.'),
    }),
    step({
        id: 'cb3-partition', order: 2,
        title: text('Skupini in sosednji točki', 'The two groups and the two neighbouring points'),
        purpose: text('Utemeljiti, da skupini razdelita vse poti, in ugotoviti, katere poti ju sestavljajo.', 'Arguing that the two groups split all routes, and finding which routes make them up.'),
        explanation: text(
            'Stikalo za ločitev poti po zadnjem koraku je vklopljeno: poti z zadnjim korakom D so narisane s polno črto, poti z zadnjim korakom G s črtkano. To je argument, ne le slika. Vsaka pot ima natanko en zadnji korak, zato je v natanko eni skupini: skupini se ne sekata in skupaj obsegata vse poti, zato se njuni števili seštejeta v število vseh poti. Če iz poti odstranimo zadnji korak, dobimo krajšo pot, ki vodi do ene od točk ob cilju, in obratno: vsako pot do take točke podaljšamo z natanko enim korakom. Do katere točke vodijo skrajšane poti skupine D in do katere skupine G? Vpiši ti dve točki v polji \\(a\\) in \\(b\\) in preden preveriš, napovej število poti do vsake od njiju.',
            'The switch that splits the routes by their last step is on: routes with the last step R are drawn with a solid line, routes with the last step U with a dashed line. This is an argument, not only a picture. Every route has exactly one last step, so it is in exactly one group: the groups do not overlap and together they contain all routes, so their numbers add up to the number of all routes. Removing the last step from a route gives a shorter route to one of the points next to the target, and conversely every route to such a point is extended by exactly one step. To which point do the shortened routes of group R lead, and to which those of group U? Enter these two points in the fields \\(a\\) and \\(b\\) and, before you check, predict the number of routes to each of them.',
        ),
        formulaIds: [],
        observationPrompt: text('Vpiši \\((3,3)\\), nato \\((4,2)\\) in preberi število poti; primerjaj s skupinama D in G.', 'Enter \\((3,3)\\), then \\((4,2)\\), and read the number of routes; compare with the groups R and U.'),
        expectedObservations: [text('Do \\((3,3)\\) vodi \\(20\\) poti (skupina D), do \\((4,2)\\) pa \\(15\\) poti (skupina G); števili sta velikosti skupin.', 'There are \\(20\\) routes to \\((3,3)\\) (group R) and \\(15\\) routes to \\((4,2)\\) (group U); these numbers are the sizes of the groups.')],
        scene: latticeScene('cb3-partition-scene', {a: 4, b: 3, view: 'paths', showCounts: false, split: true},
            'Cilj \\((4,3)\\), poti ločene po zadnjem koraku: polna črta za D (\\(20\\) poti), črtkana za G (\\(15\\) poti).',
            'The target \\((4,3)\\), routes split by their last step: solid line for R (\\(20\\) routes), dashed for U (\\(15\\) routes).'),
    }),
    step({
        id: 'cb3-identity', order: 3,
        title: text('Pascalova identiteta in robovi', 'Pascal\'s identity and the edges'),
        purpose: text('Zapisati razdelitev kot identiteto vnosov trikotnika in videti, kje ne velja.', 'Writing the split as an identity of triangle entries and seeing where it does not apply.'),
        explanation: text(
            'Cilj \\((a,b)\\) je vnos trikotnika v vrstici \\(a+b\\) na mestu \\(a\\); vrednosti \\(a\\) in \\(b\\) vpišeš v polji, ne klikneš. Razdelitev poti po zadnjem koraku da identiteto \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\) za \\(1\\le k\\le n-1\\). Prikaz je zdaj Pascalov trikotnik: ponazarja, kaj identiteta pove, utemeljitev pa je razdelitev iz prejšnjega koraka. Preden preveriš, napovej, kaj stanje pokaže pri cilju \\((6,0)\\), ki ga vpišeš, in ali tam identiteta velja.',
            'The target \\((a,b)\\) is the entry of the triangle in row \\(a+b\\) at place \\(a\\); you enter the values \\(a\\) and \\(b\\) in the fields rather than click. The split of the routes by their last step gives the identity \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\) for \\(1\\le k\\le n-1\\). The view is now Pascal\'s triangle: it illustrates what the identity says, while the justification is the split from the previous step. Before you check, predict what the status shows for the target \\((6,0)\\), which you enter, and whether the identity applies there.',
        ),
        formulaIds: ['last-step-split'],
        workedExampleId: 'cb3-identity',
        observationPrompt: text('Preberi stanje pri \\((4,3)\\), nato vpiši \\((6,0)\\) in preberi stanje.', 'Read the status at \\((4,3)\\), then enter \\((6,0)\\) and read the status.'),
        expectedObservations: [text('Pri \\((4,3)\\) stanje pove vrstico \\(7\\), mesto \\(4\\) in \\(35=20+15\\); pri \\((6,0)\\) je vnos \\(1\\) na robu trikotnika, samo z enim staršem.', 'At \\((4,3)\\) the status gives row \\(7\\), place \\(4\\) and \\(35=20+15\\); at \\((6,0)\\) the entry is \\(1\\), on the edge of the triangle, with only one parent.')],
        scene: latticeScene('cb3-identity-scene', {a: 4, b: 3, view: 'triangle', showCounts: false},
            'Pascalov trikotnik, cilj \\((4,3)\\): vrstica \\(7\\), mesto \\(4\\), \\(35=20+15\\).',
            'Pascal\'s triangle, the target \\((4,3)\\): row \\(7\\), place \\(4\\), \\(35=20+15\\).'),
    }),
    step({
        id: 'cb3-rows', order: 4,
        title: text('Vrstico za vrstico', 'Row by row'),
        purpose: text('Zgraditi naslednjo vrstico trikotnika z identiteto in napovedati vnos.', 'Building the next row of the triangle with the identity and predicting an entry.'),
        explanation: text(
            'Vrstica \\(3\\) je \\(1,3,3,1\\) (poznaš jo iz diagonale na mreži). Po identiteti je vsak notranji vnos naslednje vrstice vsota dveh sosednjih vnosov te vrstice, robna vnosa pa sta \\(1\\). S tem izračunaj vrstico \\(4\\) in iz nje napovej vnos v vrstici \\(5\\) na mestu \\(3\\), to je cilj \\((3,2)\\), skupaj z njegovima staršema. Nato v polje »Koraki desno (a)« vpiši \\(3\\), v polje »Koraki gor (b)« pa \\(2\\), in preberi odčitke.',
            'Row \\(3\\) is \\(1,3,3,1\\) (you know it from the diagonal on the grid). By the identity every inner entry of the next row is the sum of two neighbouring entries of that row, and the two edge entries are \\(1\\). Use this to work out row \\(4\\), and from it predict the entry in row \\(5\\) at place \\(3\\), which is the target \\((3,2)\\), together with its two parents. Then enter \\(3\\) in the field "Steps right (a)" and \\(2\\) in the field "Steps up (b)" and read the readouts.',
        ),
        formulaIds: ['pascal-identity'],
        observationPrompt: text('Vpiši \\(a=3\\), \\(b=2\\) in preberi vnos in starša pri cilju \\((3,2)\\).', 'Enter \\(a=3\\), \\(b=2\\) and read the entry and the parents at the target \\((3,2)\\).'),
        expectedObservations: [text('Vrstica \\(4\\) je \\(1,4,6,4,1\\); vnos v vrstici \\(5\\), mesto \\(3\\), je \\(10=6+4\\).', 'Row \\(4\\) is \\(1,4,6,4,1\\); the entry in row \\(5\\), place \\(3\\), is \\(10=6+4\\).')],
        scene: latticeScene('cb3-rows-scene', {a: 2, b: 1, view: 'triangle', showCounts: false},
            'Pascalov trikotnik, cilj \\((2,1)\\): vrstica \\(3\\), mesto \\(2\\), \\(3=2+1\\).',
            'Pascal\'s triangle, the target \\((2,1)\\): row \\(3\\), place \\(2\\), \\(3=2+1\\).'),
    }),
    step({
        id: 'cb3-symmetry', order: 5,
        title: text('Simetrija vrstice', 'The symmetry of a row'),
        purpose: text('Povezati zrcaljenje poti s simetrijo vrstice trikotnika.', 'Connecting the reflection of routes with the symmetry of a row of the triangle.'),
        explanation: text(
            'Obrazec \\(\\binom nk=\\binom n{n-k}\\) pomeni, da je vrstica trikotnika simetrična; razlog je zamenjava korakov D in G, ki preslika poti do \\((a,b)\\) na poti do \\((b,a)\\). Zdaj vpiši cilj \\((2,3)\\), torej zamenjaj vrednosti \\(a\\) in \\(b\\). Preden preveriš, napovej, kateri od staršev, \\(6\\) ali \\(4\\), je pri novem cilju levi.',
            'The formula \\(\\binom nk=\\binom n{n-k}\\) means that a row of the triangle is symmetric; the reason is the swap of the steps R and U, which maps the routes to \\((a,b)\\) onto the routes to \\((b,a)\\). Now enter the target \\((2,3)\\), so swap the values of \\(a\\) and \\(b\\). Before you check, predict which of the parents, \\(6\\) or \\(4\\), is the left one at the new target.',
        ),
        formulaIds: ['binomial-symmetry'],
        observationPrompt: text('Vpiši \\((2,3)\\) in preberi vnos ter levega in desnega starša.', 'Enter \\((2,3)\\) and read the entry and the left and right parent.'),
        expectedObservations: [text('Pri \\((2,3)\\) je vnos spet \\(10\\), na mestu \\(2\\) vrstice \\(5\\); levi starš je \\(4\\), desni \\(6\\), torej v obratnem vrstnem redu.', 'At \\((2,3)\\) the entry is again \\(10\\), at place \\(2\\) of row \\(5\\); the left parent is \\(4\\) and the right one \\(6\\), so in the opposite order.')],
        scene: latticeScene('cb3-symmetry-scene', {a: 3, b: 2, view: 'triangle', showCounts: false},
            'Pascalov trikotnik, cilj \\((3,2)\\): vrstica \\(5\\), mesto \\(3\\), \\(10=6+4\\).',
            'Pascal\'s triangle, the target \\((3,2)\\): row \\(5\\), place \\(3\\), \\(10=6+4\\).'),
    }),
    step({
        id: 'cb3-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Raziskati razdelitev poti in trikotnik na lastnih ciljih.', 'Exploring the split of the routes and the triangle on targets of your own.'),
        explanation: text(
            'Spreminjaj koraka \\(a\\) in \\(b\\), preklapljaj med potmi in trikotnikom ter vklopi ali izklopi ločitev poti po zadnjem koraku (poti so narisane do \\(12\\) korakov). Poišči cilj, pri katerem sta starša enaka, in cilj, pri katerem se razdeli samo ena skupina poti. Identiteta zahteva \\(1\\le k\\le n-1\\), ker ima vnos na robu trikotnika le enega starša. Vsi ti primeri so ponazoritve; argument je razdelitev po zadnjem koraku iz drugega koraka.',
            'Change the steps \\(a\\) and \\(b\\), switch between the routes and the triangle, and turn the split of the routes by their last step on or off (routes are drawn up to \\(12\\) steps). Find a target where the two parents are equal and a target where only one group of routes exists. The identity requires \\(1\\le k\\le n-1\\) because an entry on the edge of the triangle has only one parent. All of these are examples, illustrations; the argument is the split by the last step from step 2.',
        ),
        formulaIds: ['pascal-identity'],
        observationPrompt: text('Poišči cilj z enakima staršema in cilj z eno samo skupino poti.', 'Find a target with equal parents and a target with only one group of routes.'),
        expectedObservations: [text('Starša sta enaka, kadar je \\(a=b\\) (na sredini vrstice); samo ena skupina obstaja, kadar je \\(a=0\\) ali \\(b=0\\).', 'The parents are equal when \\(a=b\\) (in the middle of the row); only one group exists when \\(a=0\\) or \\(b=0\\).')],
        scene: latticeScene('cb3-explore-scene', {a: 5, b: 3},
            'Začetni primer: cilj \\((5,3)\\), poti brez ločitve, \\(56\\) poti.',
            'The starting case: the target \\((5,3)\\), routes without the split, \\(56\\) routes.'),
    }),
];

// ---- CB4 -------------------------------------------------------------------------------------------------------------------------

const cb4Formulas: readonly FormulaBlock[] = [
    {
        id: 'binomial-theorem',
        latex: '(a+b)^n=\\sum_{k=0}^{n}\\binom nk a^{n-k}b^k',
        notation: text(
            '\\(n\\) je potenca, \\(k\\) število črk \\(b\\) v členu, \\(\\binom nk\\) pa binomski simbol; vsota teče po \\(k=0,\\ldots,n\\).',
            '\\(n\\) is the power, \\(k\\) the number of letters \\(b\\) in a term and \\(\\binom nk\\) the binomial coefficient; the sum runs over \\(k=0,\\ldots,n\\).',
        ),
        explanation: text(
            'Binomski izrek: pri razvoju \\((a+b)^n\\) iz vsakega izmed \\(n\\) faktorjev izberemo \\(a\\) ali \\(b\\). Člen s \\(k\\) črkami \\(b\\) nastane natanko takrat, ko izberemo, v katerih \\(k\\) od \\(n\\) faktorjev vzamemo \\(b\\), zato je koeficient pri \\(a^{n-k}b^k\\) število teh izbir, to je \\(\\binom nk\\). Tabela nizov za posamezen \\(n\\) je ponazoritev tega argumenta.',
            'The binomial theorem: when we expand \\((a+b)^n\\) we choose \\(a\\) or \\(b\\) from each of the \\(n\\) factors. A term with \\(k\\) letters \\(b\\) arises exactly when we choose in which \\(k\\) of the \\(n\\) factors we take \\(b\\), so the coefficient of \\(a^{n-k}b^k\\) is the number of these choices, that is \\(\\binom nk\\). The table of strings for one \\(n\\) illustrates this argument.',
        ),
    },
    {
        id: 'shifted-power',
        latex: '(x+c)^n=\\sum_{k=0}^{n}\\binom nk c^k x^{n-k}',
        notation: text(
            'Vzamemo \\(a=x\\) in \\(b=c\\): vsaka črka \\(b\\) prispeva faktor \\(c\\), zato ima člen s \\(k\\) črkami \\(b\\) težo \\(c^k\\).',
            'Take \\(a=x\\) and \\(b=c\\): each letter \\(b\\) contributes a factor \\(c\\), so a term with \\(k\\) letters \\(b\\) has the weight \\(c^k\\).',
        ),
        explanation: text(
            'Koeficient pri \\(x^{n-k}\\) je \\(\\binom nk c^k\\): število nizov s \\(k\\) črkami \\(b\\), pomnoženo s težo \\(c^k\\). Graf izračuna koeficiente za \\(n\\le12\\) in \\(c\\) od \\(-9\\) do \\(9\\); za \\(n\\) nad \\(5\\) tabele nizov ni, koeficienti pa so še vedno natančna cela števila. Ob vnosu \\(x=1\\) dobimo vrednost polinoma, ki je vsota vseh koeficientov.',
            'The coefficient of \\(x^{n-k}\\) is \\(\\binom nk c^k\\): the number of strings with \\(k\\) letters \\(b\\), multiplied by the weight \\(c^k\\). The graph computes the coefficients for \\(n\\le12\\) and \\(c\\) from \\(-9\\) to \\(9\\); for \\(n\\) above \\(5\\) there is no table of strings, but the coefficients are still exact integers. Substituting \\(x=1\\) gives the value of the polynomial, which is the sum of all coefficients.',
        ),
    },
];

const cb4Examples: readonly WorkedExample[] = [
    {
        id: 'cb4-coefficient',
        title: text('Koeficient pri \\(x^3\\) v \\((x+2)^5\\)', 'The coefficient of \\(x^3\\) in \\((x+2)^5\\)'),
        calculationLatex: '\\binom52\\cdot2^2=10\\cdot4',
        resultLatex: '\\binom52\\cdot2^2=40',
        check: text(
            'Člen \\(x^3\\) ima \\(k=2\\) črki \\(b=2\\) in tri črke \\(a=x\\): izberemo, v katerih dveh od petih faktorjev vzamemo \\(2\\), teh izbir je \\(\\binom52=10\\), vsaka pa ima težo \\(2^2=4\\). Isto število mora pokazati koeficient pri \\(x^3\\) v odčitku, ko je \\(n=5\\) in \\(c=2\\).',
            'The term \\(x^3\\) has \\(k=2\\) letters \\(b=2\\) and three letters \\(a=x\\): we choose in which two of the five factors we take \\(2\\), there are \\(\\binom52=10\\) such choices, and each has the weight \\(2^2=4\\). The coefficient of \\(x^3\\) in the readout must show the same number when \\(n=5\\) and \\(c=2\\).',
        ),
    },
];

const cb4Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cb4-square', order: 1,
        title: text('Kvadrat dvočlenika', 'The square of a binomial'),
        purpose: text('Razviti \\((a+b)^2\\) po faktorjih in napovedati, koliko členov je enakih.', 'Expanding \\((a+b)^2\\) factor by factor and predicting how many terms are equal.'),
        explanation: text(
            '\\((a+b)^2=(a+b)(a+b)\\). Pri množenju iz prvega faktorja vzamemo \\(a\\) ali \\(b\\) in iz drugega faktorja prav tako, nato zmnožimo izbrani črki. Napovej, koliko je vseh takih produktov in koliko izmed njih je enakih \\(ab\\), če vrstni red črk ne šteje. Nato v polje »Potenca n« vpiši \\(2\\) in preberi koeficiente ter tabelo nizov.',
            '\\((a+b)^2=(a+b)(a+b)\\). When multiplying we take \\(a\\) or \\(b\\) from the first factor and also from the second, then multiply the chosen letters. Predict how many such products there are and how many of them equal \\(ab\\) if the order of the letters does not matter. Then enter \\(2\\) in the field "Power n" and read the coefficients and the table of strings.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(n=2\\) in preberi koeficiente ter tabelo nizov.', 'Write down your prediction, then enter \\(n=2\\) and read the coefficients and the table of strings.'),
        expectedObservations: [text('Produktov je \\(4\\) (\\(aa\\), \\(ab\\), \\(ba\\), \\(bb\\)); \\(ab\\) in \\(ba\\) sta enaka, zato je \\((a+b)^2=a^2+2ab+b^2\\) s koeficienti \\(1,2,1\\).', 'There are \\(4\\) products (\\(aa\\), \\(ab\\), \\(ba\\), \\(bb\\)); \\(ab\\) and \\(ba\\) are equal, so \\((a+b)^2=a^2+2ab+b^2\\) with coefficients \\(1,2,1\\).')],
        scene: expansionScene('cb4-square-scene', {n: 1, c: 1},
            'Binomski izrek, začetni \\(n=1\\), \\(c=1\\): koeficienta \\(1,1\\), vsota pri \\(x=1\\) je \\(2\\).',
            'The binomial theorem, starting at \\(n=1\\), \\(c=1\\): coefficients \\(1,1\\), the sum at \\(x=1\\) is \\(2\\).'),
    }),
    step({
        id: 'cb4-strings', order: 2,
        title: text('Člen je niz črk', 'A term is a string of letters'),
        purpose: text('Videti, da vsak produkt izbir ustreza nizu dolžine \\(n\\), in napovedati število nizov.', 'Seeing that every product of choices is a string of length \\(n\\), and predicting the number of strings.'),
        explanation: text(
            'Pri \\((a+b)^n\\) izberemo iz vsakega izmed \\(n\\) faktorjev \\(a\\) ali \\(b\\); izbire v vrstnem redu faktorjev tvorijo niz črk dolžine \\(n\\), na primer \\(aba\\) za \\(n=3\\). Različne izbire so različni nizi. Tabela prikazuje nize za izbrani \\(n\\) (pri \\(n\\) do \\(5\\)). Napovej, koliko je vseh nizov dolžine \\(3\\) iz črk \\(a\\) in \\(b\\). Nato v polje »Potenca n« vpiši \\(3\\) in preštej nize v tabeli.',
            'In \\((a+b)^n\\) we choose \\(a\\) or \\(b\\) from each of the \\(n\\) factors; the choices in the order of the factors form a string of letters of length \\(n\\), for example \\(aba\\) for \\(n=3\\). Different choices are different strings. The table shows the strings for the chosen \\(n\\) (it exists for \\(n\\) up to \\(5\\)). Predict how many strings of length \\(3\\) in the letters \\(a\\) and \\(b\\) there are. Then enter \\(3\\) in the field "Power n" and count the strings in the table.',
        ),
        formulaIds: [],
        observationPrompt: text('Vpiši \\(n=3\\), preštej nize v tabeli in preberi vsoto koeficientov.', 'Enter \\(n=3\\), count the strings in the table and read the sum of the coefficients.'),
        expectedObservations: [text('Nizov je \\(8=2^3\\), saj imamo pri vsakem od treh faktorjev dve izbiri; vsota koeficientov pri \\(c=1\\) je \\(8\\).', 'There are \\(8=2^3\\) strings, since we have two choices at each of the three factors; the sum of the coefficients at \\(c=1\\) is \\(8\\).')],
        scene: expansionScene('cb4-strings-scene', {n: 2, c: 1},
            'Binomski izrek, začetni \\(n=2\\), \\(c=1\\): tabela nizov, koeficienti \\(1,2,1\\), vsota \\(4\\).',
            'The binomial theorem, starting at \\(n=2\\), \\(c=1\\): the table of strings, coefficients \\(1,2,1\\), sum \\(4\\).'),
    }),
    step({
        id: 'cb4-collect', order: 3,
        title: text('Združevanje enakih členov', 'Collecting equal terms'),
        purpose: text('Utemeljiti, da je koeficient število izbir faktorjev, in ga napovedati.', 'Arguing that the coefficient is a number of choices of factors, and predicting it.'),
        explanation: text(
            'Člen s \\(k\\) črkami \\(b\\) in \\(n-k\\) črkami \\(a\\) je enak \\(a^{n-k}b^k\\), ne glede na vrstni red črk. Niz s \\(k\\) črkami \\(b\\) nastane natanko takrat, ko izberemo \\(k\\) izmed \\(n\\) faktorjev, v katerih vzamemo \\(b\\); zato je enakih členov toliko kot teh izbir, in to je splošni korak za vsak \\(n\\), ne le za tabelo. Tabela združuje nize po številu črk \\(b\\). Napovej, z binomskim simbolom, koliko nizov z natanko dvema črkama \\(b\\) je pri \\(n=3\\). Nato v polje »Potenca n« vpiši \\(3\\) in preštej nize v vsaki skupini tabele.',
            'A term with \\(k\\) letters \\(b\\) and \\(n-k\\) letters \\(a\\) equals \\(a^{n-k}b^k\\), whatever the order of the letters. A string with \\(k\\) letters \\(b\\) arises exactly when we choose \\(k\\) of the \\(n\\) factors in which we take \\(b\\); so there are as many equal terms as such choices, and this is the general step for every \\(n\\), not only for the table. The table groups the strings by the number of letters \\(b\\). Predict, using a binomial coefficient, how many strings with exactly two letters \\(b\\) there are for \\(n=3\\). Then enter \\(3\\) in the field "Power n" and count the strings in each group of the table.',
        ),
        formulaIds: [],
        observationPrompt: text('Vpiši \\(n=3\\), preštej nize v vsaki skupini po številu črk \\(b\\) in preberi koeficiente.', 'Enter \\(n=3\\), count the strings in each group by the number of letters \\(b\\), and read the coefficients.'),
        expectedObservations: [text('Skupine imajo \\(1,3,3,1\\) nizov; z dvema črkama \\(b\\) so \\(\\binom32=3\\) nizi, in ta števila so koeficienti.', 'The groups have \\(1,3,3,1\\) strings; with two letters \\(b\\) there are \\(\\binom32=3\\) strings, and these numbers are the coefficients.')],
        scene: expansionScene('cb4-collect-scene', {n: 1, c: 1},
            'Binomski izrek, začetni \\(n=1\\), \\(c=1\\): dve skupini nizov \\(a\\) in \\(b\\), koeficienta \\(1,1\\).',
            'The binomial theorem, starting at \\(n=1\\), \\(c=1\\): two groups of strings \\(a\\) and \\(b\\), coefficients \\(1,1\\).'),
    }),
    step({
        id: 'cb4-four', order: 4,
        title: text('Nizi za \\(n=4\\)', 'Strings for \\(n=4\\)'),
        purpose: text('Uporabiti splošni korak na \\((a+b)^4\\) in primerjati z tabelo.', 'Applying the general step to \\((a+b)^4\\) and comparing with the table.'),
        explanation: text(
            'Isti korak velja za \\(n=4\\): niz dolžine \\(4\\) ima \\(k\\) črk \\(b\\) natanko takrat, ko izberemo \\(k\\) izmed štirih faktorjev. Napovej, koliko je vseh nizov in koliko jih ima natanko dve črki \\(b\\). Nato v polje »Potenca n« vpiši \\(4\\) in poglej tabelo. Tabela za \\(n=4\\) je en primer in ponazarja korak, dokaz pa je izbira faktorjev iz prejšnjega koraka.',
            'The same step holds for \\(n=4\\): a string of length \\(4\\) has \\(k\\) letters \\(b\\) exactly when we choose \\(k\\) of the four factors. Predict how many strings there are in all and how many of them have exactly two letters \\(b\\). Then enter \\(4\\) in the field "Power n" and look at the table. The table for \\(n=4\\) is one instance and illustrates the step, while the proof is the choice of factors from the previous step.',
        ),
        formulaIds: ['binomial-theorem'],
        observationPrompt: text('Vpiši \\(n=4\\), preštej nize v tabeli in preberi koeficiente.', 'Enter \\(n=4\\), count the strings in the table and read the coefficients.'),
        expectedObservations: [text('Nizov je \\(16\\); skupine imajo \\(1,4,6,4,1\\) nizov, torej \\(6\\) z dvema črkama \\(b\\), kar so koeficienti \\((a+b)^4\\).', 'There are \\(16\\) strings; the groups have \\(1,4,6,4,1\\) strings, so \\(6\\) with two letters \\(b\\), and these are the coefficients of \\((a+b)^4\\).')],
        scene: expansionScene('cb4-four-scene', {n: 3, c: 1},
            'Binomski izrek, začetni \\(n=3\\), \\(c=1\\): \\(8\\) nizov, koeficienti \\(1,3,3,1\\), vsota \\(8\\).',
            'The binomial theorem, starting at \\(n=3\\), \\(c=1\\): \\(8\\) strings, coefficients \\(1,3,3,1\\), sum \\(8\\).'),
    }),
    step({
        id: 'cb4-weight', order: 5,
        title: text('Teža \\(c^k\\)', 'The weight \\(c^k\\)'),
        purpose: text('Pri \\((x+c)^5\\) pomnožiti število nizov s težo \\(c^k\\) in napovedati koeficient.', 'For \\((x+c)^5\\) multiplying the number of strings by the weight \\(c^k\\) and predicting a coefficient.'),
        explanation: text(
            'Zdaj je \\(a=x\\) in \\(b=c\\): vsaka črka \\(b\\) prinese faktor \\(c\\), zato je koeficient pri \\(x^{n-k}\\) enak \\(\\binom nk c^k\\). Pri \\(n=5\\), \\(c=1\\) so koeficienti enaki številom nizov. Nastavi \\(c=2\\). Preden prebereš koeficiente, napovej koeficient pri \\(x^4\\). Računski zgled za \\(x^3\\) je spodaj.',
            'Now \\(a=x\\) and \\(b=c\\): each letter \\(b\\) brings a factor \\(c\\), so the coefficient of \\(x^{n-k}\\) is \\(\\binom nk c^k\\). For \\(n=5\\), \\(c=1\\) the coefficients equal the numbers of strings. Set \\(c=2\\). Before you read the coefficients, predict the coefficient of \\(x^4\\). A worked example for \\(x^3\\) is below.',
        ),
        formulaIds: ['shifted-power'],
        workedExampleId: 'cb4-coefficient',
        observationPrompt: text('Nastavi \\(c=2\\) in preberi koeficiente od \\(x^5\\) do \\(x^0\\).', 'Set \\(c=2\\) and read the coefficients from \\(x^5\\) down to \\(x^0\\).'),
        expectedObservations: [text('Koeficienti so \\(1,10,40,80,80,32\\); pri \\(x^4\\) je \\(\\binom51\\cdot2=10\\), pri \\(x^3\\) je \\(40\\).', 'The coefficients are \\(1,10,40,80,80,32\\); at \\(x^4\\) it is \\(\\binom51\\cdot2=10\\), at \\(x^3\\) it is \\(40\\).')],
        scene: expansionScene('cb4-weight-scene', {n: 5, c: 1},
            'Binomski izrek, \\(n=5\\), \\(c=1\\): koeficienti \\(1,5,10,10,5,1\\), vsota \\(32\\).',
            'The binomial theorem, \\(n=5\\), \\(c=1\\): coefficients \\(1,5,10,10,5,1\\), sum \\(32\\).'),
    }),
    step({
        id: 'cb4-sum', order: 6,
        title: text('Vsota koeficientov', 'The sum of the coefficients'),
        purpose: text('Povezati vsoto koeficientov z vrednostjo polinoma pri \\(x=1\\).', 'Connecting the sum of the coefficients with the value of the polynomial at \\(x=1\\).'),
        explanation: text(
            'Vsota koeficientov polinoma je njegova vrednost pri \\(x=1\\). Napovej vrednost vsote koeficientov za \\((x+2)^5\\). Nato v polje »Potenca n« vpiši \\(5\\), \\(c=2\\) ostane, preberi odčitek vsote in jo primerjaj z vsoto koeficientov, ki jih kaže odčitek. Račun za en \\(n\\) in \\(c\\) je ponazoritev; za vsak \\(n\\) in \\(c\\) velja izrek, ki zagotavlja, da se obe strani ujemata.',
            'The sum of the coefficients of a polynomial is its value at \\(x=1\\). Predict the value of the sum of the coefficients for \\((x+2)^5\\). Then enter \\(5\\) in the field "Power n" (\\(c=2\\) stays), read the readout of the sum and compare it with the sum of the coefficients that the readout shows. A computation for one \\(n\\) and \\(c\\) is an illustration; for every \\(n\\) and \\(c\\) the theorem guarantees that the two sides agree.',
        ),
        formulaIds: [],
        observationPrompt: text('Vpiši \\(n=5\\), preberi vsoto koeficientov pri \\(x=1\\) in jo primerjaj s sešteti koeficienti.', 'Enter \\(n=5\\), read the sum of the coefficients at \\(x=1\\) and compare it with the added coefficients.'),
        expectedObservations: [text('Vsota je \\(3^5=243\\), kar je tudi \\(1+10+40+80+80+32\\).', 'The sum is \\(3^5=243\\), which is also \\(1+10+40+80+80+32\\).')],
        scene: expansionScene('cb4-sum-scene', {n: 4, c: 2},
            'Binomski izrek, začetni \\(n=4\\), \\(c=2\\): koeficienti \\(1,8,24,32,16\\), vsota pri \\(x=1\\) je \\(81\\).',
            'The binomial theorem, starting at \\(n=4\\), \\(c=2\\): coefficients \\(1,8,24,32,16\\), the sum at \\(x=1\\) is \\(81\\).'),
    }),
    step({
        id: 'cb4-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Raziskati koeficiente za poljuben \\(n\\) in \\(c\\).', 'Exploring the coefficients for any \\(n\\) and \\(c\\).'),
        explanation: text(
            'Spreminjaj potenco \\(n\\) od \\(0\\) do \\(12\\) in število \\(c\\) od \\(-9\\) do \\(9\\). Poišči \\(c\\), pri katerem je vsota koeficientov \\(0\\) (za \\(n\\ge1\\)), in opazuj predznake koeficientov pri negativnem \\(c\\). Tabela nizov obstaja samo do \\(n=5\\); koeficienti pri večjih \\(n\\) so še vedno natančna cela števila. Vsi ti primeri so ponazoritve; argument je izbira faktorjev iz tretjega koraka.',
            'Change the power \\(n\\) from \\(0\\) to \\(12\\) and the number \\(c\\) from \\(-9\\) to \\(9\\). Find \\(c\\) for which the sum of the coefficients is \\(0\\) (for \\(n\\ge1\\)), and watch the signs of the coefficients for negative \\(c\\). The table of strings exists only up to \\(n=5\\); the coefficients for larger \\(n\\) are still exact integers. All of these are examples, illustrations; the argument is the choice of factors from step 3.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči \\(c\\) z vsoto koeficientov \\(0\\) in najmanjši \\(n\\), pri katerem tabele nizov ni več.', 'Find \\(c\\) with the sum of the coefficients \\(0\\) and the smallest \\(n\\) at which the table of strings is gone.'),
        expectedObservations: [text('Vsota je \\(0\\) pri \\(c=-1\\); tabele nizov ni več pri \\(n=6\\).', 'The sum is \\(0\\) at \\(c=-1\\); the table of strings is gone at \\(n=6\\).')],
        scene: expansionScene('cb4-explore-scene', {n: 6, c: 2},
            'Začetni primer: \\(n=6\\), \\(c=2\\), koeficienti \\(1,12,60,160,240,192,64\\), vsota \\(729\\).',
            'The starting case: \\(n=6\\), \\(c=2\\), coefficients \\(1,12,60,160,240,192,64\\), sum \\(729\\).'),
    }),
];

// ---- Lesson assembly -------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-combinatorics-implementation',
        citation: 'Bezeg source: src/combinatorics/ (exact BigInt kernel and state model), src/graphs/combinatorics/LatticePathGraph.tsx and src/graphs/combinatorics/CountingTreeGraph.tsx.',
        implementationCorrespondence: 'A scene sets the target of the lattice graph (with the view and the switch of the count labels) or the choice of the counting graph; every count is an exact integer from the kernel, shown with thousands separators only in display; the text quotes only values of those scenes, values the learner reads after an action the text asks for, or plain arithmetic shown in the same step.',
    },
];

const cb1: GuidedLesson = {
    demonstrationId: 'lattice-paths',
    title: text('Poti po mreži in Pascalov trikotnik', 'Lattice paths and Pascal\'s triangle'),
    summary: text(
        'Poti po mreži od \\((0,0)\\) do \\((a,b)\\), ki gredo samo desno in gor, je \\(\\binom{a+b}{a}\\): pot je izbira, katerih \\(a\\) od \\(a+b\\) korakov gre desno. Števila poti v točkah mreže pišejo Pascalov trikotnik po diagonalah.',
        'The number of routes on a grid from \\((0,0)\\) to \\((a,b)\\) that go only right and up is \\(\\binom{a+b}{a}\\): a route is a choice of which \\(a\\) of the \\(a+b\\) steps go right. The numbers of routes at the grid points write Pascal\'s triangle along the diagonals.',
    ),
    prerequisites: [text('Nobenih; dovolj je, da znaš brati koordinate točke v mreži.', 'None; it is enough to read the coordinates of a grid point.')],
    learningGoals: [
        text('Napoveš in prešteješ poti po mreži do danega cilja ter preveriš s seznamom poti.', 'Predict and count the routes on a grid to a given target and check with the list of routes.'),
        text('Utemeljiš, da je število poti binomski simbol \\(\\binom{a+b}{a}\\), kot izbiro mest korakov.', 'Argue that the number of routes is the binomial coefficient \\(\\binom{a+b}{a}\\), as a choice of places of steps.'),
        text('Prebereš Pascalov trikotnik iz števil poti v točkah mreže in veš, da je to ponazoritev pravila seštevanja.', 'Read Pascal\'s triangle from the numbers of routes at the grid points and know that this illustrates the addition rule.'),
    ],
    formulaBlocks: cb1Formulas,
    workedExamples: cb1Examples,
    steps: cb1Steps,
    sources,
    edgeCases: [
        text('Če je \\(a=0\\) ali \\(b=0\\), je pot ena. Tipkana vrednost zunaj \\(0\\) do \\(20\\) je zavrnjena, povlečen cilj pa se pripne na mrežo.', 'If \\(a=0\\) or \\(b=0\\) there is one route. A typed value outside \\(0\\) to \\(20\\) is refused, while a dragged target snaps to the grid.'),
        text('Nad \\(12\\) koraki poti niso narisane in ni seznama, graf pa pove število poti in navede mejo.', 'Above \\(12\\) steps the routes are not drawn and there is no list; the graph gives the number of routes and states the limit.'),
        text('Binomski simbol v odčitku je zapisan kot \\(\\binom{a+b}{a}\\), ki je enak \\(\\binom{a+b}{b}\\).', 'The binomial coefficient in the readout is written as \\(\\binom{a+b}{a}\\), which equals \\(\\binom{a+b}{b}\\).'),
    ],
    unresolvedQuestions: [],
};

const cb2: GuidedLesson = {
    demonstrationId: 'counting-tree',
    title: text('Osnovni izrek, drevo, permutacije, variacije in kombinacije', 'Product rule, tree, permutations, variations and combinations'),
    summary: text(
        'Izbire se množijo (osnovni izrek kombinatorike). Permutacije, variacije in kombinacije se razlikujejo po tem, ali vrstni red šteje in ali se predmeti ponavljajo; \\(\\binom nk=V_n^k/k!\\), razporeditve črk s ponavljanjem pa štejemo z deljenjem s števili zamenjav enakih črk.',
        'Choices multiply (the product rule). Permutations, variations and combinations differ in whether order matters and whether items repeat; \\(\\binom nk=V_n^k/k!\\), and arrangements of letters with repetition are counted by dividing by the numbers of swaps of equal letters.',
    ),
    prerequisites: [text('Lekcija o poteh po mreži (neobvezno).', 'The lesson on lattice paths (optional).')],
    learningGoals: [
        text('Prešteješ izbire s kombinatoričnim drevesom in z osnovnim izrekom kombinatorike.', 'Count choices with the counting tree and with the product rule.'),
        text('Ločiš permutacije, variacije in kombinacije (s ponavljanjem in brez) po tem, ali vrstni red šteje.', 'Tell permutations, variations and combinations (with and without repetition) apart by whether order matters.'),
        text('Utemeljiš \\(\\binom nk=V_n^k/k!\\) in izračunaš razporeditve črk s ponavljanjem.', 'Argue \\(\\binom nk=V_n^k/k!\\) and compute arrangements of letters with repetition.'),
    ],
    formulaBlocks: cb2Formulas,
    workedExamples: cb2Examples,
    steps: cb2Steps,
    sources,
    edgeCases: [
        text('Brez ponavljanja \\(k\\) ne sme presegati \\(n\\); graf zavrne tak vnos, \\(k\\) pa zniža, kadar se zmanjša \\(n\\) ali se stikalo spremeni, in to pove v stanju.', 'Without repetition \\(k\\) must not exceed \\(n\\); the graph refuses such an entry, and lowers \\(k\\) when \\(n\\) decreases or a switch changes, saying so in the status.'),
        text('Drevo je narisano samo do \\(64\\) listov, večji primeri imajo tabelo; števila ostanejo natančna. Skupine vrstnih redov kombinacij so narisane za \\(k\\) od \\(2\\) do \\(4\\).', 'The tree is drawn only up to \\(64\\) leaves, larger cases get a table; the numbers stay exact. Groups of orderings of combinations are drawn for \\(k\\) from \\(2\\) to \\(4\\).'),
        text('\\(0!=1\\), zato je ena razporeditev nič predmetov.', '\\(0!=1\\), so there is one arrangement of zero items.'),
    ],
    unresolvedQuestions: [],
};

const cb3: GuidedLesson = {
    demonstrationId: 'lattice-paths',
    title: text('Pascalova identiteta iz zadnjega koraka poti', 'Pascal\'s identity from the last step of a route'),
    summary: text(
        'Poti do cilja razdelimo po zadnjem koraku v dve skupini brez preseka; to je argument za Pascalovo identiteto \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\), \\(1\\le k\\le n-1\\). Pascalov trikotnik identiteto ponazarja.',
        'We split the routes to a target by their last step into two groups that do not overlap; this is the argument for Pascal\'s identity \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\), \\(1\\le k\\le n-1\\). Pascal\'s triangle illustrates the identity.',
    ),
    prerequisites: [text('Lekcija o poteh po mreži in Pascalovem trikotniku.', 'The lesson on lattice paths and Pascal\'s triangle.')],
    learningGoals: [
        text('Razdeliš poti do cilja po zadnjem koraku in utemeljiš, da sta skupini brez preseka in pokrijeta vse poti.', 'Split the routes to a target by their last step and argue that the groups do not overlap and cover all routes.'),
        text('Zapišeš \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\) in veš, da velja za \\(1\\le k\\le n-1\\), robni vnosi pa so \\(1\\).', 'Write \\(\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}\\) and know that it holds for \\(1\\le k\\le n-1\\) while the edge entries are \\(1\\).'),
        text('Z identiteto zgradiš vrstico Pascalovega trikotnika in uporabiš simetrijo \\(\\binom nk=\\binom n{n-k}\\).', 'Build a row of Pascal\'s triangle with the identity and use the symmetry \\(\\binom nk=\\binom n{n-k}\\).'),
    ],
    formulaBlocks: cb3Formulas,
    workedExamples: cb3Examples,
    steps: cb3Steps,
    sources,
    edgeCases: [
        text('Pri \\(a=0\\) ali \\(b=0\\) je ena sama skupina poti, vnos trikotnika pa je na robu in ima enega starša; identiteta velja za \\(1\\le k\\le n-1\\).', 'If \\(a=0\\) or \\(b=0\\) there is only one group of routes and the triangle entry is on the edge with one parent; the identity holds for \\(1\\le k\\le n-1\\).'),
        text('Poti so narisane in ločene po barvi samo do \\(12\\) korakov; trikotnik je narisan do vrstice \\(12\\), zunaj tega graf pove samo vnos.', 'Routes are drawn and split by colour only up to \\(12\\) steps; the triangle is drawn up to row \\(12\\), beyond which the graph gives only the entry.'),
        text('Vnos trikotnika izbereš z vpisom \\(a\\) in \\(b\\), ne s klikom.', 'You choose a triangle entry by entering \\(a\\) and \\(b\\), not by clicking.'),
    ],
    unresolvedQuestions: [],
};

const cb4: GuidedLesson = {
    demonstrationId: 'lattice-paths',
    title: text('Binomski izrek s potmi', 'The binomial theorem by paths'),
    summary: text(
        'Pri razvoju \\((a+b)^n\\) iz vsakega faktorja izberemo \\(a\\) ali \\(b\\). Izbire zapišemo kot nize črk, jih preštejemo in povežemo s potmi po mreži in s koeficienti razvoja, nato pa še s koeficienti \\((x+c)^n\\).',
        'When we expand \\((a+b)^n\\) we choose \\(a\\) or \\(b\\) from each factor. We write the choices as strings of letters, count them and connect them with lattice paths and with the coefficients of the expansion, and then with the coefficients of \\((x+c)^n\\).',
    ),
    prerequisites: [text('Lekciji o poteh po mreži in o Pascalovi identiteti.', 'The lessons on lattice paths and on Pascal\'s identity.')],
    learningGoals: [
        text('Razviješ \\((a+b)^n\\) kot izbiro \\(a\\) ali \\(b\\) iz vsakega faktorja in utemeljiš, da je koeficient \\(\\binom nk\\).', 'Expand \\((a+b)^n\\) as a choice of \\(a\\) or \\(b\\) from each factor and argue that the coefficient is \\(\\binom nk\\).'),
        text('Koeficient pri \\(x^{n-k}\\) v \\((x+c)^n\\) izračunaš kot \\(\\binom nk c^k\\) in ga primerjaš z odčitkom.', 'Compute the coefficient of \\(x^{n-k}\\) in \\((x+c)^n\\) as \\(\\binom nk c^k\\) and compare it with the readout.'),
        text('Veš, da tabela nizov za en \\(n\\) ponazarja argument, ne dokazuje splošnega izreka.', 'Know that the table of strings for one \\(n\\) illustrates the argument and does not prove the general theorem.'),
    ],
    formulaBlocks: cb4Formulas,
    workedExamples: cb4Examples,
    steps: cb4Steps,
    sources,
    edgeCases: [
        text('Tabela nizov obstaja samo do \\(n=5\\); koeficienti so izračunani za \\(n\\le12\\) in \\(c\\) od \\(-9\\) do \\(9\\), vedno kot natančna cela števila.', 'The table of strings exists only up to \\(n=5\\); the coefficients are computed for \\(n\\le12\\) and \\(c\\) from \\(-9\\) to \\(9\\), always as exact integers.'),
        text('Pri \\(c=0\\) so vsi koeficienti razen prvega \\(0\\); pri negativnem \\(c\\) se predznaki koeficientov izmenjujejo.', 'If \\(c=0\\) every coefficient except the first is \\(0\\); for negative \\(c\\) the signs of the coefficients alternate.'),
        text('Vsota koeficientov je vrednost polinoma pri \\(x=1\\), torej \\((1+c)^n\\).', 'The sum of the coefficients is the value of the polynomial at \\(x=1\\), that is \\((1+c)^n\\).'),
    ],
    unresolvedQuestions: [],
};

export const latticePathsLesson: GuidedLesson = cb1;
export const countingTreeLesson: GuidedLesson = cb2;
export const pascalIdentityLesson: GuidedLesson = cb3;
export const binomialTheoremLesson: GuidedLesson = cb4;
