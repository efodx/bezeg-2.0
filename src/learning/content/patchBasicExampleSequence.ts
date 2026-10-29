import type {FamilyChapterSection} from './familyChapters';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import {patchGuidedExampleRegistry} from './patchGuidedExampleRegistry';

const sections = Object.keys(patchGuidedExampleRegistry) as (keyof typeof patchGuidedExampleRegistry)[];
const keyFor = (sectionId: keyof typeof patchGuidedExampleRegistry) => `bezier-patches.${sectionId}.${patchGuidedExampleRegistry[sectionId].demonstrationId}`;

/** Keeps existing reading material visible and places each prepared example at its section end. */
export function withPatchBasicExampleSequence(section: FamilyChapterSection): FamilyChapterSection {
    if (!sections.includes(section.id as typeof sections[number])) return section;
    const content: OrderedChapterContent[] = [
        ...section.paragraphs.map(text => ({kind: 'paragraph' as const, text})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        ...(section.figures ?? []).map(figure => ({kind: 'figure' as const, figure})),
        {kind: 'example', exampleId: keyFor(section.id as keyof typeof patchGuidedExampleRegistry)},
    ];
    return {...section, orderedContent: content};
}
