import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene of the Linear maps chapter, keyed by example id (L1 and L2 share one Demonstration). */
export const linearMapsPreviewCopy = {
    'linear-maps.matrix-and-image.linear-map': copy(
        'Enotska mreža, enotski kvadrat in Bézierjeva krivulja pod identiteto, z ročicama za stolpca matrike.',
        'The unit grid, the unit square and a Bézier curve under the identity, with handles for the matrix columns.',
        'Pri identiteti ročici \\(a_1\\) in \\(a_2\\) ležita na \\(e_1\\) in \\(e_2\\), slike mreže, kvadrata in krivulje pa se prekrivajo z izvirniki.',
        'Under the identity the handles \\(a_1\\) and \\(a_2\\) sit on \\(e_1\\) and \\(e_2\\), and the images of the grid, the square and the curve coincide with the originals.',
    ),
    'linear-maps.determinant-area.linear-map': copy(
        'Enotski kvadrat in njegova slika, paralelogram s stolpcema \\((2,1)\\) in \\((-1,1)\\), z odčitkom determinante.',
        'The unit square and its image, the parallelogram with columns \\((2,1)\\) and \\((-1,1)\\), with the determinant readout.',
        'Slika kvadrata je paralelogram s ploščino \\(|\\det A|=3\\); ker je \\(\\det A>0\\), je orientacija ohranjena.',
        'The image of the square is a parallelogram of area \\(|\\det A|=3\\); since \\(\\det A>0\\), orientation is kept.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
