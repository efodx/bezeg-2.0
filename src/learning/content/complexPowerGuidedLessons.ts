/**
 * Guided lesson M6 of the complex maps family (docs/specs/complex-maps-lessons.md, Batch D): the de Moivre formula, the powers of a complex number, on `complex-power`
 * (ComplexPowerGraph). Scenes use only the `complex-power` actions the graph registers (`set-z` with z = (A + Bi)/20 and `set-n` with n = 1..8) after a `prepared-scene` of the
 * Demonstration default (z = 1 + i, n = 5). The graph shows z^n for the current n at once (rows, status), so a step that asks for a prediction about z^k opens at an exponent
 * below k and names the control (the field Eksponent n or its steppers) that raises n. De Moivre's formula is stated as a theorem with its induction proof in step 2, after
 * the learner has predicted the third power from the second in step 1; the drawing illustrates it. Every number the text quotes is a readout of the graph for that scene, a value
 * the learner reads after an action the text asks for, or stated arithmetic; the numbers are listed per step in docs/reviews/feature-streams/families-prep/notes/f3-cm-d.md.
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind']): GuidedLessonFrame => ({id, kind});

interface StepContent {
    readonly id: string;
    readonly order: number;
    readonly title: LocalizedText;
    readonly purpose: LocalizedText;
    readonly explanation: LocalizedText;
    readonly formulaIds: readonly string[];
    readonly observationPrompt: LocalizedText;
    readonly expectedObservations: readonly LocalizedText[];
    readonly scene: LessonScene;
}

const step = (content: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation')],
});

/** The stored fields a scene may set: z = (A + Bi)/20 (whole numbers in -40..40) and the exponent n (1..8). A field left out keeps the Demonstration default (z = 1 + i, n = 5). */
export interface PowerSceneSpec {
    readonly A?: number;
    readonly B?: number;
    readonly n?: number;
}

/** The actions of a power scene: the Demonstration default, then z (when A and B are given) and the exponent n. */
export const powerSceneActions = (id: string, spec: PowerSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    ...(spec.A !== undefined && spec.B !== undefined ? [{kind: 'complex-power', operation: 'set-z', A: spec.A, B: spec.B} as const] : []),
    ...(spec.n !== undefined ? [{kind: 'complex-power', operation: 'set-n', n: spec.n} as const] : []),
];

const powerScene = (id: string, spec: PowerSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: powerSceneActions(id, spec), expectedState: text(sl, en)});

/**
 * M6. Step 1 opens on z = 1 + i, n = 2 (M6_SECOND); the learner sets n = 3. Step 2 opens on n = 3 (M6_THIRD) and the learner raises n to 4. Step 3 opens on z = 0,8 + 0,6i, n = 1
 * (M6_CIRCLE); the learner raises n to 3 and then 8. Step 4 opens on z = 0,5 + 0,5i, n = 1 (M6_INSIDE); the learner sets n = 8 and then Re z = 1,5 (A = 30, B = 10). Step 5 opens
 * on z = 1 + i, n = 4 (M6_WRAP); the learner sets n = 5. Step 6 opens on z = 0,6 + 0,8i, n = 2 (M6_TRIPLE); the learner sets n = 3. Step 7 starts from the Demonstration default.
 */
export const M6_SECOND = {A: 20, B: 20, n: 2} as const;
export const M6_THIRD = {A: 20, B: 20, n: 3} as const;
export const M6_CIRCLE = {A: 16, B: 12, n: 1} as const;
export const M6_INSIDE = {A: 10, B: 10, n: 1} as const;
export const M6_WRAP = {A: 20, B: 20, n: 4} as const;
export const M6_TRIPLE = {A: 12, B: 16, n: 2} as const;
export const M6_DEFAULT = {} as const;
export const M6_EXPLORE = M6_DEFAULT;

const formulas: readonly FormulaBlock[] = [
    {
        id: 'de-moivre',
        latex: 'z=r(\\cos\\varphi+i\\sin\\varphi)\\ \\Longrightarrow\\ z^n=r^n(\\cos n\\varphi+i\\sin n\\varphi),\\qquad n=1,2,3,\\dots',
        notation: text(
            '\\(r=|z|\\) je modul, \\(\\varphi\\) argument števila \\(z\\ne0\\) in \\(n\\) naravno število.',
            '\\(r=|z|\\) is the modulus and \\(\\varphi\\) the argument of \\(z\\ne0\\), and \\(n\\) is a natural number.',
        ),
        explanation: text(
            'To je izrek, dokazan z indukcijo iz pravila za množenje: pri množenju se moduli zmnožijo, argumenti seštejejo. Za \\(n=1\\) je trditev očitna. Če velja za \\(n\\), je \\(z^{n+1}=z^n\\cdot z\\) zmnožek števil z moduloma \\(r^n\\) in \\(r\\) ter argumentoma \\(n\\varphi\\) in \\(\\varphi\\), torej ima modul \\(r^{n+1}\\) in argument \\((n+1)\\varphi\\). Slika ponazarja korak indukcije, dokaz je ta argument.',
            'This is a theorem, proved by induction from the multiplication rule: when numbers are multiplied, the moduli multiply and the arguments add. For \\(n=1\\) the claim is obvious. If it holds for \\(n\\), then \\(z^{n+1}=z^n\\cdot z\\) is a product of numbers with moduli \\(r^n\\) and \\(r\\) and arguments \\(n\\varphi\\) and \\(\\varphi\\), so it has modulus \\(r^{n+1}\\) and argument \\((n+1)\\varphi\\). The picture illustrates the induction step, the proof is this argument.',
        ),
    },
    {
        id: 'triple-angle',
        latex: '\\cos3\\varphi=4\\cos^3\\varphi-3\\cos\\varphi,\\qquad \\sin3\\varphi=3\\sin\\varphi-4\\sin^3\\varphi',
        notation: text(
            '\\(\\varphi\\) je poljuben kot.',
            '\\(\\varphi\\) is any angle.',
        ),
        explanation: text(
            'Z \\(c=\\cos\\varphi\\) in \\(s=\\sin\\varphi\\) je \\((c+is)^3=c^3-3cs^2+i\\,(3c^2s-s^3)\\). Po Moivreovi formuli za \\(n=3\\) je ta zmnožek enak \\(\\cos3\\varphi+i\\sin3\\varphi\\); enaki števili imata enaka realna in enaka imaginarna dela. Z \\(s^2=1-c^2\\) in \\(c^2=1-s^2\\) sledita obrazca.',
            'With \\(c=\\cos\\varphi\\) and \\(s=\\sin\\varphi\\) we have \\((c+is)^3=c^3-3cs^2+i\\,(3c^2s-s^3)\\). By the de Moivre formula for \\(n=3\\) this product equals \\(\\cos3\\varphi+i\\sin3\\varphi\\); equal numbers have equal real parts and equal imaginary parts. With \\(s^2=1-c^2\\) and \\(c^2=1-s^2\\) the two formulas follow.',
        ),
    },
];

const steps: readonly GuidedLessonStep[] = [
    step({
        id: 'm6-third-power', order: 1,
        title: text('Tretja potenca', 'The third power'),
        purpose: text('Iz druge potence napovedati tretjo, preden jo graf pokaže.', 'Predicting the third power from the second before the graph shows it.'),
        explanation: text(
            'Prikazano je število \\(z=1+i\\), eksponent je \\(n=2\\), narisani sta točki \\(z\\) in \\(z^2\\). Modul števila \\(z\\) je \\(\\sqrt2\\), argument \\(45^\\circ\\). Iz vrstic odčitaj modul in argument števila \\(z^2\\) in ju primerjaj z modulom in argumentom števila \\(z\\): kaj se je zgodilo z vsakim od njiju? Napoved: kolikšna sta modul in argument števila \\(z^3\\) in katera točka je \\(z^3\\)? Napoved zapiši. Nato v polje Eksponent n vpiši \\(3\\) ali pritisni Povečaj število.',
            'The number \\(z=1+i\\) is shown, the exponent is \\(n=2\\), and the points \\(z\\) and \\(z^2\\) are drawn. The modulus of \\(z\\) is \\(\\sqrt2\\), its argument \\(45^\\circ\\). Read the modulus and the argument of \\(z^2\\) from the rows and compare them with those of \\(z\\): what happened to each of them? Prediction: what are the modulus and the argument of \\(z^3\\), and which point is \\(z^3\\)? Write the prediction down. Then type \\(3\\) into the field Exponent n or press Increase count.',
        ),
        formulaIds: [],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(n=3\\) in primerjaj vrstice Re, Im, \\(\\lvert z^3\\rvert\\) in \\(3\\cdot\\arg z\\) z napovedjo.', 'Write down the prediction, then set \\(n=3\\) and compare the rows Re, Im, \\(\\lvert z^3\\rvert\\) and \\(3\\cdot\\arg z\\) with it.'),
        expectedObservations: [text(
            'Pri \\(n=2\\) je \\(z^2=2i\\), modul \\(2\\) in argument \\(90^\\circ\\); pri \\(n=3\\) je \\(z^3=-2+2i\\), modul \\(2\\sqrt2\\approx2{,}828427\\) in \\(3\\cdot\\arg z=135^\\circ\\). Z vsakim korakom se modul pomnoži z \\(\\sqrt2\\) (od \\(\\sqrt2\\) do \\(2\\) do \\(2\\sqrt2\\)), argument pa se poveča za \\(45^\\circ\\).',
            'At \\(n=2\\) we have \\(z^2=2i\\), modulus \\(2\\) and argument \\(90^\\circ\\); at \\(n=3\\) we have \\(z^3=-2+2i\\), modulus \\(2\\sqrt2\\approx2.828427\\) and \\(3\\cdot\\arg z=135^\\circ\\). With each step the modulus is multiplied by \\(\\sqrt2\\) (from \\(\\sqrt2\\) to \\(2\\) to \\(2\\sqrt2\\)) and the argument grows by \\(45^\\circ\\).',
        )],
        scene: powerScene('m6-third-power-scene', M6_SECOND,
            'Število \\(z=1+i\\), \\(n=2\\): \\(z^2=2i\\), modul \\(2\\), argument \\(90^\\circ\\); učenec nastavi \\(n=3\\).',
            'The number \\(z=1+i\\), \\(n=2\\): \\(z^2=2i\\), modulus \\(2\\), argument \\(90^\\circ\\); the learner sets \\(n=3\\).'),
    }),
    step({
        id: 'm6-rule', order: 2,
        title: text('Pravilo za potence', 'The rule for powers'),
        purpose: text('Izrek dokazati z indukcijo in ga uporabiti za napoved četrte potence.', 'Proving the theorem by induction and using it to predict the fourth power.'),
        explanation: text(
            'Moivreova formula je izrek: za \\(z=r(\\cos\\varphi+i\\sin\\varphi)\\) in naravno število \\(n\\) velja \\(z^n=r^n(\\cos n\\varphi+i\\sin n\\varphi)\\). Dokaz z indukcijo iz pravila za množenje (moduli se množijo, argumenti seštevajo): za \\(n=1\\) je očitna. Če velja za \\(n\\), je \\(z^{n+1}=z^n\\cdot z\\) zmnožek števil z moduloma \\(r^n\\) in \\(r\\) ter argumentoma \\(n\\varphi\\) in \\(\\varphi\\), zato ima modul \\(r^{n+1}\\) in argument \\((n+1)\\varphi\\). Korak indukcije je ena množitev več, natanko to graf nariše, ko \\(n\\) povečaš za ena; slika je ponazoritev, dokaz je zgornji argument. Prikazano je \\(z=1+i\\) in \\(n=3\\). Napoved: s formulo izračunaj modul, argument in točko za \\(z^4\\). Napoved zapiši, nato pritisni Povečaj število.',
            'The de Moivre formula is a theorem: for \\(z=r(\\cos\\varphi+i\\sin\\varphi)\\) and a natural number \\(n\\) we have \\(z^n=r^n(\\cos n\\varphi+i\\sin n\\varphi)\\). Proof by induction from the multiplication rule (moduli multiply, arguments add): for \\(n=1\\) it is obvious. If it holds for \\(n\\), then \\(z^{n+1}=z^n\\cdot z\\) is a product of numbers with moduli \\(r^n\\) and \\(r\\) and arguments \\(n\\varphi\\) and \\(\\varphi\\), so it has modulus \\(r^{n+1}\\) and argument \\((n+1)\\varphi\\). The induction step is one more multiplication, exactly what the graph draws when you raise \\(n\\) by one; the picture is an illustration, the proof is the argument above. The number \\(z=1+i\\) and \\(n=3\\) are shown. Prediction: with the formula compute the modulus, the argument and the point for \\(z^4\\). Write the prediction down, then press Increase count.',
        ),
        formulaIds: ['de-moivre'],
        observationPrompt: text('Zapiši napoved, nato pritisni Povečaj število in preberi Re, Im, \\(\\lvert z^4\\rvert\\) ter \\(4\\cdot\\arg z\\); preberi tudi stavek pod grafom.', 'Write down the prediction, then press Increase count and read Re, Im, \\(\\lvert z^4\\rvert\\) and \\(4\\cdot\\arg z\\); read the sentence under the graph too.'),
        expectedObservations: [text(
            'Pri \\(n=4\\) je \\(z^4=-4\\), modul \\(4=(\\sqrt2)^4\\) in \\(4\\cdot\\arg z=180^\\circ\\). Točka \\(z^4\\) je zunaj pogleda: graf jo nariše kot puščico z modulom \\(4\\) kot besedilom, stavek pod grafom pa to pove.',
            'At \\(n=4\\) we have \\(z^4=-4\\), modulus \\(4=(\\sqrt2)^4\\) and \\(4\\cdot\\arg z=180^\\circ\\). The point \\(z^4\\) is outside the view: the graph draws it as an arrow with the modulus \\(4\\) as text, and the sentence under the graph says so.',
        )],
        scene: powerScene('m6-rule-scene', M6_THIRD,
            'Število \\(z=1+i\\), \\(n=3\\): \\(z^3=-2+2i\\); učenec poveča \\(n\\) na \\(4\\).',
            'The number \\(z=1+i\\), \\(n=3\\): \\(z^3=-2+2i\\); the learner raises \\(n\\) to \\(4\\).'),
    }),
    step({
        id: 'm6-unit-modulus', order: 3,
        title: text('Potence števila \\(0{,}8+0{,}6i\\)', 'Powers of \\(0.8+0.6i\\)'),
        purpose: text('Z modulom \\(1\\) napovedati, kje ležijo potence.', 'Using the modulus \\(1\\) to predict where the powers lie.'),
        explanation: text(
            'Prikazano je \\(z=0{,}8+0{,}6i\\) in \\(n=1\\); argument \\(\\varphi\\) števila \\(z\\) graf pokaže v vrstici \\(1\\cdot\\arg z\\). Z izrekom iz prejšnjega koraka napovej, kje ležijo točke \\(z^2\\), \\(z^3\\) in \\(z^8\\) glede na krožnico, ki jo graf prikazuje črtkano, in kolikšna sta argumenta števil \\(z^3\\) in \\(z^8\\) (izrazi ju s \\(\\varphi\\)). Napoved zapiši, preden prebereš vrstico o enotski krožnici. Nato v polje Eksponent n vpiši \\(3\\), pozneje še \\(8\\).',
            'The number \\(z=0.8+0.6i\\) and \\(n=1\\) are shown; the graph shows the argument \\(\\varphi\\) of \\(z\\) in the row \\(1\\cdot\\arg z\\). With the theorem of the previous step predict where the points \\(z^2\\), \\(z^3\\) and \\(z^8\\) lie relative to the circle that the graph shows dashed, and what the arguments of \\(z^3\\) and \\(z^8\\) are (in terms of \\(\\varphi\\)). Write the prediction down before you read the unit-circle row. Then type \\(3\\) into the field Exponent n, and later \\(8\\).',
        ),
        formulaIds: ['de-moivre'],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(n=3\\) in nato \\(n=8\\) ter pri vsakem preberi vrstice za modul, \\(n\\cdot\\arg z\\) in "Ali leži \\(z^n\\) na enotski krožnici".', 'Write down the prediction, then set \\(n=3\\) and then \\(n=8\\) and at each read the rows for the modulus, \\(n\\cdot\\arg z\\) and "Is \\(z^n\\) on the unit circle".'),
        expectedObservations: [text(
            'Pri \\(n=3\\) je \\(z^3=-\\tfrac{44}{125}+\\tfrac{117}{125}i\\), približno \\(-0{,}352+0{,}936i\\), modul \\(1\\), \\(3\\cdot\\arg z\\approx110{,}6097^\\circ\\); pri \\(n=8\\) je modul spet \\(1\\) in \\(8\\cdot\\arg z\\approx294{,}9592^\\circ\\). Vrstica o enotski krožnici pove "da" pri vsakem \\(n\\), saj je \\(\\lvert z^n\\rvert=1^n=1\\); točke \\(z^k\\) skačejo po krožnici za kot \\(\\varphi\\), ne po spirali.',
            'At \\(n=3\\) we have \\(z^3=-\\tfrac{44}{125}+\\tfrac{117}{125}i\\), approximately \\(-0.352+0.936i\\), modulus \\(1\\), \\(3\\cdot\\arg z\\approx110.6097^\\circ\\); at \\(n=8\\) the modulus is again \\(1\\) and \\(8\\cdot\\arg z\\approx294.9592^\\circ\\). The row about the unit circle says "yes" at every \\(n\\), since \\(\\lvert z^n\\rvert=1^n=1\\); the points \\(z^k\\) jump along the circle by the angle \\(\\varphi\\), not along a spiral.',
        )],
        scene: powerScene('m6-unit-modulus-scene', M6_CIRCLE,
            'Število \\(z=0{,}8+0{,}6i\\), \\(n=1\\): modul \\(1\\); učenec nastavi \\(n=3\\) in nato \\(n=8\\).',
            'The number \\(z=0.8+0.6i\\), \\(n=1\\): modulus \\(1\\); the learner sets \\(n=3\\) and then \\(n=8\\).'),
    }),
    step({
        id: 'm6-inside-outside', order: 4,
        title: text('Potence pri dveh številih', 'Powers of two numbers'),
        purpose: text('Z modulom \\(\\lvert z\\rvert^n\\) napovedati osmo potenco pri \\(\\lvert z\\rvert<1\\) in pri \\(\\lvert z\\rvert>1\\).', 'Using the modulus \\(\\lvert z\\rvert^n\\) to predict the eighth power for \\(\\lvert z\\rvert<1\\) and for \\(\\lvert z\\rvert>1\\).'),
        explanation: text(
            'Prikazano je \\(z=0{,}5+0{,}5i\\) in \\(n=1\\). Modul števila \\(z\\) je \\(\\sqrt{0{,}5}\\approx0{,}7071\\) in argument \\(45^\\circ\\). Napoved (a): kolikšna sta modul in argument števila \\(z^8\\) in kje leži \\(z^8\\)? Napoved zapiši, nato v polje Eksponent n vpiši \\(8\\). Napoved (b): pusti \\(n=8\\) in v polje Re v vrstici z pod naslovom Število z vpiši \\(1{,}5\\) (Im ostane \\(0{,}5\\)). Ali bo \\(z^8\\) bliže ali dlje od izhodišča kot \\(z\\), ali bo v pogledu in koliko je približno modul? Napoved (b) zapiši, preden vpišeš \\(1{,}5\\).',
            'The number \\(z=0.5+0.5i\\) and \\(n=1\\) are shown. The modulus of \\(z\\) is \\(\\sqrt{0.5}\\approx0.7071\\) and its argument \\(45^\\circ\\). Prediction (a): what are the modulus and the argument of \\(z^8\\), and where does \\(z^8\\) lie? Write the prediction down, then type \\(8\\) into the field Exponent n. Prediction (b): keep \\(n=8\\) and type \\(1.5\\) into the field Re in the row z under the heading Number z (Im stays \\(0.5\\)). Will \\(z^8\\) be closer to or farther from the origin than \\(z\\), will it be inside the view, and about how large is its modulus? Write prediction (b) down before typing \\(1.5\\).',
        ),
        formulaIds: ['de-moivre'],
        observationPrompt: text('Preberi pri \\(z=0{,}5+0{,}5i\\), \\(n=8\\) vrstice Re, Im, modul in \\(8\\cdot\\arg z\\); nato vpiši Re \\(=1{,}5\\) in preberi iste vrstice ter stavek pod grafom.', 'At \\(z=0.5+0.5i\\), \\(n=8\\) read the rows Re, Im, modulus and \\(8\\cdot\\arg z\\); then type Re \\(=1.5\\) and read the same rows and the sentence under the graph.'),
        expectedObservations: [text(
            'Pri \\(z=0{,}5+0{,}5i\\) je \\(z^8=\\tfrac1{16}=0{,}0625\\), modul \\(\\tfrac1{16}\\), \\(8\\cdot\\arg z=360^\\circ\\) (polni krog) in glavni argument \\(0^\\circ\\); točke se v spirali približujejo izhodišču (npr. \\(z^4=-0{,}25\\)). Pri \\(z=1{,}5+0{,}5i\\) je \\(\\lvert z\\rvert^2=2{,}5\\), zato je \\(\\lvert z^8\\rvert=2{,}5^4=\\tfrac{625}{16}=39{,}0625\\); \\(z^8\\approx-32{,}94+21i\\) in \\(8\\cdot\\arg z\\approx147{,}4796^\\circ\\). Potence od \\(z^3\\) naprej so zunaj pogleda, narisane kot puščice z modulom kot besedilom, stavek pod grafom jih našteje.',
            'For \\(z=0.5+0.5i\\) we have \\(z^8=\\tfrac1{16}=0.0625\\), modulus \\(\\tfrac1{16}\\), \\(8\\cdot\\arg z=360^\\circ\\) (a full turn) and principal argument \\(0^\\circ\\); the points spiral in towards the origin (for example \\(z^4=-0.25\\)). For \\(z=1.5+0.5i\\) we have \\(\\lvert z\\rvert^2=2.5\\), so \\(\\lvert z^8\\rvert=2.5^4=\\tfrac{625}{16}=39.0625\\); \\(z^8\\approx-32.94+21i\\) and \\(8\\cdot\\arg z\\approx147.4796^\\circ\\). The powers from \\(z^3\\) on are outside the view, drawn as arrows with the modulus as text, and the sentence under the graph lists them.',
        )],
        scene: powerScene('m6-inside-outside-scene', M6_INSIDE,
            'Število \\(z=0{,}5+0{,}5i\\), \\(n=1\\); učenec nastavi \\(n=8\\) in nato Re \\(=1{,}5\\).',
            'The number \\(z=0.5+0.5i\\), \\(n=1\\); the learner sets \\(n=8\\) and then Re \\(=1.5\\).'),
    }),
    step({
        id: 'm6-wrapped-argument', order: 5,
        title: text('Argument pete potence', 'The argument of the fifth power'),
        purpose: text('Napovedati glavno vrednost kota \\(n\\varphi\\), ki preseže polkrog.', 'Predicting the principal value of an angle \\(n\\varphi\\) that passes the half turn.'),
        explanation: text(
            'Prikazano je \\(z=1+i\\) in \\(n=4\\): \\(z^4=-4\\), \\(4\\cdot\\arg z=180^\\circ\\) in glavni argument je tudi \\(180^\\circ\\). Napoved: kolikšen je \\(5\\cdot\\arg z\\) in kolikšen je glavni argument števila \\(z^5\\)? Napoved zapiši, nato v polje Eksponent n vpiši \\(5\\).',
            'The number \\(z=1+i\\) and \\(n=4\\) are shown: \\(z^4=-4\\), \\(4\\cdot\\arg z=180^\\circ\\) and the principal argument is also \\(180^\\circ\\). Prediction: what is \\(5\\cdot\\arg z\\) and what is the principal argument of \\(z^5\\)? Write the prediction down, then type \\(5\\) into the field Exponent n.',
        ),
        formulaIds: ['de-moivre'],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(n=5\\) in primerjaj vrstici \\(5\\cdot\\arg z\\) in Glavni argument števila \\(z^5\\) z napovedjo.', 'Write down the prediction, then set \\(n=5\\) and compare the rows \\(5\\cdot\\arg z\\) and Principal argument of \\(z^5\\) with it.'),
        expectedObservations: [text(
            'Pri \\(n=5\\) je \\(5\\cdot\\arg z=225^\\circ\\), glavni argument pa \\(-135^\\circ=225^\\circ-360^\\circ\\); \\(z^5=-4-4i\\) z modulom \\(4\\sqrt2\\approx5{,}656854\\). Kota \\(225^\\circ\\) in \\(-135^\\circ\\) pripadata isti točki, ker se razlikujeta za polni krog. Graf kot glavni argument vedno prikaže kot iz intervala \\((-180^\\circ,180^\\circ]\\); kot \\(n\\varphi\\) v vrstici \\(n\\cdot\\arg z\\) se ne omeji.',
            'At \\(n=5\\) we have \\(5\\cdot\\arg z=225^\\circ\\) and the principal argument \\(-135^\\circ=225^\\circ-360^\\circ\\); \\(z^5=-4-4i\\) with modulus \\(4\\sqrt2\\approx5.656854\\). The angles \\(225^\\circ\\) and \\(-135^\\circ\\) belong to the same point, since they differ by a full turn. As the principal argument the graph always shows an angle from the interval \\((-180^\\circ,180^\\circ]\\); the angle \\(n\\varphi\\) in the row \\(n\\cdot\\arg z\\) is not restricted.',
        )],
        scene: powerScene('m6-wrapped-argument-scene', M6_WRAP,
            'Število \\(z=1+i\\), \\(n=4\\): \\(z^4=-4\\), \\(180^\\circ\\); učenec nastavi \\(n=5\\).',
            'The number \\(z=1+i\\), \\(n=4\\): \\(z^4=-4\\), \\(180^\\circ\\); the learner sets \\(n=5\\).'),
    }),
    step({
        id: 'm6-triple-angle', order: 6,
        title: text('Trojni kot', 'The triple angle'),
        purpose: text('Iz realnega in imaginarnega dela potence \\(z^3\\) izpeljati obrazca za trojni kot in ju preveriti na primeru.', 'Deriving the triple angle formulas from the real and imaginary parts of \\(z^3\\) and checking them on an example.'),
        explanation: text(
            'Naj bo \\(c=\\cos\\varphi\\) in \\(s=\\sin\\varphi\\). Potem je \\((c+is)^3=c^3-3cs^2+i\\,(3c^2s-s^3)\\). Po Moivreovi formuli za \\(n=3\\) je isto število \\(\\cos3\\varphi+i\\sin3\\varphi\\); enaki števili imata enaka realna in enaka imaginarna dela. Z \\(s^2=1-c^2\\) in \\(c^2=1-s^2\\) sledita \\(\\cos3\\varphi=4\\cos^3\\varphi-3\\cos\\varphi\\) in \\(\\sin3\\varphi=3\\sin\\varphi-4\\sin^3\\varphi\\) za vsak kot \\(\\varphi\\). Prikazano je \\(z=0{,}6+0{,}8i\\), ki ima modul \\(1\\), zato je \\(\\cos\\varphi=0{,}6\\) in \\(\\sin\\varphi=0{,}8\\); prikazan je \\(n=2\\). Napoved: s obrazcema izračunaj \\(\\cos3\\varphi\\) in \\(\\sin3\\varphi\\). Napoved zapiši, nato v polje Eksponent n vpiši \\(3\\).',
            'Let \\(c=\\cos\\varphi\\) and \\(s=\\sin\\varphi\\). Then \\((c+is)^3=c^3-3cs^2+i\\,(3c^2s-s^3)\\). By the de Moivre formula for \\(n=3\\) the same number is \\(\\cos3\\varphi+i\\sin3\\varphi\\); equal numbers have equal real parts and equal imaginary parts. With \\(s^2=1-c^2\\) and \\(c^2=1-s^2\\) we get \\(\\cos3\\varphi=4\\cos^3\\varphi-3\\cos\\varphi\\) and \\(\\sin3\\varphi=3\\sin\\varphi-4\\sin^3\\varphi\\) for every angle \\(\\varphi\\). The number \\(z=0.6+0.8i\\) is shown; it has modulus \\(1\\), so \\(\\cos\\varphi=0.6\\) and \\(\\sin\\varphi=0.8\\);\\(n=2\\) is shown. Prediction: with the two formulas compute \\(\\cos3\\varphi\\) and \\(\\sin3\\varphi\\). Write the prediction down, then type \\(3\\) into the field Exponent n.',
        ),
        formulaIds: ['triple-angle'],
        observationPrompt: text('Zapiši napoved, nato nastavi \\(n=3\\) in primerjaj vrstici Re \\(z^3\\) in Im \\(z^3\\) z izračunanima \\(\\cos3\\varphi\\) in \\(\\sin3\\varphi\\).', 'Write down the prediction, then set \\(n=3\\) and compare the rows Re \\(z^3\\) and Im \\(z^3\\) with the computed \\(\\cos3\\varphi\\) and \\(\\sin3\\varphi\\).'),
        expectedObservations: [text(
            'Obrazca dasta \\(4\\cdot0{,}216-3\\cdot0{,}6=0{,}864-1{,}8=-0{,}936\\) in \\(3\\cdot0{,}8-4\\cdot0{,}512=2{,}4-2{,}048=0{,}352\\). Graf pri \\(n=3\\) pokaže \\(\\text{Re}\\,z^3=-\\tfrac{117}{125}\\approx-0{,}936\\) in \\(\\text{Im}\\,z^3=\\tfrac{44}{125}\\approx0{,}352\\): ujemanje. Primer je ponazoritev; obrazca veljata za vsak kot zaradi izpeljave.',
            'The formulas give \\(4\\cdot0.216-3\\cdot0.6=0.864-1.8=-0.936\\) and \\(3\\cdot0.8-4\\cdot0.512=2.4-2.048=0.352\\). At \\(n=3\\) the graph shows \\(\\text{Re}\\,z^3=-\\tfrac{117}{125}\\approx-0.936\\) and \\(\\text{Im}\\,z^3=\\tfrac{44}{125}\\approx0.352\\): they agree. The example is an illustration; the formulas hold for every angle because of the derivation.',
        )],
        scene: powerScene('m6-triple-angle-scene', M6_TRIPLE,
            'Število \\(z=0{,}6+0{,}8i\\), \\(n=2\\): \\(z^2\\approx-0{,}28+0{,}96i\\); učenec nastavi \\(n=3\\).',
            'The number \\(z=0.6+0.8i\\), \\(n=2\\): \\(z^2\\approx-0.28+0.96i\\); the learner sets \\(n=3\\).'),
    }),
    step({
        id: 'm6-explore', order: 7,
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text('Izrek preizkusiti na svojih številih.', 'Trying the theorem on your own numbers.'),
        explanation: text(
            'Zdaj je prikazano privzeto stanje: \\(z=1+i\\) in \\(n=5\\). Spreminjaj \\(z\\) (polji Re in Im v vrstici z pod naslovom Število z ali povleci točko) in eksponent \\(n\\), pred vsako spremembo pa napovej modul in argument števila \\(z^n\\). Moivreova formula velja za vsak \\(z\\ne0\\) in vsako naravno število \\(n\\), graf pa prikazuje \\(n\\) do \\(8\\); ob \\(z=0\\) argumenta ni. Gumb Ponastavi vrne \\(n=1\\) in pusti \\(z\\).',
            'The Demonstration default is shown now: \\(z=1+i\\) and \\(n=5\\). Change \\(z\\) (the fields Re and Im in the row z under the heading Number z, or drag the point) and the exponent \\(n\\), and before each change predict the modulus and the argument of \\(z^n\\). The de Moivre formula holds for every \\(z\\ne0\\) and every natural number \\(n\\), while the graph shows \\(n\\) up to \\(8\\); at \\(z=0\\) there is no argument. The button Reset returns \\(n=1\\) and keeps \\(z\\).',
        ),
        formulaIds: [],
        observationPrompt: text('Poišči \\(z\\), pri katerem so vse potence \\(z\\), \\(z^2\\), …, \\(z^4\\) na enotski krožnici, in \\(z\\), pri katerem je \\(z^8\\) realno število; nato poskusi \\(z=i\\).', 'Find a \\(z\\) whose powers \\(z\\), \\(z^2\\), …, \\(z^4\\) all lie on the unit circle, and a \\(z\\) for which \\(z^8\\) is a real number; then try \\(z=i\\).'),
        expectedObservations: [text(
            'Vse potence so na krožnici pri \\(\\lvert z\\rvert=1\\), npr. \\(z=0{,}6+0{,}8i\\). Realna osma potenca: \\(z=1+i\\), saj je \\((1+i)^2=2i\\), \\((1+i)^4=-4\\), \\((1+i)^8=16\\). Pri \\(z=i\\) (\\(A=0\\), \\(B=20\\)) so potence \\(i,\\ -1,\\ -i,\\ 1,\\ i,\\dots\\): argument raste za \\(90^\\circ\\), zato se po štirih potencah vrnejo.',
            'All powers lie on the circle when \\(\\lvert z\\rvert=1\\), for example \\(z=0.6+0.8i\\). A real eighth power: \\(z=1+i\\), since \\((1+i)^2=2i\\), \\((1+i)^4=-4\\), \\((1+i)^8=16\\). For \\(z=i\\) (\\(A=0\\), \\(B=20\\)) the powers are \\(i,\\ -1,\\ -i,\\ 1,\\ i,\\dots\\): the argument grows by \\(90^\\circ\\), so after four powers they return.',
        )],
        scene: powerScene('m6-explore-scene', M6_EXPLORE,
            'Privzeto stanje \\(z=1+i\\), \\(n=5\\): nevtralno stanje za raziskovanje.',
            'The default \\(z=1+i\\), \\(n=5\\): a neutral state for exploring.'),
    }),
];

const sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-complex-power-implementation',
        citation: 'Bezeg source: src/analysis/complexPower.ts (the power kernel and the exact integer decisions) and src/graphs/complex/ComplexPowerGraph.tsx.',
        implementationCorrespondence: 'A scene sets z = (A + Bi)/20 with whole numbers A and B in -40..40 and the exponent n in 1..8 of the graph; the rows give Re and Im of z^n and its modulus as exact fractions and radicals, the angle n times arg z and the principal argument as computed degrees, and the decisions "real", "on the unit circle" and "equals 1" exactly on whole numbers. The text quotes only values of those scenes, values the learner reads after an action the text asks for, or stated arithmetic. The formula of de Moivre is a theorem proved by induction from the multiplication rule; the drawing illustrates it and proves nothing.',
    },
];

export const complexPowerLesson: GuidedLesson = {
    demonstrationId: 'complex-power',
    title: text('Moivreova formula: potence kompleksnega števila', 'The de Moivre formula: powers of a complex number'),
    summary: text(
        'Potenciranje kompleksnega števila \\(z\\) na \\(n\\)-to potenco z modulom \\(r\\) in argumentom \\(\\varphi\\) obravnavamo kot ponovljeno množenje. Pravilo preizkusimo na točkah \\(z,z^2,\\dots,z^n\\), ob njem pa opazujemo glavni argument in izpeljemo obrazca za trojni kot.',
        'Raising a complex number \\(z\\) with modulus \\(r\\) and argument \\(\\varphi\\) to the \\(n\\)-th power is treated as repeated multiplication. We test the rule on the points \\(z,z^2,\\dots,z^n\\), watch the principal argument and derive the triple angle formulas.',
    ),
    prerequisites: [text('Množenje kompleksnih števil in polarni zapis (modul, argument, glavni argument) iz lekcije o korenih.', 'Multiplication of complex numbers and the polar form (modulus, argument, principal argument) from the lesson on roots.')],
    learningGoals: [
        text('Znaš s Moivreovo formulo izračunati modul in argument potence \\(z^n\\) ter veš, da je formula izrek, dokazan z indukcijo iz pravila za množenje.', 'Can compute the modulus and the argument of a power \\(z^n\\) with the de Moivre formula and know that it is a theorem proved by induction from the multiplication rule.'),
        text('Veš, da ležijo potence na krožnici pri \\(\\lvert z\\rvert=1\\), v spirali proti izhodišču pri \\(\\lvert z\\rvert<1\\) in v spirali navzven pri \\(\\lvert z\\rvert>1\\); pri realnem \\(z\\) ležijo na premici skozi izhodišče (žarek), ne v spirali.', 'Know that the powers lie on a circle when \\(\\lvert z\\rvert=1\\), spiral in towards the origin when \\(\\lvert z\\rvert<1\\) and spiral out when \\(\\lvert z\\rvert>1\\); for a real \\(z\\) they lie on a line through the origin (a ray), not on a spiral.'),
        text('Ločiš kot \\(n\\varphi\\), ki ni omejen, od glavnega argumenta iz \\((-180^\\circ,180^\\circ]\\), in iz realnega ter imaginarnega dela števila \\(z^3\\) izpelješ obrazca za trojni kot.', 'Distinguish the angle \\(n\\varphi\\), which is not restricted, from the principal argument in \\((-180^\\circ,180^\\circ]\\), and derive the triple angle formulas from the real and imaginary parts of \\(z^3\\).'),
    ],
    formulaBlocks: formulas,
    workedExamples: [],
    steps,
    sources,
    edgeCases: [
        text('Pri \\(z=0\\) argumenta ni in so vse potence \\(0\\); graf to pove v stavku pod grafom.', 'For \\(z=0\\) there is no argument and all powers are \\(0\\); the graph says so in the sentence under it.'),
        text('Potence, ki ne ležijo v pogledu, graf nariše kot puščice z modulom kot besedilom; njihova točka je še vedno \\(z^k\\).', 'Powers that do not lie in the view are drawn as arrows with the modulus as text; their point is still \\(z^k\\).'),
        text('Vrednosti "realno", "na enotski krožnici" in "enako \\(1\\)" so odločene natančno na celih številih, kota in decimalke pa so zaokrožene izračunane vrednosti.', 'The values "real", "on the unit circle" and "equals \\(1\\)" are decided exactly on whole numbers, while the angles and decimals are rounded computed values.'),
    ],
    unresolvedQuestions: [],
};
