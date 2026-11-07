import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {PROJECTIVE_CONICS_CHAPTER_ID} from './projectiveConicsChapterId';

export {PROJECTIVE_CONICS_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (projectiveConicsGuidedLessons.ts) the section owns. The opening section owns none; each lesson section owns the one lesson of its Demonstration. */
const sectionDemonstrations = {
    'projective-cross-ratio': 'projective-cross-ratio',
    'projective-pascal': 'projective-pascal',
    'projective-pole-polar': 'projective-pole-polar',
    'projective-five-point': 'projective-five-point',
    'projective-three-views': 'projective-three-views',
} as const satisfies Record<string, DemonstrationId>;

export type ProjectiveConicsSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec K1 to K5). The lesson text stays in projectiveConicsGuidedLessons.ts; a section's lesson is adapted only when requested. */
export const projectiveConicsGuidedExampleLessons = catalogSectionLessons<ProjectiveConicsSectionId>('the Projective conics chapter', sectionDemonstrations);

export function projectiveConicsGuidedExampleDemonstration(sectionId: ProjectiveConicsSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function projectiveConicsGuidedExamplePath(sectionId: ProjectiveConicsSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${PROJECTIVE_CONICS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
