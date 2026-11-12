import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {lineAngleLesson, lineDistanceLesson, lineFormsLesson, lineNormalLesson} from './analyticLinesGuidedLessons';

export const ANALYTIC_LINES_CHAPTER_ID = 'analytic-lines';

/** Section id to the Demonstration of its activity (spec L1 to L4: four sections on one Demonstration, in teaching order). Section ids are those of analyticLinesChapter.ts. */
export const analyticLinesGuidedExampleDemonstrations = {
    'forms-of-a-line': 'line-geometry',
    'normal-parallel-perpendicular': 'line-geometry',
    'angle-between-lines': 'line-geometry',
    'distance-point-line': 'line-geometry',
} as const satisfies Record<string, DemonstrationId>;

export type AnalyticLinesSectionId = keyof typeof analyticLinesGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'forms-of-a-line': {id: 'line-geometry-forms', content: () => lineFormsLesson},
    'normal-parallel-perpendicular': {id: 'line-geometry-normal', content: () => lineNormalLesson},
    'angle-between-lines': {id: 'line-geometry-angle', content: () => lineAngleLesson},
    'distance-point-line': {id: 'line-geometry-distance', content: () => lineDistanceLesson},
} as const;

const adapted = new Map<AnalyticLinesSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function analyticLinesGuidedExampleLesson(sectionId: AnalyticLinesSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function analyticLinesGuidedExamplePath(sectionId: AnalyticLinesSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === analyticLinesGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${ANALYTIC_LINES_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
