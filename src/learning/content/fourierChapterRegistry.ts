import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {FOURIER_CHAPTER_ID} from './fourierChapterId';

export {FOURIER_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (fourierSeriesGuidedLessons.ts) the section owns. The opening section owns none. One Demonstration has one lesson, so the section owns F1 and F3 together. */
const sectionDemonstrations = {
    'fourier-series': 'fourier-series',
} as const satisfies Record<string, DemonstrationId>;

export type FourierSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec F1 and F3). The lesson text stays in fourierSeriesGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const fourierGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the Fourier series chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<FourierSectionId, LessonDefinition>>;

export function fourierGuidedExampleDemonstration(sectionId: FourierSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function fourierGuidedExamplePath(sectionId: FourierSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${FOURIER_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
