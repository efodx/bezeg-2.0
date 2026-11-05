import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {CURVE_GEOMETRY_CHAPTER_ID} from './curveGeometryChapterId';

export {CURVE_GEOMETRY_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (curveGeometryGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    'curve-parametric': 'curve-parametric',
    'curve-curvature': 'curve-curvature',
} as const satisfies Record<string, DemonstrationId>;

export type CurveGeometrySectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec L1 and L2). The lesson text stays in the guided-lesson files; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const curveGeometryGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the curve geometry chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<CurveGeometrySectionId, LessonDefinition>>;

export function curveGeometryGuidedExampleDemonstration(sectionId: CurveGeometrySectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function curveGeometryGuidedExamplePath(sectionId: CurveGeometrySectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${CURVE_GEOMETRY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
