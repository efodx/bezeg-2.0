/**
 * Guided lessons of the Probability and statistics family (docs/specs/probability-statistics-lessons.md): P1, density and probability
 * as area, `prob-density`; P2, from binomial to normal, `prob-binomial-normal`. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"): every number it
 * quotes is the readout of the scene it belongs to, and `probabilityGuidedLessons.test.ts` checks that against the real graph and the
 * kernel in `src/analysis/densityAreaModel.ts`. Scenes use the `density-mu`, `density-sigma`, `density-a` and `density-b` parameters
 * and the `density-example` choice (`standard` or `iq`). P2 scenes use `binomial-n`, `binomial-p`, `binomial-k`, the
 * `binomial-normal-example` and `binomial-correction` choices and the `poisson-bars` element (`src/analysis/binomialNormalModel.ts`).
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

export const probabilityGuidedLessons: readonly GuidedLesson[] = [densityArea, binomialNormal];
