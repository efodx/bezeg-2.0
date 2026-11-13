import type {LessonAction, LessonDefinition, LessonFrame, LessonStep, LessonWorkedExample, LocalizedText} from '../model';

// Linear maps chapter-owned guided activities (spec L1 to L4). Every number is recomputed in linearMapsChapter.test.ts from the kernel.
// Scene actions run synchronously in one tick; each scene starts from the Demonstration default and then names its state.

const words = (sl: string, en: string): LocalizedText => ({sl, en});

const defaultScene = (sceneId: string): LessonAction => ({kind: 'prepared-scene', sceneId, source: 'demonstration-default'});
const mode = (value: 'basis' | 'determinant' | 'eigen' | 'ellipse' | 'iterate' | 'tracedet'): LessonAction => ({kind: 'linear-map', operation: 'set-mode', mode: value});
/** The test vector v of the eigen mode: the angle in degrees on the 0,01 degree grid. */
const testVector = (angle: number): LessonAction => ({kind: 'linear-map', operation: 'set-test-vector', angle});
/** The ellipse mode's conic x^T S x = 1 of the symmetric part, drawn or not. */
const conic = (visible: boolean): LessonAction => ({kind: 'linear-map', operation: 'set-conic', visible});
const example = (exampleId: Extract<LessonAction, {kind: 'linear-map', operation: 'set-example'}>['exampleId']): LessonAction =>
    ({kind: 'linear-map', operation: 'set-example', exampleId});
const matrix = (m: Extract<LessonAction, {kind: 'linear-map', operation: 'set-matrix'}>['matrix']): LessonAction =>
    ({kind: 'linear-map', operation: 'set-matrix', matrix: m});
/** The start vector v0 of the iterate mode (the quarter grid); the step is not reset by it. */
const start = (v: readonly [number, number]): LessonAction => ({kind: 'linear-map', operation: 'set-start', start: v});

function step(id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, actions: readonly LessonAction[]): LessonStep {
    return {id, title, body, prompt, scene: {actions: [defaultScene(`linear-map-${id}`), ...actions]}};
}

export const linearMapBasisLesson: LessonDefinition = {
    id: 'linear-map-basis-image',
    demonstrationId: 'linear-map',
    title: words('Matrika kot slika baze', 'A matrix as the image of a basis'),
    summary: words(
        'Linearna preslikava ravnine je določena s slikama vektorjev \\(e_1\\) in \\(e_2\\): ti sliki sta stolpca matrike. Zato je slika vsake točke linearna kombinacija stolpcev, enako pa velja za kontrolne točke Bézierjeve krivulje.',
        'A linear map of the plane is fixed by the images of \\(e_1\\) and \\(e_2\\): these images are the columns of the matrix. So the image of every point is a linear combination of the columns, and the same holds for the control points of a Bézier curve.',
    ),
    steps: [
        step('basis-identity',
            words('Enotska mreža in točka \\(p\\)', 'The unit grid and the point \\(p\\)'),
            words('Začnemo z identiteto: \\(e_1=(1,0)\\) in \\(e_2=(0,1)\\) sta slika samih sebe, točka \\(p=(1,1)\\) pa je vsota \\(e_1+e_2\\). Vsako točko ravnine lahko zapišemo kot \\(x\\,e_1+y\\,e_2\\); preslikava \\(A\\) je linearna, zato velja \\(A(x,y)=x\\,Ae_1+y\\,Ae_2\\). Zadostuje torej vedeti, kam gresta \\(e_1\\) in \\(e_2\\).', 'We start with the identity: \\(e_1=(1,0)\\) and \\(e_2=(0,1)\\) are their own images, and the point \\(p=(1,1)\\) is the sum \\(e_1+e_2\\). Every point of the plane can be written as \\(x\\,e_1+y\\,e_2\\); the map \\(A\\) is linear, so \\(A(x,y)=x\\,Ae_1+y\\,Ae_2\\). It is enough to know where \\(e_1\\) and \\(e_2\\) go.'),
            words('Napovej: če se \\(e_1\\) preslika v \\((2,1)\\), \\(e_2\\) pa ostane pri \\((0,1)\\), kam gre točka \\(p=(1,1)\\)? Preveri šele nato.', 'Predict: if \\(e_1\\) is sent to \\((2,1)\\) and \\(e_2\\) stays at \\((0,1)\\), where does the point \\(p=(1,1)\\) go? Check only afterwards.'),
            [mode('basis'), example('identity')]),
        step('basis-first-column',
            words('Prvi stolpec: povleci \\(a_1\\)', 'The first column: drag \\(a_1\\)'),
            words('Ročico \\(a_1=Ae_1\\) postavimo v \\((2,1)\\), \\(a_2\\) pa pustimo pri \\((0,1)\\). Matrika ima stolpca \\((2,1)\\) in \\((0,1)\\), zato je \\(A(1,1)=1\\cdot(2,1)+1\\cdot(0,1)=(2,2)\\). Vodoravne mrežne črte so smeri \\(e_1\\), zato se nagnejo v smer \\(a_1\\). Navpične ostanejo navpične, ker se \\(e_2\\) ni premaknil; navpična črta \\(x=c\\) se le premakne v \\(x=2c\\), zato so dvakrat bolj narazen.', 'We place the handle \\(a_1=Ae_1\\) at \\((2,1)\\) and leave \\(a_2\\) at \\((0,1)\\). The matrix has columns \\((2,1)\\) and \\((0,1)\\), so \\(A(1,1)=1\\cdot(2,1)+1\\cdot(0,1)=(2,2)\\). The horizontal grid lines have direction \\(e_1\\), so they tilt along \\(a_1\\). The vertical lines stay vertical because \\(e_2\\) did not move; the vertical line \\(x=c\\) only moves to \\(x=2c\\), so they are twice as far apart.'),
            words('Povleci \\(a_1\\) drugam in preberi nov \\(A(1,1)\\). Preveri, da je vedno enak \\(a_1+a_2\\).', 'Drag \\(a_1\\) elsewhere and read the new \\(A(1,1)\\). Check that it always equals \\(a_1+a_2\\).'),
            [mode('basis'), matrix([[2, 0], [1, 1]])]),
        step('basis-second-column',
            words('Drugi stolpec in diagonala', 'The second column and the diagonal'),
            words('Zdaj še \\(a_2=Ae_2\\) postavimo v \\((-1,1)\\). Matrika \\(A\\) ima stolpca \\((2,1)\\) in \\((-1,1)\\), točka \\(p=(1,1)\\) pa gre v \\(a_1+a_2=(1,2)\\): to je diagonala paralelograma, ki ga napenjata \\(a_1\\) in \\(a_2\\). Enotski kvadrat se je preslikal v ta paralelogram.', 'Now place \\(a_2=Ae_2\\) at \\((-1,1)\\). The matrix \\(A\\) has columns \\((2,1)\\) and \\((-1,1)\\), and the point \\(p=(1,1)\\) goes to \\(a_1+a_2=(1,2)\\): the diagonal of the parallelogram spanned by \\(a_1\\) and \\(a_2\\). The unit square has been mapped to this parallelogram.'),
            words('Povleci \\(a_2\\) in opazuj, kako se obrne druga družina mrežnih črt, \\(a_1\\) pa ostane pri miru.', 'Drag \\(a_2\\) and watch the other family of grid lines turn while \\(a_1\\) stays put.'),
            [mode('basis'), example('basis-default')]),
        step('basis-bezier',
            words('Bézierjeva krivulja sledi kontrolnim točkam', 'The Bézier curve follows its control points'),
            words('Izrek (linearnost vrednotenja): za linearno preslikavo \\(A\\) in Bézierjevo krivuljo \\(B(t)=\\sum_i B_i^n(t)P_i\\) velja \\(A\\,B(t)=\\sum_i B_i^n(t)\\,AP_i\\), ker \\(A\\) ohranja vsote in množenje s številom. Slika krivulje je zato Bézierjeva krivulja s kontrolnimi točkami \\(AP_i\\). Za \\(P=(1,0),(2,3),(4,2),(5,-1)\\) so slike \\((2,1),(1,5),(6,6),(11,4)\\), \\(B(\\tfrac12)=(3,\\tfrac74)\\) in \\(A\\,B(\\tfrac12)=(\\tfrac{17}{4},\\tfrac{19}{4})\\), kar je enako \\(B_A(\\tfrac12)\\) po slikah kontrolnih točk. Slika je ponazoritev izreka, ne dokaz.', 'Theorem (linearity of evaluation): for a linear map \\(A\\) and a Bézier curve \\(B(t)=\\sum_i B_i^n(t)P_i\\) we have \\(A\\,B(t)=\\sum_i B_i^n(t)\\,AP_i\\), because \\(A\\) preserves sums and scalar multiples. The image of the curve is therefore the Bézier curve of the control points \\(AP_i\\). For \\(P=(1,0),(2,3),(4,2),(5,-1)\\) the images are \\((2,1),(1,5),(6,6),(11,4)\\), \\(B(\\tfrac12)=(3,\\tfrac74)\\) and \\(A\\,B(\\tfrac12)=(\\tfrac{17}{4},\\tfrac{19}{4})\\), which equals \\(B_A(\\tfrac12)\\) built from the image control points. The picture illustrates the theorem; it does not prove it.'),
            words('Povleci \\(a_1\\) ali \\(a_2\\) in preveri, da slika krivulje vedno poteka po sliki kontrolnega poligona, kakor napoveduje izrek.', 'Drag \\(a_1\\) or \\(a_2\\) and check that the image curve always follows the image of the control polygon, as the theorem predicts.'),
            [mode('basis'), example('basis-default')]),
        step('basis-invariants',
            words('Kaj se ne spremeni', 'What does not change'),
            words('Izhodišče ostane na mestu, ker je \\(A(0,0)=0\\). Vzporedne mrežne črte ostanejo vzporedne in enakomerno razmaknjene, ker \\(A\\) ohranja linearne kombinacije. Središče daljice \\(P_0P_3\\), točka \\((3,-\\tfrac12)\\), se preslika v središče slik, \\((\\tfrac{13}{2},\\tfrac52)\\).', 'The origin stays where it is because \\(A(0,0)=0\\). Parallel grid lines stay parallel and equally spaced because \\(A\\) preserves linear combinations. The midpoint of the segment \\(P_0P_3\\), the point \\((3,-\\tfrac12)\\), goes to the midpoint of the images, \\((\\tfrac{13}{2},\\tfrac52)\\).'),
            words('Poišči točko, ki se pri nobeni izbiri \\(a_1\\) in \\(a_2\\) ne premakne. Utemelji, zakaj je ena sama.', 'Find the point that does not move for any choice of \\(a_1\\) and \\(a_2\\). Explain why there is only that one in general.'),
            [mode('basis'), example('basis-default')]),
        step('basis-explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Vnesi ali povleci poljubni stolpca. Vsak vnos je večkratnik \\(\\tfrac14\\) med \\(-4\\) in \\(4\\). Tudi matrika z \\(\\det A=0\\) je dovoljena: mreža se sesede na premico ali točko, kar graf izpiše z besedami.', 'Enter or drag any two columns. Every entry is a multiple of \\(\\tfrac14\\) between \\(-4\\) and \\(4\\). A matrix with \\(\\det A=0\\) is allowed too: the grid collapses onto a line or a point, which the graph states in words.'),
            words('Izberi stolpca tako, da se mreža sesede, in opiši, kaj je potem slika kontrolnega poligona.', 'Choose the columns so that the grid collapses, and describe what the image of the control polygon is then.'),
            [mode('basis'), example('basis-default')]),
    ],
};

export const linearMapDeterminantLesson: LessonDefinition = {
    id: 'linear-map-determinant-area',
    demonstrationId: 'linear-map',
    title: words('Determinanta kot predznačena ploščina', 'The determinant as signed area'),
    summary: words(
        'Slika enotskega kvadrata je paralelogram s ploščino \\(|\\det A|\\), predznak pa pove, ali je orientacija ohranjena. Pri \\(\\det A=0\\) se ravnina sesede na premico ali točko.',
        'The image of the unit square is a parallelogram of area \\(|\\det A|\\), and the sign tells whether orientation is kept. When \\(\\det A=0\\) the plane collapses onto a line or a point.',
    ),
    steps: [
        step('det-square',
            words('Kvadrat in njegova slika', 'The square and its image'),
            words('Za \\(A\\) s stolpcema \\((2,1)\\) in \\((-1,1)\\) se oglišča kvadrata \\(0,e_1,e_1{+}e_2,e_2\\) preslikajo v \\((0,0),(2,1),(1,2),(-1,1)\\). Obrazec z determinantami (angl. shoelace; vsota \\(\\tfrac12\\sum(x_iy_{i+1}-x_{i+1}y_i)\\)) je \\(3\\), kar je \\(\\det A=2\\cdot1-(-1)\\cdot1=3\\). Ploščina je pozitivna, ker oglišča še vedno tečejo v nasprotni smeri urnega kazalca.', 'For \\(A\\) with columns \\((2,1)\\) and \\((-1,1)\\), the square vertices \\(0,e_1,e_1{+}e_2,e_2\\) go to \\((0,0),(2,1),(1,2),(-1,1)\\). The shoelace formula \\(\\tfrac12\\sum(x_iy_{i+1}-x_{i+1}y_i)\\) gives \\(3\\), which is \\(\\det A=2\\cdot1-(-1)\\cdot1=3\\). The area is positive because the vertices still run counter-clockwise.'),
            words('Napovej ploščino paralelograma, preden preberaš odčitek, nato primerjaj z \\(\\det A\\).', 'Predict the area of the parallelogram before reading the readout, then compare with \\(\\det A\\).'),
            [mode('determinant'), example('basis-default')]),
        step('det-orientation',
            words('Predznak pove orientacijo', 'The sign tells the orientation'),
            words('Za matriko \\(B\\) s stolpcema \\((1,2)\\) in \\((2,1)\\) je \\(\\det B=1\\cdot1-2\\cdot2=-3\\). Ploščina slike je še vedno \\(3\\), vendar oglišča tečejo v smeri urnega kazalca in predznačena Gaussova ploščinska vsota je \\(-3\\). Orientacija je obrnjena.', 'For the matrix \\(B\\) with columns \\((1,2)\\) and \\((2,1)\\) we get \\(\\det B=1\\cdot1-2\\cdot2=-3\\). The image still has area \\(3\\), but the vertices now run clockwise and the signed shoelace sum is \\(-3\\). The orientation is reversed.'),
            words('Zakaj je ploščina \\(3\\), predznak pa negativen? Pogledaj oznake oglišč \\(0,e_1,e_1{+}e_2,e_2\\).', 'Why is the area \\(3\\) while the sign is negative? Look at the vertex labels \\(0,e_1,e_1{+}e_2,e_2\\).'),
            [mode('determinant'), example('orientation-reversing')]),
        step('det-flip',
            words('Obrat nastopi pri kolinearnosti', 'The flip happens at collinearity'),
            words('Stolpca \\((1,\\tfrac12)\\) in \\((2,\\tfrac54)\\) dasta \\(\\det=1\\cdot\\tfrac54-2\\cdot\\tfrac12=\\tfrac14\\): tanek, a nesesedeni paralelogram. Predznak se zamenja natanko takrat, ko postanejo \\(0\\), \\(a_1\\) in \\(a_2\\) kolinearne. Ker so vnosi večkratniki \\(\\tfrac14\\), sta \\(\\det\\) in predznak izračunana točno, brez tolerance.', 'The columns \\((1,\\tfrac12)\\) and \\((2,\\tfrac54)\\) give \\(\\det=1\\cdot\\tfrac54-2\\cdot\\tfrac12=\\tfrac14\\): a thin but non-degenerate parallelogram. The sign changes exactly when \\(0\\), \\(a_1\\) and \\(a_2\\) become collinear. Because the entries are multiples of \\(\\tfrac14\\), \\(\\det\\) and its sign are computed exactly, without a tolerance.'),
            words('Povleci \\(a_2\\) navzdol za en korak in nato še za enega. Katera dva odčitka se spremenita in pri katerem položaju?', 'Drag \\(a_2\\) down one step and then one more. Which two readouts change, and at which position?'),
            [mode('determinant'), matrix([[1, 2], [1 / 2, 5 / 4]])]),
        step('det-collapse',
            words('Sesedanje: \\(\\det A=0\\)', 'The collapse: \\(\\det A=0\\)'),
            words('Za matriko \\(C\\) s stolpcema \\((1,\\tfrac12)\\) in \\((2,1)\\) je \\(\\det C=1\\cdot1-2\\cdot\\tfrac12=0\\). Kvadrat se preslika na daljico od \\((0,0)\\) do \\((3,\\tfrac32)\\), ravnina na premico. Vektor \\((2,-1)\\) se preslika v \\(2\\,(1,\\tfrac12)-1\\,(2,1)=(0,0)\\): to je smer jedra. Inverza ni, graf pa ne računa ničesar z deljenjem z \\(\\det\\).', 'For the matrix \\(C\\) with columns \\((1,\\tfrac12)\\) and \\((2,1)\\) we get \\(\\det C=1\\cdot1-2\\cdot\\tfrac12=0\\). The square lands on the segment from \\((0,0)\\) to \\((3,\\tfrac32)\\), the plane on a line. The vector \\((2,-1)\\) goes to \\(2\\,(1,\\tfrac12)-1\\,(2,1)=(0,0)\\): a direction of the kernel. There is no inverse, and the graph divides by \\(\\det\\) nowhere.'),
            words('Poišči drug vektor, ki se preslika v \\((0,0)\\), in utemelji, da so vsi takšni vektorji večkratniki \\((2,-1)\\).', 'Find another vector that goes to \\((0,0)\\) and argue that all such vectors are multiples of \\((2,-1)\\).'),
            [mode('determinant'), example('singular')]),
        step('det-product',
            words('Druga matrika in produkt', 'A second matrix and the product'),
            words('Matrika \\(E\\) s stolpcema \\((4,2)\\) in \\((1,3)\\) ima \\(\\det E=4\\cdot3-1\\cdot2=10\\). Izrek o produktu pravi \\(\\det(AE)=\\det A\\cdot\\det E\\): za \\(A\\) iz prvega koraka je \\(3\\cdot10=30\\). Produkt \\(AE\\) ima vnos \\(6\\), ki je zunaj dovoljenega območja grafa, zato ga graf ne nariše; račun velja neodvisno od slike.', 'The matrix \\(E\\) with columns \\((4,2)\\) and \\((1,3)\\) has \\(\\det E=4\\cdot3-1\\cdot2=10\\). The product theorem says \\(\\det(AE)=\\det A\\cdot\\det E\\): for \\(A\\) from the first step this is \\(3\\cdot10=30\\). The product \\(AE\\) has an entry \\(6\\), outside the range the graph accepts, so the graph does not draw it; the computation holds independently of the picture.'),
            words('Izračunaj \\(AE\\) po stolpcih in preveri, da je njena determinanta \\(30\\).', 'Compute \\(AE\\) column by column and check that its determinant is \\(30\\).'),
            [mode('determinant'), example('eigen-default')]),
        step('det-explore',
            words('Ploščina se povsod poveča enako', 'Area scales the same everywhere'),
            words('Izrek: preslikava \\(A\\) pomnoži ploščino vsakega območja z \\(|\\det A|\\). Za enotski kvadrat to prebereš neposredno, za poljubno območje pa sledi iz seštevanja ploščin majhnih kvadratkov, ki se vsi povečajo za isti faktor. Zato je vsaka celica slike mreže paralelogram s ploščino \\(|\\det A|\\). Kvadrat je slika enega območja, ne dokaz za vsa.', 'Theorem: the map \\(A\\) multiplies the area of every region by \\(|\\det A|\\). For the unit square you read it off directly, and for an arbitrary region it follows from adding up the areas of small squares that all grow by the same factor. So every cell of the image grid is a parallelogram of area \\(|\\det A|\\). The square is a picture of one region, not a proof for all.'),
            words('Povleci ročici in primerjaj ploščino ene celice mreže z odčitkom \\(|\\det A|\\).', 'Drag the handles and compare the area of one grid cell with the readout \\(|\\det A|\\).'),
            [mode('determinant'), example('basis-default')]),
    ],
};

// L3 and L4 use explicit frames (explanation, optional calculation, observation) so that the answer of every prediction sits only in the
// self-check disclosure of the observation frame. The eigen and ellipse modes draw their lines, axes and readouts at once, so a step that
// predicts one of those opens in the basis mode (the grid image only) and the learner switches the mode to check.

interface FramedStepContent {
    readonly id: string;
    readonly title: LocalizedText;
    readonly explanation: LocalizedText;
    readonly worked?: LessonWorkedExample;
    readonly prompt: LocalizedText;
    readonly expected: readonly LocalizedText[];
    readonly actions: readonly LessonAction[];
}

const worked = (title: LocalizedText, calculation: string, result: string, check: LocalizedText): LessonWorkedExample =>
    ({title, calculation: words(calculation, calculation), result: words(result, result), check});

function framedStep(content: FramedStepContent): LessonStep {
    const {id, title, explanation, prompt} = content;
    const frames: LessonFrame[] = [
        {id: `${id}-explanation`, kind: 'explanation', title, body: explanation},
        ...(content.worked ? [{id: `${id}-calculation`, kind: 'calculation' as const, title, workedExample: content.worked}] : []),
        {id: `${id}-observation`, kind: 'observation', title, prompt, expectedObservations: content.expected},
    ];
    return {
        id, title, body: explanation, workedExample: content.worked, prompt, frames,
        scene: {actions: [defaultScene(`linear-map-${id}`), ...content.actions]},
    };
}

export const linearMapEigenLesson: LessonDefinition = {
    id: 'linear-map-eigen-directions',
    demonstrationId: 'linear-map',
    title: words('Lastni vektorji in lastne smeri', 'Eigenvectors and eigen-directions'),
    summary: words(
        'Vektor \\(v\\ne0\\) je lastni vektor matrike \\(A\\), če \\(Av\\) leži na premici vektorja \\(v\\), torej \\(Av=\\lambda v\\); število \\(\\lambda\\) je lastna vrednost, premica vektorja \\(v\\) pa lastna smer. Lekcija lastne smeri najprej išče na eni matriki, nato jih izračuna s karakterističnim polinomom in preizkusi na primerih, ki jih ima lahko več, manj ali nobene.',
        'A vector \\(v\\ne0\\) is an eigenvector of the matrix \\(A\\) when \\(Av\\) lies on the line of \\(v\\), that is \\(Av=\\lambda v\\); the number \\(\\lambda\\) is the eigenvalue and the line of \\(v\\) is an eigen-direction. The lesson first looks for eigen-directions on one matrix, then computes them with the characteristic polynomial and tries examples that may have more, fewer or none.',
    ),
    steps: [
        framedStep({
            id: 'eigen-keep',
            title: words('Katera smer ostane smer?', 'Which direction stays a direction?'),
            explanation: words(
                'Linearna preslikava \\(A\\) vektor običajno zasuka in raztegne. Vektor \\(v\\ne0\\) je lastni vektor matrike \\(A\\), če \\(Av\\) leži na premici vektorja \\(v\\): \\(Av=\\lambda v\\) za neko število \\(\\lambda\\), ki ji rečemo lastna vrednost. Pri \\(\\lambda<0\\) se smer obrne, premica pa ostane. Premica lastnega vektorja je lastna smer. Slika kaže mrežo in njeno sliko pri matriki \\(E\\) s stolpcema \\((4,2)\\) in \\((1,3)\\). Slika ponazarja eno matriko; trditve o lastnih vektorjih veljajo za vse linearne preslikave.',
                'A linear map \\(A\\) usually turns and stretches a vector. A vector \\(v\\ne0\\) is an eigenvector of \\(A\\) when \\(Av\\) lies on the line of \\(v\\): \\(Av=\\lambda v\\) for some number \\(\\lambda\\), which we call the eigenvalue. For \\(\\lambda<0\\) the direction is reversed but the line stays. The line of an eigenvector is an eigen-direction. The picture shows the grid and its image under the matrix \\(E\\) with columns \\((4,2)\\) and \\((1,3)\\). The picture illustrates one matrix; the statements about eigenvectors hold for all linear maps.',
            ),
            prompt: words(
                'Napovej: koliko lastnih smeri ima \\(E\\): nobene, eno, dve ali vsako? Odgovor preveri v naslednjem koraku.',
                'Predict: how many eigen-directions does \\(E\\) have: none, one, two or every one? Check the answer in the next step.',
            ),
            expected: [words(
                'Dve: premici skozi izhodišče, vzdolž katerih \\(E\\) vektor le raztegne. Ena ima smer \\((1,1)\\), druga \\((1,-2)\\); vektorji vseh drugih smeri se zasukajo.',
                'Two: lines through the origin along which \\(E\\) only stretches a vector. One has the direction \\((1,1)\\), the other \\((1,-2)\\); vectors of all other directions are turned.',
            )],
            actions: [mode('basis'), example('eigen-default')],
        }),
        framedStep({
            id: 'eigen-parallel',
            title: words('Približno vzporedna', 'Approximately parallel'),
            explanation: words(
                'Način prikaza »Lastne smeri« pokaže enotski vektor \\(v\\), katerega konico vlečemo po krožnici, in njegovo sliko \\(Av\\). Za \\(v\\ne0\\) je \\(v\\) lastni vektor natanko tedaj, ko je \\(\\det(v,Av)=0\\), to je ko je \\(Av\\) večkratnik vektorja \\(v\\). Ker se \\(v\\) spreminja zvezno, graf za »približno vzporedna« uporabi povedano toleranco \\(|\\sin\\angle(v,Av)|<0{,}01\\); to ni točna vzporednost. Odčitek predznačenega sinusa kota od \\(v\\) do \\(Av\\) ima predznak, odčitek kota med \\(v\\) in \\(Av\\) pa je v stopinjah brez predznaka.',
                'The "Eigen-directions" view mode shows the unit vector \\(v\\), whose tip we drag along the circle, and its image \\(Av\\). For \\(v\\ne0\\), \\(v\\) is an eigenvector exactly when \\(\\det(v,Av)=0\\), that is when \\(Av\\) is a multiple of \\(v\\). Because \\(v\\) varies continuously, the graph uses a stated tolerance for "approximately parallel", \\(|\\sin\\angle(v,Av)|<0.01\\); this is not exact parallelism. The readout of the signed sine of the angle from \\(v\\) to \\(Av\\) has a sign, and the readout of the angle between \\(v\\) and \\(Av\\) is in degrees without a sign.',
            ),
            prompt: words(
                'Napovej, preden preklopiš: ko se \\(v\\) zavrti od \\(0^\\circ\\) do \\(180^\\circ\\), kolikokrat se spremeni predznak predznačenega sinusa in kaj to pove o \\(v\\) in \\(Av\\)? Nato izberi način prikaza »Lastne smeri«, premikaj \\(v\\) z drsnikom za kot testnega vektorja in preveri.',
                'Predict before you switch: as \\(v\\) turns from \\(0^\\circ\\) to \\(180^\\circ\\), how many times does the sign of the signed sine change, and what does it say about \\(v\\) and \\(Av\\)? Then choose the "Eigen-directions" view mode, move \\(v\\) with the test vector angle slider and check.',
            ),
            expected: [words(
                'Predznak se spremeni dvakrat, vsakič ko sta \\(v\\) in \\(Av\\) vzporedna, torej pri vsaki od obeh lastnih smeri; med njima je predznak nasproten, pred prvo in po drugi pa enak. Pri \\(0^\\circ\\) je sinus pozitiven (približno \\(0{,}447\\)), saj je \\(v=(1,0)\\) in \\(Av=(4,2)\\).',
                'The sign changes twice, each time \\(v\\) and \\(Av\\) are parallel, that is at each of the two eigen-directions; between them the sign is opposite, before the first and after the second it is the same. At \\(0^\\circ\\) the sine is positive (about \\(0.447\\)), because \\(v=(1,0)\\) and \\(Av=(4,2)\\).',
            )],
            actions: [mode('basis'), example('eigen-default')],
        }),
        framedStep({
            id: 'eigen-second',
            title: words('Druga lastna smer', 'The second eigen-direction'),
            explanation: words(
                'Pri \\(v=(1,1)\\) velja \\(Ev=(5,5)=5v\\), torej je \\(v\\) lastni vektor z lastno vrednostjo \\(5\\), in to točno: \\(\\det(v,Ev)=1\\cdot5-1\\cdot5=0\\). Druga lastna smer ima smerni vektor \\((1,k)\\) za neko število \\(k\\). Enotski vektor v tej smeri ni na četrtinski mreži, zato je vzporednost tam le približna: okno \\(|\\sin|<0{,}01\\) je okoli te smeri široko le približno \\(\\pm0{,}38^\\circ\\) (okoli prve približno \\(\\pm0{,}95^\\circ\\)). Zato \\(v\\) ne ciljaj z vlečenjem, temveč uporabi gumb »Pritegni v k lastni smeri«, ki \\(v\\) premakne v najbližjo lastno smer.',
                'At \\(v=(1,1)\\) we have \\(Ev=(5,5)=5v\\), so \\(v\\) is an eigenvector with eigenvalue \\(5\\), and exactly: \\(\\det(v,Ev)=1\\cdot5-1\\cdot5=0\\). The second eigen-direction has a direction vector \\((1,k)\\) for some number \\(k\\). The unit vector in this direction is not on the quarter grid, so parallelism there is only approximate: the window \\(|\\sin|<0.01\\) around it is only about \\(\\pm0.38^\\circ\\) wide (around the first about \\(\\pm0.95^\\circ\\)). So do not aim \\(v\\) by dragging; use the button "Snap v to the eigen-direction", which moves \\(v\\) to the nearest eigen-direction.',
            ),
            worked: worked(
                words('Lastni vektor \\((1,1)\\)', 'The eigenvector \\((1,1)\\)'),
                '\\[E\\begin{pmatrix}1\\\\1\\end{pmatrix}=\\begin{pmatrix}4\\cdot1+1\\cdot1\\\\2\\cdot1+3\\cdot1\\end{pmatrix}\\]',
                '\\[=\\begin{pmatrix}5\\\\5\\end{pmatrix}=5\\begin{pmatrix}1\\\\1\\end{pmatrix}\\]',
                words('Vektor \\((1,1)\\) in njegova slika sta vzporedna: \\(\\det\\bigl((1,1),(5,5)\\bigr)=0\\).', 'The vector \\((1,1)\\) and its image are parallel: \\(\\det\\bigl((1,1),(5,5)\\bigr)=0\\).'),
            ),
            prompt: words(
                'Izračunaj drugo lastno smer: poišči \\(k\\) in \\(\\lambda\\), da je \\(E(1,k)=\\lambda(1,k)\\) (reši \\(4+k=\\lambda\\) in \\(2+3k=\\lambda k\\); rešitev \\(k=1\\) že poznaš). Nato izberi način prikaza »Lastne smeri«, z drsnikom postavi \\(v\\) blizu izračunane smeri, pritegni \\(v\\) in primerjaj. Ugotovi še, ali sta lastni smeri pravokotni.',
                'Compute the second eigen-direction: find \\(k\\) and \\(\\lambda\\) with \\(E(1,k)=\\lambda(1,k)\\) (solve \\(4+k=\\lambda\\) and \\(2+3k=\\lambda k\\); you already know the solution \\(k=1\\)). Then choose the "Eigen-directions" view mode, use the slider to put \\(v\\) near the computed direction, snap \\(v\\) and compare. Also find out whether the two eigen-directions are perpendicular.',
            ),
            expected: [words(
                'Dobiš \\(k^2+k-2=0\\), torej \\(k=1\\) ali \\(k=-2\\). Drugi vektor je \\((1,-2)\\): \\(E(1,-2)=(2,-4)=2\\,(1,-2)\\), lastna vrednost \\(2\\). Po pritegnitvi je \\(v\\) pri približno \\(116{,}57^\\circ\\) in sinus je skoraj \\(0\\). Kot med lastnima vektorjema je \\(108{,}43^\\circ\\) (ostri kot \\(71{,}57^\\circ\\)): pri \\(E\\) lastni smeri nista pravokotni. Pri splošni matriki lastni smeri nista nujno pravokotni; pri simetrični matriki sta (naslednja lekcija).',
                'You get \\(k^2+k-2=0\\), so \\(k=1\\) or \\(k=-2\\). The second vector is \\((1,-2)\\): \\(E(1,-2)=(2,-4)=2\\,(1,-2)\\), eigenvalue \\(2\\). After the snap, \\(v\\) is at about \\(116.57^\\circ\\) and the sine is nearly \\(0\\). The angle between the eigenvectors is \\(108.43^\\circ\\) (acute angle \\(71.57^\\circ\\)): for \\(E\\) the eigen-directions are not perpendicular, and for a general matrix they need not meet at a right angle.',
            )],
            actions: [mode('basis'), example('eigen-default')],
        }),
        framedStep({
            id: 'eigen-polynomial',
            title: words('Karakteristični polinom', 'The characteristic polynomial'),
            explanation: words(
                'Izrek: število \\(\\lambda\\) je lastna vrednost matrike \\(A\\) natanko tedaj, ko je \\(\\det(A-\\lambda I)=0\\); sicer bi imela matrika \\(A-\\lambda I\\) inverz in iz \\((A-\\lambda I)v=0\\) bi sledilo \\(v=0\\). Za matriko \\(2\\times2\\) je to karakteristični polinom \\(\\lambda^2-\\tau\\lambda+\\delta=0\\), kjer je \\(\\tau\\) sled (vsota diagonale) in \\(\\delta=\\det A\\). Njegova diskriminanta je \\(\\Delta=\\tau^2-4\\delta\\), lastni vrednosti pa sta \\(\\tfrac{\\tau\\pm\\sqrt\\Delta}{2}\\). Če je \\(\\Delta>0\\), ima \\(A\\) dve realni lastni smeri; če je \\(\\Delta<0\\), nobene (lastni vrednosti sta kompleksni); če je \\(\\Delta=0\\), je ena lastna vrednost \\(\\tfrac\\tau2\\) in je vsaka smer lastna (kadar je \\(A=\\tfrac\\tau2I\\)) ali natanko ena (sicer). To so izreki za linearne preslikave; slika jih ponazarja na eni matriki. Slika zdaj kaže matriko \\(C\\), pri kateri se mreža sesede.',
                'Theorem: a number \\(\\lambda\\) is an eigenvalue of the matrix \\(A\\) exactly when \\(\\det(A-\\lambda I)=0\\); otherwise \\(A-\\lambda I\\) would have an inverse and \\((A-\\lambda I)v=0\\) would give \\(v=0\\). For a \\(2\\times2\\) matrix this is the characteristic polynomial \\(\\lambda^2-\\tau\\lambda+\\delta=0\\), where \\(\\tau\\) is the trace (the sum of the diagonal) and \\(\\delta=\\det A\\). Its discriminant is \\(\\Delta=\\tau^2-4\\delta\\), and the eigenvalues are \\(\\tfrac{\\tau\\pm\\sqrt\\Delta}{2}\\). If \\(\\Delta>0\\), \\(A\\) has two real eigen-directions; if \\(\\Delta<0\\), none (the eigenvalues are complex); if \\(\\Delta=0\\), there is one eigenvalue \\(\\tfrac\\tau2\\) and either every direction is an eigen-direction (when \\(A=\\tfrac\\tau2I\\)) or exactly one (otherwise). These are theorems about linear maps; the picture illustrates them on one matrix. The picture now shows the matrix \\(C\\), under which the grid collapses.',
            ),
            worked: worked(
                words('Matrika \\(E\\)', 'The matrix \\(E\\)'),
                '\\[\\lambda^2-7\\lambda+10=0,\\qquad\\Delta=7^2-4\\cdot10\\]',
                '\\[\\Delta=9,\\qquad\\lambda=\\frac{7\\pm3}{2}\\]',
                words('Lastni vrednosti \\(5\\) in \\(2\\) sta enaki tistima iz prejšnjega koraka.', 'The eigenvalues \\(5\\) and \\(2\\) are the ones from the previous step.'),
            ),
            prompt: words(
                'Napovej za matriko \\(C\\) s stolpcema \\((1,\\tfrac12)\\) in \\((2,1)\\): izračunaj \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) iz vnosov, nato lastni vrednosti in lastni smeri. Preveri tako, da v izbiri načina prikaza izbereš »Lastne smeri«.',
                'Predict for the matrix \\(C\\) with columns \\((1,\\tfrac12)\\) and \\((2,1)\\): compute \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) from the entries, then the eigenvalues and eigen-directions. Check by choosing "Eigen-directions" in the view mode selector.',
            ),
            expected: [words(
                'Za \\(C\\) je \\(\\tau=1+1=2\\), \\(\\delta=1\\cdot1-2\\cdot\\tfrac12=0\\), \\(\\Delta=4\\), torej sta lastni vrednosti \\(2\\) in \\(0\\). Lastna smer vrednosti \\(0\\) je jedro, vektor \\((2,-1)\\); lastna smer vrednosti \\(2\\) je \\((2,1)\\), saj je \\(C(2,1)=(4,2)\\). Graf pove, da lastna vrednost \\(0\\) nastopi, ker je \\(\\det C=0\\).',
                'For \\(C\\), \\(\\tau=1+1=2\\), \\(\\delta=1\\cdot1-2\\cdot\\tfrac12=0\\), \\(\\Delta=4\\), so the eigenvalues are \\(2\\) and \\(0\\). The eigen-direction of \\(0\\) is the kernel, the vector \\((2,-1)\\); the eigen-direction of \\(2\\) is \\((2,1)\\), since \\(C(2,1)=(4,2)\\). The graph says that the eigenvalue \\(0\\) occurs because \\(\\det C=0\\).',
            )],
            actions: [mode('basis'), example('singular')],
        }),
        framedStep({
            id: 'eigen-rotation',
            title: words('Četrtinski vrtež', 'The quarter turn'),
            explanation: words(
                'Matrika \\(R\\) s stolpcema \\((0,1)\\) in \\((-1,0)\\) zavrti ravnino za \\(90^\\circ\\) v pozitivni smeri: \\(e_1\\) gre v \\((0,1)\\), \\(e_2\\) v \\((-1,0)\\). Uporabi izrek iz prejšnjega koraka.',
                'The matrix \\(R\\) with columns \\((0,1)\\) and \\((-1,0)\\) turns the plane by \\(90^\\circ\\) in the positive direction: \\(e_1\\) goes to \\((0,1)\\), \\(e_2\\) to \\((-1,0)\\). Use the theorem of the previous step.',
            ),
            prompt: words(
                'Napovej: izračunaj \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) za \\(R\\) in odloči, ali ima \\(R\\) realno lastno smer ter kakšni sta lastni vrednosti. Preveri v načinu »Lastne smeri« in zavrti \\(v\\): kaj je s kotom med \\(v\\) in \\(Av\\)?',
                'Predict: compute \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) for \\(R\\) and decide whether \\(R\\) has a real eigen-direction and what the eigenvalues are. Check in the "Eigen-directions" mode and turn \\(v\\): what happens to the angle between \\(v\\) and \\(Av\\)?',
            ),
            expected: [words(
                'Za \\(R\\) je \\(\\tau=0\\), \\(\\delta=1\\), \\(\\Delta=-4<0\\): realne lastne smeri ni, lastni vrednosti sta \\(\\pm\\mathrm i\\). Graf ne nariše nobene premice in to pove z besedami. Kot med \\(v\\) in \\(Av\\) je pri vsakem \\(v\\) enak \\(90^\\circ\\).',
                'For \\(R\\), \\(\\tau=0\\), \\(\\delta=1\\), \\(\\Delta=-4<0\\): there is no real eigen-direction, the eigenvalues are \\(\\pm\\mathrm i\\). The graph draws no line and says so in words. The angle between \\(v\\) and \\(Av\\) is \\(90^\\circ\\) for every \\(v\\).',
            )],
            actions: [mode('basis'), example('quarter-turn')],
        }),
        framedStep({
            id: 'eigen-shear-scalar',
            title: words('Strig in razteg', 'The shear and the scaling'),
            explanation: words(
                'Strig \\(S\\) ima stolpca \\((1,0)\\) in \\((1,1)\\): vodoravnice ostanejo vodoravne, navpičnice se nagnejo. Matrika \\(2I\\) vsak vektor pomnoži z \\(2\\). Obe imata \\(\\Delta=0\\), ki ga izrek iz četrtega koraka deli na dva primera.',
                'The shear \\(S\\) has columns \\((1,0)\\) and \\((1,1)\\): horizontal lines stay horizontal, vertical lines tilt. The matrix \\(2I\\) multiplies every vector by \\(2\\). Both have \\(\\Delta=0\\), which the theorem of the fourth step splits into two cases.',
            ),
            prompt: words(
                'Napovej: izračunaj \\(\\Delta\\) za \\(S\\) in odloči, ali ima eno ali vsako lastno smer ter katero. Isto napovej za \\(2I\\) (izberi jo v izbiri primera). Preveri v načinu »Lastne smeri«.',
                'Predict: compute \\(\\Delta\\) for \\(S\\) and decide whether it has one eigen-direction or every direction, and which. Predict the same for \\(2I\\) (choose it in the example selector). Check in the "Eigen-directions" mode.',
            ),
            expected: [words(
                'Za \\(S\\): \\(\\tau=2\\), \\(\\delta=1\\), \\(\\Delta=0\\), lastna vrednost \\(1\\), samo ena lastna smer \\((1,0)\\), saj je \\(S(1,0)=(1,0)\\) in \\(S\\) ni večkratnik identitete. Za \\(2I\\): \\(\\Delta=0\\), lastna vrednost \\(2\\), vsaka smer je lastna in graf ne nariše nobene premice.',
                'For \\(S\\): \\(\\tau=2\\), \\(\\delta=1\\), \\(\\Delta=0\\), eigenvalue \\(1\\), only one eigen-direction \\((1,0)\\), since \\(S(1,0)=(1,0)\\) and \\(S\\) is not a multiple of the identity. For \\(2I\\): \\(\\Delta=0\\), eigenvalue \\(2\\), every direction is an eigen-direction and the graph draws no line.',
            )],
            actions: [mode('basis'), example('shear')],
        }),
        framedStep({
            id: 'eigen-explore',
            title: words('Prosto raziskovanje', 'Free exploration'),
            explanation: words(
                'Vnose spreminjaj z ročicama ali s številskimi vnosi; vsak je večkratnik \\(\\tfrac14\\) med \\(-4\\) in \\(4\\). Graf primer (dve smeri, ena, vsaka ali nobena) in diskriminanto določi točno, lastne vrednosti, smeri, sinuse in kote pa izračuna.',
                'Change the entries with the handles or the numeric entries; each is a multiple of \\(\\tfrac14\\) between \\(-4\\) and \\(4\\). The graph decides the case (two directions, one, every or none) and the discriminant exactly, and computes the eigenvalues, directions, sines and angles.',
            ),
            prompt: words(
                'Poišči matriko z natanko eno lastno smerjo, ki ni \\(S\\), in matriko z lastno vrednostjo \\(0\\), ki ni \\(C\\). Pri vsaki najprej napovej predznak \\(\\Delta\\), nato ga preberi.',
                'Find a matrix with exactly one eigen-direction that is not \\(S\\), and a matrix with the eigenvalue \\(0\\) that is not \\(C\\). For each, first predict the sign of \\(\\Delta\\), then read it.',
            ),
            expected: [words(
                'Natanko ena lastna smer zahteva \\(\\Delta=\\tau^2-4\\delta=0\\) in matriko, ki ni večkratnik identitete, npr. \\(\\begin{pmatrix}1&\\tfrac14\\\\0&1\\end{pmatrix}\\). Lastna vrednost \\(0\\) zahteva \\(\\det A=0\\), npr. \\(\\begin{pmatrix}1&0\\\\0&0\\end{pmatrix}\\) z \\(\\Delta=1>0\\).',
                'Exactly one eigen-direction requires \\(\\Delta=\\tau^2-4\\delta=0\\) and a matrix that is not a multiple of the identity, for example \\(\\begin{pmatrix}1&\\tfrac14\\\\0&1\\end{pmatrix}\\). The eigenvalue \\(0\\) requires \\(\\det A=0\\), for example \\(\\begin{pmatrix}1&0\\\\0&0\\end{pmatrix}\\) with \\(\\Delta=1>0\\).',
            )],
            actions: [mode('eigen'), example('basis-default'), testVector(0)],
        }),
    ],
};

export const linearMapEllipseLesson: LessonDefinition = {
    id: 'linear-map-singular-ellipse',
    demonstrationId: 'linear-map',
    title: words('Simetrične matrike, elipse in singularne smeri', 'Symmetric matrices, ellipses and singular directions'),
    summary: words(
        'Slika enotske krožnice pri linearni preslikavi ravnine je elipsa, daljica ali točka; njeni polosi sta singularni vrednosti, smeri osi pa singularni smeri. Lekcija te smeri primerja z lastnimi smermi simetrične in nesimetrične matrike ter prikaže kvadratno formo kot stožnico.',
        'The image of the unit circle under a linear map of the plane is an ellipse, a segment or a point; its semi-axes are the singular values and the directions of its axes are the singular directions. The lesson compares these directions with the eigen-directions of a symmetric and a non-symmetric matrix and shows the quadratic form as a conic.',
    ),
    steps: [
        framedStep({
            id: 'ellipse-image',
            title: words('Slika krožnice', 'The image of the circle'),
            explanation: words(
                'Izrek (singularni razcep; izrek iz linearne algebre, naveden npr. v tečaju Algebra 1 na FMF, tu ni dokazan): za vsako realno matriko \\(A\\) velikosti \\(2\\times2\\) obstajata pravokotna enotska vektorja \\(v_1,v_2\\) (singularni smeri, lastna vektorja matrike \\(A^TA\\)) in števili \\(\\sigma_1\\ge\\sigma_2\\ge0\\) (singularni vrednosti), da je \\(Av_i=\\sigma_iu_i\\) za pravokotna enotska vektorja \\(u_1,u_2\\). Slika enotske krožnice je zato elipsa s polosema \\(\\sigma_1\\) in \\(\\sigma_2\\) vzdolž \\(u_1\\) in \\(u_2\\) ali daljica ali točka, če je \\(\\sigma_2=0\\). Narisana elipsa je ilustracija za eno matriko. Slika kaže mrežo matrike \\(S_y\\) s stolpcema \\((2,1)\\) in \\((1,2)\\).',
                'Theorem (singular value decomposition; a theorem of linear algebra, stated for example in the FMF course Algebra 1, not proved here): for every real \\(2\\times2\\) matrix \\(A\\) there are perpendicular unit vectors \\(v_1,v_2\\) (the singular directions, eigenvectors of \\(A^TA\\)) and numbers \\(\\sigma_1\\ge\\sigma_2\\ge0\\) (the singular values) such that \\(Av_i=\\sigma_iu_i\\) for perpendicular unit vectors \\(u_1,u_2\\). The image of the unit circle is therefore an ellipse with semi-axes \\(\\sigma_1\\) and \\(\\sigma_2\\) along \\(u_1\\) and \\(u_2\\), or a segment or a point when \\(\\sigma_2=0\\). The drawn ellipse is an illustration for one matrix. The picture shows the grid of the matrix \\(S_y\\) with columns \\((2,1)\\) and \\((1,2)\\).',
            ),
            prompt: words(
                'Napovej: v kateri smeri \\(S_y\\) enotsko krožnico najbolj raztegne in v kateri najmanj ter kako dolga sta najdaljša in najkrajša slika enotskega vektorja? Nato v izbiri načina prikaza izberi »Elipsa in singularne smeri« in primerjaj.',
                'Predict: in which direction does \\(S_y\\) stretch the unit circle the most and in which the least, and how long are the longest and the shortest image of a unit vector? Then choose "Ellipse and singular directions" in the view mode selector and compare.',
            ),
            expected: [words(
                'Najbolj raztegne v smeri \\((1,1)\\), pod \\(45^\\circ\\): najdaljša slika ima dolžino \\(\\sigma_1=3\\). Najmanj raztegne v smeri \\((1,-1)\\): najkrajša slika ima dolžino \\(\\sigma_2=1\\). Dolga os elipse leži pod \\(45^\\circ\\).',
                'It stretches the most in the direction \\((1,1)\\), at \\(45^\\circ\\): the longest image has length \\(\\sigma_1=3\\). It stretches the least in the direction \\((1,-1)\\): the shortest image has length \\(\\sigma_2=1\\). The long axis of the ellipse lies at \\(45^\\circ\\).',
            )],
            actions: [mode('basis'), example('symmetric')],
        }),
        framedStep({
            id: 'ellipse-eigen',
            title: words('Lastne vrednosti matrike \\(S_y\\)', 'The eigenvalues of \\(S_y\\)'),
            explanation: words(
                'Matrika \\(S_y\\) je simetrična: vnosa zunaj diagonale sta enaka. Njene lastne vrednosti in vektorje izračunamo kot v lekciji o lastnih smereh in jih nato primerjamo s singularnimi vrednostmi.',
                'The matrix \\(S_y\\) is symmetric: the two entries off the diagonal are equal. We compute its eigenvalues and eigenvectors as in the lesson on eigen-directions and then compare them with the singular values.',
            ),
            worked: worked(
                words('Karakteristični polinom matrike \\(S_y\\)', 'The characteristic polynomial of \\(S_y\\)'),
                '\\[\\lambda^2-4\\lambda+3=0,\\qquad\\Delta=4^2-4\\cdot3\\]',
                '\\[\\Delta=4,\\qquad\\lambda=\\frac{4\\pm2}{2}\\]',
                words('Za \\(\\lambda=3\\) rešitev sistema \\((S_y-3I)v=0\\) je \\(v=(1,1)\\), za \\(\\lambda=1\\) pa \\(v=(1,-1)\\).', 'For \\(\\lambda=3\\) the solution of \\((S_y-3I)v=0\\) is \\(v=(1,1)\\), and for \\(\\lambda=1\\) it is \\(v=(1,-1)\\).'),
            ),
            prompt: words(
                'Pri \\(S_y\\) se lastni vrednosti in vektorja ujemata s polosema in osema elipse iz prejšnjega koraka. Simetrična matrika \\(B\\) s stolpcema \\((1,2)\\) in \\((2,1)\\) ima isti lastni vektor \\((1,1)\\) z lastno vrednostjo \\(3\\) in \\((1,-1)\\) z lastno vrednostjo \\(-1\\). Napovej \\(\\sigma_1\\), \\(\\sigma_2\\) in smeri osi elipse za \\(B\\). Nato vnesi \\(B\\) in preveri v načinu »Elipsa in singularne smeri«.',
                'For \\(S_y\\) the eigenvalues and eigenvectors match the semi-axes and axes of the ellipse from the previous step. The symmetric matrix \\(B\\) with columns \\((1,2)\\) and \\((2,1)\\) has the same eigenvector \\((1,1)\\) with eigenvalue \\(3\\) and \\((1,-1)\\) with eigenvalue \\(-1\\). Predict \\(\\sigma_1\\), \\(\\sigma_2\\) and the directions of the ellipse axes for \\(B\\). Then enter \\(B\\) and check in the "Ellipse and singular directions" mode.',
            ),
            expected: [words(
                'Za \\(B\\) je \\(\\sigma_1=3\\) in \\(\\sigma_2=1\\), osi ležita vzdolž \\((1,1)\\) in \\((1,-1)\\): singularna vrednost ne more biti negativna, zato je \\(\\sigma_2=|-1|\\). Pri \\(S_y\\) sta singularni vrednosti enaki lastnima vrednostma, osi elipse pa sta lastni smeri. Izrek: lastna vektorja simetrične matrike za različni lastni vrednosti sta pravokotna (tu \\((1,1)\\cdot(1,-1)=0\\)), singularne vrednosti simetrične matrike so absolutne vrednosti njenih lastnih vrednosti, singularne smeri pa so njeni lastni vektorji do predznaka ali zamenjave. Graf pove, da je matrika simetrična.',
                'For \\(B\\), \\(\\sigma_1=3\\) and \\(\\sigma_2=1\\), with the axes along \\((1,1)\\) and \\((1,-1)\\): a singular value cannot be negative, so \\(\\sigma_2=|-1|\\). For \\(S_y\\) the singular values equal the eigenvalues and the axes of the ellipse are the eigen-directions. Theorem: eigenvectors of a symmetric matrix for different eigenvalues are perpendicular (here \\((1,1)\\cdot(1,-1)=0\\)), the singular values of a symmetric matrix are the absolute values of its eigenvalues, and the singular directions are its eigenvectors up to sign or a swap. The graph says that the matrix is symmetric.',
            )],
            actions: [mode('eigen'), example('symmetric'), testVector(20)],
        }),
        framedStep({
            id: 'ellipse-conic',
            title: words('Kvadratna forma kot stožnica', 'The quadratic form as a conic'),
            explanation: words(
                'Simetrični del matrike \\(A\\) je \\(S=\\tfrac12(A+A^T)\\); za vsak \\(x\\) velja \\(x^TAx=x^TSx\\), zato kvadratna forma matrike \\(A\\) pozna le \\(S\\). Množica \\(x^TSx=1\\) je stožnica. Če je \\(S\\) pozitivno definitna (obe lastni vrednosti sta pozitivni), je to elipsa, katere osi ležijo vzdolž lastnih vektorjev matrike \\(S\\) (izrek o glavnih oseh). Pri \\(S_y\\) je \\(S=S_y\\) in forma je \\(2x^2+2xy+2y^2=1\\). Narisana stožnica je ilustracija. Stikalo »Namesto slike krožnice: kvadratna forma ...« jo prikaže.',
                'The symmetric part of a matrix \\(A\\) is \\(S=\\tfrac12(A+A^T)\\); for every \\(x\\), \\(x^TAx=x^TSx\\), so the quadratic form of \\(A\\) knows only \\(S\\). The set \\(x^TSx=1\\) is a conic. If \\(S\\) is positive definite (both eigenvalues positive), it is an ellipse whose axes lie along the eigenvectors of \\(S\\) (the principal axes theorem). For \\(S_y\\), \\(S=S_y\\) and the form is \\(2x^2+2xy+2y^2=1\\). The drawn conic is an illustration. The switch "Instead of the image of the circle: the quadratic form ..." shows it.',
            ),
            worked: worked(
                words('Polos stožnice vzdolž lastnega vektorja', 'A semi-axis of the conic along an eigenvector'),
                '\\[x=t\\,w,\\qquad Sw=\\lambda w,\\qquad|w|=1\\]',
                '\\[x^TSx=t^2\\,w^TSw=\\lambda t^2=1\\]',
                words('Iz \\(\\lambda t^2=1\\) izračunaj \\(t\\): to je polos vzdolž \\(w\\), kadar je \\(\\lambda>0\\).', 'Solve \\(\\lambda t^2=1\\) for \\(t\\): this is the semi-axis along \\(w\\) when \\(\\lambda>0\\).'),
            ),
            prompt: words(
                'Napovej polosi stožnice \\(2x^2+2xy+2y^2=1\\) in smer vsake; katera je daljša? Nato vklopi stikalo za stožnico in primerjaj.',
                'Predict the semi-axes of the conic \\(2x^2+2xy+2y^2=1\\) and the direction of each; which is longer? Then switch the conic on and compare.',
            ),
            expected: [words(
                'Iz \\(\\lambda t^2=1\\) sledi \\(t=\\pm1/\\sqrt\\lambda\\). Polos \\(1/\\sqrt3\\approx0{,}5774\\) leži vzdolž \\((1,1)\\) (večja lastna vrednost \\(3\\)), polos \\(1\\) pa vzdolž \\((1,-1)\\) (lastna vrednost \\(1\\)). Daljša polos je torej vzdolž manjše lastne vrednosti. Točka \\((s,s)/\\sqrt2\\) pri \\(s=1/\\sqrt3\\) leži na stožnici: \\(\\tfrac13+\\tfrac13+\\tfrac13=1\\).',
                'From \\(\\lambda t^2=1\\) we get \\(t=\\pm1/\\sqrt\\lambda\\). The semi-axis \\(1/\\sqrt3\\approx0.5774\\) lies along \\((1,1)\\) (the larger eigenvalue \\(3\\)), and the semi-axis \\(1\\) along \\((1,-1)\\) (eigenvalue \\(1\\)). So the longer semi-axis is along the smaller eigenvalue. The point \\((s,s)/\\sqrt2\\) with \\(s=1/\\sqrt3\\) lies on the conic: \\(\\tfrac13+\\tfrac13+\\tfrac13=1\\).',
            )],
            actions: [mode('ellipse'), example('symmetric'), conic(false)],
        }),
        framedStep({
            id: 'ellipse-nonsymmetric',
            title: words('Nesimetrična matrika \\(N\\)', 'The non-symmetric matrix \\(N\\)'),
            explanation: words(
                'Matrika \\(N\\) s stolpcema \\((2,0)\\) in \\((1,1)\\) ni simetrična. Njen karakteristični polinom \\(\\lambda^2-3\\lambda+2\\) (\\(\\tau=3\\), \\(\\delta=2\\), \\(\\Delta=1\\)) da lastni vrednosti \\(2\\) in \\(1\\) z lastnima vektorjema \\((1,0)\\) in \\((1,-1)\\), ki sta pod kotom \\(45^\\circ\\). Izrek o singularnem razcepu velja tudi za \\(N\\).',
                'The matrix \\(N\\) with columns \\((2,0)\\) and \\((1,1)\\) is not symmetric. Its characteristic polynomial \\(\\lambda^2-3\\lambda+2\\) (\\(\\tau=3\\), \\(\\delta=2\\), \\(\\Delta=1\\)) gives the eigenvalues \\(2\\) and \\(1\\) with eigenvectors \\((1,0)\\) and \\((1,-1)\\), at an angle of \\(45^\\circ\\). The singular value decomposition theorem holds for \\(N\\) too.',
            ),
            prompt: words(
                'Napovej: ali sta lastni smeri matrike \\(N\\) osi elipse, ki je slika enotske krožnice? Če nista, pod katerim kotom približno leži dolga os? Preveri v načinu »Elipsa in singularne smeri«.',
                'Predict: are the eigen-directions of \\(N\\) the axes of the ellipse that is the image of the unit circle? If not, at about which angle does the long axis lie? Check in the "Ellipse and singular directions" mode.',
            ),
            expected: [words(
                'Ne. Singularni vrednosti sta \\(\\sqrt{3\\pm\\sqrt5}\\approx2{,}288\\) in \\(0{,}874\\). Dolga os slike leži pod približno \\(13{,}28^\\circ\\), singularna smer \\(v_1\\) v domeni pod približno \\(31{,}72^\\circ\\); lastni smeri matrike \\(N\\) sta pod \\(0^\\circ\\) in \\(135^\\circ\\). Za nesimetrično matriko graf uporabi singularne smeri, ne lastnih vektorjev, in to pove v stanju.',
                'No. The singular values are \\(\\sqrt{3\\pm\\sqrt5}\\approx2.288\\) and \\(0.874\\). The long axis of the image lies at about \\(13.28^\\circ\\), the singular direction \\(v_1\\) in the domain at about \\(31.72^\\circ\\); the eigen-directions of \\(N\\) are at \\(0^\\circ\\) and \\(135^\\circ\\). For a non-symmetric matrix the graph uses the singular directions, not the eigenvectors, and says so in the status.',
            )],
            actions: [mode('eigen'), example('non-symmetric'), testVector(20)],
        }),
        framedStep({
            id: 'ellipse-product',
            title: words('Ploščina in singularni vrednosti', 'Area and the singular values'),
            explanation: words(
                'Iz lekcije o determinanti: linearna preslikava \\(A\\) pomnoži ploščino vsakega območja z \\(|\\det A|\\). Enotski krog ima ploščino \\(\\pi\\), elipsa s polosema \\(a\\) in \\(b\\) pa ploščino \\(\\pi ab\\). Slika kaže mrežo matrike \\(N\\).',
                'From the lesson on the determinant: a linear map \\(A\\) multiplies the area of every region by \\(|\\det A|\\). The unit disc has area \\(\\pi\\), and an ellipse with semi-axes \\(a\\) and \\(b\\) has area \\(\\pi ab\\). The picture shows the grid of the matrix \\(N\\).',
            ),
            prompt: words(
                'Napovej zmnožek \\(\\sigma_1\\sigma_2\\) singularnih vrednosti matrike \\(N\\), ne da bi bral odčitek. Preveri v načinu »Elipsa in singularne smeri«.',
                'Predict the product \\(\\sigma_1\\sigma_2\\) of the singular values of \\(N\\) without reading the readout. Check in the "Ellipse and singular directions" mode.',
            ),
            expected: [words(
                'Ploščina kroga \\(\\pi\\) se pomnoži z \\(|\\det N|=2\\), ploščina elipse je \\(\\pi\\sigma_1\\sigma_2\\), torej \\(\\sigma_1\\sigma_2=2\\) (res \\(2{,}288\\cdot0{,}874\\approx2\\)). Enako velja za vsako matriko: \\(\\sigma_1\\sigma_2=|\\det A|\\).',
                'The area \\(\\pi\\) of the disc is multiplied by \\(|\\det N|=2\\), the area of the ellipse is \\(\\pi\\sigma_1\\sigma_2\\), so \\(\\sigma_1\\sigma_2=2\\) (indeed \\(2.288\\cdot0.874\\approx2\\)). The same holds for every matrix: \\(\\sigma_1\\sigma_2=|\\det A|\\).',
            )],
            actions: [mode('basis'), example('non-symmetric')],
        }),
        framedStep({
            id: 'ellipse-circle',
            title: words('Četrtinski vrtež', 'The quarter turn'),
            explanation: words(
                'Matrika \\(R\\) s stolpcema \\((0,1)\\) in \\((-1,0)\\) je četrtinski vrtež iz lekcije o lastnih smereh.',
                'The matrix \\(R\\) with columns \\((0,1)\\) and \\((-1,0)\\) is the quarter turn from the lesson on eigen-directions.',
            ),
            prompt: words(
                'Napovej: kakšna je slika enotske krožnice pri \\(R\\), koliko sta \\(\\sigma_1\\) in \\(\\sigma_2\\) in ali sta osi enolični? Preveri v načinu »Elipsa in singularne smeri«.',
                'Predict: what is the image of the unit circle under \\(R\\), what are \\(\\sigma_1\\) and \\(\\sigma_2\\), and are the axes unique? Check in the "Ellipse and singular directions" mode.',
            ),
            expected: [words(
                'Slika je krožnica s polmerom \\(1\\): \\(\\sigma_1=\\sigma_2=1\\), ker \\(R\\) ohranja dolžine. Osi niso enolične, zato jih graf ne nariše in to pove v stanju. Tudi tukaj je \\(\\sigma_1\\sigma_2=1=|\\det R|\\).',
                'The image is a circle of radius \\(1\\): \\(\\sigma_1=\\sigma_2=1\\), because \\(R\\) preserves lengths. The axes are not unique, so the graph does not draw them and says so in the status. Here too \\(\\sigma_1\\sigma_2=1=|\\det R|\\).',
            )],
            actions: [mode('basis'), example('quarter-turn')],
        }),
        framedStep({
            id: 'ellipse-explore',
            title: words('Prosto raziskovanje', 'Free exploration'),
            explanation: words(
                'Vnose spreminjaj z ročicama ali s številskimi vnosi; vsak je večkratnik \\(\\tfrac14\\) med \\(-4\\) in \\(4\\). Pri stožnici graf narisano elipso nariše le, kadar je simetrični del pozitivno definiten; sicer stožnico opiše z besedami.',
                'Change the entries with the handles or the numeric entries; each is a multiple of \\(\\tfrac14\\) between \\(-4\\) and \\(4\\). For the conic the graph draws an ellipse only when the symmetric part is positive definite; otherwise it describes the conic in words.',
            ),
            prompt: words(
                'Poišči matriko, ki ni večkratnik identitete, pa je slika krožnice krožnica, in matriko z \\(\\sigma_2=0\\). Nato vklopi stožnico za \\(N\\) in za \\(F\\) (zrcaljenje čez os \\(x\\)) ter preberi, kaj graf pove o vsaki.',
                'Find a matrix that is not a multiple of the identity but whose image of the circle is a circle, and a matrix with \\(\\sigma_2=0\\). Then switch the conic on for \\(N\\) and for \\(F\\) (the reflection in the \\(x\\)-axis) and read what the graph says about each.',
            ),
            expected: [words(
                'Krožnica: npr. \\(R\\) ali \\(\\begin{pmatrix}1&-1\\\\1&1\\end{pmatrix}\\) z \\(\\sigma_1=\\sigma_2=\\sqrt2\\). \\(\\sigma_2=0\\) pomeni \\(\\det A=0\\), npr. \\(C\\): slika je daljica, ne elipsa. Za \\(N\\) je simetrični del \\(\\begin{pmatrix}2&\\tfrac12\\\\\\tfrac12&1\\end{pmatrix}\\) pozitivno definiten in stožnica je elipsa. Za \\(F\\) je simetrični del \\(F\\) sam, nedefiniten: stožnica je hiperbola, ki jo graf opiše, a ne nariše.',
                'A circle: for example \\(R\\) or \\(\\begin{pmatrix}1&-1\\\\1&1\\end{pmatrix}\\) with \\(\\sigma_1=\\sigma_2=\\sqrt2\\). \\(\\sigma_2=0\\) means \\(\\det A=0\\), for example \\(C\\): the image is a segment, not an ellipse. For \\(N\\) the symmetric part \\(\\begin{pmatrix}2&\\tfrac12\\\\\\tfrac12&1\\end{pmatrix}\\) is positive definite and the conic is an ellipse. For \\(F\\) the symmetric part is \\(F\\) itself, indefinite: the conic is a hyperbola, which the graph describes but does not draw.',
            )],
            actions: [mode('ellipse'), example('basis-default'), conic(false)],
        }),
    ],
};

// L6 and L7 (Batch D) run on the iterate and tracedet modes of the same graph. Both modes draw their lines, readouts and statuses at once, so
// every step that predicts one of them opens in the basis mode (or, where the opening shows only what an earlier step already answered, in
// the mode itself) and tells the learner to choose the view mode. The start vector and the step persist when the view mode is changed.

export const linearMapPowerMethodLesson: LessonDefinition = {
    id: 'linear-map-power-method',
    demonstrationId: 'linear-map',
    title: words('Potenčna metoda: iteriranje matrike', 'The power method: iterating a matrix'),
    summary: words(
        'Iterat je \\(k\\)-ti člen zaporedja \\(A^kv_0\\): matrika \\(A\\), uporabljena \\(k\\)-krat na začetnem vektorju \\(v_0\\). Potenčna metoda opazuje smer in dolžino iteratov. Lekcija pokaže, kaj se z njima dogaja pri eni matriki, kako hitro in zakaj, ter v katerih primerih se smer ne ustali.',
        'An iterate is the \\(k\\)th term of the sequence \\(A^kv_0\\): the matrix \\(A\\) applied \\(k\\) times to the start vector \\(v_0\\). The power method watches the direction and the length of the iterates. The lesson shows what happens to them for one matrix, how fast and why, and in which cases the direction does not settle.',
    ),
    steps: [
        framedStep({
            id: 'power-first',
            title: words('Ponavljanje matrike', 'Applying a matrix again and again'),
            explanation: words(
                'Matriko \\(A\\) lahko uporabimo večkrat: iz vektorja \\(v_0\\) dobimo \\(Av_0\\), iz njega \\(A^2v_0\\) in tako naprej. Vektor \\(A^kv_0\\) imenujemo iterat (\\(k\\)-ti člen zaporedja \\(A^kv_0\\)); postopek, ki opazuje iterate, je potenčna metoda. Vzemimo matriko \\(E\\) s stolpcema \\((4,2)\\) in \\((1,3)\\) iz lekcije o lastnih smereh in začetni vektor \\(v_0=(1,0)\\). Slika zdaj kaže le mrežo in njeno sliko pri \\(E\\).',
                'We may apply a matrix \\(A\\) several times: from a vector \\(v_0\\) we get \\(Av_0\\), from that \\(A^2v_0\\), and so on. The vector \\(A^kv_0\\) is called an iterate (the \\(k\\)th term of the sequence \\(A^kv_0\\)); the method that watches the iterates is the power method. Take the matrix \\(E\\) with columns \\((4,2)\\) and \\((1,3)\\) from the lesson on eigen-directions and the start vector \\(v_0=(1,0)\\). The picture now shows only the grid and its image under \\(E\\).',
            ),
            worked: worked(
                words('Prvi iterat', 'The first iterate'),
                '\\[E\\begin{pmatrix}1\\\\0\\end{pmatrix}=\\begin{pmatrix}4\\cdot1+1\\cdot0\\\\2\\cdot1+3\\cdot0\\end{pmatrix}\\]',
                '\\[=\\begin{pmatrix}4\\\\2\\end{pmatrix}\\]',
                words('Prvi iterat je prvi stolpec matrike \\(E\\), saj je \\(v_0=e_1\\).', 'The first iterate is the first column of \\(E\\), because \\(v_0=e_1\\).'),
            ),
            prompt: words(
                'Napovej: proti kateri smeri se obrača smer iteratov \\(E^kv_0\\), ko računamo korak za korakom, in kaj se dogaja z njihovo dolžino? Pomagaj si z lastnimi smermi matrike \\(E\\), ki jih poznaš. Nato izberi način prikaza »Potenčna metoda« in z gumbom »Naslednji korak« preveri.',
                'Predict: towards which direction do the iterates \\(E^kv_0\\) turn as we compute step by step, and what happens to their length? Use the eigen-directions of \\(E\\) that you know. Then choose the "Power method" view mode and check with the "Next step" button.',
            ),
            expected: [words(
                'Smer iteratov se obrača proti smeri \\((1,1)\\), lastni smeri matrike \\(E\\) z lastno vrednostjo \\(5\\); dolžina iteratov raste. Prvi iterati so \\((4,2)\\), \\((18,14)\\), \\((86,78)\\), \\((422,406)\\). Lastna vrednost \\(5\\) je dominantna lastna vrednost: po absolutni vrednosti je strogo večja od druge lastne vrednosti, \\(2\\).',
                'The direction of the iterates turns towards the direction \\((1,1)\\), the eigen-direction of \\(E\\) with eigenvalue \\(5\\); the length of the iterates grows. The first iterates are \\((4,2)\\), \\((18,14)\\), \\((86,78)\\), \\((422,406)\\). The eigenvalue \\(5\\) is the dominant eigenvalue: its absolute value is strictly larger than that of the other eigenvalue, \\(2\\).',
            )],
            actions: [mode('basis'), example('eigen-default'), start([1, 0])],
        }),
        framedStep({
            id: 'power-settle',
            title: words('Kdaj se smer ustali?', 'When does the direction settle?'),
            explanation: words(
                'Graf zdaj kaže način »Potenčna metoda«. Pike so iterati \\(v_0,Av_0,\\dots,A^kv_0\\); polna črta s puščico je normirani iterat (enotske dolžine, le za prikaz), premica pa dominantna lastna smer. Odčitek »Kot do dominantne smeri« je kot med premico iterata in to smerjo v stopinjah. Ko je kot manjši od \\(1^\\circ\\), graf javi, da se je smer ustalila; to je dogovorjena toleranca, ne točna trditev. Gumb »Naslednji korak« poveča \\(k\\) za \\(1\\), gumb »Ponastavi« med koraki iteracije pa ga vrne na \\(0\\).',
                'The graph now shows the "Power method" mode. The dots are the iterates \\(v_0,Av_0,\\dots,A^kv_0\\); the solid line with an arrowhead is the normalised iterate (of unit length, for display only), and the straight line is the dominant eigen-direction. The readout "Angle to the dominant direction" is the angle between the line of the iterate and this direction, in degrees. When the angle is below \\(1^\\circ\\), the graph reports that the direction has settled; this is an agreed tolerance, not an exact claim. The "Next step" button raises \\(k\\) by \\(1\\), and the "Reset" button among the iteration steps returns it to \\(0\\).',
            ),
            worked: worked(
                words('Drugi iterat', 'The second iterate'),
                '\\[E\\begin{pmatrix}4\\\\2\\end{pmatrix}=\\begin{pmatrix}4\\cdot4+1\\cdot2\\\\2\\cdot4+3\\cdot2\\end{pmatrix}\\]',
                '\\[=\\begin{pmatrix}18\\\\14\\end{pmatrix}\\]',
                words(
                    'Smer iterata \\((18,14)\\) ima kot \\(\\arctan\\tfrac{14}{18}\\), približno \\(37{,}87^\\circ\\), od osi \\(x\\); kot do \\(45^\\circ\\) je torej približno \\(7{,}13^\\circ\\).',
                    'The direction of the iterate \\((18,14)\\) makes the angle \\(\\arctan\\tfrac{14}{18}\\), about \\(37.87^\\circ\\), with the \\(x\\)-axis; the angle to \\(45^\\circ\\) is therefore about \\(7.13^\\circ\\).',
                ),
            ),
            prompt: words(
                'Napovej: pri katerem koraku \\(k\\) je kot do dominantne smeri prvič manjši od \\(1^\\circ\\)? Zapiši napoved, nato pritiskaj »Naslednji korak« in odčitavaj kot.',
                'Predict: at which step \\(k\\) is the angle to the dominant direction first below \\(1^\\circ\\)? Write the prediction down, then press "Next step" and read the angle.',
            ),
            expected: [words(
                'Pri \\(k=5\\). Koti do dominantne smeri so za \\(k=0,1,\\dots,5\\) približno \\(45^\\circ\\), \\(18{,}43^\\circ\\), \\(7{,}13^\\circ\\), \\(2{,}79^\\circ\\), \\(1{,}11^\\circ\\), \\(0{,}44^\\circ\\); pri \\(k=4\\) je kot še nad \\(1^\\circ\\), pri \\(k=5\\) graf javi, da se je smer ustalila. To je dogovorjena toleranca: za drugačno mejo bi bil odgovor drugačen.',
                'At \\(k=5\\). The angles to the dominant direction for \\(k=0,1,\\dots,5\\) are about \\(45^\\circ\\), \\(18.43^\\circ\\), \\(7.13^\\circ\\), \\(2.79^\\circ\\), \\(1.11^\\circ\\), \\(0.44^\\circ\\); at \\(k=4\\) the angle is still above \\(1^\\circ\\), at \\(k=5\\) the graph reports that the direction has settled. This is an agreed tolerance: a different limit would give a different answer.',
            )],
            actions: [mode('iterate'), example('eigen-default'), start([1, 0])],
        }),
        framedStep({
            id: 'power-stretch',
            title: words('Raztegnitev in napaka', 'Stretch and error'),
            explanation: words(
                'Ugotovitve iz grafa lahko izpeljemo. Raztegnitev pri koraku \\(k\\) je razmerje \\(|A^kv_0|/|A^{k-1}v_0|\\), napaka pa kot med smerjo iterata in dominantno smerjo. Zapišemo \\(v_0\\) po lastnih vektorjih matrike \\(E\\): \\(v=(1,1)\\) z \\(Ev=5v\\) in \\(w=(1,-2)\\) z \\(Ew=2w\\). Ker je \\(E\\) linearna, iz \\(v_0=av+bw\\) sledi \\(Ev_0=5av+2bw\\), in tako naprej pri vsakem koraku. Slika spet kaže le mrežo.',
                'The observations from the graph can be derived. The stretch at step \\(k\\) is the ratio \\(|A^kv_0|/|A^{k-1}v_0|\\), and the error is the angle between the direction of the iterate and the dominant direction. Write \\(v_0\\) along the eigenvectors of \\(E\\): \\(v=(1,1)\\) with \\(Ev=5v\\) and \\(w=(1,-2)\\) with \\(Ew=2w\\). Because \\(E\\) is linear, \\(v_0=av+bw\\) gives \\(Ev_0=5av+2bw\\), and so on at every step. The picture shows only the grid again.',
            ),
            worked: worked(
                words('Razcep začetnega vektorja', 'Decomposing the start vector'),
                '\\[\\begin{pmatrix}1\\\\0\\end{pmatrix}=a\\begin{pmatrix}1\\\\1\\end{pmatrix}+b\\begin{pmatrix}1\\\\-2\\end{pmatrix}\\quad\\Rightarrow\\quad a+b=1,\\ a-2b=0\\]',
                '\\[a=\\tfrac23,\\qquad b=\\tfrac13\\]',
                words('Preveri: \\(\\tfrac23(1,1)+\\tfrac13(1,-2)=(1,0)\\).', 'Check: \\(\\tfrac23(1,1)+\\tfrac13(1,-2)=(1,0)\\).'),
            ),
            prompt: words(
                'Odčitka »Raztegnitev« in »Razmerje napake« si že videl. Iz razcepa izpelji obliko \\(E^kv_0\\) in pojasni, zakaj gre raztegnitev proti dominantni lastni vrednosti in zakaj se kot do dominantne smeri pri vsakem koraku približno pomnoži prav z razmerjem napake. Nato izberi način »Potenčna metoda«, pritiskaj »Naslednji korak« (do \\(k=9\\)) in primerjaj z odčitkoma »Raztegnitev« in »Razmerje napake«.',
                'You have already seen the readouts "Stretch" and "Error ratio". From the decomposition derive the form of \\(E^kv_0\\) and explain why the stretch tends to the dominant eigenvalue and why the angle to the dominant direction is multiplied at each step by about the error ratio. Then choose the "Power method" mode, press "Next step" (up to \\(k=9\\)) and compare with the readouts "Stretch" and "Error ratio".',
            ),
            expected: [words(
                'Iz \\(v_0=\\tfrac23v+\\tfrac13w\\) sledi \\(E^kv_0=\\tfrac23\\,5^kv+\\tfrac13\\,2^kw\\). Prvi člen raste s \\(5^k\\), drugi z \\(2^k\\), zato se smer približuje smeri \\(v\\), raztegnitev gre proti \\(5\\), napaka pa se pri vsakem koraku približno pomnoži z \\(\\tfrac25=0{,}4\\), razmerjem absolutnih vrednosti lastnih vrednosti \\(|\\lambda_2/\\lambda_1|\\). Graf kaže raztegnitev približno \\(5{,}099\\) pri \\(k=2\\), \\(5{,}0185\\) pri \\(k=5\\) in \\(5{,}0005\\) pri \\(k=9\\); odčitek razmerja napake je \\(0{,}4\\). Kota \\(2{,}79^\\circ\\) in \\(1{,}11^\\circ\\) (pri \\(k=3\\) in \\(4\\)) se razlikujeta za faktor približno \\(0{,}4\\). To je argument iz razcepa po lastnih vektorjih; graf je njegova ilustracija.',
                'From \\(v_0=\\tfrac23v+\\tfrac13w\\) it follows that \\(E^kv_0=\\tfrac23\\,5^kv+\\tfrac13\\,2^kw\\). The first term grows like \\(5^k\\), the second like \\(2^k\\), so the direction approaches that of \\(v\\), the stretch tends to \\(5\\), and the error is multiplied at each step by about \\(\\tfrac25=0.4\\), the ratio of the absolute values of the eigenvalues \\(|\\lambda_2/\\lambda_1|\\). The graph shows a stretch of about \\(5.099\\) at \\(k=2\\), \\(5.0185\\) at \\(k=5\\) and \\(5.0005\\) at \\(k=9\\); the error ratio readout is \\(0.4\\). The angles \\(2.79^\\circ\\) and \\(1.11^\\circ\\) (at \\(k=3\\) and \\(4\\)) differ by a factor of about \\(0.4\\). This is an argument from the decomposition along eigenvectors; the graph is an illustration of it.',
            )],
            actions: [mode('basis'), example('eigen-default'), start([1, 0])],
        }),
        framedStep({
            id: 'power-other-eigenvector',
            title: words('Začetek na drugi lastni smeri', 'A start on the other eigen-direction'),
            explanation: words(
                'Začetni vektor \\(v_0=(1,0)\\) je imel obe komponenti, po \\(v\\) in po \\(w\\). Zdaj vzemimo \\(v_0=(1,-2)\\), torej vektor \\(w\\) iz prejšnjega koraka. Začetni vektor je že nastavljen, slika pa kaže le mrežo.',
                'The start vector \\(v_0=(1,0)\\) had both components, along \\(v\\) and along \\(w\\). Now take \\(v_0=(1,-2)\\), that is the vector \\(w\\) from the previous step. The start vector is already set, and the picture shows only the grid.',
            ),
            prompt: words(
                'Napovej: kam vodijo iterati začetka \\((1,-2)\\), kolikšna je raztegnitev in kakšen je kot do dominantne smeri? Nato izberi način »Potenčna metoda«, pritisni »Naslednji korak« nekajkrat in preberi odčitke in stanje.',
                'Predict: where do the iterates of the start \\((1,-2)\\) lead, what is the stretch and what is the angle to the dominant direction? Then choose the "Power method" mode, press "Next step" a few times and read the readouts and the status.',
            ),
            expected: [words(
                'Iterati so \\((2,-4)\\), \\((4,-8)\\), \\((8,-16)\\), \\(\\dots\\): ostanejo na premici lastne vrednosti \\(2\\), raztegnitev je \\(2\\), kot do dominantne smeri pa ostane približno \\(71{,}57^\\circ\\). Graf to javi kot točno stanje (začetek je na drugi lastni smeri). Izrek (smer iteratov se približuje dominantni lastni smeri natanko tedaj, ko dominantna lastna vrednost obstaja in ima začetni vektor komponento vzdolž nje; vir: tečaj Algebra 1 na FMF, naveden, tu ni dokazan) pojasni primer: tu je komponenta enaka \\(0\\). Račun z začetkom \\((1+10^{-6},-2+10^{-6})\\), ki ni na mreži in ga graf ne zna nastaviti, je zunaj grafa v števili s plavajočo vejico pokazal, da pride smer v \\(1^\\circ\\) dominantne smeri šele pri \\(k=20\\): skoraj napačen začetek stane veliko korakov.',
                'The iterates are \\((2,-4)\\), \\((4,-8)\\), \\((8,-16)\\), \\(\\dots\\): they stay on the line of the eigenvalue \\(2\\), the stretch is \\(2\\), and the angle to the dominant direction stays about \\(71.57^\\circ\\). The graph reports this as an exact status (the start is on the other eigen-direction). The theorem (the direction of the iterates approaches the dominant eigen-direction exactly when a dominant eigenvalue exists and the start vector has a component along it; source: the FMF course Algebra 1, cited, not proved here) explains the case: here the component is \\(0\\). A computation outside the graph in floating point, with the start \\((1+10^{-6},-2+10^{-6})\\), which is off the grid and cannot be set in the graph, showed that the direction comes within \\(1^\\circ\\) of the dominant direction only at \\(k=20\\): an almost wrong start costs many steps.',
            )],
            actions: [mode('basis'), example('eigen-default'), start([1, -2])],
        }),
        framedStep({
            id: 'power-no-settling',
            title: words('Vrtenje brez ustalitve', 'Turning without settling'),
            explanation: words(
                'Potenčna metoda potrebuje dominantno realno lastno vrednost. Preizkusimo dve matriki brez nje. Prva je četrtinski zasuk \\(R\\) s stolpcema \\((0,1)\\) in \\((-1,0)\\). Druga je matrika \\(Z=\\begin{pmatrix}1&-1\\\\1&1\\end{pmatrix}\\) s stolpcema \\(a_1=(1,1)\\) in \\(a_2=(-1,1)\\): njena sled je \\(\\tau=2\\), determinanta \\(\\delta=2\\) in diskriminanta \\(\\Delta=\\tau^2-4\\delta=-4\\). Začetni vektor je spet \\((1,0)\\), slika pa kaže matriko \\(R\\) le v načinu »Slika baze«.',
                'The power method needs a dominant real eigenvalue. Try two matrices without one. The first is the quarter-turn \\(R\\) with columns \\((0,1)\\) and \\((-1,0)\\). The second is the matrix \\(Z=\\begin{pmatrix}1&-1\\\\1&1\\end{pmatrix}\\) with columns \\(a_1=(1,1)\\) and \\(a_2=(-1,1)\\): its trace is \\(\\tau=2\\), its determinant \\(\\delta=2\\) and its discriminant \\(\\Delta=\\tau^2-4\\delta=-4\\). The start vector is again \\((1,0)\\), and the picture shows the matrix \\(R\\) only in the "Image of the basis" mode.',
            ),
            prompt: words(
                'Napovej za \\(R\\) in za \\(Z\\): kam se obračajo iterati začetka \\((1,0)\\) in ali se smer ustali? Kakšna je dolžina iteratov? Izberi način »Potenčna metoda« in pritiskaj »Naslednji korak« pri \\(R\\); za \\(Z\\) nato v številskih poljih za stolpca \\(a_1\\) in \\(a_2\\) vpiši \\((1,1)\\) in \\((-1,1)\\), korak vrni z gumbom »Ponastavi« med koraki iteracije in pritiskaj spet.',
                'Predict for \\(R\\) and for \\(Z\\): where do the iterates of the start \\((1,0)\\) turn, and does the direction settle? What is the length of the iterates? Choose the "Power method" mode and press "Next step" for \\(R\\); for \\(Z\\) then type \\((1,1)\\) and \\((-1,1)\\) into the numeric fields for the columns \\(a_1\\) and \\(a_2\\), return the step with the "Reset" button among the iteration steps and press again.',
            ),
            expected: [words(
                'Pri \\(R\\) iterati \\((1,0)\\), \\((0,1)\\), \\((-1,0)\\), \\((0,-1)\\) in spet \\((1,0)\\): smer se vrti s periodo \\(4\\), dolžina ostane \\(1\\). Pri \\(Z\\) so iterati \\((1,1)\\), \\((0,2)\\), \\((-2,2)\\), \\((-4,0)\\): smer se pri vsakem koraku zavrti za \\(45^\\circ\\), dolžina pa se pomnoži z \\(\\sqrt2\\) (lastni vrednosti sta \\(1\\pm\\mathrm i\\) z absolutno vrednostjo \\(\\sqrt2\\)). Pri obeh graf javi, da lastni vrednosti nista realni in se smer ne ustali (točno, saj je \\(\\Delta<0\\)). To sta ilustraciji izreka iz prejšnjega koraka.',
                'For \\(R\\) the iterates are \\((1,0)\\), \\((0,1)\\), \\((-1,0)\\), \\((0,-1)\\) and again \\((1,0)\\): the direction turns with period \\(4\\), the length stays \\(1\\). For \\(Z\\) the iterates are \\((1,1)\\), \\((0,2)\\), \\((-2,2)\\), \\((-4,0)\\): the direction turns by \\(45^\\circ\\) at each step and the length is multiplied by \\(\\sqrt2\\) (the eigenvalues are \\(1\\pm\\mathrm i\\), of absolute value \\(\\sqrt2\\)). For both the graph reports that the eigenvalues are not real and the direction does not settle (exact, because \\(\\Delta<0\\)). These are illustrations of the theorem from the previous step.',
            )],
            actions: [mode('basis'), example('quarter-turn'), start([1, 0])],
        }),
        framedStep({
            id: 'power-flip',
            title: words('Dve lastni vrednosti enake velikosti', 'Two eigenvalues of equal size'),
            explanation: words(
                'Realni lastni vrednosti ne zadoščata, če nobena ni strogo večja po absolutni vrednosti. Vzemimo matriko \\(Q\\) s stolpcema \\((0,3)\\) in \\((3,0)\\): \\(\\tau=0\\), \\(\\delta=-9\\), karakteristični polinom \\(\\lambda^2-9\\), lastni vrednosti \\(3\\) in \\(-3\\). Začetni vektor \\((1,0)\\) je že nastavljen, slika pa kaže le mrežo.',
                'Real eigenvalues are not enough if neither is strictly larger in absolute value. Take the matrix \\(Q\\) with columns \\((0,3)\\) and \\((3,0)\\): \\(\\tau=0\\), \\(\\delta=-9\\), characteristic polynomial \\(\\lambda^2-9\\), eigenvalues \\(3\\) and \\(-3\\). The start vector \\((1,0)\\) is already set, and the picture shows only the grid.',
            ),
            prompt: words(
                'Napovej: kam vodijo iterati začetka \\((1,0)\\) in kaj se zgodi s smerjo? Nato izberi način »Potenčna metoda«, pritiskaj »Naslednji korak« in preberi stanje. Še napovej, kaj se zgodi pri začetku \\((1,1)\\), in ga preveri v poljih »Začetni vektor«, x in y.',
                'Predict: where do the iterates of the start \\((1,0)\\) lead and what happens to the direction? Then choose the "Power method" mode, press "Next step" and read the status. Also predict what happens for the start \\((1,1)\\) and check it in the "Start vector" fields, x and y.',
            ),
            expected: [words(
                'Iterati začetka \\((1,0)\\) so \\((0,3)\\), \\((9,0)\\), \\((0,27)\\), \\(\\dots\\): smer se vedno znova zamenja med osema in se ne ustali, dolžina pa se pomnoži s \\(3\\). Začetek \\((1,1)\\) je lastni vektor z lastno vrednostjo \\(3\\): iterati \\((3,3)\\), \\((9,9)\\) ostanejo na njem. Graf javi enaki absolutni vrednosti lastnih vrednosti (točno): dominantne lastne vrednosti ni. Ker je \\(Q^2=9I\\), se smer ponavlja s periodo \\(2\\) in se ustali le, če začetni vektor leži na lastni smeri. Tudi to je ilustracija izreka.',
                'The iterates of the start \\((1,0)\\) are \\((0,3)\\), \\((9,0)\\), \\((0,27)\\), \\(\\dots\\): the direction swaps between the axes again and again and does not settle, while the length is multiplied by \\(3\\). The start \\((1,1)\\) is an eigenvector with eigenvalue \\(3\\): the iterates \\((3,3)\\), \\((9,9)\\) stay on it. The graph reports equal absolute values of the eigenvalues (exact): there is no dominant eigenvalue. Because \\(Q^2=9I\\), the direction repeats with period \\(2\\) and settles only if the start vector lies on an eigen-direction. This too is an illustration of the theorem.',
            )],
            actions: [mode('basis'), matrix([[0, 3], [3, 0]]), start([1, 0])],
        }),
        framedStep({
            id: 'power-explore',
            title: words('Prosto raziskovanje', 'Free exploration'),
            explanation: words(
                'Matriko spreminjaj z ročicama ali s številskimi vnosi, začetni vektor z ročico ali v poljih »Začetni vektor«; vsi vnosi so večkratniki \\(\\tfrac14\\) med \\(-4\\) in \\(4\\). Graf stanje (dominantna lastna vrednost, enaka absolutna vrednost, kompleksni lastni vrednosti, večkratnik identitete, ena lastna smer) določi točno, kote, raztegnitve in razmerja pa izračuna; ustalitev smeri je dogovorjena toleranca.',
                'Change the matrix with the handles or the numeric entries and the start vector with the handle or in the "Start vector" fields; all entries are multiples of \\(\\tfrac14\\) between \\(-4\\) and \\(4\\). The graph decides the case (dominant eigenvalue, equal absolute values, complex eigenvalues, a multiple of the identity, one eigen-direction) exactly, and computes the angles, stretches and ratios; the settling of the direction is an agreed tolerance.',
            ),
            prompt: words(
                'Poišči matriko z dominantno lastno vrednostjo, pri kateri se smer ustali hitreje kot pri \\(E\\) (manjše razmerje \\(|\\lambda_2/\\lambda_1|\\)), in matriko z negativno dominantno lastno vrednostjo. Pri obeh najprej napovej razmerje, nato ga preberi, in pri drugi opazuj predznak iteratov.',
                'Find a matrix with a dominant eigenvalue for which the direction settles faster than for \\(E\\) (a smaller ratio \\(|\\lambda_2/\\lambda_1|\\)), and a matrix with a negative dominant eigenvalue. For each, first predict the ratio, then read it, and for the second watch the sign of the iterates.',
            ),
            expected: [words(
                'Hitrejša ustalitev: npr. \\(\\begin{pmatrix}4&0\\\\0&1\\end{pmatrix}\\) z začetkom \\((1,1)\\) (razmerje \\(\\tfrac14\\); smer je pri \\(k=3\\) v \\(1^\\circ\\)). Negativna dominantna vrednost: npr. \\(-E\\) s stolpcema \\((-4,-2)\\) in \\((-1,-3)\\) (lastni vrednosti \\(-5\\) in \\(-2\\), razmerje \\(0{,}4\\)): iterati so \\((-4,-2)\\), \\((18,14)\\), \\((-86,-78)\\): vektor menja predznak, premica iterata pa se ustali kot pri \\(E\\), zato odčitek govori o smeri kot premici.',
                'Faster settling: for example \\(\\begin{pmatrix}4&0\\\\0&1\\end{pmatrix}\\) with the start \\((1,1)\\) (ratio \\(\\tfrac14\\); the direction is within \\(1^\\circ\\) at \\(k=3\\)). A negative dominant eigenvalue: for example \\(-E\\) with columns \\((-4,-2)\\) and \\((-1,-3)\\) (eigenvalues \\(-5\\) and \\(-2\\), ratio \\(0.4\\)): the iterates are \\((-4,-2)\\), \\((18,14)\\), \\((-86,-78)\\): the vector changes sign, while the line of the iterate settles as for \\(E\\), so the readout speaks of the direction as a line.',
            )],
            actions: [mode('iterate'), example('identity'), start([1, 0])],
        }),
    ],
};

export const linearMapStabilityLesson: LessonDefinition = {
    id: 'linear-map-trace-determinant',
    demonstrationId: 'linear-map',
    title: words('Sled, determinanta in stabilnost iteracije', 'Trace, determinant and the stability of iteration'),
    summary: words(
        'Sled \\(\\tau\\) in determinanta \\(\\delta\\) matrike \\(2\\times2\\) sta števili, ki povesta veliko o lastnih vrednostih. Lekcija ju nariše kot točko \\((\\tau,\\delta)\\) v ravnini in primerja obnašanje iteracije \\(v\\mapsto Av\\) z obnašanjem toka \\(\\dot x=Ax\\).',
        'The trace \\(\\tau\\) and the determinant \\(\\delta\\) of a \\(2\\times2\\) matrix are two numbers that tell a lot about its eigenvalues. The lesson draws them as a point \\((\\tau,\\delta)\\) in the plane and compares the behaviour of the iteration \\(v\\mapsto Av\\) with that of the flow \\(\\dot x=Ax\\).',
    ),
    steps: [
        framedStep({
            id: 'td-plane',
            title: words('Ravnina sled–determinanta', 'The trace–determinant plane'),
            explanation: words(
                'Matriki \\(A\\) priredimo točko \\((\\tau,\\delta)\\), kjer je \\(\\tau=\\operatorname{tr}A\\) njena sled in \\(\\delta=\\det A\\) njena determinanta. Diskriminanta \\(\\Delta=\\tau^2-4\\delta\\) iz lekcije o lastnih smereh loči primere lastnih vrednosti; pri \\(\\Delta=0\\) leži točka na paraboli \\(\\delta=\\tau^2/4\\). Vzemimo matriko \\(Z=\\begin{pmatrix}1&-1\\\\1&1\\end{pmatrix}\\) iz prejšnje lekcije. Slika kaže le njeno mrežo.',
                'To a matrix \\(A\\) we assign the point \\((\\tau,\\delta)\\), where \\(\\tau=\\operatorname{tr}A\\) is its trace and \\(\\delta=\\det A\\) its determinant. The discriminant \\(\\Delta=\\tau^2-4\\delta\\) from the lesson on eigen-directions separates the cases of eigenvalues; at \\(\\Delta=0\\) the point lies on the parabola \\(\\delta=\\tau^2/4\\). Take the matrix \\(Z=\\begin{pmatrix}1&-1\\\\1&1\\end{pmatrix}\\) from the previous lesson. The picture shows only its grid.',
            ),
            prompt: words(
                'Izračunaj \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) za \\(Z\\) in napovej, na kateri strani parabole leži točka \\((\\tau,\\delta)\\) in kakšni sta lastni vrednosti. Nato izberi način prikaza »Ravnina sled–determinanta« in preveri.',
                'Compute \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) for \\(Z\\) and predict on which side of the parabola the point \\((\\tau,\\delta)\\) lies and what kind of eigenvalues there are. Then choose the "Trace–determinant plane" view mode and check.',
            ),
            expected: [words(
                '\\(\\tau=1+1=2\\), \\(\\delta=1\\cdot1-(-1)\\cdot1=2\\), \\(\\Delta=4-8=-4<0\\). Točka \\((2,2)\\) leži nad parabolo (\\(\\delta>\\tau^2/4=1\\)), lastni vrednosti sta kompleksni, \\(1\\pm\\mathrm i\\). Graf pri tej točki izpiše tudi stanje glede trikotnika stabilnosti, ki ga razložimo v tretjem koraku.',
                '\\(\\tau=1+1=2\\), \\(\\delta=1\\cdot1-(-1)\\cdot1=2\\), \\(\\Delta=4-8=-4<0\\). The point \\((2,2)\\) lies above the parabola (\\(\\delta>\\tau^2/4=1\\)), the eigenvalues are complex, \\(1\\pm\\mathrm i\\). For this point the graph also gives a status about the stability triangle, which we explain in the third step.',
            )],
            actions: [mode('basis'), matrix([[1, -1], [1, 1]])],
        }),
        framedStep({
            id: 'td-parabola',
            title: words('Čez parabolo', 'Across the parabola'),
            explanation: words(
                'Graf zdaj kaže ravnino sled–determinanta z narisano parabolo \\(\\Delta=0\\) in točko matrike \\(W=\\tfrac12Z\\) s stolpcema \\((\\tfrac12,\\tfrac12)\\) in \\((-\\tfrac12,\\tfrac12)\\). Točko lahko povlečemo. Par \\((\\tau,\\delta)\\) ne določa ene matrike, zato graf po vlečenju uporabi matriko z vrsticama \\((0,1)\\) in \\((-\\delta,\\tau)\\), kar tudi izpiše; vlečemo torej po četrtinski mreži \\(\\tau\\) in \\(\\delta\\). Namesto vlečenja lahko v polja matrike vneseš stolpca \\(a_1=(0,-\\delta)\\) in \\(a_2=(1,\\tau)\\).',
                'The graph now shows the trace–determinant plane with the parabola \\(\\Delta=0\\) drawn and the point of the matrix \\(W=\\tfrac12Z\\) with columns \\((\\tfrac12,\\tfrac12)\\) and \\((-\\tfrac12,\\tfrac12)\\). The point can be dragged. A pair \\((\\tau,\\delta)\\) does not fix one matrix, so after dragging the graph uses the matrix with rows \\((0,1)\\) and \\((-\\delta,\\tau)\\), and says so; we therefore drag on the quarter grid of \\(\\tau\\) and \\(\\delta\\). Instead of dragging you can enter the columns \\(a_1=(0,-\\delta)\\) and \\(a_2=(1,\\tau)\\) in the matrix fields.',
            ),
            prompt: words(
                'Povleci točko po premici \\(\\tau=1\\) navzdol. Napovej: pri kateri vrednosti \\(\\delta\\) se dotakne parabole in kaj se tam zgodi z lastnima vrednostma? Kaj je pod parabolo? Nato povleci in preberi odčitek \\(\\Delta\\).',
                'Drag the point down along the line \\(\\tau=1\\). Predict: at which value of \\(\\delta\\) does it touch the parabola and what happens to the eigenvalues there? What is below the parabola? Then drag and read the \\(\\Delta\\) readout.',
            ),
            expected: [words(
                'Na paraboli je \\(\\Delta=\\tau^2-4\\delta=0\\), pri \\(\\tau=1\\) torej \\(\\delta=\\tfrac14\\). Tam je lastna vrednost dvojna, \\(\\tau/2=\\tfrac12\\). Nad parabolo je \\(\\Delta<0\\) (kompleksni lastni vrednosti), pod njo \\(\\Delta>0\\) (dve različni realni). Graf pri \\((1,\\tfrac14)\\) pokaže \\(\\Delta=0\\) in pri \\((1,\\tfrac12)\\) \\(\\Delta=-1\\). Matrika, s katero graf dela po vlečenju, je \\(\\begin{pmatrix}0&1\\\\-\\delta&\\tau\\end{pmatrix}\\), njena sled in determinanta pa sta natanko \\(\\tau\\) in \\(\\delta\\).',
                'On the parabola \\(\\Delta=\\tau^2-4\\delta=0\\), so for \\(\\tau=1\\) we get \\(\\delta=\\tfrac14\\). There the eigenvalue is double, \\(\\tau/2=\\tfrac12\\). Above the parabola \\(\\Delta<0\\) (complex eigenvalues), below it \\(\\Delta>0\\) (two distinct real ones). At \\((1,\\tfrac14)\\) the graph shows \\(\\Delta=0\\) and at \\((1,\\tfrac12)\\) \\(\\Delta=-1\\). The matrix the graph works with after dragging is \\(\\begin{pmatrix}0&1\\\\-\\delta&\\tau\\end{pmatrix}\\), and its trace and determinant are exactly \\(\\tau\\) and \\(\\delta\\).',
            )],
            actions: [mode('tracedet'), matrix([[0.5, -0.5], [0.5, 0.5]])],
        }),
        framedStep({
            id: 'td-triangle',
            title: words('Trikotnik stabilnosti', 'The stability triangle'),
            explanation: words(
                'Izrek (za matrike \\(2\\times2\\); pogoji Juryja in Schur–Cohna, vir: standardni učbeniki diskretnih dinamičnih sistemov, tu navedeni, ne dokazani): vsa zaporedja \\(A^kv\\) se bližajo \\(0\\) natanko tedaj, ko imata obe lastni vrednosti absolutno vrednost manjšo od \\(1\\), to je natanko tedaj, ko je \\(\\delta<1\\) in \\(|\\tau|<1+\\delta\\). Ti neenakosti omejita trikotnik stabilnosti z oglišči \\((-2,1)\\), \\((2,1)\\) in \\((0,-1)\\). Narisan trikotnik je ilustracija izreka. Vzemimo matriko \\(M\\) s stolpcema \\((\\tfrac12,\\tfrac14)\\) in \\((\\tfrac14,\\tfrac12)\\) in začetni vektor \\((4,0)\\); slika kaže le mrežo.',
                'Theorem (for \\(2\\times2\\) matrices; the Jury and Schur–Cohn conditions, source: standard texts on discrete dynamical systems, cited here, not proved): all sequences \\(A^kv\\) tend to \\(0\\) exactly when both eigenvalues have absolute value less than \\(1\\), that is exactly when \\(\\delta<1\\) and \\(|\\tau|<1+\\delta\\). These inequalities bound the stability triangle with vertices \\((-2,1)\\), \\((2,1)\\) and \\((0,-1)\\). The drawn triangle is an illustration of the theorem. Take the matrix \\(M\\) with columns \\((\\tfrac12,\\tfrac14)\\) and \\((\\tfrac14,\\tfrac12)\\) and the start vector \\((4,0)\\); the picture shows only the grid.',
            ),
            worked: worked(
                words('Sled in determinanta matrike \\(M\\)', 'Trace and determinant of \\(M\\)'),
                '\\[\\tau=\\tfrac12+\\tfrac12,\\qquad \\delta=\\tfrac12\\cdot\\tfrac12-\\tfrac14\\cdot\\tfrac14\\]',
                '\\[\\delta<1,\\qquad |\\tau|<1+\\delta\\]',
                words('Izračunaj \\(\\tau\\) in \\(\\delta\\) ter preveri obe neenakosti.', 'Compute \\(\\tau\\) and \\(\\delta\\) and check both inequalities.'),
            ),
            prompt: words(
                'Napovej: ali točka \\((\\tau,\\delta)\\) matrike \\(M\\) leži v trikotniku? Ali se iterati začetka \\((4,0)\\) krčijo proti \\(0\\), in kolikšna je raztegnitev po več korakih? Nato izberi način »Ravnina sled–determinanta« in preberi stanje; za iterate izberi način »Potenčna metoda« in pritisni »Naslednji korak« desetkrat.',
                'Predict: does the point \\((\\tau,\\delta)\\) of \\(M\\) lie in the triangle? Do the iterates of the start \\((4,0)\\) shrink towards \\(0\\), and what is the stretch after several steps? Then choose the "Trace–determinant plane" mode and read the status; for the iterates choose the "Power method" mode and press "Next step" ten times.',
            ),
            expected: [words(
                'Velja \\(\\tau=1\\), \\(\\delta=\\tfrac3{16}\\) in \\(\\Delta=1-\\tfrac34=\\tfrac14\\). Ker je \\(\\delta=\\tfrac3{16}<1\\) in \\(|\\tau|=1<1+\\tfrac3{16}\\), je točka znotraj trikotnika. Lastni vrednosti sta \\(\\tfrac34\\) in \\(\\tfrac14\\) (\\(\\lambda=\\tfrac{1\\pm\\sqrt{1/4}}{2}\\)), obe z absolutno vrednostjo manjšo od \\(1\\), zato se iterati krčijo. Graf pri \\(k=10\\) pokaže iterat približno \\((0{,}11,0{,}11)\\) in raztegnitev približno \\(0{,}75\\), kar je dominantna lastna vrednost. To je ilustracija za končno število korakov; izrek pove, da velja za vsak začetni vektor.',
                'We get \\(\\tau=1\\), \\(\\delta=\\tfrac3{16}\\) and \\(\\Delta=1-\\tfrac34=\\tfrac14\\). Since \\(\\delta=\\tfrac3{16}<1\\) and \\(|\\tau|=1<1+\\tfrac3{16}\\), the point is inside the triangle. The eigenvalues are \\(\\tfrac34\\) and \\(\\tfrac14\\) (\\(\\lambda=\\tfrac{1\\pm\\sqrt{1/4}}{2}\\)), both of absolute value less than \\(1\\), so the iterates shrink. At \\(k=10\\) the graph shows an iterate of about \\((0.11,0.11)\\) and a stretch of about \\(0.75\\), which is the dominant eigenvalue. This is an illustration for a finite number of steps; the theorem says that it holds for every start vector.',
            )],
            actions: [mode('basis'), matrix([[0.5, 0.25], [0.25, 0.5]]), start([4, 0])],
        }),
        framedStep({
            id: 'td-edges',
            title: words('Skozi tri robove', 'Through the three edges'),
            explanation: words(
                'Trikotnik ima tri robove: \\(\\delta=1\\), \\(\\tau=1+\\delta\\) in \\(\\tau=-(1+\\delta)\\). Na robu se katera od lastnih vrednosti dotakne enotske krožnice. Karakteristični polinom matrike je \\(p(\\lambda)=\\lambda^2-\\tau\\lambda+\\delta\\), produkt lastnih vrednosti je \\(\\delta\\). Graf kaže matriko \\(M\\) v ravnini sled–determinanta; po vlečenju točke uporabi matriko \\(\\begin{pmatrix}0&1\\\\-\\delta&\\tau\\end{pmatrix}\\).',
                'The triangle has three edges: \\(\\delta=1\\), \\(\\tau=1+\\delta\\) and \\(\\tau=-(1+\\delta)\\). On an edge an eigenvalue touches the unit circle. The characteristic polynomial of a matrix is \\(p(\\lambda)=\\lambda^2-\\tau\\lambda+\\delta\\), and the product of the eigenvalues is \\(\\delta\\). The graph shows the matrix \\(M\\) in the trace–determinant plane; after dragging the point it uses the matrix \\(\\begin{pmatrix}0&1\\\\-\\delta&\\tau\\end{pmatrix}\\).',
            ),
            prompt: words(
                'Napovej za vsak rob, kakšna je lastna vrednost na njem (namig: kaj velja za \\(p(\\lambda)\\), če je \\(\\lambda\\) lastna vrednost, in kaj pomeni produkt \\(\\delta\\) pri kompleksnem paru?). Nato povleci točko na vsak rob, npr. v \\((1,0)\\), \\((-1,0)\\) in \\((0,1)\\), in preberi stanje; povleci jo tudi čez rob.',
                'For each edge predict what the eigenvalue on it is (hint: what holds for \\(p(\\lambda)\\) when \\(\\lambda\\) is an eigenvalue, and what does the product \\(\\delta\\) mean for a complex pair?). Then drag the point onto each edge, for example to \\((1,0)\\), \\((-1,0)\\) and \\((0,1)\\), and read the status; also drag it across an edge.',
            ),
            expected: [words(
                '\\(p(1)=1-\\tau+\\delta=0\\) je \\(\\tau=1+\\delta\\): ena lastna vrednost je \\(1\\) (npr. \\((1,0)\\)). \\(p(-1)=1+\\tau+\\delta=0\\) je \\(\\tau=-(1+\\delta)\\): ena lastna vrednost je \\(-1\\) (npr. \\((-1,0)\\)). Pri \\(\\delta=1\\) in \\(|\\tau|<2\\) je par kompleksen, produkt \\(1\\) pa pomeni absolutno vrednost \\(1\\) (npr. \\((0,1)\\), četrtinski zasuk). Graf pri vsaki točki izpiše, na katerem robu je. Čez rob postane točka zunanja in graf javi, da nekatera zaporedja rastejo.',
                '\\(p(1)=1-\\tau+\\delta=0\\) is \\(\\tau=1+\\delta\\): one eigenvalue is \\(1\\) (for example \\((1,0)\\)). \\(p(-1)=1+\\tau+\\delta=0\\) is \\(\\tau=-(1+\\delta)\\): one eigenvalue is \\(-1\\) (for example \\((-1,0)\\)). For \\(\\delta=1\\) and \\(|\\tau|<2\\) the pair is complex, and the product \\(1\\) means absolute value \\(1\\) (for example \\((0,1)\\), the quarter-turn). For each point the graph says which edge it is on. Across an edge the point becomes outside and the graph reports that some sequences grow.',
            )],
            actions: [mode('tracedet'), matrix([[0.5, 0.25], [0.25, 0.5]])],
        }),
        framedStep({
            id: 'td-flow',
            title: words('Iteracija in tok', 'Iteration and flow'),
            explanation: words(
                'Ista ravnina ureja tudi tok \\(\\dot x=Ax\\), ki ga obravnavajo fazni portreti, vendar je stabilno območje tam drugo: \\(\\tau<0\\) in \\(\\delta>0\\) (trditev iz načrta za fazne portrete, tu navedena, ne dokazana). Graf ga nariše kot območje, označeno z besedilom. Primerjajmo \\(M\\) iz prejšnjega koraka z matriko \\(-E\\) s stolpcema \\((-4,-2)\\) in \\((-1,-3)\\); začetni vektor \\((1,0)\\), slika kaže mrežo.',
                'The same plane governs the flow \\(\\dot x=Ax\\) treated in phase portraits, but the stable region there is different: \\(\\tau<0\\) and \\(\\delta>0\\) (a statement from the phase-portraits plan, cited here, not proved). The graph draws it as a region labelled with text. Compare \\(M\\) from the previous step with the matrix \\(-E\\) with columns \\((-4,-2)\\) and \\((-1,-3)\\); the start vector is \\((1,0)\\), and the picture shows the grid.',
            ),
            prompt: words(
                'Izračunaj \\(\\tau\\) in \\(\\delta\\) za \\(-E\\) in napovej, ali je stabilna za iteracijo (v trikotniku) in ali za tok. Kako je z \\(M\\)? Nato izberi načina »Ravnina sled–determinanta« in »Potenčna metoda« in preveri.',
                'Compute \\(\\tau\\) and \\(\\delta\\) for \\(-E\\) and predict whether it is stable for the iteration (in the triangle) and for the flow. And \\(M\\)? Then choose the "Trace–determinant plane" and "Power method" modes and check.',
            ),
            expected: [words(
                'Za \\(-E\\): \\(\\tau=-7\\), \\(\\delta=10\\), \\(\\Delta=9\\), lastni vrednosti \\(-5\\) in \\(-2\\). Zaradi \\(\\delta>1\\) je zunaj trikotnika (iterati rastejo, predznak se menja: \\((-4,-2)\\), \\((18,14)\\), \\((-86,-78)\\)), a ker je \\(\\tau<0\\) in \\(\\delta>0\\), je tok stabilen. Za \\(M\\) je obratno: znotraj trikotnika, a \\(\\tau=1>0\\), zato tok ni stabilen. Ista matrika je torej lahko stabilna za enega in nestabilna za drugega. Točka \\((-7,10)\\) je prikazana, a je z vlečenjem ni mogoče doseči, ker je zunaj območja \\(|\\tau|,|\\delta|\\le4\\) (graf to izpiše).',
                'For \\(-E\\): \\(\\tau=-7\\), \\(\\delta=10\\), \\(\\Delta=9\\), eigenvalues \\(-5\\) and \\(-2\\). Because \\(\\delta>1\\) it is outside the triangle (the iterates grow and the sign alternates: \\((-4,-2)\\), \\((18,14)\\), \\((-86,-78)\\)), but since \\(\\tau<0\\) and \\(\\delta>0\\) the flow is stable. For \\(M\\) it is the other way round: inside the triangle, but \\(\\tau=1>0\\), so the flow is not stable. The same matrix can be stable for one and unstable for the other. The point \\((-7,10)\\) is shown but cannot be reached by dragging because it is outside the range \\(|\\tau|,|\\delta|\\le4\\) (the graph says so).',
            )],
            actions: [mode('basis'), matrix([[-4, -1], [-2, -3]]), start([1, 0])],
        }),
        framedStep({
            id: 'td-vertex',
            title: words('Oglišče strižne matrike', 'The vertex of the shear'),
            explanation: words(
                'Strižna matrika \\(S\\) s stolpcema \\((1,0)\\) in \\((1,1)\\) je iz lekcije o lastnih smereh, ima eno lastno smer in ni večkratnik identitete. Začetni vektor je \\((0,1)\\); slika kaže mrežo matrike \\(S\\).',
                'The shear \\(S\\) with columns \\((1,0)\\) and \\((1,1)\\) is from the lesson on eigen-directions: it has one eigen-direction and is not a multiple of the identity. The start vector is \\((0,1)\\); the picture shows the grid of \\(S\\).',
            ),
            prompt: words(
                'Izračunaj \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) za \\(S\\) in napovej, kje leži točka glede na trikotnik in parabolo ter kaj delajo iterati začetka \\((0,1)\\): ali se bližajo \\(0\\), rastejo eksponentno ali drugače? Nato izberi način »Ravnina sled–determinanta« in nato »Potenčna metoda« ter preveri.',
                'Compute \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) for \\(S\\) and predict where the point lies relative to the triangle and the parabola, and what the iterates of the start \\((0,1)\\) do: approach \\(0\\), grow exponentially, or something else? Then choose the "Trace–determinant plane" mode and then "Power method" and check.',
            ),
            expected: [words(
                '\\(\\tau=2\\), \\(\\delta=1\\), \\(\\Delta=0\\): točka \\((2,1)\\) je oglišče trikotnika (na robu, kjer se srečata \\(\\delta=1\\) in \\(\\tau=1+\\delta\\)) in hkrati na paraboli; lastna vrednost je \\(1\\), dvojna. Iterati so \\((1,1)\\), \\((2,1)\\), \\(\\dots\\), \\((10,1)\\): dolžina raste linearno, ne eksponentno, in se ne bliža \\(0\\); kot do osi \\(x\\) pada kot \\(\\arctan\\tfrac1k\\), približno \\(5{,}71^\\circ\\) pri \\(k=10\\). Graf javi eno lastno vrednost z eno lastno smerjo in počasno približevanje, kot \\(1/k\\).',
                '\\(\\tau=2\\), \\(\\delta=1\\), \\(\\Delta=0\\): the point \\((2,1)\\) is a vertex of the triangle (on the edge where \\(\\delta=1\\) and \\(\\tau=1+\\delta\\) meet) and also on the parabola; the eigenvalue is \\(1\\), double. The iterates are \\((1,1)\\), \\((2,1)\\), \\(\\dots\\), \\((10,1)\\): the length grows linearly, not exponentially, and does not approach \\(0\\); the angle to the \\(x\\)-axis falls like \\(\\arctan\\tfrac1k\\), about \\(5.71^\\circ\\) at \\(k=10\\). The graph reports one eigenvalue with one eigen-direction and a slow approach, like \\(1/k\\).',
            )],
            actions: [mode('basis'), example('shear'), start([0, 1])],
        }),
        framedStep({
            id: 'td-explore',
            title: words('Prosto raziskovanje', 'Free exploration'),
            explanation: words(
                'Matriko spreminjaj z ročicama ali s številskimi vnosi, točko \\((\\tau,\\delta)\\) pa tudi z vlečenjem; vnosi so večkratniki \\(\\tfrac14\\) med \\(-4\\) in \\(4\\). Graf točno odloči, ali je točka znotraj, na robu ali zunaj trikotnika in ali je tok stabilen, \\(\\tau\\), \\(\\delta\\) in \\(\\Delta\\) pa so računi na četrtinski mreži.',
                'Change the matrix with the handles or the numeric entries, and the point \\((\\tau,\\delta)\\) also by dragging; the entries are multiples of \\(\\tfrac14\\) between \\(-4\\) and \\(4\\). The graph decides exactly whether the point is inside, on an edge of, or outside the triangle and whether the flow is stable, and \\(\\tau\\), \\(\\delta\\) and \\(\\Delta\\) are computed on the quarter grid.',
            ),
            prompt: words(
                'Poišči matriko znotraj trikotnika s kompleksnimi lastnimi vrednostmi in matriko, ki je znotraj trikotnika in ima hkrati stabilen tok. Pri obeh najprej napovej, kam pade točka, nato preveri.',
                'Find a matrix inside the triangle with complex eigenvalues, and a matrix that is inside the triangle and also has a stable flow. For each, first predict where the point falls, then check.',
            ),
            expected: [words(
                'Kompleksni lastni vrednosti znotraj trikotnika: npr. \\(W=\\tfrac12Z\\) z \\(\\tau=1\\), \\(\\delta=\\tfrac12\\), \\(\\Delta=-1\\): absolutna vrednost lastnih vrednosti je \\(\\sqrt\\delta\\approx0{,}7071\\), spirala se krči. Znotraj trikotnika in stabilen tok: potrebna sta \\(\\tau<0\\), \\(\\delta>0\\) in \\(\\delta<1\\), \\(|\\tau|<1+\\delta\\), npr. \\(-\\tfrac12I\\): \\(\\tau=-1\\), \\(\\delta=\\tfrac14\\).',
                'Complex eigenvalues inside the triangle: for example \\(W=\\tfrac12Z\\) with \\(\\tau=1\\), \\(\\delta=\\tfrac12\\), \\(\\Delta=-1\\): the absolute value of the eigenvalues is \\(\\sqrt\\delta\\approx0.7071\\), the spiral shrinks. Inside the triangle and a stable flow: we need \\(\\tau<0\\), \\(\\delta>0\\) and \\(\\delta<1\\), \\(|\\tau|<1+\\delta\\), for example \\(-\\tfrac12I\\): \\(\\tau=-1\\), \\(\\delta=\\tfrac14\\).',
            )],
            actions: [mode('tracedet'), example('identity')],
        }),
    ],
};
