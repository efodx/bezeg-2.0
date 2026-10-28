import type {FamilyChapterSection} from './familyChapters';
import {patchSection, text} from './patchChapterKit';

// PLACEHOLDER sections for the next writer; replace each entry with authored content.
export const patchJoinsTriangularSections: readonly FamilyChapterSection[] = [
    // PLACEHOLDER: replace with the authored section (tensor-joins).
    patchSection('tensor-joins', 'Spajanje krp', 'Joining patches', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-joins'],
        investigationPrompts: {'patch-joins': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
    // PLACEHOLDER: replace with the authored section (triangular-patches).
    patchSection('triangular-patches', 'Trikotne Bézierjeve krpe', 'Triangular patches', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-triangular'],
        investigationPrompts: {'patch-triangular': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
    // PLACEHOLDER: replace with the authored section (square-vs-triangular).
    patchSection('square-vs-triangular', 'Kvadratna ali trikotna krpa', 'Square versus triangular patch', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-triangular'],
        investigationPrompts: {'patch-triangular': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
];
