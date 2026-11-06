import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    ADVANCED_BEZIER_CHAPTER_ID, advancedBezierGuidedExampleDemonstration, type AdvancedBezierSectionId,
} from './advancedBezierChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: AdvancedBezierSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = advancedBezierGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${ADVANCED_BEZIER_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/**
 * Advanced Bezier topics (docs/specs/advanced-bezier-lessons.md): D1 degree reduction, D3 arc-length parametrization and D4 the Coons patch.
 * D2 (Bezier clipping) joins when it is released. The chapter spans the Bezier and patches Demonstration families, so the
 * family-link check of familyChapters.test.ts exempts it; its own test checks the links.
 */
export const advancedBezierChapter: FamilyChapter = {
    id: ADVANCED_BEZIER_CHAPTER_ID,
    family: '/bezeg-2.0/bezier',
    title: text('Napredne Bézierjeve teme', 'Advanced Bézier topics'),
    purpose: text(
        `Poglavje za študente, ki Bézierjeve krivulje in krpe že poznajo, odgovori na tri naslednja vprašanja. Ali lahko stopnjo krivulje spet znižamo in kaj pomeni »najboljša« kvadratna krivulja, kadar to ni mogoče natančno? Zakaj enaki koraki parametra niso enaki koraki po krivulji in kako razmik po loku izmerimo? Kako štiri robne krivulje zapolnimo s ploskvijo? Povsod je pomembno, katero normo, kateri približek in katero omejitev uporabimo: rezultat ni edini mogoč.`,
        `A chapter for students who already know Bézier curves and patches. It answers three further questions. Can the degree of a curve be lowered again, and what does the "best" quadratic mean when that cannot be done exactly? Why are equal steps of the parameter not equal steps along the curve, and how is the distance along the curve measured? How are four boundary curves filled with a surface? Throughout, it matters which norm, which approximation and which constraint is used: the result is not the only possible one.`,
    ),
    prerequisites: text(
        `Bézierjeve krivulje (kontrolne točke, višanje stopnje), parametrizacija in hitrost kot dolžina odvoda, PH-krivulje z natančno dolžino loka ter tenzorska Bézierjeva krpa. Dovolj je, da znaš odvajati polinomsko krivuljo po komponentah.`,
        `Bézier curves (control points, degree elevation), parametrization and speed as the length of the derivative, PH curves with their exact arc length, and the tensor-product Bézier patch. It is enough to be able to differentiate a polynomial curve componentwise.`,
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/bezier-curves', title: text('Bézierjeve krivulje', 'Bézier curves')},
        {path: '/bezeg-2.0/learn/parametrization', title: text('Parametrizacija: kako hitro prehodimo pot', 'Parametrization: how quickly a path is traversed')},
        {path: '/bezeg-2.0/learn/ph-curves', title: text('PH-krivulje: polinomska dolžina loka', 'PH curves: polynomial arc length')},
        {path: '/bezeg-2.0/learn/bezier-patches', title: text('Bézierjeve krpe', 'Bézier patches')},
    ],
    sections: [
        {
            id: 'advanced-bezier-idea',
            title: text('Kaj je pri naprednih temah drugače', 'What differs in the advanced topics'),
            paragraphs: [
                text(
                    `Cilj razdelka: znaš povedati, zakaj pri vseh treh temah ne iščemo ene same pravilne rešitve, ampak rešitev ob jasno povedanih predpostavkah. Višanje stopnje je natančno: ista krivulja dobi eno kontrolno točko več. Obratna smer, nižanje stopnje, je v splošnem le približek. Dolžina loka je integral hitrosti, ki ga običajno izračunamo numerično, zato ima natančnost, ki jo povemo. Coonsova ploskev je ena izmed mnogih ploskev z danimi robovi.`,
                    `Goal of the section: you can say why in all three topics we do not look for a single correct answer but for an answer under clearly stated assumptions. Degree elevation is exact: the same curve gets one more control point. The reverse, degree reduction, is in general only an approximation. Arc length is the integral of the speed, which we usually compute numerically, so it has an accuracy that we state. The Coons patch is one of many surfaces with the given boundaries.`,
                ),
                text(
                    `Slike v lekcijah prikazujejo primere in so ponazoritve, ne dokazi. Tam, kjer prikazana številka izhaja iz vzorčenja ali iz tolerance, je to tudi zapisano. Vsak razdelek se konča s pripravljeno dejavnostjo, ki jo odpreš na grafu in z njo preveriš navedene vrednosti.`,
                    `The pictures in the lessons show examples and are illustrations, not proofs. Where a displayed number comes from sampling or from a tolerance, this is stated. Each section ends with a prepared activity that you open on the graph and use to check the quoted values.`,
                ),
            ],
        },
        withExample('reduction', {
            id: 'reduction',
            demonstrationIds: ['reduction'],
            investigationPrompts: {reduction: text(
                `Napovej, ali je kubična krivulja \\(P\\) zvišana kvadratna. Nato premakni kontrolno točko in opazuj tretjo diferenco ter obe napaki, najprej pri fiksnih, nato pri prostih krajiščih.`,
                `Predict whether the cubic \\(P\\) is an elevated quadratic. Then move a control point and watch the third difference and both errors, first with fixed and then with free end points.`,
            )},
            title: text('Nižanje stopnje', 'Degree reduction'),
            formula: String.raw`b_3-3b_2+3b_1-b_0=0`,
            paragraphs: [
                text(
                    `Cilj razdelka: znaš povedati, kdaj je nižanje stopnje točno, in pojasniti, od česa je odvisna »najboljša« kvadratna krivulja. Kubična krivulja s kontrolnimi točkami \\(b_0,\\dots,b_3\\) je kvadratna natanko tedaj, ko je njena tretja diferenca \\(b_3-3b_2+3b_1-b_0\\) enaka nič. Kvadratna krivulja \\((0,0),(2,4),(4,0)\\) se zviša v kubično \\((0,0),(\\tfrac43,\\tfrac83),(\\tfrac83,\\tfrac83),(4,0)\\), nižanje pa jo vrne v prvotno obliko.`,
                    `Goal of the section: you can say when degree reduction is exact and explain what the "best" quadratic depends on. A cubic curve with control points \\(b_0,\\dots,b_3\\) is a quadratic exactly when its third difference \\(b_3-3b_2+3b_1-b_0\\) is zero. The quadratic \\((0,0),(2,4),(4,0)\\) elevates to the cubic \\((0,0),(\\tfrac43,\\tfrac83),(\\tfrac83,\\tfrac83),(4,0)\\), and reduction returns it to the original.`,
                ),
                text(
                    `Kubična krivulja \\(P\\) s točkami \\((0,0),(1,3),(3,3),(4,0)\\) ima tretjo diferenco \\((-2;\\,0)\\), zato ni zvišana kvadratna krivulja. Kvadratno krivuljo ji lahko le približamo. Če krajišči ostaneta, je optimum po normi \\(L^2\\) srednja točka \\(q_1=(2;\\,4{,}5)\\), ki jo da tudi Forrestova formula; največja napaka je \\(\\sqrt3/18\\approx0{,}0962\\) (vzorčena), napaka \\(L^2\\) pa \\(0{,}069007\\). Če smeta krajišči tudi odstopati, dobimo drug optimum \\((-0{,}1;\\,0),(2;\\,4{,}5),(4{,}1;\\,0)\\): napaka \\(L^2\\) je manjša, \\(0{,}037796\\), največja napaka pa večja, \\(0{,}1\\).`,
                    `The cubic \\(P\\) with points \\((0,0),(1,3),(3,3),(4,0)\\) has third difference \\((-2,\\,0)\\), so it is not an elevated quadratic. A quadratic can only approximate it. If the end points stay, the optimum in the \\(L^2\\) norm has middle point \\(q_1=(2,\\,4.5)\\), which Forrest's formula also gives; the maximum error is \\(\\sqrt3/18\\approx0.0962\\) (sampled) and the \\(L^2\\) error is \\(0.069007\\). If the end points may move, we get a different optimum \\((-0.1,\\,0),(2,\\,4.5),(4.1,\\,0)\\): the \\(L^2\\) error is smaller, \\(0.037796\\), and the maximum error is larger, \\(0.1\\).`,
                ),
                text(
                    `»Najboljša« torej pomeni najboljša za izbrano normo in omejitev; drugačna izbira, na primer najmanjša največja napaka ali ohranitev tangent, lahko da drugo kvadratno krivuljo. Optimum nikoli ni natančen, razen če je tretja diferenca nič. Pri računanju »nižljivo« pomeni, da je tretja diferenca pod toleranco \\(10^{-9}\\) glede na merilo kontrolnih točk. Meja iz kontrolnih točk je vsaj tako velika kot vzorčena največja napaka.`,
                    `"Best" therefore means best for the chosen norm and constraint; a different choice, for example the smallest maximum error or preserving the tangents, can give a different quadratic. The optimum is never exact unless the third difference is zero. In the computation, "reducible" means that the third difference is below a tolerance of \\(10^{-9}\\) relative to the scale of the control points. The bound from the control points is at least as large as the sampled maximum error.`,
                ),
            ],
        }),
        withExample('arc-length-param', {
            id: 'arc-length-param',
            demonstrationIds: ['arc-length-param'],
            investigationPrompts: {'arc-length-param': text(
                `Napovej, kje bo točka pri enakih korakih parametra \\(t\\) hitrejša, nato pokaži enake loke in primerjaj razmike. Pri krivulji, ki ni PH, podvoji \\(N\\) in opazuj napako včrtanega lomljenca.`,
                `Predict where the point is faster at equal steps of the parameter \\(t\\), then show equal arcs and compare the spacing. For the non-PH curve, double \\(N\\) and watch the error of the inscribed polyline.`,
            )},
            title: text('Naravna parametrizacija', 'Arc-length parametrization'),
            formula: String.raw`s(t)=\int_0^t|B^{\prime}(u)|\,du`,
            paragraphs: [
                text(
                    `Cilj razdelka: znaš pojasniti, zakaj enaki koraki parametra niso enaki koraki po loku, in postaviti točke na enake razdalje po krivulji. Dolžina loka je \\(s(t)=\\int_0^t|B^{\\prime}(u)|\\,du\\); tabelo te funkcije obrnemo in dobimo parametre, pri katerih je lok med sosednjima točkama enak. Pri PH-krivulji je \\(s(t)\\) polinom, zato je dolžina natančna; na primeru kubične PH-krivulje je \\(s(1)=31/3\\approx10{,}333333\\), kar se ujema z numerično kvadraturo.`,
                    `Goal of the section: you can explain why equal steps of the parameter are not equal steps along the arc, and place points at equal distances along the curve. The arc length is \\(s(t)=\\int_0^t|B^{\\prime}(u)|\\,du\\); we tabulate this function and invert it to get the parameters at which the arc between neighbouring points is equal. For a PH curve \\(s(t)\\) is a polynomial, so the length is exact; on the example of the cubic PH curve \\(s(1)=31/3\\approx10.333333\\), which agrees with the numerical quadrature.`,
                ),
                text(
                    `Pri osmih enakih korakih \\(t\\) so tetive na tej PH-krivulji dolge od \\(1{,}7585\\) (prva) do \\(1{,}0865\\) (šesta), razmerje je \\(1{,}62\\). Pri osmih enakih lokih ima vsak lok dolžino \\(L/8=1{,}291667\\), tetive pa so od \\(1{,}2908\\) do \\(1{,}2851\\), razmerje \\(1{,}004\\); tetiva je krajša od loka. Pri kubični krivulji, ki ni PH, \\((0,0),(1,3),(3,3),(4,0)\\) je dolžina \\(6{,}390976\\), znana pa sta tudi meji: tetiva \\(4\\) navzdol in kontrolni poligon \\(8{,}32456\\) navzgor. Napaka včrtanega lomljenca pri \\(N=4,8,16,32,64\\) je \\(0{,}100244;\\ 0{,}025086;\\ 0{,}006267;\\ 0{,}001566;\\ 0{,}000392\\); ob podvojitvi \\(N\\) se približno deli s \\(4\\). To je ponazoritev vedenja \\(O(h^2)\\) na tem primeru, ne dokaz.`,
                    `With eight equal steps of \\(t\\), the chords on this PH curve range from \\(1.7585\\) (first) to \\(1.0865\\) (sixth), a ratio of \\(1.62\\). With eight equal arcs each arc has length \\(L/8=1.291667\\), and the chords range from \\(1.2908\\) to \\(1.2851\\), a ratio of \\(1.004\\); a chord is shorter than its arc. For the non-PH cubic \\((0,0),(1,3),(3,3),(4,0)\\) the length is \\(6.390976\\), bracketed by the chord \\(4\\) from below and the control polygon \\(8.32456\\) from above. The error of an inscribed polyline with \\(N=4,8,16,32,64\\) is \\(0.100244,\\ 0.025086,\\ 0.006267,\\ 0.001566,\\ 0.000392\\); when \\(N\\) doubles it divides by about \\(4\\). This illustrates \\(O(h^2)\\) behaviour on this example and is not a proof.`,
                ),
                text(
                    `Naravna parametrizacija (parametrizacija z ločno dolžino) ima hitrost \\(1\\). Polinomska krivulja s hitrostjo \\(1\\) je premica: če je \\(x^{\\prime2}+y^{\\prime2}=1\\) za polinoma \\(x^{\\prime}\\) in \\(y^{\\prime}\\), se pri nekonstantnem polinomu najvišji členi kvadratov seštejejo brez krajšanja (koeficienti so realni), zato vsota ne bi bila konstantna; torej sta oba konstantna in je odvod krivulje konstanten. Nelinearna polinomska krivulja torej nima polinomske naravne parametrizacije. PH-krivulja naredi polinomsko dolžino \\(s(t)\\), ne njenega inverza \\(t(s)\\). Običajna (regularna) krivulja naravno parametrizacijo vedno ima, le polinomska ni. Numerične dolžine so tolikšne, kot jih daje izbrana kvadratura, in samo pri PH-krivuljah je vrednost natančna.`,
                    `The arc-length parametrization (natural parametrization) has speed \\(1\\). A polynomial curve with speed \\(1\\) is a straight line: if \\(x^{\\prime2}+y^{\\prime2}=1\\) for the polynomials \\(x^{\\prime}\\) and \\(y^{\\prime}\\), then if either were non-constant, the highest-degree terms of the squares would add without cancelling (the coefficients are real) and the sum would not be constant; so both are constant and the derivative of the curve is constant. A non-linear polynomial curve therefore has no polynomial arc-length parametrization. A PH curve makes the length \\(s(t)\\) polynomial, not its inverse \\(t(s)\\). A regular curve always has an arc-length parametrization, it is just not polynomial. Numerical lengths are only as good as the chosen quadrature, and the value is exact only for PH curves.`,
                ),
            ],
        }),
        withExample('patch-coons', {
            id: 'patch-coons',
            demonstrationIds: ['patch-coons'],
            investigationPrompts: {'patch-coons': text(
                `Napovej, kaj se zgodi v središču ploskve, če izklopiš odštevalni člen \\(B\\). Nato premakni eno krajišče robne krivulje stran od sosednje in preveri, ali ploskev še interpolira vse robove.`,
                `Predict what happens at the centre of the surface if you switch off the subtracted term \\(B\\). Then move one corner of a boundary curve away from its neighbour and check whether the surface still interpolates all the edges.`,
            )},
            title: text('Coonsova ploskev', 'Coons patch'),
            formula: String.raw`S(u,v)=L_c(u,v)+L_d(u,v)-B(u,v)`,
            paragraphs: [
                text(
                    `Cilj razdelka: znaš iz štirih robnih krivulj z ujemajočimi se krajišči sestaviti ploskev in povedati, kaj je njena izbira. Premonosni ploskvi \\(L_c\\) (med krivuljama \\(c_0\\) in \\(c_1\\)) in \\(L_d\\) (med \\(d_0\\) in \\(d_1\\)) vsebujeta vsaka bilinearni del, določen s krajišči, zato ga enkrat odštejemo: \\(B\\) je bilinearna ploskev skozi štiri krajišča. Mešanje \\(S=L_c+L_d-B\\) interpolira vse štiri robove, če se krajišča ujemajo.`,
                    `Goal of the section: you can build a surface from four boundary curves with matching corners and say what is a choice in it. The two ruled surfaces \\(L_c\\) (between the curves \\(c_0\\) and \\(c_1\\)) and \\(L_d\\) (between \\(d_0\\) and \\(d_1\\)) each contain the bilinear part fixed by the corners, so we subtract it once: \\(B\\) is the bilinear surface through the four corners. The blend \\(S=L_c+L_d-B\\) interpolates all four edges when the corners coincide.`,
                ),
                text(
                    `Na primeru kubičnih Bézierjevih robov \\(c_0=(0,0,0),(1,0,2),(2,0,2),(3,0,0)\\), \\(c_1=(0,3,0),(1,3,-1),(2,3,-1),(3,3,0)\\), \\(d_0\\) kot ravni rob od \\((0,0,0)\\) do \\((0,3,0)\\) in \\(d_1=(3,0,0),(3,1,1),(3,2,1),(3,3,0)\\) je središče \\(S(\\tfrac12,\\tfrac12)=(1{,}5;\\,1{,}5;\\,0{,}75)\\): koordinata \\(z\\) je vsota \\(0{,}375+0{,}375\\), \\(B\\) pa prispeva \\(0\\). Pri kubičnih robovih je Coonsova ploskev natanko bikubična Bézierjeva krpa; njene štiri notranje kontrolne točke so \\((1,1,\\tfrac43)\\), \\((1,2,\\tfrac13)\\), \\((2,1,\\tfrac53)\\) in \\((2,2,\\tfrac23)\\).`,
                    `On the example of cubic Bézier edges \\(c_0=(0,0,0),(1,0,2),(2,0,2),(3,0,0)\\), \\(c_1=(0,3,0),(1,3,-1),(2,3,-1),(3,3,0)\\), \\(d_0\\) the straight edge from \\((0,0,0)\\) to \\((0,3,0)\\), and \\(d_1=(3,0,0),(3,1,1),(3,2,1),(3,3,0)\\), the centre is \\(S(\\tfrac12,\\tfrac12)=(1.5,\\,1.5,\\,0.75)\\): the \\(z\\) coordinate is the sum \\(0.375+0.375\\), and \\(B\\) contributes \\(0\\). With cubic edges the Coons patch is exactly a bicubic Bézier patch; its four interior control points are \\((1,1,\\tfrac43)\\), \\((1,2,\\tfrac13)\\), \\((2,1,\\tfrac53)\\) and \\((2,2,\\tfrac23)\\).`,
                ),
                text(
                    `To mešanje je ena izmed mnogih možnosti: robovi sami ne določajo notranjosti ploskve, drugi načini mešanja dajo drugačne ploskve z istimi robovi. Če krajišče odmaknemo, se robovi ne ujemajo več in ploskev ne interpolira vseh štirih, zato se lekcija ne sklicuje na interpolacijo, dokler se krajišča ne ujemajo.`,
                    `This blend is one of many possibilities: the edges alone do not determine the interior of the surface, and other blendings give other surfaces with the same edges. If a corner is moved away, the edges no longer meet and the surface does not interpolate all four, so the lesson does not claim interpolation until the corners coincide.`,
                ),
            ],
        }),
    ],
};
