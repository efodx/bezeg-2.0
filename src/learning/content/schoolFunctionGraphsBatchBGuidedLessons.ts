/**
 * Guided lessons of the School function graphs family (docs/specs/school-function-graphs-lessons.md), batch B: S3, polynomial zeros and
 * multiplicity, on `polynomial-zeros`, and S4, rational functions, on `rational-function`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number
 * it quotes is a value of the scene it belongs to, and `schoolFunctionGraphsBatchBGuidedLessons.test.ts` checks that against the real graph
 * and against values recomputed without the kernel. Scenes use only the `function-choice`, `function-parameter` and `function-visibility`
 * actions the graph registers (`polynomial-example`, `poly-zero-1..5`, `k`, `polynomial-derivative`). Every scene sets the example first
 * (it fixes k and the zeros), then moves zeros, then the derivative switch, so it does not depend on the scene before it.
 * Kept apart from `schoolFunctionGraphsGuidedLessons.ts` (batch A) to keep both files short.
 */
import type {LessonAction, LessonViewBox} from '../model';
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
        'Polinom v produktni obliki \\(p(x)=k\\,(x-z_1)^{m_1}\\cdots(x-z_r)^{m_r}\\) ima ničle \\(z_i\\) z večkratnostmi \\(m_i\\). Pri lihi večkratnosti graf os \\(x\\) seka, pri sodi se je dotika; večja ko je večkratnost, bolj raven je graf v ničli, in odvod je v vsaki ničli večkratnosti vsaj \\(2\\) enak \\(0\\). Stopnja je vsota večkratnosti; sodost stopnje in predznak \\(k\\) določata obnašanje grafa za velike \\(|x|\\), presečišče z osjo \\(y\\) pa je \\(p(0)=k\\prod(-z_i)^{m_i}\\).',
        'A polynomial in product form \\(p(x)=k\\,(x-z_1)^{m_1}\\cdots(x-z_r)^{m_r}\\) has zeros \\(z_i\\) with multiplicities \\(m_i\\). At an odd multiplicity the graph crosses the \\(x\\)-axis, at an even one it touches it; the higher the multiplicity, the flatter the graph is at the zero, and the derivative is \\(0\\) at every zero of multiplicity at least \\(2\\). The degree is the sum of the multiplicities; the parity of the degree and the sign of \\(k\\) determine the behaviour of the graph for large \\(|x|\\), and the \\(y\\)-intercept is \\(p(0)=k\\prod(-z_i)^{m_i}\\).',
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
            purpose: text('Primerjati trojno ničlo z dvojno: obe imata vodoravno tangento, a trojna graf prenese na drugo stran osi.', 'Comparing a triple zero with a double one: both have a horizontal tangent, but the triple one carries the graph to the other side of the axis.'),
            explanation: text(
                'Polinom je \\(p(x)=(x-1)^3\\): ena ničla \\(1\\) z večkratnostjo \\(3\\). Do njega pridemo tudi iz prejšnjega primera: če enojno ničlo povlečeš na dvojno, se ničli združita v trojno ničlo (njuni večkratnosti se seštejeta) in pojasnilo to objavi. Liha večkratnost pomeni, da graf os \\(x\\) seka, večkratnost več kot \\(1\\) pa, da je odvod tam enak \\(0\\): \\(p^{\\prime}(x)=3(x-1)^2\\), \\(p^{\\prime}(1)=0\\). Tangenta je vodoravna, graf os seka in ima v \\(x=1\\) prevoj.',
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
            observationPrompt: text('Poskusi dvojno ničlo \\(2\\) povleči na dvojno ničlo \\(-1\\). Nato povleci enojno ničlo \\(-3\\) na \\(-1\\) in preveri, kaj se zgodi z večkratnostjo in stopnjo.', 'Try dragging the double zero \\(2\\) onto the double zero \\(-1\\). Then drag the simple zero \\(-3\\) onto \\(-1\\) and check what happens to the multiplicity and the degree.'),
            expectedObservations: [text('Združitev dveh dvojnih ničel bi dala večkratnost \\(4\\), zato je zavrnjena z razlogom in graf ostane enak. Enojna in dvojna ničla pa se združita v trojno ničlo pri \\(-1\\), kjer graf seka os \\(x\\) ravno, stopnja ostane \\(5\\).', 'Merging two double zeros would give multiplicity \\(4\\), so it is refused with a reason and the graph stays as it was. The simple and the double zero do merge into a triple zero at \\(-1\\), where the graph crosses the \\(x\\)-axis flatly, and the degree stays \\(5\\).')],
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

// ---------------------------------------------------------------------------------------------------------------- S4

export type RationalExample = 'oblique' | 'hole' | 'horizontal' | 'double-pole';

/** One zero moved by a scene: the `rational-<part>-<slot>` parameter and its new position (on the 0.1 grid). */
export interface RationalMove {
    readonly name: 'rational-numerator-1' | 'rational-numerator-2' | 'rational-denominator-1' | 'rational-denominator-2';
    readonly z: number;
}

/**
 * The lesson view of the `oblique` scenes: the default box [-11, 9, 11, -9] cuts off the probe point at x = 10, where f(10) = 12.375
 * (11 once the pole is dragged onto the zero 1), so the view rises above it and still frames the zeros ±1, the pole 2 and y = x + 2.
 */
const OBLIQUE_VIEW: LessonViewBox = [-8, 14, 12, -6];

/**
 * An S4 scene from the default scene: the example (its k and zeros), then the zero moves in the order given (a numerator zero landing on a
 * denominator zero makes a hole; two zeros of one list that meet merge), then the probe x of the remainder term.
 */
const rationalScene = (
    id: string, example: RationalExample, moves: readonly RationalMove[], probe: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default', ...(example === 'oblique' ? {view: OBLIQUE_VIEW} : {})},
        {kind: 'function-choice', name: 'rational-example', value: example},
        ...moves.map((move): LessonAction => ({kind: 'function-parameter', name: move.name, value: move.z})),
        {kind: 'function-parameter', name: 'rational-probe', value: probe},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const rationalLesson: GuidedLesson = {
    demonstrationId: 'rational-function',
    title: text('Racionalne funkcije: ničle, poli, luknje in asimptote', 'Rational functions: zeros, poles, holes, asymptotes'),
    summary: text(
        'Racionalno funkcijo \\(f(x)=\\frac{p(x)}{q(x)}\\) preberemo iz okrajšanega ulomka. Ničle okrajšanega števca so ničle funkcije, ničle okrajšanega imenovalca so poli in navpične asimptote, skupni faktor pa da luknjo, ne pola. Pol lihe večkratnosti spremeni predznak, pol sode ne. Primerjava stopenj določi vodoravno ali poševno asimptoto: iz \\(p=q\\,s+r\\) sledi \\(f(x)=s(x)+\\frac{r(x)}{q(x)}\\), člen \\(\\frac{r(x)}{q(x)}\\) pa se z naraščanjem \\(|x|\\) manjša. Graf lahko vodoravno ali poševno asimptoto pri končnem \\(x\\) seka.',
        'A rational function \\(f(x)=\\frac{p(x)}{q(x)}\\) is read from the reduced fraction. The zeros of the reduced numerator are the zeros of the function, the zeros of the reduced denominator are poles and vertical asymptotes, and a common factor gives a hole, not a pole. A pole of odd multiplicity changes the sign, one of even multiplicity does not. Comparing the degrees decides the horizontal or oblique asymptote: from \\(p=q\\,s+r\\) we get \\(f(x)=s(x)+\\frac{r(x)}{q(x)}\\), and the term \\(\\frac{r(x)}{q(x)}\\) shrinks as \\(|x|\\) grows. The graph may cross a horizontal or oblique asymptote at a finite \\(x\\).',
    ),
    prerequisites: [
        text('Potrebno je znanje iz lekcije o ničlah polinoma in večkratnosti: ničla in njena večkratnost ter predznak ob njej.', 'Assumes the lesson on polynomial zeros and multiplicity: a zero, its multiplicity and the sign beside it.'),
    ],
    learningGoals: [
        text('Iz ulomka \\(\\frac{p}{q}\\) določiš ničle, pole, luknje in navpične asimptote ter ločiš luknjo od pola.', 'From the fraction \\(\\frac{p}{q}\\) find the zeros, poles, holes and vertical asymptotes, and tell a hole from a pole.'),
        text('S primerjavo stopenj ugotoviš, ali ima funkcija vodoravno, poševno ali nobene od teh asimptot, in jo izračunaš z deljenjem polinomov.', 'By comparing the degrees decide whether the function has a horizontal, an oblique or neither asymptote, and compute it by polynomial division.'),
        text('Razložiš, zakaj pol lihe večkratnosti spremeni predznak, sode pa ne, in zakaj graf lahko seka vodoravno asimptoto.', 'Explain why a pole of odd multiplicity changes the sign and one of even multiplicity does not, and why the graph can cross a horizontal asymptote.'),
    ],
    formulaBlocks: [
        {
            id: 'rat-fraction',
            latex: 'f(x)=\\frac{k\\,(x-a_1)^{m_1}\\cdots}{(x-b_1)^{n_1}\\cdots}',
            notation: text(
                '\\(a_i\\) so ničle števca z večkratnostmi \\(m_i\\), \\(b_j\\) ničle imenovalca z večkratnostmi \\(n_j\\); imenovalec ima vodilni koeficient \\(1\\), \\(k\\ne0\\) je koeficient števca.',
                'The \\(a_i\\) are the zeros of the numerator with multiplicities \\(m_i\\), the \\(b_j\\) the zeros of the denominator with multiplicities \\(n_j\\); the denominator has leading coefficient \\(1\\), and \\(k\\ne0\\) is the coefficient of the numerator.',
            ),
            explanation: text(
                'Skupne faktorje \\((x-c)\\) najprej okrajšamo. Če je \\(c\\) ničla števca večkratnosti \\(m\\) in imenovalca večkratnosti \\(n\\), po okrajšanju ostane \\(|m-n|\\) faktorjev. Pri \\(m\\ge n\\) funkcija v \\(c\\) ni definirana, a ima limito: luknja (pri \\(m>n\\) je limita \\(0\\)). Pri \\(m<n\\) ostane pol večkratnosti \\(n-m\\). Pol lihe večkratnosti spremeni predznak, ker faktor \\((x-c)^{n-m}\\) v imenovalcu zamenja predznak; pri sodi večkratnosti ga ohrani.',
                'Common factors \\((x-c)\\) are cancelled first. If \\(c\\) is a zero of the numerator of multiplicity \\(m\\) and of the denominator of multiplicity \\(n\\), then \\(|m-n|\\) factors remain after cancelling. For \\(m\\ge n\\) the function is not defined at \\(c\\) but has a limit there: a hole (for \\(m>n\\) the limit is \\(0\\)). For \\(m<n\\) a pole of multiplicity \\(n-m\\) remains. A pole of odd multiplicity changes the sign because the factor \\((x-c)^{n-m}\\) in the denominator changes sign; with an even multiplicity it keeps it.',
            ),
        },
        {
            id: 'rat-division',
            latex: 'p(x)=q(x)\\,s(x)+r(x),\\quad f(x)=s(x)+\\frac{r(x)}{q(x)}',
            notation: text(
                '\\(s\\) je kvocient in \\(r\\) ostanek pri deljenju polinomov, \\(\\deg r<\\deg q\\); \\(p\\) in \\(q\\) sta okrajšana števec in imenovalec.',
                '\\(s\\) is the quotient and \\(r\\) the remainder of the polynomial division, \\(\\deg r<\\deg q\\); \\(p\\) and \\(q\\) are the reduced numerator and denominator.',
            ),
            explanation: text(
                'Člen \\(\\frac{r(x)}{q(x)}\\) gre proti \\(0\\), ko \\(|x|\\) narašča, ker ima števec manjšo stopnjo od imenovalca. Pri \\(\\deg p<\\deg q\\) je \\(s=0\\) in asimptota \\(y=0\\); pri \\(\\deg p=\\deg q\\) je \\(s\\) konstanta, kvocient vodilnih koeficientov (vodoravna asimptota); pri \\(\\deg p=\\deg q+1\\) je \\(s\\) linearen (poševna asimptota \\(y=s(x)\\)). Pri večji razliki stopenj \\(s\\) ni premica in vodoravne ali poševne asimptote ni.',
                'The term \\(\\frac{r(x)}{q(x)}\\) tends to \\(0\\) as \\(|x|\\) grows, because the numerator has a smaller degree than the denominator. For \\(\\deg p<\\deg q\\) we have \\(s=0\\) and the asymptote \\(y=0\\); for \\(\\deg p=\\deg q\\) the quotient \\(s\\) is a constant, the quotient of the leading coefficients (a horizontal asymptote); for \\(\\deg p=\\deg q+1\\) it is linear (the oblique asymptote \\(y=s(x)\\)). For a larger difference of degrees \\(s\\) is not a line and there is no horizontal or oblique asymptote.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'rat-hole-value',
            title: text('Luknja funkcije \\(\\frac{x^2-1}{x-1}\\)', 'The hole of \\(\\frac{x^2-1}{x-1}\\)'),
            calculationLatex: '\\frac{x^2-1}{x-1}=\\frac{(x-1)(x+1)}{x-1}=x+1',
            resultLatex: '(1,2)',
            check: text(
                'Za \\(x\\ne1\\) se faktor \\(x-1\\) okrajša in ostane \\(x+1\\). V \\(x=1\\) funkcija ni definirana, limita pa je \\(1+1=2\\): luknja je v točki \\((1;2)\\), pola ni.',
                'For \\(x\\ne1\\) the factor \\(x-1\\) cancels and \\(x+1\\) remains. At \\(x=1\\) the function is not defined, but the limit is \\(1+1=2\\): the hole is at the point \\((1,2)\\) and there is no pole.',
            ),
        },
        {
            id: 'rat-division-value',
            title: text('Deljenje \\((x^2-1):(x-2)\\)', 'The division \\((x^2-1):(x-2)\\)'),
            calculationLatex: 'x^2-1=(x-2)(x+2)+3',
            resultLatex: 'x+2+\\frac{3}{x-2}',
            check: text(
                'Preverimo z množenjem: \\((x-2)(x+2)+3=x^2-4+3=x^2-1\\). Kvocient je \\(s(x)=x+2\\), ostanek \\(r=3\\). Pri \\(x=10\\) je \\(\\frac{r(x)}{q(x)}=\\frac38=0{,}375\\) in \\(f(10)=\\frac{99}{8}=12{,}375=12+0{,}375\\).',
                'Check by multiplying: \\((x-2)(x+2)+3=x^2-4+3=x^2-1\\). The quotient is \\(s(x)=x+2\\), the remainder \\(r=3\\). At \\(x=10\\) we have \\(\\frac{r(x)}{q(x)}=\\frac38=0.375\\) and \\(f(10)=\\frac{99}{8}=12.375=12+0.375\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'rat-pole', order: 1,
            title: text('Pol in obnašanje ob njem', 'A pole and the behaviour beside it'),
            purpose: text('Napovedati, kako se funkcija obnaša levo in desno od pola, še preden pogledaš graf.', 'Predicting how the function behaves to the left and to the right of a pole before looking at the graph.'),
            explanation: text(
                'Funkcija je \\(f(x)=\\frac{x^2-1}{x-2}=\\frac{(x-1)(x+1)}{x-2}\\): števec ima ničli \\(-1\\) in \\(1\\), imenovalec ničlo \\(2\\). V \\(x=2\\) je imenovalec \\(0\\), števec pa \\(3\\ne0\\), zato je \\(2\\) pol in funkcija tam ni definirana. Blizu \\(2\\) je števec blizu \\(3\\), imenovalec pa majhen: levo od \\(2\\) je negativen, zato \\(f\\to-\\infty\\), desno pozitiven, zato \\(f\\to+\\infty\\). Napovej to, preden pogledaš graf.',
                'The function is \\(f(x)=\\frac{x^2-1}{x-2}=\\frac{(x-1)(x+1)}{x-2}\\): the numerator has the zeros \\(-1\\) and \\(1\\), the denominator the zero \\(2\\). At \\(x=2\\) the denominator is \\(0\\) and the numerator is \\(3\\ne0\\), so \\(2\\) is a pole and the function is not defined there. Near \\(2\\) the numerator is close to \\(3\\) and the denominator is small: to the left of \\(2\\) it is negative, so \\(f\\to-\\infty\\), to the right it is positive, so \\(f\\to+\\infty\\). Predict this before you look at the graph.',
            ),
            formulaIds: ['rat-fraction'],
            observationPrompt: text('Napovej, kam gre graf levo in kam desno od \\(x=2\\), nato preveri in poglej, ali se pri \\(2\\) graf poveže.', 'Predict where the graph goes to the left and to the right of \\(x=2\\), then check and see whether the graph is joined at \\(2\\).'),
            expectedObservations: [text('Levo od \\(2\\) graf pada proti \\(-\\infty\\), desno od \\(2\\) pa pada z \\(+\\infty\\); pri \\(x=2\\) je navpična asimptota in graf je ne prečka.', 'To the left of \\(2\\) the graph falls towards \\(-\\infty\\), to the right of \\(2\\) it comes down from \\(+\\infty\\); at \\(x=2\\) there is a vertical asymptote and the graph does not cross it.')],
            scene: rationalScene('rat-pole-oblique', 'oblique', [], 10,
                'Funkcija \\(\\frac{x^2-1}{x-2}\\): ničli \\(-1\\) in \\(1\\), pol \\(2\\) (enojen, predznak se spremeni); poševna asimptota \\(y=x+2\\).',
                'The function \\(\\frac{x^2-1}{x-2}\\): zeros \\(-1\\) and \\(1\\), a pole \\(2\\) (simple, the sign changes); the oblique asymptote \\(y=x+2\\).'),
        }),
        step({
            id: 'rat-hole', order: 2,
            title: text('Luknja namesto pola', 'A hole instead of a pole'),
            purpose: text('Videti, da skupni faktor števca in imenovalca da luknjo, ne pola.', 'Seeing that a factor common to the numerator and the denominator gives a hole, not a pole.'),
            explanation: text(
                'Pol smo povlekli z \\(2\\) na \\(1\\), kjer ima števec ničlo. Zdaj je \\(f(x)=\\frac{(x-1)(x+1)}{x-1}\\): faktor \\(x-1\\) se okrajša in za \\(x\\ne1\\) je \\(f(x)=x+1\\). V \\(x=1\\) funkcija ni definirana, limita pa je \\(2\\): luknja v \\((1;2)\\), ne pol, in navpične asimptote ni. Luknjo dobiš tudi, če ničlo števca povlečeš na pol. Če imenovalec skupni faktor vsebuje večkrat kot števec, po okrajšanju ostane pol: \\(\\frac{x-1}{(x-1)^2}=\\frac{1}{x-1}\\) ima pol v \\(1\\).',
                'The pole has been dragged from \\(2\\) to \\(1\\), where the numerator has a zero. Now \\(f(x)=\\frac{(x-1)(x+1)}{x-1}\\): the factor \\(x-1\\) cancels and for \\(x\\ne1\\) we have \\(f(x)=x+1\\). At \\(x=1\\) the function is not defined, but the limit is \\(2\\): a hole at \\((1,2)\\), not a pole, and there is no vertical asymptote. You also get a hole by dragging a numerator zero onto a pole. If the denominator contains the common factor more times than the numerator, a pole remains after cancelling: \\(\\frac{x-1}{(x-1)^2}=\\frac{1}{x-1}\\) has a pole at \\(1\\).',
            ),
            formulaIds: ['rat-fraction'],
            workedExampleId: 'rat-hole-value',
            observationPrompt: text('Poišči prazen krožec na grafu in preberi njegovi koordinati; nato pol povleci nazaj na \\(2\\) in poglej, kaj se zgodi z luknjo.', 'Find the open circle on the graph and read its coordinates; then drag the pole back to \\(2\\) and see what happens to the hole.'),
            expectedObservations: [text('Graf je premica \\(y=x+1\\) z manjkajočo točko \\((1;2)\\), ki je označena kot luknja; ko pol odmakneš z \\(1\\), je luknja spet pol.', 'The graph is the line \\(y=x+1\\) with the point \\((1,2)\\) missing, marked as a hole; when you move the pole away from \\(1\\), the hole is a pole again.')],
            scene: rationalScene('rat-hole-cancel', 'oblique', [{name: 'rational-denominator-1', z: 1}], 10,
                'Funkcija \\(\\frac{x^2-1}{x-1}=x+1\\) za \\(x\\ne1\\): luknja v \\((1;2)\\), pola ni; edina ničla je \\(-1\\).',
                'The function \\(\\frac{x^2-1}{x-1}=x+1\\) for \\(x\\ne1\\): a hole at \\((1,2)\\), no pole; the only zero is \\(-1\\).'),
        }),
        step({
            id: 'rat-vertical', order: 3,
            title: text('Navpična asimptota je pol okrajšanega ulomka', 'A vertical asymptote is a pole of the reduced fraction'),
            purpose: text('Navpične asimptote brati iz okrajšanega ulomka: od dveh ničel imenovalca je ena lahko luknja.', 'Reading vertical asymptotes from the reduced fraction: of two zeros of the denominator one can be a hole.'),
            explanation: text(
                'Imenovalec \\((x+2)(x-2)\\) ima ničli \\(-2\\) in \\(2\\), števec \\(2(x+1)(x-2)\\) pa ničli \\(-1\\) in \\(2\\). Faktor \\(x-2\\) se okrajša in za \\(x\\ne2\\) ostane \\(f(x)=\\frac{2(x+1)}{x+2}\\). Navpična asimptota je zato le \\(x=-2\\), pol okrajšanega ulomka; v \\(x=2\\) je luknja v \\((2;1{,}5)\\), ker je \\(\\frac{2\\cdot3}{4}=1{,}5\\). Ničla imenovalca torej še ni pol: to preveriš šele v okrajšanem ulomku.',
                'The denominator \\((x+2)(x-2)\\) has the zeros \\(-2\\) and \\(2\\), the numerator \\(2(x+1)(x-2)\\) the zeros \\(-1\\) and \\(2\\). The factor \\(x-2\\) cancels and for \\(x\\ne2\\) we are left with \\(f(x)=\\frac{2(x+1)}{x+2}\\). The only vertical asymptote is therefore \\(x=-2\\), the pole of the reduced fraction; at \\(x=2\\) there is a hole at \\((2,1.5)\\), because \\(\\frac{2\\cdot3}{4}=1.5\\). So a zero of the denominator is not yet a pole: you decide that only in the reduced fraction.',
            ),
            formulaIds: ['rat-fraction'],
            observationPrompt: text('Poišči vse navpične asimptote in luknje in jih primerjaj z ničlama imenovalca \\(-2\\) in \\(2\\).', 'Find all the vertical asymptotes and holes and compare them with the zeros \\(-2\\) and \\(2\\) of the denominator.'),
            expectedObservations: [text('Navpična asimptota je samo pri \\(-2\\); pri \\(2\\) je luknja v \\((2;1{,}5)\\), graf pa se tam nadaljuje brez skoka v neskončnost.', 'The vertical asymptote is only at \\(-2\\); at \\(2\\) there is a hole at \\((2,1.5)\\) and the graph goes on there without running off to infinity.')],
            scene: rationalScene('rat-vertical-reduced', 'horizontal', [{name: 'rational-numerator-2', z: 2}], 10,
                'Funkcija \\(\\frac{2(x+1)(x-2)}{(x+2)(x-2)}\\): pol \\(-2\\), luknja v \\((2;1{,}5)\\), ničla \\(-1\\); vodoravna asimptota \\(y=2\\).',
                'The function \\(\\frac{2(x+1)(x-2)}{(x+2)(x-2)}\\): a pole \\(-2\\), a hole at \\((2,1.5)\\), a zero \\(-1\\); the horizontal asymptote \\(y=2\\).'),
        }),
        step({
            id: 'rat-degrees', order: 4,
            title: text('Stopnji določita asimptoto', 'The degrees decide the asymptote'),
            purpose: text('S primerjavo stopenj števca in imenovalca ugotoviti, ali je asimptota vodoravna ali poševna.', 'Using the degrees of the numerator and the denominator to decide whether the asymptote is horizontal or oblique.'),
            explanation: text(
                'Funkcija je \\(f(x)=\\frac{2x^2-2}{x^2-4}=\\frac{2(x-1)(x+1)}{(x-2)(x+2)}\\) z ničlama \\(-1\\), \\(1\\) in pola \\(-2\\), \\(2\\). Števec in imenovalec imata isto stopnjo \\(2\\), zato je asimptota vodoravna: iz \\(2x^2-2=2(x^2-4)+6\\) sledi \\(f(x)=2+\\frac{6}{x^2-4}\\) in \\(y=2\\) je kvocient vodilnih koeficientov. Pri \\(x=10\\) je \\(f(10)=\\frac{198}{96}=2{,}0625=2+\\frac{6}{96}\\), člen \\(\\frac{r(x)}{q(x)}=0{,}0625\\). Pravilo: manjša stopnja števca da \\(y=0\\) (korak 6), enaka vodoravno asimptoto, za \\(1\\) večja poševno (korak 1: \\(y=x+2\\)), za več kot \\(1\\) večja nobene od teh dveh.',
                'The function is \\(f(x)=\\frac{2x^2-2}{x^2-4}=\\frac{2(x-1)(x+1)}{(x-2)(x+2)}\\) with the zeros \\(-1\\), \\(1\\) and the poles \\(-2\\), \\(2\\). The numerator and the denominator have the same degree \\(2\\), so the asymptote is horizontal: from \\(2x^2-2=2(x^2-4)+6\\) we get \\(f(x)=2+\\frac{6}{x^2-4}\\), and \\(y=2\\) is the quotient of the leading coefficients. At \\(x=10\\) we have \\(f(10)=\\frac{198}{96}=2.0625=2+\\frac{6}{96}\\), the term \\(\\frac{r(x)}{q(x)}=0.0625\\). The rule: a smaller degree of the numerator gives \\(y=0\\) (step 6), an equal one a horizontal asymptote, one larger by \\(1\\) an oblique one (step 1: \\(y=x+2\\)), one larger by more than \\(1\\) neither of the two.',
            ),
            formulaIds: ['rat-division'],
            observationPrompt: text('Preberi vodoravno asimptoto s črtkane črte in jo primerjaj s kvocientom vodilnih koeficientov.', 'Read the horizontal asymptote off the dashed line and compare it with the quotient of the leading coefficients.'),
            expectedObservations: [text('Črtkana črta je pri \\(y=2\\), kar je \\(\\frac21\\); na grafu pri \\(x=10\\) je vrednost nad asimptoto za \\(0{,}0625\\).', 'The dashed line is at \\(y=2\\), which is \\(\\frac21\\); on the graph at \\(x=10\\) the value is above the asymptote by \\(0.0625\\).')],
            scene: rationalScene('rat-degrees-horizontal', 'horizontal', [], 10,
                'Funkcija \\(\\frac{2x^2-2}{x^2-4}\\): ničli \\(-1\\), \\(1\\), pola \\(-2\\), \\(2\\); vodoravna asimptota \\(y=2\\), pri \\(x=10\\) je \\(f(10)=2{,}0625\\).',
                'The function \\(\\frac{2x^2-2}{x^2-4}\\): zeros \\(-1\\), \\(1\\), poles \\(-2\\), \\(2\\); the horizontal asymptote \\(y=2\\), at \\(x=10\\) we have \\(f(10)=2.0625\\).'),
        }),
        step({
            id: 'rat-remainder', order: 5,
            title: text('Ostanek se manjša', 'The remainder term shrinks'),
            purpose: text('Videti, da se graf asimptoti približuje, ker se člen z ostankom manjša.', 'Seeing that the graph approaches the asymptote because the remainder term shrinks.'),
            explanation: text(
                'Iz \\(x^2-1=(x-2)(x+2)+3\\) sledi \\(f(x)=x+2+\\frac{3}{x-2}\\). Poševna asimptota je \\(y=x+2\\), razlika med grafom in njo pa je člen \\(\\frac{r(x)}{q(x)}=\\frac{3}{x-2}\\). Pri \\(x=10\\) je ta člen \\(\\frac38=0{,}375\\) in \\(f(10)=12{,}375=12+0{,}375\\). Drsnik za \\(x\\) je na \\(10\\) in ga lahko premakneš le proti manjšim vrednostim. Povleci ga proti polu \\(2\\): člen \\(\\frac{3}{x-2}\\) narašča. Ko ga vrneš proti \\(10\\), se člen manjša in graf se asimptoti približuje. Pri \\(x=2\\), v polu, člena ni.',
                'From \\(x^2-1=(x-2)(x+2)+3\\) we get \\(f(x)=x+2+\\frac{3}{x-2}\\). The oblique asymptote is \\(y=x+2\\), and the difference between the graph and it is the term \\(\\frac{r(x)}{q(x)}=\\frac{3}{x-2}\\). At \\(x=10\\) this term is \\(\\frac38=0.375\\) and \\(f(10)=12.375=12+0.375\\). The slider for \\(x\\) is at \\(10\\) and can only move towards smaller values. Drag it towards the pole \\(2\\): the term \\(\\frac{3}{x-2}\\) grows. Moving it back towards \\(10\\), the term shrinks and the graph approaches the asymptote. At \\(x=2\\), at the pole, there is no term.',
            ),
            formulaIds: ['rat-division'],
            workedExampleId: 'rat-division-value',
            observationPrompt: text('Premakni drsnik za \\(x\\) z \\(10\\) proti polu \\(2\\) in nazaj proti \\(10\\) ter opazuj, kako se spreminja razdalja do asimptote.', 'Move the slider for \\(x\\) from \\(10\\) towards the pole \\(2\\) and back towards \\(10\\), and watch how the distance to the asymptote changes.'),
            expectedObservations: [text('Pri \\(x=10\\) je razlika do asimptote \\(0{,}375\\); bolj ko se \\(x\\) oddaljuje od pola \\(2\\), manjši je člen \\(\\frac{3}{x-2}\\) po absolutni vrednosti.', 'At \\(x=10\\) the difference from the asymptote is \\(0.375\\); the farther \\(x\\) is from the pole \\(2\\), the smaller the term \\(\\frac{3}{x-2}\\) is in absolute value.')],
            scene: rationalScene('rat-remainder-probe', 'oblique', [], 10,
                'Funkcija \\(x+2+\\frac{3}{x-2}\\): asimptota \\(y=x+2\\), pri \\(x=10\\) je člen z ostankom \\(0{,}375\\) in \\(f(10)=12{,}375\\).',
                'The function \\(x+2+\\frac{3}{x-2}\\): the asymptote \\(y=x+2\\), at \\(x=10\\) the remainder term is \\(0.375\\) and \\(f(10)=12.375\\).'),
        }),
        step({
            id: 'rat-double-pole', order: 6,
            title: text('Pol lihe in pol sode večkratnosti', 'A pole of odd and of even multiplicity'),
            purpose: text('Primerjati pol, ki spremeni predznak, s polom, ki ga ne; in videti, da graf lahko seka vodoravno asimptoto.', 'Comparing a pole that changes the sign with one that does not; and seeing that the graph can cross a horizontal asymptote.'),
            explanation: text(
                'Funkcija je \\(f(x)=\\frac{4x}{(x+2)(x-1)^2}\\): ničla \\(0\\), pol \\(-2\\) večkratnosti \\(1\\) in pol \\(1\\) večkratnosti \\(2\\). Pri \\(-2\\) se predznak spremeni: levo od \\(-2\\) gre \\(f\\to+\\infty\\), desno \\(f\\to-\\infty\\). Pri \\(1\\) se predznak ne spremeni: na obeh straneh gre \\(f\\to+\\infty\\). Stopnja števca \\(1\\) je manjša od stopnje imenovalca \\(3\\), zato je vodoravna asimptota \\(y=0\\). Graf jo vseeno seka pri končnem \\(x\\): \\(f(0)=0\\). Asimptota pove le, kam se graf približuje, ko \\(|x|\\) narašča.',
                'The function is \\(f(x)=\\frac{4x}{(x+2)(x-1)^2}\\): a zero \\(0\\), a pole \\(-2\\) of multiplicity \\(1\\) and a pole \\(1\\) of multiplicity \\(2\\). At \\(-2\\) the sign changes: to the left of \\(-2\\) we have \\(f\\to+\\infty\\), to the right \\(f\\to-\\infty\\). At \\(1\\) the sign does not change: on both sides \\(f\\to+\\infty\\). The degree \\(1\\) of the numerator is smaller than the degree \\(3\\) of the denominator, so the horizontal asymptote is \\(y=0\\). The graph still crosses it at a finite \\(x\\): \\(f(0)=0\\). An asymptote only says where the graph is heading as \\(|x|\\) grows.',
            ),
            formulaIds: ['rat-fraction'],
            observationPrompt: text('Primerjaj graf levo in desno od polov \\(-2\\) in \\(1\\) ter poišči, kje graf seka asimptoto \\(y=0\\).', 'Compare the graph to the left and to the right of the poles \\(-2\\) and \\(1\\), and find where the graph crosses the asymptote \\(y=0\\).'),
            expectedObservations: [text('Pri \\(-2\\) graf preide z zgornje na spodnjo stran, pri \\(1\\) ostane nad osjo na obeh straneh; asimptoto \\(y=0\\) graf seka v \\(x=0\\).', 'At \\(-2\\) the graph passes from the upper to the lower side, at \\(1\\) it stays above the axis on both sides; the graph crosses the asymptote \\(y=0\\) at \\(x=0\\).')],
            scene: rationalScene('rat-double-pole-signs', 'double-pole', [], 10,
                'Funkcija \\(\\frac{4x}{(x+2)(x-1)^2}\\): ničla \\(0\\), pol \\(-2\\) (enojen, predznak se spremeni), pol \\(1\\) (dvojen, predznak se ne spremeni); vodoravna asimptota \\(y=0\\).',
                'The function \\(\\frac{4x}{(x+2)(x-1)^2}\\): a zero \\(0\\), a pole \\(-2\\) (simple, the sign changes), a pole \\(1\\) (double, the sign does not change); the horizontal asymptote \\(y=0\\).'),
        }),
        step({
            id: 'rat-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati ničle in pole ter poskusiti luknjo, pol in asimptoto.', 'Moving zeros and poles on your own and trying a hole, a pole and the asymptote.'),
            explanation: text(
                'Prikazana je funkcija \\(\\frac{x^2-1}{x-2}\\) in vse je prosto. Povleci ničle števca in imenovalca, jih vpiši kot števila in vsakič preveri: ničla okrajšanega števca je ničla funkcije, ničla okrajšanega imenovalca je pol, skupna ničla je luknja, stopnji pa določita asimptoto. Na primer, ničlo \\(-1\\) števca povleci na pol \\(2\\): ostane \\(f(x)=\\frac{(x-2)(x-1)}{x-2}=x-1\\) z luknjo v \\((2;1)\\).',
                'The function \\(\\frac{x^2-1}{x-2}\\) is shown and everything is free. Drag the zeros of the numerator and the denominator, type them as numbers and check each time: a zero of the reduced numerator is a zero of the function, a zero of the reduced denominator is a pole, a common zero is a hole, and the degrees decide the asymptote. For example, drag the zero \\(-1\\) of the numerator onto the pole \\(2\\): what remains is \\(f(x)=\\frac{(x-2)(x-1)}{x-2}=x-1\\) with a hole at \\((2,1)\\).',
            ),
            formulaIds: ['rat-fraction', 'rat-division'],
            observationPrompt: text('Povleci ničlo \\(-1\\) števca na pol \\(2\\), nato jo odmakni in primerjaj luknjo s polom.', 'Drag the zero \\(-1\\) of the numerator onto the pole \\(2\\), then move it away and compare the hole with the pole.'),
            expectedObservations: [text('Na polu \\(2\\) nastane luknja v \\((2;1)\\) in navpične asimptote ni; ko ničlo odmakneš, je pol spet navpična asimptota.', 'On the pole \\(2\\) a hole appears at \\((2,1)\\) and there is no vertical asymptote; when you move the zero away, the pole is a vertical asymptote again.')],
            scene: rationalScene('rat-explore-free', 'oblique', [], 10,
                'Funkcija \\(\\frac{x^2-1}{x-2}\\) s polom \\(2\\) in poševno asimptoto \\(y=x+2\\); vse je prosto za raziskovanje.',
                'The function \\(\\frac{x^2-1}{x-2}\\) with the pole \\(2\\) and the oblique asymptote \\(y=x+2\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-rational-function-implementation',
            citation: 'Bezeg source: src/analysis/rationalFunctionModel.ts, src/analysis/rational.ts, src/analysis/zeroListModel.ts and src/graphs/functions/RationalFunctionGraph.tsx.',
            implementationCorrespondence: 'A scene chooses the example (k and the zeros), moves zeros by rational-numerator-1..2 and rational-denominator-1..2 (a numerator zero moved onto a denominator zero makes a hole) and sets the probe x; the lesson text quotes only values of those scenes and values recomputed in the test.',
        },
    ],
    edgeCases: [
        text('Ničle ležijo na mreži s korakom \\(0{,}1\\) med \\(-20\\) in \\(20\\), točka \\(x\\) za člen z ostankom med \\(-10\\) in \\(10\\); vrednost zunaj območja je zavrnjena in je ne zaokrožimo. Vsak seznam ničel ima skupno stopnjo največ \\(5\\).', 'Zeros lie on a grid with spacing \\(0.1\\) between \\(-20\\) and \\(20\\), the point \\(x\\) of the remainder term between \\(-10\\) and \\(10\\); a value outside the range is refused and never rounded. Each list of zeros has total degree at most \\(5\\).'),
        text('V polu in v luknji funkcija ni definirana in člena z ostankom tam ni; graf ni nikoli narisan čez pol.', 'At a pole and at a hole the function is not defined and there is no remainder term there; the graph is never drawn across a pole.'),
        text('Vodoravno ali poševno asimptoto lahko graf pri končnem \\(x\\) seka; navpične asimptote ne seka.', 'The graph can cross a horizontal or oblique asymptote at a finite \\(x\\); it never crosses a vertical asymptote.'),
    ],
    unresolvedQuestions: [],
};

export const schoolFunctionGraphsBatchBGuidedLessons: readonly GuidedLesson[] = [polynomialLesson, rationalLesson];
