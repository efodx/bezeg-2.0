/**
 * Guided lesson of the Coons patch Demonstration (docs/specs/advanced-bezier-lessons.md, D4). The text is a one-shot draft
 * (docs/specs/new-lesson-families.md, "One-shot lesson text"): every value it quotes is a readout of the scene it belongs to, and
 * `coonsGuidedLessons.test.tsx` checks that against the real graph and the kernel in `src/bezeg/impl/kernels/coons.ts`.
 * Scenes use the `coons` action (`set-shown`, `set-linked-corners`, `move-point`).
 */
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LessonScene, LocalizedText} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});

type Shown = Extract<LessonAction, {kind: 'coons'; operation: 'set-shown'}>['shown'];

/** A scene from the default boundaries: the shown surface, the corner linking, and optionally one moved boundary point. */
const coonsScene = (
    id: string, shown: Shown, linked: boolean, move: {name: 'c0' | 'c1' | 'd0' | 'd1'; index: number; xyz: readonly [number, number, number]} | undefined, sl: string, en: string,
): LessonScene => {
    const actions: LessonAction[] = [
        {kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'},
        // Linking is set before the move: an unlinked end point moves alone.
        {kind: 'coons', operation: 'set-linked-corners', linked},
        {kind: 'coons', operation: 'set-shown', shown},
        ...(move ? [{kind: 'coons', operation: 'move-point', ...move} as const] : []),
    ];
    return {id, basedOn: 'demonstration-default', actions, expectedState: text(sl, en)};
};

const coonsLesson: GuidedLesson = {
    demonstrationId: 'patch-coons',
    title: text('Coonsova ploskev iz štirih robnih krivulj', 'The Coons patch from four boundary curves'),
    summary: text(
        'Štiri robne krivulje, ki se stikajo v vogalih, določajo ploskev z mešanjem \\(S=L_c+L_d-B\\): premonosni ploskvi \\(L_c\\) in \\(L_d\\) minus bilinearna ploskev \\(B\\) skozi vogale. Ploskev gre skozi vse štiri robne krivulje, a je to ena od mnogih zapolnitev roba: notranjost določa mešanje, ne samo rob.',
        'Four boundary curves that meet at the corners determine a surface by the blend \\(S=L_c+L_d-B\\): the two ruled surfaces \\(L_c\\) and \\(L_d\\) minus the bilinear surface \\(B\\) through the corners. The surface passes through all four boundary curves, but it is one of many fills of the boundary: the blend decides the interior, not the boundary alone.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje tenzorske Bézierjeve krpe iz poglavja o krpah: kontrolna mreža, robne krivulje in izoparametrične krivulje.', 'Assumes the tensor-product Bézier patch from the patches chapter: the control net, the boundary curves and the iso-parameter curves.'),
    ],
    learningGoals: [
        text('Sestaviš Coonsovo ploskev iz treh sestavin, \\(L_c\\), \\(L_d\\) in \\(B\\), in pojasniš, zakaj gre skozi vse štiri robne krivulje.', 'Build the Coons patch from its three ingredients, \\(L_c\\), \\(L_d\\) and \\(B\\), and explain why it passes through all four boundary curves.'),
        text('Preračunaš notranje kontrolne točke bikubične krpe iz robnih kontrolnih točk in veš, da so ena od mnogih možnih izbir.', 'Compute the interior control points of the bicubic patch from the boundary control points and know that they are one of many possible choices.'),
        text('Veš, da Coonsova ploskev robne krivulje interpolira le, kadar se vogali stikajo.', 'Know that the Coons patch interpolates the boundary curves only when the corners meet.'),
    ],
    formulaBlocks: [
        {
            id: 'coons-blend',
            latex: 'S(u,v)=L_c+L_d-B,\\quad L_c=(1-v)\\,c_0(u)+v\\,c_1(u),\\quad L_d=(1-u)\\,d_0(v)+u\\,d_1(v)',
            notation: text(
                '\\(c_0\\), \\(c_1\\) sta robni krivulji pri \\(v=0\\) in \\(v=1\\), \\(d_0\\), \\(d_1\\) pa pri \\(u=0\\) in \\(u=1\\). \\(B\\) je bilinearna ploskev skozi štiri vogale.',
                '\\(c_0\\), \\(c_1\\) are the boundary curves at \\(v=0\\) and \\(v=1\\), and \\(d_0\\), \\(d_1\\) those at \\(u=0\\) and \\(u=1\\). \\(B\\) is the bilinear surface through the four corners.',
            ),
            explanation: text(
                '\\(L_c\\) je premonosna ploskev, sestavljena iz daljic med istoležnima točkama krivulj \\(c_0\\) in \\(c_1\\); \\(L_d\\) enako med \\(d_0\\) in \\(d_1\\). Vsota \\(L_c+L_d\\) šteje vogale dvakrat, zato odštejemo \\(B\\). To je ena izbira mešanja, ne edina možna.',
                '\\(L_c\\) is a ruled surface made of the segments between corresponding points of \\(c_0\\) and \\(c_1\\); \\(L_d\\) is the same between \\(d_0\\) and \\(d_1\\). The sum \\(L_c+L_d\\) counts the corners twice, so \\(B\\) is subtracted. This is one choice of blending, not the only one.',
            ),
        },
        {
            id: 'coons-net',
            latex: 'P_{ij}=L_{c,ij}+L_{d,ij}-B_{ij},\\quad L_{c,ij}=\\bigl(1-\\tfrac j3\\bigr)c_{0,i}+\\tfrac j3\\,c_{1,i},\\quad L_{d,ij}=\\bigl(1-\\tfrac i3\\bigr)d_{0,j}+\\tfrac i3\\,d_{1,j}',
            notation: text(
                '\\(P_{ij}\\) je kontrolna točka bikubične krpe, \\(i\\) teče v smeri \\(u\\), \\(j\\) v smeri \\(v\\); \\(c_{0,i}\\) je \\(i\\)-ta kontrolna točka krivulje \\(c_0\\). \\(B_{ij}\\) je bilinearna ploskev v \\((\\tfrac i3,\\tfrac j3)\\).',
                '\\(P_{ij}\\) is a control point of the bicubic patch, \\(i\\) running along \\(u\\) and \\(j\\) along \\(v\\); \\(c_{0,i}\\) is the \\(i\\)-th control point of \\(c_0\\). \\(B_{ij}\\) is the bilinear surface at \\((\\tfrac i3,\\tfrac j3)\\).',
            ),
            explanation: text(
                'Ker so robne krivulje kubične, so vsi trije členi bikubični (linearne faktorje zvišamo na stopnjo \\(3\\)), zato je Coonsova ploskev natanko bikubična Bézierjeva krpa. Njenih \\(12\\) robnih kontrolnih točk so točke robnih krivulj, \\(4\\) notranje pa da ta formula.',
                'Since the boundary curves are cubic, all three terms are bicubic (the linear factors are elevated to degree \\(3\\)), so the Coons patch is exactly a bicubic Bézier patch. Its \\(12\\) boundary control points are the points of the boundary curves, and this formula gives the \\(4\\) interior ones.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'coons-centre-example',
            title: text('Središče ploskve', 'The centre of the surface'),
            calculationLatex: 'z\\bigl(S(\\tfrac12,\\tfrac12)\\bigr)=z(L_c)+z(L_d)-z(B)=0{,}375+0{,}375-0',
            resultLatex: 'S\\bigl(\\tfrac12,\\tfrac12\\bigr)=(1{,}5;\\;1{,}5;\\;0{,}75)',
            check: text(
                'Vsi štirje vogali imajo \\(z=0\\), zato je \\(B\\) v središču v višini \\(0\\). Višini \\(L_c\\) in \\(L_d\\) sta po \\(0{,}375\\), tako da je \\(z=0{,}75\\); isto vrednost pokaže polje Središče v plošči.',
                'All four corners have \\(z=0\\), so \\(B\\) is at height \\(0\\) in the centre. The heights of \\(L_c\\) and \\(L_d\\) are \\(0.375\\) each, so \\(z=0.75\\); the Centre readout in the panel shows the same value.',
            ),
        },
        {
            id: 'coons-interior-example',
            title: text('Notranja kontrolna točka \\(P_{11}\\)', 'The interior control point \\(P_{11}\\)'),
            calculationLatex: 'P_{11}=L_{c,11}+L_{d,11}-B_{11}=(1,1,1)+\\bigl(1,1,\\tfrac13\\bigr)-(1,1,0)',
            resultLatex: 'P_{11}=\\bigl(1,\\,1,\\,\\tfrac43\\bigr)',
            check: text(
                '\\(L_{c,11}=\\tfrac23c_{0,1}+\\tfrac13c_{1,1}\\) in \\(L_{d,11}=\\tfrac23d_{0,1}+\\tfrac13d_{1,1}\\), \\(B_{11}\\) leži v ravnini \\(z=0\\). Drugi trije so \\((1,2,\\tfrac13)\\), \\((2,1,\\tfrac53)\\) in \\((2,2,\\tfrac23)\\); polje v plošči jih izpiše kot \\(0{,}333\\), \\(1{,}667\\) in \\(0{,}667\\).',
                '\\(L_{c,11}=\\tfrac23c_{0,1}+\\tfrac13c_{1,1}\\) and \\(L_{d,11}=\\tfrac23d_{0,1}+\\tfrac13d_{1,1}\\), and \\(B_{11}\\) lies in the plane \\(z=0\\). The other three are \\((1,2,\\tfrac13)\\), \\((2,1,\\tfrac53)\\) and \\((2,2,\\tfrac23)\\); the panel shows them as \\(0.333\\), \\(1.667\\) and \\(0.667\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'coons-boundaries', order: 1,
            title: text('Štiri robne krivulje', 'Four boundary curves'),
            purpose: text('Pred razkritjem napovedati, koliko različnih kontrolnih točk ima rob, in videti, da se krivulje stikajo v vogalih.', 'Predicting, before the reveal, how many distinct control points the boundary has, and seeing that the curves meet at the corners.'),
            explanation: text(
                'Prikazane so štiri kubične Bézierjeve krivulje: \\(c_0\\) pri \\(v=0\\), \\(c_1\\) pri \\(v=1\\), \\(d_0\\) pri \\(u=0\\) in \\(d_1\\) pri \\(u=1\\). Vsaka ima \\(4\\) kontrolne točke, skupaj \\(16\\), vendar si vsak vogal delita dve krivulji. Napovej: koliko različnih kontrolnih točk ima rob? Prav je \\(16-4=12\\). Senčena ploskev je ena od možnih zapolnitev tega roba; v naslednjih korakih jo sestavimo iz treh delov.',
                'Four cubic Bézier curves are shown: \\(c_0\\) at \\(v=0\\), \\(c_1\\) at \\(v=1\\), \\(d_0\\) at \\(u=0\\) and \\(d_1\\) at \\(u=1\\). Each has \\(4\\) control points, \\(16\\) in all, but every corner is shared by two curves. Predict: how many distinct control points does the boundary have? It is \\(16-4=12\\). The shaded surface is one of the possible fills of this boundary; the next steps build it from three parts.',
            ),
            formulaIds: ['coons-blend'],
            frames: [frame('coons-boundaries-explanation', 'explanation'), frame('coons-boundaries-observation', 'observation')],
            observationPrompt: text('Povleci vogal in opazuj, da se premakneta obe krivulji, ki se tam stikata.', 'Drag a corner and watch both curves that meet there move.'),
            expectedObservations: [text('Z vklopljenimi povezanimi vogali se obe krivulji vedno stikata, polje Stik robnih krivulj pa sporoča, da se vsi štirje vogali ujemajo.', 'With linked corners on, the two curves always meet, and the Boundary corners readout reports that all four corners agree.')],
            scene: coonsScene('coons-boundaries-start', 's', true, undefined,
                'Privzete robne krivulje s povezanimi vogali; prikazana je Coonsova ploskev \\(S\\) z \\(12\\) različnimi kontrolnimi točkami roba.',
                'The default boundary curves with linked corners; the Coons patch \\(S\\) is shown, with \\(12\\) distinct boundary control points.'),
        },
        {
            id: 'coons-ruled-c', order: 2,
            title: text('Premonosna ploskev med \\(c_0\\) in \\(c_1\\)', 'The ruled surface between \\(c_0\\) and \\(c_1\\)'),
            purpose: text('Pred razkritjem napovedati višino središča premonosne ploskve in videti, da ne doseže robov \\(d_0\\), \\(d_1\\).', 'Predicting, before the reveal, the height of the centre of the ruled surface and seeing that it does not reach the edges \\(d_0\\), \\(d_1\\).'),
            explanation: text(
                'Prikazana je premonosna ploskev \\(L_c(u,v)=(1-v)\\,c_0(u)+v\\,c_1(u)\\): vsako točko krivulje \\(c_0\\) poveže z istoležno točko krivulje \\(c_1\\) z ravno daljico. V središču sta \\(c_0(\\tfrac12)=(1{,}5;\\ 0;\\ 1{,}5)\\) in \\(c_1(\\tfrac12)=(1{,}5;\\ 3;\\ -0{,}75)\\). Napovej višino \\(z\\) središča \\(L_c(\\tfrac12,\\tfrac12)\\). Sredina daljice je \\((1{,}5;\\ 1{,}5;\\ 0{,}375)\\). Ploskev \\(L_c\\) ima za robova \\(c_0\\) in \\(c_1\\), a robu \\(d_1\\) zgreši: pri \\(u=1\\) ima v sredini višino \\(0\\), \\(d_1\\) pa \\(0{,}75\\).',
                'The ruled surface \\(L_c(u,v)=(1-v)\\,c_0(u)+v\\,c_1(u)\\) is shown: it joins every point of \\(c_0\\) to the corresponding point of \\(c_1\\) by a straight segment. In the middle \\(c_0(\\tfrac12)=(1.5;\\ 0;\\ 1.5)\\) and \\(c_1(\\tfrac12)=(1.5;\\ 3;\\ -0.75)\\). Predict the height \\(z\\) of the centre \\(L_c(\\tfrac12,\\tfrac12)\\). The midpoint of the segment is \\((1.5;\\ 1.5;\\ 0.375)\\). The surface \\(L_c\\) has \\(c_0\\) and \\(c_1\\) as edges but misses the edge \\(d_1\\): at \\(u=1\\) it has height \\(0\\) in the middle, while \\(d_1\\) has \\(0.75\\).',
            ),
            formulaIds: ['coons-blend'],
            frames: [frame('coons-ruled-c-explanation', 'explanation'), frame('coons-ruled-c-observation', 'observation')],
            observationPrompt: text('Poišči rob, ki ga ta ploskev ne doseže, in oceni razdaljo do njega.', 'Find the edge this surface does not reach and estimate the distance to it.'),
            expectedObservations: [text('Ploskev je sestavljena iz ravnih daljic med \\(c_0\\) in \\(c_1\\), zato se robu \\(d_1\\) v sredini izogne za \\(0{,}75\\).', 'The surface is made of straight segments between \\(c_0\\) and \\(c_1\\), so it avoids the edge \\(d_1\\) by \\(0.75\\) in the middle.')],
            scene: coonsScene('coons-ruled-c-lc', 'lc', true, undefined,
                'Prikazana je premonosna ploskev \\(L_c\\) z višino \\(0{,}375\\) v središču.',
                'The ruled surface \\(L_c\\) is shown, with height \\(0.375\\) in the centre.'),
        },
        {
            id: 'coons-ruled-d', order: 3,
            title: text('Premonosna ploskev med \\(d_0\\) in \\(d_1\\)', 'The ruled surface between \\(d_0\\) and \\(d_1\\)'),
            purpose: text('Pred razkritjem napovedati, ali ima \\(L_d\\) v središču enako višino kot \\(L_c\\), in videti, da zgreši \\(c_0\\), \\(c_1\\).', 'Predicting, before the reveal, whether \\(L_d\\) has the same centre height as \\(L_c\\), and seeing that it misses \\(c_0\\), \\(c_1\\).'),
            explanation: text(
                'Zdaj je prikazana \\(L_d(u,v)=(1-u)\\,d_0(v)+u\\,d_1(v)\\), premonosna ploskev med \\(d_0\\) in \\(d_1\\). V središču sta \\(d_0(\\tfrac12)=(0;\\ 1{,}5;\\ 0)\\) in \\(d_1(\\tfrac12)=(3;\\ 1{,}5;\\ 0{,}75)\\). Napovej: ali ima \\(L_d\\) v središču isto višino kot \\(L_c\\)? Da: sredina daljice je \\((1{,}5;\\ 1{,}5;\\ 0{,}375)\\), kar je pri tem primeru naključje in ne zakon. Ploskev \\(L_d\\) pa zgreši robova \\(c_0\\) in \\(c_1\\): pri \\(v=0\\) in \\(u=\\tfrac12\\) je na višini \\(0\\), \\(c_0\\) pa na \\(1{,}5\\).',
                'Now \\(L_d(u,v)=(1-u)\\,d_0(v)+u\\,d_1(v)\\) is shown, the ruled surface between \\(d_0\\) and \\(d_1\\). In the middle \\(d_0(\\tfrac12)=(0;\\ 1.5;\\ 0)\\) and \\(d_1(\\tfrac12)=(3;\\ 1.5;\\ 0.75)\\). Predict: does \\(L_d\\) have the same centre height as \\(L_c\\)? Yes: the midpoint of the segment is \\((1.5;\\ 1.5;\\ 0.375)\\), which is a coincidence of this example and not a law. But \\(L_d\\) misses the edges \\(c_0\\) and \\(c_1\\): at \\(v=0\\) and \\(u=\\tfrac12\\) it is at height \\(0\\), while \\(c_0\\) is at \\(1.5\\).',
            ),
            formulaIds: ['coons-blend'],
            frames: [frame('coons-ruled-d-explanation', 'explanation'), frame('coons-ruled-d-observation', 'observation')],
            observationPrompt: text('Primerjaj obe premonosni ploskvi: kateri robovi so pri vsaki pravi in kateri ne?', 'Compare the two ruled surfaces: which edges are right on each and which are not?'),
            expectedObservations: [text('\\(L_c\\) ima prave robove \\(c_0\\), \\(c_1\\), \\(L_d\\) pa \\(d_0\\), \\(d_1\\); nobena nima vseh štirih.', '\\(L_c\\) has the right edges \\(c_0\\), \\(c_1\\) and \\(L_d\\) has \\(d_0\\), \\(d_1\\); neither has all four.')],
            scene: coonsScene('coons-ruled-d-ld', 'ld', true, undefined,
                'Prikazana je premonosna ploskev \\(L_d\\) z višino \\(0{,}375\\) v središču.',
                'The ruled surface \\(L_d\\) is shown, with height \\(0.375\\) in the centre.'),
        },
        {
            id: 'coons-blend-step', order: 4,
            title: text('Odštejemo bilinearno ploskev', 'Subtract the bilinear surface'),
            purpose: text('Pred razkritjem napovedati višino središča mešanja \\(L_c+L_d-B\\) in videti, da ploskev doseže vse štiri robove.', 'Predicting, before the reveal, the centre height of the blend \\(L_c+L_d-B\\) and seeing that the surface reaches all four edges.'),
            explanation: text(
                'Bilinearna ploskev \\(B\\) napenja ploskev čez štiri vogale; vsi štirje imajo \\(z=0\\), zato je \\(B\\) v središču v višini \\(0\\) (izberi Bilinearna ploskev B, če jo želiš videti). Napovej višino središča mešanja \\(S=L_c+L_d-B\\). Prav je \\(0{,}375+0{,}375-0=0{,}75\\), torej \\(S(\\tfrac12,\\tfrac12)=(1{,}5;\\ 1{,}5;\\ 0{,}75)\\). Zakaj se rob ujame: na robu \\(v=0\\) je \\(L_c=c_0\\), \\(L_d\\) pa daljica med vogaloma, kar je prav \\(B\\), zato se \\(L_d-B\\) izniči. Enako velja na ostalih treh robovih.',
                'The bilinear surface \\(B\\) is stretched across the four corners; all four have \\(z=0\\), so \\(B\\) is at height \\(0\\) in the centre (pick Bilinear corner surface B to see it). Predict the centre height of the blend \\(S=L_c+L_d-B\\). It is \\(0.375+0.375-0=0.75\\), so \\(S(\\tfrac12,\\tfrac12)=(1.5;\\ 1.5;\\ 0.75)\\). Why the edge is met: on the edge \\(v=0\\) we have \\(L_c=c_0\\), and \\(L_d\\) is the segment between the corners, which is exactly \\(B\\), so \\(L_d-B\\) cancels. The same holds on the other three edges.',
            ),
            formulaIds: ['coons-blend'], workedExampleId: 'coons-centre-example',
            frames: [frame('coons-blend-explanation', 'explanation'), frame('coons-blend-calculation', 'calculation'), frame('coons-blend-observation', 'observation')],
            observationPrompt: text('Preveri, da ploskev sega do vseh štirih robnih krivulj, in jo primerjaj z \\(L_c\\) in \\(L_d\\).', 'Check that the surface reaches all four boundary curves and compare it with \\(L_c\\) and \\(L_d\\).'),
            expectedObservations: [text('Mešanje \\(S\\) se dotakne vseh štirih robnih krivulj; to ni res ne za \\(L_c\\) ne za \\(L_d\\). Središče je na \\(z=0{,}75\\).', 'The blend \\(S\\) touches all four boundary curves, which is true of neither \\(L_c\\) nor \\(L_d\\). The centre is at \\(z=0.75\\).')],
            scene: coonsScene('coons-blend-s', 's', true, undefined,
                'Prikazana je Coonsova ploskev \\(S\\) z robovi na vseh štirih krivuljah in središčem \\((1{,}5;\\ 1{,}5;\\ 0{,}75)\\).',
                'The Coons patch \\(S\\) is shown, with its edges on all four curves and the centre \\((1.5;\\ 1.5;\\ 0.75)\\).'),
        },
        {
            id: 'coons-interior-net', order: 5,
            title: text('Notranja kontrolna mreža in tenzorska krpa', 'The interior control net and the tensor patch'),
            purpose: text('Pred razkritjem napovedati notranjo kontrolno točko \\(P_{11}\\) in primerjati Coonsovo ploskev s tenzorsko krpo.', 'Predicting, before the reveal, the interior control point \\(P_{11}\\) and comparing the Coons patch with a tensor patch.'),
            explanation: text(
                'Ker so robovi kubični, je \\(S\\) natanko bikubična Bézierjeva krpa: \\(16\\) kontrolnih točk, od tega \\(12\\) robnih in \\(4\\) notranje. Napovej \\(P_{11}=L_{c,11}+L_{d,11}-B_{11}\\); trije členi imajo \\(x=y=1\\), \\(z\\) pa so \\(1\\), \\(\\tfrac13\\) in \\(0\\), torej \\(P_{11}=(1,1,\\tfrac43)\\). Preostale notranje točke so \\((1,2,\\tfrac13)\\), \\((2,1,\\tfrac53)\\) in \\((2,2,\\tfrac23)\\); preberi jih v plošči Notranja kontrolna mreža. Primerjava s tenzorsko krpo: njen rob določa samo teh \\(12\\) točk, štiri notranje pa bi lahko izbral kakor koli drugače in dobil drugačno ploskev z istim robom. Coonsovo mešanje je pravilo, ki jih izbere, ena od mnogih izbir.',
                'Since the edges are cubic, \\(S\\) is exactly a bicubic Bézier patch: \\(16\\) control points, \\(12\\) on the boundary and \\(4\\) interior. Predict \\(P_{11}=L_{c,11}+L_{d,11}-B_{11}\\); the three terms have \\(x=y=1\\) and \\(z\\) equal to \\(1\\), \\(\\tfrac13\\) and \\(0\\), so \\(P_{11}=(1,1,\\tfrac43)\\). The other interior points are \\((1,2,\\tfrac13)\\), \\((2,1,\\tfrac53)\\) and \\((2,2,\\tfrac23)\\); read them in the Interior control net panel. Compared with a tensor patch: its boundary depends only on these \\(12\\) points, and you could choose the four interior ones any other way and get a different surface with the same boundary. The Coons blend is the rule that picks them, one choice of many.',
            ),
            formulaIds: ['coons-net'], workedExampleId: 'coons-interior-example',
            frames: [frame('coons-interior-explanation', 'explanation'), frame('coons-interior-calculation', 'calculation'), frame('coons-interior-observation', 'observation')],
            observationPrompt: text('Primerjaj kontrolno mrežo na ploskvi s poljem Notranja kontrolna mreža in poišči štiri notranje točke.', 'Compare the control net on the surface with the Interior control net readout and find the four interior points.'),
            expectedObservations: [text('Notranje točke \\(P_{11}\\), \\(P_{12}\\), \\(P_{21}\\), \\(P_{22}\\) so izpisane v plošči; njihove višine so \\(1{,}333\\), \\(0{,}333\\), \\(1{,}667\\), \\(0{,}667\\).', 'The interior points \\(P_{11}\\), \\(P_{12}\\), \\(P_{21}\\), \\(P_{22}\\) are listed in the panel; their heights are \\(1.333\\), \\(0.333\\), \\(1.667\\), \\(0.667\\).')],
            scene: coonsScene('coons-interior-net', 's', true, undefined,
                'Prikazana je Coonsova ploskev s kontrolno mrežo; \\(P_{11}=(1;\\ 1;\\ 1{,}333)\\).',
                'The Coons patch is shown with its control net; \\(P_{11}=(1;\\ 1;\\ 1.333)\\).'),
        },
        {
            id: 'coons-break-corner', order: 6,
            title: text('Pretrgan vogal', 'A broken corner'),
            purpose: text('Pred razkritjem napovedati, ali ploskev še interpolira obe krivulji v pretrganem vogalu.', 'Predicting, before the reveal, whether the surface still interpolates both curves at a broken corner.'),
            explanation: text(
                'Povezani vogali so izklopljeni in krajišče krivulje \\(c_0\\) pri \\(u=1\\) je dvignjeno z \\((3,0,0)\\) na \\((3,0,1)\\); \\(d_1\\) se še vedno začne v \\((3,0,0)\\). Krajišči sta narazen za \\(1\\). Napovej: ali ploskev \\(S\\) še gre skozi obe krivulji v tem vogalu? Ne. Bilinearna ploskev \\(B\\) vzame povprečje krajišč, \\((3,0,0{,}5)\\), zato je \\(S(1,0)=(3;\\ 0;\\ 0{,}5)\\) in vsako od obeh krivulj zgreši za polovico razmika, \\(0{,}5\\). Vogal premakne tudi notranjo mrežo: \\(B\\) se v tem vogalu dvigne za \\(0{,}5\\), zato se vse štiri notranje točke spustijo, najbolj \\(P_{21}\\), za \\(\\tfrac29\\), najmanj \\(P_{12}\\), za \\(\\tfrac1{18}\\). Coonsova ploskev interpolira robne krivulje samo, kadar se vogali stikajo; plošča Stik robnih krivulj zdaj sporoča razmik in ne trdi interpolacije.',
                'Linked corners are off and the end point of \\(c_0\\) at \\(u=1\\) is raised from \\((3,0,0)\\) to \\((3,0,1)\\); \\(d_1\\) still starts at \\((3,0,0)\\). The end points are \\(1\\) apart. Predict: does the surface \\(S\\) still pass through both curves at this corner? No. The bilinear surface \\(B\\) takes the average of the end points, \\((3,0,0.5)\\), so \\(S(1,0)=(3;\\ 0;\\ 0.5)\\) and it misses each of the two curves by half the gap, \\(0.5\\). The corner moves the interior net too: \\(B\\) rises by \\(0.5\\) at this corner, so all four interior points drop, \\(P_{21}\\) the most, by \\(\\tfrac29\\), and \\(P_{12}\\) the least, by \\(\\tfrac1{18}\\). The Coons patch interpolates the boundary curves only when the corners meet; the Boundary corners panel now reports the gap and does not claim interpolation.',
            ),
            formulaIds: ['coons-blend'],
            frames: [frame('coons-break-corner-explanation', 'explanation'), frame('coons-break-corner-observation', 'observation')],
            observationPrompt: text('Poglej vogal \\((u,v)=(1,0)\\) in preberi razmik v plošči Stik robnih krivulj; nato vklopi povezane vogale.', 'Look at the corner \\((u,v)=(1,0)\\) and read the gap in the Boundary corners panel; then turn linked corners on.'),
            expectedObservations: [text('Ploskev leži med obema krajiščema in nobene ne doseže; ob vklopu povezanih vogalov se krajišči združita v povprečje in ploskev spet interpolira.', 'The surface lies between the two end points and reaches neither; turning linked corners on joins the end points at their average and the surface interpolates again.')],
            scene: coonsScene('coons-break-corner-gap', 's', false, {name: 'c0', index: 3, xyz: [3, 0, 1]},
                'Povezani vogali so izklopljeni in krajišče krivulje \\(c_0\\) je v \\((3,0,1)\\); vogal \\((1,0)\\) ima razmik \\(1\\).',
                'Linked corners are off and the end point of \\(c_0\\) is at \\((3,0,1)\\); the corner \\((1,0)\\) has a gap of \\(1\\).'),
        },
        {
            id: 'coons-explore', order: 7,
            title: text('Prosto raziskovanje', 'Free exploration'),
            purpose: text('Samostojno premikati robne točke in preklapljati prikazano ploskev.', 'Moving boundary points and switching the shown surface on your own.'),
            explanation: text(
                'Robne krivulje so spet na začetnem mestu, vogali so povezani in prikazana je ploskev \\(S\\). Premikaj kontrolne točke robov, preklapljaj med \\(L_c\\), \\(L_d\\), \\(B\\) in \\(S\\), izklopi povezane vogale in jih spet vklopi. Mešanje \\(L_c+L_d-B\\) je ena od mnogih zapolnitev roba: robne krivulje same notranjosti ne določajo, drugo pravilo mešanja bi dalo drugačno ploskev z istim robom.',
                'The boundary curves are back at their start, the corners are linked and the surface \\(S\\) is shown. Move the boundary control points, switch between \\(L_c\\), \\(L_d\\), \\(B\\) and \\(S\\), turn linked corners off and on again. The blend \\(L_c+L_d-B\\) is one of many fills of the boundary: the boundary curves alone do not determine the interior, and another blending rule would give a different surface with the same boundary.',
            ),
            formulaIds: ['coons-blend', 'coons-net'],
            frames: [frame('coons-explore-explanation', 'explanation'), frame('coons-explore-observation', 'observation')],
            observationPrompt: text('Premakni notranjo kontrolno točko roba in preveri, katere notranje točke mreže se spremenijo.', 'Move an interior control point of an edge and check which interior net points change.'),
            expectedObservations: [text('Spremenijo se notranje točke, ki jih formula \\(P_{ij}\\) izračuna iz te točke; rob ostane na krivuljah, dokler se vogali stikajo.', 'The interior points that the formula \\(P_{ij}\\) computes from this point change; the edge stays on the curves as long as the corners meet.')],
            scene: coonsScene('coons-explore-start', 's', true, undefined,
                'Privzete robne krivulje, povezani vogali, prikazana ploskev \\(S\\); vse je prosto za raziskovanje.',
                'The default boundary curves, linked corners, the surface \\(S\\) shown; everything is free to explore.'),
        },
    ],
    sources: [
        {id: 'coons-1967', citation: 'Coons, S. A. Surfaces for computer-aided design of space forms. MIT Project MAC, Technical Report MAC-TR-41 (1967).'},
        {id: 'farin-coons', citation: 'Farin, G. Curves and Surfaces for CAGD, 5th ed., the section on Coons patches.'},
        {
            id: 'bezeg-coons-implementation',
            citation: 'Bezeg source: src/bezeg/impl/kernels/coons.ts, src/graphs/patches/coonsScene.ts and CoonsPatchGraph.tsx.',
            implementationCorrespondence: 'All values come from the Coons kernel; a lesson scene sets the shown surface, the corner linking and one boundary point with the coons action.',
        },
    ],
    edgeCases: [
        text('Če se vogali ne stikajo, bilinearna ploskev vzame povprečje obeh krajišč in Coonsova ploskev vsako od obeh krivulj zgreši za polovico razmika.', 'If the corners do not meet, the bilinear surface takes the average of the two end points and the Coons patch misses each of the two curves by half the gap.'),
        text('Ob ponovnem vklopu povezanih vogalov se krajišči premakneta v povprečje, zato se robni krivulji spremenita.', 'Turning linked corners back on moves the end points to their average, so the boundary curves change.'),
    ],
    unresolvedQuestions: [],
};

export const coonsGuidedLessons: readonly GuidedLesson[] = [coonsLesson];
