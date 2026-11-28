/**
 * Guided lesson of the solids family, batch C (docs/specs/solids-volumes-lessons.md): SV5, solids of revolution as the volume pi * integral of f^2, on `solids` in revolve mode
 * (SolidsGraph). The scenes use only the `solids` actions the graph registers (`set-mode`, `set-solid`, `set-axis`, `set-discs`, `set-camera`) and every scene starts from the
 * Demonstration default. The revolve readouts (the axis, the mesh volume, the exact volume, the disc or washer sum) are shown on the first frame, so each predicting step opens on the
 * state before the change it asks for. Every number the text quotes is a readout of the graph (probed, .command-logs/solids-c/probe.txt and probe2.txt) or exact arithmetic in the
 * same step. The mesh row is the volume of the drawn mesh (48-gon sections, a profile of chords) and is never the disc sum.
 */
import {frameDeclarer, type FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {SolidsIds} from '../../graphs/solids/solidsDeclaration';
import type {LessonAction} from '../model';
import type {FormulaBlock, GuidedLesson, GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

/** The lesson text is written once with decimal commas in math (`{,}`); the English text gets decimal points. */
const text = (sl: string, en: string): LocalizedText => ({sl, en: en.replace(/\{,\}/g, '.')});
const frame = (id: string, kind: GuidedLessonFrame['kind'], declare?: FrameDeclaration): GuidedLessonFrame => ({id, kind, ...(declare ? {declare} : {})});
const f = frameDeclarer<SolidsIds>();

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
    /** What the observation frame highlights and which pucks its text asks for (task 08). */
    readonly declare?: FrameDeclaration;
}

const step = ({declare, ...content}: StepContent): GuidedLessonStep => ({
    ...content,
    frames: [
        frame(`${content.id}-explanation`, 'explanation'),
        frame(`${content.id}-observation`, 'observation', declare),
    ],
});

/** What a revolve scene sets on top of the Demonstration default: the solid and optionally the axis, the disc count (1 to 60) and a camera preset. */
export interface SolidsRevolveSpec {
    readonly solid: 'cone' | 'sqrt' | 'parabola' | 'sphere';
    readonly axis?: 'x' | 'y';
    readonly discs?: number;
    readonly camera?: 'front' | 'top' | 'side' | 'isometric';
}

/** The actions of a revolve scene: the Demonstration default, then the mode, the solid and the fields the spec names (the axis, the discs, the camera). */
export const solidsRevolveActions = (id: string, spec: SolidsRevolveSpec): LessonAction[] => [
    {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
    {kind: 'solids', operation: 'set-mode', mode: 'revolve'},
    {kind: 'solids', operation: 'set-solid', solid: spec.solid},
    ...(spec.axis !== undefined ? [{kind: 'solids', operation: 'set-axis', axis: spec.axis} as const] : []),
    ...(spec.discs !== undefined ? [{kind: 'solids', operation: 'set-discs', discs: spec.discs} as const] : []),
    ...(spec.camera !== undefined ? [{kind: 'solids', operation: 'set-camera', view: spec.camera} as const] : []),
];

const solidsRevolveScene = (id: string, spec: SolidsRevolveSpec, sl: string, en: string): LessonScene =>
    ({id, basedOn: 'demonstration-default', actions: solidsRevolveActions(id, spec), expectedState: text(sl, en)});

/**
 * SV5. Each step opens on the state before the change it asks for: the profile of the cone 3x/4 on [0, 4] seen from the front (the learner restores the default view; a sqrt(x)
 * opening would show its disc sum equal to the exact volume, step 3's answer); x^2 on [0, 1] with
 * 1 disc (5 and 60 follow); x^2 with 4 discs (the learner switches the solid to sqrt(x), the discs stay 4); the sphere with 6 discs (60 follows); x^2 about the x axis with 10 discs
 * (the learner sets the axis to y); sqrt(x) about the x axis with 10 discs for the free step.
 */
export const SV5_PROFILE: SolidsRevolveSpec = {solid: 'cone', camera: 'front'};
export const SV5_DISCS: SolidsRevolveSpec = {solid: 'parabola', discs: 1};
export const SV5_EXACT: SolidsRevolveSpec = {solid: 'parabola', discs: 4};
export const SV5_SPHERE: SolidsRevolveSpec = {solid: 'sphere', discs: 6};
export const SV5_AXIS: SolidsRevolveSpec = {solid: 'parabola', axis: 'x', discs: 10};
export const SV5_FREE: SolidsRevolveSpec = {solid: 'sqrt', axis: 'x', discs: 10};

// ---- Formulas ----------------------------------------------------------------------------------------------------------------------

const formulas: readonly FormulaBlock[] = [
    {
        id: 'solids-revolution-disc-sum',
        latex: 'S_{n}=\\sum_{k=1}^{n}\\pi\\,f(x_{k})^{2}\\,\\Delta x,\\qquad \\Delta x=\\frac{b-a}{n},\\quad x_{k}=a+\\left(k-\\frac{1}{2}\\right)\\Delta x',
        notation: text(
            '\\(S_n\\) je vsota diskov. Interval \\([a,b]\\) razdelimo na \\(n\\) odsekov debeline \\(\\Delta x\\); \\(x_k\\) je sredina \\(k\\)-tega odseka, \\(f(x_k)\\) polmer diska na tej sredini in \\(\\pi f(x_k)^2\\) ploščina njegovega kroga.',
            '\\(S_n\\) is the sum of the discs. The interval \\([a,b]\\) is divided into \\(n\\) parts of thickness \\(\\Delta x\\); \\(x_k\\) is the midpoint of the \\(k\\)-th part, \\(f(x_k)\\) is the radius of the disc at that midpoint and \\(\\pi f(x_k)^2\\) is the area of its circle.',
        ),
        explanation: text(
            'Vsota prostornin \\(n\\) diskov (ploščina kroga krat debelina) po sredinskem pravilu. Je približek prostornine vrtenine z valji.',
            'The sum of the volumes of \\(n\\) discs (area of the circle times thickness) by the midpoint rule. It is an approximation of the volume of the solid of revolution by cylinders.',
        ),
    },
    {
        id: 'solids-revolution-integral',
        latex: 'V=\\pi\\int_{a}^{b}f(x)^{2}\\,dx',
        notation: text(
            '\\(V\\) je prostornina vrtenine, ki nastane, ko območje pod grafom zvezne funkcije \\(f\\ge0\\) na intervalu \\([a,b]\\) zavrtimo okoli osi \\(x\\). Presek te vrtenine z ravnino pravokotno na os \\(x\\) pri \\(x\\) je krog s polmerom \\(f(x)\\) in ploščino \\(\\pi f(x)^2\\).',
            '\\(V\\) is the volume of the solid of revolution made by turning the region under the graph of a continuous function \\(f\\ge0\\) on the interval \\([a,b]\\) about the \\(x\\) axis. The section of this solid by the plane perpendicular to the \\(x\\) axis at \\(x\\) is a circle of radius \\(f(x)\\) and area \\(\\pi f(x)^2\\).',
        ),
        explanation: text(
            'Ko diski postajajo tanjši, se vsota diskov približuje integralu ploščine preseka po \\(x\\). Integral je natančna prostornina, vsota diskov pa približek.',
            'As the discs get thinner, the sum of the discs approaches the integral of the section area over \\(x\\). The integral is the exact volume and the sum of the discs is an approximation.',
        ),
    },
];

// ---- SV5 ---------------------------------------------------------------------------------------------------------------------------

const sv5Steps: readonly GuidedLessonStep[] = [
    step({
        id: 'sv5-solid', order: 1,
        title: text('Graf funkcije in os vrtenja', 'The graph of a function and the axis of rotation'),
        purpose: text(
            'Napovedati, kakšno telo nastane, ko območje pod grafom zavrtimo okoli osi \\(x\\), in kakšni so njegovi preseki.',
            'Predicting what solid is made when the region under a graph is turned about the \\(x\\) axis, and what its sections are.',
        ),
        explanation: text(
            'Graf kaže funkcijo \\(f(x)=\\tfrac{3x}{4}\\) na intervalu \\([0,4]\\) in črtkano os \\(x\\). Pogled je od spredaj: graf vidiš v ravnini slike, os \\(x\\) vodoravno. Območje pod grafom (med grafom, osjo \\(x\\) in premico \\(x=4\\)) zavrtimo okoli osi \\(x\\) in dobimo vrtenino. Zapiši napoved: kakšno telo nastane? Kakšen lik je presek tega telesa z ravnino, ki je pravokotna na os \\(x\\), pri \\(x=2\\) in pri \\(x=4\\), in kolikšna je njegova ploščina na vsakem od obeh mest? Utemelji.',
            'The graph shows the function \\(f(x)=\\tfrac{3x}{4}\\) on the interval \\([0,4]\\) and the dashed \\(x\\) axis. The view is from the front: you see the graph in the plane of the picture and the \\(x\\) axis horizontal. The region under the graph (between the graph, the \\(x\\) axis and the line \\(x=4\\)) is turned about the \\(x\\) axis and gives a solid of revolution. Write down a prediction: what solid is made? What shape is the section of this solid by the plane perpendicular to the \\(x\\) axis at \\(x=2\\) and at \\(x=4\\), and what is its area at each of the two places? Give a reason.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'V zavihku Prikaz pritisni Ponastavi pogled, nato pogled vrti s puščičnimi tipkami ali z vlečenjem. Oglej si telo in kroge na njem: primerjaj velikost kroga pri \\(x=2\\) in pri \\(x=4\\) z napovedjo.',
            'In the tab Display press Reset view, then turn the view with the arrow keys or by dragging. Look at the solid and the circles on it: compare the size of the circle at \\(x=2\\) and at \\(x=4\\) with your prediction.',
        ),
        expectedObservations: [
            text(
                'Nastane stožec z vrhom v izhodišču, ki je okoli osi \\(x\\) okrogel: presek z ravnino pravokotno na os \\(x\\) je krog s središčem na osi in polmerom \\(f(x)\\). Pri \\(x=2\\) je polmer \\(\\tfrac32\\) in ploščina \\(\\pi\\left(\\tfrac32\\right)^2=\\tfrac{9\\pi}{4}\\); pri \\(x=4\\) je polmer \\(3\\) in ploščina \\(9\\pi\\). Polmer se podvoji, ploščina se početveri.',
                'The solid is a cone with its apex at the origin, round about the \\(x\\) axis: the section by a plane perpendicular to the \\(x\\) axis is a circle with its centre on the axis and radius \\(f(x)\\). At \\(x=2\\) the radius is \\(\\tfrac32\\) and the area \\(\\pi\\left(\\tfrac32\\right)^2=\\tfrac{9\\pi}{4}\\); at \\(x=4\\) the radius is \\(3\\) and the area \\(9\\pi\\). The radius doubles, the area becomes four times as large.',
            ),
            text(
                'Ploščine noben odčitek ne kaže: izračunamo jo iz polmera, to je vrednosti \\(f(x)\\). Ploščina preseka je torej \\(\\pi f(x)^2\\); iz nje v naslednjih korakih sestavimo prostornino.',
                'No readout shows the area: it is computed from the radius, the value \\(f(x)\\). So the section area is \\(\\pi f(x)^2\\); the next steps build the volume from it.',
            ),
        ],
        scene: solidsRevolveScene('sv5-solid-scene', SV5_PROFILE,
            'Stožec, način Vrtenina, os \\(x\\), Število diskov \\(10\\), pogled spredaj: Vsota diskov približno \\(37{,}60486\\), Prostornina (natančno) približno \\(37{,}69911\\).',
            'Cone, mode Solid of revolution, \\(x\\) axis, Number of discs \\(10\\), front view: Sum of discs about \\(37{,}60486\\), Volume (exact) about \\(37{,}69911\\).'),
    }),
    step({
        id: 'sv5-discs', order: 2,
        declare: f({highlight: ['disc-sum', 'volume-exact'], uses: ['solids-discs']}),
        title: text('Vrtenina kot sklad diskov', 'The solid of revolution as a stack of discs'),
        purpose: text(
            'Napovedati, kako se vsota prostornin diskov spreminja s številom diskov.',
            'Predicting how the sum of the volumes of the discs changes with the number of discs.',
        ),
        explanation: text(
            'Telo razrežemo na \\(n\\) diskov debeline \\(\\Delta x=\\tfrac{b-a}{n}\\). Disk na sredini \\(x_k\\) svojega odseka ima polmer \\(f(x_k)\\) in prostornino \\(\\pi f(x_k)^2\\,\\Delta x\\) (ploščina kroga krat debelina); vsota teh prostornin je vsota diskov \\(S_n\\). Zdaj je \\(f(x)=x^2\\) na \\([0,1]\\), Število diskov je \\(1\\): en disk polmera \\(f\\left(\\tfrac12\\right)=\\tfrac14\\) in debeline \\(1\\), torej prostornine \\(\\tfrac{\\pi}{16}\\). Vrstica Vsota diskov kaže približno \\(0{,}19635\\), vrstica Prostornina (natančno) pa \\(\\tfrac\\pi5\\approx0{,}62832\\). Zapiši napoved: kaj se zgodi z vsoto diskov, ko Število diskov nastaviš na \\(5\\) in nato na \\(60\\)? Ali vsota raste ali pada, ali ostane pod natančno vrednostjo ali jo preseže in kako blizu ji pride? Utemelji; številk ni treba napovedati natančno.',
            'The solid is cut into \\(n\\) discs of thickness \\(\\Delta x=\\tfrac{b-a}{n}\\). The disc at the midpoint \\(x_k\\) of its part has radius \\(f(x_k)\\) and volume \\(\\pi f(x_k)^2\\,\\Delta x\\) (the area of the circle times the thickness); the sum of these volumes is the sum of the discs \\(S_n\\). Now \\(f(x)=x^2\\) on \\([0,1]\\) and Number of discs is \\(1\\): one disc of radius \\(f\\left(\\tfrac12\\right)=\\tfrac14\\) and thickness \\(1\\), so of volume \\(\\tfrac{\\pi}{16}\\). The row Sum of discs shows about \\(0{,}19635\\) and the row Volume (exact) shows \\(\\tfrac\\pi5\\approx0{,}62832\\). Write down a prediction: what happens to the sum of the discs when you set Number of discs to \\(5\\) and then to \\(60\\)? Does the sum grow or fall, does it stay below the exact value or exceed it, and how close does it come? Give a reason; the numbers need not be predicted exactly.',
        ),
        formulaIds: ['solids-revolution-disc-sum'],
        observationPrompt: text(
            'S krmilnikom Število diskov nastavi \\(5\\) in nato \\(60\\). Pri vsaki nastavitvi preberi vrstico Vsota diskov in jo primerjaj z vrstico Prostornina (natančno) ter z napovedjo.',
            'With the Number of discs control set \\(5\\) and then \\(60\\). At each setting read the row Sum of discs and compare it with the row Volume (exact) and with your prediction.',
        ),
        expectedObservations: [
            text(
                'Vsota diskov je približno \\(0{,}60752\\) pri \\(5\\) diskih in približno \\(0{,}62817\\) pri \\(60\\) diskih (pri \\(1\\) disku približno \\(0{,}19635\\)): v teh točkah raste in ostane pod \\(\\tfrac\\pi5\\approx0{,}62832\\), razlika pa se manjša. Pri tej funkciji je vsota pod natančno vrednostjo, ker je \\(f(x)^2=x^4\\) konveksna funkcija in sredinsko pravilo za konveksne funkcije podcenjuje; to ni pravilo za vsako funkcijo (glej korak 4).',
                'The sum of the discs is about \\(0{,}60752\\) at \\(5\\) discs and about \\(0{,}62817\\) at \\(60\\) discs (at \\(1\\) disc about \\(0{,}19635\\)): at these points it grows and stays below \\(\\tfrac\\pi5\\approx0{,}62832\\), and the gap shrinks. For this function the sum is below the exact value because \\(f(x)^2=x^4\\) is a convex function and the midpoint rule underestimates convex functions; that is not a rule for every function (see step 4).',
            ),
            text(
                'Vrstica Prostornina (mreža) ostane približno \\(0{,}63198\\) ne glede na število diskov: to je prostornina narisane mreže (preseki so \\(48\\)-kotniki, profil je sestavljen iz tetiv), ne vsota diskov. Pri tej funkciji je nad natančno vrednostjo; smer napake mreže je odvisna od telesa.',
                'The row Volume (mesh) stays at about \\(0{,}63198\\) whatever the number of discs: that is the volume of the drawn mesh (the sections are \\(48\\)-gons, the profile is made of chords), not the sum of the discs. For this function it is above the exact value; the direction of the mesh error depends on the solid.',
            ),
        ],
        scene: solidsRevolveScene('sv5-discs-scene', SV5_DISCS,
            'Vrtenina funkcije x², način Vrtenina, os \\(x\\), Število diskov \\(1\\): Vsota diskov približno \\(0{,}19635\\), Prostornina (natančno) približno \\(0{,}62832\\).',
            'Revolution of x², mode Solid of revolution, \\(x\\) axis, Number of discs \\(1\\): Sum of discs about \\(0{,}19635\\), Volume (exact) about \\(0{,}62832\\).'),
    }),
    step({
        id: 'sv5-integral', order: 3,
        declare: f({highlight: ['disc-sum', 'volume-exact'], uses: ['solids-discs']}),
        title: text('Natančna prostornina: integral', 'The exact volume: the integral'),
        purpose: text(
            'Napovedati, kako se vsota diskov za drugo funkcijo primerja z natančno prostornino.',
            'Predicting how the sum of the discs for another function compares with the exact volume.',
        ),
        explanation: text(
            'Graf še kaže \\(f(x)=x^2\\) na \\([0,1]\\), zdaj s \\(4\\) diski: vsota diskov je približno \\(0{,}59595\\), natančna prostornina pa \\(\\tfrac\\pi5\\approx0{,}62832\\). Natančno prostornino daje integral \\(V=\\pi\\int_a^b f(x)^2\\,dx\\), vsota diskov pa je njen približek. V izbiri Telo bomo zdaj izbrali Vrtenina funkcije √x, to je \\(f(x)=\\sqrt x\\) na \\([0,4]\\); Število diskov ostane \\(4\\). Zapiši napoved: ali bo vsota diskov pri \\(4\\) diskih pod, nad ali enaka natančni prostornini? Preden pogledaš, izračunaj \\(\\pi\\int_0^4 f(x)^2\\,dx\\) za to funkcijo in utemelji, kaj od sredinskega pravila pričakuješ za funkcijo \\(\\pi f(x)^2\\).',
            'The graph still shows \\(f(x)=x^2\\) on \\([0,1]\\), now with \\(4\\) discs: the sum of the discs is about \\(0{,}59595\\) and the exact volume is \\(\\tfrac\\pi5\\approx0{,}62832\\). The exact volume is given by the integral \\(V=\\pi\\int_a^b f(x)^2\\,dx\\), and the sum of the discs is its approximation. In the choice Solid we shall now pick Revolution of √x, that is \\(f(x)=\\sqrt x\\) on \\([0,4]\\); Number of discs stays \\(4\\). Write down a prediction: will the sum of the discs at \\(4\\) discs be below, above or equal to the exact volume? Before you look, compute \\(\\pi\\int_0^4 f(x)^2\\,dx\\) for this function and give a reason for what you expect of the midpoint rule for the function \\(\\pi f(x)^2\\).',
        ),
        formulaIds: ['solids-revolution-integral'],
        observationPrompt: text(
            'V izbiri Telo izberi Vrtenina funkcije √x. Preberi vrstici Vsota diskov in Prostornina (natančno); nato Število diskov nastavi na \\(1\\), \\(10\\) in \\(60\\) in pri vsakem številu preberi vsoto diskov. Primerjaj z napovedjo.',
            'In the choice Solid pick Revolution of √x. Read the rows Sum of discs and Volume (exact); then set Number of discs to \\(1\\), \\(10\\) and \\(60\\) and read the sum of the discs at each. Compare with your prediction.',
        ),
        expectedObservations: [
            text(
                'Ker je \\(f(x)^2=x\\), je \\(V=\\pi\\int_0^4 x\\,dx=\\pi\\left[\\tfrac{x^2}{2}\\right]_0^4=8\\pi\\approx25{,}13274\\). Vsota diskov je približno \\(25{,}13274\\) pri \\(4\\) diskih in tudi pri \\(1\\), \\(10\\) in \\(60\\) diskih: ujema se z natančno vrednostjo pri vsakem številu diskov. To ni naključje: \\(\\pi f(x)^2=\\pi x\\) je linearna funkcija, sredinsko pravilo pa je za linearne funkcije natančno (na vsakem odseku se odstopanje levo od sredine izniči z odstopanjem desno). Pri \\(f(x)=x^2\\) je bilo drugače, ker \\(f(x)^2=x^4\\) ni linearna.',
                'Since \\(f(x)^2=x\\), \\(V=\\pi\\int_0^4 x\\,dx=\\pi\\left[\\tfrac{x^2}{2}\\right]_0^4=8\\pi\\approx25{,}13274\\). The sum of the discs is about \\(25{,}13274\\) at \\(4\\) discs and also at \\(1\\), \\(10\\) and \\(60\\) discs: it agrees with the exact value at every number of discs. That is no accident: \\(\\pi f(x)^2=\\pi x\\) is a linear function, and the midpoint rule is exact for linear functions (on each part the deviation left of the midpoint cancels the deviation right of it). For \\(f(x)=x^2\\) it was different, because \\(f(x)^2=x^4\\) is not linear.',
            ),
            text(
                'Vrstica Prostornina (mreža) je približno \\(24{,}86295\\), približno \\(1{,}1\\,\\%\\) pod natančno vrednostjo. To je prostornina mreže (\\(48\\)-kotniki, profil iz tetiv), ne vsota diskov, in je enaka pri vsakem številu diskov.',
                'The row Volume (mesh) is about \\(24{,}86295\\), about \\(1{,}1\\,\\%\\) below the exact value. That is the volume of the mesh (\\(48\\)-gons, a profile of chords), not the sum of the discs, and it is the same at every number of discs.',
            ),
        ],
        scene: solidsRevolveScene('sv5-integral-scene', SV5_EXACT,
            'Vrtenina funkcije x², način Vrtenina, os \\(x\\), Število diskov \\(4\\): Vsota diskov približno \\(0{,}59595\\), Prostornina (natančno) približno \\(0{,}62832\\).',
            'Revolution of x², mode Solid of revolution, \\(x\\) axis, Number of discs \\(4\\): Sum of discs about \\(0{,}59595\\), Volume (exact) about \\(0{,}62832\\).'),
    }),
    step({
        id: 'sv5-sphere', order: 4,
        declare: f({highlight: ['disc-sum'], uses: ['solids-discs']}),
        title: text('Krogla: napaka na drugo stran', 'The sphere: the error on the other side'),
        purpose: text(
            'Razložiti, na kateri strani natančne vrednosti je vsota diskov pri krogli, in napovedati, kako hitro se razlika manjša.',
            'Explaining on which side of the exact value the sum of the discs lies for the sphere, and predicting how fast the gap shrinks.',
        ),
        explanation: text(
            'Krogla s polmerom \\(3\\) nastane z vrtenjem \\(f(x)=\\sqrt{9-x^2}\\) na \\([-3,3]\\) okoli osi \\(x\\). Zdaj je Število diskov \\(6\\). Primerjaj vrstici Vsota diskov in Prostornina (natančno): na kateri strani natančne vrednosti je vsota in za koliko? Zapiši razlago: zakaj je vsota na tej strani? Utemelji z obliko grafa funkcije \\(\\pi f(x)^2=\\pi(9-x^2)\\) in jo primerjaj z \\(x^4\\) iz koraka 2. Nato zapiši napoved: kolikokrat manjša bo razlika pri \\(60\\) diskih kot pri \\(6\\), če je napaka sredinske vsote sorazmerna s kvadratom debeline diska?',
            'The sphere of radius \\(3\\) is made by turning \\(f(x)=\\sqrt{9-x^2}\\) on \\([-3,3]\\) about the \\(x\\) axis. Now Number of discs is \\(6\\). Compare the rows Sum of discs and Volume (exact): on which side of the exact value is the sum, and by how much? Write down an explanation: why is the sum on this side? Give a reason from the shape of the graph of the function \\(\\pi f(x)^2=\\pi(9-x^2)\\), and compare it with \\(x^4\\) from step 2. Then write down a prediction: how many times smaller will the gap be at \\(60\\) discs than at \\(6\\), if the error of the midpoint sum is proportional to the square of the thickness of a disc?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'S krmilnikom Število diskov nastavi \\(60\\) in preberi vrstico Vsota diskov. Nato poskusi še \\(2\\) in \\(10\\) diskov in opazuj, na kateri strani natančne vrednosti je vsota.',
            'With the Number of discs control set \\(60\\) and read the row Sum of discs. Then try \\(2\\) and \\(10\\) discs and watch on which side of the exact value the sum lies.',
        ),
        expectedObservations: [
            text(
                'Pri \\(6\\) diskih je vsota približno \\(114{,}66813\\), približno \\(1{,}5708\\) nad natančno vrednostjo \\(36\\pi\\approx113{,}09734\\). Pri \\(60\\) diskih je vsota približno \\(113{,}11304\\), razlika približno \\(0{,}0157\\): debelina diska je desetkrat manjša, razlika pa stokrat. Pri \\(2\\) diskih je vsota približno \\(127{,}2345\\), pri \\(10\\) približno \\(113{,}66282\\): vsota se natančni vrednosti približuje od zgoraj. Ker je \\(\\pi(9-x^2)\\) kvadratna funkcija, je pri \\(n\\) diskih razlika natančno \\(\\tfrac{18\\pi}{n^2}\\). Natančna vrednost je \\(V=\\pi\\int_{-3}^{3}(9-x^2)\\,dx=\\pi\\left[9x-\\tfrac{x^3}{3}\\right]_{-3}^{3}=\\pi(18+18)=36\\pi\\).',
                'At \\(6\\) discs the sum is about \\(114{,}66813\\), about \\(1{,}5708\\) above the exact value \\(36\\pi\\approx113{,}09734\\). At \\(60\\) discs the sum is about \\(113{,}11304\\), the gap about \\(0{,}0157\\): the disc is ten times thinner and the gap a hundred times smaller. At \\(2\\) discs the sum is about \\(127{,}2345\\), at \\(10\\) about \\(113{,}66282\\): the sum approaches the exact value from above. Since \\(\\pi(9-x^2)\\) is a quadratic function, the gap at \\(n\\) discs is exactly \\(\\tfrac{18\\pi}{n^2}\\). The exact value is \\(V=\\pi\\int_{-3}^{3}(9-x^2)\\,dx=\\pi\\left[9x-\\tfrac{x^3}{3}\\right]_{-3}^{3}=\\pi(18+18)=36\\pi\\).',
            ),
            text(
                'Funkcija \\(\\pi(9-x^2)\\) je konkavna, sredinsko pravilo za konkavne funkcije precenjuje, zato je vsota nad natančno vrednostjo; pri \\(f(x)=x^2\\) je bila funkcija pod integralom konveksna in vsota pod njo. Smer napake sredinske vsote torej ni splošno pravilo, ampak je odvisna od funkcije; vsote diskov so približki. Vrstica Prostornina (mreža) je približno \\(110{,}27559\\), pod natančno vrednostjo: to je vrednost mreže, ne vsota diskov.',
                'The function \\(\\pi(9-x^2)\\) is concave and the midpoint rule overestimates concave functions, so the sum is above the exact value; for \\(f(x)=x^2\\) the integrand was convex and the sum was below it. So the direction of the error of the midpoint sum is not a general rule but depends on the function; the sums of discs are approximations. The row Volume (mesh) is about \\(110{,}27559\\), below the exact value: that is the value of the mesh, not the sum of the discs.',
            ),
        ],
        scene: solidsRevolveScene('sv5-sphere-scene', SV5_SPHERE,
            'Krogla, način Vrtenina, os \\(x\\), Število diskov \\(6\\): Vsota diskov približno \\(114{,}66813\\), Prostornina (natančno) približno \\(113{,}09734\\).',
            'Sphere, mode Solid of revolution, \\(x\\) axis, Number of discs \\(6\\): Sum of discs about \\(114{,}66813\\), Volume (exact) about \\(113{,}09734\\).'),
    }),
    step({
        id: 'sv5-axis', order: 5,
        declare: f({highlight: ['volume-exact', 'disc-sum'], uses: ['solids-axis']}),
        title: text('Izbira osi vrtenja', 'The choice of the axis of rotation'),
        purpose: text(
            'Napovedati, kako izbira osi vrtenja spremeni prostornino vrtenine istega območja.',
            'Predicting how the choice of the axis of rotation changes the volume of the solid of revolution of the same region.',
        ),
        explanation: text(
            'Graf kaže območje pod \\(f(x)=x^2\\) na \\([0,1]\\), zavrteno okoli osi \\(x\\) (Os vrtenja je os x), Število diskov \\(10\\); prostornina je \\(\\tfrac\\pi5\\approx0{,}62832\\). Os vrtenja je izbira: isto območje lahko zavrtimo tudi okoli osi \\(y\\) in dobimo drugo vrtenino. Zapiši napoved: ali bo prostornina vrtenine okoli osi \\(y\\) večja ali manjša od prostornine okoli osi \\(x\\) in približno kolikokrat? Utemelji z obliko območja: kje leži glede na vsako od obeh osi?',
            'The graph shows the region under \\(f(x)=x^2\\) on \\([0,1]\\), turned about the \\(x\\) axis (Axis of rotation is x-axis), Number of discs \\(10\\); the volume is \\(\\tfrac\\pi5\\approx0{,}62832\\). The axis of rotation is a choice: the same region can also be turned about the \\(y\\) axis and gives another solid of revolution. Write down a prediction: will the volume of the solid about the \\(y\\) axis be larger or smaller than the volume about the \\(x\\) axis, and about how many times? Give a reason from the shape of the region: where does it lie relative to each of the two axes?',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Os vrtenja nastavi na os y. Preberi vrstici Prostornina (natančno) in Vsota obročev (vrstica Vsota diskov se preimenuje) ter primerjaj z napovedjo.',
            'Set Axis of rotation to y-axis. Read the rows Volume (exact) and Sum of washers (the row Sum of discs is renamed) and compare with your prediction.',
        ),
        expectedObservations: [
            text(
                'Okoli osi \\(y\\) je natančna prostornina \\(\\tfrac\\pi2\\approx1{,}5708\\), to je \\(\\tfrac{\\pi/2}{\\pi/5}=\\tfrac52\\), torej \\(2{,}5\\)-krat toliko kot okoli osi \\(x\\). V grobem: težišče območja je v točki \\(\\left(\\tfrac34,\\tfrac3{10}\\right)\\), torej dlje od osi \\(y\\) kot od osi \\(x\\); večja razdalja od osi vrtenja da večje preseke.',
                'About the \\(y\\) axis the exact volume is \\(\\tfrac\\pi2\\approx1{,}5708\\), that is \\(\\tfrac{\\pi/2}{\\pi/5}=\\tfrac52\\), so \\(2{,}5\\) times as much as about the \\(x\\) axis. Roughly: the centroid of the region is the point \\(\\left(\\tfrac34,\\tfrac3{10}\\right)\\), so farther from the \\(y\\) axis than from the \\(x\\) axis; a larger distance from the axis of rotation gives larger sections.',
            ),
            text(
                'Izračun: pri višini \\(y\\) je presek obroč z zunanjim polmerom \\(1\\) in notranjim polmerom \\(\\sqrt y\\), ploščine \\(\\pi(1-y)\\), zato je \\(V=\\pi\\int_0^1(1-y)\\,dy=\\pi\\left(1-\\tfrac12\\right)=\\tfrac\\pi2\\). Enako dajo lupine: \\(2\\pi\\int_0^1 x\\cdot x^2\\,dx=2\\pi\\cdot\\tfrac14=\\tfrac\\pi2\\).',
                'The computation: at height \\(y\\) the section is a washer with outer radius \\(1\\) and inner radius \\(\\sqrt y\\), of area \\(\\pi(1-y)\\), so \\(V=\\pi\\int_0^1(1-y)\\,dy=\\pi\\left(1-\\tfrac12\\right)=\\tfrac\\pi2\\). Shells give the same: \\(2\\pi\\int_0^1 x\\cdot x^2\\,dx=2\\pi\\cdot\\tfrac14=\\tfrac\\pi2\\).',
            ),
            text(
                'Vsota obročev je približno \\(1{,}5708\\) in se ujema z natančno vrednostjo pri vsakem številu diskov: funkcija \\(\\pi(1-y)\\) je linearna, sredinsko pravilo je zanjo natančno. Vrstica Prostornina (mreža) je približno \\(1{,}57869\\), nekoliko nad natančno vrednostjo, in je vrednost mreže, ne vsota. Vrtenina okoli osi \\(y\\) je podobna skledi.',
                'The sum of washers is about \\(1{,}5708\\) and agrees with the exact value at every number of discs: the function \\(\\pi(1-y)\\) is linear and the midpoint rule is exact for it. The row Volume (mesh) is about \\(1{,}57869\\), slightly above the exact value, and is the value of the mesh, not the sum. The solid about the \\(y\\) axis looks like a bowl.',
            ),
        ],
        scene: solidsRevolveScene('sv5-axis-scene', SV5_AXIS,
            'Vrtenina funkcije x², način Vrtenina, Os vrtenja os \\(x\\), Število diskov \\(10\\): Vsota diskov približno \\(0{,}62309\\), Prostornina (natančno) približno \\(0{,}62832\\).',
            'Revolution of x², mode Solid of revolution, Axis of rotation x-axis, Number of discs \\(10\\): Sum of discs about \\(0{,}62309\\), Volume (exact) about \\(0{,}62832\\).'),
    }),
    step({
        id: 'sv5-free', order: 6,
        declare: f({highlight: ['volume-mesh', 'volume-exact', 'disc-sum'], uses: ['solids-axis', 'solids-discs']}),
        title: text('Prosto raziskovanje', 'Free exploration'),
        purpose: text(
            'Sami preizkusiti, kaj izbira telesa, osi in števila diskov spremeni.',
            'Trying what the choice of the solid, the axis and the number of discs change.',
        ),
        explanation: text(
            'Graf kaže \\(f(x)=\\sqrt x\\) na \\([0,4]\\), vrtenje okoli osi \\(x\\), Število diskov \\(10\\): prostornina je \\(8\\pi\\approx25{,}13274\\) in vsota diskov se z njo ujema. Zapiši napoved, preden kaj spremeniš: kaj se zgodi, če Os vrtenja nastaviš na os y? Ali bo natančna prostornina večja ali manjša od \\(8\\pi\\)? Ali se bo vsota obročev spet ujemala z njo? Utemelji, nato poskusi.',
            'The graph shows \\(f(x)=\\sqrt x\\) on \\([0,4]\\), turned about the \\(x\\) axis, Number of discs \\(10\\): the volume is \\(8\\pi\\approx25{,}13274\\) and the sum of the discs agrees with it. Write down a prediction before you change anything: what happens if you set Axis of rotation to y-axis? Will the exact volume be larger or smaller than \\(8\\pi\\)? Will the sum of washers agree with it again? Give a reason, then try.',
        ),
        formulaIds: [],
        observationPrompt: text(
            'Preizkusi Os vrtenja (os x, os y), Število diskov (od \\(1\\) do \\(60\\)) in izbiro Telo (Vrtenina funkcije √x, Vrtenina funkcije x², Krogla). Pri vsaki spremembi preberi vrstice Prostornina in vsoto ter primerjaj z napovedjo.',
            'Try Axis of rotation (x-axis, y-axis), Number of discs (from \\(1\\) to \\(60\\)) and the choice Solid (Revolution of √x, Revolution of x², Sphere). After each change read the Volume rows and the sum and compare with your prediction.',
        ),
        expectedObservations: [text(
            'Okoli osi \\(y\\) je natančna prostornina \\(\\tfrac{128\\pi}{5}\\approx80{,}42477\\), to je \\(\\tfrac{16}{5}\\) prostornine \\(8\\pi\\): pri višini \\(y\\) je presek obroč z zunanjim polmerom \\(4\\) in notranjim polmerom \\(y^2\\), zato \\(V=\\pi\\int_0^2(16-y^4)\\,dy=\\pi\\left(32-\\tfrac{32}{5}\\right)\\). Vsota obročev je približno \\(80{,}59203\\) pri \\(10\\) in približno \\(80{,}42943\\) pri \\(60\\) obročih: nad natančno vrednostjo in se ji približuje, ne ujema se več natančno, ker \\(16-y^4\\) ni linearna funkcija. Krogla se vrti le okoli osi \\(x\\).',
            'About the \\(y\\) axis the exact volume is \\(\\tfrac{128\\pi}{5}\\approx80{,}42477\\), that is \\(\\tfrac{16}{5}\\) of the volume \\(8\\pi\\): at height \\(y\\) the section is a washer with outer radius \\(4\\) and inner radius \\(y^2\\), so \\(V=\\pi\\int_0^2(16-y^4)\\,dy=\\pi\\left(32-\\tfrac{32}{5}\\right)\\). The sum of washers is about \\(80{,}59203\\) at \\(10\\) and about \\(80{,}42943\\) at \\(60\\) washers: above the exact value and approaching it, no longer agreeing exactly, because \\(16-y^4\\) is not a linear function. The sphere is rotated about the \\(x\\) axis only.',
        )],
        scene: solidsRevolveScene('sv5-free-scene', SV5_FREE,
            'Vrtenina funkcije √x, način Vrtenina, os \\(x\\), Število diskov \\(10\\): Vsota diskov približno \\(25{,}13274\\), Prostornina (natančno) približno \\(25{,}13274\\).',
            'Revolution of √x, mode Solid of revolution, \\(x\\) axis, Number of discs \\(10\\): Sum of discs about \\(25{,}13274\\), Volume (exact) about \\(25{,}13274\\).'),
    }),
];

const sv5Sources: GuidedLesson['sources'] = [
    {
        id: 'bezeg-solids-implementation-sv5',
        citation: 'Bezeg source: src/solids/ (the revolved mesh, the midpoint disc and washer sums, the exact volumes) and src/graphs/solids/SolidsGraph.tsx, revolve mode.',
        implementationCorrespondence: 'A scene sets the mode, the solid, the axis, the number of discs and the camera preset; the disc sum is the midpoint rule on the profile, the washer sum its counterpart about the y axis, the exact values come from the integrals, the mesh volume from the drawn mesh.',
    },
];

const sv5EdgeCases: readonly LocalizedText[] = [
    text('Krogla se vrti le okoli osi x; pri njej Os vrtenja os y ni ponujena. Število diskov je od \\(1\\) do \\(60\\).', 'The sphere is rotated about the x axis only; for it the axis y-axis is not offered. Number of discs runs from \\(1\\) to \\(60\\).'),
    text('Vrstica Prostornina (mreža) je vrednost narisane mreže (\\(48\\)-kotniki, profil iz tetiv), ne vsota diskov; lahko je pod ali nad natančno vrednostjo in se s številom diskov ne spreminja.', 'The row Volume (mesh) is the value of the drawn mesh (\\(48\\)-gons, a profile of chords), not the sum of the discs; it can be below or above the exact value and does not change with the number of discs.'),
    text('Sredinska vsota je za linearno funkcijo \\(\\pi f(x)^2\\) natančna (\\(\\sqrt x\\) okoli osi \\(x\\), \\(x^2\\) okoli osi \\(y\\)); drugje je približek, ki je lahko pod ali nad natančno vrednostjo.', 'The midpoint sum is exact for a linear function \\(\\pi f(x)^2\\) (\\(\\sqrt x\\) about the \\(x\\) axis, \\(x^2\\) about the \\(y\\) axis); elsewhere it is an approximation that can be below or above the exact value.'),
];

const solidsRevolution: GuidedLesson = {
    demonstrationId: 'solids',
    title: text('Vrtenine in njihova prostornina', 'Solids of revolution and their volume'),
    summary: text(
        'Območje pod grafom funkcije zavrtimo okoli osi, telo razrežemo na diske s ploščino \\(\\pi f(x)^2\\), vsoto diskov primerjamo z integralom in preizkusimo, kako izbira osi vrtenja spremeni telo.',
        'The region under the graph of a function is turned about an axis, the solid is cut into discs of area \\(\\pi f(x)^2\\), the sum of the discs is compared with the integral, and we try how the choice of the axis of rotation changes the solid.',
    ),
    prerequisites: [text('Ploščina kroga, določeni integral kot ploščina pod grafom in sredinska vsota.', 'The area of a circle, the definite integral as the area under a graph, and the midpoint sum.')],
    learningGoals: [
        text('Znaš povedati, da ima vrtenina okoli osi \\(x\\) krožne preseke s polmerom \\(f(x)\\) in da je prostornina \\(\\pi\\int_a^b f(x)^2\\,dx\\).', 'Can say that a solid of revolution about the \\(x\\) axis has circular sections of radius \\(f(x)\\) and that its volume is \\(\\pi\\int_a^b f(x)^2\\,dx\\).'),
        text('Znaš prebrati, da je vsota diskov približek, katerega smer napake je odvisna od funkcije, in da izbira osi vrtenja spremeni telo.', 'Can read that the sum of the discs is an approximation whose direction of error depends on the function, and that the choice of the axis of rotation changes the solid.'),
    ],
    formulaBlocks: formulas,
    workedExamples: [],
    steps: sv5Steps,
    sources: sv5Sources,
    edgeCases: sv5EdgeCases,
    unresolvedQuestions: [],
};

export const solidsRevolutionLesson: GuidedLesson = solidsRevolution;
