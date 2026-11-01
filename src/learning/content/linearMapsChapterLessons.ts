import type {LessonAction, LessonDefinition, LessonStep, LocalizedText} from '../model';

// Linear maps chapter-owned guided activities (spec L1 and L2). Every number is recomputed in linearMapsChapter.test.ts from the kernel.
// Scene actions run synchronously in one tick; each scene starts from the Demonstration default and then names its state.

const words = (sl: string, en: string): LocalizedText => ({sl, en});

const defaultScene = (sceneId: string): LessonAction => ({kind: 'prepared-scene', sceneId, source: 'demonstration-default'});
const mode = (value: 'basis' | 'determinant'): LessonAction => ({kind: 'linear-map', operation: 'set-mode', mode: value});
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
