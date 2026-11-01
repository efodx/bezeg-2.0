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
    'foundations.reading-bernstein.bernstein': copy(
        'Štiri barvno napolnjena območja, naložena druga na drugo, ki skupaj zapolnijo pas do višine 1 nad intervalom od 0 do 1.',
        'Four colour-filled regions stacked on top of each other, together filling a band up to height 1 over the interval from 0 to 1.',
        'Štiri kubične Bernsteinove funkcije so naložene druga na drugo, zgornji rob pa je pri vsakem t na višini 1. Do tega pogleda prideš z vklopom naloženega ploščinskega grafikona pri stopnji 3.',
        'The four cubic Bernstein functions are stacked on top of each other, and the top edge is at height 1 for every t. Reach this view by turning on the stacked area chart at degree 3.',
    ),
    'rational-curves.homogeneous.rational-decasteljau': copy(
        'Racionalna kvadratna Bézierjeva krivulja z utežmi 1, 2, 1, njenimi tremi kontrolnimi točkami in konstrukcijsko shemo pri t = 0,5; krivulja je narisana do te vrednosti.',
        'A rational quadratic Bézier curve with weights 1, 2, 1, its three control points and the construction scheme at t = 0.5; the curve is drawn up to that value.',
        'Pri utežeh 1, 2, 1 in t = 0,5 sta vmesni točki sheme v (−4/3, 1) in (4/3, 1), končna točka pa v (0, 1) in leži na krivulji. Do tega pogleda prideš v koraku Projekcija v ravnino.',
        'With weights 1, 2, 1 and t = 0.5 the intermediate points of the scheme are at (−4/3, 1) and (4/3, 1), and the final point is at (0, 1) on the curve. Reach this view in the step Projection to the plane.',
    ),
    'rational-curves.investigate-rational.rational-extrapolation': copy(
        'Racionalna Bézierjeva krivulja, podaljšana prek svojega konca, s tremi vidnimi kontrolnimi točkami nove krivulje in oznakami njihovih uteži; tretja kontrolna točka z utežjo 0,52 je zunaj slike.',
        'A rational Bézier curve extended past its end, with three visible control points of the new curve and their weight labels; the third control point, with weight 0.52, lies outside the picture.',
        'Po podaljšanju pri t = 1,2 ima nova krivulja uteži 1; 2,2; 0,52; 1,144, njena zadnja kontrolna točka (3,05; −3) pa je točka prvotne krivulje pri t = 1,2. Črta za njo je predogled naslednjega podaljšanja. Do tega pogleda prideš z nastavitvijo parametra na 1,2 in pritiskom na Ekstrapoliraj.',
        'After the extension at t = 1.2 the new curve has weights 1, 2.2, 0.52, 1.144, and its last control point (3.05, −3) is the point of the original curve at t = 1.2. The line beyond it previews the next extension. Reach this view by setting the parameter to 1.2 and pressing Extrapolate.',
    ),
    'rational-curves.operations.farin': copy(
        'Racionalna kubična Bézierjeva krivulja s štirimi kontrolnimi točkami in tremi Farinovimi točkami, vsako na svoji daljici med sosednjima kontrolnima točkama.',
        'A rational cubic Bézier curve with four control points and three Farin points, each on its own edge between neighbouring control points.',
        'Farinove točke so tri, po ena na vsaki daljici med sosednjimi kontrolnimi točkami; to so drsniki po daljicah. Do tega pogleda prideš z vklopom Farinovih točk.',
        'There are three Farin points, one on each edge between neighbouring control points; they are sliders along the edges. Reach this view by turning on the Farin points.',
    ),
    'rational-curves.operations.rational-elevation': copy(
        'Racionalna Bézierjeva krivulja stopnje 4 s petimi kontrolnimi točkami, kontrolnim poligonom in utežmi ob točkah.',
        'A rational Bézier curve of degree 4 with five control points, its control polygon and the weights beside the points.',
        'Po enem višanju ima krivulja pet kontrolnih točk z utežmi 1; 7/4; 3/2; 1; 1 in poteka po isti krivulji kot prej; druga točka je (−22/7, 15/7), ne (−13/4, 3/2) kot pri neuteženem višanju. Do tega pogleda prideš s pritiskom na Dvigni stopnjo.',
        'After one elevation the curve has five control points with weights 1, 7/4, 3/2, 1, 1 and follows the same curve as before; the second point is (−22/7, 15/7), not (−13/4, 3/2) as with unweighted elevation. Reach this view by pressing Elevate degree.',
    ),
    'rational-curves.operations.rational-subdivision': copy(
        'Racionalna Bézierjeva krivulja, razrezana pri t = 0,5 na dva dela s skupno točko in oznakami uteži.',
        'A rational Bézier curve cut at t = 0.5 into two parts sharing a point, with the weight labels.',
        'Rez pri t = 0,5 da dva racionalna dela z utežmi 1; 3/2; 3/2; 11/8 in 11/8; 5/4; 1; 1, ki se srečata v (−9/11, 21/11) in skupaj narišeta isto krivuljo. Do tega pogleda prideš s pritiskom na Subdiviziraj pri privzetem t = 0,5.',
        'Cutting at t = 0.5 gives two rational parts with weights 1, 3/2, 3/2, 11/8 and 11/8, 5/4, 1, 1, which meet at (−9/11, 21/11) and together trace the same curve. Reach this view by pressing Subdivide at the default t = 0.5.',
    ),
    // splines, batch 03b-B.
    'splines.continuity-levels.spline-c1': copy(
        'Zlepek C1 iz dveh kvadratnih Bézierjevih odsekov s štirimi prostimi točkami, stično točko in kontrolnim poligonom.',
        'A C1 spline of two quadratic Bézier pieces with four free points, the joint and the control polygon.',
        'Stična točka (0; 2) je razpolovišče stranice med drugo in tretjo prosto točko. Odvoda obeh odsekov sta tam enaka, (8; 0), zato se krivulja gladko dotika vodoravne stranice poligona. Do tega pogleda prideš z vklopom kontrolnega poligona.',
        'The joint (0, 2) is the midpoint of the edge between the second and third free points. The derivatives of both pieces there are equal, (8, 0), so the curve touches the horizontal polygon edge smoothly. Reach this view by turning on the control polygon.',
    ),
    'splines.continuity-levels.spline-c2': copy(
        'Zlepek C2 iz treh kubičnih Bézierjevih odsekov s šestimi prostimi točkami, izpeljanimi točkami in kontrolnim poligonom.',
        'A C2 spline of three cubic Bézier pieces with six free points, the derived points and the control polygon.',
        'Stični točki (−2,5; −1) in (2,5; 0) sta na sredini med sosednjima notranjima točkama odsekov, (−4; 0) in (−1; −2) oziroma (1; −1) in (4; 1). Na obeh stikih se ujemata prvi in drugi odvod. Do tega pogleda prideš z vklopom kontrolnega poligona.',
        'The joints (−2.5, −1) and (2.5, 0) lie midway between the neighbouring inner points of the pieces, (−4, 0) and (−1, −2), and (1, −1) and (4, 1). At both joints the first and second derivatives agree. Reach this view by turning on the control polygon.',
    ),
    'splines.geometric-vs-parametric.spline-g1': copy(
        'Zlepek G1 iz dveh kvadratnih Bézierjevih odsekov s štirimi prostimi točkami, izpeljano točko in kontrolnim poligonom.',
        'A G1 spline of two quadratic Bézier pieces with four free points, the derived point and the control polygon.',
        'Pri b = 1 je izpeljana točka (2; −2) in leži na isti premici kot (−2; 2) in stična točka (0; 0). Tangenti obeh odsekov sta v stiku vzporedni in enako usmerjeni. Do tega pogleda prideš z vklopom kontrolnega poligona pri b = 1.',
        'At b = 1 the derived point is (2, −2) and lies on one line with (−2, 2) and the joint (0, 0). The tangents of both pieces at the joint are parallel and point the same way. Reach this view by turning on the control polygon at b = 1.',
    ),
    'splines.geometric-vs-parametric.spline-g1-symmetric': copy(
        'Simetrični zlepek G1 iz dveh kvadratnih Bézierjevih odsekov s štirimi prostimi točkami, stično točko blizu druge proste točke in kontrolnim poligonom.',
        'A symmetric G1 spline of two quadratic Bézier pieces with four free points, the joint near the second free point and the control polygon.',
        'Pri β1 = 0,25 je stična točka (−1; 1,5), bliže drugi prosti točki na stranici poligona. Odvoda sta (4; −2) in (12; −6), vzporedna, desni je trikrat večji. Do tega pogleda prideš z nastavitvijo β1 na 0,25 ter vklopom kontrolnega poligona.',
        'At β1 = 0.25 the joint is (−1, 1.5), closer to the second free point on the polygon edge. The derivatives are (4, −2) and (12, −6), parallel, the right one three times larger. Reach this view by setting β1 to 0.25 and turning on the control polygon.',
    ),
    'splines.piecewise.spline-cn': copy(
        'Zlepek iz dveh kvadratnih Bézierjevih odsekov s štirimi prostimi točkami, izpeljano točko in kontrolnim poligonom.',
        'A spline of two quadratic Bézier pieces with four free points, the derived point and the control polygon.',
        'Izpeljana točka (2; −4) je podaljšek zadnje stranice prvega odseka: stična točka (0; −3) je na sredini med (−2; −2) in njo. Odvoda obeh odsekov v stiku sta enaka, (8; −4). Do tega pogleda prideš z vklopom kontrolnega poligona.',
        'The derived point (2, −4) extends the last edge of the first piece: the joint (0, −3) is midway between (−2, −2) and it. The derivatives of both pieces at the joint are equal, (8, −4). Reach this view by turning on the control polygon.',
    ),
};

