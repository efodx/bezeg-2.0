import type {Language} from '../../localization';

export type BezierSectionId = 'motivation' | 'control-points' | 'parameter' | 'interpolation' | 'bernstein-form' | 'geometric-properties' | 'affine-transformations' | 'next-ideas';
export type BezierActivityId = 'shape-control' | 'curve-parameter' | 'repeated-interpolation' | 'blending-coefficients' | 'geometric-bounds' | 'transform-shape';

export type ChapterParagraph = {kind: 'paragraph'; text: string; links?: readonly {label: string; href: string}[]};
export type ChapterFormula = {kind: 'formula'; latex: string; label: string};
export type ChapterActivity = {kind: 'activity'; id: BezierActivityId};
export type ChapterBlock = ChapterParagraph | ChapterFormula | ChapterActivity;
export type ChapterSection = {id: BezierSectionId; title: string; blocks: ChapterBlock[]};

export const bezierChapter: Record<Language, {id: 'bezier-curves'; family: string; title: string; purpose: string; prerequisites: string; sections: ChapterSection[]; source: string}> = {
    en: {
        id: 'bezier-curves', family: 'Curves', title: 'Bézier curves: shaping a curve with control points',
        purpose: 'Learn how a short list of control points specifies an editable curve, how a parameter selects a point, and why the representation has useful geometric guarantees.',
        prerequisites: 'You need plane coordinates and basic algebra with powers and multiplication. The chapter introduces parametrized points, weighted combinations, and interpolation. No calculus or prior knowledge of Bézier curves is needed.',
        sections: [
            {id: 'motivation', title: 'How do we describe an editable shape?', blocks: [
                {kind: 'paragraph', text: 'Imagine adjusting a smooth outline in a drawing program. You choose where it begins and ends, change its bend, and move or resize the finished shape. A useful mathematical model should make those edits predictable. A Bézier curve uses a short list of control points: the list determines the whole curve, while each point guides its shape in a precise way.'},
                {kind: 'paragraph', text: 'The first and last control points are on the curve. Interior control points usually are not. They pull and guide the curve rather than marking places it must pass through. This distinction lets a small list describe a smooth path without forcing every listed point onto it.'},
            ]},
            {id: 'control-points', title: 'Control points guide the curve', blocks: [
                {kind: 'paragraph', text: 'Call the listed points \\(P_0,P_1,\\ldots,P_n\\). Joining them in order makes the control polygon. The curve starts at \\(P_0\\) and ends at \\(P_n\\); the interior points shape its route between them. In the ordinary cubic example used here, the four controls are'},
                {kind: 'formula', label: 'The four control points in the ordinary cubic example', latex: String.raw`P_0=(-4,-3),\quad P_1=(-3,2),\quad P_2=(2,2),\quad P_3=(3,-2)`},
                {kind: 'paragraph', text: 'The four points specify a curve with representation degree three. Moving an interior control changes the curve throughout its open parameter range, although the effect is stronger at some positions than others. The curve need not pass through that moved control. A control polygon is a guide, not a string of curve points.'},
                {kind: 'activity', id: 'shape-control'},
                {kind: 'paragraph', text: 'Compare the two edits: moving an interior control bends the path while preserving both endpoints; moving an endpoint control carries that endpoint with it. The four listed controls make this the cubic example, with representation degree three.'},
            ]},
            {id: 'parameter', title: 'A parameter selects a point', blocks: [
                {kind: 'paragraph', text: 'The curve is a rule that assigns a position to a number \\(t\\) between \\(0\\) and \\(1\\). We write the selected position as \\(B(t)\\). The parameter \\(t\\) tells us where we are in the curve’s construction: \\(B(0)=P_0\\) and \\(B(1)=P_n\\). Changing \\(t\\) selects another point on the same fixed curve. Moving a control point edits the curve itself.'},
                {kind: 'paragraph', text: 'The next activity follows a different prepared example with five controls, hence representation degree four; it is not the four-control cubic above. The parameter is not generally a distance fraction: equal changes in it need not move the point equal distances along the curve. The following section first derives the same repeated-interpolation rule with three controls, then returns to the five-control example.'},
                {kind: 'activity', id: 'curve-parameter'},
                {kind: 'paragraph', text: 'The same parameter value can select different positions on different curves. It identifies a construction step, so comparing parameter values alone does not compare distances traveled.'},
            ]},
            {id: 'interpolation', title: 'A straight segment is repeated interpolation’s starting point', blocks: [
                {kind: 'paragraph', text: 'For endpoints \\(P\\) and \\(Q\\), scalar multiplication and addition act on each coordinate. If \\(P=(x_P,y_P)\\), \\(Q=(x_Q,y_Q)\\), and \\(0\\le t\\le1\\), then'},
                {kind: 'formula', label: 'Coordinate form of linear interpolation', latex: String.raw`(1-t)P+tQ=\bigl((1-t)x_P+tx_Q,\ (1-t)y_P+ty_Q\bigr)`},
                {kind: 'paragraph', text: 'We call this interpolated point \\(L(t)\\):'},
                {kind: 'formula', label: 'Linear interpolation', latex: String.raw`L(t)=(1-t)P+tQ`},
                {kind: 'paragraph', text: 'The point \\(L(t)\\) lies on the segment from \\(P\\) to \\(Q\\) when \\(0\\le t\\le1\\). The numbers \\(1-t\\) and \\(t\\) are complementary shares: they are nonnegative and add to one. At \\(t=\\frac14\\), the point is one quarter of the way from \\(P\\) to \\(Q\\); at \\(t=\\frac12\\), it is halfway; and at \\(t=\\frac34\\), it is three quarters of the way. This operation is linear interpolation.'},
                {kind: 'paragraph', text: 'The same operation can be repeated. Start with neighboring control points, interpolate between each pair using the same \\(t\\), and then interpolate between the new neighboring points. Repeating until one point remains gives a point on the Bézier curve. This construction is called the De Casteljau construction.'},
                {kind: 'paragraph', text: 'Here is the simpler quadratic case, with three controls \\(P_0,P_1,P_2\\). First interpolate the neighboring pairs:'},
                {kind: 'formula', label: 'First interpolation row for three control points', latex: String.raw`Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2`},
                {kind: 'paragraph', text: 'Then interpolate those results with the same parameter:'},
                {kind: 'formula', label: 'Quadratic Bézier curve derived by repeated interpolation', latex: String.raw`\begin{aligned}B(t)&=(1-t)Q_0(t)+tQ_1(t)\\&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.\end{aligned}`},
                {kind: 'paragraph', text: 'The middle coefficient appears twice because \\(P_1\\) contributes through both first-row interpolations. Three controls need two interpolation rounds and give representation degree two. The same rule extends to five controls by adding more rounds; the activity below returns to the prepared five-control, degree-four example.'},
                {kind: 'activity', id: 'repeated-interpolation'},
                {kind: 'paragraph', text: 'Compare the two constructions: the three-control derivation ends after two rounds, while the five-control activity has more rows. In both, repeated interpolation leaves one final point on the curve for the chosen parameter.'},
            ]},
            {id: 'bernstein-form', title: 'Bernstein coefficients give a general formula', blocks: [
                {kind: 'paragraph', text: 'The quadratic expansion has coefficients that depend on \\(t\\), and those coefficients say how much each control contributes. For representation degree \\(n\\), define the Bernstein coefficient'},
                {kind: 'formula', label: 'Bernstein coefficient of degree n', latex: String.raw`b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad i=0,1,\ldots,n`},
                {kind: 'paragraph', text: 'The binomial coefficient \\(\\binom{n}{i}\\) counts the ways to choose \\(i\\) positions from \\(n\\); for example, \\(\\binom{2}{1}=2\\). A Bézier curve with controls \\(P_0,\\ldots,P_n\\) is'},
                {kind: 'formula', label: 'General Bézier curve formula in Bernstein form', latex: String.raw`B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad 0\le t\le1`},
                {kind: 'paragraph', text: 'The symbol \\(\\sum_{i=0}^{n}\\) means to add one term for each index \\(i\\), starting at zero and ending at \\(n\\). Thus the formula adds each control point multiplied by its matching Bernstein coefficient.'},
                {kind: 'paragraph', text: 'Thus \\(n+1\\) control points give a representation of degree \\(n\\). A special arrangement of controls can make the actual polynomial degree lower. “Representation degree” counts the controls in this formula; it does not promise that every such curve has exactly that polynomial degree. The quadratic expansion above illustrates the pattern. The general identity follows from the repeated-interpolation recurrence; the plot of a few coefficients is useful to inspect, but is not a proof for every degree.'},
                {kind: 'paragraph', text: 'The coefficients add to one because \\(((1-t)+t)^n\\) is a product of \\(n\\) identical factors. When expanded, choosing \\(i\\) of those factors to contribute \\(t\\) gives \\(\\binom{n}{i}\\) terms of the form \\((1-t)^{n-i}t^i\\). Adding all choices gives the full expansion, \\(((1-t)+t)^n=1\\).'},
                {kind: 'paragraph', text: 'The Bernstein activity starts at degree two to match the three-control derivation. Its graph shows three basis functions, not a Bézier curve: the two endpoint functions take value one at opposite ends, while the middle function is zero at both ends and largest at the center. These shape cues identify the functions without relying on color. In the separate four-control cubic example, the four midpoint weights are \\(\\left(\\frac18,\\frac38,\\frac38,\\frac18\\right)\\). For its authored controls, repeated midpoint interpolation gives:'},
                {kind: 'formula', label: 'Worked cubic midpoint interpolation rows', latex: String.raw`\begin{aligned}\text{First row: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\\text{Second row: }&\left(-2,\frac34\right),\left(1,1\right),\\\text{Final point: }&\left(-\frac12,\frac78\right).\end{aligned}`},
                {kind: 'paragraph', text: 'This four-control calculation checks the cubic midpoint directly. It is distinct from the three-control quadratic derivation and from the five-control quartic activity.'},
                {kind: 'activity', id: 'blending-coefficients'},
                {kind: 'paragraph', text: 'At degree two, compare the two endpoint-shaped functions with the central one: the graph shows how each control’s weight changes with \\(t\\). These weights only become a curve when combined with control points.'},
            ]},
            {id: 'geometric-properties', title: 'Endpoints and the convex hull explain useful guarantees', blocks: [
                {kind: 'paragraph', text: 'At \\(t=0\\), all Bernstein coefficients are zero except \\(b_0^n(0)=1\\), so \\(B(0)=P_0\\). At \\(t=1\\), only \\(b_n^n(1)=1\\), so \\(B(1)=P_n\\). The curve therefore passes exactly through its first and last controls.'},
                {kind: 'paragraph', text: 'For every \\(t\\) in \\([0,1]\\), each coefficient is nonnegative. Their sum is one by the binomial theorem:'},
                {kind: 'formula', label: 'Bernstein coefficients sum to one', latex: String.raw`\sum_{i=0}^{n}b_i^n(t)=((1-t)+t)^n=1`},
                {kind: 'paragraph', text: 'A weighted combination with nonnegative weights summing to one is a convex combination. The convex hull of the controls is the smallest convex set containing them; “convex” means that the straight segment between any two points in the set also stays in it. This definition includes a line segment or a single point when the controls are degenerate. The curve lies inside this hull. One way to see why is to use the repeated construction: each step stays on a segment between points already in the hull, and convexity keeps that segment inside. This is a general guarantee, not a conclusion drawn from checking a handful of plotted positions. It applies on \\([0,1]\\); outside that interval some weights can be negative.'},
                {kind: 'paragraph', text: 'Interior controls need not lie on the curve. Their influence is global: for an interior index \\(i\\), the coefficient \\(b_i^n(t)\\) is positive at every \\(0<t<1\\). Moving that control therefore changes the curve throughout the open parameter interval, with a varying amount of change. The endpoints remain fixed. The hull gives a boundary for the whole curve, not an exact trace of it.'},
                {kind: 'activity', id: 'geometric-bounds'},
                {kind: 'paragraph', text: 'The moved control changes both the polygon and its hull, and the curve remains inside the updated hull. The picture illustrates examples; nonnegative weights that sum to one establish containment for every parameter in the stated interval.'},
            ]},
            {id: 'affine-transformations', title: 'Transforming the controls transforms the curve', blocks: [
                {kind: 'paragraph', text: 'The ordinary Bézier example has its own four controls listed earlier. The affine demonstration uses a different, explicitly prepared cubic example; its picture and coordinates belong to that demonstration. In either case, the mathematical rule is the same: apply one affine transformation \\(T\\) to every control, and the new curve is the transformation of the old curve.'},
                {kind: 'paragraph', text: 'For a point \\(x=(x_1,x_2)\\), write a \\(2\\times2\\) matrix as \\(A=\\begin{pmatrix}a_{11}&a_{12}\\\\a_{21}&a_{22}\\end{pmatrix}\\); then \\(Ax=(a_{11}x_1+a_{12}x_2,a_{21}x_1+a_{22}x_2)\\). This linear part can rotate, reflect, or scale. A vector \\(c\\) is then added to translate the result. Together they define \\(T(x)=Ax+c\\). Since \\(B(t)=\\sum_{i=0}^{n} b_i^n(t)P_i\\) and the weights add to one,'},
                {kind: 'formula', label: 'Affine transformation commutes with the Bézier combination', latex: String.raw`\begin{aligned}T(B(t))&=A\left(\sum_{i=0}^{n}b_i^n(t)P_i\right)+c\\&=\sum_{i=0}^{n}b_i^n(t)\bigl(AP_i+c\bigr),\end{aligned}`},
                {kind: 'paragraph', text: 'In the second line, the translation is \\(c\\sum_{i=0}^{n} b_i^n(t)=c\\), because the weights sum to one. The result is exactly the Bézier formula made from the transformed controls \\(T(P_i)\\). This explains why translating, rotating, reflecting, or scaling the control data transforms the whole curve in the corresponding way.'},
                {kind: 'activity', id: 'transform-shape'},
                {kind: 'paragraph', text: 'Applying an operation to only one control generally reshapes the curve rather than transforming the whole shape. A whole-shape affine edit requires applying the same map to every control.'},
            ]},
            {id: 'next-ideas', title: 'What can we do next?', blocks: [
                {kind: 'paragraph', text: 'You have seen how a control list specifies a curve, how a parameter selects a point, how repeated interpolation constructs that point, and how Bernstein coefficients express the same curve. The endpoint and convex-hull properties give useful guarantees, and affine transformations can be applied directly to the controls.'},
                {kind: 'paragraph', text: 'These ideas lead to further questions. How can we keep only part of a curve? See the subdivision demonstration. How can the same shape be represented with more control points? Explore degree elevation. How can separate curve pieces join smoothly? Explore spline curves. What changes when we want an exact circular arc? Explore rational curves and the circle construction. These are related demonstrations for further exploration, not prerequisites for this chapter or promises of later chapters.', links: [
                    {label: 'the subdivision demonstration', href: '/bezeg-2.0/bezier/subdivision-2'},
                    {label: 'degree elevation', href: '/bezeg-2.0/bezier/elevation'},
                    {label: 'spline curves', href: '/bezeg-2.0/spline/spline'},
                    {label: 'rational curves', href: '/bezeg-2.0/rational/base'},
                    {label: 'circle construction', href: '/bezeg-2.0/rational/circlen'},
                ]},
                {kind: 'paragraph', text: 'The mathematical definitions and properties in this chapter follow Kevin Štampar, *Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj* (master’s thesis, University of Ljubljana, 2024), especially §§1, 2.1, and 2.3–2.5. The opening scenario is original editorial wording informed by the thesis’s computer-aided geometric design motivation; it is not a quotation. The worked cubic midpoint and quadratic expansion are calculated examples.'},
            ]},
        ],
        source: 'Based on Kevin Štampar, Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj (master’s thesis, University of Ljubljana, 2024), especially §§1, 2.1, and 2.3–2.5.'
    },
    sl: {
        id: 'bezier-curves', family: 'Krivulje', title: 'Bézierjeve krivulje: oblikovanje krivulje s kontrolnimi točkami',
        purpose: 'Spoznaj, kako kratek seznam kontrolnih točk določa krivuljo, ki jo lahko urejamo, kako parameter izbere točko in zakaj ima predstavitev uporabna geometrijska jamstva.',
        prerequisites: 'Poznati moraš koordinate v ravnini in osnovno algebro s potencami in množenjem. Poglavje predstavi parametrizirane točke, utežene kombinacije in interpolacijo. Predznanje infinitezimalnega računa ali Bézierjevih krivulj ni potrebno.',
        sections: [
            {id: 'motivation', title: 'Kako opišemo obliko, ki jo lahko urejamo?', blocks: [
                {kind: 'paragraph', text: 'Predstavljaj si urejanje gladkega obrisa v risarskem programu. Izbereš, kje se začne in konča, spremeniš njegovo ukrivljenost ter premakneš ali spremeniš velikost končne oblike. Uporaben matematični model mora poskrbeti, da so ti posegi predvidljivi. Bézierjeva krivulja uporablja kratek seznam kontrolnih točk: seznam določa celotno krivuljo, vsaka točka pa na natančno določen način usmerja njeno obliko.'},
                {kind: 'paragraph', text: 'Prva in zadnja kontrolna točka ležita na krivulji. Notranje kontrolne točke navadno ne. Krivuljo vlečejo in usmerjajo, ne označujejo pa mest, skozi katera mora potekati. Tako lahko z majhnim številom točk opišemo gladko pot, ne da bi krivuljo prisilili skozi vsako navedeno točko.'},
            ]},
            {id: 'control-points', title: 'Kontrolne točke usmerjajo krivuljo', blocks: [
                {kind: 'paragraph', text: 'Označimo navedene točke z \\(P_0,P_1,\\ldots,P_n\\). Če jih zaporedoma povežemo, dobimo kontrolni poligon. Krivulja se začne v \\(P_0\\) in konča v \\(P_n\\); notranje točke oblikujejo njeno pot med krajiščema. V običajnem kubičnem primeru, ki ga uporabljamo tukaj, so štiri kontrolne točke'},
                {kind: 'formula', label: 'Štiri kontrolne točke v običajnem kubičnem primeru', latex: String.raw`P_0=(-4,-3),\quad P_1=(-3,2),\quad P_2=(2,2),\quad P_3=(3,-2)`},
                {kind: 'paragraph', text: 'Štiri točke določajo krivuljo s predstavitveno stopnjo tri. Premik notranje kontrolne točke spremeni krivuljo na celotnem odprtem intervalu parametra, vendar je vpliv na nekaterih mestih močnejši. Krivulja ni nujno speljana skozi premaknjeno točko. Kontrolni poligon je vodilo, ne zaporedje točk na krivulji.'},
                {kind: 'activity', id: 'shape-control'},
                {kind: 'paragraph', text: 'Primerjaj oba premika: premik notranje kontrolne točke spremeni ukrivljenost poti, krajišči pa ostaneta nespremenjeni; premik krajiščne kontrolne točke premakne tudi to krajišče krivulje. Štiri navedene točke določajo kubični primer s predstavitveno stopnjo tri.'},
            ]},
            {id: 'parameter', title: 'Parameter izbere točko', blocks: [
                {kind: 'paragraph', text: 'Krivulja je pravilo, ki številu \\(t\\) med \\(0\\) in \\(1\\) priredi lego točke. Izbrano lego zapišemo kot \\(B(t)\\). Parameter \\(t\\) pove, kje smo v konstrukciji krivulje: \\(B(0)=P_0\\) in \\(B(1)=P_n\\). Ko spremenimo \\(t\\), izberemo drugo točko na isti krivulji. Premik kontrolne točke pa spremeni samo krivuljo.'},
                {kind: 'paragraph', text: 'Naslednja dejavnost sledi drugemu, vnaprej pripravljenemu primeru s petimi kontrolnimi točkami, torej s predstavitveno stopnjo štiri; to ni prej navedeni kubični primer s štirimi točkami. Parameter na splošno ni delež dolžine: enake spremembe ne zagotavljajo enako dolgih premikov po krivulji. V naslednjem razdelku najprej izpeljemo isto pravilo ponovljene interpolacije s tremi točkami, nato pa se vrnemo k primeru s petimi točkami.'},
                {kind: 'activity', id: 'curve-parameter'},
                {kind: 'paragraph', text: 'Ista vrednost parametra lahko na različnih krivuljah izbere različni legi. Označuje korak konstrukcije, zato samo s primerjavo parametrov ne moremo primerjati prepotovanih dolžin.'},
            ]},
            {id: 'interpolation', title: 'Daljica je začetek ponovljene interpolacije', blocks: [
                {kind: 'paragraph', text: 'Pri krajiščih \\(P\\) in \\(Q\\) se skalarno množenje in seštevanje izvedeta za vsako koordinato posebej. Če sta \\(P=(x_P,y_P)\\), \\(Q=(x_Q,y_Q)\\) in \\(0\\le t\\le1\\), potem velja'},
                {kind: 'formula', label: 'Koordinatni zapis linearne interpolacije', latex: String.raw`(1-t)P+tQ=\bigl((1-t)x_P+tx_Q,\ (1-t)y_P+ty_Q\bigr)`},
                {kind: 'paragraph', text: 'Interpolirano točko označimo z \\(L(t)\\):'},
                {kind: 'formula', label: 'Linearna interpolacija', latex: String.raw`L(t)=(1-t)P+tQ`},
                {kind: 'paragraph', text: 'Točka \\(L(t)\\) leži na daljici od \\(P\\) do \\(Q\\), ko je \\(0\\le t\\le1\\). Števili \\(1-t\\) in \\(t\\) sta komplementarna deleža: sta nenegativni in imata vsoto ena. Pri \\(t=\\frac14\\) je točka četrt poti od \\(P\\) do \\(Q\\); pri \\(t=\\frac12\\) je na sredini, pri \\(t=\\frac34\\) pa je za njo tri četrtine poti. Temu postopku pravimo linearna interpolacija.'},
                {kind: 'paragraph', text: 'Isti postopek lahko ponavljamo. Začnemo s sosednjimi kontrolnimi točkami in z istim \\(t\\) interpoliramo vsak par. Nato interpoliramo nove sosednje točke. Ko postopek ponavljamo, dokler ne ostane ena točka, dobimo točko na Bézierjevi krivulji. To konstrukcijo imenujemo konstrukcija De Casteljau.'},
                {kind: 'paragraph', text: 'Oglejmo si preprostejši kvadratni primer s tremi kontrolnimi točkami \\(P_0,P_1,P_2\\). Najprej interpoliramo sosednja para:'},
                {kind: 'formula', label: 'Prva interpolacijska vrstica za tri kontrolne točke', latex: String.raw`Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2`},
                {kind: 'paragraph', text: 'Nato z istim parametrom interpoliramo rezultata:'},
                {kind: 'formula', label: 'Izpeljava kvadratne Bézierjeve krivulje s ponovljeno interpolacijo', latex: String.raw`\begin{aligned}B(t)&=(1-t)Q_0(t)+tQ_1(t)\\&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.\end{aligned}`},
                {kind: 'paragraph', text: 'Srednji koeficient se pojavi dvakrat, ker \\(P_1\\) prispeva k obema interpolacijama v prvi vrstici. Tri kontrolne točke zahtevajo dva kroga interpolacije in dajo predstavitveno stopnjo dve. Isto pravilo se razširi na pet kontrolnih točk z dodatnimi krogi; dejavnost spodaj se vrne k vnaprej pripravljenemu primeru s petimi točkami in stopnjo štiri.'},
                {kind: 'activity', id: 'repeated-interpolation'},
                {kind: 'paragraph', text: 'Primerjaj obe konstrukciji: izpeljava za tri kontrolne točke se konča po dveh krogih, dejavnost s petimi točkami pa ima več vrstic. V obeh ponovljena interpolacija pusti eno končno točko na krivulji za izbrani parameter.'},
            ]},
            {id: 'bernstein-form', title: 'Bernsteinovi koeficienti dajo splošno formulo', blocks: [
                {kind: 'paragraph', text: 'V kvadratnem razvoju so koeficienti odvisni od \\(t\\) in povedo, koliko prispeva posamezna kontrolna točka. Pri predstavitveni stopnji \\(n\\) Bernsteinov koeficient določimo z'},
                {kind: 'formula', label: 'Bernsteinov koeficient stopnje n', latex: String.raw`b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad i=0,1,\ldots,n`},
                {kind: 'paragraph', text: 'Binomski koeficient \\(\\binom{n}{i}\\) prešteje načine, kako izberemo \\(i\\) mest med \\(n\\) mesti; na primer, \\(\\binom{2}{1}=2\\). Bézierjevo krivuljo s kontrolnimi točkami \\(P_0,\\ldots,P_n\\) podaja'},
                {kind: 'formula', label: 'Splošna Bézierjeva formula v Bernsteinovi obliki', latex: String.raw`B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad 0\le t\le1`},
                {kind: 'paragraph', text: 'Znak \\(\\sum_{i=0}^{n}\\) pomeni, da seštejemo po en člen za vsak indeks \\(i\\), od nič do \\(n\\). Formula torej prišteje vsako kontrolno točko, pomnoženo z ustreznim Bernsteinovim koeficientom.'},
                {kind: 'paragraph', text: 'Tako \\(n+1\\) kontrolnih točk poda predstavitev stopnje \\(n\\). Posebna razporeditev kontrolnih točk lahko zmanjša dejansko polinomsko stopnjo. »Predstavitvena stopnja« prešteje kontrolne točke v tej formuli, ne zagotavlja pa, da ima vsaka taka krivulja natanko to polinomsko stopnjo. Kvadratni razvoj zgoraj pokaže vzorec. Splošna enakost sledi rekurziji ponovljene interpolacije; graf nekaj koeficientov je koristen za opazovanje, ni pa dokaz za vse stopnje.'},
                {kind: 'paragraph', text: 'Koeficienti imajo vsoto ena, saj je \\(((1-t)+t)^n\\) produkt \\(n\\) enakih faktorjev. Pri razvoju izberemo \\(i\\) faktorjev, ki prispevajo \\(t\\), kar da \\(\\binom{n}{i}\\) členov oblike \\((1-t)^{n-i}t^i\\). Vsota vseh možnosti je razvoj \\(((1-t)+t)^n=1\\).'},
                {kind: 'paragraph', text: 'Dejavnost z Bernsteinovimi funkcijami se začne pri stopnji dve, da se ujema z izpeljavo za tri kontrolne točke. Njen graf prikazuje tri bazne funkcije, ne Bézierjeve krivulje: dve krajiščni funkciji dosežeta vrednost ena na nasprotnih krajiščih, srednja pa je na obeh enaka nič in največja na sredini. Po teh oblikovnih značilnostih jih prepoznamo neodvisno od barve. V ločenem običajnem kubičnem primeru s štirimi kontrolnimi točkami so štiri uteži pri sredinskem parametru \\(\\left(\\frac18,\\frac38,\\frac38,\\frac18\\right)\\). Pri vnaprej določenih kontrolnih točkah ponovljena sredinska interpolacija poda'},
                {kind: 'formula', label: 'Izračunane vrstice sredinske interpolacije za kubični primer', latex: String.raw`\begin{aligned}\text{Prva vrstica: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\\text{Druga vrstica: }&\left(-2,\frac34\right),\left(1,1\right),\\\text{Končna točka: }&\left(-\frac12,\frac78\right).\end{aligned}`},
                {kind: 'paragraph', text: 'Ta izračun za štiri kontrolne točke neposredno preveri kubično sredinsko točko. Ločen je od kvadratne izpeljave s tremi točkami in kvartične dejavnosti s petimi točkami.'},
                {kind: 'activity', id: 'blending-coefficients'},
                {kind: 'paragraph', text: 'Pri stopnji dve primerjaj krajiščni funkciji s srednjo: graf pokaže, kako se utež vsake kontrolne točke spreminja s \\(t\\). Te uteži tvorijo krivuljo šele v kombinaciji s kontrolnimi točkami.'},
            ]},
            {id: 'geometric-properties', title: 'Krajišči in konveksna ovojnica pojasnita uporabni jamstvi', blocks: [
                {kind: 'paragraph', text: 'Pri \\(t=0\\) so vsi Bernsteinovi koeficienti enaki nič, razen \\(b_0^n(0)=1\\), zato je \\(B(0)=P_0\\). Pri \\(t=1\\) je enak ena samo \\(b_n^n(1)=1\\), zato velja \\(B(1)=P_n\\). Krivulja torej natančno poteka skozi prvo in zadnjo kontrolno točko.'},
                {kind: 'paragraph', text: 'Za vsak \\(t\\) na intervalu \\([0,1]\\) je vsak koeficient nenegativen. Njihova vsota je po binomskem izreku ena:'},
                {kind: 'formula', label: 'Vsota Bernsteinovih koeficientov je ena', latex: String.raw`\sum_{i=0}^{n}b_i^n(t)=((1-t)+t)^n=1`},
                {kind: 'paragraph', text: 'Utežena kombinacija z nenegativnimi utežmi, katerih vsota je ena, je konveksna kombinacija. Konveksna ovojnica kontrolnih točk je najmanjša konveksna množica, ki jih vsebuje; »konveksna« pomeni, da tudi daljica med poljubnima točkama množice ostane v njej. Taka definicija vključuje tudi daljico ali posamezno točko, kadar so kontrolne točke degenerirane. Krivulja leži znotraj te ovojnice. To lahko razumemo s ponovljeno konstrukcijo: vsak korak ostane na daljici med točkama, ki sta že v ovojnici, konveksnost pa zagotavlja, da je daljica v njej. To je splošno jamstvo, ne sklep iz preverjanja nekaj narisanih točk. Velja na \\([0,1]\\); zunaj tega intervala so lahko nekatere uteži negativne.'},
                {kind: 'paragraph', text: 'Notranje kontrolne točke niso nujno na krivulji. Njihov vpliv je globalen: za notranji indeks \\(i\\) je koeficient \\(b_i^n(t)\\) pozitiven pri vsakem \\(0<t<1\\). Premik točke zato spremeni krivuljo na celotnem odprtem intervalu parametra, vendar v različni meri. Krajišči ostaneta nespremenjeni. Ovojnica omeji celotno krivuljo, ne opisuje pa natančno njene poti.'},
                {kind: 'activity', id: 'geometric-bounds'},
                {kind: 'paragraph', text: 'Premik kontrolne točke spremeni poligon in njegovo ovojnico, krivulja pa ostane v posodobljeni ovojnici. Slika pokaže primere; nenegativne uteži z vsoto ena dokazujejo vsebovanost za vsak parameter na navedenem intervalu.'},
            ]},
            {id: 'affine-transformations', title: 'Če preoblikujemo kontrolne točke, se preoblikuje tudi krivulja', blocks: [
                {kind: 'paragraph', text: 'Običajni Bézierjev primer ima svoje štiri kontrolne točke, navedene prej. Prikaz afinega preoblikovanja uporablja drug, izrecno pripravljen kubični primer; slika in koordinate pripadajo temu prikazu. V obeh primerih velja isto matematično pravilo: če z afino transformacijo \\(T\\) preoblikujemo vse kontrolne točke, dobimo staro krivuljo, preoblikovano z \\(T\\).'},
                {kind: 'paragraph', text: 'Za točko \\(x=(x_1,x_2)\\) zapišemo matriko \\(2\\times2\\) kot \\(A=\\begin{pmatrix}a_{11}&a_{12}\\\\a_{21}&a_{22}\\end{pmatrix}\\); tedaj je \\(Ax=(a_{11}x_1+a_{12}x_2,a_{21}x_1+a_{22}x_2)\\). Ta linearni del lahko zavrti, zrcali ali spremeni merilo. Nato prištejemo vektor \\(c\\), ki povzroči premik. Skupaj določata \\(T(x)=Ax+c\\). Ker velja \\(B(t)=\\sum_{i=0}^{n} b_i^n(t)P_i\\) in je vsota uteži ena,'},
                {kind: 'formula', label: 'Afina transformacija in kombinacija Bézierjevih točk', latex: String.raw`\begin{aligned}T(B(t))&=A\left(\sum_{i=0}^{n}b_i^n(t)P_i\right)+c\\&=\sum_{i=0}^{n}b_i^n(t)\bigl(AP_i+c\bigr),\end{aligned}`},
                {kind: 'paragraph', text: 'V drugi vrstici je premik enak \\(c\\sum_{i=0}^{n} b_i^n(t)=c\\), ker je vsota uteži ena. Rezultat je natanko formula za Bézierjevo krivuljo, določeno s preoblikovanimi kontrolnimi točkami \\(T(P_i)\\). Zato premik, vrtenje, zrcaljenje ali spreminjanje merila kontrolnih podatkov na ustrezen način preoblikuje celotno krivuljo.'},
                {kind: 'activity', id: 'transform-shape'},
                {kind: 'paragraph', text: 'Če poseg uporabimo samo na eni kontrolni točki, navadno spremenimo obliko krivulje, ne pa preoblikujemo celotne oblike. Pri afinem preoblikovanju celotne oblike moramo isto preslikavo uporabiti na vseh kontrolnih točkah.'},
            ]},
            {id: 'next-ideas', title: 'Kaj lahko raziščemo naslednje?', blocks: [
                {kind: 'paragraph', text: 'Spoznali smo, kako seznam kontrolnih točk določa krivuljo, kako parameter izbere točko, kako jo zgradi ponovljena interpolacija in kako isto krivuljo zapišemo z Bernsteinovimi koeficienti. Lastnosti krajišč in konveksne ovojnice dajejo uporabna jamstva, afine transformacije pa lahko uporabimo neposredno na kontrolnih točkah.'},
                {kind: 'paragraph', text: 'Te zamisli odprejo nova vprašanja. Kako obdržimo le del krivulje? Razišči delitev krivulje. Kako isto obliko predstavimo z več kontrolnimi točkami? Razišči zvišanje stopnje. Kako gladko združimo več delov krivulje? Razišči zlepkovne krivulje. Kaj se spremeni, če želimo natančen krožni lok? Razišči racionalne krivulje in konstrukcijo krožnice. Te povezave vodijo na povezane prikaze, ne napovedujejo pa novih poglavij ali predpogojev za to poglavje.', links: [
                    {label: 'delitev krivulje', href: '/bezeg-2.0/bezier/subdivision-2'},
                    {label: 'zvišanje stopnje', href: '/bezeg-2.0/bezier/elevation'},
                    {label: 'zlepkovne krivulje', href: '/bezeg-2.0/spline/spline'},
                    {label: 'racionalne krivulje', href: '/bezeg-2.0/rational/base'},
                    {label: 'konstrukcijo krožnice', href: '/bezeg-2.0/rational/circlen'},
                ]},
                {kind: 'paragraph', text: 'Matematične definicije in lastnosti v poglavju sledijo delu Kevina Štamparja, *Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj* (magistrsko delo, Univerza v Ljubljani, 2024), zlasti §§1, 2.1 in 2.3–2.5. Uvodni primer je izvirno uredniško besedilo, ki izhaja iz motivacije računalniško podprtega geometrijskega oblikovanja v magistrskem delu; ni citat. Kubični izračun središčne točke in kvadratni razvoj sta izračunana primera.'},
            ]},
        ],
        source: 'Po Kevinu Štamparju, Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj (magistrsko delo, Univerza v Ljubljani, 2024), zlasti §§1, 2.1 in 2.3–2.5.'
    }
};

export const bezierActivityCopy: Record<BezierActivityId, Record<Language, {title: string; prompt: string; sectionId: BezierSectionId; demoHref: string}>> = {
    'shape-control': {
        en: {title: 'Move a control point', prompt: 'Drag an interior control, then drag an endpoint control. Watch the curve bend in the first move and the matching endpoint follow in the second. The four controls make a cubic: interior controls guide the path, while the endpoints lie on it.', sectionId: 'control-points', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control'},
        sl: {title: 'Premakni kontrolno točko', prompt: 'Povleci notranjo kontrolno točko, nato še krajiščno. Opazuj, kako prvi premik spremeni ukrivljenost, pri drugem pa ji sledi pripadajoče krajišče krivulje. Štiri točke določajo kubično krivuljo: notranje jo usmerjajo, krajišči pa ležita na njej.', sectionId: 'control-points', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control'},
    },
    'curve-parameter': {
        en: {title: 'Follow the parameter', prompt: 'Move the parameter from the midpoint toward the left endpoint and then the right endpoint, keeping all five controls fixed. Watch the marked point travel along the quartic curve; equal parameter steps need not cover equal distances. This five-control example uses the same family as the earlier cubic, with one more control and one higher representation degree.', sectionId: 'parameter', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter'},
        sl: {title: 'Spreminjaj parameter', prompt: 'Premakni parameter od sredine proti levemu krajišču in nato proti desnemu; vseh pet kontrolnih točk pusti pri miru. Opazuj označeno točko na kvartični krivulji; enaki koraki parametra ne pomenijo enakih razdalj. Primer s petimi točkami sodi v isto družino kot prej obravnavani kubični primer, le da ima eno točko več in za eno višjo predstavitveno stopnjo.', sectionId: 'parameter', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter'},
    },
    'repeated-interpolation': {
        en: {title: 'Repeat interpolation', prompt: 'Start at the midpoint and move the parameter toward an endpoint. Follow how each row shortens by one point and how the final point moves. With five controls there are four interpolation rounds: the same rule as the three-control quadratic derivation, extended by two rounds to degree four.', sectionId: 'interpolation', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation'},
        sl: {title: 'Ponavljaj interpolacijo', prompt: 'Začni pri sredinskem parametru in ga premakni proti krajišču. Sledi krajšanju vsake vrstice za eno točko in premiku končne točke. Pri petih kontrolnih točkah so štirje krogi interpolacije: isto pravilo kot pri izpeljavi kvadratne krivulje s tremi točkami, razširjeno za dva kroga do stopnje štiri.', sectionId: 'interpolation', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation'},
    },
    'blending-coefficients': {
        en: {title: 'See the blending coefficients', prompt: 'At degree two, compare the left endpoint function, the central function, and the right endpoint function by their shapes: each endpoint function reaches one at its own end, while the central one is zero at both ends and highest at the midpoint. Raise the degree to three and notice the extra function. These are weights, not curve coordinates; the degree-two quadratic uses three controls.', sectionId: 'bernstein-form', demoHref: '/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients'},
        sl: {title: 'Oglej si uteži', prompt: 'Pri stopnji dve primerjaj levo krajiščno, srednjo in desno krajiščno funkcijo po njihovi obliki: vsaka krajiščna doseže vrednost ena na svojem koncu, srednja pa je na obeh koncih enaka nič in največja na sredini. Zvišaj stopnjo na tri in opazuj dodatno funkcijo. To so uteži, ne koordinate krivulje; kvadratna krivulja s stopnjo dve uporablja tri kontrolne točke.', sectionId: 'bernstein-form', demoHref: '/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients'},
    },
    'geometric-bounds': {
        en: {title: 'Check the geometric bounds', prompt: 'Move an interior control and watch the control polygon, shaded hull, and curve update together. Check that the curve stays inside the hull. This picture shows examples; nonnegative coefficients summing to one explain containment for every \\(t\\in[0,1]\\).', sectionId: 'geometric-properties', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds'},
        sl: {title: 'Preveri geometrijske meje', prompt: 'Premakni notranjo kontrolno točko ter opazuj, kako se skupaj spremenijo kontrolni poligon, osenčena ovojnica in krivulja. Preveri, da krivulja ostane v ovojnici. Slika pokaže primere; nenegativni koeficienti z vsoto ena pojasnijo vsebovanost za vsak \\(t\\in[0,1]\\).', sectionId: 'geometric-properties', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds'},
    },
    'transform-shape': {
        en: {title: 'Transform a whole shape', prompt: 'Apply a translation, then try a rotation or scale on the prepared cubic example. Watch the control polygon and curve move or turn together, keeping the same relationship. An affine map of the controls maps every point of the curve because the Bernstein weights sum to one.', sectionId: 'affine-transformations', demoHref: '/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape'},
        sl: {title: 'Preoblikuj celotno obliko', prompt: 'Na pripravljenem kubičnem primeru najprej uporabi premik, nato preizkusi še vrtenje ali spremembo merila. Opazuj, kako se kontrolni poligon in krivulja skupaj premakneta ali zavrtita ter ohranita isti odnos. Afina preslikava kontrolnih točk preslika tudi vsako točko krivulje, ker je vsota Bernsteinovih uteži ena.', sectionId: 'affine-transformations', demoHref: '/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape'},
    },
};

