import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {PROBABILITY_CHAPTER_ID} from './probabilityChapterId';

export {PROBABILITY_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (probabilityGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    density: 'prob-density',
    'binomial-normal': 'prob-binomial-normal',
    clt: 'prob-clt',
    summary: 'prob-summary',
} as const satisfies Record<string, DemonstrationId>;

export type ProbabilitySectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec P1 to P4). The lesson text stays in the two guided-lesson files; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const probabilityGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the probability chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<ProbabilitySectionId, LessonDefinition>>;

export function probabilityGuidedExampleDemonstration(sectionId: ProbabilitySectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function probabilityGuidedExamplePath(sectionId: ProbabilitySectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${PROBABILITY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
