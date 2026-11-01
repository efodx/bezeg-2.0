import type {LessonAction, LessonDefinition, LessonPoint, LessonStep, LessonViewBox, LocalizedText} from '../model';
import type {PointSetOverlayName} from '../../compgeo/pointSetModel';

// Triangle geometry chapter-owned guided activities (spec T1 and T2). Every number is recomputed in triangleGeometryChapter.test.ts
// from the triangle and circle kernel. Scene actions run synchronously in one tick; each scene starts from the Demonstration
// default (which also resets the overlays and the view) and then names its state.
// Sources are given by author and title only: H. S. M. Coxeter, Introduction to Geometry; Euclid, Elements III.20, III.21, III.22, III.31.

const words = (sl: string, en: string): LocalizedText => ({sl, en});

const defaultScene = (sceneId: string, view?: LessonViewBox): LessonAction =>
    view ? {kind: 'prepared-scene', sceneId, source: 'demonstration-default', view} : {kind: 'prepared-scene', sceneId, source: 'demonstration-default'};
const triangle = (...points: readonly LessonPoint[]): LessonAction => ({kind: 'point-set', operation: 'set-points', points, mode: 'points'});
const overlays = (names: readonly PointSetOverlayName[], all: readonly PointSetOverlayName[]): LessonAction[] =>
    all.map(overlay => ({kind: 'point-set', operation: 'set-overlay', overlay, visible: names.includes(overlay)}));
const glider = (value: number): LessonAction => ({kind: 'parameter', name: 't', value});

const NOTABLE_OVERLAYS = ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'] as const;
const INSCRIBED_OVERLAYS = ['radii', 'angles'] as const;

/** The checked examples of spec T1; the obtuse one sits in the view that holds both far centres. */
export const DEFAULT_TRIANGLE: readonly LessonPoint[] = [[0, 0], [7, 0], [2, 5]];
export const OBTUSE_TRIANGLE: readonly LessonPoint[] = [[0, 0], [7, 0], [1, 1]];
export const RIGHT_TRIANGLE: readonly LessonPoint[] = [[0, 0], [4, 0], [0, 3]];
/** The obtuse example: O = (7/2, -5/2) and H = (1, 6) lie inside this box, together with the circumcircle of radius 4.30 about O. */
export const OBTUSE_VIEW: LessonViewBox = [-4, 8, 11, -8];
/** The Thales instance: the circle about (4, 3) with radius 5 lies inside this box. */
export const THALES_TRIANGLE: readonly LessonPoint[] = [[0, 0], [8, 6], [1, 7]];
export const THALES_VIEW: LessonViewBox = [-3, 10, 11, -4];

function notableStep(id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, shown: readonly (typeof NOTABLE_OVERLAYS)[number][],
                     options: {points?: readonly LessonPoint[]; view?: LessonViewBox} = {}): LessonStep {
    return {
        id, title, body, prompt,
        scene: {actions: [defaultScene(`triangle-centres-${id}`, options.view), ...(options.points ? [triangle(...options.points)] : []), ...overlays(shown, NOTABLE_OVERLAYS)]},
    };
}

function inscribedStep(id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, shown: readonly (typeof INSCRIBED_OVERLAYS)[number][],
                       t: number, options: {points?: readonly LessonPoint[]; view?: LessonViewBox} = {}): LessonStep {
    return {
        id, title, body, prompt,
        scene: {actions: [defaultScene(`inscribed-angle-${id}`, options.view), ...(options.points ? [triangle(...options.points)] : []), ...overlays(shown, INSCRIBED_OVERLAYS), glider(t)]},
    };
}

export const triangleCentresLesson: LessonDefinition = {
    id: 'triangle-notable-points',
    demonstrationId: 'triangle-centres',
    title: words('Znamenite točke trikotnika', 'Notable points of a triangle'),
    summary: words(
        'Štiri znamenite točke trikotnika nastanejo s štirimi različnimi konstrukcijami: težiščnicami, simetralami stranic, simetralami kotov in višinami. Središče očrtane krožnice je znotraj trikotnika natanko tedaj, ko je trikotnik ostrokoten, in na sredini hipotenuze natanko tedaj, ko je pravokoten.',
        'The four notable points of a triangle come from four different constructions: medians, perpendicular bisectors, angle bisectors and altitudes. The circumcentre is inside the triangle exactly when the triangle is acute, and at the midpoint of the hypotenuse exactly when it is right-angled.',
    ),
    steps: [
        notableStep('centroid',
            words('Težišče iz težiščnic', 'The centroid from the medians'),
            words('Trikotnik z oglišči \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2) in \\(C=(2,5)\\) (P3) ima ploščino \\(S=35/2\\). Težiščnica povezuje oglišče s središčem nasprotne stranice. Težišče \\(G\\) je presečišče težiščnic: \\(G=(3,\\,5/3)\\), kjer je \\(5/3\\approx1{,}6667\\). Izrek (H. S. M. Coxeter, Introduction to Geometry): vse tri težiščnice se sekajo v eni točki, ki vsako od njih razdeli v razmerju \\(2:1\\) od oglišča proti stranici. Sekanje v eni točki in razmerje dveh tretjin sta izreka; vlečenje ju ponazarja, ne dokazuje.',
                'The triangle with vertices \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2) and \\(C=(2,5)\\) (P3) has area \\(S=35/2\\). A median joins a vertex to the midpoint of the opposite side. The centroid \\(G\\) is where the medians meet: \\(G=(3,\\,5/3)\\), where \\(5/3\\approx1.6667\\). Theorem (H. S. M. Coxeter, Introduction to Geometry): all three medians meet in one point, which divides each of them in the ratio \\(2:1\\) from the vertex towards the side. That the medians meet in one point and the ratio of two thirds are theorems; dragging illustrates them and does not prove them.'),
            words('Napovej, ali lahko težišče zapusti trikotnik, nato povleci oglišča in preveri.', 'Predict whether the centroid can leave the triangle, then drag the vertices and check.'),
            ['triangle', 'centroid']),
        notableStep('circumcentre',
            words('Središče očrtane krožnice iz simetral stranic', 'The circumcentre from the perpendicular bisectors'),
            words('Središče očrtane krožnice \\(O\\) je presečišče simetral stranic. Za isti trikotnik je \\(O=(7/2,\\,3/2)\\) in \\(R^2=29/2\\), torej \\(R\\approx3{,}8079\\). Točka \\(O\\) je enako oddaljena od vseh treh oglišč: \\(|OA|^2=|OB|^2=|OC|^2=29/2\\). Izrek (Coxeter): simetrale stranic se sekajo v eni točki, zato skozi oglišča trikotnika gre natanko ena krožnica.',
                'The circumcentre \\(O\\) is where the perpendicular bisectors of the sides meet. For the same triangle \\(O=(7/2,\\,3/2)\\) and \\(R^2=29/2\\), so \\(R\\approx3.8079\\). The point \\(O\\) is equally far from all three vertices: \\(|OA|^2=|OB|^2=|OC|^2=29/2\\). Theorem (Coxeter): the perpendicular bisectors meet in one point, so exactly one circle passes through the vertices of a triangle.'),
            words('Pokaži \\(O\\) in očrtano krožnico ter povleci eno oglišče: kako se premika \\(O\\)?', 'Show \\(O\\) and the circumcircle and drag one vertex: how does \\(O\\) move?'),
            ['triangle', 'centroid', 'circumcentre']),
        notableStep('incentre',
            words('Središče včrtane krožnice iz simetral kotov', 'The incentre from the angle bisectors'),
            words('Središče včrtane krožnice \\(I\\) je presečišče simetral kotov in je enako oddaljeno od vseh treh stranic. Tu je \\(I\\approx(2{,}6570;\\,1{,}7989)\\) in polmer včrtane krožnice \\(r=S/s\\approx1{,}7989\\) (\\(s\\) je polovica obsega). Koordinata \\(y\\) točke \\(I\\) je enaka \\(r\\), ker stranica \\(AB\\) leži na osi \\(x\\). Točka \\(I\\) je v splošnem iracionalna, zato je prikazana kot decimalno število; za razliko od drugih treh točk ni natančen ulomek. Izrek (Coxeter): simetrale kotov se sekajo v eni točki.',
                'The incentre \\(I\\) is where the angle bisectors meet and is equally far from all three sides. Here \\(I\\approx(2.6570,\\,1.7989)\\) and the inradius is \\(r=S/s\\approx1.7989\\) (\\(s\\) is the semiperimeter). The \\(y\\)-coordinate of \\(I\\) equals \\(r\\) because the side \\(AB\\) lies on the \\(x\\)-axis. In general \\(I\\) is irrational, so it is shown as a decimal; unlike the other three points it is not an exact fraction. Theorem (Coxeter): the angle bisectors meet in one point.'),
            words('Pokaži \\(I\\) in včrtano krožnico. Ali se dotika vseh treh stranic?', 'Show \\(I\\) and the incircle. Does it touch all three sides?'),
            ['triangle', 'centroid', 'circumcentre', 'incentre']),
        notableStep('orthocentre',
            words('Višinska točka iz višin', 'The orthocentre from the altitudes'),
            words('Višina je pravokotnica iz oglišča na nasprotno stranico. Višinska točka \\(H\\) je presečišče višin: \\(H=(2,\\,2)\\). Višina iz \\(C\\) je premica \\(x=2\\), višina iz \\(A\\) pa \\(y=x\\), ker je stranica \\(BC\\) v smeri \\((-1,1)\\). Izrek (Coxeter): tri višine se sekajo v eni točki. Pri tem ostrokotnem trikotniku so vse štiri točke \\(G\\), \\(O\\), \\(I\\) in \\(H\\) znotraj trikotnika.',
                'An altitude is the perpendicular from a vertex to the opposite side. The orthocentre \\(H\\) is where the altitudes meet: \\(H=(2,\\,2)\\). The altitude from \\(C\\) is the line \\(x=2\\) and the altitude from \\(A\\) is \\(y=x\\), because the side \\(BC\\) points in the direction \\((-1,1)\\). Theorem (Coxeter): the three altitudes meet in one point. In this acute triangle all four points \\(G\\), \\(O\\), \\(I\\) and \\(H\\) are inside the triangle.'),
            words('Pokaži \\(H\\) in višine ter ugotovi, kaj imajo skupnega vse štiri točke pri tem trikotniku.', 'Show \\(H\\) and the altitudes and find what the four points have in common in this triangle.'),
            ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre']),
        notableStep('right-angle',
            words('Pravi kot: središče na hipotenuzi', 'The right angle: the centre on the hypotenuse'),
            words('Za trikotnik \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(0,3)\\) je skalarni produkt \\(\\vec{AB}\\cdot\\vec{AC}=0\\), zato je pri \\(A\\) pravi kot; graf to presodi natančno s celoštevilskimi skalarnimi produkti, ne s toleranco. Središče očrtane krožnice je \\(O=(2,\\,3/2)\\), sredina hipotenuze \\(BC\\), s polmerom \\(R=5/2\\); višinska točka \\(H=(0,0)\\) je pravokotno oglišče. Polmer včrtane krožnice je \\(r=1\\) in \\(I=(1,1)\\). Izrek (Coxeter): središče očrtane krožnice je znotraj trikotnika natanko tedaj, ko je ostrokoten, na hipotenuzi natanko tedaj, ko je pravokoten, in zunaj natanko tedaj, ko je topokoten. Vlečenje to le ponazarja.',
                'For the triangle \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(0,3)\\) the dot product \\(\\vec{AB}\\cdot\\vec{AC}=0\\), so the angle at \\(A\\) is right; the graph decides this exactly from integer dot products, not with a tolerance. The circumcentre is \\(O=(2,\\,3/2)\\), the midpoint of the hypotenuse \\(BC\\), with radius \\(R=5/2\\); the orthocentre \\(H=(0,0)\\) is the right-angle vertex. The inradius is \\(r=1\\) and \\(I=(1,1)\\). Theorem (Coxeter): the circumcentre is inside the triangle exactly when it is acute, on the hypotenuse exactly when it is right-angled, and outside exactly when it is obtuse. Dragging only illustrates this.'),
            words('Povleci \\(C\\) (P3) za en korak desno in nato za en korak levo od osi \\(y\\). Kam gre \\(O\\) in kakšna je oznaka trikotnika?', 'Drag \\(C\\) (P3) one step to the right and then one step to the left of the \\(y\\)-axis. Where does \\(O\\) go and what is the triangle labelled?'),
            ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'], {points: RIGHT_TRIANGLE}),
        notableStep('obtuse',
            words('Topokotni trikotnik', 'An obtuse triangle'),
            words('Za \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(1,1)\\) je skalarni produkt pri \\(C\\) enak \\((-1)(6)+(-1)(-1)=-5<0\\), zato je kot pri \\(C\\) topi. Središče očrtane krožnice \\(O=(7/2,\\,-5/2)\\) in višinska točka \\(H=(1,\\,6)\\) sta zunaj trikotnika, težišče \\(G=(8/3,\\,1/3)\\) pa znotraj. Pogled je razširjen, da sta \\(O\\) in \\(H\\) vidna. Zunaj je središče očrtane krožnice zato, ker je trikotnik topokoten, kar pove izrek iz prejšnjega koraka.',
                'For \\(A=(0,0)\\), \\(B=(7,0)\\), \\(C=(1,1)\\) the dot product at \\(C\\) is \\((-1)(6)+(-1)(-1)=-5<0\\), so the angle at \\(C\\) is obtuse. The circumcentre \\(O=(7/2,\\,-5/2)\\) and the orthocentre \\(H=(1,\\,6)\\) are outside the triangle, while the centroid \\(G=(8/3,\\,1/3)\\) is inside. The view is widened so that \\(O\\) and \\(H\\) are visible. The circumcentre is outside because the triangle is obtuse, as the theorem of the previous step says.'),
            words('Ali sta \\(O\\) in \\(H\\) na isti strani trikotnika? Povleci \\(C\\) in opazuj, kdaj \\(O\\) preide čez stranico \\(AB\\).', 'Are \\(O\\) and \\(H\\) on the same side of the triangle? Drag \\(C\\) and watch when \\(O\\) crosses the side \\(AB\\).'),
            ['triangle', 'centroid', 'circumcentre', 'orthocentre'], {points: OBTUSE_TRIANGLE, view: OBTUSE_VIEW}),
        notableStep('explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Pokazane so vse znamenite točke. Povleci oglišča, zapiši koordinate v polja in preizkusi tudi tri točke na isti premici: tedaj trikotnik ni določen in graf pove, zakaj ni očrtane krožnice ali višinske točke. Vsak položaj je primer izreka, ne njegov dokaz.',
                'All notable points are shown. Drag the vertices, type coordinates into the fields and also try three points on one line: then the triangle is degenerate and the graph says why there is no circumcircle or orthocentre. Each position is an instance of a theorem, not a proof of it.'),
            words('Poišči trikotnik, pri katerem je \\(O\\) zunaj, in trikotnik, pri katerem je na stranici.', 'Find a triangle whose \\(O\\) is outside and a triangle whose \\(O\\) is on a side.'),
            ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre']),
    ],
};

export const inscribedAngleLesson: LessonDefinition = {
    id: 'inscribed-angle-thales',
    demonstrationId: 'inscribed-angle',
    title: words('Obodni kot in Talesov izrek', 'The inscribed angle and Thales\' theorem'),
    summary: words(
        'Vsi obodni koti nad istim lokom so enaki in enaki polovici središčnega kota; obodni kot nad premerom je pravi kot (Talesov izrek), na nasprotnem loku pa je obodni kot dopolnilni kot do \\(180^\\circ\\).',
        'All inscribed angles over the same arc are equal, and each is half the central angle; an inscribed angle over a diameter is a right angle (Thales\' theorem), and on the other arc the inscribed angle is the supplement to \\(180^\\circ\\).',
    ),
    steps: [
        inscribedStep('chord',
            words('Tetiva in točka P', 'A chord and the point P'),
            words('Skozi \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2) in \\(C=(2,5)\\) (P3) gre krožnica s središčem \\(O=(7/2,\\,3/2)\\) in \\(R^2=29/2\\). Tetiva \\(AB\\) jo razdeli na dva loka. Obodni kot v \\(C\\) je \\(\\angle ACB\\approx66{,}8^\\circ\\). Točka \\(P\\) se po krožnici premika s parametrom \\(t\\) v stopinjah; je edini približni objekt na grafu, ker je izračunana z decimalnimi števili. Pri \\(t=90^\\circ\\) je \\(P\\) nad središčem, na istem loku kot \\(C\\).',
                'The circle with centre \\(O=(7/2,\\,3/2)\\) and \\(R^2=29/2\\) passes through \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2) and \\(C=(2,5)\\) (P3). The chord \\(AB\\) splits it into two arcs. The inscribed angle at \\(C\\) is \\(\\angle ACB\\approx66.8^\\circ\\). The point \\(P\\) moves along the circle by the parameter \\(t\\) in degrees; it is the only inexact (approximate) object on the graph, because it is computed with floating-point numbers. At \\(t=90^\\circ\\) the point \\(P\\) is above the centre, on the same arc as \\(C\\).'),
            words('Napovej, kako se spreminja \\(\\angle APB\\), ko premikaš \\(P\\) po loku nad tetivo, nato preberi odčitek.', 'Predict how \\(\\angle APB\\) changes as you move \\(P\\) along the arc above the chord, then read the readout.'),
            ['angles'], 90),
        inscribedStep('same-arc',
            words('Isti lok: kot ostane enak', 'The same arc: the angle stays equal'),
            words('Izrek (Evklid, Elementi III.21): obodni koti nad istim lokom so enaki. Pri \\(t=60^\\circ\\), \\(90^\\circ\\) in \\(120^\\circ\\) je \\(\\angle APB\\approx66{,}8^\\circ\\), kar je enako \\(\\angle ACB\\) na prikazano natančnost; za točko \\(P\\) ne trdimo več kot enakost na prikazano natančnost. Kot \\(\\angle APB\\) ni določen, če je \\(P\\) v \\(A\\) ali \\(B\\); zato parameter \\(t\\) teh dveh leg ne zavzame. Vlečenje to ponazarja; izrek velja zaradi dokaza.',
                'Theorem (Euclid, Elements III.21): inscribed angles over the same arc are equal. At \\(t=60^\\circ\\), \\(90^\\circ\\) and \\(120^\\circ\\) we get \\(\\angle APB\\approx66.8^\\circ\\), which equals \\(\\angle ACB\\) to the displayed precision; for the point \\(P\\) we claim nothing beyond equality to the displayed precision. The angle \\(\\angle APB\\) is not defined when \\(P\\) is at \\(A\\) or \\(B\\), so the parameter \\(t\\) never takes those two positions. Dragging illustrates this; the theorem holds because of its proof.'),
            words('Povleci \\(P\\) z enega konca loka na drugega. Ali se odčitek kdaj spremeni za več kot zaokrožitev?', 'Drag \\(P\\) from one end of the arc to the other. Does the readout ever change by more than rounding?'),
            ['angles'], 60),
        inscribedStep('central',
            words('Središčni kot je dvakratnik', 'The central angle is twice as large'),
            words('Izrek (Evklid III.20): središčni kot nad tetivo je dvakratnik obodnega kota nad istim lokom. Tu je \\(\\angle AOB\\approx133{,}6^\\circ=2\\cdot66{,}8^\\circ\\) (obe vrednosti sta zaokroženi na desetinko stopinje). Središčni kot meri lok brez \\(C\\); zato je obodni kot polovica središčnega.',
                'Theorem (Euclid III.20): the central angle over a chord is twice the inscribed angle over the same arc. Here \\(\\angle AOB\\approx133.6^\\circ=2\\cdot66.8^\\circ\\) (both values are rounded to a tenth of a degree). The central angle measures the arc without \\(C\\); so the inscribed angle is half of it.'),
            words('Preveri na odčitkih, da je središčni kot dvakrat večji od obodnega.', 'Check on the readouts that the central angle is twice the inscribed angle.'),
            ['angles', 'radii'], 90),
        inscribedStep('other-arc',
            words('Nasprotni lok: dopolnilni kot', 'The other arc: the supplement'),
            words('Če je \\(P\\) na nasprotni strani tetive \\(AB\\) od \\(C\\), na primer pri \\(t=270^\\circ\\), je \\(\\angle APB\\approx113{,}2^\\circ=180^\\circ-66{,}8^\\circ\\). Izrek (Evklid III.22): nasprotna kota tetivnega štirikotnika \\(ACBP\\) se seštejeta v \\(180^\\circ\\). Enakost velja na prikazano natančnost.',
                'If \\(P\\) is on the other side of the chord \\(AB\\) from \\(C\\), for example at \\(t=270^\\circ\\), then \\(\\angle APB\\approx113.2^\\circ=180^\\circ-66.8^\\circ\\). Theorem (Euclid III.22): opposite angles of a cyclic quadrilateral \\(ACBP\\) add up to \\(180^\\circ\\). The displayed equality holds to the displayed precision.'),
            words('Povleci \\(P\\) čez \\(A\\) ali \\(B\\) na nasprotni lok. Kaj se zgodi z odčitkom in kaj z oznako loka?', 'Drag \\(P\\) across \\(A\\) or \\(B\\) to the other arc. What happens to the readout and to the arc label?'),
            ['angles'], 270),
        inscribedStep('diameter',
            words('Tetiva kot premer', 'The chord as a diameter'),
            words('Za \\(A=(0,0)\\), \\(B=(8,6)\\) in \\(C=(1,7)\\) je tetiva \\(AB\\) premer krožnice s središčem \\((4,3)\\) in polmerom \\(5\\). Središčni kot je \\(180^\\circ\\) in obodni kot je \\(\\angle ACB=90^\\circ\\). Izrek (Evklid III.31, Talesov izrek): obodni kot nad premerom je pravi kot. Ker je dopolnilni kot pravega kota spet pravi, odčitek \\(\\angle APB\\) ostane \\(90^\\circ\\) na obeh lokih.',
                'For \\(A=(0,0)\\), \\(B=(8,6)\\) and \\(C=(1,7)\\) the chord \\(AB\\) is a diameter of the circle with centre \\((4,3)\\) and radius \\(5\\). The central angle is \\(180^\\circ\\) and the inscribed angle is \\(\\angle ACB=90^\\circ\\). Theorem (Euclid III.31, Thales\' theorem): an inscribed angle over a diameter is a right angle. Since the supplement of a right angle is again a right angle, the readout \\(\\angle APB\\) stays \\(90^\\circ\\) on both arcs.'),
            words('Povleci \\(P\\) po obeh lokih in preveri, da je odčitek povsod \\(90^\\circ\\).', 'Drag \\(P\\) along both arcs and check that the readout is \\(90^\\circ\\) everywhere.'),
            ['angles', 'radii'], 60, {points: THALES_TRIANGLE, view: THALES_VIEW}),
        inscribedStep('lattice',
            words('Mrežna točka kot natančen primer', 'A lattice point as an exact instance'),
            words('Točka \\(C=(1,7)\\) leži na krožnici, ker je \\(|C-(4,3)|^2=9+16=25=5^2\\). Skalarni produkt \\((1-0)(1-8)+(7-0)(7-6)=-7+7=0\\) je natanko nič, zato je kot pri \\(C\\) pravi. To graf presodi natančno s celoštevilskim računom, ne s točko \\(P\\) in ne s toleranco. Besedilo »AB je premer (natančno)« v odčitkih je torej trditev o mrežnih točkah, odčitki za \\(P\\) pa so le zaokroženi.',
                'The point \\(C=(1,7)\\) lies on the circle because \\(|C-(4,3)|^2=9+16=25=5^2\\). The dot product \\((1-0)(1-8)+(7-0)(7-6)=-7+7=0\\) is exactly zero, so the angle at \\(C\\) is right. The graph decides this exactly with integer arithmetic, not with the point \\(P\\) and not with a tolerance. The text "AB is a diameter (exactly)" in the readouts is therefore a statement about lattice points, while the readouts for \\(P\\) are only rounded.'),
            words('Povleci \\(C\\) (P3) za en korak. Ali je \\(AB\\) še vedno premer?', 'Drag \\(C\\) (P3) one step. Is \\(AB\\) still a diameter?'),
            ['angles', 'radii'], 90, {points: THALES_TRIANGLE, view: THALES_VIEW}),
        inscribedStep('explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Pokazano je vse. Povleci \\(A\\), \\(B\\) in \\(C\\) ter točko \\(P\\) in opazuj tri kote. Vsak položaj je primer izreka, ne njegov dokaz; edini približni objekt je \\(P\\), vse drugo se računa natančno na mreži.',
                'Everything is shown. Drag \\(A\\), \\(B\\), \\(C\\) and the point \\(P\\) and watch the three angles. Each position is an instance of the theorem, not a proof of it; the only approximate object is \\(P\\), everything else is computed exactly on the grid.'),
            words('Poišči tetivo, pri kateri je obodni kot topi, in preveri središčni kot.', 'Find a chord whose inscribed angle is obtuse and check the central angle.'),
            ['angles', 'radii'], 90),
    ],
};
