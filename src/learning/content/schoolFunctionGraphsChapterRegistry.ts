import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID} from './schoolFunctionGraphsChapterId';

export {SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (schoolFunctionGraphsGuidedLessons.ts) the section owns. Each section owns one lesson. */
const sectionDemonstrations = {
    'function-transformation': 'function-transformation',
    'function-inverse': 'function-inverse',
    'polynomial-zeros': 'polynomial-zeros',
} as const satisfies Record<string, DemonstrationId>;

export type SchoolFunctionGraphsSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec S1 and S2). The lesson text stays in schoolFunctionGraphsGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const schoolFunctionGraphsGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the school function graphs chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<SchoolFunctionGraphsSectionId, LessonDefinition>>;

export function schoolFunctionGraphsGuidedExampleDemonstration(sectionId: SchoolFunctionGraphsSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function schoolFunctionGraphsGuidedExamplePath(sectionId: SchoolFunctionGraphsSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
