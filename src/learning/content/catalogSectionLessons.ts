import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptCatalogLesson} from './catalogLessonAdapter';

/**
 * The sections of a chapter whose lessons reuse the reviewed catalog content: cheap section-to-Demonstration rows, and a
 * section's lesson adapted only when that section is requested. Reading the rows adapts no lesson.
 */
export interface CatalogSectionLessons<Id extends string> {
    /** Section id to Demonstration, in teaching order. */
    readonly demonstrations: Readonly<Record<Id, DemonstrationId>>;
    lesson(sectionId: Id): LessonDefinition;
    /** Every section's lesson. This adapts all of them, so only export adapters and tests call it. */
    all(): Readonly<Record<Id, LessonDefinition>>;
}

export function catalogSectionLessons<Id extends string>(chapterName: string, demonstrations: Readonly<Record<Id, DemonstrationId>>): CatalogSectionLessons<Id> {
    const lesson = (sectionId: Id): LessonDefinition => {
        const demonstrationId = demonstrations[sectionId];
        const adapted = adaptCatalogLesson(demonstrationId);
        if (!adapted) throw new Error(`The ${demonstrationId} lesson is not available for ${chapterName}.`);
        return adapted;
    };
    return Object.freeze({
        demonstrations,
        lesson,
        all: () => Object.fromEntries((Object.keys(demonstrations) as Id[]).map(sectionId => [sectionId, lesson(sectionId)])) as Record<Id, LessonDefinition>,
    });
}
