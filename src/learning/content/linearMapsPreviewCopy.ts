import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene of the Linear maps chapter, keyed by example id (L1 to L7 share one Demonstration). */
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
    'linear-maps.eigen-directions.linear-map': copy(
        'Enotska mreža, enotski kvadrat in Bézierjeva krivulja ter njihove slike pri matriki \\(E\\) s stolpcema \\((4,2)\\) in \\((1,3)\\), z odčitkom stolpcev.',
        'The unit grid, the unit square and a Bézier curve with their images under the matrix \\(E\\) with columns \\((4,2)\\) and \\((1,3)\\), with the column readout.',
        'Slika mreže je paralelogramska mreža, ki jo napenjata stolpca \\((4,2)\\) in \\((1,3)\\); katere smeri ostanejo smeri, še ni označeno.',
        'The image of the grid is the parallelogram grid spanned by the columns \\((4,2)\\) and \\((1,3)\\); which directions stay directions is not marked yet.',
    ),
    'linear-maps.singular-ellipse.linear-map': copy(
        'Enotska mreža, enotski kvadrat in Bézierjeva krivulja ter njihove slike pri matriki \\(S_y\\) s stolpcema \\((2,1)\\) in \\((1,2)\\), z odčitkom stolpcev.',
        'The unit grid, the unit square and a Bézier curve with their images under the matrix \\(S_y\\) with columns \\((2,1)\\) and \\((1,2)\\), with the column readout.',
        'Slika mreže je paralelogramska mreža, ki jo napenjata stolpca \\((2,1)\\) in \\((1,2)\\); slike enotske krožnice na tej sliki še ni.',
        'The image of the grid is the parallelogram grid spanned by the columns \\((2,1)\\) and \\((1,2)\\); the image of the unit circle is not drawn in this view yet.',
    ),
    'linear-maps.composition-affine.linear-map': copy(
        'Enotska mreža in Bézierjeva krivulja ter njuni sliki pri sestavljeni preslikavi: najprej vrtež \\(R\\) za četrtino kroga, nato zrcaljenje \\(F\\) čez os \\(x\\), z odčitkom produkta in slik kontrolnih točk.',
        'The unit grid and a Bézier curve with their images under a composed map: first the quarter-turn rotation \\(R\\), then the reflection \\(F\\) in the \\(x\\)-axis, with the product readout and the images of the control points.',
        'Najprej deluje \\(R\\), nato \\(F\\); odčitek kaže produkt \\(BA\\) in slike \\(T(P_i)\\) kontrolnih točk, obrnjenega vrstnega reda pa v tem prizoru še ni.',
        'First \\(R\\) acts, then \\(F\\); the readout shows the product \\(BA\\) and the images \\(T(P_i)\\) of the control points, but the reverse order is not in this scene yet.',
    ),
    'linear-maps.power-method.linear-map': copy(
        'Enotska mreža, enotski kvadrat in Bézierjeva krivulja ter njihove slike pri matriki \\(E\\) s stolpcema \\((4,2)\\) in \\((1,3)\\), z odčitkom stolpcev; iteratov še ni.',
        'The unit grid, the unit square and a Bézier curve with their images under the matrix \\(E\\) with columns \\((4,2)\\) and \\((1,3)\\), with the column readout; no iterates yet.',
        'Slika mreže je paralelogramska mreža, ki jo napenjata stolpca \\((4,2)\\) in \\((1,3)\\); začetni vektor \\(v_0=(1,0)\\) je nastavljen, iteratov pa graf v tem prikazu ne kaže.',
        'The image of the grid is the parallelogram grid spanned by the columns \\((4,2)\\) and \\((1,3)\\); the start vector \\(v_0=(1,0)\\) is set, but the graph shows no iterates in this view.',
    ),
    'linear-maps.trace-determinant.linear-map': copy(
        'Enotska mreža, enotski kvadrat in Bézierjeva krivulja ter njihove slike pri matriki \\(Z\\) s stolpcema \\((1,1)\\) in \\((-1,1)\\), z odčitkom stolpcev.',
        'The unit grid, the unit square and a Bézier curve with their images under the matrix \\(Z\\) with columns \\((1,1)\\) and \\((-1,1)\\), with the column readout.',
        'Slika mreže je paralelogramska mreža, ki jo napenjata stolpca \\((1,1)\\) in \\((-1,1)\\); točke \\((\\tau,\\delta)\\) in trikotnika stabilnosti v tem prikazu še ni.',
        'The image of the grid is the parallelogram grid spanned by the columns \\((1,1)\\) and \\((-1,1)\\); the point \\((\\tau,\\delta)\\) and the stability triangle are not in this view yet.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
