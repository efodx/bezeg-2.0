import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {CONVEXITY_CHAPTER_ID} from './convexityChapterId';

export {CONVEXITY_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (compgeoGuidedLessons.ts) the section owns. The opening section owns none. */
const sectionDemonstrations = {
    orientation: 'orientation',
    'polygon-area': 'polygon-area',
    'convex-hull': 'convex-hull',
} as const satisfies Record<string, DemonstrationId>;

export type ConvexitySectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activities (spec A1, A2, A4). The lesson text stays in compgeoGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const convexityGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the convexity chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<ConvexitySectionId, LessonDefinition>>;

export function convexityGuidedExampleDemonstration(sectionId: ConvexitySectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function convexityGuidedExamplePath(sectionId: ConvexitySectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${CONVEXITY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
