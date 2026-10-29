import type {LessonAction, LessonDefinition, LessonFrame, LessonPatchFixture, LessonPoint3, LessonView3D} from '../model';

export type PatchAdvancedExampleSectionId = 'tensor-subdivision' | 'tensor-joins' | 'triangular-patches' | 'square-vs-triangular';

const words = (sl: string, en: string) => ({sl, en});
const point = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
const camera: LessonView3D = {az: 0.72, el: 0.48, distance: 5.5, target: point(0.5, 0.5, 0.5)};
const triangularCamera: LessonView3D = {az: 0.6, el: -1.39, distance: 3, target: point(1 / 3, 1 / 3, 0)};
const joinCamera: LessonView3D = {az: -1.5, el: -1.54, distance: 11.5, target: point(1.5, 0, 0)};
const frame = (id: string, kind: LessonFrame['kind'], title: LessonFrame['title'], body: LessonFrame['body'], prompt?: LessonFrame['prompt']): LessonFrame => ({
    id, kind, title, body, ...(prompt ? {prompt} : {}),
});
const visibility = (target: Extract<LessonAction, {kind: 'patch-visibility'}>['target']): LessonAction => ({kind: 'patch-visibility', target, visible: true});
const prepared = (id: string, fixture: LessonPatchFixture, view3d = camera): LessonAction => ({kind: 'prepared-scene', sceneId: id, source: 'lesson-patch-fixture', patch: fixture, view3d});
const demonstration = (id: string): LessonAction => ({kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'});
const evaluation = (u: number, v: number, w?: number): LessonAction => w === undefined
    ? {kind: 'patch-evaluation', u, v}
    : {kind: 'patch-evaluation', u, v, w};

const saddle: LessonPatchFixture = {kind: 'tensor', m: 1, n: 1, net: [
    point(0, 0, 0), point(0, 1, 0), point(1, 0, 0), point(1, 1, 1),
]};
const triangularBump: LessonPatchFixture = {
    kind: 'triangular', n: 3,
    // Canonical order: (3,0,0),(2,1,0),(2,0,1),(1,2,0),(1,1,1),(1,0,2),(0,3,0),(0,2,1),(0,1,2),(0,0,3).
    net: [
        point(1, 0, 0), point(2 / 3, 1 / 3, 0), point(2 / 3, 0, 0), point(1 / 3, 2 / 3, 0), point(1 / 3, 1 / 3, 4.5),
        point(1 / 3, 0, 0), point(0, 1, 0), point(0, 2 / 3, 0), point(0, 1 / 3, 0), point(0, 0, 0),
    ],
};

const subdivision: LessonDefinition = {
    id: 'patch-advanced-subdivision-elevation', demonstrationId: 'patch-subdivision',
    title: words('Višanje stopnje in subdivizija', 'Degree elevation and subdivision'),
    summary: words('Na sedlasti krpi \\(S(u,v)=(u,v,uv)\\) zvišaj stopnjo in jo razdeli; preveri, da izračunane točke ostanejo iste.', 'Raise the degree of the saddle patch \\(S(u,v)=(u,v,uv)\\), then split it; check that the evaluated point stays the same.'),
    steps: [
        {
            id: 'elevate-saddle', title: words('Več kontrolnih točk, ista krpa', 'More control points, same patch'),
            body: words('Zvišanje stopnje v smeri \\(u\\) doda vrstico kontrolnih točk, ne da bi spremenilo parametrizirano krpo.', 'Elevation in direction \\(u\\) adds a row of control points without changing the parametrized patch.'),
            frames: [
                frame('elevation-calculate', 'calculation', words('Izračun prvotne krpe', 'The original-patch calculation'), words('Mreža \\((1,1)\\) opisuje \\(S(u,v)=(u,v,uv)\\). Pri \\((u,v)=(\\tfrac14,\\tfrac12)\\) dobimo \\(S=(\\tfrac14,\\tfrac12,\\tfrac18)\\).', 'The \\((1,1)\\) net describes \\(S(u,v)=(u,v,uv)\\). At \\((u,v)=(\\tfrac14,\\tfrac12)\\), \\(S=(\\tfrac14,\\tfrac12,\\tfrac18)\\).')),
                frame('elevation-observe', 'observation', words('Stopnja se spremeni, vrednost ne', 'The degree changes, the value does not'), words('Po višanju je stopnja \\((2,1)\\), mreža ima \\(6\\) točk, označena vrednost pa ostane \\((\\tfrac14,\\tfrac12,\\tfrac18)\\). V srednji vrstici sta kontrolni točki \\((\\tfrac12,0,0)\\) in \\((\\tfrac12,1,\\tfrac12)\\).', 'After elevation the degree is \\((2,1)\\), the net has \\(6\\) points, and the evaluated point remains \\((\\tfrac14,\\tfrac12,\\tfrac18)\\). The middle-row controls are \\((\\tfrac12,0,0)\\) and \\((\\tfrac12,1,\\tfrac12)\\).'), words('Primerjaj izračunano točko pred višanjem in po njem.', 'Compare the evaluated point before and after elevation.')),
            ],
            scene: {actions: [prepared('advanced-saddle-elevation', saddle), visibility('control-net'), evaluation(0.25, 0.5), {kind: 'patch-elevate', direction: 'u'}]},
        },
        {
            id: 'split-saddle', title: words('Dva dela iste krpe', 'Two pieces of the same patch'),
            body: words('Subdivizija pri \\(u=\\tfrac12\\) razdeli parametrsko območje, ne geometrije krpe.', 'Subdivision at \\(u=\\tfrac12\\) splits the parameter domain, not the patch geometry.'),
            frames: [
                frame('subdivision-calculate', 'calculation', words('Vrednost na šivu', 'Value at the seam'), words('Pri \\(u=\\tfrac12\\) je \\(S(\\tfrac12,\\tfrac12)=(\\tfrac12,\\tfrac12,\\tfrac14)\\). Levi del doseže to točko pri lokalnem \\(u=1\\), desni pri lokalnem \\(u=0\\).', 'At \\(u=\\tfrac12\\), \\(S(\\tfrac12,\\tfrac12)=(\\tfrac12,\\tfrac12,\\tfrac14)\\). The left piece reaches this point at local \\(u=1\\), and the right piece at local \\(u=0\\).')),
                frame('subdivision-observe', 'observation', words('Preveri ohranitev točke', 'Check the point is preserved'), words('Obe mreži kosa pripadata isti parametrizirani krpi: na šivu se njuni robovi sovpadata, torej je razmik med izračunanima točkama \\(0\\).', 'Both piece nets represent the same parametrized patch: their seam edges coincide, so the distance between the evaluated points is \\(0\\).'), words('Opazuj oba kosa in primerjaj točko na skupnem robu.', 'Inspect both pieces and compare their points on the shared edge.')),
            ],
            scene: {actions: [prepared('advanced-saddle-subdivision', saddle), evaluation(0.5, 0.5), {kind: 'patch-subdivide', direction: 'u', value: 0.5}]},
        },
    ],
};

const joins: LessonDefinition = {
    id: 'patch-advanced-joins-teapot', demonstrationId: 'patch-joins',
    title: words('Zveznost spojev in čajnik', 'Join continuity and the teapot'),
    summary: words('Primerjaj zveznost \\(C^0\\), \\(C^1\\) in \\(G^1\\) na dveh krpah ter si oglej 32-krpni čajnik kot sklepni primer.', 'Compare \\(C^0\\), \\(C^1\\) and \\(G^1\\) continuity on two patches, then inspect the 32-patch teapot capstone.'),
    steps: [
        {
            id: 'join-c0', title: words('Skupen rob', 'A shared boundary'),
            body: words('Pri \\(C^0\\) se robni točki ujemata; odvoda čez rob se lahko razlikujeta.', 'For \\(C^0\\), boundary points agree; cross-boundary derivatives may differ.'),
            frames: [
                frame('join-c0-calculate', 'calculation', words('Preveri položaj roba', 'Check boundary position'), words('Za vsak parameter vzdolž roba mora veljati \\(S_A(1,v)=S_B(0,v)\\). V prikazanem kink primeru je največji položajni razmik \\(0\\), čeprav se odvoda ne ujemata.', 'At every boundary parameter, \\(S_A(1,v)=S_B(0,v)\\). In the displayed kink example, the maximum position gap is \\(0\\), although the derivatives do not agree.')),
                frame('join-c0-observe', 'observation', words('Skupni rob, oster prehod', 'Shared edge, sharp transition'), words('Rob je zvezen, vendar se normala lahko skokovito spremeni. To je zveznost \\(C^0\\), ne \\(C^1\\).', 'The edge is continuous, but the normal can jump. This is \\(C^0\\) continuity, not \\(C^1\\).')),
            ],
            scene: {actions: [demonstration('advanced-join-c0'), {kind: 'patch-join-scene', scene: 'join-c0-kink', view3d: joinCamera}]},
        },
        {
            id: 'join-c1', title: words('Isti prečni odvod', 'Matching cross-boundary derivatives'),
            body: words('Pri \\(C^1\\) se položaj in prečni odvodi ujemata vzdolž roba.', 'For \\(C^1\\), positions and cross-boundary derivatives agree along the edge.'),
            frames: [
                frame('join-c1-calculate', 'calculation', words('Odvoda na spoju', 'Derivatives at the join'), words('Pogoj je \\(S_A(1,v)=S_B(0,v)\\) in \\(S_{A,u}(1,v)=S_{B,u}(0,v)\\). Zato sta razmik položajev in razmik odvodov enaka \\(0\\).', 'The conditions are \\(S_A(1,v)=S_B(0,v)\\) and \\(S_{A,u}(1,v)=S_{B,u}(0,v)\\). Thus both the position gap and derivative gap are \\(0\\).')),
                frame('join-c1-observe', 'observation', words('Tangenta se nadaljuje', 'The tangent continues'), words('Oba prečna vektorja sta enaka, zato se parametrizirani prehod nadaljuje brez spremembe smeri ali velikosti odvoda.', 'The two cross-boundary vectors match, so the parametrized transition continues without changing derivative direction or magnitude.')),
            ],
            scene: {actions: [demonstration('advanced-join-c1'), {kind: 'patch-join-scene', scene: 'join-c1', view3d: joinCamera}]},
        },
        {
            id: 'join-g1', title: words('Ista tangentna smer', 'Matching tangent direction'),
            body: words('Pri \\(G^1\\) se prečni odvodi lahko razlikujeta po pozitivnem merilu; njuna smer pa se ujema.', 'For \\(G^1\\), cross-boundary derivatives may differ by a positive scale, while their direction agrees.'),
            frames: [
                frame('join-g1-calculate', 'calculation', words('Razmerje odvodov', 'Derivative ratio'), words('V tem primeru \\(S_{B,u}(0,v)=2S_{A,u}(1,v)\\). Zato sta \\(G^1\\) in ne \\(C^1\\): faktor \\(2\\) spremeni velikost, ne smeri.', 'Here \\(S_{B,u}(0,v)=2S_{A,u}(1,v)\\). This is \\(G^1\\) but not \\(C^1\\): the factor \\(2\\) changes magnitude, not direction.')),
                frame('join-g1-observe', 'observation', words('Gladka oblika, drugačen parameter', 'Smooth shape, different parameter speed'), words('Meja tangentnih ravnin se ujema, čeprav se točke pri istem prečnem parametru premikajo z različno hitrostjo.', 'The tangent planes agree across the join, although points at the same cross-boundary parameter move at different speeds.')),
            ],
            scene: {actions: [demonstration('advanced-join-g1'), {kind: 'patch-join-scene', scene: 'join-c1', view3d: joinCamera}, {kind: 'patch-join-mode', mode: 'g1', alpha: 2}]},
        },
        {
            id: 'join-teapot', title: words('Sklepni primer: Utah teapot', 'Capstone: the Utah teapot'),
            body: words('Model sestavlja \\(32\\) bikubičnih krp; vsaka krpa ima \\(4\\times4=16\\) kontrolnih točk.', 'The model consists of \\(32\\) bicubic patches; each patch has \\(4\\times4=16\\) control points.'),
            frames: [
                frame('teapot-count', 'calculation', words('Preštej krpe', 'Count the patches'), words('Skupni mrežasti prikaz bi imel \\(32\\cdot16=512\\) lokalnih kontrolnih točk. Vsaka od \\(32\\) krp ima ločen prikazani rob, zato se pregledajo tudi šivi.', 'The combined local nets would have \\(32\\cdot16=512\\) control points. Each of the \\(32\\) patches has its own displayed boundary, so the seams can be inspected too.')),
                frame('teapot-observe', 'observation', words('Od para do celotnega modela', 'From a pair to the whole model'), words('Čajnik poveže veliko lokalnih krp v eno prepoznavno obliko. Kapstone scena je namenoma samo za branje.', 'The teapot joins many local patches into one recognizable shape. The capstone scene is intentionally read-only.'), words('Zavrti čajnik in sledi robovom sosednjih krp na trupu, ročaju in izlivu.', 'Rotate the teapot and trace the boundaries of neighboring patches on the body, handle, and spout.')),
            ],
            scene: {actions: [demonstration('advanced-teapot'), {kind: 'patch-join-scene', scene: 'join-teapot'}]},
        },
    ],
};

const triangular: LessonDefinition = {
    id: 'patch-advanced-triangular', demonstrationId: 'patch-triangular',
    title: words('Trikotna mreža in baricentrične koordinate', 'Triangular nets and barycentric coordinates'),
    summary: words('Na krpi stopnje \\(3\\) izračunaj točko v težišču in preveri njene tri robne Bézierjeve krivulje.', 'Evaluate a degree-\\(3\\) patch at its centroid and check its three boundary Bézier curves.'),
    steps: [{
        id: 'triangular-centroid', title: words('Težišče in robovi', 'The centroid and its edges'),
        body: words('Barycentrične koordinate \\((u,v,w)\\) so nenegativne in seštejejo v \\(1\\).', 'Barycentric coordinates \\((u,v,w)\\) are nonnegative and sum to \\(1\\).'),
        frames: [
            frame('triangle-calculate', 'calculation', words('De Casteljau v težišču', 'De Casteljau at the centroid'), words('Mreža stopnje \\(3\\) ima \\(\\binom{5}{2}=10\\) točk. Edina nen ničelna višina je \\(b_{111,z}=\\tfrac92\\). V težišču je njen utežni koeficient \\(6(\\tfrac13)^3=\\tfrac29\\), zato \\(S(\\tfrac13,\\tfrac13,\\tfrac13)=(\\tfrac13,\\tfrac13,1)\\).', 'A degree-\\(3\\) net has \\(\\binom{5}{2}=10\\) controls. The only nonzero height is \\(b_{111,z}=\\tfrac92\\). At the centroid its weighted coefficient is \\(6(\\tfrac13)^3=\\tfrac29\\), so \\(S(\\tfrac13,\\tfrac13,\\tfrac13)=(\\tfrac13,\\tfrac13,1)\\).')),
            frame('triangle-boundary', 'observation', words('Trije robovi', 'Three boundaries'), words('Na vsakem robu je eden od parametrov \\(u\\), \\(v\\) ali \\(w\\) enak \\(0\\). Kontrolna točka \\(b_{111}\\) zato ne sodeluje; vse tri robne krivulje imajo višino \\(0\\) in so običajne kubične Bézierjeve krivulje.', 'On each edge, one of \\(u\\), \\(v\\) or \\(w\\) equals \\(0\\). The control \\(b_{111}\\) therefore contributes nowhere on the boundary; all three boundary curves have height \\(0\\) and are ordinary cubic Bézier curves.')),
        ],
        scene: {actions: [prepared('advanced-triangular-centroid', triangularBump, triangularCamera), visibility('control-net'), visibility('boundary-curves'), visibility('decasteljau-scheme'), evaluation(1 / 3, 1 / 3, 1 / 3)]},
    }],
};

const comparison: LessonDefinition = {
    id: 'patch-advanced-square-triangular', demonstrationId: 'patch-triangular',
    title: words('Kvadratno in trikotno območje', 'Square and triangular domains'),
    summary: words('Primerjaj trikotno krpo s tenzorsko krpo iste mejne stopnje, ki ima enaki dve izhodiščni mejni krivulji.', 'Compare a triangular patch with a tensor patch of the same boundary degree that shares its two origin boundary curves.'),
    steps: [{
        id: 'compare-domains', title: words('Dva skupna robova, različni notranjosti', 'Two shared edges, different interiors'),
        body: words('Pretvorba uporabi dve robni krivulji trikotne krpe in tvori tenzorsko krpo nad kvadratom.', 'The comparison uses two boundary curves of the triangular patch to form a tensor patch over a square.'),
        frames: [
            frame('compare-calculate', 'calculation', words('Izračunaj obe točki', 'Evaluate both points'), words('Pri \\((u,v,w)=(\\tfrac13,\\tfrac13,\\tfrac13)\\) ima trikotna krpa višino \\(1\\). Pretvorjena tenzorska mreža uporablja le robne točke; njena višina pri \\((u,v)=(\\tfrac13,\\tfrac13)\\) je \\(0\\).', 'At \\((u,v,w)=(\\tfrac13,\\tfrac13,\\tfrac13)\\), the triangular patch has height \\(1\\). The derived tensor net uses only boundary controls; its height at \\((u,v)=(\\tfrac13,\\tfrac13)\\) is \\(0\\).')),
            frame('compare-boundary', 'observation', words('Ujemanje na robu, ne v notranjosti', 'Agreement on edges, not inside'), words('Na robovih \\(u=0\\) in \\(v=0\\) obe krpi se ujemata. V notranjosti se višini razlikujeta za \\(1\\). V prikazanem prekrivnem prikazu primerjaj trikotno ploskev s tenzorsko mrežo in krivuljami.', 'On the edges \\(u=0\\) and \\(v=0\\), the patches agree. At the interior point their heights differ by \\(1\\). In the visible comparison overlay, compare the triangular surface with the tensor net and curves.'), words('Preveri obe meji in nato prekrivni prikaz v središčni točki.', 'Check both shared edges, then compare the overlay at the centroid parameters.')),
        ],
        scene: {actions: [prepared('advanced-square-triangular', triangularBump, triangularCamera), visibility('control-net'), visibility('boundary-curves'), {kind: 'patch-tensor-comparison', visible: true}, evaluation(1 / 3, 1 / 3, 1 / 3)]},
    }],
};

export const patchGuidedExamplesAdvanced: Readonly<Record<PatchAdvancedExampleSectionId, LessonDefinition>> = {
    'tensor-subdivision': subdivision,
    'tensor-joins': joins,
    'triangular-patches': triangular,
    'square-vs-triangular': comparison,
};
