import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {RECURSION_CHAPTER_ID, recursionGuidedExampleDemonstrations, type RecursionSectionId} from './recursionChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: RecursionSectionId) => `${RECURSION_CHAPTER_ID}.${sectionId}.${recursionGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: RecursionSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two sections of the lessons RG1 (arithmetic and geometric sequences) and RG3 (compound
 * interest), each with a bilingual intro and its example at the end. The cobweb, logistic and growth-model sections join in tasks 05 and 06.
 * The chapter sits in the functions strand directly after the analysis chapter, whose convergence section holds the sequence lessons.
 */
export const recursionChapter: FamilyChapter = {
    id: RECURSION_CHAPTER_ID,
    family: 'analysis',
    title: text('Rekurzija in modeli rasti', 'Recursion and growth models'),
    purpose: text(
        'Veliko pojavov opišemo s pravilom, ki iz enega člena naredi naslednjega: dodamo isto število ali pomnožimo z istim številom. Takšno pravilo imenujemo rekurzivna formula, zaporedje, ki iz nje nastane, pa je aritmetično ali geometrijsko. Poglavje vpraša, kaj lahko o členu in vsoti povemo, ne da bi izračunali vse prejšnje člene, in kako se to uporabi pri obrestih: navadno obrestovanje raste kot aritmetično zaporedje, obrestno obrestovanje pa kot geometrijsko. Graf izračuna člene, vsote in vrednosti kapitala, zaprte oblike pa poglavje utemeljuje.',
        'Many phenomena are described by a rule that makes the next term out of the previous one: add the same number or multiply by the same number. Such a rule is called a recursive formula, and the sequence it produces is arithmetic or geometric. The chapter asks what we can say about a term and a sum without computing all the earlier terms, and how this applies to interest: simple interest grows like an arithmetic sequence and compound interest like a geometric one. The graph computes the terms, the sums and the values of the capital, and the chapter justifies the closed forms.',
    ),
    prerequisites: text(
        'Zaporedje kot funkcija naravnih števil, potence z naravnimi eksponenti in odstotni račun. Poznati moraš tudi pojem limite zaporedja, kolikor ga uvaja poglavje o analizi, in eksponentno funkcijo \\(a^x\\); obe sta tu le vir slike, ne pa predpogoj za račune.',
        'A sequence as a function of the natural numbers, powers with natural exponents and percentages. You should also know the idea of the limit of a sequence as introduced in the analysis chapter, and the exponential function \\(a^x\\); both only supply the picture here and are not required for the calculations.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/analysis#convergence', title: text('Analiza: zaporedja in konvergenca', 'Analysis: sequences and convergence')},
        {path: '/bezeg-2.0/learn/functions-and-calculus#function-rules', title: text('Funkcije in račun: eksponentna funkcija', 'Functions and calculus: the exponential function')},
    ],
    sections: [
        withExample('sequences', {
            id: 'sequences',
            demonstrationIds: ['recursion-growth'],
            investigationPrompts: {'recursion-growth': text('Nastavi aritmetično zaporedje s prvim členom \\(3\\) in razliko \\(2\\), napovej deseti člen in vsoto prvih desetih členov ter ju primerjaj z odčitkom. Nato preklopi na geometrijsko zaporedje s količnikom \\(2\\) in poišči \\(n\\), pri katerem vsota prvič preseže \\(1000\\). Nazadnje nastavi količnik \\(\\tfrac12\\) in napovej, h kateri vrednosti se približuje vsota.', 'Set an arithmetic sequence with first term \\(3\\) and difference \\(2\\), predict the tenth term and the sum of the first ten terms, and compare them with the readout. Then switch to the geometric sequence with ratio \\(2\\) and find the \\(n\\) at which the sum first exceeds \\(1000\\). Finally set the ratio \\(\\tfrac12\\) and predict the value that the sum approaches.')},
            title: text('Aritmetično in geometrijsko zaporedje', 'Arithmetic and geometric sequences'),
            formula: String.raw`a_n=a_1+(n-1)d,\qquad a_n=a_1q^{\,n-1},\qquad S_n=a_1\,\frac{q^n-1}{q-1}`,
            paragraphs: [
                text('Cilj razdelka: izračunati poljuben člen in vsoto zaporedja iz začetnih podatkov. Definicija: zaporedje je aritmetično, če je razlika zaporednih členov stalna in enaka \\(d\\); geometrijsko je, če je njun količnik stalen in enak \\(q\\). Rekurzivna formula \\(a_{n+1}=a_n+d\\) oziroma \\(a_{n+1}=q\\,a_n\\) pove, kako iz člena dobimo naslednjega, zaprta oblika pa pove \\(n\\)-ti člen neposredno.', 'Goal of this section: compute any term and the sum of a sequence from the initial data. Definition: a sequence is arithmetic if the difference of consecutive terms is constant and equal to \\(d\\); it is geometric if their ratio is constant and equal to \\(q\\). The recursive formula \\(a_{n+1}=a_n+d\\) or \\(a_{n+1}=q\\,a_n\\) tells how to get the next term from a term, and the closed form gives the \\(n\\)-th term directly.'),
                text('Argument: do \\(n\\)-tega člena pridemo z \\(n-1\\) koraki, zato prištejemo \\(d\\) natanko \\((n-1)\\)-krat oziroma pomnožimo s \\(q\\) natanko \\((n-1)\\)-krat. Aritmetično vsoto dobimo z Gaussovim trikom: vsoto zapišemo naprej in nazaj, pari členov imajo enako vsoto \\(a_1+a_n\\), zato je \\(S_n=\\tfrac{n(a_1+a_n)}{2}\\). Pri geometrijski vsoti od \\(S_n\\) odštejemo \\(qS_n\\), vsi členi razen prvega in zadnjega se odštejejo.', 'Argument: the \\(n\\)-th term takes \\(n-1\\) steps, so we add \\(d\\) exactly \\((n-1)\\) times or multiply by \\(q\\) exactly \\((n-1)\\) times. The arithmetic sum comes from Gauss\'s trick: write the sum forwards and backwards, every pair of terms has the sum \\(a_1+a_n\\), so \\(S_n=\\tfrac{n(a_1+a_n)}{2}\\). For the geometric sum subtract \\(qS_n\\) from \\(S_n\\), and all terms except the first and the last cancel.'),
                text('Zgled: pri \\(a_1=3\\) in \\(d=2\\) je \\(a_{10}=3+9\\cdot 2=21\\) in \\(S_{10}=\\tfrac{10\\cdot 24}{2}=120\\). Pri \\(a_1=3\\) in \\(q=2\\) je \\(a_{10}=3\\cdot 2^9=1536\\) in \\(S_{10}=3069\\); geometrijsko zaporedje hitro prehiti aritmetično. Pri \\(q=\\tfrac12\\) se členi manjšajo, vsota pa se približuje številu \\(\\tfrac{a_1}{1-q}=6\\), ki je limita vsote.', 'Example: for \\(a_1=3\\) and \\(d=2\\) we get \\(a_{10}=3+9\\cdot 2=21\\) and \\(S_{10}=\\tfrac{10\\cdot 24}{2}=120\\). For \\(a_1=3\\) and \\(q=2\\) we get \\(a_{10}=3\\cdot 2^9=1536\\) and \\(S_{10}=3069\\); the geometric sequence quickly overtakes the arithmetic one. For \\(q=\\tfrac12\\) the terms shrink and the sum approaches the number \\(\\tfrac{a_1}{1-q}=6\\), the limit of the sum.'),
                text('Meje: obrazec za vsoto velja za \\(q\\ne 1\\); pri \\(q=1\\) so vsi členi enaki in je \\(S_n=na_1\\). Limita vsote obstaja samo za \\(|q|<1\\); pri \\(|q|\\ge 1\\) vsota ne ostane omejena ali ne konvergira. Graf prikaže končno mnogo členov, zato limite ne preberemo z njega, ampak jo izračunamo iz zaprte oblike.', 'Limits: the formula for the sum holds for \\(q\\ne 1\\); for \\(q=1\\) all terms are equal and \\(S_n=na_1\\). The limit of the sum exists only for \\(|q|<1\\); for \\(|q|\\ge 1\\) the sum does not stay bounded or does not converge. The graph shows finitely many terms, so we do not read the limit from it but compute it from the closed form.'),
            ],
        }),
        withExample('compound-interest', {
            id: 'compound-interest',
            demonstrationIds: ['recursion-growth'],
            investigationPrompts: {'recursion-growth': text('Odpri ploščo obresti s kapitalom \\(1000\\) in obrestno mero \\(5\\,\\%\\). Napovej vrednost po desetih letih pri navadnem in pri obrestnem obrestovanju ter ju preveri. Nato povečuj število obdobij v letu in opazuj, ali se vrednost približuje meji. Nazadnje poišči čas podvojitve in ga primerjaj s pravilom \\(72\\).', 'Open the interest panel with the capital \\(1000\\) and the interest rate \\(5\\,\\%\\). Predict the value after ten years for simple and for compound interest and check it. Then increase the number of periods per year and observe whether the value approaches a limit. Finally find the doubling time and compare it with the rule of \\(72\\).')},
            title: text('Obrestno obrestovanje', 'Compound interest'),
            formula: String.raw`K_t=K_0\Bigl(1+\frac{p}{m}\Bigr)^{mt}\ \longrightarrow\ K_0\,e^{pt}\quad(m\to\infty)`,
            paragraphs: [
                text('Cilj razdelka: razumeti, zakaj obresti na obresti vodijo v geometrijsko rast, in izračunati vrednost kapitala. Definicija: pri navadnem obrestovanju se obresti vedno računajo od začetnega kapitala \\(K_0\\), pri obrestnem obrestovanju pa od trenutne vrednosti, zato se vsako obdobje vrednost pomnoži z istim faktorjem. Obrestna mera \\(p\\) je letna, \\(m\\) je število obdobij v letu, \\(t\\) pa čas v letih.', 'Goal of this section: understand why interest on interest leads to geometric growth, and compute the value of the capital. Definition: with simple interest the interest is always computed from the initial capital \\(K_0\\), with compound interest from the current value, so in every period the value is multiplied by the same factor. The interest rate \\(p\\) is annual, \\(m\\) is the number of periods per year and \\(t\\) is the time in years.'),
                text('Argument: relativna obrestna mera za eno obdobje je \\(\\tfrac{p}{m}\\), zato je faktor obdobja \\(1+\\tfrac{p}{m}\\) in po \\(mt\\) obdobjih dobimo zgornji obrazec, kar je geometrijsko zaporedje s količnikom \\(1+\\tfrac{p}{m}\\). Konformna obrestna mera je tista, pri kateri je letni faktor enak, kot če bi obrestovali enkrat letno. Ko \\(m\\) raste, se vrednost približuje meji \\(K_0e^{pt}\\); to je zvezno obrestovanje in tu nastopi Eulerjevo število \\(e\\).', 'Argument: the relative interest rate for one period is \\(\\tfrac{p}{m}\\), so the factor of a period is \\(1+\\tfrac{p}{m}\\) and after \\(mt\\) periods we get the formula above, a geometric sequence with the ratio \\(1+\\tfrac{p}{m}\\). The conformal interest rate is the one for which the annual factor equals that of compounding once a year. As \\(m\\) grows, the value approaches the limit \\(K_0e^{pt}\\); this is continuous compounding, and this is where Euler\'s number \\(e\\) enters.'),
                text('Zgled: pri \\(K_0=1000\\), \\(p=5\\,\\%\\) in \\(t=10\\) letih je navadna vrednost \\(1500\\), pri letnem obrestnem obrestovanju \\(1628{,}89\\), pri mesečnem \\(1647{,}01\\) in pri zveznem \\(1648{,}72\\). Čas podvojitve je okoli \\(14{,}2\\) leta, pravilo \\(72\\) pa ga oceni kot \\(\\tfrac{72}{5}=14{,}4\\) leta.', 'Example: for \\(K_0=1000\\), \\(p=5\\,\\%\\) and \\(t=10\\) years the simple value is \\(1500\\), with yearly compounding \\(1628.89\\), with monthly compounding \\(1647.01\\) and with continuous compounding \\(1648.72\\). The doubling time is about \\(14.2\\) years, and the rule of \\(72\\) estimates it as \\(\\tfrac{72}{5}=14.4\\) years.'),
                text('Meje: pogostejše obrestovanje vrednost poveča le malo, saj ima navzgor mejo \\(K_0e^{pt}\\). Pravilo \\(72\\) je približek, ki je dober pri majhnih obrestnih merah. Model ne upošteva davkov, stroškov in spreminjajoče se obrestne mere, zato je poučna poenostavitev, ne napoved konkretnega varčevanja.', 'Limits: more frequent compounding increases the value only slightly, since it has the upper bound \\(K_0e^{pt}\\). The rule of \\(72\\) is an approximation that is good for small interest rates. The model ignores taxes, fees and a changing interest rate, so it is an instructive simplification and not a forecast of real savings.'),
            ],
        }),
    ],
};
