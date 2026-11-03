import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {SWEEP_CHAPTER_ID} from './sweepChapterId';

export {SWEEP_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (compgeoGuidedLessons.ts) the section owns. The opening section owns none. */
const sectionDemonstrations = {
    'interval-sweep': 'interval-sweep',
    'segment-intersections': 'segment-intersections',
    'monotone-partition': 'monotone-partition',
    'monotone-triangulation': 'monotone-triangulation',
} as const satisfies Record<string, DemonstrationId>;

export type SweepSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activities (spec C1 to C4). The lesson text stays in compgeoGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const sweepGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the sweep chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<SweepSectionId, LessonDefinition>>;

export function sweepGuidedExampleDemonstration(sectionId: SweepSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function sweepGuidedExamplePath(sectionId: SweepSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${SWEEP_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
