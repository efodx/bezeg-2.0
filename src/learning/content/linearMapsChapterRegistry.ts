import {getDemonstrationCatalog} from '../../demonstrations';
import {linearMapBasisLesson, linearMapCompositionLesson, linearMapDeterminantLesson, linearMapEigenLesson, linearMapEllipseLesson, linearMapPowerMethodLesson, linearMapStabilityLesson} from './linearMapsChapterLessons';

export const LINEAR_MAPS_CHAPTER_ID = 'linear-maps';

/** Section-owned linear map activities (spec L1 to L7, in teaching order); the section ids are those of linearMapsChapter.ts. */
export const linearMapsGuidedExampleRegistry = {
    'matrix-and-image': linearMapBasisLesson,
    'determinant-area': linearMapDeterminantLesson,
    'eigen-directions': linearMapEigenLesson,
    'singular-ellipse': linearMapEllipseLesson,
    'composition-affine': linearMapCompositionLesson,
    'power-method': linearMapPowerMethodLesson,
    'trace-determinant': linearMapStabilityLesson,
} as const;

export type LinearMapsSectionId = keyof typeof linearMapsGuidedExampleRegistry;

export function linearMapsGuidedExamplePath(sectionId: LinearMapsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === linearMapsGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.${LINEAR_MAPS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
