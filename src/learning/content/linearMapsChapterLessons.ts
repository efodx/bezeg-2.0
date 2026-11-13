import type {LessonAction, LessonDefinition, LessonFrame, LessonStep, LessonWorkedExample, LocalizedText} from '../model';

// Linear maps chapter-owned guided activities (spec L1 to L4). Every number is recomputed in linearMapsChapter.test.ts from the kernel.
// Scene actions run synchronously in one tick; each scene starts from the Demonstration default and then names its state.

const words = (sl: string, en: string): LocalizedText => ({sl, en});

const defaultScene = (sceneId: string): LessonAction => ({kind: 'prepared-scene', sceneId, source: 'demonstration-default'});
const mode = (value: 'basis' | 'determinant' | 'eigen' | 'ellipse'): LessonAction => ({kind: 'linear-map', operation: 'set-mode', mode: value});
/** The test vector v of the eigen mode: the angle in degrees on the 0,01 degree grid. */
const testVector = (angle: number): LessonAction => ({kind: 'linear-map', operation: 'set-test-vector', angle});
/** The ellipse mode's conic x^T S x = 1 of the symmetric part, drawn or not. */
const conic = (visible: boolean): LessonAction => ({kind: 'linear-map', operation: 'set-conic', visible});
const example = (exampleId: Extract<LessonAction, {kind: 'linear-map', operation: 'set-example'}>['exampleId']): LessonAction =>
    ({kind: 'linear-map', operation: 'set-example', exampleId});
const matrix = (m: Extract<LessonAction, {kind: 'linear-map', operation: 'set-matrix'}>['matrix']): LessonAction =>
    ({kind: 'linear-map', operation: 'set-matrix', matrix: m});

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
                'Zdaj je prikazan enotski vektor \\(v\\), katerega konico vlečemo po krožnici, in njegova slika \\(Av\\). Za \\(v\\ne0\\) je \\(v\\) lastni vektor natanko tedaj, ko je \\(\\det(v,Av)=0\\), to je ko je \\(Av\\) večkratnik vektorja \\(v\\). Ker se \\(v\\) spreminja zvezno, graf za »približno vzporedna« uporabi povedano toleranco \\(|\\sin\\angle(v,Av)|<0{,}01\\); to ni točna vzporednost. Odčitek predznačenega sinusa kota od \\(v\\) do \\(Av\\) ima predznak, odčitek kota med \\(v\\) in \\(Av\\) pa je v stopinjah brez predznaka.',
                'The unit vector \\(v\\), whose tip we drag along the circle, and its image \\(Av\\) are now shown. For \\(v\\ne0\\), \\(v\\) is an eigenvector exactly when \\(\\det(v,Av)=0\\), that is when \\(Av\\) is a multiple of \\(v\\). Because \\(v\\) varies continuously, the graph uses a stated tolerance for "approximately parallel", \\(|\\sin\\angle(v,Av)|<0.01\\); this is not exact parallelism. The readout of the signed sine of the angle from \\(v\\) to \\(Av\\) has a sign, and the readout of the angle between \\(v\\) and \\(Av\\) is in degrees without a sign.',
            ),
            prompt: words(
                'Napovej, preden premakneš \\(v\\): ko se \\(v\\) zavrti od \\(0^\\circ\\) do \\(180^\\circ\\), kolikokrat se spremeni predznak predznačenega sinusa in kaj to pove o \\(v\\) in \\(Av\\)? Nato premikaj \\(v\\) z drsnikom za kot testnega vektorja in preveri.',
                'Predict before you move \\(v\\): as \\(v\\) turns from \\(0^\\circ\\) to \\(180^\\circ\\), how many times does the sign of the signed sine change, and what does it say about \\(v\\) and \\(Av\\)? Then move \\(v\\) with the test vector angle slider and check.',
            ),
            expected: [words(
                'Predznak se spremeni dvakrat, vsakič ko sta \\(v\\) in \\(Av\\) vzporedna, torej pri vsaki od obeh lastnih smeri; med njima je predznak nasproten, pred prvo in po drugi pa enak. Pri \\(0^\\circ\\) je sinus pozitiven (približno \\(0{,}447\\)), saj je \\(v=(1,0)\\) in \\(Av=(4,2)\\).',
                'The sign changes twice, each time \\(v\\) and \\(Av\\) are parallel, that is at each of the two eigen-directions; between them the sign is opposite, before the first and after the second it is the same. At \\(0^\\circ\\) the sine is positive (about \\(0.447\\)), because \\(v=(1,0)\\) and \\(Av=(4,2)\\).',
            )],
            actions: [mode('eigen'), example('eigen-default'), testVector(0)],
        }),
        framedStep({
            id: 'eigen-second',
            title: words('Druga lastna smer', 'The second eigen-direction'),
            explanation: words(
                'Pri \\(v=(1,1)\\) velja \\(Ev=(5,5)=5v\\), torej je \\(v\\) lastni vektor z lastno vrednostjo \\(5\\), in to točno: \\(\\det(v,Ev)=1\\cdot5-1\\cdot5=0\\). Druga lastna smer ima smerni vektor \\((1,k)\\) za neko število \\(k\\). Enotski vektor v tej smeri ni na četrtinski mreži, zato je vzporednost tam le približna: okno \\(|\\sin|<0{,}01\\) je okoli te smeri široko le približno \\(\\pm0{,}38^\\circ\\) (okoli prve približno \\(\\pm0{,}95^\\circ\\)). Zato \\(v\\) ne ciljaj z vlečenjem, temveč uporabi gumb »Pritegni v k lastni smeri«.',
                'At \\(v=(1,1)\\) we have \\(Ev=(5,5)=5v\\), so \\(v\\) is an eigenvector with eigenvalue \\(5\\), and exactly: \\(\\det(v,Ev)=1\\cdot5-1\\cdot5=0\\). The second eigen-direction has a direction vector \\((1,k)\\) for some number \\(k\\). The unit vector in this direction is not on the quarter grid, so parallelism there is only approximate: the window \\(|\\sin|<0.01\\) around it is only about \\(\\pm0.38^\\circ\\) wide (around the first about \\(\\pm0.95^\\circ\\)). So do not aim \\(v\\) by dragging; use the button "Snap v to the eigen-direction".',
            ),
            worked: worked(
                words('Lastni vektor \\((1,1)\\)', 'The eigenvector \\((1,1)\\)'),
                '\\[E\\begin{pmatrix}1\\\\1\\end{pmatrix}=\\begin{pmatrix}4\\cdot1+1\\cdot1\\\\2\\cdot1+3\\cdot1\\end{pmatrix}\\]',
                '\\[=\\begin{pmatrix}5\\\\5\\end{pmatrix}=5\\begin{pmatrix}1\\\\1\\end{pmatrix}\\]',
                words('Vektor \\((1,1)\\) in njegova slika sta vzporedna: \\(\\det\\bigl((1,1),(5,5)\\bigr)=0\\).', 'The vector \\((1,1)\\) and its image are parallel: \\(\\det\\bigl((1,1),(5,5)\\bigr)=0\\).'),
            ),
            prompt: words(
                'Napovej drugo lastno smer: poišči \\(k\\) in \\(\\lambda\\), da je \\(E(1,k)=\\lambda(1,k)\\) (reši \\(4+k=\\lambda\\) in \\(2+3k=\\lambda k\\); rešitev \\(k=1\\) že poznaš). Nato izberi način prikaza »Lastne smeri«, pritegni \\(v\\) in primerjaj. Ugotovi še, ali sta lastni smeri pravokotni.',
                'Predict the second eigen-direction: find \\(k\\) and \\(\\lambda\\) with \\(E(1,k)=\\lambda(1,k)\\) (solve \\(4+k=\\lambda\\) and \\(2+3k=\\lambda k\\); you already know the solution \\(k=1\\)). Then choose the "Eigen-directions" view mode, snap \\(v\\) and compare. Also find out whether the two eigen-directions are perpendicular.',
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
