import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {NUMERICAL_CHAPTER_ID} from './numericalChapterId';

export {NUMERICAL_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (numericalMethodsGuidedLessons.ts) the section owns. The opening section owns none. One Demonstration has one lesson, so the section owns N1, N2 and N3 together. */
const sectionDemonstrations = {
    'root-finding': 'root-finding',
} as const satisfies Record<string, DemonstrationId>;

export type NumericalSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec N1 to N3). The lesson text stays in numericalMethodsGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const numericalGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the numerical methods chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<NumericalSectionId, LessonDefinition>>;

export function numericalGuidedExampleDemonstration(sectionId: NumericalSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function numericalGuidedExamplePath(sectionId: NumericalSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${NUMERICAL_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
