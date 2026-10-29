import type {LessonAction, LessonDefinition, LessonFrame, LessonPatchFixture, LessonPoint3, LessonView3D} from '../model';

export type PatchBasicExampleSectionId = 'curve-to-patch' | 'bilinear-patch' | 'control-net' | 'boundary-iso-curves';

const words = (sl: string, en: string) => ({sl, en});
const point = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
const tensorFixture = (m: number, n: number, height: (i: number, j: number) => number): LessonPatchFixture => ({
    kind: 'tensor', m, n,
    net: Array.from({length: (m + 1) * (n + 1)}, (_, k) => {
        const i = Math.floor(k / (n + 1)), j = k % (n + 1);
        return point(-1 + 2 * i / m, -1 + 2 * j / n, height(i, j));
    }),
});
const camera: LessonView3D = {az: 0.72, el: 0.48, distance: 5.5, target: point(0, 0, 0)};
const frame = (id: string, kind: LessonFrame['kind'], title: LessonFrame['title'], body: LessonFrame['body'], prompt?: LessonFrame['prompt'], animation?: LessonFrame['animation']): LessonFrame => ({
    id, kind, title, body, ...(prompt ? {prompt} : {}), ...(animation ? {animation} : {}),
});
const visibility = (target: Extract<LessonAction, {kind: 'patch-visibility'}>['target'], visible: boolean): LessonAction => ({kind: 'patch-visibility', target, visible});

function lesson(
    sectionId: PatchBasicExampleSectionId,
    id: string,
    title: LessonDefinition['title'],
    summary: LessonDefinition['summary'],
    fixture: LessonPatchFixture,
    u: number,
    v: number,
    extraActions: readonly LessonAction[],
    frames: readonly LessonFrame[],
): LessonDefinition {
    return {
        id, demonstrationId: 'patch-tensor', title, summary,
        steps: [{
            id: `${sectionId}-scene`, title, body: summary, frames,
            scene: {actions: [
                {kind: 'prepared-scene', sceneId: `${id}-prepared`, source: 'lesson-patch-fixture', patch: fixture, view3d: camera},
                ...extraActions,
                {kind: 'patch-evaluation', u, v},
            ]},
        }],
    };
}

const curveToPatchTitle = words('Krivulja se premika', 'A curve in motion');
const curveToPatchFixture = tensorFixture(2, 1, (i, j) => j === 0 ? -0.25 * (i === 1 ? 1 : 0) : 0.25 * (i === 1 ? 1 : 0));
const curveToPatch = lesson('curve-to-patch', 'patch-basics-curve-sweep', curveToPatchTitle,
    words('Mreža stopnje \\(2,1\\) ima šest točk. Vsak stolpec določa krivuljo v smeri \\(u\\); njihovo zaporedje pri \\(v\\) sestavi krpo.', 'A net of degree \\(2,1\\) has six points. Each column defines a curve in \\(u\\); their progression along \\(v\\) forms the patch.'),
    curveToPatchFixture, 0.5, 0.5,
    [visibility('control-net', true), visibility('iso-curves', true), visibility('boundary-curves', true)],
    [
        frame('curve-to-patch-explain', 'explanation', words('Od krivulje do krpe', 'From curve to patch'), words('Pri fiksnem \\(v\\) dobimo krivuljo v \\(u\\). Ko \\(v\\) spreminjamo, se njena družina krivulj združi v krpo.', 'At fixed \\(v\\), we get a curve in \\(u\\). As \\(v\\) varies, the family of curves forms a patch.')),
        frame('curve-to-patch-observe', 'observation', words('Sledi prerezu', 'Follow a cross-section'), words('Mreža ima \\(3\\) vrstice in \\(2\\) stolpca, zato vsebuje \\(6\\) kontrolnih točk in opisuje stopnji \\(2\\) ter \\(1\\). Označena točka leži pri \\(u=\\tfrac12\\); trenutno gledamo prerez pri \\(v=\\tfrac12\\).', 'The net has \\(3\\) rows and \\(2\\) columns, so it contains \\(6\\) control points and describes degrees \\(2\\) and \\(1\\). The marked point lies at \\(u=\\tfrac12\\); the current cross-section is at \\(v=\\tfrac12\\).'), words('Predvajaj animacijo in opazuj, kako se prerez pri stalnem \\(v\\) premika od \\(0\\) do \\(1\\), medtem ko označena točka ostaja pri \\(u=\\tfrac12\\).', 'Play the animation to watch the fixed-\\(v\\) cross-section move from \\(0\\) to \\(1\\), while the marked point stays at \\(u=\\tfrac12\\).'), {animationId: 'patch-v-sweep'}),
    ]);

const bilinearTitle = words('Središče bilinearne krpe', 'The bilinear patch midpoint');
const bilinearFixture: LessonPatchFixture = {kind: 'tensor', m: 1, n: 1, net: [point(0, 0, 0), point(0, 1, 0), point(1, 0, 0), point(1, 1, 1)]};
const bilinear = lesson('bilinear-patch', 'patch-basics-bilinear-midpoint', bilinearTitle,
    words('Krpa ima parametrizacijo \\(S(u,v)=(u,v,uv)\\). V središču so štiri uteži enake \\(\\tfrac14\\), zato je \\(S(\\tfrac12,\\tfrac12)=(\\tfrac12,\\tfrac12,\\tfrac14)\\).', 'The patch is parametrized by \\(S(u,v)=(u,v,uv)\\). At its centre all four weights equal \\(\\tfrac14\\), so \\(S(\\tfrac12,\\tfrac12)=(\\tfrac12,\\tfrac12,\\tfrac14)\\).'),
    bilinearFixture, 0.5, 0.5,
    [visibility('control-net', true), visibility('iso-curves', true), visibility('boundary-curves', true)],
    [
        frame('bilinear-calculation', 'calculation', words('Izračunaj središče', 'Calculate the midpoint'), words('Štiri vogalna oglišča so \\(P_{00}=(0,0,0)\\), \\(P_{10}=(1,0,0)\\), \\(P_{01}=(0,1,0)\\) in \\(P_{11}=(1,1,1)\\). Njihovo povprečje je \\(S(\\tfrac12,\\tfrac12)=(\\tfrac12,\\tfrac12,\\tfrac14)\\).', 'The four corners are \\(P_{00}=(0,0,0)\\), \\(P_{10}=(1,0,0)\\), \\(P_{01}=(0,1,0)\\), and \\(P_{11}=(1,1,1)\\). Their mean is \\(S(\\tfrac12,\\tfrac12)=(\\tfrac12,\\tfrac12,\\tfrac14)\\).')),
        frame('bilinear-observe', 'observation', words('Ravne prereze primerjaj z diagonalo', 'Compare straight sections with the diagonal'), words('Pri stalnem \\(u\\) je pot \\((u,v,uv)\\) premica. Diagonala \\(u=v=t\\) pa je \\((t,t,t^2)\\), torej parabola.', 'At fixed \\(u\\), the path \\((u,v,uv)\\) is a line. The diagonal \\(u=v=t\\) is \\((t,t,t^2)\\), a parabola.'), words('V mreži stopnje \\((1,1)\\) preveri, da je višina označene sredinske točke \\(\\tfrac14\\).', 'In the degree \\((1,1)\\) net, check that the marked midpoint has height \\(\\tfrac14\\).')),
    ]);

const controlNetTitle = words('Uteži določijo točko krpe', 'Weights determine a patch point');
const controlNetFixture = tensorFixture(2, 2, (i, j) => i === 1 && j === 1 ? 1.2 : 0);
const controlNet = lesson('control-net', 'patch-basics-control-net', controlNetTitle,
    words('Mreža stopnje \\((2,2)\\) ima \\((2+1)(2+1)=9\\) točk. Pri \\(u=\\tfrac14\\) so kvadratne uteži \\(\\tfrac9{16},\\tfrac6{16},\\tfrac1{16}\\), pri \\(v=\\tfrac12\\) pa \\(\\tfrac14,\\tfrac12,\\tfrac14\\); vsaka trojica sešteje v \\(1\\).', 'A degree \\((2,2)\\) net has \\((2+1)(2+1)=9\\) points. At \\(u=\\tfrac14\\), the quadratic weights are \\(\\tfrac9{16},\\tfrac6{16},\\tfrac1{16}\\); at \\(v=\\tfrac12\\), they are \\(\\tfrac14,\\tfrac12,\\tfrac14\\). Each triple sums to \\(1\\).'),
    controlNetFixture, 0.25, 0.5,
    [visibility('control-net', true), visibility('iso-curves', true), visibility('boundary-curves', true)],
    [
        frame('control-net-calculate', 'calculation', words('Preveri razdelitev enote', 'Check partition of unity'), words('Zmnožki uteži dajo \\(3\\cdot3=9\\) koeficientov, katerih vsota je \\(1\\). Označena točka je zato utežena sredina mreže; pri tej mreži je \\(S(\\tfrac14,\\tfrac12)=(-\\tfrac12,0,\\tfrac9{40})\\).', 'Products of the weights give \\(3\\cdot3=9\\) coefficients whose sum is \\(1\\). The marked point is therefore a weighted mean of the net; for this net, \\(S(\\tfrac14,\\tfrac12)=(-\\tfrac12,0,\\tfrac9{40})\\).')),
        frame('control-net-observe', 'observation', words('Loči mrežo od ploskve', 'Distinguish the net from the patch'), words('Krpa doseže štiri oglišča mreže. Notranja kontrolna točka \\(P_{11}\\) je dvignjena na višino \\(1{,}2\\), označena točka na krpi pa ima višino \\(0{,}225\\).', 'The patch reaches the four net corners. The interior control point \\(P_{11}\\) is raised to height \\(1.2\\), while the marked patch point has height \\(0.225\\).'), words('Preštej devet kontrolnih točk in primerjaj njihovo višino z označeno točko na ploskvi.', 'Count the nine control points and compare their heights with the marked point on the surface.')),
    ]);

const boundaryTitle = words('Notranja izoparametrična krivulja', 'An interior iso-curve');
const boundaryFixture = tensorFixture(2, 2, (i, j) => i === 1 && j === 1 ? 1.2 : 0);
const boundaryIso = lesson('boundary-iso-curves', 'patch-basics-boundary-iso-curves', boundaryTitle,
    words('Pri \\(u=\\tfrac12\\) so uteži v smeri \\(u\\) enake \\(\\tfrac14,\\tfrac12,\\tfrac14\\). Kontrolne točke notranje krivulje so izračunane iz stolpcev: \\(Q_0=(0,-1,0)\\), \\(Q_1=(0,0,0{,}6)\\), \\(Q_2=(0,1,0)\\).', 'At \\(u=\\tfrac12\\), the weights in the \\(u\\) direction are \\(\\tfrac14,\\tfrac12,\\tfrac14\\). The interior curve controls are computed from the net columns: \\(Q_0=(0,-1,0)\\), \\(Q_1=(0,0,0.6)\\), and \\(Q_2=(0,1,0)\\).'),
    boundaryFixture, 0.5, 0.5,
    [visibility('control-net', true), visibility('iso-curves', true), visibility('boundary-curves', true)],
    [
        frame('boundary-compute', 'calculation', words('Izračunaj kontrolni poligon', 'Compute the control polygon'), words('Sredinska kontrolna točka notranje izoparametrične krivulje je \\(Q_1=\\tfrac14P_{01}+\\tfrac12P_{11}+\\tfrac14P_{21}=(0,0,0{,}6)\\). To ni kontrolna točka mreže.', 'The middle control point of the interior iso-curve is \\(Q_1=\\tfrac14P_{01}+\\tfrac12P_{11}+\\tfrac14P_{21}=(0,0,0.6)\\). It is not a net point.')),
        frame('boundary-observe', 'observation', words('Primerjaj rob in notranjost', 'Compare a boundary and the interior'), words('Na robu \\(u=0\\) kontrolne točke krivulje sestavlja prva vrstica mreže. Pri \\(u=\\tfrac12\\) so točke \\(Q_j\\) utežene kombinacije treh vrstic; srednja leži na višini \\(0{,}6\\). Središče krpe ima višino \\(S(\\tfrac12,\\tfrac12)=0{,}3\\).', 'At the boundary \\(u=0\\), the curve controls are the first net row. At \\(u=\\tfrac12\\), the points \\(Q_j\\) are weighted combinations of the three rows; the middle lies at height \\(0.6\\). The patch midpoint has height \\(S(\\tfrac12,\\tfrac12)=0.3\\).'), words('Opazuj, da se robna krivulja opira na vrstico mreže, notranja pa na izračunane točke.', 'Observe that the boundary curve uses a net row, while the interior curve uses computed points.')),
    ]);

export const patchGuidedExamplesBasics: Readonly<Record<PatchBasicExampleSectionId, LessonDefinition>> = {
    'curve-to-patch': curveToPatch,
    'bilinear-patch': bilinear,
    'control-net': controlNet,
    'boundary-iso-curves': boundaryIso,
};
