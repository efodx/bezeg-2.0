/**
 * Guided lessons of the Fourier series family (docs/specs/fourier-series-lessons.md): F1, partial sums of a square wave, and F3, the Gibbs
 * phenomenon, both on the `fourier-series` Demonstration. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot
 * lesson text"): every number it quotes is a value of the scene it belongs to, and `fourierSeriesGuidedLessons.test.ts` checks that against
 * the real graph and an independent direct sum. Scenes use the `function-choice` action `fourier-example` and the `function-parameter`
 * actions `fourier-n`, `fourier-x` and `fourier-epsilon`.
 * A Demonstration has one guided lesson, so F1 (steps 1 to 6) and F3 (steps 7 to 13) are consecutive parts of the `fourier-series` lesson;
 * F2, F4 and F5 belong to other Demonstrations or to later slices. The link to the uniform-convergence lesson is the catalogue entry
 * `uniform-convergence` (a source entry and the prerequisite text name it); that lesson is not changed.
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

/** A scene from the default scene: the example, N, x and epsilon, all four set so that no scene depends on the one before it. */
const fourierScene = (
    id: string, example: 'square' | 'sawtooth', n: number, x: number, epsilon: number, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'fourier-example', value: example},
        {kind: 'function-parameter', name: 'fourier-n', value: n},
        {kind: 'function-parameter', name: 'fourier-x', value: x},
        {kind: 'function-parameter', name: 'fourier-epsilon', value: epsilon},
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

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

const fourierLesson: GuidedLesson = {
    demonstrationId: 'fourier-series',
    title: text('Fourierova vrsta: delne vsote in Gibbsov pojav', 'Fourier series: partial sums and the Gibbs phenomenon'),
    summary: text(
        'Pravokotni val je vsota lihih sinusov z utežmi \\(1/k\\). Delna vsota \\(S_N\\) mu z večanjem \\(N\\) sledi vse bolje, v skoku pa je enaka sredini enostranskih limit. Ob skoku vsota preseže vrednost vala za približno \\(8{,}95\\,\\%\\) skoka in ta preseg z večanjem \\(N\\) ne pojema, le premakne se proti skoku (Gibbsov pojav). Zato vsota v vsaki točki konvergira k \\(f\\), enakomerno pa ne.',
        'A square wave is a sum of odd sines with weights \\(1/k\\). The partial sum \\(S_N\\) follows it more closely as \\(N\\) grows, and at the jump it equals the midpoint of the one-sided limits. Near the jump the sum overshoots the value of the wave by about \\(8.95\\,\\%\\) of the jump, and this overshoot does not shrink as \\(N\\) grows, it only moves toward the jump (the Gibbs phenomenon). So the sum converges to \\(f\\) at every point, but not uniformly.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje sinusa, amplitude in frekvence iz lekcije o trigonometričnih funkcijah.', 'Assumes sine, amplitude and frequency from the lesson on trigonometric functions.'),
        text('Za drugi del priporočamo lekcijo o enakomerni konvergenci (točkovna napaka, pas, supremum); najdeš jo v katalogu pod »Enakomerna konvergenca«.', 'For the second part the lesson on uniform convergence (pointwise error, band, supremum) is recommended; find it in the catalogue as "Uniform convergence".'),
    ],
    learningGoals: [
        text('Veš, da je pravokotni val vsota lihih sinusov z utežmi \\(1/k\\), in napoveš, kateri člen sledi.', 'Know that a square wave is a sum of odd sines with weights \\(1/k\\), and predict which term comes next.'),
        text('Na napaki pri izbrani točki opaziš, da delne vsote konvergirajo točkovno, in veš, kaj o vrednosti v skoku pove Dirichletov izrek.', 'Read off the error at a chosen point that the partial sums converge pointwise, and know what the Dirichlet theorem says about the value at a jump.'),
        text('Preberi vrh ob skoku, njegovo vrednost in preseg ter opaziš, da preseg z večanjem \\(N\\) ne izgine.', 'Read the peak near the jump, its value and the overshoot, and notice that the overshoot does not disappear as \\(N\\) grows.'),
        text('Razločiš točkovno in enakomerno konvergenco in razložiš, zakaj skok preprečuje enakomerno konvergenco.', 'Distinguish pointwise from uniform convergence and explain why a jump prevents uniform convergence.'),
    ],
    formulaBlocks: [
        {
            id: 'square-partial-sum',
            latex: 'S_N(x)=\\frac4\\pi\\sum_{k\\ \\mathrm{odd},\\ k\\le N}\\frac{\\sin kx}{k}',
            notation: text(
                '\\(S_N\\) je delna vsota z harmoniki do \\(N\\); \\(f(x)=-1\\) na \\((-\\pi,0)\\), \\(f(x)=1\\) na \\((0,\\pi)\\), \\(2\\pi\\)-periodična.',
                '\\(S_N\\) is the partial sum with the harmonics up to \\(N\\); \\(f(x)=-1\\) on \\((-\\pi,0)\\), \\(f(x)=1\\) on \\((0,\\pi)\\), \\(2\\pi\\)-periodic.',
            ),
            explanation: text(
                'Koeficienti so \\(b_k=\\dfrac{4}{\\pi k}\\) za lih \\(k\\) in \\(b_k=0\\) za sod \\(k\\), vsi \\(a_k\\) so \\(0\\). Zato je za sod \\(N\\) vsota \\(S_N\\) enaka \\(S_{N-1}\\). Vsota ima za vsak \\(N\\) v \\(x=0\\) vrednost \\(0\\), ker je \\(\\sin 0=0\\).',
                'The coefficients are \\(b_k=\\dfrac{4}{\\pi k}\\) for odd \\(k\\) and \\(b_k=0\\) for even \\(k\\), and every \\(a_k\\) is \\(0\\). So for even \\(N\\) the sum \\(S_N\\) equals \\(S_{N-1}\\). For every \\(N\\) the sum has the value \\(0\\) at \\(x=0\\), because \\(\\sin 0=0\\).',
            ),
        },
        {
            id: 'dirichlet-midpoint',
            latex: 'S_N(x_0)\\to\\frac{f(x_0^-)+f(x_0^+)}{2}',
            notation: text(
                '\\(f(x_0^-)\\) in \\(f(x_0^+)\\) sta leva in desna limita funkcije \\(f\\) v \\(x_0\\).',
                '\\(f(x_0^-)\\) and \\(f(x_0^+)\\) are the left and the right limit of \\(f\\) at \\(x_0\\).',
            ),
            explanation: text(
                'Izrek (Dirichlet): če je \\(f\\) odsekoma gladka in \\(2\\pi\\)-periodična, Fourierova vrsta v vsaki točki konvergira k sredini enostranskih limit; kjer je \\(f\\) zvezna, je to \\(f(x_0)\\). To je izrek, ne branje s slike (Zygmund, Trigonometric Series, citirano, ne odprto). Izrek ne velja za vsako zvezno funkcijo: obstajajo zvezne funkcije, katerih Fourierova vrsta v kakšni točki divergira (citirano, ne odprto).',
                'Theorem (Dirichlet): if \\(f\\) is piecewise smooth and \\(2\\pi\\)-periodic, its Fourier series converges at every point to the midpoint of the one-sided limits; where \\(f\\) is continuous this is \\(f(x_0)\\). This is a theorem, not something read off the picture (Zygmund, Trigonometric Series, cited, not opened). The statement does not hold for every continuous function: there are continuous functions whose Fourier series diverges at some point (cited, not opened).',
            ),
        },
        {
            id: 'gibbs-limit',
            latex: '\\max_{0<x<\\pi}S_N(x)=S_N\\!\\left(\\frac{\\pi}{N+1}\\right)\\to\\frac2\\pi\\,\\mathrm{Si}(\\pi),\\qquad \\mathrm{Si}(\\pi)=\\int_0^\\pi\\frac{\\sin t}{t}\\,dt',
            notation: text(
                '\\(N\\) je lih (pri sodem \\(N\\) vzamemo \\(N-1\\)); \\(\\mathrm{Si}(\\pi)\\) je integralski sinus.',
                '\\(N\\) is odd (for even \\(N\\) take \\(N-1\\)); \\(\\mathrm{Si}(\\pi)\\) is the sine integral.',
            ),
            explanation: text(
                'Največja vrednost \\(S_N\\) na \\((0,\\pi)\\) je pri \\(x=\\pi/(N+1)\\) in je z večanjem \\(N\\) vse bližje \\(\\tfrac2\\pi\\mathrm{Si}(\\pi)=1{,}17898\\). Ker skok meri \\(2\\), je preseg \\((1{,}17898-1)/2\\), kar je približno \\(8{,}95\\,\\%\\) skoka v limiti. Za končni \\(N\\) so deleži drugačni (\\(9{,}07\\,\\%\\) pri \\(N=11\\)). To trdi izrek o Gibbsovem pojavu (Zygmund, citirano, ne odprto); vlečenje \\(N\\) je le ponazoritev.',
                'The largest value of \\(S_N\\) on \\((0,\\pi)\\) is at \\(x=\\pi/(N+1)\\) and gets closer to \\(\\tfrac2\\pi\\mathrm{Si}(\\pi)=1.17898\\) as \\(N\\) grows. Since the jump is \\(2\\), the overshoot is \\((1.17898-1)/2\\), about \\(8.95\\,\\%\\) of the jump in the limit. For a finite \\(N\\) the shares differ (\\(9.07\\,\\%\\) at \\(N=11\\)). This is what the theorem on the Gibbs phenomenon states (Zygmund, cited, not opened); dragging \\(N\\) is only an illustration.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'square-three-terms',
            title: text('Dva člena pri \\(x=1{,}57\\)', 'Two terms at \\(x=1.57\\)'),
            calculationLatex: 'S_3(1.57)=\\frac4\\pi\\left(\\sin 1.57+\\frac{\\sin 4.71}{3}\\right)',
            resultLatex: '0{,}84883',
            check: text(
                'Pri \\(x=1{,}57\\) je \\(\\sin x\\approx1\\) in \\(\\sin 3x\\approx-1\\), zato je \\(S_1\\approx\\tfrac4\\pi=1{,}27324\\) in \\(S_3\\approx\\tfrac4\\pi\\left(1-\\tfrac13\\right)=0{,}84883\\). Tretji člen \\(\\tfrac15\\) vsoto spet dvigne.',
                'At \\(x=1.57\\) we have \\(\\sin x\\approx1\\) and \\(\\sin 3x\\approx-1\\), so \\(S_1\\approx\\tfrac4\\pi=1.27324\\) and \\(S_3\\approx\\tfrac4\\pi\\left(1-\\tfrac13\\right)=0.84883\\). The third term \\(\\tfrac15\\) raises the sum again.',
            ),
        },
        {
            id: 'gibbs-peak-eleven',
            title: text('Vrh pri \\(N=11\\)', 'The peak at \\(N=11\\)'),
            calculationLatex: 'x=\\frac{\\pi}{12}\\approx0.2618,\\qquad S_{11}(x)=\\frac4\\pi\\left(\\sin x+\\frac{\\sin 3x}{3}+\\dots+\\frac{\\sin 11x}{11}\\right)',
            resultLatex: '1{,}18130',
            check: text(
                'Vrh \\(S_{11}\\) je pri \\(x=\\pi/12\\approx0{,}2618\\) z vrednostjo \\(1{,}18130\\), preseg \\(0{,}18130\\) nad vrednostjo \\(1\\) je \\(9{,}07\\,\\%\\) skoka \\(2\\). Pri \\(N=101\\) je vrh \\(1{,}17901\\) pri \\(x=0{,}0308\\), pri \\(N=1001\\) pa \\(1{,}17898\\) pri \\(x=0{,}00314\\).',
                'The peak of \\(S_{11}\\) is at \\(x=\\pi/12\\approx0.2618\\) with the value \\(1.18130\\); the overshoot \\(0.18130\\) above the value \\(1\\) is \\(9.07\\,\\%\\) of the jump \\(2\\). At \\(N=101\\) the peak is \\(1.17901\\) at \\(x=0.0308\\), and at \\(N=1001\\) it is \\(1.17898\\) at \\(x=0.00314\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'fourier-wave', order: 1,
            title: text('Pravokotni val in en sinus', 'The square wave and one sine'),
            purpose: text('Pred razkritjem napovedati, kateri člen je naslednji.', 'Predicting, before the reveal, which term comes next.'),
            explanation: text(
                'Graf kaže pravokotni val \\(f\\) (črtkano) in delno vsoto \\(S_1=\\tfrac4\\pi\\sin x\\), en sam sinus z amplitudo \\(\\tfrac4\\pi\\approx1{,}27\\). Pri \\(x=1{,}57\\) je \\(S_1=1{,}27324\\), val pa ima tam vrednost \\(1\\). Sinus ima ničle tam, kjer ima val skok, a ne ujame vodoravnih delov. Napovej, kateri sinus naj dodamo; sod \\(\\sin 2x\\) ni primeren, ker je val lih in ima pri \\(x\\) in \\(x+\\pi\\) nasprotni vrednosti.',
                'The graph shows the square wave \\(f\\) (dashed) and the partial sum \\(S_1=\\tfrac4\\pi\\sin x\\), a single sine with amplitude \\(\\tfrac4\\pi\\approx1.27\\). At \\(x=1.57\\) we have \\(S_1=1.27324\\), while the wave has the value \\(1\\) there. The sine has zeros where the wave has its jumps, but it does not catch the flat parts. Predict which sine to add; \\(\\sin 2x\\) does not fit, because the wave takes opposite values at \\(x\\) and \\(x+\\pi\\).',
            ),
            formulaIds: ['square-partial-sum'],
            observationPrompt: text('Pred razkritjem napovedi, ali naj naslednji člen vsoto dvigne ali zniža pri \\(x=1{,}57\\).', 'Before the reveal predict whether the next term should raise or lower the sum at \\(x=1.57\\).'),
            expectedObservations: [text('Pri \\(x=1{,}57\\) je \\(S_1=1{,}27324\\), nad vrednostjo vala \\(1\\); naslednji člen jo mora znižati.', 'At \\(x=1.57\\) we have \\(S_1=1.27324\\), above the value \\(1\\) of the wave; the next term must lower it.')],
            scene: fourierScene('fourier-wave-one-sine', 'square', 1, 1.57, 0.1,
                'Pravokotni val, \\(N=1\\), \\(x=1{,}57\\): \\(S_1(x)=1{,}27324\\).',
                'The square wave, \\(N=1\\), \\(x=1.57\\): \\(S_1(x)=1.27324\\).'),
        }),
        step({
            id: 'fourier-third', order: 2,
            title: text('Dodamo člen \\(k=3\\)', 'Adding the term \\(k=3\\)'),
            purpose: text('Videti, da člen \\(\\tfrac13\\sin 3x\\) vsoto zniža pri vrhu in jo približa valu.', 'Seeing that the term \\(\\tfrac13\\sin 3x\\) lowers the sum at the top and brings it closer to the wave.'),
            explanation: text(
                'Delna vsota je zdaj \\(S_3=\\tfrac4\\pi\\left(\\sin x+\\tfrac13\\sin 3x\\right)\\). Pri \\(x=1{,}57\\) je \\(S_3=0{,}84883\\), kar je za \\(0{,}15117\\) pod vrednostjo vala. Člen \\(k=3\\) je prezgodaj znižal vsoto, zato je naslednji člen \\(\\tfrac15\\sin 5x\\) spet dvigne. Sinusi z utežmi \\(1/k\\) se tako izmenjujejo okoli vrednosti vala.',
                'The partial sum is now \\(S_3=\\tfrac4\\pi\\left(\\sin x+\\tfrac13\\sin 3x\\right)\\). At \\(x=1.57\\) we have \\(S_3=0.84883\\), which is \\(0.15117\\) below the value of the wave. The term \\(k=3\\) lowered the sum too far, so the next term \\(\\tfrac15\\sin 5x\\) raises it again. The sines with weights \\(1/k\\) alternate around the value of the wave.',
            ),
            formulaIds: ['square-partial-sum'],
            workedExampleId: 'square-three-terms',
            observationPrompt: text('Primerjaj \\(S_1\\) in \\(S_3\\) pri \\(x=1{,}57\\) in preberi seznam členov.', 'Compare \\(S_1\\) and \\(S_3\\) at \\(x=1.57\\) and read the term list.'),
            expectedObservations: [text('\\(S_3(1{,}57)=0{,}84883\\) je pod vrednostjo vala \\(1\\), \\(S_1\\) je bila nad njo.', '\\(S_3(1.57)=0.84883\\) is below the value \\(1\\) of the wave, while \\(S_1\\) was above it.')],
            scene: fourierScene('fourier-third-term', 'square', 3, 1.57, 0.1,
                'Pravokotni val, \\(N=3\\), \\(x=1{,}57\\): \\(S_3(x)=0{,}84883\\).',
                'The square wave, \\(N=3\\), \\(x=1.57\\): \\(S_3(x)=0.84883\\).'),
        }),
        step({
            id: 'fourier-more', order: 3,
            title: text('Drsnik za \\(N\\)', 'The slider for \\(N\\)'),
            purpose: text('Spreminjati \\(N\\) in videti, da vsota sledi valu, sod \\(N\\) pa ne doda ničesar.', 'Changing \\(N\\) and seeing the sum follow the wave, while an even \\(N\\) adds nothing.'),
            explanation: text(
                'Pri \\(N=11\\) je \\(S_{11}(1{,}57)=0{,}94731\\), pri \\(N=101\\) pa \\(1{,}00622\\): vsota niha okoli \\(1\\) z vse manjšim odstopanjem. Če nastaviš \\(N=12\\), je krivulja enaka kot pri \\(N=11\\), ker so koeficienti sodih harmonikov enaki \\(0\\) in člen \\(k=12\\) ne doda ničesar. Število \\(N\\) je celo število med \\(1\\) in \\(1001\\); necelih števil graf zavrne in ne zaokroži.',
                'At \\(N=11\\) we have \\(S_{11}(1.57)=0.94731\\), and at \\(N=101\\) it is \\(1.00622\\): the sum oscillates about \\(1\\) with a shrinking deviation. If you set \\(N=12\\), the curve is the same as at \\(N=11\\), because the coefficients of the even harmonics are \\(0\\) and the term \\(k=12\\) adds nothing. The number \\(N\\) is an integer between \\(1\\) and \\(1001\\); the graph rejects non-integers and does not round them.',
            ),
            formulaIds: ['square-partial-sum'],
            observationPrompt: text('Spremeni \\(N\\) od \\(1\\) do \\(50\\) in preveri, da sod \\(N\\) ne spremeni krivulje.', 'Change \\(N\\) from \\(1\\) to \\(50\\) and check that an even \\(N\\) does not change the curve.'),
            expectedObservations: [text('\\(S_{11}(1{,}57)=0{,}94731\\); pri \\(N=12\\) se krivulja ne spremeni.', '\\(S_{11}(1.57)=0.94731\\); at \\(N=12\\) the curve does not change.')],
            scene: fourierScene('fourier-more-terms', 'square', 11, 1.57, 0.1,
                'Pravokotni val, \\(N=11\\), \\(x=1{,}57\\): \\(S_{11}(x)=0{,}94731\\).',
                'The square wave, \\(N=11\\), \\(x=1.57\\): \\(S_{11}(x)=0.94731\\).'),
        }),
        step({
            id: 'fourier-error', order: 4,
            title: text('Napaka v izbrani točki', 'The error at a chosen point'),
            purpose: text('Brati napako \\(|f(x)-S_N(x)|\\) pri fiksnem \\(x\\) in videti, da pada proti \\(0\\).', 'Reading the error \\(|f(x)-S_N(x)|\\) at a fixed \\(x\\) and seeing it fall toward \\(0\\).'),
            explanation: text(
                'Točka je \\(x=0{,}5\\), kjer je \\(f(x)=1\\). Napaka je \\(0{,}09759\\) pri \\(N=11\\), \\(0{,}00981\\) pri \\(N=101\\) in \\(0{,}00011\\) pri \\(N=1001\\); prikazan je \\(N=101\\). Delne vsote odsekoma gladke funkcije konvergirajo točkovno v vsaki točki; to ne velja za vsako zvezno funkcijo. Takšna ugotovitev iz treh vrednosti je ponazoritev, jamči jo izrek iz naslednjega koraka.',
                'The point is \\(x=0.5\\), where \\(f(x)=1\\). The error is \\(0.09759\\) at \\(N=11\\), \\(0.00981\\) at \\(N=101\\) and \\(0.00011\\) at \\(N=1001\\); \\(N=101\\) is shown. The partial sums of a piecewise smooth function converge pointwise at every point; this does not hold for every continuous function. Such a reading from three values is an illustration; the theorem of the next step guarantees it.',
            ),
            formulaIds: ['dirichlet-midpoint'],
            observationPrompt: text('Povleci \\(x\\) in \\(N\\) in napovej napako pri \\(N=1001\\), preden jo preveriš.', 'Drag \\(x\\) and \\(N\\) and predict the error at \\(N=1001\\) before you check it.'),
            expectedObservations: [text('Pri \\(x=0{,}5\\) je napaka \\(0{,}00981\\) pri \\(N=101\\); pri \\(N=1001\\) je \\(0{,}00011\\).', 'At \\(x=0.5\\) the error is \\(0.00981\\) at \\(N=101\\); at \\(N=1001\\) it is \\(0.00011\\).')],
            scene: fourierScene('fourier-error-at-point', 'square', 101, 0.5, 0.1,
                'Pravokotni val, \\(N=101\\), \\(x=0{,}5\\): napaka \\(0{,}00981\\).',
                'The square wave, \\(N=101\\), \\(x=0.5\\): error \\(0.00981\\).'),
        }),
        step({
            id: 'fourier-jump', order: 5,
            title: text('Skok in sredina', 'The jump and the midpoint'),
            purpose: text('Videti, da je v skoku vrednost vsote sredina enostranskih limit \\(-1\\) in \\(1\\), in to razložiti z izrekom.', 'Seeing that at the jump the value of the sum is the midpoint of the one-sided limits \\(-1\\) and \\(1\\), and explaining it by the theorem.'),
            explanation: text(
                'Točka je \\(x=0\\), skok vala. Enostranski limiti sta \\(-1\\) in \\(1\\), prazna krožca na grafu, vsota pa ima za vsak \\(N\\) vrednost \\(S_N(0)=0\\), saj je \\(\\sin 0=0\\). To je sredina \\(\\tfrac{-1+1}{2}=0\\), kakor pravi Dirichletov izrek za odsekoma gladke funkcije: Fourierova vrsta v skoku konvergira k sredini enostranskih limit. Vrednost \\(f(0)\\) vala ni določena, graf pa kot vrednost pokaže to sredino.',
                'The point is \\(x=0\\), a jump of the wave. The one-sided limits are \\(-1\\) and \\(1\\), the open circles on the graph, and the sum has the value \\(S_N(0)=0\\) for every \\(N\\), since \\(\\sin 0=0\\). This is the midpoint \\(\\tfrac{-1+1}{2}=0\\), as the Dirichlet theorem for piecewise smooth functions says: at a jump the Fourier series converges to the midpoint of the one-sided limits. The value \\(f(0)\\) of the wave is not determined, and the graph shows this midpoint as its value.',
            ),
            formulaIds: ['dirichlet-midpoint'],
            observationPrompt: text('Preberi stanje ob grafu in vrednost \\(S_N(0)\\) pri različnih \\(N\\).', 'Read the status next to the graph and the value \\(S_N(0)\\) at different \\(N\\).'),
            expectedObservations: [text('Pri \\(x=0\\) je \\(S_{11}(0)=0\\), sredina limit \\(-1\\) in \\(1\\), in stanje to navede kot posledico izreka.', 'At \\(x=0\\) we have \\(S_{11}(0)=0\\), the midpoint of the limits \\(-1\\) and \\(1\\), and the status states this as a consequence of the theorem.')],
            scene: fourierScene('fourier-jump-midpoint', 'square', 11, 0, 0.1,
                'Pravokotni val, \\(N=11\\), \\(x=0\\): \\(S_{11}(0)=0\\), sredina limit \\(-1\\) in \\(1\\).',
                'The square wave, \\(N=11\\), \\(x=0\\): \\(S_{11}(0)=0\\), the midpoint of the limits \\(-1\\) and \\(1\\).'),
        }),
        step({
            id: 'fourier-sawtooth', order: 6,
            title: text('Žagasti val', 'The sawtooth wave'),
            purpose: text('Isti pojavi pri drugi funkciji z drugimi koeficienti.', 'The same phenomena for another function with other coefficients.'),
            explanation: text(
                'Žagasti val \\(f(x)=x\\) na \\((-\\pi,\\pi)\\) ima \\(b_k=\\dfrac{2(-1)^{k+1}}{k}\\), zato so v vsoti vsi harmoniki. Pri \\(x=1\\) je \\(S_{11}(1)=0{,}91464\\) in napaka \\(0{,}08536\\). Skok je pri \\(x=\\pi\\) med limitama \\(\\pi\\) in \\(-\\pi\\); ker \\(\\sin k\\pi=0\\), je \\(S_N(\\pi)=0\\), sredina limit. Drsnik točke \\(x\\) se premika po korakih \\(0{,}01\\) in števila \\(\\pi\\) ne doseže, zato je to vrednost iz formule, ne z grafa.',
                'The sawtooth wave \\(f(x)=x\\) on \\((-\\pi,\\pi)\\) has \\(b_k=\\dfrac{2(-1)^{k+1}}{k}\\), so every harmonic is in the sum. At \\(x=1\\) we have \\(S_{11}(1)=0.91464\\) and an error of \\(0.08536\\). The jump is at \\(x=\\pi\\) between the limits \\(\\pi\\) and \\(-\\pi\\); since \\(\\sin k\\pi=0\\), we get \\(S_N(\\pi)=0\\), the midpoint of the limits. The slider for \\(x\\) moves in steps of \\(0.01\\) and cannot reach \\(\\pi\\), so this value comes from the formula, not from the graph.',
            ),
            formulaIds: ['dirichlet-midpoint'],
            observationPrompt: text('Primerjaj počasnejše padanje napake žagastega vala z napako pravokotnega vala pri istem \\(N\\).', 'Compare the slower fall of the error of the sawtooth wave with the error of the square wave at the same \\(N\\).'),
            expectedObservations: [text('Pri \\(N=11\\) in \\(x=1\\) je \\(S_{11}(1)=0{,}91464\\), napaka je \\(0{,}08536\\).', 'At \\(N=11\\) and \\(x=1\\) we have \\(S_{11}(1)=0.91464\\) and the error is \\(0.08536\\).')],
            scene: fourierScene('fourier-sawtooth-wave', 'sawtooth', 11, 1, 0.1,
                'Žagasti val, \\(N=11\\), \\(x=1\\): \\(S_{11}(1)=0{,}91464\\), napaka \\(0{,}08536\\).',
                'The sawtooth wave, \\(N=11\\), \\(x=1\\): \\(S_{11}(1)=0.91464\\), error \\(0.08536\\).'),
        }),
        step({
            id: 'fourier-gibbs-predict', order: 7,
            title: text('Vrh ob skoku pri \\(N=11\\)', 'The peak near the jump at \\(N=11\\)'),
            purpose: text('Pred razkritjem napovedati, ali bo preseg pri \\(N=101\\) manjši.', 'Predicting, before the reveal, whether the overshoot at \\(N=101\\) will be smaller.'),
            explanation: text(
                'Spet je pravokotni val s \\(N=11\\). Ob skoku vsota preseže vrednost \\(1\\) in ima vrh, ki ga graf označi s križcem; vrh \\(S_{11}\\) leži desno od \\(x=0\\). Vsota ima v skoku sam vrednost \\(0\\), vrh torej ni v skoku. Napovej, kaj se zgodi z vrhom, ko \\(N\\) povečaš na \\(101\\): ali preseg pojema, kakor pojema napaka v točki \\(x=0{,}5\\)?',
                'Again the square wave with \\(N=11\\). Near the jump the sum exceeds the value \\(1\\) and has a peak that the graph marks with a cross; the peak of \\(S_{11}\\) lies to the right of \\(x=0\\). At the jump itself the sum has the value \\(0\\), so the peak is not at the jump. Predict what happens to the peak when you raise \\(N\\) to \\(101\\): does the overshoot shrink, as the error at the point \\(x=0.5\\) does?',
            ),
            formulaIds: ['gibbs-limit'],
            observationPrompt: text('Zapiši napoved o višini vrha pri \\(N=101\\) in o njegovem položaju glede na skok.', 'Write down your prediction about the height of the peak at \\(N=101\\) and about its position relative to the jump.'),
            expectedObservations: [text('Pri \\(N=11\\) ima \\(S_{11}\\) vrh nad vrednostjo \\(1\\) desno od skoka; v skoku je \\(S_{11}(0)=0\\).', 'At \\(N=11\\) the sum \\(S_{11}\\) has a peak above the value \\(1\\) to the right of the jump; at the jump \\(S_{11}(0)=0\\).')],
            scene: fourierScene('fourier-gibbs-predict-start', 'square', 11, 0.5, 0.1,
                'Pravokotni val, \\(N=11\\), \\(x=0{,}5\\); vrh ob skoku je označen.',
                'The square wave, \\(N=11\\), \\(x=0.5\\); the peak near the jump is marked.'),
        }),
        step({
            id: 'fourier-gibbs-peak', order: 8,
            title: text('Preberemo vrh', 'Reading the peak'),
            purpose: text('Prebrati abscisa in vrednost vrha ter preseg v odstotkih skoka.', 'Reading the abscissa and the value of the peak and the overshoot as a percentage of the jump.'),
            explanation: text(
                'Točka \\(x=0{,}26\\) leži blizu vrha pri \\(x=\\pi/12\\approx0{,}2618\\). Vrednost vrha je \\(1{,}18130\\); preseg \\(0{,}18130\\) je \\(9{,}07\\,\\%\\) skoka \\(2\\) pri \\(N=11\\). Položaj vrha \\(x=\\pi/(N+1)\\) je izračunan po obrazcu, ne prebran s slike. Preseg ni napaka računanja ali risanja: to je Gibbsov pojav, ki ga pri dovolj gostem vzorčenju prikaže vsak pravilen graf.',
                'The point \\(x=0.26\\) lies near the peak at \\(x=\\pi/12\\approx0.2618\\). The value of the peak is \\(1.18130\\); the overshoot \\(0.18130\\) is \\(9.07\\,\\%\\) of the jump \\(2\\) at \\(N=11\\). The position \\(x=\\pi/(N+1)\\) of the peak is computed from the formula, not read off the picture. The overshoot is not a numerical or drawing error: it is the Gibbs phenomenon, which every correct graph with fine enough sampling shows.',
            ),
            formulaIds: ['gibbs-limit'],
            workedExampleId: 'gibbs-peak-eleven',
            observationPrompt: text('Preberi abscisa in vrednost vrha in preseg v odstotkih; uporabi gumb Približaj na vrh.', 'Read the abscissa and the value of the peak and the overshoot in percent; use the Zoom to peak button.'),
            expectedObservations: [text('Vrh pri \\(N=11\\) je \\(1{,}18130\\), preseg \\(9{,}07\\,\\%\\) skoka.', 'The peak at \\(N=11\\) is \\(1.18130\\), an overshoot of \\(9.07\\,\\%\\) of the jump.')],
            scene: fourierScene('fourier-gibbs-read-peak', 'square', 11, 0.26, 0.1,
                'Pravokotni val, \\(N=11\\), \\(x=0{,}26\\): vrh \\(1{,}18130\\) pri \\(x=0{,}2618\\), preseg \\(9{,}07\\,\\%\\) skoka.',
                'The square wave, \\(N=11\\), \\(x=0.26\\): the peak \\(1.18130\\) at \\(x=0.2618\\), an overshoot of \\(9.07\\,\\%\\) of the jump.'),
        }),
        step({
            id: 'fourier-gibbs-narrow', order: 9,
            title: text('\\(N=101\\): ožji vrh, bližje skoku', '\\(N=101\\): a narrower peak closer to the jump'),
            purpose: text('Videti, da se vrh premakne proti skoku, njegova višina pa ostane skoraj enaka.', 'Seeing that the peak moves toward the jump while its height stays almost the same.'),
            explanation: text(
                'Pri \\(N=101\\) je vrh \\(1{,}17901\\) pri \\(x=0{,}0308\\) in preseg je \\(8{,}95\\,\\%\\) skoka. Vrh je torej precej bližje skoku, višina pa se je komaj spremenila: z \\(1{,}18130\\) na \\(1{,}17901\\). Vrednosti se bližajo limiti \\(\\tfrac2\\pi\\mathrm{Si}(\\pi)=1{,}17898\\). To je Gibbsov pojav: preseg ob skoku ne izgine, ko \\(N\\) raste, le premakne se proti skoku. Izrek to trdi (Zygmund); vlečenje \\(N\\) je ponazoritev.',
                'At \\(N=101\\) the peak is \\(1.17901\\) at \\(x=0.0308\\) and the overshoot is \\(8.95\\,\\%\\) of the jump. So the peak is much closer to the jump, while its height has barely changed: from \\(1.18130\\) to \\(1.17901\\). The values approach the limit \\(\\tfrac2\\pi\\mathrm{Si}(\\pi)=1.17898\\). This is the Gibbs phenomenon: the overshoot near the jump does not disappear as \\(N\\) grows, it only moves toward the jump. The theorem states this (Zygmund); dragging \\(N\\) is an illustration.',
            ),
            formulaIds: ['gibbs-limit'],
            observationPrompt: text('Povečaj \\(N\\) na \\(1001\\) in preveri, da vrh ostane pri \\(1{,}17898\\).', 'Raise \\(N\\) to \\(1001\\) and check that the peak stays at \\(1.17898\\).'),
            expectedObservations: [text('Pri \\(N=101\\) je vrh \\(1{,}17901\\) pri \\(x=0{,}0308\\); pri \\(N=1001\\) je \\(1{,}17898\\).', 'At \\(N=101\\) the peak is \\(1.17901\\) at \\(x=0.0308\\); at \\(N=1001\\) it is \\(1.17898\\).')],
            scene: fourierScene('fourier-gibbs-narrower-peak', 'square', 101, 0.03, 0.1,
                'Pravokotni val, \\(N=101\\), \\(x=0{,}03\\): vrh \\(1{,}17901\\) pri \\(x=0{,}0308\\), preseg \\(8{,}95\\,\\%\\) skoka.',
                'The square wave, \\(N=101\\), \\(x=0.03\\): the peak \\(1.17901\\) at \\(x=0.0308\\), an overshoot of \\(8.95\\,\\%\\) of the jump.'),
        }),
        step({
            id: 'fourier-gibbs-fixed', order: 10,
            title: text('Fiksna točka: napaka pada', 'A fixed point: the error falls'),
            purpose: text('Razločiti, da vsota v fiksni točki konvergira, čeprav ob skoku preseg ostaja.', 'Distinguishing that the sum converges at a fixed point although the overshoot stays near the jump.'),
            explanation: text(
                'V fiksni točki \\(x=0{,}5\\) napaka pada: \\(0{,}09759\\), \\(0{,}00981\\), \\(0{,}00011\\) pri \\(N=11\\), \\(101\\), \\(1001\\). To je točkovna konvergenca: za vsak \\(x\\) je \\(S_N(x)\\to f(x)\\). Vrh pa se z večanjem \\(N\\) premika proti \\(x=0\\), zato v fiksni točki \\(x>0\\) enkrat preneha vplivati, v skoku pa ostaja. Pokazano je \\(N=101\\) z napako \\(0{,}00981\\).',
                'At the fixed point \\(x=0.5\\) the error falls: \\(0.09759\\), \\(0.00981\\), \\(0.00011\\) at \\(N=11\\), \\(101\\), \\(1001\\). This is pointwise convergence: for every \\(x\\) we have \\(S_N(x)\\to f(x)\\). The peak, however, moves toward \\(x=0\\) as \\(N\\) grows, so at a fixed point \\(x>0\\) it eventually stops mattering, while near the jump it stays. \\(N=101\\) is shown with the error \\(0.00981\\).',
            ),
            formulaIds: ['dirichlet-midpoint'],
            observationPrompt: text('Pri \\(x=0{,}5\\) povečuj \\(N\\) in spremljaj navpično črto napake.', 'At \\(x=0.5\\) raise \\(N\\) and watch the vertical line of the error.'),
            expectedObservations: [text('Pri \\(x=0{,}5\\) napaka z \\(0{,}09759\\) pade prek \\(0{,}00981\\) do \\(0{,}00011\\).', 'At \\(x=0.5\\) the error falls from \\(0.09759\\) through \\(0.00981\\) to \\(0.00011\\).')],
            scene: fourierScene('fourier-gibbs-fixed-point', 'square', 101, 0.5, 0.1,
                'Pravokotni val, \\(N=101\\), \\(x=0{,}5\\): napaka \\(0{,}00981\\).',
                'The square wave, \\(N=101\\), \\(x=0.5\\): error \\(0.00981\\).'),
        }),
        step({
            id: 'fourier-gibbs-band', order: 11,
            title: text('Pas \\(f\\pm\\varepsilon\\)', 'The band \\(f\\pm\\varepsilon\\)'),
            purpose: text('Videti, da vsota za vsak \\(N\\) zapusti pas ob skoku, in razumeti, zakaj enakomerna konvergenca odpove.', 'Seeing that the sum leaves the band near the jump for every \\(N\\), and understanding why uniform convergence fails.'),
            explanation: text(
                'Pas \\(f\\pm\\varepsilon\\) je pri \\(\\varepsilon=0{,}1\\) osenčen. Pri \\(N=1001\\) vsota blizu skoka še vedno zapusti pas: vrh je \\(1{,}17898>1{,}1\\), stanje pa to javi. Razlog: napaka \\(|S_N(x)-f(x)|\\) gre pri \\(x\\to0^+\\) proti \\(1\\) (za \\(N=101\\) je pri \\(x=10^{-6}\\) enaka \\(0{,}99994\\)), zato je \\(\\sup|S_N-f|\\ge1\\) za vsak \\(N\\) in ne gre proti \\(0\\). Konvergenca je točkovna, enakomerna pa ni; to je posledica skoka, ne napaka grafa. Pojem je razložen v lekciji o enakomerni konvergenci.',
                'The band \\(f\\pm\\varepsilon\\) is shaded at \\(\\varepsilon=0.1\\). At \\(N=1001\\) the sum still leaves the band near the jump: the peak is \\(1.17898>1.1\\), and the status says so. The reason: the error \\(|S_N(x)-f(x)|\\) tends to \\(1\\) as \\(x\\to0^+\\) (for \\(N=101\\) it equals \\(0.99994\\) at \\(x=10^{-6}\\)), so \\(\\sup|S_N-f|\\ge1\\) for every \\(N\\) and does not tend to \\(0\\). The convergence is pointwise but not uniform; this is a consequence of the jump, not a plotting error. The idea is explained in the lesson on uniform convergence.',
            ),
            formulaIds: ['gibbs-limit'],
            observationPrompt: text('Zmanjšaj \\(\\varepsilon\\) in poišči, ali obstaja \\(N\\), pri katerem vsota ostane v pasu.', 'Reduce \\(\\varepsilon\\) and look for an \\(N\\) at which the sum stays in the band.'),
            expectedObservations: [text('Pri \\(N=1001\\) je vrh \\(1{,}17898\\) nad \\(1{,}1\\), torej vsota zapusti pas; to velja za vsak \\(N\\).', 'At \\(N=1001\\) the peak \\(1.17898\\) is above \\(1.1\\), so the sum leaves the band; this holds for every \\(N\\).')],
            scene: fourierScene('fourier-gibbs-band-escape', 'square', 1001, 0.5, 0.1,
                'Pravokotni val, \\(N=1001\\), \\(\\varepsilon=0{,}1\\): vrh \\(1{,}17898\\) je izven pasu \\(f\\pm\\varepsilon\\).',
                'The square wave, \\(N=1001\\), \\(\\varepsilon=0.1\\): the peak \\(1.17898\\) is outside the band \\(f\\pm\\varepsilon\\).'),
        }),
        step({
            id: 'fourier-gibbs-sawtooth', order: 12,
            title: text('Gibbsov pojav pri žagastem valu', 'The Gibbs phenomenon for the sawtooth wave'),
            purpose: text('Videti, da se preseg pojavi pri vsakem skoku, ne le pri pravokotnem valu.', 'Seeing that the overshoot appears at every jump, not only for the square wave.'),
            explanation: text(
                'Pri žagastem valu je skok \\(2\\pi\\) pri \\(x=\\pi\\). Pri \\(N=101\\) vrh vsote pri \\(x=\\pi-\\pi/102\\) znaša \\(3{,}67302\\), kar je \\(8{,}46\\,\\%\\) skoka nad zgornjo limito \\(\\pi\\). Pri \\(N=101\\) je to manj kot pri pravokotnem valu, a izrek za odsekoma gladke funkcije pove, da se preseg približuje isti meji \\(8{,}95\\,\\%\\) skoka. V točki \\(x=1\\) je napaka še majhna: \\(0{,}00927\\). Lekcija trdi le to, kar kaže; drugih načinov seštevanja ne obravnavamo.',
                'For the sawtooth wave the jump is \\(2\\pi\\) at \\(x=\\pi\\). At \\(N=101\\) the peak of the sum at \\(x=\\pi-\\pi/102\\) is \\(3.67302\\), which is \\(8.46\\,\\%\\) of the jump above the upper limit \\(\\pi\\). At \\(N=101\\) this is less than for the square wave, but the theorem for piecewise smooth functions says that the overshoot approaches the same limit of \\(8.95\\,\\%\\) of the jump. At the point \\(x=1\\) the error is still small: \\(0.00927\\). The lesson claims only what it shows; other summation methods are not treated.',
            ),
            formulaIds: ['gibbs-limit'],
            observationPrompt: text('Primerjaj preseg žagastega vala s presegom pravokotnega vala pri istem \\(N\\).', 'Compare the overshoot of the sawtooth wave with that of the square wave at the same \\(N\\).'),
            expectedObservations: [text('Pri \\(N=101\\) je vrh žagastega vala \\(3{,}67302\\), preseg \\(8{,}46\\,\\%\\) skoka.', 'At \\(N=101\\) the peak of the sawtooth wave is \\(3.67302\\), an overshoot of \\(8.46\\,\\%\\) of the jump.')],
            scene: fourierScene('fourier-gibbs-sawtooth-peak', 'sawtooth', 101, 1, 0.1,
                'Žagasti val, \\(N=101\\), \\(x=1\\): vrh \\(3{,}67302\\), preseg \\(8{,}46\\,\\%\\) skoka, napaka v \\(x=1\\) je \\(0{,}00927\\).',
                'The sawtooth wave, \\(N=101\\), \\(x=1\\): the peak \\(3.67302\\), an overshoot of \\(8.46\\,\\%\\) of the jump, the error at \\(x=1\\) is \\(0.00927\\).'),
        }),
        step({
            id: 'fourier-explore', order: 13,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati primere, \\(N\\), \\(x\\) in \\(\\varepsilon\\).', 'Exploring the examples, \\(N\\), \\(x\\) and \\(\\varepsilon\\) on your own.'),
            explanation: text(
                'Primer je pravokotni val z \\(N=11\\), \\(x=0{,}5\\) in \\(\\varepsilon=0{,}1\\); vse je prosto za raziskovanje. Spreminjaj primer, \\(N\\), \\(x\\) in \\(\\varepsilon\\), gumb Približaj na vrh pa naj ti pokaže vrh ob skoku. Za zvezne odsekoma gladke funkcije, na primer \\(|x|\\), vrsta konvergira enakomerno in preseg ne nastane (Zygmund, citirano, ne odprto). Gumb Ponastavi vrne lekcijo na začetek koraka.',
                'The example is the square wave with \\(N=11\\), \\(x=0.5\\) and \\(\\varepsilon=0.1\\); everything is free to explore. Change the example, \\(N\\), \\(x\\) and \\(\\varepsilon\\), and let the Zoom to peak button show the peak near the jump. For continuous piecewise smooth functions, for example \\(|x|\\), the series converges uniformly and no overshoot occurs (Zygmund, cited, not opened). The Reset button returns the lesson to the start of the step.',
            ),
            formulaIds: ['gibbs-limit'],
            observationPrompt: text('Poišči \\(N\\), pri katerem je napaka v \\(x=0{,}5\\) manjša od \\(10^{-3}\\), in preveri, da je vrh še vedno nad \\(1{,}17\\).', 'Find an \\(N\\) for which the error at \\(x=0.5\\) is below \\(10^{-3}\\) and check that the peak is still above \\(1.17\\).'),
            expectedObservations: [text('Pri \\(N=1001\\) je napaka v \\(x=0{,}5\\) manjša od \\(10^{-3}\\), vrh pa je \\(1{,}17898\\).', 'At \\(N=1001\\) the error at \\(x=0.5\\) is below \\(10^{-3}\\) while the peak is \\(1.17898\\).')],
            scene: fourierScene('fourier-explore-free', 'square', 11, 0.5, 0.1,
                'Pravokotni val, \\(N=11\\), \\(x=0{,}5\\), \\(\\varepsilon=0{,}1\\); vse je prosto za raziskovanje.',
                'The square wave, \\(N=11\\), \\(x=0.5\\), \\(\\varepsilon=0.1\\); everything is free to explore.'),
        }),
    ],
    sources: [
        {
            id: 'zygmund-trigonometric-series',
            citation: 'Zygmund, A. Trigonometric Series, 3rd ed., vol. I, Cambridge University Press, 2002: convergence of Fourier series at a point (the Dirichlet theorem for piecewise smooth functions), the Gibbs phenomenon, and continuous functions with a divergent Fourier series. Cited, not opened.',
        },
        {
            id: 'bezeg-uniform-convergence-lesson',
            citation: 'Bezeg catalogue entry uniform-convergence (/bezeg-2.0/analysis/uniform-convergence): the lesson on pointwise error, the band and the supremum, which the second part builds on. The lesson is linked, not modified.',
        },
        {
            id: 'bezeg-fourier-series-implementation',
            citation: 'Bezeg source: src/analysis/fourierSeriesModel.ts, src/analysis/fourier.ts and src/graphs/functions/FourierSeriesGraph.tsx.',
            implementationCorrespondence: 'The partial sum, the Gibbs peak at the closed-form abscissa pi/(N+1), the overshoot and the zoom window are computed from the example and N; a scene sets the example, N, x and epsilon, and does not change the zoom window, which the Zoom to peak button sets.',
        },
    ],
    edgeCases: [
        text('Pri pravokotnem valu je za sod \\(N\\) vsota \\(S_N\\) enaka \\(S_{N-1}\\), ker so koeficienti sodih harmonikov enaki \\(0\\); \\(N\\) je celo število med \\(1\\) in \\(1001\\) in necelih vrednosti graf zavrne.', 'For the square wave and an even \\(N\\) the sum \\(S_N\\) equals \\(S_{N-1}\\), because the coefficients of the even harmonics are \\(0\\); \\(N\\) is an integer between \\(1\\) and \\(1001\\) and the graph rejects other values.'),
        text('Točka \\(x\\) in toleranca \\(\\varepsilon\\) sta večkratnika števila \\(0{,}01\\); število \\(\\pi\\) z drsnikom ni dosegljivo, zato je skok žagastega vala mogoče brati le iz formule \\(S_N(\\pi)=0\\).', 'The point \\(x\\) and the tolerance \\(\\varepsilon\\) are multiples of \\(0.01\\); the number \\(\\pi\\) cannot be reached with the slider, so the jump of the sawtooth wave can be read only from the formula \\(S_N(\\pi)=0\\).'),
        text('Zvezne funkcije z divergentno vrsto in Cesàrovi (Fejérjevi) povprečki so zunaj te lekcije; lekcija ne trdi, da preseg izgine pri drugih načinih seštevanja.', 'Continuous functions with a divergent series and the Cesàro (Fejér) means are outside this lesson; it does not claim that the overshoot disappears for other summation methods.'),
    ],
    unresolvedQuestions: [],
};

export const fourierSeriesGuidedLessons: readonly GuidedLesson[] = [fourierLesson];
