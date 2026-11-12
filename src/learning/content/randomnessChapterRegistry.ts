import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {randomnessGaltonLesson, randomnessLargeNumbersLesson} from './randomnessGuidedLessons';

export const RANDOMNESS_CHAPTER_ID = 'randomness';

/** Section id to the Demonstration of its activity (spec RS1, RS2: two sections on one Demonstration, in teaching order). Section ids are those of randomnessChapter.ts. */
export const randomnessGuidedExampleDemonstrations = {
    'galton-board': 'prob-simulation',
    'law-of-large-numbers': 'prob-simulation',
} as const satisfies Record<string, DemonstrationId>;

export type RandomnessSectionId = keyof typeof randomnessGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'galton-board': {id: 'randomness-galton', content: () => randomnessGaltonLesson},
    'law-of-large-numbers': {id: 'randomness-large-numbers', content: () => randomnessLargeNumbersLesson},
} as const;

const adapted = new Map<RandomnessSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function randomnessGuidedExampleLesson(sectionId: RandomnessSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function randomnessGuidedExamplePath(sectionId: RandomnessSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === randomnessGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${RANDOMNESS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
