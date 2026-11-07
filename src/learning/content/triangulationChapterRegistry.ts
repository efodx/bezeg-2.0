import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {TRIANGULATION_CHAPTER_ID} from './triangulationChapterId';

export {TRIANGULATION_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (compgeoGuidedLessons.ts) the section owns. The opening section owns none. */
const sectionDemonstrations = {
    'ear-clipping': 'ear-clipping',
    'point-set-triangulation': 'point-set-triangulation',
    'delaunay': 'delaunay',
    'voronoi': 'voronoi',
    'voronoi-degenerate': 'voronoi-degenerate',
} as const satisfies Record<string, DemonstrationId>;

export type TriangulationSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activities (spec B1). The lesson text stays in compgeoGuidedLessons.ts; a section's lesson is adapted only when requested. */
export const triangulationGuidedExampleLessons = catalogSectionLessons<TriangulationSectionId>('the triangulation chapter', sectionDemonstrations);

export function triangulationGuidedExampleDemonstration(sectionId: TriangulationSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function triangulationGuidedExamplePath(sectionId: TriangulationSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${TRIANGULATION_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
