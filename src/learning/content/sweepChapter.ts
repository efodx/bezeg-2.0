import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    SWEEP_CHAPTER_ID, sweepGuidedExampleDemonstration, type SweepSectionId,
} from './sweepChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: SweepSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = sweepGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${SWEEP_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Batches S1 and S2 of the sweep spec: only the released lessons (C1 to C4) are mentioned; later lessons are not. */
export const sweepChapter: FamilyChapter = {
    id: SWEEP_CHAPTER_ID,
    family: 'computational-geometry',
    title: text('Algoritmi pometanja', 'Sweep-line algorithms'),
    purpose: text('Pometanje vprašanje o celotni ravnini razdeli na zaporedje majhnih korakov: premica potuje po ravnini, računalnik pa popravi svoje stanje le tam, kjer se kaj zgodi. Poglavje pokaže idejo na intervalih na premici, jo uporabi za iskanje vseh presečišč množice daljic in nato za razdelitev večkotnika na monotone dele ter njihovo triangulacijo.', 'Sweeping splits a question about the whole plane into a sequence of small steps: a line travels over the plane, and the computer updates its state only where something happens. The chapter shows the idea on intervals of a line and then uses it to find all intersection points of a set of segments, and then to cut a polygon into monotone pieces and triangulate them.'),
    prerequisites: text('Za prvi razdelek zadošča branje števil na številski premici. Drugi in tretji razdelek uporabljata orientacijo treh točk, opisano v poglavju o konveksnosti in ovojnicah; zadnji razdelek se na rezanje ušes v poglavju o triangulacijah sklicuje za primerjavo.', 'The first section needs only reading numbers on a number line. The second and third sections use the orientation of three points, described in the chapter on convexity and hulls; the last section refers to ear clipping in the chapter on triangulations for comparison.'),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/convexity-hulls#orientation', title: text('Konveksnost in ovojnice: orientacija treh točk', 'Convexity and hulls: orientation of three points')},
        {path: '/bezeg-2.0/learn/triangulations-voronoi#ear-clipping', title: text('Triangulacije: rezanje ušes', 'Triangulations: ear clipping')}],
    sections: [
        {
            id: 'sweep-idea',
            title: text('Ideja pometanja', 'The idea of sweeping'),
            paragraphs: [
                text('Cilj razdelka: razumeš, kaj pomeni pometanje ravnine. Pometalna premica je vodoravna premica, ki se pomika navzdol po ravnini in se ustavi samo pri dogodkih, to so točke, kjer se kaj spremeni. Dogodke hrani vrsta dogodkov, razvrščena po padajoči koordinati \\(y\\); pri enaki \\(y\\) je prej tisti z manjšo koordinato \\(x\\). To je edina smer, ki jo uporabljamo v vsem poglavju.', 'Learning outcome: you understand what it means to sweep the plane. The sweep line is a horizontal line moving downwards over the plane that stops only at events, the points where something changes. The events are kept in an event queue, ordered by decreasing \\(y\\); at equal \\(y\\) the one with smaller \\(x\\) comes first. This is the one direction used throughout the chapter.'),
                text('Med dvema dogodkoma se nič ne spremeni, zato računalnik premice ne spremlja neprekinjeno. Pomni samo stanje pometalne premice, to je urejen seznam predmetov, ki jih premica trenutno seka, in ga ob vsakem dogodku popravi. Prvi razdelek to pokaže na intervalih, drugi na daljicah v ravnini.', 'Nothing changes between two events, so the computer does not follow the line continuously. It keeps only the status of the sweep line, an ordered list of the objects the line currently crosses, and updates it at each event. The first section shows this on intervals, the second on segments in the plane.'),
            ],
        },
        withExample('interval-sweep', {
            id: 'interval-sweep',
            demonstrationIds: ['interval-sweep'],
            investigationPrompts: {'interval-sweep': text('Napovej, koliko intervalov se prekriva v najbolj obremenjeni točki, nato s korakanjem preveri.', 'Predict how many intervals overlap at the busiest point, then step through and check.')},
            title: text('Pometanje intervalov', 'Interval sweep'),
            formula: String.raw`\binom n2=\frac{n(n-1)}2`,
            paragraphs: [
                text('Cilj razdelka: vidiš, da pometalna premica in razvrščena vrsta dogodkov vprašanje „kateri intervali se prekrivajo“ spremenita v zaporedje majhnih sprememb. Intervali so zaprti, zato se dotikajoča se intervala prekrivata. Pri enaki koordinati najprej obdelamo vstope, nato izstope. Odprta množica intervalov, to je stanje, se spremeni samo pri dogodkih.', 'Learning outcome: you see that a sweep line and a sorted event queue turn the question "which intervals overlap" into a sequence of small changes. The intervals are closed, so two intervals that touch overlap. At equal coordinates entering events are processed before leaving events. The open set of intervals, which is the status, changes only at events.'),
                text('Zgled: \\(a=[0,4]\\), \\(b=[2,7]\\), \\(c=[3,5]\\), \\(d=[6,9]\\), \\(e=[8,10]\\). Po desetih dogodkih je število odprtih intervalov \\(1,2,3,2,1,2,1,2,1,0\\), največ \\(3\\) na \\([3,4]\\). Ko interval vstopi, ga poročamo v paru z vsakim odprtim: najdemo pet parov \\(ab, ac, bc, bd, de\\).', 'Example: \\(a=[0,4]\\), \\(b=[2,7]\\), \\(c=[3,5]\\), \\(d=[6,9]\\), \\(e=[8,10]\\). After the ten events the number of open intervals is \\(1,2,3,2,1,2,1,2,1,0\\), at most \\(3\\) on \\([3,4]\\). When an interval enters, it is reported with each open one: we find five pairs \\(ab, ac, bc, bd, de\\).'),
                text('Kako to uporabiš: preizkus vseh parov bi zahteval \\(\\binom n2\\) preizkusov, pri petih intervalih \\(10\\), pometanje pa pare poroča sproti, ko intervali vstopajo. Isto idejo zasukamo: dogodki so točke ravnine, stanje pa urejen seznam predmetov, ki jih premica seka.', 'How to use it: testing all pairs would take \\(\\binom n2\\) tests, \\(10\\) for five intervals, while the sweep reports pairs as intervals enter. The same idea rotated: the events are points of the plane and the status is an ordered list of the objects the line crosses.'),
            ],
        }),
        withExample('segment-intersections', {
            id: 'segment-intersections',
            demonstrationIds: ['segment-intersections'],
            investigationPrompts: {'segment-intersections': text('Napovej, koliko presečišč imajo štiri daljice in kateri pari se sekajo, nato s korakanjem preveri.', 'Predict how many crossings the four segments have and which pairs cross, then step through and check.')},
            title: text('Presečišča daljic', 'Segment intersections'),
            formula: String.raw`O\bigl((n+k)\log n\bigr)`,
            paragraphs: [
                text('Cilj razdelka: najdeš vsa presečišča \\(n\\) daljic in vidiš, zakaj zadostuje preizkusiti samo sosednji daljici. Predpogoj je razdelek Pometanje intervalov (vrsta dogodkov in stanje) ter orientacija treh točk. Stanje hrani daljice po vrsti od leve proti desni; ob vstopu daljice jo vstavimo na pravo mesto, ob izstopu odstranimo, in vsakič preizkusimo le nova sosednja para.', 'Learning outcome: you find all intersection points of \\(n\\) segments and see why testing only neighbouring segments is enough. The prerequisites are the section Interval sweep (event queue and status) and the orientation of three points. The status keeps the segments in order from left to right; a segment is inserted at its place when it enters and removed when it leaves, and each time only the new neighbouring pairs are tested.'),
                text('Dve daljici se v presečišču zamenjata v stanju: tik pred presečiščem sta sosednji, tik za njim pa v obratnem vrstnem redu. Ko preizkus sosedov najde presečišče pod pometalno premico, ga vpišemo v vrsto dogodkov, enkrat. Zgled: \\(s_0=(0,0)(6,4)\\), \\(s_1=(0,4)(6,0)\\), \\(s_2=(1,-1)(2,5)\\), \\(s_3=(4,5)(5,-1)\\) imajo pet presečišč, med njimi \\(s_0s_1\\) v \\((3,2)\\); skupaj je \\(13\\) dogodkov.', 'Two segments swap in the status at their crossing: just before it they are neighbours, just after it they are in the opposite order. When a neighbour test finds a crossing below the sweep line, it is put into the event queue, once. Example: \\(s_0=(0,0)(6,4)\\), \\(s_1=(0,4)(6,0)\\), \\(s_2=(1,-1)(2,5)\\), \\(s_3=(4,5)(5,-1)\\) have five crossings, among them \\(s_0s_1\\) at \\((3,2)\\); there are \\(13\\) events in all.'),
                text('Čas: pri \\(n\\) daljicah in \\(k\\) presečiščih je čas \\(O((n+k)\\log n)\\). Preizkus vseh parov bi pri štirih daljicah zahteval \\(\\binom42=6\\) preizkusov; lekcija prešteje preizkuse sosedov in njihovo število primerja s tem. Kako to uporabiš: pri malo presečiščih je pometanje hitrejše od preizkusa vseh parov. Daljice, ki se prekrivajo vzdolž premice, lekcija zavrne, ker rezultat ni točka.', 'Time: with \\(n\\) segments and \\(k\\) crossings the time is \\(O((n+k)\\log n)\\). Testing all pairs of four segments would take \\(\\binom42=6\\) tests; the lesson counts the neighbour tests and compares the two. How to use it: with few crossings the sweep is faster than testing all pairs. Segments that overlap along a line are refused by the lesson, because the result is not a point.'),
            ],
        }),
        withExample('monotone-partition', {
            id: 'monotone-partition',
            demonstrationIds: ['monotone-partition'],
            investigationPrompts: {'monotone-partition': text('Napovej, katera oglišča kvarijo monotonost, nato s korakanjem preveri.', 'Predict which vertices break monotonicity, then step through and check.')},
            title: text('Razdelitev na monotone večkotnike', 'Partitioning into monotone polygons'),
            formula: String.raw`p=d+1`,
            paragraphs: [
                text('Cilj razdelka: večkotnik razdeliš na dele, monotone glede na os \\(y\\). Pometalna premica gre po večkotniku od zgoraj navzdol in razvrsti oglišča v pet vrst: začetna, končna, razcepna, zlivna in navadna. Monotonost kvarita samo razcepno in zlivno oglišče; druga oglišča je ne kvarijo. Predpogoj sta razdelek Pometanje intervalov (vrsta dogodkov in stanje) ter orientacija treh točk.', 'Learning outcome: you cut a polygon into pieces that are monotone with respect to the \\(y\\)-axis. The sweep line goes down the polygon and classifies the vertices into five types: start, end, split, merge and regular. Only split and merge vertices break monotonicity; the other vertices do not. The prerequisites are the section Interval sweep (event queue and status) and the orientation of three points.'),
                text('Stanje hrani robe levo od notranjosti, vsakemu pa pomočnika, to je najnižje doslej obdelano oglišče, ki ga je z robom mogoče povezati brez prečkanja večkotnika. Razcepno oglišče dobi diagonalo do pomočnika roba levo od sebe; zlivno oglišče postane pomočnik levega roba. Zgled: šestkotnik \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) dobi eno diagonalo in se razdeli na dva dela.', 'The status keeps the edges to the left of the interior, each with a helper, the lowest vertex handled so far that can be joined to the edge without crossing the polygon. A split vertex gets a diagonal to the helper of the edge to its left; a merge vertex becomes the helper of the left edge. Example: the hexagon \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) gets one diagonal and is cut into two pieces.'),
                text('Kako to uporabiš: število kosov je za \\(1\\) večje od števila diagonal, \\(p=d+1\\); pri zgledu je \\(d=1\\) in \\(p=2\\). Vsak kos je monoton, zato ga je mogoče triangulirati v enem prehodu, kar pokaže naslednji razdelek. Za primerjavo je na voljo rezanje ušes iz poglavja o triangulacijah, ki monotonosti ne potrebuje.', 'How to use it: the number of pieces is one more than the number of diagonals, \\(p=d+1\\); in the example \\(d=1\\) and \\(p=2\\). Every piece is monotone, so it can be triangulated in one pass, which the next section shows. For contrast, the chapter on triangulations has ear clipping, which needs no monotonicity.'),
            ],
        }),
        withExample('monotone-triangulation', {
            id: 'monotone-triangulation',
            demonstrationIds: ['monotone-triangulation'],
            investigationPrompts: {'monotone-triangulation': text('Napovej, ali lahko naslednje oglišče povežemo z vrhom sklada, nato s korakanjem preveri.', 'Predict whether the next vertex can be joined to the stack, then step through and check.')},
            title: text('Triangulacija monotonega večkotnika', 'Triangulating a monotone polygon'),
            formula: String.raw`t=n-2`,
            paragraphs: [
                text('Cilj razdelka: monoton večkotnik razrežeš na trikotnike z enim prehodom od zgoraj navzdol. Oglišča kosa ležijo na dveh verigah, levi in desni, in jih obdelamo po padajoči koordinati \\(y\\). Hranimo en sklad oglišč, ki še čakajo na diagonale. Predpogoj sta razdelek Razdelitev na monotone večkotnike (kosi, diagonale) in razdelek o rezanju ušes (primerjava).', 'Learning outcome: you cut a monotone polygon into triangles in one pass from top to bottom. The vertices of a piece lie on two chains, a left one and a right one, and are handled by decreasing \\(y\\). We keep one stack of vertices that still wait for diagonals. The prerequisites are the section Partitioning into monotone polygons (pieces, diagonals) and the section on ear clipping (the comparison).'),
                text('Oglišče na verigi, ki je nasprotna vrhu sklada, povežemo z vsemi oglišči sklada. Oglišče na isti verigi povežemo z oglišči sklada, za katera je preizkus orientacije pozitiven. Kos z \\(n\\) oglišči dobi \\(n-2\\) trikotnikov. Zgled: šestkotnik \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) ima \\(t=6-2=4\\) trikotnike in \\(d=6-3=3\\) diagonale, od katerih je ena iz razdelitve.', 'A vertex on the chain opposite to the top of the stack is joined to every vertex of the stack. A vertex on the same chain is joined to the stack vertices for which the orientation test is positive. A piece with \\(n\\) vertices gets \\(n-2\\) triangles. Example: the hexagon \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) has \\(t=6-2=4\\) triangles and \\(d=6-3=3\\) diagonals, one of which comes from the partition.'),
                text('Čas: po razvrstitvi oglišč po višini je en kos \\(O(n)\\), cela metoda z razdelitvijo \\(O(n\\log n)\\), rezanje ušes pa \\(O(n^2)\\). Lekcija na koncu primerja števili izračunov predikatov; majhen primer to ponazori, ne dokaže. Povezava na rezanje ušes v poglavju o triangulacijah je na vrhu poglavja.', 'Time: after sorting the vertices by height one piece takes \\(O(n)\\), the whole method with the partition \\(O(n\\log n)\\), while ear clipping takes \\(O(n^2)\\). At the end the lesson compares the two counts of predicate evaluations; a small example illustrates this, it does not prove it. The link to ear clipping in the chapter on triangulations is at the top of the chapter.'),
            ],
        }),
    ],
};
