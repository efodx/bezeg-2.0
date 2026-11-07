import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {CURVE_GEOMETRY_CHAPTER_ID} from './curveGeometryChapterId';

export {CURVE_GEOMETRY_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (curveGeometryGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    'curve-parametric': 'curve-parametric',
    'curve-curvature': 'curve-curvature',
    'curve-comb': 'curve-comb',
    'curve-evolute': 'curve-evolute',
    'curve-offset': 'curve-offset',
    'curve-envelope': 'curve-envelope',
} as const satisfies Record<string, DemonstrationId>;

export type CurveGeometrySectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec L1 to L4). The lesson text stays in the guided-lesson files; a section's lesson is adapted only when requested. */
export const curveGeometryGuidedExampleLessons = catalogSectionLessons<CurveGeometrySectionId>('the curve geometry chapter', sectionDemonstrations);

export function curveGeometryGuidedExampleDemonstration(sectionId: CurveGeometrySectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function curveGeometryGuidedExamplePath(sectionId: CurveGeometrySectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${CURVE_GEOMETRY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
