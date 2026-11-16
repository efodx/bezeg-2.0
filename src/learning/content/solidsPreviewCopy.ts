import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Solids lesson, keyed by example id: SV1 (the cube cut by a horizontal plane at half its height), SV2 (the square prism cut by a horizontal plane through its middle), SV3 (the square prism cut into slabs in stack mode) and SV4 (the unit cube in volume mode).
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
    'solids.cavalieri.solids': copy(
        'Krem ozadje. V sredini slike stoji pokončna štiristrana prizma, oranžna, videna poševno od zgoraj. Čez njene ploskve tečejo tanke zelene vodoravne črte, robovi tankih plošč, na eni višini pa je debela modra črta, rob izbrane rezine. Črte so mestoma prekinjene, ker del pokrivajo ploskve.',
        'Cream background. In the middle of the picture stands an upright four-sided prism, orange, seen obliquely from above. Thin green horizontal lines run across its faces, the edges of thin slabs, and at one height there is a thick blue line, the edge of the chosen slice. The lines are interrupted in places where faces cover them.',
        'Prizma s kvadratno osnovno ploskvijo s stranico \\(2\\) in višino \\(3\\), razrezana na plošče; modro je obrobljena rezina na polovični višini.',
        'A prism with a square base of side \\(2\\) and height \\(3\\), cut into slabs; the slice at half the height is outlined in blue.',
    ),
    'solids.pyramid-cone.solids': copy(
        'Krem ozadje. V sredini slike je ena kocka, videna poševno od zgoraj, v enem samem oranžnem odtenku. Vidne so tri ploskve; robov in drugih oznak ni.',
        'Cream background. In the middle of the picture is a single cube seen obliquely from above, in one flat orange shade. Three faces are visible; there are no edges or other markings.',
        'Enotska kocka z robom \\(1\\) v načinu prostornine.',
        'A unit cube of edge \\(1\\) in volume mode.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
