/**
 * K4 of the Projective geometry and conics family (docs/specs/projective-conics-lessons.md, section K4), on `projective-five-point`: a conic
 * through five points as a rational quadratic Bezier arc. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot
 * lesson text"). Every point, equation and value it quotes belongs to the scene of its step; `projectiveFivePointLesson.test.ts` recomputes
 * them with exact fractions and floating point of its own, without the projective kernel, and checks them against the real graph. Scenes use
 * only the `five-point-*` operations of the `projective` action, and every scene sets everything it states (the example and the
 * extrapolation toggle), so it does not depend on the scene before it. The lesson model has no lesson-to-lesson link field, so step 6 names
 * the `circle` lesson and its `MIN_CIRCLE_PIECES` note in prose only.
 */
import type {LessonAction} from '../model';
import type {FivePointExampleId} from '../../graphs/projective/fivePointModel';
import type {GuidedLesson, GuidedLessonFrameKind, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frameOf = (id: string, kind: GuidedLessonFrameKind) => ({id, kind});

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
    frames: [frameOf(`${content.id}-explanation`, 'explanation'), frameOf(`${content.id}-observation`, 'observation')],
});

type FivePointSceneOperation = Extract<LessonAction, {kind: 'projective'; operation: 'five-point-set-end' | 'five-point-set-third' | 'five-point-place'}>;

/**
 * A K4 scene from the default scene: load the example, set the extrapolation toggle (the example does not reset it), then the end and
 * third-point choices (FivePointGraph's own control actions).
 */
const fivePointScene = (
    id: string, example: FivePointExampleId, extrapolation: boolean, operations: readonly FivePointSceneOperation[], sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'projective', operation: 'five-point-load-example', exampleId: example},
        {kind: 'projective', operation: 'five-point-set-extrapolation', on: extrapolation},
        ...operations,
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const ELLIPSE_POINTS_SL = '\\(A=(5,0)\\), \\(B=(0,3)\\), \\(C=(-5,0)\\), \\(D=(4,\\tfrac95)\\) in \\(E=(-3,\\tfrac{12}5)\\)';
const ELLIPSE_POINTS_EN = '\\(A=(5,0)\\), \\(B=(0,3)\\), \\(C=(-5,0)\\), \\(D=(4,\\tfrac95)\\) and \\(E=(-3,\\tfrac{12}5)\\)';

export const fivePointLesson: GuidedLesson = {
    demonstrationId: 'projective-five-point',
    title: text('Stožnica skozi pet točk', 'A conic through five points'),
    summary: text(
        'Skozi pet točk ravnine, od katerih nobene tri ne ležijo na isti premici, poteka natanko ena stožnica. Lok te stožnice med dvema izmed točk je racionalna kvadratna Bézierova krivulja s krajnima utežema \\(1\\): srednja kontrolna točka \\(P_1\\) je pol tetive, torej presečišče tangent v krajiščih, utež \\(w\\) pa določi tretja točka. Farinovi točki in točka loka pri \\(t=\\tfrac12\\) sta konstrukcije iz lekcije o Farinovih točkah. Utež \\(w<1\\) da elipso, \\(w=1\\) parabolo in \\(w>1\\) hiperbolo, pri kateri se lok nadaljuje skozi točko v neskončnosti. Če tri točke ležijo na isti premici, je edina stožnica par premic; pri štirih je stožnic cel šop.',
        'Through five points of the plane, no three on a line, passes exactly one conic. Its arc between two of the points is a rational quadratic Bézier curve with end weights \\(1\\): the middle control point \\(P_1\\) is the pole of the chord, that is the meeting point of the end tangents, and the weight \\(w\\) comes from a third point. The Farin points and the arc point at \\(t=\\tfrac12\\) are the constructions of the Farin lesson. A weight \\(w<1\\) gives an ellipse, \\(w=1\\) a parabola and \\(w>1\\) a hyperbola, where the arc continues through a point at infinity. If three points lie on a line, the only conic is a line pair; with four there is a whole pencil of conics.',
    ),
    prerequisites: [
        text('Lekciji o Farinovih točkah in o krožnici (racionalna Bézierova krivulja, utež, Farinova točka); priporočen je most iz lekcije o stožnicah v šolskih grafih funkcij, ki ima za četrtino elipse isto utež \\(\\tfrac{\\sqrt2}2\\).', 'The Farin-points and circle lessons (rational Bézier curve, weight, Farin point); the bridge of the school function graphs conics lesson, which has the same weight \\(\\tfrac{\\sqrt2}2\\) for a quarter ellipse, is recommended.'),
    ],
    learningGoals: [
        text('Veš, da pet točk, od katerih nobene tri niso na premici, določa natanko eno stožnico, in da se ta stožnica izrodi v par premic, ko so tri točke na premici.', 'State that five points, no three on a line, determine exactly one conic, and that the conic becomes a line pair when three points are on a line.'),
        text('Iz krajišč loka poiščeš \\(P_1\\) kot presečišče tangent in iz tretje točke utež \\(w\\), nato Farinovi točki in točko loka pri \\(t=\\tfrac12\\).', 'From the ends of an arc find \\(P_1\\) as the meeting point of the tangents and the weight \\(w\\) from a third point, then the Farin points and the arc point at \\(t=\\tfrac12\\).'),
        text('Povežeš utež z vrsto stožnice (\\(w<1\\), \\(w=1\\), \\(w>1\\)) in poveš, da en lok pokrije le eno stran stožnice, preostanek pa je nadaljevanje krivulje.', 'Connect the weight with the type of conic (\\(w<1\\), \\(w=1\\), \\(w>1\\)) and state that one arc covers only one side of the conic, the rest being the continuation of the curve.'),
    ],
    formulaBlocks: [
        {
            id: 'five-point-conic',
            latex: 'c_1x^2+c_2xy+c_3y^2+c_4x+c_5y+c_6=0',
            notation: text(
                'Splošna enačba stožnice s koeficienti \\(c_1,\\dots,c_6\\), ki so določeni do skupnega faktorja. Vsaka od petih točk da eno linearno enačbo za koeficiente.',
                'The general equation of a conic with coefficients \\(c_1,\\dots,c_6\\), determined up to a common factor. Each of the five points gives one linear equation for the coefficients.',
            ),
            explanation: text(
                'Izrek (pet točk): skozi pet točk ravnine, od katerih nobene tri ne ležijo na isti premici, poteka natanko ena stožnica; koeficienti so poddeterminante \\(5\\times5\\) matrike s petimi vrsticami \\((x^2,xy,y^2,x,y,1)\\). Izrek je naveden po temi stožnice iz učnega načrta FMF in po Coxeterju (viri spodaj); lekcija ga ne dokazuje, premikanje točk v grafu je ilustracija, ne dokaz. Graf poddeterminante izračuna natančno s celimi števili.',
                'Theorem (five points): through five points of the plane, no three on a line, passes exactly one conic; its coefficients are the minors of the \\(5\\times5\\) matrix with the five rows \\((x^2,xy,y^2,x,y,1)\\). The theorem is quoted from the conics topic of the FMF syllabus and from Coxeter (sources below); the lesson does not prove it, and moving the points on the graph is an illustration, not a proof. The graph computes the minors exactly with integers.',
            ),
        },
        {
            id: 'five-point-rational',
            latex: 'R(t)=\\frac{(1-t)^2P_0+2w\\,t(1-t)P_1+t^2P_2}{(1-t)^2+2w\\,t(1-t)+t^2}',
            notation: text(
                'Racionalna kvadratna Bézierova krivulja s kontrolnimi točkami \\(P_0,P_1,P_2\\) in utežmi \\(1,w,1\\). Njen imenovalec je \\(2(1-w)t^2-2(1-w)t+1\\).',
                'The rational quadratic Bézier curve with control points \\(P_0,P_1,P_2\\) and weights \\(1,w,1\\). Its denominator is \\(2(1-w)t^2-2(1-w)t+1\\).',
            ),
            explanation: text(
                'Lok stožnice med \\(P_0\\) in \\(P_2\\) je ta krivulja natanko takrat, ko je \\(P_1\\) presečišče tangent v \\(P_0\\) in \\(P_2\\) in je utež \\(w\\) takšna, da krivulja poteka skozi tretjo točko stožnice. Pri \\(w<1\\) je stožnica elipsa, pri \\(w=1\\) parabola in pri \\(w>1\\) hiperbola. Za \\(t\\in[0,1]\\) lok leži v trikotniku \\(P_0P_1P_2\\), torej na eni strani stožnice.',
                'The arc of the conic between \\(P_0\\) and \\(P_2\\) is this curve exactly when \\(P_1\\) is the meeting point of the tangents at \\(P_0\\) and \\(P_2\\) and the weight \\(w\\) makes the curve pass through a third point of the conic. For \\(w<1\\) the conic is an ellipse, for \\(w=1\\) a parabola and for \\(w>1\\) a hyperbola. For \\(t\\in[0,1]\\) the arc lies in the triangle \\(P_0P_1P_2\\), that is on one side of the conic.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'k4-default-weight',
            title: text('Utež iz razmerja na daljici \\(MP_1\\)', 'The weight from the ratio on the segment \\(MP_1\\)'),
            calculationLatex: '\\lambda=\\sqrt2-1,\\quad w=\\frac{\\lambda}{1-\\lambda}',
            resultLatex: 'w=\\frac{\\sqrt2}2',
            check: text(
                'Središče tetive \\(P_0P_2\\) je \\(M=(\\tfrac52,\\tfrac32)\\). Točka loka pri \\(t=\\tfrac12\\) leži na daljici od \\(M\\) do \\(P_1=(5,3)\\) v razmerju \\(\\lambda=\\sqrt2-1\\), zato je \\(w=\\tfrac{\\lambda}{1-\\lambda}=\\tfrac{\\sqrt2-1}{2-\\sqrt2}=\\tfrac1{\\sqrt2}=\\tfrac{\\sqrt2}2\\).',
                'The midpoint of the chord \\(P_0P_2\\) is \\(M=(\\tfrac52,\\tfrac32)\\). The arc point at \\(t=\\tfrac12\\) lies on the segment from \\(M\\) to \\(P_1=(5,3)\\) at the ratio \\(\\lambda=\\sqrt2-1\\), so \\(w=\\tfrac{\\lambda}{1-\\lambda}=\\tfrac{\\sqrt2-1}{2-\\sqrt2}=\\tfrac1{\\sqrt2}=\\tfrac{\\sqrt2}2\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'five-point-predict', order: 1,
            title: text('Pet točk', 'Five points'),
            purpose: text('Napovedati, koliko stožnic poteka skozi pet točk, preden jo narišemo.', 'Predicting how many conics pass through five points before one is drawn.'),
            explanation: text(
                `Na ravnini je pet točk ${ELLIPSE_POINTS_SL}; nobene tri ne ležijo na isti premici. Skozi dve točki poteka ena premica, skozi tri točke ena krožnica. Napovej, koliko stožnic poteka skozi vseh pet točk in kakšne vrste je.`,
                `Five points of the plane are given: ${ELLIPSE_POINTS_EN}; no three lie on a line. Through two points passes one line, through three points one circle. Predict how many conics pass through all five points and of what kind it is.`,
            ),
            formulaIds: ['five-point-conic'],
            observationPrompt: text('Preberi stanje pod petimi točkami.', 'Read the status under the five points.'),
            expectedObservations: [text('Stanje pravi, da pet točk določa natanko eno stožnico.', 'The status says that the five points determine exactly one conic.')],
            scene: fivePointScene('five-point-predict-scene', 'ellipse', false, [],
                `Pet točk ${ELLIPSE_POINTS_SL}, skozi katere poteka natanko ena stožnica.`,
                `The five points ${ELLIPSE_POINTS_EN}, through which exactly one conic passes.`),
        }),
        step({
            id: 'five-point-conic', order: 2,
            title: text('Rešilnik nariše stožnico', 'The solver draws the conic'),
            purpose: text('Videti, da je stožnica skozi pet točk enolična in jo odčitati.', 'Seeing that the conic through five points is unique and reading it.'),
            explanation: text(
                'Rešilnik iz petih točk z natančnimi celoštevilskimi determinantami izračuna koeficiente in jih normira. Stožnica je \\(9x^2+25y^2=225\\), to je \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\), elipsa. Preveri dve točki: za \\(D\\) je \\(9\\cdot4^2+25\\cdot(\\tfrac95)^2=144+81=225\\), za \\(E\\) pa \\(9\\cdot(-3)^2+25\\cdot(\\tfrac{12}5)^2=81+144=225\\).',
                'The solver computes the coefficients from the five points with exact integer determinants and normalizes them. The conic is \\(9x^2+25y^2=225\\), that is \\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\), an ellipse. Check two points: for \\(D\\), \\(9\\cdot4^2+25\\cdot(\\tfrac95)^2=144+81=225\\), and for \\(E\\), \\(9\\cdot(-3)^2+25\\cdot(\\tfrac{12}5)^2=81+144=225\\).',
            ),
            formulaIds: ['five-point-conic'],
            observationPrompt: text('Preberi enačbo stožnice v seznamu.', 'Read the equation of the conic in the list.'),
            expectedObservations: [text('Seznam navede stožnico (elipsa) z enačbo \\(9x^2+25y^2-225=0\\).', 'The list gives the conic (ellipse) with the equation \\(9x^2+25y^2-225=0\\).')],
            scene: fivePointScene('five-point-conic-scene', 'ellipse', false, [],
                'Elipsa \\(9x^2+25y^2=225\\) skozi vseh pet točk.',
                'The ellipse \\(9x^2+25y^2=225\\) through all five points.'),
        }),
        step({
            id: 'five-point-ends', order: 3,
            title: text('Krajišči loka, tangenti in točka \\(P_1\\)', 'The arc ends, the tangents and the point \\(P_1\\)'),
            purpose: text('Izbrati dve točki za krajišči loka in najti srednjo kontrolno točko.', 'Choosing two points as the ends of an arc and finding the middle control point.'),
            explanation: text(
                'Za krajišči loka izberemo \\(A\\) in \\(B\\); to sta \\(P_0=(5,0)\\) in \\(P_2=(0,3)\\). Tangenta elipse v točki \\((x_0,y_0)\\) ima enačbo \\(\\tfrac{x\\,x_0}{25}+\\tfrac{y\\,y_0}9=1\\): v \\(A\\) je to \\(x=5\\), v \\(B\\) pa \\(y=3\\). Tangenti se sekata v \\(P_1=(5,3)\\), ki je pol tetive \\(AB\\). Kontrolni trikotnik je \\(P_0P_1P_2\\).',
                'Choose \\(A\\) and \\(B\\) as the ends of the arc; they are \\(P_0=(5,0)\\) and \\(P_2=(0,3)\\). The tangent of the ellipse at the point \\((x_0,y_0)\\) has the equation \\(\\tfrac{x\\,x_0}{25}+\\tfrac{y\\,y_0}9=1\\): at \\(A\\) it is \\(x=5\\), at \\(B\\) it is \\(y=3\\). The tangents meet at \\(P_1=(5,3)\\), the pole of the chord \\(AB\\). The control triangle is \\(P_0P_1P_2\\).',
            ),
            formulaIds: ['five-point-rational'],
            observationPrompt: text('Preberi kontrolne točke v seznamu.', 'Read the control points in the list.'),
            expectedObservations: [text('Seznam navede \\(P_0=(5,0)\\), \\(P_1=(5,3)\\) in \\(P_2=(0,3)\\).', 'The list gives \\(P_0=(5,0)\\), \\(P_1=(5,3)\\) and \\(P_2=(0,3)\\).')],
            scene: fivePointScene('five-point-ends-scene', 'ellipse', false, [
                {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 0},
                {kind: 'projective', operation: 'five-point-set-end', which: 'b', index: 1},
            ],
                'Lok od \\(A\\) do \\(B\\) z \\(P_0=(5,0)\\), \\(P_1=(5,3)\\) in \\(P_2=(0,3)\\).',
                'The arc from \\(A\\) to \\(B\\) with \\(P_0=(5,0)\\), \\(P_1=(5,3)\\) and \\(P_2=(0,3)\\).'),
        }),
        step({
            id: 'five-point-weight', order: 4,
            title: text('Tretja točka da utež', 'A third point gives the weight'),
            purpose: text('Iz tretje točke določiti utež in z njo Farinovi točki ter točko loka pri \\(t=\\tfrac12\\).', 'Finding the weight from a third point, and with it the Farin points and the arc point at \\(t=\\tfrac12\\).'),
            explanation: text(
                'Tretja točka \\(D\\) leži na loku in določi utež: krivulja z \\(P_0\\), \\(P_1\\), \\(P_2\\) poteka skozi \\(D\\) natanko pri \\(w=\\tfrac{\\sqrt2}2\\approx0{,}7071\\). To je utež iz mostu v lekciji o stožnicah za četrtino elipse s kontrolnimi točkami \\((5,0)\\), \\((5,3)\\), \\((0,3)\\) in utežmi \\(1,\\tfrac{\\sqrt2}2,1\\). Farinovi točki sta \\(F_1=(5,3\\sqrt2-3)\\approx(5;\\ 1{,}2426)\\) in \\(F_2=(5\\sqrt2-5,3)\\approx(2{,}0711;\\ 3)\\); njuna sredina je točka loka pri \\(t=\\tfrac12\\), \\(S=(\\tfrac{5\\sqrt2}2,\\tfrac{3\\sqrt2}2)\\approx(3{,}5355;\\ 2{,}1213)\\).',
                'The third point \\(D\\) lies on the arc and fixes the weight: the curve with \\(P_0\\), \\(P_1\\), \\(P_2\\) passes through \\(D\\) exactly for \\(w=\\tfrac{\\sqrt2}2\\approx0.7071\\). This is the weight of the bridge in the conics lesson for a quarter ellipse with the control points \\((5,0)\\), \\((5,3)\\), \\((0,3)\\) and the weights \\(1,\\tfrac{\\sqrt2}2,1\\). The Farin points are \\(F_1=(5,3\\sqrt2-3)\\approx(5,\\ 1.2426)\\) and \\(F_2=(5\\sqrt2-5,3)\\approx(2.0711,\\ 3)\\); their midpoint is the arc point at \\(t=\\tfrac12\\), \\(S=(\\tfrac{5\\sqrt2}2,\\tfrac{3\\sqrt2}2)\\approx(3.5355,\\ 2.1213)\\).',
            ),
            formulaIds: ['five-point-rational'],
            workedExampleId: 'k4-default-weight',
            observationPrompt: text('Preberi utež in Farinovi točki v seznamu.', 'Read the weight and the Farin points in the list.'),
            expectedObservations: [text('Utež je \\(w\\approx0{,}7071\\) z \\(w^2=\\tfrac12\\), in graf pravi, da je \\(w<1\\) lok elipse.', 'The weight is \\(w\\approx0.7071\\) with \\(w^2=\\tfrac12\\), and the graph says that \\(w<1\\) is an arc of an ellipse.')],
            scene: fivePointScene('five-point-weight-scene', 'ellipse', false, [
                {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 0},
                {kind: 'projective', operation: 'five-point-set-end', which: 'b', index: 1},
                {kind: 'projective', operation: 'five-point-set-third', index: 3},
            ],
                'Utež \\(w=\\tfrac{\\sqrt2}2\\) iz tretje točke \\(D\\), Farinovi točki \\(F_1\\approx(5;\\ 1{,}2426)\\) in \\(F_2\\approx(2{,}0711;\\ 3)\\) ter točka loka \\(S\\approx(3{,}5355;\\ 2{,}1213)\\).',
                'The weight \\(w=\\tfrac{\\sqrt2}2\\) from the third point \\(D\\), the Farin points \\(F_1\\approx(5,\\ 1.2426)\\) and \\(F_2\\approx(2.0711,\\ 3)\\) and the arc point \\(S\\approx(3.5355,\\ 2.1213)\\).'),
        }),
        step({
            id: 'five-point-bezier', order: 5,
            title: text('Lok je Bézierova krivulja', 'The arc is a Bézier curve'),
            purpose: text('Primerjati racionalno Bézierovo krivuljo s stožnico in videti, da lok pokrije le eno stran.', 'Comparing the rational Bézier curve with the conic and seeing that the arc covers only one side.'),
            explanation: text(
                'Racionalna kvadratna Bézierova krivulja s kontrolnimi točkami \\(P_0=(5,0)\\), \\(P_1=(5,3)\\), \\(P_2=(0,3)\\) in utežmi \\(1,\\tfrac{\\sqrt2}2,1\\) je narisana čez stožnico. Graf poroča največji odmik na \\(200\\) vzorcih; to je vzorčni preizkus, ne dokaz, in je pod \\(10^{-9}\\). Lok je le ena stran stožnice, znotraj trikotnika \\(P_0P_1P_2\\). Dopolnilni lok je nadaljevanje iste krivulje za \\(t\\) zunaj \\([0,1]\\); pri vklopljenem nadaljevanju je narisan črtkano.',
                'The rational quadratic Bézier curve with the control points \\(P_0=(5,0)\\), \\(P_1=(5,3)\\), \\(P_2=(0,3)\\) and the weights \\(1,\\tfrac{\\sqrt2}2,1\\) is drawn over the conic. The graph reports the largest deviation over \\(200\\) samples; this is a sampled check, not a proof, and it is below \\(10^{-9}\\). The arc is only one side of the conic, inside the triangle \\(P_0P_1P_2\\). The complementary arc is the continuation of the same curve for \\(t\\) outside \\([0,1]\\); with the continuation switched on it is drawn dashed.',
            ),
            formulaIds: ['five-point-rational'],
            observationPrompt: text('Preberi odmik in poglej črtkani dopolnilni lok.', 'Read the deviation and look at the dashed complementary arc.'),
            expectedObservations: [text('Odmik je naveden kot vzorčni preizkus in je pod \\(10^{-9}\\); črtkani del je dopolnilni lok stožnice.', 'The deviation is given as a sampled check and is below \\(10^{-9}\\); the dashed part is the complementary arc of the conic.')],
            scene: fivePointScene('five-point-bezier-scene', 'ellipse', true, [
                {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 0},
                {kind: 'projective', operation: 'five-point-set-end', which: 'b', index: 1},
            ],
                'Lok od \\(P_0=(5,0)\\) do \\(P_2=(0,3)\\) čez elipso, odmik pod \\(10^{-9}\\) na \\(200\\) vzorcih in dopolnilni lok kot nadaljevanje (črtkano).',
                'The arc from \\(P_0=(5,0)\\) to \\(P_2=(0,3)\\) over the ellipse, a deviation below \\(10^{-9}\\) over \\(200\\) samples and the complementary arc as the continuation (dashed).'),
        }),
        step({
            id: 'five-point-parallel', order: 6,
            title: text('Vzporedni tangenti', 'Parallel tangents'),
            purpose: text('Videti, da lok ni vedno en kos, in povezati to z razdelitvijo krožnice.', 'Seeing that an arc is not always one piece, and connecting this with the splitting of the circle.'),
            explanation: text(
                'Za krajišči izberi \\(A=(5,0)\\) in \\(C=(-5,0)\\). Tangenti v njiju sta \\(x=5\\) in \\(x=-5\\), vzporedni, zato je njuno presečišče \\(P_1\\) v neskončnosti: v homogenih koordinatah ima zadnjo koordinato \\(0\\). Lok ne more biti en končen kvadratni kos; graf zato ne računa s točko v neskončnosti, temveč predlaga točko med krajiščema. Enako je pri krožnici: lekcija o krožnici jo sestavi iz najmanj \\(\\mathrm{MIN\\_CIRCLE\\_PIECES}=3\\) kosov, ker bi imela pri dveh polkrožnih kosih srednji točki v neskončnosti.',
                'Choose \\(A=(5,0)\\) and \\(C=(-5,0)\\) as the ends. The tangents there are \\(x=5\\) and \\(x=-5\\), parallel, so their meeting point \\(P_1\\) is at infinity: in homogeneous coordinates its last coordinate is \\(0\\). The arc cannot be one finite quadratic piece; the graph therefore does no arithmetic with the point at infinity and suggests a point between the ends. The same holds for the circle: the circle lesson builds it from at least \\(\\mathrm{MIN\\_CIRCLE\\_PIECES}=3\\) pieces, because with two semicircle pieces the middle points would be at infinity.',
            ),
            formulaIds: ['five-point-rational'],
            observationPrompt: text('Preberi stanje, ko izbereš \\(A\\) in \\(C\\) za krajišči.', 'Read the status with \\(A\\) and \\(C\\) as the ends.'),
            expectedObservations: [text('Stanje pravi, da sta tangenti vzporedni in da lok ne more biti en končen kvadratni kos; omenja najmanjše število kosov krožnice, \\(3\\).', 'The status says that the tangents are parallel and that the arc cannot be one finite quadratic piece; it mentions the smallest number of circle pieces, \\(3\\).')],
            scene: fivePointScene('five-point-parallel-scene', 'ellipse', false, [
                {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 0},
                {kind: 'projective', operation: 'five-point-set-end', which: 'b', index: 2},
            ],
                'Krajišči \\(A=(5,0)\\) in \\(C=(-5,0)\\) z vzporednima tangentama \\(x=5\\) in \\(x=-5\\); \\(P_1\\) je v neskončnosti in lok ni en kos.',
                'The ends \\(A=(5,0)\\) and \\(C=(-5,0)\\) with the parallel tangents \\(x=5\\) and \\(x=-5\\); \\(P_1\\) is at infinity and the arc is not one piece.'),
        }),
        step({
            id: 'five-point-hyperbola', order: 7,
            title: text('Hiperbola in utež nad \\(1\\)', 'The hyperbola and a weight above \\(1\\)'),
            purpose: text('Videti, da utež nad \\(1\\) pomeni hiperbolo in da se lok nadaljuje v neskončnost.', 'Seeing that a weight above \\(1\\) means a hyperbola and that the arc runs on to infinity.'),
            explanation: text(
                'Točke ležijo na hiperboli \\(16x^2-9y^2=144\\). Lok od \\(P_0=(3,0)\\) do \\(P_2=(5,\\tfrac{16}3)\\) ima \\(P_1=(3,2)\\) in utež \\(w=\\tfrac2{\\sqrt3}\\approx1{,}1547>1\\). Imenovalec \\(2(1-w)t^2-2(1-w)t+1\\) ima realni ničli \\(t\\approx-1{,}366\\) in \\(t\\approx2{,}366\\), obe zunaj \\([0,1]\\): nadaljevanje krivulje tam doseže točko v neskončnosti. Farinovi točki in točka loka so približno \\(F_1\\approx(3;\\ 1{,}0718)\\), \\(F_2\\approx(3{,}9282;\\ 3{,}547)\\) in \\(S\\approx(3{,}4641;\\ 2{,}3094)\\). Pri \\(w=1\\) bi bil lok del parabole.',
                'The points lie on the hyperbola \\(16x^2-9y^2=144\\). The arc from \\(P_0=(3,0)\\) to \\(P_2=(5,\\tfrac{16}3)\\) has \\(P_1=(3,2)\\) and the weight \\(w=\\tfrac2{\\sqrt3}\\approx1.1547>1\\). The denominator \\(2(1-w)t^2-2(1-w)t+1\\) has the real zeros \\(t\\approx-1.366\\) and \\(t\\approx2.366\\), both outside \\([0,1]\\): the continuation of the curve reaches a point at infinity there. The Farin points and the arc point are approximately \\(F_1\\approx(3,\\ 1.0718)\\), \\(F_2\\approx(3.9282,\\ 3.547)\\) and \\(S\\approx(3.4641,\\ 2.3094)\\). For \\(w=1\\) the arc would be part of a parabola.',
            ),
            formulaIds: ['five-point-rational'],
            observationPrompt: text('Preberi utež in obe ničli imenovalca.', 'Read the weight and the two zeros of the denominator.'),
            expectedObservations: [text('Graf pravi, da je \\(w>1\\), lok se nadaljuje skozi točko v neskončnosti, ničli imenovalca pa sta \\(t\\approx-1{,}366\\) in \\(t\\approx2{,}366\\).', 'The graph says that \\(w>1\\), the arc continues through a point at infinity, and the zeros of the denominator are \\(t\\approx-1.366\\) and \\(t\\approx2.366\\).')],
            scene: fivePointScene('five-point-hyperbola-scene', 'hyperbola', true, [],
                'Hiperbola \\(16x^2-9y^2=144\\), lok od \\((3,0)\\) do \\((5,\\tfrac{16}3)\\) z \\(P_1=(3,2)\\) in \\(w=\\tfrac2{\\sqrt3}>1\\), nadaljevanje vklopljeno.',
                'The hyperbola \\(16x^2-9y^2=144\\), the arc from \\((3,0)\\) to \\((5,\\tfrac{16}3)\\) with \\(P_1=(3,2)\\) and \\(w=\\tfrac2{\\sqrt3}>1\\), the continuation switched on.'),
        }),
        step({
            id: 'five-point-line-pair', order: 8,
            title: text('Tri točke na premici: par premic', 'Three points on a line: a line pair'),
            purpose: text('Videti, da se stožnica izrodi, ko so tri točke na premici.', 'Seeing the conic degenerate when three points are on a line.'),
            explanation: text(
                'Točke so \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,0)\\) in \\(E=(0,4)\\); prve tri ležijo na premici \\(y=x\\). Edina stožnica skozi vseh pet je izrojena stožnica, par premic: premica \\(y=x\\) in premica \\(4x+3y=12\\) skozi \\(D\\) in \\(E\\). Graf jo zapiše kot \\(4x^2-xy-3y^2-12x+12y=0\\), do faktorja natanko enako kot \\((x-y)(4x+3y-12)=0\\). Determinanta \\(3\\times3\\) te enačbe je \\(0\\), zato to ni gladka stožnica in graf lok ne pripravi.',
                'The points are \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,0)\\) and \\(E=(0,4)\\); the first three lie on the line \\(y=x\\). The only conic through all five is a degenerate conic, a line pair: the line \\(y=x\\) and the line \\(4x+3y=12\\) through \\(D\\) and \\(E\\). The graph writes it as \\(4x^2-xy-3y^2-12x+12y=0\\), equal up to a factor to \\((x-y)(4x+3y-12)=0\\). The \\(3\\times3\\) determinant of this equation is \\(0\\), so it is not a smooth conic, and the graph prepares no arc.',
            ),
            formulaIds: ['five-point-conic'],
            observationPrompt: text('Preberi stanje in enačbo.', 'Read the status and the equation.'),
            expectedObservations: [text('Stanje pravi, da točke \\(A\\), \\(B\\), \\(C\\) ležijo na isti premici in da je stožnica par premic.', 'The status says that the points \\(A\\), \\(B\\), \\(C\\) lie on one line and that the conic is a line pair.')],
            scene: fivePointScene('five-point-line-pair-scene', 'three-collinear', false, [],
                'Točke \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,0)\\), \\(E=(0,4)\\); stanje je par premic \\(4x^2-xy-3y^2-12x+12y=0\\).',
                'The points \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,0)\\), \\(E=(0,4)\\); the status is a line pair \\(4x^2-xy-3y^2-12x+12y=0\\).'),
        }),
        step({
            id: 'five-point-pencil', order: 9,
            title: text('Štiri točke na premici: šop stožnic', 'Four points on a line: a pencil of conics'),
            purpose: text('Videti, da ena sama stožnica ni določena, ko so štiri točke na premici.', 'Seeing that no single conic is determined when four points are on a line.'),
            explanation: text(
                'Točke so \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,3)\\) in \\(E=(0,4)\\); prve štiri ležijo na premici \\(y=x\\). Vsak par premic, sestavljen iz premice \\(y=x\\) in poljubne premice skozi \\(E\\), poteka skozi vseh pet točk, zato je stožnic cel šop in ena sama ni določena. Vsi poddeterminanti so \\(0\\); graf ne vrne nobene stožnice, temveč stanje in navodilo, naj eno točko premakneš s premice.',
                'The points are \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,3)\\) and \\(E=(0,4)\\); the first four lie on the line \\(y=x\\). Every line pair made of the line \\(y=x\\) and any line through \\(E\\) passes through all five points, so there is a whole pencil of conics and no single one is determined. All the minors are \\(0\\); the graph returns no conic, only the status and the advice to move one point off the line.',
            ),
            formulaIds: ['five-point-conic'],
            observationPrompt: text('Preberi stanje.', 'Read the status.'),
            expectedObservations: [text('Stanje pravi, da točke \\(A\\), \\(B\\), \\(C\\), \\(D\\) ležijo na isti premici in da skozi pet točk poteka cel šop stožnic.', 'The status says that the points \\(A\\), \\(B\\), \\(C\\), \\(D\\) lie on one line and that a whole pencil of conics passes through the five points.')],
            scene: fivePointScene('five-point-pencil-scene', 'four-collinear', false, [],
                'Točke \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,3)\\), \\(E=(0,4)\\); stanje je šop stožnic, ena sama ni določena.',
                'The points \\(A=(0,0)\\), \\(B=(1,1)\\), \\(C=(2,2)\\), \\(D=(3,3)\\), \\(E=(0,4)\\); the status is a pencil of conics, no single one is determined.'),
        }),
    ],
    sources: [
        {
            id: 'fmf-five-point-syllabus',
            citation: 'Fakulteta za matematiko in fiziko, Univerza v Ljubljani, učni načrt Afina in projektivna geometrija (1Mate/2Mate 2025), tema stožnice. Cited from the syllabus topic list; not opened beyond the list.',
            implementationCorrespondence: 'The five-point theorem (one conic through five points, no three on a line; a line pair for three on a line; a pencil for four) is the statement of docs/specs/projective-conics-lessons.md section K4 and is computed by src/projective/conic.ts from exact integer minors; the lesson does not prove it.',
        },
        {
            id: 'coxeter-five-point',
            citation: 'Coxeter, H. S. M. Projective Geometry, 2nd ed., Springer, 1987, the chapters on conics. Standard text, cited and not opened.',
            implementationCorrespondence: 'The text supplies the theorem that five points determine a conic; the lesson reproduces no proof, and moving the points on the graph is labelled an illustration.',
        },
        {
            id: 'bezeg-s6-bridge',
            citation: 'Bezeg source: docs/specs/school-function-graphs-lessons.md, S6, Bridge: the quarter ellipse with control points (5,0), (5,3), (0,3) and weights 1, sqrt(2)/2, 1.',
            implementationCorrespondence: 'The weight sqrt(2)/2 of this lesson equals the weight of the S6 bridge; projectiveFivePointLesson.test.ts compares the two.',
        },
        {
            id: 'bezeg-five-point-implementation',
            citation: 'Bezeg source: src/projective/conic.ts, src/projective/rationalArc.ts, src/graphs/projective/fivePointModel.ts and src/graphs/projective/FivePointGraph.tsx.',
            implementationCorrespondence: 'A scene loads an example, sets the continuation and applies the graph\'s own end and third-point choices; the lesson text quotes only values of those scenes, and the test recomputes them without the projective kernel and checks them against the graph.',
        },
    ],
    edgeCases: [
        text('Če sta tangenti v izbranih krajiščih vzporedni, je \\(P_1\\) v neskončnosti; graf to navede in ne računa s točko v neskončnosti.', 'If the tangents at the chosen ends are parallel, \\(P_1\\) is at infinity; the graph says so and does no arithmetic with the point at infinity.'),
        text('Če tretja točka leži na dopolnilnem loku ali krajišči ležita na različnih vejah hiperbole, graf navede, katero točko izbrati drugače, in utež ne obstaja.', 'If the third point lies on the complementary arc or the ends lie on different branches of a hyperbola, the graph says which point to choose differently and the weight does not exist.'),
        text('Točke so na mreži s korakom \\(\\tfrac15\\) (primeri imajo tudi točke na mreži \\(\\tfrac1{15}\\)); ko pri vleku točke preideš skozi izrojeno lego, graf pokaže stanje in ohrani zadnjo enolično stožnico, označeno kot zastarelo.', 'The points sit on a grid of step \\(\\tfrac15\\) (the examples also use points on the grid \\(\\tfrac1{15}\\)); when a drag passes through a degenerate position, the graph shows the status and keeps the last unique conic, marked as stale.'),
    ],
    unresolvedQuestions: [],
};
