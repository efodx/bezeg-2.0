/**
 * Guided lessons of the School function graphs family (docs/specs/school-function-graphs-lessons.md), batch B: S3, polynomial zeros and
 * multiplicity, on `polynomial-zeros`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number
 * it quotes is a value of the scene it belongs to, and `schoolFunctionGraphsBatchBGuidedLessons.test.ts` checks that against the real graph
 * and against values recomputed without the kernel. Scenes use only the `function-choice`, `function-parameter` and `function-visibility`
 * actions the graph registers (`polynomial-example`, `poly-zero-1..5`, `k`, `polynomial-derivative`). Every scene sets the example first
 * (it fixes k and the zeros), then moves zeros, then the derivative switch, so it does not depend on the scene before it.
 * Kept apart from `schoolFunctionGraphsGuidedLessons.ts` (batch A) to keep both files short.
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

// ---------------------------------------------------------------------------------------------------------------- S3

export type PolynomialExample = 'default' | 'triple' | 'degree-five';

/** One zero moved by a scene: the 1-based slot of `poly-zero-<slot>` and its new position (on the 0.1 grid). */
export interface ZeroMove {readonly slot: 1 | 2 | 3 | 4 | 5; readonly z: number}

const zeroParameter = (slot: ZeroMove['slot']) => `poly-zero-${slot}` as const;

/**
 * An S3 scene from the default scene: the example (its k and zeros), then the zero moves in the order given (a move onto another zero merges
 * the two, so the order is part of the scene), then the derivative p' switch.
 */
const polynomialScene = (
    id: string, example: PolynomialExample, moves: readonly ZeroMove[], derivativeVisible: boolean, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'polynomial-example', value: example},
        ...moves.map((move): LessonAction => ({kind: 'function-parameter', name: zeroParameter(move.slot), value: move.z})),
        {kind: 'function-visibility', target: 'polynomial-derivative', visible: derivativeVisible},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const polynomialLesson: GuidedLesson = {
    demonstrationId: 'polynomial-zeros',
    title: text('Ničle polinoma in večkratnost', 'Polynomial zeros and multiplicity'),
    summary: text(
        'Polinom v produktni obliki \\(p(x)=k\\,(x-z_1)^{m_1}\\cdots(x-z_r)^{m_r}\\) ima ničle \\(z_i\\) z večkratnostmi \\(m_i\\). Pri lihi večkratnosti graf os \\(x\\) seka, pri sodi se je dotika; večja ko je večkratnost, bolj raven je graf v ničli, in odvod je v vsaki ničli večkratnosti vsaj \\(2\\) enak \\(0\\). Stopnja je vsota večkratnosti, njen predznak in sodost določata obnašanje grafa za velike \\(|x|\\), presečišče z osjo \\(y\\) pa je \\(p(0)=k\\prod(-z_i)^{m_i}\\).',
        'A polynomial in product form \\(p(x)=k\\,(x-z_1)^{m_1}\\cdots(x-z_r)^{m_r}\\) has zeros \\(z_i\\) with multiplicities \\(m_i\\). At an odd multiplicity the graph crosses the \\(x\\)-axis, at an even one it touches it; the higher the multiplicity, the flatter the graph is at the zero, and the derivative is \\(0\\) at every zero of multiplicity at least \\(2\\). The degree is the sum of the multiplicities, its sign and parity determine the behaviour of the graph for large \\(|x|\\), and the \\(y\\)-intercept is \\(p(0)=k\\prod(-z_i)^{m_i}\\).',
    ),
    prerequisites: [
        text('Potrebno je razumevanje funkcije kot pravila z grafom, kot v poglavju o funkcijah.', 'Assumes a function as a rule with a graph, as in the chapter on functions.'),
        text('Koristna, a ne nujna je lekcija o preoblikovanju grafov, ker je tam prikazano, kako parametri premaknejo in raztegnejo graf.', 'The lesson on graph transformations is helpful but not required: it shows how parameters shift and stretch a graph.'),
    ],
    learningGoals: [
        text('Iz zapisa \\(k\\,(x-z_1)^{m_1}\\cdots\\) napoveš, kje graf seka os \\(x\\) in kje se je dotika.', 'From the form \\(k\\,(x-z_1)^{m_1}\\cdots\\) predict where the graph crosses the \\(x\\)-axis and where it touches it.'),
        text('Razložiš, zakaj je odvod v ničli večkratnosti vsaj \\(2\\) enak \\(0\\) in zakaj je graf tam raven.', 'Explain why the derivative is \\(0\\) at a zero of multiplicity at least \\(2\\) and why the graph is flat there.'),
        text('Iz stopnje in predznaka vodilnega koeficienta \\(k\\) napoveš obnašanje grafa za velike \\(|x|\\) ter izračunaš presečišče z osjo \\(y\\).', 'From the degree and the sign of the leading coefficient \\(k\\) predict the behaviour of the graph for large \\(|x|\\) and compute the \\(y\\)-intercept.'),
    ],
    formulaBlocks: [
        {
            id: 'poly-product',
            latex: 'p(x)=k\\,(x-z_1)^{m_1}(x-z_2)^{m_2}\\cdots(x-z_r)^{m_r}',
            notation: text(
                '\\(k\\ne0\\) je vodilni koeficient, \\(z_i\\) so ničle, \\(m_i\\) pa njihove večkratnosti (tu \\(1\\), \\(2\\) ali \\(3\\)); stopnja je \\(m_1+\\dots+m_r\\le5\\).',
                '\\(k\\ne0\\) is the leading coefficient, the \\(z_i\\) are the zeros and the \\(m_i\\) their multiplicities (here \\(1\\), \\(2\\) or \\(3\\)); the degree is \\(m_1+\\dots+m_r\\le5\\).',
            ),
            explanation: text(
                'Faktor \\((x-z)^m\\) v bližini \\(z\\) deluje kot \\(c\\,(x-z)^m\\) z nekim \\(c\\ne0\\). Pri lihem \\(m\\) zamenja predznak, pri sodem ga ohrani, zato graf os \\(x\\) v lihi ničli seka, v sodi pa se je dotika. Odvod \\((x-z)^m\\) je \\(m\\,(x-z)^{m-1}\\), ki je za \\(m\\ge2\\) v \\(z\\) enak \\(0\\). Za velike \\(|x|\\) prevlada vodilni člen \\(k\\,x^n\\) s stopnjo \\(n=m_1+\\dots+m_r\\).',
                'Near \\(z\\) the factor \\((x-z)^m\\) acts like \\(c\\,(x-z)^m\\) for some \\(c\\ne0\\). For odd \\(m\\) it changes sign, for even \\(m\\) it keeps it, so the graph crosses the \\(x\\)-axis at an odd zero and touches it at an even one. The derivative of \\((x-z)^m\\) is \\(m\\,(x-z)^{m-1}\\), which is \\(0\\) at \\(z\\) for \\(m\\ge2\\). For large \\(|x|\\) the leading term \\(k\\,x^n\\) with \\(n=m_1+\\dots+m_r\\) dominates.',
            ),
        },
        {
            id: 'poly-intercept',
            latex: 'p(0)=k\\prod_i(-z_i)^{m_i}',
            notation: text(
                'Vrednost v \\(x=0\\) je presečišče grafa z osjo \\(y\\); \\(z_i\\) so ničle in \\(m_i\\) njihove večkratnosti.',
                'The value at \\(x=0\\) is the \\(y\\)-intercept of the graph; the \\(z_i\\) are the zeros and the \\(m_i\\) their multiplicities.',
            ),
            explanation: text(
                'V \\(x=0\\) je vsak faktor \\((0-z_i)^{m_i}=(-z_i)^{m_i}\\), zato je vrednost produkt teh števil, pomnožen s \\(k\\). Če je katera od ničel enaka \\(0\\), je presečišče enako \\(0\\).',
                'At \\(x=0\\) every factor is \\((0-z_i)^{m_i}=(-z_i)^{m_i}\\), so the value is the product of these numbers times \\(k\\). If one of the zeros is \\(0\\), the intercept is \\(0\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'poly-default-intercept',
            title: text('Presečišče z osjo \\(y\\) polinoma \\((x+2)(x-1)^2\\)', 'The \\(y\\)-intercept of \\((x+2)(x-1)^2\\)'),
            calculationLatex: '1\\cdot(0+2)^1\\cdot(0-1)^2',
            resultLatex: '2',
            check: text(
                'Ničli sta \\(z_1=-2\\) z \\(m_1=1\\) in \\(z_2=1\\) z \\(m_2=2\\), \\(k=1\\): \\(1\\cdot2^1\\cdot(-1)^2=2\\). Preverimo z razvojem \\((x+2)(x-1)^2=x^3-3x+2\\), ki ima v \\(x=0\\) vrednost \\(2\\).',
                'The zeros are \\(z_1=-2\\) with \\(m_1=1\\) and \\(z_2=1\\) with \\(m_2=2\\), and \\(k=1\\): \\(1\\cdot2^1\\cdot(-1)^2=2\\). Check with the expansion \\((x+2)(x-1)^2=x^3-3x+2\\), whose value at \\(x=0\\) is \\(2\\).',
            ),
        },
        {
            id: 'poly-default-derivative',
            title: text('Odvod v dvojni ničli \\(x=1\\)', 'The derivative at the double zero \\(x=1\\)'),
            calculationLatex: 'p^{\\prime}(1)=3\\cdot1^2-3',
            resultLatex: '0',
            check: text(
                'Iz \\(p(x)=x^3-3x+2\\) sledi \\(p^{\\prime}(x)=3x^2-3=3(x-1)(x+1)\\), zato je \\(p^{\\prime}(1)=0\\). Drugi odvod \\(p^{\\prime\\prime}(x)=6x\\) je v \\(x=1\\) enak \\(6>0\\): graf se osi \\(x\\) dotakne od zgoraj in ima tam lokalni minimum. Odvod ima ničlo tudi pri \\(x=-1\\), ki ni ničla polinoma \\(p\\): to je lokalni maksimum.',
                'From \\(p(x)=x^3-3x+2\\) we get \\(p^{\\prime}(x)=3x^2-3=3(x-1)(x+1)\\), so \\(p^{\\prime}(1)=0\\). The second derivative \\(p^{\\prime\\prime}(x)=6x\\) equals \\(6>0\\) at \\(x=1\\): the graph touches the \\(x\\)-axis from above and has a local minimum there. The derivative also vanishes at \\(x=-1\\), which is not a zero of \\(p\\): that is a local maximum.',
            ),
        },
    ],
    steps: [
        step({
            id: 'poly-signs', order: 1,
            title: text('Ničle in predznaki', 'Zeros and signs'),
            purpose: text('Napovedati, kje je polinom pozitiven in kje negativen, še preden pogledaš graf.', 'Predicting where the polynomial is positive and where negative before looking at the graph.'),
            explanation: text(
                'Polinom je \\(p(x)=(x+2)(x-1)^2\\), torej \\(k=1\\), enojna ničla \\(-2\\) in dvojna ničla \\(1\\). Premakni ničli in si zamisli, kako se predznak spreminja od leve proti desni, nato preveri na grafu. Faktor \\((x-1)^2\\) ni nikoli negativen, zato predznak \\(p\\) določa le faktor \\(x+2\\).',
                'The polynomial is \\(p(x)=(x+2)(x-1)^2\\), so \\(k=1\\), a simple zero \\(-2\\) and a double zero \\(1\\). Move the zeros and picture how the sign changes from left to right, then check on the graph. The factor \\((x-1)^2\\) is never negative, so only the factor \\(x+2\\) decides the sign of \\(p\\).',
            ),
            formulaIds: ['poly-product'],
            observationPrompt: text('Napovej predznak levo od \\(-2\\), med \\(-2\\) in \\(1\\) ter desno od \\(1\\), nato preveri.', 'Predict the sign to the left of \\(-2\\), between \\(-2\\) and \\(1\\), and to the right of \\(1\\), then check.'),
            expectedObservations: [text('Levo od \\(-2\\) je graf pod osjo \\(x\\), med \\(-2\\) in \\(1\\) ter desno od \\(1\\) pa nad njo; predznak se spremeni le v \\(-2\\).', 'To the left of \\(-2\\) the graph is below the \\(x\\)-axis, between \\(-2\\) and \\(1\\) and to the right of \\(1\\) it is above it; the sign changes only at \\(-2\\).')],
            scene: polynomialScene('poly-signs-default', 'default', [], false,
                'Polinom \\((x+2)(x-1)^2\\): \\(k=1\\), enojna ničla \\(-2\\), dvojna ničla \\(1\\); odvod je skrit.',
                'The polynomial \\((x+2)(x-1)^2\\): \\(k=1\\), a simple zero \\(-2\\), a double zero \\(1\\); the derivative is hidden.'),
        }),
        step({
            id: 'poly-simple', order: 2,
            title: text('Enojna ničla seka', 'A simple zero crosses'),
            purpose: text('Videti, da graf v ničli lihe večkratnosti preide z ene strani osi \\(x\\) na drugo.', 'Seeing that at a zero of odd multiplicity the graph passes from one side of the \\(x\\)-axis to the other.'),
            explanation: text(
                'Enojno ničlo smo premaknili z \\(-2\\) na \\(-3\\), tako da je \\(p(x)=(x+3)(x-1)^2\\). Faktor \\(x+3\\) zamenja predznak v \\(-3\\), zato graf v \\(x=-3\\) os \\(x\\) seka, v \\(x=1\\) pa se je še vedno dotika. Premik ničle ne spremeni njene večkratnosti.',
                'The simple zero has been moved from \\(-2\\) to \\(-3\\), so \\(p(x)=(x+3)(x-1)^2\\). The factor \\(x+3\\) changes sign at \\(-3\\), so the graph crosses the \\(x\\)-axis at \\(x=-3\\) and still touches it at \\(x=1\\). Moving a zero does not change its multiplicity.',
            ),
            formulaIds: ['poly-product'],
            observationPrompt: text('Povleci enojno ničlo in preveri, da graf vedno seka os \\(x\\) v njej.', 'Drag the simple zero and check that the graph always crosses the \\(x\\)-axis at it.'),
            expectedObservations: [text('V enojni ničli \\(-3\\) graf preide s spodnje strani osi \\(x\\) na zgornjo, v dvojni ničli \\(1\\) pa ostane nad osjo.', 'At the simple zero \\(-3\\) the graph passes from below the \\(x\\)-axis to above it, at the double zero \\(1\\) it stays above the axis.')],
            scene: polynomialScene('poly-simple-crosses', 'default', [{slot: 1, z: -3}], false,
                'Polinom \\((x+3)(x-1)^2\\): enojna ničla \\(-3\\), dvojna ničla \\(1\\), \\(k=1\\); odvod je skrit.',
                'The polynomial \\((x+3)(x-1)^2\\): a simple zero \\(-3\\), a double zero \\(1\\), \\(k=1\\); the derivative is hidden.'),
        }),
        step({
            id: 'poly-double', order: 3,
            title: text('Dvojna ničla se dotika', 'A double zero touches'),
            purpose: text('Videti, da se graf v ničli sode večkratnosti dotakne osi \\(x\\) in da je tam odvod enak \\(0\\).', 'Seeing that at a zero of even multiplicity the graph touches the \\(x\\)-axis and the derivative is \\(0\\) there.'),
            explanation: text(
                'Spet je \\(p(x)=(x+2)(x-1)^2=x^3-3x+2\\), odvod \\(p^{\\prime}\\) pa je prikazan. Ker je \\(p^{\\prime}(x)=3x^2-3\\), je \\(p^{\\prime}(1)=0\\) in \\(p^{\\prime\\prime}(1)=6>0\\): v dvojni ničli \\(x=1\\) je tangenta vodoravna, graf se osi \\(x\\) dotakne od zgoraj in ostane nad njo. Odvod je \\(0\\) tudi v \\(x=-1\\), a tam \\(p(-1)\\ne0\\), zato to ni ničla.',
                'Again \\(p(x)=(x+2)(x-1)^2=x^3-3x+2\\), and the derivative \\(p^{\\prime}\\) is shown. Since \\(p^{\\prime}(x)=3x^2-3\\), we have \\(p^{\\prime}(1)=0\\) and \\(p^{\\prime\\prime}(1)=6>0\\): at the double zero \\(x=1\\) the tangent is horizontal, the graph touches the \\(x\\)-axis from above and stays above it. The derivative is \\(0\\) at \\(x=-1\\) as well, but \\(p(-1)\\ne0\\) there, so that is not a zero.',
            ),
            formulaIds: ['poly-product'],
            workedExampleId: 'poly-default-derivative',
            observationPrompt: text('Poišči, kje prikazani odvod seka os \\(x\\), in preveri, katera od teh točk je ničla polinoma.', 'Find where the shown derivative crosses the \\(x\\)-axis and check which of those points is a zero of the polynomial.'),
            expectedObservations: [text('Odvod seka os \\(x\\) v \\(-1\\) in v \\(1\\); le \\(x=1\\) je ničla polinoma, dvojna, in tam se graf dotakne osi \\(x\\).', 'The derivative crosses the \\(x\\)-axis at \\(-1\\) and at \\(1\\); only \\(x=1\\) is a zero of the polynomial, a double one, and there the graph touches the \\(x\\)-axis.')],
            scene: polynomialScene('poly-double-touches', 'default', [], true,
                'Polinom \\((x+2)(x-1)^2\\) z enojno ničlo \\(-2\\) in dvojno ničlo \\(1\\), \\(p^{\\prime}(1)=0\\); odvod \\(p^{\\prime}\\) je viden.',
                'The polynomial \\((x+2)(x-1)^2\\) with the simple zero \\(-2\\) and the double zero \\(1\\), \\(p^{\\prime}(1)=0\\); the derivative \\(p^{\\prime}\\) is visible.'),
        }),
        step({
            id: 'poly-triple', order: 4,
            title: text('Trojna ničla seka ravno', 'A triple zero crosses flatly'),
            purpose: text('Primerjati trojno ničlo z dvojno: oba imata vodoravno tangento, a trojna graf prenese na drugo stran osi.', 'Comparing a triple zero with a double one: both have a horizontal tangent, but the triple one carries the graph to the other side of the axis.'),
            explanation: text(
                'Polinom je \\(p(x)=(x-1)^3\\): ena ničla \\(1\\) z večkratnostjo \\(3\\). Do njega pridemo tudi iz prejšnjega primera: če enojno ničlo povlečeš na dvojno, se ničli združita v trojno ničlo (njuni večkratnosti se seštejeta) in pojasnilo to objavi. Liha večkratnost pomeni, da graf os \\(x\\) seka, večkratnost več kot \\(1\\) pa, da je odvod tam enak \\(0\\): \\(p^{\\prime}(x)=3(x-1)^2\\), \\(p^{\\prime}(1)=0\\). Tangenta je vodoravna, graf os seka in je v \\(x=1\\) prevoj.',
                'The polynomial is \\(p(x)=(x-1)^3\\): one zero \\(1\\) of multiplicity \\(3\\). You also reach it from the previous example: if you drag the simple zero onto the double one, the two zeros merge into a triple zero (their multiplicities add) and the text announces it. An odd multiplicity means the graph crosses the \\(x\\)-axis, and a multiplicity above \\(1\\) means the derivative is \\(0\\) there: \\(p^{\\prime}(x)=3(x-1)^2\\), \\(p^{\\prime}(1)=0\\). The tangent is horizontal, the graph crosses the axis and \\(x=1\\) is an inflection point.',
            ),
            formulaIds: ['poly-product'],
            observationPrompt: text('Primerjaj graf okoli \\(x=1\\) z grafom dvojne ničle: ali ostane graf na isti strani osi \\(x\\)?', 'Compare the graph around \\(x=1\\) with the graph of a double zero: does the graph stay on the same side of the \\(x\\)-axis?'),
            expectedObservations: [text('Graf preide od spodaj navzgor skozi \\(x=1\\), tam je raven in ima vodoravno tangento; odvod se v \\(1\\) dotakne osi \\(x\\).', 'The graph passes from below to above through \\(x=1\\), is flat there and has a horizontal tangent; the derivative touches the \\(x\\)-axis at \\(1\\).')],
            scene: polynomialScene('poly-triple-flat', 'triple', [], true,
                'Polinom \\((x-1)^3\\): trojna ničla \\(1\\), \\(k=1\\), \\(p^{\\prime}(1)=0\\); odvod je viden.',
                'The polynomial \\((x-1)^3\\): a triple zero \\(1\\), \\(k=1\\), \\(p^{\\prime}(1)=0\\); the derivative is visible.'),
        }),
        step({
            id: 'poly-degree', order: 5,
            title: text('Stopnja in konca grafa', 'The degree and the ends of the graph'),
            purpose: text('Povezati stopnjo z vsoto večkratnosti in iz vodilnega člena napovedati konca grafa.', 'Linking the degree to the sum of the multiplicities and predicting the ends of the graph from the leading term.'),
            explanation: text(
                'Polinom je \\(p(x)=0{,}2\\,(x+3)(x+1)^2(x-2)^2\\) s tremi ničlami z večkratnostmi \\(1\\), \\(2\\) in \\(2\\): stopnja je \\(1+2+2=5\\), največja dovoljena. Za velike \\(|x|\\) prevlada vodilni člen \\(0{,}2\\,x^5\\). Ker je \\(k=0{,}2>0\\) in je stopnja liha, gre \\(p(x)\\to-\\infty\\) za \\(x\\to-\\infty\\) in \\(p(x)\\to+\\infty\\) za \\(x\\to+\\infty\\). Pri sodi stopnji bi bila konca na isti strani.',
                'The polynomial is \\(p(x)=0.2\\,(x+3)(x+1)^2(x-2)^2\\) with three zeros of multiplicities \\(1\\), \\(2\\) and \\(2\\): the degree is \\(1+2+2=5\\), the largest allowed. For large \\(|x|\\) the leading term \\(0.2\\,x^5\\) dominates. Since \\(k=0.2>0\\) and the degree is odd, \\(p(x)\\to-\\infty\\) as \\(x\\to-\\infty\\) and \\(p(x)\\to+\\infty\\) as \\(x\\to+\\infty\\). For an even degree the two ends would be on the same side.',
            ),
            formulaIds: ['poly-product'],
            observationPrompt: text('Poišči, katera ničla seka os \\(x\\) in kateri se je graf le dotakne, ter preveri konca grafa.', 'Find which zero crosses the \\(x\\)-axis and which ones only touch it, and check the two ends of the graph.'),
            expectedObservations: [text('Graf seka os \\(x\\) le v \\(-3\\) in se je dotika v \\(-1\\) in \\(2\\); levi konec je spodaj, desni zgoraj.', 'The graph crosses the \\(x\\)-axis only at \\(-3\\) and touches it at \\(-1\\) and \\(2\\); the left end is down and the right end is up.')],
            scene: polynomialScene('poly-degree-five', 'degree-five', [], false,
                'Polinom \\(0{,}2\\,(x+3)(x+1)^2(x-2)^2\\): ničle \\(-3\\), \\(-1\\), \\(2\\) z večkratnostmi \\(1\\), \\(2\\), \\(2\\), stopnja \\(5\\); odvod je skrit.',
                'The polynomial \\(0.2\\,(x+3)(x+1)^2(x-2)^2\\): zeros \\(-3\\), \\(-1\\), \\(2\\) with multiplicities \\(1\\), \\(2\\), \\(2\\), degree \\(5\\); the derivative is hidden.'),
        }),
        step({
            id: 'poly-intercept', order: 6,
            title: text('Presečišče z osjo \\(y\\)', 'The \\(y\\)-intercept'),
            purpose: text('Presečišče z osjo \\(y\\) izračunati iz ničel in večkratnosti.', 'Computing the \\(y\\)-intercept from the zeros and multiplicities.'),
            explanation: text(
                'Za \\(p(x)=(x+2)(x-1)^2\\) je \\(p(0)=k\\prod(-z_i)^{m_i}=1\\cdot2^1\\cdot(-1)^2=2\\). Graf torej seka os \\(y\\) v \\((0,2)\\). Račun ne potrebuje razvoja: vsaka ničla prispeva \\((-z_i)^{m_i}\\), pri sodi večkratnosti vedno nenegativno število.',
                'For \\(p(x)=(x+2)(x-1)^2\\) we have \\(p(0)=k\\prod(-z_i)^{m_i}=1\\cdot2^1\\cdot(-1)^2=2\\). So the graph meets the \\(y\\)-axis at \\((0,2)\\). The computation needs no expansion: each zero contributes \\((-z_i)^{m_i}\\), which for an even multiplicity is always a non-negative number.',
            ),
            formulaIds: ['poly-intercept'],
            workedExampleId: 'poly-default-intercept',
            observationPrompt: text('Preberi presečišče z osjo \\(y\\) z grafa in ga primerjaj z izračunanim.', 'Read the \\(y\\)-intercept off the graph and compare it with the computed one.'),
            expectedObservations: [text('Prikazano presečišče z osjo \\(y\\) je \\(p(0)=2\\), enako kot izračun \\(1\\cdot2\\cdot1\\).', 'The displayed \\(y\\)-intercept is \\(p(0)=2\\), equal to the computation \\(1\\cdot2\\cdot1\\).')],
            scene: polynomialScene('poly-intercept-default', 'default', [], false,
                'Polinom \\((x+2)(x-1)^2\\), \\(k=1\\), z ničlama \\(-2\\) in \\(1\\): presečišče z osjo \\(y\\) je \\(p(0)=2\\); odvod je skrit.',
                'The polynomial \\((x+2)(x-1)^2\\), \\(k=1\\), with zeros \\(-2\\) and \\(1\\): the \\(y\\)-intercept is \\(p(0)=2\\); the derivative is hidden.'),
        }),
        step({
            id: 'poly-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno preizkusiti ničle, večkratnosti in odvod na primeru stopnje \\(5\\).', 'Trying zeros, multiplicities and the derivative on your own on the degree-\\(5\\) example.'),
            explanation: text(
                'Prikazan je polinom \\(0{,}2\\,(x+3)(x+1)^2(x-2)^2\\) z odvodom; vse je prosto. Povleci ničle, vpiši njihov položaj s številom, združi dve ničli (večkratnost več kot \\(3\\) ali stopnja več kot \\(5\\) ni dovoljena in program navede razlog) in vsakič preveri: liha večkratnost seka, soda se dotika, odvod je v ničli večkratnosti vsaj \\(2\\) enak \\(0\\).',
                'The polynomial \\(0.2\\,(x+3)(x+1)^2(x-2)^2\\) is shown with its derivative and everything is free. Drag the zeros, type their positions as numbers, merge two zeros (a multiplicity above \\(3\\) or a degree above \\(5\\) is not allowed and the program gives the reason) and each time check: an odd multiplicity crosses, an even one touches, and the derivative is \\(0\\) at a zero of multiplicity at least \\(2\\).',
            ),
            formulaIds: ['poly-product', 'poly-intercept'],
            observationPrompt: text('Povleci enojno ničlo \\(-3\\) na dvojno ničlo \\(-1\\) in preveri, kaj se zgodi z večkratnostjo in stopnjo. Nato poskusi dvojno ničlo \\(2\\) povleči na \\(-1\\).', 'Drag the simple zero \\(-3\\) onto the double zero \\(-1\\) and check what happens to the multiplicity and the degree. Then try dragging the double zero \\(2\\) onto \\(-1\\).'),
            expectedObservations: [text('Ničli se združita v trojno ničlo pri \\(-1\\), kjer graf seka os \\(x\\) ravno, stopnja ostane \\(5\\). Združitev dveh dvojnih ničel bi dala večkratnost \\(4\\), zato je zavrnjena z razlogom.', 'The zeros merge into a triple zero at \\(-1\\), where the graph crosses the \\(x\\)-axis flatly, and the degree stays \\(5\\). Merging two double zeros would give multiplicity \\(4\\), so it is refused with a reason.')],
            scene: polynomialScene('poly-explore-free', 'degree-five', [], true,
                'Polinom \\(0{,}2\\,(x+3)(x+1)^2(x-2)^2\\) stopnje \\(5\\); odvod je viden, vse je prosto za raziskovanje.',
                'The polynomial \\(0.2\\,(x+3)(x+1)^2(x-2)^2\\) of degree \\(5\\); the derivative is visible and everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-polynomial-zeros-implementation',
            citation: 'Bezeg source: src/analysis/polynomialZerosModel.ts, src/analysis/zeroListModel.ts, src/analysis/polynomial.ts and src/graphs/functions/PolynomialZerosGraph.tsx.',
            implementationCorrespondence: 'A scene chooses the example (k and the zeros), moves zeros by poly-zero-1..5 (a zero moved onto another merges with it) and sets the derivative switch; the lesson text quotes only values of those scenes and values recomputed in the test.',
        },
    ],
    edgeCases: [
        text('Največja stopnja je \\(5\\) in največja večkratnost \\(3\\): združitev, ki bi ju presegla, je zavrnjena, besedilo pod grafom pa pove razlog.', 'The maximum degree is \\(5\\) and the maximum multiplicity \\(3\\): a merge that would exceed either is refused and the text under the graph gives the reason.'),
        text('Ničle ležijo na mreži s korakom \\(0{,}1\\) med \\(-20\\) in \\(20\\); vrednost zunaj območja je zavrnjena in je ne zaokrožimo. Koeficient \\(k\\) ne sme biti \\(0\\).', 'Zeros lie on a grid with spacing \\(0.1\\) between \\(-20\\) and \\(20\\); a value outside the range is refused and never rounded. The coefficient \\(k\\) must not be \\(0\\).'),
        text('Odvod je v ničli večkratnosti vsaj \\(2\\) enak \\(0\\), a ima lahko ničle tudi tam, kjer \\(p\\) ni ničen (lokalni ekstremi).', 'The derivative is \\(0\\) at a zero of multiplicity at least \\(2\\), but it can also vanish where \\(p\\) is not zero (local extrema).'),
    ],
    unresolvedQuestions: [],
};

export const schoolFunctionGraphsBatchBGuidedLessons: readonly GuidedLesson[] = [polynomialLesson];
