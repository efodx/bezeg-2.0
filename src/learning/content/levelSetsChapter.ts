import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {LEVEL_SETS_CHAPTER_ID, levelSetsGuidedExampleDemonstrations, type LevelSetsSectionId} from './levelSetsChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: LevelSetsSectionId) => `${LEVEL_SETS_CHAPTER_ID}.${sectionId}.${levelSetsGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: LevelSetsSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the single section of the lesson LS5 (linear programming), with a bilingual intro and its
 * example at the end. The contour-map sections (level curves, the gradient, gradient descent, constrained extrema) join in tasks 07 and 08.
 * The chapter sits in the functions strand directly after numerical methods, whose root finding gradient descent and constrained
 * optimization follow, and before the Fourier series chapter.
 */
export const levelSetsChapter: FamilyChapter = {
    id: LEVEL_SETS_CHAPTER_ID,
    family: 'analysis',
    title: text('Nivojnice, gradient in optimizacija', 'Level sets, gradient and optimization'),
    purpose: text(
        'Funkcija dveh spremenljivk ima nivojnice: množice točk, v katerih ima enako vrednost. Če jih narišemo za več vrednosti, dobimo zemljevid nivojnic, iz katerega preberemo, kje funkcija narašča, kje pada in kje doseže največjo ali najmanjšo vrednost. Poglavje zastavi vprašanje optimizacije: katera točka množice, ki jo določajo pogoji, ima največjo vrednost dane funkcije. Najpreprostejši primer je linearno programiranje, kjer so pogoji linearne neenačbe, funkcija pa linearna. Njene nivojnice so vzporedne premice, zato je zemljevid nivojnic kar snop vzporednic, ki drsijo čez dopustno območje. Največjo vrednost doseže zadnja vzporednica, ki območje še seka, in to je vedno v oglišču ali na celi stranici. Tako se vidi izrek, ki ga poglavje dokaže: največja vrednost linearne funkcije na konveksnem mnogokotniku je v oglišču. Dokaz je kratek račun s tehtanim povprečjem; premica, ki drsi, ga le ponazori. Kasnejši razdelki tega poglavja prenesejo isto sliko na splošne funkcije, kjer smer najhitrejšega naraščanja določi gradient, nivojnica pa je nanj pravokotna.',
        'A function of two variables has level sets: the sets of points where it takes the same value. If we draw them for several values we get a contour map, from which we read where the function grows, where it falls and where it reaches its largest or smallest value. The chapter poses the question of optimization: which point of a set given by constraints has the largest value of a given function. The simplest case is linear programming, where the constraints are linear inequalities and the function is linear. Its level sets are parallel lines, so the contour map is a pencil of parallels sliding across the feasible region. The largest value is reached by the last parallel that still meets the region, and that is always at a vertex or along a whole side. This is how the theorem of the chapter shows itself: the largest value of a linear function on a convex polygon is at a vertex. The proof is a short calculation with a weighted average; the sliding line only illustrates it. The later sections of the chapter carry the same picture over to general functions, where the gradient gives the direction of fastest growth and the level curve is perpendicular to it.',
    ),
    prerequisites: text(
        'Premica in njena enačba, polravnina, ki jo določa neenačba, in normalni vektor premice; pomaga skalarni produkt. Koeficienta \\(a\\) in \\(b\\) v enačbi \\(ax+by=c\\) sta komponenti normalnega vektorja, vrednost \\(c\\) pa določi, katera vzporednica je mišljena. Prav to uporabi poglavje: vrednost kriterijske funkcije je številka premice v snopu vzporednic.',
        'The line and its equation, the half-plane given by an inequality and the normal vector of a line; the dot product helps. The coefficients \\(a\\) and \\(b\\) in the equation \\(ax+by=c\\) are the components of the normal vector, and the value \\(c\\) chooses which parallel is meant. This is exactly what the chapter uses: the value of the objective function is the label of a line in the pencil of parallels.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/analytic-lines#normal-parallel-perpendicular', title: text('Analitična geometrija premice: normalni vektor, vzporednost in pravokotnost', 'Analytic geometry of lines: normal vector, parallel and perpendicular')},
    ],
    sections: [
        withExample('linear-programming', {
            id: 'linear-programming',
            demonstrationIds: ['linear-program'],
            investigationPrompts: {'linear-program': text('Pri začetnih pogojih \\(x+2y\\le8\\) in \\(3x+y\\le9\\) napovej oglišča dopustnega območja in oglišče, v katerem je \\(3x+2y\\) največ. Premakni premico cilja, dokler je ne ujameš v enem samem oglišču. Nato zamenjaj kriterijsko funkcijo z \\(x+2y\\) in poišči, kaj se zgodi, ko je premica cilja vzporedna stranici. Nazadnje pusti le pogoj \\(x-y\\le2\\), izberi \\(x+y\\) in preberi stanje grafa.', 'With the starting constraints \\(x+2y\\le8\\) and \\(3x+y\\le9\\) predict the vertices of the feasible region and the vertex where \\(3x+2y\\) is largest. Move the objective line until you catch it at a single vertex. Then change the objective function to \\(x+2y\\) and find what happens when the objective line is parallel to a side. Finally keep only the constraint \\(x-y\\le2\\), choose \\(x+y\\) and read the status of the graph.')},
            title: text('Linearno programiranje', 'Linear programming'),
            formula: String.raw`\max\,(px+qy),\qquad a_ix+b_iy\le c_i,\quad x\ge0,\ y\ge0`,
            paragraphs: [
                text('Cilj razdelka: poiskati največjo vrednost linearne funkcije na območju, ki ga določajo linearne neenačbe, in razložiti, zakaj jo je dovolj iskati med oglišči. Definicija: kriterijska funkcija (v šoli ji pravijo tudi ciljna funkcija) je \\(f(x,y)=px+qy\\). Vsak omejitveni pogoj \\(a_ix+b_iy\\le c_i\\) določa polravnino, njihov presek pa je dopustno območje. Presek polravnin je konveksen mnogokotnik, lahko pa je tudi prazen ali neomejen. Vrednost \\(f=k\\) je premica, ki je pravokotna na vektor \\((p;\\ q)\\); če \\(k\\) spreminjamo, se premica pomika vzporedno.', 'Goal of this section: find the largest value of a linear function on the region given by linear inequalities and explain why it is enough to look among the vertices. Definition: the objective function (called also the target function in school) is \\(f(x,y)=px+qy\\). Each constraint \\(a_ix+b_iy\\le c_i\\) defines a half-plane, and their intersection is the feasible region. The intersection of half-planes is a convex polygon, but it can also be empty or unbounded. The value \\(f=k\\) is a line perpendicular to the vector \\((p,\\ q)\\); when \\(k\\) changes, the line moves in parallel.'),
                text('Argument: na daljici med točkama \\(A\\) in \\(B\\) je \\(f\\) tehtano povprečje svojih vrednosti v krajiščih, zato leži med \\(f(A)\\) in \\(f(B)\\). Vsaka točka mnogokotnika je tehtano povprečje oglišč, zato je \\(f\\) tam največ tolikšna kot največja vrednost po ogliščih. Največjo vrednost torej poiščemo tako, da primerjamo vrednosti v ogliščih. Če imata dve sosednji oglišči isto največjo vrednost, jo ima cela stranica med njima. Premica cilja, ki se pomika, doseže zadnji stik z območjem v oglišču ali pa leži na stranici; to je ponazoritev, dokaz je račun s povprečjem.', 'Argument: on the segment between the points \\(A\\) and \\(B\\), \\(f\\) is a weighted average of its values at the endpoints, so it lies between \\(f(A)\\) and \\(f(B)\\). Every point of the polygon is a weighted average of the vertices, so \\(f\\) there is at most the largest value over the vertices. The largest value is therefore found by comparing the values at the vertices. If two neighbouring vertices have the same largest value, the whole side between them has it. The moving objective line makes its last contact with the region at a vertex or lies along a side; this is an illustration, and the proof is the calculation with the average.'),
                text('Zgled: pri pogojih \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x\\ge0\\), \\(y\\ge0\\) ima dopustno območje oglišča \\((0;\\ 0)\\), \\((3;\\ 0)\\), \\((2;\\ 3)\\) in \\((0;\\ 4)\\). Funkcija \\(3x+2y\\) ima v njih vrednosti \\(0\\), \\(9\\), \\(12\\) in \\(8\\), največ je torej \\(12\\) v oglišču \\((2;\\ 3)\\). Pri funkciji \\(x+2y\\) imata oglišči \\((2;\\ 3)\\) in \\((0;\\ 4)\\) isto vrednost \\(8\\), zato je optimalna cela daljica med njima.', 'Example: with the constraints \\(x+2y\\le8\\), \\(3x+y\\le9\\), \\(x\\ge0\\), \\(y\\ge0\\) the feasible region has the vertices \\((0,\\ 0)\\), \\((3,\\ 0)\\), \\((2,\\ 3)\\) and \\((0,\\ 4)\\). The function \\(3x+2y\\) takes the values \\(0\\), \\(9\\), \\(12\\) and \\(8\\) there, so the largest is \\(12\\) at the vertex \\((2,\\ 3)\\). For the function \\(x+2y\\) the vertices \\((2,\\ 3)\\) and \\((0,\\ 4)\\) have the same value \\(8\\), so the whole segment between them is optimal.'),
                text('Meje: argument s tehtanim povprečjem pokrije omejen mnogokotnik. Pri neomejenem območju največje vrednosti morda ni, graf takrat to sporoči kot stanje; če jo ima, je še vedno v oglišču. Če pogoji nimajo skupne točke, je območje prazno in optimuma ni. Pri izrojenem (degeneriranem) oglišču se v njem stika več kot dve robni premici, zato je nekaj pogojev odveč. Sprehod po ogliščih, ki ga graf riše, je le ponazoritev iskanja, ne postopek, ki bi ga dokazovali.', 'Limits: the weighted-average argument covers a bounded polygon. With an unbounded region the largest value may not exist, and the graph then reports this as a status; when it exists, it is still at a vertex. If the constraints have no common point the region is empty and there is no optimum. At a degenerate vertex more than two boundary lines meet, so some constraints are redundant. The walk along the vertices that the graph draws only illustrates the search; it is not a procedure that we prove.'),
            ],
        }),
    ],
};
