/**
 * Guided lessons of the Curve geometry family (docs/specs/curve-geometry-lessons.md): L1, parametric and polar curves, L2,
 * curvature and the osculating circle, L3, the curvature comb and spline joins, and L4, the evolute. The text is a one-shot draft (docs/specs/new-lesson-families.md, "One-shot lesson text"):
 * every value it quotes is the readout of the scene it belongs to, and `curveGeometryGuidedLessons.test.ts` checks that against
 * the real graphs. Scenes use the `parametric-curve`, `parameter` (`t`), `curve-visibility` (`curvature-frame`,
 * `curvature-circle`, `curvature-comb`, `evolute-normal`), `comb-curve`, `comb-gain`, `spline-beta`, `evolute-trace` and `parametric-roll` animation actions.
 */
import type {EvoluteTraceMode, LessonAction, LessonCurveFixture, LessonViewBox} from '../model';
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

// ---- L3: curvature comb and spline joins ----------------------------------------------------------------------------------

type CombKind = 'cubic' | 'c1' | 'c2' | 'g1';
/** Frames every default spline with room for its longest tooth (2.04 at gain 1.4); the cubic uses the view of L2. */
export const COMB_SPLINE_VIEW: LessonViewBox = [-6.5, 5.5, 6.5, -5.5];
/**
 * A scene of the curve-comb graph. `comb-curve` replaces the scene, so it comes first; gain, visibility and the G1 parameters follow.
 * The cubic is the demonstration default (the cubic of L2, `CURVATURE_CUBIC`), the splines are the default points of their graphs.
 */
const combScene = (
    id: string, kind: CombKind, shown: boolean, gain: number, sl: string, en: string, betas: ReadonlyArray<readonly [number, number]> = [],
): LessonScene => ({
    id,
    basedOn: 'demonstration-default',
    view: kind === 'cubic' ? cubicView : COMB_SPLINE_VIEW,
    actions: [
        {kind: 'comb-curve', curve: kind}, {kind: 'comb-gain', value: gain}, {kind: 'curve-visibility', target: 'curvature-comb', visible: shown},
        ...betas.map(([index, value]) => ({kind: 'spline-beta', index, value}) as const),
    ],
    expectedState: text(sl, en),
});

const combLesson: GuidedLesson = {
    demonstrationId: 'curve-comb',
    title: text('Glavnik ukrivljenosti in stiki zlepkov', 'Curvature comb and spline joins'),
    summary: text(
        'Glavnik ukrivljenosti nariše v vsaki točki krivulje zob, ki je pravokoten na krivuljo in ima dolžino \\(g\\,|\\kappa|\\). Na stiku zlepka skok v glavniku pokaže, da se ukrivljenost spremeni: zlepek C1 ali G1 ga običajno ima, zlepek C2 z regularnimi stiki pa ne.',
        'The curvature comb draws at every point of the curve a tooth that is normal to the curve and has the length \\(g\\,|\\kappa|\\). At a spline join a jump in the comb shows that the curvature changes: a C1 or G1 spline usually has one, a C2 spline with regular joins does not.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o ukrivljenosti in krivinski krožnici: ukrivljenost \\(\\kappa\\) je zasuk tangente na enoto dolžine loka.', 'The lesson on curvature and the osculating circle is required: the curvature \\(\\kappa\\) is the turning of the tangent per unit of arc length.'),
        text('Priporočeno je poznavanje poglavja o zlepkih: zlepka C1 in C2 ter zlepek G1.', 'Familiarity with the splines chapter helps: the C1 and C2 splines and the G1 spline.'),
    ],
    learningGoals: [
        text('Iz glavnika prebereš, kje je krivulja najbolj in kje najmanj ukrivljena.', 'Read from the comb where the curve is most and least curved.'),
        text('Na stiku zlepka primerjaš ukrivljenost na levi in desni ter preveriš skok.', 'Compare the curvature on the left and on the right of a spline join and check the jump.'),
        text('Veš, da zvezna tangenta (C1, G1) ne zagotavlja zvezne ukrivljenosti, zlepek C2 z regularnimi stiki pa jo ima.', 'Know that a continuous tangent (C1, G1) does not guarantee a continuous curvature, while a C2 spline with regular joins has one.'),
        text('Veš, da iz C2 sledi G2 le za regularne krivulje.', 'Know that C2 implies G2 for regular curves only.'),
    ],
    formulaBlocks: [
        {
            id: 'comb-tooth',
            latex: '\\ell(t)=g\\,|\\kappa(t)|',
            notation: text(
                '\\(\\ell\\) je dolžina zoba v točki \\(t\\), \\(g\\) ojačitev glavnika in \\(\\kappa\\) ukrivljenost.',
                '\\(\\ell\\) is the length of the tooth at the point \\(t\\), \\(g\\) the gain of the comb and \\(\\kappa\\) the curvature.',
            ),
            explanation: text(
                'Zob je pravokoten na krivuljo in je narisan na stran, na katero se krivulja zavija. Ojačitev \\(g\\) le povečuje ali manjša vse zobe; razmerja med njimi se ne spremenijo.',
                'The tooth is normal to the curve and is drawn on the side to which the curve turns. The gain \\(g\\) only enlarges or shrinks all the teeth; the ratios between them do not change.',
            ),
        },
        {
            id: 'comb-jump',
            latex: '\\Delta\\kappa=\\kappa_{+}-\\kappa_{-}',
            notation: text(
                '\\(\\kappa_{-}\\) je ukrivljenost tik pred stikom, \\(\\kappa_{+}\\) pa tik za njim.',
                '\\(\\kappa_{-}\\) is the curvature just before the join and \\(\\kappa_{+}\\) just after it.',
            ),
            explanation: text(
                'Pri \\(\\Delta\\kappa\\ne0\\) ima glavnik na stiku skok. Zlepek C2 je v stiku dvakrat zvezno odvedljiv, zato je pri regularnem stiku \\(\\Delta\\kappa=0\\): iz C2 sledi G2 le za regularne krivulje.',
                'For \\(\\Delta\\kappa\\ne0\\) the comb has a jump at the join. A C2 spline is twice continuously differentiable at the join, so for a regular join \\(\\Delta\\kappa=0\\): C2 implies G2 for regular curves only.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'comb-cubic-example',
            title: text('Dolžina zoba na kubični krivulji', 'Tooth length on the cubic'),
            calculationLatex: '\\ell(1)=1{,}4\\cdot0{,}0596\\approx0{,}0835',
            resultLatex: '\\ell(1)\\approx0{,}0835',
            check: text(
                'Pri \\(g=1{,}4\\) je zob pri \\(t=0\\) dolg \\(0{,}9333\\), pri \\(t=1\\) pa \\(0{,}0835\\); glavnik je tam najkrajši.',
                'For \\(g=1.4\\) the tooth at \\(t=0\\) has the length \\(0.9333\\) and at \\(t=1\\) it has \\(0.0835\\); the comb is shortest there.',
            ),
        },
    ],
    steps: [
        {
            id: 'comb-predict', order: 1,
            title: text('Kje je krivulja najbolj ravna?', 'Where is the curve flattest?'),
            purpose: text('Pred prikazom glavnika napovedati, kje je kubična krivulja najmanj ukrivljena.', 'Predicting where the cubic is least curved before the comb is shown.'),
            explanation: text(
                'Kubična krivulja ima kontrolne točke \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) in je ista kot v lekciji o ukrivljenosti. Glavnik je skrit. Napovej, kje je krivulja najbolj ravna, nato vklopi glavnik: zobje so tam najkrajši.',
                'The cubic has the control points \\((0,0)\\), \\((1,0)\\), \\((2,1)\\), \\((3,3)\\) and is the same as in the lesson on curvature. The comb is hidden. Predict where the curve is flattest, then switch the comb on: the teeth are shortest there.',
            ),
            formulaIds: ['comb-tooth'], workedExampleId: 'comb-cubic-example',
            frames: [frame('comb-predict-explanation', 'explanation'), frame('comb-predict-calculation', 'calculation'), frame('comb-predict-observation', 'observation')],
            observationPrompt: text('Vklopi glavnik in poišči najkrajši zob.', 'Switch the comb on and find the shortest tooth.'),
            expectedObservations: [text('Najkrajši zob je pri \\(t=1\\), kjer je \\(\\kappa=0{,}0596\\); pri \\(g=1{,}4\\) je dolg \\(0{,}0835\\). Najdaljši je pri \\(t=0\\): \\(0{,}9333\\).', 'The shortest tooth is at \\(t=1\\), where \\(\\kappa=0.0596\\); for \\(g=1.4\\) it has the length \\(0.0835\\). The longest is at \\(t=0\\): \\(0.9333\\).')],
            scene: combScene('comb-predict-hidden', 'cubic', false, 1.4,
                'Kubična krivulja z glavnikom, ki je skrit; ojačitev je \\(1{,}4\\).',
                'The cubic with the comb hidden; the gain is \\(1.4\\).'),
        },
        {
            id: 'comb-gain', order: 2,
            title: text('Ojačitev glavnika', 'The gain of the comb'),
            purpose: text('Z drsnikom spreminjati ojačitev in videti, da se razmerja zob ohranijo.', 'Changing the gain with the slider and seeing that the ratios of the teeth are kept.'),
            explanation: text(
                'Glavnik je vklopljen. Ojačitev \\(g\\) vse zobe enako podaljša ali skrajša, zato je glavnik le bolje viden, ukrivljenost pa se ne spremeni. Pri \\(g=2\\) je zob pri \\(t=0\\) dolg \\(1{,}3333\\), pri \\(t=1\\) pa \\(0{,}1193\\).',
                'The comb is on. The gain \\(g\\) enlarges or shrinks all the teeth equally, so the comb is only easier to see and the curvature does not change. For \\(g=2\\) the tooth at \\(t=0\\) has the length \\(1.3333\\) and at \\(t=1\\) it has \\(0.1193\\).',
            ),
            formulaIds: ['comb-tooth'],
            frames: [frame('comb-gain-explanation', 'explanation'), frame('comb-gain-observation', 'observation')],
            observationPrompt: text('Premakni drsnik za ojačitev in opazuj, kako se spreminja dolžina zob.', 'Move the gain slider and watch how the length of the teeth changes.'),
            expectedObservations: [text('Dolžina vsakega zoba je sorazmerna z \\(g\\); razmerje med prvim in zadnjim zobom ostane \\(11{,}18\\).', 'The length of every tooth is proportional to \\(g\\); the ratio of the first to the last tooth stays \\(11.18\\).')],
            scene: combScene('comb-gain-doubled', 'cubic', true, 2,
                'Kubična krivulja z glavnikom pri ojačitvi \\(g=2\\).',
                'The cubic with the comb at the gain \\(g=2\\).'),
        },
        {
            id: 'comb-c1', order: 3,
            title: text('Zlepek C1: skok na stiku', 'C1 spline: a jump at a join'),
            purpose: text('Napovedati in preveriti, da ima kvadratni zlepek C1 na stikih skok ukrivljenosti.', 'Predicting and checking that the quadratic C1 spline has a jump of curvature at its joins.'),
            explanation: text(
                'Kvadratni zlepek C1 ima zvezno tangento, drugi odvod pa se na stiku skokovito spremeni. Napovej, ali je glavnik na stiku zvezen, nato preveri izpis. Izpis navede stik z največjim skokom: Stik 1, kjer je \\(\\kappa\\) levo \\(1{,}3333\\), desno \\(0{,}6667\\), skok \\(-0{,}6667\\).',
                'The quadratic C1 spline has a continuous tangent, but its second derivative jumps at a join. Predict whether the comb is continuous at a join, then check the readout. The readout names the join with the largest jump: Join 1, where \\(\\kappa\\) is \\(1.3333\\) on the left and \\(0.6667\\) on the right, the jump \\(-0.6667\\).',
            ),
            formulaIds: ['comb-jump'],
            frames: [frame('comb-c1-explanation', 'explanation'), frame('comb-c1-observation', 'observation')],
            observationPrompt: text('Poišči stik, na katerem se zobje glavnika opazno spremenijo.', 'Find a join at which the teeth of the comb visibly change.'),
            expectedObservations: [text('Glavnik ni zvezen: pri Stiku 1 se \\(\\kappa\\) skokovito zmanjša z \\(1{,}3333\\) na \\(0{,}6667\\), čeprav je tangenta zvezna.', 'The comb is not continuous: at Join 1 the \\(\\kappa\\) drops from \\(1.3333\\) to \\(0.6667\\) although the tangent is continuous.')],
            scene: combScene('comb-c1-joins', 'c1', true, 1.4,
                'Kvadratni zlepek C1 z glavnikom; izpis: Stik 1, \\(\\kappa\\) levo \\(1{,}3333\\), desno \\(0{,}6667\\), skok \\(-0{,}6667\\).',
                'The quadratic C1 spline with the comb; the readout: Join 1, \\(\\kappa\\) left \\(1.3333\\), right \\(0.6667\\), jump \\(-0.6667\\).'),
        },
        {
            id: 'comb-c2', order: 4,
            title: text('Zlepek C2: zvezen glavnik', 'C2 spline: a continuous comb'),
            purpose: text('Preveriti, da kubični zlepek C2 na stikih nima skoka ukrivljenosti.', 'Checking that the cubic C2 spline has no jump of curvature at its joins.'),
            explanation: text(
                'Kubični zlepek C2 ima na stiku zvezen tudi drugi odvod, zato je glavnik na regularnem stiku zvezen. Izpis pri Stiku 1 pokaže \\(\\kappa\\) levo \\(0{,}598\\), desno \\(0{,}598\\), skok \\(0\\). Pazi: iz C2 sledi G2 le za regularne krivulje, torej tam, kjer hitrost ni \\(0\\).',
                'The cubic C2 spline also has a continuous second derivative at a join, so the comb is continuous at a regular join. The readout at Join 1 shows \\(\\kappa\\) left \\(0.598\\), right \\(0.598\\), the jump \\(0\\). Note that C2 implies G2 for regular curves only, that is where the speed is not \\(0\\).',
            ),
            formulaIds: ['comb-jump'],
            frames: [frame('comb-c2-explanation', 'explanation'), frame('comb-c2-observation', 'observation')],
            observationPrompt: text('Primerjaj glavnik pri vseh stikih z glavnikom zlepka C1.', 'Compare the comb at all joins with the comb of the C1 spline.'),
            expectedObservations: [text('Na nobenem stiku ni skoka: zobje levo in desno od stika so enako dolgi.', 'There is no jump at any join: the teeth on the left and on the right of a join have the same length.')],
            scene: combScene('comb-c2-joins', 'c2', true, 1.4,
                'Kubični zlepek C2 z glavnikom; izpis: Stik 1, \\(\\kappa\\) levo \\(0{,}598\\), desno \\(0{,}598\\), skok \\(0\\).',
                'The cubic C2 spline with the comb; the readout: Join 1, \\(\\kappa\\) left \\(0.598\\), right \\(0.598\\), jump \\(0\\).'),
        },
        {
            id: 'comb-g1', order: 5,
            title: text('Zlepek G1: prosti parameter', 'G1 spline: the free parameter'),
            purpose: text('Z prostim parametrom \\(b\\) spreminjati skok ukrivljenosti na stiku.', 'Changing the jump of curvature at a join with the free parameter \\(b\\).'),
            explanation: text(
                'Kvadratni zlepek G1 ima v vsakem stiku prosti parameter \\(b\\). Pri \\(b_1=b_2=1\\) izpis navede Stik 2: \\(\\kappa\\) levo \\(0{,}1217\\), desno \\(-0{,}1409\\), skok \\(-0{,}2625\\); skok pri Stiku 1 je le \\(-0{,}0427\\). Zdaj je \\(b_2=0{,}5\\): desna ukrivljenost je \\(-0{,}5635\\), skok \\(-0{,}6852\\).',
                'The quadratic G1 spline has a free parameter \\(b\\) at every join. For \\(b_1=b_2=1\\) the readout names Join 2: \\(\\kappa\\) left \\(0.1217\\), right \\(-0.1409\\), jump \\(-0.2625\\); the jump at Join 1 is only \\(-0.0427\\). Now \\(b_2=0.5\\): the curvature on the right is \\(-0.5635\\), the jump \\(-0.6852\\).',
            ),
            formulaIds: ['comb-jump'],
            frames: [frame('comb-g1-explanation', 'explanation'), frame('comb-g1-observation', 'observation')],
            observationPrompt: text('Premakni \\(b_2\\) na \\(2\\) in opazuj, kako se skok zmanjša.', 'Move \\(b_2\\) to \\(2\\) and watch how the jump decreases.'),
            expectedObservations: [text('Pri \\(b_2=2\\) je desna ukrivljenost \\(-0{,}0352\\) in skok \\(-0{,}1569\\); leva ukrivljenost se ne spremeni.', 'For \\(b_2=2\\) the curvature on the right is \\(-0.0352\\) and the jump is \\(-0.1569\\); the curvature on the left does not change.')],
            scene: combScene('comb-g1-beta', 'g1', true, 1.4,
                'Zlepek G1 z glavnikom in \\(b_2=0{,}5\\); izpis: Stik 2, \\(\\kappa\\) levo \\(0{,}1217\\), desno \\(-0{,}5635\\), skok \\(-0{,}6852\\).',
                'The G1 spline with the comb and \\(b_2=0.5\\); the readout: Join 2, \\(\\kappa\\) left \\(0.1217\\), right \\(-0.5635\\), jump \\(-0.6852\\).',
                [[1, 0.5]]),
        },
        {
            id: 'comb-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno primerjati vrste krivulj, ojačitev in prosti parameter.', 'Comparing the kinds of curves, the gain and the free parameter on your own.'),
            explanation: text(
                'Zlepek G1 je spet na začetnem mestu (\\(b_1=b_2=1\\)), izpis pa navaja Stik 2 s skokom \\(-0{,}2625\\). Preklapljaj med kubično krivuljo in zlepki, premikaj kontrolne točke in parametra \\(b\\) ter opazuj skoke.',
                'The G1 spline is back at its starting place (\\(b_1=b_2=1\\)) and the readout names Join 2 with the jump \\(-0.2625\\). Switch between the cubic and the splines, move the control points and the parameters \\(b\\) and watch the jumps.',
            ),
            formulaIds: ['comb-tooth', 'comb-jump'],
            frames: [frame('comb-explore-explanation', 'explanation'), frame('comb-explore-observation', 'observation')],
            observationPrompt: text('Poišči nastavitev zlepka G1, pri kateri je skok na Stiku 1 skoraj \\(0\\).', 'Find a setting of the G1 spline at which the jump at Join 1 is nearly \\(0\\).'),
            expectedObservations: [text('Pri \\(b_1=1\\) je skok pri Stiku 1 le \\(-0{,}0427\\), zato je tam glavnik skoraj zvezen.', 'For \\(b_1=1\\) the jump at Join 1 is only \\(-0.0427\\), so the comb is almost continuous there.')],
            scene: combScene('comb-explore-start', 'g1', true, 1.4,
                'Zlepek G1 z glavnikom: Stik 2, \\(\\kappa\\) levo \\(0{,}1217\\), desno \\(-0{,}1409\\), skok \\(-0{,}2625\\); vse je prosto za raziskovanje.',
                'The G1 spline with the comb: Join 2, \\(\\kappa\\) left \\(0.1217\\), right \\(-0.1409\\), jump \\(-0.2625\\); everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'farin-curvature-plots', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., chapters on curvature plots and on geometric continuity (G1, G2).'},
        {
            id: 'bezeg-comb-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/curvature.ts, src/graphs/curves/comb/curveComb.ts, src/graphs/curves/comb/CombOverlay.ts and src/graphs/curves/comb/CurveCombGraph.tsx.',
            implementationCorrespondence: 'All values come from the curvature kernel (the comb samples and the one-sided join curvatures); a lesson scene selects the curve with comb-curve first, then sets the gain with comb-gain, the comb with the curve-visibility action curvature-comb and the G1 parameters with spline-beta. The readout names the join with the largest jump.',
        },
    ],
    edgeCases: [
        text('Pri \\(r\'=0\\) ukrivljenost ni določena: graf izpiše, da je ukrivljenost na stiku nedoločena, in ne nariše zoba čez vozel.', 'Where \\(r\'=0\\) the curvature is not defined: the graph says that the curvature at the join is undefined and draws no tooth across a knot.'),
        text('Iz C2 sledi G2 le za regularne krivulje.', 'C2 implies G2 for regular curves only.'),
    ],
    unresolvedQuestions: [],
};

// ---- L4: the evolute ----------------------------------------------------------------------------------------------------

/** The window of the route: the parabola's evolute spans x in [-4, 4], y in [0.5, 3.5]. */
export const EVOLUTE_PARABOLA_VIEW: LessonViewBox = [-5.2, 5, 5.2, -1.2];

/** The S-cubic's window on the evolute: the curve and both cusps sit near y = 0, so y = 0 is kept low on the board, below the lesson panel. */
export const EVOLUTE_S_CUBIC_VIEW: LessonViewBox = [-1.5, 4.9, 4.5, -2.5];

/**
 * A scene of the curve-evolute graph. The route opens at t = 0.75, so every scene sets t, the trace and the overlays itself;
 * the frame stays hidden except in free exploration, because its labels would fall on E at the cusp.
 */
const evoluteScene = (
    id: string, curve: LessonCurveFixture | undefined, parameter: number, trace: EvoluteTraceMode, shown: {normal: boolean; frame?: boolean},
    sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'parameter', name: 't', value: parameter}, {kind: 'evolute-trace', mode: trace},
        {kind: 'curve-visibility', target: 'evolute-normal', visible: shown.normal},
        visibility('curvature-frame', shown.frame ?? false), visibility('curvature-circle', true),
    ];
    const expectedState = text(sl, en);
    if (curve === undefined) return {id, basedOn: 'demonstration-default', view: EVOLUTE_PARABOLA_VIEW, actions, expectedState};
    return {id, basedOn: 'lesson-fixture', curve, view: EVOLUTE_S_CUBIC_VIEW, actions, expectedState};
};

const evoluteLesson: GuidedLesson = {
    demonstrationId: 'curve-evolute',
    title: text('Evoluta', 'Evolute'),
    summary: text(
        'Evoluta je krivulja, ki jo opišejo središča krivinskih krožnic. Normale krivulje so njene tangente, njene osti pa ustrezajo temenom krivulje, to je točkam, v katerih ima ukrivljenost \\(\\kappa\\) lokalni ekstrem.',
        'The evolute is the curve traced by the centres of the osculating circles. The normals of the curve are its tangents, and its cusps correspond to the vertices of the curve, the points at which the curvature \\(\\kappa\\) has a local extremum.',
    ),
    prerequisites: [
        text('Potrebna je lekcija o ukrivljenosti in krivinski krožnici: središče krožnice je \\(c=r+\\tfrac{1}{\\kappa}N\\).', 'The lesson on curvature and the osculating circle is required: the centre of the circle is \\(c=r+\\tfrac{1}{\\kappa}N\\).'),
    ],
    learningGoals: [
        text('Evoluto opišeš kot sled središč krivinskih krožnic.', 'Describe the evolute as the track of the centres of the osculating circles.'),
        text('Preveriš, da gre normala v točki krivulje skozi pripadajočo točko evolute in se evolute tam dotika.', 'Check that the normal at a point of the curve passes through the matching point of the evolute and touches the evolute there.'),
        text('Povežeš osti evolute s temeni krivulje, kjer je \\(\\kappa^{\\prime}=0\\).', 'Connect the cusps of the evolute with the vertices of the curve, where \\(\\kappa^{\\prime}=0\\).'),
        text('Veš, da pri \\(\\kappa=0\\) točke evolute ni in da se sled tam prekine.', 'Know that there is no point of the evolute at \\(\\kappa=0\\) and that the trace breaks there.'),
    ],
    formulaBlocks: [
        {
            id: 'evolute-point',
            latex: 'E(t)=r(t)+\\frac{1}{\\kappa(t)}\\,N(t)',
            notation: text(
                '\\(r\\) je točka na krivulji, \\(N\\) enotska normala, \\(\\kappa\\) ukrivljenost in \\(E\\) točka evolute.',
                '\\(r\\) is the point on the curve, \\(N\\) the unit normal, \\(\\kappa\\) the curvature and \\(E\\) the point of the evolute.',
            ),
            explanation: text(
                'To je središče krivinske krožnice pri parametru \\(t\\). Pri \\(\\kappa=0\\) formula nima pomena: krožnica je premica in točke evolute ni.',
                'This is the centre of the osculating circle at the parameter \\(t\\). For \\(\\kappa=0\\) the formula has no meaning: the circle is a line and there is no point of the evolute.',
            ),
        },
        {
            id: 'evolute-tangent',
            latex: '\\frac{\\mathrm{d}E}{\\mathrm{d}s}=\\frac{\\mathrm{d}}{\\mathrm{d}s}\\!\\left(\\frac{1}{\\kappa}\\right)N',
            notation: text(
                '\\(s\\) je dolžina loka krivulje, \\(N\\) pa njena enotska normala v isti točki.',
                '\\(s\\) is the arc length of the curve and \\(N\\) its unit normal at the same point.',
            ),
            explanation: text(
                'Odvod evolute ima smer normale, zato je normala krivulje tangenta evolute. Kjer je \\(\\kappa^{\\prime}=0\\), je ta odvod enak \\(0\\): tam ima evoluta ost, krivulja pa teme.',
                'The derivative of the evolute has the direction of the normal, so the normal of the curve is a tangent of the evolute. Where \\(\\kappa^{\\prime}=0\\) this derivative is \\(0\\): there the evolute has a cusp and the curve has a vertex.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'evolute-parabola-example',
            title: text('Točka evolute na paraboli', 'A point of the evolute on the parabola'),
            calculationLatex: 'E=\\left(\\tfrac12,\\tfrac14\\right)+\\sqrt2\\cdot\\tfrac{1}{\\sqrt2}\\,(-1,1)=\\left(-\\tfrac12,\\tfrac54\\right)',
            resultLatex: 'E=\\left(-\\tfrac12,\\tfrac54\\right)',
            check: text(
                'Pri \\(t=0{,}75\\) je \\(x=\\tfrac12\\), \\(\\kappa=\\tfrac{1}{\\sqrt2}\\) in \\(R=\\sqrt2\\). Formula \\(E(x)=(-4x^3,3x^2+\\tfrac12)\\) da isto točko.',
                'At \\(t=0.75\\) we have \\(x=\\tfrac12\\), \\(\\kappa=\\tfrac{1}{\\sqrt2}\\) and \\(R=\\sqrt2\\). The formula \\(E(x)=(-4x^3,3x^2+\\tfrac12)\\) gives the same point.',
            ),
        },
    ],
    steps: [
        {
            id: 'evolute-predict', order: 1,
            title: text('Kam gre središče krožnice?', 'Where does the centre of the circle go?'),
            purpose: text('Napovedati pot središča krivinske krožnice, preden je narisana.', 'Predicting the path of the centre of the osculating circle before it is drawn.'),
            explanation: text(
                'Parabola \\(y=x^2\\) je parametrizirana z \\(x=2t-1\\). Pri \\(t=0{,}75\\) je središče krivinske krožnice točka \\(E=(-\\tfrac12,\\tfrac54)\\). Sled je skrita. Napovej, kam gre \\(E\\), ko \\(t\\) teče od \\(0\\) do \\(1\\): na kateri strani parabole je in kako daleč pride.',
                'The parabola \\(y=x^2\\) is parametrized by \\(x=2t-1\\). At \\(t=0.75\\) the centre of the osculating circle is the point \\(E=(-\\tfrac12,\\tfrac54)\\). The trace is hidden. Predict where \\(E\\) goes as \\(t\\) runs from \\(0\\) to \\(1\\): on which side of the parabola it is and how far it gets.',
            ),
            formulaIds: ['evolute-point'],
            frames: [frame('evolute-predict-explanation', 'explanation'), frame('evolute-predict-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) od \\(0\\) do \\(1\\) in sledi točki \\(E\\).', 'Move \\(t\\) from \\(0\\) to \\(1\\) and follow the point \\(E\\).'),
            expectedObservations: [text('Točka \\(E\\) gre v nasprotno smer kot točka na paraboli: pri \\(t=0\\) je \\(E=(4,\\tfrac72)\\), pri \\(t=0{,}5\\) je \\(E=(0,\\tfrac12)\\), pri \\(t=1\\) pa \\(E=(-4,\\tfrac72)\\).', 'The point \\(E\\) moves against the point on the parabola: at \\(t=0\\) we have \\(E=(4,\\tfrac72)\\), at \\(t=0.5\\) we have \\(E=(0,\\tfrac12)\\) and at \\(t=1\\) we have \\(E=(-4,\\tfrac72)\\).')],
            scene: evoluteScene('evolute-predict-hidden', undefined, 0.75, 'hidden', {normal: false},
                'Parabola s krivinsko krožnico pri \\(t=0{,}75\\); sled evolute in normala sta skriti.',
                'The parabola with the osculating circle at \\(t=0.75\\); the trace of the evolute and the normal are hidden.'),
        },
        {
            id: 'evolute-trace', order: 2,
            title: text('Sled evolute', 'The trace of the evolute'),
            purpose: text('Narisati evoluto kot sled točke \\(E\\), ko \\(t\\) teče.', 'Drawing the evolute as the track of the point \\(E\\) as \\(t\\) runs.'),
            explanation: text(
                'Sled zdaj riše vse točke \\(E\\) od \\(t=0\\) do trenutnega \\(t\\). Tako dobljena krivulja je evoluta. Za parabolo \\(y=x^2\\) je \\(E(x)=(-4x^3,3x^2+\\tfrac12)\\), kjer je \\(x=2t-1\\). Sled se začne v točki \\((4,\\tfrac72)\\) in je pri \\(t=0{,}75\\) prišla do \\(E=(-\\tfrac12,\\tfrac54)\\).',
                'The trace now draws all the points \\(E\\) from \\(t=0\\) to the current \\(t\\). The curve obtained in this way is the evolute. For the parabola \\(y=x^2\\) we have \\(E(x)=(-4x^3,3x^2+\\tfrac12)\\), where \\(x=2t-1\\). The trace starts at the point \\((4,\\tfrac72)\\) and at \\(t=0.75\\) it has reached \\(E=(-\\tfrac12,\\tfrac54)\\).',
            ),
            formulaIds: ['evolute-point'],
            frames: [frame('evolute-trace-explanation', 'explanation'), frame('evolute-trace-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) do \\(1\\) in opazuj, kako sled raste.', 'Move \\(t\\) to \\(1\\) and watch the trace grow.'),
            expectedObservations: [text('Pri \\(t=1\\) sled doseže \\((-4,\\tfrac72)\\); evoluta je simetrična glede na os parabole.', 'At \\(t=1\\) the trace reaches \\((-4,\\tfrac72)\\); the evolute is symmetric about the axis of the parabola.')],
            scene: evoluteScene('evolute-trace-partial', undefined, 0.75, 'to-parameter', {normal: false},
                'Parabola in sled evolute od \\(t=0\\) do \\(t=0{,}75\\).',
                'The parabola and the trace of the evolute from \\(t=0\\) to \\(t=0.75\\).'),
        },
        {
            id: 'evolute-normals', order: 3,
            title: text('Normale se dotikajo evolute', 'The normals touch the evolute'),
            purpose: text('Videti, da je normala krivulje tangenta evolute.', 'Seeing that the normal of the curve is a tangent of the evolute.'),
            explanation: text(
                'Evoluta je narisana cela, normala v točki pri \\(t=0{,}75\\) pa je vklopljena. Točka \\(E\\) leži na normali, ker je središče krožnice. Normala je v \\(E\\) tudi tangenta evolute: odvod evolute ima smer normale.',
                'The whole evolute is drawn and the normal at the point at \\(t=0.75\\) is switched on. The point \\(E\\) lies on the normal because it is the centre of the circle. At \\(E\\) the normal is also a tangent of the evolute: the derivative of the evolute has the direction of the normal.',
            ),
            formulaIds: ['evolute-point', 'evolute-tangent'], workedExampleId: 'evolute-parabola-example',
            frames: [frame('evolute-normals-explanation', 'explanation'), frame('evolute-normals-calculation', 'calculation'), frame('evolute-normals-observation', 'observation')],
            observationPrompt: text('Premikaj \\(t\\) in opazuj, kako se normala dotika evolute.', 'Move \\(t\\) and watch how the normal touches the evolute.'),
            expectedObservations: [text('Pri vsakem \\(t\\) gre normala skozi \\(E\\) in se tam dotika evolute. Pri \\(t=0{,}25\\) je \\(E=(\\tfrac12,\\tfrac54)\\).', 'At every \\(t\\) the normal passes through \\(E\\) and touches the evolute there. At \\(t=0.25\\) we have \\(E=(\\tfrac12,\\tfrac54)\\).')],
            scene: evoluteScene('evolute-normals-tangent', undefined, 0.75, 'full', {normal: true},
                'Parabola, cela evoluta in normala pri \\(t=0{,}75\\), ki gre skozi \\(E=(-\\tfrac12,\\tfrac54)\\).',
                'The parabola, the whole evolute and the normal at \\(t=0.75\\), which passes through \\(E=(-\\tfrac12,\\tfrac54)\\).'),
        },
        {
            id: 'evolute-cusp', order: 4,
            title: text('Ost nad temenom parabole', 'The cusp above the vertex of the parabola'),
            purpose: text('Povezati ost evolute s temenom parabole.', 'Connecting the cusp of the evolute with the vertex of the parabola.'),
            explanation: text(
                'Zdaj je \\(t=0{,}5\\), točka na krivulji je teme \\((0,0)\\). Tam je ukrivljenost največja: \\(\\kappa=2\\) in \\(R=\\tfrac12\\), zato je \\(E=(0,\\tfrac12)\\). Ker je tam \\(\\kappa^{\\prime}=0\\), je odvod evolute enak \\(0\\) in evoluta ima ost.',
                'Now \\(t=0.5\\) and the point on the curve is the vertex \\((0,0)\\). The curvature is largest there: \\(\\kappa=2\\) and \\(R=\\tfrac12\\), so \\(E=(0,\\tfrac12)\\). Since \\(\\kappa^{\\prime}=0\\) there, the derivative of the evolute is \\(0\\) and the evolute has a cusp.',
            ),
            formulaIds: ['evolute-tangent'],
            frames: [frame('evolute-cusp-explanation', 'explanation'), frame('evolute-cusp-observation', 'observation')],
            observationPrompt: text('Premakni \\(t\\) malo levo in malo desno od \\(0{,}5\\).', 'Move \\(t\\) a little to the left and to the right of \\(0.5\\).'),
            expectedObservations: [text('Točka \\(E\\) se na obeh straneh dvigne iz osti: pri \\(t=0{,}25\\) in \\(t=0{,}75\\) je \\(E=(\\pm\\tfrac12,\\tfrac54)\\), krivinska krožnica pa je večja.', 'The point \\(E\\) rises out of the cusp on both sides: at \\(t=0.25\\) and \\(t=0.75\\) we have \\(E=(\\pm\\tfrac12,\\tfrac54)\\) and the osculating circle is larger.')],
            scene: evoluteScene('evolute-cusp-vertex', undefined, 0.5, 'full', {normal: true},
                'Teme parabole pri \\(t=0{,}5\\) in ost evolute \\(E=(0,\\tfrac12)\\).',
                'The vertex of the parabola at \\(t=0.5\\) and the cusp of the evolute \\(E=(0,\\tfrac12)\\).'),
        },
        {
            id: 'evolute-cubic', order: 5,
            title: text('Temeni in prevoj kubične krivulje', 'The vertices and the inflection of a cubic'),
            purpose: text('Na kubični krivulji poiskati osti in prekinitev evolute.', 'Finding the cusps and the break of the evolute on a cubic.'),
            explanation: text(
                'Kubična krivulja s kontrolnimi točkami \\((0,0)\\), \\((1,2)\\), \\((2,-2)\\), \\((3,0)\\) je ista kot v lekciji o ukrivljenosti. Temeni ima pri \\(t\\approx0{,}1907\\) in \\(t\\approx0{,}8093\\), kjer je \\(|\\kappa|\\approx2{,}395\\); evoluta ima tam osti \\((0{,}6332;\\ 0{,}1598)\\) in \\((2{,}3668;\\ -0{,}1598)\\). Zdaj je \\(t=0{,}19\\), tik ob prvem temenu, s \\(R=0{,}4175\\).',
                'The cubic with the control points \\((0,0)\\), \\((1,2)\\), \\((2,-2)\\), \\((3,0)\\) is the same as in the lesson on curvature. It has vertices at \\(t\\approx0.1907\\) and \\(t\\approx0.8093\\), where \\(|\\kappa|\\approx2.395\\); the evolute has cusps there at \\((0.6332,\\ 0.1598)\\) and \\((2.3668,\\ -0.1598)\\). Now \\(t=0.19\\), right next to the first vertex, with \\(R=0.4175\\).',
            ),
            formulaIds: ['evolute-point', 'evolute-tangent'],
            frames: [frame('evolute-cubic-explanation', 'explanation'), frame('evolute-cubic-observation', 'observation')],
            observationPrompt: text('Nastavi \\(t=0{,}5\\) in preberi izpis, nato povleci kontrolno točko \\((1,2)\\).', 'Set \\(t=0.5\\) and read the readout, then drag the control point \\((1,2)\\).'),
            expectedObservations: [text('Pri \\(t=0{,}5\\) je prevoj: \\(\\kappa=0\\), izpis pove, da točke evolute ni, sled pa je tam prekinjena, ker središče odide v neskončnost. Ko vlečeš kontrolno točko, se temeni in osti premikajo skupaj.', 'At \\(t=0.5\\) there is an inflection: \\(\\kappa=0\\), the readout says that there is no point of the evolute and the trace breaks there because the centre goes off to infinity. As you drag the control point, the vertices and the cusps move together.')],
            scene: evoluteScene('evolute-cubic-vertex', CURVATURE_S_CUBIC, 0.19, 'full', {normal: true},
                'Kubična krivulja s prevojem, cela evoluta in krivinska krožnica pri \\(t=0{,}19\\); izpis: \\(R=0{,}4175\\), \\(E=(0{,}6332;\\ 0{,}1598)\\).',
                'The cubic with an inflection, the whole evolute and the osculating circle at \\(t=0.19\\); the readout: \\(R=0.4175\\), \\(E=(0.6332,\\ 0.1598)\\).'),
        },
        {
            id: 'evolute-explore', order: 6,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno spreminjati krivuljo in opazovati evoluto.', 'Changing the curve on your own and watching the evolute.'),
            explanation: text(
                'Spet je parabola pri \\(t=0{,}75\\), zdaj z okvirjem \\(T\\), \\(N\\), krožnico, normalo in celo evoluto. Premikaj kontrolne točke in \\(t\\), preklapljaj sled in normalo ter išči osti.',
                'The parabola is back at \\(t=0.75\\), now with the frame \\(T\\), \\(N\\), the circle, the normal and the whole evolute. Move the control points and \\(t\\), switch the trace and the normal and look for cusps.',
            ),
            formulaIds: ['evolute-point', 'evolute-tangent'],
            frames: [frame('evolute-explore-explanation', 'explanation'), frame('evolute-explore-observation', 'observation')],
            observationPrompt: text('Povleci srednjo kontrolno točko vstran in poišči ost.', 'Drag the middle control point sideways and find the cusp.'),
            expectedObservations: [text('Kvadratna krivulja je še vedno parabola, zato ima evoluta eno ost, dokler je teme na narisanem loku; ost leži na normali v temenu.', 'A quadratic curve is still a parabola, so the evolute has one cusp while the vertex is on the drawn arc; the cusp lies on the normal at the vertex.')],
            scene: evoluteScene('evolute-explore-start', undefined, 0.75, 'full', {normal: true, frame: true},
                'Parabola z okvirjem, krožnico, normalo in celo evoluto pri \\(t=0{,}75\\); vse je prosto za raziskovanje.',
                'The parabola with the frame, the circle, the normal and the whole evolute at \\(t=0.75\\); everything is free to explore.'),
        },
    ],
    sources: [
        {
            id: 'bezeg-evolute-implementation',
            citation: 'Bezeg source: src/bezeg/impl/curve/curvature.ts, src/graphs/curves/bezier/EvoluteOverlay.ts and src/graphs/curves/bezier/CurveEvoluteGraph.tsx.',
            implementationCorrespondence: 'E and the trace come from evolutePoint of the curvature kernel. A lesson scene sets t with parameter, the trace with evolute-trace and the normal with the curve-visibility action evolute-normal. The closed form on the parabola and every quoted value are checked numerically against the real graph; the spec names no curriculum source for evolutes.',
        },
    ],
    edgeCases: [
        text('Pri \\(\\kappa=0\\) točke evolute ni: izpis to pove, sled pa se prekine in ne poveže točk na obeh straneh prevoja.', 'At \\(\\kappa=0\\) there is no point of the evolute: the readout says so and the trace breaks without joining the points on the two sides of the inflection.'),
        text('Pri \\(r\\,^{\\prime}=0\\) ukrivljenost ni določena, zato točka evolute ni določena.', 'Where \\(r\\,^{\\prime}=0\\) the curvature is not defined, so the point of the evolute is not defined.'),
    ],
    unresolvedQuestions: [],
};

export const curveGeometryGuidedLessons: readonly GuidedLesson[] = [parametricLesson, curvatureLesson, combLesson, evoluteLesson];
