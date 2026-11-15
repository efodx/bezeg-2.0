/**
 * Guided lesson CB5 of the combinatorics family (docs/specs/combinatorics-lessons.md): row sums, alternating sums, the hockey stick and the weights
 * binom(n, k) t^k (1-t)^(n-k) as the bridge to the Bernstein basis functions and the binomial distribution, on `counting-tree` (CountingTreeGraph) in its
 * view `row`. Every scene starts from the Demonstration default and one `set-row` action, with n, k and t always passed explicitly. The graph states every
 * answer of this lesson on the first frame (status and readouts cannot be hidden), so each predicting step opens on another row, place or weight than the
 * one it asks for, and the learner makes the change. Every number the text quotes is a readout of the graph for a scene or for the state after the
 * change the text asks for, or plain arithmetic shown in the same step; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-comb-c.md (slice 2).
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

/** What a row scene sets: the row n, the place k in it and the weight t (a multiple of 0,01 in [0, 1]); all three are always named. */
export interface RowSceneSpec {
    readonly n: number;
    readonly k: number;
    readonly t: number;
}

/** The actions of a row scene: the Demonstration default, then the view `row` with n, k and t. */
export const rowSceneActions = (id: string, spec: RowSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'combinatorics', operation: 'set-row', n: spec.n, k: spec.k, t: spec.t},
];

const rowScene = (id: string, spec: RowSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: rowSceneActions(id, spec), expectedState: text(sl, en)});

/** The opening scene of each predicting step and of the free step (ids and states). The learner's change is quoted in CB5_CHANGES. */
export const CB5_SCENES = {
    sum: {id: 'cb5-sum-scene', spec: {n: 4, k: 2, t: 0.5}},
    alternating: {id: 'cb5-alternating-scene', spec: {n: 6, k: 2, t: 0.5}},
    hockey: {id: 'cb5-hockey-scene', spec: {n: 4, k: 1, t: 0.5}},
    weights: {id: 'cb5-weights-scene', spec: {n: 5, k: 2, t: 0.3}},
    bridge: {id: 'cb5-bridge-scene', spec: {n: 8, k: 6, t: 0.25}},
    explore: {id: 'cb5-explore-scene', spec: {n: 6, k: 3, t: 0.5}},
} as const satisfies Record<string, {readonly id: string; readonly spec: RowSceneSpec}>;

/** The state each predicting step asks the learner to reach from its opening (the same as a `set-row` with these values). */
export const CB5_CHANGES = {
    sum: [{n: 7, k: 2, t: 0.5}, {n: 10, k: 2, t: 0.5}],
    alternating: [{n: 0, k: 0, t: 0.5}],
    hockey: [{n: 7, k: 3, t: 0.5}],
    weights: [{n: 5, k: 2, t: 0.5}],
    bridge: [{n: 8, k: 6, t: 0.9}],
} as const satisfies Record<string, readonly RowSceneSpec[]>;

// ---- Formulas and the worked example ---------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'binomial-theorem',
        latex: '(a+b)^n=\\sum_{k=0}^{n}\\binom nk a^{n-k}b^k',
        notation: text(
            '\\(n\\) je potenca, \\(k\\) število faktorjev, v katerih vzamemo \\(b\\), \\(\\binom nk\\) pa binomski simbol; \\(a\\) in \\(b\\) sta poljubni števili.',
            '\\(n\\) is the power, \\(k\\) the number of factors in which we take \\(b\\) and \\(\\binom nk\\) the binomial coefficient; \\(a\\) and \\(b\\) are any numbers.',
        ),
        explanation: text(
            'Binomski izrek iz lekcije o poteh po mreži: iz vsakega od \\(n\\) faktorjev vzamemo \\(a\\) ali \\(b\\), člen s \\(k\\) črkami \\(b\\) pa nastane na \\(\\binom nk\\) načinov. Izrek velja za poljubni števili \\(a\\) in \\(b\\), tudi za negativni \\(b\\). V tej lekciji vanj vstavljamo posebne vrednosti.',
            'The binomial theorem from the lesson on lattice paths: from each of the \\(n\\) factors we take \\(a\\) or \\(b\\), and a term with \\(k\\) letters \\(b\\) arises in \\(\\binom nk\\) ways. The theorem holds for any numbers \\(a\\) and \\(b\\), also for a negative \\(b\\). In this lesson we substitute special values into it.',
        ),
    },
    {
        id: 'row-sum',
        latex: '\\sum_{k=0}^{n}\\binom nk=2^n',
        notation: text(
            'Vsota vseh števil v vrstici \\(n\\) Pascalovega trikotnika.',
            'The sum of all numbers in row \\(n\\) of the Pascal triangle.',
        ),
        explanation: text(
            'Argument: množica z \\(n\\) elementi ima \\(2^n\\) podmnožic, saj je vsak element v podmnožici ali ne; podmnožic velikosti \\(k\\) je \\(\\binom nk\\). Isto dobimo iz binomskega izreka pri \\(a=b=1\\).',
            'The argument: a set of \\(n\\) elements has \\(2^n\\) subsets, since each element is in the subset or not; there are \\(\\binom nk\\) subsets of size \\(k\\). The same follows from the binomial theorem at \\(a=b=1\\).',
        ),
    },
    {
        id: 'alternating-sum',
        latex: '\\sum_{k=0}^{n}(-1)^k\\binom nk=0\\quad(n\\ge1)',
        notation: text(
            'Izmenična vsota vrstice \\(n\\): členi imajo izmenično predznak \\(+\\) in \\(-\\); trditev velja za \\(n\\ge1\\).',
            'The alternating sum of row \\(n\\): the terms have the signs \\(+\\) and \\(-\\) in turn; the statement holds for \\(n\\ge1\\).',
        ),
        explanation: text(
            'Argument: v binomski izrek vstavimo \\(a=1\\) in \\(b=-1\\), dobimo \\((1-1)^n=\\sum(-1)^k\\binom nk\\). Leva stran je produkt \\(n\\) ničel, za \\(n\\ge1\\) torej \\(0\\). Pri lihem \\(n\\) se člena \\(k\\) in \\(n-k\\) še posebej odštejeta, ker je \\(\\binom nk=\\binom n{n-k}\\), predznaka \\((-1)^k\\) in \\((-1)^{n-k}\\) pa sta nasprotna.',
            'The argument: substitute \\(a=1\\) and \\(b=-1\\) into the binomial theorem to get \\((1-1)^n=\\sum(-1)^k\\binom nk\\). The left side is a product of \\(n\\) zeros, so it is \\(0\\) for \\(n\\ge1\\). For odd \\(n\\) the terms \\(k\\) and \\(n-k\\) also cancel directly, because \\(\\binom nk=\\binom n{n-k}\\) while the signs \\((-1)^k\\) and \\((-1)^{n-k}\\) are opposite.',
        ),
    },
    {
        id: 'hockey-stick',
        latex: '\\sum_{j=k}^{n}\\binom jk=\\binom{n+1}{k+1}',
        notation: text(
            'Vsota binomskih simbolov z enakim spodnjim številom \\(k\\), od \\(\\binom kk\\) do \\(\\binom nk\\).',
            'The sum of binomial coefficients with the same lower number \\(k\\), from \\(\\binom kk\\) to \\(\\binom nk\\).',
        ),
        explanation: text(
            'Argument: Pascalova identiteta \\(\\binom{n+1}{k+1}=\\binom nk+\\binom n{k+1}\\) velja za vsak \\(n\\) in \\(k\\), kjer sta oba binomska simbola na desni določena. Če jo uporabimo še na \\(\\binom n{k+1}\\), nato na \\(\\binom{n-1}{k+1}\\) in tako naprej, se odvije vsota diagonale; na koncu ostane \\(\\binom{k+1}{k+1}=1=\\binom kk\\).',
            'The argument: Pascal identity \\(\\binom{n+1}{k+1}=\\binom nk+\\binom n{k+1}\\) holds for every \\(n\\) and \\(k\\) for which both binomial coefficients on the right are defined. Applying it again to \\(\\binom n{k+1}\\), then to \\(\\binom{n-1}{k+1}\\) and so on unrolls the sum of the diagonal; at the end \\(\\binom{k+1}{k+1}=1=\\binom kk\\) remains.',
        ),
    },
    {
        id: 'weights-sum',
        latex: '\\sum_{k=0}^{n}\\binom nk t^k(1-t)^{n-k}=\\bigl(t+(1-t)\\bigr)^n=1',
        notation: text(
            '\\(t\\) je število med \\(0\\) in \\(1\\); člen \\(\\binom nk t^k(1-t)^{n-k}\\) je utež mesta \\(k\\).',
            '\\(t\\) is a number between \\(0\\) and \\(1\\); the term \\(\\binom nk t^k(1-t)^{n-k}\\) is the weight of place \\(k\\).',
        ),
        explanation: text(
            'Argument: binomski izrek z \\(a=t\\) in \\(b=1-t\\). Isti členi so Bernsteinove bazne funkcije stopnje \\(n\\) pri \\(t\\) in verjetnosti binomske porazdelitve z verjetnostjo uspeha \\(p=t\\); njuna vsota \\(1\\) je razčlenitev enote oziroma vsota verjetnosti vseh izidov. Stolpci v grafu so ponazoritev, utež pa je izračunana z decimalnimi števili.',
            'The argument: the binomial theorem with \\(a=t\\) and \\(b=1-t\\). The same terms are the Bernstein basis functions of degree \\(n\\) at \\(t\\) and the probabilities of the binomial distribution with success probability \\(p=t\\); their sum \\(1\\) is the partition of unity and the total probability of all outcomes. The bars in the graph are an illustration and the weight is computed in doubles.',
        ),
    },
];

const examples: readonly WorkedExample[] = [
    {
        id: 'cb5-weight',
        title: text('Utež mesta \\(2\\) v vrstici \\(5\\) pri \\(t=0{,}3\\)', 'The weight of place \\(2\\) in row \\(5\\) at \\(t=0.3\\)'),
        calculationLatex: '\\binom52\\cdot0{,}3^2\\cdot0{,}7^3=10\\cdot0{,}09\\cdot0{,}343',
        resultLatex: '\\binom52\\cdot0{,}3^2\\cdot0{,}7^3=0{,}3087',
        check: text(
            'Številu \\(\\binom52=10\\) izbir mesta pripada utež \\(t^2(1-t)^3\\) s \\(t=0{,}3\\): \\(0{,}3^2=0{,}09\\), \\(0{,}7^3=0{,}343\\), zmnožek \\(10\\cdot0{,}09\\cdot0{,}343=0{,}3087\\). To je število, ki ga ob začetnem stanju kaže odčitek »Utež pri izbranem k (na 6 decimalk)«.',
            'The number \\(\\binom52=10\\) of choices of the place carries the weight \\(t^2(1-t)^3\\) with \\(t=0.3\\): \\(0.3^2=0.09\\), \\(0.7^3=0.343\\), and the product \\(10\\cdot0.09\\cdot0.343=0.3087\\). This is the number that the readout "Weight at the chosen k (rounded to 6 decimals)" shows in the starting state.',
        ),
    },
];

// ---- Steps -----------------------------------------------------------------------------------------------------------------------

const steps: readonly GuidedLessonStep[] = [
    step({
        id: 'cb5-sum', order: 1,
        title: text('Vsota vrstice', 'The sum of a row'),
        purpose: text('Napovedati vsoto vrstice \\(7\\) s štetjem podmnožic in jo utemeljiti z binomskim izrekom.', 'Predicting the sum of row \\(7\\) by counting subsets and arguing it with the binomial theorem.'),
        explanation: text(
            'V vrstici \\(n\\) Pascalovega trikotnika so števila \\(\\binom n0,\\binom n1,\\ldots,\\binom nn\\), pri čemer je \\(\\binom nk\\) število podmnožic velikosti \\(k\\) množice z \\(n\\) elementi. Premisli: če za vsak element množice odločiš, ali je v podmnožici ali ne, koliko je vseh podmnožic? Napovej vsoto števil v vrstici \\(7\\) in zapiši razlog. Nato v polje »Vrstica n« vpiši \\(7\\) in napoved primerjaj z odčitkom »Vsota vrstice«.',
            'Row \\(n\\) of the Pascal triangle holds the numbers \\(\\binom n0,\\binom n1,\\ldots,\\binom nn\\), where \\(\\binom nk\\) is the number of subsets of size \\(k\\) of a set of \\(n\\) elements. Think: if for each element of the set you decide whether it is in the subset or not, how many subsets are there in all? Predict the sum of the numbers in row \\(7\\) and write down the reason. Then enter \\(7\\) in the field "Row n" and compare your prediction with the readout "Row sum".',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Vpiši \\(n=7\\) in preberi vsoto vrstice. Nato vpiši \\(n=10\\) in preveri, ali isti razlog napove tudi to vrstico.',
            'Enter \\(n=7\\) and read the row sum. Then enter \\(n=10\\) and check whether the same reason predicts that row too.',
        ),
        expectedObservations: [
            text(
                'Vsota vrstice \\(7\\) je \\(128=2^7\\), vsota vrstice \\(10\\) pa \\(1\\,024=2^{10}\\). Argument: vsak od \\(n\\) elementov je v podmnožici ali ne, zato je podmnožic \\(2^n\\); po velikosti \\(k\\) jih je \\(\\binom nk\\), zato je \\(\\sum_{k=0}^{n}\\binom nk=2^n\\). Isto sledi iz binomskega izreka: \\((1+1)^n\\) razvijemo z \\(a=b=1\\). Odčitek pri dveh vrsticah je ponazoritev, argument velja za vsak \\(n\\).',
                'The sum of row \\(7\\) is \\(128=2^7\\) and the sum of row \\(10\\) is \\(1024=2^{10}\\). The argument: each of the \\(n\\) elements is in the subset or not, so there are \\(2^n\\) subsets; by size \\(k\\) there are \\(\\binom nk\\) of them, so \\(\\sum_{k=0}^{n}\\binom nk=2^n\\). The same follows from the binomial theorem: expand \\((1+1)^n\\) with \\(a=b=1\\). The readout for two rows is an illustration, the argument holds for every \\(n\\).',
            ),
        ],
        scene: rowScene(CB5_SCENES.sum.id, CB5_SCENES.sum.spec,
            'Vrstica Pascalovega trikotnika, \\(n=4\\), \\(k=2\\), \\(t=0{,}5\\): vsota vrstice \\(16\\), izmenična vsota \\(0\\).',
            'Row of the Pascal triangle, \\(n=4\\), \\(k=2\\), \\(t=0.5\\): row sum \\(16\\), alternating sum \\(0\\).'),
    }),
    step({
        id: 'cb5-alternating', order: 2,
        title: text('Izmenična vsota', 'The alternating sum'),
        purpose: text('Utemeljiti, zakaj je izmenična vsota \\(0\\), in napovedati izjemo \\(n=0\\).', 'Arguing why the alternating sum is \\(0\\) and predicting the exception \\(n=0\\).'),
        explanation: text(
            'Izmenična vsota vrstice je \\(\\binom n0-\\binom n1+\\binom n2-\\cdots\\), predznaki si izmenjujejo. V odprti vrstici in v vseh vrsticah, ki so bile do zdaj odprte, jo odčitek »Izmenična vsota« kaže kot \\(0\\); zdaj iščemo razlog. Vstavi \\(a=1\\) in \\(b=-1\\) v binomski izrek: leva stran je \\((1-1)^n\\), desna pa izmenična vsota. Kaj je leva stran, če ima produkt \\(n\\ge1\\) faktorjev? Pri lihem \\(n\\) pomisli še na pare mest \\(k\\) in \\(n-k\\). Nato napovej izmenično vsoto vrstice \\(0\\), v kateri je en sam člen, in razloži napoved s potenco \\((1-1)^n\\). Nazadnje v polje »Vrstica n« vpiši \\(0\\).',
            'The alternating sum of a row is \\(\\binom n0-\\binom n1+\\binom n2-\\cdots\\), with the signs in turn. In the open row and in every row you have looked at so far the readout "Alternating sum" shows \\(0\\); now we look for the reason. Substitute \\(a=1\\) and \\(b=-1\\) into the binomial theorem: the left side is \\((1-1)^n\\) and the right side is the alternating sum. What is the left side if the product has \\(n\\ge1\\) factors? For odd \\(n\\) also think of the pairs of places \\(k\\) and \\(n-k\\). Then predict the alternating sum of row \\(0\\), which has a single term, and explain the prediction with the power \\((1-1)^n\\). Finally enter \\(0\\) in the field "Row n".',
        ),
        formulaIds: ['binomial-theorem'],
        observationPrompt: text(
            'Vpiši \\(n=0\\) in preberi izmenično vsoto, vsoto vrstice in stanje.',
            'Enter \\(n=0\\) and read the alternating sum, the row sum and the status.',
        ),
        expectedObservations: [
            text(
                'Izmenična vsota je \\(1\\) in vsota vrstice je tudi \\(1\\) (vrstica \\(0\\) je samo \\(\\binom00=1\\)); polje »Mesto k v vrstici« se zniža na \\(0\\), kar pove stanje. Za \\(n\\ge1\\) velja \\(\\sum(-1)^k\\binom nk=(1-1)^n=0\\), ker je produkt \\(n\\) ničel \\(0\\); pri \\(n=0\\) je \\((1-1)^0=1\\), ker je vsaka potenca z eksponentom \\(0\\) enaka \\(1\\), zato trditev o ničli zahteva \\(n\\ge1\\). Pri lihem \\(n\\) se členi \\(k\\) in \\(n-k\\) odštejejo v paru. Odčitek je ponazoritev, argument je binomski izrek.',
                'The alternating sum is \\(1\\) and the row sum is also \\(1\\) (row \\(0\\) is only \\(\\binom00=1\\)); the field "Place k in the row" is lowered to \\(0\\), which the status says. For \\(n\\ge1\\) we have \\(\\sum(-1)^k\\binom nk=(1-1)^n=0\\), because a product of \\(n\\) zeros is \\(0\\); at \\(n=0\\) we get \\((1-1)^0=1\\), since every power with exponent \\(0\\) equals \\(1\\), so the statement about zero needs \\(n\\ge1\\). For odd \\(n\\) the terms \\(k\\) and \\(n-k\\) cancel in pairs. The readout is an illustration, the argument is the binomial theorem.',
            ),
        ],
        scene: rowScene(CB5_SCENES.alternating.id, CB5_SCENES.alternating.spec,
            'Vrstica \\(n=6\\), \\(k=2\\), \\(t=0{,}5\\): vsota vrstice \\(64\\), izmenična vsota \\(0\\).',
            'Row \\(n=6\\), \\(k=2\\), \\(t=0.5\\): row sum \\(64\\), alternating sum \\(0\\).'),
    }),
    step({
        id: 'cb5-hockey', order: 3,
        title: text('Vsota po diagonali (hokejska palica)', 'The sum along a diagonal (hockey stick)'),
        purpose: text('Napovedati vsoto po diagonali za \\(n=7\\), \\(k=3\\) po vzorcu in z vsoto členov ter jo utemeljiti s Pascalovo identiteto.', 'Predicting the diagonal sum for \\(n=7\\), \\(k=3\\) by the pattern and by adding the terms, and arguing it with the Pascal identity.'),
        explanation: text(
            'Odčitek »Vsota po diagonali« sešteje števila \\(\\binom kk,\\binom{k+1}k,\\ldots,\\binom nk\\) po eni diagonali trikotnika, to je za izbrano mesto \\(k\\) in vrstice do \\(n\\), in vsoto zapiše tudi kot en binomski simbol. Preberi ga v odprtem primeru in poišči vzorec med seštevanci in tem simbolom. Napovej vsoto po diagonali za \\(n=7\\), \\(k=3\\): enkrat tako, da seštevaš člene, in enkrat po vzorcu. Nato v polje »Mesto k v vrstici« vpiši \\(3\\) in v polje »Vrstica n« vpiši \\(7\\), v poljubnem vrstnem redu. Po prvem vnosu odčitek kaže vsoto druge diagonale; napoved velja šele za končno stanje.',
            'The readout "Sum along the diagonal" adds the numbers \\(\\binom kk,\\binom{k+1}k,\\ldots,\\binom nk\\) along one diagonal of the triangle, that is for the chosen place \\(k\\) and the rows up to \\(n\\), and also writes the sum as a single binomial coefficient. Read it in the open case and find the pattern between the terms and that coefficient. Predict the diagonal sum for \\(n=7\\), \\(k=3\\): once by adding the terms and once by the pattern. Then enter \\(3\\) in the field "Place k in the row" and \\(7\\) in the field "Row n", in either order. After the first entry the readout shows the sum of another diagonal; your prediction applies only to the final state.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Vpiši \\(k=3\\) in \\(n=7\\), preberi vsoto po diagonali in jo primerjaj z obema napovedma.',
            'Enter \\(k=3\\) and \\(n=7\\), read the diagonal sum and compare it with both predictions.',
        ),
        expectedObservations: [
            text(
                'Vsota po diagonali je \\(1+4+10+20+35=70=\\binom84\\). V odprtem primeru je \\(1+2+3+4=10=\\binom52\\); po vpisu \\(k=3\\) pri \\(n=4\\) je vmesna vsota \\(\\binom33+\\binom43=5=\\binom54\\), po vpisu \\(n=7\\) pri \\(k=1\\) pa \\(28=\\binom82\\). Argument: Pascalova identiteta \\(\\binom{n+1}{k+1}=\\binom nk+\\binom n{k+1}\\), uporabljena vedno znova na zadnjem členu, odvije vsoto \\(\\sum_{j=k}^{n}\\binom jk=\\binom{n+1}{k+1}\\), na primer \\(\\binom84=\\binom73+\\binom74\\), \\(\\binom74=\\binom63+\\binom64\\), \\(\\ldots\\), \\(\\binom54=\\binom43+\\binom44\\) in \\(\\binom44=1=\\binom33\\). Odčitek za en primer je ponazoritev.',
                'The diagonal sum is \\(1+4+10+20+35=70=\\binom84\\). In the open case \\(1+2+3+4=10=\\binom52\\); after entering \\(k=3\\) at \\(n=4\\) the intermediate sum is \\(\\binom33+\\binom43=5=\\binom54\\), and after entering \\(n=7\\) at \\(k=1\\) it is \\(28=\\binom82\\). The argument: Pascal identity \\(\\binom{n+1}{k+1}=\\binom nk+\\binom n{k+1}\\), applied again and again to the last term, unrolls the sum \\(\\sum_{j=k}^{n}\\binom jk=\\binom{n+1}{k+1}\\), for example \\(\\binom84=\\binom73+\\binom74\\), \\(\\binom74=\\binom63+\\binom64\\), \\(\\ldots\\), \\(\\binom54=\\binom43+\\binom44\\) and \\(\\binom44=1=\\binom33\\). The readout for one case is an illustration.',
            ),
        ],
        scene: rowScene(CB5_SCENES.hockey.id, CB5_SCENES.hockey.spec,
            'Vrstica \\(n=4\\), \\(k=1\\), \\(t=0{,}5\\): vsota po diagonali \\(1+2+3+4=10=\\binom52\\).',
            'Row \\(n=4\\), \\(k=1\\), \\(t=0.5\\): diagonal sum \\(1+2+3+4=10=\\binom52\\).'),
    }),
    step({
        id: 'cb5-weights', order: 4,
        title: text('Uteži mest v vrstici', 'The weights of the places in a row'),
        purpose: text('Izračunati utež \\(\\binom nk t^k(1-t)^{n-k}\\) pri \\(t=\\tfrac12\\) kot ulomek in jo primerjati z izračunanim odčitkom.', 'Computing the weight \\(\\binom nk t^k(1-t)^{n-k}\\) at \\(t=\\tfrac12\\) as a fraction and comparing it with the computed readout.'),
        explanation: text(
            'Vsako število \\(\\binom nk\\) v vrstici pomnožimo s \\(t^k(1-t)^{n-k}\\) in dobimo utež mesta \\(k\\): \\(w_k(t)=\\binom nk t^k(1-t)^{n-k}\\). Višina stolpca nad mestom \\(k\\) je ta utež. Odčitek »Utež pri izbranem k (na 6 decimalk)« je izračunan z decimalnimi števili in zaokrožen na \\(6\\) decimalk, binomski simbol pa je natančen. Račun za odprti primer je spodaj. Napovej utež istega mesta pri \\(t=\\tfrac12\\), najprej kot ulomek in nato kot decimalko. Nato drsnik »Utež t« premakni na \\(0{,}5\\) (puščični tipki ali vlečenje, korak je \\(0{,}01\\)) in primerjaj.',
            'We multiply each number \\(\\binom nk\\) in the row by \\(t^k(1-t)^{n-k}\\) to get the weight of place \\(k\\): \\(w_k(t)=\\binom nk t^k(1-t)^{n-k}\\). The height of the bar above place \\(k\\) is this weight. The readout "Weight at the chosen k (rounded to 6 decimals)" is computed in doubles and rounded to \\(6\\) decimals, while the binomial coefficient is exact. The calculation for the open case is below. Predict the weight of the same place at \\(t=\\tfrac12\\), first as a fraction and then as a decimal. Then move the slider "Weight t" to \\(0.5\\) (arrow keys or dragging, the step is \\(0.01\\)) and compare.',
        ),
        formulaIds: [],
        workedExampleId: 'cb5-weight',
        observationPrompt: text(
            'Premakni drsnik »Utež t« na \\(0{,}5\\) in preberi utež pri izbranem \\(k\\).',
            'Move the slider "Weight t" to \\(0.5\\) and read the weight at the chosen \\(k\\).',
        ),
        expectedObservations: [
            text(
                'Pri \\(t=\\tfrac12\\) je \\(w_2=\\binom52\\cdot\\tfrac{1}{2^5}=\\tfrac{10}{32}=0{,}3125\\); odčitek pokaže \\(0{,}3125\\) (izračunano). Ulomek je natančen, odčitek je izračunan z decimalnimi števili in zaokrožen na \\(6\\) decimalk.',
                'At \\(t=\\tfrac12\\) we get \\(w_2=\\binom52\\cdot\\tfrac{1}{2^5}=\\tfrac{10}{32}=0.3125\\); the readout shows \\(0.3125\\) (computed). The fraction is exact, the readout is computed in doubles and rounded to \\(6\\) decimals.',
            ),
        ],
        scene: rowScene(CB5_SCENES.weights.id, CB5_SCENES.weights.spec,
            'Vrstica \\(n=5\\), \\(k=2\\), \\(t=0{,}3\\): utež pri izbranem \\(k\\) je \\(0{,}3087\\) (izračunano), vsota uteži \\(1\\).',
            'Row \\(n=5\\), \\(k=2\\), \\(t=0.3\\): the weight at the chosen \\(k\\) is \\(0.3087\\) (computed), the sum of the weights \\(1\\).'),
    }),
    step({
        id: 'cb5-bridge', order: 5,
        title: text('Most do Bernsteina in binomske porazdelitve', 'The bridge to Bernstein and the binomial distribution'),
        purpose: text('Povezati uteži z Bernsteinovimi baznimi funkcijami in binomsko porazdelitvijo ter vsoto uteži utemeljiti z binomskim izrekom.', 'Connecting the weights with the Bernstein basis functions and the binomial distribution, and arguing the sum of the weights with the binomial theorem.'),
        explanation: text(
            'Uteži \\(w_0(t),\\ldots,w_n(t)\\) vrstice \\(n\\) so iste številke, ki jih srečaš na dveh drugih mestih: v lekciji »Bernsteinove bazne funkcije« so to bazne funkcije stopnje \\(n\\), v lekciji »Od binomske k normalni porazdelitvi« pa so to verjetnosti, da je od \\(n\\) neodvisnih poskusov z verjetnostjo uspeha \\(p=t\\) natanko \\(k\\) uspešnih. Tu ne dodajamo nove vsebine, to sta obstoječi lekciji. Odčitek »Vsota uteži v vrstici (na 6 decimalk)« je v odprtem stanju že izpisan, napoved pa zadeva stanje po tvoji spremembi. Napovej z binomskim izrekom, kjer je \\(a=t\\) in \\(b=1-t\\), kakšna je vsota uteži pri \\(t=0{,}9\\), in ali se utež izbranega mesta \\(k\\) pri tem \\(t\\) poveča ali zmanjša; pri presoji pomisli, da je povprečno število uspehov v \\(n\\) poskusih \\(nt\\). Nato drsnik »Utež t« premakni na \\(0{,}9\\).',
            'The weights \\(w_0(t),\\ldots,w_n(t)\\) of row \\(n\\) are the same numbers that you meet in two other places: in the lesson "Bernstein basis functions" they are the basis functions of degree \\(n\\), and in the lesson "From binomial to normal" they are the probabilities that exactly \\(k\\) of \\(n\\) independent trials with success probability \\(p=t\\) succeed. We add no new content here, these are existing lessons. The readout "Sum of the weights in the row (rounded to 6 decimals)" is already printed in the open state, and the prediction concerns the state after your change. Using the binomial theorem with \\(a=t\\) and \\(b=1-t\\), predict the sum of the weights at \\(t=0.9\\), and whether the weight of the chosen place \\(k\\) grows or shrinks at this \\(t\\); for the judgement recall that the mean number of successes in \\(n\\) trials is \\(nt\\). Then move the slider "Weight t" to \\(0.9\\).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Premakni drsnik »Utež t« na \\(0{,}9\\) in preberi utež pri izbranem \\(k\\) ter vsoto uteži v vrstici.',
            'Move the slider "Weight t" to \\(0.9\\) and read the weight at the chosen \\(k\\) and the sum of the weights in the row.',
        ),
        expectedObservations: [
            text(
                'Vsota uteži ostane \\(1\\) (izračunano) pri vsakem \\(t\\): \\(\\sum_{k=0}^{n}\\binom nk t^k(1-t)^{n-k}=(t+(1-t))^n=1^n=1\\). To je argument iz binomskega izreka, odčitek je ponazoritev. Utež mesta \\(6\\) v vrstici \\(8\\) naraste približno z \\(0{,}003845\\) na približno \\(0{,}148803\\) (izračunano): povprečje pri \\(t=0{,}9\\) je \\(8\\cdot0{,}9=7{,}2\\), pri \\(t=0{,}25\\) pa \\(2\\), torej je mesto \\(6\\) pri večjem \\(t\\) bližje povprečju. Enake številke so Bernsteinove bazne funkcije in binomske verjetnosti.',
                'The sum of the weights stays \\(1\\) (computed) at every \\(t\\): \\(\\sum_{k=0}^{n}\\binom nk t^k(1-t)^{n-k}=(t+(1-t))^n=1^n=1\\). This is the argument from the binomial theorem, the readout is an illustration. The weight of place \\(6\\) in row \\(8\\) grows from about \\(0.003845\\) to about \\(0.148803\\) (computed): the mean at \\(t=0.9\\) is \\(8\\cdot0.9=7.2\\) and at \\(t=0.25\\) it is \\(2\\), so place \\(6\\) is closer to the mean at the larger \\(t\\). The same numbers are the Bernstein basis functions and the binomial probabilities.',
            ),
        ],
        scene: rowScene(CB5_SCENES.bridge.id, CB5_SCENES.bridge.spec,
            'Vrstica \\(n=8\\), \\(k=6\\), \\(t=0{,}25\\): utež pri izbranem \\(k\\) je približno \\(0{,}003845\\) (izračunano), vsota uteži \\(1\\).',
            'Row \\(n=8\\), \\(k=6\\), \\(t=0.25\\): the weight at the chosen \\(k\\) is about \\(0.003845\\) (computed), the sum of the weights \\(1\\).'),
    }),
    step({
        id: 'cb5-explore', order: 6,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Raziskati vsote vrstic, izmenične vsote, diagonale in uteži za poljubne vrednosti.', 'Exploring row sums, alternating sums, diagonals and weights for any values.'),
        explanation: text(
            'Spreminjaj vrstico \\(n\\) od \\(0\\) do \\(20\\), mesto \\(k\\) in utež \\(t\\) od \\(0\\) do \\(1\\) in preverjaj vse štiri trditve: vsota vrstice je \\(2^n\\), izmenična vsota je \\(0\\) za \\(n\\ge1\\), vsota po diagonali je en binomski simbol v naslednji vrstici in vsota uteži je \\(1\\). Vse so argumenti iz binomskega izreka in Pascalove identitete; stolpci in odčitki za en primer so ponazoritev, utež pa je izračunana z decimalnimi števili.',
            'Change the row \\(n\\) from \\(0\\) to \\(20\\), the place \\(k\\) and the weight \\(t\\) from \\(0\\) to \\(1\\) and check all four statements: the row sum is \\(2^n\\), the alternating sum is \\(0\\) for \\(n\\ge1\\), the diagonal sum is one binomial coefficient in the next row and the sum of the weights is \\(1\\). All are arguments from the binomial theorem and the Pascal identity; the bars and the readouts for one case are an illustration, and the weight is computed in doubles.',
        ),
        formulaIds: ['row-sum', 'alternating-sum', 'hockey-stick', 'weights-sum'],
        observationPrompt: text(
            'Najprej nastavi \\(n=20\\), nato \\(k=10\\) in \\(t=0{,}5\\), in preberi utež pri izbranem \\(k\\).',
            'First set \\(n=20\\), then \\(k=10\\) and \\(t=0.5\\), and read the weight at the chosen \\(k\\).',
        ),
        expectedObservations: [
            text(
                'Utež je \\(\\binom{20}{10}/2^{20}=184\\,756/1\\,048\\,576\\approx0{,}176197\\) (izračunano); to je verjetnost, da pri \\(20\\) metih poštenega kovanca pade natanko \\(10\\) grbov.',
                'The weight is \\(\\binom{20}{10}/2^{20}=184756/1048576\\approx0.176197\\) (computed); this is the probability that exactly \\(10\\) heads fall in \\(20\\) tosses of a fair coin.',
            ),
        ],
        scene: rowScene(CB5_SCENES.explore.id, CB5_SCENES.explore.spec,
            'Začetni primer: vrstica \\(n=6\\), \\(k=3\\), \\(t=0{,}5\\).',
            'The starting case: row \\(n=6\\), \\(k=3\\), \\(t=0.5\\).'),
    }),
];

// ---- Lesson ----------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-combinatorics-row-implementation',
        citation: 'Bezeg source: src/combinatorics/ (exact BigInt kernel and state model) and src/graphs/combinatorics/CountingTreeGraph.tsx, view row.',
        implementationCorrespondence: 'A scene sets the row n, the place k and the weight t of the counting graph; every count is an exact integer from the kernel, shown with thousands separators only in display; the weights are doubles rounded to six decimals and labelled computed; the text quotes only values of those scenes, values the learner reads after a change the text asks for, or plain arithmetic shown in the same step.',
    },
];

export const ROW_SUMS_LESSON_ID = 'counting-tree-cb5';

export const rowSumsLesson: GuidedLesson = {
    demonstrationId: 'counting-tree',
    title: text('Vsote v vrstici, uteži in most do Bernsteina', 'Row sums, weights and the bridge to Bernstein'),
    summary: text(
        'Števila v vrstici Pascalovega trikotnika seštejemo, seštejemo z izmeničnimi predznaki in po diagonali ter jih pomnožimo z utežmi \\(t^k(1-t)^{n-k}\\). Argumenti so binomski izrek in Pascalova identiteta; stolpci in odčitki za en primer so ponazoritev.',
        'We add the numbers in a row of the Pascal triangle, add them with alternating signs and along a diagonal, and multiply them by the weights \\(t^k(1-t)^{n-k}\\). The arguments are the binomial theorem and the Pascal identity; the bars and readouts for one case are an illustration.',
    ),
    prerequisites: [
        text('Lekciji o Pascalovi identiteti in o binomskem izreku s potmi.', 'The lessons on the Pascal identity and on the binomial theorem by paths.'),
        text('Neobvezno: lekciji »Bernsteinove bazne funkcije« in »Od binomske k normalni porazdelitvi«.', 'Optional: the lessons "Bernstein basis functions" and "From binomial to normal".'),
    ],
    learningGoals: [
        text('Utemeljiš, da je vsota vrstice \\(n\\) enaka \\(2^n\\), in da je izmenična vsota \\(0\\) za \\(n\\ge1\\), z binomskim izrekom.', 'Argue with the binomial theorem that the sum of row \\(n\\) is \\(2^n\\) and that the alternating sum is \\(0\\) for \\(n\\ge1\\).'),
        text('Utemeljiš vsoto po diagonali s ponavljanjem Pascalove identitete.', 'Argue the diagonal sum by repeating the Pascal identity.'),
        text('Izračunaš utež \\(\\binom nk t^k(1-t)^{n-k}\\), veš, da je njihova vsota \\(1\\), in jo prepoznaš kot Bernsteinovo bazno funkcijo in binomsko verjetnost.', 'Compute the weight \\(\\binom nk t^k(1-t)^{n-k}\\), know that they sum to \\(1\\) and recognise it as a Bernstein basis function and a binomial probability.'),
    ],
    formulaBlocks: formulas,
    workedExamples: examples,
    steps,
    sources,
    edgeCases: [
        text('Pri \\(n=0\\) je izmenična vsota \\(1\\); trditev, da je \\(0\\), velja samo za \\(n\\ge1\\).', 'At \\(n=0\\) the alternating sum is \\(1\\); the statement that it is \\(0\\) holds only for \\(n\\ge1\\).'),
        text('Vrstica \\(n\\) je omejena na \\(0\\) do \\(20\\), mesto \\(k\\) na \\(0\\) do \\(n\\) (zmanjšanje \\(n\\) zniža \\(k\\)), drsnik \\(t\\) pa ima korak \\(0{,}01\\) od \\(0\\) do \\(1\\).', 'The row \\(n\\) is limited to \\(0\\) to \\(20\\), the place \\(k\\) to \\(0\\) to \\(n\\) (lowering \\(n\\) lowers \\(k\\)), and the slider \\(t\\) has the step \\(0.01\\) from \\(0\\) to \\(1\\).'),
        text('Števila v vrstici so natančna cela števila; samo uteži so decimalna števila, zaokrožena na \\(6\\) decimalk.', 'The numbers in the row are exact integers; only the weights are doubles rounded to \\(6\\) decimals.'),
    ],
    unresolvedQuestions: [],
};
