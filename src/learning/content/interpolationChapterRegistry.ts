import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {INTERPOLATION_CHAPTER_ID} from './interpolationChapterId';

export {INTERPOLATION_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (interpolationGuidedLessons.ts, interpolationLeastSquaresLesson.ts). The opening section owns none. */
const sectionDemonstrations = {
    lagrange: 'interp-lagrange',
    runge: 'interp-runge',
    hermite: 'interp-hermite',
    'least-squares': 'interp-least-squares',
    subdivision: 'interp-subdivision',
} as const satisfies Record<string, DemonstrationId>;

export type InterpolationSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec I1 to I5). The lesson text stays in the two guided-lesson files; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const interpolationGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the interpolation chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<InterpolationSectionId, LessonDefinition>>;

export function interpolationGuidedExampleDemonstration(sectionId: InterpolationSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function interpolationGuidedExamplePath(sectionId: InterpolationSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${INTERPOLATION_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
