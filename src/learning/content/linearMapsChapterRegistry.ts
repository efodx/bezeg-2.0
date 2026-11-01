import {getDemonstrationCatalog} from '../../demonstrations';
import {linearMapBasisLesson, linearMapDeterminantLesson} from './linearMapsChapterLessons';

export const LINEAR_MAPS_CHAPTER_ID = 'linear-maps';

/** Section-owned linear map activities (spec L1 and L2); the section ids are those of linearMapsChapter.ts. */
export const linearMapsGuidedExampleRegistry = {
    'matrix-and-image': linearMapBasisLesson,
    'determinant-area': linearMapDeterminantLesson,
} as const;

export type LinearMapsSectionId = keyof typeof linearMapsGuidedExampleRegistry;

export function linearMapsGuidedExamplePath(sectionId: LinearMapsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === linearMapsGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.${LINEAR_MAPS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
