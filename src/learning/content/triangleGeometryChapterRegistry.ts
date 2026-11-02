import {getDemonstrationCatalog} from '../../demonstrations';
import {inscribedAngleLesson, triangleCentresLesson} from './triangleGeometryChapterLessons';

export const TRIANGLE_GEOMETRY_CHAPTER_ID = 'triangle-geometry';

/** Section-owned triangle geometry activities (spec T1 and T2); the section ids are those of triangleGeometryChapter.ts. */
export const triangleGeometryGuidedExampleRegistry = {
    'notable-points': triangleCentresLesson,
    'inscribed-angle': inscribedAngleLesson,
} as const;

export type TriangleGeometrySectionId = keyof typeof triangleGeometryGuidedExampleRegistry;

export function triangleGeometryGuidedExamplePath(sectionId: TriangleGeometrySectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === triangleGeometryGuidedExampleRegistry[sectionId].demonstrationId)!;
    return `${demo.path}?example=lesson.${TRIANGLE_GEOMETRY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
