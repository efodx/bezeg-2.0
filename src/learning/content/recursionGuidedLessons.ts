/**
 * Guided lessons of the recursion family, batch A (docs/specs/recursion-growth-lessons.md): RG1, a rule applied again and again (arithmetic and geometric sequences), and RG3,
 * compound interest and the number e, both on `recursion-growth` (GrowthGraph). Each is the lesson of one section of the recursion chapter (the chapter registry adapts them on
 * request; the lesson catalog holds none, as it keeps one lesson per Demonstration). Scenes use only the `recursion` actions the graph registers (`set-map`, `set-params`,
 * `set-interest`) and every scene starts from the Demonstration default and names what it sets. Every number the text quotes is a readout of the graph for that scene, a value the
 * learner reads after an action the text asks for, or a value of a formula shown in the same step; the numbers are listed per step in
 * docs/reviews/feature-streams/families-prep/notes/f3-rec-a.md. The growth graph shows one sequence kind at a time, so RG1 step 4 shows the two kinds in turn.
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

/** The stored sequence fields a scene may set (q is the ratio times 10). */
export interface RecursionSceneParams {
    readonly a1?: number;
    readonly d?: number;
    readonly q?: number;
    readonly n?: number;
}

/** The stored interest fields a scene may set (the rate is twice the percent). */
export interface RecursionSceneInterest {
    readonly capital?: number;
    readonly rate?: number;
    readonly years?: number;
    readonly parts?: number;
}

/** What a growth scene sets: the panel (the Demonstration default is the sequence), the sequence kind, the sequence fields or the interest fields. */
export interface RecursionSceneSpec {
    readonly panel?: 'sequence' | 'interest';
    readonly sequence?: 'arithmetic' | 'geometric';
    readonly params?: RecursionSceneParams;
    readonly interest?: RecursionSceneInterest;
}

/** The actions of a growth scene: the Demonstration default, the panel and kind, then the fields. */
export const recursionSceneActions = (id: string, spec: RecursionSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.panel !== undefined || spec.sequence !== undefined
        ? [{kind: 'recursion', operation: 'set-map', ...(spec.panel !== undefined ? {panel: spec.panel} : {}), ...(spec.sequence !== undefined ? {sequence: spec.sequence} : {})} as const]
        : []),
    ...(spec.params !== undefined ? [{kind: 'recursion', operation: 'set-params', ...spec.params} as const] : []),
    ...(spec.interest !== undefined ? [{kind: 'recursion', operation: 'set-interest', ...spec.interest} as const] : []),
];

const recursionScene = (id: string, spec: RecursionSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: recursionSceneActions(id, spec), expectedState: text(sl, en)});

/** RG1: the arithmetic rule with a1 = 3 and d = 2, the geometric rule with a1 = 3 and q = 2, and q = 1/2 (stored 5) for the limit. */
export const RG1_FIRST_TERMS = {params: {a1: 3, d: 2, n: 6}} as const;
export const RG1_DOUBLING_START = {sequence: 'geometric', params: {a1: 3, q: 20, n: 3}} as const;
export const RG1_DOUBLING = {sequence: 'geometric', params: {a1: 3, q: 20, n: 10}} as const;
export const RG1_HALVING = {sequence: 'geometric', params: {a1: 3, q: 5, n: 10}} as const;
export const RG1_EXPLORE = {sequence: 'geometric', params: {a1: 2, q: 15, n: 12}} as const;

/** RG3: 1000 at 5 % (stored rate 10), yearly and monthly, 10 years; the Demonstration default already has 12 parts. */
export const RG3_ONE_YEAR = {panel: 'interest', interest: {parts: 1, years: 1}} as const;
export const RG3_YEARLY = {panel: 'interest', interest: {parts: 1, years: 10}} as const;
export const RG3_MONTHLY = {panel: 'interest'} as const;
export const RG3_DAILY = {panel: 'interest', interest: {parts: 365, years: 10}} as const;
export const RG3_DOUBLING = {panel: 'interest', interest: {parts: 1, years: 14}} as const;
export const RG3_EXPLORE = {panel: 'interest', interest: {capital: 2000, rate: 6, years: 20, parts: 4}} as const;

// ---- RG1 -------------------------------------------------------------------------------------------------------------------------

const rg1Formulas: readonly FormulaBlock[] = [
    {
        id: 'arithmetic-closed',
        latex: 'a_{n+1}=a_n+d,\\qquad a_n=a_1+(n-1)d,\\qquad S_n=\\frac{n\\,(a_1+a_n)}{2}',
        notation: text(
            '\\(a_1\\) je prvi člen, \\(d\\) razlika, \\(a_n\\) \\(n\\)-ti člen in \\(S_n=a_1+a_2+\\dots+a_n\\) vsota prvih \\(n\\) členov.',
            '\\(a_1\\) is the first term, \\(d\\) the difference, \\(a_n\\) the \\(n\\)-th term and \\(S_n=a_1+a_2+\\dots+a_n\\) the sum of the first \\(n\\) terms.',
        ),
        explanation: text(
            'Člen \\(a_n\\) dobimo tako, da prvemu členu prištejemo \\(d\\) natanko \\((n-1)\\)-krat. Vsoto izračunamo z Gaussovim trikom: če jo zapišemo naprej in nazaj ter seštejemo člena na istem mestu, je vsak par enak \\(a_1+a_n\\) in parov je \\(n\\), zato je \\(2S_n=n(a_1+a_n)\\).',
            'The term \\(a_n\\) arises by adding \\(d\\) to the first term exactly \\((n-1)\\) times. The sum comes from Gauss\'s trick: write it forwards and backwards and add the terms in the same place; every pair equals \\(a_1+a_n\\) and there are \\(n\\) pairs, so \\(2S_n=n(a_1+a_n)\\).',
        ),
    },
    {
        id: 'geometric-closed',
        latex: 'a_{n+1}=q\\,a_n,\\qquad a_n=a_1q^{\\,n-1},\\qquad S_n=a_1\\,\\frac{q^n-1}{q-1}\\quad(q\\ne1)',
        notation: text(
            '\\(q\\) je količnik, torej število, s katerim pomnožimo vsak člen, da dobimo naslednjega; drugi simboli so kakor pri aritmetičnem zaporedju.',
            '\\(q\\) is the ratio, the number by which every term is multiplied to give the next one; the other symbols are as for the arithmetic sequence.',
        ),
        explanation: text(
            'Člen \\(a_n\\) dobimo tako, da prvi člen \\((n-1)\\)-krat pomnožimo s \\(q\\). Vsoto dobimo, če od \\(S_n\\) odštejemo \\(q\\,S_n\\): vsi členi razen prvega in zadnjega se odštejejo, ostane \\(S_n-qS_n=a_1-a_1q^n\\), od tod obrazec za \\(q\\ne1\\). Pri \\(q=1\\) so vsi členi enaki in je \\(S_n=n\\,a_1\\).',
            'The term \\(a_n\\) arises by multiplying the first term by \\(q\\) exactly \\((n-1)\\) times. For the sum subtract \\(q\\,S_n\\) from \\(S_n\\): all terms except the first and the last cancel and \\(S_n-qS_n=a_1-a_1q^n\\) remains, which gives the formula for \\(q\\ne1\\). For \\(q=1\\) all terms are equal and \\(S_n=n\\,a_1\\).',
        ),
    },
    {
        id: 'geometric-limit',
        latex: 'S_n=a_1\\,\\frac{1-q^n}{1-q}\\ \\longrightarrow\\ \\frac{a_1}{1-q}\\quad(|q|<1)',
        notation: text(
            'Puščica pomeni: vrednost \\(S_n\\) se približuje številu na desni, ko \\(n\\) raste; to število je limita vsote.',
            'The arrow means: the value of \\(S_n\\) approaches the number on the right as \\(n\\) grows; that number is the limit of the sum.',
        ),
        explanation: text(
            'Za \\(|q|<1\\) je \\(q^n\\) vse manjše in se približuje \\(0\\), zato se števec \\(1-q^n\\) približuje \\(1\\). Limita \\(\\dfrac{a_1}{1-q}\\) je vrednost zaprte oblike, ne zadnji izračunani člen ali vsota; pri \\(|q|\\ge1\\) limite vsote ni.',
            'For \\(|q|<1\\) the power \\(q^n\\) gets ever smaller and approaches \\(0\\), so the numerator \\(1-q^n\\) approaches \\(1\\). The limit \\(\\dfrac{a_1}{1-q}\\) is the value of the closed form, not the last computed term or sum; for \\(|q|\\ge1\\) there is no limit of the sum.',
        ),
    },
];

const rg1Examples: readonly WorkedExample[] = [
    {
        id: 'rg1-arithmetic',
        title: text('Aritmetično zaporedje \\(a_1=3\\), \\(d=2\\)', 'The arithmetic sequence \\(a_1=3\\), \\(d=2\\)'),
        calculationLatex: 'a_{10}=3+9\\cdot2=21,\\qquad S_{10}=\\frac{10\\,(3+21)}{2}',
        resultLatex: 'a_{10}=21,\\qquad S_{10}=120',
        check: text(
            'Odčitka grafa sta \\(21\\) in \\(120\\). Parov, ki imajo vsoto \\(24\\), je deset polovic, torej pet: \\(5\\cdot24=120\\).',
            'The readouts of the graph are \\(21\\) and \\(120\\). The pairs with sum \\(24\\) number ten halves, that is five: \\(5\\cdot24=120\\).',
        ),
    },
    {
        id: 'rg1-geometric',
        title: text('Geometrijsko zaporedje \\(a_1=3\\), \\(q=2\\)', 'The geometric sequence \\(a_1=3\\), \\(q=2\\)'),
        calculationLatex: 'a_{10}=3\\cdot2^{9}=1536,\\qquad S_{10}=3\\cdot\\frac{2^{10}-1}{2-1}=3\\cdot1023',
        resultLatex: 'a_{10}=1536,\\qquad S_{10}=3069',
        check: text(
            'Odčitka grafa sta \\(1536\\) in \\(3069\\). Obe vrednosti sta natančni, ker so \\(a_1\\) in \\(q\\) cela števila.',
            'The readouts of the graph are \\(1536\\) and \\(3069\\). Both values are exact, because \\(a_1\\) and \\(q\\) are whole numbers.',
        ),
    },
    {
        id: 'rg1-limit',
        title: text('Količnik \\(q=\\tfrac12\\): vsota in limita', 'The ratio \\(q=\\tfrac12\\): the sum and its limit'),
        calculationLatex: 'S_{10}=3\\cdot\\frac{1-\\left(\\tfrac12\\right)^{10}}{1-\\tfrac12}=6\\left(1-\\tfrac{1}{1024}\\right),\\qquad \\frac{a_1}{1-q}=\\frac{3}{1-\\tfrac12}',
        resultLatex: 'S_{10}\\approx5{,}994141,\\qquad \\frac{a_1}{1-q}=6',
        check: text(
            'Odčitek vsote je približno \\(5{,}994141\\) in je izračunan z decimalkami; odčitek limite \\(6\\) je vrednost obrazca \\(a_1/(1-q)\\). Razlika \\(6-S_{10}=\\tfrac{6}{1024}\\) je približno \\(0{,}005859\\), prav toliko kot deseti člen \\(\\tfrac{3}{512}\\).',
            'The readout of the sum is approximately \\(5.994141\\) and is computed with decimals; the readout of the limit \\(6\\) is the value of the formula \\(a_1/(1-q)\\). The difference \\(6-S_{10}=\\tfrac{6}{1024}\\) is approximately \\(0.005859\\), exactly as much as the tenth term \\(\\tfrac{3}{512}\\).',
        ),
    },
];

const rg1Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rg1-first-terms', order: 1,
        title: text('Pravilo, ki ga ponavljamo', 'A rule applied again and again'),
        purpose: text('Napovedati deseti člen, preden ga graf pokaže.', 'Predicting the tenth term before the graph shows it.'),
        explanation: text(
            'Zaporedje je seznam števil, ki jih štejemo z \\(n=1,2,3,\\dots\\). Rekurzivna formula pove, kako iz enega člena dobimo naslednjega. Tu je pravilo \\(a_{n+1}=a_n+2\\): vsakemu členu prištejemo \\(2\\). Prvi člen je \\(a_1=3\\), graf pa kaže prvih šest členov kot stolpce višine \\(3;\\ 5;\\ 7;\\ 9;\\ 11;\\ 13\\). Napoved: koliko bo \\(a_{10}\\)? Preden vpišeš \\(10\\) v polje Število členov, si odgovor zapiši; ponazoritev je zgolj stolpčni prikaz teh šestih členov.',
            'A sequence is a list of numbers counted by \\(n=1,2,3,\\dots\\). A recursive formula says how to get the next term from one term. Here the rule is \\(a_{n+1}=a_n+2\\): add \\(2\\) to every term. The first term is \\(a_1=3\\), and the graph shows the first six terms as bars of height \\(3;\\ 5;\\ 7;\\ 9;\\ 11;\\ 13\\). Prediction: what will \\(a_{10}\\) be? Write your answer down before typing \\(10\\) into the field Number of terms; the picture is only a bar display of these six terms.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved za \\(a_{10}\\), nato v polje Število členov vpiši \\(10\\) in preberi odčitek Člen (zaprta oblika).', 'Write down your prediction for \\(a_{10}\\), then type \\(10\\) into the field Number of terms and read the readout Term (closed form).'),
        expectedObservations: [text('Prvi členi \\(3;\\ 5;\\ 7;\\ 9;\\ 11;\\ 13\\); pri \\(n=10\\) odčitek kaže \\(21\\).', 'The first terms are \\(3;\\ 5;\\ 7;\\ 9;\\ 11;\\ 13\\); at \\(n=10\\) the readout shows \\(21\\).')],
        scene: recursionScene('rg1-first-terms-scene', RG1_FIRST_TERMS,
            'Aritmetično zaporedje, \\(a_1=3\\), \\(d=2\\), \\(n=6\\): prvi členi \\(3;\\ 5;\\ 7;\\ 9;\\ 11;\\ 13\\), \\(a_6=13\\).',
            'Arithmetic sequence, \\(a_1=3\\), \\(d=2\\), \\(n=6\\): the first terms are \\(3;\\ 5;\\ 7;\\ 9;\\ 11;\\ 13\\), \\(a_6=13\\).'),
    }),
    step({
        id: 'rg1-arithmetic-closed', order: 2,
        title: text('Zaprta oblika aritmetičnega zaporedja', 'The closed form of the arithmetic sequence'),
        purpose: text('Priti do desetega člena in do vsote brez računanja vseh členov.', 'Getting the tenth term and the sum without computing every term.'),
        explanation: text(
            'Argument: za deseti člen ni treba šteti po korakih. Od prvega člena do desetega je devet korakov, v vsakem prištejemo \\(2\\), zato je \\(a_{10}=3+9\\cdot2=21\\). Splošno velja \\(a_n=a_1+(n-1)d\\): to je zaprta oblika, formula, ki člen poda neposredno. Vsota prvih desetih členov je \\(S_{10}=\\tfrac{10\\,(3+21)}{2}=120\\); izpeljava je v obrazcu spodaj. Graf odčita isti števili \\(21\\) in \\(120\\), ker sta natančni (cela števila). Stolpci so le ponazoritev tega primera, obrazec pa velja za vsako razliko \\(d\\) in vsak \\(n\\).',
            'Argument: there is no need to count step by step for the tenth term. From the first term to the tenth there are nine steps, each adding \\(2\\), so \\(a_{10}=3+9\\cdot2=21\\). In general \\(a_n=a_1+(n-1)d\\): this is the closed form, a formula that gives a term directly. The sum of the first ten terms is \\(S_{10}=\\tfrac{10\\,(3+21)}{2}=120\\); the derivation is in the formula below. The graph reads off the same numbers \\(21\\) and \\(120\\), because they are exact (whole numbers). The bars only illustrate this example, while the formula holds for every difference \\(d\\) and every \\(n\\).',
        ),
        formulaIds: ['arithmetic-closed'],
        workedExampleId: 'rg1-arithmetic',
        observationPrompt: text('Preberi Člen in Vsoto (zaprta oblika) pri \\(n=10\\) in ju primerjaj z računom; nato spremeni razliko in preveri obrazec.', 'Read the Term and the Sum (closed form) at \\(n=10\\) and compare them with the calculation; then change the difference and check the formula.'),
        expectedObservations: [text('Člen \\(21\\) in vsota \\(120\\), kakor v računu.', 'The term \\(21\\) and the sum \\(120\\), as in the calculation.')],
        scene: recursionScene('rg1-arithmetic-closed-scene', {},
            'Aritmetično zaporedje, \\(a_1=3\\), \\(d=2\\), \\(n=10\\): \\(a_{10}=21\\), \\(S_{10}=120\\), natančno.',
            'Arithmetic sequence, \\(a_1=3\\), \\(d=2\\), \\(n=10\\): \\(a_{10}=21\\), \\(S_{10}=120\\), exact.'),
    }),
    step({
        id: 'rg1-geometric', order: 3,
        title: text('Pravilo z množenjem', 'A rule with multiplication'),
        purpose: text('Napovedati, ali geometrijsko zaporedje preseže \\(21\\), preden se pokaže deseti člen.', 'Predicting whether the geometric sequence exceeds \\(21\\) before the tenth term appears.'),
        explanation: text(
            'Zdaj vsak člen pomnožimo: \\(a_{n+1}=2a_n\\), prvi člen je spet \\(3\\). Graf je preklopljen na geometrijsko zaporedje in kaže prve tri člene \\(3;\\ 6;\\ 12\\) (ponazoritev). Argument: prvi člen pomnožimo \\((n-1)\\)-krat s \\(q\\), zato je zaprta oblika \\(a_n=a_1q^{n-1}\\), v tem primeru \\(a_n=3\\cdot2^{n-1}\\). Napoved: je \\(a_{10}\\) večji ali manjši od \\(21\\), to je desetega člena aritmetičnega zaporedja iz prejšnjega koraka? Zapiši odgovor, nato v polje Število členov vpiši \\(10\\).',
            'Now every term is multiplied: \\(a_{n+1}=2a_n\\), and the first term is \\(3\\) again. The graph is switched to the geometric sequence and shows the first three terms \\(3;\\ 6;\\ 12\\) (illustration). Argument: the first term is multiplied by \\(q\\) exactly \\((n-1)\\) times, so the closed form is \\(a_n=a_1q^{n-1}\\), here \\(a_n=3\\cdot2^{n-1}\\). Prediction: is \\(a_{10}\\) larger or smaller than \\(21\\), the tenth term of the arithmetic sequence in the previous step? Write down your answer, then type \\(10\\) into the field Number of terms.',
        ),
        formulaIds: ['geometric-closed'],
        observationPrompt: text('Zapiši napoved, nato vpiši \\(10\\) in preberi Člen (zaprta oblika).', 'Write down your prediction, then type \\(10\\) and read the Term (closed form).'),
        expectedObservations: [text('Pri \\(n=10\\) odčitek kaže \\(1536\\), veliko več kot \\(21\\).', 'At \\(n=10\\) the readout shows \\(1536\\), far more than \\(21\\).')],
        scene: recursionScene('rg1-geometric-scene', RG1_DOUBLING_START,
            'Geometrijsko zaporedje, \\(a_1=3\\), \\(q=2\\), \\(n=3\\): prvi členi \\(3;\\ 6;\\ 12\\).',
            'Geometric sequence, \\(a_1=3\\), \\(q=2\\), \\(n=3\\): the first terms are \\(3;\\ 6;\\ 12\\).'),
    }),
    step({
        id: 'rg1-compare', order: 4,
        title: text('Premica proti vedno hitrejši rasti', 'A straight line against ever faster growth'),
        purpose: text('Primerjati obe vrsti zaporedja pri \\(n=10\\).', 'Comparing both kinds of sequence at \\(n=10\\).'),
        explanation: text(
            'Graf pokaže eno vrsto zaporedja naenkrat, zato ju primerjamo zaporedoma. Zdaj je prikazano geometrijsko zaporedje \\(a_1=3\\), \\(q=2\\) pri \\(n=10\\): deseti člen je \\(1536\\). V seznamu Vrsta zaporedja izberi Aritmetično in preberi deseti člen \\(21\\), nato se vrni na Geometrijsko. Pri aritmetičnem zaporedju stolpci rastejo za enak korak in njihovi vrhovi ležijo na premici; pri geometrijskem rastejo za enak faktor in vrhovi ležijo na krivulji, ki se vedno bolj strmo vzpenja. Ponazoritev: stolpca kažeta samo ta dva primera; da je prirastek aritmetičnega zaporedja stalen, geometrijskega pa sorazmeren s členom, sledi iz pravil.',
            'The graph shows one kind of sequence at a time, so we compare them in turn. The geometric sequence \\(a_1=3\\), \\(q=2\\) is shown at \\(n=10\\): the tenth term is \\(1536\\). In the list Kind of sequence choose Arithmetic and read the tenth term \\(21\\), then go back to Geometric. For the arithmetic sequence the bars grow by an equal step and their tops lie on a line; for the geometric one they grow by an equal factor and the tops lie on a curve that climbs ever more steeply. Illustration: the bars show only these two examples; that the increase of the arithmetic sequence is constant while that of the geometric one is proportional to the term follows from the rules.',
        ),
        formulaIds: [],
        observationPrompt: text('Preberi Člen (zaprta oblika) pri obeh vrstah in primerjaj višini zadnjih stolpcev.', 'Read the Term (closed form) for both kinds and compare the heights of the last bars.'),
        expectedObservations: [text('Geometrijsko \\(1536\\), aritmetično \\(21\\); zadnji stolpec geometrijskega zaporedja je veliko višji.', 'Geometric \\(1536\\), arithmetic \\(21\\); the last bar of the geometric sequence is far higher.')],
        scene: recursionScene('rg1-compare-scene', RG1_DOUBLING,
            'Geometrijsko zaporedje, \\(a_1=3\\), \\(q=2\\), \\(n=10\\): \\(a_{10}=1536\\); aritmetično zaporedje \\(a_1=3\\), \\(d=2\\) ima \\(a_{10}=21\\).',
            'Geometric sequence, \\(a_1=3\\), \\(q=2\\), \\(n=10\\): \\(a_{10}=1536\\); the arithmetic sequence \\(a_1=3\\), \\(d=2\\) has \\(a_{10}=21\\).'),
    }),
    step({
        id: 'rg1-sums', order: 5,
        title: text('Vsoti obeh zaporedij', 'The sums of both sequences'),
        purpose: text('Izračunati vsoto geometrijskega zaporedja in jo primerjati z aritmetično.', 'Computing the sum of the geometric sequence and comparing it with the arithmetic one.'),
        explanation: text(
            'Argument: za geometrijsko zaporedje velja \\(S_n=a_1\\,\\tfrac{q^n-1}{q-1}\\); izpeljava je v obrazcu spodaj. Pri \\(a_1=3\\), \\(q=2\\), \\(n=10\\) je \\(S_{10}=3\\cdot1023=3069\\), graf pa odčita isto število. Pri aritmetičnem zaporedju z istim \\(a_1=3\\) je \\(S_{10}=120\\) (prejšnji koraki). Opazi: vsota geometrijskega zaporedja je skoraj dvakrat deseti člen, ker je vsak člen približno polovica naslednjega; to je zgolj lastnost tega primera, ne pravilo za vsak \\(q\\).',
            'Argument: for a geometric sequence \\(S_n=a_1\\,\\tfrac{q^n-1}{q-1}\\); the derivation is in the formula below. For \\(a_1=3\\), \\(q=2\\), \\(n=10\\) this is \\(S_{10}=3\\cdot1023=3069\\), and the graph reads off the same number. The arithmetic sequence with the same \\(a_1=3\\) has \\(S_{10}=120\\) (the previous steps). Notice: the sum of the geometric sequence is almost twice the tenth term, since every term is about half of the next one; this is a property of this example only, not a rule for every \\(q\\).',
        ),
        formulaIds: ['geometric-closed'],
        workedExampleId: 'rg1-geometric',
        observationPrompt: text('Preberi Člen in Vsoto (zaprta oblika) ter ju primerjaj z računom; nato spremeni količnik v \\(3\\) in preveri obrazec.', 'Read the Term and the Sum (closed form) and compare them with the calculation; then change the ratio to \\(3\\) and check the formula.'),
        expectedObservations: [text('Člen \\(1536\\) in vsota \\(3069\\), natančno.', 'The term \\(1536\\) and the sum \\(3069\\), exact.')],
        scene: recursionScene('rg1-sums-scene', RG1_DOUBLING,
            'Geometrijsko zaporedje, \\(a_1=3\\), \\(q=2\\), \\(n=10\\): \\(a_{10}=1536\\), \\(S_{10}=3069\\), natančno.',
            'Geometric sequence, \\(a_1=3\\), \\(q=2\\), \\(n=10\\): \\(a_{10}=1536\\), \\(S_{10}=3069\\), exact.'),
    }),
    step({
        id: 'rg1-halving', order: 6,
        title: text('Členi, ki se manjšajo', 'Terms that shrink'),
        purpose: text('Videti, da se vsota približuje limiti \\(6\\), ki jo da zaprta oblika.', 'Seeing that the sum approaches the limit \\(6\\) which the closed form gives.'),
        explanation: text(
            'Pri količniku \\(q=\\tfrac12\\) vsak člen razpolovimo: \\(3;\\ 1{,}5;\\ 0{,}75;\\ 0{,}375;\\ 0{,}1875;\\ 0{,}09375;\\dots\\) Deseti člen je približno \\(0{,}005859\\), vsota prvih desetih približno \\(5{,}994141\\); obe vrednosti sta izračunani z decimalkami, ne natančni. Odčitek Limita vsote kaže \\(6\\): to je vrednost obrazca \\(\\dfrac{a_1}{1-q}=\\dfrac{3}{1-\\frac12}\\), veljavnega za \\(|q|<1\\), in ne zadnja vsota ali zadnji člen. Argument: \\(S_n=6\\,(1-2^{-n})\\) in \\(2^{-n}\\) se približuje \\(0\\), zato se vsota približuje \\(6\\), a je nikoli ne doseže. V polje Število členov vpiši \\(3\\) in nato \\(10\\) in opazuj vsoto: približno \\(5{,}25\\), nato približno \\(5{,}994141\\). Več o limitah vrst je v lekciji o limiti vrste.',
            'With the ratio \\(q=\\tfrac12\\) every term is halved: \\(3;\\ 1.5;\\ 0.75;\\ 0.375;\\ 0.1875;\\ 0.09375;\\dots\\) The tenth term is approximately \\(0.005859\\) and the sum of the first ten approximately \\(5.994141\\); both values are computed with decimals, not exact. The readout Limit of the sum shows \\(6\\): this is the value of the formula \\(\\dfrac{a_1}{1-q}=\\dfrac{3}{1-\\frac12}\\), valid for \\(|q|<1\\), and not the last sum or the last term. Argument: \\(S_n=6\\,(1-2^{-n})\\) and \\(2^{-n}\\) approaches \\(0\\), so the sum approaches \\(6\\) but never reaches it. Type \\(3\\) and then \\(10\\) into the field Number of terms and watch the sum: approximately \\(5.25\\), then approximately \\(5.994141\\). More on limits of series is in the lesson on the limit of a series.',
        ),
        formulaIds: ['geometric-limit'],
        workedExampleId: 'rg1-limit',
        observationPrompt: text('Preberi Vsoto in Limito vsote pri \\(n=10\\); nato vpiši \\(3\\) in primerjaj vsoto z limito.', 'Read the Sum and the Limit of the sum at \\(n=10\\); then type \\(3\\) and compare the sum with the limit.'),
        expectedObservations: [text('Pri \\(n=10\\) približno \\(5{,}994141\\) in limita \\(6\\); pri \\(n=3\\) približno \\(5{,}25\\).', 'At \\(n=10\\) approximately \\(5.994141\\) and the limit \\(6\\); at \\(n=3\\) approximately \\(5.25\\).')],
        scene: recursionScene('rg1-halving-scene', RG1_HALVING,
            'Geometrijsko zaporedje, \\(a_1=3\\), \\(q=0{,}5\\), \\(n=10\\): približno \\(a_{10}=0{,}005859\\), \\(S_{10}=5{,}994141\\); limita vsote \\(6\\).',
            'Geometric sequence, \\(a_1=3\\), \\(q=0.5\\), \\(n=10\\): approximately \\(a_{10}=0.005859\\), \\(S_{10}=5.994141\\); the limit of the sum \\(6\\).'),
    }),
    step({
        id: 'rg1-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti obe pravili na svojih številih.', 'Trying both rules on your own numbers.'),
        explanation: text(
            'Spreminjaj prvi člen, razliko ali količnik in število členov, preklapljaj vrsto zaporedja. Napovej odčitka, preden ju prebereš: vsota aritmetičnega zaporedja je \\(\\tfrac{n\\,(a_1+a_n)}{2}\\), geometrijskega \\(a_1\\tfrac{q^n-1}{q-1}\\). Poskusi tudi negativne vrednosti. Graf pokaže, kdaj limita obstaja: le za geometrijsko zaporedje z \\(|q|<1\\). Zdaj je prikazano geometrijsko zaporedje \\(a_1=2\\), \\(q=1{,}5\\), \\(n=12\\); člena in vsote sta približni, izračunani z decimalkami.',
            'Change the first term, the difference or the ratio and the number of terms, and switch the kind of sequence. Predict the readouts before reading them: the sum of the arithmetic sequence is \\(\\tfrac{n\\,(a_1+a_n)}{2}\\), of the geometric one \\(a_1\\tfrac{q^n-1}{q-1}\\). Try negative values too. The graph shows when the limit exists: only for a geometric sequence with \\(|q|<1\\). The geometric sequence \\(a_1=2\\), \\(q=1.5\\), \\(n=12\\) is shown now; the term and the sum are approximate, computed with decimals.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči geometrijsko zaporedje z vsoto prvih desetih členov nad \\(1000\\) in aritmetično zaporedje, katerega členi postanejo negativni.', 'Find a geometric sequence whose first ten terms sum to more than \\(1000\\) and an arithmetic sequence whose terms become negative.'),
        expectedObservations: [text('Primer: \\(a_1=3\\), \\(q=2\\), \\(n=10\\) ima vsoto \\(3069\\); \\(a_1=10\\), \\(d=-3\\), \\(n=8\\) ima \\(a_8=-11\\) in \\(S_8=-4\\). Pri \\(a_1=2\\), \\(q=1{,}5\\), \\(n=12\\) limite vsote ni.', 'Example: \\(a_1=3\\), \\(q=2\\), \\(n=10\\) has sum \\(3069\\); \\(a_1=10\\), \\(d=-3\\), \\(n=8\\) has \\(a_8=-11\\) and \\(S_8=-4\\). For \\(a_1=2\\), \\(q=1.5\\), \\(n=12\\) there is no limit of the sum.')],
        scene: recursionScene('rg1-explore-scene', RG1_EXPLORE,
            'Geometrijsko zaporedje, \\(a_1=2\\), \\(q=1{,}5\\), \\(n=12\\): približno \\(a_{12}=172{,}995117\\), \\(S_{12}=514{,}985352\\); limite vsote ni.',
            'Geometric sequence, \\(a_1=2\\), \\(q=1.5\\), \\(n=12\\): approximately \\(a_{12}=172.995117\\), \\(S_{12}=514.985352\\); there is no limit of the sum.'),
    }),
];

// ---- RG3 -------------------------------------------------------------------------------------------------------------------------

const rg3Formulas: readonly FormulaBlock[] = [
    {
        id: 'interest-models',
        latex: 'K_1=P\\,(1+pt),\\qquad K_2=P\\,(1+p)^t,\\qquad K_3=P\\left(1+\\frac{p}{m}\\right)^{mt}',
        notation: text(
            '\\(P\\) je glavnica (začetni znesek), \\(p\\) letna obrestna mera kot ulomek (\\(5\\,\\%\\) je \\(0{,}05\\)), \\(t\\) čas v letih in \\(m\\) število obdobij v letu; \\(K_1\\) je vrednost po času \\(t\\) pri navadnem obrestovanju, \\(K_2\\) pri obrestnem obrestovanju, \\(K_3\\) pri relativnem obrestovanju z \\(m\\) obdobji v letu.',
            '\\(P\\) is the capital (the initial amount), \\(p\\) the yearly interest rate as a fraction (\\(5\\,\\%\\) is \\(0.05\\)), \\(t\\) the time in years and \\(m\\) the number of periods per year; \\(K_1\\) is the value after the time \\(t\\) with simple interest, \\(K_2\\) with compound interest, \\(K_3\\) with relative compounding in \\(m\\) periods per year.',
        ),
        explanation: text(
            'Pri navadnem obrestovanju se vsako leto prišteje isti znesek \\(Pp\\), zato vrednost raste linearno. Pri obrestnem obrestovanju se glavnica vsako leto pomnoži s \\(1+p\\), torej \\(t\\)-krat: geometrijsko zaporedje s količnikom \\(1+p\\). Če leto razdelimo na \\(m\\) obdobij in v vsakem obračunamo relativno mero \\(\\tfrac{p}{m}\\), se pomnožimo \\(mt\\)-krat s \\(1+\\tfrac{p}{m}\\).',
            'With simple interest the same amount \\(Pp\\) is added every year, so the value grows linearly. With compound interest the capital is multiplied by \\(1+p\\) every year, that is \\(t\\) times: a geometric sequence with ratio \\(1+p\\). If the year is split into \\(m\\) periods and the relative rate \\(\\tfrac{p}{m}\\) is applied in each, we multiply \\(mt\\) times by \\(1+\\tfrac{p}{m}\\).',
        ),
    },
    {
        id: 'conformal-rate',
        latex: 'r=(1+p)^{1/m}-1,\\qquad (1+r)^{mt}=\\left((1+r)^m\\right)^t=(1+p)^t',
        notation: text(
            '\\(r\\) je konformna obrestna mera za eno od \\(m\\) obdobij v letu; \\(p\\), \\(m\\) in \\(t\\) so kakor prej.',
            '\\(r\\) is the conformal rate for one of the \\(m\\) periods in a year; \\(p\\), \\(m\\) and \\(t\\) are as before.',
        ),
        explanation: text(
            'Konformna mera je izbrana tako, da \\(m\\) obdobij skupaj da faktor \\(1+p\\) enega leta: \\((1+r)^m=1+p\\). Zato je vrednost po \\(mt\\) obdobjih enaka vrednosti obrestnega obrestovanja po \\(t\\) letih; to je argument, produkt enakih faktorjev, in ne ponazoritev.',
            'The conformal rate is chosen so that \\(m\\) periods together give the factor \\(1+p\\) of one year: \\((1+r)^m=1+p\\). So the value after \\(mt\\) periods equals the compound value after \\(t\\) years; this is an argument, a product of equal factors, not an illustration.',
        ),
    },
    {
        id: 'euler-limit',
        latex: 'e=\\lim_{n\\to\\infty}\\left(1+\\frac1n\\right)^n,\\qquad \\left(1+\\frac{p}{m}\\right)^{mt}\\ \\longrightarrow\\ e^{pt}\\quad(m\\to\\infty)',
        notation: text(
            'Eulerjevo število \\(e\\) je limita zaporedja \\(\\left(1+\\tfrac1n\\right)^n\\), približno \\(2{,}718282\\); \\(n\\) je naravno število, ki raste.',
            'Euler\'s number \\(e\\) is the limit of the sequence \\(\\left(1+\\tfrac1n\\right)^n\\), approximately \\(2.718282\\); \\(n\\) is a natural number that grows.',
        ),
        explanation: text(
            'Če v \\(\\left(1+\\tfrac{p}{m}\\right)^{mt}\\) zapišemo \\(n=\\tfrac{m}{p}\\), je izraz \\(\\left(\\left(1+\\tfrac1n\\right)^n\\right)^{pt}\\), ko \\(m\\) raste, pa \\(n\\) raste in se prva potenca približuje številu \\(e\\) (limita velja tudi, ko \\(n\\) teče po realnih številih, ne le po naravnih, saj je \\(n\\) tu realno število). Zato je limita \\(e^{pt}\\) in vrednost zveznega obrestovanja \\(Pe^{pt}\\).',
            'If we write \\(n=\\tfrac{m}{p}\\) in \\(\\left(1+\\tfrac{p}{m}\\right)^{mt}\\), the expression is \\(\\left(\\left(1+\\tfrac1n\\right)^n\\right)^{pt}\\); as \\(m\\) grows, \\(n\\) grows and the inner power approaches \\(e\\) (the limit holds also when \\(n\\) runs through real numbers, not only natural ones, since \\(n\\) is a real number here). So the limit is \\(e^{pt}\\) and the value of continuous compounding is \\(Pe^{pt}\\).',
        ),
    },
    {
        id: 'doubling-time',
        latex: '(1+p)^t=2\\ \\Longleftrightarrow\\ t=\\frac{\\ln2}{\\ln(1+p)},\\qquad t\\approx\\frac{72}{100\\,p}',
        notation: text(
            '\\(t\\) je čas podvojitve v letih; \\(\\ln\\) je naravni logaritem. Desni približek je pravilo \\(72\\).',
            '\\(t\\) is the doubling time in years; \\(\\ln\\) is the natural logarithm. The right-hand approximation is the rule of \\(72\\).',
        ),
        explanation: text(
            'Čas podvojitve je rešitev enačbe \\((1+p)^t=2\\); logaritmiramo in dobimo \\(t=\\tfrac{\\ln2}{\\ln(1+p)}\\). Pravilo \\(72\\) je le približek za običajne mere, ne enakost.',
            'The doubling time solves the equation \\((1+p)^t=2\\); taking logarithms gives \\(t=\\tfrac{\\ln2}{\\ln(1+p)}\\). The rule of \\(72\\) is only an approximation for ordinary rates, not an equality.',
        ),
    },
];

const rg3Examples: readonly WorkedExample[] = [
    {
        id: 'rg3-compound',
        title: text('Glavnica \\(1000\\) po \\(10\\) letih pri \\(5\\,\\%\\)', 'A capital of \\(1000\\) after \\(10\\) years at \\(5\\,\\%\\)'),
        calculationLatex: 'K_1=1000\\,(1+0{,}05\\cdot10),\\qquad K_2=1000\\cdot1{,}05^{10}',
        resultLatex: 'K_1=1500,\\qquad K_2\\approx1628{,}89',
        check: text(
            'Odčitka grafa sta \\(1500\\) (\\(K_1\\), navadno) in \\(1628{,}89\\) (\\(K_2\\), obrestno); drugi je zaokrožen na cent, ker je \\(1{,}05^{10}\\) neskončno decimalno število.',
            'The readouts of the graph are \\(1500\\) (\\(K_1\\), simple) and \\(1628.89\\) (\\(K_2\\), compound); the second is rounded to the cent because \\(1.05^{10}\\) has no finite decimal form.',
        ),
    },
    {
        id: 'rg3-conformal',
        title: text('Konformna mera pri \\(m=12\\) in \\(p=0{,}05\\)', 'The conformal rate at \\(m=12\\) and \\(p=0.05\\)'),
        calculationLatex: 'r=1{,}05^{1/12}-1,\\qquad 1000\\,(1+r)^{120}=1000\\cdot1{,}05^{10}',
        resultLatex: 'r\\approx0{,}004074,\\qquad K\\approx1628{,}89',
        check: text(
            'Graf piše \\(0{,}407412\\,\\%\\) in po \\(120\\) obdobjih \\(1628{,}89\\). Relativna mera \\(\\tfrac{0{,}05}{12}\\) je večja, približno \\(0{,}416667\\,\\%\\) na mesec, zato relativno obrestovanje da več (\\(1647{,}01\\)).',
            'The graph writes \\(0.407412\\,\\%\\) and after \\(120\\) periods \\(1628.89\\). The relative rate \\(\\tfrac{0.05}{12}\\) is larger, approximately \\(0.416667\\,\\%\\) per month, so relative compounding gives more (\\(1647.01\\)).',
        ),
    },
    {
        id: 'rg3-doubling',
        title: text('Čas podvojitve pri \\(5\\,\\%\\)', 'The doubling time at \\(5\\,\\%\\)'),
        calculationLatex: 't=\\frac{\\ln2}{\\ln1{,}05},\\qquad \\frac{72}{5}',
        resultLatex: 't\\approx14{,}2067,\\qquad 14{,}4',
        check: text(
            'Odčitka grafa sta \\(14{,}2067\\) let (izračunano) in \\(14{,}4\\) leta (pravilo \\(72\\)). Pri celih letih: po \\(14\\) letih je vrednost \\(1979{,}93\\), po \\(15\\) letih \\(2078{,}93\\), torej se glavnica podvoji med \\(14\\). in \\(15\\). letom.',
            'The readouts of the graph are \\(14.2067\\) years (computed) and \\(14.4\\) years (the rule of \\(72\\)). In whole years: after \\(14\\) years the value is \\(1979.93\\), after \\(15\\) years \\(2078.93\\), so the capital doubles between year \\(14\\) and year \\(15\\).',
        ),
    },
];

const rg3Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'rg3-predict', order: 1,
        title: text('Navadno ali obrestno obrestovanje?', 'Simple or compound interest?'),
        purpose: text('Napovedati vrednost po desetih letih za obe vrsti obrestovanja.', 'Predicting the value after ten years for both kinds of interest.'),
        explanation: text(
            'Glavnica je \\(1000\\) evrov, letna obrestna mera \\(5\\,\\%\\). Pri navadnem obrestovanju se vsako leto prišteje enak znesek od začetne glavnice, pri obrestnem obrestovanju pa se obresti obrestujejo tudi same. Po enem letu sta vrednosti enaki: obe \\(1050\\). Napoved: koliko bo vrednost po \\(10\\) letih pri navadnem in koliko pri obrestnem obrestovanju? V polje Čas vpiši \\(10\\), potem ko zapišeš napoved.',
            'The capital is \\(1000\\) euros, the yearly interest rate \\(5\\,\\%\\). With simple interest the same amount, taken from the initial capital, is added every year; with compound interest the interest earns interest as well. After one year the values are equal: both \\(1050\\). Prediction: what will the value be after \\(10\\) years with simple and with compound interest? Type \\(10\\) into the field Time once you have written your prediction down.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato v polje Čas vpiši \\(10\\) in preberi obe vrednosti.', 'Write down your prediction, then type \\(10\\) into the field Time and read both values.'),
        expectedObservations: [text('Po enem letu je vsaka vrednost \\(1050\\); po \\(10\\) letih je navadno obrestovanje \\(1500\\), obrestno \\(1628{,}89\\) (zaokroženo na cent).', 'After one year each value is \\(1050\\); after \\(10\\) years simple interest gives \\(1500\\), compound interest \\(1628.89\\) (rounded to the cent).')],
        scene: recursionScene('rg3-predict-scene', RG3_ONE_YEAR,
            'Obrestovanje, \\(1000\\) pri \\(5\\,\\%\\) za \\(1\\) leto, letno obračunavanje: navadno \\(1050\\), obrestno \\(1050\\).',
            'Interest, \\(1000\\) at \\(5\\,\\%\\) for \\(1\\) year, yearly compounding: simple \\(1050\\), compound \\(1050\\).'),
    }),
    step({
        id: 'rg3-curves', order: 2,
        title: text('Premica in krivulja', 'A line and a curve'),
        purpose: text('Razložiti, zakaj je obrestno obrestovanje po desetih letih večje.', 'Explaining why compound interest is larger after ten years.'),
        explanation: text(
            'Po \\(10\\) letih je navadno obrestovanje \\(1500\\), obrestno pa \\(1628{,}89\\). Argument: navadno obrestovanje je aritmetično zaporedje z razliko \\(Pp=50\\), zato \\(K_1=P(1+pt)\\) leži na premici; obrestno je geometrijsko zaporedje s količnikom \\(1{,}05\\), zato \\(K_2=P(1+p)^t\\) leži na krivulji, ki je vedno strmejša (zaporedja iz prejšnje lekcije). Ponazoritev je zgolj ta primer: krivulja je nad premico za \\(t>1\\) pri vsaki pozitivni meri, enako velja po obrazcu za vsak \\(P\\). Odčitek Obrestno obrestovanje je zaokrožen na cent.',
            'After \\(10\\) years simple interest gives \\(1500\\) and compound interest \\(1628.89\\). Argument: simple interest is an arithmetic sequence with difference \\(Pp=50\\), so \\(K_1=P(1+pt)\\) lies on a line; compound interest is a geometric sequence with ratio \\(1.05\\), so \\(K_2=P(1+p)^t\\) lies on a curve that gets ever steeper (the sequences of the previous lesson). The picture is just this example: the curve lies above the line for \\(t>1\\) at every positive rate, and by the formula the same holds for every \\(P\\). The readout Compound interest is rounded to the cent.',
        ),
        formulaIds: ['interest-models'],
        workedExampleId: 'rg3-compound',
        observationPrompt: text('Preberi Navadno in Obrestno obrestovanje; nato podaljšaj čas na \\(20\\) let in primerjaj razliko.', 'Read the Simple and Compound interest; then extend the time to \\(20\\) years and compare the difference.'),
        expectedObservations: [text('Po \\(10\\) letih \\(1500\\) in \\(1628{,}89\\); razlika se z leti hitro veča.', 'After \\(10\\) years \\(1500\\) and \\(1628.89\\); the difference grows quickly with the years.')],
        scene: recursionScene('rg3-curves-scene', RG3_YEARLY,
            'Obrestovanje, \\(1000\\) pri \\(5\\,\\%\\) za \\(10\\) let, letno obračunavanje: navadno \\(1500\\), obrestno \\(1628{,}89\\).',
            'Interest, \\(1000\\) at \\(5\\,\\%\\) for \\(10\\) years, yearly compounding: simple \\(1500\\), compound \\(1628.89\\).'),
    }),
    step({
        id: 'rg3-parts', order: 3,
        title: text('Leto razdelimo na dele', 'Splitting the year into parts'),
        purpose: text('Napovedati, kako število obdobij v letu vpliva na vrednost.', 'Predicting how the number of periods per year affects the value.'),
        explanation: text(
            'Obrestujemo lahko tudi mesečno: leto razdelimo na \\(m=12\\) obdobij in v vsakem obračunamo \\(\\tfrac{p}{12}\\) obresti (relativna mera). Graf zdaj kaže \\(m=12\\): relativno obrestovanje po \\(10\\) letih je \\(1647{,}01\\), več kot letno obrestno \\(1628{,}89\\). Napoved: kaj se zgodi z vrednostjo, če \\(m\\) še povečaš? V seznamu Obdobij v letu izberi \\(1\\), \\(2\\), \\(4\\), \\(12\\) in \\(365\\) in vsakič preberi relativno obrestovanje: \\(1628{,}89\\), \\(1638{,}62\\), \\(1643{,}62\\), \\(1647{,}01\\) in \\(1648{,}66\\). Ponazoritev: vrednost raste z \\(m\\), a vedno počasneje; odčitek Zvezno obrestovanje \\(1648{,}72\\) je nad vsemi. Zneski so zaokroženi na cent.',
            'Interest can also be applied monthly: the year is split into \\(m=12\\) periods and \\(\\tfrac{p}{12}\\) interest is applied in each (the relative rate). The graph now shows \\(m=12\\): relative compounding after \\(10\\) years gives \\(1647.01\\), more than yearly compounding \\(1628.89\\). Prediction: what happens to the value if \\(m\\) grows further? In the list Periods per year choose \\(1\\), \\(2\\), \\(4\\), \\(12\\) and \\(365\\) and each time read the relative interest: \\(1628.89\\), \\(1638.62\\), \\(1643.62\\), \\(1647.01\\) and \\(1648.66\\). Illustration: the value grows with \\(m\\), but ever more slowly; the readout Continuous interest \\(1648.72\\) is above all of them. The amounts are rounded to the cent.',
        ),
        formulaIds: ['interest-models'],
        observationPrompt: text('Izberi vseh pet vrednosti \\(m\\) in zapiši relativno obrestovanje.', 'Choose all five values of \\(m\\) and write down the relative interest.'),
        expectedObservations: [text('\\(1628{,}89\\); \\(1638{,}62\\); \\(1643{,}62\\); \\(1647{,}01\\); \\(1648{,}66\\), vse pod zveznim \\(1648{,}72\\).', '\\(1628.89\\); \\(1638.62\\); \\(1643.62\\); \\(1647.01\\); \\(1648.66\\), all below the continuous \\(1648.72\\).')],
        scene: recursionScene('rg3-parts-scene', RG3_MONTHLY,
            'Obrestovanje, \\(1000\\) pri \\(5\\,\\%\\) za \\(10\\) let, \\(m=12\\): obrestno \\(1628{,}89\\), relativno \\(1647{,}01\\), zvezno \\(1648{,}72\\).',
            'Interest, \\(1000\\) at \\(5\\,\\%\\) for \\(10\\) years, \\(m=12\\): compound \\(1628.89\\), relative \\(1647.01\\), continuous \\(1648.72\\).'),
    }),
    step({
        id: 'rg3-conformal', order: 4,
        title: text('Konformna obrestna mera', 'The conformal rate'),
        purpose: text('Utemeljiti, zakaj mesečna konformna mera da isto letno rast.', 'Justifying why the monthly conformal rate gives the same yearly growth.'),
        explanation: text(
            'Relativna mesečna mera \\(\\tfrac{0{,}05}{12}\\) je približno \\(0{,}416667\\,\\%\\) in da več kot letnih \\(5\\,\\%\\). Konformna mera je tista, pri kateri se \\(12\\) mesecev sestavi natanko v letni faktor \\(1{,}05\\): \\(r=1{,}05^{1/12}-1\\). Graf kaže približno \\(0{,}407412\\,\\%\\) in po \\(120\\) konformnih obdobjih \\(1628{,}89\\), enako kakor letno obrestno obrestovanje. Argument: \\((1+r)^{12}=1{,}05\\), zato \\((1+r)^{120}=(1{,}05)^{10}\\); gre za produkt enakih faktorjev, ki velja za vsak \\(p\\) in \\(m\\). Primer \\(m=12\\) je zgolj ponazoritev.',
            'The relative monthly rate \\(\\tfrac{0.05}{12}\\) is approximately \\(0.416667\\,\\%\\) and gives more than the yearly \\(5\\,\\%\\). The conformal rate is the one at which \\(12\\) months compose exactly into the yearly factor \\(1.05\\): \\(r=1.05^{1/12}-1\\). The graph shows approximately \\(0.407412\\,\\%\\) and after \\(120\\) conformal periods \\(1628.89\\), the same as yearly compound interest. Argument: \\((1+r)^{12}=1.05\\), so \\((1+r)^{120}=(1.05)^{10}\\); this is a product of equal factors and holds for every \\(p\\) and \\(m\\). The case \\(m=12\\) is only an illustration.',
        ),
        formulaIds: ['conformal-rate'],
        workedExampleId: 'rg3-conformal',
        observationPrompt: text('Preberi Konformno obrestno mero in Vrednost po \\(120\\) konformnih obdobjih; nato izberi \\(m=4\\) in preveri, da je vrednost spet enaka.', 'Read the Conformal rate and the Value after \\(120\\) conformal periods; then choose \\(m=4\\) and check that the value is again equal.'),
        expectedObservations: [text('\\(0{,}407412\\,\\%\\) in \\(1628{,}89\\); pri \\(m=4\\) je mera \\(1{,}227223\\,\\%\\) in vrednost po \\(40\\) obdobjih spet \\(1628{,}89\\).', '\\(0.407412\\,\\%\\) and \\(1628.89\\); at \\(m=4\\) the rate is \\(1.227223\\,\\%\\) and the value after \\(40\\) periods is again \\(1628.89\\).')],
        scene: recursionScene('rg3-conformal-scene', RG3_MONTHLY,
            'Obrestovanje, \\(m=12\\): konformna mera \\(0{,}407412\\,\\%\\) na mesec, vrednost po \\(120\\) obdobjih \\(1628{,}89\\).',
            'Interest, \\(m=12\\): the conformal rate \\(0.407412\\,\\%\\) per month, the value after \\(120\\) periods \\(1628.89\\).'),
    }),
    step({
        id: 'rg3-e', order: 5,
        title: text('Eulerjevo število \\(e\\)', 'Euler\'s number \\(e\\)'),
        purpose: text('Spoznati število \\(e\\) kot limito in zvezno obrestovanje.', 'Meeting the number \\(e\\) as a limit and continuous compounding.'),
        explanation: text(
            'Pri \\(m=365\\) je relativno obrestovanje po \\(10\\) letih \\(1648{,}66\\), zvezno pa \\(1648{,}72\\): razlika je majhna. Vrednosti ne rasteta čez vse meje, ampak se približujeta limiti. Pri tej limiti se pojavi Eulerjevo število \\(e\\), definirano kot limita zaporedja \\(\\left(1+\\tfrac1n\\right)^n\\). Tabela pod odčitki kaže: \\(2\\) za \\(n=1\\), \\(2{,}593742\\) za \\(n=10\\), \\(2{,}704814\\) za \\(n=100\\), \\(2{,}716924\\) za \\(n=1000\\) in \\(2{,}71828\\) za \\(n=10^6\\); \\(e\\) je približno \\(2{,}718282\\). Tabela je izračunana in je ponazoritev limite, ne dokaz. Argument za zvezno obrestovanje: z \\(n=\\tfrac{m}{p}\\) preide \\(\\left(1+\\tfrac{p}{m}\\right)^{mt}\\) v \\(\\left(\\left(1+\\tfrac1n\\right)^n\\right)^{pt}\\), torej \\(Pe^{pt}=1000\\,e^{0{,}5}\\approx1648{,}72\\) (limita velja tudi, ko \\(n\\) teče po realnih številih, \\(n=\\tfrac{m}{p}\\) pa je realno). Večjih \\(n\\) od \\(10^6\\) graf ne ponuja: v računalnikovih decimalkah bi izgubili natančnost.',
            'At \\(m=365\\) relative compounding after \\(10\\) years gives \\(1648.66\\) and continuous compounding \\(1648.72\\): the difference is small. The values do not grow beyond all bounds but approach a limit. Euler\'s number \\(e\\) appears in this limit; it is defined as the limit of the sequence \\(\\left(1+\\tfrac1n\\right)^n\\). The table below the readouts shows: \\(2\\) for \\(n=1\\), \\(2.593742\\) for \\(n=10\\), \\(2.704814\\) for \\(n=100\\), \\(2.716924\\) for \\(n=1000\\) and \\(2.71828\\) for \\(n=10^6\\); \\(e\\) is approximately \\(2.718282\\). The table is computed and illustrates the limit; it is not a proof. Argument for continuous compounding: with \\(n=\\tfrac{m}{p}\\) the expression \\(\\left(1+\\tfrac{p}{m}\\right)^{mt}\\) becomes \\(\\left(\\left(1+\\tfrac1n\\right)^n\\right)^{pt}\\), hence \\(Pe^{pt}=1000\\,e^{0.5}\\approx1648.72\\) (the limit holds also as \\(n\\) runs through real numbers, and \\(n=\\tfrac{m}{p}\\) is real). The graph does not offer \\(n\\) above \\(10^6\\): the computer\'s decimals would lose accuracy.',
        ),
        formulaIds: ['euler-limit'],
        observationPrompt: text('Preberi tabelo za \\(n=1,\\ 10,\\ 100,\\ 1000,\\ 10^6\\) in jo primerjaj s številom \\(e\\).', 'Read the table for \\(n=1,\\ 10,\\ 100,\\ 1000,\\ 10^6\\) and compare it with the number \\(e\\).'),
        expectedObservations: [text('Vrednosti \\(2\\); \\(2{,}593742\\); \\(2{,}704814\\); \\(2{,}716924\\); \\(2{,}71828\\) se približujejo številu \\(2{,}718282\\), a ga ne dosežejo.', 'The values \\(2\\); \\(2.593742\\); \\(2.704814\\); \\(2.716924\\); \\(2.71828\\) approach \\(2.718282\\) but do not reach it.')],
        scene: recursionScene('rg3-e-scene', RG3_DAILY,
            'Obrestovanje, \\(m=365\\), \\(10\\) let: relativno \\(1648{,}66\\), zvezno \\(1648{,}72\\); tabela \\(\\left(1+\\tfrac1n\\right)^n\\) proti \\(e\\approx2{,}718282\\).',
            'Interest, \\(m=365\\), \\(10\\) years: relative \\(1648.66\\), continuous \\(1648.72\\); the table of \\(\\left(1+\\tfrac1n\\right)^n\\) towards \\(e\\approx2.718282\\).'),
    }),
    step({
        id: 'rg3-doubling', order: 6,
        title: text('Čas podvojitve', 'Doubling time'),
        purpose: text('Izračunati, v koliko letih se glavnica podvoji.', 'Computing in how many years the capital doubles.'),
        explanation: text(
            'Čas podvojitve je čas \\(t\\), pri katerem je \\((1+p)^t=2\\). Pri \\(5\\,\\%\\) graf piše približno \\(14{,}2067\\) leta, pravilo \\(72\\) pa \\(14{,}4\\) leta; pravilo je približek. Po \\(14\\) letih je obrestno obrestovanje \\(1979{,}93\\), manj od \\(2000\\); v polje Čas vpiši \\(15\\) in preberi \\(2078{,}93\\), več od \\(2000\\). Argument: logaritmiranje enačbe da \\(t=\\tfrac{\\ln2}{\\ln(1+p)}\\), od koder je čas podvojitve neodvisen od glavnice. Poskusi mero \\(10\\,\\%\\): graf piše približno \\(7{,}2725\\) leta, pravilo \\(72\\) pa \\(7{,}2\\); pravilo tu čas podceni, pri \\(5\\,\\%\\) ga precenjuje.',
            'The doubling time is the time \\(t\\) at which \\((1+p)^t=2\\). At \\(5\\,\\%\\) the graph writes approximately \\(14.2067\\) years and the rule of \\(72\\) gives \\(14.4\\) years; the rule is an approximation. After \\(14\\) years compound interest gives \\(1979.93\\), less than \\(2000\\); type \\(15\\) into the field Time and read \\(2078.93\\), more than \\(2000\\). Argument: taking logarithms of the equation gives \\(t=\\tfrac{\\ln2}{\\ln(1+p)}\\), so the doubling time does not depend on the capital. Try the rate \\(10\\,\\%\\): the graph writes approximately \\(7.2725\\) years and the rule of \\(72\\) gives \\(7.2\\); here the rule underestimates the time, at \\(5\\,\\%\\) it overestimates it.',
        ),
        formulaIds: ['doubling-time'],
        workedExampleId: 'rg3-doubling',
        observationPrompt: text('Preberi Čas podvojitve in Pravilo \\(72\\); vpiši \\(15\\) let in nato mero \\(10\\,\\%\\), čas \\(10\\) let.', 'Read the Doubling time and the Rule of \\(72\\); type \\(15\\) years and then the rate \\(10\\,\\%\\) with time \\(10\\) years.'),
        expectedObservations: [text('Po \\(14\\) letih \\(1979{,}93\\), po \\(15\\) letih \\(2078{,}93\\); čas podvojitve \\(14{,}2067\\) leta in pravilo \\(72\\) daje \\(14{,}4\\). Pri \\(10\\,\\%\\) \\(7{,}2725\\) in \\(7{,}2\\).', 'After \\(14\\) years \\(1979.93\\), after \\(15\\) years \\(2078.93\\); the doubling time \\(14.2067\\) years and the rule of \\(72\\) gives \\(14.4\\). At \\(10\\,\\%\\) \\(7.2725\\) and \\(7.2\\).')],
        scene: recursionScene('rg3-doubling-scene', RG3_DOUBLING,
            'Obrestovanje, \\(1000\\) pri \\(5\\,\\%\\) za \\(14\\) let, letno obračunavanje: obrestno \\(1979{,}93\\); čas podvojitve približno \\(14{,}2067\\) leta, pravilo \\(72\\): \\(14{,}4\\).',
            'Interest, \\(1000\\) at \\(5\\,\\%\\) for \\(14\\) years, yearly compounding: compound \\(1979.93\\); doubling time approximately \\(14.2067\\) years, rule of \\(72\\): \\(14.4\\).'),
    }),
    step({
        id: 'rg3-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Preizkusiti vse štiri modele na svojih številih.', 'Trying all four models on your own numbers.'),
        explanation: text(
            'Spreminjaj glavnico, mero, čas in število obdobij ter napovej vrednosti, preden jih prebereš. Zdaj je prikazano \\(2000\\) pri \\(3\\,\\%\\) za \\(20\\) let in \\(m=4\\): navadno \\(3200\\), obrestno \\(3612{,}22\\), relativno \\(3636{,}09\\), zvezno \\(3644{,}24\\), konformna mera približno \\(0{,}741707\\,\\%\\) na četrtletje. Pri pozitivni meri in celem številu let, vsaj \\(1\\) (to je obseg grafa), je vsaka od teh štirih vrednosti vsaj tako velika kot prejšnja (pri enem letu in \\(m=1\\) so prve tri enake); preveri to na svojih primerih. Zneski so zaokroženi na cent.',
            'Change the capital, the rate, the time and the number of periods and predict the values before reading them. Now \\(2000\\) at \\(3\\,\\%\\) for \\(20\\) years and \\(m=4\\) is shown: simple \\(3200\\), compound \\(3612.22\\), relative \\(3636.09\\), continuous \\(3644.24\\), the conformal rate approximately \\(0.741707\\,\\%\\) per quarter. For a positive rate and a whole number of years, at least \\(1\\) (the range of the graph), each of these four values is at least as large as the previous one (at one year and \\(m=1\\) the first three are equal); check this on your own examples. The amounts are rounded to the cent.',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči čas, pri katerem se \\(1000\\) pri \\(5\\,\\%\\) (letno obračunavanje) prvič podvoji, in poskusi mero, pri kateri se podvoji v \\(10\\) letih.', 'Find the time at which \\(1000\\) at \\(5\\,\\%\\) (yearly compounding) first doubles, and try a rate at which it doubles within \\(10\\) years.'),
        expectedObservations: [text('Podvoji se v \\(15\\). letu (\\(2078{,}93\\)); v \\(10\\) letih se podvoji na primer pri \\(10\\,\\%\\) letno: obrestno obrestovanje da \\(2593{,}74\\).', 'It doubles in year \\(15\\) (\\(2078.93\\)); within \\(10\\) years it doubles for example at \\(10\\,\\%\\) yearly: compound interest gives \\(2593.74\\).')],
        scene: recursionScene('rg3-explore-scene', RG3_EXPLORE,
            'Obrestovanje, \\(2000\\) pri \\(3\\,\\%\\) za \\(20\\) let, \\(m=4\\): navadno \\(3200\\), obrestno \\(3612{,}22\\), relativno \\(3636{,}09\\), zvezno \\(3644{,}24\\).',
            'Interest, \\(2000\\) at \\(3\\,\\%\\) for \\(20\\) years, \\(m=4\\): simple \\(3200\\), compound \\(3612.22\\), relative \\(3636.09\\), continuous \\(3644.24\\).'),
    }),
];

// ---- Lessons ---------------------------------------------------------------------------------------------------------------------

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-recursion-implementation',
        citation: 'Bezeg source: src/recursion/ (sequences, interest, state model) and src/graphs/recursion/GrowthGraph.tsx.',
        implementationCorrespondence: 'A scene sets the panel, the kind of sequence and the stored fields of the growth graph; every number is a readout of that graph (whole numbers exact, decimals computed in double precision, money rounded to the cent), the text quotes only values of those scenes, values the learner reads after an action the text asks for, or values of a formula shown in the same step. The limit of a geometric sum is the value of the closed form a1/(1-q), not an iterate; the table of (1+1/n)^n is computed and stops at n = 10^6.',
    },
];

const rg1: GuidedLesson = {
    demonstrationId: 'recursion-growth',
    title: text('Pravilo, ki ga ponavljamo: aritmetično in geometrijsko zaporedje', 'A rule applied again and again: arithmetic and geometric sequences'),
    summary: text(
        'Aritmetično zaporedje \\(a_{n+1}=a_n+d\\) raste s stalnim korakom, geometrijsko \\(a_{n+1}=q\\,a_n\\) s stalnim faktorjem. Vsako ima zaprto obliko za člen in vsoto, pri geometrijskem zaporedju s \\(|q|<1\\) se vsota približuje limiti \\(\\tfrac{a_1}{1-q}\\).',
        'The arithmetic sequence \\(a_{n+1}=a_n+d\\) grows by a constant step, the geometric one \\(a_{n+1}=q\\,a_n\\) by a constant factor. Each has a closed form for the term and the sum, and for a geometric sequence with \\(|q|<1\\) the sum approaches the limit \\(\\tfrac{a_1}{1-q}\\).',
    ),
    prerequisites: [text('Pojem zaporedja (lekcija o definiciji zaporedja) in računanje s potencami.', 'The notion of a sequence (the lesson on the definition of a sequence) and computing with powers.')],
    learningGoals: [
        text('Znaš prebrati rekurzivno formulo \\(a_{n+1}=a_n+d\\) in \\(a_{n+1}=q\\,a_n\\) in z njo izračunati prve člene.', 'Can read the recursive formulas \\(a_{n+1}=a_n+d\\) and \\(a_{n+1}=q\\,a_n\\) and compute the first terms with them.'),
        text('Veš zaprti obliki \\(a_n=a_1+(n-1)d\\) in \\(a_n=a_1q^{n-1}\\) ter vsoti \\(S_n\\) in znaš utemeljiti obe.', 'Know the closed forms \\(a_n=a_1+(n-1)d\\) and \\(a_n=a_1q^{n-1}\\) and the sums \\(S_n\\), and can justify both.'),
        text('Veš, da je limita vsote \\(\\tfrac{a_1}{1-q}\\) vrednost zaprte oblike za \\(|q|<1\\), ne zadnji izračunani člen.', 'Know that the limit of the sum \\(\\tfrac{a_1}{1-q}\\) is the value of the closed form for \\(|q|<1\\), not the last computed term.'),
    ],
    formulaBlocks: rg1Formulas,
    workedExamples: rg1Examples,
    steps: rg1Steps,
    sources,
    edgeCases: [
        text('Pri \\(q=1\\) so vsi členi enaki in \\(S_n=n\\,a_1\\); obrazec s ulomkom tedaj ne velja. Pri \\(|q|\\ge1\\) limite vsote ni.', 'For \\(q=1\\) all terms are equal and \\(S_n=n\\,a_1\\); the formula with a fraction does not apply then. For \\(|q|\\ge1\\) there is no limit of the sum.'),
        text('Pri celih \\(a_1\\) in \\(d\\) oziroma celem \\(q\\) so členi in vsote natančni (cela števila), sicer so izračunani z decimalkami in zato približni.', 'For whole \\(a_1\\) and \\(d\\), or whole \\(q\\), the terms and sums are exact (whole numbers); otherwise they are computed with decimals and so approximate.'),
        text('Stolpci kažejo posamezen primer; vsak obrazec velja za vse dovoljene vrednosti. Graf kaže eno vrsto zaporedja naenkrat, zato jih primerjamo zaporedoma.', 'The bars show one example; every formula holds for all allowed values. The graph shows one kind of sequence at a time, so they are compared in turn.'),
    ],
    unresolvedQuestions: [],
};

const rg3: GuidedLesson = {
    demonstrationId: 'recursion-growth',
    title: text('Obrestno obrestovanje in število \\(e\\)', 'Compound interest and the number \\(e\\)'),
    summary: text(
        'Navadno obrestovanje raste linearno, obrestno geometrijsko. Če leto razdelimo na \\(m\\) obdobij z relativno mero, se vrednost približuje \\(Pe^{pt}\\); število \\(e\\) je limita \\(\\left(1+\\tfrac1n\\right)^n\\), konformna mera pa da isto letno rast kakor obrestno obrestovanje.',
        'Simple interest grows linearly, compound interest geometrically. If the year is split into \\(m\\) periods with the relative rate, the value approaches \\(Pe^{pt}\\); the number \\(e\\) is the limit of \\(\\left(1+\\tfrac1n\\right)^n\\), and the conformal rate gives the same yearly growth as compound interest.',
    ),
    prerequisites: [text('Lekcija o aritmetičnem in geometrijskem zaporedju (prva lekcija poglavja) ter odstotki.', 'The lesson on arithmetic and geometric sequences (the first lesson of the chapter) and percentages.')],
    learningGoals: [
        text('Znaš pojasniti, zakaj navadno obrestovanje leži na premici, obrestno pa na naraščajoči krivulji.', 'Can explain why simple interest lies on a line and compound interest on a rising curve.'),
        text('Veš, da relativno obrestovanje z večanjem \\(m\\) raste proti \\(Pe^{pt}\\) in da je \\(e\\) limita \\(\\left(1+\\tfrac1n\\right)^n\\).', 'Know that relative compounding grows towards \\(Pe^{pt}\\) as \\(m\\) grows and that \\(e\\) is the limit of \\(\\left(1+\\tfrac1n\\right)^n\\).'),
        text('Znaš utemeljiti, da konformna mera da isto letno rast, in izračunati čas podvojitve.', 'Can justify that the conformal rate gives the same yearly growth and can compute the doubling time.'),
    ],
    formulaBlocks: rg3Formulas,
    workedExamples: rg3Examples,
    steps: rg3Steps,
    sources,
    edgeCases: [
        text('Tabela \\(\\left(1+\\tfrac1n\\right)^n\\) se konča pri \\(n=10^6\\): pri zelo velikih \\(n\\) računalnik z decimalkami izgubi natančnost in izraz da napačno vrednost.', 'The table of \\(\\left(1+\\tfrac1n\\right)^n\\) stops at \\(n=10^6\\): for very large \\(n\\) the computer\'s decimals lose accuracy and the expression gives a wrong value.'),
        text('Zneski so zaokroženi na cent, izračunani z decimalkami; zato so tudi čas podvojitve in konformna mera približni.', 'The amounts are rounded to the cent and computed with decimals; so the doubling time and the conformal rate are approximate as well.'),
        text('Izbrani primer \\(1000\\) pri \\(5\\,\\%\\) je ponazoritev; obrazci veljajo za vsako glavnico, mero in čas. Anuitete in amortizacija niso del lekcije.', 'The chosen example \\(1000\\) at \\(5\\,\\%\\) is an illustration; the formulas hold for every capital, rate and time. Annuities and amortization are not part of the lesson.'),
    ],
    unresolvedQuestions: [],
};

export const recursionSequenceLesson: GuidedLesson = rg1;
export const recursionInterestLesson: GuidedLesson = rg3;
