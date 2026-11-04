/**
 * Guided lessons of the School function graphs family (docs/specs/school-function-graphs-lessons.md), batch C: S5, the geometric series and
 * its partial sums, on `geometric-series`. S6, the conics (focus, directrix, eccentricity and the Bezier bridge), on `conic-focal`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every
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

// ---------------------------------------------------------------------------------------------------------------- S6

export type ConicLessonExample = 'ellipse' | 'parabola' | 'hyperbola' | 'circle';

/**
 * An S6 scene from the default scene: the example first (it fixes the conic, the point P and switches the Bezier arc off, with the matched
 * weight), then, if wanted, the arc and its middle weight. So no scene depends on the scene before it.
 */
const conicScene = (id: string, example: ConicLessonExample, bridge: {readonly weight?: number} | undefined, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'conic-example', value: example},
        ...(bridge === undefined ? [] : [{kind: 'function-visibility', target: 'conic-bridge', visible: true} satisfies LessonAction]),
        ...(bridge?.weight === undefined ? [] : [{kind: 'function-parameter', name: 'conic-weight', value: bridge.weight} satisfies LessonAction]),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const conicLesson: GuidedLesson = {
    demonstrationId: 'conic-focal',
    title: text('Stožnice: gorišče, vodnica, ekscentričnost in most do Bézierja', 'Conics: focus, directrix, eccentricity and the Bézier bridge'),
    summary: text(
        'Točka \\(P\\) leži na stožnici natanko tedaj, ko je \\(|PF|=\\varepsilon\\,|Pd|\\) (\\(F\\) gorišče, \\(d\\) vodnica, \\(\\varepsilon\\) numerična ekscentričnost). Za \\(\\varepsilon<1\\) je to elipsa, za \\(\\varepsilon=1\\) parabola, za \\(\\varepsilon>1\\) hiperbola, za \\(\\varepsilon=0\\) krožnica brez vodnice. Stožnico dobimo tudi kot racionalni kvadratni Bézierjev lok, srednja utež pa odloči o vrsti.',
        'A point \\(P\\) lies on a conic exactly when \\(|PF|=\\varepsilon\\,|Pd|\\) (\\(F\\) the focus, \\(d\\) the directrix, \\(\\varepsilon\\) the eccentricity). For \\(\\varepsilon<1\\) it is an ellipse, for \\(\\varepsilon=1\\) a parabola, for \\(\\varepsilon>1\\) a hyperbola, and for \\(\\varepsilon=0\\) a circle without a directrix. A conic is also a rational quadratic Bézier arc, and the middle weight decides its kind.',
    ),
    prerequisites: [
        text('Potrebno je znanje o afinih slikah grafov iz lekcije o transformacijah funkcij in o racionalnih Bézierjevih krivuljah (poglavje Racionalne krivulje, lekcija Racionalna Bézierjeva krivulja).', 'Assumes affine images of graphs from the lesson on function transformations and rational Bézier curves (the chapter Rational curves, the lesson Rational Bézier curve).'),
    ],
    learningGoals: [
        text('Za točko na elipsi izračunaš razdalji do obeh gorišč in preveriš, da je njuna vsota enaka \\(2a\\).', 'For a point on an ellipse compute the distances to both foci and check that their sum equals \\(2a\\).'),
        text('Iz razmerja \\(|PF|/|Pd|\\) prebereš \\(\\varepsilon\\), po njem ločiš elipso, parabolo in hiperbolo ter vidiš krožnico kot mejni primer \\(\\varepsilon=0\\).', 'Read \\(\\varepsilon\\) from the ratio \\(|PF|/|Pd|\\), tell the ellipse, parabola and hyperbola apart by it, and see the circle as the limiting case \\(\\varepsilon=0\\).'),
        text('Poveš, da srednja utež \\(w_1<1\\) da elipso, \\(w_1=1\\) parabolo in \\(w_1>1\\) hiperbolo, in to povežeš z racionalno Bézierjevo krivuljo.', 'State that the middle weight \\(w_1<1\\) gives an ellipse, \\(w_1=1\\) a parabola and \\(w_1>1\\) a hyperbola, and connect this with the rational Bézier curve.'),
    ],
    formulaBlocks: [
        {
            id: 'conic-definition',
            latex: '|PF|=\\varepsilon\\,|Pd|',
            notation: text(
                '\\(F\\) je gorišče, \\(d\\) vodnica, \\(|Pd|\\) razdalja točke \\(P\\) do vodnice in \\(\\varepsilon\\ge0\\) numerična ekscentričnost.',
                '\\(F\\) is the focus, \\(d\\) the directrix, \\(|Pd|\\) the distance of \\(P\\) from the directrix and \\(\\varepsilon\\ge0\\) the eccentricity.',
            ),
            explanation: text(
                'Za \\(\\varepsilon<1\\) je krivulja elipsa, za \\(\\varepsilon=1\\) parabola in za \\(\\varepsilon>1\\) hiperbola. Pri \\(\\varepsilon=0\\) enačba \\(|PF|=0\\cdot|Pd|\\) velja le v točki \\(F\\); krožnica je zato mejni primer s polmerom \\(\\ell\\) okoli \\(F\\) in brez vodnice. Pri elipsi in hiperboli je \\(\\varepsilon=c/a\\).',
                'For \\(\\varepsilon<1\\) the curve is an ellipse, for \\(\\varepsilon=1\\) a parabola and for \\(\\varepsilon>1\\) a hyperbola. At \\(\\varepsilon=0\\) the equation \\(|PF|=0\\cdot|Pd|\\) holds only at \\(F\\); the circle is therefore a limiting case, with radius \\(\\ell\\) around \\(F\\) and no directrix. For the ellipse and the hyperbola \\(\\varepsilon=c/a\\).',
            ),
        },
        {
            id: 'conic-focal-sum-difference',
            latex: '|PF_1|+|PF_2|=2a\\ \\text{(ellipse)},\\qquad \\bigl||PF_2|-|PF_1|\\bigr|=2a\\ \\text{(hyperbola)}',
            notation: text(
                '\\(F_1\\) in \\(F_2\\) sta gorišči, \\(a\\) je velika polos in \\(2a\\) razdalja med temenoma na glavni osi.',
                '\\(F_1\\) and \\(F_2\\) are the foci, \\(a\\) is the semi-major axis and \\(2a\\) the distance between the vertices on the main axis.',
            ),
            explanation: text(
                'Pri elipsi je vsota razdalj do gorišč za vsako točko enaka \\(2a\\), pri hiperboli pa je stalna razlika razdalj. Pri obeh je \\(\\varepsilon=c/a\\).',
                'On an ellipse the sum of the distances to the foci equals \\(2a\\) for every point, and on a hyperbola the difference of the distances is constant. In both cases \\(\\varepsilon=c/a\\).',
            ),
        },
        {
            id: 'conic-rational-bezier',
            latex: 'R(t)=\\frac{(1-t)^2P_0+2t(1-t)w_1P_1+t^2P_2}{(1-t)^2+2t(1-t)w_1+t^2}',
            notation: text(
                '\\(P_0,P_1,P_2\\) so kontrolne točke, \\(w_1\\) je srednja utež, krajni uteži sta \\(1\\), \\(t\\in[0,1]\\).',
                '\\(P_0,P_1,P_2\\) are the control points, \\(w_1\\) the middle weight, the end weights are \\(1\\), and \\(t\\in[0,1]\\).',
            ),
            explanation: text(
                'Pri krajnih utežeh \\(1\\) je lok del elipse za \\(w_1<1\\), del parabole za \\(w_1=1\\) in del hiperbole za \\(w_1>1\\). Prilegajočo se utež določa oblika stožnice; le z njo lok leži na stožnici.',
                'With end weights \\(1\\) the arc is a piece of an ellipse for \\(w_1<1\\), of a parabola for \\(w_1=1\\) and of a hyperbola for \\(w_1>1\\). The matching weight is fixed by the shape of the conic; only with it does the arc lie on the conic.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'conic-ellipse-ratio',
            title: text('Razmerje na elipsi \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) v točki \\(P=(0,3)\\)', 'The ratio on the ellipse \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) at \\(P=(0,3)\\)'),
            calculationLatex: '\\frac{|PF|}{|Pd|}=\\frac5{6.25}',
            resultLatex: '\\frac45',
            check: text(
                'Tu je \\(a=5\\), \\(b=3\\), \\(c=\\sqrt{25-9}=4\\), gorišče \\(F=(4,0)\\), vodnica \\(x=\\dfrac{a^2}c=6{,}25\\). Je \\(|PF|=\\sqrt{16+9}=5\\) in \\(|Pd|=6{,}25-0=6{,}25\\), torej \\(\\dfrac5{6{,}25}=0{,}8=\\dfrac ca=\\varepsilon\\). Drugo gorišče \\((-4,0)\\) da \\(|PF_2|=5\\) in vsoto \\(10=2a\\).',
                'Here \\(a=5\\), \\(b=3\\), \\(c=\\sqrt{25-9}=4\\), the focus is \\(F=(4,0)\\) and the directrix \\(x=\\dfrac{a^2}c=6.25\\). We get \\(|PF|=\\sqrt{16+9}=5\\) and \\(|Pd|=6.25-0=6.25\\), so \\(\\dfrac5{6.25}=0.8=\\dfrac ca=\\varepsilon\\). The other focus \\((-4,0)\\) gives \\(|PF_2|=5\\) and the sum \\(10=2a\\).',
            ),
        },
        {
            id: 'conic-hyperbola-ratio',
            title: text('Hiperbola \\(\\tfrac{x^2}9-\\tfrac{y^2}{16}=1\\) v točki \\(P=(6,\\sqrt{48})\\)', 'The hyperbola \\(\\tfrac{x^2}9-\\tfrac{y^2}{16}=1\\) at \\(P=(6,\\sqrt{48})\\)'),
            calculationLatex: '\\frac{|PF|}{|Pd|}=\\frac7{4.2}',
            resultLatex: '\\frac53',
            check: text(
                'Tu je \\(a=3\\), \\(b=4\\), \\(c=5\\), \\(F=(5,0)\\), \\(F_2=(-5,0)\\), vodnica \\(x=\\dfrac{a^2}c=1{,}8\\). Je \\(|PF|=\\sqrt{1+48}=7\\), \\(|Pd|=6-1{,}8=4{,}2\\) in \\(\\dfrac7{4{,}2}=\\dfrac53=\\varepsilon\\). Drugo gorišče da \\(|PF_2|=\\sqrt{121+48}=13\\), razlika pa je \\(13-7=6=2a\\).',
                'Here \\(a=3\\), \\(b=4\\), \\(c=5\\), \\(F=(5,0)\\), \\(F_2=(-5,0)\\) and the directrix \\(x=\\dfrac{a^2}c=1.8\\). We get \\(|PF|=\\sqrt{1+48}=7\\), \\(|Pd|=6-1.8=4.2\\) and \\(\\dfrac7{4.2}=\\dfrac53=\\varepsilon\\). The other focus gives \\(|PF_2|=\\sqrt{121+48}=13\\), and the difference is \\(13-7=6=2a\\).',
            ),
        },
        {
            id: 'conic-quarter-ellipse-bezier',
            title: text('Četrtina elipse kot racionalna Bézierjeva krivulja', 'A quarter ellipse as a rational Bézier curve'),
            calculationLatex: 'R\\bigl(\\tfrac12\\bigr)=\\frac{P_0+\\sqrt2\\,P_1+P_2}{2+\\sqrt2}',
            resultLatex: '(3.5355,\\;2.1213)',
            check: text(
                'Kontrolne točke so \\((5,0)\\), \\((5,3)\\), \\((0,3)\\) z utežmi \\(1\\), \\(\\tfrac{\\sqrt2}2\\), \\(1\\). Pri \\(t=\\tfrac12\\) je imenovalec \\(2+\\sqrt2\\), števec pa \\((5+5\\sqrt2,\\ 3+3\\sqrt2)\\), torej \\(R=(3{,}5355;\\ 2{,}1213)\\). Preverimo: \\(\\tfrac{3{,}5355^2}{25}+\\tfrac{2{,}1213^2}9=0{,}5+0{,}5=1\\).',
                'The control points are \\((5,0)\\), \\((5,3)\\), \\((0,3)\\) with the weights \\(1\\), \\(\\tfrac{\\sqrt2}2\\), \\(1\\). At \\(t=\\tfrac12\\) the denominator is \\(2+\\sqrt2\\) and the numerator \\((5+5\\sqrt2,\\ 3+3\\sqrt2)\\), so \\(R=(3.5355,\\ 2.1213)\\). Check: \\(\\tfrac{3.5355^2}{25}+\\tfrac{2.1213^2}9=0.5+0.5=1\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'conic-ellipse-sum', order: 1,
            title: text('Vsota razdalj do gorišč na elipsi', 'The sum of the focal distances on an ellipse'),
            purpose: text('Za točko na elipsi izmeriti obe razdalji do gorišč in videti, da je njuna vsota stalna.', 'Measuring both focal distances for a point on an ellipse and seeing that their sum is constant.'),
            explanation: text(
                'Elipsa \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) ima gorišči \\(F=(4,0)\\) in \\(F_2=(-4,0)\\). V točki \\(P=(0,3)\\) je \\(|PF|=5\\) in \\(|PF_2|=5\\), vsota je \\(10=2a\\). Povleci \\(P\\) po elipsi: razdalji se spreminjata, vsota pa ostane \\(10\\).',
                'The ellipse \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\) has the foci \\(F=(4,0)\\) and \\(F_2=(-4,0)\\). At \\(P=(0,3)\\) we have \\(|PF|=5\\) and \\(|PF_2|=5\\), and the sum is \\(10=2a\\). Drag \\(P\\) along the ellipse: the distances change, but the sum stays \\(10\\).',
            ),
            formulaIds: ['conic-focal-sum-difference'],
            observationPrompt: text('Povleci točko \\(P\\) v desno teme in preberi \\(|PF|\\), \\(|PF_2|\\) in njuno vsoto.', 'Drag \\(P\\) to the right vertex and read \\(|PF|\\), \\(|PF_2|\\) and their sum.'),
            expectedObservations: [text('V desnem temenu \\((5,0)\\) je \\(|PF|=1\\) in \\(|PF_2|=9\\); vsota je spet \\(10\\).', 'At the right vertex \\((5,0)\\) we have \\(|PF|=1\\) and \\(|PF_2|=9\\); the sum is again \\(10\\).')],
            scene: conicScene('conic-ellipse-sum-scene', 'ellipse', undefined,
                'Elipsa s točko \\(P=(0,3)\\): \\(|PF|=5\\), \\(|PF_2|=5\\) in vsota \\(10\\).',
                'The ellipse with the point \\(P=(0,3)\\): \\(|PF|=5\\), \\(|PF_2|=5\\) and the sum \\(10\\).'),
        }),
        step({
            id: 'conic-ratio-reveal', order: 2,
            title: text('Napovej razmerje do vodnice', 'Predict the ratio to the directrix'),
            purpose: text('Napovedati razmerje \\(|PF|/|Pd|\\) in ga primerjati z \\(\\varepsilon=\\tfrac ca\\).', 'Predicting the ratio \\(|PF|/|Pd|\\) and comparing it with \\(\\varepsilon=\\tfrac ca\\).'),
            explanation: text(
                'Vodnica elipse je črtkana premica \\(x=6{,}25\\). Preden pogledaš odčitek, izračunaj razmerje \\(|PF|/|Pd|\\) pri \\(P=(0,3)\\): \\(|PF|=5\\), razdalja do vodnice je \\(6{,}25\\), razmerje je \\(\\dfrac5{6{,}25}=0{,}8\\). To je natanko \\(\\varepsilon=\\dfrac ca=\\dfrac45\\) in tako ostane za vsako točko elipse.',
                'The directrix of the ellipse is the dashed line \\(x=6.25\\). Before you look at the readout, compute the ratio \\(|PF|/|Pd|\\) at \\(P=(0,3)\\): \\(|PF|=5\\), the distance to the directrix is \\(6.25\\), and the ratio is \\(\\dfrac5{6.25}=0.8\\). This is exactly \\(\\varepsilon=\\dfrac ca=\\dfrac45\\), and it stays so for every point of the ellipse.',
            ),
            formulaIds: ['conic-definition'],
            workedExampleId: 'conic-ellipse-ratio',
            observationPrompt: text('Zapiši napoved razmerja, nato povleci \\(P\\) drugam in preveri, ali se razmerje spremeni.', 'Write down your predicted ratio, then drag \\(P\\) elsewhere and check whether the ratio changes.'),
            expectedObservations: [text('Razmerje je vedno \\(0{,}8=\\varepsilon\\), čeprav se \\(|PF|\\) in \\(|Pd|\\) spreminjata.', 'The ratio is always \\(0.8=\\varepsilon\\), although \\(|PF|\\) and \\(|Pd|\\) change.')],
            scene: conicScene('conic-ratio-reveal-scene', 'ellipse', undefined,
                'Elipsa s točko \\(P=(0,3)\\): \\(|PF|=5\\), \\(|Pd|=6{,}25\\) in razmerje \\(0{,}8=\\varepsilon\\).',
                'The ellipse with the point \\(P=(0,3)\\): \\(|PF|=5\\), \\(|Pd|=6.25\\) and the ratio \\(0.8=\\varepsilon\\).'),
        }),
        step({
            id: 'conic-parabola', order: 3,
            title: text('Drsenje \\(\\varepsilon\\) skozi \\(1\\): parabola', 'Sliding \\(\\varepsilon\\) through \\(1\\): the parabola'),
            purpose: text('Videti, da natanko \\(\\varepsilon=1\\) da parabolo, v kateri je \\(P\\) enako daleč od gorišča in vodnice.', 'Seeing that exactly \\(\\varepsilon=1\\) gives the parabola, in which \\(P\\) is equally far from the focus and the directrix.'),
            explanation: text(
                'Parabola \\(y^2=4x\\) ima gorišče \\((1,0)\\) in vodnico \\(x=-1\\). V točki \\(P=(1,2)\\) je \\(|PF|=2\\) in \\(|Pd|=2\\), razmerje je \\(1=\\varepsilon\\). Drsnik za \\(\\varepsilon\\) doseže natanko \\(1\\): pod \\(1\\) je krivulja elipsa, nad \\(1\\) hiperbola, parabola pa je meja, pri kateri se elipsa odpre in drugega gorišča ni več.',
                'The parabola \\(y^2=4x\\) has the focus \\((1,0)\\) and the directrix \\(x=-1\\). At \\(P=(1,2)\\) we have \\(|PF|=2\\) and \\(|Pd|=2\\), and the ratio is \\(1=\\varepsilon\\). The slider for \\(\\varepsilon\\) reaches exactly \\(1\\): below \\(1\\) the curve is an ellipse, above \\(1\\) a hyperbola, and the parabola is the border where the ellipse opens up and the second focus is gone.',
            ),
            formulaIds: ['conic-definition'],
            observationPrompt: text('Z drsnikom pelji \\(\\varepsilon\\) čez \\(1\\) in opazuj, kaj se zgodi z drugim goriščem in z vejami krivulje.', 'Move \\(\\varepsilon\\) across \\(1\\) with the slider and watch what happens to the second focus and to the branches of the curve.'),
            expectedObservations: [text('Pod \\(1\\) je krivulja sklenjena in ima dve gorišči, pri \\(1\\) drugega gorišča ni, nad \\(1\\) sta dve veji.', 'Below \\(1\\) the curve is closed with two foci, at \\(1\\) there is no second focus, and above \\(1\\) there are two branches.')],
            scene: conicScene('conic-parabola-scene', 'parabola', undefined,
                'Parabola \\(\\varepsilon=1\\) s točko \\(P=(1,2)\\): \\(|PF|=2\\), \\(|Pd|=2\\).',
                'The parabola \\(\\varepsilon=1\\) with the point \\(P=(1,2)\\): \\(|PF|=2\\), \\(|Pd|=2\\).'),
        }),
        step({
            id: 'conic-hyperbola', order: 4,
            title: text('Hiperbola: razlika razdalj do gorišč', 'The hyperbola: the difference of the focal distances'),
            purpose: text('Pri \\(\\varepsilon>1\\) videti, da je razlika razdalj do gorišč stalna.', 'Seeing that for \\(\\varepsilon>1\\) the difference of the focal distances is constant.'),
            explanation: text(
                'Hiperbola \\(\\tfrac{x^2}9-\\tfrac{y^2}{16}=1\\) ima \\(c=5\\), \\(\\varepsilon=\\tfrac53\\) in vodnico \\(x=1{,}8\\). V točki \\(P=(6,\\sqrt{48})\\) je \\(|PF|=7\\), razdalja do vodnice \\(4{,}2\\), razmerje \\(\\tfrac53\\approx1{,}6667\\), \\(|PF_2|=13\\) in razlika \\(13-7=6=2a\\).',
                'The hyperbola \\(\\tfrac{x^2}9-\\tfrac{y^2}{16}=1\\) has \\(c=5\\), \\(\\varepsilon=\\tfrac53\\) and the directrix \\(x=1.8\\). At \\(P=(6,\\sqrt{48})\\) we have \\(|PF|=7\\), the distance to the directrix \\(4.2\\), the ratio \\(\\tfrac53\\approx1.6667\\), \\(|PF_2|=13\\) and the difference \\(13-7=6=2a\\).',
            ),
            formulaIds: ['conic-definition', 'conic-focal-sum-difference'],
            workedExampleId: 'conic-hyperbola-ratio',
            observationPrompt: text('Povleci \\(P\\) po veji in pri vsakem položaju preberi razliko \\(|PF_2|-|PF|\\).', 'Drag \\(P\\) along the branch and read the difference \\(|PF_2|-|PF|\\) at each position.'),
            expectedObservations: [text('Razlika ostane \\(6\\), razmerje pa \\(\\tfrac53\\).', 'The difference stays \\(6\\) and the ratio stays \\(\\tfrac53\\).')],
            scene: conicScene('conic-hyperbola-scene', 'hyperbola', undefined,
                'Hiperbola s točko \\(P=(6,\\sqrt{48})\\): \\(|PF|=7\\), \\(|Pd|=4{,}2\\), razmerje \\(1{,}6667\\), \\(|PF_2|=13\\) in razlika \\(6\\).',
                'The hyperbola with the point \\(P=(6,\\sqrt{48})\\): \\(|PF|=7\\), \\(|Pd|=4.2\\), the ratio \\(1.6667\\), \\(|PF_2|=13\\) and the difference \\(6\\).'),
        }),
        step({
            id: 'conic-circle', order: 5,
            title: text('Krožnica kot \\(\\varepsilon=0\\)', 'The circle as \\(\\varepsilon=0\\)'),
            purpose: text('Razumeti krožnico kot mejni primer brez vodnice.', 'Understanding the circle as the limiting case without a directrix.'),
            explanation: text(
                'Ko gre \\(\\varepsilon\\to0\\), se drugo gorišče približuje prvemu, vodnica na razdalji \\(\\ell/\\varepsilon\\) pa odide v neskončnost. Pri \\(\\varepsilon=0\\) gorišči sovpadata, krivulja je krožnica s polmerom \\(\\ell\\) okoli \\(F\\) in vodnice ni. Razmerje \\(|PF|/|Pd|\\) zato ni določeno, razdalja \\(|PF|\\) pa je povsod enaka polmeru.',
                'As \\(\\varepsilon\\to0\\) the second focus approaches the first and the directrix, at distance \\(\\ell/\\varepsilon\\), runs off to infinity. At \\(\\varepsilon=0\\) the foci coincide, the curve is a circle of radius \\(\\ell\\) around \\(F\\) and there is no directrix. The ratio \\(|PF|/|Pd|\\) is therefore undefined, while \\(|PF|\\) equals the radius everywhere.',
            ),
            formulaIds: ['conic-definition'],
            observationPrompt: text('Poišči vodnico in odčitek razmerja ter povleci \\(P\\): kaj se zgodi z \\(|PF|\\)?', 'Look for the directrix and the ratio readout and drag \\(P\\): what happens to \\(|PF|\\)?'),
            expectedObservations: [text('Vodnice ni, razmerje je nedoločeno, \\(|PF|=3\\) je povsod enak polmeru.', 'There is no directrix, the ratio is undefined, and \\(|PF|=3\\) equals the radius everywhere.')],
            scene: conicScene('conic-circle-scene', 'circle', undefined,
                'Krožnica \\(\\varepsilon=0\\) s polmerom \\(3\\): \\(|PF|=3\\), vodnice ni in razmerje ni določeno.',
                'The circle \\(\\varepsilon=0\\) of radius \\(3\\): \\(|PF|=3\\), there is no directrix and the ratio is undefined.'),
        }),
        step({
            id: 'conic-bridge', order: 6,
            title: text('Most do Bézierja: četrtina elipse', 'The Bézier bridge: a quarter ellipse'),
            purpose: text('Videti, da racionalni kvadratni Bézierjev lok z utežjo \\(\\tfrac{\\sqrt2}2\\) leži na elipsi.', 'Seeing that a rational quadratic Bézier arc with the weight \\(\\tfrac{\\sqrt2}2\\) lies on the ellipse.'),
            explanation: text(
                'Črtkani lok ima kontrolne točke \\((5,0)\\), \\((5,3)\\), \\((0,3)\\) in uteži \\(1\\), \\(w_1=\\tfrac{\\sqrt2}2\\approx0{,}7071\\), \\(1\\); to je afina slika krožnega loka z istimi utežmi. Pri \\(t=\\tfrac12\\) je lok v točki \\((3{,}5355;\\ 2{,}1213)\\), ki ustreza \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\). Odstopanje loka od stožnice, to je največji \\(\\bigl||PF|-\\varepsilon|Pd|\\bigr|\\) vzdolž loka (ostanek v enotah dolžine, ne razdalja), je zato le zaokrožitvena napaka. O tej povezavi govori poglavje Racionalne krivulje.',
                'The dashed arc has the control points \\((5,0)\\), \\((5,3)\\), \\((0,3)\\) and the weights \\(1\\), \\(w_1=\\tfrac{\\sqrt2}2\\approx0.7071\\), \\(1\\); it is the affine image of a circular arc with the same weights. At \\(t=\\tfrac12\\) the arc is at \\((3.5355,\\ 2.1213)\\), which satisfies \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\). The deviation of the arc from the conic, the largest \\(\\bigl||PF|-\\varepsilon|Pd|\\bigr|\\) along the arc (a residual in length units, not a distance), is therefore only rounding error. This link is the subject of the chapter Rational curves.',
            ),
            formulaIds: ['conic-rational-bezier'],
            workedExampleId: 'conic-quarter-ellipse-bezier',
            observationPrompt: text('Preberi srednjo utež in odstopanje loka od stožnice ter poišči lok na elipsi.', 'Read the middle weight and the deviation of the arc from the conic, and find the arc on the ellipse.'),
            expectedObservations: [text('Utež je \\(0{,}7071\\), vrsta po uteži je elipsa in odstopanje je praktično \\(0\\).', 'The weight is \\(0.7071\\), the kind by weight is ellipse and the deviation is practically \\(0\\).')],
            scene: conicScene('conic-bridge-scene', 'ellipse', {},
                'Elipsa z Bézierjevim lokom: srednja utež \\(w_1=\\tfrac{\\sqrt2}2\\approx0{,}7071\\) (elipsa), lok leži na elipsi in odstopanje je praktično \\(0\\).',
                'The ellipse with the Bézier arc: the middle weight \\(w_1=\\tfrac{\\sqrt2}2\\approx0.7071\\) (ellipse), the arc lies on the ellipse and the deviation is practically \\(0\\).'),
        }),
        step({
            id: 'conic-weight', order: 7,
            title: text('Srednja utež odloči o vrsti', 'The middle weight decides the kind'),
            purpose: text('Povezati srednjo utež z vrsto stožnice in prosto raziskovati.', 'Connecting the middle weight with the kind of conic, and exploring freely.'),
            explanation: text(
                'Pri krajnih utežeh \\(1\\) da \\(w_1<1\\) elipso, \\(w_1=1\\) parabolo in \\(w_1>1\\) hiperbolo. Zdaj je \\(w_1=1\\): lok je del parabole in zato ni več na elipsi, odstopanje pa je jasno večje od \\(0\\). Premakni drsnik pod \\(1\\) (elipsa) in nad \\(1\\) (hiperbola) ter pritisni Prilegajoča se utež, da se lok vrne na stožnico. Nato prosto spreminjaj \\(\\varepsilon\\), \\(\\ell\\) in \\(\\varphi\\): vrsta po uteži se vedno ujema z vrsto stožnice.',
                'With end weights \\(1\\), \\(w_1<1\\) gives an ellipse, \\(w_1=1\\) a parabola and \\(w_1>1\\) a hyperbola. Now \\(w_1=1\\): the arc is a piece of a parabola and therefore no longer on the ellipse, and the deviation is clearly above \\(0\\). Move the slider below \\(1\\) (ellipse) and above \\(1\\) (hyperbola), and press Matched weight to bring the arc back onto the conic. Then change \\(\\varepsilon\\), \\(\\ell\\) and \\(\\varphi\\) freely: the kind by weight always matches the kind of the conic.',
            ),
            formulaIds: ['conic-rational-bezier'],
            observationPrompt: text('Premakni \\(w_1\\) pod \\(1\\) in nad \\(1\\) in preberi vrsto po uteži; nato pritisni Prilegajoča se utež.', 'Move \\(w_1\\) below \\(1\\) and above \\(1\\) and read the kind by weight; then press Matched weight.'),
            expectedObservations: [text('Utež pod \\(1\\) da elipso, nad \\(1\\) hiperbolo, natanko \\(1\\) parabolo; lok leži na stožnici le pri prilegajoči se uteži.', 'A weight below \\(1\\) gives an ellipse, above \\(1\\) a hyperbola and exactly \\(1\\) a parabola; the arc lies on the conic only at the matching weight.')],
            scene: conicScene('conic-weight-scene', 'ellipse', {weight: 1},
                'Elipsa z Bézierjevim lokom in srednjo utežjo \\(w_1=1\\): vrsta po uteži je parabola, lok ne leži na elipsi.',
                'The ellipse with the Bézier arc and the middle weight \\(w_1=1\\): the kind by weight is a parabola, and the arc is off the ellipse.'),
        }),
    ],
    sources: [
        {
            id: 'bezeg-conic-focal-implementation',
            citation: 'Bezeg source: src/analysis/conic.ts, src/analysis/conicFocalModel.ts and src/graphs/functions/ConicFocalGraph.tsx.',
            implementationCorrespondence: 'A scene chooses the example (conic and point P) by conic-example, shows the Bézier arc by conic-bridge and sets its middle weight by conic-weight. The conic is drawn from its definition and the arc is laid over it. The lesson text quotes only values of those scenes and values recomputed in the test.',
        },
    ],
    edgeCases: [
        text('Numerična ekscentričnost je med \\(0\\) in \\(2{,}5\\), polparameter \\(\\ell\\) med \\(0{,}5\\) in \\(6\\), srednja utež med \\(0{,}1\\) in \\(5\\); vrednost zunaj območja je zavrnjena in je ne zaokrožimo.', 'The eccentricity lies in \\(0\\) to \\(2.5\\), the semi-latus rectum \\(\\ell\\) in \\(0.5\\) to \\(6\\), the middle weight in \\(0.1\\) to \\(5\\); a value outside the range is rejected, not rounded.'),
        text('Pri \\(\\varepsilon=0\\) je krožnica brez vodnice in razmerje \\(|PF|/|Pd|\\) ni določeno; parabola je natanko pri \\(\\varepsilon=1\\).', 'At \\(\\varepsilon=0\\) the circle has no directrix and the ratio \\(|PF|/|Pd|\\) is undefined; the parabola is exactly at \\(\\varepsilon=1\\).'),
        text('Parabola in hiperbola sta narisani le do razdalje \\(50\\) od gorišča; prikazano odstopanje loka je ostanek \\(\\bigl||PF|-\\varepsilon|Pd|\\bigr|\\) v enotah dolžine, ne razdalja.', 'The parabola and the hyperbola are drawn only up to distance \\(50\\) from the focus; the shown deviation of the arc is the residual \\(\\bigl||PF|-\\varepsilon|Pd|\\bigr|\\) in length units, not a distance.'),
    ],
    unresolvedQuestions: [],
};

export const schoolFunctionGraphsBatchCGuidedLessons: readonly GuidedLesson[] = [seriesLesson, conicLesson];
