import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene of the School function graphs chapter, keyed by example id (S1 and S2). */
export const schoolFunctionGraphsPreviewCopy = {
    'school-function-graphs.function-transformation.function-transformation': copy(
        'Parabola \\(y=x^2\\) in njen duh, ki se z njo sklada, ter sledena točka \\((2,4)\\) na grafu.',
        'The parabola \\(y=x^2\\) and its coinciding ghost, with the tracked point \\((2,4)\\) on the graph.',
        'Pri \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\) se novi graf sklada z duhom osnovnega grafa in slika točke \\((2,4)\\) je ista točka.',
        'With \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\) the new graph coincides with the ghost of the base graph and the image of \\((2,4)\\) is the same point.',
    ),
    'school-function-graphs.function-inverse.function-inverse': copy(
        'Graf \\(y=x^2\\) na \\(x\\ge0\\), premica \\(y=x\\), točka \\(P=(2,4)\\) in njena zrcalna točka \\(P\'=(4,2)\\), povezani s črtkano daljico.',
        'The graph of \\(y=x^2\\) on \\(x\\ge0\\), the line \\(y=x\\), the point \\(P=(2,4)\\) and its mirror point \\(P\'=(4,2)\\), joined by a dashed segment.',
        'Zrcalna točka \\(P\'=(4,2)\\) ima zamenjani koordinati točke \\(P=(2,4)\\); zrcalne krivulje v tem začetnem prizoru še ni.',
        'The mirror point \\(P\'=(4,2)\\) has the coordinates of \\(P=(2,4)\\) swapped; the mirrored curve is not shown in this opening scene.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
