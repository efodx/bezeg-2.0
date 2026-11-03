/**
 * Guided lessons of the School function graphs family (docs/specs/school-function-graphs-lessons.md), batch C: S5, the geometric series and
 * its partial sums, on `geometric-series`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every
 * number it quotes is a value of the scene it belongs to, and `schoolFunctionGraphsBatchCGuidedLessons.test.ts` checks that against the real
 * graph and against values recomputed without the kernel. Scenes use only the `function-choice` and `function-parameter` actions the graph
 * registers (`series-example`, `series-n`, `series-tolerance`). Every scene sets the example first (it fixes a and q, one revealed term and
 * no band), then n, then the tolerance, so it does not depend on the scene before it. A scene is a state: none of them starts playback.
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

// ---------------------------------------------------------------------------------------------------------------- S5

export type SeriesLessonExample = 'default' | 'alternating' | 'repeating-three' | 'divergent';

/** An S5 scene from the default scene: the example (its a and q), then the number of revealed terms n, then the tolerance (0 = no band). */
const seriesScene = (id: string, example: SeriesLessonExample, terms: number, tolerance: number, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'series-example', value: example},
        {kind: 'function-parameter', name: 'series-n', value: terms},
        {kind: 'function-parameter', name: 'series-tolerance', value: tolerance},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const seriesLesson: GuidedLesson = {
    demonstrationId: 'geometric-series',
    title: text('Geometrijska vrsta in delne vsote', 'Geometric series and partial sums'),
    summary: text(
        'Geometrijska vrsta ima člene \\(a,\\,aq,\\,aq^2,\\dots\\), njena delna vsota pa je \\(S_n=a\\,\\dfrac{1-q^n}{1-q}\\). Za \\(|q|<1\\) se delne vsote približujejo limiti \\(\\dfrac a{1-q}\\); za \\(|q|\\ge1\\) členi ne težijo k \\(0\\) in vrsta ne konvergira, pri \\(q=-1\\) delne vsote nihajo. Tako je \\(0{,}333\\dots=\\tfrac13\\) in \\(0{,}999\\dots=1\\). Končna slika konvergenco le ponazarja, dokaz pa je zaprta oblika.',
        'A geometric series has the terms \\(a,\\,aq,\\,aq^2,\\dots\\) and the partial sum \\(S_n=a\\,\\dfrac{1-q^n}{1-q}\\). For \\(|q|<1\\) the partial sums approach the limit \\(\\dfrac a{1-q}\\); for \\(|q|\\ge1\\) the terms do not tend to \\(0\\) and the series does not converge, and at \\(q=-1\\) the partial sums oscillate. This gives \\(0.333\\dots=\\tfrac13\\) and \\(0.999\\dots=1\\). A finite picture only illustrates convergence; the closed form is the proof.',
    ),
    prerequisites: [
        text('Potrebno je razumevanje konvergence zaporedja, kot v lekciji o konvergenci zaporedja.', 'Assumes the convergence of a sequence, as in the lesson on sequence convergence.'),
    ],
    learningGoals: [
        text('Izračunaš delno vsoto \\(S_n\\) iz zaprte oblike in napoveš naslednjo delno vsoto.', 'Compute a partial sum \\(S_n\\) from the closed form and predict the next one.'),
        text('Poveš, kdaj geometrijska vrsta konvergira (le za \\(|q|<1\\)), in izračunaš limito \\(\\dfrac a{1-q}\\).', 'State when a geometric series converges (only for \\(|q|<1\\)) and compute the limit \\(\\dfrac a{1-q}\\).'),
        text('Z geometrijsko vrsto pretvoriš periodični decimalni zapis v ulomek in razložiš, zakaj je \\(0{,}999\\dots=1\\).', 'Convert a repeating decimal to a fraction with a geometric series and explain why \\(0.999\\dots=1\\).'),
    ],
    formulaBlocks: [
        {
            id: 'series-partial-sum',
            latex: 'S_n=a+aq+\\dots+aq^{n-1}=a\\,\\frac{1-q^n}{1-q}',
            notation: text(
                '\\(a\\) je prvi člen, \\(q\\ne1\\) količnik, \\(n\\) število členov in \\(S_n\\) vsota prvih \\(n\\) členov.',
                '\\(a\\) is the first term, \\(q\\ne1\\) the ratio, \\(n\\) the number of terms and \\(S_n\\) the sum of the first \\(n\\) terms.',
            ),
            explanation: text(
                'Če \\(S_n\\) pomnožimo s \\(q\\), dobimo \\(qS_n=aq+\\dots+aq^n\\). Razlika \\(S_n-qS_n\\) ima le prvi in zadnji člen: \\(S_n(1-q)=a-aq^n\\), od koder sledi formula. Pri \\(q=1\\) je vsak člen enak \\(a\\) in je \\(S_n=na\\); deliti z \\(1-q=0\\) ni mogoče.',
                'Multiplying \\(S_n\\) by \\(q\\) gives \\(qS_n=aq+\\dots+aq^n\\). The difference \\(S_n-qS_n\\) keeps only the first and the last term: \\(S_n(1-q)=a-aq^n\\), which gives the formula. At \\(q=1\\) every term equals \\(a\\) and \\(S_n=na\\); dividing by \\(1-q=0\\) is not possible.',
            ),
        },
        {
            id: 'series-limit',
            latex: 'S_n\\to\\frac a{1-q}\\quad(|q|<1)',
            notation: text(
                'Limita obstaja le za \\(|q|<1\\); \\(a\\) je prvi člen in \\(q\\) količnik.',
                'The limit exists only for \\(|q|<1\\); \\(a\\) is the first term and \\(q\\) the ratio.',
            ),
            explanation: text(
                'Za \\(|q|<1\\) gre \\(q^n\\to0\\), zato \\(S_n\\to\\dfrac a{1-q}\\), napaka pa je \\(\\bigl|\\dfrac a{1-q}-S_n\\bigr|=\\dfrac{|a|\\,|q|^n}{|1-q|}\\). Za \\(|q|\\ge1\\) členi \\(aq^{n-1}\\) ne težijo k \\(0\\), zato vrsta ne konvergira. Slika s končno mnogo stolpci konvergenco ponazori, dokaz pa je v \\(q^n\\to0\\).',
                'For \\(|q|<1\\) we have \\(q^n\\to0\\), so \\(S_n\\to\\dfrac a{1-q}\\), and the error is \\(\\bigl|\\dfrac a{1-q}-S_n\\bigr|=\\dfrac{|a|\\,|q|^n}{|1-q|}\\). For \\(|q|\\ge1\\) the terms \\(aq^{n-1}\\) do not tend to \\(0\\), so the series does not converge. A picture with finitely many bars illustrates convergence; the proof is \\(q^n\\to0\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'series-default-sum',
            title: text('Delna vsota \\(S_5\\) pri \\(a=1\\), \\(q=\\tfrac12\\)', 'The partial sum \\(S_5\\) for \\(a=1\\), \\(q=\\tfrac12\\)'),
            calculationLatex: '1\\cdot\\frac{1-(1/2)^5}{1-1/2}',
            resultLatex: '\\frac{31}{16}',
            check: text(
                'Je \\(\\dfrac{1-1/32}{1/2}=\\dfrac{31}{16}=1{,}9375\\). Seštevanje členov da isto: \\(1+0{,}5+0{,}25+0{,}125+0{,}0625=1{,}9375\\).',
                'We get \\(\\dfrac{1-1/32}{1/2}=\\dfrac{31}{16}=1.9375\\). Adding the terms gives the same: \\(1+0.5+0.25+0.125+0.0625=1.9375\\).',
            ),
        },
        {
            id: 'series-three-recurring',
            title: text('Decimalno število \\(0{,}333\\dots\\)', 'The decimal \\(0.333\\dots\\)'),
            calculationLatex: '\\frac3{10}\\cdot\\frac1{1-1/10}',
            resultLatex: '\\frac13',
            check: text(
                'Je \\(0{,}333\\dots=0{,}3+0{,}03+0{,}003+\\dots\\), geometrijska vrsta z \\(a=\\tfrac3{10}\\) in \\(q=\\tfrac1{10}\\): \\(\\dfrac3{10}\\cdot\\dfrac1{1-1/10}=\\dfrac3{10}\\cdot\\dfrac{10}9=\\dfrac13\\). Enako je \\(0{,}999\\dots\\) vrsta z \\(a=\\tfrac9{10}\\) in \\(q=\\tfrac1{10}\\): \\(\\dfrac9{10}\\cdot\\dfrac{10}9=1\\), zato je \\(0{,}999\\dots=1\\) (ne le skoraj).',
                'We have \\(0.333\\dots=0.3+0.03+0.003+\\dots\\), a geometric series with \\(a=\\tfrac3{10}\\) and \\(q=\\tfrac1{10}\\): \\(\\dfrac3{10}\\cdot\\dfrac1{1-1/10}=\\dfrac3{10}\\cdot\\dfrac{10}9=\\dfrac13\\). Likewise \\(0.999\\dots\\) is the series with \\(a=\\tfrac9{10}\\) and \\(q=\\tfrac1{10}\\): \\(\\dfrac9{10}\\cdot\\dfrac{10}9=1\\), so \\(0.999\\dots=1\\) (not merely nearly).',
            ),
        },
    ],
    steps: [
        step({
            id: 'series-bars', order: 1,
            title: text('Členi in delne vsote', 'Terms and partial sums'),
            purpose: text('Ločiti člen vrste od delne vsote in oboje prebrati iz stolpcev.', 'Telling a term of the series from a partial sum and reading both from the bars.'),
            explanation: text(
                'Vrsta ima prvi člen \\(a=1\\) in količnik \\(q=\\tfrac12\\), torej člene \\(1,\\,0{,}5,\\,0{,}25,\\dots\\) (ozki levi stolpci). Delna vsota \\(S_n\\) je vsota prvih \\(n\\) členov (debeli desni stolpci): \\(S_1=1\\), \\(S_2=1{,}5\\), \\(S_3=1{,}75\\). Vodoravna črta pri \\(2\\) je limita; o njej govori četrti korak.',
                'The series has the first term \\(a=1\\) and the ratio \\(q=\\tfrac12\\), so the terms \\(1,\\,0.5,\\,0.25,\\dots\\) (thin left bars). The partial sum \\(S_n\\) is the sum of the first \\(n\\) terms (thick right bars): \\(S_1=1\\), \\(S_2=1.5\\), \\(S_3=1.75\\). The horizontal line at \\(2\\) is the limit; step 4 is about it.',
            ),
            formulaIds: ['series-partial-sum'],
            observationPrompt: text('Primerjaj višino ozkega in debelega stolpca pri \\(k=3\\): kolikšen del delne vsote \\(S_3\\) prispeva tretji člen?', 'Compare the heights of the thin and the thick bar at \\(k=3\\): how much of the partial sum \\(S_3\\) does the third term contribute?'),
            expectedObservations: [text('Tretji člen je \\(0{,}25\\), delna vsota \\(S_3=1{,}75\\) je višja od vsakega člena, stolpci delnih vsot pa rastejo.', 'The third term is \\(0.25\\), the partial sum \\(S_3=1.75\\) is higher than every term, and the bars of the partial sums grow.')],
            scene: seriesScene('series-bars-default', 'default', 3, 0,
                'Vrsta \\(a=1\\), \\(q=\\tfrac12\\) s tremi prikazanimi členi: \\(S_3=1{,}75\\); limita \\(2\\) je označena.',
                'The series \\(a=1\\), \\(q=\\tfrac12\\) with three shown terms: \\(S_3=1.75\\); the limit \\(2\\) is marked.'),
        }),
        step({
            id: 'series-predict', order: 2,
            title: text('Napovej naslednjo delno vsoto', 'Predict the next partial sum'),
            purpose: text('Napovedati \\(S_5\\), še preden se peti člen pokaže.', 'Predicting \\(S_5\\) before the fifth term appears.'),
            explanation: text(
                'Prikazani so štirje členi in \\(S_4=1{,}875\\). Peti člen \\(aq^4\\) je za polovico manjši od četrtega. Napovej \\(S_5=S_4+aq^4\\) in šele nato pritisni Naslednji korak.',
                'Four terms are shown and \\(S_4=1.875\\). The fifth term \\(aq^4\\) is half of the fourth. Predict \\(S_5=S_4+aq^4\\) and only then press Next step.',
            ),
            formulaIds: ['series-partial-sum'],
            observationPrompt: text('Napiši svojo napoved za \\(S_5\\), pritisni Naslednji korak in jo primerjaj.', 'Write down your prediction for \\(S_5\\), press Next step and compare.'),
            expectedObservations: [text('Peti člen je \\(\\tfrac1{16}=0{,}0625\\) in \\(S_5=1{,}9375\\); vsota se je približala črti pri \\(2\\).', 'The fifth term is \\(\\tfrac1{16}=0.0625\\) and \\(S_5=1.9375\\); the sum moved closer to the line at \\(2\\).')],
            scene: seriesScene('series-predict-next', 'default', 4, 0,
                'Vrsta \\(a=1\\), \\(q=\\tfrac12\\) s štirimi prikazanimi členi: \\(S_4=1{,}875\\); peti člen še ni prikazan.',
                'The series \\(a=1\\), \\(q=\\tfrac12\\) with four shown terms: \\(S_4=1.875\\); the fifth term is not shown yet.'),
        }),
        step({
            id: 'series-reveal', order: 3,
            title: text('Člene razkrivamo enega za drugim', 'Revealing the terms one by one'),
            purpose: text('Preveriti napoved in videti, da zaprta oblika da isto kot seštevanje.', 'Checking the prediction and seeing that the closed form gives the same as adding.'),
            explanation: text(
                'Prikazanih je pet členov: \\(S_5=S_4+aq^4=1{,}875+0{,}0625=1{,}9375\\). Zaprta oblika da isto brez seštevanja: \\(S_5=\\dfrac{1-(1/2)^5}{1-1/2}=\\dfrac{31}{16}=1{,}9375\\). Naslednji korak in Predvajanje razkrijeta po en člen; predvajanje se ustavi pri zgornji meji \\(50\\) členov.',
                'Five terms are shown: \\(S_5=S_4+aq^4=1.875+0.0625=1.9375\\). The closed form gives the same without adding: \\(S_5=\\dfrac{1-(1/2)^5}{1-1/2}=\\dfrac{31}{16}=1.9375\\). Next step and Play reveal one term at a time; playback stops at the cap of \\(50\\) terms.',
            ),
            formulaIds: ['series-partial-sum'],
            workedExampleId: 'series-default-sum',
            observationPrompt: text('Pritiskaj Naslednji korak in opazuj, kako se višina novega debelega stolpca razlikuje od prejšnjega.', 'Keep pressing Next step and watch how the height of each new thick bar differs from the previous one.'),
            expectedObservations: [text('Vsak novi debeli stolpec je višji za vrednost novega člena, ta pa se z vsakim korakom razpolovi: \\(S_5=1{,}9375\\).', 'Each new thick bar is higher by the value of the new term, which halves at every step: \\(S_5=1.9375\\).')],
            scene: seriesScene('series-reveal-five', 'default', 5, 0,
                'Vrsta \\(a=1\\), \\(q=\\tfrac12\\) s petimi prikazanimi členi: peti člen \\(0{,}0625\\) in \\(S_5=1{,}9375\\).',
                'The series \\(a=1\\), \\(q=\\tfrac12\\) with five shown terms: the fifth term \\(0.0625\\) and \\(S_5=1.9375\\).'),
        }),
        step({
            id: 'series-limit', order: 4,
            title: text('Limita \\(\\dfrac a{1-q}\\)', 'The limit \\(\\dfrac a{1-q}\\)'),
            purpose: text('Videti, da se delne vsote približujejo črti \\(\\dfrac a{1-q}\\), in izračunati napako.', 'Seeing that the partial sums approach the line \\(\\dfrac a{1-q}\\), and computing the error.'),
            explanation: text(
                'Ker je \\(|q|=\\tfrac12<1\\), gre \\(q^n\\to0\\) in \\(S_n\\to\\dfrac a{1-q}=\\dfrac1{1-1/2}=2\\); to je vodoravna črta. Napaka \\(2-S_n=2\\cdot2^{-n}\\) se z vsakim členom razpolovi: \\(2-S_5=0{,}0625\\). Delne vsote črte nikoli ne dosežejo, a ji poljubno približajo. Slika s petimi stolpci to le ponazarja, dokaz je \\(q^n\\to0\\) v zaprti obliki.',
                'Since \\(|q|=\\tfrac12<1\\), \\(q^n\\to0\\) and \\(S_n\\to\\dfrac a{1-q}=\\dfrac1{1-1/2}=2\\); this is the horizontal line. The error \\(2-S_n=2\\cdot2^{-n}\\) halves with every term: \\(2-S_5=0.0625\\). The partial sums never reach the line, but they come arbitrarily close. The picture with five bars only illustrates this; the proof is \\(q^n\\to0\\) in the closed form.',
            ),
            formulaIds: ['series-limit'],
            observationPrompt: text('Preberi napako \\(2-S_5\\) in jo primerjaj z napako pri \\(S_4=1{,}875\\).', 'Read the error \\(2-S_5\\) and compare it with the error at \\(S_4=1.875\\).'),
            expectedObservations: [text('Napaka pri \\(S_4\\) je \\(0{,}125\\), pri \\(S_5\\) pa \\(0{,}0625\\), torej natanko polovica.', 'The error at \\(S_4\\) is \\(0.125\\) and at \\(S_5\\) it is \\(0.0625\\), exactly half.')],
            scene: seriesScene('series-limit-two', 'default', 5, 0,
                'Vrsta \\(a=1\\), \\(q=\\tfrac12\\): limita \\(\\dfrac a{1-q}=2\\) je označena, \\(S_5=1{,}9375\\) in napaka \\(0{,}0625\\).',
                'The series \\(a=1\\), \\(q=\\tfrac12\\): the limit \\(\\dfrac a{1-q}=2\\) is marked, \\(S_5=1.9375\\) and the error \\(0.0625\\).'),
        }),
        step({
            id: 'series-alternating', order: 5,
            title: text('Negativen količnik niha okoli limite', 'A negative ratio oscillates around the limit'),
            purpose: text('Videti, da pri \\(q<0\\) delne vsote izmenično presegajo limito in ne dosežejo njene vrednosti.', 'Seeing that for \\(q<0\\) the partial sums alternately overshoot and fall short of the limit.'),
            explanation: text(
                'Pri \\(q=-\\tfrac12\\) členi izmenjujejo predznak: \\(1,\\,-0{,}5,\\,0{,}25,\\,-0{,}125\\). Delne vsote so \\(S_1=1\\), \\(S_2=0{,}5\\), \\(S_3=0{,}75\\), \\(S_4=0{,}625\\). Limita je \\(\\dfrac1{1-(-1/2)}=\\dfrac23\\approx0{,}6667\\): \\(S_1\\) in \\(S_3\\) sta nad njo, \\(S_2\\) in \\(S_4\\) pod njo. Ker je \\(|q|<1\\), vrsta še vedno konvergira.',
                'At \\(q=-\\tfrac12\\) the terms alternate in sign: \\(1,\\,-0.5,\\,0.25,\\,-0.125\\). The partial sums are \\(S_1=1\\), \\(S_2=0.5\\), \\(S_3=0.75\\), \\(S_4=0.625\\). The limit is \\(\\dfrac1{1-(-1/2)}=\\dfrac23\\approx0.6667\\): \\(S_1\\) and \\(S_3\\) lie above it, \\(S_2\\) and \\(S_4\\) below it. Since \\(|q|<1\\), the series still converges.',
            ),
            formulaIds: ['series-limit'],
            observationPrompt: text('Poišči, katere delne vsote so nad limito in katere pod njo.', 'Find which partial sums are above the limit and which below it.'),
            expectedObservations: [text('Lihe delne vsote (\\(1\\), \\(0{,}75\\)) so nad limito \\(\\tfrac23\\), sode (\\(0{,}5\\), \\(0{,}625\\)) pod njo; razdalja do limite se zmanjšuje.', 'The odd partial sums (\\(1\\), \\(0.75\\)) are above the limit \\(\\tfrac23\\), the even ones (\\(0.5\\), \\(0.625\\)) below it; the distance to the limit shrinks.')],
            scene: seriesScene('series-alternating-q', 'alternating', 4, 0,
                'Vrsta \\(a=1\\), \\(q=-\\tfrac12\\) s štirimi prikazanimi členi: \\(S_4=0{,}625\\); limita \\(\\tfrac23\\) je označena.',
                'The series \\(a=1\\), \\(q=-\\tfrac12\\) with four shown terms: \\(S_4=0.625\\); the limit \\(\\tfrac23\\) is marked.'),
        }),
        step({
            id: 'series-divergence', order: 6,
            title: text('Pri \\(|q|\\ge1\\) vrsta ne konvergira', 'For \\(|q|\\ge1\\) the series does not converge'),
            purpose: text('Videti, da pri \\(q=-1\\) delne vsote nihajo in limite ni.', 'Seeing that at \\(q=-1\\) the partial sums oscillate and there is no limit.'),
            explanation: text(
                'Pri \\(q=-1\\) in \\(a=1\\) so členi \\(1,\\,-1,\\,1,\\dots\\), delne vsote pa \\(S_1=1\\), \\(S_2=0\\), \\(S_3=1\\), \\(S_4=0\\), \\(S_5=1\\), \\(S_6=0\\): nihajo med \\(a=1\\) in \\(0\\), zato limite ni in črta ni narisana. Pri \\(|q|\\ge1\\) členi ne težijo k \\(0\\), zato vrsta ne more konvergirati. Pri \\(q=1\\) je \\(S_n=na\\) in narašča čez vse meje; tam formule z \\(1-q\\) ne uporabimo.',
                'At \\(q=-1\\) and \\(a=1\\) the terms are \\(1,\\,-1,\\,1,\\dots\\) and the partial sums \\(S_1=1\\), \\(S_2=0\\), \\(S_3=1\\), \\(S_4=0\\), \\(S_5=1\\), \\(S_6=0\\): they oscillate between \\(a=1\\) and \\(0\\), so there is no limit and no line is drawn. For \\(|q|\\ge1\\) the terms do not tend to \\(0\\), so the series cannot converge. At \\(q=1\\) we have \\(S_n=na\\), which grows without bound; there the formula with \\(1-q\\) is not used.',
            ),
            formulaIds: ['series-partial-sum', 'series-limit'],
            observationPrompt: text('Poišči limitno črto in preveri, ali delne vsote kam težijo.', 'Look for the limit line and check whether the partial sums tend anywhere.'),
            expectedObservations: [text('Limitne črte ni, delne vsote pa izmenično zavzemajo vrednosti \\(1\\) in \\(0\\).', 'There is no limit line, and the partial sums alternately take the values \\(1\\) and \\(0\\).')],
            scene: seriesScene('series-divergence-minus-one', 'divergent', 6, 0,
                'Vrsta \\(a=1\\), \\(q=-1\\) s šestimi prikazanimi členi: \\(S_6=0\\); limite ni in črta ni narisana.',
                'The series \\(a=1\\), \\(q=-1\\) with six shown terms: \\(S_6=0\\); there is no limit and no line is drawn.'),
        }),
        step({
            id: 'series-decimals', order: 7,
            title: text('Periodični decimalni zapis', 'Repeating decimals'),
            purpose: text('Z geometrijsko vrsto pretvoriti \\(0{,}333\\dots\\) v ulomek in razumeti, zakaj je \\(0{,}999\\dots=1\\).', 'Converting \\(0.333\\dots\\) to a fraction with a geometric series and understanding why \\(0.999\\dots=1\\).'),
            explanation: text(
                'Število \\(0{,}333\\dots=0{,}3+0{,}03+0{,}003+\\dots\\) je vrsta z \\(a=0{,}3\\) in \\(q=0{,}1\\): členi so \\(0{,}3,\\,0{,}03,\\,0{,}003,\\,0{,}0003\\), \\(S_4=0{,}3333\\), limita pa \\(\\dfrac{3/10}{1-1/10}=\\dfrac13\\). Isto za \\(0{,}999\\dots\\): \\(a=0{,}9\\), \\(q=0{,}1\\) in limita \\(\\dfrac{9/10}{9/10}=1\\), zato je \\(0{,}999\\dots=1\\). Vsaka delna vsota je manjša od \\(1\\), a zapis \\(0{,}999\\dots\\) pomeni prav limito vseh delnih vsot, ne eno od njih.',
                'The number \\(0.333\\dots=0.3+0.03+0.003+\\dots\\) is the series with \\(a=0.3\\) and \\(q=0.1\\): the terms are \\(0.3,\\,0.03,\\,0.003,\\,0.0003\\), \\(S_4=0.3333\\), and the limit is \\(\\dfrac{3/10}{1-1/10}=\\dfrac13\\). The same for \\(0.999\\dots\\): \\(a=0.9\\), \\(q=0.1\\) and the limit \\(\\dfrac{9/10}{9/10}=1\\), so \\(0.999\\dots=1\\). Every partial sum is below \\(1\\), but the notation \\(0.999\\dots\\) means precisely the limit of all the partial sums, not one of them.',
            ),
            formulaIds: ['series-limit'],
            workedExampleId: 'series-three-recurring',
            observationPrompt: text('Primerjaj \\(S_4\\) z limito \\(\\tfrac13\\); nato izberi primer \\(a=0{,}9\\), \\(q=0{,}1\\) in preveri limito.', 'Compare \\(S_4\\) with the limit \\(\\tfrac13\\); then choose the example \\(a=0.9\\), \\(q=0.1\\) and check the limit.'),
            expectedObservations: [text('\\(S_4=0{,}3333\\) je tik pod limito \\(\\tfrac13\\); pri \\(a=0{,}9\\) je limita \\(1\\).', '\\(S_4=0.3333\\) is just below the limit \\(\\tfrac13\\); for \\(a=0.9\\) the limit is \\(1\\).')],
            scene: seriesScene('series-decimals-third', 'repeating-three', 4, 0,
                'Vrsta \\(a=0{,}3\\), \\(q=0{,}1\\) s štirimi prikazanimi členi: \\(S_4=0{,}3333\\); limita \\(\\tfrac13\\) je označena.',
                'The series \\(a=0.3\\), \\(q=0.1\\) with four shown terms: \\(S_4=0.3333\\); the limit \\(\\tfrac13\\) is marked.'),
        }),
        step({
            id: 'series-explore', order: 8,
            title: text('Prosto raziskovanje s pasom odstopanja', 'Free exploration with a tolerance band'),
            purpose: text('Z odstopanjem poiskati prvi \\(n\\), od katerega so vse delne vsote dovolj blizu limite.', 'Using a tolerance to find the first \\(n\\) from which all partial sums are close enough to the limit.'),
            explanation: text(
                'Odstopanje \\(0{,}01\\) je pas okoli limite \\(2\\). Napaka \\(2\\cdot2^{-n}\\) je manjša od \\(0{,}01\\) natanko tedaj, ko je \\(2^n>200\\), torej od \\(n=8\\) naprej: \\(2-S_8=\\tfrac1{128}\\approx0{,}0078\\), pri \\(n=7\\) pa je napaka \\(\\tfrac1{64}\\approx0{,}0156\\) še prevelika. Spreminjaj \\(a\\), \\(q\\), \\(n\\) in odstopanje; stolpcev je največ \\(50\\). Končna slika ponazarja, zaprta oblika dokazuje.',
                'The tolerance \\(0.01\\) is a band around the limit \\(2\\). The error \\(2\\cdot2^{-n}\\) is below \\(0.01\\) exactly when \\(2^n>200\\), that is from \\(n=8\\) on: \\(2-S_8=\\tfrac1{128}\\approx0.0078\\), while at \\(n=7\\) the error \\(\\tfrac1{64}\\approx0.0156\\) is still too large. Change \\(a\\), \\(q\\), \\(n\\) and the tolerance; there are at most \\(50\\) bars. A finite picture illustrates, the closed form proves.',
            ),
            formulaIds: ['series-partial-sum', 'series-limit'],
            observationPrompt: text('Poišči prvi \\(n\\), pri katerem vrh debelega stolpca pride v pas, in ga preveri z neenačbo \\(2^n>200\\).', 'Find the first \\(n\\) at which the top of the thick bar enters the band and check it with the inequality \\(2^n>200\\).'),
            expectedObservations: [text('Prvi tak \\(n\\) je \\(8\\); stolpec \\(S_7\\) je še zunaj pasu, \\(S_8\\) in vsi naslednji so znotraj.', 'The first such \\(n\\) is \\(8\\); the bar \\(S_7\\) is still outside the band, \\(S_8\\) and all later ones are inside.')],
            scene: seriesScene('series-explore-band', 'default', 8, 0.01,
                'Vrsta \\(a=1\\), \\(q=\\tfrac12\\) z osmimi prikazanimi členi in odstopanjem \\(0{,}01\\): napaka \\(2-S_8\\approx0{,}0078\\), prvi \\(n\\) v pasu je \\(8\\).',
                'The series \\(a=1\\), \\(q=\\tfrac12\\) with eight shown terms and the tolerance \\(0.01\\): the error \\(2-S_8\\approx0.0078\\), the first \\(n\\) in the band is \\(8\\).'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-geometric-series-implementation',
            citation: 'Bezeg source: src/analysis/geometricSeries.ts, src/analysis/geometricSeriesModel.ts and src/graphs/functions/GeometricSeriesGraph.tsx.',
            implementationCorrespondence: 'A scene chooses the example (a and q), sets the number of shown terms n by series-n and the tolerance by series-tolerance; a scene never starts playback. The lesson text quotes only values of those scenes and values recomputed in the test.',
        },
    ],
    edgeCases: [
        text('Prvi člen \\(a\\) leži med \\(0{,}1\\) in \\(5\\), količnik \\(q\\) med \\(-2\\) in \\(2\\), odstopanje med \\(0\\) in \\(1\\) (\\(0\\) pomeni brez pasu); vrednost zunaj območja je zavrnjena in je ne zaokrožimo.', 'The first term \\(a\\) lies in \\(0.1\\) to \\(5\\), the ratio \\(q\\) in \\(-2\\) to \\(2\\), the tolerance in \\(0\\) to \\(1\\) (\\(0\\) means no band); a value outside the range is rejected and not rounded.'),
        text('Prikazanih je največ \\(50\\) členov; predvajanje se začne ustavljeno in se ustavi pri zadnjem členu.', 'At most \\(50\\) terms are shown; playback starts stopped and stops at the last term.'),
        text('Pri \\(|q|\\ge1\\) limitne črte ni; pri \\(q=1\\) je \\(S_n=na\\) brez deljenja z \\(0\\), pri \\(q=-1\\) delne vsote nihajo med \\(a\\) in \\(0\\).', 'For \\(|q|\\ge1\\) there is no limit line; at \\(q=1\\) we have \\(S_n=na\\) without dividing by \\(0\\), and at \\(q=-1\\) the partial sums oscillate between \\(a\\) and \\(0\\).'),
    ],
    unresolvedQuestions: [],
};

export const schoolFunctionGraphsBatchCGuidedLessons: readonly GuidedLesson[] = [seriesLesson];
