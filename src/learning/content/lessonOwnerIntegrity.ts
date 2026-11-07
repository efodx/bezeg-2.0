import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';

// L2 of docs/specs/lesson-authoring-architecture.md: a pure integrity check of the chapter-owner table. It reads only cheap
// rows, the chapter section definitions and provider availability, so it adapts no lesson and reads no lesson content.

/** The part of a chapter-owner entry the check reads. `ChapterOwnedLessons` satisfies it. */
export interface IntegrityOwnerEntry {
    /** `authored` entries are checked through their definitions, `catalog` entries through catalog availability. */
    readonly source: 'authored' | 'catalog';
    rows(): readonly (readonly [sectionId: string, demonstrationId: DemonstrationId])[];
    /** Called only for authored chapters, whose definitions already exist. Never called for catalog-owned chapters. */
    lesson(sectionId: string): LessonDefinition | undefined;
}

/** A chapter's section definitions: ids in teaching order and the Demonstrations each section declares. */
export interface IntegrityChapterDefinition {
    id: string;
    sections: readonly {id: string; demonstrationIds?: readonly DemonstrationId[]}[];
}

export interface LessonOwnerIntegrityInput {
    /** Chapter id to owner entry, in default (chapter table) order. */
    table: Readonly<Record<string, IntegrityOwnerEntry>>;
    chapters: readonly IntegrityChapterDefinition[];
    /** Whether catalog content exists for a Demonstration, decided without reading or adapting it. */
    hasCatalogContent(id: DemonstrationId): boolean;
}

export type LessonOwnerIssueKind = 'duplicate-owner' | 'unknown-chapter' | 'missing-section' | 'missing-provider' | 'conflicting-demonstration' | 'invalid-order';

export interface LessonOwnerIssue {
    kind: LessonOwnerIssueKind;
    chapterId: string;
    sectionId?: string;
    demonstrationId?: DemonstrationId;
    message: string;
}

/** Every integrity issue of the owner table, each naming the exact chapter, section and Demonstration. Empty when the table is sound. */
export function lessonOwnerIntegrityIssues(input: LessonOwnerIntegrityInput): LessonOwnerIssue[] {
    const issues: LessonOwnerIssue[] = [];
    const add = (kind: LessonOwnerIssueKind, chapterId: string, message: string, sectionId?: string, demonstrationId?: DemonstrationId) =>
        issues.push({kind, chapterId, ...(sectionId === undefined ? {} : {sectionId}), ...(demonstrationId === undefined ? {} : {demonstrationId}), message});
    const definitions = new Map(input.chapters.map(chapter => [chapter.id, chapter] as const));
    const seen = new Set<string>();

    for (const [chapterId, entry] of Object.entries(input.table)) {
        const definition = definitions.get(chapterId);
        if (!definition) add('unknown-chapter', chapterId, `Chapter ${chapterId} in the owner table is not a known chapter.`);
        const isAuthored = entry.source === 'authored';
        const sectionOrder = definition?.sections.map(section => section.id) ?? [];
        let lastIndex = -1;
        for (const [sectionId, demonstrationId] of entry.rows()) {
            const identity = `${chapterId}.${sectionId}`;
            if (seen.has(identity)) add('duplicate-owner', chapterId, `Owner ${identity} appears more than once.`, sectionId, demonstrationId);
            seen.add(identity);

            const section = definition?.sections.find(item => item.id === sectionId);
            if (definition && !section) add('missing-section', chapterId, `Owner ${identity} (${demonstrationId}) names a section missing from chapter ${chapterId}.`, sectionId, demonstrationId);
            if (section && !(section.demonstrationIds ?? []).includes(demonstrationId)) {
                add('conflicting-demonstration', chapterId, `Owner ${identity} is on ${demonstrationId}, but section ${sectionId} declares [${(section.demonstrationIds ?? []).join(', ')}].`, sectionId, demonstrationId);
            }

            if (isAuthored) {
                const lesson = entry.lesson(sectionId);
                if (!lesson) add('missing-provider', chapterId, `Owner ${identity} (${demonstrationId}) has no authored definition.`, sectionId, demonstrationId);
                else if (lesson.demonstrationId !== demonstrationId) {
                    add('conflicting-demonstration', chapterId, `Owner ${identity} row is on ${demonstrationId}, but its definition is on ${lesson.demonstrationId}.`, sectionId, demonstrationId);
                }
            } else if (!input.hasCatalogContent(demonstrationId)) {
                add('missing-provider', chapterId, `Owner ${identity} has no catalog content for ${demonstrationId}.`, sectionId, demonstrationId);
            }

            const index = sectionOrder.indexOf(sectionId);
            if (index >= 0) {
                if (index < lastIndex) add('invalid-order', chapterId, `Owner ${identity} is listed after a later section of chapter ${chapterId}; rows must follow teaching order.`, sectionId, demonstrationId);
                lastIndex = Math.max(lastIndex, index);
            }
        }
    }
    return issues;
}
