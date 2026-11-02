import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    TRIANGULATION_CHAPTER_ID, triangulationGuidedExampleDemonstration, type TriangulationSectionId,
} from './triangulationChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: TriangulationSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = triangulationGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${TRIANGULATION_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Only the released lessons (B1, ear clipping and the art gallery theorem; B2, point-set triangulation) are mentioned. */
export const triangulationChapter: FamilyChapter = {
    id: TRIANGULATION_CHAPTER_ID,
    family: 'computational-geometry',
    title: text('Triangulacije in Voronojevi diagrami', 'Triangulations and Voronoi diagrams'),
    purpose: text('Večkotnik razrežemo na trikotnike, ker so trikotniki preprosti: imajo znano ploščino, računalnik jih hitro nariše in vsakega lahko obravnavamo posebej. Poglavje pokaže, kako večkotnik razrežemo z rezanjem ušes, in z izrekom o galeriji odgovori na vprašanje, koliko stražarjev zadošča za nadzor celotne galerije.', 'A polygon is cut into triangles because triangles are simple: their area is known, a computer draws them quickly, and each can be handled on its own. The chapter shows how to cut a polygon by ear clipping and answers, with the art gallery theorem, how many guards suffice to watch a whole gallery.'),
    prerequisites: text('Orientacija treh točk in ploščina večkotnika. Obe sta opisani v poglavju o konveksnosti in ovojnicah.', 'The orientation of three points and the area of a polygon. Both are described in the chapter on convexity and hulls.'),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/convexity-hulls#orientation', title: text('Konveksnost in ovojnice: orientacija treh točk', 'Convexity and hulls: orientation of three points')}],
    sections: [
        {
            id: 'why-triangulate',
            title: text('Zakaj triangulacija', 'Why triangulate'),
            paragraphs: [
                text('Cilj razdelka: razumeš, zakaj večkotnik razrežemo na trikotnike. Triangulacija večkotnika je razrez na trikotnike, ki se ne prekrivajo in katerih oglišča so oglišča večkotnika. Ploščino večkotnika dobimo kot vsoto ploščin trikotnikov, grafična kartica nariše le trikotnike, vsak trikotnik pa je konveksen, zato je z njim lažje računati kot z vbočenim večkotnikom.', 'Learning outcome: you understand why a polygon is cut into triangles. A triangulation of a polygon is a cut into non-overlapping triangles whose vertices are vertices of the polygon. The area of the polygon is the sum of the triangle areas, a graphics card draws only triangles, and every triangle is convex, so it is easier to compute with than a non-convex polygon.'),
                text('Za razrez potrebujemo orientacijo treh točk: z njo ločimo izbočena oglišča od vbočenih in preverimo, ali trikotnik vsebuje drugo oglišče. Naslednji razdelek razrez zgradi, nato pa se vprašamo še, koliko stražarjev v galeriji z obliko večkotnika vidi vsak kot.', 'The cut needs the orientation of three points: it separates convex vertices from reflex ones and tests whether a triangle contains another vertex. The next section builds the cut, and then we ask how many guards in a gallery shaped like the polygon are enough to see every corner.'),
                text('Vprašanje o galeriji je znano: muzej ima tloris v obliki večkotnika, stražar pa vidi vse točke, do katerih lahko potegne daljico znotraj tlorisa. Koliko stražarjev zadošča, da je viden vsak kot, in kam jih postaviti? Odgovor ni odvisen od oblike, ampak le od števila oglišč, kar pove izrek na koncu naslednjega razdelka.', 'The gallery question is a classic one: a museum has a floor plan shaped like a polygon, and a guard sees every point to which a segment can be drawn inside the plan. How many guards are enough to see every corner, and where should they stand? The answer does not depend on the shape, only on the number of vertices, as the theorem at the end of the next section states.'),
            ],
        },
        withExample('ear-clipping', {
            id: 'ear-clipping',
            demonstrationIds: ['ear-clipping'],
            investigationPrompts: {'ear-clipping': text('Napovej, katero oglišče lahko odrežemo kot uho, nato s korakanjem preveri, ali v trikotniku res ni drugega oglišča.', 'Predict which vertex can be cut off as an ear, then step through and check that the triangle really holds no other vertex.')},
            title: text('Rezanje ušes in izrek o galeriji', 'Ear clipping and the art gallery theorem'),
            formula: String.raw`T=n-2,\qquad d=n-3,\qquad g=\left\lfloor\tfrac n3\right\rfloor`,
            paragraphs: [
                text('Cilj razdelka: večkotnik razrežeš na trikotnike z rezanjem ušes in nato s Fiskovim 3-barvanjem postaviš stražarje. Uho je izbočeno oglišče, katerega trikotnik z obema sosednjima ogliščema ne vsebuje nobenega drugega oglišča večkotnika. Odrežemo uho, ostane večkotnik z enim ogliščem manj, in postopek ponavljamo, dokler ne ostane trikotnik. Prvo uho izberemo z najmanjšim indeksom oglišča v nasprotni smeri urinega kazalca.', 'Learning outcome: you cut a polygon into triangles by ear clipping and then place guards with Fisk\'s 3-colouring. An ear is a convex vertex whose triangle with its two neighbours contains no other vertex of the polygon. Cut the ear off, a polygon with one vertex fewer remains, and the process repeats until a triangle is left. The first ear is the one with the lowest vertex index in counter-clockwise order.'),
                text('Večkotnik z \\(n\\) oglišči ima triangulacijo z \\(T=n-2\\) trikotniki in \\(d=n-3\\) diagonalami. Zgled: petkotnik \\((0,0),(6,0),(6,4),(3,2),(0,4)\\) ima ploščino \\(18\\) in vbočeno oglišče \\((3,2)\\); odrežemo trikotnika \\((6,0),(6,4),(3,2)\\) in \\((0,0),(6,0),(3,2)\\), ostane \\((0,0),(3,2),(0,4)\\), skupaj \\(3\\) trikotniki.', 'A polygon with \\(n\\) vertices has a triangulation with \\(T=n-2\\) triangles and \\(d=n-3\\) diagonals. Example: the pentagon \\((0,0),(6,0),(6,4),(3,2),(0,4)\\) has area \\(18\\) and the reflex vertex \\((3,2)\\); the triangles \\((6,0),(6,4),(3,2)\\) and \\((0,0),(6,0),(3,2)\\) are cut off, \\((0,0),(3,2),(0,4)\\) remains, \\(3\\) triangles in all.'),
                text('Izrek o galeriji: oglišča triangulacije lahko pobarvamo s tremi barvami tako, da ima vsak trikotnik vse tri barve (Fiskovo 3-barvanje). Najmanjši barvni razred ima največ \\(g=\\lfloor n/3\\rfloor\\) oglišč, stražarji v njem pa vidijo vsak trikotnik, ker oglišče vidi vse trikotnike, v katerih leži. Pri petkotniku je \\(g=1\\): en stražar v \\((3,2)\\) vidi vso galerijo. Kako to uporabiš: pri vsakem večkotniku z \\(n\\) oglišči zadošča \\(\\lfloor n/3\\rfloor\\) stražarjev, pri glavniku z \\(11\\) oglišči pa jih je toliko tudi potrebnih.', 'The art gallery theorem: the vertices of a triangulation can be coloured with three colours so that every triangle has all three colours (Fisk\'s 3-colouring). The smallest colour class has at most \\(g=\\lfloor n/3\\rfloor\\) vertices, and guards on it see every triangle, because a vertex sees every triangle it belongs to. For the pentagon \\(g=1\\): one guard at \\((3,2)\\) sees the whole gallery. How to use it: for any polygon with \\(n\\) vertices \\(\\lfloor n/3\\rfloor\\) guards suffice, and for the comb with \\(11\\) vertices that many are also necessary.'),
                text('Pozor: rezanje ušes je opisano za enostavne večkotnike, ki se ne sekajo sami, in za strogo izbočena ušesa, zato tri zaporedna kolinearna oglišča ali samopresek lekcija zavrne z navodilom. Če je večkotnik podan v smeri urinega kazalca, ga lekcija najprej obrne in to tudi pove. Zakaj uho vedno obstaja: vsak enostaven večkotnik z vsaj štirimi oglišči ima diagonalo, ki ga razdeli na dva manjša večkotnika, vsak pa ima spet uho ali pa je trikotnik.', 'Caution: ear clipping is described for simple polygons that do not cross themselves, and for strictly convex ears, so the lesson refuses three consecutive collinear vertices or a self-intersection with an explanation. If the polygon is given clockwise, the lesson reverses it first and says so. Why an ear always exists: every simple polygon with at least four vertices has a diagonal that splits it into two smaller polygons, and each of those has an ear again or is a triangle.'),
            ],
        }),
        withExample('point-set-triangulation', {
            id: 'point-set-triangulation',
            demonstrationIds: ['point-set-triangulation'],
            investigationPrompts: {'point-set-triangulation': text('Preštej trikotnike in robe, nato zamenjaj en rob in preveri, da se števili ne spremenita.', 'Count the triangles and edges, then flip one edge and check that the two counts do not change.')},
            title: text('Triangulacija množice točk', 'Triangulating a set of points'),
            formula: String.raw`T=2n-2-k,\qquad E=3n-3-k`,
            paragraphs: [
                text('Cilj razdelka: prešteješ trikotnike in robe triangulacije množice točk, brez risanja. Triangulacija množice točk je razrez konveksne ovojnice na trikotnike, katerih oglišča so točke množice in ki uporabijo vsako točko kot oglišče. Če je \\(n\\) število točk in \\(k\\) število točk na robu ovojnice, pri čemer štejejo tudi kolinearne točke na robu, ima vsaka triangulacija \\(T=2n-2-k\\) trikotnikov in \\(E=3n-3-k\\) robov.', 'Learning outcome: you count the triangles and edges of a triangulation of a point set without drawing it. A triangulation of a point set is a cut of the convex hull into triangles whose vertices are points of the set and which use every point as a vertex. If \\(n\\) is the number of points and \\(k\\) the number of points on the boundary of the hull, collinear points on the boundary included, every triangulation has \\(T=2n-2-k\\) triangles and \\(E=3n-3-k\\) edges.'),
                text('Zgled: pri \\(n=7\\) točkah, od katerih je \\(k=5\\) na robu ovojnice, je \\(T=2\\cdot7-2-5=7\\) in \\(E=3\\cdot7-3-5=13\\), od tega \\(8\\) notranjih robov in \\(5\\) robov ovojnice. Števili nista odvisni od izbire triangulacije: zamenjava roba, pri kateri diagonalo štirikotnika iz dveh trikotnikov nadomestimo z drugo, spremeni trikotnike, ne pa njihovega števila.', 'Example: with \\(n=7\\) points, \\(k=5\\) of them on the hull boundary, \\(T=2\\cdot7-2-5=7\\) and \\(E=3\\cdot7-3-5=13\\), of which \\(8\\) are interior edges and \\(5\\) are hull edges. The counts do not depend on which triangulation is chosen: a flip of an edge, which replaces the diagonal of a quadrilateral made of two triangles by the other one, changes the triangles but not how many there are.'),
                text('Zakaj formuli držita: vsota notranjih kotov vseh trikotnikov je \\(180^\\circ\\,T\\). Vsaka od \\(n-k\\) notranjih točk prispeva \\(360^\\circ\\), točke na robu skupaj pa \\(180^\\circ(k-2)\\), zato je \\(T=2n-2-k\\). Notranji rob pripada dvema trikotnikoma, rob ovojnice enemu, zato je \\(3T=2E-k\\) in \\(E=3n-3-k\\). Kako to uporabiš: število trikotnikov preberi iz \\(n\\) in \\(k\\), ne glede na to, kako je množica razrezana.', 'Why the formulas hold: the interior angles of all triangles sum to \\(180^\\circ\\,T\\). Each of the \\(n-k\\) interior points contributes \\(360^\\circ\\) and the boundary points together \\(180^\\circ(k-2)\\), so \\(T=2n-2-k\\). An interior edge belongs to two triangles and a hull edge to one, so \\(3T=2E-k\\) and \\(E=3n-3-k\\). How to use it: read the number of triangles from \\(n\\) and \\(k\\), however the set is cut.'),
            ],
        }),
    ],
};
