import type {FamilyChapterSection} from './familyChapters';
import {patchSection, text} from './patchChapterKit';

// PLACEHOLDER sections for the next writer; replace each entry with authored content.
export const patchEvaluationSections: readonly FamilyChapterSection[] = [
    // PLACEHOLDER: replace with the authored section (tensor-decasteljau).
    patchSection('tensor-decasteljau', 'De Casteljau na krpi', 'De Casteljau on a patch', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-decasteljau'],
        investigationPrompts: {'patch-decasteljau': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
    // PLACEHOLDER: replace with the authored section (properties).
    patchSection('properties', 'Lastnosti in nelastnosti', 'Properties and non-properties', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-tensor'],
        investigationPrompts: {'patch-tensor': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
    // PLACEHOLDER: replace with the authored section (tensor-derivatives).
    patchSection('tensor-derivatives', 'Tangentna ravnina, normala in mešani odvod', 'Tangent plane, normal and twist', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-derivatives'],
        investigationPrompts: {'patch-derivatives': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
    // PLACEHOLDER: replace with the authored section (tensor-subdivision).
    patchSection('tensor-subdivision', 'Višanje stopnje in subdivizija', 'Degree elevation and subdivision', [
        text('Ta razdelek je še v pripravi. Povezani prikaz že deluje; obravnava te teme bo dodana v tem poglavju.', 'This section is still being written. The linked demonstration already works; the treatment of this topic will be added to this chapter.'),
    ], {
        demonstrationIds: ['patch-subdivision'],
        investigationPrompts: {'patch-subdivision': text('Odpri povezani prikaz in raziskuj sam; vodeni opis sledi.', 'Open the linked demonstration and explore on your own; guidance will follow.')},
    }),
];
