import type {LessonAction, LessonDefinition, LessonFrame, LessonPatchFixture, LessonPoint3, LessonView3D} from '../model';

export type PatchEvaluationExampleSectionId = 'tensor-decasteljau' | 'properties' | 'tensor-derivatives';

const words = (sl: string, en: string) => ({sl, en});
const point = (x: number, y: number, z: number): LessonPoint3 => ({x, y, z});
const camera: LessonView3D = {az: 0.72, el: 0.48, distance: 5.5, target: point(0.5, 0.5, 0.5)};
const frame = (id: string, kind: LessonFrame['kind'], title: LessonFrame['title'], body: LessonFrame['body'], prompt?: LessonFrame['prompt']): LessonFrame => ({
    id, kind, title, body, ...(prompt ? {prompt} : {}),
});
const tensor = (m: number, n: number, height: (i: number, j: number) => number): LessonPatchFixture => ({
    kind: 'tensor', m, n,
    net: Array.from({length: (m + 1) * (n + 1)}, (_, k) => {
        const i = Math.floor(k / (n + 1)), j = k % (n + 1);
        return point(i / m, j / n, height(i, j));
    }),
});
const visibility = (target: Extract<LessonAction, {kind: 'patch-visibility'}>['target']): LessonAction => ({kind: 'patch-visibility', target, visible: true});
const prepared = (id: string, fixture: LessonPatchFixture): LessonAction => ({kind: 'prepared-scene', sceneId: id, source: 'lesson-patch-fixture', patch: fixture, view3d: camera});
const evaluation = (u: number, v: number): LessonAction => ({kind: 'patch-evaluation', u, v});

const deCasteljauFixture = tensor(2, 2, (i, j) => i === 1 && j === 1 ? 4 : 0);
const saddleFixture: LessonPatchFixture = {kind: 'tensor', m: 1, n: 1, net: [
    point(0, 0, 1), point(0, 1, -1), point(1, 0, -1), point(1, 1, 1),
]};
const propertyFixture = tensor(2, 2, (i, j) => i === 1 && j === 1 ? 4 : 0);
const affineFixture: LessonPatchFixture = {kind: 'tensor', m: 2, n: 2, net: propertyFixture.net.map(item => ({...item, z: 2 * item.z + 1}))};

function scene(id: string, fixture: LessonPatchFixture, u: number, v: number, switches: readonly LessonAction[]): LessonDefinition['steps'][number] {
    return {
        id, title: words('Preveri na krpi', 'Check it on the patch'),
        body: words('Uporabi prikazano mrežo in preveri izračun.', 'Use the displayed net to check the calculation.'),
        scene: {actions: [prepared(id, fixture), ...switches, evaluation(u, v)]},
    };
}

const deCasteljauTitle = words('Dve smeri, ista točka', 'Two directions, one point');
const deCasteljau: LessonDefinition = {
    id: 'patch-evaluation-order-independence', demonstrationId: 'patch-decasteljau',
    title: deCasteljauTitle,
    summary: words('Pri isti mreži izračunaj točko najprej po \\(u\\), nato po \\(v\\), in še v obratnem vrstnem redu.', 'For the same net, evaluate first in \\(u\\) then \\(v\\), and then in the reverse order.'),
    steps: [{...scene('order-independence', deCasteljauFixture, 0.25, 0.5, [visibility('decasteljau-scheme')]), frames: [
        frame('order-rows', 'calculation', words('Račun po smeri \\(u\\)', 'Calculation in direction \\(u\\)'), words('Izračun tukaj začne po smeri \\(u\\), ne glede na izbrani vrstni red konstrukcije v prikazu. Mreža ima \\(h_{11}=4\\), druge višine so \\(0\\). Pri \\(u=\\tfrac14\\) je srednja vmesna točka visoka \\(\\tfrac32\\); korak po \\(v=\\tfrac12\\) da \\(S=(\\tfrac14,\\tfrac12,\\tfrac34)\\).', 'The calculation here starts in \\(u\\), independently of the selected construction order in the view. The net has \\(h_{11}=4\\) and all other heights are \\(0\\). At \\(u=\\tfrac14\\), the middle intermediate point has height \\(\\tfrac32\\); the step at \\(v=\\tfrac12\\) gives \\(S=(\\tfrac14,\\tfrac12,\\tfrac34)\\).')),
        frame('order-columns', 'observation', words('Zamenjaj vrstni red', 'Swap the order'), words('Po \\(v\\) najprej dobimo srednjo točko višine \\(2\\), nato jo utežimo z \\(\\tfrac38\\) v smeri \\(u\\), kar spet da višino \\(\\tfrac34\\). Obe poti končata v isti točki, vmesne točke pa se razlikujejo.', 'Starting in \\(v\\) gives a middle point of height \\(2\\), then the weight \\(\\tfrac38\\) in direction \\(u\\) gives height \\(\\tfrac34\\) again. Both paths end at the same point, while their intermediate points differ.'), words('V demonstraciji preklopi med vrsticami in stolpci. Primerjaj končno označeno točko in vmesno konstrukcijo.', 'In the demonstration, switch between rows and columns. Compare the final marked point and the intermediate construction.')),
    ]}],
};

const propertiesTitle = words('Lastnosti mreže in krpe', 'Properties of the net and patch');
const properties: LessonDefinition = {
    id: 'patch-evaluation-properties', demonstrationId: 'patch-tensor',
    title: propertiesTitle,
    summary: words('Preveri konveksno ovojnico in afino invariantnost; nato razišči protiprimer za zmanjševanje variacije.', 'Check the convex hull and affine invariance, then examine a counterexample to variation diminishing.'),
    steps: [
        {...scene('hull-affine', propertyFixture, 0.5, 0.5, [visibility('control-net'), visibility('shading')]), frames: [
            frame('hull', 'calculation', words('Ovojnica mreže', 'The net’s hull'), words('V mreži \\(3\\times3\\) je samo notranja višina \\(h_{11}=4\\). Višina krpe je \\(16u(1-u)v(1-v)\\), zato ostane med \\(0\\) in \\(1\\), čeprav kontrolna točka doseže \\(4\\). Krpa leži v konveksni ovojnici vseh devetih točk, a ovojnica ni sama krpa.', 'In the \\(3\\times3\\) net, only the interior height \\(h_{11}=4\\) is nonzero. The patch height is \\(16u(1-u)v(1-v)\\), so it stays between \\(0\\) and \\(1\\), although a control point reaches \\(4\\). The patch lies in the convex hull of all nine points, but the hull is not the patch.'), words('Primerjaj najvišjo kontrolno točko z označeno točko na krpi.', 'Compare the highest control point with the marked point on the patch.')),
            frame('affine', 'observation', words('Afina preslikava', 'An affine map'), words('Če vse višine preslikamo z \\(z\\mapsto2z+1\\), se izračunana višina središča spremeni iz \\(1\\) v \\(3\\). Razlog je, da se uteži krpe seštejejo v \\(1\\): preslikava kontrolnih točk in preslikava vsake točke krpe se ujemata.', 'If every height is mapped by \\(z\\mapsto2z+1\\), the computed midpoint height changes from \\(1\\) to \\(3\\). The patch weights sum to \\(1\\), so mapping the control points and mapping each patch point give the same result.')),
        ]},
        {...scene('variation-counterexample', saddleFixture, 0.5, 0.5, [visibility('control-net'), visibility('shading')]), frames: [
            frame('variation', 'observation', words('Meja za krivulje odpove', 'The curve bound fails'), words('Ta bilinearna krpa je \\(S(u,v)=(u,v,(1-2u)(1-2v))\\). Navpična premica skozi \\((\\tfrac12,\\tfrac12)\\) seka krpo v \\((\\tfrac12,\\tfrac12,0)\\), kontrolno žično mrežo pa zgreši, ker so robovi mreže na \\(x=0\\), \\(x=1\\), \\(y=0\\) ali \\(y=1\\). Zato neposredna meja, ki bi štela presečišča s krpo in mrežo, tu ne velja.', 'This bilinear patch is \\(S(u,v)=(u,v,(1-2u)(1-2v))\\). The vertical line through \\((\\tfrac12,\\tfrac12)\\) intersects the patch at \\((\\tfrac12,\\tfrac12,0)\\), but misses the wire control net because its edges lie at \\(x=0\\), \\(x=1\\), \\(y=0\\), or \\(y=1\\). So the direct bound comparing line intersections with the patch and net fails here.'), words('Vključi mrežo in ploskev ter preveri, zakaj presečišča s krpo ni mogoče omejiti s številom presečišč z mrežo.', 'Show the net and patch. Check why the net’s intersection count cannot bound the patch’s count.')),
            frame('variation-scope', 'calculation', words('Kaj protiprimer pokaže', 'What the counterexample shows'), words('Protiprimer ovrže prav to neposredno pravilo za presečišča s premico in žično mrežo. Ne trdi, da so vse lastnosti zmanjševanja variacije v vseh oblikah napačne; tukaj zadostuje, da mreža zgreši premico, ki seka krpo.', 'The counterexample disproves this direct rule for line intersections with the wire net. It does not claim that every variation-diminishing statement fails in every form; here it is enough that the net misses a line which intersects the patch.')),
        ]},
        {...scene('affine-image', affineFixture, 0.5, 0.5, [visibility('control-net'), visibility('shading')]), frames: [
            frame('affine-image-expect', 'calculation', words('Napovej sliko', 'Predict the image'), words('V prvotni mreži \\(3\\times3\\) je bila višina označene točke \\(1\\). Po preslikavi vseh kontrolnih višin \\(z\\mapsto2z+1\\) napovej novo višino, še preden prebereš točko na prikazu.', 'The marked point in the original \\(3\\times3\\) net had height \\(1\\). After mapping every control height by \\(z\\mapsto2z+1\\), predict the new height before reading the point in the display.'), words('Uporabi afino preslikavo na prvotni vrednosti središča.', 'Apply the affine map to the original midpoint value.')),
            frame('affine-image-check', 'observation', words('Preveri afino invariantnost', 'Check affine invariance'), words('Označena točka je zdaj \\((\\tfrac12,\\tfrac12,3)\\). Preslikava mreže in nato vrednotenje dasta isto kot vrednotenje prvotne krpe in nato preslikava, ker se Bernsteinove uteži seštejejo v \\(1\\).', 'The marked point is now \\((\\tfrac12,\\tfrac12,3)\\). Mapping the net and then evaluating gives the same result as evaluating the original patch and then mapping, because the Bernstein weights sum to \\(1\\).')),
        ]},
    ],
};

const derivativesTitle = words('Odvodi sedlaste krpe', 'Derivatives of a saddle patch');
const derivatives: LessonDefinition = {
    id: 'patch-evaluation-derivatives', demonstrationId: 'patch-derivatives',
    title: derivativesTitle,
    summary: words('Izračunaj tangentna vektorja, normalo in mešani odvod krpe \\(S(u,v)=(u,v,uv)\\).', 'Compute the tangent vectors, normal and mixed derivative of \\(S(u,v)=(u,v,uv)\\).'),
    steps: [{...scene('saddle-derivatives', {kind: 'tensor', m: 1, n: 1, net: [point(0, 0, 0), point(0, 1, 0), point(1, 0, 0), point(1, 1, 1)]}, 0.5, 0.5,
        [visibility('tangent-plane'), visibility('normal'), visibility('twist')]), frames: [
        frame('partials', 'calculation', words('Parcialna odvoda', 'Partial derivatives'), words('Za \\(S(u,v)=(u,v,uv)\\) sta \\(S_u=(1,0,v)\\) in \\(S_v=(0,1,u)\\). V središču sta \\((1,0,\\tfrac12)\\) in \\((0,1,\\tfrac12)\\); oba sta tangentna na svoji izoparametrični krivulji.', 'For \\(S(u,v)=(u,v,uv)\\), \\(S_u=(1,0,v)\\) and \\(S_v=(0,1,u)\\). At the midpoint they are \\((1,0,\\tfrac12)\\) and \\((0,1,\\tfrac12)\\); each is tangent to its iso-curve.')),
        frame('normal-twist', 'observation', words('Nagnjena normala in zasuk', 'Tilted normal and twist'), words('V središču je \\(S_u\\times S_v=(-\\tfrac12,-\\tfrac12,1)\\), zato tangentna ravnina ni vodoravna. Mešani odvod je \\(S_{uv}=(0,0,1)\\), vektor zasuka. Primerjaj smeri prikazanih puščic in ravnine.', 'At the midpoint, \\(S_u\\times S_v=(-\\tfrac12,-\\tfrac12,1)\\), so the tangent plane is not horizontal. The mixed derivative is \\(S_{uv}=(0,0,1)\\), the twist vector. Compare the displayed arrows with the plane.'), words('Zavrti pogled in primerjaj tangentna vektorja, normalo ter zasuk.', 'Rotate the view and compare the tangent vectors, normal and twist.')),
    ]}],
};

export const patchGuidedExamplesEvaluation: Readonly<Record<PatchEvaluationExampleSectionId, LessonDefinition>> = {
    'tensor-decasteljau': deCasteljau,
    properties,
    'tensor-derivatives': derivatives,
};
