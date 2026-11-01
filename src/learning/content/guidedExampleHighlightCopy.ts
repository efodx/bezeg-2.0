import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Card copy for examples whose captured image is an authored highlight state (kind 'highlight' in
 * `guidedExampleHighlightRecipes`), keyed by example id. Examples without an entry use the demonstration copy.
 * Captions are plain text: the card does not typeset math.
 */
export const guidedExampleHighlightCopy: Readonly<Record<string, GuidedExamplePreviewCopy>> = {
    'ph-curves.offsets.ph-quintic-offsets': copy(
        'Kvintična PH-krivulja v zeleni barvi s kontrolnimi točkami in njen modri odmik na eni strani krivulje.',
        'The quintic PH curve in green with its control points and its blue offset on one side of the curve.',
        'Odmik pri d = 0,5 je vzdolž normale na razdalji 0,5 od krivulje. Do tega pogleda prideš z vklopom odmika pri tej razdalji; slika sama ne dokazuje, da je odmik gladek.',
        'The offset at d = 0.5 lies along the normal at distance 0.5 from the curve. Turn on the offset at that distance to reach this view; the picture alone does not prove the offset is smooth.',
    ),
    'rational-curves.why-rational.rational-weight': copy(
        'Racionalna kubična Bézierjeva krivulja z utežmi 1, 2, 1, 1, kontrolnimi točkami in označeno točko R(1/2).',
        'A rational cubic Bézier curve with weights 1, 2, 1, 1, its control points and the marked point R(1/2).',
        'Pri utežeh 1, 2, 1, 1 večja druga utež potegne krivuljo proti drugi kontrolni točki; označena točka je R(1/2) = (−9/11, 21/11), krajišči pa nista odvisni od uteži.',
        'With weights 1, 2, 1, 1 the larger second weight pulls the curve toward the second control point; the marked point is R(1/2) = (−9/11, 21/11), and the endpoints do not depend on the weights.',
    ),
    'parametrization.weighted-knot.weighted-parameterization': copy(
        'Ista Bézierjeva krivulja kot v začetnem prizoru, z α = 1/4 in tremi označenimi vzorci, pomaknjenimi proti koncu krivulje.',
        'The same Bézier curve as in the start scene, with α = 1/4 and three marked samples shifted toward the end of the curve.',
        'Pri α = 1/4 so vzorci v točkah B(φ(k/4)) za k = 1, 2, 3, torej pri parametrih 1/2, 3/4 in 9/10, zato se zgostijo proti koncu; razmiki so opazka, ne dokaz o hitrosti.',
        'At α = 1/4 the samples sit at B(φ(k/4)) for k = 1, 2, 3, that is at parameters 1/2, 3/4 and 9/10, so they bunch toward the end; the spacing is an observation, not a speed proof.',
    ),
    'bezier-curves.affine-transformations.affine': copy(
        'Asimetrična kubična Bézierjeva krivulja s kontrolnim poligonom, zasukana za četrt kroga, z označeno točko pri t = 0,5.',
        'An asymmetric cubic Bézier curve with its control polygon, turned by a quarter turn, with the point at t = 0.5 marked.',
        'Zasuk vseh štirih kontrolnih točk za četrt kroga okoli (3, 1) zasuka krivuljo in njeno označeno točko (9/4, 1) na enak način. Do tega pogleda prideš v tretjem koraku lekcije, ki obrne krivuljo.',
        'Turning all four control points a quarter turn about (3, 1) turns the curve and its marked point (9/4, 1) the same way. Reach this view in the lesson step that turns the curve.',
    ),
    'bezier-curves.bernstein-form.bernstein': copy(
        'Štiri kubične Bernsteinove funkcije na intervalu od 0 do 1; zunanji dve dosežeta 1 v krajiščih, srednji dve imata vrh znotraj intervala.',
        'Four cubic Bernstein functions on the interval from 0 to 1; the outer two reach 1 at the end points, the middle two peak inside the interval.',
        'Pri t = 0,5 imajo štiri kubične uteži vrednosti 1/8, 3/8, 3/8 in 1/8, skupaj 1. Do tega pogleda prideš s stopnjo 3 v lekciji o Bernsteinovi obliki; slika sama ne označuje t = 0,5.',
        'At t = 0.5 the four cubic weights are 1/8, 3/8, 3/8 and 1/8, which add to 1. Reach this view with degree 3 in the Bernstein form lesson; the picture itself does not mark t = 0.5.',
    ),
    'bezier-curves.control-points.bezier': copy(
        'Kubična Bézierjeva krivulja s štirimi kontrolnimi točkami, poligonom, konveksno ovojnico in označeno točko (0, 1).',
        'A cubic Bézier curve with four control points, polygon, convex hull and the marked point (0, 1).',
        'Označena točka krivulje (0, 1) pri t = 0,5 leži znotraj konveksne ovojnice štirih kontrolnih točk. Do tega pogleda prideš v koraku izračuna pri t = 1/2.',
        'The marked curve point (0, 1) at t = 0.5 lies inside the convex hull of the four control points. Reach this view in the evaluation step at t = 1/2.',
    ),
    'bezier-curves.interpolation.alternative-recursion': copy(
        'Bézierjeva krivulja stopnje 4 s petimi kontrolnimi točkami, dvema pomožnima točkama in glavno točko pri t = 0,25.',
        'A degree 4 Bézier curve with five control points, two helper points and the main point at t = 0.25.',
        'Pri t = 0,25 je glavna točka tri četrtine prve in četrtino druge pomožne točke, zato leži na četrtini daljice med njima. Do tega pogleda prideš z drsnikom t na 0,25.',
        'At t = 0.25 the main point is three quarters of the first helper point plus a quarter of the second, so it sits a quarter of the way along the segment between them. Reach this view by setting the t slider to 0.25.',
    ),
    'bezier-curves.interpolation.decasteljau': copy(
        'Kubična Bézierjeva krivulja s konstrukcijo de Casteljauja: vrstice s tremi, dvema in eno točko ter končna točka (0, 1).',
        'A cubic Bézier curve with the de Casteljau construction: rows of three, two and one point, and the final point (0, 1).',
        'Tri vrstice sredin zmanjšajo štiri kontrolne točke na točko krivulje (0, 1) pri t = 0,5. Do tega pogleda prideš v koraku o kubični krivulji.',
        'Three rows of midpoints reduce four control points to the curve point (0, 1) at t = 0.5. Reach this view in the cubic curve step.',
    ),
    'bezier-curves.next-ideas.elevation': copy(
        'Kubična Bézierjeva krivulja po zvišanju stopnje, s petimi kontrolnimi točkami in označeno točko pri t = 0,75.',
        'A cubic Bézier curve after degree elevation, with five control points and a marked point at t = 0.75.',
        'Zvišanje stopnje doda peto kontrolno točko, krivulja pa ostane enaka. Do tega pogleda prideš s pritiskom na Dvigni stopnjo v koraku samostojne primerjave.',
        'Degree elevation adds a fifth control point and leaves the curve unchanged. Reach this view by pressing Elevate degree in the independent comparison step.',
    ),
    'bezier-curves.next-ideas.extrapolation': copy(
        'Bézierjeva krivulja, podaljšana prek svojega konca, s štirimi kontrolnimi točkami nove krivulje.',
        'A Bézier curve extended past its end, with the four control points of the new curve.',
        'Krivulja je podaljšana do t = 1,2: najprej ponovi staro krivuljo, nato jo nadaljuje do novega konca (3,06; −3,87), ki je zadnja kontrolna točka. Črta za njim je predogled naslednjega podaljšanja. Do tega pogleda prideš z nastavitvijo parametra ekstrapolacije na 1,2 in pritiskom na Ekstrapoliraj.',
        'The curve is continued to t = 1.2: it first retraces the old curve, then runs on to the new end (3.06, −3.87), its last control point. The line beyond it previews the next extension. Reach this view by setting the extrapolation parameter to 1.2 and pressing Extrapolate.',
    ),
    'bezier-curves.next-ideas.repeated-subdivision': copy(
        'Bézierjeva krivulja, razdeljena na osem kosov, katerih kontrolni poligoni se tesno prilegajo krivulji.',
        'A Bézier curve split into eight pieces whose control polygons hug the curve closely.',
        'Trije koraki razpolovitve dajo osem kosov, katerih poligoni se že tesno prilegajo krivulji. Do tega pogleda prideš s trikratnim pritiskom na Subdiviziraj.',
        'Three halving steps give eight pieces whose polygons already hug the curve. Reach this view by pressing Subdivide three times.',
    ),
    'bezier-curves.next-ideas.subdivision': copy(
        'Kubična Bézierjeva krivulja, razrezana pri t = 0,5 na dva dela s skupno točko (0, 3/2).',
        'A cubic Bézier curve cut at t = 0.5 into two parts sharing the point (0, 3/2).',
        'Rez pri t = 0,5 da dve kubični krivulji, ki se srečata v (0, 3/2) in skupaj narišeta isto krivuljo. Do tega pogleda prideš s pritiskom na Subdiviziraj pri privzetem t = 0,5.',
        'Cutting at t = 0.5 gives two cubics that meet at (0, 3/2) and together trace the same curve. Reach this view by pressing Subdivide at the default t = 0.5.',
    ),
};

