import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    CONVEXITY_CHAPTER_ID, convexityGuidedExampleDemonstration, type ConvexitySectionId,
} from './convexityChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: ConvexitySectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = convexityGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${CONVEXITY_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Batch 1 of the convexity spec: only the released lessons (orientation, polygon area and Pick, convex hull) are mentioned. */
export const convexityChapter: FamilyChapter = {
    id: CONVEXITY_CHAPTER_ID,
    family: 'computational-geometry',
    title: text('Konveksnost in ovojnice', 'Convexity and hulls'),
    purpose: text('Bézierjeva krivulja leži v konveksni ovojnici svojih kontrolnih točk. Poglavje pokaže, kako takšno ovojnico izračunamo: najprej z orientacijo treh točk, nato s ploščino večkotnika in Pickovim izrekom, na koncu pa še s tremi algoritmi za konveksno ovojnico. Vsak razdelek poda obrazec in primer, ki ga lahko preračunaš sam.', 'A Bézier curve lies in the convex hull of its control points. The chapter shows how to compute such a hull: first the orientation of three points, then the area of a polygon and Pick\'s theorem, and finally three algorithms for the convex hull. Each section states a formula and an example you can recompute yourself.'),
    prerequisites: text('Koordinate in vektorji v ravnini. Lastnost konveksne ovojnice Bézierjeve krivulje je opisana v poglavju o Bézierjevih krivuljah.', 'Coordinates and vectors in the plane. The convex hull property of a Bézier curve is described in the chapter on Bézier curves.'),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/bezier-curves#geometric-properties', title: text('Bézierjeve krivulje: lastnosti in konveksna ovojnica', 'Bézier curves: properties and the convex hull')}],
    sections: [
        {
            id: 'why-hulls',
            title: text('Zakaj ovojnice', 'Why hulls'),
            paragraphs: [
                text('Cilj razdelka: razumeš, zakaj računamo konveksne ovojnice. Konveksna ovojnica množice točk je najmanjša konveksna množica, ki vsebuje vse točke. Za Bézierjevo krivuljo \\(B(t)=\\sum_i B_i^n(t)P_i\\) so uteži \\(B_i^n(t)\\) nenegativne in dajo vsoto \\(1\\), zato vsaka točka krivulje leži v ovojnici kontrolnih točk \\(P_i\\). Ovojnica je torej zagotovilo za lego krivulje, ne le lepa slika.', 'Learning outcome: you understand why hulls are computed. The convex hull of a set of points is the smallest convex set that contains all of them. For a Bézier curve \\(B(t)=\\sum_i B_i^n(t)P_i\\) the weights \\(B_i^n(t)\\) are non-negative and sum to \\(1\\), so every point of the curve lies in the hull of the control points \\(P_i\\). The hull is therefore a guarantee about where the curve can be, not just a nice picture.'),
                text('Za izračun ovojnice potrebujemo le en gradnik: odgovor na vprašanje, ali tri točke zavijajo v levo ali v desno. Naslednji trije razdelki ga zgradijo, ga uporabijo za ploščino večkotnika in nato za algoritme ovojnice.', 'Computing a hull needs only one building block: the answer to whether three points turn left or right. The next three sections build it, use it for the area of a polygon, and then use it for hull algorithms.'),
            ],
        },
        withExample('orientation', {
            id: 'orientation',
            demonstrationIds: ['orientation'],
            investigationPrompts: {orientation: text('Premakni točko \\(r\\) čez premico \\(pq\\) in opazuj, kdaj vrednost \\(D\\) zamenja predznak.', 'Move the point \\(r\\) across the line \\(pq\\) and watch when the value \\(D\\) changes sign.')},
            title: text('Orientacija treh točk', 'Orientation of three points'),
            formula: String.raw`D=(q_x-p_x)(r_y-p_y)-(q_y-p_y)(r_x-p_x)`,
            paragraphs: [
                text('Cilj razdelka: iz predznaka ene vrednosti določiš, ali točke \\(p\\), \\(q\\), \\(r\\) zavijajo v levo ali v desno, in prepoznaš kolinearnost. Vrednost \\(D\\) je determinanta vektorjev \\(q-p\\) in \\(r-p\\), torej dvakratnik predznačene ploščine trikotnika \\(pqr\\). Pozitivna vrednost pomeni zavoj v levo (nasprotno od smeri urinega kazalca), negativna zavoj v desno, \\(D=0\\) pa pomeni, da \\(r\\) leži na premici \\(pq\\).', 'Learning outcome: from the sign of one value you decide whether the points \\(p\\), \\(q\\), \\(r\\) turn left or right, and you recognise collinearity. The value \\(D\\) is the determinant of the vectors \\(q-p\\) and \\(r-p\\), so it is twice the signed area of the triangle \\(pqr\\). A positive value means a left turn (counter-clockwise), a negative value a right turn, and \\(D=0\\) means that \\(r\\) lies on the line \\(pq\\).'),
                text('Zgled: za \\(p=(0,0)\\) in \\(q=(4,0)\\) da \\(r=(3,2)\\) vrednost \\(D=+8\\) (levi zavoj), \\(r=(3,-2)\\) da \\(D=-8\\) (desni zavoj), \\(r=(2,0)\\) pa \\(D=0\\) (kolinearne točke). Če zamenjaš poljubni dve točki, \\(D\\) spremeni predznak. Vse točke so na mreži, zato so vrednosti celoštevilske in predznak je natančen.', 'Example: for \\(p=(0,0)\\) and \\(q=(4,0)\\), \\(r=(3,2)\\) gives \\(D=+8\\) (left turn), \\(r=(3,-2)\\) gives \\(D=-8\\) (right turn), and \\(r=(2,0)\\) gives \\(D=0\\) (collinear). Swapping any two of the points negates \\(D\\). All points are on the grid, so the values are integers and the sign is exact.'),
                text('Kako to uporabiš: pri vsakem algoritmu v naslednjih razdelkih se vprašanje »levo ali desno« vedno reši s predznakom te vrednosti.', 'How to use it: in every algorithm of the following sections the question "left or right" is answered by the sign of this value.'),
            ],
        }),
        withExample('polygon-area', {
            id: 'polygon-area',
            demonstrationIds: ['polygon-area'],
            investigationPrompts: {'polygon-area': text('Obrni vrstni red oglišč in opazuj, kaj se zgodi s predznakom, nato primerjaj Pickov izrek z obrazcem z determinantami.', 'Reverse the vertex order and watch what happens to the sign, then compare Pick\'s theorem with the shoelace sum.')},
            title: text('Ploščina večkotnika in Pickov izrek', 'Polygon area and Pick\'s theorem'),
            formula: String.raw`A=\tfrac12\sum_{i}(x_iy_{i+1}-x_{i+1}y_i),\qquad A=I+\tfrac B2-1`,
            paragraphs: [
                text('Cilj razdelka: ploščino večkotnika izračunaš kot vsoto predznačenih ploščin trikotnikov in jo preveriš s Pickovim izrekom. Obrazec z determinantami (angl. shoelace) je vsota \\(\\tfrac12\\sum(x_iy_{i+1}-x_{i+1}y_i)\\) po robovih; vsak člen je polovica vrednosti \\(D\\) za trikotnik iz izhodišča. Predznak vsote pove smer obhoda: pozitiven je pri obhodu v nasprotni smeri urinega kazalca, negativen v smeri urinega kazalca.', 'Learning outcome: you compute the area of a polygon as a sum of signed triangle areas and check it with Pick\'s theorem. The shoelace formula is the sum \\(\\tfrac12\\sum(x_iy_{i+1}-x_{i+1}y_i)\\) over the edges; each term is half the value \\(D\\) for a triangle from the origin. The sign of the sum gives the direction of travel: positive for a counter-clockwise walk, negative for a clockwise one.'),
                text('Pickov izrek: večkotnik z oglišči na mreži, \\(I\\) notranjimi in \\(B\\) robnimi mrežnimi točkami, ima ploščino \\(A=I+\\tfrac B2-1\\). Zgled: petkotnik z oglišči \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\) ima \\(A=21\\), \\(B=8\\) in \\(I=18\\), res \\(18+\\tfrac82-1=21\\). Nekonveksni petkotnik \\((0,0),(6,0),(6,4),(3,2),(0,4)\\) ima \\(A=18\\), \\(B=16\\) in \\(I=11\\).', 'Pick\'s theorem: a polygon with vertices on lattice points, \\(I\\) interior and \\(B\\) boundary lattice points, has area \\(A=I+\\tfrac B2-1\\). Example: the pentagon with vertices \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\) has \\(A=21\\), \\(B=8\\) and \\(I=18\\), indeed \\(18+\\tfrac82-1=21\\). The non-convex pentagon \\((0,0),(6,0),(6,4),(3,2),(0,4)\\) has \\(A=18\\), \\(B=16\\) and \\(I=11\\).'),
                text('Pozor: pri večkotniku, ki seka samega sebe, vsota ni več ploščina, ampak vsota ploščin, pomnoženih s številom obhodov, Pickov izrek pa ne velja. Kako to uporabiš: ploščino preberi iz absolutne vrednosti vsote, smer obhoda pa iz njenega predznaka.', 'Caution: for a self-intersecting polygon the sum is no longer the area but a sum of areas weighted by the winding number, and Pick\'s theorem does not apply. How to use it: read the area from the absolute value of the sum and the direction of travel from its sign.'),
            ],
        }),
        withExample('convex-hull', {
            id: 'convex-hull',
            demonstrationIds: ['convex-hull'],
            investigationPrompts: {'convex-hull': text('Napovej, katere točke so oglišča ovojnice, nato s korakanjem primerjaj število orientacijskih preizkusov pri treh algoritmih.', 'Predict which points are vertices of the hull, then step through and compare the number of orientation tests of the three algorithms.')},
            title: text('Konveksna ovojnica', 'Convex hull'),
            formula: String.raw`\operatorname{conv}(S)=\bigcap\{K\supseteq S:\ K\text{ convex}\}`,
            paragraphs: [
                text('Cilj razdelka: konveksno ovojnico množice točk zgradiš z orientacijskimi preizkusi in primerjaš tri algoritme. Ovojnica je najmanjša konveksna množica, ki vsebuje vse točke; njena oglišča so točke, ki jih ni mogoče zapisati kot konveksno kombinacijo drugih. Usmerjeni par točk je rob ovojnice natanko takrat, ko vse druge točke ležijo levo od njega ali na daljici med njima.', 'Learning outcome: you build the convex hull of a set of points from orientation tests and compare three algorithms. The hull is the smallest convex set that contains all the points; its vertices are the points that cannot be written as a convex combination of the others. A directed pair of points is an edge of the hull exactly when all other points lie to its left or on the segment between them.'),
                text('Zgled: devet točk z vzorca ima konveksno ovojnico \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\) v nasprotni smeri urinega kazalca; točka \\((2,0)\\) leži na robu, a ni oglišče. Počasni preizkus robov (učni algoritem) opravi \\(504\\) orientacijskih preizkusov, algoritem monotone verige (Andrew) \\(23\\), ovijanje (Jarvisov algoritem, angl. gift wrapping) \\(35\\); vsi dobijo isto ovojnico.', 'Example: the nine points of the sample have the convex hull \\((-1,3),(0,0),(4,0),(5,3),(2,5)\\) in counter-clockwise order; the point \\((2,0)\\) lies on an edge but is not a vertex. The slow edge test (a teaching algorithm) makes \\(504\\) orientation tests, the monotone chain algorithm (Andrew) \\(23\\), and gift wrapping (Jarvis) \\(35\\); all of them give the same hull.'),
                text('Kolinearne točke potrebujejo pravilo: pri \\(D=0\\) monotona veriga zavrže vmesno točko, zato ostanejo v ovojnici le prava oglišča. Kako to uporabiš: ko iščeš najmanjši konveksni lik okoli točk, orientacijski preizkus odloči vsak korak, število preizkusov pa pove ceno algoritma.', 'Collinear points need a rule: at \\(D=0\\) the monotone chain discards the middle point, so only true vertices stay in the hull. How to use it: when you look for the smallest convex shape around points, the orientation test decides every step, and the number of tests tells the cost of the algorithm.'),
            ],
        }),
    ],
};
