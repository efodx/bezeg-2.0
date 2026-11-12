import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {unitCircleAdditionLesson, unitCircleRadianLesson} from './trigUnitCircleGuidedLessons';

export const TRIGONOMETRY_CHAPTER_ID = 'trigonometry';

/** Section id to the Demonstration of its activity (spec TR1, TR2: two sections on one Demonstration, in teaching order). Section ids are those of trigonometryChapter.ts. */
export const trigonometryGuidedExampleDemonstrations = {
    'radian-sine-cosine': 'unit-circle',
    'addition-formulas': 'unit-circle',
} as const satisfies Record<string, DemonstrationId>;

export type TrigonometrySectionId = keyof typeof trigonometryGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'radian-sine-cosine': {id: 'unit-circle-radian', content: () => unitCircleRadianLesson},
    'addition-formulas': {id: 'unit-circle-addition', content: () => unitCircleAdditionLesson},
} as const;

const adapted = new Map<TrigonometrySectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function trigonometryGuidedExampleLesson(sectionId: TrigonometrySectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function trigonometryGuidedExamplePath(sectionId: TrigonometrySectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === trigonometryGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${TRIGONOMETRY_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
