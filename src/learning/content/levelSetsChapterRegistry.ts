import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {linearProgrammingLesson} from './levelSetsGuidedLessons';

export const LEVEL_SETS_CHAPTER_ID = 'level-sets';

/** Section id to the Demonstration of its activity (spec LS5: one section, linear programming). Section ids are those of levelSetsChapter.ts; the contour sections join in tasks 07 and 08. */
export const levelSetsGuidedExampleDemonstrations = {
    'linear-programming': 'linear-program',
} as const satisfies Record<string, DemonstrationId>;

export type LevelSetsSectionId = keyof typeof levelSetsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'linear-programming': {id: 'level-sets-linear-programming', content: () => linearProgrammingLesson},
} as const;

const adapted = new Map<LevelSetsSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function levelSetsGuidedExampleLesson(sectionId: LevelSetsSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function levelSetsGuidedExamplePath(sectionId: LevelSetsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === levelSetsGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${LEVEL_SETS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
