/**
 * Guided lessons of the Probability and statistics family (docs/specs/probability-statistics-lessons.md). P1, density and probability
 * as area, `prob-density`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is the readout of the scene it belongs to, and `probabilityGuidedLessons.test.ts` checks that against the real graph and the
 * kernel in `src/analysis/densityAreaModel.ts`. Scenes use the `density-mu`, `density-sigma`, `density-a` and `density-b` parameters
 * and the `density-example` choice (`standard` or `iq`).
 */
import type {FunctionParameterName, LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});
const parameter = (name: FunctionParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});

interface DensityScene {
    readonly example: 'standard' | 'iq';
    /** Applied after the example, in this order: mu, sigma, then the two ends. */
    readonly mu?: number;
    readonly sigma?: number;
    readonly a: number;
    readonly b: number;
}

const densityScene = (id: string, scene: DensityScene, sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions: [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'density-example', value: scene.example},
        ...(scene.mu === undefined ? [] : [parameter('density-mu', scene.mu)]),
        ...(scene.sigma === undefined ? [] : [parameter('density-sigma', scene.sigma)]),
        parameter('density-a', scene.a),
        parameter('density-b', scene.b),
    ],
    expectedState: text(sl, en),
});

const densityArea: GuidedLesson = {
    demonstrationId: 'prob-density',
    title: text('Gostota in verjetnost kot ploščina', 'Density and probability as area'),
    summary: text(
        'Pri zvezni spremenljivki je verjetnost, da leži vrednost med \\(a\\) in \\(b\\), ploščina pod gostoto med tema mejama; ploščina pod vso krivuljo je \\(1\\). Oblika zvonaste krivulje normalne porazdelitve \\(N(\\mu,\\sigma^2)\\) je odvisna od \\(\\mu\\) (lega) in \\(\\sigma\\) (širina), delež ploščine med \\(\\mu-k\\sigma\\) in \\(\\mu+k\\sigma\\) pa od njiju ni odvisen.',
        'For a continuous variable the probability that the value lies between \\(a\\) and \\(b\\) is the area under the density between these bounds; the area under the whole curve is \\(1\\). The shape of the bell curve of the normal distribution \\(N(\\mu,\\sigma^2)\\) depends on \\(\\mu\\) (position) and \\(\\sigma\\) (width), but the share of the area between \\(\\mu-k\\sigma\\) and \\(\\mu+k\\sigma\\) does not.',
    ),
    prerequisites: [
        text('Potrebno je poglavje o določenem integralu: ploščina pod grafom funkcije med dvema mejama.', 'Assumes the definite integral chapter: the area under the graph of a function between two bounds.'),
        text('Dovolj je razumevanje relativne frekvence kot deleža; drugega znanja o verjetnosti ni treba.', 'Understanding a relative frequency as a share is enough; no other probability is assumed.'),
    ],
    learningGoals: [
        text('Razložiš, da je verjetnost pri zvezni spremenljivki ploščina pod gostoto med mejama in da je celotna ploščina \\(1\\).', 'Explain that for a continuous variable a probability is the area under the density between two bounds and that the total area is \\(1\\).'),
        text('Poveš, da ima posamezna vrednost verjetnost \\(0\\): ploščina pod gostoto med \\(a\\) in \\(a\\) je \\(0\\).', 'State that a single value has probability \\(0\\): the area under the density between \\(a\\) and \\(a\\) is \\(0\\).'),
        text('Poveš, da pri normalni porazdelitvi delež ploščine med \\(\\mu\\pm k\\sigma\\) ni odvisen od \\(\\mu\\) in \\(\\sigma\\) (\\(68{,}27\\ \\%\\), \\(95{,}45\\ \\%\\), \\(99{,}73\\ \\%\\) za \\(k=1,2,3\\)).', 'State that for the normal distribution the share of the area between \\(\\mu\\pm k\\sigma\\) does not depend on \\(\\mu\\) and \\(\\sigma\\) (\\(68.27\\ \\%\\), \\(95.45\\ \\%\\), \\(99.73\\ \\%\\) for \\(k=1,2,3\\)).'),
        text('Z mejama v enotah \\(\\sigma\\) (standardizirani meji \\(z_a\\), \\(z_b\\)) prebereš verjetnost za poljubno normalno porazdelitev.', 'Use the bounds in units of \\(\\sigma\\) (the standardized bounds \\(z_a\\), \\(z_b\\)) to read a probability for any normal distribution.'),
    ],
    formulaBlocks: [
        {
            id: 'normal-density-area',
            latex: 'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}},\\qquad P(a\\le X\\le b)=\\int_a^b f(x)\\,dx=\\Phi(z_b)-\\Phi(z_a),\\qquad z=\\frac{x-\\mu}{\\sigma}',
            notation: text(
                '\\(f\\) je gostota normalne porazdelitve \\(N(\\mu,\\sigma^2)\\), \\(\\mu\\) povprečje, \\(\\sigma>0\\) standardni odklon, \\(\\Phi\\) porazdelitvena funkcija standardne normalne porazdelitve, \\(z_a\\) in \\(z_b\\) standardizirani meji.',
                '\\(f\\) is the density of the normal distribution \\(N(\\mu,\\sigma^2)\\), \\(\\mu\\) the mean, \\(\\sigma>0\\) the standard deviation, \\(\\Phi\\) the distribution function of the standard normal distribution and \\(z_a\\), \\(z_b\\) the standardized bounds.',
            ),
            explanation: text(
                'Verjetnost je ploščina pod gostoto med \\(a\\) in \\(b\\), ne vrednost gostote. Zato ima ena sama vrednost verjetnost \\(0\\), čeprav je \\(f(a)>0\\). Deleži \\(68{,}27\\ \\%\\), \\(95{,}45\\ \\%\\) in \\(99{,}73\\ \\%\\) med \\(\\mu\\pm\\sigma\\), \\(\\mu\\pm2\\sigma\\) in \\(\\mu\\pm3\\sigma\\) so lastnost normalne porazdelitve (znan izrek, ki sledi iz \\(\\Phi\\)); vlečenje mej na grafu ga le ponazori.',
                'The probability is the area under the density between \\(a\\) and \\(b\\), not a value of the density. So a single value has probability \\(0\\) although \\(f(a)>0\\). The shares \\(68.27\\ \\%\\), \\(95.45\\ \\%\\) and \\(99.73\\ \\%\\) between \\(\\mu\\pm\\sigma\\), \\(\\mu\\pm2\\sigma\\) and \\(\\mu\\pm3\\sigma\\) are a property of the normal distribution (a standard theorem that follows from \\(\\Phi\\)); dragging the bounds on the graph only illustrates it.',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'density-total', order: 1,
            title: text('Zvonasta krivulja in celotna ploščina', 'The bell curve and the total area'),
            purpose: text('Napovedati delež ploščine znotraj enega standardnega odklona, preden ga graf pokaže.', 'Predicting the share of the area within one standard deviation before the graph shows it.'),
            explanation: text(
                'Graf kaže gostoto standardne normalne porazdelitve \\(N(0;1)\\) in ploščino pod njo med \\(a=-4\\) in \\(b=4\\). Ta ploščina je \\(99{,}99\\ \\%\\), torej skoraj vsa: ploščina pod vso krivuljo je \\(1\\) (\\(100\\ \\%\\)), vse možne vrednosti skupaj imajo verjetnost \\(1\\). Napovej: koliko odstotkov ploščine leži med \\(-1\\) in \\(1\\), torej znotraj enega standardnega odklona od povprečja?',
                'The graph shows the density of the standard normal distribution \\(N(0;1)\\) and the area under it between \\(a=-4\\) and \\(b=4\\). This area is \\(99.99\\ \\%\\), so almost all of it: the area under the whole curve is \\(1\\) (\\(100\\ \\%\\)), all possible values together have probability \\(1\\). Predict: what percentage of the area lies between \\(-1\\) and \\(1\\), that is within one standard deviation of the mean?',
            ),
            formulaIds: ['normal-density-area'],
            frames: [frame('density-total-explanation', 'explanation'), frame('density-total-observation', 'observation')],
            observationPrompt: text('Pred naslednjim korakom se odloči: je znotraj enega standardnega odklona manj kot polovica, okoli dve tretjini ali skoraj vsa ploščina?', 'Before the next step decide: is less than half, about two thirds or almost all of the area within one standard deviation?'),
            expectedObservations: [text('Ploščina med \\(-4\\) in \\(4\\) je \\(99{,}99\\ \\%\\); krivulja je pri \\(\\pm4\\) praktično na osi, zunaj je le še zanemarljiv rep.', 'The area between \\(-4\\) and \\(4\\) is \\(99.99\\ \\%\\); the curve is practically on the axis at \\(\\pm4\\), only a negligible tail lies outside.')],
            scene: densityScene('density-total-start', {example: 'standard', a: -4, b: 4},
                'Gostota \\(N(0;1)\\) z mejama \\(a=-4\\), \\(b=4\\); ploščina \\(99{,}99\\ \\%\\).',
                'The density \\(N(0;1)\\) with bounds \\(a=-4\\), \\(b=4\\); the area is \\(99.99\\ \\%\\).'),
        },
        {
            id: 'density-bounds', order: 2,
            title: text('Meji in odstotek ploščine', 'The bounds and the percentage of the area'),
            purpose: text('Z vlečenjem mej \\(a\\) in \\(b\\) brati ploščino kot odstotek.', 'Dragging the bounds \\(a\\) and \\(b\\) to read the area as a percentage.'),
            explanation: text(
                'Meji sta zdaj \\(a=-1{,}5\\) in \\(b=0{,}5\\); pobarvana ploščina je \\(62{,}47\\ \\%\\), kar je verjetnost \\(P(-1{,}5\\le X\\le0{,}5)=0{,}62466\\). Povleci meji po osi ali ju vpiši in opazuj odstotek. Ko postaneta meji enaki, je ploščina \\(0\\): pod eno samo vrednostjo ni ploščine.',
                'The bounds are now \\(a=-1.5\\) and \\(b=0.5\\); the shaded area is \\(62.47\\ \\%\\), which is the probability \\(P(-1.5\\le X\\le0.5)=0.62466\\). Drag the bounds along the axis or type them and watch the percentage. When the bounds become equal the area is \\(0\\): there is no area under a single value.',
            ),
            formulaIds: ['normal-density-area'],
            frames: [frame('density-bounds-explanation', 'explanation'), frame('density-bounds-observation', 'observation')],
            observationPrompt: text('Poskusi meji nastaviti tako, da je ploščina natanko polovica. Kje sta meji?', 'Try to set the bounds so that the area is exactly one half. Where are the bounds?'),
            expectedObservations: [text('Ploščina je \\(50\\ \\%\\), na primer med \\(-6\\) in \\(0\\); pri enakih mejah je ploščina \\(0\\).', 'The area is \\(50\\ \\%\\), for example between \\(-6\\) and \\(0\\); at equal bounds the area is \\(0\\).')],
            scene: densityScene('density-bounds-start', {example: 'standard', a: -1.5, b: 0.5},
                'Gostota \\(N(0;1)\\) z mejama \\(a=-1{,}5\\), \\(b=0{,}5\\); ploščina \\(62{,}47\\ \\%\\).',
                'The density \\(N(0;1)\\) with bounds \\(a=-1.5\\), \\(b=0.5\\); the area is \\(62.47\\ \\%\\).'),
        },
        {
            id: 'density-one-sigma', order: 3,
            title: text('Znotraj enega standardnega odklona', 'Within one standard deviation'),
            purpose: text('Napoved primerjati z deležem med \\(\\mu-\\sigma\\) in \\(\\mu+\\sigma\\).', 'Comparing the prediction with the share between \\(\\mu-\\sigma\\) and \\(\\mu+\\sigma\\).'),
            explanation: text(
                'Meji sta nastavljeni na \\(a=\\mu-\\sigma=-1\\) in \\(b=\\mu+\\sigma=1\\); standardizirani meji sta \\(z_a=-1\\) in \\(z_b=1\\). Ploščina je \\(68{,}27\\ \\%\\), torej okoli dve tretjini. To je lastnost normalne porazdelitve: \\(P(\\mu-\\sigma\\le X\\le\\mu+\\sigma)=\\Phi(1)-\\Phi(-1)=0{,}68269\\). Podobno je med \\(\\mu\\pm2\\sigma\\) \\(95{,}45\\ \\%\\) in med \\(\\mu\\pm3\\sigma\\) \\(99{,}73\\ \\%\\); poskusi z mejama \\(\\pm2\\) in \\(\\pm3\\).',
                'The bounds are set to \\(a=\\mu-\\sigma=-1\\) and \\(b=\\mu+\\sigma=1\\); the standardized bounds are \\(z_a=-1\\) and \\(z_b=1\\). The area is \\(68.27\\ \\%\\), about two thirds. This is a property of the normal distribution: \\(P(\\mu-\\sigma\\le X\\le\\mu+\\sigma)=\\Phi(1)-\\Phi(-1)=0.68269\\). Likewise \\(95.45\\ \\%\\) lies between \\(\\mu\\pm2\\sigma\\) and \\(99.73\\ \\%\\) between \\(\\mu\\pm3\\sigma\\); try the bounds \\(\\pm2\\) and \\(\\pm3\\).',
            ),
            formulaIds: ['normal-density-area'],
            frames: [frame('density-one-sigma-explanation', 'explanation'), frame('density-one-sigma-observation', 'observation')],
            observationPrompt: text('Primerjaj z napovedjo. Koliko ploščine ostane zunaj mej \\(\\pm1\\) in koliko zunaj \\(\\pm3\\)?', 'Compare with your prediction. How much area is left outside the bounds \\(\\pm1\\), and how much outside \\(\\pm3\\)?'),
            expectedObservations: [text('Znotraj \\(\\pm1\\) je \\(68{,}27\\ \\%\\), znotraj \\(\\pm2\\) je \\(95{,}45\\ \\%\\), znotraj \\(\\pm3\\) je \\(99{,}73\\ \\%\\); zunaj \\(\\pm1\\) ostane \\(31{,}73\\ \\%\\).', 'Within \\(\\pm1\\) there is \\(68.27\\ \\%\\), within \\(\\pm2\\) \\(95.45\\ \\%\\), within \\(\\pm3\\) \\(99.73\\ \\%\\); \\(31.73\\ \\%\\) is left outside \\(\\pm1\\).')],
            scene: densityScene('density-one-sigma-start', {example: 'standard', a: -1, b: 1},
                'Gostota \\(N(0;1)\\) z mejama \\(a=-1\\), \\(b=1\\); ploščina \\(68{,}27\\ \\%\\), \\(z_a=-1\\), \\(z_b=1\\).',
                'The density \\(N(0;1)\\) with bounds \\(a=-1\\), \\(b=1\\); the area is \\(68.27\\ \\%\\), \\(z_a=-1\\), \\(z_b=1\\).'),
        },
        {
            id: 'density-shape', order: 4,
            title: text('Povprečje in standardni odklon', 'The mean and the standard deviation'),
            purpose: text('Opaziti, da se krivulja premakne in splošči, delež med \\(\\mu\\pm\\sigma\\) pa ostane.', 'Noticing that the curve moves and flattens while the share between \\(\\mu\\pm\\sigma\\) stays.'),
            explanation: text(
                'Nastavljena sta \\(\\mu=1\\) in \\(\\sigma=1{,}5\\), meji pa \\(a=-0{,}5\\) in \\(b=2{,}5\\), to je \\(\\mu\\mp\\sigma\\). Krivulja je pomaknjena in nižja, ploščina med mejama pa je še vedno \\(68{,}27\\ \\%\\) (\\(z_a=-1\\), \\(z_b=1\\)). Z drsnikoma spremeni \\(\\mu\\) in \\(\\sigma\\), na primer \\(\\mu=-1\\), \\(\\sigma=0{,}85\\) z mejama \\(-1{,}85\\) in \\(-0{,}15\\): krivulja je ožja in višja, delež je spet \\(68{,}27\\ \\%\\). Po spremembi moraš meji sam postaviti na \\(\\mu\\mp\\sigma\\); ne premakneta se sami.',
                'The settings are \\(\\mu=1\\) and \\(\\sigma=1.5\\), and the bounds are \\(a=-0.5\\) and \\(b=2.5\\), that is \\(\\mu\\mp\\sigma\\). The curve is shifted and lower, yet the area between the bounds is still \\(68.27\\ \\%\\) (\\(z_a=-1\\), \\(z_b=1\\)). Change \\(\\mu\\) and \\(\\sigma\\) with the sliders, for example \\(\\mu=-1\\), \\(\\sigma=0.85\\) with the bounds \\(-1.85\\) and \\(-0.15\\): the curve is narrower and taller, and the share is again \\(68.27\\ \\%\\). After a change you must set the bounds to \\(\\mu\\mp\\sigma\\) yourself; they do not move on their own.',
            ),
            formulaIds: ['normal-density-area'],
            frames: [frame('density-shape-explanation', 'explanation'), frame('density-shape-observation', 'observation')],
            observationPrompt: text('Pred spremembo se odloči: ali se bo pri ožji krivulji delež med \\(\\mu\\pm\\sigma\\) povečal, zmanjšal ali ostal enak?', 'Before changing decide: for a narrower curve, will the share between \\(\\mu\\pm\\sigma\\) grow, shrink or stay the same?'),
            expectedObservations: [text('Delež ostane \\(68{,}27\\ \\%\\); spremenita se le lega in višina krivulje, standardizirani meji sta vedno \\(\\pm1\\).', 'The share stays \\(68.27\\ \\%\\); only the position and height of the curve change, and the standardized bounds are always \\(\\pm1\\).')],
            scene: densityScene('density-shape-start', {example: 'standard', mu: 1, sigma: 1.5, a: -0.5, b: 2.5},
                'Gostota \\(N(1;1{,}5^2)\\) z mejama \\(a=-0{,}5\\), \\(b=2{,}5\\); ploščina \\(68{,}27\\ \\%\\), \\(z_a=-1\\), \\(z_b=1\\).',
                'The density \\(N(1;1.5^2)\\) with bounds \\(a=-0.5\\), \\(b=2.5\\); the area is \\(68.27\\ \\%\\), \\(z_a=-1\\), \\(z_b=1\\).'),
        },
        {
            id: 'density-iq', order: 5,
            title: text('Primer \\(N(100;15^2)\\)', 'The example \\(N(100;15^2)\\)'),
            purpose: text('Prebrati verjetnost za meji, ki nista simetrični okoli povprečja.', 'Reading a probability for bounds that are not symmetric about the mean.'),
            explanation: text(
                'Izbran je primer \\(N(100;15^2)\\), na primer rezultat testa s povprečjem \\(100\\) in odklonom \\(15\\), z mejama \\(a=85\\) in \\(b=130\\). Standardizirani meji sta \\(z_a=-1\\) in \\(z_b=2\\), ploščina pa \\(81{,}86\\ \\%\\): \\(P(85\\le X\\le130)=\\Phi(2)-\\Phi(-1)=0{,}81859\\). Napovej: ali je ta delež večji ali manjši od deleža med \\(\\mu\\pm\\sigma\\)? Nato ga preberi.',
                'The example \\(N(100;15^2)\\) is chosen, say a test score with mean \\(100\\) and deviation \\(15\\), with bounds \\(a=85\\) and \\(b=130\\). The standardized bounds are \\(z_a=-1\\) and \\(z_b=2\\) and the area is \\(81.86\\ \\%\\): \\(P(85\\le X\\le130)=\\Phi(2)-\\Phi(-1)=0.81859\\). Predict: is this share larger or smaller than the share between \\(\\mu\\pm\\sigma\\)? Then read it.',
            ),
            formulaIds: ['normal-density-area'],
            frames: [frame('density-iq-explanation', 'explanation'), frame('density-iq-observation', 'observation')],
            observationPrompt: text('Pomakni \\(a\\) na \\(70\\): kolikšna je zdaj ploščina in kateri \\(k\\) ji ustreza?', 'Move \\(a\\) to \\(70\\): what is the area now and which \\(k\\) does it match?'),
            expectedObservations: [text('Ploščina med \\(85\\) in \\(130\\) je \\(81{,}86\\ \\%\\); med \\(70\\) in \\(130\\) je \\(\\mu-2\\sigma\\) do \\(\\mu+2\\sigma\\), torej \\(95{,}45\\ \\%\\).', 'The area between \\(85\\) and \\(130\\) is \\(81.86\\ \\%\\); between \\(70\\) and \\(130\\) it is \\(\\mu-2\\sigma\\) to \\(\\mu+2\\sigma\\), so \\(95.45\\ \\%\\).')],
            scene: densityScene('density-iq-start', {example: 'iq', a: 85, b: 130},
                'Gostota \\(N(100;15^2)\\) z mejama \\(a=85\\), \\(b=130\\); ploščina \\(81{,}86\\ \\%\\), \\(z_a=-1\\), \\(z_b=2\\).',
                'The density \\(N(100;15^2)\\) with bounds \\(a=85\\), \\(b=130\\); the area is \\(81.86\\ \\%\\), \\(z_a=-1\\), \\(z_b=2\\).'),
        },
        {
            id: 'density-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati enostranske verjetnosti in repe.', 'Exploring one-sided probabilities and the tails on your own.'),
            explanation: text(
                'Graf je spet pri \\(N(0;1)\\) z mejama \\(-1\\) in \\(1\\). Premikaj \\(\\mu\\) in \\(\\sigma\\) (\\(\\sigma\\) je med \\(0{,}1\\) in \\(20\\)) ter meji. Poskusi enostransko verjetnost: eno mejo postavi daleč stran in preberi ploščino do druge. Poglej tudi repa: kolikšna ploščina leži zunaj \\(\\mu\\pm3\\sigma\\)? Pri \\(a>b\\) je ploščina \\(0\\) in graf to izpiše.',
                'The graph is back at \\(N(0;1)\\) with bounds \\(-1\\) and \\(1\\). Move \\(\\mu\\) and \\(\\sigma\\) (\\(\\sigma\\) is between \\(0.1\\) and \\(20\\)) and the bounds. Try a one-sided probability: put one bound far away and read the area up to the other. Look at the tails too: how much area lies outside \\(\\mu\\pm3\\sigma\\)? For \\(a>b\\) the area is \\(0\\) and the graph says so.',
            ),
            formulaIds: ['normal-density-area'],
            frames: [frame('density-explore-explanation', 'explanation'), frame('density-explore-observation', 'observation')],
            observationPrompt: text('Kolikšna je verjetnost \\(P(X\\le\\mu)\\) in kolikšna \\(P(X\\ge\\mu+2\\sigma)\\)?', 'What is the probability \\(P(X\\le\\mu)\\), and what is \\(P(X\\ge\\mu+2\\sigma)\\)?'),
            expectedObservations: [text('Do povprečja je ploščina \\(50\\ \\%\\) zaradi simetrije; desni rep od \\(\\mu+2\\sigma\\) naprej je okoli \\(2{,}3\\ \\%\\).', 'Up to the mean the area is \\(50\\ \\%\\) by symmetry; the right tail beyond \\(\\mu+2\\sigma\\) is about \\(2.3\\ \\%\\).')],
            scene: densityScene('density-explore-default', {example: 'standard', a: -1, b: 1},
                'Gostota \\(N(0;1)\\) z mejama \\(a=-1\\), \\(b=1\\); vse je prosto za raziskovanje.',
                'The density \\(N(0;1)\\) with bounds \\(a=-1\\), \\(b=1\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'abramowitz-stegun-normal', citation: 'Abramowitz, M. and Stegun, I. A. Handbook of Mathematical Functions (1964), section 26.2 (the normal or Gaussian probability function); the 68-95-99.7 shares follow from the values of the standard normal distribution function.'},
        {
            id: 'bezeg-density-implementation',
            citation: 'Bezeg source: src/analysis/densityAreaModel.ts and src/graphs/functions/DensityAreaGraph.tsx.',
            implementationCorrespondence: 'The area is the difference of the standard normal distribution function at the standardized bounds, computed with an error function to a stated tolerance. A lesson scene chooses the example and sets the mean, the standard deviation and the two bounds with function parameters.',
        },
    ],
    edgeCases: [
        text('Standardni odklon \\(\\sigma\\) mora biti med \\(0{,}1\\) in \\(20\\); drugačna vrednost je zavrnjena z izpisanim sporočilom.', 'The standard deviation \\(\\sigma\\) must be between \\(0.1\\) and \\(20\\); another value is rejected with a message.'),
        text('Pri \\(a=b\\) je ploščina \\(0\\); pri \\(a>b\\) je prazna in graf izpiše stanje.', 'For \\(a=b\\) the area is \\(0\\); for \\(a>b\\) it is empty and the graph states the situation.'),
        text('Odstotki \\(68{,}27\\), \\(95{,}45\\) in \\(99{,}73\\) veljajo za normalno porazdelitev; za druge porazdelitve so drugačni.', 'The percentages \\(68.27\\), \\(95.45\\) and \\(99.73\\) hold for the normal distribution; other distributions give other shares.'),
    ],
    unresolvedQuestions: [],
};

export const probabilityGuidedLessons: readonly GuidedLesson[] = [densityArea];
