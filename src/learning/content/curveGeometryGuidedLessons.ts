/**
 * Guided lessons of the Curve geometry family (docs/specs/curve-geometry-lessons.md): L1, parametric and polar curves, and L2,
 * curvature and the osculating circle. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"):
 * every value it quotes is the readout of the scene it belongs to, and `curveGeometryGuidedLessons.test.ts` checks that against
 * the real graphs. Scenes use the `parametric-curve`, `parameter` (`t`), `curve-visibility` (`curvature-frame`,
 * `curvature-circle`) and `parametric-roll` animation actions.
 */
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

// ---- L1: parametric and polar curves --------------------------------------------------------------------------------------

const PI = Math.PI;
type CatalogueCurve = 'cycloid' | 'cardioid' | 'rose' | 'spiral';
/** A scene of the parametric graph: the catalogue curve (and the cycloid radius), then the parameter shown. */
const parametricScene = (id: string, curve: CatalogueCurve, parameter: number, sl: string, en: string, radius?: number, hideTrace = false): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    actions: [
        {kind: 'parametric-curve', curve, ...(radius === undefined ? {} : {radius})},
        {kind: 'parameter', name: 't', value: parameter},
        ...(hideTrace ? [{kind: 'curve-visibility', target: 'parametric-trace-full', visible: false} as const] : []),
    ],
    expectedState: text(sl, en),
});

const parametricLesson: GuidedLesson = {
    demonstrationId: 'curve-parametric',
    title: text('Parametrične in polarne krivulje', 'Parametric and polar curves'),
    summary: text(
        'Krivulja je sled točke skupaj s pravilom gibanja: cikloida je sled točke na kotalečem se krogu, polarna krivulja \\(\\rho=f(\\theta)\\) pa je sled konca poltraka z dolžino \\(\\rho\\) pri kotu \\(\\theta\\). Hitrost, dolžina loka in ploščina so odvisni od sledi in od hitrosti skupaj.',
        'A curve is a trace together with a rule of motion: the cycloid is the trace of a point on a rolling circle, and a polar curve \\(\\rho=f(\\theta)\\) is the trace of the end of a ray of length \\(\\rho\\) at the angle \\(\\theta\\). Velocity, arc length and area depend on the trace and the speed together.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje poglavja o parametrizaciji: sled krivulje in parameter nista isto.', 'Assumes the parametrization chapter: the trace of a curve and its parameter are not the same thing.'),
        text('Priporočeno je poznavanje odvoda iz poglavja Analiza: hitrost je odvod lege po parametru.', 'The derivative from the Analysis chapter helps: velocity is the derivative of the position with respect to the parameter.'),
    ],
    learningGoals: [
        text('Napoveš obliko poti označene točke na kotalečem se krogu in jo primerjaš s cikloido.', 'Predict the path of a marked point on a rolling circle and compare it with the cycloid.'),
        text('Preberi vektor hitrosti \\(r\'(t)\\) in razloži, zakaj je v ostrih konicah cikloide enak \\(0\\).', 'Read the velocity vector \\(r\'(t)\\) and explain why it is \\(0\\) at the cusps of the cycloid.'),
        text('Povežeš dolžino loka \\(8R\\) in ploščino \\(3\\pi R^2\\) cikloide z njenim kotalečim se krogom.', 'Connect the arc length \\(8R\\) and the area \\(3\\pi R^2\\) of the cycloid with its rolling circle.'),
        text('Polarno krivuljo prebereš iz dolžine poltraka \\(\\rho(\\theta)\\).', 'Read a polar curve from the length of its ray \\(\\rho(\\theta)\\).'),
    ],
    formulaBlocks: [
        {
            id: 'cycloid-parametrization',
            latex: 'r(t)=\\bigl(R(t-\\sin t),\\,R(1-\\cos t)\\bigr),\\qquad r\'(t)=\\bigl(R(1-\\cos t),\\,R\\sin t\\bigr)',
            notation: text(
                '\\(R\\) je polmer kotalečega se kroga, \\(t\\) kot vrtenja, \\(r\'(t)\\) vektor hitrosti.',
                '\\(R\\) is the radius of the rolling circle, \\(t\\) the angle of rotation and \\(r\'(t)\\) the velocity vector.',
            ),
            explanation: text(
                'Središče kroga se premika po vodoravni premici s hitrostjo \\(R\\), označena točka pa se hkrati vrti okoli njega. Pri \\(t=0\\) in \\(t=2\\pi\\) je \\(r\'(t)=(0,0)\\): točka miruje in tam ima krivulja ost.',
                'The centre of the circle moves along a horizontal line with speed \\(R\\) while the marked point turns around it. At \\(t=0\\) and \\(t=2\\pi\\) we have \\(r\'(t)=(0,0)\\): the point is at rest and the curve has a cusp.',
            ),
        },
        {
            id: 'cycloid-measures',
            latex: 'L=\\int_0^{2\\pi}|r\'(t)|\\,dt=8R,\\qquad A=\\int_0^{2\\pi}y\\,\\frac{dx}{dt}\\,dt=3\\pi R^2',
            notation: text(
                '\\(L\\) je dolžina enega loka, \\(A\\) ploščina med lokom in osjo \\(x\\).',
                '\\(L\\) is the length of one arch and \\(A\\) the area between the arch and the \\(x\\) axis.',
            ),
            explanation: text(
                'Dolžina loka je integral hitrosti, zato je odvisna od hitrosti, ne le od sledi. Če polmer podvojimo, se dolžina podvoji, ploščina pa učetveri.',
                'The arc length is the integral of the speed, so it depends on the speed and not only on the trace. If the radius is doubled, the length doubles and the area becomes four times as large.',
            ),
        },
        {
            id: 'polar-ray',
            latex: 'r(\\theta)=\\rho(\\theta)\\,(\\cos\\theta,\\,\\sin\\theta)',
            notation: text(
                '\\(\\theta\\) je kot poltraka, \\(\\rho(\\theta)\\) njegova dolžina.',
                '\\(\\theta\\) is the angle of the ray and \\(\\rho(\\theta)\\) its length.',
            ),
            explanation: text(
                'Polarna krivulja je parametrična krivulja s parametrom \\(\\theta\\). Kardioida ima \\(\\rho(\\theta)=1+\\cos\\theta\\), Arhimedova spirala pa \\(\\rho(\\theta)=\\theta\\).',
                'A polar curve is a parametric curve with the parameter \\(\\theta\\). The cardioid has \\(\\rho(\\theta)=1+\\cos\\theta\\) and the spiral of Archimedes has \\(\\rho(\\theta)=\\theta\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'cycloid-arch-example',
            title: text('Lok cikloide pri \\(R=1\\)', 'One arch of the cycloid with \\(R=1\\)'),
            calculationLatex: 'L=8R=8,\\qquad A=3\\pi R^2=3\\pi',
            resultLatex: 'L=8,\\; A\\approx 9{,}4248',
            check: text(
                'Izpis pod grafom pokaže dolžino loka \\(8\\) in ploščino \\(9{,}4248\\), kar je \\(3\\pi\\).',
                'The readout on the graph shows the arc length \\(8\\) and the area \\(9.4248\\), which is \\(3\\pi\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'parametric-roll', order: 1,
            title: text('Kotaleči se krog', 'The rolling circle'),
            purpose: text('Pred razkritjem napovedati pot označene točke.', 'Predicting the path of the marked point before the reveal.'),
            explanation: text(
                'Krog s polmerom \\(1\\) se kotali po osi \\(x\\), na njegovem robu pa je označena točka, ki je zdaj pri \\(t=0\\). Preden pritisneš Predvajaj, napovej: kakšno pot opiše označena točka, ko se krog zavrti enkrat okoli svojega središča?',
                'A circle of radius \\(1\\) rolls along the \\(x\\) axis and a point is marked on its rim; it is now at \\(t=0\\). Before you press Play, predict: what path does the marked point trace while the circle turns once around its centre?',
            ),
            formulaIds: ['cycloid-parametrization'],
            frames: [frame('parametric-roll-explanation', 'explanation'), frame('parametric-roll-observation', 'observation')],
            animation: {animationId: 'parametric-roll'},
            observationPrompt: text('Predvajaj kotaljenje in primerjaj pot z napovedjo.', 'Play the rolling and compare the path with your prediction.'),
            expectedObservations: [text('Označena točka opiše lok cikloide: dvigne se do višine \\(2\\) in se vrne na os \\(x\\) v točki \\((2\\pi,0)\\).', 'The marked point traces an arch of the cycloid: it rises to the height \\(2\\) and returns to the \\(x\\) axis at the point \\((2\\pi,0)\\).')],
            scene: parametricScene('parametric-roll-start', 'cycloid', 0,
                'Kotaleči se krog s polmerom \\(1\\) je pri \\(t=0\\); označena točka je v izhodišču, kjer je hitrost enaka \\(0\\).',
                'The rolling circle of radius \\(1\\) is at \\(t=0\\); the marked point is at the origin, where the velocity is \\(0\\).', 1, true),
        },
        {
            id: 'parametric-velocity', order: 2,
            title: text('Parameter in hitrost', 'Parameter and velocity'),
            purpose: text('Z drsnikom \\(t\\) premikati točko in brati vektor hitrosti.', 'Moving the point with the \\(t\\) slider and reading the velocity vector.'),
            explanation: text(
                'Pri \\(t=\\pi/2\\) je krog zavrten za četrt obrata. Označena točka je v \\((\\pi/2-1,\\,1)\\), vektor hitrosti pa je \\(r\'(t)=(1,1)\\) z velikostjo \\(\\sqrt2\\approx1{,}4142\\). Napovej, kako se bo vektor spremenil na vrhu loka, in potem premakni drsnik.',
                'At \\(t=\\pi/2\\) the circle has turned a quarter of a turn. The marked point is at \\((\\pi/2-1,\\,1)\\) and the velocity vector is \\(r\'(t)=(1,1)\\) with the length \\(\\sqrt2\\approx1.4142\\). Predict how the vector changes at the top of the arch, then move the slider.',
            ),
            formulaIds: ['cycloid-parametrization'],
            frames: [frame('parametric-velocity-explanation', 'explanation'), frame('parametric-velocity-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) k \\(\\pi\\) in preberi vektor hitrosti.', 'Move \\(t\\) to \\(\\pi\\) and read the velocity vector.'),
            expectedObservations: [text('Na vrhu loka je vektor hitrosti \\((2,0)\\): vodoraven in najdaljši, z velikostjo \\(2\\).', 'At the top of the arch the velocity vector is \\((2,0)\\): horizontal and longest, with the length \\(2\\).')],
            scene: parametricScene('parametric-velocity-quarter', 'cycloid', PI / 2,
                'Pri \\(t=\\pi/2\\) je hitrost \\((1,\\,1)\\), velikost \\(1{,}4142\\).',
                'At \\(t=\\pi/2\\) the velocity is \\((1,\\,1)\\), the length \\(1.4142\\).', 1),
        },
        {
            id: 'parametric-measures', order: 3,
            title: text('Dolžina loka in ploščina', 'Arc length and area'),
            purpose: text('Brati dolžino loka in ploščino pod lokom.', 'Reading the arc length and the area under the arch.'),
            explanation: text(
                'Izpis kaže dolžino celotnega loka in ploščino pod njim. Napovej: kolikokrat je lok daljši od premera \\(2\\) kroga in kolikokrat je ploščina večja od ploščine kroga \\(\\pi\\)? Pri \\(R=1\\) je dolžina \\(8\\), ploščina pa \\(3\\pi\\approx9{,}4248\\). Točka je zdaj na vrhu loka, pri \\(t=\\pi\\).',
                'The readout shows the length of the whole arch and the area under it. Predict: how many times is the arch longer than the diameter \\(2\\) of the circle, and how many times larger is the area than the area \\(\\pi\\) of the circle? For \\(R=1\\) the length is \\(8\\) and the area is \\(3\\pi\\approx9.4248\\). The point is now at the top of the arch, at \\(t=\\pi\\).',
            ),
            formulaIds: ['cycloid-measures'], workedExampleId: 'cycloid-arch-example',
            frames: [frame('parametric-measures-explanation', 'explanation'), frame('parametric-measures-calculation', 'calculation'), frame('parametric-measures-observation', 'observation')],
            observationPrompt: text('Nastavi polmer na \\(2\\) in preveri, kako se spremenita dolžina in ploščina.', 'Set the radius to \\(2\\) and check how the length and the area change.'),
            expectedObservations: [text('Pri polmeru \\(2\\) je dolžina \\(16\\) in ploščina \\(12\\pi\\approx37{,}6991\\): dolžina raste z \\(R\\), ploščina z \\(R^2\\).', 'With the radius \\(2\\) the length is \\(16\\) and the area is \\(12\\pi\\approx37.6991\\): the length grows with \\(R\\) and the area with \\(R^2\\).')],
            scene: parametricScene('parametric-measures-top', 'cycloid', PI,
                'Točka je na vrhu loka (\\(t=\\pi\\)); dolžina loka je \\(8\\), ploščina \\(9{,}4248\\).',
                'The point is at the top of the arch (\\(t=\\pi\\)); the arc length is \\(8\\) and the area is \\(9.4248\\).', 1),
        },
        {
            id: 'parametric-polar', order: 4,
            title: text('Polarna krivulja in poltrak', 'A polar curve and its ray'),
            purpose: text('Preiti na polarno krivuljo, pri kateri parameter pomeni kot poltraka.', 'Switching to a polar curve whose parameter is the angle of a ray.'),
            explanation: text(
                'Pri polarni krivulji \\(\\rho=f(\\theta)\\) drsnik meri kot \\(\\theta\\), poltrak iz izhodišča pa ima dolžino \\(\\rho(\\theta)\\). Pri Arhimedovi spirali je \\(\\rho(\\theta)=\\theta\\). Napovej dolžino poltraka pri \\(\\theta=\\pi\\) in jo primerjaj z izpisom \\(\\rho=\\pi\\approx3{,}1416\\).',
                'For a polar curve \\(\\rho=f(\\theta)\\) the slider measures the angle \\(\\theta\\), and the ray from the origin has the length \\(\\rho(\\theta)\\). For the spiral of Archimedes \\(\\rho(\\theta)=\\theta\\). Predict the length of the ray at \\(\\theta=\\pi\\) and compare it with the readout \\(\\rho=\\pi\\approx3.1416\\).',
            ),
            formulaIds: ['polar-ray'],
            frames: [frame('parametric-polar-explanation', 'explanation'), frame('parametric-polar-observation', 'observation')],
            observationPrompt: text('Premikaj \\(\\theta\\) in opazuj, kako se poltrak podaljšuje.', 'Move \\(\\theta\\) and watch the ray grow.'),
            expectedObservations: [text('Dolžina poltraka je vedno enaka kotu: pri \\(\\theta=\\pi\\) je \\(3{,}1416\\).', 'The length of the ray always equals the angle: at \\(\\theta=\\pi\\) it is \\(3.1416\\).')],
            scene: parametricScene('parametric-polar-spiral', 'spiral', PI,
                'Arhimedova spirala pri \\(\\theta=\\pi\\): polmer \\(\\rho=3{,}1416\\).',
                'The spiral of Archimedes at \\(\\theta=\\pi\\): the radius \\(\\rho=3.1416\\).'),
        },
        {
            id: 'parametric-cardioid', order: 5,
            title: text('Kardioida iz vrednosti \\(\\rho\\)', 'The cardioid from the values of \\(\\rho\\)'),
            purpose: text('Pred sledenjem napovedati kardioido iz vrednosti \\(\\rho(\\theta)\\).', 'Predicting the cardioid from the values of \\(\\rho(\\theta)\\) before tracing it.'),
            explanation: text(
                'Kardioida ima \\(\\rho(\\theta)=1+\\cos\\theta\\): \\(\\rho(0)=2\\), \\(\\rho(\\pi/2)=1\\) in \\(\\rho(\\pi)=0\\). Iz teh treh vrednosti napovej, kako se poltrak krči, ko \\(\\theta\\) raste do \\(\\pi\\). Točka je zdaj pri \\(\\theta=\\pi/2\\) z izpisom \\(\\rho=1\\) in hitrostjo \\((-1,\\,-1)\\).',
                'The cardioid has \\(\\rho(\\theta)=1+\\cos\\theta\\): \\(\\rho(0)=2\\), \\(\\rho(\\pi/2)=1\\) and \\(\\rho(\\pi)=0\\). From these three values predict how the ray shrinks as \\(\\theta\\) grows to \\(\\pi\\). The point is now at \\(\\theta=\\pi/2\\) with the readout \\(\\rho=1\\) and the velocity \\((-1,\\,-1)\\).',
            ),
            formulaIds: ['polar-ray'],
            frames: [frame('parametric-cardioid-explanation', 'explanation'), frame('parametric-cardioid-observation', 'observation')],
            observationPrompt: text('Premakni \\(\\theta\\) od \\(0\\) do \\(\\pi\\) in preveri napoved.', 'Move \\(\\theta\\) from \\(0\\) to \\(\\pi\\) and check your prediction.'),
            expectedObservations: [text('Poltrak se krči od \\(2\\) do \\(0\\); pri \\(\\theta=\\pi\\) je kardioida v izhodišču, kjer ima ost in hitrost \\(0\\).', 'The ray shrinks from \\(2\\) to \\(0\\); at \\(\\theta=\\pi\\) the cardioid is at the origin, where it has a cusp and the velocity is \\(0\\).')],
            scene: parametricScene('parametric-cardioid-quarter', 'cardioid', PI / 2,
                'Kardioida pri \\(\\theta=\\pi/2\\): \\(\\rho=1\\), hitrost \\((-1,\\,-1)\\).',
                'The cardioid at \\(\\theta=\\pi/2\\): \\(\\rho=1\\), the velocity \\((-1,\\,-1)\\).'),
        },
        {
            id: 'parametric-cusp', order: 6,
            title: text('Ost cikloide', 'The cusp of the cycloid'),
            purpose: text('Videti, da je v osti hitrost enaka \\(0\\) in tangenta ni narisana.', 'Seeing that the velocity is \\(0\\) at the cusp and no tangent is drawn.'),
            explanation: text(
                'Na koncu loka (\\(t=2\\pi\\)) se krog dotakne osi \\(x\\) in označena točka za trenutek miruje: \\(r\'(2\\pi)=(0,0)\\). Napovej, kaj bo graf narisal namesto vektorja hitrosti. Ker smer gibanja tam ni določena, graf izpiše, da je hitrost \\(0\\), in tangente ne nariše.',
                'At the end of the arch (\\(t=2\\pi\\)) the circle touches the \\(x\\) axis and the marked point is momentarily at rest: \\(r\'(2\\pi)=(0,0)\\). Predict what the graph draws instead of the velocity vector. Since the direction of motion is not defined there, the graph states that the velocity is \\(0\\) and draws no tangent.',
            ),
            formulaIds: ['cycloid-parametrization'],
            frames: [frame('parametric-cusp-explanation', 'explanation'), frame('parametric-cusp-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) tik pred \\(2\\pi\\) in opazuj vektor hitrosti.', 'Move \\(t\\) just before \\(2\\pi\\) and watch the velocity vector.'),
            expectedObservations: [text('Tik pred ostjo je vektor hitrosti zelo kratek; v osti graf izpiše, da je hitrost \\(0\\), in ne nariše ničesar.', 'Just before the cusp the velocity vector is very short; at the cusp the graph states that the velocity is \\(0\\) and draws nothing.')],
            scene: parametricScene('parametric-cusp-end', 'cycloid', 2 * PI,
                'Pri \\(t=2\\pi\\) graf izpiše, da je hitrost \\(0\\); vektor hitrosti ni narisan.',
                'At \\(t=2\\pi\\) the graph states that the velocity is \\(0\\); no velocity vector is drawn.', 1),
        },
        {
            id: 'parametric-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati polmer kroga in izbirati polarne krivulje.', 'Changing the circle radius and choosing polar curves on your own.'),
            explanation: text(
                'Spreminjaj polmer kotalečega se kroga, izberi kardioido, rožo ali spiralo in premikaj parameter. Opazuj, kje je hitrost enaka \\(0\\) in kako se spreminjata dolžina loka in ploščina.',
                'Change the radius of the rolling circle, choose the cardioid, the rose or the spiral and move the parameter. Watch where the velocity is \\(0\\) and how the arc length and the area change.',
            ),
            formulaIds: ['cycloid-measures', 'polar-ray'],
            frames: [frame('parametric-explore-explanation', 'explanation'), frame('parametric-explore-observation', 'observation')],
            observationPrompt: text('Poišči polarno krivuljo, ki ima ost, in preveri, kje je hitrost \\(0\\).', 'Find a polar curve with a cusp and check where the velocity is \\(0\\).'),
            expectedObservations: [text('Kardioida ima ost v izhodišču pri \\(\\theta=\\pi\\), kjer je hitrost \\(0\\).', 'The cardioid has a cusp at the origin at \\(\\theta=\\pi\\), where the velocity is \\(0\\).')],
            scene: parametricScene('parametric-explore-start', 'cycloid', PI / 2,
                'Cikloida s polmerom \\(1\\) je pri \\(t=\\pi/2\\); vse je prosto za raziskovanje.',
                'The cycloid with radius \\(1\\) is at \\(t=\\pi/2\\); everything is free to explore.', 1),
        },
    ],
    sources: [
        {id: 'do-carmo-curves', citation: 'do Carmo, M. P. Differential Geometry of Curves and Surfaces, Chapter 1 (parametrized curves, arc length).'},
        {
            id: 'bezeg-parametric-implementation',
            citation: 'Bezeg source: src/graphs/curves/parametric/parametricCatalogue.ts and src/graphs/curves/parametric/ParametricCurveGraph.tsx.',
            implementationCorrespondence: 'The catalogue curves are fixed (no expression parser); a lesson scene selects the curve and the parameter with the parametric-curve and parameter actions, and the roll animation returns to the start of the domain on every step change and when the lesson is left.',
        },
    ],
    edgeCases: [
        text('Pri \\(r\'(t)=0\\) (ost) smer gibanja ni določena: graf izpiše hitrost \\(0\\) in ne nariše tangente.', 'Where \\(r\'(t)=0\\) (a cusp) the direction of motion is not defined: the graph states the velocity \\(0\\) and draws no tangent.'),
    ],
    unresolvedQuestions: [],
};

// ---- L2: curvature and the osculating circle ------------------------------------------------------------------------------

/** The cubic of spec L2: kappa(0) = 2/3, kappa(1/2) = 0.23570, kappa(1) = 0.05963. */
export const CURVATURE_CUBIC: LessonCurveFixture = {points: [[0, 0], [1, 0], [2, 1], [3, 3]]};
/** A symmetric S-shaped cubic with its inflection exactly at t = 1/2 (the second derivative vanishes there). */
export const CURVATURE_S_CUBIC: LessonCurveFixture = {points: [[0, 0], [1, 2], [2, -2], [3, 0]]};
const cubicView: LessonViewBox = [-3.5, 4.5, 5.5, -2.5];
const sCubicView: LessonViewBox = [-1.5, 3.5, 4.5, -3.5];
const parabolaView: LessonViewBox = [-3.2, 2.6, 3.2, -1.4];

const visibility = (target: 'curvature-frame' | 'curvature-circle', visible: boolean): LessonAction => ({kind: 'curve-visibility', target, visible});
/** The parameter and exactly the listed overlay parts; the parabola is the demonstration default, other curves are fixtures. */
const curvatureScene = (
    id: string, curve: LessonCurveFixture | undefined, parameter: number, shown: {frame: boolean; circle: boolean}, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'parameter', name: 't', value: parameter}, visibility('curvature-frame', shown.frame), visibility('curvature-circle', shown.circle),
    ];
    const expectedState = text(sl, en);
    if (curve === undefined) return {id, basedOn: 'demonstration-default', view: parabolaView, actions, expectedState};
    return {id, basedOn: 'lesson-fixture', curve, view: curve === CURVATURE_S_CUBIC ? sCubicView : cubicView, actions, expectedState};
};

const curvatureLesson: GuidedLesson = {
    demonstrationId: 'curve-curvature',
    title: text('Ukrivljenost in krivinska krožnica', 'Curvature and the osculating circle'),
    summary: text(
        'Ukrivljenost \\(\\kappa\\) meri, koliko se krivulja zavije na enoto dolžine loka. Krivinska krožnica ima polmer \\(1/|\\kappa|\\) in se krivulji v dani točki prilega najbolje od vseh krožnic; tangenta \\(T\\) in normala \\(N\\) tvorita ravninski Frenetov koordinatni sistem.',
        'Curvature \\(\\kappa\\) measures how much a curve turns per unit of arc length. The osculating circle has the radius \\(1/|\\kappa|\\) and fits the curve at a given point better than any other circle; the tangent \\(T\\) and the normal \\(N\\) form the planar Frenet frame.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o parametričnih in polarnih krivuljah: hitrost je odvod lege po parametru.', 'The lesson on parametric and polar curves is required: velocity is the derivative of the position with respect to the parameter.'),
        text('Priporočeno je poznavanje hodografa iz poglavja o PH krivuljah in odvoda iz poglavja Analiza.', 'Familiarity with the hodograph from the PH curves chapter and the derivative from the Analysis chapter helps.'),
    ],
    learningGoals: [
        text('Razložiš ukrivljenost \\(\\kappa\\) kot hitrost vrtenja tangente na enoto dolžine loka.', 'Explain the curvature \\(\\kappa\\) as the rate at which the tangent turns per unit of arc length.'),
        text('Iz ukrivljenosti izračunaš krivinski polmer \\(R=1/|\\kappa|\\) in središče krivinske krožnice.', 'Compute the radius of curvature \\(R=1/|\\kappa|\\) and the centre of the osculating circle from the curvature.'),
        text('Preveriš formulo za ukrivljenost v krajišču Bézierjeve krivulje.', 'Check the formula for the curvature at an endpoint of a Bézier curve.'),
        text('Prepoznaš prevoj: ukrivljenost je \\(0\\), krivinski polmer je neskončen in krožnica postane premica.', 'Recognise an inflection: the curvature is \\(0\\), the radius of curvature is infinite and the circle becomes a line.'),
    ],
    formulaBlocks: [
        {
            id: 'curvature-definition',
            latex: '\\kappa=\\frac{x\'y\'\'-y\'x\'\'}{(x\'^2+y\'^2)^{3/2}},\\qquad R=\\frac{1}{|\\kappa|}',
            notation: text(
                '\\((x,y)\\) je lega točke na krivulji, črtice pomenijo odvode po parametru, \\(R\\) je krivinski polmer.',
                '\\((x,y)\\) is the position of the point on the curve, primes mean derivatives with respect to the parameter and \\(R\\) is the radius of curvature.',
            ),
            explanation: text(
                'Števec je determinanta vektorjev \\(r\'\\) in \\(r\'\'\\), imenovalec pa je tretja potenca hitrosti. Predznak \\(\\kappa\\) pove, na katero stran se krivulja zavija; pri \\(\\kappa=0\\) je krivinski polmer neskončen.',
                'The numerator is the determinant of the vectors \\(r\'\\) and \\(r\'\'\\) and the denominator is the cube of the speed. The sign of \\(\\kappa\\) says to which side the curve turns; for \\(\\kappa=0\\) the radius of curvature is infinite.',
            ),
        },
        {
            id: 'curvature-centre',
            latex: 'c=r+\\frac{1}{\\kappa}\\,N',
            notation: text(
                '\\(r\\) je točka na krivulji, \\(N\\) enotska normala, \\(c\\) središče krivinske krožnice.',
                '\\(r\\) is the point on the curve, \\(N\\) the unit normal and \\(c\\) the centre of the osculating circle.',
            ),
            explanation: text(
                'Središče leži na normali na razdalji \\(R\\) od točke, na strani, kamor se krivulja zavija. Krožnica s tem središčem in polmerom \\(R\\) se krivulji dotika in ima z njo enako ukrivljenost.',
                'The centre lies on the normal at the distance \\(R\\) from the point, on the side to which the curve turns. The circle with this centre and the radius \\(R\\) touches the curve and has the same curvature as it.',
            ),
        },
        {
            id: 'curvature-endpoint',
            latex: '\\kappa(0)=\\frac{n-1}{n}\\,\\frac{h}{a^{2}}',
            notation: text(
                '\\(n\\) je stopnja Bézierjeve krivulje, \\(a=|b_1-b_0|\\) dolžina prve stranice kontrolnega poligona in \\(h\\) razdalja točke \\(b_2\\) od premice \\(b_0b_1\\).',
                '\\(n\\) is the degree of the Bézier curve, \\(a=|b_1-b_0|\\) the length of the first side of the control polygon and \\(h\\) the distance of the point \\(b_2\\) from the line \\(b_0b_1\\).',
            ),
            explanation: text(
                'Formula sledi iz hodografa: \\(r\'(0)=n(b_1-b_0)\\) in \\(r\'\'(0)=n(n-1)(b_2-2b_1+b_0)\\). Ukrivljenost v krajišču je torej odvisna le od prvih treh kontrolnih točk.',
                'The formula follows from the hodograph: \\(r\'(0)=n(b_1-b_0)\\) and \\(r\'\'(0)=n(n-1)(b_2-2b_1+b_0)\\). The curvature at the endpoint therefore depends only on the first three control points.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'parabola-curvature-example',
            title: text('Parabola \\(y=x^2\\) pri \\(x=0\\)', 'The parabola \\(y=x^2\\) at \\(x=0\\)'),
            calculationLatex: '\\kappa(0)=\\frac{2}{(1+0)^{3/2}}=2,\\quad R=\\frac12,\\quad c=\\left(0,\\tfrac12\\right)',
            resultLatex: '\\kappa=2,\\; R=0{,}5',
            check: text(
                'Izpis pokaže \\(\\kappa=2\\) in \\(R=0{,}5\\); pri \\(x=1\\) pokaže \\(\\kappa\\approx0{,}1789\\) in \\(R\\approx5{,}5902\\).',
                'The readout shows \\(\\kappa=2\\) and \\(R=0.5\\); at \\(x=1\\) it shows \\(\\kappa\\approx0.1789\\) and \\(R\\approx5.5902\\).',
            ),
        },
        {
            id: 'cubic-endpoint-example',
            title: text('Kubična krivulja v krajišču', 'The cubic at its endpoint'),
            calculationLatex: '\\kappa(0)=\\frac{3-1}{3}\\cdot\\frac{1}{1^{2}}=\\frac23',
            resultLatex: '\\kappa(0)\\approx0{,}6667',
            check: text(
                'Kontrolne točke \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) dajo \\(a=1\\) in \\(h=1\\); izpis pri \\(t=0\\) pokaže \\(\\kappa=0{,}6667\\).',
                'The control points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) give \\(a=1\\) and \\(h=1\\); the readout at \\(t=0\\) shows \\(\\kappa=0.6667\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'curvature-predict', order: 1,
            title: text('Kateri konec se bolj zavije?', 'Which end bends more?'),
            purpose: text('Pred drsenjem napovedati, kje je kubična krivulja najbolj ukrivljena.', 'Predicting where the cubic is most curved before sliding.'),
            explanation: text(
                'Kubična krivulja ima kontrolne točke \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\). Napovej: ali se bolj zavije pri \\(t=0\\) ali pri \\(t=1\\)? Okvir in krožnica sta skrita, izpis pa kaže ukrivljenost; zdaj je pri \\(t=0{,}5\\) enaka \\(0{,}2357\\).',
                'The cubic has the control points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\). Predict: does it bend more at \\(t=0\\) or at \\(t=1\\)? The frame and the circle are hidden and the readout shows the curvature; at \\(t=0.5\\) it is now \\(0.2357\\).',
            ),
            formulaIds: ['curvature-definition'],
            frames: [frame('curvature-predict-explanation', 'explanation'), frame('curvature-predict-observation', 'observation')],
            observationPrompt: text('Z drsnikom \\(t\\) preberi ukrivljenost pri \\(t=0\\) in pri \\(t=1\\).', 'With the \\(t\\) slider read the curvature at \\(t=0\\) and at \\(t=1\\).'),
            expectedObservations: [text('Pri \\(t=0\\) je \\(\\kappa=0{,}6667\\), pri \\(t=1\\) pa \\(\\kappa=0{,}0596\\): začetek se zavije dosti bolj.', 'At \\(t=0\\) we have \\(\\kappa=0.6667\\) and at \\(t=1\\) we have \\(\\kappa=0.0596\\): the start bends much more.')],
            scene: curvatureScene('curvature-predict-middle', CURVATURE_CUBIC, 0.5, {frame: false, circle: false},
                'Kubična krivulja pri \\(t=0{,}5\\): \\(\\kappa=0{,}2357\\); okvir in krožnica sta skrita.',
                'The cubic at \\(t=0.5\\): \\(\\kappa=0.2357\\); the frame and the circle are hidden.'),
        },
        {
            id: 'curvature-frame', order: 2,
            title: text('Tangenta, normala in kot', 'Tangent, normal and angle'),
            purpose: text('Pokazati okvir \\(T\\), \\(N\\) in prebrati smerni kot tangente.', 'Showing the frame \\(T\\), \\(N\\) and reading the direction angle of the tangent.'),
            explanation: text(
                'Okvir sestavljata enotska tangenta \\(T\\) in enotska normala \\(N\\), ki kaže na stran, kamor se krivulja zavija. Napovej smerni kot tangente na koncu krivulje, kjer je \\(r\'(1)\\) vzporeden vektorju \\(b_3-b_2=(1,2)\\): izpis pri \\(t=1\\) pokaže \\(\\varphi\\approx63{,}43^\\circ\\).',
                'The frame consists of the unit tangent \\(T\\) and the unit normal \\(N\\), which points to the side to which the curve turns. Predict the direction angle of the tangent at the end of the curve, where \\(r\'(1)\\) is parallel to \\(b_3-b_2=(1,2)\\): the readout at \\(t=1\\) shows \\(\\varphi\\approx63.43^\\circ\\).',
            ),
            formulaIds: ['curvature-definition'],
            frames: [frame('curvature-frame-explanation', 'explanation'), frame('curvature-frame-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) od \\(0\\) do \\(1\\) in opazuj, kako se kot tangente povečuje.', 'Move \\(t\\) from \\(0\\) to \\(1\\) and watch the tangent angle increase.'),
            expectedObservations: [text('Kot tangente raste od \\(0^\\circ\\) pri \\(t=0\\) do \\(63{,}43^\\circ\\) pri \\(t=1\\); normala je vedno pravokotna na tangento.', 'The tangent angle grows from \\(0^\\circ\\) at \\(t=0\\) to \\(63.43^\\circ\\) at \\(t=1\\); the normal is always perpendicular to the tangent.')],
            scene: curvatureScene('curvature-frame-end', CURVATURE_CUBIC, 1, {frame: true, circle: false},
                'Okvir \\(T\\), \\(N\\) je prikazan pri \\(t=1\\): \\(\\varphi=63{,}43^\\circ\\), \\(\\kappa=0{,}0596\\).',
                'The frame \\(T\\), \\(N\\) is shown at \\(t=1\\): \\(\\varphi=63.43^\\circ\\), \\(\\kappa=0.0596\\).'),
        },
        {
            id: 'curvature-circle', order: 3,
            title: text('Krivinska krožnica', 'The osculating circle'),
            purpose: text('Pokazati krožnico in prebrati krivinski polmer.', 'Showing the circle and reading the radius of curvature.'),
            explanation: text(
                'Krivinska krožnica se krivulji v dani točki prilega najbolje. Pri \\(t=0\\) je \\(\\kappa=2/3\\), zato je krivinski polmer \\(R=1/\\kappa=1{,}5\\) in središče je v \\((0,\\,1{,}5)\\). Napovej, kako se bo polmer spremenil, ko se krivulja izravna proti \\(t=1\\).',
                'The osculating circle fits the curve best at the given point. At \\(t=0\\) we have \\(\\kappa=2/3\\), so the radius of curvature is \\(R=1/\\kappa=1.5\\) and the centre is at \\((0,\\,1.5)\\). Predict how the radius changes as the curve straightens towards \\(t=1\\).',
            ),
            formulaIds: ['curvature-definition', 'curvature-centre'],
            frames: [frame('curvature-circle-explanation', 'explanation'), frame('curvature-circle-observation', 'observation')],
            observationPrompt: text('Poveči \\(t\\) in opazuj, kako raste polmer krožnice.', 'Increase \\(t\\) and watch the radius of the circle grow.'),
            expectedObservations: [text('Ko se ukrivljenost zmanjšuje, krivinski polmer \\(R=1/|\\kappa|\\) raste; pri \\(t=1\\) je \\(R\\approx16{,}77\\).', 'As the curvature decreases, the radius of curvature \\(R=1/|\\kappa|\\) grows; at \\(t=1\\) it is \\(R\\approx16.77\\).')],
            scene: curvatureScene('curvature-circle-start', CURVATURE_CUBIC, 0, {frame: true, circle: true},
                'Krožnica pri \\(t=0\\): \\(\\kappa=0{,}6667\\), \\(R=1{,}5\\).',
                'The circle at \\(t=0\\): \\(\\kappa=0.6667\\), \\(R=1.5\\).'),
        },
        {
            id: 'curvature-parabola', order: 4,
            title: text('Parabola pri \\(x=0\\) in \\(x=1\\)', 'The parabola at \\(x=0\\) and \\(x=1\\)'),
            purpose: text('Preveriti znane vrednosti za parabolo \\(y=x^2\\).', 'Checking the known values for the parabola \\(y=x^2\\).'),
            explanation: text(
                'Parabola \\(y=x^2\\) je narisana kot kvadratna Bézierjeva krivulja; \\(x=0\\) ustreza \\(t=0{,}5\\), \\(x=1\\) pa \\(t=1\\). Pri \\(x=0\\) je \\(\\kappa=2\\), \\(R=0{,}5\\) in središče \\((0,\\,0{,}5)\\). Napovej, kaj se zgodi z ukrivljenostjo pri \\(x=1\\), in nato nastavi \\(t=1\\): \\(\\kappa\\approx0{,}1789\\), \\(R\\approx5{,}5902\\), središče \\((-4,\\,3{,}5)\\).',
                'The parabola \\(y=x^2\\) is drawn as a quadratic Bézier curve; \\(x=0\\) corresponds to \\(t=0.5\\) and \\(x=1\\) to \\(t=1\\). At \\(x=0\\) we have \\(\\kappa=2\\), \\(R=0.5\\) and the centre \\((0,\\,0.5)\\). Predict what happens to the curvature at \\(x=1\\), then set \\(t=1\\): \\(\\kappa\\approx0.1789\\), \\(R\\approx5.5902\\), the centre \\((-4,\\,3.5)\\).',
            ),
            formulaIds: ['curvature-definition', 'curvature-centre'], workedExampleId: 'parabola-curvature-example',
            frames: [frame('curvature-parabola-explanation', 'explanation'), frame('curvature-parabola-calculation', 'calculation'), frame('curvature-parabola-observation', 'observation')],
            observationPrompt: text('Nastavi \\(t=1\\) in primerjaj izpis z vrednostmi v besedilu.', 'Set \\(t=1\\) and compare the readout with the values in the text.'),
            expectedObservations: [text('Pri \\(t=1\\) izpis pokaže \\(\\kappa=0{,}1789\\) in \\(R=5{,}5902\\): parabola je tam dosti položnejša kot v temenu.', 'At \\(t=1\\) the readout shows \\(\\kappa=0.1789\\) and \\(R=5.5902\\): the parabola is much flatter there than at its vertex.')],
            scene: curvatureScene('curvature-parabola-vertex', undefined, 0.5, {frame: true, circle: true},
                'Parabola v temenu (\\(t=0{,}5\\)): \\(\\kappa=2\\), \\(R=0{,}5\\).',
                'The parabola at its vertex (\\(t=0.5\\)): \\(\\kappa=2\\), \\(R=0.5\\).'),
        },
        {
            id: 'curvature-endpoint', order: 5,
            title: text('Formula za krajišče', 'The endpoint formula'),
            purpose: text('Primerjati formulo za ukrivljenost v krajišču z izpisom grafa.', 'Comparing the endpoint curvature formula with the readout of the graph.'),
            explanation: text(
                'Za kubično krivuljo je \\(n=3\\), \\(a=|b_1-b_0|=1\\) in \\(h=1\\), saj je \\(b_2=(2,1)\\) za \\(1\\) oddaljena od osi \\(x\\). Napovej \\(\\kappa(0)=\\tfrac23\\cdot\\tfrac{1}{1}\\) in primerjaj z izpisom \\(0{,}6667\\).',
                'For the cubic we have \\(n=3\\), \\(a=|b_1-b_0|=1\\) and \\(h=1\\), because \\(b_2=(2,1)\\) is at the distance \\(1\\) from the \\(x\\) axis. Predict \\(\\kappa(0)=\\tfrac23\\cdot\\tfrac{1}{1}\\) and compare it with the readout \\(0.6667\\).',
            ),
            formulaIds: ['curvature-endpoint'], workedExampleId: 'cubic-endpoint-example',
            frames: [frame('curvature-endpoint-explanation', 'explanation'), frame('curvature-endpoint-calculation', 'calculation'), frame('curvature-endpoint-observation', 'observation')],
            observationPrompt: text('Premakni \\(b_2\\) navzgor in preveri, da se \\(\\kappa(0)\\) spreminja sorazmerno z \\(h\\).', 'Move \\(b_2\\) upwards and check that \\(\\kappa(0)\\) changes in proportion to \\(h\\).'),
            expectedObservations: [text('Če se \\(h\\) podvoji, se podvoji tudi \\(\\kappa(0)\\); \\(b_3\\) na ukrivljenost v \\(t=0\\) ne vpliva.', 'If \\(h\\) is doubled, \\(\\kappa(0)\\) is doubled too; \\(b_3\\) does not affect the curvature at \\(t=0\\).')],
            scene: curvatureScene('curvature-endpoint-start', CURVATURE_CUBIC, 0, {frame: true, circle: true},
                'Kubična krivulja pri \\(t=0\\): \\(\\kappa=0{,}6667\\), kar je \\(2/3\\).',
                'The cubic at \\(t=0\\): \\(\\kappa=0.6667\\), which is \\(2/3\\).'),
        },
        {
            id: 'curvature-inflection', order: 6,
            title: text('Prevoj', 'An inflection'),
            purpose: text('Videti, da se pri prevoju krožnica spremeni v premico.', 'Seeing the circle turn into a line at an inflection.'),
            explanation: text(
                'Kubična krivulja v obliki črke S ima kontrolne točke \\((0,0)\\), \\((1,2)\\), \\((2,-2)\\), \\((3,0)\\). Na prvi polovici se zavija v eno, na drugi v drugo smer, zato mora biti \\(\\kappa=0\\) nekje vmes. Napovej, pri katerem \\(t\\) je to; pri \\(t=0{,}5\\) graf pokaže premico namesto krožnice in izpiše, da je krivinski polmer neskončen. Poskusi tudi premikati kontrolne točke.',
                'The S-shaped cubic has the control points \\((0,0)\\), \\((1,2)\\), \\((2,-2)\\), \\((3,0)\\). It turns in one direction on the first half and in the other direction on the second, so \\(\\kappa=0\\) somewhere in between. Predict at which \\(t\\) this happens; at \\(t=0.5\\) the graph shows a line instead of a circle and states that the radius of curvature is infinite. Try moving the control points too.',
            ),
            formulaIds: ['curvature-definition'],
            frames: [frame('curvature-inflection-explanation', 'explanation'), frame('curvature-inflection-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) mimo prevoja in opazuj, kako se krožnica obrne na drugo stran.', 'Move \\(t\\) past the inflection and watch the circle switch to the other side.'),
            expectedObservations: [text('Pri prevoju je \\(\\kappa=0\\) in namesto krožnice je narisana tangenta; pred njim in za njim je krožnica na nasprotnih straneh krivulje.', 'At the inflection \\(\\kappa=0\\) and a tangent line is drawn instead of a circle; before and after it the circle lies on opposite sides of the curve.')],
            scene: curvatureScene('curvature-inflection-middle', CURVATURE_S_CUBIC, 0.5, {frame: true, circle: true},
                'Pri \\(t=0{,}5\\) je \\(\\kappa=0\\): narisana je premica, krivinski polmer je neskončen.',
                'At \\(t=0.5\\) we have \\(\\kappa=0\\): a line is drawn and the radius of curvature is infinite.'),
        },
        {
            id: 'curvature-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati kontrolne točke in parameter.', 'Moving the control points and the parameter on your own.'),
            explanation: text(
                'Parabola je spet na začetnem mestu. Premikaj kontrolne točke in parameter \\(t\\) ter opazuj, kako se krivinska krožnica prilega krivulji in kdaj se spremeni v premico.',
                'The parabola is back at its starting place. Move the control points and the parameter \\(t\\) and watch how the osculating circle fits the curve and when it turns into a line.',
            ),
            formulaIds: ['curvature-definition', 'curvature-centre'],
            frames: [frame('curvature-explore-explanation', 'explanation'), frame('curvature-explore-observation', 'observation')],
            observationPrompt: text('Premakni srednjo kontrolno točko in poišči položaj, pri katerem je ukrivljenost v \\(t=0{,}5\\) največja.', 'Move the middle control point and find the position at which the curvature at \\(t=0.5\\) is largest.'),
            expectedObservations: [text('Bližje ko je srednja točka krivulji, večja je ukrivljenost v temenu; krožnica se tam skrči.', 'The closer the middle point is to the curve, the larger the curvature at the vertex; the circle shrinks there.')],
            scene: curvatureScene('curvature-explore-start', undefined, 0.5, {frame: true, circle: true},
                'Parabola pri \\(t=0{,}5\\): \\(\\kappa=2\\), \\(R=0{,}5\\); vse je prosto za raziskovanje.',
                'The parabola at \\(t=0.5\\): \\(\\kappa=2\\), \\(R=0.5\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'do-carmo-curvature', citation: 'do Carmo, M. P. Differential Geometry of Curves and Surfaces, Chapter 1 (curvature, the osculating circle).'},
        {id: 'farin-curves', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., chapter on curvature of Bézier curves (endpoint curvature).'},
        {
            id: 'bezeg-curvature-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/curvature.ts, src/graphs/curves/bezier/CurvatureOverlay.ts and src/graphs/curves/bezier/CurvatureBezierCurveGraph.tsx.',
            implementationCorrespondence: 'All values come from the curvature kernel; a lesson scene sets the parameter with the parameter action and shows or hides the frame and the circle with the curve-visibility actions curvature-frame and curvature-circle. At an inflection the overlay draws a line, never a huge circle.',
        },
    ],
    edgeCases: [
        text('Pri \\(\\kappa=0\\) (prevoj ali ravni del) je krivinski polmer neskončen; graf nariše tangento namesto krožnice.', 'Where \\(\\kappa=0\\) (an inflection or a straight part) the radius of curvature is infinite; the graph draws the tangent line instead of a circle.'),
        text('Pri \\(r\'=0\\) ukrivljenost ni določena in graf to izpiše namesto vrednosti.', 'Where \\(r\'=0\\) the curvature is not defined and the graph says so instead of showing a value.'),
    ],
    unresolvedQuestions: [],
};

export const curveGeometryGuidedLessons: readonly GuidedLesson[] = [parametricLesson, curvatureLesson];
