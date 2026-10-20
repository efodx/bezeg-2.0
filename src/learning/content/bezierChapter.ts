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
                {kind: 'paragraph', text: 'The first and last controls determine the curve’s endpoints. An interior control guides the curve, but is usually not itself on the curve; moving it changes the curve’s shape between the endpoints.'},
            ]},
            {id: 'parameter', title: 'A parameter selects a point', blocks: [
                {kind: 'paragraph', text: 'The curve is a rule that assigns a position to a number \\(t\\) between \\(0\\) and \\(1\\). We write the selected position as \\(B(t)\\). The parameter \\(t\\) tells us where we are in the curve’s construction: \\(B(0)=P_0\\) and \\(B(1)=P_n\\). Changing \\(t\\) selects another point on the same fixed curve. Moving a control point edits the curve itself.'},
                {kind: 'paragraph', text: 'The parameter is not generally a distance fraction. Increasing it by the same amount each time does not guarantee that the moving point travels the same distance each time. The curve can move faster through some regions than others.'},
                {kind: 'activity', id: 'curve-parameter'},
                {kind: 'paragraph', text: 'Changing the parameter selects another position along the same curve. The control points and curve shape remain fixed; the parameter marks progress through the construction, not a guaranteed fraction of distance.'},
            ]},
            {id: 'interpolation', title: 'A straight segment is repeated interpolation’s starting point', blocks: [
                {kind: 'paragraph', text: 'For endpoints \\(P\\) and \\(Q\\), scalar multiplication and addition act on each coordinate. If \\(P=(x_P,y_P)\\), \\(Q=(x_Q,y_Q)\\), and \\(0\\le t\\le1\\), then'},
                {kind: 'formula', label: 'Coordinate form of linear interpolation', latex: String.raw`(1-t)P+tQ=\bigl((1-t)x_P+tx_Q,\ (1-t)y_P+ty_Q\bigr)`},
                {kind: 'paragraph', text: 'We call this interpolated point \\(L(t)\\):'},
                {kind: 'formula', label: 'Linear interpolation', latex: String.raw`L(t)=(1-t)P+tQ`},
                {kind: 'paragraph', text: 'The point \\(L(t)\\) lies on the segment from \\(P\\) to \\(Q\\) when \\(0\\le t\\le1\\). The numbers \\(1-t\\) and \\(t\\) are complementary shares: they are nonnegative and add to one. At \\(t=\\frac14\\), the point is one quarter of the way from \\(P\\) to \\(Q\\); at \\(t=\\frac12\\), it is halfway; and at \\(t=\\frac34\\), it is three quarters of the way. This operation is linear interpolation.'},
                {kind: 'paragraph', text: 'The same operation can be repeated. Start with neighboring control points, interpolate between each pair using the same \\(t\\), and then interpolate between the new neighboring points. Repeating until one point remains gives a point on the Bézier curve. This construction is called the De Casteljau construction.'},
                {kind: 'activity', id: 'repeated-interpolation'},
                {kind: 'paragraph', text: 'Each row repeats the same straight-segment calculation on neighboring points. The final row has one point, which is exactly the curve position selected by the parameter in the mathematical construction.'},
                {kind: 'paragraph', text: 'Here is the simpler quadratic case, with three controls \\(P_0,P_1,P_2\\). First interpolate the neighboring pairs:'},
                {kind: 'formula', label: 'First interpolation row for three control points', latex: String.raw`Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2`},
                {kind: 'paragraph', text: 'Then interpolate those results with the same parameter:'},
                {kind: 'formula', label: 'Quadratic Bézier curve derived by repeated interpolation', latex: String.raw`\begin{aligned}B(t)&=(1-t)Q_0(t)+tQ_1(t)\\&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.\end{aligned}`},
                {kind: 'paragraph', text: 'The middle coefficient appears twice because \\(P_1\\) contributes through both first-row interpolations. This is a derivation for three controls; the next section gives the general formula. The De Casteljau activity above has five controls and remains a separate degree-four example.'},
            ]},
            {id: 'bernstein-form', title: 'Bernstein coefficients give a general formula', blocks: [
                {kind: 'paragraph', text: 'The quadratic expansion has coefficients that depend on \\(t\\), and those coefficients say how much each control contributes. For representation degree \\(n\\), define the Bernstein coefficient'},
                {kind: 'formula', label: 'Bernstein coefficient of degree n', latex: String.raw`b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad i=0,1,\ldots,n`},
                {kind: 'paragraph', text: 'The binomial coefficient \\(\\binom{n}{i}\\) counts the ways to choose \\(i\\) positions from \\(n\\); for example, \\(\\binom{2}{1}=2\\). A Bézier curve with controls \\(P_0,\\ldots,P_n\\) is'},
                {kind: 'formula', label: 'General Bézier curve formula in Bernstein form', latex: String.raw`B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad 0\le t\le1`},
                {kind: 'paragraph', text: 'The symbol \\(\\sum_{i=0}^{n}\\) means to add one term for each index \\(i\\), starting at zero and ending at \\(n\\). Thus the formula adds each control point multiplied by its matching Bernstein coefficient.'},
                {kind: 'paragraph', text: 'Thus \\(n+1\\) control points give a representation of degree \\(n\\). A special arrangement of controls can make the actual polynomial degree lower. “Representation degree” counts the controls in this formula; it does not promise that every such curve has exactly that polynomial degree. The quadratic expansion above illustrates the pattern. The general identity follows from the repeated-interpolation recurrence; the plot of a few coefficients is useful to inspect, but is not a proof for every degree.'},
                {kind: 'paragraph', text: 'The coefficients add to one because \\(((1-t)+t)^n\\) is a product of \\(n\\) identical factors. When expanded, choosing \\(i\\) of those factors to contribute \\(t\\) gives \\(\\binom{n}{i}\\) terms of the form \\((1-t)^{n-i}t^i\\). Adding all choices gives the full expansion, \\(((1-t)+t)^n=1\\).'},
                {kind: 'paragraph', text: 'The quadratic Bernstein activity starts at degree two to match the three-control derivation. Its graph shows basis functions, not a Bézier curve. In the separate ordinary cubic example, the degree is three and its four midpoint weights are \\(\\left(\\frac18,\\frac38,\\frac38,\\frac18\\right)\\). For its authored controls, repeated midpoint interpolation gives:'},
                {kind: 'formula', label: 'Worked cubic midpoint interpolation rows', latex: String.raw`\begin{aligned}\text{First row: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\\text{Second row: }&\left(-2,\frac34\right),\left(1,1\right),\\\text{Final point: }&\left(-\frac12,\frac78\right).\end{aligned}`},
                {kind: 'paragraph', text: 'This four-control-point calculation is a worked cubic example. It is separate from the quadratic derivation and from the degree-four De Casteljau activity.'},
                {kind: 'activity', id: 'blending-coefficients'},
                {kind: 'paragraph', text: 'At degree two, the graph lets you compare the three coefficient functions across the parameter interval. They are weights in the curve formula; by themselves they are not the curve’s coordinates.'},
            ]},
            {id: 'geometric-properties', title: 'Endpoints and the convex hull explain useful guarantees', blocks: [
                {kind: 'paragraph', text: 'At \\(t=0\\), all Bernstein coefficients are zero except \\(b_0^n(0)=1\\), so \\(B(0)=P_0\\). At \\(t=1\\), only \\(b_n^n(1)=1\\), so \\(B(1)=P_n\\). The curve therefore passes exactly through its first and last controls.'},
                {kind: 'paragraph', text: 'For every \\(t\\) in \\([0,1]\\), each coefficient is nonnegative. Their sum is one by the binomial theorem:'},
                {kind: 'formula', label: 'Bernstein coefficients sum to one', latex: String.raw`\sum_{i=0}^{n}b_i^n(t)=((1-t)+t)^n=1`},
                {kind: 'paragraph', text: 'A weighted combination with nonnegative weights summing to one is a convex combination. The convex hull of the controls is the smallest convex set containing them; “convex” means that the straight segment between any two points in the set also stays in it. This definition includes a line segment or a single point when the controls are degenerate. The curve lies inside this hull. One way to see why is to use the repeated construction: each step stays on a segment between points already in the hull, and convexity keeps that segment inside. This is a general guarantee, not a conclusion drawn from checking a handful of plotted positions. It applies on \\([0,1]\\); outside that interval some weights can be negative.'},
                {kind: 'paragraph', text: 'Interior controls need not lie on the curve. Their influence is global: for an interior index \\(i\\), the coefficient \\(b_i^n(t)\\) is positive at every \\(0<t<1\\). Moving that control therefore changes the curve throughout the open parameter interval, with a varying amount of change. The endpoints remain fixed. The hull gives a boundary for the whole curve, not an exact trace of it.'},
                {kind: 'activity', id: 'geometric-bounds'},
                {kind: 'paragraph', text: 'The curve may move inside the hull as controls change, but it remains within the convex set. This guarantee bounds the curve without claiming that it follows the polygon edges or passes through every control.'},
            ]},
            {id: 'affine-transformations', title: 'Transforming the controls transforms the curve', blocks: [
                {kind: 'paragraph', text: 'The ordinary Bézier example has its own four controls listed earlier. The affine demonstration uses a different, explicitly prepared cubic example; its picture and coordinates belong to that demonstration. In either case, the mathematical rule is the same: apply one affine transformation \\(T\\) to every control, and the new curve is the transformation of the old curve.'},
                {kind: 'paragraph', text: 'For a point \\(x=(x_1,x_2)\\), write a \\(2\\times2\\) matrix as \\(A=\\begin{pmatrix}a_{11}&a_{12}\\\\a_{21}&a_{22}\\end{pmatrix}\\); then \\(Ax=(a_{11}x_1+a_{12}x_2,a_{21}x_1+a_{22}x_2)\\). This linear part can rotate, reflect, or scale. A vector \\(c\\) is then added to translate the result. Together they define \\(T(x)=Ax+c\\). Since \\(B(t)=\\sum_{i=0}^{n} b_i^n(t)P_i\\) and the weights add to one,'},
                {kind: 'formula', label: 'Affine transformation commutes with the Bézier combination', latex: String.raw`\begin{aligned}T(B(t))&=A\left(\sum_{i=0}^{n}b_i^n(t)P_i\right)+c\\&=\sum_{i=0}^{n}b_i^n(t)\bigl(AP_i+c\bigr),\end{aligned}`},
                {kind: 'paragraph', text: 'In the second line, the translation is \\(c\\sum_{i=0}^{n} b_i^n(t)=c\\), because the weights sum to one. The result is exactly the Bézier formula made from the transformed controls \\(T(P_i)\\). This explains why translating, rotating, reflecting, or scaling the control data transforms the whole curve in the corresponding way.'},
                {kind: 'activity', id: 'transform-shape'},
                {kind: 'paragraph', text: 'Each supported operation acts on the control data, and the curve follows that same affine transformation. The translation argument works because the control weights add to one.'},
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
                {kind: 'paragraph', text: 'Prva in zadnja kontrolna točka določata krajišči krivulje. Notranja točka jo usmerja, vendar navadno ne leži na njej; njen premik spremeni obliko krivulje med krajiščema.'},
            ]},
            {id: 'parameter', title: 'Parameter izbere točko', blocks: [
                {kind: 'paragraph', text: 'Krivulja je pravilo, ki številu \\(t\\) med \\(0\\) in \\(1\\) priredi lego točke. Izbrano lego zapišemo kot \\(B(t)\\). Parameter \\(t\\) pove, kje smo v konstrukciji krivulje: \\(B(0)=P_0\\) in \\(B(1)=P_n\\). Ko spremenimo \\(t\\), izberemo drugo točko na isti krivulji. Premik kontrolne točke pa spremeni samo krivuljo.'},
                {kind: 'paragraph', text: 'Parameter na splošno ni delež dolžine krivulje. Enake spremembe parametra ne zagotavljajo, da bo premikajoča se točka vsakič prepotovala enako razdaljo. Na nekaterih delih se lahko giblje hitreje kot na drugih.'},
                {kind: 'activity', id: 'curve-parameter'},
                {kind: 'paragraph', text: 'Spreminjanje parametra izbere drugo lego na isti krivulji. Kontrolne točke in oblika krivulje ostanejo enake; parameter označuje napredovanje skozi konstrukcijo, ne pa zagotovljenega deleža dolžine.'},
            ]},
            {id: 'interpolation', title: 'Daljica je začetek ponovljene interpolacije', blocks: [
                {kind: 'paragraph', text: 'Pri krajiščih \\(P\\) in \\(Q\\) se skalarno množenje in seštevanje izvedeta za vsako koordinato posebej. Če sta \\(P=(x_P,y_P)\\), \\(Q=(x_Q,y_Q)\\) in \\(0\\le t\\le1\\), potem velja'},
                {kind: 'formula', label: 'Koordinatni zapis linearne interpolacije', latex: String.raw`(1-t)P+tQ=\bigl((1-t)x_P+tx_Q,\ (1-t)y_P+ty_Q\bigr)`},
                {kind: 'paragraph', text: 'Interpolirano točko označimo z \\(L(t)\\):'},
                {kind: 'formula', label: 'Linearna interpolacija', latex: String.raw`L(t)=(1-t)P+tQ`},
                {kind: 'paragraph', text: 'Točka \\(L(t)\\) leži na daljici od \\(P\\) do \\(Q\\), ko je \\(0\\le t\\le1\\). Števili \\(1-t\\) in \\(t\\) sta komplementarna deleža: sta nenegativni in imata vsoto ena. Pri \\(t=\\frac14\\) je točka četrt poti od \\(P\\) do \\(Q\\); pri \\(t=\\frac12\\) je na sredini, pri \\(t=\\frac34\\) pa je za njo tri četrtine poti. Temu postopku pravimo linearna interpolacija.'},
                {kind: 'paragraph', text: 'Isti postopek lahko ponavljamo. Začnemo s sosednjimi kontrolnimi točkami in z istim \\(t\\) interpoliramo vsak par. Nato interpoliramo nove sosednje točke. Ko postopek ponavljamo, dokler ne ostane ena točka, dobimo točko na Bézierjevi krivulji. To konstrukcijo imenujemo konstrukcija De Casteljau.'},
                {kind: 'activity', id: 'repeated-interpolation'},
                {kind: 'paragraph', text: 'V vsaki vrstici ponovimo isti izračun točke na daljici med sosednjima točkama. V zadnji vrstici ostane ena točka, ki je v matematični konstrukciji natanko lega krivulje pri izbranem parametru.'},
                {kind: 'paragraph', text: 'Oglejmo si preprostejši kvadratni primer s tremi kontrolnimi točkami \\(P_0,P_1,P_2\\). Najprej interpoliramo sosednja para:'},
                {kind: 'formula', label: 'Prva interpolacijska vrstica za tri kontrolne točke', latex: String.raw`Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2`},
                {kind: 'paragraph', text: 'Nato z istim parametrom interpoliramo rezultata:'},
                {kind: 'formula', label: 'Izpeljava kvadratne Bézierjeve krivulje s ponovljeno interpolacijo', latex: String.raw`\begin{aligned}B(t)&=(1-t)Q_0(t)+tQ_1(t)\\&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.\end{aligned}`},
                {kind: 'paragraph', text: 'Srednji koeficient se pojavi dvakrat, ker \\(P_1\\) prispeva k obema interpolacijama v prvi vrstici. To je izpeljava za tri kontrolne točke; v naslednjem razdelku podamo splošno formulo. Dejavnost De Casteljau zgoraj uporablja pet točk in je ločen primer stopnje štiri.'},
            ]},
            {id: 'bernstein-form', title: 'Bernsteinovi koeficienti dajo splošno formulo', blocks: [
                {kind: 'paragraph', text: 'V kvadratnem razvoju so koeficienti odvisni od \\(t\\) in povedo, koliko prispeva posamezna kontrolna točka. Pri predstavitveni stopnji \\(n\\) Bernsteinov koeficient določimo z'},
                {kind: 'formula', label: 'Bernsteinov koeficient stopnje n', latex: String.raw`b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad i=0,1,\ldots,n`},
                {kind: 'paragraph', text: 'Binomski koeficient \\(\\binom{n}{i}\\) prešteje načine, kako izberemo \\(i\\) mest med \\(n\\) mesti; na primer, \\(\\binom{2}{1}=2\\). Bézierjevo krivuljo s kontrolnimi točkami \\(P_0,\\ldots,P_n\\) podaja'},
                {kind: 'formula', label: 'Splošna Bézierjeva formula v Bernsteinovi obliki', latex: String.raw`B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad 0\le t\le1`},
                {kind: 'paragraph', text: 'Znak \\(\\sum_{i=0}^{n}\\) pomeni, da seštejemo po en člen za vsak indeks \\(i\\), od nič do \\(n\\). Formula torej prišteje vsako kontrolno točko, pomnoženo z ustreznim Bernsteinovim koeficientom.'},
                {kind: 'paragraph', text: 'Tako \\(n+1\\) kontrolnih točk poda predstavitev stopnje \\(n\\). Posebna razporeditev kontrolnih točk lahko zmanjša dejansko polinomsko stopnjo. »Predstavitvena stopnja« prešteje kontrolne točke v tej formuli, ne zagotavlja pa, da ima vsaka taka krivulja natanko to polinomsko stopnjo. Kvadratni razvoj zgoraj pokaže vzorec. Splošna enakost sledi rekurziji ponovljene interpolacije; graf nekaj koeficientov je koristen za opazovanje, ni pa dokaz za vse stopnje.'},
                {kind: 'paragraph', text: 'Koeficienti imajo vsoto ena, saj je \\(((1-t)+t)^n\\) produkt \\(n\\) enakih faktorjev. Pri razvoju izberemo \\(i\\) faktorjev, ki prispevajo \\(t\\), kar da \\(\\binom{n}{i}\\) členov oblike \\((1-t)^{n-i}t^i\\). Vsota vseh možnosti je razvoj \\(((1-t)+t)^n=1\\).'},
                {kind: 'paragraph', text: 'Dejavnost z Bernsteinovimi funkcijami se začne pri stopnji dve, da se ujema z izpeljavo za tri kontrolne točke. Njen graf prikazuje bazne funkcije, ne Bézierjeve krivulje. V ločenem običajnem kubičnem primeru je stopnja tri, štiri uteži pri srednjem parametru pa so \\(\\left(\\frac18,\\frac38,\\frac38,\\frac18\\right)\\). Pri vnaprej določenih kontrolnih točkah ponovljena sredinska interpolacija poda'},
                {kind: 'formula', label: 'Izračunane vrstice sredinske interpolacije za kubični primer', latex: String.raw`\begin{aligned}\text{Prva vrstica: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\\text{Druga vrstica: }&\left(-2,\frac34\right),\left(1,1\right),\\\text{Končna točka: }&\left(-\frac12,\frac78\right).\end{aligned}`},
                {kind: 'paragraph', text: 'Ta izračun za štiri kontrolne točke je obdelani kubični primer. Ločen je od kvadratne izpeljave in dejavnosti De Casteljau s stopnjo štiri.'},
                {kind: 'activity', id: 'blending-coefficients'},
                {kind: 'paragraph', text: 'Pri stopnji dve lahko na grafu primerjamo tri funkcije koeficientov na intervalu parametra. To so uteži v formuli za krivuljo; same po sebi pa ne predstavljajo njenih koordinat.'},
            ]},
            {id: 'geometric-properties', title: 'Krajišči in konveksna ovojnica pojasnita uporabni jamstvi', blocks: [
                {kind: 'paragraph', text: 'Pri \\(t=0\\) so vsi Bernsteinovi koeficienti enaki nič, razen \\(b_0^n(0)=1\\), zato je \\(B(0)=P_0\\). Pri \\(t=1\\) je enak ena samo \\(b_n^n(1)=1\\), zato velja \\(B(1)=P_n\\). Krivulja torej natančno poteka skozi prvo in zadnjo kontrolno točko.'},
                {kind: 'paragraph', text: 'Za vsak \\(t\\) na intervalu \\([0,1]\\) je vsak koeficient nenegativen. Njihova vsota je po binomskem izreku ena:'},
                {kind: 'formula', label: 'Vsota Bernsteinovih koeficientov je ena', latex: String.raw`\sum_{i=0}^{n}b_i^n(t)=((1-t)+t)^n=1`},
                {kind: 'paragraph', text: 'Utežena kombinacija z nenegativnimi utežmi, katerih vsota je ena, je konveksna kombinacija. Konveksna ovojnica kontrolnih točk je najmanjša konveksna množica, ki jih vsebuje; »konveksna« pomeni, da tudi daljica med poljubnima točkama množice ostane v njej. Taka definicija vključuje tudi daljico ali posamezno točko, kadar so kontrolne točke degenerirane. Krivulja leži znotraj te ovojnice. To lahko razumemo s ponovljeno konstrukcijo: vsak korak ostane na daljici med točkama, ki sta že v ovojnici, konveksnost pa zagotavlja, da je daljica v njej. To je splošno jamstvo, ne sklep iz preverjanja nekaj narisanih točk. Velja na \\([0,1]\\); zunaj tega intervala so lahko nekatere uteži negativne.'},
                {kind: 'paragraph', text: 'Notranje kontrolne točke niso nujno na krivulji. Njihov vpliv je globalen: za notranji indeks \\(i\\) je koeficient \\(b_i^n(t)\\) pozitiven pri vsakem \\(0<t<1\\). Premik točke zato spremeni krivuljo na celotnem odprtem intervalu parametra, vendar v različni meri. Krajišči ostaneta nespremenjeni. Ovojnica omeji celotno krivuljo, ne opisuje pa natančno njene poti.'},
                {kind: 'activity', id: 'geometric-bounds'},
                {kind: 'paragraph', text: 'Ko spreminjamo kontrolne točke, se krivulja lahko giblje znotraj ovojnice, vendar ostane v konveksni množici. To jamstvo omeji krivuljo, ne pomeni pa, da poteka po robovih poligona ali skozi vse kontrolne točke.'},
            ]},
            {id: 'affine-transformations', title: 'Če preoblikujemo kontrolne točke, se preoblikuje tudi krivulja', blocks: [
                {kind: 'paragraph', text: 'Običajni Bézierjev primer ima svoje štiri kontrolne točke, navedene prej. Prikaz afinega preoblikovanja uporablja drug, izrecno pripravljen kubični primer; slika in koordinate pripadajo temu prikazu. V obeh primerih velja isto matematično pravilo: če z afino transformacijo \\(T\\) preoblikujemo vse kontrolne točke, dobimo staro krivuljo, preoblikovano z \\(T\\).'},
                {kind: 'paragraph', text: 'Za točko \\(x=(x_1,x_2)\\) zapišemo matriko \\(2\\times2\\) kot \\(A=\\begin{pmatrix}a_{11}&a_{12}\\\\a_{21}&a_{22}\\end{pmatrix}\\); tedaj je \\(Ax=(a_{11}x_1+a_{12}x_2,a_{21}x_1+a_{22}x_2)\\). Ta linearni del lahko zavrti, zrcali ali spremeni merilo. Nato prištejemo vektor \\(c\\), ki povzroči premik. Skupaj določata \\(T(x)=Ax+c\\). Ker velja \\(B(t)=\\sum_{i=0}^{n} b_i^n(t)P_i\\) in je vsota uteži ena,'},
                {kind: 'formula', label: 'Afina transformacija in kombinacija Bézierjevih točk', latex: String.raw`\begin{aligned}T(B(t))&=A\left(\sum_{i=0}^{n}b_i^n(t)P_i\right)+c\\&=\sum_{i=0}^{n}b_i^n(t)\bigl(AP_i+c\bigr),\end{aligned}`},
                {kind: 'paragraph', text: 'V drugi vrstici je premik enak \\(c\\sum_{i=0}^{n} b_i^n(t)=c\\), ker je vsota uteži ena. Rezultat je natanko formula za Bézierjevo krivuljo, določeno s preoblikovanimi kontrolnimi točkami \\(T(P_i)\\). Zato premik, vrtenje, zrcaljenje ali spreminjanje merila kontrolnih podatkov na ustrezen način preoblikuje celotno krivuljo.'},
                {kind: 'activity', id: 'transform-shape'},
                {kind: 'paragraph', text: 'Vsaka podprta operacija deluje na kontrolnih podatkih in krivulja sledi isti afini transformaciji. Pri premiku je to mogoče zaradi vsote uteži ena.'},
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
        en: {title: 'Move a control point', prompt: 'Move an interior control and watch the curve change while its endpoints stay fixed. Then move an endpoint control and observe the corresponding end of the curve follow it.', sectionId: 'control-points', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control'},
        sl: {title: 'Premakni kontrolno točko', prompt: 'Premakni notranjo kontrolno točko in opazuj spremembo krivulje, medtem ko krajišči ostaneta nespremenjeni. Nato premakni krajiščno kontrolno točko in opazuj, kako ji sledi pripadajoče krajišče krivulje.', sectionId: 'control-points', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control'},
    },
    'curve-parameter': {
        en: {title: 'Follow the parameter', prompt: 'Vary the construction parameter while the five controls stay fixed. Notice what moves and what stays the same; equal changes in the parameter do not promise equal distances along the curve. This is the demonstration’s degree-four example, not the cubic example above.', sectionId: 'parameter', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter'},
        sl: {title: 'Spreminjaj parameter', prompt: 'Spreminjaj parameter konstrukcije, medtem ko pet kontrolnih točk ostane nespremenjenih. Opazuj, kaj se premika in kaj ostaja enako; enake spremembe parametra ne pomenijo enakih razdalj po krivulji. V tem prikazu je primer s stopnjo štiri, ne prej obravnavani kubični primer.', sectionId: 'parameter', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter'},
    },
    'repeated-interpolation': {
        en: {title: 'Repeat interpolation', prompt: 'Inspect the successive rows at the midpoint parameter. The prepared graph uses five controls, so it is degree four. Each new point lies between two points in the row above, and the final point is the curve point for that parameter.', sectionId: 'interpolation', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation'},
        sl: {title: 'Ponavljaj interpolacijo', prompt: 'Pri sredinskem parametru si oglej zaporedne vrstice konstrukcije. Pripravljen prikaz uporablja pet kontrolnih točk, zato je njegova stopnja štiri. Vsaka nova točka leži med dvema točkama v prejšnji vrstici; zadnja je točka krivulje za izbrani parameter.', sectionId: 'interpolation', demoHref: '/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation'},
    },
    'blending-coefficients': {
        en: {title: 'See the blending coefficients', prompt: 'It opens at degree two; inspect the three coefficients and, if useful, the stacked view. Their graph describes the coefficients, while the curve formula combines them with control points.', sectionId: 'bernstein-form', demoHref: '/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients'},
        sl: {title: 'Oglej si uteži', prompt: 'Odpre se pri stopnji dve; oglej si tri koeficiente in po želji še naloženi prikaz. Graf prikazuje koeficiente, formula za krivuljo pa jih združuje s kontrolnimi točkami.', sectionId: 'bernstein-form', demoHref: '/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients'},
    },
    'geometric-bounds': {
        en: {title: 'Check the geometric bounds', prompt: 'The authored activity opens with the control polygon and convex hull shown. Move a control and compare the curve with the hull. The graph offers examples to inspect; nonnegative coefficients summing to one explain why containment holds for all \\(t\\in[0,1]\\).', sectionId: 'geometric-properties', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds'},
        sl: {title: 'Preveri geometrijske meje', prompt: 'Pripravljena dejavnost ob odprtju že pokaže kontrolni poligon in konveksno ovojnico. Premakni kontrolno točko in primerjaj krivuljo z ovojnico. Na grafu opazujemo primere; nenegativni koeficienti z vsoto ena pa pojasnijo, zakaj vsebovanost velja za vsak \\(t\\in[0,1]\\).', sectionId: 'geometric-properties', demoHref: '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds'},
    },
    'transform-shape': {
        en: {title: 'Transform a whole shape', prompt: 'Try the supported translation, scale, rotation, or reflection controls and observe the demonstration’s labeled cubic example. The controls transform the curve’s control points.', sectionId: 'affine-transformations', demoHref: '/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape'},
        sl: {title: 'Preoblikuj celotno obliko', prompt: 'Preizkusi podprte možnosti za premik, spremembo merila, vrtenje ali zrcaljenje na označenem kubičnem primeru. Kontrole preoblikujejo kontrolne točke krivulje.', sectionId: 'affine-transformations', demoHref: '/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape'},
    },
};

