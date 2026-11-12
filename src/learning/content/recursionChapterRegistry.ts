import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {recursionSequenceLesson, recursionInterestLesson} from './recursionGuidedLessons';

export const RECURSION_CHAPTER_ID = 'recursion';

/** Section id to the Demonstration of its activity (spec RG1, RG3: two sections on one Demonstration, in teaching order). Section ids are those of recursionChapter.ts. */
export const recursionGuidedExampleDemonstrations = {
    'sequences': 'recursion-growth',
    'compound-interest': 'recursion-growth',
} as const satisfies Record<string, DemonstrationId>;

export type RecursionSectionId = keyof typeof recursionGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'sequences': {id: 'recursion-sequences', content: () => recursionSequenceLesson},
    'compound-interest': {id: 'recursion-interest', content: () => recursionInterestLesson},
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
