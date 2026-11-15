import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {recursionSequenceLesson, recursionInterestLesson} from './recursionGuidedLessons';
import {recursionCobwebLesson, recursionLogisticLesson} from './recursionCobwebGuidedLessons';

export const RECURSION_CHAPTER_ID = 'recursion';

/** Section id to the Demonstration of its activity, in the spec's teaching order (RG1 and RG3 share `recursion-growth`; RG2 and RG4 share `recursion-cobweb`). Section ids are those of recursionChapter.ts. */
export const recursionGuidedExampleDemonstrations = {
    'sequences': 'recursion-growth',
    'cobweb': 'recursion-cobweb',
    'compound-interest': 'recursion-growth',
    'logistic': 'recursion-cobweb',
} as const satisfies Record<string, DemonstrationId>;

export type RecursionSectionId = keyof typeof recursionGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'sequences': {id: 'recursion-sequences', content: () => recursionSequenceLesson},
    'cobweb': {id: 'recursion-cobweb', content: () => recursionCobwebLesson},
    'compound-interest': {id: 'recursion-interest', content: () => recursionInterestLesson},
    'logistic': {id: 'recursion-logistic', content: () => recursionLogisticLesson},
} as const;

const adapted = new Map<RecursionSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function recursionGuidedExampleLesson(sectionId: RecursionSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function recursionGuidedExamplePath(sectionId: RecursionSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === recursionGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${RECURSION_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
