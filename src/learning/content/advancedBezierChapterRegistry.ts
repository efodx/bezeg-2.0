import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {ADVANCED_BEZIER_CHAPTER_ID} from './advancedBezierChapterId';

export {ADVANCED_BEZIER_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (degreeReductionGuidedLessons.ts, bezierClippingGuidedLessons.ts, arcLengthGuidedLessons.ts, coonsGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    'reduction': 'reduction',
    'bezier-clipping': 'bezier-clipping',
    'arc-length-param': 'arc-length-param',
    'patch-coons': 'patch-coons',
} as const satisfies Record<string, DemonstrationId>;

export type AdvancedBezierSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec D1 to D4). The lesson text stays in the guided-lesson files; a section's lesson is adapted only when requested. */
export const advancedBezierGuidedExampleLessons = catalogSectionLessons<AdvancedBezierSectionId>('the advanced Bézier chapter', sectionDemonstrations);

export function advancedBezierGuidedExampleDemonstration(sectionId: AdvancedBezierSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function advancedBezierGuidedExamplePath(sectionId: AdvancedBezierSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${ADVANCED_BEZIER_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
