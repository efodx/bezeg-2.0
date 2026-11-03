import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    PROBABILITY_CHAPTER_ID, probabilityGuidedExampleDemonstration, type ProbabilitySectionId,
} from './probabilityChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: ProbabilitySectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = probabilityGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${PROBABILITY_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/**
 * Probability and statistics on the graph (spec P1 to P5 of probability-statistics-lessons.md): an opening section, then one section per
 * lesson, each ending with its example.
 */
export const probabilityChapter: FamilyChapter = {
    id: PROBABILITY_CHAPTER_ID,
    family: '/bezeg-2.0/probability',
    title: text('Verjetnost in statistika na grafu', 'Distributions, CLT and correlation'),
    purpose: text(
        'Verjetnost zvezne spremenljivke je ploščina pod gostoto, verjetnosti diskretne porazdelitve pa so višine stolpcev. Poglavje najprej bere ploščino pod normalno gostoto kot verjetnost in pokaže, da delež znotraj danega števila standardnih odklonov ni odvisen od povprečja in odklona, nato pa binomsko porazdelitev primerja z normalno krivuljo z istim povprečjem in odklonom, razloži popravek za zveznost in pokaže, kdaj je boljša limita Poissonova.',
        'The probability of a continuous variable is an area under a density, while the probabilities of a discrete distribution are bar heights. The chapter first reads the area under the normal density as a probability and shows that the share within a given number of standard deviations does not depend on the mean and the deviation; it then compares the binomial distribution with the normal curve of the same mean and deviation, explains the continuity correction and shows when the Poisson limit is the better one.',
    ),
    prerequisites: text(
        'Določeni integral kot ploščina pod grafom (poglavje Funkcije in račun) in za limitne trditve o približkih poglavje Analiza. Verjetnost poznaš le kot relativno frekvenco.',
        'The definite integral as an area under a graph (the Functions and calculus chapter) and, for the limit statements about approximations, the Analysis chapter. You only need probability as relative frequency.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/functions-and-calculus#integrals', title: text('Funkcije in račun: določeni integral', 'Functions and calculus: the definite integral')},
        {path: '/bezeg-2.0/learn/analysis', title: text('Analiza', 'Analysis')},
    ],
    sections: [
        {
            id: 'area-and-approximation',
            title: text('Ploščina pod gostoto in približek z zvezno krivuljo', 'Area under a density and approximation by a continuous curve'),
            paragraphs: [
                text('Cilj razdelka: znaš povedati, kaj poglavje združuje. Pri zvezni spremenljivki je verjetnost ploščina pod gostoto \\(f\\) med dvema mejama, celotna ploščina pa je \\(1\\); posamezna vrednost ima verjetnost \\(0\\). To je določeni integral, ki ga že poznaš, z drugim pomenom.',
                     'Goal of the section: you can say what the chapter ties together. For a continuous variable a probability is the area under a density \\(f\\) between two bounds, and the total area is \\(1\\); a single value has probability \\(0\\). This is the definite integral you already know, with a different meaning.'),
                text('Poglavje sledi tej niti: najprej ploščina pod normalno gostoto, nato diskretna binomska porazdelitev, ki jo za velik \\(n\\) nadomestimo z zvezno normalno krivuljo. Za tak približek je treba vedeti, kaj trdi in česa ne: trditev je limita, ne ocena napake za dani \\(n\\).',
                     'The chapter follows this thread: first the area under the normal density, then the discrete binomial distribution, which for large \\(n\\) is replaced by a continuous normal curve. Such an approximation requires knowing what it claims and what it does not: the statement is a limit, not an error estimate for a given \\(n\\).'),
                text('Vsak razdelek se konča s pripravljeno dejavnostjo na grafu: najprej napoveš rezultat, nato ga preveriš z vlečenjem mej ali s spreminjanjem parametrov. Številke v besedilu se ujemajo z odčitki na grafu, zato jih lahko tam tudi sam preveriš. Slike so ponazoritev: trditve o porazdelitvah so izreki, ne rezultat risanja.',
                     'Each section ends with a prepared activity on the graph: first you predict the result, then you check it by dragging bounds or changing parameters. The numbers in the text match the readouts on the graph, so you can check them there yourself. The pictures are an illustration: the statements about distributions are theorems, not the outcome of drawing.'),
            ],
        },
        withExample('density', {
            id: 'density',
            demonstrationIds: ['prob-density'],
            investigationPrompts: {'prob-density': text('Napovej, koliko ploščine leži znotraj enega standardnega odklona od povprečja, nato premakni meji in spremeni \\(\\mu\\) in \\(\\sigma\\), da vidiš, kaj se ne spremeni.', 'Predict how much area lies within one standard deviation of the mean, then drag the bounds and change \\(\\mu\\) and \\(\\sigma\\) to see what stays the same.')},
            title: text('Gostota in verjetnost kot ploščina', 'Density and probability as area'),
            formula: String.raw`P(a\le X\le b)=\int_a^b f(x)\,dx`,
            paragraphs: [
                text('Cilj razdelka: znaš prebrati verjetnost kot ploščino pod gostoto in povedati, kaj se ob spremembi \\(\\mu\\) in \\(\\sigma\\) ohrani. Za \\(X\\sim N(0;1)\\) je \\(P(-1\\le X\\le 1)=0{,}6827\\), za mejo dveh odklonov \\(0{,}9545\\) in za mejo treh \\(0{,}9973\\). To so lastnosti normalne porazdelitve; vleka mej je le ponazoritev.',
                     'Goal of the section: you can read a probability as an area under a density and say what is preserved when \\(\\mu\\) and \\(\\sigma\\) change. For \\(X\\sim N(0;1)\\) we have \\(P(-1\\le X\\le 1)=0.6827\\), for two deviations \\(0.9545\\) and for three \\(0.9973\\). These are properties of the normal distribution; dragging the bounds is only an illustration.'),
                text('Povprečje \\(\\mu\\) krivuljo premakne, odklon \\(\\sigma\\) jo razširi ali zoži, delež znotraj \\(\\mu\\pm k\\sigma\\) pa ostane enak. Za \\(N(100;15^2)\\) je \\(P(85\\le X\\le 130)=\\Phi(2)-\\Phi(-1)=0{,}81859\\). Ploščina pod gostoto nikoli ni verjetnost točke: za zvezno spremenljivko je \\(P(X=a)=0\\).',
                     'The mean \\(\\mu\\) moves the curve, the deviation \\(\\sigma\\) widens or narrows it, but the share within \\(\\mu\\pm k\\sigma\\) stays the same. For \\(N(100;15^2)\\) we have \\(P(85\\le X\\le 130)=\\Phi(2)-\\Phi(-1)=0.81859\\). The area under a density is never the probability of a point: for a continuous variable \\(P(X=a)=0\\).'),
            ],
        }),
        withExample('binomial-normal', {
            id: 'binomial-normal',
            demonstrationIds: ['prob-binomial-normal'],
            investigationPrompts: {'prob-binomial-normal': text('Napovej \\(P(X\\le 8)\\) za \\(B(20;\\tfrac12)\\), nato primerjaj natančno vsoto z normalnim približkom s popravkom in brez njega ter povečaj \\(n\\).', 'Predict \\(P(X\\le 8)\\) for \\(B(20;\\tfrac12)\\), then compare the exact sum with the normal approximation with and without the correction, and increase \\(n\\).')},
            title: text('Od binomske k normalni porazdelitvi', 'From binomial to normal'),
            formula: String.raw`P(X\le k)\approx\Phi\!\left(\frac{k+\tfrac12-np}{\sqrt{np(1-p)}}\right)`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, kaj trdi približek binomske porazdelitve z normalno in zakaj je popravek za zveznost potreben. Izrek de Moivra in Laplacea (poseben primer centralnega limitnega izreka) pravi: če je \\(X_n\\sim B(n;p)\\) in \\(Z_n=\\dfrac{X_n-np}{\\sqrt{np(1-p)}}\\), potem za vsak \\(x\\) velja \\(P(Z_n\\le x)\\to\\Phi(x)\\), ko gre \\(n\\to\\infty\\). To je limitna trditev; hitrosti konvergence ne podaja.',
                     'Goal of the section: you can say what the approximation of the binomial distribution by the normal one claims and why the continuity correction is needed. The de Moivre-Laplace theorem (a special case of the central limit theorem) states: if \\(X_n\\sim B(n;p)\\) and \\(Z_n=\\dfrac{X_n-np}{\\sqrt{np(1-p)}}\\), then \\(P(Z_n\\le x)\\to\\Phi(x)\\) for every \\(x\\) as \\(n\\to\\infty\\). This is a limit statement; it gives no rate of convergence.'),
                text('Za \\(B(20;\\tfrac12)\\) je natančno \\(P(X\\le 8)=0{,}25172\\). Normalni približek s popravkom, \\(\\Phi\\!\\big(\\tfrac{8{,}5-10}{\\sqrt5}\\big)=0{,}25117\\), je zelo blizu, brez popravka, \\(\\Phi\\!\\big(\\tfrac{8-10}{\\sqrt5}\\big)=0{,}18555\\), pa precej mimo. Stolpec pri \\(8\\) pokriva interval \\([7{,}5;\\,8{,}5]\\), zato mejo premaknemo za \\(\\tfrac12\\). Pri šolskih vrednostih \\(n\\) popravek ni neobvezen.',
                     'For \\(B(20;\\tfrac12)\\) the exact value is \\(P(X\\le 8)=0.25172\\). The normal approximation with the correction, \\(\\Phi\\!\\big(\\tfrac{8.5-10}{\\sqrt5}\\big)=0.25117\\), is very close, while without it, \\(\\Phi\\!\\big(\\tfrac{8-10}{\\sqrt5}\\big)=0.18555\\), it is well off. The bar at \\(8\\) covers the interval \\([7.5;\\,8.5]\\), so the bound moves by \\(\\tfrac12\\). At classroom values of \\(n\\) the correction is not optional.'),
                text('Za majhen \\(p\\) in velik \\(n\\) z zmernim \\(np\\) je boljša limita Poissonova porazdelitev z \\(\\lambda=np\\): za \\(B(100;0{,}02)\\) je natančno \\(P(X\\le 2)=0{,}67669\\), za Poissonovo porazdelitev z \\(\\lambda=2\\) pa \\(0{,}67668\\). Prikazane napake veljajo samo za izbrane \\(n\\), \\(p\\) in \\(k\\).',
                     'For small \\(p\\) and large \\(n\\) with moderate \\(np\\) the better limit is the Poisson distribution with \\(\\lambda=np\\): for \\(B(100;0.02)\\) the exact value is \\(P(X\\le 2)=0.67669\\), and for the Poisson distribution with \\(\\lambda=2\\) it is \\(0.67668\\). The errors shown hold only for the chosen \\(n\\), \\(p\\) and \\(k\\).'),
            ],
        }),
        withExample('clt', {
            id: 'clt',
            demonstrationIds: ['prob-clt'],
            investigationPrompts: {'prob-clt': text('Napovej obliko vsote dveh enakomernih spremenljivk, nato dodajaj kopije in primerjaj razdaljo \\(K_n\\) za enakomerno in poševno osnovno gostoto.', 'Predict the shape of the sum of two uniform variables, then add copies and compare the distance \\(K_n\\) for the uniform and the skewed base density.')},
            title: text('Centralni limitni izrek', 'The central limit theorem'),
            formula: String.raw`Z_n=\frac{S_n-n\mu}{\sigma\sqrt n},\qquad K_n=\sup_x\left|F_{Z_n}(x)-\Phi(x)\right|\to0`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati centralni limitni izrek in opisati, kaj graf kaže. Če so \\(X_1,X_2,\\dots\\) neodvisne, enako porazdeljene in imajo končno varianco \\(\\sigma^2\\), se vsota \\(S_n=X_1+\\dots+X_n\\), standardizirana kot \\(Z_n=\\dfrac{S_n-n\\mu}{\\sigma\\sqrt n}\\), v porazdelitvi približuje standardni normalni porazdelitvi. Gostota vsote je \\(n\\)-kratna konvolucija osnovne gostote. Viri: FMF, Verjetnost in Statistika.',
                     'Goal of the section: you can state the central limit theorem and describe what the graph shows. If \\(X_1,X_2,\\dots\\) are independent, identically distributed and have finite variance \\(\\sigma^2\\), the sum \\(S_n=X_1+\\dots+X_n\\), standardized as \\(Z_n=\\dfrac{S_n-n\\mu}{\\sigma\\sqrt n}\\), approaches the standard normal distribution in distribution. The density of the sum is the \\(n\\)-fold convolution of the base density. Sources: FMF, Verjetnost and Statistika.'),
                text('Enakomerna gostota na \\([0,1]\\) ima \\(\\mu=\\tfrac12\\) in \\(\\sigma^2=\\tfrac1{12}\\); vsota dveh kopij je trikotna, pri \\(n=10\\) pa je Kolmogorova razdalja \\(K_{10}=0{,}00281\\). Poševna gostota \\(2(1-x)\\) ima \\(\\mu=\\tfrac13\\), \\(\\sigma^2=\\tfrac1{18}\\) in pri \\(n=10\\) še \\(K_{10}=0{,}01248\\): poševnost približevanje upočasni.',
                     'The uniform density on \\([0,1]\\) has \\(\\mu=\\tfrac12\\) and \\(\\sigma^2=\\tfrac1{12}\\); the sum of two copies is triangular, and at \\(n=10\\) the Kolmogorov distance is \\(K_{10}=0.00281\\). The skewed density \\(2(1-x)\\) has \\(\\mu=\\tfrac13\\), \\(\\sigma^2=\\tfrac1{18}\\) and at \\(n=10\\) still \\(K_{10}=0.01248\\): skewness slows the approach.'),
                text('Konvergenca je v porazdelitvi: izrek ne pove hitrosti, hitrost ocenjuje Berry–Esseenov izrek, ki ga tu samo navajamo. Ujemanje pri enem \\(n\\) ni hitrost, razdalja \\(K_n\\) na grafu pa velja le za izbrano obliko in izbrani \\(n\\). Slika ponazarja izrek, ne dokazuje ga.',
                     'The convergence is in distribution: the theorem gives no rate, a rate is estimated by the Berry–Esseen theorem, which is only cited here. A match at one \\(n\\) is not a rate, and the distance \\(K_n\\) on the graph holds only for the chosen shape and the chosen \\(n\\). The picture illustrates the theorem, it does not prove it.'),
            ],
        }),
        withExample('summary', {
            id: 'summary',
            demonstrationIds: ['prob-summary'],
            investigationPrompts: {'prob-summary': text('Napovej, kaj se zgodi s povprečjem in z mediano, ko največjo vrednost premakneš daleč v desno, nato preveri na grafu in primerjaj obe pravili za kvartile.', 'Predict what happens to the mean and the median when the largest value moves far to the right, then check on the graph and compare the two quartile rules.')},
            title: text('Aritmetična sredina, mediana in standardni odklon', 'Mean, median and standard deviation'),
            formula: String.raw`\bar x=\frac1n\sum_{i=1}^n x_i,\qquad \sigma=\sqrt{\frac1n\sum_{i=1}^n(x_i-\bar x)^2},\qquad x>Q_3+\tfrac32\,\mathrm{IQR}`,
            paragraphs: [
                text('Cilj razdelka: znaš izračunati aritmetično sredino, mediano in standardni odklon in prebrati škatlo z brki. Za podatke \\(\\{4,5,5,6,6,7,8\\}\\) je \\(\\bar x=5{,}857143\\), mediana \\(6\\) in populacijski \\(\\sigma=1{,}2454\\) (vzorčni \\(s=1{,}3452\\)). Sredina je najmanjša vsota kvadratov odmikov: \\(\\sum(x_i-c)^2\\) je \\(10{,}857\\) pri sredini in \\(11\\) pri mediani; mediana je najmanjša vsota absolutnih odmikov: \\(7\\) pri mediani in \\(7{,}143\\) pri sredini.',
                     'Goal of the section: you can compute the mean, the median and the standard deviation and read a box plot. For the data \\(\\{4,5,5,6,6,7,8\\}\\) the mean is \\(\\bar x=5.857143\\), the median \\(6\\) and the population \\(\\sigma=1.2454\\) (sample \\(s=1.3452\\)). The mean minimizes the sum of squared deviations: \\(\\sum(x_i-c)^2\\) is \\(10.857\\) at the mean and \\(11\\) at the median; the median minimizes the sum of absolute deviations: \\(7\\) at the median and \\(7.143\\) at the mean.'),
                text('Če vrednost \\(8\\) premakneš na \\(30\\), se sredina premakne na \\(9\\), mediana ostane \\(6\\), \\(\\sigma\\) pa zraste na \\(8{,}6189\\). Kvartila po šolskem pravilu (polovici z mediano) sta \\(Q_1=5\\) in \\(Q_3=6{,}5\\), \\(\\mathrm{IQR}=1{,}5\\), meji pa \\(2{,}75\\) in \\(8{,}75\\), zato je \\(30\\) označena kot osamelec.',
                     'If you move the value \\(8\\) to \\(30\\), the mean moves to \\(9\\), the median stays \\(6\\) and \\(\\sigma\\) grows to \\(8.6189\\). The quartiles by the school rule (halves including the median) are \\(Q_1=5\\) and \\(Q_3=6.5\\), \\(\\mathrm{IQR}=1.5\\), and the fences \\(2.75\\) and \\(8.75\\), so \\(30\\) is flagged as an outlier.'),
                text('Graf privzeto uporablja šolsko pravilo za kvartile in populacijski \\(\\sigma\\). Kalkulatorji in programi se razlikujejo: pravilo brez mediane v polovicah da za iste podatke \\(Q_1=5\\) in \\(Q_3=7\\), torej drugo škatlo. Tudi osamelec je dogovor: vrednost zunaj mej \\(1{,}5\\,\\mathrm{IQR}\\) od kvartilov, ne matematična lastnost podatkov.',
                     'The graph uses the school quartile rule and the population \\(\\sigma\\) by default. Calculators and software differ: the rule that leaves the median out of the halves gives \\(Q_1=5\\) and \\(Q_3=7\\) for the same data, a different box. An outlier is a convention too: a value beyond the \\(1.5\\,\\mathrm{IQR}\\) fences from the quartiles, not a mathematical property of the data.'),
            ],
        }),
        withExample('correlation', {
            id: 'correlation',
            demonstrationIds: ['prob-correlation'],
            investigationPrompts: {'prob-correlation': text('Napovej predznak in velikost korelacijskega koeficienta za privzete točke, nato eno točko odvleci daleč navzgor in poglej, kako se spremenita \\(r\\) in regresijska premica.', 'Predict the sign and size of the correlation coefficient for the default points, then drag one point far up and watch how \\(r\\) and the regression line change.')},
            title: text('Korelacija in regresijska premica', 'Correlation and the regression line'),
            formula: String.raw`r=\frac{S_{xy}}{\sqrt{S_{xx}\,S_{yy}}},\qquad y=a+bx,\quad b=\frac{S_{xy}}{S_{xx}}=r\,\frac{s_y}{s_x}`,
            paragraphs: [
                text('Cilj razdelka: na razsevnem diagramu znaš opisati preprosto povezavo med dvema spremenljivkama in jo iz predznaka naklona regresijske premice prebrati kot pozitivno ali negativno; tako izpolniš maturitetno zahtevo o preprostih povezavah. Korelacijski koeficient \\(r\\) je univerzitetna razširitev. Za točke \\((0,1),(1,2),(2,2),(3,4)\\) je \\(S_{xx}=5\\), \\(S_{yy}=4{,}75\\), \\(S_{xy}=4{,}5\\), zato \\(r=0{,}92338\\) in \\(r^2=\\tfrac{81}{95}\\). Regresijska premica \\(y=0{,}9x+0{,}9\\) je ista kot prileganje premice po metodi najmanjših kvadratov, vsota kvadratov ostankov pa je \\(0{,}7=S_{yy}(1-r^2)\\).',
                     'Goal of the section: on a scatter plot you can describe a simple association between two variables and read it from the sign of the regression line\'s slope as positive or negative; this is the matura requirement on simple associations. The correlation coefficient \\(r\\) is a university-level extension. For the points \\((0,1),(1,2),(2,2),(3,4)\\) we have \\(S_{xx}=5\\), \\(S_{yy}=4.75\\), \\(S_{xy}=4.5\\), so \\(r=0.92338\\) and \\(r^2=\\tfrac{81}{95}\\). The regression line \\(y=0.9x+0.9\\) is the same as the least-squares line fit, and the residual sum of squares is \\(0.7=S_{yy}(1-r^2)\\).'),
                text('Korelacijski koeficient meri samo linearno povezanost. Točke \\(y=x^2\\) pri \\(x=-3,\\dots,3\\) imajo \\(S_{xy}=0\\), torej \\(r=0\\), čeprav je \\(y\\) natanko določen z \\(x\\): \\(r=0\\) ne pomeni neodvisnosti. Velik \\(|r|\\) ne pomeni vzročnosti, saj lahko obe spremenljivki poganja kaj tretjega. En osamelec lahko \\(r\\) močno spremeni: če točko \\((3,4)\\) zamenjaš s \\((3,8)\\), pade \\(r\\) z \\(0{,}92338\\) na \\(0{,}84680\\), premica postane \\(y=2{,}1x+0{,}1\\), vsota kvadratov ostankov pa \\(8{,}7\\).',
                     'The correlation coefficient measures linear association only. The points \\(y=x^2\\) at \\(x=-3,\\dots,3\\) have \\(S_{xy}=0\\), so \\(r=0\\), although \\(y\\) is determined exactly by \\(x\\): \\(r=0\\) does not mean independence. A large \\(|r|\\) does not mean causation, since a third quantity may drive both variables. One outlier can change \\(r\\) a lot: if you replace the point \\((3,4)\\) by \\((3,8)\\), \\(r\\) drops from \\(0.92338\\) to \\(0.84680\\), the line becomes \\(y=2.1x+0.1\\) and the residual sum of squares \\(8.7\\).'),
                text('Regresijska premica za \\(y\\) minimizira vsoto kvadratov navpičnih ostankov; kvadrat navpičnega ostanka je modelska izbira, ne edina mogoča. Premica za \\(x\\) v odvisnosti od \\(y\\) minimizira vodoravne ostanke: za privzete točke je \\(x=0{,}94737y-0{,}63158\\). Produkt naklonov obeh premic je \\(r^2\\), zato se premici ujemata le pri \\(r=\\pm1\\).',
                     'The regression line for \\(y\\) minimizes the sum of squared vertical residuals; the squared vertical residual is a modelling choice, not the only possible one. The line for \\(x\\) in terms of \\(y\\) minimizes the horizontal residuals: for the default points it is \\(x=0.94737y-0.63158\\). The product of the two slopes is \\(r^2\\), so the lines coincide only when \\(r=\\pm1\\).'),
            ],
        }),
    ],
};
