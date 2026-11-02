import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {getCatalogLessonForDemonstration} from '../runtime/lessonCatalog';

import {PROJECTIVE_CONICS_CHAPTER_ID} from './projectiveConicsChapterId';

export {PROJECTIVE_CONICS_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (projectiveConicsGuidedLessons.ts) the section owns. The opening section owns none; each lesson section owns the one lesson of its Demonstration. */
const sectionDemonstrations = {
    'projective-cross-ratio': 'projective-cross-ratio',
    'projective-pascal': 'projective-pascal',
    'projective-pole-polar': 'projective-pole-polar',
    'projective-five-point': 'projective-five-point',
    'projective-three-views': 'projective-three-views',
} as const satisfies Record<string, DemonstrationId>;

export type ProjectiveConicsSectionId = keyof typeof sectionDemonstrations;

/**
 * Section-owned activity (spec K1 to K5). The lesson text stays in projectiveConicsGuidedLessons.ts; the getters read it lazily because
 * lessonCatalog.ts imports the chapter-owned table, so reading at module load would be a cycle.
 */
export const projectiveConicsGuidedExampleRegistry = Object.defineProperties({}, Object.fromEntries(
    Object.entries(sectionDemonstrations).map(([sectionId, demonstrationId]) => [sectionId, {
        enumerable: true,
        get: (): LessonDefinition => {
            const lesson = getCatalogLessonForDemonstration(demonstrationId);
            if (!lesson) throw new Error(`The ${demonstrationId} lesson is not available for the Projective conics chapter.`);
            return lesson;
        },
    }]),
)) as Readonly<Record<ProjectiveConicsSectionId, LessonDefinition>>;

export function projectiveConicsGuidedExampleDemonstration(sectionId: ProjectiveConicsSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function projectiveConicsGuidedExamplePath(sectionId: ProjectiveConicsSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${PROJECTIVE_CONICS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
