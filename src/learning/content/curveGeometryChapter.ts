import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    CURVE_GEOMETRY_CHAPTER_ID, curveGeometryGuidedExampleDemonstration, type CurveGeometrySectionId,
} from './curveGeometryChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: CurveGeometrySectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = curveGeometryGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${CURVE_GEOMETRY_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Curve geometry batches 1 to 3: L1 parametric and polar curves, L2 curvature and the osculating circle, L3 the curvature comb and spline joins, L4 the evolute, L5 offset curves and L6 the envelope of de Casteljau lines. */
export const curveGeometryChapter: FamilyChapter = {
    id: CURVE_GEOMETRY_CHAPTER_ID,
    family: '/bezeg-2.0/curve-geometry',
    title: text('Geometrija krivulj', 'Geometry of curves'),
    purpose: text(
        'Krivuljo opišemo s sledjo in z zakonom gibanja, nato pa iz odvodov preberemo, kako se zavija. Poglavje najprej loči parametrične in polarne krivulje, na cikloidi izračuna dolžino loka in ploščino, nato pa pokaže ukrivljenost in krivinsko krožnico, ki se krivulji v dani točki najbolje prilega, nato glavnik ukrivljenosti, ki pokaže ukrivljenost vzdolž krivulje in skoke na stikih zlepkov, na koncu pa evoluto, sled središč krivinskih krožnic.',
        'A curve is described by its trace and by a rule of motion, and the derivatives then tell how it bends. The chapter first separates parametric and polar curves and computes arc length and area on the cycloid, then shows the curvature and the osculating circle, the circle that fits the curve best at a given point, then the curvature comb, which shows the curvature along the curve and the jumps at spline joins, and finally the evolute, the track of the centres of the osculating circles.',
    ),
    prerequisites: text(
        'Parametrizacija (sled in parameter), hitrost kot dolžina odvoda, kot jo uporabljajo PH-krivulje, Bézierjeve krivulje ter odvod in integral iz poglavja Funkcije in računanje. Dovolj je, da znaš odvajati \\(r(t)=(x(t),y(t))\\) po komponentah.',
        'Parametrization (trace and parameter), speed as the length of the derivative as used for PH curves, Bézier curves, and the derivative and integral from the chapter Functions and calculus. It is enough to be able to differentiate \\(r(t)=(x(t),y(t))\\) componentwise.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/parametrization', title: text('Parametrizacija: kako hitro prehodimo pot', 'Parametrization: how quickly a path is traversed')},
        {path: '/bezeg-2.0/learn/ph-curves', title: text('PH-krivulje: polinomska dolžina loka', 'PH curves: polynomial arc length')},
        {path: '/bezeg-2.0/learn/bezier-curves', title: text('Bézierjeve krivulje', 'Bézier curves')},
        {path: '/bezeg-2.0/learn/functions-and-calculus', title: text('Funkcije in računanje', 'Functions and calculus')},
    ],
    sections: [
        {
            id: 'curve-geometry-idea',
            title: text('Sled, gibanje in zavijanje', 'Trace, motion and bending'),
            paragraphs: [
                text('Cilj razdelka: znaš povedati, katere količine krivulje določa sama sled in katere tudi hitrost, s katero jo prehodimo. V poglavju o parametrizaciji smo ločili sled krivulje od parametra. Tu to uporabimo: dolžina loka in ploščina sta količini sledi, vendar ju računamo iz odvoda, torej iz hitrosti \\(|r^{\\prime}(t)|\\).',
                     'Goal of the section: you can say which quantities of a curve are fixed by the trace alone and which also depend on the speed at which it is traversed. In the parametrization chapter we separated the trace of a curve from its parameter. Here we put that to use: arc length and area are quantities of the trace, but we compute them from the derivative, that is, from the speed \\(|r^{\\prime}(t)|\\).'),
                text('Krivuljo lahko podamo parametrično, kot \\(r(t)=(x(t),y(t))\\), ali polarno, kot \\(\\rho=f(\\theta)\\), kjer je \\(\\rho\\) razdalja od izhodišča na poltraku s kotom \\(\\theta\\). Polarna krivulja je poseben primer parametrične: \\(r(\\theta)=(f(\\theta)\\cos\\theta,\\,f(\\theta)\\sin\\theta)\\).',
                     'A curve can be given parametrically, as \\(r(t)=(x(t),y(t))\\), or in polar form, as \\(\\rho=f(\\theta)\\), where \\(\\rho\\) is the distance from the origin along the ray with angle \\(\\theta\\). A polar curve is a special case of a parametric one: \\(r(\\theta)=(f(\\theta)\\cos\\theta,\\,f(\\theta)\\sin\\theta)\\).'),
                text('Drugi razdelek je posvečen ukrivljenosti: to je zasuk tangente na enoto dolžine loka. Za razliko od dolžine loka potrebuje drugi odvod, zato je ni mogoče prebrati iz same hitrosti. Primer: dve različni parametrizaciji iste premice imata različni hitrosti, ukrivljenost pa je v obeh primerih enaka nič, ker se tangenta nikjer ne zasuka.',
                     'The second section is about curvature: the turning of the tangent per unit of arc length. Unlike arc length, it needs the second derivative, so it cannot be read from the speed alone. For example, two different parametrizations of the same line have different speeds, yet the curvature is zero in both, because the tangent never turns.'),
            ],
        },
        withExample('curve-parametric', {
            id: 'curve-parametric',
            demonstrationIds: ['curve-parametric'],
            investigationPrompts: {'curve-parametric': text('Napovej pot označene točke na kotalečem se krogu, nato premakni parameter \\(t\\) in preveri, kje je hitrost enaka nič. Preklopi na polarno krivuljo in primerjaj vrednosti \\(\\rho(\\theta)\\) s kardioido.', 'Predict the path of the marked point on a rolling circle, then move the parameter \\(t\\) and check where the speed is zero. Switch to the polar curve and compare the values \\(\\rho(\\theta)\\) with the cardioid.')},
            title: text('Parametrične in polarne krivulje', 'Parametric and polar curves'),
            formula: String.raw`r(t)=(t-\sin t,\;1-\cos t),\qquad |r^{\prime}(t)|=2\sin\tfrac t2`,
            paragraphs: [
                text('Cilj razdelka: znaš zapisati cikloido in kardioido, izračunati dolžino loka ter ploščino in povedati, kje ima cikloida osti. Točka na obodu kotalečega se kroga s polmerom \\(1\\) opiše cikloido \\(r(t)=(t-\\sin t,\\,1-\\cos t)\\). Odvod je \\(r^{\\prime}(t)=(1-\\cos t,\\,\\sin t)\\), hitrost pa \\(|r^{\\prime}(t)|=2\\sin\\tfrac t2\\) za \\(t\\in[0,2\\pi]\\).',
                     'Goal of the section: you can write the cycloid and the cardioid, compute arc length and area, and say where the cycloid has cusps. A point on the rim of a rolling circle of radius \\(1\\) traces the cycloid \\(r(t)=(t-\\sin t,\\,1-\\cos t)\\). The derivative is \\(r^{\\prime}(t)=(1-\\cos t,\\,\\sin t)\\) and the speed is \\(|r^{\\prime}(t)|=2\\sin\\tfrac t2\\) for \\(t\\in[0,2\\pi]\\).'),
                text('Dolžina enega loka je \\(\\int_0^{2\\pi}2\\sin\\tfrac t2\\,dt=8\\), ploščina pod njim pa \\(\\int_0^{2\\pi}(1-\\cos t)^2\\,dt=3\\pi\\). Pri polmeru \\(r\\) se dolžina pomnoži z \\(r\\), ploščina pa z \\(r^2\\). Pri \\(t=0\\) in \\(t=2\\pi\\) je odvod enak nič: tam ima cikloida osti in odvod ne določa smeri tangente.',
                     'The length of one arch is \\(\\int_0^{2\\pi}2\\sin\\tfrac t2\\,dt=8\\), and the area under it is \\(\\int_0^{2\\pi}(1-\\cos t)^2\\,dt=3\\pi\\). For radius \\(r\\) the length is multiplied by \\(r\\) and the area by \\(r^2\\). At \\(t=0\\) and \\(t=2\\pi\\) the derivative is zero: there the cycloid has cusps and the derivative gives no tangent direction.'),
                text('Kardioida je polarna krivulja \\(\\rho=1+\\cos\\theta\\). Pri \\(\\theta=0\\) je \\(\\rho(0)=2\\), pri \\(\\theta=\\pi\\) pa je \\(\\rho=0\\): krivulja se vrne v izhodišče in ima tam ost.',
                     'The cardioid is the polar curve \\(\\rho=1+\\cos\\theta\\). At \\(\\theta=0\\) we have \\(\\rho(0)=2\\), and at \\(\\theta=\\pi\\) we have \\(\\rho=0\\): the curve returns to the origin and has a cusp there.'),
            ],
        }),
        withExample('curve-curvature', {
            id: 'curve-curvature',
            demonstrationIds: ['curve-curvature'],
            investigationPrompts: {'curve-curvature': text('Napovej, kateri konec kubične krivulje se bolj zavije, nato premakni \\(t\\) in preberi polmer krivinske krožnice. Premakni kontrolne točke, da dobiš prevoj, in poglej, kaj se zgodi s krožnico.', 'Predict which end of the cubic bends more, then move \\(t\\) and read the radius of the osculating circle. Move the control points to get an inflection and see what happens to the circle.')},
            title: text('Ukrivljenost in krivinska krožnica', 'Curvature and the osculating circle'),
            formula: String.raw`\kappa=\frac{x^{\prime}y^{\prime\prime}-y^{\prime}x^{\prime\prime}}{\left(x^{\prime2}+y^{\prime2}\right)^{3/2}},\qquad R=\frac1{|\kappa|}`,
            paragraphs: [
                text('Cilj razdelka: znaš izračunati ukrivljenost in polmer krivinske krožnice ter povedati, kaj se zgodi na prevoju. Ukrivljenost \\(\\kappa\\) meri, koliko se tangenta zasuka na enoto dolžine loka. Krivinska krožnica ima polmer \\(R=1/|\\kappa|\\), središče na normali na strani, kamor se krivulja zavija, in se krivulji v dani točki prilega bolje kot katera koli druga krožnica.',
                     'Goal of the section: you can compute the curvature and the radius of the osculating circle and say what happens at an inflection. The curvature \\(\\kappa\\) measures how much the tangent turns per unit of arc length. The osculating circle has radius \\(R=1/|\\kappa|\\), its centre on the normal on the side to which the curve bends, and it fits the curve at the given point better than any other circle.'),
                text('Za parabolo \\(y=x^2\\) je \\(\\kappa=2/(1+4x^2)^{3/2}\\). Pri \\(x=0\\) je \\(\\kappa(0)=2\\), polmer \\(\\tfrac12\\) in središče \\((0,\\tfrac12)\\). Pri \\(x=1\\) je \\(\\kappa\\approx0{,}17889\\), polmer približno \\(5{,}5902\\) in središče \\((-4;\\,3{,}5)\\): krivulja je tam bistveno bolj položna.',
                     'For the parabola \\(y=x^2\\) we have \\(\\kappa=2/(1+4x^2)^{3/2}\\). At \\(x=0\\), \\(\\kappa(0)=2\\), the radius is \\(\\tfrac12\\) and the centre is \\((0,\\tfrac12)\\). At \\(x=1\\), \\(\\kappa\\approx0.17889\\), the radius is about \\(5.5902\\) and the centre is \\((-4,\\,3.5)\\): there the curve is much flatter.'),
                text('Kubična Bézierjeva krivulja s točkami \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) ima v prvem krajišču \\(\\kappa(0)=\\tfrac23\\), pri \\(t=\\tfrac12\\) vrednost \\(0{,}23570\\) in v drugem krajišču \\(0{,}05963\\). Prvi konec se torej bolj zavije. Na prevoju je \\(\\kappa=0\\): krožnica preide v premico, polmer pa je neskončen.',
                     'The cubic Bézier curve with the points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) has \\(\\kappa(0)=\\tfrac23\\) at its first endpoint, \\(0.23570\\) at \\(t=\\tfrac12\\) and \\(0.05963\\) at the other endpoint. The first end therefore bends more. At an inflection \\(\\kappa=0\\): the circle becomes a line and the radius is infinite.'),
                text('Za polarno krivuljo je \\(\\kappa=(\\rho^2+2\\rho^{\\prime2}-\\rho\\rho^{\\prime\\prime})/(\\rho^2+\\rho^{\\prime2})^{3/2}\\). Pri kardioidi \\(\\rho=1+\\cos\\theta\\) je pri \\(\\theta=0\\) \\(\\rho=2\\), \\(\\rho^{\\prime}=0\\) in \\(\\rho^{\\prime\\prime}=-1\\), zato je \\(\\kappa(0)=\\tfrac{4+2}{8}=\\tfrac34\\).',
                     'For a polar curve \\(\\kappa=(\\rho^2+2\\rho^{\\prime2}-\\rho\\rho^{\\prime\\prime})/(\\rho^2+\\rho^{\\prime2})^{3/2}\\). For the cardioid \\(\\rho=1+\\cos\\theta\\) at \\(\\theta=0\\) we have \\(\\rho=2\\), \\(\\rho^{\\prime}=0\\) and \\(\\rho^{\\prime\\prime}=-1\\), so \\(\\kappa(0)=\\tfrac{4+2}{8}=\\tfrac34\\).'),
            ],
        }),
        withExample('curve-comb', {
            id: 'curve-comb',
            demonstrationIds: ['curve-comb'],
            investigationPrompts: {'curve-comb': text('Napovej, kje je kubična krivulja najbolj ravna, nato vklopi glavnik in preveri. Primerjaj stike zlepkov C1, C2 in G1 ter premakni parameter \\(b\\) zlepka G1.', 'Predict where the cubic is flattest, then switch the comb on and check. Compare the joins of the C1, C2 and G1 splines and move the parameter \\(b\\) of the G1 spline.')},
            title: text('Glavnik ukrivljenosti in stiki zlepkov', 'Curvature comb and spline joins'),
            formula: String.raw`\ell(t)=g\,|\kappa(t)|,\qquad \Delta\kappa=\kappa_{+}-\kappa_{-}`,
            paragraphs: [
                text('Cilj razdelka: znaš z glavnikom prebrati ukrivljenost vzdolž krivulje in povedati, kdaj ima zlepek na stiku skok ukrivljenosti. Glavnik v vsaki točki krivulje nariše zob, ki je pravokoten na krivuljo in ima dolžino \\(\\ell=g\\,|\\kappa|\\), kjer je \\(g\\) ojačitev. Kjer so zobje kratki, je krivulja ravna, kjer so dolgi, se močno zavija.',
                     'Goal of the section: you can read the curvature along a curve from the comb and say when a spline has a jump of curvature at a join. At every point of the curve the comb draws a tooth that is normal to the curve and has the length \\(\\ell=g\\,|\\kappa|\\), where \\(g\\) is the gain. Where the teeth are short the curve is flat, where they are long it bends strongly.'),
                text('Kubična krivulja s točkami \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) ima pri \\(t=0\\) vrednost \\(\\kappa=\\tfrac23\\), pri \\(t=1\\) pa \\(0{,}05963\\): glavnik je na koncu \\((3,3)\\) najkrajši, krivulja je tam najbolj ravna.',
                     'The cubic with the points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) has \\(\\kappa=\\tfrac23\\) at \\(t=0\\) and \\(0.05963\\) at \\(t=1\\): the comb is shortest at the end \\((3,3)\\), where the curve is flattest.'),
                text('Zlepek je sestavljen iz odsekov, ki se stikajo v vozlih. Glavnik se na stiku prekine, odčitek pa navede ukrivljenost tik pred stikom in tik za njim. Kvadratni zlepek C1 ima zvezno tangento, vendar ukrivljenost na stiku skoči. Kubični zlepek C2 ima zvezen tudi drugi odvod, zato je glavnik na regularnem stiku zvezen. Pri zlepku G1 skok določa prosti parameter \\(b\\).',
                     'A spline is made of spans that meet at knots. The comb breaks at a join and the readout gives the curvature just before and just after it. The quadratic C1 spline has a continuous tangent, yet its curvature jumps at a join. The cubic C2 spline also has a continuous second derivative, so its comb is continuous at a regular join. For the G1 spline the free parameter \\(b\\) sets the jump.'),
                text('Iz C2 sledi G2 le za regularne krivulje: pri točki z ničelno hitrostjo ukrivljenost ni določena, zato zveznost glavnika tam ni zagotovljena.',
                     'C2 implies G2 for regular curves only: at a point of zero speed the curvature is not defined, so a continuous comb is not guaranteed there.'),
            ],
        }),
        withExample('curve-evolute', {
            id: 'curve-evolute',
            demonstrationIds: ['curve-evolute'],
            investigationPrompts: {'curve-evolute': text('Napovej, kam gre središče krivinske krožnice, ko \\(t\\) teče po paraboli, nato vklopi sled evolute in normalo. Poišči ost nad temenom.', 'Predict where the centre of the osculating circle goes as \\(t\\) runs along the parabola, then switch on the trace of the evolute and the normal. Find the cusp above the vertex.')},
            title: text('Evoluta', 'Evolute'),
            formula: String.raw`E(t)=r(t)+\frac{1}{\kappa(t)}\,N(t)`,
            paragraphs: [
                text('Cilj razdelka: znaš evoluto opisati kot sled središč krivinskih krožnic in na njej prepoznati osti. Ko se točka premika po krivulji, se središče krivinske krožnice premika po drugi krivulji, evoluti. Točka evolute leži na normali na razdalji \\(R=1/|\\kappa|\\) od krivulje, na strani, kamor se krivulja zavija.',
                     'Goal of the section: you can describe the evolute as the track of the centres of the osculating circles and recognise its cusps. As a point moves along a curve, the centre of the osculating circle moves along another curve, the evolute. A point of the evolute lies on the normal at the distance \\(R=1/|\\kappa|\\) from the curve, on the side to which the curve turns.'),
                text('Za parabolo \\(y=x^2\\) je \\(E(x)=(-4x^3,3x^2+\\tfrac12)\\). Pri \\(x=1\\) je \\(E=(-4,\\tfrac72)\\), pri \\(x=0\\) pa \\(E=(0,\\tfrac12)\\). Točka evolute gre v nasprotno smer kot točka na paraboli.',
                     'For the parabola \\(y=x^2\\) we have \\(E(x)=(-4x^3,3x^2+\\tfrac12)\\). At \\(x=1\\) this gives \\(E=(-4,\\tfrac72)\\) and at \\(x=0\\) it gives \\(E=(0,\\tfrac12)\\). The point of the evolute moves against the point on the parabola.'),
                text('Odvod evolute ima smer normale krivulje, zato so normale tangente evolute. Kjer ima \\(\\kappa\\) lokalni ekstrem, ima krivulja teme, odvod evolute je tam enak \\(0\\) in evoluta ima ost. Pri paraboli je to točka \\((0,\\tfrac12)\\) nad temenom \\((0,0)\\).',
                     'The derivative of the evolute has the direction of the normal of the curve, so the normals are tangents of the evolute. Where \\(\\kappa\\) has a local extremum the curve has a vertex, the derivative of the evolute is \\(0\\) there and the evolute has a cusp. For the parabola this is the point \\((0,\\tfrac12)\\) above the vertex \\((0,0)\\).'),
                text('Na prevoju je \\(\\kappa=0\\): krivinska krožnica je premica, njeno središče je neskončno daleč in točke evolute ni. Sled se tam prekine.',
                     'At an inflection \\(\\kappa=0\\): the osculating circle is a line, its centre is infinitely far away and there is no point of the evolute. The trace breaks there.'),
            ],
        }),
        withExample('curve-offset', {
            id: 'curve-offset',
            demonstrationIds: ['curve-offset'],
            investigationPrompts: {'curve-offset': text('Napovej, kje leži vzporednica parabole pri \\(d=-\\tfrac14\\), nato povečuj \\(|d|\\), dokler ne nastane ost. Vklopi osti in graf faktorja hitrosti ter primerjaj ničli z osmi.', 'Predict where the offset of the parabola lies at \\(d=-\\tfrac14\\), then increase \\(|d|\\) until a cusp forms. Switch on the cusps and the graph of the speed factor and compare its zeros with the cusps.')},
            title: text('Vzporedne krivulje', 'Offset curves'),
            formula: String.raw`O_d(t)=r(t)+d\,N(t),\qquad O_d^{\prime}(t)=(1+d\kappa)\,\lvert r^{\prime}(t)\rvert\,T(t)`,
            paragraphs: [
                text('Cilj razdelka: znaš razložiti, zakaj vzporednica Bézierove krivulje v splošnem ni Bézierova krivulja, in poiskati njene osti. Vzporednica na razdalji \\(d\\) je krivulja \\(O_d(t)=r(t)+d\,N(t)\\), kjer je \\(N\\) desna enotska normala; negativna in pozitivna \\(d\\) ležita na nasprotnih straneh krivulje.',
                     'Goal of the section: you can explain why the offset of a Bézier curve is in general not a Bézier curve, and find its cusps. The offset at the distance \\(d\\) is the curve \\(O_d(t)=r(t)+d\,N(t)\\), where \\(N\\) is the unit right normal; negative and positive \\(d\\) lie on opposite sides of the curve.'),
                text('Hitrost vzporednice je \\((1+d\\kappa)\\) krat hitrost krivulje, zato je vzporednica regularna, dokler je \\(1+d\\kappa\\ne0\\). Pri \\(d=-\\tfrac1\\kappa\\) dobi ost, in ta točka je središče krivinske krožnice, torej točka evolute. Pri paraboli \\(y=x^2\\) je prva ost pri \\(d=-\\tfrac12\\) v točki \\((0,\\tfrac12)\\), pri \\(d=-1\\) pa sta dve, pri \\(x=\\pm0{,}38321\\).',
                     'The speed of the offset is \\((1+d\\kappa)\\) times the speed of the curve, so the offset is regular as long as \\(1+d\\kappa\\ne0\\). At \\(d=-\\tfrac1\\kappa\\) it gets a cusp, and that point is the centre of the osculating circle, so a point of the evolute. For the parabola \\(y=x^2\\) the first cusp is at \\(d=-\\tfrac12\\) at the point \\((0,\\tfrac12)\\), and at \\(d=-1\\) there are two, at \\(x=\\pm0.38321\\).'),
                text('Narisana vzporednica je vzorčena, zato je približna; vzporednica PH krivulje je točna racionalna krivulja. Slika prikazuje le lokalne osti, globalnih samopresekov vzporednice ne iščemo.',
                     'The drawn offset is sampled, so it is approximate; the offset of a PH curve is an exact rational curve. The picture shows local cusps only, global self-intersections of the offset are not solved.'),
            ],
        }),
        withExample('curve-envelope', {
            id: 'curve-envelope',
            demonstrationIds: ['curve-envelope'],
            investigationPrompts: {'curve-envelope': text('Napovej, kaj tvori roj premic skozi točki \\(Q_0(t)\\) in \\(Q_1(t)\\), nato povečuj število premic. Premakni srednjo kontrolno točko in preveri, ali se premice še dotikajo krivulje; poišči lego, pri kateri ovojnice ni.', 'Predict what the swarm of lines through the points \\(Q_0(t)\\) and \\(Q_1(t)\\) forms, then increase the number of lines. Move the middle control point and check whether the lines still touch the curve; find the position where there is no envelope.')},
            title: text('Ovojnica premic', 'The envelope of lines'),
            formula: String.raw`\frac{x}{1-t}+\frac{y}{t}=1\ \Longrightarrow\ \sqrt{x}+\sqrt{y}=1`,
            paragraphs: [
                text('Cilj razdelka: znaš razložiti, da je kvadratna Bézierova krivulja ovojnica premic, ki povezujejo istoležni točki \\(Q_0(t)\\) in \\(Q_1(t)\\) prve vrstice de Casteljaujeve sheme. Ovojnica družine premic je krivulja, ki se je dotika vsaka premica družine; premica pri \\(t\\) se krivulje dotika v točki \\(B(t)\\).',
                     'Goal of the section: you can explain that a quadratic Bézier curve is the envelope of the lines joining the corresponding points \\(Q_0(t)\\) and \\(Q_1(t)\\) of the first row of the de Casteljau scheme. The envelope of a family of lines is the curve that every line of the family touches; the line at \\(t\\) touches the curve at the point \\(B(t)\\).'),
                text('Pri kontrolnih točkah \\((1,0)\\), \\((0,0)\\), \\((0,1)\\) je \\(Q_0=(1-t,0)\\), \\(Q_1=(0,t)\\), premica ima enačbo \\(\\tfrac{x}{1-t}+\\tfrac{y}{t}=1\\) in se dotika krivulje v \\(B(t)=((1-t)^2,\\,t^2)\\). Zato je ovojnica krivulja \\(\\sqrt x+\\sqrt y=1\\); pri \\(t=\\tfrac12\\) je \\(B=(\\tfrac14,\\tfrac14)\\) in \\(\\sqrt{\\tfrac14}+\\sqrt{\\tfrac14}=1\\).',
                     'For the control points \\((1,0)\\), \\((0,0)\\), \\((0,1)\\) we get \\(Q_0=(1-t,0)\\), \\(Q_1=(0,t)\\), the line has the equation \\(\\tfrac{x}{1-t}+\\tfrac{y}{t}=1\\) and touches the curve at \\(B(t)=((1-t)^2,\\,t^2)\\). So the envelope is the curve \\(\\sqrt x+\\sqrt y=1\\); at \\(t=\\tfrac12\\) we get \\(B=(\\tfrac14,\\tfrac14)\\) and \\(\\sqrt{\\tfrac14}+\\sqrt{\\tfrac14}=1\\).'),
                text('Ovojnica ostane Bézierova krivulja, ko premikaš srednjo kontrolno točko. Če so kontrolne točke kolinearne, so vse premice ena premica, krivulja je daljica in ovojnice ni. Narišemo največ \\(200\\) premic, zato je slika pri velikem številu premic le približek ovojnice.',
                     'The envelope stays the Bézier curve when you move the middle control point. If the control points are collinear, all the lines are one line, the curve is a segment and there is no envelope. At most \\(200\\) lines are drawn, so the picture is only an approximation of the envelope.'),
            ],
        }),
    ],
};
