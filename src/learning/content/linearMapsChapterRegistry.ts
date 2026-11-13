import {getDemonstrationCatalog} from '../../demonstrations';
import {linearMapBasisLesson, linearMapDeterminantLesson, linearMapEigenLesson, linearMapEllipseLesson, linearMapPowerMethodLesson, linearMapStabilityLesson} from './linearMapsChapterLessons';

export const LINEAR_MAPS_CHAPTER_ID = 'linear-maps';

/** Section-owned linear map activities (spec L1 to L4, L6 and L7; L5 is Batch C); the section ids are those of linearMapsChapter.ts. */
export const linearMapsGuidedExampleRegistry = {
    'matrix-and-image': linearMapBasisLesson,
    'determinant-area': linearMapDeterminantLesson,
    'eigen-directions': linearMapEigenLesson,
    'singular-ellipse': linearMapEllipseLesson,
    'power-method': linearMapPowerMethodLesson,
    'trace-determinant': linearMapStabilityLesson,
} as const;

export type LinearMapsSectionId = keyof typeof linearMapsGuidedExampleRegistry;

export function linearMapsGuidedExamplePath(sectionId: LinearMapsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === linearMapsGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.${LINEAR_MAPS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
