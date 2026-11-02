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

/** Batch T1 of the triangulation spec: only the released lesson (B1, ear clipping and the art gallery theorem) is mentioned. */
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
    ],
};
