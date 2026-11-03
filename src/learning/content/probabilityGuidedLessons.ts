/**
 * Guided lessons of the Probability and statistics family (docs/specs/probability-statistics-lessons.md): P1, density and probability
 * as area, `prob-density`; P2, from binomial to normal, `prob-binomial-normal`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is the readout of the scene it belongs to, and `probabilityGuidedLessons.test.ts` checks that against the real graph and the
 * kernel in `src/analysis/densityAreaModel.ts`. Scenes use the `density-mu`, `density-sigma`, `density-a` and `density-b` parameters
 * and the `density-example` choice (`standard` or `iq`). P2 scenes use `binomial-n`, `binomial-p`, `binomial-k`, the
 * `binomial-normal-example` and `binomial-correction` choices and the `poisson-bars` element (`src/analysis/binomialNormalModel.ts`).
 * P3, the central limit theorem without randomness, `prob-clt`, uses the `clt-sum` animation, `clt-n`, `clt-example` and `clt-cdf` (`src/analysis/cltModel.ts`).
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

interface BinomialScene {
    readonly example: 'fair20' | 'fair100' | 'rare';
    /** Applied after the example, in this order: n, p, k, the correction, the Poisson bars. */
    readonly n?: number;
    readonly p?: number;
    readonly k?: number;
    readonly correction?: 'on' | 'off';
    readonly poisson?: boolean;
}

const binomialScene = (id: string, scene: BinomialScene, sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions: [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'binomial-normal-example', value: scene.example},
        ...(scene.n === undefined ? [] : [parameter('binomial-n', scene.n)]),
        ...(scene.p === undefined ? [] : [parameter('binomial-p', scene.p)]),
        ...(scene.k === undefined ? [] : [parameter('binomial-k', scene.k)]),
        ...(scene.correction === undefined ? [] : [{kind: 'function-choice', name: 'binomial-correction', value: scene.correction} satisfies LessonAction]),
        ...(scene.poisson === undefined ? [] : [{kind: 'function-visibility', target: 'poisson-bars', visible: scene.poisson} satisfies LessonAction]),
    ],
    expectedState: text(sl, en),
});

const binomialNormal: GuidedLesson = {
    demonstrationId: 'prob-binomial-normal',
    title: text('Od binomske k normalni porazdelitvi', 'From binomial to normal'),
    summary: text(
        'Stolpci binomske porazdelitve \\(B(n;p)\\) se z naraščajočim \\(n\\) približujejo normalni krivulji z enakim povprečjem \\(np\\) in varianco \\(np(1-p)\\). Verjetnost \\(P(X\\le k)\\) normalna porazdelitev dobro približa šele s popravkom za zveznost, torej s ploščino do \\(k+\\tfrac12\\). Pri majhnem \\(p\\) in zmernem \\(np\\) je boljši približek Poissonova porazdelitev z \\(\\lambda=np\\).',
        'As \\(n\\) grows, the bars of the binomial distribution \\(B(n;p)\\) approach the normal curve with the same mean \\(np\\) and variance \\(np(1-p)\\). The normal distribution approximates \\(P(X\\le k)\\) well only with the continuity correction, that is with the area up to \\(k+\\tfrac12\\). For a small \\(p\\) and a moderate \\(np\\) the Poisson distribution with \\(\\lambda=np\\) is the better approximation.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o gostoti: verjetnost pri normalni porazdelitvi je ploščina pod gostoto.', 'Assumes the density lesson: for the normal distribution a probability is the area under the density.'),
        text('Potrebna je binomska porazdelitev: število uspehov v \\(n\\) neodvisnih poskusih z verjetnostjo uspeha \\(p\\).', 'Assumes the binomial distribution: the number of successes in \\(n\\) independent trials with success probability \\(p\\).'),
    ],
    learningGoals: [
        text('Razložiš, da je \\(P(X\\le k)\\) vsota stolpcev od \\(0\\) do \\(k\\) in da stolpec \\(k\\) leži nad intervalom \\([k-\\tfrac12,k+\\tfrac12]\\).', 'Explain that \\(P(X\\le k)\\) is the sum of the bars from \\(0\\) to \\(k\\) and that the bar of \\(k\\) stands over the interval \\([k-\\tfrac12,k+\\tfrac12]\\).'),
        text('Poveš, zakaj normalni približek potrebuje popravek za zveznost in da pri majhnih \\(n\\) brez njega ni uporaben.', 'State why the normal approximation needs the continuity correction and that at small \\(n\\) it is not usable without it.'),
        text('Poveš, da je normalni približek limitna trditev (izrek de Moivre–Laplace): napake na grafu veljajo le za izbrane \\(n\\), \\(p\\) in \\(k\\).', 'State that the normal approximation is a limit statement (the de Moivre–Laplace theorem): the errors on the graph hold only for the chosen \\(n\\), \\(p\\) and \\(k\\).'),
        text('Prepoznaš primer, ko je \\(n\\) velik, \\(p\\) majhen in \\(np\\) zmeren, ter tedaj uporabiš Poissonovo porazdelitev.', 'Recognize the case of a large \\(n\\), a small \\(p\\) and a moderate \\(np\\), and use the Poisson distribution there.'),
    ],
    formulaBlocks: [
        {
            id: 'binomial-normal-approximation',
            latex: 'P(X\\le k)=\\sum_{j=0}^{k}\\binom{n}{j}p^j(1-p)^{n-j}\\approx\\Phi\\!\\left(\\frac{k+\\frac12-np}{\\sqrt{np(1-p)}}\\right),\\qquad P(Y\\le k)=\\sum_{j=0}^{k}e^{-\\lambda}\\frac{\\lambda^j}{j!},\\quad \\lambda=np',
            notation: text(
                '\\(X\\sim B(n;p)\\) je binomska spremenljivka, \\(\\Phi\\) porazdelitvena funkcija standardne normalne porazdelitve, \\(Y\\) Poissonova spremenljivka s parametrom \\(\\lambda=np\\).',
                '\\(X\\sim B(n;p)\\) is a binomial variable, \\(\\Phi\\) the distribution function of the standard normal distribution and \\(Y\\) a Poisson variable with parameter \\(\\lambda=np\\).',
            ),
            explanation: text(
                'Vsota na levi je natančna vrednost. Normalni približek z \\(k+\\tfrac12\\) šteje ploščino pod krivuljo do desnega roba stolpca \\(k\\); brez popravka bi se ustavil na sredini tega stolpca. Izrek de Moivre–Laplace pove, da gre napaka proti \\(0\\), ko \\(n\\) narašča pri stalnem \\(p\\); ne pove, kako velika je pri danem \\(n\\).',
                'The sum on the left is the exact value. The normal approximation with \\(k+\\tfrac12\\) counts the area under the curve up to the right edge of the bar of \\(k\\); without the correction it would stop at the middle of that bar. The de Moivre–Laplace theorem says that the error tends to \\(0\\) as \\(n\\) grows with \\(p\\) fixed; it does not say how large it is at a given \\(n\\).',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'binomial-bars', order: 1,
            title: text('Stolpci in normalna krivulja', 'The bars and the normal curve'),
            purpose: text('Napovedati \\(P(X\\le8)\\) iz slike stolpcev, preden jih graf sešteje.', 'Predicting \\(P(X\\le8)\\) from the picture of the bars before the graph adds them up.'),
            explanation: text(
                'Graf kaže stolpce porazdelitve \\(X\\sim B(20;\\tfrac12)\\), na primer število grbov v \\(20\\) metih kovanca, in normalno krivuljo z enakim povprečjem \\(10\\) in standardnim odklonom \\(\\sigma=\\sqrt5\\approx2{,}24\\). Pobarvani so stolpci do \\(k=10\\): \\(P(X\\le10)=0{,}5881\\). Napovej: kolikšna je \\(P(X\\le8)\\)?',
                'The graph shows the bars of the distribution \\(X\\sim B(20;\\tfrac12)\\), for example the number of heads in \\(20\\) coin tosses, and the normal curve with the same mean \\(10\\) and standard deviation \\(\\sigma=\\sqrt5\\approx2.24\\). The bars up to \\(k=10\\) are shaded: \\(P(X\\le10)=0.5881\\). Predict: what is \\(P(X\\le8)\\)?',
            ),
            formulaIds: ['binomial-normal-approximation'],
            frames: [frame('binomial-bars-explanation', 'explanation'), frame('binomial-bars-observation', 'observation')],
            observationPrompt: text('Pred naslednjim korakom se odloči: je \\(P(X\\le8)\\) bližje \\(0{,}1\\), \\(0{,}25\\) ali \\(0{,}4\\)?', 'Before the next step decide: is \\(P(X\\le8)\\) closer to \\(0.1\\), \\(0.25\\) or \\(0.4\\)?'),
            expectedObservations: [text('Stolpci so simetrični okoli \\(10\\) in normalna krivulja gre skoraj skozi njihove vrhove; \\(P(X\\le10)=0{,}5881\\) je več kot polovica, ker stolpec \\(10\\) šteje v celoti.', 'The bars are symmetric about \\(10\\) and the normal curve passes almost through their tops; \\(P(X\\le10)=0.5881\\) is more than one half because the bar of \\(10\\) counts in full.')],
            scene: binomialScene('binomial-bars-start', {example: 'fair20', k: 10},
                'Stolpci \\(B(20;\\tfrac12)\\), pobarvani do \\(k=10\\); \\(P(X\\le10)=0{,}5881\\).',
                'The bars of \\(B(20;\\tfrac12)\\), shaded up to \\(k=10\\); \\(P(X\\le10)=0.5881\\).'),
        },
        {
            id: 'binomial-shade', order: 2,
            title: text('Natančna vsota do 8', 'The exact sum up to 8'),
            purpose: text('Prebrati natančno vrednost \\(P(X\\le8)\\) kot vsoto devetih stolpcev.', 'Reading the exact value of \\(P(X\\le8)\\) as the sum of nine bars.'),
            explanation: text(
                'Meja je zdaj \\(k=8\\): pobarvanih je devet stolpcev, od \\(0\\) do \\(8\\). Njihova vsota je natančna verjetnost \\(P(X\\le8)=0{,}25172\\). Normalna porazdelitev s popravkom za zveznost da \\(0{,}25117\\), absolutna napaka je \\(0{,}00055\\). Povleci točko \\(k\\) po osi in opazuj, kako se vrednosti spreminjajo.',
                'The bound is now \\(k=8\\): nine bars are shaded, from \\(0\\) to \\(8\\). Their sum is the exact probability \\(P(X\\le8)=0.25172\\). The normal distribution with the continuity correction gives \\(0.25117\\), an absolute error of \\(0.00055\\). Drag the point \\(k\\) along the axis and watch how the values change.',
            ),
            formulaIds: ['binomial-normal-approximation'],
            frames: [frame('binomial-shade-explanation', 'explanation'), frame('binomial-shade-observation', 'observation')],
            observationPrompt: text('Primerjaj z napovedjo. Za koliko se poveča natančna vrednost, ko premakneš \\(k\\) z \\(8\\) na \\(9\\)?', 'Compare with your prediction. By how much does the exact value grow when you move \\(k\\) from \\(8\\) to \\(9\\)?'),
            expectedObservations: [text('\\(P(X\\le8)=0{,}25172\\); pri \\(k=9\\) je \\(P(X\\le9)=0{,}41190\\), povečanje je ravno stolpec \\(9\\).', '\\(P(X\\le8)=0.25172\\); at \\(k=9\\), \\(P(X\\le9)=0.41190\\), and the increase is exactly the bar of \\(9\\).')],
            scene: binomialScene('binomial-shade-start', {example: 'fair20', k: 8},
                'Stolpci \\(B(20;\\tfrac12)\\) do \\(k=8\\); natančno \\(0{,}25172\\), s popravkom \\(0{,}25117\\).',
                'The bars of \\(B(20;\\tfrac12)\\) up to \\(k=8\\); exact \\(0.25172\\), corrected \\(0.25117\\).'),
        },
        {
            id: 'binomial-correction', order: 3,
            title: text('Popravek za zveznost', 'The continuity correction'),
            purpose: text('Razumeti, zakaj se ploščina pod krivuljo konča pri \\(8{,}5\\) in ne pri \\(8\\).', 'Understanding why the area under the curve ends at \\(8.5\\) and not at \\(8\\).'),
            explanation: text(
                'Popravek za zveznost je zdaj izklopljen: ploščina pod normalno krivuljo sega le do \\(8\\) in je \\(0{,}18555\\), napaka je \\(0{,}06618\\). Stolpec \\(8\\) leži nad intervalom \\([7{,}5;8{,}5]\\), zato meja \\(8\\) odreže njegovo desno polovico. Vklopi popravek: ploščina seže do \\(8{,}5\\) in je \\(0{,}25117\\) proti natančnim \\(0{,}25172\\). Pri tako majhnem \\(n\\), kot ga srečamo pri pouku, popravka ne smemo izpustiti.',
                'The continuity correction is now off: the area under the normal curve only reaches \\(8\\) and is \\(0.18555\\), an error of \\(0.06618\\). The bar of \\(8\\) stands over the interval \\([7.5;8.5]\\), so the bound \\(8\\) cuts off its right half. Switch the correction on: the area reaches \\(8.5\\) and is \\(0.25117\\) against the exact \\(0.25172\\). At an \\(n\\) as small as the ones met in class the correction must not be left out.',
            ),
            formulaIds: ['binomial-normal-approximation'],
            frames: [frame('binomial-correction-explanation', 'explanation'), frame('binomial-correction-observation', 'observation')],
            observationPrompt: text('Kolikšna je napaka brez popravka in kolikšna s popravkom? Kolikokrat je manjša?', 'What is the error without the correction, and what with it? How many times smaller is it?'),
            expectedObservations: [text('Brez popravka je napaka \\(0{,}06618\\), s popravkom \\(0{,}00055\\), več kot stokrat manjša.', 'Without the correction the error is \\(0.06618\\), with it \\(0.00055\\), more than a hundred times smaller.')],
            scene: binomialScene('binomial-correction-start', {example: 'fair20', k: 8, correction: 'off'},
                'Stolpci \\(B(20;\\tfrac12)\\) do \\(k=8\\), popravek izklopljen; normalna ploščina do \\(8\\) je \\(0{,}18555\\).',
                'The bars of \\(B(20;\\tfrac12)\\) up to \\(k=8\\), correction off; the normal area up to \\(8\\) is \\(0.18555\\).'),
        },
        {
            id: 'binomial-growing-n', order: 4,
            title: text('Večji \\(n\\)', 'A larger \\(n\\)'),
            purpose: text('Opaziti, da se napaka popravljenega približka pri večjem \\(n\\) zmanjša.', 'Noticing that the error of the corrected approximation decreases at a larger \\(n\\).'),
            explanation: text(
                'Zdaj je \\(n=50\\) in \\(k=22\\), meja leži malo pod povprečjem \\(25\\) kot prej \\(8\\) pod \\(10\\). Natančno je \\(P(X\\le22)=0{,}23994\\), s popravkom \\(0{,}23975\\) (napaka \\(0{,}00019\\)), brez popravka \\(0{,}19807\\) (napaka \\(0{,}04187\\)). Izberi še primer \\(B(100;\\tfrac12)\\) s \\(k=45\\): napaka s popravkom je tam \\(0{,}00004\\). To ponazarja izrek de Moivre–Laplace, limitno trditev: ko \\(n\\) narašča, gre napaka proti \\(0\\). Napake veljajo le za te \\(n\\), \\(p\\) in \\(k\\); hitrosti iz slike ne razberemo.',
                'Now \\(n=50\\) and \\(k=22\\), a bound a little below the mean \\(25\\) as \\(8\\) was below \\(10\\). The exact value is \\(P(X\\le22)=0.23994\\), corrected \\(0.23975\\) (error \\(0.00019\\)), uncorrected \\(0.19807\\) (error \\(0.04187\\)). Also choose the example \\(B(100;\\tfrac12)\\) with \\(k=45\\): the corrected error there is \\(0.00004\\). This illustrates the de Moivre–Laplace theorem, a limit statement: as \\(n\\) grows the error tends to \\(0\\). The errors hold only for these \\(n\\), \\(p\\) and \\(k\\); the picture does not show a rate.',
            ),
            formulaIds: ['binomial-normal-approximation'],
            frames: [frame('binomial-growing-n-explanation', 'explanation'), frame('binomial-growing-n-observation', 'observation')],
            observationPrompt: text('Pri \\(B(100;\\tfrac12)\\) in \\(k=45\\) preberi vse tri vrednosti. Ali je napaka brez popravka še vedno opazna?', 'At \\(B(100;\\tfrac12)\\) and \\(k=45\\) read all three values. Is the error without the correction still noticeable?'),
            expectedObservations: [text('Natančno \\(0{,}1841\\), s popravkom \\(0{,}18406\\), brez popravka \\(0{,}15866\\); napaka brez popravka \\(0{,}02545\\) je še vedno velika.', 'Exact \\(0.1841\\), corrected \\(0.18406\\), uncorrected \\(0.15866\\); the uncorrected error of \\(0.02545\\) is still large.')],
            scene: binomialScene('binomial-growing-n-start', {example: 'fair20', n: 50, k: 22},
                'Stolpci \\(B(50;\\tfrac12)\\) do \\(k=22\\); natančno \\(0{,}23994\\), s popravkom \\(0{,}23975\\).',
                'The bars of \\(B(50;\\tfrac12)\\) up to \\(k=22\\); exact \\(0.23994\\), corrected \\(0.23975\\).'),
        },
        {
            id: 'binomial-poisson', order: 5,
            title: text('Redki dogodki: Poissonova porazdelitev', 'Rare events: the Poisson distribution'),
            purpose: text('Videti, da pri majhnem \\(p\\) normalna krivulja ne ustreza, Poissonovi stolpci pa.', 'Seeing that for a small \\(p\\) the normal curve does not fit but the Poisson bars do.'),
            explanation: text(
                'Zdaj je \\(n=100\\), \\(p=0{,}02\\) in \\(k=2\\); povprečje je \\(np=2\\). Stolpci so nesimetrični, normalna krivulja pa daje verjetnost tudi negativnim vrednostim. Natančno je \\(P(X\\le2)=0{,}67669\\), normalni približek s popravkom \\(0{,}63951\\) (napaka \\(0{,}03718\\)), Poissonova porazdelitev z \\(\\lambda=2\\) pa \\(0{,}67668\\) (napaka \\(0{,}00001\\)). Poissonova porazdelitev je boljša limita, kadar je \\(n\\) velik, \\(p\\) majhen in \\(np\\) zmeren. Pogosto pravilo palca (pravilo palca, ne izrek) dovoli normalni približek šele pri \\(np\\ge5\\) in \\(n(1-p)\\ge5\\); tu je \\(np=2\\).',
                'Now \\(n=100\\), \\(p=0.02\\) and \\(k=2\\); the mean is \\(np=2\\). The bars are not symmetric, and the normal curve gives probability to negative values as well. The exact value is \\(P(X\\le2)=0.67669\\), the corrected normal approximation \\(0.63951\\) (error \\(0.03718\\)) and the Poisson distribution with \\(\\lambda=2\\) gives \\(0.67668\\) (error \\(0.00001\\)). The Poisson distribution is the better limit when \\(n\\) is large, \\(p\\) small and \\(np\\) moderate. A common rule of thumb (a rule of thumb, not a theorem) allows the normal approximation only for \\(np\\ge5\\) and \\(n(1-p)\\ge5\\); here \\(np=2\\).',
            ),
            formulaIds: ['binomial-normal-approximation'],
            frames: [frame('binomial-poisson-explanation', 'explanation'), frame('binomial-poisson-observation', 'observation')],
            observationPrompt: text('Primerjaj stolpce binomske in Poissonove porazdelitve. Kje se najbolj razlikujeta od normalne krivulje?', 'Compare the binomial and the Poisson bars. Where do they differ most from the normal curve?'),
            expectedObservations: [text('Binomski in Poissonovi stolpci se skoraj prekrivajo; normalna krivulja je simetrična okoli \\(2\\), stolpci pa imajo daljši desni rep in ne segajo pod \\(0\\).', 'The binomial and the Poisson bars almost coincide; the normal curve is symmetric about \\(2\\), while the bars have a longer right tail and do not reach below \\(0\\).')],
            scene: binomialScene('binomial-poisson-start', {example: 'fair100', p: 0.02, k: 2, poisson: true},
                'Stolpci \\(B(100;0{,}02)\\) do \\(k=2\\) s Poissonovimi stolpci; natančno \\(0{,}67669\\), Poisson \\(0{,}67668\\).',
                'The bars of \\(B(100;0.02)\\) up to \\(k=2\\) with the Poisson bars; exact \\(0.67669\\), Poisson \\(0.67668\\).'),
        },
        {
            id: 'binomial-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati, kdaj je kateri približek dober.', 'Exploring on your own when each approximation is good.'),
            explanation: text(
                'Graf je spet pri \\(B(20;\\tfrac12)\\) s \\(k=8\\). Spreminjaj \\(n\\) (do \\(1000\\)), \\(p\\) in \\(k\\), vklapljaj popravek in Poissonove stolpce. Poskusi \\(p=0{,}9\\): stolpci so zrcalna slika primera s \\(p=0{,}1\\). Poišči \\(n\\) in \\(p\\), pri katerih sta normalni in Poissonov približek podobno dobra. Gumb za prilagoditev pogleda pokaže vse stolpce.',
                'The graph is back at \\(B(20;\\tfrac12)\\) with \\(k=8\\). Change \\(n\\) (up to \\(1000\\)), \\(p\\) and \\(k\\), and switch the correction and the Poisson bars. Try \\(p=0.9\\): the bars are the mirror image of the case \\(p=0.1\\). Look for an \\(n\\) and a \\(p\\) at which the normal and the Poisson approximations are about equally good. The fit view button shows all bars.',
            ),
            formulaIds: ['binomial-normal-approximation'],
            frames: [frame('binomial-explore-explanation', 'explanation'), frame('binomial-explore-observation', 'observation')],
            observationPrompt: text('Kaj se zgodi z napako Poissonovega približka pri \\(p=\\tfrac12\\), ko \\(n\\) narašča?', 'What happens to the error of the Poisson approximation at \\(p=\\tfrac12\\) as \\(n\\) grows?'),
            expectedObservations: [text('Pri \\(p=\\tfrac12\\) je varianca \\(np(1-p)\\) le polovica povprečja, pri Poissonovi porazdelitvi pa je enaka povprečju, zato Poissonov približek ne postane dober; normalni približek s popravkom pa se izboljšuje.', 'At \\(p=\\tfrac12\\) the variance \\(np(1-p)\\) is only half of the mean while the Poisson variance equals the mean, so the Poisson approximation does not become good; the corrected normal approximation does improve.')],
            scene: binomialScene('binomial-explore-default', {example: 'fair20'},
                'Stolpci \\(B(20;\\tfrac12)\\) do \\(k=8\\); vse je prosto za raziskovanje.',
                'The bars of \\(B(20;\\tfrac12)\\) up to \\(k=8\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'feller-de-moivre-laplace', citation: 'Feller, W. An Introduction to Probability Theory and Its Applications, vol. 1, 3rd ed. (1968), chapter VII (the normal approximation to the binomial distribution) and section VI.5 (the Poisson approximation).'},
        {
            id: 'bezeg-binomial-normal-implementation',
            citation: 'Bezeg source: src/analysis/binomialNormalModel.ts and src/graphs/functions/BinomialNormalGraph.tsx.',
            implementationCorrespondence: 'The exact value sums the binomial mass function; the normal values are the standard normal distribution function at the standardized bound k + 1/2 or k; the Poisson value sums the Poisson mass function with lambda = np. A lesson scene chooses an example and sets n, p, k, the correction and the Poisson bars; a step that sets n or p or the Poisson bars also fits the view to the bars.',
        },
    ],
    edgeCases: [
        text('\\(n\\) je celo število od \\(1\\) do \\(1000\\), \\(k\\) celo število od \\(0\\) do \\(n\\); \\(p\\) mora biti strogo med \\(0\\) in \\(1\\): pri \\(p=0\\) ali \\(p=1\\) je varianca \\(0\\) in graf vrednost zavrne s sporočilom.', '\\(n\\) is an integer from \\(1\\) to \\(1000\\) and \\(k\\) an integer from \\(0\\) to \\(n\\); \\(p\\) must lie strictly between \\(0\\) and \\(1\\): at \\(p=0\\) or \\(p=1\\) the variance is \\(0\\) and the graph rejects the value with a message.'),
        text('Napake na grafu veljajo samo za izbrane \\(n\\), \\(p\\) in \\(k\\) in ne povedo, kako hitro se približek izboljšuje.', 'The errors on the graph hold only for the chosen \\(n\\), \\(p\\) and \\(k\\) and do not say how fast the approximation improves.'),
        text('Poissonova porazdelitev ima verjetnost tudi nad \\(n\\); kadar ta ni zanemarljiva, graf izpiše, koliko je ni narisane.', 'The Poisson distribution also has probability above \\(n\\); when it is not negligible the graph states how much of it is not drawn.'),
    ],
    unresolvedQuestions: [],
};

interface CltScene {
    readonly example: 'uniform' | 'skewed';
    /** Applied after the example, in this order: the animation steps, the sum count n, the distribution function. */
    readonly steps?: number;
    readonly n?: number;
    readonly cdf?: boolean;
}

const cltScene = (id: string, scene: CltScene, sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions: [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'function-choice', name: 'clt-example', value: scene.example},
        ...Array.from({length: scene.steps ?? 0}, () => ({kind: 'animation', animationId: 'clt-sum', command: 'next-step'} satisfies LessonAction)),
        ...(scene.n === undefined ? [] : [parameter('clt-n', scene.n)]),
        ...(scene.cdf === undefined ? [] : [{kind: 'function-visibility', target: 'clt-cdf', visible: scene.cdf} satisfies LessonAction]),
    ],
    expectedState: text(sl, en),
});

const centralLimit: GuidedLesson = {
    demonstrationId: 'prob-clt',
    title: text('Centralni limitni izrek brez naključja', 'The central limit theorem without randomness'),
    summary: text(
        'Gostota vsote \\(n\\) neodvisnih kopij je \\(n\\)-kratna konvolucija osnovne gostote. Ko vsoto standardiziramo (odštejemo \\(n\\mu\\), delimo s \\(\\sigma\\sqrt n\\)), se njena gostota z naraščajočim \\(n\\) približuje standardni normalni gostoti za skoraj vsako osnovno gostoto s končno varianco. To je centralni limitni izrek: konvergenca v porazdelitvi, ne hitrost približevanja. Poševna osnovna gostota potrebuje več členov kot simetrična.',
        'The density of the sum of \\(n\\) independent copies is the \\(n\\)-fold convolution of the base density. When the sum is standardized (subtract \\(n\\mu\\), divide by \\(\\sigma\\sqrt n\\)), its density approaches the standard normal density as \\(n\\) grows, for almost any base density with finite variance. This is the central limit theorem: convergence in distribution, not a rate of approach. A skewed base density needs more terms than a symmetric one.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o gostoti: verjetnost je ploščina pod gostoto, povprečje in varianca gostote.', 'Assumes the density lesson: a probability is the area under the density, and the mean and variance of a density.'),
        text('Potrebno je razumevanje vsote neodvisnih spremenljivk na ravni »prištejemo še eno kopijo«.', 'Assumes the idea of a sum of independent variables at the level of "add one more copy".'),
    ],
    learningGoals: [
        text('Razložiš, da je gostota vsote dveh neodvisnih spremenljivk konvolucija gostot in da ima vsota \\(n\\) kopij povprečje \\(n\\mu\\) in varianco \\(n\\sigma^2\\).', 'Explain that the density of the sum of two independent variables is the convolution of the densities, and that the sum of \\(n\\) copies has mean \\(n\\mu\\) and variance \\(n\\sigma^2\\).'),
        text('Opaziš, da se standardizirana vsota z naraščajočim \\(n\\) približuje standardni normalni gostoti, tudi če osnovna gostota ni zvonasta.', 'Notice that the standardized sum approaches the standard normal density as \\(n\\) grows, even when the base density is not bell-shaped.'),
        text('Poveš izrek z domnevami: neodvisne, enako porazdeljene spremenljivke s končno varianco; konvergenca je v porazdelitvi.', 'State the theorem with its hypotheses: independent, identically distributed variables with finite variance; the convergence is in distribution.'),
        text('Poveš, da se ujemanje pri enem \\(n\\) ne bere kot hitrost in da poševnost približevanje upočasni.', 'State that a match at one \\(n\\) is not read as a rate, and that skewness slows the approach.'),
    ],
    formulaBlocks: [
        {
            id: 'clt-standardized-sum',
            latex: 'f_{S_n}=f^{*n},\\qquad Z_n=\\frac{S_n-n\\mu}{\\sigma\\sqrt n},\\qquad K_n=\\sup_x\\left|F_{Z_n}(x)-\\Phi(x)\\right|\\xrightarrow[n\\to\\infty]{}0',
            notation: text(
                '\\(S_n=X_1+\\dots+X_n\\) je vsota neodvisnih kopij z gostoto \\(f\\), povprečjem \\(\\mu\\) in varianco \\(\\sigma^2\\); \\(f^{*n}\\) je \\(n\\)-kratna konvolucija, \\(\\Phi\\) porazdelitvena funkcija standardne normalne porazdelitve, \\(K_n\\) Kolmogorova razdalja.',
                '\\(S_n=X_1+\\dots+X_n\\) is the sum of independent copies with density \\(f\\), mean \\(\\mu\\) and variance \\(\\sigma^2\\); \\(f^{*n}\\) is the \\(n\\)-fold convolution, \\(\\Phi\\) the distribution function of the standard normal distribution and \\(K_n\\) the Kolmogorov distance.',
            ),
            explanation: text(
                'Centralni limitni izrek: če so \\(X_1,X_2,\\dots\\) neodvisne, enako porazdeljene in imajo končno varianco, \\(Z_n\\) konvergira k standardni normalni porazdelitvi v porazdelitvi, torej \\(K_n\\to0\\). Konvergenca ni točkasta za vsako gostoto in izrek ne pove hitrosti; oceno hitrosti daje Berry–Esseenov izrek, ki ga lekcija le navaja. Razdalja \\(K_n\\) na grafu velja samo za izbrano obliko in izbrani \\(n\\).',
                'The central limit theorem: if \\(X_1,X_2,\\dots\\) are independent, identically distributed and have finite variance, then \\(Z_n\\) converges to the standard normal distribution in distribution, that is \\(K_n\\to0\\). The convergence is not pointwise for every density and the theorem gives no rate; a rate estimate comes from the Berry–Esseen theorem, which the lesson only cites. The distance \\(K_n\\) on the graph holds only for the chosen shape and the chosen \\(n\\).',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'clt-base', order: 1,
            title: text('Osnovna gostota in normalna krivulja', 'The base density and the normal curve'),
            purpose: text('Videti osnovno gostoto \\(U(0,1)\\) kot standardizirano vsoto z \\(n=1\\) in jo primerjati z normalno krivuljo.', 'Seeing the base density \\(U(0,1)\\) as the standardized sum with \\(n=1\\) and comparing it with the normal curve.'),
            explanation: text(
                'Osnovna gostota je enakomerna na \\([0,1]\\): povprečje \\(\\mu=\\tfrac12\\), varianca \\(\\sigma^2=\\tfrac1{12}\\approx0{,}0833\\). Graf jo standardizira in nariše čez standardno normalno krivuljo. Pri \\(n=1\\) je Kolmogorova razdalja \\(K_1=0{,}05718\\). Napovej: kakšna bo slika vsote dveh takih spremenljivk?',
                'The base density is uniform on \\([0,1]\\): mean \\(\\mu=\\tfrac12\\), variance \\(\\sigma^2=\\tfrac1{12}\\approx0.0833\\). The graph standardizes it and draws it over the standard normal curve. At \\(n=1\\) the Kolmogorov distance is \\(K_1=0.05718\\). Predict: what will the picture of the sum of two such variables look like?',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-base-explanation', 'explanation'), frame('clt-base-observation', 'observation')],
            observationPrompt: text('Kakšne oblike je standardizirana enakomerna gostota in kje se najbolj razlikuje od zvona?', 'What shape is the standardized uniform density, and where does it differ most from the bell?'),
            expectedObservations: [text('Gostota je ravna in ima ostre robove; normalna krivulja je zvonasta. \\(K_1=0{,}05718\\).', 'The density is flat with sharp edges; the normal curve is bell-shaped. \\(K_1=0.05718\\).')],
            scene: cltScene('clt-base-start', {example: 'uniform'},
                'Enakomerna osnovna gostota pri \\(n=1\\); \\(\\mu=\\tfrac12\\), \\(\\sigma^2\\approx0{,}0833\\), \\(K_1=0{,}05718\\).',
                'The uniform base density at \\(n=1\\); \\(\\mu=\\tfrac12\\), \\(\\sigma^2\\approx0.0833\\), \\(K_1=0.05718\\).'),
        },
        {
            id: 'clt-two', order: 2,
            title: text('Prva konvolucija: vsota dveh', 'The first convolution: the sum of two'),
            purpose: text('Videti, da je vsota dveh enakomernih spremenljivk trikotna.', 'Seeing that the sum of two uniform variables is triangular.'),
            explanation: text(
                'Gumb »Dodaj še eno kopijo« je enkrat pritisnjen: \\(n=2\\). Gostota vsote je konvolucija enakomerne gostote same s seboj, trikotnik na \\([0,2]\\). Povprečje vsote je \\(n\\mu=1\\), varianca \\(n\\sigma^2=\\tfrac16\\). Kolmogorova razdalja pade s \\(0{,}05718\\) na \\(K_2=0{,}01644\\).',
                'The button "Add one more copy" has been pressed once: \\(n=2\\). The density of the sum is the convolution of the uniform density with itself, a triangle on \\([0,2]\\). The mean of the sum is \\(n\\mu=1\\), its variance \\(n\\sigma^2=\\tfrac16\\). The Kolmogorov distance drops from \\(0.05718\\) to \\(K_2=0.01644\\).',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-two-explanation', 'explanation'), frame('clt-two-observation', 'observation')],
            observationPrompt: text('Primerjaj trikotnik z napovedjo. Ali ima še ostre robove?', 'Compare the triangle with your prediction. Does it still have sharp edges?'),
            expectedObservations: [text('Gostota je trikotna, edini vogal je zdaj vrh; \\(K_2=0{,}01644\\).', 'The density is a triangle; the only corner is now the peak; \\(K_2=0.01644\\).')],
            scene: cltScene('clt-two-start', {example: 'uniform', steps: 1},
                'Vsota dveh enakomernih spremenljivk (\\(n=2\\)) je trikotna; \\(K_2=0{,}01644\\).',
                'The sum of two uniform variables (\\(n=2\\)) is triangular; \\(K_2=0.01644\\).'),
        },
        {
            id: 'clt-more', order: 3,
            title: text('Dodajamo kopije', 'Adding more copies'),
            purpose: text('Spremljati, kako se standardizirana gostota z večjim \\(n\\) približuje zvonu.', 'Watching the standardized density approach the bell as \\(n\\) grows.'),
            explanation: text(
                'Zdaj je \\(n=5\\) in \\(K_5=0{,}00572\\). Povleci drsnik \\(n\\) nazaj na \\(3\\), kjer je \\(K_3=0{,}00986\\), in naprej na \\(10\\), kjer je \\(K_{10}=0{,}00281\\). Krivulji se pokrivata vse bolje. Tak primer ponazarja izrek, ne dokazuje ga, in ujemanje pri enem \\(n\\) ni hitrost približevanja.',
                'Now \\(n=5\\) and \\(K_5=0.00572\\). Drag the slider \\(n\\) back to \\(3\\), where \\(K_3=0.00986\\), and on to \\(10\\), where \\(K_{10}=0.00281\\). The curves coincide better and better. Such an example illustrates the theorem, it does not prove it, and a match at one \\(n\\) is not a rate of approach.',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-more-explanation', 'explanation'), frame('clt-more-observation', 'observation')],
            observationPrompt: text('Kakšno je razmerje razdalj \\(K_5\\) in \\(K_{10}\\)? Ali iz tega lahko sklepaš na hitrost za vsak \\(n\\)?', 'What is the ratio of the distances \\(K_5\\) and \\(K_{10}\\)? Can you conclude a rate for every \\(n\\) from it?'),
            expectedObservations: [text('Pri \\(n=5\\) je \\(K_5=0{,}00572\\), pri \\(n=10\\) je \\(K_{10}=0{,}00281\\): približno polovica. Dve točki ne dasta hitrosti.', 'At \\(n=5\\), \\(K_5=0.00572\\); at \\(n=10\\), \\(K_{10}=0.00281\\): about one half. Two points give no rate.')],
            scene: cltScene('clt-more-start', {example: 'uniform', n: 5},
                'Standardizirana vsota petih enakomernih spremenljivk; \\(K_5=0{,}00572\\).',
                'The standardized sum of five uniform variables; \\(K_5=0.00572\\).'),
        },
        {
            id: 'clt-skewed', order: 4,
            title: text('Poševna gostota', 'The skewed density'),
            purpose: text('Videti, da poševna osnovna gostota potrebuje več členov.', 'Seeing that a skewed base density needs more terms.'),
            explanation: text(
                'Osnovna gostota je zdaj \\(f(x)=2(1-x)\\) na \\([0,1]\\): povprečje \\(\\mu=\\tfrac13\\), varianca \\(\\sigma^2=\\tfrac1{18}\\approx0{,}0556\\), poševnost \\(0{,}56569\\). Poševnost standardizirane vsote pada kot \\(0{,}56569/\\sqrt n\\). Pri \\(n=3\\) je krivulja še vidno poševna: \\(K_3=0{,}02492\\), enakomerna gostota pa ima pri \\(n=3\\) le \\(0{,}00986\\). Poševnost približevanje upočasni.',
                'The base density is now \\(f(x)=2(1-x)\\) on \\([0,1]\\): mean \\(\\mu=\\tfrac13\\), variance \\(\\sigma^2=\\tfrac1{18}\\approx0.0556\\), skewness \\(0.56569\\). The skewness of the standardized sum falls as \\(0.56569/\\sqrt n\\). At \\(n=3\\) the curve is still visibly lopsided: \\(K_3=0.02492\\), while the uniform density has only \\(0.00986\\) at \\(n=3\\). Skewness slows the approach.',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-skewed-explanation', 'explanation'), frame('clt-skewed-observation', 'observation')],
            observationPrompt: text('Na kateri strani je krivulja pri \\(n=3\\) višja od zvona? Dodaj kopije in opazuj, kdaj se razlika izgubi.', 'On which side is the curve higher than the bell at \\(n=3\\)? Add copies and watch when the difference disappears.'),
            expectedObservations: [text('Pri \\(n=3\\) je \\(K_3=0{,}02492\\), več kot dvakrat toliko kot pri enakomerni gostoti; pri \\(n=10\\) je še \\(K_{10}=0{,}01248\\).', 'At \\(n=3\\), \\(K_3=0.02492\\), more than twice the uniform value; at \\(n=10\\) it is still \\(K_{10}=0.01248\\).')],
            scene: cltScene('clt-skewed-start', {example: 'skewed', n: 3},
                'Poševna gostota \\(2(1-x)\\), \\(n=3\\); \\(\\mu=\\tfrac13\\), \\(\\sigma^2\\approx0{,}0556\\), \\(K_3=0{,}02492\\).',
                'The skewed density \\(2(1-x)\\), \\(n=3\\); \\(\\mu=\\tfrac13\\), \\(\\sigma^2\\approx0.0556\\), \\(K_3=0.02492\\).'),
        },
        {
            id: 'clt-shape', order: 5,
            title: text('Oblika osnovne gostote', 'The shape of the base density'),
            purpose: text('Z vlečenjem višin preizkusiti, da izrek ne zahteva posebne osnovne gostote.', 'Testing by dragging heights that the theorem does not need a special base density.'),
            explanation: text(
                'Graf je spet pri enakomerni gostoti z \\(n=5\\), \\(K_5=0{,}00572\\). Povleci drsnike višin osnovne gostote: oblika se normira in vsota pri istem \\(n\\) se izračuna znova. Poskusi dvigniti eno samo višino ali ustvariti stopnico. Dokler je varianca končna (tu je osnovna gostota omejena na \\([0,1]\\)), se vsota z naraščajočim \\(n\\) znova približa zvonu. Sprememba oblike ustavi predvajanje.',
                'The graph is back at the uniform density with \\(n=5\\), \\(K_5=0.00572\\). Drag the height sliders of the base density: the shape is normalized and the sum at the same \\(n\\) is computed again. Try raising a single height or making a step. As long as the variance is finite (here the base density lives on \\([0,1]\\)), the sum approaches the bell again as \\(n\\) grows. Changing the shape stops playback.',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-shape-explanation', 'explanation'), frame('clt-shape-observation', 'observation')],
            observationPrompt: text('Naredi zelo neenakomerno obliko in dodajaj kopije. Se standardizirana vsota še vedno približuje zvonu?', 'Make a very uneven shape and add copies. Does the standardized sum still approach the bell?'),
            expectedObservations: [text('Tudi pri neenakomerni obliki se krivulja z naraščajočim \\(n\\) približuje zvonu; \\(K_n\\) pa je odvisna od oblike in je ni mogoče prebrati kot splošno hitrost.', 'Even for an uneven shape the curve approaches the bell as \\(n\\) grows; \\(K_n\\) depends on the shape and cannot be read as a general rate.')],
            scene: cltScene('clt-shape-start', {example: 'uniform', n: 5},
                'Enakomerna gostota, \\(n=5\\), \\(K_5=0{,}00572\\); višine so proste za vlečenje.',
                'The uniform density, \\(n=5\\), \\(K_5=0.00572\\); the heights are free to drag.'),
        },
        {
            id: 'clt-distance', order: 6,
            title: text('Kaj razdalja pove in česa ne', 'What the distance says and what it does not'),
            purpose: text('Brati Kolmogorovo razdaljo kot lastnost te oblike in tega \\(n\\), ne kot hitrost.', 'Reading the Kolmogorov distance as a property of this shape and this \\(n\\), not as a rate.'),
            explanation: text(
                'Vklopljena je porazdelitvena funkcija; razdalja \\(K_n\\) je največji navpični razmik med njo in funkcijo \\(\\Phi\\). Poševna gostota pri \\(n=10\\) ima \\(K_{10}=0{,}01248\\), enakomerna pri istem \\(n\\) le \\(0{,}00281\\). Izrek (neodvisne, enako porazdeljene spremenljivke s končno varianco; viri: FMF, Verjetnost in Statistika) zagotavlja \\(K_n\\to0\\), ne pa hitrosti; za hitrost obstaja Berry–Esseenov izrek, ki ga tu samo navajamo. Ena številka pri enem \\(n\\) ni hitrost.',
                'The distribution function is switched on; the distance \\(K_n\\) is the largest vertical gap between it and the function \\(\\Phi\\). The skewed density at \\(n=10\\) has \\(K_{10}=0.01248\\), the uniform one at the same \\(n\\) only \\(0.00281\\). The theorem (independent, identically distributed variables with finite variance; sources: FMF, Verjetnost and Statistika) guarantees \\(K_n\\to0\\) but no rate; a rate comes from the Berry–Esseen theorem, which is only cited here. One number at one \\(n\\) is not a rate.',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-distance-explanation', 'explanation'), frame('clt-distance-observation', 'observation')],
            observationPrompt: text('Kako velik je razmik med obema krivuljama pri \\(n=10\\) za poševno in kako za enakomerno gostoto? Kaj lahko iz tega sklepaš o hitrosti?', 'How large is the gap between the two curves at \\(n=10\\) for the skewed and for the uniform density? What can you conclude about the rate?'),
            expectedObservations: [text('Poševna: \\(K_{10}=0{,}01248\\); enakomerna: \\(K_{10}=0{,}00281\\). Poševnost približevanje upočasni, a natančne hitrosti iz teh dveh številk ne razberemo.', 'Skewed: \\(K_{10}=0.01248\\); uniform: \\(K_{10}=0.00281\\). Skewness slows the approach, but these two numbers do not give an exact rate.')],
            scene: cltScene('clt-distance-start', {example: 'skewed', n: 10, cdf: true},
                'Porazdelitvena funkcija poševne gostote pri \\(n=10\\); \\(K_{10}=0{,}01248\\).',
                'The distribution function of the skewed density at \\(n=10\\); \\(K_{10}=0.01248\\).'),
        },
        {
            id: 'clt-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskovati, kako oblika in \\(n\\) vplivata na standardizirano vsoto.', 'Exploring on your own how the shape and \\(n\\) affect the standardized sum.'),
            explanation: text(
                'Graf je spet pri enakomerni gostoti z \\(n=1\\). Izberi primer, spreminjaj višine in \\(n\\) (do \\(30\\)), uporabi Dodaj še eno kopijo, Predvajaj in Ponastavi ter preklapljaj med gostoto in porazdelitveno funkcijo. Poišči obliko, pri kateri je razdalja \\(K_n\\) pri istem \\(n\\) čim večja.',
                'The graph is back at the uniform density with \\(n=1\\). Choose an example, change the heights and \\(n\\) (up to \\(30\\)), use Add one more copy, Play and Reset, and switch between the density and the distribution function. Look for the shape with the largest distance \\(K_n\\) at the same \\(n\\).',
            ),
            formulaIds: ['clt-standardized-sum'],
            frames: [frame('clt-explore-explanation', 'explanation'), frame('clt-explore-observation', 'observation')],
            observationPrompt: text('Katera oblika osnovne gostote najbolj upočasni približevanje in zakaj?', 'Which base shape slows the approach the most, and why?'),
            expectedObservations: [text('Bolj poševne ali bolj neenakomerne oblike imajo pri istem \\(n\\) večjo razdaljo \\(K_n\\); dovolj velik \\(n\\) jo vseeno zmanjša.', 'More skewed or more uneven shapes have a larger distance \\(K_n\\) at the same \\(n\\); a large enough \\(n\\) still reduces it.')],
            scene: cltScene('clt-explore-default', {example: 'uniform'},
                'Enakomerna gostota pri \\(n=1\\); vse je prosto za raziskovanje.',
                'The uniform density at \\(n=1\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'fmf-verjetnost-statistika', citation: 'FMF, Verjetnost in Statistika (university course material): the central limit theorem for independent, identically distributed variables with finite variance.'},
        {id: 'berry-esseen', citation: 'Berry, A. C. (1941) and Esseen, C.-G. (1942): the Berry–Esseen bound on the rate of convergence in the central limit theorem. Cited, not opened.'},
        {
            id: 'bezeg-clt-implementation',
            citation: 'Bezeg source: src/analysis/cltModel.ts and src/graphs/functions/CltGraph.tsx.',
            implementationCorrespondence: 'The base density is a piecewise-linear shape on [0, 1] with five heights, normalized; the sum density is the repeated trapezoid-rule convolution on a grid of step 0.01, renormalized each step; the standardized density and distribution function are compared with the standard normal ones, and the Kolmogorov distance is the largest gap of the distribution functions. A lesson scene chooses an example, adds copies with the animation, sets n and switches the distribution function.',
        },
    ],
    edgeCases: [
        text('\\(n\\) je celo število od \\(1\\) do \\(30\\); višine so nenegativne in vsaj ena mora biti pozitivna, sicer graf obliko zavrne s sporočilom.', '\\(n\\) is an integer from \\(1\\) to \\(30\\); the heights are nonnegative and at least one must be positive, otherwise the graph rejects the shape with a message.'),
        text('Kolmogorova razdalja velja samo za izbrano obliko in izbrani \\(n\\); ne pove, kako hitro se približek izboljšuje.', 'The Kolmogorov distance holds only for the chosen shape and the chosen \\(n\\); it does not say how fast the approximation improves.'),
        text('Izrek zahteva končno varianco; osnovne gostote tega grafa so omejene na \\([0,1]\\), zato je izpolnjena vedno.', 'The theorem needs a finite variance; the base densities of this graph live on \\([0,1]\\), so it always holds.'),
    ],
    unresolvedQuestions: [],
};


const summaryChoice = (name: 'summary-example' | 'summary-rule' | 'summary-sigma', value: string): LessonAction => ({kind: 'function-choice', name, value});
const summaryShow = (target: 'summary-box-plot' | 'summary-sigma-band', visible: boolean): LessonAction => ({kind: 'function-visibility', target, visible});
const summarySet = (index: number, value: number): LessonAction => ({kind: 'summary', operation: 'set-value', index, value});
const summaryAdd = (value: number): LessonAction => ({kind: 'summary', operation: 'add-value', value});

/** Every summary scene starts from the demonstration default (school data, school rule, population sigma, box plot on, band off). */
const summaryScene = (id: string, actions: readonly LessonAction[], sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions: [{kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'}, ...actions],
    expectedState: text(sl, en),
});

const summaryStatistics: GuidedLesson = {
    demonstrationId: 'prob-summary',
    title: text('Aritmetična sredina, mediana in standardni odklon', 'Mean, median and standard deviation'),
    summary: text(
        'Aritmetična sredina se odzove na vsako vrednost, tudi na osamelca; mediana ostane pri sredini vrstnega reda. Standardni odklon meri raztros okoli sredine. Škatla z brki prikaže petštevilski povzetek in označi vrednosti zunaj mej \\(Q_1-1{,}5\\,\\mathrm{IQR}\\) in \\(Q_3+1{,}5\\,\\mathrm{IQR}\\). Lekcija uporablja šolsko pravilo za kvartile (mediana pripada obema polovicama) in populacijski \\(\\sigma\\); kalkulatorji in programi se lahko razlikujejo.',
        'The mean reacts to every value, an outlier included; the median stays at the middle of the order. The standard deviation measures the spread about the mean. The box plot shows the five-number summary and flags values beyond the limits \\(Q_1-1.5\\,\\mathrm{IQR}\\) and \\(Q_3+1.5\\,\\mathrm{IQR}\\). The lesson uses the school quartile rule (the median belongs to both halves) and the population \\(\\sigma\\); calculators and software may differ.',
    ),
    prerequisites: [
        text('Potrebna je le aritmetika; pojme iz mature (aritmetična sredina, mediana, kvartili) lekcija ponovi.', 'Only arithmetic is needed; the lesson recalls the matura vocabulary (mean, median, quartiles).'),
    ],
    learningGoals: [
        text('Razložiš, da se aritmetična sredina premakne z vsako vrednostjo, mediana pa ostane, dokler vrednost ne prečka mesta v vrstnem redu.', 'Explain that the mean moves with every value while the median stays until a value crosses its rank.'),
        text('Poveš, da standardni odklon meri raztros okoli sredine in da populacijska in vzorčna različica delita z različnim imenovalcem.', 'State that the standard deviation measures spread about the mean and that the population and sample versions divide by different denominators.'),
        text('Prebereš škatlo z brki in poveš, da je »osamelec« tu dogovor (zunaj mej \\(1{,}5\\) medčetrtinskega razmika), ne matematična lastnost.', 'Read a box plot and state that "outlier" here is a convention (beyond the \\(1.5\\) IQR fences), not a mathematical property.'),
        text('Poveš, da je izbira pravila za kvartile del odgovora.', 'State that the choice of quartile rule is part of the answer.'),
    ],
    formulaBlocks: [
        {
            id: 'summary-definitions',
            latex: '\\bar x=\\frac1n\\sum_{i=1}^n x_i,\\qquad \\sigma=\\sqrt{\\frac1n\\sum_{i=1}^n(x_i-\\bar x)^2},\\qquad s=\\sqrt{\\frac1{n-1}\\sum_{i=1}^n(x_i-\\bar x)^2},\\qquad \\mathrm{IQR}=Q_3-Q_1',
            notation: text(
                '\\(\\bar x\\) je aritmetična sredina, \\(\\sigma\\) populacijski in \\(s\\) vzorčni standardni odklon, \\(Q_1\\) in \\(Q_3\\) prvi in tretji kvartil, \\(\\mathrm{IQR}\\) medčetrtinski razmik.',
                '\\(\\bar x\\) is the mean, \\(\\sigma\\) the population and \\(s\\) the sample standard deviation, \\(Q_1\\) and \\(Q_3\\) the first and third quartile, \\(\\mathrm{IQR}\\) the interquartile range.',
            ),
            explanation: text(
                'Mediana in kvartili sledijo vrstnemu redu, zato se ne spremenijo, če vrednost spremenimo, ne da bi prečkala svoj rang. Pri šolskem pravilu pri lihem \\(n\\) mediana pripada obema polovicama, pri drugem pravilu je iz obeh izpuščena. Vrednost je osamelec, če je \\(x>Q_3+1{,}5\\,\\mathrm{IQR}\\) ali \\(x<Q_1-1{,}5\\,\\mathrm{IQR}\\); to je dogovor.',
                'The median and the quartiles follow the order, so they do not change when a value changes without crossing its rank. In the school rule the median belongs to both halves for odd \\(n\\); in the other rule it is left out of both. A value is an outlier if \\(x>Q_3+1.5\\,\\mathrm{IQR}\\) or \\(x<Q_1-1.5\\,\\mathrm{IQR}\\); this is a convention.',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'summary-markers', order: 1,
            title: text('Vrednosti, sredina in mediana', 'Values, mean and median'),
            purpose: text('Prebrati aritmetično sredino in mediano šolskega primera ter napovedati, kaj se zgodi, če največjo vrednost premaknemo v desno.', 'Reading the mean and median of the school data and predicting what happens if the largest value moves right.'),
            explanation: text(
                'Sedem vrednosti \\(4,5,5,6,6,7,8\\) je narisanih kot pike na osi. Aritmetična sredina (trikotnik) je \\(5{,}857143\\), mediana (kvadrat) je \\(6\\). Napovej: kaj se zgodi z vsako od njiju, če največjo vrednost \\(8\\) premakneš daleč v desno?',
                'Seven values \\(4,5,5,6,6,7,8\\) are drawn as dots on an axis. The mean (triangle) is \\(5.857143\\), the median (square) is \\(6\\). Predict: what happens to each of them if you move the largest value \\(8\\) far to the right?',
            ),
            formulaIds: ['summary-definitions'],
            frames: [frame('summary-markers-explanation', 'explanation'), frame('summary-markers-observation', 'observation')],
            observationPrompt: text('Kje na osi sta trikotnik in kvadrat in zakaj nista na istem mestu?', 'Where on the axis are the triangle and the square, and why are they not at the same place?'),
            expectedObservations: [text('Sredina je \\(5{,}857143\\), mediana \\(6\\); mediana je sredina vrstnega reda, aritmetična sredina je ravnotežje vseh vrednosti.', 'The mean is \\(5.857143\\), the median \\(6\\); the median is the middle of the order, the mean balances all the values.')],
            scene: summaryScene('summary-markers-start', [summaryShow('summary-box-plot', false), summaryShow('summary-sigma-band', false)],
                'Šolski primer brez škatle z brki; sredina \\(5{,}857143\\), mediana \\(6\\).',
                'The school data without the box plot; mean \\(5.857143\\), median \\(6\\).'),
        },
        {
            id: 'summary-move', order: 2,
            title: text('Največja vrednost se premakne', 'The largest value moves'),
            purpose: text('Videti, da aritmetična sredina sledi vrednosti, mediana pa ostane.', 'Seeing that the mean follows the value while the median stays.'),
            explanation: text(
                'Vrednost \\(8\\) je zdaj \\(30\\); pogled se je prilagodil. Aritmetična sredina se je premaknila na \\(9\\), mediana je ostala \\(6\\), ker se vrstni red ni spremenil. Populacijski standardni odklon je zrasel na \\(8{,}6189\\). Povleci to piko sam in opazuj trikotnik in kvadrat.',
                'The value \\(8\\) is now \\(30\\); the view has refitted. The mean has moved to \\(9\\), the median stayed \\(6\\) because the order did not change. The population standard deviation grew to \\(8.6189\\). Drag that dot yourself and watch the triangle and the square.',
            ),
            formulaIds: ['summary-definitions'],
            frames: [frame('summary-move-explanation', 'explanation'), frame('summary-move-observation', 'observation')],
            observationPrompt: text('Kaj se zgodi z mediano, če to piko vlečeš naprej v desno? Kaj, če jo vlečeš pod \\(6\\)?', 'What happens to the median if you keep dragging this dot right? What if you drag it below \\(6\\)?'),
            expectedObservations: [text('Sredina je \\(9\\), mediana \\(6\\). Mediana se spremeni šele, ko pika prečka mesto v vrstnem redu.', 'The mean is \\(9\\), the median \\(6\\). The median changes only once the dot crosses its rank.')],
            scene: summaryScene('summary-move-start', [summaryShow('summary-box-plot', false), summarySet(6, 30)],
                'Največja vrednost je \\(30\\); sredina \\(9\\), mediana \\(6\\), \\(\\sigma=8{,}6189\\).',
                'The largest value is \\(30\\); mean \\(9\\), median \\(6\\), \\(\\sigma=8.6189\\).'),
        },
        {
            id: 'summary-box', order: 3,
            title: text('Škatla z brki in osamelec', 'The box plot and the outlier'),
            purpose: text('Prebrati kvartile, medčetrtinski razmik in meji ter videti označenega osamelca.', 'Reading the quartiles, the interquartile range and the fences, and seeing a flagged outlier.'),
            explanation: text(
                'Škatla z brki je vklopljena. Po šolskem pravilu je \\(Q_1=5\\), \\(Q_3=6{,}5\\) in \\(\\mathrm{IQR}=1{,}5\\); kvartili se zaradi premika vrednosti \\(8\\) na \\(30\\) niso spremenili. Meji osamelcev sta \\(2{,}75\\) in \\(8{,}75\\). Vrednost \\(30\\) leži zunaj zgornje meje in je označena z rombom. Osamelec tu pomeni le zunaj mej \\(1{,}5\\) medčetrtinskega razmika: to je dogovor, ne matematična lastnost.',
                'The box plot is on. By the school rule \\(Q_1=5\\), \\(Q_3=6.5\\) and \\(\\mathrm{IQR}=1.5\\); moving \\(8\\) to \\(30\\) did not change the quartiles. The fences are \\(2.75\\) and \\(8.75\\). The value \\(30\\) lies beyond the upper fence and is marked with a diamond. Here "outlier" only means beyond the \\(1.5\\) IQR fences: it is a convention, not a mathematical property.',
            ),
            formulaIds: ['summary-definitions'],
            frames: [frame('summary-box-explanation', 'explanation'), frame('summary-box-observation', 'observation')],
            observationPrompt: text('Kje se konča desni brk in zakaj ne pri \\(30\\)? Premakni piko \\(30\\) nazaj proti \\(8\\) in poglej, kdaj izgine oznaka.', 'Where does the right whisker end and why not at \\(30\\)? Move the dot \\(30\\) back towards \\(8\\) and see when the flag disappears.'),
            expectedObservations: [text('Brk se konča pri največji vrednosti znotraj meje; \\(30\\) je večja od \\(8{,}75\\) in je označena posebej.', 'The whisker ends at the largest value inside the fence; \\(30\\) is greater than \\(8.75\\) and is marked separately.')],
            scene: summaryScene('summary-box-start', [summaryShow('summary-box-plot', true), summarySet(6, 30)],
                'Škatla z brki; \\(Q_1=5\\), \\(Q_3=6{,}5\\), meji \\(2{,}75\\) in \\(8{,}75\\), osamelec \\(30\\).',
                'The box plot; \\(Q_1=5\\), \\(Q_3=6.5\\), fences \\(2.75\\) and \\(8.75\\), outlier \\(30\\).'),
        },
        {
            id: 'summary-spread', order: 4,
            title: text('Raztros okoli sredine', 'The spread about the mean'),
            purpose: text('Videti standardni odklon kot pas okoli sredine in kako ga poveča oddaljena vrednost.', 'Seeing the standard deviation as a band about the mean and how a far value enlarges it.'),
            explanation: text(
                'Pas okoli sredine je vklopljen in je širok \\(\\pm\\sigma\\). Pred dodatkom je bil \\(\\sigma=8{,}6189\\) pri \\(n=7\\). Dodana je še vrednost \\(20\\), daleč od sredine: zdaj je \\(n=8\\), sredina \\(10{,}375\\), mediana še vedno \\(6\\) in \\(\\sigma=8{,}845\\). Odklon je tako kot sredina občutljiv na oddaljene vrednosti, mediana pa ne.',
                'The band about the mean is on and is \\(\\pm\\sigma\\) wide. Before the addition \\(\\sigma=8.6189\\) at \\(n=7\\). A value \\(20\\), far from the mean, has been added: now \\(n=8\\), the mean is \\(10.375\\), the median is still \\(6\\) and \\(\\sigma=8.845\\). Like the mean, the deviation is sensitive to far values; the median is not.',
            ),
            formulaIds: ['summary-definitions'],
            frames: [frame('summary-spread-explanation', 'explanation'), frame('summary-spread-observation', 'observation')],
            observationPrompt: text('Dodaj še eno vrednost blizu sredine. Se pas razširi ali zoži?', 'Add one more value near the mean. Does the band widen or narrow?'),
            expectedObservations: [text('Vrednost blizu sredine pas zoži, oddaljena ga razširi; sredina je zdaj \\(10{,}375\\).', 'A value near the mean narrows the band, a far one widens it; the mean is now \\(10.375\\).')],
            scene: summaryScene('summary-spread-start', [summarySet(6, 30), summaryShow('summary-sigma-band', true), summaryAdd(20)],
                'Pas \\(\\pm\\sigma\\) okoli sredine; \\(n=8\\), sredina \\(10{,}375\\), mediana \\(6\\), \\(\\sigma=8{,}845\\).',
                'The band \\(\\pm\\sigma\\) about the mean; \\(n=8\\), mean \\(10.375\\), median \\(6\\), \\(\\sigma=8.845\\).'),
        },
        {
            id: 'summary-convention', order: 5,
            title: text('Dogovor: isti podatki, dve pravili', 'Convention: the same data, two rules'),
            purpose: text('Videti, da pravilo za kvartile spremeni škatlo, in poimenovati dogovore lekcije.', 'Seeing that the quartile rule changes the box, and naming the lesson\'s conventions.'),
            explanation: text(
                'Šolski podatki so spet \\(4,5,5,6,6,7,8\\). Lekcija uporablja šolsko pravilo (mediana pripada obema polovicama): \\(Q_1=5\\), \\(Q_3=6{,}5\\), \\(\\mathrm{IQR}=1{,}5\\), in populacijski \\(\\sigma=1{,}2454\\) (vzorčni \\(s=1{,}3452\\)). Zdaj je izbrano pravilo brez mediane: \\(Q_1=5\\), \\(Q_3=7\\), \\(\\mathrm{IQR}=2\\). Isti podatki, drugačna škatla. Kalkulatorji in programi uporabljajo različna pravila, zato je ime pravila del odgovora; osamelec je tu vrednost zunaj mej \\(1{,}5\\) medčetrtinskega razmika, kar je dogovor.',
                'The school data are \\(4,5,5,6,6,7,8\\) again. The lesson uses the school rule (the median belongs to both halves): \\(Q_1=5\\), \\(Q_3=6.5\\), \\(\\mathrm{IQR}=1.5\\), and the population \\(\\sigma=1.2454\\) (sample \\(s=1.3452\\)). Now the rule without the median is chosen: \\(Q_1=5\\), \\(Q_3=7\\), \\(\\mathrm{IQR}=2\\). The same data, a different box. Calculators and software use different rules, so the rule\'s name is part of the answer; here an outlier is a value beyond the \\(1.5\\) IQR fences, which is a convention.',
            ),
            formulaIds: ['summary-definitions'],
            frames: [frame('summary-convention-explanation', 'explanation'), frame('summary-convention-observation', 'observation')],
            observationPrompt: text('Preklopi med pravili in primerjaj \\(Q_3\\). Kaj se zgodi s \\(Q_1\\)?', 'Switch between the rules and compare \\(Q_3\\). What happens to \\(Q_1\\)?'),
            expectedObservations: [text('Pri obeh pravilih je \\(Q_1=5\\); \\(Q_3\\) je \\(6{,}5\\) ali \\(7\\), razmik \\(1{,}5\\) ali \\(2\\).', 'Under both rules \\(Q_1=5\\); \\(Q_3\\) is \\(6.5\\) or \\(7\\), the range \\(1.5\\) or \\(2\\).')],
            scene: summaryScene('summary-convention-start', [summaryChoice('summary-example', 'school'), summaryChoice('summary-rule', 'exclusive')],
                'Šolski podatki, pravilo brez mediane: \\(Q_1=5\\), \\(Q_3=7\\), \\(\\mathrm{IQR}=2\\).',
                'The school data under the rule without the median: \\(Q_1=5\\), \\(Q_3=7\\), \\(\\mathrm{IQR}=2\\).'),
        },
        {
            id: 'summary-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno dodajati, odstranjevati in premikati vrednosti.', 'Adding, removing and moving values on your own.'),
            explanation: text(
                'Graf je spet pri šolskem primeru: \\(n=7\\), sredina \\(5{,}857143\\), mediana \\(6\\). Dodaj in odstrani vrednosti (od \\(1\\) do \\(15\\)), vleci pike ali jih vpiši, preklopi pravilo, vrsto odklona in prikaz. Pri sodem številu vrednosti je mediana povprečje srednjih dveh; poskusi primer »Sodo število vrednosti«. Poišči podatke, pri katerih se sredina in mediana čim bolj razlikujeta.',
                'The graph is back at the school data: \\(n=7\\), mean \\(5.857143\\), median \\(6\\). Add and remove values (from \\(1\\) to \\(15\\)), drag the dots or type them, switch the rule, the kind of deviation and the display. For an even number of values the median is the mean of the middle two; try the example "Even number of values". Look for data where the mean and the median differ the most.',
            ),
            formulaIds: ['summary-definitions'],
            frames: [frame('summary-explore-explanation', 'explanation'), frame('summary-explore-observation', 'observation')],
            observationPrompt: text('Kdaj sta sredina in mediana enaki in kdaj zelo različni?', 'When are the mean and the median equal and when are they very different?'),
            expectedObservations: [text('Pri simetričnih podatkih sta enaki; osamelec ju razmakne, ker premakne le sredino.', 'For symmetric data they are equal; an outlier separates them because it moves only the mean.')],
            scene: summaryScene('summary-explore-default', [],
                'Šolski primer: \\(n=7\\), sredina \\(5{,}857143\\), mediana \\(6\\); vse je prosto za raziskovanje.',
                'The school data: \\(n=7\\), mean \\(5.857143\\), median \\(6\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'matura-statistics', citation: 'Matura catalogue, mathematics, section 4.17 (descriptive statistics: mean, median, quartiles).'},
        {id: 'tukey-eda', citation: 'Tukey, J. W. Exploratory Data Analysis (1977): the box plot and the 1.5 IQR fences. Cited, not opened.'},
        {
            id: 'bezeg-summary-implementation',
            citation: 'Bezeg source: src/analysis/summaryStatisticsModel.ts and src/graphs/functions/SummaryStatisticsGraph.tsx; ADR 0027 decision 4.',
            implementationCorrespondence: 'The values are integer tenths; the quartiles, the fences and the outlier test are computed on integer tenths so ties and comparisons are exact; the mean and the standard deviation are floating point and shown to the stated digits. A lesson scene sets or adds a value (a value outside the view refits it), chooses the example, the quartile rule and the kind of deviation, and shows or hides the box plot and the deviation band.',
        },
    ],
    edgeCases: [
        text('Vrednosti je od \\(1\\) do \\(15\\), vsaka od \\(0\\) do \\(40\\) na desetinko natančno; škatla z brki potrebuje vsaj \\(3\\) vrednosti.', 'There are \\(1\\) to \\(15\\) values, each from \\(0\\) to \\(40\\) to the nearest tenth; the box plot needs at least \\(3\\) values.'),
        text('Standardni odklon ene vrednosti je \\(0\\), vzorčni pa ni definiran in se izpiše kot pomišljaj.', 'The standard deviation of one value is \\(0\\) and the sample version is undefined, shown as a dash.'),
        text('Osamelec je dogovor: drugačno pravilo ali drug faktor mej bi označil druge vrednosti.', 'An outlier is a convention: a different rule or a different fence factor would flag different values.'),
    ],
    unresolvedQuestions: [],
};

const correlationChoice = (value: 'default' | 'outlier' | 'parabola' | 'parabola-right' | 'ring'): LessonAction => ({kind: 'function-choice', name: 'correlation-example', value});
const correlationShow = (target: 'correlation-residuals' | 'correlation-x-on-y', visible: boolean): LessonAction => ({kind: 'function-visibility', target, visible});
const correlationSetPoint = (index: number, x: number, y: number): LessonAction => ({kind: 'correlation', operation: 'set-point', index, x, y});

/** Every correlation scene starts from the demonstration default (the data of I4, residuals shown, the line of x on y hidden). */
const correlationScene = (id: string, actions: readonly LessonAction[], sl: string, en: string): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions: [{kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'}, ...actions],
    expectedState: text(sl, en),
});

const correlationLesson: GuidedLesson = {
    demonstrationId: 'prob-correlation',
    title: text('Korelacija in regresijska premica', 'Correlation and the regression line'),
    summary: text(
        'Razsevni diagram pokaže, ali se točke vrstijo ob premici. Korelacijski koeficient \\(r\\) to strne v eno število med \\(-1\\) in \\(1\\), a meri le linearno povezanost: \\(r=0\\) ne pomeni neodvisnosti, velik \\(|r|\\) ne pomeni vzročnosti in en sam osamelec lahko \\(r\\) bistveno spremeni. Regresijska premica je premica po metodi najmanjših kvadratov iz lekcije o prileganju; da so navpični ostanki kvadrirani, je modelska izbira.',
        'A scatter plot shows whether the points line up along a line. The correlation coefficient \\(r\\) condenses this into one number between \\(-1\\) and \\(1\\), but it measures linear association only: \\(r=0\\) does not mean independence, a large \\(|r|\\) does not mean causation, and a single outlier can change \\(r\\) a lot. The regression line is the least-squares line of the fitting lesson; squaring the vertical residuals is a modelling choice.',
    ),
    prerequisites: [
        text('Aritmetična sredina in standardni odklon iz lekcije o povzetkih podatkov; prileganje po metodi najmanjših kvadratov in ostanki iz lekcije o prileganju; linearna funkcija.', 'The mean and the standard deviation from the summary lesson; least squares and residuals from the fitting lesson; the linear function.'),
    ],
    learningGoals: [
        text('Poveš, da korelacijski koeficient \\(r\\) meri samo linearno povezanost: \\(\\pm1\\) je le za točke na premici, za popolno krivuljo pa je lahko \\(0\\).', 'State that the correlation coefficient \\(r\\) measures linear association only: it is \\(\\pm1\\) only for points on a line, and it can be \\(0\\) for a perfect curve.'),
        text('Razložiš, da en osamelec premakne \\(r\\) in regresijsko premico ter da velik \\(|r|\\) ne pomeni vzročnosti.', 'Explain that one outlier moves \\(r\\) and the regression line, and that a large \\(|r|\\) does not mean causation.'),
        text('Poveš, da sta regresijski premici za \\(y\\) in za \\(x\\) različni, razen če je \\(r=\\pm1\\).', 'State that the regression lines of \\(y\\) on \\(x\\) and of \\(x\\) on \\(y\\) differ unless \\(r=\\pm1\\).'),
        text('Prebereš smer povezave iz razsevnega diagrama in predznaka naklona; to zadošča za matursko »preprosto povezavo«, sam \\(r\\) pa je univerzitetna razširitev.', 'Read the direction of the association from the scatter plot and the sign of the slope; this is what the matura "simple relations" goal needs, while \\(r\\) itself is a university-level extension.'),
    ],
    formulaBlocks: [
        {
            id: 'correlation-definitions',
            latex: 'r=\\frac{S_{xy}}{\\sqrt{S_{xx}\\,S_{yy}}},\\qquad y=a+bx,\\quad b=\\frac{S_{xy}}{S_{xx}}=r\\,\\frac{s_y}{s_x},\\qquad b_{y\\mid x}\\,b_{x\\mid y}=r^2',
            notation: text(
                '\\(S_{xx}\\), \\(S_{yy}\\) in \\(S_{xy}\\) so vsote kvadratov odklonov in produktov odklonov od sredin, \\(r\\) je korelacijski koeficient, \\(b\\) naklon in \\(a\\) začetna vrednost regresijske premice, \\(b_{x\\mid y}\\) naklon premice za \\(x\\) v odvisnosti od \\(y\\), \\(s_x\\) in \\(s_y\\) standardna odklona.',
                '\\(S_{xx}\\), \\(S_{yy}\\) and \\(S_{xy}\\) are the sums of squared deviations and of products of deviations from the means, \\(r\\) is the correlation coefficient, \\(b\\) the slope and \\(a\\) the intercept of the regression line, \\(b_{x\\mid y}\\) the slope of the line of \\(x\\) on \\(y\\), \\(s_x\\) and \\(s_y\\) the standard deviations.',
            ),
            explanation: text(
                'Če je \\(S_{xy}=0\\), je \\(r=0\\), tudi kadar je \\(y\\) funkcija od \\(x\\). Regresijska premica minimizira vsoto kvadratov navpičnih ostankov, premica za \\(x\\) pa vodoravnih; zmnožek obeh naklonov je \\(r^2\\), zato se premici ujemata le pri \\(r=\\pm1\\). Kvadriranje ostankov je modelska izbira, ne geometrijska razdalja.',
                'If \\(S_{xy}=0\\) then \\(r=0\\), even when \\(y\\) is a function of \\(x\\). The regression line minimises the sum of squared vertical residuals and the line of \\(x\\) on \\(y\\) the horizontal ones; the product of the two slopes is \\(r^2\\), so the lines coincide only for \\(r=\\pm1\\). Squaring the residuals is a modelling choice, not a geometric distance.',
            ),
        },
    ],
    workedExamples: [],
    steps: [
        {
            id: 'correlation-scatter', order: 1,
            title: text('Razsevni diagram', 'The scatter plot'),
            purpose: text('Pogledati točke in napovedati predznak in velikost korelacijskega koeficienta.', 'Looking at the points and predicting the sign and size of the correlation coefficient.'),
            explanation: text(
                'Štiri točke \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) so narisane kot razsevni diagram, ostankov še ni. Točke se v povprečju dvigajo. Napovej: ali je korelacijski koeficient \\(r\\) pozitiven ali negativen in ali je blizu \\(0\\) ali blizu \\(1\\)? Za preprosto povezavo, kot jo zahteva matura, zadošča že pogled na diagram in predznak naklona; \\(r\\) je univerzitetna razširitev.',
                'The four points \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) are drawn as a scatter plot, with no residuals yet. The points rise on average. Predict: is the correlation coefficient \\(r\\) positive or negative, and is it near \\(0\\) or near \\(1\\)? For a simple relation, as the matura asks, looking at the plot and the sign of the slope is enough; \\(r\\) is a university-level extension.',
            ),
            formulaIds: ['correlation-definitions'],
            frames: [frame('correlation-scatter-explanation', 'explanation'), frame('correlation-scatter-observation', 'observation')],
            observationPrompt: text('Ali točke ležijo ob premici, ki se dviga ali pada? Kako tesno?', 'Do the points lie along a rising or a falling line? How tightly?'),
            expectedObservations: [text('Točke se dvigajo in ležijo precej tesno ob premici, zato pričakujemo pozitiven \\(r\\) blizu \\(1\\).', 'The points rise and lie fairly close to a line, so we expect a positive \\(r\\) near \\(1\\).')],
            scene: correlationScene('correlation-scatter-start', [correlationShow('correlation-residuals', false), correlationShow('correlation-x-on-y', false)],
                'Razsevni diagram štirih točk, brez ostankov in druge premice.',
                'A scatter plot of four points, without residuals and the second line.'),
        },
        {
            id: 'correlation-line', order: 2,
            title: text('Korelacijski koeficient in regresijska premica', 'The correlation coefficient and the regression line'),
            purpose: text('Prebrati \\(r\\), regresijsko premico in ostanke ter primerjati z napovedjo.', 'Reading \\(r\\), the regression line and the residuals, and comparing with the prediction.'),
            explanation: text(
                'Ostanki so prikazani. Korelacijski koeficient je \\(r=0{,}92338\\), regresijska premica je \\(y=0{,}9x+0{,}9\\) in vsota kvadratov ostankov je \\(0{,}7\\). To je ista premica po metodi najmanjših kvadratov kot v lekciji o prileganju. Navpični ostanki so kvadrirani, ker smo se tako odločili (modelska izbira), ne zato, ker bi bila to edina razdalja do premice. Naklon je pozitiven, zato je tudi \\(r\\) pozitiven.',
                'The residuals are shown. The correlation coefficient is \\(r=0.92338\\), the regression line is \\(y=0.9x+0.9\\) and the sum of squared residuals is \\(0.7\\). This is the same least-squares line as in the fitting lesson. The vertical residuals are squared because we chose so (a modelling choice), not because it is the only distance to a line. The slope is positive, so \\(r\\) is positive too.',
            ),
            formulaIds: ['correlation-definitions'],
            frames: [frame('correlation-line-explanation', 'explanation'), frame('correlation-line-observation', 'observation')],
            observationPrompt: text('Se je napoved ujemala? Kateri ostanek je največji?', 'Did the prediction match? Which residual is the largest?'),
            expectedObservations: [text('Koeficient \\(r=0{,}92338\\) je blizu \\(1\\); premica \\(y=0{,}9x+0{,}9\\) ima vsoto kvadratov ostankov \\(0{,}7\\).', 'The coefficient \\(r=0.92338\\) is near \\(1\\); the line \\(y=0.9x+0.9\\) has a sum of squared residuals \\(0.7\\).')],
            scene: correlationScene('correlation-line-start', [correlationShow('correlation-residuals', true)],
                'Ostanki prikazani; \\(r=0{,}92338\\), \\(y=0{,}9x+0{,}9\\), vsota kvadratov ostankov \\(0{,}7\\).',
                'Residuals shown; \\(r=0.92338\\), \\(y=0.9x+0.9\\), sum of squared residuals \\(0.7\\).'),
        },
        {
            id: 'correlation-outlier', order: 3,
            title: text('En osamelec', 'One outlier'),
            purpose: text('Videti, da ena sama točka premakne korelacijski koeficient in regresijsko premico.', 'Seeing that a single point moves the correlation coefficient and the regression line.'),
            explanation: text(
                'Točka \\((3,4)\\) je zdaj \\((3,8)\\); pogled se je prilagodil. Korelacijski koeficient je padel z \\(0{,}92338\\) na \\(0{,}84680\\), premica je \\(y=2{,}1x+0{,}1\\) in vsota kvadratov ostankov je zrasla na \\(8{,}7\\). Ena sama točka torej bistveno spremeni \\(r\\) in premico. Povleci to točko sam in opazuj, kako se premakneta \\(r\\) in premica.',
                'The point \\((3,4)\\) is now \\((3,8)\\); the view has refitted. The correlation coefficient dropped from \\(0.92338\\) to \\(0.84680\\), the line is \\(y=2.1x+0.1\\) and the sum of squared residuals grew to \\(8.7\\). A single point thus changes \\(r\\) and the line a lot. Drag this point yourself and watch how \\(r\\) and the line move.',
            ),
            formulaIds: ['correlation-definitions'],
            frames: [frame('correlation-outlier-explanation', 'explanation'), frame('correlation-outlier-observation', 'observation')],
            observationPrompt: text('Kam povlečeš točko, da se \\(r\\) spet poveča? Se spremeni naklon premice?', 'Where do you drag the point so that \\(r\\) grows again? Does the slope of the line change?'),
            expectedObservations: [text('Z osamelcem je \\(r=0{,}84680\\) in \\(y=2{,}1x+0{,}1\\); vsota kvadratov ostankov \\(8{,}7\\) kaže, da se premica slabše prilega.', 'With the outlier \\(r=0.84680\\) and \\(y=2.1x+0.1\\); the sum of squared residuals \\(8.7\\) shows the line fits worse.')],
            scene: correlationScene('correlation-outlier-start', [correlationSetPoint(3, 3, 8)],
                'Točka \\((3,8)\\); \\(r=0{,}84680\\), \\(y=2{,}1x+0{,}1\\), vsota kvadratov ostankov \\(8{,}7\\).',
                'The point \\((3,8)\\); \\(r=0.84680\\), \\(y=2.1x+0.1\\), sum of squared residuals \\(8.7\\).'),
        },
        {
            id: 'correlation-parabola', order: 4,
            title: text('Popolna krivulja, a \\(r=0\\)', 'A perfect curve, yet \\(r=0\\)'),
            purpose: text('Videti, da korelacijski koeficient ne zazna nelinearne odvisnosti.', 'Seeing that the correlation coefficient does not detect a nonlinear dependence.'),
            explanation: text(
                'Točke ležijo na paraboli \\(y=x^2\\) pri \\(x=-3,\\dots,3\\). Vsaka vrednost \\(y\\) je natančno določena z \\(x\\), a je \\(r=0\\) in regresijska premica je vodoravna \\(y=4\\). Korelacijski koeficient meri samo linearno povezanost, zato \\(r=0\\) ne pomeni neodvisnosti. Obratno velja podobno: velik \\(|r|\\) ne pomeni vzročnosti, pove le, da se podatki vrstijo ob premici.',
                'The points lie on the parabola \\(y=x^2\\) at \\(x=-3,\\dots,3\\). Every \\(y\\) is fully determined by \\(x\\), yet \\(r=0\\) and the regression line is the horizontal \\(y=4\\). The correlation coefficient measures linear association only, so \\(r=0\\) does not mean independence. The converse is similar: a large \\(|r|\\) does not mean causation, it only says the data line up along a line.',
            ),
            formulaIds: ['correlation-definitions'],
            frames: [frame('correlation-parabola-explanation', 'explanation'), frame('correlation-parabola-observation', 'observation')],
            observationPrompt: text('Zakaj je \\(r\\) natanko \\(0\\), čeprav je \\(y\\) funkcija od \\(x\\)? Kaj pokažeta levi in desni del parabole?', 'Why is \\(r\\) exactly \\(0\\) although \\(y\\) is a function of \\(x\\)? What do the left and the right half of the parabola show?'),
            expectedObservations: [text('Levi in desni del se izravnata: \\(S_{xy}=0\\), zato \\(r=0\\), a odvisnost je popolna.', 'The left and right halves cancel: \\(S_{xy}=0\\), so \\(r=0\\), yet the dependence is perfect.')],
            scene: correlationScene('correlation-parabola-start', [correlationChoice('parabola')],
                'Parabola \\(y=x^2\\) pri \\(x=-3,\\dots,3\\); \\(r=0\\), \\(y=4\\).',
                'The parabola \\(y=x^2\\) at \\(x=-3,\\dots,3\\); \\(r=0\\), \\(y=4\\).'),
        },
        {
            id: 'correlation-x-on-y', order: 5,
            title: text('Premica za \\(x\\) v odvisnosti od \\(y\\)', 'The line of \\(x\\) on \\(y\\)'),
            purpose: text('Videti, da sta regresijski premici različni, in kako ju povezuje \\(r\\).', 'Seeing that the two regression lines differ, and how \\(r\\) links them.'),
            explanation: text(
                'Spet so prvotni podatki. Črtkana premica minimizira vodoravne ostanke: \\(x=0{,}94737y-0{,}63158\\). Naklon prve premice \\(0{,}9\\) in naklon druge \\(0{,}94737\\) (kot \\(x\\) na \\(y\\)) se zmnožita v \\(r^2=0{,}852632\\). Ker je zmnožek manjši od \\(1\\), premici nista ista; ujemata se le pri \\(r=\\pm1\\). Katera premica je prava, je odvisno od vprašanja, kaj napovedujemo.',
                'The original data are back. The dashed line minimises the horizontal residuals: \\(x=0.94737y-0.63158\\). The slope \\(0.9\\) of the first line and the slope \\(0.94737\\) of the second (as \\(x\\) on \\(y\\)) multiply to \\(r^2=0.852632\\). Since the product is below \\(1\\), the lines differ; they coincide only for \\(r=\\pm1\\). Which line is right depends on what we want to predict.',
            ),
            formulaIds: ['correlation-definitions'],
            frames: [frame('correlation-x-on-y-explanation', 'explanation'), frame('correlation-x-on-y-observation', 'observation')],
            observationPrompt: text('Povleci točke bliže premici. Kaj se zgodi z obema premicama?', 'Drag the points closer to a line. What happens to the two lines?'),
            expectedObservations: [text('Premici se približujeta, ko se \\(r\\) bliža \\(\\pm1\\); zmnožek naklonov je \\(r^2=0{,}852632\\).', 'The lines approach each other as \\(r\\) nears \\(\\pm1\\); the product of the slopes is \\(r^2=0.852632\\).')],
            scene: correlationScene('correlation-x-on-y-start', [correlationShow('correlation-x-on-y', true)],
                'Prvotni podatki, druga premica prikazana: \\(x=0{,}94737y-0{,}63158\\).',
                'The original data with the second line shown: \\(x=0.94737y-0.63158\\).'),
        },
        {
            id: 'correlation-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno raziskati druge primere in ugotoviti, kaj \\(r\\) pove in česa ne.', 'Exploring other examples on your own and finding what \\(r\\) tells and what it does not.'),
            explanation: text(
                'Graf je spet pri prvotnih podatkih. Preizkusi primere »parabola desno od ničle«, »krog osmih točk« in »primer z osamelcem«, vleci točke ali jih vpiši, dodaj in odstrani točke (od \\(2\\) do \\(20\\)). Če imajo vse točke isti \\(x\\) ali isti \\(y\\), korelacijski koeficient ni določen, pri manj kot \\(3\\) točkah pa ne pove ničesar. Poišči podatke, pri katerih je \\(r\\) velik, a ne bi smeli sklepati, da ena količina povzroča drugo.',
                'The graph is back at the original data. Try the examples "parabola right of zero", "ring of eight points" and "example with an outlier", drag the points or type them, add and remove points (from \\(2\\) to \\(20\\)). When all points have the same \\(x\\) or the same \\(y\\) the correlation coefficient is undefined, and for fewer than \\(3\\) points it tells nothing. Look for data where \\(r\\) is large but you should not conclude that one quantity causes the other.',
            ),
            formulaIds: ['correlation-definitions'],
            frames: [frame('correlation-explore-explanation', 'explanation'), frame('correlation-explore-observation', 'observation')],
            observationPrompt: text('Kdaj je \\(r=0\\) in kdaj je velik, čeprav je odvisnost krivulja?', 'When is \\(r=0\\) and when is it large although the dependence is a curve?'),
            expectedObservations: [text('Parabola na obeh straneh ničle in krog dasta \\(r=0\\); parabola samo desno od ničle ima velik \\(r\\), čeprav ni premica.', 'The two-sided parabola and the ring give \\(r=0\\); the parabola right of zero has a large \\(r\\) although it is not a line.')],
            scene: correlationScene('correlation-explore-default', [],
                'Prvotni podatki: \\(r=0{,}92338\\), \\(y=0{,}9x+0{,}9\\); vse je prosto za raziskovanje.',
                'The original data: \\(r=0.92338\\), \\(y=0.9x+0.9\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'matura-statistics', citation: 'Matura catalogue, mathematics, section 4.17 (simple relations between data); the correlation coefficient itself is outside the matura.'},
        {
            id: 'bezeg-correlation-implementation',
            citation: 'Bezeg source: src/analysis/correlationModel.ts and src/graphs/functions/CorrelationGraph.tsx; the least-squares kernel of lesson I4.',
            implementationCorrespondence: 'The coordinates are integer tenths; the sums behind r are integers, so S_xy = 0 is detected exactly and r = 0 is exactly 0 for the parabola and the ring; r itself is floating point. A lesson scene sets a point (a point outside the view refits it), chooses the example and shows or hides the residuals and the line of x on y.',
        },
    ],
    edgeCases: [
        text('Točk je od \\(2\\) do \\(20\\), koordinate so na desetinko natančne; pri manj kot \\(3\\) točkah \\(r\\) ni prikazan, ker bi dve točki vedno dali \\(\\pm1\\).', 'There are \\(2\\) to \\(20\\) points with coordinates to the nearest tenth; for fewer than \\(3\\) points \\(r\\) is not shown because two points always give \\(\\pm1\\).'),
        text('Če imajo vse točke isti \\(x\\) ali isti \\(y\\), \\(r\\) ni določen (v imenovalcu bi bila ničla) in lekcija to sporoči namesto deljenja z ničlo.', 'If all points share the same \\(x\\) or the same \\(y\\), \\(r\\) is undefined (the denominator would be zero) and the lesson says so instead of dividing by zero.'),
    ],
    unresolvedQuestions: [],
};

export const probabilityGuidedLessons: readonly GuidedLesson[] = [densityArea, binomialNormal, centralLimit, summaryStatistics, correlationLesson];
