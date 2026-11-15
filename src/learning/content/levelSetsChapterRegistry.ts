import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {linearProgrammingLesson} from './levelSetsGuidedLessons';
import {levelSetsGradientLesson, levelSetsSurfaceLesson} from './levelSetsContourGuidedLessons';
import {levelSetsDescentLesson, levelSetsLagrangeLesson} from './levelSetsOptimizationGuidedLessons';

export const LEVEL_SETS_CHAPTER_ID = 'level-sets';

/** Section id to the Demonstration of its activity, in the spec's teaching order (LS1 to LS4 share `contour-map`; LS5 has `linear-program`). Section ids are those of levelSetsChapter.ts. */
export const levelSetsGuidedExampleDemonstrations = {
    'surface': 'contour-map',
    'gradient': 'contour-map',
    'descent': 'contour-map',
    'lagrange': 'contour-map',
    'linear-programming': 'linear-program',
} as const satisfies Record<string, DemonstrationId>;

export type LevelSetsSectionId = keyof typeof levelSetsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'surface': {id: 'level-sets-surface', content: () => levelSetsSurfaceLesson},
    'gradient': {id: 'level-sets-gradient', content: () => levelSetsGradientLesson},
    'descent': {id: 'level-sets-descent', content: () => levelSetsDescentLesson},
    'lagrange': {id: 'level-sets-lagrange', content: () => levelSetsLagrangeLesson},
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
