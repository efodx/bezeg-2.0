import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {INTERPOLATION_CHAPTER_ID} from './interpolationChapterId';

export {INTERPOLATION_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (interpolationGuidedLessons.ts, interpolationLeastSquaresLesson.ts). The opening section owns none. */
const sectionDemonstrations = {
    lagrange: 'interp-lagrange',
    runge: 'interp-runge',
    hermite: 'interp-hermite',
    'least-squares': 'interp-least-squares',
    subdivision: 'interp-subdivision',
} as const satisfies Record<string, DemonstrationId>;

export type InterpolationSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec I1 to I5). The lesson text stays in the two guided-lesson files; a section's lesson is adapted only when requested. */
export const interpolationGuidedExampleLessons = catalogSectionLessons<InterpolationSectionId>('the interpolation chapter', sectionDemonstrations);

export function interpolationGuidedExampleDemonstration(sectionId: InterpolationSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function interpolationGuidedExamplePath(sectionId: InterpolationSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${INTERPOLATION_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
