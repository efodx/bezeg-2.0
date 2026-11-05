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

/** Curve geometry batch 1 only: L1 parametric and polar curves and L2 curvature and the osculating circle. Later lessons (the comb, offsets, evolutes) are not released and are not mentioned. */
export const curveGeometryChapter: FamilyChapter = {
    id: CURVE_GEOMETRY_CHAPTER_ID,
    family: '/bezeg-2.0/curve-geometry',
    title: text('Geometrija krivulj', 'Geometry of curves'),
    purpose: text(
        'Krivuljo opišemo s sledjo in z zakonom gibanja, nato pa iz odvodov preberemo, kako se zavija. Poglavje najprej loči parametrične in polarne krivulje, na cikloidi izračuna dolžino loka in ploščino, nato pa pokaže ukrivljenost in krivinsko krožnico, ki se krivulji v dani točki najbolje prilega.',
        'A curve is described by its trace and by a rule of motion, and the derivatives then tell how it bends. The chapter first separates parametric and polar curves and computes arc length and area on the cycloid, then shows the curvature and the osculating circle, the circle that fits the curve best at a given point.',
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
    ],
};
