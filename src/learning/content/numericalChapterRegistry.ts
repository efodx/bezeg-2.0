import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {NUMERICAL_CHAPTER_ID} from './numericalChapterId';

export {NUMERICAL_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (numericalMethodsGuidedLessons.ts) the section owns. The opening section owns none. One Demonstration has one lesson, so the root-finding section owns N1, N2 and N3 together, the quadrature section N4 and the Euler section N5. */
const sectionDemonstrations = {
    'root-finding': 'root-finding',
    quadrature: 'quadrature',
    'euler-method': 'euler-method',
} as const satisfies Record<string, DemonstrationId>;

export type NumericalSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec N1 to N4). The lesson text stays in numericalMethodsGuidedLessons.ts; a section's lesson is adapted only when requested. */
export const numericalGuidedExampleLessons = catalogSectionLessons<NumericalSectionId>('the numerical methods chapter', sectionDemonstrations);

export function numericalGuidedExampleDemonstration(sectionId: NumericalSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function numericalGuidedExamplePath(sectionId: NumericalSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${NUMERICAL_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
