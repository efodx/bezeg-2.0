import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {BSPLINE_CHAPTER_ID} from './bsplineChapterId';

export {BSPLINE_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (bsplineBasisGuidedLessons.ts, bsplineDeBoorGuidedLessons.ts, bsplineInsertionGuidedLessons.ts, bsplineExtractionGuidedLessons.ts, bsplineNurbsGuidedLessons.ts, bsplineBlossomGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    'bspline-basis': 'bspline-basis',
    'bspline-deboor': 'bspline-deboor',
    'bspline-insertion': 'bspline-insertion',
    'bspline-extraction': 'bspline-extraction',
    'bspline-nurbs': 'bspline-nurbs',
    'bspline-blossom': 'bspline-blossom',
} as const satisfies Record<string, DemonstrationId>;

export type BSplineSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec L1 to L6). The lesson text stays in the guided-lesson files; a section's lesson is adapted only when requested. */
export const bsplineGuidedExampleLessons = catalogSectionLessons<BSplineSectionId>('the B-spline chapter', sectionDemonstrations);

export function bsplineGuidedExampleDemonstration(sectionId: BSplineSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function bsplineGuidedExamplePath(sectionId: BSplineSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${BSPLINE_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
