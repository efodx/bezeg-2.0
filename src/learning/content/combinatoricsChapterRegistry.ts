import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {latticePathsLesson, countingTreeLesson, pascalIdentityLesson, binomialTheoremLesson} from './combinatoricsGuidedLessons';

export const COMBINATORICS_CHAPTER_ID = 'combinatorics';

/** Section id to the Demonstration of its activity (spec CB1 to CB4: four sections on two Demonstrations, in teaching order). Section ids are those of combinatoricsChapter.ts. */
export const combinatoricsGuidedExampleDemonstrations = {
    'lattice-paths-and-pascal': 'lattice-paths',
    'counting-and-choices': 'counting-tree',
    'pascal-identity': 'lattice-paths',
    'binomial-theorem': 'lattice-paths',
} as const satisfies Record<string, DemonstrationId>;

export type CombinatoricsSectionId = keyof typeof combinatoricsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'lattice-paths-and-pascal': {id: 'lattice-paths-cb1', content: () => latticePathsLesson},
    'counting-and-choices': {id: 'counting-tree-cb2', content: () => countingTreeLesson},
    'pascal-identity': {id: 'lattice-paths-cb3', content: () => pascalIdentityLesson},
    'binomial-theorem': {id: 'lattice-paths-cb4', content: () => binomialTheoremLesson},
} as const;

const adapted = new Map<CombinatoricsSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function combinatoricsGuidedExampleLesson(sectionId: CombinatoricsSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function combinatoricsGuidedExamplePath(sectionId: CombinatoricsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === combinatoricsGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${COMBINATORICS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
