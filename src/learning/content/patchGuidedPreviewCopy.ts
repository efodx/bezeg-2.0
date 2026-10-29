import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (sl: string, en: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl, en}, caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene, before any animation or learner edit. */
export const patchGuidedPreviewCopy = {
    'curve-to-patch': copy('Krpa s šestimi kontrolnimi točkami in izoparametričnimi krivuljami.', 'A patch with six control points and iso-curves.', 'Mreža določa družino krivulj; gibanje izbranega prereza razišči z animacijo.', 'The net defines a family of curves; explore the moving section with the animation.'),
    'bilinear-patch': copy('Bilinearna sedlasta krpa s štirimi kontrolnimi točkami.', 'A bilinear saddle patch with four control points.', 'Ravne izoparametrične krivulje skupaj tvorijo ukrivljeno krpo.', 'Straight iso-curves together form a curved patch.'),
    'control-net': copy('Kvadratna tenzorska mreža z dvignjeno notranjo kontrolno točko.', 'A biquadratic tensor net with a raised interior control point.', 'Označena točka krpe je nižja od dvignjene kontrolne točke.', 'The marked patch point lies below the raised control point.'),
    'boundary-iso-curves': copy('Tenzorska krpa z mrežo, robnimi in notranjimi izoparametričnimi krivuljami.', 'A tensor patch with its net, boundaries and interior iso-curves.', 'Rob uporablja vrstico mreže, notranji prerez pa izračunane kontrolne točke.', 'A boundary uses a net row; an interior section uses computed controls.'),
    'tensor-decasteljau': copy('De Casteljaujeva konstrukcija na mreži devetih kontrolnih točk.', 'A de Casteljau construction on a nine-point control net.', 'Dve zaporedni interpolaciji vodita do označene točke na krpi.', 'Two successive interpolations lead to the marked patch point.'),
    properties: copy('Krpa pod dvignjeno notranjo točko kontrolne mreže.', 'A patch beneath a raised interior net point.', 'Primerjaj višino krpe z višino kontrolne mreže.', 'Compare the height of the patch with the height of its control net.'),
    'tensor-derivatives': copy('Sedlasta krpa s tangentno ravnino, normalo in vektorjem zasuka.', 'A saddle patch with tangent plane, normal and twist vector.', 'Tangentna ravnina sledi parcialnima odvodoma; normala je pravokotna nanju.', 'The tangent plane follows the partial derivatives; the normal is perpendicular to them.'),
    'tensor-subdivision': copy('Sedlasta krpa po višanju stopnje z novo mrežo in prvotnim poligonom.', 'A degree-elevated saddle patch with the new net and original control polygon.', 'Višanje stopnje spremeni kontrolno mrežo in ohrani krpo.', 'Degree elevation changes the control net while preserving the patch.'),
    'tensor-joins': copy('Dve krpi s skupnim robom in prelomom tangentnih smeri.', 'Two patches sharing an edge with a tangent-direction kink.', 'Skupni rob zagotavlja zveznost položaja, ne pa tangentnih smeri.', 'The shared edge ensures positional continuity, while tangent directions can differ.'),
    'triangular-patches': copy('Kubična trikotna krpa z dvignjeno notranjo točko in de Casteljaujevo konstrukcijo.', 'A cubic triangular patch with a raised interior control and de Casteljau construction.', 'Robne višine so ničelne, notranjost krpe pa se dvigne nad ravnino.', 'The boundary heights are zero while the patch interior rises above the plane.'),
    'square-vs-triangular': copy('Trikotna krpa nad ravninsko tenzorsko mrežo in njenimi krivuljami.', 'A triangular patch above a planar tensor net and its curves.', 'Dva skupna robova ne določata iste notranjosti krpe.', 'Two shared edges do not determine the same patch interior.'),
} as const;
