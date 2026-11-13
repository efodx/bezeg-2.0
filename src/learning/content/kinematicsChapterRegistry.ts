import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {kinematicsCircularLesson, kinematicsProjectileLesson, kinematicsSpeedLesson, kinematicsVectorsLesson} from './kinematicsGuidedLessons';

export const KINEMATICS_CHAPTER_ID = 'kinematics';

/** Section id to the Demonstration of its activity (spec KN1 to KN4: four sections on one Demonstration, in teaching order). Section ids are those of kinematicsChapter.ts. */
export const kinematicsGuidedExampleDemonstrations = {
    'position-velocity-acceleration': 'curve-kinematics',
    'speed-and-parametrization': 'curve-kinematics',
    'projectile-motion': 'curve-kinematics',
    'circular-motion': 'curve-kinematics',
} as const satisfies Record<string, DemonstrationId>;

export type KinematicsSectionId = keyof typeof kinematicsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'position-velocity-acceleration': {id: 'curve-kinematics-vectors', content: () => kinematicsVectorsLesson},
    'speed-and-parametrization': {id: 'curve-kinematics-speed', content: () => kinematicsSpeedLesson},
    'projectile-motion': {id: 'curve-kinematics-projectile', content: () => kinematicsProjectileLesson},
    'circular-motion': {id: 'curve-kinematics-circular', content: () => kinematicsCircularLesson},
} as const;

const adapted = new Map<KinematicsSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function kinematicsGuidedExampleLesson(sectionId: KinematicsSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function kinematicsGuidedExamplePath(sectionId: KinematicsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === kinematicsGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${KINEMATICS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
