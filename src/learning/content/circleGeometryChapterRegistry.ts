import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {circleTangentsLesson, circleRadicalLesson} from './circleGeometryGuidedLessons';

export const CIRCLE_GEOMETRY_CHAPTER_ID = 'circle-geometry';

/** Section id to the Demonstration of its activity (spec CG1, CG2: two sections on one Demonstration, in teaching order). Section ids are those of circleGeometryChapter.ts. */
export const circleGeometryGuidedExampleDemonstrations = {
    'tangents-from-a-point': 'circle-construction',
    'radical-axis-and-centre': 'circle-construction',
} as const satisfies Record<string, DemonstrationId>;

export type CircleGeometrySectionId = keyof typeof circleGeometryGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'tangents-from-a-point': {id: 'circle-construction-tangents', content: () => circleTangentsLesson},
    'radical-axis-and-centre': {id: 'circle-construction-radical', content: () => circleRadicalLesson},
} as const;

const adapted = new Map<CircleGeometrySectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function circleGeometryGuidedExampleLesson(sectionId: CircleGeometrySectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function circleGeometryGuidedExamplePath(sectionId: CircleGeometrySectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === circleGeometryGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${CIRCLE_GEOMETRY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
