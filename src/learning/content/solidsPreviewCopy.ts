import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Solids lesson, keyed by example id: SV1 (the cube cut by a horizontal plane at half its height) and SV2 (the square prism cut by a horizontal plane through its middle).
 * The copy names the frame only and states none of the answers step 1 asks for (the shape, its side count and area, the volume): the graph's readouts beside the picture show those, the copy does not repeat them.
 */
export const solidsPreviewCopy = {
    'solids.cube-sections.solids': copy(
        'Krem ozadje. V sredini slike je spodnji del kocke, oranžen s sivkasto senčenimi ploskvami. Skozi kocko poteka prosojna modra ravnina; na njej je z debelo modro črto obrobljen presek z rjavimi pikami na robu. Ob ogliščih kocke so številke od 1 do 8. Slika je majhna in postavljena sredi praznega prostora.',
        'Cream background. In the middle of the picture is the lower part of the cube, orange with greyish shaded faces. A translucent blue plane passes through the cube; on it the section is outlined with a thick blue line with brown dots on its boundary. The corners of the cube carry the numbers 1 to 8. The picture is small and stands in the middle of empty space.',
        'Kocka z robom \\(1\\), ki jo reže vodoravna ravnina \\(z=0{,}5\\); narisan je spodnji del.',
        'A cube of edge \\(1\\) cut by the horizontal plane \\(z=0{,}5\\); the lower part is drawn.',
    ),
    'solids.pyramid-sections.solids': copy(
        'Krem ozadje. V sredini slike je spodnji del pokončne prizme, oranžen s sivkasto senčenimi ploskvami. Prosojna modra ravnina se razprostira daleč čez prizmo; na njej je z debelo modro črto obrobljen presek z rjavimi pikami na robu. Ob ogliščih prizme so številke od 1 do 8.',
        'Cream background. In the middle of the picture is the lower part of an upright prism, orange with greyish shaded faces. A translucent blue plane spreads far beyond the prism; on it the section is outlined with a thick blue line with brown dots on its boundary. The corners of the prism carry the numbers 1 to 8.',
        'Prizma s kvadratno osnovno ploskvijo s stranico \\(2\\) in višino \\(3\\), ki jo reže vodoravna ravnina \\(z=0\\); narisan je spodnji del.',
        'A prism with a square base of side \\(2\\) and height \\(3\\) cut by the horizontal plane \\(z=0\\); the lower part is drawn.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
