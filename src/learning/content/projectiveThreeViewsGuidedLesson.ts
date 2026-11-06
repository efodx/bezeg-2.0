/**
 * K5 of the Projective geometry and conics family (docs/specs/projective-conics-lessons.md, section K5), on `projective-three-views`: the
 * unit circle and the line L: y = c, and the image of the circle under the projective map that sends L to infinity. The text is a one-shot
 * draft (docs/specs/new-lesson-families.md, "One-shot lesson text"). Every value it quotes (c, the contact of L with the circle, the type,
 * the image equation, B^2 - 4AC, the determinant, the points at infinity, the point P and its image) belongs to the scene of its step;
 * `projectiveThreeViewsLesson.test.ts` recomputes them with exact integer arithmetic on c in tenths and checks them against the real graph.
 * Scenes use only the `three-views-*` operations of the `projective` action, and every scene sets everything it states (c, the point and,
 * when the point is shown, its angle), so it does not depend on the scene before it. The lesson model has no lesson-to-lesson link field,
 * so step 6 names the K4 lesson (weights above 1) in prose only; S6 is unreleased and is not linked.
 */
import type {LessonAction} from '../model';
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
    frames: [
        frameOf(`${content.id}-explanation`, 'explanation'),
        ...(content.workedExampleId ? [frameOf(`${content.id}-calculation`, 'calculation')] : []),
        frameOf(`${content.id}-observation`, 'observation'),
    ],
});

/**
 * A K5 scene from the default scene: the height of L in tenths, and the point P on the circle (off, or on at the given angle step of 15
 * degrees). ThreeViewsGraph's own control actions; nothing is left to the scene before.
 */
const threeViewsScene = (id: string, tenths: number, point: {readonly angle: number} | null, sl: string, en: string): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        {kind: 'projective', operation: 'three-views-set-c', tenths},
        {kind: 'projective', operation: 'three-views-set-point', on: point !== null},
        ...(point === null ? [] : [{kind: 'projective', operation: 'three-views-set-angle', step: point.angle} as const]),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

export const threeViewsLesson: GuidedLesson = {
    demonstrationId: 'projective-three-views',
    title: text('Ena stožnica, trije pogledi', 'One conic, three views'),
    summary: text(
        'Elipsa, parabola in hiperbola so ista projektivna stožnica, gledana glede na različne premice v neskončnosti. Enotsko krožnico \\(x^2+y^2=1\\) in premico \\(L\\colon y=c\\) preslikamo s projektivno preslikavo, ki \\(L\\) pošlje v neskončnost: če \\(L\\) ne seka krožnice, je slika elipsa, če se je dotika, parabola, če jo seka, hiperbola. Vrsto slike odloča predznak izraza \\(B^2-4AC\\), izračunan natančno iz \\(c\\) v desetinkah.',
        'The ellipse, the parabola and the hyperbola are one projective conic seen against different lines at infinity. The unit circle \\(x^2+y^2=1\\) and the line \\(L\\colon y=c\\) are mapped by a projective map that sends \\(L\\) to infinity: if \\(L\\) misses the circle the image is an ellipse, if \\(L\\) touches it a parabola, if \\(L\\) cuts it a hyperbola. The sign of \\(B^2-4AC\\), computed exactly from \\(c\\) in tenths, decides the type of the image.',
    ),
    prerequisites: [
        text('Lekcija o točkah v neskončnosti (premica v neskončnosti, smer kot točka); priporočena sta še lekcija o stožnici skozi pet točk (utež nad \\(1\\) da hiperbolo) in razvrstitev stožnic v šolskih grafih funkcij.', 'The lesson on points at infinity (the line at infinity, a direction as a point); also recommended are the lesson on a conic through five points (a weight above \\(1\\) gives a hyperbola) and the classification of conics in the school function graphs.'),
    ],
    learningGoals: [
        text('Napoveš vrsto slike krožnice (elipsa, parabola, hiperbola) iz lege premice \\(L\\) glede na krožnico.', 'Predict the type of the image of the circle (ellipse, parabola, hyperbola) from the position of the line \\(L\\) relative to the circle.'),
        text('Prebereš vrsto stožnice iz predznaka \\(B^2-4AC\\) in veš, da je odločitev pri \\(c=1\\) natančna: parabola, ne "skoraj" parabola.', 'Read the type of a conic from the sign of \\(B^2-4AC\\), and know that the decision at \\(c=1\\) is exact: a parabola, not "nearly" a parabola.'),
        text('Poveš, da sta točki v neskončnosti hiperbole sliki obeh presečišč premice \\(L\\) s krožnico, da je njuna smer smer asimptote in da je premica skozi njiju premica v neskončnosti.', 'State that the two points at infinity of the hyperbola are the images of the two points where \\(L\\) cuts the circle, that their directions are the asymptote directions, and that the line through them is the line at infinity.'),
    ],
    formulaBlocks: [
        {
            id: 'three-views-map',
            latex: '(X,Y)=\\left(\\frac{x}{y-c},\\ \\frac{1}{y-c}\\right)',
            notation: text(
                'Projektivna preslikava ravnine \\((x,y)\\mapsto(X,Y)\\). Premica \\(L\\colon y=c\\) nima slike v končnosti: njene točke gredo v neskončnost, zato je \\(L\\) slika premice v neskončnosti.',
                'The projective map of the plane \\((x,y)\\mapsto(X,Y)\\). The line \\(L\\colon y=c\\) has no finite image: its points go to infinity, so \\(L\\) is sent to the line at infinity.',
            ),
            explanation: text(
                'Izrek (razvrstitev stožnic): vsaki dve nedegenerirani stožnici sta projektivno enaki, torej je vsaka nedegenerirana stožnica slika krožnice pri neki projektivni preslikavi. Izrek je naveden po temi klasifikacija stožnic iz učnega načrta FMF (viri spodaj); lekcija ga ne dokazuje. Družina slik, ki jo vidiš pri drsenju premice \\(L\\), je ilustracija, ne dokaz razvrstitve: tri vrste, ki jih pokaže, so tri lege premice v neskončnosti glede na isto stožnico.',
                'Theorem (classification of conics): any two nondegenerate conics are projectively equivalent, so every nondegenerate conic is the image of the circle under some projective map. The theorem is quoted from the syllabus topic *klasifikacija stožnic* of the FMF (sources below); the lesson does not prove it. The family of images you see while sliding the line \\(L\\) is an illustration, not a proof of the classification: the three types it shows are three positions of the line at infinity relative to the same conic.',
            ),
        },
        {
            id: 'three-views-image',
            latex: 'X^2+(c^2-1)Y^2+2cY+1=0',
            notation: text(
                'Enačba slike enotske krožnice \\(x^2+y^2=1\\) pri preslikavi \\((x,y)\\mapsto(X,Y)\\). Pri \\(A=1\\), \\(B=0\\), \\(C=c^2-1\\) je \\(B^2-4AC=4(1-c^2)\\).',
                'The equation of the image of the unit circle \\(x^2+y^2=1\\) under the map \\((x,y)\\mapsto(X,Y)\\). With \\(A=1\\), \\(B=0\\), \\(C=c^2-1\\) we get \\(B^2-4AC=4(1-c^2)\\).',
            ),
            explanation: text(
                'Predznak \\(B^2-4AC\\) odloči vrsto: negativen pomeni elipso, \\(0\\) parabolo, pozitiven hiperbolo. Ker je \\(4(1-c^2)\\) negativno natanko za \\(|c|>1\\), \\(0\\) natanko za \\(|c|=1\\) in pozitivno natanko za \\(|c|<1\\), se vrsta slike ujema z lego premice \\(L\\) glede na krožnico. Graf odloči iz celega števila desetink \\(c\\), brez zaokroževanja.',
                'The sign of \\(B^2-4AC\\) decides the type: negative means an ellipse, \\(0\\) a parabola, positive a hyperbola. Since \\(4(1-c^2)\\) is negative exactly for \\(|c|>1\\), \\(0\\) exactly for \\(|c|=1\\) and positive exactly for \\(|c|<1\\), the type of the image agrees with the position of the line \\(L\\) relative to the circle. The graph decides from the whole number of tenths of \\(c\\), with no rounding.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'k5-image-equation',
            title: text('Enačba slike krožnice', 'The equation of the image of the circle'),
            calculationLatex: 'x=\\frac XY,\\quad y=c+\\frac1Y,\\quad x^2+y^2=1\\ \\Longrightarrow\\ X^2+(cY+1)^2=Y^2',
            resultLatex: 'X^2+(c^2-1)Y^2+2cY+1=0',
            check: text(
                'Iz \\(Y=\\tfrac1{y-c}\\) sledi \\(y=c+\\tfrac1Y\\), iz \\(X=\\tfrac x{y-c}=xY\\) pa \\(x=\\tfrac XY\\). Vstavimo v \\(x^2+y^2=1\\) in pomnožimo z \\(Y^2\\): \\(X^2+(cY+1)^2=Y^2\\), torej \\(X^2+(c^2-1)Y^2+2cY+1=0\\). Pri \\(c=2\\) je to \\(X^2+3Y^2+4Y+1=0\\), pri \\(c=1\\) je \\(X^2+2Y+1=0\\), pri \\(c=0\\) pa \\(X^2-Y^2+1=0\\).',
                'From \\(Y=\\tfrac1{y-c}\\) we get \\(y=c+\\tfrac1Y\\), and from \\(X=\\tfrac x{y-c}=xY\\) we get \\(x=\\tfrac XY\\). Substitute into \\(x^2+y^2=1\\) and multiply by \\(Y^2\\): \\(X^2+(cY+1)^2=Y^2\\), that is \\(X^2+(c^2-1)Y^2+2cY+1=0\\). For \\(c=2\\) this is \\(X^2+3Y^2+4Y+1=0\\), for \\(c=1\\) it is \\(X^2+2Y+1=0\\), and for \\(c=0\\) it is \\(X^2-Y^2+1=0\\).',
            ),
        },
    ],
    steps: [
        step({
            id: 'three-views-source', order: 1,
            title: text('Krožnica in premica \\(L\\)', 'The circle and the line \\(L\\)'),
            purpose: text('Videti izvirno ravnino z enotsko krožnico in premico \\(L\\).', 'Seeing the original plane with the unit circle and the line \\(L\\).'),
            explanation: text(
                'Levo je izvirna ravnina z enotsko krožnico \\(x^2+y^2=1\\) in vodoravno premico \\(L\\colon y=c\\). Zdaj je \\(c=2\\): premica \\(L\\) leži nad krožnico in je ne seka. Desno bo slika krožnice pri preslikavi, ki \\(L\\) pošlje v neskončnost.',
                'On the left is the original plane with the unit circle \\(x^2+y^2=1\\) and the horizontal line \\(L\\colon y=c\\). Now \\(c=2\\): the line \\(L\\) lies above the circle and does not meet it. On the right will be the image of the circle under the map that sends \\(L\\) to infinity.',
            ),
            formulaIds: ['three-views-map'],
            observationPrompt: text('Preberi stanje pod drsnikom.', 'Read the status under the slider.'),
            expectedObservations: [text('Stanje pravi, da premica \\(L\\colon y=2\\) ne seka krožnice.', 'The status says that the line \\(L\\colon y=2\\) misses the circle.')],
            scene: threeViewsScene('three-views-source-scene', 20, null,
                'Premica \\(L\\colon y=2\\) ne seka krožnice (\\(|c|>1\\)).',
                'The line \\(L\\colon y=2\\) misses the circle (\\(|c|>1\\)).'),
        }),
        step({
            id: 'three-views-predict', order: 2,
            title: text('Napoved za \\(L\\) zunaj krožnice', 'A prediction for \\(L\\) outside the circle'),
            purpose: text('Napovedati vrsto slike, preden jo preberemo.', 'Predicting the type of the image before it is read.'),
            explanation: text(
                'Premica \\(L\\colon y=2\\) ne seka krožnice, zato nobena točka krožnice ne gre v neskončnost: slika krožnice nima točk v neskončnosti. Napovej, katera od elipse, parabole in hiperbole je to. Namig: parabola ima eno točko v neskončnosti, hiperbola dve.',
                'The line \\(L\\colon y=2\\) misses the circle, so no point of the circle goes to infinity: the image of the circle has no points at infinity. Predict which of the ellipse, the parabola and the hyperbola it is. Hint: a parabola has one point at infinity, a hyperbola two.',
            ),
            formulaIds: ['three-views-map'],
            observationPrompt: text('Preberi vrsto slike in vrstico o točkah v neskončnosti.', 'Read the type of the image and the line about points at infinity.'),
            expectedObservations: [text('Slika je elipsa in nima točk v neskončnosti.', 'The image is an ellipse and has no points at infinity.')],
            scene: threeViewsScene('three-views-predict-scene', 20, null,
                'Slika krožnice je elipsa, brez točk v neskončnosti.',
                'The image of the circle is an ellipse, with no points at infinity.'),
        }),
        step({
            id: 'three-views-ellipse', order: 3,
            title: text('Slika je elipsa', 'The image is an ellipse'),
            purpose: text('Prebrati enačbo slike, predznak \\(B^2-4AC\\) in sliko točke.', 'Reading the equation of the image, the sign of \\(B^2-4AC\\) and the image of a point.'),
            explanation: text(
                'Premica \\(L\\) ne seka krožnice, zato je pri \\(c=2\\) slika krožnice \\(X^2+3Y^2+4Y+1=0\\). Tu je \\(A=1\\), \\(B=0\\), \\(C=3\\), torej \\(B^2-4AC=-12<0\\): elipsa. Determinanta \\(3\\times3\\) matrike stožnice je \\(-1\\), zato slika ni izrojena. Točka \\(P=(0{,}7071;\\ 0{,}7071)\\) na krožnici (kot \\(45^\\circ\\)) se preslika v \\(P\'=(-0{,}5469;\\ -0{,}7735)\\), ki leži na elipsi; to je številski preizkus na narisanih decimalnih številih, ne dokaz.',
                'The line \\(L\\) misses the circle, so for \\(c=2\\) the image of the circle is \\(X^2+3Y^2+4Y+1=0\\). Here \\(A=1\\), \\(B=0\\), \\(C=3\\), so \\(B^2-4AC=-12<0\\): an ellipse. The \\(3\\times3\\) determinant of the conic matrix is \\(-1\\), so the image is not degenerate. The point \\(P=(0.7071,\\ 0.7071)\\) of the circle (angle \\(45^\\circ\\)) maps to \\(P\'=(-0.5469,\\ -0.7735)\\), which lies on the ellipse; this is a numerical check on drawn decimals, not a proof.',
            ),
            formulaIds: ['three-views-image'],
            workedExampleId: 'k5-image-equation',
            observationPrompt: text('Preberi enačbo, \\(B^2-4AC\\), determinanto in sliko točke \\(P\\).', 'Read the equation, \\(B^2-4AC\\), the determinant and the image of the point \\(P\\).'),
            expectedObservations: [text('Enačba je \\(X^2+3Y^2+4Y+1=0\\), \\(B^2-4AC=-12\\), determinanta \\(-1\\).', 'The equation is \\(X^2+3Y^2+4Y+1=0\\), \\(B^2-4AC=-12\\), the determinant \\(-1\\).')],
            scene: threeViewsScene('three-views-ellipse-scene', 20, {angle: 3},
                'Elipsa \\(X^2+3Y^2+4Y+1=0\\), \\(B^2-4AC=-12\\), determinanta \\(-1\\); točka \\(P=(0{,}7071;\\ 0{,}7071)\\) gre v \\(P\'=(-0{,}5469;\\ -0{,}7735)\\).',
                'The ellipse \\(X^2+3Y^2+4Y+1=0\\), \\(B^2-4AC=-12\\), determinant \\(-1\\); the point \\(P=(0.7071,\\ 0.7071)\\) goes to \\(P\'=(-0.5469,\\ -0.7735)\\).'),
        }),
        step({
            id: 'three-views-parabola', order: 4,
            title: text('Premica se dotika krožnice: parabola', 'The line touches the circle: a parabola'),
            purpose: text('Videti, da dotikališče postane edina točka slike v neskončnosti.', 'Seeing that the point of tangency becomes the only point of the image at infinity.'),
            explanation: text(
                'Drsnik postavimo na \\(c=1\\): premica \\(L\\colon y=1\\) se dotika krožnice v točki \\((0,1)\\). Slika je \\(X^2+2Y+1=0\\), to je parabola \\(Y=-\\tfrac{X^2+1}2\\), in \\(B^2-4AC=0\\), natančno, ker je \\(c\\) cel mnogokratnik \\(\\tfrac1{10}\\) in se račun izide v celih številih. Dotikališče \\((0,1)\\) leži na \\(L\\), zato gre v neskončnost: je edina točka slike v neskončnosti, s smerjo \\((0,1)\\), kjer se parabola dotika premice v neskončnosti. Determinanta je spet \\(-1\\).',
                'Set the slider to \\(c=1\\): the line \\(L\\colon y=1\\) touches the circle at the point \\((0,1)\\). The image is \\(X^2+2Y+1=0\\), that is the parabola \\(Y=-\\tfrac{X^2+1}2\\), and \\(B^2-4AC=0\\), exactly, because \\(c\\) is a whole multiple of \\(\\tfrac1{10}\\) and the computation is in whole numbers. The point of tangency \\((0,1)\\) lies on \\(L\\), so it goes to infinity: it is the only point of the image at infinity, with direction \\((0,1)\\), where the parabola touches the line at infinity. The determinant is again \\(-1\\).',
            ),
            formulaIds: ['three-views-image'],
            observationPrompt: text('Preberi stanje in vrstico o točkah v neskončnosti.', 'Read the status and the line about points at infinity.'),
            expectedObservations: [text('Stanje pravi, da se \\(L\\) dotika krožnice, slika je parabola z \\(B^2-4AC=0\\) in točka \\(P=(0,1)\\) gre v točko v neskončnosti s smerjo \\((0,1)\\).', 'The status says that \\(L\\) touches the circle, the image is a parabola with \\(B^2-4AC=0\\), and the point \\(P=(0,1)\\) goes to the point at infinity with direction \\((0,1)\\).')],
            scene: threeViewsScene('three-views-parabola-scene', 10, {angle: 6},
                'Premica \\(L\\colon y=1\\) se dotika krožnice v \\((0,1)\\); parabola \\(X^2+2Y+1=0\\), \\(B^2-4AC=0\\), determinanta \\(-1\\); točka \\(P=(0,1)\\) gre v točko v neskončnosti s smerjo \\((0,1)\\).',
                'The line \\(L\\colon y=1\\) touches the circle at \\((0,1)\\); the parabola \\(X^2+2Y+1=0\\), \\(B^2-4AC=0\\), determinant \\(-1\\); the point \\(P=(0,1)\\) goes to the point at infinity with direction \\((0,1)\\).'),
        }),
        step({
            id: 'three-views-hyperbola', order: 5,
            title: text('Premica seka krožnico: hiperbola', 'The line cuts the circle: a hyperbola'),
            purpose: text('Videti dve točki v neskončnosti in smeri asimptot.', 'Seeing the two points at infinity and the asymptote directions.'),
            explanation: text(
                'Drsnik postavimo na \\(c=0\\): premica \\(L\\colon y=0\\) seka krožnico v točkah \\((-1,0)\\) in \\((1,0)\\). Slika je \\(X^2-Y^2+1=0\\), to je hiperbola \\(Y^2-X^2=1\\), in \\(B^2-4AC=4>0\\); determinanta je spet \\(-1\\). Presečišči gresta v neskončnost: sliki sta dve točki v neskončnosti s smerema \\((-1,1)\\) in \\((1,1)\\), to sta smeri asimptot \\(Y=\\pm X\\). Narisana krivulja se pretrga v obeh slikah teh točk in obe veji nista nikoli povezani.',
                'Set the slider to \\(c=0\\): the line \\(L\\colon y=0\\) cuts the circle at the points \\((-1,0)\\) and \\((1,0)\\). The image is \\(X^2-Y^2+1=0\\), that is the hyperbola \\(Y^2-X^2=1\\), and \\(B^2-4AC=4>0\\); the determinant is again \\(-1\\). The two intersection points go to infinity: their images are two points at infinity with directions \\((-1,1)\\) and \\((1,1)\\), the directions of the asymptotes \\(Y=\\pm X\\). The drawn curve breaks at the two images of these points, and the two branches are never joined.',
            ),
            formulaIds: ['three-views-image'],
            observationPrompt: text('Preberi vrstico o točkah v neskončnosti in poglej asimptoti.', 'Read the line about points at infinity and look at the asymptotes.'),
            expectedObservations: [text('Stanje pravi, da \\(L\\) seka krožnico, slika je hiperbola, točki v neskončnosti imata smeri \\((-1,1)\\) in \\((1,1)\\), točka \\(P=(1,0)\\) pa gre v neskončnost s smerjo \\((1,1)\\).', 'The status says that \\(L\\) cuts the circle, the image is a hyperbola, the points at infinity have directions \\((-1,1)\\) and \\((1,1)\\), and the point \\(P=(1,0)\\) goes to infinity with direction \\((1,1)\\).')],
            scene: threeViewsScene('three-views-hyperbola-scene', 0, {angle: 0},
                'Premica \\(L\\colon y=0\\) seka krožnico v \\((-1,0)\\) in \\((1,0)\\); hiperbola \\(X^2-Y^2+1=0\\), \\(B^2-4AC=4\\), determinanta \\(-1\\), točki v neskončnosti s smerema \\((-1,1)\\) in \\((1,1)\\); točka \\(P=(1,0)\\) gre v točko v neskončnosti s smerjo \\((1,1)\\).',
                'The line \\(L\\colon y=0\\) cuts the circle at \\((-1,0)\\) and \\((1,0)\\); the hyperbola \\(X^2-Y^2+1=0\\), \\(B^2-4AC=4\\), determinant \\(-1\\), the points at infinity with directions \\((-1,1)\\) and \\((1,1)\\); the point \\(P=(1,0)\\) goes to the point at infinity with direction \\((1,1)\\).'),
        }),
        step({
            id: 'three-views-infinity', order: 6,
            title: text('Premica v neskončnosti', 'The line at infinity'),
            purpose: text('Povezati sliki obeh presečišč s premico v neskončnosti in z lekcijo o stožnici skozi pet točk.', 'Connecting the images of the two intersection points with the line at infinity and with the lesson on a conic through five points.'),
            explanation: text(
                'Premica skozi sliki obeh presečišč \\((-1,0)\\) in \\((1,0)\\) je slika premice \\(L\\), torej premica v neskončnosti sama. Hiperbola jo seka v teh dveh točkah, elipsa je ne seka nikjer, parabola se je dotika. Isto vidiš v lekciji o stožnici skozi pet točk: lok z utežjo nad \\(1\\) pripada hiperboli in teče proti točkama v neskončnosti. Tam je slika točke \\(P\\) na \\(L\\) točka v neskončnosti, ne končna točka.',
                'The line through the images of the two intersection points \\((-1,0)\\) and \\((1,0)\\) is the image of the line \\(L\\), that is the line at infinity itself. The hyperbola meets it in these two points, the ellipse does not meet it anywhere, the parabola touches it. You see the same in the lesson on a conic through five points: an arc with a weight above \\(1\\) belongs to a hyperbola and runs towards the points at infinity. There the image of a point \\(P\\) of \\(L\\) is a point at infinity, not a finite point.',
            ),
            formulaIds: ['three-views-map'],
            observationPrompt: text('Poglej, kje hiperbola zapusti pogled, in preberi vrstico o točkah v neskončnosti.', 'Look where the hyperbola leaves the view and read the line about points at infinity.'),
            expectedObservations: [text('Hiperbola ima dve točki v neskončnosti, ki ležita na premici v neskončnosti, to je na sliki premice \\(L\\).', 'The hyperbola has two points at infinity, which lie on the line at infinity, that is on the image of the line \\(L\\).')],
            scene: threeViewsScene('three-views-infinity-scene', 0, null,
                'Hiperbola \\(X^2-Y^2+1=0\\) s točkama v neskončnosti s smerema \\((-1,1)\\) in \\((1,1)\\); premica skozi njuni sliki je slika premice \\(L\\), premica v neskončnosti.',
                'The hyperbola \\(X^2-Y^2+1=0\\) with the points at infinity with directions \\((-1,1)\\) and \\((1,1)\\); the line through their images is the image of the line \\(L\\), the line at infinity.'),
        }),
        step({
            id: 'three-views-explore', order: 7,
            title: text('Raziskovanje', 'Free exploration'),
            purpose: text('Sam premikati premico \\(L\\) in točko \\(P\\) ter preveriti napovedi.', 'Moving the line \\(L\\) and the point \\(P\\) yourself and checking the predictions.'),
            explanation: text(
                'Premikaj \\(c\\) med \\(-2{,}5\\) in \\(2{,}5\\) in opazuj: pri \\(|c|>1\\) \\(L\\) zgreši krožnico in slika je elipsa, pri \\(|c|=1\\) se je dotika in slika je parabola, pri \\(|c|<1\\) jo seka in slika je hiperbola. Zdaj je \\(c=-1{,}5\\): premica \\(L\\) pod krožnico jo zgreši, slika je elipsa. Vrednosti \\(|c|=0{,}9\\) in \\(|c|=1{,}1\\) sta blizu meje in slika sega iz pogleda, graf to opozori. Tri vrste, ki jih vidiš, so ilustracija izreka o razvrstitvi stožnic, ne njegov dokaz.',
                'Move \\(c\\) between \\(-2.5\\) and \\(2.5\\) and watch: for \\(|c|>1\\) the line \\(L\\) misses the circle and the image is an ellipse, for \\(|c|=1\\) it touches and the image is a parabola, for \\(|c|<1\\) it cuts and the image is a hyperbola. Now \\(c=-1.5\\): the line \\(L\\) below the circle misses it, and the image is an ellipse. The values \\(|c|=0.9\\) and \\(|c|=1.1\\) are near the boundary and the image leaves the view, which the graph notes. The three types you see illustrate the classification theorem for conics; they are not its proof.',
            ),
            formulaIds: ['three-views-image'],
            observationPrompt: text('Poišči vrednosti \\(c\\), pri katerih se vrsta slike spremeni.', 'Find the values of \\(c\\) where the type of the image changes.'),
            expectedObservations: [text('Vrsta se spremeni pri \\(c=\\pm1\\), ko se \\(L\\) dotika krožnice.', 'The type changes at \\(c=\\pm1\\), when \\(L\\) touches the circle.')],
            scene: threeViewsScene('three-views-explore-scene', -15, null,
                'Premica \\(L\\colon y=-1{,}5\\) ne seka krožnice (\\(|c|>1\\)), slika je elipsa.',
                'The line \\(L\\colon y=-1.5\\) misses the circle (\\(|c|>1\\)), the image is an ellipse.'),
        }),
    ],
    sources: [
        {
            id: 'fmf-three-views-syllabus',
            citation: 'Fakulteta za matematiko in fiziko, Univerza v Ljubljani, učni načrt Afina in projektivna geometrija (1Mate/2Mate 2025), tema klasifikacija stožnic. Cited from the syllabus topic list; not opened beyond the list.',
            implementationCorrespondence: 'The theorem that all nondegenerate conics are projectively equivalent is the statement of docs/specs/projective-conics-lessons.md section K5, acceptance 4. The lesson quotes it and does not prove it; the graph shows the images of one circle for the heights c of the line L, which is an illustration.',
        },
        {
            id: 'bezeg-three-views-implementation',
            citation: 'Bezeg source: src/graphs/projective/threeViewsModel.ts, src/graphs/projective/ThreeViewsGraph.tsx and src/projective/conic.ts.',
            implementationCorrespondence: 'A scene sets c in whole tenths, the point P and its angle step with the graph\'s own control actions; the type, B^2 - 4AC and the determinant are computed from exact integers, and projectiveThreeViewsLesson.test.ts recomputes them without the projective kernel and checks them against the graph.',
        },
    ],
    edgeCases: [
        text('Pri \\(|c|=0{,}9\\) in \\(|c|=1{,}1\\) slika sega iz pogleda desne plošče; graf to navede in ne skrije dela krivulje.', 'At \\(|c|=0.9\\) and \\(|c|=1.1\\) the image leaves the view of the right panel; the graph says so and does not hide part of the curve.'),
        text('Točka \\(P\\) na premici \\(L\\) se preslika v točko v neskončnosti; graf izpiše smer namesto koordinat.', 'A point \\(P\\) on the line \\(L\\) maps to a point at infinity; the graph prints the direction instead of coordinates.'),
    ],
    unresolvedQuestions: [],
};
