import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {COMBINATORICS_CHAPTER_ID, combinatoricsGuidedExampleDemonstrations, type CombinatoricsSectionId} from './combinatoricsChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: CombinatoricsSectionId) => `${COMBINATORICS_CHAPTER_ID}.${sectionId}.${combinatoricsGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: CombinatoricsSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two sections CB1 (lattice paths and Pascal's triangle) and CB2 (the product rule, the counting tree,
 * permutations, variations and combinations), each with a bilingual intro and its example at the end. The sections of CB3 to CB6 (the addition rule, the
 * binomial theorem, Pascal's identity and the multinomial coefficients) join in tasks 05 and 06. The chapter closes the functions strand just before
 * probability, whose binomial distribution is the follow-up of this chapter's binomial coefficients.
 */
export const combinatoricsChapter: FamilyChapter = {
    id: COMBINATORICS_CHAPTER_ID,
    family: 'combinatorics',
    title: text('Kombinatorika in Pascalov trikotnik', 'Combinatorics and Pascal\'s triangle'),
    purpose: text(
        'Kombinatorika šteje, na koliko načinov lahko kaj izberemo ali razporedimo, in ne našteva vseh možnosti ročno. Poglavje začne s sprehodi po mreži, ki gredo samo desno in gor: njihovo število je binomski simbol, števila v točkah mreže pa zapišejo Pascalov trikotnik. Nato isti simbol izpeljemo še s štetjem izbir, z drevesom, s permutacijami, variacijami in kombinacijami. Slika je vedno primer, izreki pa dobijo argument v besedilu.',
        'Combinatorics counts the ways to choose or arrange something without listing every possibility by hand. The chapter starts with walks on a grid that go only right and up: their number is a binomial coefficient, and the numbers at the grid points write Pascal\'s triangle. Then the same coefficient is derived again by counting choices, with the tree, and with permutations, variations and combinations. The picture is always one example, and the theorems get their argument in the text.',
    ),
    prerequisites: text(
        'Računanje z naravnimi števili in zapis \\(n!=n\\cdot(n-1)\\cdots2\\cdot1\\). Bernsteinove uteži in binomski izrek iz poglavja Osnove ter binomska porazdelitev iz poglavja o verjetnosti sta nadaljevanje, ne predznanje: tu ju ne ponavljamo, le povezujemo.',
        'Arithmetic with natural numbers and the notation \\(n!=n\\cdot(n-1)\\cdots2\\cdot1\\). The Bernstein weights and the binomial theorem in the Foundations chapter and the binomial distribution in the probability chapter are a continuation, not a prerequisite: this chapter links to them and does not repeat them.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/foundations#why-weights', title: text('Osnove: zakaj uteži (Bernsteinove uteži in binomski simbol)', 'Foundations: why weights (Bernstein weights and the binomial coefficient)')},
        {path: '/bezeg-2.0/learn/probability#binomial-normal', title: text('Verjetnost: binomska porazdelitev in normalni približek', 'Probability: the binomial distribution and the normal approximation')},
    ],
    sections: [
        withExample('lattice-paths-and-pascal', {
            id: 'lattice-paths-and-pascal',
            demonstrationIds: ['lattice-paths'],
            investigationPrompts: {'lattice-paths': text('Napovej število poti do izbranega cilja, preberi seznam poti in odčitek, nato povleci cilj in preveri, da je število poti simetrično, ko zamenjaš \\(a\\) in \\(b\\). Preklopi na Pascalov trikotnik in poišči kvadrat, v katerem število poti ni vsota levega in spodnjega soseda; tak ne obstaja.', 'Predict the number of routes to a chosen target, read the list of routes and the readout, then drag the target and check that the number of routes stays the same when \\(a\\) and \\(b\\) are swapped. Switch to Pascal\'s triangle and look for a point whose number is not the sum of its left and lower neighbours; there is none.')},
            title: text('Poti po mreži in Pascalov trikotnik', 'Lattice paths and Pascal\'s triangle'),
            formula: String.raw`N(a,b)=\binom{a+b}{a},\qquad N(a,b)=N(a-1,b)+N(a,b-1)`,
            paragraphs: [
                text('Cilj razdelka: prešteti sprehode po mreži od \\((0,0)\\) do \\((a,b)\\), v katerih je vsak korak za eno polje desno ali gor, in iz števil v točkah mreže prebrati Pascalov trikotnik. Definicija: pot je zaporedje \\(a\\) korakov desno in \\(b\\) korakov gor v poljubnem vrstnem redu; \\(N(a,b)\\) je število različnih poti. Preden graf pokaže število, ga napovej in preveri s seznamom poti.', 'Goal of this section: count the walks on a grid from \\((0,0)\\) to \\((a,b)\\) in which every step goes one cell right or up, and read Pascal\'s triangle from the numbers at the grid points. Definition: a route is a sequence of \\(a\\) steps right and \\(b\\) steps up in any order, and \\(N(a,b)\\) is the number of different routes. Before the graph shows the number, predict it and check it against the list of routes.'),
                text('Izrek: \\(N(a,b)=\\binom{a+b}{a}\\). Argument: pot ima \\(a+b\\) korakov in je natanko določena s tem, katerih \\(a\\) od teh korakov gre desno; preostali gredo gor. Poti je torej toliko, na kolikor načinov izberemo \\(a\\) mest izmed \\(a+b\\) mest, to je \\(\\binom{a+b}{a}\\), in zaradi simetrije izbire je \\(\\binom{a+b}{a}=\\binom{a+b}{b}\\). Zgled: do \\((2,2)\\) vodi \\(\\binom42=6\\) poti, do \\((5,3)\\) pa \\(\\binom{8}{3}=\\tfrac{8\\cdot7\\cdot6}{3\\cdot2\\cdot1}=56\\).', 'Theorem: \\(N(a,b)=\\binom{a+b}{a}\\). Argument: a route has \\(a+b\\) steps and is determined exactly by which \\(a\\) of those steps go right; the others go up. So the number of routes equals the number of ways to choose \\(a\\) places out of \\(a+b\\) places, that is \\(\\binom{a+b}{a}\\), and by the symmetry of choosing, \\(\\binom{a+b}{a}=\\binom{a+b}{b}\\). Example: \\(\\binom42=6\\) routes lead to \\((2,2)\\), and \\(\\binom{8}{3}=\\tfrac{8\\cdot7\\cdot6}{3\\cdot2\\cdot1}=56\\) to \\((5,3)\\).'),
                text('Števila poti v točkah mreže se ujemajo s pravilom seštevanja \\(N(a,b)=N(a-1,b)+N(a,b-1)\\) za \\(a,b\\ge1\\): zadnji korak poti je prišel z leve ali od spodaj. Ko števila na diagonalah \\(a+b=\\text{const}\\) preberemo po vrsti, dobimo vrstice Pascalovega trikotnika \\(1,1\\), \\(1,2,1\\), \\(1,3,3,1\\). Slika je ponazoritev pravila; njegov argument in dokaz binomskega izreka sta tema poznejših lekcij poglavja, ne tega razdelka.', 'The numbers of routes at the grid points agree with the addition rule \\(N(a,b)=N(a-1,b)+N(a,b-1)\\) for \\(a,b\\ge1\\): the last step of a route came from the left or from below. Reading the numbers along the diagonals \\(a+b=\\text{const}\\) in order gives the rows of Pascal\'s triangle \\(1,1\\), \\(1,2,1\\), \\(1,3,3,1\\). The picture illustrates the rule; its argument and the proof of the binomial theorem are the topic of later lessons of the chapter, not of this section.'),
                text('Meje: če je \\(a=0\\) ali \\(b=0\\), je pot ena. Pri več kot \\(12\\) korakih poti niso več narisane ali naštete, graf pa še vedno pove natančno število, ki ga izračuna z natančnimi celimi števili; pri \\((20,20)\\) je to \\(137\\,846\\,528\\,820\\). Binomske koeficiente iz Bernsteinovih uteži v poglavju Osnove tu ne ponavljamo; ta razdelek jih le poveže s štetjem poti.', 'Limits: if \\(a=0\\) or \\(b=0\\) there is exactly one route. Above \\(12\\) steps the routes are no longer drawn or listed, but the graph still gives the exact number, computed with exact integers; at \\((20,20)\\) it is \\(137\\,846\\,528\\,820\\). The binomial coefficients behind the Bernstein weights in the Foundations chapter are not repeated here; this section only connects them to the counting of routes.'),
            ],
        }),
        withExample('counting-and-choices', {
            id: 'counting-and-choices',
            demonstrationIds: ['counting-tree'],
            investigationPrompts: {'counting-tree': text('Spreminjaj \\(n\\) in \\(k\\) ter stikali za vrstni red in ponavljanje. Pri vsaki od štirih kombinacij napovej število izbir, preden ga prebereš, in preveri, da je pri neurejeni izbiri brez ponavljanja število izbir enako \\(V/k!\\).', 'Change \\(n\\) and \\(k\\) and the switches for order and repetition. For each of the four combinations predict the number of choices before reading it, and check that for unordered choices without repetition the number equals \\(V/k!\\).')},
            title: text('Štetje izbir: drevo, permutacije, variacije in kombinacije', 'Counting choices: tree, permutations, variations and combinations'),
            formula: String.raw`V_n^k=\frac{n!}{(n-k)!},\qquad \binom nk=\frac{V_n^k}{k!}`,
            paragraphs: [
                text('Cilj razdelka: prešteti izbire \\(k\\) predmetov izmed \\(n\\) in ločiti štiri primere glede na to, ali vrstni red šteje in ali se predmeti smejo ponavljati. Osnovni izrek kombinatorike: če prvi izbor poteka na \\(m_1\\) načinov in za vsak izbor prvega drugi na \\(m_2\\) načinov, je skupaj \\(m_1m_2\\) izbir. Kombinatorično drevo to prikaže: vsak list je ena izbira, število listov pa je produkt števil vej po ravneh.', 'Goal of this section: count the choices of \\(k\\) items out of \\(n\\) and tell four cases apart by whether order matters and whether items may repeat. The product rule: if the first choice can be made in \\(m_1\\) ways and for each of them the second in \\(m_2\\) ways, there are \\(m_1m_2\\) choices in total. The counting tree shows it: every leaf is one choice, and the number of leaves is the product of the branch counts level by level.'),
                text('Definicije in izreki: permutacije \\(n\\) predmetov, urejene izbire vseh, jih je \\(n!\\). Variacije brez ponavljanja, urejene izbire \\(k\\) od \\(n\\), jih je \\(V_n^k=n(n-1)\\cdots(n-k+1)=\\tfrac{n!}{(n-k)!}\\), s ponavljanjem pa \\(n^k\\). Zgled: izbire treh od šestih po vrsti brez ponavljanja je \\(6\\cdot5\\cdot4=120\\), s ponavljanjem \\(6^3=216\\).', 'Definitions and theorems: the permutations of \\(n\\) items, the ordered choices of all of them, number \\(n!\\). The variations without repetition, the ordered choices of \\(k\\) out of \\(n\\), number \\(V_n^k=n(n-1)\\cdots(n-k+1)=\\tfrac{n!}{(n-k)!}\\), and with repetition \\(n^k\\). Example: choosing three of six items in order without repetition gives \\(6\\cdot5\\cdot4=120\\), with repetition \\(6^3=216\\).'),
                text('Kombinacije, neurejene izbire brez ponavljanja, imajo argument: vsako skupino \\(k\\) predmetov lahko uredimo na \\(k!\\) načinov, zato vsaka kombinacija da \\(k!\\) različnih variacij in je \\(\\binom nk=\\tfrac{V_n^k}{k!}\\). Zgled: \\(\\binom63=\\tfrac{120}{6}=20\\). Ta obrazec utemelji, zakaj je število poti po mreži iz prejšnjega razdelka res binomski simbol.', 'The combinations, the unordered choices without repetition, have an argument: every group of \\(k\\) items can be ordered in \\(k!\\) ways, so each combination gives \\(k!\\) different variations and \\(\\binom nk=\\tfrac{V_n^k}{k!}\\). Example: \\(\\binom63=\\tfrac{120}{6}=20\\). This formula justifies why the number of lattice routes in the previous section is a binomial coefficient.'),
                text('Razporeditve črk s ponavljanjem štejemo z deljenjem: če so v besedi enake črke, zamenjave med njimi ne dajo nove razporeditve, zato pri besedi z \\(11\\) črkami \\(11!\\) delimo s številom zamenjav vsake skupine enakih črk. Meje: drevo je narisano le do \\(64\\) listov, večji primeri imajo tabelo, števila pa ostanejo natančna. Binomsko porazdelitev, ki iz teh števil nastane v verjetnosti, poglavje le omeni in poveže.', 'Arrangements of letters with repetition are counted by division: when a word of \\(11\\) letters has equal letters, swapping them gives no new arrangement, so \\(11!\\) is divided by the number of swaps within each group of equal letters. Limits: the tree is drawn only up to \\(64\\) leaves, larger cases get a table, and the numbers stay exact. The binomial distribution that these numbers lead to in probability is only mentioned and linked here.'),
            ],
        }),
    ],
};
