import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {isometryClassifyLesson, isometryDilationLesson, isometryTwoMirrorsLesson} from './isometriesGuidedLessons';

export const ISOMETRIES_CHAPTER_ID = 'isometries';

/** Section id to the Demonstration of its activity (spec L1 to L3: three sections on one Demonstration, in teaching order). Section ids are those of isometriesChapter.ts. */
export const isometriesGuidedExampleDemonstrations = {
    'two-mirrors': 'isometries',
    'classifying-a-motion': 'isometries',
    'dilation-similarity': 'isometries',
} as const satisfies Record<string, DemonstrationId>;

export type IsometriesSectionId = keyof typeof isometriesGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'two-mirrors': {id: 'isometries-two-mirrors', content: () => isometryTwoMirrorsLesson},
    'classifying-a-motion': {id: 'isometries-classify', content: () => isometryClassifyLesson},
    'dilation-similarity': {id: 'isometries-dilation', content: () => isometryDilationLesson},
} as const;

const adapted = new Map<IsometriesSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function isometriesGuidedExampleLesson(sectionId: IsometriesSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function isometriesGuidedExamplePath(sectionId: IsometriesSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === isometriesGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${ISOMETRIES_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
