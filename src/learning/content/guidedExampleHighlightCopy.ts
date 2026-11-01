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
    'parametrization.uniform-timing.uniform-parameterization': copy(
        'Kvintična PH-krivulja v enakomerni parametrizaciji z desetimi označenimi točkami, ki so videti enakomerno razporejene po krivulji.',
        'The quintic PH curve in the uniform parameterization with ten marked points that look evenly spread along the curve.',
        'V enakomerni parametrizaciji je vsak od 11 lokov med točkami dolg približno L/11 = 1,52. Redke točke in tetive dolžin lokov ne dokazujejo; enakost sledi iz izračuna loka.',
        'In the uniform parameterization each of the 11 arcs between the points is about L/11 = 1.52 long. Sparse points and chords do not prove equal arc lengths; the equality comes from the arc-length calculation.',
    ),
    'parametrization.weighted-knot.spline-parameterization': copy(
        'Kubični zlepek C2 skozi osem točk pri α = 1 z desetimi označenimi vzorci in vidnimi izpeljanimi točkami.',
        'A C2 cubic spline through eight points at α = 1 with ten marked samples and visible derived points.',
        'Pri α = 1 je parametrski interval odseka sorazmeren z dolžino njegove tetive. Tretja stična točka je približno (−3,325; 0,385), pri α = 0 pa (−2,133; 0), zato α spremeni obliko zlepka, ne le razporeditve vzorcev.',
        'At α = 1 the parameter interval of a piece is proportional to the length of its chord. The third joint is about (−3.325, 0.385), against (−2.133, 0) at α = 0, so α changes the shape of the spline, not only where the samples sit.',
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
    'ph-curves.arc-length-problem.ph-cubic-speed': copy(
        'Kubična PH-krivulja v zeleni barvi s kontrolnimi točkami in njen modri odmik pri d = 1 pod krivuljo.',
        'The cubic PH curve in green with its control points and its blue offset at d = 1 below the curve.',
        'Odmik pri d = 1 leži vzdolž normale na razdalji 1 od krivulje. Pri t = 1 je tangenta r\'(1) = (3, 4), normala pa (4, −3)/5, zato je navpični zamik tam le 3/5.',
        'The offset at d = 1 lies along the normal at distance 1 from the curve. At t = 1 the tangent is r\'(1) = (3, 4) and the normal is (4, −3)/5, so the vertical shift there is only 3/5.',
    ),
    'ph-curves.arc-length-problem.ph-quintic-comparison': copy(
        'Kvintična PH-krivulja v zeleni barvi s kontrolnimi točkami in njen modri odmik pri privzeti razdalji d = 0,2.',
        'The quintic PH curve in green with its control points and its blue offset at the default distance d = 0.2.',
        'Odmik pri privzeti razdalji d = 0,2 je vzdolž normale na razdalji 0,2 od krivulje, na desni strani smeri potovanja. Do tega pogleda prideš z vklopom odmika.',
        'The offset at the default distance d = 0.2 lies along the normal at distance 0.2 from the curve, on the right of the direction of travel. Turn on the offset to reach this view.',
    ),
    'ph-curves.complex-hodograph.ph-cubic-generator': copy(
        'Začetna kubična PH-krivulja z začetno točko (−2, −1) in štirimi kontrolnimi točkami; odmik ni prikazan.',
        'The start cubic PH curve with its start point (−2, −1) and four control points; no offset is shown.',
        'Generatorja sta w0 = 2 in w1 = 2 + i, odvod pa r\'(t) = w(t)^2, kjer je w(t) = (1 − t) w0 + t w1. Zato je r\'(0) = (4, 0) in r\'(1) = (3, 4); slika kaže začetni prizor brez sprememb.',
        'The generators are w0 = 2 and w1 = 2 + i, and the derivative is r\'(t) = w(t)^2 with w(t) = (1 − t) w0 + t w1. So r\'(0) = (4, 0) and r\'(1) = (3, 4); the picture shows the start scene unchanged.',
    ),
    'ph-curves.worked-length.ph-cubic-offset-length': copy(
        'Kubična PH-krivulja v zeleni barvi s kontrolnimi točkami in njen modri odmik pri d = 1, z odčitkom dolžine krivulje.',
        'The cubic PH curve in green with its control points and its blue offset at d = 1, with the curve length readout.',
        'Odčitek dolžine je dolžina same krivulje (13/3 ≈ 4,33), ne dolžina odmika. Odmik pri d = 1 leži vzdolž normale na razdalji 1 od krivulje.',
        'The length readout is the length of the curve itself (13/3 ≈ 4.33), not the length of the offset. The offset at d = 1 lies along the normal at distance 1 from the curve.',
    ),
    'ph-curves.investigate-ph.ph-cubic-singularity': copy(
        'Kubična PH-krivulja v zeleni barvi s kontrolnimi točkami in njen modri odmik pri privzeti razdalji d = 0,2.',
        'The cubic PH curve in green with its control points and its blue offset at the default distance d = 0.2.',
        'Polmer ukrivljenosti te krivulje je povsod vsaj 4 (najmanjši je na krajišču), drsnik za d pa sega le od −3 do 3. Zato je odmik te krivulje gladek pri vsaki nastavitvi drsnika, tudi pri prikazani d = 0,2.',
        'The radius of curvature of this curve is at least 4 everywhere (smallest at an end point), while the d slider only goes from −3 to 3. So the offset of this curve is smooth for every slider setting, including the d = 0.2 shown.',
    ),
    'ph-curves.investigate-ph.ph-quintic-singularity': copy(
        'Kvintična PH-krivulja v zeleni barvi s kontrolnimi točkami. Od modrega odmika pri d = −2,5 je viden le kratek kos zgoraj levo, ki se konča z majhno zanko; preostanek odmika leži zunaj pogleda.',
        'The quintic PH curve in green with its control points. Of the blue offset at d = −2.5 only a short piece at the top left is in view, ending in a small loop; the rest of the offset lies outside the view.',
        'Pri d = −2,5 se odmik seka sam s seboj blizu točke (−2,09; 1,49), pri parametrih okoli t = 0,13 in t = 0,72; to je majhna zanka zgoraj levo. Na drsniku se to zgodi le pri d med približno −2,65 in −2,4.',
        'At d = −2.5 the offset crosses itself near the point (−2.09, 1.49), at parameters around t = 0.13 and t = 0.72; that is the small loop at the top left. On the slider this happens only for d between about −2.65 and −2.4.',
    ),
    'functions-and-calculus.applications.arc-length': copy(
        'Graf sinusa na [0, π] z lomljenko iz desetih tetiv, katere oglišča ležijo na grafu, ter krajiščema na osi x.',
        'The graph of the sine on [0, π] with a polyline of ten chords whose vertices lie on the graph, and its two end points on the x-axis.',
        'Pri n = 10 je dolžina lomljenke približno 3,8153, dolžina loka pa približno 3,8202: deset tetiv je skoraj tako dolgih kot lok, a nikoli daljših. Do pogleda prideš v koraku Več daljic z nastavitvijo n = 10.',
        'At n = 10 the polyline length is about 3.8153 and the arc length about 3.8202: ten chords are almost as long as the arc but never longer. Reach this view in the More segments step by setting n = 10.',
    ),
    'functions-and-calculus.applications.area-between-curves': copy(
        'Grafa f(x) = (x − 2)² in g(x) = 3 − (x − 2)² z osenčenim območjem med njima od a = 1 do b = 3, obe meji sta označeni na osi x.',
        'The graphs of f(x) = (x − 2)² and g(x) = 3 − (x − 2)² with the region between them shaded from a = 1 to b = 3, both bounds marked on the x-axis.',
        'Na [1, 3] g ni pod f, zato je ploščina med krivuljama 14/3 ≈ 4,6667 (integral g je 16/3, integral f pa 2/3). Do pogleda prideš v koraku z razliko integralov, kjer sta meji a = 1 in b = 3.',
        'On [1, 3] g is nowhere below f, so the area between the curves is 14/3 ≈ 4.6667 (the integral of g is 16/3, that of f is 2/3). Reach this view in the step on the difference of integrals, with the bounds a = 1 and b = 3.',
    ),
    'functions-and-calculus.continuity.continuity': copy(
        'Odsekoma podana funkcija pri a = 1: levi del se konča v polni točki (1, 1), desni del pa se začne pri votli točki (1, 2).',
        'The piecewise function at a = 1: the left piece ends at the filled point (1, 1) and the right piece starts at the hollow point (1, 2).',
        'Pri a = 1 ima funkcija v x = 1 vrednost 1, z desne pa se približuje 2: skok velikosti 1. To je primer za a = 1, ne dokaz splošnega merila za zveznost. Prizor je začetni prizor primera.',
        'At a = 1 the function takes the value 1 at x = 1 but approaches 2 from the right: a jump of 1. This is an example for a = 1, not a proof of the general criterion for continuity. It is the start scene of the example.',
    ),
    'functions-and-calculus.derivatives.derivative': copy(
        'Graf x² s točkama P = (1, 1) in Q = (2, 4), sekanto skozi njiju in prikazano tangento v točki P.',
        'The graph of x² with the points P = (1, 1) and Q = (2, 4), the secant through them and the tangent at P shown.',
        'Sekanta skozi P in Q ima naklon 3 (pri h = 1, torej h ≠ 0, še pred limito), tangenta v P pa naklon 2. Do pogleda prideš tako, da v koraku s sekanto skriješ besedilo in v zavihku Prikaz vklopiš prikaz tangente.',
        'The secant through P and Q has slope 3 (at h = 1, so h ≠ 0, before the limit) and the tangent at P has slope 2. Reach this view in the secant step: hide the text and switch on the tangent in the Display tab.',
    ),
    'functions-and-calculus.function-rules.exponential-function': copy(
        'Graf eksponentne funkcije z osnovo a = 2 skozi točki (0, 1) in (1, 2).',
        'The graph of the exponential function with base a = 2 through the points (0, 1) and (1, 2).',
        'Pri osnovi 2 so vrednosti pri x = 0, 1, 2, 3 enake 1, 2, 4, 8: graf se z vsakim korakom v desno podvoji. Prizor je začetni prizor primera.',
        'For base 2 the values at x = 0, 1, 2, 3 are 1, 2, 4, 8: the graph doubles with every step to the right. This is the start scene of the example.',
    ),
    'functions-and-calculus.function-rules.linear-function': copy(
        'Premica skozi točki P₁ = (0, 1) in P₂ = (2, 5) s trikotnikom naklona, katerega kateti kažeta razliki po x in po y.',
        'The line through the points P₁ = (0, 1) and P₂ = (2, 5) with the slope triangle whose legs show the differences in x and y.',
        'Razlika po x je 2, razlika po y je 4, zato je naklon k = 4/2 = 2, začetna vrednost n = 1 in premica y = 2x + 1. Prizor je začetni prizor primera.',
        'The difference in x is 2 and in y is 4, so the slope is k = 4/2 = 2, the intercept n = 1 and the line y = 2x + 1. This is the start scene of the example.',
    ),
    'functions-and-calculus.function-rules.trigonometric-functions': copy(
        'Graf funkcije 2 sin(2x + π/2) + 1 z vodoravno premico y = 1 kot sredinsko črto.',
        'The graph of 2 sin(2x + π/2) + 1 with the horizontal line y = 1 as its midline.',
        'Pri A = 2, ω = 2, φ = π/2 in B = 1 je največja vrednost 3 (pri x = 0), najmanjša −1, perioda pa π. Do pogleda prideš v koraku s sestavljenim primerom z navedenimi vrednostmi.',
        'With A = 2, ω = 2, φ = π/2 and B = 1 the maximum is 3 (at x = 0), the minimum is −1 and the period is π. Reach this view in the combined example step with these values.',
    ),
    'functions-and-calculus.integrals.accumulation': copy(
        'Graf sinusa z osenčenim območjem od a = 0 do x = 2, črtkano krivuljo akumulacije A, tangento nanjo in točkami pri x = 2.',
        'The graph of the sine with the region shaded from a = 0 to x = 2, the dashed accumulation curve A, its tangent and the points at x = 2.',
        'Akumulirana ploščina sinusa od 0 do 2 je A(2) = 1 − cos 2 ≈ 1,4161, naklon tangente na A pa je tam sin 2 ≈ 0,9093. Do pogleda prideš v koraku razkritja, ko se akumulacija prikaže.',
        'The accumulated area of the sine from 0 to 2 is A(2) = 1 − cos 2 ≈ 1.4161, and the tangent to A there has slope sin 2 ≈ 0.9093. Reach this view in the reveal step, when the accumulation is shown.',
    ),
    'functions-and-calculus.integrals.definite-integral': copy(
        'Parabola y = x² na [0, 2] s štirimi levimi pravokotniki pod njo in mejama a = 0 ter b = 2 na osi x.',
        'The parabola y = x² on [0, 2] with four left rectangles under it and the bounds a = 0 and b = 2 on the x-axis.',
        'Vsota levih pravokotnikov je 1,75, kar je približek: natančna ploščina je 8/3 ≈ 2,6667, in to je ploščina, ker je x² ≥ 0. Prizor je začetni prizor primera.',
        'The sum of the left rectangles is 1.75, an approximation: the exact area is 8/3 ≈ 2.6667, and it is an area because x² ≥ 0. This is the start scene of the example.',
    ),
};

