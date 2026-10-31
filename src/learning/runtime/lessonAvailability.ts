import {LESSON_DEMONSTRATION_IDS} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';

/**
 * Lightweight support metadata used by catalog and homepage links: the Demonstrations that offer a guided lesson,
 * derived from the Demonstration definitions. It deliberately imports no lesson content, which would pull every lesson
 * into the home bundle; `lessonCatalog.test.ts` fails when this set and the authored content disagree.
 */
export const GUIDED_LESSON_AVAILABLE_IDS: readonly DemonstrationId[] = LESSON_DEMONSTRATION_IDS;

const availableLessonIds = new Set<DemonstrationId>(GUIDED_LESSON_AVAILABLE_IDS);

export function isGuidedLessonAvailable(id: DemonstrationId): boolean {
    return availableLessonIds.has(id);
}
