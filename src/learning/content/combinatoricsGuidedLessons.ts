/**
 * Guided lessons of the combinatorics family, batch A (docs/specs/combinatorics-lessons.md): CB1, lattice paths and Pascal's triangle, on `lattice-paths`
 * (LatticePathGraph), and CB2, the product rule, the tree, permutations, variations and combinations, on `counting-tree` (CountingTreeGraph). Each is the
 * lesson of one section of the combinatorics chapter (combinatoricsChapterRegistry.ts adapts them on request; the lesson catalog holds none, as it keeps one
 * lesson per Demonstration). Scenes use only the `combinatorics` actions the two graphs register (`set-target`, `set-lattice-display`, `set-counting-mode`)
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
}

/** The actions of a lattice scene: the Demonstration default, the target, and the display only when the scene names one. */
export const latticeSceneActions = (id: string, spec: LatticeSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'combinatorics', operation: 'set-target', a: spec.a, b: spec.b},
    ...(spec.view !== undefined || spec.showCounts !== undefined
        ? [{kind: 'combinatorics', operation: 'set-lattice-display', view: spec.view ?? 'paths', showCounts: spec.showCounts ?? false} as const]
        : []),
];

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

export const latticePathsLesson: GuidedLesson = cb1;
export const countingTreeLesson: GuidedLesson = cb2;
