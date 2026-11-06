import type {LessonAction, LessonDefinition, LessonPoint, LessonStep, LessonViewBox, LocalizedText} from '../model';
import type {PointSetOverlayName} from '../../compgeo/pointSetModel';
import type {SimsonExampleId, SimsonOffset} from '../../compgeo/simsonLineModel';
import type {InversionExampleId} from '../../compgeo/inversionModel';

// Triangle geometry chapter-owned guided activities (spec T1 to T5). Every number is recomputed in triangleGeometryChapter.test.ts
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

// Spec T3 (Euler line and nine-point circle). Sources by author and title only: H. S. M. Coxeter, Introduction to Geometry.
// The drag is called an illustration; no proof idea is given because the board does not show the homothety.
const EULER_OVERLAYS = ['triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle'] as const;
/** The checked near-equilateral example: H = (4, 16/7), O = (4, 33/14), |HO| = 1/14, R = 65/14. */
export const NEAR_EQUILATERAL_TRIANGLE: readonly LessonPoint[] = [[0, 0], [8, 0], [4, 7]];
/** The apex C = (4, 7) is above the graph's default view; the box holds the vertices, the circumcircle about (4, 33/14) with R = 65/14 and the nine-point circle. */
export const NEAR_EQUILATERAL_VIEW: LessonViewBox = [-2, 9, 10, -3];

function eulerStep(id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, shown: readonly (typeof EULER_OVERLAYS)[number][],
                   options: {points?: readonly LessonPoint[]; view?: LessonViewBox} = {}): LessonStep {
    return {
        id, title, body, prompt,
        scene: {actions: [defaultScene(`euler-line-${id}`, options.view), ...(options.points ? [triangle(...options.points)] : []), ...overlays(shown, EULER_OVERLAYS)]},
    };
}

export const eulerLineLesson: LessonDefinition = {
    id: 'euler-line-nine-point',
    demonstrationId: 'euler-line',
    title: words('Eulerjeva premica in krožnica devetih točk', 'The Euler line and the nine-point circle'),
    summary: words(
        'Središče očrtane krožnice \\(O\\), težišče \\(G\\) in višinska točka \\(H\\) ležijo na eni premici, Eulerjevi premici, in velja \\(HG=2\\,GO\\). Razpolovišča stranic, vznožja višin in razpolovišča daljic od oglišč do \\(H\\) ležijo na krožnici s središčem \\((O+H)/2\\) in polmerom \\(R/2\\); pri posebnih trikotnikih nekatere od teh devetih točk sovpadejo.',
        'The circumcentre \\(O\\), the centroid \\(G\\) and the orthocentre \\(H\\) lie on one line, the Euler line, and \\(HG=2\\,GO\\). The midpoints of the sides, the feet of the altitudes and the midpoints of the segments from the vertices to \\(H\\) lie on a circle with centre \\((O+H)/2\\) and radius \\(R/2\\); for special triangles some of these nine points coincide.',
    ),
    steps: [
        eulerStep('centres',
            words('O, G in H trikotnika', 'O, G and H of the triangle'),
            words('Trikotnik \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2), \\(C=(2,5)\\) (P3) iz prve naloge ima središče očrtane krožnice \\(O=(7/2,\\,3/2)\\), težišče \\(G=(3,\\,5/3)\\) in višinsko točko \\(H=(2,\\,2)\\). To so tri različne točke, vse izračunane natančno kot ulomki. Ali ležijo na isti premici, še ne vemo; to bomo preverili.',
                'The triangle \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2), \\(C=(2,5)\\) (P3) from the first lesson has circumcentre \\(O=(7/2,\\,3/2)\\), centroid \\(G=(3,\\,5/3)\\) and orthocentre \\(H=(2,\\,2)\\). These are three different points, all computed exactly as fractions. Whether they lie on one line we do not know yet; we are going to check it.'),
            words('Napovej, ali lahko ležijo \\(O\\), \\(G\\) in \\(H\\) na isti premici, in kje bo \\(G\\) glede na \\(O\\) in \\(H\\).', 'Predict whether \\(O\\), \\(G\\) and \\(H\\) can lie on one line, and where \\(G\\) will be relative to \\(O\\) and \\(H\\).'),
            ['triangle', 'centres']),
        eulerStep('line',
            words('Premica skozi O, G in H', 'The line through O, G and H'),
            words('Premica skozi \\(O\\), \\(G\\) in \\(H\\) je Eulerjeva premica. Razdalji sta \\(HG\\approx1{,}05409\\) in \\(GO\\approx0{,}52705\\), torej \\(HG=2\\,GO\\). Graf to presodi natančno z ulomki: \\(HG^2=10/9\\) in \\(GO^2=5/18\\), zato je \\(HG^2=4\\,GO^2\\), orientacija trojice \\(O,G,H\\) pa je natanko \\(0\\). Decimalni zapisi so le zaokrožitve odčitkov.',
                'The line through \\(O\\), \\(G\\) and \\(H\\) is the Euler line. The distances are \\(HG\\approx1.05409\\) and \\(GO\\approx0.52705\\), so \\(HG=2\\,GO\\). The graph decides this exactly with fractions: \\(HG^2=10/9\\) and \\(GO^2=5/18\\), so \\(HG^2=4\\,GO^2\\), and the orientation of the triple \\(O,G,H\\) is exactly \\(0\\). The decimals are only roundings of the readouts.'),
            words('Preberi \\(HG\\) in \\(GO\\) ter izračunaj njun količnik.', 'Read \\(HG\\) and \\(GO\\) and compute their quotient.'),
            ['triangle', 'centres', 'line']),
        eulerStep('drag',
            words('Premik oglišča: razmerje ostane 2', 'Dragging a vertex: the ratio stays 2'),
            words('Izrek (H. S. M. Coxeter, Introduction to Geometry): v vsakem trikotniku, ki ni enakostraničen, ležijo \\(O\\), \\(G\\) in \\(H\\) na eni premici, Eulerjevi premici, in velja \\(HG=2\\,GO\\). Povleci oglišče: premica se premakne, odčitka \\(HG\\) in \\(GO\\) se spreminjata, njun količnik pa je pri vsakem trikotniku natanko \\(2\\). Vlečenje izreka le ponazarja; veljavnost zagotavlja dokaz, ne slika. Če je trikotnik enakostraničen, je \\(H=O\\) in premica ni določena.',
                'Theorem (H. S. M. Coxeter, Introduction to Geometry): in every triangle that is not equilateral, \\(O\\), \\(G\\) and \\(H\\) lie on one line, the Euler line, and \\(HG=2\\,GO\\). Drag a vertex: the line moves and the readouts \\(HG\\) and \\(GO\\) change, but their quotient is exactly \\(2\\) for every triangle. Dragging only illustrates the theorem; it holds because of its proof, not the picture. If the triangle is equilateral then \\(H=O\\) and the line is not defined.'),
            words('Povleci \\(C\\) (P3) na nekaj mest in vsakič preveri odčitka \\(HG\\) in \\(GO\\).', 'Drag \\(C\\) (P3) to several positions and check the readouts \\(HG\\) and \\(GO\\) each time.'),
            ['triangle', 'centres', 'line']),
        eulerStep('nine-points',
            words('Devet točk in krožnica', 'The nine points and the circle'),
            words('Devet točk je: razpolovišča treh stranic, vznožja treh višin in razpolovišča daljic \\(AH\\), \\(BH\\), \\(CH\\). Izrek (Coxeter): ležijo na eni krožnici, krožnici devetih točk, s središčem \\(N=(O+H)/2\\) in polmerom \\(R/2\\). Tu je \\(N=(11/4,\\,7/4)\\) in \\(R^2/4=29/8\\), torej \\(R/2\\approx1{,}90394\\). Vznožje višine iz \\(C\\) je \\((2,0)\\), razpolovišče daljice \\(CH\\) je \\((2,\\,7/2)\\) in za obe velja \\(|X-N|^2=29/8\\), natančno. Pri tem trikotniku je devet točk različnih; pri posebnih trikotnikih je različnih točk manj.',
                'The nine points are the midpoints of the three sides, the feet of the three altitudes and the midpoints of the segments \\(AH\\), \\(BH\\), \\(CH\\). Theorem (Coxeter): they lie on one circle, the nine-point circle, with centre \\(N=(O+H)/2\\) and radius \\(R/2\\). Here \\(N=(11/4,\\,7/4)\\) and \\(R^2/4=29/8\\), so \\(R/2\\approx1.90394\\). The foot of the altitude from \\(C\\) is \\((2,0)\\) and the midpoint of the segment \\(CH\\) is \\((2,\\,7/2)\\), and both satisfy \\(|X-N|^2=29/8\\), exactly. For this triangle the nine points are all different; for special triangles there are fewer distinct ones.'),
            words('Preštej, koliko od devetih točk je različnih, in preveri, da je središče \\(N\\) na polovici daljice \\(OH\\).', 'Count how many of the nine points are distinct, and check that the centre \\(N\\) is halfway along \\(OH\\).'),
            ['triangle', 'centres', 'line', 'circle', 'ninepoints']),
        eulerStep('special',
            words('Posebni trikotnik: točke sovpadejo', 'A special triangle: points coincide'),
            words('Za pravokotni trikotnik \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(0,3)\\) je \\(H=(0,0)\\) kar oglišče \\(A\\). Zato se vznožji višin iz \\(B\\) in \\(C\\) ter razpolovišče daljice \\(AH\\) sovpadejo v \\(A\\), razpolovišči daljic \\(BH\\) in \\(CH\\) pa sovpadata z razpoloviščema stranic \\(AB\\) in \\(CA\\). Različnih točk je le \\(5\\) od \\(9\\); krožnica devetih točk ima središče \\(N=(1,\\,3/4)\\) in \\(R^2/4=25/16\\). Enakokraki trikotnik \\((0,0)\\), \\((6,0)\\), \\((3,5)\\) ima \\(8\\) različnih točk. Število različnih točk graf določi natančno.',
                'For the right triangle \\(A=(0,0)\\), \\(B=(4,0)\\), \\(C=(0,3)\\) the orthocentre \\(H=(0,0)\\) is the vertex \\(A\\) itself. So the feet of the altitudes from \\(B\\) and \\(C\\) and the midpoint of the segment \\(AH\\) all coincide at \\(A\\), and the midpoints of \\(BH\\) and \\(CH\\) coincide with the midpoints of the sides \\(AB\\) and \\(CA\\). Only \\(5\\) of the \\(9\\) points are different; the nine-point circle has centre \\(N=(1,\\,3/4)\\) and \\(R^2/4=25/16\\). The isosceles triangle \\((0,0)\\), \\((6,0)\\), \\((3,5)\\) has \\(8\\) distinct points. The graph decides the number of distinct points exactly.'),
            words('Povleci \\(C\\) (P3) za en korak stran od osi \\(y\\) in preberi, koliko različnih točk je zdaj.', 'Drag \\(C\\) (P3) one step away from the \\(y\\)-axis and read how many distinct points there are now.'),
            ['triangle', 'centres', 'line', 'circle', 'ninepoints'], {points: RIGHT_TRIANGLE}),
        eulerStep('near-equilateral',
            words('Skoraj enakostranični trikotnik', 'A near-equilateral triangle'),
            words('Za \\(A=(0,0)\\), \\(B=(8,0)\\), \\(C=(4,7)\\) je \\(H=(4,\\,16/7)\\) in \\(O=(4,\\,33/14)\\). Razdalja \\(|HO|=1/14\\approx0{,}0714\\) je zelo majhna v primerjavi s polmerom \\(R=65/14\\approx4{,}64286\\). Smer Eulerjeve premice je natančna, tukaj navpična, vendar je vizualno nestabilna: pri enakostraničnem trikotniku bi bila \\(H=O\\) in premice ne bi bilo. Točki \\(O\\) in \\(H\\) se na platnu skoraj prekrivata; njuni koordinati sta v odčitkih. Pogled je prilagojen, da je viden tudi vrh \\(C\\).',
                'For \\(A=(0,0)\\), \\(B=(8,0)\\), \\(C=(4,7)\\) we get \\(H=(4,\\,16/7)\\) and \\(O=(4,\\,33/14)\\). The distance \\(|HO|=1/14\\approx0.0714\\) is tiny compared with the radius \\(R=65/14\\approx4.64286\\). The direction of the Euler line is exact, here vertical, but visually unstable: for an equilateral triangle \\(H=O\\) and there would be no line. On the board \\(O\\) and \\(H\\) almost overlap; their coordinates are in the readouts. The view is adjusted so that the apex \\(C\\) is visible too.'),
            words('Povleci \\(C\\) za en korak levo ali desno: kaj se zgodi s smerjo premice?', 'Drag \\(C\\) one step left or right: what happens to the direction of the line?'),
            ['triangle', 'centres', 'line', 'circle'], {points: NEAR_EQUILATERAL_TRIANGLE, view: NEAR_EQUILATERAL_VIEW}),
        eulerStep('explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Pokazano je vse, tudi očrtana krožnica. Povleci oglišča ali vpiši koordinate. Tri točke na isti premici ne tvorijo trikotnika, zato Eulerjeve premice ni. Vsak položaj je primer izreka, ne njegov dokaz.',
                'Everything is shown, including the circumcircle. Drag the vertices or type coordinates. Three points on one line do not form a triangle, so there is no Euler line. Each position is an instance of the theorem, not a proof of it.'),
            words('Poišči trikotnik, pri katerem je število različnih točk \\(5\\), in trikotnik z \\(8\\) različnimi točkami.', 'Find a triangle with \\(5\\) distinct points and a triangle with \\(8\\) distinct points.'),
            ['triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle']),
    ],
};

// Spec T4 (Simson line). Source by author and title only: H. S. M. Coxeter, Introduction to Geometry. The drags are illustrations of the
// "if" of the theorem and of how the foot triangle opens off the circle; neither the picture nor the readout decides the "only if"; the theorem does.
// Owner decision 2026-11-02: in glider mode at offset 0 the status is plain "collinear" and the area readout is 0.
const SIMSON_OVERLAYS = ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'] as const;
/** The glider angles of the scenes, in degrees: P below AB, where all three feet and P itself lie in the default view. */
export const SIMSON_T_BELOW = 250;
export const SIMSON_T_LEFT = 150;
export const SIMSON_T_RIGHT = 320;

function simsonStep(id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, shown: readonly (typeof SIMSON_OVERLAYS)[number][],
                    setup: readonly LessonAction[]): LessonStep {
    return {
        id, title, body, prompt,
        scene: {actions: [defaultScene(`simson-line-${id}`), ...overlays(shown, SIMSON_OVERLAYS), ...setup]},
    };
}

const simsonOffset = (epsilon: SimsonOffset): LessonAction => ({kind: 'simson', operation: 'set-offset', epsilon});
const simsonExampleAction = (exampleId: SimsonExampleId): LessonAction => ({kind: 'simson', operation: 'load-example', exampleId});

export const simsonLineLesson: LessonDefinition = {
    id: 'simson-line',
    demonstrationId: 'simson-line',
    title: words('Simsonova premica', 'The Simson line'),
    summary: words(
        'Nožišča pravokotnic iz točke \\(P\\) na nosilke stranic trikotnika ležijo na eni premici natanko tedaj, ko \\(P\\) leži na očrtani krožnici; ta premica je Simsonova premica. Vlečenje točke po krožnici ponazarja »če«, odmik od krožnice pa pokaže, kako nožiščni trikotnik hitro dobi ploščino; »samo če« ne odločita ne slika ne odčitek, temveč izrek.',
        'The feet of the perpendiculars from a point \\(P\\) to the lines carrying the sides of a triangle lie on one line exactly when \\(P\\) lies on the circumcircle; this line is the Simson line. Dragging the point along the circle illustrates the "if", and an offset from the circle shows how the foot triangle gets an area; neither the picture nor the readout decides the "only if"; the theorem does.',
    ),
    steps: [
        simsonStep('circle',
            words('Trikotnik, krožnica in točka P', 'The triangle, the circle and the point P'),
            words('Trikotnik \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2), \\(C=(2,5)\\) (P3) iz prve naloge ima ploščino \\(S=35/2\\), očrtana krožnica pa središče \\(O=(7/2,\\,3/2)\\) in \\(R^2=29/2\\). Točka \\(P\\) drsi po tej krožnici s parametrom \\(t\\) v stopinjah; zdaj je pri \\(t=250^\\circ\\) pod stranico \\(AB\\), odmik od krožnice pa je \\(\\varepsilon=0\\). Iz \\(P\\) spustimo pravokotnice na nosilke stranic; njihova nožišča \\(D\\), \\(E\\), \\(F\\) so označena na nosilkah stranic \\(BC\\), \\(CA\\), \\(AB\\). Premice skozi nožišča še ni.',
                'The triangle \\(A=(0,0)\\) (P1), \\(B=(7,0)\\) (P2), \\(C=(2,5)\\) (P3) from the first lesson has area \\(S=35/2\\), and its circumcircle has centre \\(O=(7/2,\\,3/2)\\) and \\(R^2=29/2\\). The point \\(P\\) glides along this circle by the parameter \\(t\\) in degrees; it is now at \\(t=250^\\circ\\), below the side \\(AB\\), and the offset from the circle is \\(\\varepsilon=0\\). From \\(P\\) we drop perpendiculars to the lines carrying the sides; their feet \\(D\\), \\(E\\), \\(F\\) are marked on the sidelines \\(BC\\), \\(CA\\), \\(AB\\). The line through the feet is not drawn yet.'),
            words('Napovej, ali nožišča \\(D\\), \\(E\\) in \\(F\\) ležijo na isti premici, in ugotovi, kje bi morala ležati.', 'Predict whether the feet \\(D\\), \\(E\\) and \\(F\\) lie on one line, and where such a line would have to run.'),
            ['triangle', 'sidelines', 'circumcircle'], [glider(SIMSON_T_BELOW)]),
        simsonStep('feet',
            words('Nožišča in premica skoznje', 'The feet and the line through them'),
            words('Pravokotnice iz \\(P\\) so narisane. Pri \\(t=250^\\circ\\) je \\(F\\approx(2{,}20,\\,0)\\) na stranici \\(AB\\), \\(D\\approx(5{,}64,\\,1{,}36)\\) na nosilki \\(BC\\) in \\(E\\approx(-0{,}41,\\,-1{,}03)\\) na podaljšku nosilke \\(CA\\). Nožišča ležijo na eni premici, Simsonovi premici. Za \\(P\\) na očrtani krožnici stanje pove »kolinearna«, odčitek ploščine nožiščnega trikotnika pa je \\(0\\); preostanek v računu je le zaokrožitvena napaka decimalnih števil.',
                'The perpendiculars from \\(P\\) are drawn. At \\(t=250^\\circ\\) we get \\(F\\approx(2.20,\\,0)\\) on the side \\(AB\\), \\(D\\approx(5.64,\\,1.36)\\) on the line \\(BC\\) and \\(E\\approx(-0.41,\\,-1.03)\\) on the extension of the line \\(CA\\). The feet lie on one line, the Simson line. For \\(P\\) on the circumcircle the status reads "collinear" and the readout of the foot triangle\'s area is \\(0\\); what remains in the computation is only the rounding error of floating-point numbers.'),
            words('Preveri, da je nožišče \\(E\\) zunaj stranice \\(CA\\), pa je vseeno na isti premici kot \\(D\\) in \\(F\\).', 'Check that the foot \\(E\\) is outside the side \\(CA\\) and is still on the same line as \\(D\\) and \\(F\\).'),
            ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson'], [glider(SIMSON_T_BELOW)]),
        simsonStep('drag',
            words('Premik točke P po krožnici', 'Moving P around the circle'),
            words('Izrek (H. S. M. Coxeter, Introduction to Geometry): nožišča pravokotnic iz točke \\(P\\) na nosilke stranic trikotnika ležijo na eni premici natanko tedaj, ko \\(P\\) leži na očrtani krožnici. Pri \\(t=150^\\circ\\) je \\(P\\approx(0{,}20,\\,3{,}40)\\), pri \\(t=320^\\circ\\) pa \\(P\\approx(6{,}42,\\,-0{,}95)\\). Povsod ostanejo nožišča na eni premici, ki se pri tem premika. Vlečenje izreka le ponazarja, saj pokaže nekaj leg; veljavnost zagotavlja dokaz, ki ga tukaj ne izvajamo in ki temelji na tetivnih štirikotnikih iz naloge o obodnem kotu.',
                'Theorem (H. S. M. Coxeter, Introduction to Geometry): the feet of the perpendiculars from a point \\(P\\) to the lines carrying the sides of a triangle lie on one line exactly when \\(P\\) lies on the circumcircle. At \\(t=150^\\circ\\) we get \\(P\\approx(0.20,\\,3.40)\\) and at \\(t=320^\\circ\\) we get \\(P\\approx(6.42,\\,-0.95)\\). In every position the feet stay on one line, which moves as \\(P\\) moves. Dragging only illustrates the theorem, since it shows a few positions; it holds because of its proof, which we do not carry out here and which rests on cyclic quadrilaterals from the inscribed angle lesson.'),
            words('Povleci \\(P\\) po vsej krožnici in opazuj premico. Kaj se zgodi, ko je \\(P\\) blizu oglišča?', 'Drag \\(P\\) all the way around the circle and watch the line. What happens when \\(P\\) is near a vertex?'),
            ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson'], [glider(SIMSON_T_LEFT)]),
        simsonStep('offset',
            words('Odmik od krožnice: nožiščni trikotnik se odpre', 'Off the circle: the foot triangle opens'),
            words('Drsnik odmika premakne \\(P\\) z očrtane krožnice: polmer se poveča na \\((1+\\varepsilon)R\\). Pri \\(\\varepsilon=0{,}2\\) nožišča ne ležijo več na eni premici, ampak tvorijo nožiščni trikotnik, ki je jasno viden; njegova ploščina je \\(0{,}11\\,S\\), odčitek pa pove »ni kolinearna«. Tudi odmik \\(\\varepsilon=-0{,}2\\), proti notranjosti krožnice, odpre trikotnik. Pri \\(\\varepsilon=0{,}001\\) pa je odprtina na platnu skoraj nevidna; to preveri v naslednjem koraku.',
                'The offset slider moves \\(P\\) off the circumcircle: the radius becomes \\((1+\\varepsilon)R\\). At \\(\\varepsilon=0.2\\) the feet no longer lie on one line but form a foot triangle that is clearly visible; its area is \\(0.11\\,S\\), and the readout says "not collinear". The offset \\(\\varepsilon=-0.2\\), towards the inside of the circle, opens the triangle too. At \\(\\varepsilon=0.001\\), however, the opening is almost invisible on the board; check that in the next step.'),
            words('Preberi odčitek ploščine pri \\(\\varepsilon=0{,}2\\) in pri \\(\\varepsilon=-0{,}2\\). Ali je trikotnik v obeh primerih enako velik?', 'Read the area readout at \\(\\varepsilon=0.2\\) and at \\(\\varepsilon=-0.2\\). Is the triangle equally large in both cases?'),
            ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'pedal'], [glider(SIMSON_T_BELOW), simsonOffset(0.2)]),
        simsonStep('readout',
            words('Odčitek in stanje odločita, ne slika', 'The readout and the status decide, not the picture'),
            words('Pri \\(\\varepsilon=0{,}001\\) so nožišča na platnu videti kolinearna, a odčitek ploščine pove \\(0{,}0005\\,S\\) in stanje pove »ni kolinearna«. Ploščino graf izračuna iz koordinat nožišč, ne iz slike, zato to odločitev lahko sprejme tudi tam, kjer oko ne loči več. Vlečenje torej pokaže le »če«: točka na krožnici da nožišča na premici. »Samo če« ne moremo prebrati s slike; izrek ga zagotavlja, odčitek pa pokaže, kako hitro se nožiščni trikotnik odpre, ko točka zapusti krožnico.',
                'At \\(\\varepsilon=0.001\\) the feet look collinear on the board, yet the area readout says \\(0.0005\\,S\\) and the status says "not collinear". The graph computes the area from the coordinates of the feet, not from the picture, so it can decide where the eye can no longer tell. The drag therefore shows only the "if": a point on the circle gives feet on a line. The "only if" cannot be read from the picture; the theorem guarantees it, and the readout shows how quickly the foot triangle opens when the point leaves the circle.'),
            words('Nastavi odmik \\(0\\) in nato \\(0{,}001\\). Ali opaziš razliko na platnu? Kaj pokažeta stanje in odčitek?', 'Set the offset to \\(0\\) and then to \\(0.001\\). Do you see a difference on the board? What do the status and the readout show?'),
            ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'], [glider(SIMSON_T_BELOW), simsonOffset(0.001)]),
        simsonStep('vertex',
            words('Točka v oglišču', 'The point at a vertex'),
            words('Primer »oglišče« je v natančnem načinu: točka \\(P^{\\prime}\\) je mrežna točka, tu \\(P^{\\prime}=B=(7,0)\\). Nožišči pravokotnic iz \\(B\\) na nosilki \\(BC\\) in \\(AB\\) sta v \\(B\\), zato \\(D=F=B\\); tretje nožišče je \\(E=(28/29,\\,70/29)\\) na \\(CA\\). Dve nožišči sovpadata, zato ostaneta dve različni nožišči in premica skoznje je višina iz \\(B\\). Stanje pove, da dve nožišči sovpadata in da premica poteka skozi različni nožišči; natančna orientacija nožiščnih točk je \\(0\\).',
                'The example "vertex" is in exact mode: the point \\(P^{\\prime}\\) is a grid point, here \\(P^{\\prime}=B=(7,0)\\). The feet of the perpendiculars from \\(B\\) to the lines \\(BC\\) and \\(AB\\) are at \\(B\\), so \\(D=F=B\\); the third foot is \\(E=(28/29,\\,70/29)\\) on \\(CA\\). Two feet coincide, so two distinct feet remain, and the line through them is the altitude from \\(B\\). The status says that two feet coincide and that the line passes through the two distinct feet; the exact orientation of the feet is \\(0\\).'),
            words('Preveri, da je premica skozi \\(B\\) in \\(E\\) pravokotna na \\(CA\\).', 'Check that the line through \\(B\\) and \\(E\\) is perpendicular to \\(CA\\).'),
            ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson'], [simsonExampleAction('vertex')]),
        simsonStep('explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Pokazano je vse. Povleci \\(P\\) po krožnici, premakni oglišča ali preklopi v natančni način. Primer »mrežna točka na krožnici« postavi \\(P^{\\prime}=(2,-2)\\) z nožišči \\((11/2,\\,3/2)\\), \\((-12/29,\\,-30/29)\\) in \\((2,0)\\); njihova orientacija je natanko \\(0\\), ker račun poteka z ulomki. Vsak položaj je primer izreka, ne njegov dokaz.',
                'Everything is shown. Drag \\(P\\) along the circle, move the vertices or switch to exact mode. The example "grid point on the circle" sets \\(P^{\\prime}=(2,-2)\\) with feet \\((11/2,\\,3/2)\\), \\((-12/29,\\,-30/29)\\) and \\((2,0)\\); their orientation is exactly \\(0\\) because the computation uses fractions. Each position is an instance of the theorem, not a proof of it.'),
            words('Poišči mrežno točko \\(P^{\\prime}\\) izven krožnice in preberi ploščino nožiščnega trikotnika.', 'Find a grid point \\(P^{\\prime}\\) off the circle and read the area of its foot triangle.'),
            ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'], [glider(SIMSON_T_BELOW)]),
    ],
};

// Spec T5 (power of a point and inversion). Sources by author and title only: FMF, Inverzija (lecture notes) for the theorems; H. S. M. Coxeter,
// Introduction to Geometry, only as "see also". The drags and the readouts are instances, not proofs. Inversion keeps the size of angles and reverses
// their orientation, so the prose never calls it "conformal" without that qualification. Complex maps lesson 1 is an optional prerequisite link.
const INVERSION_OVERLAYS = ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'] as const;
/** The secant direction of the second power scene, in degrees. */
export const INVERSION_THETA_TURNED = 20;

function inversionStep(id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, shown: readonly (typeof INVERSION_OVERLAYS)[number][],
                       setup: readonly LessonAction[]): LessonStep {
    return {
        id, title, body, prompt,
        scene: {actions: [defaultScene(`inversion-${id}`), ...setup, ...overlays(shown, INVERSION_OVERLAYS)]},
    };
}

const inversionExampleAction = (exampleId: InversionExampleId): LessonAction => ({kind: 'inversion', operation: 'load-example', exampleId});
const inversionTheta = (degrees: number): LessonAction => ({kind: 'inversion', operation: 'set-theta', degrees});
const inversionX = (x: number, y: number): LessonAction => ({kind: 'inversion', operation: 'set-x', point: {x, y}});

export const inversionLesson: LessonDefinition = {
    id: 'inversion',
    demonstrationId: 'inversion',
    title: words('Potenca točke in inverzija', 'Power of a point and inversion'),
    summary: words(
        'Potenca točke na krožnico je enaka zmnožku \\(PA\\cdot PB\\) za vsako sekanto skozi točko. Inverzija v krožnici pošlje krožnice skozi središče v premice, druge krožnice v krožnice, velikost kotov ohrani, njihovo usmerjenost pa obrne. Premiki na grafu so primeri teh izrekov, ne dokazi.',
        'The power of a point with respect to a circle equals the product \\(PA\\cdot PB\\) along every secant through the point. Inversion in a circle sends circles through the centre to lines and other circles to circles; it keeps the size of angles and reverses their orientation. The moves on the graph are instances of these theorems, not proofs.',
    ),
    steps: [
        inversionStep('power',
            words('Točka, krožnica in sekanta', 'A point, a circle and a secant'),
            words('Točka \\(P=(0,0)\\) je tudi središče inverzije \\(C\\). Krožnica ima središče \\(O=(5,0)\\) in polmer \\(\\rho=3\\). Sekanta skozi \\(P\\) jo seka v točkah \\(A\\) in \\(B\\); njena smer \\(\\theta\\) je zdaj \\(0^\\circ\\). Potenca točke \\(P\\) na krožnico je \\(|PO|^2-\\rho^2\\). Ko vrtiš sekanto, se točki \\(A\\) in \\(B\\) premikata po krožnici.',
                'The point \\(P=(0,0)\\) is also the centre of inversion \\(C\\). The circle has centre \\(O=(5,0)\\) and radius \\(\\rho=3\\). A secant through \\(P\\) meets it at the points \\(A\\) and \\(B\\); its direction \\(\\theta\\) is now \\(0^\\circ\\). The power of the point \\(P\\) with respect to the circle is \\(|PO|^2-\\rho^2\\). As you turn the secant, the points \\(A\\) and \\(B\\) move along the circle.'),
            words('Napovej, kaj se zgodi z zmnožkom \\(PA\\cdot PB\\), ko sekanto zavrtiš.', 'Predict what happens to the product \\(PA\\cdot PB\\) as you turn the secant.'),
            ['secant'], [inversionExampleAction('power')]),
        inversionStep('product',
            words('Zmnožek ostane 16', 'The product stays 16'),
            words('Pri \\(\\theta=0^\\circ\\) sekanta seka krožnico v \\(A=(2,0)\\) in \\(B=(8,0)\\), zato je \\(PA\\cdot PB=2\\cdot8=16\\). Pri \\(\\theta=20^\\circ\\) je \\(PA\\approx2{,}23\\) in \\(PB\\approx7{,}16\\), zmnožek pa je spet \\(16\\); odčitek je decimalno število, potenca \\(25-9=16\\) pa je natančna. Tangentni odsek iz \\(P\\) ima dolžino \\(4\\) in \\(4^2=16\\). Izrek (potenca točke): za vsako sekanto skozi \\(P\\) je \\(PA\\cdot PB\\) enak potenci točke, za tangento pa je potenca kvadrat tangentnega odseka. Vir: FMF, Inverzija (zapiski predavanj); glej tudi H. S. M. Coxeter, Introduction to Geometry. Vrtenje sekante izrek le ponazarja.',
                'At \\(\\theta=0^\\circ\\) the secant meets the circle at \\(A=(2,0)\\) and \\(B=(8,0)\\), so \\(PA\\cdot PB=2\\cdot8=16\\). At \\(\\theta=20^\\circ\\) we get \\(PA\\approx2.23\\) and \\(PB\\approx7.16\\), and the product is \\(16\\) again; the readout is a decimal number, while the power \\(25-9=16\\) is exact. The tangent length from \\(P\\) is \\(4\\) and \\(4^2=16\\). Theorem (power of a point): along every secant through \\(P\\) the product \\(PA\\cdot PB\\) equals the power of the point, and for a tangent the power is the square of the tangent length. Source: FMF, Inverzija (lecture notes); see also H. S. M. Coxeter, Introduction to Geometry. Turning the secant only illustrates the theorem.'),
            words('Vrti sekanto in primerjaj zmnožek s kvadratom tangentnega odseka.', 'Turn the secant and compare the product with the square of the tangent length.'),
            ['secant', 'tangent'], [inversionExampleAction('power'), inversionTheta(INVERSION_THETA_TURNED)]),
        inversionStep('image',
            words('Točka in njena slika', 'A point and its image'),
            words('Krožnica inverzije ima središče \\(C=(0,0)\\) in polmer \\(r=2\\); točka \\(X=(3,1)\\) je zunaj nje. Slika \\(X^{\\prime}\\) leži na poltraku \\(CX\\) in velja \\(|CX|\\cdot|CX^{\\prime}|=r^2=4\\). Ker je \\(|CX|=\\sqrt{10}\\), je \\(|CX^{\\prime}|=4/\\sqrt{10}\\) in natančno \\(X^{\\prime}=(6/5,\\,2/5)\\), torej znotraj krožnice. Sliko \\(X^{\\prime}\\) prikažeš s stikalom »Slika«.',
                'The circle of inversion has centre \\(C=(0,0)\\) and radius \\(r=2\\); the point \\(X=(3,1)\\) is outside it. The image \\(X^{\\prime}\\) lies on the ray \\(CX\\) and \\(|CX|\\cdot|CX^{\\prime}|=r^2=4\\). Since \\(|CX|=\\sqrt{10}\\), we get \\(|CX^{\\prime}|=4/\\sqrt{10}\\) and exactly \\(X^{\\prime}=(6/5,\\,2/5)\\), so inside the circle. You show the image \\(X^{\\prime}\\) with the switch "Image".'),
            words('Napovej, kje na poltraku \\(CX\\) leži \\(X^{\\prime}\\), nato prikaži sliko in preveri.', 'Predict where on the ray \\(CX\\) the image \\(X^{\\prime}\\) lies, then show the image and check.'),
            ['inversion-circle', 'rays'], [inversionExampleAction('point')]),
        inversionStep('line',
            words('Krožnica skozi središče postane premica', 'A circle through the centre becomes a line'),
            words('Krožnica s središčem \\((1,0)\\) in polmerom \\(1\\) poteka skozi središče inverzije \\(C=(0,0)\\). Njena slika pri polmeru \\(r=2\\) je premica \\(x=2\\): \\((1,1)\\mapsto(2,2)\\), \\((1,-1)\\mapsto(2,-2)\\) in \\((2,0)\\mapsto(2,0)\\). Izrek: inverzija pošlje posplošeno krožnico skozi središče v premico, ki ne gre skozi središče. Vir: FMF, Inverzija (zapiski predavanj). Slika je primer izreka, ne dokaz.',
                'The circle with centre \\((1,0)\\) and radius \\(1\\) passes through the centre of inversion \\(C=(0,0)\\). Its image at radius \\(r=2\\) is the line \\(x=2\\): \\((1,1)\\mapsto(2,2)\\), \\((1,-1)\\mapsto(2,-2)\\) and \\((2,0)\\mapsto(2,0)\\). Theorem: inversion sends a generalized circle through the centre to a line that does not pass through the centre. Source: FMF, Inverzija (lecture notes). The picture is an instance of the theorem, not a proof.'),
            words('Preveri, da so vse tri slike res na premici \\(x=2\\).', 'Check that all three images do lie on the line \\(x=2\\).'),
            ['inversion-circle', 'image'], [inversionExampleAction('through-centre')]),
        inversionStep('circle',
            words('Krožnica mimo središča ostane krožnica', 'A circle not through the centre stays a circle'),
            words('Krožnica s središčem \\((3,0)\\) in polmerom \\(1\\) ne poteka skozi \\(C\\). Točke \\((2,0)\\), \\((4,0)\\), \\((3,1)\\) se preslikajo v \\((2,0)\\), \\((1,0)\\), \\((6/5,\\,2/5)\\), vse na razdalji \\(1/2\\) od točke \\((3/2,0)\\): slika je krožnica s središčem \\((3/2,0)\\) in polmerom \\(1/2\\). Izrek: inverzija pošlje posplošeno krožnico mimo središča v krožnico. Primera »pravokotna krožnica« (\\(r=4\\), krožnica sama sebi) in »premica skozi središče« (premica sama sebi) sta v izbirniku primerov. Vir: FMF, Inverzija (zapiski predavanj).',
                'The circle with centre \\((3,0)\\) and radius \\(1\\) does not pass through \\(C\\). The points \\((2,0)\\), \\((4,0)\\), \\((3,1)\\) map to \\((2,0)\\), \\((1,0)\\), \\((6/5,\\,2/5)\\), all at distance \\(1/2\\) from \\((3/2,0)\\): the image is the circle with centre \\((3/2,0)\\) and radius \\(1/2\\). Theorem: inversion sends a generalized circle not through the centre to a circle. The examples "orthogonal circle" (\\(r=4\\), the circle maps to itself) and "line through the centre" (the line maps to itself) are in the example selector. Source: FMF, Inverzija (lecture notes).'),
            words('Napovej, ali je slika znotraj ali zunaj prvotne krožnice, nato preveri.', 'Predict whether the image lies inside or outside the original circle, then check.'),
            ['inversion-circle', 'image'], [inversionExampleAction('not-through-centre')]),
        inversionStep('angle',
            words('Kot med krožnicama pred inverzijo in po njej', 'The angle between two circles before and after'),
            words('Krožnici s središčema \\((3,0)\\) in \\((3,1)\\) in polmerom \\(1\\) se sekata pod kotom \\(60^\\circ\\) v točki \\(Q\\approx(2{,}134;\\,0{,}5)\\). Njuni sliki pri \\(r=2\\) se sekata v \\(Q^{\\prime}\\approx(1{,}777;\\,0{,}416)\\) pod kotom enake velikosti \\(60^\\circ\\), a z nasprotnim predznakom: iz \\(+60^\\circ\\) postane \\(-60^\\circ\\). Izrek: inverzija ohrani velikost kotov, a obrne njihovo usmerjenost; zato je ne imenujemo konformna brez tega pridržka. Vir: FMF, Inverzija (zapiski predavanj). Odčitek kota je primer, ne dokaz.',
                'The circles with centres \\((3,0)\\) and \\((3,1)\\) and radius \\(1\\) meet at an angle of \\(60^\\circ\\) at the point \\(Q\\approx(2.134,\\,0.5)\\). Their images at \\(r=2\\) meet at \\(Q^{\\prime}\\approx(1.777,\\,0.416)\\) at an angle of the same size \\(60^\\circ\\) but with the opposite sign: \\(+60^\\circ\\) becomes \\(-60^\\circ\\). Theorem: inversion preserves the size of angles but reverses their orientation; so we do not call it conformal without that qualification. Source: FMF, Inverzija (lecture notes). The angle readout is an instance, not a proof.'),
            words('Primerjaj kota pred inverzijo in po njej. Kaj ostane enako in kaj se spremeni?', 'Compare the angles before and after inversion. What stays the same and what changes?'),
            ['inversion-circle', 'rays', 'image', 'angle-tangents'], [inversionExampleAction('angle')]),
        inversionStep('explore',
            words('Prosto raziskovanje in središče', 'Free exploration and the centre'),
            words('Prikazano je vse. Premakni točko \\(X\\), središče \\(C\\) ali polmer \\(r\\), preklopi fokus in izberi druge primere. Točka \\(X=C\\) nima slike: plošča to pove, ne da bi narisala točko. Točke blizu \\(C\\) imajo slike zelo daleč; tiste nad mejo risanja so označene z »predaleč za risanje«. Vsak položaj je primer izrekov, ne njihov dokaz.',
                'Everything is shown. Move the point \\(X\\), the centre \\(C\\) or the radius \\(r\\), switch the focus and choose other examples. The point \\(X=C\\) has no image: the panel says so without drawing a point. Points near \\(C\\) have images very far away; those beyond the drawing limit are marked "too far to draw". Each position is an instance of the theorems, not a proof.'),
            words('Točka \\(X\\) je zdaj v središču \\(C\\) in nima slike. Odmakni jo od \\(C\\), nato jo spet približaj in opazuj, kam gre slika \\(X^{\\prime}\\).', 'The point \\(X\\) now sits at the centre \\(C\\) and has no image. Move it away from \\(C\\), then bring it close again and watch where the image \\(X^{\\prime}\\) goes.'),
            ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'], [inversionExampleAction('point'), inversionX(0, 0)]),
    ],
};
