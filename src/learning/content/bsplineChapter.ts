import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    BSPLINE_CHAPTER_ID, bsplineGuidedExampleDemonstration, type BSplineSectionId,
} from './bsplineChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: BSplineSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = bsplineGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${BSPLINE_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** B-spline spec batches A and B so far: only the released lessons (L1 the basis functions, L2 the curve and de Boor's algorithm, L3 knot insertion and multiplicity, L4 Bézier extraction) are mentioned; later sections are not named. */
export const bsplineChapter: FamilyChapter = {
    id: BSPLINE_CHAPTER_ID,
    family: '/bezeg-2.0/bspline',
    title: text('B-zlepki in NURBS', 'B-splines and NURBS'),
    purpose: text(
        'Namesto več Bézierjevih odsekov, ki jih na spojih posebej usklajujemo, B-zlepek zapiše eno krivuljo kot vsoto kontrolnih točk, pomnoženih z lokalnimi baznimi funkcijami. Poglavje na majhnem primeru pokaže, kaj določa vozelni vektor, katere točke vplivajo na izbrano vrednost parametra in kako de Boorov postopek izračuna točko krivulje. Nadaljnji razdelki bodo sledili.',
        'Instead of several Bézier pieces whose joins are matched one by one, a B-spline writes one curve as a sum of control points multiplied by local basis functions. On a small example the chapter shows what the knot vector determines, which points influence a chosen parameter value and how de Boor\'s algorithm computes a curve point. Further sections will follow.',
    ),
    prerequisites: text(
        'Bézierjeve krivulje z de Casteljaujevim postopkom in zlepki z zveznostjo na spojih. Dovolj je, da znaš izračunati točko Bézierjeve krivulje s ponavljajočim se linearnim interpoliranjem.',
        'Bézier curves with the de Casteljau algorithm, and splines with continuity at the joins. It is enough to be able to compute a Bézier curve point by repeated linear interpolation.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/bezier-curves', title: text('Bézierjeve krivulje', 'Bézier curves')},
        {path: '/bezeg-2.0/learn/splines', title: text('Zlepki: povezovanje lokalnih krivulj', 'Splines: joining local curves')},
    ],
    sections: [
        {
            id: 'bspline-idea',
            title: text('Od odsekov do ene krivulje z vozelnim vektorjem', 'From pieces to one curve with a knot vector'),
            paragraphs: [
                text('Cilj razdelka: znaš povedati, kaj je vozel, kaj je večkratnost vozla in zakaj je stopnja ločena od števila kontrolnih točk. V poglavju o zlepkih smo Bézierjeve odseke povezovali in pri vsakem spoju preverjali zveznost. B-zlepek stopnje \\(k\\) to delo prepusti bazi: krivulja je \\(C(t)=\\sum_i N_{i,k}(t)\\,P_i\\), kjer so \\(P_i\\) kontrolne točke, \\(N_{i,k}\\) pa bazne funkcije, ki so odsekoma polinomske stopnje \\(k\\).',
                     'Goal of the section: you can say what a knot is, what the multiplicity of a knot is and why the degree is separate from the number of control points. In the splines chapter we joined Bézier pieces and checked continuity at every join. A B-spline of degree \\(k\\) leaves that work to the basis: the curve is \\(C(t)=\\sum_i N_{i,k}(t)\\,P_i\\), where the \\(P_i\\) are control points and the \\(N_{i,k}\\) are basis functions that are piecewise polynomial of degree \\(k\\).'),
                text('Meje kosov podaja vozelni vektor \\(u_0\\le u_1\\le\\dots\\le u_m\\), nepadajoče zaporedje vozlov. Vozel, ki se ponovi, ima večkratnost, ki je število ponovitev. Baza je določena z vozelnim vektorjem in stopnjo, število kontrolnih točk pa je \\(m-k\\). Pritrjen vozelni vektor ima prvi in zadnji vozel \\(k+1\\)-krat, zato krivulja začne v prvi in konča v zadnji kontrolni točki, tako kot Bézierjeva krivulja. Primer v tem poglavju ima stopnjo \\(2\\) in vozelni vektor \\((0,0,0,1,2,2,2)\\): vozel \\(1\\) je enojen, krajna vozla \\(0\\) in \\(2\\) sta trikratna, kontrolne točke pa so štiri.',
                     'The pieces are bounded by the knot vector \\(u_0\\le u_1\\le\\dots\\le u_m\\), a non-decreasing sequence of knots. A knot that repeats has a multiplicity, the number of times it occurs. The basis is determined by the knot vector and the degree, and the number of control points is \\(m-k\\). A clamped knot vector repeats its first and last knot \\(k+1\\) times, so the curve starts at the first and ends at the last control point, just as a Bézier curve does. The example in this chapter has degree \\(2\\) and knot vector \\((0,0,0,1,2,2,2)\\): the knot \\(1\\) is simple, the end knots \\(0\\) and \\(2\\) have multiplicity three, and there are four control points.'),
                text('Zaradi lokalnosti vsaka kontrolna točka vpliva le na del krivulje, in ne na celotno. Spodnji razdelki to pokažejo po vrsti: najprej bazne funkcije, nato krivulja in postopek, s katerim izračunamo njeno točko, nazadnje vstavljanje vozla.',
                     'Thanks to locality, each control point influences only part of the curve and not all of it. The sections below show this in turn: first the basis functions, then the curve and the algorithm that computes its point, and finally knot insertion.'),
            ],
        },
        withExample('bspline-basis', {
            id: 'bspline-basis',
            demonstrationIds: ['bspline-basis'],
            investigationPrompts: {'bspline-basis': text('Napovej, katere bazne funkcije so neničelne pri izbranem \\(t\\), nato premakni en notranji vozel in preveri, katere se spremenijo.', 'Predict which basis functions are nonzero at a chosen \\(t\\), then move one interior knot and check which of them change.')},
            title: text('Bazne funkcije B-zlepka', 'The B-spline basis functions'),
            formula: String.raw`\sum_i N_{i,k}(t)=1`,
            paragraphs: [
                text('Cilj razdelka: znaš prebrati graf baznih funkcij in povedati, katere so pri izbranem \\(t\\) različne od nič. Podpora funkcije \\(N_{i,k}\\) je interval \\([u_i,u_{i+k+1})\\), zunaj njega je funkcija enaka nič. Zato je pri vsakem \\(t\\) največ \\(k+1\\) baznih funkcij različnih od nič, vse so nenegativne in njihova vsota je \\(1\\) (razčlenitev enote). Prav to je razlog, da je točka krivulje utežena sredina aktivnih kontrolnih točk in leži v njihovi konveksni ovojnici.',
                     'Goal of the section: you can read the graph of the basis functions and say which are nonzero at a chosen \\(t\\). The support of \\(N_{i,k}\\) is the interval \\([u_i,u_{i+k+1})\\), and the function is zero outside it. So at every \\(t\\) at most \\(k+1\\) basis functions are nonzero, all of them are nonnegative and they sum to \\(1\\) (a partition of unity). This is why a curve point is a weighted average of the active control points and lies in their convex hull.'),
                text('Za vozelni vektor \\((0,0,0,1,2,2,2)\\) in stopnjo \\(2\\) so pri \\(t=\\tfrac12\\) vrednosti baznih funkcij \\(0{,}25\\), \\(0{,}625\\), \\(0{,}125\\) in \\(0\\), vsota pa je \\(1\\). Zadnja funkcija je enaka nič, ker se njena podpora \\([u_3,u_6)=[1,2)\\) začne šele pri \\(1\\). Če premakneš en notranji vozel, se spremenijo le sosednje funkcije; za vozelni vektor \\((0,0,0,1,1,1)\\) pa dobimo Bernsteinove bazne funkcije stopnje \\(2\\), torej Bézierjevo krivuljo.',
                     'For the knot vector \\((0,0,0,1,2,2,2)\\) and degree \\(2\\), the basis values at \\(t=\\tfrac12\\) are \\(0.25\\), \\(0.625\\), \\(0.125\\) and \\(0\\), and they sum to \\(1\\). The last function is zero because its support \\([u_3,u_6)=[1,2)\\) only starts at \\(1\\). If you move one interior knot, only the neighbouring functions change; and the knot vector \\((0,0,0,1,1,1)\\) gives the Bernstein basis functions of degree \\(2\\), that is, a Bézier curve.'),
            ],
        }),
        withExample('bspline-deboor', {
            id: 'bspline-deboor',
            demonstrationIds: ['bspline-deboor'],
            investigationPrompts: {'bspline-deboor': text('Premakni parameter \\(t\\) in ugotovi, katere kontrolne točke so aktivne. Nato premakni eno točko in preveri, kje se krivulja ne spremeni.', 'Move the parameter \\(t\\) and find which control points are active. Then move one point and check where the curve does not change.')},
            title: text('Krivulja B-zlepka in de Boorov postopek', 'The B-spline curve and de Boor\'s algorithm'),
            paragraphs: [
                text('Cilj razdelka: znaš izračunati točko B-zlepka z de Boorovim postopkom in povedati, katere kontrolne točke so pri tem aktivne. Postopek je kot de Casteljaujev: iz \\(k+1\\) aktivnih točk v \\(k\\) korakih naredimo trikotnik linearnih interpolacij, le da so razmerja v vsakem koraku odvisna od vozlov in ne vedno enaka \\(t\\). Zadnja točka trikotnika je točka krivulje.',
                     'Goal of the section: you can compute a B-spline point with de Boor\'s algorithm and say which control points are active in it. The algorithm resembles de Casteljau\'s: from the \\(k+1\\) active points, \\(k\\) steps build a triangle of linear interpolations, except that the ratios in each step depend on the knots and are not always \\(t\\). The last point of the triangle is the curve point.'),
                text('Za točke \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) in vozelni vektor \\((0,0,0,1,2,2,2)\\) so pri \\(t=\\tfrac12\\) aktivne prve tri točke. Prva stopnja da \\((0{,}5;\\,1)\\) in \\((1{,}5;\\,2)\\), druga pa točko \\((1;\\,1{,}5)\\); do enakega rezultata pride vsota baznih funkcij s prejšnjega razdelka. Ker so za \\(t<1\\) aktivne le tri točke, premik točke \\(P_3\\) tam ne spremeni krivulje; to je lokalni nadzor. Krivulja ima dva odseka, ker ima en notranji vozel.',
                     'For the points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) and the knot vector \\((0,0,0,1,2,2,2)\\), the first three points are active at \\(t=\\tfrac12\\). The first level gives \\((0.5,\\,1)\\) and \\((1.5,\\,2)\\), and the second gives the point \\((1,\\,1.5)\\); the sum of the basis functions from the previous section arrives at the same result. Because only three points are active for \\(t<1\\), moving the point \\(P_3\\) does not change the curve there; this is local control. The curve has two pieces because it has one interior knot.'),
            ],
        }),
        withExample('bspline-insertion', {
            id: 'bspline-insertion',
            demonstrationIds: ['bspline-insertion'],
            investigationPrompts: {'bspline-insertion': text('Vstavi vozel in preveri, da se krivulja ne spremeni, poligon pa dobi eno točko več. Nato preklopi na kubični primer in primerjaj enojni vozel z dvojnim.', 'Insert a knot and check that the curve does not change while the polygon gains one point. Then switch to the cubic example and compare the simple knot with the double knot.')},
            title: text('Vstavljanje vozla in večkratnost', 'Knot insertion and multiplicity'),
            formula: String.raw`C^{\,k-m}`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, da vstavljanje vozla spremeni kontrolni poligon, krivulje pa ne, in da večkratnost vozla določa zveznost. Pri vstavljanju vozla \\(x\\) nastane ena kontrolna točka več: točke, ki so v bližini \\(x\\), nadomestijo nove točke na daljicah med starimi. Krivulja ostane ista, ker nova baza in nove točke dasta enako vsoto.',
                     'Goal of the section: you can say that inserting a knot changes the control polygon but not the curve, and that the multiplicity of a knot determines the continuity. Inserting a knot \\(x\\) creates one more control point: the points near \\(x\\) are replaced by new points on the segments between the old ones. The curve stays the same because the new basis and the new points give the same sum.'),
                text('Za točke \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) in vozle \\((0,0,0,1,2,2,2)\\) vstavitev \\(u=\\tfrac12\\) da točke \\((0,0)\\), \\((0{,}5;\\,1)\\), \\((1{,}5;\\,2)\\), \\((3,2)\\), \\((4,0)\\); novi točki sta točki prve ravni de Boorovega postopka. Vozel večkratnosti \\(m\\) pri stopnji \\(k\\) daje zveznost \\(C^{k-m}\\). Pri kubični krivulji z dvojnim vozlom se tangenta ujema, ukrivljenost \\(\\kappa\\) pa skoči z \\(\\tfrac83\\) na \\(\\tfrac{16}3\\); glavnik ukrivljenosti ta skok pokaže.',
                     'For the points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) and the knots \\((0,0,0,1,2,2,2)\\), inserting \\(u=\\tfrac12\\) gives the points \\((0,0)\\), \\((0.5,\\,1)\\), \\((1.5,\\,2)\\), \\((3,2)\\), \\((4,0)\\); the new points are the level-1 points of de Boor\'s algorithm. A knot of multiplicity \\(m\\) at degree \\(k\\) gives the continuity \\(C^{k-m}\\). For a cubic with a double knot the tangent agrees while the curvature \\(\\kappa\\) jumps from \\(\\tfrac83\\) to \\(\\tfrac{16}3\\); the curvature comb shows that jump.'),
            ],
        }),
        withExample('bspline-extraction', {
            id: 'bspline-extraction',
            demonstrationIds: ['bspline-extraction'],
            investigationPrompts: {'bspline-extraction': text('Premakni kontrolno točko in poglej, kateri odseki se spremenijo. Preštej odseke in jih primerjaj s številom različnih notranjih vozlov.', 'Move a control point and see which pieces change. Count the pieces and compare them with the number of distinct interior knots.')},
            title: text('Izvlek Bézierjevih odsekov', 'Bézier extraction'),
            formula: String.raw`m=r+1`,
            paragraphs: [
                text('Cilj razdelka: znaš povedati, da lahko B-zlepek z vstavljanjem vozlov razdeliš na navadne Bézierjeve odseke, in izračunati njihovo število. Vozel vstavljamo, dokler nima večkratnosti \\(k\\); tedaj je vsak odsek Bézierjeva krivulja svojih \\(k+1\\) točk. Število odsekov \\(m\\) je za ena večje od števila \\(r\\) različnih notranjih vozlov.',
                     'Goal of the section: you can say that a B-spline can be split into ordinary Bézier pieces by inserting knots, and count them. A knot is inserted until its multiplicity is \\(k\\); then each piece is a Bézier curve of its \\(k+1\\) points. The number of pieces \\(m\\) is one more than the number \\(r\\) of distinct interior knots.'),
                text('Za točke \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) in vozle \\((0,0,0,1,2,2,2)\\) sta odseka \\((0,0)\\), \\((1,2)\\), \\((2,2)\\) in \\((2,2)\\), \\((3,2)\\), \\((4,0)\\); stična točka \\((2,2)\\) je \\(\\tfrac12P_1+\\tfrac12P_2\\). Premik kontrolne točke spremeni le odseke v njenem nosilcu, ostali ostanejo isti; vsak odsek lahko odpreš kot navadno Bézierjevo krivuljo.',
                     'For the points \\((0,0)\\), \\((1,2)\\), \\((3,2)\\), \\((4,0)\\) and the knots \\((0,0,0,1,2,2,2)\\) the pieces are \\((0,0)\\), \\((1,2)\\), \\((2,2)\\) and \\((2,2)\\), \\((3,2)\\), \\((4,0)\\); the junction \\((2,2)\\) is \\(\\tfrac12P_1+\\tfrac12P_2\\). Moving a control point changes only the pieces in its support while the others stay the same; each piece can be opened as an ordinary Bézier curve.'),
            ],
        }),
    ],
};
