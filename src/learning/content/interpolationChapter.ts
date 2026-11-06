import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    INTERPOLATION_CHAPTER_ID, interpolationGuidedExampleDemonstration, type InterpolationSectionId,
} from './interpolationChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: InterpolationSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = interpolationGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${INTERPOLATION_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Interpolation and approximation (spec I1 to I5): an opening section, then one section per lesson, each ending with its example. */
export const interpolationChapter: FamilyChapter = {
    id: INTERPOLATION_CHAPTER_ID,
    family: '/bezeg-2.0/interpolation',
    title: text('Interpolacija in aproksimacija', 'Interpolation and approximation'),
    purpose: text(
        'Krivulja lahko gre natanko skozi dane točke (interpolacija) ali pa le blizu njih (aproksimacija). Poglavje na istih štirih točkah primerja Lagrangeev interpolacijski polinom z Bézierjevo krivuljo, pokaže, da več ekvidistančnih točk lahko napako poveča (Rungejev pojav), predstavi lokalno Hermiteovo krivuljo in Catmull-Romov zlepek, razloži metodo najmanjših kvadratov kot namerni približek ter primerja dve subdivizijski pravili, od katerih eno aproksimira in drugo interpolira.',
        'A curve can pass exactly through given points (interpolation) or only near them (approximation). On the same four points the chapter compares the Lagrange interpolation polynomial with a Bézier curve, shows that more equispaced nodes can increase the error (Runge\'s phenomenon), introduces the local Hermite curve and the Catmull-Rom spline, explains least squares as a deliberate approximation, and compares two subdivision rules, one of which approximates and the other interpolates.',
    ),
    prerequisites: text(
        'Bézierjeve krivulje (de Casteljaujev postopek, konveksna ovojnica), zlepki z zveznostjo tangent na spojih in za razdelek o Rungejevem pojavu Taylorjeva formula iz poglavja Analiza.',
        'Bézier curves (the de Casteljau algorithm, the convex hull), splines with tangent continuity at the joins and, for the section on Runge\'s phenomenon, the Taylor formula from the Analysis chapter.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/bezier-curves', title: text('Bézierjeve krivulje', 'Bézier curves')},
        {path: '/bezeg-2.0/learn/splines', title: text('Zlepki: povezovanje lokalnih krivulj', 'Splines: joining local curves')},
        {path: '/bezeg-2.0/learn/analysis', title: text('Analiza', 'Analysis')},
    ],
    sections: [
        {
            id: 'through-or-near',
            title: text('Skozi točke ali blizu njih?', 'Through the points or near them?'),
            paragraphs: [
                text('Cilj razdelka: znaš povedati, v čem se interpolacija razlikuje od aproksimacije. Interpolacija zahteva, da krivulja ali funkcija gre natanko skozi dane točke; te točke imenujemo interpolacijske točke, besedo vozel pa prihranimo za zlepke. Aproksimacija zahteva le, da je krivulja blizu točk, v nekem izbranem merilu napake.',
                     'Goal of the section: you can say how interpolation differs from approximation. Interpolation requires the curve or function to pass exactly through the given points; we call them interpolation nodes and keep the word knot for splines. Approximation only requires the curve to be near the points, in some chosen measure of error.'),
                text('Bézierjeva krivulja je aproksimacija: kontrolni poligon jo vodi, krivulja pa leži v njegovi konveksni ovojnici in razen krajišč kontrolnih točk običajno ne zadene. Interpolant gre skozi vse točke, a ovojnice ne spoštuje. Poglavje sledi tej niti: Lagrangeev polinom, njegova težava pri mnogo ekvidistančnih točkah, lokalna Hermiteova krivulja, prileganje po metodi najmanjših kvadratov in nazadnje subdivizijska pravila, od katerih eno aproksimira in drugo interpolira.',
                     'A Bézier curve is an approximation: the control polygon guides it, but the curve lies in its convex hull and, apart from the end points, usually does not hit the control points. An interpolant passes through all the points but does not respect the hull. The chapter follows this thread: the Lagrange polynomial, its trouble with many equispaced nodes, the local Hermite curve, least-squares fitting and finally the subdivision rules, one of which approximates and the other interpolates.'),
            ],
        },
        withExample('lagrange', {
            id: 'lagrange',
            demonstrationIds: ['interp-lagrange'],
            investigationPrompts: {'interp-lagrange': text('Napovej, ali krivulja skozi štiri točke ostane v njihovi ovojnici, nato premakni eno točko in preveri, kako se spremeni oddaljeni del obeh krivulj.', 'Predict whether a curve through four points stays inside their hull, then move one point and check how the distant part of both curves changes.')},
            title: text('Lagrangeev polinom in Bézierjeva krivulja', 'The Lagrange polynomial and the Bézier curve'),
            formula: String.raw`p(t)=\sum_{j=0}^{n}\ell_j(t)\,P_j`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, zakaj interpolacijska krivulja lahko zapusti ovojnico točk, Bézierjeva pa ne. Naj bodo \\(t_0,\\dots,t_n\\) med seboj različne vrednosti parametra. Potem obstaja natanko ena krivulja \\(p\\) polinomske stopnje največ \\(n\\) z \\(p(t_j)=P_j\\), Lagrangeev interpolacijski polinom; \\(\\ell_j\\) so Lagrangeevi bazni polinomi z \\(\\ell_j(t_j)=1\\) in \\(\\ell_j(t_i)=0\\) za \\(i\\ne j\\). Če sta dva parametra enaka, formula ne deluje, saj bi delili z nič. Uteži \\(\\ell_j(t)\\) imajo vsoto \\(1\\), vendar so lahko negativne.',
                     'Goal of the section: you can say why an interpolating curve can leave the hull of the points while a Bézier curve cannot. Let \\(t_0,\\dots,t_n\\) be pairwise distinct parameter values. Then there is exactly one curve \\(p\\) of polynomial degree at most \\(n\\) with \\(p(t_j)=P_j\\), the Lagrange interpolation polynomial; the \\(\\ell_j\\) are the Lagrange basis polynomials with \\(\\ell_j(t_j)=1\\) and \\(\\ell_j(t_i)=0\\) for \\(i\\ne j\\). If two parameters coincide the formula fails, because it would divide by zero. The weights \\(\\ell_j(t)\\) sum to \\(1\\), but they can be negative.'),
                text('Za točke \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) z enakomernimi parametri \\(t=0,1,2,3\\) so pri \\(t=\\tfrac32\\) uteži \\(-\\tfrac1{16}\\), \\(\\tfrac9{16}\\), \\(\\tfrac9{16}\\), \\(-\\tfrac1{16}\\) in točka je \\((2;\\,2{,}8125)\\). Zgornji rob ovojnice ima pri \\(x=2\\) višino \\(2{,}5\\), zato je ta točka izven ovojnice. Bézierjeva krivulja z istimi točkami kot kontrolnimi ima pri \\(t=\\tfrac12\\) uteži \\(\\tfrac18\\), \\(\\tfrac38\\), \\(\\tfrac38\\), \\(\\tfrac18\\) in točko \\((2;\\,1{,}875)\\); njene uteži so nenegativne, zato leži v ovojnici. Obe krivulji sta globalni: premik ene točke spremeni vso krivuljo.',
                     'For the points \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) with uniform parameters \\(t=0,1,2,3\\), the weights at \\(t=\\tfrac32\\) are \\(-\\tfrac1{16}\\), \\(\\tfrac9{16}\\), \\(\\tfrac9{16}\\), \\(-\\tfrac1{16}\\) and the point is \\((2,\\,2.8125)\\). The upper edge of the hull has height \\(2.5\\) at \\(x=2\\), so this point lies outside the hull. The Bézier curve with the same points as control points has the weights \\(\\tfrac18\\), \\(\\tfrac38\\), \\(\\tfrac38\\), \\(\\tfrac18\\) at \\(t=\\tfrac12\\) and the point \\((2,\\,1.875)\\); its weights are nonnegative, so it lies in the hull. Both curves are global: moving one point changes the whole curve.'),
            ],
        }),
        withExample('runge', {
            id: 'runge',
            demonstrationIds: ['interp-runge'],
            investigationPrompts: {'interp-runge': text('Napovej, kaj se zgodi z napako, ko povečuješ stopnjo pri ekvidistančnih točkah, nato preklopi na Čebiševe točke in primerjaj največji napaki.', 'Predict what happens to the error as you raise the degree with equispaced nodes, then switch to Chebyshev nodes and compare the two maximum errors.')},
            title: text('Rungejev pojav in Čebiševe točke', 'Runge\'s phenomenon and Chebyshev nodes'),
            formula: String.raw`f(x)-p_n(x)=\frac{f^{(n+1)}(\xi)}{(n+1)!}\prod_{j=0}^{n}(x-x_j)`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, kaj kaže Rungejev pojav in česa ne dokazuje. Naj bo \\(f(x)=\\dfrac1{1+25x^2}\\) na \\([-1,1]\\) in \\(p_n\\) polinom stopnje \\(n\\) skozi \\(n+1\\) ekvidistančnih točk. Napaka je dana s formulo spodaj za neki \\(\\xi\\) na intervalu; v njej nastopa odvod \\(f^{(n+1)}\\), ki pri tej funkciji hitro raste. Največja napaka na gosti mreži z \\(20001\\) točkami zato z naraščajočo stopnjo ne pade: je \\(1{,}9157\\) pri \\(n=10\\), \\(2{,}1076\\) pri \\(n=15\\) in \\(59{,}82\\) pri \\(n=20\\), največja pa je ob krajiščih intervala.',
                     'Goal of the section: you can say what Runge\'s phenomenon shows and what it does not prove. Let \\(f(x)=\\dfrac1{1+25x^2}\\) on \\([-1,1]\\) and let \\(p_n\\) be the polynomial of degree \\(n\\) through \\(n+1\\) equispaced nodes. The error is given by the formula below for some \\(\\xi\\) in the interval; it contains the derivative \\(f^{(n+1)}\\), which grows quickly for this function. So the maximum error on a dense grid of \\(20001\\) points does not fall as the degree grows: it is \\(1.9157\\) for \\(n=10\\), \\(2.1076\\) for \\(n=15\\) and \\(59.82\\) for \\(n=20\\), and it is largest near the ends of the interval.'),
                text('Čebiševe točke prve vrste \\(x_j=\\cos\\frac{(2j+1)\\pi}{2(n+1)}\\) se gostijo ob krajiščih in dajo napaki \\(0{,}1092\\), \\(0{,}0831\\) in \\(0{,}01533\\) pri istih stopnjah. Previdno beri: divergenca je prikazana za to funkcijo in ekvidistančne točke, graf za nekaj stopenj pa ne dokaže ničesar za vse funkcije. Čebiševe točke med vsemi izbirami točk najbolj zmanjšajo največjo absolutno vrednost produkta \\(\\prod_j(x-x_j)\\) na intervalu; to ne zagotavlja najmanjše napake za vsako funkcijo. Prikazana največja napaka je največja vrednost na mreži in je zato le spodnja ocena prave največje napake.',
                     'Chebyshev nodes of the first kind \\(x_j=\\cos\\frac{(2j+1)\\pi}{2(n+1)}\\) cluster near the ends and give the errors \\(0.1092\\), \\(0.0831\\) and \\(0.01533\\) for the same degrees. Read carefully: the divergence is shown for this function and equispaced nodes, and a plot for a few degrees proves nothing for all functions. Among all choices of nodes, Chebyshev nodes minimize the largest absolute value of the product \\(\\prod_j(x-x_j)\\) on the interval; this does not guarantee the smallest error for every function. The maximum error shown is the maximum over a grid, so it is only a lower bound of the true maximum error.'),
            ],
        }),
        withExample('hermite', {
            id: 'hermite',
            demonstrationIds: ['interp-hermite'],
            investigationPrompts: {'interp-hermite': text('Pri možnosti Vrsta krivulje izberi Hermiteovo krivuljo, premakni tangentni ročaj in opazuj, kateri odseki se spremenijo. Nato izberi Catmull-Romov zlepek, Število interpolacijskih točk nastavi na šest, premakni notranjo točko in preštej odseke, ki se spremenijo.', 'Under Curve type choose the Hermite curve, drag a tangent handle and watch which pieces change. Then choose the Catmull-Rom spline, set Number of interpolation points to six, move an interior point and count the pieces that change.')},
            title: text('Hermiteova krivulja in Catmull-Romov zlepek', 'The Hermite curve and the Catmull-Rom spline'),
            formula: String.raw`m_i=\tfrac12\,(P_{i+1}-P_{i-1})`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, kaj določata položaj in tangenta ter zakaj je Catmull-Romov zlepek lokalen. Kubični Hermiteov odsek med točkama \\(P_i\\) in \\(P_{i+1}\\) s tangentama \\(m_i\\) in \\(m_{i+1}\\) ima na obeh krajiščih predpisano vrednost in odvod. V Bézierjevi obliki ima kontrolne točke \\(P_i\\), \\(P_i+\\tfrac13m_i\\), \\(P_{i+1}-\\tfrac13m_{i+1}\\), \\(P_{i+1}\\). Catmull-Romov zlepek tangente izbere iz sosed po formuli spodaj (enakomerni parametri); na krajiščih sta tangenti enostranski.',
                     'Goal of the section: you can say what position and tangent determine and why the Catmull-Rom spline is local. A cubic Hermite piece between \\(P_i\\) and \\(P_{i+1}\\) with tangents \\(m_i\\) and \\(m_{i+1}\\) has a prescribed value and derivative at both ends. In Bézier form its control points are \\(P_i\\), \\(P_i+\\tfrac13m_i\\), \\(P_{i+1}-\\tfrac13m_{i+1}\\), \\(P_{i+1}\\). The Catmull-Rom spline chooses the tangents from the neighbours by the formula below (uniform parameters); at the ends the tangents are one-sided.'),
                text('Za točke \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) je tangenta v točki \\((1,2)\\) enaka \\((1{,}5;\\,1{,}5)\\) in v točki \\((3,3)\\) enaka \\((1{,}5;\\,-1)\\). Razpolovišče odseka med njima je \\(\\tfrac12(P_1+P_2)+\\tfrac18(m_1-m_2)=(2;\\,2{,}8125)\\), isto kot točka Lagrangeevega polinoma iz prejšnjega razdelka. Krivulja je v notranjih točkah \\(C^1\\), drugi odvodi pa se v splošnem razlikujejo, zato ni \\(C^2\\). Za razliko od Lagrangeevega polinoma je lokalna: premik ene točke spremeni največ štiri odseke. Pri neenakomernih podatkih lahko enakomerni parametri povzročijo preseganje ali zanke: pri točkah \\((0,0)\\), \\((8,0)\\), \\((9,0)\\), \\((9,8)\\) kratki srednji odsek naredi zanko in se spusti do \\(y=-\\tfrac{16}{27}\\approx-0{,}593\\), s parametri po dolžini tetiv pa zanke ni in se spusti le do \\(y=-\\tfrac{32}{243}\\approx-0{,}132\\).',
                     'For the points \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) the tangent at \\((1,2)\\) is \\((1.5,\\,1.5)\\) and the tangent at \\((3,3)\\) is \\((1.5,\\,-1)\\). The midpoint of the piece between them is \\(\\tfrac12(P_1+P_2)+\\tfrac18(m_1-m_2)=(2,\\,2.8125)\\), the same as the point of the Lagrange polynomial in the previous section. The curve is \\(C^1\\) at interior points, but the second derivatives differ in general, so it is not \\(C^2\\). Unlike the Lagrange polynomial it is local: moving one point changes at most four pieces. On uneven data, uniform parameters can cause overshoot or loops: for the points \\((0,0)\\), \\((8,0)\\), \\((9,0)\\), \\((9,8)\\) the short middle piece forms a loop and dips to \\(y=-\\tfrac{16}{27}\\approx-0.593\\), while chord-length parameters give no loop and a dip of only \\(y=-\\tfrac{32}{243}\\approx-0.132\\).'),
            ],
        }),
        withExample('least-squares', {
            id: 'least-squares',
            demonstrationIds: ['interp-least-squares'],
            investigationPrompts: {'interp-least-squares': text('Vključi Ročno premico, jo nastavi na oko in jo primerjaj z najboljšo. Nato premakni eno točko daleč stran in opazuj, kako se najboljša premica premakne.', 'Turn on Manual line, set it by eye and compare it with the best one. Then move one point far away and watch how the best line moves.')},
            title: text('Metoda najmanjših kvadratov', 'Least squares'),
            formula: String.raw`A^{\mathsf T}A\,c=A^{\mathsf T}y`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, kaj minimizira metoda najmanjših kvadratov in zakaj je to modelska izbira. Imamo podatke \\((x_i,y_i)\\), točk je več kot parametrov. Polinom \\(p\\) izbrane stopnje ima ostanke \\(r_i=y_i-p(x_i)\\); metoda minimizira vsoto \\(\\sum_i r_i^2\\) kvadratov navpičnih ostankov, ne geometrijske razdalje do krivulje. Koeficienti \\(c\\) zadoščajo normalnemu sistemu spodaj, kjer je \\(A\\) matrika potenc \\(x_i^k\\), ostanki pa so pravokotni na njene stolpce. Aplikacija koeficiente izračuna s QR razcepom matrike \\(A\\), ker bi reševanje normalnega sistema kvadriralo pogojenost.',
                     'Goal of the section: you can say what least squares minimizes and why that is a modelling choice. We have data \\((x_i,y_i)\\) with more points than parameters. A polynomial \\(p\\) of the chosen degree has residuals \\(r_i=y_i-p(x_i)\\); the method minimizes the sum \\(\\sum_i r_i^2\\) of squared vertical residuals, not the geometric distance to the curve. The coefficients \\(c\\) satisfy the normal equations below, where \\(A\\) is the matrix of powers \\(x_i^k\\), and the residuals are orthogonal to its columns. The app computes the coefficients with a QR factorization of \\(A\\), because solving the normal equations would square the condition number.'),
                text('Za podatke \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) je najboljša premica \\(y=0{,}9x+0{,}9\\) z ostanki \\(0{,}1\\), \\(0{,}2\\), \\(-0{,}7\\), \\(0{,}4\\), ki imajo vsoto nič, in vsoto kvadratov \\(0{,}7\\). Kvadratni polinom da vsoto kvadratov \\(0{,}45\\), kubični pa gre skozi vse štiri točke z ostanki nič: interpolacija je prileganje z ostanki nič. Če točko \\((3,4)\\) zamenjamo s točko \\((3,8)\\), postane najboljša premica \\(y=2{,}1x+0{,}1\\) z vsoto kvadratov \\(8{,}7\\); ena oddaljena točka premico močno povleče.',
                     'For the data \\((0,1)\\), \\((1,2)\\), \\((2,2)\\), \\((3,4)\\) the best line is \\(y=0.9x+0.9\\) with residuals \\(0.1\\), \\(0.2\\), \\(-0.7\\), \\(0.4\\), which sum to zero, and a sum of squares of \\(0.7\\). A quadratic polynomial gives a sum of squares of \\(0.45\\), and the cubic passes through all four points with zero residuals: interpolation is a fit with zero residuals. If the point \\((3,4)\\) is replaced by \\((3,8)\\), the best line becomes \\(y=2.1x+0.1\\) with a sum of squares of \\(8.7\\); one distant point pulls the line strongly.'),
            ],
        }),
        withExample('subdivision', {
            id: 'subdivision',
            demonstrationIds: ['interp-subdivision'],
            investigationPrompts: {'interp-subdivision': text('Napovej obliko po več krogih Chaikinovega pravila, nato preklopi na štiritočkovno pravilo in preveri, ali se stare točke premaknejo.', 'Predict the shape after several rounds of Chaikin\'s rule, then switch to the four-point rule and check whether the old points move.')},
            title: text('Subdivizijske krivulje: Chaikin in štiritočkovno pravilo', 'Subdivision curves: Chaikin and the four-point rule'),
            formula: String.raw`\frac{-p_{i-1}+9p_i+9p_{i+1}-p_{i+2}}{16}`,
            paragraphs: [
                text('Cilj razdelka: znaš ločiti pravilo, ki aproksimira, od pravila, ki interpolira. Subdivizijska krivulja nastane s ponavljanjem lokalnega pravila, ki iz mnogokotnika naredi gostejšega. Chaikinovo pravilo vsak rob \\(p_ip_{i+1}\\) nadomesti s točkama \\(\\tfrac34p_i+\\tfrac14p_{i+1}\\) in \\(\\tfrac14p_i+\\tfrac34p_{i+1}\\); stare točke izginejo, limita pa je enakomerni kvadratni B-zlepek, ki je \\(C^1\\). Štiritočkovno pravilo stare točke obdrži in vsakemu robu doda točko po spodnji formuli, zato interpolira.',
                     'Goal of the section: you can tell a rule that approximates from one that interpolates. A subdivision curve arises by repeating a local rule that turns a polygon into a denser one. Chaikin\'s rule replaces each edge \\(p_ip_{i+1}\\) by the points \\(\\tfrac34p_i+\\tfrac14p_{i+1}\\) and \\(\\tfrac14p_i+\\tfrac34p_{i+1}\\); the old points disappear, and the limit is the uniform quadratic B-spline, which is \\(C^1\\). The four-point rule keeps the old points and adds to every edge the point of the formula below, so it interpolates.'),
                text('Za točke \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) Chaikin rob \\(p_1p_2\\) nadomesti s točkama \\((1{,}5;\\,2{,}25)\\) in \\((2{,}5;\\,2{,}75)\\), štiritočkovno pravilo pa mu doda točko \\((2;\\,2{,}8125)\\). Pri zaprtem mnogokotniku z \\(n\\) oglišči ima po \\(k\\) krogih obe pravili \\(2^kn\\) oglišč. Slike ponazarjajo konvergenco, ne dokazujejo je; gladkost limite sloni na citiranem izreku. Za štiritočkovno pravilo s \\(w=\\tfrac1{16}\\) navajamo \\(C^1\\) (Dyn, Gregory, Levin, 1987), brez območja za \\(w\\) in brez trditve o \\(C^2\\).',
                     'For the points \\((0,0)\\), \\((1,2)\\), \\((3,3)\\), \\((4,0)\\) Chaikin replaces the edge \\(p_1p_2\\) by the points \\((1.5,\\,2.25)\\) and \\((2.5,\\,2.75)\\), while the four-point rule adds the point \\((2,\\,2.8125)\\) to it. For a closed polygon with \\(n\\) vertices, both rules give \\(2^kn\\) vertices after \\(k\\) rounds. The pictures illustrate convergence; they do not prove it, and the smoothness of the limit rests on cited theory. For the four-point rule with \\(w=\\tfrac1{16}\\) we state \\(C^1\\) (Dyn, Gregory, Levin, 1987), with no range for \\(w\\) and no claim of \\(C^2\\).'),
            ],
        }),
    ],
};
