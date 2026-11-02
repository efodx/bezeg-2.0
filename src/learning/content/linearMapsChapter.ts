import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {LINEAR_MAPS_CHAPTER_ID, linearMapsGuidedExampleRegistry, type LinearMapsSectionId} from './linearMapsChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: LinearMapsSectionId) => `${LINEAR_MAPS_CHAPTER_ID}.${sectionId}.${linearMapsGuidedExampleRegistry[sectionId].demonstrationId}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: LinearMapsSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

export const linearMapsChapter: FamilyChapter = {
    id: LINEAR_MAPS_CHAPTER_ID,
    family: 'maps',
    title: text('Linearne preslikave ravnine', 'Linear maps of the plane'),
    purpose: text('Linearna preslikava ravnine je določena z dvema stolpcema matrike: slikama baznih vektorjev. Poglavje pokaže, da iz tega sledita slika vsake točke in slika Bézierjeve krivulje, nato pa, da determinanta meri, kolikokrat se ploščina poveča, in ali se orientacija ohrani. Vsak razdelek poda izrek in primer, ki ga lahko preračunaš sam.', 'A linear map of the plane is fixed by the two columns of a matrix: the images of the basis vectors. The chapter shows that the image of every point and of a Bézier curve follows from them, and then that the determinant measures how much area is scaled and whether orientation is kept. Each section states a theorem and an example you can recompute yourself.'),
    prerequisites: text('Vektorji, linearna kombinacija in baza ravnine. Za primer z Bézierjevo krivuljo pomaga poznavanje Bernsteinovih uteži iz poglavja o Bézierjevih krivuljah.', 'Vectors, linear combinations and a basis of the plane. For the Bézier curve example it helps to know the Bernstein weights from the chapter on Bézier curves.'),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/bezier-curves', title: text('Bézierjeve krivulje', 'Bézier curves')}],
    sections: [
        withExample('matrix-and-image', {
            id: 'matrix-and-image',
            demonstrationIds: ['linear-map'],
            investigationPrompts: {'linear-map': text('Premakni ročici stolpcev in opazuj, kam se preslika točka \\((1,1)\\) in kontrolni poligon krivulje.', 'Move the column handles and watch where the point \\((1,1)\\) and the control polygon of the curve go.')},
            title: text('Matrika kot slika baze', 'A matrix as the image of a basis'),
            formula: String.raw`A\binom{x}{y}=x\,a_1+y\,a_2,\qquad a_1=Ae_1,\ a_2=Ae_2`,
            paragraphs: [
                text('Cilj razdelka: iz stolpcev matrike izračunaš sliko poljubne točke in sliko Bézierjeve krivulje. Linearna preslikava \\(A\\) ravnine ohranja vsote in množenje s številom: \\(A(\\lambda u+\\mu v)=\\lambda Au+\\mu Av\\). Ker je vsaka točka \\((x,y)=x\\,e_1+y\\,e_2\\), velja \\(A(x,y)=x\\,a_1+y\\,a_2\\), kjer sta \\(a_1=Ae_1\\) in \\(a_2=Ae_2\\) stolpca matrike (slika baze). Preslikava je torej določena z dvema točkama, izhodišče pa ostane na mestu.', 'Learning outcome: from the columns of a matrix you compute the image of any point and of a Bézier curve. A linear map \\(A\\) of the plane preserves sums and scalar multiples: \\(A(\\lambda u+\\mu v)=\\lambda Au+\\mu Av\\). Since every point is \\((x,y)=x\\,e_1+y\\,e_2\\), we get \\(A(x,y)=x\\,a_1+y\\,a_2\\), where \\(a_1=Ae_1\\) and \\(a_2=Ae_2\\) are the columns of the matrix (the image of the basis). The map is therefore fixed by two points, and the origin stays where it is.'),
                text('Zgled: \\(a_1=(2,1)\\) in \\(a_2=(-1,1)\\). Potem je \\(A(1,1)=a_1+a_2=(1,2)\\), vzporedne mrežne črte pa ostanejo vzporedne in enakomerno razmaknjene. Izrek (linearnost vrednotenja): za Bézierjevo krivuljo \\(B(t)=\\sum_i B_i^n(t)P_i\\) je \\(A\\,B(t)=\\sum_i B_i^n(t)\\,AP_i\\), saj \\(A\\) ohranja vsote in množenje s številom. Slika krivulje je Bézierjeva krivulja s kontrolnimi točkami \\(AP_i\\).', 'Example: \\(a_1=(2,1)\\) and \\(a_2=(-1,1)\\). Then \\(A(1,1)=a_1+a_2=(1,2)\\), and parallel grid lines stay parallel and equally spaced. Theorem (linearity of evaluation): for a Bézier curve \\(B(t)=\\sum_i B_i^n(t)P_i\\) we have \\(A\\,B(t)=\\sum_i B_i^n(t)\\,AP_i\\), because \\(A\\) preserves sums and scalar multiples. The image of the curve is the Bézier curve with control points \\(AP_i\\).'),
                text('Za \\(P=(1,0),(2,3),(4,2),(5,-1)\\) so slike kontrolnih točk \\((2,1),(1,5),(6,6),(11,4)\\). Ker je \\(B(\\tfrac12)=(3,\\tfrac74)\\), je \\(A\\,B(\\tfrac12)=(\\tfrac{17}{4},\\tfrac{19}{4})\\), kar je tudi vrednost krivulje slik kontrolnih točk pri \\(t=\\tfrac12\\). Povlečenje ročic je ponazoritev izreka za en primer, ne dokaz. Matrika z \\(\\det A=0\\) je dovoljena: ravnina se sesede na premico ali točko in inverza ni.', 'For \\(P=(1,0),(2,3),(4,2),(5,-1)\\) the images of the control points are \\((2,1),(1,5),(6,6),(11,4)\\). Since \\(B(\\tfrac12)=(3,\\tfrac74)\\), we get \\(A\\,B(\\tfrac12)=(\\tfrac{17}{4},\\tfrac{19}{4})\\), which is also the value at \\(t=\\tfrac12\\) of the curve through the image control points. Dragging the handles illustrates the theorem for one case; it is not a proof. A matrix with \\(\\det A=0\\) is allowed: the plane collapses onto a line or a point and there is no inverse.'),
                text('Kako to uporabiš: pri vsaki matriki najprej zapiši stolpca, nato izračunaj sliko ene točke in šele potem preveri sliko cele krivulje. Če se rezultat ne ujema z grafom, je napaka skoraj vedno v vrstnem redu stolpcev in vrstic.',
                     'How to use it: for every matrix first write down the two columns, then compute the image of one point, and only then check the image of the whole curve. If the result disagrees with the graph, the mistake is almost always the order of columns and rows.'),
            ],
        }),
        withExample('determinant-area', {
            id: 'determinant-area',
            demonstrationIds: ['linear-map'],
            investigationPrompts: {'linear-map': text('Premakni ročici in opazuj ploščino slike enotskega kvadrata ter predznak determinante.', 'Move the handles and watch the area of the image of the unit square and the sign of the determinant.')},
            title: text('Determinanta kot predznačena ploščina', 'The determinant as signed area'),
            formula: String.raw`\det A=a_{11}a_{22}-a_{12}a_{21}`,
            paragraphs: [
                text('Cilj razdelka: iz matrike prebereš ploščino slike in orientacijo ter prepoznaš sesedanje. Slika enotskega kvadrata je paralelogram, ki ga napenjata \\(a_1\\) in \\(a_2\\), njegova predznačena ploščina pa je \\(\\det A=a_{11}a_{22}-a_{12}a_{21}\\). Izrek: preslikava \\(A\\) pomnoži ploščino vsakega območja z \\(|\\det A|\\), ker se ploščina območja sešteje iz majhnih kvadratkov, ki se vsi povečajo za isti faktor. Enotski kvadrat je slika enega območja.', 'Learning outcome: from a matrix you read the area of the image and the orientation, and recognise the collapse. The image of the unit square is the parallelogram spanned by \\(a_1\\) and \\(a_2\\), and its signed area is \\(\\det A=a_{11}a_{22}-a_{12}a_{21}\\). Theorem: the map \\(A\\) multiplies the area of every region by \\(|\\det A|\\), because the area of a region is a sum of small squares that all grow by the same factor. The unit square is a picture of one region.'),
                text('Zgled: za stolpca \\((2,1)\\) in \\((-1,1)\\) so slike oglišč \\((0,0),(2,1),(1,2),(-1,1)\\) in \\(\\det A=3\\). Za stolpca \\((1,2)\\) in \\((2,1)\\) je \\(\\det=-3\\): ploščina je spet \\(3\\), orientacija pa obrnjena, saj oglišča tečejo v smeri urnega kazalca. Predznak se zamenja natanko takrat, ko postanejo \\(0\\), \\(a_1\\) in \\(a_2\\) kolinearne.', 'Example: for the columns \\((2,1)\\) and \\((-1,1)\\) the image vertices are \\((0,0),(2,1),(1,2),(-1,1)\\) and \\(\\det A=3\\). For the columns \\((1,2)\\) and \\((2,1)\\) we get \\(\\det=-3\\): the area is again \\(3\\), but the orientation is reversed because the vertices run clockwise. The sign changes exactly when \\(0\\), \\(a_1\\) and \\(a_2\\) become collinear.'),
                text('Pri \\(\\det A=0\\) je slika daljica ali točka: za stolpca \\((1,\\tfrac12)\\) in \\((2,1)\\) se kvadrat preslika na daljico od \\((0,0)\\) do \\((3,\\tfrac32)\\), vektor \\((2,-1)\\) pa v \\((0,0)\\). Determinanta produkta je produkt determinant, \\(\\det(AE)=\\det A\\cdot\\det E\\): za \\(E\\) s stolpcema \\((4,2)\\) in \\((1,3)\\) je \\(3\\cdot10=30\\). Vnosi so večkratniki \\(\\tfrac14\\), zato sta determinanta in njen predznak izračunana točno, brez tolerance.', 'When \\(\\det A=0\\) the image is a segment or a point: for the columns \\((1,\\tfrac12)\\) and \\((2,1)\\) the square lands on the segment from \\((0,0)\\) to \\((3,\\tfrac32)\\), and the vector \\((2,-1)\\) goes to \\((0,0)\\). The determinant of a product is the product of the determinants, \\(\\det(AE)=\\det A\\cdot\\det E\\): for \\(E\\) with columns \\((4,2)\\) and \\((1,3)\\) this is \\(3\\cdot10=30\\). The entries are multiples of \\(\\tfrac14\\), so the determinant and its sign are computed exactly, without a tolerance.'),
                text('Kako to uporabiš: predznak determinante pove, ali preslikava ohrani ali obrne smer obhoda, absolutna vrednost pa, kolikokrat se ploščine povečajo. Pri nič se ploščina izgubi in preslikave ni mogoče obrniti.',
                     'How to use it: the sign of the determinant tells whether the map keeps or reverses the direction of travel, and the absolute value tells by what factor areas grow. At zero the area is lost and the map cannot be undone.'),
            ],
        }),
    ],
};
