import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {PROBABILITY_CHAPTER_ID} from './probabilityChapterId';

export {PROBABILITY_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (probabilityGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    density: 'prob-density',
    'binomial-normal': 'prob-binomial-normal',
    clt: 'prob-clt',
    summary: 'prob-summary',
    correlation: 'prob-correlation',
} as const satisfies Record<string, DemonstrationId>;

export type ProbabilitySectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec P1 to P5). The lesson text stays in the two guided-lesson files; a section's lesson is adapted only when requested. */
export const probabilityGuidedExampleLessons = catalogSectionLessons<ProbabilitySectionId>('the probability chapter', sectionDemonstrations);

export function probabilityGuidedExampleDemonstration(sectionId: ProbabilitySectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function probabilityGuidedExamplePath(sectionId: ProbabilitySectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${PROBABILITY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
