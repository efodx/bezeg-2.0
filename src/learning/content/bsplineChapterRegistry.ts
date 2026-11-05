import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {BSPLINE_CHAPTER_ID} from './bsplineChapterId';

export {BSPLINE_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson the section owns (bsplineBasisGuidedLessons.ts, bsplineDeBoorGuidedLessons.ts, bsplineInsertionGuidedLessons.ts, bsplineExtractionGuidedLessons.ts, bsplineNurbsGuidedLessons.ts, bsplineBlossomGuidedLessons.ts). The opening section owns none. */
const sectionDemonstrations = {
    'bspline-basis': 'bspline-basis',
    'bspline-deboor': 'bspline-deboor',
    'bspline-insertion': 'bspline-insertion',
    'bspline-extraction': 'bspline-extraction',
    'bspline-nurbs': 'bspline-nurbs',
    'bspline-blossom': 'bspline-blossom',
} as const satisfies Record<string, DemonstrationId>;

export type BSplineSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec L1 to L6). The lesson text stays in the guided-lesson files; the getters read it lazily because
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
