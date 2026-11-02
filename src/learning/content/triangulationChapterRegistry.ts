import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {TRIANGULATION_CHAPTER_ID} from './triangulationChapterId';

export {TRIANGULATION_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (compgeoGuidedLessons.ts) the section owns. The opening section owns none. */
const sectionDemonstrations = {
    'ear-clipping': 'ear-clipping',
} as const satisfies Record<string, DemonstrationId>;

export type TriangulationSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activities (spec B1). The lesson text stays in compgeoGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const triangulationGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the triangulation chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<TriangulationSectionId, LessonDefinition>>;

export function triangulationGuidedExampleDemonstration(sectionId: TriangulationSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function triangulationGuidedExamplePath(sectionId: TriangulationSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${TRIANGULATION_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
