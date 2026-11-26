/**
 * Guided lesson L5 of the isometries family (docs/specs/isometries-lessons.md, batch C): frieze patterns, on `isometries` (IsometryGraph).
 * Scenes use only the `isometry` actions `set-mode` (frieze) and `set-frieze` (the four ticked features and the period), and every scene starts from the
 * Demonstration default and names all four features and the period. A feature tick adds a generator; the rows "Navpično zrcalo" and the others show which
 * symmetries the closed set contains, which can be more than the ticked ones. The type names and the numbers of images per period the text quotes are exact,
 * read from the graph's status and rows. "Exactly seven types" is the classification theorem; the app checks it only for its own generators (a bounded check).
 */
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {IsometryIds} from '../../graphs/isometry/IsometryGraph';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
const f = frameDeclarer<IsometryIds>();

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
    /** What the observation frame highlights and asks the learner to use (task 08). */
    readonly declare?: FrameDeclaration;
}

const step = ({declare, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [frame(`${content.id}-explanation`, 'explanation'), frame(`${content.id}-observation`, 'observation', declare)],
});

/** What a scene sets: which of the four features are ticked and the period (an integer 4 to 8). */
export interface FriezeSceneSpec {
    readonly vertical: boolean;
    readonly horizontal: boolean;
    readonly halfTurn: boolean;
    readonly glide: boolean;
    readonly period: number;
}

/** The actions of a scene: the Demonstration default, `set-mode` frieze, then `set-frieze` naming all four features and the period. */
export const friezeSceneActions = (id: string, spec: FriezeSceneSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'isometry', operation: 'set-mode', mode: 'frieze'},
    {
        kind: 'isometry', operation: 'set-frieze', period: spec.period,
        features: {vertical: spec.vertical, horizontal: spec.horizontal, halfTurn: spec.halfTurn, glide: spec.glide},
    },
];

const scene = (id: string, spec: FriezeSceneSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: friezeSceneActions(id, spec), expectedState: text(sl, en)});

// ---- Numbers the text quotes (the tests read each from the graph's status and rows) -----------------------------------------------------

/** The period of every guided scene except the free one; the free scene uses the period 6. */
export const L5_PERIOD = 4;
export const L5_FREE_PERIOD = 6;
/** Images of the figure per period (the "Slik lika v periodi" row) for the seven types, p1, p2, p11g, p1m1, p11m, p2mg, p2mm. */
export const L5_COPIES: Readonly<Record<string, number>> = {p1: 1, p2: 2, p11g: 2, p1m1: 2, p11m: 2, p2mg: 4, p2mm: 4};
/** Of the 16 tick combinations, 11 give a frieze type and 5 shorten the period: H+G, V+H+G, V+R+G, H+R+G and all four ticked. */
export const L5_VALID_COMBINATIONS = 11;
export const L5_SHORTENING_COMBINATIONS = 5;

const none = {vertical: false, horizontal: false, halfTurn: false, glide: false};
export const L5_SCENES: Readonly<Record<'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'free', FriezeSceneSpec>> = {
    step1: {...none, period: L5_PERIOD},
    step2: {...none, glide: true, period: L5_PERIOD},
    step3: {...none, vertical: true, period: L5_PERIOD},
    step4: {...none, horizontal: true, period: L5_PERIOD},
    step5: {...none, vertical: true, horizontal: true, halfTurn: true, period: L5_PERIOD},
    free: {...none, glide: true, period: L5_FREE_PERIOD},
};

const formulas: readonly FormulaBlock[] = [
    {
        id: 'frieze-translation-half-turn',
        latex: '\\tau_L(x,y)=(x+L,\\;y),\\qquad \\rho(x,y)=(-x,\\;-y)',
        notation: text(
            '\\(L\\) je perioda, \\(\\tau_L\\) vzporedni premik za periodo vzdolž črte vzorca, \\(\\rho\\) vrtež za \\(180^\\circ\\) okoli izhodišča in \\((x,y)\\) točka ravnine.',
            '\\(L\\) is the period, \\(\\tau_L\\) the translation by the period along the line of the pattern, \\(\\rho\\) the half-turn about the origin and \\((x,y)\\) a point of the plane.',
        ),
        explanation: text(
            'Definicija: friz se ujame sam s seboj ob premiku \\(\\tau_L\\) in ob vseh njegovih večkratnikih. Vrtež \\(\\rho\\) je eno od dodatnih gibanj, ki jih lahko vzorec ima.',
            'Definition: a frieze maps onto itself under the translation \\(\\tau_L\\) and all its multiples. The half-turn \\(\\rho\\) is one of the further motions that a pattern may have.',
        ),
    },
    {
        id: 'frieze-glide',
        latex: '\\gamma(x,y)=\\left(x+\\tfrac{L}{2},\\;-y\\right)',
        notation: text(
            '\\(\\gamma\\) je zrcalni zdrs, \\(L\\) perioda, \\((x,y)\\) točka ravnine; črta vzorca je os \\(x\\).',
            '\\(\\gamma\\) is the glide reflection, \\(L\\) the period and \\((x,y)\\) a point of the plane; the line of the pattern is the \\(x\\) axis.',
        ),
        explanation: text(
            'Definicija: zrcalni zdrs je zrcaljenje v črti vzorca, ki mu sledi premik vzdolž črte za polovico periode.',
            'Definition: a glide reflection is the reflection in the line of the pattern followed by a translation along the line by half a period.',
        ),
    },
];

const steps: readonly GuidedLessonStep[] = [
    step({
        id: 'l5-half-turn', order: 1,
        declare: f({highlight: ['type', 'copies'], uses: ['feature-halfTurn']}),
        title: text('Vrtež za 180° v frizu', 'A half-turn in a frieze'),
        purpose: text('Napovedati število slik lika v periodi in lego središč vrtežev, ko ima vzorec le vrtež za 180°.', 'Predicting the number of images of the figure per period and the positions of the half-turn centres when the pattern has only a half-turn.'),
        explanation: text(
            'Friz je vzorec, ki se ponavlja vzdolž črte: ujame se sam s seboj ob vzporednem premiku za periodo \\(L\\). Na grafu je lik v trakovih po periodi \\(L=4\\); kljukice v skupini Simetrije vzorca izbirajo, katere simetrije ima vzorec. Zdaj ni nobena izbrana, zato se lik le premika. Preden označiš Vrtež za 180°, napovej: koliko slik lika bo v eni periodi in kje na črti vzorca bodo središča vrtežev. Pomagaj si z vrtežem, ki mu sledi premik za periodo.',
            'A frieze is a pattern that repeats along a line: it maps onto itself under the translation by the period \\(L\\). The graph shows the figure in strips of the period \\(L=4\\); the ticks in the group Symmetries of the pattern choose which symmetries the pattern has. None is ticked now, so the figure only translates. Before you tick Half-turn (180°), predict: how many images of the figure there are in one period and where on the line of the pattern the half-turn centres lie. Use the half-turn followed by the translation by the period.',
        ),
        formulaIds: ['frieze-translation-half-turn'],
        observationPrompt: text(
            'Zapiši napoved z razlogom. Nato označi Vrtež za 180° in primerjaj z besedilom v odčitkih, z vrsticama Tip friza in Slik lika v periodi ter z napisom tip friza na grafu.',
            'Write down your prediction with the reason. Then tick Half-turn (180°) and compare with the text in the readouts, with the rows Frieze type and Images of the figure per period, and with the caption frieze type on the graph.',
        ),
        expectedObservations: [
            text(
                'Vzorec je tipa \\(\\mathrm{p2}\\) in ima 2 sliki lika v periodi: osnovni lik in njegova slika pri vrtežu. Vrtež, ki mu sledi premik za \\(L\\), da \\((x,y)\\mapsto(-x+L,\\,-y)\\), kar je vrtež za \\(180^\\circ\\) okoli točke na črti vzorca pri \\(\\tfrac{L}{2}\\); sosednji središči vrtežev sta zato na črti vzorca oddaljeni za \\(\\tfrac{L}{2}\\), pri \\(L=4\\) torej za 2.',
                'The pattern is of type \\(\\mathrm{p2}\\) and has 2 images of the figure per period: the figure itself and its image under the half-turn. The half-turn followed by the translation by \\(L\\) gives \\((x,y)\\mapsto(-x+L,\\,-y)\\), which is the half-turn about the point of the line of the pattern at \\(\\tfrac{L}{2}\\); so the half-turn centres lie on the line of the pattern at distance \\(\\tfrac{L}{2}\\) from each other, for \\(L=4\\) at distance 2.',
            ),
        ],
        scene: scene('l5-half-turn-scene', L5_SCENES.step1,
            'Friz brez izbranih simetrij, perioda 4; tip \\(\\mathrm{p1}\\), 1 slika lika v periodi.',
            'A frieze with no symmetry ticked, period 4; type \\(\\mathrm{p1}\\), 1 image of the figure per period.'),
    }),
    step({
        id: 'l5-glide-mirror', order: 2,
        declare: f({highlight: ['type', 'copies', 'has-vertical'], uses: ['feature-vertical']}),
        title: text('Zrcalni zdrs in navpično zrcalo', 'Glide reflection and vertical mirror'),
        purpose: text('Napovedati, kaj nastane, če zrcalnemu zdrsu dodamo navpično zrcalo.', 'Predicting what appears when a vertical mirror is added to a glide reflection.'),
        explanation: text(
            'Vzorec ima zdaj izbran le Zrcalni zdrs: lik se ob njem zrcali v črti vzorca in premakne za pol periode. Zdrs ima tip \\(\\mathrm{p11g}\\) in 2 sliki lika v periodi. Preden označiš še Navpično zrcalo, napovej: kateri tip bo vzorec imel, koliko slik lika bo v periodi in ali se v vrsticah pojavi še kakšna simetrija, ki ni označena. Pomagaj si s tem, kaj naredita zrcalo in zdrs drug za drugim.',
            'The pattern now has only Glide reflection ticked: with it the figure is reflected in the line of the pattern and moved by half a period. The glide has type \\(\\mathrm{p11g}\\) and 2 images of the figure per period. Before you tick Vertical mirror as well, predict: which type the pattern will have, how many images of the figure there will be per period, and whether any symmetry that is not ticked appears in the rows. Think of what the mirror and the glide do one after the other.',
        ),
        formulaIds: ['frieze-glide'],
        observationPrompt: text(
            'Zapiši napoved z razlogom. Nato označi Navpično zrcalo in primerjaj z besedilom v odčitkih ter z vrsticami Tip friza, Slik lika v periodi in z vrsticami z imeni simetrij (da ali ne).',
            'Write down your prediction with the reason. Then tick Vertical mirror and compare with the text in the readouts and with the rows Frieze type, Images of the figure per period and the rows named after the symmetries (yes or no).',
        ),
        expectedObservations: [
            text(
                'Vzorec je tipa \\(\\mathrm{p2mg}\\) in ima 4 slike lika v periodi. Vrstica Vrtež za 180° pokaže da, čeprav kljukica ni označena: zrcalo, ki mu sledi zdrs, je vrtež za \\(180^\\circ\\), s središčem na četrtini periode \\(\\tfrac{L}{4}\\) od zrcala, torej na sredi med sosednjima zrcaloma. Odčitek kaže vse simetrije zaprte množice, ne le označenih.',
                'The pattern is of type \\(\\mathrm{p2mg}\\) and has 4 images of the figure per period. The row Half-turn (180°) shows yes although you did not tick it: the mirror followed by the glide is a half-turn, with its centre a quarter of the period \\(\\tfrac{L}{4}\\) from the mirror, midway between neighbouring mirrors. The readout shows all the symmetries of the closed set, not only the ticked ones.',
            ),
        ],
        scene: scene('l5-glide-mirror-scene', L5_SCENES.step2,
            'Friz s samim Zrcalnim zdrsom, perioda 4; tip \\(\\mathrm{p11g}\\), 2 sliki lika v periodi.',
            'A frieze with only Glide reflection ticked, period 4; type \\(\\mathrm{p11g}\\), 2 images of the figure per period.'),
    }),
    step({
        id: 'l5-two-mirrors', order: 3,
        declare: f({highlight: ['type', 'copies', 'has-halfTurn'], uses: ['feature-horizontal']}),
        title: text('Navpično in vodoravno zrcalo', 'Vertical and horizontal mirror'),
        purpose: text('Napovedati, kaj nastane iz dveh zrcal, ki sta pravokotni drugo na drugo.', 'Predicting what two mutually perpendicular mirrors produce.'),
        explanation: text(
            'Vzorec ima zdaj izbrano le Navpično zrcalo; tip je \\(\\mathrm{p1m1}\\) in sliki lika sta v periodi 2. Vodoravno zrcalo je črta vzorca sama. Preden ga označiš, napovej: kateri tip bo vzorec imel, koliko slik lika bo v periodi in ali se pojavi še kakšna simetrija, ki je ne označiš. Utemelji z zaporednim zrcaljenjem v obeh zrcalih.',
            'The pattern now has only Vertical mirror ticked; the type is \\(\\mathrm{p1m1}\\) and there are 2 images of the figure per period. The horizontal mirror is the line of the pattern itself. Before you tick it, predict: which type the pattern will have, how many images of the figure there will be per period, and whether any symmetry that you do not tick appears. Give a reason by reflecting in the two mirrors one after the other.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napoved z razlogom. Nato označi Vodoravno zrcalo in primerjaj z besedilom v odčitkih ter z vrsticami Tip friza, Slik lika v periodi in Vrtež za 180°.',
            'Write down your prediction with the reason. Then tick Horizontal mirror and compare with the text in the readouts and with the rows Frieze type, Images of the figure per period and Half-turn (180°).',
        ),
        expectedObservations: [
            text(
                'Vzorec je tipa \\(\\mathrm{p2mm}\\) in ima 4 slike lika v periodi. Vrstica Vrtež za 180° pokaže da, čeprav kljukica ni označena: zrcaljenji v dveh pravokotnih zrcalih skupaj dasta vrtež za \\(180^\\circ\\) okoli njunega presečišča. Zdrsa ta vzorec nima (vrstica Zrcalni zdrs pokaže ne).',
                'The pattern is of type \\(\\mathrm{p2mm}\\) and has 4 images of the figure per period. The row Half-turn (180°) shows yes although you did not tick it: the reflections in two perpendicular mirrors together give a half-turn about their intersection. This pattern has no glide (the row Glide reflection shows no).',
            ),
        ],
        scene: scene('l5-two-mirrors-scene', L5_SCENES.step3,
            'Friz s samim Navpičnim zrcalom, perioda 4; tip \\(\\mathrm{p1m1}\\), 2 sliki lika v periodi.',
            'A frieze with only Vertical mirror ticked, period 4; type \\(\\mathrm{p1m1}\\), 2 images of the figure per period.'),
    }),
    step({
        id: 'l5-shorter-period', order: 4,
        declare: f({highlight: ['type', 'period'], uses: ['feature-glide']}),
        title: text('Zrcalni zdrs in vodoravno zrcalo', 'Glide reflection and horizontal mirror'),
        purpose: text('Napovedati, kaj se zgodi, ko zrcalu v črti vzorca dodamo zrcalni zdrs.', 'Predicting what happens when a glide reflection is added to a mirror in the line of the pattern.'),
        explanation: text(
            'Vzorec ima zdaj izbrano le Vodoravno zrcalo (tip \\(\\mathrm{p11m}\\), 2 sliki lika v periodi). Zrcalni zdrs je zrcaljenje v isti črti in premik za polovico periode. Preden ga označiš, napovej, kaj nastane, če najprej uporabiš zrcaljenje v črti, nato zdrs, in kaj to pomeni za vzorec.',
            'The pattern now has only Horizontal mirror ticked (type \\(\\mathrm{p11m}\\), 2 images of the figure per period). The glide reflection is the reflection in the same line and a translation by half a period. Before you tick it, predict what you get if you first use the reflection in the line and then the glide, and what that means for the pattern.',
        ),
        formulaIds: ['frieze-glide'],
        observationPrompt: text(
            'Zapiši napoved z razlogom. Nato označi Zrcalni zdrs in preberi besedilo v odčitkih ter vrstici Tip friza in Perioda.',
            'Write down your prediction with the reason. Then tick Glide reflection and read the text in the readouts and the rows Frieze type and Period.',
        ),
        expectedObservations: [
            text(
                'Besedilo pove, da ta izbira zmanjša periodo: gotovi so le vzporedni premiki lika, vzorec ni friz s to periodo; vrstica Tip friza pokaže ni, vrstica Perioda ostane 4. Zrcaljenje v črti, ki mu sledi zdrs, je vzporedni premik za pol periode \\(\\tfrac{L}{2}\\), zato se vzorec ponovi že po \\(\\tfrac{L}{2}\\) in perioda \\(L\\) ni najmanjša.',
                'The text says that this choice shortens the period: only the translations of the figure are certain, so the pattern is not a frieze of this period; the row Frieze type shows none and the row Period stays 4. The reflection in the line followed by the glide is a translation by half a period \\(\\tfrac{L}{2}\\), so the pattern already repeats after \\(\\tfrac{L}{2}\\) and the period \\(L\\) is not the smallest.',
            ),
        ],
        scene: scene('l5-shorter-period-scene', L5_SCENES.step4,
            'Friz s samim Vodoravnim zrcalom, perioda 4; tip \\(\\mathrm{p11m}\\), 2 sliki lika v periodi.',
            'A frieze with only Horizontal mirror ticked, period 4; type \\(\\mathrm{p11m}\\), 2 images of the figure per period.'),
    }),
    step({
        id: 'l5-seven-types', order: 5,
        declare: f({highlight: ['type'], uses: ['feature-vertical', 'feature-horizontal', 'feature-halfTurn']}),
        title: text('Sedem tipov frizov', 'The seven frieze types'),
        purpose: text('Napovedati, katere kljukice dajo dva imenovana tipa, in spoznati, da so tipi frizov natanko sedem.', 'Predicting which ticks give two named types and meeting the fact that there are exactly seven frieze types.'),
        explanation: text(
            'Imena tipov frizov že poznaš z grafa. Klasifikacijski izrek trdi, da so frizi natanko sedmih tipov. Aplikacija tega ne dokazuje: preveri samo vzorce, ki jih dobi iz svojih generatorjev, in to je omejeno preverjanje, ne dokaz. Na grafu so izbrani Navpično zrcalo, Vodoravno zrcalo in Vrtež za 180° (tip \\(\\mathrm{p2mm}\\)). Napovej: kaj pokaže odčitek, če odznačiš samo Vodoravno zrcalo, in katere kljukice moraš odznačiti, da dobiš tip \\(\\mathrm{p1m1}\\). Nato napovej, katero kljukico moraš nato dodati, da dobiš tip \\(\\mathrm{p2mg}\\).',
            'You already know the names of frieze types from the graph. The classification theorem says that friezes have exactly seven types. The app does not prove this: it checks only the patterns that it gets from its own generators, and that is a bounded check, not a proof. On the graph Vertical mirror, Horizontal mirror and Half-turn (180°) are ticked (type \\(\\mathrm{p2mm}\\)). Predict: what the readout shows if you untick only Horizontal mirror, and which ticks you have to untick to get the type \\(\\mathrm{p1m1}\\). Then predict which tick you then have to add to get the type \\(\\mathrm{p2mg}\\).',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Zapiši napovedi z razlogi. Nato odznači Vodoravno zrcalo in preberi odčitek; odznači še, kar je treba, da dobiš \\(\\mathrm{p1m1}\\); nazadnje označi eno kljukico in preveri, da dobiš \\(\\mathrm{p2mg}\\). Primerjaj z odčitki in vrsticami.',
            'Write down the predictions with the reasons. Then untick Horizontal mirror and read the readout; untick what else is needed to get \\(\\mathrm{p1m1}\\); finally tick one box and check that you get \\(\\mathrm{p2mg}\\). Compare with the readouts and the rows.',
        ),
        expectedObservations: [
            text(
                'Če odznačiš samo Vodoravno zrcalo, je vzorec še vedno \\(\\mathrm{p2mm}\\) s 4 slikami: Navpično zrcalo in vrtež za \\(180^\\circ\\) skupaj dasta vodoravno zrcalo, zato vrstica Vodoravno zrcalo ostane da. Šele ko odznačiš še Vrtež za 180°, ostane le navpično zrcalo, tip \\(\\mathrm{p1m1}\\) z 2 slikama. Če nato označiš Zrcalni zdrs, je vzorec \\(\\mathrm{p2mg}\\) s 4 slikami. Vseh sedem tipov z vrsticami simetrij in slikami lika v periodi: \\(\\mathrm{p1}\\) brez simetrije, 1 slika; \\(\\mathrm{p2}\\) vrtež, 2; \\(\\mathrm{p11g}\\) zdrs, 2; \\(\\mathrm{p1m1}\\) navpično zrcalo, 2; \\(\\mathrm{p11m}\\) vodoravno zrcalo, 2; \\(\\mathrm{p2mg}\\) navpično zrcalo, vrtež in zdrs, 4; \\(\\mathrm{p2mm}\\) navpično in vodoravno zrcalo ter vrtež, 4. Od 16 kombinacij kljukic jih 11 da friz enega od teh sedmih tipov, 5 pa skrajša periodo.',
                'If you untick only Horizontal mirror, the pattern is still \\(\\mathrm{p2mm}\\) with 4 images: Vertical mirror and the half-turn together give the horizontal mirror, so the row Horizontal mirror stays yes. Only when you also untick Half-turn (180°) does just the vertical mirror remain, type \\(\\mathrm{p1m1}\\) with 2 images. If you then tick Glide reflection, the pattern is \\(\\mathrm{p2mg}\\) with 4 images. All seven types with the symmetry rows and the images of the figure per period: \\(\\mathrm{p1}\\) no symmetry, 1 image; \\(\\mathrm{p2}\\) half-turn, 2; \\(\\mathrm{p11g}\\) glide, 2; \\(\\mathrm{p1m1}\\) vertical mirror, 2; \\(\\mathrm{p11m}\\) horizontal mirror, 2; \\(\\mathrm{p2mg}\\) vertical mirror, half-turn and glide, 4; \\(\\mathrm{p2mm}\\) vertical and horizontal mirror and half-turn, 4. Of the 16 combinations of ticks, 11 give a frieze of one of these seven types and 5 shorten the period.',
            ),
        ],
        scene: scene('l5-seven-types-scene', L5_SCENES.step5,
            'Friz z izbranimi Navpičnim zrcalom, Vodoravnim zrcalom in Vrtežem za 180°, perioda 4; tip \\(\\mathrm{p2mm}\\), 4 slike lika v periodi.',
            'A frieze with Vertical mirror, Horizontal mirror and Half-turn (180°) ticked, period 4; type \\(\\mathrm{p2mm}\\), 4 images of the figure per period.'),
    }),
    step({
        id: 'l5-free', order: 6,
        declare: f({highlight: ['type', 'period']}),
        title: text('Prosto raziskovanje', 'Try for yourself'),
        purpose: text('Sami preizkusiti kombinacije kljukic in periodo ter prebrati tip friza.', 'Trying the combinations of ticks and the period yourself and reading the frieze type.'),
        explanation: text(
            'Zdaj po svoje izbiraj kljukice in periodo (drsnik Perioda). Na grafu je Zrcalni zdrs s periodo 6. Poskusi vse kombinacije kljukic: pri vsaki napovej tip friza ali skrajšanje periode, nato preberi odčitek. Poskusi tudi, ali perioda vpliva na tip.',
            'Now choose the ticks and the period (the slider Period) yourself. The graph shows Glide reflection with the period 6. Try all combinations of ticks: for each, predict the frieze type or the shortening of the period, then read the readout. Also try whether the period affects the type.',
        ),
        formulaIds: ['frieze-translation-half-turn', 'frieze-glide'],
        observationPrompt: text(
            'Za vsako kombinacijo zapiši napoved in tip friza iz odčitka. Poišči, katere kombinacije skrajšajo periodo.',
            'For each combination write down your prediction and the frieze type from the readout. Find which combinations shorten the period.',
        ),
        expectedObservations: [
            text(
                'Od 16 kombinacij jih 11 da friz: ni izbranega, Navpično zrcalo, Vodoravno zrcalo, Vrtež za 180°, Zrcalni zdrs, Navpično z Vodoravnim ali z Vrtežem ali z Vrtežem in Vodoravnim, Vrtež z Vodoravnim, Navpično z zdrsom ter Vrtež z zdrsom. Skrajšanje periode dajo: Vodoravno zrcalo z zdrsom, Navpično in Vodoravno zrcalo z zdrsom, Navpično zrcalo, Vrtež in zdrs, Vodoravno zrcalo, Vrtež in zdrs ter vse štiri kljukice. Pri periodah 4 in 6 sta tip in število slik lika enaka.',
                'Of the 16 combinations, 11 give a frieze: nothing ticked, Vertical mirror, Horizontal mirror, Half-turn (180°), Glide reflection, Vertical with Horizontal or with Half-turn or with Half-turn and Horizontal, Half-turn with Horizontal, Vertical with Glide and Half-turn with Glide. These shorten the period: Horizontal mirror with Glide, Vertical and Horizontal mirror with Glide, Vertical mirror with Half-turn and Glide, Horizontal mirror with Half-turn and Glide, and all four ticked. For the periods 4 and 6 the type and the number of images of the figure are the same.',
            ),
        ],
        scene: scene('l5-free-scene', L5_SCENES.free,
            'Friz s samim Zrcalnim zdrsom, perioda 6; tip \\(\\mathrm{p11g}\\), 2 sliki lika v periodi.',
            'A frieze with only Glide reflection ticked, period 6; type \\(\\mathrm{p11g}\\), 2 images of the figure per period.'),
    }),
];

export const friezeLesson: GuidedLesson = {
    demonstrationId: 'isometries',
    title: text('Frizi', 'Frieze patterns'),
    summary: text(
        'Vzorec, ki se ponavlja vzdolž črte, ima določeno množico simetrij; njen tip imenujemo tip friza. Kljukice izbirajo simetrije, graf pa pokaže tip in število slik lika v periodi.',
        'A pattern that repeats along a line has a set of symmetries; its type is called the frieze type. The ticks choose the symmetries and the graph shows the type and the number of images of the figure per period.',
    ),
    prerequisites: [text('Lekcije o dveh zrcalih in o razvrščanju gibanj ter rozete.', 'The lessons on two mirrors and on classifying motions, and rosettes.')],
    learningGoals: [
        text('Napoveš število slik lika v periodi in tip friza iz izbranih simetrij.', 'Predict the number of images of the figure per period and the frieze type from the chosen symmetries.'),
        text('Veš, da izbrane simetrije določajo še druge: odčitek kaže vse simetrije zaprte množice.', 'Know that the chosen symmetries imply others: the readout shows all the symmetries of the closed set.'),
        text('Prepoznaš izbiro, ki skrajša periodo, in veš, da je sedem tipov frizov klasifikacijski izrek, ki ga aplikacija le omejeno preveri.', 'Recognise a choice that shortens the period, and know that seven frieze types is a classification theorem that the app checks only in a bounded way.'),
    ],
    formulaBlocks: formulas,
    workedExamples: [],
    steps,
    sources: [
        {
            id: 'bezeg-frieze-implementation',
            citation: 'Bezeg source: src/isometry/frieze.ts and src/graphs/isometry/IsometryGraph.tsx.',
            implementationCorrespondence: 'A scene sets the mode of the graph to frieze, the four ticks and the period; the text quotes only the types and the numbers of images per period that the graph shows for those scenes, and plain arithmetic. The count of seven types is the classification theorem; the app checks it only for its own generators.',
        },
    ],
    edgeCases: [
        text('Odčitek kaže zaprto množico simetrij, zato lahko vrstica pokaže da, čeprav kljukica ni označena.', 'The readout shows the closed set of symmetries, so a row can show yes although its tick is not ticked.'),
        text('Pri kombinaciji, ki skrajša periodo, tipa friza ni in vrstica Tip friza pokaže ni.', 'For a combination that shortens the period there is no frieze type and the row Frieze type shows none.'),
        text('Sedem tipov je klasifikacijski izrek; aplikacija ga preveri le za svoje generatorje, kar ni dokaz.', 'Seven types is the classification theorem; the app checks it only for its own generators, which is not a proof.'),
    ],
    unresolvedQuestions: [],
};
