import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {BSPLINE_CHAPTER_ID} from './bsplineChapterId';

export {BSPLINE_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (bsplineBasisGuidedLessons.ts, bsplineDeBoorGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    'bspline-basis': 'bspline-basis',
    'bspline-deboor': 'bspline-deboor',
} as const satisfies Record<string, DemonstrationId>;

export type BSplineSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec L1 and L2). The lesson text stays in the two guided-lesson files; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const bsplineGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the B-spline chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<BSplineSectionId, LessonDefinition>>;

export function bsplineGuidedExampleDemonstration(sectionId: BSplineSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function bsplineGuidedExamplePath(sectionId: BSplineSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${BSPLINE_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
