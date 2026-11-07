import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {CONVEXITY_CHAPTER_ID} from './convexityChapterId';

export {CONVEXITY_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (compgeoGuidedLessons.ts) the section owns. The opening section owns none. */
const sectionDemonstrations = {
    orientation: 'orientation',
    'polygon-area': 'polygon-area',
    'point-in-polygon': 'point-in-polygon',
    'convex-hull': 'convex-hull',
    'hull-robustness': 'hull-robustness',
    'bezier-hulls': 'bezier-hulls',
} as const satisfies Record<string, DemonstrationId>;

export type ConvexitySectionId = keyof typeof sectionDemonstrations;

/** Section-owned activities (spec A1, A2, A3, A4, A5, A6). The lesson text stays in compgeoGuidedLessons.ts; a section's lesson is adapted only when requested. */
export const convexityGuidedExampleLessons = catalogSectionLessons<ConvexitySectionId>('the convexity chapter', sectionDemonstrations);

export function convexityGuidedExampleDemonstration(sectionId: ConvexitySectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function convexityGuidedExamplePath(sectionId: ConvexitySectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${CONVEXITY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
