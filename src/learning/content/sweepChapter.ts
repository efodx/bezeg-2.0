import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterFigure, FamilyChapterSection} from './familyChapters';
import {
    SWEEP_CHAPTER_ID, sweepGuidedExampleDemonstration, type SweepSectionId,
} from './sweepChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: SweepSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = sweepGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText, FamilyChapterFigure>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${SWEEP_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Batch S1 of the sweep spec: only the released lessons (C1 interval sweep, C2 segment intersections) are mentioned. */
export const sweepChapter: FamilyChapter = {
    id: SWEEP_CHAPTER_ID,
    family: 'computational-geometry',
    title: text('Algoritmi pometanja', 'Sweep-line algorithms'),
    purpose: text('Pometanje vprašanje o celotni ravnini razdeli na zaporedje majhnih korakov: premica potuje po ravnini, računalnik pa popravi svoje stanje le tam, kjer se kaj zgodi. Poglavje pokaže idejo na intervalih na premici in jo nato uporabi za iskanje vseh presečišč množice daljic.', 'Sweeping splits a question about the whole plane into a sequence of small steps: a line travels over the plane, and the computer updates its state only where something happens. The chapter shows the idea on intervals of a line and then uses it to find all intersection points of a set of segments.'),
    prerequisites: text('Za prvi razdelek zadošča branje števil na številski premici. Drugi razdelek uporablja orientacijo treh točk, opisano v poglavju o konveksnosti in ovojnicah.', 'The first section needs only reading numbers on a number line. The second section uses the orientation of three points, described in the chapter on convexity and hulls.'),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/convexity-hulls#orientation', title: text('Konveksnost in ovojnice: orientacija treh točk', 'Convexity and hulls: orientation of three points')}],
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
    ],
};
